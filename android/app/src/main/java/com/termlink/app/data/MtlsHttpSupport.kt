package com.termlink.app.data

import android.content.Context
import java.net.HttpURLConnection
import javax.net.ssl.HttpsURLConnection

class MtlsHttpSupport(context: Context) {
    private val certificateStore = MtlsCertificateStore(context)

    fun applyIfNeeded(connection: HttpURLConnection, profile: ServerProfile?): ApiResult<Unit> {
        if (connection !is HttpsURLConnection) {
            return ApiResult.Success(Unit)
        }

        val resolvedProfile = profile
        val policy = MtlsPolicyResolver.resolve(resolvedProfile, certificateStore)
        if (!policy.effectiveEnabled) {
            return when (policy.reason) {
                MtlsPolicyReason.DISABLED_BY_PROFILE,
                MtlsPolicyReason.PROFILE_MISSING -> ApiResult.Success(Unit)

                MtlsPolicyReason.CERTIFICATE_MISSING -> ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.MTLS_CREDENTIAL_LOAD_FAILED,
                        message = "mTLS is enabled for this profile, but the local certificate is missing."
                    )
                )

                MtlsPolicyReason.PASSWORD_MISSING -> ApiResult.Failure(
                    SessionApiError(
                        code = SessionApiErrorCode.MTLS_CREDENTIAL_LOAD_FAILED,
                        message = "mTLS is enabled for this profile, but the local certificate password is missing."
                    )
                )

                MtlsPolicyReason.ENABLED -> ApiResult.Success(Unit)
            }
        }

        val host = connection.url.host.orEmpty()
        if (!MtlsPolicyResolver.isHostAllowed(host, policy.effectiveAllowedHosts)) {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.MTLS_HOST_NOT_ALLOWED,
                    message = "Host '$host' is not allowed by mTLS host allowlist."
                )
            )
        }

        val credentials = resolvedProfile?.let {
            MtlsCredentialRepository.load(it, certificateStore)
        } ?: return ApiResult.Failure(
            SessionApiError(
                code = SessionApiErrorCode.MTLS_CREDENTIAL_LOAD_FAILED,
                message = "Failed to load mTLS client certificate from the profile store."
            )
        )

        return try {
            connection.sslSocketFactory = credentials.sslSocketFactory
            ApiResult.Success(Unit)
        } catch (ex: Exception) {
            ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.MTLS_APPLY_FAILED,
                    message = "Failed to apply mTLS SSL socket factory.",
                    cause = ex
                )
            )
        }
    }
}
