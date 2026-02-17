package com.termlink.app.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class BasicCredentialStore(context: Context) {

    private val appContext = context.applicationContext
    private val prefs by lazy {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            PREFS_NAME,
            masterKeyAlias,
            appContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun getPassword(profileId: String): String? {
        if (profileId.isBlank()) return null
        return prefs.getString(passwordKey(profileId), null)
    }

    fun putPassword(profileId: String, password: String) {
        if (profileId.isBlank()) return
        prefs.edit().putString(passwordKey(profileId), password).apply()
    }

    fun removePassword(profileId: String) {
        if (profileId.isBlank()) return
        prefs.edit().remove(passwordKey(profileId)).apply()
    }

    private fun passwordKey(profileId: String): String = "basic_password_$profileId"

    companion object {
        private const val PREFS_NAME = "termlink_basic_credentials"
    }
}
