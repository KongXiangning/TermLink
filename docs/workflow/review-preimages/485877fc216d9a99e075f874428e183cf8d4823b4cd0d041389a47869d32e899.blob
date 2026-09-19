//! Target-side source locating and session-lineage orchestration.
//!
//! The 4.5 target wire carries only a conversation ID and a read intent. This
//! module is the internal bridge from that intent to the already-stable source
//! discovery and planned-read primitives. It stops at `SourceRecord` plus
//! auditable source/lineage evidence; target mapping consumes that value before
//! the process publishes a batch.

use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};

use super::{
    startup::TargetStartupConfig,
    target::{TargetAnalyzeMode, TargetAnalyzeRequest, TargetResolvedResourceLimits},
    target_data::{
        TARGET_DATA_SCHEMA_VERSION, TargetCompleteness, TargetLineageCheckpoint,
        TargetLineageCoverage, TargetLineageTransition, TargetLineageValidationState,
        TargetSnapshotBoundary, TargetSourceByteRange, TargetSourceCompression,
    },
};
use crate::source::{
    AppendError, DiscoveredRollout, DiscoveryBudget, DiscoveryControl, ForwardAppendCursor,
    HistoryBaseRef, JsonlSourceBackend, LineageError, SessionDiscoveryRequest, SessionLineage,
    SourceByteRange, SourceFingerprint, SourcePrefixAnchor, SourceReadMode, SourceReadPlan,
    SourceReadPlanError, SourceRecord, SourceSpec, discover_session_with_control,
};

const DISCOVERY_MAX_DIRECTORY_ENTRIES: u64 = 65_536;
const DISCOVERY_MAX_HEADER_BYTES: u64 = 4 * 1024 * 1024;
const DISCOVERY_MAX_FINGERPRINT_BYTES: u64 = 64 * 1024 * 1024;
const DISCOVERY_MAX_CANDIDATES: usize = 4096;
const DISCOVERY_MAX_DATE_PARTITIONS: usize = 366;

/// Errors from the target source/lineage bridge.
///
/// Source-specific errors remain typed where the existing source layer has a
/// stable error (in particular ordinary `.zst` parent rejection). The target
/// process may still expose the bounded diagnostic as its generic
/// `analysis_failed` error until the source error-code migration is specified.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TargetSourceReadError {
    InvalidRequest(String),
    ResourceLimit(String),
    Discovery(LineageError),
    SourceBinding(String),
    ReadPlan(SourceReadPlanError),
    Read(String),
    Mapping(String),
    SourceOutsideSessionsRoot { path: String },
    Cancelled,
    Timeout,
}

impl TargetSourceReadError {
    /// Return the target wire error code for this internal source failure.
    ///
    /// Discovery and read-plan primitives intentionally keep their richer
    /// typed errors.  The target process must nevertheless preserve the
    /// resource/timeout/cancel boundary when it projects those errors onto
    /// the public error message.
    pub fn wire_error_code(&self) -> &'static str {
        match self {
            Self::ResourceLimit(_) => "resource_limit_exceeded",
            Self::Timeout => "resource_timeout",
            Self::Cancelled => "cancelled",
            Self::Discovery(error) => match error {
                LineageError::DiscoveryBudgetExceeded { .. }
                | LineageError::DiscoveryLimitExceeded { .. }
                | LineageError::DatePartitionLimitExceeded { .. } => "resource_limit_exceeded",
                LineageError::DiscoveryTimeout => "resource_timeout",
                LineageError::DiscoveryCancelled => "cancelled",
                _ => "analysis_failed",
            },
            Self::ReadPlan(error) => match error {
                SourceReadPlanError::SegmentLimitExceeded { .. }
                | SourceReadPlanError::ZeroLimit { .. } => "resource_limit_exceeded",
                _ => "analysis_failed",
            },
            Self::InvalidRequest(_)
            | Self::SourceBinding(_)
            | Self::Read(_)
            | Self::Mapping(_)
            | Self::SourceOutsideSessionsRoot { .. } => "analysis_failed",
        }
    }

    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::Timeout
                | Self::Read(_)
                | Self::Discovery(LineageError::Io { .. })
                | Self::Discovery(LineageError::DiscoveryTimeout)
        )
    }
}

impl std::fmt::Display for TargetSourceReadError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidRequest(message) => {
                write!(formatter, "invalid target source request: {message}")
            }
            Self::ResourceLimit(message) => write!(
                formatter,
                "target source resource limit exceeded: {message}"
            ),
            Self::Discovery(error) => error.fmt(formatter),
            Self::SourceBinding(message) => {
                write!(formatter, "target source binding failed: {message}")
            }
            Self::ReadPlan(error) => error.fmt(formatter),
            Self::Read(message) => write!(formatter, "target source read failed: {message}"),
            Self::Mapping(message) => write!(formatter, "target data mapping failed: {message}"),
            Self::SourceOutsideSessionsRoot { path } => write!(
                formatter,
                "target source resolves outside the configured sessions root: {path}"
            ),
            Self::Cancelled => formatter.write_str("source analysis cancelled"),
            Self::Timeout => formatter.write_str("resource timeout exceeded"),
        }
    }
}

impl std::error::Error for TargetSourceReadError {}

/// Provenance for one rollout candidate selected by Rust discovery.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetSourceProvenance {
    pub rollout_id: String,
    pub path: PathBuf,
    pub timestamp: String,
    pub date_partition: String,
    pub file_size: u64,
    pub header_end_byte: u64,
    pub history_base: Option<HistoryBaseRef>,
    pub compression: TargetSourceCompression,
    /// Discovery already computed this bounded fingerprint.  It remains
    /// internal provenance and is used only when the target mapper asks the
    /// formal source layer to prove a full-snapshot append promotion.
    pub fingerprint: Option<SourceFingerprint>,
}

