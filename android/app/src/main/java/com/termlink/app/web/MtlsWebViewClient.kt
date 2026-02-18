package com.termlink.app.web

import android.content.Context
import android.util.Log
import android.webkit.ClientCertRequest
import android.webkit.HttpAuthHandler
import android.webkit.WebView
import android.webkit.WebViewClient
import com.termlink.app.BuildConfig
import com.termlink.app.data.AuthType
import com.termlink.app.data.MtlsPolicyResolver
import com.termlink.app.data.ServerProfile
import java.security.KeyStore
import java.security.PrivateKey
import java.security.cert.X509Certificate

open class MtlsWebViewClient(
    private val appContext: Context,
    private val profileProvider: (() -> ServerProfile?)? = null,
    private val basicPasswordProvider: ((profileId: String) -> String?)? = null,
    private val eventListener: MtlsEventListener? = null
) : WebViewClient() {

    private val credentialLock = Any()

    @Volatile
    private var privateKey: PrivateKey? = null

    @Volatile
    private var certChain: Array<X509Certificate>? = null

    interface MtlsEventListener {
        fun onMtlsError(code: String, message: String)
    }

    override fun onReceivedClientCertRequest(view: WebView, request: ClientCertRequest) {
        Log.i(TAG, "Client cert request host=${request.host} port=${request.port}")
        val policy = MtlsPolicyResolver.resolve(profileProvider?.invoke())
        if (!policy.effectiveEnabled) {
            request.ignore()
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

        if (!ensureCredentialsLoaded()) {
            notifyMtlsError(
                code = "MTLS_CREDENTIAL_LOAD_FAILED",
                message = "mTLS client credentials are not available."
            )
            request.cancel()
            return
        }

        request.proceed(privateKey, certChain)
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

    private fun ensureCredentialsLoaded(): Boolean {
        if (privateKey != null && certChain != null) {
            return true
        }

        synchronized(credentialLock) {
            if (privateKey != null && certChain != null) {
                return true
            }

            val assetPath = BuildConfig.MTLS_P12_ASSET
            if (assetPath.isBlank()) {
                Log.e(TAG, "MTLS_P12_ASSET is empty.")
                return false
            }

            val password = BuildConfig.MTLS_P12_PASSWORD.toCharArray()

            try {
                appContext.assets.open(assetPath).use { input ->
                    val keyStore = KeyStore.getInstance("PKCS12")
                    keyStore.load(input, password)

                    val alias = findPrivateKeyAlias(keyStore)
                    if (alias == null) {
                        Log.e(TAG, "No private key entry found in PKCS#12 file.")
                        return false
                    }

                    val loadedPrivateKey = keyStore.getKey(alias, password) as? PrivateKey
                    val chain = keyStore.getCertificateChain(alias)
                    if (loadedPrivateKey == null || chain.isNullOrEmpty()) {
                        Log.e(TAG, "PKCS#12 missing private key or certificate chain.")
                        return false
                    }

                    val x509Chain = ArrayList<X509Certificate>(chain.size)
                    for (cert in chain) {
                        if (cert !is X509Certificate) {
                            Log.e(TAG, "Non-X509 certificate found in chain.")
                            return false
                        }
                        x509Chain.add(cert)
                    }

                    privateKey = loadedPrivateKey
                    certChain = x509Chain.toTypedArray()
                    Log.i(TAG, "mTLS credentials loaded from assets/$assetPath")
                    return true
                }
            } catch (ex: Exception) {
                Log.e(TAG, "Failed to load mTLS credentials.", ex)
                return false
            } finally {
                password.fill('\u0000')
            }
        }
    }

    private fun findPrivateKeyAlias(keyStore: KeyStore): String? {
        val aliases = keyStore.aliases()
        while (aliases.hasMoreElements()) {
            val alias = aliases.nextElement()
            if (keyStore.isKeyEntry(alias)) {
                return alias
            }
        }
        return null
    }

    private fun notifyMtlsError(code: String, message: String) {
        Log.e(TAG, "[$code] $message")
        eventListener?.onMtlsError(code, message)
    }

    companion object {
        private const val TAG = "TermLink-mTLS"
    }
}
