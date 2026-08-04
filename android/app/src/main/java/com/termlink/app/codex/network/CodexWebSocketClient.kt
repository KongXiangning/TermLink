package com.termlink.app.codex.network

import android.util.Log
import com.termlink.app.codex.data.CodexWsEnvelope
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.receiveAsFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * Raw event emitted by [CodexWebSocketClient].
 */
sealed class WsEvent {
    data class Opened(val protocol: String) : WsEvent()
    data class Message(val envelope: CodexWsEnvelope) : WsEvent()
    data class Closing(val code: Int, val reason: String) : WsEvent()
    data class Closed(val code: Int, val reason: String) : WsEvent()
    data class Failure(val throwable: Throwable, val code: Int?) : WsEvent()
}

/**
 * Thin wrapper around OkHttp WebSocket.
 * Exposes a [SharedFlow] of [WsEvent] and a [send] method.
 */
class CodexWebSocketClient {

    companion object {
        private const val TAG = "CodexWsClient"
    }

    private val defaultClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null

    /** Monotonic generation counter to ignore stale WS callbacks. */
    @Volatile
    private var generation = 0L

    private val _events = MutableSharedFlow<WsEvent>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val events: SharedFlow<WsEvent> = _events

    /**
     * History pages use a lossless channel. They must not share the bounded
     * realtime/control buffer because dropping a page can leave a sync stuck
     * waiting for a page that will never be acknowledged.
     */
    private val _historyEvents = Channel<WsEvent>(capacity = Channel.UNLIMITED)
    val historyEvents: Flow<WsEvent> = _historyEvents.receiveAsFlow()

    val isConnected: Boolean
        get() = webSocket != null

    fun connect(
        url: String,
        headers: Map<String, String> = emptyMap(),
        client: OkHttpClient = defaultClient
    ) {
        disconnect()
        val requestBuilder = Request.Builder().url(url)
        headers.forEach { (k, v) -> requestBuilder.addHeader(k, v) }
        val request = requestBuilder.build()
        Log.i(TAG, "Connecting to $url")
        val gen = ++generation
        webSocket = client.newWebSocket(request, Listener(gen))
    }

    fun send(text: String): Boolean {
        val ws = webSocket ?: return false
        return ws.send(text)
    }

    fun disconnect(code: Int = 1000, reason: String = "client disconnect") {
        webSocket?.close(code, reason)
        webSocket = null
        while (_historyEvents.tryReceive().isSuccess) {
            // Drop pages queued by the connection being torn down. The
            // ViewModel generation gate rejects any event already in flight.
        }
    }

    /** Release OkHttp thread pools. Call once when the manager is done. */
    fun shutdown() {
        disconnect()
        defaultClient.dispatcher.executorService.shutdown()
        defaultClient.connectionPool.evictAll()
    }

    /**
     * Listener scoped to a specific [gen] (generation). Callbacks from stale
     * connections (where [gen] != current [generation]) are silently ignored.
     */
    private inner class Listener(private val gen: Long) : WebSocketListener() {
        private fun isStale() = gen != generation

        private fun rejectOversizedMessage(webSocket: WebSocket, text: String) {
            val error = IllegalStateException(
                "Codex WebSocket message exceeds ${CodexWsEnvelope.MAX_ENVELOPE_BYTES} bytes"
            )
            Log.w(TAG, "Rejecting oversized WebSocket message (chars=${text.length})")
            // Surface the failure through the normal reconnect path, then use
            // RFC 6455 1009 so OkHttp does not continue accepting more frames
            // from a peer that violated the bounded protocol.
            _events.tryEmit(WsEvent.Failure(error, 1009))
            webSocket.close(1009, "Codex message too large")
        }

        override fun onOpen(webSocket: WebSocket, response: Response) {
            if (isStale()) return
            Log.i(TAG, "WebSocket opened (protocol=${response.protocol})")
            _events.tryEmit(WsEvent.Opened(response.protocol.toString()))
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            if (isStale()) return
            if (!CodexWsEnvelope.isWithinMaxEnvelopeBytes(text)) {
                rejectOversizedMessage(webSocket, text)
                return
            }
            val envelope = CodexWsEnvelope.parse(text)
            if (envelope != null) {
                val event = WsEvent.Message(envelope)
                if (isHistoryEnvelope(envelope.type)) {
                    _historyEvents.trySend(event)
                } else {
                    _events.tryEmit(event)
                }
            } else {
                Log.w(TAG, "Unparseable WS message: ${text.take(200)}")
            }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            if (isStale()) return
            Log.i(TAG, "WebSocket closing: $code $reason")
            _events.tryEmit(WsEvent.Closing(code, reason))
            webSocket.close(code, reason)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            if (isStale()) return
            Log.i(TAG, "WebSocket closed: $code $reason")
            this@CodexWebSocketClient.webSocket = null
            _events.tryEmit(WsEvent.Closed(code, reason))
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            if (isStale()) return
            Log.e(TAG, "WebSocket failure: ${t.message}", t)
            this@CodexWebSocketClient.webSocket = null
            _events.tryEmit(WsEvent.Failure(t, response?.code))
        }
    }

    private fun isHistoryEnvelope(type: String): Boolean =
        type == "conversation_history_manifest_required" ||
            type == "conversation_history_recovery_state" ||
            type == "conversation_history_sync_state" ||
            type == "conversation_history_delta" ||
            type == "conversation_history_payload_chunk" ||
            type == "conversation_history_progress"
}
