package com.termlink.app.web

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class WebViewClientCertCacheInvalidatorTest {

    @Test
    fun invalidateRunsCompletionAfterPlatformClearCompletes() {
        val events = mutableListOf<String>()
        var pendingCallback: Runnable? = null
        val invalidator = WebViewClientCertCacheInvalidator { callback ->
            events.add("clear-start")
            pendingCallback = callback
        }

        invalidator.invalidate {
            events.add("reload")
        }

        assertEquals(listOf("clear-start"), events)
        assertNotNull(pendingCallback)

        pendingCallback?.run()

        assertEquals(listOf("clear-start", "reload"), events)
    }

    @Test
    fun concurrentInvalidationsCollapseIntoOneClearAndRunLatestActionsAfterCompletion() {
        val events = mutableListOf<String>()
        var clearCount = 0
        var pendingCallback: Runnable? = null
        val invalidator = WebViewClientCertCacheInvalidator { callback ->
            clearCount += 1
            pendingCallback = callback
            events.add("clear-$clearCount")
        }

        invalidator.invalidate {
            events.add("reload-profile-switch")
        }
        invalidator.invalidate {
            events.add("reload-save")
        }

        assertEquals(1, clearCount)
        assertEquals(listOf("clear-1"), events)

        pendingCallback?.run()

        assertEquals(
            listOf("clear-1", "reload-profile-switch", "reload-save"),
            events
        )
    }

    @Test
    fun invalidateWithoutCompletionStillClearsPlatformCache() {
        var clearCount = 0
        var pendingCallback: Runnable? = null
        val invalidator = WebViewClientCertCacheInvalidator { callback ->
            clearCount += 1
            pendingCallback = callback
        }

        invalidator.invalidate()

        assertEquals(1, clearCount)
        assertNotNull(pendingCallback)

        pendingCallback?.run()
        assertEquals(1, clearCount)
    }
}
