package com.termlink.app.codex.domain

import com.termlink.app.codex.data.CodexCapabilities

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
    val timestamp: Long = System.currentTimeMillis(),
    val streaming: Boolean = false
) {
    enum class Role { USER, ASSISTANT, SYSTEM, TOOL, ERROR }
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
    val status: String = "idle",
    val model: String? = null,
    val reasoningEffort: String? = null,
    val sandbox: Boolean? = null,
    val planMode: Boolean? = null,
    val capabilities: CodexCapabilities? = null,
    val messages: List<ChatMessage> = emptyList(),
    val errorMessage: String? = null,
    val interactionState: String? = null,
    val cwd: String? = null
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
