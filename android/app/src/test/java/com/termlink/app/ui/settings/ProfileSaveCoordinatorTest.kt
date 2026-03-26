package com.termlink.app.ui.settings

import com.termlink.app.data.AuthType
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileSaveCoordinatorTest {

    @Test
    fun basicAuthSaveDefersPasswordPersistenceUntilProfileCommit() {
        val effects = ProfileSaveCoordinator.resolveSideEffects(
            authType = AuthType.BASIC,
            mtlsDecision = decision()
        )

        assertTrue(effects.persistBasicPassword)
        assertFalse(effects.removeBasicPassword)
        assertFalse(effects.persistMtlsPassword)
        assertFalse(effects.clearMtlsMaterial)
    }

    @Test
    fun nonBasicSaveRemovesStoredBasicPasswordAfterProfileCommit() {
        val effects = ProfileSaveCoordinator.resolveSideEffects(
            authType = AuthType.NONE,
            mtlsDecision = decision()
        )

        assertFalse(effects.persistBasicPassword)
        assertTrue(effects.removeBasicPassword)
    }

    @Test
    fun mtlsCleanupAndPasswordPersistenceFollowResolvedDecision() {
        val effects = ProfileSaveCoordinator.resolveSideEffects(
            authType = AuthType.BASIC,
            mtlsDecision = decision(
                shouldPersistEnteredPassword = true,
                shouldClearStoredMaterial = true
            )
        )

        assertTrue(effects.persistBasicPassword)
        assertTrue(effects.persistMtlsPassword)
        assertTrue(effects.clearMtlsMaterial)
    }

    private fun decision(
        shouldPersistEnteredPassword: Boolean = false,
        shouldClearStoredMaterial: Boolean = false
    ): MtlsProfileFormDecision {
        return MtlsProfileFormDecision(
            validationError = null,
            effectiveMtlsEnabled = true,
            pendingState = false,
            effectiveCertificatePresent = true,
            effectivePasswordPresent = true,
            effectiveCertificateDisplayName = "client.p12",
            shouldPersistEnteredPassword = shouldPersistEnteredPassword,
            shouldPersistStagedCertificate = false,
            shouldClearStoredMaterial = shouldClearStoredMaterial,
            status = MtlsConfigStatus.CONFIGURED
        )
    }
}
