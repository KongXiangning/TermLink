const { v4: uuidv4 } = require('uuid');
const SessionStore = require('../repositories/sessionStore');
const PtyService = require('./ptyService');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const PERSIST_DEBOUNCE_MS = 500;

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.persistTimer = null;
        this.sessionStore = new SessionStore({
            enabled: process.env.SESSION_PERSIST_ENABLED !== 'false',
            filePath: process.env.SESSION_PERSIST_PATH || './data/sessions.json',
            logger: console
        });

        this.restorePersistedSessions();

        // Clean up idle sessions periodically
        setInterval(() => this.cleanupIdleSessions(), 60000);
        this.registerShutdownHooks();
    }

    async createSession(options = {}) {
        const id = uuidv4();
        const now = Date.now();
        const session = this.buildSession({
            id,
            name: options.name || 'New Session',
            createdAt: now,
            lastActiveAt: now,
            status: 'IDLE'
        });

        this.ensurePtyForSession(session);
        this.sessions.set(id, session);
        this.schedulePersist();
        return session;
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
        this.ensurePtyForSession(session);
        session.connections.push(ws);
        session.lastActiveAt = Date.now();
        session.status = 'ACTIVE';
        this.schedulePersist();
    }

    removeConnection(session, ws) {
        session.connections = session.connections.filter(c => c !== ws);
        if (session.connections.length === 0) {
            session.status = 'IDLE';
            session.lastActiveAt = Date.now();
        }
        this.schedulePersist();
    }

    renameSession(id, name) {
        const session = this.sessions.get(id);
        if (!session) return null;

        session.name = name;
        session.lastActiveAt = Date.now();
        this.schedulePersist();
        return session;
    }

    deleteSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            try {
                if (session.ptyService) session.ptyService.kill();
            } catch (e) {
                console.error(`Failed to kill PTY for session ${id}`, e);
            }
            this.sessions.delete(id);
            this.schedulePersist();
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

    restorePersistedSessions() {
        const records = this.sessionStore.loadSync();
        if (records.length === 0) return;

        for (const record of records) {
            const session = this.buildSession({
                id: record.id,
                name: record.name,
                createdAt: record.createdAt,
                lastActiveAt: record.lastActiveAt,
                status: 'IDLE'
            });
            this.sessions.set(session.id, session);
        }

        console.log(`[SessionManager] Restored ${records.length} persisted sessions.`);
    }

    buildSession({ id, name, createdAt, lastActiveAt, status }) {
        return {
            id,
            name,
            createdAt,
            lastActiveAt,
            status: status || 'IDLE',
            connections: [],
            ptyService: new PtyService(),
            ptyInitialized: false
        };
    }

    ensurePtyForSession(session) {
        if (session.ptyInitialized) return;

        session.ptyService.spawn();
        session.ptyService.onData((data) => {
            this.broadcast(session, {
                type: 'output',
                sessionId: session.id,
                data: data
            });
        });
        session.ptyInitialized = true;
    }

    schedulePersist() {
        if (!this.sessionStore.enabled) return;

        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }

        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            this.flushPersist().catch((e) => {
                console.error('[SessionManager] Persist failed', e);
            });
        }, PERSIST_DEBOUNCE_MS);
    }

    async flushPersist() {
        if (!this.sessionStore.enabled) return;
        await this.sessionStore.save(this.getPersistableSessions());
    }

    flushPersistSync() {
        if (!this.sessionStore.enabled) return;
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }
        try {
            this.sessionStore.saveSync(this.getPersistableSessions());
        } catch (e) {
            console.error('[SessionManager] Persist sync failed', e);
        }
    }

    getPersistableSessions() {
        return Array.from(this.sessions.values()).map((s) => ({
            id: s.id,
            name: s.name,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt,
            status: s.status
        }));
    }

    registerShutdownHooks() {
        if (this.shutdownHooksRegistered) return;
        this.shutdownHooksRegistered = true;

        process.once('beforeExit', () => {
            this.flushPersistSync();
        });

        ['SIGINT', 'SIGTERM'].forEach((signal) => {
            const handler = () => {
                this.flushPersistSync();
                process.removeListener(signal, handler);
                try {
                    process.kill(process.pid, signal);
                } catch (e) {
                    process.exitCode = signal === 'SIGINT' ? 130 : 0;
                }
            };
            process.on(signal, handler);
        });
    }
}

module.exports = new SessionManager();
