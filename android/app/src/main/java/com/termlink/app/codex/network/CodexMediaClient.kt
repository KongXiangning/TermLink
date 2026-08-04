package com.termlink.app.codex.network

import android.graphics.BitmapFactory
import android.util.Base64
import com.termlink.app.codex.data.CodexMediaVariant
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.MtlsOkHttpSupport
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.CancellationException
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request

data class CodexMediaDownloadProgress(
    val downloadedBytes: Long,
    val totalBytes: Long?
)

/**
 * Profile-aware content-addressed media downloader. The default constructor
 * remains useful for JVM tests; production creates it with [forProfile], which
 * applies the profile's Basic/mTLS transport and registration header.
 */
class CodexMediaClient(
    private val baseUrl: String,
    private val cacheDir: File,
    private val httpClient: OkHttpClient = OkHttpClient(),
    private val endpointId: String = "default",
    private val authorizationHeader: String? = null,
    private val registrationId: String? = null
) {
    fun download(
        contentHash: String,
        extension: String = ".img",
        variant: CodexMediaVariant = CodexMediaVariant.ORIGINAL,
        expectedHash: String? = null,
        onProgress: (CodexMediaDownloadProgress) -> Unit = {},
        isCancelled: () -> Boolean = { false }
    ): File {
        require(Regex("^[0-9a-fA-F]{64}$").matches(contentHash))
        val normalizedHash = contentHash.lowercase()
        val verificationHash = (expectedHash ?: normalizedHash).lowercase()
        require(Regex("^[0-9a-f]{64}$").matches(verificationHash))
        val directory = variantDirectory(variant).apply { mkdirs() }
        val safeExtension = if (variant == CodexMediaVariant.THUMBNAIL) ".webp" else extension
        val target = File(directory, "$normalizedHash$safeExtension")
        if (target.isFile && sha256(target) == verificationHash) return target
        val part = File(directory, "$normalizedHash$safeExtension.part")
        if (part.exists()) part.delete()
        val endpoint = buildString {
            append("${baseUrl.trimEnd('/')}/api/codex/media/$normalizedHash")
            if (variant == CodexMediaVariant.THUMBNAIL) append("/thumbnail")
        }
        val requestBuilder = Request.Builder()
            .url(endpoint)
            .header("Accept", if (variant == CodexMediaVariant.THUMBNAIL) "image/webp" else "image/*")
        authorizationHeader?.let { requestBuilder.header("Authorization", it) }
        registrationId?.takeIf { it.isNotBlank() }?.let { requestBuilder.header("X-TermLink-Registration-Id", it) }
        val call = httpClient.newCall(requestBuilder.build())
        try {
            call.execute().use { response ->
                check(response.isSuccessful) { "media_download_${response.code}" }
                val body = response.body ?: error("media_empty")
                val expectedLength = body.contentLength().takeIf { it >= 0L }
                var downloaded = 0L
                onProgress(CodexMediaDownloadProgress(0L, expectedLength))
                body.byteStream().use { input ->
                    part.outputStream().buffered().use { output ->
                        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                        while (true) {
                            if (isCancelled()) throw CancellationException("media_download_cancelled")
                            val count = input.read(buffer)
                            if (count <= 0) break
                            output.write(buffer, 0, count)
                            downloaded += count
                            onProgress(CodexMediaDownloadProgress(downloaded, expectedLength))
                        }
                    }
                }
                check(expectedLength == null || part.length() == expectedLength) { "media_length_mismatch" }
            }
            check(sha256(part) == verificationHash) { "media_hash_mismatch" }
            check(isDecodableImage(part)) { "media_decode_failed" }
            if (target.exists() && !target.delete()) throw IOException("media_target_replace_failed")
            if (!part.renameTo(target)) throw IOException("media_atomic_rename_failed")
            return target
        } catch (error: Throwable) {
            part.delete()
            throw error
        } finally {
            if (isCancelled()) call.cancel()
        }
    }

    fun cached(
        contentHash: String,
        variant: CodexMediaVariant = CodexMediaVariant.ORIGINAL,
        expectedHash: String? = null
    ): File? {
        if (!Regex("^[0-9a-fA-F]{64}$").matches(contentHash)) return null
        val extension = if (variant == CodexMediaVariant.THUMBNAIL) ".webp" else ".img"
        val file = File(variantDirectory(variant), "${contentHash.lowercase()}$extension")
        val verificationHash = (expectedHash ?: contentHash).lowercase()
        return file.takeIf { it.isFile && sha256(it) == verificationHash }
    }

    private fun variantDirectory(variant: CodexMediaVariant): File {
        val endpointKey = sha256(endpointId.toByteArray(Charsets.UTF_8)).take(24)
        val name = if (variant == CodexMediaVariant.THUMBNAIL) "thumbs" else "originals"
        return File(File(File(cacheDir, "codex-media"), endpointKey), name)
    }

    private fun isDecodableImage(file: File): Boolean {
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, options)
        return options.outWidth > 0 && options.outHeight > 0
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val count = input.read(buffer)
                if (count <= 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it) }

    companion object {
        fun forProfile(
            context: android.content.Context,
            profile: ServerProfile,
            sessionApiClient: SessionApiClient,
            cacheDir: File,
            baseClient: OkHttpClient = OkHttpClient()
        ): CodexMediaClient {
            val credentialStore = BasicCredentialStore(context.applicationContext)
            val authHeader = if (profile.authType == AuthType.BASIC) {
                val username = profile.basicUsername.trim()
                val password = credentialStore.getPassword(profile.id).orEmpty()
                if (username.isBlank() || password.isBlank()) null else {
                    val encoded = Base64.encodeToString(
                        "$username:$password".toByteArray(Charsets.UTF_8),
                        Base64.NO_WRAP
                    )
                    "Basic $encoded"
                }
            } else null
            val configured = MtlsOkHttpSupport(context.applicationContext)
                .configure(baseClient, profile, profile.baseUrl)
            return CodexMediaClient(
                baseUrl = profile.baseUrl,
                cacheDir = cacheDir,
                httpClient = configured,
                endpointId = profile.id,
                authorizationHeader = authHeader,
                registrationId = sessionApiClient.registrationId(profile)
            )
        }
    }
}
