const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');

function loadGatewayWithMocks({ verifyWsUpgrade, codexServiceClass }) {
    const authPath = require.resolve('../src/auth/basicAuth');
    const codexPath = require.resolve('../src/services/codexAppServerService');
    const gatewayPath = require.resolve('../src/ws/terminalGateway');
    delete require.cache[authPath];
    delete require.cache[codexPath];
    delete require.cache[gatewayPath];

    const authModule = require(authPath);
    authModule.verifyWsUpgrade = verifyWsUpgrade;

    require.cache[codexPath] = {
        id: codexPath,
        filename: codexPath,
        loaded: true,
        exports: codexServiceClass
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
        cwd: options.cwd || null,
        sessionMode: options.sessionMode || 'codex',
        connections: [],
        ptyInitialized: true,
        ptyService: {
            write() {},
            resize() {}
        },
        codexState: options.codexState || {
            threadId: null,
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    };
}

class MockCodexService extends EventEmitter {
    constructor() {
        super();
        this.requests = [];
        this.serverResponses = [];
        MockCodexService.instances.push(this);
    }

    request(method, params) {
        this.requests.push({ method, params });
        if (method === 'thread/start') {
            return Promise.resolve({ thread: { id: `thread-${this.requests.length}` } });
        }
        if (method === 'turn/start') {
            return Promise.resolve({ turn: { id: `turn-${this.requests.length}` } });
        }
        if (method === 'thread/read') {
            return Promise.resolve({ thread: { id: params.threadId, turns: [] } });
        }
        if (method === 'turn/interrupt') {
            return Promise.resolve({});
        }
        return Promise.resolve({});
    }

    respondToServerRequest(requestId, payload) {
        this.serverResponses.push({ requestId, payload });
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

function createSessionManager(...sessions) {
    const sessionMap = new Map(sessions.map((session) => [session.id, session]));
    return {
        sessions: sessionMap,
        getSession(id) {
            return this.sessions.get(id) || null;
        },
        async createSession() {
            return sessions[0] || null;
        },
        addConnection(currentSession, ws) {
            currentSession.connections.push(ws);
        },
        removeConnection(currentSession, ws) {
            currentSession.connections = currentSession.connections.filter((entry) => entry !== ws);
        },
        broadcast(currentSession, envelope) {
            currentSession.connections.forEach((ws) => {
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify(envelope));
                }
            });
        },
        schedulePersist() {}
    };
}

test('codex_new_thread falls back to session cwd when request omits cwd', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', { cwd: 'D:\\workspace\\demo' });
    const sessionManager = createSessionManager(session);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=codex-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    await ws.getHandler('message')(JSON.stringify({ type: 'codex_new_thread' }));

    const service = MockCodexService.instances[0];
    const threadStart = service.requests.find((entry) => entry.method === 'thread/start');
    assert.ok(threadStart, 'thread/start should be invoked');
    assert.equal(threadStart.params.cwd, 'D:\\workspace\\demo');
});

test('codex_set_cwd updates session cwd used by subsequent turn/start', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session');
    const sessionManager = createSessionManager(session);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=codex-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    await ws.getHandler('message')(JSON.stringify({ type: 'codex_set_cwd', cwd: 'E:\\coding\\TermLink' }));
    await ws.getHandler('message')(JSON.stringify({ type: 'codex_turn', text: 'inspect repo' }));

    const service = MockCodexService.instances[0];
    const threadStart = service.requests.find((entry) => entry.method === 'thread/start');
    assert.ok(threadStart, 'thread/start should be invoked');
    assert.equal(threadStart.params.cwd, 'E:\\coding\\TermLink');
    assert.equal(session.cwd, 'E:\\coding\\TermLink');
});

