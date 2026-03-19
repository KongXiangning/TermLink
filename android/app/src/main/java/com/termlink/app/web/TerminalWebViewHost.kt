package com.termlink.app.web

import android.view.ViewGroup
import android.webkit.WebView

interface TerminalWebViewHost {
    fun getOrCreateTerminalWebView(): WebView
    fun attachTerminalWebView(container: ViewGroup)
    fun detachTerminalWebView()
}
