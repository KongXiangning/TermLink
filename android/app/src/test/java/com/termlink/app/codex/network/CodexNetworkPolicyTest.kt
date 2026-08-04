package com.termlink.app.codex.network

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexNetworkPolicyTest {
    @Test fun thumbnailIsAllowedOnAnyNetwork() {
        assertTrue(CodexNetworkPolicy.shouldDownload(CodexMediaRequestKind.THUMBNAIL, false, false))
    }

    @Test fun automaticOriginalRequiresWifiAndSetting() {
        assertFalse(CodexNetworkPolicy.shouldDownload(CodexMediaRequestKind.AUTO_ORIGINAL, false, true))
        assertFalse(CodexNetworkPolicy.shouldDownload(CodexMediaRequestKind.AUTO_ORIGINAL, true, false))
        assertTrue(CodexNetworkPolicy.shouldDownload(CodexMediaRequestKind.AUTO_ORIGINAL, true, true))
    }

    @Test fun explicitOriginalIsAllowedRegardlessOfNetwork() {
        assertTrue(CodexNetworkPolicy.shouldDownload(CodexMediaRequestKind.EXPLICIT_ORIGINAL, false, false))
    }
}
