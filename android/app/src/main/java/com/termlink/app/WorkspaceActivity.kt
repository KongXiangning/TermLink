package com.termlink.app

import android.content.res.Configuration
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import com.termlink.app.util.LocaleHelper
import com.termlink.app.web.MtlsWebViewClient
import org.json.JSONObject

class WorkspaceActivity : AppCompatActivity() {

    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private var workspaceWebView: WebView? = null
    private var profileId: String = ""
    private var sessionId: String = ""
    private var lastResolvedLocale: String = LocaleHelper.resolveWebViewLocale()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_workspace)

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        profileId = savedInstanceState?.getString(STATE_PROFILE_ID).orEmpty()
            .ifBlank { intent?.getStringExtra(EXTRA_PROFILE_ID).orEmpty() }
        sessionId = savedInstanceState?.getString(STATE_SESSION_ID).orEmpty()
            .ifBlank { intent?.getStringExtra(EXTRA_SESSION_ID).orEmpty() }

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

        findViewById<ImageButton>(R.id.btn_workspace_back).setOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
        findViewById<TextView>(R.id.workspace_toolbar_subtitle).text = getString(
            R.string.workspace_activity_subtitle,
            profile.name,
            sessionId
        )

        val webView = findViewById<WebView>(R.id.workspace_webview)
        workspaceWebView = webView
        configureWebView(webView)

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(LocaleHelper.appendLangParam(WORKSPACE_URL))
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(STATE_PROFILE_ID, profileId)
        outState.putString(STATE_SESSION_ID, sessionId)
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

    override fun onDestroy() {
        if (isFinishing) {
            workspaceWebView?.destroy()
            workspaceWebView = null
        }
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
        val authHeader = buildAuthHeader(profile)
        if (!authHeader.isNullOrBlank()) {
            json.put("authHeader", authHeader)
        }
        return json
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

        private const val STATE_PROFILE_ID = "workspace_profile_id"
        private const val STATE_SESSION_ID = "workspace_session_id"
        private const val WORKSPACE_URL = "file:///android_asset/public/workspace.html?v=1"
        private const val TAG = "WorkspaceActivity"
    }
}
