package com.termlink.app.data

import android.content.Context

class SessionListCacheStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun loadForProfiles(profiles: List<ServerProfile>): List<CachedProfileSessionList> {
        if (profiles.isEmpty()) {
            return emptyList()
        }
        val cachedByIdentity = loadCollection().profiles.associateBy {
            buildProfileCacheIdentity(it.profileId, it.cacheKey)
        }
        return buildList {
            profiles.forEach { profile ->
                if (profile.terminalType != TerminalType.TERMLINK_WS) {
                    return@forEach
                }
                val cacheKey = buildCacheKey(profile)
                val cached = cachedByIdentity[
                    buildProfileCacheIdentity(profile.id.trim(), cacheKey)
                ] ?: return@forEach
                add(cached)
            }
        }
    }

    fun replaceProfile(
        profile: ServerProfile,
        sessions: List<SessionSummary>,
        fetchedAt: Long = System.currentTimeMillis()
    ) {
        if (profile.terminalType != TerminalType.TERMLINK_WS || profile.id.isBlank()) {
            return
        }
        val normalized = CachedProfileSessionList(
            profileId = profile.id.trim(),
            profileName = profile.name.trim(),
            cacheKey = buildCacheKey(profile),
            fetchedAt = fetchedAt,
            sessions = normalizeSessions(sessions)
        )
        mutateCollection { current ->
            val nextProfiles = current.profiles
                .filterNot {
                    it.profileId == normalized.profileId && it.cacheKey == normalized.cacheKey
                }
                .toMutableList()
            nextProfiles.add(normalized)
            current.copy(profiles = nextProfiles)
        }
    }

    fun updateProfileSessions(
        profile: ServerProfile,
        transform: (List<SessionSummary>) -> List<SessionSummary>
    ) {
        val trimmedProfileId = profile.id.trim()
        if (profile.terminalType != TerminalType.TERMLINK_WS || trimmedProfileId.isBlank()) {
            return
        }
        val cacheKey = buildCacheKey(profile)
        mutateCollection { current ->
            if (current.profiles.none {
                    it.profileId == trimmedProfileId && it.cacheKey == cacheKey
                }
            ) {
                return@mutateCollection current
            }
            current.copy(
                profiles = current.profiles.map { cached ->
                    if (cached.profileId != trimmedProfileId || cached.cacheKey != cacheKey) {
                        cached
                    } else {
                        cached.copy(sessions = normalizeSessions(transform(cached.sessions)))
                    }
                }
            )
        }
    }

    fun removeProfile(profileId: String) {
        val trimmedProfileId = profileId.trim()
        if (trimmedProfileId.isBlank()) {
            return
        }
        mutateCollection { current ->
            current.copy(profiles = current.profiles.filterNot { it.profileId == trimmedProfileId })
        }
    }

    fun removeProfileContext(profile: ServerProfile) {
        val trimmedProfileId = profile.id.trim()
        if (profile.terminalType != TerminalType.TERMLINK_WS || trimmedProfileId.isBlank()) {
            return
        }
        val cacheKey = buildCacheKey(profile)
        mutateCollection { current ->
            current.copy(
                profiles = current.profiles.filterNot {
                    it.profileId == trimmedProfileId && it.cacheKey == cacheKey
                }
            )
        }
    }

    fun clearAll() {
        prefs.edit().remove(KEY_STATE).apply()
    }

    private fun loadCollection(): CachedSessionListCollection {
        return CachedSessionListCollection.fromJson(prefs.getString(KEY_STATE, null))
    }

    private fun mutateCollection(
        transform: (CachedSessionListCollection) -> CachedSessionListCollection
    ) {
        persist(transform(loadCollection()))
    }

    private fun persist(collection: CachedSessionListCollection) {
        prefs.edit().putString(KEY_STATE, collection.toJson().toString()).apply()
    }

    private fun normalizeSessions(sessions: List<SessionSummary>): List<SessionSummary> {
        return SessionSummaryOrdering.normalize(sessions)
    }

    companion object {
        internal const val PREFS_NAME = "session_list_cache"
        internal const val KEY_STATE = "session_list_cache_v1"

        internal fun buildCacheKey(profile: ServerProfile): String {
            val normalizedBaseUrl = profile.baseUrl.trim().trimEnd('/')
            val identityFingerprint = profile.basicUsername.trim()
                .takeIf { it.isNotBlank() }
                ?.lowercase()
                ?: profile.authType.name
            return "$normalizedBaseUrl|$identityFingerprint"
        }

        private fun buildProfileCacheIdentity(profileId: String, cacheKey: String): String {
            return "${profileId.trim()}|${cacheKey.trim()}"
        }
    }
}
