//! Stage 4 process protocol and bounded analyzer entry points.
//!
//! The wire types in this module are TermLink-owned.  They deliberately keep
//! the existing `AnalysisBatch` contract intact while adding the process
//! envelope required by the Rust analyzer/Node importer boundary.

use std::collections::{BTreeMap, BTreeSet};
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;

use crate::analysis::{
    AnalysisProjection, AnalysisReducer, AnalysisUsage, ProjectionCoverage,
    validate_last_turn_replacement,
};
use crate::codex_adapter::CodexEventAdapter;
use crate::codex_wire::CompatibilityProfile;
use crate::model::{AnalysisEvent, LastTurnReplacement, SourceRef, TurnStatus};
use crate::protocol::batch::{AnalysisBatch, BatchDiagnostic};
use crate::protocol::checkpoint::AnalyzerCheckpoint;
use crate::source::{
    BackfillCursor, CompleteLineAnchor, ForwardAppendCursor, HistoryBaseRef, JsonlSourceBackend,
    LineageError, PlannedReadReport, RolloutCatalog, RolloutSource, SessionDiscoveryRequest,
    SessionLineage, SnapshotBoundary, SourceByteRange, SourceCompression, SourceFingerprint,
    SourceFixtureHash, SourcePrefixAnchor, SourceReadMode, SourceReadPlan, SourceRecord,
    SourceSpec, TailPreviewCursor, discover_session,
};
use crate::version::{COMPATIBILITY_LAYER_VERSION, PARSER_BACKEND};

pub use crate::protocol::batch::BatchCompleteness;

pub const ANALYZER_PROTOCOL_VERSION: u16 = 1;
pub const ANALYZER_VERSION: &str = "termlink-codex-rollout-collector/0.1";
pub const LAST_TURN_REPLACEMENT_CAPABILITY: &str = "last_turn_replacement_v1";
pub const SESSION_LINEAGE_CAPABILITY: &str = "session_lineage_v1";

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
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub analyzer_version: String,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub parser_backend: String,
    #[serde(default)]
    pub compatibility_layer_version: String,
}

