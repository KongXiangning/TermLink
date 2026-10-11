# 本轮关键代码片段（真实字节摘录）

### src/services/sessionManager.js:1–81

sha256: dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94

```text
const { v4: uuidv4 } = require('uuid');
const SessionStore = require('../repositories/sessionStore');
const PtyService = require('./ptyService');
const { diagnosticLog } = require('./diagnosticLog');

const DEFAULT_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 1000;
const DEFAULT_MAX_SESSION_COUNT = 50;
const MIN_IDLE_TIMEOUT_MS = 60 * 1000;
const MIN_CLEANUP_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 500;
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';
const {
    normalizeSessionMode,
    normalizeSessionCwd,
    normalizeWorkspaceRoot,
    normalizeWorkspaceRootSource,
    normalizeLastCodexThreadId,
    normalizeCodexConfig
} = SessionStore;
const LEGACY_SESSION_GRACE_MS = SessionStore.LEGACY_SESSION_GRACE_MS;

function parsePositiveIntEnv(name, defaultValue, minValue) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return defaultValue;
    }

    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed < minValue) {
        console.warn(`[SessionManager] Invalid ${name}=${raw}, fallback to ${defaultValue}.`);
        return defaultValue;
    }

    return parsed;
}

function summarizeSessionConnections(session) {
    const connections = Array.isArray(session && session.connections)
        ? session.connections.filter((ws) => ws && ws.readyState === 1)
        : [];
    const activeConnectionCount = connections.length;

    if (activeConnectionCount === 0) {
        return {
            activeConnectionCount: 0,
            allTls: false,
            allMtlsAuthorized: false
        };
    }

    return {
        activeConnectionCount,
        allTls: connections.every((ws) => !!(ws.connectionSecurity && ws.connectionSecurity.tls === true)),
        allMtlsAuthorized: connections.every((ws) => !!(
            ws.connectionSecurity &&
            ws.connectionSecurity.tls === true &&
            ws.connectionSecurity.clientCertAuthorized === true
        ))
    };
}

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.persistTimer = null;
        this.idleTimeoutMs = parsePositiveIntEnv(
            'SESSION_IDLE_TTL_MS',
            DEFAULT_IDLE_TIMEOUT_MS,
            MIN_IDLE_TIMEOUT_MS
        );
        this.cleanupIntervalMs = parsePositiveIntEnv(
            'SESSION_CLEANUP_INTERVAL_MS',
            DEFAULT_CLEANUP_INTERVAL_MS,
            MIN_CLEANUP_INTERVAL_MS
        );
        this.maxSessionCount = parsePositiveIntEnv(
            'SESSION_MAX_COUNT',
            DEFAULT_MAX_SESSION_COUNT,
            1
        );
```

### android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt:134–155

sha256: c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1

```text

        internal fun buildCacheKey(profile: ServerProfile): String {
            val normalizedBaseUrl = profile.baseUrl.trim().trimEnd('/')
            val identityFingerprint = profile.basicUsername.trim()
                .takeIf { it.isNotBlank() }
                ?.lowercase()
                ?: profile.authType.name
            return "$normalizedBaseUrl|$identityFingerprint"
        }

        private fun buildProfileCacheIdentity(profileId: String, cacheKey: String): String {
            return "${profileId.trim()}|${cacheKey.trim()}"
        }
    }
}

```

### android/app/src/main/java/com/termlink/app/MainShellActivity.kt:651–705

sha256: 9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7

```text

    override fun getServerConfigState(): ServerConfigState {
        val state = serverConfigStore.loadState()
        syncProfileState(state, inject = false)
        return state
    }

    override fun onUpsertProfile(profile: ServerProfile): ServerConfigState {
        val state = serverConfigStore.upsertProfile(profile)
        if (profile.terminalType == TerminalType.TERMLINK_WS) {
            backgroundExecutor.execute { sessionApiClient.ensureClientRegistration(profile) }
        }
        syncProfileState(state, inject = false)
        invalidateWebViewClientCertPreferencesAfterCommittedChange()
        return state
    }

    override fun onDeleteProfile(profileId: String): ServerConfigState {
        val deletedProfile = serverConfigStore.loadState().profiles.firstOrNull { it.id == profileId }
        if (deletedProfile != null) {
            backgroundExecutor.execute {
                sessionApiClient.removeRegistration(deletedProfile)
                basicCredentialStore.removePassword(profileId)
            }
        } else {
            basicCredentialStore.removePassword(profileId)
        }
        if (deletedProfile != null) sessionListCacheStore.removeProfileContext(deletedProfile)
        externalSessionStore.deleteByProfile(profileId)
        val state = serverConfigStore.deleteProfile(profileId)
        ProfileRestoreStateCleaner.clearDeletedProfileState(applicationContext, profileId, state)
        if (currentTerminalProfileId == profileId) {
            persistLastSessionId("")
            persistLastSessionMode(SessionMode.TERMINAL)
            persistLastSessionCwd(null)
        }
        syncProfileState(state, inject = false)
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
```

