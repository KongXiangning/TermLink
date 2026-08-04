package com.termlink.app.codex.ui

import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Real accessibility click against CodexScreen's production attachment chip. */
@RunWith(AndroidJUnit4::class)
class CodexMediaProgressUiInstrumentationTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    @Before
    fun setUp() {
        instrumentation.uiAutomation.executeShellCommand("input keyevent 224").use { }
        instrumentation.uiAutomation.executeShellCommand("wm dismiss-keyguard").use { }
        instrumentation.uiAutomation.executeShellCommand(
            "am start -W -n com.termlink.app/.codex.ui.CodexMediaProgressTestActivity"
        ).use { }
        awaitRoot { findNodes(it) { node -> node.contentDescription?.contains("打开") == true && node.contentDescription?.contains("proof.png") == true } .isNotEmpty() }
    }

    @After
    fun tearDown() {
        instrumentation.uiAutomation.executeShellCommand("input keyevent 4").use { }
    }

    @Test
    fun clickingAttachmentRendersVisibleDownloadProgress() {
        val root = awaitRoot { findNodes(it) { node -> node.contentDescription?.contains("打开") == true && node.contentDescription?.contains("proof.png") == true } .isNotEmpty() }
        val descriptionNode = findNodes(root) { node ->
            node.contentDescription?.contains("打开") == true && node.contentDescription?.contains("proof.png") == true
        }.firstOrNull() ?: error("media attachment chip was not exposed to accessibility")
        var attachment: AccessibilityNodeInfo? = descriptionNode
        while (attachment != null && !attachment.isClickable) {
            attachment = attachment.parent
        }
        val clickableAttachment = attachment ?: error("media attachment chip had no clickable accessibility ancestor")
        assertTrue("media attachment chip click was rejected", clickableAttachment.performAction(AccessibilityNodeInfo.ACTION_CLICK))

        val progressRoot = awaitRoot {
            findNodes(it) { node ->
                node.contentDescription?.contains("50%") == true || node.text?.toString() == "50%"
            }.isNotEmpty()
        }
        assertTrue(
            "visible progress was not rendered after the real attachment click",
            findNodes(progressRoot) { node ->
                node.contentDescription?.contains("50%") == true || node.text?.toString() == "50%"
            }.isNotEmpty()
        )
    }

    private fun awaitRoot(predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10)
        var lastRoot: AccessibilityNodeInfo? = null
        while (System.nanoTime() < deadline) {
            val root = instrumentation.uiAutomation.rootInActiveWindow
            if (root != null && root.packageName == "com.termlink.app") {
                lastRoot = root
                if (predicate(root)) return root
            }
            Thread.sleep(100L)
        }
        error("Timed out waiting for media progress UI; root=${lastRoot?.let(::describeTree)}")
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

    private fun describeTree(root: AccessibilityNodeInfo): String =
        findNodes(root) { it.text != null || it.contentDescription != null }
            .joinToString(" | ") { "${it.className}:${it.text ?: it.contentDescription}" }
}
