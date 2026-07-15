const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const LOGIN_HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'), 'utf8');
const LOGIN_CSS = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.css'), 'utf8');
const LOGIN_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.js'), 'utf8');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'i18n', 'en.json'), 'utf8'));
const ZH = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'i18n', 'zh-CN.json'), 'utf8'));

function response(ok, payload, status = ok ? 200 : 500) {
    return {
        ok,
        status,
        async json() {
            return payload;
        }
    };
}

async function flushUi(turns = 5) {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

function createLoginApp(options = {}) {
    const dom = new JSDOM(LOGIN_HTML, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: options.url || 'https://example.test/login.html?next=%2Fterminal.html%3FsessionId%3Dabc'
    });
    const { window } = dom;
    const calls = [];
    const navigations = [];
    const fetchImpl = options.fetchImpl || (async (request) => {
        if (request.url === '/api/auth/session') {
            return response(true, { authenticated: false, authEnabled: true, transportSecure: true });
        }
        throw new Error(`Unexpected request ${request.url}`);
    });

    window.i18n = {
        locale: options.locale || 'en',
        async init() {},
        t(key) {
            const pack = this.locale === 'zh-CN' ? ZH : EN;
            return pack[key] || key;
        },
        translatePage() {}
    };
    window.fetch = async (url, init = {}) => {
        const request = { url: String(url), init };
        calls.push(request);
        return fetchImpl(request);
    };
    window.__TERMLINK_LOGIN_NAVIGATE__ = (target) => navigations.push(target);
    window.console = console;
    window.eval(LOGIN_JS);

    return {
        window,
        document: window.document,
        calls,
        navigations,
        cleanup() {
            window.close();
        }
    };
}

test('login shell exposes semantic, password-manager friendly controls', () => {
    const dom = new JSDOM(LOGIN_HTML);
    const document = dom.window.document;
    const form = document.getElementById('login-form');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const error = document.getElementById('login-error');

    assert.ok(form);
    assert.equal(username.autocomplete, 'username');
    assert.equal(password.autocomplete, 'current-password');
    assert.equal(username.required, true);
    assert.equal(password.required, true);
    assert.equal(document.querySelector('label[for="username"]').textContent.trim(), 'Username');
    assert.equal(document.querySelector('label[for="password"]').textContent.trim(), 'Password');
    assert.equal(error.getAttribute('role'), 'alert');
    assert.equal(document.getElementById('transport-status').getAttribute('role'), 'status');
    assert.equal(document.querySelectorAll('[style]').length, 0, 'login page should not rely on inline styles');
    dom.window.close();
});