/// Evidence for one physical read plan.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetSourceSegmentEvidence {
    pub source_id: String,
    pub path: PathBuf,
    pub mode: SourceReadMode,
    pub compression: TargetSourceCompression,
    pub snapshot_boundary: TargetSnapshotBoundary,
    pub requested_range: TargetSourceByteRange,
    pub scanned_range: TargetSourceByteRange,
    pub complete_range: Option<TargetSourceByteRange>,
    pub pending_tail_bytes: u64,
    pub records_read: u64,
    pub decoded_bytes: u64,
    pub parse_gap_count: u64,
    pub source_shrank_during_read: bool,
    pub complete: bool,
}

/// Result of resolving and reading one target request.
///
/// This is an internal Rust value. In particular, `discovered_sources` and
/// `segments` are not target wire fields; the later target data mapping step
/// decides which lineage/coverage evidence belongs in a batch.
#[derive(Debug, Clone, PartialEq)]
pub struct TargetSourceRead {
    pub conversation_id: String,
    pub source_id: String,
    pub source_epoch: String,
    pub active_source: TargetSourceProvenance,
    pub discovered_sources: Vec<TargetSourceProvenance>,
    pub segments: Vec<TargetSourceSegmentEvidence>,
    pub records: Vec<SourceRecord>,
    /// Full lineage evidence re-read for same-source append continuation. It
    /// is intentionally separate from `records`: the reducer consumes only
    /// the append delta, while replacement validation needs the complete
    /// parent/child snapshots.
    pub lineage_segments: Option<Vec<TargetSourceSegmentEvidence>>,
    pub lineage_records: Option<Vec<SourceRecord>>,
    /// Formal append evidence produced by `JsonlSourceBackend::read_append`.
    /// It remains an internal Rust value; the target mapper converts it to the
    /// target cursor and stores it in the opaque reducer checkpoint state for
    /// the next append request.
    pub append_cursor: Option<ForwardAppendCursor>,
    pub lineage_transitions: Vec<TargetLineageTransition>,
    pub lineage_coverage: TargetLineageCoverage,
    pub lineage_checkpoint: TargetLineageCheckpoint,
}

/// Resolve and execute the source read represented by a target analyze
/// request. The deadline is derived from the target request's effective
/// resource limits and is shared by discovery and all physical segments.
pub fn read_target_source(
    request: &TargetAnalyzeRequest,
    startup: &TargetStartupConfig,
    cancelled: &AtomicBool,
) -> Result<TargetSourceRead, TargetSourceReadError> {
    request
        .validate()
        .map_err(|error| TargetSourceReadError::InvalidRequest(error.to_string()))?;
    let requested_limits = request.resource_limits.clone().unwrap_or_default();
    requested_limits
        .validate_for_runtime()
        .map_err(|error| TargetSourceReadError::InvalidRequest(error.to_string()))?;
    let limits = requested_limits.resolve();
    let deadline = Instant::now()
        .checked_add(Duration::from_millis(limits.timeout_ms))
        .ok_or_else(|| {
            TargetSourceReadError::InvalidRequest(
                "resource timeout deadline overflowed".to_string(),
            )
        })?;
    read_target_source_with_limits(request, startup, cancelled, limits, deadline)
}

