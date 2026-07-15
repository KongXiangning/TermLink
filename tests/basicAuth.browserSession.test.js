const test = require('node:test');
const assert = require('node:assert/strict');

function loadAuthModule(env = {}) {
    const modulePath = require.resolve('../src/auth/basicAuth');
    const previous = {
        AUTH_ENABLED: process.env.AUTH_ENABLED,
        AUTH_USER: process.env.AUTH_USER,
        AUTH_PASS: process.env.AUTH_PASS
    };
    for (const key of Object.keys(previous)) {
        if (Object.prototype.hasOwnProperty.call(env, key)) {
            process.env[key] = env[key];
        } else {
            delete process.env[key];
        }
    }
    delete require.cache[modulePath];
    const authModule = require(modulePath);
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    return authModule;
}

function createReq(overrides = {}) {
    return {
        method: 'GET',
        url: '/api/sessions',
        originalUrl: '/api/sessions',
        path: '/api/sessions',
        headers: {},
        socket: {},
        body: {},
        ...overrides
    };
}

function createRes() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        redirectTarget: undefined,
        set(name, value) {
            this.headers[name.toLowerCase()] = value;
            return this;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(body) {
            this.body = body;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        redirect(code, target) {
            this.statusCode = code;
            this.redirectTarget = target;
            return this;
        }
    };
}

function runMiddleware(middleware, req) {
    const res = createRes();
    let nextCalled = false;
    middleware(req, res, () => {
        nextCalled = true;
    });
    return { res, nextCalled };
}

test('browser session uses opaque server-side tokens with expiry and revocation', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const sessions = authModule._browserSession;
    sessions.clear();

    const token = sessions.issue(1_000);
    assert.match(token, /^[A-Za-z0-9_-]{40,}$/);
    assert.equal(sessions.validate(token, 1_001), true);
    assert.equal(sessions.validate(`${token}tampered`, 1_002), false);
    assert.equal(sessions.revoke(token), true);
    assert.equal(sessions.validate(token, 1_003), false);

    const idleToken = sessions.issue(5_000);
    assert.equal(sessions.validate(idleToken, 5_000 + 30 * 60 * 1000 + 1), false);
});

test('login sets hardened host cookie and never returns the token', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    authModule._browserSession.clear();
    const req = createReq({
        method: 'POST',
        path: '/api/auth/login',
        url: '/api/auth/login',
        body: { username: 'owner', password: 'secret', next: '/terminal.html?sessionId=abc' }, // sensitive-scan:allow; synthetic test credential
        connectionSecurity: { tls: true }
    });
    const res = createRes();

    authModule.loginHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        ok: true,
        authenticated: true,
        next: '/terminal.html?sessionId=abc'
    });
    const cookie = res.headers['set-cookie'];
    assert.match(cookie, /^tl_sid=[A-Za-z0-9_-]+;/);
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Secure/);
    assert.doesNotMatch(JSON.stringify(res.body), /tl_sid|secret/i);
});

test('invalid login is JSON 401 without a Basic challenge or session cookie', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const req = createReq({
        method: 'POST',
        path: '/api/auth/login',
        body: { username: 'owner', password: 'wrong' } // sensitive-scan:allow; synthetic invalid credential
    });
    const res = createRes();

    authModule.loginHandler(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { ok: false, code: 'INVALID_CREDENTIALS' });
    assert.equal(res.headers['www-authenticate'], undefined);
    assert.equal(res.headers['set-cookie'], undefined);
});

test('middleware preserves Basic and API challenge while redirecting only HTML navigation', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const encoded = Buffer.from('owner:secret').toString('base64');

    const basic = runMiddleware(authModule, createReq({
        headers: { authorization: `Basic ${encoded}` }
    }));
    assert.equal(basic.nextCalled, true);

    const api = runMiddleware(authModule, createReq());
    assert.equal(api.nextCalled, false);
    assert.equal(api.res.statusCode, 401);
    assert.equal(api.res.headers['www-authenticate'], 'Basic realm="TermLink"');

    const apiNavigation = runMiddleware(authModule, createReq({
        method: 'GET',
        url: '/api/health',
        originalUrl: '/api/health',
        path: '/api/health',
        headers: { accept: 'text/html', 'sec-fetch-dest': 'document' }
    }));
    assert.equal(apiNavigation.res.statusCode, 401);
    assert.equal(apiNavigation.res.headers['www-authenticate'], 'Basic realm="TermLink"');
    assert.equal(apiNavigation.res.redirectTarget, undefined);

    const html = runMiddleware(authModule, createReq({
        method: 'GET',
        url: '/terminal.html?sessionId=abc',
        originalUrl: '/terminal.html?sessionId=abc',
        path: '/terminal.html',
        headers: { accept: 'text/html', 'sec-fetch-dest': 'document' }
    }));
    assert.equal(html.res.statusCode, 302);
    assert.equal(html.res.redirectTarget, '/login.html?next=%2Fterminal.html%3FsessionId%3Dabc');
});

