use std::fmt;

use serde::{Deserialize, Serialize, de::Error as _};

use super::read_plan::{SourceByteRange, SourceCapabilities, SourceCapability};
use super::record::{
    SnapshotBoundary, SourceCompression, SourceFingerprint, SourceKind, SourcePrefixAnchor,
    SourceSpec,
};

/// Version of the persisted source cursor shape.
pub const CURSOR_SCHEMA_VERSION: u16 = 1;

/// Stable reader identity carried by every cursor until a dedicated backend
/// versioning contract is introduced.
pub const CURSOR_READER_BACKEND: &str = "jsonl_source_backend";
pub const CURSOR_READER_VERSION: &str = "read_plan_v1";

/// Cursor kinds are deliberately represented by separate Rust types below.
/// This enum is the serialized discriminator and must never be inferred from
/// the physical range alone.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceCursorKind {
    TailPreview,
    Backfill,
    ForwardAppend,
}

impl SourceCursorKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::TailPreview => "tail_preview",
            Self::Backfill => "backfill",
            Self::ForwardAppend => "forward_append",
        }
    }

    const fn required_capability(self) -> SourceCapability {
        match self {
            Self::TailPreview => SourceCapability::TailPreview,
            Self::Backfill => SourceCapability::BackwardSegments,
            Self::ForwardAppend => SourceCapability::Append,
        }
    }
}

/// Errors raised before a cursor can be persisted or used as an append input.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CursorError {
    SchemaVersionMismatch {
        expected: u16,
        actual: u16,
    },
    EmptyTargetConversationId,
    EmptySourceId,
    EmptySourceEpoch,
    EmptyReaderBackend,
    EmptyReaderVersion,
    MissingFingerprint,
    InvalidFingerprint,
    MissingPrefixAnchor,
    InvalidPrefixAnchor,
    InvalidRange {
        start: u64,
        end: u64,
    },
    RangeBeyondSnapshot {
        end: u64,
        snapshot: u64,
    },
    FingerprintCoverageMismatch {
        covered: u64,
        snapshot: u64,
    },
    PrefixAnchorRangeMismatch {
        anchor_end: u64,
        range_end: u64,
    },
    MissingLastCompleteLine,
    InvalidLastCompleteLine,
    LineAnchorRangeMismatch {
        line_start: u64,
        line_end: u64,
        range_start: u64,
        range_end: u64,
    },
    InvalidRolloutOrdinal,
    CapabilityUnavailable {
        cursor_kind: SourceCursorKind,
        capability: SourceCapability,
    },
    UnsupportedCompression {
        cursor_kind: SourceCursorKind,
        compression: SourceCompression,
    },
    AppendMustStartAtZero {
        start: u64,
    },
    AppendMustEndAtSnapshot {
        end: u64,
        snapshot: u64,
    },
    CursorKindMismatch {
        expected: SourceCursorKind,
        actual: SourceCursorKind,
    },
    SourceIdMismatch {
        expected: String,
        actual: String,
    },
    TargetConversationMismatch {
        expected: String,
        actual: String,
    },
    SourceKindMismatch {
        expected: SourceKind,
        actual: SourceKind,
    },
    CompressionMismatch {
        expected: SourceCompression,
        actual: SourceCompression,
    },
    SourceEpochMismatch {
        expected: String,
        actual: String,
    },
    FingerprintMismatch,
    PrefixAnchorMismatch,
    SnapshotTooSmall {
        required: u64,
        observed: u64,
    },
    ReaderBackendMismatch {
        expected: String,
        actual: String,
    },
    ReaderVersionMismatch {
        expected: String,
        actual: String,
    },
    PromotionNotSafe {
        reason: String,
    },
}

