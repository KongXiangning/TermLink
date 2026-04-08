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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.ui.CodexScreen
import com.termlink.app.codex.ui.CodexTheme
import com.termlink.app.data.ApiResult
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Native Codex entry point — Phase 1.
 *
 * Startup priority:
 *   1. Explicit Intent extras (profileId + sessionId)
 *   2. Persisted restore state (SharedPreferences)
 *   3. Active profile + auto-create session
 *
 * This activity is independent of [com.termlink.app.MainShellActivity].
 */
class CodexActivity : ComponentActivity() {

    companion object {
        private const val TAG = "CodexActivity"
        private const val PREFS_NAME = "codex_native_restore"
        private const val PREF_PROFILE_ID = "last_profile_id"
        private const val PREF_SESSION_ID = "last_session_id"
        private const val PREF_SESSION_MODE = "last_session_mode"
        private const val PREF_CWD = "last_cwd"
        private const val PREF_THREAD_ID = "last_thread_id"
        private const val SHELL_PREFS_NAME = "termlink_shell"
        private const val SHELL_PREF_LAST_SESSION_CWD = "last_session_cwd"
        private const val DEFAULT_CODEX_CWD = "E:\\coding\\TermLink"

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
    private lateinit var sessionApiClient: SessionApiClient
    private var activeLaunchParams: CodexLaunchParams? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        sessionApiClient = SessionApiClient(applicationContext)
        viewModel = CodexViewModel(basicCredentialStore)

        setContent {
            CodexTheme {
                Scaffold { innerPadding ->
                    val uiState by viewModel.uiState.collectAsState()
                    CodexScreen(
                        state = uiState,
                        onSendMessage = viewModel::sendMessage,
                        onInterrupt = viewModel::interrupt,
                        onNewThread = viewModel::newThread,
                        onRetry = { retryConnection() },
                        onDismissError = { viewModel.clearError() },
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }

        observeUiState()
        resolveAndConnect()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::viewModel.isInitialized) {
            viewModel.disconnect()
        }
    }

    private fun retryConnection() {
        viewModel.clearError()
        resolveAndConnect()
    }

    /**
     * Resolve launch params and connect. If no sessionId is available,
     * auto-create a codex session via the HTTP API.
     */
    private fun resolveAndConnect() {
        val params = resolveParams()
        if (params != null) {
            startConnection(params)
            return
        }

        // Priority 3: active profile, auto-create session
        val profile = resolveActiveProfile()
        if (profile == null) {
            viewModel.setError(getString(com.termlink.app.R.string.codex_native_no_profile))
            return
        }

        viewModel.setCreatingSession()
        val initialCwd = resolveAutoCreateCwd()
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                sessionApiClient.createSession(
                    profile,
                    "Codex Native",
                    SessionMode.CODEX,
                    initialCwd
                )
            }
            when (result) {
                is ApiResult.Success -> {
                    val ref = result.value
                    val newParams = CodexLaunchParams(
                        profileId = profile.id,
                        sessionId = ref.id,
                        sessionMode = ref.sessionMode.wireValue,
                        cwd = ref.cwd ?: initialCwd,
                        threadId = ref.lastCodexThreadId,
                        launchSource = "auto_create"
                    )
                    startConnection(newParams)
                }
                is ApiResult.Failure -> {
                    Log.e(TAG, "Session create failed: ${result.error}")
                    viewModel.setError(
                        getString(com.termlink.app.R.string.codex_native_session_failed)
                    )
                }
            }
        }
    }

    private fun resolveAutoCreateCwd(): String {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getString(PREF_CWD, null)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { return it }

        getSharedPreferences(SHELL_PREFS_NAME, MODE_PRIVATE)
            .getString(SHELL_PREF_LAST_SESSION_CWD, null)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?.let { return it }

        return DEFAULT_CODEX_CWD
    }

    private fun startConnection(params: CodexLaunchParams) {
        val profile = resolveProfile(params.profileId)
        if (profile == null) {
            viewModel.setError("Profile not found: ${params.profileId}")
            return
        }
        activeLaunchParams = params
        persistRestoreState(params)
        viewModel.connect(profile, params)
    }

    private fun observeUiState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    val params = activeLaunchParams ?: return@collect
                    persistRestoreState(
                        params.copy(
                            cwd = state.cwd ?: params.cwd,
                            threadId = state.threadId ?: params.threadId
                        )
                    )
                }
            }
        }
    }

    // ── Param resolution (Intent > restore) ──────────────────────────

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
                launchSource = intent.getStringExtra(CodexLaunchParams.EXTRA_LAUNCH_SOURCE) ?: "intent"
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
                threadId = prefs.getString(PREF_THREAD_ID, null),
                launchSource = "restore"
            )
        }

        return null
    }

    private fun resolveProfile(profileId: String): ServerProfile? {
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == profileId }
            ?: state.profiles.firstOrNull { it.id == state.activeProfileId }
    }

    private fun resolveActiveProfile(): ServerProfile? {
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == state.activeProfileId }
            ?: state.profiles.firstOrNull()
    }

    private fun persistRestoreState(params: CodexLaunchParams) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putString(PREF_PROFILE_ID, params.profileId)
            .putString(PREF_SESSION_ID, params.sessionId)
            .putString(PREF_SESSION_MODE, params.sessionMode)
            .putString(PREF_CWD, params.cwd)
            .putString(PREF_THREAD_ID, params.threadId)
            .apply()
    }
}
