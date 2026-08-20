use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};

use crate::codex_adapter::CodexEventAdapter;
use crate::codex_wire::{CompatibilityProfile, decode_source_record};
use crate::error::CollectorErrorKind;
use crate::model::{AnalysisEvent, Availability, SourceRef};
use crate::source::{JsonlSourceBackend, SourceBackend, SourceRecord, SourceSpec};
use crate::version::{PARSER_BACKEND, WIRE_SOURCE_REVISION};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParserProvenance {
    pub parser_backend: String,
    pub wire_source_revision: String,
    pub compatibility_profile: CompatibilityProfile,
}

impl ParserProvenance {
    pub fn for_profile(profile: CompatibilityProfile) -> Self {
        Self {
            parser_backend: PARSER_BACKEND.to_string(),
            wire_source_revision: WIRE_SOURCE_REVISION.to_string(),
            compatibility_profile: profile,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BatchDiagnostic {
    pub code: String,
    pub message: Option<String>,
    pub source_ref: Option<SourceRef>,
    pub availability: Availability,
}

/// Evidence state carried by a batch.  `Unknown` is the backward-compatible
/// value for stage 1–3 JSON fixtures that predate the lifecycle field.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BatchCompleteness {
    Partial,
    Provisional,
    Canonical,
    #[default]
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisBatch {
    pub parser_provenance: ParserProvenance,
    pub items: Vec<AnalysisEvent>,
    pub diagnostics: Vec<BatchDiagnostic>,
    pub complete: bool,
    #[serde(default)]
    pub completeness: BatchCompleteness,
}

impl AnalysisBatch {
    pub fn empty(profile: CompatibilityProfile) -> Self {
        Self {
            parser_provenance: ParserProvenance::for_profile(profile),
            items: Vec::new(),
            diagnostics: Vec::new(),
            complete: true,
            // Keep the constructor backward-compatible with stage 1–3
            // fixtures; a full source pass assigns Canonical before return.
            completeness: BatchCompleteness::Unknown,
        }
    }
}

/// Run the complete Step 3 vertical slice against one explicit source.
pub fn analyze_source<B: SourceBackend>(
    backend: &B,
    spec: &SourceSpec,
    profile: CompatibilityProfile,
) -> anyhow::Result<AnalysisBatch> {
    analyze_source_with_optional_cancel(backend, spec, profile, None)
}

/// The process runtime uses the same bounded full-read path with an explicit
/// cancellation flag.  The legacy `analyze_source` API remains unchanged.
pub fn analyze_source_with_cancel<B: SourceBackend>(
    backend: &B,
    spec: &SourceSpec,
    profile: CompatibilityProfile,
    cancelled: &AtomicBool,
) -> anyhow::Result<AnalysisBatch> {
    analyze_source_with_optional_cancel(backend, spec, profile, Some(cancelled))
}

fn analyze_source_with_optional_cancel<B: SourceBackend>(
    backend: &B,
    spec: &SourceSpec,
    profile: CompatibilityProfile,
    cancelled: Option<&AtomicBool>,
) -> anyhow::Result<AnalysisBatch> {
    let mut batch = AnalysisBatch::empty(profile);
    let adapter = CodexEventAdapter::new_with_conversation_id(
        profile,
        spec.target_conversation_id().map(ToOwned::to_owned),
    );
    let mut visit = |record| {
        if cancelled.is_some_and(|flag| flag.load(Ordering::Acquire)) {
            anyhow::bail!("source analysis cancelled");
        }
        append_record(&mut batch, &adapter, record, profile);
        Ok(())
    };
    let report = backend.read(spec, &mut visit)?;
    if report.budget_exceeded {
        batch.complete = false;
        if !batch
            .diagnostics
            .iter()
            .any(|diagnostic| diagnostic.code == CollectorErrorKind::PayloadLimit.as_str())
        {
            batch.diagnostics.push(BatchDiagnostic {
                code: CollectorErrorKind::PayloadLimit.as_str().to_string(),
                message: Some("bounded source reader stopped at the configured limit".to_string()),
                source_ref: None,
                availability: Availability::PartialRollout,
            });
        }
    }
    batch.completeness = if !batch.complete {
        BatchCompleteness::Partial
    } else if batch.items.is_empty() && batch.diagnostics.is_empty() {
        // Preserve the stage 1–3 empty-batch fixture semantics. An empty
        // source proves no canonical history range; the phase 4 runtime still
        // promotes any non-empty complete source to Canonical.
        BatchCompleteness::Unknown
    } else {
        BatchCompleteness::Canonical
    };
    Ok(batch)
}

/// Adapt records with one caller-owned adapter instance.  This is the public
/// segmented path: pending Plan state and active turn state survive between
/// tail/backfill records and segment boundaries.
pub fn analyze_records_with_adapter(
    adapter: &CodexEventAdapter,
    records: impl IntoIterator<Item = SourceRecord>,
    profile: CompatibilityProfile,
    completeness: BatchCompleteness,
) -> AnalysisBatch {
    let mut batch = AnalysisBatch::empty(profile);
    batch.completeness = completeness;
    for record in records {
        append_record(&mut batch, adapter, record, profile);
    }
    if !batch.complete {
        batch.completeness = BatchCompleteness::Partial;
    }
    batch
}

fn append_record(
    batch: &mut AnalysisBatch,
    adapter: &CodexEventAdapter,
    record: SourceRecord,
    profile: CompatibilityProfile,
) {
    let decoded = decode_source_record(&record, profile);
    let mut events = adapter.adapt(&record, decoded);
    for (index, event) in events.iter_mut().enumerate() {
        // A segment-local counter would make the same event acquire a
        // different ordering when it is read from tail versus backfill.  A
        // large physical-line stride keeps the sequence source-position based
        // while leaving room for all events emitted by one bounded line.
        event.metadata_mut().sequence = record
            .physical_line_ordinal
            .saturating_mul(1_000_000)
            .saturating_add(index as u64);
        if event.is_diagnostic() || event.availability() != Availability::Present {
            batch.complete = false;
            batch.diagnostics.push(diagnostic_for(event));
        }
    }
    batch.items.extend(events);
}

pub fn analyze_path(
    path: impl Into<std::path::PathBuf>,
    profile: CompatibilityProfile,
) -> anyhow::Result<AnalysisBatch> {
    let backend = JsonlSourceBackend;
    analyze_source(&backend, &SourceSpec::new(path), profile)
}

fn diagnostic_for(event: &AnalysisEvent) -> BatchDiagnostic {
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
                "{reason}:{}",
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
