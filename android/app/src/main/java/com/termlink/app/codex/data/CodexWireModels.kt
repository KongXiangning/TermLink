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

private fun JSONObject.optIntOrNull(key: String): Int? =
    if (!has(key) || isNull(key)) null else optInt(key).takeIf { it > 0 }

private fun JSONObject.optLongOrNull(key: String): Long? =
    if (!has(key) || isNull(key)) null else optLong(key).takeIf { it > 0L }

/**
 * Thin envelope for all Codex WebSocket messages.
 * The gateway always wraps payloads in `{ "type": "...", ... }`.
 */
data class CodexWsEnvelope(
    val type: String,
    val raw: JSONObject
) {
    companion object {
        /** Maximum UTF-8 size accepted for one bounded WebSocket envelope. */
        const val MAX_ENVELOPE_BYTES: Int = 256 * 1024

        /**
         * Check the byte budget before constructing JSONObject.  The cheap
         * UTF-16 length guard avoids allocating another byte array for an
         * already oversized OkHttp String; only messages near the limit are
         * encoded to account for multi-byte UTF-8 text.
         */
        fun isWithinMaxEnvelopeBytes(text: String): Boolean {
            if (text.length > MAX_ENVELOPE_BYTES) return false
            return text.toByteArray(Charsets.UTF_8).size <= MAX_ENVELOPE_BYTES
        }

        fun parse(text: String): CodexWsEnvelope? {
            if (!isWithinMaxEnvelopeBytes(text)) return null
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
    val lastCodexThreadId: String?,
    val privilegeLevel: String?
) {
    companion object {
        fun from(json: JSONObject): SessionInfo = SessionInfo(
            sessionId = json.optString("sessionId", ""),
            sessionName = json.optString("sessionName", json.optString("name", "")),
            sessionMode = json.optString("sessionMode", "codex"),
            cwd = json.optStringOrNull("cwd"),
            lastCodexThreadId = json.optStringOrNull("lastCodexThreadId"),
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
    val maxImageSize: Long,
    val permissionProfiles: Boolean = false,
    val approvalsReviewer: Boolean = false
) {
    companion object {
        fun from(json: JSONObject): CodexCapabilities {
            val cap = json.optJSONObject("capabilities") ?: json
            return CodexCapabilities(
                models = cap.optJSONArray("models")?.toStringList() ?: emptyList(),
                defaultModel = cap.optString("defaultModel", ""),
                reasoningEffortLevels = cap.optJSONArray("reasoningEffortLevels")?.toStringList()
                    ?: emptyList(),
                defaultReasoningEffort = cap.optString("defaultReasoningEffort", ""),
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
                maxImageSize = cap.optLong("maxImageSize", cap.optLong("maxImageBytes", 0L)),
                permissionProfiles = cap.optBoolean("permissionProfiles", false),
                approvalsReviewer = cap.optBoolean("approvalsReviewer", false)
            )
        }
    }

}

data class CodexHistoryCapability(
    val version: Int,
    val manifestPageSize: Int,
    val deltaMaxItems: Int,
    val deltaMaxBytes: Int,
    val syncInactivityTimeoutMs: Long,
    val recovery: Boolean = false,
    val selectionGeneration: Boolean = false,
    val perPageAck: Boolean = false,
    val payloadChunks: Boolean = false,
    val payloadChunkMaxBytes: Int = 131072,
    val maxEnvelopeBytes: Int = 262144,
    val rangeSegments: CodexHistoryRangeCapability? = null,
    val serverSnapshotSegments: CodexHistorySnapshotSegmentsCapability? = null,
    val tailValidation: CodexHistoryTailValidationCapability? = null,
    val terminalReconcile: CodexHistoryTerminalReconcileCapability? = null
) {
    companion object {
        fun from(status: JSONObject?): CodexHistoryCapability? {
            val json = (status?.optJSONObject("capabilities") ?: status)?.optJSONObject("historySync") ?: return null
            if (json.optInt("version", 0) != 1) return null
            return CodexHistoryCapability(
                version = json.optInt("version"),
                manifestPageSize = json.optInt("manifestPageSize", 200),
                deltaMaxItems = json.optInt("deltaMaxItems", 100),
                deltaMaxBytes = json.optInt("deltaMaxBytes", 262144),
                syncInactivityTimeoutMs = json.optLong("syncInactivityTimeoutMs", 30000),
                recovery = json.optBoolean("recovery", false),
                selectionGeneration = json.optBoolean("selectionGeneration", false),
                perPageAck = json.optBoolean("perPageAck", false),
                payloadChunks = json.optBoolean("payloadChunks", false),
                payloadChunkMaxBytes = json.optInt("payloadChunkMaxBytes", 131072),
                maxEnvelopeBytes = json.optInt("maxEnvelopeBytes", 262144),
                rangeSegments = CodexHistoryRangeCapability.from(json.optJSONObject("rangeSegments")),
                serverSnapshotSegments = CodexHistorySnapshotSegmentsCapability.from(
                    json.optJSONObject("serverSnapshotSegments")
                ),
                tailValidation = CodexHistoryTailValidationCapability.from(json.optJSONObject("tailValidation")),
                terminalReconcile = CodexHistoryTerminalReconcileCapability.from(
                    json.optJSONObject("terminalReconcile")
                )
            )
        }
    }
}

data class CodexHistoryRangeCapability(
    val enabled: Boolean,
    val version: Int,
    val cacheSchemaVersion: Int
) {
    companion object {
        fun from(json: JSONObject?): CodexHistoryRangeCapability? {
            if (json == null) return null
            return CodexHistoryRangeCapability(
                enabled = json.optBoolean("enabled", false),
                version = json.optInt("version", 0),
                cacheSchemaVersion = json.optInt("cacheSchemaVersion", 0)
            )
        }
    }
}

/** P0-B.4R static snapshot segment capability, independent from native cursor range pages. */
data class CodexHistorySnapshotSegmentsCapability(
    val enabled: Boolean,
    val version: Int,
    val cacheSchemaVersion: Int,
    val segmentTargetBytes: Int = 96 * 1024,
    val fragmentMaxBytes: Int = 16 * 1024
) {
    companion object {
        fun from(json: JSONObject?): CodexHistorySnapshotSegmentsCapability? {
            if (json == null) return null
            return CodexHistorySnapshotSegmentsCapability(
                enabled = json.optBoolean("enabled", false),
                version = json.optInt("version", 0),
                cacheSchemaVersion = json.optInt("cacheSchemaVersion", 0),
                segmentTargetBytes = json.optInt("segmentTargetBytes", 96 * 1024),
                fragmentMaxBytes = json.optInt("fragmentMaxBytes", 16 * 1024)
            )
        }
    }
}

/** Read-only canonical-tail comparison capability; no history payload lane. */
data class CodexHistoryTailValidationCapability(
    val enabled: Boolean,
    val version: Int
) {
    companion object {
        fun from(json: JSONObject?): CodexHistoryTailValidationCapability? {
            if (json == null) return null
            return CodexHistoryTailValidationCapability(
                enabled = json.optBoolean("enabled", false),
                version = json.optInt("version", 0)
            )
        }
    }
}

/**
 * P0-C capability for the completed-only durable lane. It is deliberately
 * separate from tail validation: this lane may read legacy canonical history,
 * but never becomes a realtime/UI authority.
 */
data class CodexHistoryTerminalReconcileCapability(
    val enabled: Boolean,
    val version: Int
) {
    companion object {
        fun from(json: JSONObject?): CodexHistoryTerminalReconcileCapability? {
            if (json == null) return null
            return CodexHistoryTerminalReconcileCapability(
                enabled = json.optBoolean("enabled", false),
                version = json.optInt("version", 0)
            )
        }
    }
}

data class CodexHistoryRangeAnchor(
    val key: String,
    val hash: String
)

data class CodexHistoryRangeMetadata(
    val version: Int,
    val segmentId: String,
    val rangeId: String,
    val rangeKind: String,
    val providerMode: String? = null,
    val providerIdentityHash: String? = null,
    val newestAnchor: CodexHistoryRangeAnchor?,
    val oldestAnchor: CodexHistoryRangeAnchor?,
    val nextOlderCursor: String?,
    val hasMoreBefore: Boolean,
    val coverageRoot: String?,
    val coverageComplete: Boolean
)

data class CodexHistorySyncCheckpoint(
    val rootHash: String?,
    val itemCount: Int,
    val complete: Boolean,
    val providerMode: String? = null,
    val providerIdentityHash: String? = null,
    val rangeId: String? = null,
    val rangeKind: String? = null,
    val newestAnchorKey: String? = null,
    val newestAnchorHash: String? = null,
    val oldestAnchorKey: String? = null,
    val oldestAnchorHash: String? = null,
    val nextOlderCursor: String? = null,
    val coverageRoot: String? = null,
    val hasMoreBefore: Boolean? = null,
    val coverageComplete: Boolean = false
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("rootHash", rootHash ?: JSONObject.NULL)
        put("itemCount", itemCount)
        put("complete", complete)
        providerMode?.let { put("providerMode", it) }
        providerIdentityHash?.let { put("providerIdentityHash", it) }
        rangeId?.let { put("rangeId", it) }
        rangeKind?.let { put("rangeKind", it) }
        newestAnchorKey?.let { put("newestAnchorKey", it) }
        newestAnchorHash?.let { put("newestAnchorHash", it) }
        oldestAnchorKey?.let { put("oldestAnchorKey", it) }
        oldestAnchorHash?.let { put("oldestAnchorHash", it) }
        coverageRoot?.let { put("coverageRoot", it) }
        hasMoreBefore?.let { put("hasMoreBefore", it) }
        // Keep the negotiated-off v1/v2 request shape unchanged.  The
        // additive range proof is sent only when this checkpoint carries
        // range provenance (or an explicit positive proof).
        if (hasRangeMetadata() || coverageComplete) {
            if (hasRangeMetadata()) {
                put("nextOlderCursor", nextOlderCursor ?: JSONObject.NULL)
            }
            put("coverageComplete", coverageComplete)
        }
    }

    private fun hasRangeMetadata(): Boolean =
        providerMode != null || providerIdentityHash != null || rangeId != null || rangeKind != null ||
            newestAnchorKey != null || newestAnchorHash != null || oldestAnchorKey != null ||
            oldestAnchorHash != null || nextOlderCursor != null || coverageRoot != null ||
            hasMoreBefore != null
}

data class CodexHistorySyncRequest(
    val syncId: String,
    val conversationId: String,
    val checkpoint: CodexHistorySyncCheckpoint,
    val selectionGeneration: Long = 0L,
    val cacheSchemaVersion: Int = 1,
    val rangeSegments: CodexHistoryRangeCapability? = null,
    val serverSnapshotSegments: CodexHistorySnapshotSegmentsCapability? = null,
    val profileId: String? = null
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("type", "conversation_history_sync_request")
        put("syncId", syncId)
        put("conversationId", conversationId)
        val range = rangeSegments?.takeIf { it.isWireEnabled() }
        val snapshot = serverSnapshotSegments?.takeIf { it.isWireEnabled() }
        put("cacheSchemaVersion", cacheSchemaVersion.coerceIn(1, if (range != null || snapshot != null) 3 else 2))
        put("checkpoint", checkpoint.toJson())
        put("selectionGeneration", selectionGeneration.coerceAtLeast(0L))
        profileId?.trim()?.takeIf { it.isNotEmpty() }?.let { put("profileId", it) }
        if (range != null) {
            put("rangeSegments", JSONObject().apply {
                put("enabled", true)
                put("version", range.version)
                put("cacheSchemaVersion", range.cacheSchemaVersion)
            })
        }
        if (snapshot != null) {
            put("serverSnapshotSegments", JSONObject().apply {
                put("enabled", true)
                put("version", snapshot.version)
                put("cacheSchemaVersion", snapshot.cacheSchemaVersion)
            })
        }
    }
}

/**
 * A private validation-only request. It deliberately carries no range,
 * manifest, payload, or cache-write intent: Gateway only compares the local
 * durable newest anchor with one verified bounded canonical page.
 */
data class CodexHistoryTailValidationRequest(
    val syncId: String,
    val conversationId: String,
    val checkpoint: CodexHistorySyncCheckpoint,
    val selectionGeneration: Long,
    val tailValidation: CodexHistoryTailValidationCapability
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("type", "conversation_history_tail_validation_request")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("checkpoint", checkpoint.toJson())
        put("selectionGeneration", selectionGeneration.coerceAtLeast(0L))
        put("tailValidation", JSONObject().apply {
            put("enabled", true)
            put("version", tailValidation.version)
        })
    }
}

/**
 * Completed-only P0-C request. The captured selection generation is a
 * durable-cache fence, not a request to mutate that selection's UI state.
 */
data class CodexHistoryTerminalReconcileRequest(
    val syncId: String,
    val conversationId: String,
    val checkpoint: CodexHistorySyncCheckpoint,
    val selectionGeneration: Long,
    val terminalEpoch: String,
    val terminalReconcile: CodexHistoryTerminalReconcileCapability,
    val cacheSchemaVersion: Int = 1
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("type", "conversation_history_terminal_reconcile_request")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("checkpoint", checkpoint.toJson())
        put("selectionGeneration", selectionGeneration.coerceAtLeast(0L))
        put("terminalEpoch", terminalEpoch)
        put("cacheSchemaVersion", cacheSchemaVersion.coerceIn(1, 3))
        put("terminalReconcile", JSONObject().apply {
            put("enabled", true)
            put("version", terminalReconcile.version)
        })
    }
}

