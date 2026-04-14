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
    val rateLimitsRead: Boolean,
    val diffPlanReasoning: Boolean,
    val historyList: Boolean,
    val historyResume: Boolean,
    val modelConfig: Boolean,
    val sandboxSupported: Boolean,
    val planModeSupported: Boolean,
    val slashCommands: Boolean,
    val slashModel: Boolean,
    val slashPlan: Boolean,
    val skillsList: Boolean,
    val compact: Boolean,
    val fileMentions: Boolean,
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
                rateLimitsRead = cap.optBoolean("rateLimitsRead", false),
                diffPlanReasoning = cap.optBoolean("diffPlanReasoning", false),
                historyList = cap.optBoolean("historyList", false),
                historyResume = cap.optBoolean("historyResume", false),
                modelConfig = cap.optBoolean("modelConfig", true),
                sandboxSupported = cap.optBoolean("sandboxSupported", true),
                planModeSupported = cap.optBoolean("planModeSupported", true),
                slashCommands = cap.optBoolean("slashCommands", false),
                slashModel = cap.optBoolean("slashModel", false),
                slashPlan = cap.optBoolean("slashPlan", false),
                skillsList = cap.optBoolean("skillsList", false),
                compact = cap.optBoolean("compact", false),
                fileMentions = cap.optBoolean("fileMentions", false),
                imageInputSupported = cap.optBoolean("imageInputSupported", cap.optBoolean("imageInput", false)),
                maxImageSize = cap.optLong("maxImageSize", cap.optLong("maxImageBytes", 0L))
            )
        }
    }
}

data class CodexEffectiveConfig(
    val model: String?,
    val reasoningEffort: String?,
    val personality: String?,
    val approvalPolicy: String?,
    val sandboxMode: String?
) {
    companion object {
        fun from(json: JSONObject?): CodexEffectiveConfig? {
            if (json == null) return null
            return CodexEffectiveConfig(
                model = json.optStringOrNull("model"),
                reasoningEffort = json.optStringOrNull("reasoningEffort")?.lowercase(),
                personality = json.optStringOrNull("personality"),
                approvalPolicy = json.optStringOrNull("approvalPolicy"),
                sandboxMode = json.optStringOrNull("sandboxMode")
            )
        }
    }
}

data class CodexInteractionState(
    val planMode: Boolean = false,
    val activeSkill: String? = null
) {
    companion object {
        fun from(json: JSONObject?): CodexInteractionState? {
            json ?: return null
            return CodexInteractionState(
                planMode = json.optBoolean("planMode", false),
                activeSkill = json.optStringOrNull("activeSkill")
            )
        }
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("planMode", planMode)
        if (!activeSkill.isNullOrBlank()) {
            put("activeSkill", activeSkill)
        } else {
            put("activeSkill", JSONObject.NULL)
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
    val interactionState: CodexInteractionState?,
    val cwd: String?,
    val approvalPending: Boolean,
    val pendingServerRequestCount: Int,
    val pendingServerRequests: List<CodexServerRequest>,
    val nextTurnEffectiveCodexConfig: CodexEffectiveConfig?,
    val tokenUsage: Any?,
    val rateLimitState: Any?,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexState {
            val interactionState = CodexInteractionState.from(json.optJSONObject("interactionState"))
            return CodexState(
                status = json.optString("status", "idle"),
                model = json.optStringOrNull("model"),
                reasoningEffort = json.optStringOrNull("reasoningEffort"),
                sandbox = if (json.has("sandbox")) json.optBoolean("sandbox") else null,
                planMode = interactionState?.planMode ?: if (json.has("planMode")) json.optBoolean("planMode") else null,
                threadId = json.optStringOrNull("threadId"),
                interactionState = interactionState,
                cwd = json.optStringOrNull("cwd"),
                approvalPending = json.optBoolean("approvalPending", false),
                pendingServerRequestCount = json.optInt("pendingServerRequestCount", 0),
                pendingServerRequests = CodexServerRequest.listFrom(json.optJSONArray("pendingServerRequests")),
                nextTurnEffectiveCodexConfig = CodexEffectiveConfig.from(
                    json.optJSONObject("nextTurnEffectiveCodexConfig")
                ),
                tokenUsage = if (json.has("tokenUsage")) json.opt("tokenUsage") else null,
                rateLimitState = if (json.has("rateLimitState")) json.opt("rateLimitState") else null,
                raw = json
            )
        }
    }
}

data class CodexServerRequestOption(
    val label: String
)

data class CodexServerRequestQuestion(
    val id: String,
    val question: String,
    val options: List<CodexServerRequestOption>,
    val allowFreeform: Boolean
)

data class CodexServerRequest(
    val requestId: String,
    val method: String,
    val requestKind: String,
    val responseMode: String,
    val handledBy: String,
    val summary: String?,
    val questionCount: Int,
    val command: String?,
    val questions: List<CodexServerRequestQuestion>,
    val params: JSONObject?,
    val defaultResult: JSONObject?
) {
    companion object {
        fun from(json: JSONObject): CodexServerRequest? {
            val requestId = json.optString("requestId", "").trim()
            if (requestId.isEmpty()) return null
            val params = json.optJSONObject("params")
            val questions = parseQuestions(params?.optJSONArray("questions"))
            return CodexServerRequest(
                requestId = requestId,
                method = json.optString("method", "unknown").trim().ifEmpty { "unknown" },
                requestKind = json.optString("requestKind", "unknown").trim().ifEmpty { "unknown" },
                responseMode = json.optString("responseMode", "unknown").trim().ifEmpty { "unknown" },
                handledBy = json.optString("handledBy", "unknown").trim().ifEmpty { "unknown" },
                summary = json.optStringOrNull("summary"),
                questionCount = json.optInt("questionCount", questions.size),
                command = params?.optStringOrNull("command"),
                questions = questions,
                params = params,
                defaultResult = json.optJSONObject("defaultResult")
            )
        }

        fun listFrom(array: JSONArray?): List<CodexServerRequest> {
            val result = mutableListOf<CodexServerRequest>()
            if (array == null) return result
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                from(item)?.let(result::add)
            }
            return result
        }

        private fun parseQuestions(array: JSONArray?): List<CodexServerRequestQuestion> {
            val result = mutableListOf<CodexServerRequestQuestion>()
            if (array == null) return result
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val id = item.optString("id", "").trim()
                if (id.isEmpty()) continue
                val options = mutableListOf<CodexServerRequestOption>()
                val optionsArray = item.optJSONArray("options")
                if (optionsArray != null) {
                    for (optionIndex in 0 until optionsArray.length()) {
                        val option = optionsArray.optJSONObject(optionIndex) ?: continue
                        val label = option.optString("label", "").trim()
                        if (label.isNotEmpty()) {
                            options.add(CodexServerRequestOption(label = label))
                        }
                    }
                }
                val allowFreeform = when {
                    item.has("allow_freeform") -> item.optBoolean("allow_freeform", true)
                    item.has("allowFreeform") -> item.optBoolean("allowFreeform", true)
                    else -> true
                }
                result.add(
                    CodexServerRequestQuestion(
                        id = id,
                        question = item.optString("question", "").trim(),
                        options = options,
                        allowFreeform = allowFreeform
                    )
                )
            }
            return result
        }
    }
}

