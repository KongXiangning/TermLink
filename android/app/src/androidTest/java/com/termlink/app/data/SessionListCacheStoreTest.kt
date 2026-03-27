package com.termlink.app.data

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionListCacheStore
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SessionListCacheStoreTest {

    private lateinit var context: Context
    private lateinit var store: SessionListCacheStore

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        store = SessionListCacheStore(context)
        store.clearAll()
    }

    @After
    fun tearDown() {
        store.clearAll()
    }

    @Test
    fun replaceAndLoadForSingleRemoteProfile() {
        val profile = remoteProfile()
        store.replaceProfile(
            profile,
            listOf(
                session(id = "s1", name = "One", lastActiveAt = 20L),
                session(id = "s2", name = "Two", lastActiveAt = 10L)
            ),
            fetchedAt = 1234L
        )

        val cached = store.loadForProfiles(listOf(profile))
        assertEquals(1, cached.size)
        assertEquals(profile.id, cached.first().profileId)
        assertEquals(profile.name, cached.first().profileName)
        assertEquals(1234L, cached.first().fetchedAt)
        assertEquals(listOf("s1", "s2"), cached.first().sessions.map { it.id })
    }

    @Test
    fun keepsTwoProfilesInSinglePersistedBlob() {
        val profileA = remoteProfile(id = "a", name = "A", baseUrl = "https://a.example")
        val profileB = remoteProfile(id = "b", name = "B", baseUrl = "https://b.example")

        store.replaceProfile(profileA, listOf(session(id = "a1")), fetchedAt = 1L)
        store.replaceProfile(profileB, listOf(session(id = "b1")), fetchedAt = 2L)

        val raw = readRawState()
        val json = JSONObject(raw ?: error("Expected persisted cache"))
        assertEquals(1, json.optInt("version"))
        assertEquals(2, json.optJSONArray("profiles")?.length())

        val cached = store.loadForProfiles(listOf(profileA, profileB))
        assertEquals(listOf("a", "b"), cached.map { it.profileId })
    }

    @Test
    fun rejectsCacheWhenProfileIdentityChanges() {
        val original = remoteProfile(id = "same", baseUrl = "https://server.example/", basicUsername = "Alice")
        val changedBaseUrl = original.copy(baseUrl = "https://other.example")
        val changedUsername = original.copy(baseUrl = "https://server.example/", basicUsername = "Bob")

        store.replaceProfile(original, listOf(session(id = "s1")), fetchedAt = 1L)

        assertTrue(store.loadForProfiles(listOf(changedBaseUrl)).isEmpty())
        assertTrue(store.loadForProfiles(listOf(changedUsername)).isEmpty())
    }

    @Test
    fun keepsMultipleCacheContextsForSameProfileId() {
        val original = remoteProfile(id = "same", baseUrl = "https://server.example/", basicUsername = "Alice")
        val changedBaseUrl = original.copy(baseUrl = "https://other.example")

        store.replaceProfile(original, listOf(session(id = "old-session")), fetchedAt = 1L)
        store.replaceProfile(changedBaseUrl, listOf(session(id = "new-session")), fetchedAt = 2L)

        val oldCached = store.loadForProfiles(listOf(original))
        val newCached = store.loadForProfiles(listOf(changedBaseUrl))

        assertEquals(listOf("old-session"), oldCached.first().sessions.map { it.id })
        assertEquals(listOf("new-session"), newCached.first().sessions.map { it.id })

        val raw = JSONObject(readRawState() ?: error("Expected persisted cache"))
        assertEquals(2, raw.optJSONArray("profiles")?.length())
    }

    @Test
    fun ignoresExternalWebProfiles() {
        val external = remoteProfile(
            id = "external",
            terminalType = TerminalType.EXTERNAL_WEB
        )

        store.replaceProfile(external, listOf(session(id = "s1")), fetchedAt = 1L)

        assertTrue(store.loadForProfiles(listOf(external)).isEmpty())
        assertTrue(readRawState().isNullOrBlank())
    }

    @Test
    fun updateProfileSessionsOnlyTouchesTargetProfile() {
        val profileA = remoteProfile(id = "a", name = "A", baseUrl = "https://a.example")
        val profileB = remoteProfile(id = "b", name = "B", baseUrl = "https://b.example")
        store.replaceProfile(profileA, listOf(session(id = "a1", name = "Old A")), fetchedAt = 1L)
        store.replaceProfile(profileB, listOf(session(id = "b1", name = "Old B")), fetchedAt = 2L)

        store.updateProfileSessions(profileA) { sessions ->
            sessions + session(id = "a2", name = "New A", lastActiveAt = 50L)
        }

        val cached = store.loadForProfiles(listOf(profileA, profileB))
        assertEquals(listOf("a2", "a1"), cached.first { it.profileId == "a" }.sessions.map { it.id })
        assertEquals(listOf("b1"), cached.first { it.profileId == "b" }.sessions.map { it.id })
    }

    @Test
    fun updateProfileSessionsOnlyTouchesMatchingCacheContext() {
        val original = remoteProfile(id = "same", baseUrl = "https://server.example/", basicUsername = "Alice")
        val changedBaseUrl = original.copy(baseUrl = "https://other.example")
        store.replaceProfile(original, listOf(session(id = "old-session")), fetchedAt = 1L)
        store.replaceProfile(changedBaseUrl, listOf(session(id = "new-session")), fetchedAt = 2L)

        store.updateProfileSessions(changedBaseUrl) { sessions ->
            sessions + session(id = "newer-session", lastActiveAt = 30L)
        }

        val oldCached = store.loadForProfiles(listOf(original))
        val newCached = store.loadForProfiles(listOf(changedBaseUrl))

        assertEquals(listOf("old-session"), oldCached.first().sessions.map { it.id })
        assertEquals(listOf("newer-session", "new-session"), newCached.first().sessions.map { it.id })
    }

    @Test
    fun removeProfileOnlyRemovesTargetedEntry() {
        val profileA = remoteProfile(id = "a", name = "A", baseUrl = "https://a.example")
        val profileB = remoteProfile(id = "b", name = "B", baseUrl = "https://b.example")
        store.replaceProfile(profileA, listOf(session(id = "a1")), fetchedAt = 1L)
        store.replaceProfile(profileB, listOf(session(id = "b1")), fetchedAt = 2L)

        store.removeProfile("a")

        val cached = store.loadForProfiles(listOf(profileA, profileB))
        assertEquals(listOf("b"), cached.map { it.profileId })
    }

    @Test
    fun removeProfileDeletesAllContextsForSameProfileId() {
        val original = remoteProfile(id = "same", baseUrl = "https://server.example/", basicUsername = "Alice")
        val changedBaseUrl = original.copy(baseUrl = "https://other.example")

        store.replaceProfile(original, listOf(session(id = "old-session")), fetchedAt = 1L)
        store.replaceProfile(changedBaseUrl, listOf(session(id = "new-session")), fetchedAt = 2L)

        store.removeProfile("same")

        assertTrue(store.loadForProfiles(listOf(original)).isEmpty())
        assertTrue(store.loadForProfiles(listOf(changedBaseUrl)).isEmpty())
        assertTrue(readRawState().isNullOrBlank() || JSONObject(readRawState()!!).optJSONArray("profiles")?.length() == 0)
    }

    @Test
    fun removeProfileContextOnlyDeletesMatchingCacheContext() {
        val original = remoteProfile(id = "same", baseUrl = "https://server.example/", basicUsername = "Alice")
        val changedBaseUrl = original.copy(baseUrl = "https://other.example")

        store.replaceProfile(original, listOf(session(id = "old-session")), fetchedAt = 1L)
        store.replaceProfile(changedBaseUrl, listOf(session(id = "new-session")), fetchedAt = 2L)

        store.removeProfileContext(changedBaseUrl)

        assertEquals(listOf("old-session"), store.loadForProfiles(listOf(original)).first().sessions.map { it.id })
        assertTrue(store.loadForProfiles(listOf(changedBaseUrl)).isEmpty())
    }

    @Test
    fun brokenProfileOrSessionDoesNotPoisonOtherEntries() {
        val validProfile = remoteProfile(id = "valid", name = "Valid", baseUrl = "https://valid.example")
        val validCacheKey = SessionListCacheStore.buildCacheKey(validProfile)
        val brokenRaw = JSONObject()
            .put("version", 1)
            .put(
                "profiles",
                JSONArray()
                    .put(
                        JSONObject()
                            .put("profileId", validProfile.id)
                            .put("profileName", validProfile.name)
                            .put("cacheKey", validCacheKey)
                            .put("fetchedAt", 100L)
                            .put(
                                "sessions",
                                JSONArray()
                                    .put(
                                        JSONObject()
                                            .put("id", "ok")
                                            .put("name", "Valid")
                                            .put("status", "IDLE")
                                            .put("activeConnections", 0)
                                            .put("createdAt", 10L)
                                            .put("lastActiveAt", 20L)
                                            .put("sessionMode", "codex")
                                    )
                                    .put(JSONObject().put("name", "Broken missing id"))
                            )
                    )
                    .put(JSONObject().put("profileName", "Broken profile"))
            )

        writeRawState(brokenRaw.toString())

        val cached = store.loadForProfiles(listOf(validProfile))
        assertEquals(1, cached.size)
        assertEquals(listOf("ok"), cached.first().sessions.map { it.id })
    }

    @Test
    fun persistsSessionsInNormalizedSortOrder() {
        val profile = remoteProfile()
        store.replaceProfile(
            profile,
            listOf(
                session(id = "third", name = "Zulu", lastActiveAt = 5L, createdAt = 1L),
                session(id = "second", name = "Alpha", lastActiveAt = 10L, createdAt = 5L),
                session(id = "first", name = "Beta", lastActiveAt = 10L, createdAt = 9L)
            ),
            fetchedAt = 1L
        )

        val cached = store.loadForProfiles(listOf(profile))
        assertEquals(listOf("first", "second", "third"), cached.first().sessions.map { it.id })
    }

    private fun readRawState(): String? {
        return context.getSharedPreferences(SessionListCacheStore.PREFS_NAME, Context.MODE_PRIVATE)
            .getString(SessionListCacheStore.KEY_STATE, null)
    }

    private fun writeRawState(raw: String) {
        context.getSharedPreferences(SessionListCacheStore.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(SessionListCacheStore.KEY_STATE, raw)
            .commit()
    }

    private fun remoteProfile(
        id: String = "profile-1",
        name: String = "Profile 1",
        baseUrl: String = "https://server.example/",
        basicUsername: String = "Admin",
        terminalType: TerminalType = TerminalType.TERMLINK_WS
    ): ServerProfile {
        return ServerProfile(
            id = id,
            name = name,
            baseUrl = baseUrl,
            terminalType = terminalType,
            authType = AuthType.BASIC,
            basicUsername = basicUsername,
            mtlsEnabled = false,
            allowedHosts = "",
            mtlsCertificateDisplayName = ""
        )
    }

    private fun session(
        id: String,
        name: String = id,
        createdAt: Long = 1L,
        lastActiveAt: Long = createdAt
    ): SessionSummary {
        return SessionSummary(
            id = id,
            name = name,
            status = "IDLE",
            activeConnections = 0,
            createdAt = createdAt,
            lastActiveAt = lastActiveAt,
            sessionMode = SessionMode.TERMINAL,
            cwd = null,
            lastCodexThreadId = null
        )
    }
}
