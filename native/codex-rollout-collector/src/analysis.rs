//! TermLink-owned reduction of AnalysisEvent values.
//!
//! This module intentionally does not import vendored Codex types.  It is a
//! small conformance reducer for the formal collector, not the product
//! runtime reducer.  Demo/Spike remain read-only oracles.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::model::{
    AnalysisEvent, Availability, LastTurnReplacement, PlanOption, PlanStep, SourceRef, TurnStatus,
};
use crate::protocol::AnalysisBatch;
use crate::source::HistoryBaseRef;

pub const ANALYSIS_PROJECTION_SCHEMA: &str = "termlink-analysis-projection";
pub const ANALYSIS_PROJECTION_VERSION: u16 = 1;

/// Validate the TermLink compatibility invariant for one parent/child
/// rollout transition.
pub fn validate_last_turn_replacement(
    conversation_id: &str,
    parent_rollout_id: &str,
    child_rollout_id: &str,
    history_base: &HistoryBaseRef,
    parent: &AnalysisBatch,
    child: &AnalysisBatch,
) -> Result<LastTurnReplacement, LineageValidationError> {
    if conversation_id.trim().is_empty() {
        return Err(LineageValidationError::EmptyConversationId);
    }
    if parent_rollout_id.trim().is_empty() || child_rollout_id.trim().is_empty() {
        return Err(LineageValidationError::EmptyRolloutId);
    }
    if parent_rollout_id == child_rollout_id {
        return Err(LineageValidationError::SameParentAndChild);
    }
    if history_base.parent_rollout_id != parent_rollout_id {
        return Err(LineageValidationError::ParentRolloutMismatch {
            expected: parent_rollout_id.to_string(),
            actual: history_base.parent_rollout_id.clone(),
        });
    }
    if child.history_base.as_ref() != Some(history_base) {
        return Err(LineageValidationError::ChildHistoryBaseMissingOrMismatch);
    }
    if !parent.complete {
        return Err(LineageValidationError::IncompleteParentBatch);
    }
    if !child.complete {
        return Err(LineageValidationError::IncompleteChildBatch);
    }
    if let Some(source_id) = parent.source_id.as_deref()
        && source_id != parent_rollout_id
    {
        return Err(LineageValidationError::SourceIdMismatch {
            side: "parent",
            expected: parent_rollout_id.to_string(),
            actual: source_id.to_string(),
        });
    }
    if let Some(source_id) = child.source_id.as_deref()
        && source_id != child_rollout_id
    {
        return Err(LineageValidationError::SourceIdMismatch {
            side: "child",
            expected: child_rollout_id.to_string(),
            actual: source_id.to_string(),
        });
    }
    validate_event_conversation(parent, conversation_id, "parent")?;
    validate_event_conversation(child, conversation_id, "child")?;
    let parent_session_id = session_id(parent)?;
    let child_session_id = session_id(child)?;
    if parent_session_id != child_session_id {
        return Err(LineageValidationError::SessionIdentityMismatch {
            parent: parent_session_id,
            child: child_session_id,
        });
    }

    let parent_turns = collect_turns(parent)?;
    let parent_user_turns = parent_turns
        .values()
        .filter(|turn| turn.has_user_message)
        .collect::<Vec<_>>();
    if parent_user_turns.is_empty() {
        return Err(LineageValidationError::ParentHasNoUserTurn);
    }
    let parent_turn = parent_user_turns
        .into_iter()
        .filter_map(|turn| {
            turn.start
                .as_ref()
                .map(|start| (source_sort_key(start), turn))
        })
        .max_by_key(|(key, _)| *key)
        .map(|(_, turn)| turn)
        .ok_or(LineageValidationError::ParentTurnStartMissing)?;
    let parent_start = parent_turn
        .start
        .clone()
        .ok_or(LineageValidationError::ParentTurnStartMissing)?;
    if parent_start.rollout_ordinal != Some(history_base.end_ordinal_exclusive)
        || parent_start.byte_start != history_base.end_byte_offset
    {
        return Err(LineageValidationError::CutDoesNotMatchLastTurnStart {
            cut_ordinal: history_base.end_ordinal_exclusive,
            cut_byte: history_base.end_byte_offset,
            start_ordinal: parent_start.rollout_ordinal,
            start_byte: parent_start.byte_start,
        });
    }
    if parent_start.source_identity != parent_rollout_id {
        return Err(LineageValidationError::SourceRefMismatch {
            side: "parent turn start",
            expected: parent_rollout_id.to_string(),
            actual: parent_start.source_identity.clone(),
        });
    }
    let (parent_terminal_status, parent_terminal_ref) = parent_turn
        .terminal
        .clone()
        .ok_or(LineageValidationError::ParentTurnNotTerminal)?;
    if source_sort_key(&parent_terminal_ref) < source_sort_key(&parent_start) {
        return Err(LineageValidationError::TerminalBeforeTurnStart);
    }

    let child_turns = collect_turns(child)?;
    let child_user_turns = child_turns
        .values()
        .filter(|turn| turn.has_user_message)
        .collect::<Vec<_>>();
    if child_user_turns.len() != 1 {
        return Err(LineageValidationError::ChildUserTurnCount {
            count: child_user_turns.len(),
        });
    }
    let child_turn = child_user_turns[0];
    let child_start = child_turn
        .start
        .clone()
        .ok_or(LineageValidationError::ChildTurnStartMissing)?;
    let replacement_turn_id = child_turn.turn_id.clone();
    if replacement_turn_id == parent_turn.turn_id {
        return Err(LineageValidationError::TurnIdUnchanged {
            turn_id: replacement_turn_id,
        });
    }
    if child_start.source_identity != child_rollout_id {
        return Err(LineageValidationError::SourceRefMismatch {
            side: "child turn start",
            expected: child_rollout_id.to_string(),
            actual: child_start.source_identity.clone(),
        });
    }

    Ok(LastTurnReplacement::new(
        conversation_id,
        parent_rollout_id,
        child_rollout_id,
        parent_turn.turn_id.clone(),
        replacement_turn_id,
        parent_terminal_status,
        history_base.clone(),
        parent_start,
        parent_terminal_ref,
        child_start,
    ))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LineageValidationError {
    EmptyConversationId,
    EmptyRolloutId,
    SameParentAndChild,
    ParentRolloutMismatch {
        expected: String,
        actual: String,
    },
    ChildHistoryBaseMissingOrMismatch,
    IncompleteParentBatch,
    IncompleteChildBatch,
    SourceIdMismatch {
        side: &'static str,
        expected: String,
        actual: String,
    },
    EventConversationMismatch {
        side: &'static str,
        expected: String,
        actual: String,
    },
    SessionMetadataMissing {
        side: &'static str,
    },
    SessionIdentityMismatch {
        parent: String,
        child: String,
    },
    ParentHasNoUserTurn,
    ParentTurnStartMissing,
    ChildTurnStartMissing,
    CutDoesNotMatchLastTurnStart {
        cut_ordinal: u64,
        cut_byte: u64,
        start_ordinal: Option<u64>,
        start_byte: u64,
    },
    SourceRefMismatch {
        side: &'static str,
        expected: String,
        actual: String,
    },
    ParentTurnNotTerminal,
    TerminalBeforeTurnStart,
    ChildUserTurnCount {
        count: usize,
    },
    TurnIdUnchanged {
        turn_id: String,
    },
    TurnIdMissing {
        side: &'static str,
    },
}

impl std::fmt::Display for LineageValidationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyConversationId => write!(formatter, "conversation ID must not be empty"),
            Self::EmptyRolloutId => write!(formatter, "parent and child rollout IDs are required"),
            Self::SameParentAndChild => {
                write!(formatter, "parent and child rollout IDs must differ")
            }
            Self::ParentRolloutMismatch { expected, actual } => {
                write!(
                    formatter,
                    "history_base parent mismatch: expected {expected}, got {actual}"
                )
            }
            Self::ChildHistoryBaseMissingOrMismatch => {
                write!(
                    formatter,
                    "child batch history_base is missing or mismatched"
                )
            }
            Self::IncompleteParentBatch => write!(formatter, "parent batch is incomplete"),
            Self::IncompleteChildBatch => write!(formatter, "child batch is incomplete"),
            Self::SourceIdMismatch {
                side,
                expected,
                actual,
            } => {
                write!(
                    formatter,
                    "{side} source ID mismatch: expected {expected}, got {actual}"
                )
            }
            Self::EventConversationMismatch {
                side,
                expected,
                actual,
            } => write!(
                formatter,
                "{side} event conversation mismatch: expected {expected}, got {actual}"
            ),
            Self::SessionMetadataMissing { side } => {
                write!(formatter, "{side} session metadata is missing")
            }
            Self::SessionIdentityMismatch { parent, child } => {
                write!(
                    formatter,
                    "parent/child session identity mismatch: {parent} vs {child}"
                )
            }
            Self::ParentHasNoUserTurn => write!(formatter, "parent has no user turn"),
            Self::ParentTurnStartMissing => write!(formatter, "parent user turn start is missing"),
            Self::ChildTurnStartMissing => write!(formatter, "child user turn start is missing"),
            Self::CutDoesNotMatchLastTurnStart {
                cut_ordinal,
                cut_byte,
                start_ordinal,
                start_byte,
            } => write!(
                formatter,
                "history cut {cut_ordinal}/{cut_byte} does not match last turn start {start_ordinal:?}/{start_byte}"
            ),
            Self::SourceRefMismatch {
                side,
                expected,
                actual,
            } => {
                write!(
                    formatter,
                    "{side} source ref mismatch: expected {expected}, got {actual}"
                )
            }
            Self::ParentTurnNotTerminal => {
                write!(formatter, "parent last user turn is not terminal")
            }
            Self::TerminalBeforeTurnStart => write!(formatter, "turn terminal precedes turn start"),
            Self::ChildUserTurnCount { count } => {
                write!(
                    formatter,
                    "child must contain exactly one user turn, found {count}"
                )
            }
            Self::TurnIdUnchanged { turn_id } => {
                write!(formatter, "replacement turn ID is unchanged: {turn_id}")
            }
            Self::TurnIdMissing { side } => write!(formatter, "{side} event is missing turn ID"),
        }
    }
}

