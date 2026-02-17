package com.termlink.app.data

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.net.URI
import java.util.UUID

class ServerConfigStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val basicCredentialStore = BasicCredentialStore(context.applicationContext)
    private var state: ServerConfigState = normalizeState(loadRawState())

    fun loadState(): ServerConfigState {
        // Intentionally not a pure read:
        // normalizeState() may perform one-time legacy BASIC credential migration
        // (baseUrl userinfo -> encrypted credential store + sanitized baseUrl).
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
        val normalizedProfile = normalizeProfile(
            profile.copy(
                id = profile.id.ifBlank { UUID.randomUUID().toString() },
                name = profile.name.trim().ifBlank { DEFAULT_PROFILE_NAME },
                baseUrl = profile.baseUrl.trim(),
                basicUsername = profile.basicUsername.trim(),
                allowedHosts = profile.allowedHosts.trim()
            )
        )
        val updatedProfiles = current.profiles.toMutableList()
        val index = updatedProfiles.indexOfFirst { it.id == normalizedProfile.id }
        if (index >= 0) {
            updatedProfiles[index] = normalizedProfile
        } else {
            updatedProfiles.add(normalizedProfile)
        }
        if (normalizedProfile.authType != AuthType.BASIC) {
            basicCredentialStore.removePassword(normalizedProfile.id)
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
        basicCredentialStore.removePassword(profileId)
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
                normalizeProfile(
                    profile.copy(
                        id = profile.id.ifBlank { UUID.randomUUID().toString() },
                        name = profile.name.trim().ifBlank { DEFAULT_PROFILE_NAME },
                        baseUrl = profile.baseUrl.trim(),
                        basicUsername = profile.basicUsername.trim(),
                        allowedHosts = profile.allowedHosts.trim()
                    )
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

    private fun normalizeProfile(profile: ServerProfile): ServerProfile {
        if (profile.authType != AuthType.BASIC) {
            basicCredentialStore.removePassword(profile.id)
            return profile.copy(basicUsername = "")
        }
        val legacy = extractLegacyBasicCredentials(profile.baseUrl)
        if (legacy == null) {
            return profile.copy(
                baseUrl = profile.baseUrl.trimEnd('/'),
                basicUsername = profile.basicUsername.trim()
            )
        }

        val resolvedUsername = profile.basicUsername.trim().ifBlank { legacy.username }
        if (legacy.password.isNotBlank() && basicCredentialStore.getPassword(profile.id).isNullOrBlank()) {
            basicCredentialStore.putPassword(profile.id, legacy.password)
        }

        return profile.copy(
            baseUrl = legacy.sanitizedBaseUrl,
            basicUsername = resolvedUsername
        )
    }

    private fun extractLegacyBasicCredentials(rawBaseUrl: String): LegacyBasicCredentials? {
        if (rawBaseUrl.isBlank()) return null
        return try {
            val uri = URI(rawBaseUrl)
            val userInfo = uri.userInfo.orEmpty()
            if (userInfo.isBlank() || !userInfo.contains(":")) {
                null
            } else {
                val separator = userInfo.indexOf(':')
                val username = userInfo.substring(0, separator).trim()
                val password = userInfo.substring(separator + 1)
                val sanitizedUrl = URI(
                    uri.scheme,
                    null,
                    uri.host,
                    uri.port,
                    uri.path,
                    uri.query,
                    uri.fragment
                ).toString().trimEnd('/')
                LegacyBasicCredentials(
                    sanitizedBaseUrl = sanitizedUrl,
                    username = username,
                    password = password
                )
            }
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to parse legacy basic credentials from baseUrl.", ex)
            null
        }
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
            basicUsername = "",
            mtlsEnabled = false,
            allowedHosts = ""
        )
    }

    private data class LegacyBasicCredentials(
        val sanitizedBaseUrl: String,
        val username: String,
        val password: String
    )

    companion object {
        private const val TAG = "ServerConfigStore"
        private const val PREFS_NAME = "termlink_server_config"
        private const val STATE_KEY = "server_config_state_v1"
        private const val DEFAULT_PROFILE_NAME = "Default"
    }
}
