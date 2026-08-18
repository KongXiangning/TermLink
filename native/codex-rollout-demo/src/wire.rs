//! TermLink-owned rollout wire model.
//!
//! The parser Spike is the only component that is allowed to depend on the
//! Codex Rust crates.  The Demo deliberately keeps the next boundary local:
//! this module contains the small, tolerant wire model needed by the
//! projection reducer.  It is not a second implementation of Codex runtime;
//! it only decodes the persisted JSON shape and preserves unknown payloads as
//! `Unsupported`/`Skipped` values.

use std::collections::BTreeMap;

use anyhow::{Result, anyhow};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct RolloutLine {
    pub timestamp: String,
    pub ordinal: Option<u64>,
    pub item: RolloutItem,
}

#[derive(Debug, Clone, Serialize)]
pub struct InterAgentCommunication {
    pub id: Option<String>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub enum RolloutItem {
    SessionMeta(protocol::SessionMetaLine),
    ResponseItem(models::ResponseItem),
    InterAgentCommunication(InterAgentCommunication),
    InterAgentCommunicationMetadata { trigger_turn: bool },
    Compacted(protocol::CompactedItem),
    TurnContext(protocol::TurnContextItem),
    WorldState(Value),
    EventMsg(protocol::EventMsg),
    Unsupported { kind: String, payload: Value },
}

impl RolloutItem {
    pub fn type_name(&self) -> &str {
        match self {
            Self::SessionMeta(_) => "session_meta",
            Self::ResponseItem(_) => "response_item",
            Self::InterAgentCommunication(_) => "inter_agent_communication",
            Self::InterAgentCommunicationMetadata { .. } => "inter_agent_communication_metadata",
            Self::Compacted(_) => "compacted",
            Self::TurnContext(_) => "turn_context",
            Self::WorldState(_) => "world_state",
            Self::EventMsg(_) => "event_msg",
            Self::Unsupported { kind, .. } => kind.as_str(),
        }
    }
}

pub fn parse_rollout_line(value: Value) -> Result<RolloutLine> {
    let object = value
        .as_object()
        .ok_or_else(|| anyhow!("rollout line must be an object"))?;
    let timestamp = object
        .get("timestamp")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow!("rollout line has no timestamp"))?
        .to_string();
    let ordinal = object.get("ordinal").and_then(Value::as_u64);
    let kind = object
        .get("type")
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow!("rollout line has no type"))?;
    let payload = object.get("payload").cloned().unwrap_or(Value::Null);
    let item = match kind {
        "session_meta" => RolloutItem::SessionMeta(protocol::session_meta_line(&payload)?),
        "response_item" => RolloutItem::ResponseItem(models::response_item(&payload)?),
        "event_msg" => RolloutItem::EventMsg(protocol::event_msg(&payload)?),
        "turn_context" => RolloutItem::TurnContext(protocol::turn_context(&payload)?),
        "world_state" => RolloutItem::WorldState(payload),
        "compacted" => RolloutItem::Compacted(protocol::compacted(&payload)?),
        "inter_agent_communication" => {
            RolloutItem::InterAgentCommunication(InterAgentCommunication {
                id: payload
                    .get("id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                content: payload
                    .get("content")
                    .or_else(|| payload.get("message"))
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
            })
        }
        "inter_agent_communication_metadata" => RolloutItem::InterAgentCommunicationMetadata {
            trigger_turn: payload
                .get("trigger_turn")
                .and_then(Value::as_bool)
                .unwrap_or(false),
        },
        other => RolloutItem::Unsupported {
            kind: other.to_string(),
            payload,
        },
    };
    Ok(RolloutLine {
        timestamp,
        ordinal,
        item,
    })
}

pub mod models {
    use super::*;

