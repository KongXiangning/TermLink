package com.termlink.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.commit
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ExternalSessionStore
import com.termlink.app.data.MtlsCertificateStore
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerConfigStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.ui.settings.SettingsFragment
import com.termlink.app.web.WebViewClientCertCacheInvalidator

class SettingsActivity : AppCompatActivity(), SettingsFragment.Callbacks {

    private lateinit var serverConfigStore: ServerConfigStore
    private lateinit var basicCredentialStore: BasicCredentialStore
    private lateinit var mtlsCertificateStore: MtlsCertificateStore
    private lateinit var externalSessionStore: ExternalSessionStore
    private lateinit var webViewClientCertCacheInvalidator: WebViewClientCertCacheInvalidator
    private var rootView: View? = null
    private var topBarView: View? = null
    private var fragmentContainerView: View? = null
    private var topBarBasePaddingLeft: Int = 0
    private var topBarBasePaddingTop: Int = 0
    private var topBarBasePaddingRight: Int = 0
    private var topBarBasePaddingBottom: Int = 0
    private var fragmentContainerBasePaddingLeft: Int = 0
    private var fragmentContainerBasePaddingTop: Int = 0
    private var fragmentContainerBasePaddingRight: Int = 0
    private var fragmentContainerBasePaddingBottom: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContentView(R.layout.activity_settings)

        rootView = findViewById(R.id.settings_root)
        topBarView = findViewById(R.id.settings_top_bar)
        fragmentContainerView = findViewById(R.id.settings_fragment_container)
        findViewById<ImageButton>(R.id.btn_settings_back).setOnClickListener { finish() }

        topBarView?.let { topBar ->
            topBarBasePaddingLeft = topBar.paddingLeft
            topBarBasePaddingTop = topBar.paddingTop
            topBarBasePaddingRight = topBar.paddingRight
            topBarBasePaddingBottom = topBar.paddingBottom
        }
        fragmentContainerView?.let { container ->
            fragmentContainerBasePaddingLeft = container.paddingLeft
            fragmentContainerBasePaddingTop = container.paddingTop
            fragmentContainerBasePaddingRight = container.paddingRight
            fragmentContainerBasePaddingBottom = container.paddingBottom
        }

        serverConfigStore = ServerConfigStore(applicationContext)
        basicCredentialStore = BasicCredentialStore(applicationContext)
        mtlsCertificateStore = MtlsCertificateStore(applicationContext)
        externalSessionStore = ExternalSessionStore(applicationContext)
        webViewClientCertCacheInvalidator = WebViewClientCertCacheInvalidator()

        applySystemBarInsets()

        if (savedInstanceState == null) {
            supportFragmentManager.commit {
                setReorderingAllowed(true)
                replace(R.id.settings_fragment_container, SettingsFragment())
            }
        }
    }

    override fun getServerConfigState(): ServerConfigState {
        return serverConfigStore.loadState()
    }

    override fun onUpsertProfile(profile: ServerProfile): ServerConfigState {
        val state = serverConfigStore.upsertProfile(profile)
        invalidateWebViewClientCertPreferencesAfterCommittedChange()
        return state
    }

    override fun onDeleteProfile(profileId: String): ServerConfigState {
        externalSessionStore.deleteByProfile(profileId)
        basicCredentialStore.removePassword(profileId)
        val state = serverConfigStore.deleteProfile(profileId)
        invalidateWebViewClientCertPreferencesAfterCommittedChange()
        return state
    }

    override fun getBasicPassword(profileId: String): String? {
        return basicCredentialStore.getPassword(profileId)
    }

    override fun putBasicPassword(profileId: String, password: String) {
        basicCredentialStore.putPassword(profileId, password)
    }

    override fun removeBasicPassword(profileId: String) {
        basicCredentialStore.removePassword(profileId)
    }

    override fun hasMtlsCertificate(profileId: String): Boolean {
        return mtlsCertificateStore.hasCertificate(profileId)
    }

    override fun importMtlsCertificate(profileId: String, uri: Uri): Boolean {
        return mtlsCertificateStore.importCertificate(profileId, uri)
    }

    override fun removeMtlsCertificate(profileId: String) {
        mtlsCertificateStore.removeCertificate(profileId)
    }

    override fun hasMtlsPassword(profileId: String): Boolean {
        return mtlsCertificateStore.hasPassword(profileId)
    }

    override fun putMtlsPassword(profileId: String, password: String) {
        mtlsCertificateStore.putPassword(profileId, password)
    }

    override fun removeMtlsPassword(profileId: String) {
        mtlsCertificateStore.removePassword(profileId)
    }

    private fun invalidateWebViewClientCertPreferencesAfterCommittedChange() {
        webViewClientCertCacheInvalidator.invalidate(onComplete = null)
    }

    private fun applySystemBarInsets() {
        val root = rootView ?: return
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            topBarView?.setPadding(
                topBarBasePaddingLeft,
                topBarBasePaddingTop + systemBars.top,
                topBarBasePaddingRight,
                topBarBasePaddingBottom
            )
            fragmentContainerView?.setPadding(
                fragmentContainerBasePaddingLeft,
                fragmentContainerBasePaddingTop,
                fragmentContainerBasePaddingRight,
                fragmentContainerBasePaddingBottom + systemBars.bottom
            )
            insets
        }
        ViewCompat.requestApplyInsets(root)
    }

    companion object {
        fun newIntent(context: Context): Intent {
            return Intent(context, SettingsActivity::class.java)
        }
    }
}
