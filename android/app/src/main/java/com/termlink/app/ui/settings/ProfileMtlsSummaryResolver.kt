package com.termlink.app.ui.settings

import com.termlink.app.data.ServerProfile

data class ProfileMtlsSummary(
    val status: MtlsConfigStatus,
    val certificateDisplayName: String
)

object ProfileMtlsSummaryResolver {

    fun resolve(
        profile: ServerProfile,
        certificatePresent: Boolean,
        passwordPresent: Boolean
    ): ProfileMtlsSummary {
        val decision = MtlsProfileFormResolver.resolve(
            MtlsProfileFormInput(
                isNewProfile = false,
                initialMtlsEnabled = profile.mtlsEnabled,
                initialCertificatePresent = certificatePresent,
                initialPasswordPresent = passwordPresent,
                initialCertificateDisplayName = profile.mtlsCertificateDisplayName,
                mtlsChecked = profile.mtlsEnabled,
                stagedCertificateDisplayName = null,
                enteredPassword = "",
                certificateRemoved = false
            )
        )
        return ProfileMtlsSummary(
            status = decision.status,
            certificateDisplayName = decision.effectiveCertificateDisplayName
        )
    }
}
