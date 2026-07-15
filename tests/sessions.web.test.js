const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SESSIONS_JS = fs.readFileSync(path.join(PUBLIC_DIR, 'sessions.js'), 'utf8');
const SESSIONS_CSS = fs.readFileSync(path.join(PUBLIC_DIR, 'sessions.css'), 'utf8');
const TERMINAL_CSS = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');
const TERMINAL_HTML = fs.readFileSync(path.join(PUBLIC_DIR, 'terminal.html'), 'utf8');
const TERMINAL_JS = fs.readFileSync(path.join(PUBLIC_DIR, 'terminal.js'), 'utf8');
const EN = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'i18n', 'en.json'), 'utf8'));
const ZH = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'i18n', 'zh-CN.json'), 'utf8'));

function response(payload, ok = true, status = ok ? 200 : 500) {
    return {
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        async json() { return payload; }
    };
}

async function flushUi(turns = 5) {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

function translate(key, params) {
    let value = EN[key] || key;
    for (const [name, replacement] of Object.entries(params || {})) {
        value = value.replaceAll(`{${name}}`, replacement);
    }
    return value;
}

function createSessionsApp(fetchImpl, options = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <header class="ipc-status-bar"></header>
        <button id="btn-new-session" type="button">New session</button>
        <ul id="session-list"></ul>
        <div id="terminal-view"></div>
        <div id="codex-view"></div>
    </body></html>`, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: options.url || 'https://example.test/terminal.html'
    });
    const { window } = dom;
    const calls = [];
    const switched = [];
    if (options.embedded !== false) window.__CODEX_EMBEDDED = true;
    window.requestAnimationFrame = (callback) => callback();
    window.i18n = { t: translate };
    window.t = translate;
    window.switchSession = (id) => switched.push(id);
    if (options.baseUrl) window.getBaseUrl = () => options.baseUrl;
    window.fetch = async (url, init = {}) => {
        const call = { url: String(url), init };
        calls.push(call);
        return fetchImpl ? fetchImpl(call) : response([]);
    };
    window.eval(SESSIONS_JS);
    return {
        window,
        document: window.document,
        calls,
        switched,
        cleanup() { window.close(); }
    };
}

function createTerminalConfigApp() {
    const dom = new JSDOM(TERMINAL_HTML, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'https://example.test/terminal.html'
    });
    const { window } = dom;
    const calls = [];
    const sockets = [];
    let terminalInstance = null;
    class FakeTerminal {
        constructor() {
            this.cols = 80;
            this.rows = 24;
            this.textarea = window.document.createElement('textarea');
            this.focusCount = 0;
            terminalInstance = this;
        }
        loadAddon() {}
        open() {}
        focus() { this.focusCount += 1; }
        blur() {}
        write() {}
        reset() {}
        scrollLines() {}
        scrollToBottom() {}
        scrollToTop() {}
        onData() {}
    }
    class FakeFitAddon {
        fit() {}
        proposeDimensions() { return { cols: 80, rows: 24 }; }
    }
    class FakeWebSocket {
        static OPEN = 1;
        constructor(url) {
            this.url = url;
            this.readyState = 0;
            this.sent = [];
            this.closeCount = 0;
            sockets.push(this);
        }
        close() { this.readyState = 3; this.closeCount += 1; }
        send(payload) { this.sent.push(payload); }
    }
    window.Terminal = FakeTerminal;
    window.FitAddon = { FitAddon: FakeFitAddon };
    window.WebSocket = FakeWebSocket;
    window.requestAnimationFrame = (callback) => callback();
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.i18n = { init: async () => {}, translatePage() {}, t: translate };
    window.t = translate;
    window.fetch = async (url, init = {}) => {
        calls.push({ url: String(url), init });
        if (String(url).endsWith('/api/ws-ticket')) return response({ ticket: 'ticket' });
        if (String(url).endsWith('/api/sessions')) return response([]);
        return response({});
    };
    window.console = { ...console, warn() {} };
    window.eval(TERMINAL_JS);
    return {
        window,
        document: window.document,
        calls,
        sockets,
        get terminal() { return terminalInstance; },
        cleanup() { window.close(); }
    };
}

test('terminal configuration uses semantic dialogs, explicit labels and no inline form layout', () => {
    const dom = new JSDOM(TERMINAL_HTML);
    const document = dom.window.document;
    const serverModal = document.getElementById('server-manager-modal');
    const serverDialog = serverModal.querySelector('[role="dialog"]');
    const confirmDialog = document.querySelector('#confirm-modal [role="alertdialog"]');

    assert.equal(serverDialog.getAttribute('aria-modal'), 'true');
    assert.equal(serverDialog.getAttribute('aria-labelledby'), 'server-manager-title');
    assert.equal(confirmDialog.getAttribute('aria-describedby'), 'confirm-modal-message');
    assert.ok(document.querySelector('label[for="new-server-name"]'));
    assert.ok(document.querySelector('label[for="new-server-url"]'));
    assert.equal(document.getElementById('new-server-url').type, 'url');
    assert.equal(document.getElementById('add-server-form').hasAttribute('novalidate'), true);
    assert.equal(serverModal.querySelectorAll('[style]').length, 0);
    assert.equal(document.getElementById('new-session-modal'), null, 'obsolete duplicate session modal should be removed');
    dom.window.close();
});

test('server configuration code validates URLs, restores dialog focus and avoids HTML interpolation', () => {
    assert.match(TERMINAL_JS, /new URL\(url\)/);
    assert.match(TERMINAL_JS, /\['http:', 'https:'\]\.includes\(parsed\.protocol\)/);
    assert.match(TERMINAL_JS, /function requestConfirmation/);
    assert.match(TERMINAL_JS, /function openDialogModal/);
    assert.match(TERMINAL_JS, /openDialogModal\(serverManagerModal, inputNewServerName, e\.currentTarget\)/);
    assert.match(TERMINAL_JS, /function resetConnectionForServerChange/);
    assert.match(TERMINAL_JS, /ws\.onclose = null;[\s\S]*ws\.close\(\);[\s\S]*ws = null;/);
    assert.match(TERMINAL_JS, /restoreTarget\.focus\(\)/);
    assert.doesNotMatch(TERMINAL_JS, /confirm\(/);
    assert.doesNotMatch(TERMINAL_JS, /\$\{server\.name\}/);
    assert.doesNotMatch(TERMINAL_JS, /\$\{server\.url\}/);
});

test('server profile form shows inline errors and uses a named confirmation dialog', async (t) => {
    const app = createTerminalConfigApp();
    t.after(() => app.cleanup());
    await flushUi();

    const opener = app.document.getElementById('btn-server-manager');
    opener.focus();
    opener.click();
    const serverModal = app.document.getElementById('server-manager-modal');
    assert.equal(serverModal.classList.contains('open'), true);
    assert.equal(serverModal.getAttribute('aria-hidden'), 'false');

    const form = app.document.getElementById('add-server-form');
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(app.document.getElementById('new-server-name').getAttribute('aria-invalid'), 'true');
    assert.equal(app.document.getElementById('server-form-status').textContent, EN['terminal.error.nameUrlRequired']);

    app.document.getElementById('new-server-name').value = 'Remote <unsafe>';
    app.document.getElementById('new-server-url').value = 'javascript:alert(1)';
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(app.document.getElementById('new-server-url').getAttribute('aria-invalid'), 'true');
    assert.equal(app.document.getElementById('server-list').textContent.includes('<unsafe>'), false);

    app.document.getElementById('new-server-url').value = 'https://owner:secret@remote.example'; // sensitive-scan:allow; synthetic rejection example
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(app.document.getElementById('new-server-url').getAttribute('aria-invalid'), 'true');
    assert.equal(app.document.getElementById('server-form-status').textContent, EN['terminal.error.serverUrlCredentials']);
    assert.doesNotMatch(app.window.localStorage.getItem('termLinkServerState'), /owner|secret/);
    assert.equal(app.document.querySelectorAll('.server-item').length, 1);

    app.document.getElementById('new-server-url').value = 'remote.example:3443';
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    const rows = app.document.querySelectorAll('.server-item');
    assert.equal(rows.length, 2);
    assert.equal(rows[1].querySelector('.server-name').textContent, 'Remote <unsafe>');
    assert.equal(rows[1].querySelector('.server-url').textContent, 'http://remote.example:3443');

    rows[1].querySelector('.btn-delete').click();
    const confirmModal = app.document.getElementById('confirm-modal');
    assert.equal(confirmModal.classList.contains('open'), true);
    assert.equal(serverModal.getAttribute('aria-hidden'), 'true', 'underlying dialog should be hidden from assistive tech');
    assert.match(app.document.getElementById('confirm-modal-message').textContent, /Remote <unsafe>/);

    app.document.getElementById('confirm-modal-cancel').click();
    assert.equal(confirmModal.classList.contains('open'), false);
    assert.equal(serverModal.getAttribute('aria-hidden'), 'false');
    assert.equal(app.document.querySelectorAll('.server-item').length, 2);

    rows[1].querySelector('.btn-connect').click();
    opener.click();
    const activeRemoteRow = [...app.document.querySelectorAll('.server-item')]
        .find((row) => row.querySelector('.server-name').textContent === 'Remote <unsafe>');
    activeRemoteRow.querySelector('.btn-delete').click();
    app.document.getElementById('confirm-modal-accept').click();
    await flushUi();

    const savedState = JSON.parse(app.window.localStorage.getItem('termLinkServerState'));
    assert.equal(savedState.servers.length, 1);
    assert.equal(savedState.servers[0].name, 'Localhost');
    assert.equal(savedState.activeServerId, savedState.servers[0].id);
    assert.equal(app.window.localStorage.getItem('lastSessionId'), null);
});

test('new-session dialog exposes accessible mode, folder and recovery controls', async (t) => {
    const app = createSessionsApp(() => response([]));
    t.after(() => app.cleanup());
    await flushUi();

    const opener = app.document.getElementById('btn-new-session');
    opener.focus();
    opener.click();
    const overlay = app.document.getElementById('sessions-new-modal');
    const dialog = overlay.querySelector('[role="dialog"]');

    assert.equal(overlay.getAttribute('aria-hidden'), 'false');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.ok(overlay.querySelector('label[for="snew-name"]'));
    assert.ok(overlay.querySelector('label[for="snew-cwd"]'));
    assert.equal(overlay.querySelector('[data-mode="codex"]').getAttribute('aria-checked'), 'true');
    assert.equal(app.document.activeElement.id, 'snew-name');
    assert.equal(overlay.querySelectorAll('[style]').length, 0);

    overlay.querySelector('#snew-form').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushUi();
    assert.equal(overlay.querySelector('#snew-cwd').getAttribute('aria-invalid'), 'true');
    assert.equal(overlay.querySelector('#snew-status').textContent, EN['sessions.new.cwdRequired']);
    assert.equal(app.calls.filter((call) => call.init.method === 'POST').length, 0);

    overlay.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(overlay.getAttribute('aria-hidden'), 'true');
    assert.equal(app.document.activeElement, opener);
});

test('terminal session creation submits once and switches the live shell without reload', async (t) => {
    const app = createSessionsApp((call) => {
        if (call.url === '/api/sessions' && call.init.method === 'POST') return response({ id: 'session-new' });
        return response([]);
    });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('btn-new-session').click();
    const overlay = app.document.getElementById('sessions-new-modal');
    overlay.querySelector('[data-mode="terminal"]').click();
    overlay.querySelector('#snew-name').value = 'Build shell';
    overlay.querySelector('#snew-form').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushUi();

    const posts = app.calls.filter((call) => call.init.method === 'POST');
    assert.equal(posts.length, 1);
    assert.deepEqual(JSON.parse(posts[0].init.body), { name: 'Build shell', sessionMode: 'terminal' });
    assert.deepEqual(app.switched, ['session-new']);
    assert.equal(overlay.getAttribute('aria-hidden'), 'true');
    assert.equal(overlay.querySelector('#snew-form').getAttribute('aria-busy'), 'false');
});

test('session APIs follow the active server profile when the terminal shell provides one', async (t) => {
    const app = createSessionsApp((call) => {
        if (call.url === 'https://remote.example:3443/api/sessions' && call.init.method === 'POST') {
            return response({ id: 'remote-session' });
        }
        return response([]);
    }, { baseUrl: 'https://remote.example:3443' });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('btn-new-session').click();
    const overlay = app.document.getElementById('sessions-new-modal');
    overlay.querySelector('[data-mode="terminal"]').click();
    overlay.querySelector('#snew-form').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushUi();

    assert.ok(app.calls.some((call) => call.url === 'https://remote.example:3443/api/sessions' && call.init.method === 'POST'));
    assert.deepEqual(app.switched, ['remote-session']);
});

test('folder picker reports loading state and navigates directly into selected folders', async (t) => {
    const app = createSessionsApp((call) => {
        if (call.url === '/api/workspace/picker/tree') {
            return response({ entries: [{ name: 'repo', path: '/repo' }] });
        }
        if (call.url === '/api/workspace/picker/tree?path=%2Frepo') {
            return response({ parentPath: '/', entries: [] });
        }
        return response([]);
    });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('btn-new-session').click();
    const overlay = app.document.getElementById('sessions-new-modal');
    const browse = overlay.querySelector('#snew-browse');
    browse.click();
    assert.equal(browse.getAttribute('aria-expanded'), 'true');
    await flushUi();

    const folder = overlay.querySelector('.sessions-picker-item:not(.sessions-picker-parent)');
    assert.ok(folder);
    folder.click();
    await flushUi();

    assert.equal(overlay.querySelector('#snew-cwd').value, '/repo');
    assert.ok(app.calls.some((call) => call.url === '/api/workspace/picker/tree?path=%2Frepo'));
    assert.equal(browse.hasAttribute('aria-busy'), false);
});

test('folder picker explains missing server configuration and preserves manual cwd input', async (t) => {
    const app = createSessionsApp((call) => {
        if (call.url.startsWith('/api/workspace/picker/tree')) {
            return response({
                error: {
                    code: 'WORKSPACE_PICKER_ROOT_NOT_CONFIGURED',
                    message: 'Workspace picker root is not configured on the server.'
                }
            }, false);
        }
        return response([]);
    });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('btn-new-session').click();
    const overlay = app.document.getElementById('sessions-new-modal');
    const cwd = overlay.querySelector('#snew-cwd');
    const browse = overlay.querySelector('#snew-browse');
    cwd.value = '/manually/entered/project';
    browse.click();
    await flushUi();

    assert.equal(overlay.querySelector('.sessions-picker-state').textContent, EN['sessions.new.pickerNotConfigured']);
    assert.equal(cwd.value, '/manually/entered/project');
    assert.equal(browse.disabled, false);
    assert.equal(browse.hasAttribute('aria-busy'), false);
});

test('folder picker distinguishes an unavailable configured root from generic failures', async (t) => {
    const app = createSessionsApp((call) => {
        if (call.url === '/api/workspace/picker/tree') {
            return response({
                error: {
                    code: 'WORKSPACE_PICKER_ROOT_INVALID',
                    message: 'Workspace picker root is not available.'
                }
            }, false);
        }
        return response([]);
    });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('btn-new-session').click();
    const overlay = app.document.getElementById('sessions-new-modal');
    overlay.querySelector('#snew-browse').click();
    await flushUi();

    assert.equal(overlay.querySelector('.sessions-picker-state').textContent, EN['sessions.new.pickerUnavailable']);
});

test('standalone Codex drawer is hidden from focus until opened and closes with Escape', async (t) => {
    const app = createSessionsApp(() => response([
        { id: 'codex-1', name: 'Review', sessionMode: 'codex' }
    ]), { embedded: false, url: 'https://example.test/codex_ipc.html' });
    t.after(() => app.cleanup());
    await flushUi();

    const toggle = app.document.getElementById('codex-drawer-toggle');
    const drawer = app.document.getElementById('codex-drawer');
    assert.ok(toggle);
    assert.equal(drawer.hidden, true);
    assert.equal(drawer.getAttribute('aria-hidden'), 'true');
    assert.equal(drawer.querySelectorAll('[style]').length, 0);

    toggle.click();
    await flushUi();
    assert.equal(drawer.hidden, false);
    assert.equal(drawer.getAttribute('aria-hidden'), 'false');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(drawer.querySelectorAll('.sessions-drawer-row').length, 1);

    drawer.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(drawer.hidden, true);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(app.document.activeElement, toggle);
});

test('session UX stylesheet includes touch, focus, narrow-screen and reduced-motion rules', () => {
    assert.match(SESSIONS_CSS, /--tl-touch-target/);
    assert.match(SESSIONS_CSS, /:focus-visible/);
    assert.match(SESSIONS_CSS, /@media \(max-width: 640px\)/);
    assert.match(SESSIONS_CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(SESSIONS_CSS, /\.sessions-drawer-backdrop/);
    assert.doesNotMatch(SESSIONS_CSS, /outline:\s*none/);
});

test('new session and drawer translations remain complete in English and Chinese', () => {
    const keys = Object.keys(EN).filter((key) => key.startsWith('sessions.') || key.startsWith('terminal.confirm.') || key.startsWith('terminal.server.'));
    assert.ok(keys.length >= 30);
    for (const key of keys) {
        assert.equal(typeof ZH[key], 'string', `missing zh-CN key ${key}`);
        assert.ok(ZH[key].trim(), `empty zh-CN key ${key}`);
    }
});

test('terminal workspace exposes persistent context, compact actions and an inert navigation drawer', () => {
    const dom = new JSDOM(TERMINAL_HTML);
    const document = dom.window.document;
    const status = document.getElementById('terminal-connection-status');
    const sidebar = document.getElementById('sidebar');
    const toolbar = document.getElementById('toolbar');

    assert.equal(status.getAttribute('role'), 'status');
    assert.equal(status.getAttribute('aria-live'), 'polite');
    assert.ok(document.getElementById('terminal-session-label'));
    assert.ok(document.getElementById('btn-fit-terminal'));
    assert.ok(document.getElementById('btn-reconnect-terminal'));
    assert.equal(document.getElementById('btn-fullscreen-terminal').getAttribute('aria-pressed'), 'false');
    assert.equal(sidebar.getAttribute('aria-hidden'), 'true');
    assert.equal(sidebar.hasAttribute('inert'), true);
    assert.equal(document.getElementById('sidebar-backdrop').hidden, true);
    assert.equal(toolbar.getAttribute('role'), 'toolbar');
    assert.equal(document.querySelectorAll('#toolbar [style]').length, 0);
});

test('terminal navigation drawer traps focus, closes with Escape and restores the menu trigger', async (t) => {
    const app = createTerminalConfigApp();
    t.after(() => app.cleanup());
    await flushUi();

    const menu = app.document.getElementById('btn-menu');
    const sidebar = app.document.getElementById('sidebar');
    const backdrop = app.document.getElementById('sidebar-backdrop');
    menu.click();

    assert.equal(sidebar.classList.contains('open'), true);
    assert.equal(sidebar.getAttribute('aria-hidden'), 'false');
    assert.equal(sidebar.hasAttribute('inert'), false);
    assert.equal(backdrop.hidden, false);
    assert.equal(menu.getAttribute('aria-expanded'), 'true');

    app.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(sidebar.classList.contains('open'), false);
    assert.equal(sidebar.getAttribute('aria-hidden'), 'true');
    assert.equal(backdrop.hidden, true);
    assert.equal(menu.getAttribute('aria-expanded'), 'false');
    assert.equal(app.document.activeElement, menu);
});

test('terminal persistent status follows connect, session-info and reconnect transitions', async (t) => {
    const app = createTerminalConfigApp();
    t.after(() => app.cleanup());
    await flushUi();

    const socket = app.sockets[0];
    assert.ok(socket);
    assert.equal(app.document.getElementById('terminal-connection-status').dataset.state, 'connecting');

    socket.readyState = app.window.WebSocket.OPEN;
    socket.onopen();
    await flushUi();
    assert.equal(app.document.getElementById('terminal-connection-status').dataset.state, 'connected');

    socket.onmessage({ data: JSON.stringify({ type: 'session_info', sessionId: 'session-1', name: 'Build shell' }) });
    await flushUi();
    assert.equal(app.document.getElementById('terminal-session-label').textContent, 'Build shell');

    socket.onclose({ code: 1006, reason: '' });
    await flushUi(1);
    assert.equal(app.document.getElementById('terminal-connection-status').dataset.state, 'reconnecting');
});

test('fit action schedules terminal sizing and returns focus to xterm', async (t) => {
    const app = createTerminalConfigApp();
    t.after(() => app.cleanup());
    await flushUi();
    const before = app.terminal.focusCount;

    app.document.getElementById('btn-fit-terminal').click();

    assert.ok(app.terminal.focusCount > before);
});

test('reconnect and paste controls reuse the live transport without duplicating input', async (t) => {
    const app = createTerminalConfigApp();
    t.after(() => app.cleanup());
    await flushUi();
    const firstSocket = app.sockets[0];
    firstSocket.readyState = app.window.WebSocket.OPEN;
    firstSocket.onopen();
    await flushUi();
    app.window.navigator.clipboard = { readText: async () => 'printf ready' };

    app.document.getElementById('btn-paste').click();
    await flushUi();
    const inputMessages = firstSocket.sent.map((payload) => JSON.parse(payload)).filter((message) => message.type === 'input');
    assert.deepEqual(inputMessages, [{ type: 'input', data: 'printf ready' }]);

    app.document.getElementById('btn-reconnect-terminal').click();
    await flushUi();
    assert.equal(firstSocket.closeCount, 1);
    assert.equal(app.sockets.length, 2);
    assert.equal(app.document.getElementById('terminal-connection-status').dataset.state, 'connecting');
});

test('terminal resize and connection UI preserve the existing transport state machine', () => {
    assert.match(TERMINAL_JS, /new ResizeObserver\(\(\) => scheduleTerminalResize\(\)\)/);
    assert.match(TERMINAL_JS, /window\.addEventListener\('resize', scheduleTerminalResize\)/);
    assert.match(TERMINAL_JS, /requestAnimationFrame/);
    assert.doesNotMatch(TERMINAL_JS, /window\.addEventListener\('resize', sendResize\)/);
    assert.match(TERMINAL_JS, /setConnectionStatus\('connected', connectedMessage\)/);
    assert.match(TERMINAL_JS, /setConnectionStatus\('reconnecting'/);
    assert.match(TERMINAL_JS, /focusTerminalIfAppropriate\(\)/);
    assert.match(TERMINAL_JS, /setWorkspaceMode\('codex'\)/);
});

test('terminal workspace CSS keeps status visible and shortcuts touch-safe without motion dependency', () => {
    assert.match(TERMINAL_CSS, /\.terminal-connection-status/);
    assert.match(TERMINAL_CSS, /\[data-state="connected"\]/);
    assert.match(TERMINAL_CSS, /\.sidebar-backdrop/);
    assert.match(TERMINAL_CSS, /body\.codex-workspace-active \.terminal-action/);
    assert.match(TERMINAL_CSS, /\.btn-primary\s*\{[\s\S]*background-color:\s*var\(--tl-accent/);
    assert.match(TERMINAL_CSS, /min-width:\s*44px/);
    assert.match(TERMINAL_CSS, /overflow-x:\s*auto/);
    assert.match(TERMINAL_CSS, /@media \(min-width: 641px\)[\s\S]*\.key-row\s*\{\s*display:\s*contents/);
    assert.match(TERMINAL_CSS, /@media \(pointer: coarse\)[\s\S]*min-height:\s*44px/);
    assert.match(TERMINAL_CSS, /@media \(prefers-reduced-motion: reduce\)/);
});

test('terminal workspace translations remain complete in English and Chinese', () => {
    const keys = [
        'terminal.btn.fit',
        'terminal.btn.reconnect',
        'terminal.btn.fullscreen',
        'terminal.btn.exitFullscreen',
        'terminal.sidebar.title',
        'terminal.sidebar.close',
        'terminal.toolbar.label',
        'terminal.status.idle',
        'terminal.session.pending',
        'terminal.error.fullscreen'
    ];
    for (const key of keys) {
        assert.equal(typeof EN[key], 'string', `missing en key ${key}`);
        assert.equal(typeof ZH[key], 'string', `missing zh-CN key ${key}`);
        assert.ok(EN[key].trim() && ZH[key].trim(), `empty translation ${key}`);
    }
});
