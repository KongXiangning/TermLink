package com.termlink.app.codex

import com.termlink.app.codex.domain.CodexLaunchParams
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CodexActivityLaunchParamsTest {

    @Test
    fun explicitThreadIdWinsOverStoredActiveThread() {
        assertEquals(
            "thread-explicit",
            resolveIntentLaunchThreadId(
                intentProfileId = "profile-1",
                intentSessionId = "session-1",
                explicitThreadId = " thread-explicit ",
                storedProfileId = "profile-1",
                storedSessionId = "session-1",
                storedThreadId = "thread-stored"
            )
        )
    }

    @Test
    fun missingExplicitThreadIdFallsBackToStoredActiveThreadForSameSession() {
        assertEquals(
            "thread-stored",
            resolveIntentLaunchThreadId(
                intentProfileId = "profile-1",
                intentSessionId = "session-1",
                explicitThreadId = "undefined",
                storedProfileId = "profile-1",
                storedSessionId = "session-1",
                storedThreadId = " thread-stored "
            )
        )
    }

    @Test
    fun missingExplicitThreadIdDoesNotReuseOtherSessionThread() {
        assertNull(
            resolveIntentLaunchThreadId(
                intentProfileId = "profile-1",
                intentSessionId = "session-1",
                explicitThreadId = null,
                storedProfileId = "profile-1",
                storedSessionId = "session-2",
                storedThreadId = "thread-stored"
            )
        )
    }

    @Test
    fun sameSessionLaunchKeepsCurrentThreadWhenIntentOmitsThread() {
        val current = CodexLaunchParams(
            profileId = "profile-1",
            sessionId = "session-1",
            sessionMode = "codex",
            cwd = "E:\\coding\\TermLink",
            threadId = "thread-active",
            launchSource = "restore"
        )

        val merged = mergeSameSessionLaunchParams(
            next = CodexLaunchParams(
                profileId = "profile-1",
                sessionId = "session-1",
                sessionMode = "codex",
                cwd = null,
                threadId = null,
                launchSource = "notification"
            ),
            current = current
        )

        assertEquals("thread-active", merged.threadId)
        assertEquals("E:\\coding\\TermLink", merged.cwd)
        assertEquals("notification", merged.launchSource)
    }
}
