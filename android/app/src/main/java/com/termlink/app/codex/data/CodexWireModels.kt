package com.termlink.app.codex.data

import org.json.JSONArray
import org.json.JSONObject

/** Return the string value for [key], or null when absent / JSON-null. */
private fun JSONObject.optStringOrNull(key: String): String? =
    if (!has(key) || isNull(key)) {
        null
    } else {
        getString(key)
            .trim()
            .takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }
    }

/**
 * Thin envelope for all Codex WebSocket messages.
 * The gateway always wraps payloads in `{ "type": "...", ... }`.
 */
data class CodexWsEnvelope(
    val type: String,
    val raw: JSONObject
) {
    companion object {
        fun parse(text: String): CodexWsEnvelope? {
            return try {
                val json = JSONObject(text)
                val type = json.optString("type", "").trim()
                if (type.isEmpty()) null else CodexWsEnvelope(type, json)
            } catch (_: Exception) {
                null
            }
        }
    }
}

// ── Server → Client DTOs ──────────────────────────────────────────────

data class SessionInfo(
    val sessionId: String,
    val sessionName: String,
    val sessionMode: String,
    val cwd: String?,
    val privilegeLevel: String?
) {
    companion object {
        fun from(json: JSONObject): SessionInfo = SessionInfo(
            sessionId = json.optString("sessionId", ""),
            sessionName = json.optString("sessionName", json.optString("name", "")),
            sessionMode = json.optString("sessionMode", "codex"),
            cwd = json.optStringOrNull("cwd"),
            privilegeLevel = json.optStringOrNull("privilegeLevel")
        )
    }
}

data class CodexCapabilities(
    val models: List<String>,
    val defaultModel: String,
    val reasoningEffortLevels: List<String>,
    val defaultReasoningEffort: String,
    val sandboxSupported: Boolean,
    val planModeSupported: Boolean,
    val imageInputSupported: Boolean,
    val maxImageSize: Long
) {
    companion object {
        fun from(json: JSONObject): CodexCapabilities {
            val cap = json.optJSONObject("capabilities") ?: json
            return CodexCapabilities(
                models = cap.optJSONArray("models")?.toStringList() ?: emptyList(),
                defaultModel = cap.optString("defaultModel", ""),
                reasoningEffortLevels = cap.optJSONArray("reasoningEffortLevels")?.toStringList()
                    ?: listOf("low", "medium", "high"),
                defaultReasoningEffort = cap.optString("defaultReasoningEffort", "medium"),
                sandboxSupported = cap.optBoolean("sandboxSupported", true),
                planModeSupported = cap.optBoolean("planModeSupported", true),
                imageInputSupported = cap.optBoolean("imageInputSupported", false),
                maxImageSize = cap.optLong("maxImageSize", 0L)
            )
        }
    }
}

data class CodexState(
    val status: String,
    val model: String?,
    val reasoningEffort: String?,
    val sandbox: Boolean?,
    val planMode: Boolean?,
    val threadId: String?,
    val interactionState: String?,
    val cwd: String?,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexState = CodexState(
            status = json.optString("status", "idle"),
            model = json.optStringOrNull("model"),
            reasoningEffort = json.optStringOrNull("reasoningEffort"),
            sandbox = if (json.has("sandbox")) json.optBoolean("sandbox") else null,
            planMode = if (json.has("planMode")) json.optBoolean("planMode") else null,
            threadId = json.optStringOrNull("threadId"),
            interactionState = json.optStringOrNull("interactionState"),
            cwd = json.optStringOrNull("cwd"),
            raw = json
        )
    }
}

data class CodexResponse(
    val event: String,
    val threadId: String?,
    val turnId: String?,
    val content: String?,
    val role: String?,
    val contentType: String?,
    val toolName: String?,
    val metadata: JSONObject?,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexResponse = CodexResponse(
            event = json.optString("event", ""),
            threadId = json.optStringOrNull("threadId"),
            turnId = json.optStringOrNull("turnId"),
            content = json.optStringOrNull("content"),
            role = json.optStringOrNull("role"),
            contentType = json.optStringOrNull("contentType"),
            toolName = json.optStringOrNull("toolName"),
            metadata = json.optJSONObject("metadata"),
            raw = json
        )
    }
}

