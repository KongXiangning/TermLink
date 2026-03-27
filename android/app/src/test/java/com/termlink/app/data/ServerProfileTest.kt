package com.termlink.app.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ServerProfileTest {

    @Test
    fun fromJsonFallsBackToEmptyCertificateDisplayNameForLegacyProfiles() {
        val profile = ServerProfile.fromJson(
            JSONObject(
                """
                {
                  "id": "legacy",
                  "name": "Legacy Profile",
                  "baseUrl": "https://legacy.example",
                  "terminalType": "TERMLINK_WS",
                  "authType": "NONE",
                  "basicUsername": "",
                  "mtlsEnabled": true,
                  "allowedHosts": "legacy.example"
                }
                """.trimIndent()
            )
        )

        assertEquals("legacy", profile.id)
        assertEquals("", profile.mtlsCertificateDisplayName)
        assertEquals("legacy.example", profile.allowedHosts)
        assertFalse(profile.basicUsername.isNotBlank())
    }

    @Test
    fun toJsonAndFromJsonRoundTripCertificateDisplayName() {
        val profile = ServerProfile(
            id = "profile-1",
            name = "Profile 1",
            baseUrl = "https://server.example",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.BASIC,
            basicUsername = "alice",
            mtlsEnabled = true,
            allowedHosts = "server.example",
            mtlsCertificateDisplayName = "client-cert.p12"
        )

        val parsed = ServerProfile.fromJson(profile.toJson())

        assertEquals(profile, parsed)
        assertEquals("client-cert.p12", parsed.mtlsCertificateDisplayName)
    }
}
