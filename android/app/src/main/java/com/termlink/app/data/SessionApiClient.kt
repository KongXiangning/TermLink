package com.termlink.app.data

import android.content.Context
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.ProtocolException
import java.net.URI
import java.net.URL

class SessionApiClient(context: Context) {

    private val mtlsHttpSupport = MtlsHttpSupport(context.applicationContext)
    private val basicCredentialStore = BasicCredentialStore(context.applicationContext)

    fun listSessions(profile: ServerProfile): ApiResult<List<SessionSummary>> {
        val response = request(
            profile = profile,
            method = "GET",
            endpointPath = "/sessions",
            body = null
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> parseSessions(response.value)
        }
    }

    fun createSession(profile: ServerProfile, name: String): ApiResult<SessionRef> {
        return createSession(profile, name, SessionMode.TERMINAL, null)
    }

    fun createSession(
        profile: ServerProfile,
        name: String,
        sessionMode: SessionMode,
        cwd: String?
    ): ApiResult<SessionRef> {
        val payload = JSONObject()
            .put("name", name)
            .put("sessionMode", sessionMode.wireValue)
            .apply {
                if (!cwd.isNullOrBlank()) {
                    put("cwd", cwd.trim())
                }
            }
            .toString()
        val response = request(
            profile = profile,
            method = "POST",
            endpointPath = "/sessions",
            body = payload
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> parseSessionRef(response.value)
        }
    }

    fun renameSession(profile: ServerProfile, id: String, name: String): ApiResult<SessionRef> {
        val payload = JSONObject().put("name", name).toString()
        val response = request(
            profile = profile,
            method = "PATCH",
            endpointPath = "/sessions/$id",
            body = payload
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> parseSessionRef(response.value)
        }
    }

    fun deleteSession(profile: ServerProfile, id: String): ApiResult<Unit> {
        val response = request(
            profile = profile,
            method = "DELETE",
            endpointPath = "/sessions/$id",
            body = null
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> ApiResult.Success(Unit)
        }
    }

    fun getWorkspaceMeta(profile: ServerProfile, sessionId: String): ApiResult<WorkspaceMeta> {
        val response = request(
            profile = profile,
            method = "GET",
            endpointPath = "/sessions/$sessionId/workspace/meta",
            body = null
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> parseWorkspaceMeta(response.value)
        }
    }

    fun getWorkspacePickerTree(profile: ServerProfile, requestedPath: String?): ApiResult<WorkspacePickerTree> {
        val endpoint = buildString {
            append("/workspace/picker/tree")
            val normalizedPath = requestedPath?.trim().takeIf { !it.isNullOrBlank() }
            if (normalizedPath != null) {
                append("?path=")
                append(java.net.URLEncoder.encode(normalizedPath, Charsets.UTF_8.name()))
            }
        }
        val response = request(
            profile = profile,
            method = "GET",
            endpointPath = endpoint,
            body = null
        )
        return when (response) {
            is ApiResult.Failure -> response
            is ApiResult.Success -> parseWorkspacePickerTree(response.value)
        }
    }

