const { v4: uuidv4 } = require('uuid');
const PtyService = require('./ptyService');
const CodexService = require('./codexService');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class SessionManager {
    constructor() {
        this.sessions = new Map();

        // Clean up idle sessions periodically
        setInterval(() => this.cleanupIdleSessions(), 60000);
    }

    createSession(name = 'New Session') {
        const id = uuidv4();
        const session = {
            id,
            name,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            status: 'IDLE', // IDLE, ACTIVE
            connections: [], // WebSocket connections
            ptyService: new PtyService(),
            codexService: new CodexService(),
            threads: new Map() // threadId -> { messages: [] }
        };

        // Initialize Default Thread
        session.threads.set('main', { messages: [] });

        // Initialize PTY
        session.ptyService.spawn();

        // Connect Codex Events to Broadcast
        this.bindCodexEvents(session);

        // Bind PTY Output to Broadcast
        session.ptyService.onData((data) => {
            this.broadcast(session, {
                type: 'output',
                sessionId: id,
                data: data
            });
        });

        this.sessions.set(id, session);
        return session;
    }

    bindCodexEvents(session) {
        const { codexService, id } = session;

        codexService.on('message', (msg) => {
            // Persist to thread history
            const thread = session.threads.get(msg.threadId);
            if (thread) thread.messages.push(msg);

            this.broadcast(session, {
                type: 'chat_message',
                sessionId: id,
                threadId: msg.threadId,
                payload: msg
            });
        });

        codexService.on('thinking', (evt) => {
            this.broadcast(session, {
                type: 'status',
                sessionId: id,
                threadId: evt.threadId,
                payload: { state: evt.state ? 'THINKING' : 'IDLE' }
            });
        });

        codexService.on('approval_request', (approval) => {
            this.broadcast(session, {
                type: 'approval_request',
                sessionId: id,
                threadId: approval.threadId,
                payload: approval
            });
        });

        codexService.on('approval_update', (update) => {
            this.broadcast(session, {
                type: 'approval_update',
                sessionId: id,
                payload: update
            });
        });
    }

    getSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            session.lastActiveAt = Date.now();
        }
        return session;
    }

    listSessions() {
        return Array.from(this.sessions.values()).map(s => ({
            id: s.id,
            name: s.name,
            status: s.status,
            activeConnections: s.connections.length,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt
        }));
    }

    broadcast(session, envelope) {
        if (!session.connections) return;
        const msgStr = JSON.stringify(envelope);
        session.connections.forEach(ws => {
            if (ws.readyState === 1) { // OPEN
                ws.send(msgStr);
            }
        });
    }

    addConnection(session, ws) {
        session.connections.push(ws);
        session.lastActiveAt = Date.now();
        session.status = 'ACTIVE';
    }

    removeConnection(session, ws) {
        session.connections = session.connections.filter(c => c !== ws);
        if (session.connections.length === 0) {
            session.status = 'IDLE';
            session.lastActiveAt = Date.now();
        }
    }

    deleteSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            try {
                session.ptyService.kill();
            } catch (e) {
                console.error(`Failed to kill PTY for session ${id}`, e);
            }
            this.sessions.delete(id);
            return true;
        }
        return false;
    }

    cleanupIdleSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (session.connections.length === 0 && (now - session.lastActiveAt > IDLE_TIMEOUT_MS)) {
                console.log(`Cleaning up idle session: ${id}`);
                this.deleteSession(id);
            }
        }
    }
}

module.exports = new SessionManager();
