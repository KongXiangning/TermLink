package com.termlink.app.codex

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import androidx.core.view.GravityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import com.termlink.app.R
import com.termlink.app.CodexTaskForegroundService
import com.termlink.app.MainShellActivity
import com.termlink.app.SettingsActivity
import com.termlink.app.WorkspaceActivity
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.domain.FileMention
import com.termlink.app.codex.domain.CodexMessageAttachment
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.DebugServerRequestPreset
import com.termlink.app.codex.ui.CodexScreen
import com.termlink.app.codex.ui.CodexTheme
import com.termlink.app.data.ApiResult
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.SessionMode
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.util.setStatusBarHidden
import com.termlink.app.util.ScreenTimeoutController
import com.termlink.app.util.PersistentDiagnosticLog
import com.termlink.app.util.UiPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.min
import kotlin.math.roundToInt

internal fun normalizeCodexLaunchThreadId(threadId: String?): String? {
    val normalized = threadId?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return when {
        normalized.equals("null", ignoreCase = true) -> null
        normalized.equals("undefined", ignoreCase = true) -> null
        else -> normalized
    }
}

internal fun resolveCodexTargetThreadId(
    explicitThreadId: String?,
    fallbackThreadId: String?
): String? {
    return normalizeCodexLaunchThreadId(explicitThreadId)
        ?: normalizeCodexLaunchThreadId(fallbackThreadId)
}

internal fun resolveIntentLaunchThreadId(
    intentProfileId: String,
    intentSessionId: String,
    explicitThreadId: String?,
    storedProfileId: String?,
    storedSessionId: String?,
    storedThreadId: String?
): String? {
    resolveCodexTargetThreadId(explicitThreadId, null)?.let { return it }
    val sameStoredSession = storedProfileId == intentProfileId && storedSessionId == intentSessionId
    return if (sameStoredSession) {
        normalizeCodexLaunchThreadId(storedThreadId)
    } else {
        null
    }
}

internal fun resolveConversationWorkspacePath(rawPath: String?, cwd: String?): String? {
    val raw = rawPath?.trim()?.replace('\\', '/')?.trimEnd('/').orEmpty()
    if (raw.isBlank() || raw.contains("://")) {
        return null
    }
    val isWindowsAbsolute = Regex("^[A-Za-z]:/").containsMatchIn(raw)
    val isPosixAbsolute = raw.startsWith("/")
    val normalizedCwd = cwd?.trim()?.replace('\\', '/')?.let {
        if (it == "/") it else it.trimEnd('/')
    }
    val relative = when {
        !isWindowsAbsolute && !isPosixAbsolute -> raw
        isWindowsAbsolute -> {
            val base = normalizedCwd
                ?.takeIf { Regex("^[A-Za-z]:/").containsMatchIn(it) }
                ?: return null
            val prefix = "$base/"
            if (!raw.startsWith(prefix, ignoreCase = true)) return null
            raw.substring(prefix.length)
        }
        else -> {
            val base = normalizedCwd?.takeIf { it.startsWith("/") } ?: return null
            val prefix = if (base == "/") "/" else "$base/"
            if (!raw.startsWith(prefix)) return null
            raw.substring(prefix.length)
        }
    }
    if (relative.isBlank() || relative.startsWith("/") || relative.split('/').any {
            it.isBlank() || it == "." || it == ".." || it.equals(".git", ignoreCase = true)
        }) {
        return null
    }
    return relative
}

private const val MAX_CONVERSATION_DATA_BYTES = 25L * 1024L * 1024L

internal fun mergeSameSessionLaunchParams(
    next: CodexLaunchParams,
    current: CodexLaunchParams?
): CodexLaunchParams {
    if (current == null) {
        return next.copy(
            cwd = next.cwd,
            threadId = normalizeCodexLaunchThreadId(next.threadId)
        )
    }
    return next.copy(
        cwd = next.cwd ?: current.cwd,
        threadId = resolveCodexTargetThreadId(next.threadId, current.threadId)
    )
}

internal fun shouldRequestCodexBatteryOptimizationExemption(
    sdkInt: Int,
    activityVisible: Boolean,
    taskActive: Boolean,
    alreadyExempt: Boolean,
    requestAttempted: Boolean
): Boolean {
    return sdkInt >= Build.VERSION_CODES.M &&
        activityVisible &&
        taskActive &&
        !alreadyExempt &&
        !requestAttempted
}

internal fun buildCodexForegroundServiceSignature(
    status: String,
    sessionId: String?,
    threadId: String?
): String {
    return listOf(
        status.trim().lowercase(),
        sessionId?.trim().orEmpty(),
        normalizeCodexLaunchThreadId(threadId).orEmpty()
    ).joinToString("|")
}

internal fun formatCodexQuotaNotificationText(
    summary: String,
    remainingLabel: String,
    resetsPrefix: String,
    retryPrefix: String,
    localizeWindow: (String) -> String = { it.trim() },
    formatExtraScopes: (Int) -> String = { "+$it" }
): String {
    if (summary.isBlank()) return ""
    return summary.split('|').mapNotNull { part ->
        val trimmed = part.trim()
        when {
            trimmed.isBlank() -> null
            trimmed.startsWith("↺") -> {
                val retryValue = trimmed.removePrefix("↺").trim()
                retryValue.takeIf { it.isNotBlank() }?.let {
                    "$retryPrefix $it".trim()
                }
            }
            trimmed.startsWith("⏱") -> {
                val resetHint = cleanCodexQuotaResetHint(trimmed)
                resetHint.takeIf { it.isNotBlank() }?.let {
                    "${resetsPrefix.trim()} $it".trim()
                }
            }
            else -> {
                val extraScopesMatch = Regex("""^\+(\d+)$""").matchEntire(trimmed)
                if (extraScopesMatch != null) {
                    return@mapNotNull extraScopesMatch.groupValues[1]
                        .toIntOrNull()
                        ?.let(formatExtraScopes)
                }

                val remainingMatch = Regex("""^([^\s:]+):(\d+(?:/\d+)?)$""").matchEntire(trimmed)
                if (remainingMatch != null) {
                    return@mapNotNull buildString {
                        append(localizeWindow(remainingMatch.groupValues[1]))
                        append(' ')
                        append(remainingMatch.groupValues[2])
                        append(' ')
                        append(remainingLabel)
                    }.trim()
                }

                val percentResetMatch = Regex("""^(\S+)\s+(\d{1,3})%\s+(.+)$""").matchEntire(trimmed)
                if (percentResetMatch != null) {
                    val usedPercent = percentResetMatch.groupValues[2]
                        .toIntOrNull()
                        ?.coerceIn(0, 100)
                        ?: return@mapNotNull trimmed
                    val resetHint = cleanCodexQuotaResetHint(percentResetMatch.groupValues[3])
                    return@mapNotNull buildString {
                        append(localizeWindow(percentResetMatch.groupValues[1]))
                        append(' ')
                        append(100 - usedPercent)
                        append("% ")
                        append(remainingLabel)
                        if (resetHint.isNotBlank()) {
                            append(" · ")
                            append(resetsPrefix.trim())
                            append(' ')
                            append(resetHint)
                        }
                    }.trim()
                }

                val percentMatch = Regex("""^(\S+)\s+(\d{1,3})%$""").matchEntire(trimmed)
                if (percentMatch != null) {
                    val usedPercent = percentMatch.groupValues[2]
                        .toIntOrNull()
                        ?.coerceIn(0, 100)
                        ?: return@mapNotNull trimmed
                    return@mapNotNull buildString {
                        append(localizeWindow(percentMatch.groupValues[1]))
                        append(' ')
                        append(100 - usedPercent)
                        append("% ")
                        append(remainingLabel)
                    }.trim()
                }

                trimmed
            }
        }
    }.joinToString(" · ")
}

private fun cleanCodexQuotaResetHint(value: String): String {
    return value
        .trim()
        .removePrefix("⏱")
        .removePrefix("resets ")
        .removePrefix("重置 ")
        .removePrefix("重置")
        .trim()
}

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
class CodexActivity : AppCompatActivity(), SessionsFragment.Callbacks {

