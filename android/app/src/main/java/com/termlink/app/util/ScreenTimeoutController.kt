package com.termlink.app.util

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.Window
import android.view.WindowManager

/** Applies the foreground-only screen timeout preference to one Activity window. */
class ScreenTimeoutController(
    context: Context,
    private val window: Window
) {
    private val appContext = context.applicationContext
    private val handler = Handler(Looper.getMainLooper())
    private var visible = false
    private val clearKeepScreenOn = Runnable {
        if (visible) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    fun onVisible() {
        visible = true
        refresh()
    }

    fun onHidden() {
        visible = false
        handler.removeCallbacks(clearKeepScreenOn)
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    fun onUserInteraction() {
        if (visible) {
            refresh()
        }
    }

    fun onPreferenceChanged() {
        if (visible) {
            refresh()
        }
    }

    fun dispose() {
        onHidden()
        handler.removeCallbacksAndMessages(null)
    }

    private fun refresh() {
        handler.removeCallbacks(clearKeepScreenOn)
        val timeoutMillis = UiPreferences.foregroundScreenTimeoutMillis(appContext)
        if (timeoutMillis == null) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            return
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        handler.postDelayed(clearKeepScreenOn, timeoutMillis)
    }
}
