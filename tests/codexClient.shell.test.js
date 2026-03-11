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
    assert.match(html, /id="codex-thread-summary"/);
    assert.match(html, /id="btn-codex-secondary-settings"/);
    assert.match(html, /id="btn-codex-secondary-runtime"/);
    assert.match(html, /id="btn-codex-secondary-notices"/);
    assert.match(html, /id="codex-history-panel"/);
    assert.match(html, /id="codex-settings-panel"/);
    assert.match(html, /id="codex-runtime-panel"/);
    assert.match(html, /id="codex-alerts"/);
    assert.match(html, /id="btn-codex-history-refresh"/);
    assert.match(html, /id="btn-codex-new-thread"/);
    assert.match(html, /id="btn-codex-settings-save"/);
    assert.match(html, /id="codex-actions"[\s\S]*id="btn-codex-toggle"[\s\S]*id="btn-codex-interrupt"/);
    assert.match(html, /id="codex-history-actions"[\s\S]*id="btn-codex-history-refresh"[\s\S]*id="btn-codex-new-thread"/);
    assert.match(html, /id="codex-settings-approval"[\s\S]*<option value="">服务端默认<\/option>/);
    assert.match(html, /id="codex-settings-sandbox"[\s\S]*<option value="">服务端默认<\/option>/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=35"/);
});

test('terminal client shell shares scripts but does not expose codex history panel markup', () => {
    const html = readPublicFile('terminal_client.html');

    assert.doesNotMatch(html, /id="codex-history-panel"/);
    assert.doesNotMatch(html, /id="codex-settings-panel"/);
    assert.doesNotMatch(html, /id="codex-runtime-panel"/);
    assert.match(html, /src="lib\/codex_bootstrap\.js\?v=2"/);
    assert.match(html, /src="lib\/codex_history_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_shell_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_settings_view\.js\?v=1"/);
    assert.match(html, /src="lib\/codex_runtime_view\.js\?v=4"/);
    assert.match(html, /src="lib\/codex_approval_view\.js\?v=1"/);
    assert.match(html, /src="terminal_client\.js\?v=35"/);
});

test('terminal client stylesheet supports secondary panels and sticky composer for the codex conversation page', () => {
    const css = readPublicFile('terminal_client.css');

    assert.match(css, /#codex-status-strip/);
    assert.match(css, /#codex-thread-summary/);
    assert.match(css, /\.codex-secondary-btn/);
    assert.match(css, /#codex-history-actions/);
    assert.match(css, /#codex-panel\.collapsed #codex-settings-panel/);
    assert.match(css, /#codex-panel\.collapsed #codex-runtime-panel/);
    assert.match(css, /body\.codex-only\s*\{[\s\S]*overflow-y:\s*auto/);
    assert.match(css, /body\.codex-only #terminal-shell\s*\{[\s\S]*height:\s*auto/);
    assert.match(css, /body\.codex-only #codex-panel\s*\{[\s\S]*overflow:\s*visible/);
    assert.match(css, /body\.codex-only #codex-composer\s*\{[\s\S]*position:\s*sticky/);
    assert.match(css, /body\.viewport-compact #codex-thread-summary/);
    assert.match(css, /\.codex-request-card/);
    assert.match(css, /\.codex-request-actions/);
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
    assert.match(html, /<div\s+id="codex-settings-panel"\s+[^>]*hidden/, 'codex-settings-panel must have hidden attribute');
    assert.match(html, /<div\s+id="codex-runtime-panel"\s+[^>]*hidden/, 'codex-runtime-panel must have hidden attribute');
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
