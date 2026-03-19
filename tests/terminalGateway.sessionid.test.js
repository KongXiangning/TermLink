const test = require('node:test');
const assert = require('node:assert/strict');

function loadGatewayWithAuthMock(verifyWsUpgrade) {
    const authPath = require.resolve('../src/auth/basicAuth');
    const gatewayPath = require.resolve('../src/ws/terminalGateway');
    delete require.cache[authPath];
    delete require.cache[gatewayPath];

    const authModule = require(authPath);
    authModule.verifyWsUpgrade = verifyWsUpgrade;
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

function createSession(id, name = 'Session') {
    return {
        id,
        name,
        ptyService: {
            write() {},
            resize() {}
        }
    };
}

test('WS without sessionId creates default session', async (t) => {
    const registerTerminalGateway = loadGatewayWithAuthMock(() => true);
    const wss = createMockWss();
    const session = createSession('new-session', 'Default Session');
    const calls = { create: 0, get: 0, add: 0 };

    const sessionManager = {
        getSession() {
            calls.get += 1;
            return null;
        },
        async createSession(options) {
            calls.create += 1;
            calls.createOptions = options;
            return session;
        },
        addConnection(currentSession, ws) {
            calls.add += 1;
            calls.addArgs = [currentSession, ws];
        },
        removeConnection() {}
    };

    const privilegeConfig = { isElevated: false, allowedIps: [], privilegeMode: 'standard' };
    const dispose = registerTerminalGateway(wss, { sessionManager, heartbeatMs: 3600000, privilegeConfig });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    assert.equal(calls.create, 1);
    assert.equal(calls.get, 0);
    assert.equal(calls.add, 1);
    assert.equal(calls.createOptions.name, 'Default Session');
    assert.ok(calls.createOptions.privilegeMetadata);
    assert.equal(calls.createOptions.privilegeMetadata.privilegeLevel, 'STANDARD');
    assert.equal(ws.closed.length, 0);
    assert.equal(ws.sent.length, 1);
    assert.equal(ws.sent[0].type, 'session_info');
    assert.equal(ws.sent[0].sessionId, 'new-session');
    assert.equal(ws.sent[0].privilegeLevel, 'STANDARD');
});

test('WS with valid sessionId reuses existing session', async (t) => {
    const registerTerminalGateway = loadGatewayWithAuthMock(() => true);
    const wss = createMockWss();
    const existing = createSession('existing-session');
    const calls = { create: 0, get: 0, add: 0 };

    const sessionManager = {
        getSession(id) {
            calls.get += 1;
            calls.getId = id;
            return id === 'existing-session' ? existing : null;
        },
        async createSession() {
            calls.create += 1;
            return createSession('unexpected');
        },
        addConnection(session, ws) {
            calls.add += 1;
            calls.addArgs = [session, ws];
        },
        removeConnection() {}
    };

    const privilegeConfig = { isElevated: false, allowedIps: [], privilegeMode: 'standard' };
    const dispose = registerTerminalGateway(wss, { sessionManager, heartbeatMs: 3600000, privilegeConfig });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=existing-session&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    assert.equal(calls.get, 1);
    assert.equal(calls.getId, 'existing-session');
    assert.equal(calls.create, 0);
    assert.equal(calls.add, 1);
    assert.equal(ws.closed.length, 0);
    assert.equal(ws.sent[0].sessionId, 'existing-session');
    assert.equal(ws.sent[0].privilegeLevel, 'STANDARD');
});

test('WS with empty sessionId returns 4404 and does not create session', async (t) => {
    const registerTerminalGateway = loadGatewayWithAuthMock(() => true);
    const wss = createMockWss();
    const calls = { create: 0, get: 0, add: 0 };

    const sessionManager = {
        getSession(id) {
            calls.get += 1;
            calls.getId = id;
            return null;
        },
        async createSession() {
            calls.create += 1;
            return createSession('unexpected');
        },
        addConnection() {
            calls.add += 1;
        },
        removeConnection() {}
    };

    const privilegeConfig = { isElevated: false, allowedIps: [], privilegeMode: 'standard' };
    const dispose = registerTerminalGateway(wss, { sessionManager, heartbeatMs: 3600000, privilegeConfig });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    assert.equal(calls.get, 1);
    assert.equal(calls.getId, '');
    assert.equal(calls.create, 0);
    assert.equal(calls.add, 0);
    assert.equal(ws.closed.length, 1);
    assert.equal(ws.closed[0].code, 4404);
});

test('WS with unknown sessionId returns 4404', async (t) => {
    const registerTerminalGateway = loadGatewayWithAuthMock(() => true);
    const wss = createMockWss();
    const calls = { create: 0, get: 0, add: 0 };

    const sessionManager = {
        getSession(id) {
            calls.get += 1;
            calls.getId = id;
            return null;
        },
        async createSession() {
            calls.create += 1;
            return createSession('unexpected');
        },
        addConnection() {
            calls.add += 1;
        },
        removeConnection() {}
    };

    const privilegeConfig = { isElevated: false, allowedIps: [], privilegeMode: 'standard' };
    const dispose = registerTerminalGateway(wss, { sessionManager, heartbeatMs: 3600000, privilegeConfig });
    t.after(() => dispose());

    const ws = createMockWs();
    const req = { url: '/ws?sessionId=missing&ticket=dummy', headers: { host: 'localhost:3000' }, socket: { remoteAddress: '127.0.0.1' } };
    await wss.getHandler('connection')(ws, req);

    assert.equal(calls.get, 1);
    assert.equal(calls.getId, 'missing');
    assert.equal(calls.create, 0);
    assert.equal(calls.add, 0);
    assert.equal(ws.closed.length, 1);
    assert.equal(ws.closed[0].code, 4404);
});
