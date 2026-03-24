package com.termlink.app.data

import org.json.JSONArray
import org.json.JSONObject

data class CachedProfileSessionList(
    val profileId: String,
    val profileName: String,
    val cacheKey: String,
    val fetchedAt: Long,
    val sessions: List<SessionSummary>
) {
    fun toJson(): JSONObject {
        val sessionsArray = JSONArray()
        sessions.forEach { session ->
            sessionsArray.put(
                JSONObject()
                    .put("id", session.id)
                    .put("name", session.name)
                    .put("status", session.status)
                    .put("activeConnections", session.activeConnections)
                    .put("createdAt", session.createdAt)
                    .put("lastActiveAt", session.lastActiveAt)
                    .put("sessionMode", session.sessionMode.wireValue)
                    .apply {
                        session.cwd?.let { put("cwd", it) }
                        session.lastCodexThreadId?.let { put("lastCodexThreadId", it) }
                    }
            )
        }
        return JSONObject()
            .put("profileId", profileId)
            .put("profileName", profileName)
            .put("cacheKey", cacheKey)
            .put("fetchedAt", fetchedAt)
            .put("sessions", sessionsArray)
    }

    companion object {
        fun fromJson(json: JSONObject): CachedProfileSessionList? {
            val profileId = json.optString("profileId", "").trim()
            val profileName = json.optString("profileName", "").trim()
            val cacheKey = json.optString("cacheKey", "").trim()
            if (profileId.isBlank() || profileName.isBlank() || cacheKey.isBlank()) {
                return null
            }

            val sessionsJson = json.optJSONArray("sessions") ?: JSONArray()
            val sessions = buildList {
                for (index in 0 until sessionsJson.length()) {
                    val item = sessionsJson.optJSONObject(index) ?: continue
                    parseSession(item)?.let(::add)
                }
            }

            return CachedProfileSessionList(
                profileId = profileId,
                profileName = profileName,
                cacheKey = cacheKey,
                fetchedAt = json.optLong("fetchedAt", 0L),
                sessions = sessions
            )
        }

        private fun parseSession(json: JSONObject): SessionSummary? {
            val id = json.optString("id", "").trim()
            if (id.isBlank()) {
                return null
            }
            return SessionSummary(
                id = id,
                name = json.optString("name", "Unnamed Session"),
                status = json.optString("status", "UNKNOWN"),
                activeConnections = json.optInt("activeConnections", 0),
                createdAt = json.optLong("createdAt", 0L),
                lastActiveAt = json.optLong("lastActiveAt", 0L),
                sessionMode = SessionMode.fromWireValue(json.optString("sessionMode", "terminal")),
                cwd = json.optString("cwd", "").trim().takeIf { it.isNotBlank() },
                lastCodexThreadId = json.optString("lastCodexThreadId", "").trim()
                    .takeIf { it.isNotBlank() }
            )
        }
    }
}

data class CachedSessionListCollection(
    val version: Int = VERSION,
    val profiles: List<CachedProfileSessionList> = emptyList()
) {
    fun toJson(): JSONObject {
        val profilesArray = JSONArray()
        profiles.forEach { profilesArray.put(it.toJson()) }
        return JSONObject()
            .put("version", version)
            .put("profiles", profilesArray)
    }

    companion object {
        const val VERSION = 1

        fun fromJson(raw: String?): CachedSessionListCollection {
            if (raw.isNullOrBlank()) {
                return CachedSessionListCollection()
            }
            return try {
                val json = JSONObject(raw)
                val profilesJson = json.optJSONArray("profiles") ?: JSONArray()
                val profiles = buildList {
                    for (index in 0 until profilesJson.length()) {
                        val item = profilesJson.optJSONObject(index) ?: continue
                        CachedProfileSessionList.fromJson(item)?.let(::add)
                    }
                }
                CachedSessionListCollection(
                    version = json.optInt("version", VERSION),
                    profiles = profiles
                )
            } catch (_: Exception) {
                CachedSessionListCollection()
            }
        }
    }
}
