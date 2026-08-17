//! Report generation for the standalone projection demo.
//!
//! The projection and the comparison payloads are deterministic. Runtime
//! timing and peak memory are deliberately informational and are not part of
//! the determinism verdict.

use std::collections::BTreeMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::dto::HistoryProjection;
use crate::reducer::ReduceStats;
use crate::self_api::SelfApiVerificationReport;

/// Deterministic demo report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemoReport {
    pub schema: String,
    pub schema_version: u64,
    pub codex_revision: String,
    pub input: InputStats,
    pub reduction: ReductionStats,
    pub comparison: ComparisonStats,
    pub output: OutputStats,
    pub determinism: DeterminismStats,
    pub self_api_verification: Option<SelfApiVerificationReport>,
    pub timing: TimingStats,
    pub partial: bool,
}

/// Parse and projection timing plus peak memory (deterministic per input,
/// machine-dependent values are informational only).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimingStats {
    pub read_ms: u64,
    pub reduce_ms: u64,
    pub project_ms: u64,
    pub total_ms: u64,
    pub peak_memory_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputStats {
    pub rollout_path: String,
    pub bytes: u64,
    pub decoded_bytes: u64,
    pub budget_bytes: u64,
    pub line_count: u64,
    pub valid_records: u64,
    pub parse_errors: u64,
    pub first_parse_error: Option<String>,
    pub item_kinds: BTreeMap<String, u64>,
    pub event_payload_types: BTreeMap<String, u64>,
    pub unmapped_types: BTreeMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReductionStats {
    pub conversations: u64,
    pub turns: u64,
    pub retained_items: u64,
    pub retained_by_kind: BTreeMap<String, u64>,
    pub dropped_total: u64,
    pub dropped_by_kind: BTreeMap<String, u64>,
    pub detail_payloads: u64,
    pub detail_bytes: u64,
    pub detail_full_retained: u64,
    pub detail_summary_only: u64,
    pub detail_dropped_by_policy: u64,
    pub result_fields_deduplicated: u64,
    pub commands_normalized: u64,
    pub approvals_seen: u64,
    pub compactions_seen: u64,
    pub rollbacks_seen: u64,
    pub hidden_reasoning_dropped: u64,
    pub delta_dropped: u64,
    pub plan_questions_seen: u64,
    pub plan_answers_seen: u64,
    pub unresolved_tools: u64,
    pub unresolved_questions: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonStats {
    /// Whether the official `thread/read(true)`-style turns were built.
    pub official_built: bool,
    /// Number of official turns produced by `build_turns_from_rollout_items`.
    pub official_turn_count: u64,
    /// Number of turns in the TermLink projection.
    pub projection_turn_count: u64,
    /// Number of official thread items across all turns.
    pub official_item_count: u64,
    /// Number of projection history items.
    pub projection_item_count: u64,
    /// Counts of official item kinds (debug view of the official reducer).
    pub official_item_kinds: BTreeMap<String, u64>,
    /// Fields the official normalization lacks but the projection preserves.
    pub official_missing_but_projection_has: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputStats {
    pub report_path: String,
    pub projection_path: String,
    pub details_path: Option<String>,
    pub official_path: Option<String>,
    pub projection_bytes: u64,
    pub details_bytes: u64,
    pub official_bytes: u64,
    pub content_hash: String,
    pub snapshot_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeterminismStats {
    pub run_index: u64,
    pub same_keys: bool,
    pub same_hashes: bool,
    pub same_report: bool,
    pub first_run_content_hash: Option<String>,
    pub second_run_content_hash: Option<String>,
    pub timing_excluded: bool,
}

#[allow(dead_code)]
pub struct RunTiming {
    pub read: Duration,
    pub reduce: Duration,
    pub project: Duration,
    pub total: Duration,
}

/// Build the report document from collected facts.
pub fn build_report(
    codex_revision: &str,
    input: InputStats,
    reduction: ReductionStats,
    comparison: ComparisonStats,
    output: OutputStats,
    determinism: DeterminismStats,
    self_api_verification: Option<SelfApiVerificationReport>,
    timing: TimingStats,
) -> DemoReport {
    let partial = input.parse_errors > 0
        || !input.unmapped_types.is_empty()
        || reduction.unresolved_tools > 0
        || reduction.unresolved_questions > 0;
    DemoReport {
        schema: "codex-rollout-demo-report".to_string(),
        schema_version: 3,
        codex_revision: codex_revision.to_string(),
        input,
        reduction,
        comparison,
        output,
        determinism,
        self_api_verification,
        timing,
        partial,
    }
}

/// Count retained kinds from the projection.
pub fn count_retained(projection: &HistoryProjection) -> ReductionStats {
    let mut retained_by_kind: BTreeMap<String, u64> = BTreeMap::new();
    let mut turns = 0u64;
    let mut retained_items = 0u64;
    for turn in &projection.turns {
        turns += 1;
        for item in &turn.items {
            retained_items += 1;
            *retained_by_kind.entry(item.kind.clone()).or_insert(0) += 1;
        }
    }
    ReductionStats {
        conversations: 1,
        turns,
        retained_items,
        retained_by_kind,
        dropped_total: 0,
        dropped_by_kind: BTreeMap::new(),
        detail_payloads: 0,
        detail_bytes: 0,
        detail_full_retained: 0,
        detail_summary_only: 0,
        detail_dropped_by_policy: 0,
        result_fields_deduplicated: 0,
        commands_normalized: 0,
        approvals_seen: 0,
        compactions_seen: 0,
        rollbacks_seen: 0,
        hidden_reasoning_dropped: 0,
        delta_dropped: 0,
        plan_questions_seen: 0,
        plan_answers_seen: 0,
        unresolved_tools: 0,
        unresolved_questions: 0,
    }
}

/// Merge reducer stats into a report-ready structure.
pub fn reduction_stats_from(
    reduce: &ReduceStats,
    projection: &HistoryProjection,
) -> ReductionStats {
    let mut base = count_retained(projection);
    base.dropped_total = reduce.dropped_total;
    base.dropped_by_kind = reduce.dropped_by_kind.clone();
    base.detail_payloads = reduce.detail_payloads;
    base.detail_bytes = reduce.detail_bytes;
    base.detail_full_retained = reduce.detail_full_retained;
    base.detail_summary_only = reduce.detail_summary_only;
    base.detail_dropped_by_policy = reduce.detail_dropped_by_policy;
    base.result_fields_deduplicated = reduce.result_fields_deduplicated;
    base.commands_normalized = reduce.commands_normalized;
    base.approvals_seen = reduce.approvals_seen;
    base.compactions_seen = reduce.compactions_seen;
    base.rollbacks_seen = reduce.rollbacks_seen;
    base.hidden_reasoning_dropped = reduce.hidden_reasoning_dropped;
    base.delta_dropped = reduce.delta_dropped;
    base.plan_questions_seen = reduce.plan_questions_seen;
    base.plan_answers_seen = reduce.plan_answers_seen;
    base.unresolved_tools = reduce.unresolved_tools;
    base.unresolved_questions = reduce.unresolved_questions;
    base
}

/// Extract a debugging view of official turn items (kind counts).
pub fn official_item_kinds(official: &Value) -> BTreeMap<String, u64> {
    let mut counts: BTreeMap<String, u64> = BTreeMap::new();
    if let Some(turns) = official.get("turns").and_then(|v| v.as_array()) {
        for turn in turns {
            if let Some(items) = turn.get("items").and_then(|v| v.as_array()) {
                for item in items {
                    let kind = item
                        .get("kind")
                        .or_else(|| item.get("type"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    *counts.entry(kind).or_insert(0) += 1;
                }
            }
        }
    }
    counts
}
