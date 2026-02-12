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

app.use(express.json());
app.use(basicAuth);
app.use(express.static(path.join(__dirname, '../public')));

// API: List Sessions
app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.listSessions());
});

// API: Create Session
app.post('/api/sessions', async (req, res) => {
    // const type = req.body.type; 
    const { type, provider } = req.body;
    const session = await sessionManager.createSession({ type, provider });
    res.json({ id: session.id, name: `Session ${session.id.substring(0, 8)}` });
});

// API: Delete Session
app.delete('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[Server] Request to delete session: ${id}`);
    const success = sessionManager.deleteSession(id);
    if (success) {
        console.log(`[Server] Session deleted: ${id}`);
        res.json({ status: 'ok' });
    } else {
        console.error(`[Server] Session not found for deletion: ${id}`);
        res.status(404).json({ error: 'Session not found' });
    }
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
        provider: session.provider, // Add Provider Info
        // Send basic thread history for 'main'
        history: session.threads.get('main')?.messages || [],
        // Send pending approvals (Check both service and session storage)
        pendingApprovals: [
            ...(codex.approvals ? Array.from(codex.approvals.values()) : []),
            ...(session.approvals ? Array.from(session.approvals.values()) : [])
        ].filter(a => a.status === 'pending')
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
                // NL Input -> Enqueue to TurnQueue
                const content = envelope.content || payload.content;
                const threadId = envelope.threadId || 'main';

                // Add USER message to history immediately (Optimistic)
                session.threads.get(threadId).messages.push({
                    role: 'user', content: content, timestamp: Date.now()
                });

                // Protocol v1 System Prompt (Defined in document)
                const systemPrompt =
                    `SYSTEM:\nYou are TermLink agent. Output ONLY lines that start with '@@TERM_LINK/1 ' followed by a JSON object.\n` +
                    `Never output markdown. Never output extra text.\n` +
                    `If you want to propose a command, output type="proposal" with fields command,risk,summary.\n` +
                    `If you want to answer user, output type="assistant" with field content.\n` +
                    `After finishing, output type="done".`;

                session.turnQueue.enqueue({
                    id: Date.now(),
                    systemPrompt: systemPrompt,
                    userMessage: content
                });
            } else if (type === 'approval_response') {
                // { type: 'approval_response', payload: { approvalId, decision: 'approved'|'rejected' } }
                const { approvalId, decision } = envelope.payload || envelope;

                // Lookup Approval
                let approval;
                if (codex.approvals && codex.approvals.has(approvalId)) {
                    approval = codex.approvals.get(approvalId);
                } else if (session.approvals && session.approvals.has(approvalId)) {
                    approval = session.approvals.get(approvalId);
                }

                if (!approval) {
                    console.error('Approval not found:', approvalId);
                    return;
                }

                if (approval.status !== 'pending') {
                    console.warn('Approval already processed:', approvalId);
                    return;
                }

                approval.status = decision; // 'approved' | 'rejected'

                const result = { success: true, command: decision === 'approved' ? approval.command : null };

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
                } else {
                    // Rejected
                    session.threads.get('main').messages.push({
                        role: 'system',
                        content: `Command Rejected: ${approval.command}`,
                        timestamp: Date.now()
                    });
                    sessionManager.broadcast(session, {
                        type: 'chat_message',
                        sessionId: session.id,
                        threadId: 'main',
                        payload: { role: 'system', content: `Command Rejected` }
                    });
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
