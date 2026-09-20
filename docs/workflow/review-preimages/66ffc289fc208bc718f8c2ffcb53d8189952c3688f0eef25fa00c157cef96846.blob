use std::{cmp::Ordering, fmt};

use serde::{Deserialize, Serialize};

use super::{
    CompleteLineAnchor, CursorError, ForwardAppendCursor, SnapshotBoundary, SourceByteRange,
    SourceCompression, SourceRecord, SourceSpec,
};
use crate::source::digest::{SHA256_ALGORITHM, digest_bytes, digest_file_range};

/// Completeness of one physical segment or of an assembled input.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SegmentCompleteness {
    Complete,
    Partial,
}

/// Metadata needed to place one acquired segment back into source order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentDescriptor {
    segment_id: String,
    source_id: String,
    source_epoch: String,
    snapshot_boundary: SnapshotBoundary,
    byte_range: SourceByteRange,
    first_complete_line: Option<CompleteLineAnchor>,
    last_complete_line: Option<CompleteLineAnchor>,
    first_physical_line: Option<u64>,
    last_physical_line: Option<u64>,
    first_rollout_ordinal: Option<u64>,
    last_rollout_ordinal: Option<u64>,
    acquisition_sequence: u64,
    completeness: SegmentCompleteness,
}

impl SegmentDescriptor {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        segment_id: impl Into<String>,
        source_id: impl Into<String>,
        source_epoch: impl Into<String>,
        snapshot_boundary: SnapshotBoundary,
        byte_range: SourceByteRange,
        first_complete_line: Option<CompleteLineAnchor>,
        last_complete_line: Option<CompleteLineAnchor>,
        first_physical_line: Option<u64>,
        last_physical_line: Option<u64>,
        first_rollout_ordinal: Option<u64>,
        last_rollout_ordinal: Option<u64>,
        acquisition_sequence: u64,
        completeness: SegmentCompleteness,
    ) -> Result<Self, SegmentError> {
        let descriptor = Self {
            segment_id: segment_id.into(),
            source_id: source_id.into(),
            source_epoch: source_epoch.into(),
            snapshot_boundary,
            byte_range,
            first_complete_line,
            last_complete_line,
            first_physical_line,
            last_physical_line,
            first_rollout_ordinal,
            last_rollout_ordinal,
            acquisition_sequence,
            completeness,
        };
        descriptor.validate()?;
        Ok(descriptor)
    }

    /// Build a descriptor from the records that belong to one complete range.
    /// The line anchor digest is a deterministic record-level fallback when a
    /// caller has not retained the original byte slice.
    pub fn from_records(
        segment_id: impl Into<String>,
        spec: &SourceSpec,
        snapshot_boundary: SnapshotBoundary,
        byte_range: SourceByteRange,
        records: &[SourceRecord],
        acquisition_sequence: u64,
        completeness: SegmentCompleteness,
    ) -> Result<Self, SegmentError> {
        let source_epoch = spec
            .source_epoch()
            .ok_or(SegmentError::MissingSourceEpoch)?
            .to_string();
        let mut ordered = records.iter().collect::<Vec<_>>();
        ordered.sort_by(record_physical_order);

        let first = ordered
            .first()
            .map(|record| line_anchor(record))
            .transpose()?;
        let last = ordered
            .last()
            .map(|record| line_anchor(record))
            .transpose()?;
        let first_physical_line = ordered.first().map(|record| record.physical_line_ordinal);
        let last_physical_line = ordered.last().map(|record| record.physical_line_ordinal);
        let first_rollout_ordinal = ordered
            .iter()
            .filter_map(|record| record.rollout_ordinal)
            .min();
        let last_rollout_ordinal = ordered
            .iter()
            .filter_map(|record| record.rollout_ordinal)
            .max();

        Self::new(
            segment_id,
            spec.source_id(),
            source_epoch,
            snapshot_boundary,
            byte_range,
            first,
            last,
            first_physical_line,
            last_physical_line,
            first_rollout_ordinal,
            last_rollout_ordinal,
            acquisition_sequence,
            completeness,
        )
    }

    fn validate(&self) -> Result<(), SegmentError> {
        if self.segment_id.is_empty() {
            return Err(SegmentError::EmptySegmentId);
        }
        if self.source_id.is_empty() {
            return Err(SegmentError::EmptySourceId);
        }
        if self.source_epoch.is_empty() {
            return Err(SegmentError::EmptySourceEpoch);
        }

        let snapshot = self.snapshot_boundary.byte_length();
        if self.byte_range.start() > self.byte_range.end() {
            return Err(SegmentError::InvalidRange {
                start: self.byte_range.start(),
                end: self.byte_range.end(),
            });
        }
        if self.byte_range.end() > snapshot {
            return Err(SegmentError::RangeBeyondSnapshot {
                end: self.byte_range.end(),
                snapshot,
            });
        }

        match (
            self.first_complete_line.as_ref(),
            self.last_complete_line.as_ref(),
        ) {
            (None, None) => {
                if !self.byte_range.is_empty()
                    || self.first_physical_line.is_some()
                    || self.last_physical_line.is_some()
                    || self.first_rollout_ordinal.is_some()
                    || self.last_rollout_ordinal.is_some()
                {
                    return Err(SegmentError::MissingCompleteLineAnchor);
                }
            }
            (Some(first), Some(last)) => {
                validate_line(first, self.byte_range)?;
                validate_line(last, self.byte_range)?;
                if first.byte_start() > last.byte_start()
                    || first.physical_line_ordinal() > last.physical_line_ordinal()
                {
                    return Err(SegmentError::LineOrderInvalid);
                }
                if last.byte_end() != self.byte_range.end() {
                    return Err(SegmentError::LastLineDoesNotEndAtRange {
                        line_end: last.byte_end(),
                        range_end: self.byte_range.end(),
                    });
                }
                let Some(first_physical_line) = self.first_physical_line else {
                    return Err(SegmentError::MissingPhysicalLineRange);
                };
                let Some(last_physical_line) = self.last_physical_line else {
                    return Err(SegmentError::MissingPhysicalLineRange);
                };
                if first_physical_line == 0
                    || last_physical_line == 0
                    || first_physical_line > last_physical_line
                {
                    return Err(SegmentError::InvalidPhysicalLineRange);
                }
                if first_physical_line != first.physical_line_ordinal()
                    || last_physical_line != last.physical_line_ordinal()
                {
                    return Err(SegmentError::PhysicalLineAnchorMismatch);
                }
            }
            _ => return Err(SegmentError::MismatchedCompleteLineAnchors),
        }

        match (self.first_rollout_ordinal, self.last_rollout_ordinal) {
            (None, None) => {}
            (Some(first), Some(last)) if first > 0 && last > 0 && first <= last => {}
            _ => return Err(SegmentError::InvalidRolloutOrdinalRange),
        }
        Ok(())
    }

    pub fn segment_id(&self) -> &str {
        &self.segment_id
    }

    pub fn source_id(&self) -> &str {
        &self.source_id
    }

    pub fn source_epoch(&self) -> &str {
        &self.source_epoch
    }

    pub const fn snapshot_boundary(&self) -> SnapshotBoundary {
        self.snapshot_boundary
    }

    pub const fn byte_range(&self) -> SourceByteRange {
        self.byte_range
    }

    pub fn first_complete_line(&self) -> Option<&CompleteLineAnchor> {
        self.first_complete_line.as_ref()
    }

    pub fn last_complete_line(&self) -> Option<&CompleteLineAnchor> {
        self.last_complete_line.as_ref()
    }

    pub const fn first_physical_line(&self) -> Option<u64> {
        self.first_physical_line
    }

    pub const fn last_physical_line(&self) -> Option<u64> {
        self.last_physical_line
    }

    pub const fn first_rollout_ordinal(&self) -> Option<u64> {
        self.first_rollout_ordinal
    }

    pub const fn last_rollout_ordinal(&self) -> Option<u64> {
        self.last_rollout_ordinal
    }

    pub const fn acquisition_sequence(&self) -> u64 {
        self.acquisition_sequence
    }

    pub const fn completeness(&self) -> SegmentCompleteness {
        self.completeness
    }
}

