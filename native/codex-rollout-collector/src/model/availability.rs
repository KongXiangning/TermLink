use serde::{Deserialize, Serialize};

/// Availability of a fact in the source rollout.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Availability {
    Present,
    PartialRollout,
    UnsupportedSchema,
    NotRecoverableFromRollout,
}
