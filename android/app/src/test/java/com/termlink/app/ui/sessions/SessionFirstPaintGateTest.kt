package com.termlink.app.ui.sessions

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionFirstPaintGateTest {

    @Test
    fun rejectsOldViewCallbackAfterNewViewCreated() {
        assertFalse(
            SessionFirstPaintGate.shouldApply(
                isLatestRefreshRequest = true,
                isViewActive = true,
                callbackViewGeneration = 1,
                currentViewGeneration = 2,
                hasCompletedInitialLocalFirstPaint = false
            )
        )
    }

    @Test
    fun allowsCurrentViewFirstPaintWhenGenerationMatches() {
        assertTrue(
            SessionFirstPaintGate.shouldApply(
                isLatestRefreshRequest = true,
                isViewActive = true,
                callbackViewGeneration = 2,
                currentViewGeneration = 2,
                hasCompletedInitialLocalFirstPaint = false
            )
        )
    }

    @Test
    fun rejectsWhenCurrentViewAlreadyCompletedFirstPaint() {
        assertFalse(
            SessionFirstPaintGate.shouldApply(
                isLatestRefreshRequest = true,
                isViewActive = true,
                callbackViewGeneration = 2,
                currentViewGeneration = 2,
                hasCompletedInitialLocalFirstPaint = true
            )
        )
    }

    @Test
    fun rejectsStaleRefreshEvenWhenGenerationMatches() {
        assertFalse(
            SessionFirstPaintGate.shouldApply(
                isLatestRefreshRequest = false,
                isViewActive = true,
                callbackViewGeneration = 2,
                currentViewGeneration = 2,
                hasCompletedInitialLocalFirstPaint = false
            )
        )
    }
}