test('pre-auth allowlist is exact and cookie session authorizes protected requests', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const allowed = runMiddleware(authModule, createReq({ path: '/login.js', url: '/login.js' }));
    assert.equal(allowed.nextCalled, true);
    for (const assetPath of ['/ui-foundation.css', '/i18n/i18n.js', '/i18n/en.json', '/i18n/zh-CN.json']) {
        const asset = runMiddleware(authModule, createReq({ path: assetPath, url: assetPath }));
        assert.equal(asset.nextCalled, true, `${assetPath} should be available to the login page`);
    }

    const prefixConfusion = runMiddleware(authModule, createReq({ path: '/login.js/private', url: '/login.js/private' }));
    assert.equal(prefixConfusion.res.statusCode, 401);
    const i18nPrefixConfusion = runMiddleware(authModule, createReq({ path: '/i18n/en.json/private', url: '/i18n/en.json/private' }));
    assert.equal(i18nPrefixConfusion.res.statusCode, 401);
    const foundationPrefixConfusion = runMiddleware(authModule, createReq({ path: '/ui-foundation.css/private', url: '/ui-foundation.css/private' }));
    assert.equal(foundationPrefixConfusion.res.statusCode, 401);

    const token = authModule._browserSession.issue();
    const cookieRequest = runMiddleware(authModule, createReq({
        headers: { cookie: `${authModule._browserSession.cookieName}=${encodeURIComponent(token)}` }
    }));
    assert.equal(cookieRequest.nextCalled, true);
});

test('cookie-authenticated browser flow preserves single-use WebSocket tickets', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const token = authModule._browserSession.issue();
    const authenticated = runMiddleware(authModule, createReq({
        headers: { cookie: `tl_sid=${encodeURIComponent(token)}` }
    }));
    assert.equal(authenticated.nextCalled, true);

    const ticket = authModule.issueWsTicket();
    const upgradeRequest = {
        url: `/?ticket=${encodeURIComponent(ticket)}`,
        headers: { host: 'localhost:3000' }
    };
    assert.equal(authModule.verifyWsUpgrade(upgradeRequest), true);
    assert.equal(upgradeRequest.user, 'owner');
    assert.equal(authModule.verifyWsUpgrade({
        url: `/?ticket=${encodeURIComponent(ticket)}`,
        headers: { host: 'localhost:3000' }
    }), false);
});

test('logout revokes the current browser session and clears the cookie', () => {
    const authModule = loadAuthModule({ AUTH_USER: 'owner', AUTH_PASS: 'secret' });
    const token = authModule._browserSession.issue();
    const req = createReq({
        method: 'POST',
        path: '/api/auth/logout',
        headers: { cookie: `tl_sid=${encodeURIComponent(token)}` }
    });
    const res = createRes();

    authModule.logoutHandler(req, res);

    assert.deepEqual(res.body, { ok: true });
    assert.match(res.headers['set-cookie'], /Max-Age=0/);
    assert.equal(authModule._browserSession.validate(token), false);
});

test('safe next rejects external, protocol-relative, and login-loop targets', () => {
    const authModule = loadAuthModule();
    const sanitize = authModule._browserSession.sanitizeNextPath;
    assert.equal(sanitize('/workspace.html?sessionId=abc#file'), '/workspace.html?sessionId=abc#file');
    assert.equal(sanitize('https://evil.example/'), '/terminal.html');
    assert.equal(sanitize('//evil.example/'), '/terminal.html');
    assert.equal(sanitize('/login.html?next=/login.html'), '/terminal.html');
});

test('AUTH_ENABLED=false preserves bypass and login compatibility', () => {
    const authModule = loadAuthModule({ AUTH_ENABLED: 'false' });
    const bypass = runMiddleware(authModule, createReq());
    assert.equal(bypass.nextCalled, true);

    const res = createRes();
    authModule.loginHandler(createReq({
        method: 'POST',
        path: '/api/auth/login',
        body: { next: '/workspace.html' }
    }), res);
    assert.deepEqual(res.body, { ok: true, authenticated: true, next: '/workspace.html' });
    assert.equal(res.headers['set-cookie'], undefined);
});
