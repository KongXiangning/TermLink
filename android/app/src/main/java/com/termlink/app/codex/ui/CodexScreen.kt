package com.termlink.app.codex.ui

import android.graphics.Rect
import android.graphics.Point
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.termlink.app.BuildConfig
import com.termlink.app.R
import com.termlink.app.codex.isOwnerConfigHydratingForUiState
import com.termlink.app.codex.data.CodexSlashRegistry
import com.termlink.app.codex.data.CodexServerRequest
import com.termlink.app.codex.data.CodexServerRequestQuestion
import com.termlink.app.codex.data.ActiveGoalInfo
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexPendingImageAttachment
import com.termlink.app.codex.domain.CodexSkillEntry
import com.termlink.app.codex.domain.CodexThreadHistoryEntry
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.DebugServerRequestPreset
import com.termlink.app.codex.domain.FileMention
import com.termlink.app.codex.domain.PERMISSION_CHOICE_ASK
import com.termlink.app.codex.domain.PERMISSION_CHOICE_AUTO_REVIEW
import com.termlink.app.codex.domain.PERMISSION_CHOICE_CUSTOM
import com.termlink.app.codex.domain.PERMISSION_CHOICE_FULL_ACCESS
import com.termlink.app.codex.domain.PERMISSION_PROFILE_CHOICE_PREFIX
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val BgColor = Color(0xFF0C151F)
private val SurfaceColor = Color(0xFF172230)
private val SurfaceRaised = Color(0xFF182633)
private val SurfaceBorder = Color(0xFF344354)
private val AccentBlue = Color(0xFF4E8EFF)
private val ContextBlue = Color(0xFF7FC7FF)
private val TextPrimary = Color(0xFFE7EDF6)
private val TextSecondary = Color(0xFFB9C5D4)
private val TextMuted = Color(0xFF7D8A9B)
private val SuccessColor = Color(0xFF4EDEA3)
private val RunningColor = Color(0xFF3FB950)
private val WarningColor = Color(0xFFE4B66A)
private val SystemColor = Color(0xFFE4B66A)
private val ErrorColor = Color(0xFFFF7B72)
private val UserBg = Color(0xFF172332)
private val AssistantBg = Color(0xFF16212E)
private val SystemBg = Color(0x1A5E4A20)
private val ToolBg = Color(0xFF141F2A)
private val ErrorBg = Color(0x1A6E1F1A)
private const val RuntimeStallThresholdMillis = 90_000L
private const val RuntimeStallRefreshMillis = 5_000L
private const val StreamingAutoScrollThrottleMillis = 120L

private object CodexBottomBarTokens {
    val composerRadius = 20.dp
    val chipRadius = 16.dp
    val smallChipRadius = 14.dp
    val barPadding = 12.dp
    val sectionGap = 10.dp
    val rowGap = 8.dp
    val minTouch = 44.dp
    val compactTouch = 40.dp
    val composerMinHeight = 56.dp
    val composerMaxHeight = 156.dp
    val actionButtonSize = 48.dp
    val quickControlMinHeight = 42.dp
    val usageMinWidth = 78.dp
    val labelSize = 12.sp
    val bodySize = 14.sp
}

private data class CodexActionStyle(
    val containerColor: Color,
    val contentColor: Color,
    val borderColor: Color
)

@Composable
fun CodexScreen(
    state: CodexUiState,
    onSendMessage: (String) -> Unit,
    onInterrupt: () -> Unit,
    onContinueGoal: () -> Unit,
    onOpenDocs: () -> Unit,
    onNewThread: () -> Unit,
    onRetry: () -> Unit,
    onDismissError: () -> Unit,
    onShowSlashMenu: (String) -> Unit,
    onHideSlashMenu: () -> Unit,
    onSlashMenuQueryChanged: (String) -> Unit,
    onComposerTextChanged: (String) -> Unit,
    onHideFileMentionMenu: () -> Unit,
    onSelectFileMention: (FileMention) -> Unit,
    onRemoveFileMention: (String) -> Unit,
    onApproveRequest: (String, Boolean) -> Unit,
    onSubmitUserInputAnswers: (String, Map<String, String>) -> Unit,
    onRejectUserInputRequest: (String) -> Unit,
    onShowModelPicker: () -> Unit,
    onHideModelPicker: () -> Unit,
    onSelectModel: (String?) -> Unit,
    onShowReasoningPicker: () -> Unit,
    onHideReasoningPicker: () -> Unit,
    onSelectReasoningEffort: (String?) -> Unit,
    onShowSandboxPicker: () -> Unit,
    onHideSandboxPicker: () -> Unit,
    onSelectSandboxMode: (String?) -> Unit,
    onTogglePlanMode: () -> Unit,
    onExecuteConfirmedPlan: () -> Unit,
    onContinuePlanWorkflow: () -> Unit,
    onCancelPlanWorkflow: () -> Unit,
    onShowToolsPanel: () -> Unit,
    onHideToolsPanel: () -> Unit,
    onSelectSkill: (String?) -> Unit,
    onClearActiveSkill: () -> Unit,
    onRequestCompactCurrentThread: () -> Unit,
    onShowUsagePanel: () -> Unit,
    onHideUsagePanel: () -> Unit,
    onShowRuntimePanel: () -> Unit,
    onHideRuntimePanel: () -> Unit,
    onShowNoticesPanel: () -> Unit,
    onHideNoticesPanel: () -> Unit,
    onShowThreadHistory: () -> Unit,
    onHideThreadHistory: () -> Unit,
    onRefreshThreadHistory: () -> Unit,
    onResumeThread: (String) -> Unit,
    onForkThread: (String) -> Unit,
    onToggleThreadArchive: (String, Boolean) -> Unit,
    onStartThreadRename: (String, String) -> Unit,
    onUpdateThreadRenameDraft: (String) -> Unit,
    onCancelThreadRename: () -> Unit,
    onSubmitThreadRename: () -> Unit,
    onPickLocalFile: () -> Unit,
    onRemovePendingImageAttachment: (String) -> Unit,
    onInjectDebugServerRequest: (DebugServerRequestPreset) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    var autoFollowEnabled by remember { mutableStateOf(true) }
    var suppressAutoFollowPause by remember { mutableStateOf(false) }
    val isStreaming = state.messages.lastOrNull()?.streaming == true ||
        state.status.equals("running", ignoreCase = true)
    val hasInterruptibleTurn = !state.currentTurnId.isNullOrBlank()
    var lastStreamAutoScrollAtMillis by remember { mutableStateOf(0L) }
    var stallNowMillis by remember { mutableStateOf(System.currentTimeMillis()) }
    var debugInjectorVisible by remember { mutableStateOf(false) }
    val bottomAnchorIndex = state.messages.size
    val atLatestPosition by remember(listState, bottomAnchorIndex) {
        derivedStateOf { isMessageListAtBottom(listState, bottomAnchorIndex) }
    }
    val blockingApprovalRequest = remember(state.pendingServerRequests) {
        state.pendingServerRequests.firstOrNull { request ->
            request.responseMode == "decision"
        }
    }
    val userInputRequest = remember(state.pendingServerRequests, blockingApprovalRequest) {
        if (blockingApprovalRequest != null) {
            null
        } else {
            state.pendingServerRequests.firstOrNull { request ->
                request.responseMode == "answers"
            }
        }
    }
    val slashCommands = remember(state.capabilities, state.slashMenuQuery) {
        CodexSlashRegistry.getDiscoverableCommands(
            capabilities = CodexSlashRegistry.buildCapabilityMap(state.capabilities),
            query = state.slashMenuQuery
        )
    }
    val runtimePanelVisible = state.runtimePanel.visible && state.capabilities?.diffPlanReasoning == true
    val noticesPanelVisible = state.noticesPanel.visible && hasNoticesPanelContent(state)
    val secondaryPanelVisible = state.threadHistorySheetVisible || runtimePanelVisible || noticesPanelVisible

    LaunchedEffect(state.messages.firstOrNull()?.id) {
        autoFollowEnabled = true
    }
    LaunchedEffect(
        listState.isScrollInProgress,
        atLatestPosition,
        bottomAnchorIndex,
        autoFollowEnabled,
        suppressAutoFollowPause
    ) {
        if (
            bottomAnchorIndex > 0 &&
            listState.isScrollInProgress &&
            autoFollowEnabled &&
            !suppressAutoFollowPause &&
            !atLatestPosition
        ) {
            autoFollowEnabled = false
        }
    }
    LaunchedEffect(
        atLatestPosition,
        bottomAnchorIndex,
        autoFollowEnabled,
        suppressAutoFollowPause
    ) {
        if (
            bottomAnchorIndex > 0 &&
            atLatestPosition &&
            !autoFollowEnabled &&
            !suppressAutoFollowPause
        ) {
            autoFollowEnabled = true
        }
    }
    // Auto-scroll: on new messages (size/id change), follow to bottom unless the user paused it
    LaunchedEffect(
        state.messages.size,
        state.messages.lastOrNull()?.id
    ) {
        val anchorIndex = bottomAnchorIndex // index of _bottom_anchor spacer
        if (anchorIndex <= 0 || !autoFollowEnabled) {
            return@LaunchedEffect
        }
        suppressAutoFollowPause = true
        try {
            listState.scrollToItem(anchorIndex)
        } finally {
            suppressAutoFollowPause = false
        }
    }
    // Auto-scroll during streaming: throttled, unless the user paused it
    LaunchedEffect(
        state.messages.lastOrNull()?.content?.length,
        state.messages.lastOrNull()?.streaming
    ) {
        val anchorIndex = bottomAnchorIndex
        if (anchorIndex <= 0) return@LaunchedEffect
        val lastMessage = state.messages.lastOrNull() ?: return@LaunchedEffect
        if (!lastMessage.streaming) return@LaunchedEffect
        if (!autoFollowEnabled) return@LaunchedEffect
        val nowMillis = System.currentTimeMillis()
        if (nowMillis - lastStreamAutoScrollAtMillis < StreamingAutoScrollThrottleMillis) {
            return@LaunchedEffect
        }
        suppressAutoFollowPause = true
        try {
            listState.scrollToItem(anchorIndex)
        } finally {
            suppressAutoFollowPause = false
        }
        lastStreamAutoScrollAtMillis = nowMillis
    }
    LaunchedEffect(
        state.executionWatch.active,
        state.executionWatch.runningSinceMillis,
        state.executionWatch.lastEventAtMillis
    ) {
        stallNowMillis = System.currentTimeMillis()
        if (!state.executionWatch.active) {
            return@LaunchedEffect
        }
        while (true) {
            delay(RuntimeStallRefreshMillis)
            stallNowMillis = System.currentTimeMillis()
        }
    }
    val runtimeStallInfo = remember(
        state.executionWatch,
        state.pendingServerRequests,
        state.planWorkflow.phase,
        state.connectionState,
        state.errorMessage,
        isStreaming,
        stallNowMillis
    ) {
        buildRuntimeStallInfo(
            state = state,
            isStreaming = isStreaming,
            nowMillis = stallNowMillis
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0A141E),
                        Color(0xFF101B27),
                        Color(0xFF0A141D)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .widthIn(max = 960.dp)
                .align(Alignment.TopCenter)
        ) {
            CodexHeader(
                state = state,
                isStreaming = isStreaming,
                onOpenThreadHistory = {
                    if (state.threadHistorySheetVisible) onHideThreadHistory() else onShowThreadHistory()
                },
                onOpenDocs = onOpenDocs,
                historyEnabled = state.capabilities?.historyList == true,
                docsEnabled = state.sessionId.isNotBlank(),
                onShowDebugInjector = { debugInjectorVisible = true }
            )

            state.errorMessage?.let { message ->
                ErrorBanner(
                    message = message,
                    onRetry = onRetry,
                    onDismiss = onDismissError
                )
            }
            runtimeStallInfo?.let { info ->
                RuntimeStallBanner(
                    info = info,
                    onRetry = onRetry,
                    onShowDiagnostics = onShowRuntimePanel
                )
            }
            state.activeGoal?.takeIf { !it.objective.isNullOrBlank() }?.let { goal ->
                val goalControlAvailable = state.connectionState == ConnectionState.CONNECTED &&
                    state.followerModeEnabled &&
                    state.followerActiveSendAllowed &&
                    !state.activeConversationId.isNullOrBlank() &&
                    (state.ipcOnline || state.ipcSurfaceSnapshot?.ownerKind.equals("termlink", ignoreCase = true))
                ActiveGoalBand(
                    goal = goal,
                    isRunning = isStreaming,
                    controlAvailable = goalControlAvailable,
                    onContinue = onContinueGoal,
                    onInterrupt = onInterrupt
                )
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp),
                        verticalArrangement = if (state.messages.isEmpty()) Arrangement.Center else Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        if (state.messages.isEmpty()) {
                            item(key = "_watermark") {
                                Box(
                                    modifier = Modifier
                                        .fillParentMaxHeight()
                                        .fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "CODEX",
                                        color = TextMuted.copy(alpha = 0.18f),
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 6.sp
                                    )
                                }
                            }
                        }
                        items(state.messages, key = { it.id }) { message ->
                            MessageBubble(message = message)
                        }
                        if (state.messages.isNotEmpty()) {
                            item(key = "_bottom_anchor") {
                                Spacer(modifier = Modifier.height(1.dp))
                            }
                        }
                    }

                    InputComposer(
                        state = state,
                        enabled = state.connectionState == ConnectionState.CONNECTED,
                        isStreaming = isStreaming,
                        slashMenuVisible = state.slashMenuVisible,
                        slashCommands = slashCommands,
                        mentionMenuVisible = state.fileMentionMenuVisible,
                        mentionResults = state.fileMentionResults,
                        mentionLoading = state.fileMentionLoading,
                        pendingMentions = state.pendingFileMentions,
                        attachmentInputEnabled = state.capabilities?.imageInputSupported == true ||
                            state.capabilities?.fileMentions == true,
                        pendingImageAttachments = state.pendingImageAttachments,
                        onSend = { text ->
                            autoFollowEnabled = true
                            onSendMessage(text)
                            coroutineScope.launch {
                                suppressAutoFollowPause = true
                                try {
                                    if (state.messages.isNotEmpty()) {
                                        listState.scrollToItem(state.messages.size + 1)
                                    }
                                } finally {
                                    suppressAutoFollowPause = false
                                }
                            }
                        },
                        hasInterruptibleTurn = hasInterruptibleTurn,
                        onInterrupt = onInterrupt,
                        onShowSlashMenu = onShowSlashMenu,
                        onHideSlashMenu = onHideSlashMenu,
                        onSlashMenuQueryChanged = onSlashMenuQueryChanged,
                        onComposerTextChanged = onComposerTextChanged,
                        onHideFileMentionMenu = onHideFileMentionMenu,
                        onSelectFileMention = onSelectFileMention,
                        onRemoveFileMention = onRemoveFileMention,
                        onPickLocalFile = onPickLocalFile,
                        onRemovePendingImageAttachment = onRemovePendingImageAttachment,
                        onShowModelPicker = {
                            onHideSlashMenu()
                            onHideFileMentionMenu()
                            onHideToolsPanel()
                            onShowModelPicker()
                        },
                        onShowReasoningPicker = {
                            onHideSlashMenu()
                            onHideFileMentionMenu()
                            onHideToolsPanel()
                            onShowReasoningPicker()
                        },
                        onShowSandboxPicker = {
                            onHideSlashMenu()
                            onHideFileMentionMenu()
                            onHideToolsPanel()
                            onShowSandboxPicker()
                        },
                        onTogglePlanMode = onTogglePlanMode,
                        onShowUsagePanel = onShowUsagePanel,
                        onClearActiveSkill = onClearActiveSkill
                    )
                }

                if (state.messages.isNotEmpty() && !autoFollowEnabled) {
                    ReturnToLatestButton(
                        onClick = {
                            autoFollowEnabled = true
                            coroutineScope.launch {
                                suppressAutoFollowPause = true
                                try {
                                    if (bottomAnchorIndex > 0) {
                                        listState.animateScrollToItem(bottomAnchorIndex)
                                    }
                                } finally {
                                    suppressAutoFollowPause = false
                                }
                            }
                        },
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(end = 20.dp, bottom = 118.dp)
                            .navigationBarsPadding()
                    )
                }

                if (secondaryPanelVisible) {
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                onHideThreadHistory()
                                onHideRuntimePanel()
                                onHideNoticesPanel()
                                onHideToolsPanel()
                            }
                    )
                }

                if (secondaryPanelVisible) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 960.dp)
                            .align(Alignment.TopCenter)
                    ) {
                        if (state.threadHistorySheetVisible) {
                            ThreadHistorySheet(
                                state = state,
                                onRefresh = onRefreshThreadHistory,
                                onResumeThread = onResumeThread,
                                onForkThread = onForkThread,
                                onToggleThreadArchive = onToggleThreadArchive,
                                onStartRename = onStartThreadRename,
                                onRenameDraftChange = onUpdateThreadRenameDraft,
                                onCancelRename = onCancelThreadRename,
                                onSubmitRename = onSubmitThreadRename,
                                onNewThread = onNewThread
                            )
                        }

                        if (runtimePanelVisible) {
                            RuntimePanelSheet(
                                state = state
                            )
                        }

                        if (noticesPanelVisible) {
                            NoticesPanelSheet(state = state)
                        }

                    }
                }
            }
        }
    }

    if (state.toolsPanel.visible) {
        SkillsPickerSheet(
            state = state,
            onDismiss = onHideToolsPanel,
            onSelectSkill = onSelectSkill
        )
    } else if (state.modelPickerVisible) {
        ModelPickerSheet(
            state = state,
            onDismiss = onHideModelPicker,
            onSelectModel = onSelectModel
        )
    } else if (state.reasoningPickerVisible) {
        ReasoningPickerSheet(
            state = state,
            onDismiss = onHideReasoningPicker,
            onSelectReasoningEffort = onSelectReasoningEffort
        )
    } else if (state.sandboxPickerVisible) {
        SandboxPickerSheet(
            state = state,
            onDismiss = onHideSandboxPicker,
            onSelectSandboxMode = onSelectSandboxMode
        )
    }

    if (state.usagePanel.visible) {
        UsagePanelSheet(
            state = state,
            onDismiss = onHideUsagePanel,
            onRequestCompactCurrentThread = onRequestCompactCurrentThread
        )
    }

    if (BuildConfig.DEBUG && debugInjectorVisible) {
        ApprovalDebugSheet(
            onDismiss = { debugInjectorVisible = false },
            onInject = { preset ->
                debugInjectorVisible = false
                onInjectDebugServerRequest(preset)
            }
        )
    }

    blockingApprovalRequest?.let { request ->
        CommandApprovalDialog(
            request = request,
            submitting = state.submittingServerRequestIds.contains(request.requestId),
            onApprove = { onApproveRequest(request.requestId, true) },
            onReject = { onApproveRequest(request.requestId, false) }
        )
    }

    userInputRequest?.let { request ->
        UserInputRequestDialog(
            request = request,
            submitting = state.submittingServerRequestIds.contains(request.requestId),
            onSubmit = { answers -> onSubmitUserInputAnswers(request.requestId, answers) },
            onReject = { onRejectUserInputRequest(request.requestId) }
        )
    }

    if (state.planWorkflow.phase == "plan_ready_for_confirmation") {
        PlanConfirmationDialog(
            state = state,
            onExecuteConfirmedPlan = onExecuteConfirmedPlan,
            onContinuePlanWorkflow = onContinuePlanWorkflow,
            onCancelPlanWorkflow = onCancelPlanWorkflow
        )
    }
}

