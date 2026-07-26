package com.termlink.app.util

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Records a bounded diagnostic event when the main thread stops processing. */
object MainThreadWatchdog {
    private const val STALL_THRESHOLD_MS = 5_000L
    private const val CHECK_INTERVAL_MS = 2_000L
    private const val REPORT_COOLDOWN_MS = 30_000L
    private val mainHandler = Handler(Looper.getMainLooper())
    private val scheduler = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "termlink-main-watchdog").apply { isDaemon = true }
    }
    @Volatile private var lastHeartbeatAt = 0L
    @Volatile private var lastReportAt = 0L
    @Volatile private var started = false

    fun start() {
        if (started || !PersistentDiagnosticLog.isEnabled()) return
        started = true
        lastHeartbeatAt = SystemClock.elapsedRealtime()
        scheduler.scheduleAtFixedRate({
            val now = SystemClock.elapsedRealtime()
            mainHandler.post { lastHeartbeatAt = SystemClock.elapsedRealtime() }
            val stalledFor = now - lastHeartbeatAt
            if (stalledFor < STALL_THRESHOLD_MS || now - lastReportAt < REPORT_COOLDOWN_MS) return@scheduleAtFixedRate
            lastReportAt = now
            val stack = Looper.getMainLooper().thread.stackTrace
                .take(24)
                .joinToString("|") { frame -> "${frame.className}.${frame.methodName}" }
            PersistentDiagnosticLog.event(
                "app",
                "android.main_thread.stalled",
                mapOf("stalledMs" to stalledFor, "stack" to stack),
                level = "warn",
                critical = true
            )
        }, CHECK_INTERVAL_MS, CHECK_INTERVAL_MS, TimeUnit.MILLISECONDS)
    }
}
