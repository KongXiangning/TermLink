package com.termlink.app.codex

import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.NextTurnOverrides
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelHydrateFollowTest {

    @Test
    fun rememberedTaskConfigRoundTripsAllExplicitChoices() {
        val expected = NextTurnOverrides(
            model = "gpt-5.6-sol",
            reasoningEffort = "high",
            approvalPolicy = "never",
            approvalsReviewer = "user",
            permissionProfile = ":danger-full-access"
        )

        assertEquals(
            expected,
            decodeRememberedNextTurnOverrides(encodeRememberedNextTurnOverrides(expected))
        )
    }

    @Test
    fun rememberedTaskConfigSupportsConfigTomlPermissionMode() {
        val expected = NextTurnOverrides(useConfigPermissions = true)

        assertEquals(
            expected,
            decodeRememberedNextTurnOverrides(encodeRememberedNextTurnOverrides(expected))
        )
    }

    @Test
    fun rememberedTaskConfigTreatsEmptyAndCorruptRecordsAsNoSelection() {
        assertNull(encodeRememberedNextTurnOverrides(NextTurnOverrides()))
        assertEquals(NextTurnOverrides(), decodeRememberedNextTurnOverrides(null))
        assertEquals(NextTurnOverrides(), decodeRememberedNextTurnOverrides("not-json"))
    }

    @Test
    fun rememberedTaskConfigKeyIsProfileAndCanonicalTaskScoped() {
        assertEquals(
            "profile-a::task-a",
            rememberedTaskConfigKey(" profile-a ", " task-a ")
        )
        assertFalse(
            rememberedTaskConfigKey("profile-a", "task-a") ==
                rememberedTaskConfigKey("profile-a", "task-b")
        )
        assertFalse(
            rememberedTaskConfigKey("profile-a", "task-a") ==
                rememberedTaskConfigKey("profile-b", "task-a")
        )
        assertNull(rememberedTaskConfigKey(null, "task-a"))
        assertNull(rememberedTaskConfigKey("profile-a", null))
    }

    @Test
    fun firstThreadBindingPreservesChoicesMadeBeforeNewTaskIdExists() {
        val pendingNewTaskChoice = NextTurnOverrides(model = "gpt-5.6-terra")

        assertEquals(
            pendingNewTaskChoice,
            overridesForConversationSwitch(
                currentConversationId = null,
                targetConversationId = "new-task",
                currentOverrides = pendingNewTaskChoice,
                rememberedOverrides = NextTurnOverrides()
            )
        )
    }

    @Test
    fun existingTaskBindingLoadsItsRememberedChoices() {
        val remembered = NextTurnOverrides(model = "gpt-5.6-sol", reasoningEffort = "high")

        assertEquals(
            remembered,
            overridesForConversationSwitch(
                currentConversationId = "task-a",
                targetConversationId = "task-b",
                currentOverrides = NextTurnOverrides(model = "gpt-5.6-terra"),
                rememberedOverrides = remembered
            )
        )
    }

    @Test
    fun canonicalRunningTurnDrivesRuntimeOnlyWithoutOwnerSurface() {
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "running",
                currentTurnId = "turn-1",
                source = "canonical-explicit-active"
            ),
            projectCanonicalTurnRuntime(
                turnStatus = "inProgress",
                turnId = "turn-1",
                matchingOwnerSurfaceAvailable = false
            )
        )
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "running",
                currentTurnId = "turn-2",
                source = "canonical-explicit-active"
            ),
            projectCanonicalTurnRuntime(
                turnStatus = "in_progress",
                turnId = "turn-2",
                matchingOwnerSurfaceAvailable = false
            )
        )
    }

    @Test
    fun canonicalTerminalTurnClearsRuntimeWithoutOwnerSurface() {
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "idle",
                currentTurnId = null,
                source = "canonical-explicit-terminal"
            ),
            projectCanonicalTurnRuntime(
                turnStatus = "completed",
                turnId = "turn-1",
                matchingOwnerSurfaceAvailable = false
            )
        )
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "idle",
                currentTurnId = null,
                source = "canonical-explicit-terminal"
            ),
            projectCanonicalTurnRuntime(
                turnStatus = "interrupted",
                turnId = "turn-2",
                matchingOwnerSurfaceAvailable = false
            )
        )
    }

    @Test
    fun ownerSurfaceAndUnknownCanonicalStatusNeverOverrideRuntime() {
        assertNull(
            projectCanonicalTurnRuntime(
                turnStatus = "inProgress",
                turnId = "turn-1",
                matchingOwnerSurfaceAvailable = true
            )
        )
        assertNull(
            projectCanonicalTurnRuntime(
                turnStatus = "queued",
                turnId = "turn-1",
                matchingOwnerSurfaceAvailable = false
            )
        )
        assertNull(
            projectCanonicalTurnRuntime(
                turnStatus = null,
                turnId = null,
                matchingOwnerSurfaceAvailable = false
            )
        )
    }

    @Test
    fun canonicalActivityOverridesStaleInterruptedStatusUntilQuiet() {
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "running",
                currentTurnId = "turn-external",
                source = "canonical-activity"
            ),
            projectCanonicalTurnRuntime(
                threadStatus = "notLoaded",
                turnStatus = "interrupted",
                turnId = "turn-external",
                matchingOwnerSurfaceAvailable = false,
                canonicalSnapshotChanged = true
            )
        )
        assertEquals(
            "running",
            projectCanonicalTurnRuntime(
                threadStatus = "notLoaded",
                turnStatus = "interrupted",
                turnId = "turn-external",
                matchingOwnerSurfaceAvailable = false,
                millisSinceCanonicalChange = 5_000L,
                activityWindowMillis = 30_000L
            )?.status
        )
        assertEquals(
            "idle",
            projectCanonicalTurnRuntime(
                threadStatus = "notLoaded",
                turnStatus = "interrupted",
                turnId = "turn-external",
                matchingOwnerSurfaceAvailable = false,
                millisSinceCanonicalChange = 30_001L,
                activityWindowMillis = 30_000L
            )?.status
        )
    }

    @Test
    fun finalAnswerEndsCanonicalActivityFallbackImmediately() {
        assertEquals(
            CanonicalTurnRuntimeProjection(
                status = "idle",
                currentTurnId = null,
                source = "canonical-final-answer"
            ),
            projectCanonicalTurnRuntime(
                threadStatus = "notLoaded",
                turnStatus = "interrupted",
                turnId = "turn-external",
                matchingOwnerSurfaceAvailable = false,
                latestAgentPhase = "final_answer",
                canonicalSnapshotChanged = true,
                millisSinceCanonicalChange = 0L
            )
        )
    }

    @Test
    fun canonicalAgentPhaseClassifiesOnlyNonTerminalWorkAsActivity() {
        assertTrue(canonicalAgentPhaseIndicatesActivity("commentary"))
        assertTrue(canonicalAgentPhaseIndicatesActivity("analysis"))
        assertTrue(canonicalAgentPhaseIndicatesActivity("tool_call"))
        assertFalse(canonicalAgentPhaseIndicatesActivity("final_answer"))
        assertFalse(canonicalAgentPhaseIndicatesActivity(null))
    }

    @Test
    fun staleCodexStateCannotOverwriteRecentCanonicalActivity() {
        assertTrue(
            shouldPreserveCanonicalActivityRuntime(
                incomingStatus = "idle",
                currentStatus = "running",
                matchingOwnerSurfaceAvailable = false,
                activityThreadId = "thread-a",
                targetThreadId = "thread-a",
                millisSinceCanonicalActivity = 5_000L
            )
        )
        assertFalse(
            shouldPreserveCanonicalActivityRuntime(
                incomingStatus = "idle",
                currentStatus = "running",
                matchingOwnerSurfaceAvailable = true,
                activityThreadId = "thread-a",
                targetThreadId = "thread-a",
                millisSinceCanonicalActivity = 5_000L
            )
        )
        assertFalse(
            shouldPreserveCanonicalActivityRuntime(
                incomingStatus = "idle",
                currentStatus = "running",
                matchingOwnerSurfaceAvailable = false,
                activityThreadId = "thread-a",
                targetThreadId = "thread-a",
                millisSinceCanonicalActivity = 30_001L
            )
        )
        assertFalse(
            shouldPreserveCanonicalActivityRuntime(
                incomingStatus = "running",
                currentStatus = "running",
                matchingOwnerSurfaceAvailable = false,
                activityThreadId = "thread-a",
                targetThreadId = "thread-a",
                millisSinceCanonicalActivity = 5_000L
            )
        )
    }

    @Test
    fun activeCanonicalItemKeepsLongRunningToolVisible() {
        assertEquals(
            "canonical-explicit-active",
            projectCanonicalTurnRuntime(
                threadStatus = "notLoaded",
                turnStatus = "interrupted",
                turnId = "turn-external",
                matchingOwnerSurfaceAvailable = false,
                hasActiveItem = true,
                millisSinceCanonicalChange = Long.MAX_VALUE
            )?.source
        )
    }

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

    @Test
    fun canonicalFollowFallbackRunsWhenIpcHasNoMatchingSurface() {
        assertTrue(
            shouldUseCanonicalThreadReadFallback(
                threadId = "task-current",
                activeConversationId = "task-current",
                ipcOnline = true,
                matchingSurfaceAvailable = false,
                millisSinceMatchingSurface = Long.MAX_VALUE,
                staleAfterMillis = 5_000L
            )
        )
    }

    @Test
    fun canonicalFollowFallbackYieldsToFreshMatchingIpcSurface() {
        assertFalse(
            shouldUseCanonicalThreadReadFallback(
                threadId = "task-current",
                activeConversationId = "task-current",
                ipcOnline = true,
                matchingSurfaceAvailable = true,
                millisSinceMatchingSurface = 1_000L,
                staleAfterMillis = 5_000L
            )
        )
        assertTrue(
            shouldUseCanonicalThreadReadFallback(
                threadId = "task-current",
                activeConversationId = "task-current",
                ipcOnline = true,
                matchingSurfaceAvailable = true,
                millisSinceMatchingSurface = 5_000L,
                staleAfterMillis = 5_000L
            )
        )
    }

    @Test
    fun canonicalFollowDoesNotReadAcrossSplitTaskIds() {
        assertFalse(
            shouldUseCanonicalThreadReadFallback(
                threadId = "task-current",
                activeConversationId = "task-other",
                ipcOnline = false,
                matchingSurfaceAvailable = false,
                millisSinceMatchingSurface = Long.MAX_VALUE,
                staleAfterMillis = 5_000L
            )
        )
        assertFalse(
            shouldApplyCanonicalThreadReadResponse(
                currentThreadId = "task-current",
                incomingThreadId = "task-other"
            )
        )
        assertTrue(
            shouldApplyCanonicalThreadReadResponse(
                currentThreadId = "task-current",
                incomingThreadId = "task-current"
            )
        )
    }
}