impl fmt::Display for CursorError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SchemaVersionMismatch { expected, actual } => {
                write!(
                    formatter,
                    "cursor schema version {actual} is not supported; expected {expected}"
                )
            }
            Self::EmptyTargetConversationId => {
                write!(formatter, "cursor target conversation ID must not be empty")
            }
            Self::EmptySourceId => write!(formatter, "cursor source ID must not be empty"),
            Self::EmptySourceEpoch => write!(formatter, "cursor source epoch must not be empty"),
            Self::EmptyReaderBackend => {
                write!(formatter, "cursor reader backend must not be empty")
            }
            Self::EmptyReaderVersion => {
                write!(formatter, "cursor reader version must not be empty")
            }
            Self::MissingFingerprint => write!(formatter, "cursor requires a source fingerprint"),
            Self::InvalidFingerprint => write!(formatter, "cursor source fingerprint is invalid"),
            Self::MissingPrefixAnchor => {
                write!(formatter, "cursor requires a source prefix anchor")
            }
            Self::InvalidPrefixAnchor => {
                write!(formatter, "cursor source prefix anchor is invalid")
            }
            Self::InvalidRange { start, end } => {
                write!(formatter, "cursor range {start}..{end} is invalid")
            }
            Self::RangeBeyondSnapshot { end, snapshot } => {
                write!(
                    formatter,
                    "cursor range end {end} exceeds snapshot {snapshot}"
                )
            }
            Self::FingerprintCoverageMismatch { covered, snapshot } => write!(
                formatter,
                "cursor fingerprint covers {covered} bytes but snapshot is {snapshot} bytes"
            ),
            Self::PrefixAnchorRangeMismatch {
                anchor_end,
                range_end,
            } => write!(
                formatter,
                "cursor prefix anchor ends at {anchor_end}, not range end {range_end}"
            ),
            Self::MissingLastCompleteLine => {
                write!(
                    formatter,
                    "non-empty cursor range requires a complete line anchor"
                )
            }
            Self::InvalidLastCompleteLine => {
                write!(formatter, "cursor complete line anchor is invalid")
            }
            Self::LineAnchorRangeMismatch {
                line_start,
                line_end,
                range_start,
                range_end,
            } => write!(
                formatter,
                "cursor line anchor {line_start}..{line_end} is outside range {range_start}..{range_end}"
            ),
            Self::InvalidRolloutOrdinal => {
                write!(formatter, "cursor rollout ordinal must be positive")
            }
            Self::CapabilityUnavailable {
                cursor_kind,
                capability,
            } => write!(
                formatter,
                "cursor kind {} requires capability {}",
                cursor_kind.as_str(),
                capability.as_str()
            ),
            Self::UnsupportedCompression {
                cursor_kind,
                compression,
            } => write!(
                formatter,
                "cursor kind {} is unsupported for {}",
                cursor_kind.as_str(),
                compression.as_str()
            ),
            Self::AppendMustStartAtZero { start } => {
                write!(
                    formatter,
                    "forward append cursor must start at byte zero, got {start}"
                )
            }
            Self::AppendMustEndAtSnapshot { end, snapshot } => write!(
                formatter,
                "forward append cursor ends at {end}, not snapshot boundary {snapshot}"
            ),
            Self::CursorKindMismatch { expected, actual } => write!(
                formatter,
                "cursor kind {} cannot be used as {}",
                actual.as_str(),
                expected.as_str()
            ),
            Self::SourceIdMismatch { expected, actual } => {
                write!(
                    formatter,
                    "cursor source ID mismatch: expected {expected}, got {actual}"
                )
            }
            Self::TargetConversationMismatch { expected, actual } => write!(
                formatter,
                "cursor target conversation mismatch: expected {expected}, got {actual}"
            ),
            Self::SourceKindMismatch { expected, actual } => write!(
                formatter,
                "cursor source kind mismatch: expected {}, got {}",
                expected.as_str(),
                actual.as_str()
            ),
            Self::CompressionMismatch { expected, actual } => write!(
                formatter,
                "cursor compression mismatch: expected {}, got {}",
                expected.as_str(),
                actual.as_str()
            ),
            Self::SourceEpochMismatch { expected, actual } => write!(
                formatter,
                "cursor source epoch mismatch: expected {expected}, got {actual}"
            ),
            Self::FingerprintMismatch => write!(formatter, "cursor source fingerprint mismatch"),
            Self::PrefixAnchorMismatch => write!(formatter, "cursor source prefix anchor mismatch"),
            Self::SnapshotTooSmall { required, observed } => write!(
                formatter,
                "observed source snapshot {observed} is smaller than cursor boundary {required}"
            ),
            Self::ReaderBackendMismatch { expected, actual } => write!(
                formatter,
                "cursor reader backend mismatch: expected {expected}, got {actual}"
            ),
            Self::ReaderVersionMismatch { expected, actual } => write!(
                formatter,
                "cursor reader version mismatch: expected {expected}, got {actual}"
            ),
            Self::PromotionNotSafe { reason } => {
                write!(formatter, "forward append promotion is not safe: {reason}")
            }
        }
    }
}

impl std::error::Error for CursorError {}

/// Hash and physical location of the last complete JSONL line in a cursor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompleteLineAnchor {
    algorithm: String,
    digest: String,
    physical_line_ordinal: u64,
    byte_start: u64,
    byte_end: u64,
}

