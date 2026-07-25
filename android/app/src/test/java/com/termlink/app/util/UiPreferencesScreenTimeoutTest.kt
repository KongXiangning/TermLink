package com.termlink.app.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UiPreferencesScreenTimeoutTest {

    @Test
    fun systemProgressUsesSystemTimeout() {
        assertNull(UiPreferences.screenTimeoutMillisForProgress(UiPreferences.SCREEN_TIMEOUT_SYSTEM_PROGRESS))
    }

    @Test
    fun customProgressUsesThirtySecondSteps() {
        assertEquals(30_000L, UiPreferences.screenTimeoutMillisForProgress(1))
        assertEquals(60_000L, UiPreferences.screenTimeoutMillisForProgress(2))
        assertEquals(600_000L, UiPreferences.screenTimeoutMillisForProgress(20))
    }

    @Test
    fun outOfRangeProgressIsClamped() {
        assertNull(UiPreferences.screenTimeoutMillisForProgress(-10))
        assertEquals(30_000L, UiPreferences.screenTimeoutMillisForProgress(1))
        assertEquals(600_000L, UiPreferences.screenTimeoutMillisForProgress(999))
    }

    @Test
    fun onlyValuesLongerThanSystemExtendForegroundScreenOn() {
        assertNull(
            UiPreferences.effectiveForegroundScreenTimeoutMillis(
                configuredMillis = null,
                systemMillis = 30_000L
            )
        )
        assertNull(
            UiPreferences.effectiveForegroundScreenTimeoutMillis(
                configuredMillis = 30_000L,
                systemMillis = 600_000L
            )
        )
        assertNull(
            UiPreferences.effectiveForegroundScreenTimeoutMillis(
                configuredMillis = 600_000L,
                systemMillis = 600_000L
            )
        )
        assertEquals(
            600_000L,
            UiPreferences.effectiveForegroundScreenTimeoutMillis(
                configuredMillis = 600_000L,
                systemMillis = 30_000L
            )
        )
    }
}
