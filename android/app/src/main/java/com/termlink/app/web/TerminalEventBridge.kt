package com.termlink.app.web

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface

class TerminalEventBridge(
    private val context: Context,
    private val listener: Listener,
    private val mainHandler: Handler = Handler(Looper.getMainLooper())
) {

    interface Listener {
        fun onConnectionState(state: String, detail: String?)
        fun onTerminalError(code: String, message: String?)
        fun onSessionInfo(sessionId: String, name: String?, privilegeLevel: String?)
        fun onRequestHideKeyboard()
        fun onCodexTaskState(status: String)
    }

    @JavascriptInterface
    fun onConnectionState(state: String?, detail: String?) {
        dispatchOnMain {
            listener.onConnectionState(state.orEmpty(), detail)
        }
    }

    @JavascriptInterface
    fun onTerminalError(code: String?, message: String?) {
        dispatchOnMain {
            listener.onTerminalError(code.orEmpty(), message)
        }
    }

    @JavascriptInterface
    fun onSessionInfo(sessionId: String?, name: String?, privilegeLevel: String?) {
        dispatchOnMain {
            listener.onSessionInfo(sessionId.orEmpty(), name, privilegeLevel)
        }
    }

    @JavascriptInterface
    fun requestHideKeyboard() {
        dispatchOnMain {
            listener.onRequestHideKeyboard()
        }
    }

    /** Clipboard access for the local terminal WebView. navigator.clipboard is
     * unavailable on some Android file:// WebViews, while the native service
     * remains available and is scoped to this trusted app surface. */
    @JavascriptInterface
    fun setClipboardText(text: String?) {
        val value = text.orEmpty()
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        clipboard?.setPrimaryClip(ClipData.newPlainText("TermLink terminal", value))
    }

    @JavascriptInterface
    fun getClipboardText(): String {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        return clipboard?.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString().orEmpty()
    }

    @JavascriptInterface
    fun onCodexTaskState(status: String?) {
        dispatchOnMain {
            listener.onCodexTaskState(status.orEmpty())
        }
    }

    private fun dispatchOnMain(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            block()
        } else {
            mainHandler.post(block)
        }
    }
}
