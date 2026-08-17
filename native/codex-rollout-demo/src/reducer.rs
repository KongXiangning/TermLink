//! History projection v2.
//!
//! The reducer intentionally consumes the typed rollout records instead of
//! trying to imitate app-server's public response shape.  It keeps the
//! user-visible transcript and compact tool metadata in the projection while
//! putting large stdout/stderr/result bodies in separately referenced details.
//!
//! Important invariants:
//! - `item_key` is stable for a call/message id and allows event/response
//!   wrappers to merge without depending on their arrival order.
//! - every retained item has a content hash; the hash includes structured tool
//!   fields, not only visible text.
//! - details are created only when an item owns the corresponding `detail_ref`.
//! - hidden reasoning, compaction, streaming deltas and transport noise are
//!   dropped deliberately and counted.

use std::collections::{BTreeMap, HashMap, HashSet};

use codex_protocol::models::{self, ContentItem, ResponseItem};
use codex_protocol::protocol::{EventMsg, RolloutItem};
use serde_json::{Value, json};
use sha2::Digest;

use crate::dto::{
    AvailabilityStatus, ConversationDto, DetailPayloadDto, HistoryBaseDto, HistoryItemDto,
    HistoryProjection, PlanAnswerDto, PlanQuestionDto, PlanQuestionOptionDto, SourceRefDto,
    TaskOutcomeDto, ToolItemDto, TurnDto, UsageDto,
};
use crate::reader::ParsedRolloutLine;

pub type KindCounts = BTreeMap<String, u64>;

#[derive(Debug, Clone, Default)]
pub struct ReduceStats {
    pub dropped_total: u64,
    pub dropped_by_kind: BTreeMap<String, u64>,
    pub retained_by_kind: KindCounts,
    pub detail_payloads: u64,
    pub detail_bytes: u64,
    pub detail_full_retained: u64,
    pub detail_summary_only: u64,
    pub detail_dropped_by_policy: u64,
    pub result_fields_deduplicated: u64,
    pub commands_normalized: u64,
    pub rollbacks_seen: u64,
    pub compactions_seen: u64,
    pub approvals_seen: u64,
    pub hidden_reasoning_dropped: u64,
    pub delta_dropped: u64,
    pub plan_questions_seen: u64,
    pub plan_answers_seen: u64,
    pub unresolved_tools: u64,
    pub unresolved_questions: u64,
}

#[derive(Debug, Clone)]
struct PendingTool {
    turn_id: String,
    item_key: String,
    detail_ref: Option<String>,
    hidden: bool,
    wait_cell_id: Option<String>,
}

#[derive(Debug, Clone)]
struct PendingQuestion {
    turn_id: String,
    item_keys: Vec<String>,
}

pub struct HistoryReducer {
    pub projection: HistoryProjection,
    pub details: Vec<DetailPayloadDto>,
    pub stats: ReduceStats,
    pending_tools: HashMap<String, PendingTool>,
    pending_questions: HashMap<String, PendingQuestion>,
    /// Maps a host-side async cell id from an `exec` result to the original
    /// tool call. Later `wait` results are folded into that call instead of
    /// becoming independent durable details.
    running_cells: HashMap<String, String>,
    settings_hashes: HashSet<String>,
    current_turn_id: Option<String>,
    target_session_id: String,
    target_metadata_seen: bool,
    partial_rollout: bool,
    unsupported_schema: bool,
    history_start_ordinal: Option<u64>,
    current_source_ordinal: u64,
    current_rollout_ordinal: Option<u64>,
    current_timestamp: Option<String>,
    next_turn_sequence: u64,
    next_detail_sequence: u64,
}

impl HistoryReducer {
    /// Create a reducer for one caller-selected session.
    ///
    /// A rollout can contain copied parent records and multiple `SessionMeta`
    /// records. The reducer must therefore never select its identity from the
    /// input stream. The caller owns that binding (for example, from the
    /// rollout filename, an index, or a server-side conversation binding).
    pub fn new(mut conversation: ConversationDto, target_session_id: String) -> Self {
        let target_session_id = target_session_id.trim().to_string();
        assert!(
            !target_session_id.is_empty(),
            "HistoryReducer requires an explicit target session id"
        );
        conversation.conversation_id = target_session_id.clone();
        Self {
            projection: HistoryProjection {
                schema: crate::dto::HISTORY_SCHEMA_NAME.to_string(),
                schema_version: crate::dto::HISTORY_SCHEMA_VERSION,
                hash_algorithm: crate::dto::HISTORY_HASH_ALGORITHM.to_string(),
                conversation,
                turns: Vec::new(),
                task_outcome: None,
                field_availability: BTreeMap::new(),
            },
            details: Vec::new(),
            stats: ReduceStats::default(),
            pending_tools: HashMap::new(),
            pending_questions: HashMap::new(),
            running_cells: HashMap::new(),
            settings_hashes: HashSet::new(),
            current_turn_id: None,
            target_session_id,
            target_metadata_seen: false,
            partial_rollout: false,
            unsupported_schema: false,
            history_start_ordinal: None,
            current_source_ordinal: 0,
            current_rollout_ordinal: None,
            current_timestamp: None,
            next_turn_sequence: 0,
            next_detail_sequence: 0,
        }
    }

    /// Pass reader-level quality information into the projection. A parse gap
    /// makes absent fields partial; an unmapped record means the current
    /// protocol schema cannot fully represent some source data.
    pub fn set_read_quality(&mut self, partial_rollout: bool, unsupported_schema: bool) {
        self.partial_rollout |= partial_rollout;
        self.unsupported_schema |= unsupported_schema;
        if self.partial_rollout {
            self.projection.conversation.availability = Some("partial_rollout".to_string());
        }
    }

    pub fn reduce(&mut self, line: &ParsedRolloutLine) {
        self.current_source_ordinal = line.source_ordinal;
        self.current_rollout_ordinal = line.rollout_ordinal;
        self.current_timestamp = Some(line.line.timestamp.clone());
        let ordinal = line.effective_ordinal();
        let target_session_meta = match &line.line.item {
            RolloutItem::SessionMeta(meta) => Some(self.apply_session_meta(meta)),
            _ => None,
        };
        if target_session_meta == Some(false) {
            self.drop_kind("foreign_session_meta");
            return;
        }
        if !matches!(line.line.item, RolloutItem::SessionMeta(_))
            && self
                .history_start_ordinal
                .is_some_and(|start| ordinal < start)
        {
            self.drop_kind("inherited_history");
            return;
        }
        if self.target_metadata_seen {
            self.projection.conversation.updated_at = Some(line.line.timestamp.clone());
        }
        match &line.line.item {
            RolloutItem::SessionMeta(_) => {}
            RolloutItem::TurnContext(context) => self.apply_turn_context(context, ordinal),
            RolloutItem::ResponseItem(item) => self.apply_response_item(item, ordinal),
            RolloutItem::EventMsg(event) => self.apply_event(event, ordinal),
            RolloutItem::InterAgentCommunication(message) => {
                if !message.content.trim().is_empty() {
                    let turn_id = self.target_turn(None, ordinal);
                    self.upsert_item(
                        turn_id.clone(),
                        HistoryItemDto {
                            item_key: message
                                .id
                                .as_ref()
                                .map(ToString::to_string)
                                .unwrap_or_else(|| format!("inter-agent:{ordinal}")),
                            turn_id,
                            kind: "inter_agent_message".to_string(),
                            visible: true,
                            content: Some(message.content.clone()),
                            source_ref: Some(self.source_ref(ordinal, "inter_agent_communication")),
                            ..Default::default()
                        },
                    );
                } else {
                    self.drop_kind("inter_agent_message_empty");
                }
            }
            RolloutItem::InterAgentCommunicationMetadata { .. } => {
                self.drop_kind("inter_agent_communication_metadata")
            }
            RolloutItem::Compacted(_) => {
                self.stats.compactions_seen += 1;
                self.drop_kind("compacted");
            }
            RolloutItem::WorldState(_) => self.drop_kind("world_state"),
        }
    }

    pub fn finish(mut self) -> (HistoryProjection, Vec<DetailPayloadDto>, ReduceStats) {
        for turn in &mut self.projection.turns {
            if turn.status == "in_progress" {
                turn.status = "incomplete".to_string();
                turn.outcome = Some("incomplete".to_string());
                turn.availability = Some("partial_rollout".to_string());
            }
        }
        self.stats.unresolved_tools = self
            .pending_tools
            .values()
            .filter(|pending| !pending.hidden)
            .filter(|pending| {
                self.find_item(&pending.turn_id, &pending.item_key)
                    .and_then(|item| item.tool.as_ref())
                    .and_then(|tool| tool.status.as_deref())
                    .is_none_or(|status| status == "in_progress")
            })
            .count() as u64;
        self.stats.unresolved_questions = self.pending_questions.len() as u64;
        let task_outcome = self.build_task_outcome();
        self.projection.task_outcome = Some(task_outcome.clone());
        self.add_task_outcome_item(&task_outcome);
        self.populate_field_availability();
        let stats = std::mem::take(&mut self.stats);
        (self.projection, self.details, stats)
    }

