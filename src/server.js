require('dotenv').config();
// IPC feed defaults for local dev — override via .env or process env.
if (!process.env.TERMLINK_CODEX_IPC_ENABLED) process.env.TERMLINK_CODEX_IPC_ENABLED = '1';
if (!process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE) process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '1';
if (!process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND) process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND = '1';
const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const basicAuth = require('./auth/basicAuth');
const createHealthRouter = require('./routes/health');
const createSessionsRouter = require('./routes/sessions');
const createClientRegistrationsRouter = require('./routes/clientRegistrations');
const createWorkspaceRouter = require('./routes/workspace');
const sessionManager = require('./services/sessionManager');
const clientRegistrationManager = require('./services/clientRegistrationManager');
const registerTerminalGateway = require('./ws/terminalGateway');
const { CodexIpcFeed } = require('./services/codexIpcFeed');
const { parsePrivilegeConfig, validateElevatedEnabled } = require('./config/privilegeConfig');
const { runSecurityGates } = require('./config/securityGates');
const { getAuditService } = require('./services/auditService');
const { diagnosticLog } = require('./services/diagnosticLog');
const { parseTlsConfig, validateTlsConfig, buildHttpsOptions } = require('./config/tlsConfig');
const { createConnectionSecurityMiddleware } = require('./utils/connectionSecurity');
const createCodexMediaRouter = require('./routes/codexMedia');
const { CodexMediaStore } = require('./services/codexMediaStore');
const { CodexHistorySnapshotStore } = require('./services/codexHistorySnapshotStore');

// Parse privilege configuration
const privilegeConfig = parsePrivilegeConfig();

// Parse and validate TLS/mTLS configuration
const tlsConfig = parseTlsConfig();
const tlsValidation = validateTlsConfig(tlsConfig);
if (tlsConfig.enabled || tlsConfig.proxyMode !== 'off') {
    if (!tlsValidation.valid) {
        for (const err of tlsValidation.errors) {
            console.error(`[TLS] ${err}`);
        }
        console.error('[TLS] TLS or trusted proxy TLS configuration is invalid. Refusing to start.');
        process.exit(1);
    }
}
if (tlsConfig.enabled) {
    console.log(`[TLS] TLS enabled — cert=${tlsConfig.certPath}, key=${tlsConfig.keyPath}`);
    if (tlsConfig.mtlsEnabled) {
        console.log(`[TLS] mTLS enabled — ca=${tlsConfig.caPath}, clientCert=${tlsConfig.clientCertPolicy}`);
    }
}
if (!tlsConfig.enabled && tlsConfig.proxyMode !== 'off') {
    console.log(`[TLS] Trusted proxy TLS summary enabled — mode=${tlsConfig.proxyMode}`);
}

const PORT = process.env.PORT || 3000;
const BIND_HOST = process.env.TERMLINK_BIND_HOST || '';
// Range/segment history remains opt-in.  The Windows validation process can
// set TERMLINK_HISTORY_RANGE_SEGMENTS=1 without changing the shared .env or
// the default behavior used by other hosts.
const historyRangeSegmentsEnabled = process.env.TERMLINK_HISTORY_RANGE_SEGMENTS === '1';
// P0-B.4R static snapshot transport is independently gated so a rollback
// does not change the existing native-cursor range experiment.
const historySnapshotSegmentsEnabled = process.env.TERMLINK_HISTORY_SNAPSHOT_SEGMENTS === '1';
const authEnabled = process.env.AUTH_ENABLED === undefined
    ? true
    : process.env.AUTH_ENABLED.toLowerCase() !== 'false';
const authUser = process.env.AUTH_USER || 'admin';
const authPass = process.env.AUTH_PASS || 'admin';

diagnosticLog.event('server', 'server.process.started', {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(PORT),
    bindHost: BIND_HOST || 'all',
    ipcEnabled: process.env.TERMLINK_CODEX_IPC_ENABLED === '1'
}, 'info');

