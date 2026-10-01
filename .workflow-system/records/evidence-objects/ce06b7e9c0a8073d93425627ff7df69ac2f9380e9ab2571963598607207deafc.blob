//! Persisted analyzer checkpoint metadata.
//!
//! A checkpoint is a recovery claim, not a best-effort hint.  It therefore
//! carries the source identity and reader boundary needed to reject a replay
//! against a different or truncated source.

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::protocol::ParserProvenance;
use crate::protocol::stage4::{BatchCompleteness, BatchMessage};
use crate::source::{SourceByteRange, SourceCursorKind};

pub const ANALYZER_CHECKPOINT_SCHEMA_VERSION: u16 = 1;
pub const CHECKPOINT_READER_BACKEND: &str = "termlink-codex-rollout-analyzer";
pub const CHECKPOINT_READER_VERSION: &str = "stage4-v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckpointSource {
    pub source_id: String,
    pub source_epoch: String,
    #[serde(default)]
    pub fingerprint: Option<crate::source::SourceFingerprint>,
    #[serde(default)]
    pub prefix_anchor: Option<crate::source::SourcePrefixAnchor>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckpointReader {
    pub backend: String,
    pub version: String,
    pub source_kind: crate::source::SourceKind,
    pub compression: crate::source::SourceCompression,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckpointSegment {
    #[serde(default)]
    pub source_range: Option<SourceByteRange>,
    #[serde(default)]
    pub physical_line_start: Option<u64>,
    #[serde(default)]
    pub physical_line_end: Option<u64>,
    #[serde(default)]
    pub rollout_ordinal: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalyzerCheckpoint {
    pub schema_version: u16,
    pub request_id: String,
    pub conversation_id: String,
    pub source: CheckpointSource,
    pub reader: CheckpointReader,
    #[serde(default)]
    pub wire_profile: Option<ParserProvenance>,
    #[serde(default)]
    pub cursor_kind: Option<SourceCursorKind>,
    #[serde(default)]
    pub cursor: Option<Value>,
    pub segment: CheckpointSegment,
    /// Reducer state is intentionally opaque at this boundary.  A future
    /// runtime may persist a versioned state payload without exposing native
    /// Codex types to Node.
    #[serde(default)]
    pub reducer_state: Option<Value>,
    #[serde(default)]
    pub projection_watermark: Option<String>,
    pub completeness: BatchCompleteness,
    /// Optional session-lineage recovery evidence. Older checkpoints omit
    /// this field and remain valid because the source layer can rediscover the
    /// bounded catalog from `sessions_root`.
    #[serde(default)]
    pub lineage_checkpoint: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CheckpointError {
    InvalidSchemaVersion { expected: u16, actual: u16 },
    MissingField(&'static str),
    EmptyField(&'static str),
    InvalidState(&'static str),
    InvalidRange,
    CursorKindMissingPayload,
}

impl std::fmt::Display for CheckpointError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidSchemaVersion { expected, actual } => {
                write!(
                    formatter,
                    "checkpoint schema {actual} is unsupported; expected {expected}"
                )
            }
            Self::MissingField(field) => write!(formatter, "checkpoint field {field} is required"),
            Self::EmptyField(field) => write!(formatter, "checkpoint field {field} is empty"),
            Self::InvalidState(field) => write!(formatter, "checkpoint field {field} is invalid"),
            Self::InvalidRange => write!(formatter, "checkpoint source range is invalid"),
            Self::CursorKindMissingPayload => {
                write!(
                    formatter,
                    "checkpoint cursor kind requires a cursor payload"
                )
            }
        }
    }
}

impl std::error::Error for CheckpointError {}

impl AnalyzerCheckpoint {
    pub fn from_batch(
        request_id: &str,
        conversation_id: &str,
        batch: &BatchMessage,
    ) -> Result<Self, CheckpointError> {
        let checkpoint = Self {
            schema_version: ANALYZER_CHECKPOINT_SCHEMA_VERSION,
            request_id: request_id.to_string(),
            conversation_id: conversation_id.to_string(),
            source: CheckpointSource {
                source_id: batch.source_id.clone(),
                source_epoch: batch.source_epoch.clone(),
                fingerprint: batch.source_fingerprint.clone(),
                prefix_anchor: batch.source_prefix_anchor.clone(),
            },
            reader: CheckpointReader {
                backend: CHECKPOINT_READER_BACKEND.to_string(),
                version: CHECKPOINT_READER_VERSION.to_string(),
                source_kind: crate::source::SourceKind::Rollout,
                compression: crate::source::SourceCompression::PlainJsonl,
            },
            wire_profile: Some(batch.parser_provenance.clone()),
            cursor_kind: batch
                .next_cursor
                .as_ref()
                .and_then(|value| value.get("cursor_kind"))
                .and_then(Value::as_str)
                .and_then(parse_cursor_kind),
            cursor: batch.next_cursor.clone(),
            segment: CheckpointSegment {
                source_range: batch.source_range,
                physical_line_start: None,
                physical_line_end: None,
                rollout_ordinal: None,
            },
            reducer_state: batch.reducer_state.clone(),
            projection_watermark: Some(batch.batch_id.clone()),
            completeness: batch.completeness,
            lineage_checkpoint: batch.lineage_checkpoint.clone(),
        };
        checkpoint.validate()?;
        Ok(checkpoint)
    }

    pub fn validate(&self) -> Result<(), CheckpointError> {
        if self.schema_version != ANALYZER_CHECKPOINT_SCHEMA_VERSION {
            return Err(CheckpointError::InvalidSchemaVersion {
                expected: ANALYZER_CHECKPOINT_SCHEMA_VERSION,
                actual: self.schema_version,
            });
        }
        if self.request_id.trim().is_empty() {
            return Err(CheckpointError::EmptyField("request_id"));
        }
        if self.conversation_id.trim().is_empty() {
            return Err(CheckpointError::EmptyField("conversation_id"));
        }
        if self.source.source_id.trim().is_empty() {
            return Err(CheckpointError::EmptyField("source.source_id"));
        }
        if self.source.source_epoch.trim().is_empty() {
            return Err(CheckpointError::EmptyField("source.source_epoch"));
        }
        if self.source.source_epoch.trim() == "unbound" {
            return Err(CheckpointError::InvalidState("source.source_epoch"));
        }
        let fingerprint = self
            .source
            .fingerprint
            .as_ref()
            .ok_or(CheckpointError::MissingField("source.fingerprint"))?;
        if fingerprint.algorithm().trim().is_empty() {
            return Err(CheckpointError::EmptyField("source.fingerprint.algorithm"));
        }
        if fingerprint.digest().trim().is_empty() {
            return Err(CheckpointError::EmptyField("source.fingerprint.digest"));
        }
        let prefix_anchor = self
            .source
            .prefix_anchor
            .as_ref()
            .ok_or(CheckpointError::MissingField("source.prefix_anchor"))?;
        if prefix_anchor.algorithm().trim().is_empty() {
            return Err(CheckpointError::EmptyField(
                "source.prefix_anchor.algorithm",
            ));
        }
        if prefix_anchor.digest().trim().is_empty() {
            return Err(CheckpointError::EmptyField("source.prefix_anchor.digest"));
        }
        if self.reader.backend.trim().is_empty() {
            return Err(CheckpointError::EmptyField("reader.backend"));
        }
        if self.reader.version.trim().is_empty() {
            return Err(CheckpointError::EmptyField("reader.version"));
        }
        let wire_profile = self
            .wire_profile
            .as_ref()
            .ok_or(CheckpointError::MissingField("wire_profile"))?;
        if wire_profile.parser_backend.trim().is_empty() {
            return Err(CheckpointError::EmptyField("wire_profile.parser_backend"));
        }
        if wire_profile.wire_source_revision.trim().is_empty() {
            return Err(CheckpointError::EmptyField(
                "wire_profile.wire_source_revision",
            ));
        }
        if self
            .reducer_state
            .as_ref()
            .is_none_or(|value| !value.is_object())
        {
            return Err(CheckpointError::InvalidState("reducer_state"));
        }
        if self
            .projection_watermark
            .as_deref()
            .map_or(true, |value| value.trim().is_empty())
        {
            return Err(CheckpointError::MissingField("projection_watermark"));
        }
        if let Some(range) = self.segment.source_range
            && range.start() > range.end()
        {
            return Err(CheckpointError::InvalidRange);
        }
        if self.cursor_kind.is_some() && self.cursor.is_none() {
            return Err(CheckpointError::CursorKindMissingPayload);
        }
        if self.cursor_kind.is_none() && self.cursor.is_some() {
            return Err(CheckpointError::CursorKindMissingPayload);
        }
        Ok(())
    }

    pub fn is_canonical(&self) -> bool {
        self.completeness == BatchCompleteness::Canonical
    }
}

fn parse_cursor_kind(value: &str) -> Option<SourceCursorKind> {
    match value {
        "tail_preview" => Some(SourceCursorKind::TailPreview),
        "backfill" => Some(SourceCursorKind::Backfill),
        "forward_append" => Some(SourceCursorKind::ForwardAppend),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::{ANALYZER_CHECKPOINT_SCHEMA_VERSION, AnalyzerCheckpoint};
    use crate::protocol::stage4::BatchCompleteness;

    #[test]
    fn checkpoint_round_trip_keeps_recovery_boundary() {
        let checkpoint = AnalyzerCheckpoint {
            schema_version: ANALYZER_CHECKPOINT_SCHEMA_VERSION,
            request_id: "request-1".to_string(),
            conversation_id: "conversation-1".to_string(),
            source: super::CheckpointSource {
                source_id: "rollout.jsonl".to_string(),
                source_epoch: "epoch-1".to_string(),
                fingerprint: Some(
                    crate::source::SourceFingerprint::new("sha256-v1", "source", 10)
                        .expect("fingerprint"),
                ),
                prefix_anchor: Some(
                    crate::source::SourcePrefixAnchor::new("sha256-v1", "prefix", 10)
                        .expect("prefix anchor"),
                ),
            },
            reader: super::CheckpointReader {
                backend: super::CHECKPOINT_READER_BACKEND.to_string(),
                version: super::CHECKPOINT_READER_VERSION.to_string(),
                source_kind: crate::source::SourceKind::Rollout,
                compression: crate::source::SourceCompression::PlainJsonl,
            },
            wire_profile: Some(crate::protocol::ParserProvenance::for_profile(
                crate::CompatibilityProfile::Current,
            )),
            cursor_kind: None,
            cursor: None,
            segment: super::CheckpointSegment {
                source_range: None,
                physical_line_start: None,
                physical_line_end: None,
                rollout_ordinal: None,
            },
            reducer_state: Some(serde_json::json!({"seen": 2})),
            projection_watermark: Some("batch-1".to_string()),
            completeness: BatchCompleteness::Provisional,
            lineage_checkpoint: None,
        };
        checkpoint.validate().expect("checkpoint valid");
        let encoded = serde_json::to_string(&checkpoint).expect("checkpoint serializes");
        let restored: AnalyzerCheckpoint =
            serde_json::from_str(&encoded).expect("checkpoint deserializes");
        assert_eq!(restored, checkpoint);
    }
}
