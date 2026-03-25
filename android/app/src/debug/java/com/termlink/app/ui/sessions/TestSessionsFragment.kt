package com.termlink.app.ui.sessions

import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionRef

internal object TestSessionsFragmentHooks {
    @Volatile
    var firstPaintScheduler: ControlledFirstPaintScheduler? = null

    @Volatile
    var cacheWriteScheduler: ControlledCacheWriteScheduler? = null
}

class TestSessionsFragment : SessionsFragment() {

    override fun postFirstPaint(task: Runnable) {
        requireNotNull(TestSessionsFragmentHooks.firstPaintScheduler) {
            "firstPaintScheduler not configured"
        }.post(task)
    }

    override fun postCacheWrite(task: Runnable) {
        requireNotNull(TestSessionsFragmentHooks.cacheWriteScheduler) {
            "cacheWriteScheduler not configured"
        }.post(task)
    }

    fun simulateCreateSessionSuccess(
        profile: ServerProfile,
        requestedName: String,
        requestedCwd: String?,
        created: SessionRef
    ) {
        handleCreateSessionSuccess(
            profile = profile,
            requestedName = requestedName,
            requestedCwd = requestedCwd,
            created = created
        )
    }
}
