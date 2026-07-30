package com.termlink.app.data

import android.content.Context
import org.json.JSONObject

data class ClientRegistration(
    val registrationId: String,
    val fingerprint: String
)

class ClientRegistrationStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun get(profileId: String): ClientRegistration? {
        val raw = prefs.getString(key(profileId), null) ?: return null
        return runCatching {
            val json = JSONObject(raw)
            val id = json.optString("registrationId").trim()
            val fingerprint = json.optString("fingerprint").trim()
            if (id.isBlank()) null else ClientRegistration(id, fingerprint)
        }.getOrNull()
    }

    fun put(profileId: String, registration: ClientRegistration) {
        prefs.edit().putString(
            key(profileId),
            JSONObject()
                .put("registrationId", registration.registrationId)
                .put("fingerprint", registration.fingerprint)
                .toString()
        ).apply()
    }

    fun remove(profileId: String) {
        prefs.edit().remove(key(profileId)).apply()
    }

    private fun key(profileId: String): String = "registration_$profileId"

    companion object {
        private const val PREFS = "client_registrations"
    }
}
