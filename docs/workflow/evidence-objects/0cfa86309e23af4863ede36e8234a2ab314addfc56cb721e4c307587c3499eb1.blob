//! Codex semantic adapter. All vendor types stop at `crate::codex_wire`.

use std::cell::RefCell;
use std::collections::{BTreeSet, HashMap, VecDeque};
use std::fmt::Debug;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::codex_wire::{
    CompatibilityProfile, DecodedRecord, RolloutItem, TurnItem, UnknownRecord, WireAvailability,
    models, plan_tool, protocol, request_user_input,
};
use crate::error::CollectorErrorKind;
use crate::model::{
    AnalysisEvent, Availability, EventMetadata, IdentityOrigin, PlanOption, PlanStep, SourceRef,
    TerminalEvidence, TurnStatus,
};
use crate::source::{HistoryBaseRef, SourceRecord, safe_source_identity};

#[derive(Debug, Clone)]
pub struct CodexEventAdapter {
    profile: CompatibilityProfile,
    configured_conversation_id: Option<String>,
    state: RefCell<AdapterState>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct AdapterState {
    pending_plans: VecDeque<PendingPlan>,
    active_turn_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PendingPlan {
    call_id: String,
    turn_id: Option<String>,
    question_ids: BTreeSet<String>,
    answered: bool,
}

impl CodexEventAdapter {
    pub fn new(profile: CompatibilityProfile) -> Self {
        Self::new_with_conversation_id(profile, None)
    }

    /// Create an adapter bound to an explicit caller-selected conversation.
    ///
    /// The explicit binding always wins over a session metadata ID.  When no
    /// binding is supplied, the first session metadata record provides a
    /// recoverable native fallback for the rest of this adapter stream.
    pub fn new_with_conversation_id(
        profile: CompatibilityProfile,
        conversation_id: Option<String>,
    ) -> Self {
        let configured_conversation_id = conversation_id
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        Self {
            profile,
            configured_conversation_id,
            state: RefCell::new(AdapterState::default()),
        }
    }

    pub fn profile(&self) -> CompatibilityProfile {
        self.profile
    }

    /// Serialize only the small TermLink-owned adapter state that is needed
    /// to continue a segmented stream.  Native Codex values never cross this
    /// checkpoint boundary.
    pub fn checkpoint_state(&self) -> Value {
        serde_json::to_value(self.state.borrow().clone())
            .expect("adapter checkpoint state is serializable")
    }

    /// Restore pending Plan questions and active-turn context after an
    /// analyzer process restart.  Invalid state is rejected instead of being
    /// silently treated as an empty adapter.
    pub fn restore_checkpoint_state(&self, value: &Value) -> anyhow::Result<()> {
        let restored: AdapterState = serde_json::from_value(value.clone())
            .map_err(|error| anyhow::anyhow!("invalid adapter checkpoint state: {error}"))?;
        *self.state.borrow_mut() = restored;
        Ok(())
    }

    pub fn adapt(&self, record: &SourceRecord, decoded: DecodedRecord) -> Vec<AnalysisEvent> {
        let mut events = match decoded {
            DecodedRecord::Known(known) => {
                self.adapt_known(record, &known.line.item, known.history_base.as_ref())
            }
            DecodedRecord::Unknown(unknown) => vec![self.adapt_unknown(record, unknown)],
        };
        self.finalize_events(&mut events);
        events
    }

    fn finalize_events(&self, events: &mut [AnalysisEvent]) {
        let active_turn_id = self.state.borrow().active_turn_id.clone();
        let conversation_id = self.configured_conversation_id.clone();

        for (index, event) in events.iter_mut().enumerate() {
            let event_type = event.event_type();
            let is_session = matches!(event, AnalysisEvent::SessionContext { .. });
            let (item_key, identity_origin, related_item_key) = logical_identity(event, index);
            let metadata = event.metadata_mut();
            if metadata.conversation_id.is_none() {
                metadata.conversation_id = conversation_id.clone();
            }
            if metadata.turn_id.is_none() && !is_session {
                metadata.turn_id = active_turn_id.clone();
            }
            metadata.item_key = item_key;
            metadata.identity_origin = identity_origin;
            metadata.related_item_key = related_item_key;
            metadata.event_id = event_identity(metadata, event_type, index);
        }

        if events
            .iter()
            .any(|event| matches!(event, AnalysisEvent::TurnCompleted { .. }))
        {
            self.state.borrow_mut().active_turn_id = None;
        }
    }

    fn adapt_unknown(&self, record: &SourceRecord, unknown: UnknownRecord) -> AnalysisEvent {
        let availability = map_availability(unknown.availability);
        let error_kind = CollectorErrorKind::from_wire_reason(unknown.reason.as_str());
        let metadata = metadata(record, error_kind.event_type(), 0, None, None, availability);
        if error_kind.is_parse_gap() {
            AnalysisEvent::ParseGap {
                metadata,
                reason: format!(
                    "{}{}",
                    unknown.reason.as_str(),
                    unknown
                        .type_name
                        .as_deref()
                        .map(|value| format!(":{value}"))
                        .unwrap_or_default()
                ),
            }
        } else {
            AnalysisEvent::UnknownEvent {
                metadata,
                raw_type: unknown.type_name,
                reason: unknown.reason.as_str().to_string(),
            }
        }
    }

    fn adapt_known(
        &self,
        record: &SourceRecord,
        item: &RolloutItem,
        history_base: Option<&HistoryBaseRef>,
    ) -> Vec<AnalysisEvent> {
        match item {
            RolloutItem::SessionMeta(payload) => self.adapt_session(record, payload, history_base),
            RolloutItem::ResponseItem(payload) => self.adapt_response_item(record, &payload.item),
            RolloutItem::EventMsg(payload) => self.adapt_event_msg(record, payload),
            RolloutItem::Compacted(payload) => self.single_compaction(record, &payload.message),
            RolloutItem::TurnContext(_) => {
                vec![self.diagnostic(record, "recognized_context", Some("turn_context"), 0)]
            }
            RolloutItem::WorldState(_) => {
                vec![self.diagnostic(record, "recognized_context", Some("world_state"), 0)]
            }
            RolloutItem::SecurityRiskScore(_) => {
                vec![self.diagnostic(record, "recognized_context", Some("security_risk_score"), 0)]
            }
            RolloutItem::InterAgentCommunication(_) => vec![self.diagnostic(
                record,
                "inter_agent_record",
                Some("inter_agent_communication"),
                0,
            )],
            RolloutItem::InterAgentCommunicationMetadata { .. } => vec![self.diagnostic(
                record,
                "inter_agent_record",
                Some("inter_agent_communication_metadata"),
                0,
            )],
        }
    }

    fn adapt_session(
        &self,
        record: &SourceRecord,
        payload: &protocol::SessionMetaLine,
        history_base: Option<&HistoryBaseRef>,
    ) -> Vec<AnalysisEvent> {
        let session_id = payload.meta.id.to_string();
        vec![AnalysisEvent::SessionContext {
            metadata: metadata(
                record,
                "session_context",
                0,
                Some(session_id.clone()),
                None,
                Availability::Present,
            ),
            session_id: Some(session_id),
            cwd: Some(path_display(&payload.meta.cwd)),
            source: Some(debug_name(&payload.meta.source)),
            model_provider: payload.meta.model_provider.clone(),
            history_base: history_base.cloned(),
        }]
    }

    fn adapt_response_item(
        &self,
        record: &SourceRecord,
        payload: &models::ResponseItem,
    ) -> Vec<AnalysisEvent> {
        match payload {
            models::ResponseItem::Message {
                id, role, content, ..
            } => self.adapt_message(record, id.as_ref(), role, content),
            models::ResponseItem::Reasoning { .. } => vec![self.diagnostic(
                record,
                "reasoning_item",
                Some("recognized reasoning item is not a canonical projection"),
                0,
            )],
            models::ResponseItem::AgentMessage { id, content, .. } => {
                let Some(text) = models::plaintext_agent_message_content(content) else {
                    return vec![self.unknown_event(
                        record,
                        "response_item/agent_message".to_string(),
                        "encrypted_agent_message_content",
                        0,
                    )];
                };
                vec![AnalysisEvent::AssistantMessage {
                    metadata: metadata(
                        record,
                        "assistant_message",
                        0,
                        id.as_ref().map(ToString::to_string),
                        None,
                        Availability::Present,
                    ),
                    text,
                }]
            }
            models::ResponseItem::LocalShellCall {
                id,
                call_id,
                status,
                action,
                ..
            } => {
                let call_id = call_id
                    .clone()
                    .or_else(|| id.as_ref().map(ToString::to_string))
                    .unwrap_or_else(|| {
                        format!(
                            "local-shell:{}",
                            record
                                .rollout_ordinal
                                .unwrap_or(record.physical_line_ordinal)
                        )
                    });
                let (tool_name, input) = match action {
                    models::LocalShellAction::Exec(exec) => (
                        Some("shell_command".to_string()),
                        Some(exec.command.join(" ")),
                    ),
                };
                vec![AnalysisEvent::ToolStarted {
                    metadata: metadata(
                        record,
                        "tool_started",
                        0,
                        Some(call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    tool_kind: "local_shell".to_string(),
                    tool_name,
                    call_id,
                    input: input
                        .map(bounded_text)
                        .or_else(|| Some(debug_name(status))),
                }]
            }
            models::ResponseItem::FunctionCall {
                name,
                namespace,
                arguments,
                call_id,
                ..
            } => vec![AnalysisEvent::ToolStarted {
                metadata: metadata(
                    record,
                    "tool_started",
                    0,
                    Some(call_id.clone()),
                    None,
                    Availability::Present,
                ),
                tool_kind: "function_call".to_string(),
                tool_name: Some(qualified_name(namespace.as_deref(), name)),
                call_id: call_id.clone(),
                input: Some(compact_tool_input(arguments)),
            }],
            models::ResponseItem::FunctionCallOutput {
                call_id, output, ..
            } => self.adapt_tool_output(record, call_id, output, "function_call"),
            models::ResponseItem::CustomToolCall {
                call_id,
                name,
                namespace,
                input,
                ..
            } => vec![AnalysisEvent::ToolStarted {
                metadata: metadata(
                    record,
                    "tool_started",
                    0,
                    Some(call_id.clone()),
                    None,
                    Availability::Present,
                ),
                tool_kind: "custom_tool_call".to_string(),
                tool_name: Some(qualified_name(namespace.as_deref(), name)),
                call_id: call_id.clone(),
                input: Some(compact_tool_input(input)),
            }],
            models::ResponseItem::CustomToolCallOutput {
                call_id, output, ..
            } => self.adapt_tool_output(record, call_id, output, "custom_tool_call"),
            models::ResponseItem::ToolSearchCall {
                call_id,
                execution,
                arguments,
                ..
            } => {
                let Some(call_id) = call_id.clone() else {
                    return vec![self.parse_gap(record, "tool_search.call_id_missing", 0)];
                };
                vec![AnalysisEvent::ToolStarted {
                    metadata: metadata(
                        record,
                        "tool_started",
                        0,
                        Some(call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    tool_kind: "tool_search".to_string(),
                    tool_name: Some(execution.clone()),
                    call_id,
                    input: Some(compact_json(arguments)),
                }]
            }
            models::ResponseItem::ToolSearchOutput {
                id,
                call_id,
                status,
                execution,
                tools,
                ..
            } => {
                let Some(call_id) = call_id
                    .clone()
                    .or_else(|| id.as_ref().map(ToString::to_string))
                else {
                    return vec![self.parse_gap(record, "tool_search_output.call_id_missing", 0)];
                };
                let output = format!(
                    "status={status}; execution={execution}; tools={}",
                    compact_json(tools)
                );
                vec![AnalysisEvent::ToolCompleted {
                    metadata: metadata(
                        record,
                        "tool_completed",
                        0,
                        Some(call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    tool_kind: "tool_search".to_string(),
                    call_id,
                    output: Some(output),
                }]
            }
            models::ResponseItem::WebSearchCall { id, action, .. } => {
                vec![AnalysisEvent::WebSearchFound {
                    metadata: metadata(
                        record,
                        "web_search_found",
                        0,
                        id.as_ref().map(ToString::to_string),
                        None,
                        Availability::Present,
                    ),
                    query: action.as_ref().and_then(web_search_query),
                    result: action.as_ref().map(compact_json),
                }]
            }
            models::ResponseItem::ImageGenerationCall { id, .. } => {
                vec![AnalysisEvent::AttachmentFound {
                    metadata: metadata(
                        record,
                        "attachment_found",
                        0,
                        id.as_ref().map(ToString::to_string),
                        None,
                        Availability::Present,
                    ),
                    name: id.as_ref().map(ToString::to_string),
                    media_type: Some("image".to_string()),
                }]
            }
            models::ResponseItem::Compaction {
                id,
                encrypted_content,
                ..
            }
            | models::ResponseItem::ContextCompaction {
                id,
                encrypted_content: Some(encrypted_content),
                ..
            } => vec![AnalysisEvent::Compaction {
                metadata: metadata(
                    record,
                    "compaction",
                    0,
                    id.as_ref().map(ToString::to_string),
                    None,
                    Availability::PartialRollout,
                ),
                summary: Some(encrypted_content.clone()),
            }],
            _ => vec![
                self.unknown_event(
                    record,
                    record
                        .type_name()
                        .unwrap_or_else(|| "response_item/unsupported".to_string()),
                    "known_response_item_not_projected",
                    0,
                ),
            ],
        }
    }

    fn adapt_message(
        &self,
        record: &SourceRecord,
        item_id: Option<&crate::codex_wire::ResponseItemId>,
        role: &str,
        content: &[models::ContentItem],
    ) -> Vec<AnalysisEvent> {
        let text = content_text(content);
        let correlation_id = item_id.map(ToString::to_string);
        match role {
            "assistant" => vec![AnalysisEvent::AssistantMessage {
                metadata: metadata(
                    record,
                    "assistant_message",
                    0,
                    correlation_id,
                    None,
                    Availability::Present,
                ),
                text,
            }],
            "user" => vec![self.diagnostic(
                record,
                "response_user_message_carrier",
                Some("response_item user message is represented by item_completed"),
                0,
            )],
            _ => vec![self.unknown_event(
                record,
                format!("response_item/message/role:{role}"),
                "non_visible_message_role",
                0,
            )],
        }
    }

    fn adapt_tool_output(
        &self,
        record: &SourceRecord,
        call_id: &str,
        output: &models::FunctionCallOutputPayload,
        tool_kind: &str,
    ) -> Vec<AnalysisEvent> {
        let output_text = match output.content_items() {
            Some(items) => compact_json(items),
            None => compact_tool_input(&output.body.to_text().unwrap_or_default()),
        };
        let pending_turn_id = self.pending_plan_turn_id(call_id);
        if let Some(answers) = parse_plan_answers(&output_text)
            && self.accept_pending_plan_answers(call_id, &answers)
        {
            return answers
                .into_iter()
                .enumerate()
                .map(|(index, (question_id, answer))| AnalysisEvent::PlanAnswer {
                    metadata: metadata(
                        record,
                        "plan_answer",
                        index as u64,
                        Some(call_id.to_string()),
                        pending_turn_id.clone(),
                        Availability::Present,
                    ),
                    call_id: call_id.to_string(),
                    question_id,
                    answer,
                })
                .collect();
        }
        vec![AnalysisEvent::ToolCompleted {
            metadata: metadata(
                record,
                "tool_completed",
                0,
                Some(call_id.to_string()),
                None,
                Availability::Present,
            ),
            tool_kind: tool_kind.to_string(),
            call_id: call_id.to_string(),
            output: Some(bounded_text(output_text)),
        }]
    }

    fn adapt_event_msg(
        &self,
        record: &SourceRecord,
        payload: &protocol::EventMsg,
    ) -> Vec<AnalysisEvent> {
        match payload {
            protocol::EventMsg::UserMessage(payload) => {
                self.adapt_event_user_message(record, payload)
            }
            protocol::EventMsg::AgentMessage(payload) => {
                self.adapt_event_agent_message(record, payload)
            }
            protocol::EventMsg::TurnStarted(payload) => self.adapt_turn_started(record, payload),
            protocol::EventMsg::ThreadSettingsApplied(_) => vec![self.diagnostic(
                record,
                "thread_settings_applied",
                Some("recognized session settings metadata"),
                0,
            )],
            protocol::EventMsg::TurnComplete(payload) => self.adapt_turn_complete(record, payload),
            protocol::EventMsg::TurnAborted(payload) => self.adapt_turn_aborted(record, payload),
            protocol::EventMsg::ItemCompleted(payload) => {
                self.adapt_item_completed(record, payload)
            }
            protocol::EventMsg::TokenCount(payload) => self.adapt_token_count(record, payload),
            protocol::EventMsg::RequestUserInput(payload) => self.adapt_questions(record, payload),
            protocol::EventMsg::PlanUpdate(payload) => self.adapt_plan(record, payload),
            protocol::EventMsg::Warning(payload) => {
                vec![self.diagnostic(record, "warning", Some(&payload.message), 0)]
            }
            protocol::EventMsg::Error(payload) => {
                vec![self.diagnostic(record, "error", Some(&payload.message), 0)]
            }
            protocol::EventMsg::McpToolCallBegin(payload) => vec![AnalysisEvent::ToolStarted {
                metadata: metadata(
                    record,
                    "tool_started",
                    0,
                    Some(payload.call_id.clone()),
                    None,
                    Availability::Present,
                ),
                tool_kind: "mcp_tool".to_string(),
                tool_name: Some(qualified_name(
                    Some(payload.invocation.server.as_str()),
                    &payload.invocation.tool,
                )),
                call_id: payload.call_id.clone(),
                input: payload
                    .invocation
                    .arguments
                    .as_ref()
                    .map(compact_json),
            }],
            protocol::EventMsg::McpToolCallEnd(payload) => {
                let output = match &payload.result {
                    Ok(result) => format!(
                        "success={}; result={}",
                        payload.is_success(),
                        compact_json(result)
                    ),
                    Err(error) => format!("success=false; error={error}"),
                };
                vec![AnalysisEvent::ToolCompleted {
                    metadata: metadata(
                        record,
                        "tool_completed",
                        0,
                        Some(payload.call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    tool_kind: "mcp_tool".to_string(),
                    call_id: payload.call_id.clone(),
                    output: Some(bounded_text(output)),
                }]
            }
            protocol::EventMsg::ExecCommandBegin(payload) => vec![AnalysisEvent::ToolStarted {
                metadata: metadata(
                    record,
                    "tool_started",
                    0,
                    Some(payload.call_id.clone()),
                    Some(payload.turn_id.clone()),
                    Availability::Present,
                ),
                tool_kind: "local_shell".to_string(),
                tool_name: Some("shell_command".to_string()),
                call_id: payload.call_id.clone(),
                input: non_empty(bounded_text(payload.command.join(" "))),
            }],
            protocol::EventMsg::ExecCommandOutputDelta(payload) => {
                let message = bounded_text(format!(
                    "call_id={}; stream={}; chunk={}",
                    payload.call_id,
                    debug_name(&payload.stream),
                    String::from_utf8_lossy(&payload.chunk)
                ));
                vec![self.diagnostic(record, "exec_command_output_delta", Some(&message), 0)]
            }
            protocol::EventMsg::ExecCommandEnd(payload) => vec![AnalysisEvent::ToolCompleted {
                metadata: metadata(
                    record,
                    "tool_completed",
                    0,
                    Some(payload.call_id.clone()),
                    Some(payload.turn_id.clone()),
                    Availability::Present,
                ),
                tool_kind: "local_shell".to_string(),
                call_id: payload.call_id.clone(),
                output: Some(exec_command_output(payload)),
            }],
            protocol::EventMsg::DynamicToolCallRequest(payload) => {
                vec![AnalysisEvent::ToolStarted {
                    metadata: metadata(
                        record,
                        "tool_started",
                        0,
                        Some(payload.call_id.clone()),
                        Some(payload.turn_id.clone()),
                        Availability::Present,
                    ),
                    tool_kind: "dynamic_tool".to_string(),
                    tool_name: Some(qualified_name(payload.namespace.as_deref(), &payload.tool)),
                    call_id: payload.call_id.clone(),
                    input: Some(compact_json(&payload.arguments)),
                }]
            }
            protocol::EventMsg::DynamicToolCallResponse(payload) => {
                let output = format!(
                    "success={}; error={}; content_items={}",
                    payload.success,
                    payload
                        .error
                        .as_deref()
                        .map(|error| bounded_text(error.to_string()))
                        .unwrap_or_default(),
                    compact_json(&payload.content_items)
                );
                vec![AnalysisEvent::ToolCompleted {
                    metadata: metadata(
                        record,
                        "tool_completed",
                        0,
                        Some(payload.call_id.clone()),
                        Some(payload.turn_id.clone()),
                        Availability::Present,
                    ),
                    tool_kind: "dynamic_tool".to_string(),
                    call_id: payload.call_id.clone(),
                    output: Some(bounded_text(output)),
                }]
            }
            protocol::EventMsg::WebSearchBegin(payload) => vec![AnalysisEvent::WebSearchFound {
                metadata: metadata(
                    record,
                    "web_search_found",
                    0,
                    Some(payload.call_id.clone()),
                    None,
                    Availability::Present,
                ),
                query: None,
                result: None,
            }],
            protocol::EventMsg::WebSearchEnd(payload) => vec![AnalysisEvent::WebSearchFound {
                metadata: metadata(
                    record,
                    "web_search_found",
                    0,
                    Some(payload.call_id.clone()),
                    None,
                    Availability::Present,
                ),
                query: Some(payload.query.clone()),
                result: payload.results.as_ref().map(compact_json),
            }],
            protocol::EventMsg::ImageGenerationBegin(payload) => {
                vec![AnalysisEvent::AttachmentFound {
                    metadata: metadata(
                        record,
                        "attachment_found",
                        0,
                        Some(payload.call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    name: Some(payload.call_id.clone()),
                    media_type: Some("image".to_string()),
                }]
            }
            protocol::EventMsg::ImageGenerationEnd(payload) => {
                vec![AnalysisEvent::ArtifactFound {
                    metadata: metadata(
                        record,
                        "artifact_found",
                        0,
                        Some(payload.call_id.clone()),
                        None,
                        Availability::Present,
                    ),
                    artifact_id: Some(payload.call_id.clone()),
                    name: payload
                        .saved_path
                        .as_ref()
                        .map(|path| path_display(path.as_path()))
                        .or_else(|| payload.revised_prompt.clone()),
                }]
            }
            protocol::EventMsg::PatchApplyBegin(payload) => self.adapt_file_changes(
                record,
                &payload.call_id,
                Some(&payload.turn_id),
                &payload.changes,
                "patch_apply_begin",
            ),
            protocol::EventMsg::PatchApplyUpdated(payload) => self.adapt_file_changes(
                record,
                &payload.call_id,
                None,
                &payload.changes,
                "patch_apply_updated",
            ),
            protocol::EventMsg::PatchApplyEnd(payload) => self.adapt_file_changes(
                record,
                &payload.call_id,
                Some(&payload.turn_id),
                &payload.changes,
                &format!("patch_apply_end:{}", debug_name(&payload.status)),
            ),
            protocol::EventMsg::ContextCompacted(_) => vec![AnalysisEvent::Compaction {
                metadata: metadata(
                    record,
                    "compaction",
                    0,
                    None,
                    None,
                    Availability::PartialRollout,
                ),
                summary: None,
            }],
            protocol::EventMsg::ShutdownComplete => {
                vec![self.diagnostic(record, "shutdown_complete", None, 0)]
            }
            _ => vec![
                self.unknown_event(
                    record,
                    record
                        .type_name()
                        .unwrap_or_else(|| "event_msg/unsupported".to_string()),
                    "known_wire_event_not_projected",
                    0,
                ),
            ],
        }
    }

    fn adapt_event_user_message(
        &self,
        record: &SourceRecord,
        payload: &protocol::UserMessageEvent,
    ) -> Vec<AnalysisEvent> {
        self.adapt_user_message(
            record,
            payload.client_id.clone(),
            payload.message.clone(),
            None,
        )
    }

    fn adapt_item_completed(
        &self,
        record: &SourceRecord,
        payload: &protocol::ItemCompletedEvent,
    ) -> Vec<AnalysisEvent> {
        match &payload.item {
            TurnItem::UserMessage(item) => self.adapt_user_message(
                record,
                item.client_id.clone().or_else(|| Some(item.id.clone())),
                item.message(),
                Some(payload.turn_id.clone()),
            ),
            TurnItem::FileChange(item) => {
                if item.id.trim().is_empty() || payload.turn_id.trim().is_empty() {
                    return vec![self.parse_gap(record, "file_completion_missing_identity", 0)];
                }
                let status = item
                    .status
                    .as_ref()
                    .map(debug_name)
                    .unwrap_or_else(|| "unknown".to_string());
                let mut events = self.adapt_file_changes(
                    record,
                    &item.id,
                    Some(payload.turn_id.as_str()),
                    &item.changes,
                    &format!("item_completed:{status}"),
                );
                if item.status.is_none() {
                    for event in &mut events {
                        event.metadata_mut().availability = Availability::PartialRollout;
                    }
                }
                events
            }
            TurnItem::CommandExecution(item) => {
                if item.id.trim().is_empty() || payload.turn_id.trim().is_empty() {
                    return vec![self.parse_gap(record, "command_completion_missing_identity", 0)];
                }
                let turn = non_empty(payload.turn_id.clone());
                let status = debug_name(&item.status);
                let input = Some(compact_json(&serde_json::json!({
                    "command": item.command,
                    "cwd": item.cwd,
                })));
                let canonical_output = item
                    .aggregated_output
                    .as_deref()
                    .filter(|value| !value.is_empty())
                    .or(item.formatted_output.as_deref().filter(|value| !value.is_empty()))
                    .map(ToOwned::to_owned)
                    .or_else(|| match (item.stdout.as_deref(), item.stderr.as_deref()) {
                        (Some(stdout), Some(stderr)) if !stdout.is_empty() && !stderr.is_empty() && stdout != stderr => {
                            Some(format!("stdout:\n{stdout}\nstderr:\n{stderr}"))
                        }
                        (Some(stdout), _) if !stdout.is_empty() => Some(stdout.to_string()),
                        (_, Some(stderr)) if !stderr.is_empty() => Some(stderr.to_string()),
                        _ => None,
                    });
                let mut output = format!("status={status}");
                if let Some(code) = item.exit_code {
                    output.push_str(&format!("; exit_code={code}"));
                }
                if let Some(duration) = item.duration {
                    output.push_str(&format!("; duration_ms={}", duration.as_millis()));
                }
                if let Some(raw) = canonical_output {
                    output.push_str(&format!("; output={raw}"));
                }
                let mut events = vec![AnalysisEvent::ToolStarted {
                        metadata: metadata(
                            record,
                            "tool_started",
                            0,
                            Some(item.id.clone()),
                            turn.clone(),
                            if status == "inprogress" { Availability::PartialRollout } else { Availability::Present },
                        ),
                        tool_kind: "local_shell".to_string(),
                        tool_name: Some("shell_command".to_string()),
                        call_id: item.id.clone(),
                        input,
                    }];
                if status != "inprogress" {
                    events.push(AnalysisEvent::ToolCompleted {
                        metadata: metadata(
                            record,
                            "tool_completed",
                            1,
                            Some(item.id.clone()),
                            turn,
                            Availability::Present,
                        ),
                        tool_kind: "local_shell".to_string(),
                        call_id: item.id.clone(),
                        output: Some(bounded_text(output)),
                    });
                }
                events
            }
            _ => vec![self.diagnostic(
                record,
                "item_completed_non_user",
                Some("recognized completion metadata is not a canonical history item"),
                0,
            )],
        }
    }

    fn adapt_user_message(
        &self,
        record: &SourceRecord,
        client_id: Option<String>,
        message: String,
        turn_id: Option<String>,
    ) -> Vec<AnalysisEvent> {
        let mut events = vec![AnalysisEvent::UserMessage {
            metadata: metadata(
                record,
                "user_message",
                0,
                client_id.clone(),
                turn_id.clone(),
                Availability::Present,
            ),
            text: message.clone(),
        }];
        if let Some(action) = classify_plan_action(&message)
            && let Some((pending_turn_id, question_key)) = self.consume_pending_plan_action()
        {
            let mut event = AnalysisEvent::PlanAction {
                metadata: metadata(
                    record,
                    "plan_action",
                    1,
                    client_id,
                    pending_turn_id.or(turn_id),
                    Availability::Present,
                ),
                action: action.to_string(),
            };
            event.metadata_mut().related_item_key = question_key;
            events.push(event);
        }
        events
    }

    fn adapt_event_agent_message(
        &self,
        record: &SourceRecord,
        payload: &protocol::AgentMessageEvent,
    ) -> Vec<AnalysisEvent> {
        vec![AnalysisEvent::AssistantMessage {
            metadata: metadata(
                record,
                "assistant_message",
                0,
                None,
                None,
                Availability::Present,
            ),
            text: payload.message.clone(),
        }]
    }

    fn adapt_turn_started(
        &self,
        record: &SourceRecord,
        payload: &protocol::TurnStartedEvent,
    ) -> Vec<AnalysisEvent> {
        self.clear_pending_plans();
        self.state.borrow_mut().active_turn_id = Some(payload.turn_id.clone());
        vec![AnalysisEvent::TurnStarted {
            metadata: metadata(
                record,
                "turn_started",
                0,
                Some(payload.turn_id.clone()),
                Some(payload.turn_id.clone()),
                Availability::Present,
            ),
            model_context_window: payload.model_context_window,
            collaboration_mode_kind: Some(debug_name(&payload.collaboration_mode_kind)),
        }]
    }

    fn adapt_turn_complete(
        &self,
        record: &SourceRecord,
        payload: &protocol::TurnCompleteEvent,
    ) -> Vec<AnalysisEvent> {
        self.clear_pending_plans();
        let (status, availability, message) = match payload.error.as_ref() {
            None => (
                TurnStatus::Completed,
                Availability::Present,
                payload.last_agent_message.clone(),
            ),
            Some(error) => (
                if error.affects_turn_status() {
                    TurnStatus::Interrupted
                } else {
                    TurnStatus::Partial
                },
                Availability::PartialRollout,
                Some(error.message.clone()),
            ),
        };
        vec![AnalysisEvent::TurnCompleted {
            metadata: metadata(
                record,
                "turn_completed",
                0,
                Some(payload.turn_id.clone()),
                Some(payload.turn_id.clone()),
                availability,
            ),
            status,
            message,
            duration_ms: payload.duration_ms,
        }]
    }

    fn adapt_turn_aborted(
        &self,
        record: &SourceRecord,
        payload: &protocol::TurnAbortedEvent,
    ) -> Vec<AnalysisEvent> {
        self.clear_pending_plans();
        let mut metadata = metadata(
            record,
            "turn_completed",
            0,
            payload.turn_id.clone(),
            payload.turn_id.clone(),
            Availability::PartialRollout,
        );
        metadata.terminal_evidence = Some(TerminalEvidence::ExplicitAbort);
        vec![AnalysisEvent::TurnCompleted {
            metadata,
            status: TurnStatus::Interrupted,
            message: Some(debug_name(&payload.reason)),
            duration_ms: payload.duration_ms,
        }]
    }

    fn adapt_token_count(
        &self,
        record: &SourceRecord,
        payload: &protocol::TokenCountEvent,
    ) -> Vec<AnalysisEvent> {
        let Some(info) = payload.info.as_ref() else {
            return vec![self.parse_gap(record, "token_count.info_missing", 0)];
        };
        let total = &info.total_token_usage;
        let last = &info.last_token_usage;
        let mut events = vec![AnalysisEvent::UsageUpdated {
            metadata: metadata(
                record,
                "usage_updated",
                0,
                None,
                None,
                Availability::Present,
            ),
            input_tokens: Some(total.input_tokens),
            cached_input_tokens: Some(total.cached_input_tokens),
            output_tokens: Some(total.output_tokens),
            reasoning_output_tokens: Some(total.reasoning_output_tokens),
            total_tokens: Some(total.total_tokens),
            last_input_tokens: Some(last.input_tokens),
            last_cached_input_tokens: Some(last.cached_input_tokens),
            last_output_tokens: Some(last.output_tokens),
            last_reasoning_output_tokens: Some(last.reasoning_output_tokens),
            last_total_tokens: Some(last.total_tokens),
            model_context_window: info.model_context_window,
        }];
        if let Some(rate_limits) = payload.rate_limits.as_ref() {
            events.push(AnalysisEvent::RateLimitUpdated {
                metadata: metadata(
                    record,
                    "rate_limit_updated",
                    1,
                    None,
                    None,
                    Availability::Present,
                ),
                primary_used_percent: rate_limits.primary.as_ref().map(|value| value.used_percent),
                primary_window_minutes: rate_limits
                    .primary
                    .as_ref()
                    .and_then(|value| value.window_minutes),
                primary_resets_at: rate_limits
                    .primary
                    .as_ref()
                    .and_then(|value| value.resets_at),
                secondary_used_percent: rate_limits
                    .secondary
                    .as_ref()
                    .map(|value| value.used_percent),
                secondary_window_minutes: rate_limits
                    .secondary
                    .as_ref()
                    .and_then(|value| value.window_minutes),
                secondary_resets_at: rate_limits
                    .secondary
                    .as_ref()
                    .and_then(|value| value.resets_at),
            });
        }
        events
    }

    fn adapt_questions(
        &self,
        record: &SourceRecord,
        payload: &protocol::RequestUserInputEvent,
    ) -> Vec<AnalysisEvent> {
        if !payload.questions.is_empty() {
            let pending = PendingPlan {
                call_id: payload.call_id.clone(),
                turn_id: non_empty(payload.turn_id.clone()),
                question_ids: payload
                    .questions
                    .iter()
                    .map(|question| question.id.clone())
                    .collect(),
                answered: false,
            };
            let mut state = self.state.borrow_mut();
            state
                .pending_plans
                .retain(|item| item.call_id != pending.call_id);
            state.pending_plans.push_back(pending);
            while state.pending_plans.len() > 16 {
                state.pending_plans.pop_front();
            }
        }
        let mut events = Vec::with_capacity(payload.questions.len());
        for (index, question) in payload.questions.iter().enumerate() {
            let options = question
                .options
                .as_ref()
                .map(|values| {
                    values
                        .iter()
                        .map(|option| PlanOption {
                            label: option.label.clone(),
                            description: option.description.clone(),
                        })
                        .collect()
                })
                .unwrap_or_default();
            events.push(AnalysisEvent::PlanQuestion {
                metadata: metadata(
                    record,
                    "plan_question",
                    index as u64,
                    Some(payload.call_id.clone()),
                    non_empty(payload.turn_id.clone()),
                    Availability::Present,
                ),
                call_id: payload.call_id.clone(),
                question_id: question.id.clone(),
                header: question.header.clone(),
                question: question.question.clone(),
                options,
            });
        }
        if events.is_empty() {
            vec![self.parse_gap(record, "request_user_input.questions_empty", 0)]
        } else {
            events
        }
    }

    fn adapt_plan(
        &self,
        record: &SourceRecord,
        payload: &plan_tool::UpdatePlanArgs,
    ) -> Vec<AnalysisEvent> {
        let steps = payload
            .plan
            .iter()
            .map(|item| PlanStep {
                step: item.step.clone(),
                status: plan_step_status(&item.status).to_string(),
            })
            .collect();
        vec![AnalysisEvent::PlanUpdated {
            metadata: metadata(record, "plan_updated", 0, None, None, Availability::Present),
            explanation: payload.explanation.clone(),
            steps,
        }]
    }

    fn accept_pending_plan_answers(&self, call_id: &str, answers: &[(String, String)]) -> bool {
        let mut state = self.state.borrow_mut();
        let Some(pending) = state
            .pending_plans
            .iter_mut()
            .find(|pending| pending.call_id == call_id)
        else {
            return false;
        };
        if answers
            .iter()
            .all(|(question_id, _)| pending.question_ids.contains(question_id))
        {
            pending.answered = true;
            true
        } else {
            false
        }
    }

    fn pending_plan_turn_id(&self, call_id: &str) -> Option<String> {
        self.state
            .borrow()
            .pending_plans
            .iter()
            .find(|pending| pending.call_id == call_id)
            .and_then(|pending| pending.turn_id.clone())
    }

    fn consume_pending_plan_action(&self) -> Option<(Option<String>, Option<String>)> {
        let mut state = self.state.borrow_mut();
        let Some(index) = state.pending_plans.iter().position(|pending| {
            // A direct user action is valid while a question is pending, and
            // remains valid after its answer has been correlated. The field is
            // retained to make the bounded state explicit for future carriers.
            !pending.question_ids.is_empty() || pending.answered
        }) else {
            return None;
        };
        state.pending_plans.remove(index).map(|pending| {
            let question_key = pending
                .question_ids
                .iter()
                .find(|question_id| !question_id.trim().is_empty())
                .map(|question_id| format!("question:{}", question_id.trim()));
            (pending.turn_id, question_key)
        })
    }

    fn clear_pending_plans(&self) {
        self.state.borrow_mut().pending_plans.clear();
    }

    fn adapt_file_changes(
        &self,
        record: &SourceRecord,
        call_id: &str,
        turn_id: Option<&str>,
        changes: &HashMap<PathBuf, protocol::FileChange>,
        phase: &str,
    ) -> Vec<AnalysisEvent> {
        let mut entries: Vec<_> = changes.iter().collect();
        entries
            .sort_by(|(left, _), (right, _)| left.to_string_lossy().cmp(&right.to_string_lossy()));
        if entries.is_empty() {
            return vec![AnalysisEvent::FileChanged {
                metadata: metadata(
                    record,
                    "file_changed",
                    0,
                    Some(call_id.to_string()),
                    turn_id.and_then(|value| non_empty(value.to_string())),
                    Availability::Present,
                ),
                path: None,
                summary: Some(phase.to_string()),
                diff: None,
            }];
        }
        entries
            .into_iter()
            .enumerate()
            .map(|(index, (path, change))| {
                let mut metadata = metadata(
                    record,
                    "file_changed",
                    index as u64,
                    Some(call_id.to_string()),
                    turn_id.and_then(|value| non_empty(value.to_string())),
                    Availability::Present,
                );
                if !call_id.trim().is_empty() {
                    // Native patch/item identity plus the original changed-path
                    // discriminator. Never use the output path, map iteration
                    // index, source position or diff content as identity.
                    let mut discriminator = 0xcbf29ce484222325_u64;
                    for byte in path.to_string_lossy().as_bytes() {
                        discriminator ^= u64::from(*byte);
                        discriminator = discriminator.wrapping_mul(0x100000001b3);
                    }
                    metadata.item_key = format!("file:{}:{discriminator:016x}", call_id.trim());
                }
                AnalysisEvent::FileChanged {
                metadata,
                path: Some(path_display(path)),
                summary: Some(format!("{phase}:{}", file_change_kind(change))),
                diff: file_change_detail(change),
            }})
            .collect()
    }

    fn single_compaction(&self, record: &SourceRecord, summary: &str) -> Vec<AnalysisEvent> {
        vec![AnalysisEvent::Compaction {
            metadata: metadata(
                record,
                "compaction",
                0,
                None,
                None,
                Availability::PartialRollout,
            ),
            summary: Some(summary.to_string()),
        }]
    }

    fn diagnostic(
        &self,
        record: &SourceRecord,
        code: &str,
        message: Option<&str>,
        index: u64,
    ) -> AnalysisEvent {
        AnalysisEvent::Diagnostic {
            metadata: metadata(
                record,
                "diagnostic",
                index,
                None,
                None,
                Availability::Present,
            ),
            code: code.to_string(),
            message: message.map(ToOwned::to_owned),
        }
    }

    fn parse_gap(&self, record: &SourceRecord, reason: &str, index: u64) -> AnalysisEvent {
        AnalysisEvent::ParseGap {
            metadata: metadata(
                record,
                "parse_gap",
                index,
                None,
                None,
                Availability::NotRecoverableFromRollout,
            ),
            reason: reason.to_string(),
        }
    }

    fn unknown_event(
        &self,
        record: &SourceRecord,
        raw_type: String,
        reason: &str,
        index: u64,
    ) -> AnalysisEvent {
        AnalysisEvent::UnknownEvent {
            metadata: metadata(
                record,
                "unknown_event",
                index,
                None,
                None,
                Availability::UnsupportedSchema,
            ),
            raw_type: Some(raw_type),
            reason: reason.to_string(),
        }
    }
}

pub fn adapt_record(
    record: &SourceRecord,
    decoded: DecodedRecord,
    profile: CompatibilityProfile,
) -> Vec<AnalysisEvent> {
    CodexEventAdapter::new(profile).adapt(record, decoded)
}

/// Adapt one record through a caller-owned adapter.  Unlike the legacy
/// `adapt_record` helper, this preserves pending Plan and active-turn state
/// across calls and is the only supported primitive for segmented analysis.
pub fn adapt_record_with_adapter(
    adapter: &CodexEventAdapter,
    record: &SourceRecord,
    decoded: DecodedRecord,
) -> Vec<AnalysisEvent> {
    adapter.adapt(record, decoded)
}

fn metadata(
    record: &SourceRecord,
    event_type: &str,
    index: u64,
    correlation_id: Option<String>,
    turn_id: Option<String>,
    availability: Availability,
) -> EventMetadata {
    let suffix = if index == 0 {
        String::new()
    } else {
        format!("-{index}")
    };
    EventMetadata {
        event_id: format!(
            "{}:line-{}:{event_type}{suffix}",
            safe_source_identity(&record.source_identity),
            record.physical_line_ordinal
        ),
        item_key: String::new(),
        correlation_id,
        related_item_key: None,
        conversation_id: None,
        turn_id,
        timestamp: record.timestamp.clone(),
        sequence: record
            .physical_line_ordinal
            .saturating_mul(100)
            .saturating_add(index),
        availability,
        terminal_evidence: None,
        identity_origin: IdentityOrigin::SourcePosition,
        source_ref: SourceRef::from(record),
    }
}

fn logical_identity(
    event: &AnalysisEvent,
    index: usize,
) -> (String, IdentityOrigin, Option<String>) {
    let metadata = event.metadata();
    let position = source_position(metadata);
    let source_key = |prefix: &str| {
        (
            format!("{prefix}:{position}:{index}"),
            IdentityOrigin::SourcePosition,
        )
    };
    let native_key = |prefix: &str, value: &str| {
        if value.trim().is_empty() {
            source_key(prefix)
        } else {
            (
                format!("{prefix}:{}", value.trim()),
                IdentityOrigin::NativeStableId,
            )
        }
    };

    match event {
        AnalysisEvent::SessionContext { session_id, .. } => {
            let key = session_id
                .as_deref()
                .map(|value| native_key("session", value))
                .unwrap_or_else(|| source_key("session"));
            no_relation(key)
        }
        AnalysisEvent::TurnStarted { .. } | AnalysisEvent::TurnCompleted { .. } => {
            let key = metadata
                .turn_id
                .as_deref()
                .map(|value| native_key("turn", value))
                .unwrap_or_else(|| source_key("turn"));
            no_relation(key)
        }
        AnalysisEvent::UserMessage { .. } => {
            let key = metadata
                .correlation_id
                .as_deref()
                .map(|value| native_key("message", value))
                .unwrap_or_else(|| source_key("message"));
            no_relation(key)
        }
        AnalysisEvent::AssistantMessage { .. } => {
            let key = metadata
                .correlation_id
                .as_deref()
                .map(|value| native_key("message", value))
                .unwrap_or_else(|| source_key("assistant"));
            no_relation(key)
        }
        AnalysisEvent::ToolStarted { call_id, .. }
        | AnalysisEvent::ToolCompleted { call_id, .. } => no_relation(native_key("tool", call_id)),
        AnalysisEvent::PlanUpdated { .. } => no_relation(source_key("plan")),
        AnalysisEvent::PlanQuestion { question_id, .. } => {
            no_relation(native_key("question", question_id))
        }
        AnalysisEvent::PlanAnswer { question_id, .. } => (
            format!("answer:{question_id}:{position}:{index}"),
            IdentityOrigin::SourcePosition,
            Some(format!("question:{question_id}")),
        ),
        AnalysisEvent::PlanAction { .. } => {
            let key = source_key("plan-action");
            (key.0, key.1, metadata.related_item_key.clone())
        }
        AnalysisEvent::FileChanged { .. } if !metadata.item_key.is_empty() => {
            no_relation((metadata.item_key.clone(), IdentityOrigin::NativeStableId))
        }
        AnalysisEvent::FileChanged { .. } => no_relation(source_key("file")),
        AnalysisEvent::WebSearchFound { .. } => {
            let key = metadata
                .correlation_id
                .as_deref()
                .map(|value| native_key("search", value))
                .unwrap_or_else(|| source_key("search"));
            no_relation(key)
        }
        AnalysisEvent::AttachmentFound { .. } => {
            let key = metadata
                .correlation_id
                .as_deref()
                .map(|value| native_key("attachment", value))
                .unwrap_or_else(|| source_key("attachment"));
            no_relation(key)
        }
        AnalysisEvent::ArtifactFound { artifact_id, .. } => {
            let key = artifact_id
                .as_deref()
                .map(|value| native_key("artifact", value))
                .unwrap_or_else(|| source_key("artifact"));
            no_relation(key)
        }
        AnalysisEvent::UsageUpdated { .. } => {
            let key = metadata
                .turn_id
                .as_deref()
                .map(|value| native_key("usage", value))
                .unwrap_or_else(|| source_key("usage"));
            no_relation(key)
        }
        AnalysisEvent::RateLimitUpdated { .. } => {
            let key = metadata
                .turn_id
                .as_deref()
                .map(|value| native_key("rate-limit", value))
                .unwrap_or_else(|| source_key("rate-limit"));
            no_relation(key)
        }
        AnalysisEvent::Compaction { .. } => no_relation(source_key("compaction")),
        AnalysisEvent::Diagnostic { .. }
        | AnalysisEvent::ParseGap { .. }
        | AnalysisEvent::UnknownEvent { .. } => no_relation(source_key("diagnostic")),
    }
}

fn no_relation(value: (String, IdentityOrigin)) -> (String, IdentityOrigin, Option<String>) {
    (value.0, value.1, None)
}

fn source_position(metadata: &EventMetadata) -> String {
    if let Some(rollout_ordinal) = metadata.source_ref.rollout_ordinal {
        format!("ordinal-{rollout_ordinal}")
    } else {
        format!(
            "line-{}-byte-{}",
            metadata.source_ref.physical_line_ordinal, metadata.source_ref.byte_start
        )
    }
}

fn event_identity(metadata: &EventMetadata, event_type: &str, index: usize) -> String {
    format!(
        "{}:{}:{}:{}",
        safe_source_identity(&metadata.source_ref.source_identity),
        source_position(metadata),
        event_type,
        index
    )
}

fn map_availability(value: WireAvailability) -> Availability {
    match value {
        WireAvailability::PartialRollout => Availability::PartialRollout,
        WireAvailability::UnsupportedSchema => Availability::UnsupportedSchema,
        WireAvailability::NotRecoverableFromRollout => Availability::NotRecoverableFromRollout,
    }
}

fn content_text(values: &[models::ContentItem]) -> String {
    values
        .iter()
        .filter_map(|item| match item {
            models::ContentItem::InputText { text } | models::ContentItem::OutputText { text } => {
                Some(text.as_str())
            }
            models::ContentItem::InputImage { .. } | models::ContentItem::InputAudio { .. } => None,
        })
        .collect::<Vec<_>>()
        .join("")
}

fn parse_plan_answers(text: &str) -> Option<Vec<(String, String)>> {
    let response =
        serde_json::from_str::<request_user_input::RequestUserInputResponse>(text).ok()?;
    let mut answers: Vec<_> = response
        .answers
        .into_iter()
        .map(|(question_id, answer)| (question_id, answer.answers.join("\n")))
        .collect();
    answers.sort_by(|left, right| left.0.cmp(&right.0));
    (!answers.is_empty()).then_some(answers)
}

fn classify_plan_action(text: &str) -> Option<&'static str> {
    let normalized = text.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "取消" | "取消计划" | "cancel" | "stop" | "no" | "否" => Some("cancel"),
        "确认" | "确认执行" | "执行" | "yes" | "approve" | "开始执行" => {
            Some("confirm")
        }
        "继续" | "继续执行" | "continue" | "proceed" | "go" => Some("continue"),
        _ => None,
    }
}

fn web_search_query(action: &models::WebSearchAction) -> Option<String> {
    match action {
        models::WebSearchAction::Search { query, queries } => query
            .clone()
            .or_else(|| queries.as_ref().map(|values| values.join(" "))),
        models::WebSearchAction::OpenPage { url }
        | models::WebSearchAction::FindInPage { url, .. } => url.clone(),
        models::WebSearchAction::Other => None,
    }
}

/// Exact allowed change body: added/deleted content or the unified diff, under
/// the existing truncation and redaction policy.
fn file_change_detail(change: &protocol::FileChange) -> Option<String> {
    let raw = match change {
        protocol::FileChange::Add { content } | protocol::FileChange::Delete { content } => {
            content.clone()
        }
        protocol::FileChange::Update { unified_diff, .. } => unified_diff.clone(),
    };
    non_empty(bounded_text(raw))
}

fn file_change_kind(change: &protocol::FileChange) -> &'static str {
    match change {
        protocol::FileChange::Add { .. } => "add",
        protocol::FileChange::Delete { .. } => "delete",
        protocol::FileChange::Update { .. } => "update",
    }
}

fn qualified_name(namespace: Option<&str>, name: &str) -> String {
    namespace
        .filter(|namespace| !namespace.is_empty())
        .map(|namespace| format!("{namespace}.{name}"))
        .unwrap_or_else(|| name.to_string())
}

fn plan_step_status(status: &plan_tool::StepStatus) -> &'static str {
    match status {
        plan_tool::StepStatus::Pending => "pending",
        plan_tool::StepStatus::InProgress => "in_progress",
        plan_tool::StepStatus::Completed => "completed",
    }
}

fn exec_command_output(payload: &protocol::ExecCommandEndEvent) -> String {
    let output = if !payload.aggregated_output.is_empty() {
        payload.aggregated_output.clone()
    } else if !payload.formatted_output.is_empty() {
        payload.formatted_output.clone()
    } else {
        format!("{}{}", payload.stdout, payload.stderr)
    };
    bounded_text(format!(
        "status={}; exit_code={}; output={}",
        debug_name(&payload.status),
        payload.exit_code,
        output
    ))
}

fn debug_name<T: Debug>(value: &T) -> String {
    format!("{value:?}").to_lowercase()
}

fn path_display(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn non_empty(value: String) -> Option<String> {
    (!value.is_empty()).then_some(value)
}

fn compact_json<T: Serialize + ?Sized>(value: &T) -> String {
    let output = serde_json::to_string(value).unwrap_or_else(|_| "<unserializable>".to_string());
    bounded_text(output)
}

fn compact_tool_input(input: &str) -> String {
    match serde_json::from_str::<Value>(input) {
        Ok(value) => compact_json(&value),
        Err(_) => bounded_text(input.to_string()),
    }
}

fn bounded_text(output: String) -> String {
    crate::error::truncate_utf8(output, 64 * 1024)
}

#[cfg(test)]
mod tests {
    use super::{CodexEventAdapter, compact_json, compact_tool_input, path_display};
    use crate::codex_wire::{CompatibilityProfile, DecodedRecord, decode_value};
    use crate::model::AnalysisEvent;
    use crate::source::SourceRecord;
    use serde_json::json;
    use std::path::Path;

    #[test]
    fn compact_json_keeps_multibyte_output_on_a_utf8_boundary() {
        let value = json!({"payload": "界😀".repeat(40_000)});
        let output = compact_json(&value);
        assert!(output.len() <= 64 * 1024);
        assert!(std::str::from_utf8(output.as_bytes()).is_ok());
        assert!(output.ends_with("…<truncated>"));
    }

    #[test]
    fn path_display_preserves_absolute_and_logical_paths() {
        assert_eq!(
            path_display(Path::new(r"E:\coding\TermLink\src\lib.rs")),
            r"E:\coding\TermLink\src\lib.rs"
        );
        assert_eq!(
            path_display(Path::new("/tmp/termlink/src/lib.rs")),
            "/tmp/termlink/src/lib.rs"
        );
        assert_eq!(path_display(Path::new("src/lib.rs")), "src/lib.rs");
    }

    #[test]
    fn compact_tool_input_preserves_nested_absolute_paths_and_object_keys() {
        let output = compact_tool_input(
            r#"{"workdir":"E:\\coding\\TermLink","path":"src/lib.rs","nested":["/tmp/private"],"/tmp/private/key":"src/lib.rs"}"#,
        );
        assert!(output.contains("E:\\coding\\TermLink"));
        assert!(output.contains("/tmp/private"));
        assert!(output.contains("/tmp/private/key"));
        assert!(output.contains("src/lib.rs"));
    }

    #[test]
    fn item_completed_user_message_keeps_the_completed_turn_id() {
        let raw = json!({
            "timestamp": "2026-08-22T00:00:00Z",
            "ordinal": 18,
            "type": "event_msg",
            "payload": {
                "type": "item_completed",
                "thread_id": "01a02530-9975-7df2-a3b3-6bb214ad47ed",
                "turn_id": "turn-1",
                "item": {
                    "type": "UserMessage",
                    "id": "user-item-1",
                    "content": [{"type": "text", "text": "edited question"}]
                },
                "completed_at_ms": 1
            }
        });
        let record = SourceRecord {
            source_identity: "child-rollout".to_string(),
            byte_start: 100,
            byte_end: 200,
            physical_line_ordinal: 5,
            rollout_ordinal: Some(18),
            timestamp: Some("2026-08-22T00:00:00Z".to_string()),
            raw: Some(raw.clone()),
            parse_error: None,
        };
        let decoded = decode_value(raw, CompatibilityProfile::Current);
        assert!(matches!(decoded, DecodedRecord::Known(_)));
        let events = CodexEventAdapter::new(CompatibilityProfile::Current).adapt(&record, decoded);
        assert!(matches!(
            events.as_slice(),
            [AnalysisEvent::UserMessage { metadata, text }]
                if metadata.turn_id.as_deref() == Some("turn-1")
                    && text == "edited question"
        ));
    }
}
