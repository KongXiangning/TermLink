package com.termlink.app.codex.ui
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.termlink.app.R
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import kotlinx.coroutines.launch

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
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    val isStreaming = state.messages.lastOrNull()?.streaming == true

    LaunchedEffect(
        state.messages.size,
        state.messages.lastOrNull()?.content,
        state.messages.lastOrNull()?.streaming
    ) {
        if (state.messages.isNotEmpty()) {
            listState.scrollToItem(state.messages.lastIndex)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BgColor)
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
            onNewThread = onNewThread
        )

        InputComposer(
            enabled = state.connectionState == ConnectionState.CONNECTED,
            isStreaming = isStreaming,
            onSend = { text ->
                onSendMessage(text)
                coroutineScope.launch {
                    if (state.messages.isNotEmpty()) {
                        listState.scrollToItem(state.messages.size)
                    }
                }
            },
            onInterrupt = onInterrupt
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
private fun FooterControls(
    state: CodexUiState,
    onNewThread: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        state.model?.takeIf { it.isNotBlank() }?.let {
            FooterChip(text = it)
        }
        state.reasoningEffort?.takeIf { it.isNotBlank() }?.let {
            FooterChip(text = it)
        }
        state.threadId?.takeIf { it.isNotBlank() }?.let {
            FooterChip(text = stringResource(R.string.codex_native_thread_badge, it.takeLast(8)))
        }
        if (state.planMode == true) {
            FooterChip(text = stringResource(R.string.codex_native_plan_mode))
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
private fun FooterChip(text: String) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = SurfaceRaised,
        border = BorderStroke(1.dp, SurfaceBorder)
    ) {
        Text(
            text = text,
            color = TextSecondary,
            fontSize = 12.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
        )
    }
}

@Composable
private fun InputComposer(
    enabled: Boolean,
    isStreaming: Boolean,
    onSend: (String) -> Unit,
    onInterrupt: () -> Unit
) {
    var textFieldValue by remember { mutableStateOf(TextFieldValue("")) }

    fun submit(): Boolean {
        val submittedText = textFieldValue.text.trim()
        if (!enabled || isStreaming || submittedText.isBlank()) {
            return false
        }
        onSend(submittedText)
        textFieldValue = TextFieldValue("")
        return true
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceColor,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp)
                .imePadding(),
            verticalAlignment = Alignment.Bottom
        ) {
            TextField(
                value = textFieldValue,
                onValueChange = { textFieldValue = it },
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
                        text = stringResource(R.string.codex_native_input_hint),
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
                    enabled = enabled && textFieldValue.text.isNotBlank(),
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

@Composable
private fun PulsingDot(
    color: Color,
    animated: Boolean,
    size: androidx.compose.ui.unit.Dp = 8.dp
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
