require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const basicAuth = require('./auth/basicAuth');
const createHealthRouter = require('./routes/health');
const createSessionsRouter = require('./routes/sessions');
const sessionManager = require('./services/sessionManager');
const registerTerminalGateway = require('./ws/terminalGateway');
const { parsePrivilegeConfig, validateElevatedEnabled } = require('./config/privilegeConfig');
const { runSecurityGates } = require('./config/securityGates');
const { getAuditService } = require('./services/auditService');

// Parse privilege configuration
const privilegeConfig = parsePrivilegeConfig();

const PORT = process.env.PORT || 3000;
const authEnabled = process.env.AUTH_ENABLED === undefined
    ? true
    : process.env.AUTH_ENABLED.toLowerCase() !== 'false';
const authUser = process.env.AUTH_USER || 'admin';
const authPass = process.env.AUTH_PASS || 'admin';

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
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

// Enable CORS for Mobile App Access (file:// origin)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(basicAuth);
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', createSessionsRouter(sessionManager));
app.use('/api', createHealthRouter({ privilegeConfig }));

// WebSocket ticket endpoint — must be AFTER basicAuth middleware
const { issueWsTicket } = require('./auth/basicAuth');
app.get('/api/ws-ticket', (req, res) => {
    res.json({ ticket: issueWsTicket() });
});

registerTerminalGateway(wss, { sessionManager, heartbeatMs: 30000, privilegeConfig });

server.listen(PORT, () => {
    if (authEnabled && authUser === 'admin' && authPass === 'admin') {
        console.warn('[Security] AUTH is enabled but default credentials (admin/admin) are in use. Set AUTH_USER and AUTH_PASS for non-dev deployments.');
    }
    console.log(`Server started on http://localhost:${PORT}`);
});
