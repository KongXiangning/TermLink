package com.termlink.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.MtlsOkHttpSupport
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import com.termlink.app.util.horizontalSafeInsets
import com.termlink.app.util.LocaleHelper
import com.termlink.app.util.setStatusBarHidden
import com.termlink.app.util.statusBarSafeTopInset
import com.termlink.app.web.MtlsWebViewClient
import org.json.JSONObject
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

class WorkspaceActivity : AppCompatActivity() {

    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private var workspaceWebView: WebView? = null
    private var profileId: String = ""
    private var sessionId: String = ""
    private var defaultEntryPath: String = ""
    private var lastResolvedLocale: String = LocaleHelper.resolveWebViewLocale()
    private var rootView: View? = null
    private var topBarView: View? = null
    private var topBarBasePaddingLeft: Int = 0
    private var topBarBasePaddingTop: Int = 0
    private var topBarBasePaddingRight: Int = 0
    private var topBarBasePaddingBottom: Int = 0
    private var backButtonBaseMarginStart: Int = 0
    private var titleContainerBaseMarginStart: Int = 0
    private var webViewBasePaddingLeft: Int = 0
    private var webViewBasePaddingTop: Int = 0
    private var webViewBasePaddingRight: Int = 0
    private var webViewBasePaddingBottom: Int = 0
    private var webViewBaseMarginBottom: Int = 0
    private var backButton: ImageButton? = null
    private var titleContainer: View? = null
    private val workspaceIoExecutor = Executors.newSingleThreadExecutor()
    private val workspaceHttpClient = OkHttpClient.Builder()
        .followRedirects(true)
        .followSslRedirects(true)
        .build()
    private lateinit var mtlsOkHttpSupport: MtlsOkHttpSupport

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContentView(R.layout.activity_workspace)

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        mtlsOkHttpSupport = MtlsOkHttpSupport(applicationContext)
        cleanupWorkspaceOpenCache()
        rootView = findViewById(R.id.workspace_root)
        topBarView = findViewById(R.id.workspace_top_bar)
        backButton = findViewById(R.id.btn_workspace_back)
        titleContainer = findViewById(R.id.workspace_title_container)
        profileId = savedInstanceState?.getString(STATE_PROFILE_ID).orEmpty()
            .ifBlank { intent?.getStringExtra(EXTRA_PROFILE_ID).orEmpty() }
        sessionId = savedInstanceState?.getString(STATE_SESSION_ID).orEmpty()
            .ifBlank { intent?.getStringExtra(EXTRA_SESSION_ID).orEmpty() }
        defaultEntryPath = savedInstanceState?.getString(STATE_DEFAULT_ENTRY_PATH).orEmpty()
            .ifBlank { intent?.getStringExtra(EXTRA_DEFAULT_ENTRY_PATH).orEmpty() }