@Composable
private fun ActiveGoalBand(
    goal: ActiveGoalInfo,
    isRunning: Boolean,
    controlAvailable: Boolean,
    onContinue: () -> Unit,
    onInterrupt: () -> Unit
) {
    var expanded by remember(goal.objective) { mutableStateOf(false) }
    val controlDescription = stringResource(
        if (isRunning) R.string.codex_native_interrupt else R.string.codex_native_goal_continue
    )
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = Color(0xFF10252A).copy(alpha = 0.9f),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, SuccessColor.copy(alpha = 0.22f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 58.dp)
                .padding(start = 12.dp, end = 10.dp, top = 8.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                modifier = Modifier.size(38.dp),
                color = SuccessColor.copy(alpha = 0.13f),
                shape = CircleShape,
                border = BorderStroke(1.dp, SuccessColor.copy(alpha = 0.25f))
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        painter = painterResource(R.drawable.ic_goal_24),
                        contentDescription = null,
                        tint = SuccessColor,
                        modifier = Modifier.size(23.dp)
                    )
                }
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { expanded = !expanded },
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Text(
                    text = stringResource(R.string.codex_native_goal_title, goal.objective.orEmpty()),
                    color = TextPrimary,
                    fontSize = 14.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = if (expanded) 5 else 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = if (isRunning) {
                        stringResource(R.string.codex_native_status_running)
                    } else {
                        goal.status.orEmpty().ifBlank { stringResource(R.string.codex_native_status_idle) }
                    },
                    color = if (isRunning) SuccessColor else TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1
                )
            }
            Surface(
                modifier = Modifier
                    .size(42.dp)
                    .semantics {
                        contentDescription = controlDescription
                        role = Role.Button
                    }
                    .clickable(
                        enabled = controlAvailable,
                        onClick = if (isRunning) onInterrupt else onContinue
                    ),
                color = Color.Transparent,
                shape = CircleShape,
                border = BorderStroke(1.dp, TextSecondary.copy(alpha = 0.35f))
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = if (isRunning) "■" else "▶",
                        color = if (controlAvailable) TextPrimary else TextMuted,
                        fontSize = if (isRunning) 12.sp else 14.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CodexHeader(
    state: CodexUiState,
    isStreaming: Boolean,
    onOpenThreadHistory: () -> Unit,
    onOpenDocs: () -> Unit,
    historyEnabled: Boolean,
    docsEnabled: Boolean,
    onShowDebugInjector: () -> Unit
) {
    val statusLabel = when {
        state.connectionState == ConnectionState.CONNECTING && state.sessionId.isBlank() ->
            stringResource(R.string.codex_native_creating_session)
        state.planWorkflow.phase == "planning" ->
            stringResource(R.string.codex_native_plan_workflow_title_planning)
        state.planWorkflow.phase == "awaiting_user_input" ->
            stringResource(R.string.codex_native_plan_workflow_title_awaiting)
        state.planWorkflow.phase == "plan_ready_for_confirmation" ->
            stringResource(R.string.codex_native_plan_workflow_title_ready)
        state.planWorkflow.phase == "executing_confirmed_plan" ->
            stringResource(R.string.codex_native_plan_workflow_title_executing)
        state.pendingServerRequests.isNotEmpty() ->
            stringResource(R.string.codex_native_status_waiting_approval)
        isStreaming -> stringResource(R.string.codex_native_status_streaming)
        state.status.equals("running", ignoreCase = true) ->
            stringResource(R.string.codex_native_status_running)
        state.connectionState == ConnectionState.CONNECTED ->
            stringResource(R.string.codex_native_status_connected)
        state.connectionState == ConnectionState.RECONNECTING ->
            stringResource(R.string.codex_native_status_reconnecting)
        state.connectionState == ConnectionState.ERROR ->
            stringResource(R.string.codex_native_status_error)
        state.connectionState == ConnectionState.CONNECTING ->
            stringResource(R.string.codex_native_status_connecting)
        else -> stringResource(R.string.codex_native_status_idle)
    }

    val statusColor = when {
        state.planWorkflow.phase == "planning" -> AccentBlue
        state.planWorkflow.phase == "awaiting_user_input" -> WarningColor
        state.planWorkflow.phase == "plan_ready_for_confirmation" -> SuccessColor
        state.planWorkflow.phase == "executing_confirmed_plan" -> AccentBlue
        isStreaming || state.status.equals("running", ignoreCase = true) -> RunningColor
        state.connectionState == ConnectionState.CONNECTED -> SuccessColor
        state.connectionState == ConnectionState.RECONNECTING -> WarningColor
        state.connectionState == ConnectionState.ERROR -> ErrorColor
        state.connectionState == ConnectionState.CONNECTING -> AccentBlue
        else -> TextMuted
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.Transparent
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            val headerInteractionModifier = if (BuildConfig.DEBUG) {
                Modifier.combinedClickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {},
                    onLongClick = onShowDebugInjector
                )
            } else {
                Modifier
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 84.dp)
                    .padding(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 12.dp, end = 8.dp)
                        .then(headerInteractionModifier),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_status_prefix, statusLabel),
                        color = TextPrimary,
                        fontSize = 14.sp,
                        lineHeight = 18.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    state.cwd?.takeIf { it.isNotBlank() }?.let { cwd ->
                        val displayCwd = formatHeaderCwdForDisplay(cwd)
                        Spacer(modifier = Modifier.height(5.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.codex_native_header_path_prefix),
                                color = TextMuted,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = displayCwd,
                                color = TextSecondary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    GlobalActionChip(
                        iconRes = R.drawable.ic_history_24,
                        contentDescription = stringResource(R.string.codex_native_thread_history_title),
                        onClick = onOpenThreadHistory,
                        enabled = historyEnabled,
                        active = state.threadHistorySheetVisible,
                        boxSize = 46.dp,
                        iconSize = 25.dp
                    )
                    GlobalActionChip(
                        iconRes = R.drawable.ic_codex_docs_24,
                        contentDescription = stringResource(R.string.codex_native_header_docs),
                        onClick = onOpenDocs,
                        enabled = docsEnabled,
                        boxSize = 46.dp,
                        iconSize = 25.dp
                    )
                }
            }
        }
    }
}

@Composable
private fun GlobalActionChip(
    iconRes: Int,
    contentDescription: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    active: Boolean = false,
    boxSize: Dp = 44.dp,
    iconSize: Dp = 20.dp
) {
    Box(
        modifier = Modifier
            .size(boxSize)
            .semantics(mergeDescendants = true) {
                this.contentDescription = contentDescription
                role = Role.Button
            }
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            painter = painterResource(iconRes),
            contentDescription = contentDescription,
            tint = when {
                !enabled -> TextMuted
                active -> AccentBlue
                else -> TextSecondary
            },
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
private fun ErrorBanner(
    message: String,
    onRetry: () -> Unit,
    onDismiss: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        color = ErrorBg,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, ErrorColor.copy(alpha = 0.45f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = message,
                color = TextPrimary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(
                    onClick = onRetry,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = AccentBlue.copy(alpha = 0.2f),
                        contentColor = AccentBlue
                    )
                ) {
                    Text(stringResource(R.string.codex_native_retry))
                }
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.codex_native_dismiss))
                }
            }
        }
    }
}

@Composable
private fun RuntimeStallBanner(
    info: RuntimeStallInfo,
    onRetry: () -> Unit,
    onShowDiagnostics: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = SystemBg,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, WarningColor.copy(alpha = 0.4f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = stringResource(R.string.codex_native_runtime_stall_title),
                color = TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = runtimeStallReasonText(info.reason),
                color = TextPrimary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(
                    R.string.codex_native_runtime_stall_detail,
                    formatRuntimeDuration(info.runningForMillis),
                    formatClockTime(info.lastEventAtMillis),
                    formatRuntimeDuration(info.lastEventAgoMillis)
                ),
                color = TextSecondary,
                fontSize = 12.sp,
                lineHeight = 18.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(
                    onClick = onRetry,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = WarningColor.copy(alpha = 0.16f),
                        contentColor = WarningColor
                    )
                ) {
                    Text(stringResource(R.string.codex_native_retry))
                }
                TextButton(onClick = onShowDiagnostics) {
                    Text(stringResource(R.string.codex_native_runtime_stall_diagnostics))
                }
            }
        }
    }
}

@Composable
private fun ReturnToLatestButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val label = stringResource(R.string.codex_native_return_latest)
    FilledTonalButton(
        onClick = onClick,
        modifier = modifier.semantics {
            contentDescription = label
            role = Role.Button
        },
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = AccentBlue.copy(alpha = 0.18f),
            contentColor = AccentBlue
        ),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

private data class HeaderQuotaChipState(
    val title: String,
    val value: String
)