    fn populate_field_availability(&mut self) {
        let mut fields = BTreeMap::new();
        fields.insert(
            "rollout.parse".to_string(),
            if self.partial_rollout {
                AvailabilityStatus::PartialRollout
            } else {
                AvailabilityStatus::Present
            },
        );
        fields.insert(
            "rollout.schema".to_string(),
            if self.unsupported_schema {
                AvailabilityStatus::UnsupportedSchema
            } else {
                AvailabilityStatus::Present
            },
        );
        fields.insert(
            "rollout.unmapped_types".to_string(),
            if self.unsupported_schema {
                AvailabilityStatus::UnsupportedSchema
            } else {
                AvailabilityStatus::Present
            },
        );

        let conversation = &self.projection.conversation;
        self.mark_optional(
            &mut fields,
            "conversation.cli_version",
            &conversation.cli_version,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.codex_revision",
            &conversation.codex_revision,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.thread_id",
            &conversation.thread_id,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.forked_from_id",
            &conversation.forked_from_id,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.parent_thread_id",
            &conversation.parent_thread_id,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.history_mode",
            &conversation.history_mode,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.history_base",
            &conversation.history_base,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.subagent_history_start_ordinal",
            &conversation.subagent_history_start_ordinal,
            false,
        );
        self.mark_optional(&mut fields, "conversation.cwd", &conversation.cwd, false);
        self.mark_optional(
            &mut fields,
            "conversation.git_info",
            &conversation.git_info,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.model",
            &conversation.model,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.model_provider",
            &conversation.model_provider,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.redaction_policy",
            &conversation.redaction_policy,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.availability",
            &conversation.availability,
            self.partial_rollout,
        );
        self.mark_optional(
            &mut fields,
            "conversation.created_at",
            &conversation.created_at,
            false,
        );
        self.mark_optional(
            &mut fields,
            "conversation.updated_at",
            &conversation.updated_at,
            false,
        );

        for (turn_index, turn) in self.projection.turns.iter().enumerate() {
            let turn_path = format!("turns[{turn_index}]");
            let turn_partial = self.partial_rollout
                || turn.status == "incomplete"
                || turn.availability.as_deref() == Some("partial_rollout");
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.started_at"),
                &turn.started_at,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.completed_at"),
                &turn.completed_at,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.duration_ms"),
                &turn.duration_ms,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.time_to_first_token_ms"),
                &turn.time_to_first_token_ms,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.context_window"),
                &turn.context_window,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.outcome"),
                &turn.outcome,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.error"),
                &turn.error,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.availability"),
                &turn.availability,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.usage"),
                &turn.usage,
                turn_partial,
            );
            self.mark_optional(
                &mut fields,
                format!("{turn_path}.rate_limit"),
                &turn.rate_limit,
                turn_partial,
            );

            for (item_index, item) in turn.items.iter().enumerate() {
                let item_path = format!("{turn_path}.items[{item_index}]");
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.content"),
                    &item.content,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.summary"),
                    &item.summary,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.availability"),
                    &item.availability,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.source_ref"),
                    &item.source_ref,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.content_hash"),
                    &item.content_hash,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.detail_ref"),
                    &item.detail_ref,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.question"),
                    &item.question,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.answer"),
                    &item.answer,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.tool"),
                    &item.tool,
                    turn_partial,
                );
                if let Some(tool) = &item.tool {
                    let tool_path = format!("{item_path}.tool");
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.tool_name"),
                        &tool.tool_name,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.command"),
                        &tool.command,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.arguments"),
                        &tool.arguments,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.cwd"),
                        &tool.cwd,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.status"),
                        &tool.status,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.exit_code"),
                        &tool.exit_code,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.duration_ms"),
                        &tool.duration_ms,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.approval"),
                        &tool.approval,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.output_bytes"),
                        &tool.output_bytes,
                        turn_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        format!("{tool_path}.output_sha256"),
                        &tool.output_sha256,
                        turn_partial,
                    );
                }
            }
        }

        match &self.projection.task_outcome {
            Some(outcome) => {
                let outcome_partial = outcome.availability != "present";
                self.mark_optional(
                    &mut fields,
                    "task_outcome.final_turn_id",
                    &outcome.final_turn_id,
                    outcome_partial,
                );
                self.mark_optional(
                    &mut fields,
                    "task_outcome.conclusion",
                    &outcome.conclusion,
                    outcome_partial,
                );
                self.mark_optional(
                    &mut fields,
                    "task_outcome.error",
                    &outcome.error,
                    outcome_partial,
                );
            }
            None => {
                fields.insert(
                    "task_outcome".to_string(),
                    self.field_status(false, self.partial_rollout),
                );
            }
        }
        self.projection.field_availability = fields;
    }

    fn mark_optional<T>(
        &self,
        fields: &mut BTreeMap<String, AvailabilityStatus>,
        path: impl Into<String>,
        value: &Option<T>,
        partial: bool,
    ) {
        // A complete rollout has a stable default: an omitted optional field
        // is `not_recoverable_from_rollout`. Only exceptional quality states
        // need per-field entries. Approval is retained as an explicit
        // exception because it is intentionally not reconstructed as a
        // durable approval item. This keeps the provenance map useful without
        // adding tens of thousands of repeated strings to every projection.
        let path = path.into();
        if value.is_none()
            && (partial
                || self.partial_rollout
                || self.unsupported_schema
                || path.ends_with(".approval"))
        {
            fields.insert(path, self.field_status(false, partial));
        }
    }

    fn field_status(&self, present: bool, partial: bool) -> AvailabilityStatus {
        if present {
            AvailabilityStatus::Present
        } else if partial || self.partial_rollout {
            AvailabilityStatus::PartialRollout
        } else if self.unsupported_schema {
            AvailabilityStatus::UnsupportedSchema
        } else {
            AvailabilityStatus::NotRecoverableFromRollout
        }
    }

    fn apply_session_meta(&mut self, meta: &codex_protocol::protocol::SessionMetaLine) -> bool {
        let session_id = meta.meta.session_id.to_string();
        let thread_id = meta.meta.id.to_string();
        if self.target_session_id != session_id {
            return false;
        }
        self.target_metadata_seen = true;
        let metadata_boundary = [
            meta.meta
                .history_base
                .map(|base| base.end_ordinal_exclusive),
            meta.meta.subagent_history_start_ordinal,
        ]
        .into_iter()
        .flatten()
        .max();
        if let Some(boundary) = metadata_boundary {
            self.history_start_ordinal = Some(
                self.history_start_ordinal
                    .map_or(boundary, |current| current.max(boundary)),
            );
        }
        let conversation = &mut self.projection.conversation;
        conversation.conversation_id = session_id;
        conversation.thread_id = Some(thread_id);
        conversation.forked_from_id = meta.meta.forked_from_id.map(|id| id.to_string());
        conversation.parent_thread_id = meta.meta.parent_thread_id.map(|id| id.to_string());
        conversation.cli_version = non_empty(Some(meta.meta.cli_version.clone()));
        conversation.history_mode = Some(meta.meta.history_mode.as_str().to_string());
        if let Some(base) = meta.meta.history_base {
            conversation.history_base = Some(HistoryBaseDto {
                thread_id: base.thread_id.to_string(),
                end_ordinal_exclusive: base.end_ordinal_exclusive,
                end_byte_offset: base.end_byte_offset,
            });
        }
        if let Some(start_ordinal) = meta.meta.subagent_history_start_ordinal {
            conversation.subagent_history_start_ordinal = Some(start_ordinal);
        }
        conversation.cwd = non_empty(Some(meta.meta.cwd.to_string_lossy().to_string()));
        conversation.git_info = meta
            .git
            .as_ref()
            .and_then(|git| serde_json::to_value(git).ok());
        conversation.model_provider = meta.meta.model_provider.clone();
        conversation.created_at = non_empty(Some(meta.meta.timestamp.clone()));
        conversation.source = format!("codex_rollout:{:?}", meta.meta.source).to_lowercase();
        conversation.updated_at = non_empty(Some(meta.meta.timestamp.clone()));
        true
    }

    fn build_task_outcome(&self) -> TaskOutcomeDto {
        let final_turn = self.projection.turns.last();
        let final_turn_id = final_turn.map(|turn| turn.turn_id.clone());
        let conclusion_item = final_turn.and_then(|turn| {
            turn.items.iter().rev().find(|item| {
                item.kind == "assistant_message"
                    && item.visible
                    && item
                        .content
                        .as_deref()
                        .is_some_and(|text| !text.trim().is_empty())
            })
        });
        let conclusion = conclusion_item.and_then(|item| item.content.clone());
        let mut source_item_keys = Vec::new();
        if let Some(item) = conclusion_item {
            push_unique(&mut source_item_keys, item.item_key.clone());
        }
        let mut modified_files = Vec::new();
        let mut validation_item_keys = Vec::new();
        if let Some(final_turn) = final_turn {
            for item in &final_turn.items {
                if item.kind == "file_change" {
                    push_unique(&mut source_item_keys, item.item_key.clone());
                    for path in self.modified_files_for_item(item) {
                        push_unique(&mut modified_files, path);
                    }
                }
                if is_validation_item(item) {
                    push_unique(&mut source_item_keys, item.item_key.clone());
                    push_unique(&mut validation_item_keys, item.item_key.clone());
                }
            }
        }
        let (status, error) = final_turn
            .map(|turn| {
                (
                    turn.outcome.clone().unwrap_or_else(|| turn.status.clone()),
                    turn.error.clone(),
                )
            })
            .unwrap_or_else(|| ("unknown".to_string(), None));
        let availability = if final_turn.is_some() && conclusion.is_some() {
            "present"
        } else {
            "not_recoverable_from_rollout"
        };
        TaskOutcomeDto {
            status,
            final_turn_id,
            conclusion,
            error,
            source_item_keys,
            modified_files,
            validation_item_keys,
            availability: availability.to_string(),
        }
    }

    fn modified_files_for_item(&self, item: &HistoryItemDto) -> Vec<String> {
        if let Some(detail_ref) = &item.detail_ref {
            if let Some(detail) = self
                .details
                .iter()
                .find(|detail| &detail.detail_ref == detail_ref)
            {
                if let Some(result) = &detail.result {
                    if let Some(object) = result.as_object() {
                        return object.keys().cloned().collect();
                    }
                }
            }
        }
        item.tool
            .as_ref()
            .and_then(|tool| tool.arguments.as_ref())
            .and_then(|arguments| arguments.get("changes"))
            .and_then(Value::as_object)
            .map(|changes| changes.keys().cloned().collect())
            .unwrap_or_default()
    }

    fn add_task_outcome_item(&mut self, outcome: &TaskOutcomeDto) {
        let Some(turn_id) = outcome.final_turn_id.clone() else {
            return;
        };
        let source_ref = self
            .projection
            .turns
            .iter()
            .find(|turn| turn.turn_id == turn_id)
            .and_then(|turn| {
                turn.items
                    .iter()
                    .rev()
                    .find(|item| item.kind == "assistant_message")
                    .and_then(|item| item.source_ref.clone())
            });
        self.upsert_item(
            turn_id.clone(),
            HistoryItemDto {
                item_key: "task-outcome".to_string(),
                turn_id,
                kind: "task_outcome".to_string(),
                visible: true,
                content: outcome.conclusion.clone(),
                summary: Some(format!("status={}", outcome.status)),
                availability: Some(outcome.availability.clone()),
                source_ref,
                ..Default::default()
            },
        );
    }

    fn apply_turn_context(
        &mut self,
        context: &codex_protocol::protocol::TurnContextItem,
        ordinal: u64,
    ) {
        let turn_id = self.target_turn(context.turn_id.as_deref(), ordinal);
        self.projection.conversation.cwd = Some(context.cwd.display().to_string());
        self.projection.conversation.model = Some(context.model.clone());
        let snapshot = serde_json::to_value(context).unwrap_or(Value::Null);
        self.upsert_settings_snapshot(
            turn_id,
            snapshot,
            "turn context snapshot",
            "turn_context",
            ordinal,
        );
    }

    fn upsert_settings_snapshot(
        &mut self,
        turn_id: String,
        snapshot: Value,
        summary: &str,
        payload_type: &str,
        ordinal: u64,
    ) {
        let snapshot = compact_settings_snapshot(snapshot);
        let content = compact_json(&snapshot);
        let hash = sha256_hex(content.as_bytes());
        if !self.settings_hashes.insert(hash.clone()) {
            self.drop_kind("duplicate_settings_snapshot");
            return;
        }
        self.upsert_item(
            turn_id.clone(),
            HistoryItemDto {
                item_key: format!("settings:{hash}"),
                turn_id,
                kind: "settings_snapshot".to_string(),
                visible: false,
                content: Some(content),
                summary: Some(summary.to_string()),
                source_ref: Some(self.source_ref(ordinal, payload_type)),
                ..Default::default()
            },
        );
    }

    fn apply_response_item(&mut self, item: &ResponseItem, ordinal: u64) {
        use ResponseItem as R;
        match item {
            R::Message {
                id,
                role,
                content,
                phase,
                ..
            } => {
                // A rollout ResponseItem is model input, not automatically a
                // UI transcript message. In particular, Codex Desktop stores
                // injected app/developer context as `role=user` or
                // `role=developer` messages. Durable user-visible messages
                // come from EventMsg::UserMessage or TurnItem::UserMessage;
                // retaining every input message would pollute history and
                // cross-task memory with AGENTS/app-context text.
                if role == "user" {
                    self.drop_kind("response_user_input_context");
                    return;
                }
                if role != "assistant" {
                    self.drop_kind("response_non_transcript_message");
                    return;
                }
                let text = content_items_to_text(content);
                if text.trim().is_empty() {
                    self.drop_kind("response_message_empty");
                    return;
                }
                let turn_id = self.response_turn_id(item, ordinal);
                let item_key = id
                    .as_ref()
                    .map(|id| format!("message:{id}"))
                    .unwrap_or_else(|| format!("response:assistant:{ordinal}"));
                self.upsert_item(
                    turn_id.clone(),
                    HistoryItemDto {
                        item_key,
                        turn_id,
                        kind: "assistant_message".to_string(),
                        visible: true,
                        content: Some(text),
                        summary: phase.as_ref().map(|phase| format!("phase={phase:?}")),
                        source_ref: Some(self.source_ref(ordinal, "response_item")),
                        ..Default::default()
                    },
                );
            }
            R::AgentMessage { id, content, .. } => {
                let Some(text) = models::plaintext_agent_message_content(content) else {
                    self.stats.hidden_reasoning_dropped += 1;
                    self.drop_kind("encrypted_agent_message");
                    return;
                };
                let turn_id = self.response_turn_id(item, ordinal);
                self.upsert_item(
                    turn_id.clone(),
                    HistoryItemDto {
                        item_key: id
                            .as_ref()
                            .map(|id| format!("message:{id}"))
                            .unwrap_or_else(|| format!("response:assistant:{ordinal}")),
                        turn_id,
                        kind: "assistant_message".to_string(),
                        visible: true,
                        content: Some(text),
                        source_ref: Some(self.source_ref(ordinal, "response_item")),
                        ..Default::default()
                    },
                );
            }
            R::Reasoning { .. } => {
                self.stats.hidden_reasoning_dropped += 1;
                self.drop_kind("response_reasoning");
            }
            R::FunctionCall {
                name,
                namespace,
                arguments,
                call_id,
                ..
            } => {
                let name = qualified_name(namespace.as_deref(), name);
                let arguments = serde_json::from_str(arguments)
                    .unwrap_or_else(|_| Value::String(arguments.clone()));
                let turn_id = self.response_turn_id(item, ordinal);
                self.upsert_tool(
                    turn_id,
                    call_id,
                    "function_call",
                    Some(name),
                    None,
                    Some(arguments),
                    None,
                    None,
                    None,
                    ordinal,
                );
            }
            R::LocalShellCall {
                id,
                call_id,
                status,
                action,
                ..
            } => {
                let (command, cwd) = match action {
                    models::LocalShellAction::Exec(exec) => {
                        (Some(exec.command.clone()), exec.working_directory.clone())
                    }
                };
                let call_id = call_id
                    .clone()
                    .or_else(|| id.as_ref().map(ToString::to_string))
                    .unwrap_or_else(|| format!("local-shell:{ordinal}"));
                let turn_id = self.response_turn_id(item, ordinal);
                self.upsert_tool(
                    turn_id,
                    &call_id,
                    "local_shell",
                    Some(
                        command
                            .clone()
                            .map(|value| value.join(" "))
                            .unwrap_or_else(|| "shell".to_string()),
                    ),
                    command,
                    None,
                    cwd,
                    Some(format!("{status:?}").to_lowercase()),
                    None,
                    ordinal,
                );
            }
            R::FunctionCallOutput {
                call_id, output, ..
            } => {
                let output_text = output.body.to_text().unwrap_or_default();
                if self.apply_plan_answer(call_id, &output_text) {
                    return;
                }
                self.complete_tool(
                    call_id,
                    None,
                    "function_call",
                    None,
                    DetailInput {
                        aggregated_output: Some(output_text),
                        result: serde_json::to_value(output).ok(),
                        ..Default::default()
                    },
                    Some("completed".to_string()),
                    None,
                    ordinal,
                );
            }
            R::CustomToolCall {
                call_id,
                name,
                namespace,
                input,
                status,
                ..
            } => {
                let normalized = normalize_custom_tool_invocation(name, input);
                let turn_id = self.response_turn_id(item, ordinal);
                if name == "exec"
                    && normalized.tool_name.is_none()
                    && normalized.commands.is_none()
                    && normalized.arguments.is_none()
                {
                    // This is an outer host `exec` wrapper with no recoverable
                    // nested tool invocation, not a durable tool operation.
                    self.pending_tools.insert(
                        call_id.clone(),
                        PendingTool {
                            turn_id,
                            item_key: format!("tool:{call_id}"),
                            detail_ref: None,
                            hidden: true,
                            wait_cell_id: None,
                        },
                    );
                    self.drop_kind("exec_wrapper");
                    return;
                }
                let normalized_commands = normalized.commands.clone();
                let tool_name = normalized
                    .tool_name
                    .clone()
                    .or_else(|| Some(qualified_name(namespace.as_deref(), name)));
                self.upsert_tool(
                    turn_id,
                    call_id,
                    "custom_tool",
                    tool_name,
                    normalized.command,
                    normalized.arguments,
                    None,
                    status.clone(),
                    None,
                    ordinal,
                );
                if let Some(commands) = normalized_commands {
                    self.set_tool_commands(call_id, commands);
                }
            }
            R::CustomToolCallOutput {
                call_id,
                name,
                output,
                ..
            } => self.complete_tool(
                call_id,
                None,
                "custom_tool",
                name.clone(),
                DetailInput {
                    aggregated_output: output.body.to_text(),
                    result: serde_json::to_value(output).ok(),
                    ..Default::default()
                },
                Some("completed".to_string()),
                None,
                ordinal,
            ),
            R::WebSearchCall {
                id, status, action, ..
            } => {
                let query = action.as_ref().and_then(web_search_action_text);
                let call_id = id
                    .as_ref()
                    .map(ToString::to_string)
                    .unwrap_or_else(|| format!("web-search:{ordinal}"));
                let turn_id = self.response_turn_id(item, ordinal);
                self.upsert_tool(
                    turn_id,
                    &call_id,
                    "web_search",
                    query,
                    None,
                    None,
                    None,
                    status.clone(),
                    None,
                    ordinal,
                );
            }
            R::ImageGenerationCall {
                id,
                status,
                revised_prompt,
                result,
                ..
            } => {
                let call_id = id
                    .as_ref()
                    .map(ToString::to_string)
                    .unwrap_or_else(|| format!("image-generation:{ordinal}"));
                let turn_id = self.response_turn_id(item, ordinal);
                self.upsert_tool(
                    turn_id,
                    &call_id,
                    "image_generation",
                    revised_prompt.clone(),
                    None,
                    None,
                    None,
                    Some(status.clone()),
                    None,
                    ordinal,
                );
                self.complete_tool(
                    &call_id,
                    None,
                    "image_generation",
                    None,
                    DetailInput {
                        result: Some(json!({"result": result, "revised_prompt": revised_prompt})),
                        ..Default::default()
                    },
                    Some(status.clone()),
                    None,
                    ordinal,
                );
            }
            R::Compaction { .. } | R::ContextCompaction { .. } | R::CompactionTrigger { .. } => {
                self.stats.compactions_seen += 1;
                self.drop_kind("response_compaction");
            }
            R::AdditionalTools { .. }
            | R::ToolSearchCall { .. }
            | R::ToolSearchOutput { .. }
            | R::Other => self.drop_kind("response_internal_tool"),
        }
    }

    fn apply_event(&mut self, event: &EventMsg, ordinal: u64) {
        match event {
            EventMsg::TurnStarted(payload) => {
                let turn_id = self.target_turn(Some(&payload.turn_id), ordinal);
                let turn = self.ensure_turn(&turn_id);
                turn.started_at = payload.started_at;
                turn.context_window = payload.model_context_window;
                turn.status = "in_progress".to_string();
                turn.availability = None;
            }
            EventMsg::TurnComplete(payload) => self.complete_turn(payload, ordinal),
            EventMsg::TurnAborted(payload) => {
                let turn_id = self.target_turn(payload.turn_id.as_deref(), ordinal);
                if let Some(turn) = self.find_turn_mut(&turn_id) {
                    turn.status = "interrupted".to_string();
                    turn.outcome = Some("interrupted".to_string());
                    turn.completed_at = payload.completed_at;
                    turn.duration_ms = payload.duration_ms;
                    turn.error = Some(format!("aborted: {:?}", payload.reason));
                }
                self.drop_kind("turn_aborted_marker");
            }
            EventMsg::TokenCount(payload) => {
                let turn_id = self.target_turn(None, ordinal);
                if let Some(info) = &payload.info {
                    let turn = self.ensure_turn(&turn_id);
                    // `total_token_usage` is session-cumulative. A persisted
                    // turn must use the last usage snapshot for that turn;
                    // otherwise every later turn repeats the entire session
                    // total.
                    turn.usage = Some(usage_from_token_usage(&info.last_token_usage));
                    turn.context_window = info.model_context_window.or(turn.context_window);
                }
                if let Some(rate_limits) = &payload.rate_limits {
                    self.ensure_turn(&turn_id).rate_limit = serde_json::to_value(rate_limits).ok();
                }
            }
            EventMsg::RawResponseCompleted(payload) => {
                if let Some(usage) = &payload.token_usage {
                    let turn_id = self.target_turn(None, ordinal);
                    self.ensure_turn(&turn_id).usage = Some(usage_from_token_usage(usage));
                }
            }
            EventMsg::UserMessage(payload) => {
                let turn_id = self.target_turn(None, ordinal);
                let item_key = payload
                    .client_id
                    .as_deref()
                    .filter(|id| !id.is_empty())
                    .map(|id| format!("message:{id}"))
                    .unwrap_or_else(|| format!("event:user:{ordinal}"));
                self.upsert_item(
                    turn_id.clone(),
                    HistoryItemDto {
                        item_key,
                        turn_id,
                        kind: "user_message".to_string(),
                        visible: true,
                        content: Some(payload.message.clone()),
                        source_ref: Some(self.source_ref(ordinal, "user_message")),
                        ..Default::default()
                    },
                );
            }
            EventMsg::AgentMessage(payload) => {
                if payload.message.trim().is_empty() {
                    self.drop_kind("agent_message_empty");
                } else {
                    let turn_id = self.target_turn(None, ordinal);
                    self.upsert_item(
                        turn_id.clone(),
                        HistoryItemDto {
                            item_key: format!("event:assistant:{ordinal}"),
                            turn_id,
                            kind: "assistant_message".to_string(),
                            visible: true,
                            content: Some(payload.message.clone()),
                            summary: payload
                                .phase
                                .as_ref()
                                .map(|phase| format!("phase={phase:?}")),
                            source_ref: Some(self.source_ref(ordinal, "agent_message")),
                            ..Default::default()
                        },
                    );
                }
            }
            EventMsg::AgentReasoning(_)
            | EventMsg::AgentReasoningRawContent(_)
            | EventMsg::AgentReasoningSectionBreak(_) => {
                self.stats.hidden_reasoning_dropped += 1;
                self.drop_kind("reasoning");
            }
            EventMsg::AgentMessageContentDelta(_)
            | EventMsg::PlanDelta(_)
            | EventMsg::ReasoningContentDelta(_)
            | EventMsg::ReasoningRawContentDelta(_)
            | EventMsg::ExecCommandOutputDelta(_)
            | EventMsg::TerminalInteraction(_) => {
                self.stats.delta_dropped += 1;
                self.drop_kind("streaming_or_terminal_delta");
            }
            EventMsg::ExecCommandBegin(payload) => {
                self.upsert_tool(
                    payload.turn_id.clone(),
                    &payload.call_id,
                    "command",
                    Some(payload.command.join(" ")),
                    Some(payload.command.clone()),
                    None,
                    Some(payload.cwd.to_string()),
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::ExecCommandEnd(payload) => {
                let status = format!("{:?}", payload.status).to_lowercase();
                self.complete_tool(
                    &payload.call_id,
                    Some(payload.turn_id.clone()),
                    "command",
                    Some(payload.command.join(" ")),
                    DetailInput {
                        stdout: Some(payload.stdout.clone()),
                        stderr: Some(payload.stderr.clone()),
                        aggregated_output: Some(payload.aggregated_output.clone()),
                        formatted_output: Some(payload.formatted_output.clone()),
                        ..Default::default()
                    },
                    Some(status),
                    Some(payload.exit_code),
                    ordinal,
                );
                self.update_tool(&payload.call_id, |tool| {
                    tool.duration_ms = Some(payload.duration.as_millis() as i64)
                });
            }
            EventMsg::McpToolCallBegin(payload) => {
                let turn_id = self.current_or_synthetic_turn(ordinal);
                self.upsert_tool(
                    turn_id,
                    &payload.call_id,
                    "mcp_tool_call",
                    Some(format!(
                        "{}.{}",
                        payload.invocation.server, payload.invocation.tool
                    )),
                    None,
                    payload.invocation.arguments.clone(),
                    None,
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::McpToolCallEnd(payload) => {
                let success = payload.is_success();
                self.complete_tool(
                    &payload.call_id,
                    None,
                    "mcp_tool_call",
                    Some(format!(
                        "{}.{}",
                        payload.invocation.server, payload.invocation.tool
                    )),
                    DetailInput {
                        result: serde_json::to_value(&payload.result).ok(),
                        ..Default::default()
                    },
                    Some(if success { "completed" } else { "failed" }.to_string()),
                    None,
                    ordinal,
                );
                self.update_tool(&payload.call_id, |tool| {
                    tool.duration_ms = Some(payload.duration.as_millis() as i64)
                });
            }
            EventMsg::DynamicToolCallRequest(payload) => {
                self.upsert_tool(
                    payload.turn_id.clone(),
                    &payload.call_id,
                    "dynamic_tool",
                    Some(qualified_name(payload.namespace.as_deref(), &payload.tool)),
                    None,
                    Some(payload.arguments.clone()),
                    None,
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::DynamicToolCallResponse(payload) => {
                self.complete_tool(
                    &payload.call_id,
                    Some(payload.turn_id.clone()),
                    "dynamic_tool",
                    Some(qualified_name(payload.namespace.as_deref(), &payload.tool)),
                    DetailInput {
                        result: Some(json!({
                            "content_items": payload.content_items,
                            "error": payload.error,
                            "success": payload.success,
                        })),
                        ..Default::default()
                    },
                    Some(
                        if payload.success {
                            "completed"
                        } else {
                            "failed"
                        }
                        .to_string(),
                    ),
                    None,
                    ordinal,
                );
                self.update_tool(&payload.call_id, |tool| {
                    tool.duration_ms = Some(payload.duration.as_millis() as i64)
                });
            }
            EventMsg::PatchApplyBegin(payload) => {
                self.upsert_tool(
                    payload.turn_id.clone(),
                    &payload.call_id,
                    "file_change",
                    Some("apply_patch".to_string()),
                    None,
                    Some(serde_json::to_value(&payload.changes).unwrap_or(Value::Null)),
                    None,
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::PatchApplyUpdated(_) => self.drop_kind("patch_apply_updated"),
            EventMsg::PatchApplyEnd(payload) => {
                let status = format!("{:?}", payload.status).to_lowercase();
                self.complete_tool(
                    &payload.call_id,
                    Some(payload.turn_id.clone()),
                    "file_change",
                    Some("apply_patch".to_string()),
                    DetailInput {
                        stdout: Some(payload.stdout.clone()),
                        stderr: Some(payload.stderr.clone()),
                        result: Some(serde_json::to_value(&payload.changes).unwrap_or(Value::Null)),
                        ..Default::default()
                    },
                    Some(status),
                    None,
                    ordinal,
                );
            }
            EventMsg::WebSearchBegin(payload) => {
                let turn_id = self.current_or_synthetic_turn(ordinal);
                self.upsert_tool(
                    turn_id,
                    &payload.call_id,
                    "web_search",
                    Some("web_search".to_string()),
                    None,
                    None,
                    None,
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::WebSearchEnd(payload) => {
                self.complete_tool(
                    &payload.call_id,
                    None,
                    "web_search",
                    Some(payload.query.clone()),
                    DetailInput {
                        result: Some(json!({
                            "query": payload.query,
                            "action": payload.action,
                            "results": payload.results,
                        })),
                        ..Default::default()
                    },
                    Some("completed".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::RequestUserInput(payload) => self.apply_user_questions(payload, ordinal),
            EventMsg::ElicitationRequest(payload) => {
                let turn_id = self.target_turn(payload.turn_id.as_deref(), ordinal);
                let value = serde_json::to_value(payload).unwrap_or(Value::Null);
                self.upsert_item(
                    turn_id.clone(),
                    HistoryItemDto {
                        item_key: format!("question:elicitation:{ordinal}"),
                        turn_id,
                        kind: "plan_question".to_string(),
                        visible: true,
                        content: Some(compact_json(&value)),
                        summary: Some("elicitation request".to_string()),
                        source_ref: Some(self.source_ref(ordinal, "elicitation_request")),
                        ..Default::default()
                    },
                );
                self.stats.plan_questions_seen += 1;
            }
            EventMsg::PlanUpdate(payload) => {
                let value = serde_json::to_value(payload).unwrap_or(Value::Null);
                let text = value
                    .get("plan")
                    .and_then(Value::as_array)
                    .map(|items| {
                        items
                            .iter()
                            .map(|item| {
                                let step = item.get("step").and_then(Value::as_str).unwrap_or("");
                                let status =
                                    item.get("status").and_then(Value::as_str).unwrap_or("");
                                if status.is_empty() {
                                    step.to_string()
                                } else {
                                    format!("{step} [{status}]")
                                }
                            })
                            .collect::<Vec<_>>()
                            .join("\n")
                    })
                    .unwrap_or_default();
                if text.trim().is_empty() {
                    self.drop_kind("plan_update_empty");
                } else {
                    let turn_id = self.current_or_synthetic_turn(ordinal);
                    self.upsert_item(
                        turn_id.clone(),
                        HistoryItemDto {
                            item_key: "plan:final".to_string(),
                            turn_id,
                            kind: "plan".to_string(),
                            visible: true,
                            content: Some(text),
                            summary: Some("plan final snapshot".to_string()),
                            source_ref: Some(self.source_ref(ordinal, "plan_update")),
                            ..Default::default()
                        },
                    );
                }
            }
            EventMsg::ThreadSettingsApplied(payload) => {
                self.projection.conversation.model = Some(payload.thread_settings.model.clone());
                self.projection.conversation.model_provider =
                    Some(payload.thread_settings.model_provider_id.clone());
                let turn_id = self.current_or_synthetic_turn(ordinal);
                let value = serde_json::to_value(&payload.thread_settings).unwrap_or(Value::Null);
                self.upsert_settings_snapshot(
                    turn_id,
                    value,
                    "thread settings snapshot",
                    "thread_settings_applied",
                    ordinal,
                );
            }
            EventMsg::ItemStarted(payload) => {
                self.apply_turn_item(&payload.turn_id, &payload.item, ordinal)
            }
            EventMsg::ItemCompleted(payload) => {
                self.apply_turn_item(&payload.turn_id, &payload.item, ordinal)
            }
            EventMsg::Error(payload) => {
                let turn_id = self.current_or_synthetic_turn(ordinal);
                if payload.affects_turn_status() {
                    let turn = self.ensure_turn(&turn_id);
                    turn.status = "failed".to_string();
                    turn.outcome = Some("failed".to_string());
                    turn.error = Some(payload.message.clone());
                }
            }
            EventMsg::ThreadRolledBack(payload) => {
                self.stats.rollbacks_seen += 1;
                self.drop_kind("thread_rolled_back_marker");
                let count = payload.num_turns as usize;
                let len = self.projection.turns.len();
                for turn in self.projection.turns.iter_mut().rev().take(count) {
                    turn.status = "rolled_back".to_string();
                    turn.outcome = Some("rolled_back".to_string());
                    turn.availability = Some("rolled_back_by_source".to_string());
                }
                if len == 0 {
                    self.drop_kind("rollback_without_turn");
                }
            }
            EventMsg::ContextCompacted(_) => {
                self.stats.compactions_seen += 1;
                self.drop_kind("context_compacted");
            }
            EventMsg::ShutdownComplete
            | EventMsg::Warning(_)
            | EventMsg::GuardianWarning(_)
            | EventMsg::SessionConfigured(_)
            | EventMsg::EnvironmentConnected(_)
            | EventMsg::EnvironmentDisconnected(_)
            | EventMsg::ThreadGoalUpdated(_)
            | EventMsg::McpStartupUpdate(_)
            | EventMsg::McpStartupComplete(_)
            | EventMsg::ImageGenerationBegin(_)
            | EventMsg::ImageGenerationEnd(_)
            | EventMsg::ViewImageToolCall(_)
            | EventMsg::ModelReroute(_)
            | EventMsg::ModelVerification(_)
            | EventMsg::TurnModerationMetadata(_)
            | EventMsg::SafetyBuffering(_)
            | EventMsg::StreamError(_)
            | EventMsg::DeprecationNotice(_)
            | EventMsg::TurnDiff(_)
            | EventMsg::EnteredReviewMode(_)
            | EventMsg::ExitedReviewMode(_)
            | EventMsg::HookStarted(_)
            | EventMsg::HookCompleted(_)
            | EventMsg::RawResponseItem(_)
            | EventMsg::CollabAgentSpawnBegin(_)
            | EventMsg::CollabAgentSpawnEnd(_)
            | EventMsg::CollabAgentInteractionBegin(_)
            | EventMsg::CollabAgentInteractionEnd(_)
            | EventMsg::CollabWaitingBegin(_)
            | EventMsg::CollabWaitingEnd(_)
            | EventMsg::CollabCloseBegin(_)
            | EventMsg::CollabCloseEnd(_)
            | EventMsg::CollabResumeBegin(_)
            | EventMsg::CollabResumeEnd(_)
            | EventMsg::SubAgentActivity(_)
            | EventMsg::RealtimeConversationStarted(_)
            | EventMsg::RealtimeConversationRealtime(_)
            | EventMsg::RealtimeConversationClosed(_)
            | EventMsg::RealtimeConversationSdp(_)
            | EventMsg::RealtimeConversationListVoicesResponse(_)
            | EventMsg::ApplyPatchApprovalRequest(_)
            | EventMsg::ExecApprovalRequest(_)
            | EventMsg::RequestPermissions(_)
            | EventMsg::GuardianAssessment(_) => self.apply_generic_or_approval_event(event),
        }
    }

    fn apply_generic_or_approval_event(&mut self, event: &EventMsg) {
        let kind = event_type(event);
        match event {
            EventMsg::ApplyPatchApprovalRequest(_)
            | EventMsg::ExecApprovalRequest(_)
            | EventMsg::RequestPermissions(_)
            | EventMsg::GuardianAssessment(_) => {
                // Approval is a control-plane event, not a durable history
                // item. The execution result and turn outcome are the facts
                // that remain useful to later tasks.
                self.stats.approvals_seen += 1;
                self.drop_kind("approval_request");
            }
            _ => self.drop_kind(&kind),
        }
    }

    fn apply_turn_item(
        &mut self,
        turn_id: &str,
        item: &codex_protocol::items::TurnItem,
        ordinal: u64,
    ) {
        let value = serde_json::to_value(item).unwrap_or(Value::Null);
        let raw_kind = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or("unknown");
        let kind = normalize_turn_item_kind(raw_kind);
        match kind {
            "user_message" => {
                let content = collect_text(&value.get("content").cloned().unwrap_or(Value::Null));
                if content.trim().is_empty() {
                    self.drop_kind("item_user_message_empty");
                    return;
                }
                let id = value
                    .get("client_id")
                    .and_then(Value::as_str)
                    .or_else(|| value.get("id").and_then(Value::as_str));
                self.upsert_item(
                    turn_id.to_string(),
                    HistoryItemDto {
                        item_key: id
                            .map(|id| format!("message:{id}"))
                            .unwrap_or_else(|| format!("item:user:{ordinal}")),
                        turn_id: turn_id.to_string(),
                        kind: "user_message".to_string(),
                        visible: true,
                        content: Some(content),
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
            }
            "agent_message" => {
                let content = collect_text(&value.get("content").cloned().unwrap_or(Value::Null));
                if content.trim().is_empty() {
                    self.drop_kind("item_agent_message_empty");
                    return;
                }
                self.upsert_item(
                    turn_id.to_string(),
                    HistoryItemDto {
                        item_key: value
                            .get("id")
                            .and_then(Value::as_str)
                            .map(|id| format!("message:{id}"))
                            .unwrap_or_else(|| format!("item:assistant:{ordinal}")),
                        turn_id: turn_id.to_string(),
                        kind: "assistant_message".to_string(),
                        visible: true,
                        content: Some(content),
                        summary: value.get("phase").map(compact_json),
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
            }
            "plan" => {
                let text = value.get("text").and_then(Value::as_str).unwrap_or("");
                if text.trim().is_empty() {
                    self.drop_kind("item_plan_empty");
                    return;
                }
                self.upsert_item(
                    turn_id.to_string(),
                    HistoryItemDto {
                        item_key: value
                            .get("id")
                            .and_then(Value::as_str)
                            .map(|id| format!("plan:{id}"))
                            .unwrap_or_else(|| "plan:final".to_string()),
                        turn_id: turn_id.to_string(),
                        kind: "plan".to_string(),
                        visible: true,
                        content: Some(text.to_string()),
                        summary: Some("plan".to_string()),
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
            }
            "reasoning" | "context_compaction" => {
                self.stats.hidden_reasoning_dropped += u64::from(kind == "reasoning");
                self.stats.compactions_seen += u64::from(kind == "context_compaction");
                self.drop_kind(kind);
            }
            "command_execution" | "dynamic_tool_call" | "mcp_tool_call" | "file_change"
            | "web_search" | "image_generation" => {
                self.apply_materialized_tool(turn_id, kind, &value, ordinal)
            }
            "image_view" | "extension" => {
                let id = value
                    .get("id")
                    .and_then(Value::as_str)
                    .map(|id| format!("tool:{id}"))
                    .unwrap_or_else(|| format!("tool:{kind}:{ordinal}"));
                self.upsert_item(
                    turn_id.to_string(),
                    HistoryItemDto {
                        item_key: id,
                        turn_id: turn_id.to_string(),
                        kind: format!("{kind}_tool"),
                        visible: false,
                        content: Some(compact_json(&value)),
                        summary: Some(kind.to_string()),
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
            }
            "collab_agent_tool_call" | "sub_agent_activity" => {
                self.upsert_item(
                    turn_id.to_string(),
                    HistoryItemDto {
                        item_key: value
                            .get("id")
                            .and_then(Value::as_str)
                            .map(|id| format!("tool:{id}"))
                            .unwrap_or_else(|| format!("collab:{ordinal}")),
                        turn_id: turn_id.to_string(),
                        kind: kind.to_string(),
                        visible: false,
                        content: Some(compact_json(&value)),
                        summary: Some(kind.to_string()),
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
            }
            _ => self.drop_kind(&format!("item_{kind}")),
        }
    }

    fn apply_materialized_tool(&mut self, turn_id: &str, kind: &str, value: &Value, ordinal: u64) {
        let fallback_id = format!("anonymous:{ordinal}");
        let id = value
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or(&fallback_id);
        let tool_kind = match kind {
            "command_execution" => "command",
            "dynamic_tool_call" => "dynamic_tool",
            "mcp_tool_call" => "mcp_tool_call",
            "file_change" => "file_change",
            _ => kind,
        };
        let name = value
            .get("tool")
            .or_else(|| value.get("server"))
            .and_then(Value::as_str)
            .map(str::to_string)
            .or_else(|| (kind == "file_change").then(|| "apply_patch".to_string()));
        let command = value.get("command").and_then(Value::as_array).map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        });
        let arguments = value
            .get("arguments")
            .cloned()
            .or_else(|| value.get("changes").cloned());
        let cwd = value.get("cwd").map(value_to_string);
        let status = value.get("status").map(value_to_string);
        let exit_code = value
            .get("exit_code")
            .and_then(Value::as_i64)
            .map(|value| value as i32);
        let duration_ms = value.get("duration").and_then(duration_ms_from_value);
        self.upsert_tool(
            turn_id.to_string(),
            id,
            tool_kind,
            name,
            command,
            arguments,
            cwd,
            status,
            None,
            ordinal,
        );
        if let Some(commands) = value.get("commands").and_then(value_to_string_vec) {
            self.set_tool_commands(id, commands);
        }

        let detail = DetailInput {
            stdout: value
                .get("stdout")
                .and_then(Value::as_str)
                .map(str::to_string),
            stderr: value
                .get("stderr")
                .and_then(Value::as_str)
                .map(str::to_string),
            aggregated_output: value
                .get("aggregated_output")
                .and_then(Value::as_str)
                .map(str::to_string),
            formatted_output: value
                .get("formatted_output")
                .and_then(Value::as_str)
                .map(str::to_string),
            result: value
                .get("result")
                .cloned()
                .or_else(|| value.get("content_items").cloned()),
            ..Default::default()
        };
        if detail.has_payload() {
            self.complete_tool(
                id,
                Some(turn_id.to_string()),
                tool_kind,
                None,
                detail,
                None,
                exit_code,
                ordinal,
            );
            if let Some(duration_ms) = duration_ms {
                self.update_tool(id, |tool| tool.duration_ms = Some(duration_ms));
            }
        }
    }

    fn apply_user_questions(
        &mut self,
        payload: &codex_protocol::request_user_input::RequestUserInputEvent,
        ordinal: u64,
    ) {
        let turn_id = self.target_turn(Some(&payload.turn_id), ordinal);
        let mut item_keys = Vec::new();
        for question in &payload.questions {
            let key = format!("question:{}:{}", payload.call_id, question.id);
            let question_dto = PlanQuestionDto {
                id: question.id.clone(),
                header: question.header.clone(),
                question: question.question.clone(),
                is_other: question.is_other,
                is_secret: question.is_secret,
                options: question
                    .options
                    .clone()
                    .unwrap_or_default()
                    .into_iter()
                    .map(|option| PlanQuestionOptionDto {
                        label: option.label,
                        description: option.description,
                    })
                    .collect(),
            };
            self.upsert_item(
                turn_id.clone(),
                HistoryItemDto {
                    item_key: key.clone(),
                    turn_id: turn_id.clone(),
                    kind: "plan_question".to_string(),
                    visible: true,
                    content: Some(question.question.clone()),
                    summary: Some(question.header.clone()),
                    question: Some(question_dto),
                    source_ref: Some(self.source_ref(ordinal, "request_user_input")),
                    ..Default::default()
                },
            );
            item_keys.push(key);
        }
        if !item_keys.is_empty() {
            self.pending_questions.insert(
                payload.call_id.clone(),
                PendingQuestion { turn_id, item_keys },
            );
            self.stats.plan_questions_seen += payload.questions.len() as u64;
        }
    }

    fn apply_plan_answer(&mut self, call_id: &str, text: &str) -> bool {
        let Some(pending) = self.pending_questions.get(call_id).cloned() else {
            return false;
        };
        let parsed = serde_json::from_str::<Value>(text).ok();
        let answer_map = parsed
            .as_ref()
            .and_then(|value| value.get("answers"))
            .and_then(Value::as_object);
        let mut answered = false;
        for item_key in &pending.item_keys {
            if let Some(item) = self.find_item_mut(&pending.turn_id, item_key) {
                let question_id = item
                    .question
                    .as_ref()
                    .map(|question| question.id.clone())
                    .unwrap_or_default();
                let answers = answer_map
                    .and_then(|map| map.get(&question_id))
                    .and_then(|value| value.get("answers"))
                    .and_then(Value::as_array)
                    .map(|answers| {
                        answers
                            .iter()
                            .filter_map(Value::as_str)
                            .map(str::to_string)
                            .collect()
                    })
                    .or_else(|| (!text.trim().is_empty()).then(|| vec![text.to_string()]));
                if let Some(answers) = answers {
                    item.answer = Some(PlanAnswerDto { answers });
                    recompute_hash(item);
                    answered = true;
                }
            }
        }
        self.pending_questions.remove(call_id);
        self.stats.plan_answers_seen += u64::from(answered);
        answered
    }

    fn complete_turn(
        &mut self,
        payload: &codex_protocol::protocol::TurnCompleteEvent,
        ordinal: u64,
    ) {
        let turn_id = self.target_turn(Some(&payload.turn_id), ordinal);
        let turn = self.ensure_turn(&turn_id);
        turn.started_at = payload.started_at.or(turn.started_at);
        turn.completed_at = payload.completed_at;
        turn.duration_ms = payload.duration_ms;
        turn.time_to_first_token_ms = payload.time_to_first_token_ms;
        if let Some(error) = &payload.error {
            turn.status = "failed".to_string();
            turn.outcome = Some("failed".to_string());
            turn.error = Some(error.message.clone());
        } else {
            turn.status = "completed".to_string();
            turn.outcome = Some("completed".to_string());
            if let Some(message) = &payload.last_agent_message {
                if !message.trim().is_empty() {
                    self.upsert_item(
                        turn_id.clone(),
                        HistoryItemDto {
                            item_key: format!("final:{turn_id}"),
                            turn_id,
                            kind: "assistant_message".to_string(),
                            visible: true,
                            content: Some(message.clone()),
                            summary: Some("turn final message".to_string()),
                            source_ref: Some(self.source_ref(ordinal, "turn_complete")),
                            ..Default::default()
                        },
                    );
                }
            }
        }
    }

    fn upsert_tool(
        &mut self,
        turn_id: String,
        call_id: &str,
        tool_kind: &str,
        tool_name: Option<String>,
        command: Option<Vec<String>>,
        arguments: Option<Value>,
        cwd: Option<String>,
        status: Option<String>,
        approval: Option<Value>,
        ordinal: u64,
    ) {
        let call_id = if call_id.is_empty() {
            format!("anonymous:{ordinal}")
        } else {
            call_id.to_string()
        };
        let item_key = format!("tool:{call_id}");
        let was_pending = self.pending_tools.contains_key(&call_id);
        let hidden = self
            .pending_tools
            .get(&call_id)
            .is_some_and(|pending| pending.hidden)
            || tool_name.as_deref() == Some("wait");
        let wait_cell_id = arguments
            .as_ref()
            .and_then(|arguments| arguments.get("cell_id"))
            .and_then(Value::as_str)
            .map(str::to_string);
        if hidden {
            if !was_pending {
                self.drop_kind("wait");
            }
        } else {
            self.upsert_item(
                turn_id.clone(),
                HistoryItemDto {
                    item_key: item_key.clone(),
                    turn_id: turn_id.clone(),
                    kind: tool_kind.to_string(),
                    visible: false,
                    content: tool_name.clone(),
                    summary: tool_name.clone(),
                    source_ref: Some(self.source_ref(ordinal, tool_kind)),
                    tool: Some(ToolItemDto {
                        tool_kind: tool_kind.to_string(),
                        tool_name,
                        command,
                        commands: None,
                        arguments,
                        cwd,
                        status,
                        exit_code: None,
                        duration_ms: None,
                        approval,
                        output_bytes: None,
                        output_sha256: None,
                    }),
                    ..Default::default()
                },
            );
        }
        self.pending_tools
            .entry(call_id)
            .and_modify(|pending| {
                pending.turn_id = turn_id.clone();
                pending.item_key = item_key.clone();
                pending.hidden |= hidden;
                if wait_cell_id.is_some() {
                    pending.wait_cell_id = wait_cell_id.clone();
                }
            })
            .or_insert(PendingTool {
                turn_id,
                item_key,
                detail_ref: None,
                hidden,
                wait_cell_id,
            });
    }

    fn complete_tool(
        &mut self,
        call_id: &str,
        explicit_turn_id: Option<String>,
        tool_kind: &str,
        tool_name: Option<String>,
        detail: DetailInput,
        status: Option<String>,
        exit_code: Option<i32>,
        ordinal: u64,
    ) {
        let existing = self.pending_tools.get(call_id).cloned();
        let turn_id = existing
            .as_ref()
            .map(|pending| pending.turn_id.clone())
            .or(explicit_turn_id)
            .unwrap_or_else(|| self.current_or_synthetic_turn(ordinal));
        self.upsert_tool(
            turn_id.clone(),
            call_id,
            tool_kind,
            tool_name,
            None,
            None,
            None,
            status,
            None,
            ordinal,
        );
        if let Some(exit_code) = exit_code {
            self.update_tool(call_id, |tool| tool.exit_code = Some(exit_code));
        }
        if detail.has_payload() {
            self.retain_tool_detail(call_id, tool_kind, detail);
        }
    }

    fn retain_tool_detail(&mut self, call_id: &str, tool_kind: &str, input: DetailInput) {
        let result_was_deduplicated = input.result.is_some();
        let detail = build_detail_payload(
            self.next_detail_ref(call_id),
            tool_kind,
            input,
            self.partial_rollout,
            self.unsupported_schema,
        );
        if result_was_deduplicated && detail.result.is_none() {
            self.stats.result_fields_deduplicated += 1;
        }
        let output_bytes = detail_output_bytes(&detail);
        let output_hash = detail_output_hash(&detail);

        if let Some(cell_id) = async_cell_id(&detail) {
            self.running_cells
                .insert(cell_id.clone(), call_id.to_string());
            self.clear_tool_detail(call_id);
            self.set_tool_output_metadata(call_id, output_bytes, output_hash);
            self.append_tool_summary(
                call_id,
                format!("async exec cell {cell_id}; waiting for final result"),
            );
            self.stats.detail_dropped_by_policy += 1;
            self.drop_kind("async_exec_placeholder_detail");
            return;
        }

        if self.is_wait_tool(call_id) {
            let cell_id = self.wait_cell_id(call_id);
            let is_running = is_async_running_output(&detail);
            if let Some(cell_id) = cell_id {
                if !is_running {
                    if let Some(parent_call_id) = self.running_cells.remove(&cell_id) {
                        self.retain_tool_detail(
                            &parent_call_id,
                            "custom_tool",
                            detail_input_from_payload(&detail),
                        );
                        self.append_tool_summary(
                            call_id,
                            format!("wait output merged into exec cell {cell_id}"),
                        );
                    }
                }
            }
            self.clear_tool_detail(call_id);
            self.set_tool_output_metadata(call_id, output_bytes, output_hash);
            if is_running {
                self.append_tool_summary(call_id, "wait poll omitted".to_string());
            } else {
                self.append_tool_summary(
                    call_id,
                    "wait output retained on parent exec".to_string(),
                );
            }
            self.stats.detail_dropped_by_policy += 1;
            self.drop_kind("wait_detail");
            return;
        }

        match self.detail_retention(call_id, tool_kind, &detail) {
            DetailRetention::Full => {
                self.store_detail_payload(call_id, detail);
                self.set_tool_output_metadata(call_id, output_bytes, output_hash);
                self.stats.detail_full_retained += 1;
            }
            DetailRetention::Summary => {
                let summary = summarize_detail(&detail);
                self.clear_tool_detail(call_id);
                self.set_tool_output_metadata(call_id, output_bytes, output_hash);
                self.append_tool_summary(call_id, format!("detail omitted by policy: {summary}"));
                self.stats.detail_summary_only += 1;
                self.stats.detail_dropped_by_policy += 1;
                self.drop_kind("tool_detail_summary_only");
            }
        }
    }

    fn store_detail_payload(&mut self, call_id: &str, detail: DetailPayloadDto) {
        let detail_ref = detail.detail_ref.clone();
        let serialized_bytes = serde_json::to_vec(&detail)
            .map(|bytes| bytes.len() as u64)
            .unwrap_or(0);
        if let Some(index) = self
            .details
            .iter()
            .position(|item| item.detail_ref == detail_ref)
        {
            let previous_bytes = serde_json::to_vec(&self.details[index])
                .map(|bytes| bytes.len() as u64)
                .unwrap_or(0);
            self.details[index] = detail;
            self.stats.detail_bytes = self
                .stats
                .detail_bytes
                .saturating_sub(previous_bytes)
                .saturating_add(serialized_bytes);
        } else {
            self.details.push(detail);
            self.stats.detail_payloads += 1;
            self.stats.detail_bytes = self.stats.detail_bytes.saturating_add(serialized_bytes);
        }
        if let Some(pending) = self.pending_tools.get_mut(call_id) {
            pending.detail_ref = Some(detail_ref.clone());
        }
        if let Some(item) = self.find_tool_item_mut(call_id) {
            item.detail_ref = Some(detail_ref);
            recompute_hash(item);
        }
    }

    fn next_detail_ref(&mut self, call_id: &str) -> String {
        if let Some(existing_ref) = self
            .pending_tools
            .get(call_id)
            .and_then(|pending| pending.detail_ref.clone())
        {
            return existing_ref;
        }
        self.next_detail_sequence += 1;
        format!("detail:{:06}", self.next_detail_sequence)
    }

    fn set_tool_output_metadata(&mut self, call_id: &str, bytes: u64, hash: String) {
        self.update_tool(call_id, |tool| {
            tool.output_bytes = Some(bytes);
            tool.output_sha256 = Some(hash);
        });
    }

    fn clear_tool_detail(&mut self, call_id: &str) {
        let detail_ref = self
            .pending_tools
            .get(call_id)
            .and_then(|pending| pending.detail_ref.clone());
        if let Some(detail_ref) = detail_ref {
            if let Some(index) = self
                .details
                .iter()
                .position(|detail| detail.detail_ref == detail_ref)
            {
                let previous_bytes = serde_json::to_vec(&self.details[index])
                    .map(|bytes| bytes.len() as u64)
                    .unwrap_or(0);
                self.details.remove(index);
                self.stats.detail_payloads = self.stats.detail_payloads.saturating_sub(1);
                self.stats.detail_bytes = self.stats.detail_bytes.saturating_sub(previous_bytes);
            }
            if let Some(pending) = self.pending_tools.get_mut(call_id) {
                pending.detail_ref = None;
            }
            if let Some(item) = self.find_tool_item_mut(call_id) {
                item.detail_ref = None;
                recompute_hash(item);
            }
        }
    }

    fn append_tool_summary(&mut self, call_id: &str, suffix: String) {
        if suffix.trim().is_empty() {
            return;
        }
        if let Some(item) = self.find_tool_item_mut(call_id) {
            let prefix = item.summary.clone().unwrap_or_default();
            item.summary = Some(if prefix.trim().is_empty() {
                suffix
            } else {
                format!("{prefix}\n{suffix}")
            });
            recompute_hash(item);
        }
    }

    fn is_wait_tool(&self, call_id: &str) -> bool {
        self.pending_tools
            .get(call_id)
            .is_some_and(|pending| pending.hidden)
            || self
                .tool_for_call(call_id)
                .and_then(|tool| tool.tool_name.as_deref())
                .is_some_and(|name| name == "wait")
    }

    fn wait_cell_id(&self, call_id: &str) -> Option<String> {
        self.pending_tools
            .get(call_id)
            .and_then(|pending| pending.wait_cell_id.clone())
            .or_else(|| {
                self.tool_for_call(call_id)
                    .and_then(|tool| tool.arguments.as_ref())
                    .and_then(|arguments| arguments.get("cell_id"))
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
    }

    fn detail_retention(
        &self,
        call_id: &str,
        tool_kind: &str,
        detail: &DetailPayloadDto,
    ) -> DetailRetention {
        let Some(tool) = self.tool_for_call(call_id) else {
            return DetailRetention::Full;
        };
        let command = tool_command_text(tool);
        let status = tool
            .status
            .as_deref()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if status.contains("fail")
            || status.contains("error")
            || status.contains("abort")
            || status.contains("declin")
            || tool.exit_code.is_some_and(|code| code != 0)
            || detail_indicates_failure(detail)
        {
            return DetailRetention::Full;
        }
        if tool.tool_kind == "file_change"
            || matches!(
                tool_kind,
                "mcp_tool_call" | "dynamic_tool" | "web_search" | "image_generation"
            )
        {
            return DetailRetention::Full;
        }
        if is_full_value_command(&command) {
            return DetailRetention::Full;
        }
        if is_summary_value_command(&command)
            || matches!(
                tool.tool_name.as_deref(),
                Some("exec") | Some("shell_command") | Some("exec_command")
            )
            || matches!(tool_kind, "command" | "local_shell")
        {
            return DetailRetention::Summary;
        }
        DetailRetention::Full
    }

    fn update_tool(&mut self, call_id: &str, update: impl FnOnce(&mut ToolItemDto)) {
        if let Some(item) = self.find_tool_item_mut(call_id) {
            if let Some(tool) = item.tool.as_mut() {
                update(tool);
            }
            recompute_hash(item);
        }
    }

    fn set_tool_commands(&mut self, call_id: &str, commands: Vec<String>) {
        if commands.is_empty() {
            return;
        }
        if let Some(item) = self.find_tool_item_mut(call_id) {
            if let Some(tool) = item.tool.as_mut() {
                tool.commands = Some(commands);
            }
            recompute_hash(item);
            self.stats.commands_normalized += 1;
        }
    }

    fn upsert_item(&mut self, turn_id: String, mut item: HistoryItemDto) {
        item.turn_id = turn_id.clone();
        if item.timestamp.is_none() {
            item.timestamp = self.current_timestamp.clone();
        }
        if item.item_key.is_empty() {
            item.item_key = format!("item:{}", self.next_turn_sequence);
        }
        if is_duplicate_message(self, &item) {
            self.drop_kind("duplicate_message_wrapper");
            return;
        }
        if let Some(existing) = self.find_item_mut(&turn_id, &item.item_key) {
            merge_item(existing, item);
            recompute_hash(existing);
            return;
        }
        let retained_kind = item.kind.clone();
        *self
            .stats
            .retained_by_kind
            .entry(retained_kind)
            .or_insert(0) += 1;
        let turn = self.ensure_turn(&turn_id);
        item.sequence = turn.items.len() as u64 + 1;
        recompute_hash(&mut item);
        turn.items.push(item);
    }

    fn ensure_turn(&mut self, turn_id: &str) -> &mut TurnDto {
        if let Some(index) = self
            .projection
            .turns
            .iter()
            .position(|turn| turn.turn_id == turn_id)
        {
            return &mut self.projection.turns[index];
        }
        self.next_turn_sequence += 1;
        self.projection.turns.push(TurnDto {
            turn_id: turn_id.to_string(),
            sequence: self.next_turn_sequence,
            started_at: None,
            completed_at: None,
            duration_ms: None,
            time_to_first_token_ms: None,
            context_window: None,
            status: "in_progress".to_string(),
            outcome: None,
            error: None,
            availability: Some("partial_rollout".to_string()),
            usage: None,
            rate_limit: None,
            items: Vec::new(),
        });
        self.projection.turns.last_mut().expect("turn was pushed")
    }

    fn find_turn_mut(&mut self, turn_id: &str) -> Option<&mut TurnDto> {
        self.projection
            .turns
            .iter_mut()
            .find(|turn| turn.turn_id == turn_id)
    }

    fn find_item(&self, turn_id: &str, item_key: &str) -> Option<&HistoryItemDto> {
        self.projection
            .turns
            .iter()
            .find(|turn| turn.turn_id == turn_id)
            .and_then(|turn| turn.items.iter().find(|item| item.item_key == item_key))
    }

    fn find_item_mut(&mut self, turn_id: &str, item_key: &str) -> Option<&mut HistoryItemDto> {
        self.projection
            .turns
            .iter_mut()
            .find(|turn| turn.turn_id == turn_id)
            .and_then(|turn| turn.items.iter_mut().find(|item| item.item_key == item_key))
    }

    fn find_tool_item_mut(&mut self, call_id: &str) -> Option<&mut HistoryItemDto> {
        let key = format!("tool:{call_id}");
        let pending = self.pending_tools.get(call_id).cloned();
        if let Some(pending) = pending {
            return self.find_item_mut(&pending.turn_id, &pending.item_key);
        }
        self.projection
            .turns
            .iter_mut()
            .flat_map(|turn| turn.items.iter_mut())
            .find(|item| item.item_key == key)
    }

    fn tool_for_call(&self, call_id: &str) -> Option<&ToolItemDto> {
        let key = format!("tool:{call_id}");
        let pending = self.pending_tools.get(call_id);
        let (turn_id, item_key) = pending
            .map(|pending| (pending.turn_id.as_str(), pending.item_key.as_str()))
            .unwrap_or(("", key.as_str()));
        self.projection
            .turns
            .iter()
            .find(|turn| turn_id.is_empty() || turn.turn_id == turn_id)
            .and_then(|turn| turn.items.iter().find(|item| item.item_key == item_key))
            .and_then(|item| item.tool.as_ref())
    }

    fn source_ref(&self, _ordinal: u64, payload_type: &str) -> SourceRefDto {
        SourceRefDto {
            source_ordinal: self.current_source_ordinal,
            rollout_index: self.current_rollout_ordinal,
            event_type: None,
            payload_type: Some(payload_type.to_string()),
        }
    }

    fn response_turn_id(&mut self, item: &ResponseItem, ordinal: u64) -> String {
        let value = serde_json::to_value(item).unwrap_or(Value::Null);
        let embedded = value
            .get("internal_chat_message_metadata_passthrough")
            .and_then(|value| value.get("turn_id"))
            .and_then(Value::as_str);
        self.target_turn(embedded, ordinal)
    }

    fn target_turn(&mut self, explicit: Option<&str>, ordinal: u64) -> String {
        if let Some(id) = explicit.filter(|id| !id.is_empty()) {
            self.current_turn_id = Some(id.to_string());
            self.ensure_turn(id);
            return id.to_string();
        }
        self.current_or_synthetic_turn(ordinal)
    }

    fn current_or_synthetic_turn(&mut self, ordinal: u64) -> String {
        if let Some(turn_id) = &self.current_turn_id {
            return turn_id.clone();
        }
        let turn_id = format!("synthetic:{ordinal}");
        self.current_turn_id = Some(turn_id.clone());
        self.ensure_turn(&turn_id);
        turn_id
    }

    fn drop_kind(&mut self, kind: &str) {
        self.stats.dropped_total += 1;
        *self
            .stats
            .dropped_by_kind
            .entry(kind.to_string())
            .or_insert(0) += 1;
    }
}

#[derive(Debug, Default, Clone)]
struct DetailInput {
    stdout: Option<String>,
    stderr: Option<String>,
    aggregated_output: Option<String>,
    formatted_output: Option<String>,
    result: Option<Value>,
    raw: Option<Value>,
}

#[derive(Debug, Default)]
struct NormalizedToolInvocation {
    /// Direct argv-like command parts, used by native shell events.
    command: Option<Vec<String>>,
    /// One or more actual shell command strings extracted from an `exec`
    /// wrapper. The wrapper source itself is intentionally not persisted.
    commands: Option<Vec<String>>,
    /// Structured arguments for non-shell custom tools. For `exec`, this is
    /// omitted after normalization so the JavaScript wrapper cannot pollute
    /// history or cross-task memory.
    arguments: Option<Value>,
    /// The actual nested host tool name when the outer `exec` wrapper invokes
    /// another tool. This prevents the durable item from being mislabeled as
    /// `exec` and lets retention rules recognize `wait`.
    tool_name: Option<String>,
}

fn normalize_custom_tool_invocation(name: &str, input: &str) -> NormalizedToolInvocation {
    if name != "exec" {
        return NormalizedToolInvocation {
            arguments: Some(
                serde_json::from_str(input).unwrap_or_else(|_| Value::String(input.to_string())),
            ),
            ..Default::default()
        };
    }

    let tool_name = extract_nested_tool_name(input);
    let arguments = tool_name
        .as_deref()
        .and_then(|name| extract_nested_tool_arguments(input, name));
    let commands = extract_exec_commands(input);
    NormalizedToolInvocation {
        commands: (!commands.is_empty()).then_some(commands),
        arguments,
        tool_name,
        ..Default::default()
    }
}

/// Extract the actual shell invocations from the JavaScript wrapper used by
/// the host's `exec` tool. This is deliberately a small, fail-closed parser:
/// it accepts literal `command: "..."`/template values and the common
/// `[[label, command], ...]` batching form, but never stores the wrapper when
/// it cannot identify a command.
fn extract_exec_commands(input: &str) -> Vec<String> {
    let mut commands = Vec::new();
    let assignments = extract_js_string_assignments(input);
    let mut search_from = 0usize;

    while let Some(relative) = input[search_from..].find("command") {
        let position = search_from + relative;
        let after_key = position + "command".len();
        let mut cursor = skip_js_whitespace(input, after_key);
        if !matches!(input.as_bytes().get(cursor), Some(b':' | b'=')) {
            search_from = after_key;
            continue;
        }
        cursor += 1;
        cursor = skip_js_whitespace(input, cursor);
        if let Some((value, end)) = parse_js_string(input, cursor) {
            push_resolved_command(&mut commands, value, &assignments);
            search_from = end;
        } else if let Some((identifier, end)) = parse_js_identifier(input, cursor) {
            if let Some(value) = assignments.get(&identifier) {
                push_resolved_command(&mut commands, value.clone(), &assignments);
            }
            search_from = end;
        } else {
            search_from = cursor.saturating_add(1);
        }
    }

    // Batched calls commonly use `[["label", "actual command"], ...]`.
    // This supplements, rather than replaces, the named-property parser
    // above because the batched callback often uses the identifier `command`.
    let mut cursor = 0usize;
    while cursor < input.len() {
        if input.as_bytes().get(cursor) != Some(&b'[') {
            cursor += 1;
            continue;
        }
        let first_start = skip_js_whitespace(input, cursor + 1);
        let Some((_, first_end)) = parse_js_string(input, first_start) else {
            cursor += 1;
            continue;
        };
        let comma = skip_js_whitespace(input, first_end);
        if input.as_bytes().get(comma) != Some(&b',') {
            cursor = first_end;
            continue;
        }
        let second_start = skip_js_whitespace(input, comma + 1);
        if let Some((value, end)) = parse_js_string(input, second_start) {
            if is_probable_shell_command(&value) {
                push_command(&mut commands, value);
            }
            cursor = end;
        } else {
            cursor = comma + 1;
        }
    }
    commands
}

/// Resolve the simple variables used by the host's JavaScript wrapper, for
/// example `const cmd = String.raw\`cargo test\`` followed by
/// `tools.shell_command({command: cmd})`. We deliberately accept only literal
/// string assignments; arbitrary JavaScript is not evaluated by the history
/// reader.
fn extract_js_string_assignments(input: &str) -> HashMap<String, String> {
    let mut assignments = HashMap::new();
    let mut search_from = 0usize;
    while let Some(relative) = input[search_from..].find('=') {
        let equal = search_from + relative;
        if input.as_bytes().get(equal + 1) == Some(&b'>') {
            search_from = equal + 1;
            continue;
        }
        let value_start = skip_js_whitespace(input, equal + 1);
        let (value_start, is_raw) = if input[value_start..].starts_with("String.raw") {
            (
                skip_js_whitespace(input, value_start + "String.raw".len()),
                true,
            )
        } else {
            (value_start, false)
        };
        let Some((value, end)) = parse_js_string(input, value_start) else {
            search_from = equal + 1;
            continue;
        };
        let Some(name) = assignment_name_before(input, equal) else {
            search_from = end;
            continue;
        };
        // `String.raw` is intentionally parsed with the same bounded string
        // parser. The `is_raw` flag documents the accepted syntax and keeps
        // this helper easy to tighten if a future wrapper needs raw escape
        // preservation; shell commands already use the decoded text here.
        let _ = is_raw;
        assignments.insert(name, value);
        search_from = end;
    }
    assignments
}

fn assignment_name_before(input: &str, equal: usize) -> Option<String> {
    let mut end = equal;
    while end > 0 && input.as_bytes()[end - 1].is_ascii_whitespace() {
        end -= 1;
    }
    let mut start = end;
    while start > 0 && is_js_identifier_continue(input.as_bytes()[start - 1]) {
        start -= 1;
    }
    (start < end).then(|| input[start..end].to_string())
}

fn parse_js_identifier(input: &str, start: usize) -> Option<(String, usize)> {
    let first = *input.as_bytes().get(start)?;
    if !is_js_identifier_start(first) {
        return None;
    }
    let mut end = start + 1;
    while input
        .as_bytes()
        .get(end)
        .is_some_and(|byte| is_js_identifier_continue(*byte))
    {
        end += 1;
    }
    Some((input[start..end].to_string(), end))
}

fn is_js_identifier_start(byte: u8) -> bool {
    byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$'
}

fn is_js_identifier_continue(byte: u8) -> bool {
    is_js_identifier_start(byte) || byte.is_ascii_digit()
}

fn push_resolved_command(
    commands: &mut Vec<String>,
    value: String,
    assignments: &HashMap<String, String>,
) {
    if let Some(resolved) = resolve_js_template(&value, assignments) {
        push_command(commands, resolved);
    } else if !value.contains("${") {
        push_command(commands, value);
    }
}

fn resolve_js_template(value: &str, assignments: &HashMap<String, String>) -> Option<String> {
    if !value.contains("${") {
        return Some(value.to_string());
    }
    let mut resolved = String::with_capacity(value.len());
    let mut cursor = 0usize;
    while let Some(relative) = value[cursor..].find("${") {
        let start = cursor + relative;
        resolved.push_str(&value[cursor..start]);
        let end = value[start + 2..].find('}')? + start + 2;
        let name = &value[start + 2..end];
        if !name.bytes().all(is_js_identifier_continue) || name.is_empty() {
            return None;
        }
        resolved.push_str(assignments.get(name)?);
        cursor = end + 1;
    }
    resolved.push_str(&value[cursor..]);
    Some(resolved)
}

fn extract_nested_tool_name(input: &str) -> Option<String> {
    let mut names = Vec::new();
    let mut search_from = 0usize;
    while let Some(relative) = input[search_from..].find("tools.") {
        let start = search_from + relative + "tools.".len();
        let Some((name, end)) = parse_js_identifier(input, start) else {
            search_from = start;
            continue;
        };
        let after_name = skip_js_whitespace(input, end);
        if input.as_bytes().get(after_name) == Some(&b'(')
            && !names.iter().any(|existing| existing == &name)
        {
            names.push(name);
        }
        search_from = end;
    }
    names
        .iter()
        .find(|name| name.as_str() == "wait")
        .cloned()
        .or_else(|| {
            names
                .iter()
                .find(|name| matches!(name.as_str(), "shell_command" | "exec_command"))
                .cloned()
        })
        .or_else(|| names.into_iter().next())
}

fn extract_nested_tool_arguments(input: &str, tool_name: &str) -> Option<Value> {
    if tool_name == "apply_patch" {
        // The canonical file_change items carry the patch; retaining it again
        // in a custom-tool argument would duplicate the largest payload.
        return None;
    }
    let object = extract_nested_object_literal(input, tool_name);
    if tool_name == "wait" {
        let mut result = serde_json::Map::new();
        if let Some(value) = extract_js_named_string(input, "cell_id") {
            result.insert("cell_id".to_string(), Value::String(value));
        }
        for key in ["yield_time_ms", "max_tokens"] {
            if let Some(value) = extract_js_named_integer(input, key) {
                result.insert(key.to_string(), Value::Number(value.into()));
            }
        }
        return (!result.is_empty()).then_some(Value::Object(result));
    }
    object.map(|object| serde_json::from_str(&object).unwrap_or(Value::String(object)))
}

fn extract_nested_object_literal(input: &str, tool_name: &str) -> Option<String> {
    let marker = format!("tools.{tool_name}");
    let start = input.find(&marker)? + marker.len();
    let open = input[start..].find('(')? + start;
    let object_start = input[open + 1..].find('{')? + open + 1;
    let object_end = matching_js_delimiter(input, object_start, b'{', b'}')?;
    Some(input[object_start..=object_end].to_string())
}

fn matching_js_delimiter(input: &str, start: usize, open: u8, close: u8) -> Option<usize> {
    let bytes = input.as_bytes();
    let mut depth = 0usize;
    let mut cursor = start;
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if matches!(byte, b'\'' | b'"' | b'`') {
            let (_, end) = parse_js_string(input, cursor)?;
            cursor = end;
            continue;
        }
        if byte == open {
            depth += 1;
        } else if byte == close {
            depth = depth.saturating_sub(1);
            if depth == 0 {
                return Some(cursor);
            }
        }
        cursor += 1;
    }
    None
}

fn extract_js_named_string(input: &str, key: &str) -> Option<String> {
    let mut search_from = 0usize;
    while let Some(relative) = input[search_from..].find(key) {
        let start = search_from + relative;
        let after_key = skip_js_whitespace(input, start + key.len());
        if input.as_bytes().get(after_key) == Some(&b':') {
            let value_start = skip_js_whitespace(input, after_key + 1);
            if let Some((value, _)) = parse_js_string(input, value_start) {
                return Some(value);
            }
        }
        search_from = start + key.len();
    }
    None
}

fn extract_js_named_integer(input: &str, key: &str) -> Option<i64> {
    let mut search_from = 0usize;
    while let Some(relative) = input[search_from..].find(key) {
        let start = search_from + relative;
        let after_key = skip_js_whitespace(input, start + key.len());
        if input.as_bytes().get(after_key) == Some(&b':') {
            let value_start = skip_js_whitespace(input, after_key + 1);
            let mut end = value_start;
            while input
                .as_bytes()
                .get(end)
                .is_some_and(|byte| byte.is_ascii_digit())
            {
                end += 1;
            }
            if end > value_start {
                if let Ok(value) = input[value_start..end].parse() {
                    return Some(value);
                }
            }
        }
        search_from = start + key.len();
    }
    None
}

fn skip_js_whitespace(input: &str, mut position: usize) -> usize {
    while input
        .as_bytes()
        .get(position)
        .is_some_and(|byte| byte.is_ascii_whitespace())
    {
        position += 1;
    }
    position
}

fn parse_js_string(input: &str, start: usize) -> Option<(String, usize)> {
    let delimiter = *input.as_bytes().get(start)? as char;
    if !matches!(delimiter, '\'' | '"' | '`') {
        return None;
    }
    let bytes = input.as_bytes();
    let mut cursor = start + 1;
    let mut output = String::new();
    while cursor < bytes.len() {
        let byte = bytes[cursor];
        if byte as char == delimiter {
            return Some((output, cursor + 1));
        }
        if byte != b'\\' {
            let character = input[cursor..].chars().next()?;
            output.push(character);
            cursor += character.len_utf8();
            continue;
        }
        cursor += 1;
        let escaped = *bytes.get(cursor)? as char;
        match escaped {
            'n' => output.push('\n'),
            'r' => output.push('\r'),
            't' => output.push('\t'),
            'b' => output.push('\u{0008}'),
            'f' => output.push('\u{000c}'),
            '\\' => output.push('\\'),
            '\'' => output.push('\''),
            '"' => output.push('"'),
            '`' => output.push('`'),
            'u' => {
                let end = cursor.saturating_add(5);
                let hex = input.get(cursor + 1..end)?;
                let value = u32::from_str_radix(hex, 16).ok()?;
                output.push(char::from_u32(value)?);
                cursor = end - 1;
            }
            other => output.push(other),
        }
        cursor += 1;
    }
    None
}

fn is_probable_shell_command(value: &str) -> bool {
    let value = value.trim();
    if value.is_empty() || value.len() > 16_384 {
        return false;
    }
    let lower = value.to_ascii_lowercase();
    let prefixes = [
        "adb ",
        "bun ",
        "cargo ",
        "cat ",
        "cd ",
        "curl ",
        "docker ",
        "find ",
        "git ",
        "gradle ",
        "grep ",
        "ls ",
        "mvn ",
        "node ",
        "npm ",
        "npx ",
        "pm2 ",
        "powershell",
        "python ",
        "rg ",
        "sed ",
        "select-string",
        "type ",
        "where ",
        "which ",
        "yarn ",
        ".\\",
        "./",
        "$env:",
        "get-",
        "set-",
        "start-",
        "stop-",
        "new-",
        "remove-",
        "copy-",
        "move-",
        "param(",
        "& {",
    ];
    prefixes.iter().any(|prefix| lower.starts_with(prefix))
        || value.contains(" --")
        || (value.contains(' ') && (value.contains('\\') || value.contains('/')))
}

fn push_command(commands: &mut Vec<String>, value: String) {
    let value = value.trim().to_string();
    if is_probable_shell_command(&value) && !commands.iter().any(|item| item == &value) {
        commands.push(value);
    }
}

impl DetailInput {
    fn has_payload(&self) -> bool {
        self.stdout.as_ref().is_some_and(|value| !value.is_empty())
            || self.stderr.as_ref().is_some_and(|value| !value.is_empty())
            || self
                .aggregated_output
                .as_ref()
                .is_some_and(|value| !value.is_empty())
            || self
                .formatted_output
                .as_ref()
                .is_some_and(|value| !value.is_empty())
            || self.result.is_some()
            || self.raw.is_some()
    }
}

fn detail_input_from_payload(detail: &DetailPayloadDto) -> DetailInput {
    DetailInput {
        stdout: detail.stdout.clone(),
        stderr: detail.stderr.clone(),
        aggregated_output: detail
            .aggregated_output
            .clone()
            .or_else(|| detail.canonical_output.clone()),
        formatted_output: detail.formatted_output.clone(),
        result: detail.result.clone(),
        raw: detail.raw.clone(),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DetailRetention {
    Full,
    Summary,
}

fn tool_command_text(tool: &ToolItemDto) -> String {
    let mut parts = Vec::new();
    if let Some(commands) = &tool.commands {
        parts.extend(commands.iter().cloned());
    }
    if let Some(command) = &tool.command {
        parts.push(command.join(" "));
    }
    if parts.is_empty() {
        if let Some(arguments) = &tool.arguments {
            parts.push(match arguments {
                Value::String(text) => text.clone(),
                value => compact_json(value),
            });
        }
    }
    if parts.is_empty() {
        tool.tool_name.clone().unwrap_or_default()
    } else {
        parts.join(" ; ")
    }
}

fn is_full_value_command(command: &str) -> bool {
    let masked = mask_shell_quotes(command);
    masked
        .split(|character| matches!(character, ';' | '\n' | '\r' | '|'))
        .any(is_full_command_segment)
}

fn is_full_command_segment(segment: &str) -> bool {
    // Search terms, quoted source snippets, file names, and output text can
    // contain words such as "verify" or "build". Ignore quoted material and
    // inspect only the shell command surface so a read/search command does
    // not accidentally retain a multi-megabyte detail payload.
    let lower = mask_shell_quotes(segment).to_ascii_lowercase();
    let trimmed = lower.trim();

    if let Some(position) = invocation_position(trimmed, "git diff") {
        let rest = &trimmed[position..];
        if !rest.contains("--stat")
            && !rest.contains("--name-only")
            && !rest.contains("--name-status")
        {
            return true;
        }
    }

    [
        "cargo test",
        "cargo build",
        "cargo check",
        "cargo clippy",
        "npm test",
        "npm run build",
        "npm run test",
        "npm run lint",
        "npm run verify",
        "npm run validate",
        "npm run deploy",
        "npm run migrate",
        "npm run restart",
        "bun test",
        "bun run build",
        "bun run test",
        "bun run lint",
        "bun run verify",
        "bun run validate",
        "bun run deploy",
        "bun run migrate",
        "gradle ",
        "gradlew ",
        ".\\gradlew",
        "./gradlew",
        "adb ",
        "pm2 ",
        "docker build",
        "docker push",
        "docker compose up",
        "mvn test",
        "mvn package",
        "mvn verify",
        "pytest",
        "go test",
        "go build",
        "git commit",
        "git revert",
        "git reset",
        "git checkout",
        "npm install",
        "bun install",
        "cargo install",
        "pip install",
    ]
    .iter()
    .any(|marker| invocation_position(trimmed, marker).is_some())
        || invocation_token_is_full(trimmed)
}

fn invocation_position(command: &str, marker: &str) -> Option<usize> {
    let mut search_from = 0usize;
    while let Some(relative) = command[search_from..].find(marker) {
        let position = search_from + relative;
        let boundary = position == 0
            || command[..position]
                .chars()
                .next_back()
                .is_some_and(|character| matches!(character, '&' | '{' | '(' | '='));
        if boundary {
            return Some(position);
        }
        search_from = position + marker.len();
    }
    None
}

fn invocation_token_is_full(command: &str) -> bool {
    let first = command
        .trim_start_matches(|character: char| matches!(character, '&' | '{' | '('))
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .trim_matches(|character: char| character == '\'' || character == '"');
    let lower = first.to_ascii_lowercase();
    [
        "deploy",
        "migrate",
        "restart",
        "rollback",
        "smoke",
        "regression",
        "validate",
        "verify",
        "compile",
        "lint",
        "test",
        "build",
    ]
    .iter()
    .any(|marker| {
        lower == *marker
            || lower.starts_with(&format!("{marker}."))
            || lower.starts_with(&format!("{marker}/"))
            || lower.starts_with(&format!("{marker}\\"))
            || lower.contains(&format!("/{marker}"))
            || lower.contains(&format!("\\{marker}"))
    })
}

fn mask_shell_quotes(value: &str) -> String {
    let mut masked = String::with_capacity(value.len());
    let mut quote = None;
    let mut escaped = false;
    for character in value.chars() {
        if let Some(delimiter) = quote {
            if escaped {
                escaped = false;
            } else if character == '\\' {
                escaped = true;
            } else if character == delimiter {
                quote = None;
            }
            masked.push(' ');
        } else if matches!(character, '\'' | '"' | '`') {
            quote = Some(character);
            masked.push(' ');
        } else {
            masked.push(character);
        }
    }
    masked
}

fn is_summary_value_command(command: &str) -> bool {
    let lower = command.to_ascii_lowercase();
    [
        "rg ",
        "grep ",
        "find ",
        "get-content",
        "get-childitem",
        "select-string",
        "git status",
        "git log",
        "git show --stat",
        "git diff --stat",
        "git diff --name",
        "ls",
        "dir ",
        "pwd",
        "where ",
        "which ",
        "type ",
        "cat ",
        "head ",
        "tail ",
        "measure-object",
        "wc ",
        "tree ",
        "environment",
        "env",
        "inspect",
        "probe",
    ]
    .iter()
    .any(|marker| lower.starts_with(marker) || lower.contains(&format!(" {marker}")))
}

fn async_cell_id(detail: &DetailPayloadDto) -> Option<String> {
    let mut texts = Vec::new();
    if let Some(value) = &detail.canonical_output {
        texts.push(value.as_str());
    }
    if let Some(value) = &detail.stdout {
        texts.push(value.as_str());
    }
    if let Some(value) = &detail.stderr {
        texts.push(value.as_str());
    }
    for text in texts {
        let lower = text.to_ascii_lowercase();
        let marker = "script running with cell id";
        let Some(position) = lower.find(marker) else {
            continue;
        };
        let start = position + marker.len();
        let cell = text[start..]
            .trim_start_matches(|character: char| {
                character.is_ascii_whitespace() || character == ':'
            })
            .split(|character: char| {
                character.is_ascii_whitespace() || matches!(character, ',' | ';' | ')')
            })
            .next()
            .filter(|value| !value.is_empty())?;
        return Some(cell.to_string());
    }
    None
}

fn is_async_running_output(detail: &DetailPayloadDto) -> bool {
    async_cell_id(detail).is_some()
}

fn summarize_detail(detail: &DetailPayloadDto) -> String {
    let mut text = detail.canonical_output.clone().unwrap_or_default();
    if text.trim().is_empty() {
        text = detail
            .stdout
            .clone()
            .or_else(|| detail.stderr.clone())
            .or_else(|| detail.aggregated_output.clone())
            .or_else(|| detail.formatted_output.clone())
            .or_else(|| detail.result.as_ref().map(compact_json))
            .unwrap_or_default();
    }
    let summary = summarize_output_text(&text, 512);
    if summary.trim().is_empty() {
        "no textual output".to_string()
    } else {
        summary
    }
}

fn detail_indicates_failure(detail: &DetailPayloadDto) -> bool {
    let texts = [
        detail.canonical_output.as_deref(),
        detail.stdout.as_deref(),
        detail.stderr.as_deref(),
        detail.aggregated_output.as_deref(),
        detail.formatted_output.as_deref(),
    ];
    texts.into_iter().flatten().any(|text| {
        text.lines().any(|line| {
            let line = line.trim().to_ascii_lowercase();
            line.starts_with("script failed")
                || line.starts_with("script error")
                || line.starts_with("command failed")
                || line.starts_with("fatal:")
                || line.starts_with("panic:")
                || line.starts_with("exception")
                || line.starts_with("error:")
                || (line.starts_with("exit code:") && !line.ends_with(": 0"))
                || (line.starts_with("process exited with code ") && !line.ends_with(" 0"))
        })
    })
}

fn summarize_output_text(text: &str, max_bytes: usize) -> String {
    let lines = text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return String::new();
    }
    let mut selected = Vec::new();
    for line in lines.iter().take(3) {
        push_unique(&mut selected, (*line).to_string());
    }
    for line in &lines {
        let lower = line.to_ascii_lowercase();
        let is_error = [
            "error",
            "failed",
            "failure",
            "exception",
            "panic",
            "fatal",
            "warning",
        ]
        .iter()
        .any(|marker| lower.contains(marker));
        let has_location = line.contains(':')
            && line
                .chars()
                .collect::<Vec<_>>()
                .windows(2)
                .any(|window| window[0].is_ascii_digit() && window[1] == ':')
            && (line.contains('/') || line.contains('\\'));
        if is_error || has_location {
            push_unique(&mut selected, (*line).to_string());
        }
        if selected.len() >= 24 {
            break;
        }
    }
    if selected.len() < 3 {
        for line in lines.iter().skip(3).take(3) {
            push_unique(&mut selected, (*line).to_string());
        }
    }
    truncate_text(&selected.join("\n"), max_bytes)
}

fn truncate_text(value: &str, max_bytes: usize) -> String {
    if value.len() <= max_bytes {
        return value.to_string();
    }
    let mut end = max_bytes.saturating_sub("…".len());
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}…", &value[..end])
}

fn build_detail_payload(
    detail_ref: String,
    tool_kind: &str,
    input: DetailInput,
    partial_rollout: bool,
    unsupported_schema: bool,
) -> DetailPayloadDto {
    let stdout_source = non_empty(input.stdout);
    let stderr_source = non_empty(input.stderr);
    let aggregated_source = non_empty(input.aggregated_output);
    let formatted_source = non_empty(input.formatted_output);
    let canonical_output = aggregated_source
        .clone()
        .or_else(|| formatted_source.clone())
        .or_else(|| stdout_source.clone())
        .or_else(|| stderr_source.clone());

    let stdout_present = stdout_source.is_some();
    let stderr_present = stderr_source.is_some();
    let aggregated_present = aggregated_source.is_some();
    let formatted_present = formatted_source.is_some();
    let result_source_present = input.result.is_some();
    let raw_present = input.raw.is_some();
    let canonical_as_str = canonical_output.as_deref();
    let result = input
        .result
        .filter(|value| !result_matches_canonical(value, canonical_as_str));
    let stdout = retain_distinct_output(stdout_source, canonical_as_str);
    let stderr = retain_distinct_output(stderr_source, canonical_as_str);
    let aggregated_output = retain_distinct_output(aggregated_source, canonical_as_str);
    let formatted_output = retain_distinct_output(formatted_source, canonical_as_str);
    let mut field_availability = BTreeMap::new();
    if !result_source_present {
        field_availability.insert(
            "result".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    } else if result.is_none() {
        field_availability.insert("result".to_string(), AvailabilityStatus::Present);
    }
    if !raw_present {
        field_availability.insert(
            "raw".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    }
    if !stdout_present {
        field_availability.insert(
            "stdout".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    } else if stdout.is_none() {
        field_availability.insert("stdout".to_string(), AvailabilityStatus::Present);
    }
    if !stderr_present {
        field_availability.insert(
            "stderr".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    } else if stderr.is_none() {
        field_availability.insert("stderr".to_string(), AvailabilityStatus::Present);
    }
    if !aggregated_present {
        field_availability.insert(
            "aggregated_output".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    } else if aggregated_output.is_none() {
        field_availability.insert("aggregated_output".to_string(), AvailabilityStatus::Present);
    }
    if !formatted_present {
        field_availability.insert(
            "formatted_output".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    } else if formatted_output.is_none() {
        field_availability.insert("formatted_output".to_string(), AvailabilityStatus::Present);
    }
    if canonical_output.is_none() {
        field_availability.insert(
            "canonical_output".to_string(),
            detail_field_status(false, partial_rollout, unsupported_schema),
        );
    }
    DetailPayloadDto {
        detail_ref,
        tool_kind: Some(tool_kind.to_string()),
        tool_name: None,
        canonical_output,
        stdout,
        stderr,
        aggregated_output,
        formatted_output,
        result,
        raw: input.raw,
        field_availability,
    }
}

fn detail_field_status(
    present: bool,
    partial_rollout: bool,
    unsupported_schema: bool,
) -> AvailabilityStatus {
    if present {
        AvailabilityStatus::Present
    } else if partial_rollout {
        AvailabilityStatus::PartialRollout
    } else if unsupported_schema {
        AvailabilityStatus::UnsupportedSchema
    } else {
        AvailabilityStatus::NotRecoverableFromRollout
    }
}

fn retain_distinct_output(value: Option<String>, canonical: Option<&str>) -> Option<String> {
    let value = non_empty(value);
    if value.as_deref().is_some_and(|candidate| {
        canonical.is_some_and(|canonical| candidate == canonical || canonical.contains(candidate))
    }) {
        None
    } else {
        value
    }
}

fn result_matches_canonical(value: &Value, canonical: Option<&str>) -> bool {
    let Some(canonical) = canonical else {
        return false;
    };
    let result_text = match value {
        Value::String(text) => text.clone(),
        value => collect_text(value),
    };
    let result_text = normalize_comparable_text(&result_text);
    let canonical = normalize_comparable_text(canonical);
    !result_text.is_empty() && result_text == canonical
}

fn normalize_comparable_text(value: &str) -> String {
    value
        .replace("\r\n", "\n")
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn is_duplicate_message(reducer: &HistoryReducer, item: &HistoryItemDto) -> bool {
    if !matches!(
        item.kind.as_str(),
        "user_message" | "assistant_message" | "inter_agent_message"
    ) {
        return false;
    }
    let Some(content) = item.content.as_deref() else {
        return false;
    };
    let incoming_source = item
        .source_ref
        .as_ref()
        .and_then(|source| source.payload_type.as_deref());
    reducer
        .projection
        .turns
        .iter()
        .find(|turn| turn.turn_id == item.turn_id)
        .is_some_and(|turn| {
            turn.items.iter().any(|existing| {
                let existing_source = existing
                    .source_ref
                    .as_ref()
                    .and_then(|source| source.payload_type.as_deref());
                let wrapper_pair = incoming_source != existing_source
                    && is_message_wrapper_source(incoming_source)
                    && is_message_wrapper_source(existing_source);
                existing.kind == item.kind
                    && existing.content.as_deref() == Some(content)
                    && existing.item_key != item.item_key
                    && wrapper_pair
            })
        })
}

fn push_unique(values: &mut Vec<String>, value: String) {
    if !values.iter().any(|existing| existing == &value) {
        values.push(value);
    }
}

fn is_validation_item(item: &HistoryItemDto) -> bool {
    let Some(tool) = item.tool.as_ref() else {
        return false;
    };
    if !matches!(
        tool.tool_kind.as_str(),
        "command" | "custom_tool" | "function_call" | "local_shell"
    ) {
        return false;
    }
    let command = tool
        .commands
        .as_ref()
        .map(|commands| commands.join(" "))
        .or_else(|| tool.command.as_ref().map(|parts| parts.join(" ")))
        .or_else(|| {
            tool.arguments.as_ref().map(|arguments| match arguments {
                Value::String(text) => text.clone(),
                value => compact_json(value),
            })
        })
        .or_else(|| item.content.clone())
        .unwrap_or_default()
        .to_lowercase();
    [
        "test", "build", "lint", "check", "verify", "validate", "compile",
    ]
    .iter()
    .any(|marker| {
        command
            .split(|character: char| !character.is_ascii_alphanumeric())
            .any(|part| part == *marker)
    })
}

fn is_message_wrapper_source(source: Option<&str>) -> bool {
    matches!(
        source,
        Some("response_item" | "agent_message" | "item_completed" | "turn_complete")
    )
}

fn merge_item(existing: &mut HistoryItemDto, incoming: HistoryItemDto) {
    if existing.kind == "function_call" && incoming.kind != "function_call" {
        existing.kind = incoming.kind.clone();
    }
    existing.visible |= incoming.visible;
    if incoming.content.is_some() {
        existing.content = incoming.content;
    }
    if incoming.summary.is_some() {
        existing.summary = incoming.summary;
    }
    if existing.source_ref.is_none() {
        existing.source_ref = incoming.source_ref;
    }
    if existing.timestamp.is_none() {
        existing.timestamp = incoming.timestamp;
    }
    if incoming.availability.is_some() {
        existing.availability = incoming.availability;
    }
    if incoming.question.is_some() {
        existing.question = incoming.question;
    }
    if incoming.answer.is_some() {
        existing.answer = incoming.answer;
    }
    if incoming.detail_ref.is_some() {
        existing.detail_ref = incoming.detail_ref;
    }
    if let Some(incoming_tool) = incoming.tool {
        if let Some(existing_tool) = existing.tool.as_mut() {
            merge_tool(existing_tool, incoming_tool);
        } else {
            existing.tool = Some(incoming_tool);
        }
    }
}

fn merge_tool(existing: &mut ToolItemDto, incoming: ToolItemDto) {
    if incoming.tool_kind != "function_call" {
        existing.tool_kind = incoming.tool_kind;
    }
    if let Some(incoming_name) = incoming.tool_name {
        let should_replace = existing.tool_name.is_none()
            || incoming_name.contains('.')
            || !existing
                .tool_name
                .as_deref()
                .is_some_and(|existing_name| existing_name.contains('.'));
        if should_replace {
            existing.tool_name = Some(incoming_name);
        }
    }
    if incoming.command.is_some() {
        existing.command = incoming.command;
    }
    if incoming.commands.is_some() {
        existing.commands = incoming.commands;
    }
    if incoming.arguments.is_some() {
        existing.arguments = incoming.arguments;
    }
    if incoming.cwd.is_some() {
        existing.cwd = incoming.cwd;
    }
    if let Some(incoming_status) = incoming.status {
        let incoming_is_progress = incoming_status == "in_progress";
        let existing_is_terminal = existing
            .status
            .as_deref()
            .is_some_and(|status| matches!(status, "completed" | "failed" | "declined"));
        if !(incoming_is_progress && existing_is_terminal) {
            existing.status = Some(incoming_status);
        }
    }
    if incoming.exit_code.is_some() {
        existing.exit_code = incoming.exit_code;
    }
    if incoming.duration_ms.is_some() {
        existing.duration_ms = incoming.duration_ms;
    }
    if incoming.approval.is_some() {
        existing.approval = incoming.approval;
    }
    if incoming.output_bytes.is_some() {
        existing.output_bytes = incoming.output_bytes;
    }
    if incoming.output_sha256.is_some() {
        existing.output_sha256 = incoming.output_sha256;
    }
}

fn recompute_hash(item: &mut HistoryItemDto) {
    item.content_hash = None;
    let bytes = serde_json::to_vec(item).unwrap_or_default();
    item.content_hash = Some(sha256_hex(&bytes));
}

fn usage_from_token_usage(usage: &codex_protocol::protocol::TokenUsage) -> UsageDto {
    UsageDto {
        input_tokens: usage.input_tokens,
        cached_input_tokens: usage.cached_input_tokens,
        cache_write_input_tokens: usage.cache_write_input_tokens,
        output_tokens: usage.output_tokens,
        reasoning_output_tokens: usage.reasoning_output_tokens,
        total_tokens: usage.total_tokens,
    }
}

fn content_items_to_text(items: &[ContentItem]) -> String {
    items
        .iter()
        .filter_map(|item| match item {
            ContentItem::InputText { text } | ContentItem::OutputText { text } => {
                Some(text.clone())
            }
            ContentItem::InputImage { image_url, .. } => Some(format!("[image: {image_url}]")),
            ContentItem::InputAudio { audio_url } => Some(format!("[audio: {audio_url}]")),
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn collect_text(value: &Value) -> String {
    let mut parts = Vec::new();
    collect_text_inner(value, &mut parts);
    parts.join("\n")
}

fn collect_text_inner(value: &Value, parts: &mut Vec<String>) {
    match value {
        Value::Array(values) => values
            .iter()
            .for_each(|value| collect_text_inner(value, parts)),
        Value::Object(object) => {
            if let Some(text) = object.get("text").and_then(Value::as_str) {
                parts.push(text.to_string());
            } else {
                object
                    .values()
                    .for_each(|value| collect_text_inner(value, parts));
            }
        }
        _ => {}
    }
}

fn normalize_turn_item_kind(kind: &str) -> &str {
    match kind {
        "UserMessage" => "user_message",
        "AgentMessage" => "agent_message",
        "Plan" => "plan",
        "Reasoning" => "reasoning",
        "CommandExecution" => "command_execution",
        "DynamicToolCall" => "dynamic_tool_call",
        "CollabAgentToolCall" => "collab_agent_tool_call",
        "SubAgentActivity" => "sub_agent_activity",
        "WebSearch" => "web_search",
        "ImageView" => "image_view",
        "Extension" => "extension",
        "ImageGeneration" => "image_generation",
        "EnteredReviewMode" => "entered_review_mode",
        "ExitedReviewMode" => "exited_review_mode",
        "FileChange" => "file_change",
        "McpToolCall" => "mcp_tool_call",
        "ContextCompaction" => "context_compaction",
        other => other,
    }
}

fn detail_output_bytes(detail: &DetailPayloadDto) -> u64 {
    let textual_bytes = detail.canonical_output.as_deref().unwrap_or("").len()
        + detail.stdout.as_deref().unwrap_or("").len()
        + detail.stderr.as_deref().unwrap_or("").len()
        + detail.aggregated_output.as_deref().unwrap_or("").len()
        + detail.formatted_output.as_deref().unwrap_or("").len();
    if textual_bytes > 0 {
        return textual_bytes as u64;
    }
    detail
        .result
        .as_ref()
        .and_then(|value| serde_json::to_vec(value).ok())
        .map(|bytes| bytes.len() as u64)
        .unwrap_or_default()
}

fn detail_output_hash(detail: &DetailPayloadDto) -> String {
    let value = json!({
        "canonical_output": detail.canonical_output,
        "stdout": detail.stdout,
        "stderr": detail.stderr,
        "aggregated_output": detail.aggregated_output,
        "formatted_output": detail.formatted_output,
        "result": detail.result,
        "raw": detail.raw,
    });
    sha256_hex(&serde_json::to_vec(&value).unwrap_or_default())
}

fn duration_ms_from_value(value: &Value) -> Option<i64> {
    if let Some(value) = value.as_i64() {
        return Some(value);
    }
    let object = value.as_object()?;
    let secs = object.get("secs").and_then(Value::as_u64)?;
    let nanos = object.get("nanos").and_then(Value::as_u64).unwrap_or(0);
    Some((secs as i64) * 1000 + (nanos / 1_000_000) as i64)
}

fn value_to_string(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_string)
        .unwrap_or_else(|| compact_json(value))
}

fn value_to_string_vec(value: &Value) -> Option<Vec<String>> {
    value.as_array().map(|values| {
        values
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect()
    })
}

/// Keep settings useful for reproducibility without copying large AGENTS,
/// skill, developer-instruction, or tool-schema bodies into every snapshot.
/// The exact body remains identifiable by a content hash and byte count.
fn compact_settings_snapshot(value: Value) -> Value {
    match value {
        Value::Object(mut object) => {
            for (key, value) in &mut object {
                if is_large_settings_context_key(key) {
                    let raw = compact_json(value);
                    let replacement = json!({
                        "content_hash": sha256_hex(raw.as_bytes()),
                        "bytes": raw.len(),
                    });
                    *value = replacement;
                } else {
                    let child = std::mem::take(value);
                    *value = compact_settings_snapshot(child);
                }
            }
            Value::Object(object)
        }
        Value::Array(values) => {
            Value::Array(values.into_iter().map(compact_settings_snapshot).collect())
        }
        value => value,
    }
}

fn is_large_settings_context_key(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    key == "agents"
        || key == "skills"
        || key == "tools"
        || key == "tool_schema"
        || key == "tool_schemas"
        || key == "developer_instructions"
        || key == "system_instructions"
        || key == "system_prompt"
}

fn compact_json(value: &Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "null".to_string())
}

fn qualified_name(namespace: Option<&str>, name: &str) -> String {
    match namespace.filter(|value| !value.is_empty()) {
        Some(namespace) => format!("{namespace}.{name}"),
        None => name.to_string(),
    }
}

fn web_search_action_text(action: &models::WebSearchAction) -> Option<String> {
    match action {
        models::WebSearchAction::Search { query, queries } => query
            .clone()
            .or_else(|| queries.as_ref().map(|queries| queries.join("; "))),
        models::WebSearchAction::OpenPage { url } => url.clone(),
        models::WebSearchAction::FindInPage { url, pattern } => Some(format!(
            "{}{}",
            url.as_deref().unwrap_or(""),
            pattern
                .as_deref()
                .map(|pattern| format!("#{pattern}"))
                .unwrap_or_default()
        )),
        models::WebSearchAction::Other => None,
    }
}

fn event_type(event: &EventMsg) -> String {
    serde_json::to_value(event)
        .ok()
        .and_then(|value| {
            value
                .get("type")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| "event_unknown".to_string())
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.filter(|value| !value.is_empty())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(bytes);
    crate::dto::hex::encode(&hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conversation() -> ConversationDto {
        ConversationDto {
            conversation_id: "00000000-0000-0000-0000-000000000001".to_string(),
            source: "test".to_string(),
            rollout_path: "fixture".to_string(),
            cli_version: None,
            codex_revision: None,
            thread_id: None,
            forked_from_id: None,
            parent_thread_id: None,
            history_mode: None,
            history_base: None,
            subagent_history_start_ordinal: None,
            cwd: None,
            git_info: None,
            model: None,
            model_provider: None,
            redaction_policy: None,
            availability: None,
            created_at: None,
            updated_at: None,
        }
    }

    #[test]
    fn identical_settings_snapshots_are_stored_once_by_hash() {
        let mut reducer = HistoryReducer::new(
            test_conversation(),
            "00000000-0000-0000-0000-000000000001".to_string(),
        );
        let snapshot = json!({"model": "gpt-test", "approval_policy": "never"});
        reducer.upsert_settings_snapshot(
            "turn-1".to_string(),
            snapshot.clone(),
            "settings",
            "test_settings",
            1,
        );
        reducer.upsert_settings_snapshot(
            "turn-2".to_string(),
            snapshot,
            "settings",
            "test_settings",
            2,
        );
        let (projection, _, stats) = reducer.finish();
        let snapshots = projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .filter(|item| item.kind == "settings_snapshot")
            .count();
        assert_eq!(snapshots, 1);
        assert_eq!(
            stats.dropped_by_kind.get("duplicate_settings_snapshot"),
            Some(&1)
        );
    }

    #[test]
    fn distinct_tool_output_channels_are_not_lost_when_compacting() {
        let detail = build_detail_payload(
            "detail:test".to_string(),
            "command",
            DetailInput {
                stdout: Some("stdout".to_string()),
                stderr: Some("stderr".to_string()),
                aggregated_output: Some("combined".to_string()),
                formatted_output: Some("formatted".to_string()),
                ..Default::default()
            },
            false,
            false,
        );
        assert_eq!(detail.canonical_output.as_deref(), Some("combined"));
        assert_eq!(detail.stdout.as_deref(), Some("stdout"));
        assert_eq!(detail.stderr.as_deref(), Some("stderr"));
        assert_eq!(detail.formatted_output.as_deref(), Some("formatted"));
    }

    #[test]
    fn read_quality_marks_partial_and_unsupported_fields() {
        let mut reducer = HistoryReducer::new(
            test_conversation(),
            "00000000-0000-0000-0000-000000000001".to_string(),
        );
        reducer.set_read_quality(true, true);
        let (projection, _, _) = reducer.finish();
        assert_eq!(
            projection.field_availability.get("rollout.parse"),
            Some(&AvailabilityStatus::PartialRollout)
        );
        assert_eq!(
            projection.field_availability.get("rollout.schema"),
            Some(&AvailabilityStatus::UnsupportedSchema)
        );
    }

    #[test]
    fn exec_wrapper_keeps_actual_commands_and_drops_wrapper_source() {
        let input = r#"const cmds = [["status","git status --short"],["tests","npm test"]];
const results = await Promise.all(cmds.map(async ([label, command]) => {
  return await tools.shell_command({command, workdir:"E:\\proj"});
}));"#;
        assert_eq!(
            extract_exec_commands(input),
            vec!["git status --short".to_string(), "npm test".to_string()]
        );

        let direct = r#"const r = await tools.shell_command({command:"rg -n \"needle\" src",workdir:"E:\\proj"});"#;
        assert_eq!(
            extract_exec_commands(direct),
            vec!["rg -n \"needle\" src".to_string()]
        );
    }

    #[test]
    fn exec_wrapper_recovers_nested_tool_identity_and_literal_variables() {
        let wait_input = r#"const r = await tools.wait({cell_id:"1175",yield_time_ms:10000,max_tokens:30000});
text(typeof r === "string" ? r : JSON.stringify(r));"#;
        let normalized = normalize_custom_tool_invocation("exec", wait_input);
        assert_eq!(normalized.tool_name.as_deref(), Some("wait"));
        assert_eq!(
            normalized.arguments,
            Some(json!({"cell_id": "1175", "yield_time_ms": 10000, "max_tokens": 30000}))
        );
        assert!(normalized.commands.is_none());

        let dynamic_input = r#"const cmd = String.raw`cargo test --release`;
const r = await tools.shell_command({command:cmd,workdir:"E:\\proj",timeout_ms:30000});
text(r);"#;
        let normalized = normalize_custom_tool_invocation("exec", dynamic_input);
        assert_eq!(normalized.tool_name.as_deref(), Some("shell_command"));
        assert_eq!(
            normalized.commands,
            Some(vec!["cargo test --release".to_string()])
        );

        let outer_only = r#"const names = ALL_TOOLS.filter(x => /shell_command|apply_patch/.test(x.name));
text(names.join("\n"));"#;
        let normalized = normalize_custom_tool_invocation("exec", outer_only);
        assert!(normalized.tool_name.is_none());
        assert!(normalized.commands.is_none());
        assert!(normalized.arguments.is_none());

        let app_input = r#"const r = await tools.codex_app__read_thread_terminal({});
text(r);"#;
        let normalized = normalize_custom_tool_invocation("exec", app_input);
        assert_eq!(
            normalized.tool_name.as_deref(),
            Some("codex_app__read_thread_terminal")
        );
        assert_eq!(normalized.arguments, Some(json!({})));
    }

    #[test]
    fn read_search_words_and_quoted_pipes_do_not_trigger_full_retention() {
        assert!(!is_full_value_command(
            r#"rg -n "build|verify|git diff" src; Get-Content android/app/build.gradle"#
        ));
        assert!(!is_full_value_command(
            "Get-Content android/app/build.gradle | Select-Object -First 20"
        ));
        assert!(is_full_value_command("cargo test --release"));
        assert!(is_full_value_command("Write-Output 'starting'; cargo test"));
        assert!(is_full_value_command("git diff -- src/relevant.rs"));
        assert!(!is_full_value_command("git diff --stat"));
    }

    #[test]
    fn equivalent_result_text_is_not_stored_twice() {
        let detail = build_detail_payload(
            "detail:test".to_string(),
            "custom_tool",
            DetailInput {
                aggregated_output: Some("line one\nline two".to_string()),
                result: Some(json!([
                    {"type": "input_text", "text": "line one\nline two"}
                ])),
                ..Default::default()
            },
            false,
            false,
        );
        assert!(detail.result.is_none());
        assert_eq!(
            detail.field_availability.get("result"),
            Some(&AvailabilityStatus::Present)
        );
    }

    #[test]
    fn successful_read_output_keeps_summary_hash_and_not_detail() {
        let mut reducer = HistoryReducer::new(
            test_conversation(),
            "00000000-0000-0000-0000-000000000001".to_string(),
        );
        reducer.upsert_tool(
            "turn-1".to_string(),
            "call-read",
            "custom_tool",
            Some("exec".to_string()),
            None,
            None,
            None,
            Some("completed".to_string()),
            None,
            1,
        );
        reducer.set_tool_commands("call-read", vec!["rg -n needle src".to_string()]);
        reducer.complete_tool(
            "call-read",
            None,
            "custom_tool",
            None,
            DetailInput {
                aggregated_output: Some("src/main.rs:10: needle\nlarge body omitted".to_string()),
                ..Default::default()
            },
            Some("completed".to_string()),
            Some(0),
            2,
        );
        let (projection, details, stats) = reducer.finish();
        let item = projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .find(|item| item.item_key == "tool:call-read")
            .expect("read tool item");
        assert!(details.is_empty());
        assert!(item.detail_ref.is_none());
        assert!(
            item.summary
                .as_deref()
                .unwrap_or_default()
                .contains("src/main.rs:10")
        );
        assert!(item.tool.as_ref().unwrap().output_bytes.unwrap_or_default() > 0);
        assert!(item.tool.as_ref().unwrap().output_sha256.is_some());
        assert_eq!(stats.detail_summary_only, 1);
    }

    #[test]
    fn failed_wrapper_output_keeps_full_diagnostic_detail() {
        let mut reducer = HistoryReducer::new(
            test_conversation(),
            "00000000-0000-0000-0000-000000000001".to_string(),
        );
        reducer.upsert_tool(
            "turn-1".to_string(),
            "call-failed-read",
            "custom_tool",
            Some("exec".to_string()),
            None,
            None,
            None,
            Some("completed".to_string()),
            None,
            1,
        );
        reducer.set_tool_commands(
            "call-failed-read",
            vec!["Get-Content missing.txt".to_string()],
        );
        reducer.complete_tool(
            "call-failed-read",
            None,
            "custom_tool",
            None,
            DetailInput {
                aggregated_output: Some(
                    "Script failed\nScript error:\nGet-Content : path not found\n".to_string(),
                ),
                ..Default::default()
            },
            Some("completed".to_string()),
            None,
            2,
        );
        let (projection, details, stats) = reducer.finish();
        let item = projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .find(|item| item.item_key == "tool:call-failed-read")
            .expect("failed tool item");
        assert_eq!(details.len(), 1);
        assert!(item.detail_ref.is_some());
        assert_eq!(stats.detail_full_retained, 1);
        assert_eq!(stats.detail_summary_only, 0);
    }

    #[test]
    fn successful_process_exit_marker_does_not_force_full_detail() {
        let detail = build_detail_payload(
            "detail:successful-process".to_string(),
            "custom_tool",
            DetailInput {
                aggregated_output: Some("Process exited with code 0".to_string()),
                ..Default::default()
            },
            false,
            false,
        );
        assert!(!detail_indicates_failure(&detail));
    }

    #[test]
    fn wait_final_output_is_merged_into_parent_exec_detail() {
        let mut reducer = HistoryReducer::new(
            test_conversation(),
            "00000000-0000-0000-0000-000000000001".to_string(),
        );
        reducer.upsert_tool(
            "turn-1".to_string(),
            "call-exec",
            "custom_tool",
            Some("exec".to_string()),
            None,
            None,
            None,
            Some("completed".to_string()),
            None,
            1,
        );
        reducer.set_tool_commands("call-exec", vec!["npm test".to_string()]);
        reducer.complete_tool(
            "call-exec",
            None,
            "custom_tool",
            None,
            DetailInput {
                aggregated_output: Some("Script running with cell ID 22".to_string()),
                ..Default::default()
            },
            Some("completed".to_string()),
            None,
            2,
        );
        reducer.upsert_tool(
            "turn-1".to_string(),
            "call-wait",
            "function_call",
            Some("wait".to_string()),
            None,
            Some(json!({"cell_id": "22", "yield_time_ms": 1000})),
            None,
            Some("completed".to_string()),
            None,
            3,
        );
        reducer.complete_tool(
            "call-wait",
            None,
            "function_call",
            None,
            DetailInput {
                aggregated_output: Some(
                    "Script completed\nExit code: 0\n2 tests passed".to_string(),
                ),
                ..Default::default()
            },
            Some("completed".to_string()),
            None,
            4,
        );
        let (projection, details, stats) = reducer.finish();
        let items: Vec<_> = projection
            .turns
            .iter()
            .flat_map(|turn| turn.items.iter())
            .collect();
        let parent = items
            .iter()
            .find(|item| item.item_key == "tool:call-exec")
            .expect("parent exec");
        assert!(!items.iter().any(|item| item.item_key == "tool:call-wait"));
        assert_eq!(details.len(), 1);
        assert!(parent.detail_ref.is_some());
        assert_eq!(stats.detail_full_retained, 1);
        assert_eq!(stats.dropped_by_kind.get("wait"), Some(&1));
        assert!(
            details[0]
                .canonical_output
                .as_deref()
                .unwrap_or_default()
                .contains("2 tests passed")
        );
    }
}