fn validate_line(line: &CompleteLineAnchor, range: SourceByteRange) -> Result<(), SegmentError> {
    if line.physical_line_ordinal() == 0 || line.byte_start() >= line.byte_end() {
        return Err(SegmentError::InvalidCompleteLineAnchor);
    }
    if line.byte_start() < range.start()
        || line.byte_end() > range.end()
        || line.byte_start() >= line.byte_end()
    {
        return Err(SegmentError::CompleteLineOutsideRange {
            line_start: line.byte_start(),
            line_end: line.byte_end(),
            range_start: range.start(),
            range_end: range.end(),
        });
    }
    Ok(())
}

/// A carrier retained when a semantic input starts in one segment and ends in
/// another. The assembler deliberately treats the key as opaque.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SegmentCarrierKind {
    Begin,
    End,
    Plan,
    Usage,
    Other(String),
}

impl SegmentCarrierKind {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Begin => "begin",
            Self::End => "end",
            Self::Plan => "plan",
            Self::Usage => "usage",
            Self::Other(value) => value,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SegmentCarrier {
    kind: SegmentCarrierKind,
    key: String,
    record: SourceRecord,
}

impl SegmentCarrier {
    pub fn new(
        kind: SegmentCarrierKind,
        key: impl Into<String>,
        record: SourceRecord,
    ) -> Result<Self, SegmentError> {
        let key = key.into();
        if key.is_empty() {
            return Err(SegmentError::EmptyCarrierKey);
        }
        Ok(Self { kind, key, record })
    }

    pub fn kind(&self) -> &SegmentCarrierKind {
        &self.kind
    }

    pub fn key(&self) -> &str {
        &self.key
    }

    pub fn record(&self) -> &SourceRecord {
        &self.record
    }
}

/// One descriptor plus the source records and cross-segment carriers acquired
/// for it.
#[derive(Debug, Clone, PartialEq)]
pub struct SourceSegment {
    descriptor: SegmentDescriptor,
    records: Vec<SourceRecord>,
    carriers: Vec<SegmentCarrier>,
}

impl SourceSegment {
    pub fn new(
        descriptor: SegmentDescriptor,
        records: Vec<SourceRecord>,
        carriers: Vec<SegmentCarrier>,
    ) -> Result<Self, SegmentError> {
        descriptor.validate()?;
        for record in &records {
            if record.byte_start > record.byte_end
                || record.byte_start < descriptor.byte_range.start()
                || record.byte_end > descriptor.byte_range.end()
            {
                return Err(SegmentError::RecordOutsideRange {
                    record_start: record.byte_start,
                    record_end: record.byte_end,
                    range_start: descriptor.byte_range.start(),
                    range_end: descriptor.byte_range.end(),
                });
            }
        }
        Ok(Self {
            descriptor,
            records,
            carriers,
        })
    }

    pub fn descriptor(&self) -> &SegmentDescriptor {
        &self.descriptor
    }

    pub fn records(&self) -> &[SourceRecord] {
        &self.records
    }

