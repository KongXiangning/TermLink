const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readPublicFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', 'public', relativePath), 'utf8');
}

function readAndroidMainFile(relativePath) {
    return fs.readFileSync(
        path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'termlink', 'app', relativePath),
        'utf8'
    );
}

test('codex client shell uses the Phase 1 conversation-first header and shared codex scripts', () => {
    const html = readPublicFile('codex_client.html');

    assert.match(html, /id="codex-status-strip"/);
    assert.match(html, /id="codex-status-line"/);
    assert.match(html, /id="codex-meta-line"/);
    assert.match(html, /id="btn-codex-toggle"/);
    assert.match(html, /id="btn-codex-interrupt"/);
    assert.match(html, /id="btn-codex-secondary-threads"/);
    assert.match(html, /id="btn-codex-secondary-runtime"/);
    assert.match(html, /id="btn-codex-secondary-tools"/);
    assert.match(html, /id="btn-codex-secondary-notices"/);
    assert.match(html, /id="codex-history-panel"/);
    assert.match(html, /id="codex-runtime-panel"/);
    assert.match(html, /id="codex-tools-panel"/);
    assert.match(html, /id="codex-alerts"/);
    assert.match(html, /id="btn-codex-history-refresh"/);
    assert.match(html, /id="btn-codex-new-thread"/);
    assert.match(html, /id="codex-footer-plan-indicator"/);
    assert.doesNotMatch(html, /id="codex-plan-chip"/);
    assert.match(html, /id="codex-quick-model"/);
    assert.match(html, /id="codex-quick-reasoning"/);
    assert.match(html, /id="codex-quick-sandbox"/);
    assert.match(html, /id="btn-codex-file-attach"/);
    assert.match(html, /id="btn-codex-slash-cmd"/);
    assert.match(html, /id="codex-image-inputs"/);
    assert.match(html, /id="codex-log"[\s\S]*id="codex-log-stack"/);
    assert.match(html, /id="codex-composer-surface"/);
    assert.match(html, /id="codex-composer-footer"/);
    assert.match(html, /id="codex-context-widget"/);
    assert.doesNotMatch(html, /id="codex-context-modal"/);
    assert.match(html, /id="codex-command-approval-modal"/);
    assert.match(html, /id="codex-slash-menu"/);
    assert.match(html, /id="codex-history-actions"[\s\S]*id="btn-codex-history-refresh"[\s\S]*id="btn-codex-new-thread"/);
    assert.doesNotMatch(html, /id="btn-codex-permission-preset"/);
    assert.doesNotMatch(html, /id="btn-codex-secondary-settings"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="codex-permission-sheet"/);
    assert.doesNotMatch(html, /id="btn-codex-history-toggle"/);
    assert.doesNotMatch(html, /id="codex-settings-use-defaults"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_slash_commands\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=3"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=3"/);
    assert.match(html, /id="codex-plan-workflow"/);
    assert.match(html, /id="btn-codex-plan-execute"/);
    assert.match(html, /id="btn-codex-plan-continue"/);
    assert.match(html, /id="btn-codex-plan-cancel"/);
    assert.match(html, /src="terminal_client\.js\?v=\d+"/);
});

test('terminal client shell shares scripts but does not expose codex history panel markup', () => {
    const html = readPublicFile('terminal_client.html');

    assert.doesNotMatch(html, /id="codex-history-panel"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="codex-runtime-panel"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_slash_commands\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=3"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=3"/);
    assert.match(html, /src="terminal_client\.js\?v=\d+"/);
});

