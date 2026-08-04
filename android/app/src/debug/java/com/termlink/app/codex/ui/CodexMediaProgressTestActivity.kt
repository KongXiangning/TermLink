package com.termlink.app.codex.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.termlink.app.codex.domain.ChatMessage
import com.termlink.app.codex.domain.CodexMessageAttachment
import com.termlink.app.codex.domain.CodexUiState
import com.termlink.app.codex.domain.DebugServerRequestPreset

/**
 * Debug-only host for the production CodexScreen media chip.
 * It deliberately uses a local fixture and never opens a service or cache.
 */
class CodexMediaProgressTestActivity : ComponentActivity() {
    private val attachment = CodexMessageAttachment(
        kind = "image",
        label = "proof.png",
        source = "history-media",
        contentHash = "a".repeat(64),
        thumbnailHash = "b".repeat(64),
        mimeType = "image/png",
        byteSize = 100L
    )

    private var uiState by mutableStateOf(
        CodexUiState(
            sessionName = "Media progress proof",
            threadId = "media-progress-thread",
            currentThreadTitle = "Media progress proof",
            messages = listOf(
                ChatMessage(
                    id = "media-progress-message",
                    role = ChatMessage.Role.ASSISTANT,
                    content = "点击附件查看原图",
                    attachments = listOf(attachment)
                )
            )
        )
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CodexTheme {
                CodexScreen(
                    state = uiState,
                    onSendMessage = {},
                    onInterrupt = {},
                    onContinueGoal = {},
                    onOpenSessions = {},
                    onOpenDocs = {},
                    onOpenFileMention = {},
                    onOpenAttachment = { clicked ->
                        if (clicked.contentHash.equals(attachment.contentHash, ignoreCase = true)) {
                            uiState = uiState.copy(
                                mediaDownloadHash = attachment.contentHash,
                                mediaDownloadBytes = 50L,
                                mediaDownloadTotalBytes = 100L
                            )
                        }
                    },
                    onNewThread = {},
                    onResolveThreadRecovery = {},
                    onConsumeComposerRecoveryText = {},
                    onRetry = {},
                    onDismissError = {},
                    onShowSlashMenu = {},
                    onHideSlashMenu = {},
                    onSlashMenuQueryChanged = {},
                    onComposerTextChanged = {},
                    onHideFileMentionMenu = {},
                    onSelectFileMention = {},
                    onRemoveFileMention = {},
                    onApproveRequest = { _, _ -> },
                    onSubmitUserInputAnswers = { _, _ -> },
                    onRejectUserInputRequest = {},
                    onShowModelPicker = {},
                    onHideModelPicker = {},
                    onSelectModel = {},
                    onShowReasoningPicker = {},
                    onHideReasoningPicker = {},
                    onSelectReasoningEffort = {},
                    onShowSandboxPicker = {},
                    onHideSandboxPicker = {},
                    onSelectSandboxMode = {},
                    onTogglePlanMode = {},
                    onToggleGoalMode = {},
                    onToggleFastMode = {},
                    onExecuteConfirmedPlan = {},
                    onContinuePlanWorkflow = {},
                    onCancelPlanWorkflow = {},
                    onShowToolsPanel = {},
                    onHideToolsPanel = {},
                    onSelectSkill = {},
                    onClearActiveSkill = {},
                    onRequestCompactCurrentThread = {},
                    onShowUsagePanel = {},
                    onHideUsagePanel = {},
                    onShowRuntimePanel = {},
                    onHideRuntimePanel = {},
                    onShowNoticesPanel = {},
                    onHideNoticesPanel = {},
                    onShowThreadHistory = {},
                    onHideThreadHistory = {},
                    onRefreshThreadHistory = {},
                    onResumeThread = {},
                    onForkThread = {},
                    onToggleThreadArchive = { _, _ -> },
                    onStartThreadRename = { _, _ -> },
                    onUpdateThreadRenameDraft = {},
                    onCancelThreadRename = {},
                    onSubmitThreadRename = {},
                    onPickLocalFile = {},
                    onRemovePendingImageAttachment = {},
                    onInjectDebugServerRequest = { _: DebugServerRequestPreset -> },
                    modifier = Modifier
                )
            }
        }
    }
}
