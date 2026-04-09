package com.termlink.app.codex.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import java.text.DateFormat
import java.util.Date

private val BgColor = Color(0xFF0E1117)
private val SurfaceColor = Color(0xFF171B22)
private val SurfaceRaised = Color(0xFF1B202A)
private val SurfaceBorder = Color(0xFF2A3140)
private val AccentBlue = Color(0xFF4D74FF)
private val TextPrimary = Color(0xFFF2F5FB)
private val TextSecondary = Color(0xFFA9B4C7)
private val TextMuted = Color(0xFF7D889C)
private val SuccessColor = Color(0xFF4EDEA3)
private val RunningColor = Color(0xFF3FB950)
private val WarningColor = Color(0xFFD29922)
private val SystemColor = Color(0xFFA68D6A)
private val ErrorColor = Color(0xFFFF6361)
private val UserBg = Color(0xFF13251E)
private val AssistantBg = Color(0xFF171B22)
private val SystemBg = Color(0xFF231E18)
private val ToolBg = Color(0xFF131924)
private val ErrorBg = Color(0xFF2C1717)

@Composable
fun CodexScreen(
    state: CodexUiState,
    onSendMessage: (String) -> Unit,
    onInterrupt: () -> Unit,
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
    onOpenWebFallback: () -> Unit,
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
                onInterrupt = onInterrupt
            )

            state.errorMessage?.let { message ->
                ErrorBanner(
                    message = message,
                    onRetry = onRetry,
                    onDismiss = onDismissError
                )
            }

            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                if (state.planWorkflow.phase != "idle") {
                    item(key = "plan-workflow-card") {
                        PlanWorkflowCard(
                            state = state,
                            onExecuteConfirmedPlan = onExecuteConfirmedPlan,
                            onContinuePlanWorkflow = onContinuePlanWorkflow,
                            onCancelPlanWorkflow = onCancelPlanWorkflow
                        )
                    }
                }
                if (state.messages.isEmpty()) {
                    item {
                        EmptyState()
                    }
                }
                items(state.messages, key = { it.id }) { message ->
                    MessageBubble(message = message)
                }
            }

            FooterControls(
                state = state,
                onShowModelPicker = onShowModelPicker,
                onShowReasoningPicker = onShowReasoningPicker,
                onShowSandboxPicker = onShowSandboxPicker,
                onTogglePlanMode = onTogglePlanMode,
                onShowToolsPanel = onShowToolsPanel,
                onShowUsagePanel = onShowUsagePanel,
                onShowRuntimePanel = onShowRuntimePanel,
                onShowThreadHistory = onShowThreadHistory,
                onShowDebugInjector = { debugInjectorVisible = true },
                onNewThread = onNewThread
            )

            InputComposer(
                enabled = state.connectionState == ConnectionState.CONNECTED,
                isStreaming = isStreaming,
                planMode = state.planMode == true,
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
                onRemovePendingImageAttachment = onRemovePendingImageAttachment
            )
        }
    }

    if (state.modelPickerVisible) {
        ModelPickerSheet(
            state = state,
            onDismiss = onHideModelPicker,
            onSelectModel = onSelectModel
        )
    }

    if (state.reasoningPickerVisible) {
        ReasoningPickerSheet(
            state = state,
            onDismiss = onHideReasoningPicker,
            onSelectReasoningEffort = onSelectReasoningEffort
        )
    }

    if (state.sandboxPickerVisible) {
        SandboxPickerSheet(
            state = state,
            onDismiss = onHideSandboxPicker,
            onSelectSandboxMode = onSelectSandboxMode
        )
    }

    if (state.threadHistorySheetVisible) {
        ThreadHistorySheet(
            state = state,
            onDismiss = onHideThreadHistory,
            onRefresh = onRefreshThreadHistory,
            onResumeThread = onResumeThread,
            onForkThread = onForkThread,
            onToggleThreadArchive = onToggleThreadArchive,
            onStartRename = onStartThreadRename
        )
    }

    if (state.runtimePanel.visible) {
        RuntimePanelSheet(
            state = state,
            onDismiss = onHideRuntimePanel
        )
    }

    if (state.toolsPanel.visible) {
        ToolsPanelSheet(
            state = state,
            onDismiss = onHideToolsPanel,
            onSelectSkill = onSelectSkill,
            onClearActiveSkill = onClearActiveSkill,
            onTogglePlanMode = onTogglePlanMode,
            onRequestCompactCurrentThread = onRequestCompactCurrentThread,
            onOpenWebFallback = onOpenWebFallback
        )
    }

    if (state.usagePanel.visible) {
        UsagePanelSheet(
            state = state,
            onDismiss = onHideUsagePanel
        )
    }

    if (state.threadRenameTargetId.isNotBlank()) {
        ThreadRenameDialog(
            state = state,
            onValueChange = onUpdateThreadRenameDraft,
            onDismiss = onCancelThreadRename,
            onSubmit = onSubmitThreadRename
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

@Composable
private fun CodexHeader(
    state: CodexUiState,
    isStreaming: Boolean,
    onInterrupt: () -> Unit
) {
    val statusText = when {
        state.connectionState == ConnectionState.CONNECTING && state.sessionId.isBlank() ->
            stringResource(R.string.codex_native_creating_session)
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

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceColor,
        tonalElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "\u2B22 ${stringResource(R.string.codex_brand_title)} ${stringResource(R.string.codex_brand_version)}",
                    color = TextPrimary,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                if (isStreaming || state.status.equals("running", ignoreCase = true)) {
                    FilledTonalButton(
                        onClick = onInterrupt,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = ErrorColor.copy(alpha = 0.18f),
                            contentColor = ErrorColor
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(text = stringResource(R.string.codex_native_stop), fontSize = 13.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PulsingDot(
                    color = statusColor,
                    animated = state.connectionState == ConnectionState.CONNECTING ||
                        state.connectionState == ConnectionState.RECONNECTING ||
                        isStreaming ||
                        state.status.equals("running", ignoreCase = true)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = statusText,
                    color = TextPrimary,
                    fontSize = 14.sp
                )
            }

            state.cwd?.takeIf { it.isNotBlank() }?.let { cwd ->
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = cwd,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            state.currentThreadTitle.takeIf { it.isNotBlank() }?.let { title ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = stringResource(R.string.codex_native_current_thread, title),
                    color = TextMuted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            val usageMeta = buildList {
                state.interactionState?.activeSkill?.takeIf { it.isNotBlank() }?.let {
                    add(stringResource(R.string.codex_native_active_skill_label, it))
                }
                state.usagePanel.tokenUsageSummary.takeIf { it.isNotBlank() }?.let(::add)
                state.usagePanel.rateLimitSummary.takeIf { it.isNotBlank() }?.let(::add)
            }.joinToString(" | ")
            usageMeta.takeIf { it.isNotBlank() }?.let { meta ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = meta,
                    color = when (state.usagePanel.rateLimitTone) {
                        "error" -> ErrorColor
                        "warn" -> WarningColor
                        else -> TextMuted
                    },
                    fontSize = 12.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
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
private fun CommandApprovalDialog(
    request: CodexServerRequest,
    submitting: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    AlertDialog(
        onDismissRequest = {},
        title = {
            Text(
                text = approvalTitle(request),
                color = TextPrimary
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
                    fontSize = 14.sp
                )
                request.command?.takeIf { it.isNotBlank() }?.let { command ->
                    Surface(
                        color = SurfaceRaised,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, SurfaceBorder)
                    ) {
                        Text(
                            text = command,
                            color = TextPrimary,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(12.dp)
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
                color = TextPrimary
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
                    fontSize = 14.sp
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
            fontSize = 14.sp
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
        shape = RoundedCornerShape(12.dp),
        color = if (selected) AccentBlue.copy(alpha = 0.18f) else SurfaceRaised,
        border = BorderStroke(
            1.dp,
            when {
                selected -> AccentBlue
                recommended -> AccentBlue.copy(alpha = 0.55f)
                else -> SurfaceBorder
            }
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Text(
            text = text,
            color = if (selected || recommended) TextPrimary else TextSecondary,
            fontSize = 13.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
        )
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 56.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "\u2B22 ${stringResource(R.string.codex_brand_title)}",
            color = TextPrimary,
            fontSize = 26.sp
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = stringResource(R.string.codex_native_empty_hint),
            color = TextMuted,
            fontSize = 14.sp
        )
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val spec = remember(message.role) { bubbleSpec(message.role) }
    val label = roleLabel(message)

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = spec.alignment
    ) {
        Text(
            text = label,
            color = spec.labelColor,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
        )

        Surface(
            modifier = Modifier.widthIn(max = 360.dp),
            shape = RoundedCornerShape(14.dp),
            color = spec.background,
            border = BorderStroke(1.dp, spec.border)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                if (message.role == ChatMessage.Role.TOOL && !message.toolName.isNullOrBlank()) {
                    Text(
                        text = message.toolName,
                        color = TextMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                }
                Text(
                    text = message.content,
                    color = spec.textColor,
                    fontSize = 14.sp,
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
                modifier = Modifier.padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PulsingDot(color = AccentBlue, animated = true, size = 6.dp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = stringResource(R.string.codex_native_status_streaming),
                    color = TextMuted,
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
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = SurfaceRaised,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Text(
                text = stringResource(titleRes),
                color = TextPrimary,
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(summaryRes),
                color = TextMuted,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = BgColor.copy(alpha = 0.45f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, SurfaceBorder.copy(alpha = 0.85f))
            ) {
                Text(
                    text = bodyText,
                    color = TextPrimary,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 180.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(12.dp)
                )
            }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RuntimePanelSheet(
    state: CodexUiState,
    onDismiss: () -> Unit
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
                text = stringResource(R.string.codex_native_runtime_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = state.currentThreadTitle.takeIf { it.isNotBlank() }?.let {
                    stringResource(R.string.codex_native_current_thread, it)
                } ?: stringResource(R.string.codex_native_runtime_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (!hasRuntimePanelContent(state)) {
                Text(
                    text = stringResource(R.string.codex_native_runtime_empty),
                    color = TextMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (state.runtimePanel.warning.isNotBlank()) {
                        item(key = "runtime-warning") {
                            RuntimeSectionCard(
                                title = stringResource(R.string.codex_native_runtime_warning),
                                content = state.runtimePanel.warning,
                                monospace = false,
                                tone = state.runtimePanel.warningTone
                            )
                        }
                    }
                    if (state.runtimePanel.diff.isNotBlank()) {
                        item(key = "runtime-diff") {
                            RuntimeSectionCard(
                                title = stringResource(R.string.codex_native_runtime_diff),
                                content = state.runtimePanel.diff,
                                monospace = true
                            )
                        }
                    }
                    if (state.runtimePanel.plan.isNotBlank()) {
                        item(key = "runtime-plan") {
                            RuntimeSectionCard(
                                title = stringResource(R.string.codex_native_runtime_plan),
                                content = state.runtimePanel.plan
                            )
                        }
                    }
                    if (state.runtimePanel.reasoning.isNotBlank()) {
                        item(key = "runtime-reasoning") {
                            RuntimeSectionCard(
                                title = stringResource(R.string.codex_native_runtime_reasoning),
                                content = state.runtimePanel.reasoning
                            )
                        }
                    }
                    if (state.runtimePanel.terminalOutput.isNotBlank()) {
                        item(key = "runtime-terminal") {
                            RuntimeSectionCard(
                                title = stringResource(R.string.codex_native_runtime_terminal),
                                content = state.runtimePanel.terminalOutput,
                                monospace = true
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
private fun RuntimeSectionCard(
    title: String,
    content: String,
    monospace: Boolean = false,
    tone: String = ""
) {
    val borderColor = when (tone) {
        "error" -> ErrorColor.copy(alpha = 0.7f)
        "warn" -> WarningColor.copy(alpha = 0.7f)
        else -> SurfaceBorder
    }
    val titleColor = when (tone) {
        "error" -> ErrorColor
        "warn" -> WarningColor
        else -> TextSecondary
    }
    Surface(
        color = SurfaceRaised,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = title,
                color = titleColor,
                fontSize = 12.sp
            )
            Text(
                text = content,
                color = TextPrimary,
                fontSize = 13.sp,
                lineHeight = 19.sp,
                fontFamily = if (monospace) FontFamily.Monospace else FontFamily.Default
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ToolsPanelSheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onSelectSkill: (String?) -> Unit,
    onClearActiveSkill: () -> Unit,
    onTogglePlanMode: () -> Unit,
    onRequestCompactCurrentThread: () -> Unit,
    onOpenWebFallback: () -> Unit
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
                text = stringResource(R.string.codex_native_tools_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.codex_native_tools_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            RuntimeSectionCard(
                title = stringResource(R.string.codex_native_tools_controls_title),
                content = buildString {
                    append(
                        if (state.planMode == true) {
                            stringResource(R.string.codex_native_tools_plan_enabled)
                        } else {
                            stringResource(R.string.codex_native_tools_plan_disabled)
                        }
                    )
                    state.interactionState?.activeSkill?.takeIf { it.isNotBlank() }?.let {
                        append("\n")
                        append(stringResource(R.string.codex_native_active_skill_label, it))
                    }
                },
                monospace = false
            )
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FilledTonalButton(onClick = onTogglePlanMode) {
                    Text(
                        if (state.planMode == true) {
                            stringResource(R.string.codex_native_tools_plan_disable)
                        } else {
                            stringResource(R.string.codex_native_tools_plan_enable)
                        }
                    )
                }
                if (!state.interactionState?.activeSkill.isNullOrBlank()) {
                    TextButton(onClick = onClearActiveSkill) {
                        Text(stringResource(R.string.codex_native_tools_clear_skill))
                    }
                }
                TextButton(onClick = onOpenWebFallback) {
                    Text(stringResource(R.string.codex_native_tools_open_web))
                }
            }

            if (state.capabilities?.compact == true) {
                Spacer(modifier = Modifier.height(14.dp))
                RuntimeSectionCard(
                    title = stringResource(R.string.codex_native_tools_compact_title),
                    content = state.toolsPanel.compactStatusText.ifBlank {
                        stringResource(R.string.codex_native_tools_compact_ready)
                    },
                    tone = state.toolsPanel.compactStatusTone
                )
                Spacer(modifier = Modifier.height(8.dp))
                FilledTonalButton(
                    onClick = onRequestCompactCurrentThread,
                    enabled = !state.toolsPanel.compactSubmitting
                ) {
                    Text(
                        if (state.toolsPanel.compactSubmitting) {
                            stringResource(R.string.codex_native_tools_compact_pending)
                        } else {
                            stringResource(R.string.codex_native_tools_compact_action)
                        }
                    )
                }
            }

            if (state.capabilities?.skillsList == true) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(R.string.codex_native_tools_skills_title),
                    color = TextSecondary,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                when {
                    state.toolsPanel.loading -> {
                        Text(
                            text = stringResource(R.string.codex_native_tools_skills_loading),
                            color = TextMuted,
                            fontSize = 13.sp
                        )
                    }
                    state.toolsPanel.skills.isEmpty() -> {
                        Text(
                            text = stringResource(R.string.codex_native_tools_skills_empty),
                            color = TextMuted,
                            fontSize = 13.sp
                        )
                    }
                    else -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 320.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(state.toolsPanel.skills, key = { it.name }) { skill ->
                                SkillCard(
                                    skill = skill,
                                    selected = state.interactionState?.activeSkill == skill.name,
                                    onSelect = { onSelectSkill(skill.name) }
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SkillCard(
    skill: CodexSkillEntry,
    selected: Boolean,
    onSelect: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceRaised,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, if (selected) AccentBlue.copy(alpha = 0.7f) else SurfaceBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = skill.label,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f)
                )
                if (selected) {
                    HistoryBadge(
                        label = stringResource(R.string.codex_native_selected),
                        emphasized = true
                    )
                }
            }
            skill.description.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    color = TextMuted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
            }
            skill.scope.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = stringResource(R.string.codex_native_tools_skill_scope, it),
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }
            skill.defaultPrompt.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = stringResource(R.string.codex_native_tools_skill_prompt, it),
                    color = TextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 17.sp
                )
            }
            FilledTonalButton(onClick = onSelect) {
                Text(stringResource(R.string.codex_native_tools_skill_select))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UsagePanelSheet(
    state: CodexUiState,
    onDismiss: () -> Unit
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
                text = stringResource(R.string.codex_native_usage_title),
                color = TextPrimary,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.codex_native_usage_subtitle),
                color = TextMuted,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            val contextUsage = state.usagePanel.contextUsage
            if (contextUsage == null && state.usagePanel.tokenUsageSummary.isBlank() && state.usagePanel.rateLimitSummary.isBlank()) {
                Text(
                    text = stringResource(R.string.codex_native_usage_empty),
                    color = TextMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            } else {
                state.usagePanel.tokenUsageSummary.takeIf { it.isNotBlank() }?.let {
                    RuntimeSectionCard(
                        title = stringResource(R.string.codex_native_usage_tokens_title),
                        content = it
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }
                contextUsage?.let { usage ->
                    RuntimeSectionCard(
                        title = stringResource(R.string.codex_native_usage_context_title),
                        content = buildContextUsageText(usage)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }
                state.usagePanel.rateLimitSummary.takeIf { it.isNotBlank() }?.let {
                    RuntimeSectionCard(
                        title = stringResource(R.string.codex_native_usage_quota_title),
                        content = it,
                        tone = state.usagePanel.rateLimitTone
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ThreadHistorySheet(
    state: CodexUiState,
    onDismiss: () -> Unit,
    onRefresh: () -> Unit,
    onResumeThread: (String) -> Unit,
    onForkThread: (String) -> Unit,
    onToggleThreadArchive: (String, Boolean) -> Unit,
    onStartRename: (String, String) -> Unit
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.codex_native_thread_history_title),
                        color = TextPrimary,
                        style = MaterialTheme.typography.titleMedium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = state.currentThreadTitle.takeIf { it.isNotBlank() }?.let {
                            stringResource(R.string.codex_native_current_thread, it)
                        } ?: stringResource(R.string.codex_native_thread_history_subtitle),
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                }
                TextButton(
                    onClick = onRefresh,
                    enabled = !state.threadHistoryLoading
                ) {
                    Text(stringResource(R.string.codex_native_thread_refresh))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            when {
                state.threadHistoryLoading && state.threadHistoryEntries.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_thread_history_loading),
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
                state.threadHistoryEntries.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_thread_history_empty),
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(state.threadHistoryEntries, key = { it.id }) { entry ->
                            ThreadHistoryItem(
                                entry = entry,
                                isCurrent = entry.id == state.threadId,
                                historyResumeSupported = state.capabilities?.historyResume == true,
                                actionThreadId = state.threadHistoryActionThreadId,
                                actionKind = state.threadHistoryActionKind,
                                onResumeThread = onResumeThread,
                                onForkThread = onForkThread,
                                onToggleThreadArchive = onToggleThreadArchive,
                                onStartRename = onStartRename
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
private fun ThreadHistoryItem(
    entry: CodexThreadHistoryEntry,
    isCurrent: Boolean,
    historyResumeSupported: Boolean,
    actionThreadId: String,
    actionKind: String,
    onResumeThread: (String) -> Unit,
    onForkThread: (String) -> Unit,
    onToggleThreadArchive: (String, Boolean) -> Unit,
    onStartRename: (String, String) -> Unit
) {
    val isBusy = actionThreadId.isNotBlank()
    val isItemBusy = actionThreadId == entry.id
    Surface(
        color = SurfaceRaised,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(
            1.dp,
            when {
                isCurrent -> AccentBlue.copy(alpha = 0.7f)
                else -> SurfaceBorder
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = entry.title.ifBlank { entry.id },
                color = TextPrimary,
                fontSize = 15.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = buildThreadMetaText(entry),
                color = TextMuted,
                fontSize = 12.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                HistoryBadge(
                    label = if (isCurrent) {
                        stringResource(R.string.codex_native_thread_badge_current)
                    } else if (entry.archived) {
                        stringResource(R.string.codex_native_thread_badge_archived)
                    } else {
                        stringResource(R.string.codex_native_thread_badge_saved)
                    },
                    emphasized = isCurrent
                )
                if (isItemBusy) {
                    HistoryBadge(
                        label = actionKind.ifBlank { stringResource(R.string.codex_native_thread_busy) },
                        emphasized = false
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledTonalButton(
                    onClick = { onResumeThread(entry.id) },
                    enabled = !isCurrent && historyResumeSupported && !isBusy
                ) {
                    Text(
                        if (isCurrent) {
                            stringResource(R.string.codex_native_thread_current)
                        } else {
                            stringResource(R.string.codex_native_thread_open)
                        }
                    )
                }
                TextButton(
                    onClick = { onStartRename(entry.id, entry.title) },
                    enabled = !isBusy
                ) {
                    Text(stringResource(R.string.codex_native_thread_rename))
                }
                TextButton(
                    onClick = { onForkThread(entry.id) },
                    enabled = !isBusy
                ) {
                    Text(stringResource(R.string.codex_native_thread_fork))
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TextButton(
                    onClick = { onToggleThreadArchive(entry.id, entry.archived) },
                    enabled = !isBusy
                ) {
                    Text(
                        if (entry.archived) {
                            stringResource(R.string.codex_native_thread_unarchive)
                        } else {
                            stringResource(R.string.codex_native_thread_archive)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ThreadRenameDialog(
    state: CodexUiState,
    onValueChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit
) {
    val submitting = state.threadHistoryActionKind == "rename" &&
        state.threadHistoryActionThreadId == state.threadRenameTargetId
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.codex_native_thread_rename_title),
                color = TextPrimary
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = stringResource(
                        R.string.codex_native_thread_rename_subtitle,
                        state.threadRenameTargetId.takeLast(8)
                    ),
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                TextField(
                    value = state.threadRenameDraft,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            text = stringResource(R.string.codex_native_thread_rename_placeholder),
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
        },
        confirmButton = {
            TextButton(
                onClick = onSubmit,
                enabled = state.threadRenameDraft.trim().isNotEmpty() && !submitting
            ) {
                Text(stringResource(R.string.codex_native_thread_rename_save))
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !submitting
            ) {
                Text(stringResource(R.string.codex_native_thread_rename_cancel))
            }
        },
        containerColor = SurfaceColor,
        titleContentColor = TextPrimary,
        textContentColor = TextPrimary
    )
}

@Composable
private fun HistoryBadge(label: String, emphasized: Boolean) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (emphasized) AccentBlue.copy(alpha = 0.18f) else BgColor.copy(alpha = 0.32f),
        border = BorderStroke(
            1.dp,
            if (emphasized) AccentBlue.copy(alpha = 0.7f) else SurfaceBorder
        )
    ) {
        Text(
            text = label,
            color = if (emphasized) AccentBlue else TextSecondary,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

private fun buildThreadMetaText(entry: CodexThreadHistoryEntry): String {
    val formatter = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
    val parts = mutableListOf(entry.id.takeLast(8))
    entry.lastActiveAt?.let { parts += formatter.format(Date(it)) }
    return parts.joinToString(" • ")
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

private fun hasRuntimePanelContent(state: CodexUiState): Boolean {
    return state.runtimePanel.diff.isNotBlank() ||
        state.runtimePanel.plan.isNotBlank() ||
        state.runtimePanel.reasoning.isNotBlank() ||
        state.runtimePanel.terminalOutput.isNotBlank() ||
        state.runtimePanel.warning.isNotBlank()
}

@Composable
private fun FooterControls(
    state: CodexUiState,
    onShowModelPicker: () -> Unit,
    onShowReasoningPicker: () -> Unit,
    onShowSandboxPicker: () -> Unit,
    onTogglePlanMode: () -> Unit,
    onShowToolsPanel: () -> Unit,
    onShowUsagePanel: () -> Unit,
    onShowRuntimePanel: () -> Unit,
    onShowThreadHistory: () -> Unit,
    onShowDebugInjector: () -> Unit,
    onNewThread: () -> Unit
) {
    val effectiveConfig = state.nextTurnEffectiveCodexConfig
    val activeModel = effectiveConfig?.model ?: state.nextTurnOverrides.model ?: state.model
    val activeReasoning = effectiveConfig?.reasoningEffort
        ?: state.nextTurnOverrides.reasoningEffort
        ?: state.reasoningEffort
        ?: state.capabilities?.defaultReasoningEffort
    val activeSandboxMode = effectiveConfig?.sandboxMode ?: state.nextTurnOverrides.sandbox

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        activeModel?.takeIf { it.isNotBlank() }?.let {
            FooterChip(
                text = it,
                onClick = onShowModelPicker
            )
        }
        activeReasoning?.takeIf { it.isNotBlank() }?.let {
            FooterChip(
                text = reasoningEffortLabel(it),
                onClick = onShowReasoningPicker
            )
        }
        if (state.capabilities?.sandboxSupported == true) {
            FooterChip(
                text = sandboxModeLabel(activeSandboxMode),
                onClick = onShowSandboxPicker
            )
        }
        if (state.capabilities?.skillsList == true || state.capabilities?.compact == true) {
            FooterChip(
                text = stringResource(R.string.codex_native_tools_chip),
                emphasized = state.toolsPanel.visible || !state.interactionState?.activeSkill.isNullOrBlank(),
                onClick = onShowToolsPanel
            )
        }
        if (
            state.capabilities?.rateLimitsRead == true ||
            state.usagePanel.tokenUsageSummary.isNotBlank() ||
            state.usagePanel.rateLimitSummary.isNotBlank()
        ) {
            FooterChip(
                text = stringResource(R.string.codex_native_usage_chip),
                emphasized = state.usagePanel.visible || state.usagePanel.contextUsage != null,
                onClick = onShowUsagePanel
            )
        }
        if (state.capabilities?.diffPlanReasoning == true) {
            FooterChip(
                text = stringResource(R.string.codex_native_runtime_chip),
                emphasized = state.runtimePanel.visible || hasRuntimePanelContent(state),
                onClick = onShowRuntimePanel
            )
        }
        if (state.capabilities?.historyList == true) {
            FooterChip(
                text = state.threadId?.takeIf { it.isNotBlank() }?.let {
                    stringResource(R.string.codex_native_thread_badge, it.takeLast(8))
                } ?: stringResource(R.string.codex_native_threads_chip),
                emphasized = state.threadHistorySheetVisible,
                onClick = onShowThreadHistory
            )
        } else {
            state.threadId?.takeIf { it.isNotBlank() }?.let {
                FooterChip(text = stringResource(R.string.codex_native_thread_badge, it.takeLast(8)))
            }
        }
        if (state.planMode == true) {
            FooterChip(
                text = stringResource(R.string.codex_native_plan_mode),
                emphasized = true,
                onClick = onTogglePlanMode
            )
        }
        if (BuildConfig.DEBUG) {
            FooterChip(
                text = stringResource(R.string.codex_native_debug_approval_chip),
                onClick = onShowDebugInjector
            )
        }
        TextButton(
            onClick = onNewThread,
            enabled = state.connectionState == ConnectionState.CONNECTED
        ) {
            Text(stringResource(R.string.codex_native_new_thread))
        }
    }
}

@Composable
private fun FooterChip(
    text: String,
    emphasized: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = if (emphasized) AccentBlue.copy(alpha = 0.18f) else SurfaceRaised,
        border = BorderStroke(1.dp, if (emphasized) AccentBlue.copy(alpha = 0.7f) else SurfaceBorder),
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
    ) {
        Text(
            text = text,
            color = if (emphasized) AccentBlue else TextSecondary,
            fontSize = 12.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
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
                    shape = RoundedCornerShape(14.dp),
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

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun InputComposer(
    enabled: Boolean,
    isStreaming: Boolean,
    planMode: Boolean,
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
    onRemovePendingImageAttachment: (String) -> Unit
) {
    var textFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    var imageSheetVisible by remember { mutableStateOf(false) }
    var imageUrlDraft by remember { mutableStateOf("") }

    fun syncComposerMenus(rawText: String) {
        onComposerTextChanged(rawText)
        if (CodexSlashRegistry.parseFileMentionInput(rawText) != null) {
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

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceColor,
        tonalElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
        ) {
            if (mentionMenuVisible) {
                FileMentionMenu(
                    loading = mentionLoading,
                    results = mentionResults,
                    onSelect = { file ->
                        onSelectFileMention(file)
                        val updatedText = removeActiveMentionToken(textFieldValue.text)
                        textFieldValue = TextFieldValue(updatedText)
                        syncComposerMenus(updatedText)
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

            if (pendingMentions.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(start = 12.dp, end = 12.dp, top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    pendingMentions.forEach { file ->
                        MentionChip(
                            file = file,
                            onRemove = { onRemoveFileMention(file.path) }
                        )
                    }
                }
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

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.Bottom
            ) {
                if (imageInputEnabled) {
                    FilledTonalButton(
                        onClick = { imageSheetVisible = true },
                        enabled = enabled && !isStreaming,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = SurfaceRaised,
                            contentColor = AccentBlue
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Text(stringResource(R.string.codex_native_image_button))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                }
                TextField(
                    value = textFieldValue,
                    onValueChange = {
                        textFieldValue = it
                        syncComposerMenus(it.text)
                    },
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 56.dp, max = 160.dp)
                        .onPreviewKeyEvent { event ->
                            val isEnter = event.key == Key.Enter || event.key == Key.NumPadEnter
                            if (!isEnter || event.isShiftPressed) {
                                return@onPreviewKeyEvent false
                            }
                            submit()
                        },
                    enabled = enabled && !isStreaming,
                    placeholder = {
                        Text(
                            text = stringResource(
                                if (planMode) R.string.codex_native_input_hint_plan
                                else R.string.codex_native_input_hint
                            ),
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
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { submit() }),
                    singleLine = false,
                    maxLines = 8
                )

                Spacer(modifier = Modifier.width(8.dp))

                if (isStreaming) {
                    FilledTonalButton(
                        onClick = onInterrupt,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = ErrorColor.copy(alpha = 0.18f),
                            contentColor = ErrorColor
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Text(stringResource(R.string.codex_native_stop))
                    }
                } else {
                    FilledTonalButton(
                        onClick = { submit() },
                        enabled = enabled && (
                            textFieldValue.text.isNotBlank() ||
                                pendingMentions.isNotEmpty() ||
                                pendingImageAttachments.isNotEmpty()
                            ),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = AccentBlue,
                            contentColor = Color.White,
                            disabledContainerColor = AccentBlue.copy(alpha = 0.28f),
                            disabledContentColor = TextMuted
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Text(stringResource(R.string.codex_native_send))
                    }
                }
            }
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
        color = SurfaceRaised,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
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
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = SurfaceRaised,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            when {
                loading -> {
                    Text(
                        text = stringResource(R.string.codex_native_file_mention_searching),
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
                    )
                }

                results.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.codex_native_file_mention_no_match),
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
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
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        Text(
            text = file.label,
            color = TextPrimary,
            fontSize = 13.sp
        )
        file.relativePathWithoutFileName.takeIf { it.isNotBlank() }?.let { folder ->
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = folder,
                color = TextMuted,
                fontSize = 12.sp
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
    val alignment: Alignment.Horizontal,
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
        alignment = Alignment.End,
        background = UserBg,
        border = SuccessColor.copy(alpha = 0.65f),
        labelColor = SuccessColor,
        textColor = TextPrimary
    )
    ChatMessage.Role.ASSISTANT -> BubbleSpec(
        alignment = Alignment.Start,
        background = AssistantBg,
        border = SurfaceBorder,
        labelColor = TextSecondary,
        textColor = TextPrimary
    )
    ChatMessage.Role.SYSTEM -> BubbleSpec(
        alignment = Alignment.Start,
        background = SystemBg,
        border = SystemColor.copy(alpha = 0.55f),
        labelColor = SystemColor,
        textColor = TextPrimary
    )
    ChatMessage.Role.TOOL -> BubbleSpec(
        alignment = Alignment.Start,
        background = ToolBg,
        border = AccentBlue.copy(alpha = 0.4f),
        labelColor = AccentBlue,
        textColor = TextSecondary
    )
    ChatMessage.Role.ERROR -> BubbleSpec(
        alignment = Alignment.Start,
        background = ErrorBg,
        border = ErrorColor.copy(alpha = 0.55f),
        labelColor = ErrorColor,
        textColor = TextPrimary
    )
}