    #[derive(Debug, Clone, Serialize)]
    pub enum ResponseItem {
        Message {
            id: Option<String>,
            role: String,
            content: Vec<ContentItem>,
            phase: Option<MessagePhase>,
        },
        AgentMessage {
            id: Option<String>,
            content: Vec<ContentItem>,
        },
        Reasoning,
        LocalShellCall {
            id: Option<String>,
            call_id: Option<String>,
            status: String,
            action: LocalShellAction,
        },
        FunctionCall {
            name: String,
            namespace: Option<String>,
            arguments: String,
            call_id: String,
        },
        FunctionCallOutput {
            call_id: String,
            output: FunctionCallOutputPayload,
        },
        CustomToolCall {
            call_id: String,
            name: String,
            namespace: Option<String>,
            input: String,
            status: Option<String>,
        },
        CustomToolCallOutput {
            call_id: String,
            name: Option<String>,
            output: FunctionCallOutputPayload,
        },
        WebSearchCall {
            id: Option<String>,
            status: Option<String>,
            action: Option<WebSearchAction>,
        },
        ImageGenerationCall {
            id: Option<String>,
            status: String,
            revised_prompt: Option<String>,
            result: String,
        },
        Compaction,
        ContextCompaction,
        CompactionTrigger,
        AdditionalTools,
        ToolSearchCall,
        ToolSearchOutput,
        Other,
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum ContentItem {
        InputText {
            text: String,
        },
        OutputText {
            text: String,
        },
        InputImage {
            image_url: String,
            detail: Option<String>,
        },
        InputAudio {
            audio_url: String,
        },
        Raw(Value),
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum MessagePhase {
        Commentary,
        FinalAnswer,
        Plan,
        Other(String),
    }

    impl std::fmt::Display for MessagePhase {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                Self::Commentary => f.write_str("commentary"),
                Self::FinalAnswer => f.write_str("final_answer"),
                Self::Plan => f.write_str("plan"),
                Self::Other(value) => f.write_str(value),
            }
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum LocalShellAction {
        Exec(LocalShellExec),
        Other(Value),
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct LocalShellExec {
        pub command: Vec<String>,
        pub working_directory: Option<String>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct FunctionCallOutputPayload {
        pub body: OutputBody,
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum OutputBody {
        Text(String),
        Content(Vec<ContentItem>),
        Json(Value),
    }

    impl OutputBody {
        pub fn to_text(&self) -> Option<String> {
            match self {
                Self::Text(value) => Some(value.clone()),
                Self::Content(values) => Some(content_items_to_text(values)),
                Self::Json(value) => Some(super::compact_json(value)),
            }
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum WebSearchAction {
        Search {
            query: Option<String>,
            queries: Vec<String>,
        },
        OpenPage {
            url: String,
        },
        FindInPage {
            url: String,
            pattern: String,
        },
        Other(Value),
    }

    pub fn plaintext_agent_message_content(content: &[ContentItem]) -> Option<String> {
        let text = content_items_to_text(content);
        (!text.trim().is_empty()).then_some(text)
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
                ContentItem::Raw(value) => value
                    .get("text")
                    .and_then(Value::as_str)
                    .map(str::to_string),
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn response_item(value: &Value) -> Result<ResponseItem> {
        let kind = value.get("type").and_then(Value::as_str).unwrap_or("other");
        let id = value.get("id").and_then(Value::as_str).map(str::to_string);
        Ok(match kind {
            "message" => ResponseItem::Message {
                id,
                role: value
                    .get("role")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_string(),
                content: parse_content_items(value.get("content").unwrap_or(&Value::Null)),
                phase: value.get("phase").and_then(parse_phase),
            },
            "agent_message" => ResponseItem::AgentMessage {
                id,
                content: parse_content_items(value.get("content").unwrap_or(&Value::Null)),
            },
            "reasoning" => ResponseItem::Reasoning,
            "local_shell_call" => ResponseItem::LocalShellCall {
                id,
                call_id: value
                    .get("call_id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                status: string_field(value, "status"),
                action: parse_local_shell_action(value.get("action").unwrap_or(&Value::Null)),
            },
            "function_call" => ResponseItem::FunctionCall {
                name: string_field(value, "name"),
                namespace: value
                    .get("namespace")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                arguments: value
                    .get("arguments")
                    .map(|value| match value {
                        Value::String(text) => text.clone(),
                        value => compact_json(value),
                    })
                    .unwrap_or_default(),
                call_id: string_field(value, "call_id"),
            },
            "function_call_output" => ResponseItem::FunctionCallOutput {
                call_id: string_field(value, "call_id"),
                output: parse_output(value.get("output").unwrap_or(&Value::Null)),
            },
            "custom_tool_call" => ResponseItem::CustomToolCall {
                call_id: string_field(value, "call_id"),
                name: string_field(value, "name"),
                namespace: value
                    .get("namespace")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                input: value
                    .get("input")
                    .map(|value| match value {
                        Value::String(text) => text.clone(),
                        value => compact_json(value),
                    })
                    .unwrap_or_default(),
                status: value
                    .get("status")
                    .and_then(Value::as_str)
                    .map(str::to_string),
            },
            "custom_tool_call_output" => ResponseItem::CustomToolCallOutput {
                call_id: string_field(value, "call_id"),
                name: value
                    .get("name")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                output: parse_output(value.get("output").unwrap_or(&Value::Null)),
            },
            "web_search_call" => ResponseItem::WebSearchCall {
                id,
                status: value
                    .get("status")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                action: value.get("action").and_then(parse_web_search_action),
            },
            "image_generation_call" => ResponseItem::ImageGenerationCall {
                id,
                status: string_field(value, "status"),
                revised_prompt: value
                    .get("revised_prompt")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                result: string_field(value, "result"),
            },
            "compaction_summary" | "compaction" => ResponseItem::Compaction,
            "context_compaction" => ResponseItem::ContextCompaction,
            "compaction_trigger" => ResponseItem::CompactionTrigger,
            "additional_tools" => ResponseItem::AdditionalTools,
            "tool_search_call" => ResponseItem::ToolSearchCall,
            "tool_search_output" => ResponseItem::ToolSearchOutput,
            _ => ResponseItem::Other,
        })
    }

    fn parse_content_items(value: &Value) -> Vec<ContentItem> {
        let values = value.as_array().cloned().unwrap_or_default();
        values
            .into_iter()
            .map(|item| {
                let kind = item.get("type").and_then(Value::as_str).unwrap_or("");
                match kind {
                    "input_text" | "output_text" => {
                        let text = string_field(&item, "text");
                        if kind == "input_text" {
                            ContentItem::InputText { text }
                        } else {
                            ContentItem::OutputText { text }
                        }
                    }
                    "input_image" | "image" => ContentItem::InputImage {
                        image_url: item
                            .get("image_url")
                            .or_else(|| item.get("url"))
                            .map(value_to_string)
                            .unwrap_or_default(),
                        detail: item.get("detail").map(value_to_string),
                    },
                    "input_audio" | "audio" => ContentItem::InputAudio {
                        audio_url: item
                            .get("audio_url")
                            .or_else(|| item.get("url"))
                            .map(value_to_string)
                            .unwrap_or_default(),
                    },
                    _ => ContentItem::Raw(item),
                }
            })
            .collect()
    }

    fn parse_output(value: &Value) -> FunctionCallOutputPayload {
        let body = match value {
            Value::String(text) => OutputBody::Text(text.clone()),
            Value::Array(_) => OutputBody::Content(parse_content_items(value)),
            value => OutputBody::Json(value.clone()),
        };
        FunctionCallOutputPayload { body }
    }

    fn parse_local_shell_action(value: &Value) -> LocalShellAction {
        if value.get("type").and_then(Value::as_str) == Some("exec") {
            LocalShellAction::Exec(LocalShellExec {
                command: value
                    .get("command")
                    .and_then(command_vec)
                    .unwrap_or_default(),
                working_directory: value
                    .get("working_directory")
                    .or_else(|| value.get("cwd"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
            })
        } else {
            LocalShellAction::Other(value.clone())
        }
    }

    pub fn parse_phase(value: &Value) -> Option<MessagePhase> {
        let value = value.as_str()?;
        Some(match value {
            "commentary" => MessagePhase::Commentary,
            "final" | "final_answer" => MessagePhase::FinalAnswer,
            "plan" => MessagePhase::Plan,
            other => MessagePhase::Other(other.to_string()),
        })
    }

    fn parse_web_search_action(value: &Value) -> Option<WebSearchAction> {
        let kind = value.get("type").and_then(Value::as_str).unwrap_or("");
        Some(match kind {
            "search" => WebSearchAction::Search {
                query: value
                    .get("query")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                queries: value
                    .get("queries")
                    .and_then(command_vec)
                    .unwrap_or_default(),
            },
            "open_page" | "open" => WebSearchAction::OpenPage {
                url: string_field(value, "url"),
            },
            "find_in_page" | "find" => WebSearchAction::FindInPage {
                url: string_field(value, "url"),
                pattern: string_field(value, "pattern"),
            },
            _ => WebSearchAction::Other(value.clone()),
        })
    }

    fn command_vec(value: &Value) -> Option<Vec<String>> {
        if let Some(text) = value.as_str() {
            return Some(vec![text.to_string()]);
        }
        value
            .as_array()
            .map(|values| values.iter().map(value_to_string).collect())
    }

    fn string_field(value: &Value, key: &str) -> String {
        value.get(key).map(value_to_string).unwrap_or_default()
    }

    fn value_to_string(value: &Value) -> String {
        value
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(|| compact_json(value))
    }
}

pub mod protocol {
    use super::*;
    use crate::wire::models;

    #[derive(Debug, Clone, Serialize)]
    pub struct SessionMetaLine {
        pub meta: SessionMeta,
        pub git: Option<Value>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct SessionMeta {
        pub session_id: String,
        pub id: String,
        pub forked_from_id: Option<String>,
        pub parent_thread_id: Option<String>,
        pub timestamp: String,
        pub cwd: String,
        pub cli_version: String,
        pub source: String,
        pub model_provider: Option<String>,
        pub history_mode: String,
        pub history_base: Option<HistoryBase>,
        pub subagent_history_start_ordinal: Option<u64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct HistoryBase {
        pub thread_id: String,
        pub end_ordinal_exclusive: u64,
        pub end_byte_offset: u64,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TurnContextItem {
        pub turn_id: Option<String>,
        pub cwd: String,
        pub model: String,
        pub raw: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct CompactedItem {
        pub message: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub enum EventMsg {
        TurnStarted(TurnStartedEvent),
        TurnComplete(TurnCompleteEvent),
        TurnAborted(TurnAbortedEvent),
        TokenCount(TokenCountEvent),
        RawResponseCompleted(RawResponseCompletedEvent),
        UserMessage(UserMessageEvent),
        AgentMessage(AgentMessageEvent),
        ExecCommandBegin(ExecCommandBeginEvent),
        ExecCommandEnd(ExecCommandEndEvent),
        McpToolCallBegin(McpToolCallBeginEvent),
        McpToolCallEnd(McpToolCallEndEvent),
        DynamicToolCallRequest(DynamicToolCallRequest),
        DynamicToolCallResponse(DynamicToolCallResponseEvent),
        PatchApplyBegin(PatchApplyBeginEvent),
        PatchApplyUpdated,
        PatchApplyEnd(PatchApplyEndEvent),
        WebSearchBegin(WebSearchBeginEvent),
        WebSearchEnd(WebSearchEndEvent),
        RequestUserInput(request_user_input::RequestUserInputEvent),
        ImageGenerationBegin(ImageGenerationBeginEvent),
        ImageGenerationEnd(ImageGenerationEndEvent),
        ViewImageToolCall(ViewImageToolCallEvent),
        ExecApprovalRequest(ExecApprovalRequestEvent),
        ApplyPatchApprovalRequest(ApplyPatchApprovalRequestEvent),
        RequestPermissions(request_permissions::RequestPermissionsEvent),
        GuardianAssessment(GuardianAssessmentEvent),
        ElicitationRequest(ElicitationRequestEvent),
        PlanUpdate(UpdatePlanArgs),
        SessionConfigured(SessionConfiguredEvent),
        ThreadSettingsApplied(ThreadSettingsAppliedEvent),
        ItemStarted(ItemStartedEvent),
        ItemCompleted(ItemCompletedEvent),
        Error(ErrorEvent),
        ThreadRolledBack(ThreadRolledBackEvent),
        ContextCompacted,
        Skipped { kind: String, payload: Value },
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TurnStartedEvent {
        pub turn_id: String,
        pub started_at: Option<i64>,
        pub model_context_window: Option<i64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TurnCompleteEvent {
        pub turn_id: String,
        pub last_agent_message: Option<String>,
        pub error: Option<ErrorEvent>,
        pub started_at: Option<i64>,
        pub completed_at: Option<i64>,
        pub duration_ms: Option<i64>,
        pub time_to_first_token_ms: Option<i64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TurnAbortedEvent {
        pub turn_id: Option<String>,
        pub reason: String,
        pub started_at: Option<i64>,
        pub completed_at: Option<i64>,
        pub duration_ms: Option<i64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TokenUsage {
        pub input_tokens: i64,
        pub cached_input_tokens: i64,
        pub cache_write_input_tokens: i64,
        pub output_tokens: i64,
        pub reasoning_output_tokens: i64,
        pub total_tokens: i64,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TokenUsageInfo {
        pub total_token_usage: TokenUsage,
        pub last_token_usage: TokenUsage,
        pub model_context_window: Option<i64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct TokenCountEvent {
        pub info: Option<TokenUsageInfo>,
        pub rate_limits: Option<Value>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct RawResponseCompletedEvent {
        pub token_usage: Option<TokenUsage>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct UserMessageEvent {
        pub client_id: Option<String>,
        pub message: String,
        pub images: Option<Vec<String>>,
        pub image_details: Vec<Option<Value>>,
        pub local_images: Vec<String>,
        pub local_image_details: Vec<Option<Value>>,
        pub audio: Option<Vec<String>>,
        pub local_audio: Vec<String>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct AgentMessageEvent {
        pub message: String,
        pub phase: Option<models::MessagePhase>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ExecCommandBeginEvent {
        pub call_id: String,
        pub turn_id: String,
        pub started_at_ms: i64,
        pub command: Vec<String>,
        pub cwd: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ExecCommandEndEvent {
        pub call_id: String,
        pub turn_id: String,
        pub completed_at_ms: i64,
        pub command: Vec<String>,
        pub cwd: String,
        pub stdout: String,
        pub stderr: String,
        pub aggregated_output: String,
        pub exit_code: i32,
        pub duration_ms: i64,
        pub formatted_output: String,
        pub status: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct McpInvocation {
        pub server: String,
        pub tool: String,
        pub arguments: Option<Value>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct WireDuration {
        pub millis: i64,
    }

    impl WireDuration {
        pub fn as_millis(&self) -> u128 {
            self.millis.max(0) as u128
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct McpToolCallBeginEvent {
        pub call_id: String,
        pub invocation: McpInvocation,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct McpToolCallEndEvent {
        pub call_id: String,
        pub invocation: McpInvocation,
        pub result: Value,
        pub duration: WireDuration,
        pub success: bool,
    }

    impl McpToolCallEndEvent {
        pub fn is_success(&self) -> bool {
            self.success
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct DynamicToolCallRequest {
        pub call_id: String,
        pub turn_id: String,
        pub namespace: Option<String>,
        pub tool: String,
        pub arguments: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct DynamicToolCallResponseEvent {
        pub call_id: String,
        pub turn_id: String,
        pub namespace: Option<String>,
        pub tool: String,
        pub content_items: Value,
        pub error: Option<String>,
        pub success: bool,
        pub duration: WireDuration,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct PatchApplyBeginEvent {
        pub call_id: String,
        pub turn_id: String,
        pub changes: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct PatchApplyEndEvent {
        pub call_id: String,
        pub turn_id: String,
        pub stdout: String,
        pub stderr: String,
        pub changes: Value,
        pub status: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct WebSearchBeginEvent {
        pub call_id: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct WebSearchEndEvent {
        pub call_id: String,
        pub query: String,
        pub action: Value,
        pub results: Option<Vec<Value>>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ImageGenerationBeginEvent {
        pub call_id: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ImageGenerationEndEvent {
        pub call_id: String,
        pub result: String,
        pub revised_prompt: Option<String>,
        pub saved_path: Option<String>,
        pub status: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ViewImageToolCallEvent {
        pub call_id: String,
        pub path: String,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ExecApprovalRequestEvent {
        pub call_id: String,
        pub turn_id: String,
        pub command: Vec<String>,
        pub cwd: String,
        pub reason: Option<String>,
        pub available_decisions: Vec<String>,
        pub approval_id: Option<String>,
        pub started_at_ms: i64,
    }

    impl ExecApprovalRequestEvent {
        pub fn effective_approval_id(&self) -> String {
            self.approval_id
                .clone()
                .unwrap_or_else(|| self.call_id.clone())
        }

        pub fn effective_available_decisions(&self) -> &[String] {
            &self.available_decisions
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ApplyPatchApprovalRequestEvent {
        pub call_id: String,
        pub turn_id: String,
        pub reason: Option<String>,
        pub started_at_ms: i64,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct GuardianAssessmentEvent {
        pub id: String,
        pub turn_id: String,
        pub target_item_id: Option<String>,
        pub rationale: Option<String>,
        pub status: String,
        pub started_at_ms: i64,
        pub completed_at_ms: Option<i64>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ElicitationRequestEvent {
        pub turn_id: Option<String>,
        pub raw: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct UpdatePlanArgs(pub Value);

    #[derive(Debug, Clone, Serialize)]
    pub struct SessionConfiguredEvent(pub Value);

    #[derive(Debug, Clone, Serialize)]
    pub struct ThreadSettingsSnapshot {
        pub model: String,
        pub model_provider_id: String,
        #[serde(flatten)]
        pub raw: BTreeMap<String, Value>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ThreadSettingsAppliedEvent {
        pub thread_settings: ThreadSettingsSnapshot,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ItemStartedEvent {
        pub turn_id: String,
        pub item: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ItemCompletedEvent {
        pub turn_id: String,
        pub item: Value,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ErrorEvent {
        pub message: String,
    }

    impl ErrorEvent {
        pub fn affects_turn_status(&self) -> bool {
            true
        }
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct ThreadRolledBackEvent {
        pub num_turns: u32,
    }

    pub fn session_meta_line(value: &Value) -> Result<SessionMetaLine> {
        let session_id = string_field(value, "session_id");
        let id = value
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or(&session_id)
            .to_string();
        let history_base = value.get("history_base").and_then(parse_history_base);
        Ok(SessionMetaLine {
            meta: SessionMeta {
                session_id,
                id,
                forked_from_id: value
                    .get("forked_from_id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                parent_thread_id: value
                    .get("parent_thread_id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                timestamp: string_field(value, "timestamp"),
                cwd: string_field(value, "cwd"),
                cli_version: string_field(value, "cli_version"),
                source: string_field(value, "source"),
                model_provider: value
                    .get("model_provider")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                history_mode: value
                    .get("history_mode")
                    .and_then(Value::as_str)
                    .unwrap_or("legacy")
                    .to_string(),
                history_base,
                subagent_history_start_ordinal: value
                    .get("subagent_history_start_ordinal")
                    .and_then(Value::as_u64),
            },
            git: value.get("git").cloned(),
        })
    }

    pub fn turn_context(value: &Value) -> Result<TurnContextItem> {
        Ok(TurnContextItem {
            turn_id: value
                .get("turn_id")
                .and_then(Value::as_str)
                .map(str::to_string),
            cwd: string_field(value, "cwd"),
            model: string_field(value, "model"),
            raw: value.clone(),
        })
    }

    pub fn compacted(value: &Value) -> Result<CompactedItem> {
        Ok(CompactedItem {
            message: string_field(value, "message"),
        })
    }

    pub fn event_msg(value: &Value) -> Result<EventMsg> {
        let kind = value.get("type").and_then(Value::as_str).unwrap_or("");
        Ok(match kind {
            "task_started" | "turn_started" => EventMsg::TurnStarted(TurnStartedEvent {
                turn_id: string_field(value, "turn_id"),
                started_at: integer_field(value, "started_at"),
                model_context_window: integer_field(value, "model_context_window"),
            }),
            "task_complete" | "turn_complete" => EventMsg::TurnComplete(parse_turn_complete(value)),
            "turn_aborted" => EventMsg::TurnAborted(TurnAbortedEvent {
                turn_id: value
                    .get("turn_id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                reason: value.get("reason").map(value_to_string).unwrap_or_default(),
                started_at: integer_field(value, "started_at"),
                completed_at: integer_field(value, "completed_at"),
                duration_ms: integer_field(value, "duration_ms"),
            }),
            "token_count" => EventMsg::TokenCount(parse_token_count(value)),
            "raw_response_completed" => EventMsg::RawResponseCompleted(RawResponseCompletedEvent {
                token_usage: value.get("token_usage").and_then(parse_token_usage),
            }),
            "user_message" => EventMsg::UserMessage(parse_user_message(value)),
            "agent_message" => EventMsg::AgentMessage(AgentMessageEvent {
                message: string_field(value, "message"),
                phase: value.get("phase").and_then(models::parse_phase),
            }),
            "exec_command_begin" => EventMsg::ExecCommandBegin(ExecCommandBeginEvent {
                call_id: string_field(value, "call_id"),
                turn_id: string_field(value, "turn_id"),
                started_at_ms: integer_field(value, "started_at_ms").unwrap_or_default(),
                command: value
                    .get("command")
                    .and_then(command_vec)
                    .unwrap_or_default(),
                cwd: string_field(value, "cwd"),
            }),
            "exec_command_end" => EventMsg::ExecCommandEnd(parse_exec_end(value)),
            "mcp_tool_call_begin" => EventMsg::McpToolCallBegin(parse_mcp_begin(value)),
            "mcp_tool_call_end" => EventMsg::McpToolCallEnd(parse_mcp_end(value)),
            "dynamic_tool_call_request" => {
                EventMsg::DynamicToolCallRequest(DynamicToolCallRequest {
                    call_id: string_field(value, "call_id"),
                    turn_id: string_field(value, "turn_id"),
                    namespace: value
                        .get("namespace")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                    tool: string_field(value, "tool"),
                    arguments: value.get("arguments").cloned().unwrap_or(Value::Null),
                })
            }
            "dynamic_tool_call_response" => {
                EventMsg::DynamicToolCallResponse(parse_dynamic_response(value))
            }
            "patch_apply_begin" => EventMsg::PatchApplyBegin(PatchApplyBeginEvent {
                call_id: string_field(value, "call_id"),
                turn_id: string_field(value, "turn_id"),
                changes: value.get("changes").cloned().unwrap_or(Value::Null),
            }),
            "patch_apply_updated" => EventMsg::PatchApplyUpdated,
            "patch_apply_end" => EventMsg::PatchApplyEnd(PatchApplyEndEvent {
                call_id: string_field(value, "call_id"),
                turn_id: string_field(value, "turn_id"),
                stdout: string_field(value, "stdout"),
                stderr: string_field(value, "stderr"),
                changes: value.get("changes").cloned().unwrap_or(Value::Null),
                status: string_field(value, "status"),
            }),
            "web_search_begin" => EventMsg::WebSearchBegin(WebSearchBeginEvent {
                call_id: string_field(value, "call_id"),
            }),
            "web_search_end" => EventMsg::WebSearchEnd(parse_web_search_end(value)),
            "request_user_input" => EventMsg::RequestUserInput(request_user_input::parse(value)),
            "image_generation_begin" => EventMsg::ImageGenerationBegin(ImageGenerationBeginEvent {
                call_id: string_field(value, "call_id"),
            }),
            "image_generation_end" => EventMsg::ImageGenerationEnd(ImageGenerationEndEvent {
                call_id: string_field(value, "call_id"),
                result: string_field(value, "result"),
                revised_prompt: value
                    .get("revised_prompt")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                saved_path: value
                    .get("saved_path")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                status: string_field(value, "status"),
            }),
            "view_image_tool_call" => EventMsg::ViewImageToolCall(ViewImageToolCallEvent {
                call_id: string_field(value, "call_id"),
                path: string_field(value, "path"),
            }),
            "exec_approval_request" => EventMsg::ExecApprovalRequest(parse_exec_approval(value)),
            "apply_patch_approval_request" => {
                EventMsg::ApplyPatchApprovalRequest(ApplyPatchApprovalRequestEvent {
                    call_id: string_field(value, "call_id"),
                    turn_id: string_field(value, "turn_id"),
                    reason: value
                        .get("reason")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                    started_at_ms: integer_field(value, "started_at_ms").unwrap_or_default(),
                })
            }
            "request_permissions" => {
                EventMsg::RequestPermissions(request_permissions::parse(value))
            }
            "guardian_assessment" => EventMsg::GuardianAssessment(parse_guardian(value)),
            "elicitation_request" => EventMsg::ElicitationRequest(ElicitationRequestEvent {
                turn_id: value
                    .get("turn_id")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                raw: value.clone(),
            }),
            "plan_update" => EventMsg::PlanUpdate(UpdatePlanArgs(value.clone())),
            "session_configured" => {
                EventMsg::SessionConfigured(SessionConfiguredEvent(value.clone()))
            }
            "thread_settings_applied" => {
                EventMsg::ThreadSettingsApplied(parse_thread_settings(value))
            }
            "item_started" => EventMsg::ItemStarted(ItemStartedEvent {
                turn_id: string_field(value, "turn_id"),
                item: value.get("item").cloned().unwrap_or(Value::Null),
            }),
            "item_completed" => EventMsg::ItemCompleted(ItemCompletedEvent {
                turn_id: string_field(value, "turn_id"),
                item: value.get("item").cloned().unwrap_or(Value::Null),
            }),
            "error" => EventMsg::Error(ErrorEvent {
                message: string_field(value, "message"),
            }),
            "thread_rolled_back" => EventMsg::ThreadRolledBack(ThreadRolledBackEvent {
                num_turns: integer_field(value, "num_turns").unwrap_or_default().max(0) as u32,
            }),
            "context_compacted" => EventMsg::ContextCompacted,
            other => EventMsg::Skipped {
                kind: other.to_string(),
                payload: value.clone(),
            },
        })
    }

    fn parse_turn_complete(value: &Value) -> TurnCompleteEvent {
        TurnCompleteEvent {
            turn_id: string_field(value, "turn_id"),
            last_agent_message: value
                .get("last_agent_message")
                .and_then(Value::as_str)
                .map(str::to_string),
            error: value.get("error").and_then(|error| {
                error
                    .get("message")
                    .and_then(Value::as_str)
                    .map(|message| ErrorEvent {
                        message: message.to_string(),
                    })
            }),
            started_at: integer_field(value, "started_at"),
            completed_at: integer_field(value, "completed_at"),
            duration_ms: integer_field(value, "duration_ms"),
            time_to_first_token_ms: integer_field(value, "time_to_first_token_ms"),
        }
    }

    fn parse_token_count(value: &Value) -> TokenCountEvent {
        let info = value.get("info").and_then(|info| {
            Some(TokenUsageInfo {
                total_token_usage: parse_token_usage(info.get("total_token_usage")?)?,
                last_token_usage: parse_token_usage(info.get("last_token_usage")?)?,
                model_context_window: integer_field(info, "model_context_window"),
            })
        });
        TokenCountEvent {
            info,
            rate_limits: value.get("rate_limits").cloned(),
        }
    }

    fn parse_user_message(value: &Value) -> UserMessageEvent {
        UserMessageEvent {
            client_id: value
                .get("client_id")
                .and_then(Value::as_str)
                .map(str::to_string),
            message: string_field(value, "message"),
            images: string_vec_opt(value.get("images")),
            image_details: value
                .get("image_details")
                .map(value_vec)
                .unwrap_or_default(),
            local_images: string_vec(value.get("local_images")),
            local_image_details: value
                .get("local_image_details")
                .map(value_vec)
                .unwrap_or_default(),
            audio: string_vec_opt(value.get("audio")),
            local_audio: string_vec(value.get("local_audio")),
        }
    }

    fn parse_exec_end(value: &Value) -> ExecCommandEndEvent {
        ExecCommandEndEvent {
            call_id: string_field(value, "call_id"),
            turn_id: string_field(value, "turn_id"),
            completed_at_ms: integer_field(value, "completed_at_ms").unwrap_or_default(),
            command: value
                .get("command")
                .and_then(command_vec)
                .unwrap_or_default(),
            cwd: string_field(value, "cwd"),
            stdout: string_field(value, "stdout"),
            stderr: string_field(value, "stderr"),
            aggregated_output: string_field(value, "aggregated_output"),
            exit_code: integer_field(value, "exit_code").unwrap_or_default() as i32,
            duration_ms: duration_ms(value.get("duration").or_else(|| value.get("duration_ms")))
                .unwrap_or_default(),
            formatted_output: string_field(value, "formatted_output"),
            status: string_field(value, "status"),
        }
    }

    fn parse_mcp_begin(value: &Value) -> McpToolCallBeginEvent {
        McpToolCallBeginEvent {
            call_id: string_field(value, "call_id"),
            invocation: parse_invocation(value),
        }
    }

    fn parse_mcp_end(value: &Value) -> McpToolCallEndEvent {
        McpToolCallEndEvent {
            call_id: string_field(value, "call_id"),
            invocation: parse_invocation(value),
            result: value.get("result").cloned().unwrap_or(Value::Null),
            duration: WireDuration {
                millis: duration_ms(value.get("duration").or_else(|| value.get("duration_ms")))
                    .unwrap_or_default(),
            },
            success: value
                .get("success")
                .and_then(Value::as_bool)
                .unwrap_or_else(|| {
                    value
                        .get("is_success")
                        .and_then(Value::as_bool)
                        .unwrap_or(false)
                }),
        }
    }

    fn parse_invocation(value: &Value) -> McpInvocation {
        let invocation = value.get("invocation").unwrap_or(value);
        McpInvocation {
            server: string_field(invocation, "server"),
            tool: string_field(invocation, "tool"),
            arguments: invocation.get("arguments").cloned(),
        }
    }

    fn parse_dynamic_response(value: &Value) -> DynamicToolCallResponseEvent {
        DynamicToolCallResponseEvent {
            call_id: string_field(value, "call_id"),
            turn_id: string_field(value, "turn_id"),
            namespace: value
                .get("namespace")
                .and_then(Value::as_str)
                .map(str::to_string),
            tool: string_field(value, "tool"),
            content_items: value.get("content_items").cloned().unwrap_or(Value::Null),
            error: value
                .get("error")
                .and_then(Value::as_str)
                .map(str::to_string),
            success: value
                .get("success")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            duration: WireDuration {
                millis: duration_ms(value.get("duration").or_else(|| value.get("duration_ms")))
                    .unwrap_or_default(),
            },
        }
    }

    fn parse_web_search_end(value: &Value) -> WebSearchEndEvent {
        WebSearchEndEvent {
            call_id: string_field(value, "call_id"),
            query: string_field(value, "query"),
            action: value.get("action").cloned().unwrap_or(Value::Null),
            results: value.get("results").and_then(Value::as_array).cloned(),
        }
    }

    fn parse_exec_approval(value: &Value) -> ExecApprovalRequestEvent {
        ExecApprovalRequestEvent {
            call_id: string_field(value, "call_id"),
            turn_id: string_field(value, "turn_id"),
            command: value
                .get("command")
                .and_then(command_vec)
                .unwrap_or_default(),
            cwd: string_field(value, "cwd"),
            reason: value
                .get("reason")
                .and_then(Value::as_str)
                .map(str::to_string),
            available_decisions: string_vec(value.get("available_decisions")),
            approval_id: value
                .get("approval_id")
                .and_then(Value::as_str)
                .map(str::to_string),
            started_at_ms: integer_field(value, "started_at_ms").unwrap_or_default(),
        }
    }

    fn parse_guardian(value: &Value) -> GuardianAssessmentEvent {
        GuardianAssessmentEvent {
            id: string_field(value, "id"),
            turn_id: string_field(value, "turn_id"),
            target_item_id: value
                .get("target_item_id")
                .and_then(Value::as_str)
                .map(str::to_string),
            rationale: value
                .get("rationale")
                .and_then(Value::as_str)
                .map(str::to_string),
            status: string_field(value, "status"),
            started_at_ms: integer_field(value, "started_at_ms").unwrap_or_default(),
            completed_at_ms: integer_field(value, "completed_at_ms"),
        }
    }

    fn parse_thread_settings(value: &Value) -> ThreadSettingsAppliedEvent {
        let settings = value.get("thread_settings").unwrap_or(value);
        let mut raw = settings.as_object().cloned().unwrap_or_default();
        raw.remove("model");
        raw.remove("model_provider_id");
        ThreadSettingsAppliedEvent {
            thread_settings: ThreadSettingsSnapshot {
                model: string_field(settings, "model"),
                model_provider_id: string_field(settings, "model_provider_id"),
                raw: raw.into_iter().collect(),
            },
        }
    }

    fn parse_history_base(value: &Value) -> Option<HistoryBase> {
        Some(HistoryBase {
            thread_id: string_field(value, "thread_id"),
            end_ordinal_exclusive: value.get("end_ordinal_exclusive").and_then(Value::as_u64)?,
            end_byte_offset: value.get("end_byte_offset").and_then(Value::as_u64)?,
        })
    }

    fn parse_token_usage(value: &Value) -> Option<TokenUsage> {
        Some(TokenUsage {
            input_tokens: integer_field(value, "input_tokens")?,
            cached_input_tokens: integer_field(value, "cached_input_tokens").unwrap_or_default(),
            cache_write_input_tokens: integer_field(value, "cache_write_input_tokens")
                .unwrap_or_default(),
            output_tokens: integer_field(value, "output_tokens").unwrap_or_default(),
            reasoning_output_tokens: integer_field(value, "reasoning_output_tokens")
                .unwrap_or_default(),
            total_tokens: integer_field(value, "total_tokens").unwrap_or_default(),
        })
    }

    fn duration_ms(value: Option<&Value>) -> Option<i64> {
        let value = value?;
        integer_field_value(value).or_else(|| {
            value.get("secs").and_then(Value::as_i64).map(|secs| {
                secs.saturating_mul(1000).saturating_add(
                    value
                        .get("nanos")
                        .and_then(Value::as_i64)
                        .unwrap_or_default()
                        / 1_000_000,
                )
            })
        })
    }

    fn command_vec(value: &Value) -> Option<Vec<String>> {
        if let Some(text) = value.as_str() {
            return Some(vec![text.to_string()]);
        }
        value
            .as_array()
            .map(|values| values.iter().map(value_to_string).collect())
    }

    fn string_vec(value: Option<&Value>) -> Vec<String> {
        value.and_then(command_vec).unwrap_or_default()
    }

    fn string_vec_opt(value: Option<&Value>) -> Option<Vec<String>> {
        value.map(|value| string_vec(Some(value)))
    }

    fn value_vec(value: &Value) -> Vec<Option<Value>> {
        value
            .as_array()
            .map(|items| items.iter().cloned().map(Some).collect())
            .unwrap_or_default()
    }

    fn string_field(value: &Value, key: &str) -> String {
        value.get(key).map(value_to_string).unwrap_or_default()
    }

    fn integer_field(value: &Value, key: &str) -> Option<i64> {
        value.get(key).and_then(integer_field_value)
    }

    fn integer_field_value(value: &Value) -> Option<i64> {
        value
            .as_i64()
            .or_else(|| value.as_u64().and_then(|value| i64::try_from(value).ok()))
            .or_else(|| value.as_str().and_then(|value| value.parse().ok()))
    }

    fn value_to_string(value: &Value) -> String {
        value
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(|| super::compact_json(value))
    }
}

pub fn event_type(event: &protocol::EventMsg) -> String {
    match event {
        protocol::EventMsg::TurnStarted(_) => "turn_started",
        protocol::EventMsg::TurnComplete(_) => "turn_complete",
        protocol::EventMsg::TurnAborted(_) => "turn_aborted",
        protocol::EventMsg::TokenCount(_) => "token_count",
        protocol::EventMsg::RawResponseCompleted(_) => "raw_response_completed",
        protocol::EventMsg::UserMessage(_) => "user_message",
        protocol::EventMsg::AgentMessage(_) => "agent_message",
        protocol::EventMsg::ExecCommandBegin(_) => "exec_command_begin",
        protocol::EventMsg::ExecCommandEnd(_) => "exec_command_end",
        protocol::EventMsg::McpToolCallBegin(_) => "mcp_tool_call_begin",
        protocol::EventMsg::McpToolCallEnd(_) => "mcp_tool_call_end",
        protocol::EventMsg::DynamicToolCallRequest(_) => "dynamic_tool_call_request",
        protocol::EventMsg::DynamicToolCallResponse(_) => "dynamic_tool_call_response",
        protocol::EventMsg::PatchApplyBegin(_) => "patch_apply_begin",
        protocol::EventMsg::PatchApplyUpdated => "patch_apply_updated",
        protocol::EventMsg::PatchApplyEnd(_) => "patch_apply_end",
        protocol::EventMsg::WebSearchBegin(_) => "web_search_begin",
        protocol::EventMsg::WebSearchEnd(_) => "web_search_end",
        protocol::EventMsg::RequestUserInput(_) => "request_user_input",
        protocol::EventMsg::ImageGenerationBegin(_) => "image_generation_begin",
        protocol::EventMsg::ImageGenerationEnd(_) => "image_generation_end",
        protocol::EventMsg::ViewImageToolCall(_) => "view_image_tool_call",
        protocol::EventMsg::ExecApprovalRequest(_) => "exec_approval_request",
        protocol::EventMsg::ApplyPatchApprovalRequest(_) => "apply_patch_approval_request",
        protocol::EventMsg::RequestPermissions(_) => "request_permissions",
        protocol::EventMsg::GuardianAssessment(_) => "guardian_assessment",
        protocol::EventMsg::ElicitationRequest(_) => "elicitation_request",
        protocol::EventMsg::PlanUpdate(_) => "plan_update",
        protocol::EventMsg::SessionConfigured(_) => "session_configured",
        protocol::EventMsg::ThreadSettingsApplied(_) => "thread_settings_applied",
        protocol::EventMsg::ItemStarted(_) => "item_started",
        protocol::EventMsg::ItemCompleted(_) => "item_completed",
        protocol::EventMsg::Error(_) => "error",
        protocol::EventMsg::ThreadRolledBack(_) => "thread_rolled_back",
        protocol::EventMsg::ContextCompacted => "context_compacted",
        protocol::EventMsg::Skipped { kind, .. } => kind.as_str(),
    }
    .to_string()
}

pub mod items {
    pub type TurnItem = serde_json::Value;
}

pub mod request_user_input {
    use super::*;

    #[derive(Debug, Clone, Serialize)]
    pub struct RequestUserInputEvent {
        pub call_id: String,
        pub turn_id: String,
        pub questions: Vec<RequestUserInputQuestion>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct RequestUserInputQuestion {
        pub id: String,
        pub header: String,
        pub question: String,
        pub is_other: bool,
        pub is_secret: bool,
        pub options: Option<Vec<RequestUserInputOption>>,
    }

    #[derive(Debug, Clone, Serialize)]
    pub struct RequestUserInputOption {
        pub label: String,
        pub description: String,
    }

    pub fn parse(value: &Value) -> RequestUserInputEvent {
        let questions = value
            .get("questions")
            .and_then(Value::as_array)
            .map(|questions| {
                questions
                    .iter()
                    .map(|question| RequestUserInputQuestion {
                        id: string_field(question, "id"),
                        header: string_field(question, "header"),
                        question: string_field(question, "question"),
                        is_other: question
                            .get("is_other")
                            .and_then(Value::as_bool)
                            .unwrap_or(false),
                        is_secret: question
                            .get("is_secret")
                            .and_then(Value::as_bool)
                            .unwrap_or(false),
                        options: question.get("options").and_then(|options| {
                            options.as_array().map(|options| {
                                options
                                    .iter()
                                    .map(|option| RequestUserInputOption {
                                        label: string_field(option, "label"),
                                        description: string_field(option, "description"),
                                    })
                                    .collect()
                            })
                        }),
                    })
                    .collect()
            })
            .unwrap_or_default();
        RequestUserInputEvent {
            call_id: string_field(value, "call_id"),
            turn_id: string_field(value, "turn_id"),
            questions,
        }
    }

    fn string_field(value: &Value, key: &str) -> String {
        value
            .get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    }
}

pub mod request_permissions {
    use super::*;

    #[derive(Debug, Clone, Serialize)]
    pub struct RequestPermissionsEvent {
        pub call_id: String,
        pub turn_id: String,
        pub cwd: Option<String>,
        pub reason: Option<String>,
        pub started_at_ms: i64,
    }

    pub fn parse(value: &Value) -> RequestPermissionsEvent {
        RequestPermissionsEvent {
            call_id: string_field(value, "call_id"),
            turn_id: string_field(value, "turn_id"),
            cwd: value.get("cwd").and_then(Value::as_str).map(str::to_string),
            reason: value
                .get("reason")
                .and_then(Value::as_str)
                .map(str::to_string),
            started_at_ms: value
                .get("started_at_ms")
                .and_then(Value::as_i64)
                .unwrap_or_default(),
        }
    }

    fn string_field(value: &Value, key: &str) -> String {
        value
            .get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    }
}

fn compact_json(value: &Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "null".to_string())
}
