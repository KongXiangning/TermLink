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
        codexConfig: options.codexConfig || null,
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
        this.ensureStartedCalls = [];
        this.launchRuntimeConfigSignature = null;
        MockCodexService.instances.push(this);
    }

    async ensureStarted(runtimeConfig) {
        const normalizedConfig = runtimeConfig ?? null;
        const signature = JSON.stringify(normalizedConfig);
        this.ensureStartedCalls.push(normalizedConfig);
        if (this.launchRuntimeConfigSignature === null) {
            this.launchRuntimeConfigSignature = signature;
            return false;
        }
        if (this.launchRuntimeConfigSignature === signature) {
            return false;
        }
        this.launchRuntimeConfigSignature = signature;
        return true;
    }

    request(method, params) {
        this.requests.push({ method, params });
        if (method === 'thread/start') {
            const threadId = `thread-${this.requests.length}`;
            if (params && params.cwd === 'D:\\workspace\\zero-context') {
                return Promise.resolve({
                    thread: {
                        id: threadId,
                        latestTokenUsageInfo: {
                            modelContextWindow: 258000,
                            last: {
                                totalTokens: 0
                            }
                        }
                    }
                });
            }
            return Promise.resolve({ thread: { id: threadId } });
        }
        if (method === 'thread/list') {
            return Promise.resolve({
                threads: [
                    { id: 'thread-a', title: 'Thread A' },
                    { id: 'thread-b', title: 'Thread B' }
                ]
            });
        }
        if (method === 'model/list') {
            return Promise.resolve({
                models: [
                    { id: 'gpt-5-codex' },
                    { id: 'gpt-5' }
                ]
            });
        }
        if (method === 'account/rateLimits/read') {
            return Promise.resolve({
                remaining: 9,
                limit: 10
            });
        }
        if (method === 'turn/start') {
            return Promise.resolve({ turn: { id: `turn-${this.requests.length}` } });
        }
        if (method === 'thread/read') {
            if (params.threadId === 'thread-with-usage') {
                return Promise.resolve({
                    thread: {
                        id: params.threadId,
                        turns: [],
                        latestTokenUsageInfo: {
                            modelContextWindow: 258000,
                            last: {
                                totalTokens: 226000
                            }
                        }
                    }
                });
            }
            return Promise.resolve({ thread: { id: params.threadId, turns: [] } });
        }
        if (method === 'thread/resume') {
            return Promise.resolve({
                thread: {
                    id: params.threadId === 'thread-alias' ? 'thread-canonical' : (params.threadId || 'thread-resumed'),
                    latestTokenUsageInfo: params.threadId === 'thread-with-usage'
                        ? {
                            modelContextWindow: 258000,
                            last: {
                                totalTokens: 226000
                            }
                        }
                        : undefined
                },
                model: params.threadId === 'thread-existing' ? 'gpt-5.4' : undefined
            });
        }
        if (method === 'thread/fork') {
            return Promise.resolve({ thread: { id: `${params.threadId || 'thread'}-fork` } });
        }
        if (method === 'thread/name/set') {
            return Promise.resolve({ ok: true });
        }
        if (method === 'thread/archive' || method === 'thread/unarchive') {
            return Promise.resolve({ ok: true });
        }
        if (method === 'thread/compact/start') {
            return Promise.resolve({ ok: true });
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
    assert.equal(threadStart.params.approvalPolicy, 'never');
    assert.equal(threadStart.params.askForApproval, 'never');
    assert.equal(threadStart.params.sandbox, 'workspace-write');
    assert.equal(threadStart.params.sandboxMode, 'workspace-write');
    assert.equal(session.lastCodexThreadId, 'thread-1');
});