### android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt:432–443

sha256: 2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00

```text
            CodexTheme {
                Scaffold(
                    contentWindowInsets = WindowInsets(0, 0, 0, 0)
                ) { innerPadding ->
                    val uiState by viewModel.uiState.collectAsState()
                    val filePickerLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.OpenDocument()
                    ) { uri ->
                        uri?.let(::handlePickedDocument)
                    }
                    CodexScreen(
                        state = uiState,
```

### android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt:502–508

sha256: 2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00

```text
                        onCancelThreadRename = viewModel::cancelThreadRename,
                        onSubmitThreadRename = viewModel::submitThreadRename,
                        onPickLocalFile = {
                            filePickerLauncher.launch(arrayOf("*/*"))
                        },
                        onRemovePendingImageAttachment = viewModel::removePendingImageAttachment,
                        onInjectDebugServerRequest = viewModel::injectDebugServerRequest,
```

### android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt:1001–1068

sha256: 2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00

```text
    private fun handlePickedDocument(uri: Uri) {
        lifecycleScope.launch {
            val selection = withContext(Dispatchers.IO) { readSelectedDocument(uri) }
            when (selection) {
                is SelectedDocument.Image -> {
                    viewModel.addLocalImageAttachment(
                        label = selection.label,
                        dataUrl = selection.dataUrl,
                        mimeType = selection.mimeType,
                        sizeBytes = selection.sizeBytes
                    )
                }
                is SelectedDocument.FileReference -> {
                    viewModel.selectFileMention(
                        FileMention(
                            label = selection.label,
                            path = selection.uri
                        )
                    )
                }
                null -> {
                    viewModel.setError("Failed to load selected file.")
                }
            }
        }
    }

    private sealed interface SelectedDocument {
        data class Image(
            val label: String,
            val dataUrl: String,
            val mimeType: String?,
            val sizeBytes: Long
        ) : SelectedDocument

        data class FileReference(
            val label: String,
            val uri: String
        ) : SelectedDocument
    }

    private data class AttentionNotificationSpec(
        val notificationId: Int,
        val dedupeKey: String,
        val title: String,
        val contentText: String
    )

    private fun readSelectedDocument(uri: Uri): SelectedDocument? {
        val resolver = applicationContext.contentResolver
        val label = queryDisplayName(uri) ?: uri.lastPathSegment?.substringAfterLast('/') ?: "Image"
        val mimeType = resolver.getType(uri)?.trim()?.takeIf { it.isNotBlank() }
        if (mimeType != null && mimeType.startsWith("image/", ignoreCase = true)) {
            val bytes = resolver.openInputStream(uri)?.use { input -> input.readBytes() } ?: return null
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            return SelectedDocument.Image(
                label = label,
                dataUrl = "data:$mimeType;base64,$base64",
                mimeType = mimeType,
                sizeBytes = bytes.size.toLong()
            )
        }
        return SelectedDocument.FileReference(
            label = label,
            uri = uri.toString()
        )
    }

```

### android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt:4640–4670

sha256: d492655da7973dbaedf10e3d507c0dd5cddada9679485f9ee6c1b6c6bc733d49

```text
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Box {
                ComposerAddButton(
                    expanded = addMenuExpanded,
                    onClick = {
                        configSheetExpanded = false
                        onPrepareAddMenu()
                        addMenuExpanded = true
                    }
                )
                ComposerAddMenu(
                    expanded = addMenuExpanded,
                    attachmentEnabled = imageInputEnabled,
                    planActive = state.planMode == true,
                    goalActive = state.goalMode,
                    fastModeActive = fastModeActive,
                    fastModeEnabled = !configHydrating,
                    contextUsedPercent = contextUsedPercent,
                    onDismiss = { addMenuExpanded = false },
                    onPickAttachment = {
                        addMenuExpanded = false
                        onPickLocalFile()
                    },
                    onToggleGoalMode = {
                        addMenuExpanded = false
                        onToggleGoalMode()
```

