const auth = require('basic-auth');
const crypto = require('crypto');

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
    if (!isAuthEnabled) return next();
    const user = auth(req);

    if (!user || user.name !== adminUser.name || user.pass !== adminUser.pass) {
        res.set('WWW-Authenticate', 'Basic realm="TermLink"');
        return res.status(401).send();
    }
    return next();
}

/**
 * Verify a WebSocket upgrade request.
 * Accepts either a valid Basic Auth header OR a valid one-time ticket query param.
 */
function verifyWsUpgrade(req) {
    if (!isAuthEnabled) return true;

    // Try Basic Auth header first (may work in some clients)
    const user = auth(req);
    if (user && user.name === adminUser.name && user.pass === adminUser.pass) {
        return true;
    }

    // Fall back to ticket-based auth
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ticket = url.searchParams.get('ticket');
    return consumeWsTicket(ticket);
}

module.exports = basicAuthMiddleware;
module.exports.issueWsTicket = issueWsTicket;
module.exports.verifyWsUpgrade = verifyWsUpgrade;