    pub fn carriers(&self) -> &[SegmentCarrier] {
        &self.carriers
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SegmentAssemblyLimits {
    max_segments: usize,
    max_records: usize,
    max_bytes: u64,
}

impl SegmentAssemblyLimits {
    pub const DEFAULT_MAX_SEGMENTS: usize = 256;
    pub const DEFAULT_MAX_RECORDS: usize = 1_000_000;
    pub const DEFAULT_MAX_BYTES: u64 = 32 * 1024 * 1024;

    pub const fn new(max_segments: usize, max_records: usize, max_bytes: u64) -> Self {
        Self {
            max_segments,
            max_records,
            max_bytes,
        }
    }

    pub const fn max_segments(self) -> usize {
        self.max_segments
    }

    pub const fn max_records(self) -> usize {
        self.max_records
    }

    pub const fn max_bytes(self) -> u64 {
        self.max_bytes
    }
}

impl Default for SegmentAssemblyLimits {
    fn default() -> Self {
        Self::new(
            Self::DEFAULT_MAX_SEGMENTS,
            Self::DEFAULT_MAX_RECORDS,
            Self::DEFAULT_MAX_BYTES,
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentGap {
    expected_byte_start: Option<u64>,
    observed_byte_start: Option<u64>,
    expected_rollout_ordinal: Option<u64>,
    observed_rollout_ordinal: Option<u64>,
    reason: String,
}

impl SegmentGap {
    fn physical(expected: u64, observed: u64) -> Self {
        Self {
            expected_byte_start: Some(expected),
            observed_byte_start: Some(observed),
            expected_rollout_ordinal: None,
            observed_rollout_ordinal: None,
            reason: "physical_range_gap".to_string(),
        }
    }

    fn ordinal(expected: u64, observed: u64) -> Self {
        Self {
            expected_byte_start: None,
            observed_byte_start: None,
            expected_rollout_ordinal: Some(expected),
            observed_rollout_ordinal: Some(observed),
            reason: "rollout_ordinal_gap".to_string(),
        }
    }

    fn overlap(start: u64, end: u64) -> Self {
        Self {
            expected_byte_start: Some(start),
            observed_byte_start: Some(end),
            expected_rollout_ordinal: None,
            observed_rollout_ordinal: None,
            reason: "conflicting_overlap".to_string(),
        }
    }

    pub fn expected_byte_start(&self) -> Option<u64> {
        self.expected_byte_start
    }

    pub fn observed_byte_start(&self) -> Option<u64> {
        self.observed_byte_start
    }

    pub fn expected_rollout_ordinal(&self) -> Option<u64> {
        self.expected_rollout_ordinal
    }

    pub fn observed_rollout_ordinal(&self) -> Option<u64> {
        self.observed_rollout_ordinal
    }

    pub fn reason(&self) -> &str {
        &self.reason
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SegmentAssembly {
    records: Vec<SourceRecord>,
    carriers: Vec<SegmentCarrier>,
    descriptors: Vec<SegmentDescriptor>,
    completeness: SegmentCompleteness,
    gaps: Vec<SegmentGap>,
    duplicate_record_count: usize,
}

impl SegmentAssembly {
    pub fn records(&self) -> &[SourceRecord] {
        &self.records
    }

    pub fn carriers(&self) -> &[SegmentCarrier] {
        &self.carriers
    }

    pub fn descriptors(&self) -> &[SegmentDescriptor] {
        &self.descriptors
    }

    pub const fn completeness(&self) -> SegmentCompleteness {
        self.completeness
    }

    pub fn gaps(&self) -> &[SegmentGap] {
        &self.gaps
    }

    pub const fn duplicate_record_count(&self) -> usize {
        self.duplicate_record_count
    }

    /// Promote only a complete, contiguous plain-JSONL assembly into the
    /// append cursor consumed by the append reader.
    ///
    /// Tail and backfill cursors intentionally cannot call this method.  The
    /// assembly must prove the entire snapshot prefix, source binding, and
    /// record-level continuity before a forward cursor is created.
    pub fn promote_to_forward_append(
        &self,
        spec: &SourceSpec,
    ) -> Result<ForwardAppendCursor, CursorError> {
        if spec.compression() != SourceCompression::PlainJsonl {
            return Err(CursorError::UnsupportedCompression {
                cursor_kind: super::SourceCursorKind::ForwardAppend,
                compression: spec.compression(),
            });
        }
        if self.descriptors.is_empty() {
            return Err(CursorError::PromotionNotSafe {
                reason: "assembly_has_no_segments".to_string(),
            });
        }
        if self.completeness != SegmentCompleteness::Complete || !self.gaps.is_empty() {
            return Err(CursorError::PromotionNotSafe {
                reason: "assembly_is_partial_or_has_gaps".to_string(),
            });
        }

        let snapshot = self.descriptors[0].snapshot_boundary();
        let mut descriptors = self.descriptors.iter().collect::<Vec<_>>();
        descriptors.sort_by(|left, right| descriptor_order(left, right));
        let mut covered_end = 0_u64;
        for descriptor in descriptors {
            if descriptor.source_id() != spec.source_id() {
                return Err(CursorError::PromotionNotSafe {
                    reason: "segment_source_id_mismatch".to_string(),
                });
            }
            if descriptor.source_epoch() != spec.source_epoch().unwrap_or_default() {
                return Err(CursorError::PromotionNotSafe {
                    reason: "segment_source_epoch_mismatch".to_string(),
                });
            }
            if descriptor.snapshot_boundary() != snapshot
                || descriptor.byte_range().start() != covered_end
            {
                return Err(CursorError::PromotionNotSafe {
                    reason: "segment_snapshot_or_range_not_contiguous".to_string(),
                });
            }
            covered_end = descriptor.byte_range().end();
        }
        if covered_end != snapshot.byte_length() {
            return Err(CursorError::PromotionNotSafe {
                reason: "assembly_does_not_cover_snapshot".to_string(),
            });
        }
        if spec
            .snapshot_boundary()
            .is_some_and(|boundary| boundary != snapshot)
        {
            return Err(CursorError::PromotionNotSafe {
                reason: "source_spec_snapshot_mismatch".to_string(),
            });
        }

        let fingerprint = spec.fingerprint().ok_or(CursorError::MissingFingerprint)?;
        if fingerprint.covered_bytes() != snapshot.byte_length() {
            return Err(CursorError::FingerprintCoverageMismatch {
                covered: fingerprint.covered_bytes(),
                snapshot: snapshot.byte_length(),
            });
        }
        let prefix_anchor = spec
            .prefix_anchor()
            .ok_or(CursorError::MissingPrefixAnchor)?;
        if prefix_anchor.end_offset() != snapshot.byte_length()
            || prefix_anchor.algorithm() != fingerprint.algorithm()
            || prefix_anchor.digest() != fingerprint.digest()
        {
            return Err(CursorError::PromotionNotSafe {
                reason: "source_fingerprint_or_prefix_anchor_mismatch".to_string(),
            });
        }

        let metadata_before =
            std::fs::metadata(spec.path()).map_err(|error| CursorError::PromotionNotSafe {
                reason: format!("source_metadata_unavailable: {error}"),
            })?;
        if !metadata_before.is_file() || metadata_before.len() != snapshot.byte_length() {
            return Err(CursorError::PromotionNotSafe {
                reason: "source_snapshot_length_changed".to_string(),
            });
        }
        let actual_digest =
            digest_file_range(spec.path(), 0, snapshot.byte_length()).map_err(|error| {
                CursorError::PromotionNotSafe {
                    reason: format!("source_fingerprint_unavailable: {error}"),
                }
            })?;
        if actual_digest != fingerprint.digest() || actual_digest != prefix_anchor.digest() {
            return Err(CursorError::PromotionNotSafe {
                reason: "source_fingerprint_changed".to_string(),
            });
        }
        let metadata_after =
            std::fs::metadata(spec.path()).map_err(|error| CursorError::PromotionNotSafe {
                reason: format!("source_metadata_unavailable_after_hash: {error}"),
            })?;
        if !metadata_after.is_file() || metadata_after.len() != snapshot.byte_length() {
            return Err(CursorError::PromotionNotSafe {
                reason: "source_snapshot_changed_during_hash".to_string(),
            });
        }

        let mut records = self.records.clone();
        records.sort_by(record_order);
        if records.is_empty() {
            return Err(CursorError::PromotionNotSafe {
                reason: "assembly_has_no_records".to_string(),
            });
        }
        let first = records.first().expect("records checked non-empty");
        let last = records.last().expect("records checked non-empty");
        if first.byte_start != 0 || last.byte_end != snapshot.byte_length() {
            return Err(CursorError::PromotionNotSafe {
                reason: "records_do_not_cover_snapshot".to_string(),
            });
        }
        if records
            .iter()
            .any(|record| record.source_identity != spec.source_identity())
        {
            return Err(CursorError::PromotionNotSafe {
                reason: "record_source_identity_mismatch".to_string(),
            });
        }
        if records.iter().any(|record| record.parse_error.is_some()) {
            return Err(CursorError::PromotionNotSafe {
                reason: "record_diagnostic_present".to_string(),
            });
        }
        for pair in records.windows(2) {
            if pair[0].byte_end != pair[1].byte_start
                || pair[0].physical_line_ordinal.saturating_add(1) != pair[1].physical_line_ordinal
            {
                return Err(CursorError::PromotionNotSafe {
                    reason: "record_prefix_is_not_contiguous".to_string(),
                });
            }
        }
        let rollout_ordinals = records
            .iter()
            .map(|record| record.rollout_ordinal)
            .collect::<Vec<_>>();
        if rollout_ordinals.iter().any(Option::is_some)
            && (rollout_ordinals.iter().any(Option::is_none)
                || rollout_ordinals.windows(2).any(|pair| {
                    pair[0].unwrap_or_default().saturating_add(1) != pair[1].unwrap_or_default()
                }))
        {
            return Err(CursorError::PromotionNotSafe {
                reason: "rollout_ordinals_are_not_contiguous".to_string(),
            });
        }

        let last_line = self
            .descriptors
            .iter()
            .filter_map(|descriptor| descriptor.last_complete_line().cloned())
            .max_by_key(|line| line.byte_end())
            .ok_or(CursorError::MissingLastCompleteLine)?;
        if last_line.byte_end() != snapshot.byte_length()
            || last_line.physical_line_ordinal() != last.physical_line_ordinal
        {
            return Err(CursorError::PromotionNotSafe {
                reason: "last_complete_line_anchor_mismatch".to_string(),
            });
        }

        let range = SourceByteRange::new(0, snapshot.byte_length()).map_err(|_| {
            CursorError::PromotionNotSafe {
                reason: "invalid_promoted_range".to_string(),
            }
        })?;
        ForwardAppendCursor::from_source(
            spec,
            snapshot,
            range,
            Some(last_line),
            last.rollout_ordinal,
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SegmentError {
    EmptySegmentId,
    EmptySourceId,
    EmptySourceEpoch,
    MissingSourceEpoch,
    InvalidRange {
        start: u64,
        end: u64,
    },
    RangeBeyondSnapshot {
        end: u64,
        snapshot: u64,
    },
    MissingCompleteLineAnchor,
    MismatchedCompleteLineAnchors,
    InvalidCompleteLineAnchor,
    CompleteLineOutsideRange {
        line_start: u64,
        line_end: u64,
        range_start: u64,
        range_end: u64,
    },
    LineOrderInvalid,
    LastLineDoesNotEndAtRange {
        line_end: u64,
        range_end: u64,
    },
    MissingPhysicalLineRange,
    InvalidPhysicalLineRange,
    PhysicalLineAnchorMismatch,
    InvalidRolloutOrdinalRange,
    EmptyCarrierKey,
    RecordOutsideRange {
        record_start: u64,
        record_end: u64,
        range_start: u64,
        range_end: u64,
    },
    ResourceLimitExceeded {
        resource: &'static str,
        limit: u64,
        observed: u64,
    },
    SourceIdMismatch {
        expected: String,
        actual: String,
    },
    SourceEpochMismatch {
        expected: String,
        actual: String,
    },
    SnapshotMismatch {
        expected: u64,
        actual: u64,
    },
}

impl fmt::Display for SegmentError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySegmentId => write!(formatter, "segment ID must not be empty"),
            Self::EmptySourceId => write!(formatter, "segment source ID must not be empty"),
            Self::EmptySourceEpoch | Self::MissingSourceEpoch => {
                write!(formatter, "segment source epoch must not be empty")
            }
            Self::InvalidRange { start, end } => {
                write!(formatter, "segment range {start}..{end} is invalid")
            }
            Self::RangeBeyondSnapshot { end, snapshot } => {
                write!(
                    formatter,
                    "segment range end {end} exceeds snapshot {snapshot}"
                )
            }
            Self::MissingCompleteLineAnchor => {
                write!(
                    formatter,
                    "non-empty segment requires complete-line anchors"
                )
            }
            Self::MismatchedCompleteLineAnchors => {
                write!(
                    formatter,
                    "segment complete-line anchors must be both present or absent"
                )
            }
            Self::InvalidCompleteLineAnchor => write!(formatter, "segment line anchor is invalid"),
            Self::CompleteLineOutsideRange {
                line_start,
                line_end,
                range_start,
                range_end,
            } => write!(
                formatter,
                "complete line {line_start}..{line_end} is outside segment range {range_start}..{range_end}"
            ),
            Self::LineOrderInvalid => write!(formatter, "segment complete-line order is invalid"),
            Self::LastLineDoesNotEndAtRange {
                line_end,
                range_end,
            } => write!(
                formatter,
                "last complete line ends at {line_end}, not segment end {range_end}"
            ),
            Self::MissingPhysicalLineRange => {
                write!(formatter, "segment physical line range is incomplete")
            }
            Self::InvalidPhysicalLineRange => {
                write!(formatter, "segment physical line range is invalid")
            }
            Self::PhysicalLineAnchorMismatch => {
                write!(
                    formatter,
                    "segment physical line range disagrees with line anchors"
                )
            }
            Self::InvalidRolloutOrdinalRange => {
                write!(formatter, "segment rollout ordinal range is invalid")
            }
            Self::EmptyCarrierKey => write!(formatter, "segment carrier key must not be empty"),
            Self::RecordOutsideRange {
                record_start,
                record_end,
                range_start,
                range_end,
            } => write!(
                formatter,
                "record {record_start}..{record_end} is outside segment range {range_start}..{range_end}"
            ),
            Self::ResourceLimitExceeded {
                resource,
                limit,
                observed,
            } => write!(
                formatter,
                "segment {resource} limit {limit} exceeded by {observed}"
            ),
            Self::SourceIdMismatch { expected, actual } => {
                write!(
                    formatter,
                    "segment source ID mismatch: expected {expected}, got {actual}"
                )
            }
            Self::SourceEpochMismatch { expected, actual } => write!(
                formatter,
                "segment source epoch mismatch: expected {expected}, got {actual}"
            ),
            Self::SnapshotMismatch { expected, actual } => write!(
                formatter,
                "segment snapshot mismatch: expected {expected}, got {actual}"
            ),
        }
    }
}

impl std::error::Error for SegmentError {}

/// Collect segments in acquisition order, then emit an order independent
/// logical source sequence.
#[derive(Debug, Clone)]
pub struct SegmentAssembler {
    limits: SegmentAssemblyLimits,
    segments: Vec<SourceSegment>,
}

impl SegmentAssembler {
    pub const fn new(limits: SegmentAssemblyLimits) -> Self {
        Self {
            limits,
            segments: Vec::new(),
        }
    }

    pub fn add_segment(&mut self, segment: SourceSegment) -> Result<(), SegmentError> {
        segment.descriptor.validate()?;
        let next_segments = self.segments.len().saturating_add(1);
        if self.limits.max_segments == 0 || next_segments > self.limits.max_segments {
            return Err(SegmentError::ResourceLimitExceeded {
                resource: "segments",
                limit: self.limits.max_segments as u64,
                observed: next_segments as u64,
            });
        }

        if let Some(first) = self.segments.first() {
            if first.descriptor.source_id != segment.descriptor.source_id {
                return Err(SegmentError::SourceIdMismatch {
                    expected: first.descriptor.source_id.clone(),
                    actual: segment.descriptor.source_id.clone(),
                });
            }
            if first.descriptor.source_epoch != segment.descriptor.source_epoch {
                return Err(SegmentError::SourceEpochMismatch {
                    expected: first.descriptor.source_epoch.clone(),
                    actual: segment.descriptor.source_epoch.clone(),
                });
            }
            if first.descriptor.snapshot_boundary != segment.descriptor.snapshot_boundary {
                return Err(SegmentError::SnapshotMismatch {
                    expected: first.descriptor.snapshot_boundary.byte_length(),
                    actual: segment.descriptor.snapshot_boundary.byte_length(),
                });
            }
        }

        let record_count = self
            .segments
            .iter()
            .map(|existing| existing.records.len())
            .sum::<usize>()
            .saturating_add(segment.records.len());
        if self.limits.max_records == 0 || record_count > self.limits.max_records {
            return Err(SegmentError::ResourceLimitExceeded {
                resource: "records",
                limit: self.limits.max_records as u64,
                observed: record_count as u64,
            });
        }

        let segment_bytes = self
            .segments
            .iter()
            .map(|existing| existing.descriptor.byte_range.len())
            .sum::<u64>()
            .saturating_add(segment.descriptor.byte_range.len());
        if self.limits.max_bytes == 0 || segment_bytes > self.limits.max_bytes {
            return Err(SegmentError::ResourceLimitExceeded {
                resource: "bytes",
                limit: self.limits.max_bytes,
                observed: segment_bytes,
            });
        }

        self.segments.push(segment);
        Ok(())
    }

    pub fn assemble(self) -> SegmentAssembly {
        let mut descriptors = self
            .segments
            .iter()
            .map(|segment| segment.descriptor.clone())
            .collect::<Vec<_>>();
        descriptors.sort_by(descriptor_order);

        let mut gaps = Vec::new();
        let mut covered_end = 0_u64;
        for descriptor in &descriptors {
            let range = descriptor.byte_range;
            if range.start() > covered_end {
                gaps.push(SegmentGap::physical(covered_end, range.start()));
            }
            covered_end = covered_end.max(range.end());
            if descriptor.completeness == SegmentCompleteness::Partial {
                gaps.push(SegmentGap {
                    expected_byte_start: None,
                    observed_byte_start: None,
                    expected_rollout_ordinal: None,
                    observed_rollout_ordinal: None,
                    reason: "segment_partial".to_string(),
                });
            }
        }
        if let Some(snapshot) = descriptors
            .first()
            .map(|descriptor| descriptor.snapshot_boundary)
            && covered_end < snapshot.byte_length()
        {
            gaps.push(SegmentGap::physical(covered_end, snapshot.byte_length()));
        }
        if descriptors.is_empty() {
            gaps.push(SegmentGap {
                expected_byte_start: Some(0),
                observed_byte_start: None,
                expected_rollout_ordinal: None,
                observed_rollout_ordinal: None,
                reason: "no_segments".to_string(),
            });
        }

        let mut records = Vec::new();
        let mut duplicate_record_count = 0_usize;
        let mut candidates = self
            .segments
            .iter()
            .flat_map(|segment| {
                segment.records.iter().map(|record| {
                    (
                        record.clone(),
                        segment.descriptor.acquisition_sequence,
                        segment.descriptor.segment_id.clone(),
                    )
                })
            })
            .collect::<Vec<_>>();
        candidates.sort_by(|left, right| {
            record_order(&left.0, &right.0)
                .then_with(|| record_stable_key(&left.0).cmp(&record_stable_key(&right.0)))
                .then_with(|| left.1.cmp(&right.1))
                .then_with(|| left.2.cmp(&right.2))
        });

        for (candidate, _, _) in candidates {
            if let Some(existing_index) = records
                .iter()
                .position(|existing| same_record_key(existing, &candidate))
            {
                if same_record_content(&records[existing_index], &candidate) {
                    duplicate_record_count = duplicate_record_count.saturating_add(1);
                } else {
                    gaps.push(SegmentGap::overlap(
                        candidate.byte_start,
                        candidate.byte_end,
                    ));
                }
                continue;
            }
            records.push(candidate);
        }

        for pair in records.windows(2) {
            if let (Some(previous), Some(next)) = (pair[0].rollout_ordinal, pair[1].rollout_ordinal)
                && next > previous.saturating_add(1)
            {
                gaps.push(SegmentGap::ordinal(previous.saturating_add(1), next));
            }
        }
        if records.iter().any(|record| record.parse_error.is_some()) {
            gaps.push(SegmentGap {
                expected_byte_start: None,
                observed_byte_start: None,
                expected_rollout_ordinal: None,
                observed_rollout_ordinal: None,
                reason: "record_diagnostic".to_string(),
            });
        }

        let mut carriers = Vec::new();
        for carrier in self
            .segments
            .iter()
            .flat_map(|segment| segment.carriers.iter())
        {
            if carriers.iter().any(|existing: &SegmentCarrier| {
                existing.kind == carrier.kind
                    && existing.key == carrier.key
                    && existing.record == carrier.record
            }) {
                continue;
            }
            carriers.push(carrier.clone());
        }
        carriers.sort_by(|left, right| {
            left.kind
                .as_str()
                .cmp(right.kind.as_str())
                .then_with(|| left.key.cmp(&right.key))
                .then_with(|| record_order(&left.record, &right.record))
                .then_with(|| {
                    record_stable_key(&left.record).cmp(&record_stable_key(&right.record))
                })
        });

        let completeness = if gaps.is_empty() {
            SegmentCompleteness::Complete
        } else {
            SegmentCompleteness::Partial
        };
        SegmentAssembly {
            records,
            carriers,
            descriptors,
            completeness,
            gaps,
            duplicate_record_count,
        }
    }
}

impl Default for SegmentAssembler {
    fn default() -> Self {
        Self::new(SegmentAssemblyLimits::default())
    }
}

fn descriptor_order(left: &SegmentDescriptor, right: &SegmentDescriptor) -> Ordering {
    left.byte_range
        .start()
        .cmp(&right.byte_range.start())
        .then_with(|| left.byte_range.end().cmp(&right.byte_range.end()))
        .then_with(|| left.segment_id.cmp(&right.segment_id))
        .then_with(|| left.acquisition_sequence.cmp(&right.acquisition_sequence))
}

fn record_physical_order(left: &&SourceRecord, right: &&SourceRecord) -> Ordering {
    left.byte_start
        .cmp(&right.byte_start)
        .then_with(|| left.byte_end.cmp(&right.byte_end))
        .then_with(|| left.physical_line_ordinal.cmp(&right.physical_line_ordinal))
}

fn record_order(left: &SourceRecord, right: &SourceRecord) -> Ordering {
    match (left.rollout_ordinal, right.rollout_ordinal) {
        (Some(left), Some(right)) => left
            .cmp(&right)
            .then_with(|| left_byte_order(&left, &right)),
        _ => left_byte_order(&left.byte_start, &right.byte_start),
    }
    .then_with(|| left.physical_line_ordinal.cmp(&right.physical_line_ordinal))
}

fn left_byte_order(left: &u64, right: &u64) -> Ordering {
    left.cmp(right)
}

fn same_record_key(left: &SourceRecord, right: &SourceRecord) -> bool {
    (left.byte_start == right.byte_start && left.byte_end == right.byte_end)
        || (left.rollout_ordinal.is_some() && left.rollout_ordinal == right.rollout_ordinal)
        || (left.physical_line_ordinal == right.physical_line_ordinal
            && left.physical_line_ordinal != 0)
}

fn same_record_content(left: &SourceRecord, right: &SourceRecord) -> bool {
    left.source_identity == right.source_identity
        && left.timestamp == right.timestamp
        && left.rollout_ordinal == right.rollout_ordinal
        && left.raw == right.raw
        && left.parse_error == right.parse_error
}

fn record_stable_key(record: &SourceRecord) -> String {
    format!(
        "{}\0{}\0{}\0{}\0{}\0{}\0{}",
        record.source_identity,
        record.byte_start,
        record.byte_end,
        record.physical_line_ordinal,
        record.rollout_ordinal.unwrap_or_default(),
        record.timestamp.as_deref().unwrap_or_default(),
        record
            .raw
            .as_ref()
            .and_then(|raw| serde_json::to_string(raw).ok())
            .or_else(|| record.parse_error.clone())
            .unwrap_or_default(),
    )
}

fn line_anchor(record: &SourceRecord) -> Result<CompleteLineAnchor, SegmentError> {
    if record.byte_start >= record.byte_end || record.physical_line_ordinal == 0 {
        return Err(SegmentError::InvalidCompleteLineAnchor);
    }
    let material = format!(
        "{}\0{}\0{}\0{}\0{}\0{}",
        record.source_identity,
        record.byte_start,
        record.byte_end,
        record.physical_line_ordinal,
        record.rollout_ordinal.unwrap_or_default(),
        record
            .raw
            .as_ref()
            .and_then(|raw| serde_json::to_string(raw).ok())
            .or_else(|| record.parse_error.clone())
            .unwrap_or_default(),
    );
    CompleteLineAnchor::new(
        SHA256_ALGORITHM,
        digest_bytes(material.as_bytes()),
        record.physical_line_ordinal,
        record.byte_start,
        record.byte_end,
    )
    .map_err(|_| SegmentError::InvalidCompleteLineAnchor)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        SegmentAssembler, SegmentAssemblyLimits, SegmentCarrier, SegmentCarrierKind,
        SegmentCompleteness, SegmentDescriptor, SegmentError, SourceSegment,
    };
    use crate::source::{SnapshotBoundary, SourceByteRange, SourceRecord, SourceSpec};

    fn spec() -> SourceSpec {
        SourceSpec::bind("conversation-1", "logical-source", "rollout.jsonl")
            .expect("binding")
            .with_source_epoch("epoch-1")
            .expect("epoch")
    }

    fn record(start: u64, end: u64, line: u64, ordinal: u64, value: &str) -> SourceRecord {
        SourceRecord {
            source_identity: "rollout.jsonl".to_string(),
            byte_start: start,
            byte_end: end,
            physical_line_ordinal: line,
            rollout_ordinal: Some(ordinal),
            timestamp: None,
            raw: Some(json!({"ordinal": ordinal, "value": value})),
            parse_error: None,
        }
    }

    fn segment(
        id: &str,
        range: (u64, u64),
        acquisition: u64,
        records: Vec<SourceRecord>,
        completeness: SegmentCompleteness,
    ) -> SourceSegment {
        let descriptor = SegmentDescriptor::from_records(
            id,
            &spec(),
            SnapshotBoundary::new(30),
            SourceByteRange::new(range.0, range.1).expect("range"),
            &records,
            acquisition,
            completeness,
        )
        .expect("descriptor");
        SourceSegment::new(descriptor, records, Vec::new()).expect("segment")
    }

    #[test]
    fn descriptors_capture_ranges_and_order_independent_assembly_deduplicates_overlap() {
        let first = record(0, 10, 1, 1, "one");
        let second = record(10, 20, 2, 2, "two");
        let third = record(20, 30, 3, 3, "three");
        let overlapping = segment(
            "overlap",
            (10, 30),
            1,
            vec![second.clone(), third.clone()],
            SegmentCompleteness::Complete,
        );
        let first_segment = segment(
            "first",
            (0, 20),
            2,
            vec![first.clone(), second.clone()],
            SegmentCompleteness::Complete,
        );

        let mut assembler = SegmentAssembler::default();
        assembler
            .add_segment(overlapping)
            .expect("overlap accepted");
        assembler
            .add_segment(first_segment)
            .expect("first accepted");
        let assembled = assembler.assemble();

        assert_eq!(assembled.completeness(), SegmentCompleteness::Complete);
        assert_eq!(assembled.records(), &[first, second, third]);
        assert_eq!(assembled.duplicate_record_count(), 1);
        assert!(assembled.gaps().is_empty());
        assert_eq!(assembled.descriptors()[0].segment_id(), "first");
    }

    #[test]
    fn physical_and_ordinal_gaps_are_partial_without_guessing_canonical_order() {
        let first = segment(
            "first",
            (0, 10),
            1,
            vec![record(0, 10, 1, 1, "one")],
            SegmentCompleteness::Complete,
        );
        let later = segment(
            "later",
            (20, 30),
            2,
            vec![record(20, 30, 3, 3, "three")],
            SegmentCompleteness::Complete,
        );

        let mut assembler = SegmentAssembler::default();
        assembler.add_segment(later).expect("later accepted");
        assembler.add_segment(first).expect("first accepted");
        let assembled = assembler.assemble();

        assert_eq!(assembled.completeness(), SegmentCompleteness::Partial);
        assert!(
            assembled
                .gaps()
                .iter()
                .any(|gap| gap.reason() == "physical_range_gap")
        );
        assert!(
            assembled
                .gaps()
                .iter()
                .any(|gap| gap.reason() == "rollout_ordinal_gap")
        );
        assert_eq!(assembled.records().len(), 2);
    }

    #[test]
    fn carriers_survive_segment_deduplication_and_are_sorted_by_stable_key() {
        let begin = record(0, 10, 1, 1, "begin");
        let end = record(10, 20, 2, 2, "end");
        let first_descriptor = SegmentDescriptor::from_records(
            "first",
            &spec(),
            SnapshotBoundary::new(20),
            SourceByteRange::new(0, 10).expect("range"),
            std::slice::from_ref(&begin),
            1,
            SegmentCompleteness::Complete,
        )
        .expect("descriptor");
        let second_descriptor = SegmentDescriptor::from_records(
            "second",
            &spec(),
            SnapshotBoundary::new(20),
            SourceByteRange::new(10, 20).expect("range"),
            std::slice::from_ref(&end),
            2,
            SegmentCompleteness::Complete,
        )
        .expect("descriptor");
        let begin_carrier = SegmentCarrier::new(SegmentCarrierKind::Begin, "turn-1", begin.clone())
            .expect("carrier");
        let usage_carrier =
            SegmentCarrier::new(SegmentCarrierKind::Usage, "turn-1", end.clone()).expect("carrier");

        let mut assembler = SegmentAssembler::new(SegmentAssemblyLimits::default());
        assembler
            .add_segment(
                SourceSegment::new(first_descriptor, vec![begin], vec![begin_carrier.clone()])
                    .expect("segment"),
            )
            .expect("first");
        assembler
            .add_segment(
                SourceSegment::new(
                    second_descriptor,
                    vec![end],
                    vec![begin_carrier, usage_carrier],
                )
                .expect("segment"),
            )
            .expect("second");

        let assembled = assembler.assemble();
        assert_eq!(assembled.carriers().len(), 2);
        assert_eq!(assembled.carriers()[0].key(), "turn-1");
        assert_eq!(assembled.carriers()[0].kind().as_str(), "begin");
        assert_eq!(assembled.carriers()[1].kind().as_str(), "usage");
    }

    #[test]
    fn assembler_enforces_resource_limits_before_accepting_more_input() {
        let one = segment(
            "one",
            (0, 10),
            1,
            vec![record(0, 10, 1, 1, "one")],
            SegmentCompleteness::Complete,
        );
        let mut assembler = SegmentAssembler::new(SegmentAssemblyLimits::new(1, 1, 10));
        assembler.add_segment(one).expect("first segment");
        let second = segment(
            "two",
            (10, 20),
            2,
            vec![record(10, 20, 2, 2, "two")],
            SegmentCompleteness::Complete,
        );
        assert!(matches!(
            assembler.add_segment(second),
            Err(SegmentError::ResourceLimitExceeded {
                resource: "segments",
                ..
            })
        ));
    }

    #[test]
    fn conflicting_overlap_is_partial_but_deterministic_across_acquisition_order() {
        let left = segment(
            "left",
            (0, 10),
            1,
            vec![record(0, 10, 1, 1, "left")],
            SegmentCompleteness::Complete,
        );
        let right = segment(
            "right",
            (0, 10),
            2,
            vec![record(0, 10, 1, 1, "right")],
            SegmentCompleteness::Complete,
        );

        let mut first_order = SegmentAssembler::default();
        first_order.add_segment(left.clone()).expect("left");
        first_order.add_segment(right.clone()).expect("right");
        let first = first_order.assemble();

        let mut second_order = SegmentAssembler::default();
        second_order.add_segment(right).expect("right");
        second_order.add_segment(left).expect("left");
        let second = second_order.assemble();

        assert_eq!(first.records(), second.records());
        assert_eq!(first.gaps(), second.gaps());
        assert_eq!(first.descriptors(), second.descriptors());
        assert_eq!(first.completeness(), SegmentCompleteness::Partial);
        assert!(
            first
                .gaps()
                .iter()
                .any(|gap| gap.reason() == "conflicting_overlap")
        );
    }
}
