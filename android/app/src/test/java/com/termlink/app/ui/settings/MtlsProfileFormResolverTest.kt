package com.termlink.app.ui.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MtlsProfileFormResolverTest {

    @Test
    fun newProfileRequiresCertificateWhenMtlsEnabled() {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = true,
                initialMtlsEnabled = false,
                initialCertificatePresent = false,
                initialPasswordPresent = false,
                initialCertificateDisplayName = "",
                mtlsChecked = true,
                stagedCertificateDisplayName = null,
                enteredPassword = "",
                certificateRemoved = false
            )
        )

        assertEquals(MtlsValidationError.CERTIFICATE_REQUIRED, decision.validationError)
        assertFalse(decision.effectiveMtlsEnabled)
    }

    @Test
    fun legacyPendingProfileMayRemainPendingWithoutCertificateAndPassword() {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = false,
                initialMtlsEnabled = true,
                initialCertificatePresent = false,
                initialPasswordPresent = false,
                initialCertificateDisplayName = "",
                mtlsChecked = true,
                stagedCertificateDisplayName = null,
                enteredPassword = "",
                certificateRemoved = false
            )
        )

        assertNull(decision.validationError)
        assertTrue(decision.pendingState)
        assertTrue(decision.effectiveMtlsEnabled)
        assertEquals(MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD, decision.status)
    }

    @Test
    fun replacingCertificateRequiresFreshPassword() {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = false,
                initialMtlsEnabled = true,
                initialCertificatePresent = true,
                initialPasswordPresent = true,
                initialCertificateDisplayName = "old.p12",
                mtlsChecked = true,
                stagedCertificateDisplayName = "new.p12",
                enteredPassword = "",
                certificateRemoved = false
            )
        )

        assertEquals(MtlsValidationError.PASSWORD_REQUIRED, decision.validationError)
        assertFalse(decision.effectiveMtlsEnabled)
    }

    @Test
    fun disablingMtlsMarksStoredMaterialForCleanup() {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = false,
                initialMtlsEnabled = true,
                initialCertificatePresent = true,
                initialPasswordPresent = true,
                initialCertificateDisplayName = "client.p12",
                mtlsChecked = false,
                stagedCertificateDisplayName = null,
                enteredPassword = "",
                certificateRemoved = false
            )
        )

        assertNull(decision.validationError)
        assertFalse(decision.effectiveMtlsEnabled)
        assertTrue(decision.shouldClearStoredMaterial)
        assertEquals(MtlsConfigStatus.DISABLED, decision.status)
    }

    @Test
    fun removingStoredCertificateWhileKeepingPendingMtlsStillClearsStoredMaterial() {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = false,
                initialMtlsEnabled = true,
                initialCertificatePresent = true,
                initialPasswordPresent = false,
                initialCertificateDisplayName = "client.p12",
                mtlsChecked = true,
                stagedCertificateDisplayName = null,
                enteredPassword = "",
                certificateRemoved = true
            )
        )

        assertNull(decision.validationError)
        assertTrue(decision.pendingState)
        assertTrue(decision.effectiveMtlsEnabled)
        assertTrue(decision.shouldClearStoredMaterial)
        assertEquals(MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD, decision.status)
    }
}
