//! Target-side mapping from source records to the Rust-owned 4.5 data shape.
//!
//! The source bridge deliberately returns physical records and lineage
//! evidence only.  This module is the next, target-owned boundary: it keeps a
//! stateful `CodexEventAdapter` and `AnalysisReducer` together for one read,
//! restores their checkpoint state when the source epoch is still valid, and
//! only then constructs the batch/checkpoint pair consumed by the target
//! runtime.

use std::{
    collections::{BTreeMap, BTreeSet},
    sync::atomic::{AtomicBool, Ordering},
    time::Instant,
};

use serde::Serialize;
use serde_json::{Value, json};

use crate::analysis::{
    AnalysisProjection, AnalysisReducer, ProjectionCoverage, validate_last_turn_replacement,
};
use crate::codex_adapter::CodexEventAdapter;
use crate::codex_wire::{CompatibilityProfile, decode_source_record};
use crate::error::CollectorErrorKind;
use crate::model::{
    AnalysisEvent, Availability, LastTurnReplacement, TerminalEvidence, TurnStatus,
};
use crate::protocol::batch::{AnalysisBatch, BatchCompleteness, BatchDiagnostic, ParserProvenance};
use crate::source::{
    CURSOR_READER_BACKEND, CURSOR_READER_VERSION, ForwardAppendCursor, SegmentAssembler,
    SegmentCompleteness, SegmentDescriptor, SnapshotBoundary, SourceByteRange, SourceRecord,
    SourceSegment, SourceSpec,
};

use super::target::{
    TargetAnalyzeMode, TargetAnalyzeRequest, TargetBatchMessage, TargetCompleteMessage,
    TargetCompleteStatus,
};
use super::target_data::{
    TARGET_CURSOR_SCHEMA_VERSION, TARGET_DATA_SCHEMA_VERSION, TARGET_REDUCER_ID,
    TargetAnalysisBatch, TargetAnalyzerCheckpoint, TargetAnalyzerCursor, TargetBatchMappingContext,
    TargetBatchSourceRef, TargetCheckpointReader, TargetCheckpointSegment, TargetCheckpointSource,
    TargetCheckpointWireProfile, TargetCompleteLineBoundary, TargetCompleteness,
    TargetCursorCapabilities, TargetCursorKind, TargetLineageCheckpoint, TargetLineageCoverage,
    TargetLineageTransition, TargetLineageValidationState, TargetMutation, TargetProgress,
    TargetProjectionWatermark, TargetReducerCheckpointState, TargetSourceByteRange,
    TargetSourceCompression, TargetSourceKind, TargetTaskOutcome, TargetToolDetail,
};
use super::target_source::{TargetSourceRead, TargetSourceReadError, TargetSourceSegmentEvidence};

const TARGET_REDUCER_VERSION: &str = "target-v1";
const EVENT_SEQUENCE_STRIDE: u64 = 1_000_000;
const SOURCE_SEQUENCE_STRIDE: u64 = 1_000_000_000_000;

/// The batch and terminal checkpoint are built from the same mapping pass.
/// Keeping them together prevents the target process from ACKing a batch and
/// later constructing a checkpoint with a different source/cursor scope.
#[derive(Debug, Clone, PartialEq)]
pub struct TargetMappedAnalysis {
    pub batch: TargetBatchMessage,
    pub complete: TargetCompleteMessage,
}

/// Map one completed target source read into one idempotent target delivery.
///
/// The current target runtime has one ACK-pending slot, so the physical
/// lineage segments are assembled into one logical batch.  Segment overlap is
/// removed before the Adapter sees records, while the segment evidence still
/// drives progress, cursor and checkpoint construction.
pub fn map_target_source_read(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
) -> Result<TargetMappedAnalysis, TargetSourceReadError> {
    map_target_source_read_inner(request, source, None, None)
}

/// Map one source result while sharing the target request's cancellation and
/// deadline with the source worker. The public wrapper above remains useful
/// for deterministic in-process mapping tests that do not own a runtime slot.
pub fn map_target_source_read_with_control(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    cancelled: &AtomicBool,
    deadline: Instant,
) -> Result<TargetMappedAnalysis, TargetSourceReadError> {
    map_target_source_read_inner(request, source, Some(cancelled), Some(deadline))
}

