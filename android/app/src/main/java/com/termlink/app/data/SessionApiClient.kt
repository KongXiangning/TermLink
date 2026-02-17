package com.termlink.app.data

import android.content.Context
import android.util.Base64
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
        val payload = JSONObject().put("name", name).toString()
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
                        lastActiveAt = item.optLong("lastActiveAt", 0L)
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
                    name = obj.optString("name", "Unnamed Session")
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

        val url = buildApiUrl(requestContext.apiBaseUri, endpointPath)
        val connection = try {
            (url.openConnection() as HttpURLConnection).apply {
                setRequestMethodCompat(this, method)
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

        if (body != null) {
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

        return try {
            if (body != null) {
                connection.outputStream.bufferedWriter().use { writer ->
                    writer.write(body)
                }
            }

            val statusCode = connection.responseCode
            val responseBody = readResponseBody(connection, statusCode)
            if (statusCode in 200..299) {
                ApiResult.Success(responseBody)
            } else {
                ApiResult.Failure(mapHttpError(statusCode, responseBody))
            }
        } catch (ex: IOException) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.NETWORK_ERROR,
                    message = "Network request failed.",
                    cause = ex
                )
            )
        } catch (ex: Exception) {
            ApiResult.Failure(
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
                val userInfo = uri.userInfo?.trim().orEmpty()
                if (userInfo.isBlank() || !userInfo.contains(":")) {
                    return ApiResult.Failure(
                        SessionApiError(
                            code = SessionApiErrorCode.AUTH_MISSING_CREDENTIALS,
                            message = "Basic auth requires user:pass in baseUrl (e.g. https://user:pass@host)."
                        )
                    )
                }
                val encoded = Base64.encodeToString(
                    userInfo.toByteArray(Charsets.UTF_8),
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

    private fun mapHttpError(statusCode: Int, responseBody: String): SessionApiError {
        val serverMessage = extractErrorMessage(responseBody)
        val code = when {
            statusCode == 401 || statusCode == 403 -> SessionApiErrorCode.AUTH_FAILED
            statusCode == 404 -> SessionApiErrorCode.NOT_FOUND
            statusCode >= 500 -> SessionApiErrorCode.SERVER_ERROR
            else -> SessionApiErrorCode.HTTP_ERROR
        }
        val message = if (serverMessage.isNullOrBlank()) {
            "HTTP $statusCode"
        } else {
            "HTTP $statusCode: $serverMessage"
        }
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
                json.optString("error").takeIf { it.isNotBlank() }
            }
        } catch (_: JSONException) {
            null
        }
    }

    private data class RequestContext(
        val apiBaseUri: URI,
        val authorizationHeader: String?
    )
}
