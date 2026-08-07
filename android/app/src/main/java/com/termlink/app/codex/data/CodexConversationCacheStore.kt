package com.termlink.app.codex.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import java.nio.ByteBuffer
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

class CodexConversationCacheStore(
    context: Context,
    databaseName: String = "codex_conversations.db"
) : SQLiteOpenHelper(
    context,
    databaseName,
    null,
    3
) {
    private data class MediaBlobCandidate(
        val endpointId: String,
        val contentHash: String,
        val variant: String,
        val localPath: String?
    )

    @Volatile
    private var migrationFailed = false

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE conversations (
                endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, schema_version INTEGER NOT NULL,
                root_hash TEXT, item_count INTEGER NOT NULL DEFAULT 0, complete INTEGER NOT NULL DEFAULT 0,
                last_synced_at INTEGER, last_opened_at INTEGER NOT NULL, payload_bytes INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (endpoint_id, conversation_id)
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE items (
                endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
                turn_id TEXT, position INTEGER NOT NULL, item_type TEXT NOT NULL, role TEXT,
                payload_json TEXT NOT NULL, content_hash TEXT NOT NULL, payload_bytes INTEGER NOT NULL,
                provisional INTEGER NOT NULL DEFAULT 0, client_request_id TEXT, updated_at INTEGER NOT NULL,
                PRIMARY KEY (endpoint_id, conversation_id, item_key)
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX idx_items_conversation_position ON items(endpoint_id, conversation_id, provisional, position)")
        db.execSQL("CREATE INDEX idx_items_client_request ON items(endpoint_id, conversation_id, client_request_id)")
        db.execSQL("""CREATE TABLE thread_index (
            endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
            title TEXT NOT NULL, preview TEXT, archived INTEGER NOT NULL DEFAULT 0,
            cwd TEXT, goal_objective TEXT, created_at INTEGER, last_active_at INTEGER,
            last_seen_at INTEGER, last_remote_refresh_at INTEGER,
            source TEXT NOT NULL DEFAULT 'thread_list',
            PRIMARY KEY (endpoint_id, conversation_id)
        )""".trimIndent())
        db.execSQL("CREATE INDEX idx_thread_index_last_active ON thread_index(endpoint_id, archived, last_active_at DESC, created_at DESC)")
        db.execSQL("""CREATE TABLE sync_sessions (
            sync_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
            sequence INTEGER NOT NULL, base_root TEXT, target_root TEXT NOT NULL, page_count INTEGER NOT NULL,
            baseline_complete INTEGER NOT NULL DEFAULT 0, full_order_included INTEGER NOT NULL DEFAULT 0,
            selection_generation INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
        )""".trimIndent())
        db.execSQL("""CREATE TABLE sync_pages (
            sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
            page_hash TEXT NOT NULL, received_at INTEGER NOT NULL,
            PRIMARY KEY (sync_id, sequence, page_index)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE sync_staging (
            sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
            operation TEXT NOT NULL, item_key TEXT NOT NULL, turn_id TEXT, position INTEGER,
            item_type TEXT, role TEXT, client_request_id TEXT, payload_json TEXT, content_hash TEXT,
            payload_bytes INTEGER, payload_hash TEXT, payload_chunk_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (sync_id, sequence, page_index, operation, item_key)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE sync_order (
            sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, position INTEGER NOT NULL, item_key TEXT NOT NULL,
            PRIMARY KEY (sync_id, sequence, position), UNIQUE(sync_id, sequence, item_key)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE sync_completed_pages (
            sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
            page_hash TEXT NOT NULL, completed_at INTEGER NOT NULL,
            PRIMARY KEY (sync_id, sequence, page_index)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE sync_payload_chunks (
            sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
            item_key TEXT NOT NULL, chunk_index INTEGER NOT NULL, chunk_count INTEGER NOT NULL,
            payload_hash TEXT NOT NULL, payload_bytes INTEGER NOT NULL, payload_data TEXT NOT NULL,
            PRIMARY KEY (sync_id, sequence, page_index, item_key, chunk_index)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE attachments (
            content_hash TEXT PRIMARY KEY, mime_type TEXT, byte_size INTEGER, remote_path TEXT,
            local_path TEXT, last_accessed_at INTEGER NOT NULL, available INTEGER NOT NULL DEFAULT 1
        )""".trimIndent())
        db.execSQL("""CREATE TABLE services (
            endpoint_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, origin TEXT,
            last_seen_at INTEGER NOT NULL, profile_present INTEGER NOT NULL DEFAULT 1
        )""".trimIndent())
        db.execSQL("""CREATE TABLE media_blobs (
            endpoint_id TEXT NOT NULL, content_hash TEXT NOT NULL, variant TEXT NOT NULL,
            mime_type TEXT, byte_size INTEGER NOT NULL DEFAULT 0, local_path TEXT,
            state TEXT NOT NULL DEFAULT 'available', last_accessed_at INTEGER NOT NULL,
            PRIMARY KEY (endpoint_id, content_hash, variant)
        )""".trimIndent())
        db.execSQL("""CREATE TABLE conversation_media_refs (
            endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
            original_hash TEXT, thumbnail_hash TEXT,
            PRIMARY KEY (endpoint_id, conversation_id, item_key)
        )""".trimIndent())
        db.execSQL("CREATE INDEX idx_media_refs_original ON conversation_media_refs(endpoint_id, original_hash)")
        db.execSQL("CREATE INDEX idx_media_refs_thumbnail ON conversation_media_refs(endpoint_id, thumbnail_hash)")
    }

    override fun onOpen(db: SQLiteDatabase) {
        super.onOpen(db)
        try {
            // A few pre-release builds shipped user_version=3 before the
            // media tables were present in onCreate. Keep this repair
            // idempotent and additive so those caches become usable without
            // deleting正文, task metadata, or downloaded files.
            db.execSQL("""CREATE TABLE IF NOT EXISTS services (
                endpoint_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, origin TEXT,
                last_seen_at INTEGER NOT NULL, profile_present INTEGER NOT NULL DEFAULT 1
            )""".trimIndent())
            db.execSQL("""CREATE TABLE IF NOT EXISTS media_blobs (
                endpoint_id TEXT NOT NULL, content_hash TEXT NOT NULL, variant TEXT NOT NULL,
                mime_type TEXT, byte_size INTEGER NOT NULL DEFAULT 0, local_path TEXT,
                state TEXT NOT NULL DEFAULT 'available', last_accessed_at INTEGER NOT NULL,
                PRIMARY KEY (endpoint_id, content_hash, variant)
            )""".trimIndent())
            db.execSQL("""CREATE TABLE IF NOT EXISTS conversation_media_refs (
                endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
                original_hash TEXT, thumbnail_hash TEXT,
                PRIMARY KEY (endpoint_id, conversation_id, item_key)
            )""".trimIndent())
            db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_original ON conversation_media_refs(endpoint_id, original_hash)")
            db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_thumbnail ON conversation_media_refs(endpoint_id, thumbnail_hash)")
        } catch (error: Exception) {
            migrationFailed = true
            Log.e("CodexHistoryCache", "SQLite additive media schema repair failed", error)
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            try {
            // Additive migration: v1 conversations/items and any committed
            // history remain untouched. In-flight sync staging is also kept;
            // a later recovery can finish or explicitly clear only staging.
            db.execSQL("""CREATE TABLE IF NOT EXISTS thread_index (
                endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
                title TEXT NOT NULL, preview TEXT, archived INTEGER NOT NULL DEFAULT 0,
                cwd TEXT, goal_objective TEXT, created_at INTEGER, last_active_at INTEGER,
                last_seen_at INTEGER, last_remote_refresh_at INTEGER,
                source TEXT NOT NULL DEFAULT 'thread_list',
                PRIMARY KEY (endpoint_id, conversation_id)
            )""".trimIndent())
            db.execSQL("CREATE INDEX IF NOT EXISTS idx_thread_index_last_active ON thread_index(endpoint_id, archived, last_active_at DESC, created_at DESC)")
            // Existing v1 databases have durable conversation rows but no task
            // index. Seed the index with a conservative ID title so a cold
            // start/offline list can still expose every cached conversation;
            // the next remote thread/list upsert replaces these placeholders
            // with human metadata. Never infer a title or endpoint from items.
            db.execSQL("""
                INSERT OR IGNORE INTO thread_index(
                    endpoint_id, conversation_id, title, archived, last_seen_at,
                    last_remote_refresh_at, source
                )
                SELECT endpoint_id, conversation_id, conversation_id, 0,
                    COALESCE(last_opened_at, last_synced_at), NULL, 'cache_migration'
                FROM conversations
            """.trimIndent())
            db.execSQL("""CREATE TABLE IF NOT EXISTS sync_payload_chunks (
                sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
                item_key TEXT NOT NULL, chunk_index INTEGER NOT NULL, chunk_count INTEGER NOT NULL,
                payload_hash TEXT NOT NULL, payload_bytes INTEGER NOT NULL, payload_data TEXT NOT NULL,
                PRIMARY KEY (sync_id, sequence, page_index, item_key, chunk_index)
            )""".trimIndent())
                db.execSQL("ALTER TABLE sync_staging ADD COLUMN payload_hash TEXT")
                db.execSQL("ALTER TABLE sync_staging ADD COLUMN payload_chunk_count INTEGER NOT NULL DEFAULT 0")
            db.execSQL("ALTER TABLE sync_sessions ADD COLUMN selection_generation INTEGER NOT NULL DEFAULT 0")
                db.execSQL("""CREATE TABLE IF NOT EXISTS services (
                    endpoint_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, origin TEXT,
                    last_seen_at INTEGER NOT NULL, profile_present INTEGER NOT NULL DEFAULT 1
                )""".trimIndent())
                db.execSQL("""CREATE TABLE IF NOT EXISTS media_blobs (
                    endpoint_id TEXT NOT NULL, content_hash TEXT NOT NULL, variant TEXT NOT NULL,
                    mime_type TEXT, byte_size INTEGER NOT NULL DEFAULT 0, local_path TEXT,
                    state TEXT NOT NULL DEFAULT 'available', last_accessed_at INTEGER NOT NULL,
                    PRIMARY KEY (endpoint_id, content_hash, variant)
                )""".trimIndent())
                db.execSQL("""CREATE TABLE IF NOT EXISTS conversation_media_refs (
                    endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
                    original_hash TEXT, thumbnail_hash TEXT,
                    PRIMARY KEY (endpoint_id, conversation_id, item_key)
                )""".trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_original ON conversation_media_refs(endpoint_id, original_hash)")
                db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_thumbnail ON conversation_media_refs(endpoint_id, thumbnail_hash)")
            } catch (error: Exception) {
                // Keep v1 conversations/items readable; callers below fail
                // closed for v2 writes until the process can retry migration.
                migrationFailed = true
                Log.e("CodexHistoryCache", "SQLite v1→v2 migration failed; preserving v1 read path", error)
            }
        }
        if (oldVersion < 3) {
            try {
                // Media tables were added after the v2 history schema had
                // already shipped. Keep this migration additive for devices
                // that already report user_version=2.
                db.execSQL("""CREATE TABLE IF NOT EXISTS services (
                    endpoint_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, origin TEXT,
                    last_seen_at INTEGER NOT NULL, profile_present INTEGER NOT NULL DEFAULT 1
                )""".trimIndent())
                db.execSQL("""CREATE TABLE IF NOT EXISTS media_blobs (
                    endpoint_id TEXT NOT NULL, content_hash TEXT NOT NULL, variant TEXT NOT NULL,
                    mime_type TEXT, byte_size INTEGER NOT NULL DEFAULT 0, local_path TEXT,
                    state TEXT NOT NULL DEFAULT 'available', last_accessed_at INTEGER NOT NULL,
                    PRIMARY KEY (endpoint_id, content_hash, variant)
                )""".trimIndent())
                db.execSQL("""CREATE TABLE IF NOT EXISTS conversation_media_refs (
                    endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
                    original_hash TEXT, thumbnail_hash TEXT,
                    PRIMARY KEY (endpoint_id, conversation_id, item_key)
                )""".trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_original ON conversation_media_refs(endpoint_id, original_hash)")
                db.execSQL("CREATE INDEX IF NOT EXISTS idx_media_refs_thumbnail ON conversation_media_refs(endpoint_id, thumbnail_hash)")
            } catch (error: Exception) {
                migrationFailed = true
                Log.e("CodexHistoryCache", "SQLite v2→v3 media migration failed; preserving committed history", error)
            }
        }
    }

    /** Read the service-isolated task list without loading正文 or media payloads. */
    fun readThreadIndex(endpointId: String, includeArchived: Boolean = true): List<CodexThreadIndexEntry> {
        if (migrationFailed) return emptyList()
        val result = mutableListOf<CodexThreadIndexEntry>()
        val selection = if (includeArchived) {
            "endpoint_id=?"
        } else {
            "endpoint_id=? AND archived=0"
        }
        readableDatabase.query(
            "thread_index",
            null,
            selection,
            arrayOf(endpointId),
            null,
            null,
            "last_active_at DESC, created_at DESC, conversation_id ASC"
        ).use { cursor ->
            while (cursor.moveToNext()) result += cursor.toThreadIndexEntry()
        }
        return result
    }

    /**
     * Upsert remote task metadata for one service profile. The server list is
     * not assumed complete, so missing rows are deliberately retained.
     */
    fun upsertThreadIndex(
        endpointId: String,
        entries: List<CodexThreadIndexEntry>,
        refreshedAt: Long = System.currentTimeMillis()
    ) {
        if (migrationFailed) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            entries.forEach { entry ->
                require(entry.endpointId == endpointId)
                db.insertWithOnConflict(
                    "thread_index",
                    null,
                    entry.toValues(refreshedAt),
                    SQLiteDatabase.CONFLICT_REPLACE
                )
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun upsertThreadIndexEntry(entry: CodexThreadIndexEntry, refreshedAt: Long = System.currentTimeMillis()) {
        upsertThreadIndex(entry.endpointId, listOf(entry), refreshedAt)
    }

    fun upsertServiceMetadata(
        endpointId: String,
        displayName: String,
        origin: String?,
        profilePresent: Boolean = true,
        seenAt: Long = System.currentTimeMillis()
    ) {
        if (migrationFailed) return
        writableDatabase.insertWithOnConflict("services", null, ContentValues().apply {
            put("endpoint_id", endpointId)
            put("display_name", displayName)
            put("origin", origin)
            put("last_seen_at", seenAt)
            put("profile_present", if (profilePresent) 1 else 0)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun upsertMediaBlob(record: CodexMediaBlobRecord) {
        if (migrationFailed) return
        writableDatabase.insertWithOnConflict("media_blobs", null, ContentValues().apply {
            put("endpoint_id", record.endpointId)
            put("content_hash", record.contentHash)
            put("variant", record.variant.name.lowercase())
            put("mime_type", record.mimeType)
            put("byte_size", record.byteSize)
            put("local_path", record.localPath)
            put("state", record.state)
            put("last_accessed_at", record.lastAccessedAt)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun upsertConversationMediaRef(
        endpointId: String,
        conversationId: String,
        itemKey: String,
        originalHash: String?,
        thumbnailHash: String?
    ) {
        if (migrationFailed) return
        writableDatabase.insertWithOnConflict("conversation_media_refs", null, ContentValues().apply {
            put("endpoint_id", endpointId)
            put("conversation_id", conversationId)
            put("item_key", itemKey)
            put("original_hash", originalHash)
            put("thumbnail_hash", thumbnailHash)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun readStorageUsage(): List<CodexStorageUsage> {
        if (migrationFailed) return emptyList()
        val result = mutableMapOf<String, CodexStorageUsageBuilder>()
        readableDatabase.rawQuery(
            """SELECT s.endpoint_id, COALESCE(s.display_name, s.endpoint_id),
                COALESCE(s.profile_present, 0), COUNT(DISTINCT t.conversation_id),
                COALESCE(SUM(item_usage.body_bytes), 0)
               FROM services s
               LEFT JOIN thread_index t ON t.endpoint_id=s.endpoint_id
               LEFT JOIN (
                   SELECT endpoint_id, conversation_id, SUM(payload_bytes) AS body_bytes
                   FROM items
                   WHERE provisional=0
                   GROUP BY endpoint_id, conversation_id
               ) item_usage ON item_usage.endpoint_id=t.endpoint_id
                   AND item_usage.conversation_id=t.conversation_id
               GROUP BY s.endpoint_id, s.display_name, s.profile_present
            """.trimIndent(), null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                result[cursor.getString(0)] = CodexStorageUsageBuilder(
                    endpointId = cursor.getString(0),
                    serviceName = cursor.getString(1),
                    profilePresent = cursor.getInt(2) != 0,
                    taskCount = cursor.getInt(3),
                    bodyBytes = cursor.getLong(4)
                )
            }
        }
        readableDatabase.rawQuery(
            "SELECT endpoint_id, variant, COALESCE(SUM(byte_size), 0) FROM media_blobs GROUP BY endpoint_id, variant",
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val builder = result.getOrPut(cursor.getString(0)) {
                    CodexStorageUsageBuilder(cursor.getString(0), cursor.getString(0), false, 0, 0L)
                }
                if (cursor.getString(1).equals("thumbnail", ignoreCase = true)) {
                    builder.thumbnailBytes = cursor.getLong(2)
                } else if (cursor.getString(1).equals("original", ignoreCase = true)) {
                    builder.originalBytes = cursor.getLong(2)
                }
            }
        }
        return result.values.map { it.build() }.sortedBy { it.serviceName.lowercase() }
    }

    /** Returns task-scoped body and media bytes without loading the正文 payloads. */
    fun readConversationStorageUsage(endpointId: String, conversationId: String): CodexConversationStorageUsage {
        if (migrationFailed) return CodexConversationStorageUsage(0L, 0L, 0L, 0L)
        val bodyBytes = readableDatabase.rawQuery(
            "SELECT COALESCE(SUM(payload_bytes), 0) FROM items WHERE endpoint_id=? AND conversation_id=? AND provisional=0",
            arrayOf(endpointId, conversationId)
        ).use { cursor ->
            if (cursor.moveToFirst()) cursor.getLong(0) else 0L
        }
        var thumbnailBytes = 0L
        var originalBytes = 0L
        readableDatabase.rawQuery(
            """SELECT media.variant, COALESCE(SUM(media.byte_size), 0)
               FROM media_blobs media
               WHERE media.endpoint_id=? AND EXISTS (
                   SELECT 1 FROM conversation_media_refs refs
                   WHERE refs.endpoint_id=media.endpoint_id
                     AND refs.conversation_id=?
                     AND (refs.original_hash=media.content_hash OR refs.thumbnail_hash=media.content_hash)
               )
               GROUP BY media.variant""".trimIndent(),
            arrayOf(endpointId, conversationId)
        ).use { cursor ->
            while (cursor.moveToNext()) {
                if (cursor.getString(0).equals("thumbnail", ignoreCase = true)) {
                    thumbnailBytes = cursor.getLong(1)
                } else if (cursor.getString(0).equals("original", ignoreCase = true)) {
                    originalBytes = cursor.getLong(1)
                }
            }
        }
        return CodexConversationStorageUsage(
            bodyBytes = bodyBytes,
            thumbnailBytes = thumbnailBytes,
            originalBytes = originalBytes,
            totalBytes = bodyBytes + thumbnailBytes + originalBytes
        )
    }

    /** Deletes local cache only; returns media paths that became unreferenced. */
    fun clearConversationCache(endpointId: String, conversationId: String): List<String> {
        if (migrationFailed) return emptyList()
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("conversation_media_refs", "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId))
            val candidates = readMediaBlobCandidates(db, endpointId)
            val sharedCandidates = readMediaBlobCandidates(
                db,
                contentHashes = candidates.map { it.contentHash }.toSet()
            )
            val paths = deleteUnreferencedMedia(db, (candidates + sharedCandidates).distinct())
            db.delete("items", "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId))
            db.delete("conversations", "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId))
            db.delete("thread_index", "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId))
            clearSyncRows(db, endpointId, conversationId)
            db.setTransactionSuccessful()
            return paths
        } finally {
            db.endTransaction()
        }
    }

    fun clearServiceCache(endpointId: String): List<String> {
        if (migrationFailed) return emptyList()
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("conversation_media_refs", "endpoint_id=?", arrayOf(endpointId))
            val candidates = readMediaBlobCandidates(db, endpointId)
            val sharedCandidates = readMediaBlobCandidates(
                db,
                contentHashes = candidates.map { it.contentHash }.toSet()
            )
            val paths = deleteUnreferencedMedia(db, (candidates + sharedCandidates).distinct())
            db.delete("items", "endpoint_id=?", arrayOf(endpointId))
            db.delete("conversations", "endpoint_id=?", arrayOf(endpointId))
            db.delete("thread_index", "endpoint_id=?", arrayOf(endpointId))
            clearSyncRows(db, endpointId, null)
            db.setTransactionSuccessful()
            return paths
        } finally {
            db.endTransaction()
        }
    }

    private fun readMediaBlobCandidates(
        db: SQLiteDatabase,
        endpointId: String? = null,
        contentHashes: Set<String> = emptySet()
    ): List<MediaBlobCandidate> {
        val result = mutableListOf<MediaBlobCandidate>()
        val selectionParts = mutableListOf<String>()
        val selectionArgs = mutableListOf<String>()
        endpointId?.let {
            selectionParts += "endpoint_id=?"
            selectionArgs += it
        }
        if (contentHashes.isNotEmpty()) {
            selectionParts += "content_hash IN (${contentHashes.joinToString(",") { "?" }})"
            selectionArgs += contentHashes.toList()
        }
        db.query(
            "media_blobs",
            arrayOf("endpoint_id", "content_hash", "variant", "local_path"),
            selectionParts.takeIf { it.isNotEmpty() }?.joinToString(" AND "),
            selectionArgs.toTypedArray().takeIf { it.isNotEmpty() },
            null,
            null,
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                result += MediaBlobCandidate(
                    endpointId = cursor.getString(cursor.getColumnIndexOrThrow("endpoint_id")),
                    contentHash = cursor.getString(cursor.getColumnIndexOrThrow("content_hash")),
                    variant = cursor.getString(cursor.getColumnIndexOrThrow("variant")),
                    localPath = cursor.getStringOrNull("local_path")
                )
            }
        }
        return result
    }

    /**
     * Removes only media rows that have no conversation reference in any service.
     * A file path is returned to the caller only after every media row sharing it
     * has gone, so the Activity cannot delete a file still owned by another
     * endpoint. The legacy attachments table is cleaned only for an unreferenced
     * content hash; it has no endpoint key and is not used as a live authority.
     */
    private fun deleteUnreferencedMedia(
        db: SQLiteDatabase,
        candidates: List<MediaBlobCandidate>
    ): List<String> {
        val paths = mutableSetOf<String>()
        candidates.forEach { candidate ->
            val stillReferenced = db.rawQuery(
                "SELECT COUNT(*) FROM conversation_media_refs WHERE original_hash=? OR thumbnail_hash=?",
                arrayOf(candidate.contentHash, candidate.contentHash)
            ).use { count ->
                count.moveToFirst()
                count.getInt(0) > 0
            }
            if (stillReferenced) return@forEach

            db.delete(
                "media_blobs",
                "endpoint_id=? AND content_hash=? AND variant=?",
                arrayOf(candidate.endpointId, candidate.contentHash, candidate.variant)
            )
            db.delete("attachments", "content_hash=?", arrayOf(candidate.contentHash))

            val localPath = candidate.localPath ?: return@forEach
            val stillStored = db.rawQuery(
                "SELECT COUNT(*) FROM media_blobs WHERE local_path=?",
                arrayOf(localPath)
            ).use { count ->
                count.moveToFirst()
                count.getInt(0) > 0
            }
            if (!stillStored) paths += localPath
        }
        return paths.toList()
    }

    private fun clearSyncRows(db: SQLiteDatabase, endpointId: String, conversationId: String?) {
        val where = if (conversationId == null) "endpoint_id=?" else "endpoint_id=? AND conversation_id=?"
        val args = if (conversationId == null) arrayOf(endpointId) else arrayOf(endpointId, conversationId)
        val syncIds = mutableListOf<String>()
        db.query("sync_sessions", arrayOf("sync_id"), where, args, null, null, null).use { cursor ->
            while (cursor.moveToNext()) syncIds += cursor.getString(0)
        }
        syncIds.forEach { syncId ->
            db.delete("sync_staging", "sync_id=?", arrayOf(syncId))
            db.delete("sync_payload_chunks", "sync_id=?", arrayOf(syncId))
            db.delete("sync_pages", "sync_id=?", arrayOf(syncId))
            db.delete("sync_order", "sync_id=?", arrayOf(syncId))
            db.delete("sync_sessions", "sync_id=?", arrayOf(syncId))
        }
    }

    /**
     * Abort only an in-flight sync for a conversation. Committed items and
     * checkpoints are intentionally untouched; the next sync can restart from
     * the last durable checkpoint.
     */
    fun clearInterruptedSync(endpointId: String, conversationId: String, upToSelectionGeneration: Long = Long.MAX_VALUE) {
        if (migrationFailed) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            val syncIds = mutableListOf<String>()
            db.query(
                "sync_sessions",
                arrayOf("sync_id"),
                "endpoint_id=? AND conversation_id=? AND selection_generation<=?",
                arrayOf(endpointId, conversationId, upToSelectionGeneration.toString()),
                null,
                null,
                null
            ).use { cursor ->
                while (cursor.moveToNext()) syncIds += cursor.getString(0)
            }
            syncIds.forEach { syncId ->
                db.delete("sync_staging", "sync_id=?", arrayOf(syncId))
                db.delete("sync_payload_chunks", "sync_id=?", arrayOf(syncId))
                db.delete("sync_pages", "sync_id=?", arrayOf(syncId))
                db.delete("sync_order", "sync_id=?", arrayOf(syncId))
                db.delete("sync_sessions", "sync_id=?", arrayOf(syncId))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun readConversation(endpointId: String, conversationId: String): CodexHistoryCacheView? {
        val db = readableDatabase
        val checkpoint = db.query(
            "conversations", null, "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId), null, null, null
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            CodexConversationCheckpoint(
                endpointId, conversationId, cursor.getInt(cursor.getColumnIndexOrThrow("schema_version")),
                cursor.getString(cursor.getColumnIndexOrThrow("root_hash")), cursor.getInt(cursor.getColumnIndexOrThrow("item_count")),
                cursor.getInt(cursor.getColumnIndexOrThrow("complete")) != 0,
                cursor.getLongOrNull("last_synced_at"), cursor.getLong(cursor.getColumnIndexOrThrow("last_opened_at"))
            )
        }
        val items = mutableListOf<CodexHistoryItem>()
        db.query("items", null, "endpoint_id=? AND conversation_id=?", arrayOf(endpointId, conversationId), null, null, "position ASC")
            .use { cursor ->
                while (cursor.moveToNext()) items += cursor.toItem()
            }
        return CodexHistoryCacheView(checkpoint, items)
    }

    /**
     * Reads only the stable key/hash pairs needed to answer manifest-required.
     * Payload JSON is deliberately not loaded for this request.
     */
    fun readConversationManifest(endpointId: String, conversationId: String): List<CodexHistoryManifestItem> {
        val result = mutableListOf<CodexHistoryManifestItem>()
        readableDatabase.query(
            "items",
            arrayOf("item_key", "content_hash"),
            "endpoint_id=? AND conversation_id=?",
            arrayOf(endpointId, conversationId),
            null,
            null,
            "position ASC"
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val itemKey = cursor.getStringOrNull("item_key") ?: continue
                val contentHash = cursor.getStringOrNull("content_hash") ?: continue
                result += CodexHistoryManifestItem(itemKey, contentHash)
            }
        }
        return result
    }

    fun upsertProvisional(endpointId: String, conversationId: String, item: CodexHistoryItem) {
        if (migrationFailed) return
        require(item.provisional)
        writableDatabase.insertWithOnConflict("items", null, item.values(endpointId, conversationId), SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun applyDeltaPage(endpointId: String, page: CodexHistoryDeltaPage, now: Long = System.currentTimeMillis()): PageApplyResult {
        if (migrationFailed) return PageApplyResult.REJECTED
        if (CodexHistoryPageHasher.pageHash(page) != page.pageHash) return PageApplyResult.REJECTED
        val db = writableDatabase
        db.beginTransaction()
        try {
            val newerSelectionExists = db.rawQuery(
                "SELECT COUNT(*) FROM sync_sessions WHERE endpoint_id=? AND conversation_id=? AND selection_generation>?",
                arrayOf(endpointId, page.conversationId, page.selectionGeneration.toString())
            ).use { cursor -> cursor.moveToFirst(); cursor.getInt(0) > 0 }
            if (newerSelectionExists) {
                db.setTransactionSuccessful()
                return PageApplyResult.STALE
            }
            val existing = db.query("sync_pages", arrayOf("page_hash"), "sync_id=? AND sequence=? AND page_index=?", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString()), null, null, null)
                .use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
                ?: db.query("sync_completed_pages", arrayOf("page_hash"), "sync_id=? AND sequence=? AND page_index=?", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString()), null, null, null)
                    .use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
            if (existing != null) {
                if (existing != page.pageHash) return PageApplyResult.REJECTED_CONFLICT
                if (page.upserts.any { it.payloadChunkCount > 0 } && !payloadsComplete(db, page)) {
                    db.setTransactionSuccessful()
                    return PageApplyResult.STAGED
                }
                db.setTransactionSuccessful()
                return PageApplyResult.IDEMPOTENT
            }
            db.insertWithOnConflict("sync_sessions", null, page.sessionValues(endpointId, now), SQLiteDatabase.CONFLICT_REPLACE)
            if (page.pageIndex == 0) db.delete("sync_order", "sync_id=?", arrayOf(page.syncId))
            page.upserts.forEach { item ->
                db.insertWithOnConflict("sync_staging", null, item.stagingValues(page), SQLiteDatabase.CONFLICT_REPLACE)
            }
            page.deletes.forEach { key -> db.insertWithOnConflict("sync_staging", null, ContentValues().apply {
                put("sync_id", page.syncId); put("sequence", page.sequence); put("page_index", page.pageIndex); put("operation", "delete"); put("item_key", key)
            }, SQLiteDatabase.CONFLICT_REPLACE) }
            if (page.fullOrderIncluded) page.canonicalOrder.forEachIndexed { position, key -> db.insertWithOnConflict("sync_order", null, ContentValues().apply {
                put("sync_id", page.syncId); put("sequence", page.sequence); put("position", position); put("item_key", key)
            }, SQLiteDatabase.CONFLICT_REPLACE) }
            db.insertOrThrow("sync_pages", null, ContentValues().apply {
                put("sync_id", page.syncId); put("sequence", page.sequence); put("page_index", page.pageIndex); put("page_hash", page.pageHash); put("received_at", now)
            })
            val received = db.rawQuery("SELECT COUNT(*) FROM sync_pages WHERE sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString())).use { it.moveToFirst(); it.getInt(0) }
            val payloadReady = payloadsComplete(db, page)
            if (payloadReady && received == page.pageCount) commitStaging(db, endpointId, page, now)
            db.setTransactionSuccessful()
            return when {
                !payloadReady -> PageApplyResult.STAGED
                received == page.pageCount -> PageApplyResult.COMMITTED
                else -> PageApplyResult.READY
            }
        } finally {
            db.endTransaction()
        }
    }

    /** Store one UTF-8 payload chunk and commit its page once all chunks exist. */
    fun applyPayloadChunk(endpointId: String, chunk: CodexHistoryPayloadChunk, now: Long = System.currentTimeMillis()): PageApplyResult {
        if (migrationFailed) return PageApplyResult.REJECTED
        if (chunk.chunkIndex !in 0 until chunk.chunkCount || chunk.chunkCount <= 0 || chunk.payloadBytes < 0 || chunk.payloadHash.length != 64) {
            return PageApplyResult.REJECTED
        }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val session = db.query(
                "sync_sessions", arrayOf("conversation_id", "target_root", "page_count", "baseline_complete", "selection_generation"),
                "sync_id=? AND sequence=?", arrayOf(chunk.syncId, chunk.sequence.toString()), null, null, null
            ).use { cursor ->
                if (!cursor.moveToFirst()) return PageApplyResult.REJECTED
                arrayOf(
                    cursor.getString(0),
                    cursor.getString(1),
                    cursor.getInt(2),
                    cursor.getInt(3),
                    cursor.getInt(4)
                )
            }
            if (session[0] != chunk.conversationId) return PageApplyResult.REJECTED
            if ((session[4] as Int) > chunk.selectionGeneration) return PageApplyResult.STALE
            val existing = db.query(
                "sync_payload_chunks", arrayOf("payload_hash", "payload_data"),
                "sync_id=? AND sequence=? AND page_index=? AND item_key=? AND chunk_index=?",
                arrayOf(chunk.syncId, chunk.sequence.toString(), chunk.pageIndex.toString(), chunk.itemKey, chunk.chunkIndex.toString()),
                null, null, null
            ).use { cursor -> if (cursor.moveToFirst()) Pair(cursor.getString(0), cursor.getString(1)) else null }
            if (existing != null) {
                if (existing.first != chunk.payloadHash || existing.second != chunk.data) return PageApplyResult.REJECTED_CONFLICT
            } else {
                db.insertOrThrow("sync_payload_chunks", null, ContentValues().apply {
                    put("sync_id", chunk.syncId); put("sequence", chunk.sequence); put("page_index", chunk.pageIndex)
                    put("item_key", chunk.itemKey); put("chunk_index", chunk.chunkIndex); put("chunk_count", chunk.chunkCount)
                    put("payload_hash", chunk.payloadHash); put("payload_bytes", chunk.payloadBytes); put("payload_data", chunk.data)
                })
            }
            val page = readStagedPage(db, chunk, session[1] as String, session[2] as Int, session[3] as Int)
            if (page != null && payloadsComplete(db, page)) {
                materializePayloadChunks(db, page)
                val received = db.rawQuery(
                    "SELECT COUNT(*) FROM sync_pages WHERE sync_id=? AND sequence=?",
                    arrayOf(chunk.syncId, chunk.sequence.toString())
                ).use { cursor -> cursor.moveToFirst(); cursor.getInt(0) }
                if (received == page.pageCount) commitStaging(db, endpointId, page, now)
                db.setTransactionSuccessful()
                return if (received == page.pageCount) PageApplyResult.COMMITTED else PageApplyResult.READY
            }
            db.setTransactionSuccessful()
            return PageApplyResult.STAGED
        } finally {
            db.endTransaction()
        }
    }

    enum class PageApplyResult { STAGED, READY, COMMITTED, IDEMPOTENT, STALE, REJECTED, REJECTED_CONFLICT }

    private fun readStagedPage(db: SQLiteDatabase, chunk: CodexHistoryPayloadChunk, targetRoot: String, pageCount: Int, baselineComplete: Int): CodexHistoryDeltaPage? {
        val pageHash = db.query(
            "sync_pages", arrayOf("page_hash"), "sync_id=? AND sequence=? AND page_index=?",
            arrayOf(chunk.syncId, chunk.sequence.toString(), chunk.pageIndex.toString()), null, null, null
        ).use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else return null }
        val upserts = mutableListOf<CodexHistoryItem>()
        val deletes = mutableListOf<String>()
        db.query("sync_staging", null, "sync_id=? AND sequence=? AND page_index=?", arrayOf(chunk.syncId, chunk.sequence.toString(), chunk.pageIndex.toString()), null, null, null)
            .use { cursor ->
                while (cursor.moveToNext()) {
                    if (cursor.getString(cursor.getColumnIndexOrThrow("operation")) == "delete") {
                        deletes += cursor.getString(cursor.getColumnIndexOrThrow("item_key"))
                    } else {
                        upserts += cursor.toStagedItem()
                    }
                }
            }
        return CodexHistoryDeltaPage(
            syncId = chunk.syncId, conversationId = chunk.conversationId, sequence = chunk.sequence,
            pageIndex = chunk.pageIndex, pageCount = pageCount, pageHash = pageHash,
            baseRoot = null, targetRoot = targetRoot, baselineComplete = baselineComplete != 0,
            fullOrderIncluded = false, upserts = upserts, deletes = deletes
        )
    }

    private fun payloadsComplete(db: SQLiteDatabase, page: CodexHistoryDeltaPage): Boolean {
        val pending = db.rawQuery(
            "SELECT item_key, payload_hash, payload_bytes, payload_chunk_count FROM sync_staging WHERE sync_id=? AND sequence=? AND page_index=? AND operation='upsert' AND payload_chunk_count>0",
            arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString())
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val itemKey = cursor.getString(0)
                val expectedHash = if (cursor.isNull(1)) return@use true else cursor.getString(1)
                val expectedBytes = cursor.getInt(2)
                val expectedCount = cursor.getInt(3)
                val count = db.rawQuery(
                    "SELECT COUNT(*) FROM sync_payload_chunks WHERE sync_id=? AND sequence=? AND page_index=? AND item_key=? AND payload_hash=? AND chunk_count=?",
                    arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString(), itemKey, expectedHash, expectedCount.toString())
                ).use { countCursor -> countCursor.moveToFirst(); countCursor.getInt(0) }
                if (count != expectedCount) return@use true
                val bytes = db.rawQuery(
                    "SELECT COALESCE(SUM(LENGTH(CAST(payload_data AS BLOB))), 0) FROM sync_payload_chunks WHERE sync_id=? AND sequence=? AND page_index=? AND item_key=?",
                    arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString(), itemKey)
                ).use { bytesCursor -> bytesCursor.moveToFirst(); bytesCursor.getLong(0) }
                if (bytes != expectedBytes.toLong()) return@use true
            }
            false
        }
        return !pending
    }

    private fun materializePayloadChunks(db: SQLiteDatabase, page: CodexHistoryDeltaPage) {
        db.query("sync_staging", null, "sync_id=? AND sequence=? AND page_index=? AND operation='upsert' AND payload_chunk_count>0", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString()), null, null, null)
            .use { cursor ->
                while (cursor.moveToNext()) {
                    val itemKey = cursor.getString(cursor.getColumnIndexOrThrow("item_key"))
                    val expectedHash = cursor.getString(cursor.getColumnIndexOrThrow("payload_hash"))
                    val payload = buildString {
                        db.query("sync_payload_chunks", arrayOf("payload_data"), "sync_id=? AND sequence=? AND page_index=? AND item_key=?", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString(), itemKey), null, null, "chunk_index ASC").use { chunks ->
                            while (chunks.moveToNext()) append(chunks.getString(0))
                        }
                    }
                    val bytes = payload.toByteArray(Charsets.UTF_8)
                    if (bytes.size != cursor.getInt(cursor.getColumnIndexOrThrow("payload_bytes")) || sha256(bytes) != expectedHash) {
                        throw IllegalStateException("history payload chunk hash mismatch")
                    }
                    db.execSQL("UPDATE sync_staging SET payload_json=?, payload_bytes=? WHERE sync_id=? AND sequence=? AND page_index=? AND operation='upsert' AND item_key=?", arrayOf(payload, bytes.size, page.syncId, page.sequence, page.pageIndex, itemKey))
                }
            }
    }

    private fun commitStaging(db: SQLiteDatabase, endpointId: String, page: CodexHistoryDeltaPage, now: Long) {
        db.query("sync_staging", null, "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()), null, null, null).use { cursor ->
            while (cursor.moveToNext()) {
                val operation = cursor.getString(cursor.getColumnIndexOrThrow("operation"))
                val key = cursor.getString(cursor.getColumnIndexOrThrow("item_key"))
                if (operation == "delete") {
                    db.delete("items", "endpoint_id=? AND conversation_id=? AND item_key=? AND provisional=0", arrayOf(endpointId, page.conversationId, key))
                } else {
                    db.insertWithOnConflict("items", null, cursor.toStagedItemValues(endpointId, page.conversationId, now), SQLiteDatabase.CONFLICT_REPLACE)
                }
            }
        }
        if (page.fullOrderIncluded) db.query("sync_order", null, "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()), null, null, "position ASC").use { cursor ->
            while (cursor.moveToNext()) {
                val position = cursor.getInt(cursor.getColumnIndexOrThrow("position"))
                val key = cursor.getString(cursor.getColumnIndexOrThrow("item_key"))
                db.execSQL("UPDATE items SET position=? WHERE endpoint_id=? AND conversation_id=? AND item_key=?", arrayOf(position, endpointId, page.conversationId, key))
            }
        }
        db.execSQL(
            "INSERT OR REPLACE INTO sync_completed_pages(sync_id, sequence, page_index, page_hash, completed_at) SELECT sync_id, sequence, page_index, page_hash, ? FROM sync_pages WHERE sync_id=? AND sequence=?",
            arrayOf(now, page.syncId, page.sequence)
        )
        val count = db.rawQuery("SELECT COUNT(*) FROM items WHERE endpoint_id=? AND conversation_id=? AND provisional=0", arrayOf(endpointId, page.conversationId)).use { it.moveToFirst(); it.getInt(0) }
        db.insertWithOnConflict("conversations", null, page.checkpointValues(endpointId, count, now), SQLiteDatabase.CONFLICT_REPLACE)
        db.delete("sync_staging", "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()))
        db.delete("sync_payload_chunks", "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()))
        db.delete("sync_pages", "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()))
        db.delete("sync_order", "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()))
        db.delete("sync_sessions", "sync_id=?", arrayOf(page.syncId))
    }

}

object CodexHistoryPageHasher {
    fun pageHash(page: CodexHistoryDeltaPage): String {
        return sha256(pageHashPayload(page))
    }

    internal fun pageHashPayload(page: CodexHistoryDeltaPage): String {
        val json = JSONObject().apply {
            put("syncId", page.syncId); put("sequence", page.sequence); put("pageIndex", page.pageIndex); put("pageCount", page.pageCount)
            put("baseRoot", page.baseRoot ?: JSONObject.NULL); put("targetRoot", page.targetRoot); put("baselineComplete", page.baselineComplete); put("fullOrderIncluded", page.fullOrderIncluded)
            put("upserts", JSONArray(page.upserts.map { JSONObject().apply {
                put("itemKey", it.itemKey); put("turnId", it.turnId ?: JSONObject.NULL); put("position", it.position)
                put("itemType", it.itemType); put("role", it.role ?: JSONObject.NULL); put("clientRequestId", it.clientRequestId ?: JSONObject.NULL)
                put("payloadJson", it.payloadJson); put("contentHash", it.contentHash)
                if (it.payloadChunkCount > 0) {
                    put("payloadHash", it.payloadHash ?: JSONObject.NULL)
                    put("payloadBytes", it.payloadBytes ?: JSONObject.NULL)
                    put("payloadChunkCount", it.payloadChunkCount)
                }
            } }))
            put("deletes", JSONArray(page.deletes)); put("canonicalOrder", JSONArray(page.canonicalOrder))
        }
        return canonicalJson(json)
    }
}

private fun canonicalJson(value: Any?): String = when (value) {
    is JSONObject -> value.keys().asSequence().filter { !value.isNull(it) || value.get(it) === JSONObject.NULL }.sorted().joinToString(separator = ",", prefix = "{", postfix = "}") { quoteJsonString(it) + ":" + canonicalJson(value.opt(it)) }
    is JSONArray -> (0 until value.length()).joinToString(separator = ",", prefix = "[", postfix = "]") { canonicalJson(value.opt(it)) }
    JSONObject.NULL -> "null"
    is String -> quoteJsonString(value)
    is Boolean, is Number -> value.toString()
    null -> "null"
    else -> quoteJsonString(value.toString())
}

/** Match the gateway's JSON.stringify string escaping. Android's
 * JSONObject.quote escapes '/', while JSON.stringify does not; using it here
 * made every history page containing URLs fail its integrity check. */
private fun quoteJsonString(value: String): String {
    val result = StringBuilder(value.length + 2).append('"')
    var index = 0
    while (index < value.length) {
        val character = value[index]
        when (character) {
            '"' -> result.append("\\\"")
            '\\' -> result.append("\\\\")
            '\b' -> result.append("\\b")
            '\u000C' -> result.append("\\f")
            '\n' -> result.append("\\n")
            '\r' -> result.append("\\r")
            '\t' -> result.append("\\t")
            in '\u0000'..'\u001F' -> result.append("\\u").append(character.code.toString(16).padStart(4, '0'))
            else -> {
                if (character.isHighSurrogate() && (index + 1 >= value.length || !value[index + 1].isLowSurrogate())) {
                    result.append("\\u").append(character.code.toString(16).padStart(4, '0'))
                } else if (character.isLowSurrogate() && (index == 0 || !value[index - 1].isHighSurrogate())) {
                    result.append("\\u").append(character.code.toString(16).padStart(4, '0'))
                } else {
                    result.append(character)
                }
            }
        }
        index += 1
    }
    return result.append('"').toString()
}

private fun sha256(text: String): String = sha256(text.toByteArray(Charsets.UTF_8))
private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
private fun CodexHistoryDeltaPage.sessionValues(endpointId: String, now: Long) = ContentValues().apply { put("sync_id", syncId); put("endpoint_id", endpointId); put("conversation_id", conversationId); put("sequence", sequence); put("base_root", baseRoot); put("target_root", targetRoot); put("page_count", pageCount); put("baseline_complete", if (baselineComplete) 1 else 0); put("full_order_included", if (fullOrderIncluded) 1 else 0); put("selection_generation", selectionGeneration); put("created_at", now); put("expires_at", now + 30_000) }
private fun CodexHistoryDeltaPage.checkpointValues(endpointId: String, count: Int, now: Long) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("schema_version", 2); put("root_hash", targetRoot); put("item_count", count); put("complete", if (baselineComplete) 1 else 0); put("last_synced_at", now); put("last_opened_at", now) }
private fun CodexHistoryItem.values(endpointId: String, conversationId: String) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("item_key", itemKey); put("turn_id", turnId); put("position", position); put("item_type", itemType); put("role", role); put("payload_json", payloadJson); put("content_hash", contentHash); put("payload_bytes", payloadJson.toByteArray().size); put("provisional", if (provisional) 1 else 0); put("client_request_id", clientRequestId); put("updated_at", System.currentTimeMillis()) }
private fun CodexHistoryItem.stagingValues(page: CodexHistoryDeltaPage) = ContentValues().apply {
    put("sync_id", page.syncId); put("sequence", page.sequence); put("page_index", page.pageIndex); put("operation", "upsert")
    put("item_key", itemKey); put("turn_id", turnId); put("position", position); put("item_type", itemType); put("role", role)
    put("client_request_id", clientRequestId); put("payload_json", payloadJson); put("content_hash", contentHash)
    put("payload_bytes", payloadBytes ?: payloadJson.toByteArray().size); put("payload_hash", payloadHash)
    put("payload_chunk_count", payloadChunkCount)
}
private fun CodexThreadIndexEntry.toValues(refreshedAt: Long) = ContentValues().apply {
    put("endpoint_id", endpointId)
    put("conversation_id", conversationId)
    put("title", title)
    put("preview", preview)
    put("archived", if (archived) 1 else 0)
    put("cwd", cwd)
    put("goal_objective", goalObjective)
    put("created_at", createdAt)
    put("last_active_at", lastActiveAt)
    put("last_seen_at", lastSeenAt ?: refreshedAt)
    put("last_remote_refresh_at", lastRemoteRefreshAt ?: refreshedAt)
    put("source", source)
}
private fun android.database.Cursor.toThreadIndexEntry() = CodexThreadIndexEntry(
    endpointId = getString(getColumnIndexOrThrow("endpoint_id")),
    conversationId = getString(getColumnIndexOrThrow("conversation_id")),
    title = getString(getColumnIndexOrThrow("title")),
    preview = getStringOrNull("preview"),
    archived = getInt(getColumnIndexOrThrow("archived")) != 0,
    cwd = getStringOrNull("cwd"),
    goalObjective = getStringOrNull("goal_objective"),
    createdAt = getLongOrNull("created_at"),
    lastActiveAt = getLongOrNull("last_active_at"),
    lastSeenAt = getLongOrNull("last_seen_at"),
    lastRemoteRefreshAt = getLongOrNull("last_remote_refresh_at"),
    source = getString(getColumnIndexOrThrow("source"))
)
private fun android.database.Cursor.toItem() = CodexHistoryItem(getString(getColumnIndexOrThrow("item_key")), getStringOrNull("turn_id"), getInt(getColumnIndexOrThrow("position")), getString(getColumnIndexOrThrow("item_type")), getStringOrNull("role"), getStringOrNull("client_request_id"), getString(getColumnIndexOrThrow("payload_json")), getString(getColumnIndexOrThrow("content_hash")), getInt(getColumnIndexOrThrow("provisional")) != 0)
private fun android.database.Cursor.toItemValues(endpointId: String, conversationId: String, now: Long) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("item_key", getString(getColumnIndexOrThrow("item_key"))); put("turn_id", getStringOrNull("turn_id")); put("position", getInt(getColumnIndexOrThrow("position"))); put("item_type", getString(getColumnIndexOrThrow("item_type"))); put("role", getStringOrNull("role")); put("payload_json", getString(getColumnIndexOrThrow("payload_json"))); put("content_hash", getString(getColumnIndexOrThrow("content_hash"))); put("payload_bytes", getInt(getColumnIndexOrThrow("payload_bytes"))); put("provisional", 0); put("client_request_id", getStringOrNull("client_request_id")); put("updated_at", now) }
private fun android.database.Cursor.toStagedItem() = CodexHistoryItem(
    itemKey = getString(getColumnIndexOrThrow("item_key")),
    turnId = getStringOrNull("turn_id"),
    position = getInt(getColumnIndexOrThrow("position")),
    itemType = getString(getColumnIndexOrThrow("item_type")),
    role = getStringOrNull("role"),
    clientRequestId = getStringOrNull("client_request_id"),
    payloadJson = getStringOrNull("payload_json") ?: "",
    contentHash = getString(getColumnIndexOrThrow("content_hash")),
    payloadHash = getStringOrNull("payload_hash"),
    payloadBytes = getIntOrNull("payload_bytes"),
    payloadChunkCount = getIntOrDefault("payload_chunk_count", 0)
)
private fun android.database.Cursor.toStagedItemValues(endpointId: String, conversationId: String, now: Long) = ContentValues().apply {
    put("endpoint_id", endpointId); put("conversation_id", conversationId); put("item_key", getString(getColumnIndexOrThrow("item_key")))
    put("turn_id", getStringOrNull("turn_id")); put("position", getInt(getColumnIndexOrThrow("position"))); put("item_type", getString(getColumnIndexOrThrow("item_type")))
    put("role", getStringOrNull("role")); put("payload_json", getStringOrNull("payload_json") ?: ""); put("content_hash", getString(getColumnIndexOrThrow("content_hash")))
    put("payload_bytes", getIntOrDefault("payload_bytes", 0)); put("provisional", 0); put("client_request_id", getStringOrNull("client_request_id")); put("updated_at", now)
}
private fun android.database.Cursor.getStringOrNull(column: String): String? = if (isNull(getColumnIndexOrThrow(column))) null else getString(getColumnIndexOrThrow(column))
private fun android.database.Cursor.getLongOrNull(column: String): Long? = if (isNull(getColumnIndexOrThrow(column))) null else getLong(getColumnIndexOrThrow(column))
private fun android.database.Cursor.getIntOrNull(column: String): Int? = if (isNull(getColumnIndexOrThrow(column))) null else getInt(getColumnIndexOrThrow(column))
private fun android.database.Cursor.getIntOrDefault(column: String, fallback: Int): Int = if (getColumnIndex(column) < 0 || isNull(getColumnIndex(column))) fallback else getInt(getColumnIndex(column))

private class CodexStorageUsageBuilder(
    val endpointId: String,
    val serviceName: String,
    val profilePresent: Boolean,
    val taskCount: Int,
    val bodyBytes: Long,
    var thumbnailBytes: Long = 0L,
    var originalBytes: Long = 0L
) {
    fun build() = CodexStorageUsage(
        endpointId = endpointId,
        serviceName = serviceName,
        taskCount = taskCount,
        bodyBytes = bodyBytes,
        thumbnailBytes = thumbnailBytes,
        originalBytes = originalBytes,
        totalBytes = bodyBytes + thumbnailBytes + originalBytes,
        profilePresent = profilePresent
    )
}
