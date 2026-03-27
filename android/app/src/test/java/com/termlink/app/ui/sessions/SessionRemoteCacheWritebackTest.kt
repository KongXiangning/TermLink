package com.termlink.app.ui.sessions

import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionRemoteCacheWritebackTest {

    @Test
    fun applyWritesSuccessfulRemoteGroupsToCache() {
        val written = mutableListOf<Triple<ServerProfile, List<SessionSummary>, Long>>()
        val remoteProfile = createProfile("remote", TerminalType.TERMLINK_WS)
        val fetchedAt = 1234L

        val applied = SessionRemoteCacheWriteback.apply(
            groups = listOf(
                SessionRemoteCacheWritebackCandidate(
                    profile = remoteProfile,
                    sessions = listOf(
                        createSession("s2", lastActiveAt = 2L),
                        createSession("s1", lastActiveAt = 1L)
                    ),
                    hasError = false
                )
            ),
            fetchedAt = fetchedAt
        ) { profile, sessions, timestamp ->
            written += Triple(profile, sessions, timestamp)
        }

        assertEquals(1, applied)
        assertEquals(1, written.size)
        assertEquals(remoteProfile, written.single().first)
        assertEquals(listOf("s2", "s1"), written.single().second.map { it.id })
        assertEquals(fetchedAt, written.single().third)
    }

    @Test
    fun applySkipsFailedRemoteGroups() {
        val written = mutableListOf<String>()

        val applied = SessionRemoteCacheWriteback.apply(
            groups = listOf(
                SessionRemoteCacheWritebackCandidate(
                    profile = createProfile("remote", TerminalType.TERMLINK_WS),
                    sessions = listOf(createSession("s1")),
                    hasError = true
                )
            ),
            fetchedAt = 1234L
        ) { profile, _, _ ->
            written += profile.id
        }

        assertEquals(0, applied)
        assertTrue(written.isEmpty())
    }

    @Test
    fun applySkipsExternalWebGroups() {
        val written = mutableListOf<String>()

        val applied = SessionRemoteCacheWriteback.apply(
            groups = listOf(
                SessionRemoteCacheWritebackCandidate(
                    profile = createProfile("external", TerminalType.EXTERNAL_WEB),
                    sessions = listOf(createSession("external-1")),
                    hasError = false
                )
            ),
            fetchedAt = 1234L
        ) { profile, _, _ ->
            written += profile.id
        }

        assertEquals(0, applied)
        assertTrue(written.isEmpty())
    }

    @Test
    fun applyUsesSingleFetchedAtAcrossAllSuccessfulGroups() {
        val timestamps = mutableListOf<Long>()

        val applied = SessionRemoteCacheWriteback.apply(
            groups = listOf(
                SessionRemoteCacheWritebackCandidate(
                    profile = createProfile("remote-a", TerminalType.TERMLINK_WS),
                    sessions = listOf(createSession("a1")),
                    hasError = false
                ),
                SessionRemoteCacheWritebackCandidate(
                    profile = createProfile("remote-b", TerminalType.TERMLINK_WS),
                    sessions = listOf(createSession("b1")),
                    hasError = false
                )
            ),
            fetchedAt = 5678L
        ) { _, _, timestamp ->
            timestamps += timestamp
        }

        assertEquals(2, applied)
        assertEquals(listOf(5678L, 5678L), timestamps)
    }

    @Test
    fun latestRefreshMayStillWriteCacheAfterViewDestroyRelease() {
        val tracker = SessionAsyncRequestTracker()
        val requestId = tracker.startRefresh()
        val written = mutableListOf<String>()

        tracker.releaseRefreshForViewDestroy()
        if (tracker.isActiveRefresh(requestId)) {
            SessionRemoteCacheWriteback.apply(
                groups = listOf(
                    SessionRemoteCacheWritebackCandidate(
                        profile = createProfile("remote", TerminalType.TERMLINK_WS),
                        sessions = listOf(createSession("s1")),
                        hasError = false
                    )
                ),
                fetchedAt = 100L
            ) { profile, _, _ ->
                written += profile.id
            }
        }

        assertEquals(listOf("remote"), written)
        assertTrue(tracker.completeRefresh(requestId))
    }

    @Test
    fun olderRefreshDoesNotWriteCacheAfterNewerRefreshStarts() {
        val tracker = SessionAsyncRequestTracker()
        val olderRequestId = tracker.startRefresh()
        val written = mutableListOf<String>()

        tracker.releaseRefreshForViewDestroy()
        tracker.startRefresh()

        if (tracker.isActiveRefresh(olderRequestId)) {
            SessionRemoteCacheWriteback.apply(
                groups = listOf(
                    SessionRemoteCacheWritebackCandidate(
                        profile = createProfile("remote", TerminalType.TERMLINK_WS),
                        sessions = listOf(createSession("s1")),
                        hasError = false
                    )
                ),
                fetchedAt = 100L
            ) { profile, _, _ ->
                written += profile.id
            }
        }

        assertTrue(written.isEmpty())
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

    private fun createSession(id: String, lastActiveAt: Long = 1L): SessionSummary {
        return SessionSummary(
            id = id,
            name = id,
            status = "IDLE",
            activeConnections = 0,
            createdAt = lastActiveAt,
            lastActiveAt = lastActiveAt,
            sessionMode = SessionMode.TERMINAL,
            cwd = null
        )
    }
}
