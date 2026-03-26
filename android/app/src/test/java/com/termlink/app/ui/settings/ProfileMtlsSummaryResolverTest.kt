package com.termlink.app.ui.settings

import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import org.junit.Assert.assertEquals
import org.junit.Test

class ProfileMtlsSummaryResolverTest {

    @Test
    fun disabledProfileResolvesDisabledStatus() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = false, certificateDisplayName = "client.p12"),
            certificatePresent = false,
            passwordPresent = false
        )

        assertEquals(MtlsConfigStatus.DISABLED, summary.status)
        assertEquals("", summary.certificateDisplayName)
    }

    @Test
    fun configuredProfileIncludesCertificateDisplayName() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = true, certificateDisplayName = "client.p12"),
            certificatePresent = true,
            passwordPresent = true
        )

        assertEquals(MtlsConfigStatus.CONFIGURED, summary.status)
        assertEquals("client.p12", summary.certificateDisplayName)
    }

    @Test
    fun profileWithOnlyCertificateIsPendingPassword() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = true, certificateDisplayName = "client.p12"),
            certificatePresent = true,
            passwordPresent = false
        )

        assertEquals(MtlsConfigStatus.PENDING_PASSWORD, summary.status)
    }

    @Test
    fun profileWithOnlyPasswordIsPendingCertificate() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = true, certificateDisplayName = "client.p12"),
            certificatePresent = false,
            passwordPresent = true
        )

        assertEquals(MtlsConfigStatus.PENDING_CERTIFICATE, summary.status)
    }

    @Test
    fun profileWithNeitherCertificateNorPasswordIsPendingBoth() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = true, certificateDisplayName = "client.p12"),
            certificatePresent = false,
            passwordPresent = false
        )

        assertEquals(MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD, summary.status)
    }

    @Test
    fun configuredProfileAllowsEmptyDisplayNameFallback() {
        val summary = ProfileMtlsSummaryResolver.resolve(
            profile = profile(mtlsEnabled = true, certificateDisplayName = ""),
            certificatePresent = true,
            passwordPresent = true
        )

        assertEquals(MtlsConfigStatus.CONFIGURED, summary.status)
        assertEquals("", summary.certificateDisplayName)
    }

    private fun profile(
        mtlsEnabled: Boolean,
        certificateDisplayName: String
    ): ServerProfile {
        return ServerProfile(
            id = "profile-1",
            name = "Profile",
            baseUrl = "https://example.com",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.NONE,
            basicUsername = "",
            mtlsEnabled = mtlsEnabled,
            allowedHosts = "",
            mtlsCertificateDisplayName = certificateDisplayName
        )
    }
}
