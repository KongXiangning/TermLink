package com.termlink.app.codex.network

import android.util.Log
import com.termlink.app.codex.data.CodexWsEnvelope
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
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

    private val client = OkHttpClient.Builder()
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

    val isConnected: Boolean
        get() = webSocket != null

    fun connect(url: String, headers: Map<String, String> = emptyMap()) {
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
    }

    /** Release OkHttp thread pools. Call once when the manager is done. */
    fun shutdown() {
        disconnect()
        client.dispatcher.executorService.shutdown()
        client.connectionPool.evictAll()
    }

    /**
     * Listener scoped to a specific [gen] (generation). Callbacks from stale
     * connections (where [gen] != current [generation]) are silently ignored.
     */
    private inner class Listener(private val gen: Long) : WebSocketListener() {
        private fun isStale() = gen != generation

        override fun onOpen(webSocket: WebSocket, response: Response) {
            if (isStale()) return
            Log.i(TAG, "WebSocket opened (protocol=${response.protocol})")
            _events.tryEmit(WsEvent.Opened(response.protocol.toString()))
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            if (isStale()) return
            val envelope = CodexWsEnvelope.parse(text)
            if (envelope != null) {
                _events.tryEmit(WsEvent.Message(envelope))
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
}
