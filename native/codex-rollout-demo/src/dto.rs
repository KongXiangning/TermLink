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
pub const HISTORY_SCHEMA_VERSION: u64 = 2;
pub const HISTORY_HASH_ALGORITHM: &str = "termlink-rollout-projection-v2-sha256";

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
    pub git_info: Option<Value>,
    pub model: Option<String>,
    pub model_provider: Option<String>,
    /// The demo intentionally does not redact. This is a forward-compatible
    /// policy marker for a later multi-user service.
    pub redaction_policy: Option<String>,
    pub availability: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
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
    pub validation_item_keys: Vec<String>,
    pub availability: String,
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
    pub visible: bool,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub availability: Option<String>,
    pub source_ref: Option<SourceRefDto>,
    pub content_hash: Option<String>,
    pub detail_ref: Option<String>,
    pub question: Option<PlanQuestionDto>,
    pub answer: Option<PlanAnswerDto>,
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
    pub tool_name: Option<String>,
    pub command: Option<Vec<String>>,
    /// Normalized shell commands extracted from an `exec` wrapper. This is
    /// separate from `command` because a wrapper may contain more than one
    /// shell invocation, while direct command events use argv-like parts.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commands: Option<Vec<String>>,
    pub arguments: Option<Value>,
    pub cwd: Option<String>,
    pub status: Option<String>,
    pub exit_code: Option<i32>,
    pub duration_ms: Option<i64>,
    pub approval: Option<Value>,
    pub output_bytes: Option<u64>,
    pub output_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailPayloadDto {
    pub detail_ref: String,
    pub tool_kind: Option<String>,
    pub tool_name: Option<String>,
    /// Exactly one preferred representation of textual tool output. Other
    /// output fields are retained only when they contain distinct information.
    #[serde(skip_serializing_if = "Option::is_none")]
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

    /// Compatibility alias for callers that still use the old root hash name.
    /// New persistence code should use `content_hash` or `snapshot_hash`
    /// explicitly.
    pub fn root_hash(&self) -> String {
        self.content_hash()
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
