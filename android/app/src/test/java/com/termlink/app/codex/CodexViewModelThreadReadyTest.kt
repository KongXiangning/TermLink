package com.termlink.app.codex

import com.termlink.app.codex.data.CodexIpcStatus
import com.termlink.app.codex.data.CodexCapabilities
import com.termlink.app.codex.data.CodexConversationCheckpoint
import com.termlink.app.codex.data.CodexFollowerMode
import com.termlink.app.codex.data.CodexEffectiveConfig
import com.termlink.app.codex.data.CodexIpcConversationSummary
import com.termlink.app.codex.data.CodexModelOption
import com.termlink.app.codex.data.CodexPermissionProfileOption
import com.termlink.app.codex.data.CodexServerRequest
import com.termlink.app.codex.data.CodexTurnAttachment
import com.termlink.app.codex.data.ActiveGoalInfo
import com.termlink.app.codex.data.DesktopSurfaceSnapshot
import com.termlink.app.codex.data.PendingApprovalInfo
import com.termlink.app.codex.data.PendingPlanActionInfo
import com.termlink.app.codex.data.SurfaceEntry
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexPlanWorkflowState
import com.termlink.app.codex.domain.CodexThreadHistoryEntry
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexHistoryCacheLoadState
import com.termlink.app.codex.domain.CodexHistoryNetworkSyncState
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.ConnectionState
import com.termlink.app.codex.domain.NextTurnOverrides
import com.termlink.app.codex.domain.PERMISSION_CHOICE_ASK
import com.termlink.app.codex.domain.PERMISSION_CHOICE_AUTO_REVIEW
import com.termlink.app.codex.domain.PERMISSION_CHOICE_CUSTOM
import com.termlink.app.codex.domain.PERMISSION_CHOICE_FULL_ACCESS
import com.termlink.app.codex.domain.PERMISSION_PROFILE_CHOICE_PREFIX
import org.json.JSONObject
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakeAutomaticOlderPumpScheduler {
    data class Entry(
        val delayMillis: Long,
        val task: suspend () -> Unit,
        var cancelled: Boolean = false
    )

    val entries = mutableListOf<Entry>()

    fun schedule(delayMillis: Long, task: suspend () -> Unit): AutomaticOlderHistoryPumpHandle {
        val entry = Entry(delayMillis, task)
        entries += entry
        return AutomaticOlderHistoryPumpHandle { entry.cancelled = true }
    }

    fun runNext() {
        val entry = entries.removeFirstOrNull() ?: return
        if (!entry.cancelled) runBlocking { entry.task() }
    }
}

class CodexViewModelThreadReadyTest {
    @Test
    fun threadHistoryEntriesAreScopedToTheCurrentWorkspace() {
        val entries = listOf(
            CodexThreadHistoryEntry("same", "same", cwd = "E:\\coding\\TermLink\\"),
            CodexThreadHistoryEntry("other", "other", cwd = "E:/other"),
            CodexThreadHistoryEntry("unknown", "unknown")
        )

        val scoped = filterThreadHistoryEntriesForCwd(entries, " e:/coding/termlink ")

        assertEquals(listOf("same"), scoped.map { it.id })
    }

    @Test
    fun remoteThreadHistoryRowsWithoutCwdInheritTheScopedRequest() {
        val scoped = scopeRemoteThreadHistoryEntriesForCwd(
            listOf(
                CodexThreadHistoryEntry("same", "same", cwd = "E:/coding/termlink"),
                CodexThreadHistoryEntry("unknown", "unknown"),
                CodexThreadHistoryEntry("other", "other", cwd = "E:/other")
            ),
            "E:\\coding\\TermLink\\"
        )

        assertEquals(listOf("same", "unknown"), scoped.map { it.id })
        assertEquals("E:\\coding\\TermLink\\", scoped[1].cwd)
    }

    @Test
    fun historyTitleFallsBackToNormalizedPreviewWhenExplicitNameIsMissing() {
        val title = resolveCodexThreadHistoryTitleForUi(
            JSONObject()
                .put("id", "thread-preview")
                .put("title", JSONObject.NULL)
                .put("name", JSONObject.NULL)
                .put("preview", "  first line\nsecond\tline  ")
        )

        assertEquals("first line second line", title)
    }

    @Test
    fun historyTitlePrefersExplicitNameAndBoundsPreviewFallback() {
        val namedTitle = resolveCodexThreadHistoryTitleForUi(
            JSONObject()
                .put("name", "真实任务名称")
                .put("preview", "should not replace the explicit name")
        )
        val longPreviewTitle = resolveCodexThreadHistoryTitleForUi(
            JSONObject().put("preview", "x".repeat(200))
        )

        assertEquals("真实任务名称", namedTitle)
        assertEquals(160, longPreviewTitle.length)
        assertTrue(longPreviewTitle.endsWith("…"))
    }

    @Test
    fun historyResumeSelectionDismissesSheetButKeepsResumeActionUntilResponse() {
        val state = CodexUiState(
            threadHistorySheetVisible = true,
            threadHistoryActionThreadId = "thread-target",
            threadHistoryActionKind = "resume",
            threadRenameTargetId = "thread-target",
            threadRenameDraft = "draft"
        )

        val next = dismissThreadHistoryForResumeSelection(state)

        assertFalse(next.threadHistorySheetVisible)
        assertEquals("thread-target", next.threadHistoryActionThreadId)
        assertEquals("resume", next.threadHistoryActionKind)
        assertEquals("", next.threadRenameTargetId)
        assertEquals("", next.threadRenameDraft)
    }

    @Test
    fun historySyncAfterSurfaceOnlyRunsForInitialOrTerminalTransition() {
        assertTrue(shouldRequestHistorySyncAfterSurface(null, "running", desynced = false))
        assertTrue(shouldRequestHistorySyncAfterSurface("running", "completed", desynced = false))
        assertFalse(shouldRequestHistorySyncAfterSurface("running", "running", desynced = false))
        assertFalse(shouldRequestHistorySyncAfterSurface("completed", "completed", desynced = false))
        assertFalse(shouldRequestHistorySyncAfterSurface(null, "running", desynced = true))
    }

    @Test
    fun historySyncRequestIsSuppressedAfterTerminalAckForTheSameSelection() {
        assertTrue(
            shouldRequestHistorySyncForSelection(
                conversationId = "conv-a",
                selectionGeneration = 7L,
                inFlightConversationId = null,
                settledConversationId = null,
                settledGeneration = -1L
            )
        )
        assertFalse(
            shouldRequestHistorySyncForSelection(
                conversationId = "conv-a",
                selectionGeneration = 7L,
                inFlightConversationId = null,
                settledConversationId = "conv-a",
                settledGeneration = 7L
            )
        )
        assertTrue(
            shouldRequestHistorySyncForSelection(
                conversationId = "conv-a",
                selectionGeneration = 8L,
                inFlightConversationId = null,
                settledConversationId = "conv-a",
                settledGeneration = 7L
            )
        )
        assertFalse(
            shouldRequestHistorySyncForSelection(
                conversationId = "conv-a",
                selectionGeneration = 8L,
                inFlightConversationId = "conv-a",
                settledConversationId = null,
                settledGeneration = -1L
            )
        )
    }

    @Test
    fun automaticOlderPumpOnlyContinuesAPartialRangeWithMoreBefore() {
        assertTrue(
            shouldScheduleAutomaticOlderHistoryPage(
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                hasMoreBefore = true,
                isCurrentSelection = true,
                requestInFlight = false
            )
        )
        assertFalse(
            shouldScheduleAutomaticOlderHistoryPage(
                rangeEnabled = true,
                syncState = "synced",
                rangeSync = true,
                hasMoreBefore = true,
                isCurrentSelection = true,
                requestInFlight = false
            )
        )
        assertFalse(
            shouldScheduleAutomaticOlderHistoryPage(
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                hasMoreBefore = false,
                isCurrentSelection = true,
                requestInFlight = false
            )
        )
        assertFalse(
            shouldScheduleAutomaticOlderHistoryPage(
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                hasMoreBefore = true,
                isCurrentSelection = false,
                requestInFlight = false
            )
        )
        assertFalse(
            shouldScheduleAutomaticOlderHistoryPage(
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                hasMoreBefore = true,
                isCurrentSelection = true,
                requestInFlight = true
            )
        )
    }

    @Test
    fun automaticOlderPumpRequestsOnlyAfterTheDelayedCheckpointCheck() {
        val scheduler = FakeAutomaticOlderPumpScheduler()
        val coordinator = AutomaticOlderHistoryPumpCoordinator(scheduler::schedule)
        var requests = 0
        var current = true

        assertTrue(
            coordinator.schedule(
                conversationId = "conv-a",
                generation = 4L,
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                isCurrentSelection = { current },
                readHasMoreBefore = { true },
                request = { requests += 1; true }
            )
        )
        assertEquals(250L, scheduler.entries.single().delayMillis)
        assertEquals(0, requests)
        scheduler.runNext()
        assertEquals(1, requests)
    }

    @Test
    fun automaticOlderPumpDelayDoesNotSendAfterSelectionSwitch() {
        val scheduler = FakeAutomaticOlderPumpScheduler()
        val coordinator = AutomaticOlderHistoryPumpCoordinator(scheduler::schedule)
        var current = true
        var requests = 0
        coordinator.schedule(
            conversationId = "conv-a",
            generation = 5L,
            rangeEnabled = true,
            syncState = "partial",
            rangeSync = true,
            isCurrentSelection = { current },
            readHasMoreBefore = { true },
            request = { requests += 1; true }
        )
        current = false
        scheduler.runNext()
        assertEquals(0, requests)
    }

    @Test
    fun automaticOlderPumpCancellationStopsTransportLossContinuation() {
        val scheduler = FakeAutomaticOlderPumpScheduler()
        val coordinator = AutomaticOlderHistoryPumpCoordinator(scheduler::schedule)
        var requests = 0
        coordinator.schedule(
            conversationId = "conv-a",
            generation = 6L,
            rangeEnabled = true,
            syncState = "partial",
            rangeSync = true,
            isCurrentSelection = { true },
            readHasMoreBefore = { true },
            request = { requests += 1; true }
        )
        coordinator.cancel()
        assertTrue(scheduler.entries.single().cancelled)
        scheduler.runNext()
        assertEquals(0, requests)
    }

    @Test
    fun automaticOlderPumpWaitsForPreviousPageTerminalBeforeSchedulingNext() {
        val scheduler = FakeAutomaticOlderPumpScheduler()
        val coordinator = AutomaticOlderHistoryPumpCoordinator(scheduler::schedule)
        var requests = 0
        val readHasMoreBefore = suspend { true }
        val schedule = {
            coordinator.schedule(
                conversationId = "conv-a",
                generation = 7L,
                rangeEnabled = true,
                syncState = "partial",
                rangeSync = true,
                isCurrentSelection = { true },
                readHasMoreBefore = readHasMoreBefore,
                request = { requests += 1; true }
            )
        }
        assertTrue(schedule())
        scheduler.runNext()
        assertEquals(1, requests)
        assertEquals(false, schedule())
        coordinator.markRequestFinished("conv-a", 7L)
        assertTrue(schedule())
        scheduler.runNext()
        assertEquals(2, requests)
    }

    @Test
    fun automaticOlderPumpRejectsLateSyncAfterASelectionGenerationChange() {
        val scheduler = FakeAutomaticOlderPumpScheduler()
        val coordinator = AutomaticOlderHistoryPumpCoordinator(scheduler::schedule)
        var generation = 8L
        var requests = 0
        coordinator.schedule(
            conversationId = "conv-a",
            generation = generation,
            rangeEnabled = true,
            syncState = "partial",
            rangeSync = true,
            isCurrentSelection = { generation == 8L },
            readHasMoreBefore = { true },
            request = { requests += 1; true }
        )
        generation = 9L
        scheduler.runNext()
        assertEquals(0, requests)
    }

