//! Rust-owned data mapping for the 4.5 target protocol.
//!
//! This module deliberately owns the serialized cursor, delivery identity,
//! batch payload, and checkpoint shapes used by `protocol::target`.  Legacy
//! Stage 4 checkpoint fields may be read by the explicit compatibility
//! adapter below, but they are never part of the target-owned output shape.

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::model::{AnalysisEvent, LastTurnReplacement, SourceRef};
use crate::protocol::batch::{AnalysisBatch, BatchCompleteness, BatchDiagnostic, ParserProvenance};
use crate::source::{
    BackfillCursor, CompleteLineAnchor, CursorMetadata, ForwardAppendCursor, HistoryBaseRef,
    SourceCompression, SourceCursorKind, SourceKind, TailPreviewCursor,
};

/// The target data schema is independent from the JSONL protocol version.
pub const TARGET_DATA_SCHEMA_VERSION: u16 = 1;
pub const TARGET_CURSOR_SCHEMA_VERSION: u16 = 1;
pub const TARGET_REDUCER_ID: &str = "termlink.analysis_reducer";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetDataError {
    pub field: &'static str,
    pub message: String,
}

impl TargetDataError {
    fn new(field: &'static str, message: impl Into<String>) -> Self {
        Self {
            field,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for TargetDataError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "invalid target data field {}: {}",
            self.field, self.message
        )
    }
}

impl std::error::Error for TargetDataError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetCompleteness {
    Unknown,
    Partial,
    Provisional,
    Canonical,
}

impl TargetCompleteness {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Partial => "partial",
            Self::Provisional => "provisional",
            Self::Canonical => "canonical",
        }
    }
}

impl From<BatchCompleteness> for TargetCompleteness {
    fn from(value: BatchCompleteness) -> Self {
        match value {
            BatchCompleteness::Unknown => Self::Unknown,
            BatchCompleteness::Partial => Self::Partial,
            BatchCompleteness::Provisional => Self::Provisional,
            BatchCompleteness::Canonical => Self::Canonical,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetCursorKind {
    TailPreview,
    Backfill,
    ForwardAppend,
}

impl TargetCursorKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::TailPreview => "tail_preview",
            Self::Backfill => "backfill",
            Self::ForwardAppend => "forward_append",
        }
    }
}

