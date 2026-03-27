package com.termlink.app.mtls

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.webkit.ClientCertRequest
import android.webkit.WebResourceResponse
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.data.AuthType
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.MtlsHttpSupport
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import com.termlink.app.web.MtlsWebViewClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.net.ssl.HttpsURLConnection

@RunWith(AndroidJUnit4::class)
class MtlsRealDeviceValidationTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private lateinit var certificateStore: MtlsCertificateStore
    private lateinit var mtlsHttpSupport: MtlsHttpSupport

    @Before
    fun setUp() {
        certificateStore = MtlsCertificateStore(context)
        mtlsHttpSupport = MtlsHttpSupport(context)
        disableSystemAnimations()
        clearMtlsArtifacts()
    }

    @After
    fun tearDown() {
        clearMtlsArtifacts()
    }

    @Test
    fun singleProfileMtlsConnectionSucceedsForNativeAndWebView() {
        val profile = createProfile("single-success")
        importCertificate(profile.id, MtlsValidationFixtures.BADSSL_CLIENT_P12_BASE64)
        certificateStore.putPassword(profile.id, MtlsValidationFixtures.BADSSL_PASSWORD)

        val nativeResult = performProtectedGetWithRetry(profile)
        assertEquals(200, nativeResult.statusCode)
        assertTrue(nativeResult.body.orEmpty().contains("client-authenticated"))

        val pageLoad = loadProtectedPage(profile)
        assertTrue(pageLoad.sawClientCertRequest)
        assertTrue(pageLoad.loadedUrl.startsWith("https://client.badssl.com"))
    }

    @Test
    fun switchingBetweenProfilesUsesDifferentCertificates() {
        val validProfile = createProfile("switch-valid")
        importCertificate(validProfile.id, MtlsValidationFixtures.BADSSL_CLIENT_P12_BASE64)
        certificateStore.putPassword(validProfile.id, MtlsValidationFixtures.BADSSL_PASSWORD)

        val invalidProfile = createProfile("switch-invalid")
        importCertificate(invalidProfile.id, MtlsValidationFixtures.WRONG_CLIENT_P12_BASE64)
        certificateStore.putPassword(invalidProfile.id, MtlsValidationFixtures.WRONG_PASSWORD)

        val validResult = performProtectedGetWithRetry(validProfile)
        assertEquals(200, validResult.statusCode)

        val invalidResult = performProtectedGet(invalidProfile)
        assertNotNull(invalidResult.failure)

        val validAgainResult = performProtectedGetWithRetry(validProfile)
        assertEquals(200, validAgainResult.statusCode)
    }

    @Test
    fun replacingCertificateCausesOldCertificateToStopWorking() {
        val profile = createProfile("replace-same-profile")
        importCertificate(profile.id, MtlsValidationFixtures.BADSSL_CLIENT_P12_BASE64)
        certificateStore.putPassword(profile.id, MtlsValidationFixtures.BADSSL_PASSWORD)

        val initialResult = performProtectedGetWithRetry(profile)
        assertEquals(200, initialResult.statusCode)

        importCertificate(profile.id, MtlsValidationFixtures.WRONG_CLIENT_P12_BASE64)
        certificateStore.putPassword(profile.id, MtlsValidationFixtures.WRONG_PASSWORD)

        val replacedResult = performProtectedGet(profile)
        assertNotNull(replacedResult.failure)
        assertFalse(replacedResult.failure is AssertionError)
    }

    private fun createProfile(name: String): ServerProfile {
        return ServerProfile(
            id = "mtls-${UUID.randomUUID()}",
            name = name,
            baseUrl = "https://client.badssl.com",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.NONE,
            basicUsername = "",
            mtlsEnabled = true,
            allowedHosts = "client.badssl.com",
            mtlsCertificateDisplayName = "$name.p12"
        )
    }

    private fun importCertificate(profileId: String, base64: String) {
        val sourceFile = File(context.cacheDir, "$profileId.p12").apply {
            writeBytes(android.util.Base64.decode(base64, android.util.Base64.DEFAULT))
        }
        try {
            assertTrue(certificateStore.importCertificate(profileId, Uri.fromFile(sourceFile)))
        } finally {
            sourceFile.delete()
        }
    }

    private fun performProtectedGet(profile: ServerProfile): HttpResult {
        val connection = URL("https://client.badssl.com/").openConnection() as HttpsURLConnection
        return try {
            connection.requestMethod = "GET"
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            val applyResult = mtlsHttpSupport.applyIfNeeded(connection, profile)
            if (applyResult is com.termlink.app.data.ApiResult.Failure) {
                return HttpResult(
                    statusCode = null,
                    body = null,
                    failure = applyResult.error.cause ?: IllegalStateException(applyResult.error.message)
                )
            }
            val statusCode = connection.responseCode
            val body = readResponseBody(connection, statusCode)
            HttpResult(
                statusCode = statusCode,
                body = body,
                failure = if (statusCode == 200) null else IllegalStateException("HTTP $statusCode: $body")
            )
        } catch (t: Throwable) {
            HttpResult(statusCode = null, body = null, failure = t)
        } finally {
            connection.disconnect()
        }
    }

    private fun performProtectedGetWithRetry(profile: ServerProfile, attempts: Int = 3): HttpResult {
        var lastResult = HttpResult(statusCode = null, body = null, failure = null)
        repeat(attempts) { index ->
            lastResult = performProtectedGet(profile)
            if (lastResult.statusCode == 200) {
                return lastResult
            }
            if (index < attempts - 1) {
                Thread.sleep(1_000)
            }
        }
        return lastResult
    }

    private fun loadProtectedPage(profile: ServerProfile): WebViewLoadResult {
        val latch = CountDownLatch(1)
        var loadedUrl: String? = null
        var failure: Throwable? = null
        var sawClientCertRequest = false

        launchValidationActivity().use { scenario ->
            scenario.onActivity { activity ->
                val webView = WebView(activity).apply {
                    settings.javaScriptEnabled = true
                }
                webView.webViewClient = object : MtlsWebViewClient(
                    appContext = activity.applicationContext,
                    profileProvider = { profile },
                    eventListener = object : MtlsEventListener {
                        override fun onMtlsError(code: String, message: String) {
                            failure = IllegalStateException("$code: $message")
                            latch.countDown()
                        }
                    }
                ) {
                    override fun onReceivedClientCertRequest(
                        view: WebView,
                        request: ClientCertRequest
                    ) {
                        sawClientCertRequest = true
                        super.onReceivedClientCertRequest(view, request)
                    }

                    override fun onReceivedError(
                        view: WebView,
                        request: WebResourceRequest,
                        error: WebResourceError
                    ) {
                        if (request.isForMainFrame) {
                            failure = IllegalStateException("WebView error ${error.errorCode}: ${error.description}")
                            latch.countDown()
                        }
                    }

                    override fun onReceivedHttpError(
                        view: WebView,
                        request: WebResourceRequest,
                        errorResponse: WebResourceResponse
                    ) {
                        if (request.isForMainFrame) {
                            failure = IllegalStateException(
                                "WebView HTTP ${errorResponse.statusCode}: ${errorResponse.reasonPhrase}"
                            )
                            latch.countDown()
                        }
                    }

                    override fun onPageFinished(view: WebView, url: String?) {
                        if (url?.startsWith("https://client.badssl.com") != true) {
                            return
                        }
                        loadedUrl = url
                        latch.countDown()
                    }
                }
                activity.attachWebView(webView)
                webView.loadUrl("https://client.badssl.com/")
            }
            assertTrue("Timed out waiting for WebView mTLS page", latch.await(90, TimeUnit.SECONDS))
        }

        failure?.let { throw it }
        return WebViewLoadResult(
            loadedUrl = loadedUrl.orEmpty(),
            sawClientCertRequest = sawClientCertRequest
        )
    }

    private fun launchValidationActivity(): ActivityScenario<MtlsValidationTestActivity> {
        val intent = Intent(context, MtlsValidationTestActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return ActivityScenario.launch(intent)
    }

    private fun readResponseBody(connection: HttpURLConnection, statusCode: Int): String {
        val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
        return stream?.bufferedReader()?.use { it.readText() }.orEmpty()
    }

    private fun clearMtlsArtifacts() {
        context.getSharedPreferences("termlink_mtls_credentials", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        File(context.filesDir, "mtls").deleteRecursively()
    }

    private fun disableSystemAnimations() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.executeShellCommand("settings put global window_animation_scale 0").closeQuietly()
        instrumentation.uiAutomation.executeShellCommand("settings put global transition_animation_scale 0").closeQuietly()
        instrumentation.uiAutomation.executeShellCommand("settings put global animator_duration_scale 0").closeQuietly()
        instrumentation.waitForIdleSync()
    }

    private fun ParcelFileDescriptor?.closeQuietly() {
        try {
            this?.close()
        } catch (_: Exception) {
            // Ignore shell descriptor cleanup failures in tests.
        }
    }

    private data class HttpResult(
        val statusCode: Int?,
        val body: String?,
        val failure: Throwable?
    )

    private data class WebViewLoadResult(
        val loadedUrl: String,
        val sawClientCertRequest: Boolean
    )
}