    @Test
    fun terminalHistorySyncStatesIncludePartialCacheOnlyAndCompatibilityValues() {
        listOf("synced", "partial", "cache_only", "failed", "offline", "unsupported", "live", "complete")
            .forEach { state ->
                assertTrue("$state should close the bounded sync", isTerminalHistorySyncState(state))
            }
        assertFalse(isTerminalHistorySyncState("syncing"))
        assertFalse(isTerminalHistorySyncState("repairing"))
    }

    @Test
    fun historySyncEventsRequireTheCurrentWireSyncId() {
        assertTrue(acceptsActiveHistorySyncId("sync-a", "sync-a"))
        assertFalse(acceptsActiveHistorySyncId("sync-a", "sync-b"))
        assertFalse(acceptsActiveHistorySyncId("sync-a", null))
        assertFalse(acceptsActiveHistorySyncId(null, "sync-a"))
        assertFalse(acceptsActiveHistorySyncId("  ", "sync-a"))
    }

    @Test
    fun optionalHistoryResumeErrorsAreHiddenOnlyDuringExplicitSelection() {
        assertTrue(
            shouldSuppressHistoryResumeError(
                method = "thread/resume",
                pendingHistoryResumeThreadId = "thread-a"
            )
        )
        assertFalse(
            shouldSuppressHistoryResumeError(
                method = "thread/read",
                pendingHistoryResumeThreadId = "thread-a"
            )
        )
        assertFalse(
            shouldSuppressHistoryResumeError(
                method = "thread/resume",
                pendingHistoryResumeThreadId = null
            )
        )
    }

    @Test
    fun historyUnavailableKeepsSelectionProtectionUntilRecoveryStarts() {
        assertTrue(
            shouldKeepHistoryResumeProtectionForSyncState(
                state = "failed",
                detailCode = "history_unavailable"
            )
        )
        assertTrue(
            shouldKeepHistoryResumeProtectionForSyncState(
                state = "FAILED",
                detailCode = "history_baseline_timeout"
            )
        )
        assertFalse(
            shouldKeepHistoryResumeProtectionForSyncState(
                state = "partial",
                detailCode = "baseline_partial"
            )
        )
        assertFalse(
            shouldKeepHistoryResumeProtectionForSyncState(
                state = "failed",
                detailCode = "history_recovery_failed"
            )
        )
    }

    @Test
    fun lateManifestFailureCannotSettleANewerActiveSync() {
        assertFalse(
            shouldApplyHistoryManifestSendFailure(
                selectionIsCurrent = true,
                activeSyncId = "sync-new",
                manifestSyncId = "sync-old"
            )
        )
        assertTrue(
            shouldApplyHistoryManifestSendFailure(
                selectionIsCurrent = true,
                activeSyncId = "sync-new",
                manifestSyncId = "sync-new"
            )
        )
        assertFalse(
            shouldApplyHistoryManifestSendFailure(
                selectionIsCurrent = false,
                activeSyncId = "sync-old",
                manifestSyncId = "sync-old"
            )
        )
    }

    @Test
    fun cacheOnlyWireStateRemainsExplicitAndIncompleteCacheEscalates() {
        assertEquals(
            CodexHistoryNetworkSyncState.CACHE_ONLY,
            mapHistoryNetworkSyncStateForUi("cache_only")
        )
        assertTrue(
            shouldEscalateHistoryRecovery(
                cacheReady = true,
                cacheComplete = true,
                networkState = mapHistoryNetworkSyncStateForUi("cache_only"),
                authorityMode = IpcAuthorityMode.AWAITING_IPC_SURFACE
            )
        )
        assertTrue(
            shouldEscalateHistoryRecovery(
                cacheReady = true,
                cacheComplete = false,
                networkState = CodexHistoryNetworkSyncState.SYNCED,
                authorityMode = IpcAuthorityMode.AWAITING_IPC_SURFACE
            )
        )
        assertFalse(
            shouldEscalateHistoryRecovery(
                cacheReady = true,
                cacheComplete = true,
                networkState = CodexHistoryNetworkSyncState.SYNCED,
                authorityMode = IpcAuthorityMode.AWAITING_IPC_SURFACE
            )
        )
    }

    @Test
    fun historyPagesKeepIntermediateProgressUntilTheTerminalSyncState() {
        assertEquals(
            CodexHistoryNetworkSyncState.SYNCING,
            historySyncProgressState(CodexHistoryNetworkSyncState.PARTIAL)
        )
        assertEquals(
            CodexHistoryNetworkSyncState.REPAIRING,
            historySyncProgressState(CodexHistoryNetworkSyncState.REPAIRING)
        )
    }

    @Test
    fun inconsistentCompleteHistoryCheckpointIsDowngradedForRepair() {
        val checkpoint = normalizeHistoryCheckpointForAvailableItems(
            checkpoint = CodexConversationCheckpoint(
                endpointId = "home",
                conversationId = "thread-a",
                rootHash = "stale-root",
                itemCount = 12,
                complete = true
            ),
            availableDurableItemCount = 0
        )

        assertNull(checkpoint.rootHash)
        assertEquals(0, checkpoint.itemCount)
        assertFalse(checkpoint.complete)
    }

    @Test
    fun completeHistoryCheckpointRemainsFastPathEligibleWhenRowsMatch() {
        val checkpoint = normalizeHistoryCheckpointForAvailableItems(
            checkpoint = CodexConversationCheckpoint(
                endpointId = "home",
                conversationId = "thread-a",
                rootHash = "root",
                itemCount = 12,
                complete = true
            ),
            availableDurableItemCount = 12
        )

        assertEquals("root", checkpoint.rootHash)
        assertEquals(12, checkpoint.itemCount)
        assertTrue(checkpoint.complete)
    }

    @Test
    fun goalControlUsesResumeOnlyForPausedGoal() {
        assertEquals("resume", goalControlActionForStatus("paused"))
        assertEquals("resume", goalControlActionForStatus("PAUSED"))
        assertEquals("pause", goalControlActionForStatus("active"))
        assertEquals("pause", goalControlActionForStatus("blocked"))
        assertEquals("pause", goalControlActionForStatus(null))
    }

    @Test
    fun newThreadConversationSelectionPreservesPendingGoalMode() {
        val state = CodexUiState(
            activeConversationId = null,
            awaitingNewThreadIpcSurface = true,
            goalMode = true,
            composerRecoveryText = "验证新 Goal"
        )
        val selected = ipcConversation("conv-new-goal", updatedAt = 100)

        val next = applyIpcConversationSelectionToUiState(state, selected)

        assertTrue(next.goalMode)
        assertEquals("验证新 Goal", next.composerRecoveryText)
        assertFalse(next.awaitingNewThreadIpcSurface)
    }


    @Test
    fun imageSurfaceEntryProjectsOpenableAttachment() {
        val merged = mergeSurfaceItems(
            existing = emptyList(),
            surfaceItems = listOf(
                SurfaceEntry(
                    key = "turn-1:status:img:1",
                    kind = "status",
                    role = null,
                    phase = null,
                    text = "已查看 1 张图片",
                    turnId = "turn-1",
                    itemId = null,
                    statusType = "image",
                    attachments = listOf(
                        CodexTurnAttachment(type = "image", path = "E:/coding/TermLink/docs/diagram.png")
                    ),
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            )
        )

        assertEquals(1, merged.size)
        assertEquals("diagram.png", merged.single().attachments.single().label)
        assertEquals("E:/coding/TermLink/docs/diagram.png", merged.single().attachments.single().path)
    }

    @Test
    fun goalPromptSurfaceEntryKeepsUserOrigin() {
        val merged = mergeSurfaceItems(
            existing = emptyList(),
            surfaceItems = listOf(
                SurfaceEntry(
                    key = "thread-goal:objective",
                    kind = "goal_prompt",
                    role = null,
                    phase = null,
                    text = "真实 Goal 目标",
                    turnId = "turn-goal",
                    itemId = null,
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            )
        )

        assertEquals(ChatMessage.Role.USER, merged.single().role)
        assertEquals("goal_prompt", merged.single().contentType)
        assertEquals("真实 Goal 目标", merged.single().content)
    }

    @Test
    fun runningSurfaceKeepsCompletedCommandItemsSeparateUntilTurnFinishes() {
        val entries = listOf("cmd-1", "cmd-2").map { id ->
            SurfaceEntry(
                key = "turn-1:operation:command:$id",
                kind = "status",
                role = null,
                phase = null,
                text = "已运行命令",
                turnId = "turn-1",
                itemId = id,
                statusType = "operation",
                operationType = "command",
                label = "已运行命令",
                detail = id,
                operationStatus = "completed",
                approvalType = null,
                requestId = null,
                raw = null
            )
        }

        val projected = mergeSurfaceItems(
            existing = emptyList(),
            surfaceItems = entries,
            surfaceStatus = "running",
            latestTurnId = "turn-1"
        )

        assertEquals(2, projected.size)
        assertEquals(1, projected[0].operationBatchSize)
        assertEquals(1, projected[1].operationBatchSize)
    }

    @Test
    fun permissionChoicesUseDynamicProfilesAndReplaceTheWholePermissionTuple() {
        val state = CodexUiState(
            permissionProfiles = listOf(
                CodexPermissionProfileOption(":workspace"),
                CodexPermissionProfileOption(":danger-full-access"),
                CodexPermissionProfileOption("team-safe")
            ),
            nextTurnOverrides = NextTurnOverrides(
                sandbox = "read-only",
                approvalPolicy = "never",
                approvalsReviewer = "auto_review"
            )
        )

        assertEquals(
            NextTurnOverrides(
                approvalPolicy = "on-request",
                approvalsReviewer = "user",
                permissionProfile = ":workspace"
            ),
            nextTurnOverridesForPermissionSelection(state, PERMISSION_CHOICE_ASK)
        )
        assertEquals(
            NextTurnOverrides(
                approvalPolicy = "on-request",
                approvalsReviewer = "auto_review",
                permissionProfile = ":workspace"
            ),
            nextTurnOverridesForPermissionSelection(state, PERMISSION_CHOICE_AUTO_REVIEW)
        )
        assertEquals(
            NextTurnOverrides(
                approvalPolicy = "never",
                approvalsReviewer = "user",
                permissionProfile = ":danger-full-access"
            ),
            nextTurnOverridesForPermissionSelection(state, PERMISSION_CHOICE_FULL_ACCESS)
        )
        assertEquals(
            NextTurnOverrides(permissionProfile = "team-safe"),
            nextTurnOverridesForPermissionSelection(
                state,
                PERMISSION_PROFILE_CHOICE_PREFIX + "team-safe"
            )
        )
        assertEquals(
            NextTurnOverrides(useConfigPermissions = true),
            nextTurnOverridesForPermissionSelection(state, PERMISSION_CHOICE_CUSTOM)
        )
    }

    @Test
    fun customPermissionChoiceSuppressesStickyOwnerPermissionValues() {
        val state = CodexUiState(
            ownerCurrentCodexConfig = effectiveConfig(
                sandbox = "danger-full-access",
                approval = "never",
                reviewer = "user",
                permissionProfile = ":danger-full-access"
            ),
            nextTurnOverrides = NextTurnOverrides(useConfigPermissions = true)
        )

        val effective = resolveNextTurnEffectiveCodexConfig(state)

        assertTrue(effective?.useConfigPermissions == true)
        assertNull(effective?.sandboxMode)
        assertNull(effective?.approvalPolicy)
        assertNull(effective?.approvalsReviewer)
        assertNull(effective?.permissionProfile)
        assertEquals(
            state.nextTurnOverrides,
            reconcileOwnerConfirmedOverrides(
                state.nextTurnOverrides,
                effectiveConfig(sandbox = "workspace-write", approval = "on-request")
            )
        )
    }

    @Test
    fun permissionChoicesFallBackToLegacySandboxWhenProfilesAreUnavailable() {
        val ask = nextTurnOverridesForPermissionSelection(CodexUiState(), PERMISSION_CHOICE_ASK)

        assertEquals("workspace-write", ask.sandbox)
        assertEquals("on-request", ask.approvalPolicy)
        assertEquals("user", ask.approvalsReviewer)
        assertNull(ask.permissionProfile)
    }

    @Test
    fun legacyPermissionSelectionsClearModernPermissionFields() {
        val state = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(
                sandbox = "danger-full-access",
                approvalPolicy = "never",
                approvalsReviewer = "user",
                permissionProfile = ":danger-full-access",
                useConfigPermissions = true
            )
        )

        val readOnly = nextTurnOverridesForPermissionSelection(state, "read-only")
        assertEquals("read-only", readOnly.sandbox)
        assertNull(readOnly.approvalPolicy)
        assertNull(readOnly.approvalsReviewer)
        assertNull(readOnly.permissionProfile)
        assertTrue(!readOnly.useConfigPermissions)

        val sessionDefault = nextTurnOverridesForPermissionSelection(
            state.copy(nextTurnOverrides = readOnly),
            null
        )
        assertNull(sessionDefault.sandbox)
        assertNull(sessionDefault.approvalPolicy)
        assertNull(sessionDefault.approvalsReviewer)
        assertNull(sessionDefault.permissionProfile)
        assertTrue(!sessionDefault.useConfigPermissions)
    }

    @Test
    fun modelCatalogTransitionKeepsCurrentModelAndUsesItsActualDefaultReasoning() {
        val state = CodexUiState(model = "model-b")
        val catalog = listOf(
            CodexModelOption(
                id = "model-a",
                displayName = "Model A",
                defaultReasoningEffort = "low",
                supportedReasoningEfforts = listOf("low", "medium"),
                isDefault = true
            ),
            CodexModelOption(
                id = "model-b",
                displayName = "Model B",
                defaultReasoningEffort = "high",
                supportedReasoningEfforts = listOf("medium", "high")
            )
        )

        val updated = applyModelCatalogToUiState(state, catalog)

        assertEquals("model-b", updated.model)
        assertEquals("high", updated.reasoningEffort)
        assertEquals(catalog, updated.modelCatalog)
        assertEquals("high", updated.nextTurnEffectiveCodexConfig?.reasoningEffort)
    }

    @Test
    fun modelCatalogKeepsActiveLegacyModelWithoutAdvertisingItAsSelectable() {
        val state = CodexUiState(
            model = "gpt-legacy",
            capabilities = CodexCapabilities.from(JSONObject("""{"capabilities":{"models":[]}}"""))
        )
        val catalog = listOf(
            CodexModelOption(
                id = "gpt-current",
                displayName = "Current",
                isDefault = true
            ),
            CodexModelOption(
                id = "gpt-legacy",
                displayName = "Legacy",
                hidden = true,
                upgradeModel = "gpt-current"
            )
        )

        val next = applyModelCatalogToUiState(state, catalog)

        assertEquals("gpt-legacy", next.model)
        assertEquals(listOf("gpt-current"), next.capabilities?.models)
        assertEquals(listOf("gpt-current", "gpt-legacy"), next.modelCatalog.map { it.id })
    }

    @Test
    fun modelCatalogTransitionUsesServerDefaultWhenCurrentModelIsUnavailable() {
        val state = CodexUiState(model = "removed-model")
        val catalog = listOf(
            CodexModelOption("model-a", "Model A"),
            CodexModelOption("model-b", "Model B", isDefault = true)
        )

        val updated = applyModelCatalogToUiState(state, catalog)

        assertEquals("model-b", updated.model)
        assertTrue(updated.reasoningEffort.isNullOrBlank())
    }

    @Test
    fun modelSelectionKeepsEffectiveEffortWhenTargetModelSupportsIt() {
        val state = CodexUiState(
            nextTurnEffectiveCodexConfig = effectiveConfig(
                model = "model-a",
                reasoning = "high"
            ),
            modelCatalog = listOf(
                CodexModelOption(
                    id = "model-b",
                    displayName = "Model B",
                    defaultReasoningEffort = "medium",
                    supportedReasoningEfforts = listOf("low", "medium", "high")
                )
            )
        )

        val overrides = nextTurnOverridesForModelSelection(state, "model-b")

        assertEquals("model-b", overrides.model)
        assertNull(overrides.reasoningEffort)
    }

    @Test
    fun modelSelectionUsesTargetDefaultWhenEffectiveEffortIsUnsupported() {
        val state = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(reasoningEffort = "xhigh"),
            modelCatalog = listOf(
                CodexModelOption(
                    id = "model-b",
                    displayName = "Model B",
                    defaultReasoningEffort = "medium",
                    supportedReasoningEfforts = listOf("low", "medium", "high")
                )
            )
        )

        val overrides = nextTurnOverridesForModelSelection(state, "model-b")

        assertEquals("model-b", overrides.model)
        assertEquals("medium", overrides.reasoningEffort)
    }

