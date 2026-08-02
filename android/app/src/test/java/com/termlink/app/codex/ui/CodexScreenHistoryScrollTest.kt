package com.termlink.app.codex.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexScreenHistoryScrollTest {
    @Test
    fun initialListCompositionDoesNotForceScrollToTop() {
        assertFalse(
            shouldReturnThreadHistoryToTopAfterRefresh(
                refreshWasActive = false,
                previousTopEntryId = null,
                currentTopEntryId = "thread-new"
            )
        )
    }

    @Test
    fun completedRefreshWithSameTopEntryKeepsCurrentScrollPosition() {
        assertFalse(
            shouldReturnThreadHistoryToTopAfterRefresh(
                refreshWasActive = true,
                previousTopEntryId = "thread-existing",
                currentTopEntryId = "thread-existing"
            )
        )
    }

    @Test
    fun completedRefreshWithNewTopEntryReturnsToTop() {
        assertTrue(
            shouldReturnThreadHistoryToTopAfterRefresh(
                refreshWasActive = true,
                previousTopEntryId = "thread-existing",
                currentTopEntryId = "thread-new"
            )
        )
    }

    @Test
    fun emptyOrFailedRefreshDoesNotReturnToTop() {
        assertFalse(
            shouldReturnThreadHistoryToTopAfterRefresh(
                refreshWasActive = true,
                previousTopEntryId = "thread-existing",
                currentTopEntryId = null
            )
        )
        assertFalse(
            shouldReturnThreadHistoryToTopAfterRefresh(
                refreshWasActive = true,
                previousTopEntryId = "thread-existing",
                currentTopEntryId = ""
            )
        )
    }
}
