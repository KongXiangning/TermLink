package com.termlink.app.data

import android.content.Context
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class MtlsCertificateStoreTest {

    private lateinit var context: Context
    private lateinit var store: MtlsCertificateStore

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        store = MtlsCertificateStore(context)
        clearMtlsArtifacts()
    }

    @After
    fun tearDown() {
        clearMtlsArtifacts()
    }

    @Test
    fun importOpenAndRemoveAllForProfileManageCertificateAndPassword() {
        val profileId = "profile-import"
        val certificateBytes = "dummy-p12-content".toByteArray(Charsets.UTF_8)
        val sourceFile = File(context.cacheDir, "source-$profileId.p12").apply {
            writeBytes(certificateBytes)
        }

        assertTrue(store.importCertificate(profileId, Uri.fromFile(sourceFile)))
        assertTrue(store.hasCertificate(profileId))
        assertTrue(store.getCertificateLastModified(profileId) > 0L)
        assertArrayEquals(
            certificateBytes,
            store.openCertificateInputStream(profileId)?.use { it.readBytes() }
        )

        store.putPassword(profileId, "secret")
        assertTrue(store.hasPassword(profileId))
        assertTrue(store.getPassword(profileId) == "secret")

        store.removeAllForProfile(profileId)

        assertFalse(store.hasCertificate(profileId))
        assertNull(store.openCertificateInputStream(profileId))
        assertTrue(store.getCertificateLastModified(profileId) == 0L)
        assertFalse(store.hasPassword(profileId))
        assertNull(store.getPassword(profileId))
        sourceFile.delete()
    }

    @Test
    fun blankProfileIdIsRejectedAcrossOperations() {
        val sourceFile = File(context.cacheDir, "source-blank.p12").apply {
            writeText("content")
        }

        assertFalse(store.importCertificate("   ", Uri.fromFile(sourceFile)))
        assertFalse(store.hasCertificate("   "))
        assertNull(store.openCertificateInputStream("   "))
        assertTrue(store.getCertificateLastModified("   ") == 0L)

        store.putPassword("   ", "secret")
        assertFalse(store.hasPassword("   "))
        assertNull(store.getPassword("   "))
        store.removeAllForProfile("   ")

        sourceFile.delete()
    }

    @Test
    fun importFailureReturnsFalseWithoutPersistingCertificate() {
        val profileId = "profile-missing-source"
        val missingUri = Uri.parse("content://com.termlink.app.tests.mtls/missing.p12")

        assertFalse(store.importCertificate(profileId, missingUri))
        assertFalse(store.hasCertificate(profileId))
        assertNull(store.openCertificateInputStream(profileId))
        assertTrue(store.getCertificateLastModified(profileId) == 0L)
    }

    private fun clearMtlsArtifacts() {
        context.getSharedPreferences("termlink_mtls_credentials", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .commit()
        File(context.filesDir, "mtls").deleteRecursively()
    }
}