fn map_target_source_read_inner(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<TargetMappedAnalysis, TargetSourceReadError> {
    check_mapping_control(cancelled, deadline)?;
    request
        .validate()
        .map_err(|error| mapping_error(error.to_string()))?;
    validate_source_scope(request, source)?;

    let active_segment = source
        .segments
        .iter()
        .rev()
        .find(|segment| segment.source_id == source.source_id)
        .ok_or_else(|| {
            mapping_error(format!(
                "source read has no segment for active source {}",
                source.source_id
            ))
        })?;
    let (records, overlap_conflict) =
        deduplicate_records(source, &source.records, cancelled, deadline)?;
    let active_records = records
        .iter()
        .filter(|record| record.source_identity == active_segment.source_id)
        .cloned()
        .collect::<Vec<_>>();

    // Debug-only fixture control used by the target process tests to hold the
    // worker inside mapping after source I/O has completed. It is deliberately
    // before the formal promotion branch so the shared deadline/cancel check
    // proves that no batch/complete is published from a cancelled or expired
    // mapping pass.
    target_test_delay("TERMLINK_TARGET_PROTOCOL_TEST_MAPPING_DELAY_MS");
    check_mapping_control(cancelled, deadline)?;
    let formal_cursor = formal_next_append_cursor(source, active_segment, &active_records);
    check_mapping_control(cancelled, deadline)?;
    let cursor = build_next_cursor(
        request,
        source,
        active_segment,
        &active_records,
        formal_cursor.as_ref(),
    );
    let source_range = cursor
        .as_ref()
        .map(|cursor| cursor.complete_range)
        .or_else(|| {
            if cursor_boundary_is_safe(source, active_segment) {
                active_segment.complete_range
            } else {
                // A gap or source mutation invalidates the reported physical
                // boundary. Do not expose even a partial range that could be
                // mistaken for a resumable cursor scope.
                None
            }
        });

    let mut adapter = CodexEventAdapter::new_with_conversation_id(
        CompatibilityProfile::Current,
        Some(request.conversation_id.clone()),
    );
    let mut reducer = AnalysisReducer::new(Some(request.conversation_id.clone()));
    restore_checkpoint_state(request, source, &mut adapter, &mut reducer)?;
    let restored_reducer = reducer.clone();

    let source_read_complete = source.segments.iter().all(segment_is_complete)
        && !source.segments.is_empty()
        && !overlap_conflict;
    let mut legacy_batch = adapt_records(
        &adapter,
        &records,
        source,
        source_read_complete,
        cancelled,
        deadline,
    )?;
    legacy_batch.source_id = Some(source.source_id.clone());
    if !source.lineage_transitions.is_empty() {
        legacy_batch.history_base = source.active_source.history_base.clone();
    }

    let lineage_validation_batch =
        build_lineage_validation_batch(request, source, cancelled, deadline)?;
    let validation_batch = lineage_validation_batch.as_ref().unwrap_or(&legacy_batch);
    let lineage_validation = validate_lineage_transitions_with_control(
        request,
        source,
        validation_batch,
        cancelled,
        deadline,
    )?;
    if let Some(error) = &lineage_validation.error {
        legacy_batch.complete = false;
        legacy_batch.diagnostics.push(BatchDiagnostic {
            code: "replacement_validation".to_string(),
            message: Some(error.clone()),
            source_ref: None,
            availability: Availability::PartialRollout,
        });
    }

    let adapter_complete = legacy_batch.complete;
    let effective_lineage_coverage = effective_lineage_coverage(request, source);
    let lineage_complete = effective_lineage_coverage.complete;
    let canonical_candidate = request.mode != TargetAnalyzeMode::Preview
        && source_read_complete
        && adapter_complete
        && lineage_complete
        && cursor.is_some();
    let mut completeness = if canonical_candidate {
        TargetCompleteness::Canonical
    } else if !source_read_complete || !adapter_complete {
        TargetCompleteness::Partial
    } else {
        TargetCompleteness::Provisional
    };

    legacy_batch.completeness = to_batch_completeness(completeness);
    legacy_batch.complete = completeness == TargetCompleteness::Canonical;
    check_mapping_control(cancelled, deadline)?;
    reducer.apply_batch(&legacy_batch);
    let mut projection = reducer.snapshot();

    // A canonical source read is not enough by itself.  The reducer must
    // prove complete projection coverage and present availability as well.
    if completeness == TargetCompleteness::Canonical && !projection_is_canonical(&projection) {
        completeness = TargetCompleteness::Partial;
        legacy_batch.completeness = BatchCompleteness::Partial;
        legacy_batch.complete = false;
        reducer = restored_reducer;
        check_mapping_control(cancelled, deadline)?;
        reducer.apply_batch(&legacy_batch);
        projection = reducer.snapshot();
    }

    let effective_replacements = if completeness == TargetCompleteness::Canonical {
        lineage_validation.replacements.clone()
    } else {
        Vec::new()
    };
    legacy_batch.replacements = effective_replacements.clone();

    check_mapping_control(cancelled, deadline)?;
    let projection_value = serde_json::to_value(&projection)
        .map_err(|error| mapping_error(format!("serialize analysis projection: {error}")))?;
    let (tool_details, usage, task_outcomes, usage_event, outcome_events) = derive_target_fields(
        &projection,
        &legacy_batch.items,
        completeness,
        &source.source_epoch,
        cancelled,
        deadline,
    )?;
    let mutations = build_mutations(
        &legacy_batch.items,
        &tool_details,
        usage_event,
        &outcome_events,
        &effective_replacements,
        completeness,
        &source.source_epoch,
        source_range,
        cancelled,
        deadline,
    )?;

    let transitions =
        mapped_lineage_transitions(source, &lineage_validation.validated, cancelled, deadline)?;
    let lineage_coverage = if transitions.is_empty() {
        None
    } else {
        Some(effective_lineage_coverage.clone())
    };
    let lineage_checkpoint =
        if completeness == TargetCompleteness::Canonical && !transitions.is_empty() {
            Some(effective_lineage_checkpoint(
                source,
                effective_lineage_coverage.clone(),
            ))
        } else {
            None
        };

    let reducer_state = checkpoint_state(&adapter, &reducer, formal_cursor.as_ref())?;
    let parser_provenance = legacy_batch.parser_provenance.clone();
    let context = TargetBatchMappingContext {
        conversation_id: request.conversation_id.clone(),
        source_id: source.source_id.clone(),
        source_epoch: source.source_epoch.clone(),
        source_range,
        projection: projection_value,
        tool_details,
        usage,
        task_outcomes,
        progress: progress_for(source, &records, completeness, cancelled, deadline)?,
        next_cursor: cursor.clone(),
        mutations,
        reducer_state: Some(reducer_state.clone()),
        lineage_transitions: transitions,
        lineage_coverage,
        lineage_checkpoint: lineage_checkpoint.clone(),
    };
    let logical_item_count = logical_item_count(&legacy_batch.items, cancelled, deadline)?;
    check_mapping_control(cancelled, deadline)?;
    let payload = TargetAnalysisBatch::from_analysis_batch(legacy_batch, context)
        .map_err(|error| mapping_error(error.to_string()))?;

    let (segment_id, batch_id) = delivery_ids(request, source, source_range);
    let batch = TargetBatchMessage::new(
        request.header.request_id.clone(),
        request.job_id.clone(),
        segment_id.clone(),
        batch_id.clone(),
        payload,
    );
    batch
        .validate()
        .map_err(|error| mapping_error(error.to_string()))?;
    check_mapping_control(cancelled, deadline)?;

    let checkpoint = build_checkpoint(
        request,
        source,
        active_segment,
        &active_records,
        source_range,
        cursor.clone(),
        completeness,
        parser_provenance,
        reducer_state,
        &segment_id,
        &batch_id,
        lineage_checkpoint,
        logical_item_count,
    )?;
    let complete = TargetCompleteMessage::new(
        request.header.request_id.clone(),
        request.job_id.clone(),
        if completeness == TargetCompleteness::Canonical {
            TargetCompleteStatus::Completed
        } else {
            TargetCompleteStatus::Partial
        },
        completeness,
        cursor,
        checkpoint,
    );
    complete
        .validate()
        .map_err(|error| mapping_error(error.to_string()))?;

    Ok(TargetMappedAnalysis { batch, complete })
}

fn mapping_error(message: impl Into<String>) -> TargetSourceReadError {
    TargetSourceReadError::Mapping(message.into())
}

fn target_test_delay(env_name: &str) {
    #[cfg(debug_assertions)]
    {
        if let Ok(raw) = std::env::var(env_name)
            && let Ok(delay_ms) = raw.parse::<u64>()
        {
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        }
    }
    #[cfg(not(debug_assertions))]
    let _ = env_name;
}

fn check_mapping_control(
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<(), TargetSourceReadError> {
    if cancelled.is_some_and(|value| value.load(Ordering::Acquire)) {
        return Err(TargetSourceReadError::Cancelled);
    }
    if deadline.is_some_and(|value| Instant::now() >= value) {
        return Err(TargetSourceReadError::Timeout);
    }
    Ok(())
}

fn validate_source_scope(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
) -> Result<(), TargetSourceReadError> {
    if source.conversation_id != request.conversation_id {
        return Err(mapping_error(
            "source conversation_id does not match target request",
        ));
    }
    if source.source_id != source.active_source.rollout_id {
        return Err(mapping_error(
            "active source rollout_id does not match source_id",
        ));
    }
    if source.source_epoch.trim().is_empty() || source.source_epoch == "unbound" {
        return Err(mapping_error("source epoch is not bound"));
    }
    Ok(())
}

fn effective_lineage_coverage(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
) -> TargetLineageCoverage {
    if source.lineage_coverage.complete {
        return source.lineage_coverage.clone();
    }
    let Some(checkpoint) = request.persisted_anchor.as_ref() else {
        return source.lineage_coverage.clone();
    };
    let same_source = checkpoint.source.source_id == source.source_id
        && checkpoint.source.source_epoch == source.source_epoch;
    if same_source
        && checkpoint.completeness == TargetCompleteness::Canonical
        && source.lineage_transitions.is_empty()
        && source.segments.iter().all(segment_is_complete)
    {
        // A single-rollout source has no transition checkpoint to carry.  A
        // canonical checkpoint for the same source/epoch is nevertheless
        // sufficient to retain the already-proven logical coverage across a
        // retry that re-reads the same bounded snapshot.
        return TargetLineageCoverage {
            complete: true,
            ..source.lineage_coverage.clone()
        };
    }
    let Some(previous) = checkpoint.lineage_checkpoint.as_ref() else {
        return source.lineage_coverage.clone();
    };
    let same_lineage = request.mode == TargetAnalyzeMode::Backfill
        && request.known_complete_range.is_none()
        && same_source
        && previous.coverage.complete
        && previous.root_rollout_id == source.lineage_coverage.root_rollout_id
        && previous.active_head_rollout_id == source.lineage_coverage.active_head_rollout_id
        && previous.chain_rollout_ids == source.lineage_coverage.chain_rollout_ids
        && source.segments.iter().all(segment_is_complete);
    if same_lineage {
        TargetLineageCoverage {
            complete: true,
            ..source.lineage_coverage.clone()
        }
    } else {
        source.lineage_coverage.clone()
    }
}

fn effective_lineage_checkpoint(
    source: &TargetSourceRead,
    coverage: TargetLineageCoverage,
) -> TargetLineageCheckpoint {
    TargetLineageCheckpoint {
        coverage,
        ..source.lineage_checkpoint.clone()
    }
}

fn segment_is_complete(segment: &TargetSourceSegmentEvidence) -> bool {
    segment.complete
        && segment.pending_tail_bytes == 0
        && segment.parse_gap_count == 0
        && !segment.source_shrank_during_read
}

fn deduplicate_records(
    source: &TargetSourceRead,
    records: &[SourceRecord],
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<(Vec<SourceRecord>, bool), TargetSourceReadError> {
    type RecordKey = (String, u64, u64, u64, Option<u64>);

    let mut seen = BTreeMap::<RecordKey, SourceRecord>::new();
    let mut ordered = Vec::with_capacity(records.len());
    let mut conflict = false;
    for record in records {
        check_mapping_control(cancelled, deadline)?;
        let key = (
            record.source_identity.clone(),
            record.byte_start,
            record.byte_end,
            record.physical_line_ordinal,
            record.rollout_ordinal,
        );
        if let Some(existing) = seen.get(&key) {
            if existing != record {
                conflict = true;
            }
            continue;
        }
        seen.insert(key, record.clone());
        ordered.push(record.clone());
    }
    ordered.sort_by(|left, right| {
        source_chain_rank(source, &left.source_identity)
            .cmp(&source_chain_rank(source, &right.source_identity))
            .then_with(|| left.byte_start.cmp(&right.byte_start))
            .then_with(|| left.byte_end.cmp(&right.byte_end))
            .then_with(|| left.physical_line_ordinal.cmp(&right.physical_line_ordinal))
            .then_with(|| left.rollout_ordinal.cmp(&right.rollout_ordinal))
            .then_with(|| left.source_identity.cmp(&right.source_identity))
    });
    check_mapping_control(cancelled, deadline)?;
    Ok((ordered, conflict))
}

fn source_chain_rank(source: &TargetSourceRead, source_id: &str) -> u64 {
    source
        .segments
        .iter()
        .position(|segment| segment.source_id == source_id)
        .map(|position| position as u64)
        .unwrap_or(u64::MAX)
}

fn adapt_records(
    adapter: &CodexEventAdapter,
    records: &[SourceRecord],
    source: &TargetSourceRead,
    source_read_complete: bool,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<AnalysisBatch, TargetSourceReadError> {
    let mut batch = AnalysisBatch::empty(CompatibilityProfile::Current);
    batch.completeness = if source_read_complete {
        BatchCompleteness::Provisional
    } else {
        BatchCompleteness::Partial
    };

    for record in records {
        check_mapping_control(cancelled, deadline)?;
        let decoded = decode_source_record(record, CompatibilityProfile::Current);
        let mut events = adapter.adapt(record, decoded);
        for (index, event) in events.iter_mut().enumerate() {
            event.metadata_mut().sequence = source_chain_rank(source, &record.source_identity)
                .saturating_mul(SOURCE_SEQUENCE_STRIDE)
                .saturating_add(
                    record
                        .physical_line_ordinal
                        .saturating_mul(EVENT_SEQUENCE_STRIDE),
                )
                .saturating_add(index as u64);
            let explicit_terminal =
                event.metadata().terminal_evidence == Some(TerminalEvidence::ExplicitAbort);
            if event.is_diagnostic()
                || (event.availability() != Availability::Present && !explicit_terminal)
            {
                batch.complete = false;
                batch.diagnostics.push(mapping_diagnostic_for(event));
            }
        }
        batch.items.extend(events);
    }

    for segment in &source.segments {
        check_mapping_control(cancelled, deadline)?;
        if segment.parse_gap_count > 0 {
            batch.complete = false;
            batch.diagnostics.push(BatchDiagnostic {
                code: "parse_gap".to_string(),
                message: Some(format!(
                    "source segment {} reported {} parse gap(s)",
                    segment.source_id, segment.parse_gap_count
                )),
                source_ref: None,
                availability: Availability::PartialRollout,
            });
        }
        if !segment.complete || segment.pending_tail_bytes > 0 {
            batch.complete = false;
            batch.diagnostics.push(BatchDiagnostic {
                code: CollectorErrorKind::PartialRollout.as_str().to_string(),
                message: Some(format!(
                    "source segment {} stopped before a complete snapshot boundary",
                    segment.source_id
                )),
                source_ref: None,
                availability: Availability::PartialRollout,
            });
        }
    }

    Ok(batch)
}

fn mapping_diagnostic_for(event: &AnalysisEvent) -> BatchDiagnostic {
    let (code, message) = match event {
        AnalysisEvent::ParseGap { reason, .. } if reason.starts_with("source_limit_exceeded") => (
            CollectorErrorKind::PayloadLimit.as_str().to_string(),
            Some(reason.clone()),
        ),
        AnalysisEvent::ParseGap { reason, .. } => ("parse_gap".to_string(), Some(reason.clone())),
        AnalysisEvent::UnknownEvent {
            raw_type, reason, ..
        } => (
            "unknown_event".to_string(),
            Some(format!(
                "{}:{}",
                reason,
                raw_type.as_deref().unwrap_or("<unknown>")
            )),
        ),
        _ => ("diagnostic".to_string(), None),
    };
    BatchDiagnostic {
        code,
        message,
        source_ref: Some(event.metadata().source_ref.clone()),
        availability: event.availability(),
    }
}

#[derive(Debug, Default)]
struct LineageValidation {
    validated: Vec<bool>,
    /// Every successfully validated root-to-active edge is retained in source
    /// transition order. Replacement evidence is a lineage fact, not only an
    /// active-head mutation.
    replacements: Vec<LastTurnReplacement>,
    error: Option<String>,
}

fn validate_lineage_transitions_with_control(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    batch: &AnalysisBatch,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<LineageValidation, TargetSourceReadError> {
    let mut validation = LineageValidation {
        validated: vec![false; source.lineage_transitions.len()],
        ..LineageValidation::default()
    };

    for (index, transition) in source.lineage_transitions.iter().enumerate() {
        check_mapping_control(cancelled, deadline)?;
        let parent = batch_for_lineage_source(batch, source, &transition.parent_rollout_id, None);
        let child = batch_for_lineage_source(
            batch,
            source,
            &transition.child_rollout_id,
            Some(&transition.history_base),
        );
        match validate_last_turn_replacement(
            &request.conversation_id,
            &transition.parent_rollout_id,
            &transition.child_rollout_id,
            &transition.history_base,
            &parent,
            &child,
        ) {
            Ok(replacement) => {
                validation.validated[index] = true;
                validation.replacements.push(replacement);
            }
            Err(error) => {
                if validation.error.is_none() {
                    validation.error = Some(format!(
                        "lineage transition {} ({} -> {}) replacement validation failed: {error}",
                        index, transition.parent_rollout_id, transition.child_rollout_id,
                    ));
                }
            }
        }
    }

    Ok(validation)
}

fn build_lineage_validation_batch(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<Option<AnalysisBatch>, TargetSourceReadError> {
    let (Some(records), Some(segments)) = (
        source.lineage_records.as_ref(),
        source.lineage_segments.as_ref(),
    ) else {
        return Ok(None);
    };
    if segments.is_empty() || !segments.iter().all(segment_is_complete) {
        return Ok(None);
    }

    let validation_source = TargetSourceRead {
        conversation_id: source.conversation_id.clone(),
        source_id: source.source_id.clone(),
        source_epoch: source.source_epoch.clone(),
        active_source: source.active_source.clone(),
        discovered_sources: Vec::new(),
        segments: segments.clone(),
        records: Vec::new(),
        lineage_segments: None,
        lineage_records: None,
        append_cursor: None,
        lineage_transitions: Vec::new(),
        lineage_coverage: source.lineage_coverage.clone(),
        lineage_checkpoint: source.lineage_checkpoint.clone(),
    };
    let adapter = CodexEventAdapter::new_with_conversation_id(
        CompatibilityProfile::Current,
        Some(request.conversation_id.clone()),
    );
    let mut batch = adapt_records(
        &adapter,
        records,
        &validation_source,
        true,
        cancelled,
        deadline,
    )?;
    batch.source_id = Some(source.source_id.clone());
    if !source.lineage_transitions.is_empty() {
        batch.history_base = source.active_source.history_base.clone();
    }
    batch.completeness = if batch.complete {
        BatchCompleteness::Canonical
    } else {
        BatchCompleteness::Partial
    };
    Ok(Some(batch))
}

fn batch_for_lineage_source(
    batch: &AnalysisBatch,
    source: &TargetSourceRead,
    source_id: &str,
    history_base: Option<&crate::source::HistoryBaseRef>,
) -> AnalysisBatch {
    let items = batch
        .items
        .iter()
        .filter(|event| event.metadata().source_ref.source_identity == source_id)
        .cloned()
        .collect::<Vec<_>>();
    let mut diagnostics = batch
        .diagnostics
        .iter()
        .filter(|diagnostic| {
            diagnostic
                .source_ref
                .as_ref()
                .is_some_and(|source_ref| source_ref.source_identity == source_id)
        })
        .cloned()
        .collect::<Vec<_>>();
    let segment_evidence = source
        .lineage_segments
        .as_deref()
        .unwrap_or(&source.segments);
    let source_segments = segment_evidence
        .iter()
        .filter(|segment| segment.source_id == source_id)
        .collect::<Vec<_>>();
    let source_complete = !source_segments.is_empty()
        && source_segments
            .iter()
            .all(|segment| segment_is_complete(segment));
    let event_incomplete = items.iter().any(|event| {
        let explicit_terminal =
            event.metadata().terminal_evidence == Some(TerminalEvidence::ExplicitAbort);
        event.is_diagnostic()
            || (event.availability() != Availability::Present && !explicit_terminal)
    });
    if !source_complete {
        diagnostics.push(BatchDiagnostic {
            code: "partial_source".to_string(),
            message: Some(format!(
                "lineage source {source_id} is not complete at a stable snapshot boundary"
            )),
            source_ref: None,
            availability: Availability::PartialRollout,
        });
    }
    if event_incomplete && diagnostics.is_empty() {
        diagnostics.push(BatchDiagnostic {
            code: "diagnostic".to_string(),
            message: Some(format!(
                "lineage source {source_id} contains incomplete events"
            )),
            source_ref: None,
            availability: Availability::PartialRollout,
        });
    }
    let complete = source_complete && !event_incomplete && diagnostics.is_empty();
    AnalysisBatch {
        parser_provenance: batch.parser_provenance.clone(),
        items,
        diagnostics,
        complete,
        completeness: if complete {
            BatchCompleteness::Canonical
        } else {
            BatchCompleteness::Partial
        },
        source_id: Some(source_id.to_string()),
        history_base: history_base.cloned(),
        replacements: Vec::new(),
    }
}

fn logical_item_count(
    events: &[AnalysisEvent],
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<u64, TargetSourceReadError> {
    let mut keys = BTreeSet::new();
    for event in events {
        check_mapping_control(cancelled, deadline)?;
        let item_key = event.item_key();
        if !item_key.trim().is_empty() {
            keys.insert(item_key);
        }
    }
    Ok(keys.len() as u64)
}

fn restore_checkpoint_state(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    adapter: &mut CodexEventAdapter,
    reducer: &mut AnalysisReducer,
) -> Result<(), TargetSourceReadError> {
    let Some(checkpoint) = request.persisted_anchor.as_ref() else {
        return Ok(());
    };
    let same_source = checkpoint.source.source_id == source.source_id
        && checkpoint.source.source_epoch == source.source_epoch;
    if !same_source {
        // A new child rollout has a new lineage epoch.  The source bridge has
        // already rebuilt the safe history scope; do not mix the old reducer
        // state into the new source identity.
        return Ok(());
    }

    if checkpoint.reducer_state.reducer_id != TARGET_REDUCER_ID {
        return Err(mapping_error(format!(
            "checkpoint reducer id {} is incompatible with target reducer {}",
            checkpoint.reducer_state.reducer_id, TARGET_REDUCER_ID
        )));
    }
    if checkpoint.reducer_state.reducer_version != TARGET_REDUCER_VERSION {
        return Err(mapping_error(format!(
            "checkpoint reducer version {} is incompatible with target reducer version {}",
            checkpoint.reducer_state.reducer_version, TARGET_REDUCER_VERSION
        )));
    }

    let object = checkpoint
        .reducer_state
        .payload
        .as_object()
        .ok_or_else(|| mapping_error("checkpoint reducer payload must be an object"))?;
    let adapter_state = object
        .get("adapter")
        .ok_or_else(|| mapping_error("checkpoint reducer payload is missing adapter state"))?;
    let reducer_value = object
        .get("reducer")
        .ok_or_else(|| mapping_error("checkpoint reducer payload is missing reducer state"))?;
    adapter
        .restore_checkpoint_state(adapter_state)
        .map_err(|error| mapping_error(error.to_string()))?;
    *reducer = serde_json::from_value(reducer_value.clone())
        .map_err(|error| mapping_error(format!("invalid reducer checkpoint state: {error}")))?;
    Ok(())
}

fn build_next_cursor(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
    active_records: &[SourceRecord],
    formal_append_cursor: Option<&ForwardAppendCursor>,
) -> Option<TargetAnalyzerCursor> {
    if active_segment.compression != TargetSourceCompression::PlainJsonl {
        return None;
    }
    if !cursor_boundary_is_safe(source, active_segment) {
        return None;
    }
    let complete_range = active_segment.complete_range?;
    match request.mode {
        TargetAnalyzeMode::Preview | TargetAnalyzeMode::Backfill => {
            let last_line = last_complete_line(active_records, complete_range.end)?;
            let cursor_kind = if request.mode == TargetAnalyzeMode::Preview {
                TargetCursorKind::TailPreview
            } else {
                TargetCursorKind::Backfill
            };
            manual_cursor(
                cursor_kind,
                source,
                active_segment,
                complete_range,
                Some(last_line),
                active_records
                    .iter()
                    .filter_map(|record| record.rollout_ordinal)
                    .max(),
            )
        }
        TargetAnalyzeMode::Append => formal_append_cursor
            .filter(|_| active_segment.complete)
            .and_then(|cursor| TargetAnalyzerCursor::from_source_metadata(cursor.metadata()).ok()),
    }
}

fn last_complete_line(records: &[SourceRecord], end: u64) -> Option<TargetCompleteLineBoundary> {
    if end == 0 {
        return None;
    }
    records
        .iter()
        .filter(|record| record.byte_end == end && record.parse_error.is_none())
        .max_by_key(|record| record.physical_line_ordinal)
        .map(|record| TargetCompleteLineBoundary {
            physical_line_ordinal: record.physical_line_ordinal,
            byte_start: record.byte_start,
            byte_end: record.byte_end,
        })
}

fn cursor_boundary_is_safe(
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
) -> bool {
    let lineage_evidence = source
        .lineage_segments
        .as_deref()
        .unwrap_or(&source.segments);
    active_segment.complete_range.is_some()
        && active_segment.parse_gap_count == 0
        && !active_segment.source_shrank_during_read
        && lineage_evidence
            .iter()
            .all(|segment| segment.parse_gap_count == 0 && !segment.source_shrank_during_read)
}

fn manual_cursor(
    kind: TargetCursorKind,
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
    complete_range: TargetSourceByteRange,
    last_complete_line: Option<TargetCompleteLineBoundary>,
    last_rollout_ordinal: Option<u64>,
) -> Option<TargetAnalyzerCursor> {
    let cursor = TargetAnalyzerCursor {
        schema_version: TARGET_CURSOR_SCHEMA_VERSION,
        reader_backend: CURSOR_READER_BACKEND.to_string(),
        reader_version: CURSOR_READER_VERSION.to_string(),
        cursor_kind: kind,
        conversation_id: source.conversation_id.clone(),
        source_id: source.source_id.clone(),
        source_epoch: source.source_epoch.clone(),
        source_kind: TargetSourceKind::Rollout,
        compression: active_segment.compression,
        snapshot_boundary: active_segment.snapshot_boundary,
        complete_range,
        last_complete_line,
        last_rollout_ordinal,
        capabilities: TargetCursorCapabilities {
            random_seek: true,
            ..TargetCursorCapabilities::default()
        },
    };
    cursor.validate().ok().map(|_| cursor)
}

fn formal_next_append_cursor(
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
    active_records: &[SourceRecord],
) -> Option<ForwardAppendCursor> {
    if active_segment.mode == crate::source::SourceReadMode::ForwardRange {
        return source.append_cursor.clone();
    }
    if active_segment.mode == crate::source::SourceReadMode::FullRead
        && active_segment.complete
        && active_segment.complete_range.is_some_and(|range| {
            range.start == 0 && range.end == active_segment.snapshot_boundary.byte_length
        })
    {
        return promote_full_snapshot_formal(source, active_segment, active_records);
    }
    None
}

fn promote_full_snapshot_formal(
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
    active_records: &[SourceRecord],
) -> Option<ForwardAppendCursor> {
    // Keep this delay inside the formal promotion path, rather than around
    // the worker, so tests exercise the exact boundary where a shared
    // cancellation/deadline must prevent publication after promotion work.
    target_test_delay("TERMLINK_TARGET_PROTOCOL_TEST_FORMAL_PROMOTION_DELAY_MS");
    let fingerprint = source.active_source.fingerprint.as_ref()?;
    let spec = SourceSpec::bind(
        &source.conversation_id,
        &source.source_id,
        &active_segment.path,
    )
    .ok()?
    .with_source_epoch(source.source_epoch.clone())
    .ok()?
    .with_fingerprint(fingerprint.clone())
    .with_prefix_anchor(
        crate::source::SourcePrefixAnchor::new(
            fingerprint.algorithm(),
            fingerprint.digest(),
            fingerprint.covered_bytes(),
        )
        .ok()?,
    );
    let snapshot = SnapshotBoundary::new(active_segment.snapshot_boundary.byte_length);
    let range = SourceByteRange::new(0, active_segment.snapshot_boundary.byte_length).ok()?;
    let (formal_records, actual_last_rollout_ordinal) =
        records_for_formal_promotion(active_records)?;
    let descriptor = SegmentDescriptor::from_records(
        format!("target-promotion:{}", source.source_id),
        &spec,
        snapshot,
        range,
        &formal_records,
        0,
        SegmentCompleteness::Complete,
    )
    .ok()?;
    let segment = SourceSegment::new(descriptor, formal_records, Vec::new()).ok()?;
    let mut assembler = SegmentAssembler::default();
    assembler.add_segment(segment).ok()?;
    let promoted = assembler.assemble().promote_to_forward_append(&spec).ok()?;
    if promoted.metadata().last_rollout_ordinal() == actual_last_rollout_ordinal {
        return Some(promoted);
    }
    let metadata = promoted.metadata();
    ForwardAppendCursor::from_source(
        &spec,
        metadata.snapshot_boundary(),
        metadata.complete_range(),
        metadata.last_complete_line().cloned(),
        actual_last_rollout_ordinal,
    )
    .ok()
}

fn records_for_formal_promotion(
    records: &[SourceRecord],
) -> Option<(Vec<SourceRecord>, Option<u64>)> {
    let mut ordered = records.to_vec();
    ordered.sort_by(|left, right| {
        left.byte_start
            .cmp(&right.byte_start)
            .then_with(|| left.byte_end.cmp(&right.byte_end))
            .then_with(|| left.physical_line_ordinal.cmp(&right.physical_line_ordinal))
    });
    let ordinals = ordered
        .iter()
        .map(|record| record.rollout_ordinal)
        .collect::<Vec<_>>();
    let actual_last = ordinals.iter().flatten().copied().max();
    if ordinals.iter().all(Option::is_none) {
        return Some((ordered, None));
    }
    if ordinals.iter().any(Option::is_none) {
        return None;
    }
    let values = ordinals.into_iter().flatten().collect::<Vec<_>>();
    let starts_with_zero = values.first().copied() == Some(0);
    let contiguous = values
        .windows(2)
        .all(|pair| pair[1] == pair[0].saturating_add(1));
    if starts_with_zero && contiguous {
        for record in &mut ordered {
            record.rollout_ordinal = record
                .rollout_ordinal
                .map(|ordinal| ordinal.saturating_add(1));
        }
        return Some((ordered, actual_last));
    }
    if values.first().is_some_and(|ordinal| *ordinal > 0) && contiguous {
        return Some((ordered, actual_last));
    }
    None
}

fn projection_is_canonical(projection: &AnalysisProjection) -> bool {
    projection.complete
        && projection.coverage == ProjectionCoverage::Complete
        && projection.availability == Availability::Present
        && projection.diagnostics.is_empty()
}

fn to_batch_completeness(value: TargetCompleteness) -> BatchCompleteness {
    match value {
        TargetCompleteness::Unknown => BatchCompleteness::Unknown,
        TargetCompleteness::Partial => BatchCompleteness::Partial,
        TargetCompleteness::Provisional => BatchCompleteness::Provisional,
        TargetCompleteness::Canonical => BatchCompleteness::Canonical,
    }
}

fn progress_for(
    source: &TargetSourceRead,
    records: &[SourceRecord],
    completeness: TargetCompleteness,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<TargetProgress, TargetSourceReadError> {
    let records_seen = source.segments.iter().try_fold(0_u64, |total, segment| {
        check_mapping_control(cancelled, deadline)?;
        Ok::<u64, TargetSourceReadError>(total.saturating_add(segment.records_read))
    })?;
    let records_emitted = records_seen.min(records.len() as u64);
    let bytes_scanned = source.segments.iter().try_fold(0_u64, |total, segment| {
        check_mapping_control(cancelled, deadline)?;
        Ok::<u64, TargetSourceReadError>(
            total.saturating_add(
                segment
                    .scanned_range
                    .end
                    .saturating_sub(segment.scanned_range.start),
            ),
        )
    })?;
    let progress = TargetProgress {
        records_seen,
        records_emitted,
        bytes_scanned,
        has_more: completeness != TargetCompleteness::Canonical
            || source
                .segments
                .iter()
                .any(|segment| segment.pending_tail_bytes > 0 || !segment.complete),
    };
    check_mapping_control(cancelled, deadline)?;
    Ok(progress)
}

fn mapped_lineage_transitions(
    source: &TargetSourceRead,
    validated: &[bool],
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<Vec<TargetLineageTransition>, TargetSourceReadError> {
    let mut mapped = Vec::with_capacity(source.lineage_transitions.len());
    for (index, transition) in source.lineage_transitions.iter().enumerate() {
        check_mapping_control(cancelled, deadline)?;
        let mut transition = transition.clone();
        if validated.get(index).copied().unwrap_or(false) {
            transition.validation_state = TargetLineageValidationState::Validated;
        }
        mapped.push(transition);
    }
    Ok(mapped)
}

fn derive_target_fields<'a>(
    projection: &AnalysisProjection,
    events: &'a [AnalysisEvent],
    completeness: TargetCompleteness,
    source_epoch: &str,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<
    (
        Vec<TargetToolDetail>,
        Option<Value>,
        Vec<TargetTaskOutcome>,
        Option<&'a AnalysisEvent>,
        Vec<&'a AnalysisEvent>,
    ),
    TargetSourceReadError,
> {
    let mut tool_details = Vec::new();
    for turn in &projection.turns {
        for item in &turn.items {
            check_mapping_control(cancelled, deadline)?;
            let Some(tool) = item.tool.as_ref() else {
                continue;
            };
            tool_details.push(TargetToolDetail {
                item_key: item.item_key.clone(),
                call_id: tool.call_id.clone(),
                tool_kind: tool.tool_kind.clone(),
                input: tool.input.clone(),
                output: tool.output.clone(),
                completeness,
                source_epoch: source_epoch.to_string(),
            });
        }
    }
    tool_details.sort_by(|left, right| left.item_key.cmp(&right.item_key));
    tool_details.dedup_by(|left, right| left.item_key == right.item_key);

    let usage_event = events
        .iter()
        .rev()
        .find(|event| matches!(event, AnalysisEvent::UsageUpdated { .. }));
    let usage = usage_event.map(usage_value);

    let mut outcome_by_key = BTreeMap::<String, &AnalysisEvent>::new();
    for event in events {
        check_mapping_control(cancelled, deadline)?;
        if matches!(event, AnalysisEvent::TurnCompleted { .. }) {
            outcome_by_key.insert(event.item_key().to_string(), event);
        }
    }
    let outcome_events = outcome_by_key.values().copied().collect::<Vec<_>>();
    let task_outcomes = outcome_events
        .iter()
        .filter_map(|event| match event {
            AnalysisEvent::TurnCompleted {
                metadata,
                status,
                message,
                ..
            } => Some(TargetTaskOutcome {
                item_key: metadata.item_key.clone(),
                status: turn_status(*status).to_string(),
                message: message.clone(),
                completeness,
                source_epoch: source_epoch.to_string(),
            }),
            _ => None,
        })
        .collect();

    check_mapping_control(cancelled, deadline)?;
    Ok((
        tool_details,
        usage,
        task_outcomes,
        usage_event,
        outcome_events,
    ))
}

fn usage_value(event: &AnalysisEvent) -> Value {
    match event {
        AnalysisEvent::UsageUpdated {
            input_tokens,
            cached_input_tokens,
            output_tokens,
            reasoning_output_tokens,
            total_tokens,
            last_input_tokens,
            last_cached_input_tokens,
            last_output_tokens,
            last_reasoning_output_tokens,
            last_total_tokens,
            model_context_window,
            ..
        } => json!({
            "input_tokens": input_tokens,
            "cached_input_tokens": cached_input_tokens,
            "output_tokens": output_tokens,
            "reasoning_output_tokens": reasoning_output_tokens,
            "total_tokens": total_tokens,
            "last_input_tokens": last_input_tokens,
            "last_cached_input_tokens": last_cached_input_tokens,
            "last_output_tokens": last_output_tokens,
            "last_reasoning_output_tokens": last_reasoning_output_tokens,
            "last_total_tokens": last_total_tokens,
            "model_context_window": model_context_window,
        }),
        _ => Value::Null,
    }
}

fn turn_status(status: TurnStatus) -> &'static str {
    match status {
        TurnStatus::Completed => "completed",
        TurnStatus::Interrupted => "interrupted",
        TurnStatus::Partial => "partial",
    }
}

fn build_mutations(
    events: &[AnalysisEvent],
    tool_details: &[TargetToolDetail],
    usage_event: Option<&AnalysisEvent>,
    outcome_events: &[&AnalysisEvent],
    replacements: &[LastTurnReplacement],
    completeness: TargetCompleteness,
    source_epoch: &str,
    source_range: Option<TargetSourceByteRange>,
    cancelled: Option<&AtomicBool>,
    deadline: Option<Instant>,
) -> Result<Vec<TargetMutation>, TargetSourceReadError> {
    let mut latest_by_item = BTreeMap::<String, &AnalysisEvent>::new();
    for event in events {
        check_mapping_control(cancelled, deadline)?;
        latest_by_item.insert(event.item_key().to_string(), event);
    }
    let mut mutations = latest_by_item
        .iter()
        .map(|(item_key, event)| TargetMutation::UpsertItem {
            item: mutation_item(item_key, event, completeness, source_epoch),
        })
        .collect::<Vec<_>>();

    for detail in tool_details {
        check_mapping_control(cancelled, deadline)?;
        if let Some(event) = latest_by_item.get(&detail.item_key) {
            mutations.push(TargetMutation::UpsertDetail {
                item: mutation_item(&detail.item_key, event, completeness, source_epoch),
            });
        }
    }
    if let Some(event) = usage_event {
        check_mapping_control(cancelled, deadline)?;
        mutations.push(TargetMutation::UpsertUsage {
            item: mutation_item(event.item_key(), event, completeness, source_epoch),
        });
    }
    for event in outcome_events {
        check_mapping_control(cancelled, deadline)?;
        mutations.push(TargetMutation::UpsertOutcome {
            item: mutation_item(event.item_key(), event, completeness, source_epoch),
        });
    }
    if completeness == TargetCompleteness::Canonical {
        for replacement in replacements {
            check_mapping_control(cancelled, deadline)?;
            mutations.push(TargetMutation::ReplaceLastTurn {
                replacement: replacement.clone(),
            });
        }
        if let Some(source_range) = source_range {
            mutations.push(TargetMutation::CompleteRange { source_range });
        }
    } else {
        mutations.push(TargetMutation::MarkPartial { source_range });
    }
    Ok(mutations)
}

fn mutation_item(
    item_key: &str,
    event: &AnalysisEvent,
    completeness: TargetCompleteness,
    source_epoch: &str,
) -> TargetBatchSourceRef {
    TargetBatchSourceRef {
        item_key: item_key.to_string(),
        content_hash: stable_content_hash(event),
        completeness,
        source_epoch: source_epoch.to_string(),
        source_ref: event.metadata().source_ref.clone(),
    }
}

fn stable_content_hash<T: Serialize>(value: &T) -> String {
    let bytes = serde_json::to_vec(value).expect("TermLink-owned event is serializable");
    // This is a content marker, not an identity source.  FNV-1a keeps the
    // target crate dependency-free; logical identity still comes only from
    // Adapter-generated event_id/item_key values.
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in bytes {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3_u64);
    }
    format!("fnv1a64:{hash:016x}")
}

fn checkpoint_state(
    adapter: &CodexEventAdapter,
    reducer: &AnalysisReducer,
    source_cursor: Option<&ForwardAppendCursor>,
) -> Result<TargetReducerCheckpointState, TargetSourceReadError> {
    let mut payload = json!({
        "adapter": adapter.checkpoint_state(),
        "reducer": serde_json::to_value(reducer)
            .map_err(|error| mapping_error(format!("serialize reducer checkpoint: {error}")))?,
    });
    if let Some(source_cursor) = source_cursor {
        payload["source_cursor"] = serde_json::to_value(source_cursor).map_err(|error| {
            mapping_error(format!(
                "serialize formal source cursor checkpoint: {error}"
            ))
        })?;
    }
    TargetReducerCheckpointState::from_payload(payload, TARGET_REDUCER_VERSION)
        .map_err(|error| mapping_error(error.to_string()))
}

fn delivery_ids(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    source_range: Option<TargetSourceByteRange>,
) -> (String, String) {
    let range = source_range
        .map(|range| format!("{}-{}", range.start, range.end))
        .unwrap_or_else(|| "unbounded".to_string());
    let segment_id = format!(
        "target:{}:{}:{}:{}",
        request.mode.as_str(),
        source.source_id,
        source.source_epoch,
        range
    );
    let batch_id = format!("{segment_id}:batch");
    (segment_id, batch_id)
}

#[allow(clippy::too_many_arguments)]
fn build_checkpoint(
    request: &TargetAnalyzeRequest,
    source: &TargetSourceRead,
    active_segment: &TargetSourceSegmentEvidence,
    active_records: &[SourceRecord],
    source_range: Option<TargetSourceByteRange>,
    cursor: Option<TargetAnalyzerCursor>,
    completeness: TargetCompleteness,
    parser_provenance: ParserProvenance,
    reducer_state: TargetReducerCheckpointState,
    segment_id: &str,
    batch_id: &str,
    lineage_checkpoint: Option<TargetLineageCheckpoint>,
    logical_item_count: u64,
) -> Result<TargetAnalyzerCheckpoint, TargetSourceReadError> {
    let wire_profile = TargetCheckpointWireProfile::from_parser_provenance(&parser_provenance)
        .map_err(|error| mapping_error(error.to_string()))?;
    let physical_line_start = active_records
        .iter()
        .map(|record| record.physical_line_ordinal)
        .filter(|ordinal| *ordinal > 0)
        .min();
    let physical_line_end = active_records
        .iter()
        .map(|record| record.physical_line_ordinal)
        .filter(|ordinal| *ordinal > 0)
        .max();
    let segment = TargetCheckpointSegment {
        source_range,
        physical_line_start,
        physical_line_end,
        rollout_ordinal: active_records
            .iter()
            .filter_map(|record| record.rollout_ordinal)
            .max(),
    };
    let watermark = TargetProjectionWatermark {
        schema_version: TARGET_DATA_SCHEMA_VERSION,
        segment_id: segment_id.to_string(),
        batch_id: batch_id.to_string(),
        source_id: Some(source.source_id.clone()),
        source_epoch: source.source_epoch.clone(),
        complete_source_end: cursor.as_ref().map(|cursor| cursor.complete_range.end),
        logical_item_count,
    };
    let checkpoint = TargetAnalyzerCheckpoint {
        schema_version: TARGET_DATA_SCHEMA_VERSION,
        job_id: request.job_id.clone(),
        request_id: request.header.request_id.clone(),
        conversation_id: source.conversation_id.clone(),
        source: TargetCheckpointSource {
            source_id: source.source_id.clone(),
            source_epoch: source.source_epoch.clone(),
            source_range,
            snapshot_boundary: active_segment.snapshot_boundary,
        },
        reader: TargetCheckpointReader {
            backend: CURSOR_READER_BACKEND.to_string(),
            version: CURSOR_READER_VERSION.to_string(),
            source_kind: TargetSourceKind::Rollout,
            compression: active_segment.compression,
        },
        wire_profile,
        cursor_kind: cursor.as_ref().map(|cursor| cursor.cursor_kind),
        cursor,
        segment,
        reducer_state,
        projection_watermark: watermark,
        completeness,
        lineage_checkpoint,
    };
    checkpoint
        .validate()
        .map_err(|error| mapping_error(error.to_string()))?;
    Ok(checkpoint)
}
