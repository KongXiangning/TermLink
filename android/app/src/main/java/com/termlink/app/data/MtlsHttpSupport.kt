package com.termlink.app.data

import android.content.Context
import android.util.Log
import com.termlink.app.BuildConfig
import java.net.HttpURLConnection
import java.security.KeyStore
import java.security.SecureRandom
import java.util.Locale
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory

class MtlsHttpSupport(private val appContext: Context) {

    private val allowedHosts: Set<String> = parseAllowedHosts(BuildConfig.MTLS_ALLOWED_HOSTS)
    private val credentialLock = Any()

    @Volatile
    private var socketFactory: SSLSocketFactory? = null

    fun applyIfNeeded(connection: HttpURLConnection): ApiResult<Unit> {
        if (!BuildConfig.MTLS_ENABLED) {
            return ApiResult.Success(Unit)
        }

        if (connection !is HttpsURLConnection) {
            return ApiResult.Success(Unit)
        }

        val host = connection.url.host.orEmpty()
        if (!isAllowedHost(host)) {
            return ApiResult.Failure(
                SessionApiError(
                    code = SessionApiErrorCode.MTLS_HOST_NOT_ALLOWED,
                    message = "Host '$host' is not allowed by mTLS host allowlist."
                )
            )
        }

        val factory = ensureSocketFactory() ?: return ApiResult.Failure(
            SessionApiError(
                code = SessionApiErrorCode.MTLS_CREDENTIAL_LOAD_FAILED,
                message = "Failed to load mTLS client certificate from assets."
            )
        )

        return try {
            connection.sslSocketFactory = factory
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

    private fun ensureSocketFactory(): SSLSocketFactory? {
        socketFactory?.let { return it }

        synchronized(credentialLock) {
            socketFactory?.let { return it }

            val assetPath = BuildConfig.MTLS_P12_ASSET
            if (assetPath.isBlank()) {
                Log.e(TAG, "MTLS_P12_ASSET is empty.")
                return null
            }

            val password = BuildConfig.MTLS_P12_PASSWORD.toCharArray()
            try {
                appContext.assets.open(assetPath).use { input ->
                    val keyStore = KeyStore.getInstance("PKCS12")
                    keyStore.load(input, password)

                    val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
                    kmf.init(keyStore, password)

                    val sslContext = SSLContext.getInstance("TLS")
                    sslContext.init(kmf.keyManagers, null, SecureRandom())

                    socketFactory = sslContext.socketFactory
                    Log.i(TAG, "HTTP mTLS credentials loaded from assets/$assetPath")
                }
            } catch (ex: Exception) {
                Log.e(TAG, "Failed to initialize HTTP mTLS credentials.", ex)
                return null
            } finally {
                password.fill('\u0000')
            }
        }

        return socketFactory
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

    private fun isAllowedHost(host: String): Boolean {
        if (allowedHosts.isEmpty()) {
            return true
        }
        return allowedHosts.contains(host.lowercase(Locale.ROOT))
    }

    companion object {
        private const val TAG = "TermLink-mTLS-HTTP"
    }
}
