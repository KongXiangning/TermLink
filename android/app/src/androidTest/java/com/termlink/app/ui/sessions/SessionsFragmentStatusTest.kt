package com.termlink.app.ui.sessions

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionListCacheStore
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import com.termlink.app.ui.sessions.SessionsFragmentTestActivity
import com.termlink.app.ui.sessions.TestState
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import android.view.View
import android.widget.TextView
import org.hamcrest.CoreMatchers.containsString
import org.hamcrest.Matchers.allOf

@RunWith(AndroidJUnit4::class)
class SessionsFragmentStatusTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val server = MockWebServer()

    @After
    fun tearDown() {
        runCatching { server.shutdown() }
        SessionListCacheStore(context).clearAll()
        BasicCredentialStore(context).removePassword(REMOTE_PROFILE_ID)
        TestState.reset()
    }

    @Test
    fun showsRefreshingBannerWhenCachedSessionsAreVisible() {
        val refreshStarted = CountDownLatch(1)
        val allowRefreshToFinish = CountDownLatch(1)

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path == "/api/sessions" && request.method == "GET") {
                    refreshStarted.countDown()
                    allowRefreshToFinish.await(5, TimeUnit.SECONDS)
                    return jsonResponse("[]")
                }
                return MockResponse().setResponseCode(404)
            }
        }
        server.start()
        prepareRemoteProfile()
        writeRemoteCache("Cached Session")

        launchTestActivity().use { scenario ->
            assertTrue(refreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionName(scenario, "Cached Session")
            onView(withId(R.id.sessions_error_text))
                .check(matches(withText(containsString(context.getString(R.string.sessions_cache_refreshing)))))
            allowRefreshToFinish.countDown()
        }
    }

    @Test
    fun showsStaleBannerAndKeepsCachedSessionsWhenRefreshFails() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path == "/api/sessions" && request.method == "GET") {
                    return MockResponse().setResponseCode(500).setBody("boom")
                }
                return MockResponse().setResponseCode(404)
            }
        }
        server.start()
        prepareRemoteProfile()
        writeRemoteCache("Cached Session")

        launchTestActivity().use { scenario ->
            waitForSessionName(scenario, "Cached Session")
            onView(withId(R.id.sessions_error_text))
                .check(matches(withText(containsString(context.getString(R.string.sessions_cache_stale)))))
        }
    }

    @Test
    fun showsGlobalFailureWhenNoCachedSessionsExistAndRefreshFails() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path == "/api/sessions" && request.method == "GET") {
                    return MockResponse().setResponseCode(500).setBody("boom")
                }
                return MockResponse().setResponseCode(404)
            }
        }
        server.start()
        prepareRemoteProfile()

        launchTestActivity().use { scenario ->
            waitForErrorText(scenario, "[SERVER_ERROR] HTTP 500")
            onView(withId(R.id.sessions_error_text)).check(matches(isDisplayed()))
        }
    }

    @Test
    fun keepsPartialRemoteSuccessVisibleWhenAnotherProfileFailsWithoutCache() {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path == "/api/sessions" && request.method == "GET") {
                    return jsonResponse(
                        """
                        [
                          {
                            "id": "remote-session",
                            "name": "Remote Session",
                            "status": "IDLE",
                            "activeConnections": 0,
                            "createdAt": 1,
                            "lastActiveAt": 1,
                            "sessionMode": "terminal"
                          }
                        ]
                        """.trimIndent()
                    )
                }
                return MockResponse().setResponseCode(404)
            }
        }
        server.start()
        prepareMixedProfiles()

        launchTestActivity().use { scenario ->
            waitForSessionName(scenario, "Remote Session")
            waitForErrorTextVisibility(scenario, expectedVisible = false)
            onView(
                allOf(
                    withId(R.id.group_error_text),
                    withText(containsString("EMPTY_BASE_URL")),
                    withText(containsString("Base URL is empty for this profile."))
                )
            ).check(matches(isDisplayed()))
        }
    }

    private fun launchTestActivity(): ActivityScenario<SessionsFragmentTestActivity> {
        val intent = Intent(context, SessionsFragmentTestActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return ActivityScenario.launch(intent)
    }

    private fun prepareRemoteProfile() {
        TestState.profiles = listOf(
            ServerProfile(
                id = REMOTE_PROFILE_ID,
                name = "Remote Profile",
                baseUrl = server.url("/").toString().trimEnd('/'),
                terminalType = TerminalType.TERMLINK_WS,
                authType = AuthType.NONE,
                basicUsername = "",
                mtlsEnabled = false,
                allowedHosts = "",
                mtlsCertificateDisplayName = ""
            )
        )
        TestState.selection = SessionSelection(REMOTE_PROFILE_ID, "")
        SessionListCacheStore(context).clearAll()
    }

    private fun prepareMixedProfiles() {
        TestState.profiles = listOf(
            ServerProfile(
                id = REMOTE_PROFILE_ID,
                name = "Remote Profile",
                baseUrl = server.url("/").toString().trimEnd('/'),
                terminalType = TerminalType.TERMLINK_WS,
                authType = AuthType.NONE,
                basicUsername = "",
                mtlsEnabled = false,
                allowedHosts = "",
                mtlsCertificateDisplayName = ""
            ),
            ServerProfile(
                id = "broken-profile",
                name = "Broken Profile",
                baseUrl = "",
                terminalType = TerminalType.TERMLINK_WS,
                authType = AuthType.NONE,
                basicUsername = "",
                mtlsEnabled = false,
                allowedHosts = "",
                mtlsCertificateDisplayName = ""
            )
        )
        TestState.selection = SessionSelection(REMOTE_PROFILE_ID, "")
        SessionListCacheStore(context).clearAll()
    }

    private fun writeRemoteCache(sessionName: String) {
        val profile = TestState.profiles.single()
        SessionListCacheStore(context).replaceProfile(
            profile = profile,
            sessions = listOf(
                SessionSummary(
                    id = "cached-session",
                    name = sessionName,
                    status = "IDLE",
                    activeConnections = 0,
                    createdAt = 1L,
                    lastActiveAt = 1L,
                    sessionMode = SessionMode.TERMINAL,
                    cwd = null
                )
            ),
            fetchedAt = 1L
        )
    }

    private fun waitForSessionName(
        scenario: ActivityScenario<SessionsFragmentTestActivity>,
        sessionName: String,
        timeoutMs: Long = 5_000L
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastNames: List<String> = emptyList()
        while (System.currentTimeMillis() < deadline) {
            scenario.onActivity { activity ->
                lastNames = activity.getSessionsFragment()
                    .view
                    ?.findViewById<android.widget.LinearLayout>(R.id.sessions_list_container)
                    ?.let(::extractSessionNames)
                    ?: emptyList()
            }
            if (sessionName in lastNames) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError("Timed out waiting for session name: $sessionName. Last names: $lastNames")
    }

    private fun waitForErrorText(
        scenario: ActivityScenario<SessionsFragmentTestActivity>,
        expectedText: String,
        timeoutMs: Long = 5_000L
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastText = ""
        while (System.currentTimeMillis() < deadline) {
            scenario.onActivity { activity ->
                lastText = activity.getSessionsFragment()
                    .view
                    ?.findViewById<TextView>(R.id.sessions_error_text)
                    ?.text
                    ?.toString()
                    .orEmpty()
            }
            if (lastText.contains(expectedText)) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError("Timed out waiting for error text: $expectedText. Last text: $lastText")
    }

    private fun waitForErrorTextVisibility(
        scenario: ActivityScenario<SessionsFragmentTestActivity>,
        expectedVisible: Boolean,
        timeoutMs: Long = 5_000L
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastVisible = !expectedVisible
        while (System.currentTimeMillis() < deadline) {
            scenario.onActivity { activity ->
                lastVisible = activity.getSessionsFragment()
                    .view
                    ?.findViewById<TextView>(R.id.sessions_error_text)
                    ?.visibility == View.VISIBLE
            }
            if (lastVisible == expectedVisible) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError("Timed out waiting for sessions_error_text visibility=$expectedVisible. Last visibility=$lastVisible")
    }

    private fun extractSessionNames(container: android.widget.LinearLayout): List<String> {
        val names = mutableListOf<String>()
        collectVisibleText(container, names)
        return names
    }

    private fun collectVisibleText(view: View, names: MutableList<String>) {
        if (view.visibility != View.VISIBLE) {
            return
        }
        if (view is TextView && view.id == R.id.session_name) {
            val text = view.text?.toString()?.trim().orEmpty()
            if (text.isNotEmpty()) {
                names += text
            }
        }
        if (view is android.view.ViewGroup) {
            for (index in 0 until view.childCount) {
                collectVisibleText(view.getChildAt(index), names)
            }
        }
    }

    private fun jsonResponse(body: String): MockResponse {
        return MockResponse()
            .setResponseCode(200)
            .setHeader("Content-Type", "application/json")
            .setBody(body)
    }

    private companion object {
        const val REMOTE_PROFILE_ID = "remote-profile"
    }
}
