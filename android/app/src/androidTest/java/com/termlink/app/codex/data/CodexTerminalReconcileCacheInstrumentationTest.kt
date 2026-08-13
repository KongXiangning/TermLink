package com.termlink.app.codex.data

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * P0-C uses the existing v2 staging transaction rather than inventing a
 * second SQLite write path. This real-device test proves that a multi-page
 * canonical terminal reconciliation is invisible until its final page, then
 * replaces only its target conversation partition atomically.
 */
@RunWith(AndroidJUnit4::class)
class CodexTerminalReconcileCacheInstrumentationTest {
    private lateinit var context: Context
    private val databaseName = "codex_terminal_reconcile_cache_test.db"

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
    fun multiPageTerminalReconcileCommitsAAtomicallyWithoutChangingB() {
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            assertEquals(
                CodexConversationCacheStore.PageApplyResult.COMMITTED,
                store.applyDeltaPage("endpoint", fullPage(
                    syncId = "123e4567-e89b-12d3-a456-426614174401",
                    conversationId = "task-a",
                    baseRoot = null,
                    targetRoot = "a-old-root",
                    items = listOf(item("a-old", 0)),
                    canonicalOrder = listOf("a-old")
                ))
            )
            assertEquals(
                CodexConversationCacheStore.PageApplyResult.COMMITTED,
                store.applyDeltaPage("endpoint", fullPage(
                    syncId = "123e4567-e89b-12d3-a456-426614174402",
                    conversationId = "task-b",
                    baseRoot = null,
                    targetRoot = "b-root",
                    items = listOf(item("b-only", 0)),
                    canonicalOrder = listOf("b-only")
                ))
            )

            val syncId = "123e4567-e89b-12d3-a456-426614174403"
            val firstTerminalPage = page(
                syncId = syncId,
                conversationId = "task-a",
                pageIndex = 0,
                pageCount = 2,
                baseRoot = "a-old-root",
                targetRoot = "a-terminal-root",
                fullOrderIncluded = true,
                canonicalOrder = listOf("a-new-0", "a-new-1"),
                upserts = listOf(item("a-new-0", 0))
            )
            val secondTerminalPage = page(
                syncId = syncId,
                conversationId = "task-a",
                pageIndex = 1,
                pageCount = 2,
                baseRoot = "a-old-root",
                targetRoot = "a-terminal-root",
                fullOrderIncluded = false,
                upserts = listOf(item("a-new-1", 1)),
                deletes = listOf("a-old")
            )

            assertEquals(
                CodexConversationCacheStore.PageApplyResult.READY,
                store.applyDeltaPage("endpoint", firstTerminalPage)
            )
            assertEquals(
                listOf("a-old"),
                requireNotNull(store.readConversation("endpoint", "task-a")).items.map { it.itemKey }
            )
            assertEquals(
                listOf("b-only"),
                requireNotNull(store.readConversation("endpoint", "task-b")).items.map { it.itemKey }
            )

            assertEquals(
                CodexConversationCacheStore.PageApplyResult.COMMITTED,
                store.applyDeltaPage("endpoint", secondTerminalPage)
            )
            val reconciledA = requireNotNull(store.readConversation("endpoint", "task-a"))
            assertEquals(listOf("a-new-0", "a-new-1"), reconciledA.items.map { it.itemKey })
            assertEquals("a-terminal-root", reconciledA.checkpoint.rootHash)
            assertEquals(
                listOf("b-only"),
                requireNotNull(store.readConversation("endpoint", "task-b")).items.map { it.itemKey }
            )
        } finally {
            store.close()
        }
    }

    private fun fullPage(
        syncId: String,
        conversationId: String,
        baseRoot: String?,
        targetRoot: String,
        items: List<CodexHistoryItem>,
        canonicalOrder: List<String>
    ): CodexHistoryDeltaPage = page(
        syncId = syncId,
        conversationId = conversationId,
        pageIndex = 0,
        pageCount = 1,
        baseRoot = baseRoot,
        targetRoot = targetRoot,
        fullOrderIncluded = true,
        canonicalOrder = canonicalOrder,
        upserts = items
    )

    private fun page(
        syncId: String,
        conversationId: String,
        pageIndex: Int,
        pageCount: Int,
        baseRoot: String?,
        targetRoot: String,
        fullOrderIncluded: Boolean,
        canonicalOrder: List<String> = emptyList(),
        upserts: List<CodexHistoryItem> = emptyList(),
        deletes: List<String> = emptyList()
    ): CodexHistoryDeltaPage {
        val raw = CodexHistoryDeltaPage(
            syncId = syncId,
            conversationId = conversationId,
            sequence = 1,
            pageIndex = pageIndex,
            pageCount = pageCount,
            pageHash = "",
            baseRoot = baseRoot,
            targetRoot = targetRoot,
            baselineComplete = true,
            fullOrderIncluded = fullOrderIncluded,
            canonicalOrder = canonicalOrder,
            upserts = upserts,
            deletes = deletes,
            selectionGeneration = 41
        )
        return raw.copy(pageHash = CodexHistoryPageHasher.pageHash(raw))
    }

    private fun item(key: String, position: Int) = CodexHistoryItem(
        itemKey = key,
        turnId = "turn-$key",
        position = position,
        itemType = "message",
        role = "assistant",
        clientRequestId = null,
        payloadJson = "{\"text\":\"$key\"}",
        contentHash = "hash-$key"
    )
}
