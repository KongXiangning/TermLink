//! Stage 4 process protocol and bounded analyzer entry points.
//!
//! The wire types in this module are TermLink-owned.  They deliberately keep
//! the existing `AnalysisBatch` contract intact while adding the process
//! envelope required by the Rust analyzer/Node importer boundary.

use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;

use crate::analysis::{AnalysisProjection, AnalysisReducer, AnalysisUsage};
use crate::codex_wire::CompatibilityProfile;
use crate::model::{AnalysisEvent, SourceRef};
use crate::protocol::batch::{AnalysisBatch, BatchDiagnostic, analyze_source_with_cancel};
use crate::protocol::checkpoint::AnalyzerCheckpoint;
use crate::source::{
    BackfillCursor, ForwardAppendCursor, JsonlSourceBackend, PlannedReadReport, SnapshotBoundary,
    SourceByteRange, SourceReadMode, SourceReadPlan, SourceSpec, TailPreviewCursor,
};
use crate::version::{COMPATIBILITY_LAYER_VERSION, PARSER_BACKEND};

pub use crate::protocol::batch::BatchCompleteness;

pub const ANALYZER_PROTOCOL_VERSION: u16 = 1;
pub const ANALYZER_VERSION: &str = "termlink-codex-rollout-collector/0.1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Hello,
    Analyze,
    Cancel,
    Batch,
    Ack,
    Complete,
    Error,
}

impl MessageType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Hello => "hello",
            Self::Analyze => "analyze",
            Self::Cancel => "cancel",
            Self::Batch => "batch",
            Self::Ack => "ack",
            Self::Complete => "complete",
            Self::Error => "error",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProtocolHeader {
    pub protocol_version: u16,
    pub message_type: MessageType,
    pub request_id: String,
}

impl ProtocolHeader {
    pub fn new(message_type: MessageType, request_id: impl Into<String>) -> Self {
        Self {
            protocol_version: ANALYZER_PROTOCOL_VERSION,
            message_type,
            request_id: request_id.into(),
        }
    }

    pub fn validate(&self, expected: MessageType) -> Result<(), AnalyzerProtocolError> {
        if self.protocol_version != ANALYZER_PROTOCOL_VERSION {
            return Err(AnalyzerProtocolError::UnsupportedProtocolVersion {
                expected: ANALYZER_PROTOCOL_VERSION,
                actual: self.protocol_version,
            });
        }
        if self.message_type != expected {
            return Err(AnalyzerProtocolError::MessageTypeMismatch {
                expected,
                actual: self.message_type,
            });
        }
        if self.request_id.trim().is_empty() {
            return Err(AnalyzerProtocolError::MissingField("request_id"));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnalyzerProtocolError {
    InvalidJson(String),
    MissingField(&'static str),
    UnsupportedMessageType(String),
    UnsupportedProtocolVersion {
        expected: u16,
        actual: u16,
    },
    MessageTypeMismatch {
        expected: MessageType,
        actual: MessageType,
    },
    InvalidRequest(String),
    InvalidCursor(String),
}

impl std::fmt::Display for AnalyzerProtocolError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(message) => write!(formatter, "invalid protocol JSON: {message}"),
            Self::MissingField(field) => write!(formatter, "protocol field {field} is required"),
            Self::UnsupportedMessageType(message) => {
                write!(formatter, "unsupported protocol message type: {message}")
            }
            Self::UnsupportedProtocolVersion { expected, actual } => {
                write!(
                    formatter,
                    "unsupported protocol version {actual}; expected {expected}"
                )
            }
            Self::MessageTypeMismatch { expected, actual } => write!(
                formatter,
                "message type mismatch: expected {}, got {}",
                expected.as_str(),
                actual.as_str()
            ),
            Self::InvalidRequest(message) => {
                write!(formatter, "invalid analyze request: {message}")
            }
            Self::InvalidCursor(message) => write!(formatter, "invalid source cursor: {message}"),
        }
    }
}

impl std::error::Error for AnalyzerProtocolError {}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HelloMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub analyzer_version: String,
    pub capabilities: Vec<String>,
    pub parser_backend: String,
    pub compatibility_layer_version: String,
}