test('session_info includes lastCodexThreadId metadata when available', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        cwd: 'D:\\workspace\\demo'
    });
    session.lastCodexThreadId = 'thread-99';
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

    const sessionInfo = ws.sent.find((entry) => entry.type === 'session_info');
    assert.ok(sessionInfo, 'session_info should be sent to client');
    assert.equal(sessionInfo.lastCodexThreadId, 'thread-99');
    assert.equal(sessionInfo.codexConfig, null);

    const capabilitiesEnvelope = ws.sent.find((entry) => entry.type === 'codex_capabilities');
    assert.ok(capabilitiesEnvelope, 'codex_capabilities should be sent to client');
    assert.deepEqual(capabilitiesEnvelope.capabilities, {
        historyList: true,
        historyResume: true,
        modelConfig: true,
        rateLimitsRead: true,
        approvals: true,
        userInputRequest: true,
        diffPlanReasoning: true,
        slashCommands: true,
        slashModel: true,
        slashPlan: true,
        skillsList: true,
        compact: true,
        imageInput: true
    });
});

test('codex_request rejects methods outside the current whitelist', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-1',
        method: 'thread/rollback'
    }));

    const response = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-1');
    assert.ok(response, 'codex_response should be returned');
    assert.equal(response.error.code, 'CODEX_METHOD_NOT_ALLOWED');

    const service = MockCodexService.instances[0];
    const disallowedCall = service.requests.find((entry) => entry.method === 'thread/rollback');
    assert.equal(disallowedCall, undefined, 'disallowed method must not be forwarded');
});

test('codex_request thread/read does not overwrite lastCodexThreadId', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-current',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    session.lastCodexThreadId = 'thread-current';
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-2',
        method: 'thread/read',
        params: {
            threadId: 'thread-other',
            includeTurns: true
        }
    }));

    assert.equal(session.lastCodexThreadId, 'thread-current');
    assert.equal(session.codexState.threadId, 'thread-current');
});

test('codex_request forwards Phase 1 whitelisted methods', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-3',
        method: 'thread/list',
        params: {
            limit: 20
        }
    }));

    const service = MockCodexService.instances[0];
    const threadListCall = service.requests.find((entry) => entry.method === 'thread/list');
    assert.ok(threadListCall, 'thread/list should be forwarded');

    const response = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-3');
    assert.ok(response, 'codex_response should be returned');
    assert.deepEqual(response.result, {
        threads: [
            { id: 'thread-a', title: 'Thread A' },
            { id: 'thread-b', title: 'Thread B' }
        ]
    });
});

test('codex_request forwards model/list, account/rateLimits/read, and thread/compact/start', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-model',
        method: 'model/list'
    }));
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-limits',
        method: 'account/rateLimits/read'
    }));
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-compact',
        method: 'thread/compact/start',
        params: {
            threadId: 'thread-current'
        }
    }));

    const service = MockCodexService.instances[0];
    assert.ok(service.requests.find((entry) => entry.method === 'model/list'));
    assert.ok(service.requests.find((entry) => entry.method === 'account/rateLimits/read'));
    assert.ok(service.requests.find((entry) => entry.method === 'thread/compact/start'));

    const modelResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-model');
    const limitResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-limits');
    const compactResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-compact');
    assert.deepEqual(modelResponse.result, {
        models: [
            { id: 'gpt-5-codex' },
            { id: 'gpt-5' }
        ]
    });
    assert.deepEqual(limitResponse.result, {
        remaining: 9,
        limit: 10
    });
    assert.deepEqual(compactResponse.result, {
        ok: true
    });
    assert.deepEqual(session.codexState.rateLimitState, {
        remaining: 9,
        limit: 10
    });
    const lastState = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.deepEqual(lastState.rateLimitState, {
        remaining: 9,
        limit: 10
    });
});

