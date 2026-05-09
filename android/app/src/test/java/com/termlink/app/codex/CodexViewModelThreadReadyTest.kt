package com.termlink.app.codex

import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelThreadReadyTest {

    @Test
    fun threadReadyKeepsOptimisticUserTailBeforeAckOnFreshThread() {
        val localUserMessage = ChatMessage(
            id = "local-user-1",
            role = ChatMessage.Role.USER,
            content = "please writer thirty short lines about snapshot race debug"
        )
        val state = CodexUiState(
            threadId = null,
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "pending")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "thread-123",
            resumed = false,
            state = state
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "pending"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadReadyStillClearsNonOptimisticMessagesWhenNotResumed() {
        val state = CodexUiState(
            threadId = null,
            currentTurnId = null,
            messages = listOf(
                ChatMessage(
                    id = "assistant-1",
                    role = ChatMessage.Role.ASSISTANT,
                    content = ""
                )
            ),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "stale")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "thread-456",
            resumed = false,
            state = state
        )

        assertTrue(transition.messages.isEmpty())
        assertEquals(CodexRuntimePanelState(visible = true), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadReadyKeepsOptimisticUserTailAcrossKnownNewThreadTransition() {
        val localUserMessage = ChatMessage(
            id = "local-user-2",
            role = ChatMessage.Role.USER,
            content = "continue after plan mode contamination"
        )
        val state = CodexUiState(
            threadId = "plan-thread-1",
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "waiting")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "fresh-thread-2",
            resumed = false,
            state = state,
            allowThreadIdSwitch = true
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "waiting"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadStartedKeepsOptimisticUserTailAcrossKnownNewThreadTransition() {
        val localUserMessage = ChatMessage(
            id = "local-user-3",
            role = ChatMessage.Role.USER,
            content = "after plan"
        )
        val state = CodexUiState(
            threadId = "plan-thread-1",
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "streaming")
        )

        val transition = buildThreadStartedUiTransition(
            startedThreadId = "fresh-thread-2",
            state = state,
            allowThreadIdSwitch = true
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "streaming"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }
}