// Security gate validation for elevated mode
if (privilegeConfig.isElevated) {
    const enabledCheck = validateElevatedEnabled(privilegeConfig);
    if (!enabledCheck.valid) {
        console.error(`[Security] ${enabledCheck.message}`);
        process.exit(1);
    }

    const gateResult = runSecurityGates({
        authEnabled,
        authUser,
        authPass,
        auditPath: privilegeConfig.auditPath,
        requireMtls: privilegeConfig.requireMtls
    });

    if (!gateResult.passed) {
        console.error(`[Security] Elevated mode security gate failed: ${gateResult.failedCheck.code}`);
        console.error(`[Security] ${gateResult.failedCheck.message}`);
        process.exit(1);
    }

    // Initialize audit service
    const auditService = getAuditService({
        enabled: true,
        auditPath: privilegeConfig.auditPath
    });
    auditService.init();
    console.log('[Security] Elevated privilege mode enabled with audit logging.');
}

const app = express();
const codexMediaStore = new CodexMediaStore({
    trustedTempRoots: [path.join(os.tmpdir(), 'termlink-codex-images')]
});
const codexMediaStoreReady = codexMediaStore.init();
const codexHistorySnapshotStore = historySnapshotSegmentsEnabled
    ? new CodexHistorySnapshotStore()
    : null;
const codexHistorySnapshotStoreReady = codexHistorySnapshotStore
    ? codexHistorySnapshotStore.init()
    : Promise.resolve(null);
const server = tlsConfig.enabled
    ? https.createServer(buildHttpsOptions(tlsConfig), app)
    : http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// Enable CORS for Mobile App Access (file:// origin)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-TermLink-Registration-Id");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(createConnectionSecurityMiddleware(tlsConfig));
app.post('/api/auth/login', basicAuth.loginHandler);
app.get('/api/auth/session', basicAuth.sessionHandler);
app.use(basicAuth);
app.post('/api/auth/logout', basicAuth.logoutHandler);
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', createClientRegistrationsRouter({ registrationManager: clientRegistrationManager, sessionManager }));
app.use('/api', createSessionsRouter(sessionManager, clientRegistrationManager));
app.use('/api', createWorkspaceRouter(sessionManager, clientRegistrationManager));
app.use('/api', createHealthRouter({ privilegeConfig, tlsConfig }));
app.use('/api', createCodexMediaRouter({ mediaStore: codexMediaStore }));

// WebSocket ticket endpoint — must be AFTER basicAuth middleware
const { issueWsTicket } = require('./auth/basicAuth');
app.get('/api/ws-ticket', (req, res) => {
    res.json({ ticket: issueWsTicket() });
});

// ── IPC feed: connect to codex-ipc when enabled ──
const ipcFeed = new CodexIpcFeed();

registerTerminalGateway(wss, {
    sessionManager,
    heartbeatMs: 30000,
    privilegeConfig,
    tlsConfig,
    ipcFeed,
    mediaStore: codexMediaStore,
    registrationManager: clientRegistrationManager,
    historyRangeSegmentsEnabled,
    historySnapshotSegmentsEnabled,
    historySnapshotStore: codexHistorySnapshotStore
});

// Start IPC feed first, then listen — avoids a race where the feed's
// initialize handshake completes after the first WebSocket client connects.
function listen(callback) {
    if (BIND_HOST) {
        server.listen(PORT, BIND_HOST, callback);
    } else {
        server.listen(PORT, callback);
    }
}

Promise.resolve()
    .then(() => Promise.all([codexMediaStoreReady, codexHistorySnapshotStoreReady]))
    .then(() => ipcFeed.start().catch((err) => {
        console.warn('[server] IPC feed start failed:', err.message);
        return null;
    }))
    .then(() => {
        listen(() => {
            if (authEnabled && authUser === 'admin' && authPass === 'admin') {
                console.warn('[Security] AUTH is enabled but default credentials (admin/admin) are in use. Set AUTH_USER and AUTH_PASS for non-dev deployments.');
            }
            const proto = tlsConfig.enabled ? 'https' : 'http';
            console.log(`Server started on ${proto}://${BIND_HOST || 'localhost'}:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('[server] Media store initialization failed; server not started:', err && err.message ? err.message : String(err));
    });
