package com.termlink.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MtlsPolicyResolverTest {

    @Test
    fun profileMissingDisablesMtls() {
        val policy = MtlsPolicyResolver.resolve(
            profile = null,
            hasCertificate = false,
            hasPassword = false
        )

        assertFalse(policy.effectiveEnabled)
        assertEquals(MtlsPolicyReason.PROFILE_MISSING, policy.reason)
    }

    @Test
    fun profileFlagDisabledDisablesMtls() {
        val policy = MtlsPolicyResolver.resolve(
            profile = profile(mtlsEnabled = false, allowedHosts = "api.example.com"),
            hasCertificate = true,
            hasPassword = true
        )

        assertFalse(policy.effectiveEnabled)
        assertEquals(MtlsPolicyReason.DISABLED_BY_PROFILE, policy.reason)
        assertTrue(policy.effectiveAllowedHosts.contains("api.example.com"))
    }

    @Test
    fun missingCertificateDisablesMtls() {
        val policy = MtlsPolicyResolver.resolve(
            profile = profile(mtlsEnabled = true),
            hasCertificate = false,
            hasPassword = true
        )

        assertFalse(policy.effectiveEnabled)
        assertEquals(MtlsPolicyReason.CERTIFICATE_MISSING, policy.reason)
    }

    @Test
    fun missingPasswordDisablesMtls() {
        val policy = MtlsPolicyResolver.resolve(
            profile = profile(mtlsEnabled = true),
            hasCertificate = true,
            hasPassword = false
        )

        assertFalse(policy.effectiveEnabled)
        assertEquals(MtlsPolicyReason.PASSWORD_MISSING, policy.reason)
    }

    @Test
    fun certificateAndPasswordEnableMtls() {
        val policy = MtlsPolicyResolver.resolve(
            profile = profile(mtlsEnabled = true, allowedHosts = "https://api.example.com:8443, [::1]:9443"),
            hasCertificate = true,
            hasPassword = true
        )

        assertTrue(policy.effectiveEnabled)
        assertEquals(MtlsPolicyReason.ENABLED, policy.reason)
        assertTrue(policy.effectiveAllowedHosts.contains("api.example.com"))
        assertTrue(policy.effectiveAllowedHosts.contains("::1"))
    }

    private fun profile(
        mtlsEnabled: Boolean,
        allowedHosts: String = ""
    ): ServerProfile {
        return ServerProfile(
            id = "profile-1",
            name = "Profile",
            baseUrl = "https://server.example",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.NONE,
            basicUsername = "",
            mtlsEnabled = mtlsEnabled,
            allowedHosts = allowedHosts,
            mtlsCertificateDisplayName = "client.p12"
        )
    }
}