test('codex_request forwards thread/fork, thread/name/set, thread/archive, and thread/unarchive', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-fork',
        method: 'thread/fork',
        params: {
            threadId: 'thread-current'
        }
    }));
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-rename',
        method: 'thread/name/set',
        params: {
            threadId: 'thread-current',
            name: 'Renamed Thread',
            title: 'Renamed Thread'
        }
    }));
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-archive',
        method: 'thread/archive',
        params: {
            threadId: 'thread-current'
        }
    }));
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-unarchive',
        method: 'thread/unarchive',
        params: {
            threadId: 'thread-archived'
        }
    }));

    const service = MockCodexService.instances[0];
    assert.ok(service.requests.find((entry) => entry.method === 'thread/fork'));
    assert.ok(service.requests.find((entry) => entry.method === 'thread/name/set'));
    assert.deepEqual(
        service.requests.find((entry) => entry.method === 'thread/name/set').params,
        {
            threadId: 'thread-current',
            name: 'Renamed Thread',
            title: 'Renamed Thread'
        }
    );
    assert.ok(service.requests.find((entry) => entry.method === 'thread/archive'));
    assert.ok(service.requests.find((entry) => entry.method === 'thread/unarchive'));

    const forkResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-fork');
    const renameResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-rename');
    const archiveResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-archive');
    const unarchiveResponse = ws.sent.find((entry) => entry.type === 'codex_response' && entry.requestId === 'req-unarchive');
    assert.deepEqual(forkResponse.result, {
        thread: {
            id: 'thread-current-fork'
        }
    });
    assert.deepEqual(renameResponse.result, { ok: true });
    assert.deepEqual(archiveResponse.result, { ok: true });
    assert.deepEqual(unarchiveResponse.result, { ok: true });
});

test('codex_new_thread uses session codexConfig defaults for thread/start', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        cwd: 'D:\\workspace\\demo',
        codexConfig: {
            defaultModel: 'gpt-5-codex',
            defaultReasoningEffort: 'high',
            defaultPersonality: 'pragmatic',
            approvalPolicy: 'on-request',
            sandboxMode: 'read-only'
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

    await ws.getHandler('message')(JSON.stringify({ type: 'codex_new_thread' }));

    const service = MockCodexService.instances[0];
    const threadStart = service.requests.find((entry) => entry.method === 'thread/start');
    assert.ok(threadStart, 'thread/start should be invoked');
    assert.equal(threadStart.params.model, 'gpt-5-codex');
    assert.equal(threadStart.params.reasoningEffort, 'high');
    assert.equal(threadStart.params.personality, 'pragmatic');
    assert.equal(threadStart.params.approvalPolicy, 'on-request');
    assert.equal(threadStart.params.askForApproval, 'on-request');
    assert.equal(threadStart.params.sandbox, 'read-only');
    assert.equal(threadStart.params.sandboxMode, 'read-only');
});

test('thread/resume rebinds the session so stale old-thread traffic is ignored', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-old',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    session.lastCodexThreadId = 'thread-old';
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-resume',
        method: 'thread/resume',
        params: {
            threadId: 'thread-new'
        }
    }));

    const service = MockCodexService.instances[0];
    const baselineCount = ws.sent.length;

    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: {
            threadId: 'thread-old',
            inputTokens: 10
        }
    });
    service.emit('server_request', {
        requestId: 'req-old-thread',
        handledBy: 'client',
        message: {
            id: 'req-old-thread',
            method: 'execCommandApproval',
            params: {
                threadId: 'thread-old',
                command: 'dir'
            }
        }
    });
    service.emit('notification', {
        method: 'thread/tokenUsage/updated',
        params: {
            threadId: 'thread-new',
            inputTokens: 99
        }
    });

    const newMessages = ws.sent.slice(baselineCount);
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_server_request' && entry.requestId === 'req-old-thread'),
        false
    );
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_notification' && entry.params && entry.params.threadId === 'thread-old'),
        false
    );
    assert.equal(
        newMessages.some((entry) => entry.type === 'codex_notification' && entry.params && entry.params.threadId === 'thread-new'),
        true
    );
    assert.deepEqual(session.codexState.tokenUsage, {
        threadId: 'thread-new',
        inputTokens: 99
    });
});