impl CompleteLineAnchor {
    pub fn new(
        algorithm: impl Into<String>,
        digest: impl Into<String>,
        physical_line_ordinal: u64,
        byte_start: u64,
        byte_end: u64,
    ) -> Result<Self, CursorError> {
        let algorithm = algorithm.into();
        let digest = digest.into();
        if algorithm.is_empty()
            || digest.is_empty()
            || physical_line_ordinal == 0
            || byte_start >= byte_end
        {
            return Err(CursorError::InvalidLastCompleteLine);
        }
        Ok(Self {
            algorithm,
            digest,
            physical_line_ordinal,
            byte_start,
            byte_end,
        })
    }

    pub fn algorithm(&self) -> &str {
        &self.algorithm
    }

    pub fn digest(&self) -> &str {
        &self.digest
    }

    pub const fn physical_line_ordinal(&self) -> u64 {
        self.physical_line_ordinal
    }

    pub const fn byte_start(&self) -> u64 {
        self.byte_start
    }

    pub const fn byte_end(&self) -> u64 {
        self.byte_end
    }
}

/// Serializable, validated metadata shared by the three cursor types.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CursorMetadata {
    schema_version: u16,
    reader_backend: String,
    reader_version: String,
    #[serde(rename = "cursor_kind")]
    cursor_kind: SourceCursorKind,
    target_conversation_id: String,
    source_id: String,
    source_kind: SourceKind,
    compression: SourceCompression,
    source_epoch: String,
    fingerprint: SourceFingerprint,
    prefix_anchor: SourcePrefixAnchor,
    snapshot_boundary: SnapshotBoundary,
    complete_range: SourceByteRange,
    last_complete_line: Option<CompleteLineAnchor>,
    last_rollout_ordinal: Option<u64>,
    capabilities: SourceCapabilities,
}

#[derive(Debug, Deserialize)]
struct CursorMetadataWire {
    schema_version: u16,
    reader_backend: String,
    reader_version: String,
    #[serde(rename = "cursor_kind")]
    cursor_kind: SourceCursorKind,
    target_conversation_id: String,
    source_id: String,
    source_kind: SourceKind,
    compression: SourceCompression,
    source_epoch: String,
    fingerprint: SourceFingerprint,
    prefix_anchor: SourcePrefixAnchor,
    snapshot_boundary: SnapshotBoundary,
    complete_range: SourceByteRange,
    last_complete_line: Option<CompleteLineAnchor>,
    last_rollout_ordinal: Option<u64>,
    capabilities: SourceCapabilities,
}

impl<'de> Deserialize<'de> for CursorMetadata {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let wire = CursorMetadataWire::deserialize(deserializer)?;
        let metadata = Self {
            schema_version: wire.schema_version,
            reader_backend: wire.reader_backend,
            reader_version: wire.reader_version,
            cursor_kind: wire.cursor_kind,
            target_conversation_id: wire.target_conversation_id,
            source_id: wire.source_id,
            source_kind: wire.source_kind,
            compression: wire.compression,
            source_epoch: wire.source_epoch,
            fingerprint: wire.fingerprint,
            prefix_anchor: wire.prefix_anchor,
            snapshot_boundary: wire.snapshot_boundary,
            complete_range: wire.complete_range,
            last_complete_line: wire.last_complete_line,
            last_rollout_ordinal: wire.last_rollout_ordinal,
            capabilities: wire.capabilities,
        };
        metadata.validate().map_err(D::Error::custom)?;
        Ok(metadata)
    }
}

impl CursorMetadata {
    #[allow(clippy::too_many_arguments)]
    fn from_source(
        spec: &SourceSpec,
        cursor_kind: SourceCursorKind,
        snapshot_boundary: SnapshotBoundary,
        complete_range: SourceByteRange,
        last_complete_line: Option<CompleteLineAnchor>,
        last_rollout_ordinal: Option<u64>,
    ) -> Result<Self, CursorError> {
        let target_conversation_id = spec
            .target_conversation_id()
            .ok_or(CursorError::EmptyTargetConversationId)?
            .to_string();
        let source_epoch = spec
            .source_epoch()
            .ok_or(CursorError::EmptySourceEpoch)?
            .to_string();
        let fingerprint = spec
            .fingerprint()
            .cloned()
            .ok_or(CursorError::MissingFingerprint)?;
        let prefix_anchor = spec
            .prefix_anchor()
            .cloned()
            .ok_or(CursorError::MissingPrefixAnchor)?;
        let metadata = Self {
            schema_version: CURSOR_SCHEMA_VERSION,
            reader_backend: CURSOR_READER_BACKEND.to_string(),
            reader_version: CURSOR_READER_VERSION.to_string(),
            cursor_kind,
            target_conversation_id,
            source_id: spec.source_id().to_string(),
            source_kind: spec.source_kind(),
            compression: spec.compression(),
            source_epoch,
            fingerprint,
            prefix_anchor,
            snapshot_boundary,
            complete_range,
            last_complete_line,
            last_rollout_ordinal,
            capabilities: spec.capabilities(),
        };
        metadata.validate_for_kind(cursor_kind)?;
        Ok(metadata)
    }