impl std::error::Error for LineageValidationError {}

#[derive(Debug, Clone, Default)]
struct TurnEvidence {
    turn_id: String,
    start: Option<SourceRef>,
    terminal: Option<(TurnStatus, SourceRef)>,
    has_user_message: bool,
}

fn collect_turns(
    batch: &AnalysisBatch,
) -> Result<BTreeMap<String, TurnEvidence>, LineageValidationError> {
    let mut turns = BTreeMap::new();
    for event in &batch.items {
        match event {
            AnalysisEvent::TurnStarted { metadata, .. } => {
                let turn_id = metadata
                    .turn_id
                    .clone()
                    .ok_or(LineageValidationError::TurnIdMissing { side: "turn start" })?;
                turns
                    .entry(turn_id.clone())
                    .or_insert_with(|| TurnEvidence {
                        turn_id,
                        ..TurnEvidence::default()
                    })
                    .start = Some(metadata.source_ref.clone());
            }
            AnalysisEvent::UserMessage { metadata, .. } => {
                let turn_id =
                    metadata
                        .turn_id
                        .clone()
                        .ok_or(LineageValidationError::TurnIdMissing {
                            side: "user message",
                        })?;
                turns
                    .entry(turn_id.clone())
                    .or_insert_with(|| TurnEvidence {
                        turn_id,
                        ..TurnEvidence::default()
                    })
                    .has_user_message = true;
            }
            AnalysisEvent::TurnCompleted {
                metadata, status, ..
            } => {
                let turn_id =
                    metadata
                        .turn_id
                        .clone()
                        .ok_or(LineageValidationError::TurnIdMissing {
                            side: "turn terminal",
                        })?;
                turns
                    .entry(turn_id.clone())
                    .or_insert_with(|| TurnEvidence {
                        turn_id,
                        ..TurnEvidence::default()
                    })
                    .terminal = Some((*status, metadata.source_ref.clone()));
            }
            _ => {}
        }
    }
    Ok(turns)
}

fn session_id(batch: &AnalysisBatch) -> Result<String, LineageValidationError> {
    batch
        .items
        .iter()
        .find_map(|event| match event {
            AnalysisEvent::SessionContext {
                session_id: Some(session_id),
                ..
            } if !session_id.trim().is_empty() => Some(session_id.clone()),
            _ => None,
        })
        .ok_or(LineageValidationError::SessionMetadataMissing { side: "lineage" })
}

fn validate_event_conversation(
    batch: &AnalysisBatch,
    conversation_id: &str,
    side: &'static str,
) -> Result<(), LineageValidationError> {
    for event in &batch.items {
        if let Some(actual) = event.metadata().conversation_id.as_deref()
            && actual != conversation_id
        {
            return Err(LineageValidationError::EventConversationMismatch {
                side,
                expected: conversation_id.to_string(),
                actual: actual.to_string(),
            });
        }
    }
    Ok(())
}

