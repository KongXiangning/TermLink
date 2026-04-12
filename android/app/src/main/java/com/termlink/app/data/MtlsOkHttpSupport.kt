package com.termlink.app.data

import android.content.Context
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient

class MtlsOkHttpSupport(context: Context) {
    private val certificateStore = MtlsCertificateStore(context.applicationContext)

    fun configure(baseClient: OkHttpClient, profile: ServerProfile?, targetUrl: String): OkHttpClient {
        val httpUrl = targetUrl.toHttpUrlOrNull() ?: return baseClient
        if (!httpUrl.isHttps) {
            return baseClient
        }

        val policy = MtlsPolicyResolver.resolve(profile, certificateStore)
        if (!policy.effectiveEnabled) {
            return when (policy.reason) {
                MtlsPolicyReason.DISABLED_BY_PROFILE,
                MtlsPolicyReason.PROFILE_MISSING -> baseClient

                MtlsPolicyReason.CERTIFICATE_MISSING -> throw IllegalStateException(
                    "mTLS is enabled for this profile, but the local certificate is missing."
                )

                MtlsPolicyReason.PASSWORD_MISSING -> throw IllegalStateException(
                    "mTLS is enabled for this profile, but the local certificate password is missing."
                )

                MtlsPolicyReason.ENABLED -> baseClient
            }
        }

        if (!MtlsPolicyResolver.isHostAllowed(httpUrl.host, policy.effectiveAllowedHosts)) {
            throw IllegalStateException(
                "Host '${httpUrl.host}' is not allowed by mTLS host allowlist."
            )
        }

        val credentials = profile?.let {
            MtlsCredentialRepository.load(it, certificateStore)
        } ?: throw IllegalStateException(
            "Failed to load mTLS client certificate from the profile store."
        )

        return baseClient.newBuilder()
            .sslSocketFactory(credentials.sslSocketFactory, credentials.trustManager)
            .build()
    }
}