test('login stylesheet has desktop/mobile, focus, touch, and reduced-motion states', () => {
    assert.match(LOGIN_CSS, /grid-template-columns:\s*minmax\(320px/);
    assert.match(LOGIN_CSS, /@media \(max-width: 900px\)/);
    assert.match(LOGIN_CSS, /@media \(max-width: 520px\)/);
    assert.match(LOGIN_CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(LOGIN_CSS, /:focus-visible/);
    assert.match(LOGIN_CSS, /min-height:\s*52px/);
    assert.doesNotMatch(LOGIN_CSS, /outline:\s*none/);
});

test('login submits credentials once, uses safe next, and stores no auth data in Web Storage', async (t) => {
    const app = createLoginApp({
        fetchImpl: async (request) => {
            if (request.url === '/api/auth/session') {
                return response(true, { authenticated: false, authEnabled: true, transportSecure: true });
            }
            if (request.url === '/api/auth/login') {
                return response(true, { authenticated: true, next: '/terminal.html?sessionId=abc' });
            }
            throw new Error(`Unexpected request ${request.url}`);
        }
    });
    t.after(() => app.cleanup());
    await flushUi();

    app.document.getElementById('username').value = 'owner';
    app.document.getElementById('password').value = 'secret';
    app.document.getElementById('login-form').dispatchEvent(new app.window.Event('submit', {
        bubbles: true,
        cancelable: true
    }));
    await flushUi();

    assert.equal(app.calls.length, 2);
    const loginCall = app.calls[1];
    assert.equal(loginCall.url, '/api/auth/login');
    assert.equal(loginCall.init.method, 'POST');
    assert.equal(loginCall.init.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(loginCall.init.body), {
        username: 'owner',
        password: 'secret', // sensitive-scan:allow; synthetic test credential
        next: '/terminal.html?sessionId=abc'
    });
    assert.deepEqual(app.navigations, ['/terminal.html?sessionId=abc']);
    assert.equal(app.window.localStorage.length, 0);
    assert.equal(app.window.sessionStorage.length, 0);
    assert.equal(app.document.getElementById('login-submit').disabled, false);
    assert.equal(app.document.getElementById('login-form').getAttribute('aria-busy'), 'false');
});

test('login rejects empty and invalid credentials with inline recovery state', async (t) => {
    const app = createLoginApp({
        fetchImpl: async (request) => {
            if (request.url === '/api/auth/session') {
                return response(true, { authenticated: false, authEnabled: true, transportSecure: false });
            }
            if (request.url === '/api/auth/login') {
                return response(false, { ok: false, code: 'INVALID_CREDENTIALS' }, 401);
            }
            throw new Error(`Unexpected request ${request.url}`);
        }
    });
    t.after(() => app.cleanup());
    await flushUi();

    const form = app.document.getElementById('login-form');
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushUi();
    assert.equal(app.calls.length, 1, 'empty form should not call login endpoint');
    assert.equal(app.document.getElementById('login-error').textContent, EN['login.error.required']);

    app.document.getElementById('username').value = 'owner';
    app.document.getElementById('password').value = 'wrong';
    form.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await flushUi();

    assert.equal(app.calls.length, 2);
    assert.equal(app.document.getElementById('password').value, '');
    assert.equal(app.document.getElementById('login-error').textContent, EN['login.error.invalid']);
    assert.equal(app.document.getElementById('password').getAttribute('aria-invalid'), 'true');
    assert.equal(app.document.getElementById('transport-status').classList.contains('is-insecure'), true);
    assert.equal(app.document.getElementById('transport-hint').hidden, false);
    assert.deepEqual(app.navigations, []);
});

test('login restores an existing session and prevents open redirects', async (t) => {
    const app = createLoginApp({
        url: 'https://example.test/login.html?next=https%3A%2F%2Fevil.example%2Fsteal',
        fetchImpl: async () => response(true, {
            authenticated: true,
            authEnabled: true,
            transportSecure: true
        })
    });
    t.after(() => app.cleanup());
    await flushUi();

    assert.deepEqual(app.navigations, ['/terminal.html']);
    assert.equal(app.document.getElementById('transport-status').classList.contains('is-secure'), true);
    assert.equal(app.document.getElementById('transport-hint').hidden, true);
});

test('password visibility control exposes pressed state and localized label', async (t) => {
    const app = createLoginApp();
    t.after(() => app.cleanup());
    await flushUi();

    const password = app.document.getElementById('password');
    const toggle = app.document.getElementById('toggle-password');
    toggle.click();
    assert.equal(password.type, 'text');
    assert.equal(toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(toggle.textContent, EN['login.action.hidePassword']);
    toggle.click();
    assert.equal(password.type, 'password');
    assert.equal(toggle.getAttribute('aria-pressed'), 'false');
});

test('login translation keys remain complete in English and Chinese', () => {
    const keys = Object.keys(EN).filter((key) => key.startsWith('login.'));
    assert.ok(keys.length >= 20);
    for (const key of keys) {
        assert.equal(typeof ZH[key], 'string', `missing zh-CN key ${key}`);
        assert.ok(ZH[key].trim(), `empty zh-CN key ${key}`);
    }
});
