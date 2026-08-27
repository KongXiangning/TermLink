//! Deterministic delivery identities for the 4.5 target protocol.
//!
//! This is deliberately a small target-owned adapter around the existing
//! [`TargetSourceScope`] model.  It carries over the useful part of the Alpha
//! implementation—domain-separated hashing over an unambiguous canonical
//! encoding—without introducing a second source-range or cursor model.
//!
//! The caller must pass a source scope that has already been validated by the
//! target mapping boundary.  `request_id`, generation, read order, process
//! state and wall-clock values are not accepted by these functions and cannot
//! affect a delivery identity.

use super::target_data::{
    TargetCompleteLineBoundary, TargetCursorKind, TargetSnapshotUnit, TargetSourceByteRange,
    TargetSourceScope,
};
use crate::source::SourceFixtureHash;

const SCOPE_DOMAIN: &[u8] = b"termlink.codex-rollout-collector/target-delivery-scope/v1";
const BATCH_DOMAIN: &[u8] = b"termlink.codex-rollout-collector/target-delivery-batch/v1";
const ID_HEX_LEN: usize = 32;
const SEGMENT_ID_PREFIX: &str = "seg-";
const BATCH_ID_PREFIX: &str = "batch-";

fn push_field(buffer: &mut Vec<u8>, value: &str) {
    buffer.extend_from_slice(value.len().to_string().as_bytes());
    buffer.push(b':');
    buffer.extend_from_slice(value.as_bytes());
}

fn push_optional(buffer: &mut Vec<u8>, value: Option<&str>) {
    match value {
        Some(value) => {
            buffer.push(b's');
            push_field(buffer, value);
        }
        None => buffer.push(b'n'),
    }
}

fn range_text(range: TargetSourceByteRange) -> String {
    format!("{}:{}", range.start, range.end)
}

fn snapshot_unit_text(unit: TargetSnapshotUnit) -> &'static str {
    match unit {
        TargetSnapshotUnit::PhysicalBytes => "physical_bytes",
    }
}

fn cursor_kind_text(kind: TargetCursorKind) -> &'static str {
    kind.as_str()
}

fn line_boundary_text(line: &TargetCompleteLineBoundary) -> String {
    format!(
        "{}:{}:{}",
        line.physical_line_ordinal, line.byte_start, line.byte_end
    )
}

/// Return the canonical bytes for a validated target delivery scope.
///
/// Optional values use an explicit presence marker.  This keeps an absent
/// range/boundary distinct from a present value and makes field boundaries
/// independent of the contents of IDs.
fn canonical_scope_bytes(job_id: &str, scope: &TargetSourceScope) -> Vec<u8> {
    let mut buffer = Vec::new();
    buffer.extend_from_slice(SCOPE_DOMAIN);
    push_field(&mut buffer, job_id);
    push_field(&mut buffer, &scope.conversation_id);
    push_optional(&mut buffer, scope.cursor_kind.map(cursor_kind_text));
    push_field(&mut buffer, &scope.source_id);
    push_field(&mut buffer, &scope.source_epoch);

    let source_range = scope.source_range.map(range_text);
    push_optional(&mut buffer, source_range.as_deref());

    push_field(
        &mut buffer,
        snapshot_unit_text(scope.snapshot_boundary.unit),
    );
    let snapshot_byte_length = scope.snapshot_boundary.byte_length.to_string();
    push_field(&mut buffer, &snapshot_byte_length);

    let line_boundary = scope.last_complete_line.as_ref().map(line_boundary_text);
    push_optional(&mut buffer, line_boundary.as_deref());

    let rollout_ordinal = scope
        .last_rollout_ordinal
        .map(|ordinal| ordinal.to_string());
    push_optional(&mut buffer, rollout_ordinal.as_deref());
    buffer
}

fn digest_prefix(bytes: &[u8]) -> String {
    let digest = SourceFixtureHash::from_bytes(bytes);
    digest.digest()[..ID_HEX_LEN].to_string()
}

/// Derive the logical segment identity from `job_id` and the Codex target
/// source scope.  The same validated scope always produces the same ID.
pub(crate) fn derive_segment_id(job_id: &str, scope: &TargetSourceScope) -> String {
    let buffer = canonical_scope_bytes(job_id, scope);
    format!("{SEGMENT_ID_PREFIX}{}", digest_prefix(&buffer))
}

/// Derive one batch identity inside a segment.
///
/// The range and index are deliberately separate inputs.  A future mapping
/// pass may split one logical segment into multiple batches without making
/// batch zero and batch one aliases of one another.
pub(crate) fn derive_batch_id(
    segment_id: &str,
    batch_source_range: Option<TargetSourceByteRange>,
    batch_index: u32,
) -> String {
    let mut buffer = Vec::new();
    buffer.extend_from_slice(BATCH_DOMAIN);
    push_field(&mut buffer, segment_id);
    let batch_range = batch_source_range.map(range_text);
    push_optional(&mut buffer, batch_range.as_deref());
    push_field(&mut buffer, &batch_index.to_string());
    format!("{BATCH_ID_PREFIX}{}", digest_prefix(&buffer))
}

#[cfg(test)]
mod tests {
    use super::{
        BATCH_ID_PREFIX, ID_HEX_LEN, SEGMENT_ID_PREFIX, TargetCursorKind, TargetSourceByteRange,
        TargetSourceScope, derive_batch_id, derive_segment_id,
    };
    use crate::protocol::target_data::{TargetCompleteLineBoundary, TargetSnapshotBoundary};

