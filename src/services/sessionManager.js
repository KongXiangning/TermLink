const { v4: uuidv4 } = require('uuid');
const SessionStore = require('../repositories/sessionStore');
const PtyService = require('./ptyService');
const { diagnosticLog } = require('./diagnosticLog');

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
    normalizeWorkspaceRoot,
    normalizeWorkspaceRootSource,
    normalizeLastCodexThreadId,
    normalizeCodexConfig
} = SessionStore;
const LEGACY_SESSION_GRACE_MS = SessionStore.LEGACY_SESSION_GRACE_MS;

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

function summarizeSessionConnections(session) {
    const connections = Array.isArray(session && session.connections)
        ? session.connections.filter((ws) => ws && ws.readyState === 1)
        : [];
    const activeConnectionCount = connections.length;

    if (activeConnectionCount === 0) {
        return {
            activeConnectionCount: 0,
            allTls: false,
            allMtlsAuthorized: false
        };
    }

    return {
        activeConnectionCount,
        allTls: connections.every((ws) => !!(ws.connectionSecurity && ws.connectionSecurity.tls === true)),
        allMtlsAuthorized: connections.every((ws) => !!(
            ws.connectionSecurity &&
            ws.connectionSecurity.tls === true &&
            ws.connectionSecurity.clientCertAuthorized === true
        ))
    };
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
        diagnosticLog.event('server', 'server.sessions.create.requested', {
            sessionMode: options.sessionMode,
            hasCwd: Boolean(options.cwd),
            sessionCount: this.sessions.size
        });
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
            workspaceRoot: options.workspaceRoot,
            workspaceRootSource: options.workspaceRootSource,
            lastCodexThreadId: options.lastCodexThreadId,
            codexConfig: options.codexConfig,
            registrationId: options.registrationId,
            legacyExpiresAt: options.legacyExpiresAt
        });

        this.ensurePtyForSession(session);
        this.sessions.set(id, session);
        this.schedulePersist();
        diagnosticLog.event('server', 'server.sessions.create.completed', {
            sessionMode: session.sessionMode,
            sessionIdPresent: true,
            sessionCount: this.sessions.size
        });
        return session;
    }

    getSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            session.lastActiveAt = Date.now();
        }
        return session;
    }

    getSessionForRegistration(id, registrationId) {
        const session = this.sessions.get(id);
        if (!session) return null;
        if (!registrationId) return session;
        return session.registrationId === registrationId ? session : null;
    }

    listSessions(registrationId = null) {
        return Array.from(this.sessions.values())
            .filter((session) => !registrationId || session.registrationId === registrationId)
            .map((session) => this.buildSessionSummary(session));
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

    getTerminalOutputSnapshot(session) {
        if (!session || !session.ptyService || typeof session.ptyService.getOutputSnapshot !== 'function') {
            return '';
        }
        return session.ptyService.getOutputSnapshot();
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
            diagnosticLog.event('server', 'server.sessions.delete.completed', {
                sessionIdPresent: Boolean(id),
                sessionCount: this.sessions.size
            }, 'info');
            return true;
        }
        diagnosticLog.event('server', 'server.sessions.delete.missing', { sessionIdPresent: Boolean(id) }, 'warn');
        return false;
    }

    markRegistrationDeleted(registrationId) {
        const expiresAt = Date.now() + LEGACY_SESSION_GRACE_MS;
        let changed = false;
        for (const session of this.sessions.values()) {
            if (session.registrationId !== registrationId) continue;
            session.legacyExpiresAt = expiresAt;
            changed = true;
        }
        if (changed) this.schedulePersist();
    }

    cleanupIdleSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (session.legacyExpiresAt && now >= session.legacyExpiresAt) {
                console.log(`Cleaning up expired legacy session: ${id}`);
                this.deleteSession(id);
                continue;
            }
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
                workspaceRoot: record.workspaceRoot,
                workspaceRootSource: record.workspaceRootSource,
                lastCodexThreadId: record.lastCodexThreadId,
                codexConfig: record.codexConfig,
                registrationId: record.registrationId,
                legacyExpiresAt: record.legacyExpiresAt
            });
            this.sessions.set(session.id, session);
        }
        if (records.some((record) => Number.isFinite(record.legacyExpiresAt))) {
            // Persist the one-time legacy grace deadline so server restarts do
            // not extend old unowned sessions indefinitely.
            this.schedulePersist();
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
        workspaceRoot,
        workspaceRootSource,
        lastCodexThreadId,
        codexConfig,
        registrationId,
        legacyExpiresAt
    }) {
        const normalizedSessionMode = normalizeSessionMode(sessionMode);
        const normalizedCwd = normalizeSessionCwd(cwd);
        const normalizedWorkspaceRoot = normalizeWorkspaceRoot(
            workspaceRoot !== undefined
                ? workspaceRoot
                : (normalizedSessionMode === 'codex' ? normalizedCwd : null)
        );
        const normalizedWorkspaceRootSource = normalizeWorkspaceRootSource(
            workspaceRootSource !== undefined
                ? workspaceRootSource
                : (normalizedWorkspaceRoot ? 'session_cwd' : null)
        );
        return {
            id,
            name,
            createdAt,
            lastActiveAt,
            status: status || 'IDLE',
            sessionMode: normalizedSessionMode,
            cwd: normalizedCwd,
            workspaceRoot: normalizedWorkspaceRoot,
            workspaceRootSource: normalizedWorkspaceRootSource,
            lastCodexThreadId: normalizeLastCodexThreadId(lastCodexThreadId),
            codexConfig: normalizeCodexConfig(codexConfig, {
                requirePolicyAndSandbox: false
            }),
            registrationId: typeof registrationId === 'string' && registrationId.trim()
                ? registrationId.trim()
                : null,
            legacyExpiresAt: Number.isFinite(legacyExpiresAt) ? Number(legacyExpiresAt) : null,
            connections: [],
            ptyService: new PtyService(),
            ptyInitialized: false,
            suppressPtyOutput: false,
            ptyFirstDataLogged: false,
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

        session.ptyService.onData((data) => {
            if (!session.ptyFirstDataLogged) {
                session.ptyFirstDataLogged = true;
                diagnosticLog.event('terminal', 'server.terminal.pty.first_output', {
                    sessionIdPresent: Boolean(session.id),
                    sessionMode: session.sessionMode || 'terminal',
                    dataLength: typeof data === 'string' ? data.length : 0,
                    suppressed: session.suppressPtyOutput === true
                });
            }
            if (session.suppressPtyOutput) {
                return;
            }
            this.broadcast(session, {
                type: 'output',
                sessionId: session.id,
                data: data
            });
        });
        // Register the data listener before spawning so the shell's startup
        // banner/prompt cannot be lost in the small spawn-to-listener gap.
        session.ptyService.spawn();
        session.ptyInitialized = true;
    }

    buildSessionSummary(session) {
        const aggregate = summarizeSessionConnections(session);
        return {
            id: session.id,
            name: session.name,
            status: session.status,
            activeConnections: aggregate.activeConnectionCount,
            activeConnectionCount: aggregate.activeConnectionCount,
            allTls: aggregate.allTls,
            allMtlsAuthorized: aggregate.allMtlsAuthorized,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt,
            sessionMode: normalizeSessionMode(session.sessionMode),
            cwd: normalizeSessionCwd(session.cwd),
            workspaceRoot: normalizeWorkspaceRoot(session.workspaceRoot),
            workspaceRootSource: normalizeWorkspaceRootSource(session.workspaceRootSource),
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
            workspaceRoot: normalizeWorkspaceRoot(s.workspaceRoot),
            workspaceRootSource: normalizeWorkspaceRootSource(s.workspaceRootSource),
            lastCodexThreadId: normalizeLastCodexThreadId(s.lastCodexThreadId),
            codexConfig: normalizeCodexConfig(s.codexConfig, {
                requirePolicyAndSandbox: false
            }),
            registrationId: s.registrationId || null,
            legacyExpiresAt: Number.isFinite(s.legacyExpiresAt) ? s.legacyExpiresAt : null
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
module.exports.summarizeSessionConnections = summarizeSessionConnections;
