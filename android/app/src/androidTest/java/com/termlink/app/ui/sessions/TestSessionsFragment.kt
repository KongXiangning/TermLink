package com.termlink.app.ui.sessions

class TestSessionsFragment(
    private val firstPaintScheduler: ControlledFirstPaintScheduler
) : SessionsFragment() {

    override fun postFirstPaint(task: Runnable) {
        firstPaintScheduler.post(task)
    }
}
