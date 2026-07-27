package com.termlink.app.codex

import android.content.Context
import android.os.SystemClock
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.termlink.app.R
import com.termlink.app.codex.data.*
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexMessageAttachment
import com.termlink.app.codex.domain.CodexContextUsageState
import com.termlink.app.codex.domain.CodexExecutionWatchState
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.domain.CodexNoticesPanelState
import com.termlink.app.codex.domain.CodexPendingImageAttachment
import com.termlink.app.codex.domain.CodexPlanWorkflowState
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexSkillEntry
import com.termlink.app.codex.domain.CodexSkillReference
import com.termlink.app.codex.domain.CodexThreadHistoryEntry
import com.termlink.app.codex.domain.CodexThreadRecoveryState
import com.termlink.app.codex.domain.CodexToolsPanelState
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.CodexUsagePanelState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.DebugServerRequestPreset
import com.termlink.app.codex.domain.FileMention
import com.termlink.app.codex.domain.NextTurnOverrides
import com.termlink.app.codex.domain.PERMISSION_CHOICE_ASK
import com.termlink.app.codex.domain.PERMISSION_CHOICE_AUTO_REVIEW
import com.termlink.app.codex.domain.PERMISSION_CHOICE_CUSTOM
import com.termlink.app.codex.domain.PERMISSION_CHOICE_FULL_ACCESS
import com.termlink.app.codex.domain.PERMISSION_PROFILE_CHOICE_PREFIX
import com.termlink.app.codex.network.CodexConnectionManager
import com.termlink.app.codex.network.WsEvent
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.util.PersistentDiagnosticLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

private const val PLAN_PHASE_READY_FOR_CONFIRMATION = "plan_ready_for_confirmation"
private const val PLAN_PHASE_EXECUTING_CONFIRMED_PLAN = "executing_confirmed_plan"
private const val OPERATION_DETAIL_MAX_LENGTH = 12_000
private const val OPERATION_DETAIL_TRUNCATION_MARKER = "\n\n…（详情已截断）"

internal enum class MobileSlashAction {
    SHOW_MODEL_PICKER,
    PLAN,
    FAST,
    SHOW_SKILLS,
    COMPACT,
    NEW_THREAD,
    FORK_THREAD,
    SKILL,
    MENTION,
    UNSUPPORTED
}

internal fun resolveMobileSlashAction(command: String): MobileSlashAction = when (command.trim().lowercase()) {
    "/model" -> MobileSlashAction.SHOW_MODEL_PICKER
    "/plan" -> MobileSlashAction.PLAN
    "/fast" -> MobileSlashAction.FAST
    "/skills" -> MobileSlashAction.SHOW_SKILLS
    "/compact" -> MobileSlashAction.COMPACT
    "/new" -> MobileSlashAction.NEW_THREAD
    "/fork" -> MobileSlashAction.FORK_THREAD
    "/skill" -> MobileSlashAction.SKILL
    "/mention" -> MobileSlashAction.MENTION
    else -> MobileSlashAction.UNSUPPORTED
}

internal data class ThreadReadyUiTransition(
    val currentTurnId: String?,
    val messages: List<ChatMessage>,
    val runtimePanel: CodexRuntimePanelState
)

internal data class ThreadReadMergeTransition(
    val threadId: String?,
    val currentTurnId: String?,
    val messages: List<ChatMessage>
)

internal data class CanonicalTurnRuntimeProjection(
    val status: String,
    val currentTurnId: String?,
    val source: String
)

internal enum class IpcAuthorityMode {
    IPC_AUTHORITATIVE,
    AWAITING_IPC_SURFACE,
    IPC_DESYNCED,
    IPC_OFFLINE
}

internal fun resolveIpcAuthorityMode(
    ipcOnline: Boolean,
    matchingSurfaceAvailable: Boolean,
    surfaceDesynced: Boolean,
    awaitingFreshSurface: Boolean
): IpcAuthorityMode = when {
    !ipcOnline -> IpcAuthorityMode.IPC_OFFLINE
    matchingSurfaceAvailable && surfaceDesynced -> IpcAuthorityMode.IPC_DESYNCED
    matchingSurfaceAvailable && !awaitingFreshSurface -> IpcAuthorityMode.IPC_AUTHORITATIVE
    else -> IpcAuthorityMode.AWAITING_IPC_SURFACE
}

internal fun canonicalAgentPhaseIndicatesActivity(phase: String?): Boolean {
    val normalized = phase
        ?.trim()
        ?.lowercase()
        ?.replace("_", "")
        ?.replace("-", "")
        ?.replace(" ", "")
        .orEmpty()
    return normalized in setOf("analysis", "commentary", "tool", "toolcall")
}

internal fun shouldPreserveCanonicalActivityRuntime(
    incomingStatus: String?,
    currentStatus: String?,
    matchingOwnerSurfaceAvailable: Boolean,
    activityThreadId: String?,
    targetThreadId: String?,
    millisSinceCanonicalActivity: Long,
    activityWindowMillis: Long = 30_000L
): Boolean {
    if (matchingOwnerSurfaceAvailable) return false
    if (!currentStatus.equals("running", ignoreCase = true)) return false
    val normalizedIncoming = incomingStatus
        ?.trim()
        ?.lowercase()
        ?.replace("_", "")
        ?.replace("-", "")
        ?.replace(" ", "")
        .orEmpty()
    val incomingIsTerminal = normalizedIncoming in setOf(
        "idle", "completed", "complete", "failed", "interrupted", "cancelled", "canceled"
    )
    return incomingIsTerminal &&
        normalizeCodexThreadId(activityThreadId) == normalizeCodexThreadId(targetThreadId) &&
        millisSinceCanonicalActivity in 0L..activityWindowMillis
}

internal fun projectCanonicalTurnRuntime(
    threadStatus: String? = null,
    turnStatus: String?,
    turnId: String?,
    matchingOwnerSurfaceAvailable: Boolean,
    hasActiveItem: Boolean = false,
    latestAgentPhase: String? = null,
    canonicalSnapshotChanged: Boolean = false,
    millisSinceCanonicalChange: Long = Long.MAX_VALUE,
    activityWindowMillis: Long = 30_000L
): CanonicalTurnRuntimeProjection? {
    if (matchingOwnerSurfaceAvailable) return null
    fun normalize(value: String?): String = value
        ?.trim()
        ?.lowercase()
        ?.replace("_", "")
        ?.replace("-", "")
        ?.replace(" ", "")
        .orEmpty()
    val normalizedThreadStatus = normalize(threadStatus)
    val normalizedTurnStatus = normalize(turnStatus)
    val normalizedPhase = normalize(latestAgentPhase)
    val explicitActive = normalizedThreadStatus in setOf("active", "running", "inprogress") ||
        normalizedTurnStatus in setOf("inprogress", "running", "active", "started") ||
        hasActiveItem
    if (explicitActive) {
        return CanonicalTurnRuntimeProjection(
            status = "running",
            currentTurnId = turnId?.trim()?.takeIf(String::isNotEmpty),
            source = "canonical-explicit-active"
        )
    }
    if (normalizedPhase == "finalanswer" || normalizedPhase == "final") {
        return CanonicalTurnRuntimeProjection(
            status = "idle",
            currentTurnId = null,
            source = "canonical-final-answer"
        )
    }
    if (canonicalSnapshotChanged || millisSinceCanonicalChange <= activityWindowMillis) {
        return CanonicalTurnRuntimeProjection(
            status = "running",
            currentTurnId = turnId?.trim()?.takeIf(String::isNotEmpty),
            source = "canonical-activity"
        )
    }
    val explicitTerminal = normalizedThreadStatus in setOf("idle", "completed", "complete", "failed", "interrupted") ||
        normalizedTurnStatus in setOf("completed", "complete", "failed", "interrupted", "cancelled", "canceled")
    return if (explicitTerminal) {
        CanonicalTurnRuntimeProjection(
            status = "idle",
            currentTurnId = null,
            source = "canonical-explicit-terminal"
        )
    } else {
        null
    }
}

private const val REMEMBERED_CONFIG_PREFS = "codex_task_config_overrides"

internal fun rememberedTaskConfigKey(profileId: String?, threadId: String?): String? {
    val profile = profileId?.trim()?.takeIf(String::isNotEmpty) ?: return null
    val thread = normalizeCodexThreadId(threadId) ?: return null
    return "$profile::$thread"
}

internal fun encodeRememberedNextTurnOverrides(overrides: NextTurnOverrides): String? {
    val json = JSONObject()
    overrides.model?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("model", it) }
    overrides.reasoningEffort?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("reasoningEffort", it) }
    overrides.sandbox?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("sandbox", it) }
    overrides.approvalPolicy?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("approvalPolicy", it) }
    overrides.approvalsReviewer?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("approvalsReviewer", it) }
    overrides.permissionProfile?.trim()?.takeIf(String::isNotEmpty)?.let { json.put("permissionProfile", it) }
    if (overrides.useConfigPermissions) json.put("useConfigPermissions", true)
    return json.takeIf { it.length() > 0 }?.toString()
}

internal fun decodeRememberedNextTurnOverrides(raw: String?): NextTurnOverrides {
    if (raw.isNullOrBlank()) return NextTurnOverrides()
    return runCatching {
        val json = JSONObject(raw)
        NextTurnOverrides(
            model = json.optStringOrNullCompat("model"),
            reasoningEffort = json.optStringOrNullCompat("reasoningEffort"),
            sandbox = json.optStringOrNullCompat("sandbox"),
            approvalPolicy = json.optStringOrNullCompat("approvalPolicy"),
            approvalsReviewer = json.optStringOrNullCompat("approvalsReviewer"),
            permissionProfile = json.optStringOrNullCompat("permissionProfile"),
            useConfigPermissions = json.optBoolean("useConfigPermissions", false)
        )
    }.getOrDefault(NextTurnOverrides())
}

internal fun overridesForConversationSwitch(
    currentConversationId: String?,
    targetConversationId: String?,
    currentOverrides: NextTurnOverrides,
    rememberedOverrides: NextTurnOverrides
): NextTurnOverrides {
    if (normalizeCodexThreadId(currentConversationId) == normalizeCodexThreadId(targetConversationId)) {
        return currentOverrides
    }
    val newConversationIsBeingCreated = normalizeCodexThreadId(currentConversationId) == null &&
        encodeRememberedNextTurnOverrides(rememberedOverrides) == null &&
        encodeRememberedNextTurnOverrides(currentOverrides) != null
    return if (newConversationIsBeingCreated) currentOverrides else rememberedOverrides
}

internal fun shouldBlockPlainTextFallbackForIpcConversationState(
    state: CodexUiState,
    @Suppress("UNUSED_PARAMETER") isPlanMode: Boolean,
    @Suppress("UNUSED_PARAMETER") hasAttachments: Boolean,
    @Suppress("UNUSED_PARAMETER") hasFileMentions: Boolean
): Boolean {
    val hasIpcContext = state.ipcOnline || state.ipcClientId != null || state.ipcSurfaceSnapshot != null
    return hasIpcContext &&
        !state.awaitingNewThreadIpcSurface &&
        !state.activeConversationId.isNullOrBlank()
}

internal fun applyIpcStatusToUiState(
    state: CodexUiState,
    status: CodexIpcStatus
): CodexUiState {
    return state.copy(
        ipcSupported = status.supported,
        ipcOnline = status.online,
        ipcClientId = status.clientId
    )
}

internal fun shouldUseIpcFollowerTransportState(state: CodexUiState): Boolean {
    val transportAvailable = state.ipcOnline ||
        state.ipcSurfaceSnapshot?.ownerKind.equals("termlink", ignoreCase = true)
    return transportAvailable &&
        !state.awaitingNewThreadIpcSurface &&
        state.followerModeEnabled &&
        state.followerActiveSendAllowed &&
        !state.activeConversationId.isNullOrBlank()
}

internal fun shouldUseIpcFollowerSendTransportState(state: CodexUiState): Boolean {
    val activeConversationId = normalizeCodexThreadId(state.activeConversationId) ?: return false
    val threadId = normalizeCodexThreadId(state.threadId) ?: return false
    return activeConversationId == threadId &&
        state.followerModeEnabled &&
        state.followerActiveSendAllowed &&
        activeConversationId.isNotEmpty()
}

internal fun shouldPromoteConnectionStateFromWebSocketMessage(
    connectionState: ConnectionState
): Boolean = connectionState != ConnectionState.CONNECTED

internal fun resolveCodexStateThreadId(
    serverThreadId: String?,
    activeConversationId: String?,
    currentThreadId: String?
): String? = serverThreadId ?: activeConversationId ?: currentThreadId

internal fun shouldResubscribeForCodexStateThreadChange(
    previousThreadId: String?,
    serverThreadId: String?
): Boolean = serverThreadId != null && serverThreadId != previousThreadId

internal fun applyConversationStatusChangedToUiState(
    state: CodexUiState,
    conversationId: String?,
    status: String?
): CodexUiState {
    val normalizedStatus = status?.trim().orEmpty()
    if (normalizedStatus.isEmpty()) return state
    val normalizedConversationId = conversationId?.trim().orEmpty()
    val activeConversationId = state.activeConversationId?.trim().orEmpty()
    if (normalizedConversationId.isNotEmpty() && activeConversationId.isNotEmpty() && normalizedConversationId != activeConversationId) {
        return state
    }
    return state.copy(
        activeConversationId = normalizedConversationId.ifEmpty { state.activeConversationId },
        status = normalizedStatus
    )
}

internal fun shouldRequestActiveFollowerModeEnable(mode: CodexFollowerMode): Boolean =
    mode.activeSendAllowed && !mode.enabled

internal fun chooseInitialIpcConversationForUi(
    conversations: List<CodexIpcConversationSummary>,
    threadId: String?,
    cwd: String?
): CodexIpcConversationSummary? {
    if (conversations.isEmpty()) return null
    val normalizedThreadId = threadId?.trim().orEmpty()
    if (normalizedThreadId.isNotEmpty()) {
        conversations.firstOrNull { it.conversationId == normalizedThreadId }?.let { return it }
    }

    val normalizedCwd = cwd?.trim()?.replace('\\', '/')?.trimEnd('/')?.lowercase(Locale.ROOT).orEmpty()
    if (normalizedCwd.isNotEmpty()) {
        conversations
            .filter { it.cwd?.trim()?.replace('\\', '/')?.trimEnd('/')?.lowercase(Locale.ROOT) == normalizedCwd }
            .maxByOrNull { it.updatedAt }
            ?.let { return it }
    }

    conversations.firstOrNull { it.hasActiveGoal }?.let { return it }
    return conversations.maxByOrNull { it.updatedAt }
}

internal fun selectIpcConversationForUi(
    conversations: List<CodexIpcConversationSummary>,
    activeConversationId: String?,
    threadId: String?,
    cwd: String?,
    awaitingNewThreadIpcSurface: Boolean = false
): CodexIpcConversationSummary? {
    val active = activeConversationId?.trim().orEmpty()
    val currentThread = threadId?.trim().orEmpty()
    if (awaitingNewThreadIpcSurface) {
        val awaitedThreadId = active.ifEmpty { currentThread }
        return conversations.firstOrNull { it.conversationId == awaitedThreadId }
    }
    if (active.isNotEmpty()) {
        conversations.firstOrNull { it.conversationId == active }?.let { return it }
    }
    return chooseInitialIpcConversationForUi(conversations, threadId, cwd)
}

internal fun shouldRequireExactIpcConversationSelection(
    pinnedConversationId: String?,
    activeConversationId: String?,
    threadId: String?
): Boolean {
    val pinned = pinnedConversationId?.trim().orEmpty()
    if (pinned.isEmpty()) return false
    return pinned == activeConversationId?.trim().orEmpty() ||
        pinned == threadId?.trim().orEmpty()
}

internal fun shouldAwaitIpcSurfaceAfterThreadResumeResponse(
    targetThreadId: String?,
    pendingHydrationThreadId: String?
): Boolean {
    val target = targetThreadId?.trim().orEmpty()
    return target.isNotEmpty() && target == pendingHydrationThreadId?.trim().orEmpty()
}

internal fun resolveAwaitingIpcSurfaceAfterTargetState(
    currentlyAwaiting: Boolean,
    pendingHistoryResumeThreadId: String?,
    incomingThreadId: String?
): Boolean {
    if (!currentlyAwaiting) return false
    val pending = pendingHistoryResumeThreadId?.trim().orEmpty()
    val incoming = incomingThreadId?.trim().orEmpty()
    return !(pending.isNotEmpty() && pending == incoming)
}

internal fun shouldUseCanonicalThreadReadFallback(
    threadId: String?,
    activeConversationId: String?,
    authorityMode: IpcAuthorityMode,
    millisSinceAuthorityModeEntered: Long,
    surfaceWaitGraceMillis: Long,
    ipcStatusObserved: Boolean = true
): Boolean {
    if (!ipcStatusObserved) return false
    val targetThreadId = normalizeCodexThreadId(threadId) ?: return false
    val activeId = normalizeCodexThreadId(activeConversationId)
    if (activeId != null && activeId != targetThreadId) return false
    return when (authorityMode) {
        IpcAuthorityMode.IPC_AUTHORITATIVE -> false
        IpcAuthorityMode.IPC_OFFLINE,
        IpcAuthorityMode.IPC_DESYNCED -> true
        IpcAuthorityMode.AWAITING_IPC_SURFACE ->
            millisSinceAuthorityModeEntered >= surfaceWaitGraceMillis
    }
}

internal fun matchingIpcSurfaceProtectsRuntimeFromCodexState(
    ipcOnline: Boolean,
    targetThreadId: String?,
    surface: DesktopSurfaceSnapshot?
): Boolean = ipcOnline &&
    normalizeCodexThreadId(targetThreadId) != null &&
    normalizeCodexThreadId(targetThreadId) == normalizeCodexThreadId(surface?.conversationId)

internal fun mergeCanonicalStaticMetadataIntoAuthoritativeMessages(
    authoritativeMessages: List<ChatMessage>,
    canonicalMessages: List<ChatMessage>
): List<ChatMessage> = authoritativeMessages.map { authoritative ->
    if (authoritative.role != ChatMessage.Role.USER) return@map authoritative
    val canonical = canonicalMessages.firstOrNull { candidate ->
        candidate.role == ChatMessage.Role.USER &&
            (candidate.id == authoritative.id || candidate.content.trim() == authoritative.content.trim())
    } ?: return@map authoritative
    mergeCanonicalUserMessageMetadataForUi(
        canonical = authoritative,
        local = canonical
    )
}

internal fun shouldApplyCanonicalThreadReadResponse(
    currentThreadId: String?,
    incomingThreadId: String?
): Boolean {
    val current = normalizeCodexThreadId(currentThreadId)
    val incoming = normalizeCodexThreadId(incomingThreadId)
    return current == null || incoming == null || current == incoming
}

internal fun applyIpcConversationSelectionToUiState(
    state: CodexUiState,
    selected: CodexIpcConversationSummary
): CodexUiState {
    val selectedId = selected.conversationId.trim()
    val activeId = state.activeConversationId?.trim().orEmpty()
    val switched = activeId != selectedId
    val hadIpcSurface = state.ipcSurfaceSnapshot != null
    val hasIpcPlanWorkflow = state.planWorkflow.planContent != null ||
        state.planWorkflow.canSubmitPlan ||
        state.planWorkflow.planRequestId != null ||
        state.planWorkflow.planRequestMethod != null ||
        state.planWorkflow.planQuestionId != null
    val updated = state.copy(
        threadId = selectedId,
        activeConversationId = selectedId,
        awaitingNewThreadIpcSurface = false,
        currentThreadTitle = selected.title ?: state.currentThreadTitle,
        cwd = selected.cwd ?: state.cwd,
        ipcSurfaceSnapshot = if (switched) null else state.ipcSurfaceSnapshot,
        ownerCurrentCodexConfig = if (switched) null else state.ownerCurrentCodexConfig,
        nextTurnOverrides = if (switched) NextTurnOverrides() else state.nextTurnOverrides,
        activeGoal = if (switched) null else state.activeGoal,
        messages = if (switched && hadIpcSurface) emptyList() else state.messages,
        pendingServerRequests = if (switched) {
            state.pendingServerRequests.filterNot { it.handledBy.equals("ipc_follower", ignoreCase = true) }
        } else {
            state.pendingServerRequests
        },
        submittingServerRequestIds = if (switched) emptySet() else state.submittingServerRequestIds,
        planWorkflow = if (switched && hasIpcPlanWorkflow) {
            CodexPlanWorkflowState()
        } else {
            state.planWorkflow
        }
    )
    return recalculateNextTurnEffectiveConfigForUiState(updated)
}

internal fun clearIpcConversationSelectionFromUiState(state: CodexUiState): CodexUiState {
    val hadIpcSurface = state.ipcSurfaceSnapshot != null
    val hasIpcPlanWorkflow = state.planWorkflow.planContent != null ||
        state.planWorkflow.canSubmitPlan ||
        state.planWorkflow.planRequestId != null ||
        state.planWorkflow.planRequestMethod != null ||
        state.planWorkflow.planQuestionId != null
    val updated = state.copy(
        activeConversationId = null,
        awaitingNewThreadIpcSurface = false,
        ipcSurfaceSnapshot = null,
        ownerCurrentCodexConfig = null,
        nextTurnOverrides = NextTurnOverrides(),
        activeGoal = null,
        followerModeEnabled = false,
        followerActiveSendAllowed = false,
        messages = if (hadIpcSurface) emptyList() else state.messages,
        pendingServerRequests = state.pendingServerRequests.filterNot {
            it.handledBy.equals("ipc_follower", ignoreCase = true)
        },
        submittingServerRequestIds = emptySet(),
        planWorkflow = if (hasIpcPlanWorkflow) CodexPlanWorkflowState() else state.planWorkflow
    )
    return recalculateNextTurnEffectiveConfigForUiState(updated)
}

internal fun applyDesktopSurfaceSnapshotToUiState(
    state: CodexUiState,
    snap: DesktopSurfaceSnapshot
): CodexUiState {
    val convId = snap.conversationId?.trim().orEmpty()
    val activeConversationId = state.activeConversationId?.trim().orEmpty()
    if (convId.isEmpty() || activeConversationId.isEmpty() || convId != activeConversationId) {
        return state
    }
    if (snap.desynced) {
        return state.copy(ipcSurfaceSnapshot = snap)
    }
    val confirmedOverrides = reconcileOwnerConfirmedOverrides(
        overrides = state.nextTurnOverrides,
        ownerConfig = snap.currentCodexConfig
    )
    val updated = state.copy(
        threadId = convId,
        activeConversationId = convId,
        awaitingNewThreadIpcSurface = false,
        ipcSurfaceSnapshot = snap,
        ownerCurrentCodexConfig = snap.currentCodexConfig,
        nextTurnOverrides = confirmedOverrides,
        status = snap.status,
        currentTurnId = resolveSurfaceCurrentTurnId(
            status = snap.status,
            latestTurnId = snap.latestTurnId,
            currentTurnId = state.currentTurnId
        ),
        messages = mergeSurfaceItems(
            existing = state.messages,
            surfaceItems = snap.items,
            surfaceStatus = snap.status,
            latestTurnId = snap.latestTurnId
        ),
        pendingServerRequests = mergePendingUserInput(
            mergePendingApproval(state.pendingServerRequests, snap.pendingApproval),
            snap.pendingUserInputAction
        ),
        planWorkflow = mergePlanWorkflow(state.planWorkflow, snap.pendingPlanAction),
        activeGoal = snap.activeGoal,
        currentThreadTitle = snap.title ?: state.currentThreadTitle,
        cwd = snap.cwd ?: state.cwd
    )
    return recalculateNextTurnEffectiveConfigForUiState(updated)
}

internal fun reconcileOwnerConfirmedOverrides(
    overrides: NextTurnOverrides,
    ownerConfig: CodexEffectiveConfig?
): NextTurnOverrides {
    ownerConfig ?: return overrides
    val modelConfirmed = valuesMatch(overrides.model, ownerConfig.model)
    val reasoningConfirmed = valuesMatch(overrides.reasoningEffort, ownerConfig.reasoningEffort)
    val permissionOverride = permissionConfigForSandboxOverride(overrides.sandbox)
    val hasPermissionOverride = !overrides.sandbox.isNullOrBlank() ||
        !overrides.approvalPolicy.isNullOrBlank() ||
        !overrides.approvalsReviewer.isNullOrBlank() ||
        !overrides.permissionProfile.isNullOrBlank() ||
        overrides.useConfigPermissions
    val permissionConfirmed = if (!hasPermissionOverride) {
        false
    } else if (overrides.useConfigPermissions) {
        // A null active profile does not prove that all sticky permission fields
        // were reset to config.toml, so keep this explicit mode until the user
        // chooses another permission mode or switches conversations.
        false
    } else if (!overrides.permissionProfile.isNullOrBlank()) {
        valuesMatch(overrides.permissionProfile, ownerConfig.permissionProfile) &&
            (overrides.approvalPolicy.isNullOrBlank() ||
                valuesMatch(overrides.approvalPolicy, ownerConfig.approvalPolicy)) &&
            (overrides.approvalsReviewer.isNullOrBlank() ||
                valuesMatch(overrides.approvalsReviewer, ownerConfig.approvalsReviewer))
    } else {
        val expectedSandbox = permissionOverride?.sandboxMode ?: overrides.sandbox
        val expectedApproval = overrides.approvalPolicy ?: permissionOverride?.approvalPolicy
        (expectedSandbox.isNullOrBlank() || valuesMatch(expectedSandbox, ownerConfig.sandboxMode)) &&
            (expectedApproval.isNullOrBlank() || valuesMatch(expectedApproval, ownerConfig.approvalPolicy)) &&
            (overrides.approvalsReviewer.isNullOrBlank() ||
                valuesMatch(overrides.approvalsReviewer, ownerConfig.approvalsReviewer))
    }
    return NextTurnOverrides(
        model = if (modelConfirmed) null else overrides.model,
        reasoningEffort = if (reasoningConfirmed) null else overrides.reasoningEffort,
        sandbox = if (permissionConfirmed) null else overrides.sandbox,
        approvalPolicy = if (permissionConfirmed) null else overrides.approvalPolicy,
        approvalsReviewer = if (permissionConfirmed) null else overrides.approvalsReviewer,
        permissionProfile = if (permissionConfirmed) null else overrides.permissionProfile,
        useConfigPermissions = if (permissionConfirmed) false else overrides.useConfigPermissions
    )
}

