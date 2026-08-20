use serde::{Deserialize, Serialize};

use crate::codex_adapter::CodexEventAdapter;
use crate::codex_wire::{CompatibilityProfile, decode_source_record};
use crate::error::CollectorErrorKind;
use crate::model::{AnalysisEvent, Availability, SourceRef};
use crate::source::{JsonlSourceBackend, SourceBackend, SourceSpec};
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisBatch {
    pub parser_provenance: ParserProvenance,
    pub items: Vec<AnalysisEvent>,
    pub diagnostics: Vec<BatchDiagnostic>,
    pub complete: bool,
}

impl AnalysisBatch {
    pub fn empty(profile: CompatibilityProfile) -> Self {
        Self {
            parser_provenance: ParserProvenance::for_profile(profile),
            items: Vec::new(),
            diagnostics: Vec::new(),
            complete: true,
        }
    }
}

/// Run the complete Step 3 vertical slice against one explicit source.
pub fn analyze_source<B: SourceBackend>(
    backend: &B,
    spec: &SourceSpec,
    profile: CompatibilityProfile,
) -> anyhow::Result<AnalysisBatch> {
    let mut batch = AnalysisBatch::empty(profile);
    let adapter = CodexEventAdapter::new_with_conversation_id(
        profile,
        spec.target_conversation_id().map(ToOwned::to_owned),
    );
    let mut next_sequence = 0_u64;
    let mut visit = |record| {
        let decoded = decode_source_record(&record, profile);
        let mut events = adapter.adapt(&record, decoded);
        for event in &mut events {
            event.metadata_mut().sequence = next_sequence;
            next_sequence = next_sequence.saturating_add(1);
            if event.is_diagnostic() || event.availability() != Availability::Present {
                batch.complete = false;
                batch.diagnostics.push(diagnostic_for(event));
            }
        }
        batch.items.extend(events);
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
    Ok(batch)
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
