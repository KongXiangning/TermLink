package com.termlink.app.data

object SessionSummaryOrdering {

    fun normalize(sessions: List<SessionSummary>): List<SessionSummary> {
        return sessions.sortedWith(
            compareByDescending<SessionSummary> { it.lastActiveAt }
                .thenByDescending { it.createdAt }
                .thenBy { it.name.lowercase() }
        )
    }
}
