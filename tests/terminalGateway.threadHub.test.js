const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');

function loadGatewayWithMocks({ verifyWsUpgrade, codexServiceClass }) {
    const authPath = require.resolve('../src/auth/basicAuth');
    const codexPath = require.resolve('../src/services/codexAppServerService');
    const sessionManagerPath = require.resolve('../src/services/sessionManager');
    const gatewayPath = require.resolve('../src/ws/terminalGateway');
    delete require.cache[authPath];
    delete require.cache[codexPath];
    delete require.cache[sessionManagerPath];
    delete require.cache[gatewayPath];

    const authModule = require(authPath);
    authModule.verifyWsUpgrade = verifyWsUpgrade;

    require.cache[codexPath] = {
        id: codexPath,
        filename: codexPath,
        loaded: true,
        exports: codexServiceClass
    };

    require.cache[sessionManagerPath] = {
        id: sessionManagerPath,
        filename: sessionManagerPath,
        loaded: true,
        exports: {
            summarizeSessionConnections(session) {
                const connections = Array.isArray(session && session.connections)
                    ? session.connections
                    : [];
                return {
                    activeConnectionCount: connections.length,
                    allTls: false,
                    allMtlsAuthorized: false
                };
            }
        }
    };

    return require(gatewayPath);
}

function createMockWss() {
    const handlers = new Map();
    return {
        clients: new Set(),
        on(event, handler) {
            handlers.set(event, handler);
        },
        removeListener(event, handler) {
            if (handlers.get(event) === handler) {
                handlers.delete(event);
            }
        },
        getHandler(event) {
            return handlers.get(event);
        }
    };
}

function createMockWs() {
    const handlers = new Map();
    return {
        sent: [],
        closed: [],
        terminated: false,
        readyState: 1,
        isAlive: false,
        on(event, handler) {
            handlers.set(event, handler);
        },
        send(payload) {
            this.sent.push(JSON.parse(payload));
        },
        close(code, reason) {
            this.closed.push({ code, reason });
        },
        terminate() {
            this.terminated = true;
        },
        ping() {},
        getHandler(event) {
            return handlers.get(event);
        }
    };
}

function createSession(id, options = {}) {
    return {
        id,
        name: options.name || 'Session',
        cwd: options.cwd || 'D:\\workspace\\demo',
        sessionMode: 'codex',
        codexConfig: null,
        connections: [],
        ptyInitialized: true,
        ptyService: {
            write() {},
            resize() {}
        },
        codexState: {
            threadId: options.threadId || null,
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            interactionState: null
        },
        lastCodexThreadId: options.threadId || null
    };
}

function createSessionManager(session) {
    return {
        sessions: new Map([[session.id, session]]),
        broadcasts: [],
        getSession(id) {
            return this.sessions.get(id) || null;
        },
        async createSession() {
            return session;
        },
        addConnection(currentSession, ws) {
            currentSession.connections.push(ws);
        },
        removeConnection(currentSession, ws) {
            currentSession.connections = currentSession.connections.filter((entry) => entry !== ws);
        },
        broadcast(currentSession, envelope) {
            this.broadcasts.push({ sessionId: currentSession.id, envelope });
            currentSession.connections.forEach((ws) => {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify(envelope));
                }
            });
        },
        schedulePersist() {}
    };
}

class MockCodexService extends EventEmitter {
    constructor() {
        super();
        this.requests = [];
        MockCodexService.instances.push(this);
    }

    async ensureStarted() {
        return false;
    }

    request(method, params) {
        this.requests.push({ method, params });
        if (method === 'thread/read') {
            return Promise.resolve({ thread: { id: params.threadId, turns: [] } });
        }
        if (method === 'thread/resume') {
            return Promise.resolve({ thread: { id: params.threadId } });
        }
        return Promise.resolve({});
    }

    stop() {}
}

MockCodexService.instances = [];

MockCodexService.extractThreadId = (message) => {
    const params = message && message.params;
    if (params && typeof params.threadId === 'string' && params.threadId.trim()) {
        return params.threadId.trim();
    }
    return null;
};

async function connectCodexSession(session) {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const sessionManager = createSessionManager(session);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    const ws = createMockWs();
    const req = {
        url: `/ws?sessionId=${session.id}&ticket=dummy`,
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' }
    };

    await wss.getHandler('connection')(ws, req);

    return {
        dispose,
        sessionManager,
        service: MockCodexService.instances[0],
        ws
    };
}

test('thread hub routes existing thread notifications to the current session', async (t) => {
    const session = createSession('codex-session', { threadId: 'thread-existing' });
    const { dispose, service, ws } = await connectCodexSession(session);
    t.after(() => dispose());
    const baselineCount = ws.sent.length;

    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: {
            threadId: 'thread-existing',
            inputTokens: 3
        }
    });

    const newMessages = ws.sent.slice(baselineCount);
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_notification' && entry.params.threadId === 'thread-existing'),
        true
    );
});

test('thread/resume rebinds hub routing from the old thread to the new thread', async (t) => {
    const session = createSession('codex-session', { threadId: 'thread-old' });
    const { dispose, service, ws } = await connectCodexSession(session);
    t.after(() => dispose());

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-resume',
        method: 'thread/resume',
        params: { threadId: 'thread-new' }
    }));

    const baselineCount = ws.sent.length;
    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: { threadId: 'thread-old', inputTokens: 1 }
    });
    service.emit('server_request', {
        requestId: 'req-old',
        handledBy: 'client',
        message: {
            id: 'req-old',
            method: 'execCommandApproval',
            params: { threadId: 'thread-old', command: 'dir' }
        }
    });
    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: { threadId: 'thread-new', inputTokens: 2 }
    });

    const newMessages = ws.sent.slice(baselineCount);
    assert.equal(session.lastCodexThreadId, 'thread-new');
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'req-old'),
        false
    );
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_notification' && entry.params.threadId === 'thread-old'),
        false
    );
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_notification' && entry.params.threadId === 'thread-new'),
        true
    );
});

test('codex_thread_read reads the current thread without creating a thread', async (t) => {
    const session = createSession('codex-session', { threadId: 'thread-read' });
    const { dispose, service, ws } = await connectCodexSession(session);
    t.after(() => dispose());

    await ws.getHandler('message')(JSON.stringify({ type: 'codex_thread_read' }));

    assert.deepEqual(service.requests.map((entry) => entry.method), ['thread/read']);
    assert.equal(service.requests[0].params.threadId, 'thread-read');
    assert.equal(service.requests[0].params.includeTurns, true);
    assert.equal(ws.sent.some((entry) => entry.type === 'codex_thread_snapshot'), true);
});

test('closing a subscriber connection does not clear thread routing state', async (t) => {
    const session = createSession('codex-session', { threadId: 'thread-sticky' });
    const { dispose, service, sessionManager, ws } = await connectCodexSession(session);
    t.after(() => dispose());

    ws.getHandler('close')(1000, Buffer.from('client close'));
    const baselineBroadcastCount = sessionManager.broadcasts.length;

    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: {
            threadId: 'thread-sticky',
            inputTokens: 5
        }
    });

    const newBroadcasts = sessionManager.broadcasts.slice(baselineBroadcastCount);
    assert.equal(session.connections.length, 0);
    assert.equal(session.codexState.threadId, 'thread-sticky');
    assert.equal(
        newBroadcasts.some((entry) => (
            entry.sessionId === 'codex-session' &&
            entry.envelope.type === 'codex_notification' &&
            entry.envelope.params.threadId === 'thread-sticky'
        )),
        true
    );
});
