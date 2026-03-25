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
    fun releaseRefreshForViewDestroyAllowsNextRefreshWithoutInvalidatingLatestRequest() {
        val tracker = SessionAsyncRequestTracker()
        val firstRequestId = tracker.startRefresh()

        tracker.releaseRefreshForViewDestroy()

        assertTrue(tracker.canStartRefresh())
        assertTrue(tracker.isActiveRefresh(firstRequestId))
        assertTrue(tracker.completeRefresh(firstRequestId))
    }

    @Test
    fun newerRefreshDropsOlderRefreshAfterViewDestroyRelease() {
        val tracker = SessionAsyncRequestTracker()
        val firstRequestId = tracker.startRefresh()

        tracker.releaseRefreshForViewDestroy()
        val secondRequestId = tracker.startRefresh()

        assertFalse(tracker.isActiveRefresh(firstRequestId))
        assertFalse(tracker.completeRefresh(firstRequestId))
        assertTrue(tracker.completeRefresh(secondRequestId))
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
    fun invalidateActionsClearsOnlyActionState() {
        val tracker = SessionAsyncRequestTracker()
        val refreshRequestId = tracker.startRefresh()
        val actionRequestId = tracker.startAction()

        tracker.invalidateActions()

        assertFalse(tracker.completeAction(actionRequestId))
        assertTrue(tracker.isActiveRefresh(refreshRequestId))
        assertTrue(tracker.completeRefresh(refreshRequestId))
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
