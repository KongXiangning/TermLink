package com.termlink.app.util

import android.content.Context
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.SessionMode

object ProfileRestoreStateCleaner {

    fun clearDeletedProfileState(
        context: Context,
        deletedProfileId: String,
        nextState: ServerConfigState
    ) {
        val trimmedProfileId = deletedProfileId.trim()
        if (trimmedProfileId.isBlank()) {
            return
        }
        clearShellSelection(context, trimmedProfileId, nextState.activeProfileId.trim())
        clearCodexRestore(context, trimmedProfileId)
    }

    private fun clearShellSelection(
        context: Context,
        deletedProfileId: String,
        fallbackProfileId: String
    ) {
        val prefs = context.getSharedPreferences(SHELL_PREFS_NAME, Context.MODE_PRIVATE)
        val persistedProfileId = prefs.getString(SHELL_PREF_LAST_PROFILE_ID, null)?.trim().orEmpty()
        if (persistedProfileId != deletedProfileId) {
            return
        }
        prefs.edit()
            .putString(SHELL_PREF_LAST_PROFILE_ID, fallbackProfileId)
            .remove(SHELL_PREF_LAST_SESSION_ID)
            .putString(SHELL_PREF_LAST_SESSION_MODE, SessionMode.TERMINAL.wireValue)
            .remove(SHELL_PREF_LAST_SESSION_CWD)
            .apply()
    }

    private fun clearCodexRestore(context: Context, deletedProfileId: String) {
        val prefs = context.getSharedPreferences(CODEX_PREFS_NAME, Context.MODE_PRIVATE)
        val persistedProfileId = prefs.getString(CODEX_PREF_LAST_PROFILE_ID, null)?.trim().orEmpty()
        if (persistedProfileId != deletedProfileId) {
            return
        }
        prefs.edit()
            .remove(CODEX_PREF_LAST_PROFILE_ID)
            .remove(CODEX_PREF_LAST_SESSION_ID)
            .remove(CODEX_PREF_LAST_SESSION_MODE)
            .remove(CODEX_PREF_LAST_CWD)
            .remove(CODEX_PREF_LAST_THREAD_ID)
            .apply()
    }

    private const val SHELL_PREFS_NAME = "termlink_shell"
    private const val SHELL_PREF_LAST_PROFILE_ID = "last_profile_id"
    private const val SHELL_PREF_LAST_SESSION_ID = "last_session_id"
    private const val SHELL_PREF_LAST_SESSION_MODE = "last_session_mode"
    private const val SHELL_PREF_LAST_SESSION_CWD = "last_session_cwd"

    private const val CODEX_PREFS_NAME = "codex_native_restore"
    private const val CODEX_PREF_LAST_PROFILE_ID = "last_profile_id"
    private const val CODEX_PREF_LAST_SESSION_ID = "last_session_id"
    private const val CODEX_PREF_LAST_SESSION_MODE = "last_session_mode"
    private const val CODEX_PREF_LAST_CWD = "last_cwd"
    private const val CODEX_PREF_LAST_THREAD_ID = "last_thread_id"
}
