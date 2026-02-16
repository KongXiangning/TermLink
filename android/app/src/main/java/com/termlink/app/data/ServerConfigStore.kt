package com.termlink.app.data

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.util.UUID

class ServerConfigStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private var state: ServerConfigState = normalizeState(loadRawState())

    fun loadState(): ServerConfigState {
        state = normalizeState(loadRawState())
        persistState(state)
        return state
    }

    fun saveState(newState: ServerConfigState): ServerConfigState {
        state = normalizeState(newState)
        persistState(state)
        return state
    }

    fun getActiveProfile(): ServerProfile {
        val currentState = loadState()
        return currentState.profiles.firstOrNull { it.id == currentState.activeProfileId }
            ?: currentState.profiles.first()
    }

    fun upsertProfile(profile: ServerProfile): ServerConfigState {
        val current = loadState()
        val normalizedProfile = profile.copy(
            id = profile.id.ifBlank { UUID.randomUUID().toString() },
            name = profile.name.trim().ifBlank { DEFAULT_PROFILE_NAME },
            baseUrl = profile.baseUrl.trim(),
            allowedHosts = profile.allowedHosts.trim()
        )
        val updatedProfiles = current.profiles.toMutableList()
        val index = updatedProfiles.indexOfFirst { it.id == normalizedProfile.id }
        if (index >= 0) {
            updatedProfiles[index] = normalizedProfile
        } else {
            updatedProfiles.add(normalizedProfile)
        }
        val nextActiveId = if (current.activeProfileId.isBlank()) {
            normalizedProfile.id
        } else {
            current.activeProfileId
        }
        return saveState(
            ServerConfigState(
                profiles = updatedProfiles,
                activeProfileId = nextActiveId
            )
        )
    }

    fun deleteProfile(profileId: String): ServerConfigState {
        val current = loadState()
        val updatedProfiles = current.profiles.filter { it.id != profileId }
        if (updatedProfiles.isEmpty()) {
            return saveState(
                ServerConfigState(
                    profiles = emptyList(),
                    activeProfileId = ""
                )
            )
        }
        val nextActiveId = if (current.activeProfileId == profileId) {
            updatedProfiles.first().id
        } else {
            current.activeProfileId
        }
        return saveState(
            ServerConfigState(
                profiles = updatedProfiles,
                activeProfileId = nextActiveId
            )
        )
    }

    fun setActiveProfile(profileId: String): ServerConfigState {
        val current = loadState()
        if (current.profiles.none { it.id == profileId }) {
            return current
        }
        return saveState(
            ServerConfigState(
                profiles = current.profiles,
                activeProfileId = profileId
            )
        )
    }

    private fun loadRawState(): ServerConfigState {
        val raw = prefs.getString(STATE_KEY, null).orEmpty()
        if (raw.isBlank()) {
            return defaultState()
        }
        return try {
            ServerConfigState.fromJson(JSONObject(raw))
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to parse server config state, fallback to default.", ex)
            defaultState()
        }
    }

    private fun normalizeState(input: ServerConfigState): ServerConfigState {
        val profiles = input.profiles
            .map { profile ->
                profile.copy(
                    id = profile.id.ifBlank { UUID.randomUUID().toString() },
                    name = profile.name.trim().ifBlank { DEFAULT_PROFILE_NAME },
                    baseUrl = profile.baseUrl.trim(),
                    allowedHosts = profile.allowedHosts.trim()
                )
            }
            .distinctBy { it.id }
            .toMutableList()

        if (profiles.isEmpty()) {
            profiles.add(defaultProfile())
        }

        val activeId = if (profiles.any { it.id == input.activeProfileId }) {
            input.activeProfileId
        } else {
            profiles.first().id
        }

        return ServerConfigState(profiles = profiles, activeProfileId = activeId)
    }

    private fun persistState(state: ServerConfigState) {
        prefs.edit().putString(STATE_KEY, state.toJson().toString()).apply()
    }

    private fun defaultState(): ServerConfigState {
        val profile = defaultProfile()
        return ServerConfigState(
            profiles = listOf(profile),
            activeProfileId = profile.id
        )
    }

    private fun defaultProfile(): ServerProfile {
        return ServerProfile(
            id = UUID.randomUUID().toString(),
            name = DEFAULT_PROFILE_NAME,
            baseUrl = "",
            authType = AuthType.NONE,
            mtlsEnabled = false,
            allowedHosts = ""
        )
    }

    companion object {
        private const val TAG = "ServerConfigStore"
        private const val PREFS_NAME = "termlink_server_config"
        private const val STATE_KEY = "server_config_state_v1"
        private const val DEFAULT_PROFILE_NAME = "Default"
    }
}
