package com.termlink.app.codex

import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelHydrateFollowTest {

    @Test
    fun launchHydratePrefersExplicitTargetThread() {
        assertEquals(
            "thread-target",
            resolveLaunchHydrateThreadRequest(
                pendingLaunchHydrate = true,
                requestedThreadId = " thread-target ",
                observedThreadId = "thread-server",
                inFlightThreadId = null
            )
        )
    }

    @Test
    fun launchHydrateFallsBackToObservedRunningThread() {
        assertEquals(
            "thread-server",
            resolveLaunchHydrateThreadRequest(
                pendingLaunchHydrate = true,
                requestedThreadId = null,
                observedThreadId = " thread-server ",
                inFlightThreadId = null
            )
        )
    }

    @Test
    fun launchHydrateDoesNotDuplicateInFlightRead() {
        assertNull(
            resolveLaunchHydrateThreadRequest(
                pendingLaunchHydrate = true,
                requestedThreadId = "thread-server",
                observedThreadId = "thread-server",
                inFlightThreadId = " thread-server "
            )
        )
    }

    @Test
    fun threadReadMergeKeepsRunningTailAfterCanonicalHydrate() {
        val canonicalUser = ChatMessage(
            id = "canonical-user",
            role = ChatMessage.Role.USER,
            content = "run current task"
        )
        val canonicalAssistant = ChatMessage(
            id = "canonical-assistant",
            role = ChatMessage.Role.ASSISTANT,
            content = "Working on it."
        )
        val liveTail = ChatMessage(
            id = "live-tail",
            role = ChatMessage.Role.ASSISTANT,
            content = "Still streaming new output",
            streaming = true
        )
        val state = CodexUiState(
            threadId = "thread-live",
            currentTurnId = "turn-running",
            messages = listOf(canonicalUser, canonicalAssistant, liveTail)
        )

        val transition = buildThreadReadMergeTransition(
            incomingThreadId = "thread-live",
            canonicalMessages = listOf(canonicalUser, canonicalAssistant),
            state = state
        )

        assertEquals("thread-live", transition.threadId)
        assertEquals("turn-running", transition.currentTurnId)
        assertEquals(3, transition.messages.size)
        assertEquals("Still streaming new output", transition.messages.last().content)
        assertTrue(transition.messages.last().streaming)
    }

    @Test
    fun threadReadMergeDoesNotInventDifferentThreadWhenResponseOmitsId() {
        val canonicalAssistant = ChatMessage(
            id = "canonical-assistant",
            role = ChatMessage.Role.ASSISTANT,
            content = "Recovered transcript"
        )
        val state = CodexUiState(
            threadId = "thread-live",
            currentTurnId = "turn-running",
            messages = emptyList()
        )

        val transition = buildThreadReadMergeTransition(
            incomingThreadId = null,
            canonicalMessages = listOf(canonicalAssistant),
            state = state
        )

        assertEquals("thread-live", transition.threadId)
        assertEquals("turn-running", transition.currentTurnId)
        assertEquals(listOf(canonicalAssistant), transition.messages)
    }
}