private fun CodexHistoryRangeCapability.isWireEnabled(): Boolean =
    enabled && version == 1 && cacheSchemaVersion >= 3

private fun CodexHistorySnapshotSegmentsCapability.isWireEnabled(): Boolean =
    enabled && version == 1 && cacheSchemaVersion >= 3

private fun CodexHistoryTailValidationCapability.isWireEnabled(): Boolean =
    enabled && version == 1

data class CodexHistoryManifestRequired(
    val syncId: String,
    val conversationId: String,
    val pageSize: Int,
    val selectionGeneration: Long,
    val clientSelectionGeneration: Long,
    val purpose: String = "history_sync",
    val terminalEpoch: String? = null
) {
    companion object {
        fun from(json: JSONObject): CodexHistoryManifestRequired? {
            val syncId = json.optStringOrNull("syncId") ?: return null
            val conversationId = json.optStringOrNull("conversationId") ?: return null
            return CodexHistoryManifestRequired(
                syncId = syncId,
                conversationId = conversationId,
                pageSize = json.optInt("pageSize", 200).coerceIn(1, 2_000),
                selectionGeneration = json.optLong("selectionGeneration", 0L),
                clientSelectionGeneration = json.optLong("clientSelectionGeneration", 0L),
                purpose = json.optString("purpose", "history_sync"),
                terminalEpoch = json.optStringOrNull("terminalEpoch")
            )
        }
    }
}