    pub fn validate(&self) -> Result<(), CursorError> {
        self.validate_for_kind(self.cursor_kind)
    }

    fn validate_for_kind(&self, expected_kind: SourceCursorKind) -> Result<(), CursorError> {
        if self.cursor_kind != expected_kind {
            return Err(CursorError::CursorKindMismatch {
                expected: expected_kind,
                actual: self.cursor_kind,
            });
        }
        if self.schema_version != CURSOR_SCHEMA_VERSION {
            return Err(CursorError::SchemaVersionMismatch {
                expected: CURSOR_SCHEMA_VERSION,
                actual: self.schema_version,
            });
        }
        if self.target_conversation_id.is_empty() {
            return Err(CursorError::EmptyTargetConversationId);
        }
        if self.source_id.is_empty() {
            return Err(CursorError::EmptySourceId);
        }
        if self.source_epoch.is_empty() {
            return Err(CursorError::EmptySourceEpoch);
        }
        if self.reader_backend.is_empty() {
            return Err(CursorError::EmptyReaderBackend);
        }
        if self.reader_version.is_empty() {
            return Err(CursorError::EmptyReaderVersion);
        }
        if self.fingerprint.algorithm().is_empty() || self.fingerprint.digest().is_empty() {
            return Err(CursorError::InvalidFingerprint);
        }
        if self.prefix_anchor.algorithm().is_empty() || self.prefix_anchor.digest().is_empty() {
            return Err(CursorError::InvalidPrefixAnchor);
        }

        let snapshot = self.snapshot_boundary.byte_length();
        let range = self.complete_range;
        if range.start() > range.end() {
            return Err(CursorError::InvalidRange {
                start: range.start(),
                end: range.end(),
            });
        }
        if range.end() > snapshot {
            return Err(CursorError::RangeBeyondSnapshot {
                end: range.end(),
                snapshot,
            });
        }
        if self.fingerprint.covered_bytes() != snapshot {
            return Err(CursorError::FingerprintCoverageMismatch {
                covered: self.fingerprint.covered_bytes(),
                snapshot,
            });
        }
        if self.prefix_anchor.end_offset() != range.end()
            || self.prefix_anchor.end_offset() > snapshot
        {
            return Err(CursorError::PrefixAnchorRangeMismatch {
                anchor_end: self.prefix_anchor.end_offset(),
                range_end: range.end(),
            });
        }
        if range.is_empty() {
            if self.last_complete_line.is_some() {
                return Err(CursorError::InvalidLastCompleteLine);
            }
        } else {
            let line = self
                .last_complete_line
                .as_ref()
                .ok_or(CursorError::MissingLastCompleteLine)?;
            if line.algorithm().is_empty()
                || line.digest().is_empty()
                || line.physical_line_ordinal() == 0
                || line.byte_start() >= line.byte_end()
            {
                return Err(CursorError::InvalidLastCompleteLine);
            }
            if line.byte_start() < range.start()
                || line.byte_end() > range.end()
                || line.byte_end() != range.end()
            {
                return Err(CursorError::LineAnchorRangeMismatch {
                    line_start: line.byte_start(),
                    line_end: line.byte_end(),
                    range_start: range.start(),
                    range_end: range.end(),
                });
            }
        }
        if self.last_rollout_ordinal == Some(0) {
            return Err(CursorError::InvalidRolloutOrdinal);
        }

        if self.compression == SourceCompression::Zstd
            && expected_kind == SourceCursorKind::ForwardAppend
        {
            return Err(CursorError::UnsupportedCompression {
                cursor_kind: expected_kind,
                compression: self.compression,
            });
        }
        let required_capability = expected_kind.required_capability();
        if !self.capabilities.supports(required_capability) {
            return Err(CursorError::CapabilityUnavailable {
                cursor_kind: expected_kind,
                capability: required_capability,
            });
        }
        if expected_kind == SourceCursorKind::ForwardAppend {
            if !self.capabilities.supports(SourceCapability::RandomSeek) {
                return Err(CursorError::CapabilityUnavailable {
                    cursor_kind: expected_kind,
                    capability: SourceCapability::RandomSeek,
                });
            }
            if range.start() != 0 {
                return Err(CursorError::AppendMustStartAtZero {
                    start: range.start(),
                });
            }
            if range.end() != snapshot {
                return Err(CursorError::AppendMustEndAtSnapshot {
                    end: range.end(),
                    snapshot,
                });
            }
        }
        Ok(())
    }