test('thread/resume clears stale runtime state before emitting the new snapshot', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-old',
            currentTurnId: 'turn-old',
            status: 'running',
            pendingServerRequests: [{ requestId: 'req-old', method: 'execCommandApproval' }],
            tokenUsage: {
                threadId: 'thread-old',
                inputTokens: 120
            },
            rateLimitState: {
                remaining: 2,
                limit: 10
            }
        }
    });
    session.lastCodexThreadId = 'thread-old';
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
    const baselineStateCount = ws.sent.filter((entry) => entry.type === 'codex_state').length;

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_request',
        requestId: 'req-resume-2',
        method: 'thread/resume',
        params: {
            threadId: 'thread-new'
        }
    }));

    assert.equal(session.codexState.threadId, 'thread-new');
    assert.equal(session.codexState.currentTurnId, null);
    assert.equal(session.codexState.status, 'idle');
    assert.deepEqual(session.codexState.pendingServerRequests, []);
    assert.equal(session.codexState.tokenUsage, null);
    assert.deepEqual(session.codexState.rateLimitState, {
        remaining: 2,
        limit: 10
    });

    const stateEnvelopes = ws.sent.filter((entry) => entry.type === 'codex_state');
    assert.ok(stateEnvelopes.length > baselineStateCount, 'resume should emit an updated codex_state');
    const lastState = stateEnvelopes[stateEnvelopes.length - 1];
    assert.equal(lastState.threadId, 'thread-new');
    assert.equal(lastState.currentTurnId, null);
    assert.equal(lastState.status, 'idle');
    assert.equal(lastState.approvalPending, false);
    assert.equal(lastState.pendingServerRequestCount, 0);
    assert.equal(lastState.tokenUsage, null);
    assert.deepEqual(lastState.rateLimitState, {
        remaining: 2,
        limit: 10
    });
});

test('thread/start seeds codex_state token usage when app-server returns latestTokenUsageInfo', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        cwd: 'D:\\workspace\\zero-context'
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_new_thread'
    }));

    assert.deepEqual(session.codexState.tokenUsage, {
        latestTokenUsageInfo: {
            modelContextWindow: 258000,
            last: {
                totalTokens: 0
            }
        }
    });

    const stateEnvelopes = ws.sent.filter((entry) => entry.type === 'codex_state');
    const lastState = stateEnvelopes[stateEnvelopes.length - 1];
    assert.deepEqual(lastState.tokenUsage, {
        latestTokenUsageInfo: {
            modelContextWindow: 258000,
            last: {
                totalTokens: 0
            }
        }
    });
});

test('thread/read syncs latestTokenUsageInfo into codex_state for the current thread', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-with-usage',
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_thread_read'
    }));

    assert.deepEqual(session.codexState.tokenUsage, {
        latestTokenUsageInfo: {
            modelContextWindow: 258000,
            last: {
                totalTokens: 226000
            }
        }
    });

    const stateEnvelopes = ws.sent.filter((entry) => entry.type === 'codex_state');
    const lastState = stateEnvelopes[stateEnvelopes.length - 1];
    assert.deepEqual(lastState.tokenUsage, {
        latestTokenUsageInfo: {
            modelContextWindow: 258000,
            last: {
                totalTokens: 226000
            }
        }
    });
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

test('codex_set_interaction_state is persisted into codex_state snapshots', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_set_interaction_state',
        interactionState: {
            planMode: true,
            activeSkill: 'refactor'
        }
    }));

    const stateEnvelope = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.deepEqual(stateEnvelope.interactionState, {
        planMode: true,
        activeSkill: 'refactor'
    });
    assert.deepEqual(stateEnvelope.nextTurnEffectiveCodexConfig, {
        model: null,
        reasoningEffort: null,
        personality: null,
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    });
});

test('codex_turn forwards overrides and collaborationMode to turn/start and clears server planMode snapshot', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            defaultModel: 'gpt-5',
            defaultReasoningEffort: 'medium',
            defaultPersonality: 'pragmatic',
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: null,
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            interactionState: {
                planMode: true,
                activeSkill: 'android-local-build-debug'
            }
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        model: 'gpt-5-codex',
        reasoningEffort: 'high',
        collaborationMode: 'plan'
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.model, undefined);
    assert.equal(turnStart.params.reasoningEffort, undefined);
    assert.deepEqual(turnStart.params.collaborationMode, {
        mode: 'plan',
        settings: {
            model: 'gpt-5-codex',
            reasoning_effort: 'high',
            developer_instructions: null
        }
    });
    assert.equal(turnStart.params.personality, 'pragmatic');

    const lastState = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.deepEqual(lastState.interactionState, {
        planMode: false,
        activeSkill: null
    });
});

