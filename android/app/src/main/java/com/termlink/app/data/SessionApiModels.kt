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

data class SessionSummary(
    val id: String,
    val name: String,
    val status: String,
    val activeConnections: Int,
    val createdAt: Long,
    val lastActiveAt: Long
)

data class SessionRef(
    val id: String,
    val name: String
)
