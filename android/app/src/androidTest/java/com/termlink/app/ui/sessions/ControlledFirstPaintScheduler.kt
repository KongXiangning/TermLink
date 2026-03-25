package com.termlink.app.ui.sessions

import android.os.Handler
import android.os.Looper
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class ControlledFirstPaintScheduler : SessionFirstPaintScheduler {

    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile
    private var blockNextPost = false
    @Volatile
    private var blockedTask: Runnable? = null
    @Volatile
    private var blockedTaskLatch: CountDownLatch? = null

    override fun post(task: Runnable) {
        val latch = synchronized(this) {
            if (!blockNextPost) {
                null
            } else {
                blockNextPost = false
                blockedTask = task
                CountDownLatch(1).also { blockedTaskLatch = it }
            }
        }
        if (latch == null) {
            mainHandler.post(task)
            return
        }
        latch.countDown()
    }

    fun blockNextFirstPaint() {
        synchronized(this) {
            blockNextPost = true
            blockedTask = null
            blockedTaskLatch = null
        }
    }

    fun awaitBlockedFirstPaint(timeout: Long, unit: TimeUnit): Boolean {
        val timeoutNanos = unit.toNanos(timeout)
        val deadline = System.nanoTime() + timeoutNanos
        while (true) {
            val latch = synchronized(this) { blockedTaskLatch }
            if (latch != null) {
                val remainingNanos = deadline - System.nanoTime()
                if (remainingNanos <= 0L) {
                    return false
                }
                return latch.await(remainingNanos, TimeUnit.NANOSECONDS)
            }
            if (System.nanoTime() >= deadline) {
                return false
            }
            Thread.sleep(10L)
        }
    }

    fun releaseBlockedFirstPaint() {
        val task = synchronized(this) {
            val next = blockedTask
            blockedTask = null
            blockedTaskLatch = null
            next
        }
        if (task != null) {
            mainHandler.post(task)
        }
    }
}
