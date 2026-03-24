package com.termlink.app.ui.sessions

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ExternalSessionStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionListCacheStore
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.TerminalType
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
import java.util.concurrent.atomic.AtomicInteger

@RunWith(AndroidJUnit4::class)
class SessionsFragmentLifecycleTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private val server = MockWebServer()

    @After
    fun tearDown() {
        runCatching { server.shutdown() }
        SessionListCacheStore(context).clearAll()
        ExternalSessionStore(context).deleteByProfile(REMOTE_PROFILE_ID)
        BasicCredentialStore(context).removePassword(REMOTE_PROFILE_ID)
        TestState.reset()
    }

    @Test
    fun refreshCanRunAgainAfterViewDestroyedAndRecreated() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val allowFirstRefreshToFinish = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path != "/api/sessions" || request.method != "GET") {
                    return MockResponse().setResponseCode(404)
                }
                return when (refreshCallCount.incrementAndGet()) {
                    1 -> {
                        firstRefreshStarted.countDown()
                        allowFirstRefreshToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("""[{"id":"remote-1","name":"Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":1,"sessionMode":"terminal"}]""")
                    }

                    2 -> {
                        secondRefreshStarted.countDown()
                        jsonResponse("""[{"id":"remote-2","name":"Remote 2","status":"IDLE","activeConnections":0,"createdAt":2,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                    }

                    else -> jsonResponse("[]")
                }
            }
        }
        server.start()
        prepareRemoteProfile()

        val scenario = launchTestActivity()

        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))

        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        allowFirstRefreshToFinish.countDown()
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
    }

    @Test
    fun createActionCanFinishAfterViewDestroyedAndStillAllowNextRefresh() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val createActionStarted = CountDownLatch(1)
        val allowCreateActionToFinish = CountDownLatch(1)

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                return when {
                    request.path == "/api/sessions" && request.method == "GET" -> {
                        when (refreshCallCount.incrementAndGet()) {
                            1 -> {
                                firstRefreshStarted.countDown()
                                jsonResponse("""[{"id":"remote-1","name":"Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":1,"sessionMode":"terminal"}]""")
                            }

                            2 -> {
                                secondRefreshStarted.countDown()
                                jsonResponse("""[{"id":"remote-2","name":"Remote 2","status":"IDLE","activeConnections":0,"createdAt":2,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions" && request.method == "POST" -> {
                        createActionStarted.countDown()
                        allowCreateActionToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("""{"id":"created-session","name":"Created Session","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile()

        val scenario = launchTestActivity()

        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))

        onView(withId(R.id.btn_create_session)).perform(click())
        onView(withId(R.id.input_create_session_name)).perform(replaceText("Created Session"), closeSoftKeyboard())
        onView(withText(android.R.string.ok)).perform(click())

        assertTrue(createActionStarted.await(5, TimeUnit.SECONDS))

        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        allowCreateActionToFinish.countDown()
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
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
                allowedHosts = ""
            )
        )
        TestState.selection = SessionSelection("", "")
        SessionListCacheStore(context).clearAll()
        ExternalSessionStore(context).deleteByProfile(REMOTE_PROFILE_ID)
    }

    private fun jsonResponse(body: String): MockResponse {
        return MockResponse()
            .setResponseCode(200)
            .setHeader("Content-Type", "application/json")
            .setBody(body)
    }

    companion object {
        private const val REMOTE_PROFILE_ID = "remote-profile"
    }
}
