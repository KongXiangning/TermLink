const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readPublicFile(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', 'public', relativePath), 'utf8');
}

test('codex client shell uses the Phase 1 conversation-first header and shared codex scripts', () => {
    const html = readPublicFile('codex_client.html');

    assert.match(html, /id="codex-status-strip"/);
    assert.match(html, /id="codex-thread-line"/);
    assert.match(html, /id="codex-thread-id"/);
    assert.match(html, /id="codex-thread-cwd"/);
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
    assert.match(html, /id="codex-plan-chip"/);
    assert.match(html, /id="codex-quick-model"/);
    assert.match(html, /id="codex-quick-reasoning"/);
    assert.match(html, /id="btn-codex-slash-trigger"/);
    assert.match(html, /id="codex-image-inputs"/);
    assert.match(html, /id="codex-log"[\s\S]*id="codex-log-stack"/);
    assert.match(html, /id="codex-composer-surface"/);
    assert.match(html, /id="codex-composer-footer"/);
    assert.match(html, /id="codex-thread-context-panel"/);
    assert.match(html, /id="codex-command-approval-modal"/);
    assert.match(html, /id="codex-slash-menu"/);
    assert.match(html, /id="codex-actions"[\s\S]*id="btn-codex-toggle"[\s\S]*id="btn-codex-interrupt"/);
    assert.match(html, /id="codex-history-actions"[\s\S]*id="btn-codex-history-refresh"[\s\S]*id="btn-codex-new-thread"/);
    assert.doesNotMatch(html, /id="btn-codex-permission-preset"/);
    assert.doesNotMatch(html, /id="btn-codex-secondary-settings"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="btn-codex-history-toggle"/);
    assert.doesNotMatch(html, /id="codex-settings-use-defaults"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_slash_commands\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=3"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=3"/);
    assert.match(html, /id="codex-plan-workflow"/);
    assert.match(html, /id="btn-codex-plan-execute"/);
    assert.match(html, /id="btn-codex-plan-continue"/);
    assert.match(html, /id="btn-codex-plan-cancel"/);
    assert.match(html, /src="terminal_client\.js\?v=60"/);
});

test('terminal client shell shares scripts but does not expose codex history panel markup', () => {
    const html = readPublicFile('terminal_client.html');

    assert.doesNotMatch(html, /id="codex-history-panel"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="codex-runtime-panel"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_slash_commands\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=3"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=3"/);
    assert.match(html, /src="terminal_client\.js\?v=60"/);
});