    /// Validate the cursor against a caller-selected source binding and a
    /// newly observed physical size. Growth is allowed; shrinkage is not.
    pub fn validate_against(
        &self,
        spec: &SourceSpec,
        observed_snapshot: SnapshotBoundary,
    ) -> Result<(), CursorError> {
        self.validate()?;
        if self.reader_backend != CURSOR_READER_BACKEND {
            return Err(CursorError::ReaderBackendMismatch {
                expected: CURSOR_READER_BACKEND.to_string(),
                actual: self.reader_backend.clone(),
            });
        }
        if self.reader_version != CURSOR_READER_VERSION {
            return Err(CursorError::ReaderVersionMismatch {
                expected: CURSOR_READER_VERSION.to_string(),
                actual: self.reader_version.clone(),
            });
        }
        if spec.source_id() != self.source_id {
            return Err(CursorError::SourceIdMismatch {
                expected: self.source_id.clone(),
                actual: spec.source_id().to_string(),
            });
        }
        let target = spec
            .target_conversation_id()
            .ok_or(CursorError::EmptyTargetConversationId)?;
        if target != self.target_conversation_id {
            return Err(CursorError::TargetConversationMismatch {
                expected: self.target_conversation_id.clone(),
                actual: target.to_string(),
            });
        }
        if spec.source_kind() != self.source_kind {
            return Err(CursorError::SourceKindMismatch {
                expected: self.source_kind,
                actual: spec.source_kind(),
            });
        }
        if spec.compression() != self.compression {
            return Err(CursorError::CompressionMismatch {
                expected: self.compression,
                actual: spec.compression(),
            });
        }
        let epoch = spec.source_epoch().ok_or(CursorError::EmptySourceEpoch)?;
        if epoch != self.source_epoch {
            return Err(CursorError::SourceEpochMismatch {
                expected: self.source_epoch.clone(),
                actual: epoch.to_string(),
            });
        }
        if spec.fingerprint() != Some(&self.fingerprint) {
            return Err(CursorError::FingerprintMismatch);
        }
        if spec.prefix_anchor() != Some(&self.prefix_anchor) {
            return Err(CursorError::PrefixAnchorMismatch);
        }
        if !spec
            .capabilities()
            .supports(self.cursor_kind.required_capability())
        {
            return Err(CursorError::CapabilityUnavailable {
                cursor_kind: self.cursor_kind,
                capability: self.cursor_kind.required_capability(),
            });
        }
        let required = self.snapshot_boundary.byte_length();
        if observed_snapshot.byte_length() < required {
            return Err(CursorError::SnapshotTooSmall {
                required,
                observed: observed_snapshot.byte_length(),
            });
        }
        Ok(())
    }

    pub const fn schema_version(&self) -> u16 {
        self.schema_version
    }

    pub fn reader_backend(&self) -> &str {
        &self.reader_backend
    }

    pub fn reader_version(&self) -> &str {
        &self.reader_version
    }

    pub const fn cursor_kind(&self) -> SourceCursorKind {
        self.cursor_kind
    }

    pub fn target_conversation_id(&self) -> &str {
        &self.target_conversation_id
    }

    pub fn source_id(&self) -> &str {
        &self.source_id
    }

    pub const fn source_kind(&self) -> SourceKind {
        self.source_kind
    }

    pub const fn compression(&self) -> SourceCompression {
        self.compression
    }

    pub fn source_epoch(&self) -> &str {
        &self.source_epoch
    }

    pub fn fingerprint(&self) -> &SourceFingerprint {
        &self.fingerprint
    }

    pub fn prefix_anchor(&self) -> &SourcePrefixAnchor {
        &self.prefix_anchor
    }

    pub const fn snapshot_boundary(&self) -> SnapshotBoundary {
        self.snapshot_boundary
    }

    pub const fn complete_range(&self) -> SourceByteRange {
        self.complete_range
    }

    pub fn last_complete_line(&self) -> Option<&CompleteLineAnchor> {
        self.last_complete_line.as_ref()
    }

