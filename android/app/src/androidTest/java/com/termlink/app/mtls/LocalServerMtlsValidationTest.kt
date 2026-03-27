package com.termlink.app.mtls

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.data.ApiResult
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionApiClient
import com.termlink.app.data.SessionMode
import com.termlink.app.data.TerminalType
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileInputStream

@RunWith(AndroidJUnit4::class)
class LocalServerMtlsValidationTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private lateinit var mtlsCertificateStore: MtlsCertificateStore
    private lateinit var sessionApiClient: SessionApiClient

    @Before
    fun setUp() {
        serverConfigStore = ServerConfigStore(context)
        basicCredentialStore = BasicCredentialStore(context)
        mtlsCertificateStore = MtlsCertificateStore(context)
        sessionApiClient = SessionApiClient(context)
    }

    @Test
    fun seedLocalMtlsProfileAndValidateSessionsApi() {
        val args = InstrumentationRegistry.getArguments()
        val baseUrl = args.getString(ARG_BASE_URL).orEmpty().trim()
        val allowedHosts = args.getString(ARG_ALLOWED_HOSTS).orEmpty().trim()
        val p12Path = args.getString(ARG_P12_PATH).orEmpty().trim()
        val p12Password = args.getString(ARG_P12_PASSWORD).orEmpty()
        val basicUsername = args.getString(ARG_BASIC_USERNAME, "admin").orEmpty()
        val basicPassword = args.getString(ARG_BASIC_PASSWORD, "admin").orEmpty()

        require(baseUrl.isNotBlank()) { "Missing instrumentation arg: $ARG_BASE_URL" }
        require(allowedHosts.isNotBlank()) { "Missing instrumentation arg: $ARG_ALLOWED_HOSTS" }
        require(p12Path.isNotBlank()) { "Missing instrumentation arg: $ARG_P12_PATH" }
        require(p12Password.isNotBlank()) { "Missing instrumentation arg: $ARG_P12_PASSWORD" }

        val profile = ServerProfile(
            id = PROFILE_ID,
            name = "Local mTLS Validation",
            baseUrl = baseUrl,
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.BASIC,
            basicUsername = basicUsername,
            mtlsEnabled = true,
            allowedHosts = allowedHosts,
            mtlsCertificateDisplayName = File(p12Path).name
        )

        val stagingFile = File(context.cacheDir, "${profile.id}.p12").apply {
            outputStream().use { output ->
                FileInputStream(p12Path).use { input -> input.copyTo(output) }
            }
        }
        assertTrue(
            "Failed to import local mTLS certificate from $p12Path",
            mtlsCertificateStore.importCertificate(profile.id, Uri.fromFile(stagingFile))
        )
        stagingFile.delete()
        mtlsCertificateStore.putPassword(profile.id, p12Password)
        basicCredentialStore.putPassword(profile.id, basicPassword)
        serverConfigStore.saveState(ServerConfigState(listOf(profile), profile.id))

        context.getSharedPreferences(SHELL_PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST_PROFILE_ID, profile.id)
            .putString(KEY_LAST_SESSION_MODE, SessionMode.TERMINAL.wireValue)
            .remove(KEY_LAST_SESSION_ID)
            .apply()

        val listResult = sessionApiClient.listSessions(profile)
        require(listResult is ApiResult.Success) {
            "listSessions failed: ${(listResult as? ApiResult.Failure)?.error}"
        }

        val createResult = sessionApiClient.createSession(profile, "Local mTLS Validation Session")
        require(createResult is ApiResult.Success) {
            "createSession failed: ${(createResult as? ApiResult.Failure)?.error}"
        }
    }

    companion object {
        private const val PROFILE_ID = "local-mtls-validation"
        private const val SHELL_PREFS = "termlink_shell"
        private const val KEY_LAST_PROFILE_ID = "last_profile_id"
        private const val KEY_LAST_SESSION_MODE = "last_session_mode"
        private const val KEY_LAST_SESSION_ID = "last_session_id"
        private const val ARG_BASE_URL = "baseUrl"
        private const val ARG_ALLOWED_HOSTS = "allowedHosts"
        private const val ARG_P12_PATH = "p12Path"
        private const val ARG_P12_PASSWORD = "p12Password"
        private const val ARG_BASIC_USERNAME = "basicUsername"
        private const val ARG_BASIC_PASSWORD = "basicPassword"
    }
}
