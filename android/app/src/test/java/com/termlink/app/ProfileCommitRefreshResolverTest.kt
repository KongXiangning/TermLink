package com.termlink.app

import com.termlink.app.data.TerminalType
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileCommitRefreshResolverTest {

    @Test
    fun termlinkWsOnTerminalScreenInvalidatesAndReloads() {
        val decision = ProfileCommitRefreshResolver.resolve(
            isTerminalScreen = true,
            terminalType = TerminalType.TERMLINK_WS
        )

        assertTrue(decision.invalidateClientCertPreferences)
        assertTrue(decision.reloadTerminal)
        assertTrue(decision.resetBridgeStatus)
    }

    @Test
    fun externalWebOnTerminalScreenReloadsWithoutClientCertInvalidation() {
        val decision = ProfileCommitRefreshResolver.resolve(
            isTerminalScreen = true,
            terminalType = TerminalType.EXTERNAL_WEB
        )

        assertFalse(decision.invalidateClientCertPreferences)
        assertTrue(decision.reloadTerminal)
        assertFalse(decision.resetBridgeStatus)
    }

    @Test
    fun nonTerminalScreenSkipsReload() {
        val decision = ProfileCommitRefreshResolver.resolve(
            isTerminalScreen = false,
            terminalType = TerminalType.EXTERNAL_WEB
        )

        assertFalse(decision.invalidateClientCertPreferences)
        assertFalse(decision.reloadTerminal)
        assertFalse(decision.resetBridgeStatus)
    }
}