    pub const fn last_rollout_ordinal(&self) -> Option<u64> {
        self.last_rollout_ordinal
    }

    pub const fn capabilities(&self) -> SourceCapabilities {
        self.capabilities
    }
}

fn deserialize_cursor_metadata<'de, D>(deserializer: D) -> Result<CursorMetadata, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let metadata = CursorMetadata::deserialize(deserializer)?;
    metadata.validate().map_err(D::Error::custom)?;
    Ok(metadata)
}

/// A cursor that only describes an observed tail segment.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(transparent)]
pub struct TailPreviewCursor {
    metadata: CursorMetadata,
}

impl<'de> Deserialize<'de> for TailPreviewCursor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let metadata = deserialize_cursor_metadata(deserializer)?;
        Self::from_metadata(metadata).map_err(D::Error::custom)
    }
}

impl TailPreviewCursor {
    pub fn from_source(
        spec: &SourceSpec,
        snapshot_boundary: SnapshotBoundary,
        complete_range: SourceByteRange,
        last_complete_line: Option<CompleteLineAnchor>,
        last_rollout_ordinal: Option<u64>,
    ) -> Result<Self, CursorError> {
        Self::from_metadata(CursorMetadata::from_source(
            spec,
            SourceCursorKind::TailPreview,
            snapshot_boundary,
            complete_range,
            last_complete_line,
            last_rollout_ordinal,
        )?)
    }

    pub fn from_metadata(metadata: CursorMetadata) -> Result<Self, CursorError> {
        metadata.validate_for_kind(SourceCursorKind::TailPreview)?;
        Ok(Self { metadata })
    }

    pub fn metadata(&self) -> &CursorMetadata {
        &self.metadata
    }

    pub fn validate_against(
        &self,
        spec: &SourceSpec,
        observed_snapshot: SnapshotBoundary,
    ) -> Result<(), CursorError> {
        self.metadata.validate_against(spec, observed_snapshot)
    }

    pub fn try_into_forward_append(self) -> Result<ForwardAppendCursor, CursorError> {
        Err(CursorError::CursorKindMismatch {
            expected: SourceCursorKind::ForwardAppend,
            actual: self.metadata.cursor_kind,
        })
    }
}

/// A cursor that describes an ordered historical backfill segment.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(transparent)]
pub struct BackfillCursor {
    metadata: CursorMetadata,
}

impl<'de> Deserialize<'de> for BackfillCursor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let metadata = deserialize_cursor_metadata(deserializer)?;
        Self::from_metadata(metadata).map_err(D::Error::custom)
    }
}

impl BackfillCursor {
    pub fn from_source(
        spec: &SourceSpec,
        snapshot_boundary: SnapshotBoundary,
        complete_range: SourceByteRange,
        last_complete_line: Option<CompleteLineAnchor>,
        last_rollout_ordinal: Option<u64>,
    ) -> Result<Self, CursorError> {
        Self::from_metadata(CursorMetadata::from_source(
            spec,
            SourceCursorKind::Backfill,
            snapshot_boundary,
            complete_range,
            last_complete_line,
            last_rollout_ordinal,
        )?)
    }

    pub fn from_metadata(metadata: CursorMetadata) -> Result<Self, CursorError> {
        metadata.validate_for_kind(SourceCursorKind::Backfill)?;
        Ok(Self { metadata })
    }

    pub fn metadata(&self) -> &CursorMetadata {
        &self.metadata
    }

    pub fn validate_against(
        &self,
        spec: &SourceSpec,
        observed_snapshot: SnapshotBoundary,
    ) -> Result<(), CursorError> {
        self.metadata.validate_against(spec, observed_snapshot)
    }

    pub fn try_into_forward_append(self) -> Result<ForwardAppendCursor, CursorError> {
        Err(CursorError::CursorKindMismatch {
            expected: SourceCursorKind::ForwardAppend,
            actual: self.metadata.cursor_kind,
        })
    }
}

/// A cursor that proves a complete plain-JSONL prefix is safe for append.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(transparent)]
pub struct ForwardAppendCursor {
    metadata: CursorMetadata,
}

impl<'de> Deserialize<'de> for ForwardAppendCursor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let metadata = deserialize_cursor_metadata(deserializer)?;
        Self::from_metadata(metadata).map_err(D::Error::custom)
    }
}