fn source_sort_key(source_ref: &SourceRef) -> (u64, u64, u64) {
    (
        source_ref
            .rollout_ordinal
            .unwrap_or(source_ref.physical_line_ordinal),
        source_ref.physical_line_ordinal,
        source_ref.byte_start,
    )
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisProjection {
    pub schema: String,
    pub schema_version: u16,
    pub conversation_id: Option<String>,
    pub source: Option<String>,
    pub complete: bool,
    /// True while the projection is based on a tail/partial segment whose
    /// coverage has not yet been promoted by a complete backfill.
    #[serde(default)]
    pub provisional: bool,
    /// Logical history coverage of this collector projection.
    ///
    /// This is deliberately separate from `complete`: an explicitly aborted
    /// turn can have partial content availability while all source records in
    /// the requested history range are present.  It is also separate from
    /// `AnalysisBatch.completeness`, which describes the analyzed source
    /// range, and from a product-level history manifest/coverage DTO.
    #[serde(default)]
    pub coverage: ProjectionCoverage,
    pub availability: Availability,
    pub turns: Vec<AnalysisTurn>,
    pub diagnostics: Vec<AnalysisDiagnostic>,
    /// Conformance-only aggregate used to compare the formal reducer with the
    /// Demo oracle. It is not a product conversation-level DTO field.
    pub usage_total: Option<AnalysisUsage>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectionCoverage {
    Unknown,
    Partial,
    Complete,
}

impl Default for ProjectionCoverage {
    fn default() -> Self {
        Self::Unknown
    }
}

impl ProjectionCoverage {
    pub const fn is_complete(self) -> bool {
        matches!(self, Self::Complete)
    }

    pub const fn min(self, other: Self) -> Self {
        if self.rank() <= other.rank() {
            self
        } else {
            other
        }
    }

    const fn rank(self) -> u8 {
        match self {
            Self::Unknown => 0,
            Self::Partial => 1,
            Self::Complete => 2,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisTurn {
    pub turn_id: String,
    pub sequence: u64,
    pub status: AnalysisTurnStatus,
    pub availability: Availability,
    pub context_window: Option<i64>,
    pub usage: Option<AnalysisUsage>,
    pub rate_limit: Option<AnalysisRateLimit>,
    pub message: Option<String>,
    pub items: Vec<AnalysisItem>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalysisTurnStatus {
    InProgress,
    Completed,
    Interrupted,
    Partial,
}

impl Default for AnalysisTurnStatus {
    fn default() -> Self {
        Self::InProgress
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisItem {
    pub item_key: String,
    pub turn_id: String,
    pub sequence: u64,
    pub timestamp: Option<String>,
    pub kind: String,
    pub presentation_kind: Option<String>,
    pub correlation_id: Option<String>,
    pub related_item_key: Option<String>,
    pub visible: bool,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub availability: Availability,
    pub source_ref: SourceRef,
    pub question: Option<AnalysisQuestion>,
    pub answer: Option<AnalysisAnswer>,
    pub plan: Option<AnalysisPlan>,
    pub plan_action: Option<String>,
    pub tool: Option<AnalysisTool>,
    pub path: Option<String>,
    pub query: Option<String>,
    pub result: Option<String>,
    pub attachment_name: Option<String>,
    pub media_type: Option<String>,
    pub artifact_id: Option<String>,
    pub artifact_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisQuestion {
    pub id: String,
    pub header: String,
    pub question: String,
    pub options: Vec<PlanOption>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisAnswer {
    pub question_id: String,
    pub answer: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisPlan {
    pub explanation: Option<String>,
    pub steps: Vec<PlanStep>,
    pub state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisTool {
    pub tool_kind: String,
    pub tool_name: Option<String>,
    pub call_id: String,
    pub input: Option<String>,
    pub output: Option<String>,
    pub started: bool,
    pub completed: bool,
    pub outcome: Option<String>,
    pub availability: Availability,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisUsage {
    pub input_tokens: Option<i64>,
    pub cached_input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub reasoning_output_tokens: Option<i64>,
    pub total_tokens: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnalysisRateLimit {
    pub primary_used_percent: Option<f64>,
    pub primary_window_minutes: Option<i64>,
    pub primary_resets_at: Option<i64>,
    pub secondary_used_percent: Option<f64>,
    pub secondary_window_minutes: Option<i64>,
    pub secondary_resets_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalysisDiagnostic {
    pub item_key: String,
    pub code: String,
    pub message: Option<String>,
    pub availability: Availability,
    pub source_ref: SourceRef,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisReducer {
    projection: AnalysisProjection,
    active_turn_id: Option<String>,
    current_plan_key: Option<String>,
    pending_questions: BTreeMap<String, Vec<String>>,
    seen_event_ids: BTreeSet<String>,
    provisional_diagnostic_keys: BTreeSet<String>,
    canonical_committed: bool,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    delegated_inputs: BTreeMap<String, AnalysisEvent>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    delegated_event_facts: BTreeMap<String, AnalysisEvent>,
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    delegated_conflicts: BTreeSet<String>,
}

impl AnalysisReducer {
    pub fn new(conversation_id: Option<String>) -> Self {
        Self {
            projection: AnalysisProjection {
                schema: ANALYSIS_PROJECTION_SCHEMA.to_string(),
                schema_version: ANALYSIS_PROJECTION_VERSION,
                conversation_id,
                source: None,
                complete: true,
                provisional: false,
                coverage: ProjectionCoverage::Unknown,
                availability: Availability::Present,
                turns: Vec::new(),
                diagnostics: Vec::new(),
                usage_total: None,
            },
            active_turn_id: None,
            current_plan_key: None,
            pending_questions: BTreeMap::new(),
            seen_event_ids: BTreeSet::new(),
            provisional_diagnostic_keys: BTreeSet::new(),
            canonical_committed: false,
            delegated_inputs: BTreeMap::new(),
            delegated_event_facts: BTreeMap::new(),
            delegated_conflicts: BTreeSet::new(),
        }
    }

    pub fn reduce_batch(batch: &AnalysisBatch) -> AnalysisProjection {
        let conversation_id = batch
            .items
            .iter()
            .find_map(|event| event.metadata().conversation_id.clone());
        let mut reducer = Self::new(conversation_id);
        reducer.apply_batch(batch);
        reducer.finish()
    }

    /// Return a non-consuming projection snapshot for a long-lived analyzer
    /// runtime.  The existing consuming `finish` API remains available for
    /// stage 1–3 callers.
    pub fn snapshot(&self) -> AnalysisProjection {
        self.clone().finish()
    }

    pub fn apply_batch(&mut self, batch: &AnalysisBatch) {
        let completeness = match batch.completeness {
            crate::protocol::BatchCompleteness::Unknown => {
                if !batch.complete {
                    crate::protocol::BatchCompleteness::Partial
                } else if batch.items.is_empty() && batch.diagnostics.is_empty() {
                    crate::protocol::BatchCompleteness::Unknown
                } else {
                    crate::protocol::BatchCompleteness::Canonical
                }
            }
            value => value,
        };
        self.apply_batch_with_completeness(batch, completeness);
    }

    /// Apply one batch while preserving the lifecycle distinction between
    /// provisional segment evidence and a complete canonical range.  A later
    /// incomplete overlap can never downgrade a canonical projection.
    pub fn apply_batch_with_completeness(
        &mut self,
        batch: &AnalysisBatch,
        completeness: crate::protocol::BatchCompleteness,
    ) {
        let is_canonical = completeness == crate::protocol::BatchCompleteness::Canonical;
        if !is_canonical && self.canonical_committed {
            // A late tail/retry overlap is observationally stale once a
            // complete range has committed.  It must not reopen provisional
            // state or worsen availability.
            return;
        }
        match completeness {
            crate::protocol::BatchCompleteness::Canonical => {
                self.projection.provisional = false;
                self.projection.complete = batch.complete;
                self.projection.coverage = if batch.complete {
                    ProjectionCoverage::Complete
                } else {
                    ProjectionCoverage::Partial
                };
                if batch.complete {
                    // A canonical append/replay only delivers the new records.
                    // Keep accepted informational diagnostics; clear incomplete
                    // evidence without dropping diagnostics behind the cursor.
                    self.projection
                        .diagnostics
                        .retain(|item| item.availability == Availability::Present);
                } else {
                    self.projection
                        .diagnostics
                        .retain(|item| !self.provisional_diagnostic_keys.contains(&item.item_key));
                }
                self.provisional_diagnostic_keys.clear();
            }
            crate::protocol::BatchCompleteness::Partial
            | crate::protocol::BatchCompleteness::Provisional => {
                self.projection.provisional = true;
                self.projection.complete = false;
                self.projection.coverage = ProjectionCoverage::Partial;
            }
            crate::protocol::BatchCompleteness::Unknown => {
                self.projection.provisional = false;
                self.projection.complete = batch.complete;
                self.projection.coverage = ProjectionCoverage::Unknown;
            }
        }
        for diagnostic in &batch.diagnostics {
            self.merge_availability(diagnostic.availability);
            if diagnostic.availability != Availability::Present {
                self.projection.complete = false;
                self.projection.coverage = ProjectionCoverage::Partial;
            }
        }
        for event in &batch.items {
            if !is_canonical
                && (event.is_diagnostic() || event.availability() != Availability::Present)
            {
                self.provisional_diagnostic_keys
                    .insert(event.metadata().item_key.clone());
            }
            self.apply(event);
        }
        if is_canonical
            && batch.complete
            && self
                .projection
                .diagnostics
                .iter()
                .all(|diagnostic| diagnostic.availability == Availability::Present)
            && self.projection.availability == Availability::Present
        {
            self.projection.complete = true;
            self.canonical_committed = true;
        }
    }

    pub fn apply(&mut self, event: &AnalysisEvent) {
        if matches!(event, AnalysisEvent::DelegatedInput { .. }) {
            self.apply_delegated_input(event);
            return;
        }
        let event_id = event.event_id();
        if !event_id.is_empty() && !self.seen_event_ids.insert(event_id.to_string()) {
            return;
        }

        let metadata = event.metadata().clone();
        self.projection.source = Some(metadata.source_ref.source_identity.clone());
        self.merge_availability(metadata.availability);
        if metadata.availability != Availability::Present && metadata.terminal_evidence.is_none() {
            self.projection.complete = false;
            self.projection.coverage = ProjectionCoverage::Partial;
        }
        if self.projection.conversation_id.is_none() {
            self.projection.conversation_id = metadata.conversation_id.clone();
        }

        match event {
            AnalysisEvent::DelegatedInput { .. } => {
                unreachable!("handled before event deduplication")
            }
            AnalysisEvent::SessionContext { source, .. } => {
                if source.is_some() {
                    self.projection.source = source.clone();
                }
            }
            AnalysisEvent::TurnStarted {
                model_context_window,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                self.active_turn_id = Some(turn_id.clone());
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.status = AnalysisTurnStatus::InProgress;
                turn.availability = merge_availability(turn.availability, metadata.availability);
                if model_context_window.is_some() {
                    turn.context_window = *model_context_window;
                }
            }
            AnalysisEvent::UserMessage { text, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "user_message", true);
                item.presentation_kind = Some("message".to_string());
                item.content = Some(text.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::AssistantMessage { text, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "assistant_message", true);
                item.presentation_kind = Some("message".to_string());
                item.content = Some(text.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ToolStarted {
                tool_kind,
                tool_name,
                call_id,
                input,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "tool", true);
                item.presentation_kind = Some("tool".to_string());
                item.tool = Some(AnalysisTool {
                    tool_kind: tool_kind.clone(),
                    tool_name: tool_name.clone(),
                    call_id: call_id.clone(),
                    input: input.clone(),
                    output: None,
                    started: true,
                    completed: false,
                    outcome: None,
                    availability: metadata.availability,
                });
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ToolCompleted {
                tool_kind,
                call_id,
                output,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "tool", true);
                item.presentation_kind = Some("tool".to_string());
                item.tool = Some(AnalysisTool {
                    tool_kind: tool_kind.clone(),
                    tool_name: None,
                    call_id: call_id.clone(),
                    input: None,
                    output: output.clone(),
                    started: false,
                    completed: true,
                    outcome: Some(tool_outcome(output.as_deref())),
                    availability: metadata.availability,
                });
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanUpdated {
                explanation, steps, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let plan = AnalysisPlan {
                    explanation: explanation.clone(),
                    steps: steps.clone(),
                    state: plan_state(steps),
                };
                self.current_plan_key = Some(metadata.item_key.clone());
                let mut item = base_item(&metadata, &turn_id, "plan", true);
                item.presentation_kind = Some("plan".to_string());
                item.plan = Some(plan);
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanQuestion {
                call_id,
                question_id,
                header,
                question,
                options,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "plan_question", true);
                item.presentation_kind = Some("plan".to_string());
                item.summary = Some("awaiting_input".to_string());
                item.question = Some(AnalysisQuestion {
                    id: question_id.clone(),
                    header: header.clone(),
                    question: question.clone(),
                    options: options.clone(),
                });
                self.pending_questions
                    .entry(call_id.clone())
                    .or_default()
                    .push(metadata.item_key.clone());
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::PlanAnswer {
                call_id,
                question_id,
                answer,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let related = metadata
                    .related_item_key
                    .clone()
                    .or_else(|| self.question_key(call_id, question_id));
                let mut item = base_item(&metadata, &turn_id, "plan_answer", true);
                item.presentation_kind = Some("plan".to_string());
                item.related_item_key = related.clone();
                item.answer = Some(AnalysisAnswer {
                    question_id: question_id.clone(),
                    answer: answer.clone(),
                });
                self.upsert_item(turn_id, item);
                if let Some(question_key) = related {
                    self.link_item(&question_key, &metadata.item_key);
                }
            }
            AnalysisEvent::PlanAction { action, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "plan_action", true);
                item.presentation_kind = Some("plan".to_string());
                item.related_item_key = metadata
                    .related_item_key
                    .clone()
                    .or_else(|| self.current_plan_key.clone());
                item.plan_action = Some(action.clone());
                item.summary = Some(format!("plan action: {action}"));
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::FileChanged {
                path,
                summary,
                diff,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "file_change", true);
                item.path = path.clone();
                item.summary = summary.clone();
                item.content = diff.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::WebSearchFound { query, result, .. } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "web_search", true);
                item.query = query.clone();
                item.result = result.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::AttachmentFound {
                name, media_type, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "attachment", true);
                item.attachment_name = name.clone();
                item.media_type = media_type.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::ArtifactFound {
                artifact_id, name, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let mut item = base_item(&metadata, &turn_id, "artifact", true);
                item.artifact_id = artifact_id.clone();
                item.artifact_name = name.clone();
                self.upsert_item(turn_id, item);
            }
            AnalysisEvent::UsageUpdated {
                input_tokens,
                cached_input_tokens,
                output_tokens,
                reasoning_output_tokens,
                total_tokens,
                last_input_tokens,
                last_cached_input_tokens,
                last_output_tokens,
                last_reasoning_output_tokens,
                last_total_tokens,
                model_context_window,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let total = usage(
                    *input_tokens,
                    *cached_input_tokens,
                    *output_tokens,
                    *reasoning_output_tokens,
                    *total_tokens,
                );
                if total.has_value() {
                    self.merge_total_usage(total.clone());
                }
                let last = usage(
                    *last_input_tokens,
                    *last_cached_input_tokens,
                    *last_output_tokens,
                    *last_reasoning_output_tokens,
                    *last_total_tokens,
                );
                let turn_usage = if last.has_value() { last } else { total };
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                if turn_usage.has_value() {
                    turn.usage = Some(merge_usage(
                        turn.usage.take().unwrap_or_default(),
                        turn_usage,
                    ));
                }
                if model_context_window.is_some() {
                    turn.context_window = *model_context_window;
                }
            }
            AnalysisEvent::RateLimitUpdated {
                primary_used_percent,
                primary_window_minutes,
                primary_resets_at,
                secondary_used_percent,
                secondary_window_minutes,
                secondary_resets_at,
                ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.rate_limit = Some(AnalysisRateLimit {
                    primary_used_percent: *primary_used_percent,
                    primary_window_minutes: *primary_window_minutes,
                    primary_resets_at: *primary_resets_at,
                    secondary_used_percent: *secondary_used_percent,
                    secondary_window_minutes: *secondary_window_minutes,
                    secondary_resets_at: *secondary_resets_at,
                });
            }
            AnalysisEvent::Compaction { summary, .. } => {
                self.record_diagnostic(
                    &metadata,
                    "compaction",
                    summary.clone(),
                    metadata.availability,
                );
            }
            AnalysisEvent::Diagnostic { code, message, .. } => {
                self.record_diagnostic(&metadata, code, message.clone(), metadata.availability);
            }
            AnalysisEvent::TurnCompleted {
                status, message, ..
            } => {
                let turn_id = self.turn_id_for_event(&metadata);
                let turn = self.ensure_turn(&turn_id, metadata.sequence);
                turn.status = if *status == TurnStatus::Completed
                    && metadata.availability != Availability::Present
                {
                    AnalysisTurnStatus::Partial
                } else {
                    AnalysisTurnStatus::from(*status)
                };
                turn.availability = merge_availability(turn.availability, metadata.availability);
                turn.message = message.clone();
                self.active_turn_id = None;
            }
            AnalysisEvent::ParseGap { reason, .. } => {
                self.record_diagnostic(
                    &metadata,
                    "parse_gap",
                    Some(reason.clone()),
                    metadata.availability,
                );
            }
            AnalysisEvent::UnknownEvent {
                raw_type, reason, ..
            } => {
                let message = Some(format!(
                    "{}:{}",
                    reason,
                    raw_type.as_deref().unwrap_or("<unknown>")
                ));
                self.record_diagnostic(&metadata, "unknown_event", message, metadata.availability);
            }
        }
    }

    pub fn finish(mut self) -> AnalysisProjection {
        if !self.delegated_conflicts.is_empty() {
            self.projection.complete = false;
            self.projection.coverage = ProjectionCoverage::Partial;
            self.projection.availability =
                merge_availability(self.projection.availability, Availability::PartialRollout);
        }
        self.projection.turns.sort_by(|left, right| {
            left.sequence
                .cmp(&right.sequence)
                .then_with(|| left.turn_id.cmp(&right.turn_id))
        });
        for turn in &mut self.projection.turns {
            turn.items.sort_by(|left, right| {
                left.sequence
                    .cmp(&right.sequence)
                    .then_with(|| left.item_key.cmp(&right.item_key))
            });
        }
        self.projection.diagnostics.sort_by(|left, right| {
            left.source_ref
                .physical_line_ordinal
                .cmp(&right.source_ref.physical_line_ordinal)
                .then_with(|| left.item_key.cmp(&right.item_key))
        });
        self.projection
    }

    fn apply_delegated_input(&mut self, event: &AnalysisEvent) {
        let AnalysisEvent::DelegatedInput {
            metadata,
            item_id,
            origin_tool,
            namespace,
            carrier,
            text,
        } = event
        else {
            return;
        };
        let valid = metadata.conversation_id == self.projection.conversation_id
            && metadata
                .turn_id
                .as_ref()
                .is_some_and(|id| !id.trim().is_empty())
            && !item_id.trim().is_empty()
            && !text.trim().is_empty()
            && namespace == "codex_app"
            && matches!(
                origin_tool.as_str(),
                "create_thread" | "send_message_to_thread"
            )
            && matches!(carrier.as_str(), "response_item" | "item_completed")
            && metadata.item_key == format!("delegated-input:{item_id}")
            && metadata.correlation_id.as_deref() == Some(item_id.as_str())
            && metadata.related_item_key.is_none()
            && metadata.availability == Availability::Present;
        let equivalent = self
            .delegated_inputs
            .get(&metadata.item_key)
            .is_none_or(|old| {
                let AnalysisEvent::DelegatedInput {
                    metadata: a,
                    item_id: ai,
                    origin_tool: at,
                    namespace: an,
                    text: ax,
                    ..
                } = old
                else {
                    return false;
                };
                ai == item_id
                    && at == origin_tool
                    && an == namespace
                    && ax == text
                    && a.conversation_id == metadata.conversation_id
                    && a.turn_id == metadata.turn_id
                    && a.source_ref.source_identity == metadata.source_ref.source_identity
            });
        let immutable = self
            .delegated_event_facts
            .get(event.event_id())
            .is_none_or(|old| old == event);
        if !valid || !equivalent || !immutable {
            self.delegated_conflicts.insert(metadata.item_key.clone());
            self.projection.complete = false;
            self.projection.coverage = ProjectionCoverage::Partial;
            self.merge_availability(Availability::PartialRollout);
            self.record_diagnostic(
                metadata,
                "delegated_input_conflict",
                Some("delegated identity, attribution or content is inconsistent".to_string()),
                Availability::PartialRollout,
            );
            return;
        }
        // Compare facts before duplicate suppression: a changed physical event
        // must not be accepted merely because its event_id was already seen.
        if !self.seen_event_ids.insert(event.event_id().to_string()) {
            return;
        }
        self.delegated_event_facts
            .insert(event.event_id().to_string(), event.clone());
        let choose_incoming = self.delegated_inputs.get(&metadata.item_key).is_none_or(|old|
            matches!(old, AnalysisEvent::DelegatedInput { carrier: old_carrier, .. } if old_carrier != "response_item" && carrier == "response_item"));
        if !choose_incoming {
            return;
        }
        self.delegated_inputs
            .insert(metadata.item_key.clone(), event.clone());
        let turn_id = metadata.turn_id.clone().expect("validated delegated turn");
        let mut item = base_item(metadata, &turn_id, "delegated_input", true);
        item.presentation_kind = Some("delegated_input".to_string());
        item.content = Some(text.clone());
        let turn = self.ensure_turn(&turn_id, metadata.sequence);
        if let Some(old) = turn
            .items
            .iter_mut()
            .find(|old| old.item_key == item.item_key)
        {
            *old = item;
        } else {
            turn.items.push(item);
        }
    }

    fn turn_id_for_event(&self, metadata: &crate::model::EventMetadata) -> String {
        metadata
            .turn_id
            .clone()
            .or_else(|| self.active_turn_id.clone())
            .unwrap_or_else(|| format!("turn:{}", metadata.item_key))
    }

    fn ensure_turn(&mut self, turn_id: &str, sequence: u64) -> &mut AnalysisTurn {
        if let Some(index) = self
            .projection
            .turns
            .iter()
            .position(|turn| turn.turn_id == turn_id)
        {
            let turn = &mut self.projection.turns[index];
            turn.sequence = turn.sequence.min(sequence);
            return turn;
        }
        self.projection.turns.push(AnalysisTurn {
            turn_id: turn_id.to_string(),
            sequence,
            status: AnalysisTurnStatus::InProgress,
            availability: Availability::Present,
            context_window: None,
            usage: None,
            rate_limit: None,
            message: None,
            items: Vec::new(),
        });
        self.projection.turns.last_mut().expect("turn was pushed")
    }

    fn upsert_item(&mut self, turn_id: String, mut item: AnalysisItem) {
        item.turn_id = turn_id.clone();
        let turn = self.ensure_turn(&turn_id, item.sequence);
        if let Some(existing) = turn
            .items
            .iter_mut()
            .find(|existing| existing.item_key == item.item_key)
        {
            merge_item(existing, item);
            return;
        }
        turn.items.push(item);
    }

    fn link_item(&mut self, item_key: &str, related_item_key: &str) {
        for turn in &mut self.projection.turns {
            if let Some(item) = turn.items.iter_mut().find(|item| item.item_key == item_key) {
                item.related_item_key = Some(related_item_key.to_string());
                return;
            }
        }
    }

    fn question_key(&self, call_id: &str, question_id: &str) -> Option<String> {
        self.pending_questions
            .get(call_id)
            .and_then(|keys| {
                keys.iter()
                    .find(|key| key.ends_with(&format!(":{question_id}")))
            })
            .cloned()
            .or_else(|| Some(format!("question:{question_id}")))
    }

    fn merge_total_usage(&mut self, usage: AnalysisUsage) {
        self.projection.usage_total = Some(merge_usage(
            self.projection.usage_total.take().unwrap_or_default(),
            usage,
        ));
    }

    fn merge_availability(&mut self, availability: Availability) {
        self.projection.availability =
            merge_availability(self.projection.availability, availability);
    }

    fn record_diagnostic(
        &mut self,
        metadata: &crate::model::EventMetadata,
        code: &str,
        message: Option<String>,
        availability: Availability,
    ) {
        if self
            .projection
            .diagnostics
            .iter()
            .any(|item| item.item_key == metadata.item_key)
        {
            return;
        }
        self.projection.diagnostics.push(AnalysisDiagnostic {
            item_key: metadata.item_key.clone(),
            code: code.to_string(),
            message,
            availability,
            source_ref: metadata.source_ref.clone(),
        });
    }
}

impl From<TurnStatus> for AnalysisTurnStatus {
    fn from(value: TurnStatus) -> Self {
        match value {
            TurnStatus::Completed => Self::Completed,
            TurnStatus::Interrupted => Self::Interrupted,
            TurnStatus::Partial => Self::Partial,
        }
    }
}

fn base_item(
    metadata: &crate::model::EventMetadata,
    turn_id: &str,
    kind: &str,
    visible: bool,
) -> AnalysisItem {
    AnalysisItem {
        item_key: metadata.item_key.clone(),
        turn_id: turn_id.to_string(),
        sequence: metadata.sequence,
        timestamp: metadata.timestamp.clone(),
        kind: kind.to_string(),
        presentation_kind: None,
        correlation_id: metadata.correlation_id.clone(),
        related_item_key: metadata.related_item_key.clone(),
        visible,
        content: None,
        summary: None,
        availability: metadata.availability,
        source_ref: metadata.source_ref.clone(),
        question: None,
        answer: None,
        plan: None,
        plan_action: None,
        tool: None,
        path: None,
        query: None,
        result: None,
        attachment_name: None,
        media_type: None,
        artifact_id: None,
        artifact_name: None,
    }
}

fn merge_item(existing: &mut AnalysisItem, incoming: AnalysisItem) {
    existing.sequence = existing.sequence.min(incoming.sequence);
    existing.timestamp = existing.timestamp.take().or(incoming.timestamp);
    existing.correlation_id = existing.correlation_id.take().or(incoming.correlation_id);
    existing.related_item_key = incoming
        .related_item_key
        .or(existing.related_item_key.take());
    existing.content = incoming.content.or(existing.content.take());
    existing.summary = incoming.summary.or(existing.summary.take());
    existing.availability = merge_availability(existing.availability, incoming.availability);
    existing.visible |= incoming.visible;
    existing.question = incoming.question.or(existing.question.take());
    existing.answer = incoming.answer.or(existing.answer.take());
    existing.plan = incoming.plan.or(existing.plan.take());
    existing.plan_action = incoming.plan_action.or(existing.plan_action.take());
    existing.path = incoming.path.or(existing.path.take());
    existing.query = incoming.query.or(existing.query.take());
    existing.result = incoming.result.or(existing.result.take());
    existing.attachment_name = incoming.attachment_name.or(existing.attachment_name.take());
    existing.media_type = incoming.media_type.or(existing.media_type.take());
    existing.artifact_id = incoming.artifact_id.or(existing.artifact_id.take());
    existing.artifact_name = incoming.artifact_name.or(existing.artifact_name.take());
    if let Some(next) = incoming.tool {
        if let Some(current) = existing.tool.as_mut() {
            merge_tool(current, next);
        } else {
            existing.tool = Some(next);
        }
    }
}

fn merge_tool(existing: &mut AnalysisTool, incoming: AnalysisTool) {
    if existing.tool_name.is_none() {
        existing.tool_name = incoming.tool_name;
    }
    if existing.input.is_none() {
        existing.input = incoming.input;
    }
    if incoming.output.is_some() {
        existing.output = incoming.output;
    }
    existing.started |= incoming.started;
    existing.completed |= incoming.completed;
    if incoming.outcome.is_some() {
        existing.outcome = incoming.outcome;
    }
    existing.availability = merge_availability(existing.availability, incoming.availability);
}

fn usage(
    input_tokens: Option<i64>,
    cached_input_tokens: Option<i64>,
    output_tokens: Option<i64>,
    reasoning_output_tokens: Option<i64>,
    total_tokens: Option<i64>,
) -> AnalysisUsage {
    AnalysisUsage {
        input_tokens,
        cached_input_tokens,
        output_tokens,
        reasoning_output_tokens,
        total_tokens,
    }
}

fn merge_usage(mut existing: AnalysisUsage, incoming: AnalysisUsage) -> AnalysisUsage {
    if incoming.input_tokens.is_some() {
        existing.input_tokens = incoming.input_tokens;
    }
    if incoming.cached_input_tokens.is_some() {
        existing.cached_input_tokens = incoming.cached_input_tokens;
    }
    if incoming.output_tokens.is_some() {
        existing.output_tokens = incoming.output_tokens;
    }
    if incoming.reasoning_output_tokens.is_some() {
        existing.reasoning_output_tokens = incoming.reasoning_output_tokens;
    }
    if incoming.total_tokens.is_some() {
        existing.total_tokens = incoming.total_tokens;
    }
    existing
}

impl AnalysisUsage {
    fn has_value(&self) -> bool {
        self.input_tokens.is_some()
            || self.cached_input_tokens.is_some()
            || self.output_tokens.is_some()
            || self.reasoning_output_tokens.is_some()
            || self.total_tokens.is_some()
    }
}

fn plan_state(steps: &[PlanStep]) -> String {
    if steps.is_empty() {
        return "unknown".to_string();
    }
    if steps.iter().all(|step| step.status == "completed") {
        "completed".to_string()
    } else if steps.iter().any(|step| step.status == "in_progress") {
        "in_progress".to_string()
    } else {
        "pending".to_string()
    }
}

fn tool_outcome(output: Option<&str>) -> String {
    if output.is_some_and(|value| {
        value.starts_with("status=failed;")
            || value == "status=failed"
            || value.starts_with("status=declined;")
            || value == "status=declined"
            || value.contains("success=false")
            || value.contains("error=")
    }) {
        "failed".to_string()
    } else {
        "completed".to_string()
    }
}

fn merge_availability(left: Availability, right: Availability) -> Availability {
    if availability_rank(right) > availability_rank(left) {
        right
    } else {
        left
    }
}

fn availability_rank(value: Availability) -> u8 {
    match value {
        Availability::Present => 0,
        Availability::PartialRollout => 1,
        Availability::UnsupportedSchema => 2,
        Availability::NotRecoverableFromRollout => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        AnalysisReducer, AnalysisTurnStatus, LineageValidationError, ProjectionCoverage,
        validate_last_turn_replacement,
    };
    use crate::model::{AnalysisEvent, Availability, EventMetadata, SourceRef, TurnStatus};
    use crate::protocol::AnalysisBatch;
    use crate::source::HistoryBaseRef;
    use crate::{CompatibilityProfile, JsonlSourceBackend, SourceSpec, analyze_source};

    #[test]
    fn reducer_upserts_tool_begin_and_end_and_keeps_last_turn_usage() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/current/minimal-rollout.jsonl");
        let batch = analyze_source(
            &JsonlSourceBackend,
            &SourceSpec::new(path),
            CompatibilityProfile::Current,
        )
        .expect("fixture analyzes");
        let projection = AnalysisReducer::reduce_batch(&batch);
        let turn = projection
            .turns
            .iter()
            .find(|turn| turn.items.iter().any(|item| item.item_key == "tool:call-1"))
            .expect("tool turn");
        let tool = turn
            .items
            .iter()
            .find(|item| item.item_key == "tool:call-1")
            .and_then(|item| item.tool.as_ref())
            .expect("tool");
        assert!(tool.started);
        assert!(tool.completed);
        assert_eq!(
            turn.usage.as_ref().and_then(|usage| usage.total_tokens),
            Some(70)
        );
        assert_eq!(
            projection
                .usage_total
                .as_ref()
                .and_then(|usage| usage.total_tokens),
            Some(120)
        );
    }

    #[test]
    fn reducer_preserves_unknown_and_partial_as_non_terminal() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/partial/abort-compaction.jsonl");
        let batch = analyze_source(
            &JsonlSourceBackend,
            &SourceSpec::new(path),
            CompatibilityProfile::Current,
        )
        .expect("fixture analyzes");
        let projection = AnalysisReducer::reduce_batch(&batch);
        assert!(!projection.complete);
        assert_eq!(projection.coverage, ProjectionCoverage::Partial);
        assert!(!projection.diagnostics.is_empty());
        assert_eq!(projection.turns[0].status, AnalysisTurnStatus::Interrupted);
    }

    #[test]
    fn reducer_empty_batch_is_stable() {
        let projection =
            AnalysisReducer::reduce_batch(&AnalysisBatch::empty(CompatibilityProfile::Current));
        assert!(projection.complete);
        assert!(!projection.provisional);
        assert_eq!(projection.coverage, ProjectionCoverage::Unknown);
        assert!(projection.turns.is_empty());
        assert!(projection.diagnostics.is_empty());
    }

    #[test]
    fn provisional_tail_promotes_after_complete_backfill() {
        let mut reducer = AnalysisReducer::new(Some("conversation-1".to_string()));
        let mut tail = AnalysisBatch::empty(CompatibilityProfile::Current);
        tail.completeness = crate::protocol::BatchCompleteness::Provisional;
        reducer.apply_batch(&tail);
        let provisional = reducer.clone().finish();
        assert!(provisional.provisional);
        assert!(!provisional.complete);

        let mut backfill = AnalysisBatch::empty(CompatibilityProfile::Current);
        backfill.completeness = crate::protocol::BatchCompleteness::Canonical;
        reducer.apply_batch(&backfill);
        let promoted = reducer.finish();
        assert!(!promoted.provisional);
        assert!(promoted.complete);
        assert_eq!(promoted.coverage, ProjectionCoverage::Complete);
        assert_eq!(promoted.availability, Availability::Present);
    }

    #[test]
    fn late_incomplete_overlap_cannot_downgrade_canonical_projection() {
        let mut reducer = AnalysisReducer::new(Some("conversation-1".to_string()));
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/current/message-roles.jsonl");
        let mut canonical = analyze_source(
            &JsonlSourceBackend,
            &SourceSpec::new(path),
            CompatibilityProfile::Current,
        )
        .expect("known informational carriers analyze");
        assert!(canonical.complete);
        canonical.completeness = crate::protocol::BatchCompleteness::Canonical;
        reducer.apply_batch(&canonical);
        let committed = reducer.snapshot();
        assert!(committed.diagnostics.iter().any(|diagnostic| {
            diagnostic.code == "developer_message_hidden"
                && diagnostic.availability == Availability::Present
        }));

        reducer = serde_json::from_value(
            serde_json::to_value(&reducer).expect("reducer checkpoint serializes"),
        )
        .expect("reducer checkpoint restores");
        reducer.apply_batch(&canonical);
        assert_eq!(
            reducer.snapshot(),
            committed,
            "canonical replay is idempotent"
        );

        let mut no_growth = AnalysisBatch::empty(CompatibilityProfile::Current);
        no_growth.completeness = crate::protocol::BatchCompleteness::Canonical;
        reducer.apply_batch(&no_growth);
        assert_eq!(
            reducer.snapshot(),
            committed,
            "an empty canonical delta retains committed diagnostics"
        );

        let mut overlap = AnalysisBatch::empty(CompatibilityProfile::Current);
        overlap.completeness = crate::protocol::BatchCompleteness::Partial;
        overlap.complete = false;
        reducer.apply_batch(&overlap);
        let projection = reducer.finish();
        assert!(projection.complete);
        assert!(!projection.provisional);
        assert_eq!(projection.coverage, ProjectionCoverage::Complete);
        assert_eq!(projection.availability, Availability::Present);
        assert_eq!(projection, committed);
    }

    #[test]
    fn partial_availability_cannot_project_as_a_successful_terminal_turn() {
        let event = AnalysisEvent::TurnCompleted {
            metadata: EventMetadata {
                event_id: "source:turn:turn-1:turn_completed:0".to_string(),
                item_key: "turn:turn-1".to_string(),
                correlation_id: Some("turn-1".to_string()),
                related_item_key: None,
                conversation_id: Some("conversation-1".to_string()),
                turn_id: Some("turn-1".to_string()),
                timestamp: None,
                sequence: 1,
                availability: Availability::PartialRollout,
                terminal_evidence: None,
                identity_origin: crate::model::IdentityOrigin::NativeStableId,
                source_ref: SourceRef {
                    source_identity: "source".to_string(),
                    byte_start: 0,
                    byte_end: 1,
                    physical_line_ordinal: 1,
                    rollout_ordinal: Some(1),
                    timestamp: None,
                    item_type: Some("turn_complete".to_string()),
                },
            },
            status: TurnStatus::Completed,
            message: Some("incomplete terminal record".to_string()),
            duration_ms: None,
        };
        let mut reducer = AnalysisReducer::new(Some("conversation-1".to_string()));
        reducer.apply(&event);
        let projection = reducer.finish();
        assert_eq!(projection.turns[0].status, AnalysisTurnStatus::Partial);
        assert_eq!(
            projection.turns[0].availability,
            Availability::PartialRollout
        );
        assert!(!projection.complete);
        assert_eq!(projection.coverage, ProjectionCoverage::Partial);
    }

    fn test_source_ref(source: &str, ordinal: u64, byte_start: u64, item_type: &str) -> SourceRef {
        SourceRef {
            source_identity: source.to_string(),
            byte_start,
            byte_end: byte_start + 10,
            physical_line_ordinal: ordinal + 1,
            rollout_ordinal: Some(ordinal),
            timestamp: None,
            item_type: Some(item_type.to_string()),
        }
    }

    fn test_metadata(
        event_id: &str,
        source: &str,
        conversation_id: &str,
        turn_id: Option<&str>,
        ordinal: u64,
        byte_start: u64,
        item_type: &str,
    ) -> EventMetadata {
        EventMetadata {
            event_id: event_id.to_string(),
            item_key: event_id.to_string(),
            correlation_id: turn_id.map(ToOwned::to_owned),
            related_item_key: None,
            conversation_id: Some(conversation_id.to_string()),
            turn_id: turn_id.map(ToOwned::to_owned),
            timestamp: None,
            sequence: ordinal,
            availability: Availability::Present,
            terminal_evidence: None,
            identity_origin: crate::model::IdentityOrigin::NativeStableId,
            source_ref: test_source_ref(source, ordinal, byte_start, item_type),
        }
    }

    fn session_event(
        source: &str,
        conversation_id: &str,
        history_base: Option<HistoryBaseRef>,
    ) -> AnalysisEvent {
        AnalysisEvent::SessionContext {
            metadata: test_metadata(
                "session",
                source,
                conversation_id,
                None,
                0,
                0,
                "session_meta",
            ),
            session_id: Some(conversation_id.to_string()),
            cwd: None,
            source: None,
            model_provider: None,
            history_base,
        }
    }

    fn replacement_fixture(
        parent_terminal: bool,
        child_user_turns: &[&str],
        cut_ordinal: u64,
        cut_byte: u64,
    ) -> (AnalysisBatch, AnalysisBatch, HistoryBaseRef) {
        let conversation_id = "conversation-1";
        let parent_id = "parent-rollout";
        let child_id = "child-rollout";
        let parent_turn_id = "old-turn";
        let parent_ref = HistoryBaseRef::new(parent_id, cut_ordinal, cut_byte).unwrap();
        let mut parent = AnalysisBatch::empty(CompatibilityProfile::Current);
        parent.source_id = Some(parent_id.to_string());
        parent.items = vec![
            session_event(parent_id, conversation_id, None),
            AnalysisEvent::TurnStarted {
                metadata: test_metadata(
                    "parent-start",
                    parent_id,
                    conversation_id,
                    Some(parent_turn_id),
                    14,
                    128,
                    "task_started",
                ),
                model_context_window: None,
                collaboration_mode_kind: None,
            },
            AnalysisEvent::UserMessage {
                metadata: test_metadata(
                    "parent-user",
                    parent_id,
                    conversation_id,
                    Some(parent_turn_id),
                    15,
                    256,
                    "user_message",
                ),
                text: "old question".to_string(),
            },
        ];
        if parent_terminal {
            parent.items.push(AnalysisEvent::TurnCompleted {
                metadata: test_metadata(
                    "parent-terminal",
                    parent_id,
                    conversation_id,
                    Some(parent_turn_id),
                    20,
                    512,
                    "task_complete",
                ),
                status: TurnStatus::Interrupted,
                message: None,
                duration_ms: None,
            });
        }

        let child_base = Some(parent_ref.clone());
        let mut child = AnalysisBatch::empty(CompatibilityProfile::Current);
        child.source_id = Some(child_id.to_string());
        child.history_base = child_base.clone();
        child
            .items
            .push(session_event(child_id, conversation_id, child_base));
        for (index, turn_id) in child_user_turns.iter().enumerate() {
            let ordinal = 18 + index as u64 * 3;
            child.items.push(AnalysisEvent::TurnStarted {
                metadata: test_metadata(
                    &format!("child-start-{index}"),
                    child_id,
                    conversation_id,
                    Some(turn_id),
                    ordinal,
                    700 + index as u64 * 100,
                    "task_started",
                ),
                model_context_window: None,
                collaboration_mode_kind: None,
            });
            child.items.push(AnalysisEvent::UserMessage {
                metadata: test_metadata(
                    &format!("child-user-{index}"),
                    child_id,
                    conversation_id,
                    Some(turn_id),
                    ordinal + 1,
                    710 + index as u64 * 100,
                    "user_message",
                ),
                text: format!("new question {index}"),
            });
        }
        (parent, child, parent_ref)
    }

    #[test]
    fn validates_completed_or_interrupted_parent_to_one_child_turn() {
        let (parent, child, history_base) = replacement_fixture(true, &["new-turn"], 14, 128);
        let replacement = validate_last_turn_replacement(
            "conversation-1",
            "parent-rollout",
            "child-rollout",
            &history_base,
            &parent,
            &child,
        )
        .expect("replacement is valid");
        assert_eq!(replacement.replaced_turn_id, "old-turn");
        assert_eq!(replacement.replacement_turn_id, "new-turn");
        assert_eq!(
            replacement.replaced_turn_terminal_status,
            TurnStatus::Interrupted
        );
        assert_eq!(
            replacement.replacement_key,
            "replacement:conversation-1:parent-rollout:child-rollout:old-turn:new-turn"
        );
    }

    #[test]
    fn rejects_non_terminal_parent_and_multiple_child_user_turns() {
        let (parent, child, history_base) = replacement_fixture(false, &["new-turn"], 14, 128);
        assert_eq!(
            validate_last_turn_replacement(
                "conversation-1",
                "parent-rollout",
                "child-rollout",
                &history_base,
                &parent,
                &child,
            )
            .unwrap_err(),
            LineageValidationError::ParentTurnNotTerminal
        );

        let (parent, child, history_base) =
            replacement_fixture(true, &["new-turn", "second-turn"], 14, 128);
        assert_eq!(
            validate_last_turn_replacement(
                "conversation-1",
                "parent-rollout",
                "child-rollout",
                &history_base,
                &parent,
                &child,
            )
            .unwrap_err(),
            LineageValidationError::ChildUserTurnCount { count: 2 }
        );
    }

    #[test]
    fn rejects_cut_that_does_not_match_parent_last_turn_start() {
        let (parent, child, history_base) = replacement_fixture(true, &["new-turn"], 13, 120);
        assert!(matches!(
            validate_last_turn_replacement(
                "conversation-1",
                "parent-rollout",
                "child-rollout",
                &history_base,
                &parent,
                &child,
            ),
            Err(LineageValidationError::CutDoesNotMatchLastTurnStart { .. })
        ));
    }
}
