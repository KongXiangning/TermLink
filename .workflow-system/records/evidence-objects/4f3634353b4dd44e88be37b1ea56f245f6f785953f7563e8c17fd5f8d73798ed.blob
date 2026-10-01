use serde::{Deserialize, Serialize};

/// Compatibility behavior selected for one bounded rollout pass.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CompatibilityProfile {
    Legacy,
    Current,
    FutureCompatible,
}

impl CompatibilityProfile {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Legacy => "legacy",
            Self::Current => "current",
            Self::FutureCompatible => "future-compatible",
        }
    }
}

impl std::fmt::Display for CompatibilityProfile {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}