impl ForwardAppendCursor {
    pub fn from_source(
        spec: &SourceSpec,
        snapshot_boundary: SnapshotBoundary,
        complete_range: SourceByteRange,
        last_complete_line: Option<CompleteLineAnchor>,
        last_rollout_ordinal: Option<u64>,
    ) -> Result<Self, CursorError> {
        Self::from_metadata(CursorMetadata::from_source(
            spec,
            SourceCursorKind::ForwardAppend,
            snapshot_boundary,
            complete_range,
            last_complete_line,
            last_rollout_ordinal,
        )?)
    }

    pub fn from_metadata(metadata: CursorMetadata) -> Result<Self, CursorError> {
        metadata.validate_for_kind(SourceCursorKind::ForwardAppend)?;
        Ok(Self { metadata })
    }

    pub fn metadata(&self) -> &CursorMetadata {
        &self.metadata
    }

    pub fn validate_against(
        &self,
        spec: &SourceSpec,
        observed_snapshot: SnapshotBoundary,
    ) -> Result<(), CursorError> {
        self.metadata.validate_against(spec, observed_snapshot)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        BackfillCursor, CompleteLineAnchor, CursorError, CursorMetadata, ForwardAppendCursor,
        SourceCursorKind, TailPreviewCursor,
    };
    use crate::source::{
        SnapshotBoundary, SourceByteRange, SourceFingerprint, SourcePrefixAnchor, SourceSpec,
    };

    fn spec(path: &str, snapshot: u64, fingerprint: &str, anchor_end: u64) -> SourceSpec {
        SourceSpec::bind("conversation-1", "source-1", path)
            .expect("source binding")
            .with_source_epoch("epoch-1")
            .expect("source epoch")
            .with_fingerprint(
                SourceFingerprint::new("sha256-v1", fingerprint, snapshot).expect("fingerprint"),
            )
            .with_prefix_anchor(
                SourcePrefixAnchor::new("sha256-v1", "anchor", anchor_end).expect("prefix anchor"),
            )
    }

    fn line(start: u64, end: u64) -> CompleteLineAnchor {
        CompleteLineAnchor::new("sha256-v1", "line", 2, start, end).expect("line anchor")
    }

    #[test]
    fn cursor_round_trip_preserves_kind_and_resume_metadata() {
        let spec = spec("rollout.jsonl", 16, "file", 16);
        let cursor = TailPreviewCursor::from_source(
            &spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(8, 16).expect("range"),
            Some(line(8, 16)),
            Some(4),
        )
        .expect("tail cursor");
        let encoded = serde_json::to_string(&cursor).expect("cursor serializes");
        assert!(encoded.contains("\"cursor_kind\":\"tail_preview\""));
        assert!(encoded.contains("\"source_epoch\":\"epoch-1\""));

        let restored: TailPreviewCursor =
            serde_json::from_str(&encoded).expect("cursor deserializes");
        assert_eq!(cursor, restored);
        assert_eq!(
            restored.metadata().cursor_kind(),
            SourceCursorKind::TailPreview
        );
        assert_eq!(restored.metadata().complete_range().end(), 16);
        assert_eq!(restored.metadata().last_rollout_ordinal(), Some(4));
    }

    #[test]
    fn serialized_cursor_kind_cannot_be_reinterpreted_as_another_type() {
        let spec = spec("rollout.jsonl", 16, "file", 16);
        let cursor = TailPreviewCursor::from_source(
            &spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(8, 16).expect("range"),
            Some(line(8, 16)),
            None,
        )
        .expect("tail cursor");
        let mut encoded = serde_json::to_value(cursor).expect("cursor value");
        encoded["cursor_kind"] = json!("backfill");
        assert!(serde_json::from_value::<TailPreviewCursor>(encoded).is_err());
    }