### android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt:4810–4850

sha256: d492655da7973dbaedf10e3d507c0dd5cddada9679485f9ee6c1b6c6bc733d49

```text
private fun ComposerAddMenu(
    expanded: Boolean,
    attachmentEnabled: Boolean,
    planActive: Boolean,
    goalActive: Boolean,
    fastModeActive: Boolean,
    fastModeEnabled: Boolean,
    contextUsedPercent: Int?,
    onDismiss: () -> Unit,
    onPickAttachment: () -> Unit,
    onToggleGoalMode: () -> Unit,
    onTogglePlanMode: () -> Unit,
    onToggleFastMode: () -> Unit,
    onShowContext: () -> Unit
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        modifier = Modifier
            .width(286.dp)
            .background(SurfaceRaised)
    ) {
        Text(
            text = stringResource(R.string.codex_native_add_menu_title),
            color = TextMuted,
            fontSize = 12.sp,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp)
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_files),
            description = stringResource(R.string.codex_native_add_menu_files_hint),
            iconRes = R.drawable.ic_attachment_24,
            enabled = attachmentEnabled,
            onClick = onPickAttachment
        )
        ComposerAddMenuItem(
            title = stringResource(R.string.codex_native_add_menu_goal),
            description = stringResource(R.string.codex_native_add_menu_goal_hint),
            iconRes = R.drawable.ic_goal_24,
            active = goalActive,
            onClick = onToggleGoalMode
```

### native/codex-rollout-collector/src/protocol/target_source.rs:535–575

sha256: c398fdb5da553e053db7d3ff55f588903ad9222ca2cbcf8804335523bdabc1f7

```text
    if !lineage_recovery {
        for child in session.chain.iter().skip(1) {
            check_control(cancelled, deadline)?;
            let history_base = child.header.history_base.as_ref().ok_or_else(|| {
                TargetSourceReadError::Discovery(LineageError::InvalidHistoryBase {
                    rollout_id: child.source.rollout_id.clone(),
                    message: "lineage child has no history_base".to_string(),
                })
            })?;
            let parent_candidate = session
                .candidates
                .iter()
                .find(|candidate| candidate.source.rollout_id == history_base.parent_rollout_id)
                .ok_or_else(|| {
                    TargetSourceReadError::Discovery(LineageError::ParentRolloutMissing {
                        rollout_id: history_base.parent_rollout_id.clone(),
                    })
                })?;
            let inherited_cut = (parent_candidate.header.conversation_id
                != child.header.conversation_id)
                .then_some(history_base.clone());
            let (parent, plans) = if inherited_cut.is_some() {
                let parent = session
                    .catalog
                    .resolve(&history_base.parent_rollout_id)
                    .map_err(TargetSourceReadError::Discovery)?;
                let plans = plan_inherited_prefix(
                    parent_candidate,
                    history_base,
                    request,
                    limits,
                    cancelled,
                    deadline,
                )?;
                (parent, plans)
            } else if full_lineage_read {
                let parent = session
                    .catalog
                    .resolve(&history_base.parent_rollout_id)
                    .map_err(TargetSourceReadError::Discovery)?;
                let parent_spec = bind_spec(
```

### native/codex-rollout-collector/src/protocol/target_mapping.rs:886–915

sha256: ac7ab8ff4c0c0d3cfa97fb029d9379612e888b30aeb0b573568a9adec91fc9e4

```text
        let parent = batch_for_lineage_source(batch, source, &transition.parent_rollout_id, None);
        let child = batch_for_lineage_source(
            batch,
            source,
            &transition.child_rollout_id,
            Some(&transition.history_base),
        );
        let parent_source = source
            .discovered_sources
            .iter()
            .find(|candidate| candidate.rollout_id == transition.parent_rollout_id);
        let child_source = source
            .discovered_sources
            .iter()
            .find(|candidate| candidate.rollout_id == transition.child_rollout_id);
        if let (Some(parent_source), Some(child_source)) = (parent_source, child_source)
            && parent_source.conversation_id != child_source.conversation_id
        {
            // Source reading verified the exact inherited prefix and header
            // relationship. An independent chat inherits; it replaces no turn.
            validation.validated[index] = parent.complete && child.complete;
            if !validation.validated[index] && validation.error.is_none() {
                validation.error =
                    Some("branch inheritance contains incomplete evidence".to_string());
            }
            continue;
        }
        match validate_last_turn_replacement(
            &request.conversation_id,
            &transition.parent_rollout_id,
```

