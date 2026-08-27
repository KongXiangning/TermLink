//!
//! Rust-owned 4.5 target wire types.
//!
//! This module is intentionally separate from `protocol::stage4`.  The old
//! wire still serves the legacy entrypoint and its tests; these types describe
//! the migration target and do not import legacy source, replay, retention, or
//! revision fields.

use std::collections::BTreeSet;

use serde::ser::SerializeStruct;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;

use super::target_data::{
    TargetAnalysisBatch, TargetAnalyzerCheckpoint, TargetAnalyzerCursor, TargetDataError,
    TargetSourceByteRange, ensure_required_json_keys, validate_analyzer_cursor_json,
};

pub use super::target_data::TargetCompleteness;

pub const TARGET_PROTOCOL_VERSION: u16 = 1;
pub const TARGET_ANALYZE_CAPABILITY: &str = "analyze_v1";
pub const TARGET_ANALYZE_CAPABILITY_ALIAS: &str = "analyze";
pub const TARGET_CANCEL_CAPABILITY: &str = "cancel";
pub const TARGET_CHECKPOINT_CAPABILITY: &str = "checkpoint";
pub const TARGET_ACK_CAPABILITY: &str = "ack";
pub const TARGET_REPLACEMENT_CAPABILITY: &str = "last_turn_replacement_v1";

pub const TARGET_REQUIRED_CAPABILITIES: [&str; 4] = [
    TARGET_ANALYZE_CAPABILITY,
    TARGET_CANCEL_CAPABILITY,
    TARGET_CHECKPOINT_CAPABILITY,
    TARGET_ACK_CAPABILITY,
];

pub const TARGET_ACK_REJECTION_CODES: [&str; 3] = [
    "batch_validation_failed",
    "batch_scope_conflict",
    "staging_unavailable",
];

// These values keep the target boundary aligned with the already validated
// bounded source reader.  They are deployment limits as well as defaults:
// omitted request fields resolve to these values, while a caller cannot use
// the target wire to silently widen the Rust process budget.
pub const TARGET_DEFAULT_MAX_DECODED_BYTES: u64 = 32 * 1024 * 1024;
pub const TARGET_DEFAULT_MAX_LINE_BYTES: u64 = 512 * 1024;
pub const TARGET_DEFAULT_MAX_SEGMENT_BYTES: u64 = 4 * 1024 * 1024;
pub const TARGET_DEFAULT_TAIL_BYTES: u64 = 2 * 1024 * 1024;
pub const TARGET_DEFAULT_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetMessageType {
    Hello,
    Analyze,
    Cancel,
    Batch,
    Ack,
    Complete,
    Error,
}

impl TargetMessageType {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetRole {
    Node,
    Analyzer,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetAnalyzeMode {
    Preview,
    Backfill,
    Append,
}

impl TargetAnalyzeMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Preview => "preview",
            Self::Backfill => "backfill",
            Self::Append => "append",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetCompleteStatus {
    Ok,
    Completed,
    Partial,
}

impl TargetCompleteStatus {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Ok => "ok",
            Self::Completed => "completed",
            Self::Partial => "partial",
        }
    }
}

impl Serialize for TargetCompleteStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::Ok => Err(serde::ser::Error::custom(
                "legacy target complete status ok is inbound-only",
            )),
            Self::Completed => serializer.serialize_str("completed"),
            Self::Partial => serializer.serialize_str("partial"),
        }
    }
}