    @Test
    fun modelSelectionDoesNotInventEffortWhenTargetMetadataHasNoOptions() {
        val state = CodexUiState(
            nextTurnOverrides = NextTurnOverrides(reasoningEffort = "high"),
            modelCatalog = listOf(CodexModelOption("model-b", "Model B"))
        )

        val overrides = nextTurnOverridesForModelSelection(state, "model-b")

        assertEquals("model-b", overrides.model)
        assertNull(overrides.reasoningEffort)
    }

    @Test
    fun ownerConfigHydratesUntilMatchingActiveConversationSnapshotArrives() {
        val waiting = CodexUiState(
            ipcOnline = true,
            followerModeEnabled = true,
            activeConversationId = "conv-active",
            ipcSurfaceSnapshot = surfaceSnapshot("conv-stale")
        )

        assertTrue(isOwnerConfigHydratingForUiState(waiting))

        val hydrated = waiting.copy(ipcSurfaceSnapshot = surfaceSnapshot("conv-active"))
        assertTrue(!isOwnerConfigHydratingForUiState(hydrated))
    }

    @Test
    fun ownerConfigDoesNotBlockLocalFallbackWhenIpcIsOffline() {
        val state = CodexUiState(
            ipcOnline = false,
            followerModeEnabled = true,
            activeConversationId = "conv-active"
        )

        assertTrue(!isOwnerConfigHydratingForUiState(state))
    }

    @Test
    fun missingOwnerSnapshotDoesNotBlockAvailableSessionFallback() {
        val state = CodexUiState(
            ipcOnline = true,
            followerModeEnabled = true,
            activeConversationId = "conv-active",
            awaitingNewThreadIpcSurface = false,
            ipcSurfaceSnapshot = null,
            serverNextTurnConfigBase = effectiveConfig(
                reasoning = "high",
                sandbox = "danger-full-access",
                approval = "never"
            )
        )

        assertTrue(!isOwnerConfigHydratingForUiState(state))
    }

    @Test
    fun explicitNewThreadTransitionStillBlocksUntilOwnerSnapshotArrives() {
        val state = CodexUiState(
            ipcOnline = true,
            followerModeEnabled = true,
            activeConversationId = "conv-new",
            awaitingNewThreadIpcSurface = true,
            ipcSurfaceSnapshot = null
        )

        assertTrue(isOwnerConfigHydratingForUiState(state))
    }

    @Test
    fun mobileSlashActionsDispatchModelNewForkAndCompactToExpectedHandlers() {
        assertEquals(MobileSlashAction.SHOW_MODEL_PICKER, resolveMobileSlashAction("/model"))
        assertEquals(MobileSlashAction.NEW_THREAD, resolveMobileSlashAction("/new"))
        assertEquals(MobileSlashAction.FORK_THREAD, resolveMobileSlashAction("/fork"))
        assertEquals(MobileSlashAction.COMPACT, resolveMobileSlashAction("/compact"))
    }

