package com.termlink.app.codex.network

import android.util.Base64
import android.util.Log
import com.termlink.app.codex.data.CodexClientMessages
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerProfile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URI
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.math.min

/**
 * Manages the WebSocket lifecycle: connect, reconnect with backoff,
 * heartbeat, and auth-ticket fetch.
 *
 * The caller (ViewModel) observes [connectionState] and collects
 * [wsClient].[events] for protocol messages.
 */
class CodexConnectionManager(
    private val scope: CoroutineScope,
    private val credentialStore: BasicCredentialStore
) {
    companion object {
        private const val TAG = "CodexConnMgr"
        private const val INITIAL_RECONNECT_MS = 1_000L
        private const val MAX_RECONNECT_MS = 30_000L
        private const val MAX_RECONNECT_ATTEMPTS = 20
        private const val HEARTBEAT_INTERVAL_MS = 25_000L
    }

    val wsClient = CodexWebSocketClient()

    /** Shared HTTP client for ticket fetches (avoids per-call thread pool leak). */
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val _connectionState = MutableStateFlow(ConnectionState.IDLE)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private var profile: ServerProfile? = null
    private var sessionId: String = ""
    private var reconnectJob: Job? = null
    private var heartbeatJob: Job? = null
    private var reconnectInterval = INITIAL_RECONNECT_MS
    private var reconnectAttempts = 0
    private var intentionalDisconnect = false

    /**
     * Initiate a WebSocket connection for the given profile + session.
     */
    fun connect(profile: ServerProfile, sessionId: String) {
        this.profile = profile
        this.sessionId = sessionId
        this.intentionalDisconnect = false
        reconnectAttempts = 0
        reconnectInterval = INITIAL_RECONNECT_MS

        cancelReconnect()
        doConnect()
    }

    fun disconnect() {
        intentionalDisconnect = true
        cancelReconnect()
        cancelHeartbeat()
        wsClient.disconnect()
        _connectionState.value = ConnectionState.IDLE
    }

    /** Permanently release all resources. Call from ViewModel.onCleared(). */
    fun shutdown() {
        disconnect()
        wsClient.shutdown()
        httpClient.dispatcher.executorService.shutdown()
        httpClient.connectionPool.evictAll()
    }

    fun send(text: String): Boolean = wsClient.send(text)

    /** Called by ViewModel when it observes [WsEvent.Opened]. */
    fun onConnected() {
        _connectionState.value = ConnectionState.CONNECTED
        reconnectAttempts = 0
        reconnectInterval = INITIAL_RECONNECT_MS
        startHeartbeat()
    }

    /** Called by ViewModel when it observes [WsEvent.Closed] or [WsEvent.Failure]. */
    fun onDisconnected() {
        cancelHeartbeat()
        if (intentionalDisconnect) {
            _connectionState.value = ConnectionState.IDLE
            return
        }
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            _connectionState.value = ConnectionState.ERROR
            Log.w(TAG, "Max reconnect attempts reached")
            return
        }
        scheduleReconnect()
    }

    // ── internal ──────────────────────────────────────────────────────

    private fun doConnect() {
        val p = profile ?: return
        val baseUrl = p.baseUrl.trim()
        if (baseUrl.isEmpty()) {
            _connectionState.value = ConnectionState.ERROR
            return
        }

        _connectionState.value = ConnectionState.CONNECTING

        scope.launch(Dispatchers.IO) {
            try {
                val wsUrl = buildWsUrl(baseUrl, sessionId)
                val authHeader = buildAuthHeader(p)
                val finalUrl = fetchTicketUrl(baseUrl, authHeader, wsUrl)
                val headers = mutableMapOf<String, String>()
                // OkHttp doesn't support Authorization header on WS upgrade in all
                // environments, but the ticket param handles auth for us.
                wsClient.connect(finalUrl, headers)
            } catch (e: Exception) {
                Log.e(TAG, "Connect failed", e)
                _connectionState.value = ConnectionState.ERROR
            }
        }
    }

    private fun scheduleReconnect() {
        cancelReconnect()
        _connectionState.value = ConnectionState.RECONNECTING
        reconnectJob = scope.launch {
            Log.i(TAG, "Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttempts + 1})")
            delay(reconnectInterval)
            reconnectAttempts++
            reconnectInterval = min((reconnectInterval * 1.5).toLong(), MAX_RECONNECT_MS)
            doConnect()
        }
    }

    private fun cancelReconnect() {
        reconnectJob?.cancel()
        reconnectJob = null
    }

    private fun startHeartbeat() {
        cancelHeartbeat()
        heartbeatJob = scope.launch {
            while (true) {
                delay(HEARTBEAT_INTERVAL_MS)
                if (_connectionState.value == ConnectionState.CONNECTED) {
                    wsClient.send(CodexClientMessages.heartbeat())
                }
            }
        }
    }

    private fun cancelHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    // ── URL helpers (mirrors terminal_client.js buildWsUrl) ──────────

    private fun buildWsUrl(baseUrl: String, sessionId: String): String {
        val uri = URI(baseUrl.trimEnd('/'))
        val wsScheme = when (uri.scheme?.lowercase()) {
            "https" -> "wss"
            "http" -> "ws"
            else -> "ws"
        }
        var path = uri.path.orEmpty()
        if (path.isNotEmpty() && path != "/" && !path.endsWith("/")) {
            path = "$path/"
        }
        val query = if (sessionId.isNotBlank()) {
            "sessionId=${URLEncoder.encode(sessionId, "UTF-8")}"
        } else null
        return URI(wsScheme, null, uri.host, uri.port, path, query, null).toString()
    }

    private fun buildAuthHeader(profile: ServerProfile): String? {
        if (profile.authType != AuthType.BASIC) return null
        val username = profile.basicUsername.trim()
        val password = credentialStore.getPassword(profile.id).orEmpty()
        if (username.isBlank() || password.isBlank()) return null
        val encoded = Base64.encodeToString(
            "$username:$password".toByteArray(Charsets.UTF_8),
            Base64.NO_WRAP
        )
        return "Basic $encoded"
    }

    /**
     * Fetch a one-time WS ticket from the server (same as JS client).
     * Falls back to the original wsUrl on any error.
     */
    private fun fetchTicketUrl(baseUrl: String, authHeader: String?, wsUrl: String): String {
        val ticketEndpoint = baseUrl.trimEnd('/') + "/api/ws-ticket"
        return try {
            val reqBuilder = Request.Builder().url(ticketEndpoint).get()
            authHeader?.let { reqBuilder.addHeader("Authorization", it) }
            httpClient.newCall(reqBuilder.build()).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string().orEmpty()
                    val ticket = JSONObject(body).optString("ticket", "")
                    if (ticket.isNotBlank()) {
                        val separator = if (wsUrl.contains("?")) "&" else "?"
                        "$wsUrl${separator}ticket=$ticket"
                    } else wsUrl
                } else {
                    Log.w(TAG, "Ticket fetch HTTP ${response.code}")
                    wsUrl
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Ticket fetch failed: ${e.message}")
            wsUrl
        }
    }
}
