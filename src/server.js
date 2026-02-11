require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const basicAuth = require('./auth/basicAuth');
const sessionManager = require('./services/sessionManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const CodexFactory = require('./services/codex/codexFactory');
const RuntimeValidator = require('./services/codexRuntimeValidator');
let codexService; // Will be initialized async

const PORT = process.env.PORT || 3000;

// Initialize Codex Service Async
(async () => {
    try {
        codexService = await CodexFactory.create();
        console.log('[Server] Codex Service Initialized:', codexService.constructor.name);
    } catch (e) {
        console.error('[Server] Failed to init Codex:', e);
    }
})();

app.use(basicAuth);
app.use(express.static(path.join(__dirname, '../public')));

// API: List Sessions
app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.listSessions());
});

// API: Create Session
app.post('/api/sessions', async (req, res) => {
    const session = await sessionManager.createSession();
    res.json({ id: session.id, name: session.name });
});

// Health Endpoint
app.get('/health', async (req, res) => {
    const codexStatus = await RuntimeValidator.validate();
    res.json({
        status: 'ok',
        codex: codexStatus,
        mode: process.env.CODEX_MODE || 'auto'
    });
});

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    let session;
    if (sessionId) {
        session = sessionManager.getSession(sessionId);
    }

    if (!session) {
        session = await sessionManager.createSession('Default Session');
        console.log(`Created new session: ${session.id}`);
    } else {
        console.log(`Client attached to session: ${session.id}`);
    }

    sessionManager.addConnection(session, ws);
    const pty = session.ptyService;
    const codex = session.codexService;

    // Send Handshake / Session Info
    ws.send(JSON.stringify({
        type: 'session_info',
        sessionId: session.id,
        name: session.name,
        // Send basic thread history for 'main'
        history: session.threads.get('main')?.messages || [],
        // Send pending approvals
        pendingApprovals: Array.from(codex.approvals.values()).filter(a => a.status === 'pending')
    }));

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Handle Messages (Protocol v2)
    ws.on('message', (message) => {
        try {
            const envelope = JSON.parse(message);
            // Expected: { type, sessionId, threadId, requestId, payload }
            const type = envelope.type;
            const payload = envelope.payload || {};

            if (type === 'input') {
                // Direct PTY Input (Terminal Drawer)
                pty.write(envelope.data || payload.data);
            } else if (type === 'resize') {
                pty.resize(envelope.cols, envelope.rows);
            } else if (type === 'chat') {
                // NL Input
                codex.sendMessage(envelope.content || payload.content, envelope.threadId || 'main');
            } else if (type === 'approval_response') {
                // { type: 'approval_response', payload: { approvalId, decision: 'approved'|'rejected' } }
                const { approvalId, decision } = envelope.payload || envelope;
                const result = codex.handleApprovalDecision(approvalId, decision);

                if (result.success && result.command) {
                    process.stdout.write(`Executing approved command: ${result.command}\n`);
                    // Logic: Execute on PTY
                    pty.write(`${result.command}\r`);

                    // Add system log to chat
                    session.threads.get('main').messages.push({
                        role: 'system',
                        content: `Executed: ${result.command}`,
                        timestamp: Date.now()
                    });
                    // Broadcast update
                    sessionManager.broadcast(session, {
                        type: 'chat_message',
                        sessionId: session.id,
                        threadId: 'main',
                        payload: { role: 'system', content: `Executed: ${result.command}` }
                    });
                } else if (result.error) {
                    console.error('Approval Error:', result.error);
                }
            } else if (type === 'signal') {
                const { signal } = envelope.payload || envelope;
                console.log(`Sending signal ${signal} to session ${session.id}`);
                if (pty) pty.kill(signal);
            }
        } catch (e) {
            console.error('Failed to parse message:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        sessionManager.removeConnection(session, ws);
    });
});

// Heartbeat
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