impl From<SourceCursorKind> for TargetCursorKind {
    fn from(value: SourceCursorKind) -> Self {
        match value {
            SourceCursorKind::TailPreview => Self::TailPreview,
            SourceCursorKind::Backfill => Self::Backfill,
            SourceCursorKind::ForwardAppend => Self::ForwardAppend,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetSourceKind {
    Rollout,
    Manifest,
    Index,
}

impl From<SourceKind> for TargetSourceKind {
    fn from(value: SourceKind) -> Self {
        match value {
            SourceKind::Rollout => Self::Rollout,
            SourceKind::Manifest => Self::Manifest,
            SourceKind::Index => Self::Index,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetSourceCompression {
    PlainJsonl,
    Zstd,
}

impl From<SourceCompression> for TargetSourceCompression {
    fn from(value: SourceCompression) -> Self {
        match value {
            SourceCompression::PlainJsonl => Self::PlainJsonl,
            SourceCompression::Zstd => Self::Zstd,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetSnapshotUnit {
    PhysicalBytes,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetSourceByteRange {
    pub start: u64,
    pub end: u64,
}

impl TargetSourceByteRange {
    pub fn new(start: u64, end: u64) -> Result<Self, TargetDataError> {
        let range = Self { start, end };
        range.validate("source_range")?;
        Ok(range)
    }

    pub fn validate(self, field: &'static str) -> Result<(), TargetDataError> {
        if self.start > self.end {
            return Err(TargetDataError::new(
                field,
                format!("start {} must not exceed end {}", self.start, self.end),
            ));
        }
        Ok(())
    }
}

impl From<crate::source::SourceByteRange> for TargetSourceByteRange {
    fn from(value: crate::source::SourceByteRange) -> Self {
        Self {
            start: value.start(),
            end: value.end(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetSnapshotBoundary {
    pub unit: TargetSnapshotUnit,
    pub byte_length: u64,
}

impl TargetSnapshotBoundary {
    pub const fn physical_bytes(byte_length: u64) -> Self {
        Self {
            unit: TargetSnapshotUnit::PhysicalBytes,
            byte_length,
        }
    }

    fn validate(self, field: &'static str) -> Result<(), TargetDataError> {
        if self.unit != TargetSnapshotUnit::PhysicalBytes {
            return Err(TargetDataError::new(field, "unit must be physical_bytes"));
        }
        Ok(())
    }
}

impl From<crate::source::SnapshotBoundary> for TargetSnapshotBoundary {
    fn from(value: crate::source::SnapshotBoundary) -> Self {
        Self::physical_bytes(value.byte_length())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCompleteLineBoundary {
    pub physical_line_ordinal: u64,
    pub byte_start: u64,
    pub byte_end: u64,
}

impl TargetCompleteLineBoundary {
    fn validate(&self, field: &'static str) -> Result<(), TargetDataError> {
        if self.physical_line_ordinal == 0 || self.byte_start >= self.byte_end {
            return Err(TargetDataError::new(
                field,
                "line ordinal must be positive and byte range must be ordered",
            ));
        }
        Ok(())
    }
}

impl From<&CompleteLineAnchor> for TargetCompleteLineBoundary {
    fn from(value: &CompleteLineAnchor) -> Self {
        Self {
            physical_line_ordinal: value.physical_line_ordinal(),
            byte_start: value.byte_start(),
            byte_end: value.byte_end(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCursorCapabilities {
    pub forward_stream: bool,
    pub tail_preview: bool,
    pub backward_segments: bool,
    pub append: bool,
    pub random_seek: bool,
}

impl Default for TargetCursorCapabilities {
    fn default() -> Self {
        Self {
            forward_stream: true,
            tail_preview: true,
            backward_segments: true,
            append: true,
            random_seek: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TargetAnalyzerCursor {
    pub schema_version: u16,
    pub reader_backend: String,
    pub reader_version: String,
    pub cursor_kind: TargetCursorKind,
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub source_kind: TargetSourceKind,
    pub compression: TargetSourceCompression,
    pub snapshot_boundary: TargetSnapshotBoundary,
    pub complete_range: TargetSourceByteRange,
    pub last_complete_line: Option<TargetCompleteLineBoundary>,
    pub last_rollout_ordinal: Option<u64>,
    pub capabilities: TargetCursorCapabilities,
}

#[derive(Debug, Deserialize)]
struct TargetAnalyzerCursorWire {
    schema_version: u16,
    reader_backend: String,
    reader_version: String,
    cursor_kind: TargetCursorKind,
    conversation_id: String,
    source_id: String,
    source_epoch: String,
    source_kind: TargetSourceKind,
    compression: TargetSourceCompression,
    snapshot_boundary: TargetSnapshotBoundary,
    complete_range: TargetSourceByteRange,
    last_complete_line: Option<TargetCompleteLineBoundary>,
    last_rollout_ordinal: Option<u64>,
    capabilities: TargetCursorCapabilities,
}

impl<'de> Deserialize<'de> for TargetAnalyzerCursor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        validate_analyzer_cursor_json(&value, "cursor").map_err(serde::de::Error::custom)?;
        let wire = serde_json::from_value::<TargetAnalyzerCursorWire>(value)
            .map_err(serde::de::Error::custom)?;
        Ok(Self {
            schema_version: wire.schema_version,
            reader_backend: wire.reader_backend,
            reader_version: wire.reader_version,
            cursor_kind: wire.cursor_kind,
            conversation_id: wire.conversation_id,
            source_id: wire.source_id,
            source_epoch: wire.source_epoch,
            source_kind: wire.source_kind,
            compression: wire.compression,
            snapshot_boundary: wire.snapshot_boundary,
            complete_range: wire.complete_range,
            last_complete_line: wire.last_complete_line,
            last_rollout_ordinal: wire.last_rollout_ordinal,
            capabilities: wire.capabilities,
        })
    }
}

impl TargetAnalyzerCursor {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if self.schema_version != TARGET_CURSOR_SCHEMA_VERSION {
            return Err(TargetDataError::new(
                "cursor.schema_version",
                format!(
                    "expected {}, got {}",
                    TARGET_CURSOR_SCHEMA_VERSION, self.schema_version
                ),
            ));
        }
        ensure_non_empty(&self.reader_backend, "cursor.reader_backend")?;
        ensure_non_empty(&self.reader_version, "cursor.reader_version")?;
        ensure_non_empty(&self.conversation_id, "cursor.conversation_id")?;
        ensure_non_empty(&self.source_id, "cursor.source_id")?;
        ensure_non_empty(&self.source_epoch, "cursor.source_epoch")?;
        if self.source_epoch == "unbound" {
            return Err(TargetDataError::new(
                "cursor.source_epoch",
                "must not be unbound",
            ));
        }
        self.snapshot_boundary
            .validate("cursor.snapshot_boundary")?;
        self.complete_range.validate("cursor.complete_range")?;
        if self.complete_range.end > self.snapshot_boundary.byte_length {
            return Err(TargetDataError::new(
                "cursor.complete_range",
                "end must not exceed snapshot boundary",
            ));
        }
        if let Some(line) = &self.last_complete_line {
            line.validate("cursor.last_complete_line")?;
            if line.byte_end != self.complete_range.end {
                return Err(TargetDataError::new(
                    "cursor.last_complete_line.byte_end",
                    "must equal cursor.complete_range.end",
                ));
            }
        }
        if self.compression != TargetSourceCompression::PlainJsonl {
            return Err(TargetDataError::new(
                "cursor.compression",
                "only plain_jsonl cursors are resumable",
            ));
        }
        let capability = match self.cursor_kind {
            TargetCursorKind::TailPreview => self.capabilities.tail_preview,
            TargetCursorKind::Backfill => self.capabilities.backward_segments,
            TargetCursorKind::ForwardAppend => self.capabilities.append,
        };
        if !capability {
            return Err(TargetDataError::new(
                "cursor.capabilities",
                format!(
                    "{} capability is required by cursor kind",
                    self.cursor_kind.as_str()
                ),
            ));
        }
        Ok(())
    }

    pub fn from_source_metadata(metadata: &CursorMetadata) -> Result<Self, TargetDataError> {
        let cursor = Self {
            schema_version: TARGET_CURSOR_SCHEMA_VERSION,
            reader_backend: metadata.reader_backend().to_string(),
            reader_version: metadata.reader_version().to_string(),
            cursor_kind: metadata.cursor_kind().into(),
            conversation_id: metadata.target_conversation_id().to_string(),
            source_id: metadata.source_id().to_string(),
            source_epoch: metadata.source_epoch().to_string(),
            source_kind: metadata.source_kind().into(),
            compression: metadata.compression().into(),
            snapshot_boundary: metadata.snapshot_boundary().into(),
            complete_range: metadata.complete_range().into(),
            last_complete_line: metadata
                .last_complete_line()
                .map(TargetCompleteLineBoundary::from),
            last_rollout_ordinal: metadata.last_rollout_ordinal(),
            capabilities: {
                let capabilities = metadata.capabilities();
                TargetCursorCapabilities {
                    forward_stream: capabilities.forward_stream,
                    tail_preview: capabilities.tail_preview,
                    backward_segments: capabilities.backward_segments,
                    append: capabilities.append,
                    random_seek: capabilities.random_seek,
                }
            },
        };
        cursor.validate()?;
        Ok(cursor)
    }

    pub fn from_source_cursor_value(value: &Value) -> Result<Self, TargetDataError> {
        let attempts = [
            serde_json::from_value::<TailPreviewCursor>(value.clone())
                .ok()
                .map(|cursor| cursor.metadata().clone()),
            serde_json::from_value::<BackfillCursor>(value.clone())
                .ok()
                .map(|cursor| cursor.metadata().clone()),
            serde_json::from_value::<ForwardAppendCursor>(value.clone())
                .ok()
                .map(|cursor| cursor.metadata().clone()),
        ];
        for metadata in attempts.into_iter().flatten() {
            return Self::from_source_metadata(&metadata);
        }
        Err(TargetDataError::new(
            "cursor",
            "value is not a valid source cursor",
        ))
    }
}

pub(crate) fn ensure_required_json_keys(
    value: &Value,
    path: &str,
    keys: &[&str],
) -> Result<(), String> {
    let object = value
        .as_object()
        .ok_or_else(|| format!("{path} must be a JSON object"))?;
    for key in keys {
        if !object.contains_key(*key) {
            return Err(format!("{path}.{key} key is required"));
        }
    }
    Ok(())
}

fn ensure_nested_object_keys(
    value: &Value,
    path: &str,
    key: &str,
    keys: &[&str],
) -> Result<(), String> {
    let nested_path = format!("{path}.{key}");
    let nested = value
        .get(key)
        .ok_or_else(|| format!("{nested_path} key is required"))?;
    ensure_required_json_keys(nested, &nested_path, keys)
}

fn ensure_nullable_object_keys(
    value: &Value,
    path: &str,
    key: &str,
    keys: &[&str],
) -> Result<(), String> {
    let nested_path = format!("{path}.{key}");
    let nested = value
        .get(key)
        .ok_or_else(|| format!("{nested_path} key is required"))?;
    if nested.is_null() {
        return Ok(());
    }
    ensure_required_json_keys(nested, &nested_path, keys)
}

fn ensure_nullable_range_shape(value: &Value, path: &str, key: &str) -> Result<(), String> {
    ensure_nullable_object_keys(value, path, key, &["start", "end"])
}

pub(crate) fn validate_analyzer_cursor_json(value: &Value, path: &str) -> Result<(), String> {
    ensure_required_json_keys(
        value,
        path,
        &[
            "schema_version",
            "reader_backend",
            "reader_version",
            "cursor_kind",
            "conversation_id",
            "source_id",
            "source_epoch",
            "source_kind",
            "compression",
            "snapshot_boundary",
            "complete_range",
            "last_complete_line",
            "last_rollout_ordinal",
            "capabilities",
        ],
    )?;
    ensure_nested_object_keys(value, path, "snapshot_boundary", &["unit", "byte_length"])?;
    ensure_nested_object_keys(value, path, "complete_range", &["start", "end"])?;
    ensure_nullable_object_keys(
        value,
        path,
        "last_complete_line",
        &["physical_line_ordinal", "byte_start", "byte_end"],
    )?;
    ensure_nested_object_keys(
        value,
        path,
        "capabilities",
        &[
            "forward_stream",
            "tail_preview",
            "backward_segments",
            "append",
            "random_seek",
        ],
    )
}

pub(crate) fn validate_lineage_checkpoint_json_shape(
    value: &Value,
    path: &str,
) -> Result<(), String> {
    ensure_required_json_keys(
        value,
        path,
        &[
            "schema_version",
            "conversation_id",
            "root_rollout_id",
            "active_head_rollout_id",
            "chain_rollout_ids",
            "start_date",
            "end_date",
            "coverage",
        ],
    )?;
    ensure_nested_object_keys(
        value,
        path,
        "coverage",
        &[
            "root_rollout_id",
            "active_head_rollout_id",
            "chain_rollout_ids",
            "covered_source_count",
            "complete",
        ],
    )
}

pub(crate) fn validate_checkpoint_json_shape(value: &Value) -> Result<(), String> {
    let path = "checkpoint";
    ensure_required_json_keys(
        value,
        path,
        &[
            "schema_version",
            "job_id",
            "request_id",
            "conversation_id",
            "source",
            "reader",
            "wire_profile",
            "cursor_kind",
            "cursor",
            "segment",
            "reducer_state",
            "projection_watermark",
            "completeness",
            "lineage_checkpoint",
        ],
    )?;
    ensure_required_json_keys(
        value.get("source").unwrap_or(&Value::Null),
        "checkpoint.source",
        &[
            "source_id",
            "source_epoch",
            "source_range",
            "snapshot_boundary",
        ],
    )?;
    ensure_nullable_range_shape(
        value.get("source").unwrap_or(&Value::Null),
        "checkpoint.source",
        "source_range",
    )?;
    ensure_nested_object_keys(
        value.get("source").unwrap_or(&Value::Null),
        "checkpoint.source",
        "snapshot_boundary",
        &["unit", "byte_length"],
    )?;
    ensure_nested_object_keys(
        value,
        path,
        "reader",
        &["backend", "version", "source_kind", "compression"],
    )?;
    ensure_nested_object_keys(
        value,
        path,
        "wire_profile",
        &[
            "parser_backend",
            "wire_source_revision",
            "compatibility_profile",
        ],
    )?;
    ensure_required_json_keys(
        value.get("segment").unwrap_or(&Value::Null),
        "checkpoint.segment",
        &[
            "source_range",
            "physical_line_start",
            "physical_line_end",
            "rollout_ordinal",
        ],
    )?;
    ensure_nullable_range_shape(
        value.get("segment").unwrap_or(&Value::Null),
        "checkpoint.segment",
        "source_range",
    )?;
    ensure_nested_object_keys(
        value,
        path,
        "reducer_state",
        &["schema_version", "reducer_id", "reducer_version", "payload"],
    )?;
    ensure_required_json_keys(
        value.get("projection_watermark").unwrap_or(&Value::Null),
        "checkpoint.projection_watermark",
        &[
            "schema_version",
            "segment_id",
            "batch_id",
            "source_id",
            "source_epoch",
            "complete_source_end",
            "logical_item_count",
        ],
    )?;
    if let Some(cursor) = value.get("cursor") {
        if !cursor.is_null() {
            validate_analyzer_cursor_json(cursor, "checkpoint.cursor")?;
        }
    }
    if let Some(lineage) = value.get("lineage_checkpoint") {
        if !lineage.is_null() {
            validate_lineage_checkpoint_json_shape(lineage, "checkpoint.lineage_checkpoint")?;
        }
    }
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetSourceScope {
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub cursor_kind: Option<TargetCursorKind>,
    pub source_range: Option<TargetSourceByteRange>,
    pub snapshot_boundary: TargetSnapshotBoundary,
    pub last_complete_line: Option<TargetCompleteLineBoundary>,
    pub last_rollout_ordinal: Option<u64>,
}

impl TargetSourceScope {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.conversation_id, "source_scope.conversation_id")?;
        ensure_non_empty(&self.source_id, "source_scope.source_id")?;
        ensure_non_empty(&self.source_epoch, "source_scope.source_epoch")?;
        if self.source_epoch == "unbound" {
            return Err(TargetDataError::new(
                "source_scope.source_epoch",
                "must not be unbound",
            ));
        }
        self.snapshot_boundary
            .validate("source_scope.snapshot_boundary")?;
        if let Some(range) = self.source_range {
            range.validate("source_scope.source_range")?;
            if range.end > self.snapshot_boundary.byte_length {
                return Err(TargetDataError::new(
                    "source_scope.source_range",
                    "end must not exceed snapshot boundary",
                ));
            }
        }
        if let Some(line) = &self.last_complete_line {
            line.validate("source_scope.last_complete_line")?;
        }
        Ok(())
    }

    pub fn from_cursor(cursor: &TargetAnalyzerCursor) -> Self {
        Self {
            conversation_id: cursor.conversation_id.clone(),
            source_id: cursor.source_id.clone(),
            source_epoch: cursor.source_epoch.clone(),
            cursor_kind: Some(cursor.cursor_kind),
            source_range: Some(cursor.complete_range),
            snapshot_boundary: cursor.snapshot_boundary,
            last_complete_line: cursor.last_complete_line.clone(),
            last_rollout_ordinal: cursor.last_rollout_ordinal,
        }
    }

    pub fn matches_cursor(&self, cursor: &TargetAnalyzerCursor) -> Result<(), TargetDataError> {
        self.validate()?;
        cursor.validate()?;
        if self.conversation_id != cursor.conversation_id
            || self.source_id != cursor.source_id
            || self.source_epoch != cursor.source_epoch
            || self.cursor_kind != Some(cursor.cursor_kind)
            || self.source_range != Some(cursor.complete_range)
            || self.snapshot_boundary != cursor.snapshot_boundary
            || self.last_complete_line != cursor.last_complete_line
            || self.last_rollout_ordinal != cursor.last_rollout_ordinal
        {
            return Err(TargetDataError::new(
                "source_scope",
                "does not match cursor source scope",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetDeliveryIdentity {
    pub job_id: String,
    pub segment_id: String,
    pub batch_id: String,
}

impl TargetDeliveryIdentity {
    pub fn new(
        job_id: impl Into<String>,
        segment_id: impl Into<String>,
        batch_id: impl Into<String>,
    ) -> Self {
        Self {
            job_id: job_id.into(),
            segment_id: segment_id.into(),
            batch_id: batch_id.into(),
        }
    }

    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.job_id, "delivery.job_id")?;
        ensure_non_empty(&self.segment_id, "delivery.segment_id")?;
        ensure_non_empty(&self.batch_id, "delivery.batch_id")
    }

    pub fn matches(&self, other: &Self) -> Result<(), TargetDataError> {
        self.validate()?;
        other.validate()?;
        if self != other {
            return Err(TargetDataError::new(
                "delivery",
                "delivery identity does not match",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCheckpointSource {
    pub source_id: String,
    pub source_epoch: String,
    pub source_range: Option<TargetSourceByteRange>,
    pub snapshot_boundary: TargetSnapshotBoundary,
}

impl TargetCheckpointSource {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        let scope = TargetSourceScope {
            conversation_id: "checkpoint".to_string(),
            source_id: self.source_id.clone(),
            source_epoch: self.source_epoch.clone(),
            cursor_kind: None,
            source_range: self.source_range,
            snapshot_boundary: self.snapshot_boundary,
            last_complete_line: None,
            last_rollout_ordinal: None,
        };
        scope.validate()
    }

    pub fn from_legacy(
        source: &crate::protocol::checkpoint::CheckpointSource,
        snapshot_boundary: TargetSnapshotBoundary,
        source_range: Option<TargetSourceByteRange>,
    ) -> Self {
        Self {
            source_id: source.source_id.clone(),
            source_epoch: source.source_epoch.clone(),
            source_range,
            snapshot_boundary,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCheckpointReader {
    pub backend: String,
    pub version: String,
    pub source_kind: TargetSourceKind,
    pub compression: TargetSourceCompression,
}

impl TargetCheckpointReader {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.backend, "reader.backend")?;
        ensure_non_empty(&self.version, "reader.version")
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TargetCheckpointWireProfile {
    pub parser_backend: String,
    pub wire_source_revision: String,
    pub compatibility_profile: Value,
}

impl TargetCheckpointWireProfile {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.parser_backend, "wire_profile.parser_backend")?;
        ensure_non_empty(
            &self.wire_source_revision,
            "wire_profile.wire_source_revision",
        )?;
        match &self.compatibility_profile {
            Value::String(profile) => {
                ensure_non_empty(profile, "wire_profile.compatibility_profile")?;
            }
            Value::Object(profile) => {
                let profile_id = profile
                    .get("profile_id")
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        TargetDataError::new(
                            "wire_profile.compatibility_profile.profile_id",
                            "must be a non-empty string",
                        )
                    })?;
                let profile_version = profile
                    .get("profile_version")
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        TargetDataError::new(
                            "wire_profile.compatibility_profile.profile_version",
                            "must be a non-empty string",
                        )
                    })?;
                ensure_non_empty(profile_id, "wire_profile.compatibility_profile.profile_id")?;
                ensure_non_empty(
                    profile_version,
                    "wire_profile.compatibility_profile.profile_version",
                )?;
                let features = profile
                    .get("features")
                    .and_then(Value::as_array)
                    .ok_or_else(|| {
                        TargetDataError::new(
                            "wire_profile.compatibility_profile.features",
                            "must be a string array",
                        )
                    })?;
                if features.iter().any(|feature| {
                    feature
                        .as_str()
                        .is_none_or(|feature| feature.trim().is_empty())
                }) {
                    return Err(TargetDataError::new(
                        "wire_profile.compatibility_profile.features",
                        "must contain only non-empty strings",
                    ));
                }
            }
            _ => {
                return Err(TargetDataError::new(
                    "wire_profile.compatibility_profile",
                    "must be a non-empty string or CompatibilityProfile object",
                ));
            }
        }
        Ok(())
    }

    pub fn from_parser_provenance(provenance: &ParserProvenance) -> Result<Self, TargetDataError> {
        let compatibility_profile = serde_json::to_value(&provenance.compatibility_profile)
            .map_err(|error| {
                TargetDataError::new("wire_profile.compatibility_profile", error.to_string())
            })?;
        Ok(Self {
            parser_backend: provenance.parser_backend.clone(),
            wire_source_revision: provenance.wire_source_revision.clone(),
            compatibility_profile,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetCheckpointSegment {
    pub source_range: Option<TargetSourceByteRange>,
    pub physical_line_start: Option<u64>,
    pub physical_line_end: Option<u64>,
    pub rollout_ordinal: Option<u64>,
}

impl TargetCheckpointSegment {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if let Some(range) = self.source_range {
            range.validate("segment.source_range")?;
        }
        match (self.physical_line_start, self.physical_line_end) {
            (Some(start), Some(end)) if start > 0 && end > 0 && start <= end => Ok(()),
            (None, None) => Ok(()),
            _ => Err(TargetDataError::new(
                "segment.physical_line_start",
                "physical line start/end must be both null or positive and ordered",
            )),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TargetReducerCheckpointState {
    pub schema_version: u16,
    pub reducer_id: String,
    pub reducer_version: String,
    pub payload: Value,
}

impl TargetReducerCheckpointState {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if self.schema_version != TARGET_DATA_SCHEMA_VERSION {
            return Err(TargetDataError::new(
                "reducer_state.schema_version",
                format!("expected {TARGET_DATA_SCHEMA_VERSION}"),
            ));
        }
        ensure_non_empty(&self.reducer_id, "reducer_state.reducer_id")?;
        ensure_non_empty(&self.reducer_version, "reducer_state.reducer_version")?;
        if !self.payload.is_object() {
            return Err(TargetDataError::new(
                "reducer_state.payload",
                "must be a JSON object",
            ));
        }
        Ok(())
    }

    pub fn from_payload(
        payload: Value,
        reducer_version: impl Into<String>,
    ) -> Result<Self, TargetDataError> {
        let state = Self {
            schema_version: TARGET_DATA_SCHEMA_VERSION,
            reducer_id: TARGET_REDUCER_ID.to_string(),
            reducer_version: reducer_version.into(),
            payload,
        };
        state.validate()?;
        Ok(state)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetProjectionWatermark {
    pub schema_version: u16,
    pub segment_id: String,
    pub batch_id: String,
    pub source_id: Option<String>,
    pub source_epoch: String,
    pub complete_source_end: Option<u64>,
    pub logical_item_count: u64,
}

impl TargetProjectionWatermark {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if self.schema_version != TARGET_DATA_SCHEMA_VERSION {
            return Err(TargetDataError::new(
                "projection_watermark.schema_version",
                format!("expected {TARGET_DATA_SCHEMA_VERSION}"),
            ));
        }
        ensure_non_empty(&self.segment_id, "projection_watermark.segment_id")?;
        ensure_non_empty(&self.batch_id, "projection_watermark.batch_id")?;
        if let Some(source_id) = &self.source_id {
            ensure_non_empty(source_id, "projection_watermark.source_id")?;
        }
        ensure_non_empty(&self.source_epoch, "projection_watermark.source_epoch")?;
        if self.source_epoch == "unbound" {
            return Err(TargetDataError::new(
                "projection_watermark.source_epoch",
                "must not be unbound",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetLineageCoverage {
    pub root_rollout_id: String,
    pub active_head_rollout_id: String,
    pub chain_rollout_ids: Vec<String>,
    pub covered_source_count: u64,
    pub complete: bool,
}

impl TargetLineageCoverage {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.root_rollout_id, "lineage_coverage.root_rollout_id")?;
        ensure_non_empty(
            &self.active_head_rollout_id,
            "lineage_coverage.active_head_rollout_id",
        )?;
        if self.chain_rollout_ids.is_empty()
            || self
                .chain_rollout_ids
                .iter()
                .any(|value| value.trim().is_empty())
        {
            return Err(TargetDataError::new(
                "lineage_coverage.chain_rollout_ids",
                "must contain non-empty rollout IDs",
            ));
        }
        if self.covered_source_count == 0
            || !self
                .chain_rollout_ids
                .iter()
                .any(|rollout_id| rollout_id == &self.root_rollout_id)
            || !self
                .chain_rollout_ids
                .iter()
                .any(|rollout_id| rollout_id == &self.active_head_rollout_id)
        {
            return Err(TargetDataError::new(
                "lineage_coverage",
                "must cover at least one source and include root and active head",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetLineageValidationState {
    Validated,
    ValidationUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetLineageTransition {
    pub parent_rollout_id: String,
    pub child_rollout_id: String,
    pub history_base: HistoryBaseRef,
    pub validation_state: TargetLineageValidationState,
}

impl TargetLineageTransition {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(
            &self.parent_rollout_id,
            "lineage_transition.parent_rollout_id",
        )?;
        ensure_non_empty(
            &self.child_rollout_id,
            "lineage_transition.child_rollout_id",
        )?;
        if self.parent_rollout_id == self.child_rollout_id {
            return Err(TargetDataError::new(
                "lineage_transition",
                "parent and child rollout IDs must differ",
            ));
        }
        validate_history_base(&self.history_base, "lineage_transition.history_base")?;
        if self.history_base.parent_rollout_id != self.parent_rollout_id {
            return Err(TargetDataError::new(
                "lineage_transition.history_base.parent_rollout_id",
                "must match lineage_transition.parent_rollout_id",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TargetLineageCheckpoint {
    pub schema_version: u16,
    pub conversation_id: String,
    pub root_rollout_id: String,
    pub active_head_rollout_id: String,
    pub chain_rollout_ids: Vec<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub coverage: TargetLineageCoverage,
}

#[derive(Debug, Deserialize)]
struct TargetLineageCheckpointWire {
    schema_version: u16,
    conversation_id: String,
    root_rollout_id: String,
    active_head_rollout_id: String,
    chain_rollout_ids: Vec<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    coverage: TargetLineageCoverage,
}

impl<'de> Deserialize<'de> for TargetLineageCheckpoint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        validate_lineage_checkpoint_json_shape(&value, "lineage_checkpoint")
            .map_err(serde::de::Error::custom)?;
        let wire = serde_json::from_value::<TargetLineageCheckpointWire>(value)
            .map_err(serde::de::Error::custom)?;
        Ok(Self {
            schema_version: wire.schema_version,
            conversation_id: wire.conversation_id,
            root_rollout_id: wire.root_rollout_id,
            active_head_rollout_id: wire.active_head_rollout_id,
            chain_rollout_ids: wire.chain_rollout_ids,
            start_date: wire.start_date,
            end_date: wire.end_date,
            coverage: wire.coverage,
        })
    }
}

impl TargetLineageCheckpoint {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if self.schema_version != TARGET_DATA_SCHEMA_VERSION {
            return Err(TargetDataError::new(
                "lineage_checkpoint.schema_version",
                format!("expected {TARGET_DATA_SCHEMA_VERSION}"),
            ));
        }
        ensure_non_empty(&self.conversation_id, "lineage_checkpoint.conversation_id")?;
        ensure_non_empty(&self.root_rollout_id, "lineage_checkpoint.root_rollout_id")?;
        ensure_non_empty(
            &self.active_head_rollout_id,
            "lineage_checkpoint.active_head_rollout_id",
        )?;
        if self.chain_rollout_ids.is_empty()
            || self
                .chain_rollout_ids
                .iter()
                .any(|value| value.trim().is_empty())
        {
            return Err(TargetDataError::new(
                "lineage_checkpoint.chain_rollout_ids",
                "must contain non-empty rollout IDs",
            ));
        }
        if let Some(date) = &self.start_date {
            validate_date(date, "lineage_checkpoint.start_date")?;
        }
        if let Some(date) = &self.end_date {
            validate_date(date, "lineage_checkpoint.end_date")?;
        }
        if self.root_rollout_id != self.coverage.root_rollout_id
            || self.active_head_rollout_id != self.coverage.active_head_rollout_id
            || self.chain_rollout_ids != self.coverage.chain_rollout_ids
        {
            return Err(TargetDataError::new(
                "lineage_checkpoint",
                "root, active head, and chain must match checkpoint coverage",
            ));
        }
        self.coverage.validate()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetBatchSourceRef {
    pub item_key: String,
    pub content_hash: String,
    pub completeness: TargetCompleteness,
    pub source_epoch: String,
    pub source_ref: SourceRef,
}

impl TargetBatchSourceRef {
    fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.item_key, "mutation.item.item_key")?;
        ensure_non_empty(&self.content_hash, "mutation.item.content_hash")?;
        ensure_non_empty(&self.source_epoch, "mutation.item.source_epoch")?;
        if self.source_epoch == "unbound" {
            return Err(TargetDataError::new(
                "mutation.item.source_epoch",
                "must not be unbound",
            ));
        }
        validate_source_ref(&self.source_ref, "mutation.item.source_ref")
    }

    fn validate_for_batch(&self, batch: &TargetAnalysisBatch) -> Result<(), TargetDataError> {
        self.validate()?;
        if self.completeness != batch.completeness {
            return Err(TargetDataError::new(
                "mutation.item.completeness",
                "must match batch completeness",
            ));
        }
        if self.source_epoch != batch.source_epoch {
            return Err(TargetDataError::new(
                "mutation.item.source_epoch",
                "must match batch source_epoch",
            ));
        }
        validate_source_ref_scope(
            &self.source_ref,
            &batch.source_id,
            batch.source_range,
            "mutation.item.source_ref",
        )
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "mutation", rename_all = "snake_case")]
pub enum TargetMutation {
    UpsertItem {
        item: TargetBatchSourceRef,
    },
    UpsertDetail {
        item: TargetBatchSourceRef,
    },
    UpsertUsage {
        item: TargetBatchSourceRef,
    },
    UpsertOutcome {
        item: TargetBatchSourceRef,
    },
    ReplaceLastTurn {
        replacement: LastTurnReplacement,
    },
    MarkPartial {
        source_range: Option<TargetSourceByteRange>,
    },
    CompleteRange {
        source_range: TargetSourceByteRange,
    },
}

impl TargetMutation {
    fn validate(&self) -> Result<(), TargetDataError> {
        match self {
            Self::UpsertItem { item }
            | Self::UpsertDetail { item }
            | Self::UpsertUsage { item }
            | Self::UpsertOutcome { item } => item.validate(),
            Self::ReplaceLastTurn { replacement } => {
                validate_replacement_shape(replacement, "mutation.replacement")
            }
            Self::MarkPartial { source_range } => {
                if let Some(range) = source_range {
                    range.validate("mutation.source_range")?;
                }
                Ok(())
            }
            Self::CompleteRange { source_range } => source_range.validate("mutation.source_range"),
        }
    }

    fn validate_for_batch(&self, batch: &TargetAnalysisBatch) -> Result<(), TargetDataError> {
        self.validate()?;
        match self {
            Self::UpsertItem { item }
            | Self::UpsertDetail { item }
            | Self::UpsertUsage { item }
            | Self::UpsertOutcome { item } => item.validate_for_batch(batch),
            Self::ReplaceLastTurn { replacement } => {
                validate_replacement_for_batch(replacement, batch)
            }
            Self::MarkPartial { source_range } => {
                if batch.completeness == TargetCompleteness::Canonical {
                    return Err(TargetDataError::new(
                        "mutation",
                        "mark_partial is not allowed in canonical batches",
                    ));
                }
                if let (Some(batch_range), Some(range)) = (batch.source_range, source_range) {
                    if range.start < batch_range.start || range.end > batch_range.end {
                        return Err(TargetDataError::new(
                            "mutation.source_range",
                            "mark_partial range must remain within batch source range",
                        ));
                    }
                }
                Ok(())
            }
            Self::CompleteRange { source_range } => {
                if batch.completeness != TargetCompleteness::Canonical {
                    return Err(TargetDataError::new(
                        "mutation.source_range",
                        "complete_range is allowed only for canonical batches",
                    ));
                }
                if batch.source_range != Some(*source_range) {
                    return Err(TargetDataError::new(
                        "mutation.source_range",
                        "complete_range must match batch source_range",
                    ));
                }
                Ok(())
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetToolDetail {
    pub item_key: String,
    pub call_id: String,
    pub tool_kind: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub completeness: TargetCompleteness,
    pub source_epoch: String,
}

impl TargetToolDetail {
    fn validate_for_batch(&self, batch: &TargetAnalysisBatch) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.item_key, "payload.tool_details.item_key")?;
        ensure_non_empty(&self.call_id, "payload.tool_details.call_id")?;
        ensure_non_empty(&self.tool_kind, "payload.tool_details.tool_kind")?;
        validate_batch_evidence(
            self.completeness,
            &self.source_epoch,
            batch,
            "payload.tool_details",
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TargetTaskOutcome {
    pub item_key: String,
    pub status: String,
    pub message: Option<String>,
    pub completeness: TargetCompleteness,
    pub source_epoch: String,
}

impl TargetTaskOutcome {
    fn validate_for_batch(&self, batch: &TargetAnalysisBatch) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.item_key, "payload.task_outcomes.item_key")?;
        ensure_non_empty(&self.status, "payload.task_outcomes.status")?;
        validate_batch_evidence(
            self.completeness,
            &self.source_epoch,
            batch,
            "payload.task_outcomes",
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct TargetProgress {
    pub records_seen: u64,
    pub records_emitted: u64,
    pub bytes_scanned: u64,
    pub has_more: bool,
}

impl TargetProgress {
    fn validate(&self) -> Result<(), TargetDataError> {
        if self.records_emitted > self.records_seen {
            return Err(TargetDataError::new(
                "progress.records_emitted",
                "must not exceed records_seen",
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TargetAnalysisBatch {
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub source_range: Option<TargetSourceByteRange>,
    pub history_items: Vec<AnalysisEvent>,
    pub diagnostics: Vec<BatchDiagnostic>,
    pub parser_provenance: ParserProvenance,
    pub complete: bool,
    pub completeness: TargetCompleteness,
    pub projection: Value,
    pub tool_details: Vec<TargetToolDetail>,
    pub usage: Option<Value>,
    pub task_outcomes: Vec<TargetTaskOutcome>,
    pub progress: TargetProgress,
    pub next_cursor: Option<TargetAnalyzerCursor>,
    pub mutations: Vec<TargetMutation>,
    pub history_base: Option<HistoryBaseRef>,
    pub replacements: Vec<LastTurnReplacement>,
    pub reducer_state: Option<TargetReducerCheckpointState>,
    pub lineage_transitions: Vec<TargetLineageTransition>,
    pub lineage_coverage: Option<TargetLineageCoverage>,
    pub lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

#[derive(Debug, Deserialize)]
struct TargetAnalysisBatchWire {
    conversation_id: String,
    source_id: String,
    source_epoch: String,
    #[serde(default)]
    source_range: Option<TargetSourceByteRange>,
    history_items: Vec<AnalysisEvent>,
    diagnostics: Vec<BatchDiagnostic>,
    parser_provenance: ParserProvenance,
    complete: bool,
    completeness: TargetCompleteness,
    projection: Value,
    tool_details: Vec<TargetToolDetail>,
    #[serde(default)]
    usage: Option<Value>,
    task_outcomes: Vec<TargetTaskOutcome>,
    progress: TargetProgress,
    #[serde(default)]
    next_cursor: Option<TargetAnalyzerCursor>,
    mutations: Vec<TargetMutation>,
    #[serde(default)]
    history_base: Option<HistoryBaseRef>,
    #[serde(default)]
    replacements: Vec<LastTurnReplacement>,
    #[serde(default)]
    reducer_state: Option<TargetReducerCheckpointState>,
    #[serde(default)]
    lineage_transitions: Vec<TargetLineageTransition>,
    #[serde(default)]
    lineage_coverage: Option<TargetLineageCoverage>,
    #[serde(default)]
    lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

impl<'de> Deserialize<'de> for TargetAnalysisBatch {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        ensure_required_json_keys(&value, "payload", &["usage", "next_cursor"])
            .map_err(serde::de::Error::custom)?;
        if let Some(cursor) = value.get("next_cursor") {
            if !cursor.is_null() {
                validate_analyzer_cursor_json(cursor, "payload.next_cursor")
                    .map_err(serde::de::Error::custom)?;
            }
        }
        let wire = serde_json::from_value::<TargetAnalysisBatchWire>(value)
            .map_err(serde::de::Error::custom)?;
        Ok(Self {
            conversation_id: wire.conversation_id,
            source_id: wire.source_id,
            source_epoch: wire.source_epoch,
            source_range: wire.source_range,
            history_items: wire.history_items,
            diagnostics: wire.diagnostics,
            parser_provenance: wire.parser_provenance,
            complete: wire.complete,
            completeness: wire.completeness,
            projection: wire.projection,
            tool_details: wire.tool_details,
            usage: wire.usage,
            task_outcomes: wire.task_outcomes,
            progress: wire.progress,
            next_cursor: wire.next_cursor,
            mutations: wire.mutations,
            history_base: wire.history_base,
            replacements: wire.replacements,
            reducer_state: wire.reducer_state,
            lineage_transitions: wire.lineage_transitions,
            lineage_coverage: wire.lineage_coverage,
            lineage_checkpoint: wire.lineage_checkpoint,
        })
    }
}

impl TargetAnalysisBatch {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        ensure_non_empty(&self.conversation_id, "payload.conversation_id")?;
        ensure_non_empty(&self.source_id, "payload.source_id")?;
        ensure_non_empty(&self.source_epoch, "payload.source_epoch")?;
        if self.source_epoch == "unbound" {
            return Err(TargetDataError::new(
                "payload.source_epoch",
                "must not be unbound",
            ));
        }
        if let Some(range) = self.source_range {
            range.validate("payload.source_range")?;
        }
        ensure_non_empty(
            &self.parser_provenance.parser_backend,
            "payload.parser_provenance.parser_backend",
        )?;
        ensure_non_empty(
            &self.parser_provenance.wire_source_revision,
            "payload.parser_provenance.wire_source_revision",
        )?;
        validate_projection(&self.projection, self.completeness)?;
        if let Some(usage) = &self.usage
            && !usage.is_null()
            && !usage.is_object()
        {
            return Err(TargetDataError::new(
                "payload.usage",
                "must be an object or null",
            ));
        }
        self.progress.validate()?;
        for item in &self.history_items {
            let metadata = item.metadata();
            ensure_non_empty(&metadata.event_id, "payload.history_items.event_id")?;
            ensure_non_empty(&metadata.item_key, "payload.history_items.item_key")?;
            if let Some(conversation_id) = &metadata.conversation_id
                && conversation_id != &self.conversation_id
            {
                return Err(TargetDataError::new(
                    "payload.history_items.conversation_id",
                    "must match batch conversation_id when present",
                ));
            }
            validate_source_ref(&metadata.source_ref, "payload.history_items.source_ref")?;
            validate_source_ref_scope(
                &metadata.source_ref,
                &self.source_id,
                self.source_range,
                "payload.history_items.source_ref",
            )?;
        }
        for detail in &self.tool_details {
            detail.validate_for_batch(self)?;
        }
        for outcome in &self.task_outcomes {
            outcome.validate_for_batch(self)?;
        }
        if let Some(cursor) = &self.next_cursor {
            cursor.validate()?;
            if cursor.conversation_id != self.conversation_id
                || cursor.source_id != self.source_id
                || cursor.source_epoch != self.source_epoch
            {
                return Err(TargetDataError::new(
                    "payload.next_cursor",
                    "cursor source scope does not match batch",
                ));
            }
            if self.source_range != Some(cursor.complete_range) {
                return Err(TargetDataError::new(
                    "payload.next_cursor",
                    "cursor complete range does not match batch source range",
                ));
            }
        }
        for mutation in &self.mutations {
            mutation.validate_for_batch(self)?;
        }
        for transition in &self.lineage_transitions {
            transition.validate()?;
        }
        if let Some(coverage) = &self.lineage_coverage {
            coverage.validate()?;
        }
        if let Some(checkpoint) = &self.lineage_checkpoint {
            checkpoint.validate()?;
            if checkpoint.conversation_id != self.conversation_id {
                return Err(TargetDataError::new(
                    "payload.lineage_checkpoint.conversation_id",
                    "must match batch conversation_id",
                ));
            }
        }
        if let Some(state) = &self.reducer_state {
            state.validate()?;
        }
        validate_lineage_evidence(self)?;
        match self.completeness {
            TargetCompleteness::Canonical => {
                if !self.complete
                    || self.reducer_state.is_none()
                    || self.source_range.is_none()
                    || self.next_cursor.is_none()
                {
                    return Err(TargetDataError::new(
                        "payload.completeness",
                        "canonical batch requires complete=true, source range, next cursor, and reducer_state",
                    ));
                }
                if !self
                    .mutations
                    .iter()
                    .any(|mutation| matches!(mutation, TargetMutation::CompleteRange { .. }))
                {
                    return Err(TargetDataError::new(
                        "payload.mutations",
                        "canonical batch requires complete_range",
                    ));
                }
            }
            TargetCompleteness::Unknown
            | TargetCompleteness::Partial
            | TargetCompleteness::Provisional => {
                if self.complete
                    || !self
                        .mutations
                        .iter()
                        .any(|mutation| matches!(mutation, TargetMutation::MarkPartial { .. }))
                {
                    return Err(TargetDataError::new(
                        "payload.completeness",
                        "non-canonical batch requires complete=false and mark_partial",
                    ));
                }
            }
        }
        Ok(())
    }

    pub fn from_analysis_batch(
        batch: AnalysisBatch,
        context: TargetBatchMappingContext,
    ) -> Result<Self, TargetDataError> {
        let source_id = batch
            .source_id
            .clone()
            .ok_or_else(|| TargetDataError::new("payload.source_id", "legacy batch is unbound"))?;
        if source_id != context.source_id {
            return Err(TargetDataError::new(
                "payload.source_id",
                "legacy batch source_id does not match mapping context",
            ));
        }
        let payload = Self {
            conversation_id: context.conversation_id,
            source_id,
            source_epoch: context.source_epoch,
            source_range: context.source_range,
            history_items: batch.items,
            diagnostics: batch.diagnostics,
            parser_provenance: batch.parser_provenance,
            complete: batch.complete,
            completeness: batch.completeness.into(),
            projection: context.projection,
            tool_details: context.tool_details,
            usage: context.usage,
            task_outcomes: context.task_outcomes,
            progress: context.progress,
            next_cursor: context.next_cursor,
            mutations: context.mutations,
            history_base: batch.history_base,
            replacements: batch.replacements,
            reducer_state: context.reducer_state,
            lineage_transitions: context.lineage_transitions,
            lineage_coverage: context.lineage_coverage,
            lineage_checkpoint: context.lineage_checkpoint,
        };
        payload.validate()?;
        Ok(payload)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct TargetBatchMappingContext {
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub source_range: Option<TargetSourceByteRange>,
    pub projection: Value,
    pub tool_details: Vec<TargetToolDetail>,
    pub usage: Option<Value>,
    pub task_outcomes: Vec<TargetTaskOutcome>,
    pub progress: TargetProgress,
    pub next_cursor: Option<TargetAnalyzerCursor>,
    pub mutations: Vec<TargetMutation>,
    pub reducer_state: Option<TargetReducerCheckpointState>,
    pub lineage_transitions: Vec<TargetLineageTransition>,
    pub lineage_coverage: Option<TargetLineageCoverage>,
    pub lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TargetLegacyCheckpointContext {
    pub job_id: String,
    pub conversation_id: String,
    pub source: TargetCheckpointSource,
    pub reader: TargetCheckpointReader,
    pub wire_profile: TargetCheckpointWireProfile,
    pub cursor: Option<TargetAnalyzerCursor>,
    pub segment: TargetCheckpointSegment,
    pub reducer_state: TargetReducerCheckpointState,
    pub projection_watermark: TargetProjectionWatermark,
    pub lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TargetAnalyzerCheckpoint {
    pub schema_version: u16,
    pub job_id: String,
    pub request_id: String,
    pub conversation_id: String,
    pub source: TargetCheckpointSource,
    pub reader: TargetCheckpointReader,
    pub wire_profile: TargetCheckpointWireProfile,
    pub cursor_kind: Option<TargetCursorKind>,
    pub cursor: Option<TargetAnalyzerCursor>,
    pub segment: TargetCheckpointSegment,
    pub reducer_state: TargetReducerCheckpointState,
    pub projection_watermark: TargetProjectionWatermark,
    pub completeness: TargetCompleteness,
    pub lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

#[derive(Debug, Deserialize)]
struct TargetAnalyzerCheckpointWire {
    schema_version: u16,
    job_id: String,
    request_id: String,
    conversation_id: String,
    source: TargetCheckpointSource,
    reader: TargetCheckpointReader,
    wire_profile: TargetCheckpointWireProfile,
    #[serde(default)]
    cursor_kind: Option<TargetCursorKind>,
    #[serde(default)]
    cursor: Option<TargetAnalyzerCursor>,
    segment: TargetCheckpointSegment,
    reducer_state: TargetReducerCheckpointState,
    projection_watermark: TargetProjectionWatermark,
    completeness: TargetCompleteness,
    #[serde(default)]
    lineage_checkpoint: Option<TargetLineageCheckpoint>,
}

impl<'de> Deserialize<'de> for TargetAnalyzerCheckpoint {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        validate_checkpoint_json_shape(&value).map_err(serde::de::Error::custom)?;
        let wire = serde_json::from_value::<TargetAnalyzerCheckpointWire>(value)
            .map_err(serde::de::Error::custom)?;
        Ok(Self {
            schema_version: wire.schema_version,
            job_id: wire.job_id,
            request_id: wire.request_id,
            conversation_id: wire.conversation_id,
            source: wire.source,
            reader: wire.reader,
            wire_profile: wire.wire_profile,
            cursor_kind: wire.cursor_kind,
            cursor: wire.cursor,
            segment: wire.segment,
            reducer_state: wire.reducer_state,
            projection_watermark: wire.projection_watermark,
            completeness: wire.completeness,
            lineage_checkpoint: wire.lineage_checkpoint,
        })
    }
}

impl TargetAnalyzerCheckpoint {
    pub fn validate(&self) -> Result<(), TargetDataError> {
        if self.schema_version != TARGET_DATA_SCHEMA_VERSION {
            return Err(TargetDataError::new(
                "checkpoint.schema_version",
                format!("expected {TARGET_DATA_SCHEMA_VERSION}"),
            ));
        }
        ensure_non_empty(&self.job_id, "checkpoint.job_id")?;
        ensure_non_empty(&self.request_id, "checkpoint.request_id")?;
        ensure_non_empty(&self.conversation_id, "checkpoint.conversation_id")?;
        self.source.validate()?;
        self.reader.validate()?;
        self.wire_profile.validate()?;
        self.segment.validate()?;
        self.reducer_state.validate()?;
        self.projection_watermark.validate()?;
        if self.projection_watermark.source_epoch != self.source.source_epoch
            || self
                .projection_watermark
                .source_id
                .as_deref()
                .is_some_and(|source_id| source_id != self.source.source_id)
        {
            return Err(TargetDataError::new(
                "checkpoint.projection_watermark",
                "source scope does not match checkpoint source",
            ));
        }
        if self.segment.source_range != self.source.source_range {
            return Err(TargetDataError::new(
                "checkpoint.segment.source_range",
                "must match checkpoint source_range",
            ));
        }
        if let Some(complete_source_end) = self.projection_watermark.complete_source_end {
            if self.source.source_range.map(|range| range.end) != Some(complete_source_end) {
                return Err(TargetDataError::new(
                    "checkpoint.projection_watermark.complete_source_end",
                    "must match checkpoint source_range.end",
                ));
            }
        }
        if self.completeness == TargetCompleteness::Canonical {
            let source_range = self.source.source_range.ok_or_else(|| {
                TargetDataError::new(
                    "checkpoint.source.source_range",
                    "canonical checkpoint requires source range evidence",
                )
            })?;
            if !matches!((&self.cursor_kind, &self.cursor), (Some(_), Some(_))) {
                return Err(TargetDataError::new(
                    "checkpoint.cursor",
                    "canonical checkpoint requires cursor_kind and cursor evidence",
                ));
            }
            if self.projection_watermark.complete_source_end != Some(source_range.end) {
                return Err(TargetDataError::new(
                    "checkpoint.projection_watermark.complete_source_end",
                    "canonical checkpoint requires complete source end matching source range.end",
                ));
            }
        }
        match (&self.cursor_kind, &self.cursor) {
            (None, None) => {}
            (Some(kind), Some(cursor)) => {
                cursor.validate()?;
                if cursor.cursor_kind != *kind
                    || cursor.conversation_id != self.conversation_id
                    || cursor.source_id != self.source.source_id
                    || cursor.source_epoch != self.source.source_epoch
                    || cursor.snapshot_boundary != self.source.snapshot_boundary
                    || self.source.source_range != Some(cursor.complete_range)
                    || cursor.reader_backend != self.reader.backend
                    || cursor.reader_version != self.reader.version
                    || cursor.source_kind != self.reader.source_kind
                    || cursor.compression != self.reader.compression
                {
                    return Err(TargetDataError::new(
                        "checkpoint.cursor",
                        "cursor kind or source scope does not match checkpoint",
                    ));
                }
            }
            _ => {
                return Err(TargetDataError::new(
                    "checkpoint.cursor",
                    "cursor_kind and cursor must be both null or both present",
                ));
            }
        }
        if let Some(lineage) = &self.lineage_checkpoint {
            lineage.validate()?;
            if lineage.conversation_id != self.conversation_id {
                return Err(TargetDataError::new(
                    "checkpoint.lineage_checkpoint.conversation_id",
                    "must match checkpoint conversation_id",
                ));
            }
        }
        Ok(())
    }

    pub fn from_legacy(
        legacy: &crate::protocol::checkpoint::AnalyzerCheckpoint,
        context: TargetLegacyCheckpointContext,
    ) -> Result<Self, TargetDataError> {
        ensure_non_empty(&context.job_id, "checkpoint.job_id")?;
        ensure_non_empty(&context.conversation_id, "checkpoint.conversation_id")?;
        if legacy.conversation_id.trim().is_empty()
            || legacy.conversation_id != context.conversation_id
        {
            return Err(TargetDataError::new(
                "checkpoint.conversation_id",
                "legacy checkpoint conversation_id does not match mapping context",
            ));
        }
        if legacy.source.source_id != context.source.source_id
            || legacy.source.source_epoch != context.source.source_epoch
        {
            return Err(TargetDataError::new(
                "checkpoint.source",
                "legacy checkpoint source does not match mapping context",
            ));
        }
        let legacy_kind = legacy.cursor_kind.map(TargetCursorKind::from);
        if legacy_kind != context.cursor.as_ref().map(|cursor| cursor.cursor_kind) {
            return Err(TargetDataError::new(
                "checkpoint.cursor_kind",
                "legacy cursor kind does not match target cursor mapping",
            ));
        }
        if let Some(watermark) = &legacy.projection_watermark
            && watermark != &context.projection_watermark.batch_id
        {
            return Err(TargetDataError::new(
                "checkpoint.projection_watermark.batch_id",
                "legacy watermark does not match target mapping context",
            ));
        }
        let checkpoint = Self {
            schema_version: TARGET_DATA_SCHEMA_VERSION,
            job_id: context.job_id,
            request_id: legacy.request_id.clone(),
            conversation_id: context.conversation_id,
            source: context.source,
            reader: context.reader,
            wire_profile: context.wire_profile,
            cursor_kind: legacy_kind,
            cursor: context.cursor,
            segment: context.segment,
            reducer_state: context.reducer_state,
            projection_watermark: context.projection_watermark,
            completeness: legacy.completeness.into(),
            lineage_checkpoint: context.lineage_checkpoint,
        };
        checkpoint.validate()?;
        Ok(checkpoint)
    }
}

fn validate_source_ref(source_ref: &SourceRef, field: &'static str) -> Result<(), TargetDataError> {
    ensure_non_empty(&source_ref.source_identity, field)?;
    if source_ref.byte_start > source_ref.byte_end {
        return Err(TargetDataError::new(
            field,
            "byte_start must not exceed byte_end",
        ));
    }
    if source_ref.physical_line_ordinal == 0 {
        return Err(TargetDataError::new(
            field,
            "physical_line_ordinal must be positive",
        ));
    }
    if let Some(timestamp) = &source_ref.timestamp {
        ensure_non_empty(timestamp, field)?;
    }
    if let Some(item_type) = &source_ref.item_type {
        ensure_non_empty(item_type, field)?;
    }
    Ok(())
}

fn validate_source_ref_scope(
    source_ref: &SourceRef,
    source_id: &str,
    source_range: Option<TargetSourceByteRange>,
    field: &'static str,
) -> Result<(), TargetDataError> {
    if source_ref.source_identity == source_id
        && source_range.is_some_and(|range| {
            source_ref.byte_start < range.start || source_ref.byte_end > range.end
        })
    {
        return Err(TargetDataError::new(
            field,
            "source reference range exceeds batch source scope",
        ));
    }
    Ok(())
}

fn validate_history_base(
    history_base: &HistoryBaseRef,
    field: &'static str,
) -> Result<(), TargetDataError> {
    ensure_non_empty(&history_base.parent_rollout_id, field)
}

fn validate_replacement_shape(
    replacement: &LastTurnReplacement,
    field: &'static str,
) -> Result<(), TargetDataError> {
    ensure_non_empty(&replacement.replacement_key, field)?;
    ensure_non_empty(&replacement.conversation_id, field)?;
    ensure_non_empty(&replacement.parent_rollout_id, field)?;
    ensure_non_empty(&replacement.child_rollout_id, field)?;
    ensure_non_empty(&replacement.replaced_turn_id, field)?;
    ensure_non_empty(&replacement.replacement_turn_id, field)?;
    if replacement.parent_rollout_id == replacement.child_rollout_id {
        return Err(TargetDataError::new(
            field,
            "parent and child rollout IDs must differ",
        ));
    }
    if replacement.replaced_turn_id == replacement.replacement_turn_id {
        return Err(TargetDataError::new(
            field,
            "replaced and replacement turn IDs must differ",
        ));
    }
    if replacement.replaced_turn_terminal_status == crate::model::TurnStatus::Partial {
        return Err(TargetDataError::new(
            "mutation.replacement.replaced_turn_terminal_status",
            "replaced turn terminal status must be completed or interrupted",
        ));
    }
    let expected_key = LastTurnReplacement::stable_key(
        &replacement.conversation_id,
        &replacement.parent_rollout_id,
        &replacement.child_rollout_id,
        &replacement.replaced_turn_id,
        &replacement.replacement_turn_id,
    );
    if replacement.replacement_key != expected_key {
        return Err(TargetDataError::new(
            "mutation.replacement.replacement_key",
            "must match the stable replacement identity",
        ));
    }
    validate_history_base(&replacement.cut, "mutation.replacement.cut")?;
    if replacement.cut.parent_rollout_id != replacement.parent_rollout_id {
        return Err(TargetDataError::new(
            "mutation.replacement.cut.parent_rollout_id",
            "must match replacement parent_rollout_id",
        ));
    }
    validate_source_ref(
        &replacement.parent_turn_start_source_ref,
        "mutation.replacement.parent_turn_start_source_ref",
    )?;
    validate_source_ref(
        &replacement.parent_turn_terminal_source_ref,
        "mutation.replacement.parent_turn_terminal_source_ref",
    )?;
    validate_source_ref(
        &replacement.child_turn_start_source_ref,
        "mutation.replacement.child_turn_start_source_ref",
    )?;
    if replacement.parent_turn_start_source_ref.source_identity != replacement.parent_rollout_id
        || replacement.parent_turn_terminal_source_ref.source_identity
            != replacement.parent_rollout_id
        || replacement.child_turn_start_source_ref.source_identity != replacement.child_rollout_id
    {
        return Err(TargetDataError::new(
            field,
            "source evidence identities must match parent and child rollouts",
        ));
    }
    if replacement.parent_turn_start_source_ref.rollout_ordinal
        != Some(replacement.cut.end_ordinal_exclusive)
        || replacement.parent_turn_start_source_ref.byte_start != replacement.cut.end_byte_offset
    {
        return Err(TargetDataError::new(
            "mutation.replacement.parent_turn_start_source_ref",
            "parent turn start must match the history cut",
        ));
    }
    if replacement_source_sort_key(&replacement.parent_turn_terminal_source_ref)
        < replacement_source_sort_key(&replacement.parent_turn_start_source_ref)
    {
        return Err(TargetDataError::new(
            "mutation.replacement.parent_turn_terminal_source_ref",
            "parent turn terminal evidence must not precede its start",
        ));
    }
    Ok(())
}

fn replacement_source_sort_key(source_ref: &SourceRef) -> (u64, u64, u64) {
    (
        source_ref
            .rollout_ordinal
            .unwrap_or(source_ref.physical_line_ordinal),
        source_ref.physical_line_ordinal,
        source_ref.byte_start,
    )
}

fn validate_replacement_for_batch(
    replacement: &LastTurnReplacement,
    batch: &TargetAnalysisBatch,
) -> Result<(), TargetDataError> {
    validate_replacement_shape(replacement, "mutation.replacement")?;
    if replacement.conversation_id != batch.conversation_id {
        return Err(TargetDataError::new(
            "mutation.replacement.conversation_id",
            "must match batch conversation_id",
        ));
    }
    let _history_base = batch.history_base.as_ref().ok_or_else(|| {
        TargetDataError::new(
            "payload.history_base",
            "replacement evidence requires batch history_base",
        )
    })?;
    let transition = batch
        .lineage_transitions
        .iter()
        .find(|transition| {
            transition.parent_rollout_id == replacement.parent_rollout_id
                && transition.child_rollout_id == replacement.child_rollout_id
        })
        .ok_or_else(|| {
            TargetDataError::new(
                "mutation.replacement",
                "replacement evidence requires a matching lineage transition",
            )
        })?;
    if replacement.cut != transition.history_base {
        return Err(TargetDataError::new(
            "mutation.replacement.cut",
            "must match the corresponding lineage transition history_base",
        ));
    }
    Ok(())
}

fn validate_batch_evidence(
    completeness: TargetCompleteness,
    source_epoch: &str,
    batch: &TargetAnalysisBatch,
    field: &'static str,
) -> Result<(), TargetDataError> {
    if completeness != batch.completeness {
        return Err(TargetDataError::new(
            field,
            "completeness must match batch completeness",
        ));
    }
    ensure_non_empty(source_epoch, field)?;
    if source_epoch == "unbound" {
        return Err(TargetDataError::new(
            field,
            "source_epoch must not be unbound",
        ));
    }
    if source_epoch != batch.source_epoch {
        return Err(TargetDataError::new(
            field,
            "source_epoch must match batch source_epoch",
        ));
    }
    Ok(())
}

fn validate_projection(
    projection: &Value,
    completeness: TargetCompleteness,
) -> Result<(), TargetDataError> {
    let object = projection
        .as_object()
        .ok_or_else(|| TargetDataError::new("payload.projection", "must be a JSON object"))?;
    let coverage = object
        .get("coverage")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            TargetDataError::new(
                "payload.projection.coverage",
                "must be one of unknown, partial, or complete",
            )
        })?;
    if !matches!(coverage, "unknown" | "partial" | "complete") {
        return Err(TargetDataError::new(
            "payload.projection.coverage",
            "must be one of unknown, partial, or complete",
        ));
    }
    if completeness == TargetCompleteness::Canonical && coverage != "complete" {
        return Err(TargetDataError::new(
            "payload.projection.coverage",
            "canonical batch requires complete projection coverage",
        ));
    }
    Ok(())
}

fn validate_lineage_evidence(batch: &TargetAnalysisBatch) -> Result<(), TargetDataError> {
    let has_replacement_mutation = batch
        .mutations
        .iter()
        .any(|mutation| matches!(mutation, TargetMutation::ReplaceLastTurn { .. }));
    let has_lineage_evidence = batch.history_base.is_some()
        || !batch.lineage_transitions.is_empty()
        || batch.lineage_coverage.is_some()
        || batch.lineage_checkpoint.is_some()
        || !batch.replacements.is_empty()
        || has_replacement_mutation;
    if !has_lineage_evidence {
        return Ok(());
    }

    let history_base = batch.history_base.as_ref().ok_or_else(|| {
        TargetDataError::new(
            "payload.history_base",
            "lineage evidence requires history_base",
        )
    })?;
    validate_history_base(history_base, "payload.history_base")?;
    if batch.lineage_transitions.is_empty() {
        return Err(TargetDataError::new(
            "payload.lineage_transitions",
            "lineage evidence requires at least one transition",
        ));
    }
    if !batch
        .lineage_transitions
        .iter()
        .any(|transition| transition.history_base == *history_base)
    {
        return Err(TargetDataError::new(
            "payload.lineage_transitions",
            "must include the batch history_base transition",
        ));
    }
    let coverage = batch.lineage_coverage.as_ref().ok_or_else(|| {
        TargetDataError::new(
            "payload.lineage_coverage",
            "lineage evidence requires lineage coverage",
        )
    })?;
    coverage.validate()?;
    if batch.completeness == TargetCompleteness::Canonical && !coverage.complete {
        return Err(TargetDataError::new(
            "payload.lineage_coverage.complete",
            "canonical transition batch requires complete lineage coverage",
        ));
    }
    for transition in &batch.lineage_transitions {
        if !coverage
            .chain_rollout_ids
            .iter()
            .any(|rollout_id| rollout_id == &transition.parent_rollout_id)
            || !coverage
                .chain_rollout_ids
                .iter()
                .any(|rollout_id| rollout_id == &transition.child_rollout_id)
        {
            return Err(TargetDataError::new(
                "payload.lineage_coverage.chain_rollout_ids",
                "must include every lineage transition endpoint",
            ));
        }
    }

    let requires_validated_transitions = batch.completeness == TargetCompleteness::Canonical
        || has_replacement_mutation
        || batch.lineage_checkpoint.is_some();
    if requires_validated_transitions
        && batch.lineage_transitions.iter().any(|transition| {
            transition.validation_state != TargetLineageValidationState::Validated
        })
    {
        return Err(TargetDataError::new(
            "payload.lineage_transitions.validation_state",
            "canonical, replacement, and checkpoint lineage evidence requires validated transitions",
        ));
    }

    if let Some(checkpoint) = &batch.lineage_checkpoint
        && checkpoint.coverage != *coverage
    {
        return Err(TargetDataError::new(
            "payload.lineage_checkpoint.coverage",
            "must match validated batch lineage coverage",
        ));
    }

    if has_replacement_mutation && batch.replacements.is_empty() {
        return Err(TargetDataError::new(
            "payload.replacements",
            "replace_last_turn requires matching replacement evidence",
        ));
    }
    for replacement in &batch.replacements {
        validate_replacement_for_batch(replacement, batch)?;
        let matching_mutations = batch
            .mutations
            .iter()
            .filter(|mutation| {
                matches!(
                    mutation,
                    TargetMutation::ReplaceLastTurn { replacement: mutation_replacement }
                        if mutation_replacement.replacement_key == replacement.replacement_key
                )
            })
            .count();
        if matching_mutations != 1 {
            return Err(TargetDataError::new(
                "payload.replacements",
                "each replacement evidence entry must match exactly one mutation",
            ));
        }
    }
    for mutation in &batch.mutations {
        if let TargetMutation::ReplaceLastTurn { replacement } = mutation {
            let matching_replacements = batch
                .replacements
                .iter()
                .filter(|candidate| candidate.replacement_key == replacement.replacement_key)
                .count();
            if matching_replacements != 1 {
                return Err(TargetDataError::new(
                    "payload.replacements",
                    "each replace_last_turn mutation must match exactly one replacement entry",
                ));
            }
        }
    }
    Ok(())
}

fn ensure_non_empty(value: &str, field: &'static str) -> Result<(), TargetDataError> {
    if value.trim().is_empty() {
        return Err(TargetDataError::new(field, "must not be empty"));
    }
    Ok(())
}

fn validate_date(value: &str, field: &'static str) -> Result<(), TargetDataError> {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes
            .iter()
            .enumerate()
            .any(|(index, byte)| (index != 4 && index != 7) && !byte.is_ascii_digit())
    {
        return Err(TargetDataError::new(field, "must use YYYY-MM-DD format"));
    }
    Ok(())
}
