//! The only facade allowed to expose vendored Codex wire types.

mod decode;
mod profile;
mod unknown;

pub use decode::{
    DecodedRecord, KnownRecord, decode_rollout_line, decode_source_record, decode_value,
};
pub use profile::CompatibilityProfile;
pub use unknown::{UnknownReason, UnknownRecord, WireAvailability};

// These are re-exports of the vendored source of truth, not TermLink models.
pub use codex_history::{ResponseItemEnvelope, RolloutItem, RolloutLine};
pub use codex_protocol::{ResponseItemId, models, plan_tool, protocol, request_user_input};
