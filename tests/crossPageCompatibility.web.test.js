const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const read = (file) => fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
const CODEX_IPC_HTML = read('codex_ipc.html');
const TERMINAL_HTML = read('terminal.html');
const CODEX_IPC_CSS = read('codex_ipc.css');
const WORKSPACE_CSS = read('workspace.css');
const TERMINAL_CLIENT_CSS = read('terminal_client.css');
const SESSIONS_JS = read('sessions.js');
const EN = JSON.parse(read(path.join('i18n', 'en.json')));
const ZH = JSON.parse(read(path.join('i18n', 'zh-CN.json')));

test('standalone and embedded Codex IPC headers avoid inline layout and localize stable copy', () => {
    for (const html of [CODEX_IPC_HTML, TERMINAL_HTML]) {
        const document = new JSDOM(html).window.document;
        const statusBar = document.querySelector('.ipc-status-bar');
        assert.ok(statusBar);
        assert.equal(statusBar.querySelectorAll('[style]').length, 0);
        assert.ok(statusBar.querySelector('.ipc-session-name'));
        assert.ok(document.querySelector('[data-i18n="ipc.offline"]'));
        assert.ok(document.querySelector('[data-i18n="ipc.empty"]'));
        assert.ok(document.querySelector('[data-i18n="ipc.messagePlaceholder"]'));
    }
});

test('Codex IPC shell restores focus visibility and mobile touch sizing', () => {
    assert.doesNotMatch(CODEX_IPC_CSS, /\.ipc-follower-input\s*\{[^}]*outline:\s*none/s);
    assert.match(CODEX_IPC_CSS, /\.ipc-follower-input:focus-visible/);
    assert.match(CODEX_IPC_CSS, /\.ipc-conv-selector:focus-visible/);
    assert.match(CODEX_IPC_CSS, /@media \(max-width: 640px\)/);
    assert.match(CODEX_IPC_CSS, /min-height:\s*44px/);
    assert.match(CODEX_IPC_CSS, /safe-area-inset-bottom/);
});

test('workspace narrow layout stacks pane controls and preserves readable paths', () => {
    assert.match(WORKSPACE_CSS, /@media \(max-width: 640px\)/);
    assert.match(WORKSPACE_CSS, /\.pane-header,[\s\S]*flex-direction:\s*column/);
    assert.match(WORKSPACE_CSS, /button,[\s\S]*\.toggle[\s\S]*min-height:\s*44px/);
    assert.match(WORKSPACE_CSS, /overflow-wrap:\s*anywhere/);
    assert.doesNotMatch(WORKSPACE_CSS, /outline:\s*none/);
});

test('Codex client focus overrides remain visible after legacy focus resets', () => {
    assert.match(TERMINAL_CLIENT_CSS, /\.codex-request-freeform-input:focus-visible/);
    assert.match(TERMINAL_CLIENT_CSS, /\.codex-ghost-select:focus-visible/);
    assert.match(TERMINAL_CLIENT_CSS, /#codex-image-prompt-input:focus-visible/);
});

test('Codex IPC translations remain complete in English and Chinese', () => {
    const keys = Object.keys(EN).filter((key) => key.startsWith('ipc.'));
    assert.equal(keys.length, 11);
    for (const key of keys) {
        assert.equal(typeof ZH[key], 'string', `missing zh-CN key ${key}`);
        assert.ok(EN[key].trim() && ZH[key].trim(), `empty translation ${key}`);
    }
    assert.match(SESSIONS_JS, /window\.i18n\.translatePage\(\)/);
});
