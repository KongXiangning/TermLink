package com.termlink.app.codex.data

enum class CodexHistorySyncState {
    CACHE_ONLY, LOADING_BASELINE, REPAIRING, PARTIAL, LIVE, OFFLINE, FAILED
}

/**
 * Durable coverage state for the additive range cache.
 *
 * `LEGACY_UNKNOWN` is deliberately different from `PARTIAL`: a migrated v3
 * cache has no cursor/anchor provenance, so it must not be treated as a
 * partially verified range either. Both states are non-authoritative and
 * keep the old v2 cache path available.
 */
enum class CodexHistoryCoverageState(val storageValue: String) {
    LEGACY_UNKNOWN("legacy_unknown"),
    PARTIAL("partial"),
    COMPLETE("complete");

    companion object {
        fun fromStorage(value: String?): CodexHistoryCoverageState =
            entries.firstOrNull { it.storageValue == value } ?: LEGACY_UNKNOWN
    }
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
    /** v2 is the old global-position format; v3 is the additive range format. */
    val schemaVersion: Int = CodexHistoryCacheSchema.LEGACY_CHECKPOINT_SCHEMA_VERSION,
    val rootHash: String? = null,
    val itemCount: Int = 0,
    val complete: Boolean = false,
    val lastSyncedAt: Long? = null,
    val lastOpenedAt: Long = System.currentTimeMillis(),
    val rootSchemaVersion: Int = CodexHistoryCacheSchema.LEGACY_ROOT_SCHEMA_VERSION,
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
    /** Null means the old cache did not prove whether an older page exists. */
    val hasMoreBefore: Boolean? = null,
    val coverageComplete: Boolean = false,
    val coverageState: CodexHistoryCoverageState = CodexHistoryCoverageState.LEGACY_UNKNOWN,
    val committedAt: Long? = null
)

data class CodexHistorySegment(
    val endpointId: String,
    val conversationId: String,
    val segmentId: String,
    val segmentRank: Long,
    val direction: String,
    val firstItemKey: String? = null,
    val firstItemHash: String? = null,
    val lastItemKey: String? = null,
    val lastItemHash: String? = null,
    val segmentRoot: String? = null,
    val itemCount: Int = 0,
    val nextOlderCursor: String? = null,
    val state: String = "committed",
    val committedAt: Long? = null
)

/** Constants shared by the dormant v4 storage layer and future range wire. */
object CodexHistoryCacheSchema {
    const val DATABASE_VERSION = 4
    const val CHECKPOINT_SCHEMA_VERSION = 3
    const val LEGACY_CHECKPOINT_SCHEMA_VERSION = 2
    const val LEGACY_ROOT_SCHEMA_VERSION = 1
    const val RANGE_ROOT_SCHEMA_VERSION = 2
    const val RANGE_SEGMENT_VERSION = 1
    const val RANGE_SEGMENTS_ENABLED_BY_DEFAULT = false
    const val LEGACY_UNKNOWN_COVERAGE = "legacy_unknown"
    const val PARTIAL_COVERAGE = "partial"
    const val COMPLETE_COVERAGE = "complete"

    /**
     * Keeps the old position projection valid while segment ordering is
     * enabled later. No current reader uses this helper yet; B.2/B.3 will use
     * it when committing a range page.
     */
    object CompatiblePosition {
        fun prepend(currentMin: Int?, itemCount: Int): List<Int> {
            require(itemCount >= 0) { "itemCount must be non-negative" }
            if (itemCount == 0) return emptyList()
            if (currentMin == null) return (0 until itemCount).toList()
            val start = currentMin.toLong() - itemCount.toLong()
            require(start >= Int.MIN_VALUE.toLong()) { "position underflow" }
            return (0 until itemCount).map { (start + it).toInt() }
        }

        fun append(currentMax: Int?, itemCount: Int): List<Int> {
            require(itemCount >= 0) { "itemCount must be non-negative" }
            if (itemCount == 0) return emptyList()
            val start = (currentMax?.toLong() ?: -1L) + 1L
            require(start + itemCount - 1L <= Int.MAX_VALUE.toLong()) { "position overflow" }
            return (0 until itemCount).map { (start + it).toInt() }
        }
    }

    object SegmentRank {
        fun prepend(currentMin: Long?): Long {
            val baseline = currentMin ?: 0L
            require(baseline > Long.MIN_VALUE) { "segment rank underflow" }
            return baseline - 1L
        }

        fun append(currentMax: Long?): Long {
            val baseline = currentMax ?: -1L
            require(baseline < Long.MAX_VALUE) { "segment rank overflow" }
            return baseline + 1L
        }
    }
}

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
    val range: CodexHistoryRangeMetadata? = null,
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
