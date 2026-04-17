package com.termlink.app.codex.ui

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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
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
import com.termlink.app.BuildConfig
import com.termlink.app.R
import com.termlink.app.codex.data.CodexSlashRegistry
import com.termlink.app.codex.data.CodexServerRequest
import com.termlink.app.codex.data.CodexServerRequestQuestion
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexPendingImageAttachment
import com.termlink.app.codex.domain.CodexSkillEntry
import com.termlink.app.codex.domain.CodexThreadHistoryEntry
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.DebugServerRequestPreset
import com.termlink.app.codex.domain.FileMention
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val BgColor = Color(0xFF131A24)
private val SurfaceColor = Color(0xFF1B2532)
private val SurfaceRaised = Color(0xFF222E3D)
private val SurfaceBorder = Color(0xFF425266)
private val AccentBlue = Color(0xFF7FA8FF)
private val ContextBlue = Color(0xFF7FC7FF)
private val TextPrimary = Color(0xFFE7EDF6)
private val TextSecondary = Color(0xFFB9C5D4)
private val TextMuted = Color(0xFF7D8A9B)
private val SuccessColor = Color(0xFF4EDEA3)
private val RunningColor = Color(0xFF3FB950)
private val WarningColor = Color(0xFFE4B66A)
private val SystemColor = Color(0xFFE4B66A)
private val ErrorColor = Color(0xFFFF7B72)
private val UserBg = Color(0xFF182232)
private val AssistantBg = Color.Transparent
private val SystemBg = Color(0x1A5E4A20)
private val ToolBg = Color(0xFF182233)
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
    onOpenSessions: () -> Unit,
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
    onPickLocalImage: () -> Unit,
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
    val secondaryPanelVisible = state.threadHistorySheetVisible || runtimePanelVisible || noticesPanelVisible || state.toolsPanel.visible

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
            .background(BgColor)
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
                hasInterruptibleTurn = hasInterruptibleTurn,
                onOpenSessions = onOpenSessions,
                onOpenDocs = onOpenDocs,
                docsEnabled = state.sessionId.isNotBlank(),
                onInterrupt = onInterrupt,
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
                        onPickLocalImage = onPickLocalImage,
                        onPickLocalFile = onPickLocalFile,
                        onRemovePendingImageAttachment = onRemovePendingImageAttachment,
                        onShowModelPicker = onShowModelPicker,
                        onHideModelPicker = onHideModelPicker,
                        onSelectModel = onSelectModel,
                        onShowReasoningPicker = onShowReasoningPicker,
                        onHideReasoningPicker = onHideReasoningPicker,
                        onSelectReasoningEffort = onSelectReasoningEffort,
                        onShowSandboxPicker = onShowSandboxPicker,
                        onHideSandboxPicker = onHideSandboxPicker,
                        onSelectSandboxMode = onSelectSandboxMode,
                        onTogglePlanMode = onTogglePlanMode,
                        onShowUsagePanel = onShowUsagePanel,
                        onShowRuntimePanel = onShowRuntimePanel,
                        onHideRuntimePanel = onHideRuntimePanel,
                        onShowNoticesPanel = onShowNoticesPanel,
                        onHideNoticesPanel = onHideNoticesPanel,
                        onShowThreadHistory = onShowThreadHistory,
                        onHideThreadHistory = onHideThreadHistory,
                        onShowToolsPanel = onShowToolsPanel,
                        onHideToolsPanel = onHideToolsPanel,
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

                        if (state.toolsPanel.visible) {
                            ToolsPanelSheet(
                                state = state,
                                onSelectSkill = onSelectSkill,
                                onTogglePlanMode = onTogglePlanMode
                            )
                        }
                    }
                }
            }
        }
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

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CodexHeader(
    state: CodexUiState,
    isStreaming: Boolean,
    hasInterruptibleTurn: Boolean,
    onOpenSessions: () -> Unit,
    onOpenDocs: () -> Unit,
    docsEnabled: Boolean,
    onInterrupt: () -> Unit,
    onShowDebugInjector: () -> Unit
) {
    val statusLabel = when {
        state.connectionState == ConnectionState.CONNECTING && state.sessionId.isBlank() ->
            stringResource(R.string.codex_native_creating_session)
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
        isStreaming || state.status.equals("running", ignoreCase = true) -> RunningColor
        state.connectionState == ConnectionState.CONNECTED -> SuccessColor
        state.connectionState == ConnectionState.RECONNECTING -> WarningColor
        state.connectionState == ConnectionState.ERROR -> ErrorColor
        state.connectionState == ConnectionState.CONNECTING -> AccentBlue
        else -> TextMuted
    }

    val metaParts = buildList {
        if (state.pendingServerRequests.size == 1) {
            add(stringResource(R.string.codex_native_status_approval_count_one))
        } else if (state.pendingServerRequests.size > 1) {
            add(
                stringResource(
                    R.string.codex_native_status_approval_count_many,
                    state.pendingServerRequests.size
                )
            )
        }
    }
    val quotaChips = buildHeaderQuotaChips(
        summary = state.usagePanel.rateLimitSummary,
        oneWeekLabel = stringResource(R.string.codex_native_status_quota_window_one_week)
    )

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = BgColor.copy(alpha = 0.95f)
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
                    .heightIn(min = 72.dp)
                    .padding(start = 8.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                GlobalActionChip(
                    iconRes = R.drawable.ic_sessions_24,
                    contentDescription = stringResource(R.string.codex_native_header_sessions),
                    onClick = onOpenSessions,
                    boxSize = 40.dp,
                    iconSize = 18.dp
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                        .then(headerInteractionModifier),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_status_prefix, statusLabel),
                        color = statusColor,
                        fontSize = 11.sp,
                        lineHeight = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    state.cwd?.takeIf { it.isNotBlank() }?.let { cwd ->
                        val displayCwd = formatHeaderCwdForDisplay(cwd)
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.codex_native_header_path_prefix),
                                color = TextMuted,
                                fontSize = 10.sp,
                                lineHeight = 14.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = displayCwd,
                                color = TextSecondary,
                                fontSize = 10.sp,
                                lineHeight = 14.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (hasInterruptibleTurn) {
                        FilledTonalButton(
                            onClick = onInterrupt,
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = ErrorColor.copy(alpha = 0.12f),
                                contentColor = ErrorColor
                            ),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(text = stringResource(R.string.codex_native_interrupt), fontSize = 11.sp)
                        }
                    }
                    GlobalActionChip(
                        iconRes = R.drawable.ic_codex_docs_24,
                        contentDescription = stringResource(R.string.codex_native_header_docs),
                        onClick = onOpenDocs,
                        enabled = docsEnabled,
                        boxSize = 44.dp,
                        iconSize = 22.dp
                    )
                }
            }
            if (metaParts.isNotEmpty() || quotaChips.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp, bottom = 12.dp)
                ) {
                    metaParts.takeIf { it.isNotEmpty() }?.let { parts ->
                        Text(
                            text = parts.joinToString(" | "),
                            color = TextSecondary,
                            fontSize = 10.sp,
                            lineHeight = 14.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (quotaChips.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                    }
                    quotaChips.takeIf { it.isNotEmpty() }?.let { chips ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = stringResource(R.string.codex_native_status_quota_label),
                                color = TextMuted,
                                fontSize = 9.sp,
                                lineHeight = 12.sp
                            )
                            chips.forEach { chip ->
                                HeaderQuotaChip(
                                    chip = chip,
                                    tone = state.usagePanel.rateLimitTone
                                )
                            }
                        }
                    }
                }
            }
            HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.85f))
        }
    }
}

