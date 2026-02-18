package com.termlink.app

import android.os.Bundle
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.Insets
import androidx.core.view.GravityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionSelection
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.ui.terminal.TerminalFragment
import com.termlink.app.web.MtlsWebViewClient
import com.termlink.app.web.TerminalEventBridge
import com.termlink.app.web.TerminalWebViewHost
import org.json.JSONObject
import java.util.Locale

class MainShellActivity : AppCompatActivity(), TerminalWebViewHost, TerminalEventBridge.Listener,
    SettingsFragment.Callbacks, SessionsFragment.Callbacks {

    private enum class ScreenMode {
        TERMINAL,
        SETTINGS
    }

    private var terminalWebView: WebView? = null
    private var terminalPageLoaded = false
    private var statusTextView: TextView? = null
    private var topBarView: View? = null
    private var fragmentContainerView: View? = null
    private var drawerLayout: DrawerLayout? = null
    private var sessionsDrawerButton: ImageButton? = null
    private var backButton: ImageButton? = null
    private var settingsButton: ImageButton? = null
    private lateinit var terminalEventBridge: TerminalEventBridge
    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private var serverConfigState: ServerConfigState? = null
    private var activeProfile: ServerProfile? = null
    private var currentTerminalProfileId: String = ""
    private var lastSessionId: String = ""
    private var currentScreen: ScreenMode = ScreenMode.TERMINAL
    private var lastConnectionState: String = "idle"
    private var lastToastSignature: String = ""
    private var lastToastAtMs: Long = 0L
    private var lastInjectedConfigSignature: String? = null
    private var terminalStatusText: String = ""
    private var systemBarInsets: Insets = Insets.NONE
    private var imeInsets: Insets = Insets.NONE
    private var isImeVisible: Boolean = false
    private var isTerminalChromeCompact: Boolean = false
    private var topBarBasePaddingLeft: Int = 0
    private var topBarBasePaddingTop: Int = 0
    private var topBarBasePaddingRight: Int = 0
    private var topBarBasePaddingBottom: Int = 0
    private var statusTextDefaultSizePx: Float = 0f
    private var fragmentContainerBasePaddingLeft: Int = 0
    private var fragmentContainerBasePaddingTop: Int = 0
    private var fragmentContainerBasePaddingRight: Int = 0
    private var fragmentContainerBasePaddingBottom: Int = 0
    private val drawerListener = object : DrawerLayout.SimpleDrawerListener() {
        override fun onDrawerOpened(drawerView: View) {
            if (drawerView.id == R.id.shell_sessions_drawer_container) {
                setDrawerSessionsFragmentVisible(true)
            }
        }

        override fun onDrawerClosed(drawerView: View) {
            if (drawerView.id == R.id.shell_sessions_drawer_container) {
                setDrawerSessionsFragmentVisible(false)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_shell)
        drawerLayout = findViewById(R.id.shell_root_drawer)
        topBarView = findViewById(R.id.shell_top_bar)
        fragmentContainerView = findViewById(R.id.shell_fragment_container)
        sessionsDrawerButton = findViewById(R.id.btn_open_sessions_drawer)
        backButton = findViewById(R.id.btn_back_terminal)
        settingsButton = findViewById(R.id.btn_open_settings)
        statusTextView = findViewById(R.id.shell_status_text)

        topBarView?.let { topBar ->
            topBarBasePaddingLeft = topBar.paddingLeft
            topBarBasePaddingTop = topBar.paddingTop
            topBarBasePaddingRight = topBar.paddingRight
            topBarBasePaddingBottom = topBar.paddingBottom
        }
        fragmentContainerView?.let { container ->
            fragmentContainerBasePaddingLeft = container.paddingLeft
            fragmentContainerBasePaddingTop = container.paddingTop
            fragmentContainerBasePaddingRight = container.paddingRight
            fragmentContainerBasePaddingBottom = container.paddingBottom
        }
        statusTextDefaultSizePx = statusTextView?.textSize ?: 0f

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        syncProfileState(serverConfigStore.loadState(), inject = false)
        currentTerminalProfileId = resolveInitialProfileId()
        lastSessionId = resolveInitialSessionId()
        terminalStatusText = getString(R.string.terminal_state_idle)
        updateStatus(terminalStatusText)

        drawerLayout?.addDrawerListener(drawerListener)
        sessionsDrawerButton?.setOnClickListener { openSessionsDrawer() }
        backButton?.setOnClickListener { showTerminalScreen() }
        settingsButton?.setOnClickListener { showSettingsScreen() }

        applySystemBarInsets()
        ensureDrawerSessionsFragment()
        setDrawerSessionsFragmentVisible(false)

        if (savedInstanceState == null) {
            showTerminalScreen(injectConfig = false)
        } else {
            currentScreen = if (resolveVisibleMainTag() == TAG_SETTINGS) {
                ScreenMode.SETTINGS
            } else {
                ScreenMode.TERMINAL
            }
            applyTerminalChromeMode()
        }
    }

    override fun onDestroy() {
        drawerLayout?.removeDrawerListener(drawerListener)
        if (isFinishing) {
            detachTerminalWebView()
            terminalWebView?.destroy()
            terminalWebView = null
            terminalPageLoaded = false
            lastInjectedConfigSignature = null
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
        if (BuildConfig.DEBUG && DEBUG_CLEAR_TERMINAL_CACHE_ON_LOAD) {
            webView.clearCache(true)
        }
        terminalEventBridge = TerminalEventBridge(this)
        webView.addJavascriptInterface(terminalEventBridge, JS_BRIDGE_NAME)
        webView.webViewClient = object : MtlsWebViewClient(
            appContext = applicationContext,
            profileProvider = { resolveTerminalProfile() },
            basicPasswordProvider = { profileId -> basicCredentialStore.getPassword(profileId) },
            eventListener = object : MtlsWebViewClient.MtlsEventListener {
                override fun onMtlsError(code: String, message: String) {
                    runOnUiThread {
                        handleTerminalError(code, message)
                    }
                }
            }
        ) {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view != null) {
                    injectTerminalConfigIfChanged(view, force = true)
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

    override fun onConnectionState(state: String, detail: String?) {
        val normalizedState = state.lowercase(Locale.ROOT)
        lastConnectionState = normalizedState
        val statusText = when (normalizedState) {
            "connecting" -> getString(R.string.terminal_state_connecting)
            "connected" -> if (isInsecureActiveProfileTransport()) {
                getString(R.string.terminal_state_connected_insecure)
            } else {
                getString(R.string.terminal_state_connected)
            }
            "reconnecting" -> getString(R.string.terminal_state_reconnecting)
            "error" -> getString(R.string.terminal_state_error, detail ?: "")
            else -> getString(R.string.terminal_state_unknown, state)
        }
        updateStatus(statusText)
        Log.i(TAG, "Terminal connection state=$state detail=${detail ?: ""}")
    }

    override fun onTerminalError(code: String, message: String?) {
        handleTerminalError(code, message)
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
        basicCredentialStore.removePassword(profileId)
        val state = serverConfigStore.deleteProfile(profileId)
        syncProfileState(state, inject = true)
        return state
    }

    override fun getBasicPassword(profileId: String): String? {
        return basicCredentialStore.getPassword(profileId)
    }

    override fun putBasicPassword(profileId: String, password: String) {
        basicCredentialStore.putPassword(profileId, password)
    }

    override fun removeBasicPassword(profileId: String) {
        basicCredentialStore.removePassword(profileId)
    }

    override fun getProfiles(): List<ServerProfile> {
        val state = serverConfigStore.loadState()
        syncProfileState(state, inject = false)
        return state.profiles
    }

    override fun getCurrentSelection(): SessionSelection {
        return SessionSelection(profileId = currentTerminalProfileId, sessionId = lastSessionId)
    }

    override fun onOpenSession(profileId: String, sessionId: String) {
        openSessionInTerminal(profileId, sessionId)
    }

    override fun onUpdateSessionSelection(profileId: String, sessionId: String) {
        updateSessionSelection(profileId, sessionId)
    }

    private fun showTerminalScreen(injectConfig: Boolean = true) {
        showMainFragment(TAG_TERMINAL)
        currentScreen = ScreenMode.TERMINAL
        applyTerminalChromeMode()
        if (injectConfig) {
            terminalWebView?.let { injectTerminalConfigIfChanged(it) }
        }
    }

    private fun showSettingsScreen() {
        closeSessionsDrawerIfOpen()
        showMainFragment(TAG_SETTINGS)
        currentScreen = ScreenMode.SETTINGS
        applyTerminalChromeMode()
    }

    private fun showMainFragment(tag: String) {
        val fm = supportFragmentManager
        val target = fm.findFragmentByTag(tag) ?: createMainFragmentForTag(tag)
        val current = resolveVisibleMainFragment()
        if (current != null && current.tag == tag) {
            return
        }

        fm.commit {
            setReorderingAllowed(true)
            if (current != null && current.isAdded) {
                hide(current)
            }
            if (target.isAdded) {
                show(target)
            } else {
                add(R.id.shell_fragment_container, target, tag)
            }
        }
    }

    private fun resolveVisibleMainTag(): String {
        return resolveVisibleMainFragment()?.tag ?: TAG_TERMINAL
    }

    private fun resolveVisibleMainFragment(): Fragment? {
        return supportFragmentManager.fragments
            .firstOrNull {
                it.id == R.id.shell_fragment_container &&
                    it.isAdded &&
                    !it.isHidden &&
                    (it.tag == TAG_TERMINAL || it.tag == TAG_SETTINGS)
            }
    }

    private fun createMainFragmentForTag(tag: String): Fragment {
        return when (tag) {
            TAG_SETTINGS -> SettingsFragment()
            else -> TerminalFragment()
        }
    }

    private fun syncProfileState(state: ServerConfigState, inject: Boolean) {
        serverConfigState = state
        activeProfile = state.profiles.firstOrNull { it.id == state.activeProfileId }
            ?: state.profiles.firstOrNull()
        if (currentTerminalProfileId.isBlank() || state.profiles.none { it.id == currentTerminalProfileId }) {
            currentTerminalProfileId = activeProfile?.id.orEmpty()
            persistLastProfileId(currentTerminalProfileId)
        }
        if (inject) {
            terminalWebView?.let { injectTerminalConfigIfChanged(it) }
        }
    }

    private fun injectTerminalConfigIfChanged(webView: WebView, force: Boolean = false) {
        val configJson = buildTerminalConfigJson()
        val signature = buildTerminalConfigSignature()
        if (!force && signature == lastInjectedConfigSignature) {
            return
        }
        lastInjectedConfigSignature = signature
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

    private fun buildTerminalConfigSignature(): String {
        val profile = resolveTerminalProfile()
        return listOf(
            profile?.id.orEmpty(),
            profile?.baseUrl.orEmpty(),
            profile?.authType?.name.orEmpty(),
            profile?.basicUsername.orEmpty(),
            profile?.mtlsEnabled?.toString().orEmpty(),
            profile?.allowedHosts.orEmpty(),
            lastSessionId,
            "true"
        ).joinToString("|")
    }

    private fun buildTerminalConfigJson(): String {
        val json = JSONObject()
        val profile = resolveTerminalProfile()
        val activeProfileJson = if (profile == null) {
            JSONObject.NULL
        } else {
            JSONObject()
                .put("id", profile.id)
                .put("name", profile.name)
                .put("baseUrl", profile.baseUrl)
                .put("authType", profile.authType.name)
                .put("basicUsername", profile.basicUsername)
                .put("mtlsEnabled", profile.mtlsEnabled)
                .put("allowedHosts", profile.allowedHosts)
        }
        json.put("serverUrl", resolveInjectedServerUrl(profile))
        json.put("sessionId", lastSessionId)
        json.put("activeProfile", activeProfileJson)
        json.put("historyEnabled", true)
        return json.toString()
    }

    private fun resolveInjectedServerUrl(profile: ServerProfile?): String {
        if (profile == null) return ""
        return profile.baseUrl
    }

    private fun resolveTerminalProfile(): ServerProfile? {
        val state = serverConfigState ?: serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == currentTerminalProfileId }
            ?: state.profiles.firstOrNull { it.id == state.activeProfileId }
            ?: state.profiles.firstOrNull()
    }

    private fun resolveInitialProfileId(): String {
        val fromUri = intent?.data?.getQueryParameter("profileId")
        if (!fromUri.isNullOrBlank()) {
            return fromUri
        }
        val fromExtra = intent?.getStringExtra("profileId")
        if (!fromExtra.isNullOrBlank()) {
            return fromExtra
        }
        val fromPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getString(PREF_LAST_PROFILE_ID, "")
            .orEmpty()
        if (fromPrefs.isNotBlank()) {
            return fromPrefs
        }
        return activeProfile?.id.orEmpty()
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

    private fun persistLastProfileId(profileId: String) {
        currentTerminalProfileId = profileId
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_PROFILE_ID, profileId)
            .apply()
    }

    private fun openSessionInTerminal(profileId: String, sessionId: String) {
        updateSessionSelection(profileId, sessionId)
        closeSessionsDrawerIfOpen()
        showTerminalScreen(injectConfig = true)
    }

    private fun updateSessionSelection(profileId: String, sessionId: String) {
        var selectionChanged = false

        if (profileId.isNotBlank()) {
            if (profileId != currentTerminalProfileId) {
                persistLastProfileId(profileId)
                selectionChanged = true
            }
            val state = serverConfigState ?: serverConfigStore.loadState()
            if (state.activeProfileId != profileId && state.profiles.any { it.id == profileId }) {
                syncProfileState(serverConfigStore.setActiveProfile(profileId), inject = false)
                selectionChanged = true
            }
        }

        if (sessionId != lastSessionId) {
            persistLastSessionId(sessionId)
            selectionChanged = true
        }

        if (selectionChanged && currentScreen == ScreenMode.TERMINAL) {
            terminalWebView?.let { injectTerminalConfigIfChanged(it) }
        }
    }

    private fun updateStatus(text: String) {
        terminalStatusText = text
        if (currentScreen == ScreenMode.TERMINAL) {
            statusTextView?.text = text
        }
    }

    private fun openSessionsDrawer() {
        if (currentScreen != ScreenMode.TERMINAL || isTerminalChromeCompact) {
            return
        }
        ensureDrawerSessionsFragment()
        setDrawerSessionsFragmentVisible(true)
        drawerLayout?.openDrawer(GravityCompat.END)
    }

    private fun closeSessionsDrawerIfOpen() {
        val layout = drawerLayout ?: return
        if (layout.isDrawerOpen(GravityCompat.END)) {
            layout.closeDrawer(GravityCompat.END)
        }
    }

    private fun ensureDrawerSessionsFragment() {
        if (supportFragmentManager.findFragmentByTag(TAG_SESSIONS_DRAWER) != null) {
            return
        }
        val fragment = SessionsFragment()
        supportFragmentManager.commit {
            setReorderingAllowed(true)
            add(R.id.shell_sessions_drawer_container, fragment, TAG_SESSIONS_DRAWER)
            hide(fragment)
        }
    }

    private fun setDrawerSessionsFragmentVisible(visible: Boolean) {
        val fragment = supportFragmentManager.findFragmentByTag(TAG_SESSIONS_DRAWER) ?: return
        if (!fragment.isAdded) return
        if (visible && fragment.isHidden) {
            supportFragmentManager.commit {
                setReorderingAllowed(true)
                show(fragment)
            }
        } else if (!visible && !fragment.isHidden) {
            supportFragmentManager.commit {
                setReorderingAllowed(true)
                hide(fragment)
            }
        }
    }

    private fun applySystemBarInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.shell_root_drawer)) { _, insets ->
            systemBarInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
            isImeVisible = imeInsets.bottom > 0
            applyTerminalChromeMode()
            insets
        }
    }

    private fun applyTerminalChromeMode() {
        val shouldCompact = currentScreen == ScreenMode.TERMINAL && isImeVisible
        if (shouldCompact != isTerminalChromeCompact) {
            isTerminalChromeCompact = shouldCompact
            if (isTerminalChromeCompact) {
                closeSessionsDrawerIfOpen()
                statusTextView?.apply {
                    setSingleLine(true)
                    ellipsize = TextUtils.TruncateAt.END
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                }
            } else {
                statusTextView?.apply {
                    setSingleLine(false)
                    maxLines = 2
                    ellipsize = null
                    if (statusTextDefaultSizePx > 0f) {
                        setTextSize(TypedValue.COMPLEX_UNIT_PX, statusTextDefaultSizePx)
                    }
                }
            }
        }
        updateTopBarForScreen()
        applyInsetsForCurrentChromeMode()
    }

    private fun updateTopBarForScreen() {
        if (currentScreen == ScreenMode.SETTINGS) {
            sessionsDrawerButton?.visibility = View.GONE
            backButton?.visibility = View.VISIBLE
            settingsButton?.visibility = View.GONE
            statusTextView?.text = getString(R.string.settings_screen_title)
            backButton?.contentDescription = getString(R.string.settings_back_button)
            return
        }

        backButton?.visibility = View.GONE
        sessionsDrawerButton?.visibility = if (isTerminalChromeCompact) View.GONE else View.VISIBLE
        settingsButton?.visibility = View.VISIBLE
        sessionsDrawerButton?.contentDescription = getString(R.string.sessions_panel_button)
        statusTextView?.text = terminalStatusText
    }

    private fun applyInsetsForCurrentChromeMode() {
        val topBar = topBarView ?: return
        topBar.setPadding(
            topBarBasePaddingLeft,
            (if (isTerminalChromeCompact) 0 else topBarBasePaddingTop) + systemBarInsets.top,
            topBarBasePaddingRight,
            if (isTerminalChromeCompact) dpToPx(2) else topBarBasePaddingBottom
        )

        val container = fragmentContainerView ?: return
        val contentBottomInset = when (currentScreen) {
            ScreenMode.SETTINGS -> systemBarInsets.bottom
            ScreenMode.TERMINAL -> if (isImeVisible) imeInsets.bottom else 0
        }
        container.setPadding(
            fragmentContainerBasePaddingLeft,
            fragmentContainerBasePaddingTop,
            fragmentContainerBasePaddingRight,
            fragmentContainerBasePaddingBottom + contentBottomInset
        )
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    private fun isInsecureActiveProfileTransport(): Boolean {
        val baseUrl = resolveTerminalProfile()?.baseUrl?.trim()?.lowercase(Locale.ROOT).orEmpty()
        return baseUrl.startsWith("http://")
    }

    private fun handleTerminalError(code: String, message: String?) {
        val resolvedCode = code.trim().uppercase(Locale.ROOT).ifBlank { "UNKNOWN" }
        val readable = mapTerminalErrorMessage(resolvedCode, message)
        updateStatus(getString(R.string.terminal_state_error, readable))
        if (shouldShowErrorToast(resolvedCode, readable)) {
            Toast.makeText(this, getString(R.string.terminal_error_toast, readable), Toast.LENGTH_SHORT).show()
        }
        Log.e(TAG, "Terminal error [$resolvedCode] ${message.orEmpty()}")
    }

    private fun shouldShowErrorToast(code: String, detail: String): Boolean {
        if (code == "WS_ERROR" && lastConnectionState == "reconnecting") {
            return false
        }
        val now = System.currentTimeMillis()
        val signature = "$code|$detail"
        if (signature == lastToastSignature && (now - lastToastAtMs) < 4000L) {
            return false
        }
        lastToastSignature = signature
        lastToastAtMs = now
        return true
    }

    private fun mapTerminalErrorMessage(code: String, message: String?): String {
        return when (code) {
            "NO_ACTIVE_SERVER" -> getString(R.string.terminal_error_no_active_server)
            "INVALID_WS_URL" -> getString(R.string.terminal_error_invalid_ws_url)
            "WS_CONSTRUCTION_ERROR" -> getString(R.string.terminal_error_ws_construction)
            "WS_CLOSED" -> getString(R.string.terminal_error_ws_closed)
            "WS_ERROR" -> getString(R.string.terminal_error_ws_transport)
            "HTTPS_WARMUP_FAILED" -> {
                val suffix = message?.trim().orEmpty()
                if (suffix.isBlank()) {
                    getString(R.string.terminal_error_https_warmup_failed)
                } else {
                    "${getString(R.string.terminal_error_https_warmup_failed)} $suffix"
                }
            }
            "MTLS_HOST_NOT_ALLOWED" -> getString(R.string.terminal_error_mtls_host_not_allowed)
            "MTLS_CREDENTIAL_LOAD_FAILED" -> getString(R.string.terminal_error_mtls_credentials)
            "MTLS_APPLY_FAILED" -> getString(R.string.terminal_error_mtls_apply)
            "AUTH_MISSING_CREDENTIALS" -> getString(R.string.terminal_error_auth_missing_credentials)
            else -> {
                val suffix = message?.trim().orEmpty()
                if (suffix.isBlank()) code else "$code: $suffix"
            }
        }
    }

    companion object {
        private const val TERMINAL_URL = "file:///android_asset/public/terminal_client.html?v=6"
        private const val DEBUG_CLEAR_TERMINAL_CACHE_ON_LOAD = false
        private const val JS_BRIDGE_NAME = "TerminalEventBridge"
        private const val PREFS_NAME = "termlink_shell"
        private const val PREF_LAST_SESSION_ID = "last_session_id"
        private const val PREF_LAST_PROFILE_ID = "last_profile_id"
        private const val TAG_SESSIONS_DRAWER = "sessions_drawer"
        private const val TAG_TERMINAL = "terminal"
        private const val TAG_SETTINGS = "settings"
        private const val TAG = "TermLinkShell"
    }
}
