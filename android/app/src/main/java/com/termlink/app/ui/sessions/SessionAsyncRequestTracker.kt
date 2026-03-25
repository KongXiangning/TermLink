package com.termlink.app.ui.sessions

internal class SessionAsyncRequestTracker {

    private var nextRefreshRequestId = 0
    private var activeRefreshRequestId = 0
    private var refreshInFlight = false

    private var nextActionRequestId = 0
    private var activeActionRequestId = 0
    private var actionInFlight = false

    @Synchronized
    fun hasInFlightWork(): Boolean = refreshInFlight || actionInFlight

    @Synchronized
    fun canStartRefresh(): Boolean = !hasInFlightWork()

    @Synchronized
    fun startRefresh(): Int {
        nextRefreshRequestId += 1
        activeRefreshRequestId = nextRefreshRequestId
        refreshInFlight = true
        return activeRefreshRequestId
    }

    @Synchronized
    fun isActiveRefresh(requestId: Int): Boolean = requestId == activeRefreshRequestId

    @Synchronized
    fun completeRefresh(requestId: Int): Boolean {
        if (requestId != activeRefreshRequestId) {
            return false
        }
        refreshInFlight = false
        return true
    }

    @Synchronized
    fun releaseRefreshForViewDestroy() {
        refreshInFlight = false
    }

    @Synchronized
    fun invalidateActions() {
        nextActionRequestId += 1
        activeActionRequestId = nextActionRequestId
        actionInFlight = false
    }

    @Synchronized
    fun canStartAction(): Boolean = !hasInFlightWork()

    @Synchronized
    fun startAction(): Int {
        nextActionRequestId += 1
        activeActionRequestId = nextActionRequestId
        actionInFlight = true
        return activeActionRequestId
    }

    @Synchronized
    fun completeAction(requestId: Int): Boolean {
        if (requestId != activeActionRequestId) {
            return false
        }
        actionInFlight = false
        return true
    }

    @Synchronized
    fun invalidateAll() {
        nextRefreshRequestId += 1
        activeRefreshRequestId = nextRefreshRequestId
        refreshInFlight = false
        invalidateActions()
    }
}