@Composable
private fun GlobalActionChip(
    iconRes: Int,
    contentDescription: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
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
            tint = if (enabled) TextSecondary else TextMuted,
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
private fun CommandApprovalDialog(
    request: CodexServerRequest,
    submitting: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    Dialog(onDismissRequest = {}) {
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = Color(0xFF161B22),
            border = BorderStroke(1.dp, SurfaceBorder),
            shadowElevation = 16.dp
        ) {
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
                            shape = RoundedCornerShape(4.dp),
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_approval_reject),
                        onClick = onReject,
                        enabled = !submitting,
                        variant = ModalButtonVariant.DANGER
                    )
                    Spacer(modifier = Modifier.width(10.dp))
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

    Dialog(onDismissRequest = {}) {
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = Color(0xFF161B22),
            border = BorderStroke(1.dp, SurfaceBorder),
            shadowElevation = 16.dp
        ) {
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_approval_cancel),
                        onClick = onReject,
                        enabled = !submitting,
                        variant = ModalButtonVariant.SUBTLE
                    )
                    if (supportsAnswers) {
                        Spacer(modifier = Modifier.width(10.dp))
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
        shape = RoundedCornerShape(6.dp),
        color = if (selected) Color(0x1A4DAAFC) else Color(0x08FFFFFF),
        border = BorderStroke(
            1.dp,
            if (selected) Color(0x4D4DAAFC) else Color(0x14FFFFFF)
        ),
        modifier = Modifier
            .fillMaxWidth()
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
        shape = RoundedCornerShape(4.dp),
        color = if (enabled) bgColor else bgColor.copy(alpha = 0.4f),
        border = BorderStroke(1.dp, if (enabled) borderColor else borderColor.copy(alpha = 0.4f)),
        modifier = Modifier.clickable(enabled = enabled, onClick = onClick)
    ) {
        Text(
            text = text,
            color = if (enabled) textColor else textColor.copy(alpha = 0.4f),
            fontSize = 11.sp,
            lineHeight = 11.sp,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
        )
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
private fun MessageBubble(message: ChatMessage) {
    if (message.collapsible) {
        CollapsibleExecutionItem(message)
        return
    }
    val spec = remember(message.role) { bubbleSpec(message.role) }
    val layout = remember(message.role) { bubbleLayoutSpec(message.role) }
    val label = roleLabel(message)

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (layout.alignEnd) Alignment.End else Alignment.Start
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(layout.widthFraction)
                .widthIn(max = layout.maxWidth)
        ) {
            Text(
                text = label,
                color = spec.labelColor,
                fontSize = 10.sp,
                textAlign = layout.labelTextAlign,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 4.dp, end = 4.dp, top = 1.dp, bottom = 2.dp)
            )

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = layout.shape,
                color = spec.background,
                border = BorderStroke(1.dp, spec.border)
            ) {
                Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                    if (message.role == ChatMessage.Role.USER && !message.activeSkill.isNullOrBlank()) {
                        StaticSkillChip(
                            skillName = message.activeSkill,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
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
                            text = buildMentionAnnotatedString(
                                text = message.content,
                                mentions = message.fileMentions,
                                textColor = spec.textColor
                            ),
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
            }

            if (message.streaming) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    horizontalArrangement = if (layout.alignEnd) Arrangement.End else Arrangement.Start,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (layout.alignEnd) {
                        Text(
                            text = stringResource(R.string.codex_native_status_streaming),
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        PulsingDot(color = ContextBlue, animated = true, size = 6.dp)
                    } else {
                        PulsingDot(color = ContextBlue, animated = true, size = 6.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = stringResource(R.string.codex_native_status_streaming),
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CollapsibleExecutionItem(message: ChatMessage) {
    var expanded by remember { mutableStateOf(false) }
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        color = ToolBg,
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (expanded) "▾" else "▸",
                    color = AccentBlue,
                    fontSize = 10.sp,
                    modifier = Modifier.padding(end = 6.dp)
                )
                Text(
                    text = message.collapsedLabel,
                    color = AccentBlue,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.weight(1f)
                )
                if (message.content.isNotBlank()) {
                    Text(
                        text = message.content.lines().first().take(40),
                        color = TextMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.widthIn(max = 180.dp)
                    )
                }
            }
            if (expanded && message.content.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 200.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                        .padding(bottom = 6.dp)
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
        }
    }
}

private data class BubbleLayoutSpec(
    val alignEnd: Boolean,
    val widthFraction: Float,
    val maxWidth: Dp,
    val labelTextAlign: TextAlign,
    val shape: RoundedCornerShape
)

private fun bubbleLayoutSpec(role: ChatMessage.Role): BubbleLayoutSpec = when (role) {
    ChatMessage.Role.USER -> BubbleLayoutSpec(
        alignEnd = true,
        widthFraction = 0.84f,
        maxWidth = 760.dp,
        labelTextAlign = TextAlign.End,
        shape = RoundedCornerShape(
            topStart = 16.dp,
            topEnd = 16.dp,
            bottomEnd = 6.dp,
            bottomStart = 16.dp
        )
    )
    ChatMessage.Role.ASSISTANT -> BubbleLayoutSpec(
        alignEnd = false,
        widthFraction = 0.84f,
        maxWidth = 760.dp,
        labelTextAlign = TextAlign.Start,
        shape = RoundedCornerShape(
            topStart = 16.dp,
            topEnd = 16.dp,
            bottomEnd = 16.dp,
            bottomStart = 6.dp
        )
    )
    else -> BubbleLayoutSpec(
        alignEnd = false,
        widthFraction = 1f,
        maxWidth = 960.dp,
        labelTextAlign = TextAlign.Start,
        shape = RoundedCornerShape(4.dp)
    )
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

    Dialog(onDismissRequest = onCancelPlanWorkflow) {
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = Color(0xFF161B22),
            border = BorderStroke(1.dp, SurfaceBorder),
            shadowElevation = 16.dp
        ) {
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
                            shape = RoundedCornerShape(4.dp),
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_plan_workflow_cancel),
                        onClick = onCancelPlanWorkflow,
                        variant = ModalButtonVariant.SUBTLE
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    ModalActionButton(
                        text = stringResource(R.string.codex_native_plan_workflow_continue),
                        onClick = onContinuePlanWorkflow,
                        variant = ModalButtonVariant.DEFAULT
                    )
                    Spacer(modifier = Modifier.width(10.dp))
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

@Composable
private fun ToolsPanelSheet(
    state: CodexUiState,
    onSelectSkill: (String?) -> Unit,
    onTogglePlanMode: () -> Unit
) {
    var skillsExpanded by remember { mutableStateOf(true) }
    var expandedSkillName by remember { mutableStateOf<String?>(null) }
    val skillsEnabled = state.capabilities?.skillsList == true
    val skillsMeta = when {
        skillsEnabled && state.toolsPanel.loading -> stringResource(R.string.codex_native_tools_skills_loading)
        skillsEnabled && state.toolsPanel.skills.isNotEmpty() -> stringResource(
            R.string.codex_native_tools_skills_count,
            state.toolsPanel.skills.size
        )
        skillsEnabled -> stringResource(R.string.codex_native_tools_skills_waiting)
        else -> ""
    }

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
                    text = stringResource(R.string.codex_native_tools_title).uppercase(Locale.ROOT),
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.4.sp,
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))

            if (skillsEnabled) {
                Surface(
                    color = BgColor,
                    shape = RoundedCornerShape(4.dp),
                    border = BorderStroke(
                        1.dp,
                        if (skillsExpanded) SuccessColor.copy(alpha = 0.15f) else SurfaceBorder
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { skillsExpanded = !skillsExpanded }
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = stringResource(R.string.codex_native_tools_skills_title).uppercase(Locale.ROOT),
                                color = TextSecondary,
                                fontSize = 10.sp,
                                lineHeight = 12.sp,
                                letterSpacing = 0.4.sp,
                                modifier = Modifier.weight(1f)
                            )
                            if (skillsMeta.isNotBlank()) {
                                Text(
                                    text = skillsMeta,
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    lineHeight = 13.sp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Text(
                                text = if (skillsExpanded) "▾" else "▸",
                                color = TextSecondary,
                                fontSize = 10.sp
                            )
                        }
                        if (skillsExpanded) {
                            Text(
                                text = stringResource(R.string.codex_native_tools_skills_description),
                                color = TextSecondary,
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                            when {
                                state.toolsPanel.loading -> {
                                    Text(
                                        text = stringResource(R.string.codex_native_tools_skills_loading),
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        lineHeight = 18.sp
                                    )
                                }
                                state.toolsPanel.skills.isEmpty() -> {
                                    Text(
                                        text = stringResource(R.string.codex_native_tools_skills_empty),
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        lineHeight = 18.sp
                                    )
                                }
                                else -> {
                                    LazyColumn(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(max = 200.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        items(state.toolsPanel.skills, key = { it.name }) { skill ->
                                            ToolSkillItem(
                                                skill = skill,
                                                selected = state.interactionState?.activeSkill == skill.name,
                                                expanded = expandedSkillName == skill.name,
                                                onToggle = {
                                                    expandedSkillName = if (expandedSkillName == skill.name) {
                                                        null
                                                    } else {
                                                        skill.name
                                                    }
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
                Spacer(modifier = Modifier.height(8.dp))
            }

            HorizontalDivider(color = SurfaceBorder.copy(alpha = 0.4f))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.codex_native_tools_plan_title).uppercase(Locale.ROOT),
                    color = TextSecondary,
                    fontSize = 10.sp,
                    lineHeight = 12.sp,
                    letterSpacing = 0.4.sp,
                    modifier = Modifier.weight(1f)
                )
                ToolsToggleButton(
                    text = if (state.planMode == true) {
                        stringResource(R.string.codex_native_tools_plan_disable)
                    } else {
                        stringResource(R.string.codex_native_tools_plan_enable)
                    },
                    active = state.planMode == true,
                    onClick = onTogglePlanMode
                )
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
            .clip(RoundedCornerShape(4.dp))
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
                shape = RoundedCornerShape(4.dp)
            )
            .clickable(onClick = onToggle)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
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
            .padding(horizontal = 8.dp, vertical = 3.dp)
            .widthIn(min = 42.dp),
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
private fun ToolsToggleButton(
    text: String,
    active: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(if (active) SuccessColor.copy(alpha = 0.1f) else Color.Transparent)
            .border(
                width = 1.dp,
                color = if (active) SuccessColor.copy(alpha = 0.4f) else SurfaceBorder.copy(alpha = 0.6f),
                shape = RoundedCornerShape(4.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 2.dp)
    ) {
        Text(
            text = text,
            color = if (active) SuccessColor else TextSecondary,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 14.sp
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
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 680.dp)
                .padding(horizontal = 20.dp),
            color = SurfaceColor,
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.95f)),
            shadowElevation = 18.dp
        ) {
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
                            .size(30.dp)
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

@Composable
private fun SecondaryNavRow(
    state: CodexUiState,
    onToggleThreadHistory: () -> Unit,
    onToggleRuntimePanel: () -> Unit,
    onToggleToolsPanel: () -> Unit,
    onToggleNoticesPanel: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 6.dp, start = 10.dp, end = 10.dp)
    ) {
        Row(
            modifier = Modifier.align(Alignment.CenterEnd),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (state.capabilities?.historyList == true) {
                SecondaryNavButton(
                    text = stringResource(R.string.codex_native_thread_history_title),
                    active = state.threadHistorySheetVisible,
                    onClick = onToggleThreadHistory
                )
            }
            if (state.capabilities?.diffPlanReasoning == true) {
                SecondaryNavButton(
                    text = stringResource(R.string.codex_native_runtime_title),
                    active = state.runtimePanel.visible,
                    onClick = onToggleRuntimePanel
                )
            }
            if (state.capabilities?.skillsList == true || state.capabilities?.compact == true) {
                SecondaryNavButton(
                    text = stringResource(R.string.codex_native_tools_title),
                    active = state.toolsPanel.visible,
                    onClick = onToggleToolsPanel
                )
            }
            if (hasNoticesPanelContent(state)) {
                SecondaryNavButton(
                    text = stringResource(R.string.codex_native_notices_title),
                    active = state.noticesPanel.visible,
                    onClick = onToggleNoticesPanel
                )
            }
        }
    }
}

@Composable
private fun SecondaryNavButton(
    text: String,
    active: Boolean,
    onClick: () -> Unit
) {
    Surface(
        color = Color.Transparent,
        shape = RoundedCornerShape(2.dp),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = text,
            color = if (active) SuccessColor else TextMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            lineHeight = 10.sp,
            letterSpacing = 0.5.sp,
            modifier = Modifier.padding(horizontal = 2.dp, vertical = 4.dp)
        )
    }
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
        shape = RoundedCornerShape(6.dp),
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
            .clip(RoundedCornerShape(4.dp))
            .clickable(enabled = enabled, onClick = onClick),
        color = if (enabled) SuccessColor.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.02f),
        shape = RoundedCornerShape(4.dp),
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
    onHideModelPicker: () -> Unit,
    onSelectModel: (String?) -> Unit,
    onShowReasoningPicker: () -> Unit,
    onHideReasoningPicker: () -> Unit,
    onSelectReasoningEffort: (String?) -> Unit,
    onShowSandboxPicker: () -> Unit,
    onHideSandboxPicker: () -> Unit,
    onSelectSandboxMode: (String?) -> Unit,
    onTogglePlanMode: () -> Unit,
    slashMenuVisible: Boolean,
    onShowToolsPanel: () -> Unit,
    onHideToolsPanel: () -> Unit,
    onShowUsagePanel: () -> Unit,
    onShowRuntimePanel: () -> Unit,
    onHideRuntimePanel: () -> Unit,
    onShowThreadHistory: () -> Unit,
    onHideThreadHistory: () -> Unit,
    onPickLocalImage: () -> Unit,
    onPickLocalFile: () -> Unit,
    onShowSlashMenu: () -> Unit
) {
    val effectiveConfig = state.nextTurnEffectiveCodexConfig
    val activeModel = resolvedConcreteModelSelection(state)
    val activeReasoning = effectiveConfig?.reasoningEffort
        ?: state.nextTurnOverrides.reasoningEffort
        ?: state.reasoningEffort
        ?: state.capabilities?.defaultReasoningEffort
    val activeSandboxMode = resolvedConcreteSandboxSelection(state)
    var attachmentMenuExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 10.dp, end = 10.dp, top = 0.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box {
            FooterActionButton(
                onClick = { attachmentMenuExpanded = true },
                enabled = imageInputEnabled,
                label = "⊕",
                contentDescription = stringResource(R.string.codex_native_attach)
            )
        }
        FooterActionButton(
            onClick = onShowSlashMenu,
            label = "/",
            contentDescription = stringResource(R.string.codex_native_open_commands),
            active = slashMenuVisible
        )
        Box(
            modifier = Modifier
                .width(1.dp)
                .height(14.dp)
                .background(SurfaceBorder.copy(alpha = 0.3f))
        )
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.Start,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                QuickControlButton(
                    label = stringResource(R.string.codex_native_model_label),
                    text = activeModel ?: stringResource(R.string.codex_native_quick_default),
                    maxTextWidth = 78.dp,
                    expanded = state.modelPickerVisible,
                    onClick = onShowModelPicker,
                    onDismiss = onHideModelPicker
                ) {
                    state.capabilities?.models.orEmpty().forEach { model ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = dropdownSelectionLabel(model, activeModel == model),
                                    color = if (activeModel == model) SuccessColor else TextPrimary
                                )
                            },
                            onClick = { onSelectModel(model) }
                        )
                    }
                }
                QuickControlButton(
                    label = stringResource(R.string.codex_native_reasoning_label),
                    text = activeReasoning?.let { reasoningEffortLabel(it) }
                        ?: stringResource(R.string.codex_native_quick_default),
                    maxTextWidth = 78.dp,
                    expanded = state.reasoningPickerVisible,
                    onClick = onShowReasoningPicker,
                    onDismiss = onHideReasoningPicker
                ) {
                    state.capabilities?.reasoningEffortLevels.orEmpty().ifEmpty {
                        listOf("low", "medium", "high")
                    }.forEach { effort ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = dropdownSelectionLabel(
                                        reasoningEffortLabel(effort),
                                        activeReasoning.equals(effort, ignoreCase = true)
                                    ),
                                    color = if (activeReasoning.equals(effort, ignoreCase = true)) {
                                        SuccessColor
                                    } else {
                                        TextPrimary
                                    }
                                )
                            },
                            onClick = { onSelectReasoningEffort(effort) }
                        )
                    }
                }
                if (state.capabilities?.sandboxSupported == true) {
                    QuickControlButton(
                        label = stringResource(R.string.codex_native_sandbox_label),
                        text = activeSandboxMode?.let { sandboxFooterLabel(it) }.orEmpty(),
                        maxTextWidth = 78.dp,
                        expanded = state.sandboxPickerVisible,
                        onClick = onShowSandboxPicker,
                        onDismiss = onHideSandboxPicker
                    ) {
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = dropdownSelectionLabel(
                                        stringResource(R.string.codex_native_sandbox_workspace_write),
                                        activeSandboxMode == "workspace-write"
                                    ),
                                    color = if (activeSandboxMode == "workspace-write") {
                                        SuccessColor
                                    } else {
                                        TextPrimary
                                    }
                                )
                            },
                            onClick = { onSelectSandboxMode("workspace-write") }
                        )
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = dropdownSelectionLabel(
                                        stringResource(R.string.codex_native_sandbox_read_only),
                                        activeSandboxMode == "read-only"
                                    ),
                                    color = if (activeSandboxMode == "read-only") {
                                        SuccessColor
                                    } else {
                                        TextPrimary
                                    }
                                )
                            },
                            onClick = { onSelectSandboxMode("read-only") }
                        )
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = dropdownSelectionLabel(
                                        stringResource(R.string.codex_native_sandbox_full_access),
                                        activeSandboxMode == "danger-full-access"
                                    ),
                                    color = if (activeSandboxMode == "danger-full-access") {
                                        SuccessColor
                                    } else {
                                        TextPrimary
                                    }
                                )
                            },
                            onClick = { onSelectSandboxMode("danger-full-access") }
                        )
                    }
                }
            }
        }
        Box(
            modifier = Modifier
                .width(1.dp)
                .height(14.dp)
                .background(SurfaceBorder.copy(alpha = 0.3f))
        )
        if (state.planMode == true) {
            FooterPlanIndicatorButton(onClick = onTogglePlanMode)
        }
        ContextUsageWidget(
            state = state,
            onClick = onShowUsagePanel
        )
    }
    if (attachmentMenuExpanded && imageInputEnabled) {
        ModalBottomSheet(
            onDismissRequest = { attachmentMenuExpanded = false }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = stringResource(R.string.codex_native_attach),
                    color = TextPrimary,
                    style = MaterialTheme.typography.titleMedium
                )
                FilledTonalButton(
                    onClick = {
                        attachmentMenuExpanded = false
                        onPickLocalImage()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = stringResource(R.string.codex_native_attach_image))
                }
                FilledTonalButton(
                    onClick = {
                        attachmentMenuExpanded = false
                        onPickLocalFile()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(text = stringResource(R.string.codex_native_attach_file))
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

@Composable
private fun FooterPlanIndicatorButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(3.dp))
            .background(SuccessColor.copy(alpha = 0.15f))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(
            text = stringResource(R.string.codex_native_plan_mode_chip),
            color = SuccessColor,
            fontSize = 11.sp,
            lineHeight = 13.sp,
            maxLines = 1
        )
    }
}

