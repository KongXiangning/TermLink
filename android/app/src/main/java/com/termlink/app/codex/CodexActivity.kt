package com.termlink.app.codex

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.ui.CodexScreen
import com.termlink.app.codex.ui.CodexTheme
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile

/**
 * Native Codex entry point — Phase 0.
 *
 * This activity is independent of [com.termlink.app.MainShellActivity] and
 * does not modify or depend on the existing WebView Codex path.
 */
class CodexActivity : ComponentActivity() {

    companion object {
        private const val TAG = "CodexActivity"
        private const val PREFS_NAME = "codex_native_restore"
        private const val PREF_PROFILE_ID = "last_profile_id"
        private const val PREF_SESSION_ID = "last_session_id"
        private const val PREF_SESSION_MODE = "last_session_mode"
        private const val PREF_CWD = "last_cwd"

        /**
         * Build an explicit launch intent for the native Codex entry.
         */
        fun newIntent(
            context: Context,
            profileId: String,
            sessionId: String,
            sessionMode: String = "codex",
            cwd: String? = null,
            launchSource: String = "sessions"
        ): Intent = Intent(context, CodexActivity::class.java).apply {
            putExtra(CodexLaunchParams.EXTRA_PROFILE_ID, profileId)
            putExtra(CodexLaunchParams.EXTRA_SESSION_ID, sessionId)
            putExtra(CodexLaunchParams.EXTRA_SESSION_MODE, sessionMode)
            cwd?.let { putExtra(CodexLaunchParams.EXTRA_CWD, it) }
            putExtra(CodexLaunchParams.EXTRA_LAUNCH_SOURCE, launchSource)
        }
    }

    private lateinit var viewModel: CodexViewModel
    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        viewModel = CodexViewModel(basicCredentialStore)

        val params = resolveParams()
        if (params == null) {
            Log.e(TAG, "Missing launch params, finishing")
            finish()
            return
        }

        val profile = resolveProfile(params.profileId)
        if (profile == null) {
            Log.e(TAG, "Profile not found: ${params.profileId}, finishing")
            finish()
            return
        }

        persistRestoreState(params)
        viewModel.connect(profile, params)

        setContent {
            CodexTheme {
                Scaffold { innerPadding ->
                    val uiState by viewModel.uiState.collectAsState()
                    CodexScreen(
                        state = uiState,
                        onSendMessage = viewModel::sendMessage,
                        onInterrupt = viewModel::interrupt,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::viewModel.isInitialized) {
            viewModel.disconnect()
        }
    }

    // ── Param resolution (Intent > restore > active profile) ─────────

    private fun resolveParams(): CodexLaunchParams? {
        // Priority 1: explicit Intent extras
        val intentProfileId = intent.getStringExtra(CodexLaunchParams.EXTRA_PROFILE_ID)
        val intentSessionId = intent.getStringExtra(CodexLaunchParams.EXTRA_SESSION_ID)
        if (!intentProfileId.isNullOrBlank() && !intentSessionId.isNullOrBlank()) {
            return CodexLaunchParams(
                profileId = intentProfileId,
                sessionId = intentSessionId,
                sessionMode = intent.getStringExtra(CodexLaunchParams.EXTRA_SESSION_MODE) ?: "codex",
                cwd = intent.getStringExtra(CodexLaunchParams.EXTRA_CWD),
                launchSource = intent.getStringExtra(CodexLaunchParams.EXTRA_LAUNCH_SOURCE)
                    ?: "intent"
            )
        }

        // Priority 2: persisted restore state
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val restoredProfileId = prefs.getString(PREF_PROFILE_ID, null)
        val restoredSessionId = prefs.getString(PREF_SESSION_ID, null)
        if (!restoredProfileId.isNullOrBlank() && !restoredSessionId.isNullOrBlank()) {
            return CodexLaunchParams(
                profileId = restoredProfileId,
                sessionId = restoredSessionId,
                sessionMode = prefs.getString(PREF_SESSION_MODE, "codex") ?: "codex",
                cwd = prefs.getString(PREF_CWD, null),
                launchSource = "restore"
            )
        }

        // No valid params
        return null
    }

    private fun resolveProfile(profileId: String): ServerProfile? {
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == profileId }
            ?: state.profiles.firstOrNull { it.id == state.activeProfileId }
    }

    private fun persistRestoreState(params: CodexLaunchParams) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putString(PREF_PROFILE_ID, params.profileId)
            .putString(PREF_SESSION_ID, params.sessionId)
            .putString(PREF_SESSION_MODE, params.sessionMode)
            .putString(PREF_CWD, params.cwd)
            .apply()
    }
}
