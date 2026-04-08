package com.termlink.app.codex.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.termlink.app.R
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import kotlinx.coroutines.launch

// ── Color palette (matches existing sessions_* colors) ───────────────
private val BgColor = Color(0xFF0E1117)
private val SurfaceColor = Color(0xFF171B22)
private val CardBg = Color(0xFF1B202A)
private val UserCardBg = Color(0xFF222C3F)
private val PrimaryColor = Color(0xFF4D74FF)
private val TextPrimary = Color(0xFFF2F5FB)
private val TextSecondary = Color(0xFFA9B4C7)
private val TextMuted = Color(0xFF7D889C)
private val ErrorColor = Color(0xFFFF7B7B)
private val StatusConnected = Color(0xFF3FB950)

@Composable
fun CodexScreen(
    state: CodexUiState,
    onSendMessage: (String) -> Unit,
    onInterrupt: () -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    // Auto-scroll to bottom when messages change
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BgColor)
    ) {
        // ── Top status bar ───────────────────────────────────────────
        ConnectionStatusBar(state)

        // ── Message list ─────────────────────────────────────────────
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            if (state.messages.isEmpty() && state.connectionState == ConnectionState.CONNECTED) {
                item {
                    EmptyState()
                }
            }
            items(state.messages, key = { it.id }) { message ->
                MessageBubble(message)
            }
        }

        // ── Error banner ─────────────────────────────────────────────
        state.errorMessage?.let { error ->
            Text(
                text = error,
                color = ErrorColor,
                fontSize = 12.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF2D1B1B))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            )
        }

        // ── Input bar ────────────────────────────────────────────────
        InputBar(
            enabled = state.connectionState == ConnectionState.CONNECTED,
            isStreaming = state.messages.lastOrNull()?.streaming == true,
            onSend = { text ->
                onSendMessage(text)
                coroutineScope.launch {
                    if (state.messages.isNotEmpty()) {
                        listState.animateScrollToItem(state.messages.size)
                    }
                }
            },
            onInterrupt = onInterrupt
        )
    }
}

@Composable
private fun ConnectionStatusBar(state: CodexUiState) {
    val (statusText, statusColor) = when (state.connectionState) {
        ConnectionState.IDLE ->
            stringResource(R.string.codex_native_status_idle) to TextMuted
        ConnectionState.CONNECTING ->
            stringResource(R.string.codex_native_status_connecting) to PrimaryColor
        ConnectionState.CONNECTED -> {
            val label = if (state.sessionName.isNotBlank()) {
                "${state.sessionName} — ${stringResource(R.string.codex_native_status_connected)}"
            } else {
                stringResource(R.string.codex_native_status_connected)
            }
            label to StatusConnected
        }
        ConnectionState.RECONNECTING ->
            stringResource(R.string.codex_native_status_reconnecting) to Color(0xFFD29922)
        ConnectionState.ERROR ->
            stringResource(R.string.codex_native_status_error) to ErrorColor
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceColor,
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Connection indicator dot
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(statusColor, RoundedCornerShape(50))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = statusText,
                color = TextPrimary,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f)
            )
            // Model + status badge
            if (state.model != null && state.connectionState == ConnectionState.CONNECTED) {
                Text(
                    text = state.model,
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.codex_brand_title),
            color = TextPrimary,
            fontSize = 24.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.codex_native_empty_hint),
            color = TextMuted,
            fontSize = 14.sp
        )
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val (bgColor, alignment) = when (message.role) {
        ChatMessage.Role.USER -> UserCardBg to Alignment.End
        ChatMessage.Role.ASSISTANT -> CardBg to Alignment.Start
        ChatMessage.Role.SYSTEM -> SurfaceColor to Alignment.CenterHorizontally
        ChatMessage.Role.TOOL -> SurfaceColor to Alignment.Start
    }

    val textColor = when (message.role) {
        ChatMessage.Role.USER -> TextPrimary
        ChatMessage.Role.ASSISTANT -> TextPrimary
        ChatMessage.Role.SYSTEM -> TextMuted
        ChatMessage.Role.TOOL -> TextSecondary
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        if (message.role == ChatMessage.Role.TOOL && message.toolName != null) {
            Text(
                text = "⚙ ${message.toolName}",
                color = TextMuted,
                fontSize = 11.sp,
                modifier = Modifier.padding(start = 4.dp, bottom = 2.dp)
            )
        }
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = bgColor,
            modifier = Modifier.widthIn(max = 320.dp)
        ) {
            Text(
                text = message.content,
                color = textColor,
                fontSize = 14.sp,
                fontFamily = if (message.role == ChatMessage.Role.TOOL) FontFamily.Monospace else FontFamily.Default,
                modifier = Modifier.padding(12.dp),
                lineHeight = 20.sp
            )
        }
        if (message.streaming) {
            Text(
                text = "●●●",
                color = PrimaryColor,
                fontSize = 10.sp,
                modifier = Modifier.padding(start = 4.dp, top = 2.dp)
            )
        }
    }
}

@Composable
private fun InputBar(
    enabled: Boolean,
    isStreaming: Boolean,
    onSend: (String) -> Unit,
    onInterrupt: () -> Unit
) {
    var text by remember { mutableStateOf("") }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SurfaceColor,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .imePadding(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        stringResource(R.string.codex_native_input_hint),
                        color = TextMuted
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = PrimaryColor,
                    focusedBorderColor = PrimaryColor,
                    unfocusedBorderColor = Color(0xFF2A3140)
                ),
                enabled = enabled,
                singleLine = false,
                maxLines = 4,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(
                    onSend = {
                        if (text.isNotBlank() && !isStreaming) {
                            onSend(text.trim())
                            text = ""
                        }
                    }
                ),
                shape = RoundedCornerShape(16.dp)
            )

            Spacer(modifier = Modifier.width(8.dp))

            if (isStreaming) {
                FilledTonalButton(
                    onClick = onInterrupt,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = ErrorColor.copy(alpha = 0.2f),
                        contentColor = ErrorColor
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(stringResource(R.string.codex_native_stop), fontSize = 14.sp)
                }
            } else {
                FilledTonalButton(
                    onClick = {
                        if (text.isNotBlank()) {
                            onSend(text.trim())
                            text = ""
                        }
                    },
                    enabled = enabled && text.isNotBlank(),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = PrimaryColor,
                        contentColor = Color.White,
                        disabledContainerColor = PrimaryColor.copy(alpha = 0.3f),
                        disabledContentColor = TextMuted
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Text(stringResource(R.string.codex_native_send), fontSize = 14.sp)
                }
            }
        }
    }
}
