const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FOUNDATION_CSS = fs.readFileSync(path.join(PUBLIC_DIR, 'ui-foundation.css'), 'utf8');

const PAGE_STYLES = {
    'login.html': '/login.css',
    'terminal.html': 'terminal.css?v=7',
    'terminal_client.html': 'terminal_client.css?v=74',
    'codex_client.html': 'terminal_client.css?v=91',
    'codex_ipc.html': 'codex_ipc.css?v=2',
    'workspace.html': 'workspace.css?v=3'
};

test('shared foundation exposes the agreed visual and interaction tokens', () => {
    for (const token of [
        '--tl-font-sans',
        '--tl-font-mono',
        '--tl-bg-canvas',
        '--tl-bg-surface',
        '--tl-text-primary',
        '--tl-text-muted',
        '--tl-accent',
        '--tl-danger',
        '--tl-focus',
        '--tl-touch-target',
        '--tl-radius-md'
    ]) {
        assert.match(FOUNDATION_CSS, new RegExp(`${token.replaceAll('-', '\\-')}\\s*:`), `missing ${token}`);
    }
    assert.match(FOUNDATION_CSS, /--tl-text-dim:\s*#7f8da1/);
});

test('shared primitives cover controls, fields, status, dialogs and empty states', () => {
    for (const selector of ['.tl-button', '.tl-field', '.tl-status', '.tl-dialog-backdrop', '.tl-dialog', '.tl-empty', '.tl-sr-only']) {
        assert.ok(FOUNDATION_CSS.includes(selector), `missing ${selector}`);
    }
    assert.match(FOUNDATION_CSS, /:focus-visible/);
    assert.match(FOUNDATION_CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(FOUNDATION_CSS, /@media \(max-width: 640px\)/);
    assert.doesNotMatch(FOUNDATION_CSS, /outline:\s*none/);
    assert.doesNotMatch(FOUNDATION_CSS, /color-scheme\s*:/, 'shared styles must not override the existing light theme');
});

test('foundation is loaded before page styles so existing shells retain ownership', () => {
    for (const [fileName, pageStyle] of Object.entries(PAGE_STYLES)) {
        const html = fs.readFileSync(path.join(PUBLIC_DIR, fileName), 'utf8');
        const document = new JSDOM(html).window.document;
        const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'));
        const foundationIndex = styles.indexOf(fileName === 'login.html' ? '/ui-foundation.css?v=2' : 'ui-foundation.css?v=2');
        const pageStyleIndex = styles.indexOf(pageStyle);
        assert.ok(foundationIndex >= 0, `${fileName} does not load the foundation`);
        assert.ok(pageStyleIndex > foundationIndex, `${fileName} page stylesheet must follow the foundation`);
    }
});

test('login aliases its visual system to shared tokens without changing its shell contract', () => {
    const loginCss = fs.readFileSync(path.join(PUBLIC_DIR, 'login.css'), 'utf8');
    const loginHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'login.html'), 'utf8');
    assert.match(loginCss, /--login-bg:\s*var\(--tl-bg-canvas\)/);
    assert.match(loginCss, /--login-accent:\s*var\(--tl-accent\)/);
    assert.match(loginCss, /font-family:\s*var\(--tl-font-sans\)/);
    assert.match(loginCss, /color-scheme:\s*dark/);

    const document = new JSDOM(loginHtml).window.document;
    assert.ok(document.querySelector('.login-shell'));
    assert.ok(document.getElementById('login-form'));
});

test('key workspace and terminal anchors remain present after foundation wiring', () => {
    const expectations = {
        'terminal.html': ['app-container', 'main-content', 'terminal-container'],
        'terminal_client.html': ['terminal-shell', 'terminal-main', 'toolbar'],
        'codex_client.html': ['terminal-shell', 'codex-panel', 'codex-status-strip'],
        'codex_ipc.html': ['ipc-surface', 'ws-status', 'ipc-status'],
        'workspace.html': ['workspace-title', 'browser-list', 'viewer-body']
    };

    for (const [fileName, ids] of Object.entries(expectations)) {
        const html = fs.readFileSync(path.join(PUBLIC_DIR, fileName), 'utf8');
        const document = new JSDOM(html).window.document;
        for (const id of ids) assert.ok(document.getElementById(id), `${fileName} missing #${id}`);
    }
});
