const auth = require('basic-auth');
const crypto = require('crypto');

const BROWSER_SESSION_COOKIE = 'tl_sid';
const BROWSER_SESSION_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
const BROWSER_SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
const browserSessions = new Map();

const adminUser = {
    name: process.env.AUTH_USER || 'admin',
    pass: process.env.AUTH_PASS || 'admin'
};

// Security default: auth is ON unless explicitly disabled.
// Set AUTH_ENABLED=false for local/debug environments that do not require auth.
const isAuthEnabled = (() => {
    const raw = process.env.AUTH_ENABLED;
    if (raw === undefined) return true;
    return raw.toLowerCase() !== 'false';
})();

// ── WebSocket ticket store ─────────────────────────────
// Browser/WebView WebSocket API cannot send Authorization headers,
// so we use single-use, short-lived tickets issued via an authenticated
// HTTP endpoint and consumed during the WebSocket upgrade handshake.
const WS_TICKET_TTL_MS = 30_000; // 30 seconds
const pendingTickets = new Map();  // ticket -> { expiresAt }

function timingSafeStringEqual(actual, expected) {
    const actualBuffer = Buffer.from(String(actual || ''), 'utf8');
    const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function credentialsAreValid(user) {
    return Boolean(
        user &&
        timingSafeStringEqual(user.name, adminUser.name) &&
        timingSafeStringEqual(user.pass, adminUser.pass)
    );
}

function digestSessionToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function clearExpiredBrowserSessions(now = Date.now()) {
    for (const [digest, session] of browserSessions) {
        if (session.expiresAt <= now || session.lastSeenAt + BROWSER_SESSION_IDLE_TTL_MS <= now) {
            browserSessions.delete(digest);
        }
    }
}

function issueBrowserSession(now = Date.now()) {
    clearExpiredBrowserSessions(now);
    const token = crypto.randomBytes(32).toString('base64url');
    browserSessions.set(digestSessionToken(token), {
        createdAt: now,
        lastSeenAt: now,
        expiresAt: now + BROWSER_SESSION_ABSOLUTE_TTL_MS
    });
    return token;
}

function validateBrowserSession(token, now = Date.now()) {
    if (!token || typeof token !== 'string') return false;
    const digest = digestSessionToken(token);
    const session = browserSessions.get(digest);
    if (!session) return false;
    if (session.expiresAt <= now || session.lastSeenAt + BROWSER_SESSION_IDLE_TTL_MS <= now) {
        browserSessions.delete(digest);
        return false;
    }
    session.lastSeenAt = now;
    return true;
}

function revokeBrowserSession(token) {
    if (!token || typeof token !== 'string') return false;
    return browserSessions.delete(digestSessionToken(token));
}

function parseCookies(header) {
    if (!header || typeof header !== 'string') return {};
    return header.split(';').reduce((cookies, part) => {
        const separator = part.indexOf('=');
        if (separator < 1) return cookies;
        const key = part.slice(0, separator).trim();
        const rawValue = part.slice(separator + 1).trim();
        try {
            cookies[key] = decodeURIComponent(rawValue);
        } catch (_error) {
            cookies[key] = rawValue;
        }
        return cookies;
    }, {});
}

function getBrowserSessionToken(req) {
    const cookies = parseCookies(req && req.headers && req.headers.cookie);
    return cookies[BROWSER_SESSION_COOKIE] || '';
}

function requestUsesTls(req) {
    return Boolean(
        (req && req.connectionSecurity && req.connectionSecurity.tls === true) ||
        (req && req.secure === true) ||
        (req && req.socket && req.socket.encrypted === true)
    );
}

function buildSessionCookie(req, token, maxAgeSeconds) {
    const parts = [
        `${BROWSER_SESSION_COOKIE}=${encodeURIComponent(token || '')}`,
        'Path=/',
        `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
        'HttpOnly',
        'SameSite=Strict'
    ];
    if (requestUsesTls(req)) parts.push('Secure');
    return parts.join('; ');
}

function sanitizeNextPath(value) {
    if (typeof value !== 'string') return '/terminal.html';
    const nextPath = value.trim();
    if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return '/terminal.html';
    if (/^\/login(?:\.html)?(?:[?#]|$)/i.test(nextPath)) return '/terminal.html';
    try {
        const parsed = new URL(nextPath, 'http://termlink.local');
        if (parsed.origin !== 'http://termlink.local') return '/terminal.html';
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (_error) {
        return '/terminal.html';
    }
}

function isPreAuthPath(req) {
    const requestPath = req && (req.path || (req.url && req.url.split('?')[0]));
    return new Set([
        '/login.html',
        '/login.css',
        '/login.js',
        '/ui-foundation.css',
        '/i18n/i18n.js',
        '/i18n/en.json',
        '/i18n/zh-CN.json',
        '/api/auth/login',
        '/api/auth/session'
    ]).has(requestPath);
}

function isHtmlNavigation(req) {
    if (!req || (req.method !== 'GET' && req.method !== 'HEAD')) return false;
    const headers = req.headers || {};
    if (String(headers['sec-fetch-dest'] || '').toLowerCase() === 'document') return true;
    return String(headers.accept || '').toLowerCase().includes('text/html');
}

function isApiPath(req) {
    const requestPath = req && (req.path || (req.url && req.url.split('?')[0]));
    return requestPath === '/api' || (typeof requestPath === 'string' && requestPath.startsWith('/api/'));
}

function authenticateRequest(req) {
    if (!isAuthEnabled) return { authenticated: true, method: 'disabled', user: adminUser.name };
    const basicUser = auth(req);
    if (credentialsAreValid(basicUser)) {
        return { authenticated: true, method: 'basic', user: basicUser.name };
    }
    const sessionToken = getBrowserSessionToken(req);
    if (validateBrowserSession(sessionToken)) {
        return { authenticated: true, method: 'session', user: adminUser.name };
    }
    return { authenticated: false, method: null, user: null };
}

/**
 * Issue a one-time WebSocket authentication ticket.
 * Caller must already be authenticated (this is called behind basicAuth middleware).
 */
function issueWsTicket() {
    const ticket = crypto.randomBytes(24).toString('hex');
    pendingTickets.set(ticket, { expiresAt: Date.now() + WS_TICKET_TTL_MS });

    // Lazy cleanup: remove expired tickets
    if (pendingTickets.size > 100) {
        const now = Date.now();
        for (const [t, meta] of pendingTickets) {
            if (meta.expiresAt < now) pendingTickets.delete(t);
        }
    }
    return ticket;
}

/**
 * Consume (validate) a ticket. Returns true if valid, and removes it.
 */
function consumeWsTicket(ticket) {
    if (!ticket) return false;
    const meta = pendingTickets.get(ticket);
    if (!meta) return false;
    pendingTickets.delete(ticket);
    return meta.expiresAt >= Date.now();
}

/**
 * Express middleware — used for normal HTTP requests.
 */
function basicAuthMiddleware(req, res, next) {
    if (isPreAuthPath(req)) return next();
    const result = authenticateRequest(req);
    if (result.authenticated) {
        req.user = result.user;
        req.authMethod = result.method;
        return next();
    }

    if (!isApiPath(req) && isHtmlNavigation(req)) {
        const nextPath = sanitizeNextPath(req.originalUrl || req.url || '/terminal.html');
        return res.redirect(302, `/login.html?next=${encodeURIComponent(nextPath)}`);
    }

    res.set('WWW-Authenticate', 'Basic realm="TermLink"');
    return res.status(401).send();
}

function loginHandler(req, res) {
    res.set('Cache-Control', 'no-store');
    const nextPath = sanitizeNextPath(req.body && req.body.next);
    if (!isAuthEnabled) {
        return res.json({ ok: true, authenticated: true, next: nextPath });
    }

    const user = {
        name: req.body && req.body.username,
        pass: req.body && req.body.password
    };
    if (!credentialsAreValid(user)) {
        return res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS' });
    }

    const token = issueBrowserSession();
    res.set('Set-Cookie', buildSessionCookie(
        req,
        token,
        BROWSER_SESSION_ABSOLUTE_TTL_MS / 1000
    ));
    return res.json({ ok: true, authenticated: true, next: nextPath });
}

function sessionHandler(req, res) {
    res.set('Cache-Control', 'no-store');
    const result = authenticateRequest(req);
    return res.json({
        authenticated: result.authenticated,
        authEnabled: isAuthEnabled,
        transportSecure: requestUsesTls(req)
    });
}

function logoutHandler(req, res) {
    res.set('Cache-Control', 'no-store');
    revokeBrowserSession(getBrowserSessionToken(req));
    res.set('Set-Cookie', buildSessionCookie(req, '', 0));
    return res.json({ ok: true });
}

/**
 * Verify a WebSocket upgrade request.
 * Accepts either a valid Basic Auth header OR a valid one-time ticket query param.
 * Sets req.user on successful authentication for audit tracking.
 */
function verifyWsUpgrade(req) {
    if (!isAuthEnabled) return true;

    // Try Basic Auth header first (may work in some clients)
    const user = auth(req);
    if (user && user.name === adminUser.name && user.pass === adminUser.pass) {
        req.user = user.name;  // Set user for audit tracking
        return true;
    }

    // Fall back to ticket-based auth
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ticket = url.searchParams.get('ticket');
    if (consumeWsTicket(ticket)) {
        req.user = adminUser.name;  // Ticket was issued to authenticated user
        return true;
    }
    return false;
}

module.exports = basicAuthMiddleware;
module.exports.issueWsTicket = issueWsTicket;
module.exports.verifyWsUpgrade = verifyWsUpgrade;
module.exports.loginHandler = loginHandler;
module.exports.sessionHandler = sessionHandler;
module.exports.logoutHandler = logoutHandler;
module.exports._browserSession = {
    cookieName: BROWSER_SESSION_COOKIE,
    issue: issueBrowserSession,
    validate: validateBrowserSession,
    revoke: revokeBrowserSession,
    sanitizeNextPath,
    buildSessionCookie,
    clear() {
        browserSessions.clear();
    }
};
