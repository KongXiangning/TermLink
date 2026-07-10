package com.termlink.app.codex

import com.termlink.app.codex.data.CodexIpcStatus
import com.termlink.app.codex.data.CodexFollowerMode
import com.termlink.app.codex.data.CodexIpcConversationSummary
import com.termlink.app.codex.data.CodexServerRequest
import com.termlink.app.codex.data.ActiveGoalInfo
import com.termlink.app.codex.data.DesktopSurfaceSnapshot
import com.termlink.app.codex.data.PendingApprovalInfo
import com.termlink.app.codex.data.PendingPlanActionInfo
import com.termlink.app.codex.data.SurfaceEntry
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexPlanWorkflowState
import com.termlink.app.codex.domain.CodexRuntimePanelState
import com.termlink.app.codex.domain.CodexUiState
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CodexViewModelThreadReadyTest {

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
    fun plainTextFallbackBlockDoesNotApplyToAttachmentsOrPlanMode() {
        val state = CodexUiState(
            ipcOnline = true,
            activeConversationId = "conv-live"
        )

        assertEquals(
            false,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = true,
                hasAttachments = false,
                hasFileMentions = false
            )
        )
        assertEquals(
            false,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = true,
                hasFileMentions = false
            )
        )
        assertEquals(
            false,
            shouldBlockPlainTextFallbackForIpcConversationState(
                state = state,
                isPlanMode = false,
                hasAttachments = false,
                hasFileMentions = true
            )
        )
    }

    @Test
    fun ipcOfflineStatusClearsActiveSendButKeepsConversation() {
        val state = CodexUiState(
            ipcOnline = true,
            ipcClientId = "client-old",
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
        assertEquals(false, next.followerActiveSendAllowed)
        assertEquals(true, next.followerModeEnabled)
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
        assertEquals(listOf("req-local"), next.pendingServerRequests.map { it.requestId })
        assertTrue(next.submittingServerRequestIds.isEmpty())
        assertNull(next.planWorkflow.planRequestId)
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
            )
        )

        assertEquals(1, merged.size)
        assertEquals(
            "我会在 D:\\ 根目录创建 s.xx。这个位置不在当前仓库可写范围内，需要走一次权限确认。",
            merged.single().content
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
        assertEquals(listOf("existing", "msg-user", "approval-msg"), next.messages.map { it.id })
        assertEquals(ChatMessage.Role.USER, next.messages[1].role)
        assertEquals(ChatMessage.Role.SYSTEM, next.messages[2].role)
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
    fun mergePlanWorkflowKeepsLocalPlanWhenNoIpcPlanStateExists() {
        val current = CodexPlanWorkflowState(
            phase = "planning",
            originalPrompt = "draft a plan",
            latestPlanText = "local plan"
        )

        val next = mergePlanWorkflow(current, null)

        assertEquals(current, next)
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
}
