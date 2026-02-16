package com.termlink.app

import android.os.Bundle
import android.view.ViewGroup
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.ui.terminal.TerminalFragment
import com.termlink.app.web.MtlsWebViewClient
import com.termlink.app.web.TerminalEventBridge
import com.termlink.app.web.TerminalWebViewHost
import org.json.JSONObject
import java.util.Locale

class MainShellActivity : AppCompatActivity(), TerminalWebViewHost, TerminalEventBridge.Listener {

    private var terminalWebView: WebView? = null
    private var terminalPageLoaded = false
    private var statusTextView: TextView? = null
    private lateinit var terminalEventBridge: TerminalEventBridge
    private var lastSessionId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_shell)
        statusTextView = findViewById(R.id.shell_status_text)
        lastSessionId = resolveInitialSessionId()
        updateStatus(getString(R.string.terminal_state_idle))

        val bottomNav = findViewById<BottomNavigationView>(R.id.shell_bottom_nav)
        bottomNav.setOnItemSelectedListener { item ->
            switchTab(item.itemId)
            true
        }

        if (savedInstanceState == null) {
            bottomNav.selectedItemId = R.id.nav_terminal
        } else {
            val currentTag = supportFragmentManager.findFragmentById(R.id.shell_fragment_container)?.tag
            bottomNav.selectedItemId = when (currentTag) {
                TAG_SESSIONS -> R.id.nav_sessions
                TAG_SETTINGS -> R.id.nav_settings
                else -> R.id.nav_terminal
            }
        }
    }

    override fun onDestroy() {
        if (isFinishing) {
            detachTerminalWebView()
            terminalWebView?.destroy()
            terminalWebView = null
            terminalPageLoaded = false
        }
        super.onDestroy()
    }

    override fun getOrCreateTerminalWebView(): WebView {
        val existing = terminalWebView
        if (existing != null) {
            return existing
        }

        val webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        terminalEventBridge = TerminalEventBridge(this)
        webView.addJavascriptInterface(terminalEventBridge, JS_BRIDGE_NAME)
        webView.webViewClient = object : MtlsWebViewClient(applicationContext) {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view != null) {
                    injectTerminalConfig(view)
                }
            }
        }
        if (!terminalPageLoaded) {
            webView.loadUrl(TERMINAL_URL)
            terminalPageLoaded = true
        }
        terminalWebView = webView
        return webView
    }

    override fun attachTerminalWebView(container: ViewGroup) {
        val webView = getOrCreateTerminalWebView()
        if (webView.parent === container) {
            return
        }
        (webView.parent as? ViewGroup)?.removeView(webView)
        container.removeAllViews()
        container.addView(webView)
    }

    override fun detachTerminalWebView() {
        val webView = terminalWebView ?: return
        (webView.parent as? ViewGroup)?.removeView(webView)
    }

    private fun switchTab(itemId: Int) {
        val (tag, fragment) = when (itemId) {
            R.id.nav_sessions -> TAG_SESSIONS to SessionsFragment()
            R.id.nav_settings -> TAG_SETTINGS to SettingsFragment()
            else -> TAG_TERMINAL to TerminalFragment()
        }

        val currentTag = supportFragmentManager.findFragmentById(R.id.shell_fragment_container)?.tag
        if (currentTag == tag) {
            return
        }

        supportFragmentManager.commit {
            setReorderingAllowed(true)
            replace(R.id.shell_fragment_container, fragment, tag)
        }
    }

    override fun onConnectionState(state: String, detail: String?) {
        val normalizedState = state.lowercase(Locale.ROOT)
        val statusText = when (normalizedState) {
            "connecting" -> getString(R.string.terminal_state_connecting)
            "connected" -> getString(R.string.terminal_state_connected)
            "reconnecting" -> getString(R.string.terminal_state_reconnecting)
            "error" -> getString(R.string.terminal_state_error, detail ?: "")
            else -> getString(R.string.terminal_state_unknown, state)
        }
        updateStatus(statusText)
        Log.i(TAG, "Terminal connection state=$state detail=${detail ?: ""}")
    }

    override fun onTerminalError(code: String, message: String?) {
        val detail = if (message.isNullOrBlank()) code else "$code: $message"
        updateStatus(getString(R.string.terminal_state_error, detail))
        Toast.makeText(this, getString(R.string.terminal_error_toast, detail), Toast.LENGTH_SHORT).show()
        Log.e(TAG, "Terminal error $detail")
    }

    override fun onSessionInfo(sessionId: String, name: String?) {
        if (sessionId.isNotBlank()) {
            persistLastSessionId(sessionId)
        }
        Log.i(TAG, "Terminal session info sessionId=$sessionId name=${name ?: ""}")
    }

    private fun injectTerminalConfig(webView: WebView) {
        val configJson = buildTerminalConfigJson()
        val script = """
            (function() {
                window.__TERMLINK_CONFIG__ = $configJson;
                if (typeof window.__applyTerminalConfig === 'function') {
                    window.__applyTerminalConfig(window.__TERMLINK_CONFIG__);
                }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun buildTerminalConfigJson(): String {
        val json = JSONObject()
        json.put("serverUrl", "")
        json.put("sessionId", lastSessionId)
        json.put("activeProfile", JSONObject.NULL)
        json.put("historyEnabled", true)
        return json.toString()
    }

    private fun resolveInitialSessionId(): String {
        val fromUri = intent?.data?.getQueryParameter("sessionId")
        if (!fromUri.isNullOrBlank()) {
            return fromUri
        }
        val fromExtra = intent?.getStringExtra("sessionId")
        if (!fromExtra.isNullOrBlank()) {
            return fromExtra
        }
        return getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getString(PREF_LAST_SESSION_ID, "")
            .orEmpty()
    }

    private fun persistLastSessionId(sessionId: String) {
        lastSessionId = sessionId
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_SESSION_ID, sessionId)
            .apply()
    }

    private fun updateStatus(text: String) {
        statusTextView?.text = text
    }

    companion object {
        private const val TERMINAL_URL = "file:///android_asset/public/terminal.html"
        private const val JS_BRIDGE_NAME = "TerminalEventBridge"
        private const val PREFS_NAME = "termlink_shell"
        private const val PREF_LAST_SESSION_ID = "last_session_id"
        private const val TAG_SESSIONS = "sessions"
        private const val TAG_TERMINAL = "terminal"
        private const val TAG_SETTINGS = "settings"
        private const val TAG = "TermLinkShell"
    }
}
