package com.termlink.app

import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.commit
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.termlink.app.ui.sessions.SessionsFragment
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.ui.terminal.TerminalFragment
import com.termlink.app.web.MtlsWebViewClient
import com.termlink.app.web.TerminalWebViewHost

class MainShellActivity : AppCompatActivity(), TerminalWebViewHost {

    private var terminalWebView: WebView? = null
    private var terminalPageLoaded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_shell)

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
        webView.webViewClient = MtlsWebViewClient(applicationContext)
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

    companion object {
        private const val TERMINAL_URL = "file:///android_asset/public/index.html"
        private const val TAG_SESSIONS = "sessions"
        private const val TAG_TERMINAL = "terminal"
        private const val TAG_SETTINGS = "settings"
    }
}
