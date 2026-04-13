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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
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
    onAddImageUrl: (String) -> Unit,
    onRemovePendingImageAttachment: (String) -> Unit,
    onInjectDebugServerRequest: (DebugServerRequestPreset) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val isStreaming = state.messages.lastOrNull()?.streaming == true
    var debugInjectorVisible by remember { mutableStateOf(false) }
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

    LaunchedEffect(
        state.messages.size,
        state.messages.lastOrNull()?.content,
        state.messages.lastOrNull()?.streaming
    ) {
        if (state.messages.isNotEmpty()) {
            listState.scrollToItem(state.messages.lastIndex)
        }
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
                        verticalArrangement = if (state.messages.isEmpty()) {
                            Arrangement.Bottom
                        } else {
                            Arrangement.spacedBy(8.dp)
                        },
                        contentPadding = PaddingValues(vertical = 10.dp)
                    ) {
                        if (state.messages.isEmpty()) {
                            item {
                                EmptyState()
                            }
                        }
                        items(state.messages, key = { it.id }) { message ->
                            MessageBubble(message = message)
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
                        imageInputEnabled = state.capabilities?.imageInputSupported == true,
                        maxImageSize = state.capabilities?.maxImageSize ?: 0L,
                        pendingImageAttachments = state.pendingImageAttachments,
                        onSend = { text ->
                            onSendMessage(text)
                            coroutineScope.launch {
                                if (state.messages.isNotEmpty()) {
                                    listState.scrollToItem(state.messages.size)
                                }
                            }
                        },
                        onInterrupt = onInterrupt,
                        onShowSlashMenu = onShowSlashMenu,
                        onHideSlashMenu = onHideSlashMenu,
                        onSlashMenuQueryChanged = onSlashMenuQueryChanged,
                        onComposerTextChanged = onComposerTextChanged,
                        onHideFileMentionMenu = onHideFileMentionMenu,
                        onSelectFileMention = onSelectFileMention,
                        onRemoveFileMention = onRemoveFileMention,
                        onPickLocalImage = onPickLocalImage,
                        onAddImageUrl = onAddImageUrl,
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
                        onExecuteConfirmedPlan = onExecuteConfirmedPlan,
                        onContinuePlanWorkflow = onContinuePlanWorkflow,
                        onCancelPlanWorkflow = onCancelPlanWorkflow
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
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CodexHeader(
    state: CodexUiState,
    isStreaming: Boolean,
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
        state.currentThreadTitle.takeIf { it.isNotBlank() }?.let(::add)
        state.interactionState?.activeSkill?.takeIf { it.isNotBlank() }?.let {
            add(stringResource(R.string.codex_native_active_skill_label, it))
        }
        state.usagePanel.tokenUsageSummary.takeIf { it.isNotBlank() }?.let(::add)
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
                    .heightIn(min = 60.dp)
                    .padding(start = 8.dp, end = 8.dp, top = 12.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                GlobalActionChip(
                    iconRes = R.drawable.ic_sessions_24,
                    contentDescription = stringResource(R.string.codex_native_header_sessions),
                    onClick = onOpenSessions,
                    boxSize = 32.dp,
                    iconSize = 16.dp
                )
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .then(headerInteractionModifier),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.codex_native_status_prefix, statusLabel),
                        color = statusColor,
                        fontSize = 11.sp,
                        lineHeight = 14.sp
                    )
                    state.cwd?.takeIf { it.isNotBlank() }?.let { cwd ->
                        val displayCwd = formatHeaderCwdForDisplay(cwd)
                        Spacer(modifier = Modifier.width(10.dp))
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
                Spacer(modifier = Modifier.width(12.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isStreaming || state.status.equals("running", ignoreCase = true)) {
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
                        iconRes = R.drawable.ic_workspace_24,
                        contentDescription = stringResource(R.string.codex_native_header_docs),
                        onClick = onOpenDocs,
                        enabled = docsEnabled,
                        boxSize = 32.dp,
                        iconSize = 16.dp
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
    AlertDialog(
        onDismissRequest = {},
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = approvalTitle(request),
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 20.sp
                )
                Text(
                    text = if (submitting) {
                        stringResource(R.string.codex_native_approval_status_submitting)
                    } else {
                        stringResource(R.string.codex_native_approval_status_pending)
                    },
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 16.sp
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = approvalSummary(request),
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
                request.command?.takeIf { it.isNotBlank() }?.let { command ->
                    Surface(
                        color = SurfaceRaised,
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(1.dp, SurfaceBorder)
                    ) {
                        Text(
                            text = command,
                            color = TextPrimary,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                        )
                    }
                }
                if (submitting) {
                    Text(
                        text = stringResource(R.string.codex_native_approval_status_submitting),
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = onApprove,
                enabled = !submitting
            ) {
                Text(stringResource(R.string.codex_native_approval_approve))
            }
        },
        dismissButton = {
            TextButton(
                onClick = onReject,
                enabled = !submitting
            ) {
                Text(stringResource(R.string.codex_native_approval_reject))
            }
        },
        containerColor = SurfaceColor,
        shape = RoundedCornerShape(6.dp),
        titleContentColor = TextPrimary,
        textContentColor = TextPrimary
    )
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

    AlertDialog(
        onDismissRequest = {},
        title = {
            Text(
                text = approvalTitle(request),
                color = TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 20.sp
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = approvalSummary(request),
                    color = TextSecondary,
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
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
            }
        },
        confirmButton = {
            if (supportsAnswers) {
                TextButton(
                    onClick = { onSubmit(selectedAnswers.toMap()) },
                    enabled = submitEnabled
                ) {
                    Text(stringResource(R.string.codex_native_approval_submit))
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onReject,
                enabled = !submitting
            ) {
                Text(stringResource(R.string.codex_native_approval_cancel))
            }
        },
        containerColor = SurfaceColor,
        shape = RoundedCornerShape(6.dp),
        titleContentColor = TextPrimary,
        textContentColor = TextPrimary
    )
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
        color = if (selected) AccentBlue.copy(alpha = 0.18f) else SurfaceRaised,
        border = BorderStroke(
            1.dp,
            when {
                selected -> AccentBlue
                recommended -> SystemColor.copy(alpha = 0.55f)
                else -> SurfaceBorder
            }
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Text(
            text = text,
            color = when {
                selected -> SuccessColor
                recommended -> Color(0xFFE0C88A)
                else -> TextPrimary
            },
            fontSize = 12.sp,
            lineHeight = 16.sp,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
        )
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Text(
            text = stringResource(R.string.codex_native_empty_hint),
            color = TextMuted.copy(alpha = 0.75f),
            fontSize = 13.sp,
            lineHeight = 18.sp
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
    val spec = remember(message.role) { bubbleSpec(message.role) }
    val label = roleLabel(message)

    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = label,
            color = spec.labelColor,
            fontSize = 10.sp,
            modifier = Modifier.padding(start = 4.dp, end = 4.dp, top = 1.dp, bottom = 2.dp)
        )

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(4.dp),
            color = spec.background,
            border = BorderStroke(1.dp, spec.border)
        ) {
            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
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
                        text = message.content,
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
                modifier = Modifier.padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
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

@Composable
private fun PlanWorkflowCard(
    state: CodexUiState,
    onExecuteConfirmedPlan: () -> Unit,
    onContinuePlanWorkflow: () -> Unit,
    onCancelPlanWorkflow: () -> Unit
) {
    val phase = state.planWorkflow.phase
    if (phase == "idle") {
        return
    }

    val titleRes = when (phase) {
        "awaiting_user_input" -> R.string.codex_native_plan_workflow_title_awaiting
        "plan_ready_for_confirmation" -> R.string.codex_native_plan_workflow_title_ready
        "executing_confirmed_plan" -> R.string.codex_native_plan_workflow_title_executing
        else -> R.string.codex_native_plan_workflow_title_planning
    }
    val summaryRes = when (phase) {
        "awaiting_user_input" -> R.string.codex_native_plan_workflow_summary_awaiting
        "plan_ready_for_confirmation" -> R.string.codex_native_plan_workflow_summary_ready
        "executing_confirmed_plan" -> R.string.codex_native_plan_workflow_summary_executing
        else -> R.string.codex_native_plan_workflow_summary_planning
    }
    val bodyText = state.planWorkflow.confirmedPlanText.ifBlank {
        state.planWorkflow.latestPlanText
    }.ifBlank {
        stringResource(R.string.codex_native_plan_workflow_waiting)
    }
    val showReadyActions = phase == "plan_ready_for_confirmation"
    val showCancel = phase == "planning" || phase == "awaiting_user_input" || phase == "plan_ready_for_confirmation"

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        color = when (phase) {
            "awaiting_user_input" -> SystemBg
            else -> UserBg
        },
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(
            1.dp,
            when (phase) {
                "awaiting_user_input" -> SystemColor.copy(alpha = 0.3f)
                else -> SuccessColor.copy(alpha = 0.3f)
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Text(
                text = stringResource(titleRes),
                color = TextPrimary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(summaryRes),
                color = TextSecondary,
                fontSize = 11.sp,
                lineHeight = 16.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = bodyText,
                color = TextPrimary,
                fontSize = 12.sp,
                lineHeight = 18.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 220.dp)
                    .verticalScroll(rememberScrollState())
            )
            if (showReadyActions || showCancel) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (showReadyActions) {
                        FilledTonalButton(onClick = onExecuteConfirmedPlan) {
                            Text(stringResource(R.string.codex_native_plan_workflow_execute))
                        }
                        TextButton(onClick = onContinuePlanWorkflow) {
                            Text(stringResource(R.string.codex_native_plan_workflow_continue))
                        }
                    }
                    if (showCancel) {
                        TextButton(onClick = onCancelPlanWorkflow) {
                            Text(stringResource(R.string.codex_native_plan_workflow_cancel))
                        }
                    }
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
    val content: String
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
            state.runtimePanel.diff.ifBlank { stringResource(R.string.codex_native_runtime_waiting_diff) }
        ),
        RuntimePanelSection(
            "plan",
            stringResource(R.string.codex_native_runtime_plan),
            planContent.ifBlank { stringResource(R.string.codex_native_runtime_waiting_plan) }
        ),
        RuntimePanelSection(
            "reasoning",
            stringResource(R.string.codex_native_runtime_reasoning),
            state.runtimePanel.reasoning.ifBlank { stringResource(R.string.codex_native_runtime_waiting_reasoning) }
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
                .clickable(enabled = onToggle != null) { onToggle?.invoke() }
                .background(if (expanded) SuccessColor.copy(alpha = 0.03f) else BgColor)
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
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
            if (expanded) {
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
                                            .heightIn(max = 320.dp),
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
    val contextUsage = state.usagePanel.contextUsage
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImageInputSheet(
    maxImageSize: Long,
    imageUrlDraft: String,
    onImageUrlChanged: (String) -> Unit,
    onDismiss: () -> Unit,
    onPickLocalImage: () -> Unit,
    onConfirmUrl: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(
                text = stringResource(R.string.codex_native_image_sheet_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.codex_native_image_sheet_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            if (maxImageSize > 0L) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = stringResource(
                        R.string.codex_native_image_size_limit,
                        formatFileSize(maxImageSize)
                    ),
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            FilledTonalButton(onClick = onPickLocalImage) {
                Text(stringResource(R.string.codex_native_image_pick_local))
            }
            Spacer(modifier = Modifier.height(14.dp))
            TextField(
                value = imageUrlDraft,
                onValueChange = onImageUrlChanged,
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        text = stringResource(R.string.codex_native_image_url_placeholder),
                        color = TextMuted
                    )
                },
                shape = RoundedCornerShape(16.dp),
                colors = TextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    disabledTextColor = TextMuted,
                    focusedContainerColor = SurfaceRaised,
                    unfocusedContainerColor = SurfaceRaised,
                    disabledContainerColor = SurfaceRaised,
                    cursorColor = AccentBlue,
                    focusedIndicatorColor = AccentBlue,
                    unfocusedIndicatorColor = SurfaceBorder,
                    disabledIndicatorColor = SurfaceBorder
                ),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FilledTonalButton(
                    onClick = onConfirmUrl,
                    enabled = imageUrlDraft.isNotBlank()
                ) {
                    Text(stringResource(R.string.codex_native_image_add_url))
                }
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.codex_native_dismiss))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
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
                            .heightIn(max = 480.dp),
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
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = CodexBottomBarTokens.barPadding, end = CodexBottomBarTokens.barPadding, top = 2.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(CodexBottomBarTokens.rowGap),
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

@Composable
private fun SecondaryNavButton(
    text: String,
    active: Boolean,
    onClick: () -> Unit
) {
    val style = if (active) {
        CodexActionStyle(
            containerColor = AccentBlue.copy(alpha = 0.18f),
            contentColor = TextPrimary,
            borderColor = AccentBlue.copy(alpha = 0.55f)
        )
    } else {
        CodexActionStyle(
            containerColor = SurfaceRaised.copy(alpha = 0.94f),
            contentColor = TextSecondary,
            borderColor = SurfaceBorder.copy(alpha = 0.9f)
        )
    }
    Surface(
        color = style.containerColor,
        shape = RoundedCornerShape(CodexBottomBarTokens.chipRadius),
        border = BorderStroke(1.dp, style.borderColor),
        modifier = Modifier
            .heightIn(min = CodexBottomBarTokens.minTouch)
            .clickable(onClick = onClick)
    ) {
        Text(
            text = text,
            color = style.contentColor,
            fontSize = CodexBottomBarTokens.labelSize,
            fontWeight = FontWeight.Medium,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp)
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
    onShowToolsPanel: () -> Unit,
    onHideToolsPanel: () -> Unit,
    onShowUsagePanel: () -> Unit,
    onShowRuntimePanel: () -> Unit,
    onHideRuntimePanel: () -> Unit,
    onShowThreadHistory: () -> Unit,
    onHideThreadHistory: () -> Unit,
    onPickLocalImage: () -> Unit,
    onShowSlashMenu: () -> Unit
) {
    val effectiveConfig = state.nextTurnEffectiveCodexConfig
    val activeModel = effectiveConfig?.model ?: state.nextTurnOverrides.model ?: state.model
    val activeReasoning = effectiveConfig?.reasoningEffort
        ?: state.nextTurnOverrides.reasoningEffort
        ?: state.reasoningEffort
        ?: state.capabilities?.defaultReasoningEffort
    val activeSandboxMode = effectiveConfig?.sandboxMode ?: state.nextTurnOverrides.sandbox

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = CodexBottomBarTokens.barPadding, end = CodexBottomBarTokens.barPadding, bottom = CodexBottomBarTokens.barPadding),
        verticalArrangement = Arrangement.spacedBy(CodexBottomBarTokens.rowGap)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(CodexBottomBarTokens.rowGap),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FooterActionButton(
                onClick = onPickLocalImage,
                enabled = imageInputEnabled,
                label = stringResource(R.string.codex_native_image_button)
            )
            FooterActionButton(
                onClick = onShowSlashMenu,
                label = stringResource(R.string.codex_native_commands_button)
            )
            FooterPlanIndicatorButton(
                active = state.planMode == true,
                onClick = onTogglePlanMode
            )
            ContextUsageWidget(
                state = state,
                onClick = onShowUsagePanel
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(CodexBottomBarTokens.rowGap),
            verticalAlignment = Alignment.CenterVertically
        )
        {
            QuickControlButton(
                label = stringResource(R.string.codex_native_model_label),
                text = activeModel ?: stringResource(R.string.codex_native_quick_default),
                maxTextWidth = 104.dp,
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
                maxTextWidth = 104.dp,
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
                    text = sandboxFooterLabel(activeSandboxMode),
                    maxTextWidth = 112.dp,
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
}

@Composable
private fun FooterPlanIndicatorButton(
    active: Boolean,
    onClick: () -> Unit
) {
    FooterActionButton(
        onClick = onClick,
        label = stringResource(R.string.codex_native_plan_mode_chip),
        active = active
    )
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
    val style = if (expanded) {
        CodexActionStyle(
            containerColor = AccentBlue.copy(alpha = 0.14f),
            contentColor = TextPrimary,
            borderColor = AccentBlue.copy(alpha = 0.5f)
        )
    } else {
        CodexActionStyle(
            containerColor = SurfaceRaised.copy(alpha = 0.94f),
            contentColor = TextPrimary,
            borderColor = SurfaceBorder.copy(alpha = 0.85f)
        )
    }
    Box {
        Surface(
            modifier = Modifier
                .heightIn(min = CodexBottomBarTokens.quickControlMinHeight)
                .clickable(onClick = onClick),
            color = style.containerColor,
            shape = RoundedCornerShape(CodexBottomBarTokens.chipRadius),
            border = BorderStroke(1.dp, style.borderColor)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = label,
                        color = TextMuted,
                        fontSize = 10.sp,
                        lineHeight = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = text,
                        color = style.contentColor,
                        fontSize = CodexBottomBarTokens.labelSize,
                        lineHeight = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = if (maxTextWidth != Dp.Unspecified) {
                            Modifier.widthIn(max = maxTextWidth)
                        } else {
                            Modifier
                        }
                    )
                }
                Text(
                    text = if (expanded) "▲" else "▼",
                    color = if (expanded) AccentBlue else TextSecondary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
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
    enabled: Boolean = true,
    active: Boolean = false
) {
    val style = when {
        !enabled -> CodexActionStyle(
            containerColor = SurfaceRaised.copy(alpha = 0.45f),
            contentColor = TextMuted.copy(alpha = 0.55f),
            borderColor = SurfaceBorder.copy(alpha = 0.35f)
        )
        active -> CodexActionStyle(
            containerColor = SuccessColor.copy(alpha = 0.18f),
            contentColor = TextPrimary,
            borderColor = SuccessColor.copy(alpha = 0.5f)
        )
        else -> CodexActionStyle(
            containerColor = SurfaceRaised.copy(alpha = 0.94f),
            contentColor = TextSecondary,
            borderColor = SurfaceBorder.copy(alpha = 0.85f)
        )
    }
    Surface(
        color = style.containerColor,
        shape = RoundedCornerShape(CodexBottomBarTokens.chipRadius),
        border = BorderStroke(1.dp, style.borderColor),
        modifier = Modifier
            .heightIn(min = CodexBottomBarTokens.minTouch)
            .clickable(enabled = enabled, onClick = onClick)
    ) {
        Text(
            text = label,
            color = style.contentColor,
            fontSize = CodexBottomBarTokens.labelSize,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
        )
    }
}

@Composable
private fun ContextUsageWidget(
    state: CodexUiState,
    onClick: () -> Unit
) {
    val usedPercent = state.usagePanel.contextUsage?.usedPercent?.coerceIn(0, 100)
    Surface(
        color = SurfaceRaised.copy(alpha = 0.98f),
        shape = RoundedCornerShape(CodexBottomBarTokens.chipRadius),
        border = BorderStroke(
            1.dp,
            if (usedPercent != null && usedPercent >= 80) WarningColor.copy(alpha = 0.45f) else SurfaceBorder.copy(alpha = 0.85f)
        ),
        modifier = Modifier
            .heightIn(min = CodexBottomBarTokens.minTouch)
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .widthIn(min = CodexBottomBarTokens.usageMinWidth)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    progress = { (usedPercent ?: 0) / 100f },
                    modifier = Modifier.size(28.dp),
                    color = if (usedPercent != null && usedPercent >= 80) WarningColor else ContextBlue,
                    trackColor = Color.White.copy(alpha = 0.14f),
                    strokeWidth = 3.dp
                )
                Text(
                    text = usedPercent?.let { "$it%" } ?: "--",
                    color = TextPrimary,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = stringResource(R.string.codex_native_usage_chip),
                    color = TextMuted,
                    fontSize = 10.sp,
                    lineHeight = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = if (usedPercent != null) {
                        stringResource(R.string.codex_native_context_used_summary, usedPercent, 100 - usedPercent)
                    } else {
                        "--"
                    },
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
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
    imageInputEnabled: Boolean,
    maxImageSize: Long,
    pendingImageAttachments: List<CodexPendingImageAttachment>,
    onSend: (String) -> Unit,
    onInterrupt: () -> Unit,
    onShowSlashMenu: (String) -> Unit,
    onHideSlashMenu: () -> Unit,
    onSlashMenuQueryChanged: (String) -> Unit,
    onComposerTextChanged: (String) -> Unit,
    onHideFileMentionMenu: () -> Unit,
    onSelectFileMention: (FileMention) -> Unit,
    onRemoveFileMention: (String) -> Unit,
    onPickLocalImage: () -> Unit,
    onAddImageUrl: (String) -> Unit,
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
    onExecuteConfirmedPlan: () -> Unit,
    onContinuePlanWorkflow: () -> Unit,
    onCancelPlanWorkflow: () -> Unit
) {
    var textFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    var imageSheetVisible by remember { mutableStateOf(false) }
    var imageUrlDraft by remember { mutableStateOf("") }
    val composerFocusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

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

    fun submit(): Boolean {
        val submittedText = textFieldValue.text.trim()
        if (
            !enabled ||
            isStreaming ||
            (submittedText.isBlank() && pendingMentions.isEmpty() && pendingImageAttachments.isEmpty())
        ) {
            return false
        }
        onSend(submittedText)
        textFieldValue = TextFieldValue("")
        imageUrlDraft = ""
        onHideSlashMenu()
        onHideFileMentionMenu()
        onComposerTextChanged("")
        return true
    }

    val showComposerNav = state.capabilities?.historyList == true ||
        state.capabilities?.diffPlanReasoning == true ||
        hasNoticesPanelContent(state) ||
        state.capabilities?.skillsList == true ||
        state.capabilities?.compact == true

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = BgColor.copy(alpha = 0.98f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
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

            if (state.planWorkflow.phase != "idle") {
                PlanWorkflowCard(
                    state = state,
                    onExecuteConfirmedPlan = onExecuteConfirmedPlan,
                    onContinuePlanWorkflow = onContinuePlanWorkflow,
                    onCancelPlanWorkflow = onCancelPlanWorkflow
                )
            }

            if (mentionMenuVisible) {
                FileMentionMenu(
                    loading = mentionLoading,
                    results = mentionResults,
                    onSelect = { file ->
                        onSelectFileMention(file)
                        val updatedValue = replaceActiveMentionToken(textFieldValue, file)
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

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = CodexBottomBarTokens.barPadding, vertical = 6.dp),
                color = SurfaceColor.copy(alpha = 0.98f),
                shape = RoundedCornerShape(CodexBottomBarTokens.composerRadius),
                border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.9f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(
                                min = CodexBottomBarTokens.composerMinHeight,
                                max = CodexBottomBarTokens.composerMaxHeight
                            )
                            .clip(RoundedCornerShape(16.dp))
                            .background(SurfaceRaised.copy(alpha = 0.95f))
                            .border(
                                width = 1.dp,
                                color = SurfaceBorder.copy(alpha = 0.7f),
                                shape = RoundedCornerShape(16.dp)
                            )
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
                                .padding(horizontal = 16.dp, vertical = 14.dp)
                                .focusRequester(composerFocusRequester),
                            enabled = enabled && !isStreaming,
                            textStyle = MaterialTheme.typography.bodyMedium.copy(
                                color = TextPrimary,
                                fontSize = CodexBottomBarTokens.bodySize,
                                lineHeight = 22.sp
                            ),
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
                                fontSize = CodexBottomBarTokens.bodySize,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(CodexBottomBarTokens.rowGap))

                    if (isStreaming) {
                        Surface(
                            modifier = Modifier.size(CodexBottomBarTokens.actionButtonSize),
                            color = ErrorColor.copy(alpha = 0.16f),
                            shape = CircleShape,
                            border = BorderStroke(1.dp, ErrorColor.copy(alpha = 0.45f))
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clickable(onClick = onInterrupt),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "■",
                                    color = ErrorColor,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    } else {
                        val canSubmit = enabled && (
                            textFieldValue.text.isNotBlank() ||
                                pendingMentions.isNotEmpty() ||
                                pendingImageAttachments.isNotEmpty()
                            )
                        Surface(
                            modifier = Modifier.size(CodexBottomBarTokens.actionButtonSize),
                            color = if (canSubmit) AccentBlue else SurfaceRaised.copy(alpha = 0.72f),
                            shape = CircleShape,
                            border = BorderStroke(
                                1.dp,
                                if (canSubmit) AccentBlue.copy(alpha = 0.8f) else SurfaceBorder.copy(alpha = 0.65f)
                            )
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clickable(enabled = canSubmit, onClick = { submit() }),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "↑",
                                    color = if (canSubmit) Color.White else TextMuted,
                                    fontSize = 22.sp,
                                    lineHeight = 22.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            FooterControls(
                state = state,
                imageInputEnabled = imageInputEnabled,
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
                onShowToolsPanel = onShowToolsPanel,
                onHideToolsPanel = onHideToolsPanel,
                onShowUsagePanel = onShowUsagePanel,
                onShowRuntimePanel = onShowRuntimePanel,
                onHideRuntimePanel = onHideRuntimePanel,
                onShowThreadHistory = onShowThreadHistory,
                onHideThreadHistory = onHideThreadHistory,
                onPickLocalImage = { imageSheetVisible = true },
                onShowSlashMenu = { onShowSlashMenu("/") }
            )
        }
    }

    if (imageSheetVisible) {
        ImageInputSheet(
            maxImageSize = maxImageSize,
            imageUrlDraft = imageUrlDraft,
            onImageUrlChanged = { imageUrlDraft = it },
            onDismiss = { imageSheetVisible = false },
            onPickLocalImage = {
                imageSheetVisible = false
                onPickLocalImage()
            },
            onConfirmUrl = {
                onAddImageUrl(imageUrlDraft)
                imageUrlDraft = ""
                imageSheetVisible = false
            }
        )
    }
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
    val currentModel = state.nextTurnEffectiveCodexConfig?.model ?: state.nextTurnOverrides.model ?: state.model
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
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

            ModelPickerRow(
                label = stringResource(R.string.codex_native_model_picker_default),
                selected = state.nextTurnOverrides.model.isNullOrBlank(),
                secondary = state.serverNextTurnConfigBase?.model ?: state.model,
                onClick = { onSelectModel(null) }
            )

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
    val selectedSandbox = state.nextTurnOverrides.sandbox
    val defaultSandbox = state.serverNextTurnConfigBase?.sandboxMode
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
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
                label = stringResource(R.string.codex_native_sandbox_picker_default),
                selected = selectedSandbox.isNullOrBlank(),
                secondary = defaultSandbox?.let { sandboxModeLabel(it) },
                onClick = { onSelectSandboxMode(null) }
            )
            ModelPickerRow(
                label = stringResource(R.string.codex_native_sandbox_workspace_write),
                selected = selectedSandbox == "workspace-write",
                onClick = { onSelectSandboxMode("workspace-write") }
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

private fun removeActiveMentionToken(text: String): String {
    val mention = CodexSlashRegistry.parseFileMentionInput(text) ?: return text
    val updated = text.removeRange(mention.tokenStart, mention.tokenEnd).trimEnd()
    return if (updated.isNotBlank() && !updated.last().isWhitespace()) "$updated " else updated
}

private fun replaceActiveMentionToken(text: String, file: FileMention): String {
    val mention = CodexSlashRegistry.parseFileMentionInput(text) ?: return text
    val prefix = text.substring(0, mention.tokenStart)
    val suffix = text.substring(mention.tokenEnd).trimStart()
    val inlineMention = "@${displayFileMention(file)}"
    return buildString {
        append(prefix)
        append(inlineMention)
        append(' ')
        append(suffix)
    }
}

private fun replaceActiveMentionToken(value: TextFieldValue, file: FileMention): TextFieldValue {
    val mention = CodexSlashRegistry.parseFileMentionInput(value.text) ?: return value
    val updatedText = replaceActiveMentionToken(value.text, file)
    val cursorPosition = mention.tokenStart + displayFileMention(file).length + 2
    return TextFieldValue(
        text = updatedText,
        selection = TextRange(cursorPosition)
    )
}

private fun composerContainsMention(text: String, file: FileMention): Boolean {
    val inlinePathToken = "@${displayFileMention(file)}"
    val inlineLabelToken = "@${file.label}"
    return text.contains(inlinePathToken) || text.contains(inlineLabelToken)
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

private fun isCommittedMentionBoundary(text: String, start: Int, end: Int): Boolean {
    val validStart = start == 0 || text[start - 1].isWhitespace()
    val validEnd = end == text.length ||
        text[end].isWhitespace() ||
        text[end] in charArrayOf(',', '.', ';', ':', '，', '。', '、', '；', '：', ')', ']', '}')
    return validStart && validEnd
}

private fun displayFileMention(file: FileMention): String {
    val folder = file.relativePathWithoutFileName.trim().trim('.', '\\', '/')
    return if (folder.isBlank()) {
        file.label
    } else {
        "$folder/${file.label}"
    }
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
    "danger-full-access" -> stringResource(R.string.codex_native_sandbox_full_access)
    else -> stringResource(R.string.codex_native_sandbox_label)
}

@Composable
private fun sandboxFooterLabel(value: String?): String = when (value?.trim()) {
    "workspace-write" -> stringResource(R.string.codex_native_sandbox_workspace_write_short)
    "danger-full-access" -> stringResource(R.string.codex_native_sandbox_full_access_short)
    else -> stringResource(R.string.codex_native_sandbox_label)
}

private fun dropdownSelectionLabel(label: String, selected: Boolean): String =
    if (selected) "✓ $label" else label

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