@Composable
private fun QuickControlButton(
    label: String,
    text: String,
    maxTextWidth: Dp = Dp.Unspecified,
    expanded: Boolean,
    onClick: () -> Unit,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit
) {
    Box {
        Row(
            modifier = Modifier
                .clickable(onClick = onClick)
                .padding(horizontal = 2.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = if (expanded) "▲" else "▼",
                color = if (expanded) SuccessColor else TextMuted,
                fontSize = 7.sp
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                color = if (expanded) TextSecondary else TextMuted,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = if (maxTextWidth != Dp.Unspecified) {
                    Modifier.widthIn(max = maxTextWidth)
                } else {
                    Modifier
                }
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = onDismiss
        ) {
            content()
        }
    }
}

@Composable
private fun FooterActionButton(
    onClick: () -> Unit,
    label: String,
    contentDescription: String,
    enabled: Boolean = true,
    active: Boolean = false
) {
    Box(
        modifier = Modifier
            .size(30.dp)
            .clip(RoundedCornerShape(9.dp))
            .background(
                when {
                    !enabled -> SurfaceRaised.copy(alpha = 0.45f)
                    active -> AccentBlue.copy(alpha = 0.24f)
                    else -> AccentBlue.copy(alpha = 0.14f)
                }
            )
            .border(
                1.dp,
                when {
                    !enabled -> SurfaceBorder.copy(alpha = 0.35f)
                    active -> AccentBlue.copy(alpha = 0.75f)
                    else -> AccentBlue.copy(alpha = 0.35f)
                },
                RoundedCornerShape(9.dp)
            )
            .semantics {
                this.contentDescription = contentDescription
                role = Role.Button
            }
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = when {
                !enabled -> TextMuted.copy(alpha = 0.55f)
                active -> TextPrimary
                else -> AccentBlue
            },
            fontSize = 14.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ContextUsageWidget(
    state: CodexUiState,
    onClick: () -> Unit
) {
    val usedPercent = displayedContextUsage(state)?.usedPercent?.coerceIn(0, 100)
    Box(
        modifier = Modifier
            .size(32.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(
                progress = { (usedPercent ?: 0) / 100f },
                modifier = Modifier.size(28.dp),
                color = if (usedPercent != null && usedPercent >= 80) WarningColor else ContextBlue,
                trackColor = Color.White.copy(alpha = 0.14f),
                strokeWidth = 2.dp
            )
            Text(
                text = usedPercent?.let { "$it%" } ?: "--",
                color = TextPrimary,
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold
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
        onDismissRequest = onDismiss
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 520.dp)
                .padding(horizontal = 20.dp),
            color = SurfaceColor,
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.85f))
        ) {
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
                        shape = RoundedCornerShape(4.dp),
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
    onPickLocalImage: () -> Unit,
    onPickLocalFile: () -> Unit,
    onRemovePendingImageAttachment: (String) -> Unit,
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
    onShowUsagePanel: () -> Unit,
    onShowRuntimePanel: () -> Unit,
    onHideRuntimePanel: () -> Unit,
    onShowNoticesPanel: () -> Unit,
    onHideNoticesPanel: () -> Unit,
    onShowThreadHistory: () -> Unit,
    onHideThreadHistory: () -> Unit,
    onShowToolsPanel: () -> Unit,
    onHideToolsPanel: () -> Unit,
    onClearActiveSkill: () -> Unit = {}
) {
    var textFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    val composerFocusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    val activeSkill = state.interactionState?.activeSkill?.takeIf { it.isNotBlank() }

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
        if (CodexSlashRegistry.parseFileMentionInput(mentionParseText) != null) {
            onComposerTextChanged(mentionParseText)
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

    LaunchedEffect(activeSkill) {
        if (activeSkill.isNullOrBlank()) {
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

    val showComposerNav = state.capabilities?.historyList == true ||
        state.capabilities?.diffPlanReasoning == true ||
        hasNoticesPanelContent(state) ||
        state.capabilities?.skillsList == true ||
        state.capabilities?.compact == true ||
        state.interactionState?.activeSkill?.isNotBlank() == true

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = BgColor.copy(alpha = 0.98f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding()
        ) {
            if (showComposerNav) {
                SecondaryNavRow(
                    state = state,
                    onToggleThreadHistory = {
                        if (state.threadHistorySheetVisible) onHideThreadHistory() else onShowThreadHistory()
                    },
                    onToggleRuntimePanel = {
                        if (state.runtimePanel.visible) onHideRuntimePanel() else onShowRuntimePanel()
                    },
                    onToggleToolsPanel = {
                        if (state.toolsPanel.visible) onHideToolsPanel() else onShowToolsPanel()
                    },
                    onToggleNoticesPanel = {
                        if (state.noticesPanel.visible) onHideNoticesPanel() else onShowNoticesPanel()
                    }
                )
            }

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
            }

            if (activeSkill != null) {
                ComposerSkillChip(
                    skillName = activeSkill,
                    onClear = onClearActiveSkill,
                    modifier = Modifier.padding(start = 12.dp, end = 12.dp, top = 4.dp)
                )
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                color = Color(0x3321262D),
                shape = RoundedCornerShape(0.dp),
                border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 28.dp, max = 140.dp)
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
                                mentionVisualTransformation(pendingMentions)
                            },
                            cursorBrush = SolidColor(AccentBlue),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                            keyboardActions = KeyboardActions(onSend = { submit() }),
                            singleLine = false,
                            maxLines = 8
                        )
                        if (textFieldValue.text.isBlank()) {
                            Text(
                                text = if (activeSkill != null) {
                                    stringResource(R.string.codex_native_input_hint_skill, activeSkill)
                                } else {
                                    stringResource(R.string.codex_native_input_hint)
                                },
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    if (hasInterruptibleTurn) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .clickable(onClick = onInterrupt),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "■",
                                color = ErrorColor,
                                fontSize = 13.sp
                            )
                        }
                    } else {
                        val canSubmit = enabled && (
                            textFieldValue.text.isNotBlank() ||
                                pendingMentions.isNotEmpty() ||
                                pendingImageAttachments.isNotEmpty()
                            )
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .clickable(enabled = canSubmit, onClick = { submit() }),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "↑",
                                color = if (canSubmit) SuccessColor else TextMuted,
                                fontSize = 18.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }
            }

            FooterControls(
                state = state,
                imageInputEnabled = attachmentInputEnabled,
                onShowModelPicker = onShowModelPicker,
                onHideModelPicker = onHideModelPicker,
                onSelectModel = onSelectModel,
                onShowReasoningPicker = onShowReasoningPicker,
                onHideReasoningPicker = onHideReasoningPicker,
                onSelectReasoningEffort = onSelectReasoningEffort,
                onShowSandboxPicker = onShowSandboxPicker,
                onHideSandboxPicker = onHideSandboxPicker,
                onSelectSandboxMode = onSelectSandboxMode,
                onTogglePlanMode = onTogglePlanMode,
                slashMenuVisible = slashMenuVisible,
                onShowToolsPanel = onShowToolsPanel,
                onHideToolsPanel = onHideToolsPanel,
                onShowUsagePanel = onShowUsagePanel,
                onShowRuntimePanel = onShowRuntimePanel,
                onHideRuntimePanel = onHideRuntimePanel,
                onShowThreadHistory = onShowThreadHistory,
                onHideThreadHistory = onHideThreadHistory,
                onPickLocalImage = onPickLocalImage,
                onPickLocalFile = onPickLocalFile,
                onShowSlashMenu = {
                    insertComposerText("/")
                }
            )
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
private fun StaticSkillChip(
    skillName: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.Start
    ) {
        SkillChipFrame {
            SkillChipLabel(skillName = skillName)
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
        text = stringResource(R.string.codex_native_skill_chip_prefix),
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
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
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
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 320.dp)
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
        containerColor = SurfaceColor
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

            state.capabilities?.models.orEmpty().forEach { model ->
                ModelPickerRow(
                    label = model,
                    selected = currentModel == model,
                    onClick = { onSelectModel(model) }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReasoningPickerSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectReasoningEffort: (String?) -> Unit
) {
    val selectedEffort = state.nextTurnOverrides.reasoningEffort
    val effectiveEffort = state.nextTurnEffectiveCodexConfig?.reasoningEffort
        ?: state.reasoningEffort
        ?: state.capabilities?.defaultReasoningEffort
    val options = state.capabilities?.reasoningEffortLevels.orEmpty().ifEmpty {
        listOf("low", "medium", "high")
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor
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

            ModelPickerRow(
                label = stringResource(R.string.codex_native_reasoning_picker_default),
                selected = selectedEffort.isNullOrBlank(),
                secondary = effectiveEffort
                    ?.takeIf { it.isNotBlank() }
                    ?.let { reasoningEffortLabel(it) },
                onClick = { onSelectReasoningEffort(null) }
            )

            options.forEach { effort ->
                ModelPickerRow(
                    label = reasoningEffortLabel(effort),
                    selected = selectedEffort == effort,
                    onClick = { onSelectReasoningEffort(effort) }
                )
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
    val selectedSandbox = resolvedConcreteSandboxSelection(state)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor
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
                text = stringResource(R.string.codex_native_sandbox_picker_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.codex_native_sandbox_picker_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            ModelPickerRow(
                label = stringResource(R.string.codex_native_sandbox_workspace_write),
                selected = selectedSandbox == "workspace-write",
                onClick = { onSelectSandboxMode("workspace-write") }
            )
            ModelPickerRow(
                label = stringResource(R.string.codex_native_sandbox_read_only),
                selected = selectedSandbox == "read-only",
                onClick = { onSelectSandboxMode("read-only") }
            )
            ModelPickerRow(
                label = stringResource(R.string.codex_native_sandbox_full_access),
                selected = selectedSandbox == "danger-full-access",
                onClick = { onSelectSandboxMode("danger-full-access") }
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ModelPickerRow(
    label: String,
    selected: Boolean,
    secondary: String? = null,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .clickable(onClick = onClick),
        color = if (selected) AccentBlue.copy(alpha = 0.14f) else SurfaceRaised,
        shape = RoundedCornerShape(14.dp),
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

private fun mentionVisualTransformation(mentions: List<FileMention>): VisualTransformation {
    return VisualTransformation { source ->
        TransformedText(
            buildMentionAnnotatedString(
                text = source.text,
                mentions = mentions,
                textColor = TextPrimary
            ),
            OffsetMapping.Identity
        )
    }
}

private fun buildMentionAnnotatedString(
    text: String,
    mentions: List<FileMention>,
    textColor: Color
): AnnotatedString {
    val mentionTokens = mentions.map { "@${displayFileMention(it)}" }.distinct()
    return buildAnnotatedString {
        append(text)
        addStyle(SpanStyle(color = textColor), 0, text.length)
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

@Composable
private fun sandboxModeLabel(value: String?): String = when (value?.trim()) {
    "workspace-write" -> stringResource(R.string.codex_native_sandbox_workspace_write)
    "read-only" -> stringResource(R.string.codex_native_sandbox_read_only)
    "danger-full-access" -> stringResource(R.string.codex_native_sandbox_full_access)
    else -> stringResource(R.string.codex_native_sandbox_picker_default)
}

@Composable
private fun sandboxFooterLabel(value: String?): String = when (value?.trim()) {
    "workspace-write" -> stringResource(R.string.codex_native_sandbox_workspace_write_short)
    "read-only" -> stringResource(R.string.codex_native_sandbox_read_only_short)
    "danger-full-access" -> stringResource(R.string.codex_native_sandbox_full_access_short)
    else -> stringResource(R.string.codex_native_sandbox_picker_default_short)
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
        border = SuccessColor.copy(alpha = 0.2f),
        labelColor = SuccessColor,
        textColor = TextPrimary
    )
    ChatMessage.Role.ASSISTANT -> BubbleSpec(
        background = AssistantBg,
        border = SurfaceBorder.copy(alpha = 0.5f),
        labelColor = TextSecondary,
        textColor = TextPrimary
    )
    ChatMessage.Role.SYSTEM -> BubbleSpec(
        background = SystemBg,
        border = SystemColor.copy(alpha = 0.2f),
        labelColor = SystemColor,
        textColor = TextPrimary
    )
    ChatMessage.Role.TOOL -> BubbleSpec(
        background = ToolBg,
        border = AccentBlue.copy(alpha = 0.4f),
        labelColor = AccentBlue,
        textColor = TextSecondary
    )
    ChatMessage.Role.ERROR -> BubbleSpec(
        background = ErrorBg,
        border = ErrorColor.copy(alpha = 0.25f),
        labelColor = ErrorColor,
        textColor = TextPrimary
    )
}
