package com.termlink.app

import com.termlink.app.data.TerminalType

data class ProfileCommitRefreshDecision(
    val invalidateClientCertPreferences: Boolean,
    val reloadTerminal: Boolean,
    val resetBridgeStatus: Boolean
)

object ProfileCommitRefreshResolver {

    fun resolve(
        isTerminalScreen: Boolean,
        terminalType: TerminalType
    ): ProfileCommitRefreshDecision {
        val isTermlinkWs = terminalType == TerminalType.TERMLINK_WS
        return ProfileCommitRefreshDecision(
            invalidateClientCertPreferences = isTermlinkWs,
            reloadTerminal = isTerminalScreen,
            resetBridgeStatus = isTerminalScreen && isTermlinkWs
        )
    }
}
