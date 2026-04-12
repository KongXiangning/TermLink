package com.termlink.app.codex

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.core.app.NotificationCompat
import androidx.core.view.GravityCompat
import androidx.core.view.ViewCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import com.termlink.app.R
import com.termlink.app.CodexTaskForegroundService
import com.termlink.app.MainShellActivity
import com.termlink.app.SettingsActivity
import com.termlink.app.WorkspaceActivity
import com.termlink.app.codex.domain.CodexLaunchParams
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.min
import kotlin.math.roundToInt

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
        private const val SHELL_PREF_LAST_SESSION_CWD = "last_session_cwd"
        private const val DEFAULT_CODEX_CWD = "E:\\coding\\TermLink"
        private const val DOCS_DEFAULT_ENTRY_PATH = "docs"
        private const val REQUEST_CODE_NOTIFICATION_PERMISSION = 10003
        private const val ATTENTION_CHANNEL_ID = "codex_task_attention"
        private const val ATTENTION_NOTIFICATION_GROUP = "codex_attention"
        private const val NOTIF_ID_APPROVAL = 9301
        private const val NOTIF_ID_PLAN_INPUT = 9302
        private const val NOTIF_ID_PLAN_READY = 9303
        private const val NOTIF_ID_TASK_ERROR = 9304
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
    private var codexForegroundServiceActive: Boolean = false
    private var isActivityVisible: Boolean = false
    private var previousUiState: CodexUiState? = null
    private val activeAttentionKeys = mutableMapOf<Int, String>()
    private var drawerLayout: DrawerLayout? = null
    private var sessionsDrawerContainer: android.view.View? = null
    private var drawerSelection: SessionSelection? = null
    private val drawerListener = object : DrawerLayout.SimpleDrawerListener() {
        override fun onDrawerSlide(drawerView: android.view.View, slideOffset: Float) {
            if (drawerView.id == R.id.codex_sessions_drawer_container && slideOffset > 0f) {
                setDrawerSessionsContentVisible(true)
            }
        }

        override fun onDrawerOpened(drawerView: android.view.View) {
            if (drawerView.id == R.id.codex_sessions_drawer_container) {
                setDrawerSessionsContentVisible(true)
            }
        }

        override fun onDrawerClosed(drawerView: android.view.View) {
            if (drawerView.id == R.id.codex_sessions_drawer_container) {
                setDrawerSessionsContentVisible(false)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_codex)
        drawerLayout = findViewById(R.id.codex_root_drawer)
        sessionsDrawerContainer = findViewById(R.id.codex_sessions_drawer_container)
        applyDrawerWidth()
        drawerLayout?.addDrawerListener(drawerListener)
        applyDrawerGestureExclusion()
        ensureDrawerSessionsFragment()
        setDrawerSessionsContentVisible(false)

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        sessionApiClient = SessionApiClient(applicationContext)
        viewModel = CodexViewModel(basicCredentialStore, sessionApiClient)

        findViewById<ComposeView>(R.id.codex_compose_container).setContent {
            CodexTheme {
                Scaffold { innerPadding ->
                    val uiState by viewModel.uiState.collectAsState()
                    val imagePickerLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.PickVisualMedia()
                    ) { uri ->
                        uri?.let(::handlePickedImage)
                    }
                    CodexScreen(
                        state = uiState,
                        onSendMessage = viewModel::handleComposerSubmit,
                        onInterrupt = viewModel::interrupt,
                        onOpenSessions = ::openSessions,
                        onOpenDocs = ::openDocsWorkspace,
                        onNewThread = viewModel::newThread,
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
                        onPickLocalImage = {
                            imagePickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        onAddImageUrl = viewModel::addImageUrlAttachment,
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
        isActivityVisible = true
        cancelAttentionNotifications()
    }

    override fun onStop() {
        isActivityVisible = false
        if (!isChangingConfigurations) {
            syncAttentionNotifications(null, viewModel.uiState.value)
        }
        super.onStop()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val params = resolveParams() ?: return
        if (targetsSameSession(params, activeLaunchParams)) {
            activeLaunchParams = activeLaunchParams?.copy(
                cwd = params.cwd ?: activeLaunchParams?.cwd,
                launchSource = params.launchSource
            ) ?: params
            persistRestoreState(activeLaunchParams!!)
            cancelAttentionNotifications()
            return
        }
        viewModel.clearError()
        startConnection(params)
        cancelAttentionNotifications()
    }

    override fun onDestroy() {
        drawerLayout?.removeDrawerListener(drawerListener)
        super.onDestroy()
        if (::viewModel.isInitialized) {
            viewModel.disconnect()
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
            cwd = uiState.cwd ?: params?.cwd
        )
    }

    override fun onOpenSession(selection: SessionSelection) {
        drawerSelection = selection
        closeSessionsDrawerIfOpen()
        if (selection.sessionMode == SessionMode.CODEX) {
            startActivity(
                newIntent(
                    context = this,
                    profileId = selection.profileId,
                    sessionId = selection.sessionId,
                    sessionMode = selection.sessionMode.wireValue,
                    cwd = selection.cwd,
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

    private fun handlePickedImage(uri: Uri) {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { readImageAttachment(uri) }
            if (result == null) {
                viewModel.setError("Failed to load selected image.")
                return@launch
            }
            viewModel.addLocalImageAttachment(
                label = result.label,
                dataUrl = result.dataUrl,
                mimeType = result.mimeType,
                sizeBytes = result.sizeBytes
            )
        }
    }

    private data class SelectedImageAttachment(
        val label: String,
        val dataUrl: String,
        val mimeType: String?,
        val sizeBytes: Long
    )

    private data class AttentionNotificationSpec(
        val notificationId: Int,
        val dedupeKey: String,
        val title: String,
        val contentText: String
    )

    private fun readImageAttachment(uri: Uri): SelectedImageAttachment? {
        val resolver = applicationContext.contentResolver
        val mimeType = resolver.getType(uri)?.trim()?.takeIf { it.isNotBlank() } ?: "image/*"
        val bytes = resolver.openInputStream(uri)?.use { input -> input.readBytes() } ?: return null
        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        val label = queryDisplayName(uri) ?: uri.lastPathSegment?.substringAfterLast('/') ?: "Image"
        return SelectedImageAttachment(
            label = label,
            dataUrl = "data:$mimeType;base64,$base64",
            mimeType = mimeType,
            sizeBytes = bytes.size.toLong()
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
        drawerSelection = SessionSelection(
            profileId = params.profileId,
            sessionId = params.sessionId,
            sessionMode = SessionMode.CODEX,
            cwd = params.cwd
        )
        persistRestoreState(params)
        viewModel.connect(profile, params)
    }

    private fun observeUiState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                syncForegroundService(state)
                syncAttentionNotifications(previousUiState, state)
                previousUiState = state
                if (state.sessionExpired && activeLaunchParams?.launchSource == "restore") {
                    Log.w(TAG, "Restored session expired; clearing restore session and auto-creating a new one")
                    clearRestoreSession()
                    activeLaunchParams = null
                    viewModel.acknowledgeSessionExpired()
                    resolveAndConnect()
                    return@collect
                }
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

    private fun syncForegroundService(state: CodexUiState) {
        val normalized = resolveForegroundServiceStatus(state)
        if (CodexTaskForegroundService.isActiveStatus(normalized)) {
            if (isActivityVisible && !hasNotificationPermission()) {
                requestNotificationPermissionIfNeeded()
            }
            runCatching {
                CodexTaskForegroundService.start(
                    this,
                    normalized,
                    buildCodexTaskNotificationIntent()
                )
            }
            codexForegroundServiceActive = true
            return
        }
        if (codexForegroundServiceActive) {
            runCatching { CodexTaskForegroundService.stop(this) }
            codexForegroundServiceActive = false
        }
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
        detectErrorNotification(previousState, state)?.let(::postAttentionNotification)
    }

    private fun resolveForegroundServiceStatus(state: CodexUiState): String {
        return when (state.planWorkflow.phase) {
            "awaiting_user_input" -> "awaiting_user_input"
            "plan_ready_for_confirmation" -> "plan_ready_for_confirmation"
            else -> {
                if (state.pendingServerRequests.any { it.responseMode == "decision" }) {
                    "waiting_approval"
                } else {
                    state.status.lowercase().trim()
                }
            }
        }
    }

    private fun buildCodexTaskNotificationIntent(): Intent? {
        val params = activeLaunchParams ?: return null
        return newIntent(
            context = this,
            profileId = params.profileId,
            sessionId = params.sessionId,
            sessionMode = SessionMode.CODEX.wireValue,
            cwd = viewModel.uiState.value.cwd ?: params.cwd,
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

    private fun clearRestoreSession() {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
            .remove(PREF_SESSION_ID)
            .remove(PREF_THREAD_ID)
            .apply()
    }
}
