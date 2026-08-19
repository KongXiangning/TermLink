//! Concrete alias mapping evidence used by the first formal profiles.
//!
//! These names are taken from the vendored `codex-protocol` serde attributes:
//! `task_started`/`turn_started`, `task_complete`/`turn_complete`, and
//! `ModeKind::Default` accepting `code`, `pair_programming`, `execute`, and
//! `custom`.

pub(crate) fn canonical_event_type(value: &str) -> &str {
    match value {
        "turn_started" => "task_started",
        "turn_complete" => "task_complete",
        other => other,
    }
}

pub(crate) fn canonical_mode_kind(value: &str) -> Option<&str> {
    match value {
        "default" | "code" | "pair_programming" | "execute" | "custom" => Some("default"),
        "plan" => Some("plan"),
        _ => None,
    }
}
