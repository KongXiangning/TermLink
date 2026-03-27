package com.termlink.app.web

import android.content.Context
import android.util.Log
import android.webkit.ClientCertRequest
import android.webkit.HttpAuthHandler
import android.webkit.WebView
import android.webkit.WebViewClient
import com.termlink.app.data.AuthType
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.MtlsCredentialRepository
import com.termlink.app.data.MtlsPolicyResolver
import com.termlink.app.data.MtlsPolicyReason
import com.termlink.app.data.ServerProfile

open class MtlsWebViewClient(
    appContext: Context,
    private val profileProvider: (() -> ServerProfile?)? = null,
    private val basicPasswordProvider: ((profileId: String) -> String?)? = null,
    private val eventListener: MtlsEventListener? = null
) : WebViewClient() {
    private val certificateStore = MtlsCertificateStore(appContext)

    interface MtlsEventListener {
        fun onMtlsError(code: String, message: String)
    }

    override fun onReceivedClientCertRequest(view: WebView, request: ClientCertRequest) {
        Log.i(TAG, "Client cert request host=${request.host} port=${request.port}")
        val profile = profileProvider?.invoke()
        val policy = MtlsPolicyResolver.resolve(profile, certificateStore)
        if (!policy.effectiveEnabled) {
            when (policy.reason) {
                MtlsPolicyReason.CERTIFICATE_MISSING -> {
                    notifyMtlsError(
                        code = "MTLS_CREDENTIAL_LOAD_FAILED",
                        message = "mTLS is enabled for this profile, but the local certificate is missing."
                    )
                    request.cancel()
                }

                MtlsPolicyReason.PASSWORD_MISSING -> {
                    notifyMtlsError(
                        code = "MTLS_CREDENTIAL_LOAD_FAILED",
                        message = "mTLS is enabled for this profile, but the local certificate password is missing."
                    )
                    request.cancel()
                }

                else -> request.ignore()
            }
            return
        }

        if (!MtlsPolicyResolver.isHostAllowed(request.host, policy.effectiveAllowedHosts)) {
            notifyMtlsError(
                code = "MTLS_HOST_NOT_ALLOWED",
                message = "Client cert rejected: host '${request.host}' is not allowed."
            )
            request.cancel()
            return
        }

        val credentials = profile?.let {
            MtlsCredentialRepository.load(it, certificateStore)
        }
        if (credentials == null) {
            notifyMtlsError(
                code = "MTLS_CREDENTIAL_LOAD_FAILED",
                message = "mTLS client credentials are not available."
            )
            request.cancel()
            return
        }

        request.proceed(credentials.privateKey, credentials.certChain)
    }

    override fun onReceivedHttpAuthRequest(
        view: WebView,
        handler: HttpAuthHandler,
        host: String,
        realm: String
    ) {
        val profile = profileProvider?.invoke()
        if (profile == null || profile.authType != AuthType.BASIC) {
            notifyMtlsError(
                code = "AUTH_MISSING_CREDENTIALS",
                message = "HTTP auth challenge for $host/$realm but BASIC credentials are not configured."
            )
            handler.cancel()
            return
        }

        val username = profile.basicUsername.trim()
        val password = basicPasswordProvider?.invoke(profile.id).orEmpty()
        if (username.isBlank() || password.isBlank()) {
            notifyMtlsError(
                code = "AUTH_MISSING_CREDENTIALS",
                message = "HTTP auth challenge for $host/$realm but BASIC credentials are empty."
            )
            handler.cancel()
            return
        }

        Log.i(TAG, "Handling HTTP auth challenge for host=$host realm=$realm")
        handler.proceed(username, password)
    }

    private fun notifyMtlsError(code: String, message: String) {
        Log.e(TAG, "[$code] $message")
        eventListener?.onMtlsError(code, message)
    }

    companion object {
        private const val TAG = "TermLink-mTLS"
    }
}
