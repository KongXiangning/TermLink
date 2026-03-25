package com.termlink.app.ui.settings

enum class MtlsValidationError {
    CERTIFICATE_REQUIRED,
    PASSWORD_REQUIRED
}

enum class MtlsConfigStatus {
    DISABLED,
    CONFIGURED,
    PENDING_CERTIFICATE,
    PENDING_PASSWORD,
    PENDING_CERTIFICATE_AND_PASSWORD
}

data class MtlsProfileFormInput(
    val isNewProfile: Boolean,
    val initialMtlsEnabled: Boolean,
    val initialCertificatePresent: Boolean,
    val initialPasswordPresent: Boolean,
    val initialCertificateDisplayName: String,
    val mtlsChecked: Boolean,
    val stagedCertificateDisplayName: String?,
    val enteredPassword: String,
    val certificateRemoved: Boolean
)

data class MtlsProfileFormDecision(
    val validationError: MtlsValidationError?,
    val effectiveMtlsEnabled: Boolean,
    val pendingState: Boolean,
    val effectiveCertificatePresent: Boolean,
    val effectivePasswordPresent: Boolean,
    val effectiveCertificateDisplayName: String,
    val shouldPersistEnteredPassword: Boolean,
    val shouldPersistStagedCertificate: Boolean,
    val shouldClearStoredMaterial: Boolean,
    val status: MtlsConfigStatus
)

object MtlsProfileFormResolver {

    fun resolve(input: MtlsProfileFormInput): MtlsProfileFormDecision {
        val hasStagedCertificate = !input.stagedCertificateDisplayName.isNullOrBlank()
        val hasEnteredPassword = input.enteredPassword.isNotBlank()
        val initialValid = input.initialMtlsEnabled &&
            input.initialCertificatePresent &&
            input.initialPasswordPresent
        val initialPending = !input.isNewProfile && input.initialMtlsEnabled && !initialValid

        val effectiveCertificatePresent = hasStagedCertificate ||
            (input.initialCertificatePresent && !input.certificateRemoved)
        val effectivePasswordPresent = when {
            hasStagedCertificate -> hasEnteredPassword
            hasEnteredPassword -> true
            input.certificateRemoved -> false
            else -> input.initialPasswordPresent
        }

        val validationError = when {
            !input.mtlsChecked -> null
            input.isNewProfile && !effectiveCertificatePresent -> MtlsValidationError.CERTIFICATE_REQUIRED
            input.isNewProfile && !effectivePasswordPresent -> MtlsValidationError.PASSWORD_REQUIRED
            !input.isNewProfile && hasStagedCertificate && !hasEnteredPassword ->
                MtlsValidationError.PASSWORD_REQUIRED
            !input.isNewProfile && !effectiveCertificatePresent && !initialPending ->
                MtlsValidationError.CERTIFICATE_REQUIRED
            !input.isNewProfile && effectiveCertificatePresent && !effectivePasswordPresent && !initialPending ->
                MtlsValidationError.PASSWORD_REQUIRED
            else -> null
        }

        val pendingState = input.mtlsChecked &&
            validationError == null &&
            (!effectiveCertificatePresent || !effectivePasswordPresent)

        val effectiveMtlsEnabled = when {
            !input.mtlsChecked -> false
            validationError != null -> false
            effectiveCertificatePresent && effectivePasswordPresent -> true
            pendingState -> true
            else -> false
        }

        val effectiveCertificateDisplayName = when {
            !effectiveMtlsEnabled -> ""
            hasStagedCertificate -> input.stagedCertificateDisplayName.orEmpty()
            effectiveCertificatePresent -> input.initialCertificateDisplayName
            else -> ""
        }

        val shouldClearStoredMaterial = !input.mtlsChecked ||
            (input.certificateRemoved && !hasStagedCertificate)

        val status = when {
            !input.mtlsChecked -> MtlsConfigStatus.DISABLED
            effectiveCertificatePresent && effectivePasswordPresent -> MtlsConfigStatus.CONFIGURED
            effectiveCertificatePresent -> MtlsConfigStatus.PENDING_PASSWORD
            effectivePasswordPresent -> MtlsConfigStatus.PENDING_CERTIFICATE
            else -> MtlsConfigStatus.PENDING_CERTIFICATE_AND_PASSWORD
        }

        return MtlsProfileFormDecision(
            validationError = validationError,
            effectiveMtlsEnabled = effectiveMtlsEnabled,
            pendingState = pendingState,
            effectiveCertificatePresent = effectiveCertificatePresent,
            effectivePasswordPresent = effectivePasswordPresent,
            effectiveCertificateDisplayName = effectiveCertificateDisplayName,
            shouldPersistEnteredPassword = hasEnteredPassword && effectiveCertificatePresent,
            shouldPersistStagedCertificate = hasStagedCertificate,
            shouldClearStoredMaterial = shouldClearStoredMaterial,
            status = status
        )
    }
}
