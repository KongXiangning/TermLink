package com.termlink.app

import android.os.Bundle
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.webkit.ValueCallback
import android.net.Uri
import android.content.Intent
import android.provider.MediaStore
import android.os.Environment
import android.view.inputmethod.InputMethodManager
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.Insets
import androidx.core.view.GravityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ExternalSessionStore
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.TerminalType
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.ui.terminal.TerminalFragment
import com.termlink.app.web.MtlsWebViewClient
import com.termlink.app.web.TerminalEventBridge
import com.termlink.app.web.TerminalWebViewHost
import org.json.JSONObject
import java.net.URI
import java.security.MessageDigest
import java.util.Locale

class MainShellActivity : AppCompatActivity(), TerminalWebViewHost, TerminalEventBridge.Listener,
    SettingsFragment.Callbacks, SessionsFragment.Callbacks {

    private enum class ScreenMode {
        TERMINAL,
        SETTINGS
    }

    private var terminalWebView: WebView? = null
    private var loadedTerminalSignature: String = ""
    private var statusTextView: TextView? = null
    private var topBarView: View? = null
    private var fragmentContainerView: View? = null
    private var drawerLayout: DrawerLayout? = null
    private var sessionsDrawerButton: ImageButton? = null
    private var backButton: ImageButton? = null
    private var settingsButton: ImageButton? = null
    private var quickToolbarButton: ImageButton? = null
    private var quickToolbarVisible: Boolean = true
    private lateinit var terminalEventBridge: TerminalEventBridge
    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private lateinit var externalSessionStore: ExternalSessionStore
    private var serverConfigState: ServerConfigState? = null
    private var activeProfile: ServerProfile? = null
    private var currentTerminalProfileId: String = ""
    private var lastSessionId: String = ""
    private var lastSessionMode: SessionMode = SessionMode.TERMINAL
    private var lastSessionCwd: String? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_REQUEST_CODE = 10001
    private var currentScreen: ScreenMode = ScreenMode.TERMINAL
    private var lastConnectionState: String = "idle"
    private var lastToastSignature: String = ""
    private var lastToastAtMs: Long = 0L
    private var lastInjectedConfigSignature: String? = null
    private var terminalStatusText: String = ""
    private var currentPrivilegeLevel: String = "STANDARD"
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
    private var rootInsetsView: View? = null
    private var idleHandler: android.os.Handler? = null
    private var idleTimeoutRunnable: Runnable? = null
    private var isActivityVisible: Boolean = false
    private val IDLE_DIM_DELAY_MS = 2 * 60 * 1000L // 2 minutes
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
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        idleHandler = android.os.Handler(mainLooper)
        idleTimeoutRunnable = Runnable { onIdleTimeout() }
        
        setContentView(R.layout.activity_main_shell)
        drawerLayout = findViewById(R.id.shell_root_drawer)
        rootInsetsView = drawerLayout
        topBarView = findViewById(R.id.shell_top_bar)
        fragmentContainerView = findViewById(R.id.shell_fragment_container)
        sessionsDrawerButton = findViewById(R.id.btn_open_sessions_drawer)
        backButton = findViewById(R.id.btn_back_terminal)
        settingsButton = findViewById(R.id.btn_open_settings)
        quickToolbarButton = findViewById(R.id.btn_toggle_quick_toolbar)
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
        externalSessionStore = ExternalSessionStore(applicationContext)
        syncProfileState(serverConfigStore.loadState(), inject = false)
        currentTerminalProfileId = resolveInitialProfileId()
        lastSessionId = resolveInitialSessionId()
        lastSessionMode = resolveInitialSessionMode()
        lastSessionCwd = resolveInitialSessionCwd()
        terminalStatusText = defaultBridgeIdleStatus()
        updateStatus(terminalStatusText)

        drawerLayout?.addDrawerListener(drawerListener)
        sessionsDrawerButton?.setOnClickListener { openSessionsDrawer() }
        backButton?.setOnClickListener { showTerminalScreen() }
        settingsButton?.setOnClickListener { showSettingsScreen() }
        quickToolbarButton?.setOnClickListener { toggleQuickToolbar() }

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
            loadedTerminalSignature = ""
            lastInjectedConfigSignature = null
        }
        idleHandler?.removeCallbacksAndMessages(null)
        disableKeepScreenOn()
        idleHandler = null
        idleTimeoutRunnable = null
        isActivityVisible = false
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        isActivityVisible = true
        markUserActive()
        val insetsView = rootInsetsView ?: return
        insetsView.post {
            ViewCompat.requestApplyInsets(insetsView)
            applyTerminalChromeMode()
        }
    }

    override fun onPause() {
        isActivityVisible = false
        idleHandler?.removeCallbacksAndMessages(null)
        disableKeepScreenOn()
        super.onPause()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val callback = filePathCallback
            filePathCallback = null
            if (callback == null) {
                return
            }
            if (resultCode != RESULT_OK || data == null) {
                callback.onReceiveValue(null)
                return
            }
            try {
                val result = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                callback.onReceiveValue(result)
            } catch (e: Exception) {
                Log.e("MainShellActivity", "Failed to parse file chooser result", e)
                callback.onReceiveValue(null)
            }
        }
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        markUserActive()
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
                    if (currentTerminalType() == TerminalType.TERMLINK_WS) {
                        injectTerminalConfigIfChanged(view, force = true)
                        applyQuickToolbarToWebView()
                    } else {
                        applyExternalDarkModeHints(view)
                        val profileName = resolveTerminalProfile()?.name
                        updateStatus(
                            getString(
                                R.string.terminal_state_external_opened,
                                profileName ?: (url ?: "")
                            )
                        )
                    }
                }
            }
        }
        // 添加 WebChromeClient 以捕获 JavaScript 控制台消息
        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(message: android.webkit.ConsoleMessage?): Boolean {
                message ?: return false
                val logTag = "WebViewConsole"
                when (message.messageLevel()) {
                    android.webkit.ConsoleMessage.MessageLevel.ERROR -> {
                        Log.e(logTag, "${message.message()} -- From ${message.sourceId()}:${message.lineNumber()}")
                    }
                    android.webkit.ConsoleMessage.MessageLevel.WARNING -> {
                        Log.w(logTag, "${message.message()} -- From ${message.sourceId()}:${message.lineNumber()}")
                    }
                    android.webkit.ConsoleMessage.MessageLevel.LOG -> {
                        Log.i(logTag, "${message.message()} -- From ${message.sourceId()}:${message.lineNumber()}")
                    }
                    else -> {
                        Log.d(logTag, "${message.message()} -- From ${message.sourceId()}:${message.lineNumber()}")
                    }
                }
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // 取消之前的选择
                this@MainShellActivity.filePathCallback?.onReceiveValue(null)
                this@MainShellActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent()
                if (intent == null) {
                    this@MainShellActivity.filePathCallback = null
                    return false
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    Log.e("MainShellActivity", "Failed to open file chooser", e)
                    this@MainShellActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }
        terminalWebView = webView
        reloadTerminalSurfaceIfNeeded(forceReload = true)
        return webView
    }

    override fun attachTerminalWebView(container: ViewGroup) {
        val webView = getOrCreateTerminalWebView()
        if (webView.parent === container) {
            applyTerminalChromeMode()
            return
        }
        (webView.parent as? ViewGroup)?.removeView(webView)
        container.removeAllViews()
        container.addView(webView)
        applyTerminalChromeMode()
    }

    override fun detachTerminalWebView() {
        val webView = terminalWebView ?: return
        (webView.parent as? ViewGroup)?.removeView(webView)
    }

    override fun onConnectionState(state: String, detail: String?) {
        if (currentTerminalType() != TerminalType.TERMLINK_WS) {
            return
        }
        val normalizedState = state.lowercase(Locale.ROOT)
        lastConnectionState = normalizedState
        val statusText = when (normalizedState) {
            "connecting" -> if (isCodexSessionActive()) {
                getString(R.string.codex_state_connecting)
            } else {
                getString(R.string.terminal_state_connecting)
            }
            "connected" -> if (isInsecureActiveProfileTransport()) {
                getString(R.string.terminal_state_connected_insecure)
            } else if (isCodexSessionActive()) {
                getString(R.string.codex_state_connected)
            } else {
                getString(R.string.terminal_state_connected)
            }
            "reconnecting" -> if (isCodexSessionActive()) {
                getString(R.string.codex_state_reconnecting)
            } else {
                getString(R.string.terminal_state_reconnecting)
            }
            "error" -> if (isCodexSessionActive()) {
                getString(R.string.codex_state_error, detail ?: "")
            } else {
                getString(R.string.terminal_state_error, detail ?: "")
            }
            else -> if (isCodexSessionActive()) {
                getString(R.string.codex_state_unknown, state)
            } else {
                getString(R.string.terminal_state_unknown, state)
            }
        }
        updateStatus(statusText)
        Log.i(TAG, "Terminal connection state=$state detail=${detail ?: ""}")
    }

    override fun onTerminalError(code: String, message: String?) {
        if (currentTerminalType() != TerminalType.TERMLINK_WS) {
            return
        }
        handleTerminalError(code, message)
    }

    override fun onSessionInfo(sessionId: String, name: String?, privilegeLevel: String?) {
        if (sessionId.isNotBlank()) {
            persistLastSessionId(sessionId)
        }
        val level = privilegeLevel?.uppercase(Locale.ROOT) ?: "STANDARD"
        currentPrivilegeLevel = level
        Log.i(TAG, "Terminal session info sessionId=$sessionId name=${name ?: ""} privilegeLevel=$level")

        if (level == "ELEVATED") {
            showElevatedModeWarning()
        }
    }

    private fun showElevatedModeWarning() {
        Toast.makeText(
            this,
            getString(R.string.terminal_elevated_mode_warning),
            Toast.LENGTH_LONG
        ).show()
    }

    override fun onRequestHideKeyboard() {
        val webView = terminalWebView ?: return
        webView.clearFocus()
        val imm = getSystemService(InputMethodManager::class.java)
        imm?.hideSoftInputFromWindow(webView.windowToken, 0)
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
        externalSessionStore.deleteByProfile(profileId)
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
        return SessionSelection(
            profileId = currentTerminalProfileId,
            sessionId = lastSessionId,
            sessionMode = currentSessionMode(),
            cwd = currentSessionCwd()
        )
    }

    override fun onOpenSession(selection: SessionSelection) {
        openSessionInTerminal(selection)
    }

    override fun onUpdateSessionSelection(selection: SessionSelection) {
        updateSessionSelection(selection)
    }

    private fun showTerminalScreen(injectConfig: Boolean = true) {
        showMainFragment(TAG_TERMINAL)
        currentScreen = ScreenMode.TERMINAL
        applyTerminalChromeMode()
        reloadTerminalSurfaceIfNeeded(forceReload = false)
        if (injectConfig && currentTerminalType() == TerminalType.TERMLINK_WS) {
            terminalWebView?.let { injectTerminalConfigIfChanged(it) }
        }
    }

    private fun showSettingsScreen() {
        closeSessionsDrawerIfOpen()
        showMainFragment(TAG_SETTINGS)
        currentScreen = ScreenMode.SETTINGS
        applyTerminalChromeMode()
    }

    private fun markUserActive() {
        if (!isActivityVisible) return
        enableKeepScreenOn()
        rescheduleIdleTimeout()
    }

    private fun rescheduleIdleTimeout() {
        val handler = idleHandler ?: return
        val timeout = idleTimeoutRunnable ?: return
        handler.removeCallbacks(timeout)
        handler.postDelayed(timeout, IDLE_DIM_DELAY_MS)
    }

    private fun onIdleTimeout() {
        if (!isActivityVisible) return
        disableKeepScreenOn()
    }

    private fun enableKeepScreenOn() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun disableKeepScreenOn() {
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
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
        if (inject && currentScreen == ScreenMode.TERMINAL) {
            reloadTerminalSurfaceIfNeeded(forceReload = false)
        }
    }

    private fun injectTerminalConfigIfChanged(webView: WebView, force: Boolean = false) {
        if (currentTerminalType() != TerminalType.TERMLINK_WS) {
            return
        }
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
            profile?.terminalType?.name.orEmpty(),
            profile?.authType?.name.orEmpty(),
            profile?.basicUsername.orEmpty(),
            profile?.mtlsEnabled?.toString().orEmpty(),
            profile?.allowedHosts.orEmpty(),
            lastSessionId,
            currentSessionMode().wireValue,
            currentSessionCwd().orEmpty(),
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
                .put("terminalType", profile.terminalType.name)
                .put("authType", profile.authType.name)
                .put("basicUsername", profile.basicUsername)
                .put("mtlsEnabled", profile.mtlsEnabled)
                .put("allowedHosts", profile.allowedHosts)
        }
        json.put("terminalType", profile?.terminalType?.name ?: TerminalType.TERMLINK_WS.name)
        json.put("sessionMode", currentSessionMode().wireValue)
        json.put("cwd", currentSessionCwd())
        json.put("serverUrl", resolveInjectedServerUrl(profile))
        json.put("sessionId", lastSessionId)
        json.put("activeProfile", activeProfileJson)
        json.put("historyEnabled", true)

        // Inject auth header so WebView JS can authenticate fetch() calls
        if (profile != null && profile.authType == com.termlink.app.data.AuthType.BASIC) {
            val username = profile.basicUsername.trim()
            val password = basicCredentialStore.getPassword(profile.id).orEmpty()
            if (username.isNotBlank() && password.isNotBlank()) {
                val encoded = android.util.Base64.encodeToString(
                    "$username:$password".toByteArray(Charsets.UTF_8),
                    android.util.Base64.NO_WRAP
                )
                json.put("authHeader", "Basic $encoded")
            }
        }

        return json.toString()
    }

    private fun resolveInjectedServerUrl(profile: ServerProfile?): String {
        if (profile == null) return ""
        if (profile.terminalType != TerminalType.TERMLINK_WS) return ""
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

    private fun resolveInitialSessionMode(): SessionMode {
        val fromUri = intent?.data?.getQueryParameter("sessionMode")
        if (!fromUri.isNullOrBlank()) {
            return SessionMode.fromWireValue(fromUri)
        }
        val fromExtra = intent?.getStringExtra("sessionMode")
        if (!fromExtra.isNullOrBlank()) {
            return SessionMode.fromWireValue(fromExtra)
        }
        return SessionMode.fromWireValue(
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString(PREF_LAST_SESSION_MODE, SessionMode.CODEX.wireValue)
        )
    }

    private fun resolveInitialSessionCwd(): String? {
        val fromUri = intent?.data?.getQueryParameter("cwd")
        if (!fromUri.isNullOrBlank()) {
            return fromUri.trim()
        }
        val fromExtra = intent?.getStringExtra("cwd")
        if (!fromExtra.isNullOrBlank()) {
            return fromExtra.trim()
        }
        return getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getString(PREF_LAST_SESSION_CWD, null)
            ?.trim()
            ?.takeIf { it.isNotBlank() }
    }

    private fun persistLastSessionId(sessionId: String) {
        lastSessionId = sessionId
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_SESSION_ID, sessionId)
            .apply()
    }

    private fun persistLastSessionMode(sessionMode: SessionMode) {
        lastSessionMode = sessionMode
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_SESSION_MODE, sessionMode.wireValue)
            .apply()
    }

    private fun persistLastSessionCwd(cwd: String?) {
        lastSessionCwd = cwd?.trim()?.takeIf { it.isNotBlank() }
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_SESSION_CWD, lastSessionCwd)
            .apply()
    }

    private fun persistLastProfileId(profileId: String) {
        currentTerminalProfileId = profileId
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_PROFILE_ID, profileId)
            .apply()
    }

    private fun openSessionInTerminal(selection: SessionSelection) {
        updateSessionSelection(selection)
        touchExternalSessionIfNeeded(selection.profileId, selection.sessionId)
        closeSessionsDrawerIfOpen()
        showTerminalScreen(injectConfig = true)
    }

    private fun updateSessionSelection(selection: SessionSelection) {
        val profileId = selection.profileId
        val sessionId = selection.sessionId
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

        val selectedProfile = resolveProfileById(profileId)
        val normalizedMode = if (
            selectedProfile?.terminalType == TerminalType.TERMLINK_WS &&
            sessionId.isNotBlank()
        ) {
            selection.sessionMode
        } else {
            SessionMode.TERMINAL
        }
        if (normalizedMode != lastSessionMode) {
            persistLastSessionMode(normalizedMode)
            selectionChanged = true
        }

        val normalizedCwd = if (normalizedMode == SessionMode.CODEX) {
            selection.cwd?.trim()?.takeIf { it.isNotBlank() }
        } else {
            null
        }
        if (normalizedCwd != lastSessionCwd) {
            persistLastSessionCwd(normalizedCwd)
            selectionChanged = true
        }

        if (selectionChanged && currentScreen == ScreenMode.TERMINAL) {
            updateStatus(defaultBridgeIdleStatus())
            reloadTerminalSurfaceIfNeeded(forceReload = false)
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
            if (BuildConfig.DEBUG) {
                Log.d(
                    TAG,
                    "Insets updated: ime=${imeInsets.bottom}, screen=$currentScreen"
                )
            }
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
            quickToolbarButton?.visibility = View.GONE
            statusTextView?.text = getString(R.string.settings_screen_title)
            backButton?.contentDescription = getString(R.string.settings_back_button)
            return
        }

        backButton?.visibility = View.GONE
        sessionsDrawerButton?.visibility = if (isTerminalChromeCompact) View.GONE else View.VISIBLE
        settingsButton?.visibility = View.VISIBLE
        quickToolbarButton?.visibility = if (
            currentTerminalType() == TerminalType.TERMLINK_WS &&
            currentSessionMode() == SessionMode.TERMINAL
        ) {
            View.VISIBLE
        } else {
            View.GONE
        }
        sessionsDrawerButton?.contentDescription = getString(R.string.sessions_panel_button)
        statusTextView?.text = terminalStatusText
    }

    private fun toggleQuickToolbar() {
        if (currentTerminalType() != TerminalType.TERMLINK_WS || currentSessionMode() != SessionMode.TERMINAL) {
            return
        }
        quickToolbarVisible = !quickToolbarVisible
        applyQuickToolbarToWebView()
    }

    private fun applyQuickToolbarToWebView() {
        if (currentTerminalType() != TerminalType.TERMLINK_WS || currentSessionMode() != SessionMode.TERMINAL) {
            return
        }
        val webView = terminalWebView ?: return
        val visible = quickToolbarVisible
        webView.evaluateJavascript(
            "window.__setQuickToolbarVisible($visible)",
            null
        )
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
            ScreenMode.TERMINAL -> imeInsets.bottom
        }
        container.setPadding(
            fragmentContainerBasePaddingLeft,
            fragmentContainerBasePaddingTop,
            fragmentContainerBasePaddingRight,
            fragmentContainerBasePaddingBottom + contentBottomInset
        )

        if (currentScreen == ScreenMode.TERMINAL) {
            notifyTerminalViewportChanged()
        }
    }

    private fun notifyTerminalViewportChanged() {
        val webView = terminalWebView ?: return
        val script = """
            (function() {
                if (typeof window.__onNativeViewportChanged === 'function') {
                    window.__onNativeViewportChanged();
                } else {
                    window.dispatchEvent(new Event('resize'));
                }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    private fun isInsecureActiveProfileTransport(): Boolean {
        val profile = resolveTerminalProfile() ?: return false
        if (profile.terminalType != TerminalType.TERMLINK_WS) return false
        val baseUrl = profile.baseUrl.trim().lowercase(Locale.ROOT)
        return baseUrl.startsWith("http://")
    }

    private fun handleTerminalError(code: String, message: String?) {
        val resolvedCode = code.trim().uppercase(Locale.ROOT).ifBlank { "UNKNOWN" }
        val readable = mapTerminalErrorMessage(resolvedCode, message)
        if (isCodexSessionActive()) {
            updateStatus(getString(R.string.codex_state_error, readable))
        } else {
            updateStatus(getString(R.string.terminal_state_error, readable))
        }
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

    private fun currentTerminalType(): TerminalType {
        return resolveTerminalProfile()?.terminalType ?: TerminalType.TERMLINK_WS
    }

    private fun currentSessionMode(): SessionMode {
        if (currentTerminalType() != TerminalType.TERMLINK_WS) {
            return SessionMode.TERMINAL
        }
        // 如果 lastSessionId 为空但 lastSessionMode 是 CODEX，也返回 CODEX
        // 这样首次启动时可以进入 CODEX 模式
        return lastSessionMode
    }

    private fun currentSessionCwd(): String? {
        return if (currentSessionMode() == SessionMode.CODEX) {
            lastSessionCwd
        } else {
            null
        }
    }

    private fun isCodexSessionActive(): Boolean {
        return currentTerminalType() == TerminalType.TERMLINK_WS &&
            currentSessionMode() == SessionMode.CODEX
    }

    private fun defaultBridgeIdleStatus(): String {
        return if (isCodexSessionActive()) {
            getString(R.string.codex_state_idle)
        } else {
            getString(R.string.terminal_state_idle)
        }
    }

    private fun resolveProfileById(profileId: String): ServerProfile? {
        if (profileId.isBlank()) return null
        val state = serverConfigState ?: serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == profileId }
    }

    private fun reloadTerminalSurfaceIfNeeded(forceReload: Boolean) {
        val webView = terminalWebView ?: return
        val profile = resolveTerminalProfile()
        val type = profile?.terminalType ?: TerminalType.TERMLINK_WS
        applyWebViewDarkModeForType(webView, type)
        val target = if (type == TerminalType.TERMLINK_WS) {
            if (currentSessionMode() == SessionMode.CODEX) {
                CODEX_URL
            } else {
                TERMINAL_URL
            }
        } else {
            profile?.baseUrl?.trim().orEmpty()
        }

        if (type == TerminalType.EXTERNAL_WEB && target.isBlank()) {
            updateStatus(
                getString(
                    R.string.terminal_state_error,
                    getString(R.string.terminal_error_external_url_empty)
                )
            )
            val blankSignature = buildTerminalLoadSignature(profile, type, ABOUT_BLANK_URL)
            if (forceReload || loadedTerminalSignature != blankSignature) {
                loadedTerminalSignature = blankSignature
                webView.loadUrl(ABOUT_BLANK_URL)
            }
            return
        }

        val signature = buildTerminalLoadSignature(profile, type, target)
        val shouldLoad = forceReload || loadedTerminalSignature != signature
        if (shouldLoad) {
            loadedTerminalSignature = signature
            if (type == TerminalType.EXTERNAL_WEB) {
                val headers = buildExternalWebHeaders(profile)
                if (headers.isNotEmpty()) {
                    webView.loadUrl(target, headers)
                } else {
                    webView.loadUrl(target)
                }
            } else {
                webView.loadUrl(target)
            }
            return
        }

        if (type == TerminalType.TERMLINK_WS) {
            injectTerminalConfigIfChanged(webView)
            applyQuickToolbarToWebView()
        } else if (profile != null) {
            updateStatus(getString(R.string.terminal_state_external_opened, profile.name))
        }
    }

    private fun buildTerminalLoadSignature(
        profile: ServerProfile?,
        type: TerminalType,
        target: String
    ): String {
        if (type != TerminalType.EXTERNAL_WEB) {
            return "${type.name}|$target"
        }
        val authType = profile?.authType ?: AuthType.NONE
        val username = profile?.basicUsername?.trim().orEmpty()
        val password = if (authType == AuthType.BASIC && profile != null) {
            basicCredentialStore.getPassword(profile.id).orEmpty()
        } else {
            ""
        }
        val passwordFingerprint = fingerprintSecret(password)
        return listOf(type.name, target, authType.name, username, passwordFingerprint).joinToString("|")
    }

    private fun fingerprintSecret(secret: String): String {
        if (secret.isBlank()) return ""
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(secret.toByteArray(Charsets.UTF_8))
            digest.joinToString("") { byte -> "%02x".format(byte) }
        } catch (_: Exception) {
            secret.hashCode().toString()
        }
    }

    private fun touchExternalSessionIfNeeded(profileId: String, sessionId: String) {
        if (profileId.isBlank() || sessionId.isBlank()) return
        val state = serverConfigState ?: serverConfigStore.loadState()
        val profile = state.profiles.firstOrNull { it.id == profileId } ?: return
        if (profile.terminalType != TerminalType.EXTERNAL_WEB) return
        externalSessionStore.touch(profileId, sessionId)
    }

    private fun applyWebViewDarkModeForType(webView: WebView, type: TerminalType) {
        val enableDarkMode = type == TerminalType.EXTERNAL_WEB
        val settings = webView.settings
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, enableDarkMode)
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(
                settings,
                if (enableDarkMode) WebSettingsCompat.FORCE_DARK_ON else WebSettingsCompat.FORCE_DARK_OFF
            )
        }
    }

    private fun applyExternalDarkModeHints(webView: WebView) {
        if (currentTerminalType() != TerminalType.EXTERNAL_WEB) return
        val script = """
            (function() {
                try {
                    var root = document.documentElement;
                    if (root) {
                        root.style.colorScheme = 'dark';
                        root.classList.add('theme-dark');
                    }
                    if (document.body) {
                        document.body.style.colorScheme = 'dark';
                        document.body.classList.add('theme-dark');
                    }

                    var head = document.head || document.getElementsByTagName('head')[0];
                    if (head) {
                        var meta = document.querySelector('meta[name="color-scheme"]');
                        if (!meta) {
                            meta = document.createElement('meta');
                            meta.setAttribute('name', 'color-scheme');
                            head.appendChild(meta);
                        }
                        meta.setAttribute('content', 'dark');
                    }
                } catch (_) {}
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun buildExternalWebHeaders(profile: ServerProfile?): Map<String, String> {
        if (profile == null) return emptyMap()
        if (profile.terminalType != TerminalType.EXTERNAL_WEB) return emptyMap()
        if (profile.authType != AuthType.BASIC) return emptyMap()

        val username = profile.basicUsername.trim()
        val password = basicCredentialStore.getPassword(profile.id).orEmpty()
        if (username.isBlank() || password.isBlank()) return emptyMap()

        // Pre-populate WebView auth cache to improve handling of server BASIC challenges.
        try {
            val host = URI(profile.baseUrl.trim()).host.orEmpty()
            if (host.isNotBlank()) {
                terminalWebView?.setHttpAuthUsernamePassword(host, "", username, password)
            }
        } catch (_: Exception) {
            // ignore malformed URL; header injection path still applies
        }

        val encoded = android.util.Base64.encodeToString(
            "$username:$password".toByteArray(Charsets.UTF_8),
            android.util.Base64.NO_WRAP
        )
        return mapOf("Authorization" to "Basic $encoded")
    }

    companion object {
        private const val TERMINAL_URL = "file:///android_asset/public/terminal_client.html?v=65"
        private const val CODEX_URL = "file:///android_asset/public/codex_client.html?v=76"
        private const val ABOUT_BLANK_URL = "about:blank"
        private const val DEBUG_CLEAR_TERMINAL_CACHE_ON_LOAD = false
        private const val JS_BRIDGE_NAME = "TerminalEventBridge"
        private const val PREFS_NAME = "termlink_shell"
        private const val PREF_LAST_SESSION_ID = "last_session_id"
        private const val PREF_LAST_SESSION_MODE = "last_session_mode"
        private const val PREF_LAST_SESSION_CWD = "last_session_cwd"
        private const val PREF_LAST_PROFILE_ID = "last_profile_id"
        private const val TAG_SESSIONS_DRAWER = "sessions_drawer"
        private const val TAG_TERMINAL = "terminal"
        private const val TAG_SETTINGS = "settings"
        private const val TAG = "TermLinkShell"
    }
}

