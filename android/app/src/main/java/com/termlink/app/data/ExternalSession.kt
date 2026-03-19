package com.termlink.app.data

import org.json.JSONObject

data class ExternalSession(
    val id: String,
    val profileId: String,
    val name: String,
    val createdAt: Long,
    val lastActiveAt: Long
) {
    fun toJson(): JSONObject {
        return JSONObject()
            .put("id", id)
            .put("profileId", profileId)
            .put("name", name)
            .put("createdAt", createdAt)
            .put("lastActiveAt", lastActiveAt)
    }

    companion object {
        fun fromJson(json: JSONObject): ExternalSession? {
            val id = json.optString("id", "").trim()
            val profileId = json.optString("profileId", "").trim()
            val name = json.optString("name", "").trim()
            if (id.isBlank() || profileId.isBlank() || name.isBlank()) {
                return null
            }
            return ExternalSession(
                id = id,
                profileId = profileId,
                name = name,
                createdAt = json.optLong("createdAt", System.currentTimeMillis()),
                lastActiveAt = json.optLong("lastActiveAt", System.currentTimeMillis())
            )
        }
    }
}