test('terminal client stylesheet supports secondary panels and sticky composer for the codex conversation page', () => {
    const css = readPublicFile('terminal_client.css');

    assert.match(css, /\.codex-secondary-btn/);
    assert.match(css, /#codex-history-actions/);
    assert.match(css, /#codex-panel\.collapsed #codex-runtime-panel/);
    assert.match(css, /#codex-panel\.collapsed #codex-tools-panel/);
    assert.match(css, /body\.codex-only\s*\{[\s\S]*overflow:\s*hidden/);
    assert.match(css, /body\.codex-only #terminal-shell\s*\{[\s\S]*height:\s*100%/);
    assert.match(css, /body\.codex-only #codex-panel\s*\{[\s\S]*overflow:\s*hidden/);
    assert.match(css, /body\.codex-only #codex-composer\s*\{[\s\S]*position:\s*relative/);
    assert.match(css, /#codex-log-stack\s*\{[\s\S]*min-height:\s*100%/);
    assert.match(css, /body\.codex-only #codex-log-stack\s*\{[\s\S]*justify-content:\s*flex-end/);
    assert.match(css, /#codex-quick-controls/);
    assert.match(css, /#codex-tools-grid/);
    assert.match(css, /#codex-composer-surface/);
    assert.match(css, /#codex-composer-footer/);
    assert.match(css, /\.codex-icon-btn/);
    assert.match(css, /\.codex-slash-item-status/);
    assert.match(css, /#codex-slash-menu/);
    assert.match(css, /#codex-image-inputs/);
    assert.match(css, /\.codex-image-chip/);
    assert.match(css, /\.codex-mode-chip/);
    assert.match(css, /\.codex-entry-context/);
    assert.match(css, /\.codex-entry-chip/);
    assert.match(css, /\.codex-history-rename-input/);
    assert.match(css, /body\.viewport-compact #codex-input/);
    assert.match(css, /\.codex-request-card/);
    assert.match(css, /\.codex-request-actions/);
    assert.match(css, /\.codex-context-ring/);
    assert.match(css, /\.codex-modal-layer/);
    assert.match(css, /\.codex-modal-card\s*\{[\s\S]*max-height:\s*min\(78vh,\s*680px\)/);
    assert.match(css, /\.codex-modal-card\s*\{[\s\S]*overflow:\s*auto/);
    assert.match(css, /#codex-plan-workflow/);
    assert.match(css, /#codex-plan-workflow-actions/);
});

test('codex message appends target the inner log stack instead of the scroll container root', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /const codexLogStack = document\.getElementById\('codex-log-stack'\);/);
    assert.match(js, /const codexCommandApprovalModal = document\.getElementById\('codex-command-approval-modal'\);/);
    assert.match(js, /function getCodexLogContainer\(\)\s*\{\s*return codexLogStack \|\| codexLog;/);
    assert.match(js, /const logContainer = getCodexLogContainer\(\);[\s\S]*logContainer\.appendChild\(entry\);/);
    assert.match(js, /const logContainer = getCodexLogContainer\(\);[\s\S]*logContainer\.innerHTML = '';/);
});

test('localImage history summaries keep only safe labels in Web and Android display metadata', () => {
    const js = readPublicFile('terminal_client.js');
    const vm = readAndroidMainFile(path.join('codex', 'CodexViewModel.kt'));

    assert.match(
        js,
        /if \(entry\.type === 'localImage'\)[\s\S]*return \{[\s\S]*kind:\s*'image',[\s\S]*label,[\s\S]*dedupeKey:\s*buildCodexAttachmentDedupeKey\(localPath \|\| label\)[\s\S]*\};/
    );
    assert.match(
        js,
        /chip\.title = attachment\.kind === 'image'[\s\S]*\?\s*attachment\.label[\s\S]*:\s*\(attachment\.path \|\| attachment\.url \|\| attachment\.label\);/
    );
    assert.match(
        vm,
        /private fun buildMessageAttachmentSummary\([\s\S]*val isLocalImage = attachment\.type == "localImage"[\s\S]*path = null,[\s\S]*url = attachment\.url\.takeUnless \{ isLocalImage \}[\s\S]*source = if \(isLocalImage\) "local" else "remote"[\s\S]*dedupeKey = if \(isLocalImage\) \{[\s\S]*buildAttachmentDedupeKey\(attachment\.url\.ifBlank \{ attachment\.label \}\)/
    );
});

test('Android user message context chips use wrapping layout instead of horizontal scroll', () => {
    const screen = readAndroidMainFile(path.join('codex', 'ui', 'CodexScreen.kt'));

    assert.match(
        screen,
        /@OptIn\(ExperimentalLayoutApi::class\)[\s\S]*private fun MessageBubble\(message: ChatMessage\)/
    );
    assert.match(
        screen,
        /if \(message\.role == ChatMessage\.Role\.USER[\s\S]*FlowRow\([\s\S]*verticalArrangement = Arrangement\.spacedBy\(8\.dp\)/
    );
    assert.doesNotMatch(
        screen,
        /if \(message\.role == ChatMessage\.Role\.USER &&[\s\S]{0,220}horizontalScroll\(rememberScrollState\(\)\)/
    );
    assert.match(
        screen,
        /private fun SkillChipLabel\(skillName: String\)[\s\S]*text = "\$"[\s\S]*text = display/
    );
    assert.doesNotMatch(
        screen,
        /private fun SkillChipLabel\(skillName: String\)[\s\S]*codex_native_skill_chip_prefix/
    );
});

test('localImage history dedupe uses an opaque key instead of collapsing same-name files by label', () => {
    const js = readPublicFile('terminal_client.js');
    const vm = readAndroidMainFile(path.join('codex', 'CodexViewModel.kt'));
    const models = readAndroidMainFile(path.join('codex', 'domain', 'CodexModels.kt'));
    const screen = readAndroidMainFile(path.join('codex', 'ui', 'CodexScreen.kt'));

    assert.match(js, /function buildCodexAttachmentDedupeKey\(value\)/);
    assert.match(
        js,
        /const dedupeSource = typeof attachment\.dedupeKey === 'string' && attachment\.dedupeKey\.trim\(\)[\s\S]*: \(attachment\.path \|\| attachment\.url \|\| label\);/
    );
    assert.match(
        js,
        /dedupeKey:\s*buildCodexAttachmentDedupeKey\(localPath \|\| label\)/
    );
    assert.match(
        js,
        /dedupeKey:\s*dedupeSource \|\| ''/
    );
    assert.match(models, /data class CodexMessageAttachment\([\s\S]*val source: String\? = null,[\s\S]*val dedupeKey: String\? = null/);
    assert.match(vm, /private fun buildAttachmentDedupeKey\(value: String\?\): String/);
    assert.match(
        vm,
        /attachment\.dedupeKey[\s\S]*?: listOf\([\s\S]*attachment\.source\.orEmpty\(\)\.trim\(\)\.lowercase\(\)[\s\S]*attachment\.label\.trim\(\)\.lowercase\(\)/
    );
    assert.match(
        screen,
        /val isLocalImage = attachment\.source == "local" \|\|[\s\S]*isLocalImage[\s\S]*stringResource\(R\.string\.codex_native_image_local_chip, attachment\.label\)/
    );
});

test('Android preserves optimistic user messages until turn ack arrives', () => {
    const vm = readAndroidMainFile(path.join('codex', 'CodexViewModel.kt'));

    assert.match(
        vm,
        /internal fun shouldPreserveLocalMessageTailForUi\([\s\S]*allowThreadIdSwitch: Boolean = false[\s\S]*val knownThreadSwitch = allowThreadIdSwitch[\s\S]*if \(!sameThread && !knownThreadSwitch\) \{\s*return false\s*\}/
    );
    assert.match(
        vm,
        /private fun shouldAllowOptimisticTailAcrossThreadSwitch\([\s\S]*pendingOptimisticNewThreadSourceThreadId[\s\S]*normalizedIncomingThreadId != pendingSourceThreadId/
    );
});

test('composer skill tokens hide raw skill paths while preserving transport parsing', () => {
    const js = readPublicFile('terminal_client.js');
    const css = readPublicFile('terminal_client.css');
    const screen = readAndroidMainFile(path.join('codex', 'ui', 'CodexScreen.kt'));

    assert.match(js, /node\.classList && node\.classList\.contains\('codex-skill-tag'\)[\s\S]*node\.dataset\.rawToken/);
    assert.match(js, /function insertSkillTagAtCursor\(skillEntry\)/);
    assert.match(js, /span\.className = 'codex-skill-tag'[\s\S]*span\.dataset\.rawToken = rawToken[\s\S]*span\.textContent = displayText/);
    assert.match(js, /applyCodexSkillSelection\(skillEntry\)[\s\S]*insertSkillTagAtCursor\(skillEntry\)/);
    assert.match(css, /\.codex-skill-tag\s*\{/);
    assert.match(
        screen,
        /private fun composerVisualTransformation\(mentions: List<FileMention>\): VisualTransformation \{[\s\S]*buildComposerTransformedText\([\s\S]*text = source\.text/
    );
    assert.match(screen, /private fun buildComposerTransformedText\(/);
    assert.ok(
        screen.includes('rawMatches += (matchIndex until matchEnd) to "\\$${token.name}"'),
        'Android composer transformation should render skill tokens as visible $name tags instead of raw path tokens'
    );
});

test('web keeps skill tokens inline while Android post-send bubbles render skill chips without exposing paths', () => {
    const js = readPublicFile('terminal_client.js');
    const screen = readAndroidMainFile(path.join('codex', 'ui', 'CodexScreen.kt'));

    assert.match(js, /function replaceCodexSkillTokensForDisplay\(text\)/);
    assert.match(
        js,
        /return \{\s*text:\s*replaceCodexSkillTokensForDisplay\(sourceText\),[\s\S]*attachments\s*\}/
    );
    assert.match(
        js,
        /const extractedFiles = extractCodexLeadingFileReferences\(sourceText\);[\s\S]*text:\s*replaceCodexSkillTokensForDisplay\(extractedFiles\.bodyText\)/
    );
    assert.match(js, /if \(!presentation \|\| !presentation\.attachments\.length\) \{\s*return;\s*\}/);
    assert.doesNotMatch(js, /presentation\.skills\.forEach/);

    assert.match(
        screen,
        /if \(message\.role == ChatMessage\.Role\.USER &&[\s\S]*message\.skills\.isNotEmpty\(\)[\s\S]*message\.fileMentions\.isNotEmpty\(\) \|\|[\s\S]*message\.attachments\.isNotEmpty\(\)/
    );
    assert.match(
        screen,
        /message\.skills\.forEach \{ skill ->[\s\S]*UserMessageSkillChip\(skillName = skill\.name\)/
    );
    assert.match(
        screen,
        /text = if \(message\.role == ChatMessage\.Role\.USER\) \{[\s\S]*buildComposerTransformedText\([\s\S]*textColor = spec\.textColor[\s\S]*\)\.text[\s\S]*\} else \{[\s\S]*buildComposerAnnotatedString\(/
    );
    assert.match(
        screen,
        /private fun UserMessageSkillChip\([\s\S]*SkillChipLabel\(skillName = skillName\)/
    );
    assert.doesNotMatch(screen, /private fun StaticSkillChip\(/);
});

// Phase 1 behavior test: secondary panels MUST be hidden by default
test('Phase 1: CSS [hidden] rule must override ID selector display properties to ensure secondary panels hide correctly', () => {
    const css = readPublicFile('terminal_client.css');

    // The [hidden] rule MUST use !important to override ID selectors like #codex-history-panel { display: flex }
    // This is critical because ID selectors have higher specificity than attribute selectors
    assert.match(css, /\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important/, 'CSS must have [hidden] { display: none !important } to override ID selector display rules');
});

test('Phase 1: secondary panels in codex_client.html must have hidden attribute by default', () => {
    const html = readPublicFile('codex_client.html');

    // All secondary panels MUST have hidden attribute by default
    // This ensures they are hidden before JS runs, preventing FOUC (Flash of Unstyled Content)
    assert.match(html, /<div\s+id="codex-history-panel"\s+[^>]*hidden/, 'codex-history-panel must have hidden attribute');
    assert.match(html, /<div\s+id="codex-runtime-panel"\s+[^>]*hidden/, 'codex-runtime-panel must have hidden attribute');
    assert.match(html, /<div\s+id="codex-tools-panel"\s+[^>]*hidden/, 'codex-tools-panel must have hidden attribute');
    assert.match(html, /<div\s+id="codex-alerts"\s+[^>]*hidden/, 'codex-alert must have hidden attribute');
});

test('Phase 1: terminal_client.js render functions must set hidden=true when secondaryPanel is not the target panel', () => {
    const js = readPublicFile('terminal_client.js');

    // renderCodexHistoryList must set hidden when secondaryPanel !== 'threads'
    assert.match(js, /codexHistoryPanel\.hidden\s*=\s*!\(.*syncCodexSecondaryPanelState\(\)\s*===\s*['"]threads['"]\)/,
        'renderCodexHistoryList must set hidden=true when secondaryPanel !== "threads"');

    // renderCodexRuntimePanel must set hidden when secondaryPanel !== 'runtime'
    assert.match(js, /codexRuntimePanel\.hidden\s*=\s*!\(.*syncCodexSecondaryPanelState\(\)\s*===\s*['"]runtime['"]\)/,
        'renderCodexRuntimePanel must set hidden=true when secondaryPanel !== "runtime"');

    // renderCodexToolsPanel must set hidden when secondaryPanel !== 'tools'
    assert.match(js, /codexToolsPanel\.hidden\s*=\s*!\(.*syncCodexSecondaryPanelState\(\)\s*===\s*['"]tools['"]\)/,
        'renderCodexToolsPanel must set hidden=true when secondaryPanel !== "tools"');
});

test('Phase 1: codexState.secondaryPanel must default to "none" to ensure all panels hidden on cold start', () => {
    const js = readPublicFile('terminal_client.js');

    // codexState.secondaryPanel must be initialized to 'none'
    assert.match(js, /secondaryPanel:\s*['"]none['"]/, 'codexState.secondaryPanel must be initialized to "none"');
});

test('Phase 1: session_info and codex_capabilities handlers must reset secondaryPanel to "none"', () => {
    const js = readPublicFile('terminal_client.js');

    // When session_info is received, secondaryPanel must be reset to 'none'
    assert.match(js, /envelope\.type\s*===\s*['"]session_info['"][\s\S]*?codexState\.secondaryPanel\s*=\s*['"]none['"]/,
        'session_info handler must reset secondaryPanel to "none"');

    // When codex_capabilities is received, secondaryPanel must be reset to 'none'
    assert.match(js, /envelope\.type\s*===\s*['"]codex_capabilities['"][\s\S]*?codexState\.secondaryPanel\s*=\s*['"]none['"]/,
        'codex_capabilities handler must reset secondaryPanel to "none"');
});

test('Phase 2: terminal_client.js composer must route through slash dispatch and interaction state sync', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /function handleCodexComposerSubmit\(rawText\)/);
    assert.match(js, /function buildPlanCollaborationMode\(config\)/);
    assert.match(js, /type:\s*'codex_set_interaction_state'/);
    assert.match(js, /mode:\s*'plan'/);
    assert.match(js, /reasoning_effort:\s*effectiveConfig\.reasoningEffort \|\| null/);
    assert.match(js, /collaborationMode:\s*collaborationMode \|\| undefined/);
    assert.match(js, /attachments:\s*imageInputs\.length > 0 \? imageInputs : undefined/);
    assert.match(js, /interactionState,\s*\n\s*model:/);
    assert.match(js, /finalizePendingTurnStateOnSuccess\(\)/);
    assert.match(js, /restorePendingTurnStateOnFailure\(\)/);
    assert.match(js, /const skillTokens = extractCodexSkillTokensFromText\(cleaned\);/);
    assert.match(js, /activeSkill:\s*skillTokens\.length === 1 \? skillTokens\[0\]\.name : null/);
    assert.match(js, /clearImageInputs:\s*imageInputs\.length > 0/);
    assert.match(js, /setPendingCodexImageInputs\(pending\.imageInputs \|\| \[\]\)/);
    assert.match(js, /phase:\s*'idle'/);
    assert.match(js, /function startPlanWorkflow\(promptText\)/);
    assert.match(js, /function finalizePlanWorkflowForConfirmation\(\)/);
    assert.match(js, /function buildConfirmedPlanExecutionPrompt\(\)/);
    assert.match(js, /phase:\s*'awaiting_user_input'/);
    assert.match(js, /phase:\s*'plan_ready_for_confirmation'/);
    assert.match(js, /phase:\s*'executing_confirmed_plan'/);
    assert.match(js, /if \(request\.requestKind === 'userInput' && codexState\.planWorkflow\.phase === 'planning'\)/);
    assert.match(js, /Execute the confirmed plan below now\./);
});

test('Phase 2: terminal_client.js must compose server next-turn config with local next-turn overrides', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /serverNextTurnConfigBase:\s*null/);
    assert.match(js, /nextTurnOverrides:\s*\{\s*model:\s*null,\s*reasoningEffort:\s*null,\s*sandbox:\s*null\s*\}/);
    assert.match(js, /function normalizeEffectiveCodexConfig\(payload\)/);
    assert.match(js, /function derivePermissionConfigFromSandboxOverride\(sandboxOverride\)/);
    assert.match(js, /function resolveCodexTurnSandboxOverride\(nextTurnOverrides\)/);
    assert.match(js, /const baseConfig = codexState\.serverNextTurnConfigBase/);
    assert.match(js, /model:\s*codexState\.nextTurnOverrides\.model \|\| baseConfig\.model \|\| null/);
    assert.match(js, /reasoningEffort:\s*codexState\.nextTurnOverrides\.reasoningEffort \|\| baseConfig\.reasoningEffort \|\| null/);
    assert.match(js, /approvalPolicy:\s*permissionOverride \? permissionOverride\.approvalPolicy : \(baseConfig\.approvalPolicy \|\| null\)/);
    assert.match(js, /sandboxMode:\s*permissionOverride \? permissionOverride\.sandboxMode : \(baseConfig\.sandboxMode \|\| null\)/);
    assert.match(js, /codexState\.serverNextTurnConfigBase = normalizeEffectiveCodexConfig\(envelope\.nextTurnEffectiveCodexConfig\)/);
    assert.match(js, /codexState\.nextTurnEffectiveCodexConfig = buildLocalNextTurnEffectiveCodexConfig\(\)/);
    assert.match(js, /codexState\.serverNextTurnConfigBase = null[\s\S]*syncNextTurnEffectiveCodexConfig\(\)/);
    assert.match(js, /function clearNextTurnOverrides\(\)\s*\{\s*setNextTurnOverrides\(\{ model: null, reasoningEffort: null, sandbox: null \}\);/);
    assert.match(js, /codexState\.nextTurnOverrides = restoreNextTurnOverrides\(\)/);
    assert.match(js, /setNextTurnOverrides\(pending\.nextTurnOverrides \|\| \{ model: null, reasoningEffort: null, sandbox: null \}\)/);
    assert.match(js, /sandbox:\s*resolveCodexTurnSandboxOverride\(nextTurnOverrides\) \|\| undefined/);
});

test('Phase 2: terminal_client.js must parse model\/list and skills\/list payloads for executable slash pickers', () => {
    const js = readPublicFile('terminal_client.js');
    const slashJs = readPublicFile('lib/codex_slash_commands.js');

    assert.match(js, /Array\.isArray\(source\.data\)/);
    assert.match(js, /function canLoadCodexModels\(\)/);
    assert.match(js, /function canLoadCodexSkills\(\)/);
    assert.match(js, /getActiveSessionMode\(\)\s*===\s*'codex'\s*&&\s*codexState\.capabilities\.modelConfig\s*===\s*true/);
    assert.match(js, /function populateCodexReasoningSelect\(selectEl, options\)/);
    assert.match(js, /function openCodexModelPicker\(\)/);
    assert.match(js, /maybeLoadCodexModels\(\)[\s\S]*return refreshCodexModelList\(\{ silent: true \}\)/);
    assert.match(js, /void openCodexModelPicker\(\)/);
    assert.match(js, /function openSelectPicker\(selectEl\)/);
    assert.match(js, /codexInput\.value = ''[\s\S]*openCodexModelPicker\(\)/);
    assert.match(js, /entry\.isDefault === true/);
    assert.match(js, /defaultReasoningEffort/);
    assert.doesNotMatch(js, /默认 ·/);
    assert.match(js, /function normalizeCodexSkillCatalog\(result\)/);
    assert.match(js, /function buildCodexSkillsListParams\(\)/);
    assert.match(js, /const cwd = String\(codexState\.cwd \|\| getConfiguredCodexCwd\(\) \|\| ''\)\.trim\(\)/);
    assert.match(js, /return cwd \? \{ cwds: \[cwd\] \} : \{\}/);
    assert.match(js, /sendCodexBridgeRequest\('skills\/list', buildCodexSkillsListParams\(\)\)/);
    assert.match(js, /function buildCodexThreadListParams\(\)/);
    assert.match(js, /return cwd \? \{ limit: 50, cwd \} : \{ limit: 50 \}/);
    assert.match(js, /sendCodexBridgeRequest\('thread\/list', buildCodexThreadListParams\(\), \{ suppressErrorUi: opts\.silent === true \}\)/);
    assert.match(js, /codexInput\.value = '\/skill '/);
    assert.match(js, /const items = isSkillQuery\s*\?\s*\[\]/);
    assert.match(js, /codexSlashMenuEmpty\.hidden = isSkillQuery \? skillItems\.length > 0/);
    assert.match(js, /function applyCodexSkillSelection\(skillEntry\)/);
    assert.match(js, /const rawToken = buildCodexSkillTokenText\(skillEntry\);/);
    assert.match(js, /if \(!buildCodexSkillTokenText\(skillEntry\) \|\| !codexInput\) \{\s*return;\s*\}/);
    assert.match(slashJs, /function buildSkillToken\(input\)/);
    assert.match(slashJs, /function extractSkillTokens\(text\)/);
    assert.match(slashJs, /function stripSkillTokens\(text\)/);
    assert.match(js, /sendCodexBridgeRequest\('thread\/compact\/start', \{ threadId \}, \{ suppressErrorUi: true \}\)/);
    assert.match(js, /if \(method === 'thread\/compacted'\)/);
    assert.match(js, /setCodexCompactStatus\(t\('codex\.compact\.alreadyDone'\), 'success'\)/);
    assert.match(js, /refreshCodexThreadSnapshot\(\{ force: true \}\)/);
    assert.match(js, /openCodexToolsPanel\('skills'\)/);
    assert.match(js, /openCodexToolsPanel\('compact'\)/);
    assert.match(js, /function isExecutableCodexSlashCommand\(entry\)/);
    assert.match(js, /entry\.capabilityKey && codexState\.capabilities\[entry\.capabilityKey\] !== true/);
    assert.match(js, /const registryEntry = resolveExecutableCodexSlashCommand\(parsed\.command\)/);
    assert.match(js, /const registryEntry = resolveExecutableCodexSlashCommand\(command\)/);
    assert.match(js, /function recoverFromMissingSession\(event\)/);
    assert.match(js, /event\.code !== 4404/);
    assert.match(js, /clearPersistedSessionBinding\(\)/);
    assert.match(js, /notifyNativeConnectionState\('reconnecting', 'stale session; requesting fresh session'\)/);
    assert.match(js, /function renderCodexCommandApprovalModal\(\)/);
    assert.match(js, /if \(existing\.status === 'submitted'\) \{\s*existing\.status = 'pending';\s*existing\.resolution = '';\s*\}/);
    assert.match(js, /function normalizeCodexContextUsage\(payload\)/);
    assert.match(js, /function renderCodexContextUsage\(\)/);
    assert.match(js, /function maybeAutoRefreshCodexRateLimits\(\)/);
    assert.match(js, /codexState\.rateLimitBootstrapRequested = true;/);
    assert.match(js, /refreshCodexRateLimits\(\{ silent: true \}\)\.finally\(\(\) => \{\s*codexState\.rateLimitBootstrapRequested = false;/);
    assert.match(js, /envelope\.type === 'session_info'[\s\S]*maybeAutoRefreshCodexRateLimits\(\)/);
    assert.match(js, /envelope\.type === 'codex_capabilities'[\s\S]*maybeAutoRefreshCodexRateLimits\(\)/);
    assert.match(js, /envelope\.type === 'codex_state'[\s\S]*maybeAutoRefreshCodexRateLimits\(\)/);
    assert.doesNotMatch(js, /applyCodexPermissionPresetSelection/);
    assert.doesNotMatch(js, /\['low', 'medium', 'high', 'xhigh'\]/);
    assert.doesNotMatch(js, /selectedValue && !optionValues\.includes\(selectedValue\)/);
    assert.match(slashJs, /command:\s*'\/skill'[\s\S]*availability:\s*'enabled'/);
    assert.match(slashJs, /command:\s*'\/compact'[\s\S]*dispatchKind:\s*'open_panel'/);
    assert.match(slashJs, /command:\s*'\/skills'[\s\S]*dispatchKind:\s*'open_panel'/);
});

test('terminal client reconnects and clears codex state when runtime session binding changes', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(
        js,
        /const shouldReconnectBridge = \(serverChanged \|\| sessionChanged\) && \(forceReconnect \|\| ws\);/
    );
    assert.match(
        js,
        /if \(shouldReconnectBridge\) \{[\s\S]*closeSocketSilently\(\);[\s\S]*resetTerminalView\(\);[\s\S]*resetCodexBootstrapState\(\);[\s\S]*connect\(\);[\s\S]*\}/
    );
});

test('terminal client includes the active thread id when sending normal codex turns', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(
        js,
        /const payload = \{[\s\S]*type: 'codex_turn'[\s\S]*text: finalText[\s\S]*threadId:\s*codexState\.threadId \|\| undefined[\s\S]*forceNewThread: !!opts\.forceNewThread/
    );
});

// ── Step 5: IPC data routing static assertions ────────────────────────────

test('IPC: terminal_client.js registers IPC envelope handlers on the WebSocket message dispatch', () => {
    const js = readPublicFile('terminal_client.js');

    // IPC handlers must exist as function definitions
    assert.match(js, /function handleCodexIpcStatus\(/, 'handleCodexIpcStatus must be defined');
    assert.match(js, /function handleCodexIpcConversations\(/, 'handleCodexIpcConversations must be defined');
    assert.match(js, /function selectCodexIpcConversation\(/, 'selectCodexIpcConversation must be defined');
    assert.match(js, /function handleConversationSurfaceSnapshot\(/, 'handleConversationSurfaceSnapshot must be defined');
    assert.match(js, /function handleCodexIpcFollowerAck\(/, 'handleCodexIpcFollowerAck must be defined');
    assert.match(js, /function handleCodexIpcGatewayError\(/, 'handleCodexIpcGatewayError must be defined');

    // IPC envelope types must be consumed in ws.onmessage dispatch
    assert.match(js, /envelope\.type\s*===\s*['"]codex_ipc_status['"]/, 'codex_ipc_status envelope must be dispatched');
    assert.match(js, /envelope\.type\s*===\s*['"]codex_ipc_conversations['"]/, 'codex_ipc_conversations envelope must be dispatched');
    assert.match(js, /envelope\.type\s*===\s*['"]conversation_surface_snapshot['"]/, 'conversation_surface_snapshot envelope must be dispatched');
});

test('IPC: follower_send_message and set_active_conversation envelope builders exist', () => {
    const js = readPublicFile('terminal_client.js');

    // Outbound IPC envelope types
    assert.match(js, /type:\s*['"]follower_send_message['"]/, 'follower_send_message envelope must exist');
    assert.match(js, /type:\s*['"]set_active_conversation['"]/, 'set_active_conversation envelope must exist');
    assert.match(js, /type:\s*['"]follower_approval_response['"]/, 'follower_approval_response envelope must exist');
    assert.match(js, /type:\s*['"]follower_plan_response['"]/, 'follower_plan_response envelope must exist');
});

test('IPC: shouldSendCodexViaIpcFollower guard enforces all six preconditions', () => {
    const js = readPublicFile('terminal_client.js');

    // The guard function must exist
    assert.match(js, /function shouldSendCodexViaIpcFollower\(\)/, 'shouldSendCodexViaIpcFollower must be defined');

    // Must check online
    assert.match(js, /if\s*\(!bridge\.online\)\s*return\s*false/, 'guard must check online');
    // Must check preferred
    assert.match(js, /if\s*\(!bridge\.preferred\)\s*return\s*false/, 'guard must check preferred');
    // Must check activeConversationId
    assert.match(js, /if\s*\(!bridge\.activeConversationId\)\s*return\s*false/, 'guard must check activeConversationId');
    // Must check cooldown
    assert.match(js, /Date\.now\(\)\s*<\s*bridge\.cooldownUntil/, 'guard must check cooldownUntil');
    // Must check running/waiting_for_approval/blocked/offline status
    assert.match(js, /status\s*===\s*['"]running['"]\s*\|\|\s*status\s*===\s*['"]waiting_for_approval['"]\s*\|\|\s*status\s*===\s*['"]blocked['"]\s*\|\|\s*status\s*===\s*['"]offline['"]/, 'guard must check blocked conversation statuses');
});

test('IPC: sendCodexFollowerMessage constructs correct envelope and handles send failure', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /function sendCodexFollowerMessage\(/, 'sendCodexFollowerMessage must be defined');
    assert.match(js, /type:\s*['"]follower_send_message['"]/, 'payload must include follower_send_message type');
    assert.match(js, /conversationId:\s*bridge\.activeConversationId/, 'payload must include conversationId');
    assert.match(js, /input:\s*text/, 'payload must include input text');
    // Must handle send failure by clearing pending marker
    assert.match(js, /bridge\.pendingFollowerSend\s*=\s*null/, 'send failure must clear pendingFollowerSend');
});

test('IPC: handleCodexIpcStatus correctly reads online field and resets on offline', () => {
    const js = readPublicFile('terminal_client.js');

    // Must read status.online
    assert.match(js, /function handleCodexIpcStatus\(/, 'handleCodexIpcStatus must be defined');
    assert.match(js, /status\.online/, 'must read status.online field');
});

test('IPC: handleCodexIpcGatewayError resets preferred and sets cooldown', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /function handleCodexIpcGatewayError\(/, 'handleCodexIpcGatewayError must be defined');
    // Must reset preferred (uses codexState.ipcBridge.preferred = false)
    assert.match(js, /ipcBridge\.preferred\s*=\s*false/, 'error handler must reset preferred');
    // Must set cooldown
    assert.match(js, /ipcBridge\.cooldownUntil\s*=\s*Date\.now\(\)\s*\+\s*\d+/, 'error handler must set cooldown');
    // Must clear pending send
    assert.match(js, /ipcBridge\.pendingFollowerSend\s*=\s*null/, 'error handler must clear pendingFollowerSend');
});

test('IPC: ipcBridge state includes all required fields initialized at declaration', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /ipcBridge:\s*\{/);
    assert.match(js, /online:\s*false/);
    assert.match(js, /preferred:\s*false/);
    assert.match(js, /conversations:\s*\[\]/);
    assert.match(js, /activeConversationId:\s*''/);
    assert.match(js, /activeConversationStatus:\s*''/);
    assert.match(js, /latestSurface:\s*null/);
    assert.match(js, /projectedItemKeys:\s*new\s*Set\(\)/);
    assert.match(js, /projectedItemTextByKey:\s*new\s*Map\(\)/);
    assert.match(js, /pendingFollowerSend:\s*null/);
    assert.match(js, /pendingApproval:\s*null/);
    assert.match(js, /pendingPlanAction:\s*null/);
    assert.match(js, /pendingGoalAction:\s*null/);
    assert.match(js, /ipcPlanWorkflowActive:\s*false/);
    assert.match(js, /cooldownUntil:\s*0/);
});

test('IPC: HTML and CSS files contain zero IPC-specific UI elements', () => {
    const html = readPublicFile('codex_client.html');
    const css = readPublicFile('terminal_client.css');

    // No IPC panel, selector, status bar, badge, or conversation picker in HTML
    assert.doesNotMatch(html, /ipc-panel|ipc-status|ipc-conversation|ipc-badge|ipc-selector|conversation-selector/i,
        'HTML must not contain IPC-specific UI elements');
    // No IPC-specific CSS rules
    assert.doesNotMatch(css, /ipc-panel|ipc-status|ipc-conversation|ipc-badge|ipc-selector/i,
        'CSS must not contain IPC-specific UI rules');
});

test('IPC: resetCodexIpcBridgeState clears all transient fields including ipcPlanWorkflowActive', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /function resetCodexIpcBridgeState\(/);
    assert.match(js, /codexState\.ipcBridge\.online\s*=\s*false/);
    assert.match(js, /codexState\.ipcBridge\.preferred\s*=\s*false/);
    assert.match(js, /codexState\.ipcBridge\.activeConversationId\s*=\s*''/);
    assert.match(js, /codexState\.ipcBridge\.latestSurface\s*=\s*null/);
    assert.match(js, /codexState\.ipcBridge\.projectedItemKeys\.clear\(\)/);
    assert.match(js, /codexState\.ipcBridge\.projectedItemTextByKey\.clear\(\)/);
    assert.match(js, /codexState\.ipcBridge\.pendingFollowerSend\s*=\s*null/);
    assert.match(js, /codexState\.ipcBridge\.pendingApproval\s*=\s*null/);
    assert.match(js, /codexState\.ipcBridge\.pendingPlanAction\s*=\s*null/);
    assert.match(js, /codexState\.ipcBridge\.pendingGoalAction\s*=\s*null/);
    assert.match(js, /codexState\.ipcBridge\.ipcPlanWorkflowActive\s*=\s*false/);
    assert.match(js, /codexState\.ipcBridge\.cooldownUntil\s*=\s*0/);
});

test('IPC: composer submit path includes IPC-first guard before legacy sendCodexTurn', () => {
    const js = readPublicFile('terminal_client.js');

    // The IPC guard must be called before sendCodexTurn in the composer submit path
    assert.match(js, /function handleCodexComposerSubmit\(/, 'handleCodexComposerSubmit must be defined');
    // shouldSendCodexViaIpcFollower must be referenced in the composer submit flow
    assert.match(js, /shouldSendCodexViaIpcFollower/, 'composer submit must reference shouldSendCodexViaIpcFollower guard');
    // sendCodexFollowerMessage must be referenced
    assert.match(js, /sendCodexFollowerMessage/, 'composer submit must reference sendCodexFollowerMessage');
    // Legacy sendCodexTurn must still exist as fallback
    assert.match(js, /function sendCodexTurn\(/, 'legacy sendCodexTurn must still exist');
});

test('IPC: snapshot handler projects plan_prompt, goal_prompt, and approval_request item kinds', () => {
    const js = readPublicFile('terminal_client.js');

    // The snapshot handler must handle all item kinds for complete projection
    assert.match(js, /item\.kind\s*===\s*['"]plan_prompt['"]/, 'snapshot handler must project plan_prompt items');
    assert.match(js, /item\.kind\s*===\s*['"]goal_prompt['"]/, 'snapshot handler must project goal_prompt items');
    assert.match(js, /item\.kind\s*===\s*['"]approval_request['"]/, 'snapshot handler must project approval_request items');
});

test('IPC: snapshot status is mapped to setCodexStatus for header display', () => {
    const js = readPublicFile('terminal_client.js');

    // handleConversationSurfaceSnapshot must call setCodexStatus with mapped status
    assert.match(js, /function handleConversationSurfaceSnapshot\(/, 'snapshot handler must be defined');
    // The status mapping must call setCodexStatus inside the snapshot handler (after preferred check)
    assert.match(js, /setCodexStatus\(mappedStatus,\s*mappedDetail\)/, 'snapshot must map status to setCodexStatus');
});

test('IPC: approval approve/reject handlers check sendCodexEnvelope return before marking submitted', () => {
    const js = readPublicFile('terminal_client.js');

    // The IPC approve path must check the boolean return of sendCodexEnvelope
    // Pattern: if (!sendCodexEnvelope({...type:'follower_approval_response'...decision:'accept'...})) { return; }
    assert.match(js, /if\s*\(!sendCodexEnvelope\(\{[\s\S]*type:\s*['"]follower_approval_response['"][\s\S]*decision:\s*['"]accept['"]/, 'approve must check sendCodexEnvelope return');
    // Pattern: if (!sendCodexEnvelope({...type:'follower_approval_response'...decision:'reject'...})) { return; }
    assert.match(js, /if\s*\(!sendCodexEnvelope\(\{[\s\S]*type:\s*['"]follower_approval_response['"][\s\S]*decision:\s*['"]reject['"]/, 'reject must check sendCodexEnvelope return');
});

test('IPC: plan execute/cancel handlers check sendCodexEnvelope return before clearing pending state', () => {
    const js = readPublicFile('terminal_client.js');

    // Plan execute IPC path must check return
    assert.match(js, /if\s*\(!sendCodexEnvelope\(\{[\s\S]*type:\s*['"]follower_plan_response['"][\s\S]*input:\s*['"]是，实施此计划['"]/, 'plan execute must check sendCodexEnvelope return');
    // Plan cancel IPC path must check return
    assert.match(js, /if\s*\(!sendCodexEnvelope\(\{[\s\S]*type:\s*['"]follower_plan_response['"][\s\S]*input:\s*['"]取消['"]/, 'plan cancel must check sendCodexEnvelope return');
});

test('IPC: submitBlockingCommandApprovalDecision already checks sendCodexEnvelope for IPC transport', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /function submitBlockingCommandApprovalDecision\(/);
    // Must check sendCodexEnvelope return for IPC path
    assert.match(js, /requestState\.ipcTransport[\s\S]*if\s*\(!sendCodexEnvelope\(/, 'blocking approval must check sendCodexEnvelope return for IPC transport');
});

test('IPC: test hooks expose all IPC functions for integration testing', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /handleCodexIpcStatus,/);
    assert.match(js, /handleCodexIpcConversations,/);
    assert.match(js, /handleConversationSurfaceSnapshot,/);
    assert.match(js, /handleCodexIpcFollowerAck,/);
    assert.match(js, /handleCodexIpcGatewayError,/);
    assert.match(js, /selectCodexIpcConversation,/);
    assert.match(js, /resetCodexIpcBridgeState,/);
    assert.match(js, /shouldSendCodexViaIpcFollower,/);
    assert.match(js, /sendCodexFollowerMessage,/);
});
