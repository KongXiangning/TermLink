package com.termlink.app.codex.data

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CodexConversationCacheStoreMediaCleanupTest {
    private lateinit var context: Context
    private lateinit var store: CodexConversationCacheStore
    private val databaseName = "codex_media_cleanup_test.db"
    private val mediaDirectoryName = "codex-media/media-cleanup-test"

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        context.deleteDatabase(databaseName)
        File(context.filesDir, mediaDirectoryName).deleteRecursively()
        store = CodexConversationCacheStore(context, databaseName)
    }

    @After
    fun tearDown() {
        store.close()
        context.deleteDatabase(databaseName)
        File(context.filesDir, mediaDirectoryName).deleteRecursively()
    }

    @Test
    fun clearingOneEndpointDoesNotReturnSharedMediaPathUntilOtherEndpointIsCleared() {
        val endpointA = "home"
        val endpointB = "local"
        val conversationA = "conversation-a"
        val conversationB = "conversation-b"
        val contentHash = "a".repeat(64)
        val thumbnailHash = "b".repeat(64)
        val originalPath = File(context.filesDir, "$mediaDirectoryName/shared-original.png").apply {
            parentFile?.mkdirs()
            writeBytes(byteArrayOf(1, 2, 3))
        }
        val thumbnailPath = File(context.filesDir, "$mediaDirectoryName/shared-thumb.webp").apply {
            writeBytes(byteArrayOf(4, 5, 6))
        }

        store.upsertServiceMetadata(endpointA, "Home", "https://home.example")
        store.upsertServiceMetadata(endpointB, "Local", "http://192.168.50.12:3010")
        listOf(endpointA, endpointB).forEach { endpoint ->
            store.upsertMediaBlob(
                CodexMediaBlobRecord(
                    endpointId = endpoint,
                    contentHash = contentHash,
                    variant = CodexMediaVariant.ORIGINAL,
                    mimeType = "image/png",
                    byteSize = originalPath.length(),
                    localPath = originalPath.absolutePath,
                    state = "available",
                    lastAccessedAt = 1L
                )
            )
            store.upsertMediaBlob(
                CodexMediaBlobRecord(
                    endpointId = endpoint,
                    contentHash = thumbnailHash,
                    variant = CodexMediaVariant.THUMBNAIL,
                    mimeType = "image/webp",
                    byteSize = thumbnailPath.length(),
                    localPath = thumbnailPath.absolutePath,
                    state = "available",
                    lastAccessedAt = 1L
                )
            )
        }
        store.upsertConversationMediaRef(endpointA, conversationA, "item-a", contentHash, thumbnailHash)
        store.upsertConversationMediaRef(endpointB, conversationB, "item-b", contentHash, thumbnailHash)

        val taskUsage = store.readConversationStorageUsage(endpointA, conversationA)
        assertEquals(3L, taskUsage.originalBytes)
        assertEquals(3L, taskUsage.thumbnailBytes)
        assertEquals(6L, taskUsage.totalBytes)

        assertTrue(store.clearConversationCache(endpointA, conversationA).isEmpty())
        assertTrue(originalPath.exists())
        assertTrue(thumbnailPath.exists())

        val remainingUsage = store.readStorageUsage().first { it.endpointId == endpointB }
        assertEquals(6L, remainingUsage.totalBytes)

        val removable = store.clearServiceCache(endpointB)
        assertEquals(setOf(originalPath.absolutePath, thumbnailPath.absolutePath), removable.toSet())
        assertTrue(originalPath.exists())
        assertTrue(thumbnailPath.exists())
    }
}
