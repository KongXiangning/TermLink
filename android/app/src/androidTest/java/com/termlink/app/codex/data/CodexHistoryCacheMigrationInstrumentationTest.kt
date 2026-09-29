package com.termlink.app.codex.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Real-device SQLite coverage for the v3 -> v4 dormant range migration.
 *
 * These tests deliberately create the pre-range v3 schema directly, rather
 * than opening the current helper and changing rows afterward. That keeps the
 * upgrade transaction, DDL, backfill, and rollback path under test.
 */
@RunWith(AndroidJUnit4::class)
class CodexHistoryCacheMigrationInstrumentationTest {
    private lateinit var context: Context
    private val databaseName = "codex_history_migration_test.db"

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        context.deleteDatabase(databaseName)
    }

    @After
    fun tearDown() {
        context.deleteDatabase(databaseName)
    }

    @Test
    fun v3CheckpointMigratesToV4WithoutPromotingRangeCoverage() {
        createLegacyV3Database()

        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val view = requireNotNull(store.readConversation("home", "task-a"))
            assertEquals(5, store.readableDatabase.version)
            assertEquals(3, view.checkpoint.schemaVersion)
            assertEquals("old-root", view.checkpoint.rootHash)
            assertTrue(view.checkpoint.complete)
            assertFalse(view.checkpoint.coverageComplete)
            assertEquals(CodexHistoryCoverageState.LEGACY_UNKNOWN, view.checkpoint.coverageState)
            assertNull(view.checkpoint.nextOlderCursor)
            assertEquals(listOf("a-0", "a-1", "a-2"), view.items.map { it.itemKey })

            val db = store.readableDatabase
            assertEquals(1, scalarInt(db, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='home' AND conversation_id='task-a'"))
            assertEquals(3, scalarInt(db, "SELECT COUNT(*) FROM items WHERE endpoint_id='home' AND conversation_id='task-a' AND segment_id IS NOT NULL"))
            assertEquals(3, scalarInt(db, "SELECT item_count FROM history_segments WHERE endpoint_id='home' AND conversation_id='task-a'"))
            assertTrue(tableHasColumn(db, "conversations", "coverage_complete"))
            assertTrue(tableHasColumn(db, "items", "within_segment_position"))
            assertTrue(tableHasColumn(db, "items", "detail_refs_json"))
            assertTrue(tableHasColumn(db, "sync_staging", "detail_refs_json"))
            assertTrue(indexExists(db, "idx_items_segment_position_unique"))
        } finally {
            store.close()
        }
    }

    @Test
    fun malformedLegacyPositionRollsBackTheEntireUpgrade() {
        val malformedPosition = Int.MAX_VALUE.toLong() + 1L
        createLegacyV3Database(malformedPosition = malformedPosition)

        val store = CodexConversationCacheStore(context, databaseName)
        var threw = false
        try {
            store.readConversation("home", "task-a")
        } catch (_: Throwable) {
            threw = true
        } finally {
            store.close()
        }
        assertTrue("v3->v4 must fail closed for an out-of-range legacy position", threw)

        val db = SQLiteDatabase.openDatabase(
            context.getDatabasePath(databaseName).absolutePath,
            null,
            SQLiteDatabase.OPEN_READONLY
        )
        try {
            assertEquals(3, db.version)
            assertFalse(tableHasColumn(db, "conversations", "coverage_complete"))
            assertFalse(tableHasColumn(db, "items", "segment_id"))
            assertEquals(0, scalarInt(db, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='history_segments'"))
            assertEquals(malformedPosition, scalarLong(db, "SELECT position FROM items WHERE item_key='a-malformed'"))
            assertEquals("old-root", scalarString(db, "SELECT root_hash FROM conversations WHERE conversation_id='task-a'"))
        } finally {
            db.close()
        }
    }

    @Test
    fun v2ReaderKeepsOldestFirstAfterTwoPrependedPages() {
        createLegacyV3Database()
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val db = store.writableDatabase
            insertItem(db, "older-0", -2)
            insertItem(db, "older-1", -1)
            insertItem(db, "oldest-0", -4)
            insertItem(db, "oldest-1", -3)

            val view = requireNotNull(store.readConversation("home", "task-a"))
            assertEquals(
                listOf("oldest-0", "oldest-1", "older-0", "older-1", "a-0", "a-1", "a-2"),
                view.items.sortedBy { it.position }.map { it.itemKey }
            )
        } finally {
            store.close()
        }
    }

    @Test
    fun clearingTaskAndServiceAlsoRemovesRangeSegments() {
        createLegacyV3Database(includeSecondConversation = true)
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            assertTrue(store.clearConversationCache("home", "task-a").isEmpty())
            val afterTaskClear = store.readableDatabase
            assertEquals(0, scalarInt(afterTaskClear, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='home' AND conversation_id='task-a'"))
            assertEquals(1, scalarInt(afterTaskClear, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='local' AND conversation_id='task-b'"))
            assertNull(store.readConversation("home", "task-a"))

            assertTrue(store.clearServiceCache("local").isEmpty())
            assertEquals(0, scalarInt(afterTaskClear, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='local'"))
            assertNull(store.readConversation("local", "task-b"))
        } finally {
            store.close()
        }
    }

    @Test
    fun incompatibleV2OrderAndDeleteInvalidateRangeMetadata() {
        createLegacyV3Database()
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val db = store.writableDatabase
            db.execSQL(
                """UPDATE conversations SET range_id='range-1', range_kind='full',
                    newest_anchor_key='a-2', oldest_anchor_key='a-0', next_older_cursor='older-cursor',
                    coverage_root='range-root', has_more_before=1, coverage_complete=1,
                    coverage_state='complete' WHERE endpoint_id='home' AND conversation_id='task-a'""".trimIndent()
            )
            db.insertOrThrow("history_segments", null, ContentValues().apply {
                put("endpoint_id", "home")
                put("conversation_id", "task-a")
                put("segment_id", "range-1")
                put("segment_rank", 0L)
                put("direction", "ascending")
                put("first_item_key", "a-0")
                put("last_item_key", "a-2")
                put("item_count", 3)
                put("state", "committed")
            })
            db.execSQL(
                "UPDATE items SET segment_id='range-1', within_segment_position=position " +
                    "WHERE endpoint_id='home' AND conversation_id='task-a'"
            )

            val rawPage = CodexHistoryDeltaPage(
                syncId = "v2-incompatible",
                conversationId = "task-a",
                sequence = 0,
                pageIndex = 0,
                pageCount = 1,
                pageHash = "",
                baseRoot = "old-root",
                targetRoot = "new-root",
                baselineComplete = true,
                fullOrderIncluded = true,
                canonicalOrder = listOf("a-2", "a-1"),
                deletes = listOf("a-0")
            )
            val page = rawPage.copy(pageHash = CodexHistoryPageHasher.pageHash(rawPage))
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", page))

            val checkpoint = requireNotNull(store.readConversation("home", "task-a")).checkpoint
            assertFalse(checkpoint.coverageComplete)
            assertEquals(CodexHistoryCoverageState.LEGACY_UNKNOWN, checkpoint.coverageState)
            assertNull(checkpoint.rangeId)
            assertNull(checkpoint.nextOlderCursor)
            assertEquals(0, scalarInt(db, "SELECT COUNT(*) FROM items WHERE segment_id IS NOT NULL"))
            assertEquals(1, scalarInt(db, "SELECT COUNT(*) FROM history_segments WHERE segment_id='range-1' AND state='superseded'"))
        } finally {
            store.close()
        }
    }

    @Test
    fun oneTailThenOneOlderRangePageCommitsCursorAndSegmentsAtomically() {
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val tail = rangePage(
                syncId = "123e4567-e89b-12d3-a456-426614174201",
                rangeId = "tail-range",
                rangeKind = "tail",
                items = listOf("tail-0", "tail-1"),
                nextOlderCursor = "older-cursor"
            )
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", tail))

            val older = rangePage(
                syncId = "123e4567-e89b-12d3-a456-426614174202",
                rangeId = "older-range",
                rangeKind = "older",
                items = listOf("older-0", "older-1"),
                nextOlderCursor = "older-again"
            )
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", older))

            val view = requireNotNull(store.readConversation("home", "task-range"))
            assertEquals(listOf("older-0", "older-1", "tail-0", "tail-1"), view.items.map { it.itemKey })
            assertEquals("older-range", view.checkpoint.rangeId)
            assertEquals("older-again", view.checkpoint.nextOlderCursor)
            assertTrue(view.checkpoint.hasMoreBefore == true)
            assertEquals("tail-1", view.checkpoint.newestAnchorKey)
            assertEquals("hash-tail-1", view.checkpoint.newestAnchorHash)
            assertEquals(CodexHistoryCoverageState.PARTIAL, view.checkpoint.coverageState)
            assertFalse(view.checkpoint.complete)

            val db = store.readableDatabase
            assertEquals(2, scalarInt(db, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='home' AND conversation_id='task-range' AND state='committed'"))
            assertEquals(-1L, scalarLong(db, "SELECT segment_rank FROM history_segments WHERE segment_id='older-range'"))
            assertEquals(-2, scalarInt(db, "SELECT position FROM items WHERE item_key='older-0'"))
            assertEquals(1, scalarInt(db, "SELECT position FROM items WHERE item_key='tail-1'"))

            val replay = older.copy(
                syncId = "123e4567-e89b-12d3-a456-426614174203",
                pageHash = ""
            ).let { it.copy(pageHash = CodexHistoryPageHasher.pageHash(it)) }
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", replay))
            assertEquals(4, scalarInt(db, "SELECT COUNT(*) FROM items WHERE endpoint_id='home' AND conversation_id='task-range' AND provisional=0"))
        } finally {
            store.close()
        }
    }

    @Test
    fun productDetailRefsSurviveCommittedPageAndDatabaseReopen() {
        val refs = "[{\"kind\":\"tool_detail\",\"refId\":\"detail-1\"}]"
        val rawPage = CodexHistoryDeltaPage(
            syncId = "detail-storage", conversationId = "task-detail", sequence = 0,
            pageIndex = 0, pageCount = 1, pageHash = "", baseRoot = null,
            targetRoot = "detail-root", baselineComplete = true, fullOrderIncluded = true,
            canonicalOrder = listOf("item-1"),
            upserts = listOf(CodexHistoryItem(
                itemKey = "item-1", turnId = "turn-1", position = 0,
                itemType = "tool", role = "tool", clientRequestId = null,
                payloadJson = "{\"text\":\"tool\"}", contentHash = "item-version",
                detailRefsJson = refs, detailRefsTruncated = true, availability = "partial"
            ))
        )
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val page = rawPage.copy(pageHash = CodexHistoryPageHasher.pageHash(rawPage))
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", page))
        } finally {
            store.close()
        }
        val reopened = CodexConversationCacheStore(context, databaseName)
        try {
            val item = requireNotNull(reopened.readConversation("home", "task-detail")).items.single()
            assertEquals(refs, item.detailRefsJson)
            assertTrue(item.detailRefsTruncated)
            assertEquals("partial", item.availability)
        } finally {
            reopened.close()
        }
    }

    @Test
    fun productOlderOverlapAndDetailRefreshPreserveChronologicalItems() {
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            fun productPage(sync: String, segment: String, kind: String, keys: List<String>, detail: String? = null): CodexHistoryDeltaPage {
                val base = rangePage(sync, segment, kind, keys, if (kind == "older") null else "older-cursor")
                val items = base.upserts.map { item ->
                    if (item.itemKey == "tail-1" && detail != null) item.copy(
                        contentHash = "hash-tail-1-$detail",
                        detailRefsJson = "[{\"refId\":\"$detail\"}]"
                    ) else item
                }
                val raw = base.copy(
                    upserts = items,
                    range = base.range!!.copy(
                        providerMode = "product_db",
                        newestAnchor = CodexHistoryRangeAnchor(items.last().itemKey, items.last().contentHash),
                        oldestAnchor = CodexHistoryRangeAnchor(items.first().itemKey, items.first().contentHash)
                    ),
                    pageHash = ""
                )
                return raw.copy(pageHash = CodexHistoryPageHasher.pageHash(raw))
            }
            val tail = productPage("123e4567-e89b-12d3-a456-426614174241", "product-segment-1", "tail", listOf("tail-0", "tail-1"))
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", tail))
            val older = productPage("123e4567-e89b-12d3-a456-426614174242", "product-segment-2", "older", listOf("older-0", "tail-0"))
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", older))
            assertEquals(listOf("older-0", "tail-0", "tail-1"), requireNotNull(store.readConversation("home", "task-range")).items.map { it.itemKey })
            assertEquals(1, scalarInt(store.readableDatabase, "SELECT item_count FROM history_segments WHERE segment_id='product-segment-2'"))

            val refresh = productPage("123e4567-e89b-12d3-a456-426614174243", "product-segment-3", "tail", listOf("tail-1"), "detail-v2")
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", refresh))
            val view = requireNotNull(store.readConversation("home", "task-range"))
            assertEquals(listOf("older-0", "tail-0", "tail-1"), view.items.map { it.itemKey })
            assertEquals("hash-tail-1-detail-v2", view.items.last().contentHash)
            assertEquals("[{\"refId\":\"detail-v2\"}]", view.items.last().detailRefsJson)
            assertEquals(1, scalarInt(store.readableDatabase, "SELECT COUNT(*) FROM items WHERE item_key='tail-1'"))
        } finally {
            store.close()
        }
    }

    @Test
    fun productTailAtomicallyReplacesCompleteLegacyCache() {
        createLegacyV3Database()
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val base = rangePage("123e4567-e89b-12d3-a456-426614174244", "product-replacement-segment", "tail", listOf("product-0"), null)
            val hash = "5e8978244cb8e3d3b41d4693fc284e2b9ba5bca8628cdee3eeb6107424e3f47c"
            val root = "9bc2d8061ec1ab85c82ce3cfc7302ec5a12f22ea5e8241936f5bc20b3c4850da"
            val raw = base.copy(
                conversationId = "task-a",
                upserts = base.upserts.map { it.copy(contentHash = hash) },
                targetRoot = root,
                range = base.range!!.copy(
                    providerMode = "product_db", coverageRoot = root,
                    newestAnchor = CodexHistoryRangeAnchor("product-0", hash),
                    oldestAnchor = CodexHistoryRangeAnchor("product-0", hash)
                ),
                pageHash = ""
            )
            val page = raw.copy(pageHash = CodexHistoryPageHasher.pageHash(raw))
            assertEquals(CodexConversationCacheStore.PageApplyResult.COMMITTED, store.applyDeltaPage("home", page))
            val view = requireNotNull(store.readConversation("home", "task-a"))
            assertEquals(listOf("product-0"), view.items.map { it.itemKey })
            assertEquals("product_db", view.checkpoint.providerMode)
            assertEquals(1, scalarInt(store.readableDatabase, "SELECT COUNT(*) FROM history_segments WHERE endpoint_id='home' AND conversation_id='task-a'"))
        } finally {
            store.close()
        }
    }

    @Test
    fun emptyProductProviderTransitionCannotEraseCompleteLegacyCache() {
        createLegacyV3Database()
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            val base = rangePage("123e4567-e89b-12d3-a456-426614174245", "empty-transition", "tail", listOf("product-0"), null)
            val raw = base.copy(
                conversationId = "task-a",
                upserts = emptyList(),
                range = base.range!!.copy(providerMode = "product_db"),
                pageHash = ""
            )
            val page = raw.copy(pageHash = CodexHistoryPageHasher.pageHash(raw))
            var rejected = false
            try {
                store.applyDeltaPage("home", page)
            } catch (_: IllegalStateException) {
                rejected = true
            }
            assertTrue("empty transition must fail closed", rejected)
            val view = requireNotNull(store.readConversation("home", "task-a"))
            assertEquals(listOf("a-0", "a-1", "a-2"), view.items.map { it.itemKey })
            assertEquals("old-root", view.checkpoint.rootHash)
        } finally {
            store.close()
        }
    }

    private fun rangePage(
        syncId: String,
        rangeId: String,
        rangeKind: String,
        items: List<String>,
        nextOlderCursor: String?
    ): CodexHistoryDeltaPage {
        val canonicalItems = items.mapIndexed { index, key ->
            CodexHistoryItem(
                itemKey = key,
                turnId = "turn-$key",
                position = index,
                itemType = "message",
                role = "assistant",
                clientRequestId = null,
                payloadJson = "{\"text\":\"$key\"}",
                contentHash = "hash-$key"
            )
        }
        val range = CodexHistoryRangeMetadata(
            version = 1,
            segmentId = rangeId,
            rangeId = rangeId,
            rangeKind = rangeKind,
            providerMode = "paginated",
            providerIdentityHash = "codex-app-server",
            newestAnchor = CodexHistoryRangeAnchor(canonicalItems.last().itemKey, canonicalItems.last().contentHash),
            oldestAnchor = CodexHistoryRangeAnchor(canonicalItems.first().itemKey, canonicalItems.first().contentHash),
            nextOlderCursor = nextOlderCursor,
            hasMoreBefore = nextOlderCursor != null,
            coverageRoot = "root-$rangeId",
            coverageComplete = false
        )
        val raw = CodexHistoryDeltaPage(
            syncId = syncId,
            conversationId = "task-range",
            sequence = 1,
            pageIndex = 0,
            pageCount = 1,
            pageHash = "",
            baseRoot = null,
            targetRoot = "root-$rangeId",
            baselineComplete = false,
            fullOrderIncluded = false,
            upserts = canonicalItems,
            range = range
        )
        return raw.copy(pageHash = CodexHistoryPageHasher.pageHash(raw))
    }

    private fun createLegacyV3Database(
        malformedPosition: Long? = null,
        includeSecondConversation: Boolean = false
    ) {
        val file = context.getDatabasePath(databaseName)
        file.parentFile?.mkdirs()
        val db = SQLiteDatabase.openOrCreateDatabase(file, null)
        try {
            db.execSQL(
                """CREATE TABLE conversations (
                    endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, schema_version INTEGER NOT NULL,
                    root_hash TEXT, item_count INTEGER NOT NULL DEFAULT 0, complete INTEGER NOT NULL DEFAULT 0,
                    last_synced_at INTEGER, last_opened_at INTEGER NOT NULL, payload_bytes INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (endpoint_id, conversation_id)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE items (
                    endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, item_key TEXT NOT NULL,
                    turn_id TEXT, position INTEGER NOT NULL, item_type TEXT NOT NULL, role TEXT,
                    payload_json TEXT NOT NULL, content_hash TEXT NOT NULL, payload_bytes INTEGER NOT NULL,
                    provisional INTEGER NOT NULL DEFAULT 0, client_request_id TEXT, updated_at INTEGER NOT NULL,
                    PRIMARY KEY (endpoint_id, conversation_id, item_key)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE thread_index (
                    endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL, title TEXT NOT NULL,
                    preview TEXT, archived INTEGER NOT NULL DEFAULT 0, cwd TEXT, goal_objective TEXT,
                    created_at INTEGER, last_active_at INTEGER, last_seen_at INTEGER, last_remote_refresh_at INTEGER,
                    source TEXT NOT NULL DEFAULT 'thread_list', PRIMARY KEY (endpoint_id, conversation_id)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_sessions (
                    sync_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
                    sequence INTEGER NOT NULL, base_root TEXT, target_root TEXT NOT NULL, page_count INTEGER NOT NULL,
                    baseline_complete INTEGER NOT NULL DEFAULT 0, full_order_included INTEGER NOT NULL DEFAULT 0,
                    selection_generation INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_pages (
                    sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
                    page_hash TEXT NOT NULL, received_at INTEGER NOT NULL,
                    PRIMARY KEY (sync_id, sequence, page_index)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_staging (
                    sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
                    operation TEXT NOT NULL, item_key TEXT NOT NULL, turn_id TEXT, position INTEGER,
                    item_type TEXT, role TEXT, client_request_id TEXT, payload_json TEXT, content_hash TEXT,
                    payload_bytes INTEGER, payload_hash TEXT, payload_chunk_count INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (sync_id, sequence, page_index, operation, item_key)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_order (
                    sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, position INTEGER NOT NULL, item_key TEXT NOT NULL,
                    PRIMARY KEY (sync_id, sequence, position), UNIQUE(sync_id, sequence, item_key)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_completed_pages (
                    sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
                    page_hash TEXT NOT NULL, completed_at INTEGER NOT NULL,
                    PRIMARY KEY (sync_id, sequence, page_index)
                )""".trimIndent()
            )
            db.execSQL(
                """CREATE TABLE sync_payload_chunks (
                    sync_id TEXT NOT NULL, sequence INTEGER NOT NULL, page_index INTEGER NOT NULL,
                    item_key TEXT NOT NULL, chunk_index INTEGER NOT NULL, chunk_count INTEGER NOT NULL,
                    payload_hash TEXT NOT NULL, payload_bytes INTEGER NOT NULL, payload_data TEXT NOT NULL,
                    PRIMARY KEY (sync_id, sequence, page_index, item_key, chunk_index)
                )""".trimIndent()
            )
            seedLegacyConversation(db, "home", "task-a", "a", malformedPosition)
            if (includeSecondConversation) seedLegacyConversation(db, "local", "task-b", "b", null)
            db.execSQL("PRAGMA user_version=3")
        } finally {
            db.close()
        }
    }

    private fun seedLegacyConversation(
        db: SQLiteDatabase,
        endpointId: String,
        conversationId: String,
        keyPrefix: String,
        malformedPosition: Long?
    ) {
        db.insertOrThrow("conversations", null, ContentValues().apply {
            put("endpoint_id", endpointId)
            put("conversation_id", conversationId)
            put("schema_version", 2)
            put("root_hash", "old-root")
            put("item_count", 3)
            put("complete", 1)
            put("last_synced_at", 100L)
            put("last_opened_at", 100L)
            put("payload_bytes", 3)
        })
        db.insertOrThrow("thread_index", null, ContentValues().apply {
            put("endpoint_id", endpointId)
            put("conversation_id", conversationId)
            put("title", conversationId)
            put("last_seen_at", 100L)
        })
        for (index in 0..2) {
            val key = if (malformedPosition != null && index == 2) "$keyPrefix-malformed" else "$keyPrefix-$index"
            val position = if (malformedPosition != null && index == 2) malformedPosition else index.toLong()
            insertItem(db, key, position, endpointId, conversationId)
        }
    }

    private fun insertItem(
        db: SQLiteDatabase,
        itemKey: String,
        position: Long,
        endpointId: String = "home",
        conversationId: String = "task-a"
    ) {
        db.insertOrThrow("items", null, ContentValues().apply {
            put("endpoint_id", endpointId)
            put("conversation_id", conversationId)
            put("item_key", itemKey)
            put("turn_id", "turn-$itemKey")
            put("position", position)
            put("item_type", "message")
            put("role", "assistant")
            put("payload_json", "{\"text\":\"$itemKey\"}")
            put("content_hash", itemKey)
            put("payload_bytes", itemKey.length)
            put("updated_at", 100L)
        })
    }

    private fun tableHasColumn(db: SQLiteDatabase, table: String, column: String): Boolean =
        db.rawQuery("PRAGMA table_info($table)", null).use { cursor ->
            val nameIndex = cursor.getColumnIndexOrThrow("name")
            while (cursor.moveToNext()) if (cursor.getString(nameIndex) == column) return@use true
            false
        }

    private fun indexExists(db: SQLiteDatabase, indexName: String): Boolean =
        db.rawQuery("PRAGMA index_list(items)", null).use { cursor ->
            val nameIndex = cursor.getColumnIndexOrThrow("name")
            while (cursor.moveToNext()) if (cursor.getString(nameIndex) == indexName) return@use true
            false
        }

    private fun scalarInt(db: SQLiteDatabase, sql: String): Int =
        db.rawQuery(sql, null).use { cursor ->
            assertTrue(cursor.moveToFirst())
            cursor.getInt(0)
        }

    private fun scalarLong(db: SQLiteDatabase, sql: String): Long =
        db.rawQuery(sql, null).use { cursor ->
            assertTrue(cursor.moveToFirst())
            cursor.getLong(0)
        }

    private fun scalarString(db: SQLiteDatabase, sql: String): String =
        db.rawQuery(sql, null).use { cursor ->
            assertTrue(cursor.moveToFirst())
            cursor.getString(0)
        }
}