data class CodexResponse(
    val event: String,
    val method: String?,
    val threadId: String?,
    val turnId: String?,
    val result: Any?,
    val error: JSONObject?,
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
            method = json.optStringOrNull("method"),
            threadId = json.optStringOrNull("threadId"),
            turnId = json.optStringOrNull("turnId"),
            result = json.opt("result"),
            error = json.optJSONObject("error"),
            content = json.optStringOrNull("content"),
            role = json.optStringOrNull("role"),
            contentType = json.optStringOrNull("contentType"),
            toolName = json.optStringOrNull("toolName"),
            metadata = json.optJSONObject("metadata"),
            raw = json
        )
    }
}

data class CodexTurnAttachment(
    val type: String,
    val path: String? = null,
    val url: String? = null
) {
    fun toJson(): JSONObject = JSONObject()
        .put("type", type)
        .apply {
            path?.let { put("path", it) }
            url?.let { put("url", it) }
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

data class CodexServerRequestEnvelope(
    val request: CodexServerRequest,
    val raw: JSONObject
) {
    companion object {
        fun from(json: JSONObject): CodexServerRequestEnvelope? {
            val request = CodexServerRequest.from(json) ?: return null
            return CodexServerRequestEnvelope(request = request, raw = json)
        }
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
        attachments: List<CodexTurnAttachment>? = null,
        interactionState: CodexInteractionState? = null,
        model: String? = null,
        reasoningEffort: String? = null,
        sandbox: String? = null,
        collaborationMode: org.json.JSONObject? = null,
        forceNewThread: Boolean = false
    ): String {
        val json = JSONObject()
            .put("type", "codex_turn")
            .put("text", prompt)
        threadId?.let { json.put("threadId", it) }
        if (!attachments.isNullOrEmpty()) {
            json.put(
                "attachments",
                JSONArray().apply {
                    attachments.forEach { put(it.toJson()) }
                }
            )
        }
        interactionState?.let { json.put("interactionState", it.toJson()) }
        model?.let { json.put("model", it) }
        reasoningEffort?.let { json.put("reasoningEffort", it) }
        sandbox?.let { json.put("sandbox", it) }
        collaborationMode?.let { json.put("collaborationMode", it) }
        if (forceNewThread) json.put("forceNewThread", true)
        return json.toString()
    }

    fun buildCollaborationMode(
        mode: String = "plan",
        model: String? = null,
        reasoningEffort: String? = null
    ): JSONObject {
        val settings = JSONObject()
        model?.let { settings.put("model", it) }
        reasoningEffort?.let { settings.put("reasoning_effort", it) }
        return JSONObject()
            .put("mode", mode)
            .put("settings", settings)
    }

    fun codexRequest(action: String, params: JSONObject? = JSONObject()): String {
        val json = JSONObject()
            .put("type", "codex_request")
            .put("method", action)
            .put("params", params ?: JSONObject())
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

    fun codexSetInteractionState(state: CodexInteractionState): String = JSONObject()
        .put("type", "codex_set_interaction_state")
        .put("interactionState", state.toJson())
        .toString()

    fun codexServerRequestResponse(
        requestId: String,
        result: JSONObject? = null,
        error: JSONObject? = null,
        useDefault: Boolean = false
    ): String {
        val json = JSONObject()
            .put("type", "codex_server_request_response")
            .put("requestId", requestId)
        result?.let { json.put("result", it) }
        error?.let { json.put("error", it) }
        if (useDefault) json.put("useDefault", true)
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
