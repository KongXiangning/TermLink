package com.termlink.app.codex.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import com.termlink.app.codex.domain.CodexHistoryCacheLoadState
import com.termlink.app.codex.domain.CodexHistoryCacheUiState
import com.termlink.app.codex.domain.CodexHistoryNetworkSyncState
import com.termlink.app.codex.domain.CodexHistoryNetworkSyncUiState
import com.termlink.app.codex.domain.CodexUiState

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
    fun readyCacheDoesNotShowBlocking正文LoadingDuringNetworkSync() {
        val cache = CodexHistoryCacheUiState(
            conversationId = "conv-1",
            loadState = CodexHistoryCacheLoadState.READY,
            complete = true,
            itemCount = 2
        )
        val network = CodexHistoryNetworkSyncUiState(
            conversationId = "conv-1",
            state = CodexHistoryNetworkSyncState.SYNCING
        )

        assertNull(
            codexHistoryBodyHydrationLabel(
                cacheState = cache,
                networkState = network,
                hasConversation = true,
                hasMessages = true,
                hasHealthyLive = false
            )
        )
        assertEquals(
            "服务端历史：同步中…",
            codexHistoryNetworkHydrationLabel(
                networkState = network,
                hasConversation = true,
                cacheReady = true,
                hasHealthyLive = false
            )
        )
    }

    @Test
    fun missingCacheClearlyNamesLocalAndRemoteStates() {
        val cache = CodexHistoryCacheUiState(
            conversationId = "conv-2",
            loadState = CodexHistoryCacheLoadState.MISSING
        )
        val network = CodexHistoryNetworkSyncUiState(
            conversationId = "conv-2",
            state = CodexHistoryNetworkSyncState.REPAIRING
        )
        assertNull(
            codexHistoryNetworkHydrationLabel(
                networkState = CodexHistoryNetworkSyncUiState(
                    conversationId = "conv-2",
                    state = CodexHistoryNetworkSyncState.SYNCED
                ),
                hasConversation = true,
                cacheReady = false,
                hasHealthyLive = false
            )
        )
        assertEquals(
            "本地无缓存，正在从服务端恢复…",
            codexHistoryBodyHydrationLabel(
                cacheState = cache,
                networkState = network,
                hasConversation = true,
                hasMessages = false,
                hasHealthyLive = false
            )
        )
    }

    @Test
    fun completeEmptyCacheIsReadyAndDoesNotShowLoadingCopy() {
        val cache = CodexHistoryCacheUiState(
            conversationId = "empty-conv",
            loadState = CodexHistoryCacheLoadState.READY,
            complete = true,
            itemCount = 0
        )
        val network = CodexHistoryNetworkSyncUiState(
            conversationId = "empty-conv",
            state = CodexHistoryNetworkSyncState.SYNCED
        )
        assertNull(
            codexHistoryBodyHydrationLabel(
                cacheState = cache,
                networkState = network,
                hasConversation = true,
                hasMessages = false,
                hasHealthyLive = false
            )
        )
        assertNull(
            codexHistoryNetworkHydrationLabel(
                networkState = network,
                hasConversation = true,
                cacheReady = true,
                hasHealthyLive = false
            )
        )
    }

    @Test
    fun networkFailureDoesNotChangeReadyCacheState() {
        val cache = CodexHistoryCacheUiState(
            conversationId = "conv-3",
            loadState = CodexHistoryCacheLoadState.READY,
            complete = true,
            itemCount = 5
        )
        val before = CodexUiState(
            activeConversationId = "conv-3",
            historyCacheState = cache,
            historyNetworkSyncState = CodexHistoryNetworkSyncUiState(
                conversationId = "conv-3",
                state = CodexHistoryNetworkSyncState.SYNCING
            )
        )
        val after = before.copy(
            historyNetworkSyncState = before.historyNetworkSyncState.copy(
                state = CodexHistoryNetworkSyncState.FAILED
            )
        )
        assertEquals(cache, after.historyCacheState)
        assertEquals(CodexHistoryNetworkSyncState.FAILED, after.historyNetworkSyncState.state)
    }
}
