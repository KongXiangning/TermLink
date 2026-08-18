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
