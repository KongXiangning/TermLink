package com.termlink.app.ui.sessions

import com.termlink.app.data.CachedProfileSessionList
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType

internal data class FirstPaintSessionGroup(
    val profile: ServerProfile,
    val sessions: List<SessionSummary>
)

internal object SessionCacheGroupBuilder {

    fun build(
        profiles: List<ServerProfile>,
        cachedProfiles: List<CachedProfileSessionList>,
        externalSessionsByProfileId: Map<String, List<SessionSummary>> = emptyMap()
    ): List<FirstPaintSessionGroup> {
        if (profiles.isEmpty()) {
            return emptyList()
        }
        val cachedByProfileId = cachedProfiles.associateBy { it.profileId }
        return buildList {
            profiles.forEach { profile ->
                when (profile.terminalType) {
                    TerminalType.TERMLINK_WS -> {
                        val cached = cachedByProfileId[profile.id.trim()] ?: return@forEach
                        add(
                            FirstPaintSessionGroup(
                                profile = profile,
                                sessions = cached.sessions
                            )
                        )
                    }
                    TerminalType.EXTERNAL_WEB -> {
                        val localSessions = externalSessionsByProfileId[profile.id.trim()]
                            ?: return@forEach
                        add(
                            FirstPaintSessionGroup(
                                profile = profile,
                                sessions = localSessions
                            )
                        )
                    }
                }
            }
        }
    }
}
