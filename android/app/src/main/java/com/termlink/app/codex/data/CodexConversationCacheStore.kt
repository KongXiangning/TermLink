package com.termlink.app.codex.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.nio.ByteBuffer
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

class CodexConversationCacheStore(context: Context) : SQLiteOpenHelper(
    context,
    "codex_conversations.db",
    null,
    1
) {
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
        db.execSQL("""CREATE TABLE sync_sessions (
            sync_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
            sequence INTEGER NOT NULL, base_root TEXT, target_root TEXT NOT NULL, page_count INTEGER NOT NULL,
            baseline_complete INTEGER NOT NULL DEFAULT 0, full_order_included INTEGER NOT NULL DEFAULT 0,
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
            payload_bytes INTEGER, PRIMARY KEY (sync_id, sequence, page_index, operation, item_key)
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
        db.execSQL("""CREATE TABLE attachments (
            content_hash TEXT PRIMARY KEY, mime_type TEXT, byte_size INTEGER, remote_path TEXT,
            local_path TEXT, last_accessed_at INTEGER NOT NULL, available INTEGER NOT NULL DEFAULT 1
        )""".trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Version 1 is the initial schema. Future migrations must preserve drafts.
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

    /** Read the newest cached copy by task ID when a profile was re-added. */
    fun readConversationByConversationId(conversationId: String): CodexHistoryCacheView? {
        val db = readableDatabase
        val checkpoint = db.query(
            "conversations", null, "conversation_id=?", arrayOf(conversationId), null, null,
            "last_opened_at DESC", "1"
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            CodexConversationCheckpoint(
                cursor.getString(cursor.getColumnIndexOrThrow("endpoint_id")),
                cursor.getString(cursor.getColumnIndexOrThrow("conversation_id")),
                cursor.getInt(cursor.getColumnIndexOrThrow("schema_version")),
                cursor.getString(cursor.getColumnIndexOrThrow("root_hash")),
                cursor.getInt(cursor.getColumnIndexOrThrow("item_count")),
                cursor.getInt(cursor.getColumnIndexOrThrow("complete")) != 0,
                cursor.getLongOrNull("last_synced_at"),
                cursor.getLong(cursor.getColumnIndexOrThrow("last_opened_at"))
            )
        }
        val items = mutableListOf<CodexHistoryItem>()
        db.query(
            "items", null, "endpoint_id=? AND conversation_id=?",
            arrayOf(checkpoint.endpointId, checkpoint.conversationId), null, null, "position ASC"
        ).use { cursor -> while (cursor.moveToNext()) items += cursor.toItem() }
        return CodexHistoryCacheView(checkpoint, items)
    }

    fun upsertProvisional(endpointId: String, conversationId: String, item: CodexHistoryItem) {
        require(item.provisional)
        writableDatabase.insertWithOnConflict("items", null, item.values(endpointId, conversationId), SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun applyDeltaPage(endpointId: String, page: CodexHistoryDeltaPage, now: Long = System.currentTimeMillis()): PageApplyResult {
        if (CodexHistoryPageHasher.pageHash(page) != page.pageHash) return PageApplyResult.REJECTED
        val db = writableDatabase
        db.beginTransaction()
        try {
            val existing = db.query("sync_pages", arrayOf("page_hash"), "sync_id=? AND sequence=? AND page_index=?", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString()), null, null, null)
                .use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
                ?: db.query("sync_completed_pages", arrayOf("page_hash"), "sync_id=? AND sequence=? AND page_index=?", arrayOf(page.syncId, page.sequence.toString(), page.pageIndex.toString()), null, null, null)
                    .use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
            if (existing != null) {
                if (existing != page.pageHash) return PageApplyResult.REJECTED_CONFLICT
                db.setTransactionSuccessful()
                return PageApplyResult.IDEMPOTENT
            }
            db.insertWithOnConflict("sync_sessions", null, page.sessionValues(endpointId, now), SQLiteDatabase.CONFLICT_REPLACE)
            if (page.pageIndex == 0) db.delete("sync_order", "sync_id=?", arrayOf(page.syncId))
            page.upserts.forEach { item -> db.insertWithOnConflict("sync_staging", null, item.stagingValues(page), SQLiteDatabase.CONFLICT_REPLACE) }
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
            if (received == page.pageCount) commitStaging(db, endpointId, page, now)
            db.setTransactionSuccessful()
            return if (received == page.pageCount) PageApplyResult.COMMITTED else PageApplyResult.STAGED
        } finally {
            db.endTransaction()
        }
    }

    enum class PageApplyResult { STAGED, COMMITTED, IDEMPOTENT, REJECTED, REJECTED_CONFLICT }

    private fun commitStaging(db: SQLiteDatabase, endpointId: String, page: CodexHistoryDeltaPage, now: Long) {
        db.query("sync_staging", null, "sync_id=? AND sequence=?", arrayOf(page.syncId, page.sequence.toString()), null, null, null).use { cursor ->
            while (cursor.moveToNext()) {
                val operation = cursor.getString(cursor.getColumnIndexOrThrow("operation"))
                val key = cursor.getString(cursor.getColumnIndexOrThrow("item_key"))
                if (operation == "delete") {
                    db.delete("items", "endpoint_id=? AND conversation_id=? AND item_key=? AND provisional=0", arrayOf(endpointId, page.conversationId, key))
                } else {
                    db.insertWithOnConflict("items", null, cursor.toItemValues(endpointId, page.conversationId, now), SQLiteDatabase.CONFLICT_REPLACE)
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
            put("upserts", JSONArray(page.upserts.map { JSONObject().apply { put("itemKey", it.itemKey); put("turnId", it.turnId ?: JSONObject.NULL); put("position", it.position); put("itemType", it.itemType); put("role", it.role ?: JSONObject.NULL); put("clientRequestId", it.clientRequestId ?: JSONObject.NULL); put("payloadJson", it.payloadJson); put("contentHash", it.contentHash) } }))
            put("deletes", JSONArray(page.deletes)); put("canonicalOrder", JSONArray(page.canonicalOrder))
        }
        return canonicalJson(json)
    }
}

private fun canonicalJson(value: Any?): String = when (value) {
    is JSONObject -> value.keys().asSequence().filter { !value.isNull(it) || value.get(it) === JSONObject.NULL }.sorted().joinToString(separator = ",", prefix = "{", postfix = "}") { JSONObject.quote(it) + ":" + canonicalJson(value.opt(it)) }
    is JSONArray -> (0 until value.length()).joinToString(separator = ",", prefix = "[", postfix = "]") { canonicalJson(value.opt(it)) }
    JSONObject.NULL -> "null"
    is String -> JSONObject.quote(value)
    is Boolean, is Number -> value.toString()
    null -> "null"
    else -> JSONObject.quote(value.toString())
}

private fun sha256(text: String): String = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
private fun CodexHistoryDeltaPage.sessionValues(endpointId: String, now: Long) = ContentValues().apply { put("sync_id", syncId); put("endpoint_id", endpointId); put("conversation_id", conversationId); put("sequence", sequence); put("base_root", baseRoot); put("target_root", targetRoot); put("page_count", pageCount); put("baseline_complete", if (baselineComplete) 1 else 0); put("full_order_included", if (fullOrderIncluded) 1 else 0); put("created_at", now); put("expires_at", now + 30_000) }
private fun CodexHistoryDeltaPage.checkpointValues(endpointId: String, count: Int, now: Long) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("schema_version", 1); put("root_hash", targetRoot); put("item_count", count); put("complete", if (baselineComplete) 1 else 0); put("last_synced_at", now); put("last_opened_at", now) }
private fun CodexHistoryItem.values(endpointId: String, conversationId: String) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("item_key", itemKey); put("turn_id", turnId); put("position", position); put("item_type", itemType); put("role", role); put("payload_json", payloadJson); put("content_hash", contentHash); put("payload_bytes", payloadJson.toByteArray().size); put("provisional", if (provisional) 1 else 0); put("client_request_id", clientRequestId); put("updated_at", System.currentTimeMillis()) }
private fun CodexHistoryItem.stagingValues(page: CodexHistoryDeltaPage) = ContentValues().apply { put("sync_id", page.syncId); put("sequence", page.sequence); put("page_index", page.pageIndex); put("operation", "upsert"); put("item_key", itemKey); put("turn_id", turnId); put("position", position); put("item_type", itemType); put("role", role); put("client_request_id", clientRequestId); put("payload_json", payloadJson); put("content_hash", contentHash); put("payload_bytes", payloadJson.toByteArray().size) }
private fun android.database.Cursor.toItem() = CodexHistoryItem(getString(getColumnIndexOrThrow("item_key")), getStringOrNull("turn_id"), getInt(getColumnIndexOrThrow("position")), getString(getColumnIndexOrThrow("item_type")), getStringOrNull("role"), getStringOrNull("client_request_id"), getString(getColumnIndexOrThrow("payload_json")), getString(getColumnIndexOrThrow("content_hash")), getInt(getColumnIndexOrThrow("provisional")) != 0)
private fun android.database.Cursor.toItemValues(endpointId: String, conversationId: String, now: Long) = ContentValues().apply { put("endpoint_id", endpointId); put("conversation_id", conversationId); put("item_key", getString(getColumnIndexOrThrow("item_key"))); put("turn_id", getStringOrNull("turn_id")); put("position", getInt(getColumnIndexOrThrow("position"))); put("item_type", getString(getColumnIndexOrThrow("item_type"))); put("role", getStringOrNull("role")); put("payload_json", getString(getColumnIndexOrThrow("payload_json"))); put("content_hash", getString(getColumnIndexOrThrow("content_hash"))); put("payload_bytes", getInt(getColumnIndexOrThrow("payload_bytes"))); put("provisional", 0); put("client_request_id", getStringOrNull("client_request_id")); put("updated_at", now) }
private fun android.database.Cursor.getStringOrNull(column: String): String? = if (isNull(getColumnIndexOrThrow(column))) null else getString(getColumnIndexOrThrow(column))
private fun android.database.Cursor.getLongOrNull(column: String): Long? = if (isNull(getColumnIndexOrThrow(column))) null else getLong(getColumnIndexOrThrow(column))
