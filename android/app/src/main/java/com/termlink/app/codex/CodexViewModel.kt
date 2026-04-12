package com.termlink.app.codex

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.termlink.app.codex.data.*
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexContextUsageState
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.domain.CodexNoticesPanelState
import com.termlink.app.codex.domain.CodexPendingImageAttachment
import com.termlink.app.codex.domain.CodexPlanWorkflowState
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexSkillEntry
import com.termlink.app.codex.domain.CodexThreadHistoryEntry
import com.termlink.app.codex.domain.CodexToolsPanelState
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.CodexUsagePanelState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.DebugServerRequestPreset
import com.termlink.app.codex.domain.FileMention
import com.termlink.app.codex.domain.NextTurnOverrides
import com.termlink.app.codex.network.CodexConnectionManager
import com.termlink.app.codex.network.WsEvent
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class CodexViewModel(
    appContext: Context,
    credentialStore: BasicCredentialStore,
    private val sessionApiClient: SessionApiClient
) : ViewModel() {

    companion object {
        private const val TAG = "CodexViewModel"
        private const val FAST_MODE_EFFORT = "low"
        private const val DEBUG_REQUEST_PREFIX = "debug-request-"
        private const val PLAN_PHASE_IDLE = "idle"
        private const val PLAN_PHASE_PLANNING = "planning"
        private const val PLAN_PHASE_AWAITING_USER_INPUT = "awaiting_user_input"
        private const val PLAN_PHASE_READY_FOR_CONFIRMATION = "plan_ready_for_confirmation"
        private const val PLAN_PHASE_EXECUTING_CONFIRMED_PLAN = "executing_confirmed_plan"
        private val ANSI_ESCAPE_REGEX = Regex("\\u001B\\[[;\\d?]*[ -/]*[@-~]")
    }

    private val connectionManager = CodexConnectionManager(viewModelScope, credentialStore, appContext)

    private val _uiState = MutableStateFlow(CodexUiState())
    val uiState: StateFlow<CodexUiState> = _uiState.asStateFlow()

    private var currentStreamingMessageId: String? = null
    private var currentProfile: ServerProfile? = null
    private var mentionSearchGeneration: Long = 0L

    init {
        observeConnectionState()
        observeWsEvents()
    }

    // ── Public actions ────────────────────────────────────────────────

    fun connect(profile: ServerProfile, params: CodexLaunchParams) {
        currentProfile = profile
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    sessionId = params.sessionId,
                    cwd = params.cwd,
                    threadId = params.threadId,
                    errorMessage = null,
                    connectionState = ConnectionState.CONNECTING,
                    serverNextTurnConfigBase = null,
                    nextTurnEffectiveCodexConfig = null,
                    planWorkflow = buildEmptyPlanWorkflowState(),
                    pendingServerRequests = emptyList(),
                    submittingServerRequestIds = emptySet(),
                    sessionExpired = false,
                    runtimePanel = buildEmptyRuntimePanelState(),
                    noticesPanel = CodexNoticesPanelState(),
                    toolsPanel = CodexToolsPanelState(),
                    usagePanel = CodexUsagePanelState(),
                    pendingImageAttachments = emptyList(),
                    currentThreadTitle = "",
                    threadHistoryEntries = emptyList(),
                    threadHistorySheetVisible = false,
                    threadHistoryLoading = false,
                    threadHistoryActionThreadId = "",
                    threadHistoryActionKind = "",
                    threadRenameTargetId = "",
                    threadRenameDraft = ""
                )
            )
        }
        connectionManager.connect(profile, params.sessionId)
    }

    fun disconnect() {
        connectionManager.disconnect()
    }

    fun setError(message: String) {
        _uiState.update { it.copy(errorMessage = message, connectionState = ConnectionState.ERROR) }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun setCreatingSession() {
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    sessionId = "",
                    threadId = null,
                    errorMessage = null,
                    connectionState = ConnectionState.CONNECTING,
                    serverNextTurnConfigBase = null,
                    nextTurnEffectiveCodexConfig = null,
                    planWorkflow = buildEmptyPlanWorkflowState(),
                    pendingServerRequests = emptyList(),
                    submittingServerRequestIds = emptySet(),
                    sessionExpired = false,
                    runtimePanel = buildEmptyRuntimePanelState(),
                    noticesPanel = CodexNoticesPanelState(),
                    toolsPanel = CodexToolsPanelState(),
                    usagePanel = CodexUsagePanelState(),
                    pendingImageAttachments = emptyList(),
                    currentThreadTitle = "",
                    threadHistoryEntries = emptyList(),
                    threadHistorySheetVisible = false,
                    threadHistoryLoading = false,
                    threadHistoryActionThreadId = "",
                    threadHistoryActionKind = "",
                    threadRenameTargetId = "",
                    threadRenameDraft = ""
                )
            )
        }
    }

    fun acknowledgeSessionExpired() {
        _uiState.update { it.copy(sessionExpired = false) }
    }

    /**
     * Main entry point for user submit. Parses input for slash commands,
     * dispatches accordingly, or sends as a plain text turn.
     */
    fun handleComposerSubmit(rawText: String) {
        hideFileMentionMenu()
        val parsed = CodexSlashRegistry.parseComposerInput(rawText)
        when (parsed) {
            is CodexSlashRegistry.ParsedInput.Empty -> sendTurnWithOverrides("")
            is CodexSlashRegistry.ParsedInput.Text -> sendTurnWithOverrides(parsed.text)
            is CodexSlashRegistry.ParsedInput.Slash -> dispatchSlashCommand(parsed)
        }
        hideSlashMenu()
    }

    fun sendMessage(prompt: String) {
        sendTurnWithOverrides(prompt)
    }

    fun interrupt() {
        connectionManager.send(CodexClientMessages.codexInterrupt(_uiState.value.threadId))
    }

    fun newThread() {
        currentStreamingMessageId = null
        _uiState.update {
            it.copy(
                threadId = null,
                messages = emptyList(),
                errorMessage = null,
                planMode = false,
                planWorkflow = buildEmptyPlanWorkflowState(),
                pendingFileMentions = emptyList(),
                fileMentionMenuVisible = false,
                fileMentionQuery = "",
                fileMentionResults = emptyList(),
                fileMentionLoading = false,
                pendingServerRequests = emptyList(),
                submittingServerRequestIds = emptySet(),
                runtimePanel = buildEmptyRuntimePanelState(),
                noticesPanel = CodexNoticesPanelState(),
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = false,
                    compactStatusText = "",
                    compactStatusTone = ""
                ),
                usagePanel = it.usagePanel.copy(visible = false),
                pendingImageAttachments = emptyList(),
                currentThreadTitle = "",
                threadHistorySheetVisible = false,
                threadHistoryActionThreadId = "",
                threadHistoryActionKind = "",
                threadRenameTargetId = "",
                threadRenameDraft = ""
            )
        }
        connectionManager.send(CodexClientMessages.codexNewThread())
    }

    fun setCwd(cwd: String) {
        connectionManager.send(CodexClientMessages.codexSetCwd(cwd))
        _uiState.update { it.copy(cwd = cwd) }
    }

    fun submitApprovalDecision(requestId: String, approved: Boolean) {
        val request = findPendingServerRequest(requestId) ?: return
        val result = buildApprovalDecisionResult(request, approved) ?: return
        markServerRequestSubmitting(requestId)
        if (isDebugServerRequest(requestId)) {
            completeDebugServerRequest(requestId, result = result)
            return
        }
        connectionManager.send(
            CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                result = result
            )
        )
    }

    fun submitUserInputAnswers(requestId: String, answersByQuestionId: Map<String, String>) {
        val request = findPendingServerRequest(requestId) ?: return
        val result = buildUserInputResult(request, answersByQuestionId) ?: return
        markServerRequestSubmitting(requestId)
        if (isDebugServerRequest(requestId)) {
            completeDebugServerRequest(requestId, result = result)
            return
        }
        connectionManager.send(
            CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                result = result
            )
        )
        _uiState.update { state ->
            if (state.planWorkflow.phase == PLAN_PHASE_AWAITING_USER_INPUT) {
                state.copy(
                    planWorkflow = state.planWorkflow.copy(
                        phase = PLAN_PHASE_PLANNING,
                        lastUserInputRequestId = requestId
                    )
                )
            } else {
                state
            }
        }
    }

    fun rejectUserInputRequest(requestId: String) {
        if (findPendingServerRequest(requestId) == null) return
        markServerRequestSubmitting(requestId)
        val error = JSONObject().put("message", "User input request cancelled by user.")
        if (isDebugServerRequest(requestId)) {
            completeDebugServerRequest(requestId, error = error)
            return
        }
        connectionManager.send(
            CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                error = error
            )
        )
    }

    fun injectDebugServerRequest(preset: DebugServerRequestPreset) {
        if (preset == DebugServerRequestPreset.RUNTIME_SAMPLE) {
            injectDebugRuntimePanelSample()
            return
        }
        handleCodexServerRequest(
            CodexServerRequestEnvelope(
                request = buildDebugServerRequest(preset),
                raw = JSONObject()
                    .put("type", "codex_server_request")
                    .put("requestId", UUID.randomUUID().toString())
            )
        )
    }

    private fun injectDebugRuntimePanelSample() {
        _uiState.update { state ->
            state.copy(
                runtimePanel = state.runtimePanel.copy(
                    diff = """
                        diff --git a/public/terminal_client.css b/public/terminal_client.css
                        @@ -889,6 +889,9 @@
                        -.codex-runtime-card { padding: 10px; }
                        +.codex-runtime-card { padding: 8px; }
                        +.codex-runtime-card.is-expanded { border-color: rgba(78, 222, 163, 0.15); }
                    """.trimIndent(),
                    plan = """
                        1. Mirror the Web runtime panel hierarchy.
                        2. Keep only Diff, Plan, and Reasoning cards.
                        3. Collapse empty state instead of showing a blank panel.
                    """.trimIndent(),
                    reasoning = """
                        Web compact/mobile layout stacks runtime cards in a single column.
                        Keeping the panel inline above the composer preserves scan speed without squeezing content.
                    """.trimIndent(),
                    warning = "Debug sample: runtime warning is rendered below the card grid.",
                    warningTone = "warn"
                ),
                usagePanel = state.usagePanel.copy(
                    visible = true,
                    rateLimitSummary = "5h 1% ⏱16:13 | 168h 15% ⏱04/17 02:11",
                    rateLimitTone = "",
                    contextUsage = CodexContextUsageState(
                        usedTokens = 18_400,
                        contextWindow = 128_000,
                        usedPercent = 14,
                        remainingPercent = 86,
                        inputTokens = 8_900,
                        outputTokens = 6_400,
                        cachedInputTokens = 2_700,
                        reasoningTokens = 400,
                        updatedAtMillis = System.currentTimeMillis()
                    )
                ),
                noticesPanel = state.noticesPanel.copy(
                    configWarningText = "Debug sample: configuration requires review before the next Codex turn.",
                    deprecationNoticeText = "Debug sample: this fallback path is deprecated and will be removed in a future update."
                )
            )
        }
        appendMessage(ChatMessage.Role.SYSTEM, "[debug] Injected runtime and usage panel sample.")
    }

    fun showThreadHistory() {
        _uiState.update {
            it.copy(
                threadHistorySheetVisible = true,
                runtimePanel = it.runtimePanel.copy(visible = false),
                noticesPanel = it.noticesPanel.copy(visible = false),
                toolsPanel = it.toolsPanel.copy(visible = false)
            )
        }
        if (_uiState.value.capabilities?.historyList == true) {
            refreshThreadHistory()
        }
    }

    fun showRuntimePanel() {
        _uiState.update {
            it.copy(
                threadHistorySheetVisible = false,
                runtimePanel = it.runtimePanel.copy(visible = true),
                noticesPanel = it.noticesPanel.copy(visible = false),
                toolsPanel = it.toolsPanel.copy(visible = false)
            )
        }
    }

    fun hideRuntimePanel() {
        _uiState.update { it.copy(runtimePanel = it.runtimePanel.copy(visible = false)) }
    }

    fun showToolsPanel() {
        maybeLoadSkillCatalog()
        _uiState.update { state ->
            state.copy(
                threadHistorySheetVisible = false,
                runtimePanel = state.runtimePanel.copy(visible = false),
                noticesPanel = state.noticesPanel.copy(visible = false),
                toolsPanel = state.toolsPanel.copy(
                    visible = true,
                    compactStatusText = if (state.toolsPanel.compactSubmitting) {
                        state.toolsPanel.compactStatusText
                    } else {
                        ""
                    },
                    compactStatusTone = if (state.toolsPanel.compactSubmitting) {
                        state.toolsPanel.compactStatusTone
                    } else {
                        ""
                    }
                )
            )
        }
    }

    fun showNoticesPanel() {
        _uiState.update { state ->
            state.copy(
                threadHistorySheetVisible = false,
                runtimePanel = state.runtimePanel.copy(visible = false),
                noticesPanel = state.noticesPanel.copy(visible = true),
                toolsPanel = state.toolsPanel.copy(visible = false)
            )
        }
    }

    fun hideNoticesPanel() {
        _uiState.update { state ->
            state.copy(noticesPanel = state.noticesPanel.copy(visible = false))
        }
    }

    fun hideToolsPanel() {
        _uiState.update { state ->
            state.copy(toolsPanel = state.toolsPanel.copy(visible = false))
        }
    }

    fun selectSkill(skillName: String?) {
        val normalized = skillName?.trim().orEmpty()
        val current = _uiState.value
        val nextInteractionState = CodexInteractionState(
            planMode = current.planMode == true,
            activeSkill = normalized.ifEmpty { null }
        )
        _uiState.update { state ->
            state.copy(
                interactionState = nextInteractionState,
                toolsPanel = state.toolsPanel.copy(visible = false)
            )
        }
        syncInteractionState(nextInteractionState)
    }

    fun clearActiveSkill() {
        selectSkill(null)
    }

    fun requestCompactCurrentThread() {
        val state = _uiState.value
        if (state.capabilities?.compact != true) {
            _uiState.update {
                it.copy(
                    toolsPanel = it.toolsPanel.copy(
                        compactStatusText = "Compact is unavailable on this server.",
                        compactStatusTone = "error"
                    )
                )
            }
            return
        }
        val threadId = state.threadId?.trim().orEmpty()
        if (threadId.isEmpty()) {
            _uiState.update {
                it.copy(
                    toolsPanel = it.toolsPanel.copy(
                        compactStatusText = "Open a thread before requesting compact.",
                        compactStatusTone = "error"
                    )
                )
            }
            return
        }
        _uiState.update {
            it.copy(
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = true,
                    compactStatusText = "Requesting compact for the current thread…",
                    compactStatusTone = ""
                )
            )
        }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/compact/start",
                params = JSONObject().put("threadId", threadId)
            )
        )
    }

    fun showUsagePanel() {
        requestRateLimits(silent = true)
        _uiState.update { state ->
            state.copy(usagePanel = state.usagePanel.copy(visible = true))
        }
    }

    fun hideUsagePanel() {
        _uiState.update { state ->
            state.copy(usagePanel = state.usagePanel.copy(visible = false))
        }
    }

    fun addImageUrlAttachment(url: String) {
        val normalized = url.trim()
        if (normalized.isEmpty()) return
        _uiState.update { state ->
            state.copy(
                pendingImageAttachments = state.pendingImageAttachments + CodexPendingImageAttachment(
                    id = UUID.randomUUID().toString(),
                    type = "image",
                    label = normalized,
                    url = normalized
                )
            )
        }
    }

    fun addLocalImageAttachment(
        label: String,
        dataUrl: String,
        mimeType: String?,
        sizeBytes: Long
    ) {
        val normalizedUrl = dataUrl.trim()
        if (normalizedUrl.isEmpty()) return
        val maxImageSize = _uiState.value.capabilities?.maxImageSize ?: 0L
        if (maxImageSize > 0L && sizeBytes > maxImageSize) {
            appendMessage(
                ChatMessage.Role.ERROR,
                "Image too large: $label (${sizeBytes} bytes > $maxImageSize bytes)."
            )
            return
        }
        _uiState.update { state ->
            state.copy(
                pendingImageAttachments = state.pendingImageAttachments + CodexPendingImageAttachment(
                    id = UUID.randomUUID().toString(),
                    type = "localImage",
                    label = label.ifBlank { "Image" },
                    url = normalizedUrl,
                    mimeType = mimeType,
                    sizeBytes = sizeBytes
                )
            )
        }
    }

    fun removePendingImageAttachment(attachmentId: String) {
        _uiState.update { state ->
            state.copy(
                pendingImageAttachments = state.pendingImageAttachments.filterNot { it.id == attachmentId }
            )
        }
    }

    fun hideThreadHistory() {
        _uiState.update {
            it.copy(
                threadHistorySheetVisible = false,
                threadRenameTargetId = "",
                threadRenameDraft = "",
                threadHistoryActionThreadId = "",
                threadHistoryActionKind = ""
            )
        }
    }

    fun refreshThreadHistory() {
        if (_uiState.value.capabilities?.historyList != true) return
        _uiState.update { it.copy(threadHistoryLoading = true) }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/list",
                params = JSONObject().put("limit", 50)
            )
        )
    }

    fun resumeThread(threadId: String) {
        val normalizedThreadId = threadId.trim()
        if (normalizedThreadId.isEmpty()) return
        _uiState.update {
            it.copy(
                threadHistoryActionThreadId = normalizedThreadId,
                threadHistoryActionKind = "resume"
            )
        }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/resume",
                params = JSONObject().put("threadId", normalizedThreadId)
            )
        )
    }

    fun forkThread(threadId: String) {
        requestThreadMutation(
            threadId = threadId,
            actionKind = "fork",
            method = "thread/fork"
        )
    }

    fun toggleThreadArchive(threadId: String, archived: Boolean) {
        requestThreadMutation(
            threadId = threadId,
            actionKind = if (archived) "unarchive" else "archive",
            method = if (archived) "thread/unarchive" else "thread/archive"
        )
    }

    fun startThreadRename(threadId: String, currentTitle: String) {
        val normalizedThreadId = threadId.trim()
        if (normalizedThreadId.isEmpty()) return
        _uiState.update {
            it.copy(
                threadRenameTargetId = normalizedThreadId,
                threadRenameDraft = currentTitle.ifBlank { normalizedThreadId }
            )
        }
    }

    fun updateThreadRenameDraft(value: String) {
        _uiState.update { it.copy(threadRenameDraft = value) }
    }

    fun cancelThreadRename() {
        _uiState.update {
            it.copy(
                threadRenameTargetId = "",
                threadRenameDraft = ""
            )
        }
    }

    fun submitThreadRename() {
        val state = _uiState.value
        val targetId = state.threadRenameTargetId.trim()
        val nextTitle = state.threadRenameDraft.trim()
        if (targetId.isEmpty() || nextTitle.isEmpty()) return
        _uiState.update {
            it.copy(
                threadHistoryActionThreadId = targetId,
                threadHistoryActionKind = "rename"
            )
        }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/name/set",
                params = JSONObject()
                    .put("threadId", targetId)
                    .put("name", nextTitle)
                    .put("title", nextTitle)
            )
        )
    }

    // ── Slash command dispatch ─────────────────────────────────────────

    private fun dispatchSlashCommand(parsed: CodexSlashRegistry.ParsedInput.Slash) {
        val entry = CodexSlashRegistry.resolveSlashCommand(parsed.command)
        if (entry == null) {
            appendMessage(ChatMessage.Role.SYSTEM, "Unknown command: ${parsed.command}")
            return
        }

        when (entry.command) {
            "/model" -> showModelPicker()
            "/plan" -> handleSlashPlan(parsed.argumentText)
            "/fast" -> toggleFastMode()
            "/skills" -> showToolsPanel()
            "/compact" -> showToolsPanel()
            "/skill" -> handleSlashSkill(parsed.argumentText)
            else -> appendMessage(ChatMessage.Role.SYSTEM, "${entry.command} is not yet supported on mobile")
        }
    }

    private fun handleSlashPlan(argumentText: String) {
        if (argumentText.isEmpty()) {
            togglePlanMode()
        } else {
            sendTurnWithOverrides(argumentText, forcePlanMode = true)
        }
    }

    private fun handleSlashSkill(argumentText: String) {
        val query = argumentText.trim()
        if (query.isEmpty()) {
            showToolsPanel()
            return
        }
        maybeLoadSkillCatalog()
        val selected = _uiState.value.toolsPanel.skills.firstOrNull { entry ->
            entry.name.equals(query, ignoreCase = true) || entry.label.equals(query, ignoreCase = true)
        }
        if (selected != null) {
            selectSkill(selected.name)
        } else {
            showToolsPanel()
            appendMessage(ChatMessage.Role.SYSTEM, "Skill not found: $query")
        }
    }

    // ── Plan mode ─────────────────────────────────────────────────────

    fun togglePlanMode() {
        val current = _uiState.value
        if (current.planMode == true) {
            closePlanMode(clearWorkflow = true)
        } else {
            applyInteractionState(planMode = true)
        }
    }

    fun continuePlanWorkflow() {
        _uiState.update { state ->
            state.copy(
                planMode = true,
                interactionState = buildInteractionState(state, planMode = true),
                planWorkflow = state.planWorkflow.copy(
                    phase = PLAN_PHASE_PLANNING,
                    latestPlanText = state.planWorkflow.confirmedPlanText.ifBlank {
                        state.planWorkflow.latestPlanText
                    }
                )
            )
        }
        syncInteractionState(_uiState.value.interactionState ?: CodexInteractionState(planMode = true))
    }

    fun cancelPlanWorkflow() {
        closePlanMode(clearWorkflow = true)
    }

    fun executeConfirmedPlan() {
        val state = _uiState.value
        val executionPrompt = buildConfirmedPlanExecutionPrompt(state)
        if (executionPrompt.isBlank()) {
            appendMessage(ChatMessage.Role.ERROR, "No confirmed plan available to execute.")
            return
        }
        _uiState.update { current ->
            current.copy(
                planMode = false,
                interactionState = buildInteractionState(current, planMode = false),
                planWorkflow = current.planWorkflow.copy(
                    phase = PLAN_PHASE_EXECUTING_CONFIRMED_PLAN
                )
            )
        }
        syncInteractionState(_uiState.value.interactionState ?: CodexInteractionState())
        sendTurnWithOverrides(
            text = executionPrompt,
            forceNewThread = true,
            clearPlanModeAfterSend = false,
            displayTextOverride = executionPrompt
        )
    }

    // ── Fast mode ─────────────────────────────────────────────────────

    fun toggleFastMode() {
        _uiState.update { state ->
            val current = state.nextTurnOverrides.reasoningEffort
            val isFastNow = current == FAST_MODE_EFFORT
            val newEffort = if (isFastNow) null else FAST_MODE_EFFORT
            Log.i(TAG, "Fast mode: ${!isFastNow} (reasoning: $newEffort)")
            recalculateNextTurnEffectiveConfig(
                state.copy(
                    nextTurnOverrides = state.nextTurnOverrides.copy(reasoningEffort = newEffort)
                )
            )
        }
    }

    fun showReasoningPicker() {
        _uiState.update {
            it.copy(
                modelPickerVisible = false,
                sandboxPickerVisible = false,
                reasoningPickerVisible = true
            )
        }
    }

    fun hideReasoningPicker() {
        _uiState.update { it.copy(reasoningPickerVisible = false) }
    }

    fun selectReasoningEffort(reasoningEffort: String?) {
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    nextTurnOverrides = it.nextTurnOverrides.copy(reasoningEffort = reasoningEffort),
                    reasoningPickerVisible = false
                )
            )
        }
    }

    fun showSandboxPicker() {
        _uiState.update {
            it.copy(
                modelPickerVisible = false,
                reasoningPickerVisible = false,
                sandboxPickerVisible = true
            )
        }
    }

    fun hideSandboxPicker() {
        _uiState.update { it.copy(sandboxPickerVisible = false) }
    }

    fun selectSandboxMode(sandboxMode: String?) {
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    nextTurnOverrides = it.nextTurnOverrides.copy(sandbox = sandboxMode),
                    sandboxPickerVisible = false
                )
            )
        }
    }

    // ── Model picker ──────────────────────────────────────────────────

    fun showModelPicker() {
        maybeRequestModelList()
        _uiState.update {
            it.copy(
                modelPickerVisible = true,
                reasoningPickerVisible = false,
                sandboxPickerVisible = false
            )
        }
    }

    fun hideModelPicker() {
        _uiState.update { it.copy(modelPickerVisible = false) }
    }

    fun selectModel(model: String?) {
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    nextTurnOverrides = it.nextTurnOverrides.copy(model = model),
                    modelPickerVisible = false
                )
            )
        }
        Log.i(TAG, "Model override: $model")
    }

    // ── Slash menu ────────────────────────────────────────────────────

    fun showSlashMenu(query: String = "/") {
        _uiState.update { it.copy(slashMenuVisible = true, slashMenuQuery = query) }
    }

    fun hideSlashMenu() {
        _uiState.update { it.copy(slashMenuVisible = false, slashMenuQuery = "") }
    }

    fun updateSlashMenuQuery(query: String) {
        _uiState.update { it.copy(slashMenuQuery = query) }
    }

    fun handleComposerTextChanged(rawText: String) {
        val mentionInput = CodexSlashRegistry.parseFileMentionInput(rawText)
        if (mentionInput == null || _uiState.value.capabilities?.fileMentions != true) {
            hideFileMentionMenu()
            return
        }
        searchFileMentions(mentionInput.query)
    }

    fun hideFileMentionMenu() {
        mentionSearchGeneration += 1
        _uiState.update {
            it.copy(
                fileMentionMenuVisible = false,
                fileMentionQuery = "",
                fileMentionResults = emptyList(),
                fileMentionLoading = false
            )
        }
    }

    fun selectFileMention(file: FileMention) {
        hideFileMentionMenu()
        _uiState.update { state ->
            if (state.pendingFileMentions.any { it.path == file.path }) {
                state
            } else {
                state.copy(pendingFileMentions = state.pendingFileMentions + file)
            }
        }
    }

    fun removeFileMention(path: String) {
        _uiState.update { state ->
            state.copy(pendingFileMentions = state.pendingFileMentions.filterNot { it.path == path })
        }
    }

    // ── Next turn overrides ───────────────────────────────────────────

    fun setNextTurnOverrides(overrides: NextTurnOverrides) {
        _uiState.update { state ->
            recalculateNextTurnEffectiveConfig(state.copy(nextTurnOverrides = overrides))
        }
    }

    // ── Internal: send turn with overrides ────────────────────────────

    private fun sendTurnWithOverrides(
        text: String,
        forcePlanMode: Boolean = false,
        forceNewThread: Boolean = false,
        clearPlanModeAfterSend: Boolean = true,
        displayTextOverride: String? = null
    ) {
        val state = _uiState.value
        if (text.isBlank() && state.pendingFileMentions.isEmpty() && state.pendingImageAttachments.isEmpty()) return
        val attachments = state.pendingImageAttachments.map { attachment ->
            CodexTurnAttachment(
                type = attachment.type,
                url = attachment.url
            )
        }
        val prompt = buildPromptWithMentions(text, state.pendingFileMentions)
        val displayText = displayTextOverride ?: buildDisplayText(
            text = text,
            mentions = state.pendingFileMentions,
            attachments = state.pendingImageAttachments
        )
        val userMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            role = ChatMessage.Role.USER,
            content = displayText
        )
        _uiState.update {
            it.copy(
                messages = it.messages + userMsg,
                pendingFileMentions = emptyList(),
                pendingImageAttachments = emptyList(),
                fileMentionMenuVisible = false,
                fileMentionQuery = "",
                fileMentionResults = emptyList(),
                fileMentionLoading = false,
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = false,
                    compactStatusText = "",
                    compactStatusTone = ""
                ),
                planWorkflow = if (
                    forceNewThread ||
                    (forcePlanMode || state.planMode == true) ||
                    it.planWorkflow.phase != PLAN_PHASE_READY_FOR_CONFIRMATION
                ) {
                    it.planWorkflow
                } else {
                    buildEmptyPlanWorkflowState()
                }
            )
        }

        val isPlanMode = forcePlanMode || state.planMode == true
        val effectiveModel = state.nextTurnOverrides.model ?: state.model
        val effectiveReasoning = state.nextTurnOverrides.reasoningEffort ?: state.reasoningEffort

        val collaborationMode = if (isPlanMode) {
            CodexClientMessages.buildCollaborationMode(
                model = effectiveModel,
                reasoningEffort = effectiveReasoning
            )
        } else null

        connectionManager.send(
            CodexClientMessages.codexTurn(
                prompt = prompt,
                threadId = state.threadId,
                attachments = attachments,
                model = state.nextTurnOverrides.model,
                reasoningEffort = state.nextTurnOverrides.reasoningEffort,
                sandbox = state.nextTurnOverrides.sandbox,
                collaborationMode = collaborationMode,
                forceNewThread = forceNewThread
            )
        )

        if (collaborationMode != null) {
            _uiState.update { current ->
                current.copy(
                    planWorkflow = startPlanWorkflow(prompt)
                )
            }
        }

        // Clear plan mode after sending a plan turn (matches Web behavior)
        if (isPlanMode && clearPlanModeAfterSend) {
            closePlanMode(clearWorkflow = false)
        }
    }

    private fun maybeRequestModelList() {
        val caps = _uiState.value.capabilities ?: return
        if (!caps.modelConfig || caps.models.isNotEmpty()) {
            return
        }
        connectionManager.send(CodexClientMessages.codexRequest("model/list"))
    }

    private fun searchFileMentions(query: String) {
        val state = _uiState.value
        val profile = currentProfile ?: run {
            hideFileMentionMenu()
            return
        }
        val sessionId = state.sessionId.takeIf { it.isNotBlank() } ?: run {
            hideFileMentionMenu()
            return
        }
        val generation = ++mentionSearchGeneration
        _uiState.update {
            it.copy(
                fileMentionMenuVisible = true,
                fileMentionQuery = query,
                fileMentionResults = emptyList(),
                fileMentionLoading = true
            )
        }
        viewModelScope.launch(Dispatchers.IO) {
            val result = sessionApiClient.searchWorkspaceFiles(profile, sessionId, query)
            _uiState.update { current ->
                if (generation != mentionSearchGeneration) {
                    return@update current
                }
                when (result) {
                    is com.termlink.app.data.ApiResult.Success -> current.copy(
                        fileMentionMenuVisible = true,
                        fileMentionQuery = query,
                        fileMentionResults = result.value.map { item ->
                            FileMention(
                                label = item.label,
                                path = item.path,
                                relativePathWithoutFileName = item.relativePathWithoutFileName,
                                fsPath = item.fsPath
                            )
                        },
                        fileMentionLoading = false
                    )
                    is com.termlink.app.data.ApiResult.Failure -> {
                        Log.w(TAG, "Workspace file search failed: ${result.error.message}")
                        current.copy(
                            fileMentionMenuVisible = false,
                            fileMentionQuery = "",
                            fileMentionResults = emptyList(),
                            fileMentionLoading = false
                        )
                    }
                }
            }
        }
    }

    private fun buildPromptWithMentions(text: String, mentions: List<FileMention>): String {
        val mentionPrefix = mentions.joinToString("\n") { "@${it.path}" }
        val promptText = text.trim()
        return when {
            mentionPrefix.isBlank() -> promptText
            promptText.isBlank() -> mentionPrefix
            else -> "$mentionPrefix\n$promptText"
        }
    }

    private fun buildDisplayText(
        text: String,
        mentions: List<FileMention>,
        attachments: List<CodexPendingImageAttachment> = emptyList()
    ): String {
        val parts = mutableListOf<String>()
        if (mentions.isNotEmpty()) {
            parts += mentions.joinToString("\n") { "@${displayPath(it)}" }
        }
        if (attachments.isNotEmpty()) {
            parts += attachments.joinToString("\n") { attachment ->
                when (attachment.type) {
                    "localImage" -> "[image] ${attachment.label}"
                    else -> "[image-url] ${attachment.label}"
                }
            }
        }
        text.trim().takeIf { it.isNotEmpty() }?.let(parts::add)
        return parts.joinToString("\n")
    }

    private fun displayPath(file: FileMention): String {
        val folder = file.relativePathWithoutFileName.trim().trim('.', '\\', '/')
        return if (folder.isBlank()) {
            file.label
        } else {
            "$folder/${file.label}"
        }
    }

    // ── Internal observers ────────────────────────────────────────────

    private fun observeConnectionState() {
        viewModelScope.launch {
            connectionManager.connectionState.collect { state ->
                _uiState.update { it.copy(connectionState = state) }
            }
        }
    }

    private fun observeWsEvents() {
        viewModelScope.launch {
            connectionManager.wsClient.events.collect { event ->
                when (event) {
                    is WsEvent.Opened -> {
                        connectionManager.onConnected()
                    }
                    is WsEvent.Message -> {
                        handleEnvelope(event.envelope)
                    }
                    is WsEvent.Closed -> {
                        if (event.code == 4404 || event.reason.contains("Session not found or expired", ignoreCase = true)) {
                            val message = "Session not found or expired"
                            _uiState.update {
                                it.copy(
                                    errorMessage = message,
                                    sessionExpired = true
                                )
                            }
                        }
                        connectionManager.onDisconnected()
                    }
                    is WsEvent.Closing -> { /* handled by Closed */ }
                    is WsEvent.Failure -> {
                        val message = event.throwable.message ?: "WebSocket failure"
                        appendMessage(ChatMessage.Role.ERROR, message)
                        _uiState.update {
                            it.copy(
                                errorMessage = message,
                                planWorkflow = buildEmptyPlanWorkflowState(),
                                runtimePanel = it.runtimePanel.copy(
                                    warning = message,
                                    warningTone = "error"
                                )
                            )
                        }
                        connectionManager.onDisconnected()
                    }
                }
            }
        }
    }

    private fun handleEnvelope(envelope: CodexWsEnvelope) {
        val json = envelope.raw
        when (envelope.type) {
            "session_info" -> {
                val info = SessionInfo.from(json)
                _uiState.update {
                    it.copy(
                        sessionId = info.sessionId,
                        sessionName = info.sessionName
                    )
                }
                Log.i(TAG, "Session info: ${info.sessionId} ${info.sessionName}")
            }

            "codex_capabilities" -> {
                val caps = CodexCapabilities.from(json)
                _uiState.update {
                    recalculateNextTurnEffectiveConfig(
                        it.copy(
                            capabilities = caps,
                            model = caps.defaultModel.ifBlank { it.model },
                            reasoningEffort = caps.defaultReasoningEffort.ifBlank { it.reasoningEffort }
                        )
                    )
                }
                if (caps.rateLimitsRead) {
                    requestRateLimits(silent = true)
                }
                Log.i(TAG, "Capabilities: models=${caps.models}")
            }

            "codex_state" -> {
                val state = CodexState.from(json)
                _uiState.update { current ->
                    val wasIdle = current.status.equals("idle", ignoreCase = true)
                    val isIdle = state.status.equals("idle", ignoreCase = true)
                    val nextState = recalculateNextTurnEffectiveConfig(
                        current.copy(
                            status = state.status,
                            model = state.model ?: current.model,
                            reasoningEffort = state.reasoningEffort ?: current.reasoningEffort,
                            sandbox = state.sandbox ?: current.sandbox,
                            planMode = state.interactionState?.planMode ?: state.planMode ?: current.planMode,
                            threadId = state.threadId ?: current.threadId,
                            currentThreadTitle = resolveCurrentThreadTitle(
                                threadId = state.threadId ?: current.threadId,
                                entries = current.threadHistoryEntries,
                                fallback = current.currentThreadTitle
                            ),
                            interactionState = state.interactionState ?: current.interactionState,
                            cwd = state.cwd ?: current.cwd,
                            serverNextTurnConfigBase = state.nextTurnEffectiveCodexConfig,
                            pendingServerRequests = state.pendingServerRequests.filter { request ->
                                request.handledBy.equals("client", ignoreCase = true)
                            },
                            submittingServerRequestIds = emptySet()
                        )
                    )
                    if (isIdle && !wasIdle) {
                        finalizePlanWorkflowOnTurnSettled(nextState)
                    } else {
                        nextState
                    }
                }
                if (json.has("tokenUsage")) {
                    applyTokenUsagePayload(state.tokenUsage)
                }
                if (json.has("rateLimitState")) {
                    applyRateLimitPayload(state.rateLimitState)
                }
            }

            "codex_thread_ready" -> {
                val ready = CodexThreadReady.from(json)
                _uiState.update {
                    it.copy(
                        threadId = ready.threadId,
                        messages = if (ready.resumed) it.messages else emptyList(),
                        runtimePanel = if (ready.resumed) {
                            it.runtimePanel
                        } else {
                            buildEmptyRuntimePanelState()
                        },
                        currentThreadTitle = resolveCurrentThreadTitle(
                            threadId = ready.threadId,
                            entries = it.threadHistoryEntries,
                            fallback = it.currentThreadTitle
                        )
                    )
                }
                Log.i(TAG, "Thread ready: ${ready.threadId} resumed=${ready.resumed}")
            }

            "codex_thread_snapshot" -> {
                val snapshot = CodexThreadSnapshot.from(json)
                val messages = parseSnapshotMessages(snapshot)
                _uiState.update {
                    it.copy(
                        threadId = snapshot.threadId,
                        messages = messages,
                        currentThreadTitle = resolveCurrentThreadTitle(
                            threadId = snapshot.threadId,
                            entries = it.threadHistoryEntries,
                            fallback = it.currentThreadTitle
                        )
                    )
                }
                Log.i(TAG, "Thread snapshot: ${snapshot.threadId} msgs=${messages.size}")
            }

            "codex_turn_ack" -> {
                val ack = CodexTurnAck.from(json)
                Log.d(TAG, "Turn ack: ${ack.turnId}")
            }

            "codex_interrupt_ack" -> {
                Log.d(TAG, "Interrupt ack")
                currentStreamingMessageId = null
            }

            "codex_response" -> {
                val response = CodexResponse.from(json)
                handleCodexResponse(response)
            }

            "codex_error" -> {
                val error = CodexError.from(json)
                val message = "${error.code}: ${error.message}"
                appendMessage(ChatMessage.Role.ERROR, message)
                _uiState.update {
                    it.copy(
                        errorMessage = message,
                        planWorkflow = buildEmptyPlanWorkflowState(),
                        runtimePanel = it.runtimePanel.copy(
                            warning = message,
                            warningTone = "error"
                        )
                    )
                }
                Log.e(TAG, "Codex error: ${error.code} ${error.message}")
            }

            "codex_notification" -> {
                val notif = CodexNotification.from(json)
                handleCodexNotification(notif)
            }

            "codex_server_request" -> {
                val requestEnvelope = CodexServerRequestEnvelope.from(json)
                handleCodexServerRequest(requestEnvelope)
            }

            else -> {
                Log.d(TAG, "Unhandled message type: ${envelope.type}")
            }
        }
    }

    private fun handleCodexResponse(response: CodexResponse) {
        val method = response.method
        if (!method.isNullOrBlank()) {
            if (response.error != null) {
                handleCodexRequestError(method, response.error)
                return
            }
            when (method) {
                "model/list" -> {
                    handleModelListResponse(response.result)
                    return
                }
                "thread/list" -> {
                    handleThreadListResponse(response.result)
                    return
                }
                "thread/resume" -> {
                    handleThreadResumeResponse(response.result)
                    return
                }
                "thread/read" -> {
                    handleThreadReadResponse(response.result)
                    return
                }
                "skills/list" -> {
                    handleSkillsListResponse(response.result)
                    return
                }
                "account/rateLimits/read" -> {
                    applyRateLimitPayload(response.result)
                    return
                }
                "thread/compact/start" -> {
                    handleCompactStartResponse(response.result)
                    return
                }
                "thread/fork",
                "thread/archive",
                "thread/unarchive",
                "thread/name/set" -> {
                    handleThreadMutationResponse(method, response.result)
                    return
                }
            }
        }
        when (response.event) {
            "message_start" -> {
                // Finalize any orphaned streaming message before starting a new one
                if (currentStreamingMessageId != null) {
                    val orphanId = currentStreamingMessageId
                    _uiState.update { state ->
                        val updated = state.messages.map { msg ->
                            if (msg.id == orphanId) msg.copy(streaming = false) else msg
                        }
                        state.copy(messages = updated)
                    }
                    Log.w(TAG, "Finalized orphaned streaming message: $orphanId")
                }
                val msgId = UUID.randomUUID().toString()
                currentStreamingMessageId = msgId
                upsertAssistantMessage(
                    itemId = msgId,
                    content = response.content.orEmpty(),
                    streaming = true
                )
            }

            "message_delta", "content_block_delta" -> {
                val streamId = currentStreamingMessageId ?: return
                val delta = response.content ?: return
                appendAssistantDelta(streamId, delta)
            }

            "message_stop" -> {
                val streamId = currentStreamingMessageId ?: return
                _uiState.update { state ->
                    val updated = state.messages.map { msg ->
                        if (msg.id == streamId) msg.copy(streaming = false) else msg
                    }
                    state.copy(messages = updated)
                }
                currentStreamingMessageId = null
            }

            "tool_use_start" -> {
                val msg = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    role = ChatMessage.Role.TOOL,
                    content = response.content.orEmpty(),
                    toolName = response.toolName
                )
                _uiState.update { it.copy(messages = it.messages + msg) }
            }

            "system" -> {
                val msg = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    role = ChatMessage.Role.SYSTEM,
                    content = response.content.orEmpty()
                )
                _uiState.update { it.copy(messages = it.messages + msg) }
            }

            else -> {
                Log.d(TAG, "Unhandled codex_response event: ${response.event}")
            }
        }
    }

    private fun handleModelListResponse(result: Any?) {
        val models = mutableListOf<String>()
        when (result) {
            is org.json.JSONArray -> extractModelIds(result, models)
            is org.json.JSONObject -> {
                extractModelIds(result.optJSONArray("data"), models)
                extractModelIds(result.optJSONArray("models"), models)
            }
        }
        if (models.isEmpty()) {
            return
        }
        _uiState.update { state ->
            state.copy(
                capabilities = state.capabilities?.copy(models = models.distinct())
            )
        }
        Log.i(TAG, "Loaded model list: ${models.distinct()}")
    }

    private fun maybeLoadSkillCatalog() {
        val state = _uiState.value
        if (state.capabilities?.skillsList != true) return
        if (state.toolsPanel.skills.isNotEmpty() || state.toolsPanel.loading || state.toolsPanel.requested) {
            return
        }
        _uiState.update {
            it.copy(
                toolsPanel = it.toolsPanel.copy(
                    loading = true,
                    requested = true
                )
            )
        }
        connectionManager.send(CodexClientMessages.codexRequest("skills/list", JSONObject()))
    }

    private fun handleSkillsListResponse(result: Any?) {
        val skills = normalizeSkillCatalog(result)
        _uiState.update { state ->
            state.copy(
                toolsPanel = state.toolsPanel.copy(
                    skills = skills,
                    loading = false,
                    requested = true
                )
            )
        }
    }

    private fun requestRateLimits(silent: Boolean = false) {
        if (_uiState.value.capabilities?.rateLimitsRead != true) return
        if (!silent) {
            _uiState.update {
                it.copy(
                    usagePanel = it.usagePanel.copy(rateLimitTone = "")
                )
            }
        }
        connectionManager.send(CodexClientMessages.codexRequest("account/rateLimits/read"))
    }

    private fun handleCompactStartResponse(result: Any?) {
        val detail = when (result) {
            is JSONObject -> {
                pickFirstText(
                    result,
                    listOf("message"),
                    listOf("detail"),
                    listOf("status")
                )
            }
            else -> ""
        }
        _uiState.update {
            it.copy(
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = false,
                    compactStatusText = detail.ifEmpty { "Compact request submitted." },
                    compactStatusTone = if (detail.isEmpty()) "success" else ""
                )
            )
        }
    }

    private fun extractModelIds(source: org.json.JSONArray?, target: MutableList<String>) {
        if (source == null) return
        for (index in 0 until source.length()) {
            when (val entry = source.opt(index)) {
                is String -> entry.trim().takeIf { it.isNotEmpty() }?.let(target::add)
                is org.json.JSONObject -> {
                    entry.optStringOrNullCompat("id")?.let(target::add)
                        ?: entry.optStringOrNullCompat("model")?.let(target::add)
                }
            }
        }
    }

    private fun requestThreadMutation(threadId: String, actionKind: String, method: String) {
        val normalizedThreadId = threadId.trim()
        if (normalizedThreadId.isEmpty()) return
        _uiState.update {
            it.copy(
                threadHistoryActionThreadId = normalizedThreadId,
                threadHistoryActionKind = actionKind
            )
        }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = method,
                params = JSONObject().put("threadId", normalizedThreadId)
            )
        )
    }

    private fun handleCodexRequestError(method: String, error: JSONObject) {
        val message = error.optString("message", "Codex request failed.")
            .trim()
            .ifEmpty { "Codex request failed." }
        when (method) {
            "thread/list" -> {
                _uiState.update { it.copy(threadHistoryLoading = false) }
                appendMessage(ChatMessage.Role.ERROR, message)
            }
            "skills/list" -> {
                _uiState.update {
                    it.copy(
                        toolsPanel = it.toolsPanel.copy(
                            loading = false,
                            requested = false
                        )
                    )
                }
                appendMessage(ChatMessage.Role.ERROR, message)
            }
            "account/rateLimits/read" -> {
                appendMessage(ChatMessage.Role.ERROR, message)
            }
            "thread/compact/start" -> {
                _uiState.update {
                    it.copy(
                        toolsPanel = it.toolsPanel.copy(
                            compactSubmitting = false,
                            compactStatusText = message,
                            compactStatusTone = "error"
                        )
                    )
                }
            }
            "thread/resume",
            "thread/read",
            "thread/fork",
            "thread/archive",
            "thread/unarchive",
            "thread/name/set" -> {
                _uiState.update {
                    it.copy(
                        threadHistoryLoading = false,
                        threadHistoryActionThreadId = "",
                        threadHistoryActionKind = "",
                        threadRenameTargetId = if (method == "thread/name/set") it.threadRenameTargetId else "",
                        threadRenameDraft = if (method == "thread/name/set") it.threadRenameDraft else ""
                    )
                }
                appendMessage(ChatMessage.Role.ERROR, message)
            }
            else -> appendMessage(ChatMessage.Role.ERROR, message)
        }
    }

    private fun handleThreadListResponse(result: Any?) {
        val entries = parseThreadHistoryEntries(result)
        _uiState.update { state ->
            state.copy(
                threadHistoryEntries = entries,
                threadHistoryLoading = false,
                currentThreadTitle = resolveCurrentThreadTitle(
                    threadId = state.threadId,
                    entries = entries,
                    fallback = state.currentThreadTitle
                )
            )
        }
    }

    private fun handleThreadResumeResponse(result: Any?) {
        val thread = extractThreadResult(result) ?: run {
            clearThreadHistoryAction()
            return
        }
        val resumedThreadId = thread.optStringOrNullCompat("id").orEmpty()
        val resumedTitle = resolveThreadTitle(thread)
        _uiState.update { state ->
            state.copy(
                threadId = resumedThreadId.ifEmpty { state.threadId },
                currentThreadTitle = resumedTitle.ifBlank { state.currentThreadTitle },
                threadHistoryActionThreadId = resumedThreadId.ifEmpty { state.threadHistoryActionThreadId },
                threadHistoryActionKind = "resume",
                planWorkflow = buildEmptyPlanWorkflowState(),
                runtimePanel = buildEmptyRuntimePanelState(visible = state.runtimePanel.visible),
                noticesPanel = CodexNoticesPanelState(visible = state.noticesPanel.visible),
                pendingServerRequests = emptyList(),
                submittingServerRequestIds = emptySet()
            )
        }
        if (resumedThreadId.isNotEmpty()) {
            connectionManager.send(
                CodexClientMessages.codexRequest(
                    action = "thread/read",
                    params = JSONObject()
                        .put("threadId", resumedThreadId)
                        .put("includeTurns", true)
                )
            )
        } else {
            clearThreadHistoryAction()
        }
        if (thread.has("tokenUsage")) {
            applyTokenUsagePayload(thread.opt("tokenUsage"))
        }
        refreshThreadHistory()
    }

    private fun handleThreadReadResponse(result: Any?) {
        val thread = extractThreadResult(result) ?: run {
            clearThreadHistoryAction()
            return
        }
        val threadId = thread.optStringOrNullCompat("id").orEmpty()
        val threadTitle = resolveThreadTitle(thread)
        val turns = thread.optJSONArray("turns")
        val hasTurns = turns != null
        val messages = if (hasTurns) {
            parseThreadTurns(turns)
        } else {
            parseThreadMessages(thread.optJSONArray("messages"))
        }
        val hasMessages = hasTurns || thread.optJSONArray("messages") != null
        _uiState.update { state ->
            state.copy(
                threadId = threadId.ifEmpty { state.threadId },
                currentThreadTitle = threadTitle.ifBlank {
                    resolveCurrentThreadTitle(
                        threadId = threadId.ifEmpty { state.threadId },
                        entries = state.threadHistoryEntries,
                        fallback = state.currentThreadTitle
                    )
                },
                messages = if (hasMessages) messages else state.messages,
                runtimePanel = when {
                    hasTurns -> buildRuntimePanelStateFromTurns(
                        turns = turns,
                        visible = state.runtimePanel.visible
                    )
                    hasMessages -> buildEmptyRuntimePanelState(visible = state.runtimePanel.visible)
                    else -> state.runtimePanel
                },
                noticesPanel = when {
                    hasTurns -> buildNoticesPanelStateFromTurns(
                        turns = turns,
                        visible = state.noticesPanel.visible
                    )
                    hasMessages -> CodexNoticesPanelState(visible = state.noticesPanel.visible)
                    else -> state.noticesPanel
                },
                threadHistorySheetVisible = if (hasMessages) false else state.threadHistorySheetVisible,
                threadHistoryActionThreadId = "",
                threadHistoryActionKind = "",
                threadRenameTargetId = "",
                threadRenameDraft = ""
            )
        }
        if (thread.has("tokenUsage")) {
            applyTokenUsagePayload(thread.opt("tokenUsage"))
        }
    }

    private fun handleThreadMutationResponse(method: String, result: Any?) {
        val nextThreadId = extractThreadResult(result)?.optStringOrNullCompat("id").orEmpty()
        val renamedTitle = if (method == "thread/name/set") {
            _uiState.value.threadRenameDraft.trim()
        } else {
            ""
        }
        _uiState.update { state ->
            val updatedEntries = when {
                method == "thread/name/set" && state.threadRenameTargetId.isNotBlank() && renamedTitle.isNotBlank() ->
                    state.threadHistoryEntries.map { entry ->
                        if (entry.id == state.threadRenameTargetId) {
                            entry.copy(title = renamedTitle)
                        } else {
                            entry
                        }
                    }
                else -> state.threadHistoryEntries
            }
            state.copy(
                currentThreadTitle = when {
                    method == "thread/name/set" &&
                        state.threadRenameTargetId.isNotBlank() &&
                        state.threadId == state.threadRenameTargetId &&
                        renamedTitle.isNotBlank() -> renamedTitle
                    method == "thread/fork" && nextThreadId.isNotBlank() -> state.currentThreadTitle
                    else -> state.currentThreadTitle
                },
                threadHistoryEntries = updatedEntries,
                threadHistoryActionThreadId = "",
                threadHistoryActionKind = "",
                threadRenameTargetId = "",
                threadRenameDraft = ""
            )
        }
        refreshThreadHistory()
    }

    private fun clearThreadHistoryAction() {
        _uiState.update {
            it.copy(
                threadHistoryActionThreadId = "",
                threadHistoryActionKind = "",
                threadHistoryLoading = false
            )
        }
    }

    private fun parseThreadHistoryEntries(result: Any?): List<CodexThreadHistoryEntry> {
        val source = when (result) {
            is JSONArray -> result
            is JSONObject -> result.optJSONArray("data") ?: result.optJSONArray("threads")
            else -> null
        } ?: return emptyList()
        val entries = mutableListOf<CodexThreadHistoryEntry>()
        for (index in 0 until source.length()) {
            val item = source.optJSONObject(index) ?: continue
            val threadId = item.optStringOrNullCompat("id").orEmpty()
            if (threadId.isEmpty()) continue
            entries.add(
                CodexThreadHistoryEntry(
                    id = threadId,
                    title = resolveThreadTitle(item).ifBlank { threadId },
                    archived = item.optBoolean("archived", item.optBoolean("isArchived", false)),
                    lastActiveAt = normalizeHistoryTimestamp(
                        item.opt("lastActiveAt")
                            ?: item.opt("last_active_at")
                            ?: item.opt("updatedAt")
                            ?: item.opt("updated_at")
                            ?: item.opt("lastUpdatedAt")
                            ?: item.opt("last_updated_at")
                            ?: item.opt("lastMessageAt")
                            ?: item.opt("last_message_at")
                            ?: item.opt("modifiedAt")
                            ?: item.opt("modified_at")
                            ?: item.opt("mtime")
                    ),
                    createdAt = normalizeHistoryTimestamp(
                        item.opt("createdAt")
                            ?: item.opt("created_at")
                            ?: item.opt("created")
                    )
                )
            )
        }
        return entries.sortedWith(
            compareByDescending<CodexThreadHistoryEntry> { entry -> entry.lastActiveAt ?: Long.MIN_VALUE }
                .thenByDescending { entry -> entry.createdAt ?: Long.MIN_VALUE }
                .thenBy { entry -> entry.id }
        )
    }

    private fun extractThreadResult(result: Any?): JSONObject? {
        return when (result) {
            is JSONObject -> result.optJSONObject("thread") ?: result.takeIf { it.has("id") }
            else -> null
        }
    }

    private fun resolveThreadTitle(thread: JSONObject?): String {
        thread ?: return ""
        return thread.optStringOrNullCompat("title")
            ?: thread.optStringOrNullCompat("name")
            ?: ""
    }

    private fun resolveCurrentThreadTitle(
        threadId: String?,
        entries: List<CodexThreadHistoryEntry>,
        fallback: String
    ): String {
        val normalizedThreadId = threadId?.trim().orEmpty()
        if (normalizedThreadId.isEmpty()) return ""
        return entries.firstOrNull { it.id == normalizedThreadId }?.title
            ?.takeIf { it.isNotBlank() }
            ?: fallback
    }

    private fun parseThreadMessages(messages: JSONArray?): List<ChatMessage> {
        val snapshot = CodexThreadSnapshot(
            threadId = _uiState.value.threadId.orEmpty(),
            messages = messages ?: JSONArray()
        )
        return parseSnapshotMessages(snapshot)
    }

    private fun parseThreadTurns(turns: JSONArray?): List<ChatMessage> {
        if (turns == null) {
            return emptyList()
        }
        val result = mutableListOf<ChatMessage>()
        for (turnIndex in 0 until turns.length()) {
            val turn = turns.optJSONObject(turnIndex) ?: continue
            val items = turn.optJSONArray("items") ?: continue
            for (itemIndex in 0 until items.length()) {
                val item = items.optJSONObject(itemIndex) ?: continue
                when (item.optString("type", "")) {
                    "userMessage" -> {
                        val text = extractUserMessageText(item)
                        if (text.isNotEmpty()) {
                            result.add(
                                ChatMessage(
                                    id = item.optString("id", UUID.randomUUID().toString()),
                                    role = ChatMessage.Role.USER,
                                    content = text
                                )
                            )
                        }
                    }
                    "agentMessage" -> {
                        result.add(
                            ChatMessage(
                                id = item.optString("id", UUID.randomUUID().toString()),
                                role = ChatMessage.Role.ASSISTANT,
                                content = item.optString("text", "")
                            )
                        )
                    }
                }
            }
        }
        return result
    }

    private fun extractUserMessageText(item: JSONObject): String {
        val content = item.optJSONArray("content") ?: return ""
        for (index in 0 until content.length()) {
            val part = content.optJSONObject(index) ?: continue
            if (part.optString("type", "") == "text") {
                return part.optString("text", "")
            }
        }
        return ""
    }

    private fun normalizeHistoryTimestamp(value: Any?): Long? {
        val numeric = when (value) {
            is Number -> value.toLong()
            is String -> value.trim().toLongOrNull()
            else -> null
        } ?: return null
        return if (numeric in 1..999_999_999_999L) numeric * 1000 else numeric
    }

    private fun findPendingServerRequest(requestId: String): CodexServerRequest? =
        _uiState.value.pendingServerRequests.firstOrNull { it.requestId == requestId }

    private fun markServerRequestSubmitting(requestId: String) {
        _uiState.update { state ->
            state.copy(submittingServerRequestIds = state.submittingServerRequestIds + requestId)
        }
    }

    private fun upsertPendingServerRequest(
        current: List<CodexServerRequest>,
        request: CodexServerRequest
    ): List<CodexServerRequest> {
        val existingIndex = current.indexOfFirst { it.requestId == request.requestId }
        if (existingIndex == -1) {
            return current + request
        }
        return current.toMutableList().also { it[existingIndex] = request }
    }

    private fun buildApprovalDecisionResult(
        request: CodexServerRequest,
        approved: Boolean
    ): JSONObject? {
        if (request.responseMode != "decision") {
            return null
        }
        val decision = when (request.method) {
            "item/commandExecution/requestApproval" -> if (approved) "accept" else "decline"
            "item/fileChange/requestApproval" -> if (approved) "approve" else "decline"
            "applyPatchApproval", "execCommandApproval" -> if (approved) "approved" else "denied"
            else -> return null
        }
        return JSONObject().put("decision", decision)
    }

    private fun buildUserInputResult(
        request: CodexServerRequest,
        answersByQuestionId: Map<String, String>
    ): JSONObject? {
        if (request.responseMode != "answers") {
            return null
        }
        val answers = JSONObject()
        request.questions.forEach { question ->
            val answer = answersByQuestionId[question.id]?.trim().orEmpty()
            if (answer.isEmpty()) {
                return null
            }
            answers.put(
                question.id,
                JSONObject().put("answers", org.json.JSONArray().put(answer))
            )
        }
        return JSONObject().put("answers", answers)
    }

    private fun isDebugServerRequest(requestId: String): Boolean =
        requestId.startsWith(DEBUG_REQUEST_PREFIX)

    private fun completeDebugServerRequest(
        requestId: String,
        result: JSONObject? = null,
        error: JSONObject? = null
    ) {
        _uiState.update { state ->
            state.copy(
                pendingServerRequests = state.pendingServerRequests.filterNot { it.requestId == requestId },
                submittingServerRequestIds = state.submittingServerRequestIds - requestId
            )
        }
        val payload = when {
            result != null -> JSONObject().put("result", result)
            error != null -> JSONObject().put("error", error)
            else -> JSONObject().put("useDefault", true)
        }
        appendMessage(ChatMessage.Role.SYSTEM, "[debug] Simulated server request response: ${payload}")
    }

    private fun buildDebugServerRequest(preset: DebugServerRequestPreset): CodexServerRequest {
        val requestId = "$DEBUG_REQUEST_PREFIX${preset.name.lowercase()}-${UUID.randomUUID()}"
        return when (preset) {
            DebugServerRequestPreset.RUNTIME_SAMPLE -> error("Runtime sample is injected directly and is not a server request.")
            DebugServerRequestPreset.COMMAND_APPROVAL -> CodexServerRequest(
                requestId = requestId,
                method = "item/commandExecution/requestApproval",
                requestKind = "command",
                responseMode = "decision",
                handledBy = "client",
                summary = "Debug sample: approve or reject this command before continuing.",
                questionCount = 0,
                command = "git --no-pager status --short",
                questions = emptyList(),
                params = JSONObject().put("command", "git --no-pager status --short"),
                defaultResult = null
            )

            DebugServerRequestPreset.FILE_APPROVAL -> CodexServerRequest(
                requestId = requestId,
                method = "item/fileChange/requestApproval",
                requestKind = "file",
                responseMode = "decision",
                handledBy = "client",
                summary = "Debug sample: review a pending file change request.",
                questionCount = 0,
                command = null,
                questions = emptyList(),
                params = JSONObject()
                    .put("path", "docs/debug-approval-sample.txt")
                    .put("action", "write"),
                defaultResult = null
            )

            DebugServerRequestPreset.PATCH_APPROVAL -> CodexServerRequest(
                requestId = requestId,
                method = "applyPatchApproval",
                requestKind = "patch",
                responseMode = "decision",
                handledBy = "client",
                summary = "Debug sample: approve or reject a patch-style request.",
                questionCount = 0,
                command = null,
                questions = emptyList(),
                params = JSONObject()
                    .put(
                        "patch",
                        "*** Begin Patch\n*** Add File: debug-sample.txt\n+hello from debug injector\n*** End Patch\n"
                    ),
                defaultResult = null
            )

            DebugServerRequestPreset.AUTO_HANDLED -> CodexServerRequest(
                requestId = requestId,
                method = "item/commandExecution/requestApproval",
                requestKind = "command",
                responseMode = "decision",
                handledBy = "server",
                summary = "Debug sample: this request is auto-handled by the server and should surface as a system message.",
                questionCount = 0,
                command = "git --no-pager diff --stat",
                questions = emptyList(),
                params = JSONObject().put("command", "git --no-pager diff --stat"),
                defaultResult = null
            )

            DebugServerRequestPreset.USER_INPUT_OPTIONS -> CodexServerRequest(
                requestId = requestId,
                method = "item/tool/requestUserInput",
                requestKind = "userInput",
                responseMode = "answers",
                handledBy = "client",
                summary = "Debug sample: answer a multiple-choice follow-up question.",
                questionCount = 1,
                command = null,
                questions = listOf(
                    CodexServerRequestQuestion(
                        id = "debug-mode",
                        question = "Which mode should I use for this debug run?",
                        options = listOf(
                            CodexServerRequestOption("Apple (Recommended)"),
                            CodexServerRequestOption("Banana")
                        ),
                        allowFreeform = true
                    )
                ),
                params = JSONObject()
                    .put(
                        "questions",
                        JSONArray().put(
                            JSONObject()
                                .put("id", "debug-mode")
                                .put("question", "Which mode should I use for this debug run?")
                                .put(
                                    "options",
                                    JSONArray()
                                        .put(JSONObject().put("label", "Apple (Recommended)"))
                                        .put(JSONObject().put("label", "Banana"))
                                )
                                .put("allow_freeform", true)
                        )
                    ),
                defaultResult = null
            )

            DebugServerRequestPreset.USER_INPUT_FREEFORM -> CodexServerRequest(
                requestId = requestId,
                method = "item/tool/requestUserInput",
                requestKind = "userInput",
                responseMode = "answers",
                handledBy = "client",
                summary = "Debug sample: answer a pure freeform follow-up question.",
                questionCount = 1,
                command = null,
                questions = listOf(
                    CodexServerRequestQuestion(
                        id = "debug-reason",
                        question = "Describe why this patch should be applied.",
                        options = emptyList(),
                        allowFreeform = true
                    )
                ),
                params = JSONObject()
                    .put(
                        "questions",
                        JSONArray().put(
                            JSONObject()
                                .put("id", "debug-reason")
                                .put("question", "Describe why this patch should be applied.")
                                .put("allow_freeform", true)
                        )
                    ),
                defaultResult = null
            )
        }
    }

    private fun handleCodexNotification(notification: CodexNotification) {
        val params = notification.params
        when {
            notification.method == "thread/started" -> {
                val threadId = params
                    ?.optJSONObject("thread")
                    ?.optString("id", "")
                    ?.trim()
                    .orEmpty()
                if (threadId.isNotEmpty()) {
                    currentStreamingMessageId = null
                    _uiState.update {
                        it.copy(
                            threadId = threadId,
                            messages = emptyList(),
                            errorMessage = null,
                            runtimePanel = buildEmptyRuntimePanelState(),
                            noticesPanel = CodexNoticesPanelState(),
                            pendingServerRequests = emptyList(),
                            submittingServerRequestIds = emptySet()
                        )
                    }
                }
            }

            notification.method == "thread/status/changed" -> {
                val statusType = params
                    ?.optJSONObject("status")
                    ?.optString("type", "")
                    ?.trim()
                    .orEmpty()
                if (statusType == "idle") {
                    finalizeStreamingMessage()
                    _uiState.update(::finalizePlanWorkflowOnTurnSettled)
                }
            }

            notification.method == "turn/started" -> {
                _uiState.update { it.copy(errorMessage = null) }
            }

            notification.method == "turn/completed" -> {
                finalizeStreamingMessage()
                _uiState.update(::finalizePlanWorkflowOnTurnSettled)
            }

            notification.method == "item/started" -> {
                val item = params?.optJSONObject("item") ?: return
                if (item.optString("type", "") != "agentMessage") return
                val itemId = item.optString("id", "").trim().ifEmpty { UUID.randomUUID().toString() }
                currentStreamingMessageId = itemId
                upsertAssistantMessage(
                    itemId = itemId,
                    content = item.optString("text", ""),
                    streaming = true
                )
            }

            notification.method == "item/agentMessage/delta" -> {
                val itemId = params?.optString("itemId", "")?.trim().orEmpty()
                val delta = params?.optString("delta", "") ?: ""
                if (delta.isEmpty()) return
                val streamId = itemId.ifEmpty { currentStreamingMessageId.orEmpty() }
                if (streamId.isEmpty()) return
                appendAssistantDelta(streamId, delta)
            }

            notification.method == "turn/plan/updated" -> {
                val plan = params?.optJSONObject("plan") ?: return
                val planText = plan.optString("text", "")
                if (planText.isBlank()) {
                    applyRuntimeNotificationUpdate(notification.method, params)
                    return
                }
                val planId = plan.optString("id", "").trim().ifEmpty {
                    currentStreamingMessageId ?: UUID.randomUUID().toString()
                }
                currentStreamingMessageId = planId
                upsertAssistantMessage(
                    itemId = planId,
                    content = planText,
                    streaming = true
                )
                applyRuntimeNotificationUpdate(notification.method, params)
            }

            notification.method == "item/plan/delta" -> {
                val itemId = params?.optString("itemId", "")?.trim().orEmpty()
                val planId = params?.optString("planId", "")?.trim().orEmpty()
                val delta = params?.optString("delta", "") ?: ""
                if (delta.isEmpty()) {
                    applyRuntimeNotificationUpdate(notification.method, params)
                    return
                }
                val streamId = itemId.ifEmpty {
                    planId.ifEmpty {
                        currentStreamingMessageId ?: UUID.randomUUID().toString()
                    }
                }
                currentStreamingMessageId = streamId
                appendAssistantDelta(streamId, delta)
                applyRuntimeNotificationUpdate(notification.method, params)
            }

            notification.method == "item/completed" -> {
                val item = params?.optJSONObject("item") ?: return
                applyRuntimeSnapshotItem(item)
                if (item.optString("type", "") != "agentMessage") return
                val itemId = item.optString("id", "").trim().ifEmpty { currentStreamingMessageId.orEmpty() }
                val text = item.optString("text", "")
                if (itemId.isEmpty()) return
                currentStreamingMessageId = null
                upsertAssistantMessage(
                    itemId = itemId,
                    content = text,
                    streaming = false
                )
            }

            notification.method == "turn/diff/updated" ||
                notification.method == "item/fileChange/outputDelta" ||
                notification.method == "item/mcpToolCall/progress" ||
                notification.method == "configWarning" ||
                notification.method == "deprecationNotice" ||
                notification.method.startsWith("item/reasoning/") -> {
                applyRuntimeNotificationUpdate(notification.method, params)
            }

            notification.method == "thread/tokenUsage/updated" -> {
                applyTokenUsagePayload(params)
            }

            notification.method == "account/rateLimits/updated" -> {
                applyRateLimitPayload(params)
            }

            notification.method == "error" -> {
                val message = resolveCodexNotificationError(params)
                appendMessage(ChatMessage.Role.ERROR, message)
                _uiState.update {
                    it.copy(
                        errorMessage = message,
                        planWorkflow = buildEmptyPlanWorkflowState(),
                        runtimePanel = it.runtimePanel.copy(
                            warning = message,
                            warningTone = "error"
                        )
                    )
                }
            }

            else -> {
                Log.d(TAG, "Unhandled codex_notification method: ${notification.method}")
            }
        }
    }

    private fun handleCodexServerRequest(envelope: CodexServerRequestEnvelope?) {
        val request = envelope?.request ?: return
        if (!request.handledBy.equals("client", ignoreCase = true)) {
            appendMessage(
                ChatMessage.Role.SYSTEM,
                buildAutoHandledServerRequestMessage(request)
            )
            Log.d(TAG, "Surfaced auto-handled server request as system message: ${request.method}")
            return
        }
        if (
            request.requestKind == "userInput" &&
            _uiState.value.planWorkflow.phase == PLAN_PHASE_PLANNING
        ) {
            _uiState.update { state ->
                state.copy(
                    planWorkflow = state.planWorkflow.copy(
                        phase = PLAN_PHASE_AWAITING_USER_INPUT,
                        lastUserInputRequestId = request.requestId
                    )
                )
            }
        }
        _uiState.update { state ->
            state.copy(
                pendingServerRequests = upsertPendingServerRequest(state.pendingServerRequests, request),
                submittingServerRequestIds = state.submittingServerRequestIds - request.requestId
            )
        }
        Log.i(TAG, "Pending server request: ${request.requestKind} ${request.requestId}")
    }

    private fun buildAutoHandledServerRequestMessage(request: CodexServerRequest): String {
        val method = request.method.ifBlank { "unknown" }
        return "Codex server request auto-handled: $method"
    }

    private fun buildEmptyPlanWorkflowState(): CodexPlanWorkflowState = CodexPlanWorkflowState()

    private fun buildEmptyRuntimePanelState(visible: Boolean = false): CodexRuntimePanelState =
        CodexRuntimePanelState(visible = visible)

    private data class RuntimePanelUpdate(
        val section: String,
        val mode: String,
        val text: String,
        val warningTone: String = "",
        val warningKind: String = ""
    )

    private fun applyRuntimeNotificationUpdate(method: String, params: JSONObject?) {
        val update = buildRuntimeNotificationUpdate(method, params) ?: return
        _uiState.update { state -> applyRuntimePanelUpdate(state, update) }
    }

    private fun applyRuntimeSnapshotItem(item: JSONObject) {
        val update = buildRuntimeSnapshotUpdate(item) ?: return
        _uiState.update { state -> applyRuntimePanelUpdate(state, update) }
    }

    private fun buildRuntimePanelStateFromTurns(
        turns: JSONArray?,
        visible: Boolean
    ): CodexRuntimePanelState {
        var panel = buildEmptyRuntimePanelState(visible = visible)
        if (turns == null) {
            return panel
        }
        for (turnIndex in 0 until turns.length()) {
            val turn = turns.optJSONObject(turnIndex) ?: continue
            val items = turn.optJSONArray("items") ?: continue
            for (itemIndex in 0 until items.length()) {
                val item = items.optJSONObject(itemIndex) ?: continue
                val update = buildRuntimeSnapshotUpdate(item) ?: continue
                panel = applyRuntimePanelUpdate(panel, update)
            }
        }
        return panel
    }

    private fun buildNoticesPanelStateFromTurns(
        turns: JSONArray?,
        visible: Boolean
    ): CodexNoticesPanelState {
        var notices = CodexNoticesPanelState(visible = visible)
        if (turns == null) {
            return notices
        }
        for (turnIndex in 0 until turns.length()) {
            val turn = turns.optJSONObject(turnIndex) ?: continue
            val items = turn.optJSONArray("items") ?: continue
            for (itemIndex in 0 until items.length()) {
                val item = items.optJSONObject(itemIndex) ?: continue
                val update = buildRuntimeSnapshotUpdate(item) ?: continue
                notices = when (update.warningKind) {
                    "config" -> notices.copy(configWarningText = update.text)
                    "deprecation" -> notices.copy(deprecationNoticeText = update.text)
                    else -> notices
                }
            }
        }
        return notices
    }

    private fun applyRuntimePanelUpdate(
        state: CodexUiState,
        update: RuntimePanelUpdate
    ): CodexUiState {
        val nextRuntimePanel = applyRuntimePanelUpdate(state.runtimePanel, update)
        val nextNoticesPanel = when (update.warningKind) {
            "config" -> state.noticesPanel.copy(configWarningText = update.text)
            "deprecation" -> state.noticesPanel.copy(deprecationNoticeText = update.text)
            else -> state.noticesPanel
        }
        return state.copy(
            runtimePanel = nextRuntimePanel,
            noticesPanel = nextNoticesPanel
        )
    }

    private fun applyRuntimePanelUpdate(
        panel: CodexRuntimePanelState,
        update: RuntimePanelUpdate
    ): CodexRuntimePanelState {
        if (update.text.isEmpty()) {
            return panel
        }
        if (update.section == "warning") {
            return panel.copy(
                warning = update.text,
                warningTone = update.warningTone.ifBlank { panel.warningTone }
            )
        }
        val nextText = when (update.section) {
            "diff" -> updateRuntimeSectionText(panel.diff, update)
            "plan" -> updateRuntimeSectionText(panel.plan, update)
            "reasoning" -> updateRuntimeSectionText(panel.reasoning, update)
            else -> return panel
        }
        return when (update.section) {
            "diff" -> panel.copy(diff = nextText)
            "plan" -> panel.copy(plan = nextText)
            "reasoning" -> panel.copy(reasoning = nextText)
            else -> panel
        }
    }

    private fun updateRuntimeSectionText(existing: String, update: RuntimePanelUpdate): String {
        return if (update.mode == "append") {
            val separator = if (existing.isNotEmpty() && !existing.endsWith('\n')) "\n" else ""
            trimRuntimePanelText(existing + separator + update.text)
        } else {
            trimRuntimePanelText(update.text)
        }
    }

    private fun trimRuntimePanelText(value: String, maxLength: Int = 12_000): String {
        if (value.length <= maxLength) {
            return value
        }
        return value.takeLast(maxLength)
    }

    private fun buildRuntimeNotificationUpdate(
        method: String,
        params: JSONObject?
    ): RuntimePanelUpdate? {
        val payload = params ?: JSONObject()
        val update = when {
            method == "turn/diff/updated" -> RuntimePanelUpdate(
                section = "diff",
                mode = "replace",
                text = pickFirstText(
                    payload,
                    listOf("summary"),
                    listOf("diff"),
                    listOf("patch"),
                    listOf("text"),
                    listOf("content")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method == "turn/plan/updated" -> RuntimePanelUpdate(
                section = "plan",
                mode = "replace",
                text = pickFirstText(
                    payload,
                    listOf("summary"),
                    listOf("text"),
                    listOf("plan", "summary"),
                    listOf("plan", "text"),
                    listOf("content")
                ).ifEmpty {
                    summarizePlanValue(payload.opt("plan"))
                        .ifEmpty { summarizePlanValue(payload) }
                        .ifEmpty { normalizeLines(payload.opt("steps")) }
                        .ifEmpty { summarizeRuntimeValue(payload) }
                }
            )
            method == "item/plan/delta" -> RuntimePanelUpdate(
                section = "plan",
                mode = "append",
                text = pickFirstText(
                    payload,
                    listOf("delta"),
                    listOf("text"),
                    listOf("summary"),
                    listOf("part", "text"),
                    listOf("item", "text")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method.startsWith("item/reasoning/") -> RuntimePanelUpdate(
                section = "reasoning",
                mode = if (method.endsWith("Delta")) "append" else "replace",
                text = pickFirstText(
                    payload,
                    listOf("delta"),
                    listOf("text"),
                    listOf("summary"),
                    listOf("summaryText"),
                    listOf("part", "text"),
                    listOf("part", "summary"),
                    listOf("item", "text"),
                    listOf("item", "summary")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method == "item/fileChange/outputDelta" -> RuntimePanelUpdate(
                section = "diff",
                mode = "append",
                text = pickFirstText(
                    payload,
                    listOf("delta"),
                    listOf("output"),
                    listOf("text")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method == "item/mcpToolCall/progress" -> RuntimePanelUpdate(
                section = "plan",
                mode = "append",
                text = pickFirstText(
                    payload,
                    listOf("message"),
                    listOf("status"),
                    listOf("text"),
                    listOf("progress", "message")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method == "configWarning" -> RuntimePanelUpdate(
                section = "warning",
                mode = "replace",
                warningTone = "warn",
                warningKind = "config",
                text = pickFirstText(
                    payload,
                    listOf("message"),
                    listOf("text"),
                    listOf("detail")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            method == "deprecationNotice" -> RuntimePanelUpdate(
                section = "warning",
                mode = "replace",
                warningTone = "warn",
                warningKind = "deprecation",
                text = pickFirstText(
                    payload,
                    listOf("message"),
                    listOf("text"),
                    listOf("detail")
                ).ifEmpty { summarizeRuntimeValue(payload) }
            )
            else -> null
        }
        return update?.takeIf { it.text.isNotEmpty() }
    }

    private fun buildRuntimeSnapshotUpdate(item: JSONObject): RuntimePanelUpdate? {
        val itemType = item.optString("type", "")
        val update = when (itemType) {
            "reasoning" -> RuntimePanelUpdate(
                section = "reasoning",
                mode = "replace",
                text = pickFirstText(
                    item,
                    listOf("text"),
                    listOf("summary"),
                    listOf("content"),
                    listOf("part", "text")
                ).ifEmpty { summarizeRuntimeValue(item) }
            )
            "plan" -> RuntimePanelUpdate(
                section = "plan",
                mode = "replace",
                text = pickFirstText(
                    item,
                    listOf("text"),
                    listOf("summary")
                ).ifEmpty {
                    normalizeLines(item.opt("steps")).ifEmpty { summarizeRuntimeValue(item) }
                }
            )
            "fileChange" -> RuntimePanelUpdate(
                section = "diff",
                mode = "replace",
                text = pickFirstText(
                    item,
                    listOf("output"),
                    listOf("text"),
                    listOf("summary"),
                    listOf("patch")
                ).ifEmpty { summarizeRuntimeValue(item) }
            )
            "mcpToolCall" -> RuntimePanelUpdate(
                section = "plan",
                mode = "append",
                text = pickFirstText(
                    item,
                    listOf("message"),
                    listOf("status"),
                    listOf("text")
                ).ifEmpty { summarizeRuntimeValue(item) }
            )
            "agentMessage" -> {
                when (item.optString("phase", "").trim().lowercase()) {
                    "plan" -> RuntimePanelUpdate(
                        section = "plan",
                        mode = "replace",
                        text = pickFirstText(item, listOf("text")).ifEmpty { summarizeRuntimeValue(item) }
                    )
                    "reasoning" -> RuntimePanelUpdate(
                        section = "reasoning",
                        mode = "replace",
                        text = pickFirstText(item, listOf("text")).ifEmpty { summarizeRuntimeValue(item) }
                    )
                    else -> null
                }
            }
            else -> null
        }
        return update?.takeIf { it.text.isNotEmpty() }
    }

    private fun resolveCodexNotificationError(params: JSONObject?): String {
        val payload = params?.optJSONObject("error") ?: JSONObject()
        return pickFirstText(
            payload,
            listOf("message"),
            listOf("detail")
        ).ifEmpty {
            pickFirstText(params ?: JSONObject(), listOf("message"), listOf("code"))
        }.ifEmpty {
            "Codex runtime error"
        }
    }

    private fun pickFirstText(source: JSONObject, vararg paths: List<String>): String {
        paths.forEach { path ->
            val normalized = normalizeRuntimeText(readJsonPath(source, path))
            if (normalized.isNotEmpty()) {
                return normalized
            }
        }
        return ""
    }

    private fun readJsonPath(source: Any?, path: List<String>): Any? {
        var current: Any? = source
        path.forEach { segment ->
            val currentObject = current as? JSONObject ?: return null
            current = currentObject.opt(segment)
        }
        return current
    }

    private fun normalizeRuntimeText(value: Any?): String {
        return when (value) {
            is String -> value
            is Number -> value.toString()
            else -> ""
        }
    }

    private fun stripAnsiText(value: String): String {
        if (value.isEmpty()) {
            return value
        }
        return ANSI_ESCAPE_REGEX.replace(value, "")
    }

    private fun normalizeLines(value: Any?): String {
        return when (value) {
            is JSONArray -> {
                buildList {
                    for (index in 0 until value.length()) {
                        summarizeRuntimeValue(value.opt(index))
                            .takeIf { it.isNotEmpty() }
                            ?.let(::add)
                    }
                }.joinToString("\n")
            }
            else -> summarizeRuntimeValue(value)
        }
    }

    private fun summarizeRuntimeValue(value: Any?): String {
        return when (value) {
            is String -> value
            is Number -> value.toString()
            is JSONObject -> {
                pickFirstText(
                    value,
                    listOf("text"),
                    listOf("delta"),
                    listOf("summary"),
                    listOf("message"),
                    listOf("description"),
                    listOf("output"),
                    listOf("content"),
                    listOf("title")
                ).ifEmpty { value.toString() }
            }
            is JSONArray -> normalizeLines(value)
            else -> ""
        }
    }

    private fun summarizePlanValue(value: Any?): String {
        return when (value) {
            is JSONArray -> formatPlanSteps(value)
            is JSONObject -> {
                val directText = pickFirstText(
                    value,
                    listOf("summary"),
                    listOf("text"),
                    listOf("explanation"),
                    listOf("message"),
                    listOf("content")
                )
                val nestedPlanSteps = formatPlanSteps(value.optJSONArray("plan"))
                val nestedSteps = formatPlanSteps(value.optJSONArray("steps"))
                when {
                    nestedPlanSteps.isNotEmpty() && directText.isNotEmpty() -> "$directText\n$nestedPlanSteps"
                    nestedPlanSteps.isNotEmpty() -> nestedPlanSteps
                    nestedSteps.isNotEmpty() && directText.isNotEmpty() -> "$directText\n$nestedSteps"
                    nestedSteps.isNotEmpty() -> nestedSteps
                    else -> directText
                }
            }
            else -> ""
        }
    }

    private fun formatPlanSteps(steps: JSONArray?): String {
        if (steps == null || steps.length() == 0) {
            return ""
        }
        return buildList {
            for (index in 0 until steps.length()) {
                val entry = steps.opt(index)
                val text = if (entry is JSONObject) {
                    val stepText = pickFirstText(
                        entry,
                        listOf("step"),
                        listOf("text"),
                        listOf("summary"),
                        listOf("title")
                    )
                    val statusText = pickFirstText(
                        entry,
                        listOf("status"),
                        listOf("state")
                    )
                    when {
                        stepText.isNotEmpty() && statusText.isNotEmpty() -> "[$statusText] $stepText"
                        stepText.isNotEmpty() -> stepText
                        else -> summarizeRuntimeValue(entry)
                    }
                } else {
                    summarizeRuntimeValue(entry)
                }
                if (text.isNotEmpty()) {
                    add(text)
                }
            }
        }.joinToString("\n")
    }

    private data class RateLimitSummary(val summary: String, val tone: String)

    private data class RateLimitEntryResult(val entry: JSONObject?, val extraCount: Int)

    private fun normalizeSkillCatalog(result: Any?): List<CodexSkillEntry> {
        val source = result as? JSONObject ?: return emptyList()
        val groups = source.optJSONArray("data") ?: return emptyList()
        val seen = linkedSetOf<String>()
        val skills = mutableListOf<CodexSkillEntry>()
        for (groupIndex in 0 until groups.length()) {
            val group = groups.optJSONObject(groupIndex) ?: continue
            val entries = group.optJSONArray("skills") ?: continue
            for (entryIndex in 0 until entries.length()) {
                val entry = entries.optJSONObject(entryIndex) ?: continue
                if (!entry.optBoolean("enabled", false)) continue
                val name = entry.optStringOrNullCompat("name").orEmpty()
                if (name.isEmpty() || !seen.add(name.lowercase())) continue
                val ui = entry.optJSONObject("interface")
                skills += CodexSkillEntry(
                    name = name,
                    label = ui?.optStringOrNullCompat("displayName").orEmpty().ifBlank { name },
                    description = ui?.optStringOrNullCompat("shortDescription")
                        ?: entry.optStringOrNullCompat("description")
                        ?: "",
                    defaultPrompt = ui?.optStringOrNullCompat("defaultPrompt") ?: "",
                    scope = entry.optStringOrNullCompat("scope") ?: ""
                )
            }
        }
        return skills.sortedBy { it.label.lowercase() }
    }

    private fun applyTokenUsagePayload(payload: Any?) {
        val summary = formatTokenUsageSummary(payload)
        val contextUsage = normalizeContextUsageState(payload)
        _uiState.update { state ->
            state.copy(
                usagePanel = state.usagePanel.copy(
                    visible = if (contextUsage == null) false else state.usagePanel.visible,
                    tokenUsageSummary = summary,
                    contextUsage = contextUsage
                )
            )
        }
    }

    private fun applyRateLimitPayload(payload: Any?) {
        val next = formatRateLimitSummary(payload)
        if (next.summary.isEmpty()) {
            return
        }
        _uiState.update { state ->
            state.copy(
                usagePanel = state.usagePanel.copy(
                    rateLimitSummary = next.summary,
                    rateLimitTone = next.tone
                )
            )
        }
    }

    private fun formatTokenUsageSummary(payload: Any?): String {
        val sources = buildTokenUsageSources(payload)
        val input = pickFirstLongFromSources(
            sources,
            listOf("inputTokens"),
            listOf("input_tokens"),
            listOf("input"),
            listOf("promptTokens"),
            listOf("prompt_tokens")
        )
        val output = pickFirstLongFromSources(
            sources,
            listOf("outputTokens"),
            listOf("output_tokens"),
            listOf("output"),
            listOf("completionTokens"),
            listOf("completion_tokens")
        )
        val total = pickFirstLongFromSources(
            sources,
            listOf("totalTokens"),
            listOf("total_tokens"),
            listOf("total")
        ) ?: if (input != null || output != null) {
            (input ?: 0L) + (output ?: 0L)
        } else {
            null
        }
        val cached = pickFirstLongFromSources(
            sources,
            listOf("cachedInputTokens"),
            listOf("cached_input_tokens"),
            listOf("cacheTokens"),
            listOf("cache_tokens")
        )
        val reasoning = pickFirstLongFromSources(
            sources,
            listOf("reasoningOutputTokens"),
            listOf("reasoning_output_tokens"),
            listOf("reasoningTokens"),
            listOf("reasoning_tokens")
        )
        val parts = mutableListOf<String>()
        input?.let { parts += "${formatCompactNumber(it)} in" }
        output?.let { parts += "${formatCompactNumber(it)} out" }
        total?.let { parts += "${formatCompactNumber(it)} total" }
        if (cached != null && cached > 0) parts += "${formatCompactNumber(cached)} cached"
        if (reasoning != null && reasoning > 0) parts += "${formatCompactNumber(reasoning)} reasoning"
        return if (parts.isEmpty()) "" else "tokens ${parts.joinToString(" / ")}"
    }

    private fun normalizeContextUsageState(payload: Any?): CodexContextUsageState? {
        val sources = buildTokenUsageSources(payload)
        val modelContextWindow = pickFirstLongFromSources(
            sources,
            listOf("modelContextWindow"),
            listOf("model_context_window")
        )
        val nestedTotalTokens = pickFirstLongFromSources(
            sources,
            listOf("last", "totalTokens"),
            listOf("last", "total_tokens")
        )
        val usedTokens = pickFirstLongFromSources(
            sources,
            listOf("usedTokens"),
            listOf("used_tokens"),
            listOf("last", "totalTokens"),
            listOf("last", "total_tokens"),
            listOf("totalTokens"),
            listOf("total_tokens"),
            listOf("inputTokens"),
            listOf("input_tokens"),
            listOf("promptTokens"),
            listOf("prompt_tokens")
        )
        val maxTokens = pickFirstLongFromSources(
            sources,
            listOf("maxTokens"),
            listOf("max_tokens"),
            listOf("contextWindowTokens"),
            listOf("context_window_tokens"),
            listOf("contextWindowMaxTokens"),
            listOf("context_window_max_tokens"),
            listOf("maxContextTokens"),
            listOf("max_context_tokens")
        )
        val explicitPercent = pickFirstLongFromSources(
            sources,
            listOf("usedPercent"),
            listOf("used_percent"),
            listOf("contextUsedPercent"),
            listOf("context_used_percent"),
            listOf("usagePercent"),
            listOf("usage_percent")
        )?.toInt()
        if (
            modelContextWindow != null &&
            modelContextWindow > 0 &&
            nestedTotalTokens != null &&
            nestedTotalTokens >= 0
        ) {
            val safeUsedTokens = nestedTotalTokens.coerceAtMost(modelContextWindow)
            val usedPercent = clampPercent(
                ((safeUsedTokens.toDouble() * 100.0) / modelContextWindow.toDouble()).toInt()
            ) ?: return null
            return CodexContextUsageState(
                usedTokens = safeUsedTokens,
                contextWindow = modelContextWindow,
                usedPercent = usedPercent,
                remainingPercent = (100 - usedPercent).coerceAtLeast(0),
                inputTokens = pickFirstLongFromSources(
                    sources,
                    listOf("inputTokens"),
                    listOf("input_tokens"),
                    listOf("input"),
                    listOf("promptTokens"),
                    listOf("prompt_tokens")
                ),
                outputTokens = pickFirstLongFromSources(
                    sources,
                    listOf("outputTokens"),
                    listOf("output_tokens"),
                    listOf("output"),
                    listOf("completionTokens"),
                    listOf("completion_tokens")
                ),
                cachedInputTokens = pickFirstLongFromSources(
                    sources,
                    listOf("cachedInputTokens"),
                    listOf("cached_input_tokens"),
                    listOf("cacheTokens"),
                    listOf("cache_tokens")
                ),
                reasoningTokens = pickFirstLongFromSources(
                    sources,
                    listOf("reasoningOutputTokens"),
                    listOf("reasoning_output_tokens"),
                    listOf("reasoningTokens"),
                    listOf("reasoning_tokens")
                ),
                updatedAtMillis = System.currentTimeMillis()
            )
        }
        val usedPercent = clampPercent(
            explicitPercent ?: (
                if (usedTokens != null && maxTokens != null && maxTokens > 0) {
                    ((usedTokens.toDouble() * 100.0) / maxTokens.toDouble()).toInt()
                } else {
                    null
                }
            )
        ) ?: return null
        val normalizedUsedTokens = usedTokens?.takeIf { it >= 0 }
        val normalizedContextWindow = maxTokens?.takeIf { it > 0 }
        return CodexContextUsageState(
            usedTokens = normalizedUsedTokens,
            contextWindow = normalizedContextWindow,
            usedPercent = usedPercent,
            remainingPercent = (100 - usedPercent).coerceAtLeast(0),
            inputTokens = pickFirstLongFromSources(
                sources,
                listOf("inputTokens"),
                listOf("input_tokens"),
                listOf("input"),
                listOf("promptTokens"),
                listOf("prompt_tokens")
            ),
            outputTokens = pickFirstLongFromSources(
                sources,
                listOf("outputTokens"),
                listOf("output_tokens"),
                listOf("output"),
                listOf("completionTokens"),
                listOf("completion_tokens")
            ),
            cachedInputTokens = pickFirstLongFromSources(
                sources,
                listOf("cachedInputTokens"),
                listOf("cached_input_tokens"),
                listOf("cacheTokens"),
                listOf("cache_tokens")
            ),
            reasoningTokens = pickFirstLongFromSources(
                sources,
                listOf("reasoningOutputTokens"),
                listOf("reasoning_output_tokens"),
                listOf("reasoningTokens"),
                listOf("reasoning_tokens")
            ),
            updatedAtMillis = System.currentTimeMillis()
        )
    }

    private fun formatRateLimitSummary(payload: Any?): RateLimitSummary {
        val extracted = extractRateLimitEntry(payload)
        val sources = buildRateLimitSources(payload) + listOfNotNull(extracted.entry)
        if (sources.isEmpty()) {
            return RateLimitSummary("", "")
        }
        val message = pickFirstStringFromSources(
            sources,
            listOf("message"),
            listOf("detail"),
            listOf("error", "message")
        )
        val scope = pickFirstStringFromSources(
            sources,
            listOf("scope"),
            listOf("name"),
            listOf("type"),
            listOf("resource")
        )
        val remaining = pickFirstLongFromSources(
            sources,
            listOf("remaining"),
            listOf("remaining_requests"),
            listOf("remainingRequests"),
            listOf("limitRemaining"),
            listOf("rate_limit_remaining"),
            listOf("rateLimitRemaining")
        )
        val limit = pickFirstLongFromSources(
            sources,
            listOf("limit"),
            listOf("max"),
            listOf("rate_limit"),
            listOf("rateLimit")
        )
        val retryAfter = pickFirstLongFromSources(
            sources,
            listOf("retryAfterSeconds"),
            listOf("retry_after_seconds"),
            listOf("retryAfter"),
            listOf("retry_after")
        )
        val resetHint = formatResetHint(
            pickFirstStringFromSources(
                sources,
                listOf("resetAt"),
                listOf("resetsAt"),
                listOf("reset_at"),
                listOf("resets_at")
            ).ifBlank { null } ?: pickFirstLongFromSources(
                sources,
                listOf("resetAtEpochMs"),
                listOf("resetsInSeconds"),
                listOf("reset_at_epoch_ms"),
                listOf("resets_in_seconds")
            )
        )
        val rawStatus = pickFirstStringFromSources(
            sources,
            listOf("status"),
            listOf("state"),
            listOf("result")
        ).lowercase()
        val primaryUsedPercent = pickFirstLongFromSources(
            sources,
            listOf("primary", "usedPercent"),
            listOf("primary", "used_percent")
        )
        val secondaryUsedPercent = pickFirstLongFromSources(
            sources,
            listOf("secondary", "usedPercent"),
            listOf("secondary", "used_percent")
        )
        val primaryWindowMins = pickFirstLongFromSources(
            sources,
            listOf("primary", "windowDurationMins"),
            listOf("primary", "window_duration_mins")
        )
        val secondaryWindowMins = pickFirstLongFromSources(
            sources,
            listOf("secondary", "windowDurationMins"),
            listOf("secondary", "window_duration_mins")
        )
        val primaryResetHint = formatResetHint(
            pickFirstStringFromSources(
                sources,
                listOf("primary", "resetAt"),
                listOf("primary", "resetsAt"),
                listOf("primary", "reset_at"),
                listOf("primary", "resets_at")
            ).ifBlank { null } ?: pickFirstLongFromSources(
                sources,
                listOf("primary", "resetAtEpochMs"),
                listOf("primary", "resetsAtEpochMs"),
                listOf("primary", "resetsAt"),
                listOf("primary", "resets_at"),
                listOf("primary", "resetsInSeconds"),
                listOf("primary", "resets_in_seconds")
            )
        )
        val secondaryResetHint = formatResetHint(
            pickFirstStringFromSources(
                sources,
                listOf("secondary", "resetAt"),
                listOf("secondary", "resetsAt"),
                listOf("secondary", "reset_at"),
                listOf("secondary", "resets_at")
            ).ifBlank { null } ?: pickFirstLongFromSources(
                sources,
                listOf("secondary", "resetAtEpochMs"),
                listOf("secondary", "resetsAtEpochMs"),
                listOf("secondary", "resetsAt"),
                listOf("secondary", "resets_at"),
                listOf("secondary", "resetsInSeconds"),
                listOf("secondary", "resets_in_seconds")
            )
        )
        val parts = mutableListOf<String>()
        if (remaining != null && limit != null) {
            parts += buildString {
                if (scope.isNotEmpty()) {
                    append(scope)
                    append(':')
                }
                append(remaining.coerceAtLeast(0))
                append('/')
                append(limit.coerceAtLeast(0))
            }
        } else if (remaining != null) {
            parts += buildString {
                if (scope.isNotEmpty()) {
                    append(scope)
                    append(':')
                }
                append(remaining.coerceAtLeast(0))
            }
        } else {
            if (primaryUsedPercent != null) {
                val primary = mutableListOf<String>()
                primary += formatRateLimitWindowLabel(primaryWindowMins) ?: "p"
                primary += "${primaryUsedPercent.coerceIn(0, 100)}%"
                if (primaryResetHint.isNotEmpty()) {
                    primary += "⏱$primaryResetHint"
                }
                parts += primary.joinToString(" ")
            }
            if (secondaryUsedPercent != null) {
                val secondary = mutableListOf<String>()
                secondary += formatRateLimitWindowLabel(secondaryWindowMins) ?: "s"
                secondary += "${secondaryUsedPercent.coerceIn(0, 100)}%"
                if (secondaryResetHint.isNotEmpty()) {
                    secondary += "⏱$secondaryResetHint"
                }
                parts += secondary.joinToString(" ")
            }
        }
        if (retryAfter != null && retryAfter > 0) {
            parts += "↺${formatDurationShort(retryAfter)}"
        }
        if (resetHint.isNotEmpty()) {
            parts += "⏱$resetHint"
        }
        if (extracted.extraCount > 0) {
            parts += "+${extracted.extraCount}"
        }
        val summary = when {
            parts.isNotEmpty() -> parts.joinToString(" | ")
            message.isNotEmpty() -> message
            else -> ""
        }
        if (summary.isEmpty()) {
            return RateLimitSummary("", "")
        }
        val tone = when {
            (remaining != null && remaining <= 1L) ||
                (primaryUsedPercent != null && primaryUsedPercent >= 90L) ||
                (secondaryUsedPercent != null && secondaryUsedPercent >= 90L) ||
                (retryAfter != null && retryAfter > 0L) ||
                rawStatus.contains("exhaust") ||
                rawStatus.contains("limit") ||
                rawStatus.contains("denied") -> if (rawStatus.contains("denied")) "error" else "warn"
            else -> ""
        }
        return RateLimitSummary(summary = summary, tone = tone)
    }

    private fun buildTokenUsageSources(payload: Any?): List<JSONObject> {
        val sources = mutableListOf<JSONObject>()
        fun addObject(value: Any?) {
            if (value is JSONObject) {
                sources += value
            }
        }
        val root = payload as? JSONObject ?: return emptyList()
        addObject(root)
        addObject(root.optJSONObject("latestTokenUsageInfo"))
        addObject(root.optJSONObject("tokenUsage"))
        addObject(root.optJSONObject("tokenUsage")?.optJSONObject("latestTokenUsageInfo"))
        addObject(root.optJSONObject("usage"))
        addObject(root.optJSONObject("contextUsage"))
        addObject(root.optJSONObject("context_usage"))
        val thread = root.optJSONObject("thread")
        addObject(thread)
        addObject(thread?.optJSONObject("latestTokenUsageInfo"))
        addObject(thread?.optJSONObject("tokenUsage"))
        addObject(thread?.optJSONObject("tokenUsage")?.optJSONObject("latestTokenUsageInfo"))
        return sources
    }

    private fun buildRateLimitSources(payload: Any?): List<JSONObject> {
        val sources = mutableListOf<JSONObject>()
        fun addObject(value: Any?) {
            if (value is JSONObject) {
                sources += value
            }
        }
        val root = payload as? JSONObject ?: return emptyList()
        addObject(root)
        addObject(root.opt("rateLimit"))
        addObject(root.opt("rateLimits"))
        addObject(root.opt("ratelimits"))
        addObject(root.opt("rate_limits"))
        addObject(root.opt("account"))
        val result = root.opt("result")
        addObject(result)
        if (result is JSONObject) {
            addObject(result.opt("rateLimit"))
            addObject(result.opt("rateLimits"))
            addObject(result.opt("ratelimits"))
            addObject(result.opt("rate_limits"))
        }
        return sources
    }

    private fun extractRateLimitEntry(payload: Any?): RateLimitEntryResult {
        val root = payload as? JSONObject ?: return RateLimitEntryResult(null, 0)
        val candidates = listOf(
            payload,
            root.opt("rateLimit"),
            root.opt("rateLimits"),
            root.opt("ratelimits"),
            root.opt("rate_limits"),
            root.opt("account"),
            root.opt("result"),
            root.optJSONObject("result")?.opt("rateLimit"),
            root.optJSONObject("result")?.opt("rateLimits"),
            root.optJSONObject("result")?.opt("ratelimits"),
            root.optJSONObject("result")?.opt("rate_limits")
        )
        candidates.forEach { current ->
            when (current) {
                is JSONArray -> {
                    val entry = current.optJSONObject(0)
                    if (entry != null) {
                        return RateLimitEntryResult(entry, (current.length() - 1).coerceAtLeast(0))
                    }
                }
                is JSONObject -> {
                    val limits = current.optJSONArray("limits")
                    if (limits != null && limits.length() > 0) {
                        return RateLimitEntryResult(limits.optJSONObject(0), (limits.length() - 1).coerceAtLeast(0))
                    }
                    val items = current.optJSONArray("items")
                    if (items != null && items.length() > 0) {
                        return RateLimitEntryResult(items.optJSONObject(0), (items.length() - 1).coerceAtLeast(0))
                    }
                }
            }
        }
        val byLimitId = root.optJSONObject("rateLimitsByLimitId")
            ?: root.optJSONObject("ratelimitsbylimitid")
            ?: root.optJSONObject("result")?.optJSONObject("rateLimitsByLimitId")
            ?: root.optJSONObject("result")?.optJSONObject("ratelimitsbylimitid")
        if (byLimitId != null) {
            val names = byLimitId.keys().asSequence().toList()
            val entry = names.firstNotNullOfOrNull { key -> byLimitId.optJSONObject(key) }
            if (entry != null) {
                return RateLimitEntryResult(entry, (names.size - 1).coerceAtLeast(0))
            }
        }
        return RateLimitEntryResult(null, 0)
    }

    private fun pickFirstLongFromSources(
        sources: List<JSONObject>,
        vararg paths: List<String>
    ): Long? {
        sources.forEach { source ->
            paths.forEach { path ->
                when (val value = readJsonPath(source, path)) {
                    is Number -> return value.toLong()
                    is String -> value.trim().toLongOrNull()?.let { return it }
                }
            }
        }
        return null
    }

    private fun pickFirstStringFromSources(
        sources: List<JSONObject>,
        vararg paths: List<String>
    ): String {
        sources.forEach { source ->
            paths.forEach { path ->
                val value = readJsonPath(source, path)
                if (value is String && value.isNotBlank()) {
                    return value.trim()
                }
            }
        }
        return ""
    }

    private fun clampPercent(value: Int?): Int? {
        value ?: return null
        return value.coerceIn(0, 100)
    }

    private fun formatCompactNumber(value: Long): String {
        val absValue = kotlin.math.abs(value.toDouble())
        return when {
            absValue >= 1_000_000.0 -> {
                val divisor = value / 1_000_000.0
                if (absValue >= 10_000_000.0) String.format("%.0fm", divisor) else String.format("%.1fm", divisor)
            }
            absValue >= 1_000.0 -> {
                val divisor = value / 1_000.0
                if (absValue >= 10_000.0) String.format("%.0fk", divisor) else String.format("%.1fk", divisor)
            }
            else -> value.toString()
        }
    }

    private fun formatDurationShort(totalSeconds: Long): String {
        if (totalSeconds <= 0L) {
            return ""
        }
        return when {
            totalSeconds < 60L -> "${totalSeconds}s"
            totalSeconds < 3600L -> "${kotlin.math.round(totalSeconds / 60.0).toLong()}m"
            else -> "${kotlin.math.round(totalSeconds / 3600.0).toLong()}h"
        }
    }

    private fun formatRateLimitWindowLabel(windowMins: Long?): String? {
        windowMins ?: return null
        if (windowMins <= 0L) return null
        return formatDurationShort(windowMins * 60L)
    }

    private fun formatResetHint(value: Any?): String {
        fun formatAbsoluteResetTime(timestampMs: Long): String {
            val deltaMs = timestampMs - System.currentTimeMillis()
            val pattern = if (deltaMs >= 86_400_000L) "MM/dd HH:mm" else "HH:mm"
            return SimpleDateFormat(pattern, Locale.getDefault()).format(Date(timestampMs))
        }

        return when (value) {
            is Number -> {
                val numeric = value.toLong()
                when {
                    numeric > 0L && numeric < 10_000_000L ->
                        formatAbsoluteResetTime(System.currentTimeMillis() + numeric * 1000L)
                    numeric >= 1_000_000_000L && numeric < 1_000_000_000_000L ->
                        formatAbsoluteResetTime(numeric * 1000L)
                    numeric >= 1_000_000_000_000L ->
                        formatAbsoluteResetTime(numeric)
                    else -> ""
                }
            }

            is String -> {
                val trimmed = value.trim()
                when {
                    trimmed.isEmpty() -> ""
                    trimmed.all(Char::isDigit) -> formatResetHint(trimmed.toLongOrNull())
                    else -> {
                        val parsed = runCatching { Date.parse(trimmed) }.getOrNull()
                        if (parsed != null && parsed > 0L) {
                            formatAbsoluteResetTime(parsed)
                        } else {
                            trimmed
                        }
                    }
                }
            }

            else -> ""
        }
    }

    private fun buildInteractionState(
        state: CodexUiState,
        planMode: Boolean
    ): CodexInteractionState {
        return CodexInteractionState(
            planMode = planMode,
            activeSkill = state.interactionState?.activeSkill
        )
    }

    private fun syncInteractionState(state: CodexInteractionState) {
        connectionManager.send(CodexClientMessages.codexSetInteractionState(state))
        Log.i(TAG, "Plan mode: ${state.planMode}")
    }

    private fun closePlanMode(clearWorkflow: Boolean) {
        _uiState.update { current ->
            current.copy(
                planMode = false,
                interactionState = buildInteractionState(current, planMode = false),
                planWorkflow = if (clearWorkflow) {
                    buildEmptyPlanWorkflowState()
                } else {
                    current.planWorkflow
                }
            )
        }
        syncInteractionState(_uiState.value.interactionState ?: CodexInteractionState())
    }

    private fun applyInteractionState(planMode: Boolean) {
        _uiState.update { current ->
            current.copy(
                planMode = planMode,
                interactionState = buildInteractionState(current, planMode)
            )
        }
        syncInteractionState(_uiState.value.interactionState ?: CodexInteractionState(planMode = planMode))
    }

    private fun getPlanWorkflowDisplayText(state: CodexUiState): String {
        return state.planWorkflow.confirmedPlanText.ifBlank {
            state.planWorkflow.latestPlanText
        }
    }

    private fun startPlanWorkflow(promptText: String): CodexPlanWorkflowState {
        return CodexPlanWorkflowState(
            phase = PLAN_PHASE_PLANNING,
            originalPrompt = promptText.trim()
        )
    }

    private fun updatePlanWorkflowText(
        state: CodexUiState,
        text: String,
        preserveWhitespace: Boolean = false
    ): CodexUiState {
        val normalized = if (preserveWhitespace) text else text.trim()
        if (normalized.isBlank()) {
            return state
        }
        return state.copy(
            planWorkflow = state.planWorkflow.copy(
                latestPlanText = normalized
            )
        )
    }

    private fun finalizePlanWorkflowForConfirmation(state: CodexUiState): CodexUiState {
        val planText = getPlanWorkflowDisplayText(state).trim()
        if (planText.isBlank()) {
            return state.copy(planWorkflow = buildEmptyPlanWorkflowState())
        }
        return state.copy(
            planWorkflow = state.planWorkflow.copy(
                phase = PLAN_PHASE_READY_FOR_CONFIRMATION,
                latestPlanText = planText,
                confirmedPlanText = planText,
                lastUserInputRequestId = ""
            )
        )
    }

    private fun finalizePlanWorkflowOnTurnSettled(state: CodexUiState): CodexUiState {
        return when (state.planWorkflow.phase) {
            PLAN_PHASE_PLANNING,
            PLAN_PHASE_AWAITING_USER_INPUT -> finalizePlanWorkflowForConfirmation(state)
            PLAN_PHASE_EXECUTING_CONFIRMED_PLAN -> state.copy(
                planWorkflow = buildEmptyPlanWorkflowState()
            )
            else -> state
        }
    }

    private fun shouldTrackPlanWorkflowText(state: CodexUiState): Boolean {
        return state.planWorkflow.phase == PLAN_PHASE_PLANNING ||
            state.planWorkflow.phase == PLAN_PHASE_AWAITING_USER_INPUT
    }

    private fun buildConfirmedPlanExecutionPrompt(state: CodexUiState): String {
        val originalPrompt = state.planWorkflow.originalPrompt.ifBlank {
            "Follow the confirmed plan below."
        }
        val confirmedPlan = getPlanWorkflowDisplayText(state).trim()
        if (confirmedPlan.isBlank()) {
            return ""
        }
        return listOf(
            "Execute the confirmed plan below now.",
            "",
            "Original user goal:",
            originalPrompt,
            "",
            "Confirmed plan:",
            confirmedPlan
        ).joinToString("\n")
    }

    private fun recalculateNextTurnEffectiveConfig(state: CodexUiState): CodexUiState {
        return state.copy(
            nextTurnEffectiveCodexConfig = buildLocalNextTurnEffectiveConfig(state)
        )
    }

    private fun buildLocalNextTurnEffectiveConfig(state: CodexUiState): CodexEffectiveConfig? {
        val base = state.serverNextTurnConfigBase
        val permissionOverride = derivePermissionOverrideFromSandbox(state.nextTurnOverrides.sandbox)
        if (base != null) {
            return base.copy(
                model = state.nextTurnOverrides.model ?: base.model,
                reasoningEffort = state.nextTurnOverrides.reasoningEffort ?: base.reasoningEffort,
                approvalPolicy = permissionOverride?.approvalPolicy ?: base.approvalPolicy,
                sandboxMode = permissionOverride?.sandboxMode ?: base.sandboxMode
            )
        }
        val fallbackReasoning = state.reasoningEffort ?: state.capabilities?.defaultReasoningEffort
        val sandboxMode = permissionOverride?.sandboxMode ?: state.nextTurnOverrides.sandbox
        val approvalPolicy = permissionOverride?.approvalPolicy
        if (
            state.nextTurnOverrides.model.isNullOrBlank() &&
            fallbackReasoning.isNullOrBlank() &&
            sandboxMode.isNullOrBlank() &&
            approvalPolicy.isNullOrBlank()
        ) {
            return null
        }
        return CodexEffectiveConfig(
            model = state.nextTurnOverrides.model ?: state.model,
            reasoningEffort = state.nextTurnOverrides.reasoningEffort ?: fallbackReasoning,
            personality = null,
            approvalPolicy = approvalPolicy,
            sandboxMode = sandboxMode
        )
    }

    private fun derivePermissionOverrideFromSandbox(sandboxOverride: String?): CodexEffectiveConfig? {
        return when (sandboxOverride?.trim()) {
            "danger-full-access" -> CodexEffectiveConfig(
                model = null,
                reasoningEffort = null,
                personality = null,
                approvalPolicy = "never",
                sandboxMode = "danger-full-access"
            )
            "workspace-write" -> CodexEffectiveConfig(
                model = null,
                reasoningEffort = null,
                personality = null,
                approvalPolicy = "on-request",
                sandboxMode = "workspace-write"
            )
            "read-only" -> CodexEffectiveConfig(
                model = null,
                reasoningEffort = null,
                personality = null,
                approvalPolicy = "on-request",
                sandboxMode = "read-only"
            )
            else -> null
        }
    }

    private fun parseSnapshotMessages(snapshot: CodexThreadSnapshot): List<ChatMessage> {
        val result = mutableListOf<ChatMessage>()
        val arr = snapshot.messages
        for (i in 0 until arr.length()) {
            val msgJson = arr.optJSONObject(i) ?: continue
            val role = when (msgJson.optString("role", "")) {
                "user" -> ChatMessage.Role.USER
                "assistant" -> ChatMessage.Role.ASSISTANT
                "system" -> ChatMessage.Role.SYSTEM
                "tool" -> ChatMessage.Role.TOOL
                "error" -> ChatMessage.Role.ERROR
                else -> ChatMessage.Role.SYSTEM
            }
            val content = msgJson.optString("content", "")
            result.add(
                ChatMessage(
                    id = msgJson.optString("id", UUID.randomUUID().toString()),
                    role = role,
                    content = content,
                    timestamp = msgJson.optLong("timestamp", System.currentTimeMillis())
                )
            )
        }
        return result
    }

    private fun appendMessage(role: ChatMessage.Role, content: String) {
        _uiState.update {
            it.copy(
                messages = it.messages + ChatMessage(
                    id = UUID.randomUUID().toString(),
                    role = role,
                    content = content
                )
            )
        }
    }

    private fun upsertAssistantMessage(
        itemId: String,
        content: String,
        streaming: Boolean
    ) {
        _uiState.update { state ->
            val nextState = if (shouldTrackPlanWorkflowText(state)) {
                updatePlanWorkflowText(state, content)
            } else {
                state
            }
            val existingIndex = nextState.messages.indexOfFirst { it.id == itemId }
            if (existingIndex >= 0) {
                val updated = nextState.messages.toMutableList()
                updated[existingIndex] = updated[existingIndex].copy(
                    content = content,
                    streaming = streaming
                )
                nextState.copy(messages = updated)
            } else {
                nextState.copy(
                    messages = nextState.messages + ChatMessage(
                        id = itemId,
                        role = ChatMessage.Role.ASSISTANT,
                        content = content,
                        streaming = streaming
                    )
                )
            }
        }
    }

    private fun appendAssistantDelta(itemId: String, delta: String) {
        _uiState.update { state ->
            val nextState = if (shouldTrackPlanWorkflowText(state)) {
                updatePlanWorkflowText(
                    state = state,
                    text = getPlanWorkflowDisplayText(state) + delta,
                    preserveWhitespace = true
                )
            } else {
                state
            }
            val existingIndex = nextState.messages.indexOfFirst { it.id == itemId }
            if (existingIndex >= 0) {
                val updated = nextState.messages.toMutableList()
                val existing = updated[existingIndex]
                updated[existingIndex] = existing.copy(
                    content = existing.content + delta,
                    streaming = true
                )
                nextState.copy(messages = updated)
            } else {
                nextState.copy(
                    messages = nextState.messages + ChatMessage(
                        id = itemId,
                        role = ChatMessage.Role.ASSISTANT,
                        content = delta,
                        streaming = true
                    )
                )
            }
        }
    }

    private fun finalizeStreamingMessage() {
        val streamId = currentStreamingMessageId ?: return
        _uiState.update { state ->
            val updated = state.messages.map { message ->
                if (message.id == streamId) message.copy(streaming = false) else message
            }
            state.copy(messages = updated)
        }
        currentStreamingMessageId = null
    }

    override fun onCleared() {
        super.onCleared()
        connectionManager.shutdown()
    }
}

private fun org.json.JSONObject.optStringOrNullCompat(key: String): String? {
    if (!has(key) || isNull(key)) {
        return null
    }
    return optString(key, "").trim().takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }
}
