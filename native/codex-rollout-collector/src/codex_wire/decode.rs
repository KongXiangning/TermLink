use codex_history::{RolloutItem, RolloutLine};
use codex_protocol::protocol::ThreadHistoryMode;
use serde::de::Error as _;
use serde_json::Value;

use crate::source::{HistoryBaseRef, SourceRecord};

use super::profile::CompatibilityProfile;
use super::unknown::{UnknownReason, UnknownRecord, WireAvailability, bounded_payload};

/// A successfully decoded vendor rollout line plus its original bounded JSON.
#[derive(Clone)]
pub struct KnownRecord {
    pub timestamp: String,
    pub ordinal: Option<u64>,
    pub line: RolloutLine,
    pub raw: Value,
    /// TermLink-owned lineage evidence extracted at the wire boundary.
    pub history_base: Option<HistoryBaseRef>,
}

#[derive(Clone)]
pub enum DecodedRecord {
    Known(KnownRecord),
    Unknown(UnknownRecord),
}

/// Decode the flattened/internal-tagged envelope workaround validated by the Spike.
pub fn decode_rollout_line(value: Value) -> serde_json::Result<RolloutLine> {
    let Value::Object(mut fields) = value else {
        return serde_json::from_value(value);
    };
    let timestamp = fields
        .remove("timestamp")
        .ok_or_else(|| serde_json::Error::custom("rollout line is missing timestamp"))
        .and_then(serde_json::from_value)?;
    let ordinal = fields
        .remove("ordinal")
        .map(serde_json::from_value::<Option<u64>>)
        .transpose()?
        .flatten();
    let item = serde_json::from_value(Value::Object(fields))?;
    Ok(RolloutLine {
        timestamp,
        ordinal,
        item,
    })
}

/// Decode a source record while retaining an explicit diagnostic for every failure.
pub fn decode_source_record(record: &SourceRecord, profile: CompatibilityProfile) -> DecodedRecord {
    let Some(value) = record.raw.as_ref() else {
        return DecodedRecord::Unknown(UnknownRecord {
            timestamp: record.timestamp.clone(),
            ordinal: record.rollout_ordinal,
            type_name: None,
            raw_payload: "<malformed source record>".to_string(),
            reason: match record.parse_error.as_deref() {
                Some(error) if is_payload_limit_error(error) => UnknownReason::PayloadLimit,
                Some(error) if error.contains("not_an_object") => UnknownReason::NotAnObject,
                _ => UnknownReason::MalformedJson,
            },
            availability: WireAvailability::PartialRollout,
        });
    };
    decode_value(value.clone(), profile)
}

