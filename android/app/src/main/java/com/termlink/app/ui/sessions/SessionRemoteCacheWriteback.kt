package com.termlink.app.ui.sessions

import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType

internal data class SessionRemoteCacheWritebackCandidate(
    val profile: ServerProfile,
    val sessions: List<SessionSummary>,
    val hasError: Boolean
)

internal object SessionRemoteCacheWriteback {

    fun apply(
        groups: List<SessionRemoteCacheWritebackCandidate>,
        fetchedAt: Long,
        replaceProfile: (ServerProfile, List<SessionSummary>, Long) -> Unit
    ): Int {
        var appliedCount = 0
        groups.forEach { group ->
            if (group.profile.terminalType != TerminalType.TERMLINK_WS || group.hasError) {
                return@forEach
            }
            replaceProfile(group.profile, group.sessions, fetchedAt)
            appliedCount += 1
        }
        return appliedCount
    }
}
