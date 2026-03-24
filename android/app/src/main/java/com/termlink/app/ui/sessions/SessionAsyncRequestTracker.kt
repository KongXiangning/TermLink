package com.termlink.app.ui.sessions

internal class SessionAsyncRequestTracker {

    private var nextRefreshRequestId = 0
    private var activeRefreshRequestId = 0
    private var refreshInFlight = false

    private var nextActionRequestId = 0
    private var activeActionRequestId = 0
    private var actionInFlight = false

    fun hasInFlightWork(): Boolean = refreshInFlight || actionInFlight

    fun canStartRefresh(): Boolean = !hasInFlightWork()

    fun startRefresh(): Int {
        nextRefreshRequestId += 1
        activeRefreshRequestId = nextRefreshRequestId
        refreshInFlight = true
        return activeRefreshRequestId
    }

    fun isActiveRefresh(requestId: Int): Boolean = requestId == activeRefreshRequestId

    fun completeRefresh(requestId: Int): Boolean {
        if (requestId != activeRefreshRequestId) {
            return false
        }
        refreshInFlight = false
        return true
    }

    fun canStartAction(): Boolean = !hasInFlightWork()

    fun startAction(): Int {
        nextActionRequestId += 1
        activeActionRequestId = nextActionRequestId
        actionInFlight = true
        return activeActionRequestId
    }

    fun completeAction(requestId: Int): Boolean {
        if (requestId != activeActionRequestId) {
            return false
        }
        actionInFlight = false
        return true
    }

    fun invalidateAll() {
        nextRefreshRequestId += 1
        activeRefreshRequestId = nextRefreshRequestId
        refreshInFlight = false

        nextActionRequestId += 1
        activeActionRequestId = nextActionRequestId
        actionInFlight = false
    }
}