/// Decode one raw JSON object. This is useful for conformance tests which do
/// not need a filesystem source.
pub fn decode_value(value: Value, _profile: CompatibilityProfile) -> DecodedRecord {
    let timestamp = value
        .as_object()
        .and_then(|object| object.get("timestamp"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);
    let ordinal = value
        .as_object()
        .and_then(|object| object.get("ordinal"))
        .and_then(Value::as_u64);
    let type_name = type_name(&value);

    if !value.is_object() {
        return unknown(
            timestamp,
            ordinal,
            type_name,
            &value,
            UnknownReason::NotAnObject,
        );
    }

    match decode_rollout_line(value.clone()) {
        Ok(line) if known_nested_variant(&value) => {
            if has_incompatible_history_base_mode(&line.item) {
                return unknown(
                    timestamp,
                    ordinal,
                    type_name,
                    &value,
                    UnknownReason::UnsupportedSchema,
                );
            }
            DecodedRecord::Known(KnownRecord {
                timestamp: line.timestamp.clone(),
                ordinal: line.ordinal,
                history_base: history_base_from_item(&line.item),
                line,
                raw: value,
            })
        }
        Ok(_) => unknown(
            timestamp,
            ordinal,
            type_name,
            &value,
            UnknownReason::UnknownVariant,
        ),
        Err(error) => {
            let reason = if recognized_envelope(&value) && !unknown_nested_variant(&value) {
                UnknownReason::MissingRequiredField
            } else {
                UnknownReason::UnknownVariant
            };
            let _ = error;
            unknown(timestamp, ordinal, type_name, &value, reason)
        }
    }
}

fn history_base_from_item(item: &RolloutItem) -> Option<HistoryBaseRef> {
    let RolloutItem::SessionMeta(session_meta) = item else {
        return None;
    };
    let history_base = session_meta.meta.history_base.as_ref()?;
    HistoryBaseRef::new(
        history_base.thread_id.to_string(),
        history_base.end_ordinal_exclusive,
        history_base.end_byte_offset,
    )
    .ok()
}

fn has_incompatible_history_base_mode(item: &RolloutItem) -> bool {
    let RolloutItem::SessionMeta(session_meta) = item else {
        return false;
    };
    session_meta.meta.history_base.is_some()
        && session_meta.meta.history_mode != ThreadHistoryMode::Paginated
}

fn unknown(
    timestamp: Option<String>,
    ordinal: Option<u64>,
    type_name: Option<String>,
    value: &Value,
    reason: UnknownReason,
) -> DecodedRecord {
    let availability = match reason {
        UnknownReason::MalformedJson | UnknownReason::NotAnObject => {
            WireAvailability::PartialRollout
        }
        UnknownReason::UnknownVariant => WireAvailability::UnsupportedSchema,
        UnknownReason::MissingRequiredField => WireAvailability::NotRecoverableFromRollout,
        UnknownReason::UnsupportedSchema => WireAvailability::UnsupportedSchema,
        UnknownReason::PayloadLimit => WireAvailability::PartialRollout,
    };
    DecodedRecord::Unknown(UnknownRecord {
        timestamp,
        ordinal,
        type_name,
        raw_payload: bounded_payload(Some(value)),
        reason,
        availability,
    })
}

fn is_payload_limit_error(error: &str) -> bool {
    matches!(
        error,
        "source_limit_exceeded" | "decoded_source_limit_exceeded" | "line_exceeds_limit"
    )
}

fn recognized_envelope(value: &Value) -> bool {
    matches!(
        value
            .as_object()
            .and_then(|object| object.get("type"))
            .and_then(Value::as_str),
        Some(
            "session_meta"
                | "response_item"
                | "event_msg"
                | "compacted"
                | "turn_context"
                | "world_state"
                | "security_risk_score"
                | "inter_agent_communication"
                | "inter_agent_communication_metadata"
        )
    )
}

fn type_name(value: &Value) -> Option<String> {
    let object = value.as_object()?;
    let outer = object.get("type")?.as_str()?;
    let nested = object
        .get("payload")
        .and_then(Value::as_object)
        .and_then(|payload| payload.get("type"))
        .and_then(Value::as_str);
    Some(match nested {
        Some(nested) => format!("{outer}/{nested}"),
        None => outer.to_string(),
    })
}

fn known_nested_variant(value: &Value) -> bool {
    let Some(object) = value.as_object() else {
        return false;
    };
    let Some(outer) = object.get("type").and_then(Value::as_str) else {
        return false;
    };
    match outer {
        "session_meta"
        | "compacted"
        | "turn_context"
        | "world_state"
        | "security_risk_score"
        | "inter_agent_communication"
        | "inter_agent_communication_metadata" => true,
        "response_item" => object
            .get("payload")
            .and_then(Value::as_object)
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str)
            .is_some_and(is_known_response_item_type),
        "event_msg" => object
            .get("payload")
            .and_then(Value::as_object)
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str)
            .is_some_and(is_known_event_msg_type),
        _ => false,
    }
}

fn unknown_nested_variant(value: &Value) -> bool {
    let Some(object) = value.as_object() else {
        return false;
    };
    let Some(outer) = object.get("type").and_then(Value::as_str) else {
        return false;
    };
    match outer {
        "response_item" => object
            .get("payload")
            .and_then(Value::as_object)
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str)
            .is_some_and(|nested| !is_known_response_item_type(nested)),
        "event_msg" => object
            .get("payload")
            .and_then(Value::as_object)
            .and_then(|payload| payload.get("type"))
            .and_then(Value::as_str)
            .is_some_and(|nested| !is_known_event_msg_type(nested)),
        _ => false,
    }
}

fn is_known_response_item_type(value: &str) -> bool {
    matches!(
        value,
        "message"
            | "function_call"
            | "function_call_output"
            | "custom_tool_call"
            | "custom_tool_call_output"
            | "tool_search_call"
            | "tool_search_output"
            | "local_shell_call"
            | "local_shell_call_output"
            | "mcp_tool_call"
            | "mcp_tool_call_output"
            | "compaction"
            | "compaction_summary"
            | "compaction_trigger"
            | "context_compaction"
            | "reasoning"
            | "ghost_snapshot"
            | "image_generation_call"
            | "agent_message"
            | "web_search_call"
    )
}

fn is_known_event_msg_type(value: &str) -> bool {
    matches!(
        value,
        "error"
            | "warning"
            | "guardian_warning"
            | "context_compacted"
            | "thread_rolled_back"
            | "task_started"
            | "turn_started"
            | "task_complete"
            | "turn_complete"
            | "token_count"
            | "agent_message"
            | "user_message"
            | "request_user_input"
            | "plan_update"
            | "turn_aborted"
            | "web_search_begin"
            | "web_search_end"
            | "image_generation_begin"
            | "image_generation_end"
            | "patch_apply_begin"
            | "patch_apply_updated"
            | "patch_apply_end"
            | "exec_command_begin"
            | "exec_command_output_delta"
            | "exec_command_end"
            | "mcp_tool_call_begin"
            | "mcp_tool_call_end"
            | "shutdown_complete"
            | "raw_response_item"
            | "raw_response_completed"
            | "item_started"
            | "item_completed"
            | "dynamic_tool_call_request"
            | "dynamic_tool_call_response"
    )
}
