package com.termlink.app.data

import android.content.Context
import android.util.Log
import org.json.JSONArray
import java.util.UUID

class ExternalSessionStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun list(profileId: String): List<ExternalSession> {
        if (profileId.isBlank()) return emptyList()
        return loadAll()
            .asSequence()
            .filter { it.profileId == profileId }
            .sortedByDescending { it.lastActiveAt }
            .toList()
    }

    fun create(profileId: String, name: String): ExternalSession {
        val now = System.currentTimeMillis()
        val created = ExternalSession(
            id = UUID.randomUUID().toString(),
            profileId = profileId.trim(),
            name = name.trim(),
            createdAt = now,
            lastActiveAt = now
        )
        val next = loadAll().toMutableList()
        next.add(created)
        persist(next)
        return created
    }

    fun rename(profileId: String, sessionId: String, name: String): ExternalSession? {
        val trimmedProfileId = profileId.trim()
        val trimmedSessionId = sessionId.trim()
        if (trimmedProfileId.isBlank() || trimmedSessionId.isBlank()) return null

        val next = loadAll().toMutableList()
        val index = next.indexOfFirst {
            it.profileId == trimmedProfileId && it.id == trimmedSessionId
        }
        if (index < 0) return null

        val updated = next[index].copy(name = name.trim())
        next[index] = updated
        persist(next)
        return updated
    }

    fun delete(profileId: String, sessionId: String): Boolean {
        val trimmedProfileId = profileId.trim()
        val trimmedSessionId = sessionId.trim()
        if (trimmedProfileId.isBlank() || trimmedSessionId.isBlank()) return false

        val current = loadAll()
        val next = current.filterNot {
            it.profileId == trimmedProfileId && it.id == trimmedSessionId
        }
        if (next.size == current.size) return false
        persist(next)
        return true
    }

    fun deleteByProfile(profileId: String): Int {
        val trimmedProfileId = profileId.trim()
        if (trimmedProfileId.isBlank()) return 0

        val current = loadAll()
        val next = current.filterNot { it.profileId == trimmedProfileId }
        val removed = current.size - next.size
        if (removed > 0) {
            persist(next)
        }
        return removed
    }

    fun touch(profileId: String, sessionId: String): ExternalSession? {
        val trimmedProfileId = profileId.trim()
        val trimmedSessionId = sessionId.trim()
        if (trimmedProfileId.isBlank() || trimmedSessionId.isBlank()) return null

        val now = System.currentTimeMillis()
        val next = loadAll().toMutableList()
        val index = next.indexOfFirst {
            it.profileId == trimmedProfileId && it.id == trimmedSessionId
        }
        if (index < 0) return null

        val updated = next[index].copy(lastActiveAt = now)
        next[index] = updated
        persist(next)
        return updated
    }

    private fun loadAll(): List<ExternalSession> {
        val raw = prefs.getString(KEY_STATE, null).orEmpty()
        if (raw.isBlank()) return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i) ?: continue
                    val parsed = ExternalSession.fromJson(obj) ?: continue
                    add(parsed)
                }
            }
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to parse external session state, resetting.", ex)
            emptyList()
        }
    }

    private fun persist(sessions: List<ExternalSession>) {
        val array = JSONArray()
        sessions.forEach { array.put(it.toJson()) }
        prefs.edit().putString(KEY_STATE, array.toString()).apply()
    }

    companion object {
        private const val TAG = "ExternalSessionStore"
        private const val PREFS_NAME = "termlink_external_sessions"
        private const val KEY_STATE = "external_sessions_state_v1"
    }
}
