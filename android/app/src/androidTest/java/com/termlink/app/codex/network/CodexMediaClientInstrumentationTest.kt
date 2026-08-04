package com.termlink.app.codex.network

import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.security.MessageDigest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okio.Buffer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CodexMediaClientInstrumentationTest {
    private lateinit var server: MockWebServer
    private lateinit var cacheDir: File

    @Before
    fun setUp() {
        server = MockWebServer().also { it.start() }
        cacheDir = File(
            InstrumentationRegistry.getInstrumentation().targetContext.cacheDir,
            "codex-media-client-test"
        ).apply {
            deleteRecursively()
            mkdirs()
        }
    }

    @After
    fun tearDown() {
        server.shutdown()
        cacheDir.deleteRecursively()
    }

    @Test
    fun originalDownloadReportsProgressAndCommitsAtomically() {
        val image = Base64.decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            Base64.DEFAULT
        )
        val hash = sha256(image)
        server.enqueue(
            MockResponse()
                .setHeader("Content-Type", "image/png")
                .setBody(Buffer().write(image))
        )
        val progress = mutableListOf<CodexMediaDownloadProgress>()
        val client = CodexMediaClient(
            baseUrl = server.url("/").toString(),
            cacheDir = cacheDir,
            httpClient = OkHttpClient(),
            endpointId = "home"
        )

        val file = client.download(
            contentHash = hash,
            variant = com.termlink.app.codex.data.CodexMediaVariant.ORIGINAL,
            expectedHash = hash,
            onProgress = { progress += it }
        )

        assertTrue(file.isFile)
        assertEquals(image.size.toLong(), file.length())
        assertTrue(progress.isNotEmpty())
        assertEquals(0L, progress.first().downloadedBytes)
        assertEquals(image.size.toLong(), progress.last().downloadedBytes)
        assertEquals(image.size.toLong(), progress.last().totalBytes)
        assertFalse(File(file.parentFile, "${file.name}.part").exists())
        assertEquals("/api/codex/media/$hash", server.takeRequest().path)
    }

    @Test
    fun cachedThumbnailIsReturnedWithoutAnotherNetworkRequest() {
        val image = Base64.decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            Base64.DEFAULT
        )
        val hash = sha256(image)
        server.enqueue(
            MockResponse()
                .setHeader("Content-Type", "image/webp")
                .setBody(Buffer().write(image))
        )
        val client = CodexMediaClient(
            baseUrl = server.url("/").toString(),
            cacheDir = cacheDir,
            httpClient = OkHttpClient(),
            endpointId = "home"
        )

        val downloaded = client.download(
            contentHash = hash,
            variant = com.termlink.app.codex.data.CodexMediaVariant.THUMBNAIL,
            expectedHash = hash
        )
        assertEquals(downloaded, client.cached(
            contentHash = hash,
            variant = com.termlink.app.codex.data.CodexMediaVariant.THUMBNAIL,
            expectedHash = hash
        ))

        // The second lookup is local-only; only the initial download reached
        // the server.
        assertEquals("/api/codex/media/$hash/thumbnail", server.takeRequest().path)
        assertTrue(server.requestCount == 1)
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it) }
}