    companion object {
        private const val TAG = "CodexActivity"
        private const val PREFS_NAME = "codex_native_restore"
        private const val PREF_PROFILE_ID = "last_profile_id"
        private const val PREF_SESSION_ID = "last_session_id"
        private const val PREF_SESSION_MODE = "last_session_mode"
        private const val PREF_CWD = "last_cwd"
        private const val PREF_THREAD_ID = "last_thread_id"
        private const val SHELL_PREFS_NAME = "termlink_shell"
        private const val SHELL_PREF_LAST_PROFILE_ID = "last_profile_id"
        private const val SHELL_PREF_LAST_SESSION_ID = "last_session_id"
        private const val SHELL_PREF_LAST_SESSION_MODE = "last_session_mode"
        private const val SHELL_PREF_LAST_SESSION_CWD = "last_session_cwd"
        private const val DEFAULT_CODEX_CWD = "E:\\coding\\TermLink"
        private const val DOCS_DEFAULT_ENTRY_PATH = "docs"
        private const val REQUEST_CODE_NOTIFICATION_PERMISSION = 10003
        private const val QUOTA_CHANNEL_ID = "codex_quota_status"
        private const val NOTIF_ID_QUOTA = 9202
        private const val ATTENTION_CHANNEL_ID = "codex_task_attention"
        private const val ATTENTION_NOTIFICATION_GROUP = "codex_attention"
        private const val NOTIF_ID_APPROVAL = 9301
        private const val NOTIF_ID_PLAN_INPUT = 9302
        private const val NOTIF_ID_PLAN_READY = 9303
        private const val NOTIF_ID_TASK_ERROR = 9304
        private const val NOTIF_ID_TASK_COMPLETE = 9305
        private const val TAG_SESSIONS_DRAWER = "sessions_drawer"
        private const val DRAWER_EDGE_EXCLUSION_DP = 56
        private const val DRAWER_MAX_WIDTH_DP = 420
        private const val DRAWER_WIDTH_FRACTION = 0.75f

        fun newIntent(
            context: Context,
            profileId: String,
            sessionId: String,
            sessionMode: String = "codex",
            cwd: String? = null,
            threadId: String? = null,
            launchSource: String = "sessions"
        ): Intent = Intent(context, CodexActivity::class.java).apply {
            putExtra(CodexLaunchParams.EXTRA_PROFILE_ID, profileId)
            putExtra(CodexLaunchParams.EXTRA_SESSION_ID, sessionId)
            putExtra(CodexLaunchParams.EXTRA_SESSION_MODE, sessionMode)
            cwd?.let { putExtra(CodexLaunchParams.EXTRA_CWD, it) }
            resolveCodexTargetThreadId(threadId, null)?.let {
                putExtra(CodexLaunchParams.EXTRA_THREAD_ID, it)
            }
            putExtra(CodexLaunchParams.EXTRA_LAUNCH_SOURCE, launchSource)
        }
    }

