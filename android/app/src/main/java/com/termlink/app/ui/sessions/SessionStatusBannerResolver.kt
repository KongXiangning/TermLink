package com.termlink.app.ui.sessions

internal enum class SessionVisibleDataSource {
    NONE,
    CACHE,
    REMOTE
}

internal enum class SessionRefreshStatus {
    IDLE,
    LOADING,
    FAILED
}

internal enum class SessionStatusBanner {
    NONE,
    REFRESHING,
    STALE
}

internal object SessionStatusBannerResolver {

    fun resolve(
        visibleDataSource: SessionVisibleDataSource,
        refreshStatus: SessionRefreshStatus
    ): SessionStatusBanner {
        return when {
            visibleDataSource == SessionVisibleDataSource.CACHE &&
                refreshStatus == SessionRefreshStatus.LOADING -> SessionStatusBanner.REFRESHING

            visibleDataSource != SessionVisibleDataSource.NONE &&
                refreshStatus == SessionRefreshStatus.FAILED -> SessionStatusBanner.STALE

            else -> SessionStatusBanner.NONE
        }
    }
}