impl<'de> Deserialize<'de> for TargetCompleteStatus {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "ok" => Ok(Self::Ok),
            "completed" => Ok(Self::Completed),
            "partial" => Ok(Self::Partial),
            other => Err(serde::de::Error::custom(format!(
                "unsupported target complete status: {other}"
            ))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TargetProtocolError {
    InvalidJson(String),
    MissingField(&'static str),
    EmptyField(&'static str),
    UnsupportedMessageType(String),
    UnsupportedProtocolVersion {
        expected: u16,
        actual: u16,
    },
    MessageTypeMismatch {
        expected: TargetMessageType,
        actual: TargetMessageType,
    },
    InvalidField {
        field: &'static str,
        message: String,
    },
    CapabilityMismatch {
        missing: Vec<String>,
    },
}

impl std::fmt::Display for TargetProtocolError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(message) => {
                write!(formatter, "invalid target protocol JSON: {message}")
            }
            Self::MissingField(field) => {
                write!(formatter, "target protocol field {field} is required")
            }
            Self::EmptyField(field) => write!(formatter, "target protocol field {field} is empty"),
            Self::UnsupportedMessageType(message) => {
                write!(
                    formatter,
                    "unsupported target protocol message type: {message}"
                )
            }
            Self::UnsupportedProtocolVersion { expected, actual } => write!(
                formatter,
                "unsupported target protocol version {actual}; expected {expected}"
            ),
            Self::MessageTypeMismatch { expected, actual } => write!(
                formatter,
                "target message type mismatch: expected {}, got {}",
                expected.as_str(),
                actual.as_str()
            ),
            Self::InvalidField { field, message } => {
                write!(
                    formatter,
                    "invalid target protocol field {field}: {message}"
                )
            }
            Self::CapabilityMismatch { missing } => write!(
                formatter,
                "unsupported_capability: missing {}",
                missing.join(", ")
            ),
        }
    }
}

impl std::error::Error for TargetProtocolError {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetProtocolHeader {
    pub protocol_version: u16,
    pub message_type: TargetMessageType,
    pub request_id: String,
}

impl TargetProtocolHeader {
    pub fn new(message_type: TargetMessageType, request_id: impl Into<String>) -> Self {
        Self {
            protocol_version: TARGET_PROTOCOL_VERSION,
            message_type,
            request_id: request_id.into(),
        }
    }

    pub fn validate(&self, expected: TargetMessageType) -> Result<(), TargetProtocolError> {
        if self.protocol_version != TARGET_PROTOCOL_VERSION {
            return Err(TargetProtocolError::UnsupportedProtocolVersion {
                expected: TARGET_PROTOCOL_VERSION,
                actual: self.protocol_version,
            });
        }
        if self.message_type != expected {
            return Err(TargetProtocolError::MessageTypeMismatch {
                expected,
                actual: self.message_type,
            });
        }
        ensure_non_empty(&self.request_id, "request_id")
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetNodeHello {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub role: TargetRole,
    pub capabilities: Vec<String>,
}

impl TargetNodeHello {
    pub fn new(
        request_id: impl Into<String>,
        capabilities: impl IntoIterator<Item = impl Into<String>>,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Hello, request_id),
            role: TargetRole::Node,
            capabilities: capabilities.into_iter().map(Into::into).collect(),
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Hello)?;
        if self.role != TargetRole::Node {
            return Err(TargetProtocolError::InvalidField {
                field: "role",
                message: "Node hello must use role=node".to_string(),
            });
        }
        validate_capability_values(&self.capabilities)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetAnalyzerHello {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub role: TargetRole,
    pub analyzer_version: String,
    pub capabilities: Vec<String>,
    pub parser_backend: String,
    pub compatibility_layer_version: String,
}

impl TargetAnalyzerHello {
    pub fn new(
        request_id: impl Into<String>,
        analyzer_version: impl Into<String>,
        capabilities: impl IntoIterator<Item = impl Into<String>>,
        parser_backend: impl Into<String>,
        compatibility_layer_version: impl Into<String>,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Hello, request_id),
            role: TargetRole::Analyzer,
            analyzer_version: analyzer_version.into(),
            capabilities: capabilities.into_iter().map(Into::into).collect(),
            parser_backend: parser_backend.into(),
            compatibility_layer_version: compatibility_layer_version.into(),
        }
    }

    pub fn respond_to(
        node_hello: &TargetNodeHello,
        analyzer_version: impl Into<String>,
        capabilities: impl IntoIterator<Item = impl Into<String>>,
        parser_backend: impl Into<String>,
        compatibility_layer_version: impl Into<String>,
    ) -> Self {
        Self::new(
            node_hello.header.request_id.clone(),
            analyzer_version,
            capabilities,
            parser_backend,
            compatibility_layer_version,
        )
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Hello)?;
        if self.role != TargetRole::Analyzer {
            return Err(TargetProtocolError::InvalidField {
                field: "role",
                message: "analyzer hello must use role=analyzer".to_string(),
            });
        }
        ensure_non_empty(&self.analyzer_version, "analyzer_version")?;
        ensure_non_empty(&self.parser_backend, "parser_backend")?;
        ensure_non_empty(
            &self.compatibility_layer_version,
            "compatibility_layer_version",
        )?;
        validate_capability_values(&self.capabilities)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetCapabilitySet {
    capabilities: Vec<String>,
}

impl TargetCapabilitySet {
    pub fn from_capabilities(capabilities: &[String]) -> Result<Self, TargetProtocolError> {
        Ok(Self {
            capabilities: canonicalize_capabilities(capabilities)?,
        })
    }

