package com.termlink.app.ui.settings

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import java.io.File

class SettingsFragmentTestActivity : AppCompatActivity(), SettingsFragment.Callbacks {

    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private lateinit var mtlsCertificateStore: MtlsCertificateStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        mtlsCertificateStore = MtlsCertificateStore(applicationContext)

        val container = FrameLayout(this).apply {
            id = CONTAINER_ID
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(container)
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .add(CONTAINER_ID, SettingsFragment(), TAG_SETTINGS_FRAGMENT)
                .commitNow()
        }
    }

    override fun getServerConfigState(): ServerConfigState = serverConfigStore.loadState()

    override fun onUpsertProfile(profile: ServerProfile): ServerConfigState {
        TestSettingsState.callbackEvents.add("upsert:${profile.id}")
        val state = serverConfigStore.upsertProfile(profile)
        TestSettingsState.lastUpsertProfile = profile
        TestSettingsState.callbackEvents.add("invalidateClientCert:${profile.id}")
        return state
    }

    override fun onDeleteProfile(profileId: String): ServerConfigState {
        TestSettingsState.callbackEvents.add("deleteExternalSessions:$profileId")
        basicCredentialStore.removePassword(profileId)
        TestSettingsState.callbackEvents.add("delete:$profileId")
        val state = serverConfigStore.deleteProfile(profileId)
        TestSettingsState.lastDeletedProfileId = profileId
        TestSettingsState.callbackEvents.add("invalidateClientCert:$profileId")
        return state
    }

    override fun getBasicPassword(profileId: String): String? = basicCredentialStore.getPassword(profileId)

    override fun putBasicPassword(profileId: String, password: String) {
        TestSettingsState.callbackEvents.add("putBasic:$profileId")
        basicCredentialStore.putPassword(profileId, password)
    }

    override fun removeBasicPassword(profileId: String) {
        TestSettingsState.callbackEvents.add("removeBasic:$profileId")
        basicCredentialStore.removePassword(profileId)
    }

    override fun hasMtlsCertificate(profileId: String): Boolean = mtlsCertificateStore.hasCertificate(profileId)

    override fun importMtlsCertificate(profileId: String, uri: Uri): Boolean {
        TestSettingsState.callbackEvents.add("importMtls:$profileId")
        return mtlsCertificateStore.importCertificate(profileId, uri)
    }

    override fun removeMtlsCertificate(profileId: String) {
        TestSettingsState.callbackEvents.add("removeMtls:$profileId")
        mtlsCertificateStore.removeCertificate(profileId)
    }

    override fun hasMtlsPassword(profileId: String): Boolean = mtlsCertificateStore.hasPassword(profileId)

    override fun putMtlsPassword(profileId: String, password: String) {
        TestSettingsState.callbackEvents.add("putMtlsPassword:$profileId")
        mtlsCertificateStore.putPassword(profileId, password)
    }

    override fun removeMtlsPassword(profileId: String) {
        TestSettingsState.callbackEvents.add("removeMtlsPassword:$profileId")
        mtlsCertificateStore.removePassword(profileId)
    }

    companion object {
        private const val CONTAINER_ID = 0x5E775045
        private const val TAG_SETTINGS_FRAGMENT = "settings_fragment"
    }
}

internal object TestSettingsState {
    private const val SERVER_PREFS = "termlink_server_config"
    private const val BASIC_PREFS = "termlink_basic_credentials"
    private const val MTLS_PREFS = "termlink_mtls_credentials"

    val callbackEvents: MutableList<String> = mutableListOf()
    var lastUpsertProfile: ServerProfile? = null
    var lastDeletedProfileId: String? = null

    fun reset(context: Context) {
        context.getSharedPreferences(SERVER_PREFS, Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences(BASIC_PREFS, Context.MODE_PRIVATE).edit().clear().commit()
        context.getSharedPreferences(MTLS_PREFS, Context.MODE_PRIVATE).edit().clear().commit()
        File(context.filesDir, "mtls").deleteRecursively()
        callbackEvents.clear()
        lastUpsertProfile = null
        lastDeletedProfileId = null
    }

    fun seedState(context: Context, state: ServerConfigState) {
        ServerConfigStore(context).saveState(state)
    }

    fun seedBasicPassword(context: Context, profileId: String, password: String) {
        BasicCredentialStore(context).putPassword(profileId, password)
    }

    fun seedMtlsPassword(context: Context, profileId: String, password: String) {
        MtlsCertificateStore(context).putPassword(profileId, password)
    }

    fun seedMtlsCertificate(context: Context, profileId: String, bytes: ByteArray): Boolean {
        val sourceFile = File(context.cacheDir, "seed-$profileId.p12").apply {
            writeBytes(bytes)
        }
        return try {
            MtlsCertificateStore(context).importCertificate(profileId, Uri.fromFile(sourceFile))
        } finally {
            sourceFile.delete()
        }
    }
}