    #[test]
    fn metadata_deserialization_is_fail_closed_on_invalid_range() {
        let spec = spec("rollout.jsonl", 16, "file", 16);
        let cursor = ForwardAppendCursor::from_source(
            &spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 16).expect("range"),
            Some(line(8, 16)),
            None,
        )
        .expect("forward cursor");
        let mut encoded = serde_json::to_value(cursor.metadata()).expect("metadata value");
        encoded["complete_range"]["end"] = json!(32);
        assert!(serde_json::from_value::<CursorMetadata>(encoded).is_err());
    }

    #[test]
    fn tail_and_backfill_cursors_fail_closed_when_used_as_append() {
        let tail_spec = spec("rollout.jsonl", 16, "file", 16);
        let tail = TailPreviewCursor::from_source(
            &tail_spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(8, 16).expect("range"),
            Some(line(8, 16)),
            None,
        )
        .expect("tail cursor");
        assert!(matches!(
            tail.try_into_forward_append(),
            Err(CursorError::CursorKindMismatch {
                expected: SourceCursorKind::ForwardAppend,
                actual: SourceCursorKind::TailPreview,
            })
        ));

        let backfill_spec = spec("rollout.jsonl", 16, "file", 8);
        let backfill = BackfillCursor::from_source(
            &backfill_spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 8).expect("range"),
            Some(line(0, 8)),
            None,
        )
        .expect("backfill cursor");
        assert!(matches!(
            backfill.try_into_forward_append(),
            Err(CursorError::CursorKindMismatch {
                expected: SourceCursorKind::ForwardAppend,
                actual: SourceCursorKind::Backfill,
            })
        ));
    }

    #[test]
    fn forward_cursor_requires_plain_complete_snapshot_prefix() {
        let incomplete_spec = spec("rollout.jsonl", 16, "file", 8);
        let incomplete = ForwardAppendCursor::from_source(
            &incomplete_spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 8).expect("range"),
            Some(line(0, 8)),
            None,
        )
        .expect_err("incomplete prefix must not become append cursor");
        assert!(matches!(
            incomplete,
            CursorError::AppendMustEndAtSnapshot {
                end: 8,
                snapshot: 16
            }
        ));

        let wrong_line = ForwardAppendCursor::from_source(
            &spec("rollout.jsonl", 16, "file", 16),
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 16).expect("range"),
            Some(line(0, 8)),
            None,
        )
        .expect_err("last line must end at append boundary");
        assert!(matches!(
            wrong_line,
            CursorError::LineAnchorRangeMismatch { .. }
        ));
    }

    #[test]
    fn zstd_never_produces_a_seekable_decompressed_append_cursor() {
        let spec = spec("rollout.jsonl.zst", 16, "file", 16);
        let error = ForwardAppendCursor::from_source(
            &spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 16).expect("range"),
            Some(line(0, 16)),
            None,
        )
        .expect_err("ordinary zstd cannot create append cursor");
        assert!(matches!(
            error,
            CursorError::UnsupportedCompression {
                cursor_kind: SourceCursorKind::ForwardAppend,
                ..
            }
        ));
    }

    #[test]
    fn append_validation_rejects_fingerprint_anchor_and_source_shrink() {
        let original_spec = spec("rollout.jsonl", 16, "file-a", 16);
        let cursor = ForwardAppendCursor::from_source(
            &original_spec,
            SnapshotBoundary::new(16),
            SourceByteRange::new(0, 16).expect("range"),
            Some(line(8, 16)),
            Some(4),
        )
        .expect("forward cursor");

        let fingerprint_changed = spec("rollout.jsonl", 16, "file-b", 16);
        assert!(matches!(
            cursor.validate_against(&fingerprint_changed, SnapshotBoundary::new(16)),
            Err(CursorError::FingerprintMismatch)
        ));

        let anchor_changed = SourceSpec::bind("conversation-1", "source-1", "rollout.jsonl")
            .expect("source binding")
            .with_source_epoch("epoch-1")
            .expect("source epoch")
            .with_fingerprint(
                SourceFingerprint::new("sha256-v1", "file-a", 16).expect("fingerprint"),
            )
            .with_prefix_anchor(
                SourcePrefixAnchor::new("sha256-v1", "different-anchor", 16)
                    .expect("prefix anchor"),
            );
        assert!(matches!(
            cursor.validate_against(&anchor_changed, SnapshotBoundary::new(16)),
            Err(CursorError::PrefixAnchorMismatch)
        ));

        assert!(matches!(
            cursor.validate_against(&original_spec, SnapshotBoundary::new(8)),
            Err(CursorError::SnapshotTooSmall {
                required: 16,
                observed: 8
            })
        ));
        assert!(
            cursor
                .validate_against(&original_spec, SnapshotBoundary::new(32))
                .is_ok()
        );
    }

    #[test]
    fn backfill_validation_rejects_shrink_before_original_snapshot_boundary() {
        let original_spec = spec("rollout.jsonl", 100, "file-a", 50);
        let cursor = BackfillCursor::from_source(
            &original_spec,
            SnapshotBoundary::new(100),
            SourceByteRange::new(0, 50).expect("range"),
            Some(line(0, 50)),
            None,
        )
        .expect("backfill cursor");

        assert!(matches!(
            cursor.validate_against(&original_spec, SnapshotBoundary::new(75)),
            Err(CursorError::SnapshotTooSmall {
                required: 100,
                observed: 75
            })
        ));
        assert!(
            cursor
                .validate_against(&original_spec, SnapshotBoundary::new(128))
                .is_ok()
        );
    }
}