@Composable
private fun HeaderQuotaChip(
    chip: HeaderQuotaChipState,
    tone: String
) {
    val accentColor = when (tone) {
        "error" -> ErrorColor
        "warn" -> WarningColor
        else -> AccentBlue
    }
    Surface(
        color = accentColor.copy(alpha = 0.1f),
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.28f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = chip.title,
                color = TextMuted,
                fontSize = 8.sp,
                lineHeight = 10.sp,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = chip.value,
                color = accentColor,
                fontSize = 10.sp,
                lineHeight = 12.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

private fun buildHeaderQuotaChips(
    summary: String,
    oneWeekLabel: String
): List<HeaderQuotaChipState> {
    if (summary.isBlank()) return emptyList()
    return summary.split('|').mapNotNull { part ->
        val trimmed = part.trim()
        if (trimmed.isBlank()) {
            return@mapNotNull null
        }
        if (trimmed.startsWith("↺") || trimmed.startsWith("⏱") || Regex("""^\+\d+$""").matches(trimmed)) {
            return@mapNotNull null
        }
        val scopedRemainingMatch = Regex("""^([^\s:]+):(\d+(?:/\d+)?)$""").matchEntire(trimmed)
        if (scopedRemainingMatch != null) {
            return@mapNotNull HeaderQuotaChipState(
                title = localizeHeaderQuotaWindow(scopedRemainingMatch.groupValues[1], oneWeekLabel),
                value = scopedRemainingMatch.groupValues[2]
            )
        }
        val percentResetMatch = Regex("""^(\S+)\s+(\d{1,3})%\s+(.+)$""").matchEntire(trimmed)
        if (percentResetMatch != null) {
            val window = localizeHeaderQuotaWindow(percentResetMatch.groupValues[1], oneWeekLabel)
            val usedPercent = percentResetMatch.groupValues[2].toIntOrNull()?.coerceIn(0, 100)
                ?: return@mapNotNull null
            val resetHint = cleanHeaderQuotaResetHint(percentResetMatch.groupValues[3])
            return@mapNotNull HeaderQuotaChipState(
                title = window,
                value = buildString {
                    append(100 - usedPercent)
                    append('%')
                    if (resetHint.isNotBlank()) {
                        append(" · ")
                        append(resetHint)
                    }
                }
            )
        }
        val percentMatch = Regex("""^(\S+)\s+(\d{1,3})%$""").matchEntire(trimmed)
        if (percentMatch != null) {
            val window = localizeHeaderQuotaWindow(percentMatch.groupValues[1], oneWeekLabel)
            val usedPercent = percentMatch.groupValues[2].toIntOrNull()?.coerceIn(0, 100) ?: return@mapNotNull null
            return@mapNotNull HeaderQuotaChipState(
                title = window,
                value = "${100 - usedPercent}%"
            )
        }
        val firstSpace = trimmed.indexOf(' ')
        return@mapNotNull if (firstSpace > 0) {
            HeaderQuotaChipState(
                title = localizeHeaderQuotaWindow(trimmed.substring(0, firstSpace), oneWeekLabel),
                value = trimmed.substring(firstSpace + 1)
            )
        } else {
            HeaderQuotaChipState(
                title = localizeHeaderQuotaWindow(trimmed, oneWeekLabel),
                value = ""
            )
        }
    }
}

private fun localizeHeaderQuotaWindow(raw: String, oneWeekLabel: String): String = when (raw.trim().lowercase()) {
    "168h", "7d", "1w", "one-week", "one_week", "oneweek" -> oneWeekLabel
    else -> raw.trim()
}

private fun cleanHeaderQuotaResetHint(value: String): String {
    val trimmed = value.trim()
    return trimmed
        .removePrefix("⏱")
        .removePrefix("resets ")
        .removePrefix("重置 ")
        .removePrefix("重置")
        .trim()
}

@Composable
private fun formatRateLimitSummaryForDisplay(
    summary: String,
    remainingLabel: String,
    resetsPrefix: String,
    retryPrefix: String
): String {
    if (summary.isBlank()) return ""
    return summary.split('|').mapNotNull { part ->
        val trimmed = part.trim()
        when {
            trimmed.isBlank() -> null
            trimmed.startsWith("↺") -> {
                val retryValue = trimmed.removePrefix("↺").trim()
                if (retryValue.isBlank()) null else "$retryPrefix $retryValue".trim()
            }
            trimmed.startsWith("⏱") -> {
                val resetHint = cleanHeaderQuotaResetHint(trimmed)
                if (resetHint.isBlank()) null else "$resetsPrefix$resetHint".trim()
            }
            else -> {
                val extraScopesMatch = Regex("""^\+(\d+)$""").matchEntire(trimmed)
                if (extraScopesMatch != null) {
                    val extraCount = extraScopesMatch.groupValues[1].toIntOrNull()
                    return@mapNotNull extraCount?.let {
                        stringResource(R.string.codex_native_status_quota_extra_scopes, it)
                    }
                }

                val remainingMatch = Regex("""^([^\s:]+):(\d+(?:/\d+)?)$""").matchEntire(trimmed)
                if (remainingMatch != null) {
                    val windowLabel = localizeDetailedQuotaWindow(remainingMatch.groupValues[1])
                    return@mapNotNull "$windowLabel ${remainingMatch.groupValues[2]} $remainingLabel".trim()
                }

                val percentResetMatch = Regex("""^(\S+)\s+(\d{1,3})%\s+(.+)$""").matchEntire(trimmed)
                if (percentResetMatch != null) {
                    val windowLabel = localizeDetailedQuotaWindow(percentResetMatch.groupValues[1])
                    val usedPercent = percentResetMatch.groupValues[2].toIntOrNull()?.coerceIn(0, 100)
                        ?: return@mapNotNull trimmed
                    val resetHint = cleanHeaderQuotaResetHint(percentResetMatch.groupValues[3])
                    return@mapNotNull buildString {
                        append(windowLabel)
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
                    val windowLabel = localizeDetailedQuotaWindow(percentMatch.groupValues[1])
                    val usedPercent = percentMatch.groupValues[2].toIntOrNull()?.coerceIn(0, 100)
                        ?: return@mapNotNull trimmed
                    return@mapNotNull "$windowLabel ${100 - usedPercent}% $remainingLabel".trim()
                }

                trimmed
            }
        }
    }.joinToString(" | ")
}

@Composable
private fun localizeDetailedQuotaWindow(raw: String): String {
    val normalized = raw.trim().lowercase()
    return when {
        normalized in setOf("5h", "300m", "300min", "300mins", "300minutes") ->
            stringResource(R.string.codex_native_status_quota_window_five_hours)
        normalized in setOf("168h", "7d", "1w", "one-week", "one_week", "oneweek") ->
            stringResource(R.string.codex_native_status_quota_window_one_week)
        normalized in setOf("p", "primary") ->
            stringResource(R.string.codex_native_status_quota_window_primary)
        normalized in setOf("s", "secondary") ->
            stringResource(R.string.codex_native_status_quota_window_secondary)
        Regex("""^\d+m$""").matches(normalized) ->
            stringResource(
                R.string.codex_native_status_quota_window_minutes,
                normalized.removeSuffix("m").toIntOrNull() ?: return raw.trim()
            )
        Regex("""^\d+h$""").matches(normalized) ->
            stringResource(
                R.string.codex_native_status_quota_window_hours,
                normalized.removeSuffix("h").toIntOrNull() ?: return raw.trim()
            )
        else -> raw.trim()
    }
}

@Composable
private fun CodexDialogSurface(
    maxHeight: Dp = 680.dp,
    content: @Composable () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 560.dp)
            .heightIn(max = maxHeight)
            .padding(horizontal = 16.dp),
        shape = MaterialTheme.shapes.large,
        color = SurfaceColor,
        border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.95f)),
        shadowElevation = 18.dp,
        content = content
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CommandApprovalDialog(
    request: CodexServerRequest,
    submitting: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        CodexDialogSurface {
            Column(modifier = Modifier.padding(18.dp)) {
                // header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = approvalTitle(request),
                            color = Color(0xFFC9D1D9),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 20.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (submitting) {
                                stringResource(R.string.codex_native_approval_status_submitting)
                            } else {
                                stringResource(R.string.codex_native_approval_status_pending)
                            },
                            color = Color(0xFF9CB0C9),
                            fontSize = 11.sp,
                            lineHeight = 16.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
                // body
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 320.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = approvalSummary(request),
                        color = Color(0xFFD7E4F3),
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                    request.command?.takeIf { it.isNotBlank() }?.let { command ->
                        Surface(
                            color = BgColor,
                            shape = MaterialTheme.shapes.medium,
                            border = BorderStroke(1.dp, SurfaceBorder)
                        ) {
                            Text(
                                text = command,
                                color = Color(0xFFC9D1D9),
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
                // actions
                Spacer(modifier = Modifier.height(16.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_approval_reject),
                        onClick = onReject,
                        enabled = !submitting,
                        variant = ModalButtonVariant.DANGER
                    )
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_approval_approve),
                        onClick = onApprove,
                        enabled = !submitting,
                        variant = ModalButtonVariant.PRIMARY
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun UserInputRequestDialog(
    request: CodexServerRequest,
    submitting: Boolean,
    onSubmit: (Map<String, String>) -> Unit,
    onReject: () -> Unit
) {
    val supportsAnswers = remember(request.requestId) {
        request.questions.isNotEmpty() && request.questions.all { question ->
            question.options.isNotEmpty() || question.allowFreeform
        }
    }
    val selectedAnswers = remember(request.requestId) { mutableStateMapOf<String, String>() }
    val freeformValues = remember(request.requestId) { mutableStateMapOf<String, String>() }
    val submitEnabled = supportsAnswers &&
        request.questions.all { question -> !selectedAnswers[question.id].isNullOrBlank() } &&
        !submitting

    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        CodexDialogSurface {
            Column(modifier = Modifier.padding(18.dp)) {
                // header
                Text(
                    text = approvalTitle(request),
                    color = Color(0xFFC9D1D9),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 20.sp
                )
                Spacer(modifier = Modifier.height(14.dp))
                // body
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 380.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = approvalSummary(request),
                        color = Color(0xFFD7E4F3),
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                    if (supportsAnswers) {
                        request.questions.forEach { question ->
                            UserInputQuestionCard(
                                question = question,
                                currentAnswer = selectedAnswers[question.id],
                                freeformValue = freeformValues[question.id].orEmpty(),
                                onSelectOption = { answer ->
                                    selectedAnswers[question.id] = answer
                                    freeformValues[question.id] = ""
                                },
                                onFreeformChange = { value ->
                                    freeformValues[question.id] = value
                                    val trimmed = value.trim()
                                    if (trimmed.isBlank()) {
                                        selectedAnswers.remove(question.id)
                                    } else {
                                        selectedAnswers[question.id] = trimmed
                                    }
                                }
                            )
                        }
                    } else {
                        Text(
                            text = stringResource(R.string.codex_native_approval_client_only_options),
                            color = TextMuted,
                            fontSize = 13.sp
                        )
                    }
                    if (submitting) {
                        Text(
                            text = stringResource(R.string.codex_native_approval_status_submitting),
                            color = Color(0xFF9CB0C9),
                            fontSize = 12.sp
                        )
                    }
                }
                // actions
                Spacer(modifier = Modifier.height(16.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_approval_cancel),
                        onClick = onReject,
                        enabled = !submitting,
                        variant = ModalButtonVariant.SUBTLE
                    )
                    if (supportsAnswers) {
                        ModalActionButton(
                            text = stringResource(R.string.codex_native_approval_submit),
                            onClick = { onSubmit(selectedAnswers.toMap()) },
                            enabled = submitEnabled,
                            variant = ModalButtonVariant.PRIMARY
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UserInputQuestionCard(
    question: CodexServerRequestQuestion,
    currentAnswer: String?,
    freeformValue: String,
    onSelectOption: (String) -> Unit,
    onFreeformChange: (String) -> Unit
    ) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = question.question.ifBlank { question.id.ifBlank { stringResource(R.string.codex_native_approval_question_fallback) } },
            color = TextPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 18.sp
        )
        if (question.options.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                question.options.forEachIndexed { index, option ->
                    val optionLabel = option.label
                    ApprovalOptionChip(
                        text = optionLabel,
                        selected = currentAnswer == optionLabel && freeformValue.isBlank(),
                        recommended = index == 0 || optionLabel.contains("(Recommended)", ignoreCase = true) || optionLabel.contains("推荐"),
                        onClick = { onSelectOption(optionLabel) }
                    )
                }
            }
        }
        if (question.allowFreeform) {
            TextField(
                value = freeformValue,
                onValueChange = onFreeformChange,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                placeholder = {
                    Text(
                        text = stringResource(R.string.codex_native_approval_freeform_placeholder),
                        color = TextMuted
                    )
                },
                colors = TextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = SurfaceRaised,
                    unfocusedContainerColor = SurfaceRaised,
                    cursorColor = AccentBlue,
                    focusedIndicatorColor = AccentBlue,
                    unfocusedIndicatorColor = SurfaceBorder
                ),
                singleLine = true
            )
        }
    }
}

@Composable
private fun ApprovalOptionChip(
    text: String,
    selected: Boolean,
    recommended: Boolean,
    onClick: () -> Unit
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = if (selected) Color(0x1A4DAAFC) else Color(0x08FFFFFF),
        border = BorderStroke(
            1.dp,
            if (selected) Color(0x4D4DAAFC) else Color(0x14FFFFFF)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = text,
                color = Color(0xFFE6EEF8),
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 18.sp
            )
            if (recommended && !selected) {
                Text(
                    text = "Recommended",
                    color = Color(0xFF9CB0C9),
                    fontSize = 11.sp,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

private enum class ModalButtonVariant { PRIMARY, SUCCESS, DANGER, SUBTLE, DEFAULT }

@Composable
private fun ModalActionButton(
    text: String,
    onClick: () -> Unit,
    variant: ModalButtonVariant,
    enabled: Boolean = true
) {
    val (borderColor, bgColor, textColor) = when (variant) {
        ModalButtonVariant.PRIMARY -> Triple(
            Color(0x664EDEA3),
            Color(0x0F4EDEA3),
            Color(0xFFC9D1D9)
        )
        ModalButtonVariant.SUCCESS -> Triple(
            Color(0x664EDEA3),
            Color(0x264EDEA3),
            Color(0xFF4EDEA3)
        )
        ModalButtonVariant.DANGER -> Triple(
            Color(0x40F85149),
            Color(0x14F85149),
            Color(0xFFFF9993)
        )
        ModalButtonVariant.SUBTLE -> Triple(
            SurfaceBorder,
            Color(0x05FFFFFF),
            Color(0xFF8B949E)
        )
        ModalButtonVariant.DEFAULT -> Triple(
            SurfaceBorder,
            Color(0x0F4EDEA3),
            Color(0xFFC9D1D9)
        )
    }
    Surface(
        shape = MaterialTheme.shapes.small,
        color = if (enabled) bgColor else bgColor.copy(alpha = 0.4f),
        border = BorderStroke(1.dp, if (enabled) borderColor else borderColor.copy(alpha = 0.4f)),
        modifier = Modifier
            .heightIn(min = 44.dp)
            .clickable(enabled = enabled, onClick = onClick)
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = if (enabled) textColor else textColor.copy(alpha = 0.4f),
                fontSize = 12.sp,
                lineHeight = 14.sp,
                maxLines = 1
            )
        }
    }
}

private fun formatHeaderCwdForDisplay(cwd: String): String {
    val normalized = cwd.trim().replace('\\', '/')
    if (normalized.contains('/')) {
        return normalized
    }
    val withDriveSeparator = normalized.replace(Regex("^([A-Za-z]):(?=[^/])"), "$1:/")
    val suffix = withDriveSeparator.substringAfter(":/", "")
    if (suffix.isBlank() || suffix.contains('/')) {
        return withDriveSeparator
    }
    val firstUppercaseIndex = suffix.indexOfFirst { it.isUpperCase() }
    if (firstUppercaseIndex <= 0) {
        return withDriveSeparator
    }
    return buildString {
        append(withDriveSeparator.substringBefore(":/"))
        append(":/")
        append(suffix.substring(0, firstUppercaseIndex))
        append('/')
        append(suffix.substring(firstUppercaseIndex))
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun MessageBubble(message: ChatMessage) {
    if (message.collapsible) {
        CollapsibleExecutionItem(message)
        return
    }
    val spec = remember(message.role) { bubbleSpec(message.role) }
    val label = roleLabel(message)
    val timeLabel = remember(message.timestamp) {
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(message.timestamp))
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = spec.background,
        border = BorderStroke(1.dp, spec.border)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 76.dp)
                .padding(horizontal = 12.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            MessageAvatar(role = message.role)
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = label,
                        color = spec.labelColor,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = timeLabel,
                        color = TextMuted,
                        fontSize = 10.sp,
                        lineHeight = 14.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Column {
                    if (message.role == ChatMessage.Role.USER &&
                        (message.skills.isNotEmpty() ||
                            message.fileMentions.isNotEmpty() ||
                            message.attachments.isNotEmpty())
                    ) {
                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            message.skills.forEach { skill ->
                                UserMessageSkillChip(skillName = skill.name)
                            }
                            message.fileMentions.forEach { mention ->
                                StaticMentionChip(file = mention)
                            }
                            message.attachments.forEach { attachment ->
                                StaticAttachmentChip(attachment = attachment)
                            }
                        }
                    }
                    if (message.role == ChatMessage.Role.TOOL && !message.toolName.isNullOrBlank()) {
                        Text(
                            text = message.toolName,
                            color = TextMuted,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }
                    SelectionContainer {
                        Text(
                            text = if (message.role == ChatMessage.Role.USER) {
                                buildComposerTransformedText(
                                    text = message.content,
                                    mentions = message.fileMentions,
                                    textColor = spec.textColor
                                ).text
                            } else {
                                buildComposerAnnotatedString(
                                    text = message.content,
                                    mentions = message.fileMentions,
                                    textColor = spec.textColor
                                )
                            },
                            color = spec.textColor,
                            fontSize = 13.sp,
                            lineHeight = 20.sp,
                            fontFamily = if (message.role == ChatMessage.Role.TOOL) {
                                FontFamily.Monospace
                            } else {
                                FontFamily.Default
                            }
                        )
                    }
                }
                if (message.streaming) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        PulsingDot(color = SuccessColor, animated = true, size = 7.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = stringResource(R.string.codex_native_status_streaming),
                            color = TextSecondary,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageAvatar(role: ChatMessage.Role) {
    val (background, tint, iconRes) = when (role) {
        ChatMessage.Role.USER -> Triple(Color(0xFF4389F6), Color.White, R.drawable.ic_person_24)
        ChatMessage.Role.ASSISTANT -> Triple(Color(0xFF2FA88B), Color.White, R.drawable.ic_sparkle_24)
        ChatMessage.Role.TOOL -> Triple(WarningColor.copy(alpha = 0.12f), WarningColor, R.drawable.ic_tool_24)
        ChatMessage.Role.SYSTEM -> Triple(WarningColor.copy(alpha = 0.12f), WarningColor, R.drawable.ic_tool_24)
        ChatMessage.Role.ERROR -> Triple(ErrorColor.copy(alpha = 0.14f), ErrorColor, R.drawable.ic_tool_24)
    }
    Surface(
        modifier = Modifier.size(38.dp),
        color = background,
        shape = CircleShape,
        border = if (role == ChatMessage.Role.TOOL) BorderStroke(1.dp, WarningColor.copy(alpha = 0.7f)) else null
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                painter = painterResource(iconRes),
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(21.dp)
            )
        }
    }
}

@Composable
private fun CollapsibleExecutionItem(message: ChatMessage) {
    var expanded by remember { mutableStateOf(false) }
    val executionRoleLabel = roleLabel(message)
    val timeLabel = remember(message.timestamp) {
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(message.timestamp))
    }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = ToolBg,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.48f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 76.dp)
                .clickable { expanded = !expanded }
                .padding(horizontal = 12.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            MessageAvatar(role = ChatMessage.Role.TOOL)
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = executionRoleLabel,
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = timeLabel,
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (expanded) "▾" else "▸",
                        color = WarningColor,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(end = 7.dp)
                    )
                    Text(
                        text = message.collapsedLabel.ifBlank {
                            message.toolName.orEmpty().ifBlank { executionRoleLabel }
                        },
                        color = TextPrimary,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                if (!expanded && message.content.isNotBlank()) {
                    Text(
                        text = message.content.lines().first(),
                        color = TextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                if (expanded && message.content.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 200.dp)
                            .verticalScroll(rememberScrollState())
                            .padding(top = 8.dp)
                    ) {
                        SelectionContainer {
                            Text(
                                text = message.content,
                                color = TextPrimary,
                                fontSize = 11.sp,
                                lineHeight = 16.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
                if (message.streaming) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        PulsingDot(color = WarningColor, animated = true, size = 8.dp)
                    }
                }
            }
        }
    }
}

private fun isMessageListAtBottom(
    listState: androidx.compose.foundation.lazy.LazyListState,
    lastIndex: Int
): Boolean {
    if (lastIndex <= 0) {
        return true
    }
    if (!listState.canScrollForward) {
        return true
    }
    val layoutInfo = listState.layoutInfo
    val lastContentIndex = lastIndex - 1
    val lastVisible = layoutInfo.visibleItemsInfo.lastOrNull { item ->
        item.index <= lastContentIndex
    } ?: return false
    if (lastVisible.index < lastContentIndex) {
        return false
    }
    val viewportEnd = layoutInfo.viewportEndOffset - layoutInfo.afterContentPadding
    val lastItemEnd = lastVisible.offset + lastVisible.size
    return lastItemEnd <= viewportEnd + 24
}

private enum class RuntimeStallReason {
    WAITING_APPROVAL,
    WAITING_INPUT,
    RECONNECTING,
    STREAM_STALLED,
    RUNNING_SILENT
}

private data class RuntimeStallInfo(
    val reason: RuntimeStallReason,
    val runningForMillis: Long,
    val lastEventAgoMillis: Long,
    val lastEventAtMillis: Long
)

private fun buildRuntimeStallInfo(
    state: CodexUiState,
    isStreaming: Boolean,
    nowMillis: Long
): RuntimeStallInfo? {
    val watch = state.executionWatch
    if (!watch.active || state.errorMessage != null) {
        return null
    }
    if (
        state.planWorkflow.phase == "awaiting_user_input" ||
        state.planWorkflow.phase == "plan_ready_for_confirmation"
    ) {
        return null
    }
    if (watch.runningSinceMillis <= 0L || watch.lastEventAtMillis <= 0L) {
        return null
    }
    val lastEventAgoMillis = (nowMillis - watch.lastEventAtMillis).coerceAtLeast(0L)
    if (lastEventAgoMillis < RuntimeStallThresholdMillis) {
        return null
    }
    val runningForMillis = (nowMillis - watch.runningSinceMillis).coerceAtLeast(lastEventAgoMillis)
    val reason = when {
        state.pendingServerRequests.any { it.responseMode == "decision" } -> RuntimeStallReason.WAITING_APPROVAL
        state.pendingServerRequests.any { it.responseMode == "answers" } ||
            state.planWorkflow.phase == "awaiting_user_input" -> RuntimeStallReason.WAITING_INPUT
        state.connectionState == ConnectionState.RECONNECTING ||
            state.connectionState == ConnectionState.CONNECTING -> RuntimeStallReason.RECONNECTING
        isStreaming -> RuntimeStallReason.STREAM_STALLED
        else -> RuntimeStallReason.RUNNING_SILENT
    }
    return RuntimeStallInfo(
        reason = reason,
        runningForMillis = runningForMillis,
        lastEventAgoMillis = lastEventAgoMillis,
        lastEventAtMillis = watch.lastEventAtMillis
    )
}

@Composable
private fun runtimeStallReasonText(reason: RuntimeStallReason): String = when (reason) {
    RuntimeStallReason.WAITING_APPROVAL ->
        stringResource(R.string.codex_native_runtime_stall_reason_waiting_approval)
    RuntimeStallReason.WAITING_INPUT ->
        stringResource(R.string.codex_native_runtime_stall_reason_waiting_input)
    RuntimeStallReason.RECONNECTING ->
        stringResource(R.string.codex_native_runtime_stall_reason_reconnecting)
    RuntimeStallReason.STREAM_STALLED ->
        stringResource(R.string.codex_native_runtime_stall_reason_stream_stalled)
    RuntimeStallReason.RUNNING_SILENT ->
        stringResource(R.string.codex_native_runtime_stall_reason_running_silent)
}

private fun formatRuntimeDuration(durationMillis: Long): String {
    val totalSeconds = (durationMillis / 1000L).coerceAtLeast(0L)
    val hours = totalSeconds / 3600L
    val minutes = (totalSeconds % 3600L) / 60L
    val seconds = totalSeconds % 60L
    val isZh = Locale.getDefault().language.startsWith("zh")
    return when {
        hours > 0L -> if (isZh) {
            "${hours}小时${minutes}分"
        } else {
            "${hours}h ${minutes}m"
        }
        minutes > 0L -> if (isZh) {
            "${minutes}分${seconds}秒"
        } else {
            "${minutes}m ${seconds}s"
        }
        else -> if (isZh) {
            "${seconds}秒"
        } else {
            "${seconds}s"
        }
    }
}

private fun formatClockTime(epochMillis: Long): String {
    val formatter = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    return formatter.format(Date(epochMillis))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PlanConfirmationDialog(
    state: CodexUiState,
    onExecuteConfirmedPlan: () -> Unit,
    onContinuePlanWorkflow: () -> Unit,
    onCancelPlanWorkflow: () -> Unit
) {
    val planText = state.planWorkflow.confirmedPlanText.ifBlank {
        state.planWorkflow.latestPlanText
    }

    Dialog(
        onDismissRequest = onCancelPlanWorkflow,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        CodexDialogSurface {
            Column(modifier = Modifier.padding(18.dp)) {
                // header
                Text(
                    text = stringResource(R.string.codex_native_plan_workflow_title_ready),
                    color = Color(0xFFC9D1D9),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 20.sp
                )
                Spacer(modifier = Modifier.height(14.dp))
                // body
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 360.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_plan_workflow_summary_ready),
                        color = Color(0xFFD7E4F3),
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )
                    if (planText.isNotBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Surface(
                            color = BgColor,
                            shape = MaterialTheme.shapes.medium,
                            border = BorderStroke(1.dp, SurfaceBorder)
                        ) {
                            Text(
                                text = planText,
                                color = Color(0xFFC9D1D9),
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
                // actions
                Spacer(modifier = Modifier.height(16.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_plan_workflow_cancel),
                        onClick = onCancelPlanWorkflow,
                        variant = ModalButtonVariant.SUBTLE
                    )
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_plan_workflow_continue),
                        onClick = onContinuePlanWorkflow,
                        variant = ModalButtonVariant.DEFAULT
                    )
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_plan_workflow_execute),
                        onClick = onExecuteConfirmedPlan,
                        variant = ModalButtonVariant.SUCCESS
                    )
                }
            }
        }
    }
}

@Composable
private fun NoticesPanelSheet(
    state: CodexUiState
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        state.noticesPanel.configWarningText.takeIf { it.isNotBlank() }?.let {
            NoticeCard(
                label = stringResource(R.string.codex_native_notice_config),
                text = it,
                labelColor = WarningColor,
                textColor = TextPrimary,
                borderColor = WarningColor.copy(alpha = 0.25f),
                backgroundColor = Color(0x333A2C16)
            )
        }
        state.noticesPanel.deprecationNoticeText.takeIf { it.isNotBlank() }?.let {
            NoticeCard(
                label = stringResource(R.string.codex_native_notice_deprecation),
                text = it,
                labelColor = Color(0xFFD2A8FF),
                textColor = Color(0xFFE7DCFF),
                borderColor = Color(0x33D2A8FF),
                backgroundColor = Color(0x263A2C16)
            )
        }
    }
}

@Composable
private fun NoticeCard(
    label: String,
    text: String,
    labelColor: Color,
    textColor: Color,
    borderColor: Color,
    backgroundColor: Color
) {
    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = label.uppercase(Locale.ROOT),
                color = labelColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 12.sp,
                letterSpacing = 0.4.sp
            )
            Text(
                text = text,
                color = textColor,
                fontSize = 12.sp,
                lineHeight = 17.sp
            )
        }
    }
}

