package com.termlink.app.codex.domain

import com.termlink.app.codex.data.CodexCapabilities
import com.termlink.app.codex.data.CodexEffectiveConfig
import com.termlink.app.codex.data.CodexInteractionState
import com.termlink.app.codex.data.CodexServerRequest

/**
 * Connection lifecycle visible to the UI layer.
 */
enum class ConnectionState {
    IDLE,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    ERROR
}

/**
 * A single message in the chat thread, already mapped from wire events.
 */
data class ChatMessage(
    val id: String,
    val role: Role,
    val content: String,
    val contentType: String = "text",
    val toolName: String? = null,
    val fileMentions: List<FileMention> = emptyList(),
    val activeSkill: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val streaming: Boolean = false,
    val collapsible: Boolean = false,
    val collapsedLabel: String = ""
) {
    enum class Role { USER, ASSISTANT, SYSTEM, TOOL, ERROR }
}

/**
 * Client-side per-turn overrides sent with codex_turn.
 * Mirrors Web's `nextTurnOverrides` in terminal_client.js.
 */
data class NextTurnOverrides(
    val model: String? = null,
    val reasoningEffort: String? = null,
    val sandbox: String? = null
)

/**
 * Collaboration mode sent with codex_turn for plan-mode turns.
 * Shape: { mode: "plan", settings: { model, reasoning_effort } }
 */
data class CollaborationMode(
    val mode: String = "plan",
    val model: String? = null,
    val reasoningEffort: String? = null
)

data class FileMention(
    val label: String,
    val path: String,
    val relativePathWithoutFileName: String = "",
    val fsPath: String? = null
)

data class CodexSkillEntry(
    val name: String,
    val label: String,
    val description: String = "",
    val defaultPrompt: String = "",
    val scope: String = ""
)

data class CodexPendingImageAttachment(
    val id: String,
    val type: String,
    val label: String,
    val url: String,
    val mimeType: String? = null,
    val sizeBytes: Long? = null
)

data class CodexThreadHistoryEntry(
    val id: String,
    val title: String,
    val archived: Boolean = false,
    val lastActiveAt: Long? = null,
    val createdAt: Long? = null
)

data class CodexPlanWorkflowState(
    val phase: String = "idle",
    val originalPrompt: String = "",
    val latestPlanText: String = "",
    val confirmedPlanText: String = "",
    val lastUserInputRequestId: String = ""
)

data class CodexExecutionWatchState(
    val active: Boolean = false,
    val runningSinceMillis: Long = 0L,
    val lastEventAtMillis: Long = 0L
)

data class CodexRuntimePanelState(
    val visible: Boolean = false,
    val diff: String = "",
    val plan: String = "",
    val reasoning: String = "",
    val warning: String = "",
    val warningTone: String = ""
)

data class CodexNoticesPanelState(
    val visible: Boolean = false,
    val configWarningText: String = "",
    val deprecationNoticeText: String = ""
)

data class CodexToolsPanelState(
    val visible: Boolean = false,
    val skills: List<CodexSkillEntry> = emptyList(),
    val loading: Boolean = false,
    val requested: Boolean = false,
    val compactSubmitting: Boolean = false,
    val compactStatusText: String = "",
    val compactStatusTone: String = ""
)

data class CodexContextUsageState(
    val usedTokens: Long? = null,
    val contextWindow: Long? = null,
    val usedPercent: Int? = null,
    val remainingPercent: Int? = null,
    val inputTokens: Long? = null,
    val outputTokens: Long? = null,
    val cachedInputTokens: Long? = null,
    val reasoningTokens: Long? = null,
    val updatedAtMillis: Long = 0L
)

data class CodexUsagePanelState(
    val visible: Boolean = false,
    val tokenUsageSummary: String = "",
    val rateLimitSummary: String = "",
    val rateLimitTone: String = "",
    val contextUsage: CodexContextUsageState? = null
)

enum class DebugServerRequestPreset {
    RUNTIME_SAMPLE,
    COMMAND_APPROVAL,
    FILE_APPROVAL,
    PATCH_APPROVAL,
    AUTO_HANDLED,
    USER_INPUT_OPTIONS,
    USER_INPUT_FREEFORM
}

/**
 * Aggregate UI state for the native Codex screen.
 * The Compose layer observes this via StateFlow.
 */
data class CodexUiState(
    val connectionState: ConnectionState = ConnectionState.IDLE,
    val sessionId: String = "",
    val sessionName: String = "",
    val threadId: String? = null,
    val currentTurnId: String? = null,
    val status: String = "idle",
    val model: String? = null,
    val reasoningEffort: String? = null,
    val sandbox: Boolean? = null,
    val planMode: Boolean? = null,
    val planWorkflow: CodexPlanWorkflowState = CodexPlanWorkflowState(),
    val executionWatch: CodexExecutionWatchState = CodexExecutionWatchState(),
    val capabilities: CodexCapabilities? = null,
    val messages: List<ChatMessage> = emptyList(),
    val errorMessage: String? = null,
    val interactionState: CodexInteractionState? = null,
    val cwd: String? = null,
    val serverNextTurnConfigBase: CodexEffectiveConfig? = null,
    val nextTurnEffectiveCodexConfig: CodexEffectiveConfig? = null,
    // Phase 2: slash commands & overrides
    val nextTurnOverrides: NextTurnOverrides = NextTurnOverrides(),
    val slashMenuVisible: Boolean = false,
    val slashMenuQuery: String = "",
    val modelPickerVisible: Boolean = false,
    val reasoningPickerVisible: Boolean = false,
    val sandboxPickerVisible: Boolean = false,
    val pendingFileMentions: List<FileMention> = emptyList(),
    val fileMentionMenuVisible: Boolean = false,
    val fileMentionQuery: String = "",
    val fileMentionResults: List<FileMention> = emptyList(),
    val fileMentionLoading: Boolean = false,
    val pendingServerRequests: List<CodexServerRequest> = emptyList(),
    val submittingServerRequestIds: Set<String> = emptySet(),
    val sessionExpired: Boolean = false,
    val runtimePanel: CodexRuntimePanelState = CodexRuntimePanelState(),
    val noticesPanel: CodexNoticesPanelState = CodexNoticesPanelState(),
    val toolsPanel: CodexToolsPanelState = CodexToolsPanelState(),
    val usagePanel: CodexUsagePanelState = CodexUsagePanelState(),
    val pendingImageAttachments: List<CodexPendingImageAttachment> = emptyList(),
    val currentThreadTitle: String = "",
    val threadHistoryEntries: List<CodexThreadHistoryEntry> = emptyList(),
    val threadHistorySheetVisible: Boolean = false,
    val threadHistoryLoading: Boolean = false,
    val threadHistoryActionThreadId: String = "",
    val threadHistoryActionKind: String = "",
    val threadRenameTargetId: String = "",
    val threadRenameDraft: String = ""
)

/**
 * Startup parameters passed to CodexActivity via Intent extras.
 */
data class CodexLaunchParams(
    val profileId: String,
    val sessionId: String,
    val sessionMode: String = "codex",
    val cwd: String? = null,
    val threadId: String? = null,
    val launchSource: String = "sessions"
) {
    companion object {
        const val EXTRA_PROFILE_ID = "codex_profile_id"
        const val EXTRA_SESSION_ID = "codex_session_id"
        const val EXTRA_SESSION_MODE = "codex_session_mode"
        const val EXTRA_CWD = "codex_cwd"
        const val EXTRA_LAUNCH_SOURCE = "codex_launch_source"
    }
}
