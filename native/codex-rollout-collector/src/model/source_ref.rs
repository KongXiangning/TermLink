use serde::{Deserialize, Serialize};

use crate::source::{SourceRecord, safe_source_identity};

/// Stable source coordinates carried by every projected event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceRef {
    pub source_identity: String,
    pub byte_start: u64,
    pub byte_end: u64,
    pub physical_line_ordinal: u64,
    pub rollout_ordinal: Option<u64>,
    pub timestamp: Option<String>,
    pub item_type: Option<String>,
}

impl From<&SourceRecord> for SourceRef {
    fn from(record: &SourceRecord) -> Self {
        Self {
            source_identity: safe_source_identity(&record.source_identity),
            byte_start: record.byte_start,
            byte_end: record.byte_end,
            physical_line_ordinal: record.physical_line_ordinal,
            rollout_ordinal: record.rollout_ordinal,
            timestamp: record.timestamp.clone(),
            item_type: record.type_name(),
        }
    }
}