private data class RuntimePanelSection(
    val key: String,
    val title: String,
    val content: String,
    val summary: String = ""
)

@Composable
private fun RuntimePanelSheet(
    state: CodexUiState
) {
    val workflowPlanText = state.planWorkflow.confirmedPlanText.ifBlank {
        state.planWorkflow.latestPlanText
    }
    val planContent = state.runtimePanel.plan.ifBlank {
        workflowPlanText
    }
    val expandedSections = remember {
        mutableStateMapOf(
            "diff" to false,
            "plan" to false,
            "reasoning" to false
        )
    }
    val runtimeSections = listOf(
        RuntimePanelSection(
            "diff",
            stringResource(R.string.codex_native_runtime_diff),
            state.runtimePanel.diff.ifBlank { stringResource(R.string.codex_native_runtime_waiting_diff) },
            summarizeDiffPreview(state.runtimePanel.diff)
        ),
        RuntimePanelSection(
            "plan",
            stringResource(R.string.codex_native_runtime_plan),
            planContent.ifBlank { stringResource(R.string.codex_native_runtime_waiting_plan) },
            summarizeNarrativePreview(planContent)
        ),
        RuntimePanelSection(
            "reasoning",
            stringResource(R.string.codex_native_runtime_reasoning),
            state.runtimePanel.reasoning.ifBlank { stringResource(R.string.codex_native_runtime_waiting_reasoning) },
            summarizeNarrativePreview(state.runtimePanel.reasoning)
        )
    )

    LaunchedEffect(
        state.runtimePanel.diff,
        planContent,
        state.runtimePanel.reasoning
    ) {
        if (state.runtimePanel.diff.isNotBlank()) expandedSections["diff"] = true
        if (planContent.isNotBlank()) expandedSections["plan"] = true
        if (state.runtimePanel.reasoning.isNotBlank()) expandedSections["reasoning"] = true
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 280.dp)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = SurfaceColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.codex_native_runtime_title).uppercase(Locale.ROOT),
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.4.sp,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                runtimeSections.forEach { section ->
                    RuntimeSectionCard(
                        modifier = Modifier.fillMaxWidth(),
                        title = section.title,
                        content = section.content,
                        summary = section.summary,
                        expanded = expandedSections[section.key] == true,
                        onToggle = {
                            expandedSections[section.key] = !(expandedSections[section.key] == true)
                        }
                    )
                }
                if (state.runtimePanel.warning.isNotBlank()) {
                    Text(
                        text = state.runtimePanel.warning,
                        color = if (state.runtimePanel.warningTone == "error") ErrorColor else WarningColor,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun RuntimeSectionCard(
    modifier: Modifier = Modifier,
    title: String,
    content: String,
    summary: String = "",
    tone: String = "",
    expanded: Boolean = false,
    onToggle: (() -> Unit)? = null
) {
    val titleColor = when (tone) {
        "error" -> ErrorColor
        "warn" -> WarningColor
        else -> TextSecondary
    }
    Surface(
        modifier = modifier,
        color = BgColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(
            1.dp,
            when {
                tone == "error" -> ErrorColor.copy(alpha = 0.4f)
                tone == "warn" -> WarningColor.copy(alpha = 0.4f)
                expanded -> SuccessColor.copy(alpha = 0.15f)
                else -> SurfaceBorder
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (expanded) SuccessColor.copy(alpha = 0.03f) else BgColor)
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = onToggle != null) { onToggle?.invoke() }
            ) {
                Text(
                    text = title.uppercase(Locale.ROOT),
                    color = titleColor,
                    fontSize = 10.sp,
                    lineHeight = 12.sp,
                    letterSpacing = 0.4.sp,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = if (expanded) "▾" else "▸",
                    color = TextSecondary,
                    fontSize = 10.sp
                )
            }
            summary.takeIf { it.isNotBlank() }?.let { preview ->
                Text(
                    text = preview,
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    maxLines = if (expanded) Int.MAX_VALUE else 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (expanded) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 240.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = content,
                        color = TextPrimary,
                        fontSize = 11.sp,
                        lineHeight = 16.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SkillsPickerSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectSkill: (String?) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var expandedSkillName by remember { mutableStateOf<String?>(null) }
    val normalizedQuery = query.trim()
    val filteredSkills = remember(state.toolsPanel.skills, normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            state.toolsPanel.skills
        } else {
            state.toolsPanel.skills.filter { skill ->
                skill.name.contains(normalizedQuery, ignoreCase = true) ||
                    skill.label.contains(normalizedQuery, ignoreCase = true) ||
                    skill.description.contains(normalizedQuery, ignoreCase = true)
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.codex_native_tools_skills_title),
                        color = TextPrimary,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(
                            R.string.codex_native_tools_skills_count,
                            state.toolsPanel.skills.size
                        ),
                        color = TextMuted,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                }
            }
            Text(
                text = stringResource(R.string.codex_native_tools_skills_description),
                color = TextSecondary,
                fontSize = 12.sp,
                lineHeight = 17.sp
            )
            TextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        text = stringResource(R.string.codex_native_tools_skills_search_hint),
                        color = TextMuted
                    )
                },
                singleLine = true,
                shape = MaterialTheme.shapes.medium,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = BgColor,
                    unfocusedContainerColor = BgColor,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedIndicatorColor = AccentBlue,
                    unfocusedIndicatorColor = SurfaceBorder,
                    cursorColor = AccentBlue
                )
            )
            when {
                state.toolsPanel.loading -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 120.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = AccentBlue,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = stringResource(R.string.codex_native_tools_skills_loading),
                            color = TextSecondary,
                            fontSize = 13.sp
                        )
                    }
                }
                filteredSkills.isEmpty() -> {
                    Text(
                        text = stringResource(
                            if (state.toolsPanel.skills.isEmpty()) {
                                R.string.codex_native_tools_skills_empty
                            } else {
                                R.string.codex_native_tools_skills_no_match
                            }
                        ),
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(vertical = 24.dp)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 480.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(filteredSkills, key = { it.name }) { skill ->
                            ToolSkillItem(
                                skill = skill,
                                selected = state.interactionState?.activeSkill == skill.name,
                                expanded = expandedSkillName == skill.name,
                                onToggle = {
                                    expandedSkillName = if (expandedSkillName == skill.name) null else skill.name
                                },
                                onSelect = { onSelectSkill(skill.name) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolSkillItem(
    skill: CodexSkillEntry,
    selected: Boolean,
    expanded: Boolean,
    onToggle: () -> Unit,
    onSelect: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(
                when {
                    expanded -> SuccessColor.copy(alpha = 0.03f)
                    else -> Color.Transparent
                }
            )
            .border(
                width = 1.dp,
                color = when {
                    expanded || selected -> SuccessColor.copy(alpha = 0.25f)
                    else -> SurfaceBorder
                },
                shape = MaterialTheme.shapes.medium
            )
            .clickable(onClick = onToggle)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = if (expanded) Alignment.Top else Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = skill.label,
                    color = TextPrimary,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = skill.description.ifBlank {
                        stringResource(R.string.codex_native_tools_skill_no_description)
                    },
                    color = TextSecondary,
                    fontSize = 10.sp,
                    lineHeight = 13.sp,
                    maxLines = if (expanded) Int.MAX_VALUE else 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (expanded) {
                    Column(
                        modifier = Modifier.padding(top = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.7f))
                        skill.scope.takeIf { it.isNotBlank() }?.let {
                            Text(
                                text = stringResource(R.string.codex_native_tools_skill_scope, it),
                                color = TextSecondary,
                                fontSize = 10.sp,
                                lineHeight = 13.sp
                            )
                        }
                        skill.defaultPrompt.takeIf { it.isNotBlank() }?.let {
                            Text(
                                text = stringResource(R.string.codex_native_tools_skill_prompt, it),
                                color = TextSecondary,
                                fontSize = 10.sp,
                                lineHeight = 14.sp
                            )
                        }
                        if (skill.scope.isBlank() && skill.defaultPrompt.isBlank()) {
                            Text(
                                text = skill.description.ifBlank {
                                    stringResource(R.string.codex_native_tools_skill_no_description)
                                },
                                color = TextSecondary,
                                fontSize = 10.sp,
                                lineHeight = 13.sp
                            )
                        }
                    }
                }
            }
            ToolSkillSelectButton(
                text = stringResource(R.string.codex_native_tools_skill_select),
                onClick = onSelect,
                active = selected,
                modifier = Modifier.padding(top = if (expanded) 2.dp else 0.dp)
            )
        }
    }
}

@Composable
private fun ToolSkillSelectButton(
    text: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(if (active) SuccessColor.copy(alpha = 0.08f) else Color.Transparent)
            .border(
                width = 1.dp,
                color = if (active) SuccessColor.copy(alpha = 0.3f) else SurfaceBorder,
                shape = RoundedCornerShape(4.dp)
            )
            .clickable(onClick = onClick)
            .heightIn(min = 40.dp)
            .padding(horizontal = 10.dp, vertical = 6.dp)
            .widthIn(min = 52.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = if (active) SuccessColor else TextSecondary,
            fontSize = 10.sp,
            lineHeight = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun UsagePanelSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onRequestCompactCurrentThread: () -> Unit
) {
    val contextUsage = displayedContextUsage(state)
    val usedSummary = contextUsage?.usedPercent?.let { usedPercent ->
        stringResource(
            R.string.codex_native_context_used_summary,
            usedPercent,
            contextUsage.remainingPercent ?: (100 - usedPercent).coerceAtLeast(0)
        )
    } ?: "--"
    val tokenSummary = contextUsage?.usedTokens?.let { usedTokens ->
        contextUsage.contextWindow?.let { contextWindow ->
            "${formatCompactNumber(usedTokens)}/${formatCompactNumber(contextWindow)}"
        }
    } ?: "--"
    val compactEnabled = state.capabilities?.compact == true
    val hasThread = state.threadId?.trim().isNullOrEmpty().not()
    val compactStatusText = when {
        state.toolsPanel.compactSubmitting ->
            state.toolsPanel.compactStatusText.ifBlank {
                stringResource(R.string.codex_native_tools_compact_requesting)
            }
        !hasThread -> stringResource(R.string.codex_native_tools_compact_no_thread)
        state.toolsPanel.compactStatusText.isNotBlank() -> state.toolsPanel.compactStatusText
        else -> stringResource(R.string.codex_native_tools_compact_ready)
    }
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        CodexDialogSurface {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_context_debug_title),
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        lineHeight = 22.sp,
                        modifier = Modifier.weight(1f)
                    )
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.03f))
                            .border(
                                width = 1.dp,
                                color = Color.White.copy(alpha = 0.08f),
                                shape = CircleShape
                            )
                            .clickable(onClick = onDismiss),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "\u00d7",
                            color = TextSecondary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ContextDebugCard(
                        title = stringResource(R.string.codex_native_usage_context_title)
                    ) {
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_used_label),
                            value = usedSummary
                        )
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_tokens_label),
                            value = tokenSummary
                        )
                    }
                    ContextDebugCard(
                        title = stringResource(R.string.codex_native_usage_tokens_title)
                    ) {
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_input_label),
                            value = contextUsage?.inputTokens?.let(::formatCompactNumber) ?: "--"
                        )
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_output_label),
                            value = contextUsage?.outputTokens?.let(::formatCompactNumber) ?: "--"
                        )
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_cached_label),
                            value = contextUsage?.cachedInputTokens?.let(::formatCompactNumber) ?: "--"
                        )
                        ContextStatRow(
                            label = stringResource(R.string.codex_native_context_reasoning_label),
                            value = contextUsage?.reasoningTokens?.let(::formatCompactNumber) ?: "--"
                        )
                    }
                }
                HorizontalDivider(
                    modifier = Modifier.padding(top = 12.dp),
                    color = Color.White.copy(alpha = 0.06f)
                )
                Text(
                    text = stringResource(R.string.codex_native_context_auto_compact),
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp,
                    modifier = Modifier.padding(top = 10.dp)
                )
                if (compactEnabled) {
                    val compactToneColor = when (state.toolsPanel.compactStatusTone) {
                        "error" -> ErrorColor
                        "success" -> SuccessColor
                        else -> TextSecondary
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = compactStatusText,
                        color = compactToneColor,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    ContextDialogActionButton(
                        text = if (state.toolsPanel.compactSubmitting) {
                            stringResource(R.string.codex_native_tools_compact_pending)
                        } else {
                            stringResource(R.string.codex_native_tools_compact_action)
                        },
                        enabled = hasThread && !state.toolsPanel.compactSubmitting,
                        onClick = onRequestCompactCurrentThread
                    )
                }
            }
        }
    }
}

@Composable
private fun ThreadHistorySheet(
    state: CodexUiState,
    onRefresh: () -> Unit,
    onResumeThread: (String) -> Unit,
    onForkThread: (String) -> Unit,
    onToggleThreadArchive: (String, Boolean) -> Unit,
    onStartRename: (String, String) -> Unit,
    onRenameDraftChange: (String) -> Unit,
    onCancelRename: () -> Unit,
    onSubmitRename: () -> Unit,
    onNewThread: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = SurfaceColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.codex_native_thread_history_title).uppercase(Locale.ROOT),
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.4.sp,
                    modifier = Modifier.weight(1f)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    HistoryActionButton(
                        text = stringResource(R.string.codex_native_thread_refresh),
                        primary = false,
                        enabled = !state.threadHistoryLoading,
                        onClick = onRefresh,
                        fillWidth = false
                    )
                    HistoryActionButton(
                        text = stringResource(R.string.codex_native_new_thread),
                        primary = true,
                        enabled = true,
                        onClick = onNewThread,
                        fillWidth = false
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                state.threadHistoryLoading && state.threadHistoryEntries.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_thread_history_loading),
                        color = Color(0xFF7790AD),
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }
                state.threadHistoryEntries.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_thread_history_empty),
                        color = Color(0xFF7790AD),
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 280.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(state.threadHistoryEntries, key = { it.id }) { entry ->
                            ThreadHistoryItem(
                                state = state,
                                entry = entry,
                                isCurrent = entry.id == state.threadId,
                                historyResumeSupported = state.capabilities?.historyResume == true,
                                actionThreadId = state.threadHistoryActionThreadId,
                                actionKind = state.threadHistoryActionKind,
                                onResumeThread = onResumeThread,
                                onForkThread = onForkThread,
                                onToggleThreadArchive = onToggleThreadArchive,
                                onStartRename = onStartRename,
                                onRenameDraftChange = onRenameDraftChange,
                                onCancelRename = onCancelRename,
                                onSubmitRename = onSubmitRename
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
        }
    }
}

