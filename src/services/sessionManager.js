const { v4: uuidv4 } = require('uuid');
const PtyService = require('./ptyService');
const CodexFactory = require('./codex/codexFactory');
const TurnQueue = require('./codex/turnQueue');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class SessionManager {
    constructor() {
        this.sessions = new Map();

        // Clean up idle sessions periodically
        setInterval(() => this.cleanupIdleSessions(), 60000);
    }

    async createSession(name = 'New Session') {
        const id = uuidv4();
        // Create Codex Service (Factory returns Real/Mock)
        const codexService = await CodexFactory.create();

        // Wrap in TurnQueue
        const turnQueue = new TurnQueue(codexService);

        const session = {
            id,
            name,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            status: 'IDLE', // IDLE, ACTIVE
            connections: [], // WebSocket connections
            ptyService: new PtyService(),
            codexService: codexService,
            turnQueue: turnQueue, // Store queue
            // Approvals need to be tracked here or in CodexService?
            // CodexService (Base) has approvals map.
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
        const { codexService, turnQueue, id } = session;

        // Protocol Parser Events from RealCodexService
        codexService.on('assistant', (evt) => {
            const threadId = 'main'; // Protocol v1 doesn't have threadId in JSON yet
            const msg = { role: 'assistant', content: evt.content };

            // Persist
            const thread = session.threads.get(threadId);
            if (thread) thread.messages.push(msg);

            this.broadcast(session, {
                type: 'chat_message',
                sessionId: id,
                threadId: threadId,
                payload: msg
            });
        });

        codexService.on('proposal', (evt) => {
            // evt: { type: 'proposal', command: '...', risk: '...', summary: '...' }
            // Generate Approval ID
            const approvalId = uuidv4();
            const approval = {
                id: approvalId,
                command: evt.command,
                risk: evt.risk || 'high',
                reason: evt.summary || 'Codex Proposal',
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + 5 * 60 * 1000 // 5m TTL
            };

            // Store in Codex Service (approvals map) - Assuming BaseCodexService has it
            // If RealCodexService doesn't extend Base, we need to add it or store in Session
            if (codexService.approvals) {
                codexService.approvals.set(approvalId, approval);
            } else {
                // Fallback store in session if service doesn't have it
                if (!session.approvals) session.approvals = new Map();
                session.approvals.set(approvalId, approval);
            }

            this.broadcast(session, {
                type: 'approval_request',
                sessionId: id,
                threadId: 'main',
                payload: approval
            });
        });

        codexService.on('status', (evt) => {
            // evt: { status: 'thinking' }
            // UI expects { state: true/false } or text
            // Let's map it
            this.broadcast(session, {
                type: 'status',
                sessionId: id,
                threadId: 'main',
                payload: { state: evt.status === 'thinking' ? 'THINKING' : 'IDLE', text: evt.status }
            });
        });

        // TurnQueue Events
        turnQueue.on('turn_end', () => {
            // Maybe notify UI?
        });

        turnQueue.on('turn_timeout', () => {
            this.broadcast(session, {
                type: 'chat_message',
                sessionId: id,
                threadId: 'main',
                payload: { role: 'system', content: '⚠️ Codex request timed out. Process restarted.' }
            });
        });

        // Mock Compatibility (OLD EVENTS) - If MockCodexService is used
        // It might still emit 'message' instead of 'assistant'
        // We should ensure MockCodexService also follows new pattern or we support both
        codexService.on('message', (msg) => {
            // Legacy/Mock support
            const thread = session.threads.get(msg.threadId || 'main');
            if (thread) thread.messages.push({ role: 'assistant', content: msg.content });
            this.broadcast(session, {
                type: 'chat_message',
                sessionId: id,
                threadId: msg.threadId || 'main',
                payload: { role: 'assistant', content: msg.content }
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
                if (session.ptyService) session.ptyService.kill();
                if (session.codexService) session.codexService.stop();
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
