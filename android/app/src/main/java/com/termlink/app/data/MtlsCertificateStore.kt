package com.termlink.app.data

import android.content.Context
import android.net.Uri
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import java.io.File
import java.io.InputStream

class MtlsCertificateStore(context: Context) {

    private val appContext = context.applicationContext
    private val certificateDir by lazy {
        File(appContext.filesDir, CERTIFICATE_DIR_NAME).apply { mkdirs() }
    }
    private val prefs by lazy {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            PREFS_NAME,
            masterKeyAlias,
            appContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun hasCertificate(profileId: String): Boolean {
        return certificateFile(profileId)?.isFile == true
    }

    fun openCertificateInputStream(profileId: String): InputStream? {
        val file = certificateFile(profileId) ?: return null
        if (!file.isFile) return null
        return file.inputStream()
    }

    fun importCertificate(profileId: String, sourceUri: Uri): Boolean {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return false
        val targetFile = certificateFile(normalizedId) ?: return false
        val tempFile = File(targetFile.parentFile, "${targetFile.name}.tmp")
        return try {
            appContext.contentResolver.openInputStream(sourceUri)?.use { input ->
                tempFile.outputStream().use { output -> input.copyTo(output) }
            } ?: return false
            if (targetFile.exists()) {
                targetFile.delete()
            }
            if (!tempFile.renameTo(targetFile)) {
                return false
            }
            MtlsCredentialRepository.clear(normalizedId)
            true
        } catch (_: Exception) {
            false
        } finally {
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }

    fun removeCertificate(profileId: String) {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return
        certificateFile(normalizedId)?.delete()
        MtlsCredentialRepository.clear(normalizedId)
    }

    fun getCertificateLastModified(profileId: String): Long {
        return certificateFile(profileId)?.takeIf { it.isFile }?.lastModified() ?: 0L
    }

    fun putPassword(profileId: String, password: String) {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return
        prefs.edit().putString(passwordKey(normalizedId), password).apply()
        MtlsCredentialRepository.clear(normalizedId)
    }

    fun getPassword(profileId: String): String? {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return null
        return prefs.getString(passwordKey(normalizedId), null)
    }

    fun hasPassword(profileId: String): Boolean {
        return !getPassword(profileId).isNullOrBlank()
    }

    fun removePassword(profileId: String) {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return
        prefs.edit().remove(passwordKey(normalizedId)).apply()
        MtlsCredentialRepository.clear(normalizedId)
    }

    fun removeAllForProfile(profileId: String) {
        removeCertificate(profileId)
        removePassword(profileId)
    }

    private fun certificateFile(profileId: String): File? {
        val normalizedId = profileId.trim()
        if (normalizedId.isBlank()) return null
        return File(certificateDir, "$normalizedId.p12")
    }

    private fun passwordKey(profileId: String): String = "mtls_password_$profileId"

    companion object {
        private const val PREFS_NAME = "termlink_mtls_credentials"
        private const val CERTIFICATE_DIR_NAME = "mtls"
    }
}
