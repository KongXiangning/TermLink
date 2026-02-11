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

const PORT = process.env.PORT || 3000;

app.use(basicAuth);
app.use(express.static(path.join(__dirname, '../public')));

// API: List Sessions
app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.listSessions());
});

// API: Create Session
app.post('/api/sessions', (req, res) => {
    const session = sessionManager.createSession();
    res.json({ id: session.id, name: session.name });
});

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    let session;
    if (sessionId) {
        session = sessionManager.getSession(sessionId);
    }

    if (!session) {
        session = sessionManager.createSession('Default Session');
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
            }
        } else if (type === 'signal') {
            const { signal } = envelope.payload || envelope;
            console.log(`Sending signal ${signal} to session ${session.id}`);
            // Forward to session process via SessionManager or direct?
            // SessionManager wrapper is cleaner but direct access exists here.
            // Let's use direct ptyService for now as per plan.
            if (pty) pty.kill(signal);
        }
    });

    // Note: We removed the direct `pty.onData` listener here.
    // SessionManager now handles broadcasting PTY data to all active connections.

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
