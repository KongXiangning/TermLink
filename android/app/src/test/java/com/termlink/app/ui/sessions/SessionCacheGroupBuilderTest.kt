package com.termlink.app.ui.sessions

import com.termlink.app.data.AuthType
import com.termlink.app.data.CachedProfileSessionList
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionCacheGroupBuilderTest {

    @Test
    fun buildReturnsRemoteAndExternalGroupsInProfileOrder() {
        val profiles = listOf(
            createProfile(id = "remote-b", terminalType = TerminalType.TERMLINK_WS),
            createProfile(id = "external", terminalType = TerminalType.EXTERNAL_WEB),
            createProfile(id = "remote-a", terminalType = TerminalType.TERMLINK_WS)
        )

        val groups = SessionCacheGroupBuilder.build(
            profiles = profiles,
            cachedProfiles = listOf(
                createCachedProfile(profileId = "remote-a", sessionId = "a-1", fetchedAt = 100L),
                createCachedProfile(profileId = "remote-b", sessionId = "b-1", fetchedAt = 200L)
            ),
            externalSessionsByProfileId = mapOf(
                "external" to listOf(createSessionSummary(id = "external-1", timestamp = 300L))
            )
        )

        assertEquals(listOf("remote-b", "external", "remote-a"), groups.map { it.profile.id })
        assertEquals(listOf("b-1", "external-1", "a-1"), groups.map { it.sessions.single().id })
    }

    @Test
    fun buildReturnsOnlyExternalWebWhenOnlyLocalSessionsExist() {
        val profiles = listOf(
            createProfile(id = "external", terminalType = TerminalType.EXTERNAL_WEB)
        )

        val groups = SessionCacheGroupBuilder.build(
            profiles = profiles,
            cachedProfiles = emptyList(),
            externalSessionsByProfileId = mapOf(
                "external" to listOf(createSessionSummary(id = "external-1", timestamp = 400L))
            )
        )

        assertEquals(1, groups.size)
        assertEquals("external", groups.single().profile.id)
        assertEquals("external-1", groups.single().sessions.single().id)
    }

    @Test
    fun buildReturnsOnlyRemoteGroupsWhenNoExternalLocalDataExists() {
        val groups = SessionCacheGroupBuilder.build(
            profiles = listOf(
                createProfile(id = "remote", terminalType = TerminalType.TERMLINK_WS),
                createProfile(id = "external", terminalType = TerminalType.EXTERNAL_WEB)
            ),
            cachedProfiles = listOf(createCachedProfile(profileId = "remote", sessionId = "remote-1", fetchedAt = 500L))
        )

        assertEquals(1, groups.size)
        assertEquals("remote", groups.single().profile.id)
    }

    @Test
    fun buildReturnsEmptyWhenNoLocalDataExists() {
        val groups = SessionCacheGroupBuilder.build(
            profiles = listOf(
                createProfile(id = "remote", terminalType = TerminalType.TERMLINK_WS),
                createProfile(id = "external", terminalType = TerminalType.EXTERNAL_WEB)
            ),
            cachedProfiles = emptyList(),
            externalSessionsByProfileId = emptyMap()
        )

        assertTrue(groups.isEmpty())
    }

    private fun createProfile(id: String, terminalType: TerminalType): ServerProfile {
        return ServerProfile(
            id = id,
            name = id,
            baseUrl = "https://$id.example.com",
            terminalType = terminalType,
            authType = AuthType.NONE,
            basicUsername = "",
            mtlsEnabled = false,
            allowedHosts = "",
            mtlsCertificateDisplayName = ""
        )
    }

    private fun createCachedProfile(
        profileId: String,
        sessionId: String,
        fetchedAt: Long
    ): CachedProfileSessionList {
        return CachedProfileSessionList(
            profileId = profileId,
            profileName = "$profileId-name",
            cacheKey = "$profileId-key",
            fetchedAt = fetchedAt,
            sessions = listOf(createSessionSummary(id = sessionId, timestamp = fetchedAt))
        )
    }

    private fun createSessionSummary(id: String, timestamp: Long): SessionSummary {
        return SessionSummary(
            id = id,
            name = id,
            status = "IDLE",
            activeConnections = 0,
            createdAt = timestamp,
            lastActiveAt = timestamp,
            sessionMode = SessionMode.TERMINAL,
            cwd = null
        )
    }
}