    fn sample_scope() -> TargetSourceScope {
        TargetSourceScope {
            conversation_id: "conversation-alpha".to_string(),
            source_id: "rollout-alpha".to_string(),
            source_epoch: "epoch-1".to_string(),
            cursor_kind: Some(TargetCursorKind::Backfill),
            source_range: Some(TargetSourceByteRange {
                start: 128,
                end: 4096,
            }),
            snapshot_boundary: TargetSnapshotBoundary::physical_bytes(4096),
            last_complete_line: Some(TargetCompleteLineBoundary {
                physical_line_ordinal: 42,
                byte_start: 4050,
                byte_end: 4096,
            }),
            last_rollout_ordinal: Some(7),
        }
    }

    #[test]
    fn same_job_and_scope_are_deterministic() {
        let scope = sample_scope();
        let first = derive_segment_id("job-alpha", &scope);
        let second = derive_segment_id("job-alpha", &scope);
        assert_eq!(first, second);
        assert!(first.starts_with(SEGMENT_ID_PREFIX));
        assert_eq!(first.len(), SEGMENT_ID_PREFIX.len() + ID_HEX_LEN);

        let batch = derive_batch_id(
            &first,
            Some(TargetSourceByteRange {
                start: 128,
                end: 2048,
            }),
            0,
        );
        assert_eq!(
            batch,
            derive_batch_id(
                &first,
                Some(TargetSourceByteRange {
                    start: 128,
                    end: 2048,
                }),
                0,
            )
        );
        assert!(batch.starts_with(BATCH_ID_PREFIX));
        assert_eq!(batch.len(), BATCH_ID_PREFIX.len() + ID_HEX_LEN);
    }

    #[test]
    fn golden_vector_freezes_target_identity_encoding() {
        let scope = sample_scope();
        let segment_id = derive_segment_id("job-alpha", &scope);
        assert_eq!(segment_id, "seg-6122fb678158c0e8378af043dd0221c8");
        assert_eq!(
            derive_batch_id(
                &segment_id,
                Some(TargetSourceByteRange {
                    start: 128,
                    end: 2048,
                }),
                0,
            ),
            "batch-bd2aea8e65404ac4c42e38cf53efb362"
        );
    }

    #[test]
    fn job_and_each_source_scope_dimension_change_segment_identity() {
        let base_scope = sample_scope();
        let base = derive_segment_id("job-alpha", &base_scope);

        let variants = [
            ("job-beta", base_scope.clone()),
            (
                "job-alpha",
                TargetSourceScope {
                    conversation_id: "conversation-beta".to_string(),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    source_id: "rollout-beta".to_string(),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    source_epoch: "epoch-2".to_string(),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    cursor_kind: Some(TargetCursorKind::TailPreview),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    source_range: None,
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    source_range: Some(TargetSourceByteRange {
                        start: 128,
                        end: 4097,
                    }),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    snapshot_boundary: TargetSnapshotBoundary::physical_bytes(8192),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    last_complete_line: None,
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    last_complete_line: Some(TargetCompleteLineBoundary {
                        physical_line_ordinal: 42,
                        byte_start: 4049,
                        byte_end: 4096,
                    }),
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    last_rollout_ordinal: None,
                    ..base_scope.clone()
                },
            ),
            (
                "job-alpha",
                TargetSourceScope {
                    last_rollout_ordinal: Some(8),
                    ..base_scope.clone()
                },
            ),
        ];

        for (job_id, variant) in variants {
            assert_ne!(
                derive_segment_id(job_id, &variant),
                base,
                "a validated source-scope dimension must change segment identity"
            );
        }
    }

    #[test]
    fn absent_and_present_optional_scope_values_do_not_alias() {
        let mut without_cursor_kind = sample_scope();
        without_cursor_kind.cursor_kind = None;
        let with_cursor_kind = sample_scope();
        assert_ne!(
            derive_segment_id("job-alpha", &without_cursor_kind),
            derive_segment_id("job-alpha", &with_cursor_kind)
        );

        let mut without_range = sample_scope();
        without_range.source_range = None;
        let mut empty_range = sample_scope();
        empty_range.source_range = Some(TargetSourceByteRange { start: 0, end: 0 });
        assert_ne!(
            derive_segment_id("job-alpha", &without_range),
            derive_segment_id("job-alpha", &empty_range)
        );
    }

    #[test]
    fn batch_identity_varies_by_range_and_index() {
        let segment_id = derive_segment_id("job-alpha", &sample_scope());
        let first_range = Some(TargetSourceByteRange {
            start: 128,
            end: 2048,
        });
        let second_range = Some(TargetSourceByteRange {
            start: 2048,
            end: 4096,
        });

        let first = derive_batch_id(&segment_id, first_range, 0);
        let second_range_same_index = derive_batch_id(&segment_id, second_range, 0);
        let second_index_same_range = derive_batch_id(&segment_id, first_range, 1);
        let no_range = derive_batch_id(&segment_id, None, 0);

        assert_ne!(first, second_range_same_index);
        assert_ne!(first, second_index_same_range);
        assert_ne!(first, no_range);
        assert_eq!(first, derive_batch_id(&segment_id, first_range, 0));
    }

    #[test]
    fn canonical_encoding_has_explicit_scope_domain_and_boundaries() {
        let encoded = super::canonical_scope_bytes("job-alpha", &sample_scope());
        assert!(encoded.starts_with(super::SCOPE_DOMAIN));
        assert!(
            encoded
                .windows(b"conversation-alpha".len())
                .any(|window| { window == b"conversation-alpha" })
        );
        assert!(
            encoded
                .windows(b"physical_bytes".len())
                .any(|window| { window == b"physical_bytes" })
        );
        assert!(
            encoded
                .windows(b"42:4050:4096".len())
                .any(|window| { window == b"42:4050:4096" })
        );
    }
}
