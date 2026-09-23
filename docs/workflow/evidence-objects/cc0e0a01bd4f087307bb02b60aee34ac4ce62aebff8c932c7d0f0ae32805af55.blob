use serde::{Deserialize, Serialize};

use super::{Availability, SourceRef};
use crate::source::HistoryBaseRef;

/// How the logical item identity was obtained.
///
/// Native IDs are preferred.  A source-position fallback is still replayable
/// when a rollout does not expose a native ID; it must never depend on batch
/// order, segment boundaries, or a random value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IdentityOrigin {
    NativeStableId,
    SourcePosition,
}

impl Default for IdentityOrigin {
    fn default() -> Self {
        Self::SourcePosition
    }
}

/// Why a terminal event is safe to use as replacement evidence even when the
/// interrupted turn does not contain a complete successful result.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TerminalEvidence {
    ExplicitAbort,
}

/// Common identity and source metadata for all TermLink events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventMetadata {
    /// Physical event identity. This identifies one source event occurrence;
    /// `item_key` identifies the logical history object that may be updated by
    /// a later event (for example a tool begin/end pair).
    pub event_id: String,
    /// Stable logical history item identity.
    #[serde(default)]
    pub item_key: String,
    pub correlation_id: Option<String>,
    /// Optional logical item paired with this event (for example a plan answer
    /// points back to its question).
    #[serde(default)]
    pub related_item_key: Option<String>,
    pub conversation_id: Option<String>,
    pub turn_id: Option<String>,
    pub timestamp: Option<String>,
    pub sequence: u64,
    pub availability: Availability,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terminal_evidence: Option<TerminalEvidence>,
    #[serde(default)]
    pub identity_origin: IdentityOrigin,
    pub source_ref: SourceRef,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanOption {
    pub label: String,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanStep {
    pub step: String,
    pub status: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TurnStatus {
    Completed,
    Interrupted,
    Partial,
}

/// Stable TermLink-owned event model. No vendored Codex struct or raw JSON
/// object crosses this boundary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "event_type", content = "payload")]
pub enum AnalysisEvent {
    SessionContext {
        metadata: EventMetadata,
        session_id: Option<String>,
        cwd: Option<String>,
        source: Option<String>,
        model_provider: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        history_base: Option<HistoryBaseRef>,
    },
    TurnStarted {
        metadata: EventMetadata,
        model_context_window: Option<i64>,
        collaboration_mode_kind: Option<String>,
    },
    UserMessage {
        metadata: EventMetadata,
        text: String,
    },
    AssistantMessage {
        metadata: EventMetadata,
        text: String,
    },
    ToolStarted {
        metadata: EventMetadata,
        tool_kind: String,
        tool_name: Option<String>,
        call_id: String,
        input: Option<String>,
    },
    ToolCompleted {
        metadata: EventMetadata,
        tool_kind: String,
        call_id: String,
        output: Option<String>,
    },
    PlanUpdated {
        metadata: EventMetadata,
        explanation: Option<String>,
        steps: Vec<PlanStep>,
    },
    PlanQuestion {
        metadata: EventMetadata,
        call_id: String,
        question_id: String,
        header: String,
        question: String,
        options: Vec<PlanOption>,
    },
    PlanAnswer {
        metadata: EventMetadata,
        call_id: String,
        question_id: String,
        answer: String,
    },
    PlanAction {
        metadata: EventMetadata,
        action: String,
    },
    FileChanged {
        metadata: EventMetadata,
        path: Option<String>,
        summary: Option<String>,
        /// Exact allowed change content: added/deleted content or the unified
        /// diff, already bounded and redacted by the adapter policy.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        diff: Option<String>,
    },
    WebSearchFound {
        metadata: EventMetadata,
        query: Option<String>,
        result: Option<String>,
    },
    AttachmentFound {
        metadata: EventMetadata,
        name: Option<String>,
        media_type: Option<String>,
    },
    ArtifactFound {
        metadata: EventMetadata,
        artifact_id: Option<String>,
        name: Option<String>,
    },
    UsageUpdated {
        metadata: EventMetadata,
        input_tokens: Option<i64>,
        cached_input_tokens: Option<i64>,
        output_tokens: Option<i64>,
        reasoning_output_tokens: Option<i64>,
        total_tokens: Option<i64>,
        last_input_tokens: Option<i64>,
        last_cached_input_tokens: Option<i64>,
        last_output_tokens: Option<i64>,
        last_reasoning_output_tokens: Option<i64>,
        last_total_tokens: Option<i64>,
        model_context_window: Option<i64>,
    },
    RateLimitUpdated {
        metadata: EventMetadata,
        primary_used_percent: Option<f64>,
        primary_window_minutes: Option<i64>,
        primary_resets_at: Option<i64>,
        secondary_used_percent: Option<f64>,
        secondary_window_minutes: Option<i64>,
        secondary_resets_at: Option<i64>,
    },
    Compaction {
        metadata: EventMetadata,
        summary: Option<String>,
    },
    Diagnostic {
        metadata: EventMetadata,
        code: String,
        message: Option<String>,
    },
    TurnCompleted {
        metadata: EventMetadata,
        status: TurnStatus,
        message: Option<String>,
        duration_ms: Option<i64>,
    },
    ParseGap {
        metadata: EventMetadata,
        reason: String,
    },
    UnknownEvent {
        metadata: EventMetadata,
        raw_type: Option<String>,
        reason: String,
    },
}

impl AnalysisEvent {
    pub fn metadata(&self) -> &EventMetadata {
        match self {
            Self::SessionContext { metadata, .. }
            | Self::TurnStarted { metadata, .. }
            | Self::UserMessage { metadata, .. }
            | Self::AssistantMessage { metadata, .. }
            | Self::ToolStarted { metadata, .. }
            | Self::ToolCompleted { metadata, .. }
            | Self::PlanUpdated { metadata, .. }
            | Self::PlanQuestion { metadata, .. }
            | Self::PlanAnswer { metadata, .. }
            | Self::PlanAction { metadata, .. }
            | Self::FileChanged { metadata, .. }
            | Self::WebSearchFound { metadata, .. }
            | Self::AttachmentFound { metadata, .. }
            | Self::ArtifactFound { metadata, .. }
            | Self::UsageUpdated { metadata, .. }
            | Self::RateLimitUpdated { metadata, .. }
            | Self::Compaction { metadata, .. }
            | Self::Diagnostic { metadata, .. }
            | Self::TurnCompleted { metadata, .. }
            | Self::ParseGap { metadata, .. }
            | Self::UnknownEvent { metadata, .. } => metadata,
        }
    }

    pub fn metadata_mut(&mut self) -> &mut EventMetadata {
        match self {
            Self::SessionContext { metadata, .. }
            | Self::TurnStarted { metadata, .. }
            | Self::UserMessage { metadata, .. }
            | Self::AssistantMessage { metadata, .. }
            | Self::ToolStarted { metadata, .. }
            | Self::ToolCompleted { metadata, .. }
            | Self::PlanUpdated { metadata, .. }
            | Self::PlanQuestion { metadata, .. }
            | Self::PlanAnswer { metadata, .. }
            | Self::PlanAction { metadata, .. }
            | Self::FileChanged { metadata, .. }
            | Self::WebSearchFound { metadata, .. }
            | Self::AttachmentFound { metadata, .. }
            | Self::ArtifactFound { metadata, .. }
            | Self::UsageUpdated { metadata, .. }
            | Self::RateLimitUpdated { metadata, .. }
            | Self::Compaction { metadata, .. }
            | Self::Diagnostic { metadata, .. }
            | Self::TurnCompleted { metadata, .. }
            | Self::ParseGap { metadata, .. }
            | Self::UnknownEvent { metadata, .. } => metadata,
        }
    }

    pub fn event_id(&self) -> &str {
        &self.metadata().event_id
    }

    pub fn item_key(&self) -> &str {
        &self.metadata().item_key
    }

    pub fn related_item_key(&self) -> Option<&str> {
        self.metadata().related_item_key.as_deref()
    }

    pub fn availability(&self) -> Availability {
        self.metadata().availability
    }

    pub fn event_type(&self) -> &'static str {
        match self {
            Self::SessionContext { .. } => "session_context",
            Self::TurnStarted { .. } => "turn_started",
            Self::UserMessage { .. } => "user_message",
            Self::AssistantMessage { .. } => "assistant_message",
            Self::ToolStarted { .. } => "tool_started",
            Self::ToolCompleted { .. } => "tool_completed",
            Self::PlanUpdated { .. } => "plan_updated",
            Self::PlanQuestion { .. } => "plan_question",
            Self::PlanAnswer { .. } => "plan_answer",
            Self::PlanAction { .. } => "plan_action",
            Self::FileChanged { .. } => "file_changed",
            Self::WebSearchFound { .. } => "web_search_found",
            Self::AttachmentFound { .. } => "attachment_found",
            Self::ArtifactFound { .. } => "artifact_found",
            Self::UsageUpdated { .. } => "usage_updated",
            Self::RateLimitUpdated { .. } => "rate_limit_updated",
            Self::Compaction { .. } => "compaction",
            Self::Diagnostic { .. } => "diagnostic",
            Self::TurnCompleted { .. } => "turn_completed",
            Self::ParseGap { .. } => "parse_gap",
            Self::UnknownEvent { .. } => "unknown_event",
        }
    }

    pub fn is_diagnostic(&self) -> bool {
        matches!(self, Self::ParseGap { .. } | Self::UnknownEvent { .. })
    }
}
