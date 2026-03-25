package com.termlink.app.ui.sessions

import org.junit.Assert.assertEquals
import org.junit.Test

class SessionStatusBannerResolverTest {

    @Test
    fun returnsRefreshingWhenCacheIsVisibleAndRefreshIsLoading() {
        assertEquals(
            SessionStatusBanner.REFRESHING,
            SessionStatusBannerResolver.resolve(
                visibleDataSource = SessionVisibleDataSource.CACHE,
                refreshStatus = SessionRefreshStatus.LOADING
            )
        )
    }

    @Test
    fun returnsStaleWhenVisibleCacheRefreshFails() {
        assertEquals(
            SessionStatusBanner.STALE,
            SessionStatusBannerResolver.resolve(
                visibleDataSource = SessionVisibleDataSource.CACHE,
                refreshStatus = SessionRefreshStatus.FAILED
            )
        )
    }

    @Test
    fun returnsStaleWhenVisibleRemoteContentRefreshFails() {
        assertEquals(
            SessionStatusBanner.STALE,
            SessionStatusBannerResolver.resolve(
                visibleDataSource = SessionVisibleDataSource.REMOTE,
                refreshStatus = SessionRefreshStatus.FAILED
            )
        )
    }

    @Test
    fun returnsNoneWhenNoContentIsVisibleAndRefreshFails() {
        assertEquals(
            SessionStatusBanner.NONE,
            SessionStatusBannerResolver.resolve(
                visibleDataSource = SessionVisibleDataSource.NONE,
                refreshStatus = SessionRefreshStatus.FAILED
            )
        )
    }
}
