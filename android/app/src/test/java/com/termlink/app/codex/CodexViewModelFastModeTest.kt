package com.termlink.app.codex

import com.termlink.app.codex.data.CodexEffectiveConfig
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.NextTurnOverrides
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelFastModeTest {
    @Test
    fun fastModeUsesDesktopCompatibleLowReasoningEffort() {
        assertEquals("low", CODEX_FAST_MODE_REASONING_EFFORT)
        assertTrue(isFastReasoningEffort(" LOW "))
        assertFalse(isFastReasoningEffort("medium"))
        assertFalse(isFastReasoningEffort(null))
    }

    @Test
    fun enablingFastModePreservesOtherNextTurnOverrides() {
        val state = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(
                model = "gpt-5.6-sol",
                sandbox = "workspace-write",
                approvalPolicy = "on-request",
                permissionProfile = ":workspace"
            )
        )

        val fast = nextTurnOverridesForFastModeToggle(state)

        assertEquals("low", fast.reasoningEffort)
        assertEquals("gpt-5.6-sol", fast.model)
        assertEquals("workspace-write", fast.sandbox)
        assertEquals("on-request", fast.approvalPolicy)
        assertEquals(":workspace", fast.permissionProfile)
    }

    @Test
    fun disablingFastModeClearsOnlyTheReasoningOverride() {
        val state = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(
                reasoningEffort = "low",
                model = "gpt-5.6-sol",
                useConfigPermissions = true
            )
        )

        val normal = nextTurnOverridesForFastModeToggle(state)

        assertNull(normal.reasoningEffort)
        assertEquals("gpt-5.6-sol", normal.model)
        assertTrue(normal.useConfigPermissions)
    }

    @Test
    fun fastModeUsesExistingRememberedOverrideEncoding() {
        val expected = NextTurnOverrides(
            model = "gpt-5.6-sol",
            reasoningEffort = CODEX_FAST_MODE_REASONING_EFFORT,
            sandbox = "workspace-write"
        )

        assertEquals(
            expected,
            decodeRememberedNextTurnOverrides(encodeRememberedNextTurnOverrides(expected))
        )
    }

    @Test
    fun onlyAnExplicitFastOverrideActivatesFastIndicator() {
        val explicitFastState = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(reasoningEffort = "low"),
            ownerCurrentCodexConfig = CodexEffectiveConfig(
                model = "gpt-5.6-sol",
                reasoningEffort = "low",
                personality = null,
                approvalPolicy = null,
                sandboxMode = null
            )
        )
        val defaultLowState = explicitFastState.copy(
            nextTurnOverrides = NextTurnOverrides()
        )

        assertTrue(isFastModeActive(explicitFastState))
        assertFalse(isFastModeActive(defaultLowState))
    }

    @Test
    fun explicitFastOverrideSurvivesMatchingOwnerConfirmation() {
        val confirmed = reconcileOwnerConfirmedOverrides(
            overrides = NextTurnOverrides(reasoningEffort = "low"),
            ownerConfig = CodexEffectiveConfig(
                model = "gpt-5.6-sol",
                reasoningEffort = "low",
                personality = null,
                approvalPolicy = null,
                sandboxMode = null
            )
        )

        assertEquals("low", confirmed.reasoningEffort)
    }
}
