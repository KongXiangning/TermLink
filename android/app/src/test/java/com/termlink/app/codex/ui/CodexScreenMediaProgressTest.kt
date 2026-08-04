package com.termlink.app.codex.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CodexScreenMediaProgressTest {
    @Test
    fun matchingDownloadShowsUnknownProgressUntilHeadersArrive() {
        assertEquals(
            "…",
            codexMediaDownloadProgressLabel(
                attachmentHash = "A".repeat(64),
                downloadHash = "a".repeat(64),
                downloadedBytes = 0L,
                totalBytes = null
            )
        )
    }

    @Test
    fun matchingDownloadShowsClampedPercentage() {
        assertEquals(
            "50%",
            codexMediaDownloadProgressLabel(
                attachmentHash = "a".repeat(64),
                downloadHash = "A".repeat(64),
                downloadedBytes = 50L,
                totalBytes = 100L
            )
        )
        assertEquals(
            "100%",
            codexMediaDownloadProgressLabel(
                attachmentHash = "a".repeat(64),
                downloadHash = "a".repeat(64),
                downloadedBytes = 500L,
                totalBytes = 100L
            )
        )
    }

    @Test
    fun staleOrMissingHashDoesNotPaintProgressOnAnotherAttachment() {
        assertNull(
            codexMediaDownloadProgressLabel(
                attachmentHash = "a".repeat(64),
                downloadHash = "b".repeat(64),
                downloadedBytes = 50L,
                totalBytes = 100L
            )
        )
        assertNull(
            codexMediaDownloadProgressLabel(
                attachmentHash = null,
                downloadHash = "b".repeat(64),
                downloadedBytes = 50L,
                totalBytes = 100L
            )
        )
    }

    @Test
    fun liveEmptyConversationStillExplainsWhy正文IsNotVisible() {
        assertEquals(
            "历史正文：已同步，当前暂无可显示正文",
            codexHistoryHydrationLabel(
                syncState = "live",
                hasConversation = true,
                hasMessages = false
            )
        )
        assertNull(
            codexHistoryHydrationLabel(
                syncState = "live",
                hasConversation = true,
                hasMessages = true
            )
        )
    }
}