impl HelloMessage {
    pub fn new(request_id: impl Into<String>) -> Self {
        Self {
            header: ProtocolHeader::new(MessageType::Hello, request_id),
            role: Some("analyzer".to_string()),
            analyzer_version: ANALYZER_VERSION.to_string(),
            capabilities: vec![
                "replay".to_string(),
                "preview".to_string(),
                "backfill".to_string(),
                "cancel".to_string(),
                "ack".to_string(),
                "checkpoint".to_string(),
                LAST_TURN_REPLACEMENT_CAPABILITY.to_string(),
                SESSION_LINEAGE_CAPABILITY.to_string(),
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

        let source_id = self
            .source_id
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .ok_or(AnalyzerProtocolError::MissingField("source_spec.source_id"))?;
        let source_epoch = self
            .source_epoch
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .ok_or(AnalyzerProtocolError::MissingField(
                "source_spec.source_epoch",
            ))?;
        if source_epoch.trim() == "unbound" {
            return Err(AnalyzerProtocolError::InvalidRequest(
                "source_spec.source_epoch must be bound".to_string(),
            ));
        }

        let path = std::path::PathBuf::from(&self.path);
        let mut spec = SourceSpec::bind(conversation_id, source_id, path)
            .map_err(|error| AnalyzerProtocolError::InvalidRequest(error.to_string()))?;
        spec = spec
            .with_source_epoch(source_epoch)
            .map_err(|error| AnalyzerProtocolError::InvalidRequest(error.to_string()))?;
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
    pub replace_previous: bool,
    #[serde(default)]
    pub lineage: Option<RolloutLineageRequest>,
    /// Optional session-level discovery.  When present, `source_spec.path`
    /// may be empty and the collector resolves the active rollout from the
    /// bounded date catalog before constructing the physical read plan.
    #[serde(default)]
    pub discovery: Option<RolloutDiscoveryRequest>,
    /// Capabilities offered by the Node peer during the in-process hello.
    /// This is transport state and is never serialized into the request JSON.
    #[serde(skip)]
    pub peer_capabilities: Vec<String>,
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
            replace_previous: false,
            lineage: None,
            discovery: None,
            peer_capabilities: Vec::new(),
            resource_limits: ResourceLimits::default(),
        }
    }

    pub fn with_lineage(mut self, lineage: RolloutLineageRequest) -> Self {
        self.lineage = Some(lineage);
        self
    }

    pub fn with_discovery(mut self, discovery: RolloutDiscoveryRequest) -> Self {
        self.discovery = Some(discovery);
        self
    }

    pub fn with_peer_capabilities(
        mut self,
        capabilities: impl IntoIterator<Item = impl Into<String>>,
    ) -> Self {
        self.peer_capabilities = capabilities.into_iter().map(Into::into).collect();
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RolloutCatalogCandidateRequest {
    pub rollout_id: String,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RolloutLineageRequest {
    #[serde(default)]
    pub catalog_root: Option<String>,
    #[serde(default)]
    pub candidates: Vec<RolloutCatalogCandidateRequest>,
    #[serde(default = "default_lineage_max_depth")]
    pub max_depth: usize,
}

/// Protocol-facing wrapper around the source-layer bounded discovery input.
///
/// Dates are partition boundaries, not a physical-read paging abstraction.
/// The source reader still exposes full/tail/backward/forward modes and their
/// independent cursors after this discovery step has selected the active
/// rollout.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RolloutDiscoveryRequest {
    pub sessions_root: String,
    pub conversation_id: String,
    #[serde(default)]
    pub start_date: Option<String>,
    #[serde(default)]
    pub end_date: Option<String>,
    #[serde(default)]
    pub active_rollout_id: Option<String>,
    #[serde(default)]
    pub active_path: Option<String>,
    #[serde(default = "default_discovery_max_candidates")]
    pub max_candidates: usize,
    #[serde(default = "default_discovery_max_date_partitions")]
    pub max_date_partitions: usize,
}

impl RolloutDiscoveryRequest {
    pub fn new(sessions_root: impl Into<String>, conversation_id: impl Into<String>) -> Self {
        Self {
            sessions_root: sessions_root.into(),
            conversation_id: conversation_id.into(),
            start_date: None,
            end_date: None,
            active_rollout_id: None,
            active_path: None,
            max_candidates: default_discovery_max_candidates(),
            max_date_partitions: default_discovery_max_date_partitions(),
        }
    }

    fn to_source_request(&self) -> SessionDiscoveryRequest {
        SessionDiscoveryRequest {
            sessions_root: PathBuf::from(&self.sessions_root),
            conversation_id: self.conversation_id.clone(),
            start_date: self.start_date.clone(),
            end_date: self.end_date.clone(),
            active_rollout_id: self.active_rollout_id.clone(),
            active_path: self.active_path.as_deref().map(PathBuf::from),
            max_candidates: self.max_candidates,
            max_date_partitions: self.max_date_partitions,
        }
    }
}

fn default_discovery_max_candidates() -> usize {
    4096
}

fn default_discovery_max_date_partitions() -> usize {
    366
}

impl Default for RolloutLineageRequest {
    fn default() -> Self {
        Self {
            catalog_root: None,
            candidates: Vec::new(),
            max_depth: default_lineage_max_depth(),
        }
    }
}

fn default_lineage_max_depth() -> usize {
    8
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
    ReplaceLastTurn {
        replacement: LastTurnReplacement,
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

/// Provenance for a rollout file discovered while resolving one session.
/// This is additive protocol evidence; it is not an App DTO or a database
/// persistence instruction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LineageSourceMessage {
    pub rollout_id: String,
    pub path: String,
    pub timestamp: String,
    pub date_partition: String,
    pub file_size: u64,
    #[serde(default)]
    pub header_end_byte: u64,
    pub header_verified: bool,
    #[serde(default)]
    pub history_base: Option<HistoryBaseRef>,
    #[serde(default)]
    pub fingerprint: Option<SourceFingerprint>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LineageTransitionMessage {
    pub parent_rollout_id: String,
    pub child_rollout_id: String,
    pub history_base: HistoryBaseRef,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LineageCoverageMessage {
    pub root_rollout_id: String,
    pub active_head_rollout_id: String,
    pub chain_rollout_ids: Vec<String>,
    pub discovered_source_count: usize,
    pub covered_source_count: usize,
    pub complete: bool,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub history_base: Option<HistoryBaseRef>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub replacements: Vec<LastTurnReplacement>,
    #[serde(default)]
    pub source_fingerprint: Option<SourceFingerprint>,
    #[serde(default)]
    pub source_prefix_anchor: Option<SourcePrefixAnchor>,
    /// Versioned opaque state owned by the formal analyzer runtime.  It is
    /// deliberately JSON so Node can persist/replay it without importing
    /// Rust or Codex types.
    #[serde(default)]
    pub reducer_state: Option<Value>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub discovered_sources: Vec<LineageSourceMessage>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub lineage_transitions: Vec<LineageTransitionMessage>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lineage_coverage: Option<LineageCoverageMessage>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lineage_checkpoint: Option<Value>,
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
        let batch_id = batch_id.into();
        let source_id = source_id.into();
        let source_epoch = source_epoch.into();
        let projection_coverage = projection.coverage;
        let tool_details = derive_tool_details(&batch.items, &source_epoch, completeness);
        let usage = projection.usage_total.clone();
        let task_outcomes = derive_task_outcomes(&batch.items, &source_epoch, completeness);
        let mutations = derive_mutations(
            &batch.items,
            &tool_details,
            usage.as_ref(),
            &task_outcomes,
            &batch.replacements,
            source_range,
            batch.complete,
            &source_epoch,
            completeness,
            projection_coverage,
        );
        Self {
            header: ProtocolHeader::new(MessageType::Batch, request.header.request_id.clone()),
            batch_id,
            conversation_id: request.conversation_id.clone(),
            source_id,
            source_epoch,
            replace_previous: false,
            source_range,
            history_items: batch.items,
            diagnostics: batch.diagnostics,
            parser_provenance: batch.parser_provenance,
            complete: batch.complete,
            completeness,
            projection,
            tool_details,
            usage,
            task_outcomes,
            progress,
            next_cursor: None,
            mutations,
            history_base: batch.history_base.clone(),
            replacements: batch.replacements.clone(),
            source_fingerprint: None,
            source_prefix_anchor: None,
            reducer_state: None,
            discovered_sources: Vec::new(),
            lineage_transitions: Vec::new(),
            lineage_coverage: None,
            lineage_checkpoint: None,
        }
    }

    pub fn as_analysis_batch(&self) -> AnalysisBatch {
        AnalysisBatch {
            parser_provenance: self.parser_provenance.clone(),
            items: self.history_items.clone(),
            diagnostics: self.diagnostics.clone(),
            complete: self.complete,
            completeness: self.completeness,
            source_id: Some(self.source_id.clone()),
            history_base: self.history_base.clone(),
            replacements: self.replacements.clone(),
        }
    }
}

fn derive_tool_details(
    events: &[AnalysisEvent],
    source_epoch: &str,
    completeness: BatchCompleteness,
) -> Vec<ToolDetail> {
    let mut details = BTreeMap::<String, ToolDetail>::new();
    for event in events {
        match event {
            AnalysisEvent::ToolStarted {
                metadata,
                tool_kind,
                call_id,
                input,
                ..
            } => {
                let detail = details
                    .entry(call_id.clone())
                    .or_insert_with(|| ToolDetail {
                        item_key: metadata.item_key.clone(),
                        call_id: call_id.clone(),
                        tool_kind: tool_kind.clone(),
                        input: None,
                        output: None,
                        completeness,
                        source_epoch: source_epoch.to_string(),
                        revision: metadata.sequence,
                    });
                detail.item_key = metadata.item_key.clone();
                detail.tool_kind = tool_kind.clone();
                detail.input = input.clone();
                detail.revision = detail.revision.max(metadata.sequence);
            }
            AnalysisEvent::ToolCompleted {
                metadata,
                tool_kind,
                call_id,
                output,
            } => {
                let detail = details
                    .entry(call_id.clone())
                    .or_insert_with(|| ToolDetail {
                        item_key: metadata.item_key.clone(),
                        call_id: call_id.clone(),
                        tool_kind: tool_kind.clone(),
                        input: None,
                        output: None,
                        completeness,
                        source_epoch: source_epoch.to_string(),
                        revision: metadata.sequence,
                    });
                detail.item_key = metadata.item_key.clone();
                detail.tool_kind = tool_kind.clone();
                detail.output = output.clone();
                detail.revision = detail.revision.max(metadata.sequence);
            }
            _ => {}
        }
    }
    details.into_values().collect()
}

fn derive_task_outcomes(
    events: &[AnalysisEvent],
    source_epoch: &str,
    completeness: BatchCompleteness,
) -> Vec<TaskOutcome> {
    events
        .iter()
        .filter_map(|event| {
            let AnalysisEvent::TurnCompleted {
                metadata,
                status,
                message,
                ..
            } = event
            else {
                return None;
            };
            let status = match status {
                TurnStatus::Completed => "completed",
                TurnStatus::Interrupted => "interrupted",
                TurnStatus::Partial => "partial",
            };
            Some(TaskOutcome {
                item_key: metadata.item_key.clone(),
                status: status.to_string(),
                message: message.clone(),
                completeness,
                source_epoch: source_epoch.to_string(),
                revision: metadata.sequence,
            })
        })
        .collect()
}

fn source_ref_for_call(events: &[AnalysisEvent], call_id: &str) -> Option<SourceRef> {
    events.iter().find_map(|event| match event {
        AnalysisEvent::ToolStarted {
            metadata,
            call_id: event_call_id,
            ..
        }
        | AnalysisEvent::ToolCompleted {
            metadata,
            call_id: event_call_id,
            ..
        } if event_call_id == call_id => Some(metadata.source_ref.clone()),
        _ => None,
    })
}

fn source_ref_for_item(events: &[AnalysisEvent], item_key: &str) -> Option<SourceRef> {
    events
        .iter()
        .find(|event| event.metadata().item_key == item_key)
        .map(|event| event.metadata().source_ref.clone())
}

fn source_ref_for_usage(events: &[AnalysisEvent]) -> Option<SourceRef> {
    events.iter().find_map(|event| match event {
        AnalysisEvent::UsageUpdated { metadata, .. } => Some(metadata.source_ref.clone()),
        _ => None,
    })
}

fn source_ref_for_outcome(events: &[AnalysisEvent], item_key: &str) -> Option<SourceRef> {
    source_ref_for_item(events, item_key)
}

fn content_hash<T: Serialize>(value: &T) -> String {
    let encoded = serde_json::to_vec(value).unwrap_or_default();
    SourceFixtureHash::from_bytes(&encoded).digest().to_string()
}

fn batch_source_ref(
    item_key: String,
    value: &impl Serialize,
    source_ref: SourceRef,
    source_epoch: &str,
    completeness: BatchCompleteness,
    revision: u64,
) -> BatchSourceRef {
    BatchSourceRef {
        item_key,
        content_hash: content_hash(value),
        completeness,
        source_epoch: source_epoch.to_string(),
        revision,
        source_ref,
    }
}

fn derive_mutations(
    events: &[AnalysisEvent],
    tool_details: &[ToolDetail],
    usage: Option<&AnalysisUsage>,
    task_outcomes: &[TaskOutcome],
    replacements: &[LastTurnReplacement],
    source_range: Option<SourceByteRange>,
    complete: bool,
    source_epoch: &str,
    completeness: BatchCompleteness,
    projection_coverage: ProjectionCoverage,
) -> Vec<BatchMutation> {
    let mut mutations = Vec::new();
    for event in events {
        mutations.push(BatchMutation::UpsertItem {
            item: batch_source_ref(
                event.metadata().item_key.clone(),
                event,
                event.metadata().source_ref.clone(),
                source_epoch,
                completeness,
                event.metadata().sequence,
            ),
        });
    }
    for detail in tool_details {
        if let Some(source_ref) = source_ref_for_call(events, &detail.call_id) {
            mutations.push(BatchMutation::UpsertDetail {
                item: batch_source_ref(
                    detail.item_key.clone(),
                    detail,
                    source_ref,
                    source_epoch,
                    completeness,
                    detail.revision,
                ),
            });
        }
    }
    if let Some(usage) = usage
        && let Some(source_ref) = source_ref_for_usage(events)
    {
        mutations.push(BatchMutation::UpsertUsage {
            item: batch_source_ref(
                format!("usage:{source_epoch}"),
                usage,
                source_ref,
                source_epoch,
                completeness,
                0,
            ),
        });
    }
    for outcome in task_outcomes {
        if let Some(source_ref) = source_ref_for_outcome(events, &outcome.item_key) {
            mutations.push(BatchMutation::UpsertOutcome {
                item: batch_source_ref(
                    outcome.item_key.clone(),
                    outcome,
                    source_ref,
                    source_epoch,
                    completeness,
                    outcome.revision,
                ),
            });
        }
    }
    // `replacements` are validated lineage evidence.  The mutation is a
    // separate instruction to change the active projection and is emitted
    // only when that projection has complete logical coverage.  A source can
    // be fully read while its historical projection is still partial (for
    // example when an older parent contains an unsupported event).
    if completeness == BatchCompleteness::Canonical && complete && projection_coverage.is_complete()
    {
        for replacement in replacements {
            mutations.push(BatchMutation::ReplaceLastTurn {
                replacement: replacement.clone(),
            });
        }
    }
    if completeness == BatchCompleteness::Canonical
        && complete
        && let Some(source_range) = source_range
    {
        mutations.push(BatchMutation::CompleteRange { source_range });
    } else {
        mutations.push(BatchMutation::MarkPartial { source_range });
    }
    mutations
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

/// Long-lived formal analyzer state.  The adapter and reducer are kept
/// together so a tail/backfill boundary cannot lose pending Plan answers,
/// active turns, or deduplication state.
#[derive(Clone)]
pub struct AnalyzerRuntimeState {
    profile: CompatibilityProfile,
    conversation_id: Option<String>,
    source_epoch: Option<String>,
    adapter: CodexEventAdapter,
    reducer: AnalysisReducer,
}

impl AnalyzerRuntimeState {
    pub fn new(profile: CompatibilityProfile) -> Self {
        Self {
            profile,
            conversation_id: None,
            source_epoch: None,
            adapter: CodexEventAdapter::new(profile),
            reducer: AnalysisReducer::new(None),
        }
    }

    fn reset(&mut self, conversation_id: &str, source_epoch: &str) {
        self.conversation_id = Some(conversation_id.to_string());
        self.source_epoch = Some(source_epoch.to_string());
        self.adapter = CodexEventAdapter::new_with_conversation_id(
            self.profile,
            Some(conversation_id.to_string()),
        );
        self.reducer = AnalysisReducer::new(Some(conversation_id.to_string()));
    }

    fn prepare_request(&mut self, request: &AnalyzeRequest) -> anyhow::Result<()> {
        let source_epoch = request
            .source_spec
            .source_epoch
            .as_deref()
            .or_else(|| {
                request
                    .cursor
                    .as_ref()
                    .and_then(|cursor| cursor.get("source_epoch"))
                    .and_then(Value::as_str)
            })
            .or_else(|| {
                request
                    .persisted_anchor
                    .as_ref()
                    .and_then(|anchor| anchor.get("source"))
                    .and_then(|source| source.get("source_epoch"))
                    .and_then(Value::as_str)
            })
            .ok_or_else(|| anyhow::anyhow!("source_epoch must be explicitly bound"))?;
        let identity_changed = self.conversation_id.as_deref() != Some(&request.conversation_id)
            || self.source_epoch.as_deref() != Some(source_epoch);
        if request.replace_previous && self.conversation_id.is_some() && !identity_changed {
            anyhow::bail!("replace_previous requires a new source epoch for the conversation");
        }
        if request.replace_previous || identity_changed {
            self.reset(&request.conversation_id, source_epoch);
        }

        if !request.replace_previous
            && let Some(anchor) = request.persisted_anchor.as_ref()
            && let Some(state) = anchor.get("reducer_state").or(Some(anchor))
            && state.get("adapter").is_some()
        {
            self.restore_checkpoint_state(state)?;
        }
        Ok(())
    }

    fn restore_checkpoint_state(&mut self, state: &Value) -> anyhow::Result<()> {
        if let Some(adapter_state) = state.get("adapter") {
            self.adapter.restore_checkpoint_state(adapter_state)?;
        }
        if let Some(reducer_state) = state.get("reducer") {
            self.reducer = serde_json::from_value(reducer_state.clone())
                .map_err(|error| anyhow::anyhow!("invalid reducer checkpoint state: {error}"))?;
        }
        Ok(())
    }

    fn checkpoint_state(&self) -> Value {
        serde_json::json!({
            "schema_version": 1,
            "adapter": self.adapter.checkpoint_state(),
            "reducer": self.reducer,
        })
    }

    fn apply(&mut self, batch: &AnalysisBatch) {
        self.reducer.apply_batch(batch);
    }

    fn projection(&self) -> AnalysisProjection {
        self.reducer.snapshot()
    }
}

/// Run one request with an isolated, request-local runtime.  This keeps the
/// original public helper backward-compatible for stage 1–3 callers.
pub fn analyze_request(
    request: &AnalyzeRequest,
    cancelled: &AtomicBool,
) -> anyhow::Result<BatchMessage> {
    let mut runtime = AnalyzerRuntimeState::new(CompatibilityProfile::Current);
    analyze_request_with_state(request, cancelled, &mut runtime)
}

/// Run one request against a caller-owned runtime.  The process entry point
/// uses this path for cross-request Plan/tool/turn continuity and checkpoint
/// restoration.
pub fn analyze_request_with_state(
    request: &AnalyzeRequest,
    cancelled: &AtomicBool,
    runtime: &mut AnalyzerRuntimeState,
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
    let deadline = Instant::now()
        .checked_add(Duration::from_millis(request.resource_limits.timeout_ms))
        .ok_or_else(|| anyhow::anyhow!("resource timeout deadline overflowed"))?;
    check_deadline(cancelled, deadline)?;

    let mut effective_lineage = request.lineage.clone();
    let mut discovered_lineage = None;
    let mut source_request = request.source_spec.clone();
    if let Some(discovery) = request.discovery.as_ref() {
        if discovery.conversation_id != request.conversation_id {
            anyhow::bail!("discovery conversation_id does not match analyze conversation_id");
        }
        if !request
            .peer_capabilities
            .iter()
            .any(|capability| capability == SESSION_LINEAGE_CAPABILITY)
        {
            anyhow::bail!(
                "unsupported capability: Node must offer {SESSION_LINEAGE_CAPABILITY} before session discovery"
            );
        }
        let mut discovery_request = discovery.to_source_request();
        // A restarted caller may still hold the previous active rollout in
        // source_spec.  Treat it as a bounded discovery hint so a newer
        // descendant can be selected instead of rejecting a valid restart.
        if discovery_request.active_rollout_id.is_none() {
            discovery_request.active_rollout_id = source_request
                .source_id
                .as_deref()
                .filter(|source_id| !source_id.trim().is_empty())
                .map(ToOwned::to_owned);
        }
        if discovery_request.active_path.is_none() && !source_request.path.trim().is_empty() {
            discovery_request.active_path = Some(PathBuf::from(&source_request.path));
        }
        let session = discover_session(&discovery_request)
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        let active = session.active_source();
        if let Some(source_id) = source_request
            .source_id
            .as_deref()
            .filter(|source_id| !source_id.trim().is_empty())
            && source_id != active.rollout_id
            && !session
                .candidates
                .iter()
                .any(|candidate| candidate.source.rollout_id == source_id)
        {
            anyhow::bail!(
                "source_spec.source_id {} is not a discovered rollout for conversation {}",
                source_id,
                request.conversation_id
            );
        }
        // Discovery is authoritative for the physical active source.  This
        // also guarantees that a child rollout receives a new epoch even when
        // the restarted caller persisted the parent's epoch.
        source_request.path = active.path.to_string_lossy().to_string();
        source_request.source_id = Some(active.rollout_id.clone());
        source_request.source_epoch = Some(session.source_epoch());
        if effective_lineage.is_none() {
            effective_lineage = Some(RolloutLineageRequest::default());
        }
        discovered_lineage = Some(session);
    }
    source_request.max_decoded_bytes = Some(request.resource_limits.max_decoded_bytes);
    source_request.max_line_bytes = Some(request.resource_limits.max_line_bytes);
    source_request.max_segment_bytes = Some(request.resource_limits.max_segment_bytes);
    let mut spec = source_request
        .into_source_spec(&request.conversation_id)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let cursor_is_for_new_active_head = discovered_lineage.as_ref().is_some_and(|lineage| {
        request.cursor.as_ref().is_some_and(|cursor| {
            source_metadata_is_stale(
                cursor,
                &lineage.source_epoch(),
                &lineage.active_head_rollout_id,
            )
        })
    });
    let persisted_anchor_is_for_new_active_head =
        discovered_lineage.as_ref().is_some_and(|lineage| {
            request.persisted_anchor.as_ref().is_some_and(|anchor| {
                source_metadata_is_stale(
                    anchor,
                    &lineage.source_epoch(),
                    &lineage.active_head_rollout_id,
                )
            })
        });
    let cursor_for_source = (!cursor_is_for_new_active_head)
        .then_some(request.cursor.as_ref())
        .flatten();
    if let Some(cursor) = cursor_for_source {
        spec = enrich_spec_from_cursor(spec, cursor)?;
    }
    let persisted_anchor_for_source = (!(cursor_is_for_new_active_head
        || persisted_anchor_is_for_new_active_head))
        .then_some(request.persisted_anchor.as_ref())
        .flatten();
    if let Some(anchor) = persisted_anchor_for_source {
        spec = enrich_spec_from_persisted_anchor(spec, anchor)?;
    }
    if spec.source_epoch().is_none() {
        anyhow::bail!("source_epoch must be explicitly bound");
    }
    if spec.max_decoded_bytes() != request.resource_limits.max_decoded_bytes
        || spec.max_line_bytes() != request.resource_limits.max_line_bytes
        || spec.max_segment_bytes() != request.resource_limits.max_segment_bytes
    {
        anyhow::bail!("source limits do not match resource_limits");
    }
    let lineage_source_guard = if effective_lineage.is_some() {
        Some(capture_source_guard(spec.path())?)
    } else {
        None
    };
    if let Some(cursor) = cursor_for_source {
        let current_length = std::fs::metadata(spec.path())?.len();
        validate_cursor_payload(
            cursor,
            &spec,
            request.mode,
            SnapshotBoundary::new(current_length),
        )?;
        // Cursor metadata describes the previous committed snapshot.  Once
        // it has passed prefix/fingerprint validation, the read plan must be
        // bound to the newly observed (possibly grown) snapshot.
        spec = spec.with_snapshot_boundary(SnapshotBoundary::new(current_length));
    } else if persisted_anchor_for_source
        .as_ref()
        .is_some_and(|anchor| anchor.get("source").is_some())
        || spec.fingerprint().is_some()
        || spec.prefix_anchor().is_some()
    {
        validate_persisted_source_metadata(&spec)?;
    }

    let mut runtime_request = request.clone();
    runtime_request.source_spec = source_request;
    runtime_request.cursor = cursor_for_source.cloned();
    runtime_request.persisted_anchor = persisted_anchor_for_source.cloned();
    runtime.prepare_request(&runtime_request)?;
    check_deadline(cancelled, deadline)?;
    let profile = runtime.profile;
    let backend = JsonlSourceBackend;
    let (
        mut batch,
        source_range,
        mut progress,
        report,
        records,
        append_last_line,
        append_last_ordinal,
    ) = match request.mode {
        AnalyzeMode::Replay => {
            let plan = backend.plan_full(&spec)?;
            let (batch, report, records) = analyze_planned_request(
                &backend,
                &plan,
                &runtime.adapter,
                profile,
                cancelled,
                deadline,
                BatchCompleteness::Canonical,
            )?;
            let source_range = report.complete_range().or(Some(report.scanned_range()));
            let progress = progress_from_report(&report, batch.items.len());
            (batch, source_range, progress, report, records, None, None)
        }
        AnalyzeMode::Preview => {
            let plan = if let Some(cursor) = cursor_for_source {
                let range = cursor_range(cursor, SourceCursorMode::TailPreview)?;
                backend.plan_range(&spec, SourceReadMode::BackwardRange, range)?
            } else {
                backend.plan_tail(&spec, request.resource_limits.tail_bytes)?
            };
            let (batch, report, records) = analyze_planned_request(
                &backend,
                &plan,
                &runtime.adapter,
                profile,
                cancelled,
                deadline,
                BatchCompleteness::Provisional,
            )?;
            let source_range = report.complete_range().or(Some(report.scanned_range()));
            let progress = progress_from_report(&report, batch.items.len());
            (batch, source_range, progress, report, records, None, None)
        }
        AnalyzeMode::Backfill => {
            let range = request
                .known_complete_range
                .or_else(|| cursor_for_source.and_then(cursor_range_for_backfill))
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
            let (batch, report, records) = analyze_planned_request(
                &backend,
                &plan,
                &runtime.adapter,
                profile,
                cancelled,
                deadline,
                completeness,
            )?;
            let source_range = report.complete_range().or(Some(report.scanned_range()));
            let progress = progress_from_report(&report, batch.items.len());
            (batch, source_range, progress, report, records, None, None)
        }
        AnalyzeMode::Append => {
            if let Some(cursor) = cursor_for_source {
                let append_cursor =
                    serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
                        .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
                let current_length = std::fs::metadata(spec.path())?.len();
                let range = SourceByteRange::new(
                    append_cursor.metadata().snapshot_boundary().byte_length(),
                    current_length,
                )
                .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
                let plan = backend.plan_range(&spec, SourceReadMode::ForwardRange, range)?;
                let (batch, report, records) = analyze_planned_request(
                    &backend,
                    &plan,
                    &runtime.adapter,
                    profile,
                    cancelled,
                    deadline,
                    BatchCompleteness::Canonical,
                )?;
                let source_range = report.complete_range().or(Some(report.scanned_range()));
                let progress = progress_from_report(&report, batch.items.len());
                let last_line = serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
                    .ok()
                    .and_then(|cursor| cursor.metadata().last_complete_line().cloned());
                let last_ordinal = serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
                    .ok()
                    .and_then(|cursor| cursor.metadata().last_rollout_ordinal());
                (
                    batch,
                    source_range,
                    progress,
                    report,
                    records,
                    last_line,
                    last_ordinal,
                )
            } else {
                let plan = backend.plan_full(&spec)?;
                let (batch, report, records) = analyze_planned_request(
                    &backend,
                    &plan,
                    &runtime.adapter,
                    profile,
                    cancelled,
                    deadline,
                    BatchCompleteness::Canonical,
                )?;
                let source_range = report.complete_range().or(Some(report.scanned_range()));
                let progress = progress_from_report(&report, batch.items.len());
                (batch, source_range, progress, report, records, None, None)
            }
        }
    };
    check_deadline(cancelled, deadline)?;
    if let Some(guard) = lineage_source_guard.as_ref() {
        let active_source_changed = !source_guard_matches(spec.path(), guard)?;
        if report.source_grew_during_read()
            || report.source_shrank_during_read()
            || active_source_changed
        {
            anyhow::bail!("active rollout changed while lineage analysis was reading it");
        }
    }
    if batch.history_base.is_none()
        && let Some(discovered_lineage) = discovered_lineage.as_ref()
    {
        batch.history_base = discovered_lineage.active_history_base();
    }
    let mut lineage_coverage = None;
    if let Some(lineage) = effective_lineage.as_ref()
        && (batch.complete && batch.completeness == BatchCompleteness::Canonical
            || discovered_lineage.is_some())
    {
        let replay = if batch.complete && batch.completeness == BatchCompleteness::Canonical {
            collect_lineage_replay(
                &spec,
                &batch,
                lineage,
                profile,
                cancelled,
                deadline,
                discovered_lineage.as_ref(),
            )?
        } else if let Some(discovered_lineage) = discovered_lineage.as_ref() {
            collect_lineage_window(
                &spec,
                &batch,
                lineage,
                discovered_lineage,
                profile,
                cancelled,
                deadline,
            )?
        } else {
            return Err(anyhow::anyhow!(
                "incomplete lineage replay requires session discovery"
            ));
        };
        // A lineage request is a cold-start capable replay, not only a
        // relationship lookup.  Send the ordered parent history together
        // with the active child so Node can rebuild the same projection even
        // when no parent scope has been imported yet.
        batch.items = replay.history_items;
        batch.replacements = replay.replacements;
        lineage_coverage = Some(replay.coverage);
        progress.records_emitted = batch.items.len() as u64;
        if !batch.replacements.is_empty()
            && !request
                .peer_capabilities
                .iter()
                .any(|capability| capability == LAST_TURN_REPLACEMENT_CAPABILITY)
        {
            anyhow::bail!(
                "unsupported capability: Node must offer {LAST_TURN_REPLACEMENT_CAPABILITY} before a last-turn replacement can be emitted"
            );
        }
    }
    runtime.apply(&batch);
    check_deadline(cancelled, deadline)?;
    let mut projection = runtime.projection();
    if let Some(lineage_coverage) = lineage_coverage {
        projection.coverage = projection.coverage.min(lineage_coverage);
        if !projection.coverage.is_complete() {
            // `complete` remains the legacy content-availability flag.  A
            // partial lineage coverage must nevertheless prevent a canonical
            // projection mutation from being emitted or imported.
            projection.complete = false;
        }
    }
    let completeness = batch.completeness;
    let batch_complete = batch.complete;
    let source_epoch = spec
        .source_epoch()
        .ok_or_else(|| anyhow::anyhow!("source_epoch must be explicitly bound"))?;
    let mut message = BatchMessage::from_analysis(
        request,
        format!("{}:batch-0", request.header.request_id),
        spec.source_id().to_string(),
        source_epoch.to_string(),
        source_range,
        completeness,
        batch,
        projection,
        progress,
    );
    message.replace_previous = request.replace_previous;
    message.reducer_state = Some(runtime.checkpoint_state());
    if let Some(discovered_lineage) = discovered_lineage.as_ref() {
        apply_lineage_metadata(&mut message, discovered_lineage, lineage_coverage);
    }
    check_deadline(cancelled, deadline)?;
    let prefix_end = source_range.map(|range| range.end()).unwrap_or(0);
    let (fingerprint, prefix_anchor) =
        observed_source_metadata(&spec, report.snapshot_boundary(), prefix_end)?;
    message.source_fingerprint = Some(fingerprint.clone());
    message.source_prefix_anchor = Some(prefix_anchor.clone());
    if batch_complete
        && completeness != BatchCompleteness::Partial
        && !report.source_grew_during_read()
        && !report.source_shrank_during_read()
        && report.pending_tail_bytes() == 0
        && !report.source().budget_exceeded
    {
        if let Some((cursor, cursor_fingerprint, cursor_prefix_anchor)) = build_next_cursor(
            &spec,
            request.mode,
            &report,
            &records,
            append_last_line,
            append_last_ordinal,
        )? {
            message.next_cursor = Some(cursor);
            message.source_fingerprint = Some(cursor_fingerprint);
            message.source_prefix_anchor = Some(cursor_prefix_anchor);
        }
    }
    check_deadline(cancelled, deadline)?;
    Ok(message)
}

fn source_metadata_is_stale(value: &Value, active_epoch: &str, active_source_id: &str) -> bool {
    let source = value.get("source").unwrap_or(value);
    source
        .get("source_id")
        .and_then(Value::as_str)
        .is_some_and(|source_id| source_id != active_source_id)
        || source
            .get("source_epoch")
            .and_then(Value::as_str)
            .is_some_and(|source_epoch| source_epoch != active_epoch)
}

struct LineageReplay {
    history_items: Vec<AnalysisEvent>,
    replacements: Vec<LastTurnReplacement>,
    coverage: ProjectionCoverage,
}

fn apply_lineage_metadata(
    message: &mut BatchMessage,
    session: &SessionLineage,
    coverage: Option<ProjectionCoverage>,
) {
    message.discovered_sources = session
        .candidates
        .iter()
        .map(|candidate| LineageSourceMessage {
            rollout_id: candidate.source.rollout_id.clone(),
            path: candidate.source.path.to_string_lossy().to_string(),
            timestamp: candidate.filename.timestamp.clone(),
            date_partition: candidate.filename.date_partition.clone(),
            file_size: candidate.file_size,
            header_end_byte: candidate.header.header_end_byte,
            header_verified: true,
            history_base: candidate.header.history_base.clone(),
            fingerprint: candidate.fingerprint.clone(),
        })
        .collect();
    message.lineage_transitions = session
        .transitions
        .iter()
        .map(|transition| LineageTransitionMessage {
            parent_rollout_id: transition.parent_rollout_id.clone(),
            child_rollout_id: transition.child_rollout_id.clone(),
            history_base: transition.history_base.clone(),
        })
        .collect();
    let coverage = coverage.unwrap_or(ProjectionCoverage::Unknown);
    message.lineage_coverage = Some(LineageCoverageMessage {
        root_rollout_id: session.root_rollout_id.clone(),
        active_head_rollout_id: session.active_head_rollout_id.clone(),
        chain_rollout_ids: session
            .chain
            .iter()
            .map(|candidate| candidate.source.rollout_id.clone())
            .collect(),
        discovered_source_count: session.candidates.len(),
        // A source is physically covered when its planned segment/full read
        // completed.  This is intentionally separate from `complete`, which
        // also requires a complete known-event projection.
        covered_source_count: session.chain.len(),
        complete: coverage.is_complete(),
    });
    message.lineage_checkpoint = Some(serde_json::json!({
        "schema_version": 1,
        "conversation_id": session.conversation_id,
        "root_rollout_id": session.root_rollout_id,
        "active_head_rollout_id": session.active_head_rollout_id,
        "start_date": session.start_date,
        "end_date": session.end_date,
        "chain_rollout_ids": session
            .chain
            .iter()
            .map(|candidate| candidate.source.rollout_id.clone())
            .collect::<Vec<_>>(),
        "discovered_sources": &message.discovered_sources,
        "lineage_transitions": &message.lineage_transitions,
        "coverage": coverage,
    }));
}

struct LineageParentRead {
    validation_batch: AnalysisBatch,
    history_batch: AnalysisBatch,
}

/// Assemble a provisional logical window for preview/backfill requests.
///
/// The active source is read using its requested physical mode first.  When
/// the window crosses a child boundary, the collector reads only the bounded
/// parent suffix selected by `history_base`; it does not pretend that this is
/// a complete canonical replay and therefore emits no replacement mutation.
fn collect_lineage_window(
    active_spec: &SourceSpec,
    active_batch: &AnalysisBatch,
    request: &RolloutLineageRequest,
    session: &SessionLineage,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> anyhow::Result<LineageReplay> {
    if request.max_depth == 0 {
        anyhow::bail!("lineage max_depth must be greater than zero");
    }
    let catalog = build_rollout_catalog(active_spec, request, Some(session))?;
    let mut current_source = RolloutSource::new(
        active_spec.source_id().to_string(),
        active_spec.path().to_path_buf(),
    )
    .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let mut current_batch = active_batch.clone();
    let mut lineage_batches = vec![active_batch.clone()];
    let mut visited = BTreeSet::new();
    let mut coverage = projection_coverage_of(active_batch).min(ProjectionCoverage::Partial);
    for depth in 0..request.max_depth {
        check_deadline(cancelled, deadline)?;
        if !visited.insert(current_source.rollout_id.clone()) {
            return Err(anyhow::anyhow!(LineageError::ParentChainCycle {
                rollout_id: current_source.rollout_id,
            }));
        }
        let Some(history_base) = current_batch.history_base.clone() else {
            break;
        };
        let parent_source = catalog
            .resolve(&history_base.parent_rollout_id)
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        let parent_batch = read_lineage_suffix_batch(
            &parent_source,
            active_spec,
            &history_base,
            profile,
            cancelled,
            deadline,
        )?;
        coverage = coverage.min(projection_coverage_of(&parent_batch));
        lineage_batches.push(parent_batch.clone());
        current_source = parent_source;
        current_batch = parent_batch;
        if depth + 1 == request.max_depth && current_batch.history_base.is_some() {
            return Err(anyhow::anyhow!(LineageError::ParentChainDepthExceeded {
                max_depth: request.max_depth,
            }));
        }
    }
    lineage_batches.reverse();
    let mut history_items = Vec::new();
    for batch in lineage_batches {
        merge_lineage_history_items(&mut history_items, &batch.items);
    }
    Ok(LineageReplay {
        history_items,
        replacements: Vec::new(),
        coverage,
    })
}

fn collect_lineage_replay(
    active_spec: &SourceSpec,
    active_batch: &AnalysisBatch,
    request: &RolloutLineageRequest,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
    discovered_lineage: Option<&SessionLineage>,
) -> anyhow::Result<LineageReplay> {
    if request.max_depth == 0 {
        anyhow::bail!("lineage max_depth must be greater than zero");
    }
    if active_batch.history_base.is_none() {
        return Ok(LineageReplay {
            history_items: active_batch.items.clone(),
            replacements: Vec::new(),
            coverage: projection_coverage_of(active_batch),
        });
    }
    // A replay request may arrive after the service has restarted.  In that
    // case the caller can know only the current active rollout and still ask
    // for lineage recovery with an empty catalog request.  A rollout's
    // sibling parent files are stored beside it by Codex, so the active
    // source directory is the bounded default discovery root.  An explicit
    // catalog_root remains authoritative when the caller has a wider (or
    // otherwise different) approved source directory.
    let catalog = build_rollout_catalog(active_spec, request, discovered_lineage)?;
    let child_rollout_id = active_spec.source_id().to_string();
    let mut current_source = RolloutSource::new(child_rollout_id, active_spec.path().to_path_buf())
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let mut current_batch = active_batch.clone();
    let mut lineage_batches = vec![active_batch.clone()];
    let mut visited = BTreeSet::new();
    let mut replacements = Vec::new();
    let mut coverage = projection_coverage_of(active_batch);

    for depth in 0..request.max_depth {
        check_deadline(cancelled, deadline)?;
        if !visited.insert(current_source.rollout_id.clone()) {
            return Err(anyhow::anyhow!(LineageError::ParentChainCycle {
                rollout_id: current_source.rollout_id,
            }));
        }
        let Some(history_base) = current_batch.history_base.clone() else {
            break;
        };
        let parent_source = catalog
            .resolve(&history_base.parent_rollout_id)
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        let parent_read = read_lineage_batch(
            &parent_source,
            active_spec,
            &history_base,
            profile,
            cancelled,
            deadline,
        )?;
        let replacement = validate_last_turn_replacement(
            active_spec
                .target_conversation_id()
                .ok_or_else(|| anyhow::anyhow!("lineage target conversation ID is required"))?,
            &parent_source.rollout_id,
            &current_source.rollout_id,
            &history_base,
            &parent_read.validation_batch,
            &current_batch,
        )
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        replacements.push(replacement);
        coverage = coverage.min(projection_coverage_of(&parent_read.history_batch));
        lineage_batches.push(parent_read.history_batch);
        current_source = parent_source;
        current_batch = parent_read.validation_batch;
        if depth + 1 == request.max_depth && current_batch.history_base.is_some() {
            return Err(anyhow::anyhow!(LineageError::ParentChainDepthExceeded {
                max_depth: request.max_depth,
            }));
        }
    }
    replacements.reverse();
    lineage_batches.reverse();
    let history_items = lineage_batches
        .into_iter()
        .flat_map(|batch| batch.items)
        .collect();
    Ok(LineageReplay {
        history_items,
        replacements,
        coverage,
    })
}

fn projection_coverage_of(batch: &AnalysisBatch) -> ProjectionCoverage {
    AnalysisReducer::reduce_batch(batch).coverage
}

fn build_rollout_catalog(
    active_spec: &SourceSpec,
    request: &RolloutLineageRequest,
    discovered_lineage: Option<&SessionLineage>,
) -> anyhow::Result<RolloutCatalog> {
    let mut catalog = if let Some(discovered_lineage) = discovered_lineage {
        if discovered_lineage.active_head_rollout_id != active_spec.source_id() {
            anyhow::bail!(
                "discovered active rollout {} does not match source {}",
                discovered_lineage.active_head_rollout_id,
                active_spec.source_id()
            );
        }
        discovered_lineage.catalog.clone()
    } else if let Some(root) = request.catalog_root.as_deref() {
        RolloutCatalog::from_directory(root).map_err(|error| anyhow::anyhow!(error.to_string()))?
    } else if let Some(root) = active_spec
        .path()
        .parent()
        .filter(|root| !root.as_os_str().is_empty())
    {
        RolloutCatalog::from_directory(root).map_err(|error| anyhow::anyhow!(error.to_string()))?
    } else {
        RolloutCatalog::new()
    };
    for candidate in &request.candidates {
        catalog
            .insert(candidate.rollout_id.clone(), candidate.path.clone())
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    }
    if catalog.is_empty() {
        anyhow::bail!("lineage catalog has no parent rollout candidates");
    }
    Ok(catalog)
}

fn read_lineage_suffix_batch(
    source: &RolloutSource,
    active_spec: &SourceSpec,
    history_base: &HistoryBaseRef,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> anyhow::Result<AnalysisBatch> {
    check_deadline(cancelled, deadline)?;
    let target_conversation_id = active_spec
        .target_conversation_id()
        .ok_or_else(|| anyhow::anyhow!("lineage target conversation ID is required"))?;
    let spec = SourceSpec::bind(
        target_conversation_id,
        source.rollout_id.clone(),
        source.path.clone(),
    )
    .map_err(|error| anyhow::anyhow!(error.to_string()))?
    .with_limits(
        active_spec.max_decoded_bytes(),
        active_spec.max_line_bytes(),
    )
    .with_segment_limit(active_spec.max_segment_bytes());
    if spec.compression() != SourceCompression::PlainJsonl {
        anyhow::bail!(
            "lineage tail/backfill recovery requires a seekable plain JSONL parent source"
        );
    }
    let snapshot_length = std::fs::metadata(&source.path)?.len();
    if history_base.end_byte_offset > snapshot_length {
        return Err(anyhow::anyhow!(LineageError::CutBeyondParent {
            cut: history_base.end_byte_offset,
            parent_bytes: snapshot_length,
        }));
    }
    let header_end = first_line_end(&source.path, spec.max_line_bytes())?;
    let header_range = SourceByteRange::new(0, header_end)?;
    let suffix_range = SourceByteRange::new(history_base.end_byte_offset, snapshot_length)?;
    let source_guard = capture_lineage_source_guard(&source.path, &[header_range, suffix_range])?;
    let spec = spec.with_snapshot_boundary(SnapshotBoundary::new(snapshot_length));
    let backend = JsonlSourceBackend;
    let header_plan = backend
        .plan_range(&spec, SourceReadMode::ForwardRange, header_range)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let suffix_plan = backend
        .plan_range(&spec, SourceReadMode::ForwardRange, suffix_range)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let (header_report, mut records) =
        read_lineage_segment(&header_plan, &backend, cancelled, deadline)?;
    ensure_lineage_segment_complete("parent header", header_range, &header_report)?;
    let (suffix_report, suffix_records) =
        read_lineage_segment(&suffix_plan, &backend, cancelled, deadline)?;
    ensure_lineage_segment_complete("parent lineage suffix", suffix_range, &suffix_report)?;
    records.extend(suffix_records);
    let adapter = CodexEventAdapter::new_with_conversation_id(
        profile,
        Some(target_conversation_id.to_string()),
    );
    let mut batch = crate::protocol::analyze_records_with_adapter(
        &adapter,
        records,
        profile,
        BatchCompleteness::Provisional,
    );
    batch.source_id = Some(source.rollout_id.clone());
    if !lineage_source_guard_matches(&source.path, &source_guard)? {
        anyhow::bail!("parent rollout changed during bounded lineage suffix read");
    }
    Ok(batch)
}

fn read_lineage_batch(
    source: &RolloutSource,
    active_spec: &SourceSpec,
    history_base: &HistoryBaseRef,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> anyhow::Result<LineageParentRead> {
    check_deadline(cancelled, deadline)?;
    let target_conversation_id = active_spec
        .target_conversation_id()
        .ok_or_else(|| anyhow::anyhow!("lineage target conversation ID is required"))?;
    let spec = SourceSpec::bind(
        target_conversation_id,
        source.rollout_id.clone(),
        source.path.clone(),
    )
    .map_err(|error| anyhow::anyhow!(error.to_string()))?
    .with_limits(
        active_spec.max_decoded_bytes(),
        active_spec.max_line_bytes(),
    )
    .with_segment_limit(active_spec.max_segment_bytes());
    if spec.compression() != SourceCompression::PlainJsonl {
        anyhow::bail!(
            "lineage replacement validation requires a seekable plain JSONL parent source"
        );
    }

    let snapshot_length = std::fs::metadata(&source.path)?.len();
    let header_end = first_line_end(&source.path, spec.max_line_bytes())?;
    let header_range = SourceByteRange::new(0, header_end)?;
    let suffix_range = SourceByteRange::new(history_base.end_byte_offset, snapshot_length)?;
    let source_guard = capture_lineage_source_guard(&source.path, &[header_range, suffix_range])?;
    let spec = spec.with_snapshot_boundary(SnapshotBoundary::new(snapshot_length));
    let backend = JsonlSourceBackend;
    let header_plan = backend
        .plan_range(&spec, SourceReadMode::ForwardRange, header_range)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let suffix_plan = backend
        .plan_range(&spec, SourceReadMode::ForwardRange, suffix_range)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let (header_report, mut records) =
        read_lineage_segment(&header_plan, &backend, cancelled, deadline)?;
    ensure_lineage_segment_complete("parent header", header_range, &header_report)?;
    let (suffix_report, suffix_records) =
        read_lineage_segment(&suffix_plan, &backend, cancelled, deadline)?;
    ensure_lineage_segment_complete("parent replacement suffix", suffix_range, &suffix_report)?;
    records.extend(suffix_records);
    let adapter = CodexEventAdapter::new_with_conversation_id(
        profile,
        Some(target_conversation_id.to_string()),
    );
    let mut validation_batch = crate::protocol::analyze_records_with_adapter(
        &adapter,
        records,
        profile,
        BatchCompleteness::Canonical,
    );
    validation_batch.source_id = Some(source.rollout_id.clone());
    if !validation_batch.complete {
        anyhow::bail!("parent replacement suffix contains incomplete or unsupported evidence");
    }
    let mut history_batch =
        read_lineage_history_batch(&spec, source, profile, cancelled, deadline)?;
    merge_lineage_history_items(&mut history_batch.items, &validation_batch.items);
    if !lineage_source_guard_matches(&source.path, &source_guard)? {
        anyhow::bail!("parent rollout changed during bounded lineage read");
    }
    Ok(LineageParentRead {
        validation_batch,
        history_batch,
    })
}

fn read_lineage_history_batch(
    spec: &SourceSpec,
    source: &RolloutSource,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> anyhow::Result<AnalysisBatch> {
    let backend = JsonlSourceBackend;
    let plan = backend
        .plan_full(spec)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let adapter = CodexEventAdapter::new_with_conversation_id(
        profile,
        spec.target_conversation_id().map(ToOwned::to_owned),
    );
    let (mut batch, _report, _records) = analyze_planned_request(
        &backend,
        &plan,
        &adapter,
        profile,
        cancelled,
        deadline,
        BatchCompleteness::Canonical,
    )?;
    // This batch is only the best-effort historical payload.  Its completeness
    // must not decide whether the independently bounded replacement suffix is
    // valid; unknown prefix events and the decoded budget are intentionally
    // allowed to make this auxiliary batch partial.
    batch.source_id = Some(source.rollout_id.clone());
    Ok(batch)
}

fn read_lineage_segment(
    plan: &SourceReadPlan,
    backend: &JsonlSourceBackend,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> anyhow::Result<(PlannedReadReport, Vec<SourceRecord>)> {
    let mut records = Vec::new();
    let report = plan.read(backend, &mut |record| {
        check_deadline(cancelled, deadline)?;
        records.push(record);
        Ok(())
    })?;
    check_deadline(cancelled, deadline)?;
    Ok((report, records))
}

fn ensure_lineage_segment_complete(
    label: &str,
    expected_range: SourceByteRange,
    report: &PlannedReadReport,
) -> anyhow::Result<()> {
    if report.source_grew_during_read()
        || report.source_shrank_during_read()
        || report.pending_tail_bytes() != 0
        || report.source().budget_exceeded
        || report.complete_range() != Some(expected_range)
    {
        anyhow::bail!("{label} was changed or incomplete during lineage read");
    }
    Ok(())
}

fn merge_lineage_history_items(
    history_items: &mut Vec<AnalysisEvent>,
    suffix_items: &[AnalysisEvent],
) {
    let mut seen = BTreeSet::new();
    for event in history_items.iter() {
        seen.insert(lineage_event_key(event));
    }
    for event in suffix_items {
        if seen.insert(lineage_event_key(event)) {
            history_items.push(event.clone());
        }
    }
}

fn lineage_event_key(event: &AnalysisEvent) -> (String, u64, u64, String) {
    (
        event.metadata().source_ref.source_identity.clone(),
        event.metadata().source_ref.byte_start,
        event.metadata().sequence,
        event.event_id().to_string(),
    )
}

fn first_line_end(path: &std::path::Path, max_line_bytes: usize) -> anyhow::Result<u64> {
    if max_line_bytes == 0 {
        anyhow::bail!("max_line_bytes must be greater than zero");
    }
    let max_line_bytes = u64::try_from(max_line_bytes).unwrap_or(u64::MAX);
    let mut file = File::open(path)?;
    let mut consumed = 0_u64;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            anyhow::bail!("parent rollout has no complete session header line");
        }
        if let Some(index) = buffer[..read].iter().position(|byte| *byte == b'\n') {
            let end = consumed.saturating_add(index as u64 + 1);
            if end > max_line_bytes {
                anyhow::bail!("parent session header exceeds max_line_bytes");
            }
            return Ok(end);
        }
        consumed = consumed.saturating_add(read as u64);
        if consumed >= max_line_bytes {
            anyhow::bail!("parent session header exceeds max_line_bytes");
        }
    }
}

#[derive(Debug, Clone)]
struct LineageSourceGuard {
    byte_length: u64,
    ranges: Vec<(SourceByteRange, SourceFixtureHash)>,
}

fn capture_lineage_source_guard(
    path: &std::path::Path,
    ranges: &[SourceByteRange],
) -> anyhow::Result<LineageSourceGuard> {
    let byte_length = std::fs::metadata(path)?.len();
    let mut guarded_ranges = Vec::with_capacity(ranges.len());
    for range in ranges {
        if range.end() > byte_length {
            anyhow::bail!("lineage guard range exceeds parent rollout snapshot");
        }
        let fingerprint = SourceFixtureHash::from_file(path, range.start(), range.end())
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        guarded_ranges.push((*range, fingerprint));
    }
    Ok(LineageSourceGuard {
        byte_length,
        ranges: guarded_ranges,
    })
}

fn lineage_source_guard_matches(
    path: &std::path::Path,
    guard: &LineageSourceGuard,
) -> anyhow::Result<bool> {
    let byte_length = std::fs::metadata(path)?.len();
    if byte_length != guard.byte_length {
        return Ok(false);
    }
    for (range, expected) in &guard.ranges {
        let actual = SourceFixtureHash::from_file(path, range.start(), range.end())
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        if &actual != expected {
            return Ok(false);
        }
    }
    Ok(true)
}

fn capture_source_guard(path: &std::path::Path) -> anyhow::Result<(u64, String)> {
    let byte_length = std::fs::metadata(path)?.len();
    let fingerprint = SourceFixtureHash::from_file(path, 0, byte_length)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    Ok((byte_length, fingerprint.digest().to_string()))
}

fn source_guard_matches(path: &std::path::Path, guard: &(u64, String)) -> anyhow::Result<bool> {
    let byte_length = std::fs::metadata(path)?.len();
    if byte_length != guard.0 {
        return Ok(false);
    }
    let fingerprint = SourceFixtureHash::from_file(path, 0, byte_length)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    Ok(fingerprint.digest() == guard.1)
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

fn enrich_spec_from_cursor(mut spec: SourceSpec, cursor: &Value) -> anyhow::Result<SourceSpec> {
    let kind = cursor
        .get("cursor_kind")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("cursor_kind is required"))?;
    let (source_epoch, fingerprint, prefix_anchor, snapshot_boundary) = match kind {
        "tail_preview" => {
            let cursor = serde_json::from_value::<TailPreviewCursor>(cursor.clone())?;
            (
                cursor.metadata().source_epoch().to_string(),
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        "backfill" => {
            let cursor = serde_json::from_value::<BackfillCursor>(cursor.clone())?;
            (
                cursor.metadata().source_epoch().to_string(),
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        "forward_append" => {
            let cursor = serde_json::from_value::<ForwardAppendCursor>(cursor.clone())?;
            (
                cursor.metadata().source_epoch().to_string(),
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        other => return Err(anyhow::anyhow!("unknown cursor kind {other}")),
    };
    if spec.source_epoch().is_none() {
        spec = spec
            .with_source_epoch(source_epoch)
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    }
    if spec.fingerprint().is_none() {
        spec = spec.with_fingerprint(fingerprint);
    }
    if spec.prefix_anchor().is_none() {
        spec = spec.with_prefix_anchor(prefix_anchor);
    }
    if spec.snapshot_boundary().is_none() {
        spec = spec.with_snapshot_boundary(snapshot_boundary);
    }
    Ok(spec)
}

fn enrich_spec_from_persisted_anchor(
    mut spec: SourceSpec,
    anchor: &Value,
) -> anyhow::Result<SourceSpec> {
    let Some(source) = anchor.get("source") else {
        return Ok(spec);
    };
    let source_object = source
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("persisted checkpoint source must be an object"))?;
    if let Some(source_id) = source_object.get("source_id").and_then(Value::as_str)
        && spec.source_id() != source_id
    {
        anyhow::bail!(
            "checkpoint source_id {} does not match request source_id {}",
            source_id,
            spec.source_id()
        );
    }
    if let Some(source_epoch) = source_object.get("source_epoch").and_then(Value::as_str) {
        if let Some(current) = spec.source_epoch()
            && current != source_epoch
        {
            anyhow::bail!(
                "checkpoint source_epoch {source_epoch} does not match request source_epoch {current}"
            );
        }
        if spec.source_epoch().is_none() {
            spec = spec
                .with_source_epoch(source_epoch)
                .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        }
    }
    if let Some(value) = source_object.get("fingerprint") {
        let fingerprint: SourceFingerprint = serde_json::from_value(value.clone())?;
        if let Some(current) = spec.fingerprint()
            && current != &fingerprint
        {
            anyhow::bail!("checkpoint source fingerprint does not match request metadata");
        }
        if spec.fingerprint().is_none() {
            spec = spec.with_fingerprint(fingerprint);
        }
    }
    if let Some(value) = source_object.get("prefix_anchor") {
        let prefix_anchor: SourcePrefixAnchor = serde_json::from_value(value.clone())?;
        if let Some(current) = spec.prefix_anchor()
            && current != &prefix_anchor
        {
            anyhow::bail!("checkpoint source prefix anchor does not match request metadata");
        }
        if spec.prefix_anchor().is_none() {
            spec = spec.with_prefix_anchor(prefix_anchor);
        }
    }
    Ok(spec)
}

fn validate_persisted_source_metadata(spec: &SourceSpec) -> anyhow::Result<()> {
    let fingerprint = spec.fingerprint();
    let prefix_anchor = spec.prefix_anchor();
    if fingerprint.is_none() && prefix_anchor.is_none() {
        anyhow::bail!("persisted checkpoint is missing source fingerprint/prefix anchor");
    }
    let current_length = std::fs::metadata(spec.path())?.len();
    let fingerprint_end = fingerprint.map_or(0, SourceFingerprint::covered_bytes);
    let prefix_end = prefix_anchor.map_or(0, SourcePrefixAnchor::end_offset);
    let required_length = fingerprint_end.max(prefix_end);
    if current_length < required_length {
        anyhow::bail!(
            "source snapshot is shorter than persisted checkpoint: current={current_length}, required={required_length}"
        );
    }

    if let Some(expected) = fingerprint {
        let hash = SourceFixtureHash::from_file(spec.path(), 0, expected.covered_bytes())
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        let observed =
            SourceFingerprint::new(hash.algorithm(), hash.digest(), expected.covered_bytes())
                .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        if &observed != expected {
            anyhow::bail!("source fingerprint changed at the persisted checkpoint boundary");
        }
    }
    if let Some(expected) = prefix_anchor {
        let hash = SourceFixtureHash::from_file(spec.path(), 0, expected.end_offset())
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        let observed =
            SourcePrefixAnchor::new(hash.algorithm(), hash.digest(), expected.end_offset())
                .map_err(|error| anyhow::anyhow!(error.to_string()))?;
        if &observed != expected {
            anyhow::bail!("source prefix anchor changed at the persisted checkpoint boundary");
        }
    }
    Ok(())
}

fn observed_source_metadata(
    spec: &SourceSpec,
    snapshot: SnapshotBoundary,
    prefix_end: u64,
) -> anyhow::Result<(SourceFingerprint, SourcePrefixAnchor)> {
    let snapshot_end = snapshot.byte_length();
    let prefix_end = prefix_end.min(snapshot_end);
    let fingerprint_hash = SourceFixtureHash::from_file(spec.path(), 0, snapshot_end)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let prefix_hash = SourceFixtureHash::from_file(spec.path(), 0, prefix_end)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let fingerprint = SourceFingerprint::new(
        fingerprint_hash.algorithm(),
        fingerprint_hash.digest(),
        snapshot_end,
    )
    .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    let prefix_anchor =
        SourcePrefixAnchor::new(prefix_hash.algorithm(), prefix_hash.digest(), prefix_end)
            .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    Ok((fingerprint, prefix_anchor))
}

fn line_anchor_for_record(
    spec: &SourceSpec,
    record: &SourceRecord,
) -> anyhow::Result<CompleteLineAnchor> {
    let hash = SourceFixtureHash::from_file(spec.path(), record.byte_start, record.byte_end)
        .map_err(|error| anyhow::anyhow!(error.to_string()))?;
    CompleteLineAnchor::new(
        hash.algorithm(),
        hash.digest(),
        record.physical_line_ordinal,
        record.byte_start,
        record.byte_end,
    )
    .map_err(|error| anyhow::anyhow!(error.to_string()))
}

fn build_next_cursor(
    spec: &SourceSpec,
    mode: AnalyzeMode,
    report: &PlannedReadReport,
    records: &[SourceRecord],
    append_last_line: Option<CompleteLineAnchor>,
    append_last_ordinal: Option<u64>,
) -> anyhow::Result<Option<(Value, SourceFingerprint, SourcePrefixAnchor)>> {
    if spec.compression() != SourceCompression::PlainJsonl {
        // A zstd stream is forward-only in the formal source contract; it
        // must not receive a fabricated byte cursor.
        return Ok(None);
    }
    let Some(complete_range) = report.complete_range() else {
        return Ok(None);
    };
    let cursor_range = if matches!(mode, AnalyzeMode::Append | AnalyzeMode::Replay) {
        SourceByteRange::new(0, report.snapshot_boundary().byte_length())?
    } else {
        complete_range
    };
    let last_record = records
        .iter()
        .rev()
        .find(|record| record.byte_end == cursor_range.end());
    let last_line = if cursor_range.is_empty() {
        None
    } else if let Some(record) = last_record {
        Some(line_anchor_for_record(spec, record)?)
    } else {
        append_last_line
    };
    if !cursor_range.is_empty() && last_line.is_none() {
        return Ok(None);
    }
    let last_ordinal = last_record
        .and_then(|record| record.rollout_ordinal)
        .or(append_last_ordinal);
    let (fingerprint, prefix_anchor) =
        observed_source_metadata(spec, report.snapshot_boundary(), cursor_range.end())?;
    let cursor_spec = spec
        .clone()
        .with_fingerprint(fingerprint.clone())
        .with_prefix_anchor(prefix_anchor.clone());
    let cursor = match mode {
        AnalyzeMode::Preview => serde_json::to_value(TailPreviewCursor::from_source(
            &cursor_spec,
            report.snapshot_boundary(),
            cursor_range,
            last_line,
            last_ordinal,
        )?)?,
        AnalyzeMode::Backfill => serde_json::to_value(BackfillCursor::from_source(
            &cursor_spec,
            report.snapshot_boundary(),
            cursor_range,
            last_line,
            last_ordinal,
        )?)?,
        AnalyzeMode::Append | AnalyzeMode::Replay => {
            serde_json::to_value(ForwardAppendCursor::from_source(
                &cursor_spec,
                report.snapshot_boundary(),
                cursor_range,
                last_line,
                last_ordinal,
            )?)?
        }
    };
    Ok(Some((cursor, fingerprint, prefix_anchor)))
}

fn analyze_planned_request(
    backend: &JsonlSourceBackend,
    plan: &SourceReadPlan,
    adapter: &CodexEventAdapter,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
    deadline: Instant,
    completeness: BatchCompleteness,
) -> anyhow::Result<(AnalysisBatch, PlannedReadReport, Vec<SourceRecord>)> {
    let mut records = Vec::new();
    let report = plan.read(backend, &mut |record| {
        check_deadline(cancelled, deadline)?;
        records.push(record);
        Ok(())
    })?;
    check_deadline(cancelled, deadline)?;
    let mut batch = crate::protocol::batch::analyze_records_with_adapter(
        adapter,
        records.clone(),
        profile,
        completeness,
    );
    check_deadline(cancelled, deadline)?;
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
    Ok((batch, report, records))
}

fn check_deadline(cancelled: &AtomicBool, deadline: Instant) -> anyhow::Result<()> {
    if cancelled.load(Ordering::Acquire) {
        anyhow::bail!("source analysis cancelled");
    }
    if Instant::now() >= deadline {
        anyhow::bail!("resource timeout exceeded");
    }
    Ok(())
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
    let (cursor_fingerprint, cursor_prefix_anchor, cursor_snapshot) = match kind {
        "tail_preview" => {
            let cursor = serde_json::from_value::<TailPreviewCursor>(cursor.clone())
                .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
            (
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        "backfill" => {
            let cursor = serde_json::from_value::<BackfillCursor>(cursor.clone())
                .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
            (
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        "forward_append" => {
            let cursor = serde_json::from_value::<ForwardAppendCursor>(cursor.clone())
                .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
            (
                cursor.metadata().fingerprint().clone(),
                cursor.metadata().prefix_anchor().clone(),
                cursor.metadata().snapshot_boundary(),
            )
        }
        _ => unreachable!("cursor kind validated above"),
    };
    let (observed_fingerprint, observed_prefix_anchor) =
        observed_source_metadata(spec, observed_snapshot, cursor_prefix_anchor.end_offset())
            .map_err(|error| AnalyzerProtocolError::InvalidCursor(error.to_string()))?;
    if observed_snapshot.byte_length() == cursor_snapshot.byte_length()
        && observed_fingerprint != cursor_fingerprint
    {
        return Err(AnalyzerProtocolError::InvalidCursor(
            "source fingerprint changed at the checkpoint boundary".to_string(),
        ));
    }
    if observed_prefix_anchor != cursor_prefix_anchor {
        return Err(AnalyzerProtocolError::InvalidCursor(
            "source prefix anchor changed at the checkpoint boundary".to_string(),
        ));
    }
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
    fn analyze_request_requires_explicit_source_identity() {
        let request = AnalyzeRequest {
            header: ProtocolHeader::new(MessageType::Analyze, "req-1"),
            conversation_id: "conversation-1".to_string(),
            source_spec: SourceSpecRequest::new("rollout.jsonl"),
            mode: AnalyzeMode::Replay,
            cursor: None,
            persisted_anchor: None,
            known_complete_range: None,
            retention_profile: None,
            replace_previous: false,
            lineage: None,
            discovery: None,
            peer_capabilities: Vec::new(),
            resource_limits: Default::default(),
        };
        assert!(
            request
                .source_spec
                .into_source_spec("conversation-1")
                .is_err()
        );
    }

    #[test]
    fn completeness_serializes_as_stable_snake_case() {
        let encoded = serde_json::to_string(&BatchCompleteness::Canonical).expect("serializes");
        assert_eq!(encoded, "\"canonical\"");
    }
}
