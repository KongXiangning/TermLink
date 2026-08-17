//! History projection v5.
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
use std::io::Read;

use codex_protocol::models::{self, ContentItem, ResponseItem};
use codex_protocol::protocol::{EventMsg, RolloutItem};
use serde_json::{Value, json};
use sha2::Digest;

use crate::detail_store::DetailStore;
use crate::dto::{
    ApprovalDto, ArtifactDto, AttachmentDto, AvailabilityStatus, ConversationDto, DetailPayloadDto,
    FileChangeDto, HistoryBaseDto, HistoryItemDto, HistoryProjection, ParseProgressDto,
    PlanActionDto, PlanAnswerDto, PlanQuestionDto, PlanQuestionOptionDto, PlanSnapshotDto,
    PlanStepDto, SessionSettingsDto, SettingsSnapshotDto, SourceRefDto, TaskOutcomeDto,
    TaskOutcomeMetricsDto, ToolItemDto, TurnDto, UsageDto, WebSearchDto, WebSearchResultDto,
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
    pub detail_store_errors: u64,
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
    pub attachments_seen: u64,
    pub artifacts_seen: u64,
    pub file_changes_seen: u64,
    pub search_results_seen: u64,
    pub plan_actions_seen: u64,
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
    pending_approvals: HashMap<String, ApprovalDto>,
    detail_store: Option<Box<dyn DetailStore>>,
    detail_sizes: HashMap<String, u64>,
    /// Maps a host-side async cell id from an `exec` result to the original
    /// tool call. Later `wait` results are folded into that call instead of
    /// becoming independent durable details.
    running_cells: HashMap<String, String>,
    settings_hashes: HashSet<String>,
    latest_total_usage: Option<UsageDto>,
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
    current_plan_state: Option<String>,
    plan_version: u64,
    last_plan_item_key: Option<String>,
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
            pending_approvals: HashMap::new(),
            detail_store: None,
            detail_sizes: HashMap::new(),
            running_cells: HashMap::new(),
            settings_hashes: HashSet::new(),
            latest_total_usage: None,
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
            current_plan_state: None,
            plan_version: 0,
            last_plan_item_key: None,
        }
    }

    /// Create a reducer whose retained detail bodies are written to an
    /// external store instead of being kept in `details`.
    pub fn with_detail_store(
        conversation: ConversationDto,
        target_session_id: String,
        detail_store: Box<dyn DetailStore>,
    ) -> Self {
        let mut reducer = Self::new(conversation, target_session_id);
        reducer.detail_store = Some(detail_store);
        reducer
    }

    /// Pass reader-level quality information into the projection. A parse gap
    /// makes absent fields partial; an unmapped record means the current
    /// protocol schema cannot fully represent some source data.
    pub fn set_read_quality(&mut self, partial_rollout: bool, unsupported_schema: bool) {
        self.partial_rollout |= partial_rollout;
        self.unsupported_schema |= unsupported_schema;
        if self.partial_rollout {
            self.projection.conversation.availability = Some("partial_rollout".to_string());
        } else if self.unsupported_schema {
            self.projection.conversation.availability = Some("unsupported_schema".to_string());
        }
    }

    pub fn set_parse_progress(&mut self, progress: ParseProgressDto) {
        self.projection.conversation.parse_progress = Some(progress);
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
        self.aggregate_session_usage();
        let task_outcome = self.build_task_outcome();
        self.projection.task_outcome = Some(task_outcome.clone());
        self.add_task_outcome_item(&task_outcome);

        let using_detail_store = self.detail_store.is_some();
        if let Some(mut detail_store) = self.detail_store.take() {
            if let Err(error) = detail_store.finalize() {
                self.stats.detail_store_errors += 1;
                self.partial_rollout = true;
                self.projection.conversation.availability = Some("partial_rollout".to_string());
                self.projection.field_availability.insert(
                    "details.store".to_string(),
                    AvailabilityStatus::PartialRollout,
                );
                eprintln!("failed to finalize detail store: {error}");
            }
        }
        self.populate_field_availability();
        let stats = std::mem::take(&mut self.stats);
        let details = if using_detail_store {
            Vec::new()
        } else {
            self.details
        };
        (self.projection, details, stats)
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
        self.mark_always(
            &mut fields,
            "conversation.project_path",
            &conversation.project_path,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.endpoint",
            &conversation.endpoint,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.profile",
            &conversation.profile,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.settings",
            &conversation.settings,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.usage_total",
            &conversation.usage_total,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.latest_rate_limit",
            &conversation.latest_rate_limit,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.latest_context_window",
            &conversation.latest_context_window,
            false,
        );
        self.mark_always(
            &mut fields,
            "conversation.parse_progress",
            &conversation.parse_progress,
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
                    format!("{item_path}.correlation_id"),
                    &item.correlation_id,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.related_item_key"),
                    &item.related_item_key,
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
                    format!("{item_path}.phase"),
                    &item.phase,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.plan_state"),
                    &item.plan_state,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.plan"),
                    &item.plan,
                    turn_partial,
                );
                self.mark_optional(
                    &mut fields,
                    format!("{item_path}.plan_action"),
                    &item.plan_action,
                    turn_partial,
                );
                self.mark_always(
                    &mut fields,
                    format!("{item_path}.approval"),
                    &item.approval,
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
                    self.mark_always(
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
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.exit_code"),
                        &tool.exit_code,
                        turn_partial,
                    );
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.duration_ms"),
                        &tool.duration_ms,
                        turn_partial,
                    );
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.approval"),
                        &tool.approval,
                        turn_partial,
                    );
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.execution_status"),
                        &tool.execution_status,
                        turn_partial,
                    );
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.succeeded"),
                        &tool.succeeded,
                        turn_partial,
                    );
                    self.mark_always(
                        &mut fields,
                        format!("{tool_path}.approval_details"),
                        &tool.approval_details,
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
                if let Some(metrics) = &outcome.final_metrics {
                    self.mark_optional(
                        &mut fields,
                        "task_outcome.final_metrics.usage",
                        &metrics.usage,
                        outcome_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        "task_outcome.final_metrics.rate_limit",
                        &metrics.rate_limit,
                        outcome_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        "task_outcome.final_metrics.context_window",
                        &metrics.context_window,
                        outcome_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        "task_outcome.final_metrics.duration_ms",
                        &metrics.duration_ms,
                        outcome_partial,
                    );
                    self.mark_optional(
                        &mut fields,
                        "task_outcome.final_metrics.time_to_first_token_ms",
                        &metrics.time_to_first_token_ms,
                        outcome_partial,
                    );
                } else {
                    fields.insert(
                        "task_outcome.final_metrics".to_string(),
                        self.field_status(false, outcome_partial),
                    );
                }
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
        // Common optional fields stay sparse on complete rollouts to avoid
        // repeating the same provenance string for every transcript item.
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

    fn mark_always<T>(
        &self,
        fields: &mut BTreeMap<String, AvailabilityStatus>,
        path: impl Into<String>,
        value: &Option<T>,
        partial: bool,
    ) {
        if value.is_none() {
            fields.insert(path.into(), self.field_status(false, partial));
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
        // A target rollout can contain repeated target metadata (and can be
        // partially replayed while the file is still being written). Keep
        // the first target timestamp as the session creation time; later
        // metadata is an update, not a new session creation.
        if conversation.created_at.is_none() {
            conversation.created_at = non_empty(Some(meta.meta.timestamp.clone()));
        }
        conversation.source = format!("codex_rollout:{:?}", meta.meta.source).to_lowercase();
        conversation.updated_at = non_empty(Some(meta.meta.timestamp.clone()));
        true
    }

    fn aggregate_session_usage(&mut self) {
        let mut total = UsageDto::default();
        let mut present = false;
        let mut latest_rate_limit = None;
        let mut latest_context_window = None;
        for turn in &self.projection.turns {
            if let Some(usage) = &turn.usage {
                present = true;
                total.input_tokens += usage.input_tokens;
                total.cached_input_tokens += usage.cached_input_tokens;
                total.cache_write_input_tokens += usage.cache_write_input_tokens;
                total.output_tokens += usage.output_tokens;
                total.reasoning_output_tokens += usage.reasoning_output_tokens;
                total.total_tokens += usage.total_tokens;
            }
            if turn.rate_limit.is_some() {
                latest_rate_limit = turn.rate_limit.clone();
            }
            if turn.context_window.is_some() {
                latest_context_window = turn.context_window;
            }
        }
        // `last_token_usage` is the usage attributable to one turn. The
        // session-level value must instead use Codex's latest cumulative
        // `total_token_usage`; only fall back to a sum when the rollout has no
        // cumulative snapshot at all.
        self.projection.conversation.usage_total = self
            .latest_total_usage
            .clone()
            .or_else(|| present.then_some(total));
        self.projection.conversation.latest_rate_limit = latest_rate_limit;
        self.projection.conversation.latest_context_window = latest_context_window;
    }

    fn build_task_outcome(&mut self) -> TaskOutcomeDto {
        let final_turn_id = self
            .projection
            .turns
            .last()
            .map(|turn| turn.turn_id.clone());
        let final_turn_exists = final_turn_id.is_some();
        let final_turn_is_partial = self.projection.turns.last().is_some_and(|turn| {
            turn.status == "in_progress"
                || turn.status == "incomplete"
                || turn.availability.as_deref() == Some("partial_rollout")
        });
        let provisional = self.partial_rollout || final_turn_is_partial;
        let conclusion_item = self.projection.turns.last().and_then(|turn| {
            turn.items.iter().rev().find(|item| {
                item.kind == "assistant_message"
                    && item.visible
                    && item
                        .content
                        .as_deref()
                        .is_some_and(|text| !text.trim().is_empty())
            })
        });
        let conclusion_item_key = conclusion_item.map(|item| item.item_key.clone());
        let conclusion = conclusion_item.and_then(|item| item.content.clone());
        let (status, error) = self
            .projection
            .turns
            .last()
            .map(|turn| {
                (
                    turn.outcome.clone().unwrap_or_else(|| turn.status.clone()),
                    turn.error.clone(),
                )
            })
            .unwrap_or_else(|| ("unknown".to_string(), None));
        let final_metrics = self
            .projection
            .turns
            .last()
            .map(|turn| TaskOutcomeMetricsDto {
                usage: turn.usage.clone(),
                rate_limit: turn.rate_limit.clone(),
                context_window: turn.context_window,
                duration_ms: turn.duration_ms,
                time_to_first_token_ms: turn.time_to_first_token_ms,
            });
        let mut source_item_keys = Vec::new();
        if let Some(item_key) = conclusion_item_key {
            push_unique(&mut source_item_keys, item_key);
        }
        let mut modified_files = Vec::new();
        let mut modified_file_changes = Vec::new();
        let mut tool_item_keys = Vec::new();
        let mut file_change_item_keys = Vec::new();
        let mut validation_item_keys = Vec::new();
        let mut risks = Vec::new();
        let mut unfinished_items = Vec::new();
        let mut file_change_items = Vec::new();
        for turn in &self.projection.turns {
            for item in &turn.items {
                if item.tool.is_some() {
                    push_unique(&mut tool_item_keys, item.item_key.clone());
                    push_unique(&mut source_item_keys, item.item_key.clone());
                }
                if item.kind == "file_change" {
                    push_unique(&mut source_item_keys, item.item_key.clone());
                    push_unique(&mut file_change_item_keys, item.item_key.clone());
                    if let Some(tool) = &item.tool {
                        for change in &tool.file_changes {
                            push_unique(&mut modified_files, change.path.clone());
                            push_unique_change(&mut modified_file_changes, change.clone());
                            if let Some(move_path) = &change.move_path {
                                push_unique(&mut modified_files, move_path.clone());
                            }
                        }
                    }
                    file_change_items.push(item.clone());
                }
                if is_validation_item(item) {
                    push_unique(&mut source_item_keys, item.item_key.clone());
                    push_unique(&mut validation_item_keys, item.item_key.clone());
                }
                if item
                    .tool
                    .as_ref()
                    .and_then(|tool| tool.execution_status.as_deref())
                    .is_some_and(|status| matches!(status, "failed" | "declined"))
                {
                    if let Some(summary) = &item.summary {
                        push_unique(&mut risks, summary.clone());
                    } else {
                        push_unique(&mut risks, format!("tool {} failed", item.item_key));
                    }
                }
                if item
                    .tool
                    .as_ref()
                    .and_then(|tool| tool.execution_status.as_deref())
                    .is_some_and(|status| status == "in_progress")
                {
                    push_unique(&mut unfinished_items, item.item_key.clone());
                }
            }
        }
        for item in file_change_items {
            for path in self.modified_files_for_item(&item) {
                push_unique(&mut modified_files, path);
            }
        }
        for turn in &self.projection.turns {
            if turn.status == "incomplete" {
                push_unique(&mut unfinished_items, turn.turn_id.clone());
            }
            if let Some(error) = &turn.error {
                push_unique(&mut risks, error.clone());
            }
        }
        let availability = if provisional {
            "partial_rollout"
        } else if final_turn_exists && conclusion.is_some() {
            "present"
        } else {
            "not_recoverable_from_rollout"
        };
        let follow_up_suggestions = conclusion
            .as_deref()
            .map(extract_follow_up_suggestions)
            .unwrap_or_default();
        TaskOutcomeDto {
            status,
            final_turn_id,
            conclusion,
            error,
            source_item_keys,
            modified_files,
            modified_file_changes,
            tool_item_keys,
            file_change_item_keys,
            validation_item_keys,
            risks,
            unfinished_items,
            follow_up_suggestions,
            plan_state: self.current_plan_state.clone(),
            availability: availability.to_string(),
            provisional,
            final_metrics,
        }
    }

    fn modified_files_for_item(&mut self, item: &HistoryItemDto) -> Vec<String> {
        if let Some(detail_ref) = &item.detail_ref {
            let detail = if self.detail_store.is_some() {
                self.load_detail(detail_ref)
            } else {
                self.details
                    .iter()
                    .find(|detail| &detail.detail_ref == detail_ref)
                    .cloned()
            };
            if let Some(detail) = detail {
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

    fn load_detail(&mut self, detail_ref: &str) -> Option<DetailPayloadDto> {
        let result = self
            .detail_store
            .as_mut()
            .map(|store| store.get(detail_ref));
        match result {
            Some(Ok(detail)) => detail,
            Some(Err(error)) => {
                self.stats.detail_store_errors += 1;
                self.partial_rollout = true;
                eprintln!("failed to read detail {detail_ref}: {error}");
                None
            }
            None => None,
        }
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
                summary: Some(if outcome.provisional {
                    format!("status={}, provisional=true", outcome.status)
                } else {
                    format!("status={}", outcome.status)
                }),
                availability: Some(outcome.availability.clone()),
                plan_state: outcome.plan_state.clone(),
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
        self.record_session_settings(&snapshot, &hash, payload_type);
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

    fn record_session_settings(&mut self, snapshot: &Value, hash: &str, source: &str) {
        let mut settings = session_settings_from_value(snapshot);
        settings.settings_hash = Some(hash.to_string());
        if settings.model.is_some() {
            self.projection.conversation.model = settings.model.clone();
        }
        if settings.model_provider.is_some() {
            self.projection.conversation.model_provider = settings.model_provider.clone();
        }
        if settings.cwd.is_some() {
            self.projection.conversation.cwd = settings.cwd.clone();
        }
        if settings.endpoint.is_some() {
            self.projection.conversation.endpoint = settings.endpoint.clone();
        }
        if settings.profile.is_some() {
            self.projection.conversation.profile = settings.profile.clone();
        }
        if let Some(project_path) = snapshot
            .get("project_path")
            .or_else(|| snapshot.get("projectPath"))
            .and_then(Value::as_str)
        {
            self.projection.conversation.project_path = Some(project_path.to_string());
        }
        self.projection.conversation.settings = Some(settings.clone());
        self.projection
            .conversation
            .settings_history
            .push(SettingsSnapshotDto {
                content_hash: hash.to_string(),
                captured_at: self.current_timestamp.clone(),
                source: source.to_string(),
                settings,
            });
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
                        item_key: item_key.clone(),
                        turn_id,
                        kind: "assistant_message".to_string(),
                        visible: true,
                        content: Some(text),
                        phase: phase
                            .as_ref()
                            .map(|phase| format!("{phase:?}").to_lowercase()),
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
                        phase: None,
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
                let effective_call_id = if call_id.is_empty() {
                    format!("anonymous:{ordinal}")
                } else {
                    call_id.clone()
                };
                self.upsert_tool(
                    turn_id.clone(),
                    &effective_call_id,
                    "function_call",
                    Some(name.clone()),
                    None,
                    Some(arguments.clone()),
                    None,
                    None,
                    None,
                    ordinal,
                );
                if is_request_user_input_name(&name) {
                    match parse_response_plan_questions(&arguments) {
                        Some(questions) if !questions.is_empty() => {
                            self.apply_plan_questions(
                                &effective_call_id,
                                turn_id,
                                questions,
                                ordinal,
                                "function_call",
                            );
                        }
                        _ => {
                            // Keep the original function_call for provenance,
                            // but do not pretend that an unsupported payload
                            // is a structured Plan question.
                            self.unsupported_schema = true;
                            self.drop_kind("request_user_input_unparsed");
                        }
                    }
                }
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
                if self.apply_plan_answer(call_id, &output_text, ordinal) {
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
                if is_shell_wrapper_name(name)
                    && normalized.tool_name.is_none()
                    && normalized.command.is_none()
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
                let normalized_cwd = normalized
                    .arguments
                    .as_ref()
                    .and_then(extract_cwd_from_arguments)
                    .or_else(|| {
                        is_shell_wrapper_name(name)
                            .then(|| {
                                extract_js_named_string(input, "cwd")
                                    .or_else(|| extract_js_named_string(input, "workdir"))
                                    .or_else(|| extract_js_named_string(input, "working_directory"))
                            })
                            .flatten()
                    });
                let tool_name = match normalized.tool_name.clone() {
                    Some(_tool_name)
                        if is_shell_wrapper_name(name) && normalized.commands.is_some() =>
                    {
                        Some("shell_command".to_string())
                    }
                    Some(tool_name) => Some(tool_name),
                    None if normalized.commands.is_some() => Some("shell_command".to_string()),
                    None => Some(qualified_name(namespace.as_deref(), name)),
                };
                self.upsert_tool(
                    turn_id,
                    call_id,
                    "custom_tool",
                    tool_name,
                    normalized.command,
                    normalized.arguments,
                    normalized_cwd,
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
            } => {
                let output_text = output.body.to_text().unwrap_or_default();
                if self.apply_plan_answer(call_id, &output_text, ordinal) {
                    return;
                }
                self.complete_tool(
                    call_id,
                    None,
                    "custom_tool",
                    name.clone()
                        .map(|name| normalized_shell_tool_name(&name).to_string()),
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
                    query.clone(),
                    None,
                    None,
                    None,
                    status.clone(),
                    None,
                    ordinal,
                );
                self.set_tool_web_search(
                    &call_id,
                    WebSearchDto {
                        query: query.clone(),
                        action: action
                            .as_ref()
                            .and_then(|action| serde_json::to_value(action).ok()),
                        results: Vec::new(),
                    },
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
                self.set_tool_artifact(
                    &call_id,
                    ArtifactDto {
                        kind: "image_generation".to_string(),
                        reference: None,
                        content: Some(result.clone()),
                        content_hash: Some(sha256_hex(result.as_bytes())),
                        size_bytes: Some(result.len() as u64),
                        mime_type: Some("image/*".to_string()),
                        availability: "present".to_string(),
                    },
                );
                self.stats.artifacts_seen += 1;
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
                    self.latest_total_usage = Some(usage_from_token_usage(&info.total_token_usage));
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
                let attachments = attachments_from_user_event(payload);
                self.stats.attachments_seen += attachments.len() as u64;
                self.upsert_item(
                    turn_id.clone(),
                    HistoryItemDto {
                        item_key: item_key.clone(),
                        turn_id: turn_id.clone(),
                        kind: "user_message".to_string(),
                        visible: true,
                        content: Some(payload.message.clone()),
                        attachments,
                        source_ref: Some(self.source_ref(ordinal, "user_message")),
                        ..Default::default()
                    },
                );
                self.record_plan_action(&turn_id, &item_key, &payload.message, ordinal);
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
                            phase: payload
                                .phase
                                .as_ref()
                                .map(|phase| format!("{phase:?}").to_lowercase()),
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
                self.set_tool_file_changes(
                    &payload.call_id,
                    file_changes_from_value(
                        &serde_json::to_value(&payload.changes).unwrap_or(Value::Null),
                    ),
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
                self.set_tool_file_changes(
                    &payload.call_id,
                    file_changes_from_value(
                        &serde_json::to_value(&payload.changes).unwrap_or(Value::Null),
                    ),
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
                self.set_tool_web_search(
                    &payload.call_id,
                    WebSearchDto {
                        query: Some(payload.query.clone()),
                        action: Some(serde_json::to_value(&payload.action).unwrap_or(Value::Null)),
                        results: payload
                            .results
                            .as_ref()
                            .map(|results| web_search_results_from_values(results))
                            .unwrap_or_default(),
                    },
                );
            }
            EventMsg::RequestUserInput(payload) => self.apply_user_questions(payload, ordinal),
            EventMsg::ImageGenerationBegin(payload) => {
                let turn_id = self.current_or_synthetic_turn(ordinal);
                self.upsert_tool(
                    turn_id,
                    &payload.call_id,
                    "image_generation",
                    Some("image_generation".to_string()),
                    None,
                    None,
                    None,
                    Some("in_progress".to_string()),
                    None,
                    ordinal,
                );
            }
            EventMsg::ImageGenerationEnd(payload) => {
                self.complete_tool(
                    &payload.call_id,
                    None,
                    "image_generation",
                    Some("image_generation".to_string()),
                    DetailInput {
                        result: Some(json!({
                            "result": payload.result,
                            "revised_prompt": payload.revised_prompt,
                            "saved_path": payload.saved_path,
                        })),
                        ..Default::default()
                    },
                    Some(payload.status.clone()),
                    None,
                    ordinal,
                );
                self.set_tool_artifact(
                    &payload.call_id,
                    ArtifactDto {
                        kind: "image_generation".to_string(),
                        reference: payload
                            .saved_path
                            .as_ref()
                            .map(|path| path.display().to_string()),
                        content: Some(payload.result.clone()),
                        content_hash: Some(sha256_hex(payload.result.as_bytes())),
                        size_bytes: Some(payload.result.len() as u64),
                        mime_type: None,
                        availability: "present".to_string(),
                    },
                );
                self.stats.artifacts_seen += 1;
            }
            EventMsg::ViewImageToolCall(payload) => {
                let turn_id = self.current_or_synthetic_turn(ordinal);
                self.upsert_tool(
                    turn_id,
                    &payload.call_id,
                    "image_view",
                    Some("view_image".to_string()),
                    None,
                    None,
                    None,
                    Some("completed".to_string()),
                    None,
                    ordinal,
                );
                self.set_tool_artifact(
                    &payload.call_id,
                    ArtifactDto {
                        kind: "image".to_string(),
                        reference: Some(payload.path.to_string()),
                        content: None,
                        content_hash: None,
                        size_bytes: None,
                        mime_type: Some("image/*".to_string()),
                        availability: "present".to_string(),
                    },
                );
                self.stats.artifacts_seen += 1;
            }
            EventMsg::ExecApprovalRequest(payload) => {
                self.apply_exec_approval(payload, ordinal);
            }
            EventMsg::ApplyPatchApprovalRequest(payload) => {
                self.apply_patch_approval(payload, ordinal);
            }
            EventMsg::RequestPermissions(payload) => {
                self.apply_permissions_approval(payload, ordinal);
            }
            EventMsg::GuardianAssessment(payload) => {
                self.apply_guardian_assessment(payload, ordinal);
            }
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
                    let plan = self.next_plan_snapshot(&value);
                    self.current_plan_state = Some(plan.state.clone());
                    self.last_plan_item_key = Some("plan:final".to_string());
                    self.upsert_item(
                        turn_id.clone(),
                        HistoryItemDto {
                            item_key: "plan:final".to_string(),
                            turn_id,
                            kind: "plan".to_string(),
                            visible: true,
                            content: Some(text),
                            summary: Some("plan final snapshot".to_string()),
                            plan_state: Some(plan.state.clone()),
                            plan: Some(plan),
                            source_ref: Some(self.source_ref(ordinal, "plan_update")),
                            ..Default::default()
                        },
                    );
                }
            }
            EventMsg::SessionConfigured(payload) => {
                let value = serde_json::to_value(payload).unwrap_or(Value::Null);
                let hash = sha256_hex(compact_json(&value).as_bytes());
                if self.settings_hashes.insert(hash.clone()) {
                    self.record_session_settings(&value, &hash, "session_configured");
                } else {
                    self.drop_kind("duplicate_settings_snapshot");
                }
                if let Some(endpoint) = value.get("endpoint").and_then(Value::as_str) {
                    self.projection.conversation.endpoint = Some(endpoint.to_string());
                }
                if let Some(profile) = value.get("profile").and_then(Value::as_str) {
                    self.projection.conversation.profile = Some(profile.to_string());
                }
                self.drop_kind("session_configured_marker");
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
            | EventMsg::EnvironmentConnected(_)
            | EventMsg::EnvironmentDisconnected(_)
            | EventMsg::ThreadGoalUpdated(_)
            | EventMsg::McpStartupUpdate(_)
            | EventMsg::McpStartupComplete(_)
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
            | EventMsg::RealtimeConversationListVoicesResponse(_) => {
                self.apply_generic_or_approval_event(event)
            }
        }
    }

    fn apply_generic_or_approval_event(&mut self, event: &EventMsg) {
        let kind = event_type(event);
        match event {
            _ => self.drop_kind(&kind),
        }
    }

    fn apply_exec_approval(
        &mut self,
        payload: &codex_protocol::protocol::ExecApprovalRequestEvent,
        ordinal: u64,
    ) {
        let approval = ApprovalDto {
            request_id: Some(payload.effective_approval_id()),
            call_id: Some(payload.call_id.clone()),
            approval_kind: "exec".to_string(),
            command: Some(payload.command.clone()),
            cwd: Some(payload.cwd.display().to_string()),
            reason: payload.reason.clone(),
            available_decisions: payload
                .effective_available_decisions()
                .iter()
                .map(|decision| decision.to_opaque_string().to_string())
                .collect(),
            decision: None,
            result_status: None,
            requested_at_ms: Some(payload.started_at_ms),
            resolved_at_ms: None,
            availability: "present".to_string(),
            details: serde_json::to_value(payload).ok(),
        };
        self.store_approval(
            payload.turn_id.as_str(),
            &payload.call_id,
            approval,
            ordinal,
        );
    }

    fn apply_patch_approval(
        &mut self,
        payload: &codex_protocol::protocol::ApplyPatchApprovalRequestEvent,
        ordinal: u64,
    ) {
        let approval = ApprovalDto {
            request_id: Some(payload.call_id.clone()),
            call_id: Some(payload.call_id.clone()),
            approval_kind: "file_change".to_string(),
            command: None,
            cwd: None,
            reason: payload.reason.clone(),
            available_decisions: vec!["approved".to_string(), "abort".to_string()],
            decision: None,
            result_status: None,
            requested_at_ms: Some(payload.started_at_ms),
            resolved_at_ms: None,
            availability: "present".to_string(),
            details: serde_json::to_value(payload).ok(),
        };
        self.store_approval(
            payload.turn_id.as_str(),
            &payload.call_id,
            approval,
            ordinal,
        );
    }

    fn apply_permissions_approval(
        &mut self,
        payload: &codex_protocol::request_permissions::RequestPermissionsEvent,
        ordinal: u64,
    ) {
        let approval = ApprovalDto {
            request_id: Some(payload.call_id.clone()),
            call_id: Some(payload.call_id.clone()),
            approval_kind: "permissions".to_string(),
            command: None,
            cwd: payload.cwd.as_ref().map(|cwd| cwd.display().to_string()),
            reason: payload.reason.clone(),
            available_decisions: vec!["approved".to_string(), "abort".to_string()],
            decision: None,
            result_status: None,
            requested_at_ms: Some(payload.started_at_ms),
            resolved_at_ms: None,
            availability: "present".to_string(),
            details: serde_json::to_value(payload).ok(),
        };
        self.store_approval(
            payload.turn_id.as_str(),
            &payload.call_id,
            approval,
            ordinal,
        );
    }

    fn apply_guardian_assessment(
        &mut self,
        payload: &codex_protocol::protocol::GuardianAssessmentEvent,
        ordinal: u64,
    ) {
        let status = format!("{:?}", payload.status).to_lowercase();
        let approval = ApprovalDto {
            request_id: Some(payload.id.clone()),
            call_id: payload.target_item_id.clone(),
            approval_kind: "guardian".to_string(),
            command: None,
            cwd: None,
            reason: payload.rationale.clone(),
            available_decisions: Vec::new(),
            decision: Some(status.clone()),
            result_status: Some(status),
            requested_at_ms: Some(payload.started_at_ms),
            resolved_at_ms: payload.completed_at_ms,
            availability: "present".to_string(),
            details: serde_json::to_value(payload).ok(),
        };
        let call_id = payload.target_item_id.as_deref().unwrap_or(&payload.id);
        self.store_approval(&payload.turn_id, call_id, approval, ordinal);
    }

    fn store_approval(
        &mut self,
        turn_id: &str,
        call_id: &str,
        approval: ApprovalDto,
        ordinal: u64,
    ) {
        self.stats.approvals_seen += 1;
        self.pending_approvals
            .insert(call_id.to_string(), approval.clone());
        let turn_id = if turn_id.is_empty() {
            self.current_or_synthetic_turn(ordinal)
        } else {
            self.target_turn(Some(turn_id), ordinal)
        };
        let approval_key = format!(
            "approval:{}",
            approval.request_id.as_deref().unwrap_or(call_id)
        );
        self.upsert_item(
            turn_id.clone(),
            HistoryItemDto {
                item_key: approval_key,
                turn_id: turn_id.clone(),
                kind: "approval_request".to_string(),
                presentation_kind: Some("approval".to_string()),
                visible: false,
                content: approval.reason.clone(),
                summary: Some(format!("approval request: {}", approval.approval_kind)),
                approval: Some(approval.clone()),
                source_ref: Some(self.source_ref(ordinal, "approval_request")),
                ..Default::default()
            },
        );
        self.update_tool(call_id, |tool| {
            tool.approval_details = Some(approval.clone());
            tool.approval = serde_json::to_value(&approval).ok();
        });
    }

    fn update_approval_result(
        &mut self,
        call_id: &str,
        status: Option<&str>,
        exit_code: Option<i32>,
    ) {
        let Some(approval) = self.pending_approvals.get_mut(call_id) else {
            return;
        };
        let result_status = execution_status_from_status(status, exit_code);
        if result_status.is_none() {
            return;
        }
        approval.result_status = result_status.clone();
        approval.resolved_at_ms = self
            .current_timestamp
            .as_deref()
            .and_then(parse_timestamp_ms);
        let updated = approval.clone();
        self.update_tool(call_id, |tool| {
            tool.approval_details = Some(updated.clone());
            tool.approval = serde_json::to_value(&updated).ok();
        });
        let approval_key = format!(
            "approval:{}",
            updated.request_id.as_deref().unwrap_or(call_id)
        );
        for turn in &mut self.projection.turns {
            if let Some(item) = turn
                .items
                .iter_mut()
                .find(|item| item.item_key == approval_key)
            {
                item.approval = Some(updated.clone());
                item.summary = Some(format!(
                    "approval request: {}, result={}",
                    updated.approval_kind,
                    updated.result_status.as_deref().unwrap_or("unknown")
                ));
                recompute_hash(item);
            }
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
                let attachments =
                    attachments_from_user_input_value(value.get("content").unwrap_or(&Value::Null));
                self.stats.attachments_seen += attachments.len() as u64;
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
                        attachments,
                        source_ref: Some(self.source_ref(ordinal, "item_completed")),
                        ..Default::default()
                    },
                );
                if let Some(item_key) = id
                    .map(|id| format!("message:{id}"))
                    .or_else(|| Some(format!("item:user:{ordinal}")))
                {
                    self.record_plan_action(
                        turn_id,
                        &item_key,
                        &collect_text(&value["content"]),
                        ordinal,
                    );
                }
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
                        phase: value
                            .get("phase")
                            .and_then(Value::as_str)
                            .map(str::to_string),
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
                let plan = self.next_plan_snapshot(&json!({
                    "plan": [{"step": text, "status": "pending"}]
                }));
                self.current_plan_state = Some(plan.state.clone());
                self.last_plan_item_key = Some(
                    value
                        .get("id")
                        .and_then(Value::as_str)
                        .map(|id| format!("plan:{id}"))
                        .unwrap_or_else(|| "plan:final".to_string()),
                );
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
                        plan_state: Some(plan.state.clone()),
                        plan: Some(plan),
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
                    .map(str::to_string)
                    .unwrap_or_else(|| format!("{kind}:{ordinal}"));
                if kind == "image_view" {
                    self.upsert_tool(
                        turn_id.to_string(),
                        &id,
                        "image_view",
                        Some("view_image".to_string()),
                        None,
                        None,
                        None,
                        Some("completed".to_string()),
                        None,
                        ordinal,
                    );
                    self.set_tool_artifact(&id, artifact_from_value(kind, &value));
                    self.stats.artifacts_seen += 1;
                } else {
                    self.upsert_item(
                        turn_id.to_string(),
                        HistoryItemDto {
                            item_key: format!("tool:{id}"),
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
        let command = value.get("command").and_then(command_vec_from_value);
        let arguments = value
            .get("arguments")
            .cloned()
            .or_else(|| value.get("changes").cloned());
        let cwd = value
            .get("cwd")
            .or_else(|| value.get("workdir"))
            .or_else(|| value.get("working_directory"))
            .map(value_to_string);
        let status = value.get("status").map(value_to_string);
        let exit_code = value
            .get("exit_code")
            .or_else(|| value.get("exitCode"))
            .and_then(integer_from_value)
            .map(|value| value as i32);
        let duration_ms = value
            .get("duration_ms")
            .or_else(|| value.get("durationMs"))
            .or_else(|| value.get("duration"))
            .and_then(duration_ms_from_value);
        self.upsert_tool(
            turn_id.to_string(),
            id,
            tool_kind,
            name,
            command,
            arguments,
            cwd,
            status.clone(),
            None,
            ordinal,
        );
        if let Some(commands) = value.get("commands").and_then(value_to_string_vec) {
            self.set_tool_commands(id, commands);
        }
        if let Some(changes) = value.get("changes").map(file_changes_from_value) {
            self.set_tool_file_changes(id, changes);
        }
        if kind == "web_search" {
            self.set_tool_web_search(id, web_search_from_value(value));
        }
        if kind == "image_generation" || kind == "image_view" {
            self.set_tool_artifact(id, artifact_from_value(kind, value));
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
        } else {
            self.update_tool(id, |tool| {
                if exit_code.is_some() {
                    tool.exit_code = exit_code;
                }
                if duration_ms.is_some() {
                    tool.duration_ms = duration_ms;
                }
                tool.execution_status = execution_status_from_status(status.as_deref(), exit_code);
                tool.succeeded = succeeded_from_status(status.as_deref(), exit_code);
            });
        }
    }

    fn apply_user_questions(
        &mut self,
        payload: &codex_protocol::request_user_input::RequestUserInputEvent,
        ordinal: u64,
    ) {
        let turn_id = self.target_turn(Some(&payload.turn_id), ordinal);
        let questions = payload
            .questions
            .iter()
            .map(|question| PlanQuestionDto {
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
            })
            .collect();
        self.apply_plan_questions(
            &payload.call_id,
            turn_id,
            questions,
            ordinal,
            "request_user_input",
        );
    }

    fn next_plan_snapshot(&mut self, value: &Value) -> PlanSnapshotDto {
        self.plan_version += 1;
        let steps = value
            .get("plan")
            .and_then(Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        Some(PlanStepDto {
                            step: item.get("step").and_then(Value::as_str)?.to_string(),
                            status: item
                                .get("status")
                                .and_then(Value::as_str)
                                .unwrap_or("pending")
                                .to_string(),
                        })
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let state = plan_state_from_steps(&steps);
        PlanSnapshotDto {
            state,
            explanation: value
                .get("explanation")
                .and_then(Value::as_str)
                .map(str::to_string),
            version: self.plan_version,
            steps,
        }
    }

    fn record_plan_action(
        &mut self,
        turn_id: &str,
        source_item_key: &str,
        text: &str,
        ordinal: u64,
    ) {
        let Some(action) = classify_plan_action(text) else {
            return;
        };
        let action_key = format!("plan-action:{source_item_key}");
        let related_item_key = self.last_plan_item_key.clone();
        if action == "cancel" {
            self.current_plan_state = Some("cancelled".to_string());
        } else if matches!(action.as_str(), "confirm" | "continue") {
            self.current_plan_state = Some("executing".to_string());
        }
        self.upsert_item(
            turn_id.to_string(),
            HistoryItemDto {
                item_key: action_key,
                turn_id: turn_id.to_string(),
                kind: "plan_action".to_string(),
                visible: true,
                content: Some(text.to_string()),
                summary: Some(format!("plan action: {action}")),
                plan_state: self.current_plan_state.clone(),
                related_item_key: related_item_key.clone(),
                plan_action: Some(PlanActionDto {
                    action,
                    source: "user_message".to_string(),
                    value: Some(text.to_string()),
                    related_item_key,
                }),
                source_ref: Some(self.source_ref(ordinal, "plan_action")),
                ..Default::default()
            },
        );
        self.stats.plan_actions_seen += 1;
    }

    fn apply_plan_questions(
        &mut self,
        call_id: &str,
        turn_id: String,
        questions: Vec<PlanQuestionDto>,
        ordinal: u64,
        payload_type: &str,
    ) {
        self.current_plan_state = Some("awaiting_input".to_string());
        let mut item_keys = Vec::new();
        for question in questions {
            let key = format!("question:{call_id}:{}", question.id);
            self.upsert_item(
                turn_id.clone(),
                HistoryItemDto {
                    item_key: key.clone(),
                    turn_id: turn_id.clone(),
                    kind: "plan_question".to_string(),
                    visible: true,
                    content: Some(question.question.clone()),
                    summary: Some(question.header.clone()),
                    plan_state: Some("awaiting_input".to_string()),
                    correlation_id: Some(call_id.to_string()),
                    question: Some(question),
                    source_ref: Some(self.source_ref(ordinal, payload_type)),
                    ..Default::default()
                },
            );
            item_keys.push(key);
        }
        if !item_keys.is_empty() {
            self.pending_questions
                .insert(call_id.to_string(), PendingQuestion { turn_id, item_keys });
            self.stats.plan_questions_seen += self
                .pending_questions
                .get(call_id)
                .map_or(0, |pending| pending.item_keys.len() as u64);
        }
    }

    fn apply_plan_answer(&mut self, call_id: &str, text: &str, ordinal: u64) -> bool {
        let Some(pending) = self.pending_questions.get(call_id).cloned() else {
            return false;
        };
        let answer_map = parse_plan_answers(text);
        let mut answered = 0u64;
        let mut remaining_item_keys = Vec::new();
        for item_key in &pending.item_keys {
            let question_id = self
                .find_item(&pending.turn_id, item_key)
                .and_then(|item| item.question.as_ref())
                .map(|question| question.id.clone())
                .unwrap_or_default();
            let answers = answer_map
                .as_ref()
                .and_then(|map| map.get(&question_id).cloned())
                .or_else(|| {
                    (answer_map.is_none()
                        && pending.item_keys.len() == 1
                        && !text.trim().is_empty())
                    .then(|| vec![text.to_string()])
                });
            if let Some(answers) = answers {
                self.attach_plan_answer(call_id, &pending.turn_id, item_key, answers, ordinal);
                answered += 1;
            } else {
                remaining_item_keys.push(item_key.clone());
            }
        }
        if answered == 0 {
            // Keep the question pending when the output is not a recognizable
            // answer. The raw function-call output is then retained by the
            // normal tool path instead of silently advancing the Plan state.
            return false;
        }
        if remaining_item_keys.is_empty() {
            self.pending_questions.remove(call_id);
            self.current_plan_state = Some("executing".to_string());
        } else if let Some(pending_question) = self.pending_questions.get_mut(call_id) {
            pending_question.item_keys = remaining_item_keys;
            self.current_plan_state = Some("awaiting_input".to_string());
        }
        // A request_user_input function call is a transport representation of
        // the Plan question, not an independent executable tool. Mark that
        // wrapper complete and remove its pending tool state once its output
        // has been projected as plan_answer items.
        self.update_tool(call_id, |tool| tool.status = Some("completed".to_string()));
        self.pending_tools.remove(call_id);
        self.stats.plan_answers_seen += answered;
        true
    }

    fn attach_plan_answer(
        &mut self,
        call_id: &str,
        turn_id: &str,
        question_item_key: &str,
        answers: Vec<String>,
        ordinal: u64,
    ) {
        let Some(question_id) = self
            .find_item(turn_id, question_item_key)
            .and_then(|item| item.question.as_ref())
            .map(|question| question.id.clone())
        else {
            return;
        };
        let answer_key = format!("answer:{call_id}:{question_id}");
        let answer_dto = PlanAnswerDto {
            answers: answers.clone(),
            action: Some("submit".to_string()),
        };
        self.upsert_item(
            turn_id.to_string(),
            HistoryItemDto {
                item_key: answer_key.clone(),
                turn_id: turn_id.to_string(),
                kind: "plan_answer".to_string(),
                visible: true,
                content: Some(answers.join("\n")),
                summary: Some("user answer".to_string()),
                plan_state: Some("executing".to_string()),
                correlation_id: Some(call_id.to_string()),
                related_item_key: Some(question_item_key.to_string()),
                answer: Some(answer_dto.clone()),
                source_ref: Some(self.source_ref(ordinal, "function_call_output")),
                ..Default::default()
            },
        );
        if let Some(item) = self.find_item_mut(turn_id, question_item_key) {
            // In schema v5 the answer is intentionally not duplicated on the
            // question item. The independent plan_answer item is canonical;
            // older v3 snapshots remain readable through serde defaults.
            item.related_item_key = Some(answer_key.clone());
            item.plan_state = Some("answered".to_string());
            recompute_hash(item);
        }
        if let Some(item) = self.find_item_mut(turn_id, &answer_key) {
            item.related_item_key = Some(question_item_key.to_string());
            recompute_hash(item);
        }
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
        let cwd = cwd.or_else(|| arguments.as_ref().and_then(extract_cwd_from_arguments));
        let approval_details = self.pending_approvals.get(&call_id).cloned();
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
            let display_command = command_display(command.as_deref(), None);
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
                        call_id: Some(call_id.clone()),
                        tool_name,
                        command,
                        commands: None,
                        display_command,
                        arguments,
                        cwd,
                        status: status.clone(),
                        execution_status: execution_status_from_status(status.as_deref(), None),
                        succeeded: succeeded_from_status(status.as_deref(), None),
                        exit_code: None,
                        duration_ms: None,
                        approval,
                        approval_details,
                        output_bytes: None,
                        output_sha256: None,
                        file_changes: Vec::new(),
                        artifact: None,
                        web_search: None,
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
        let inferred = infer_execution_metadata(&detail);
        let status = merge_execution_status(status, inferred.status.clone());
        let exit_code = exit_code.or(inferred.exit_code);
        let duration_ms = inferred.duration_ms;
        let failure_reason = if execution_status_from_status(status.as_deref(), exit_code)
            .is_some_and(|status| matches!(status.as_str(), "failed" | "declined"))
        {
            failure_reason_from_detail(&detail)
        } else {
            None
        };
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
            status.clone(),
            None,
            ordinal,
        );
        if let Some(exit_code) = exit_code {
            self.update_tool(call_id, |tool| tool.exit_code = Some(exit_code));
        }
        if let Some(duration_ms) = duration_ms {
            self.update_tool(call_id, |tool| tool.duration_ms = Some(duration_ms));
        }
        let execution_status = execution_status_from_status(status.as_deref(), exit_code);
        let succeeded = succeeded_from_status(status.as_deref(), exit_code);
        self.update_tool(call_id, |tool| {
            if execution_status.is_some() {
                tool.execution_status = execution_status.clone();
            }
            if succeeded.is_some() {
                tool.succeeded = succeeded;
            }
        });
        if let Some(reason) = failure_reason {
            if let Some(item) = self.find_tool_item_mut(call_id) {
                let name = item
                    .tool
                    .as_ref()
                    .and_then(|tool| tool.tool_name.as_deref())
                    .unwrap_or(tool_kind);
                item.summary = Some(format!(
                    "{name} failed{}",
                    if reason.is_empty() {
                        String::new()
                    } else {
                        format!(": {reason}")
                    }
                ));
                recompute_hash(item);
            }
        }
        if detail.has_payload() {
            self.retain_tool_detail(call_id, tool_kind, detail);
        }
        self.update_approval_result(call_id, status.as_deref(), exit_code);
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
        let previous_bytes = self
            .detail_sizes
            .insert(detail_ref.clone(), serialized_bytes);
        if let Some(store) = self.detail_store.as_mut() {
            if let Err(error) = store.upsert(&detail) {
                self.stats.detail_store_errors += 1;
                self.partial_rollout = true;
                eprintln!("failed to persist detail {detail_ref}: {error}");
            }
        } else {
            if let Some(index) = self
                .details
                .iter()
                .position(|item| item.detail_ref == detail_ref)
            {
                self.details[index] = detail;
            } else {
                self.details.push(detail);
            }
        }
        if previous_bytes.is_none() {
            self.stats.detail_payloads += 1;
        }
        self.stats.detail_bytes = self
            .stats
            .detail_bytes
            .saturating_sub(previous_bytes.unwrap_or(0))
            .saturating_add(serialized_bytes);
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
            if let Some(previous_bytes) = self.detail_sizes.remove(&detail_ref) {
                self.stats.detail_payloads = self.stats.detail_payloads.saturating_sub(1);
                self.stats.detail_bytes = self.stats.detail_bytes.saturating_sub(previous_bytes);
            }
            if let Some(store) = self.detail_store.as_mut() {
                if let Err(error) = store.remove(&detail_ref) {
                    self.stats.detail_store_errors += 1;
                    self.partial_rollout = true;
                    eprintln!("failed to remove detail {detail_ref}: {error}");
                }
            } else if let Some(index) = self
                .details
                .iter()
                .position(|detail| detail.detail_ref == detail_ref)
            {
                self.details.remove(index);
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
                tool.display_command =
                    command_display(tool.command.as_deref(), tool.commands.as_deref());
            }
            recompute_hash(item);
            self.stats.commands_normalized += 1;
        }
    }

    fn set_tool_file_changes(&mut self, call_id: &str, changes: Vec<FileChangeDto>) {
        if changes.is_empty() {
            return;
        }
        self.update_tool(call_id, |tool| {
            let status = tool.status.clone();
            tool.file_changes = changes
                .into_iter()
                .map(|mut change| {
                    if change.status.is_none() {
                        change.status = status.clone();
                    }
                    change
                })
                .collect();
        });
        self.stats.file_changes_seen += 1;
    }

    fn set_tool_artifact(&mut self, call_id: &str, artifact: ArtifactDto) {
        self.update_tool(call_id, |tool| tool.artifact = Some(artifact));
    }

    fn set_tool_web_search(&mut self, call_id: &str, search: WebSearchDto) {
        self.stats.search_results_seen += search.results.len() as u64;
        self.update_tool(call_id, |tool| tool.web_search = Some(search));
    }

    fn upsert_item(&mut self, turn_id: String, mut item: HistoryItemDto) {
        item.turn_id = turn_id.clone();
        if item.tool.is_some() && item.presentation_kind.is_none() {
            item.presentation_kind = Some("tool".to_string());
        }
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

fn is_shell_wrapper_name(name: &str) -> bool {
    matches!(name, "exec" | "shell_command" | "exec_command")
}

fn normalized_shell_tool_name(name: &str) -> &str {
    if is_shell_wrapper_name(name) {
        "shell_command"
    } else {
        name
    }
}

fn is_request_user_input_name(name: &str) -> bool {
    name.rsplit('.').next() == Some("request_user_input")
}

/// `ResponseItem::FunctionCall` stores request_user_input arguments as an
/// opaque JSON string rather than the typed EventMsg payload. Decode only the
/// stable fields needed by the history contract and fail closed when the
/// question id/text is absent.
fn parse_response_plan_questions(arguments: &Value) -> Option<Vec<PlanQuestionDto>> {
    let questions = arguments.get("questions")?.as_array()?;
    let mut parsed = Vec::with_capacity(questions.len());
    for question in questions {
        let object = question.as_object()?;
        let id = object.get("id").and_then(Value::as_str)?.to_string();
        let header = object
            .get("header")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let text = object.get("question").and_then(Value::as_str)?.to_string();
        let is_other = object
            .get("isOther")
            .or_else(|| object.get("is_other"))
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let is_secret = object
            .get("isSecret")
            .or_else(|| object.get("is_secret"))
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let options = object
            .get("options")
            .and_then(Value::as_array)
            .map(|options| {
                options
                    .iter()
                    .filter_map(|option| {
                        let option = option.as_object()?;
                        Some(PlanQuestionOptionDto {
                            label: option
                                .get("label")
                                .and_then(Value::as_str)
                                .unwrap_or_default()
                                .to_string(),
                            description: option
                                .get("description")
                                .and_then(Value::as_str)
                                .unwrap_or_default()
                                .to_string(),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        parsed.push(PlanQuestionDto {
            id,
            header,
            question: text,
            is_other,
            is_secret,
            options,
        });
    }
    Some(parsed)
}

fn parse_plan_answers(text: &str) -> Option<BTreeMap<String, Vec<String>>> {
    let value = serde_json::from_str::<Value>(text).ok()?;
    let answers = value.get("answers")?.as_object()?;
    Some(
        answers
            .iter()
            .map(|(question_id, value)| {
                let values = value
                    .get("answers")
                    .and_then(Value::as_array)
                    .map(|answers| {
                        answers
                            .iter()
                            .filter_map(Value::as_str)
                            .map(str::to_string)
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                (question_id.clone(), values)
            })
            .collect(),
    )
}

fn normalize_custom_tool_invocation(name: &str, input: &str) -> NormalizedToolInvocation {
    if name == "exec" {
        let tool_name = extract_nested_tool_name(input);
        if let Some(nested_name) = tool_name
            .as_deref()
            .filter(|nested_name| matches!(*nested_name, "shell_command" | "exec_command"))
        {
            // The host often records `tools.shell_command`/`tools.exec_command`
            // inside an outer `exec` JavaScript call. Normalize the nested
            // operation as a shell invocation; otherwise the outer branch
            // would preserve `{cmd: ...}` or the whole wrapper as arguments.
            return normalize_shell_wrapper_invocation(nested_name, input);
        }
        let arguments = tool_name
            .as_deref()
            .and_then(|name| extract_nested_tool_arguments(input, name));
        let commands = extract_exec_commands(input);
        return NormalizedToolInvocation {
            commands: (!commands.is_empty()).then_some(commands),
            arguments,
            tool_name,
            ..Default::default()
        };
    }

    if is_shell_wrapper_name(name) {
        return normalize_shell_wrapper_invocation(name, input);
    }

    NormalizedToolInvocation {
        arguments: Some(
            serde_json::from_str(input).unwrap_or_else(|_| Value::String(input.to_string())),
        ),
        ..Default::default()
    }
}

fn normalize_shell_wrapper_invocation(_name: &str, input: &str) -> NormalizedToolInvocation {
    let parsed = serde_json::from_str::<Value>(input).ok();
    let mut arguments = parsed
        .as_ref()
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let mut commands = Vec::new();

    for key in ["command", "cmd"] {
        if let Some(value) = arguments.get(key) {
            if let Some(values) = command_vec_from_value(value) {
                for value in values {
                    push_shell_command(&mut commands, value);
                }
            }
        } else if let Some(value) = extract_js_named_string(input, key) {
            push_shell_command(&mut commands, value);
        }
        arguments.remove(key);
    }

    // The app-server shell wrappers are sometimes serialized as a JavaScript
    // object literal rather than JSON. Recover only named operational fields;
    // never put the original wrapper source into durable arguments.
    if commands.is_empty() {
        for value in extract_exec_commands(input) {
            push_shell_command(&mut commands, value);
        }
    }
    for key in ["cwd", "workdir", "working_directory"] {
        if !arguments.contains_key(key) {
            if let Some(value) = extract_js_named_string(input, key) {
                arguments.insert(key.to_string(), Value::String(value));
                break;
            }
        }
    }
    for key in ["timeout_ms", "max_output_tokens", "yield_time_ms"] {
        if !arguments.contains_key(key) {
            if let Some(value) = extract_js_named_integer(input, key) {
                arguments.insert(key.to_string(), Value::Number(value.into()));
            }
        }
    }

    let has_commands = !commands.is_empty();
    if !has_commands {
        // A shell wrapper with no recoverable command is only protocol glue;
        // do not retain its cwd/timeout object as a misleading tool item.
        return NormalizedToolInvocation::default();
    }
    NormalizedToolInvocation {
        commands: has_commands.then_some(commands),
        arguments: (!arguments.is_empty()).then_some(Value::Object(arguments)),
        tool_name: has_commands.then(|| "shell_command".to_string()),
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

/// A value explicitly supplied as a `command`/`cmd` property is already
/// identified by the host as an executable operation. Do not apply the
/// heuristic used for scanning arbitrary JavaScript source; otherwise simple
/// commands such as `echo ok` would be lost.
fn push_shell_command(commands: &mut Vec<String>, value: String) {
    let value = value.trim().to_string();
    if !value.is_empty() && value.len() <= 16_384 && !commands.iter().any(|item| item == &value) {
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
    if incoming.presentation_kind.is_some() {
        existing.presentation_kind = incoming.presentation_kind;
    }
    if incoming.content.is_some() {
        existing.content = incoming.content;
    }
    if incoming.summary.is_some() {
        existing.summary = incoming.summary;
    }
    if incoming.phase.is_some() {
        existing.phase = incoming.phase;
    }
    if incoming.correlation_id.is_some() {
        existing.correlation_id = incoming.correlation_id;
    }
    if incoming.related_item_key.is_some() {
        existing.related_item_key = incoming.related_item_key;
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
    if incoming.plan_state.is_some() {
        existing.plan_state = incoming.plan_state;
    }
    if incoming.plan.is_some() {
        existing.plan = incoming.plan;
    }
    if incoming.plan_action.is_some() {
        existing.plan_action = incoming.plan_action;
    }
    if !incoming.attachments.is_empty() {
        existing.attachments = incoming.attachments;
    }
    if incoming.approval.is_some() {
        existing.approval = incoming.approval;
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
    let command_changed = incoming.command.is_some();
    let commands_changed = incoming.commands.is_some();
    if incoming.tool_kind != "function_call" {
        existing.tool_kind = incoming.tool_kind;
    }
    if incoming.call_id.is_some() {
        existing.call_id = incoming.call_id;
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
    if let Some(incoming_command) = incoming.command {
        existing.command = Some(incoming_command);
    }
    if let Some(incoming_commands) = incoming.commands {
        existing.commands = Some(incoming_commands);
    }
    if let Some(incoming_display_command) = incoming.display_command {
        existing.display_command = Some(incoming_display_command);
    } else if command_changed || commands_changed {
        existing.display_command =
            command_display(existing.command.as_deref(), existing.commands.as_deref());
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
    if incoming.execution_status.is_some() {
        existing.execution_status = incoming.execution_status;
    }
    if incoming.succeeded.is_some() {
        existing.succeeded = incoming.succeeded;
    }
    if incoming.approval_details.is_some() {
        existing.approval_details = incoming.approval_details;
    }
    if !incoming.file_changes.is_empty() {
        existing.file_changes = incoming.file_changes;
    }
    if incoming.artifact.is_some() {
        existing.artifact = incoming.artifact;
    }
    if incoming.web_search.is_some() {
        existing.web_search = incoming.web_search;
    }
}

fn command_display(command: Option<&[String]>, commands: Option<&[String]>) -> Option<String> {
    let parts = commands
        .filter(|commands| !commands.is_empty())
        .map(|commands| commands.join("\n"))
        .or_else(|| {
            command
                .filter(|command| !command.is_empty())
                .map(|command| command.join(" "))
        });
    parts.filter(|text| !text.trim().is_empty())
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

fn integer_from_value(value: &Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_u64().and_then(|value| i64::try_from(value).ok()))
        .or_else(|| {
            value
                .as_str()
                .and_then(|value| value.trim().parse::<i64>().ok())
        })
}

fn command_vec_from_value(value: &Value) -> Option<Vec<String>> {
    if let Some(command) = value.as_str() {
        return (!command.trim().is_empty()).then(|| vec![command.to_string()]);
    }
    value
        .as_array()
        .map(|items| items.iter().map(value_to_string).collect::<Vec<_>>())
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

fn session_settings_from_value(value: &Value) -> SessionSettingsDto {
    let collaboration_mode = value.get("collaboration_mode").cloned();
    let collaboration_settings = collaboration_mode
        .as_ref()
        .and_then(|mode| mode.get("settings"));
    SessionSettingsDto {
        model: value
            .get("model")
            .and_then(Value::as_str)
            .or_else(|| {
                collaboration_settings
                    .and_then(|settings| settings.get("model"))
                    .and_then(Value::as_str)
            })
            .map(str::to_string),
        model_provider: value
            .get("model_provider_id")
            .or_else(|| value.get("model_provider"))
            .and_then(Value::as_str)
            .map(str::to_string),
        cwd: value.get("cwd").and_then(Value::as_str).map(str::to_string),
        service_tier: value
            .get("service_tier")
            .and_then(Value::as_str)
            .map(str::to_string),
        endpoint: value
            .get("endpoint")
            .and_then(Value::as_str)
            .map(str::to_string),
        profile: value
            .get("profile")
            .and_then(Value::as_str)
            .map(str::to_string),
        plan_mode: collaboration_mode
            .as_ref()
            .and_then(|mode| mode.get("mode"))
            .and_then(Value::as_str)
            .map(str::to_string),
        reasoning_effort: value
            .get("reasoning_effort")
            .or_else(|| value.get("effort"))
            .and_then(Value::as_str)
            .or_else(|| {
                collaboration_settings
                    .and_then(|settings| settings.get("reasoning_effort"))
                    .and_then(Value::as_str)
            })
            .map(str::to_string),
        collaboration_mode,
        approval_policy: value.get("approval_policy").cloned(),
        approvals_reviewer: value.get("approvals_reviewer").cloned(),
        sandbox_policy: value.get("sandbox_policy").cloned(),
        permission_profile: value.get("permission_profile").cloned(),
        active_permission_profile: value.get("active_permission_profile").cloned(),
        settings_hash: None,
    }
}

fn attachments_from_user_event(
    payload: &codex_protocol::protocol::UserMessageEvent,
) -> Vec<AttachmentDto> {
    let mut attachments = Vec::new();
    if let Some(images) = &payload.images {
        for (index, image) in images.iter().enumerate() {
            attachments.push(attachment_from_reference(
                "image",
                image,
                payload
                    .image_details
                    .get(index)
                    .and_then(|detail| detail.as_ref())
                    .and_then(|detail| serde_json::to_string(detail).ok()),
            ));
        }
    }
    for (index, path) in payload.local_images.iter().enumerate() {
        attachments.push(attachment_from_path(
            "image",
            path,
            payload
                .local_image_details
                .get(index)
                .and_then(|detail| detail.as_ref())
                .and_then(|detail| serde_json::to_string(detail).ok()),
        ));
    }
    if let Some(audio) = &payload.audio {
        for reference in audio {
            attachments.push(attachment_from_reference("audio", reference, None));
        }
    }
    for path in &payload.local_audio {
        attachments.push(attachment_from_path("audio", path, None));
    }
    attachments
}

fn attachments_from_user_input_value(value: &Value) -> Vec<AttachmentDto> {
    let mut attachments = Vec::new();
    let Some(items) = value.as_array() else {
        return attachments;
    };
    for item in items {
        let Some(kind) = item.get("type").and_then(Value::as_str) else {
            continue;
        };
        match kind {
            "image" => {
                if let Some(reference) = item.get("image_url").and_then(Value::as_str) {
                    attachments.push(attachment_from_reference(
                        "image",
                        reference,
                        item.get("detail")
                            .and_then(|detail| serde_json::to_string(detail).ok()),
                    ));
                }
            }
            "local_image" => {
                if let Some(path) = item.get("path").and_then(Value::as_str) {
                    attachments.push(attachment_from_reference(
                        "image",
                        path,
                        item.get("detail")
                            .and_then(|detail| serde_json::to_string(detail).ok()),
                    ));
                }
            }
            "audio" => {
                if let Some(reference) = item.get("audio_url").and_then(Value::as_str) {
                    attachments.push(attachment_from_reference("audio", reference, None));
                }
            }
            "local_audio" => {
                if let Some(path) = item.get("path").and_then(Value::as_str) {
                    attachments.push(attachment_from_reference("audio", path, None));
                }
            }
            "skill" | "mention" => {
                if let Some(reference) = item
                    .get("path")
                    .or_else(|| item.get("name"))
                    .and_then(Value::as_str)
                {
                    attachments.push(attachment_from_reference(kind, reference, None));
                }
            }
            _ => {}
        }
    }
    attachments
}

fn attachment_from_reference(kind: &str, reference: &str, detail: Option<String>) -> AttachmentDto {
    if std::path::Path::new(reference).is_file() {
        return attachment_from_path(kind, std::path::Path::new(reference), detail);
    }
    AttachmentDto {
        kind: kind.to_string(),
        reference: reference.to_string(),
        detail,
        content_hash: None,
        size_bytes: None,
        mime_type: mime_type_from_reference(reference),
        availability: "present".to_string(),
    }
}

fn attachment_from_path(
    kind: &str,
    path: &std::path::Path,
    detail: Option<String>,
) -> AttachmentDto {
    let (size_bytes, content_hash) = file_metadata(path);
    AttachmentDto {
        kind: kind.to_string(),
        reference: path.to_string_lossy().to_string(),
        detail,
        content_hash,
        size_bytes,
        mime_type: mime_type_from_reference(&path.to_string_lossy()),
        availability: "present".to_string(),
    }
}

fn file_metadata(path: &std::path::Path) -> (Option<u64>, Option<String>) {
    let size = std::fs::metadata(path).ok().map(|metadata| metadata.len());
    let Ok(mut file) = std::fs::File::open(path) else {
        return (size, None);
    };
    let mut hasher = sha2::Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        match file.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => hasher.update(&buffer[..read]),
            Err(_) => return (size, None),
        }
    }
    (size, Some(crate::dto::hex::encode(&hasher.finalize())))
}

fn mime_type_from_reference(reference: &str) -> Option<String> {
    let lower = reference.to_ascii_lowercase();
    let value = if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".m4a") {
        "audio/mp4"
    } else {
        return None;
    };
    Some(value.to_string())
}

fn file_changes_from_value(value: &Value) -> Vec<FileChangeDto> {
    let Some(object) = value.as_object() else {
        return Vec::new();
    };
    object
        .iter()
        .map(|(path, change)| {
            let change_type = change
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or("update")
                .to_string();
            FileChangeDto {
                path: path.clone(),
                change_type,
                move_path: change
                    .get("move_path")
                    .or_else(|| change.get("movePath"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
                diff: change
                    .get("unified_diff")
                    .or_else(|| change.get("content"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
                status: None,
            }
        })
        .collect()
}

fn web_search_from_value(value: &Value) -> WebSearchDto {
    WebSearchDto {
        query: value
            .get("query")
            .and_then(Value::as_str)
            .map(str::to_string),
        action: value.get("action").cloned(),
        results: value
            .get("results")
            .and_then(Value::as_array)
            .map(|results| web_search_results_from_values(results))
            .unwrap_or_default(),
    }
}

fn web_search_results_from_values(values: &[Value]) -> Vec<WebSearchResultDto> {
    values
        .iter()
        .map(|value| WebSearchResultDto {
            url: value
                .get("url")
                .or_else(|| value.get("link"))
                .or_else(|| value.get("source_url"))
                .and_then(Value::as_str)
                .map(str::to_string),
            title: value
                .get("title")
                .and_then(Value::as_str)
                .map(str::to_string),
            snippet: value
                .get("snippet")
                .or_else(|| value.get("description"))
                .or_else(|| value.get("text"))
                .and_then(Value::as_str)
                .map(str::to_string),
            domain: value
                .get("domain")
                .and_then(Value::as_str)
                .map(str::to_string),
            ref_id: value
                .get("ref_id")
                .or_else(|| value.get("refId"))
                .and_then(Value::as_str)
                .map(str::to_string),
            metadata: value.as_object().map(|object| {
                object
                    .iter()
                    .filter(|(key, _)| {
                        !matches!(
                            key.as_str(),
                            "url"
                                | "link"
                                | "source_url"
                                | "title"
                                | "snippet"
                                | "description"
                                | "text"
                                | "domain"
                                | "ref_id"
                                | "refId"
                        )
                    })
                    .map(|(key, value)| (key.clone(), value.clone()))
                    .collect::<serde_json::Map<_, _>>()
                    .into()
            }),
        })
        .collect()
}

fn artifact_from_value(kind: &str, value: &Value) -> ArtifactDto {
    let reference = value
        .get("path")
        .or_else(|| value.get("saved_path"))
        .or_else(|| value.get("savedPath"))
        .and_then(Value::as_str)
        .map(str::to_string);
    let content = value
        .get("result")
        .and_then(Value::as_str)
        .map(str::to_string);
    let (size_bytes, content_hash) = reference
        .as_deref()
        .map(|path| file_metadata(std::path::Path::new(path)))
        .unwrap_or_else(|| {
            content
                .as_deref()
                .map(|content| {
                    (
                        Some(content.len() as u64),
                        Some(sha256_hex(content.as_bytes())),
                    )
                })
                .unwrap_or((None, None))
        });
    ArtifactDto {
        kind: kind.to_string(),
        reference,
        content,
        content_hash,
        size_bytes,
        mime_type: Some(
            if kind == "image_view" {
                "image/*"
            } else {
                "application/octet-stream"
            }
            .to_string(),
        ),
        availability: "present".to_string(),
    }
}

fn plan_state_from_steps(steps: &[PlanStepDto]) -> String {
    if steps.is_empty() {
        return "planning".to_string();
    }
    if steps
        .iter()
        .all(|step| step.status.eq_ignore_ascii_case("completed"))
    {
        "completed".to_string()
    } else if steps
        .iter()
        .any(|step| step.status.eq_ignore_ascii_case("in_progress"))
    {
        "executing".to_string()
    } else {
        "planning".to_string()
    }
}

fn classify_plan_action(text: &str) -> Option<String> {
    let normalized = text.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return None;
    }
    if ["取消", "取消计划", "cancel", "stop", "no", "否"].contains(&normalized.as_str()) {
        return Some("cancel".to_string());
    }
    if ["确认", "确认执行", "执行", "yes", "approve", "开始执行"].contains(&normalized.as_str())
    {
        return Some("confirm".to_string());
    }
    if ["继续", "继续执行", "continue", "proceed", "go"].contains(&normalized.as_str()) {
        return Some("continue".to_string());
    }
    None
}

fn extract_follow_up_suggestions(text: &str) -> Vec<String> {
    text.lines()
        .map(str::trim)
        .filter(|line| {
            let lower = line.to_ascii_lowercase();
            line.contains("后续")
                || line.contains("下一步")
                || lower.contains("follow-up")
                || lower.contains("next step")
        })
        .map(|line| truncate_text(line, 512))
        .collect()
}

#[derive(Debug, Default)]
struct ExecutionMetadata {
    status: Option<String>,
    exit_code: Option<i32>,
    duration_ms: Option<i64>,
}

fn infer_execution_metadata(detail: &DetailInput) -> ExecutionMetadata {
    let mut texts = Vec::new();
    if let Some(text) = &detail.aggregated_output {
        texts.push(text.as_str());
    }
    if let Some(text) = &detail.stdout {
        texts.push(text.as_str());
    }
    if let Some(text) = &detail.stderr {
        texts.push(text.as_str());
    }
    if let Some(text) = &detail.formatted_output {
        texts.push(text.as_str());
    }
    let joined = texts.join("\n");
    let lower = joined.to_ascii_lowercase();
    let exit_code = parse_number_after_markers(
        &joined,
        &[
            "exit code:",
            "exit code ",
            "process exited with code ",
            "code:",
        ],
    )
    .map(|value| value as i32);
    let duration_ms = parse_duration_from_output(&joined);
    let status = if lower.contains("script failed")
        || lower.contains("command failed")
        || lower.contains("script error")
        || exit_code.is_some_and(|code| code != 0)
    {
        Some("failed".to_string())
    } else if lower.contains("script completed") || exit_code == Some(0) {
        Some("success".to_string())
    } else {
        None
    };
    ExecutionMetadata {
        status,
        exit_code,
        duration_ms,
    }
}

fn failure_reason_from_detail(detail: &DetailInput) -> Option<String> {
    [
        &detail.stderr,
        &detail.stdout,
        &detail.aggregated_output,
        &detail.formatted_output,
    ]
    .into_iter()
    .flatten()
    .flat_map(|text| text.lines())
    .map(str::trim)
    .find(|line| !line.is_empty())
    .map(|line| truncate_text(line, 512))
}

fn parse_number_after_markers(text: &str, markers: &[&str]) -> Option<i64> {
    for line in text.lines() {
        let lower = line.to_ascii_lowercase();
        for marker in markers {
            let Some(position) = lower.find(marker) else {
                continue;
            };
            let rest = line[position + marker.len()..].trim_start_matches([':', ' ']);
            let digits = rest
                .chars()
                .take_while(|character| character.is_ascii_digit() || *character == '-')
                .collect::<String>();
            if !digits.is_empty() {
                if let Ok(value) = digits.parse() {
                    return Some(value);
                }
            }
        }
    }
    None
}

fn parse_duration_from_output(text: &str) -> Option<i64> {
    for line in text.lines() {
        let lower = line.to_ascii_lowercase();
        let Some(position) = lower.find("wall time") else {
            continue;
        };
        let rest = line[position + "wall time".len()..]
            .trim()
            .trim_end_matches("seconds")
            .trim();
        if let Ok(seconds) = rest.parse::<f64>() {
            return Some((seconds * 1000.0).round() as i64);
        }
    }
    None
}

fn merge_execution_status(current: Option<String>, inferred: Option<String>) -> Option<String> {
    match (current, inferred) {
        (Some(_current), Some(inferred)) if inferred == "failed" || inferred == "declined" => {
            Some(inferred)
        }
        (Some(current), _) => Some(current),
        (None, Some(inferred)) => Some(if inferred == "success" {
            "completed".to_string()
        } else {
            inferred
        }),
        (None, None) => None,
    }
}

fn execution_status_from_status(status: Option<&str>, exit_code: Option<i32>) -> Option<String> {
    if let Some(exit_code) = exit_code {
        return Some(if exit_code == 0 {
            "success".to_string()
        } else {
            "failed".to_string()
        });
    }
    let status = status?.to_ascii_lowercase();
    if status.contains("declin") || status.contains("abort") {
        Some("declined".to_string())
    } else if status.contains("fail") || status.contains("error") {
        Some("failed".to_string())
    } else if status.contains("progress") || status.contains("running") {
        Some("in_progress".to_string())
    } else if status.contains("complete") || status == "success" || status == "succeeded" {
        Some("success".to_string())
    } else {
        Some("unknown".to_string())
    }
}

fn succeeded_from_status(status: Option<&str>, exit_code: Option<i32>) -> Option<bool> {
    execution_status_from_status(status, exit_code).map(|status| status == "success")
}

fn extract_cwd_from_arguments(arguments: &Value) -> Option<String> {
    arguments
        .get("cwd")
        .or_else(|| arguments.get("workdir"))
        .or_else(|| arguments.get("working_directory"))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn push_unique_change(values: &mut Vec<FileChangeDto>, value: FileChangeDto) {
    if !values.iter().any(|existing| {
        existing.path == value.path
            && existing.change_type == value.change_type
            && existing.move_path == value.move_path
            && existing.diff == value.diff
    }) {
        values.push(value);
    }
}

fn parse_timestamp_ms(_timestamp: &str) -> Option<i64> {
    // The DTO intentionally keeps source timestamps as ISO-8601 strings. The
    // approval timestamp is optional; do not fabricate an epoch when the demo
    // has no date-time dependency available.
    None
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
            project_path: None,
            git_info: None,
            model: None,
            model_provider: None,
            endpoint: None,
            profile: None,
            settings: None,
            settings_history: Vec::new(),
            usage_total: None,
            latest_rate_limit: None,
            latest_context_window: None,
            parse_progress: None,
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
        let arguments = normalized.arguments.expect("nested shell arguments");
        assert_eq!(
            arguments.get("workdir").and_then(Value::as_str),
            Some("E:\\proj")
        );
        assert_eq!(
            arguments.get("timeout_ms").and_then(Value::as_i64),
            Some(30000)
        );
        assert!(!arguments.to_string().contains("tools.shell_command"));

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
    fn shell_command_wrapper_normalizes_json_command_without_wrapper_source() {
        let normalized = normalize_custom_tool_invocation(
            "shell_command",
            r#"{"cmd":"Get-Content src/main.rs","workdir":"E:\\proj","timeout_ms":30000}"#,
        );
        assert_eq!(normalized.tool_name.as_deref(), Some("shell_command"));
        assert_eq!(
            normalized.commands,
            Some(vec!["Get-Content src/main.rs".to_string()])
        );
        let arguments = normalized.arguments.expect("structured shell arguments");
        assert!(arguments.get("cmd").is_none());
        assert_eq!(
            arguments.get("workdir").and_then(Value::as_str),
            Some("E:\\proj")
        );
        assert_eq!(
            arguments.get("timeout_ms").and_then(Value::as_i64),
            Some(30000)
        );
        assert!(!arguments.to_string().contains("Get-Content src/main.rs"));
    }

    #[test]
    fn shell_command_wrapper_accepts_object_literal_and_simple_command() {
        let normalized = normalize_custom_tool_invocation(
            "exec_command",
            r#"{command: "echo ok", cwd: "E:\\proj", yield_time_ms: 1000}"#,
        );
        assert_eq!(normalized.tool_name.as_deref(), Some("shell_command"));
        assert_eq!(normalized.commands, Some(vec!["echo ok".to_string()]));
        let arguments = normalized.arguments.expect("structured shell arguments");
        assert_eq!(
            arguments.get("cwd").and_then(Value::as_str),
            Some("E:\\proj")
        );
        assert_eq!(
            arguments.get("yield_time_ms").and_then(Value::as_i64),
            Some(1000)
        );
        assert!(!arguments.to_string().contains("command"));
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
