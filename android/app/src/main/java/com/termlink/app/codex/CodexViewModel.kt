package com.termlink.app.codex

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.termlink.app.codex.data.*
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexLaunchParams
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.network.CodexConnectionManager
import com.termlink.app.codex.network.WsEvent
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

class CodexViewModel(
    credentialStore: BasicCredentialStore
) : ViewModel() {

    companion object {
        private const val TAG = "CodexViewModel"
    }

    private val connectionManager = CodexConnectionManager(viewModelScope, credentialStore)

    private val _uiState = MutableStateFlow(CodexUiState())
    val uiState: StateFlow<CodexUiState> = _uiState.asStateFlow()

    private var currentStreamingMessageId: String? = null

    init {
        observeConnectionState()
        observeWsEvents()
    }

    // ── Public actions ────────────────────────────────────────────────

    fun connect(profile: ServerProfile, params: CodexLaunchParams) {
        _uiState.update {
            it.copy(
                sessionId = params.sessionId,
                cwd = params.cwd,
                connectionState = ConnectionState.CONNECTING
            )
        }
        connectionManager.connect(profile, params.sessionId)
    }

    fun disconnect() {
        connectionManager.disconnect()
    }

    fun sendMessage(prompt: String) {
        if (prompt.isBlank()) return
        val userMsg = ChatMessage(
            id = UUID.randomUUID().toString(),
            role = ChatMessage.Role.USER,
            content = prompt
        )
        _uiState.update { it.copy(messages = it.messages + userMsg) }

        val threadId = _uiState.value.threadId
        connectionManager.send(CodexClientMessages.codexTurn(prompt, threadId))
    }

    fun interrupt() {
        connectionManager.send(CodexClientMessages.codexInterrupt(_uiState.value.threadId))
    }

    fun newThread() {
        connectionManager.send(CodexClientMessages.codexNewThread())
    }

    fun setCwd(cwd: String) {
        connectionManager.send(CodexClientMessages.codexSetCwd(cwd))
        _uiState.update { it.copy(cwd = cwd) }
    }

    fun approveRequest(requestId: String, approved: Boolean, response: String? = null) {
        connectionManager.send(
            CodexClientMessages.codexServerRequestResponse(requestId, approved, response)
        )
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
                        connectionManager.onDisconnected()
                    }
                    is WsEvent.Closing -> { /* handled by Closed */ }
                    is WsEvent.Failure -> {
                        _uiState.update {
                            it.copy(errorMessage = event.throwable.message)
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
                    it.copy(
                        capabilities = caps,
                        model = caps.defaultModel.ifBlank { it.model },
                        reasoningEffort = caps.defaultReasoningEffort.ifBlank { it.reasoningEffort }
                    )
                }
                Log.i(TAG, "Capabilities: models=${caps.models}")
            }

            "codex_state" -> {
                val state = CodexState.from(json)
                _uiState.update {
                    it.copy(
                        status = state.status,
                        model = state.model ?: it.model,
                        reasoningEffort = state.reasoningEffort ?: it.reasoningEffort,
                        sandbox = state.sandbox ?: it.sandbox,
                        planMode = state.planMode ?: it.planMode,
                        threadId = state.threadId ?: it.threadId,
                        interactionState = state.interactionState ?: it.interactionState,
                        cwd = state.cwd ?: it.cwd
                    )
                }
                Log.d(TAG, "State: status=${state.status} thread=${state.threadId}")
            }

            "codex_thread_ready" -> {
                val ready = CodexThreadReady.from(json)
                _uiState.update {
                    it.copy(threadId = ready.threadId)
                }
                Log.i(TAG, "Thread ready: ${ready.threadId} resumed=${ready.resumed}")
            }

            "codex_thread_snapshot" -> {
                val snapshot = CodexThreadSnapshot.from(json)
                val messages = parseSnapshotMessages(snapshot)
                _uiState.update {
                    it.copy(
                        threadId = snapshot.threadId,
                        messages = messages
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
                _uiState.update { it.copy(errorMessage = "${error.code}: ${error.message}") }
                Log.e(TAG, "Codex error: ${error.code} ${error.message}")
            }

            "codex_notification" -> {
                val notif = CodexNotification.from(json)
                Log.i(TAG, "Notification: ${notif.event} ${notif.message}")
            }

            else -> {
                Log.d(TAG, "Unhandled message type: ${envelope.type}")
            }
        }
    }

    private fun handleCodexResponse(response: CodexResponse) {
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
                val msg = ChatMessage(
                    id = msgId,
                    role = ChatMessage.Role.ASSISTANT,
                    content = response.content.orEmpty(),
                    contentType = response.contentType ?: "text",
                    streaming = true
                )
                _uiState.update { it.copy(messages = it.messages + msg) }
            }

            "message_delta", "content_block_delta" -> {
                val streamId = currentStreamingMessageId ?: return
                val delta = response.content ?: return
                _uiState.update { state ->
                    val updated = state.messages.map { msg ->
                        if (msg.id == streamId) {
                            msg.copy(content = msg.content + delta)
                        } else msg
                    }
                    state.copy(messages = updated)
                }
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

    override fun onCleared() {
        super.onCleared()
        connectionManager.shutdown()
    }
}