test('codex_turn upgrades structured collaborationMode with session defaults before turn/start', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            defaultModel: 'gpt-5',
            defaultReasoningEffort: 'medium',
            defaultPersonality: 'pragmatic'
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        collaborationMode: {
            mode: 'plan',
            settings: {
                model: '',
                reasoning_effort: null,
                developer_instructions: null
            }
        }
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.model, undefined);
    assert.equal(turnStart.params.reasoningEffort, undefined);
    assert.deepEqual(turnStart.params.collaborationMode, {
        mode: 'plan',
        settings: {
            model: 'gpt-5',
            reasoning_effort: 'medium',
            developer_instructions: null
        }
    });
});

test('codex_turn resumes an existing thread to recover its model before turn/start', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-existing',
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo'
    }));

    const service = MockCodexService.instances[0];
    const resumeCall = service.requests.find((entry) => entry.method === 'thread/resume');
    assert.ok(resumeCall, 'thread/resume should be invoked when an existing thread has no configured model');
    assert.equal(resumeCall.params.threadId, 'thread-existing');

    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.model, 'gpt-5.4');
    assert.equal(turnStart.params.approvalPolicy, 'never');
    assert.equal(turnStart.params.askForApproval, 'never');
    assert.equal(turnStart.params.sandbox, 'workspace-write');
    assert.equal(turnStart.params.sandboxMode, 'workspace-write');

    const stateEnvelope = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.equal(stateEnvelope.nextTurnEffectiveCodexConfig.model, 'gpt-5.4');
});

test('codex_turn sandbox override maps workspace-write to on-request approval for blocking prompts', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-existing',
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        sandbox: 'workspace-write'
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.approvalPolicy, 'on-request');
    assert.equal(turnStart.params.askForApproval, 'on-request');
    assert.equal(turnStart.params.sandbox, 'workspace-write');
    assert.equal(turnStart.params.sandboxMode, 'workspace-write');
});

test('codex_turn sandbox override maps danger-full-access to never approval for full access prompts', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-existing',
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        sandbox: 'danger-full-access'
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.deepEqual(service.ensureStartedCalls.at(-1), {
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    });
    assert.equal(turnStart.params.approvalPolicy, 'never');
    assert.equal(turnStart.params.askForApproval, 'never');
    assert.equal(turnStart.params.sandbox, 'danger-full-access');
    assert.equal(turnStart.params.sandboxMode, 'danger-full-access');
});

test('codex_turn sandbox override starts a fresh thread when legacy thread context signature is missing', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        cwd: 'D:\\workspace\\demo',
        codexConfig: {
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-legacy',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            threadExecutionContextSignature: null
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        sandbox: 'danger-full-access'
    }));

    const service = MockCodexService.instances[0];
    const threadStart = service.requests.find((entry) => entry.method === 'thread/start');
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(threadStart, 'thread/start should be invoked for legacy threads without execution context signature');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(threadStart.params.approvalPolicy, 'never');
    assert.equal(threadStart.params.sandbox, 'danger-full-access');
    assert.equal(turnStart.params.threadId, 'thread-1');
    assert.equal(session.codexState.threadId, 'thread-1');
});

test('codex_turn starts a fresh thread when the stored execution context no longer matches session permissions', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        cwd: 'D:\\workspace\\demo',
        codexConfig: {
            defaultModel: 'gpt-5.4',
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        },
        codexState: {
            threadId: 'thread-existing',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            threadExecutionContextSignature: '{"cwd":"D:\\\\workspace\\\\demo","approvalPolicy":"on-request","sandboxMode":"workspace-write"}'
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo'
    }));

    const service = MockCodexService.instances[0];
    const threadStart = service.requests.find((entry) => entry.method === 'thread/start');
    assert.ok(threadStart, 'thread/start should be invoked when execution context changes');
    assert.equal(threadStart.params.approvalPolicy, 'never');
    assert.equal(threadStart.params.sandbox, 'danger-full-access');

    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.threadId, 'thread-1');
    assert.equal(session.codexState.threadId, 'thread-1');
    assert.equal(
        session.codexState.threadExecutionContextSignature,
        '{"cwd":"D:\\\\workspace\\\\demo","approvalPolicy":"never","sandboxMode":"danger-full-access"}'
    );
});

