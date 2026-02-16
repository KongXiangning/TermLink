package com.termlink.app.data

import org.json.JSONArray
import org.json.JSONObject

enum class AuthType {
    NONE,
    BASIC;

    companion object {
        fun fromString(value: String?): AuthType {
            if (value.isNullOrBlank()) {
                return NONE
            }
            return entries.firstOrNull { it.name.equals(value.trim(), ignoreCase = true) } ?: NONE
        }
    }
}

data class ServerProfile(
    val id: String,
    val name: String,
    val baseUrl: String,
    val authType: AuthType,
    val mtlsEnabled: Boolean,
    val allowedHosts: String
) {
    fun toJson(): JSONObject {
        return JSONObject()
            .put("id", id)
            .put("name", name)
            .put("baseUrl", baseUrl)
            .put("authType", authType.name)
            .put("mtlsEnabled", mtlsEnabled)
            .put("allowedHosts", allowedHosts)
    }

    companion object {
        fun fromJson(json: JSONObject): ServerProfile {
            return ServerProfile(
                id = json.optString("id", ""),
                name = json.optString("name", ""),
                baseUrl = json.optString("baseUrl", ""),
                authType = AuthType.fromString(json.optString("authType", AuthType.NONE.name)),
                mtlsEnabled = json.optBoolean("mtlsEnabled", false),
                allowedHosts = json.optString("allowedHosts", "")
            )
        }
    }
}

data class ServerConfigState(
    val profiles: List<ServerProfile>,
    val activeProfileId: String
) {
    fun toJson(): JSONObject {
        val profilesArray = JSONArray()
        profiles.forEach { profilesArray.put(it.toJson()) }
        return JSONObject()
            .put("profiles", profilesArray)
            .put("activeProfileId", activeProfileId)
    }

    companion object {
        fun fromJson(json: JSONObject): ServerConfigState {
            val profilesArray = json.optJSONArray("profiles") ?: JSONArray()
            val profiles = mutableListOf<ServerProfile>()
            for (index in 0 until profilesArray.length()) {
                val item = profilesArray.optJSONObject(index) ?: continue
                val parsed = ServerProfile.fromJson(item)
                if (parsed.id.isBlank() || parsed.name.isBlank()) continue
                profiles.add(parsed)
            }
            return ServerConfigState(
                profiles = profiles,
                activeProfileId = json.optString("activeProfileId", "")
            )
        }
    }
}