    @Test
    fun threadReadyKeepsOptimisticUserTailBeforeAckOnFreshThread() {
        val localUserMessage = ChatMessage(
            id = "local-user-1",
            role = ChatMessage.Role.USER,
            content = "please writer thirty short lines about snapshot race debug"
        )
        val state = CodexUiState(
            threadId = null,
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "pending")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "thread-123",
            resumed = false,
            state = state
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "pending"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadReadyStillClearsNonOptimisticMessagesWhenNotResumed() {
        val state = CodexUiState(
            threadId = null,
            currentTurnId = null,
            messages = listOf(
                ChatMessage(
                    id = "assistant-1",
                    role = ChatMessage.Role.ASSISTANT,
                    content = ""
                )
            ),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "stale")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "thread-456",
            resumed = false,
            state = state
        )

        assertTrue(transition.messages.isEmpty())
        assertEquals(CodexRuntimePanelState(visible = true), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadReadyKeepsOptimisticUserTailAcrossKnownNewThreadTransition() {
        val localUserMessage = ChatMessage(
            id = "local-user-2",
            role = ChatMessage.Role.USER,
            content = "continue after plan mode contamination"
        )
        val state = CodexUiState(
            threadId = "plan-thread-1",
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "waiting")
        )

        val transition = buildThreadReadyUiTransition(
            readyThreadId = "fresh-thread-2",
            resumed = false,
            state = state,
            allowThreadIdSwitch = true
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "waiting"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun threadStartedKeepsOptimisticUserTailAcrossKnownNewThreadTransition() {
        val localUserMessage = ChatMessage(
            id = "local-user-3",
            role = ChatMessage.Role.USER,
            content = "after plan"
        )
        val state = CodexUiState(
            threadId = "plan-thread-1",
            currentTurnId = null,
            messages = listOf(localUserMessage),
            runtimePanel = CodexRuntimePanelState(visible = true, diff = "streaming")
        )

        val transition = buildThreadStartedUiTransition(
            startedThreadId = "fresh-thread-2",
            state = state,
            allowThreadIdSwitch = true
        )

        assertEquals(listOf(localUserMessage), transition.messages)
        assertEquals(CodexRuntimePanelState(visible = true, diff = "streaming"), transition.runtimePanel)
        assertEquals(null, transition.currentTurnId)
    }

    @Test
    fun plainTextFallbackIsBlockedWhenIpcConversationIsActive() {
        val state = CodexUiState(
            ipcOnline = true,
            activeConversationId = "conv-live",
            followerModeEnabled = false,
            followerActiveSendAllowed = false
        )

        assertTrue(
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = false,
                hasFileMentions = false
            )
        )
    }

    @Test
    fun ipcConversationNeverFallsBackToLegacyTurnForPlanAttachmentsOrMentions() {
        val state = CodexUiState(
            ipcOnline = true,
            activeConversationId = "conv-live"
        )

        assertEquals(
            true,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = true,
                hasAttachments = false,
                hasFileMentions = false
            )
        )
        assertEquals(
            true,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = true,
                hasFileMentions = false
            )
        )
        assertEquals(
            true,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = false,
                hasFileMentions = true
            )
        )
    }

    @Test
    fun newThreadWithoutCanonicalBindingUsesNormalFirstTurnTransport() {
        val state = CodexUiState(
            ipcOnline = true,
            activeConversationId = "fresh-thread",
            awaitingNewThreadIpcSurface = true,
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        )

        assertEquals(false, shouldUseIpcFollowerTransportState(state))
        assertEquals(
            false,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = false,
                hasFileMentions = false
            )
        )
    }

    @Test
    fun ipcOfflineStatusPreservesGrantedActiveSendCapability() {
        val state = CodexUiState(
            ipcOnline = true,
            ipcClientId = "client-old",
            threadId = "conv-live",
            activeConversationId = "conv-live",
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        )

        val next = applyIpcStatusToUiState(
            state = state,
            status = CodexIpcStatus(online = false, reason = "closed", clientId = null)
        )

        assertEquals(false, next.ipcOnline)
        assertEquals(null, next.ipcClientId)
        assertEquals("conv-live", next.activeConversationId)
        assertEquals(true, next.followerActiveSendAllowed)
        assertEquals(true, next.followerModeEnabled)
        assertTrue(shouldUseIpcFollowerSendTransportState(next))
    }

    @Test
    fun ipcOfflineStatusKeepsActiveSendForTermlinkOwner() {
        val state = CodexUiState(
            ipcOnline = true,
            ipcClientId = "client-old",
            threadId = "conv-owner",
            activeConversationId = "conv-owner",
            followerModeEnabled = true,
            followerActiveSendAllowed = true,
            ipcSurfaceSnapshot = surfaceSnapshot("conv-owner").copy(ownerKind = "termlink")
        )

        val next = applyIpcStatusToUiState(
            state = state,
            status = CodexIpcStatus(online = false, reason = "closed", clientId = null)
        )

        assertEquals(false, next.ipcOnline)
        assertEquals(true, next.followerActiveSendAllowed)
        assertTrue(shouldUseIpcFollowerTransportState(next))
    }

    @Test
    fun ipcFollowerSendTransportDelegatesOfflineExternalOwnerToGateway() {
        val state = CodexUiState(
            ipcOnline = false,
            threadId = "conv-desktop",
            activeConversationId = "conv-desktop",
            followerModeEnabled = true,
            followerActiveSendAllowed = true,
            ipcSurfaceSnapshot = surfaceSnapshot("conv-desktop").copy(ownerKind = "desktop")
        )

        assertTrue(shouldUseIpcFollowerSendTransportState(state))
        assertEquals(false, shouldUseIpcFollowerTransportState(state))
    }

    @Test
    fun ipcFollowerTransportAcceptsBoundThreadWhileAwaitingFreshSurface() {
        val state = CodexUiState(
            ipcOnline = true,
            threadId = "conv-bound",
            activeConversationId = "conv-bound",
            awaitingNewThreadIpcSurface = true,
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        )

        assertTrue(shouldUseIpcFollowerSendTransportState(state))
    }

    @Test
    fun ipcFollowerTransportRejectsMismatchedThreadBinding() {
        val state = CodexUiState(
            ipcOnline = true,
            threadId = "conv-a",
            activeConversationId = "conv-b",
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        )

        assertEquals(false, shouldUseIpcFollowerSendTransportState(state))
    }

    @Test
    fun websocketMessageRestoresConnectedStateWhenOpenedEventWasMissed() {
        assertTrue(
            shouldPromoteConnectionStateFromWebSocketMessage(
                connectionState = ConnectionState.CONNECTING
            )
        )
        assertEquals(
            false,
            shouldPromoteConnectionStateFromWebSocketMessage(
                connectionState = ConnectionState.CONNECTED
            )
        )
    }

    @Test
    fun ipcOnlineStatusPreservesFollowerSendGateUntilModeEventArrives() {
        val state = CodexUiState(
            ipcOnline = false,
            ipcClientId = null,
            activeConversationId = "conv-live",
            followerModeEnabled = true,
            followerActiveSendAllowed = false
        )

        val next = applyIpcStatusToUiState(
            state = state,
            status = CodexIpcStatus(online = true, reason = null, clientId = "client-new")
        )

        assertEquals(true, next.ipcOnline)
        assertEquals("client-new", next.ipcClientId)
        assertEquals("conv-live", next.activeConversationId)
        assertEquals(false, next.followerActiveSendAllowed)
    }

    @Test
    fun codexStateThreadChangeRebindsTheActiveConversationAndRequiresResubscribe() {
        val selectedThreadId = resolveCodexStateThreadId(
            serverThreadId = "conv-new",
            activeConversationId = "conv-old",
            currentThreadId = "conv-old"
        )

        assertEquals("conv-new", selectedThreadId)
        assertTrue(
            shouldResubscribeForCodexStateThreadChange(
                previousThreadId = "conv-old",
                serverThreadId = "conv-new"
            )
        )
    }

    @Test
    fun codexStateWithoutThreadKeepsTheCurrentIpcConversationAndDoesNotResubscribe() {
        val selectedThreadId = resolveCodexStateThreadId(
            serverThreadId = null,
            activeConversationId = "conv-live",
            currentThreadId = "thread-history"
        )

        assertEquals("conv-live", selectedThreadId)
        assertEquals(
            false,
            shouldResubscribeForCodexStateThreadChange(
                previousThreadId = "conv-live",
                serverThreadId = null
            )
        )
    }

    @Test
    fun activeFollowerModeEnableIsRequestedOnlyWhenServerAllowsActiveSend() {
        assertEquals(
            true,
            shouldRequestActiveFollowerModeEnable(
                CodexFollowerMode(enabled = false, activeSendAllowed = true)
            )
        )
        assertEquals(
            false,
            shouldRequestActiveFollowerModeEnable(
                CodexFollowerMode(enabled = true, activeSendAllowed = true)
            )
        )
        assertEquals(
            false,
            shouldRequestActiveFollowerModeEnable(
                CodexFollowerMode(enabled = false, activeSendAllowed = false)
            )
        )
    }

    @Test
    fun conversationStatusChangedUpdatesOnlyTheActiveIpcConversation() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            status = "completed"
        )

        val running = applyConversationStatusChangedToUiState(
            state = state,
            conversationId = "conv-live",
            status = "running"
        )

        assertEquals("conv-live", running.activeConversationId)
        assertEquals("running", running.status)

        val ignored = applyConversationStatusChangedToUiState(
            state = running,
            conversationId = "conv-other",
            status = "completed"
        )

        assertEquals("conv-live", ignored.activeConversationId)
        assertEquals("running", ignored.status)
    }

    @Test
    fun initialIpcConversationPrefersExactThreadId() {
        val conversations = listOf(
            ipcConversation("conv-cwd", updatedAt = 300, cwd = "E:\\coding\\TermLink", hasActiveGoal = true),
            ipcConversation("conv-thread", updatedAt = 100, cwd = "E:\\other")
        )

        val selected = chooseInitialIpcConversationForUi(
            conversations = conversations,
            threadId = "conv-thread",
            cwd = "E:\\coding\\TermLink"
        )

        assertEquals("conv-thread", selected?.conversationId)
    }

    @Test
    fun initialIpcConversationPrefersNewestMatchingCwdBeforeActiveGoal() {
        val conversations = listOf(
            ipcConversation("conv-old-cwd", updatedAt = 100, cwd = "E:\\coding\\TermLink"),
            ipcConversation("conv-active-other", updatedAt = 500, cwd = "E:\\other", hasActiveGoal = true),
            ipcConversation("conv-new-cwd", updatedAt = 300, cwd = "E:/coding/TermLink")
        )

        val selected = chooseInitialIpcConversationForUi(
            conversations = conversations,
            threadId = null,
            cwd = "E:\\coding\\TermLink\\"
        )

        assertEquals("conv-new-cwd", selected?.conversationId)
    }

    @Test
    fun initialIpcConversationFallsBackToActiveGoalThenUpdatedAt() {
        val withGoal = chooseInitialIpcConversationForUi(
            conversations = listOf(
                ipcConversation("conv-new", updatedAt = 300),
                ipcConversation("conv-goal", updatedAt = 100, hasActiveGoal = true)
            ),
            threadId = null,
            cwd = null
        )
        assertEquals("conv-goal", withGoal?.conversationId)

        val newest = chooseInitialIpcConversationForUi(
            conversations = listOf(
                ipcConversation("conv-old", updatedAt = 100),
                ipcConversation("conv-new", updatedAt = 300)
            ),
            threadId = null,
            cwd = null
        )
        assertEquals("conv-new", newest?.conversationId)
    }

    @Test
    fun selectedIpcConversationKeepsActiveOnlyWhenStillPresent() {
        val conversations = listOf(
            ipcConversation("conv-active", updatedAt = 100, cwd = "E:\\other"),
            ipcConversation("conv-cwd", updatedAt = 300, cwd = "E:\\coding\\TermLink")
        )

        val selected = selectIpcConversationForUi(
            conversations = conversations,
            activeConversationId = "conv-active",
            threadId = null,
            cwd = "E:\\coding\\TermLink"
        )

        assertEquals("conv-active", selected?.conversationId)
    }

    @Test
    fun selectedIpcConversationReplacesStaleActiveConversation() {
        val conversations = listOf(
            ipcConversation("conv-cwd", updatedAt = 300, cwd = "E:\\coding\\TermLink"),
            ipcConversation("conv-newest", updatedAt = 500, cwd = "E:\\other")
        )

        val selected = selectIpcConversationForUi(
            conversations = conversations,
            activeConversationId = "stale-thread-id",
            threadId = null,
            cwd = "E:\\coding\\TermLink"
        )

        assertEquals("conv-cwd", selected?.conversationId)
    }

    @Test
    fun awaitingNewThreadSelectionDoesNotFallbackToOldConversation() {
        val conversations = listOf(
            ipcConversation("conv-old", updatedAt = 300, cwd = "E:\\coding\\TermLink")
        )

        val selected = selectIpcConversationForUi(
            conversations = conversations,
            activeConversationId = "fresh-thread",
            threadId = "fresh-thread",
            cwd = "E:\\coding\\TermLink",
            awaitingNewThreadIpcSurface = true
        )

        assertNull(selected)
    }

    @Test
    fun awaitingNewThreadSelectionAcceptsOnlyExactNewConversation() {
        val conversations = listOf(
            ipcConversation("conv-old", updatedAt = 300, cwd = "E:\\coding\\TermLink"),
            ipcConversation("fresh-thread", updatedAt = 100, cwd = "E:\\other")
        )

        val selected = selectIpcConversationForUi(
            conversations = conversations,
            activeConversationId = "fresh-thread",
            threadId = "fresh-thread",
            cwd = "E:\\coding\\TermLink",
            awaitingNewThreadIpcSurface = true
        )

        assertEquals("fresh-thread", selected?.conversationId)
    }

    @Test
    fun explicitHistorySelectionRequiresExactIpcConversationAfterHydrationEnds() {
        assertTrue(
            shouldRequireExactIpcConversationSelection(
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                threadId = "history-thread"
            )
        )
        assertTrue(
            !shouldRequireExactIpcConversationSelection(
                pinnedConversationId = null,
                activeConversationId = "stale-thread",
                threadId = "stale-thread"
            )
        )
    }

    @Test
    fun pendingHistorySelectionSuppressesUnscopedAndForeignSessionEvents() {
        assertTrue(
            shouldSuppressExplicitHistorySessionEvent(
                pendingHistoryResumeThreadId = "history-thread",
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                incomingConversationId = null
            )
        )
        assertTrue(
            shouldSuppressExplicitHistorySessionEvent(
                pendingHistoryResumeThreadId = "history-thread",
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                incomingConversationId = "old-thread"
            )
        )
        assertFalse(
            shouldSuppressExplicitHistorySessionEvent(
                pendingHistoryResumeThreadId = "history-thread",
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                incomingConversationId = "history-thread"
            )
        )
    }

    @Test
    fun settledPinnedSelectionStillRejectsLateForeignIdButAllowsGlobalEvents() {
        assertTrue(
            shouldSuppressExplicitHistorySessionEvent(
                pendingHistoryResumeThreadId = null,
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                incomingConversationId = "old-thread"
            )
        )
        assertFalse(
            shouldSuppressExplicitHistorySessionEvent(
                pendingHistoryResumeThreadId = null,
                pinnedConversationId = "history-thread",
                activeConversationId = "history-thread",
                incomingConversationId = null
            )
        )
    }

    @Test
    fun forwardedPayloadThreadIdExtractionAcceptsNestedTurnAndItemShapes() {
        assertEquals(
            "nested-thread",
            extractCodexThreadIdFromPayload(
                raw = JSONObject(),
                params = JSONObject()
                    .put("turn", JSONObject().put("thread", JSONObject().put("id", "nested-thread")))
            )
        )
        assertEquals(
            "item-thread",
            extractCodexThreadIdFromPayload(
                raw = JSONObject(),
                params = JSONObject().put("item", JSONObject().put("threadId", "item-thread"))
            )
        )
    }

    @Test
    fun sessionThreadBindingAcknowledgementAppliesWithoutEchoingSelection() {
        val matching = resolveSessionThreadBindingDecision(
            boundSessionId = "session-1",
            currentSessionId = "session-1"
        )
        val legacyUnscoped = resolveSessionThreadBindingDecision(
            boundSessionId = null,
            currentSessionId = "session-1"
        )
        val foreign = resolveSessionThreadBindingDecision(
            boundSessionId = "session-2",
            currentSessionId = "session-1"
        )

        assertTrue(matching.appliesToCurrentSession)
        assertFalse(matching.shouldSendActiveConversationSelection)
        assertTrue(legacyUnscoped.appliesToCurrentSession)
        assertFalse(legacyUnscoped.shouldSendActiveConversationSelection)
        assertFalse(foreign.appliesToCurrentSession)
        assertFalse(foreign.shouldSendActiveConversationSelection)
    }

    @Test
    fun historyResumeResponseKeepsWaitingOnlyUntilTargetStateArrives() {
        assertTrue(
            shouldAwaitIpcSurfaceAfterThreadResumeResponse(
                targetThreadId = "history-thread",
                pendingHydrationThreadId = "history-thread"
            )
        )
        assertTrue(
            !shouldAwaitIpcSurfaceAfterThreadResumeResponse(
                targetThreadId = "history-thread",
                pendingHydrationThreadId = null
            )
        )
    }

    @Test
    fun matchingHistoryStateEndsResumeHydrationWithoutEndingNewThreadWait() {
        assertTrue(
            !resolveAwaitingIpcSurfaceAfterTargetState(
                currentlyAwaiting = true,
                pendingHistoryResumeThreadId = "history-thread",
                incomingThreadId = "history-thread"
            )
        )
        assertTrue(
            resolveAwaitingIpcSurfaceAfterTargetState(
                currentlyAwaiting = true,
                pendingHistoryResumeThreadId = null,
                incomingThreadId = "fresh-thread"
            )
        )
        assertTrue(
            resolveAwaitingIpcSurfaceAfterTargetState(
                currentlyAwaiting = true,
                pendingHistoryResumeThreadId = "history-thread",
                incomingThreadId = null
            )
        )
    }

    @Test
    fun preparingIpcNewThreadDetachesOldSurfaceAndResetsOverrides() {
        val sessionConfig = effectiveConfig(
            reasoning = "medium",
            sandbox = "read-only",
            approval = "on-request"
        )
        val state = CodexUiState(
            threadId = "conv-old",
            activeConversationId = "conv-old",
            ipcSurfaceSnapshot = surfaceSnapshot("conv-old"),
            ownerCurrentCodexConfig = effectiveConfig(
                reasoning = "high",
                sandbox = "danger-full-access",
                approval = "never"
            ),
            serverNextTurnConfigBase = sessionConfig,
            nextTurnOverrides = NextTurnOverrides(
                reasoningEffort = "low",
                sandbox = "workspace-write"
            )
        )

        val next = prepareIpcStateForNewThread(state)

        assertNull(next.activeConversationId)
        assertNull(next.ipcSurfaceSnapshot)
        assertNull(next.ownerCurrentCodexConfig)
        assertEquals(NextTurnOverrides(), next.nextTurnOverrides)
        assertTrue(next.awaitingNewThreadIpcSurface)
        assertEquals(sessionConfig, next.nextTurnEffectiveCodexConfig)
        assertEquals(next, applyDesktopSurfaceSnapshotToUiState(next, surfaceSnapshot("conv-old")))
    }

    @Test
    fun preparingNonIpcNewThreadPreservesLocalOverride() {
        val overrides = NextTurnOverrides(reasoningEffort = "high", sandbox = "workspace-write")
        val state = CodexUiState(activeConversationId = null, nextTurnOverrides = overrides)

        val next = prepareIpcStateForNewThread(state)

        assertEquals(overrides, next.nextTurnOverrides)
        assertEquals(false, next.awaitingNewThreadIpcSurface)
    }

    @Test
    fun applyingSameIpcConversationSelectionKeepsExistingSurfaceState() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            messages = listOf(ChatMessage(id = "m1", role = ChatMessage.Role.ASSISTANT, content = "old")),
            ipcSurfaceSnapshot = surfaceSnapshot("conv-live"),
            pendingServerRequests = listOf(ipcRequest("req-ipc")),
            planWorkflow = CodexPlanWorkflowState(planRequestId = "plan-1"),
            status = "running"
        )

        val next = applyIpcConversationSelectionToUiState(
            state = state,
            selected = ipcConversation("conv-live", updatedAt = 400, cwd = "E:\\coding\\TermLink")
        )

        assertEquals("conv-live", next.activeConversationId)
        assertEquals("conv-live", next.threadId)
        assertEquals(1, next.messages.size)
        assertEquals("conv-live", next.ipcSurfaceSnapshot?.conversationId)
        assertEquals(1, next.pendingServerRequests.size)
        assertEquals("plan-1", next.planWorkflow.planRequestId)
    }

    @Test
    fun applyingChangedIpcConversationSelectionClearsStaleIpcSurfaceState() {
        val state = CodexUiState(
            activeConversationId = "stale-conv",
            ownerCurrentCodexConfig = effectiveConfig(reasoning = "high", sandbox = "danger-full-access", approval = "never"),
            nextTurnOverrides = NextTurnOverrides(reasoningEffort = "low", sandbox = "read-only"),
            cachedCanonicalMessages = listOf(ChatMessage(id = "cached-stale", role = ChatMessage.Role.ASSISTANT, content = "stale cache")),
            liveAuthoritativeConversationId = "stale-conv",
            liveAuthoritativeDesynced = true,
            messages = listOf(ChatMessage(id = "m1", role = ChatMessage.Role.ASSISTANT, content = "stale")),
            ipcSurfaceSnapshot = surfaceSnapshot("stale-conv"),
            pendingServerRequests = listOf(
                ipcRequest("req-ipc"),
                ipcRequest("req-local", handledBy = "client")
            ),
            submittingServerRequestIds = setOf("req-ipc"),
            planWorkflow = CodexPlanWorkflowState(planRequestId = "plan-1"),
            activeGoal = null,
            status = "running"
        )

        val next = applyIpcConversationSelectionToUiState(
            state = state,
            selected = ipcConversation("conv-live", updatedAt = 400, cwd = "E:\\coding\\TermLink")
        )

        assertEquals("conv-live", next.activeConversationId)
        assertEquals("conv-live", next.threadId)
        assertTrue(next.messages.isEmpty())
        assertNull(next.ipcSurfaceSnapshot)
        assertNull(next.ownerCurrentCodexConfig)
        assertTrue(next.cachedCanonicalMessages.isEmpty())
        assertNull(next.liveAuthoritativeConversationId)
        assertFalse(next.liveAuthoritativeDesynced)
        assertEquals(NextTurnOverrides(), next.nextTurnOverrides)
        assertEquals(listOf("req-local"), next.pendingServerRequests.map { it.requestId })
        assertTrue(next.submittingServerRequestIds.isEmpty())
        assertNull(next.planWorkflow.planRequestId)
    }

    @Test
    fun applyingChangedSelectionClearsCachedMessagesEvenBeforeNewSurfaceArrives() {
        val state = CodexUiState(
            activeConversationId = "conv-a",
            messages = listOf(ChatMessage(id = "a", role = ChatMessage.Role.ASSISTANT, content = "A")),
            cachedCanonicalMessages = listOf(ChatMessage(id = "cached-a", role = ChatMessage.Role.ASSISTANT, content = "A")),
            ipcSurfaceSnapshot = null,
            liveAuthoritativeConversationId = null
        )

        val next = applyIpcConversationSelectionToUiState(
            state,
            ipcConversation("conv-b", updatedAt = 500)
        )

        assertTrue(next.messages.isEmpty())
        assertTrue(next.cachedCanonicalMessages.isEmpty())
        assertEquals(CodexHistoryCacheLoadState.NOT_LOADED, next.historyCacheState.loadState)
        assertEquals(CodexHistoryNetworkSyncState.IDLE, next.historyNetworkSyncState.state)
    }

    @Test
    fun cachedConversationCatalogStatusDoesNotBecomeRuntimeAuthority() {
        val state = CodexUiState(
            activeConversationId = "conv-old",
            threadId = "conv-old",
            status = "idle"
        )

        val next = applyIpcConversationSelectionToUiState(
            state = state,
            selected = ipcConversation(
                conversationId = "conv-cached-running",
                updatedAt = 400,
                cwd = "E:\\coding\\TermLink"
            ).copy(status = "running")
        )

        assertEquals("conv-cached-running", next.activeConversationId)
        assertEquals("idle", next.status)

        val withHealthySurface = applyDesktopSurfaceSnapshotToUiState(
            state = next,
            snap = surfaceSnapshot("conv-cached-running").copy(status = "running", desynced = false)
        )
        assertEquals("running", withHealthySurface.status)
    }

    @Test
    fun applyingChangedIpcConversationSelectionClearsStaleIpcPlanWithoutRequestId() {
        val state = CodexUiState(
            activeConversationId = "stale-conv",
            ipcSurfaceSnapshot = surfaceSnapshot("stale-conv"),
            planWorkflow = CodexPlanWorkflowState(
                planContent = "stale plan",
                canSubmitPlan = true,
                planQuestionId = "confirm"
            )
        )

        val next = applyIpcConversationSelectionToUiState(
            state = state,
            selected = ipcConversation("conv-live", updatedAt = 400, cwd = "E:\\coding\\TermLink")
        )

        assertNull(next.planWorkflow.planContent)
        assertEquals(false, next.planWorkflow.canSubmitPlan)
        assertNull(next.planWorkflow.planQuestionId)
    }

    @Test
    fun historyDeltaMustMatchActiveConversationAndNeverUseOldLiveAuthority() {
        val switched = CodexUiState(
            activeConversationId = "conv-b",
            liveAuthoritativeConversationId = "conv-a"
        )

        assertFalse(shouldApplyHistoryDeltaToUiState(switched, "conv-a"))
        assertTrue(shouldApplyHistoryDeltaToUiState(switched, "conv-b"))
        assertFalse(shouldReplaceMessagesFromHistoryDeltaForUiState(switched, "conv-b"))

        val awaitingSurface = switched.copy(liveAuthoritativeConversationId = null)
        assertTrue(shouldReplaceMessagesFromHistoryDeltaForUiState(awaitingSurface, "conv-b"))

        val desynced = switched.copy(
            liveAuthoritativeConversationId = "conv-b",
            liveAuthoritativeDesynced = true
        )
        assertTrue(shouldReplaceMessagesFromHistoryDeltaForUiState(desynced, "conv-b"))
    }

    @Test
    fun boundedLiveSurfaceKeepsCachedHistoryBaseAndAuthoritativeTail() {
        val state = CodexUiState(
            activeConversationId = "conv-a",
            liveAuthoritativeConversationId = "conv-a",
            messages = listOf(
                ChatMessage(
                    id = "tail",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "实时尾部",
                    streaming = true
                ),
                ChatMessage(
                    id = "live-only",
                    role = ChatMessage.Role.TOOL,
                    content = "实时操作"
                )
            )
        )
        val cached = listOf(
            ChatMessage(id = "old", role = ChatMessage.Role.ASSISTANT, content = "历史正文"),
            ChatMessage(id = "tail", role = ChatMessage.Role.ASSISTANT, content = "旧尾部")
        )

        val merged = mergeCachedHistoryIntoLiveMessagesForUi(state, "conv-a", cached)

        assertEquals(listOf("old", "tail", "live-only"), merged.map { it.id })
        assertEquals("实时尾部", merged[1].content)
        assertTrue(merged[1].streaming)
        assertEquals("实时操作", merged[2].content)
    }

    @Test
    fun cacheFirstSelectionShowsCached正文BeforeLiveSurfaceArrives() {
        val state = CodexUiState(
            activeConversationId = "conv-a",
            liveAuthoritativeConversationId = null,
            messages = emptyList()
        )
        val cached = listOf(
            ChatMessage(id = "old", role = ChatMessage.Role.ASSISTANT, content = "缓存正文")
        )

        val merged = mergeCachedHistoryIntoLiveMessagesForUi(state, "conv-a", cached)

        assertEquals(cached, merged)
    }

    @Test
    fun cachedHistoryDoesNotCarryStaleLiveSurfaceAcrossConversationSelection() {
        val state = CodexUiState(
            activeConversationId = "conv-b",
            liveAuthoritativeConversationId = "conv-a",
            messages = listOf(ChatMessage("a-tail", ChatMessage.Role.ASSISTANT, "A"))
        )
        val cached = listOf(ChatMessage("b-old", ChatMessage.Role.ASSISTANT, "B"))

        val merged = mergeCachedHistoryIntoLiveMessagesForUi(state, "conv-b", cached)

        assertEquals(listOf("b-old"), merged.map { it.id })
    }

    @Test
    fun clearingIpcConversationSelectionRemovesStaleIpcStateButKeepsLocalRequests() {
        val state = CodexUiState(
            activeConversationId = "stale-conv",
            messages = listOf(ChatMessage(id = "m1", role = ChatMessage.Role.ASSISTANT, content = "stale")),
            ipcSurfaceSnapshot = surfaceSnapshot("stale-conv"),
            pendingServerRequests = listOf(
                ipcRequest("req-ipc"),
                ipcRequest("req-local", handledBy = "client")
            ),
            submittingServerRequestIds = setOf("req-ipc"),
            planWorkflow = CodexPlanWorkflowState(
                planContent = "stale plan",
                canSubmitPlan = true,
                planQuestionId = "confirm"
            ),
            followerModeEnabled = true,
            followerActiveSendAllowed = true
        )

        val next = clearIpcConversationSelectionFromUiState(state)

        assertNull(next.activeConversationId)
        assertTrue(next.messages.isEmpty())
        assertNull(next.ipcSurfaceSnapshot)
        assertEquals(listOf("req-local"), next.pendingServerRequests.map { it.requestId })
        assertTrue(next.submittingServerRequestIds.isEmpty())
        assertNull(next.planWorkflow.planContent)
        assertEquals(false, next.planWorkflow.canSubmitPlan)
        assertEquals(false, next.followerModeEnabled)
        assertEquals(false, next.followerActiveSendAllowed)
    }

    @Test
    fun surfaceMergeUpdatesExistingMessageTextForSameKey() {
        val existing = listOf(
            ChatMessage(
                id = "assistant-item-1",
                role = ChatMessage.Role.ASSISTANT,
                content = "我"
            )
        )

        val merged = mergeSurfaceItems(
            existing = existing,
            surfaceItems = listOf(
                SurfaceEntry(
                    key = "assistant-item-1",
                    kind = "message",
                    role = "assistant",
                    phase = "commentary",
                    text = "我会在 D:\\ 根目录创建 s.xx。这个位置不在当前仓库可写范围内，需要走一次权限确认。",
                    turnId = "turn-1",
                    itemId = "assistant-item-1",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            ),
            surfaceStatus = "running",
            latestTurnId = "turn-1"
        )

        assertEquals(1, merged.size)
        assertEquals(
            "我会在 D:\\ 根目录创建 s.xx。这个位置不在当前仓库可写范围内，需要走一次权限确认。",
            merged.single().content
        )
        assertTrue(merged.single().streaming)
    }

    @Test
    fun surfaceMergeRetainsCachedMessagesOutsideTheBoundedLiveTail() {
        val existing = listOf(
            ChatMessage(
                id = "cached-old",
                role = ChatMessage.Role.USER,
                content = "历史正文"
            ),
            ChatMessage(
                id = "tail-old",
                role = ChatMessage.Role.ASSISTANT,
                content = "旧尾部"
            )
        )

        val merged = mergeSurfaceItems(
            existing = existing,
            surfaceItems = listOf(
                SurfaceEntry(
                    key = "tail-old",
                    kind = "message",
                    role = "assistant",
                    phase = "commentary",
                    text = "更新后的尾部",
                    turnId = "turn-1",
                    itemId = "tail-old",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                ),
                SurfaceEntry(
                    key = "tail-new",
                    kind = "message",
                    role = "assistant",
                    phase = "final_answer",
                    text = "最新尾部",
                    turnId = "turn-1",
                    itemId = "tail-new",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            ),
            surfaceStatus = "completed",
            latestTurnId = "turn-1",
            preserveExisting = true
        )

        assertEquals(listOf("cached-old", "tail-old", "tail-new"), merged.map { it.id })
        assertEquals("历史正文", merged[0].content)
        assertEquals("更新后的尾部", merged[1].content)
    }

    @Test
    fun surfaceOperationMapsToCollapsedToolAndTerminalSnapshotStopsStreaming() {
        val merged = mergeSurfaceItems(
            existing = emptyList(),
            surfaceItems = listOf(
                SurfaceEntry(
                    key = "turn-1:operation:command:cmd-1",
                    kind = "status",
                    role = null,
                    phase = null,
                    text = "已运行命令：npm test",
                    turnId = "turn-1",
                    itemId = "cmd-1",
                    statusType = "operation",
                    operationType = "command",
                    label = "已运行命令",
                    detail = "$ npm test\n\n输出：\nPASS",
                    operationStatus = "completed",
                    approvalType = null,
                    requestId = null,
                    raw = null
                ),
                SurfaceEntry(
                    key = "assistant-1",
                    kind = "message",
                    role = "assistant",
                    phase = "final_answer",
                    text = "done",
                    turnId = "turn-1",
                    itemId = "assistant-1",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            ),
            surfaceStatus = "completed",
            latestTurnId = "turn-1"
        )

        assertEquals(ChatMessage.Role.TOOL, merged[0].role)
        assertTrue(merged[0].collapsible)
        assertEquals("已运行命令", merged[0].collapsedLabel)
        assertTrue(merged[0].content.contains("PASS"))
        assertEquals("command", merged[0].operationType)
        assertEquals("completed", merged[0].operationStatus)
        assertEquals("turn-1", merged[0].operationTurnId)
        assertEquals(1, merged[0].operationBatchSize)
        assertFalse(merged[1].streaming)
    }

    @Test
    fun surfaceOperationUsesItemIdToKeepCachedOperationBeforeFinalAnswer() {
        val turnId = "turn-cache-order"
        val operationKey = "$turnId:operation:command:cmd-1"
        val merged = mergeSurfaceItems(
            existing = listOf(
                ChatMessage(
                    id = "cmd-1",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "缓存中的命令"
                ),
                ChatMessage(
                    id = "assistant-final",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "最终回复"
                )
            ),
            surfaceItems = listOf(
                surfaceCommandOperation(operationKey, turnId, "completed", "实时命令详情"),
                SurfaceEntry(
                    key = "assistant-final",
                    kind = "message",
                    role = "assistant",
                    phase = "final_answer",
                    text = "最终回复",
                    turnId = turnId,
                    itemId = "assistant-final",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                )
            ),
            surfaceStatus = "completed",
            latestTurnId = turnId,
            preserveExisting = true
        )

        assertEquals(listOf("cmd-1", "assistant-final"), merged.map { it.id })
        assertEquals("实时命令详情", merged.first().content)
        assertEquals(1, merged.count { it.id == "cmd-1" })
    }

    @Test
    fun cacheHydrationReconcilesLiveCommandBatchBeforeFinalAnswer() {
        val conversationId = "conv-reconnect-order"
        val turnId = "turn-reconnect-order"
        val surfaceItems = listOf(
            surfaceCommandOperation(
                "$turnId:operation:command:cmd-1",
                turnId,
                "completed",
                "实时命令一"
            ),
            surfaceCommandOperation(
                "$turnId:operation:command:cmd-2",
                turnId,
                "completed",
                "实时命令二"
            ),
            SurfaceEntry(
                key = "assistant-final",
                kind = "message",
                role = "assistant",
                phase = "final_answer",
                text = "最终回复",
                turnId = turnId,
                itemId = "assistant-final",
                statusType = null,
                approvalType = null,
                requestId = null,
                raw = null
            )
        )
        val snapshot = surfaceSnapshot(conversationId).copy(
            status = "completed",
            latestTurnId = turnId,
            items = surfaceItems
        )
        val live = mergeSurfaceItems(
            existing = emptyList(),
            surfaceItems = surfaceItems,
            surfaceStatus = "completed",
            latestTurnId = turnId
        )
        val state = CodexUiState(
            activeConversationId = conversationId,
            liveAuthoritativeConversationId = conversationId,
            ipcSurfaceSnapshot = snapshot,
            messages = live
        )
        val cached = listOf(
            ChatMessage(
                id = "cmd-1",
                role = ChatMessage.Role.ASSISTANT,
                content = "缓存命令一"
            ),
            ChatMessage(
                id = "cmd-2",
                role = ChatMessage.Role.ASSISTANT,
                content = "缓存命令二"
            ),
            ChatMessage(
                id = "assistant-final",
                role = ChatMessage.Role.ASSISTANT,
                content = "最终回复"
            )
        )

        val merged = mergeCachedHistoryIntoLiveMessagesForUi(
            state = state,
            conversationId = conversationId,
            cachedMessages = cached
        )

        assertEquals(2, merged.size)
        assertEquals("command", merged.first().operationType)
        assertEquals(listOf("cmd-1", "cmd-2"), merged.first().operationBatchMemberIds)
        assertEquals("assistant-final", merged[1].id)
        assertTrue(merged.first().content.contains("实时命令一"))
        assertTrue(merged.first().content.contains("实时命令二"))
    }

    @Test
    fun completedCommandsInSameTurnCollapseIntoOneStableBatch() {
        val first = commandOperationMessage("cmd-1", "turn-1", "completed", "$ npm test")
        val second = commandOperationMessage("cmd-2", "turn-1", "failed", "$ npm run lint")

        val collapsed = collapseCompletedCommandBatchesForUi(listOf(first, second))

        assertEquals(1, collapsed.size)
        assertEquals("command-batch:turn-1:cmd-1", collapsed.single().id)
        assertEquals(2, collapsed.single().operationBatchSize)
        assertEquals("completed", collapsed.single().operationStatus)
        assertTrue(collapsed.single().content.contains("$ npm test"))
        assertTrue(collapsed.single().content.contains("$ npm run lint"))

        val expandedBatch = collapseCompletedCommandBatchesForUi(
            listOf(first, second, commandOperationMessage("cmd-3", "turn-1", "completed", "$ git status"))
        )
        assertEquals("command-batch:turn-1:cmd-1", expandedBatch.single().id)
        assertEquals(3, expandedBatch.single().operationBatchSize)
        assertEquals(listOf("cmd-1", "cmd-2", "cmd-3"), expandedBatch.single().operationBatchMemberIds)
    }

    @Test
    fun realDuplicateCommandBatchKeyIsRemovedWhenCachedBatchMeetsLiveConstituents() {
        val turnId = "019fcd7b-153b-7553-97c0-cda30a86875d"
        val firstOperationId =
            "$turnId:operation:command:exec-b5181be2-4547-4db5-a6c2-9e42808a56a3"
        val secondOperationId = "$turnId:operation:command:exec-regression-second"
        val crashedBatchId = "command-batch:$turnId:$firstOperationId"
        val cachedBatch = commandOperationMessage(
            id = crashedBatchId,
            turnId = turnId,
            status = "completed",
            content = "cached command output"
        ).copy(
            operationBatchSize = 2,
            // This is the pre-fix in-memory shape that caused the crash.
            operationBatchMemberIds = emptyList()
        )

        val merged = mergeSurfaceItems(
            existing = listOf(
                cachedBatch,
                ChatMessage(
                    id = "history-boundary",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "历史边界"
                )
            ),
            surfaceItems = listOf(
                surfaceCommandOperation(firstOperationId, turnId, "completed", "live first"),
                surfaceCommandOperation(secondOperationId, turnId, "completed", "live second")
            ),
            surfaceStatus = "completed",
            latestTurnId = turnId,
            preserveExisting = true
        )

        assertEquals(1, merged.count { it.id == crashedBatchId })
        assertEquals(2, merged.size)
        assertEquals(crashedBatchId, merged.first().id)
        assertEquals(2, merged.first().operationBatchSize)
        assertEquals(
            listOf(firstOperationId, secondOperationId),
            merged.first().operationBatchMemberIds
        )
        assertEquals("live first\n\nlive second", merged.first().content)
        assertEquals("history-boundary", merged[1].id)
        assertEquals(merged.map { it.id }.distinct().size, merged.size)
    }

    @Test
    fun partialLiveTailKeepsCachedBatchAndAddsOnlyNewCommand() {
        val turnId = "turn-partial"
        val firstOperationId = "$turnId:operation:command:exec-1"
        val secondOperationId = "$turnId:operation:command:exec-2"
        val thirdOperationId = "$turnId:operation:command:exec-3"
        val cachedBatch = commandOperationMessage(
            id = "command-batch:$turnId:$firstOperationId",
            turnId = turnId,
            status = "completed",
            content = "cached first\n\ncached second"
        ).copy(
            operationBatchSize = 2,
            operationBatchMemberIds = listOf(firstOperationId, secondOperationId)
        )

        val merged = mergeSurfaceItems(
            existing = listOf(cachedBatch),
            surfaceItems = listOf(
                surfaceCommandOperation(firstOperationId, turnId, "completed", "live first"),
                surfaceCommandOperation(thirdOperationId, turnId, "completed", "live third")
            ),
            surfaceStatus = "completed",
            latestTurnId = turnId,
            preserveExisting = true
        )

        assertEquals(1, merged.size)
        assertEquals(3, merged.single().operationBatchSize)
        assertEquals(
            listOf(firstOperationId, secondOperationId, thirdOperationId),
            merged.single().operationBatchMemberIds
        )
        assertTrue(merged.single().content.contains("cached second"))
        assertTrue(merged.single().content.contains("live third"))
    }

    @Test
    fun finalProjectionDedupeKeepsLatestDuplicateBatchAcrossBoundary() {
        val turnId = "turn-final-dedupe"
        val batchId = "command-batch:$turnId:op-1"
        val first = commandOperationMessage(batchId, turnId, "completed", "old batch").copy(
            operationBatchSize = 2,
            operationBatchMemberIds = listOf("op-1", "op-2")
        )
        val second = first.copy(content = "new batch")

        val merged = mergeSurfaceItems(
            existing = listOf(
                first,
                ChatMessage(
                    id = "boundary",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "正文边界"
                ),
                second
            ),
            surfaceItems = emptyList(),
            surfaceStatus = "completed",
            preserveExisting = true
        )

        assertEquals(listOf(batchId, "boundary"), merged.map { it.id })
        assertEquals("new batch", merged.first().content)
    }

    @Test
    fun commandBatchWaitsForAllCommandsToFinish() {
        val messages = listOf(
            commandOperationMessage("cmd-1", "turn-1", "completed", "$ npm test"),
            commandOperationMessage("cmd-2", "turn-1", "running", "$ npm run lint")
        )

        val projected = collapseCompletedCommandBatchesForUi(messages)

        assertEquals(messages, projected)
    }

    @Test
    fun commandBatchDoesNotCrossTurnOrNonCommandBoundary() {
        val first = commandOperationMessage("cmd-1", "turn-1", "completed", "$ npm test")
        val assistant = ChatMessage(
            id = "assistant-1",
            role = ChatMessage.Role.ASSISTANT,
            content = "继续处理"
        )
        val second = commandOperationMessage("cmd-2", "turn-1", "completed", "$ npm run lint")
        val third = commandOperationMessage("cmd-3", "turn-2", "completed", "$ git status")

        val projected = collapseCompletedCommandBatchesForUi(
            listOf(first, assistant, second, third)
        )

        assertEquals(listOf(first, assistant, second, third), projected)
    }

    @Test
    fun ipcOnlineDisablesLegacyExecutionWatchUntilExplicitDisconnect() {
        val online = CodexUiState(
            ipcOnline = true,
            currentTurnId = "turn-live"
        )
        assertFalse(shouldTrackExecutionWatchForUiState(online))
        val offline = online.copy(ipcOnline = false)
        assertFalse(shouldTrackExecutionWatchForUiState(offline, ipcStatusObserved = false))
        assertTrue(shouldTrackExecutionWatchForUiState(offline, ipcStatusObserved = true))
        assertFalse(
            shouldTrackExecutionWatchForUiState(
                offline.copy(currentTurnId = null),
                ipcStatusObserved = true
            )
        )
        assertFalse(
            shouldTrackExecutionWatchForUiState(
                offline.copy(
                    currentTurnId = null,
                    pendingServerRequests = listOf(ipcRequest("pending"))
                ),
                ipcStatusObserved = true
            )
        )
    }

    @Test
    fun matchingIpcSurfaceProtectsRuntimeFromIdleCodexStateWhileOnline() {
        val surface = surfaceSnapshot("conv-live").copy(desynced = true)

        assertTrue(
            matchingIpcSurfaceProtectsRuntimeFromCodexState(
                ipcOnline = true,
                targetThreadId = "conv-live",
                surface = surface
            )
        )
        assertFalse(
            matchingIpcSurfaceProtectsRuntimeFromCodexState(
                ipcOnline = false,
                targetThreadId = "conv-live",
                surface = surface
            )
        )
        assertFalse(
            matchingIpcSurfaceProtectsRuntimeFromCodexState(
                ipcOnline = true,
                targetThreadId = "conv-other",
                surface = surface
            )
        )
    }

    @Test
    fun ipcApprovalDecisionUsesAvailableAcceptanceWhenPlainAcceptIsUnavailable() {
        val request = ipcRequest("req-approval").copy(
            params = JSONObject().put(
                "availableDecisions",
                org.json.JSONArray().put("acceptWithExecpolicyAmendment").put("decline")
            )
        )

        assertEquals("acceptWithExecpolicyAmendment", resolveIpcFollowerApprovalDecision(request, true))
        assertEquals("decline", resolveIpcFollowerApprovalDecision(request, false))
    }

    @Test
    fun ipcApprovalDecisionUsesAvailableRejectionWhenDeclineIsUnavailable() {
        val request = ipcRequest("req-approval").copy(
            params = JSONObject().put(
                "availableDecisions",
                org.json.JSONArray().put("accept").put("reject")
            )
        )

        assertEquals("reject", resolveIpcFollowerApprovalDecision(request, false))
    }

    @Test
    fun directPermissionsApprovalPreservesRequestedPermissionsAndTurnScope() {
        val request = ipcRequest("req-permissions", handledBy = "client").copy(
            method = "item/permissions/requestApproval",
            requestKind = "permissions",
            responseMode = "decision",
            params = JSONObject().put("permissions", JSONObject().put("network", true))
        )

        val accepted = buildDirectApprovalDecisionResult(request, true)
        val rejected = buildDirectApprovalDecisionResult(request, false)

        assertEquals(true, accepted?.getJSONObject("permissions")?.getBoolean("network"))
        assertEquals("turn", accepted?.getString("scope"))
        assertEquals(0, rejected?.getJSONObject("permissions")?.length())
        assertEquals("turn", rejected?.getString("scope"))
    }

    @Test
    fun pendingApprovalMergeReplacesStaleIpcApprovalRequests() {
        val existing = listOf(
            ipcRequest("stale-approval").copy(
                requestKind = "command",
                responseMode = "decision"
            ),
            ipcRequest("live-input").copy(
                requestKind = "userInput",
                responseMode = "answers"
            ),
            ipcRequest("local-request", handledBy = "client")
        )

        val merged = mergePendingApproval(
            existing = existing,
            pending = PendingApprovalInfo(
                kind = "command",
                requestId = "live-approval",
                requestKind = "command",
                responseMode = "decision",
                method = "item/commandExecution/requestApproval",
                title = "等待命令审批",
                description = "需要确认",
                command = "echo ok",
                availableDecisions = listOf("accept", "decline"),
                raw = null
            )
        )

        assertEquals(listOf("live-input", "local-request", "live-approval"), merged.map { it.requestId })
    }

    @Test
    fun missingPendingApprovalClearsStaleIpcApprovalRequestsOnly() {
        val merged = mergePendingApproval(
            existing = listOf(
                ipcRequest("stale-approval").copy(
                    requestKind = "command",
                    responseMode = "decision"
                ),
                ipcRequest("live-input").copy(
                    requestKind = "userInput",
                    responseMode = "answers"
                ),
                ipcRequest("local-request", handledBy = "client")
            ),
            pending = null
        )

        assertEquals(listOf("live-input", "local-request"), merged.map { it.requestId })
    }

    @Test
    fun applyingDesktopSurfaceSnapshotMergesMessagesRequestsPlanAndGoal() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            messages = listOf(ChatMessage(id = "existing", role = ChatMessage.Role.ASSISTANT, content = "old")),
            pendingServerRequests = listOf(ipcRequest("req-local", handledBy = "client")),
            currentThreadTitle = "old-title",
            cwd = "E:\\old"
        )
        val snapshot = DesktopSurfaceSnapshot(
            conversationId = "conv-live",
            ownerKind = "desktop",
            revision = 2,
            status = "waiting_for_input",
            updatedAt = 10,
            title = "Live title",
            cwd = "E:\\coding\\TermLink",
            latestTurnId = "turn-1",
            currentCodexConfig = effectiveConfig(
                model = "gpt-owner",
                reasoning = "high",
                sandbox = "workspace-write",
                approval = "on-request"
            ),
            items = listOf(
                SurfaceEntry(
                    key = "msg-user",
                    kind = "message",
                    role = "user",
                    phase = null,
                    text = "hello",
                    turnId = "turn-1",
                    itemId = "item-1",
                    statusType = null,
                    approvalType = null,
                    requestId = null,
                    raw = null
                ),
                SurfaceEntry(
                    key = "approval-msg",
                    kind = "approval_request",
                    role = null,
                    phase = null,
                    text = "approve command",
                    turnId = "turn-1",
                    itemId = "item-2",
                    statusType = null,
                    approvalType = "command",
                    requestId = "req-approval",
                    raw = null
                )
            ),
            pendingApproval = PendingApprovalInfo(
                kind = "command",
                requestId = "req-approval",
                requestKind = "command",
                responseMode = "decision",
                method = "item/commandExecution/requestApproval",
                title = "审批命令",
                description = "Run command",
                command = "echo hello",
                availableDecisions = listOf("accept", "reject"),
                raw = null
            ),
            pendingPlanAction = PendingPlanActionInfo(
                kind = "plan_implementation",
                requestId = "req-plan",
                requestMethod = "item/plan/requestImplementation",
                questionId = "confirm",
                acceptedAnswer = "是，实施此计划",
                turnId = "turn-1",
                planContent = "Step 1\nStep 2",
                canSubmit = true,
                unavailableReason = null,
                raw = null
            ),
            pendingUserInputAction = ipcRequest("req-input"),
            pendingGoalAction = null,
            activeGoal = ActiveGoalInfo(
                threadId = "conv-live",
                objective = "完成同步",
                status = "active",
                tokenBudget = 1000,
                tokensUsed = 20,
                timeUsedSeconds = 5,
                raw = null
            ),
            raw = JSONObject()
        )

        val next = applyDesktopSurfaceSnapshotToUiState(state, snapshot)

        assertEquals("conv-live", next.activeConversationId)
        assertEquals("conv-live", next.threadId)
        assertEquals(snapshot, next.ipcSurfaceSnapshot)
        assertEquals("waiting_for_input", next.status)
        assertEquals("turn-1", next.currentTurnId)
        assertEquals(listOf("msg-user", "approval-msg"), next.messages.map { it.id })
        assertEquals(ChatMessage.Role.USER, next.messages[0].role)
        assertEquals(ChatMessage.Role.SYSTEM, next.messages[1].role)
        assertEquals(listOf("req-local", "req-approval", "req-input"), next.pendingServerRequests.map { it.requestId })
        assertEquals("ipc_follower", next.pendingServerRequests.first { it.requestId == "req-approval" }.handledBy)
        assertEquals("ipc_follower", next.pendingServerRequests.first { it.requestId == "req-input" }.handledBy)
        assertEquals("req-plan", next.planWorkflow.planRequestId)
        assertEquals("confirm", next.planWorkflow.planQuestionId)
        assertEquals(true, next.planWorkflow.canSubmitPlan)
        assertEquals("Step 1\nStep 2", next.planWorkflow.confirmedPlanText)
        assertEquals("完成同步", next.activeGoal?.objective)
        assertEquals("Live title", next.currentThreadTitle)
        assertEquals("E:\\coding\\TermLink", next.cwd)
        assertEquals("high", next.ownerCurrentCodexConfig?.reasoningEffort)
        assertEquals("gpt-owner", next.nextTurnEffectiveCodexConfig?.model)
    }

    @Test
    fun desyncedSurfaceOnlyMarksRecoveryStateWithoutReplacingLiveProjection() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            threadId = "conv-live",
            currentTurnId = "turn-live",
            status = "running",
            messages = listOf(
                ChatMessage(id = "live", role = ChatMessage.Role.ASSISTANT, content = "live content", streaming = true)
            )
        )
        val desynced = surfaceSnapshot("conv-live").copy(
            desynced = true,
            status = "idle"
        )

        val next = applyDesktopSurfaceSnapshotToUiState(state, desynced)

        assertTrue(next.ipcSurfaceSnapshot?.desynced == true)
        assertEquals("running", next.status)
        assertEquals("turn-live", next.currentTurnId)
        assertEquals("live content", next.messages.single().content)
    }

    @Test
    fun ownerSnapshotConfirmsPendingOverridesOnlyWhenPermissionPairMatches() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            serverNextTurnConfigBase = effectiveConfig(model = "gpt-session", reasoning = "medium"),
            nextTurnOverrides = NextTurnOverrides(reasoningEffort = "high", sandbox = "workspace-write")
        )
        val matching = surfaceSnapshot("conv-live").copy(
            currentCodexConfig = effectiveConfig(
                reasoning = "high",
                sandbox = "workspace-write",
                approval = "on-request"
            )
        )

        val confirmed = applyDesktopSurfaceSnapshotToUiState(state, matching)

        assertEquals(NextTurnOverrides(), confirmed.nextTurnOverrides)
        assertEquals("high", confirmed.nextTurnEffectiveCodexConfig?.reasoningEffort)
        assertEquals("workspace-write", confirmed.nextTurnEffectiveCodexConfig?.sandboxMode)
        assertEquals("on-request", confirmed.nextTurnEffectiveCodexConfig?.approvalPolicy)
        assertEquals("gpt-session", confirmed.nextTurnEffectiveCodexConfig?.model)

        val mismatchedApproval = applyDesktopSurfaceSnapshotToUiState(
            state,
            matching.copy(
                currentCodexConfig = matching.currentCodexConfig?.copy(approvalPolicy = "never")
            )
        )
        assertEquals("workspace-write", mismatchedApproval.nextTurnOverrides.sandbox)
        assertEquals("high", mismatchedApproval.nextTurnEffectiveCodexConfig?.reasoningEffort)
        assertEquals("on-request", mismatchedApproval.nextTurnEffectiveCodexConfig?.approvalPolicy)
    }

    @Test
    fun missingOwnerConfigDoesNotClearPendingOverrides() {
        val overrides = NextTurnOverrides(
            model = "gpt-pending",
            reasoningEffort = "high",
            sandbox = "danger-full-access"
        )

        assertEquals(overrides, reconcileOwnerConfirmedOverrides(overrides, ownerConfig = null))
    }

    @Test
    fun ownerSnapshotConfirmsPermissionProfileAndReviewerAtomically() {
        val overrides = NextTurnOverrides(
            approvalPolicy = "on-request",
            approvalsReviewer = "auto_review",
            permissionProfile = ":workspace"
        )
        val matchingOwner = effectiveConfig(
            approval = "on-request",
            reviewer = "auto_review",
            permissionProfile = ":workspace"
        )

        assertEquals(
            NextTurnOverrides(),
            reconcileOwnerConfirmedOverrides(overrides, matchingOwner)
        )

        val mismatchedReviewer = matchingOwner.copy(approvalsReviewer = "user")
        assertEquals(
            overrides,
            reconcileOwnerConfirmedOverrides(overrides, mismatchedReviewer)
        )
    }

    @Test
    fun surfaceSnapshotFromAnotherConversationCannotReplaceActiveConfig() {
        val ownerConfig = effectiveConfig(reasoning = "low", sandbox = "read-only", approval = "on-request")
        val state = CodexUiState(
            activeConversationId = "conv-a",
            ownerCurrentCodexConfig = ownerConfig,
            nextTurnEffectiveCodexConfig = ownerConfig
        )

        val next = applyDesktopSurfaceSnapshotToUiState(
            state,
            surfaceSnapshot("conv-b").copy(
                currentCodexConfig = effectiveConfig(
                    reasoning = "high",
                    sandbox = "danger-full-access",
                    approval = "never"
                )
            )
        )

        assertEquals(state, next)
    }

    @Test
    fun mergePlanWorkflowClearsStaleIpcPlanWhenPendingActionDisappears() {
        val current = CodexPlanWorkflowState(
            phase = "plan_ready_for_confirmation",
            latestPlanText = "old plan",
            confirmedPlanText = "old plan",
            planContent = "old plan",
            canSubmitPlan = true,
            planRequestId = "req-plan",
            planRequestMethod = "item/plan/requestImplementation",
            planQuestionId = "confirm"
        )

        val next = mergePlanWorkflow(current, null)

        assertEquals(CodexPlanWorkflowState(), next)
    }

    @Test
    fun mergePlanWorkflowPreservesAwaitingOwnerPhaseForSamePendingRequest() {
        val current = CodexPlanWorkflowState(
            phase = "executing_confirmed_plan",
            planContent = "Step 1",
            latestPlanText = "Step 1",
            confirmedPlanText = "Step 1",
            canSubmitPlan = true,
            planRequestId = "req-plan",
            planRequestMethod = "item/plan/requestImplementation"
        )
        val action = PendingPlanActionInfo(
            kind = "plan_implementation",
            requestId = "req-plan",
            requestMethod = "item/plan/requestImplementation",
            questionId = null,
            acceptedAnswer = null,
            turnId = "turn-1",
            planContent = "Step 1",
            canSubmit = true,
            unavailableReason = null,
            raw = null
        )

        val next = mergePlanWorkflow(current, action)

        assertEquals("executing_confirmed_plan", next.phase)
        assertEquals("req-plan", next.planRequestId)
    }

    @Test
    fun mergePlanWorkflowKeepsLocalPlanWhenNoIpcPlanStateExists() {
        val current = CodexPlanWorkflowState(
            phase = "planning",
            originalPrompt = "draft a plan",
            latestPlanText = "local plan"
        )

        val next = mergePlanWorkflow(current, null)

        assertEquals(current, next)
    }

    @Test
    fun ipcSurfaceClearingUserInputRemovesStaleFollowerRequestButPreservesCanonicalRequests() {
        val canonical = ipcRequest("req-canonical", handledBy = "client")
        val current = listOf(ipcRequest("req-old"), canonical)

        val next = mergePendingUserInput(current, null)

        assertEquals(listOf("req-canonical"), next.map { it.requestId })
        assertEquals("client", next.single().handledBy)
    }

    @Test
    fun ipcSurfaceUserInputReplacesPreviousFollowerRequest() {
        val next = mergePendingUserInput(
            listOf(ipcRequest("req-old")),
            ipcRequest("req-new")
        )

        assertEquals(listOf("req-new"), next.map { it.requestId })
        assertEquals("ipc_follower", next.single().handledBy)
    }

    @Test
    fun completedIpcUserInputSnapshotRemovesDialogRequestFromUiState() {
        val state = CodexUiState(
            activeConversationId = "conv-live",
            threadId = "conv-live",
            pendingServerRequests = listOf(ipcRequest("req-input")),
            submittingServerRequestIds = setOf("req-input")
        )

        val next = applyDesktopSurfaceSnapshotToUiState(
            state,
            surfaceSnapshot("conv-live")
        )

        assertTrue(next.pendingServerRequests.isEmpty())
        assertEquals(setOf("req-input"), next.submittingServerRequestIds)
    }

    private fun ipcConversation(
        conversationId: String,
        updatedAt: Long,
        cwd: String? = null,
        hasActiveGoal: Boolean = false
    ): CodexIpcConversationSummary = CodexIpcConversationSummary(
        conversationId = conversationId,
        status = "running",
        updatedAt = updatedAt,
        title = conversationId,
        cwd = cwd,
        ownerKind = "desktop",
        latestTurnId = null,
        itemCount = 0,
        hasActiveGoal = hasActiveGoal,
        hasPendingApproval = false,
        hasPendingPlanAction = false,
        hasPendingUserInputAction = false
    )

    private fun surfaceSnapshot(conversationId: String): DesktopSurfaceSnapshot = DesktopSurfaceSnapshot(
        conversationId = conversationId,
        ownerKind = "desktop",
        revision = 1,
        status = "running",
        updatedAt = 1,
        title = conversationId,
        cwd = "E:\\coding\\TermLink",
        latestTurnId = null,
        items = emptyList(),
        pendingApproval = null,
        pendingPlanAction = null,
        pendingUserInputAction = null,
        pendingGoalAction = null,
        activeGoal = null,
        raw = JSONObject()
    )

    private fun effectiveConfig(
        model: String? = null,
        reasoning: String? = null,
        sandbox: String? = null,
        approval: String? = null,
        reviewer: String? = null,
        permissionProfile: String? = null
    ): CodexEffectiveConfig = CodexEffectiveConfig(
        model = model,
        reasoningEffort = reasoning,
        personality = null,
        approvalPolicy = approval,
        sandboxMode = sandbox,
        approvalsReviewer = reviewer,
        permissionProfile = permissionProfile
    )

    private fun ipcRequest(
        requestId: String,
        handledBy: String = "ipc_follower"
    ): CodexServerRequest = CodexServerRequest(
        requestId = requestId,
        method = "item/tool/requestUserInput",
        requestKind = "userInput",
        responseMode = "answers",
        handledBy = handledBy,
        summary = null,
        questionCount = 0,
        command = null,
        questions = emptyList(),
        params = null,
        defaultResult = null
    )

    private fun commandOperationMessage(
        id: String,
        turnId: String,
        status: String,
        content: String
    ): ChatMessage = ChatMessage(
        id = id,
        role = ChatMessage.Role.TOOL,
        content = content,
        collapsible = true,
        collapsedLabel = "已运行命令",
        operationType = "command",
        operationStatus = status,
        operationTurnId = turnId,
        operationBatchSize = 1,
        operationBatchMemberIds = listOf(id)
    )

    private fun surfaceCommandOperation(
        id: String,
        turnId: String,
        status: String,
        detail: String
    ): SurfaceEntry = SurfaceEntry(
        key = id,
        kind = "status",
        role = null,
        phase = null,
        text = detail,
        turnId = turnId,
        itemId = id.substringAfterLast(":"),
        statusType = "operation",
        operationType = "command",
        label = "已运行命令",
        detail = detail,
        operationStatus = status,
        approvalType = null,
        requestId = null,
        raw = null
    )
}
