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

function createSessionManager(input) {
    const sessions = Array.isArray(input) ? input : [input];
    return {
        sessions: new Map(sessions.map((session) => [session.id, session])),
        broadcasts: [],
        getSession(id) {
            return this.sessions.get(id) || null;
        },
        async createSession() {
            return sessions[0];
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
    const { dispose, sessionManager, service, connections } = await connectCodexSessions([session]);
    return {
        dispose,
        sessionManager,
        service,
        ws: connections.get(session.id)
    };
}

async function connectCodexSessions(sessions) {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const sessionManager = createSessionManager(sessions);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    const connections = new Map();
    for (const session of sessions) {
        const ws = createMockWs();
        const req = {
            url: `/ws?sessionId=${session.id}&ticket=dummy`,
            headers: { host: 'localhost:3000' },
            socket: { remoteAddress: '127.0.0.1' }
        };
        await wss.getHandler('connection')(ws, req);
        connections.set(session.id, ws);
    }

    return {
        dispose,
        sessionManager,
        service: MockCodexService.instances[0],
        connections
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

test('thread/read attaches a follower session and fans out live notification/state without replacing actor', async (t) => {
    const actorSession = createSession('actor-session', { threadId: 'thread-live' });
    actorSession.codexState.currentTurnId = 'turn-live';
    actorSession.codexState.status = 'running';
    const followerSession = createSession('follower-session', { threadId: null });
    followerSession.lastCodexThreadId = null;

    const { dispose, service, connections } = await connectCodexSessions([actorSession, followerSession]);
    t.after(() => dispose());
    const actorWs = connections.get(actorSession.id);
    const followerWs = connections.get(followerSession.id);

    await followerWs.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-follow-read',
        method: 'thread/read',
        params: { threadId: 'thread-live', includeTurns: true }
    }));

    const followerMessagesAfterRead = followerWs.sent.slice();
    assert.equal(
        followerMessagesAfterRead.some((entry) => (
            entry.type === 'codex_state'
            && entry.threadId === 'thread-live'
            && entry.currentTurnId === 'turn-live'
            && entry.status === 'running'
        )),
        true
    );
    assert.equal(followerSession.lastCodexThreadId, null);
    assert.equal(actorSession.lastCodexThreadId, 'thread-live');

    const actorBaseline = actorWs.sent.length;
    const followerBaseline = followerWs.sent.length;

    service.emit('server_request', {
        requestId: 'approval-1',
        handledBy: 'client',
        message: {
            id: 'approval-1',
            method: 'execCommandApproval',
            params: { threadId: 'thread-live', command: 'dir' }
        }
    });
    service.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'thread-live',
            turn: { id: 'turn-live' }
        }
    });

    const actorMessages = actorWs.sent.slice(actorBaseline);
    const followerMessages = followerWs.sent.slice(followerBaseline);
    assert.equal(
        actorMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'approval-1'),
        true
    );
    assert.equal(
        followerMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'approval-1'),
        false
    );
    assert.equal(
        actorMessages.some((entry) => (
            entry.type === 'codex_notification'
            && entry.method === 'turn/completed'
            && entry.params.threadId === 'thread-live'
        )),
        true
    );
    assert.equal(
        followerMessages.some((entry) => (
            entry.type === 'codex_notification'
            && entry.method === 'turn/completed'
            && entry.params.threadId === 'thread-live'
        )),
        true
    );
    assert.equal(
        followerMessages.some((entry) => (
            entry.type === 'codex_state'
            && entry.threadId === 'thread-live'
            && entry.currentTurnId === null
            && entry.status === 'idle'
        )),
        true
    );
});

test('follower codex_turn keeps original actor subscribed to subsequent thread notifications', async (t) => {
    const actorSession = createSession('actor-session', { threadId: 'thread-live' });
    actorSession.codexState.currentTurnId = 'turn-live';
    actorSession.codexState.status = 'running';
    const followerSession = createSession('follower-session', { threadId: null });

    const { dispose, service, connections } = await connectCodexSessions([actorSession, followerSession]);
    t.after(() => dispose());
    const actorWs = connections.get(actorSession.id);
    const followerWs = connections.get(followerSession.id);

    await followerWs.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-follow-read',
        method: 'thread/read',
        params: { threadId: 'thread-live', includeTurns: true }
    }));

    await followerWs.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'rerun from follower',
        threadId: 'thread-live'
    }));

    const followerTurnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.equal(followerTurnStart.params.threadId, 'thread-live');

    const actorBaseline = actorWs.sent.length;
    const followerBaseline = followerWs.sent.length;

    service.emit('server_request', {
        requestId: 'approval-2',
        handledBy: 'client',
        message: {
            id: 'approval-2',
            method: 'execCommandApproval',
            params: { threadId: 'thread-live', command: 'dir' }
        }
    });
    service.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'thread-live',
            turn: { id: 'turn-follow' }
        }
    });

    const actorMessages = actorWs.sent.slice(actorBaseline);
    const followerMessages = followerWs.sent.slice(followerBaseline);
    assert.equal(
        followerMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'approval-2'),
        true
    );
    assert.equal(
        actorMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'approval-2'),
        false
    );
    assert.equal(
        actorMessages.some((entry) => (
            entry.type === 'codex_notification'
            && entry.method === 'turn/completed'
            && entry.params.threadId === 'thread-live'
        )),
        true
    );
    assert.equal(
        followerMessages.some((entry) => (
            entry.type === 'codex_notification'
            && entry.method === 'turn/completed'
            && entry.params.threadId === 'thread-live'
        )),
        true
    );
});
