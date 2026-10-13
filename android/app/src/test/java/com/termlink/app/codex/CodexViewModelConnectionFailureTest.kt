package com.termlink.app.codex

import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexPlanWorkflowState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.NextTurnOverrides
import com.termlink.app.codex.data.CodexIpcStatus
import com.termlink.app.codex.data.CodexFollowerMode
import com.termlink.app.codex.data.CodexIpcConversationSummary
import com.termlink.app.codex.network.WsEvent
import com.termlink.app.codex.network.isCurrentWebSocketEvent
import java.io.IOException
import java.net.ProtocolException
import javax.net.ssl.SSLHandshakeException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelConnectionFailureTest {
    @Test
    fun newThreadWaitingStateExpiresTheOldConversationHintWithoutARecoveryEvent() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-a", threadId = "conv-a", ipcOnline = false,
            connectionErrorMessage = "Socket failure", errorMessage = "Business error"
        ), "IPC operation unavailable")
        // newThread clears threadId before entering this helper; no send ACK or IPC event is needed.
        val waiting = prepareIpcStateForNewThread(state.copy(threadId = null))

        assertNull(waiting.activeConversationId)
        assertTrue(waiting.awaitingNewThreadIpcSurface)
        assertEquals(ConnectionState.CONNECTED, waiting.connectionState)
        assertNull(waiting.ipcOperationErrorMessage)
        assertNull(waiting.ipcOperationErrorConversationId)
        assertEquals(state.connectionErrorMessage, waiting.connectionErrorMessage)
        assertEquals(state.errorMessage, waiting.errorMessage)
    }

    @Test
    fun newThreadWithoutAnActiveSelectionAlsoExpiresAStaleOperationHint() {
        val state = CodexUiState(
            ipcOperationErrorMessage = "IPC operation unavailable",
            ipcOperationErrorConversationId = "conv-a",
            connectionErrorMessage = "Socket failure"
        )
        val waiting = prepareIpcStateForNewThread(state)

        assertFalse(waiting.awaitingNewThreadIpcSurface)
        assertNull(waiting.ipcOperationErrorMessage)
        assertNull(waiting.ipcOperationErrorConversationId)
        assertEquals(state.connectionErrorMessage, waiting.connectionErrorMessage)
    }

    @Test
    fun directCatalogSelectionExpiresThePreviousConversationHintBeforeSurfaceArrives() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-a", threadId = "conv-a", ipcOnline = false,
            connectionErrorMessage = "Socket failure", errorMessage = "Business error"
        ), "IPC operation unavailable")
        val selected = applyIpcConversationSelectionToUiState(state, conversation("conv-b"))

        assertEquals("conv-b", selected.activeConversationId)
        assertEquals("conv-b", selected.threadId)
        assertNull(selected.ipcSurfaceSnapshot)
        assertNull(selected.ipcOperationErrorMessage)
        assertNull(selected.ipcOperationErrorConversationId)
        assertEquals(state.connectionErrorMessage, selected.connectionErrorMessage)
        assertEquals(state.errorMessage, selected.errorMessage)
    }

    @Test
    fun directCatalogReselectionPreservesTheSameUnavailableConversationHint() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-a", threadId = "conv-a", ipcOnline = false
        ), "IPC operation unavailable")
        val selected = applyIpcConversationSelectionToUiState(state, conversation("conv-a"))

        assertEquals(state.ipcOperationErrorMessage, selected.ipcOperationErrorMessage)
        assertEquals("conv-a", selected.ipcOperationErrorConversationId)
    }

    private fun conversation(id: String) = CodexIpcConversationSummary(
        conversationId = id, status = "unknown", updatedAt = 0L, title = id, cwd = null,
        ownerKind = null, latestTurnId = null, itemCount = 0, hasActiveGoal = false,
        hasPendingApproval = false, hasPendingPlanAction = false, hasPendingUserInputAction = false
    )

    @Test
    fun ipcOperationHintExpiresWhenIpcRecoversWithoutWebSocketReconnect() {
        val unavailable = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-a",
            threadId = "conv-a",
            ipcOnline = false,
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        ), "IPC operation unavailable")
        assertEquals("IPC operation unavailable", unavailable.ipcOperationErrorMessage)
        val recovered = applyIpcStatusToUiState(
            unavailable,
            CodexIpcStatus(supported = true, online = true, clientId = "client-live", reason = null)
        )

        assertEquals(ConnectionState.CONNECTED, recovered.connectionState)
        assertNull(recovered.connectionErrorMessage)
        assertNull(recovered.ipcOperationErrorMessage)
    }

    @Test
    fun operationHintDoesNotLeakToAnotherConversationOnTheSameConnection() {
        val old = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-a",
            threadId = "conv-a",
            connectionErrorMessage = "Socket reconnecting"
        ), "IPC operation unavailable")
        val bound = applyIpcConversationBindingToUiState(old, "conv-b", NextTurnOverrides())
        val selected = preparePendingHistorySelectionUiState("conv-a", bound)

        assertEquals("conv-b", selected.activeConversationId)
        assertEquals(ConnectionState.CONNECTED, selected.connectionState)
        assertNull(bound.ipcOperationErrorMessage)
        assertNull(selected.ipcOperationErrorMessage)
        assertNull(selected.ipcOperationErrorConversationId)
        assertEquals("Socket reconnecting", selected.connectionErrorMessage)
    }

    @Test
    fun webSocketConnectedAndIpcOnlineAreNotEnoughWhenFollowerOperationsRemainUnavailable() {
        val unavailable = applyIpcOperationUnavailableToUiState(CodexUiState(
            activeConversationId = "conv-a", threadId = "conv-a", ipcOnline = false,
            followerModeEnabled = false, followerActiveSendAllowed = false,
            errorMessage = "Unauthorized",
            runtimePanel = CodexRuntimePanelState(warning = "Protocol error", warningTone = "error")
        ), "IPC operation unavailable")
        val connected = applyConnectionStateToUiState(unavailable, ConnectionState.CONNECTED)
        assertEquals(unavailable.ipcOperationErrorMessage, connected.ipcOperationErrorMessage)
        val ipcOnline = applyIpcStatusToUiState(connected,
            CodexIpcStatus(online = true, clientId = "client-live", reason = null))
        assertEquals(unavailable.ipcOperationErrorMessage, ipcOnline.ipcOperationErrorMessage)
        val recovered = applyFollowerModeToUiState(ipcOnline, CodexFollowerMode(true, true))
        assertNull(recovered.ipcOperationErrorMessage)
        assertEquals("Unauthorized", recovered.errorMessage)
        assertEquals(unavailable.runtimePanel, recovered.runtimePanel)
    }

    @Test
    fun successfulOperationOnlyClearsTheMatchingConversationHint() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            connectionState = ConnectionState.CONNECTED,
            activeConversationId = "conv-b", threadId = "conv-b",
            errorMessage = "Business error", connectionErrorMessage = "Socket failure"
        ), "IPC operation unavailable")

        assertEquals(state, clearIpcOperationErrorAfterSuccessfulSend(state, "conv-a"))
        assertEquals(state, clearIpcOperationErrorAfterSuccessfulSend(state, null))
        val cleared = clearIpcOperationErrorAfterSuccessfulSend(state, "conv-b")
        assertNull(cleared.ipcOperationErrorMessage)
        assertEquals(state.errorMessage, cleared.errorMessage)
        assertEquals(state.connectionErrorMessage, cleared.connectionErrorMessage)
    }

    @Test
    fun clearingSelectionExpiresTheOperationHintButPreservesTheTransportHint() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            activeConversationId = "conv-a", threadId = "conv-a",
            connectionErrorMessage = "Socket failure"
        ), "IPC operation unavailable")
        val cleared = clearIpcConversationSelectionFromUiState(state)

        assertNull(cleared.ipcOperationErrorMessage)
        assertNull(cleared.ipcOperationErrorConversationId)
        assertEquals("Socket failure", cleared.connectionErrorMessage)
    }

    @Test
    fun reselectingTheSameUnavailableConversationPreservesItsHint() {
        val state = applyIpcOperationUnavailableToUiState(CodexUiState(
            activeConversationId = "conv-a", threadId = "conv-a", ipcOnline = false
        ), "IPC operation unavailable")
        val bound = applyIpcConversationBindingToUiState(state, "conv-a", NextTurnOverrides())
        val selected = preparePendingHistorySelectionUiState("conv-a", bound)

        assertEquals(state.ipcOperationErrorMessage, selected.ipcOperationErrorMessage)
        assertEquals("conv-a", selected.ipcOperationErrorConversationId)
    }

    @Test
    fun recoveredTimeoutClearsItsConnectionHintWithoutLeavingRuntimeWarning() {
        val failed = applyWebSocketFailureToUiState(
            CodexUiState(connectionState = ConnectionState.CONNECTED),
            IOException("timeout"),
            null,
            "Reconnecting"
        )
        assertEquals("Reconnecting", failed.connectionErrorMessage)
        val recovered = applyConnectionStateToUiState(failed, ConnectionState.CONNECTED)

        assertNull(recovered.errorMessage)
        assertNull(recovered.connectionErrorMessage)
        assertEquals("", recovered.runtimePanel.warning)
    }

    @Test
    fun retryingDoesNotClearTheHintBeforeRecoverySucceeds() {
        var state = CodexUiState(connectionErrorMessage = "Reconnecting")
        for (nextState in listOf(ConnectionState.RECONNECTING, ConnectionState.CONNECTING, ConnectionState.ERROR)) {
            state = applyConnectionStateToUiState(state, nextState)
            assertEquals("Reconnecting", state.connectionErrorMessage)
        }
        assertNull(applyConnectionStateToUiState(state, ConnectionState.CONNECTED).connectionErrorMessage)
    }

    @Test
    fun recoveryPreservesBusinessErrorsEvenWhenTheyContainTransportWords() {
        val state = CodexUiState(
            errorMessage = "connection reset",
            runtimePanel = CodexRuntimePanelState(warning = "connection reset", warningTone = "error"),
            currentTurnId = "turn-live",
            planWorkflow = CodexPlanWorkflowState(phase = "planning")
        )
        val failed = applyWebSocketFailureToUiState(state, IOException("timeout"), null, "Reconnecting")
        val recovered = applyConnectionStateToUiState(failed, ConnectionState.CONNECTED)

        assertEquals(state.errorMessage, recovered.errorMessage)
        assertEquals(state.runtimePanel, recovered.runtimePanel)
        assertEquals(state.currentTurnId, recovered.currentTurnId)
        assertEquals(state.planWorkflow, recovered.planWorkflow)
        assertNull(recovered.connectionErrorMessage)
    }

    @Test
    fun authenticationTlsAndProtocolFailuresRemainVisibleAfterReconnect() {
        val failures = listOf(
            IOException("Unauthorized") to 401,
            IOException("Client registration is invalid or revoked") to 4403,
            IOException("timeout") to 1009,
            SSLHandshakeException("connection reset") to null,
            ProtocolException("Malformed response") to null
        )
        for ((throwable, code) in failures) {
            val failed = applyWebSocketFailureToUiState(CodexUiState(), throwable, code, "Reconnecting")
            val recovered = applyConnectionStateToUiState(failed, ConnectionState.CONNECTED)

            assertEquals(throwable.message, recovered.errorMessage)
            assertEquals(throwable.message, recovered.runtimePanel.warning)
            assertEquals("error", recovered.runtimePanel.warningTone)
            assertNull(recovered.connectionErrorMessage)
        }
    }

    @Test
    fun failuresWithoutAnExceptionMessageAreStillScopedToTheConnection() {
        val failed = applyWebSocketFailureToUiState(CodexUiState(), IOException(), null, "Reconnecting")
        val recovered = applyConnectionStateToUiState(failed, ConnectionState.CONNECTED)

        assertNull(recovered.errorMessage)
        assertNull(recovered.connectionErrorMessage)
        assertEquals("", recovered.runtimePanel.warning)
    }

    @Test
    fun queuedOldConnectionEventsCannotReintroduceErrorsAfterReconnect() {
        val staleEvents = listOf(
            WsEvent.Failure(IOException("timeout"), null, generation = 1),
            WsEvent.Closed(4403, "Client registration is invalid or revoked", generation = 1),
            WsEvent.Opened("http/1.1", generation = 1)
        )
        for (event in staleEvents) {
            assertFalse(isCurrentWebSocketEvent(event, generation = 2))
            assertTrue(isCurrentWebSocketEvent(event, generation = 1))
        }
    }

    @Test
    fun offlineConnectFailuresAreTransient() {
        assertTrue(
            isTransientWebSocketFailureMessage(
                "Failed to connect to /192.168.50.12:3010 (ENETUNREACH)",
                null
            )
        )
        assertTrue(isTransientWebSocketFailureMessage("No route to host", null))
        assertTrue(isTransientWebSocketFailureMessage("connect timed out", null))
    }

    @Test
    fun serverAndProtocolErrorsRemainVisible() {
        assertFalse(isTransientWebSocketFailureMessage("Unauthorized", 4401))
        assertFalse(isTransientWebSocketFailureMessage("CODEX_ENVELOPE_TOO_LARGE", 1009))
        assertFalse(isTransientWebSocketFailureMessage("Malformed response", null))
    }
}
