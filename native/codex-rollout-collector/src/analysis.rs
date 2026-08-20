//! TermLink-owned reduction of AnalysisEvent values.
//!
//! This module intentionally does not import vendored Codex types.  It is a
//! small conformance reducer for the formal collector, not the product
//! runtime reducer.  Demo/Spike remain read-only oracles.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::model::{AnalysisEvent, Availability, PlanOption, PlanStep, SourceRef, TurnStatus};
use crate::protocol::AnalysisBatch;

pub const ANALYSIS_PROJECTION_SCHEMA: &str = "termlink-analysis-projection";
pub const ANALYSIS_PROJECTION_VERSION: u16 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisProjection {
    pub schema: String,
    pub schema_version: u16,
    pub conversation_id: Option<String>,
    pub source: Option<String>,
    pub complete: bool,
    pub availability: Availability,
    pub turns: Vec<AnalysisTurn>,
    pub diagnostics: Vec<AnalysisDiagnostic>,
    /// Conformance-only aggregate used to compare the formal reducer with the
    /// Demo oracle. It is not a product conversation-level DTO field.
    pub usage_total: Option<AnalysisUsage>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisTurn {
    pub turn_id: String,
    pub sequence: u64,
    pub status: AnalysisTurnStatus,
    pub availability: Availability,
    pub context_window: Option<i64>,
    pub usage: Option<AnalysisUsage>,
    pub rate_limit: Option<AnalysisRateLimit>,
    pub message: Option<String>,
    pub items: Vec<AnalysisItem>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalysisTurnStatus {
    InProgress,
    Completed,
    Interrupted,
    Partial,
}

impl Default for AnalysisTurnStatus {
    fn default() -> Self {
        Self::InProgress
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisItem {
    pub item_key: String,
    pub turn_id: String,
    pub sequence: u64,
    pub timestamp: Option<String>,
    pub kind: String,
    pub presentation_kind: Option<String>,
    pub correlation_id: Option<String>,
    pub related_item_key: Option<String>,
    pub visible: bool,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub availability: Availability,
    pub source_ref: SourceRef,
    pub question: Option<AnalysisQuestion>,
    pub answer: Option<AnalysisAnswer>,
    pub plan: Option<AnalysisPlan>,
    pub plan_action: Option<String>,
    pub tool: Option<AnalysisTool>,
    pub path: Option<String>,
    pub query: Option<String>,
    pub result: Option<String>,
    pub attachment_name: Option<String>,
    pub media_type: Option<String>,
    pub artifact_id: Option<String>,
    pub artifact_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisQuestion {
    pub id: String,
    pub header: String,
    pub question: String,
    pub options: Vec<PlanOption>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisAnswer {
    pub question_id: String,
    pub answer: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisPlan {
    pub explanation: Option<String>,
    pub steps: Vec<PlanStep>,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisTool {
    pub tool_kind: String,
    pub tool_name: Option<String>,
    pub call_id: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub started: bool,
    pub completed: bool,
    pub outcome: Option<String>,
    pub availability: Availability,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisUsage {
    pub input_tokens: Option<i64>,
    pub cached_input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub reasoning_output_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisRateLimit {
    pub primary_used_percent: Option<f64>,
    pub primary_window_minutes: Option<i64>,
    pub primary_resets_at: Option<i64>,
    pub secondary_used_percent: Option<f64>,
    pub secondary_window_minutes: Option<i64>,
    pub secondary_resets_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisDiagnostic {
    pub item_key: String,
    pub code: String,
    pub message: Option<String>,
    pub availability: Availability,
    pub source_ref: SourceRef,
}

#[derive(Debug, Clone)]
pub struct AnalysisReducer {
    projection: AnalysisProjection,
    active_turn_id: Option<String>,
    current_plan_key: Option<String>,
    pending_questions: BTreeMap<String, Vec<String>>,
    seen_event_ids: BTreeSet<String>,
}

impl AnalysisReducer {
    pub fn new(conversation_id: Option<String>) -> Self {
        Self {
            projection: AnalysisProjection {
                schema: ANALYSIS_PROJECTION_SCHEMA.to_string(),
                schema_version: ANALYSIS_PROJECTION_VERSION,
                conversation_id,
                source: None,
                complete: true,
                availability: Availability::Present,
                turns: Vec::new(),
                diagnostics: Vec::new(),
                usage_total: None,
            },
            active_turn_id: None,
            current_plan_key: None,
            pending_questions: BTreeMap::new(),
            seen_event_ids: BTreeSet::new(),
        }
    }

    pub fn reduce_batch(batch: &AnalysisBatch) -> AnalysisProjection {
        let conversation_id = batch
            .items
            .iter()
            .find_map(|event| event.metadata().conversation_id.clone());
        let mut reducer = Self::new(conversation_id);
        reducer.apply_batch(batch);
        reducer.finish()
    }

    pub fn apply_batch(&mut self, batch: &AnalysisBatch) {
        self.projection.complete &= batch.complete;
        for diagnostic in &batch.diagnostics {
            self.merge_availability(diagnostic.availability);
            if diagnostic.availability != Availability::Present {
                self.projection.complete = false;
            }
        }
        for event in &batch.items {
            self.apply(event);
        }
    }

    pub fn apply(&mut self, event: &AnalysisEvent) {
        let event_id = event.event_id();
        if !event_id.is_empty() && !self.seen_event_ids.insert(event_id.to_string()) {
            return;
        }

        let metadata = event.metadata().clone();
        self.projection.source = Some(metadata.source_ref.source_identity.clone());
        self.merge_availability(metadata.availability);
        if metadata.availability != Availability::Present {
            self.projection.complete = false;
        }
        if self.projection.conversation_id.is_none() {
            self.projection.conversation_id = metadata.conversation_id.clone();
        }

        match event {
            AnalysisEvent::SessionContext { source, .. } => {
                if source.is_some() {
                    self.projection.source = source.clone();
                }
            }
            AnalysisEvent::TurnStarted {
                model_context_window,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                self.active_turn_id = Some(turn_id.clone());
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.status = AnalysisTurnStatus::InProgress;
                turn.availability = merge_availability(turn.availability, metadata.availability);
                if model_context_window.is_some() {
                    turn.context_window = *model_context_window;
                }
            }
            AnalysisEvent::UserMessage { text, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "user_message", true);
                item.presentation_kind = Some("message".to_string());
                item.content = Some(text.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::AssistantMessage { text, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "assistant_message", true);
                item.presentation_kind = Some("message".to_string());
                item.content = Some(text.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ToolStarted {
                tool_kind,
                tool_name,
                call_id,
                input,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "tool", true);
                item.presentation_kind = Some("tool".to_string());
                item.tool = Some(AnalysisTool {
                    tool_kind: tool_kind.clone(),
                    tool_name: tool_name.clone(),
                    call_id: call_id.clone(),
                    input: input.clone(),
                    output: None,
                    started: true,
                    completed: false,
                    outcome: None,
                    availability: metadata.availability,
                });
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ToolCompleted {
                tool_kind,
                call_id,
                output,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "tool", true);
                item.presentation_kind = Some("tool".to_string());
                item.tool = Some(AnalysisTool {
                    tool_kind: tool_kind.clone(),
                    tool_name: None,
                    call_id: call_id.clone(),
                    input: None,
                    output: output.clone(),
                    started: false,
                    completed: true,
                    outcome: Some(tool_outcome(output.as_deref())),
                    availability: metadata.availability,
                });
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanUpdated {
                explanation, steps, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let plan = AnalysisPlan {
                    explanation: explanation.clone(),
                    steps: steps.clone(),
                    state: plan_state(steps),
                };
                self.current_plan_key = Some(metadata.item_key.clone());
                let mut item = base_item(&metadata, &turn_id, "plan", true);
                item.presentation_kind = Some("plan".to_string());
                item.plan = Some(plan);
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanQuestion {
                call_id,
                question_id,
                header,
                question,
                options,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "plan_question", true);
                item.presentation_kind = Some("plan".to_string());
                item.summary = Some("awaiting_input".to_string());
                item.question = Some(AnalysisQuestion {
                    id: question_id.clone(),
                    header: header.clone(),
                    question: question.clone(),
                    options: options.clone(),
                });
                self.pending_questions
                    .entry(call_id.clone())
                    .or_default()
                    .push(metadata.item_key.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanAnswer {
                call_id,
                question_id,
                answer,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let related = metadata
                    .related_item_key
                    .clone()
                    .or_else(|| self.question_key(call_id, question_id));
                let mut item = base_item(&metadata, &turn_id, "plan_answer", true);
                item.presentation_kind = Some("plan".to_string());
                item.related_item_key = related.clone();
                item.answer = Some(AnalysisAnswer {
                    question_id: question_id.clone(),
                    answer: answer.clone(),
                });
                self.upsert_item(turn_id, item);
                if let Some(question_key) = related {
                    self.link_item(&question_key, &metadata.item_key);
                }
            }
            AnalysisEvent::PlanAction { action, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "plan_action", true);
                item.presentation_kind = Some("plan".to_string());
                item.related_item_key = metadata
                    .related_item_key
                    .clone()
                    .or_else(|| self.current_plan_key.clone());
                item.plan_action = Some(action.clone());
                item.summary = Some(format!("plan action: {action}"));
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::FileChanged { path, summary, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "file_change", true);
                item.path = path.clone();
                item.summary = summary.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::WebSearchFound { query, result, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "web_search", true);
                item.query = query.clone();
                item.result = result.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::AttachmentFound {
                name, media_type, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "attachment", true);
                item.attachment_name = name.clone();
                item.media_type = media_type.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ArtifactFound {
                artifact_id, name, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "artifact", true);
                item.artifact_id = artifact_id.clone();
                item.artifact_name = name.clone();
                self.upsert_item(turn_id, item);
            }
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
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let total = usage(
                    *input_tokens,
                    *cached_input_tokens,
                    *output_tokens,
                    *reasoning_output_tokens,
                    *total_tokens,
                );
                if total.has_value() {
                    self.merge_total_usage(total.clone());
                }
                let last = usage(
                    *last_input_tokens,
                    *last_cached_input_tokens,
                    *last_output_tokens,
                    *last_reasoning_output_tokens,
                    *last_total_tokens,
                );
                let turn_usage = if last.has_value() { last } else { total };
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                if turn_usage.has_value() {
                    turn.usage = Some(merge_usage(
                        turn.usage.take().unwrap_or_default(),
                        turn_usage,
                    ));
                }
                if model_context_window.is_some() {
                    turn.context_window = *model_context_window;
                }
            }
            AnalysisEvent::RateLimitUpdated {
                primary_used_percent,
                primary_window_minutes,
                primary_resets_at,
                secondary_used_percent,
                secondary_window_minutes,
                secondary_resets_at,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.rate_limit = Some(AnalysisRateLimit {
                    primary_used_percent: *primary_used_percent,
                    primary_window_minutes: *primary_window_minutes,
                    primary_resets_at: *primary_resets_at,
                    secondary_used_percent: *secondary_used_percent,
                    secondary_window_minutes: *secondary_window_minutes,
                    secondary_resets_at: *secondary_resets_at,
                });
            }
            AnalysisEvent::Compaction { summary, .. } => {
                self.record_diagnostic(
                    &metadata,
                    "compaction",
                    summary.clone(),
                    metadata.availability,
                );
            }
            AnalysisEvent::Diagnostic { code, message, .. } => {
                self.record_diagnostic(&metadata, code, message.clone(), metadata.availability);
            }
            AnalysisEvent::TurnCompleted {
                status, message, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.status = if *status == TurnStatus::Completed
                    && metadata.availability != Availability::Present
                {
                    AnalysisTurnStatus::Partial
                } else {
                    AnalysisTurnStatus::from(*status)
                };
                turn.availability = merge_availability(turn.availability, metadata.availability);
                turn.message = message.clone();
                self.active_turn_id = None;
            }
            AnalysisEvent::ParseGap { reason, .. } => {
                self.record_diagnostic(
                    &metadata,
                    "parse_gap",
                    Some(reason.clone()),
                    metadata.availability,
                );
            }
            AnalysisEvent::UnknownEvent {
                raw_type, reason, ..
            } => {
                let message = Some(format!(
                    "{}:{}",
                    reason,
                    raw_type.as_deref().unwrap_or("<unknown>")
                ));
                self.record_diagnostic(&metadata, "unknown_event", message, metadata.availability);
            }
        }
    }

    pub fn finish(mut self) -> AnalysisProjection {
        self.projection.turns.sort_by(|left, right| {
            left.sequence
                .cmp(&right.sequence)
                .then_with(|| left.turn_id.cmp(&right.turn_id))
        });
        for turn in &mut self.projection.turns {
            turn.items.sort_by(|left, right| {
                left.sequence
                    .cmp(&right.sequence)
                    .then_with(|| left.item_key.cmp(&right.item_key))
            });
        }
        self.projection.diagnostics.sort_by(|left, right| {
            left.source_ref
                .physical_line_ordinal
                .cmp(&right.source_ref.physical_line_ordinal)
                .then_with(|| left.item_key.cmp(&right.item_key))
        });
        self.projection
    }

    fn turn_id_for_event(&self, metadata: &crate::model::EventMetadata) -> String {
        metadata
            .turn_id
            .clone()
            .or_else(|| self.active_turn_id.clone())
            .unwrap_or_else(|| format!("turn:{}", metadata.item_key))
    }

    fn ensure_turn(&mut self, turn_id: &str, sequence: u64) -> &mut AnalysisTurn {
        if let Some(index) = self
            .projection
            .turns
            .iter()
            .position(|turn| turn.turn_id == turn_id)
        {
            let turn = &mut self.projection.turns[index];
            turn.sequence = turn.sequence.min(sequence);
            return turn;
        }
        self.projection.turns.push(AnalysisTurn {
            turn_id: turn_id.to_string(),
            sequence,
            status: AnalysisTurnStatus::InProgress,
            availability: Availability::Present,
            context_window: None,
            usage: None,
            rate_limit: None,
            message: None,
            items: Vec::new(),
        });
        self.projection.turns.last_mut().expect("turn was pushed")
    }

    fn upsert_item(&mut self, turn_id: String, mut item: AnalysisItem) {
        item.turn_id = turn_id.clone();
        let turn = self.ensure_turn(&turn_id, item.sequence);
        if let Some(existing) = turn
            .items
            .iter_mut()
            .find(|existing| existing.item_key == item.item_key)
        {
            merge_item(existing, item);
            return;
        }
        turn.items.push(item);
    }

    fn link_item(&mut self, item_key: &str, related_item_key: &str) {
        for turn in &mut self.projection.turns {
            if let Some(item) = turn.items.iter_mut().find(|item| item.item_key == item_key) {
                item.related_item_key = Some(related_item_key.to_string());
                return;
            }
        }
    }

    fn question_key(&self, call_id: &str, question_id: &str) -> Option<String> {
        self.pending_questions
            .get(call_id)
            .and_then(|keys| {
                keys.iter()
                    .find(|key| key.ends_with(&format!(":{question_id}")))
            })
            .cloned()
            .or_else(|| Some(format!("question:{question_id}")))
    }

    fn merge_total_usage(&mut self, usage: AnalysisUsage) {
        self.projection.usage_total = Some(merge_usage(
            self.projection.usage_total.take().unwrap_or_default(),
            usage,
        ));
    }

    fn merge_availability(&mut self, availability: Availability) {
        self.projection.availability =
            merge_availability(self.projection.availability, availability);
    }

    fn record_diagnostic(
        &mut self,
        metadata: &crate::model::EventMetadata,
        code: &str,
        message: Option<String>,
        availability: Availability,
    ) {
        if self
            .projection
            .diagnostics
            .iter()
            .any(|item| item.item_key == metadata.item_key)
        {
            return;
        }
        self.projection.diagnostics.push(AnalysisDiagnostic {
            item_key: metadata.item_key.clone(),
            code: code.to_string(),
            message,
            availability,
            source_ref: metadata.source_ref.clone(),
        });
    }
}

impl From<TurnStatus> for AnalysisTurnStatus {
    fn from(value: TurnStatus) -> Self {
        match value {
            TurnStatus::Completed => Self::Completed,
            TurnStatus::Interrupted => Self::Interrupted,
            TurnStatus::Partial => Self::Partial,
        }
    }
}

fn base_item(
    metadata: &crate::model::EventMetadata,
    turn_id: &str,
    kind: &str,
    visible: bool,
) -> AnalysisItem {
    AnalysisItem {
        item_key: metadata.item_key.clone(),
        turn_id: turn_id.to_string(),
        sequence: metadata.sequence,
        timestamp: metadata.timestamp.clone(),
        kind: kind.to_string(),
        presentation_kind: None,
        correlation_id: metadata.correlation_id.clone(),
        related_item_key: metadata.related_item_key.clone(),
        visible,
        content: None,
        summary: None,
        availability: metadata.availability,
        source_ref: metadata.source_ref.clone(),
        question: None,
        answer: None,
        plan: None,
        plan_action: None,
        tool: None,
        path: None,
        query: None,
        result: None,
        attachment_name: None,
        media_type: None,
        artifact_id: None,
        artifact_name: None,
    }
}

fn merge_item(existing: &mut AnalysisItem, incoming: AnalysisItem) {
    existing.sequence = existing.sequence.min(incoming.sequence);
    existing.timestamp = existing.timestamp.take().or(incoming.timestamp);
    existing.correlation_id = existing.correlation_id.take().or(incoming.correlation_id);
    existing.related_item_key = incoming
        .related_item_key
        .or(existing.related_item_key.take());
    existing.content = incoming.content.or(existing.content.take());
    existing.summary = incoming.summary.or(existing.summary.take());
    existing.availability = merge_availability(existing.availability, incoming.availability);
    existing.visible |= incoming.visible;
    existing.question = incoming.question.or(existing.question.take());
    existing.answer = incoming.answer.or(existing.answer.take());
    existing.plan = incoming.plan.or(existing.plan.take());
    existing.plan_action = incoming.plan_action.or(existing.plan_action.take());
    existing.path = incoming.path.or(existing.path.take());
    existing.query = incoming.query.or(existing.query.take());
    existing.result = incoming.result.or(existing.result.take());
    existing.attachment_name = incoming.attachment_name.or(existing.attachment_name.take());
    existing.media_type = incoming.media_type.or(existing.media_type.take());
    existing.artifact_id = incoming.artifact_id.or(existing.artifact_id.take());
    existing.artifact_name = incoming.artifact_name.or(existing.artifact_name.take());
    if let Some(next) = incoming.tool {
        if let Some(current) = existing.tool.as_mut() {
            merge_tool(current, next);
        } else {
            existing.tool = Some(next);
        }
    }
}

fn merge_tool(existing: &mut AnalysisTool, incoming: AnalysisTool) {
    if existing.tool_name.is_none() {
        existing.tool_name = incoming.tool_name;
    }
    if existing.input.is_none() {
        existing.input = incoming.input;
    }
    if incoming.output.is_some() {
        existing.output = incoming.output;
    }
    existing.started |= incoming.started;
    existing.completed |= incoming.completed;
    if incoming.outcome.is_some() {
        existing.outcome = incoming.outcome;
    }
    existing.availability = merge_availability(existing.availability, incoming.availability);
}

fn usage(
    input_tokens: Option<i64>,
    cached_input_tokens: Option<i64>,
    output_tokens: Option<i64>,
    reasoning_output_tokens: Option<i64>,
    total_tokens: Option<i64>,
) -> AnalysisUsage {
    AnalysisUsage {
        input_tokens,
        cached_input_tokens,
        output_tokens,
        reasoning_output_tokens,
        total_tokens,
    }
}

fn merge_usage(mut existing: AnalysisUsage, incoming: AnalysisUsage) -> AnalysisUsage {
    if incoming.input_tokens.is_some() {
        existing.input_tokens = incoming.input_tokens;
    }
    if incoming.cached_input_tokens.is_some() {
        existing.cached_input_tokens = incoming.cached_input_tokens;
    }
    if incoming.output_tokens.is_some() {
        existing.output_tokens = incoming.output_tokens;
    }
    if incoming.reasoning_output_tokens.is_some() {
        existing.reasoning_output_tokens = incoming.reasoning_output_tokens;
    }
    if incoming.total_tokens.is_some() {
        existing.total_tokens = incoming.total_tokens;
    }
    existing
}

impl AnalysisUsage {
    fn has_value(&self) -> bool {
        self.input_tokens.is_some()
            || self.cached_input_tokens.is_some()
            || self.output_tokens.is_some()
            || self.reasoning_output_tokens.is_some()
            || self.total_tokens.is_some()
    }
}

fn plan_state(steps: &[PlanStep]) -> String {
    if steps.is_empty() {
        return "unknown".to_string();
    }
    if steps.iter().all(|step| step.status == "completed") {
        "completed".to_string()
    } else if steps.iter().any(|step| step.status == "in_progress") {
        "in_progress".to_string()
    } else {
        "pending".to_string()
    }
}

fn tool_outcome(output: Option<&str>) -> String {
    if output.is_some_and(|value| value.contains("success=false") || value.contains("error=")) {
        "failed".to_string()
    } else {
        "completed".to_string()
    }
}

fn merge_availability(left: Availability, right: Availability) -> Availability {
    if availability_rank(right) > availability_rank(left) {
        right
    } else {
        left
    }
}

fn availability_rank(value: Availability) -> u8 {
    match value {
        Availability::Present => 0,
        Availability::PartialRollout => 1,
        Availability::UnsupportedSchema => 2,
        Availability::NotRecoverableFromRollout => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::{AnalysisReducer, AnalysisTurnStatus};
    use crate::model::{AnalysisEvent, Availability, EventMetadata, SourceRef, TurnStatus};
    use crate::protocol::AnalysisBatch;
    use crate::{CompatibilityProfile, JsonlSourceBackend, SourceSpec, analyze_source};

    #[test]
    fn reducer_upserts_tool_begin_and_end_and_keeps_last_turn_usage() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/current/minimal-rollout.jsonl");
        let batch = analyze_source(
            &JsonlSourceBackend,
            &SourceSpec::new(path),
            CompatibilityProfile::Current,
        )
        .expect("fixture analyzes");
        let projection = AnalysisReducer::reduce_batch(&batch);
        let turn = projection
            .turns
            .iter()
            .find(|turn| turn.items.iter().any(|item| item.item_key == "tool:call-1"))
            .expect("tool turn");
        let tool = turn
            .items
            .iter()
            .find(|item| item.item_key == "tool:call-1")
            .and_then(|item| item.tool.as_ref())
            .expect("tool");
        assert!(tool.started);
        assert!(tool.completed);
        assert_eq!(
            turn.usage.as_ref().and_then(|usage| usage.total_tokens),
            Some(70)
        );
        assert_eq!(
            projection
                .usage_total
                .as_ref()
                .and_then(|usage| usage.total_tokens),
            Some(120)
        );
    }

    #[test]
    fn reducer_preserves_unknown_and_partial_as_non_terminal() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/partial/abort-compaction.jsonl");
        let batch = analyze_source(
            &JsonlSourceBackend,
            &SourceSpec::new(path),
            CompatibilityProfile::Current,
        )
        .expect("fixture analyzes");
        let projection = AnalysisReducer::reduce_batch(&batch);
        assert!(!projection.complete);
        assert!(!projection.diagnostics.is_empty());
        assert_eq!(projection.turns[0].status, AnalysisTurnStatus::Interrupted);
    }

    #[test]
    fn reducer_empty_batch_is_stable() {
        let projection =
            AnalysisReducer::reduce_batch(&AnalysisBatch::empty(CompatibilityProfile::Current));
        assert!(projection.complete);
        assert!(projection.turns.is_empty());
        assert!(projection.diagnostics.is_empty());
    }

    #[test]
    fn partial_availability_cannot_project_as_a_successful_terminal_turn() {
        let event = AnalysisEvent::TurnCompleted {
            metadata: EventMetadata {
                event_id: "source:turn:turn-1:turn_completed:0".to_string(),
                item_key: "turn:turn-1".to_string(),
                correlation_id: Some("turn-1".to_string()),
                related_item_key: None,
                conversation_id: Some("conversation-1".to_string()),
                turn_id: Some("turn-1".to_string()),
                timestamp: None,
                sequence: 1,
                availability: Availability::PartialRollout,
                identity_origin: crate::model::IdentityOrigin::NativeStableId,
                source_ref: SourceRef {
                    source_identity: "source".to_string(),
                    byte_start: 0,
                    byte_end: 1,
                    physical_line_ordinal: 1,
                    rollout_ordinal: Some(1),
                    timestamp: None,
                    item_type: Some("turn_complete".to_string()),
                },
            },
            status: TurnStatus::Completed,
            message: Some("incomplete terminal record".to_string()),
            duration_ms: None,
        };
        let mut reducer = AnalysisReducer::new(Some("conversation-1".to_string()));
        reducer.apply(&event);
        let projection = reducer.finish();
        assert_eq!(projection.turns[0].status, AnalysisTurnStatus::Partial);
        assert_eq!(
            projection.turns[0].availability,
            Availability::PartialRollout
        );
        assert!(!projection.complete);
    }
}
