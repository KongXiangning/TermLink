//! Versioned data transfer objects for the standalone rollout projection.
//!
//! This crate deliberately keeps the persisted history shape separate from
//! Codex's `thread/read` response. The latter is the compatibility baseline;
//! this DTO contains the additional data TermLink needs for later history and
//! memory queries.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Digest;
use std::collections::BTreeMap;

pub const HISTORY_SCHEMA_NAME: &str = "history-schema";
pub const HISTORY_SCHEMA_VERSION: u64 = 5;
pub const HISTORY_HASH_ALGORITHM: &str = "termlink-rollout-projection-v5-sha256";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AvailabilityStatus {
    Present,
    NotRecoverableFromRollout,
    PartialRollout,
    UnsupportedSchema,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryProjection {
    pub schema: String,
    pub schema_version: u64,
    pub hash_algorithm: String,
    pub conversation: ConversationDto,
    pub turns: Vec<TurnDto>,
    pub task_outcome: Option<TaskOutcomeDto>,
    /// Sparse field-level provenance for optional values. On a complete
    /// rollout, an omitted optional path has the implicit status
    /// `not_recoverable_from_rollout`; explicit entries are emitted for
    /// present, partial, unsupported, or approval-related fields.
    /// The legacy `availability` fields remain for compatibility.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub field_availability: BTreeMap<String, AvailabilityStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationDto {
    pub conversation_id: String,
    pub source: String,
    pub rollout_path: String,
    pub cli_version: Option<String>,
    pub codex_revision: Option<String>,
    pub thread_id: Option<String>,
    pub forked_from_id: Option<String>,
    pub parent_thread_id: Option<String>,
    pub history_mode: Option<String>,
    pub history_base: Option<HistoryBaseDto>,
    pub subagent_history_start_ordinal: Option<u64>,
    pub cwd: Option<String>,
    /// Project root when the rollout explicitly provides one. Codex rollouts
    /// commonly expose only `cwd`; the reducer leaves this null instead of
    /// pretending the two concepts are always identical.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    pub git_info: Option<Value>,
    pub model: Option<String>,
    pub model_provider: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profile: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settings: Option<SessionSettingsDto>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub settings_history: Vec<SettingsSnapshotDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_total: Option<UsageDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_rate_limit: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_context_window: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parse_progress: Option<ParseProgressDto>,
    /// The demo intentionally does not redact. This is a forward-compatible
    /// policy marker for a later multi-user service.
    pub redaction_policy: Option<String>,
    pub availability: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SessionSettingsDto {
    pub model: Option<String>,
    pub model_provider: Option<String>,
    pub cwd: Option<String>,
    pub service_tier: Option<String>,
    pub endpoint: Option<String>,
    pub profile: Option<String>,
    pub collaboration_mode: Option<Value>,
    pub plan_mode: Option<String>,
    pub reasoning_effort: Option<String>,
    pub approval_policy: Option<Value>,
    pub approvals_reviewer: Option<Value>,
    pub sandbox_policy: Option<Value>,
    pub permission_profile: Option<Value>,
    pub active_permission_profile: Option<Value>,
    pub settings_hash: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SettingsSnapshotDto {
    pub content_hash: String,
    pub captured_at: Option<String>,
    pub source: String,
    pub settings: SessionSettingsDto,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ParseProgressDto {
    pub status: String,
    pub source_bytes: u64,
    pub decoded_bytes: u64,
    pub budget_bytes: u64,
    pub line_count: u64,
    pub valid_records: u64,
    pub parse_errors: u64,
    pub first_parse_error: Option<String>,
    pub last_source_ordinal: Option<u64>,
    pub unmapped_types: BTreeMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryBaseDto {
    pub thread_id: String,
    pub end_ordinal_exclusive: u64,
    pub end_byte_offset: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnDto {
    pub turn_id: String,
    pub sequence: u64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub duration_ms: Option<i64>,
    pub time_to_first_token_ms: Option<i64>,
    pub context_window: Option<i64>,
    pub status: String,
    pub outcome: Option<String>,
    pub error: Option<String>,
    pub availability: Option<String>,
    pub usage: Option<UsageDto>,
    pub rate_limit: Option<Value>,
    pub items: Vec<HistoryItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskOutcomeDto {
    pub status: String,
    pub final_turn_id: Option<String>,
    pub conclusion: Option<String>,
    pub error: Option<String>,
    pub source_item_keys: Vec<String>,
    pub modified_files: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub modified_file_changes: Vec<FileChangeDto>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tool_item_keys: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub file_change_item_keys: Vec<String>,
    pub validation_item_keys: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub risks: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub unfinished_items: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub follow_up_suggestions: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plan_state: Option<String>,
    pub availability: String,
    /// A provisional outcome is a readable snapshot, not a terminal task
    /// conclusion. It must not be rendered as the final result by clients.
    #[serde(default)]
    pub provisional: bool,
    /// Metrics copied from the final projected turn so clients do not need to
    /// resolve `final_turn_id` before rendering the outcome card.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub final_metrics: Option<TaskOutcomeMetricsDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskOutcomeMetricsDto {
    pub usage: Option<UsageDto>,
    pub rate_limit: Option<Value>,
    pub context_window: Option<i64>,
    pub duration_ms: Option<i64>,
    pub time_to_first_token_ms: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UsageDto {
    pub input_tokens: i64,
    pub cached_input_tokens: i64,
    pub cache_write_input_tokens: i64,
    pub output_tokens: i64,
    pub reasoning_output_tokens: i64,
    pub total_tokens: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HistoryItemDto {
    pub item_key: String,
    pub turn_id: String,
    pub sequence: u64,
    /// Timestamp from the source rollout line that first produced this item.
    /// This is the value the client can use for per-message display; it is
    /// kept as the original ISO-8601 string instead of being rounded to an
    /// epoch value.
    pub timestamp: Option<String>,
    pub kind: String,
    /// Common UI presentation category. Source-specific `kind` remains
    /// available for compatibility and diagnostics.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub presentation_kind: Option<String>,
    /// Stable call-level grouping for Plan questions and answers. For
    /// request_user_input this is the originating call_id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
    /// The paired Plan item key. A plan_question points to its
    /// plan_answer, and a plan_answer points back to its question.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub related_item_key: Option<String>,
    pub visible: bool,
    pub content: Option<String>,
    pub summary: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    pub availability: Option<String>,
    pub source_ref: Option<SourceRefDto>,
    pub content_hash: Option<String>,
    pub detail_ref: Option<String>,
    pub question: Option<PlanQuestionDto>,
    pub answer: Option<PlanAnswerDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plan_state: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plan: Option<PlanSnapshotDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plan_action: Option<PlanActionDto>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub attachments: Vec<AttachmentDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub approval: Option<ApprovalDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool: Option<ToolItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanQuestionDto {
    pub id: String,
    pub header: String,
    pub question: String,
    pub is_other: bool,
    pub is_secret: bool,
    pub options: Vec<PlanQuestionOptionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanQuestionOptionDto {
    pub label: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanAnswerDto {
    pub answers: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlanSnapshotDto {
    pub state: String,
    pub explanation: Option<String>,
    pub version: u64,
    pub steps: Vec<PlanStepDto>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlanStepDto {
    pub step: String,
    pub status: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlanActionDto {
    pub action: String,
    pub source: String,
    pub value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub related_item_key: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AttachmentDto {
    pub kind: String,
    pub reference: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    pub availability: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FileChangeDto {
    pub path: String,
    pub change_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub move_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diff: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ArtifactDto {
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    pub availability: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WebSearchDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<Value>,
    #[serde(default)]
    pub results: Vec<WebSearchResultDto>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WebSearchResultDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ref_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ApprovalDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub call_id: Option<String>,
    pub approval_kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default)]
    pub available_decisions: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result_status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub requested_at_ms: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolved_at_ms: Option<i64>,
    pub availability: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceRefDto {
    pub source_ordinal: u64,
    pub rollout_index: Option<u64>,
    pub event_type: Option<String>,
    pub payload_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolItemDto {
    pub tool_kind: String,
    /// Codex's native call/execution id. `item_key` also embeds this value,
    /// but exposing it explicitly keeps the persistence contract independent
    /// of the UI key format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub call_id: Option<String>,
    pub tool_name: Option<String>,
    pub command: Option<Vec<String>>,
    /// Normalized shell commands extracted from an `exec` wrapper. This is
    /// separate from `command` because a wrapper may contain more than one
    /// shell invocation, while direct command events use argv-like parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commands: Option<Vec<String>>,
    /// UI-friendly command text derived only from recoverable command data;
    /// wrapper JavaScript is never placed here.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_command: Option<String>,
    pub arguments: Option<Value>,
    pub cwd: Option<String>,
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub execution_status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub succeeded: Option<bool>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<i64>,
    pub approval: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub approval_details: Option<ApprovalDto>,
    pub output_bytes: Option<u64>,
    pub output_sha256: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub file_changes: Vec<FileChangeDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact: Option<ArtifactDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub web_search: Option<WebSearchDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailPayloadDto {
    pub detail_ref: String,
    pub tool_kind: Option<String>,
    pub tool_name: Option<String>,
    /// Exactly one preferred representation of textual tool output. Other
    /// output fields are retained only when they contain distinct information.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub canonical_output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aggregated_output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub formatted_output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<Value>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub field_availability: BTreeMap<String, AvailabilityStatus>,
}

impl HistoryProjection {
    /// Hashes history content while excluding runtime/read metadata such as
    /// the local rollout path, updated timestamps, and availability markers.
    /// Object keys are recursively sorted so the hash is stable even if a
    /// serializer changes insertion order.
    pub fn content_hash(&self) -> String {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        hash_value(strip_runtime_metadata(value), "content")
    }

    /// Hashes the complete projection snapshot, including runtime/read
    /// metadata. This changes when the same history is read from a different
    /// path or at a different snapshot timestamp.
    pub fn snapshot_hash(&self) -> String {
        let value = serde_json::to_value(self).unwrap_or(Value::Null);
        hash_value(value, "snapshot")
    }
}

fn hash_value(value: Value, scope: &str) -> String {
    let canonical = canonicalize(value);
    let encoded = serde_json::to_vec(&canonical).unwrap_or_default();
    let mut hasher = sha2::Sha256::new();
    hasher.update(HISTORY_HASH_ALGORITHM.as_bytes());
    hasher.update([0]);
    hasher.update(scope.as_bytes());
    hasher.update([0]);
    hasher.update(encoded);
    hex::encode(&hasher.finalize())
}

fn strip_runtime_metadata(value: Value) -> Value {
    match value {
        Value::Array(values) => {
            Value::Array(values.into_iter().map(strip_runtime_metadata).collect())
        }
        Value::Object(object) => Value::Object(
            object
                .into_iter()
                .filter(|(key, _)| {
                    !matches!(
                        key.as_str(),
                        "rollout_path" | "updated_at" | "availability" | "field_availability"
                    )
                })
                .map(|(key, value)| (key, strip_runtime_metadata(value)))
                .collect(),
        ),
        other => other,
    }
}

fn canonicalize(value: Value) -> Value {
    match value {
        Value::Array(values) => Value::Array(values.into_iter().map(canonicalize).collect()),
        Value::Object(object) => {
            let sorted: BTreeMap<String, Value> = object
                .into_iter()
                .map(|(key, value)| (key, canonicalize(value)))
                .collect();
            Value::Object(sorted.into_iter().collect())
        }
        other => other,
    }
}

pub mod hex {
    pub fn encode(bytes: &[u8]) -> String {
        const HEX: &[u8; 16] = b"0123456789abcdef";
        let mut output = String::with_capacity(bytes.len() * 2);
        for byte in bytes {
            output.push(HEX[(byte >> 4) as usize] as char);
            output.push(HEX[(byte & 0x0f) as usize] as char);
        }
        output
    }
}
