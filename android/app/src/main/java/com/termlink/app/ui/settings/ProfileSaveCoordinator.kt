package com.termlink.app.ui.settings

import com.termlink.app.data.AuthType

data class ProfileSaveSideEffects(
    val persistBasicPassword: Boolean,
    val removeBasicPassword: Boolean,
    val persistMtlsPassword: Boolean,
    val clearMtlsMaterial: Boolean
)

object ProfileSaveCoordinator {

    fun resolveSideEffects(
        authType: AuthType,
        mtlsDecision: MtlsProfileFormDecision
    ): ProfileSaveSideEffects {
        return ProfileSaveSideEffects(
            persistBasicPassword = authType == AuthType.BASIC,
            removeBasicPassword = authType != AuthType.BASIC,
            persistMtlsPassword = mtlsDecision.shouldPersistEnteredPassword,
            clearMtlsMaterial = mtlsDecision.shouldClearStoredMaterial
        )
    }
}