test('codex approval request is forwarded to client and response is returned to bridge', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-1',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    const sessionManager = createSessionManager(session);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=codex-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    const service = MockCodexService.instances[0];
    service.emit('server_request', {
        requestId: 'req-1',
        handledBy: 'client',
        message: {
            id: 'req-1',
            method: 'execCommandApproval',
            params: {
                threadId: 'thread-1',
                command: 'dir'
            }
        }
    });

    const approvalEnvelope = ws.sent.find((entry) => entry.type === 'codex_server_request');
    assert.ok(approvalEnvelope, 'approval request should be sent to websocket client');
    assert.equal(approvalEnvelope.requestId, 'req-1');
    assert.equal(approvalEnvelope.method, 'execCommandApproval');

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_server_request_response',
        requestId: 'req-1',
        result: { decision: 'approved' }
    }));

    assert.deepEqual(service.serverResponses, [{
        requestId: 'req-1',
        payload: {
            result: { decision: 'approved' },
            error: undefined,
            useDefault: false
        }
    }]);
});

test('codex notifications update token usage and account-level rate limit snapshots', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-1',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    const sessionManager = createSessionManager(session);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=codex-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    const service = MockCodexService.instances[0];
    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: {
            inputTokens: 1200,
            outputTokens: 240,
            totalTokens: 1440,
            threadId: 'thread-1'
        }
    });
    service.emit('notification', {
        method: 'account/rateLimits/updated',
        params: {
            remaining: 1,
            limit: 10,
            retryAfterSeconds: 30
        }
    });

    const stateEnvelopes = ws.sent.filter((entry) => entry.type === 'codex_state');
    assert.ok(stateEnvelopes.length >= 3, 'expected updated codex_state envelopes');
    const lastState = stateEnvelopes[stateEnvelopes.length - 1];
    assert.deepEqual(lastState.tokenUsage, {
        inputTokens: 1200,
        outputTokens: 240,
        totalTokens: 1440,
        threadId: 'thread-1'
    });
    assert.deepEqual(lastState.rateLimitState, {
        remaining: 1,
        limit: 10,
        retryAfterSeconds: 30
    });
});

test('account-level rate limit notifications fan out to all connected codex sessions only', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const codexSessionA = createSession('codex-a', {
        sessionMode: 'codex',
        codexState: {
            threadId: 'thread-a',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    const codexSessionB = createSession('codex-b', {
        sessionMode: 'codex',
        codexState: {
            threadId: 'thread-b',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    const terminalSession = createSession('terminal-a', {
        sessionMode: 'terminal',
        codexState: {
            threadId: null,
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    const sessionManager = createSessionManager(codexSessionA, codexSessionB, terminalSession);
    const wss = createMockWss();
    const dispose = registerTerminalGateway(wss, {
        sessionManager,
        heartbeatMs: 3600000,
        privilegeConfig: { isElevated: false, allowedIps: [], privilegeMode: 'standard' }
    });
    t.after(() => dispose());

    const reqA = { url: '/ws?sessionId=codex-a&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    const reqB = { url: '/ws?sessionId=codex-b&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    const reqTerminal = { url: '/ws?sessionId=terminal-a&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    const wsA = createMockWs();
    const wsB = createMockWs();
    const wsTerminal = createMockWs();
    await wss.getHandler('connection')(wsA, reqA);
    await wss.getHandler('connection')(wsB, reqB);
    await wss.getHandler('connection')(wsTerminal, reqTerminal);

    const service = MockCodexService.instances[0];
    service.emit('notification', {
        method: 'account/rateLimits/updated',
        params: {
            remaining: 0,
            limit: 10,
            retryAfterSeconds: 45
        }
    });

    const codexAState = wsA.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    const codexBState = wsB.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    const terminalState = wsTerminal.sent.filter((entry) => entry.type === 'codex_state');
    assert.deepEqual(codexAState.rateLimitState, {
        remaining: 0,
        limit: 10,
        retryAfterSeconds: 45
    });
    assert.deepEqual(codexBState.rateLimitState, {
        remaining: 0,
        limit: 10,
        retryAfterSeconds: 45
    });
    assert.equal(terminalState.length, 0, 'terminal sessions should not receive account-level codex rate limits');
    assert.deepEqual(codexSessionA.codexState.rateLimitState, {
        remaining: 0,
        limit: 10,
        retryAfterSeconds: 45
    });
    assert.deepEqual(codexSessionB.codexState.rateLimitState, {
        remaining: 0,
        limit: 10,
        retryAfterSeconds: 45
    });
});