@Composable
private fun ThreadHistoryItem(
    state: CodexUiState,
    entry: CodexThreadHistoryEntry,
    isCurrent: Boolean,
    historyResumeSupported: Boolean,
    actionThreadId: String,
    actionKind: String,
    onResumeThread: (String) -> Unit,
    onForkThread: (String) -> Unit,
    onToggleThreadArchive: (String, Boolean) -> Unit,
    onStartRename: (String, String) -> Unit,
    onRenameDraftChange: (String) -> Unit,
    onCancelRename: () -> Unit,
    onSubmitRename: () -> Unit
) {
    val isBusy = actionThreadId.isNotBlank()
    val isItemBusy = actionThreadId == entry.id
    val renameEditing = state.threadRenameTargetId == entry.id
    val pendingLabel = when (actionKind) {
        "resume" -> stringResource(R.string.codex_native_thread_pending_opening)
        "fork" -> stringResource(R.string.codex_native_thread_pending_forking)
        "rename" -> stringResource(R.string.codex_native_thread_pending_renaming)
        "archive" -> stringResource(R.string.codex_native_thread_pending_archiving)
        "unarchive" -> stringResource(R.string.codex_native_thread_pending_restoring)
        else -> stringResource(R.string.codex_native_thread_busy)
    }
    val actionButtons = buildList {
        add(
            HistoryActionSpec(
                label = when {
                    isCurrent -> stringResource(R.string.codex_native_thread_current)
                    isItemBusy && actionKind == "resume" -> stringResource(R.string.codex_native_thread_pending_opening)
                    else -> stringResource(R.string.codex_native_thread_open)
                },
                primary = true,
                enabled = !renameEditing && !isCurrent && historyResumeSupported && !isBusy,
                onClick = { onResumeThread(entry.id) }
            )
        )
        if (renameEditing) {
            add(
                HistoryActionSpec(
                    label = stringResource(R.string.codex_native_thread_rename_save),
                    primary = true,
                    enabled = state.threadRenameDraft.trim().isNotEmpty() && !isItemBusy,
                    onClick = onSubmitRename
                )
            )
            add(
                HistoryActionSpec(
                    label = stringResource(R.string.codex_native_thread_rename_cancel),
                    primary = false,
                    enabled = !isItemBusy,
                    onClick = onCancelRename
                )
            )
        } else {
            add(
                HistoryActionSpec(
                    label = if (isItemBusy && actionKind == "fork") {
                        stringResource(R.string.codex_native_thread_pending_forking)
                    } else {
                        stringResource(R.string.codex_native_thread_fork)
                    },
                    primary = false,
                    enabled = !isBusy && !isCurrent,
                    onClick = { onForkThread(entry.id) }
                )
            )
            add(
                HistoryActionSpec(
                    label = if (isItemBusy && actionKind == "rename") {
                        stringResource(R.string.codex_native_thread_pending_renaming)
                    } else {
                        stringResource(R.string.codex_native_thread_rename)
                    },
                    primary = false,
                    enabled = !isBusy,
                    onClick = { onStartRename(entry.id, entry.title) }
                )
            )
            add(
                HistoryActionSpec(
                    label = if (entry.archived) {
                        if (isItemBusy && actionKind == "unarchive") {
                            stringResource(R.string.codex_native_thread_pending_restoring)
                        } else {
                            stringResource(R.string.codex_native_thread_unarchive)
                        }
                    } else {
                        if (isItemBusy && actionKind == "archive") {
                            stringResource(R.string.codex_native_thread_pending_archiving)
                        } else {
                            stringResource(R.string.codex_native_thread_archive)
                        }
                    },
                    primary = false,
                    enabled = !isBusy && !isCurrent,
                    onClick = { onToggleThreadArchive(entry.id, entry.archived) }
                )
            )
        }
    }
    Surface(
        color = BgColor,
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(
            1.dp,
            when {
                isCurrent -> SuccessColor.copy(alpha = 0.35f)
                else -> SurfaceBorder
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                if (renameEditing) {
                    Text(
                        text = stringResource(R.string.codex_native_thread_rename_label).uppercase(Locale.ROOT),
                        color = TextSecondary,
                        fontSize = 10.sp,
                        lineHeight = 12.sp,
                        letterSpacing = 0.4.sp
                    )
                    Surface(
                        color = BgColor,
                        shape = RoundedCornerShape(4.dp),
                        border = BorderStroke(1.dp, SurfaceBorder)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            BasicTextField(
                                value = state.threadRenameDraft,
                                onValueChange = { onRenameDraftChange(it.take(200)) },
                                modifier = Modifier.fillMaxWidth(),
                                textStyle = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextPrimary,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp
                                ),
                                cursorBrush = SolidColor(SuccessColor),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { onSubmitRename() }),
                                singleLine = true
                            )
                            if (state.threadRenameDraft.isBlank()) {
                                Text(
                                    text = stringResource(R.string.codex_native_thread_rename_placeholder),
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = entry.title.ifBlank { entry.id },
                        color = TextPrimary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Text(
                    text = buildThreadMetaText(entry),
                    color = TextSecondary,
                    fontSize = 10.sp,
                    lineHeight = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (isCurrent) {
                        HistoryBadge(
                            label = stringResource(R.string.codex_native_thread_badge_current),
                            emphasized = true
                        )
                    }
                    if (entry.archived) {
                        HistoryBadge(
                            label = stringResource(R.string.codex_native_thread_badge_archived),
                            emphasized = false
                        )
                    }
                    if (isItemBusy) {
                        HistoryBadge(
                            label = pendingLabel,
                            emphasized = false
                        )
                    }
                }
            }
            Column(
                modifier = Modifier.widthIn(min = 96.dp, max = 108.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                actionButtons.chunked(2).forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        rowItems.forEach { action ->
                            HistoryActionButton(
                                text = action.label,
                                primary = action.primary,
                                enabled = action.enabled,
                                onClick = action.onClick,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (rowItems.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

private data class HistoryActionSpec(
    val label: String,
    val primary: Boolean,
    val enabled: Boolean,
    val onClick: () -> Unit
)

@Composable
private fun HistoryActionButton(
    text: String,
    primary: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    fillWidth: Boolean = true,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .alpha(if (enabled) 1f else 0.6f)
            .clip(RoundedCornerShape(4.dp))
            .background(if (primary) SuccessColor.copy(alpha = 0.06f) else Color.White.copy(alpha = 0.02f))
            .clickable(enabled = enabled, onClick = onClick)
            .then(
                Modifier.border(
                    width = 1.dp,
                    color = SurfaceBorder,
                    shape = RoundedCornerShape(4.dp)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = (if (fillWidth) Modifier.fillMaxWidth() else Modifier)
                .padding(horizontal = 6.dp, vertical = 3.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = if (primary) TextPrimary else TextSecondary,
                fontSize = 10.sp,
                lineHeight = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun HistoryBadge(label: String, emphasized: Boolean) {
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = if (emphasized) SuccessColor.copy(alpha = 0.1f) else SuccessColor.copy(alpha = 0.06f),
        border = BorderStroke(
            1.dp,
            if (emphasized) SuccessColor.copy(alpha = 0.3f) else SurfaceBorder
        )
    ) {
        Text(
            text = label,
            color = if (emphasized) SuccessColor else TextSecondary,
            fontSize = 9.sp,
            lineHeight = 11.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
private fun buildThreadMetaText(entry: CodexThreadHistoryEntry): String {
    entry.lastActiveAt?.let {
        return stringResource(R.string.codex_native_thread_last_active, formatHistoryTimestamp(it))
    }
    entry.createdAt?.let {
        return stringResource(R.string.codex_native_thread_created_at, formatHistoryTimestamp(it))
    }
    return entry.id
}

private fun formatHistoryTimestamp(epochMillis: Long): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date(epochMillis))
}

private fun buildContextUsageText(state: com.termlink.app.codex.domain.CodexContextUsageState): String {
    val lines = mutableListOf<String>()
    if (state.usedPercent != null && state.remainingPercent != null) {
        lines += "${state.usedPercent}% used • ${state.remainingPercent}% remaining"
    }
    if (state.usedTokens != null && state.contextWindow != null) {
        lines += "${formatCompactNumber(state.usedTokens)} / ${formatCompactNumber(state.contextWindow)} tokens"
    }
    val stats = buildList {
        state.inputTokens?.let { add("in ${formatCompactNumber(it)}") }
        state.outputTokens?.let { add("out ${formatCompactNumber(it)}") }
        state.cachedInputTokens?.takeIf { it > 0 }?.let { add("cached ${formatCompactNumber(it)}") }
        state.reasoningTokens?.takeIf { it > 0 }?.let { add("reasoning ${formatCompactNumber(it)}") }
    }
    if (stats.isNotEmpty()) {
        lines += stats.joinToString(" • ")
    }
    return lines.joinToString("\n")
}

@Composable
private fun ContextStatRow(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = label,
            color = TextSecondary,
            fontSize = 11.sp,
            lineHeight = 16.sp,
            modifier = Modifier.width(92.dp)
        )
        Text(
            text = value,
            color = TextPrimary,
            fontSize = 11.sp,
            lineHeight = 16.sp,
            textAlign = TextAlign.End,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun ContextDebugCard(
    title: String,
    content: @Composable () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White.copy(alpha = 0.025f),
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.07f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = title,
                color = TextPrimary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            content()
        }
    }
}

@Composable
private fun ContextDialogActionButton(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(MaterialTheme.shapes.small)
            .clickable(enabled = enabled, onClick = onClick),
        color = if (enabled) SuccessColor.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.02f),
        shape = MaterialTheme.shapes.small,
        border = BorderStroke(
            1.dp,
            if (enabled) SuccessColor.copy(alpha = 0.28f) else SurfaceBorder
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 7.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = if (enabled) TextPrimary else TextSecondary,
                fontSize = 11.sp,
                lineHeight = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
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

private fun formatFileSize(bytes: Long): String {
    if (bytes <= 0L) return "0 B"
    val kb = 1024.0
    val mb = kb * 1024.0
    return when {
        bytes >= mb -> String.format("%.1f MB", bytes / mb)
        bytes >= kb -> String.format("%.1f KB", bytes / kb)
        else -> "$bytes B"
    }
}

private fun hasNoticesPanelContent(state: CodexUiState): Boolean {
    return state.noticesPanel.configWarningText.isNotBlank() ||
        state.noticesPanel.deprecationNoticeText.isNotBlank()
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun FooterControls(
    state: CodexUiState,
    imageInputEnabled: Boolean,
    onShowModelPicker: () -> Unit,
    onShowReasoningPicker: () -> Unit,
    onShowSandboxPicker: () -> Unit,
    onTogglePlanMode: () -> Unit,
    slashMenuVisible: Boolean,
    onShowUsagePanel: () -> Unit,
    onPickLocalFile: () -> Unit,
    onPrepareAddMenu: () -> Unit,
    onInsertSlash: () -> Unit,
    onStartGoalDraft: () -> Unit,
    canSubmit: Boolean,
    hasInterruptibleTurn: Boolean,
    onSubmit: () -> Unit,
    onInterrupt: () -> Unit
) {
    val configHydrating = isOwnerConfigHydratingForUiState(state)
    val effectiveConfig = state.nextTurnEffectiveCodexConfig
    val activeModel = resolvedConcreteModelSelection(state)
    val activeModelMetadata = state.modelCatalog.firstOrNull { it.id == activeModel }
    val activeModelLabel = activeModelMetadata?.displayName ?: activeModel
    val activeReasoning = effectiveConfig?.reasoningEffort?.takeIf { it.isNotBlank() }
        ?: state.nextTurnOverrides.reasoningEffort
        ?: state.reasoningEffort
        ?: activeModelMetadata?.defaultReasoningEffort
        ?: state.capabilities?.defaultReasoningEffort?.takeIf { it.isNotBlank() }
    val activePermission = resolvedPermissionSelection(state)
    var addMenuExpanded by remember { mutableStateOf(false) }
    var configSheetExpanded by remember { mutableStateOf(false) }
    val loadingSummary = stringResource(R.string.codex_native_config_loading)
    val modelSummary = if (configHydrating) {
        loadingSummary
    } else {
        activeModelLabel ?: stringResource(R.string.codex_native_quick_default)
    }
    val reasoningSummary = if (configHydrating) {
        loadingSummary
    } else {
        activeReasoning?.let { reasoningEffortLabel(it) }
            ?: stringResource(R.string.codex_native_quick_default)
    }
    val permissionSummary = if (configHydrating) {
        loadingSummary
    } else {
        permissionSelectionLabel(activePermission, short = true)
    }
    val permissionAccessibilityLabel = if (configHydrating) {
        loadingSummary
    } else {
        permissionSelectionLabel(activePermission, short = false)
    }
    val modelReasoningSummary = if (configHydrating) {
        loadingSummary
    } else {
        "${compactComposerModelLabel(modelSummary)} $reasoningSummary"
    }
    val contextUsedPercent = displayedContextUsage(state)?.usedPercent?.coerceIn(0, 100)

    LaunchedEffect(slashMenuVisible) {
        if (slashMenuVisible) addMenuExpanded = false
    }

    Row(
        modifier = Modifier
            .fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Box {
                ComposerAddButton(
                    expanded = addMenuExpanded,
                    onClick = {
                        configSheetExpanded = false
                        onPrepareAddMenu()
                        addMenuExpanded = true
                    }
                )
                ComposerAddMenu(
                    expanded = addMenuExpanded,
                    attachmentEnabled = imageInputEnabled,
                    planActive = state.planMode == true,
                    contextUsedPercent = contextUsedPercent,
                    onDismiss = { addMenuExpanded = false },
                    onPickAttachment = {
                        addMenuExpanded = false
                        onPickLocalFile()
                    },
                    onStartGoalDraft = {
                        addMenuExpanded = false
                        onStartGoalDraft()
                    },
                    onTogglePlanMode = {
                        addMenuExpanded = false
                        onTogglePlanMode()
                    },
                    onShowContext = {
                        addMenuExpanded = false
                        onShowUsagePanel()
                    }
                )
            }
            ComposerSlashButton(
                active = slashMenuVisible,
                onClick = {
                    addMenuExpanded = false
                    configSheetExpanded = false
                    onInsertSlash()
                }
            )
        }
        if (state.capabilities?.sandboxSupported != false) {
            ComposerPermissionButton(
                text = permissionSummary,
                accessibilityLabel = permissionAccessibilityLabel,
                active = state.sandboxPickerVisible,
                onClick = {
                    if (!configHydrating) {
                        addMenuExpanded = false
                        configSheetExpanded = false
                        onShowSandboxPicker()
                    }
                }
            )
        }
        if (state.planMode == true) {
            FooterPlanIndicatorButton(onClick = onTogglePlanMode)
        }
        Spacer(modifier = Modifier.weight(1f))
        ModelReasoningButton(
            text = modelReasoningSummary,
            active = configSheetExpanded || state.modelPickerVisible || state.reasoningPickerVisible,
            compact = state.planMode == true,
            onClick = {
                if (!configHydrating) {
                    addMenuExpanded = false
                    configSheetExpanded = true
                }
            }
        )
        ComposerSubmitButton(
            enabled = canSubmit || hasInterruptibleTurn,
            interrupting = hasInterruptibleTurn,
            onClick = if (hasInterruptibleTurn) onInterrupt else onSubmit
        )
    }
    if (configSheetExpanded) {
        ComposerConfigSheet(
            model = modelSummary,
            reasoning = reasoningSummary,
            onDismiss = { configSheetExpanded = false },
            onShowModelPicker = {
                configSheetExpanded = false
                onShowModelPicker()
            },
            onShowReasoningPicker = {
                configSheetExpanded = false
                onShowReasoningPicker()
            }
        )
    }
}

@Composable
private fun ComposerSlashButton(
    active: Boolean,
    onClick: () -> Unit
) {
    val description = stringResource(R.string.codex_native_slash_menu_open)
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(if (active) AccentBlue.copy(alpha = 0.14f) else Color.Transparent)
            .semantics {
                contentDescription = description
                role = Role.Button
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "/",
            color = if (active) AccentBlue else TextPrimary,
            fontSize = 21.sp,
            lineHeight = 22.sp,
            fontWeight = FontWeight.Light
        )
    }
}

@Composable
private fun ComposerAddButton(
    expanded: Boolean,
    onClick: () -> Unit
) {
    val description = stringResource(R.string.codex_native_add_menu_open)
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(if (expanded) Color.White.copy(alpha = 0.08f) else Color.Transparent)
            .semantics {
                contentDescription = description
                role = Role.Button
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "+",
            color = TextPrimary,
            fontSize = 24.sp,
            lineHeight = 24.sp,
            fontWeight = FontWeight.Light
        )
    }
}

@Composable
private fun ComposerAddMenu(
    expanded: Boolean,
    attachmentEnabled: Boolean,
    planActive: Boolean,
    contextUsedPercent: Int?,
    onDismiss: () -> Unit,
    onPickAttachment: () -> Unit,
    onStartGoalDraft: () -> Unit,
    onTogglePlanMode: () -> Unit,
    onShowContext: () -> Unit
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        modifier = Modifier
            .width(286.dp)
            .background(SurfaceRaised)
    ) {
        Text(
            text = stringResource(R.string.codex_native_add_menu_title),
            color = TextMuted,
            fontSize = 12.sp,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp)
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_files),
            description = stringResource(R.string.codex_native_add_menu_files_hint),
            iconRes = R.drawable.ic_attachment_24,
            enabled = attachmentEnabled,
            onClick = onPickAttachment
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_goal),
            description = stringResource(R.string.codex_native_add_menu_goal_hint),
            iconRes = R.drawable.ic_goal_24,
            onClick = onStartGoalDraft
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_plan),
            description = stringResource(
                if (planActive) R.string.codex_native_add_menu_plan_on_hint
                else R.string.codex_native_add_menu_plan_hint
            ),
            active = planActive,
            glyph = "☼",
            onClick = onTogglePlanMode
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_context),
            description = if (contextUsedPercent == null) {
                stringResource(R.string.codex_native_add_menu_context_hint_empty)
            } else {
                stringResource(R.string.codex_native_add_menu_context_hint, contextUsedPercent)
            },
            showContextRing = true,
            contextUsedPercent = contextUsedPercent,
            onClick = onShowContext
        )
    }
}

@Composable
private fun ComposerAddMenuItem(
    title: String,
    description: String,
    onClick: () -> Unit,
    iconRes: Int? = null,
    glyph: String? = null,
    showContextRing: Boolean = false,
    contextUsedPercent: Int? = null,
    enabled: Boolean = true,
    active: Boolean = false
) {
    DropdownMenuItem(
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(
                    text = title,
                    color = when {
                        !enabled -> TextMuted.copy(alpha = 0.55f)
                        active -> SuccessColor
                        else -> TextPrimary
                    },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = description,
                    color = TextMuted.copy(alpha = if (enabled) 0.9f else 0.5f),
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        },
        onClick = onClick,
        modifier = Modifier.heightIn(min = 52.dp),
        enabled = enabled,
        leadingIcon = {
            if (showContextRing) {
                CircularProgressIndicator(
                    progress = { (contextUsedPercent ?: 0) / 100f },
                    modifier = Modifier.size(19.dp),
                    color = if (contextUsedPercent != null && contextUsedPercent >= 80) {
                        WarningColor
                    } else {
                        ContextBlue
                    },
                    trackColor = Color.White.copy(alpha = 0.14f),
                    strokeWidth = 2.dp
                )
            } else if (iconRes != null) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = if (active) SuccessColor else TextSecondary,
                    modifier = Modifier.size(19.dp)
                )
            } else if (glyph != null) {
                Text(
                    text = glyph,
                    color = if (active) SuccessColor else TextSecondary,
                    fontSize = 19.sp
                )
            }
        },
        trailingIcon = if (active) {
            {
                Text(
                    text = "✓",
                    color = SuccessColor,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        } else {
            null
        },
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
    )
}

@Composable
private fun ComposerPermissionButton(
    text: String,
    accessibilityLabel: String,
    active: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .heightIn(min = 34.dp)
            .widthIn(max = 72.dp)
            .clip(RoundedCornerShape(CodexBottomBarTokens.smallChipRadius))
            .background(if (active) WarningColor.copy(alpha = 0.13f) else Color.Transparent)
            .semantics {
                contentDescription = accessibilityLabel
                role = Role.Button
            }
            .clickable(onClick = onClick)
            .padding(horizontal = 5.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text(text = "◈", color = WarningColor, fontSize = 11.sp)
        Text(
            text = text,
            color = WarningColor,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun ModelReasoningButton(
    text: String,
    active: Boolean,
    compact: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .heightIn(min = 34.dp)
            .widthIn(max = if (compact) 76.dp else 106.dp)
            .clip(RoundedCornerShape(CodexBottomBarTokens.smallChipRadius))
            .background(if (active) AccentBlue.copy(alpha = 0.12f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 5.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text(
            text = text,
            color = if (active) AccentBlue else TextPrimary,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false)
        )
        Text(
            text = "⌄",
            color = if (active) AccentBlue else TextMuted,
            fontSize = 10.sp
        )
    }
}

@Composable
private fun FooterPlanIndicatorButton(onClick: () -> Unit) {
    val contentDescription = stringResource(R.string.codex_native_plan_mode_chip)
    Surface(
        modifier = Modifier
            .heightIn(min = 34.dp)
            .clickable(onClick = onClick)
            .semantics {
                this.contentDescription = contentDescription
                role = Role.Button
            },
        color = SuccessColor.copy(alpha = 0.14f),
        shape = RoundedCornerShape(CodexBottomBarTokens.chipRadius),
        border = BorderStroke(1.dp, SuccessColor.copy(alpha = 0.35f))
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 6.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = stringResource(R.string.codex_native_plan_mode),
                color = SuccessColor,
                fontSize = 11.sp,
                lineHeight = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ComposerConfigSheet(
    model: String,
    reasoning: String,
    onDismiss: () -> Unit,
    onShowModelPicker: () -> Unit,
    onShowReasoningPicker: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = stringResource(R.string.codex_native_config_sheet_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = stringResource(R.string.codex_native_config_sheet_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            ComposerConfigRow(
                label = stringResource(R.string.codex_native_config_model),
                value = model,
                onClick = onShowModelPicker
            )
            ComposerConfigRow(
                label = stringResource(R.string.codex_native_config_reasoning),
                value = reasoning,
                onClick = onShowReasoningPicker
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ComposerConfigRow(
    label: String,
    value: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(onClick = onClick),
        color = SurfaceRaised,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.8f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = value,
                color = TextPrimary,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.End,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "›",
                color = TextMuted,
                fontSize = 20.sp
            )
        }
    }
}

@Composable
private fun ComposerSubmitButton(
    enabled: Boolean,
    interrupting: Boolean,
    onClick: () -> Unit
) {
    val description = stringResource(
        if (interrupting) R.string.codex_native_interrupt else R.string.codex_native_send
    )
    Surface(
        modifier = Modifier
            .size(46.dp)
            .semantics {
                contentDescription = description
                role = Role.Button
            }
            .clickable(enabled = enabled, onClick = onClick),
        color = when {
            interrupting -> ErrorColor.copy(alpha = 0.9f)
            enabled -> AccentBlue
            else -> SurfaceRaised
        },
        shape = CircleShape
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = if (interrupting) "■" else "↑",
                color = if (enabled) Color.White else TextMuted,
                fontSize = if (interrupting) 13.sp else 24.sp,
                lineHeight = 24.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

private fun displayedContextUsage(state: CodexUiState): com.termlink.app.codex.domain.CodexContextUsageState? {
    val contextUsage = state.usagePanel.contextUsage ?: return null
    val hasVisibleConversation = state.messages.isNotEmpty()
    val hasActiveTaskState = !state.currentTurnId.isNullOrBlank() ||
        state.messages.lastOrNull()?.streaming == true ||
        state.pendingServerRequests.isNotEmpty()
    return if (hasVisibleConversation || hasActiveTaskState) contextUsage else null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ApprovalDebugSheet(
    onDismiss: () -> Unit,
    onInject: (DebugServerRequestPreset) -> Unit
) {
    val entries = listOf(
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.RUNTIME_SAMPLE,
            title = stringResource(R.string.codex_native_debug_sample_runtime)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.COMMAND_APPROVAL,
            title = stringResource(R.string.codex_native_debug_sample_command)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.FILE_APPROVAL,
            title = stringResource(R.string.codex_native_debug_sample_file)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.PATCH_APPROVAL,
            title = stringResource(R.string.codex_native_debug_sample_patch)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.AUTO_HANDLED,
            title = stringResource(R.string.codex_native_debug_sample_auto_handled)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.USER_INPUT_OPTIONS,
            title = stringResource(R.string.codex_native_debug_sample_user_input)
        ),
        DebugInjectorEntry(
            preset = DebugServerRequestPreset.USER_INPUT_FREEFORM,
            title = stringResource(R.string.codex_native_debug_sample_user_input_freeform)
        )
    )
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        CodexDialogSurface(maxHeight = 560.dp) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Text(
                    text = stringResource(R.string.codex_native_debug_sheet_title),
                    color = TextPrimary,
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = stringResource(R.string.codex_native_debug_sheet_subtitle),
                    color = TextMuted,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                entries.forEach { entry ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clickable { onInject(entry.preset) },
                        color = SurfaceRaised,
                        shape = MaterialTheme.shapes.medium,
                        border = BorderStroke(1.dp, SurfaceBorder)
                    ) {
                        Text(
                            text = entry.title,
                            color = TextPrimary,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
                        )
                    }
                }
                TextButton(
                    modifier = Modifier
                        .align(Alignment.End)
                        .padding(top = 4.dp),
                    onClick = onDismiss
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_dismiss),
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun InputComposer(
    state: CodexUiState,
    enabled: Boolean,
    isStreaming: Boolean,
    slashMenuVisible: Boolean,
    slashCommands: List<CodexSlashRegistry.SlashCommand>,
    mentionMenuVisible: Boolean,
    mentionResults: List<FileMention>,
    mentionLoading: Boolean,
    pendingMentions: List<FileMention>,
    attachmentInputEnabled: Boolean,
    pendingImageAttachments: List<CodexPendingImageAttachment>,
    onSend: (String) -> Unit,
    hasInterruptibleTurn: Boolean,
    onInterrupt: () -> Unit,
    onShowSlashMenu: (String) -> Unit,
    onHideSlashMenu: () -> Unit,
    onSlashMenuQueryChanged: (String) -> Unit,
    onComposerTextChanged: (String) -> Unit,
    onHideFileMentionMenu: () -> Unit,
    onSelectFileMention: (FileMention) -> Unit,
    onRemoveFileMention: (String) -> Unit,
    onPickLocalFile: () -> Unit,
    onRemovePendingImageAttachment: (String) -> Unit,
    onShowModelPicker: () -> Unit,
    onShowReasoningPicker: () -> Unit,
    onShowSandboxPicker: () -> Unit,
    onTogglePlanMode: () -> Unit,
    onShowUsagePanel: () -> Unit,
    onClearActiveSkill: () -> Unit = {}
) {
    var textFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    val composerFocusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    val localView = LocalView.current
    val localDensity = LocalDensity.current
    val navigationBarBottomPadding = with(localDensity) {
        val safeBottomInsetTypes = WindowInsetsCompat.Type.navigationBars() or
            WindowInsetsCompat.Type.mandatorySystemGestures() or
            WindowInsetsCompat.Type.tappableElement()
        val reportedBottom = ViewCompat.getRootWindowInsets(localView)
            ?.getInsets(safeBottomInsetTypes)
            ?.bottom
            ?: 0
        val visibleFrame = Rect().also(localView.rootView::getWindowVisibleDisplayFrame)
        @Suppress("DEPRECATION")
        val realDisplayHeight = Point().also { size ->
            localView.display?.getRealSize(size)
        }.y
        val obscuredBottom = (realDisplayHeight - visibleFrame.bottom).coerceAtLeast(0)
        val legacyGestureBottom = obscuredBottom.takeIf { value ->
            value in 1..96.dp.roundToPx()
        } ?: 0
        maxOf(reportedBottom, legacyGestureBottom).toDp().coerceAtLeast(36.dp)
    }

    LaunchedEffect(state.planMode, state.planWorkflow.phase) {
        val shouldFocusComposer = state.planMode == true && (
            state.planWorkflow.phase == "planning" ||
                state.planWorkflow.phase == "awaiting_user_input"
            )
        if (shouldFocusComposer) {
            composerFocusRequester.requestFocus()
            keyboardController?.show()
        }
    }

    fun syncComposerMenus(
        rawText: String,
        mentionParseMentions: List<FileMention> = pendingMentions
    ) {
        pendingMentions.forEach { file ->
            if (!composerContainsMention(rawText, file)) {
                onRemoveFileMention(file.path)
            }
        }
        val mentionParseText = composerRawTextForMentionParsing(rawText, mentionParseMentions)
        onComposerTextChanged(mentionParseText)
        if (CodexSlashRegistry.parseFileMentionInput(mentionParseText) != null) {
            onHideSlashMenu()
            return
        }
        onHideFileMentionMenu()
        val query = extractSlashQuery(rawText)
        if (query == null) {
            onHideSlashMenu()
        } else {
            onShowSlashMenu(query)
            onSlashMenuQueryChanged(query)
        }
    }

    fun insertSkillToken(skillName: String) {
        val token = CodexSlashRegistry.buildSkillToken(
            cwd = state.cwd,
            skillName = skillName
        )
        if (token.isBlank()) return
        val currentValue = textFieldValue
        val selectionStart = currentValue.selection.min.coerceIn(0, currentValue.text.length)
        val selectionEnd = currentValue.selection.max.coerceIn(0, currentValue.text.length)
        val prefix = buildString {
            if (selectionStart > 0 && !currentValue.text[selectionStart - 1].isWhitespace()) {
                append(' ')
            }
            append(token)
            if (selectionEnd < currentValue.text.length && !currentValue.text[selectionEnd].isWhitespace()) {
                append(' ')
            } else {
                append(' ')
            }
        }
        val updatedText = buildString {
            append(currentValue.text.substring(0, selectionStart))
            append(prefix)
            append(currentValue.text.substring(selectionEnd))
        }
        textFieldValue = TextFieldValue(
            text = updatedText,
            selection = TextRange(selectionStart + prefix.length)
        )
        syncComposerMenus(updatedText)
    }

    LaunchedEffect(state.pendingSkillInsertName) {
        val skillName = state.pendingSkillInsertName?.takeIf { it.isNotBlank() }
            ?: return@LaunchedEffect
        insertSkillToken(skillName)
        onClearActiveSkill()
        composerFocusRequester.requestFocus()
        keyboardController?.show()
    }

    LaunchedEffect(state.interactionState?.activeSkill) {
        if (state.interactionState?.activeSkill.isNullOrBlank()) {
            return@LaunchedEffect
        }
        composerFocusRequester.requestFocus()
        keyboardController?.show()
    }

    fun openFileMentionShortcut(): Boolean {
        if (state.capabilities?.fileMentions != true) {
            return false
        }
        val shortcutText = "@"
        textFieldValue = TextFieldValue(
            text = shortcutText,
            selection = TextRange(shortcutText.length)
        )
        onHideSlashMenu()
        syncComposerMenus(shortcutText)
        composerFocusRequester.requestFocus()
        keyboardController?.show()
        return true
    }

    fun handleLocalSlashShortcut(command: String): Boolean = when (command.trim().lowercase()) {
        "/mention" -> openFileMentionShortcut()
        else -> false
    }

    fun insertComposerText(insertedText: String) {
        val currentValue = textFieldValue
        val selectionStart = currentValue.selection.min.coerceIn(0, currentValue.text.length)
        val selectionEnd = currentValue.selection.max.coerceIn(0, currentValue.text.length)
        val nextValue = if (
            insertedText == "/" &&
            currentValue.text == "/" &&
            selectionStart == 1 &&
            selectionEnd == 1
        ) {
            currentValue
        } else {
            val updatedText = buildString {
                append(currentValue.text.substring(0, selectionStart))
                append(insertedText)
                append(currentValue.text.substring(selectionEnd))
            }
            TextFieldValue(
                text = updatedText,
                selection = TextRange(selectionStart + insertedText.length)
            )
        }
        textFieldValue = nextValue
        onHideFileMentionMenu()
        syncComposerMenus(nextValue.text)
        composerFocusRequester.requestFocus()
        keyboardController?.show()
    }

    fun submit(): Boolean {
        val submittedText = textFieldValue.text.trim()
        if (
            !enabled ||
            isStreaming ||
            (submittedText.isBlank() && pendingMentions.isEmpty() && pendingImageAttachments.isEmpty())
        ) {
            return false
        }
        if (handleLocalSlashShortcut(submittedText)) {
            return true
        }
        onSend(submittedText)
        textFieldValue = TextFieldValue("")
        onHideSlashMenu()
        onHideFileMentionMenu()
        onComposerTextChanged("")
        return true
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = BgColor.copy(alpha = 0.98f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = navigationBarBottomPadding)
                .imePadding()
        ) {
            // Plan workflow card removed — plan confirmation is now handled by PlanConfirmationDialog

            if (mentionMenuVisible) {
                FileMentionMenu(
                    loading = mentionLoading,
                    results = mentionResults,
                    onSelect = { file ->
                        onSelectFileMention(file)
                        val updatedValue = insertSelectedMentionToken(
                            currentValue = textFieldValue,
                            file = file
                        )
                        textFieldValue = updatedValue
                        syncComposerMenus(
                            rawText = updatedValue.text,
                            mentionParseMentions = (pendingMentions + file).distinctBy { it.path }
                        )
                    }
                )
            } else if (slashMenuVisible) {
                SlashMenu(
                    commands = slashCommands,
                    onSelect = { command ->
                        if (handleLocalSlashShortcut(command)) {
                            return@SlashMenu
                        }
                        onSend(command)
                        textFieldValue = TextFieldValue("")
                        onHideSlashMenu()
                        onHideFileMentionMenu()
                        onComposerTextChanged("")
                    }
                )
            }

            if (pendingImageAttachments.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(start = 12.dp, end = 12.dp, top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pendingImageAttachments.forEach { attachment ->
                        ImageAttachmentChip(
                            attachment = attachment,
                            onRemove = { onRemovePendingImageAttachment(attachment.id) }
                        )
                    }
                }
            }

            if (pendingMentions.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(start = 12.dp, end = 12.dp, top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pendingMentions.forEach { mention ->
                        MentionChip(
                            file = mention,
                            onRemove = { onRemoveFileMention(mention.path) }
                        )
                    }
                }
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                color = SurfaceColor,
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.8f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 132.dp)
                        .padding(start = 12.dp, end = 10.dp, top = 14.dp, bottom = 10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 62.dp, max = 140.dp)
                            .onPreviewKeyEvent { event ->
                                val isEnter = event.key == Key.Enter || event.key == Key.NumPadEnter
                                if (!isEnter || event.isShiftPressed) {
                                    return@onPreviewKeyEvent false
                                }
                                submit()
                            },
                        contentAlignment = Alignment.CenterStart
                    ) {
                        BasicTextField(
                            value = textFieldValue,
                            onValueChange = {
                                textFieldValue = it
                                syncComposerMenus(it.text)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(composerFocusRequester),
                            enabled = enabled && !isStreaming,
                            textStyle = MaterialTheme.typography.bodyMedium.copy(
                                color = TextPrimary,
                                fontSize = 13.sp,
                                lineHeight = 19.sp
                            ),
                            visualTransformation = remember(pendingMentions) {
                                composerVisualTransformation(pendingMentions)
                            },
                            cursorBrush = SolidColor(AccentBlue),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                            keyboardActions = KeyboardActions(onSend = { submit() }),
                            singleLine = false,
                            maxLines = 8
                        )
                        if (textFieldValue.text.isBlank()) {
                            Text(
                                text = stringResource(R.string.codex_native_input_hint),
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    val canSubmit = enabled && (
                        textFieldValue.text.isNotBlank() ||
                            pendingMentions.isNotEmpty() ||
                            pendingImageAttachments.isNotEmpty()
                        )
                    FooterControls(
                        state = state,
                        imageInputEnabled = attachmentInputEnabled,
                        onShowModelPicker = onShowModelPicker,
                        onShowReasoningPicker = onShowReasoningPicker,
                        onShowSandboxPicker = onShowSandboxPicker,
                        onTogglePlanMode = onTogglePlanMode,
                        slashMenuVisible = slashMenuVisible,
                        onShowUsagePanel = onShowUsagePanel,
                        onPickLocalFile = onPickLocalFile,
                        onPrepareAddMenu = {
                            onHideSlashMenu()
                            onHideFileMentionMenu()
                        },
                        onInsertSlash = { insertComposerText("/") },
                        onStartGoalDraft = { insertComposerText("/goal ") },
                        canSubmit = canSubmit,
                        hasInterruptibleTurn = hasInterruptibleTurn,
                        onSubmit = { submit() },
                        onInterrupt = onInterrupt
                    )
                }
            }
        }
    }
}

@Composable
private fun ComposerSkillChip(
    skillName: String,
    onClear: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.Start
    ) {
        SkillChipFrame(
            modifier = Modifier.clickable(onClick = onClear)
        ) {
            SkillChipLabel(skillName = skillName)
            Text(
                text = stringResource(R.string.codex_native_skill_chip_remove),
                color = TextMuted,
                fontSize = 12.sp,
                lineHeight = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun StaticMentionChip(
    file: FileMention,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier) {
        SkillChipFrame {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "@",
                    color = AccentBlue,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = file.label,
                    color = TextPrimary,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun UserMessageSkillChip(
    skillName: String,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier) {
        SkillChipFrame {
            SkillChipLabel(skillName = skillName)
        }
    }
}

@Composable
private fun StaticAttachmentChip(
    attachment: com.termlink.app.codex.domain.CodexMessageAttachment,
    modifier: Modifier = Modifier
) {
    val isLocalImage = attachment.source == "local" ||
        (!attachment.path.isNullOrBlank() && attachment.url.isNullOrBlank())
    Row(modifier = modifier) {
        SkillChipFrame {
            Text(
                text = when {
                    isLocalImage ->
                        stringResource(R.string.codex_native_image_local_chip, attachment.label)
                    else ->
                        stringResource(R.string.codex_native_image_url_chip)
                },
                color = TextPrimary,
                fontSize = 11.sp,
                lineHeight = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 240.dp)
            )
        }
    }
}

@Composable
private fun SkillChipFrame(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(CodexBottomBarTokens.smallChipRadius))
            .background(AccentBlue.copy(alpha = 0.14f))
            .border(
                width = 1.dp,
                color = AccentBlue.copy(alpha = 0.45f),
                shape = RoundedCornerShape(CodexBottomBarTokens.smallChipRadius)
            )
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        content = content
    )
}

@Composable
private fun SkillChipLabel(skillName: String) {
    val maxLen = 28
    val display = if (skillName.length > maxLen) {
        skillName.take(maxLen) + "…"
    } else {
        skillName
    }
    Text(
        text = "$",
        color = AccentBlue,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        fontWeight = FontWeight.SemiBold
    )
    Text(
        text = display,
        color = TextPrimary,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
private fun MentionChip(
    file: FileMention,
    onRemove: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = SurfaceRaised,
        border = BorderStroke(1.dp, SurfaceBorder),
        modifier = Modifier.clickable(onClick = onRemove)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "@${displayFileMention(file)}",
                color = AccentBlue,
                fontSize = 12.sp
            )
            Text(
                text = "×",
                color = TextMuted,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun ImageAttachmentChip(
    attachment: CodexPendingImageAttachment,
    onRemove: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = SurfaceRaised,
        border = BorderStroke(1.dp, SurfaceBorder),
        modifier = Modifier.clickable(onClick = onRemove)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = when (attachment.type) {
                    "localImage" -> stringResource(R.string.codex_native_image_local_chip, attachment.label)
                    else -> stringResource(R.string.codex_native_image_url_chip)
                },
                color = AccentBlue,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 220.dp)
            )
            Text(
                text = "×",
                color = TextMuted,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun SlashMenu(
    commands: List<CodexSlashRegistry.SlashCommand>,
    onSelect: (String) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = SurfaceColor,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, SurfaceBorder),
        shadowElevation = 12.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.codex_native_slash_title),
                    color = TextPrimary,
                    fontSize = 13.sp
                )
                Text(
                    text = stringResource(R.string.codex_native_slash_hint),
                    color = TextSecondary,
                    fontSize = 11.sp
                )
            }
            HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.6f))
            if (commands.isEmpty()) {
                Text(
                    text = stringResource(R.string.codex_native_slash_no_match),
                    color = TextMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 280.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    commands.forEachIndexed { index, entry ->
                        SlashMenuItem(
                            command = entry.command,
                            title = slashTitle(entry.command),
                            onClick = { onSelect(entry.command) }
                        )
                        if (index < commands.lastIndex) {
                            HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.6f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FileMentionMenu(
    loading: Boolean,
    results: List<FileMention>,
    onSelect: (FileMention) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = SurfaceColor,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, SurfaceBorder),
        shadowElevation = 12.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 280.dp)
                .verticalScroll(rememberScrollState())
        ) {
            when {
                loading -> {
                    Text(
                        text = stringResource(R.string.codex_native_file_mention_searching),
                        color = TextMuted,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                    )
                }

                results.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_file_mention_no_match),
                        color = TextMuted,
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                    )
                }

                else -> {
                    results.forEachIndexed { index, file ->
                        FileMentionMenuItem(
                            file = file,
                            onClick = { onSelect(file) }
                        )
                        if (index < results.lastIndex) {
                            HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.6f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FileMentionMenuItem(
    file: FileMention,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = file.label,
            color = TextPrimary,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        file.relativePathWithoutFileName.takeIf { it.isNotBlank() }?.let { folder ->
            Spacer(modifier = Modifier.height(1.dp))
            Text(
                text = folder,
                color = TextMuted,
                fontSize = 10.sp,
                lineHeight = 13.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SlashMenuItem(
    command: String,
    title: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = command,
            color = AccentBlue,
            fontSize = 13.sp
        )
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 13.sp
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelPickerSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectModel: (String?) -> Unit
) {
    val currentModel = resolvedConcreteModelSelection(state)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = stringResource(R.string.codex_native_model_picker_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.codex_native_model_picker_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            val modelOptions = state.modelCatalog.ifEmpty {
                state.capabilities?.models.orEmpty().map { model ->
                    com.termlink.app.codex.data.CodexModelOption(model, model)
                }
            }
            modelOptions.filterNot { it.hidden }.forEach { model ->
                ModelPickerRow(
                    label = model.displayName,
                    secondary = model.description,
                    selected = currentModel == model.id,
                    onClick = { onSelectModel(model.id) }
                )
            }

            val legacyModels = modelOptions.filter { it.hidden && !it.upgradeModel.isNullOrBlank() }
            if (legacyModels.isNotEmpty()) {
                Text(
                    text = stringResource(R.string.codex_native_model_picker_legacy_title),
                    color = TextMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(start = 4.dp, top = 8.dp, bottom = 8.dp)
                )
                legacyModels.forEach { model ->
                    val migrationText = model.upgradeMessage?.takeIf { it.isNotBlank() }
                        ?.let(::plainModelMigrationText)
                        ?: stringResource(
                            R.string.codex_native_model_picker_legacy_replacement,
                            model.upgradeModel.orEmpty()
                        )
                    ModelPickerRow(
                        label = model.displayName,
                        secondary = migrationText,
                        selected = currentModel == model.id,
                        enabled = false,
                        onClick = {}
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

private fun plainModelMigrationText(markdown: String): String = markdown
    .replace(Regex("\\[([^]]+)]\\([^)]+\\)"), "$1")
    .replace("`", "")
    .replace("**", "")
    .trim()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReasoningPickerSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectReasoningEffort: (String?) -> Unit
) {
    val currentModel = resolvedConcreteModelSelection(state)
    val currentModelMetadata = state.modelCatalog.firstOrNull { it.id == currentModel }
    val effectiveEffort = state.nextTurnEffectiveCodexConfig?.reasoningEffort
        ?: state.reasoningEffort
        ?: currentModelMetadata?.defaultReasoningEffort
        ?: state.capabilities?.defaultReasoningEffort?.takeIf { it.isNotBlank() }
    val options = currentModelMetadata?.supportedReasoningEfforts
        ?: state.capabilities?.reasoningEffortLevels.orEmpty()
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = stringResource(R.string.codex_native_reasoning_picker_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.codex_native_reasoning_picker_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(14.dp))

            if (options.isEmpty()) {
                Text(
                    text = stringResource(R.string.codex_native_reasoning_picker_empty),
                    color = TextMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 16.dp)
                )
            } else {
                options.forEach { effort ->
                    ModelPickerRow(
                        label = reasoningEffortLabel(effort),
                        selected = effectiveEffort.equals(effort, ignoreCase = true),
                        onClick = { onSelectReasoningEffort(effort) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SandboxPickerSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectSandboxMode: (String?) -> Unit
) {
    val selected = resolvedPermissionSelection(state)
    val modernPermissionControls = state.capabilities == null ||
        state.capabilities.permissionProfiles ||
        state.capabilities.approvalsReviewer
    val selectedLegacySandbox = resolvedConcreteSandboxSelection(state)
    val namedProfiles = state.permissionProfiles.filterNot {
        it.id.equals(":read-only", ignoreCase = true) ||
            it.id.equals(":workspace", ignoreCase = true) ||
            it.id.equals(":danger-full-access", ignoreCase = true)
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor,
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = stringResource(
                    if (modernPermissionControls) {
                        R.string.codex_native_permission_picker_title
                    } else {
                        R.string.codex_native_sandbox_picker_title
                    }
                ),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(
                    if (modernPermissionControls) {
                        R.string.codex_native_permission_picker_subtitle
                    } else {
                        R.string.codex_native_sandbox_picker_subtitle
                    }
                ),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            if (modernPermissionControls) {
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_permission_ask),
                    secondary = stringResource(R.string.codex_native_permission_ask_description),
                    selected = selected.kind == PermissionSelectionKind.ASK,
                    onClick = { onSelectSandboxMode(PERMISSION_CHOICE_ASK) }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_permission_auto_review),
                    secondary = stringResource(R.string.codex_native_permission_auto_review_description),
                    selected = selected.kind == PermissionSelectionKind.AUTO_REVIEW,
                    onClick = { onSelectSandboxMode(PERMISSION_CHOICE_AUTO_REVIEW) }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_permission_full_access),
                    secondary = stringResource(R.string.codex_native_permission_full_access_description),
                    selected = selected.kind == PermissionSelectionKind.FULL_ACCESS,
                    onClick = { onSelectSandboxMode(PERMISSION_CHOICE_FULL_ACCESS) }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_permission_custom),
                    secondary = stringResource(R.string.codex_native_permission_custom_description),
                    selected = selected.kind == PermissionSelectionKind.CUSTOM,
                    onClick = { onSelectSandboxMode(PERMISSION_CHOICE_CUSTOM) }
                )
            } else {
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_sandbox_picker_default),
                    selected = selectedLegacySandbox.isNullOrBlank(),
                    onClick = { onSelectSandboxMode(null) }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_sandbox_workspace_write),
                    selected = selectedLegacySandbox.equals("workspace-write", ignoreCase = true),
                    onClick = { onSelectSandboxMode("workspace-write") }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_sandbox_read_only),
                    selected = selectedLegacySandbox.equals("read-only", ignoreCase = true),
                    onClick = { onSelectSandboxMode("read-only") }
                )
                ModelPickerRow(
                    label = stringResource(R.string.codex_native_sandbox_full_access),
                    selected = selectedLegacySandbox.equals("danger-full-access", ignoreCase = true),
                    onClick = { onSelectSandboxMode("danger-full-access") }
                )
            }

            if (modernPermissionControls && state.permissionProfilesLoading) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = AccentBlue
                    )
                    Text(
                        text = stringResource(R.string.codex_native_permission_profiles_loading),
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
            }

            if (modernPermissionControls && namedProfiles.isNotEmpty()) {
                Text(
                    text = stringResource(R.string.codex_native_permission_profiles_title),
                    color = TextMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(start = 4.dp, top = 8.dp, bottom = 8.dp)
                )
                namedProfiles.forEach { profile ->
                    ModelPickerRow(
                        label = profile.id,
                        secondary = profile.description,
                        selected = selected.kind == PermissionSelectionKind.PROFILE &&
                            selected.profileId.equals(profile.id, ignoreCase = true),
                        enabled = profile.allowed,
                        onClick = {
                            onSelectSandboxMode(PERMISSION_PROFILE_CHOICE_PREFIX + profile.id)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ModelPickerRow(
    label: String,
    selected: Boolean,
    secondary: String? = null,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .heightIn(min = 48.dp)
            .alpha(if (enabled) 1f else 0.48f)
            .clickable(enabled = enabled, onClick = onClick),
        color = if (selected) AccentBlue.copy(alpha = 0.14f) else SurfaceRaised,
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, if (selected) AccentBlue.copy(alpha = 0.7f) else SurfaceBorder)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    color = if (selected) AccentBlue else TextPrimary,
                    fontSize = 14.sp
                )
                secondary?.takeIf { it.isNotBlank() }?.let {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = it,
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
            }
            if (selected) {
                Text(
                    text = stringResource(R.string.codex_native_selected),
                    color = AccentBlue,
                    fontSize = 12.sp
                )
            }
        }
    }
}

private fun extractSlashQuery(text: String): String? {
    val trimmed = text.trim()
    if (!trimmed.startsWith("/")) {
        return null
    }
    if (trimmed.contains(' ')) {
        return null
    }
    return trimmed.lowercase()
}

private fun composerRawTextForMentionParsing(
    text: String,
    committedMentions: List<FileMention>
): String = committedMentions.fold(text) { current, file ->
    stripCommittedMentionTokens(current, file)
}

private fun stripCommittedMentionTokens(text: String, file: FileMention): String {
    return buildList {
        add("@${displayFileMention(file)}")
        add("@${file.label}")
    }.distinct().fold(text) { current, token ->
        stripCommittedMentionToken(current, token)
    }
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

private fun composerContainsMention(text: String, file: FileMention): Boolean {
    val token = "@${displayFileMention(file)}" // sensitive-scan:allow false positive for inline @mention token
    var cursor = 0
    while (cursor < text.length) {
        val matchIndex = text.indexOf(token, cursor)
        if (matchIndex == -1) return false
        val tokenEnd = matchIndex + token.length
        if (isCommittedMentionBoundary(text, matchIndex, tokenEnd)) {
            return true
        }
        cursor = tokenEnd
    }
    return false
}

private fun insertSelectedMentionToken(
    currentValue: TextFieldValue,
    file: FileMention
): TextFieldValue {
    val mentionToken = "@${displayFileMention(file)}"
    val cleanedValue = removeActiveMentionToken(currentValue)
    val insertionPoint = cleanedValue.selection.start.coerceIn(0, cleanedValue.text.length)
    val textWithSpacing = buildString {
        append(cleanedValue.text.substring(0, insertionPoint))
        append(mentionToken)
        append(' ')
        append(cleanedValue.text.substring(insertionPoint))
    }
    val nextCursor = (insertionPoint + mentionToken.length + 1).coerceAtMost(textWithSpacing.length)
    return TextFieldValue(
        text = textWithSpacing,
        selection = TextRange(nextCursor)
    )
}

private fun removeActiveMentionToken(value: TextFieldValue): TextFieldValue {
    val text = value.text
    val selectionEnd = value.selection.end.coerceIn(0, text.length)
    val tokenStart = text.lastIndexOf('@', startIndex = (selectionEnd - 1).coerceAtLeast(0))
    if (tokenStart == -1) {
        return value
    }
    val tokenEnd = text.indexOfFirstFrom(tokenStart) { it.isWhitespace() }.let { whitespaceIndex ->
        if (whitespaceIndex == -1) text.length else whitespaceIndex
    }
    if (tokenStart > 0 && !text[tokenStart - 1].isWhitespace()) {
        return value
    }
    if (selectionEnd < tokenStart || selectionEnd > tokenEnd) {
        return value
    }
    val trimmedEnd = if (tokenEnd < text.length && text[tokenEnd].isWhitespace()) tokenEnd + 1 else tokenEnd
    val nextText = text.removeRange(tokenStart, trimmedEnd)
    return TextFieldValue(
        text = nextText,
        selection = TextRange(tokenStart.coerceAtMost(nextText.length))
    )
}

private fun String.indexOfFirstFrom(startIndex: Int, predicate: (Char) -> Boolean): Int {
    for (index in startIndex until length) {
        if (predicate(this[index])) return index
    }
    return -1
}

private fun composerVisualTransformation(mentions: List<FileMention>): VisualTransformation {
    return VisualTransformation { source ->
        buildComposerTransformedText(
            text = source.text,
            mentions = mentions
        )
    }
}

private data class ComposerSkillDisplayRange(
    val rawStart: Int,
    val rawEnd: Int,
    val displayStart: Int,
    val displayEnd: Int
)

private fun buildComposerTransformedText(
    text: String,
    mentions: List<FileMention>,
    textColor: Color = TextPrimary
): TransformedText {
    val rawMatches = mutableListOf<Pair<IntRange, String>>()
    CodexSlashRegistry.extractSkillTokens(text).forEach { token ->
        val tokenText = token.raw.trim()
        if (tokenText.isBlank()) return@forEach
        var cursor = 0
        while (cursor < text.length) {
            val matchIndex = text.indexOf(tokenText, cursor)
            if (matchIndex == -1) break
            val matchEnd = matchIndex + tokenText.length
            rawMatches += (matchIndex until matchEnd) to "\$${token.name}"
            cursor = matchEnd
        }
    }
    if (rawMatches.isEmpty()) {
        return TransformedText(
            buildComposerAnnotatedString(
                text = text,
                mentions = mentions,
                textColor = textColor
            ),
            OffsetMapping.Identity
        )
    }
    val filteredMatches = mutableListOf<Pair<IntRange, String>>()
    var nextRawStart = 0
    rawMatches.sortedBy { it.first.first }.forEach { match ->
        if (match.first.first >= nextRawStart) {
            filteredMatches += match
            nextRawStart = match.first.last + 1
        }
    }
    val transformed = StringBuilder()
    val originalToTransformedOffsets = IntArray(text.length + 1)
    val transformedToOriginalOffsets = mutableListOf<Int>()
    val skillDisplayRanges = mutableListOf<ComposerSkillDisplayRange>()
    var originalCursor = 0
    filteredMatches.forEach { (rawRange, displayText) ->
        while (originalCursor < rawRange.first) {
            originalToTransformedOffsets[originalCursor] = transformed.length
            transformed.append(text[originalCursor])
            transformedToOriginalOffsets += originalCursor
            originalCursor += 1
        }
        val displayStart = transformed.length
        displayText.forEachIndexed { index, char ->
            transformed.append(char)
            transformedToOriginalOffsets += (rawRange.first + index).coerceAtMost(rawRange.last + 1)
        }
        val displayEnd = transformed.length
        for (offset in rawRange.first..rawRange.last) {
            originalToTransformedOffsets[offset] = (displayStart + (offset - rawRange.first)).coerceAtMost(displayEnd)
        }
        originalToTransformedOffsets[rawRange.last + 1] = displayEnd
        skillDisplayRanges += ComposerSkillDisplayRange(
            rawStart = rawRange.first,
            rawEnd = rawRange.last + 1,
            displayStart = displayStart,
            displayEnd = displayEnd
        )
        originalCursor = rawRange.last + 1
    }
    while (originalCursor < text.length) {
        originalToTransformedOffsets[originalCursor] = transformed.length
        transformed.append(text[originalCursor])
        transformedToOriginalOffsets += originalCursor
        originalCursor += 1
    }
    originalToTransformedOffsets[text.length] = transformed.length
    transformedToOriginalOffsets += text.length
    val mentionTokens = mentions.map { "@${displayFileMention(it)}" }.distinct()
    val annotated = buildAnnotatedString {
        append(transformed.toString())
        addStyle(SpanStyle(color = textColor), 0, transformed.length)
        skillDisplayRanges.forEach { range ->
            addStyle(
                SpanStyle(
                    color = AccentBlue,
                    background = Color(0x1A2F81F7)
                ),
                range.displayStart,
                range.displayEnd
            )
        }
        mentionTokens.forEach { token ->
            var cursor = 0
            while (cursor < text.length) {
                val matchIndex = text.indexOf(token, cursor)
                if (matchIndex == -1) break
                val tokenEnd = matchIndex + token.length
                if (isCommittedMentionBoundary(text, matchIndex, tokenEnd)) {
                    addStyle(
                        SpanStyle(
                            color = AccentBlue,
                            background = Color(0x1F2F81F7)
                        ),
                        originalToTransformedOffsets[matchIndex],
                        originalToTransformedOffsets[tokenEnd]
                    )
                }
                cursor = tokenEnd
            }
        }
    }
    val offsetMapping = object : OffsetMapping {
        override fun originalToTransformed(offset: Int): Int =
            originalToTransformedOffsets[offset.coerceIn(0, text.length)]

        override fun transformedToOriginal(offset: Int): Int =
            transformedToOriginalOffsets[offset.coerceIn(0, transformedToOriginalOffsets.lastIndex)]
    }
    return TransformedText(annotated, offsetMapping)
}

private fun buildComposerAnnotatedString(
    text: String,
    mentions: List<FileMention>,
    textColor: Color
): AnnotatedString {
    val mentionTokens = mentions.map { "@${displayFileMention(it)}" }.distinct()
    return buildAnnotatedString {
        append(text)
        addStyle(SpanStyle(color = textColor), 0, text.length)
        CodexSlashRegistry.extractSkillTokens(text).forEach { token ->
            val tokenText = token.raw.trim()
            if (tokenText.isBlank()) return@forEach
            var cursor = 0
            while (cursor < text.length) {
                val matchIndex = text.indexOf(tokenText, cursor)
                if (matchIndex == -1) break
                val tokenEnd = matchIndex + tokenText.length
                addStyle(
                    SpanStyle(
                        color = AccentBlue,
                        background = Color(0x1A2F81F7)
                    ),
                    matchIndex,
                    tokenEnd
                )
                cursor = tokenEnd
            }
        }
        mentionTokens.forEach { token ->
            var cursor = 0
            while (cursor < text.length) {
                val matchIndex = text.indexOf(token, cursor)
                if (matchIndex == -1) break
                val tokenEnd = matchIndex + token.length
                if (isCommittedMentionBoundary(text, matchIndex, tokenEnd)) {
                    addStyle(
                        SpanStyle(
                            color = AccentBlue,
                            background = Color(0x1F2F81F7)
                        ),
                        matchIndex,
                        tokenEnd
                    )
                }
                cursor = tokenEnd
            }
        }
    }
}

private fun isCommittedMentionBoundary(text: String, start: Int, end: Int): Boolean {
    val validStart = start == 0 || text[start - 1].isWhitespace()
    val validEnd = end == text.length ||
        text[end].isWhitespace() ||
        text[end] in charArrayOf(',', '.', ';', ':', '，', '。', '、', '；', '：', ')', ']', '}')
    return validStart && validEnd
}

private fun displayFileMention(file: FileMention): String {
    return file.label
}

@Composable
private fun reasoningEffortLabel(value: String): String = when (value.lowercase()) {
    "none" -> stringResource(R.string.codex_native_effort_none)
    "minimal" -> stringResource(R.string.codex_native_effort_minimal)
    "low" -> stringResource(R.string.codex_native_effort_low)
    "medium" -> stringResource(R.string.codex_native_effort_medium)
    "high" -> stringResource(R.string.codex_native_effort_high)
    "xhigh" -> stringResource(R.string.codex_native_effort_xhigh)
    else -> value
}

private fun compactComposerModelLabel(value: String): String {
    val withoutPrefix = value.trim().replace(Regex("^gpt-", RegexOption.IGNORE_CASE), "")
    return withoutPrefix
        .split('-')
        .filter { it.isNotBlank() }
        .joinToString(" ") { segment ->
            if (segment.any(Char::isLetter)) {
                segment.lowercase().replaceFirstChar { it.titlecase() }
            } else {
                segment
            }
        }
        .ifBlank { value }
}

private fun resolvedConcreteModelSelection(state: CodexUiState): String? {
    return state.nextTurnOverrides.model?.takeIf { it.isNotBlank() }
        ?: state.nextTurnEffectiveCodexConfig?.model?.takeIf { it.isNotBlank() }
        ?: state.serverNextTurnConfigBase?.model?.takeIf { it.isNotBlank() }
        ?: state.model?.takeIf { it.isNotBlank() }
        ?: state.capabilities?.models.orEmpty().firstOrNull { it.isNotBlank() }
}

private fun resolvedConcreteSandboxSelection(state: CodexUiState): String? {
    return state.nextTurnOverrides.sandbox?.takeIf { it.isNotBlank() }
        ?: state.nextTurnEffectiveCodexConfig?.sandboxMode?.takeIf { it.isNotBlank() }
        ?: state.serverNextTurnConfigBase?.sandboxMode?.takeIf { it.isNotBlank() }
}

private fun resolvedApprovalPolicy(state: CodexUiState): String? {
    return state.nextTurnEffectiveCodexConfig?.approvalPolicy?.takeIf { it.isNotBlank() }
        ?: state.ownerCurrentCodexConfig?.approvalPolicy?.takeIf { it.isNotBlank() }
        ?: state.serverNextTurnConfigBase?.approvalPolicy?.takeIf { it.isNotBlank() }
}

private enum class PermissionSelectionKind {
    ASK,
    AUTO_REVIEW,
    FULL_ACCESS,
    CUSTOM,
    PROFILE
}

private data class PermissionSelection(
    val kind: PermissionSelectionKind,
    val profileId: String? = null
)

private fun resolvedPermissionSelection(state: CodexUiState): PermissionSelection {
    if (state.nextTurnOverrides.useConfigPermissions ||
        state.nextTurnEffectiveCodexConfig?.useConfigPermissions == true
    ) {
        return PermissionSelection(PermissionSelectionKind.CUSTOM)
    }
    val effective = state.nextTurnEffectiveCodexConfig
    val profileId = state.nextTurnOverrides.permissionProfile?.takeIf { it.isNotBlank() }
        ?: effective?.permissionProfile?.takeIf { it.isNotBlank() }
        ?: state.ownerCurrentCodexConfig?.permissionProfile?.takeIf { it.isNotBlank() }
        ?: state.serverNextTurnConfigBase?.permissionProfile?.takeIf { it.isNotBlank() }
    val reviewer = state.nextTurnOverrides.approvalsReviewer?.takeIf { it.isNotBlank() }
        ?: effective?.approvalsReviewer?.takeIf { it.isNotBlank() }
        ?: state.ownerCurrentCodexConfig?.approvalsReviewer?.takeIf { it.isNotBlank() }
        ?: state.serverNextTurnConfigBase?.approvalsReviewer?.takeIf { it.isNotBlank() }
    val sandbox = resolvedConcreteSandboxSelection(state)
    val approval = state.nextTurnOverrides.approvalPolicy?.takeIf { it.isNotBlank() }
        ?: resolvedApprovalPolicy(state)
    val pendingSandbox = state.nextTurnOverrides.sandbox
    val pendingReviewer = state.nextTurnOverrides.approvalsReviewer

    return when {
        profileId.equals(":danger-full-access", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.FULL_ACCESS)
        profileId.equals(":workspace", ignoreCase = true) &&
            reviewer.equals("auto_review", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.AUTO_REVIEW)
        profileId.equals(":workspace", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.ASK)
        !profileId.isNullOrBlank() ->
            PermissionSelection(PermissionSelectionKind.PROFILE, profileId)
        pendingReviewer.equals("auto_review", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.AUTO_REVIEW)
        pendingSandbox.equals("danger-full-access", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.FULL_ACCESS)
        pendingSandbox.equals("workspace-write", ignoreCase = true) ||
            pendingSandbox.equals("read-only", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.ASK)
        state.capabilities?.permissionProfiles == true ->
            PermissionSelection(PermissionSelectionKind.CUSTOM)
        reviewer.equals("auto_review", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.AUTO_REVIEW)
        sandbox.equals("danger-full-access", ignoreCase = true) &&
            approval.equals("never", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.FULL_ACCESS)
        (sandbox.equals("workspace-write", ignoreCase = true) ||
            sandbox.equals("read-only", ignoreCase = true)) &&
            approval.equals("on-request", ignoreCase = true) ->
            PermissionSelection(PermissionSelectionKind.ASK)
        else -> PermissionSelection(PermissionSelectionKind.CUSTOM)
    }
}

@Composable
private fun permissionSelectionLabel(selection: PermissionSelection, short: Boolean): String = when (selection.kind) {
    PermissionSelectionKind.ASK -> stringResource(
        if (short) R.string.codex_native_permission_ask_short else R.string.codex_native_permission_ask
    )
    PermissionSelectionKind.AUTO_REVIEW -> stringResource(
        if (short) R.string.codex_native_permission_auto_review_short else R.string.codex_native_permission_auto_review
    )
    PermissionSelectionKind.FULL_ACCESS -> stringResource(
        if (short) R.string.codex_native_permission_full_access_short else R.string.codex_native_permission_full_access
    )
    PermissionSelectionKind.CUSTOM -> stringResource(
        if (short) R.string.codex_native_permission_custom_short else R.string.codex_native_permission_custom
    )
    PermissionSelectionKind.PROFILE -> selection.profileId
        ?: stringResource(R.string.codex_native_permission_custom_short)
}

private fun dropdownSelectionLabel(label: String, selected: Boolean): String =
    if (selected) "✓ $label" else label

@Composable
private fun headerThreadTitle(state: CodexUiState): String? {
    val currentTitle = state.currentThreadTitle.trim()
    val normalizedThreadId = state.threadId?.trim().orEmpty()
    if (currentTitle.isBlank()) {
        return null
    }
    if (normalizedThreadId.isNotEmpty() && looksLikeRawThreadId(currentTitle, normalizedThreadId)) {
        return stringResource(
            R.string.codex_native_thread_short_label,
            normalizedThreadId.take(8)
        )
    }
    return currentTitle
}

private fun looksLikeRawThreadId(title: String, threadId: String): Boolean {
    val normalizedTitle = title.trim()
    val normalizedThreadId = threadId.trim()
    if (normalizedTitle.isEmpty() || normalizedThreadId.isEmpty()) {
        return false
    }
    if (normalizedTitle.equals(normalizedThreadId, ignoreCase = true)) {
        return true
    }
    if (normalizedTitle.length < 16 || normalizedTitle.any { it.isWhitespace() }) {
        return false
    }
    return normalizedTitle.all { it.isLetterOrDigit() || it == '-' || it == '_' }
}

private fun summarizeDiffPreview(content: String): String {
    if (content.isBlank()) {
        return ""
    }
    val regexes = listOf(
        Regex("""^diff --git a/(.+?) b/(.+)$"""),
        Regex("""^\+\+\+ b/(.+)$"""),
        Regex("""^--- a/(.+)$""")
    )
    val files = linkedSetOf<String>()
    for (rawLine in content.lineSequence()) {
        val line = rawLine.trim()
        if (line.isEmpty()) {
            continue
        }
        for (regex in regexes) {
            val match = regex.find(line) ?: continue
            val candidate = match.groupValues.drop(1).firstOrNull { it.isNotBlank() }.orEmpty()
            if (candidate.isNotBlank()) {
                files += candidate
            }
        }
    }
    if (files.isEmpty()) {
        return summarizeNarrativePreview(content)
    }
    val previewFiles = files.take(3)
    val remaining = files.size - previewFiles.size
    return buildString {
        append(previewFiles.joinToString(" • "))
        if (remaining > 0) {
            append(" • +")
            append(remaining)
        }
    }
}

private fun summarizeNarrativePreview(content: String): String {
    if (content.isBlank()) {
        return ""
    }
    return content.lineSequence()
        .map { it.trim() }
        .firstOrNull { line ->
            line.isNotBlank() &&
                line != "{" &&
                line != "}" &&
                line != "[" &&
                line != "]"
        }
        ?.take(180)
        .orEmpty()
}

@Composable
private fun approvalTitle(request: CodexServerRequest): String = when (request.requestKind) {
    "command" -> stringResource(R.string.codex_native_approval_title_command)
    "file" -> stringResource(R.string.codex_native_approval_title_file)
    "patch" -> stringResource(R.string.codex_native_approval_title_patch)
    "userInput" -> stringResource(R.string.codex_native_approval_title_user_input)
    else -> stringResource(R.string.codex_native_approval_title_default)
}

@Composable
private fun approvalSummary(request: CodexServerRequest): String {
    request.summary?.takeIf { it.isNotBlank() }?.let { return it }
    return when (request.requestKind) {
        "command" -> stringResource(R.string.codex_native_approval_summary_command)
        "file" -> stringResource(R.string.codex_native_approval_summary_file)
        "patch" -> stringResource(R.string.codex_native_approval_summary_patch)
        "userInput" -> {
            if (request.questionCount > 1) {
                stringResource(R.string.codex_native_approval_summary_questions_remaining, request.questionCount)
            } else {
                stringResource(R.string.codex_native_approval_summary_user_input)
            }
        }

        else -> stringResource(R.string.codex_native_approval_summary_default)
    }
}

@Composable
private fun slashTitle(command: String): String = when (command) {
    "/model" -> stringResource(R.string.codex_native_slash_model)
    "/plan" -> stringResource(R.string.codex_native_slash_plan)
    "/skill" -> stringResource(R.string.codex_native_slash_skill)
    "/compact" -> stringResource(R.string.codex_native_slash_compact)
    "/new" -> stringResource(R.string.codex_native_slash_new)
    "/fork" -> stringResource(R.string.codex_native_slash_fork)
    "/skills" -> stringResource(R.string.codex_native_slash_skills)
    "/mention" -> stringResource(R.string.codex_native_slash_mention)
    "/fast" -> stringResource(R.string.codex_native_slash_fast)
    else -> command
}

@Composable
private fun PulsingDot(
    color: Color,
    animated: Boolean,
    size: Dp = 8.dp
) {
    val alpha by if (animated) {
        rememberInfiniteTransition(label = "codex-dot").animateFloat(
            initialValue = 0.45f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 900),
                repeatMode = RepeatMode.Reverse
            ),
            label = "codex-dot-alpha"
        )
    } else {
        remember { mutableStateOf(1f) }
    }

    Box(
        modifier = Modifier
            .size(size)
            .alpha(alpha)
            .background(color, CircleShape)
    )
}

private data class BubbleSpec(
    val background: Color,
    val border: Color,
    val labelColor: Color,
    val textColor: Color
)

private data class DebugInjectorEntry(
    val preset: DebugServerRequestPreset,
    val title: String
)

@Composable
private fun roleLabel(message: ChatMessage): String = when (message.role) {
    ChatMessage.Role.USER -> stringResource(R.string.codex_native_role_you)
    ChatMessage.Role.ASSISTANT -> stringResource(R.string.codex_native_role_assistant)
    ChatMessage.Role.SYSTEM -> stringResource(R.string.codex_native_role_system)
    ChatMessage.Role.TOOL -> stringResource(R.string.codex_native_role_tool)
    ChatMessage.Role.ERROR -> stringResource(R.string.codex_native_role_error)
}

private fun bubbleSpec(role: ChatMessage.Role): BubbleSpec = when (role) {
    ChatMessage.Role.USER -> BubbleSpec(
        background = UserBg,
        border = SurfaceBorder.copy(alpha = 0.55f),
        labelColor = TextSecondary,
        textColor = TextPrimary
    )
    ChatMessage.Role.ASSISTANT -> BubbleSpec(
        background = AssistantBg,
        border = SurfaceBorder.copy(alpha = 0.48f),
        labelColor = TextSecondary,
        textColor = TextPrimary
    )
    ChatMessage.Role.SYSTEM -> BubbleSpec(
        background = ToolBg,
        border = SurfaceBorder.copy(alpha = 0.48f),
        labelColor = WarningColor,
        textColor = TextPrimary
    )
    ChatMessage.Role.TOOL -> BubbleSpec(
        background = ToolBg,
        border = SurfaceBorder.copy(alpha = 0.48f),
        labelColor = TextSecondary,
        textColor = TextSecondary
    )
    ChatMessage.Role.ERROR -> BubbleSpec(
        background = ErrorBg,
        border = ErrorColor.copy(alpha = 0.25f),
        labelColor = ErrorColor,
        textColor = TextPrimary
    )
}