    private lateinit var viewModel: CodexViewModel
    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private lateinit var sessionApiClient: SessionApiClient
    private var activeLaunchParams: CodexLaunchParams? = null
    private var codexForegroundServiceActive: Boolean = false
    private var codexForegroundServiceSignature: String? = null
    private var batteryOptimizationRequestAttempted: Boolean = false
    private var isActivityVisible: Boolean = false
    private var quotaNotificationSignature: String? = null
    private var previousUiState: CodexUiState? = null
    private val activeAttentionKeys = mutableMapOf<Int, String>()
    private var drawerLayout: DrawerLayout? = null
    private var sessionsDrawerContainer: android.view.View? = null
    private var composeContainerView: ComposeView? = null
    private var composeContainerBasePaddingLeft: Int = 0
    private var composeContainerBasePaddingTop: Int = 0
    private var composeContainerBasePaddingRight: Int = 0
    private var composeContainerBasePaddingBottom: Int = 0
    private var sessionsDrawerBasePaddingLeft: Int = 0
    private var sessionsDrawerBasePaddingTop: Int = 0
    private var sessionsDrawerBasePaddingRight: Int = 0
    private var sessionsDrawerBasePaddingBottom: Int = 0
    private var drawerSelection: SessionSelection? = null
    private var appliedThemePreference: String? = null
    private lateinit var screenTimeoutController: ScreenTimeoutController
    private val drawerListener = object : DrawerLayout.SimpleDrawerListener() {
        override fun onDrawerSlide(drawerView: android.view.View, slideOffset: Float) {
            if (drawerView.id == R.id.codex_sessions_drawer_container && slideOffset > 0f) {
                setDrawerSessionsContentVisible(true)
            }
        }

        override fun onDrawerOpened(drawerView: android.view.View) {
            if (drawerView.id == R.id.codex_sessions_drawer_container) {
                setDrawerSessionsContentVisible(true)
                updateStatusBarVisibility()
            }
        }

        override fun onDrawerClosed(drawerView: android.view.View) {
            if (drawerView.id == R.id.codex_sessions_drawer_container) {
                setDrawerSessionsContentVisible(false)
                updateStatusBarVisibility()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        PersistentDiagnosticLog.event(
            "codex_activity",
            "android.codex.lifecycle.on_create",
            mapOf("restoredState" to (savedInstanceState != null)),
            critical = true
        )
        screenTimeoutController = ScreenTimeoutController(this, window)
        enableEdgeToEdge()
        setContentView(R.layout.activity_codex)
        drawerLayout = findViewById(R.id.codex_root_drawer)
        sessionsDrawerContainer = findViewById(R.id.codex_sessions_drawer_container)
        composeContainerView = findViewById(R.id.codex_compose_container)
        composeContainerView?.let { container ->
            composeContainerBasePaddingLeft = container.paddingLeft
            composeContainerBasePaddingTop = container.paddingTop
            composeContainerBasePaddingRight = container.paddingRight
            composeContainerBasePaddingBottom = container.paddingBottom
        }
        sessionsDrawerContainer?.let { container ->
            sessionsDrawerBasePaddingLeft = container.paddingLeft
            sessionsDrawerBasePaddingTop = container.paddingTop
            sessionsDrawerBasePaddingRight = container.paddingRight
            sessionsDrawerBasePaddingBottom = container.paddingBottom
        }
        applyDrawerWidth()
        drawerLayout?.addDrawerListener(drawerListener)
        applyDrawerGestureExclusion()
        ensureDrawerSessionsFragment()
        setDrawerSessionsContentVisible(false)
        applySystemBarInsets()

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        sessionApiClient = SessionApiClient(applicationContext)
        viewModel = CodexViewModel(applicationContext, basicCredentialStore, sessionApiClient)

        composeContainerView?.setContent {
            CodexTheme {
                Scaffold(
                    contentWindowInsets = WindowInsets(0, 0, 0, 0)
                ) { innerPadding ->
                    val uiState by viewModel.uiState.collectAsState()
                    val filePickerLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.OpenDocument()
                    ) { uri ->
                        uri?.let(::handlePickedDocument)
                    }
                    CodexScreen(
                        state = uiState,
                        onSendMessage = viewModel::handleComposerSubmit,
                        onInterrupt = viewModel::interrupt,
                        onContinueGoal = viewModel::continueActiveGoal,
                        onOpenSessions = ::openSessions,
                        onOpenDocs = ::openDocsWorkspace,
                        onOpenFileMention = ::openConversationFileMention,
                        onOpenAttachment = ::openConversationAttachment,
                        onNewThread = viewModel::newThread,
                        onResolveThreadRecovery = viewModel::resolveThreadRecovery,
                        onConsumeComposerRecoveryText = viewModel::consumeComposerRecoveryText,
                        onRetry = { retryConnection() },
                        onDismissError = { viewModel.clearError() },
                        onShowSlashMenu = viewModel::showSlashMenu,
                        onHideSlashMenu = viewModel::hideSlashMenu,
                        onSlashMenuQueryChanged = viewModel::updateSlashMenuQuery,
                        onComposerTextChanged = viewModel::handleComposerTextChanged,
                        onHideFileMentionMenu = viewModel::hideFileMentionMenu,
                        onSelectFileMention = viewModel::selectFileMention,
                        onRemoveFileMention = viewModel::removeFileMention,
                        onApproveRequest = viewModel::submitApprovalDecision,
                        onSubmitUserInputAnswers = viewModel::submitUserInputAnswers,
                        onRejectUserInputRequest = viewModel::rejectUserInputRequest,
                        onShowModelPicker = viewModel::showModelPicker,
                        onHideModelPicker = viewModel::hideModelPicker,
                        onSelectModel = viewModel::selectModel,
                        onShowReasoningPicker = viewModel::showReasoningPicker,
                        onHideReasoningPicker = viewModel::hideReasoningPicker,
                        onSelectReasoningEffort = viewModel::selectReasoningEffort,
                        onShowSandboxPicker = viewModel::showSandboxPicker,
                        onHideSandboxPicker = viewModel::hideSandboxPicker,
                        onSelectSandboxMode = viewModel::selectSandboxMode,
                        onTogglePlanMode = viewModel::togglePlanMode,
                        onToggleGoalMode = viewModel::toggleGoalMode,
                        onToggleFastMode = viewModel::toggleFastMode,
                        onExecuteConfirmedPlan = viewModel::executeConfirmedPlan,
                        onContinuePlanWorkflow = viewModel::continuePlanWorkflow,
                        onCancelPlanWorkflow = viewModel::cancelPlanWorkflow,
                        onShowToolsPanel = viewModel::showToolsPanel,
                        onHideToolsPanel = viewModel::hideToolsPanel,
                        onSelectSkill = viewModel::selectSkill,
                        onClearActiveSkill = viewModel::clearActiveSkill,
                        onRequestCompactCurrentThread = viewModel::requestCompactCurrentThread,
                        onShowUsagePanel = viewModel::showUsagePanel,
                        onHideUsagePanel = viewModel::hideUsagePanel,
                        onShowRuntimePanel = viewModel::showRuntimePanel,
                        onHideRuntimePanel = viewModel::hideRuntimePanel,
                        onShowNoticesPanel = viewModel::showNoticesPanel,
                        onHideNoticesPanel = viewModel::hideNoticesPanel,
                        onShowThreadHistory = viewModel::showThreadHistory,
                        onHideThreadHistory = viewModel::hideThreadHistory,
                        onRefreshThreadHistory = viewModel::refreshThreadHistory,
                        onResumeThread = viewModel::resumeThread,
                        onForkThread = viewModel::forkThread,
                        onToggleThreadArchive = viewModel::toggleThreadArchive,
                        onStartThreadRename = viewModel::startThreadRename,
                        onUpdateThreadRenameDraft = viewModel::updateThreadRenameDraft,
                        onCancelThreadRename = viewModel::cancelThreadRename,
                        onSubmitThreadRename = viewModel::submitThreadRename,
                        onPickLocalFile = {
                            filePickerLauncher.launch(arrayOf("*/*"))
                        },
                        onRemovePendingImageAttachment = viewModel::removePendingImageAttachment,
                        onInjectDebugServerRequest = viewModel::injectDebugServerRequest,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }

        observeUiState()
        resolveAndConnect()
    }

    override fun onStart() {
        super.onStart()
        if (recoverIfLaunchProfileWasDeleted()) {
            return
        }
        isActivityVisible = true
        screenTimeoutController.onVisible()
        cancelAttentionNotifications()
        updateStatusBarVisibility()
        drawerLayout?.post {
            drawerLayout?.let(ViewCompat::requestApplyInsets)
        }
        // Log task loading on resume (after lock/unlock)
        val state = viewModel.uiState.value
        PersistentDiagnosticLog.event(
            "codex_activity",
            "android.codex.lifecycle.on_start",
            mapOf(
                "threadIdPresent" to !state.threadId.isNullOrBlank(),
                "conversationIdPresent" to !state.activeConversationId.isNullOrBlank(),
                "ipcOnline" to state.ipcOnline,
                "sessionIdPresent" to state.sessionId.isNotBlank()
            ),
            critical = true
        )
        Log.i(TAG, "[lifecycle][onStart] activity visible, current task: " +
            "threadId=${state.threadId.orEmpty()} " +
            "activeConversationId=${state.activeConversationId.orEmpty()} " +
            "ipcOnline=${state.ipcOnline} " +
            "sessionId=${state.sessionId} " +
            "cwd=${state.cwd.orEmpty()}")
        maybeRequestBatteryOptimizationExemption(
            state = state,
            normalizedStatus = resolveForegroundServiceStatus(state)
        )
        viewModel.onHostVisible()
    }

    override fun onStop() {
        val state = viewModel.uiState.value
        PersistentDiagnosticLog.event(
            "codex_activity",
            "android.codex.lifecycle.on_stop",
            mapOf(
                "threadIdPresent" to !state.threadId.isNullOrBlank(),
                "conversationIdPresent" to !state.activeConversationId.isNullOrBlank(),
                "ipcOnline" to state.ipcOnline,
                "changingConfigurations" to isChangingConfigurations
            ),
            critical = true
        )
        Log.i(TAG, "[lifecycle][onStop] activity hidden, active task: " +
            "threadId=${state.threadId.orEmpty()} " +
            "activeConversationId=${state.activeConversationId.orEmpty()} " +
            "ipcOnline=${state.ipcOnline} " +
            "sessionId=${state.sessionId}")
        isActivityVisible = false
        screenTimeoutController.onHidden()
        viewModel.onHostHidden()
        setStatusBarHidden(hidden = false, anchor = drawerLayout)
        if (!isChangingConfigurations) {
            syncAttentionNotifications(null, viewModel.uiState.value)
        }
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        PersistentDiagnosticLog.event("codex_activity", "android.codex.lifecycle.on_resume", critical = true)
        val currentThemePreference = UiPreferences.theme(this)
        val previousThemePreference = appliedThemePreference
        appliedThemePreference = currentThemePreference
        if (previousThemePreference != null && previousThemePreference != currentThemePreference) {
            // Settings is a separate Activity. Recreate this host when the
            // preference changes so Compose reapplies the saved palette.
            recreate()
        }
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        screenTimeoutController.onUserInteraction()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        PersistentDiagnosticLog.event(
            "codex_activity",
            "android.codex.lifecycle.window_focus",
            mapOf("hasFocus" to hasFocus, "visible" to isActivityVisible)
        )
        if (hasFocus && isActivityVisible) {
            updateStatusBarVisibility()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        PersistentDiagnosticLog.event("codex_activity", "android.codex.lifecycle.new_intent", critical = true)
        setIntent(intent)
        val params = resolveParams() ?: return
        if (targetsSameSession(params, activeLaunchParams)) {
            val currentParams = activeLaunchParams
            val mergedParams = mergeSameSessionLaunchParams(params, currentParams)
            val threadChanged = normalizeCodexLaunchThreadId(mergedParams.threadId) !=
                normalizeCodexLaunchThreadId(currentParams?.threadId)
            if (threadChanged) {
                viewModel.clearError()
                startConnection(mergedParams)
            } else {
                activeLaunchParams = mergedParams
                syncActivityIntent(mergedParams)
                persistActiveLaunchSelection(mergedParams)
            }
            cancelAttentionNotifications()
            return
        }
        viewModel.clearError()
        startConnection(params)
        cancelAttentionNotifications()
    }

    override fun onDestroy() {
        drawerLayout?.removeDrawerListener(drawerListener)
        screenTimeoutController.dispose()
        super.onDestroy()
        if (::viewModel.isInitialized) {
            viewModel.disconnect()
        }
    }

    private fun applySystemBarInsets() {
        val root = drawerLayout ?: return
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            composeContainerView?.setPadding(
                composeContainerBasePaddingLeft,
                composeContainerBasePaddingTop,
                composeContainerBasePaddingRight,
                composeContainerBasePaddingBottom
            )
            sessionsDrawerContainer?.setPadding(
                sessionsDrawerBasePaddingLeft,
                sessionsDrawerBasePaddingTop,
                sessionsDrawerBasePaddingRight,
                sessionsDrawerBasePaddingBottom + systemBars.bottom
            )
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    private fun shouldHideStatusBar(): Boolean {
        return isActivityVisible
    }

    private fun updateStatusBarVisibility() {
        val anchor = drawerLayout ?: return
        setStatusBarHidden(hidden = shouldHideStatusBar(), anchor = anchor)
        anchor.post {
            ViewCompat.requestApplyInsets(anchor)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val layout = drawerLayout
        if (layout?.isDrawerOpen(GravityCompat.START) == true) {
            layout.closeDrawer(GravityCompat.START)
            return
        }
        super.onBackPressed()
    }

    private fun retryConnection() {
        viewModel.clearError()
        resolveAndConnect()
    }

    private fun openSessions() {
        ensureDrawerSessionsFragment()
        setDrawerSessionsContentVisible(true)
        drawerLayout?.post {
            drawerLayout?.openDrawer(GravityCompat.START)
        }
    }

    private fun openSettings() {
        closeSessionsDrawerIfOpen()
        startActivity(SettingsActivity.newIntent(this))
    }

    private fun openDocsWorkspace() {
        val params = activeLaunchParams ?: return
        val sessionId = viewModel.uiState.value.sessionId.ifBlank { params.sessionId }
        if (sessionId.isBlank()) {
            viewModel.setError(getString(com.termlink.app.R.string.workspace_activity_invalid_session))
            return
        }
        startActivity(
            WorkspaceActivity.newIntent(
                context = this,
                profileId = params.profileId,
                sessionId = sessionId,
                defaultEntryPath = DOCS_DEFAULT_ENTRY_PATH
            )
        )
    }

    private fun openConversationFileMention(file: FileMention) {
        openConversationPath(file.path, null)
    }

    private fun openConversationAttachment(attachment: CodexMessageAttachment) {
        if (!attachment.contentHash.isNullOrBlank()) {
            viewModel.downloadOriginalAttachment(attachment) { file ->
                if (file != null) {
                    openCachedConversationFile(file, attachment.mimeType ?: mimeTypeForAttachment(attachment) ?: "image/*")
                } else {
                    showConversationOpenError()
                }
            }
            return
        }
        val candidate = attachment.url?.trim()?.takeIf { it.isNotBlank() }
            ?: attachment.path?.trim()?.takeIf { it.isNotBlank() }
        if (candidate == null) {
            showConversationOpenError()
            return
        }
        openConversationPath(candidate, mimeTypeForAttachment(attachment))
    }

    private fun openConversationPath(rawValue: String, requestedMimeType: String?) {
        val value = rawValue.trim()
        val uri = Uri.parse(value)
        when (uri.scheme?.lowercase()) {
            "http", "https", "mailto" -> openExternalConversationUri(uri)
            "content", "file" -> openLocalConversationUri(uri, requestedMimeType)
            "data" -> openDataConversationUri(uri, requestedMimeType)
            else -> {
                val relativePath = resolveConversationWorkspacePath(value, viewModel.uiState.value.cwd)
                if (relativePath == null) {
                    showConversationOpenError()
                } else {
                    openWorkspaceFile(relativePath)
                }
            }
        }
    }

    private fun openWorkspaceFile(relativePath: String) {
        val params = activeLaunchParams ?: return showConversationOpenError()
        val sessionId = viewModel.uiState.value.sessionId.ifBlank { params.sessionId }
        if (sessionId.isBlank()) {
            showConversationOpenError()
            return
        }
        startActivity(
            WorkspaceActivity.newIntent(
                context = this,
                profileId = params.profileId,
                sessionId = sessionId,
                defaultEntryPath = DOCS_DEFAULT_ENTRY_PATH,
                initialFilePath = relativePath
            )
        )
    }

    private fun openExternalConversationUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (error: RuntimeException) {
            Log.w(TAG, "Failed to open Codex external attachment", error)
            showConversationOpenError()
        }
    }

    private fun openLocalConversationUri(uri: Uri, requestedMimeType: String?) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, requestedMimeType ?: contentResolver.getType(uri) ?: "*/*")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            })
        } catch (error: RuntimeException) {
            Log.w(TAG, "Failed to open Codex local attachment", error)
            showConversationOpenError()
        }
    }

    private fun openDataConversationUri(uri: Uri, requestedMimeType: String?) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val parsed = parseConversationDataUri(uri.toString())
                val directory = java.io.File(cacheDir, "codex-open").apply { mkdirs() }
                val extension = extensionForMimeType(parsed.mimeType ?: requestedMimeType)
                val file = java.io.File(directory, "${System.currentTimeMillis()}$extension")
                file.writeBytes(parsed.bytes)
                withContext(kotlinx.coroutines.Dispatchers.Main) {
                    openCachedConversationFile(file, parsed.mimeType ?: requestedMimeType ?: "application/octet-stream")
                }
            } catch (error: Exception) {
                Log.w(TAG, "Failed to open Codex data attachment", error)
                withContext(kotlinx.coroutines.Dispatchers.Main) { showConversationOpenError() }
            }
        }
    }

    private fun openCachedConversationFile(file: java.io.File, mimeType: String) {
        try {
            val contentUri = FileProvider.getUriForFile(
                this,
                "${com.termlink.app.BuildConfig.APPLICATION_ID}.fileprovider",
                file
            )
            startActivity(Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            })
        } catch (_: ActivityNotFoundException) {
            showConversationOpenError()
        } catch (error: IllegalArgumentException) {
            Log.w(TAG, "Codex attachment cache is outside FileProvider roots", error)
            showConversationOpenError()
        }
    }

    private fun showConversationOpenError() {
        Toast.makeText(this, getString(R.string.codex_native_attachment_open_failed), Toast.LENGTH_SHORT).show()
    }

    private fun mimeTypeForAttachment(attachment: CodexMessageAttachment): String? {
        val value = attachment.url ?: attachment.path ?: return null
        if (value.startsWith("data:", ignoreCase = true)) {
            return value.substringAfter(':').substringBefore(';').takeIf { it.contains('/') }
        }
        return android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(
            value.substringBefore('?').substringAfterLast('.', "").lowercase()
        )
    }

    private data class ConversationDataUri(val mimeType: String?, val bytes: ByteArray)

    private fun parseConversationDataUri(value: String): ConversationDataUri {
        val commaIndex = value.indexOf(',')
        require(value.startsWith("data:", ignoreCase = true) && commaIndex > 4)
        val metadata = value.substring(5, commaIndex)
        val payload = value.substring(commaIndex + 1)
        val mimeType = metadata.substringBefore(';').takeIf { it.contains('/') }
        val bytes = if (metadata.split(';').any { it.equals("base64", ignoreCase = true) }) {
            Base64.decode(payload, Base64.DEFAULT)
        } else {
            Uri.decode(payload).toByteArray(Charsets.UTF_8)
        }
        require(bytes.isNotEmpty() && bytes.size.toLong() <= MAX_CONVERSATION_DATA_BYTES)
        return ConversationDataUri(mimeType, bytes)
    }

    private fun extensionForMimeType(mimeType: String?): String {
        val extension = mimeType?.takeIf { it.contains('/') }?.let {
            android.webkit.MimeTypeMap.getSingleton().getExtensionFromMimeType(it)
        }
        return extension?.let { ".${it}" } ?: ".bin"
    }

    override fun getProfiles(): List<ServerProfile> {
        return serverConfigStore.loadState().profiles
    }

    override fun getCurrentSelection(): SessionSelection {
        drawerSelection?.let { selection ->
            if (selection.profileId.isNotBlank()) {
                return selection
            }
        }
        val params = activeLaunchParams
        val uiState = viewModel.uiState.value
        return SessionSelection(
            profileId = params?.profileId ?: serverConfigStore.loadState().activeProfileId,
            sessionId = uiState.sessionId.ifBlank { params?.sessionId.orEmpty() },
            sessionMode = SessionMode.CODEX,
            cwd = uiState.cwd ?: params?.cwd,
            lastCodexThreadId = normalizeCodexLaunchThreadId(uiState.threadId ?: params?.threadId)
        )
    }

    override fun onOpenSession(selection: SessionSelection) {
        drawerSelection = selection
        closeSessionsDrawerIfOpen()
        val currentState = viewModel.uiState.value
        Log.i(TAG, "[lifecycle][drawer-select] manual task selection: " +
            "selectedThreadId=${selection.lastCodexThreadId.orEmpty()} " +
            "selectedSessionId=${selection.sessionId} " +
            "profileId=${selection.profileId} " +
            "cwd=${selection.cwd.orEmpty()} " +
            "currentActiveConversationId=${currentState.activeConversationId.orEmpty()} " +
            "currentThreadId=${currentState.threadId.orEmpty()} " +
            "ipcOnline=${currentState.ipcOnline}")
        if (selection.sessionMode == SessionMode.CODEX) {
            startActivity(
                newIntent(
                    context = this,
                    profileId = selection.profileId,
                    sessionId = selection.sessionId,
                    sessionMode = selection.sessionMode.wireValue,
                    cwd = selection.cwd,
                    threadId = selection.lastCodexThreadId,
                    launchSource = "sessions_drawer"
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
            )
            return
        }
        startActivity(
            MainShellActivity.newIntent(
                context = this,
                profileId = selection.profileId,
                sessionId = selection.sessionId,
                sessionMode = selection.sessionMode.wireValue,
                cwd = selection.cwd
            ).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
        )
    }

    override fun onUpdateSessionSelection(selection: SessionSelection) {
        drawerSelection = selection
    }

    override fun onOpenSettings() {
        openSettings()
    }

    private fun closeSessionsDrawerIfOpen() {
        val layout = drawerLayout ?: return
        if (layout.isDrawerOpen(GravityCompat.START)) {
            layout.closeDrawer(GravityCompat.START)
        }
    }

    private fun applyDrawerGestureExclusion() {
        val layout = drawerLayout ?: return
        layout.post {
            val exclusionWidthPx = (DRAWER_EDGE_EXCLUSION_DP * resources.displayMetrics.density).roundToInt()
                .coerceAtMost(layout.width)
            ViewCompat.setSystemGestureExclusionRects(
                layout,
                listOf(Rect(0, 0, exclusionWidthPx, layout.height))
            )
        }
    }

    private fun ensureDrawerSessionsFragment() {
        if (supportFragmentManager.findFragmentByTag(TAG_SESSIONS_DRAWER) != null) {
            return
        }
        val fragment = SessionsFragment()
        supportFragmentManager.commit {
            setReorderingAllowed(true)
            add(R.id.codex_sessions_drawer_container, fragment, TAG_SESSIONS_DRAWER)
        }
    }

    private fun setDrawerSessionsContentVisible(visible: Boolean) {
        val fragment = supportFragmentManager.findFragmentByTag(TAG_SESSIONS_DRAWER) as? SessionsFragment ?: return
        fragment.onDrawerContentVisibilityChanged(visible)
    }

    private fun applyDrawerWidth() {
        val container = sessionsDrawerContainer ?: return
        val metrics = resources.displayMetrics
        val maxWidthPx = (DRAWER_MAX_WIDTH_DP * metrics.density).roundToInt()
        val targetWidthPx = min((metrics.widthPixels * DRAWER_WIDTH_FRACTION).roundToInt(), maxWidthPx)
        val layoutParams = container.layoutParams ?: return
        if (layoutParams.width != targetWidthPx) {
            layoutParams.width = targetWidthPx
            container.layoutParams = layoutParams
        }
    }

    private fun handlePickedDocument(uri: Uri) {
        lifecycleScope.launch {
            val selection = withContext(Dispatchers.IO) { readSelectedDocument(uri) }
            when (selection) {
                is SelectedDocument.Image -> {
                    viewModel.addLocalImageAttachment(
                        label = selection.label,
                        dataUrl = selection.dataUrl,
                        mimeType = selection.mimeType,
                        sizeBytes = selection.sizeBytes
                    )
                }
                is SelectedDocument.FileReference -> {
                    viewModel.selectFileMention(
                        FileMention(
                            label = selection.label,
                            path = selection.uri
                        )
                    )
                }
                null -> {
                    viewModel.setError("Failed to load selected file.")
                }
            }
        }
    }

    private sealed interface SelectedDocument {
        data class Image(
            val label: String,
            val dataUrl: String,
            val mimeType: String?,
            val sizeBytes: Long
        ) : SelectedDocument

        data class FileReference(
            val label: String,
            val uri: String
        ) : SelectedDocument
    }

    private data class AttentionNotificationSpec(
        val notificationId: Int,
        val dedupeKey: String,
        val title: String,
        val contentText: String
    )

    private fun readSelectedDocument(uri: Uri): SelectedDocument? {
        val resolver = applicationContext.contentResolver
        val label = queryDisplayName(uri) ?: uri.lastPathSegment?.substringAfterLast('/') ?: "Image"
        val mimeType = resolver.getType(uri)?.trim()?.takeIf { it.isNotBlank() }
        if (mimeType != null && mimeType.startsWith("image/", ignoreCase = true)) {
            val bytes = resolver.openInputStream(uri)?.use { input -> input.readBytes() } ?: return null
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            return SelectedDocument.Image(
                label = label,
                dataUrl = "data:$mimeType;base64,$base64",
                mimeType = mimeType,
                sizeBytes = bytes.size.toLong()
            )
        }
        return SelectedDocument.FileReference(
            label = label,
            uri = uri.toString()
        )
    }

    private fun queryDisplayName(uri: Uri): String? {
        applicationContext.contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    return cursor.getString(index)?.trim()?.takeIf { it.isNotBlank() }
                }
            }
        }
        return null
    }

    /**
     * Resolve launch params and connect. If no sessionId is available,
     * auto-create a codex session via the HTTP API.
     */
    private fun resolveAndConnect() {
        PersistentDiagnosticLog.event("codex_activity", "android.codex.resolve_connect.started")
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
                    PersistentDiagnosticLog.event("codex_activity", "android.codex.resolve_connect.auto_created", mapOf("sessionIdPresent" to ref.id.isNotBlank()))
                    val newParams = CodexLaunchParams(
                        profileId = profile.id,
                        sessionId = ref.id,
                        sessionMode = ref.sessionMode.wireValue,
                        cwd = ref.cwd ?: initialCwd,
                        threadId = null,
                        launchSource = "auto_create"
                    )
                    startConnection(newParams)
                }
                is ApiResult.Failure -> {
                    PersistentDiagnosticLog.error("codex_activity", "android.codex.resolve_connect.failed", result.error.cause ?: IllegalStateException(result.error.message), mapOf("source" to "auto_create", "errorCode" to result.error.code))
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
            PersistentDiagnosticLog.event("codex_activity", "android.codex.resolve_connect.profile_missing", mapOf("launchSource" to params.launchSource), level = "error", critical = true)
            Log.w(TAG, "Launch profile missing: ${params.profileId}; launchSource=${params.launchSource}")
            if (params.launchSource == "restore") {
                clearPersistedLaunchSelection()
                activeLaunchParams = null
                resolveAndConnect()
            } else {
                viewModel.setError("Profile not found: ${params.profileId}")
            }
            return
        }
        activeLaunchParams = params
        drawerSelection = SessionSelection(
            profileId = params.profileId,
            sessionId = params.sessionId,
            sessionMode = SessionMode.CODEX,
            cwd = params.cwd,
            lastCodexThreadId = params.threadId
        )
        syncActivityIntent(params)
        persistActiveLaunchSelection(params)
        viewModel.connect(profile, params)
        PersistentDiagnosticLog.event("codex_activity", "android.codex.resolve_connect.connected", mapOf("launchSource" to params.launchSource, "sessionIdPresent" to params.sessionId.isNotBlank()), critical = true)
    }

    private fun observeUiState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                syncForegroundService(state)
                syncQuotaNotification(state)
                syncAttentionNotifications(previousUiState, state)
                previousUiState = state
                if (state.sessionExpired) {
                    Log.w(TAG, "Session expired; clearing stale launch state and auto-creating a new one")
                    viewModel.disconnect()
                    clearPersistedLaunchSelection()
                    clearLaunchIntentSelection()
                    activeLaunchParams = null
                    drawerSelection = null
                    viewModel.acknowledgeSessionExpired()
                    resolveAndConnect()
                    return@collect
                }
                val params = activeLaunchParams ?: return@collect
                val updatedParams = params.copy(
                    sessionId = state.sessionId.ifBlank { params.sessionId },
                    cwd = state.cwd ?: params.cwd,
                    // activeConversationId is the canonical user selection.
                    // Prefer it when persisting launch state so a stale
                    // session event cannot make the next cold start reopen the
                    // conversation that was bound before an A→B switch.
                    threadId = resolveCodexTargetThreadId(
                        explicitThreadId = state.activeConversationId,
                        fallbackThreadId = state.threadId
                    )
                )
                activeLaunchParams = updatedParams
                syncActivityIntent(updatedParams)
                persistActiveLaunchSelection(updatedParams)
            }
        }
    }

    private fun syncForegroundService(state: CodexUiState) {
        val normalized = resolveForegroundServiceStatus(state)
        if (CodexTaskForegroundService.isActiveStatus(normalized)) {
            maybeRequestBatteryOptimizationExemption(state, normalized)
            if (isActivityVisible && !hasNotificationPermission()) {
                requestNotificationPermissionIfNeeded()
            }
            val signature = buildCodexForegroundServiceSignature(
                status = normalized,
                sessionId = state.sessionId,
                threadId = resolveCodexTargetThreadId(state.threadId, state.activeConversationId)
            )
            if (codexForegroundServiceActive && codexForegroundServiceSignature == signature) {
                return
            }
            val started = runCatching {
                CodexTaskForegroundService.start(
                    this,
                    normalized,
                    buildCodexTaskNotificationIntent(state)
                )
            }.onFailure { error ->
                Log.e(
                    TAG,
                    "[keepalive] failed to start foreground service; status=$normalized",
                    error
                )
            }.isSuccess
            if (started) {
                codexForegroundServiceActive = true
                codexForegroundServiceSignature = signature
            }
            return
        }
        if (codexForegroundServiceActive) {
            runCatching {
                CodexTaskForegroundService.stop(this)
            }.onFailure { error ->
                Log.e(TAG, "[keepalive] failed to stop foreground service", error)
            }
            codexForegroundServiceActive = false
            codexForegroundServiceSignature = null
        }
    }

    private fun maybeRequestBatteryOptimizationExemption(
        state: CodexUiState,
        normalizedStatus: String
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return
        }
        val powerManager = getSystemService(PowerManager::class.java) ?: return
        val alreadyExempt = powerManager.isIgnoringBatteryOptimizations(packageName)
        if (!shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = Build.VERSION.SDK_INT,
                activityVisible = isActivityVisible,
                taskActive = CodexTaskForegroundService.isActiveStatus(normalizedStatus),
                alreadyExempt = alreadyExempt,
                requestAttempted = batteryOptimizationRequestAttempted
            )
        ) {
            return
        }

        batteryOptimizationRequestAttempted = true
        val packageUri = Uri.parse("package:$packageName")
        val requestIntent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, packageUri)
        runCatching {
            startActivity(requestIntent)
        }.onSuccess {
            Log.i(
                TAG,
                "[keepalive] requested battery optimization exemption; " +
                    "threadId=${state.threadId.orEmpty()}"
            )
        }.onFailure { requestError ->
            Log.w(
                TAG,
                "[keepalive] direct battery optimization request unavailable; opening settings",
                requestError
            )
            runCatching {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }.onFailure { settingsError ->
                Log.e(TAG, "[keepalive] battery optimization settings unavailable", settingsError)
            }
        }
    }

    private fun syncQuotaNotification(state: CodexUiState) {
        val summary = state.usagePanel.rateLimitSummary.trim()
        if (summary.isBlank()) {
            getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID_QUOTA)
            quotaNotificationSignature = null
            return
        }
        if (!hasNotificationPermission()) {
            quotaNotificationSignature = null
            return
        }

        val contentText = formatCodexQuotaNotificationText(
            summary = summary,
            remainingLabel = getString(R.string.codex_native_status_quota_remaining),
            resetsPrefix = getString(R.string.codex_native_status_quota_resets_prefix),
            retryPrefix = getString(R.string.codex_native_status_quota_retry_prefix),
            localizeWindow = ::localizeQuotaNotificationWindow,
            formatExtraScopes = {
                getString(R.string.codex_native_status_quota_extra_scopes, it)
            }
        )
        if (contentText.isBlank()) {
            getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID_QUOTA)
            quotaNotificationSignature = null
            return
        }

        val signature = listOf(
            contentText,
            state.sessionId,
            resolveCodexTargetThreadId(state.threadId, state.activeConversationId).orEmpty()
        ).joinToString("|")
        if (quotaNotificationSignature == signature) {
            return
        }

        ensureQuotaNotificationChannel()
        val builder = NotificationCompat.Builder(this, QUOTA_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.codex_quota_notification_title))
            .setContentText(contentText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(contentText))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
        buildCodexTaskNotificationIntent(state)?.let { tapIntent ->
            builder.setContentIntent(
                PendingIntent.getActivity(
                    this,
                    NOTIF_ID_QUOTA,
                    tapIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            )
        }
        val posted = runCatching {
            getSystemService(NotificationManager::class.java)
                ?.notify(NOTIF_ID_QUOTA, builder.build())
        }.onFailure { error ->
            Log.w(TAG, "[quota-notification] failed to post current quota", error)
        }.isSuccess
        if (posted) {
            quotaNotificationSignature = signature
        }
    }

    private fun localizeQuotaNotificationWindow(raw: String): String {
        val normalized = raw.trim().lowercase()
        return when {
            normalized in setOf("5h", "300m", "300min", "300mins", "300minutes") ->
                getString(R.string.codex_native_status_quota_window_five_hours)
            normalized in setOf("168h", "7d", "1w", "one-week", "one_week", "oneweek") ->
                getString(R.string.codex_native_status_quota_window_one_week)
            normalized in setOf("p", "primary") ->
                getString(R.string.codex_native_status_quota_window_primary)
            normalized in setOf("s", "secondary") ->
                getString(R.string.codex_native_status_quota_window_secondary)
            Regex("""^\d+m$""").matches(normalized) ->
                getString(
                    R.string.codex_native_status_quota_window_minutes,
                    normalized.removeSuffix("m").toIntOrNull() ?: return raw.trim()
                )
            Regex("""^\d+h$""").matches(normalized) ->
                getString(
                    R.string.codex_native_status_quota_window_hours,
                    normalized.removeSuffix("h").toIntOrNull() ?: return raw.trim()
                )
            else -> raw.trim()
        }
    }

    private fun ensureQuotaNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val channel = NotificationChannel(
            QUOTA_CHANNEL_ID,
            getString(R.string.codex_quota_notification_channel),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.codex_quota_notification_channel_desc)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    private fun syncAttentionNotifications(previousState: CodexUiState?, state: CodexUiState) {
        clearResolvedAttentionNotifications(state)
        if (isActivityVisible) {
            return
        }
        if (!hasNotificationPermission()) {
            return
        }
        detectApprovalNotification(previousState, state)?.let(::postAttentionNotification)
        detectPlanInputNotification(previousState, state)?.let(::postAttentionNotification)
        detectPlanReadyNotification(previousState, state)?.let(::postAttentionNotification)
        detectTaskCompleteNotification(previousState, state)?.let(::postAttentionNotification)
        detectErrorNotification(previousState, state)?.let(::postAttentionNotification)
    }

    private fun resolveForegroundServiceStatus(state: CodexUiState): String {
        return when (state.planWorkflow.phase) {
            "awaiting_user_input" -> "awaiting_user_input"
            "plan_ready_for_confirmation" -> "plan_ready_for_confirmation"
            else -> {
                if (state.pendingServerRequests.any { it.responseMode == "decision" }) {
                    "waiting_approval"
                } else if (!state.currentTurnId.isNullOrBlank()) {
                    if (
                        state.connectionState == com.termlink.app.codex.domain.ConnectionState.RECONNECTING ||
                        state.status.equals("reconnecting", ignoreCase = true)
                    ) {
                        "reconnecting"
                    } else {
                        "running"
                    }
                } else {
                    "idle"
                }
            }
        }
    }

    private fun buildCodexTaskNotificationIntent(
        state: CodexUiState = viewModel.uiState.value
    ): Intent? {
        val params = activeLaunchParams ?: return null
        return newIntent(
            context = this,
            profileId = params.profileId,
            sessionId = state.sessionId.ifBlank { params.sessionId },
            sessionMode = SessionMode.CODEX.wireValue,
            cwd = state.cwd ?: params.cwd,
            threadId = resolveCodexTargetThreadId(state.threadId, params.threadId),
            launchSource = "notification"
        ).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
    }

    private fun buildAttentionContentIntent(): PendingIntent? {
        val tapIntent = buildCodexTaskNotificationIntent() ?: return null
        return PendingIntent.getActivity(
            this,
            0,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun detectApprovalNotification(
        previousState: CodexUiState?,
        state: CodexUiState
    ): AttentionNotificationSpec? {
        val request = state.pendingServerRequests.firstOrNull { it.responseMode == "decision" } ?: return null
        val previousRequestId = previousState?.pendingServerRequests
            ?.firstOrNull { it.responseMode == "decision" }
            ?.requestId
        if (request.requestId == previousRequestId) {
            return null
        }
        val title = when (request.method) {
            "item/commandExecution/requestApproval" ->
                getString(com.termlink.app.R.string.codex_native_attention_title_command_approval)
            else -> getString(com.termlink.app.R.string.codex_native_attention_title_approval)
        }
        return AttentionNotificationSpec(
            notificationId = NOTIF_ID_APPROVAL,
            dedupeKey = request.requestId,
            title = title,
            contentText = summarizeNotificationText(
                request.command ?: request.summary,
                getString(com.termlink.app.R.string.codex_native_attention_body_command_approval)
            )
        )
    }

    private fun detectPlanInputNotification(
        previousState: CodexUiState?,
        state: CodexUiState
    ): AttentionNotificationSpec? {
        if (state.planWorkflow.phase != "awaiting_user_input") {
            return null
        }
        if (previousState?.planWorkflow?.phase == "awaiting_user_input") {
            return null
        }
        val request = state.pendingServerRequests.firstOrNull { it.responseMode == "answers" }
        return AttentionNotificationSpec(
            notificationId = NOTIF_ID_PLAN_INPUT,
            dedupeKey = request?.requestId ?: "awaiting_user_input",
            title = getString(com.termlink.app.R.string.codex_native_attention_title_plan_input),
            contentText = summarizeNotificationText(
                request?.summary ?: request?.questions?.firstOrNull()?.question,
                getString(com.termlink.app.R.string.codex_native_attention_body_plan_input)
            )
        )
    }

    private fun detectPlanReadyNotification(
        previousState: CodexUiState?,
        state: CodexUiState
    ): AttentionNotificationSpec? {
        if (state.planWorkflow.phase != "plan_ready_for_confirmation") {
            return null
        }
        if (previousState?.planWorkflow?.phase == "plan_ready_for_confirmation") {
            return null
        }
        val planText = state.planWorkflow.confirmedPlanText.ifBlank { state.planWorkflow.latestPlanText }
        return AttentionNotificationSpec(
            notificationId = NOTIF_ID_PLAN_READY,
            dedupeKey = buildString {
                append(state.threadId.orEmpty())
                append('|')
                append(planText.hashCode())
            },
            title = getString(com.termlink.app.R.string.codex_native_attention_title_plan_ready),
            contentText = summarizeNotificationText(
                planText,
                getString(com.termlink.app.R.string.codex_native_attention_body_plan_ready)
            )
        )
    }

    private fun detectErrorNotification(
        previousState: CodexUiState?,
        state: CodexUiState
    ): AttentionNotificationSpec? {
        val message = state.errorMessage?.trim().orEmpty()
        if (message.isBlank()) {
            return null
        }
        if (message == previousState?.errorMessage?.trim().orEmpty()) {
            return null
        }
        return AttentionNotificationSpec(
            notificationId = NOTIF_ID_TASK_ERROR,
            dedupeKey = message,
            title = getString(com.termlink.app.R.string.codex_native_attention_title_error),
            contentText = summarizeNotificationText(
                message,
                getString(com.termlink.app.R.string.codex_native_attention_body_error)
            )
        )
    }

    private fun detectTaskCompleteNotification(
        previousState: CodexUiState?,
        state: CodexUiState
    ): AttentionNotificationSpec? {
        if (previousState == null) {
            return null
        }
        val sameThreadContext =
            previousState.threadId.isNullOrBlank() ||
                state.threadId.isNullOrBlank() ||
                previousState.threadId == state.threadId
        if (!sameThreadContext) {
            return null
        }
        val previousStatus = resolveForegroundServiceStatus(previousState)
        val currentStatus = resolveForegroundServiceStatus(state)
        val completedTrackedTurn =
            !previousState.currentTurnId.isNullOrBlank() && state.currentTurnId.isNullOrBlank()
        val completedFromRunningTransition =
            previousStatus in setOf("running", "reconnecting") &&
                !CodexTaskForegroundService.isActiveStatus(currentStatus)
        if (!completedTrackedTurn && !completedFromRunningTransition) {
            return null
        }
        if (CodexTaskForegroundService.isActiveStatus(currentStatus)) {
            return null
        }
        if (!state.errorMessage.isNullOrBlank()) {
            return null
        }
        val latestResult = state.messages
            .asReversed()
            .firstOrNull { it.role == ChatMessage.Role.ASSISTANT || it.role == ChatMessage.Role.TOOL }
        val dedupeKey = buildString {
            append(state.threadId.orEmpty())
            append('|')
            append(latestResult?.id.orEmpty())
            append('|')
            append(latestResult?.timestamp ?: 0L)
        }
        return AttentionNotificationSpec(
            notificationId = NOTIF_ID_TASK_COMPLETE,
            dedupeKey = dedupeKey,
            title = getString(com.termlink.app.R.string.codex_native_attention_title_task_complete),
            contentText = summarizeNotificationText(
                latestResult?.content ?: state.currentThreadTitle,
                getString(com.termlink.app.R.string.codex_native_attention_body_task_complete)
            )
        )
    }

    private fun summarizeNotificationText(value: String?, fallback: String): String {
        val normalized = value
            ?.lineSequence()
            ?.map { it.trim() }
            ?.firstOrNull { it.isNotBlank() }
            ?.take(120)
            .orEmpty()
        return normalized.ifBlank { fallback }
    }

    private fun clearResolvedAttentionNotifications(state: CodexUiState) {
        if (state.pendingServerRequests.none { it.responseMode == "decision" }) {
            cancelAttentionNotification(NOTIF_ID_APPROVAL)
        }
        if (state.planWorkflow.phase != "awaiting_user_input") {
            cancelAttentionNotification(NOTIF_ID_PLAN_INPUT)
        }
        if (state.planWorkflow.phase != "plan_ready_for_confirmation") {
            cancelAttentionNotification(NOTIF_ID_PLAN_READY)
        }
        if (state.errorMessage.isNullOrBlank()) {
            cancelAttentionNotification(NOTIF_ID_TASK_ERROR)
        }
        if (!state.currentTurnId.isNullOrBlank() || CodexTaskForegroundService.isActiveStatus(resolveForegroundServiceStatus(state))) {
            cancelAttentionNotification(NOTIF_ID_TASK_COMPLETE)
        }
    }

    private fun postAttentionNotification(spec: AttentionNotificationSpec) {
        if (activeAttentionKeys[spec.notificationId] == spec.dedupeKey) {
            return
        }
        ensureAttentionNotificationChannel()
        val builder = NotificationCompat.Builder(this, ATTENTION_CHANNEL_ID)
            .setSmallIcon(com.termlink.app.R.drawable.ic_notification)
            .setContentTitle(spec.title)
            .setContentText(spec.contentText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(spec.contentText))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setGroup(ATTENTION_NOTIFICATION_GROUP)
        buildAttentionContentIntent()?.let(builder::setContentIntent)
        getSystemService(NotificationManager::class.java)?.notify(spec.notificationId, builder.build())
        activeAttentionKeys[spec.notificationId] = spec.dedupeKey
    }

    private fun cancelAttentionNotification(notificationId: Int) {
        getSystemService(NotificationManager::class.java)?.cancel(notificationId)
        activeAttentionKeys.remove(notificationId)
    }

    private fun cancelAttentionNotifications() {
        cancelAttentionNotification(NOTIF_ID_APPROVAL)
        cancelAttentionNotification(NOTIF_ID_PLAN_INPUT)
        cancelAttentionNotification(NOTIF_ID_PLAN_READY)
        cancelAttentionNotification(NOTIF_ID_TASK_ERROR)
        cancelAttentionNotification(NOTIF_ID_TASK_COMPLETE)
    }

    private fun ensureAttentionNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val channel = NotificationChannel(
            ATTENTION_CHANNEL_ID,
            getString(com.termlink.app.R.string.codex_native_attention_channel),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = getString(com.termlink.app.R.string.codex_native_attention_channel_desc)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    private fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATION_PERMISSION
            )
        }
    }

    private fun targetsSameSession(
        next: CodexLaunchParams,
        current: CodexLaunchParams?
    ): Boolean {
        if (current == null) {
            return false
        }
        return next.profileId == current.profileId &&
            next.sessionId == current.sessionId &&
            next.sessionMode == current.sessionMode
    }

    // ── Param resolution (Intent > restore) ──────────────────────────

    private fun resolveParams(): CodexLaunchParams? {
        val state = serverConfigStore.loadState()
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        // Priority 1: explicit Intent extras
        val intentProfileId = intent.getStringExtra(CodexLaunchParams.EXTRA_PROFILE_ID)
        val intentSessionId = intent.getStringExtra(CodexLaunchParams.EXTRA_SESSION_ID)
        if (!intentProfileId.isNullOrBlank() && !intentSessionId.isNullOrBlank()) {
            if (state.profiles.none { it.id == intentProfileId }) {
                Log.w(TAG, "Ignoring explicit launch for missing profile: $intentProfileId")
                return null
            }
            return CodexLaunchParams(
                profileId = intentProfileId,
                sessionId = intentSessionId,
                sessionMode = intent.getStringExtra(CodexLaunchParams.EXTRA_SESSION_MODE) ?: "codex",
                cwd = intent.getStringExtra(CodexLaunchParams.EXTRA_CWD),
                threadId = resolveIntentLaunchThreadId(
                    intentProfileId = intentProfileId,
                    intentSessionId = intentSessionId,
                    explicitThreadId = intent.getStringExtra(CodexLaunchParams.EXTRA_THREAD_ID),
                    storedProfileId = prefs.getString(PREF_PROFILE_ID, null),
                    storedSessionId = prefs.getString(PREF_SESSION_ID, null),
                    storedThreadId = prefs.getString(PREF_THREAD_ID, null)
                ),
                launchSource = intent.getStringExtra(CodexLaunchParams.EXTRA_LAUNCH_SOURCE) ?: "intent"
            )
        }

        // Priority 2: persisted restore state
        val restoredProfileId = prefs.getString(PREF_PROFILE_ID, null)
        val restoredSessionId = prefs.getString(PREF_SESSION_ID, null)
        if (!restoredProfileId.isNullOrBlank() && !restoredSessionId.isNullOrBlank()) {
            if (state.profiles.none { it.id == restoredProfileId }) {
                Log.w(TAG, "Discarding restore state for deleted profile: $restoredProfileId")
                clearPersistedLaunchSelection()
                return null
            }
            return CodexLaunchParams(
                profileId = restoredProfileId,
                sessionId = restoredSessionId,
                sessionMode = prefs.getString(PREF_SESSION_MODE, "codex") ?: "codex",
                cwd = prefs.getString(PREF_CWD, null),
                threadId = normalizeCodexLaunchThreadId(prefs.getString(PREF_THREAD_ID, null)),
                launchSource = "restore"
            )
        }

        return null
    }

    private fun resolveProfile(profileId: String): ServerProfile? {
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == profileId }
    }

    private fun resolveActiveProfile(): ServerProfile? {
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == state.activeProfileId }
            ?: state.profiles.firstOrNull()
    }

    private fun persistRestoreState(params: CodexLaunchParams) {
        val normalizedThreadId = normalizeCodexLaunchThreadId(params.threadId)
        val editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .putString(PREF_PROFILE_ID, params.profileId)
            .putString(PREF_SESSION_ID, params.sessionId)
            .putString(PREF_SESSION_MODE, params.sessionMode)
            .putString(PREF_CWD, params.cwd)
        if (normalizedThreadId == null) {
            editor.remove(PREF_THREAD_ID)
        } else {
            editor.putString(PREF_THREAD_ID, normalizedThreadId)
        }
        editor.apply()
    }

    private fun persistShellSelection(params: CodexLaunchParams) {
        getSharedPreferences(SHELL_PREFS_NAME, MODE_PRIVATE).edit()
            .putString(SHELL_PREF_LAST_PROFILE_ID, params.profileId)
            .putString(SHELL_PREF_LAST_SESSION_ID, params.sessionId)
            .putString(SHELL_PREF_LAST_SESSION_MODE, params.sessionMode)
            .putString(SHELL_PREF_LAST_SESSION_CWD, params.cwd)
            .apply()
    }

    private fun persistActiveLaunchSelection(params: CodexLaunchParams) {
        persistRestoreState(params)
        persistShellSelection(params)
    }

    private fun clearRestoreState() {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .remove(PREF_PROFILE_ID)
            .remove(PREF_SESSION_ID)
            .remove(PREF_SESSION_MODE)
            .remove(PREF_CWD)
            .remove(PREF_THREAD_ID)
            .apply()
    }

    private fun clearShellSelection() {
        getSharedPreferences(SHELL_PREFS_NAME, MODE_PRIVATE).edit()
            .remove(SHELL_PREF_LAST_PROFILE_ID)
            .remove(SHELL_PREF_LAST_SESSION_ID)
            .remove(SHELL_PREF_LAST_SESSION_MODE)
            .remove(SHELL_PREF_LAST_SESSION_CWD)
            .apply()
    }

    private fun clearPersistedLaunchSelection() {
        clearRestoreState()
        clearShellSelection()
    }

    private fun clearLaunchIntentSelection() {
        setIntent(Intent(this, CodexActivity::class.java))
    }

    private fun syncActivityIntent(params: CodexLaunchParams) {
        setIntent(
            newIntent(
                context = this,
                profileId = params.profileId,
                sessionId = params.sessionId,
                sessionMode = params.sessionMode,
                cwd = params.cwd,
                threadId = params.threadId,
                launchSource = params.launchSource
            )
        )
    }

    private fun recoverIfLaunchProfileWasDeleted(): Boolean {
        val params = activeLaunchParams ?: return false
        if (resolveProfile(params.profileId) != null) {
            return false
        }
        Log.w(TAG, "Active launch profile was deleted: ${params.profileId}; recovering")
        clearPersistedLaunchSelection()
        activeLaunchParams = null
        drawerSelection = null
        viewModel.disconnect()
        viewModel.clearError()
        resolveAndConnect()
        return true
    }
}
