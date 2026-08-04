package com.termlink.app.codex.data

enum class CodexHistorySyncState {
    CACHE_ONLY, LOADING_BASELINE, REPAIRING, PARTIAL, LIVE, OFFLINE, FAILED
}

enum class CodexMediaVariant {
    THUMBNAIL,
    ORIGINAL
}

data class CodexMediaBlobRecord(
    val endpointId: String,
    val contentHash: String,
    val variant: CodexMediaVariant,
    val mimeType: String?,
    val byteSize: Long,
    val localPath: String?,
    val state: String,
    val lastAccessedAt: Long
)

data class CodexStorageUsage(
    val endpointId: String,
    val serviceName: String,
    val taskCount: Int,
    val bodyBytes: Long,
    val thumbnailBytes: Long,
    val originalBytes: Long,
    val totalBytes: Long,
    val profilePresent: Boolean = true
)

data class CodexConversationStorageUsage(
    val bodyBytes: Long,
    val thumbnailBytes: Long,
    val originalBytes: Long,
    val totalBytes: Long
)

data class CodexHistoryItem(
    val itemKey: String,
    val turnId: String?,
    val position: Int,
    val itemType: String,
    val role: String?,
    val clientRequestId: String?,
    val payloadJson: String,
    val contentHash: String,
    val provisional: Boolean = false,
    val payloadHash: String? = null,
    val payloadBytes: Int? = null,
    val payloadChunkCount: Int = 0
)

data class CodexConversationCheckpoint(
    val endpointId: String,
    val conversationId: String,
    val schemaVersion: Int = 2,
    val rootHash: String? = null,
    val itemCount: Int = 0,
    val complete: Boolean = false,
    val lastSyncedAt: Long? = null,
    val lastOpenedAt: Long = System.currentTimeMillis()
)

data class CodexHistoryManifestItem(val itemKey: String, val contentHash: String)

/**
 * Service-scoped, lightweight task history metadata. It intentionally does
 * not contain正文 or attachment payloads so the history sheet can open from
 * cache without loading the full conversation table.
 */
data class CodexThreadIndexEntry(
    val endpointId: String,
    val conversationId: String,
    val title: String,
    val preview: String? = null,
    val archived: Boolean = false,
    val cwd: String? = null,
    val goalObjective: String? = null,
    val createdAt: Long? = null,
    val lastActiveAt: Long? = null,
    val lastSeenAt: Long? = null,
    val lastRemoteRefreshAt: Long? = null,
    val source: String = "thread_list"
)

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
    val deletes: List<String> = emptyList(),
    /** Client-side selection token used to reject A→B→A stale pages. */
    val selectionGeneration: Long = 0L
)

data class CodexHistoryPayloadChunk(
    val syncId: String,
    val conversationId: String,
    val sequence: Int,
    val pageIndex: Int,
    val targetRoot: String,
    val baselineComplete: Boolean,
    val itemKey: String,
    val chunkIndex: Int,
    val chunkCount: Int,
    val payloadHash: String,
    val payloadBytes: Int,
    val data: String,
    val selectionGeneration: Long = 0L
)

data class CodexHistoryCacheView(
    val checkpoint: CodexConversationCheckpoint,
    val items: List<CodexHistoryItem>,
    val syncState: CodexHistorySyncState = CodexHistorySyncState.CACHE_ONLY
)
