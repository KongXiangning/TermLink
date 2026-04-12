package com.termlink.app.data

import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

data class MtlsCredentials(
    val privateKey: PrivateKey,
    val certChain: Array<X509Certificate>,
    val trustManager: X509TrustManager,
    val sslSocketFactory: SSLSocketFactory
)

object MtlsCredentialRepository {

    private val lock = Any()
    private val cache = LinkedHashMap<String, MtlsCredentials>()

    fun load(profile: ServerProfile, certificateStore: MtlsCertificateStore): MtlsCredentials? {
        val profileId = profile.id.trim()
        if (profileId.isBlank()) return null
        val password = certificateStore.getPassword(profileId).orEmpty()
        return load(profileId, certificateStore.getCertificateLastModified(profileId), password) { passwordChars ->
            certificateStore.openCertificateInputStream(profileId)?.use { input ->
                loadCredentials(input, passwordChars)
            }
        }
    }

    internal fun load(
        profileId: String,
        lastModified: Long,
        password: String,
        loader: (CharArray) -> MtlsCredentials?
    ): MtlsCredentials? {
        val normalizedProfileId = profileId.trim()
        if (normalizedProfileId.isBlank()) return null
        if (password.isBlank()) return null
        if (lastModified <= 0L) return null

        val cacheKey = buildCacheKey(normalizedProfileId, lastModified, password)
        synchronized(lock) {
            cache[cacheKey]?.let { return it }
        }

        val passwordChars = password.toCharArray()
        try {
            val credentials = try {
                loader(passwordChars)
            } catch (_: Exception) {
                null
            }

            if (credentials != null) {
                synchronized(lock) {
                    cache.keys.removeAll { it.startsWith("$normalizedProfileId|") && it != cacheKey }
                    cache[cacheKey] = credentials
                }
            }
            return credentials
        } finally {
            passwordChars.fill('\u0000')
        }
    }

    fun clear(profileId: String) {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return
        synchronized(lock) {
            cache.keys.removeAll { it.startsWith("$normalizedId|") }
        }
    }

    private fun buildCacheKey(profileId: String, lastModified: Long, password: String): String {
        return "$profileId|$lastModified|${fingerprint(password)}"
    }

    private fun loadCredentials(
        input: java.io.InputStream,
        passwordChars: CharArray
    ): MtlsCredentials? {
        val keyStore = KeyStore.getInstance("PKCS12")
        keyStore.load(input, passwordChars)

        val alias = findPrivateKeyAlias(keyStore) ?: return null
        val privateKey = keyStore.getKey(alias, passwordChars) as? PrivateKey ?: return null
        val chain = keyStore.getCertificateChain(alias)?.map { certificate ->
            certificate as? X509Certificate ?: return null
        }?.toTypedArray() ?: return null

        val keyManagerFactory = KeyManagerFactory.getInstance(
            KeyManagerFactory.getDefaultAlgorithm()
        )
        keyManagerFactory.init(keyStore, passwordChars)

        val trustManagerFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        )
        trustManagerFactory.init(null as KeyStore?)
        val trustManager = trustManagerFactory.trustManagers
            .filterIsInstance<X509TrustManager>()
            .firstOrNull() ?: return null

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(keyManagerFactory.keyManagers, arrayOf(trustManager), SecureRandom())

        return MtlsCredentials(
            privateKey = privateKey,
            certChain = chain,
            trustManager = trustManager,
            sslSocketFactory = sslContext.socketFactory
        )
    }

    private fun fingerprint(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { byte -> "%02x".format(byte) }
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
}
