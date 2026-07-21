package com.termlink.app.codex.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class CodexComposerInsetsTest {

    @Test
    fun noVisibleBottomInsetDoesNotCreateSyntheticComposerGap() {
        assertEquals(
            0,
            resolveComposerSafeBottomPaddingPx(
                reportedBottom = 0,
                legacyGestureBottom = 0
            )
        )
    }

    @Test
    fun reportedNavigationBarInsetIsPreserved() {
        assertEquals(
            72,
            resolveComposerSafeBottomPaddingPx(
                reportedBottom = 72,
                legacyGestureBottom = 0
            )
        )
    }

    @Test
    fun legacyGestureInsetIsUsedOnlyWhenItIsLarger() {
        assertEquals(
            48,
            resolveComposerSafeBottomPaddingPx(
                reportedBottom = 24,
                legacyGestureBottom = 48
            )
        )
    }
}
