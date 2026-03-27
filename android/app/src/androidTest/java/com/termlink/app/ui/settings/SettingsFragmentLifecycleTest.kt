package com.termlink.app.ui.settings

import android.content.Context
import android.content.Intent
import android.os.ParcelFileDescriptor
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.action.ViewActions.scrollTo
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.RootMatchers.isDialog
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.ServerConfigState
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.TerminalType
import com.termlink.app.ui.settings.SettingsFragmentTestActivity
import com.termlink.app.ui.settings.TestSettingsState
import org.junit.After
import org.junit.Before
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.hamcrest.CoreMatchers.allOf

@RunWith(AndroidJUnit4::class)
class SettingsFragmentLifecycleTest {

    private val context: Context = ApplicationProvider.getApplicationContext()

    @Before
    fun setUp() {
        disableSystemAnimations()
    }

    @After
    fun tearDown() {
        TestSettingsState.reset(context)
    }

    @Test
    fun addProfilePersistsSavedStateAndRendersRow() {
        TestSettingsState.reset(context)
        launchTestActivity().use {
            onView(withId(R.id.btn_add_profile)).perform(click())
            onView(withId(R.id.input_profile_name))
                .perform(replaceText("Saved Profile"), closeSoftKeyboard())
            onView(withId(R.id.input_profile_base_url))
                .perform(replaceText("https://example.com"), closeSoftKeyboard())
            onView(withText(android.R.string.ok)).inRoot(isDialog()).perform(click())

            onView(withText("Saved Profile")).check(matches(isDisplayed()))
        }

        val savedProfile = TestSettingsState.lastUpsertProfile
        assertEquals("Saved Profile", savedProfile?.name)
        assertEquals("https://example.com", savedProfile?.baseUrl)
        assertEquals(
            listOf(
                "upsert:${savedProfile?.id}",
                "invalidateClientCert:${savedProfile?.id}",
                "removeBasic:${savedProfile?.id}",
                "removeMtls:${savedProfile?.id}",
                "removeMtlsPassword:${savedProfile?.id}"
            ),
            TestSettingsState.callbackEvents
        )
        val storedState = ServerConfigState.fromJson(
            com.termlink.app.data.ServerConfigStore(context).loadState().toJson()
        )
        assertTrue(storedState.activeProfileId.isNotBlank())
        assertTrue(storedState.profiles.any { it.name == "Saved Profile" })
    }

    @Test
    fun deleteProfileRemovesRowAndInvokesDeleteCallbacks() {
        TestSettingsState.reset(context)
        val profile = ServerProfile(
            id = "profile-delete",
            name = "Delete Me",
            baseUrl = "https://example.com",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.BASIC,
            basicUsername = "admin",
            mtlsEnabled = false,
            allowedHosts = "",
            mtlsCertificateDisplayName = ""
        )
        TestSettingsState.seedState(context, ServerConfigState(listOf(profile), profile.id))
        TestSettingsState.seedBasicPassword(context, profile.id, "secret")
        assertTrue(TestSettingsState.seedMtlsCertificate(context, profile.id, "cert".toByteArray()))
        TestSettingsState.seedMtlsPassword(context, profile.id, "mtls-secret")

        launchTestActivity().use {
            onView(allOf(withId(R.id.btn_delete_profile), isDisplayed())).perform(click())
            onView(withId(android.R.id.button1))
                .inRoot(isDialog())
                .perform(click())

            onView(withText("Delete Me (Default)")).check(doesNotExist())
        }

        assertEquals(profile.id, TestSettingsState.lastDeletedProfileId)
        assertEquals(
            listOf(
                "removeBasic:${profile.id}",
                "deleteExternalSessions:${profile.id}",
                "delete:${profile.id}",
                "invalidateClientCert:${profile.id}"
            ),
            TestSettingsState.callbackEvents
        )
        val mtlsStore = com.termlink.app.data.MtlsCertificateStore(context)
        val storedState = com.termlink.app.data.ServerConfigStore(context).loadState()
        assertTrue(storedState.profiles.none { it.id == profile.id })
        assertFalse(mtlsStore.hasCertificate(profile.id))
        assertFalse(mtlsStore.hasPassword(profile.id))
        assertEquals(null, com.termlink.app.data.BasicCredentialStore(context).getPassword(profile.id))
    }

