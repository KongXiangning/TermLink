package com.termlink.app.ui.sessions

import android.os.Handler

fun interface SessionFirstPaintScheduler {
    fun post(task: Runnable)
}

interface SessionFirstPaintSchedulerProvider {
    fun provideSessionFirstPaintScheduler(defaultScheduler: SessionFirstPaintScheduler): SessionFirstPaintScheduler
}

fun defaultSessionFirstPaintScheduler(handler: Handler): SessionFirstPaintScheduler {
    return SessionFirstPaintScheduler { task -> handler.post(task) }
}