test('codex_turn uses resumed canonical thread id for turn/start and final session state', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-alias',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null
        }
    });
    session.lastCodexThreadId = 'thread-alias';
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo'
    }));

    const service = MockCodexService.instances[0];
    const resumeCall = service.requests.find((entry) => entry.method === 'thread/resume');
    assert.ok(resumeCall, 'thread/resume should be invoked');
    assert.equal(resumeCall.params.threadId, 'thread-alias');

    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.threadId, 'thread-canonical');

    assert.equal(session.codexState.threadId, 'thread-canonical');
    assert.equal(session.lastCodexThreadId, 'thread-canonical');

    const ack = ws.sent.findLast((entry) => entry.type === 'codex_turn_ack');
    assert.ok(ack, 'codex_turn_ack should be sent');
    assert.equal(ack.threadId, 'thread-canonical');
});

test('codex gateway does not emit debug console logs for plan notifications or codex_turn payloads', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexState: {
            threadId: 'thread-quiet',
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

    const originalConsoleLog = console.log;
    const loggedMessages = [];
    console.log = (...args) => {
        loggedMessages.push(args.map((value) => String(value)).join(' '));
    };
    t.after(() => {
        console.log = originalConsoleLog;
    });

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=codex-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    const service = MockCodexService.instances[0];
    service.emit('notification', {
        method: 'plan/update',
        params: {
            threadId: 'thread-quiet',
            prompt: 'sensitive prompt'
        }
    });

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        collaborationMode: 'plan'
    }));

    assert.deepEqual(loggedMessages, []);
});

test('codex_turn skips thread/resume when turn override model is provided', async (t) => {
    MockCodexService.instances.length = 0;
    const registerTerminalGateway = loadGatewayWithMocks({
        verifyWsUpgrade: () => true,
        codexServiceClass: MockCodexService
    });
    const session = createSession('codex-session', {
        codexConfig: {
            approvalPolicy: 'never',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-existing',
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'inspect repo',
        model: 'gpt-5'
    }));

    const service = MockCodexService.instances[0];
    const resumeCall = service.requests.find((entry) => entry.method === 'thread/resume');
    assert.equal(resumeCall, undefined);

    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.equal(turnStart.params.model, 'gpt-5');
});

test('codex_turn forwards image and localImage inputs to turn/start', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'check these images',
        attachments: [
            { type: 'image', url: 'https://example.com/shot.png' },
            { type: 'localImage', path: 'E:\\project\\shot.png' }
        ]
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.deepEqual(turnStart.params.input, [
        {
            type: 'text',
            text: 'check these images',
            text_elements: []
        },
        {
            type: 'image',
            url: 'https://example.com/shot.png'
        },
        {
            type: 'localImage',
            path: 'E:\\project\\shot.png'
        }
    ]);
});

test('codex_turn accepts image-only input when attachments are present', async (t) => {
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

    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: '',
        attachments: [
            { type: 'localImage', path: 'E:\\project\\only-image.png' }
        ]
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should still be invoked for image-only input');
    assert.deepEqual(turnStart.params.input, [
        {
            type: 'localImage',
            path: 'E:\\project\\only-image.png'
        }
    ]);
});