        if (sessionId.isBlank()) {
            Toast.makeText(this, getString(R.string.workspace_activity_invalid_session), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val profile = resolveProfile()
        if (profile == null || profile.terminalType != TerminalType.TERMLINK_WS) {
            Toast.makeText(this, getString(R.string.workspace_activity_invalid_profile), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        backButton?.setOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
        findViewById<TextView>(R.id.workspace_toolbar_subtitle).text = getString(
            R.string.workspace_activity_subtitle,
            profile.name,
            sessionId
        )
        topBarView?.let { topBar ->
            topBarBasePaddingLeft = topBar.paddingLeft
            topBarBasePaddingTop = topBar.paddingTop
            topBarBasePaddingRight = topBar.paddingRight
            topBarBasePaddingBottom = topBar.paddingBottom
        }
        (backButton?.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
            backButtonBaseMarginStart = params.marginStart
        }
        (titleContainer?.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
            titleContainerBaseMarginStart = params.marginStart
        }

        val webView = findViewById<WebView>(R.id.workspace_webview)
        workspaceWebView = webView
        webViewBasePaddingLeft = webView.paddingLeft
        webViewBasePaddingTop = webView.paddingTop
        webViewBasePaddingRight = webView.paddingRight
        webViewBasePaddingBottom = webView.paddingBottom
        (webView.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
            webViewBaseMarginBottom = params.bottomMargin
        }
        configureWebView(webView)
        registerBackNavigation(webView)
        applySystemBarInsets()

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(LocaleHelper.appendLangParam(WORKSPACE_URL))
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(STATE_PROFILE_ID, profileId)
        outState.putString(STATE_SESSION_ID, sessionId)
        outState.putString(STATE_DEFAULT_ENTRY_PATH, defaultEntryPath)
        workspaceWebView?.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val newLocale = LocaleHelper.resolveWebViewLocale()
        if (newLocale != lastResolvedLocale) {
            lastResolvedLocale = newLocale
            workspaceWebView?.loadUrl(LocaleHelper.appendLangParam(WORKSPACE_URL))
        }
    }

    override fun onStart() {
        super.onStart()
        setStatusBarHidden(hidden = true, anchor = rootView)
        rootView?.post {
            rootView?.let(ViewCompat::requestApplyInsets)
        }
    }

    override fun onStop() {
        setStatusBarHidden(hidden = false, anchor = rootView)
        super.onStop()
    }

    override fun onDestroy() {
        if (isFinishing) {
            workspaceWebView?.destroy()
            workspaceWebView = null
        }
        workspaceIoExecutor.shutdownNow()
        super.onDestroy()
    }

    private fun configureWebView(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        webView.addJavascriptInterface(WorkspaceBridge(), WORKSPACE_BRIDGE_NAME)
        webView.webViewClient = object : MtlsWebViewClient(
            appContext = applicationContext,
            profileProvider = { resolveProfile() },
            basicPasswordProvider = { id -> basicCredentialStore.getPassword(id) }
        ) {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view != null) {
                    injectWorkspaceConfig(view)
                }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage?): Boolean {
                message ?: return false
                val payload = "${message.message()} -- From ${message.sourceId()}:${message.lineNumber()}"
                when (message.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> Log.e(TAG, payload)
                    ConsoleMessage.MessageLevel.WARNING -> Log.w(TAG, payload)
                    ConsoleMessage.MessageLevel.LOG -> Log.i(TAG, payload)
                    else -> Log.d(TAG, payload)
                }
                return true
            }
        }
    }

    private fun applySystemBarInsets() {
        val root = rootView ?: return
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val rootInsets = ViewCompat.getRootWindowInsets(root) ?: insets
            val systemBars = rootInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val ime = rootInsets.getInsets(WindowInsetsCompat.Type.ime())
            val safeTopInset = rootInsets.statusBarSafeTopInset()
            val horizontalSafeInsets = rootInsets.horizontalSafeInsets()
            topBarView?.setPadding(
                topBarBasePaddingLeft + horizontalSafeInsets.left,
                topBarBasePaddingTop + safeTopInset,
                topBarBasePaddingRight + horizontalSafeInsets.right,
                topBarBasePaddingBottom
            )
            (backButton?.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
                params.marginStart = backButtonBaseMarginStart + horizontalSafeInsets.left
                backButton?.layoutParams = params
            }
            (titleContainer?.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
                params.marginStart = titleContainerBaseMarginStart + horizontalSafeInsets.left
                titleContainer?.layoutParams = params
            }
            workspaceWebView?.setPadding(
                webViewBasePaddingLeft,
                webViewBasePaddingTop,
                webViewBasePaddingRight,
                webViewBasePaddingBottom + systemBars.bottom
            )
            (workspaceWebView?.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { params ->
                params.bottomMargin = webViewBaseMarginBottom + maxOf(0, ime.bottom - systemBars.bottom)
                workspaceWebView?.layoutParams = params
            }
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    private fun injectWorkspaceConfig(webView: WebView) {
        val configJson = buildWorkspaceConfigJson().toString()
        val script = """
            (function() {
                window.__TERMLINK_CONFIG__ = $configJson;
                if (typeof window.__applyWorkspaceConfig === 'function') {
                    window.__applyWorkspaceConfig(window.__TERMLINK_CONFIG__);
                }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    private fun buildWorkspaceConfigJson(): JSONObject {
        val json = JSONObject()
        val profile = resolveProfile()
        json.put("sessionId", sessionId)
        json.put("serverUrl", profile?.baseUrl.orEmpty())
        json.put("hostSurface", "android")
        if (defaultEntryPath.isNotBlank()) {
            json.put("defaultEntryPath", defaultEntryPath)
        }
        val authHeader = buildAuthHeader(profile)
        if (!authHeader.isNullOrBlank()) {
            json.put("authHeader", authHeader)
        }
        return json
    }

    private fun registerBackNavigation(webView: WebView) {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "Boolean(window.__workspaceBack && window.__workspaceBack())"
                ) { handled ->
                    if (handled == "true") {
                        return@evaluateJavascript
                    }
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        })
    }

    private inner class WorkspaceBridge {
        @JavascriptInterface
        fun openWorkspaceFile(relativePath: String?, requestedMimeType: String?) {
            val safePath = WorkspaceFileOpenPolicy.normalizeRelativePath(relativePath)
            if (safePath == null) {
                showWorkspaceToast(R.string.workspace_activity_open_failed)
                return
            }
            workspaceIoExecutor.execute {
                try {
                    val cachedFile = downloadWorkspaceFile(safePath)
                    runOnUiThread {
                        openCachedWorkspaceFile(cachedFile, WorkspaceFileOpenPolicy.normalizeMimeType(requestedMimeType))
                    }
                } catch (error: Exception) {
                    Log.e(TAG, "Failed to cache workspace file path=$safePath", error)
                    showWorkspaceToast(R.string.workspace_activity_open_failed)
                }
            }
        }

        @JavascriptInterface
        fun openExternalUrl(rawUrl: String?) {
            val uri = rawUrl?.trim()?.let(Uri::parse) ?: return
            if (uri.scheme?.lowercase() !in ALLOWED_EXTERNAL_SCHEMES) {
                return
            }
            runOnUiThread {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                } catch (error: ActivityNotFoundException) {
                    showWorkspaceToast(R.string.workspace_activity_open_failed)
                }
            }
        }
    }

    private fun downloadWorkspaceFile(relativePath: String): File {
        val profile = resolveProfile() ?: throw IOException("Workspace profile is unavailable.")
        val baseUrl = profile.baseUrl.toHttpUrlOrNull() ?: throw IOException("Workspace server URL is invalid.")
        val requestUrl = baseUrl.newBuilder()
            .addPathSegment("api")
            .addPathSegment("sessions")
            .addPathSegment(sessionId)
            .addPathSegment("workspace")
            .addPathSegment("file-content")
            .addQueryParameter("path", relativePath)
            .addQueryParameter("download", "true")
            .build()
        val request = Request.Builder()
            .url(requestUrl)
            .apply { buildAuthHeader(profile)?.let { header("Authorization", it) } }
            .get()
            .build()
        val client = mtlsOkHttpSupport.configure(workspaceHttpClient, profile, requestUrl.toString())
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Workspace download failed with HTTP ${response.code}.")
            }
            val body = response.body ?: throw IOException("Workspace download returned an empty response.")
            if (body.contentLength() > MAX_WORKSPACE_OPEN_BYTES) {
                throw IOException("Workspace file exceeds the native open limit.")
            }
            val cacheDirectory = workspaceOpenCacheDirectory().apply { mkdirs() }
            val safeName = relativePath.substringAfterLast('/')
                .replace(Regex("[^A-Za-z0-9._-]"), "_")
                .take(120)
                .ifBlank { "workspace-file" }
            val outputFile = File(cacheDirectory, "${System.currentTimeMillis()}-$safeName")
            body.byteStream().use { input ->
                outputFile.outputStream().buffered().use { output ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    var copied = 0L
                    while (true) {
                        val read = input.read(buffer)
                        if (read < 0) break
                        copied += read
                        if (copied > MAX_WORKSPACE_OPEN_BYTES) {
                            outputFile.delete()
                            throw IOException("Workspace file exceeds the native open limit.")
                        }
                        output.write(buffer, 0, read)
                    }
                }
            }
            return outputFile
        }
    }

    private fun openCachedWorkspaceFile(file: File, mimeType: String) {
        try {
            val contentUri = FileProvider.getUriForFile(
                this,
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                file
            )
            startActivity(
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(contentUri, mimeType)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            )
        } catch (error: ActivityNotFoundException) {
            showWorkspaceToast(R.string.workspace_activity_no_viewer)
        } catch (error: IllegalArgumentException) {
            Log.e(TAG, "Workspace cache file is outside FileProvider roots", error)
            showWorkspaceToast(R.string.workspace_activity_open_failed)
        }
    }

    private fun workspaceOpenCacheDirectory(): File = File(cacheDir, WORKSPACE_OPEN_CACHE_DIRECTORY)

    private fun cleanupWorkspaceOpenCache() {
        val cutoff = System.currentTimeMillis() - WORKSPACE_OPEN_CACHE_MAX_AGE_MS
        workspaceOpenCacheDirectory().listFiles()?.forEach { file ->
            if (file.isFile && file.lastModified() < cutoff) {
                file.delete()
            }
        }
    }

    private fun showWorkspaceToast(messageRes: Int) {
        runOnUiThread {
            Toast.makeText(this, getString(messageRes), Toast.LENGTH_SHORT).show()
        }
    }

    private fun buildAuthHeader(profile: ServerProfile?): String? {
        if (profile == null || profile.authType != AuthType.BASIC) {
            return null
        }
        val username = profile.basicUsername.trim()
        val password = basicCredentialStore.getPassword(profile.id).orEmpty()
        if (username.isBlank() || password.isBlank()) {
            return null
        }
        val encoded = Base64.encodeToString(
            "$username:$password".toByteArray(Charsets.UTF_8),
            Base64.NO_WRAP
        )
        return "Basic $encoded"
    }

    private fun resolveProfile(): ServerProfile? {
        if (profileId.isBlank()) {
            return null
        }
        val state = serverConfigStore.loadState()
        return state.profiles.firstOrNull { it.id == profileId }
    }

    companion object {
        const val EXTRA_PROFILE_ID = "profileId"
        const val EXTRA_SESSION_ID = "sessionId"
        const val EXTRA_DEFAULT_ENTRY_PATH = "defaultEntryPath"

        fun newIntent(
            context: android.content.Context,
            profileId: String,
            sessionId: String,
            defaultEntryPath: String? = null
        ) = android.content.Intent(context, WorkspaceActivity::class.java).apply {
            putExtra(EXTRA_PROFILE_ID, profileId)
            putExtra(EXTRA_SESSION_ID, sessionId)
            defaultEntryPath?.takeIf { it.isNotBlank() }?.let {
                putExtra(EXTRA_DEFAULT_ENTRY_PATH, it)
            }
        }

        private const val STATE_PROFILE_ID = "workspace_profile_id"
        private const val STATE_SESSION_ID = "workspace_session_id"
        private const val STATE_DEFAULT_ENTRY_PATH = "workspace_default_entry_path"
        private const val WORKSPACE_URL = "file:///android_asset/public/workspace.html?v=4"
        private const val WORKSPACE_BRIDGE_NAME = "TermLinkWorkspace"
        private const val WORKSPACE_OPEN_CACHE_DIRECTORY = "workspace-open"
        private const val MAX_WORKSPACE_OPEN_BYTES = 25L * 1024L * 1024L
        private const val WORKSPACE_OPEN_CACHE_MAX_AGE_MS = 24L * 60L * 60L * 1000L
        private val ALLOWED_EXTERNAL_SCHEMES = setOf("http", "https", "mailto")
        private const val TAG = "WorkspaceActivity"
    }
}

internal object WorkspaceFileOpenPolicy {
    private val mimeTypePattern = Regex("^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$")

    fun normalizeRelativePath(value: String?): String? {
        val normalized = value?.trim()?.replace('\\', '/').orEmpty()
        return normalized.takeIf(::isSafeRelativePath)
    }

    fun isSafeRelativePath(value: String): Boolean {
        if (value.isBlank() || value.length > 2048 || value.startsWith('/') || value.startsWith('\\')) {
            return false
        }
        if (Regex("^[A-Za-z]:[\\\\/]").containsMatchIn(value)) {
            return false
        }
        return value.split('/', '\\').none { it == ".." || it.equals(".git", ignoreCase = true) }
    }

    fun normalizeMimeType(value: String?): String {
        val normalized = value?.trim()?.lowercase().orEmpty()
        return if (mimeTypePattern.matches(normalized)) normalized else "application/octet-stream"
    }
}
