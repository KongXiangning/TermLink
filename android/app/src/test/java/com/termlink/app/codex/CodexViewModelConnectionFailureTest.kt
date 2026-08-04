package com.termlink.app.codex

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelConnectionFailureTest {
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
