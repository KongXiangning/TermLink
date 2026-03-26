package com.termlink.app.data

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class ServerConfigStoreMtlsCleanupTest {

    private lateinit var context: Context
    private lateinit var store: ServerConfigStore
    private lateinit var mtlsStore: MtlsCertificateStore
    private lateinit var basicStore: BasicCredentialStore

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        clearState()
        store = ServerConfigStore(context)
        mtlsStore = MtlsCertificateStore(context)
        basicStore = BasicCredentialStore(context)
    }

    @After
    fun tearDown() {
        clearState()
    }

    @Test
    fun deleteProfileRemovesMtlsArtifactsAndBasicPassword() {
        val profile = ServerProfile(
            id = "profile-delete",
            name = "Delete Me",
            baseUrl = "https://server.example",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.BASIC,
            basicUsername = "alice",
            mtlsEnabled = true,
            allowedHosts = "server.example",
            mtlsCertificateDisplayName = ""
        )
        val sourceFile = File(context.cacheDir, "profile-delete.p12").apply {
            writeText("dummy")
        }

        store.upsertProfile(profile)
        basicStore.putPassword(profile.id, "basic-secret")
        assertTrue(mtlsStore.importCertificate(profile.id, Uri.fromFile(sourceFile)))
        mtlsStore.putPassword(profile.id, "mtls-secret")

        assertTrue(mtlsStore.hasCertificate(profile.id))
        assertTrue(mtlsStore.hasPassword(profile.id))
        assertTrue(!basicStore.getPassword(profile.id).isNullOrBlank())

        val updatedState = store.deleteProfile(profile.id)

        assertTrue(updatedState.profiles.none { it.id == profile.id })
        assertFalse(mtlsStore.hasCertificate(profile.id))
        assertFalse(mtlsStore.hasPassword(profile.id))
        assertTrue(basicStore.getPassword(profile.id).isNullOrBlank())
        sourceFile.delete()
    }

    private fun clearState() {
        context.getSharedPreferences("termlink_server_config", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        context.getSharedPreferences("termlink_mtls_credentials", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        context.getSharedPreferences("termlink_basic_credentials", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        File(context.filesDir, "mtls").deleteRecursively()
    }
}
