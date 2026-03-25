package com.termlink.app.ui.sessions

internal object SessionFirstPaintGate {

    fun shouldApply(
        isLatestRefreshRequest: Boolean,
        isViewActive: Boolean,
        callbackViewGeneration: Int,
        currentViewGeneration: Int,
        hasCompletedInitialLocalFirstPaint: Boolean
    ): Boolean {
        if (!isLatestRefreshRequest || !isViewActive) {
            return false
        }
        if (callbackViewGeneration != currentViewGeneration) {
            return false
        }
        return !hasCompletedInitialLocalFirstPaint
    }
}