data class CodexHistorySyncStateMessage(
    val syncId: String,
    val conversationId: String,
    val state: String,
    val detailCode: String?,
    val selectionGeneration: Long,
    val clientSelectionGeneration: Long,
    val purpose: String = "history_sync",
    val terminalEpoch: String? = null
) {
    companion object {
        fun from(json: JSONObject): CodexHistorySyncStateMessage = CodexHistorySyncStateMessage(
            syncId = json.optString("syncId", ""),
            conversationId = json.optString("conversationId", ""),
            state = json.optString("state", "failed"),
            detailCode = json.optStringOrNull("detailCode"),
            selectionGeneration = json.optLong("selectionGeneration", 0L),
            clientSelectionGeneration = json.optLong("clientSelectionGeneration", 0L),
            purpose = json.optString("purpose", "history_sync"),
            terminalEpoch = json.optStringOrNull("terminalEpoch")
        )
    }
}

data class CodexHistoryDeltaWire(
    val page: CodexHistoryDeltaPage,
    val purpose: String = "history_sync",
    val terminalEpoch: String? = null
) {
    companion object {
        fun from(json: JSONObject): CodexHistoryDeltaWire? {
            val syncId = json.optStringOrNull("syncId") ?: return null
            val conversationId = json.optStringOrNull("conversationId") ?: return null
            val page = CodexHistoryDeltaPage(
                syncId = syncId,
                conversationId = conversationId,
                sequence = json.optInt("sequence", 0),
                pageIndex = json.optInt("pageIndex", 0),
                pageCount = json.optInt("pageCount", 0),
                pageHash = json.optString("pageHash", ""),
                baseRoot = json.optStringOrNull("baseRoot"),
                targetRoot = json.optString("targetRoot", ""),
                baselineComplete = json.optBoolean("baselineComplete", false),
                fullOrderIncluded = json.optBoolean("fullOrderIncluded", false),
                canonicalOrder = json.optJSONArray("canonicalOrder")?.toStringList() ?: emptyList(),
                upserts = parseItems(json.optJSONArray("upserts")),
                deletes = json.optJSONArray("deletes")?.toStringList() ?: emptyList(),
                range = parseRange(json.optJSONObject("range")),
                selectionGeneration = json.optLong("clientSelectionGeneration", json.optLong("selectionGeneration", 0L))
            )
            return CodexHistoryDeltaWire(
                page = page,
                purpose = json.optString("purpose", "history_sync"),
                terminalEpoch = json.optStringOrNull("terminalEpoch")
            )
        }

        private fun parseItems(array: JSONArray?): List<CodexHistoryItem> {
            if (array == null) return emptyList()
            return buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val key = item.optStringOrNull("itemKey") ?: continue
                    add(CodexHistoryItem(
                        itemKey = key,
                        turnId = item.optStringOrNull("turnId"),
                        position = item.optInt("position", 0),
                        itemType = item.optString("itemType", "message"),
                        role = item.optStringOrNull("role"),
                        clientRequestId = item.optStringOrNull("clientRequestId"),
                        payloadJson = item.optString("payloadJson", ""),
                        contentHash = item.optString("contentHash", ""),
                        payloadHash = item.optStringOrNull("payloadHash"),
                        payloadBytes = if (item.has("payloadBytes") && !item.isNull("payloadBytes")) item.optInt("payloadBytes") else null,
                        payloadChunkCount = item.optInt("payloadChunkCount", 0)
                    ))
                }
            }
        }

        private fun parseRange(json: JSONObject?): CodexHistoryRangeMetadata? {
            if (json == null) return null
            val segmentId = json.optStringOrNull("segmentId") ?: return null
            val rangeId = json.optStringOrNull("rangeId") ?: segmentId
            fun anchor(name: String): CodexHistoryRangeAnchor? {
                val value = json.optJSONObject(name) ?: return null
                val key = value.optStringOrNull("key") ?: return null
                val hash = value.optStringOrNull("hash") ?: return null
                return CodexHistoryRangeAnchor(key, hash)
            }
            return CodexHistoryRangeMetadata(
                version = json.optInt("version", 1),
                segmentId = segmentId,
                rangeId = rangeId,
                rangeKind = json.optString("rangeKind", "tail"),
                providerMode = json.optStringOrNull("providerMode"),
                providerIdentityHash = json.optStringOrNull("providerIdentityHash"),
                newestAnchor = anchor("newestAnchor"),
                oldestAnchor = anchor("oldestAnchor"),
                nextOlderCursor = json.optStringOrNull("nextOlderCursor"),
                hasMoreBefore = json.optBoolean("hasMoreBefore", false),
                coverageRoot = json.optStringOrNull("coverageRoot"),
                coverageComplete = json.optBoolean("coverageComplete", false)
            )
        }
    }
}