test('terminal client stylesheet supports secondary panels and sticky composer for the codex conversation page', () => {
    const css = readPublicFile('terminal_client.css');

    assert.match(css, /#codex-status-strip/);
    assert.match(css, /#codex-thread-line/);
    assert.match(css, /\.codex-secondary-btn/);
    assert.match(css, /#codex-history-actions/);
    assert.match(css, /#codex-panel\.collapsed #codex-settings-panel/);
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
    assert.match(css, /\.codex-history-rename-input/);
    assert.match(css, /body\.viewport-compact #codex-input/);
    assert.match(css, /\.codex-request-card/);
    assert.match(css, /\.codex-request-actions/);
    assert.match(css, /\.codex-permission-pill/);
    assert.match(css, /\.codex-modal-layer/);
    assert.match(css, /\.codex-modal-card\s*\{[\s\S]*max-height:\s*min\(78vh,\s*680px\)/);
    assert.match(css, /\.codex-modal-card\s*\{[\s\S]*overflow:\s*auto/);
    assert.match(css, /\.codex-context-grid/);
    assert.match(css, /#codex-plan-workflow/);
    assert.match(css, /#codex-plan-workflow-actions/);
});

test('codex message appends target the inner log stack instead of the scroll container root', () => {
    const js = readPublicFile('terminal_client.js');

    assert.match(js, /const codexLogStack = document\.getElementById\('codex-log-stack'\);/);
    assert.match(js, /const btnCodexPermissionPreset = document\.getElementById\('btn-codex-permission-preset'\);/);
    assert.match(js, /const codexCommandApprovalModal = document\.getElementById\('codex-command-approval-modal'\);/);
    assert.match(js, /function getCodexLogContainer\(\)\s*\{\s*return codexLogStack \|\| codexLog;/);
    assert.match(js, /const logContainer = getCodexLogContainer\(\);[\s\S]*logContainer\.appendChild\(entry\);/);
    assert.match(js, /const logContainer = getCodexLogContainer\(\);[\s\S]*logContainer\.innerHTML = '';/);
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

    // renderCodexSettingsPanel must set hidden when secondaryPanel !== 'settings'
    assert.match(js, /codexSettingsPanel\.hidden\s*=\s*!\(.*syncCodexSecondaryPanelState\(\)\s*===\s*['"]settings['"]\)/,
        'renderCodexSettingsPanel must set hidden=true when secondaryPanel !== "settings"');

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
    assert.match(js, /finalizePendingTurnStateOnSuccess\(\)/);
    assert.match(js, /restorePendingTurnStateOnFailure\(\)/);
    assert.match(js, /clearActiveSkill:\s*!!interactionState\.activeSkill/);
    assert.match(js, /activeSkill:\s*pending\.clearActiveSkill === true \? null : codexState\.interactionState\.activeSkill/);
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
    assert.match(js, /function normalizeEffectiveCodexConfig\(payload\)/);
    assert.match(js, /const baseConfig = codexState\.serverNextTurnConfigBase/);
    assert.match(js, /model:\s*codexState\.nextTurnOverrides\.model \|\| baseConfig\.model \|\| null/);
    assert.match(js, /reasoningEffort:\s*codexState\.nextTurnOverrides\.reasoningEffort \|\| baseConfig\.reasoningEffort \|\| null/);
    assert.match(js, /codexState\.serverNextTurnConfigBase = normalizeEffectiveCodexConfig\(envelope\.nextTurnEffectiveCodexConfig\)/);
    assert.match(js, /codexState\.nextTurnEffectiveCodexConfig = buildLocalNextTurnEffectiveCodexConfig\(\)/);
    assert.match(js, /codexState\.serverNextTurnConfigBase = null[\s\S]*syncCodexSettingsFormFromStoredConfig\(\)[\s\S]*syncNextTurnEffectiveCodexConfig\(\)/);
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
    assert.match(js, /sendCodexBridgeRequest\('skills\/list', \{\}\)/);
    assert.match(js, /codexInput\.value = '\/skill '/);
    assert.match(js, /const items = isSkillQuery\s*\?\s*\[\]/);
    assert.match(js, /codexSlashMenuEmpty\.hidden = isSkillQuery \? skillItems\.length > 0/);
    assert.match(js, /function applyCodexSkillSelection\(skillEntry\)/);
    assert.match(js, /sendCodexBridgeRequest\('thread\/compact\/start', \{ threadId \}, \{ suppressErrorUi: true \}\)/);
    assert.match(js, /if \(method === 'thread\/compacted'\)/);
    assert.match(js, /setCodexCompactStatus\('当前线程已完成压缩。', 'success'\)/);
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
    assert.match(js, /function renderCodexThreadContextPanel\(\)/);
    assert.match(js, /function applyCodexPermissionPresetSelection\(preset\)/);
    assert.doesNotMatch(js, /\['low', 'medium', 'high', 'xhigh'\]/);
    assert.doesNotMatch(js, /selectedValue && !optionValues\.includes\(selectedValue\)/);
    assert.match(slashJs, /command:\s*'\/skill'[\s\S]*availability:\s*'enabled'/);
    assert.match(slashJs, /command:\s*'\/compact'[\s\S]*dispatchKind:\s*'open_panel'/);
    assert.match(slashJs, /command:\s*'\/skills'[\s\S]*dispatchKind:\s*'open_panel'/);
});
