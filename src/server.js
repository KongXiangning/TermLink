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

const PORT = process.env.PORT || 3001;

app.use(express.json());

// Enable CORS for Mobile App Access (file:// origin)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// app.use(basicAuth); // Disabled for mobile app testing without login UI
app.use(express.static(path.join(__dirname, '../public')));

// API: List Sessions
app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.listSessions());
});

// API: Create Session
app.post('/api/sessions', async (req, res) => {
    const { name } = req.body;
    const session = await sessionManager.createSession({ name });
    res.json({ id: session.id, name: session.name });
});

// API: Delete Session
app.delete('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    const success = sessionManager.deleteSession(id);
    if (success) {
        res.json({ status: 'ok' });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    let session;
    if (sessionId) {
        session = sessionManager.getSession(sessionId);
    }

    if (!session) {
        // If no session ID or invalid, create a new default one?
        // Or reject? For smoother UX, let's create one if explicitly asked, 
        // but if just connecting without ID, create new.
        session = await sessionManager.createSession({ name: 'Default Session' });
    }

    sessionManager.addConnection(session, ws);
    const pty = session.ptyService;

    // Send Handshake / Session Info
    ws.send(JSON.stringify({
        type: 'session_info',
        sessionId: session.id,
        name: session.name
    }));

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Handle Messages
    ws.on('message', (message) => {
        try {
            const envelope = JSON.parse(message);
            // Expected: { type, data, ... }
            const type = envelope.type;

            if (type === 'input') {
                // Direct PTY Input
                pty.write(envelope.data);
            } else if (type === 'resize') {
                pty.resize(envelope.cols, envelope.rows);
            }
        } catch (e) {
            console.error('Failed to parse message:', e.message);
        }
    });

    ws.on('close', () => {
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
