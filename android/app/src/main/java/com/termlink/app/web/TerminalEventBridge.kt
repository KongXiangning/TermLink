package com.termlink.app.web

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface

class TerminalEventBridge(
    private val listener: Listener,
    private val mainHandler: Handler = Handler(Looper.getMainLooper())
) {

    interface Listener {
        fun onConnectionState(state: String, detail: String?)
        fun onTerminalError(code: String, message: String?)
        fun onSessionInfo(sessionId: String, name: String?)
        fun onRequestHideKeyboard()
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
    fun onSessionInfo(sessionId: String?, name: String?) {
        dispatchOnMain {
            listener.onSessionInfo(sessionId.orEmpty(), name)
        }
    }

    @JavascriptInterface
    fun requestHideKeyboard() {
        dispatchOnMain {
            listener.onRequestHideKeyboard()
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