internal fun recalculateNextTurnEffectiveConfigForUiState(state: CodexUiState): CodexUiState =
    state.copy(nextTurnEffectiveCodexConfig = resolveNextTurnEffectiveCodexConfig(state))

internal fun applyModelCatalogToUiState(
    state: CodexUiState,
    catalog: List<CodexModelOption>
): CodexUiState {
    if (catalog.isEmpty()) return state
    val modelIds = catalog.filterNot(CodexModelOption::hidden).map(CodexModelOption::id)
    val allModelIds = catalog.map(CodexModelOption::id)
    val selectedModel = state.model
        ?.takeIf(allModelIds::contains)
        ?: catalog.firstOrNull { it.isDefault && !it.hidden }?.id
        ?: modelIds.firstOrNull()
        ?: state.model
        ?: allModelIds.first()
    val selectedMetadata = catalog.firstOrNull { it.id == selectedModel }
    return recalculateNextTurnEffectiveConfigForUiState(
        state.copy(
            capabilities = state.capabilities?.copy(models = modelIds),
            modelCatalog = catalog,
            model = selectedModel,
            reasoningEffort = state.reasoningEffort
                ?: selectedMetadata?.defaultReasoningEffort
        )
    )
}

internal fun nextTurnOverridesForModelSelection(
    state: CodexUiState,
    model: String?
): NextTurnOverrides {
    val normalizedModel = model?.trim()?.takeIf(String::isNotEmpty)
    val metadata = state.modelCatalog.firstOrNull { it.id == normalizedModel }
    val supportedEfforts = metadata?.supportedReasoningEfforts.orEmpty()
    val currentEffectiveEffort = state.nextTurnOverrides.reasoningEffort
        ?: state.nextTurnEffectiveCodexConfig?.reasoningEffort
        ?: state.ownerCurrentCodexConfig?.reasoningEffort
        ?: state.serverNextTurnConfigBase?.reasoningEffort
        ?: state.reasoningEffort
    val nextReasoningOverride = when {
        normalizedModel == null -> state.nextTurnOverrides.reasoningEffort
        supportedEfforts.isEmpty() -> null
        currentEffectiveEffort != null && supportedEfforts.any {
            it.equals(currentEffectiveEffort, ignoreCase = true)
        } -> state.nextTurnOverrides.reasoningEffort
        else -> metadata?.defaultReasoningEffort
            ?.takeIf { default -> supportedEfforts.any { it.equals(default, ignoreCase = true) } }
            ?: supportedEfforts.first()
    }
    return state.nextTurnOverrides.copy(
        model = normalizedModel,
        reasoningEffort = nextReasoningOverride
    )
}

internal fun nextTurnOverridesForPermissionSelection(
    state: CodexUiState,
    selection: String?
): NextTurnOverrides {
    val normalizedSelection = selection?.trim().orEmpty()
    val workspaceProfile = state.permissionProfiles
        .firstOrNull { it.allowed && it.id.equals(":workspace", ignoreCase = true) }
        ?.id
    val fullAccessProfile = state.permissionProfiles
        .firstOrNull { it.allowed && it.id.equals(":danger-full-access", ignoreCase = true) }
        ?.id
    return when {
        normalizedSelection.isEmpty() -> state.nextTurnOverrides.copy(
            sandbox = null,
            approvalPolicy = null,
            approvalsReviewer = null,
            permissionProfile = null,
            useConfigPermissions = false
        )
        normalizedSelection == "workspace-write" ||
            normalizedSelection == "read-only" ||
            normalizedSelection == "danger-full-access" -> state.nextTurnOverrides.copy(
            sandbox = normalizedSelection,
            approvalPolicy = null,
            approvalsReviewer = null,
            permissionProfile = null,
            useConfigPermissions = false
        )
        normalizedSelection == PERMISSION_CHOICE_ASK -> state.nextTurnOverrides.copy(
            sandbox = if (workspaceProfile == null) "workspace-write" else null,
            approvalPolicy = "on-request",
            approvalsReviewer = "user",
            permissionProfile = workspaceProfile,
            useConfigPermissions = false
        )
        normalizedSelection == PERMISSION_CHOICE_AUTO_REVIEW -> state.nextTurnOverrides.copy(
            sandbox = if (workspaceProfile == null) "workspace-write" else null,
            approvalPolicy = "on-request",
            approvalsReviewer = "auto_review",
            permissionProfile = workspaceProfile,
            useConfigPermissions = false
        )
        normalizedSelection == PERMISSION_CHOICE_FULL_ACCESS -> state.nextTurnOverrides.copy(
            sandbox = if (fullAccessProfile == null) "danger-full-access" else null,
            approvalPolicy = "never",
            approvalsReviewer = "user",
            permissionProfile = fullAccessProfile,
            useConfigPermissions = false
        )
        normalizedSelection == PERMISSION_CHOICE_CUSTOM -> state.nextTurnOverrides.copy(
            sandbox = null,
            approvalPolicy = null,
            approvalsReviewer = null,
            permissionProfile = null,
            useConfigPermissions = true
        )
        normalizedSelection.startsWith(PERMISSION_PROFILE_CHOICE_PREFIX) -> {
            val profileId = normalizedSelection.removePrefix(PERMISSION_PROFILE_CHOICE_PREFIX)
                .takeIf(String::isNotBlank)
            state.nextTurnOverrides.copy(
                sandbox = null,
                approvalPolicy = null,
                approvalsReviewer = null,
                permissionProfile = profileId,
                useConfigPermissions = false
            )
        }
        else -> state.nextTurnOverrides
    }
}

internal fun isOwnerConfigHydratingForUiState(state: CodexUiState): Boolean {
    val activeConversationId = state.activeConversationId?.trim().orEmpty()
    if (!state.ipcOnline || !state.followerModeEnabled || activeConversationId.isEmpty()) {
        return false
    }
    if (state.awaitingNewThreadIpcSurface) return true
    val snapshotConversationId = state.ipcSurfaceSnapshot?.conversationId?.trim()
        ?: return false
    return snapshotConversationId != activeConversationId
}

internal fun resolveNextTurnEffectiveCodexConfig(state: CodexUiState): CodexEffectiveConfig? {
    val owner = state.ownerCurrentCodexConfig
    val session = state.serverNextTurnConfigBase
    val permissionOverride = permissionConfigForSandboxOverride(state.nextTurnOverrides.sandbox)
    val selectedPermissionProfile = if (state.nextTurnOverrides.useConfigPermissions) {
        null
    } else {
        state.nextTurnOverrides.permissionProfile
            ?: owner?.permissionProfile
            ?: session?.permissionProfile
    }
    val config = CodexEffectiveConfig(
        model = state.nextTurnOverrides.model ?: owner?.model ?: session?.model ?: state.model,
        reasoningEffort = state.nextTurnOverrides.reasoningEffort
            ?: owner?.reasoningEffort
            ?: session?.reasoningEffort
            ?: state.reasoningEffort
            ?: state.capabilities?.defaultReasoningEffort,
        personality = owner?.personality ?: session?.personality,
        approvalPolicy = if (state.nextTurnOverrides.useConfigPermissions) {
            null
        } else {
            state.nextTurnOverrides.approvalPolicy
                ?: permissionOverride?.approvalPolicy
                ?: owner?.approvalPolicy
                ?: session?.approvalPolicy
        },
        sandboxMode = if (state.nextTurnOverrides.useConfigPermissions) {
            null
        } else if (!selectedPermissionProfile.isNullOrBlank()) {
            null
        } else {
            permissionOverride?.sandboxMode
                ?: state.nextTurnOverrides.sandbox
                ?: owner?.sandboxMode
                ?: session?.sandboxMode
        },
        approvalsReviewer = if (state.nextTurnOverrides.useConfigPermissions) {
            null
        } else {
            state.nextTurnOverrides.approvalsReviewer
                ?: owner?.approvalsReviewer
                ?: session?.approvalsReviewer
        },
        permissionProfile = selectedPermissionProfile,
        useConfigPermissions = state.nextTurnOverrides.useConfigPermissions
    )
    return config.takeIf(CodexEffectiveConfig::hasAnyValue)
}

internal fun prepareIpcStateForNewThread(state: CodexUiState): CodexUiState {
    val awaitingNewSurface = !state.activeConversationId.isNullOrBlank()
    if (!awaitingNewSurface) return recalculateNextTurnEffectiveConfigForUiState(state)
    return recalculateNextTurnEffectiveConfigForUiState(
        state.copy(
            activeConversationId = null,
            awaitingNewThreadIpcSurface = awaitingNewSurface,
            ipcSurfaceSnapshot = null,
            ownerCurrentCodexConfig = null,
            nextTurnOverrides = NextTurnOverrides(),
            activeGoal = null
        )
    )
}

private fun valuesMatch(expected: String?, actual: String?): Boolean =
    !expected.isNullOrBlank() && expected.trim().equals(actual?.trim(), ignoreCase = true)

private fun CodexEffectiveConfig.hasAnyValue(): Boolean =
    !model.isNullOrBlank() ||
        !reasoningEffort.isNullOrBlank() ||
        !personality.isNullOrBlank() ||
        !approvalPolicy.isNullOrBlank() ||
        !sandboxMode.isNullOrBlank() ||
        !approvalsReviewer.isNullOrBlank() ||
        !permissionProfile.isNullOrBlank() ||
        useConfigPermissions

