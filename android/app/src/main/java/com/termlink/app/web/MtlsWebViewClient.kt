package com.termlink.app.web

import android.content.Context
import android.util.Log
import android.webkit.ClientCertRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.termlink.app.BuildConfig
import java.security.KeyStore
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.util.Locale

class MtlsWebViewClient(private val appContext: Context) : WebViewClient() {

    private val allowedHosts: Set<String> = parseAllowedHosts(BuildConfig.MTLS_ALLOWED_HOSTS)
    private val credentialLock = Any()

    @Volatile
    private var privateKey: PrivateKey? = null

    @Volatile
    private var certChain: Array<X509Certificate>? = null

    override fun onReceivedClientCertRequest(view: WebView, request: ClientCertRequest) {
        if (!BuildConfig.MTLS_ENABLED) {
            request.ignore()
            return
        }

        if (!isAllowedHost(request.host)) {
            request.ignore()
            return
        }

        if (!ensureCredentialsLoaded()) {
            Log.e(TAG, "mTLS client credentials are not available.")
            request.cancel()
            return
        }

        request.proceed(privateKey, certChain)
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

    private fun parseAllowedHosts(rawHosts: String?): Set<String> {
        if (rawHosts.isNullOrBlank()) {
            return emptySet()
        }

        return rawHosts
            .split(",")
            .map { it.trim().lowercase(Locale.ROOT) }
            .filter { it.isNotEmpty() }
            .toSet()
    }

    private fun isAllowedHost(host: String?): Boolean {
        if (allowedHosts.isEmpty()) {
            return true
        }
        if (host.isNullOrBlank()) {
            return false
        }
        return allowedHosts.contains(host.lowercase(Locale.ROOT))
    }

    companion object {
        private const val TAG = "TermLink-mTLS"
    }
}
