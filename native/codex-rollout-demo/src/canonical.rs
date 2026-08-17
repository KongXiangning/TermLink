//! Official `thread/read(true)`-style normalization baseline.
//!
//! Uses `codex-app-server-protocol::build_turns_from_rollout_items`, the same
//! reducer the Codex app-server uses to build thread history from rollout
//! items. This is the comparison baseline for the TermLink projection.

use codex_app_server_protocol::build_turns_from_rollout_items;
use codex_protocol::protocol::RolloutItem;
use serde_json::Value;

/// Build the official turns and serialize them in the app-server v2 shape.
///
/// The result mirrors the `turns` array that `thread/read(true)` returns for
/// a thread restored from this rollout.
pub fn build_official_turns(items: &[RolloutItem]) -> Value {
    let turns = build_turns_from_rollout_items(items);
    let serialized = turns
        .iter()
        .map(|turn| serde_json::to_value(turn).unwrap_or(Value::Null))
        .collect::<Vec<_>>();
    serde_json::json!({
        "source": "thread/read(true) equivalent via build_turns_from_rollout_items",
        "turns": serialized,
    })
}