data class CodexHistoryPayloadChunkWire(
    val chunk: CodexHistoryPayloadChunk,
    val purpose: String = "history_sync",
    val terminalEpoch: String? = null
) {
    companion object {
        fun from(json: JSONObject): CodexHistoryPayloadChunkWire? {
            val syncId = json.optStringOrNull("syncId") ?: return null
            val conversationId = json.optStringOrNull("conversationId") ?: return null
            val itemKey = json.optStringOrNull("itemKey") ?: return null
            val payloadHash = json.optStringOrNull("payloadHash") ?: return null
            val data = json.optString("data", "")
            if (json.optInt("chunkCount", 0) <= 0) return null
            return CodexHistoryPayloadChunkWire(
                chunk = CodexHistoryPayloadChunk(
                    syncId = syncId,
                    conversationId = conversationId,
                    sequence = json.optInt("sequence", 0),
                    pageIndex = json.optInt("pageIndex", 0),
                    targetRoot = json.optString("targetRoot", ""),
                    baselineComplete = json.optBoolean("baselineComplete", false),
                    itemKey = itemKey,
                    chunkIndex = json.optInt("chunkIndex", -1),
                    chunkCount = json.optInt("chunkCount", 0),
                    payloadHash = payloadHash,
                    payloadBytes = json.optInt("payloadBytes", -1),
                    data = data,
                    selectionGeneration = json.optLong("clientSelectionGeneration", json.optLong("selectionGeneration", 0L))
                ),
                purpose = json.optString("purpose", "history_sync"),
                terminalEpoch = json.optStringOrNull("terminalEpoch")
            )
        }
    }
}

data class CodexHistorySegmentCommit(
    val syncId: String,
    val conversationId: String,
    val sequence: Int,
    val pageIndex: Int,
    val segmentId: String,
    val pageHash: String,
    val targetRoot: String,
    val selectionGeneration: Long
) {
    companion object {
        fun from(json: JSONObject): CodexHistorySegmentCommit? {
            val syncId = json.optStringOrNull("syncId") ?: return null
            val conversationId = json.optStringOrNull("conversationId") ?: return null
            val segmentId = json.optStringOrNull("segmentId") ?: return null
            val pageHash = json.optStringOrNull("pageHash") ?: return null
            val targetRoot = json.optStringOrNull("targetRoot") ?: return null
            return CodexHistorySegmentCommit(
                syncId = syncId,
                conversationId = conversationId,
                sequence = json.optInt("sequence", -1),
                pageIndex = json.optInt("pageIndex", -1),
                segmentId = segmentId,
                pageHash = pageHash,
                targetRoot = targetRoot,
                selectionGeneration = json.optLong("clientSelectionGeneration", json.optLong("selectionGeneration", 0L))
            )
        }
    }
}

data class CodexPermissionProfileOption(
    val id: String,
    val description: String? = null,
    val allowed: Boolean = true
) {
    companion object {
        fun listFrom(result: Any?): List<CodexPermissionProfileOption> {
            val entries = when (result) {
                is JSONArray -> result
                is JSONObject -> result.optJSONArray("data")
                    ?: result.optJSONArray("profiles")
                else -> null
            } ?: return emptyList()
            return buildList {
                for (index in 0 until entries.length()) {
                    val entry = entries.optJSONObject(index) ?: continue
                    val id = entry.optStringOrNull("id") ?: continue
                    add(
                        CodexPermissionProfileOption(
                            id = id,
                            description = entry.optStringOrNull("description"),
                            allowed = entry.optBoolean("allowed", true)
                        )
                    )
                }
            }.distinctBy(CodexPermissionProfileOption::id)
        }
    }
}

data class CodexModelOption(
    val id: String,
    val displayName: String,
    val description: String? = null,
    val defaultReasoningEffort: String? = null,
    val supportedReasoningEfforts: List<String> = emptyList(),
    val isDefault: Boolean = false,
    val hidden: Boolean = false,
    val upgradeModel: String? = null,
    val upgradeMessage: String? = null
) {
    companion object {
        fun listFrom(result: Any?): List<CodexModelOption> {
            val sources = when (result) {
                is JSONArray -> listOf(result)
                is JSONObject -> listOfNotNull(
                    result.optJSONArray("data"),
                    result.optJSONArray("models")
                )
                else -> emptyList()
            }
            if (sources.isEmpty()) return emptyList()

            val models = buildList {
                sources.forEach { entries ->
                    for (index in 0 until entries.length()) {
                        when (val entry = entries.opt(index)) {
                            is String -> entry.trim().takeIf(String::isNotEmpty)?.let { id ->
                                add(CodexModelOption(id = id, displayName = id))
                            }
                            is JSONObject -> parse(entry)?.let(::add)
                        }
                    }
                }
            }
            return models.distinctBy { it.id }
        }

        private fun parse(json: JSONObject): CodexModelOption? {
            val id = json.optStringOrNull("id")
                ?: json.optStringOrNull("model")
                ?: return null
            val hidden = json.optBoolean("hidden", false)
            val upgradeInfo = json.optJSONObject("upgradeInfo")
            val upgradeModel = upgradeInfo?.optStringOrNull("model")
                ?: json.optStringOrNull("upgrade")
            if (hidden && upgradeModel.isNullOrBlank()) return null
            return CodexModelOption(
                id = id,
                displayName = json.optStringOrNull("displayName") ?: id,
                description = json.optStringOrNull("description"),
                defaultReasoningEffort = json.optStringOrNull("defaultReasoningEffort")
                    ?.lowercase(),
                supportedReasoningEfforts = parseReasoningEfforts(
                    json.optJSONArray("supportedReasoningEfforts")
                ),
                isDefault = json.optBoolean("isDefault", false),
                hidden = hidden,
                upgradeModel = upgradeModel,
                upgradeMessage = upgradeInfo?.optStringOrNull("migrationMarkdown")
                    ?: upgradeInfo?.optStringOrNull("upgradeCopy")
            )
        }

        private fun parseReasoningEfforts(source: JSONArray?): List<String> {
            if (source == null) return emptyList()
            return buildList {
                for (index in 0 until source.length()) {
                    val effort = when (val entry = source.opt(index)) {
                        is String -> entry
                        is JSONObject -> entry.optStringOrNull("reasoningEffort")
                            ?: entry.optStringOrNull("effort")
                        else -> null
                    }
                    effort?.trim()?.lowercase()?.takeIf(String::isNotEmpty)?.let(::add)
                }
            }.distinct()
        }
    }
}

