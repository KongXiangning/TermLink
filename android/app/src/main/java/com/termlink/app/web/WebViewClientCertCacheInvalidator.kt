package com.termlink.app.web

import android.webkit.WebView

class WebViewClientCertCacheInvalidator(
    private val platformClearer: ((Runnable) -> Unit)? = null
) {

    private val lock = Any()
    private var clearInFlight = false
    private var pendingAction: (() -> Unit)? = null

    fun invalidate(onComplete: (() -> Unit)? = null) {
        val startClear = synchronized(lock) {
            pendingAction = mergeActions(pendingAction, onComplete)
            if (clearInFlight) {
                false
            } else {
                clearInFlight = true
                true
            }
        }
        if (!startClear) {
            return
        }
        clearPlatformCache(
            Runnable {
                val action = synchronized(lock) {
                    clearInFlight = false
                    val next = pendingAction
                    pendingAction = null
                    next
                }
                action?.invoke()
            }
        )
    }

    private fun clearPlatformCache(onComplete: Runnable) {
        val clearer = platformClearer
        if (clearer != null) {
            clearer.invoke(onComplete)
            return
        }
        WebView.clearClientCertPreferences(onComplete)
    }

    private fun mergeActions(
        existing: (() -> Unit)?,
        incoming: (() -> Unit)?
    ): (() -> Unit)? {
        if (existing == null) return incoming
        if (incoming == null) return existing
        return {
            existing.invoke()
            incoming.invoke()
        }
    }
}