### src/services/codexRolloutCollector/analyzerProcessManager.js:796–817

sha256: 49a11e48535002e97ca2c1e8bc5f095e1d36bb24c7612b498492fbb3b971e091

```text
    _consumeStdout(chunk, processScope = {}) {
        if (processScope.generation !== undefined
            && !this._isCurrentProcess(processScope.generation, processScope.child)) {
            return;
        }
        // Pipe chunks may end within a UTF-8 character. Keep decoder state in
        // this process generation so batch and checkpoint text remain identical.
        this.stdoutBuffer += Buffer.isBuffer(chunk)
            ? this.stdoutDecoder.write(chunk)
            : String(chunk);
        let newlineIndex = this.stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
            const line = this.stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
            this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
            newlineIndex = this.stdoutBuffer.indexOf('\n');
            if (!line.trim()) continue;
            try {
                const message = parseLine(line);
                if (message) this._handleMessage(message, processScope);
            } catch (error) {
                const protocolError = error instanceof AnalyzerProtocolError
                    ? error
```

### android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:2598–2643

sha256: aac5ced2b1b6c689c1fbfa57b80a19679d6f9d8fa6bb7b7bf5793c6962c00f78

```text
internal fun historyDetailItemsForUiMessage(message: ChatMessage, cached: List<ChatMessage>): List<ChatMessage> {
    val aliases = historyItemAliasesForUiMessage(message)
    val operationTurnId = message.operationTurnId?.trim()?.takeIf(String::isNotEmpty)
    val hasOperationType = !message.operationType.isNullOrBlank()
    return cached.filter { item ->
        // Product rows retain the owned tool: key; IPC operations carry the
        // native id. Only bridge a real tool in this operation's exact turn.
        val sameTool = item.contentType == "tool" && item.id.startsWith("tool:") &&
            operationTurnId != null && hasOperationType && item.sourceTurnId?.trim() == operationTurnId &&
            item.id.removePrefix("tool:") in aliases
        (item.id in aliases || sameTool) &&
            (item.historyDetailRefs.isNotEmpty() || item.historyDetailRefsTruncated)
    }
}

/**
 * Return the stable cache ids represented by a UI/live message.  IPC
 * operation entries use a presentation key such as
 * `turn:operation:command:<itemId>`, whereas canonical history rows use the
 * raw `<itemId>`.  A collapsed command batch may represent several such
 * entries, so include both the batch members and their raw aliases.
 */
private fun historyItemAliasesForUiMessage(message: ChatMessage): Set<String> {
    val aliases = linkedSetOf<String>()
    val turnId = message.operationTurnId?.trim().orEmpty()
    val operationType = message.operationType?.trim().orEmpty()
    val operationPrefix = if (turnId.isNotEmpty() && operationType.isNotEmpty()) {
        "$turnId:operation:$operationType:"
    } else {
        null
    }
    fun add(value: String?) {
        val normalized = value?.trim()?.takeIf(String::isNotEmpty) ?: return
        aliases += normalized
        if (operationPrefix != null && normalized.startsWith(operationPrefix)) {
            normalized.removePrefix(operationPrefix)
                .trim()
                .takeIf(String::isNotEmpty)
                ?.let(aliases::add)
        }
    }
    add(message.id)
    message.operationBatchMemberIds.forEach(::add)
    return aliases
}

```

### android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:1207–1228

sha256: aac5ced2b1b6c689c1fbfa57b80a19679d6f9d8fa6bb7b7bf5793c6962c00f78

```text
internal fun shouldUseCanonicalThreadReadFallback(
    threadId: String?,
    activeConversationId: String?,
    authorityMode: IpcAuthorityMode,
    millisSinceAuthorityModeEntered: Long,
    surfaceWaitGraceMillis: Long,
    ipcStatusObserved: Boolean = true
): Boolean {
    if (!ipcStatusObserved) return false
    val targetThreadId = normalizeCodexThreadId(threadId) ?: return false
    val activeId = normalizeCodexThreadId(activeConversationId)
    if (activeId != null && activeId != targetThreadId) return false
    return when (authorityMode) {
        IpcAuthorityMode.IPC_AUTHORITATIVE -> false
        IpcAuthorityMode.IPC_OFFLINE,
        IpcAuthorityMode.IPC_DESYNCED -> true
        IpcAuthorityMode.AWAITING_IPC_SURFACE ->
            millisSinceAuthorityModeEntered >= surfaceWaitGraceMillis
    }
}

/**
```

