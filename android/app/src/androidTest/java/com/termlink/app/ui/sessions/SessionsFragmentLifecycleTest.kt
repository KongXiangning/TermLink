package com.termlink.app.ui.sessions

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isDescendantOfA
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withParent
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.termlink.app.R
import com.termlink.app.data.AuthType
import com.termlink.app.data.BasicCredentialStore
import com.termlink.app.data.ExternalSessionStore
import com.termlink.app.data.ServerProfile
import com.termlink.app.data.SessionListCacheStore
import com.termlink.app.data.SessionMode
import com.termlink.app.data.SessionRef
import com.termlink.app.data.SessionSelection
import com.termlink.app.data.SessionSummary
import com.termlink.app.data.TerminalType
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.hamcrest.CoreMatchers.allOf
import org.hamcrest.CoreMatchers.containsString
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
    fun showingHiddenFragmentTriggersRefresh() {
        val refreshStarted = CountDownLatch(1)

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path == "/api/sessions" && request.method == "GET") {
                    refreshStarted.countDown()
                    return jsonResponse("""[{"id":"remote-1","name":"Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":1,"sessionMode":"terminal"}]""")
                }
                return MockResponse().setResponseCode(404)
            }
        }
        server.start()
        prepareRemoteProfile()

        val scenario = launchTestActivity(startHidden = true)

        assertFalse(refreshStarted.await(500, TimeUnit.MILLISECONDS))

        scenario.onActivity { it.showSessionsFragment() }

        assertTrue(refreshStarted.await(5, TimeUnit.SECONDS))
    }

    @Test
    fun hideThenShowAfterInFlightRefreshAllowsNextRefresh() {
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

        val scenario = launchTestActivity(startHidden = true)

        scenario.onActivity { it.showSessionsFragment() }
        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))

        scenario.onActivity { it.hideSessionsFragment() }
        allowFirstRefreshToFinish.countDown()
        scenario.onActivity { it.showSessionsFragment() }

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

    @Test
    fun createActionUpdatesVisibleListAndCacheBeforeFollowupRefreshCompletes() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val allowSecondRefreshToFinish = CountDownLatch(1)

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
                                allowSecondRefreshToFinish.await(5, TimeUnit.SECONDS)
                                jsonResponse("""[{"id":"created-session","name":"Created Session","status":"IDLE","activeConnections":0,"createdAt":2,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions" && request.method == "POST" -> {
                        jsonResponse("""{"id":"created-session","name":"Created Session","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile()

        launchTestActivity().use { scenario ->
            assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))

            onView(withId(R.id.btn_create_session)).perform(click())
            onView(withId(R.id.input_create_session_name)).perform(replaceText("Created Session"), closeSoftKeyboard())
            onView(withText(android.R.string.ok)).perform(click())

            assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionNameVisibility(scenario, "Created Session", expectedVisible = true)
            waitForCachedSessionNames(listOf("Created Session", "Remote 1"))

            allowSecondRefreshToFinish.countDown()
        }
    }

    @Test
    fun createCodexActionKeepsSelectedCwdWhenResponseOmitsIt() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val selectedCwd = "E:\\coding\\TermLink"

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                return when {
                    request.path == "/api/sessions" && request.method == "GET" -> {
                        when (refreshCallCount.incrementAndGet()) {
                            1 -> {
                                firstRefreshStarted.countDown()
                                jsonResponse("[]")
                            }

                            2 -> {
                                jsonResponse(
                                    """[{"id":"created-codex","name":"Codex Session","status":"IDLE","activeConnections":0,"createdAt":2,"lastActiveAt":2,"sessionMode":"codex","cwd":"E:\\coding\\TermLink"}]"""
                                )
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile()

        launchTestActivity().use { scenario ->
            assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForRefreshIdle()

            scenario.onActivity { activity ->
                (activity.getSessionsFragment() as TestSessionsFragment).simulateCreateSessionSuccess(
                    profile = TestState.profiles.single(),
                    requestedName = "Codex Session",
                    requestedCwd = selectedCwd,
                    created = SessionRef(
                        id = "created-codex",
                        name = "Codex Session",
                        sessionMode = SessionMode.CODEX,
                        cwd = null
                    )
                )
            }

            waitForSelection(
                SessionSelection(
                    profileId = REMOTE_PROFILE_ID,
                    sessionId = "created-codex",
                    sessionMode = SessionMode.CODEX,
                    cwd = selectedCwd
                )
            )
        }
    }

    @Test
    fun renameActionCanFinishAfterViewDestroyedAndStillAllowNextRefresh() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val renameActionStarted = CountDownLatch(1)
        val allowRenameActionToFinish = CountDownLatch(1)

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
                                jsonResponse("""[{"id":"remote-1","name":"Renamed Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions/remote-1" && request.method == "PATCH" -> {
                        renameActionStarted.countDown()
                        allowRenameActionToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("""{"id":"remote-1","name":"Renamed Remote 1","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile(selectedSessionId = "remote-1")

        val scenario = launchTestActivity()

        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
        waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = true)

        onView(sessionButtonInRow("Remote 1", R.id.btn_rename_session)).perform(click())
        onView(withId(R.id.input_session_name)).perform(replaceText("Renamed Remote 1"), closeSoftKeyboard())
        onView(withText(android.R.string.ok)).perform(click())

        assertTrue(renameActionStarted.await(5, TimeUnit.SECONDS))

        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        allowRenameActionToFinish.countDown()
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
    }

    @Test
    fun hideThenShowAfterRenameActionCompletionAllowsNextRefresh() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val renameActionStarted = CountDownLatch(1)
        val allowRenameActionToFinish = CountDownLatch(1)

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
                                jsonResponse("""[{"id":"remote-1","name":"Renamed Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions/remote-1" && request.method == "PATCH" -> {
                        renameActionStarted.countDown()
                        allowRenameActionToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("""{"id":"remote-1","name":"Renamed Remote 1","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile(selectedSessionId = "remote-1")

        val scenario = launchTestActivity()

        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
        waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = true)

        onView(sessionButtonInRow("Remote 1", R.id.btn_rename_session)).perform(click())
        onView(withId(R.id.input_session_name)).perform(replaceText("Renamed Remote 1"), closeSoftKeyboard())
        onView(withText(android.R.string.ok)).perform(click())

        assertTrue(renameActionStarted.await(5, TimeUnit.SECONDS))

        scenario.onActivity { it.hideSessionsFragment() }
        allowRenameActionToFinish.countDown()
        scenario.onActivity { it.showSessionsFragment() }

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
    }

    @Test
    fun renameActionUpdatesVisibleListAndCacheBeforeFollowupRefreshCompletes() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val allowSecondRefreshToFinish = CountDownLatch(1)

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
                                allowSecondRefreshToFinish.await(5, TimeUnit.SECONDS)
                                jsonResponse("""[{"id":"remote-1","name":"Renamed Remote 1","status":"IDLE","activeConnections":0,"createdAt":1,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions/remote-1" && request.method == "PATCH" -> {
                        jsonResponse("""{"id":"remote-1","name":"Renamed Remote 1","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile(selectedSessionId = "remote-1")

        launchTestActivity().use { scenario ->
            assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = true)

            onView(sessionButtonInRow("Remote 1", R.id.btn_rename_session)).perform(click())
            onView(withId(R.id.input_session_name)).perform(replaceText("Renamed Remote 1"), closeSoftKeyboard())
            onView(withText(android.R.string.ok)).perform(click())

            assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionNameVisibility(scenario, "Renamed Remote 1", expectedVisible = true)
            waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = false)
            waitForCachedSessionNames(listOf("Renamed Remote 1"))

            allowSecondRefreshToFinish.countDown()
        }
    }

    @Test
    fun deleteActionClearsSelectionAndAllowsNextRefreshAfterViewRecreated() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val deleteActionStarted = CountDownLatch(1)
        val allowDeleteActionToFinish = CountDownLatch(1)

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
                                jsonResponse("""[]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions/remote-1" && request.method == "DELETE" -> {
                        deleteActionStarted.countDown()
                        allowDeleteActionToFinish.await(5, TimeUnit.SECONDS)
                        MockResponse().setResponseCode(204)
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile(selectedSessionId = "remote-1")

        val scenario = launchTestActivity()

        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
        waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = true)

        onView(sessionButtonInRow("Remote 1", R.id.btn_delete_session)).perform(click())
        onView(withId(android.R.id.button1)).perform(click())

        assertTrue(deleteActionStarted.await(5, TimeUnit.SECONDS))

        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        allowDeleteActionToFinish.countDown()
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
        assertEquals(SessionSelection(REMOTE_PROFILE_ID, ""), TestState.selection)
    }

    @Test
    fun deleteActionUpdatesVisibleListAndCacheBeforeFollowupRefreshCompletes() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)
        val allowSecondRefreshToFinish = CountDownLatch(1)

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
                                allowSecondRefreshToFinish.await(5, TimeUnit.SECONDS)
                                jsonResponse("""[]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions/remote-1" && request.method == "DELETE" -> {
                        MockResponse().setResponseCode(204)
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile(selectedSessionId = "remote-1")

        launchTestActivity().use { scenario ->
            assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = true)

            onView(sessionButtonInRow("Remote 1", R.id.btn_delete_session)).perform(click())
            onView(withId(android.R.id.button1)).perform(click())

            assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForSessionNameVisibility(scenario, "Remote 1", expectedVisible = false)
            waitForCachedSessionNames(emptyList())

            allowSecondRefreshToFinish.countDown()
        }
    }

    @Test
    fun delayedOptimisticCacheWriteDoesNotOverrideFollowupRefreshCache() {
        val refreshCallCount = AtomicInteger(0)
        val firstRefreshStarted = CountDownLatch(1)
        val secondRefreshStarted = CountDownLatch(1)

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
                                jsonResponse("""[{"id":"created-session","name":"Remote Authoritative Session","status":"IDLE","activeConnections":0,"createdAt":2,"lastActiveAt":2,"sessionMode":"terminal"}]""")
                            }

                            else -> jsonResponse("[]")
                        }
                    }

                    request.path == "/api/sessions" && request.method == "POST" -> {
                        jsonResponse("""{"id":"created-session","name":"Optimistic Session","sessionMode":"terminal"}""")
                    }

                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        prepareRemoteProfile()

        launchTestActivity().use { scenario ->
            lateinit var scheduler: ControlledCacheWriteScheduler
            scenario.onActivity {
                scheduler = it.controlledCacheWriteScheduler
                scheduler.blockNextCacheWrite()
            }
            assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))

            onView(withId(R.id.btn_create_session)).perform(click())
            onView(withId(R.id.input_create_session_name)).perform(replaceText("Optimistic Session"), closeSoftKeyboard())
            onView(withText(android.R.string.ok)).perform(click())

            assertTrue(scheduler.awaitBlockedCacheWrite(5, TimeUnit.SECONDS))
            assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
            waitForCachedSessionNames(listOf("Remote Authoritative Session"))

            scheduler.releaseBlockedCacheWrite()
            waitForCachedSessionNames(listOf("Remote Authoritative Session"))
        }
    }

    @Test
    fun staleFirstPaintCallbackDoesNotPolluteNewViewAfterRecreate() {
        val refreshCallCount = AtomicInteger(0)
        val firstRemoteRequestStarted = CountDownLatch(1)
        val allowFirstRemoteRequestToFinish = CountDownLatch(1)
        val secondRemoteRequestStarted = CountDownLatch(1)
        val allowSecondRemoteRequestToFinish = CountDownLatch(1)

        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path != "/api/sessions" || request.method != "GET") {
                    return MockResponse().setResponseCode(404)
                }
                return when (refreshCallCount.incrementAndGet()) {
                    1 -> {
                        firstRemoteRequestStarted.countDown()
                        allowFirstRemoteRequestToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("[]")
                    }

                    2 -> {
                        secondRemoteRequestStarted.countDown()
                        allowSecondRemoteRequestToFinish.await(5, TimeUnit.SECONDS)
                        jsonResponse("[]")
                    }

                    else -> jsonResponse("[]")
                }
            }
        }
        server.start()
        prepareRemoteProfile()
        writeRemoteCache(sessionName = "Old Cached", fillerCount = 2000)

        val scenario = launchTestActivity(startHidden = true)
        lateinit var scheduler: ControlledFirstPaintScheduler

        scenario.onActivity {
            scheduler = it.controlledFirstPaintScheduler
            scheduler.blockNextFirstPaint()
            it.showSessionsFragment()
        }
        assertTrue(scheduler.awaitBlockedFirstPaint(5, TimeUnit.SECONDS))
        assertTrue(firstRemoteRequestStarted.await(5, TimeUnit.SECONDS))
        writeRemoteCache(sessionName = "New Cached", fillerCount = 1)
        scenario.recreate()

        scenario.onActivity { it.showSessionsFragment() }

        assertTrue(secondRemoteRequestStarted.await(5, TimeUnit.SECONDS))
        waitForSessionNameVisibility(scenario, "New Cached", expectedVisible = true)
        waitForSessionNameVisibility(scenario, "Old Cached", expectedVisible = false)

        allowSecondRemoteRequestToFinish.countDown()
        scheduler.releaseBlockedFirstPaint()
        allowFirstRemoteRequestToFinish.countDown()
        waitForSessionNameVisibility(scenario, "Old Cached", expectedVisible = false)
    }

    @Test
    fun recreatedViewFallsBackToGlobalFailureWhenStaleStateHasNoVisibleList() {
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
                        MockResponse().setResponseCode(500).setBody("boom")
                    }

                    2 -> {
                        secondRefreshStarted.countDown()
                        MockResponse().setResponseCode(500).setBody("boom")
                    }

                    else -> MockResponse().setResponseCode(500).setBody("boom")
                }
            }
        }
        server.start()
        prepareRemoteProfile()
        writeRemoteCache(sessionName = "Cached Before Recreate", fillerCount = 0)

        val scenario = launchTestActivity()
        assertTrue(firstRefreshStarted.await(5, TimeUnit.SECONDS))
        waitForSessionNameVisibility(scenario, "Cached Before Recreate", expectedVisible = true)

        SessionListCacheStore(context).clearAll()
        scenario.recreate()
        allowFirstRefreshToFinish.countDown()

        assertTrue(secondRefreshStarted.await(5, TimeUnit.SECONDS))
        waitForErrorText(
            scenario = scenario,
            expectedText = "[SERVER_ERROR] HTTP 500"
        )
        waitForErrorTextToExclude(
            scenario = scenario,
            unexpectedText = context.getString(R.string.sessions_cache_stale)
        )
        onView(withText("Cached Before Recreate")).check(doesNotExist())
    }

    private fun launchTestActivity(startHidden: Boolean = false): ActivityScenario<SessionsFragmentTestActivity> {
        val intent = Intent(context, SessionsFragmentTestActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(SessionsFragmentTestActivity.EXTRA_START_HIDDEN, startHidden)
        }
        return ActivityScenario.launch(intent)
    }

    private fun prepareRemoteProfile(selectedSessionId: String = "") {
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
        TestState.selection = SessionSelection(REMOTE_PROFILE_ID, selectedSessionId)
        SessionListCacheStore(context).clearAll()
        ExternalSessionStore(context).deleteByProfile(REMOTE_PROFILE_ID)
    }

    private fun writeRemoteCache(sessionName: String, fillerCount: Int) {
        val profile = TestState.profiles.single()
        val sessions = buildList {
            add(createSessionSummary(id = sessionName.lowercase().replace(' ', '-'), name = sessionName, timestamp = 1L))
            repeat(fillerCount) { index ->
                add(
                    createSessionSummary(
                        id = "filler-$index",
                        name = "Filler $index",
                        timestamp = index + 2L
                    )
                )
            }
        }
        SessionListCacheStore(context).replaceProfile(profile, sessions, fetchedAt = 1L)
    }

    private fun createSessionSummary(id: String, name: String, timestamp: Long): SessionSummary {
        return SessionSummary(
            id = id,
            name = name,
            status = "IDLE",
            activeConnections = 0,
            createdAt = timestamp,
            lastActiveAt = timestamp,
            sessionMode = SessionMode.TERMINAL,
            cwd = null
        )
    }

    private fun waitForSessionNameVisibility(
        scenario: ActivityScenario<SessionsFragmentTestActivity>,
        sessionName: String,
        expectedVisible: Boolean,
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
            val isVisible = sessionName in lastNames
            if (isVisible == expectedVisible) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError(
            "Expected session visibility for '$sessionName' to be $expectedVisible, but visible names were: $lastNames"
        )
    }

    private fun waitForCachedSessionNames(
        expectedNames: List<String>,
        timeoutMs: Long = 5_000L
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastNames: List<String> = emptyList()
        while (System.currentTimeMillis() < deadline) {
            lastNames = SessionListCacheStore(context)
                .loadForProfiles(TestState.profiles)
                .flatMap { cached -> cached.sessions.map { it.name } }
            if (lastNames == expectedNames) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError(
            "Timed out waiting for cached session names $expectedNames. Last names: $lastNames"
        )
    }

    private fun waitForRefreshIdle(timeoutMs: Long = 5_000L) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var refreshing = true
        while (System.currentTimeMillis() < deadline) {
            onView(withId(R.id.sessions_swipe_refresh)).check { view, _ ->
                refreshing = (view as androidx.swiperefreshlayout.widget.SwipeRefreshLayout).isRefreshing
            }
            if (!refreshing) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError("Timed out waiting for sessions refresh to become idle")
    }

    private fun waitForSelection(
        expected: SessionSelection,
        timeoutMs: Long = 5_000L
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        var lastSelection = SessionSelection("", "")
        while (System.currentTimeMillis() < deadline) {
            lastSelection = TestState.selection
            if (lastSelection == expected) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError(
            "Timed out waiting for selection $expected. Last selection: $lastSelection"
        )
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
        throw AssertionError("Timed out waiting for error text '$expectedText'. Last text: '$lastText'")
    }

    private fun waitForErrorTextToExclude(
        scenario: ActivityScenario<SessionsFragmentTestActivity>,
        unexpectedText: String,
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
            if (!lastText.contains(unexpectedText)) {
                return
            }
            Thread.sleep(50L)
        }
        throw AssertionError("Timed out waiting for error text to exclude '$unexpectedText'. Last text: '$lastText'")
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
            val text = normalizeSessionName(view.text?.toString().orEmpty())
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

    private fun sessionButtonInRow(sessionName: String, buttonId: Int) = allOf(
        withId(buttonId),
        isDescendantOfA(
            allOf(
                withId(R.id.session_card),
                hasDescendant(allOf(withId(R.id.session_name), withText(containsString(sessionName))))
            )
        )
    )

    private fun normalizeSessionName(rawText: String): String {
        return rawText.trim().removeSuffix(" (Selected)")
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
