package com.termlink.app.ui.sessions

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class ControlledFirstPaintSchedulerTest {

    @Test
    fun awaitBlockedFirstPaintWaitsForDelayedLatchCreation() {
        val scheduler = ControlledFirstPaintScheduler()
        val executor = Executors.newSingleThreadExecutor()
        try {
            scheduler.blockNextFirstPaint()
            executor.execute {
                Thread.sleep(100L)
                scheduler.post(Runnable {})
            }

            assertTrue(scheduler.awaitBlockedFirstPaint(2, TimeUnit.SECONDS))
        } finally {
            scheduler.releaseBlockedFirstPaint()
            executor.shutdownNow()
        }
    }

    @Test
    fun awaitBlockedFirstPaintReturnsFalseOnTimeout() {
        val scheduler = ControlledFirstPaintScheduler()
        scheduler.blockNextFirstPaint()

        assertFalse(scheduler.awaitBlockedFirstPaint(100, TimeUnit.MILLISECONDS))
    }

    @Test
    fun releaseBlockedFirstPaintPostsBlockedTaskOnce() {
        val scheduler = ControlledFirstPaintScheduler()
        val taskRan = CountDownLatch(1)

        scheduler.blockNextFirstPaint()
        scheduler.post(Runnable { taskRan.countDown() })

        assertTrue(scheduler.awaitBlockedFirstPaint(2, TimeUnit.SECONDS))
        assertFalse(taskRan.await(100, TimeUnit.MILLISECONDS))

        scheduler.releaseBlockedFirstPaint()

        assertTrue(taskRan.await(2, TimeUnit.SECONDS))
    }
}
