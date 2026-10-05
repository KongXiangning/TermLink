//! The minimal rollout-line decoder copied from the current Codex rollout
//! persistence boundary.
//!
//! Source reference:
//! `codex-rs/rollout/src/lib.rs::decode_rollout_line` at the pinned current
//! Codex checkout used by this Spike. The full `codex-rollout` crate also
//! contains file discovery, compression, Git, telemetry, and runtime-related
//! dependencies that this parser-only Spike does not need.

use codex_history::RolloutLine;
use serde::de::Error as _;
use serde_json::Value;

/// Decode one persisted Codex rollout JSON object.
///
/// This intentionally preserves Codex's workaround for Serde's flattened
/// envelope handling. The payload and all nested response/event/tool types
/// are still deserialized by the Codex `codex-history` and `codex-protocol`
/// crates; this module does not define a TermLink wire model.
pub(crate) fn decode_rollout_line(value: Value) -> serde_json::Result<RolloutLine> {
    let Value::Object(mut fields) = value else {
        return serde_json::from_value(value);
    };
    let timestamp = fields
        .remove("timestamp")
        .ok_or_else(|| serde_json::Error::missing_field("timestamp"))
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

#[cfg(test)]
mod tests {
    use super::*;
    use codex_history::RolloutItem;
    use codex_protocol::{items::TurnItem, models::ResponseItem, protocol::EventMsg};
    use serde_json::json;

    fn carriers() -> Vec<Value> {
        include_str!("../fixtures/delegated-input.jsonl")
            .lines().map(|line| serde_json::from_str(line).unwrap()).collect()
    }

    #[test]
    fn delegated_carriers_preserve_native_identity_body_and_turn() {
        let raw = carriers();
        assert_eq!(raw.len(), 6);
        for pair in raw.chunks_exact(2) {
            let response = decode_rollout_line(pair[0].clone()).unwrap();
            let completed = decode_rollout_line(pair[1].clone()).unwrap();
            let RolloutItem::ResponseItem(envelope) = response.item else { panic!("response"); };
            let ResponseItem::FunctionCallOutput { id, call_id, name, namespace, output, internal_chat_message_metadata_passthrough } = envelope.item else { panic!("function output"); };
            let RolloutItem::EventMsg(EventMsg::ItemCompleted(event)) = completed.item else { panic!("completed"); };
            let TurnItem::FunctionCallOutput(item) = &event.item else { panic!("native TurnItem"); };
            assert_eq!(id.unwrap().as_str(), item.id);
            assert!(call_id.is_none() && item.call_id.is_none());
            assert_eq!(name.as_deref(), Some(item.name.as_str()));
            assert_eq!(namespace.as_deref(), Some("codex_app"));
            assert_eq!(output.body.to_text().as_deref(), Some(item.output.as_str()));
            assert_eq!(internal_chat_message_metadata_passthrough.unwrap().turn_id.as_deref(), Some(event.turn_id.as_str()));
            assert_eq!(serde_json::to_value(&event.item).unwrap(), pair[1]["payload"]["item"]);
        }
    }

    #[test]
    fn delegated_carriers_reject_missing_unknown_or_incompatible_identity() {
        let raw = carriers();
        for index in [0, 1] {
            for field in ["id", "name", "namespace", "output"] {
                let mut bad = raw[index].clone();
                let payload = if index == 0 { &mut bad["payload"] } else { &mut bad["payload"]["item"] };
                payload.as_object_mut().unwrap().remove(field);
                assert!(decode_rollout_line(bad).is_err(), "missing {field} in carrier {index}");
            }
            for (field, value) in [("id", json!("")), ("name", json!("unknown_tool")), ("namespace", json!("other")), ("output", json!([])), ("output", json!("")), ("call_id", Value::Null), ("call_id", json!(""))] {
                let mut bad = raw[index].clone();
                let payload = if index == 0 { &mut bad["payload"] } else { &mut bad["payload"]["item"] };
                payload[field] = value;
                assert!(decode_rollout_line(bad).is_err(), "bad {field} in carrier {index}");
            }
        }
        let mut incompatible = raw[1].clone();
        incompatible["payload"]["item"]["call_id"] = json!("ordinary-call");
        assert!(decode_rollout_line(incompatible).is_err());
        let mut unsupported_carrier = raw[1].clone();
        unsupported_carrier["payload"]["type"] = json!("item_started");
        assert!(decode_rollout_line(unsupported_carrier).is_err());
    }

    #[test]
    fn ordinary_function_output_keeps_required_call_identity_and_both_output_forms() {
        for output in [json!("ordinary result"), json!([{"type":"input_text","text":"ordinary result"}])] {
            let raw = json!({"timestamp":"2026-10-03T00:00:00Z","type":"response_item","payload":{"type":"function_call_output","call_id":"ordinary-call","output":output}});
            let parsed = decode_rollout_line(raw.clone()).unwrap();
            let encoded = serde_json::to_value(&parsed).unwrap();
            assert_eq!(encoded["payload"], raw["payload"]);
            let mut bad = raw;
            bad["payload"].as_object_mut().unwrap().remove("call_id");
            assert!(decode_rollout_line(bad).is_err());
        }
    }
}
