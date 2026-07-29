package com.termlink.app.codex.data

enum class CodexHistorySyncState {
    CACHE_ONLY, LOADING_BASELINE, REPAIRING, PARTIAL, LIVE, OFFLINE, FAILED
}

data class CodexHistoryItem(
    val itemKey: String,
    val turnId: String?,
    val position: Int,
    val itemType: String,
    val role: String?,
    val clientRequestId: String?,
    val payloadJson: String,
    val contentHash: String,
    val provisional: Boolean = false
)

data class CodexConversationCheckpoint(
    val endpointId: String,
    val conversationId: String,
    val schemaVersion: Int = 1,
    val rootHash: String? = null,
    val itemCount: Int = 0,
    val complete: Boolean = false,
    val lastSyncedAt: Long? = null,
    val lastOpenedAt: Long = System.currentTimeMillis()
)

data class CodexHistoryManifestItem(val itemKey: String, val contentHash: String)

data class CodexHistoryDeltaPage(
    val syncId: String,
    val conversationId: String,
    val sequence: Int,
    val pageIndex: Int,
    val pageCount: Int,
    val pageHash: String,
    val baseRoot: String?,
    val targetRoot: String,
    val baselineComplete: Boolean,
    val fullOrderIncluded: Boolean,
    val canonicalOrder: List<String> = emptyList(),
    val upserts: List<CodexHistoryItem> = emptyList(),
    val deletes: List<String> = emptyList()
)

data class CodexHistoryCacheView(
    val checkpoint: CodexConversationCheckpoint,
    val items: List<CodexHistoryItem>,
    val syncState: CodexHistorySyncState = CodexHistorySyncState.CACHE_ONLY
)