    @Test
    fun savingExistingBasicMtlsProfilePersistsMtlsPasswordAfterUpsert() {
        TestSettingsState.reset(context)
        val profile = ServerProfile(
            id = "profile-mtls-password",
            name = "mTLS Pending",
            baseUrl = "https://example.com",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.BASIC,
            basicUsername = "admin",
            mtlsEnabled = true,
            allowedHosts = "api.example.com",
            mtlsCertificateDisplayName = "client.p12"
        )
        TestSettingsState.seedState(context, ServerConfigState(listOf(profile), profile.id))
        TestSettingsState.seedBasicPassword(context, profile.id, "basic-secret")
        assertTrue(TestSettingsState.seedMtlsCertificate(context, profile.id, "cert".toByteArray()))

        launchTestActivity().use {
            onView(allOf(withId(R.id.btn_edit_profile), isDisplayed())).perform(click())
            onView(withId(R.id.input_profile_mtls_password))
                .perform(scrollTo(), replaceText("mtls-secret"), closeSoftKeyboard())
            onView(withText(android.R.string.ok)).inRoot(isDialog()).perform(click())
        }

        assertEquals(
            listOf(
                "upsert:${profile.id}",
                "invalidateClientCert:${profile.id}",
                "putBasic:${profile.id}",
                "putMtlsPassword:${profile.id}"
            ),
            TestSettingsState.callbackEvents
        )
        val savedProfile = com.termlink.app.data.ServerConfigStore(context).loadState().profiles.single()
        assertTrue(savedProfile.mtlsEnabled)
        assertEquals("client.p12", savedProfile.mtlsCertificateDisplayName)
        assertEquals("mtls-secret", com.termlink.app.data.MtlsCertificateStore(context).getPassword(profile.id))
    }

    @Test
    fun removingExistingCertificateDisablesMtlsAndClearsStoredMaterialOnSave() {
        TestSettingsState.reset(context)
        val profile = ServerProfile(
            id = "profile-mtls-remove",
            name = "mTLS Configured",
            baseUrl = "https://example.com",
            terminalType = TerminalType.TERMLINK_WS,
            authType = AuthType.NONE,
            basicUsername = "",
            mtlsEnabled = true,
            allowedHosts = "",
            mtlsCertificateDisplayName = "client.p12"
        )
        TestSettingsState.seedState(context, ServerConfigState(listOf(profile), profile.id))
        assertTrue(TestSettingsState.seedMtlsCertificate(context, profile.id, "cert".toByteArray()))
        TestSettingsState.seedMtlsPassword(context, profile.id, "mtls-secret")

        launchTestActivity().use {
            onView(allOf(withId(R.id.btn_edit_profile), isDisplayed())).perform(click())
            onView(withId(R.id.btn_profile_mtls_remove_certificate)).perform(click())
            onView(withText(android.R.string.ok)).inRoot(isDialog()).perform(click())
        }

        assertEquals(
            listOf(
                "upsert:${profile.id}",
                "invalidateClientCert:${profile.id}",
                "removeBasic:${profile.id}",
                "removeMtls:${profile.id}",
                "removeMtlsPassword:${profile.id}"
            ),
            TestSettingsState.callbackEvents
        )
        val savedProfile = com.termlink.app.data.ServerConfigStore(context).loadState().profiles.single()
        val mtlsStore = com.termlink.app.data.MtlsCertificateStore(context)
        assertFalse(savedProfile.mtlsEnabled)
        assertEquals("", savedProfile.mtlsCertificateDisplayName)
        assertFalse(mtlsStore.hasCertificate(profile.id))
        assertFalse(mtlsStore.hasPassword(profile.id))
    }

    private fun launchTestActivity(): ActivityScenario<SettingsFragmentTestActivity> {
        val intent = Intent(context, SettingsFragmentTestActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return ActivityScenario.launch(intent)
    }

    private fun disableSystemAnimations() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.executeShellCommand(
            "settings put global window_animation_scale 0"
        ).closeQuietly()
        instrumentation.uiAutomation.executeShellCommand(
            "settings put global transition_animation_scale 0"
        ).closeQuietly()
        instrumentation.uiAutomation.executeShellCommand(
            "settings put global animator_duration_scale 0"
        ).closeQuietly()
        instrumentation.waitForIdleSync()
    }

    private fun ParcelFileDescriptor?.closeQuietly() {
        try {
            this?.close()
        } catch (_: Exception) {
            // Ignore shell descriptor cleanup failures in tests.
        }
    }
}