private fun permissionConfigForSandboxOverride(sandboxOverride: String?): CodexEffectiveConfig? {
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

internal fun mergeSurfaceItems(
    existing: List<ChatMessage>,
    surfaceItems: List<SurfaceEntry>,
    surfaceStatus: String = "unknown",
    latestTurnId: String? = null
): List<ChatMessage> {
    val existingById = existing.associateBy { it.id }
    val latestAssistantKey = if (surfaceStatus.equals("running", ignoreCase = true)) {
        surfaceItems.lastOrNull { entry ->
            entry.kind == "message" &&
                entry.role != "user" &&
                (latestTurnId.isNullOrBlank() || entry.turnId == latestTurnId)
        }?.key
    } else {
        null
    }
    val projectedMessages = surfaceItems.mapNotNull { entry ->
        val key = entry.key.takeIf { it.isNotBlank() } ?: return@mapNotNull null
        val existingBatchId = entry.turnId
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let { turnId -> "command-batch:$turnId:$key" }
        val existingMessage = existingById[key]
            ?: existingBatchId?.let(existingById::get)
            ?: if (entry.kind == "message" && entry.role == "user") {
            existing.firstOrNull { candidate ->
                candidate.role == ChatMessage.Role.USER &&
                    candidate.content.trim() == entry.text.orEmpty().trim()
            }
        } else {
            null
        }
        val isOperation = entry.kind == "status" && entry.statusType == "operation"
        val role = when (entry.kind) {
            "message" -> when (entry.role) {
                "user" -> ChatMessage.Role.USER
                else -> ChatMessage.Role.ASSISTANT
            }
            "status" -> if (isOperation) ChatMessage.Role.TOOL else ChatMessage.Role.SYSTEM
            "approval_request" -> ChatMessage.Role.SYSTEM
            else -> ChatMessage.Role.ASSISTANT
        }
        val projected = ChatMessage(
            id = key,
            role = role,
            content = if (isOperation) {
                entry.detail ?: entry.text ?: ""
            } else {
                entry.text ?: ""
            },
            attachments = surfaceEntryAttachmentsForUi(entry),
            timestamp = existingMessage?.timestamp ?: System.currentTimeMillis(),
            streaming = key == latestAssistantKey,
            collapsible = isOperation,
            collapsedLabel = if (isOperation) {
                entry.label ?: entry.text ?: "操作详情"
            } else {
                ""
            },
            operationType = entry.operationType.takeIf { isOperation },
            operationStatus = entry.operationStatus.takeIf { isOperation },
            operationTurnId = entry.turnId.takeIf { isOperation },
            operationBatchSize = if (isOperation) 1 else 0
        )
        if (role == ChatMessage.Role.USER && existingMessage != null) {
            mergeCanonicalUserMessageMetadataForUi(
                canonical = projected,
                local = existingMessage
            )
        } else {
            projected
        }
    }
    val collapsibleTurnIds = if (surfaceStatus.equals("running", ignoreCase = true) ||
        surfaceStatus.equals("waiting_for_approval", ignoreCase = true) ||
        surfaceStatus.equals("waiting_for_input", ignoreCase = true)
    ) {
        val activeTurnId = latestTurnId?.trim().orEmpty()
        if (activeTurnId.isBlank()) {
            emptySet()
        } else {
            projectedMessages.mapNotNull { it.operationTurnId }
                .map(String::trim)
                .filter { it.isNotBlank() && it != activeTurnId }
                .toSet()
        }
    } else {
        null
    }
    return collapseCompletedCommandBatchesForUi(projectedMessages, collapsibleTurnIds)
}

private fun surfaceEntryAttachmentsForUi(entry: SurfaceEntry): List<CodexMessageAttachment> =
    entry.attachments.mapNotNull { attachment ->
        val target = attachment.url?.trim()?.takeIf { it.isNotBlank() }
            ?: attachment.path?.trim()?.takeIf { it.isNotBlank() }
            ?: return@mapNotNull null
        val label = target.substringBefore('?').substringBefore('#')
            .substringAfterLast('/').substringAfterLast('\\')
            .takeIf { it.isNotBlank() } ?: "图片"
        CodexMessageAttachment(
            kind = attachment.type.ifBlank { "image" },
            label = label,
            path = attachment.path,
            url = attachment.url,
            source = "surface"
        )
    }

internal fun collapseCompletedCommandBatchesForUi(
    messages: List<ChatMessage>,
    collapsibleTurnIds: Set<String>? = null
): List<ChatMessage> {
    if (messages.size < 2) return messages
    val result = mutableListOf<ChatMessage>()
    var index = 0
    while (index < messages.size) {
        val first = messages[index]
        val turnId = first.operationTurnId?.trim().orEmpty()
        if (first.operationType != "command" || turnId.isBlank()) {
            result += first
            index += 1
            continue
        }

        var endExclusive = index + 1
        while (endExclusive < messages.size) {
            val candidate = messages[endExclusive]
            if (
                candidate.operationType != "command" ||
                candidate.operationTurnId?.trim() != turnId
            ) {
                break
            }
            endExclusive += 1
        }
        val batch = messages.subList(index, endExclusive)
        val shouldCollapse = batch.size >= 2 &&
            (collapsibleTurnIds == null || turnId in collapsibleTurnIds) &&
            batch.all { message ->
            isTerminalCommandOperationStatus(message.operationStatus)
        }
        if (!shouldCollapse) {
            result.addAll(batch)
            index = endExclusive
            continue
        }

        val content = batch
            .map { it.content.trim() }
            .filter { it.isNotBlank() }
            .joinToString("\n\n")
        result += first.copy(
            id = "command-batch:$turnId:${first.id}",
            content = content,
            streaming = false,
            operationStatus = "completed",
            operationBatchSize = batch.size
        )
        index = endExclusive
    }
    return result
}

private fun isTerminalCommandOperationStatus(status: String?): Boolean {
    return status?.trim()?.lowercase() in setOf(
        "completed",
        "complete",
        "done",
        "finished",
        "succeeded",
        "success",
        "failed",
        "error",
        "cancelled",
        "canceled",
        "interrupted"
    )
}

internal fun resolveSurfaceCurrentTurnId(
    status: String?,
    latestTurnId: String?,
    currentTurnId: String?
): String? {
    val normalized = status?.trim()?.lowercase().orEmpty()
    return when (normalized) {
        "running", "waiting_for_approval", "waiting_for_input" ->
            normalizeCodexThreadId(latestTurnId) ?: currentTurnId
        "completed", "done", "finished", "failed", "error", "cancelled", "canceled", "interrupted", "idle" -> null
        else -> currentTurnId
    }
}

internal fun canonicalOperationMessageForUi(
    item: JSONObject,
    turnId: String?,
    itemIndex: Int
): ChatMessage? {
    val type = item.optString("type", "")
    val operationType = when (type) {
        "commandExecution" -> "command"
        "fileChange" -> "file_change"
        "mcpToolCall" -> "mcp_tool"
        else -> return null
    }
    val status = item.optStringOrNullCompat("status")
    if (status.equals("pending_approval", ignoreCase = true) ||
        status.equals("awaiting_approval", ignoreCase = true)) {
        return null
    }
    val itemId = item.optStringOrNullCompat("id") ?: itemIndex.toString()
    val (label, detail) = when (operationType) {
        "command" -> buildCanonicalCommandOperation(item, status)
        "file_change" -> buildCanonicalFileOperation(item, status)
        else -> buildCanonicalMcpOperation(item, status)
    }
    return ChatMessage(
        id = "canonical-operation:${turnId.orEmpty()}:$operationType:$itemId",
        role = ChatMessage.Role.TOOL,
        content = truncateCanonicalOperationDetail(detail),
        collapsible = true,
        collapsedLabel = label,
        operationType = operationType,
        operationStatus = status,
        operationTurnId = turnId,
        operationBatchSize = 1
    )
}

internal fun canonicalImageViewMessageForUi(
    item: JSONObject,
    turnId: String?,
    itemIndex: Int
): ChatMessage? {
    val target = item.optStringOrNullCompat("path")?.trim()
        ?.takeIf { it.isNotBlank() }
        ?: item.optStringOrNullCompat("url")?.trim()?.takeIf { it.isNotBlank() }
        ?: return null
    val label = target.substringBefore('?').substringBefore('#')
        .substringAfterLast('/').substringAfterLast('\\')
        .takeIf { it.isNotBlank() } ?: "图片"
    return ChatMessage(
        id = "canonical-image:${turnId.orEmpty()}:$itemIndex",
        role = ChatMessage.Role.SYSTEM,
        content = "已查看图片",
        attachments = listOf(
            CodexMessageAttachment(
                kind = "image",
                label = label,
                path = item.optStringOrNullCompat("path"),
                url = item.optStringOrNullCompat("url"),
                source = "canonical"
            )
        )
    )
}

private fun buildCanonicalCommandOperation(item: JSONObject, status: String?): Pair<String, String> {
    val command = item.optStringOrNullCompat("command").orEmpty()
    val label = operationLabelForStatus("命令", status)
    val lines = mutableListOf<String>()
    if (command.isNotEmpty()) lines.add("$ $command")
    appendCanonicalDetail(lines, "工作目录", item.opt("cwd"))
    appendCanonicalDetail(lines, "提示", item.opt("prompt"))
    appendCanonicalBlock(lines, "输出", item.opt("output"))
    appendCanonicalBlock(lines, "聚合输出", item.opt("aggregatedOutput"))
    val result = item.optJSONObject("result")
    appendCanonicalBlock(lines, "标准输出", result?.opt("stdout"))
    appendCanonicalBlock(lines, "标准错误", result?.opt("stderr") ?: item.opt("stderr"))
    appendCanonicalBlock(lines, "结果", result?.opt("output") ?: result?.opt("result"))
    appendCanonicalDetail(lines, "退出码", item.opt("exitCode") ?: result?.opt("exitCode"))
    appendCanonicalDetail(lines, "状态", status)
    return label to (lines.joinToString("\n\n").ifBlank { label })
}

private fun buildCanonicalFileOperation(item: JSONObject, status: String?): Pair<String, String> {
    val label = operationLabelForStatus("文件变更", status)
    val lines = mutableListOf<String>()
    val changes = item.optJSONArray("changes")
    if (changes != null) {
        for (index in 0 until changes.length()) {
            val change = changes.optJSONObject(index) ?: continue
            val path = change.optStringOrNullCompat("path").orEmpty()
            val kind = change.optStringOrNullCompat("type")
                ?: change.optStringOrNullCompat("changeType")
                ?: change.optStringOrNullCompat("kind")
            if (path.isNotEmpty()) lines.add(if (kind.isNullOrBlank()) path else "$kind: $path")
        }
    }
    appendCanonicalDetail(lines, "摘要", item.opt("summary"))
    appendCanonicalBlock(lines, "补丁", item.opt("patch"))
    appendCanonicalBlock(lines, "输出", item.opt("output"))
    appendCanonicalBlock(lines, "内容", item.opt("text"))
    appendCanonicalDetail(lines, "状态", status)
    return label to (lines.joinToString("\n\n").ifBlank { label })
}

private fun buildCanonicalMcpOperation(item: JSONObject, status: String?): Pair<String, String> {
    val label = operationLabelForStatus("工具调用", status)
    val lines = mutableListOf<String>()
    val server = item.optStringOrNullCompat("server")
        ?: item.optStringOrNullCompat("serverName")
    val tool = item.optStringOrNullCompat("name")
        ?: item.optStringOrNullCompat("toolName")
    appendCanonicalDetail(lines, "服务", server)
    appendCanonicalDetail(lines, "工具", tool)
    appendCanonicalBlock(
        lines,
        "参数",
        item.opt("arguments").takeUnless { it == null || it == JSONObject.NULL }
            ?: item.opt("args").takeUnless { it == null || it == JSONObject.NULL }
            ?: item.opt("input").takeUnless { it == null || it == JSONObject.NULL }
            ?: item.opt("toolParams").takeUnless { it == null || it == JSONObject.NULL }
            ?: item.opt("tool_params")
    )
    appendCanonicalBlock(lines, "输出", item.opt("output"))
    appendCanonicalBlock(lines, "结果", item.opt("result"))
    appendCanonicalBlock(lines, "错误", item.opt("error"))
    appendCanonicalDetail(lines, "状态", status)
    return label to (lines.joinToString("\n\n").ifBlank { label })
}

private fun operationLabelForStatus(subject: String, status: String?): String = when {
    status.equals("failed", ignoreCase = true) || status.equals("error", ignoreCase = true) -> "$subject 失败"
    status.equals("in_progress", ignoreCase = true) ||
        status.equals("inProgress", ignoreCase = true) ||
        status.equals("running", ignoreCase = true) -> "${subject}进行中"
    else -> subject
}

private fun appendCanonicalDetail(lines: MutableList<String>, label: String, value: Any?) {
    renderCanonicalOperationValue(value)?.let { lines.add("$label：$it") }
}

private fun appendCanonicalBlock(lines: MutableList<String>, label: String, value: Any?) {
    renderCanonicalOperationValue(value)?.let { lines.add("$label：\n$it") }
}

private fun renderCanonicalOperationValue(value: Any?): String? = when (value) {
    null, JSONObject.NULL -> null
    is String -> value.takeIf { it.isNotEmpty() }
    is Number, is Boolean -> value.toString()
    is JSONObject -> value.toString(2)
    is JSONArray -> value.toString(2)
    else -> null
}

private fun truncateCanonicalOperationDetail(value: String): String =
    if (value.length <= OPERATION_DETAIL_MAX_LENGTH) {
        value
    } else {
        value.take(OPERATION_DETAIL_MAX_LENGTH - OPERATION_DETAIL_TRUNCATION_MARKER.length) +
            OPERATION_DETAIL_TRUNCATION_MARKER
    }

internal fun shouldTrackExecutionWatchForUiState(
    state: CodexUiState,
    ipcStatusObserved: Boolean = true
): Boolean {
    if (state.errorMessage != null || state.connectionState == ConnectionState.ERROR) {
        return false
    }
    return ipcStatusObserved && !state.ipcOnline && !state.currentTurnId.isNullOrBlank()
}

internal fun mergePendingApproval(
    existing: List<CodexServerRequest>,
    pending: PendingApprovalInfo?
): List<CodexServerRequest> {
    val withoutStaleIpcApprovals = existing.filterNot { it.isIpcFollowerApprovalRequest() }
    if (pending == null) return withoutStaleIpcApprovals
    val reqId = pending.requestId ?: return withoutStaleIpcApprovals
    return withoutStaleIpcApprovals + CodexServerRequest(
        requestId = reqId,
        method = pending.method ?: "item/commandExecution/requestApproval",
        requestKind = pending.requestKind ?: pending.kind,
        responseMode = pending.responseMode ?: "decision",
        handledBy = "ipc_follower",
        summary = pending.description ?: pending.title ?: "等待审批",
        questionCount = 1,
        command = pending.command,
        questions = emptyList(),
        params = JSONObject().apply {
            put("availableDecisions", JSONArray().apply {
                pending.availableDecisions.forEach { put(it) }
            })
        },
        defaultResult = null
    )
}

private fun CodexServerRequest.isIpcFollowerApprovalRequest(): Boolean {
    if (!handledBy.equals("ipc_follower", ignoreCase = true)) return false
    if (!responseMode.equals("decision", ignoreCase = true)) return false
    return requestKind in setOf("approval", "command", "file", "patch", "permissions")
}

internal fun resolveIpcFollowerApprovalDecision(
    request: CodexServerRequest,
    approved: Boolean
): String {
    val decisions = request.params
        ?.optJSONArray("availableDecisions")
        ?.let { array ->
            (0 until array.length())
                .mapNotNull { index -> array.optString(index, "").trim().takeIf { it.isNotEmpty() } }
        }
        .orEmpty()
    if (!approved) {
        return when {
            "decline" in decisions -> "decline"
            "reject" in decisions -> "reject"
            "cancel" in decisions -> "cancel"
            else -> "decline"
        }
    }
    return when {
        decisions.isEmpty() -> "accept"
        "accept" in decisions -> "accept"
        "acceptForSession" in decisions -> "acceptForSession"
        "acceptWithExecpolicyAmendment" in decisions -> "acceptWithExecpolicyAmendment"
        else -> decisions.first()
    }
}

internal fun buildDirectApprovalDecisionResult(
    request: CodexServerRequest,
    approved: Boolean
): JSONObject? {
    if (!request.responseMode.equals("decision", ignoreCase = true)) {
        return null
    }
    if (request.method == "item/permissions/requestApproval") {
        val requestedPermissions = request.params?.optJSONObject("permissions")
        val permissions = if (approved && requestedPermissions != null) {
            JSONObject(requestedPermissions.toString())
        } else {
            JSONObject()
        }
        return JSONObject()
            .put("permissions", permissions)
            .put("scope", "turn")
    }
    val decision = when (request.method) {
        "item/commandExecution/requestApproval" -> if (approved) "accept" else "decline"
        "item/fileChange/requestApproval" -> if (approved) "approve" else "decline"
        "applyPatchApproval", "execCommandApproval" -> if (approved) "approved" else "denied"
        else -> return null
    }
    return JSONObject().put("decision", decision)
}

internal fun mergePendingUserInput(
    existing: List<CodexServerRequest>,
    pending: CodexServerRequest?
): List<CodexServerRequest> {
    // The IPC surface contains the authoritative *single* user-input request.
    // Once the owner has accepted an answer it is omitted from the next
    // snapshot. Do not retain the old follower request (and its submitting
    // dialog) while preserving unrelated canonical/client requests.
    val withoutStaleIpcUserInputs = existing.filterNot { it.isIpcFollowerUserInputRequest() }
    if (pending == null) return withoutStaleIpcUserInputs
    return withoutStaleIpcUserInputs + pending.copy(handledBy = "ipc_follower")
}

private fun CodexServerRequest.isIpcFollowerUserInputRequest(): Boolean =
    handledBy.equals("ipc_follower", ignoreCase = true) &&
        responseMode.equals("answers", ignoreCase = true)

internal fun upsertPendingServerRequest(
    current: List<CodexServerRequest>,
    request: CodexServerRequest
): List<CodexServerRequest> {
    val existingIndex = current.indexOfFirst { it.requestId == request.requestId }
    if (existingIndex == -1) {
        return current + request
    }
    return current.toMutableList().also { it[existingIndex] = request }
}

internal fun mergePlanWorkflow(
    current: CodexPlanWorkflowState,
    action: PendingPlanActionInfo?
): CodexPlanWorkflowState {
    if (action == null) return clearStaleIpcPlanWorkflow(current)
    val nextPlanContent = action.planContent ?: current.planContent
    val isAwaitingOwnerSnapshot = current.phase == PLAN_PHASE_EXECUTING_CONFIRMED_PLAN &&
        current.planRequestId != null &&
        current.planRequestId == action.requestId
    return current.copy(
        phase = if (isAwaitingOwnerSnapshot) {
            PLAN_PHASE_EXECUTING_CONFIRMED_PLAN
        } else if (action.canSubmit && !nextPlanContent.isNullOrBlank()) {
            PLAN_PHASE_READY_FOR_CONFIRMATION
        } else {
            current.phase
        },
        planContent = nextPlanContent,
        latestPlanText = nextPlanContent ?: current.latestPlanText,
        confirmedPlanText = if (action.canSubmit && !nextPlanContent.isNullOrBlank()) {
            nextPlanContent
        } else {
            current.confirmedPlanText
        },
        canSubmitPlan = action.canSubmit,
        planRequestId = action.requestId ?: current.planRequestId,
        planRequestMethod = action.requestMethod ?: current.planRequestMethod,
        planQuestionId = action.questionId ?: current.planQuestionId
    )
}

internal fun clearStaleIpcPlanWorkflow(current: CodexPlanWorkflowState): CodexPlanWorkflowState {
    val hasIpcPlanState = current.planContent != null ||
        current.canSubmitPlan ||
        current.planRequestId != null ||
        current.planRequestMethod != null ||
        current.planQuestionId != null
    return if (hasIpcPlanState) CodexPlanWorkflowState() else current
}

internal fun normalizeCodexThreadId(threadId: String?): String? {
    val normalized = threadId?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return when {
        normalized.equals("null", ignoreCase = true) -> null
        normalized.equals("undefined", ignoreCase = true) -> null
        else -> normalized
    }
}

internal fun shouldPreserveCodexTailMessage(message: ChatMessage): Boolean {
    if (message.role == ChatMessage.Role.USER) {
        return message.content.isNotBlank() ||
            message.fileMentions.isNotEmpty() ||
            message.skills.isNotEmpty() ||
            message.attachments.isNotEmpty()
    }
    return message.content.isNotBlank() || message.streaming
}

internal fun shouldPreserveLocalMessageTailForUi(
    threadId: String?,
    state: CodexUiState,
    allowThreadIdSwitch: Boolean = false
): Boolean {
    val normalizedStateThreadId = normalizeCodexThreadId(state.threadId)
    val normalizedIncomingThreadId = normalizeCodexThreadId(threadId)
    val sameThread = normalizedStateThreadId == null ||
        normalizedIncomingThreadId == null ||
        normalizedStateThreadId == normalizedIncomingThreadId
    val knownThreadSwitch = allowThreadIdSwitch &&
        normalizedStateThreadId != null &&
        normalizedIncomingThreadId != null &&
        normalizedStateThreadId != normalizedIncomingThreadId
    if (!sameThread && !knownThreadSwitch) {
        return false
    }
    if (!state.currentTurnId.isNullOrBlank()) {
        return true
    }
    val tail = state.messages.lastOrNull() ?: return false
    return tail.role == ChatMessage.Role.USER && shouldPreserveCodexTailMessage(tail)
}

internal fun buildThreadReadyUiTransition(
    readyThreadId: String?,
    resumed: Boolean,
    state: CodexUiState,
    allowThreadIdSwitch: Boolean = false
): ThreadReadyUiTransition {
    val preserveLocalTail = shouldPreserveLocalMessageTailForUi(
        threadId = readyThreadId,
        state = state,
        allowThreadIdSwitch = allowThreadIdSwitch
    )
    val keepOptimisticMessages = resumed || preserveLocalTail
    return ThreadReadyUiTransition(
        currentTurnId = if (preserveLocalTail) state.currentTurnId else null,
        messages = if (keepOptimisticMessages) state.messages else emptyList(),
        runtimePanel = if (keepOptimisticMessages) {
            state.runtimePanel
        } else {
            CodexRuntimePanelState(visible = state.runtimePanel.visible)
        }
    )
}

internal fun buildThreadStartedUiTransition(
    startedThreadId: String?,
    state: CodexUiState,
    allowThreadIdSwitch: Boolean = false
): ThreadReadyUiTransition {
    return buildThreadReadyUiTransition(
        readyThreadId = startedThreadId,
        resumed = false,
        state = state,
        allowThreadIdSwitch = allowThreadIdSwitch
    )
}

internal fun mergeCanonicalUserMessageMetadataForUi(
    canonical: ChatMessage,
    local: ChatMessage
): ChatMessage {
    if (canonical.role != ChatMessage.Role.USER || local.role != ChatMessage.Role.USER) {
        return canonical
    }
    val mergedMentions = (canonical.fileMentions + local.fileMentions)
        .distinctBy { mention -> mention.path.trim().lowercase() }
    val mergedSkills = (canonical.skills + local.skills)
        .distinctBy { skill ->
            "${skill.name.trim().lowercase()}::${skill.path.orEmpty().trim().lowercase()}"
        }
    val mergedAttachments = (canonical.attachments + local.attachments)
        .distinctBy { attachment ->
            attachment.dedupeKey
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
                ?.lowercase()
                ?: listOf(
                    attachment.kind.trim().lowercase(),
                    attachment.source.orEmpty().trim().lowercase(),
                    attachment.path.orEmpty().trim().lowercase(),
                    attachment.url.orEmpty().trim().lowercase(),
                    attachment.label.trim().lowercase()
                ).joinToString("::")
        }
    return canonical.copy(
        activeSkill = canonical.activeSkill ?: local.activeSkill ?: mergedSkills.firstOrNull()?.name,
        fileMentions = mergedMentions,
        skills = mergedSkills,
        attachments = mergedAttachments
    )
}

internal fun messageConvergenceKeyForUi(message: ChatMessage): String = buildString {
    append(message.role.name)
    append('|')
    append(message.contentType)
    append('|')
    append(message.toolName.orEmpty())
    append('|')
    append(message.collapsible)
    append('|')
    append(message.collapsedLabel.trim())
    append('|')
    append(message.operationType.orEmpty())
    append('|')
    append(message.operationStatus.orEmpty())
    append('|')
    append(message.operationTurnId.orEmpty())
    append('|')
    append(message.operationBatchSize)
    append('|')
    append(message.activeSkill.orEmpty())
    append('|')
    append(message.skills.joinToString(separator = "\u001F") { skill ->
        "${skill.name.trim()}::${skill.path.orEmpty().trim()}"
    })
    append('|')
    append(message.content.trim())
    append('|')
    append(message.fileMentions.joinToString(separator = "\u001F") { mention ->
        mention.path.trim()
    })
}

internal fun messagesEquivalentForConvergenceForUi(
    left: ChatMessage,
    right: ChatMessage
): Boolean = messageConvergenceKeyForUi(left) == messageConvergenceKeyForUi(right)

internal fun mergeCanonicalMessagesForUi(
    canonicalMessages: List<ChatMessage>,
    currentMessages: List<ChatMessage>,
    preserveLocalTail: Boolean
): List<ChatMessage> {
    if (!preserveLocalTail) {
        return canonicalMessages
    }
    if (currentMessages.isEmpty()) {
        return canonicalMessages
    }
    if (canonicalMessages.isEmpty()) {
        return currentMessages.filter(::shouldPreserveCodexTailMessage)
    }
    var searchStart = 0
    var lastMatchedCurrentIndex = -1
    val mergedCanonical = canonicalMessages.map { canonicalMessage ->
        var mergedMessage = canonicalMessage
        for (index in searchStart until currentMessages.size) {
            if (messagesEquivalentForConvergenceForUi(currentMessages[index], canonicalMessage)) {
                lastMatchedCurrentIndex = index
                searchStart = index + 1
                mergedMessage = mergeCanonicalUserMessageMetadataForUi(
                    canonical = canonicalMessage,
                    local = currentMessages[index]
                )
                break
            }
        }
        mergedMessage
    }
    val localTail = currentMessages
        .subList((lastMatchedCurrentIndex + 1).coerceAtMost(currentMessages.size), currentMessages.size)
        .filter(::shouldPreserveCodexTailMessage)
    if (localTail.isEmpty()) {
        return mergedCanonical
    }
    val merged = mergedCanonical.toMutableList()
    localTail.forEach { message ->
        if (merged.none { existing -> messagesEquivalentForConvergenceForUi(existing, message) }) {
            merged.add(message)
        }
    }
    return merged
}

internal fun buildThreadReadMergeTransition(
    incomingThreadId: String?,
    canonicalMessages: List<ChatMessage>,
    state: CodexUiState,
    allowThreadIdSwitch: Boolean = false
): ThreadReadMergeTransition {
    val resolvedThreadId = normalizeCodexThreadId(incomingThreadId) ?: state.threadId
    val preserveLocalTail = shouldPreserveLocalMessageTailForUi(
        threadId = resolvedThreadId,
        state = state,
        allowThreadIdSwitch = allowThreadIdSwitch
    )
    return ThreadReadMergeTransition(
        threadId = resolvedThreadId,
        currentTurnId = state.currentTurnId,
        messages = mergeCanonicalMessagesForUi(
            canonicalMessages = canonicalMessages,
            currentMessages = state.messages,
            preserveLocalTail = preserveLocalTail
        )
    )
}

internal fun resolveLaunchHydrateThreadRequest(
    pendingLaunchHydrate: Boolean,
    requestedThreadId: String?,
    observedThreadId: String?,
    inFlightThreadId: String?
): String? {
    if (!pendingLaunchHydrate) {
        return null
    }
    val targetThreadId = normalizeCodexThreadId(requestedThreadId)
        ?: normalizeCodexThreadId(observedThreadId)
        ?: return null
    return if (normalizeCodexThreadId(inFlightThreadId) == targetThreadId) {
        null
    } else {
        targetThreadId
    }
}

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
        private const val IPC_SURFACE_WAIT_GRACE_MILLIS = 5_000L
        private const val IPC_RECOVERY_TICK_MILLIS = 1_000L
        private const val IPC_RECOVERY_READ_INTERVAL_MILLIS = 10_000L
        private const val IPC_RECOVERY_RESUBSCRIBE_MILLIS = 10_000L
        private const val CANONICAL_ACTIVITY_WINDOW_MILLIS = 30_000L
        private val ANSI_ESCAPE_REGEX = Regex("\\u001B\\[[;\\d?]*[ -/]*[@-~]")
    }

    private val appContext = appContext.applicationContext
    private val connectionManager = CodexConnectionManager(viewModelScope, credentialStore, this.appContext)
    private val rememberedTaskConfig = this.appContext.getSharedPreferences(
        REMEMBERED_CONFIG_PREFS,
        Context.MODE_PRIVATE
    )

    private val _uiState = MutableStateFlow(CodexUiState())
    val uiState: StateFlow<CodexUiState> = _uiState.asStateFlow()

    private var currentStreamingMessageId: String? = null
    private var currentPlanStreamingMessageId: String? = null
    private val executionFeedbackSeen = mutableSetOf<String>()
    private var currentProfile: ServerProfile? = null
    private var mentionSearchGeneration: Long = 0L
    private var legacyModelListFallbackRequested: Boolean = false
    /** Tracks whether the current thread had a plan-mode turn.
     *  The Codex API persists plan mode per-thread, so a subsequent
     *  non-plan turn on the same thread still produces plan output.
     *  When this flag is true and the next turn is non-plan,
     *  we force a new thread to avoid thread-level plan contamination. */
    private var threadHadPlanTurn = false
    private var pendingOptimisticNewThreadSourceThreadId: String? = null
    private var pendingThreadResyncThreadId: String? = null
    private var threadResyncInFlightThreadId: String? = null
    private var launchHydratePending: Boolean = false
    private var launchHydrateTargetThreadId: String? = null
    private var launchHydrateInFlightThreadId: String? = null
    private var pinnedIpcConversationId: String? = null
    private var pendingHistoryResumeHydrationThreadId: String? = null
    private var foregroundFollowJob: Job? = null
    private var foregroundRecoveryReadInFlightThreadId: String? = null
    private var foregroundHostVisible: Boolean = false
    private var ipcStatusObserved: Boolean = false
    private var awaitingFreshIpcSurface: Boolean = false
    private var matchingIpcSurfaceDesynced: Boolean = false
    private var ipcAuthorityModeEnteredAtElapsed: Long = 0L
    private var lastRecoveryReadAtElapsed: Long = 0L
    private var lastRecoverySubscribeAtElapsed: Long = 0L
    private var canonicalActivityThreadId: String? = null
    private var canonicalLatestTurnFingerprint: Int? = null
    private var lastCanonicalActivityAtElapsed: Long = 0L

    init {
        observeConnectionState()
        observeWsEvents()
    }

    // ── Public actions ────────────────────────────────────────────────

    fun connect(profile: ServerProfile, params: CodexLaunchParams) {
        currentProfile = profile
        currentStreamingMessageId = null
        currentPlanStreamingMessageId = null
        executionFeedbackSeen.clear()
        threadHadPlanTurn = false
        clearPendingOptimisticNewThreadTransition()
        clearPendingThreadResync()
        launchHydratePending = true
        launchHydrateTargetThreadId = normalizeThreadId(params.threadId)
        launchHydrateInFlightThreadId = null
        val launchConversationId = normalizeThreadId(params.threadId)
        val rememberedOverrides = loadRememberedTaskOverrides(launchConversationId, reason = "connect")
        pinnedIpcConversationId = launchConversationId
        pendingHistoryResumeHydrationThreadId = null
        ipcStatusObserved = false
        awaitingFreshIpcSurface = false
        matchingIpcSurfaceDesynced = false
        ipcAuthorityModeEnteredAtElapsed = 0L
        lastRecoveryReadAtElapsed = 0L
        lastRecoverySubscribeAtElapsed = 0L
        canonicalActivityThreadId = null
        canonicalLatestTurnFingerprint = null
        lastCanonicalActivityAtElapsed = 0L
        foregroundRecoveryReadInFlightThreadId = null
        val previousActiveConvId = _uiState.value.activeConversationId?.trim().orEmpty()
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.connect.started",
            mapOf(
                "sessionId" to params.sessionId,
                "threadIdPresent" to !launchConversationId.isNullOrBlank(),
                "launchSource" to params.launchSource,
                "previousActiveConversationPresent" to previousActiveConvId.isNotBlank(),
                "profileId" to profile.id
            )
        )
        Log.i(TAG, "[ipc][connect] starting connection: " +
            "launchConversationId=${launchConversationId.orEmpty()} " +
            "launchThreadId=${params.threadId.orEmpty()} " +
            "launchSource=${params.launchSource} " +
            "previousActiveConversationId=$previousActiveConvId " +
            "sessionId=${params.sessionId} " +
            "profileId=${profile.id}")
        _uiState.update {
            recalculateNextTurnEffectiveConfig(
                it.copy(
                    sessionId = params.sessionId,
                    cwd = params.cwd,
                    threadId = launchConversationId,
                    currentTurnId = null,
                    messages = emptyList(),
                    errorMessage = null,
                    connectionState = ConnectionState.CONNECTING,
                    serverNextTurnConfigBase = null,
                    ownerCurrentCodexConfig = null,
                    nextTurnEffectiveCodexConfig = null,
                    nextTurnOverrides = rememberedOverrides,
                    planWorkflow = buildEmptyPlanWorkflowState(),
                    pendingFileMentions = emptyList(),
                    fileMentionMenuVisible = false,
                    fileMentionQuery = "",
                    fileMentionResults = emptyList(),
                    fileMentionLoading = false,
                    pendingServerRequests = emptyList(),
                    submittingServerRequestIds = emptySet(),
                    sessionExpired = false,
                    executionWatch = CodexExecutionWatchState(),
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
                    threadRenameDraft = "",
                    activeConversationId = launchConversationId,
                    awaitingNewThreadIpcSurface = false,
                    ipcSurfaceSnapshot = null,
                    activeGoal = null,
                    followerModeEnabled = true,
                    followerActiveSendAllowed = false
                )
            )
        }
        connectionManager.connect(profile, params.sessionId)
    }

    fun disconnect() {
        clearPendingOptimisticNewThreadTransition()
        clearPendingLaunchHydrate()
        pendingHistoryResumeHydrationThreadId = null
        ipcStatusObserved = false
        connectionManager.disconnect()
    }

    fun onHostVisible() {
        foregroundHostVisible = true
        val now = SystemClock.elapsedRealtime()
        if (!ipcStatusObserved) {
            ipcAuthorityModeEnteredAtElapsed = now
            lastRecoveryReadAtElapsed = 0L
        } else if (_uiState.value.ipcOnline) {
            beginAwaitingFreshIpcSurface(now)
        } else {
            ipcAuthorityModeEnteredAtElapsed = now
            lastRecoveryReadAtElapsed = 0L
        }
        subscribeActiveConversationIfNeeded()
        runForegroundRecoveryTick(now)
        if (foregroundFollowJob?.isActive == true) return
        foregroundFollowJob = viewModelScope.launch {
            while (isActive) {
                delay(IPC_RECOVERY_TICK_MILLIS)
                runForegroundRecoveryTick(SystemClock.elapsedRealtime())
            }
        }
    }

    fun onHostHidden() {
        foregroundHostVisible = false
        foregroundFollowJob?.cancel()
        foregroundFollowJob = null
        foregroundRecoveryReadInFlightThreadId = null
    }

    private fun beginAwaitingFreshIpcSurface(nowElapsed: Long = SystemClock.elapsedRealtime()) {
        awaitingFreshIpcSurface = true
        matchingIpcSurfaceDesynced = false
        ipcAuthorityModeEnteredAtElapsed = nowElapsed
        lastRecoveryReadAtElapsed = 0L
    }

    private fun noteMatchingIpcSurface(
        snap: DesktopSurfaceSnapshot,
        nowElapsed: Long = SystemClock.elapsedRealtime()
    ) {
        awaitingFreshIpcSurface = false
        matchingIpcSurfaceDesynced = snap.desynced
        ipcAuthorityModeEnteredAtElapsed = if (snap.desynced) nowElapsed else 0L
        if (!snap.desynced) {
            lastRecoveryReadAtElapsed = 0L
        }
    }

    private fun authorityModeForState(
        state: CodexUiState,
        targetThreadId: String? = state.threadId
    ): IpcAuthorityMode {
        if (!ipcStatusObserved) return IpcAuthorityMode.AWAITING_IPC_SURFACE
        val target = normalizeThreadId(targetThreadId)
        val matchingSurface = target != null &&
            normalizeThreadId(state.ipcSurfaceSnapshot?.conversationId) == target
        return resolveIpcAuthorityMode(
            ipcOnline = state.ipcOnline,
            matchingSurfaceAvailable = matchingSurface,
            surfaceDesynced = matchingSurface &&
                (state.ipcSurfaceSnapshot?.desynced == true || matchingIpcSurfaceDesynced),
            awaitingFreshSurface = awaitingFreshIpcSurface
        )
    }

    private fun runForegroundRecoveryTick(nowElapsed: Long) {
        if (!foregroundHostVisible) return
        val state = _uiState.value
        if (state.connectionState != ConnectionState.CONNECTED) return
        val targetThreadId = normalizeThreadId(state.threadId) ?: return
        val authorityMode = authorityModeForState(state, targetThreadId)
        val millisSinceModeEntered = if (ipcAuthorityModeEnteredAtElapsed > 0L) {
            (nowElapsed - ipcAuthorityModeEnteredAtElapsed).coerceAtLeast(0L)
        } else {
            Long.MAX_VALUE
        }
        if (!shouldUseCanonicalThreadReadFallback(
                threadId = targetThreadId,
                activeConversationId = state.activeConversationId,
                authorityMode = authorityMode,
                millisSinceAuthorityModeEntered = millisSinceModeEntered,
                surfaceWaitGraceMillis = IPC_SURFACE_WAIT_GRACE_MILLIS,
                ipcStatusObserved = ipcStatusObserved
            )) {
            return
        }
        if (state.ipcOnline &&
            nowElapsed - lastRecoverySubscribeAtElapsed >= IPC_RECOVERY_RESUBSCRIBE_MILLIS) {
            subscribeActiveConversationIfNeeded()
            lastRecoverySubscribeAtElapsed = nowElapsed
        }
        val recoveryDue = lastRecoveryReadAtElapsed == 0L ||
            nowElapsed - lastRecoveryReadAtElapsed >= IPC_RECOVERY_READ_INTERVAL_MILLIS
        if (recoveryDue && requestForegroundRecoveryThreadRead(
                targetThreadId,
                reason = "foreground-ipc-recovery:${authorityMode.name.lowercase()}"
            )) {
            lastRecoveryReadAtElapsed = nowElapsed
        }
    }

    fun setError(message: String) {
        _uiState.update {
            it.copy(
                errorMessage = message,
                connectionState = ConnectionState.ERROR,
                executionWatch = CodexExecutionWatchState()
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun resolveThreadRecovery(action: String) {
        val recovery = _uiState.value.threadRecovery ?: return
        val normalizedAction = action.trim().lowercase()
        if (normalizedAction !in setOf("retry", "fork", "new", "cancel")) return
        sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.codexThreadRecoveryAction(
                recoveryId = recovery.recoveryId,
                action = normalizedAction
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
    }

    fun consumeComposerRecoveryText() {
        _uiState.update { it.copy(composerRecoveryText = null) }
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
                    ownerCurrentCodexConfig = null,
                    nextTurnEffectiveCodexConfig = null,
                    nextTurnOverrides = NextTurnOverrides(),
                    planWorkflow = buildEmptyPlanWorkflowState(),
                    pendingServerRequests = emptyList(),
                    submittingServerRequestIds = emptySet(),
                    sessionExpired = false,
                    executionWatch = CodexExecutionWatchState(),
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
        val state = _uiState.value
        if (shouldUseIpcFollowerTransport(state)) {
            sendEnvelopeOrReportFailure(
                payload = CodexClientMessages.followerInterruptTurn(state.activeConversationId!!),
                errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
            )
            return
        }
        if (state.threadId.isNullOrBlank() || state.currentTurnId.isNullOrBlank()) {
            _uiState.update {
                syncExecutionWatch(
                    it.copy(currentTurnId = null),
                    markActivity = false
                )
            }
            return
        }
        sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.codexInterrupt(state.threadId),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
    }

    fun continueActiveGoal() {
        val objective = _uiState.value.activeGoal?.objective?.trim().orEmpty()
        if (objective.isEmpty()) return
        startFollowerGoal(objective)
    }

    fun newThread() {
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.new.requested",
            mapOf(
                "source" to "view_model",
                "hadActiveConversation" to !_uiState.value.activeConversationId.isNullOrBlank(),
                "ipcOnline" to _uiState.value.ipcOnline
            ),
            critical = true
        )
        currentStreamingMessageId = null
        currentPlanStreamingMessageId = null
        executionFeedbackSeen.clear()
        threadHadPlanTurn = false
        clearPendingOptimisticNewThreadTransition()
        clearPendingThreadResync()
        clearPendingLaunchHydrate()
        pinnedIpcConversationId = null
        pendingHistoryResumeHydrationThreadId = null
        _uiState.update {
            prepareIpcStateForNewThread(
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
                    usagePanel = it.usagePanel.copy(
                        visible = false,
                        tokenUsageSummary = "",
                        contextUsage = null
                    ),
                    pendingImageAttachments = emptyList(),
                    currentThreadTitle = "",
                    threadHistorySheetVisible = false,
                    threadHistoryActionThreadId = "",
                    threadHistoryActionKind = "",
                    threadRenameTargetId = "",
                    threadRenameDraft = ""
                )
            )
        }
        val sent = connectionManager.send(CodexClientMessages.codexNewThread())
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.new.sent",
            mapOf("sent" to sent, "ipcOnline" to _uiState.value.ipcOnline),
            level = if (sent) "info" else "warn",
            critical = true
        )
    }

    fun setCwd(cwd: String) {
        connectionManager.send(CodexClientMessages.codexSetCwd(cwd))
        _uiState.update { it.copy(cwd = cwd) }
    }

    fun submitApprovalDecision(requestId: String, approved: Boolean) {
        PersistentDiagnosticLog.event(
            "codex",
            "android.approval.clicked",
            mapOf("requestIdPresent" to requestId.isNotBlank(), "approved" to approved),
            critical = true
        )
        val request = findPendingServerRequest(requestId)
        if (request == null) {
            Log.w(TAG, "[approval][submit-skipped] pending request not found requestId=$requestId")
            return
        }
        if (isIpcFollowerRequest(request)) {
            val state = _uiState.value
            val conversationId = state.activeConversationId?.trim().orEmpty()
            Log.i(
                TAG,
                "[approval][submit] transport=ipc_follower requestId=$requestId " +
                    "requestKind=${request.requestKind} approved=$approved " +
                    "conversationId=$conversationId ipcOnline=${state.ipcOnline} " +
                    "followerModeEnabled=${state.followerModeEnabled} " +
                    "activeSendAllowed=${state.followerActiveSendAllowed}"
            )
            if (!shouldUseIpcFollowerTransport(state) || conversationId.isEmpty()) {
                Log.w(TAG, "[approval][submit-skipped] IPC follower transport unavailable requestId=$requestId")
                _uiState.update {
                    it.copy(errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable))
                }
                return
            }
            val decision = resolveIpcFollowerApprovalDecision(request, approved)
            val sent = sendEnvelopeOrReportFailure(
                payload = CodexClientMessages.followerApprovalResponse(
                    conversationId = conversationId,
                    requestId = requestId,
                    decision = decision,
                    requestKind = request.requestKind.takeIf { it.isNotBlank() && it != "approval" }
                ),
                errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
            )
            if (!sent) return
            markServerRequestSubmitting(requestId)
            return
        }
        val result = buildApprovalDecisionResult(request, approved) ?: return
        if (isDebugServerRequest(requestId)) {
            markServerRequestSubmitting(requestId)
            completeDebugServerRequest(requestId, result = result)
            return
        }
        val sent = sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                result = result
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
        if (!sent) return
        markServerRequestSubmitting(requestId)
    }

    fun submitUserInputAnswers(requestId: String, answersByQuestionId: Map<String, String>) {
        val request = findPendingServerRequest(requestId) ?: return
        if (isIpcFollowerRequest(request)) {
            val conversationId = _uiState.value.activeConversationId?.trim().orEmpty()
            val firstQuestion = request.questions.firstOrNull()
            val explicitResponse = buildUserInputResult(request, answersByQuestionId)
            val answer = firstQuestion
                ?.let { answersByQuestionId[it.id]?.trim() }
                ?: answersByQuestionId.values.firstOrNull()?.trim()
                ?: ""
            if (conversationId.isEmpty() || (answer.isEmpty() && explicitResponse == null)) return
            val sent = sendEnvelopeOrReportFailure(
                payload = CodexClientMessages.followerPlanResponse(
                    conversationId = conversationId,
                    input = answer.ifEmpty { "submitted" },
                    requestId = requestId,
                    questionId = firstQuestion?.id,
                    response = explicitResponse
                ),
                errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
            )
            if (!sent) return
            markServerRequestSubmitting(requestId)
            return
        }
        val result = buildUserInputResult(request, answersByQuestionId) ?: return
        if (isDebugServerRequest(requestId)) {
            markServerRequestSubmitting(requestId)
            completeDebugServerRequest(requestId, result = result)
            return
        }
        val sent = sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                result = result
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
        if (!sent) return
        markServerRequestSubmitting(requestId)
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
        val request = findPendingServerRequest(requestId) ?: return
        if (isIpcFollowerRequest(request)) {
            val state = _uiState.value
            val conversationId = state.activeConversationId?.trim().orEmpty()
            if (!shouldUseIpcFollowerTransport(state) || conversationId.isEmpty()) {
                PersistentDiagnosticLog.event(
                    "codex",
                    "android.approval.send.unavailable",
                    mapOf("transport" to "ipc_follower", "ipcOnline" to state.ipcOnline),
                    level = "warn",
                    critical = true
                )
                Log.w(TAG, "[user-input][reject-skipped] IPC follower transport unavailable requestId=$requestId")
                _uiState.update {
                    it.copy(errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable))
                }
                return
            }
            val sent = sendEnvelopeOrReportFailure(
                payload = CodexClientMessages.followerPlanResponse(
                    conversationId = conversationId,
                    input = "取消",
                    requestId = requestId,
                    questionId = request.questions.firstOrNull()?.id
                ),
                errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
            )
            if (!sent) return
            PersistentDiagnosticLog.event(
                "codex",
                "android.approval.sent",
                mapOf("transport" to "ipc_follower", "sent" to true),
                critical = true
            )
            markServerRequestSubmitting(requestId)
            return
        }
        val error = JSONObject().put("message", "User input request cancelled by user.")
        if (isDebugServerRequest(requestId)) {
            markServerRequestSubmitting(requestId)
            completeDebugServerRequest(requestId, error = error)
            return
        }
        val sent = sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.codexServerRequestResponse(
                requestId = requestId,
                error = error
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
        if (!sent) return
        PersistentDiagnosticLog.event(
            "codex",
            "android.approval.sent",
            mapOf("transport" to "codex", "sent" to true),
            critical = true
        )
        markServerRequestSubmitting(requestId)
    }

    private fun sendEnvelopeOrReportFailure(
        payload: String,
        errorMessage: String
    ): Boolean {
        val sent = connectionManager.send(payload)
        if (!sent) {
            _uiState.update { state ->
                state.copy(errorMessage = errorMessage)
            }
        }
        return sent
    }

    private fun isTransientWebSocketFailure(message: String, code: Int?): Boolean {
        if (code != null && code >= 400) {
            return false
        }
        val normalized = message.trim().lowercase()
        if (normalized.isEmpty()) {
            return false
        }
        return normalized.contains("broken pipe") ||
            normalized.contains("software caused connection abort") ||
            normalized.contains("socket closed") ||
            normalized.contains("connection reset") ||
            normalized.contains("connection abort") ||
            normalized.contains("closed channel")
    }

    private fun isTransientConnectionMessage(message: String?): Boolean {
        val normalized = message?.trim().orEmpty()
        if (normalized.isBlank()) {
            return false
        }
        if (normalized == appContext.getString(R.string.codex_native_connection_action_unavailable)) {
            return true
        }
        return isTransientWebSocketFailure(normalized, null)
    }

    private fun agentMessagePhase(item: JSONObject): String =
        item.optString("phase", "").trim().lowercase()

    private fun isRuntimeOnlyAgentMessage(item: JSONObject): Boolean {
        return when (agentMessagePhase(item)) {
            "plan", "reasoning" -> true
            else -> false
        }
    }

    private fun extractTraceTurnId(params: JSONObject?): String {
        return params
            ?.optJSONObject("turn")
            ?.optString("id", "")
            ?.trim()
            .orEmpty()
            .ifEmpty { params?.optString("turnId", "")?.trim().orEmpty() }
    }

    private fun extractTraceItemId(params: JSONObject?): String {
        return params
            ?.optJSONObject("item")
            ?.optString("id", "")
            ?.trim()
            .orEmpty()
            .ifEmpty { params?.optString("itemId", "")?.trim().orEmpty() }
    }

    private fun shouldTraceNotificationMethod(method: String): Boolean {
        return when (method) {
            "turn/started",
            "turn/completed",
            "item/started",
            "item/agentMessage/delta",
            "item/completed",
            "error" -> true
            else -> false
        }
    }

    private fun logNotificationTrace(stage: String, message: String) {
        Log.d(TAG, "[notif-trace][$stage] $message")
    }

    private fun compactLogValue(value: String?, maxLength: Int = 1800): String {
        val normalized = value?.trim().orEmpty()
        if (normalized.length <= maxLength) {
            return normalized
        }
        return normalized.take(maxLength) + "...<truncated>"
    }

    private fun resolvePlanStreamingMessageId(params: JSONObject?): String {
        return params
            ?.optJSONObject("plan")
            ?.optString("id", "")
            ?.trim()
            .orEmpty()
            .ifEmpty { params?.optString("planId", "")?.trim().orEmpty() }
            .ifEmpty { params?.optString("itemId", "")?.trim().orEmpty() }
            .ifEmpty { currentPlanStreamingMessageId.orEmpty() }
    }

    private fun finalizeStreamingMessageById(streamId: String) {
        logNotificationTrace("ui", "finalize streamId=$streamId")
        _uiState.update { state ->
            val updated = state.messages.map { message ->
                if (message.id == streamId) {
                    message.copy(
                        streaming = false,
                        timestamp = System.currentTimeMillis()
                    )
                } else {
                    message
                }
            }
            syncExecutionWatch(state.copy(messages = updated), markActivity = true)
        }
    }

    private fun finalizePlanStreamingMessage() {
        val streamId = currentPlanStreamingMessageId ?: return
        finalizeStreamingMessageById(streamId)
        currentPlanStreamingMessageId = null
    }

    private fun trackPlanWorkflowText(
        text: String,
        preserveWhitespace: Boolean = false
    ) {
        _uiState.update { state ->
            if (shouldTrackPlanWorkflowText(state)) {
                updatePlanWorkflowText(
                    state = state,
                    text = text,
                    preserveWhitespace = preserveWhitespace
                )
            } else {
                state
            }
        }
    }

    private fun summarizeReasoningPayload(value: Any?): String {
        return when (value) {
            is String -> value.trim()
            is Number -> value.toString()
            is JSONObject -> {
                pickFirstText(
                    value,
                    listOf("delta"),
                    listOf("text"),
                    listOf("summary"),
                    listOf("summaryText"),
                    listOf("part", "text"),
                    listOf("part", "summary"),
                    listOf("item", "text"),
                    listOf("item", "summary")
                ).ifEmpty {
                    summarizeReasoningPayload(value.optJSONArray("parts"))
                }
            }
            is JSONArray -> {
                buildList {
                    for (index in 0 until value.length()) {
                        summarizeReasoningPayload(value.opt(index))
                            .takeIf { it.isNotBlank() }
                            ?.let(::add)
                    }
                }.joinToString("\n")
            }
            else -> ""
        }.trim()
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
        val now = System.currentTimeMillis()
        _uiState.update { state ->
            state.copy(
                messages = state.messages + ChatMessage(
                    id = UUID.randomUUID().toString(),
                    role = ChatMessage.Role.SYSTEM,
                    content = "[debug] Injected runtime and usage panel sample."
                ),
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
                ),
                status = "running",
                connectionState = ConnectionState.CONNECTED,
                executionWatch = CodexExecutionWatchState(
                    active = true,
                    runningSinceMillis = now - 125_000L,
                    lastEventAtMillis = now - 65_000L
                )
            )
        }
    }

    fun showThreadHistory() {
        _uiState.update {
            closeSlashMenu(
                it.copy(
                    threadHistorySheetVisible = true,
                    runtimePanel = it.runtimePanel.copy(visible = false),
                    noticesPanel = it.noticesPanel.copy(visible = false),
                    toolsPanel = it.toolsPanel.copy(visible = false)
                )
            )
        }
        if (_uiState.value.capabilities?.historyList == true) {
            refreshThreadHistory()
        }
    }

    fun showRuntimePanel() {
        _uiState.update {
            closeSlashMenu(
                it.copy(
                    threadHistorySheetVisible = false,
                    runtimePanel = it.runtimePanel.copy(visible = true),
                    noticesPanel = it.noticesPanel.copy(visible = false),
                    toolsPanel = it.toolsPanel.copy(visible = false)
                )
            )
        }
    }

    fun hideRuntimePanel() {
        _uiState.update { it.copy(runtimePanel = it.runtimePanel.copy(visible = false)) }
    }

    fun showToolsPanel() {
        maybeLoadSkillCatalog()
        _uiState.update { state ->
            closeSlashMenu(
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
            )
        }
    }

    fun showNoticesPanel() {
        _uiState.update { state ->
            closeSlashMenu(
                state.copy(
                    threadHistorySheetVisible = false,
                    runtimePanel = state.runtimePanel.copy(visible = false),
                    noticesPanel = state.noticesPanel.copy(visible = true),
                    toolsPanel = state.toolsPanel.copy(visible = false)
                )
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
        _uiState.update { state ->
            state.copy(
                pendingSkillInsertName = normalized.ifEmpty { null },
                toolsPanel = state.toolsPanel.copy(visible = false)
            )
        }
    }

    fun clearActiveSkill() {
        _uiState.update { state ->
            state.copy(
                pendingSkillInsertName = null,
                interactionState = state.interactionState?.copy(activeSkill = null)
            )
        }
    }

    fun requestCompactCurrentThread() {
        val state = _uiState.value
        if (state.capabilities?.compact != true) {
            val message = appContext.getString(R.string.codex_native_tools_compact_unavailable)
            _uiState.update {
                it.copy(
                    toolsPanel = it.toolsPanel.copy(
                        compactStatusText = message,
                        compactStatusTone = "error"
                    )
                )
            }
            appendMessage(ChatMessage.Role.ERROR, message)
            return
        }
        val threadId = normalizeThreadId(state.threadId).orEmpty()
        if (threadId.isEmpty()) {
            val message = appContext.getString(R.string.codex_native_tools_compact_no_thread)
            _uiState.update {
                it.copy(
                    toolsPanel = it.toolsPanel.copy(
                        compactStatusText = message,
                        compactStatusTone = "error"
                    )
                )
            }
            appendMessage(ChatMessage.Role.ERROR, message)
            return
        }
        val requestingMessage = appContext.getString(R.string.codex_native_tools_compact_requesting)
        _uiState.update {
            it.copy(
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = true,
                    compactStatusText = requestingMessage,
                    compactStatusTone = ""
                )
            )
        }
        appendMessage(ChatMessage.Role.SYSTEM, requestingMessage)
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
            closeSlashMenu(
                state.copy(usagePanel = state.usagePanel.copy(visible = true))
            )
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
        val state = _uiState.value
        if (state.capabilities?.historyList != true) return
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.history.refresh.started",
            mapOf("hasCwd" to !state.cwd.isNullOrBlank(), "ipcOnline" to state.ipcOnline)
        )
        val params = JSONObject().put("limit", 50)
        val cwd = state.cwd?.trim().orEmpty()
        if (cwd.isNotEmpty()) {
            params.put("cwd", cwd)
        }
        _uiState.update { it.copy(threadHistoryLoading = true) }
        connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/list",
                params = params
            )
        )
    }

    fun resumeThread(threadId: String) {
        val normalizedThreadId = threadId.trim()
        if (normalizedThreadId.isEmpty()) return
        clearPendingOptimisticNewThreadTransition()
        clearPendingLaunchHydrate()
        pinnedIpcConversationId = normalizedThreadId
        pendingHistoryResumeHydrationThreadId = normalizedThreadId
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
        if (parsed.command == "/goal") {
            startFollowerGoal(parsed.argumentText)
            return
        }
        val entry = CodexSlashRegistry.resolveSlashCommand(parsed.command)
        if (entry == null) {
            appendMessage(ChatMessage.Role.SYSTEM, "Unknown command: ${parsed.command}")
            return
        }

        when (resolveMobileSlashAction(entry.command)) {
            MobileSlashAction.SHOW_MODEL_PICKER -> showModelPicker()
            MobileSlashAction.PLAN -> handleSlashPlan(parsed.argumentText)
            MobileSlashAction.FAST -> toggleFastMode()
            MobileSlashAction.SHOW_SKILLS -> showToolsPanel()
            MobileSlashAction.COMPACT -> requestCompactCurrentThread()
            MobileSlashAction.NEW_THREAD -> newThread()
            MobileSlashAction.FORK_THREAD -> {
                val currentThreadId = normalizeThreadId(_uiState.value.threadId)
                if (currentThreadId == null) {
                    appendMessage(
                        ChatMessage.Role.ERROR,
                        appContext.getString(R.string.codex_native_slash_fork_no_thread)
                    )
                } else {
                    forkThread(currentThreadId)
                }
            }
            MobileSlashAction.SKILL -> handleSlashSkill(parsed.argumentText)
            MobileSlashAction.MENTION -> appendMessage(
                ChatMessage.Role.SYSTEM,
                appContext.getString(R.string.codex_native_mention_shortcut_hint)
            )
            MobileSlashAction.UNSUPPORTED -> appendMessage(
                ChatMessage.Role.SYSTEM,
                "${entry.command} is not yet supported on mobile"
            )
        }
    }

    private fun handleSlashPlan(argumentText: String) {
        if (argumentText.isEmpty()) {
            togglePlanMode()
        } else {
            sendTurnWithOverrides(argumentText, forcePlanMode = true)
        }
    }

    private fun startFollowerGoal(argumentText: String) {
        val objective = argumentText.trim()
        if (objective.isEmpty()) {
            appendMessage(ChatMessage.Role.SYSTEM, "Goal objective is required.")
            return
        }
        val state = _uiState.value
        val conversationId = state.activeConversationId?.trim().orEmpty()
        if (!shouldUseIpcFollowerSendTransportState(state) || conversationId.isEmpty()) {
            sendTurnWithOverrides("/goal $objective")
            return
        }
        val clientRequestId = UUID.randomUUID().toString()
        val sent = sendEnvelopeOrReportFailure(
            payload = CodexClientMessages.followerSendMessage(
                conversationId = conversationId,
                input = "/goal $objective",
                clientRequestId = clientRequestId,
                interactionState = state.interactionState
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
        if (!sent) return
        _uiState.update {
            it.copy(
                followerRouteState = "accepted",
                followerRouteRequestId = clientRequestId
            )
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
        val followerPlanRequestId = state.planWorkflow.planRequestId?.trim().orEmpty()
        val followerConversationId = state.activeConversationId?.trim().orEmpty()
        if (shouldUseIpcFollowerTransport(state) && followerPlanRequestId.isNotEmpty() && followerConversationId.isNotEmpty()) {
            Log.i(
                TAG,
                "[plan][submit] requestId=$followerPlanRequestId conversationId=$followerConversationId"
            )
            val sent = sendEnvelopeOrReportFailure(
                payload = CodexClientMessages.followerPlanResponse(
                    conversationId = followerConversationId,
                    input = "是，实施此计划",
                    requestId = followerPlanRequestId,
                    questionId = state.planWorkflow.planQuestionId
                ),
                errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
            )
            if (sent) {
                _uiState.update { current ->
                    current.copy(
                        planMode = false,
                        interactionState = buildInteractionState(current, planMode = false),
                        planWorkflow = current.planWorkflow.copy(
                            phase = PLAN_PHASE_EXECUTING_CONFIRMED_PLAN
                        )
                    )
                }
            }
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
        val sent = sendTurnWithOverrides(
            text = executionPrompt,
            forceNewThread = true,
            clearPlanModeAfterSend = false,
            displayTextOverride = appContext.getString(R.string.codex_native_plan_execution_log)
        )
        if (!sent) {
            _uiState.update { current ->
                current.copy(
                    planWorkflow = current.planWorkflow.copy(
                        phase = PLAN_PHASE_READY_FOR_CONFIRMATION
                    )
                )
            }
        }
    }

    // ── Fast mode ─────────────────────────────────────────────────────

    fun toggleFastMode() {
        var enabled = false
        _uiState.update { state ->
            val current = state.nextTurnOverrides.reasoningEffort
            val isFastNow = current == FAST_MODE_EFFORT
            val newEffort = if (isFastNow) null else FAST_MODE_EFFORT
            enabled = !isFastNow
            Log.i(TAG, "Fast mode: ${!isFastNow} (reasoning: $newEffort)")
            recalculateNextTurnEffectiveConfig(
                state.copy(
                    nextTurnOverrides = state.nextTurnOverrides.copy(reasoningEffort = newEffort)
                )
            )
        }
        appendMessage(
            ChatMessage.Role.SYSTEM,
            appContext.getString(
                if (enabled) R.string.codex_native_fast_enabled else R.string.codex_native_fast_disabled
            )
        )
    }

    fun showReasoningPicker() {
        _uiState.update {
            closeSlashMenu(
                it.copy(
                    modelPickerVisible = false,
                    sandboxPickerVisible = false,
                    reasoningPickerVisible = true
                )
            )
        }
    }

    fun hideReasoningPicker() {
        _uiState.update { it.copy(reasoningPickerVisible = false) }
    }

    fun selectReasoningEffort(reasoningEffort: String?) {
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.config.selected",
            mapOf("kind" to "reasoning", "valuePresent" to !reasoningEffort.isNullOrBlank()),
            critical = true
        )
        _uiState.update { state ->
            val remembered = loadRememberedTaskOverrides(state.threadId, reason = "select-reasoning-base")
            recalculateNextTurnEffectiveConfig(
                state.copy(
                    nextTurnOverrides = remembered.copy(reasoningEffort = reasoningEffort),
                    reasoningPickerVisible = false
                )
            )
        }
        rememberCurrentTaskOverrides(reason = "select-reasoning")
    }

    fun showSandboxPicker() {
        maybeRequestPermissionProfiles()
        _uiState.update {
            closeSlashMenu(
                it.copy(
                    modelPickerVisible = false,
                    reasoningPickerVisible = false,
                    sandboxPickerVisible = true
                )
            )
        }
    }

    fun hideSandboxPicker() {
        _uiState.update { it.copy(sandboxPickerVisible = false) }
    }

    fun selectSandboxMode(sandboxMode: String?) {
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.config.selected",
            mapOf("kind" to "permission", "value" to sandboxMode.orEmpty()),
            critical = true
        )
        _uiState.update { state ->
            val remembered = loadRememberedTaskOverrides(state.threadId, reason = "select-permission-base")
            val selectionState = state.copy(nextTurnOverrides = remembered)
            recalculateNextTurnEffectiveConfig(
                state.copy(
                    nextTurnOverrides = nextTurnOverridesForPermissionSelection(selectionState, sandboxMode),
                    sandboxPickerVisible = false
                )
            )
        }
        rememberCurrentTaskOverrides(reason = "select-permission")
    }

    // ── Model picker ──────────────────────────────────────────────────

    fun showModelPicker() {
        maybeRequestModelList()
        _uiState.update {
            closeSlashMenu(
                it.copy(
                    modelPickerVisible = true,
                    reasoningPickerVisible = false,
                    sandboxPickerVisible = false
                )
            )
        }
    }

    fun hideModelPicker() {
        _uiState.update { it.copy(modelPickerVisible = false) }
    }

    fun selectModel(model: String?) {
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.config.selected",
            mapOf("kind" to "model", "valuePresent" to !model.isNullOrBlank()),
            critical = true
        )
        _uiState.update { state ->
            val remembered = loadRememberedTaskOverrides(state.threadId, reason = "select-model-base")
            val selectionState = state.copy(nextTurnOverrides = remembered)
            recalculateNextTurnEffectiveConfig(
                state.copy(
                    nextTurnOverrides = nextTurnOverridesForModelSelection(selectionState, model),
                    modelPickerVisible = false
                )
            )
        }
        rememberCurrentTaskOverrides(reason = "select-model")
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

    private fun closeSlashMenu(state: CodexUiState): CodexUiState =
        state.copy(slashMenuVisible = false, slashMenuQuery = "")

    fun handleComposerTextChanged(rawText: String) {
        val derivedActiveSkill = extractSkillReferencesFromText(rawText).singleOrNull()?.name
        _uiState.update { state ->
            state.copy(
                interactionState = buildInteractionState(
                    state = state.copy(
                        interactionState = state.interactionState?.copy(activeSkill = derivedActiveSkill)
                            ?: CodexInteractionState(
                                planMode = state.planMode == true,
                                activeSkill = derivedActiveSkill
                            )
                    ),
                    planMode = state.planMode == true
                )
            )
        }
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
        rememberCurrentTaskOverrides(reason = "set-overrides")
    }

    private fun loadRememberedTaskOverrides(threadId: String?, reason: String): NextTurnOverrides {
        val key = rememberedTaskConfigKey(currentProfile?.id, threadId) ?: return NextTurnOverrides()
        val overrides = decodeRememberedNextTurnOverrides(rememberedTaskConfig.getString(key, null))
        Log.i(
            TAG,
            "[config][remembered-load] reason=$reason threadId=${normalizeThreadId(threadId).orEmpty()} " +
                "fields=${rememberedOverrideFieldSummary(overrides)}"
        )
        return overrides
    }

    private fun rememberCurrentTaskOverrides(reason: String) {
        val state = _uiState.value
        val key = rememberedTaskConfigKey(currentProfile?.id, state.threadId) ?: return
        val encoded = encodeRememberedNextTurnOverrides(state.nextTurnOverrides)
        rememberedTaskConfig.edit().apply {
            if (encoded == null) remove(key) else putString(key, encoded)
        }.apply()
        Log.i(
            TAG,
            "[config][remembered-save] reason=$reason threadId=${normalizeThreadId(state.threadId).orEmpty()} " +
                "fields=${rememberedOverrideFieldSummary(state.nextTurnOverrides)}"
        )
    }

    private fun rememberedOverrideFieldSummary(overrides: NextTurnOverrides): String = buildList {
        if (!overrides.model.isNullOrBlank()) add("model")
        if (!overrides.reasoningEffort.isNullOrBlank()) add("reasoning")
        if (!overrides.sandbox.isNullOrBlank()) add("sandbox")
        if (!overrides.approvalPolicy.isNullOrBlank()) add("approval")
        if (!overrides.approvalsReviewer.isNullOrBlank()) add("reviewer")
        if (!overrides.permissionProfile.isNullOrBlank()) add("profile")
        if (overrides.useConfigPermissions) add("config-permissions")
    }.joinToString(",").ifEmpty { "none" }

    private fun applyIpcConversationSelectionWithRememberedConfig(
        state: CodexUiState,
        selected: CodexIpcConversationSummary
    ): CodexUiState {
        val previousId = normalizeThreadId(state.activeConversationId)
        val selectedState = applyIpcConversationSelectionToUiState(state, selected)
        if (previousId == normalizeThreadId(selected.conversationId)) return selectedState
        return recalculateNextTurnEffectiveConfig(
            selectedState.copy(
                nextTurnOverrides = loadRememberedTaskOverrides(
                    selected.conversationId,
                    reason = "ipc-selection"
                )
            )
        )
    }

    // ── Internal: send turn with overrides ────────────────────────────

    private fun sendTurnWithOverrides(
        text: String,
        forcePlanMode: Boolean = false,
        forceNewThread: Boolean = false,
        clearPlanModeAfterSend: Boolean = true,
        displayTextOverride: String? = null
    ): Boolean {
        val state = _uiState.value
        if (text.isBlank() && state.pendingFileMentions.isEmpty() && state.pendingImageAttachments.isEmpty()) return false
        val skillReferences = extractSkillReferencesFromText(text)
        val turnInteractionState = CodexInteractionState(
            planMode = forcePlanMode || state.planMode == true,
            activeSkill = skillReferences.singleOrNull()?.name
        )
        val attachments = state.pendingImageAttachments.map { attachment ->
            CodexTurnAttachment(
                type = attachment.type,
                url = attachment.url
            )
        }
        val prompt = buildPromptWithMentions(text, state.pendingFileMentions)
        val displayText = displayTextOverride ?: buildDisplayText(
            text = text,
            mentions = state.pendingFileMentions
        )
        val userMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            role = ChatMessage.Role.USER,
            content = displayText,
            fileMentions = state.pendingFileMentions,
            activeSkill = turnInteractionState.activeSkill,
            skills = skillReferences,
            attachments = state.pendingImageAttachments.map(::buildMessageAttachmentSummary)
        )
        val isPlanMode = forcePlanMode || state.planMode == true
        val effectiveModel = state.nextTurnOverrides.model ?: state.model
        val effectiveReasoning = state.nextTurnOverrides.reasoningEffort ?: state.reasoningEffort

        val collaborationMode = if (isPlanMode) {
            CodexClientMessages.buildCollaborationMode(
                model = effectiveModel,
                reasoningEffort = effectiveReasoning
            )
        } else null

        // A plan turn does not change the canonical conversation. The next
        // ordinary turn explicitly sends the default collaboration mode
        // instead of silently replacing the thread.
        val effectiveForceNewThread = forceNewThread

        val followerPayload = buildFollowerTurnPayloadIfSupported(
            state = state,
            prompt = prompt,
            isPlanMode = isPlanMode,
            attachments = attachments,
            interactionState = turnInteractionState,
            collaborationMode = collaborationMode
        )
        val sentViaIpcFollower = followerPayload != null
        if (followerPayload == null && shouldBlockPlainTextFallbackForIpcConversation(state, isPlanMode, attachments)) {
            _uiState.update {
                it.copy(errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable))
            }
            return false
        }
        val sent = sendEnvelopeOrReportFailure(
            payload = followerPayload ?: CodexClientMessages.codexTurn(
                prompt = prompt,
                threadId = normalizeThreadId(state.threadId),
                attachments = attachments,
                interactionState = turnInteractionState,
                model = state.nextTurnOverrides.model,
                reasoningEffort = state.nextTurnOverrides.reasoningEffort,
                sandbox = state.nextTurnOverrides.sandbox,
                collaborationMode = collaborationMode,
                forceNewThread = effectiveForceNewThread
            ),
            errorMessage = appContext.getString(R.string.codex_native_connection_action_unavailable)
        )
        if (!sent) {
            return false
        }

        if (!sentViaIpcFollower) {
            // Update plan-turn tracking: set flag if this was a plan turn,
            // reset if we just forced a new thread (clean slate).
            if (isPlanMode) {
                threadHadPlanTurn = true
            } else if (effectiveForceNewThread) {
                threadHadPlanTurn = false
            }
        }
        pendingOptimisticNewThreadSourceThreadId = if (!sentViaIpcFollower && effectiveForceNewThread) {
            normalizeThreadId(state.threadId)
        } else {
            null
        }

        _uiState.update {
            it.copy(
                messages = if (sentViaIpcFollower) it.messages else it.messages + userMsg,
                pendingFileMentions = emptyList(),
                pendingImageAttachments = emptyList(),
                fileMentionMenuVisible = false,
                fileMentionQuery = "",
                fileMentionResults = emptyList(),
                fileMentionLoading = false,
                pendingSkillInsertName = null,
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = false,
                    compactStatusText = "",
                    compactStatusTone = ""
                ),
                planWorkflow = if (
                    effectiveForceNewThread ||
                    (forcePlanMode || state.planMode == true) ||
                    it.planWorkflow.phase != PLAN_PHASE_READY_FOR_CONFIRMATION
                ) {
                    it.planWorkflow
                } else {
                    buildEmptyPlanWorkflowState()
                },
                interactionState = CodexInteractionState(
                    planMode = if (isPlanMode && clearPlanModeAfterSend) false else it.planMode == true,
                    activeSkill = null
                )
            )
        }

        if (!sentViaIpcFollower && collaborationMode != null) {
            _uiState.update { current ->
                current.copy(
                    planWorkflow = startPlanWorkflow(prompt)
                )
            }
        }

        // Clear plan mode after sending a plan turn (matches Web behavior)
        if (isPlanMode && clearPlanModeAfterSend) {
            _uiState.update { current ->
                current.copy(planMode = false)
            }
        }
        syncInteractionState(_uiState.value.interactionState ?: CodexInteractionState())
        return true
    }

    private fun shouldUseIpcFollowerTransport(state: CodexUiState): Boolean =
        shouldUseIpcFollowerTransportState(state)

    private fun buildFollowerTurnPayloadIfSupported(
        state: CodexUiState,
        prompt: String,
        isPlanMode: Boolean,
        attachments: List<CodexTurnAttachment>,
        interactionState: CodexInteractionState,
        collaborationMode: JSONObject?
    ): String? {
        val conversationId = state.activeConversationId?.trim().orEmpty()
        if (!shouldUseIpcFollowerSendTransportState(state) || conversationId.isEmpty()) return null
        val overrides = state.nextTurnOverrides
        val permissionOverride = permissionConfigForSandboxOverride(overrides.sandbox)
        val turnConfig = CodexEffectiveConfig(
            model = overrides.model,
            reasoningEffort = overrides.reasoningEffort,
            personality = null,
            approvalPolicy = overrides.approvalPolicy ?: permissionOverride?.approvalPolicy,
            sandboxMode = if (overrides.permissionProfile.isNullOrBlank()) {
                permissionOverride?.sandboxMode ?: overrides.sandbox
            } else {
                null
            },
            approvalsReviewer = overrides.approvalsReviewer,
            permissionProfile = overrides.permissionProfile,
            useConfigPermissions = overrides.useConfigPermissions
        ).takeIf(CodexEffectiveConfig::hasAnyValue)
        return CodexClientMessages.followerSendMessage(
            conversationId = conversationId,
            input = prompt,
            turnConfig = turnConfig,
            clientRequestId = UUID.randomUUID().toString(),
            attachments = attachments,
            interactionState = interactionState,
            collaborationMode = if (isPlanMode) collaborationMode else {
                CodexClientMessages.buildCollaborationMode(
                    mode = "default",
                    model = state.nextTurnOverrides.model ?: state.model,
                    reasoningEffort = state.nextTurnOverrides.reasoningEffort ?: state.reasoningEffort
                )
            }
        )
    }

    private fun shouldBlockPlainTextFallbackForIpcConversation(
        state: CodexUiState,
        isPlanMode: Boolean,
        attachments: List<CodexTurnAttachment>
    ): Boolean {
        return shouldBlockPlainTextFallbackForIpcConversationState(
            state = state,
            isPlanMode = isPlanMode,
            hasAttachments = attachments.isNotEmpty(),
            hasFileMentions = state.pendingFileMentions.isNotEmpty()
        )
    }

    private fun maybeRequestModelList() {
        val caps = _uiState.value.capabilities ?: return
        if (!caps.modelConfig || caps.models.isNotEmpty()) {
            return
        }
        PersistentDiagnosticLog.event("codex", "android.codex.model_catalog.requested")
        val sent = connectionManager.send(
            CodexClientMessages.codexRequest(
                "model/list",
                JSONObject().put("includeHidden", true)
            )
        )
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.model_catalog.sent",
            mapOf("sent" to sent),
            level = if (sent) "info" else "warn"
        )
    }

    private fun maybeRequestPermissionProfiles() {
        val state = _uiState.value
        if (state.capabilities?.permissionProfiles != true ||
            state.permissionProfilesLoading ||
            state.permissionProfilesRequested
        ) {
            return
        }
        _uiState.update {
            it.copy(
                permissionProfilesLoading = true,
                permissionProfilesRequested = true
            )
        }
        PersistentDiagnosticLog.event("codex", "android.codex.permission_catalog.requested")
        val sent = connectionManager.send(CodexClientMessages.codexRequest("permissionProfile/list"))
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.permission_catalog.sent",
            mapOf("sent" to sent),
            level = if (sent) "info" else "warn"
        )
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
        val promptText = mentions.fold(text) { current, file ->
            stripCommittedMentionToken(current, "@${file.label}")
        }.trim()
        return when {
            mentionPrefix.isBlank() -> promptText
            promptText.isBlank() -> mentionPrefix
            else -> "$mentionPrefix\n$promptText"
        }
    }

    private fun buildDisplayText(
        text: String,
        mentions: List<FileMention>
    ): String {
        val withoutSkills = CodexSlashRegistry.stripSkillTokens(text)
        val withoutMentions = mentions.fold(withoutSkills) { current, file ->
            stripCommittedMentionTokens(current, file)
        }
        return stripAttachmentSummaryLines(withoutMentions).trim()
    }

    private fun stripCommittedMentionTokens(text: String, mention: FileMention): String {
        val candidates = buildSet {
            val trimmedPath = mention.path.trim()
            if (trimmedPath.isNotEmpty()) {
                add("@$trimmedPath")
            }
            mention.label.trim()
                .takeIf { it.isNotEmpty() }
                ?.let { add("@$it") }
        }
        return candidates.fold(text) { current, token ->
            stripCommittedMentionToken(current, token)
        }
    }

    private fun buildVisibleUserMessageText(text: String): String {
        val withoutMentions = stripLeadingMentionLines(text)
        val withoutSkills = CodexSlashRegistry.stripSkillTokens(withoutMentions)
        return stripAttachmentSummaryLines(withoutSkills).trim()
    }

    private fun stripAttachmentSummaryLines(text: String): String {
        if (text.isBlank()) return ""
        return text
            .lineSequence()
            .filterNot { line ->
                val trimmed = line.trim()
                trimmed.startsWith("[image] ", ignoreCase = true) ||
                    trimmed.startsWith("[image-url] ", ignoreCase = true)
            }
            .joinToString("\n")
    }

    private fun extractSkillReferencesFromText(text: String): List<CodexSkillReference> {
        return CodexSlashRegistry.extractSkillTokens(text).map { token ->
            CodexSkillReference(
                name = token.name,
                path = token.path
            )
        }
    }

    private fun buildMessageAttachmentSummary(
        attachment: CodexPendingImageAttachment
    ): CodexMessageAttachment {
        val isLocalImage = attachment.type == "localImage"
        return CodexMessageAttachment(
            kind = "image",
            label = attachment.label,
            path = null,
            // Keep the data URL in the local message projection so the just-sent
            // history chip remains openable before the server canonicalizes it.
            url = attachment.url,
            source = if (isLocalImage) "local" else "remote",
            dedupeKey = if (isLocalImage) {
                buildAttachmentDedupeKey(attachment.url.ifBlank { attachment.label })
            } else {
                null
            }
        )
    }

    private fun buildAttachmentDedupeKey(value: String?): String {
        val normalized = value?.trim().orEmpty()
        if (normalized.isEmpty()) {
            return ""
        }
        var hash = 0x811C9DC5.toInt()
        normalized.forEach { char ->
            hash = hash xor char.code
            hash *= 16777619
        }
        return "k${Integer.toUnsignedString(hash, 16)}"
    }

    private fun buildAttachmentLabel(preferred: String?, fallbackPath: String?): String {
        val preferredTrimmed = preferred?.trim().orEmpty()
        if (preferredTrimmed.isNotEmpty()) {
            return preferredTrimmed
        }
        val fallbackTrimmed = fallbackPath?.trim().orEmpty()
        if (fallbackTrimmed.isEmpty()) {
            return "Image"
        }
        return fallbackTrimmed.substringAfterLast('/').substringAfterLast('\\').ifBlank { fallbackTrimmed }
    }

    private fun extractAttachmentSummaryLines(text: String): List<CodexMessageAttachment> {
        if (text.isBlank()) return emptyList()
        return text.lineSequence()
            .mapNotNull { line ->
                val trimmed = line.trim()
                when {
                    trimmed.startsWith("[image] ", ignoreCase = true) -> {
                        val value = trimmed.substringAfter(']').trim()
                        val isUri = value.startsWith("http://", ignoreCase = true) ||
                            value.startsWith("https://", ignoreCase = true) ||
                            value.startsWith("data:", ignoreCase = true) ||
                            value.startsWith("content:", ignoreCase = true) ||
                            value.startsWith("file:", ignoreCase = true)
                        CodexMessageAttachment(
                            kind = "image",
                            label = value,
                            path = value.takeUnless { isUri },
                            url = value.takeIf { isUri },
                            source = if (isUri) "remote" else "local"
                        )
                    }
                    trimmed.startsWith("[image-url] ", ignoreCase = true) -> {
                        val value = trimmed.substringAfter(']').trim()
                        CodexMessageAttachment(
                            kind = "image",
                            label = value,
                            url = value,
                            source = "remote"
                        )
                    }
                    else -> null
                }
            }
            .distinctBy { attachment ->
                listOf(
                    attachment.kind.trim().lowercase(),
                    attachment.path.orEmpty().trim().lowercase(),
                    attachment.url.orEmpty().trim().lowercase(),
                    attachment.label.trim().lowercase()
                ).joinToString("::")
            }
            .toList()
    }

    private fun stripCommittedMentionToken(text: String, token: String): String {
        if (token.isBlank()) return text
        val result = StringBuilder(text.length)
        var cursor = 0
        while (cursor < text.length) {
            val matchIndex = text.indexOf(token, cursor)
            if (matchIndex == -1) {
                result.append(text, cursor, text.length)
                break
            }
            val tokenEnd = matchIndex + token.length
            result.append(text, cursor, matchIndex)
            if (isCommittedMentionBoundary(text, matchIndex, tokenEnd)) {
                cursor = tokenEnd
            } else {
                result.append(token)
                cursor = tokenEnd
            }
        }
        return result.toString()
    }

    private fun isCommittedMentionBoundary(text: String, start: Int, end: Int): Boolean {
        val validStart = start == 0 || text[start - 1].isWhitespace()
        val validEnd = end == text.length ||
            text[end].isWhitespace() ||
            text[end] in charArrayOf(',', '.', ';', ':', '，', '。', '、', '；', '：', ')', ']', '}')
        return validStart && validEnd
    }

    // ── Internal observers ────────────────────────────────────────────

    private fun observeConnectionState() {
        viewModelScope.launch {
            connectionManager.connectionState.collect { nextState ->
                val previousState = _uiState.value.connectionState
                if (previousState != nextState) {
                    PersistentDiagnosticLog.event(
                        "codex",
                        "android.codex.connection.state_changed",
                        mapOf("from" to previousState.name, "to" to nextState.name),
                        critical = true
                    )
                }
                _uiState.update { current ->
                    syncExecutionWatch(
                        current.copy(
                            connectionState = nextState,
                            errorMessage = if (
                                nextState != ConnectionState.ERROR &&
                                isTransientConnectionMessage(current.errorMessage)
                            ) {
                                null
                            } else {
                                current.errorMessage
                            }
                        ),
                        markActivity = nextState != current.connectionState
                    )
                }
                if (nextState == ConnectionState.CONNECTED) {
                    val state = _uiState.value
                    maybeRequestLaunchHydrate(state.threadId)
                    maybeRequestPendingThreadResync(
                        threadId = state.threadId,
                        status = state.status,
                        currentTurnId = state.currentTurnId
                    )
                }
            }
        }
    }

    private fun observeWsEvents() {
        viewModelScope.launch {
            connectionManager.wsClient.events.collect { event ->
                try {
                    when (event) {
                        is WsEvent.Opened -> {
                            connectionManager.onConnected()
                            if (_uiState.value.ipcOnline) {
                                beginAwaitingFreshIpcSurface()
                            }
                            subscribeActiveConversationIfNeeded()
                        }
                        is WsEvent.Message -> {
                            if (shouldPromoteConnectionStateFromWebSocketMessage(
                                    connectionState = _uiState.value.connectionState
                                )) {
                                connectionManager.onConnected()
                                subscribeActiveConversationIfNeeded()
                            }
                            handleEnvelope(event.envelope)
                        }
                        is WsEvent.Closed -> {
                            markPendingThreadResyncIfNeeded(_uiState.value)
                            if (event.code == 4404 || event.reason.contains("Session not found or expired", ignoreCase = true)) {
                                val message = "Session not found or expired"
                _uiState.update {
                    it.copy(
                        errorMessage = message,
                        sessionExpired = true,
                        currentTurnId = null,
                        executionWatch = CodexExecutionWatchState()
                    )
                }
                            }
                            connectionManager.onDisconnected()
                        }
                        is WsEvent.Closing -> { /* handled by Closed */ }
                        is WsEvent.Failure -> {
                            markPendingThreadResyncIfNeeded(_uiState.value)
                            val message = event.throwable.message ?: "WebSocket failure"
                            if (isTransientWebSocketFailure(message, event.code)) {
                                _uiState.update { state ->
                                    if (isTransientConnectionMessage(state.errorMessage)) {
                                        state.copy(errorMessage = null)
                                    } else {
                                        state
                                    }
                                }
                            } else {
                                appendMessage(ChatMessage.Role.ERROR, message)
                                _uiState.update {
                                    it.copy(
                                        errorMessage = message,
                                        currentTurnId = null,
                                        planWorkflow = buildEmptyPlanWorkflowState(),
                                        executionWatch = CodexExecutionWatchState(),
                                        runtimePanel = it.runtimePanel.copy(
                                            warning = message,
                                            warningTone = "error"
                                        )
                                    )
                                }
                            }
                            connectionManager.onDisconnected()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing WS event: ${event::class.simpleName}", e)
                }
            }
        }
    }

    private fun subscribeActiveConversationIfNeeded() {
        val conversationId = _uiState.value.activeConversationId?.trim().orEmpty()
        if (conversationId.isEmpty()) return
        Log.i(TAG, "[ipc][subscribe-active-conversation] subscribing to conversationId=$conversationId")
        connectionManager.send(CodexClientMessages.setActiveConversation(conversationId))
    }

    private fun handleEnvelope(envelope: CodexWsEnvelope) {
        val json = envelope.raw
        when (envelope.type) {
            "session_info" -> {
                val info = SessionInfo.from(json)
                var conversationToSubscribe: String? = null
                val previousThreadId = _uiState.value.threadId.orEmpty()
                val previousActiveConvId = _uiState.value.activeConversationId.orEmpty()
                val boundThreadId = normalizeThreadId(info.lastCodexThreadId)
                val condBoundThreadId = boundThreadId != null
                val condThreadIdBlank = _uiState.value.threadId.isNullOrBlank()
                val condActiveConvBlank = _uiState.value.activeConversationId.isNullOrBlank()
                val shouldAdoptBoundThread = condBoundThreadId && condThreadIdBlank && condActiveConvBlank
                Log.i(TAG, "[ipc][session-info][decision] boundThreadId=${boundThreadId.orEmpty()} " +
                    "cond:boundThreadId=$condBoundThreadId threadIdBlank=$condThreadIdBlank activeConvBlank=$condActiveConvBlank " +
                    "→ shouldAdopt=$shouldAdoptBoundThread " +
                    "previousThreadId=$previousThreadId previousActiveConv=$previousActiveConvId")
                _uiState.update {
                    if (shouldAdoptBoundThread) {
                        conversationToSubscribe = boundThreadId
                    }
                    syncExecutionWatch(
                        it.copy(
                            sessionId = info.sessionId,
                            sessionName = info.sessionName,
                            cwd = info.cwd ?: it.cwd,
                            threadId = if (shouldAdoptBoundThread) boundThreadId else it.threadId,
                            activeConversationId = if (shouldAdoptBoundThread) {
                                boundThreadId
                            } else {
                                it.activeConversationId
                            }
                        ),
                        markActivity = false
                    )
                }
                conversationToSubscribe?.let { conversationId ->
                    connectionManager.send(CodexClientMessages.setActiveConversation(conversationId))
                }
                val didAdopt = shouldAdoptBoundThread
                Log.i(TAG, "[session-info] sessionReady: " +
                    "sessionId=${info.sessionId} " +
                    "sessionName=${info.sessionName} " +
                    "lastCodexThreadId=${info.lastCodexThreadId.orEmpty()} " +
                    "boundThreadId=${boundThreadId.orEmpty()} " +
                    "didAdopt=$didAdopt " +
                    "previousActiveConversationId=$previousActiveConvId " +
                    "activeConversationId=${_uiState.value.activeConversationId.orEmpty()} " +
                    "cwd=${info.cwd.orEmpty()}")
            }

            "codex_capabilities" -> {
                val caps = CodexCapabilities.from(json)
                _uiState.update {
                    syncExecutionWatch(
                        recalculateNextTurnEffectiveConfig(
                            it.copy(
                                capabilities = caps,
                                model = caps.defaultModel.ifBlank { it.model },
                                reasoningEffort = caps.defaultReasoningEffort.ifBlank { it.reasoningEffort }
                            )
                        ),
                        markActivity = false
                    )
                }
                maybeRequestModelList()
                if (caps.rateLimitsRead) {
                    requestRateLimits(silent = true)
                }
                Log.i(TAG, "Capabilities: models=${caps.models}")
            }

            // ── IPC realtime sync messages ──
            "codex_ipc_status" -> {
                val status = CodexIpcStatus.from(json)
                val hadObservedStatus = ipcStatusObserved
                val wasOnline = _uiState.value.ipcOnline
                ipcStatusObserved = true
                PersistentDiagnosticLog.event(
                    "codex",
                    "android.codex.ipc.status",
                    mapOf(
                        "online" to status.online,
                        "hadObservedStatus" to hadObservedStatus,
                        "wasOnline" to wasOnline,
                        "clientIdPresent" to !status.clientId.isNullOrBlank()
                    ),
                    level = if (status.online) "info" else "warn"
                )
                _uiState.update {
                    syncExecutionWatch(
                        applyIpcStatusToUiState(it, status),
                        markActivity = false
                    )
                }
                if (status.online && (!hadObservedStatus || !wasOnline)) {
                    beginAwaitingFreshIpcSurface()
                    subscribeActiveConversationIfNeeded()
                } else if (!status.online && (!hadObservedStatus || wasOnline)) {
                    awaitingFreshIpcSurface = false
                    matchingIpcSurfaceDesynced = false
                    ipcAuthorityModeEnteredAtElapsed = SystemClock.elapsedRealtime()
                    lastRecoveryReadAtElapsed = 0L
                    runForegroundRecoveryTick(SystemClock.elapsedRealtime())
                }
                Log.i(TAG, "[ipc][status] " +
                    "online=${status.online} " +
                    "hadObservedStatus=$hadObservedStatus " +
                    "wasOnline=$wasOnline " +
                    "clientId=${status.clientId.orEmpty()} " +
                    "activeConversationId=${_uiState.value.activeConversationId.orEmpty()}")
            }

            "codex_ipc_conversations" -> {
                val conversations = CodexIpcConversationSummary.listFrom(json)
                var conversationToSubscribe: String? = null
                val previousConversationId = _uiState.value.activeConversationId?.trim().orEmpty()
                val currentThreadId = _uiState.value.threadId?.trim().orEmpty()
                val currentCwd = _uiState.value.cwd
                val requiresExactSelection = shouldRequireExactIpcConversationSelection(
                    pinnedConversationId = pinnedIpcConversationId,
                    activeConversationId = previousConversationId,
                    threadId = currentThreadId
                )
                // Trace selection reasoning
                val matchReason: String
                val selected: CodexIpcConversationSummary? = selectIpcConversationForUi(
                    conversations = conversations,
                    activeConversationId = previousConversationId,
                    threadId = currentThreadId,
                    cwd = currentCwd,
                    awaitingNewThreadIpcSurface = _uiState.value.awaitingNewThreadIpcSurface ||
                        requiresExactSelection
                )
                matchReason = when {
                    selected == null -> "none"
                    selected.conversationId == previousConversationId -> "exact-activeConversationId"
                    selected.conversationId == currentThreadId -> "threadId-match"
                    selected.cwd != null && currentCwd != null &&
                        selected.cwd.trim().replace('\\', '/').trimEnd('/').lowercase() ==
                        currentCwd.trim().replace('\\', '/').trimEnd('/').lowercase() -> "cwd-match"
                    selected.hasActiveGoal -> "hasActiveGoal"
                    else -> "fallback-most-recent"
                }
                PersistentDiagnosticLog.event(
                    "codex",
                    "android.codex.ipc.conversation_selection",
                    mapOf(
                        "conversationCount" to conversations.size,
                        "selected" to (selected != null),
                        "matchReason" to matchReason,
                        "requiresExactSelection" to requiresExactSelection
                    )
                )
                _uiState.update { current ->
                    val preferred = selected
                    if (preferred == null) {
                        if (current.awaitingNewThreadIpcSurface || requiresExactSelection) {
                            conversationToSubscribe = current.activeConversationId?.trim()
                                ?.takeIf { it.isNotEmpty() }
                                ?: current.threadId?.trim()?.takeIf { it.isNotEmpty() }
                            current
                        } else {
                            clearIpcConversationSelectionFromUiState(current)
                        }
                    } else if (
                        preferred.conversationId == current.activeConversationId?.trim().orEmpty() &&
                        !current.awaitingNewThreadIpcSurface
                    ) {
                        applyIpcConversationSelectionWithRememberedConfig(current, preferred)
                    } else {
                        conversationToSubscribe = preferred.conversationId
                        applyIpcConversationSelectionWithRememberedConfig(current, preferred)
                    }
                }
                val newConversationId = _uiState.value.activeConversationId?.trim().orEmpty()
                val targetChanged = newConversationId.isNotEmpty() && previousConversationId != newConversationId
                val switched = previousConversationId.isNotEmpty() && targetChanged
                if (targetChanged) {
                    beginAwaitingFreshIpcSurface()
                }
                Log.i(TAG, "[ipc][conversations-received] " +
                    "conversationCount=${conversations.size} " +
                    "availableIds=${conversations.map { it.conversationId }} " +
                    "selectedId=$newConversationId " +
                    "previousId=$previousConversationId " +
                    "matchReason=$matchReason " +
                    "switched=$switched " +
                    "willSubscribe=${conversationToSubscribe != null}")
                if (!switched && previousConversationId.isEmpty() && newConversationId.isEmpty()) {
                    Log.w(TAG, "[ipc][conversations-received][no-selection] no conversation selected: " +
                        "available=${conversations.size} " +
                        "threadId=$currentThreadId " +
                        "cwd=$currentCwd " +
                        "anyHasActiveGoal=${conversations.any { it.hasActiveGoal }}")
                }
                conversationToSubscribe?.let { conversationId ->
                    Log.i(TAG, "[ipc][subscribe] sending set_active_conversation: $conversationId")
                    connectionManager.send(CodexClientMessages.setActiveConversation(conversationId))
                }
            }

            "codex_ipc_sync_event" -> {
                // Android consumes normalized conversation snapshots; raw sync events are diagnostics.
            }

            "output" -> {
                // Legacy terminal output envelope; the native Codex page consumes normalized Codex/IPC state.
            }

            "follower_mode_changed" -> {
                val mode = CodexFollowerMode.from(json)
                _uiState.update {
                    it.copy(
                        followerModeEnabled = mode.enabled,
                        followerActiveSendAllowed = mode.activeSendAllowed
                    )
                }
                if (shouldRequestActiveFollowerModeEnable(mode)) {
                    connectionManager.send(CodexClientMessages.setActiveFollowerMode(true))
                }
            }

            "conversation_surface_snapshot" -> {
                val snap = DesktopSurfaceSnapshot.from(json)
                val convId = snap.conversationId
                val activeConv = _uiState.value.activeConversationId
                val applied = convId != null && activeConv != null && convId == activeConv
                if (applied) {
                    noteMatchingIpcSurface(snap)
                    _uiState.update { current ->
                        syncExecutionWatch(
                            applyDesktopSurfaceSnapshotToUiState(current, snap),
                            markActivity = true
                        )
                    }
                }
                Log.i(TAG, "[ipc][surface-snapshot] " +
                    "conv=$convId " +
                    "activeConv=$activeConv " +
                    "applied=$applied " +
                    "status=${snap.status} " +
                    "items=${snap.items.size} " +
                    "hasPendingApproval=${snap.pendingApproval != null} " +
                    "hasPendingPlan=${snap.pendingPlanAction != null} " +
                    "hasActiveGoal=${snap.activeGoal != null} " +
                    "desynced=${snap.desynced} " +
                    "authority=${authorityModeForState(_uiState.value, convId)}")
                if (!applied && convId != null && activeConv != null) {
                    Log.w(TAG, "[ipc][mismatch] surface snapshot not applied: " +
                        "pushedConv=$convId != activeConv=$activeConv")
                }
            }

            "conversation_status_changed" -> {
                applyConversationStatusChanged(json)
                val statusJson = json.optStringOrNullCompat("status").orEmpty()
                val previousJson = json.optStringOrNullCompat("previousStatus").orEmpty()
                Log.i(TAG, "[ipc][conversation-status-changed] " +
                    "conversationId=${json.optStringOrNullCompat("conversationId").orEmpty()} " +
                    "status=$statusJson " +
                    "previousStatus=$previousJson")
            }

            "follower_route_state" -> {
                val routeConversationId = normalizeThreadId(
                    json.optStringOrNullCompat("conversationId")
                )
                val activeConversationId = normalizeThreadId(_uiState.value.activeConversationId)
                if (routeConversationId != null && routeConversationId == activeConversationId) {
                val routeState = json.optString("state", json.optString("phase", "")).trim()
                    val requestId = json.optStringOrNullCompat("clientRequestId")
                    val turnId = json.optStringOrNullCompat("turnId")
                    _uiState.update { current ->
                        current.copy(
                            followerRouteState = routeState.takeUnless {
                                it == "turn_started" || it == "failed"
                            },
                            followerRouteRequestId = requestId.takeUnless {
                                routeState == "turn_started" || routeState == "failed"
                            },
                            status = if (routeState == "turn_started") "running" else current.status,
                            currentTurnId = if (routeState == "turn_started") {
                                turnId ?: current.currentTurnId
                            } else {
                                current.currentTurnId
                            }
                        )
                    }
                    Log.i(
                        TAG,
                        "[ipc][route-state] conversationId=$routeConversationId " +
                            "requestId=${requestId.orEmpty()} state=$routeState " +
                            "authority=${json.optStringOrNullCompat("authority").orEmpty()}"
                    )
                }
            }

            "codex_thread_recovery_required" -> {
                val recoveryId = json.optStringOrNullCompat("recoveryId")
                if (!recoveryId.isNullOrBlank()) {
                    _uiState.update { current ->
                        current.copy(
                            followerRouteState = "recovery_required",
                            threadRecovery = CodexThreadRecoveryState(
                                recoveryId = recoveryId,
                                reason = json.optString("reason", "thread_recovery_required"),
                                forkAvailable = json.optBoolean("forkAvailable", false)
                            )
                        )
                    }
                }
            }

            "codex_thread_recovery_resolved" -> {
                val action = json.optString("action", "").trim()
                val draft = json.optJSONObject("draft")
                val draftOptions = draft?.optJSONObject("options")
                val draftInput = draft?.optStringOrNullCompat("input")
                val draftAttachments = draftOptions?.optJSONArray("attachments")
                    ?: draft?.optJSONArray("attachments")
                val restoredAttachments = buildList {
                    if (draftAttachments != null) {
                        for (index in 0 until draftAttachments.length()) {
                            val attachment = draftAttachments.optJSONObject(index) ?: continue
                            val url = attachment.optStringOrNullCompat("url") ?: continue
                            add(
                                CodexPendingImageAttachment(
                                    id = UUID.randomUUID().toString(),
                                    type = attachment.optString("type", "image"),
                                    label = url.substringAfterLast('/').ifBlank { "image" },
                                    url = url
                                )
                            )
                        }
                    }
                }
                _uiState.update { current ->
                    current.copy(
                        followerRouteState = null,
                        followerRouteRequestId = null,
                        threadRecovery = null,
                        composerRecoveryText = if (action == "cancel") draftInput else null,
                        pendingImageAttachments = if (action == "cancel" && restoredAttachments.isNotEmpty()) {
                            restoredAttachments
                        } else {
                            current.pendingImageAttachments
                        }
                    )
                }
            }

            "conversation_action_required" -> {
                val convId = json.optStringOrNullCompat("conversationId").orEmpty()
                val actionType = json.optString("actionType", "").trim()
                Log.i(TAG, "[ipc][action-required] " +
                    "conversationId=$convId " +
                    "actionType=$actionType " +
                    "activeConversationId=${_uiState.value.activeConversationId.orEmpty()}")
                handleConversationActionRequired(json)
            }

            "session_codex_thread_bound" -> {
                val boundSessionId = json.optStringOrNullCompat("sessionId").orEmpty()
                val conversationId = normalizeThreadId(
                    json.optStringOrNullCompat("lastCodexThreadId")
                        ?: json.optStringOrNullCompat("conversationId")
                )
                if (conversationId != null) {
                    val rememberedOverrides = loadRememberedTaskOverrides(
                        conversationId,
                        reason = "session-thread-bound"
                    )
                    val previousConversationId = _uiState.value.activeConversationId.orEmpty()
                    val appliesToCurrentSession = boundSessionId.isBlank() ||
                        boundSessionId == _uiState.value.sessionId
                    _uiState.update { current ->
                        if (boundSessionId.isNotBlank() && boundSessionId != current.sessionId) {
                            current
                        } else {
                            val switched = normalizeThreadId(current.activeConversationId) != conversationId
                            recalculateNextTurnEffectiveConfig(
                                current.copy(
                                    threadId = conversationId,
                                    activeConversationId = conversationId,
                                    ipcSurfaceSnapshot = if (switched) null else current.ipcSurfaceSnapshot,
                                    ownerCurrentCodexConfig = if (switched) null else current.ownerCurrentCodexConfig,
                                    nextTurnOverrides = overridesForConversationSwitch(
                                        currentConversationId = current.activeConversationId,
                                        targetConversationId = conversationId,
                                        currentOverrides = current.nextTurnOverrides,
                                        rememberedOverrides = rememberedOverrides
                                    )
                                )
                            )
                        }
                    }
                    if (appliesToCurrentSession) {
                        pinnedIpcConversationId = conversationId
                        if (normalizeThreadId(previousConversationId) != conversationId) {
                            if (_uiState.value.ipcOnline) {
                                beginAwaitingFreshIpcSurface()
                            }
                            subscribeActiveConversationIfNeeded()
                        }
                    }
                    Log.i(TAG, "[ipc][session-thread-bound] " +
                        "boundSessionId=$boundSessionId " +
                        "conversationId=$conversationId " +
                        "previousActiveConversationId=$previousConversationId " +
                        "switched=${previousConversationId.isNotEmpty() && previousConversationId != conversationId}")
                }
            }

            "codex_state" -> {
                val state = CodexState.from(json)
                val previousThreadId = _uiState.value.threadId
                val serverThreadId = state.threadId
                val normalizedServerThreadId = normalizeThreadId(serverThreadId)
                val rememberedServerOverrides = loadRememberedTaskOverrides(
                    normalizedServerThreadId,
                    reason = "codex-state"
                )
                val resolvesHistoryResumeHydration = normalizedServerThreadId != null &&
                    normalizedServerThreadId == pendingHistoryResumeHydrationThreadId
                val threadChanged = shouldResubscribeForCodexStateThreadChange(
                    previousThreadId = previousThreadId,
                    serverThreadId = serverThreadId
                )
                _uiState.update { current ->
                    val wasIdle = current.status.equals("idle", ignoreCase = true)
                    val isIdle = state.status.equals("idle", ignoreCase = true)
                    val nextThreadId = resolveCodexStateThreadId(
                        serverThreadId = serverThreadId,
                        activeConversationId = current.activeConversationId,
                        currentThreadId = current.threadId
                    )
                    val ipcAuthorityMode = authorityModeForState(current, nextThreadId)
                    val ipcAuthoritative = ipcAuthorityMode == IpcAuthorityMode.IPC_AUTHORITATIVE
                    val ipcSurfaceProtectsRuntime = matchingIpcSurfaceProtectsRuntimeFromCodexState(
                        ipcOnline = current.ipcOnline,
                        targetThreadId = nextThreadId,
                        surface = current.ipcSurfaceSnapshot
                    )
                    val millisSinceCanonicalActivity = if (lastCanonicalActivityAtElapsed > 0L) {
                        (SystemClock.elapsedRealtime() - lastCanonicalActivityAtElapsed).coerceAtLeast(0L)
                    } else {
                        Long.MAX_VALUE
                    }
                    val preserveCanonicalRuntime = ipcSurfaceProtectsRuntime || shouldPreserveCanonicalActivityRuntime(
                        incomingStatus = state.status,
                        currentStatus = current.status,
                        matchingOwnerSurfaceAvailable = false,
                        activityThreadId = canonicalActivityThreadId,
                        targetThreadId = nextThreadId,
                        millisSinceCanonicalActivity = millisSinceCanonicalActivity,
                        activityWindowMillis = CANONICAL_ACTIVITY_WINDOW_MILLIS
                    )
                    val ipcConversationSwitched = nextThreadId != null &&
                        normalizeThreadId(current.activeConversationId) != nextThreadId
                    // planMode is managed locally — never override from server codex_state
                    val nextPlanMode = current.planMode ?: false
                    val mergedInteractionState = mergeInteractionState(
                        current = current.interactionState,
                        incoming = state.interactionState
                    )
                    val nextState = syncExecutionWatch(
                        recalculateNextTurnEffectiveConfig(
                            current.copy(
                                status = if (preserveCanonicalRuntime) current.status else state.status,
                                model = state.model ?: current.model,
                                reasoningEffort = state.reasoningEffort ?: current.reasoningEffort,
                                sandbox = state.sandbox ?: current.sandbox,
                                planMode = nextPlanMode,
                                threadId = nextThreadId,
                                activeConversationId = nextThreadId,
                                awaitingNewThreadIpcSurface = resolveAwaitingIpcSurfaceAfterTargetState(
                                    currentlyAwaiting = current.awaitingNewThreadIpcSurface,
                                    pendingHistoryResumeThreadId = pendingHistoryResumeHydrationThreadId,
                                    incomingThreadId = normalizedServerThreadId
                                ),
                                ipcSurfaceSnapshot = if (ipcConversationSwitched) null else current.ipcSurfaceSnapshot,
                                ownerCurrentCodexConfig = if (ipcConversationSwitched) null else current.ownerCurrentCodexConfig,
                                nextTurnOverrides = overridesForConversationSwitch(
                                    currentConversationId = current.activeConversationId,
                                    targetConversationId = nextThreadId,
                                    currentOverrides = current.nextTurnOverrides,
                                    rememberedOverrides = rememberedServerOverrides
                                ),
                                currentTurnId = if (preserveCanonicalRuntime) {
                                    current.currentTurnId
                                } else {
                                    state.currentTurnId
                                },
                                currentThreadTitle = if (nextThreadId == null) {
                                    ""
                                } else {
                                    resolveCurrentThreadTitle(
                                        threadId = nextThreadId,
                                        entries = current.threadHistoryEntries,
                                        fallback = current.currentThreadTitle
                                    )
                                },
                                interactionState = mergedInteractionState,
                                cwd = state.cwd ?: current.cwd,
                                serverNextTurnConfigBase = state.nextTurnEffectiveCodexConfig,
                                pendingServerRequests = if (ipcAuthoritative) {
                                    current.pendingServerRequests
                                } else {
                                    state.pendingServerRequests.filter { request ->
                                        request.handledBy.equals("client", ignoreCase = true)
                                    }
                                },
                                submittingServerRequestIds = if (ipcAuthoritative) {
                                    current.submittingServerRequestIds
                                } else {
                                    emptySet()
                                }
                            )
                        ),
                        markActivity = true
                    )
                    // Don't finalize plan workflow during thread transitions (forceNewThread idle blip)
                    if (isIdle && !wasIdle && !threadChanged) {
                        syncExecutionWatch(finalizePlanWorkflowOnTurnSettled(nextState), markActivity = false)
                    } else {
                        nextState
                    }
                }
                if (normalizedServerThreadId != null) {
                    pinnedIpcConversationId = normalizedServerThreadId
                }
                if (resolvesHistoryResumeHydration) {
                    pendingHistoryResumeHydrationThreadId = null
                }
                if (threadChanged) {
                    beginAwaitingFreshIpcSurface()
                    Log.i(TAG, "[ipc][codex-state][thread-changed] re-subscribing: " +
                        "from=$previousThreadId to=${serverThreadId.orEmpty()}")
                    subscribeActiveConversationIfNeeded()
                }
                maybeRequestPendingThreadResync(
                    threadId = _uiState.value.threadId,
                    status = _uiState.value.status,
                    currentTurnId = _uiState.value.currentTurnId
                )
                maybeRequestLaunchHydrate(_uiState.value.threadId)
                clearPendingOptimisticNewThreadTransitionIfResolved(_uiState.value.threadId)
                if (json.has("tokenUsage")) {
                    applyTokenUsagePayload(state.tokenUsage)
                }
                if (json.has("rateLimitState")) {
                    applyRateLimitPayload(state.rateLimitState)
                }
                Log.i(TAG, "[ipc][codex-state] threadId=${_uiState.value.threadId.orEmpty()} " +
                    "activeConversationId=${_uiState.value.activeConversationId.orEmpty()} " +
                    "status=${state.status} appliedStatus=${_uiState.value.status} " +
                    "serverThreadId=${state.threadId.orEmpty()} " +
                    "ipcOnline=${_uiState.value.ipcOnline} " +
                    "note=threadId-may-differ-from-activeConversationId")
            }

            "codex_thread_ready" -> {
                val ready = CodexThreadReady.from(json)
                val readyThreadId = normalizeThreadId(ready.threadId)
                val wasAwaitingNewSurface = _uiState.value.awaitingNewThreadIpcSurface
                _uiState.update {
                    val allowThreadIdSwitch = shouldAllowOptimisticTailAcrossThreadSwitch(
                        stateThreadId = it.threadId,
                        incomingThreadId = readyThreadId
                    )
                    val transition = buildThreadReadyUiTransition(
                        readyThreadId = readyThreadId,
                        resumed = ready.resumed,
                        state = it,
                        allowThreadIdSwitch = allowThreadIdSwitch
                    )
                    syncExecutionWatch(
                        it.copy(
                            threadId = readyThreadId,
                            activeConversationId = if (it.awaitingNewThreadIpcSurface) {
                                readyThreadId
                            } else {
                                it.activeConversationId
                            },
                            currentTurnId = transition.currentTurnId,
                            messages = transition.messages,
                            runtimePanel = transition.runtimePanel,
                            currentThreadTitle = resolveCurrentThreadTitle(
                                threadId = readyThreadId,
                                entries = it.threadHistoryEntries,
                                fallback = it.currentThreadTitle
                            )
                        ),
                        markActivity = false
                    )
                }
                if (wasAwaitingNewSurface && readyThreadId != null) {
                    pinnedIpcConversationId = readyThreadId
                }
                if (readyThreadId != null) {
                    rememberCurrentTaskOverrides(reason = "thread-ready")
                }
                clearPendingOptimisticNewThreadTransitionIfResolved(readyThreadId)
                Log.i(TAG, "Thread ready: $readyThreadId resumed=${ready.resumed}")
            }

            "codex_thread_snapshot" -> {
                val snapshot = CodexThreadSnapshot.from(json)
                val snapshotThreadId = normalizeThreadId(snapshot.threadId)
                val canonicalMessages = parseSnapshotMessages(snapshot)
                clearPendingThreadResync(snapshotThreadId)
                clearPendingLaunchHydrate(snapshotThreadId)
                _uiState.update { state ->
                    val allowThreadIdSwitch = shouldAllowOptimisticTailAcrossThreadSwitch(
                        stateThreadId = state.threadId,
                        incomingThreadId = snapshotThreadId
                    )
                    val preserveLocalTail = shouldPreserveLocalMessageTail(
                        threadId = snapshotThreadId,
                        state = state,
                        allowThreadIdSwitch = allowThreadIdSwitch
                    )
                    val mergedMessages = mergeCanonicalMessages(
                        canonicalMessages = canonicalMessages,
                        currentMessages = state.messages,
                        preserveLocalTail = preserveLocalTail
                    )
                    syncExecutionWatch(
                        state.copy(
                            threadId = snapshotThreadId,
                            messages = mergedMessages,
                            currentTurnId = if (preserveLocalTail) state.currentTurnId else null,
                            currentThreadTitle = resolveCurrentThreadTitle(
                                threadId = snapshotThreadId,
                                entries = state.threadHistoryEntries,
                                fallback = state.currentThreadTitle
                            )
                        ),
                        markActivity = false
                    )
                }
                clearPendingOptimisticNewThreadTransitionIfResolved(snapshotThreadId)
                Log.i(TAG, "Thread snapshot: $snapshotThreadId msgs=${canonicalMessages.size}")
            }

            "codex_turn_ack" -> {
                val ack = CodexTurnAck.from(json)
                val ackThreadId = normalizeThreadId(ack.threadId)
                _uiState.update {
                    syncExecutionWatch(
                        it.copy(
                            threadId = ackThreadId ?: it.threadId,
                            currentTurnId = ack.turnId.ifBlank { null },
                            currentThreadTitle = if (ackThreadId == null) {
                                it.currentThreadTitle
                            } else {
                                resolveCurrentThreadTitle(
                                    threadId = ackThreadId,
                                    entries = it.threadHistoryEntries,
                                    fallback = it.currentThreadTitle
                                )
                            }
                        ),
                        markActivity = false
                    )
                }
                clearPendingOptimisticNewThreadTransitionIfResolved(ackThreadId)
                executionFeedbackSeen.clear()
                Log.d(TAG, "Turn ack: ${ack.turnId}")
            }

            "codex_interrupt_ack" -> {
                Log.d(TAG, "Interrupt ack")
                currentStreamingMessageId = null
                currentPlanStreamingMessageId = null
            }

            "follower_turn_interrupted" -> {
                Log.d(TAG, "Follower interrupt ack")
            }

            "follower_message_sent", "follower_goal_sent" -> {
                Log.d(TAG, "Follower turn accepted: ${envelope.type}")
            }

            "follower_approval_response_sent" -> {
                val requestId = json.optStringOrNullCompat("requestId").orEmpty()
                Log.i(
                    TAG,
                    "[approval][ack] requestId=$requestId " +
                        "conversationId=${json.optStringOrNullCompat("conversationId").orEmpty()}"
                )
                if (requestId.isNotEmpty()) {
                    _uiState.update { current ->
                        current.copy(
                            submittingServerRequestIds = current.submittingServerRequestIds - requestId
                        )
                    }
                }
            }

            "follower_plan_response_sent" -> {
                Log.i(
                    TAG,
                    "[plan][ack] requestId=${json.optStringOrNullCompat("requestId").orEmpty()} " +
                        "conversationId=${json.optStringOrNullCompat("conversationId").orEmpty()}"
                )
            }

            "codex_response" -> {
                val response = CodexResponse.from(json)
                handleCodexResponse(response)
            }

            "codex_error" -> {
                val error = CodexError.from(json)
                if (error.code == "CODEX_NO_ACTIVE_TURN") {
                    _uiState.update {
                        syncExecutionWatch(
                            it.copy(currentTurnId = null),
                            markActivity = false
                        )
                    }
                    Log.w(TAG, "Ignoring stale interrupt error: ${error.code} ${error.message}")
                    return
                }
                val message = "${error.code}: ${error.message}"
                appendMessage(ChatMessage.Role.ERROR, message)
                _uiState.update {
                    it.copy(
                        errorMessage = message,
                        currentTurnId = null,
                        planWorkflow = buildEmptyPlanWorkflowState(),
                        runtimePanel = it.runtimePanel.copy(
                            warning = message,
                            warningTone = "error"
                        )
                    )
                }
                Log.e(TAG, "Codex error: ${error.code} ${error.message}")
            }

            "error" -> {
                val message = json.optString("message", "Codex request failed")
                val detail = json.opt("detail")?.toString()?.takeIf { it.isNotBlank() }
                val rendered = if (detail.isNullOrBlank()) message else "$message: $detail"
                appendMessage(ChatMessage.Role.ERROR, rendered)
                _uiState.update {
                    it.copy(
                        errorMessage = rendered,
                        planWorkflow = if (message == "Failed to send plan response" &&
                            it.planWorkflow.phase == PLAN_PHASE_EXECUTING_CONFIRMED_PLAN
                        ) {
                            it.planWorkflow.copy(phase = PLAN_PHASE_READY_FOR_CONFIRMATION)
                        } else {
                            it.planWorkflow
                        },
                        runtimePanel = it.runtimePanel.copy(
                            warning = rendered,
                            warningTone = "error"
                        )
                    )
                }
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
                "permissionProfile/list" -> {
                    handlePermissionProfileListResponse(response.result)
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
        val catalog = CodexModelOption.listFrom(result)
        if (catalog.isEmpty()) {
            PersistentDiagnosticLog.event("codex", "android.codex.model_catalog.loaded", mapOf("count" to 0), level = "warn")
            return
        }
        _uiState.update { state -> applyModelCatalogToUiState(state, catalog) }
        PersistentDiagnosticLog.event("codex", "android.codex.model_catalog.loaded", mapOf("count" to catalog.size))
        Log.i(TAG, "Loaded model list: ${catalog.map(CodexModelOption::id)}")
    }

    private fun handlePermissionProfileListResponse(result: Any?) {
        val profiles = CodexPermissionProfileOption.listFrom(result)
        _uiState.update {
            it.copy(
                permissionProfiles = profiles,
                permissionProfilesLoading = false,
                permissionProfilesRequested = true
            )
        }
        PersistentDiagnosticLog.event(
            "codex",
            "android.codex.permission_catalog.loaded",
            mapOf("count" to profiles.size),
            level = if (profiles.isEmpty()) "warn" else "info"
        )
        Log.i(TAG, "Loaded permission profiles: ${profiles.map(CodexPermissionProfileOption::id)}")
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
        val params = JSONObject()
        val cwd = state.cwd?.trim().orEmpty()
        if (cwd.isNotEmpty()) {
            params.put("cwds", JSONArray().put(cwd))
        }
        connectionManager.send(CodexClientMessages.codexRequest("skills/list", params))
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
        val successMessage = detail.ifEmpty {
            appContext.getString(R.string.codex_native_tools_compact_submitted)
        }
        _uiState.update {
            it.copy(
                toolsPanel = it.toolsPanel.copy(
                    compactSubmitting = false,
                    compactStatusText = successMessage,
                    compactStatusTone = if (detail.isEmpty()) "success" else ""
                )
            )
        }
        appendMessage(ChatMessage.Role.SYSTEM, successMessage)
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
        val foregroundRecoveryFailed = method == "thread/read" &&
            foregroundRecoveryReadInFlightThreadId != null
        if (foregroundRecoveryFailed) {
            foregroundRecoveryReadInFlightThreadId = null
        }
        when (method) {
            "model/list" -> {
                if (!legacyModelListFallbackRequested) {
                    legacyModelListFallbackRequested = true
                    Log.w(TAG, "Hidden model catalog unavailable; retrying legacy model/list: $message")
                    connectionManager.send(CodexClientMessages.codexRequest("model/list"))
                } else {
                    appendMessage(ChatMessage.Role.ERROR, message)
                }
            }
            "permissionProfile/list" -> {
                _uiState.update {
                    it.copy(
                        permissionProfilesLoading = false,
                        permissionProfilesRequested = true
                    )
                }
                Log.w(TAG, "Permission profile catalog unavailable: $message")
            }
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
                appendMessage(ChatMessage.Role.ERROR, message)
            }
            "thread/read" -> {
                if (foregroundRecoveryFailed) {
                    Log.w(TAG, "Foreground thread/read recovery failed: $message")
                } else {
                    _uiState.update {
                        it.copy(
                            threadHistoryLoading = false,
                            threadHistoryActionThreadId = "",
                            threadHistoryActionKind = ""
                        )
                    }
                    appendMessage(ChatMessage.Role.ERROR, message)
                }
            }
            "thread/resume",
            "thread/fork",
            "thread/archive",
            "thread/unarchive",
            "thread/name/set" -> {
                if (method == "thread/resume") {
                    pendingHistoryResumeHydrationThreadId = null
                    pinnedIpcConversationId = _uiState.value.activeConversationId?.trim()
                        ?.takeIf { it.isNotEmpty() }
                }
                _uiState.update {
                    it.copy(
                        awaitingNewThreadIpcSurface = if (method == "thread/resume") {
                            false
                        } else {
                            it.awaitingNewThreadIpcSurface
                        },
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
        val resumedThreadId = normalizeThreadId(thread.optStringOrNullCompat("id")).orEmpty()
        val rememberedResumedOverrides = loadRememberedTaskOverrides(
            resumedThreadId,
            reason = "thread-resume"
        )
        val resumedTitle = resolveThreadTitle(thread)
        threadHadPlanTurn = false
        clearPendingOptimisticNewThreadTransition()
        clearPendingThreadResync()
        if (resumedThreadId.isNotEmpty()) {
            pinnedIpcConversationId = resumedThreadId
            if (_uiState.value.ipcOnline) {
                beginAwaitingFreshIpcSurface()
            } else {
                awaitingFreshIpcSurface = false
                matchingIpcSurfaceDesynced = false
                ipcAuthorityModeEnteredAtElapsed = SystemClock.elapsedRealtime()
                lastRecoveryReadAtElapsed = 0L
            }
            lastRecoverySubscribeAtElapsed = 0L
            foregroundRecoveryReadInFlightThreadId = null
        }
        _uiState.update { state ->
            val targetThreadId = resumedThreadId.ifEmpty { state.threadId.orEmpty() }
            val switchedConversation = targetThreadId.isNotEmpty() &&
                state.activeConversationId?.trim().orEmpty() != targetThreadId
            state.copy(
                threadId = targetThreadId.ifEmpty { state.threadId },
                activeConversationId = targetThreadId.ifEmpty { state.activeConversationId },
                awaitingNewThreadIpcSurface = shouldAwaitIpcSurfaceAfterThreadResumeResponse(
                    targetThreadId = targetThreadId,
                    pendingHydrationThreadId = pendingHistoryResumeHydrationThreadId
                ),
                ipcSurfaceSnapshot = if (switchedConversation) null else state.ipcSurfaceSnapshot,
                ownerCurrentCodexConfig = if (switchedConversation) null else state.ownerCurrentCodexConfig,
                nextTurnOverrides = if (switchedConversation) rememberedResumedOverrides else state.nextTurnOverrides,
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
            subscribeActiveConversationIfNeeded()
            runForegroundRecoveryTick(SystemClock.elapsedRealtime())
        } else {
            clearThreadHistoryAction()
        }
        if (thread.has("tokenUsage")) {
            applyTokenUsagePayload(thread.opt("tokenUsage"))
        }
        refreshThreadHistory()
    }

    private fun handleThreadReadResponse(result: Any?) {
        val foregroundRecoveryResponse = foregroundRecoveryReadInFlightThreadId != null
        val thread = extractThreadResult(result) ?: run {
            foregroundRecoveryReadInFlightThreadId = null
            if (!foregroundRecoveryResponse) {
                clearThreadHistoryAction()
            }
            return
        }
        val threadId = normalizeThreadId(thread.optStringOrNullCompat("id")).orEmpty()
        if (threadId.isNotEmpty() && foregroundRecoveryReadInFlightThreadId == threadId) {
            foregroundRecoveryReadInFlightThreadId = null
        }
        val currentThreadId = _uiState.value.threadId
        if (!shouldApplyCanonicalThreadReadResponse(currentThreadId, threadId)) {
            Log.w(
                TAG,
                "[thread/read][stale-response] ignored incomingThreadId=$threadId " +
                    "currentThreadId=${currentThreadId.orEmpty()}"
            )
            return
        }
        val ipcAuthoritativeAtResponse = authorityModeForState(
            _uiState.value,
            threadId
        ) == IpcAuthorityMode.IPC_AUTHORITATIVE
        val threadTitle = resolveThreadTitle(thread)
        val turns = thread.optJSONArray("turns")
        val latestTurn = latestCanonicalTurn(turns)
        val latestTurnId = latestTurn?.optStringOrNullCompat("id")
        val latestTurnStatus = latestTurn?.optStringOrNullCompat("status")
        val threadStatus = canonicalThreadStatusType(thread)
        val latestAgentPhase = latestCanonicalAgentPhase(latestTurn)
        val hasActiveItem = canonicalTurnHasActiveItem(latestTurn)
        val nowElapsed = SystemClock.elapsedRealtime()
        val canonicalFingerprint = latestTurn?.toString()?.hashCode()
        val normalizedReadThreadId = normalizeThreadId(threadId)
        val canonicalSnapshotChanged = if (ipcAuthoritativeAtResponse) {
            false
        } else if (canonicalActivityThreadId != normalizedReadThreadId) {
            canonicalActivityThreadId = normalizedReadThreadId
            canonicalLatestTurnFingerprint = canonicalFingerprint
            lastCanonicalActivityAtElapsed = if (
                canonicalAgentPhaseIndicatesActivity(latestAgentPhase)
            ) {
                nowElapsed
            } else {
                0L
            }
            false
        } else {
            val changed = canonicalLatestTurnFingerprint != null &&
                canonicalFingerprint != null &&
                canonicalLatestTurnFingerprint != canonicalFingerprint
            canonicalLatestTurnFingerprint = canonicalFingerprint
            if (changed) lastCanonicalActivityAtElapsed = nowElapsed
            changed
        }
        if (!ipcAuthoritativeAtResponse &&
            (latestAgentPhase.equals("final_answer", ignoreCase = true) ||
                latestAgentPhase.equals("final", ignoreCase = true))) {
            lastCanonicalActivityAtElapsed = 0L
        }
        val millisSinceCanonicalChange = if (lastCanonicalActivityAtElapsed > 0L) {
            (nowElapsed - lastCanonicalActivityAtElapsed).coerceAtLeast(0L)
        } else {
            Long.MAX_VALUE
        }
        val hasTurns = turns != null
        val messages = if (hasTurns) {
            parseThreadTurns(turns)
        } else {
            parseThreadMessages(thread.optJSONArray("messages"))
        }
        val hasMessages = hasTurns || thread.optJSONArray("messages") != null
        val resolvesHistoryResumeHydration = threadId.isNotEmpty() &&
            threadId == pendingHistoryResumeHydrationThreadId
        clearPendingThreadResync(threadId)
        clearPendingLaunchHydrate(threadId)
        _uiState.update { state ->
            val ipcAuthoritative = authorityModeForState(
                state,
                threadId
            ) == IpcAuthorityMode.IPC_AUTHORITATIVE
            val completesHistoryResume = hasMessages &&
                state.threadHistoryActionKind == "resume" &&
                (state.threadHistoryActionThreadId.isBlank() || state.threadHistoryActionThreadId == threadId)
            val transition = if (hasMessages && ipcAuthoritative) {
                ThreadReadMergeTransition(
                    threadId = threadId.ifEmpty { state.threadId },
                    currentTurnId = state.currentTurnId,
                    messages = mergeCanonicalStaticMetadataIntoAuthoritativeMessages(
                        authoritativeMessages = state.messages,
                        canonicalMessages = messages
                    )
                )
            } else if (hasMessages) {
                buildThreadReadMergeTransition(
                    incomingThreadId = threadId,
                    canonicalMessages = messages,
                    state = state
                )
            } else {
                ThreadReadMergeTransition(
                    threadId = threadId.ifEmpty { state.threadId },
                    currentTurnId = state.currentTurnId,
                    messages = state.messages
                )
            }
            val matchingOwnerSurfaceAvailable = ipcAuthoritative
            val runtimeProjection = projectCanonicalTurnRuntime(
                threadStatus = threadStatus,
                turnStatus = latestTurnStatus,
                turnId = latestTurnId,
                matchingOwnerSurfaceAvailable = matchingOwnerSurfaceAvailable,
                hasActiveItem = hasActiveItem,
                latestAgentPhase = latestAgentPhase,
                canonicalSnapshotChanged = canonicalSnapshotChanged,
                millisSinceCanonicalChange = millisSinceCanonicalChange,
                activityWindowMillis = CANONICAL_ACTIVITY_WINDOW_MILLIS
            )
            state.copy(
                threadId = transition.threadId,
                awaitingNewThreadIpcSurface = if (resolvesHistoryResumeHydration) {
                    false
                } else {
                    state.awaitingNewThreadIpcSurface
                },
                status = runtimeProjection?.status ?: state.status,
                currentTurnId = if (runtimeProjection != null) {
                    runtimeProjection.currentTurnId
                } else {
                    transition.currentTurnId
                },
                currentThreadTitle = threadTitle.ifBlank {
                    resolveCurrentThreadTitle(
                        threadId = transition.threadId,
                        entries = state.threadHistoryEntries,
                        fallback = state.currentThreadTitle
                    )
                },
                messages = transition.messages,
                runtimePanel = when {
                    ipcAuthoritative -> state.runtimePanel
                    hasTurns -> buildRuntimePanelStateFromTurns(
                        turns = turns,
                        visible = state.runtimePanel.visible
                    )
                    hasMessages -> buildEmptyRuntimePanelState(visible = state.runtimePanel.visible)
                    else -> state.runtimePanel
                },
                noticesPanel = when {
                    ipcAuthoritative -> state.noticesPanel
                    hasTurns -> buildNoticesPanelStateFromTurns(
                        turns = turns,
                        visible = state.noticesPanel.visible
                    )
                    hasMessages -> CodexNoticesPanelState(visible = state.noticesPanel.visible)
                    else -> state.noticesPanel
                },
                threadHistorySheetVisible = if (completesHistoryResume) false else state.threadHistorySheetVisible,
                threadHistoryActionThreadId = if (completesHistoryResume) "" else state.threadHistoryActionThreadId,
                threadHistoryActionKind = if (completesHistoryResume) "" else state.threadHistoryActionKind,
                threadRenameTargetId = if (completesHistoryResume) "" else state.threadRenameTargetId,
                threadRenameDraft = if (completesHistoryResume) "" else state.threadRenameDraft
            )
        }
        val appliedState = _uiState.value
        val matchingOwnerSurfaceAvailable =
            authorityModeForState(appliedState, threadId) == IpcAuthorityMode.IPC_AUTHORITATIVE
        val runtimeProjection = projectCanonicalTurnRuntime(
            threadStatus = threadStatus,
            turnStatus = latestTurnStatus,
            turnId = latestTurnId,
            matchingOwnerSurfaceAvailable = matchingOwnerSurfaceAvailable,
            hasActiveItem = hasActiveItem,
            latestAgentPhase = latestAgentPhase,
            canonicalSnapshotChanged = canonicalSnapshotChanged,
            millisSinceCanonicalChange = millisSinceCanonicalChange,
            activityWindowMillis = CANONICAL_ACTIVITY_WINDOW_MILLIS
        )
        Log.i(
            TAG,
            "[runtime][thread-read] threadId=$threadId latestTurnId=${latestTurnId.orEmpty()} " +
                "threadStatus=${threadStatus.orEmpty()} latestTurnStatus=${latestTurnStatus.orEmpty()} " +
                "latestAgentPhase=${latestAgentPhase.orEmpty()} activeItem=$hasActiveItem " +
                "snapshotChanged=$canonicalSnapshotChanged millisSinceChange=$millisSinceCanonicalChange " +
                "matchingOwnerSurface=$matchingOwnerSurfaceAvailable " +
                "projectedStatus=${runtimeProjection?.status ?: "preserved"} " +
                "source=${runtimeProjection?.source ?: "preserved"}"
        )
        if (resolvesHistoryResumeHydration) {
            pendingHistoryResumeHydrationThreadId = null
        }
        if (thread.has("tokenUsage")) {
            applyTokenUsagePayload(thread.opt("tokenUsage"))
        }
    }

    private fun normalizeThreadId(threadId: String?): String? {
        return normalizeCodexThreadId(threadId)
    }

    private fun shouldPreserveLocalMessageTail(
        threadId: String?,
        state: CodexUiState,
        allowThreadIdSwitch: Boolean = false
    ): Boolean {
        // Snapshot can arrive before turn ack. Keep the optimistic user tail
        // until the canonical thread state catches up so the sent message
        // does not disappear mid-turn.
        return shouldPreserveLocalMessageTailForUi(
            threadId = threadId,
            state = state,
            allowThreadIdSwitch = allowThreadIdSwitch
        )
    }

    private fun mergeCanonicalMessages(
        canonicalMessages: List<ChatMessage>,
        currentMessages: List<ChatMessage>,
        preserveLocalTail: Boolean
    ): List<ChatMessage> {
        return mergeCanonicalMessagesForUi(
            canonicalMessages = canonicalMessages,
            currentMessages = currentMessages,
            preserveLocalTail = preserveLocalTail
        )
    }

    private fun mergeCanonicalUserMessageMetadata(
        canonical: ChatMessage,
        local: ChatMessage
    ): ChatMessage {
        return mergeCanonicalUserMessageMetadataForUi(canonical, local)
    }

    private fun shouldPreserveTailMessage(message: ChatMessage): Boolean {
        return shouldPreserveCodexTailMessage(message)
    }

    private fun messagesEquivalentForConvergence(
        left: ChatMessage,
        right: ChatMessage
    ): Boolean = messagesEquivalentForConvergenceForUi(left, right)

    private fun messageConvergenceKey(message: ChatMessage): String = messageConvergenceKeyForUi(message)

    private fun markPendingThreadResyncIfNeeded(state: CodexUiState) {
        val threadId = normalizeThreadId(state.threadId) ?: return
        val shouldResync = !state.currentTurnId.isNullOrBlank() ||
            state.status.equals("running", ignoreCase = true) ||
            state.executionWatch.active
        if (!shouldResync) {
            return
        }
        pendingThreadResyncThreadId = threadId
        if (threadResyncInFlightThreadId != threadId) {
            threadResyncInFlightThreadId = null
        }
    }

    private fun clearPendingThreadResync(threadId: String? = null) {
        val normalized = normalizeThreadId(threadId)
        if (normalized == null) {
            pendingThreadResyncThreadId = null
            threadResyncInFlightThreadId = null
            return
        }
        if (pendingThreadResyncThreadId == normalized) {
            pendingThreadResyncThreadId = null
        }
        if (threadResyncInFlightThreadId == normalized) {
            threadResyncInFlightThreadId = null
        }
    }

    private fun shouldAllowOptimisticTailAcrossThreadSwitch(
        stateThreadId: String?,
        incomingThreadId: String?
    ): Boolean {
        val pendingSourceThreadId = normalizeThreadId(pendingOptimisticNewThreadSourceThreadId)
            ?: return false
        val normalizedStateThreadId = normalizeThreadId(stateThreadId)
        val normalizedIncomingThreadId = normalizeThreadId(incomingThreadId)
        return normalizedStateThreadId == pendingSourceThreadId &&
            normalizedIncomingThreadId != null &&
            normalizedIncomingThreadId != pendingSourceThreadId
    }

    private fun clearPendingOptimisticNewThreadTransition() {
        pendingOptimisticNewThreadSourceThreadId = null
    }

    private fun clearPendingOptimisticNewThreadTransitionIfResolved(observedThreadId: String?) {
        val pendingSourceThreadId = normalizeThreadId(pendingOptimisticNewThreadSourceThreadId)
            ?: return
        val normalizedObservedThreadId = normalizeThreadId(observedThreadId) ?: return
        if (normalizedObservedThreadId != pendingSourceThreadId) {
            pendingOptimisticNewThreadSourceThreadId = null
        }
    }

    private fun maybeRequestPendingThreadResync(
        threadId: String?,
        status: String?,
        currentTurnId: String?
    ) {
        val normalizedThreadId = normalizeThreadId(threadId) ?: return
        if (pendingThreadResyncThreadId != normalizedThreadId) {
            return
        }
        if (!currentTurnId.isNullOrBlank()) {
            return
        }
        if (!status.equals("idle", ignoreCase = true)) {
            return
        }
        if (threadResyncInFlightThreadId == normalizedThreadId) {
            return
        }
        runForegroundRecoveryTick(SystemClock.elapsedRealtime())
    }

    private fun maybeRequestLaunchHydrate(observedThreadId: String?) {
        val targetThreadId = resolveLaunchHydrateThreadRequest(
            pendingLaunchHydrate = launchHydratePending,
            requestedThreadId = launchHydrateTargetThreadId,
            observedThreadId = observedThreadId,
            inFlightThreadId = launchHydrateInFlightThreadId
        ) ?: return
        if (normalizeThreadId(_uiState.value.threadId) != targetThreadId) return
        runForegroundRecoveryTick(SystemClock.elapsedRealtime())
    }

    private fun clearPendingLaunchHydrate(threadId: String? = null) {
        val normalizedThreadId = normalizeThreadId(threadId)
        if (normalizedThreadId == null) {
            launchHydratePending = false
            launchHydrateTargetThreadId = null
            launchHydrateInFlightThreadId = null
            return
        }
        val targetThreadId = normalizeThreadId(launchHydrateTargetThreadId)
        val inFlightThreadId = normalizeThreadId(launchHydrateInFlightThreadId)
        if (targetThreadId == null || targetThreadId == normalizedThreadId || inFlightThreadId == normalizedThreadId) {
            launchHydratePending = false
            launchHydrateTargetThreadId = normalizedThreadId
            launchHydrateInFlightThreadId = null
        }
    }

    private fun requestCanonicalThreadRead(threadId: String?, reason: String): Boolean {
        val normalizedThreadId = normalizeThreadId(threadId) ?: return false
        logNotificationTrace("request", "thread/read reason=$reason threadId=$normalizedThreadId")
        return connectionManager.send(
            CodexClientMessages.codexRequest(
                action = "thread/read",
                params = JSONObject()
                    .put("threadId", normalizedThreadId)
                    .put("includeTurns", true)
            )
        )
    }

    private fun requestForegroundRecoveryThreadRead(threadId: String?, reason: String): Boolean {
        val normalizedThreadId = normalizeThreadId(threadId) ?: return false
        if (foregroundRecoveryReadInFlightThreadId == normalizedThreadId) return false
        val sent = requestCanonicalThreadRead(normalizedThreadId, reason)
        if (sent) {
            foregroundRecoveryReadInFlightThreadId = normalizedThreadId
        }
        return sent
    }

    private fun scheduleCanonicalThreadRead(
        threadId: String?,
        delayMillis: Long = 250L
    ) {
        val normalizedThreadId = normalizeThreadId(threadId) ?: return
        viewModelScope.launch {
            delay(delayMillis)
            val state = _uiState.value
            if (!state.currentTurnId.isNullOrBlank()) {
                return@launch
            }
            if (normalizeThreadId(state.threadId) != normalizedThreadId) {
                return@launch
            }
            runForegroundRecoveryTick(SystemClock.elapsedRealtime())
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
            threadId = normalizeThreadId(_uiState.value.threadId).orEmpty(),
            messages = messages ?: JSONArray()
        )
        return parseSnapshotMessages(snapshot)
    }

    private fun parseThreadTurns(turns: JSONArray?): List<ChatMessage> {
        if (turns == null) {
            return emptyList()
        }
        val result = mutableListOf<ChatMessage>()
        val collapsibleTurnIds = mutableSetOf<String>()
        for (turnIndex in 0 until turns.length()) {
            val turn = turns.optJSONObject(turnIndex) ?: continue
            val items = turn.optJSONArray("items") ?: continue
            val turnId = turn.optStringOrNullCompat("id")
                ?: turn.optStringOrNullCompat("turnId")
            if (isTerminalTurnStatusForUi(turn.optStringOrNullCompat("status"))) {
                turnId?.takeIf { it.isNotBlank() }?.let(collapsibleTurnIds::add)
            }
            for (itemIndex in 0 until items.length()) {
                val item = items.optJSONObject(itemIndex) ?: continue
                when (item.optString("type", "")) {
                    "userMessage" -> {
                        val text = extractUserMessageText(item)
                        val fileMentions = extractUserMessageFileMentions(
                            content = item.optJSONArray("content"),
                            fallbackText = text
                        )
                        val skills = extractUserMessageSkills(
                            content = item.optJSONArray("content"),
                            fallbackText = text
                        )
                        val attachments = extractUserMessageAttachments(
                            content = item.optJSONArray("content"),
                            fallbackText = text
                        )
                        val activeSkill = skills.firstOrNull()?.name
                        val visibleText = buildVisibleUserMessageText(text)
                        if (visibleText.isNotEmpty() || fileMentions.isNotEmpty() || skills.isNotEmpty() || attachments.isNotEmpty()) {
                            result.add(
                                ChatMessage(
                                    id = item.optString("id", UUID.randomUUID().toString()),
                                    role = ChatMessage.Role.USER,
                                    content = visibleText,
                                    fileMentions = fileMentions,
                                    activeSkill = activeSkill,
                                    skills = skills,
                                    attachments = attachments
                                )
                            )
                        }
                    }
                    "agentMessage" -> {
                        if (isRuntimeOnlyAgentMessage(item)) {
                            continue
                        }
                        result.add(
                            ChatMessage(
                                id = item.optString("id", UUID.randomUUID().toString()),
                                role = ChatMessage.Role.ASSISTANT,
                                content = item.optString("text", "")
                            )
                        )
                    }
                    "commandExecution", "fileChange", "mcpToolCall" -> {
                        canonicalOperationMessageForUi(
                            item = item,
                            turnId = turnId,
                            itemIndex = itemIndex
                        )?.let(result::add)
                    }
                    "imageView" -> {
                        canonicalImageViewMessageForUi(
                            item = item,
                            turnId = turnId,
                            itemIndex = itemIndex
                        )?.let(result::add)
                    }
                }
                maybeRequestModelList()
            }
        }
        return collapseCompletedCommandBatchesForUi(result, collapsibleTurnIds)
    }

    private fun isTerminalTurnStatusForUi(status: String?): Boolean =
        status?.trim()?.lowercase() in setOf(
            "completed", "complete", "done", "finished", "failed", "error",
            "cancelled", "canceled", "interrupted"
        )

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

    private fun extractUserMessageFileMentions(
        content: JSONArray?,
        fallbackText: String = ""
    ): List<FileMention> {
        val structured = mutableListOf<FileMention>()
        content?.let { parts ->
            for (index in 0 until parts.length()) {
                val part = parts.optJSONObject(index) ?: continue
                val type = part.optString("type", "")
                if (type in setOf("mention", "fileMention", "file_mention", "file")) {
                    val path = part.optStringOrNullCompat("path")
                        ?: part.optStringOrNullCompat("filePath")
                        ?: continue
                    structured += buildFileMentionFromPath(
                        path = path,
                        labelOverride = part.optStringOrNullCompat("label")
                            ?: part.optStringOrNullCompat("displayName")
                    )
                }
            }
        }
        return if (structured.isNotEmpty()) {
            structured.distinctBy { it.path }
        } else {
            extractLeadingFileMentions(CodexSlashRegistry.stripSkillTokens(fallbackText))
        }
    }

    private fun extractUserMessageActiveSkill(content: JSONArray?): String? {
        content ?: return null
        for (index in 0 until content.length()) {
            val part = content.optJSONObject(index) ?: continue
            if (part.optString("type", "") == "skill") {
                val skillName = part.optStringOrNullCompat("name")
                    ?: part.optStringOrNullCompat("toolName")
                if (!skillName.isNullOrBlank()) {
                    return skillName
                }
            }
        }
        return null
    }

    private fun extractUserMessageSkills(
        content: JSONArray?,
        fallbackText: String = ""
    ): List<CodexSkillReference> {
        val structured = mutableListOf<CodexSkillReference>()
        content?.let { parts ->
            for (index in 0 until parts.length()) {
                val part = parts.optJSONObject(index) ?: continue
                if (part.optString("type", "") == "skill") {
                    val skillName = part.optStringOrNullCompat("name")
                        ?: part.optStringOrNullCompat("toolName")
                        ?: continue
                    structured += CodexSkillReference(
                        name = skillName,
                        path = part.optStringOrNullCompat("path")
                    )
                }
            }
        }
        val tokenSkills = extractSkillReferencesFromText(fallbackText)
        return (structured + tokenSkills).distinctBy { skill ->
            "${skill.name.trim().lowercase()}::${skill.path.orEmpty().trim().lowercase()}"
        }
    }

    private fun extractUserMessageAttachments(
        content: JSONArray?,
        fallbackText: String = ""
    ): List<CodexMessageAttachment> {
        val structured = mutableListOf<CodexMessageAttachment>()
        content?.let { parts ->
            for (index in 0 until parts.length()) {
                val part = parts.optJSONObject(index) ?: continue
                when (part.optString("type", "")) {
                    "image", "image_url", "input_image" -> {
                        val url = part.optStringOrNullCompat("url")
                            ?: part.optStringOrNullCompat("imageUrl")
                            ?: continue
                        structured += CodexMessageAttachment(
                            kind = "image",
                            label = buildAttachmentLabel(
                                preferred = part.optStringOrNullCompat("label")
                                    ?: part.optStringOrNullCompat("name"),
                                fallbackPath = url
                            ),
                            url = url,
                            source = "remote"
                        )
                    }
                    "localImage" -> {
                        val path = part.optStringOrNullCompat("path")
                            ?: part.optStringOrNullCompat("url")
                            ?: continue
                        structured += CodexMessageAttachment(
                            kind = "image",
                            label = buildAttachmentLabel(
                                preferred = part.optStringOrNullCompat("label")
                                    ?: part.optStringOrNullCompat("name"),
                                fallbackPath = path
                            ),
                            path = path,
                            source = "local",
                            dedupeKey = buildAttachmentDedupeKey(path)
                        )
                    }
                }
            }
        }
        return if (structured.isNotEmpty()) {
            structured.distinctBy { attachment ->
                listOf(
                    attachment.kind.trim().lowercase(),
                    attachment.path.orEmpty().trim().lowercase(),
                    attachment.url.orEmpty().trim().lowercase(),
                    attachment.label.trim().lowercase()
                ).joinToString("::")
            }
        } else {
            extractAttachmentSummaryLines(fallbackText)
        }
    }

    private fun extractLeadingFileMentions(text: String): List<FileMention> {
        val result = mutableListOf<FileMention>()
        val trimmed = text.trimStart()
        if (trimmed.isBlank()) {
            return emptyList()
        }
        for (line in trimmed.lineSequence()) {
            val normalized = line.trim()
            if (!normalized.startsWith("@")) {
                break
            }
            val path = normalized.removePrefix("@").trim()
            if (path.isBlank()) {
                break
            }
            result += buildFileMentionFromPath(path)
        }
        return result.distinctBy { it.path }
    }

    private fun stripLeadingMentionLines(text: String): String {
        if (text.isBlank()) {
            return ""
        }
        val lines = text.lines()
        var index = 0
        while (index < lines.size) {
            val normalized = lines[index].trim()
            if (!normalized.startsWith("@")) {
                break
            }
            val path = normalized.removePrefix("@").trim()
            if (path.isBlank()) {
                break
            }
            index += 1
        }
        return lines.drop(index).joinToString("\n").trim()
    }

    private fun buildFileMentionFromPath(path: String, labelOverride: String? = null): FileMention {
        val normalizedPath = path.trim()
        val sanitized = normalizedPath.trimEnd('/', '\\')
        val label = labelOverride?.trim()?.takeIf { it.isNotBlank() }
            ?: sanitized.substringAfterLast('/').substringAfterLast('\\').ifBlank { normalizedPath }
        val folder = sanitized
            .substringBeforeLast('/', missingDelimiterValue = sanitized)
            .substringBeforeLast('\\', missingDelimiterValue = sanitized)
            .takeIf { it != sanitized }
            .orEmpty()
        return FileMention(
            label = label,
            path = normalizedPath,
            relativePathWithoutFileName = folder
        )
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

    private fun isIpcFollowerRequest(request: CodexServerRequest): Boolean =
        request.handledBy.equals("ipc_follower", ignoreCase = true)

    private fun markServerRequestSubmitting(requestId: String) {
        _uiState.update { state ->
            state.copy(submittingServerRequestIds = state.submittingServerRequestIds + requestId)
        }
    }

    private fun buildApprovalDecisionResult(
        request: CodexServerRequest,
        approved: Boolean
    ): JSONObject? = buildDirectApprovalDecisionResult(request, approved)

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
        if (shouldTraceNotificationMethod(notification.method)) {
            logNotificationTrace(
                stage = "in",
                message = "method=${notification.method} turnId=${extractTraceTurnId(params)} itemId=${extractTraceItemId(params)} currentStreaming=$currentStreamingMessageId"
            )
        }
        when {
            notification.method == "thread/started" -> {
                val threadId = params
                    ?.optJSONObject("thread")
                    ?.optString("id", "")
                    ?.trim()
                    .orEmpty()
                val startedThreadId = normalizeThreadId(threadId)
                if (!startedThreadId.isNullOrEmpty()) {
                    currentStreamingMessageId = null
                    currentPlanStreamingMessageId = null
                    _uiState.update {
                        val allowThreadIdSwitch = shouldAllowOptimisticTailAcrossThreadSwitch(
                            stateThreadId = it.threadId,
                            incomingThreadId = startedThreadId
                        )
                        val transition = buildThreadStartedUiTransition(
                            startedThreadId = startedThreadId,
                            state = it,
                            allowThreadIdSwitch = allowThreadIdSwitch
                        )
                        it.copy(
                            threadId = startedThreadId,
                            currentTurnId = transition.currentTurnId,
                            messages = transition.messages,
                            errorMessage = null,
                            runtimePanel = transition.runtimePanel,
                            noticesPanel = if (transition.messages.isEmpty()) {
                                CodexNoticesPanelState()
                            } else {
                                it.noticesPanel
                            },
                            pendingServerRequests = emptyList(),
                            submittingServerRequestIds = emptySet()
                        )
                    }
                }
            }

            notification.method == "thread/status/changed" -> {
                val hadActiveTurn = !_uiState.value.currentTurnId.isNullOrBlank()
                val statusType = params
                    ?.optJSONObject("status")
                    ?.optString("type", "")
                    ?.trim()
                    .orEmpty()
                if (statusType == "idle") {
                    finalizeStreamingMessage()
                    finalizePlanStreamingMessage()
                    _uiState.update {
                        syncExecutionWatch(
                            finalizePlanWorkflowOnTurnSettled(
                                it.copy(currentTurnId = null)
                            ),
                            markActivity = false
                        )
                    }
                    val state = _uiState.value
                    if (hadActiveTurn) {
                        scheduleCanonicalThreadRead(
                            threadId = state.threadId
                        )
                    }
                    maybeRequestPendingThreadResync(
                        threadId = state.threadId,
                        status = state.status,
                        currentTurnId = state.currentTurnId
                    )
                }
            }

            notification.method == "turn/started" -> {
                val turnId = params
                    ?.optJSONObject("turn")
                    ?.optString("id", "")
                    ?.trim()
                    .orEmpty()
                _uiState.update {
                    syncExecutionWatch(
                        it.copy(
                            errorMessage = null,
                            currentTurnId = turnId.ifEmpty { it.currentTurnId }
                        ),
                        markActivity = true
                    )
                }
            }

            notification.method == "turn/completed" -> {
                finalizeStreamingMessage()
                finalizePlanStreamingMessage()
                _uiState.update {
                    syncExecutionWatch(
                        finalizePlanWorkflowOnTurnSettled(
                            it.copy(currentTurnId = null)
                        ),
                        markActivity = true
                    )
                }
                scheduleCanonicalThreadRead(
                    threadId = _uiState.value.threadId
                )
            }

            notification.method == "item/started" -> {
                val item = params?.optJSONObject("item") ?: return
                val itemType = item.optString("type", "")
                if (itemType != "agentMessage") {
                    val itemId = item.optString("id", "").trim()
                    val feedback = buildExecutionFeedback(item, itemType)
                    if (feedback != null && itemId.isNotEmpty()) {
                        appendCollapsibleMessage(itemId, feedback.first, feedback.second)
                    }
                    logNotificationTrace("drop", "item/started non-agent type=$itemType")
                    return
                }
                if (isRuntimeOnlyAgentMessage(item)) {
                    logNotificationTrace("drop", "item/started runtime-only itemId=${item.optString("id", "").trim()}")
                    return
                }
                val itemId = item.optString("id", "").trim().ifEmpty { UUID.randomUUID().toString() }
                currentStreamingMessageId = itemId
                logNotificationTrace("apply", "item/started itemId=$itemId textLen=${item.optString("text", "").length}")
                upsertAssistantMessage(
                    itemId = itemId,
                    content = item.optString("text", ""),
                    streaming = true
                )
            }

            notification.method == "item/agentMessage/delta" -> {
                val itemId = params?.optString("itemId", "")?.trim().orEmpty()
                val delta = params?.optString("delta", "") ?: ""
                if (delta.isEmpty()) {
                    logNotificationTrace("drop", "delta empty itemId=$itemId")
                    return
                }
                val streamId = itemId.ifEmpty { currentStreamingMessageId.orEmpty() }
                if (streamId.isEmpty()) {
                    logNotificationTrace("drop", "delta missing-stream itemId=$itemId currentStreaming=$currentStreamingMessageId")
                    return
                }
                logNotificationTrace("apply", "delta streamId=$streamId deltaLen=${delta.length}")
                appendAssistantDelta(streamId, delta)
            }

            notification.method == "turn/plan/updated" -> {
                val plan = params?.optJSONObject("plan") ?: return
                val planText = plan.optString("text", "")
                val planMessageId = resolvePlanStreamingMessageId(params)
                if (planText.isBlank()) {
                    applyRuntimeNotificationUpdate(notification.method, params)
                    return
                }
                trackPlanWorkflowText(planText)
                if (planMessageId.isNotEmpty()) {
                    currentPlanStreamingMessageId = planMessageId
                    upsertAssistantMessage(
                        itemId = planMessageId,
                        content = planText,
                        streaming = true,
                        trackPlanText = false
                    )
                }
                applyRuntimeNotificationUpdate(notification.method, params)
            }

            notification.method == "item/plan/delta" -> {
                val delta = params?.optString("delta", "") ?: ""
                val planMessageId = resolvePlanStreamingMessageId(params)
                if (delta.isEmpty()) {
                    applyRuntimeNotificationUpdate(notification.method, params)
                    return
                }
                val currentPlanText = getPlanWorkflowDisplayText(_uiState.value)
                trackPlanWorkflowText(
                    text = currentPlanText + delta,
                    preserveWhitespace = true
                )
                if (planMessageId.isNotEmpty()) {
                    currentPlanStreamingMessageId = planMessageId
                    appendAssistantDelta(
                        itemId = planMessageId,
                        delta = delta,
                        trackPlanText = false
                    )
                }
                applyRuntimeNotificationUpdate(notification.method, params)
            }

            notification.method == "item/completed" -> {
                val item = params?.optJSONObject("item") ?: return
                applyRuntimeSnapshotItem(item)
                val itemType = item.optString("type", "")
                if (itemType != "agentMessage") {
                    val itemId = item.optString("id", "").trim()
                    if (itemId.isNotEmpty()) {
                        updateCollapsibleMessageContent(itemId, item, itemType)
                    }
                    logNotificationTrace("drop", "item/completed non-agent type=$itemType")
                    return
                }
                if (isRuntimeOnlyAgentMessage(item)) {
                    logNotificationTrace("drop", "item/completed runtime-only itemId=${item.optString("id", "").trim()}")
                    return
                }
                val itemId = item.optString("id", "").trim().ifEmpty { currentStreamingMessageId.orEmpty() }
                val text = item.optString("text", "")
                if (itemId.isEmpty()) {
                    logNotificationTrace("drop", "item/completed missing-stream currentStreaming=$currentStreamingMessageId")
                    return
                }
                currentStreamingMessageId = null
                logNotificationTrace("apply", "item/completed itemId=$itemId textLen=${text.length}")
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
                logNotificationTrace("apply", "error message=$message")
                appendMessage(ChatMessage.Role.ERROR, message)
                _uiState.update {
                    it.copy(
                        errorMessage = message,
                        planWorkflow = buildEmptyPlanWorkflowState(),
                        executionWatch = CodexExecutionWatchState(),
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
        Log.d(
            TAG,
            "[server-request] requestId=${request.requestId} kind=${request.requestKind} mode=${request.responseMode} handledBy=${request.handledBy} questionCount=${request.questionCount} parsedQuestions=${request.questions.size} summary=${compactLogValue(request.summary)} params=${compactLogValue(request.params?.toString())} raw=${compactLogValue(envelope.raw.toString())}"
        )
        finalizePlanStreamingMessage()
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
                syncExecutionWatch(
                    state.copy(
                        planWorkflow = state.planWorkflow.copy(
                            phase = PLAN_PHASE_AWAITING_USER_INPUT,
                            lastUserInputRequestId = request.requestId
                        )
                    ),
                    markActivity = true
                )
            }
        }
        _uiState.update { state ->
            syncExecutionWatch(
                state.copy(
                    pendingServerRequests = upsertPendingServerRequest(state.pendingServerRequests, request),
                    submittingServerRequestIds = state.submittingServerRequestIds - request.requestId
                ),
                markActivity = true
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
        _uiState.update { state ->
            syncExecutionWatch(applyRuntimePanelUpdate(state, update), markActivity = true)
        }
    }

    private fun applyRuntimeSnapshotItem(item: JSONObject) {
        val update = buildRuntimeSnapshotUpdate(item) ?: return
        _uiState.update { state ->
            syncExecutionWatch(applyRuntimePanelUpdate(state, update), markActivity = true)
        }
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
        val normalizedUpdateText = stripAnsiText(update.text).trim()
        if (normalizedUpdateText.isEmpty()) {
            return existing
        }
        return if (update.mode == "append") {
            val separator = if (existing.isNotEmpty() && !existing.endsWith('\n')) "\n" else ""
            trimRuntimePanelText(existing + separator + normalizedUpdateText)
        } else {
            trimRuntimePanelText(normalizedUpdateText)
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
                text = summarizeReasoningPayload(payload)
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
                text = summarizeReasoningPayload(item)
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
                        text = summarizeReasoningPayload(item)
                    )
                    else -> null
                }
            }
            else -> null
        }
        return update?.takeIf { it.text.isNotEmpty() }
    }

    /** Build label + initial content for a collapsible execution feedback message. */
    private fun buildExecutionFeedback(item: JSONObject, type: String): Pair<String, String>? {
        return when (type) {
            "fileChange" -> {
                val path = item.optString("filePath", "").ifEmpty { item.optString("path", "") }
                val changeType = item.optString("changeType", "edit").lowercase()
                val label = when (changeType) {
                    "create", "created" -> appContext.getString(R.string.codex_native_exec_created_file)
                    "delete", "deleted" -> appContext.getString(R.string.codex_native_exec_deleted_file)
                    else -> appContext.getString(R.string.codex_native_exec_edited_file)
                }
                "$label" to path
            }
            "mcpToolCall" -> {
                val name = item.optString("name", "").ifEmpty { item.optString("toolName", "") }
                val label = appContext.getString(R.string.codex_native_exec_ran_command)
                "$label" to name
            }
            else -> null
        }
    }

    /** Append a collapsible TOOL message (auto-collapsed). */
    private fun appendCollapsibleMessage(itemId: String, label: String, content: String) {
        val msg = ChatMessage(
            id = "exec-$itemId",
            role = ChatMessage.Role.TOOL,
            content = content,
            collapsible = true,
            collapsedLabel = label
        )
        _uiState.update { it.copy(messages = it.messages + msg) }
    }

    /** Update an existing collapsible message with completed details. */
    private fun updateCollapsibleMessageContent(itemId: String, item: JSONObject, type: String) {
        val targetId = "exec-$itemId"
        val detail = when (type) {
            "fileChange" -> {
                val output = pickFirstText(item, listOf("output"), listOf("text"), listOf("patch"))
                output.take(500)
            }
            "mcpToolCall" -> {
                val output = pickFirstText(item, listOf("output"), listOf("message"), listOf("text"))
                output.take(500)
            }
            else -> ""
        }
        if (detail.isBlank()) return
        _uiState.update { state ->
            val updated = state.messages.map { msg ->
                if (msg.id == targetId) {
                    val combined = if (msg.content.isNotBlank()) "${msg.content}\n$detail" else detail
                    msg.copy(content = combined)
                } else msg
            }
            state.copy(messages = updated)
        }
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
                    label = (
                        ui?.optStringOrNullCompat("displayName")
                            ?: ui?.optStringOrNullCompat("display_name")
                        ).orEmpty().ifBlank { name },
                    description = (
                        ui?.optStringOrNullCompat("shortDescription")
                            ?: ui?.optStringOrNullCompat("short_description")
                        )
                        ?: entry.optStringOrNullCompat("description")
                        ?: "",
                    defaultPrompt = ui?.optStringOrNullCompat("defaultPrompt")
                        ?: ui?.optStringOrNullCompat("default_prompt")
                        ?: "",
                    scope = entry.optStringOrNullCompat("scope") ?: ""
                )
            }
        }
        return skills.sortedBy { it.label.lowercase() }
    }

    private fun applyTokenUsagePayload(payload: Any?) {
        val contextUsage = normalizeContextUsageState(payload)
        val summary = formatTokenUsageSummary(contextUsage)
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

    private fun formatTokenUsageSummary(contextUsage: CodexContextUsageState?): String {
        val usage = contextUsage ?: return ""
        val input = usage.inputTokens
        val output = usage.outputTokens
        val total = usage.usedTokens ?: if (input != null || output != null) {
            (input ?: 0L) + (output ?: 0L)
        } else {
            null
        }
        val cached = usage.cachedInputTokens
        val reasoning = usage.reasoningTokens
        val parts = mutableListOf<String>()
        input?.let { parts += "${formatCompactNumber(it)} in" }
        output?.let { parts += "${formatCompactNumber(it)} out" }
        total?.let { parts += "${formatCompactNumber(it)} total" }
        if (cached != null && cached > 0) parts += "${formatCompactNumber(cached)} cached"
        if (reasoning != null && reasoning > 0) parts += "${formatCompactNumber(reasoning)} reasoning"
        return if (parts.isEmpty()) "" else "tokens ${parts.joinToString(" / ")}"
    }

    private fun normalizeContextUsageState(payload: Any?): CodexContextUsageState? {
        val sources = buildTokenUsageSources(payload).filter(::looksLikeTaskScopedContextSource)
        if (sources.isEmpty()) {
            return null
        }
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
        val explicitUsedTokens = pickFirstLongFromSources(
            sources,
            listOf("usedTokens"),
            listOf("used_tokens")
        )
        val explicitMaxTokens = pickFirstLongFromSources(
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
        val usedTokens = explicitUsedTokens?.takeIf { it >= 0 }
        val maxTokens = explicitMaxTokens?.takeIf { it > 0 }
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

    private fun looksLikeTaskScopedContextSource(source: JSONObject): Boolean {
        if (source.has("contextUsage") || source.has("context_usage")) {
            return true
        }
        if (
            source.has("modelContextWindow") ||
            source.has("model_context_window") ||
            source.has("usedPercent") ||
            source.has("used_percent") ||
            source.has("contextUsedPercent") ||
            source.has("context_used_percent") ||
            source.has("usagePercent") ||
            source.has("usage_percent") ||
            source.has("contextWindowTokens") ||
            source.has("context_window_tokens") ||
            source.has("contextWindowMaxTokens") ||
            source.has("context_window_max_tokens") ||
            source.has("maxContextTokens") ||
            source.has("max_context_tokens") ||
            source.has("usedTokens") ||
            source.has("used_tokens")
        ) {
            return true
        }
        val last = source.optJSONObject("last")
        return last?.has("totalTokens") == true || last?.has("total_tokens") == true
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

    private fun mergeInteractionState(
        current: CodexInteractionState?,
        incoming: CodexInteractionState?
    ): CodexInteractionState? {
        if (current == null) {
            return incoming
        }
        if (incoming == null) {
            return current
        }
        return CodexInteractionState(
            planMode = current.planMode,
            activeSkill = incoming.activeSkill ?: current.activeSkill
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
        return recalculateNextTurnEffectiveConfigForUiState(state)
    }

    private fun latestCanonicalTurn(turns: JSONArray?): JSONObject? {
        if (turns == null) return null
        for (index in turns.length() - 1 downTo 0) {
            turns.optJSONObject(index)?.let { return it }
        }
        return null
    }

    private fun canonicalThreadStatusType(thread: JSONObject): String? {
        return when (val raw = thread.opt("status")) {
            is JSONObject -> raw.optStringOrNullCompat("type")
            is String -> raw.trim().takeIf(String::isNotEmpty)
            else -> null
        }
    }

    private fun latestCanonicalAgentPhase(turn: JSONObject?): String? {
        val items = turn?.optJSONArray("items") ?: return null
        for (index in items.length() - 1 downTo 0) {
            val item = items.optJSONObject(index) ?: continue
            if (item.optString("type", "").equals("agentMessage", ignoreCase = true)) {
                item.optStringOrNullCompat("phase")?.let { return it }
            }
        }
        return null
    }

    private fun canonicalTurnHasActiveItem(turn: JSONObject?): Boolean {
        val items = turn?.optJSONArray("items") ?: return false
        for (index in 0 until items.length()) {
            val status = items.optJSONObject(index)?.optStringOrNullCompat("status")
                ?.trim()
                ?.lowercase()
                ?.replace("_", "")
                ?.replace("-", "")
                .orEmpty()
            if (status in setOf("inprogress", "running", "active", "started")) return true
        }
        return false
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
            val fileMentions = if (role == ChatMessage.Role.USER) {
                extractUserMessageFileMentions(
                    content = msgJson.optJSONArray("content"),
                    fallbackText = content
                )
            } else {
                emptyList()
            }
            val skills = if (role == ChatMessage.Role.USER) {
                extractUserMessageSkills(
                    content = msgJson.optJSONArray("content"),
                    fallbackText = content
                )
            } else {
                emptyList()
            }
            val attachments = if (role == ChatMessage.Role.USER) {
                extractUserMessageAttachments(
                    content = msgJson.optJSONArray("content"),
                    fallbackText = content
                )
            } else {
                emptyList()
            }
            val activeSkill = msgJson.optStringOrNullCompat("activeSkill")
                ?: skills.firstOrNull()?.name
            result.add(
                ChatMessage(
                    id = msgJson.optString("id", UUID.randomUUID().toString()),
                    role = role,
                    content = if (role == ChatMessage.Role.USER) buildVisibleUserMessageText(content) else content,
                    fileMentions = fileMentions,
                    activeSkill = if (role == ChatMessage.Role.USER) activeSkill else null,
                    skills = if (role == ChatMessage.Role.USER) skills else emptyList(),
                    attachments = if (role == ChatMessage.Role.USER) attachments else emptyList(),
                    timestamp = msgJson.optLong("timestamp", System.currentTimeMillis())
                )
            )
        }
        return result
    }

    private fun appendMessage(role: ChatMessage.Role, content: String) {
        _uiState.update {
            syncExecutionWatch(
                it.copy(
                    messages = it.messages + ChatMessage(
                        id = UUID.randomUUID().toString(),
                        role = role,
                        content = content
                    )
                ),
                markActivity = role != ChatMessage.Role.USER
            )
        }
    }

    private fun upsertAssistantMessage(
        itemId: String,
        content: String,
        streaming: Boolean,
        trackPlanText: Boolean = true
    ) {
        _uiState.update { state ->
            val nextState = if (trackPlanText && shouldTrackPlanWorkflowText(state)) {
                updatePlanWorkflowText(state, content)
            } else {
                state
            }
            val existingIndex = nextState.messages.indexOfFirst { it.id == itemId }
            if (existingIndex >= 0) {
                logNotificationTrace("ui", "upsert update itemId=$itemId streaming=$streaming contentLen=${content.length}")
                val updated = nextState.messages.toMutableList()
                updated[existingIndex] = updated[existingIndex].copy(
                    content = content,
                    streaming = streaming,
                    timestamp = System.currentTimeMillis()
                )
                syncExecutionWatch(nextState.copy(messages = updated), markActivity = true)
            } else {
                logNotificationTrace("ui", "upsert insert itemId=$itemId streaming=$streaming contentLen=${content.length}")
                syncExecutionWatch(
                    nextState.copy(
                        messages = nextState.messages + ChatMessage(
                            id = itemId,
                            role = ChatMessage.Role.ASSISTANT,
                            content = content,
                            streaming = streaming
                        )
                    ),
                    markActivity = true
                )
            }
        }
    }

    private fun appendAssistantDelta(itemId: String, delta: String, trackPlanText: Boolean = true) {
        _uiState.update { state ->
            val nextState = if (trackPlanText && shouldTrackPlanWorkflowText(state)) {
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
                logNotificationTrace("ui", "delta append itemId=$itemId deltaLen=${delta.length}")
                val updated = nextState.messages.toMutableList()
                val existing = updated[existingIndex]
                updated[existingIndex] = existing.copy(
                    content = existing.content + delta,
                    streaming = true,
                    timestamp = System.currentTimeMillis()
                )
                syncExecutionWatch(nextState.copy(messages = updated), markActivity = true)
            } else {
                logNotificationTrace("ui", "delta create itemId=$itemId deltaLen=${delta.length}")
                syncExecutionWatch(
                    nextState.copy(
                        messages = nextState.messages + ChatMessage(
                            id = itemId,
                            role = ChatMessage.Role.ASSISTANT,
                            content = delta,
                            streaming = true
                        )
                    ),
                    markActivity = true
                )
            }
        }
    }

    private fun finalizeStreamingMessage() {
        val streamId = currentStreamingMessageId ?: return
        finalizeStreamingMessageById(streamId)
        currentStreamingMessageId = null
    }

    private fun syncExecutionWatch(
        state: CodexUiState,
        markActivity: Boolean,
        nowMillis: Long = System.currentTimeMillis()
    ): CodexUiState {
        if (!shouldTrackExecutionWatch(state)) {
            return if (
                !state.executionWatch.active &&
                state.executionWatch.runningSinceMillis == 0L &&
                state.executionWatch.lastEventAtMillis == 0L
            ) {
                state
            } else {
                state.copy(executionWatch = CodexExecutionWatchState())
            }
        }
        val startedAt = state.executionWatch.runningSinceMillis.takeIf { it > 0L } ?: nowMillis
        val lastEventAt = when {
            markActivity -> nowMillis
            state.executionWatch.lastEventAtMillis > 0L -> state.executionWatch.lastEventAtMillis
            else -> nowMillis
        }
        return state.copy(
            executionWatch = CodexExecutionWatchState(
                active = true,
                runningSinceMillis = startedAt,
                lastEventAtMillis = lastEventAt
            )
        )
    }

    private fun shouldTrackExecutionWatch(state: CodexUiState): Boolean {
        return shouldTrackExecutionWatchForUiState(
            state = state,
            ipcStatusObserved = ipcStatusObserved
        )
    }

    // ── IPC surface snapshot merge helpers ────────────────────────────

    private fun applyConversationStatusChanged(json: JSONObject) {
        val conversationId = json.optStringOrNullCompat("conversationId").orEmpty()
        val status = json.optStringOrNullCompat("status").orEmpty()
        if (status.isEmpty()) return
        _uiState.update { current ->
            applyConversationStatusChangedToUiState(
                state = current,
                conversationId = conversationId,
                status = status
            )
        }
    }

    private fun handleConversationActionRequired(json: JSONObject) {
        val conversationId = json.optStringOrNullCompat("conversationId").orEmpty()
        val actionType = json.optString("actionType", "").trim()
        val payload = json.optJSONObject("payload") ?: return
        val activeConversationId = _uiState.value.activeConversationId?.trim().orEmpty()
        if (conversationId.isNotEmpty() && activeConversationId.isNotEmpty() && conversationId != activeConversationId) {
            return
        }
        when (actionType) {
            "approval" -> {
                val pending = PendingApprovalInfo.from(payload) ?: return
                _uiState.update { current ->
                    current.copy(
                        activeConversationId = conversationId.ifEmpty { current.activeConversationId },
                        pendingServerRequests = mergePendingApproval(current.pendingServerRequests, pending)
                    )
                }
            }
            "plan" -> {
                val pending = PendingPlanActionInfo.from(payload) ?: return
                _uiState.update { current ->
                    current.copy(
                        activeConversationId = conversationId.ifEmpty { current.activeConversationId },
                        planWorkflow = mergePlanWorkflow(current.planWorkflow, pending)
                    )
                }
            }
            "user_input" -> {
                val request = CodexServerRequest.from(payload)?.copy(handledBy = "ipc_follower") ?: return
                _uiState.update { current ->
                    current.copy(
                        activeConversationId = conversationId.ifEmpty { current.activeConversationId },
                        pendingServerRequests = mergePendingUserInput(current.pendingServerRequests, request)
                    )
                }
            }
            "goal" -> {
                _uiState.update { current ->
                    current.copy(activeConversationId = conversationId.ifEmpty { current.activeConversationId })
                }
            }
        }
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
