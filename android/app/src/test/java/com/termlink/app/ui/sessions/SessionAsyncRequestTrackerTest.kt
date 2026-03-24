package com.termlink.app.ui.sessions

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionAsyncRequestTrackerTest {

    @Test
    fun invalidateAllClearsRefreshAndAllowsNextRefresh() {
        val tracker = SessionAsyncRequestTracker()
        val firstRequestId = tracker.startRefresh()

        tracker.invalidateAll()

        assertFalse(tracker.completeRefresh(firstRequestId))
        assertTrue(tracker.canStartRefresh())
        assertTrue(tracker.completeRefresh(tracker.startRefresh()))
    }

    @Test
    fun staleRefreshCallbackCannotCompleteNewerRefresh() {
        val tracker = SessionAsyncRequestTracker()
        val firstRequestId = tracker.startRefresh()

        tracker.invalidateAll()
        val secondRequestId = tracker.startRefresh()

        assertFalse(tracker.completeRefresh(firstRequestId))
        assertTrue(tracker.completeRefresh(secondRequestId))
    }

    @Test
    fun invalidateAllClearsActionAndAllowsNextAction() {
        val tracker = SessionAsyncRequestTracker()
        val firstRequestId = tracker.startAction()

        tracker.invalidateAll()

        assertFalse(tracker.completeAction(firstRequestId))
        assertTrue(tracker.canStartAction())
        assertTrue(tracker.completeAction(tracker.startAction()))
    }

    @Test
    fun inFlightActionBlocksRefreshUntilCompleted() {
        val tracker = SessionAsyncRequestTracker()
        val actionRequestId = tracker.startAction()

        assertFalse(tracker.canStartRefresh())
        assertTrue(tracker.completeAction(actionRequestId))
        assertTrue(tracker.canStartRefresh())
    }

    @Test
    fun inFlightRefreshBlocksActionUntilCompleted() {
        val tracker = SessionAsyncRequestTracker()
        val refreshRequestId = tracker.startRefresh()

        assertFalse(tracker.canStartAction())
        assertTrue(tracker.completeRefresh(refreshRequestId))
        assertTrue(tracker.canStartAction())
    }
}
