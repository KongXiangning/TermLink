package com.termlink.app.ui.settings

import android.content.Context
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.codex.data.CodexConversationCacheStore
import com.termlink.app.codex.data.CodexMediaBlobRecord
import com.termlink.app.codex.data.CodexMediaVariant
import com.termlink.app.codex.data.CodexThreadIndexEntry
import java.io.File
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI-level destructive cleanup coverage using an injected, isolated cache.
 * The production database and media directory are never touched by this test.
 */
@RunWith(AndroidJUnit4::class)
class CodexStorageManagementActivityTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val databaseName = "codex_storage_ui_test.db"
    private val mediaDirectory = File(context.filesDir, "codex-media/storage-ui-test")
    @Before
    fun setUp() {
        context.deleteDatabase(databaseName)
        mediaDirectory.deleteRecursively()
        seedCache()
    }

    @After
    fun tearDown() {
        runShell("input keyevent 4")
        context.deleteDatabase(databaseName)
        mediaDirectory.deleteRecursively()
    }

    @Test
    fun taskCleanupKeepsSharedMediaAndOtherServiceTask() {
        launchActivity()
        clickButtonForRow("Task A", "清理")
        clickDialogPositive("清理任务缓存？")

        awaitCondition {
            val store = CodexConversationCacheStore(context, databaseName)
            try {
                store.readThreadIndex("home").none { it.conversationId == "task-a" } &&
                    store.readThreadIndex("local").any { it.conversationId == "task-b" }
            } finally {
                store.close()
            }
        }
        assertTrue(File(mediaDirectory, "shared-original.png").exists())
        assertTrue(File(mediaDirectory, "shared-thumb.webp").exists())
    }

    @Test
    fun serviceCleanupKeepsSharedMediaAndOtherService() {
        launchActivity()
        clickButtonForRow("Home", "清理服务缓存")
        clickDialogPositive("清理服务缓存？")

        awaitCondition {
            val store = CodexConversationCacheStore(context, databaseName)
            try {
                store.readThreadIndex("home").isEmpty() &&
                    store.readThreadIndex("local").any { it.conversationId == "task-b" }
            } finally {
                store.close()
            }
        }
        assertTrue(File(mediaDirectory, "shared-original.png").exists())
        assertTrue(File(mediaDirectory, "shared-thumb.webp").exists())
    }

    private fun launchActivity() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.executeShellCommand("input keyevent 224").use { }
        instrumentation.uiAutomation.executeShellCommand("wm dismiss-keyguard").use { }
        instrumentation.uiAutomation.executeShellCommand(
            "am start -W -n com.termlink.app/.ui.settings.CodexStorageManagementActivity " +
                "--es ${CodexStorageManagementActivity.EXTRA_DATABASE_NAME} $databaseName"
        ).use { }
        awaitRoot { hasText(it, "Task A") && hasText(it, "Task B") }
    }

    private fun runShell(command: String) {
        InstrumentationRegistry.getInstrumentation().uiAutomation
            .executeShellCommand(command)
            .use { }
    }

    private fun clickButtonForRow(rowText: String, buttonText: String) {
        val root = awaitRoot { hasText(it, rowText) }
        val node = findNodes(root) { it.text?.toString() == buttonText }
            .firstOrNull { candidate ->
                var parent = candidate.parent
                while (parent != null) {
                    if (hasText(parent, rowText)) return@firstOrNull true
                    parent = parent.parent
                }
                false
            }
            ?: error("Unable to find $buttonText button for $rowText")
        check(node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            "Unable to click $buttonText button for $rowText"
        }
    }

    private fun clickDialogPositive(title: String) {
        val root = awaitRoot { hasText(it, title) }
        val node = findNodes(root) {
            it.text?.toString() == "清理" && it.isClickable
        }.firstOrNull() ?: error("Unable to find positive button for $title")
        check(node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            "Unable to click positive button for $title"
        }
    }

    private fun awaitRoot(predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10)
        var lastRoot: AccessibilityNodeInfo? = null
        while (System.nanoTime() < deadline) {
            val root = InstrumentationRegistry.getInstrumentation().uiAutomation.rootInActiveWindow
            if (root != null && root.packageName == "com.termlink.app") {
                lastRoot = root
                if (predicate(root)) return root
            }
            Thread.sleep(100L)
        }
        error("Timed out waiting for TermLink UI; root=${lastRoot?.let(::describeTree)}")
    }

    private fun findNodes(root: AccessibilityNodeInfo, predicate: (AccessibilityNodeInfo) -> Boolean): List<AccessibilityNodeInfo> {
        val result = mutableListOf<AccessibilityNodeInfo>()
        fun visit(node: AccessibilityNodeInfo) {
            if (predicate(node)) result += node
            for (index in 0 until node.childCount) {
                node.getChild(index)?.let(::visit)
            }
        }
        visit(root)
        return result
    }

    private fun hasText(root: AccessibilityNodeInfo, text: String): Boolean =
        findNodes(root) { it.text?.toString()?.contains(text) == true }.isNotEmpty()

    private fun describeTree(root: AccessibilityNodeInfo): String =
        findNodes(root) { it.text != null }
            .joinToString(" | ") { "${it.className}:${it.text}" }

    private fun seedCache() {
        val store = CodexConversationCacheStore(context, databaseName)
        try {
            store.upsertServiceMetadata("home", "Home", "https://home.example")
            store.upsertServiceMetadata("local", "Local", "http://192.168.50.12:3010")
            store.upsertThreadIndex(
                "home",
                listOf(CodexThreadIndexEntry("home", "task-a", "Task A"))
            )
            store.upsertThreadIndex(
                "local",
                listOf(CodexThreadIndexEntry("local", "task-b", "Task B"))
            )

            val original = File(mediaDirectory, "shared-original.png").apply {
                parentFile?.mkdirs()
                writeBytes(byteArrayOf(1, 2, 3))
            }
            val thumbnail = File(mediaDirectory, "shared-thumb.webp").apply {
                writeBytes(byteArrayOf(4, 5, 6))
            }
            listOf("home", "local").forEach { endpointId ->
                store.upsertMediaBlob(
                    CodexMediaBlobRecord(
                        endpointId = endpointId,
                        contentHash = "a".repeat(64),
                        variant = CodexMediaVariant.ORIGINAL,
                        mimeType = "image/png",
                        byteSize = original.length(),
                        localPath = original.absolutePath,
                        state = "available",
                        lastAccessedAt = 1L
                    )
                )
                store.upsertMediaBlob(
                    CodexMediaBlobRecord(
                        endpointId = endpointId,
                        contentHash = "b".repeat(64),
                        variant = CodexMediaVariant.THUMBNAIL,
                        mimeType = "image/webp",
                        byteSize = thumbnail.length(),
                        localPath = thumbnail.absolutePath,
                        state = "available",
                        lastAccessedAt = 1L
                    )
                )
            }
            store.upsertConversationMediaRef("home", "task-a", "item-a", "a".repeat(64), "b".repeat(64))
            store.upsertConversationMediaRef("local", "task-b", "item-b", "a".repeat(64), "b".repeat(64))
        } finally {
            store.close()
        }
    }

    private fun awaitCondition(timeoutMillis: Long = 5_000L, condition: () -> Boolean) {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMillis)
        while (System.nanoTime() < deadline) {
            if (condition()) return
            Thread.sleep(50L)
        }
        assertTrue("Timed out waiting for storage cleanup", condition())
    }
}
