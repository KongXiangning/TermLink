package com.termlink.app.ui.sessions

class TestSessionsFragment(
    private val firstPaintScheduler: ControlledFirstPaintScheduler,
    private val cacheWriteScheduler: ControlledCacheWriteScheduler
) : SessionsFragment() {

    override fun postFirstPaint(task: Runnable) {
        firstPaintScheduler.post(task)
    }

    override fun postCacheWrite(task: Runnable) {
        cacheWriteScheduler.post(task)
    }
}