    pub fn capabilities(&self) -> &[String] {
        &self.capabilities
    }

    pub fn supports(&self, capability: &str) -> bool {
        let canonical = canonical_capability(capability);
        self.capabilities.iter().any(|item| item == canonical)
    }
}

pub fn canonicalize_capabilities(
    capabilities: &[String],
) -> Result<Vec<String>, TargetProtocolError> {
    validate_capability_values(capabilities)?;

    let mut unique = BTreeSet::new();
    for capability in capabilities {
        unique.insert(canonical_capability(capability).to_string());
    }
    Ok(unique.into_iter().collect())
}

pub fn negotiate_capabilities(
    node_capabilities: &[String],
    analyzer_capabilities: &[String],
) -> Result<TargetCapabilitySet, TargetProtocolError> {
    let node = TargetCapabilitySet::from_capabilities(node_capabilities)?;
    let analyzer = TargetCapabilitySet::from_capabilities(analyzer_capabilities)?;
    let analyzer_capabilities: BTreeSet<&str> =
        analyzer.capabilities.iter().map(String::as_str).collect();
    let intersection = node
        .capabilities
        .iter()
        .filter(|capability| analyzer_capabilities.contains(capability.as_str()))
        .cloned()
        .collect::<Vec<_>>();
    let missing = TARGET_REQUIRED_CAPABILITIES
        .iter()
        .filter(|required| !intersection.iter().any(|item| item == *required))
        .map(|required| (*required).to_string())
        .collect::<Vec<_>>();
    if !missing.is_empty() {
        return Err(TargetProtocolError::CapabilityMismatch { missing });
    }
    Ok(TargetCapabilitySet {
        capabilities: intersection,
    })
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TargetResourceLimits {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_decoded_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_line_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_segment_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tail_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,
}

impl TargetResourceLimits {
    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        if let (Some(max_line_bytes), Some(max_segment_bytes)) =
            (self.max_line_bytes, self.max_segment_bytes)
            && max_line_bytes > max_segment_bytes
        {
            return Err(TargetProtocolError::InvalidField {
                field: "resource_limits.max_line_bytes",
                message: "must not exceed max_segment_bytes".to_string(),
            });
        }
        Ok(())
    }

    /// Validate limits that are meaningful only after the target process has
    /// resolved deployment defaults.  Wire deserialization intentionally uses
    /// [`Self::validate`] first so the runtime can report this class as the
    /// protocol-level `invalid_resource_limits` error instead of treating it
    /// as malformed JSON.
    pub(crate) fn validate_for_runtime(&self) -> Result<(), TargetProtocolError> {
        self.validate()?;
        let resolved = self.resolve();
        if resolved.max_line_bytes > resolved.max_segment_bytes {
            return Err(TargetProtocolError::InvalidField {
                field: "resource_limits.max_line_bytes",
                message: "effective max_line_bytes must not exceed max_segment_bytes".to_string(),
            });
        }

        let bounded = [
            (
                "resource_limits.max_decoded_bytes",
                resolved.max_decoded_bytes,
                TARGET_DEFAULT_MAX_DECODED_BYTES,
            ),
            (
                "resource_limits.max_line_bytes",
                resolved.max_line_bytes,
                TARGET_DEFAULT_MAX_LINE_BYTES,
            ),
            (
                "resource_limits.max_segment_bytes",
                resolved.max_segment_bytes,
                TARGET_DEFAULT_MAX_SEGMENT_BYTES,
            ),
            (
                "resource_limits.tail_bytes",
                resolved.tail_bytes,
                TARGET_DEFAULT_TAIL_BYTES,
            ),
            (
                "resource_limits.timeout_ms",
                resolved.timeout_ms,
                TARGET_DEFAULT_TIMEOUT_MS,
            ),
        ];
        if let Some((field, _value, maximum)) = bounded
            .into_iter()
            .find(|(_, value, maximum)| *value > *maximum)
        {
            return Err(TargetProtocolError::InvalidField {
                field,
                message: format!("must not exceed server maximum {maximum}"),
            });
        }
        Ok(())
    }

    pub(crate) fn resolve(&self) -> TargetResolvedResourceLimits {
        TargetResolvedResourceLimits {
            max_decoded_bytes: self
                .max_decoded_bytes
                .unwrap_or(TARGET_DEFAULT_MAX_DECODED_BYTES),
            max_line_bytes: self.max_line_bytes.unwrap_or(TARGET_DEFAULT_MAX_LINE_BYTES),
            max_segment_bytes: self
                .max_segment_bytes
                .unwrap_or(TARGET_DEFAULT_MAX_SEGMENT_BYTES),
            tail_bytes: self.tail_bytes.unwrap_or(TARGET_DEFAULT_TAIL_BYTES),
            timeout_ms: self.timeout_ms.unwrap_or(TARGET_DEFAULT_TIMEOUT_MS),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct TargetResolvedResourceLimits {
    pub max_decoded_bytes: u64,
    pub max_line_bytes: u64,
    pub max_segment_bytes: u64,
    pub tail_bytes: u64,
    pub timeout_ms: u64,
}

impl Default for TargetResourceLimits {
    fn default() -> Self {
        Self {
            max_decoded_bytes: None,
            max_line_bytes: None,
            max_segment_bytes: None,
            tail_bytes: None,
            timeout_ms: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetRecovery {
    pub segment_id: String,
    pub batch_id: String,
}

impl TargetRecovery {
    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        ensure_non_empty(&self.segment_id, "recovery.segment_id")?;
        ensure_non_empty(&self.batch_id, "recovery.batch_id")
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TargetAnalyzeRequest {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub job_id: String,
    pub conversation_id: String,
    pub mode: TargetAnalyzeMode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor: Option<TargetAnalyzerCursor>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub persisted_anchor: Option<TargetAnalyzerCheckpoint>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recovery: Option<TargetRecovery>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub known_complete_range: Option<TargetSourceByteRange>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_limits: Option<TargetResourceLimits>,
}

#[derive(Debug, Deserialize)]
struct TargetAnalyzeRequestWire {
    #[serde(flatten)]
    header: TargetProtocolHeader,
    job_id: String,
    conversation_id: String,
    mode: TargetAnalyzeMode,
    #[serde(default)]
    cursor: Option<TargetAnalyzerCursor>,
    #[serde(default)]
    persisted_anchor: Option<TargetAnalyzerCheckpoint>,
    #[serde(default)]
    recovery: Option<TargetRecovery>,
    #[serde(default)]
    known_complete_range: Option<TargetSourceByteRange>,
    #[serde(default)]
    resource_limits: Option<TargetResourceLimits>,
}

impl<'de> Deserialize<'de> for TargetAnalyzeRequest {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        let wire = serde_json::from_value::<TargetAnalyzeRequestWire>(value)
            .map_err(serde::de::Error::custom)?;
        let request = Self {
            header: wire.header,
            job_id: wire.job_id,
            conversation_id: wire.conversation_id,
            mode: wire.mode,
            cursor: wire.cursor,
            persisted_anchor: wire.persisted_anchor,
            recovery: wire.recovery,
            known_complete_range: wire.known_complete_range,
            resource_limits: wire.resource_limits,
        };
        request.validate().map_err(serde::de::Error::custom)?;
        Ok(request)
    }
}

impl TargetAnalyzeRequest {
    pub fn new(
        request_id: impl Into<String>,
        job_id: impl Into<String>,
        conversation_id: impl Into<String>,
        mode: TargetAnalyzeMode,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Analyze, request_id),
            job_id: job_id.into(),
            conversation_id: conversation_id.into(),
            mode,
            cursor: None,
            persisted_anchor: None,
            recovery: None,
            known_complete_range: None,
            resource_limits: None,
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Analyze)?;
        ensure_non_empty(&self.job_id, "job_id")?;
        ensure_non_empty(&self.conversation_id, "conversation_id")?;
        if let Some(cursor) = &self.cursor {
            cursor.validate().map_err(map_data_error)?;
        }
        if let Some(checkpoint) = &self.persisted_anchor {
            checkpoint.validate().map_err(map_data_error)?;
            if checkpoint.conversation_id != self.conversation_id {
                return Err(TargetProtocolError::InvalidField {
                    field: "persisted_anchor.conversation_id",
                    message: "must match analyze conversation_id".to_string(),
                });
            }
            if checkpoint.cursor.as_ref() != self.cursor.as_ref() {
                return Err(TargetProtocolError::InvalidField {
                    field: "cursor",
                    message: "must match persisted_anchor.cursor".to_string(),
                });
            }
        }
        if let Some(range) = self.known_complete_range {
            range
                .validate("known_complete_range")
                .map_err(map_data_error)?;
        }
        if let Some(recovery) = &self.recovery {
            recovery.validate()?;
        }
        if let Some(resource_limits) = &self.resource_limits {
            resource_limits.validate()?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCancelMessage {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub reason: String,
}

impl TargetCancelMessage {
    pub fn new(request_id: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Cancel, request_id),
            reason: reason.into(),
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Cancel)?;
        ensure_non_empty(&self.reason, "reason")
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetAckMessage {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub job_id: String,
    pub segment_id: String,
    pub batch_id: String,
    pub accepted: bool,
    pub persisted: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl TargetAckMessage {
    pub fn new(
        request_id: impl Into<String>,
        job_id: impl Into<String>,
        segment_id: impl Into<String>,
        batch_id: impl Into<String>,
        accepted: bool,
        persisted: bool,
        error: Option<impl Into<String>>,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Ack, request_id),
            job_id: job_id.into(),
            segment_id: segment_id.into(),
            batch_id: batch_id.into(),
            accepted,
            persisted,
            error: error.map(Into::into),
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Ack)?;
        ensure_non_empty(&self.job_id, "job_id")?;
        ensure_non_empty(&self.segment_id, "segment_id")?;
        ensure_non_empty(&self.batch_id, "batch_id")?;

        match (self.accepted, self.persisted, self.error.as_deref()) {
            (true, true, None) => Ok(()),
            (true, true, Some(_)) => Err(TargetProtocolError::InvalidField {
                field: "error",
                message: "positive ACK must not carry an error".to_string(),
            }),
            (false, false, Some(error)) if is_ack_rejection_code(error) => Ok(()),
            (false, false, Some(_)) => Err(TargetProtocolError::InvalidField {
                field: "error",
                message: "negative ACK must use a stable rejection code".to_string(),
            }),
            (false, false, None) => Err(TargetProtocolError::MissingField("error")),
            (_, _, _) => Err(TargetProtocolError::InvalidField {
                field: "accepted/persisted",
                message: "ACK must be both true or both false".to_string(),
            }),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct TargetBatchMessage {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub job_id: String,
    pub segment_id: String,
    pub batch_id: String,
    pub payload: TargetAnalysisBatch,
}

impl TargetBatchMessage {
    pub fn new(
        request_id: impl Into<String>,
        job_id: impl Into<String>,
        segment_id: impl Into<String>,
        batch_id: impl Into<String>,
        payload: TargetAnalysisBatch,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Batch, request_id),
            job_id: job_id.into(),
            segment_id: segment_id.into(),
            batch_id: batch_id.into(),
            payload,
        }
    }

    pub fn from_payload_value(
        request_id: impl Into<String>,
        job_id: impl Into<String>,
        segment_id: impl Into<String>,
        batch_id: impl Into<String>,
        payload: Value,
    ) -> Result<Self, TargetProtocolError> {
        let payload = serde_json::from_value::<TargetAnalysisBatch>(payload)
            .map_err(|error| TargetProtocolError::InvalidJson(error.to_string()))?;
        let message = Self::new(request_id, job_id, segment_id, batch_id, payload);
        message.validate()?;
        Ok(message)
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Batch)?;
        ensure_non_empty(&self.job_id, "job_id")?;
        ensure_non_empty(&self.segment_id, "segment_id")?;
        ensure_non_empty(&self.batch_id, "batch_id")?;
        self.payload.validate().map_err(map_data_error)
    }
}

impl Serialize for TargetBatchMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.validate().map_err(serde::ser::Error::custom)?;
        let mut state = serializer.serialize_struct("TargetBatchMessage", 7)?;
        state.serialize_field("protocol_version", &self.header.protocol_version)?;
        state.serialize_field("message_type", &self.header.message_type)?;
        state.serialize_field("request_id", &self.header.request_id)?;
        state.serialize_field("job_id", &self.job_id)?;
        state.serialize_field("segment_id", &self.segment_id)?;
        state.serialize_field("batch_id", &self.batch_id)?;
        state.serialize_field("payload", &self.payload)?;
        state.end()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct TargetCompleteMessage {
    pub header: TargetProtocolHeader,
    pub job_id: String,
    pub status: TargetCompleteStatus,
    pub completeness: TargetCompleteness,
    /// The key is mandatory on the wire; JSON null means no resumable cursor.
    pub next_cursor: Option<TargetAnalyzerCursor>,
    pub checkpoint: TargetAnalyzerCheckpoint,
}

#[derive(Debug, Deserialize)]
struct TargetCompleteMessageWire {
    #[serde(flatten)]
    header: TargetProtocolHeader,
    job_id: String,
    status: TargetCompleteStatus,
    completeness: TargetCompleteness,
    #[serde(default)]
    next_cursor: Option<TargetAnalyzerCursor>,
    checkpoint: TargetAnalyzerCheckpoint,
}

impl<'de> Deserialize<'de> for TargetCompleteMessage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        ensure_required_json_keys(&value, "complete", &["next_cursor"])
            .map_err(serde::de::Error::custom)?;
        if let Some(cursor) = value.get("next_cursor") {
            if !cursor.is_null() {
                validate_analyzer_cursor_json(cursor, "complete.next_cursor")
                    .map_err(serde::de::Error::custom)?;
            }
        }
        let wire = serde_json::from_value::<TargetCompleteMessageWire>(value)
            .map_err(serde::de::Error::custom)?;
        Ok(Self {
            header: wire.header,
            job_id: wire.job_id,
            status: wire.status,
            completeness: wire.completeness,
            next_cursor: wire.next_cursor,
            checkpoint: wire.checkpoint,
        })
    }
}

impl TargetCompleteMessage {
    pub fn new(
        request_id: impl Into<String>,
        job_id: impl Into<String>,
        status: TargetCompleteStatus,
        completeness: TargetCompleteness,
        next_cursor: Option<TargetAnalyzerCursor>,
        checkpoint: TargetAnalyzerCheckpoint,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Complete, request_id),
            job_id: job_id.into(),
            status,
            completeness,
            next_cursor,
            checkpoint,
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Complete)?;
        ensure_non_empty(&self.job_id, "job_id")?;
        validate_complete_combination(self.status, self.completeness)?;
        if let Some(cursor) = &self.next_cursor {
            cursor.validate().map_err(map_data_error)?;
        }
        self.checkpoint.validate().map_err(map_data_error)?;
        if self.checkpoint.job_id != self.job_id {
            return Err(TargetProtocolError::InvalidField {
                field: "checkpoint.job_id",
                message: "must match complete job_id".to_string(),
            });
        }
        if self.checkpoint.request_id != self.header.request_id {
            return Err(TargetProtocolError::InvalidField {
                field: "checkpoint.request_id",
                message: "must match complete request_id".to_string(),
            });
        }
        if self.checkpoint.completeness != self.completeness {
            return Err(TargetProtocolError::InvalidField {
                field: "checkpoint.completeness",
                message: "must match complete completeness".to_string(),
            });
        }
        if self.next_cursor != self.checkpoint.cursor {
            return Err(TargetProtocolError::InvalidField {
                field: "next_cursor",
                message: "must match checkpoint.cursor".to_string(),
            });
        }
        Ok(())
    }

    pub fn validate_for_output(&self) -> Result<(), TargetProtocolError> {
        self.validate()?;
        if self.status == TargetCompleteStatus::Ok {
            return Err(TargetProtocolError::InvalidField {
                field: "status",
                message: "legacy status ok is accepted only for inbound compatibility".to_string(),
            });
        }
        Ok(())
    }
}

impl Serialize for TargetCompleteMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.validate_for_output()
            .map_err(serde::ser::Error::custom)?;
        let mut state = serializer.serialize_struct("TargetCompleteMessage", 8)?;
        state.serialize_field("protocol_version", &self.header.protocol_version)?;
        state.serialize_field("message_type", &self.header.message_type)?;
        state.serialize_field("request_id", &self.header.request_id)?;
        state.serialize_field("job_id", &self.job_id)?;
        state.serialize_field("status", &self.status)?;
        state.serialize_field("completeness", &self.completeness)?;
        state.serialize_field("next_cursor", &self.next_cursor)?;
        state.serialize_field("checkpoint", &self.checkpoint)?;
        state.end()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TargetErrorMessage {
    #[serde(flatten)]
    pub header: TargetProtocolHeader,
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub fatal: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

impl TargetErrorMessage {
    pub fn new(
        request_id: impl Into<String>,
        code: impl Into<String>,
        message: impl Into<String>,
        retryable: bool,
        fatal: bool,
    ) -> Self {
        Self {
            header: TargetProtocolHeader::new(TargetMessageType::Error, request_id),
            code: code.into(),
            message: message.into(),
            retryable,
            fatal,
            details: None,
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        self.header.validate(TargetMessageType::Error)?;
        ensure_non_empty(&self.code, "code")?;
        ensure_non_empty(&self.message, "message")?;
        if let Some(details) = &self.details {
            if !details.is_null() && !details.is_object() {
                return Err(TargetProtocolError::InvalidField {
                    field: "details",
                    message: "must be an object or null".to_string(),
                });
            }
        }
        if self.code == "batch_rejected" {
            let details = self
                .details
                .as_ref()
                .and_then(Value::as_object)
                .ok_or_else(|| TargetProtocolError::InvalidField {
                    field: "details",
                    message: "batch_rejected requires an object with rejection_code".to_string(),
                })?;
            let rejection_code = details
                .get("rejection_code")
                .and_then(Value::as_str)
                .ok_or(TargetProtocolError::MissingField("details.rejection_code"))?;
            if !is_ack_rejection_code(rejection_code) {
                return Err(TargetProtocolError::InvalidField {
                    field: "details.rejection_code",
                    message: "unknown ACK rejection code".to_string(),
                });
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum TargetMessage {
    NodeHello(TargetNodeHello),
    AnalyzerHello(TargetAnalyzerHello),
    Analyze(TargetAnalyzeRequest),
    Cancel(TargetCancelMessage),
    Batch(TargetBatchMessage),
    Ack(TargetAckMessage),
    Complete(TargetCompleteMessage),
    Error(TargetErrorMessage),
}

impl TargetMessage {
    pub fn message_type(&self) -> TargetMessageType {
        match self {
            Self::NodeHello(_) | Self::AnalyzerHello(_) => TargetMessageType::Hello,
            Self::Analyze(_) => TargetMessageType::Analyze,
            Self::Cancel(_) => TargetMessageType::Cancel,
            Self::Batch(_) => TargetMessageType::Batch,
            Self::Ack(_) => TargetMessageType::Ack,
            Self::Complete(_) => TargetMessageType::Complete,
            Self::Error(_) => TargetMessageType::Error,
        }
    }

    pub fn request_id(&self) -> &str {
        match self {
            Self::NodeHello(message) => &message.header.request_id,
            Self::AnalyzerHello(message) => &message.header.request_id,
            Self::Analyze(message) => &message.header.request_id,
            Self::Cancel(message) => &message.header.request_id,
            Self::Batch(message) => &message.header.request_id,
            Self::Ack(message) => &message.header.request_id,
            Self::Complete(message) => &message.header.request_id,
            Self::Error(message) => &message.header.request_id,
        }
    }

    pub fn validate(&self) -> Result<(), TargetProtocolError> {
        match self {
            Self::NodeHello(message) => message.validate(),
            Self::AnalyzerHello(message) => message.validate(),
            Self::Analyze(message) => message.validate(),
            Self::Cancel(message) => message.validate(),
            Self::Batch(message) => message.validate(),
            Self::Ack(message) => message.validate(),
            Self::Complete(message) => message.validate(),
            Self::Error(message) => message.validate(),
        }
    }

    pub fn validate_for_output(&self) -> Result<(), TargetProtocolError> {
        match self {
            Self::Complete(message) => message.validate_for_output(),
            _ => self.validate(),
        }
    }

    pub fn parse_line(line: &str) -> Result<Self, TargetProtocolError> {
        let message = serde_json::from_str::<Self>(line)
            .map_err(|error| TargetProtocolError::InvalidJson(error.to_string()))?;
        message.validate()?;
        Ok(message)
    }

    pub fn to_json_line(&self) -> Result<String, TargetProtocolError> {
        self.validate_for_output()?;
        serde_json::to_string(self)
            .map_err(|error| TargetProtocolError::InvalidJson(error.to_string()))
    }
}

impl Serialize for TargetMessage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::NodeHello(message) => message.serialize(serializer),
            Self::AnalyzerHello(message) => message.serialize(serializer),
            Self::Analyze(message) => message.serialize(serializer),
            Self::Cancel(message) => message.serialize(serializer),
            Self::Batch(message) => message.serialize(serializer),
            Self::Ack(message) => message.serialize(serializer),
            Self::Complete(message) => {
                message
                    .validate_for_output()
                    .map_err(serde::ser::Error::custom)?;
                message.serialize(serializer)
            }
            Self::Error(message) => message.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for TargetMessage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        let message_type = value
            .get("message_type")
            .and_then(Value::as_str)
            .ok_or_else(|| serde::de::Error::custom("target protocol message_type is required"))?;
        match message_type {
            "hello" => match value.get("role").and_then(Value::as_str) {
                Some("node") => serde_json::from_value::<TargetNodeHello>(value)
                    .map(Self::NodeHello)
                    .map_err(serde::de::Error::custom),
                Some("analyzer") => serde_json::from_value::<TargetAnalyzerHello>(value)
                    .map(Self::AnalyzerHello)
                    .map_err(serde::de::Error::custom),
                Some(role) => Err(serde::de::Error::custom(format!(
                    "unsupported target hello role: {role}"
                ))),
                None => Err(serde::de::Error::custom(TargetProtocolError::MissingField(
                    "role",
                ))),
            },
            "analyze" => serde_json::from_value::<TargetAnalyzeRequest>(value)
                .map(Self::Analyze)
                .map_err(serde::de::Error::custom),
            "cancel" => serde_json::from_value::<TargetCancelMessage>(value)
                .map(Self::Cancel)
                .map_err(serde::de::Error::custom),
            "batch" => serde_json::from_value::<TargetBatchMessage>(value)
                .map(Self::Batch)
                .map_err(serde::de::Error::custom),
            "ack" => serde_json::from_value::<TargetAckMessage>(value)
                .map(Self::Ack)
                .map_err(serde::de::Error::custom),
            "complete" => serde_json::from_value::<TargetCompleteMessage>(value)
                .map(Self::Complete)
                .map_err(serde::de::Error::custom),
            "error" => serde_json::from_value::<TargetErrorMessage>(value)
                .map(Self::Error)
                .map_err(serde::de::Error::custom),
            other => Err(serde::de::Error::custom(
                TargetProtocolError::UnsupportedMessageType(other.to_string()),
            )),
        }
    }
}

fn canonical_capability(capability: &str) -> &str {
    if capability == TARGET_ANALYZE_CAPABILITY_ALIAS {
        TARGET_ANALYZE_CAPABILITY
    } else {
        capability
    }
}

fn validate_capability_values(capabilities: &[String]) -> Result<(), TargetProtocolError> {
    for capability in capabilities {
        if capability.trim().is_empty() {
            return Err(TargetProtocolError::EmptyField("capabilities[]"));
        }
        if capability.trim() != capability {
            return Err(TargetProtocolError::InvalidField {
                field: "capabilities[]",
                message: "capability names must not contain surrounding whitespace".to_string(),
            });
        }
    }
    Ok(())
}

fn ensure_non_empty(value: &str, field: &'static str) -> Result<(), TargetProtocolError> {
    if value.trim().is_empty() {
        return Err(TargetProtocolError::EmptyField(field));
    }
    Ok(())
}

fn map_data_error(error: TargetDataError) -> TargetProtocolError {
    TargetProtocolError::InvalidField {
        field: error.field,
        message: error.message,
    }
}

fn validate_complete_combination(
    status: TargetCompleteStatus,
    completeness: TargetCompleteness,
) -> Result<(), TargetProtocolError> {
    let valid = matches!(
        (status, completeness),
        (
            TargetCompleteStatus::Completed,
            TargetCompleteness::Canonical
        ) | (TargetCompleteStatus::Partial, TargetCompleteness::Partial)
            | (
                TargetCompleteStatus::Partial,
                TargetCompleteness::Provisional
            )
            | (TargetCompleteStatus::Ok, TargetCompleteness::Canonical)
    );
    if valid {
        Ok(())
    } else {
        Err(TargetProtocolError::InvalidField {
            field: "status/completeness",
            message: "invalid 4.5 complete status combination".to_string(),
        })
    }
}

fn is_ack_rejection_code(code: &str) -> bool {
    TARGET_ACK_REJECTION_CODES.contains(&code)
}
