package com.termlink.app.data

enum class SessionApiErrorCode {
    EMPTY_BASE_URL,
    INVALID_BASE_URL,
    AUTH_MISSING_CREDENTIALS,
    AUTH_FAILED,
    NOT_FOUND,
    SERVER_ERROR,
    NETWORK_ERROR,
    PARSE_ERROR,
    MTLS_HOST_NOT_ALLOWED,
    MTLS_CREDENTIAL_LOAD_FAILED,
    MTLS_APPLY_FAILED,
    HTTP_ERROR,
    UNKNOWN
}

data class SessionApiError(
    val code: SessionApiErrorCode,
    val message: String,
    val httpStatus: Int? = null,
    val cause: Throwable? = null
)

sealed class ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>()
    data class Failure(val error: SessionApiError) : ApiResult<Nothing>()
}

enum class SessionMode(val wireValue: String) {
    TERMINAL("terminal"),
    CODEX("codex");

    companion object {
        fun fromWireValue(value: String?): SessionMode {
            if (value.isNullOrBlank()) {
                return TERMINAL
            }
            return entries.firstOrNull {
                it.wireValue.equals(value.trim(), ignoreCase = true) ||
                    it.name.equals(value.trim(), ignoreCase = true)
            } ?: TERMINAL
        }
    }
}

data class SessionSummary(
    val id: String,
    val name: String,
    val status: String,
    val activeConnections: Int,
    val createdAt: Long,
    val lastActiveAt: Long,
    val sessionMode: SessionMode = SessionMode.TERMINAL,
    val cwd: String? = null,
    val lastCodexThreadId: String? = null
)

data class SessionRef(
    val id: String,
    val name: String,
    val sessionMode: SessionMode = SessionMode.TERMINAL,
    val cwd: String? = null,
    val lastCodexThreadId: String? = null
)

data class SessionSelection(
    val profileId: String,
    val sessionId: String,
    val sessionMode: SessionMode = SessionMode.TERMINAL,
    val cwd: String? = null
)

data class ProfileSessionSummary(
    val profileId: String,
    val profileName: String,
    val session: SessionSummary
)

data class WorkspaceMeta(
    val sessionId: String,
    val workspaceRoot: String? = null,
    val workspaceRootSource: String? = null,
    val defaultEntryPath: String? = null,
    val isGitRepo: Boolean = false,
    val gitRoot: String? = null,
    val disabledReason: String? = null
)

data class WorkspacePickerEntry(
    val name: String,
    val path: String,
    val type: String,
    val hidden: Boolean = false
)

data class WorkspacePickerTree(
    val path: String,
    val parentPath: String? = null,
    val canGoUp: Boolean = false,
    val entries: List<WorkspacePickerEntry> = emptyList()
)