impl HelloMessage {
    pub fn new(request_id: impl Into<String>) -> Self {
        Self {
            header: ProtocolHeader::new(MessageType::Hello, request_id),
            analyzer_version: ANALYZER_VERSION.to_string(),
            capabilities: vec![
                "replay".to_string(),
                "preview".to_string(),
                "backfill".to_string(),
                "cancel".to_string(),
                "ack".to_string(),
                "checkpoint".to_string(),
            ],
            parser_backend: PARSER_BACKEND.to_string(),
            compatibility_layer_version: COMPATIBILITY_LAYER_VERSION.to_string(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalyzeMode {
    Preview,
    Backfill,
    Append,
    Replay,
}

impl AnalyzeMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Preview => "preview",
            Self::Backfill => "backfill",
            Self::Append => "append",
            Self::Replay => "replay",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SourceSpecRequest {
    pub path: String,
    #[serde(default)]
    pub source_id: Option<String>,
    #[serde(default)]
    pub target_conversation_id: Option<String>,
    #[serde(default)]
    pub source_epoch: Option<String>,
    #[serde(default)]
    pub fingerprint: Option<crate::source::SourceFingerprint>,
    #[serde(default)]
    pub prefix_anchor: Option<crate::source::SourcePrefixAnchor>,
    #[serde(default)]
    pub snapshot_boundary: Option<crate::source::SnapshotBoundary>,
    #[serde(default)]
    pub max_decoded_bytes: Option<u64>,
    #[serde(default)]
    pub max_line_bytes: Option<usize>,
    #[serde(default)]
    pub max_segment_bytes: Option<u64>,
}

impl SourceSpecRequest {
    pub fn new(path: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            source_id: None,
            target_conversation_id: None,
            source_epoch: None,
            fingerprint: None,
            prefix_anchor: None,
            snapshot_boundary: None,
            max_decoded_bytes: None,
            max_line_bytes: None,
            max_segment_bytes: None,
        }
    }

    pub fn into_source_spec(
        &self,
        conversation_id: &str,
    ) -> Result<SourceSpec, AnalyzerProtocolError> {
        if self.path.trim().is_empty() {
            return Err(AnalyzerProtocolError::MissingField("source_spec.path"));
        }
        if conversation_id.trim().is_empty() {
            return Err(AnalyzerProtocolError::MissingField("conversation_id"));
        }
        if let Some(target) = self.target_conversation_id.as_deref()
            && target != conversation_id
        {
            return Err(AnalyzerProtocolError::InvalidRequest(
                "source_spec.target_conversation_id does not match conversation_id".to_string(),
            ));
        }

        let path = std::path::PathBuf::from(&self.path);
        let source_id = self
            .source_id
            .clone()
            .or_else(|| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .map(ToOwned::to_owned)
            })
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "rollout-source".to_string());
        let mut spec = SourceSpec::bind(conversation_id, source_id, path)
            .map_err(|error| AnalyzerProtocolError::InvalidRequest(error.to_string()))?;
        if let Some(source_epoch) = self.source_epoch.clone() {
            spec = spec
                .with_source_epoch(source_epoch)
                .map_err(|error| AnalyzerProtocolError::InvalidRequest(error.to_string()))?;
        }
        if let Some(fingerprint) = self.fingerprint.clone() {
            spec = spec.with_fingerprint(fingerprint);
        }
        if let Some(prefix_anchor) = self.prefix_anchor.clone() {
            spec = spec.with_prefix_anchor(prefix_anchor);
        }
        if let Some(snapshot_boundary) = self.snapshot_boundary {
            spec = spec.with_snapshot_boundary(snapshot_boundary);
        }
        spec = spec
            .with_limits(
                self.max_decoded_bytes
                    .unwrap_or(SourceSpec::DEFAULT_MAX_DECODED_BYTES),
                self.max_line_bytes
                    .unwrap_or(SourceSpec::DEFAULT_MAX_LINE_BYTES),
            )
            .with_segment_limit(
                self.max_segment_bytes
                    .unwrap_or(SourceSpec::DEFAULT_MAX_SEGMENT_BYTES),
            );
        Ok(spec)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResourceLimits {
    #[serde(default = "default_max_decoded_bytes")]
    pub max_decoded_bytes: u64,
    #[serde(default = "default_max_line_bytes")]
    pub max_line_bytes: usize,
    #[serde(default = "default_max_segment_bytes")]
    pub max_segment_bytes: u64,
    #[serde(default = "default_tail_bytes")]
    pub tail_bytes: u64,
    #[serde(default = "default_timeout_ms")]
    pub timeout_ms: u64,
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            max_decoded_bytes: default_max_decoded_bytes(),
            max_line_bytes: default_max_line_bytes(),
            max_segment_bytes: default_max_segment_bytes(),
            tail_bytes: default_tail_bytes(),
            timeout_ms: default_timeout_ms(),
        }
    }
}

fn default_max_decoded_bytes() -> u64 {
    SourceSpec::DEFAULT_MAX_DECODED_BYTES
}

fn default_max_line_bytes() -> usize {
    SourceSpec::DEFAULT_MAX_LINE_BYTES
}

fn default_max_segment_bytes() -> u64 {
    SourceSpec::DEFAULT_MAX_SEGMENT_BYTES
}

fn default_tail_bytes() -> u64 {
    2 * 1024 * 1024
}

fn default_timeout_ms() -> u64 {
    30_000
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalyzeRequest {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub conversation_id: String,
    pub source_spec: SourceSpecRequest,
    pub mode: AnalyzeMode,
    #[serde(default)]
    pub cursor: Option<Value>,
    #[serde(default)]
    pub persisted_anchor: Option<Value>,
    #[serde(default)]
    pub known_complete_range: Option<SourceByteRange>,
    #[serde(default)]
    pub retention_profile: Option<String>,
    #[serde(default)]
    pub resource_limits: ResourceLimits,
}

impl AnalyzeRequest {
    pub fn new(
        request_id: impl Into<String>,
        conversation_id: impl Into<String>,
        source_spec: SourceSpecRequest,
        mode: AnalyzeMode,
    ) -> Self {
        Self {
            header: ProtocolHeader::new(MessageType::Analyze, request_id),
            conversation_id: conversation_id.into(),
            source_spec,
            mode,
            cursor: None,
            persisted_anchor: None,
            known_complete_range: None,
            retention_profile: None,
            resource_limits: ResourceLimits::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CancelMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AckMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub batch_id: String,
    pub accepted: bool,
    #[serde(default)]
    pub persisted: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchProgress {
    pub records_seen: u64,
    pub records_emitted: u64,
    pub bytes_scanned: u64,
    pub has_more: bool,
}

impl Default for BatchProgress {
    fn default() -> Self {
        Self {
            records_seen: 0,
            records_emitted: 0,
            bytes_scanned: 0,
            has_more: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BatchSourceRef {
    pub item_key: String,
    pub content_hash: String,
    pub completeness: BatchCompleteness,
    pub source_epoch: String,
    pub revision: u64,
    pub source_ref: SourceRef,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "mutation", rename_all = "snake_case")]
pub enum BatchMutation {
    UpsertItem {
        item: BatchSourceRef,
    },
    UpsertDetail {
        item: BatchSourceRef,
    },
    UpsertUsage {
        item: BatchSourceRef,
    },
    UpsertOutcome {
        item: BatchSourceRef,
    },
    MarkPartial {
        source_range: Option<SourceByteRange>,
    },
    CompleteRange {
        source_range: SourceByteRange,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ToolDetail {
    pub item_key: String,
    pub call_id: String,
    pub tool_kind: String,
    #[serde(default)]
    pub input: Option<String>,
    #[serde(default)]
    pub output: Option<String>,
    pub completeness: BatchCompleteness,
    pub source_epoch: String,
    pub revision: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskOutcome {
    pub item_key: String,
    pub status: String,
    #[serde(default)]
    pub message: Option<String>,
    pub completeness: BatchCompleteness,
    pub source_epoch: String,
    pub revision: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub batch_id: String,
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub replace_previous: bool,
    #[serde(default)]
    pub source_range: Option<SourceByteRange>,
    pub history_items: Vec<AnalysisEvent>,
    pub diagnostics: Vec<BatchDiagnostic>,
    pub parser_provenance: crate::protocol::ParserProvenance,
    pub complete: bool,
    pub completeness: BatchCompleteness,
    pub projection: AnalysisProjection,
    pub tool_details: Vec<ToolDetail>,
    #[serde(default)]
    pub usage: Option<AnalysisUsage>,
    pub task_outcomes: Vec<TaskOutcome>,
    pub progress: BatchProgress,
    #[serde(default)]
    pub next_cursor: Option<Value>,
    pub mutations: Vec<BatchMutation>,
}

impl BatchMessage {
    pub fn from_analysis(
        request: &AnalyzeRequest,
        batch_id: impl Into<String>,
        source_id: impl Into<String>,
        source_epoch: impl Into<String>,
        source_range: Option<SourceByteRange>,
        completeness: BatchCompleteness,
        batch: AnalysisBatch,
        projection: AnalysisProjection,
        progress: BatchProgress,
    ) -> Self {
        Self {
            header: ProtocolHeader::new(MessageType::Batch, request.header.request_id.clone()),
            batch_id: batch_id.into(),
            conversation_id: request.conversation_id.clone(),
            source_id: source_id.into(),
            source_epoch: source_epoch.into(),
            replace_previous: false,
            source_range,
            history_items: batch.items,
            diagnostics: batch.diagnostics,
            parser_provenance: batch.parser_provenance,
            complete: batch.complete,
            completeness,
            projection,
            tool_details: Vec::new(),
            usage: None,
            task_outcomes: Vec::new(),
            progress,
            next_cursor: None,
            mutations: Vec::new(),
        }
    }

    pub fn as_analysis_batch(&self) -> AnalysisBatch {
        AnalysisBatch {
            parser_provenance: self.parser_provenance.clone(),
            items: self.history_items.clone(),
            diagnostics: self.diagnostics.clone(),
            complete: self.complete,
            completeness: self.completeness,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompleteMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub status: String,
    pub completeness: BatchCompleteness,
    #[serde(default)]
    pub next_cursor: Option<Value>,
    #[serde(default)]
    pub checkpoint: Option<AnalyzerCheckpoint>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ErrorMessage {
    #[serde(flatten)]
    pub header: ProtocolHeader,
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub fatal: bool,
    #[serde(default)]
    pub details: Option<Value>,
}

impl ErrorMessage {
    pub fn for_request(
        request_id: impl Into<String>,
        code: impl Into<String>,
        message: impl Into<String>,
        retryable: bool,
        fatal: bool,
    ) -> Self {
        Self {
            header: ProtocolHeader::new(MessageType::Error, request_id),
            code: code.into(),
            message: message.into(),
            retryable,
            fatal,
            details: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProtocolMessage {
    Hello(HelloMessage),
    Analyze(AnalyzeRequest),
    Cancel(CancelMessage),
    Batch(BatchMessage),
    Ack(AckMessage),
    Complete(CompleteMessage),
    Error(ErrorMessage),
}

impl ProtocolMessage {
    pub fn message_type(&self) -> MessageType {
        match self {
            Self::Hello(_) => MessageType::Hello,
            Self::Analyze(_) => MessageType::Analyze,
            Self::Cancel(_) => MessageType::Cancel,
            Self::Batch(_) => MessageType::Batch,
            Self::Ack(_) => MessageType::Ack,
            Self::Complete(_) => MessageType::Complete,
            Self::Error(_) => MessageType::Error,
        }
    }

    pub fn request_id(&self) -> &str {
        match self {
            Self::Hello(message) => &message.header.request_id,
            Self::Analyze(message) => &message.header.request_id,
            Self::Cancel(message) => &message.header.request_id,
            Self::Batch(message) => &message.header.request_id,
            Self::Ack(message) => &message.header.request_id,
            Self::Complete(message) => &message.header.request_id,
            Self::Error(message) => &message.header.request_id,
        }
    }

    pub fn validate(&self) -> Result<(), AnalyzerProtocolError> {
        let expected = self.message_type();
        match self {
            Self::Hello(message) => message.header.validate(expected),
            Self::Analyze(message) => message.header.validate(expected),
            Self::Cancel(message) => message.header.validate(expected),
            Self::Batch(message) => message.header.validate(expected),
            Self::Ack(message) => message.header.validate(expected),
            Self::Complete(message) => message.header.validate(expected),
            Self::Error(message) => message.header.validate(expected),
        }
    }

    pub fn parse_line(line: &str) -> Result<Self, AnalyzerProtocolError> {
        serde_json::from_str(line)
            .map_err(|error| AnalyzerProtocolError::InvalidJson(error.to_string()))
    }

    pub fn to_json_line(&self) -> Result<String, AnalyzerProtocolError> {
        serde_json::to_string(self)
            .map_err(|error| AnalyzerProtocolError::InvalidJson(error.to_string()))
    }
}

impl Serialize for ProtocolMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::Hello(message) => message.serialize(serializer),
            Self::Analyze(message) => message.serialize(serializer),
            Self::Cancel(message) => message.serialize(serializer),
            Self::Batch(message) => message.serialize(serializer),
            Self::Ack(message) => message.serialize(serializer),
            Self::Complete(message) => message.serialize(serializer),
            Self::Error(message) => message.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for ProtocolMessage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        let message_type = value
            .get("message_type")
            .and_then(Value::as_str)
            .ok_or_else(|| serde::de::Error::custom("protocol message_type is required"))?;
        match message_type {
            "hello" => serde_json::from_value::<HelloMessage>(value)
                .map(Self::Hello)
                .map_err(serde::de::Error::custom),
            "analyze" => serde_json::from_value::<AnalyzeRequest>(value)
                .map(Self::Analyze)
                .map_err(serde::de::Error::custom),
            "cancel" => serde_json::from_value::<CancelMessage>(value)
                .map(Self::Cancel)
                .map_err(serde::de::Error::custom),
            "batch" => serde_json::from_value::<BatchMessage>(value)
                .map(Self::Batch)
                .map_err(serde::de::Error::custom),
            "ack" => serde_json::from_value::<AckMessage>(value)
                .map(Self::Ack)
                .map_err(serde::de::Error::custom),
            "complete" => serde_json::from_value::<CompleteMessage>(value)
                .map(Self::Complete)
                .map_err(serde::de::Error::custom),
            "error" => serde_json::from_value::<ErrorMessage>(value)
                .map(Self::Error)
                .map_err(serde::de::Error::custom),
            other => Err(serde::de::Error::custom(
                AnalyzerProtocolError::UnsupportedMessageType(other.to_string()),
            )),
        }
    }
}

/// Run one request without allowing a caller to discover sources implicitly.
/// The request path is explicit and all source reading stays inside the
/// existing bounded `SourceBackend` contract.
pub fn analyze_request(
    request: &AnalyzeRequest,
    cancelled: &AtomicBool,
) -> anyhow::Result<BatchMessage> {
    request
        .header
        .validate(MessageType::Analyze)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    if request.conversation_id.trim().is_empty() {
        anyhow::bail!("conversation_id must not be empty");
    }
    if cancelled.load(Ordering::Acquire) {
        anyhow::bail!("cancelled before source read");
    }

    let mut source_request = request.source_spec.clone();
    source_request.max_decoded_bytes = Some(request.resource_limits.max_decoded_bytes);
    source_request.max_line_bytes = Some(request.resource_limits.max_line_bytes);
    source_request.max_segment_bytes = Some(request.resource_limits.max_segment_bytes);
    let spec = source_request
        .into_source_spec(&request.conversation_id)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    if spec.max_decoded_bytes() != request.resource_limits.max_decoded_bytes
        || spec.max_line_bytes() != request.resource_limits.max_line_bytes
        || spec.max_segment_bytes() != request.resource_limits.max_segment_bytes
    {
        anyhow::bail!("source limits do not match resource_limits");
    }

    let profile = CompatibilityProfile::Current;
    let backend = JsonlSourceBackend;
    let (batch, source_range, progress) = match request.mode {
        AnalyzeMode::Replay => {
            let batch = analyze_source_with_cancel(&backend, &spec, profile, cancelled)?;
            let source_bytes = std::fs::metadata(spec.path())?.len();
            (
                batch,
                SourceByteRange::new(0, source_bytes).ok(),
                BatchProgress {
                    records_seen: 0,
                    records_emitted: 0,
                    bytes_scanned: source_bytes,
                    has_more: false,
                },
            )
        }
        AnalyzeMode::Preview => {
            let plan = if let Some(cursor) = request.cursor.as_ref() {
                let range = cursor_range(cursor, SourceCursorMode::TailPreview)?;
                backend.plan_range(&spec, SourceReadMode::BackwardRange, range)?
            } else {
                backend.plan_tail(&spec, request.resource_limits.tail_bytes)?
            };
            let (batch, report) = analyze_planned_request(
                &backend,
                &plan,
                &request.conversation_id,
                profile,
                cancelled,
                BatchCompleteness::Provisional,
            )?;
            let source_range = report.complete_range().or(Some(report.scanned_range()));
            let progress = progress_from_report(&report, batch.items.len());
            (batch, source_range, progress)
        }
        AnalyzeMode::Backfill => {
            let range = request
                .known_complete_range
                .or_else(|| request.cursor.as_ref().and_then(cursor_range_for_backfill))
                .unwrap_or_else(|| {
                    let source_bytes = std::fs::metadata(spec.path())
                        .map(|metadata| metadata.len())
                        .unwrap_or_default();
                    SourceByteRange::new(0, source_bytes).expect("file range is ordered")
                });
            let plan = backend.plan_range(&spec, SourceReadMode::BackwardRange, range)?;
            let completeness =
                if range.start() == 0 && range.end() == plan.snapshot_boundary().byte_length() {
                    BatchCompleteness::Canonical
                } else {
                    BatchCompleteness::Provisional
                };
            let (batch, report) = analyze_planned_request(
                &backend,
                &plan,
                &request.conversation_id,
                profile,
                cancelled,
                completeness,
            )?;
            let source_range = report.complete_range().or(Some(report.scanned_range()));
            let progress = progress_from_report(&report, batch.items.len());
            (batch, source_range, progress)
        }
        AnalyzeMode::Append => {
            if let Some(cursor) = request.cursor.as_ref() {
                let append_cursor =
                    serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
                        .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
                let current_length = std::fs::metadata(spec.path())?.len();
                append_cursor
                    .validate_against(&spec, SnapshotBoundary::new(current_length))
                    .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
                let range = SourceByteRange::new(
                    append_cursor.metadata().snapshot_boundary().byte_length(),
                    current_length,
                )
                .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
                let plan = backend.plan_range(&spec, SourceReadMode::ForwardRange, range)?;
                let (batch, report) = analyze_planned_request(
                    &backend,
                    &plan,
                    &request.conversation_id,
                    profile,
                    cancelled,
                    BatchCompleteness::Canonical,
                )?;
                let source_range = report.complete_range().or(Some(report.scanned_range()));
                let progress = progress_from_report(&report, batch.items.len());
                (batch, source_range, progress)
            } else {
                let batch = analyze_source_with_cancel(&backend, &spec, profile, cancelled)?;
                let source_bytes = std::fs::metadata(spec.path())?.len();
                (
                    batch,
                    SourceByteRange::new(0, source_bytes).ok(),
                    BatchProgress {
                        records_seen: 0,
                        records_emitted: 0,
                        bytes_scanned: source_bytes,
                        has_more: false,
                    },
                )
            }
        }
    };
    if cancelled.load(Ordering::Acquire) {
        anyhow::bail!("cancelled during source read");
    }
    let projection = AnalysisReducer::reduce_batch(&batch);
    let completeness = batch.completeness;
    let mut message = BatchMessage::from_analysis(
        request,
        format!("{}:batch-0", request.header.request_id),
        spec.source_id().to_string(),
        spec.source_epoch().unwrap_or("unbound").to_string(),
        source_range,
        completeness,
        batch,
        projection,
        progress,
    );
    message.replace_previous = matches!(request.mode, AnalyzeMode::Replay);
    if let Some(cursor) = request.cursor.clone() {
        let current_length = std::fs::metadata(spec.path())?.len();
        validate_cursor_payload(
            &cursor,
            &spec,
            request.mode,
            SnapshotBoundary::new(current_length),
        )?;
        message.next_cursor = Some(cursor);
    }
    Ok(message)
}

#[derive(Debug, Clone, Copy)]
enum SourceCursorMode {
    TailPreview,
    Backfill,
}

fn cursor_range_for_backfill(cursor: &Value) -> Option<SourceByteRange> {
    cursor_range(cursor, SourceCursorMode::Backfill).ok()
}

fn cursor_range(
    cursor: &Value,
    mode: SourceCursorMode,
) -> Result<SourceByteRange, AnalyzerProtocolError> {
    let kind = cursor
        .get("cursor_kind")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            AnalyzerProtocolError::InvalidCursor("cursor_kind is required".to_string())
        })?;
    let range = match kind {
        "tail_preview" => serde_json::from_value::<TailPreviewCursor>(cursor.clone())
            .map(|cursor| cursor.metadata().complete_range()),
        "backfill" => serde_json::from_value::<BackfillCursor>(cursor.clone())
            .map(|cursor| cursor.metadata().complete_range()),
        "forward_append" => serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
            .map(|cursor| cursor.metadata().complete_range()),
        other => Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("unknown cursor kind {other}"),
        ))),
    }
    .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
    let expected = match mode {
        SourceCursorMode::TailPreview => "tail_preview",
        SourceCursorMode::Backfill => "backfill",
    };
    if kind != expected {
        return Err(AnalyzerProtocolError::InvalidCursor(format!(
            "cursor kind {kind} cannot be used for {expected}"
        )));
    }
    Ok(range)
}

fn analyze_planned_request(
    backend: &JsonlSourceBackend,
    plan: &SourceReadPlan,
    conversation_id: &str,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    completeness: BatchCompleteness,
) -> anyhow::Result<(AnalysisBatch, PlannedReadReport)> {
    let mut records = Vec::new();
    let report = plan.read(backend, &mut |record| {
        if cancelled.load(Ordering::Acquire) {
            anyhow::bail!("source analysis cancelled");
        }
        records.push(record);
        Ok(())
    })?;
    let adapter = crate::codex_adapter::CodexEventAdapter::new_with_conversation_id(
        profile,
        Some(conversation_id.to_string()),
    );
    let mut batch = crate::protocol::batch::analyze_records_with_adapter(
        &adapter,
        records,
        profile,
        completeness,
    );
    if report.pending_tail_bytes() > 0
        || report.source_grew_during_read()
        || report.source_shrank_during_read()
        || report.source().budget_exceeded
    {
        batch.complete = false;
        batch.completeness = BatchCompleteness::Partial;
        batch.diagnostics.push(BatchDiagnostic {
            code: "source_segment_partial".to_string(),
            message: Some(format!(
                "pending_tail_bytes={}, grew={}, shrank={}, budget_exceeded={}",
                report.pending_tail_bytes(),
                report.source_grew_during_read(),
                report.source_shrank_during_read(),
                report.source().budget_exceeded
            )),
            source_ref: None,
            availability: crate::model::Availability::PartialRollout,
        });
    }
    Ok((batch, report))
}

fn progress_from_report(report: &PlannedReadReport, records_emitted: usize) -> BatchProgress {
    BatchProgress {
        records_seen: report.source().physical_line_count,
        records_emitted: records_emitted as u64,
        bytes_scanned: report.scanned_range().len(),
        has_more: report.pending_tail_bytes() > 0 || report.source_grew_during_read(),
    }
}

fn validate_cursor_payload(
    cursor: &Value,
    spec: &SourceSpec,
    mode: AnalyzeMode,
    observed_snapshot: SnapshotBoundary,
) -> Result<(), AnalyzerProtocolError> {
    let kind = cursor
        .get("cursor_kind")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            AnalyzerProtocolError::InvalidCursor("cursor_kind is required".to_string())
        })?;
    let result = match kind {
        "tail_preview" => serde_json::from_value::<TailPreviewCursor>(cursor.clone())
            .map(|cursor| cursor.validate_against(spec, observed_snapshot)),
        "backfill" => serde_json::from_value::<BackfillCursor>(cursor.clone())
            .map(|cursor| cursor.validate_against(spec, observed_snapshot)),
        "forward_append" => serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
            .map(|cursor| cursor.validate_against(spec, observed_snapshot)),
        other => Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("unknown cursor kind {other}"),
        ))),
    };
    result
        .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?
        .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
    let expected = match mode {
        AnalyzeMode::Preview => "tail_preview",
        AnalyzeMode::Backfill => "backfill",
        AnalyzeMode::Append => "forward_append",
        AnalyzeMode::Replay => kind,
    };
    if mode != AnalyzeMode::Replay && kind != expected {
        return Err(AnalyzerProtocolError::InvalidCursor(format!(
            "cursor kind {kind} cannot be used for {}",
            mode.as_str()
        )));
    }
    Ok(())
}

pub fn checkpoint_for_batch(
    request: &AnalyzeRequest,
    batch: &BatchMessage,
) -> anyhow::Result<AnalyzerCheckpoint> {
    AnalyzerCheckpoint::from_batch(&request.header.request_id, &request.conversation_id, batch)
        .map_err(|error| anyhow::anyhow!(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::{
        AnalyzeMode, AnalyzeRequest, BatchCompleteness, HelloMessage, MessageType, ProtocolHeader,
        ProtocolMessage, SourceSpecRequest,
    };

    #[test]
    fn protocol_messages_are_flat_jsonl_and_ignore_unknown_fields() {
        let message = ProtocolMessage::Hello(HelloMessage::new("startup"));
        let mut value = serde_json::to_value(message).expect("hello serializes");
        value["future_field"] = serde_json::json!(true);
        let parsed: ProtocolMessage = serde_json::from_value(value).expect("hello parses");
        assert_eq!(parsed.message_type(), MessageType::Hello);
        assert_eq!(parsed.request_id(), "startup");
    }

    #[test]
    fn analyze_request_requires_explicit_conversation_binding() {
        let request = AnalyzeRequest {
            header: ProtocolHeader::new(MessageType::Analyze, "req-1"),
            conversation_id: "conversation-1".to_string(),
            source_spec: SourceSpecRequest::new("rollout.jsonl"),
            mode: AnalyzeMode::Replay,
            cursor: None,
            persisted_anchor: None,
            known_complete_range: None,
            retention_profile: None,
            resource_limits: Default::default(),
        };
        assert!(
            request
                .source_spec
                .into_source_spec("conversation-1")
                .is_ok()
        );
    }

    #[test]
    fn completeness_serializes_as_stable_snake_case() {
        let encoded = serde_json::to_string(&BatchCompleteness::Canonical).expect("serializes");
        assert_eq!(encoded, "\"canonical\"");
    }
}