data class CodexError(
    val code: String,
    val message: String,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexError = CodexError(
            code = json.optString("code", "unknown"),
            message = json.optString("message", json.optString("error", "")),
            raw = json
        )
    }
}

data class CodexThreadReady(
    val threadId: String,
    val resumed: Boolean
) {
    companion object {
        fun from(json: JSONObject): CodexThreadReady = CodexThreadReady(
            threadId = json.optString("threadId", ""),
            resumed = json.optBoolean("resumed", false)
        )
    }
}

data class CodexThreadSnapshot(
    val threadId: String,
    val messages: JSONArray
) {
    companion object {
        fun from(json: JSONObject): CodexThreadSnapshot = CodexThreadSnapshot(
            threadId = json.optString("threadId", ""),
            messages = json.optJSONArray("messages") ?: JSONArray()
        )
    }
}

data class CodexTurnAck(
    val turnId: String,
    val threadId: String?
) {
    companion object {
        fun from(json: JSONObject): CodexTurnAck = CodexTurnAck(
            turnId = json.optString("turnId", ""),
            threadId = json.optStringOrNull("threadId")
        )
    }
}

data class CodexInterruptAck(
    val threadId: String?
) {
    companion object {
        fun from(json: JSONObject): CodexInterruptAck = CodexInterruptAck(
            threadId = json.optStringOrNull("threadId")
        )
    }
}

data class CodexNotification(
    val method: String,
    val params: JSONObject?,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexNotification = CodexNotification(
            method = json.optString("method", ""),
            params = json.optJSONObject("params"),
            raw = json
        )
    }
}

// ── Client → Server builders ──────────────────────────────────────────

object CodexClientMessages {

    fun heartbeat(): String = JSONObject()
        .put("type", "client_heartbeat")
        .toString()

    fun codexTurn(
        prompt: String,
        threadId: String? = null,
        images: List<String>? = null
    ): String {
        val json = JSONObject()
            .put("type", "codex_turn")
            .put("text", prompt)
        threadId?.let { json.put("threadId", it) }
        if (!images.isNullOrEmpty()) {
            json.put("images", JSONArray(images))
        }
        return json.toString()
    }

    fun codexRequest(action: String, params: JSONObject? = null): String {
        val json = JSONObject()
            .put("type", "codex_request")
            .put("action", action)
        params?.let { json.put("params", it) }
        return json.toString()
    }

    fun codexInterrupt(threadId: String? = null): String {
        val json = JSONObject()
            .put("type", "codex_interrupt")
        threadId?.let { json.put("threadId", it) }
        return json.toString()
    }

    fun codexSetCwd(cwd: String): String = JSONObject()
        .put("type", "codex_set_cwd")
        .put("cwd", cwd)
        .toString()

    fun codexNewThread(): String = JSONObject()
        .put("type", "codex_new_thread")
        .toString()

    fun codexThreadRead(threadId: String): String = JSONObject()
        .put("type", "codex_thread_read")
        .put("threadId", threadId)
        .toString()

    fun codexSetInteractionState(state: String): String = JSONObject()
        .put("type", "codex_set_interaction_state")
        .put("interactionState", state)
        .toString()

    fun codexServerRequestResponse(
        requestId: String,
        approved: Boolean,
        response: String? = null
    ): String {
        val json = JSONObject()
            .put("type", "codex_server_request_response")
            .put("requestId", requestId)
            .put("approved", approved)
        response?.let { json.put("response", it) }
        return json.toString()
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

private fun JSONArray.toStringList(): List<String> {
    val result = mutableListOf<String>()
    for (i in 0 until length()) {
        val s = optString(i, "")
        if (s.isNotEmpty()) result.add(s)
    }
    return result
}
