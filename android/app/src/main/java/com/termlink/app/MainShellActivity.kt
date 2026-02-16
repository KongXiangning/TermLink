package com.termlink.app

import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.ui.terminal.TerminalFragment
import com.termlink.app.web.MtlsWebViewClient
import com.termlink.app.web.TerminalEventBridge
import com.termlink.app.web.TerminalWebViewHost
import org.json.JSONObject
import java.util.Locale

class MainShellActivity : AppCompatActivity(), TerminalWebViewHost, TerminalEventBridge.Listener,
    SettingsFragment.Callbacks {

    private var terminalWebView: WebView? = null
    private var terminalPageLoaded = false
    private var statusTextView: TextView? = null
    private lateinit var terminalEventBridge: TerminalEventBridge
    private lateinit var serverConfigStore: ServerConfigStore
    private var serverConfigState: ServerConfigState? = null
    private var activeProfile: ServerProfile? = null
    private var lastSessionId: String = ""
    private var currentTabTag: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_shell)
        statusTextView = findViewById(R.id.shell_status_text)
        serverConfigStore = ServerConfigStore(applicationContext)
        syncProfileState(serverConfigStore.loadState(), inject = false)
        lastSessionId = resolveInitialSessionId()
        updateStatus(getString(R.string.terminal_state_idle))

        val bottomNav = findViewById<BottomNavigationView>(R.id.shell_bottom_nav)
        bottomNav.setOnItemSelectedListener { item ->
            switchTab(item.itemId)
            true
        }

        if (savedInstanceState == null) {
            currentTabTag = null
            bottomNav.selectedItemId = R.id.nav_terminal
        } else {
            currentTabTag = resolveVisibleTabTag()
            bottomNav.selectedItemId = when (currentTabTag) {
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
        val targetTag = when (itemId) {
            R.id.nav_sessions -> TAG_SESSIONS
            R.id.nav_settings -> TAG_SETTINGS
            else -> TAG_TERMINAL
        }
        val fragmentManager = supportFragmentManager
        val existingTarget = fragmentManager.findFragmentByTag(targetTag)
        if (currentTabTag == targetTag && existingTarget?.isAdded == true) {
            return
        }
        val targetFragment = existingTarget ?: createFragmentForTag(targetTag)
        val currentFragment = currentTabTag?.let { fragmentManager.findFragmentByTag(it) }

        fragmentManager.commit {
            setReorderingAllowed(true)
            if (currentFragment != null && currentFragment.isAdded) {
                hide(currentFragment)
            }
            if (targetFragment.isAdded) {
                show(targetFragment)
            } else {
                add(R.id.shell_fragment_container, targetFragment, targetTag)
            }
        }

        currentTabTag = targetTag
        if (targetTag == TAG_TERMINAL) {
            terminalWebView?.let { injectTerminalConfig(it) }
        }
    }

    private fun createFragmentForTag(tag: String): Fragment {
        return when (tag) {
            TAG_SESSIONS -> SessionsFragment()
            TAG_SETTINGS -> SettingsFragment()
            else -> TerminalFragment()
        }
    }

    private fun resolveVisibleTabTag(): String {
        val current = supportFragmentManager.fragments
            .firstOrNull { it.id == R.id.shell_fragment_container && it.isAdded && !it.isHidden }
        return current?.tag ?: TAG_TERMINAL
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

    override fun getServerConfigState(): ServerConfigState {
        val state = serverConfigStore.loadState()
        syncProfileState(state, inject = false)
        return state
    }

    override fun onUpsertProfile(profile: ServerProfile): ServerConfigState {
        val state = serverConfigStore.upsertProfile(profile)
        syncProfileState(state, inject = true)
        return state
    }

    override fun onDeleteProfile(profileId: String): ServerConfigState {
        val state = serverConfigStore.deleteProfile(profileId)
        syncProfileState(state, inject = true)
        return state
    }

    override fun onSetActiveProfile(profileId: String): ServerConfigState {
        val state = serverConfigStore.setActiveProfile(profileId)
        syncProfileState(state, inject = true)
        return state
    }

    private fun syncProfileState(state: ServerConfigState, inject: Boolean) {
        serverConfigState = state
        activeProfile = state.profiles.firstOrNull { it.id == state.activeProfileId }
            ?: state.profiles.firstOrNull()
        if (inject) {
            terminalWebView?.let { injectTerminalConfig(it) }
        }
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
        val profile = activeProfile
        val activeProfileJson = if (profile == null) {
            JSONObject.NULL
        } else {
            JSONObject()
                .put("id", profile.id)
                .put("name", profile.name)
                .put("baseUrl", profile.baseUrl)
                .put("authType", profile.authType.name)
                .put("mtlsEnabled", profile.mtlsEnabled)
                .put("allowedHosts", profile.allowedHosts)
        }
        json.put("serverUrl", profile?.baseUrl ?: "")
        json.put("sessionId", lastSessionId)
        json.put("activeProfile", activeProfileJson)
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
