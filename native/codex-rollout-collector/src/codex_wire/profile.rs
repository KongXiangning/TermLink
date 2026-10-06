use serde::{Deserialize, Serialize};

/// Compatibility behavior selected for one bounded rollout pass.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CompatibilityProfile {
    Legacy,
    Current,
    FutureCompatible,
    HistorySemanticsV2,
}

impl CompatibilityProfile {
    pub const fn target_reducer_version(self) -> &'static str {
        match self {
            Self::HistorySemanticsV2 => "target-v2",
            _ => "target-v1",
        }
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Legacy => "legacy",
            Self::Current => "current",
            Self::FutureCompatible => "future-compatible",
            Self::HistorySemanticsV2 => "history-semantics-v2",
        }
    }
}

impl std::fmt::Display for CompatibilityProfile {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}