test('codex_turn forwards localImage with data URL (url field)', async (t) => {
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

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await ws.getHandler('message')(JSON.stringify({
        type: 'codex_turn',
        text: 'analyze this image',
        attachments: [
            { type: 'localImage', url: dataUrl, name: 'test.png' }
        ]
    }));

    const service = MockCodexService.instances[0];
    const turnStart = service.requests.find((entry) => entry.method === 'turn/start');
    assert.ok(turnStart, 'turn/start should be invoked');
    assert.deepEqual(turnStart.params.input, [
        {
            type: 'text',
            text: 'analyze this image',
            text_elements: []
        },
        {
            type: 'localImage',
            url: dataUrl
        }
    ]);
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
    assert.equal(approvalEnvelope.requestKind, 'command');
    assert.equal(approvalEnvelope.responseMode, 'decision');
    assert.equal(approvalEnvelope.summary, 'dir');
    assert.deepEqual(session.codexState.pendingServerRequests, [{
        requestId: 'req-1',
        method: 'execCommandApproval',
        requestKind: 'command',
        responseMode: 'decision',
        summary: 'dir',
        params: {
            threadId: 'thread-1',
            command: 'dir'
        }
    }]);
    const pendingStateEnvelope = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.deepEqual(pendingStateEnvelope.pendingServerRequests, [{
        requestId: 'req-1',
        method: 'execCommandApproval',
        requestKind: 'command',
        responseMode: 'decision',
        summary: 'dir',
        params: {
            threadId: 'thread-1',
            command: 'dir'
        }
    }]);

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
    const resolvedStateEnvelope = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.deepEqual(resolvedStateEnvelope.pendingServerRequests, []);
});

test('user input server request is deferred to client with answers response mode', async (t) => {
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
        requestId: 'req-user-1',
        handledBy: 'client',
        requestKind: 'userInput',
        responseMode: 'answers',
        message: {
            id: 'req-user-1',
            method: 'item/tool/requestUserInput',
            params: {
                threadId: 'thread-1',
                questions: [
                    {
                        id: 'choice',
                        question: 'Proceed with deployment?',
                        options: [{ label: 'Approve' }, { label: 'Reject' }]
                    }
                ]
            }
        }
    });

    const requestEnvelope = ws.sent.find((entry) => entry.type === 'codex_server_request' && entry.requestId === 'req-user-1');
    assert.ok(requestEnvelope, 'user input server request should be sent to websocket client');
    assert.equal(requestEnvelope.requestKind, 'userInput');
    assert.equal(requestEnvelope.responseMode, 'answers');
    assert.equal(requestEnvelope.summary, 'Proceed with deployment?');
    assert.equal(requestEnvelope.questionCount, 1);
    assert.equal(requestEnvelope.handledBy, 'client');
    assert.deepEqual(session.codexState.pendingServerRequests, [{
        requestId: 'req-user-1',
        method: 'item/tool/requestUserInput',
        requestKind: 'userInput',
        responseMode: 'answers',
        summary: 'Proceed with deployment?',
        params: {
            threadId: 'thread-1',
            questions: [
                {
                    id: 'choice',
                    question: 'Proceed with deployment?',
                    options: [{ label: 'Approve' }, { label: 'Reject' }]
                }
            ]
        }
    }]);
    const lastState = ws.sent.filter((entry) => entry.type === 'codex_state').at(-1);
    assert.equal(lastState.pendingServerRequestCount, 1);
    assert.deepEqual(lastState.pendingServerRequests, [{
        requestId: 'req-user-1',
        method: 'item/tool/requestUserInput',
        requestKind: 'userInput',
        responseMode: 'answers',
        summary: 'Proceed with deployment?',
        params: {
            threadId: 'thread-1',
            questions: [
                {
                    id: 'choice',
                    question: 'Proceed with deployment?',
                    options: [{ label: 'Approve' }, { label: 'Reject' }]
                }
            ]
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
            threadId: 'thread-1',
            turnId: 'turn-1',
            tokenUsage: {
                modelContextWindow: 258000,
                last: {
                    cachedInputTokens: 100,
                    inputTokens: 1200,
                    outputTokens: 240,
                    reasoningOutputTokens: 0,
                    totalTokens: 1440
                },
                total: {
                    cachedInputTokens: 100,
                    inputTokens: 1200,
                    outputTokens: 240,
                    reasoningOutputTokens: 0,
                    totalTokens: 1440
                }
            }
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
        modelContextWindow: 258000,
        last: {
            cachedInputTokens: 100,
            inputTokens: 1200,
            outputTokens: 240,
            reasoningOutputTokens: 0,
            totalTokens: 1440
        },
        total: {
            cachedInputTokens: 100,
            inputTokens: 1200,
            outputTokens: 240,
            reasoningOutputTokens: 0,
            totalTokens: 1440
        }
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