    private fun parseSessions(payload: String): ApiResult<List<SessionSummary>> {
        return try {
            val array = JSONArray(payload.ifBlank { "[]" })
            val result = mutableListOf<SessionSummary>()
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val id = item.optString("id")
                if (id.isBlank()) continue
                result.add(
                    SessionSummary(
                        id = id,
                        name = item.optString("name", "Unnamed Session"),
                        status = item.optString("status", "UNKNOWN"),
                        activeConnections = item.optInt("activeConnections", 0),
                        createdAt = item.optLong("createdAt", 0L),
                        lastActiveAt = item.optLong("lastActiveAt", 0L),
                        sessionMode = SessionMode.fromWireValue(item.optString("sessionMode", "terminal")),
                        cwd = item.optString("cwd", "").trim().takeIf { it.isNotBlank() },
                        lastCodexThreadId = item.optString("lastCodexThreadId", "").trim()
                            .takeIf { it.isNotBlank() }
                    )
                )
            }
            ApiResult.Success(result)
        } catch (ex: JSONException) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.PARSE_ERROR,
                    message = "Failed to parse sessions response.",
                    cause = ex
                )
            )
        }
    }

    private fun parseSessionRef(payload: String): ApiResult<SessionRef> {
        return try {
            val obj = JSONObject(payload.ifBlank { "{}" })
            val id = obj.optString("id")
            if (id.isBlank()) {
                return ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.PARSE_ERROR,
                        message = "Missing session id in API response."
                    )
                )
            }
            ApiResult.Success(
                SessionRef(
                    id = id,
                    name = obj.optString("name", "Unnamed Session"),
                    sessionMode = SessionMode.fromWireValue(obj.optString("sessionMode", "terminal")),
                    cwd = obj.optString("cwd", "").trim().takeIf { it.isNotBlank() },
                    lastCodexThreadId = obj.optString("lastCodexThreadId", "").trim()
                        .takeIf { it.isNotBlank() }
                )
            )
        } catch (ex: JSONException) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.PARSE_ERROR,
                    message = "Failed to parse session response.",
                    cause = ex
                )
            )
        }
    }

    private fun parseWorkspaceMeta(payload: String): ApiResult<WorkspaceMeta> {
        return try {
            val obj = JSONObject(payload.ifBlank { "{}" })
            ApiResult.Success(
                WorkspaceMeta(
                    sessionId = obj.optString("sessionId", "").trim(),
                    workspaceRoot = optNullableTrimmedString(obj, "workspaceRoot"),
                    workspaceRootSource = optNullableTrimmedString(obj, "workspaceRootSource"),
                    defaultEntryPath = optNullableTrimmedString(obj, "defaultEntryPath"),
                    isGitRepo = obj.optBoolean("isGitRepo", false),
                    gitRoot = optNullableTrimmedString(obj, "gitRoot"),
                    disabledReason = optNullableTrimmedString(obj, "disabledReason")
                )
            )
        } catch (ex: JSONException) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.PARSE_ERROR,
                    message = "Failed to parse workspace meta response.",
                    cause = ex
                )
            )
        }
    }

    private fun parseWorkspacePickerTree(payload: String): ApiResult<WorkspacePickerTree> {
        return try {
            val obj = JSONObject(payload.ifBlank { "{}" })
            val entriesJson = obj.optJSONArray("entries") ?: JSONArray()
            val entries = mutableListOf<WorkspacePickerEntry>()
            for (index in 0 until entriesJson.length()) {
                val item = entriesJson.optJSONObject(index) ?: continue
                val name = item.optString("name", "").trim()
                val path = item.optString("path", "").trim()
                if (name.isBlank() || path.isBlank()) {
                    continue
                }
                entries.add(
                    WorkspacePickerEntry(
                        name = name,
                        path = path,
                        type = item.optString("type", "directory").trim(),
                        hidden = item.optBoolean("hidden", false)
                    )
                )
            }
            ApiResult.Success(
                WorkspacePickerTree(
                    path = optNullableTrimmedString(obj, "path").orEmpty(),
                    parentPath = optNullableTrimmedString(obj, "parentPath"),
                    canGoUp = obj.optBoolean("canGoUp", false),
                    entries = entries
                )
            )
        } catch (ex: JSONException) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.PARSE_ERROR,
                    message = "Failed to parse workspace picker response.",
                    cause = ex
                )
            )
        }
    }

    private fun request(
        profile: ServerProfile,
        method: String,
        endpointPath: String,
        body: String?
    ): ApiResult<String> {
        val contextResult = buildRequestContext(profile)
        val requestContext = when (contextResult) {
            is ApiResult.Failure -> return contextResult
            is ApiResult.Success -> contextResult.value
        }

        var currentUrl = buildApiUrl(requestContext.apiBaseUri, endpointPath)
        Log.d(TAG, "Request $method $currentUrl auth=${requestContext.authorizationHeader != null}")
        var currentMethod = method
        var currentBody = body
        var redirectCount = 0

        while (redirectCount <= MAX_REDIRECTS) {
            val connection = try {
                (currentUrl.openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = false
                    setRequestMethodCompat(this, currentMethod)
                    connectTimeout = 5000
                    readTimeout = 10000
                    setRequestProperty("Accept", "application/json")
                }
            } catch (ex: IOException) {
                return ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.NETWORK_ERROR,
                        message = "Failed to open connection.",
                        cause = ex
                    )
                )
            }

            requestContext.authorizationHeader?.let { authHeader ->
                connection.setRequestProperty("Authorization", authHeader)
            }

            if (currentBody != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
            }

            when (val mtlsResult = mtlsHttpSupport.applyIfNeeded(connection, profile)) {
                is ApiResult.Failure -> {
                    connection.disconnect()
                    return mtlsResult
                }
                is ApiResult.Success -> {
                    // no-op
                }
            }

            try {
                if (currentBody != null) {
                    connection.outputStream.bufferedWriter().use { writer ->
                        writer.write(currentBody!!)
                    }
                }

                val statusCode = connection.responseCode

                if (statusCode in REDIRECT_STATUS_CODES) {
                    val location = connection.getHeaderField("Location")
                    Log.d(TAG, "Redirect $statusCode -> $location")
                    connection.disconnect()
                    if (location.isNullOrBlank()) {
                        return ApiResult.Failure(
                            SessionApiError(
                                code = SessionApiErrorCode.NETWORK_ERROR,
                                message = "Redirect without Location header."
                            )
                        )
                    }
                    currentUrl = try {
                        currentUrl.toURI().resolve(location).toURL()
                    } catch (ex: Exception) {
                        return ApiResult.Failure(
                            SessionApiError(
                                code = SessionApiErrorCode.NETWORK_ERROR,
                                message = "Invalid redirect Location: $location",
                                cause = ex
                            )
                        )
                    }
                    // 301/302/303 change method to GET and drop body; 307/308 preserve method
                    if (statusCode == 301 || statusCode == 302 || statusCode == 303) {
                        currentMethod = "GET"
                        currentBody = null
                    }
                    redirectCount++
                    continue
                }

                Log.d(TAG, "Response $statusCode from $currentUrl")
                val responseBody = readResponseBody(connection, statusCode)
                return if (statusCode in 200..299) {
                    ApiResult.Success(responseBody)
                } else {
                    val wwwAuthenticate = connection.getHeaderField("WWW-Authenticate").orEmpty()
                    ApiResult.Failure(mapHttpError(statusCode, responseBody, wwwAuthenticate, profile))
                }
            } catch (ex: IOException) {
                return ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.NETWORK_ERROR,
                        message = "Network request failed.",
                        cause = ex
                    )
                )
            } catch (ex: Exception) {
                return ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.UNKNOWN,
                        message = "Unexpected request failure.",
                        cause = ex
                    )
                )
            } finally {
                connection.disconnect()
            }
        }

        return ApiResult.Failure(
            SessionApiError(
                code = SessionApiErrorCode.NETWORK_ERROR,
                message = "Too many redirects (max $MAX_REDIRECTS)."
            )
        )
    }

    private fun setRequestMethodCompat(connection: HttpURLConnection, method: String) {
        try {
            connection.requestMethod = method
        } catch (ex: ProtocolException) {
            if (method != "PATCH") throw ex
            try {
                val methodField = HttpURLConnection::class.java.getDeclaredField("method")
                methodField.isAccessible = true
                methodField.set(connection, method)
            } catch (reflectionError: Exception) {
                throw ex
            }
        }
    }

    private fun buildRequestContext(profile: ServerProfile): ApiResult<RequestContext> {
        val rawBaseUrl = profile.baseUrl.trim()
        if (rawBaseUrl.isBlank()) {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.EMPTY_BASE_URL,
                    message = "Base URL is empty for active profile."
                )
            )
        }

        val uri = try {
            URI(rawBaseUrl)
        } catch (ex: Exception) {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.INVALID_BASE_URL,
                    message = "Base URL is invalid: $rawBaseUrl",
                    cause = ex
                )
            )
        }

        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme != "http" && scheme != "https") {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.INVALID_BASE_URL,
                    message = "Base URL must use http or https."
                )
            )
        }
        if (uri.host.isNullOrBlank()) {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.INVALID_BASE_URL,
                    message = "Base URL host is missing."
                )
            )
        }

        val basePath = uri.path.orEmpty().trimEnd('/')
        val apiPath = if (basePath.isBlank()) "/api" else "$basePath/api"
        val apiBaseUri = URI(scheme, null, uri.host, uri.port, apiPath, null, null)

        val authorizationHeader = when (profile.authType) {
            AuthType.NONE -> null
            AuthType.BASIC -> {
                val username = profile.basicUsername.trim()
                val password = basicCredentialStore.getPassword(profile.id).orEmpty()
                if (username.isBlank() || password.isBlank()) {
                    return ApiResult.Failure(
                        SessionApiError(
                            code = SessionApiErrorCode.AUTH_MISSING_CREDENTIALS,
                            message = "Basic auth requires username/password in Settings for this profile."
                        )
                    )
                }
                val encoded = Base64.encodeToString(
                    "$username:$password".toByteArray(Charsets.UTF_8),
                    Base64.NO_WRAP
                )
                "Basic $encoded"
            }
        }

        return ApiResult.Success(RequestContext(apiBaseUri = apiBaseUri, authorizationHeader = authorizationHeader))
    }

    private fun buildApiUrl(apiBaseUri: URI, endpointPath: String): URL {
        val normalizedPath = endpointPath.trim().removePrefix("/")
        return URL("${apiBaseUri.toString().trimEnd('/')}/$normalizedPath")
    }

    private fun readResponseBody(connection: HttpURLConnection, statusCode: Int): String {
        val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
        if (stream == null) return ""
        return stream.bufferedReader().use { it.readText() }
    }

    private fun mapHttpError(
        statusCode: Int,
        responseBody: String,
        wwwAuthenticate: String = "",
        profile: ServerProfile? = null
    ): SessionApiError {
        val serverMessage = extractErrorMessage(responseBody)
        val code = when {
            statusCode == 401 || statusCode == 403 -> SessionApiErrorCode.AUTH_FAILED
            statusCode == 404 -> SessionApiErrorCode.NOT_FOUND
            statusCode >= 500 -> SessionApiErrorCode.SERVER_ERROR
            else -> SessionApiErrorCode.HTTP_ERROR
        }
        val message = buildString {
            append("HTTP $statusCode")
            if (!serverMessage.isNullOrBlank()) {
                append(": $serverMessage")
            }
            // Provide actionable hint when server wants BASIC auth but profile has auth disabled
            if (statusCode == 401
                && wwwAuthenticate.contains("Basic", ignoreCase = true)
                && profile?.authType != AuthType.BASIC
            ) {
                append(" — Server requires BASIC auth. Enable it in Settings for this profile.")
            }
        }
        Log.w(TAG, "HTTP error $statusCode authType=${profile?.authType} wwwAuth=$wwwAuthenticate")
        return SessionApiError(
            code = code,
            message = message,
            httpStatus = statusCode
        )
    }

    private fun extractErrorMessage(responseBody: String): String? {
        if (responseBody.isBlank()) return null
        return try {
            val json = JSONObject(responseBody)
            if (!json.has("error")) {
                null
            } else {
                when (val errorValue = json.opt("error")) {
                    is JSONObject -> normalizeNullableString(errorValue.optString("message"))
                    else -> normalizeNullableString(json.optString("error"))
                }
            }
        } catch (_: JSONException) {
            null
        }
    }

    private fun optNullableTrimmedString(obj: JSONObject, key: String): String? {
        if (!obj.has(key) || obj.isNull(key)) {
            return null
        }
        return normalizeNullableString(obj.optString(key))
    }

    private fun normalizeNullableString(value: String?): String? {
        val normalized = value?.trim().orEmpty()
        if (normalized.isBlank() || normalized.equals("null", ignoreCase = true)) {
            return null
        }
        return normalized
    }

    private data class RequestContext(
        val apiBaseUri: URI,
        val authorizationHeader: String?
    )

    companion object {
        private const val TAG = "TermLink-SessionApi"
        private const val MAX_REDIRECTS = 5
        private val REDIRECT_STATUS_CODES = setOf(301, 302, 303, 307, 308)
    }
}
