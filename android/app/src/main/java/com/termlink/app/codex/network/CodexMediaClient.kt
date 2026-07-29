package com.termlink.app.codex.network

import java.io.File
import java.security.MessageDigest
import okhttp3.OkHttpClient
import okhttp3.Request

class CodexMediaClient(
    private val baseUrl: String,
    private val cacheDir: File,
    private val httpClient: OkHttpClient = OkHttpClient()
) {
    fun download(contentHash: String, extension: String = ".img"): File {
        require(Regex("^[0-9a-fA-F]{64}$").matches(contentHash))
        val normalizedHash = contentHash.lowercase()
        val directory = File(cacheDir, "codex-media").apply { mkdirs() }
        val target = File(directory, "$normalizedHash$extension")
        if (target.isFile && sha256(target) == normalizedHash) return target
        val part = File(directory, "$normalizedHash$extension.part")
        val request = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/api/codex/media/$normalizedHash")
            .header("Accept", "image/*")
            .build()
        httpClient.newCall(request).execute().use { response ->
            check(response.isSuccessful) { "media_download_${response.code}" }
            val body = response.body ?: error("media_empty")
            body.byteStream().use { input -> part.outputStream().use { output -> input.copyTo(output) } }
            check(body.contentLength() <= 0L || part.length() == body.contentLength()) { "media_length_mismatch" }
        }
        check(sha256(part) == normalizedHash) { "media_hash_mismatch" }
        check(part.renameTo(target)) { "media_atomic_rename_failed" }
        return target
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
}
