use serde::{Deserialize, Serialize};

use super::{SourceRef, TurnStatus};
use crate::source::HistoryBaseRef;

/// A validated one-to-one replacement of the final terminal user turn.
///
/// This is evidence produced by the collector.  It is not a persistence
/// status and does not mutate the replaced turn's execution outcome.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LastTurnReplacement {
    pub replacement_key: String,
    pub conversation_id: String,
    pub parent_rollout_id: String,
    pub child_rollout_id: String,
    pub replaced_turn_id: String,
    pub replacement_turn_id: String,
    pub replaced_turn_terminal_status: TurnStatus,
    pub cut: HistoryBaseRef,
    pub parent_turn_start_source_ref: SourceRef,
    pub parent_turn_terminal_source_ref: SourceRef,
    pub child_turn_start_source_ref: SourceRef,
}

impl LastTurnReplacement {
    pub fn stable_key(
        conversation_id: &str,
        parent_rollout_id: &str,
        child_rollout_id: &str,
        replaced_turn_id: &str,
        replacement_turn_id: &str,
    ) -> String {
        format!(
            "replacement:{conversation_id}:{parent_rollout_id}:{child_rollout_id}:{replaced_turn_id}:{replacement_turn_id}"
        )
    }

    pub fn new(
        conversation_id: impl Into<String>,
        parent_rollout_id: impl Into<String>,
        child_rollout_id: impl Into<String>,
        replaced_turn_id: impl Into<String>,
        replacement_turn_id: impl Into<String>,
        replaced_turn_terminal_status: TurnStatus,
        cut: HistoryBaseRef,
        parent_turn_start_source_ref: SourceRef,
        parent_turn_terminal_source_ref: SourceRef,
        child_turn_start_source_ref: SourceRef,
    ) -> Self {
        let conversation_id = conversation_id.into();
        let parent_rollout_id = parent_rollout_id.into();
        let child_rollout_id = child_rollout_id.into();
        let replaced_turn_id = replaced_turn_id.into();
        let replacement_turn_id = replacement_turn_id.into();
        let replacement_key = Self::stable_key(
            &conversation_id,
            &parent_rollout_id,
            &child_rollout_id,
            &replaced_turn_id,
            &replacement_turn_id,
        );
        Self {
            replacement_key,
            conversation_id,
            parent_rollout_id,
            child_rollout_id,
            replaced_turn_id,
            replacement_turn_id,
            replaced_turn_terminal_status,
            cut,
            parent_turn_start_source_ref,
            parent_turn_terminal_source_ref,
            child_turn_start_source_ref,
        }
    }
}