/// Same source bridge with an explicit deadline, used by the target process
/// worker and deterministic cancellation/deadline tests.
pub fn read_target_source_with_deadline(
    request: &TargetAnalyzeRequest,
    startup: &TargetStartupConfig,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<TargetSourceRead, TargetSourceReadError> {
    request
        .validate()
        .map_err(|error| TargetSourceReadError::InvalidRequest(error.to_string()))?;
    let requested_limits = request.resource_limits.clone().unwrap_or_default();
    requested_limits
        .validate_for_runtime()
        .map_err(|error| TargetSourceReadError::InvalidRequest(error.to_string()))?;
    read_target_source_with_limits(
        request,
        startup,
        cancelled,
        requested_limits.resolve(),
        deadline,
    )
}

fn read_target_source_with_limits(
    request: &TargetAnalyzeRequest,
    startup: &TargetStartupConfig,
    cancelled: &AtomicBool,
    limits: TargetResolvedResourceLimits,
    deadline: Instant,
) -> Result<TargetSourceRead, TargetSourceReadError> {
    check_control(cancelled, deadline)?;
    let max_line_bytes = usize::try_from(limits.max_line_bytes).map_err(|_| {
        TargetSourceReadError::ResourceLimit("max_line_bytes does not fit usize".to_string())
    })?;
    if max_line_bytes == 0 || limits.max_decoded_bytes == 0 || limits.max_segment_bytes == 0 {
        return Err(TargetSourceReadError::ResourceLimit(
            "source limits must be greater than zero".to_string(),
        ));
    }

    // No request fields other than the explicit conversation ID are used for
    // locating the session. In particular, target callers cannot supply a
    // path, date range, active-head hint or catalog.
    let discovery_request = SessionDiscoveryRequest::new(
        startup.sessions_root().to_path_buf(),
        request.conversation_id.clone(),
    )
    .with_limits(DISCOVERY_MAX_CANDIDATES, DISCOVERY_MAX_DATE_PARTITIONS);
    let budget = DiscoveryBudget::new(
        DISCOVERY_MAX_DIRECTORY_ENTRIES,
        DISCOVERY_MAX_HEADER_BYTES,
        DISCOVERY_MAX_FINGERPRINT_BYTES,
    );
    let mut discovery_control = DiscoveryControl::new(cancelled, deadline, budget);
    let session = discover_session_with_control(&discovery_request, &mut discovery_control)
        .map_err(TargetSourceReadError::Discovery)?;
    check_control(cancelled, deadline)?;
    validate_all_lineage_relations(&session)?;

    let canonical_root = fs::canonicalize(startup.sessions_root()).map_err(|error| {
        TargetSourceReadError::Read(format!(
            "canonicalize sessions root {}: {error}",
            startup.sessions_root().display()
        ))
    })?;
    ensure_session_paths_within_root(&canonical_root, &session)?;

    let source_epoch = session.source_epoch();
    let active_rollout = session.active_rollout();
    let active_source = provenance_for_rollout(active_rollout, request, max_line_bytes)?;
    let active_spec = bind_spec(
        &request.conversation_id,
        &active_source.rollout_id,
        &active_source.path,
        Some(&source_epoch),
        active_source.fingerprint.as_ref(),
        limits,
    )?;
    let cursor_matches_active = request.cursor.as_ref().is_some_and(|cursor| {
        cursor.conversation_id == request.conversation_id
            && cursor.source_id == session.active_head_rollout_id
            && cursor.source_epoch == source_epoch
    });
    let formal_append_cursor = if request.mode == TargetAnalyzeMode::Append && cursor_matches_active
    {
        Some(load_persisted_append_cursor(
            request,
            &session.active_head_rollout_id,
            &source_epoch,
        )?)
    } else {
        None
    };
    let active_plan = plan_active_source(
        request,
        &active_spec,
        &session,
        limits,
        formal_append_cursor.as_ref(),
    )?;
    let full_lineage_read = request.mode != TargetAnalyzeMode::Preview
        && is_full_plan(&active_plan)
        && (request.mode == TargetAnalyzeMode::Backfill
            || request.cursor.is_none()
            || !cursor_matches_active);
    let lineage_recovery =
        should_recover_lineage_on_append(request, &session, cursor_matches_active);

    let mut planned_segments = Vec::with_capacity(if lineage_recovery {
        1
    } else {
        session.chain.len()
    });
    if !lineage_recovery {
        for child in session.chain.iter().skip(1) {
            check_control(cancelled, deadline)?;
            let history_base = child.header.history_base.as_ref().ok_or_else(|| {
                TargetSourceReadError::Discovery(LineageError::InvalidHistoryBase {
                    rollout_id: child.source.rollout_id.clone(),
                    message: "lineage child has no history_base".to_string(),
                })
            })?;
            let (parent, plan) = if full_lineage_read {
                let parent = session
                    .catalog
                    .resolve(&history_base.parent_rollout_id)
                    .map_err(TargetSourceReadError::Discovery)?;
                let parent_spec = bind_spec(
                    &request.conversation_id,
                    &parent.rollout_id,
                    &parent.path,
                    None,
                    None,
                    limits,
                )?;
                if parent_spec.compression() == crate::source::SourceCompression::Zstd {
                    return Err(TargetSourceReadError::Discovery(
                        LineageError::UnsupportedParentSourceCompression {
                            rollout_id: parent.rollout_id.clone(),
                            compression: parent_spec.compression().as_str().to_string(),
                            operation: "parent_full_history".to_string(),
                        },
                    ));
                }
                let plan = JsonlSourceBackend
                    .plan_full(&parent_spec)
                    .map_err(TargetSourceReadError::ReadPlan)?;
                (parent, plan)
            } else {
                session
                    .catalog
                    .plan_parent_suffix(
                        history_base,
                        &request.conversation_id,
                        limits.max_decoded_bytes,
                        max_line_bytes,
                        limits.max_segment_bytes,
                    )
                    .map_err(TargetSourceReadError::Discovery)?
            };
            let candidate = session
                .candidates
                .iter()
                .find(|candidate| candidate.source.rollout_id == parent.rollout_id)
                .ok_or_else(|| {
                    TargetSourceReadError::Discovery(LineageError::ParentRolloutMissing {
                        rollout_id: parent.rollout_id.clone(),
                    })
                })?;
            planned_segments.push(PlannedTargetSegment {
                provenance: provenance_for_rollout(candidate, request, max_line_bytes)?,
                plan,
                append_cursor: None,
            });
        }
    }

    planned_segments.push(PlannedTargetSegment {
        provenance: active_source.clone(),
        plan: active_plan,
        append_cursor: formal_append_cursor,
    });

    let backend = JsonlSourceBackend;
    let mut segments = Vec::with_capacity(planned_segments.len());
    let mut records = Vec::new();
    let mut append_cursor = None;
    let mut total_decoded_bytes = 0_u64;
    for planned in planned_segments {
        check_control(cancelled, deadline)?;
        let remaining_decoded_bytes = limits.max_decoded_bytes.saturating_sub(total_decoded_bytes);
        if remaining_decoded_bytes == 0 {
            return Err(TargetSourceReadError::ResourceLimit(format!(
                "aggregate decoded bytes reached request limit {} before reading {}",
                limits.max_decoded_bytes, planned.provenance.rollout_id
            )));
        }
        let (evidence, mut segment_records, next_append_cursor) =
            if let Some(append_cursor) = planned.append_cursor.as_ref() {
                read_append_segment(
                    &backend,
                    &planned,
                    append_cursor,
                    remaining_decoded_bytes,
                    cancelled,
                    deadline,
                )?
            } else {
                let (evidence, records) = read_segment(
                    &backend,
                    &planned,
                    remaining_decoded_bytes,
                    cancelled,
                    deadline,
                )?;
                (evidence, records, None)
            };
        total_decoded_bytes = total_decoded_bytes.saturating_add(evidence.decoded_bytes);
        if total_decoded_bytes > limits.max_decoded_bytes {
            return Err(TargetSourceReadError::ResourceLimit(format!(
                "aggregate decoded bytes {} exceed {}",
                total_decoded_bytes, limits.max_decoded_bytes
            )));
        }
        records.append(&mut segment_records);
        segments.push(evidence);
        if next_append_cursor.is_some() {
            append_cursor = next_append_cursor;
        }
    }

    let (lineage_segments, lineage_records) = if lineage_recovery {
        let (full_segments, full_records) = read_full_lineage_for_append(
            &backend,
            request,
            &session,
            &active_source,
            &active_spec,
            max_line_bytes,
            limits,
            &mut total_decoded_bytes,
            cancelled,
            deadline,
        )?;
        if !full_segments.is_empty() {
            (Some(full_segments), Some(full_records))
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    let lineage_transitions = session
        .transitions
        .iter()
        .map(|transition| TargetLineageTransition {
            parent_rollout_id: transition.parent_rollout_id.clone(),
            child_rollout_id: transition.child_rollout_id.clone(),
            history_base: transition.history_base.clone(),
            // This step proves source/header/cut reachability. Replacement
            // validation belongs to the Adapter/reducer mapping step.
            validation_state: TargetLineageValidationState::ValidationUnavailable,
        })
        .collect::<Vec<_>>();
    let coverage_segments = lineage_segments.as_deref().unwrap_or(&segments);
    let lineage_read_complete = if lineage_recovery {
        lineage_segments.is_some()
    } else {
        full_lineage_read && request.cursor.is_none() && request.known_complete_range.is_none()
    };
    let covered_source_count = coverage_segments
        .iter()
        .map(|segment| segment.source_id.as_str())
        .collect::<BTreeSet<_>>()
        .len() as u64;
    let lineage_coverage = TargetLineageCoverage {
        root_rollout_id: session.root_rollout_id.clone(),
        active_head_rollout_id: session.active_head_rollout_id.clone(),
        chain_rollout_ids: session
            .chain
            .iter()
            .map(|candidate| candidate.source.rollout_id.clone())
            .collect(),
        covered_source_count,
        // The target step has read every planned segment to a safe boundary.
        // A preview or parent-suffix window is not a complete logical history.
        complete: lineage_read_complete,
    };
    let lineage_coverage = TargetLineageCoverage {
        complete: lineage_coverage.complete
            && coverage_segments.iter().all(source_segment_is_complete),
        ..lineage_coverage
    };
    let lineage_checkpoint = TargetLineageCheckpoint {
        schema_version: TARGET_DATA_SCHEMA_VERSION,
        conversation_id: session.conversation_id.clone(),
        root_rollout_id: session.root_rollout_id.clone(),
        active_head_rollout_id: session.active_head_rollout_id.clone(),
        chain_rollout_ids: lineage_coverage.chain_rollout_ids.clone(),
        start_date: session.start_date.clone(),
        end_date: session.end_date.clone(),
        coverage: lineage_coverage.clone(),
    };
    lineage_checkpoint
        .validate()
        .map_err(|error| TargetSourceReadError::InvalidRequest(error.to_string()))?;

    check_control(cancelled, deadline)?;
    Ok(TargetSourceRead {
        conversation_id: session.conversation_id.clone(),
        source_id: active_source.rollout_id.clone(),
        source_epoch,
        active_source,
        discovered_sources: session
            .candidates
            .iter()
            .map(|candidate| provenance_for_rollout(candidate, request, max_line_bytes))
            .collect::<Result<Vec<_>, _>>()?,
        segments,
        records,
        lineage_segments,
        lineage_records,
        append_cursor,
        lineage_transitions,
        lineage_coverage,
        lineage_checkpoint,
    })
}

fn should_recover_lineage_on_append(
    request: &TargetAnalyzeRequest,
    session: &SessionLineage,
    cursor_matches_active: bool,
) -> bool {
    if request.mode != TargetAnalyzeMode::Append
        || !cursor_matches_active
        || session.chain.len() <= 1
    {
        return false;
    }
    let Some(checkpoint) = request.persisted_anchor.as_ref() else {
        return false;
    };
    let Some(lineage) = checkpoint.lineage_checkpoint.as_ref() else {
        return false;
    };
    checkpoint.completeness == TargetCompleteness::Canonical
        && lineage.conversation_id == request.conversation_id
        && lineage.coverage.complete
        && lineage.root_rollout_id == session.root_rollout_id
        && lineage.active_head_rollout_id == session.active_head_rollout_id
        && lineage.chain_rollout_ids
            == session
                .chain
                .iter()
                .map(|candidate| candidate.source.rollout_id.clone())
                .collect::<Vec<_>>()
}

fn read_full_lineage_for_append(
    backend: &JsonlSourceBackend,
    request: &TargetAnalyzeRequest,
    session: &SessionLineage,
    active_source: &TargetSourceProvenance,
    active_spec: &SourceSpec,
    max_line_bytes: usize,
    limits: TargetResolvedResourceLimits,
    total_decoded_bytes: &mut u64,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<(Vec<TargetSourceSegmentEvidence>, Vec<SourceRecord>), TargetSourceReadError> {
    let mut segments = Vec::with_capacity(session.chain.len());
    let mut records = Vec::new();
    for candidate in &session.chain {
        check_control(cancelled, deadline)?;
        let is_active = candidate.source.rollout_id == active_source.rollout_id;
        let provenance = if is_active {
            active_source.clone()
        } else {
            provenance_for_rollout(candidate, request, max_line_bytes)?
        };
        let spec = if is_active {
            active_spec.clone()
        } else {
            let parent_spec = bind_spec(
                &request.conversation_id,
                &candidate.source.rollout_id,
                &candidate.source.path,
                None,
                None,
                limits,
            )?;
            if parent_spec.compression() == crate::source::SourceCompression::Zstd {
                return Err(TargetSourceReadError::Discovery(
                    LineageError::UnsupportedParentSourceCompression {
                        rollout_id: candidate.source.rollout_id.clone(),
                        compression: parent_spec.compression().as_str().to_string(),
                        operation: "append_lineage_recovery".to_string(),
                    },
                ));
            }
            parent_spec
        };
        let plan = backend
            .plan_full(&spec)
            .map_err(TargetSourceReadError::ReadPlan)?;
        let planned = PlannedTargetSegment {
            provenance,
            plan,
            append_cursor: None,
        };
        let remaining_decoded_bytes = limits
            .max_decoded_bytes
            .saturating_sub(*total_decoded_bytes);
        if remaining_decoded_bytes == 0 {
            return Err(TargetSourceReadError::ResourceLimit(format!(
                "aggregate decoded bytes reached request limit {} before lineage recovery source {}",
                limits.max_decoded_bytes, candidate.source.rollout_id
            )));
        }
        let (evidence, mut source_records) = read_segment(
            backend,
            &planned,
            remaining_decoded_bytes,
            cancelled,
            deadline,
        )?;
        *total_decoded_bytes = (*total_decoded_bytes).saturating_add(evidence.decoded_bytes);
        if *total_decoded_bytes > limits.max_decoded_bytes {
            return Err(TargetSourceReadError::ResourceLimit(format!(
                "aggregate decoded bytes {} exceed {} during lineage recovery",
                *total_decoded_bytes, limits.max_decoded_bytes
            )));
        }
        records.append(&mut source_records);
        segments.push(evidence);
    }
    Ok((segments, records))
}

fn source_segment_is_complete(segment: &TargetSourceSegmentEvidence) -> bool {
    segment.complete
        && segment.pending_tail_bytes == 0
        && segment.parse_gap_count == 0
        && !segment.source_shrank_during_read
}

#[derive(Debug)]
struct PlannedTargetSegment {
    provenance: TargetSourceProvenance,
    plan: SourceReadPlan,
    append_cursor: Option<ForwardAppendCursor>,
}

fn load_persisted_append_cursor(
    request: &TargetAnalyzeRequest,
    source_id: &str,
    source_epoch: &str,
) -> Result<ForwardAppendCursor, TargetSourceReadError> {
    let target_cursor = request.cursor.as_ref().ok_or_else(|| {
        TargetSourceReadError::InvalidRequest(
            "append continuation requires a target forward_append cursor".to_string(),
        )
    })?;
    let checkpoint = request.persisted_anchor.as_ref().ok_or_else(|| {
        TargetSourceReadError::InvalidRequest(
            "append continuation requires persisted formal source evidence".to_string(),
        )
    })?;
    if checkpoint.source.source_id != source_id || checkpoint.source.source_epoch != source_epoch {
        return Err(TargetSourceReadError::InvalidRequest(
            "persisted append evidence does not match the active source".to_string(),
        ));
    }
    let payload = checkpoint
        .reducer_state
        .payload
        .as_object()
        .ok_or_else(|| {
            TargetSourceReadError::InvalidRequest(
                "persisted reducer state must contain an object payload".to_string(),
            )
        })?;
    let source_cursor = payload.get("source_cursor").ok_or_else(|| {
        TargetSourceReadError::InvalidRequest(
            "persisted append evidence is missing source_cursor".to_string(),
        )
    })?;
    let formal_cursor = serde_json::from_value::<ForwardAppendCursor>(source_cursor.clone())
        .map_err(|error| {
            TargetSourceReadError::InvalidRequest(format!(
                "persisted formal append cursor is invalid: {error}"
            ))
        })?;
    let metadata = formal_cursor.metadata();
    if metadata.target_conversation_id() != request.conversation_id
        || metadata.source_id() != source_id
        || metadata.source_epoch() != source_epoch
        || target_cursor.source_id != source_id
        || target_cursor.source_epoch != source_epoch
        || target_cursor.complete_range.start != metadata.complete_range().start()
        || target_cursor.complete_range.end != metadata.complete_range().end()
        || target_cursor.snapshot_boundary.byte_length != metadata.snapshot_boundary().byte_length()
        || target_cursor.last_rollout_ordinal != metadata.last_rollout_ordinal()
    {
        return Err(TargetSourceReadError::InvalidRequest(
            "target cursor does not match persisted formal append evidence".to_string(),
        ));
    }
    Ok(formal_cursor)
}

fn read_append_segment(
    backend: &JsonlSourceBackend,
    planned: &PlannedTargetSegment,
    cursor: &ForwardAppendCursor,
    max_decoded_bytes: u64,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<
    (
        TargetSourceSegmentEvidence,
        Vec<SourceRecord>,
        Option<ForwardAppendCursor>,
    ),
    TargetSourceReadError,
> {
    check_control(cancelled, deadline)?;
    let source_spec = planned.plan.source_spec().clone().with_limits(
        max_decoded_bytes,
        planned.plan.source_spec().max_line_bytes(),
    );
    let mut records = Vec::new();
    let report = backend
        .read_append(cursor, &source_spec, &mut |record| {
            check_control(cancelled, deadline)
                .map_err(|error| anyhow::anyhow!(error.to_string()))?;
            records.push(record);
            Ok(())
        })
        .map_err(map_append_error)?;
    check_control(cancelled, deadline)?;

    let original_end = cursor.metadata().snapshot_boundary().byte_length();
    let observed_end = report.snapshot_boundary().byte_length();
    let requested_start = original_end.min(observed_end);
    let requested_range = SourceByteRange::new(requested_start, observed_end)
        .map_err(TargetSourceReadError::ReadPlan)?;
    let empty_range =
        SourceByteRange::new(requested_start, requested_start).expect("ordered empty append range");
    let scanned_range = report.scanned_range().unwrap_or(empty_range);
    let decoded_bytes = if observed_end > original_end {
        scanned_range
            .end()
            .saturating_sub(scanned_range.start())
            .max(observed_end.saturating_sub(original_end))
            .min(max_decoded_bytes)
    } else {
        0
    };
    let parse_gap_count = records
        .iter()
        .filter(|record| record.parse_error.is_some())
        .count() as u64;
    let complete = report.next_cursor().is_some()
        && report.diagnostic().is_none()
        && report.pending_tail_bytes() == 0
        && !report.source_shrank_during_read()
        && parse_gap_count == 0;
    let next_cursor = if complete {
        report.next_cursor().cloned()
    } else {
        None
    };
    let evidence = TargetSourceSegmentEvidence {
        source_id: planned.provenance.rollout_id.clone(),
        path: planned.provenance.path.clone(),
        mode: SourceReadMode::ForwardRange,
        compression: planned.provenance.compression,
        snapshot_boundary: report.snapshot_boundary().into(),
        requested_range: requested_range.into(),
        scanned_range: scanned_range.into(),
        complete_range: report.complete_range().map(Into::into),
        pending_tail_bytes: report.pending_tail_bytes(),
        records_read: u64::try_from(records.len()).unwrap_or(u64::MAX),
        decoded_bytes,
        parse_gap_count,
        source_shrank_during_read: report.source_shrank_during_read(),
        complete,
    };
    Ok((evidence, records, next_cursor))
}

fn map_append_error(error: AppendError) -> TargetSourceReadError {
    match error {
        AppendError::Cursor(error) => TargetSourceReadError::InvalidRequest(error.to_string()),
        AppendError::Plan(error) => TargetSourceReadError::ReadPlan(error),
        AppendError::Io { operation, message } | AppendError::Digest { operation, message } => {
            TargetSourceReadError::Read(format!("{operation}: {message}"))
        }
        AppendError::UnsupportedDigestAlgorithm { field, algorithm } => {
            TargetSourceReadError::Read(format!(
                "append {field} uses unsupported digest algorithm {algorithm}"
            ))
        }
        AppendError::Callback { message }
            if message == TargetSourceReadError::Cancelled.to_string() =>
        {
            TargetSourceReadError::Cancelled
        }
        AppendError::Callback { message }
            if message == TargetSourceReadError::Timeout.to_string() =>
        {
            TargetSourceReadError::Timeout
        }
        AppendError::Callback { message } => TargetSourceReadError::Read(message),
    }
}

fn check_control(cancelled: &AtomicBool, deadline: Instant) -> Result<(), TargetSourceReadError> {
    if cancelled.load(Ordering::Acquire) {
        return Err(TargetSourceReadError::Cancelled);
    }
    if Instant::now() >= deadline {
        return Err(TargetSourceReadError::Timeout);
    }
    Ok(())
}

fn ensure_session_paths_within_root(
    canonical_root: &Path,
    session: &SessionLineage,
) -> Result<(), TargetSourceReadError> {
    for candidate in &session.candidates {
        let canonical = fs::canonicalize(&candidate.source.path).map_err(|error| {
            TargetSourceReadError::Read(format!(
                "canonicalize discovered source {}: {error}",
                candidate.source.path.display()
            ))
        })?;
        if !canonical.starts_with(canonical_root) {
            return Err(TargetSourceReadError::SourceOutsideSessionsRoot {
                path: candidate.source.path.display().to_string(),
            });
        }
    }
    Ok(())
}

fn validate_all_lineage_relations(session: &SessionLineage) -> Result<(), TargetSourceReadError> {
    let by_id = session
        .candidates
        .iter()
        .map(|candidate| (candidate.source.rollout_id.as_str(), candidate))
        .collect::<BTreeMap<_, _>>();
    for candidate in &session.candidates {
        let mut current = candidate.source.rollout_id.as_str();
        let mut visited = BTreeSet::new();
        loop {
            if !visited.insert(current) {
                return Err(TargetSourceReadError::Discovery(
                    LineageError::ParentChainCycle {
                        rollout_id: current.to_string(),
                    },
                ));
            }
            let Some(current_candidate) = by_id.get(current) else {
                return Err(TargetSourceReadError::Discovery(
                    LineageError::ParentRolloutMissing {
                        rollout_id: current.to_string(),
                    },
                ));
            };
            let Some(history_base) = current_candidate.header.history_base.as_ref() else {
                break;
            };
            if !by_id.contains_key(history_base.parent_rollout_id.as_str()) {
                return Err(TargetSourceReadError::Discovery(
                    LineageError::ParentRolloutMissing {
                        rollout_id: history_base.parent_rollout_id.clone(),
                    },
                ));
            }
            current = history_base.parent_rollout_id.as_str();
        }
    }
    Ok(())
}

fn provenance_for_rollout(
    candidate: &DiscoveredRollout,
    request: &TargetAnalyzeRequest,
    max_line_bytes: usize,
) -> Result<TargetSourceProvenance, TargetSourceReadError> {
    let spec = SourceSpec::bind(
        &request.conversation_id,
        candidate.source.rollout_id.clone(),
        candidate.source.path.clone(),
    )
    .map_err(|error| TargetSourceReadError::SourceBinding(error.to_string()))?;
    if candidate.header.header_end_byte > max_line_bytes as u64 {
        return Err(TargetSourceReadError::ResourceLimit(format!(
            "source header for {} exceeds max_line_bytes {}",
            candidate.source.rollout_id, max_line_bytes
        )));
    }
    Ok(TargetSourceProvenance {
        rollout_id: candidate.source.rollout_id.clone(),
        path: candidate.source.path.clone(),
        timestamp: candidate.filename.timestamp.clone(),
        date_partition: candidate.filename.date_partition.clone(),
        file_size: candidate.file_size,
        header_end_byte: candidate.header.header_end_byte,
        history_base: candidate.header.history_base.clone(),
        compression: spec.compression().into(),
        fingerprint: candidate.fingerprint.clone(),
    })
}

fn bind_spec(
    conversation_id: &str,
    source_id: &str,
    path: &Path,
    source_epoch: Option<&str>,
    fingerprint: Option<&SourceFingerprint>,
    limits: TargetResolvedResourceLimits,
) -> Result<SourceSpec, TargetSourceReadError> {
    let max_line_bytes = usize::try_from(limits.max_line_bytes).map_err(|_| {
        TargetSourceReadError::ResourceLimit("max_line_bytes does not fit usize".to_string())
    })?;
    let mut spec = SourceSpec::bind(conversation_id, source_id, path.to_path_buf())
        .map_err(|error| TargetSourceReadError::SourceBinding(error.to_string()))?
        .with_limits(limits.max_decoded_bytes, max_line_bytes)
        .with_segment_limit(limits.max_segment_bytes);
    if let Some(source_epoch) = source_epoch {
        spec = spec
            .with_source_epoch(source_epoch.to_string())
            .map_err(|error| TargetSourceReadError::SourceBinding(error.to_string()))?;
    }
    if let Some(fingerprint) = fingerprint {
        let prefix_anchor = SourcePrefixAnchor::new(
            fingerprint.algorithm(),
            fingerprint.digest(),
            fingerprint.covered_bytes(),
        )
        .map_err(|error| TargetSourceReadError::SourceBinding(error.to_string()))?;
        spec = spec
            .with_fingerprint(fingerprint.clone())
            .with_prefix_anchor(prefix_anchor);
    }
    Ok(spec)
}

fn plan_active_source(
    request: &TargetAnalyzeRequest,
    spec: &SourceSpec,
    session: &SessionLineage,
    limits: TargetResolvedResourceLimits,
    formal_append_cursor: Option<&ForwardAppendCursor>,
) -> Result<SourceReadPlan, TargetSourceReadError> {
    let backend = JsonlSourceBackend;
    let cursor = request.cursor.as_ref();
    let cursor_matches_active = cursor.is_some_and(|cursor| {
        cursor.conversation_id == request.conversation_id
            && cursor.source_id == session.active_head_rollout_id
            && cursor.source_epoch == session.source_epoch()
    });

    match request.mode {
        TargetAnalyzeMode::Preview => {
            if let Some(cursor) = cursor
                && cursor.cursor_kind != super::target_data::TargetCursorKind::TailPreview
            {
                return Err(TargetSourceReadError::InvalidRequest(
                    "preview requires a tail_preview cursor".to_string(),
                ));
            }
            if spec.compression() == crate::source::SourceCompression::Zstd {
                // Ordinary zstd has no tail/backward primitive. Active/root
                // sources are still allowed to use a bounded forward stream.
                return backend
                    .plan_forward(spec)
                    .map_err(TargetSourceReadError::ReadPlan);
            }
            if cursor_matches_active {
                let cursor = cursor.expect("cursor_matches_active implies a cursor");
                return backend
                    .plan_range(
                        spec,
                        SourceReadMode::BackwardRange,
                        source_range(cursor.complete_range),
                    )
                    .map_err(TargetSourceReadError::ReadPlan);
            }
            backend
                .plan_tail(spec, limits.tail_bytes)
                .map_err(TargetSourceReadError::ReadPlan)
        }
        TargetAnalyzeMode::Backfill => {
            if let Some(cursor) = cursor
                && cursor.cursor_kind != super::target_data::TargetCursorKind::Backfill
            {
                return Err(TargetSourceReadError::InvalidRequest(
                    "backfill requires a backfill cursor".to_string(),
                ));
            }
            if spec.compression() == crate::source::SourceCompression::Zstd {
                return backend
                    .plan_forward(spec)
                    .map_err(TargetSourceReadError::ReadPlan);
            }
            let range = if cursor_matches_active {
                source_range_or_full(
                    request
                        .known_complete_range
                        .or_else(|| cursor.map(|cursor| cursor.complete_range)),
                    spec.path(),
                )?
            } else if cursor.is_none() {
                source_range_or_full(request.known_complete_range, spec.path())?
            } else {
                full_source_range(spec.path())?
            };
            backend
                .plan_range(spec, SourceReadMode::BackwardRange, range)
                .map_err(TargetSourceReadError::ReadPlan)
        }
        TargetAnalyzeMode::Append => {
            if let Some(cursor) = cursor
                && cursor.cursor_kind != super::target_data::TargetCursorKind::ForwardAppend
            {
                return Err(TargetSourceReadError::InvalidRequest(
                    "append requires a forward_append cursor".to_string(),
                ));
            }
            if spec.compression() == crate::source::SourceCompression::Zstd {
                return backend
                    .plan_forward(spec)
                    .map_err(TargetSourceReadError::ReadPlan);
            }
            if cursor_matches_active {
                let cursor = cursor.expect("cursor_matches_active implies a cursor");
                let formal_cursor = formal_append_cursor.ok_or_else(|| {
                    TargetSourceReadError::InvalidRequest(
                        "append continuation requires persisted formal source evidence".to_string(),
                    )
                })?;
                let append_spec = spec
                    .clone()
                    .with_fingerprint(formal_cursor.metadata().fingerprint().clone())
                    .with_prefix_anchor(formal_cursor.metadata().prefix_anchor().clone());
                if cursor.complete_range.start != 0
                    || cursor.complete_range.end != formal_cursor.metadata().complete_range().end()
                    || cursor.snapshot_boundary.byte_length
                        != formal_cursor.metadata().snapshot_boundary().byte_length()
                {
                    return Err(TargetSourceReadError::InvalidRequest(
                        "target cursor does not match persisted formal append evidence".to_string(),
                    ));
                }
                backend
                    .plan_full(&append_spec)
                    .map_err(TargetSourceReadError::ReadPlan)
            } else {
                backend
                    .plan_full(spec)
                    .map_err(TargetSourceReadError::ReadPlan)
            }
        }
    }
}

fn source_range(range: TargetSourceByteRange) -> SourceByteRange {
    SourceByteRange::new(range.start, range.end).expect("validated target source range")
}

fn source_range_or_full(
    range: Option<TargetSourceByteRange>,
    path: &Path,
) -> Result<SourceByteRange, TargetSourceReadError> {
    match range {
        Some(range) => Ok(source_range(range)),
        None => full_source_range(path),
    }
}

fn is_full_plan(plan: &SourceReadPlan) -> bool {
    let range = plan.byte_range();
    range.start() == 0
        && range.end() == plan.snapshot_boundary().byte_length()
        && matches!(
            plan.mode(),
            SourceReadMode::FullRead
                | SourceReadMode::ForwardStream
                | SourceReadMode::BackwardRange
        )
}

fn full_source_range(path: &Path) -> Result<SourceByteRange, TargetSourceReadError> {
    let length = fs::metadata(path)
        .map_err(|error| TargetSourceReadError::Read(error.to_string()))?
        .len();
    SourceByteRange::new(0, length).map_err(TargetSourceReadError::ReadPlan)
}

fn read_segment(
    backend: &JsonlSourceBackend,
    planned: &PlannedTargetSegment,
    max_decoded_bytes: u64,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<(TargetSourceSegmentEvidence, Vec<SourceRecord>), TargetSourceReadError> {
    check_control(cancelled, deadline)?;
    let bounded_plan = plan_with_decoded_budget(backend, &planned.plan, max_decoded_bytes)?;
    let mut records = Vec::new();
    let report = bounded_plan
        .read(backend, &mut |record| {
            check_control(cancelled, deadline)
                .map_err(|error| anyhow::anyhow!(error.to_string()))?;
            records.push(record);
            Ok(())
        })
        .map_err(map_read_error)?;
    check_control(cancelled, deadline)?;
    if report.source().budget_exceeded {
        return Err(TargetSourceReadError::ResourceLimit(format!(
            "decoded source budget exceeded for {}",
            planned.provenance.rollout_id
        )));
    }
    let compression = planned.provenance.compression;
    let complete = !report.source_shrank_during_read()
        && report.pending_tail_bytes() == 0
        && !report.source().budget_exceeded
        && (compression == TargetSourceCompression::Zstd || report.complete_range().is_some());
    let evidence = TargetSourceSegmentEvidence {
        source_id: planned.provenance.rollout_id.clone(),
        path: planned.provenance.path.clone(),
        // A tail plan is rebuilt as an exact backward range below because the
        // source-layer plan is immutable and has no public limit-rebinding
        // constructor. Preserve the original target evidence mode here.
        mode: planned.plan.mode(),
        compression,
        snapshot_boundary: report.snapshot_boundary().into(),
        requested_range: planned.plan.byte_range().into(),
        scanned_range: report.scanned_range().into(),
        complete_range: report.complete_range().map(Into::into),
        pending_tail_bytes: report.pending_tail_bytes(),
        records_read: u64::try_from(records.len()).unwrap_or(u64::MAX),
        decoded_bytes: report.source().decoded_bytes,
        parse_gap_count: report.source().parse_gap_count,
        source_shrank_during_read: report.source_shrank_during_read(),
        complete,
    };
    Ok((evidence, records))
}

fn plan_with_decoded_budget(
    backend: &JsonlSourceBackend,
    plan: &SourceReadPlan,
    max_decoded_bytes: u64,
) -> Result<SourceReadPlan, TargetSourceReadError> {
    if max_decoded_bytes == 0 {
        return Err(TargetSourceReadError::ResourceLimit(
            "request decoded budget is exhausted before the next segment".to_string(),
        ));
    }

    let source_spec = plan.source_spec();
    let bounded_spec = source_spec
        .clone()
        .with_limits(max_decoded_bytes, source_spec.max_line_bytes());
    let result = match plan.mode() {
        SourceReadMode::FullRead => backend.plan_full(&bounded_spec),
        SourceReadMode::ForwardStream => backend.plan_forward(&bounded_spec),
        SourceReadMode::TailPreview => backend.plan_range(
            &bounded_spec,
            SourceReadMode::BackwardRange,
            plan.byte_range(),
        ),
        SourceReadMode::BackwardRange | SourceReadMode::ForwardRange => {
            backend.plan_range(&bounded_spec, plan.mode(), plan.byte_range())
        }
    };
    result.map_err(TargetSourceReadError::ReadPlan)
}

fn map_read_error(error: anyhow::Error) -> TargetSourceReadError {
    let message = error.to_string();
    if message == TargetSourceReadError::Cancelled.to_string() {
        TargetSourceReadError::Cancelled
    } else if message == TargetSourceReadError::Timeout.to_string() {
        TargetSourceReadError::Timeout
    } else {
        TargetSourceReadError::Read(message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_error_code_preserves_nested_resource_boundaries() {
        let cases = [
            (
                TargetSourceReadError::Discovery(LineageError::DiscoveryBudgetExceeded {
                    resource: "header_bytes".to_string(),
                    limit: 64,
                }),
                "resource_limit_exceeded",
                false,
            ),
            (
                TargetSourceReadError::Discovery(LineageError::DiscoveryLimitExceeded {
                    limit: 4096,
                }),
                "resource_limit_exceeded",
                false,
            ),
            (
                TargetSourceReadError::Discovery(LineageError::DatePartitionLimitExceeded {
                    limit: 366,
                }),
                "resource_limit_exceeded",
                false,
            ),
            (
                TargetSourceReadError::Discovery(LineageError::DiscoveryTimeout),
                "resource_timeout",
                true,
            ),
            (
                TargetSourceReadError::Discovery(LineageError::DiscoveryCancelled),
                "cancelled",
                false,
            ),
            (
                TargetSourceReadError::ReadPlan(SourceReadPlanError::SegmentLimitExceeded {
                    requested: 2,
                    max: 1,
                }),
                "resource_limit_exceeded",
                false,
            ),
            (
                TargetSourceReadError::Discovery(LineageError::ParentRolloutMissing {
                    rollout_id: "parent".to_string(),
                }),
                "analysis_failed",
                false,
            ),
        ];

        for (error, code, retryable) in cases {
            assert_eq!(
                error.wire_error_code(),
                code,
                "unexpected code for {error:?}"
            );
            assert_eq!(
                error.is_retryable(),
                retryable,
                "unexpected retryability for {error:?}"
            );
        }
    }
}
