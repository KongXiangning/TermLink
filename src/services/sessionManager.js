const { v4: uuidv4 } = require('uuid');
const SessionStore = require('../repositories/sessionStore');
const PtyService = require('./ptyService');

const DEFAULT_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 1000;
const DEFAULT_MAX_SESSION_COUNT = 50;
const MIN_IDLE_TIMEOUT_MS = 60 * 1000;
const MIN_CLEANUP_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 500;
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';
const {
    normalizeSessionMode,
    normalizeSessionCwd,
    normalizeLastCodexThreadId,
    normalizeCodexConfig
} = SessionStore;

function parsePositiveIntEnv(name, defaultValue, minValue) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return defaultValue;
    }

    const parsed = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed < minValue) {
        console.warn(`[SessionManager] Invalid ${name}=${raw}, fallback to ${defaultValue}.`);
        return defaultValue;
    }

    return parsed;
}

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.persistTimer = null;
        this.idleTimeoutMs = parsePositiveIntEnv(
            'SESSION_IDLE_TTL_MS',
            DEFAULT_IDLE_TIMEOUT_MS,
            MIN_IDLE_TIMEOUT_MS
        );
        this.cleanupIntervalMs = parsePositiveIntEnv(
            'SESSION_CLEANUP_INTERVAL_MS',
            DEFAULT_CLEANUP_INTERVAL_MS,
            MIN_CLEANUP_INTERVAL_MS
        );
        this.maxSessionCount = parsePositiveIntEnv(
            'SESSION_MAX_COUNT',
            DEFAULT_MAX_SESSION_COUNT,
            1
        );
        this.sessionStore = new SessionStore({
            enabled: process.env.SESSION_PERSIST_ENABLED !== 'false',
            filePath: process.env.SESSION_PERSIST_PATH || './data/sessions.json',
            logger: console
        });

        this.restorePersistedSessions();

        // Clean up idle sessions periodically
        setInterval(() => this.cleanupIdleSessions(), this.cleanupIntervalMs);
        this.registerShutdownHooks();
    }

    async createSession(options = {}) {
        this.ensureCapacityForNewSession();

        const id = uuidv4();
        const now = Date.now();
        const session = this.buildSession({
            id,
            name: options.name || 'New Session',
            createdAt: now,
            lastActiveAt: now,
            status: 'IDLE',
            privilegeMetadata: options.privilegeMetadata || null,
            sessionMode: options.sessionMode,
            cwd: options.cwd,
            lastCodexThreadId: options.lastCodexThreadId,
            codexConfig: options.codexConfig
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
        return Array.from(this.sessions.values()).map((session) => this.buildSessionSummary(session));
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

    updateSession(id, updates = {}) {
        const session = this.sessions.get(id);
        if (!session) return null;

        let changed = false;
        if (Object.prototype.hasOwnProperty.call(updates, 'name') && typeof updates.name === 'string') {
            if (session.name !== updates.name) {
                session.name = updates.name;
                changed = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'codexConfig')) {
            const nextCodexConfig = normalizeCodexConfig(updates.codexConfig, {
                requirePolicyAndSandbox: false
            });
            if (JSON.stringify(session.codexConfig ?? null) !== JSON.stringify(nextCodexConfig ?? null)) {
                session.codexConfig = nextCodexConfig;
                if (session.codexState && typeof session.codexState === 'object') {
                    session.codexState.threadExecutionContextSignature = '__stale__';
                }
                changed = true;
            }
        }

        if (!changed) {
            return session;
        }

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
            if (session.connections.length === 0 && (now - session.lastActiveAt > this.idleTimeoutMs)) {
                console.log(`Cleaning up idle session: ${id}`);
                this.deleteSession(id);
            }
        }
    }

    ensureCapacityForNewSession() {
        if (this.sessions.size < this.maxSessionCount) {
            return;
        }

        const evictedSessionId = this.evictOldestIdleSession();
        if (evictedSessionId) {
            return;
        }

        const error = new Error(`Session capacity exceeded: max ${this.maxSessionCount}`);
        error.code = SESSION_CAPACITY_ERROR_CODE;
        error.maxSessionCount = this.maxSessionCount;
        throw error;
    }

    evictOldestIdleSession() {
        let oldestIdleSession = null;

        for (const session of this.sessions.values()) {
            if (session.connections.length > 0) {
                continue;
            }
            if (!oldestIdleSession || session.lastActiveAt < oldestIdleSession.lastActiveAt) {
                oldestIdleSession = session;
            }
        }

        if (!oldestIdleSession) {
            return null;
        }

        console.warn(
            `[SessionManager] Evicting idle session due to capacity limit: ${oldestIdleSession.id}`
        );
        this.deleteSession(oldestIdleSession.id);
        return oldestIdleSession.id;
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
                status: 'IDLE',
                sessionMode: record.sessionMode,
                cwd: record.cwd,
                lastCodexThreadId: record.lastCodexThreadId,
                codexConfig: record.codexConfig
            });
            this.sessions.set(session.id, session);
        }

        console.log(`[SessionManager] Restored ${records.length} persisted sessions.`);
    }

    buildSession({
        id,
        name,
        createdAt,
        lastActiveAt,
        status,
        privilegeMetadata,
        sessionMode,
        cwd,
        lastCodexThreadId,
        codexConfig
    }) {
        const normalizedSessionMode = normalizeSessionMode(sessionMode);
        return {
            id,
            name,
            createdAt,
            lastActiveAt,
            status: status || 'IDLE',
            sessionMode: normalizedSessionMode,
            cwd: normalizeSessionCwd(cwd),
            lastCodexThreadId: normalizeLastCodexThreadId(lastCodexThreadId),
            codexConfig: normalizeCodexConfig(codexConfig, {
                requirePolicyAndSandbox: false
            }),
            connections: [],
            ptyService: new PtyService(),
            ptyInitialized: false,
            privilegeMetadata: privilegeMetadata || null,
            codexState: {
                threadId: null,
                currentTurnId: null,
                status: 'idle',
                pendingServerRequests: []
            }
        };
    }

    updateLastCodexThreadId(id, threadId) {
        const session = this.sessions.get(id);
        if (!session) return null;

        const normalized = normalizeLastCodexThreadId(threadId);
        if (session.lastCodexThreadId === normalized) {
            return session;
        }

        session.lastCodexThreadId = normalized;
        session.lastActiveAt = Date.now();
        this.schedulePersist();
        return session;
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

    buildSessionSummary(session) {
        return {
            id: session.id,
            name: session.name,
            status: session.status,
            activeConnections: session.connections.length,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt,
            sessionMode: normalizeSessionMode(session.sessionMode),
            cwd: normalizeSessionCwd(session.cwd),
            lastCodexThreadId: normalizeLastCodexThreadId(session.lastCodexThreadId),
            codexConfig: normalizeCodexConfig(session.codexConfig, {
                requirePolicyAndSandbox: false
            }),
            codexThreadId: session.codexState && session.codexState.threadId
                ? session.codexState.threadId
                : null
        };
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
            status: s.status,
            sessionMode: normalizeSessionMode(s.sessionMode),
            cwd: normalizeSessionCwd(s.cwd),
            lastCodexThreadId: normalizeLastCodexThreadId(s.lastCodexThreadId),
            codexConfig: normalizeCodexConfig(s.codexConfig, {
                requirePolicyAndSandbox: false
            })
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

const sessionManager = new SessionManager();
sessionManager.SESSION_CAPACITY_ERROR_CODE = SESSION_CAPACITY_ERROR_CODE;

module.exports = sessionManager;
module.exports.SessionManager = SessionManager;
module.exports.normalizeSessionMode = normalizeSessionMode;
module.exports.normalizeSessionCwd = normalizeSessionCwd;