data class CodexEffectiveConfig(
    val model: String?,
    val reasoningEffort: String?,
    val personality: String?,
    val approvalPolicy: String?,
    val sandboxMode: String?,
    val approvalsReviewer: String? = null,
    val permissionProfile: String? = null,
    val useConfigPermissions: Boolean = false
) {
    fun toJson(): JSONObject = JSONObject().apply {
        model?.let { put("model", it) }
        reasoningEffort?.let { put("reasoningEffort", it) }
        personality?.let { put("personality", it) }
        approvalPolicy?.let { put("approvalPolicy", it) }
        sandboxMode?.let { put("sandboxMode", it) }
        approvalsReviewer?.let { put("approvalsReviewer", it) }
        permissionProfile?.let { put("permissionProfile", it) }
        if (useConfigPermissions) put("useConfigPermissions", true)
    }

    companion object {
        fun from(json: JSONObject?): CodexEffectiveConfig? {
            if (json == null) return null
            return CodexEffectiveConfig(
                model = json.optStringOrNull("model"),
                reasoningEffort = json.optStringOrNull("reasoningEffort")?.lowercase(),
                personality = json.optStringOrNull("personality"),
                approvalPolicy = json.optStringOrNull("approvalPolicy"),
                sandboxMode = json.optStringOrNull("sandboxMode"),
                approvalsReviewer = json.optStringOrNull("approvalsReviewer"),
                permissionProfile = json.optStringOrNull("permissionProfile")
                    ?: json.optJSONObject("activePermissionProfile")?.optStringOrNull("id"),
                useConfigPermissions = json.optBoolean("useConfigPermissions", false)
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
    val currentTurnId: String?,
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
                currentTurnId = json.optStringOrNull("currentTurnId"),
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
    val url: String? = null,
    val media: CodexMediaDescriptor? = null
) {
    companion object {
        fun from(json: JSONObject): CodexTurnAttachment {
            val media = json.optJSONObject("media")
                ?: json.optJSONObject("descriptor")
                ?: json.optJSONObject("url")
                    ?.takeIf { it.has("contentHash") || it.has("originalPath") }
                ?: json.takeIf { it.has("contentHash") || it.has("originalPath") }
            return CodexTurnAttachment(
                type = json.optString("type", if (media != null) "image" else "file"),
                path = json.optStringOrNull("path"),
                url = json.optString("url", "").takeIf { it.isNotBlank() && json.opt("url") !is JSONObject },
                media = media?.let(CodexMediaDescriptor::from)
            )
        }
    }

    fun toJson(): JSONObject = JSONObject()
        .put("type", type)
        .apply {
            path?.let { put("path", it) }
            url?.let { put("url", it) }
            media?.let { put("media", it.toJson()) }
        }
}

data class CodexMediaDescriptor(
    val contentHash: String,
    val mimeType: String,
    val byteSize: Long,
    val width: Int? = null,
    val height: Int? = null,
    val originalPath: String? = null,
    val thumbnailHash: String? = null,
    val thumbnailPath: String? = null,
    val thumbnailByteSize: Long? = null,
    val thumbnailUnavailable: Boolean = false
) {
    companion object {
        fun from(json: JSONObject): CodexMediaDescriptor? {
            val hash = json.optString("contentHash", "").trim()
            if (!Regex("^[0-9a-fA-F]{64}$").matches(hash)) return null
            return CodexMediaDescriptor(
                contentHash = hash.lowercase(),
                mimeType = json.optString("mimeType", "image/*"),
                byteSize = json.optLong("byteSize", 0L).coerceAtLeast(0L),
                width = json.optIntOrNull("width"),
                height = json.optIntOrNull("height"),
                originalPath = json.optStringOrNull("originalPath"),
                thumbnailHash = json.optStringOrNull("thumbnailHash"),
                thumbnailPath = json.optStringOrNull("thumbnailPath"),
                thumbnailByteSize = json.optLongOrNull("thumbnailByteSize"),
                thumbnailUnavailable = json.optBoolean("thumbnailUnavailable", false)
            )
        }
    }

    fun toJson(): JSONObject = JSONObject().apply {
        put("kind", "image")
        put("contentHash", contentHash)
        put("mimeType", mimeType)
        put("byteSize", byteSize)
        width?.let { put("width", it) }
        height?.let { put("height", it) }
        originalPath?.let { put("originalPath", it) }
        thumbnailHash?.let { put("thumbnailHash", it) }
        thumbnailPath?.let { put("thumbnailPath", it) }
        thumbnailByteSize?.let { put("thumbnailByteSize", it) }
        if (thumbnailUnavailable) put("thumbnailUnavailable", true)
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

// ── IPC DTOs ────────────────────────────────────────────────────────────

data class CodexIpcStatus(
    val supported: Boolean = false,
    val online: Boolean,
    val activeSendAllowed: Boolean = false,
    val reason: String?,
    val clientId: String?
) {
    companion object {
        fun from(json: JSONObject): CodexIpcStatus {
            val status = json.optJSONObject("status") ?: json
            return CodexIpcStatus(
                supported = status.optBoolean("supported", false),
                online = status.optBoolean("online", false),
                activeSendAllowed = status.optBoolean("activeSendAllowed", false),
                reason = status.optStringOrNull("reason"),
                clientId = status.optStringOrNull("clientId")
            )
        }
    }
}

data class SurfaceEntry(
    val key: String,
    val kind: String,
    val role: String?,
    val phase: String?,
    val text: String?,
    val turnId: String?,
    val itemId: String?,
    val statusType: String?,
    val operationType: String? = null,
    val label: String? = null,
    val detail: String? = null,
    val operationStatus: String? = null,
    val attachments: List<CodexTurnAttachment> = emptyList(),
    val approvalType: String?,
    val requestId: String?,
    val raw: JSONObject?
) {
    companion object {
        fun from(json: JSONObject): SurfaceEntry = SurfaceEntry(
            key = json.optString("key", ""),
            kind = json.optString("kind", "unknown"),
            role = json.optStringOrNull("role"),
            phase = json.optStringOrNull("phase"),
            text = json.optStringOrNull("text"),
            turnId = json.optStringOrNull("turnId"),
            itemId = json.optStringOrNull("itemId"),
            statusType = json.optStringOrNull("statusType"),
            operationType = json.optStringOrNull("operationType"),
            label = json.optStringOrNull("label"),
            detail = json.optStringOrNull("detail"),
            operationStatus = json.optStringOrNull("operationStatus"),
            attachments = json.optJSONArray("attachments")?.let { array ->
                buildList {
                    for (index in 0 until array.length()) {
                        val attachment = array.optJSONObject(index) ?: continue
                        add(CodexTurnAttachment.from(attachment))
                    }
                }
            }.orEmpty(),
            approvalType = json.optStringOrNull("approvalType"),
            requestId = json.optStringOrNull("requestId"),
            raw = json.optJSONObject("raw")
        )
    }
}

data class PendingApprovalInfo(
    val kind: String,
    val requestId: String?,
    val requestKind: String?,
    val responseMode: String?,
    val method: String?,
    val title: String?,
    val description: String?,
    val command: String?,
    val availableDecisions: List<String>,
    val raw: JSONObject?
) {
    companion object {
        fun from(json: JSONObject?): PendingApprovalInfo? {
            if (json == null) return null
            val decisions = json.optJSONArray("availableDecisions")
            return PendingApprovalInfo(
                kind = json.optString("kind", "command"),
                requestId = json.optStringOrNull("requestId"),
                requestKind = json.optStringOrNull("requestKind"),
                responseMode = json.optStringOrNull("responseMode"),
                method = json.optStringOrNull("method"),
                title = json.optStringOrNull("title"),
                description = json.optStringOrNull("description"),
                command = json.optStringOrNull("command"),
                availableDecisions = if (decisions != null) decisions.toStringList() else emptyList(),
                raw = json.optJSONObject("raw")
            )
        }
    }
}

data class PendingPlanActionInfo(
    val kind: String,
    val requestId: String?,
    val requestMethod: String?,
    val questionId: String?,
    val acceptedAnswer: String?,
    val turnId: String?,
    val planContent: String?,
    val canSubmit: Boolean,
    val unavailableReason: String?,
    val raw: JSONObject?
) {
    companion object {
        fun from(json: JSONObject?): PendingPlanActionInfo? {
            if (json == null) return null
            return PendingPlanActionInfo(
                kind = json.optString("kind", "text_input"),
                requestId = json.optStringOrNull("requestId"),
                requestMethod = json.optStringOrNull("requestMethod"),
                questionId = json.optStringOrNull("questionId"),
                acceptedAnswer = json.optStringOrNull("acceptedAnswer"),
                turnId = json.optStringOrNull("turnId"),
                planContent = json.optStringOrNull("planContent"),
                canSubmit = json.optBoolean("canSubmit", false),
                unavailableReason = json.optStringOrNull("unavailableReason"),
                raw = json.optJSONObject("raw")
            )
        }
    }
}

data class PendingGoalActionInfo(
    val kind: String,
    val raw: JSONObject?
) {
    companion object {
        fun from(json: JSONObject?): PendingGoalActionInfo? {
            if (json == null) return null
            return PendingGoalActionInfo(
                kind = json.optString("kind", "text_input"),
                raw = json.optJSONObject("raw")
            )
        }
    }
}

data class ActiveGoalInfo(
    val threadId: String?,
    val objective: String?,
    val status: String?,
    val tokenBudget: Long?,
    val tokensUsed: Long?,
    val timeUsedSeconds: Long?,
    val raw: JSONObject?
) {
    companion object {
        fun from(json: JSONObject?): ActiveGoalInfo? {
            if (json == null) return null
            return ActiveGoalInfo(
                threadId = json.optStringOrNull("threadId"),
                objective = json.optStringOrNull("objective"),
                status = json.optStringOrNull("status"),
                tokenBudget = json.optNullableLong("tokenBudget"),
                tokensUsed = json.optNullableLong("tokensUsed"),
                timeUsedSeconds = json.optNullableLong("timeUsedSeconds"),
                raw = json.optJSONObject("raw")
            )
        }
    }
}

data class DesktopSurfaceSnapshot(
    val conversationId: String?,
    val ownerKind: String?,
    val revision: Int,
    val status: String,
    val updatedAt: Long,
    val title: String?,
    val cwd: String?,
    val latestTurnId: String?,
    val currentCodexConfig: CodexEffectiveConfig? = null,
    val items: List<SurfaceEntry>,
    val pendingApproval: PendingApprovalInfo?,
    val pendingPlanAction: PendingPlanActionInfo?,
    val pendingUserInputAction: CodexServerRequest?,
    val pendingGoalAction: PendingGoalActionInfo?,
    val activeGoal: ActiveGoalInfo?,
    val raw: JSONObject,
    val desynced: Boolean = false,
    val sourceEpoch: String? = null,
    val itemsTruncated: Boolean = false
) {
    companion object {
        fun from(json: JSONObject): DesktopSurfaceSnapshot {
            val snapshot = json.optJSONObject("snapshot") ?: json
            val items = snapshot.optJSONArray("items")
            val itemList = mutableListOf<SurfaceEntry>()
            if (items != null) {
                for (i in 0 until items.length()) {
                    val entry = items.optJSONObject(i) ?: continue
                    itemList.add(SurfaceEntry.from(entry))
                }
            }
            val pendingUserInputJson = snapshot.optJSONObject("pendingUserInputAction")
                ?: snapshot.optJSONObject("pendingUserInput")
            return DesktopSurfaceSnapshot(
                conversationId = json.optStringOrNull("conversationId") ?: snapshot.optStringOrNull("conversationId"),
                ownerKind = snapshot.optStringOrNull("ownerKind"),
                revision = snapshot.optInt("revision", 0),
                status = snapshot.optString("status", "unknown"),
                updatedAt = snapshot.optLong("updatedAt", 0L),
                title = snapshot.optStringOrNull("title"),
                cwd = snapshot.optStringOrNull("cwd"),
                latestTurnId = snapshot.optStringOrNull("latestTurnId"),
                currentCodexConfig = CodexEffectiveConfig.from(snapshot.optJSONObject("currentCodexConfig")),
                items = itemList,
                pendingApproval = PendingApprovalInfo.from(snapshot.optJSONObject("pendingApproval")),
                pendingPlanAction = PendingPlanActionInfo.from(snapshot.optJSONObject("pendingPlanAction")),
                pendingUserInputAction = pendingUserInputJson?.let { CodexServerRequest.from(it) },
                pendingGoalAction = PendingGoalActionInfo.from(snapshot.optJSONObject("pendingGoalAction")),
                activeGoal = ActiveGoalInfo.from(snapshot.optJSONObject("activeGoal")),
                raw = json,
                desynced = snapshot.optBoolean("desynced", false),
                sourceEpoch = snapshot.optStringOrNull("sourceEpoch"),
                itemsTruncated = snapshot.optBoolean("itemsTruncated", false)
            )
        }
    }
}

data class CodexFollowerMode(
    val enabled: Boolean,
    val activeSendAllowed: Boolean
) {
    companion object {
        fun from(json: JSONObject): CodexFollowerMode = CodexFollowerMode(
            enabled = json.optBoolean("enabled", true),
            activeSendAllowed = json.optBoolean("activeSendAllowed", false)
        )
    }
}

data class CodexIpcConversationSummary(
    val conversationId: String,
    val status: String,
    val updatedAt: Long,
    val title: String?,
    val cwd: String?,
    val ownerKind: String?,
    val latestTurnId: String?,
    val itemCount: Int,
    val hasActiveGoal: Boolean,
    val hasPendingApproval: Boolean,
    val hasPendingPlanAction: Boolean,
    val hasPendingUserInputAction: Boolean
) {
    companion object {
        fun listFrom(json: JSONObject): List<CodexIpcConversationSummary> {
            val arr = json.optJSONArray("conversations") ?: return emptyList()
            val result = mutableListOf<CodexIpcConversationSummary>()
            for (i in 0 until arr.length()) {
                val entry = arr.optJSONObject(i) ?: continue
                val conversationId = entry.optStringOrNull("conversationId") ?: continue
                result.add(
                    CodexIpcConversationSummary(
                        conversationId = conversationId,
                        status = entry.optString("status", "unknown"),
                        updatedAt = entry.optLong("updatedAt", 0L),
                        title = entry.optStringOrNull("title"),
                        cwd = entry.optStringOrNull("cwd"),
                        ownerKind = entry.optStringOrNull("ownerKind"),
                        latestTurnId = entry.optStringOrNull("latestTurnId"),
                        itemCount = entry.optInt("itemCount", 0),
                        hasActiveGoal = entry.optBoolean("hasActiveGoal", false),
                        hasPendingApproval = entry.optBoolean("hasPendingApproval", false),
                        hasPendingPlanAction = entry.optBoolean("hasPendingPlanAction", false),
                        hasPendingUserInputAction = entry.optBoolean("hasPendingUserInputAction", false)
                    )
                )
            }
            return result
        }
    }
}

// ── Client → Server builders ──────────────────────────────────────────

object CodexClientMessages {

    fun historySyncRequest(request: CodexHistorySyncRequest): String = request.toJson().toString()

    fun historyTailValidationRequest(request: CodexHistoryTailValidationRequest): String =
        request.toJson().toString()

    fun historyTerminalReconcileRequest(request: CodexHistoryTerminalReconcileRequest): String =
        request.toJson().toString()

    fun historyOlderRequest(
        syncId: String,
        conversationId: String,
        checkpoint: CodexHistorySyncCheckpoint,
        selectionGeneration: Long,
        rangeSegments: CodexHistoryRangeCapability
    ): String = JSONObject().apply {
        put("type", "conversation_history_older_request")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("checkpoint", checkpoint.toJson())
        put("selectionGeneration", selectionGeneration.coerceAtLeast(0L))
        put("cacheSchemaVersion", rangeSegments.cacheSchemaVersion.coerceAtLeast(3))
        put("rangeSegments", JSONObject().apply {
            put("enabled", true)
            put("version", rangeSegments.version)
            put("cacheSchemaVersion", rangeSegments.cacheSchemaVersion)
        })
    }.toString()

    fun historyRecoveryRequest(
        syncId: String,
        conversationId: String,
        selectionGeneration: Long,
        rangeSegments: CodexHistoryRangeCapability? = null
    ): String = JSONObject().apply {
        put("type", "conversation_history_recovery_request")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("selectionGeneration", selectionGeneration.coerceAtLeast(0L))
        val range = rangeSegments?.takeIf { it.isWireEnabled() }
        if (range != null) {
            put("rangeSegments", JSONObject().apply {
                put("enabled", true)
                put("version", range.version)
                put("cacheSchemaVersion", range.cacheSchemaVersion)
            })
        }
    }.toString()

    fun historyManifestPage(
        syncId: String,
        conversationId: String,
        pageIndex: Int,
        lastPage: Boolean,
        items: JSONArray,
        selectionGeneration: Long = 0L,
        purpose: String? = null,
        terminalEpoch: String? = null
    ): String = JSONObject().apply {
        put("type", "conversation_history_manifest_page")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("pageIndex", pageIndex)
        put("lastPage", lastPage)
        put("clientSelectionGeneration", selectionGeneration.coerceAtLeast(0L))
        put("items", items)
        purpose?.trim()?.takeIf { it.isNotEmpty() }?.let { put("purpose", it) }
        terminalEpoch?.trim()?.takeIf { it.isNotEmpty() }?.let { put("terminalEpoch", it) }
    }.toString()

    fun historySyncAck(
        syncId: String,
        conversationId: String,
        targetRoot: String,
        sequence: Int,
        pageIndex: Int = -1,
        selectionGeneration: Long = 0L,
        purpose: String? = null,
        terminalEpoch: String? = null
    ): String = JSONObject().apply {
        put("type", "conversation_history_sync_ack")
        put("syncId", syncId)
        put("conversationId", conversationId)
        put("targetRoot", targetRoot)
        put("sequence", sequence)
        put("pageIndex", pageIndex)
        put("clientSelectionGeneration", selectionGeneration.coerceAtLeast(0L))
        purpose?.trim()?.takeIf { it.isNotEmpty() }?.let { put("purpose", it) }
        terminalEpoch?.trim()?.takeIf { it.isNotEmpty() }?.let { put("terminalEpoch", it) }
    }.toString()

    fun historySegmentAck(
        syncId: String,
        conversationId: String,
        targetRoot: String,
        sequence: Int,
        pageIndex: Int,
        segmentId: String,
        pageHash: String,
        selectionGeneration: Long = 0L
    ): String = JSONObject()
        .put("type", "conversation_history_segment_ack")
        .put("syncId", syncId)
        .put("conversationId", conversationId)
        .put("targetRoot", targetRoot)
        .put("sequence", sequence)
        .put("pageIndex", pageIndex)
        .put("segmentId", segmentId)
        .put("pageHash", pageHash)
        .put("clientSelectionGeneration", selectionGeneration.coerceAtLeast(0L))
        .toString()

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

    fun codexRequest(
        action: String,
        params: JSONObject? = JSONObject(),
        historyMode: String? = null,
        selectionGeneration: Long? = null
    ): String {
        val json = JSONObject()
            .put("type", "codex_request")
            .put("method", action)
            .put("params", params ?: JSONObject())
        historyMode?.trim()?.takeIf { it.isNotEmpty() }?.let { json.put("historyMode", it) }
        selectionGeneration?.let { json.put("selectionGeneration", it.coerceAtLeast(0L)) }
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

    fun codexThreadRecoveryAction(recoveryId: String, action: String): String = JSONObject()
        .put("type", "codex_thread_recovery_action")
        .put("recoveryId", recoveryId)
        .put("action", action)
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

    // ── IPC follower action builders ─────────────────────────────────

    fun setActiveConversation(
        conversationId: String,
        selectionGeneration: Long? = null
    ): String = JSONObject().apply {
        put("type", "set_active_conversation")
        put("conversationId", conversationId)
        selectionGeneration?.let { put("selectionGeneration", it.coerceAtLeast(0L)) }
    }.toString()

    fun setActiveFollowerMode(enabled: Boolean): String = JSONObject()
        .put("type", "set_active_follower_mode")
        .put("enabled", enabled)
        .toString()

    fun followerSendMessage(
        conversationId: String,
        input: String,
        turnConfig: CodexEffectiveConfig? = null,
        clientRequestId: String? = null,
        attachments: List<CodexTurnAttachment>? = null,
        interactionState: CodexInteractionState? = null,
        collaborationMode: JSONObject? = null,
        goalObjective: String? = null
    ): String = JSONObject()
        .put("type", "follower_send_message")
        .put("conversationId", conversationId)
        .put("input", input)
        .apply {
            clientRequestId?.let { put("clientRequestId", it) }
            turnConfig?.let { put("turnConfig", it.toJson()) }
            if (!attachments.isNullOrEmpty()) {
                put(
                    "attachments",
                    JSONArray().apply {
                        attachments.forEach { put(it.toJson()) }
                    }
                )
            }
            interactionState?.let { put("interactionState", it.toJson()) }
            collaborationMode?.let { put("collaborationMode", it) }
            goalObjective?.trim()?.takeIf { it.isNotEmpty() }?.let { put("goalObjective", it) }
        }
        .toString()

    fun followerStartGoal(conversationId: String, goal: String): String = JSONObject()
        .put("type", "follower_start_goal")
        .put("conversationId", conversationId)
        .put("goal", goal)
        .toString()

    fun followerGoalControl(conversationId: String, action: String): String = JSONObject()
        .put("type", "follower_goal_control")
        .put("conversationId", conversationId)
        .put("action", action)
        .toString()

    fun followerInterruptTurn(conversationId: String): String = JSONObject()
        .put("type", "follower_interrupt_turn")
        .put("conversationId", conversationId)
        .toString()

    fun followerApprovalResponse(
        conversationId: String,
        requestId: String,
        decision: String,
        requestKind: String? = null,
        execpolicyAmendment: List<String>? = null
    ): String {
        val json = JSONObject()
            .put("type", "follower_approval_response")
            .put("conversationId", conversationId)
            .put("requestId", requestId)
            .put("decision", decision)
        requestKind?.let { json.put("requestKind", it) }
        execpolicyAmendment
            ?.takeIf { it.isNotEmpty() }
            ?.let { parts ->
                val arr = JSONArray()
                parts.forEach { arr.put(it) }
                json.put("execpolicyAmendment", arr)
            }
        return json.toString()
    }

    fun followerPlanResponse(
        conversationId: String,
        input: String,
        requestId: String? = null,
        questionId: String? = null,
        response: JSONObject? = null
    ): String {
        val json = JSONObject()
            .put("type", "follower_plan_response")
            .put("conversationId", conversationId)
            .put("input", input)
        requestId?.let { json.put("requestId", it) }
        questionId?.let { json.put("questionId", it) }
        response?.let { json.put("response", it) }
        return json.toString()
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

private fun JSONObject.optNullableLong(key: String): Long? =
    if (!has(key) || isNull(key)) {
        null
    } else {
        optLong(key)
    }

private fun JSONArray.toStringList(): List<String> {
    val result = mutableListOf<String>()
    for (i in 0 until length()) {
        val s = optString(i, "")
        if (s.isNotEmpty()) result.add(s)
    }
    return result
}
