package com.termlink.app.codex

import com.termlink.app.codex.domain.CodexLaunchParams
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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

    @Test
    fun conversationWorkspacePathKeepsSafeRelativePath() {
        assertEquals(
            "docs/readme.md",
            resolveConversationWorkspacePath("docs\\readme.md", "E:\\coding\\TermLink")
        )
    }

    @Test
    fun conversationWorkspacePathMapsAbsolutePathInsideCwd() {
        assertEquals(
            "docs/readme.md",
            resolveConversationWorkspacePath(
                "e:/coding/termlink/docs/readme.md",
                "E:\\coding\\TermLink"
            )
        )
    }

    @Test
    fun conversationWorkspacePathMapsPosixAbsolutePathInsideCwd() {
        assertEquals(
            "docs/readme.md",
            resolveConversationWorkspacePath(
                "/srv/termlink/docs/readme.md",
                "/srv/termlink"
            )
        )
        assertEquals(
            "srv/termlink/docs/readme.md",
            resolveConversationWorkspacePath(
                "/srv/termlink/docs/readme.md",
                "/"
            )
        )
    }

    @Test
    fun conversationWorkspacePathRejectsOutsideOrTraversalPaths() {
        assertNull(
            resolveConversationWorkspacePath(
                "E:\\other\\secret.txt",
                "E:\\coding\\TermLink"
            )
        )
        assertNull(resolveConversationWorkspacePath("../secret.txt", "E:\\coding\\TermLink"))
        assertNull(
            resolveConversationWorkspacePath(
                "/srv/termlink-other/secret.txt",
                "/srv/termlink"
            )
        )
    }

    @Test
    fun batteryOptimizationExemptionIsRequestedOnlyForVisibleActiveTasks() {
        assertTrue(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 35,
                activityVisible = true,
                taskActive = true,
                alreadyExempt = false,
                requestAttempted = false
            )
        )
        assertFalse(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 22,
                activityVisible = true,
                taskActive = true,
                alreadyExempt = false,
                requestAttempted = false
            )
        )
        assertFalse(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 35,
                activityVisible = false,
                taskActive = true,
                alreadyExempt = false,
                requestAttempted = false
            )
        )
        assertFalse(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 35,
                activityVisible = true,
                taskActive = false,
                alreadyExempt = false,
                requestAttempted = false
            )
        )
        assertFalse(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 35,
                activityVisible = true,
                taskActive = true,
                alreadyExempt = true,
                requestAttempted = false
            )
        )
        assertFalse(
            shouldRequestCodexBatteryOptimizationExemption(
                sdkInt = 35,
                activityVisible = true,
                taskActive = true,
                alreadyExempt = false,
                requestAttempted = true
            )
        )
    }

    @Test
    fun foregroundServiceSignatureChangesWithStatusSessionOrThread() {
        val base = buildCodexForegroundServiceSignature(" running ", "session-1", " thread-1 ")

        assertEquals("running|session-1|thread-1", base)
        assertEquals(base, buildCodexForegroundServiceSignature("RUNNING", "session-1", "thread-1"))
        assertFalse(base == buildCodexForegroundServiceSignature("reconnecting", "session-1", "thread-1"))
        assertFalse(base == buildCodexForegroundServiceSignature("running", "session-2", "thread-1"))
        assertFalse(base == buildCodexForegroundServiceSignature("running", "session-1", "thread-2"))
    }

    @Test
    fun quotaNotificationConvertsUsedPercentToLocalizedRemainingPercent() {
        assertEquals(
            "5小时 62% 剩余 · 重置 07/24 18:00 · 一周 23% 剩余",
            formatCodexQuotaNotificationText(
                summary = "5h 38% ⏱07/24 18:00 | 168h 77%",
                remainingLabel = "剩余",
                resetsPrefix = "重置 ",
                retryPrefix = "重试于",
                localizeWindow = {
                    when (it) {
                        "5h" -> "5小时"
                        "168h" -> "一周"
                        else -> it
                    }
                }
            )
        )
    }

    @Test
    fun quotaNotificationFormatsCountRetryAndExtraScopes() {
        assertEquals(
            "requests 12/100 left · retry in 30m · 2 more scopes",
            formatCodexQuotaNotificationText(
                summary = "requests:12/100 | ↺30m | +2",
                remainingLabel = "left",
                resetsPrefix = "resets ",
                retryPrefix = "retry in",
                formatExtraScopes = { "$it more scopes" }
            )
        )
    }

    @Test
    fun quotaNotificationIgnoresBlankSummary() {
        assertEquals(
            "",
            formatCodexQuotaNotificationText(
                summary = "   ",
                remainingLabel = "left",
                resetsPrefix = "resets ",
                retryPrefix = "retry in"
            )
        )
    }
}
