package com.termlink.app.data

import android.content.Context

class CodexLaunchPreferencesStore(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun isNativeCodexDefaultEnabled(): Boolean =
        prefs.getBoolean(KEY_NATIVE_CODEX_DEFAULT_ENABLED, true)

    fun setNativeCodexDefaultEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_NATIVE_CODEX_DEFAULT_ENABLED, enabled).apply()
    }

    companion object {
        private const val PREFS_NAME = "codex_launch_preferences"
        private const val KEY_NATIVE_CODEX_DEFAULT_ENABLED = "native_codex_default_enabled"
    }
}
