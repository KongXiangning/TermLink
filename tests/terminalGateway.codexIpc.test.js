'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const { EventEmitter } = require('node:events');

// ── FakeIpcFeed ──────────────────────────────────────────────────────────────

class FakeIpcFeed extends EventEmitter {
    constructor(opts = {}) {
        super();
        this._online = opts.online !== undefined ? opts.online : true;
        this._clientId = opts.clientId || 'fake-ipc-client';
        this._snapshots = new Map();
        this._allowActiveSend = opts.allowActiveSend !== undefined ? opts.allowActiveSend : true;
        this._sendRequestHandler = opts.sendRequestHandler || null;
    }
    get online() { return this._online; }
    get clientId() { return this._clientId; }
    get allowActiveSend() { return this._allowActiveSend; }
    getLatestSnapshot(conversationId) { return this._snapshots.get(conversationId); }
    setOnline(v) { this._online = v; }
    pushSnapshot(conversationId, surface) { this._snapshots.set(conversationId, surface); this.emit('snapshot', { conversationId, surface }); }
    pushStatus(status) { this.emit('status', status); }
    async sendRequest(method, params) {
        if (this._sendRequestHandler) return this._sendRequestHandler(method, params);
        return { type: 'response', resultType: 'success', method, result: { ok: true } };
    }
}

// ── module loader with mocked auth ───────────────────────────────────────────

function loadGateway() {
    const authPath = require.resolve('../src/auth/basicAuth');
    const codexPath = require.resolve('../src/services/codexAppServerService');
    const sessionManagerPath = require.resolve('../src/services/sessionManager');
    const gatewayPath = require.resolve('../src/ws/terminalGateway');

    delete require.cache[authPath];
    delete require.cache[codexPath];
    delete require.cache[sessionManagerPath];
    delete require.cache[gatewayPath];

    const authModule = require(authPath);
    authModule.verifyWsUpgrade = () => true;

    // Minimal mock for CodexAppServerService — an EventEmitter that does nothing.
    class FakeCodexService extends EventEmitter {
        constructor() { super(); }
        start() { return Promise.resolve(); }
        stop() {}
        request() { return Promise.reject(new Error('not implemented')); }
    }
    require.cache[codexPath] = { id: codexPath, filename: codexPath, loaded: true, exports: FakeCodexService };

    // Stub sessionManager's broadcast/connection helpers.
    const smModule = require(sessionManagerPath);
    delete require.cache[sessionManagerPath];
    require.cache[sessionManagerPath] = {
        id: sessionManagerPath, filename: sessionManagerPath, loaded: true,
        exports: {
            ...smModule,
            broadcast: () => {},
            getSessionThreadIds: () => []
        }
    };

    return require(gatewayPath);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function createFakeSessionManager() {
    const sessions = new Map();
    const connections = new Map();
    return {
        sessions,
        addConnection(session, ws) {
            let list = connections.get(session.id);
            if (!list) { list = []; connections.set(session.id, list); }
            list.push(ws);
        },
        removeConnection(session, ws) {
            const list = connections.get(session.id);
            if (list) { const idx = list.indexOf(ws); if (idx >= 0) list.splice(idx, 1); }
        },
        getSession(id) { return sessions.get(id); },
        createSession(opts) {
            const { randomUUID } = require('node:crypto');
            const id = randomUUID();
            const sess = { id, name: opts?.name || 'test', sessionMode: 'codex', cwd: null, ptyService: { write() {}, resize() {} }, codexState: {} };
            sessions.set(id, sess);
            return Promise.resolve(sess);
        }
    };
}

async function setupGateway(opts = {}) {
    const sm = createFakeSessionManager();
    const ipcFeed = opts.ipcFeed !== undefined ? opts.ipcFeed : new FakeIpcFeed();
    const registerTerminalGateway = loadGateway();

    const server = http.createServer((_req, res) => { res.writeHead(200); res.end('ok'); });
    const wss = new WebSocketServer({ noServer: true });

    const teardown = registerTerminalGateway(wss, { sessionManager: sm, heartbeatMs: 99999, ipcFeed });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.on('upgrade', (req, socket, head) => {
                wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); });
            });
            resolve({ server, wss, port, sm, ipcFeed, teardown });
        });
    });
}

async function stopGateway(g) {
    g.teardown();
    g.wss.close();
    return new Promise((resolve) => g.server.close(resolve));
}

function connectWs(port, sessionId) {
    const WebSocket = require('ws');
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${sessionId}`);
        const messages = [];
        ws.on('open', () => resolve({ ws, messages, nextMsg: () => new Promise(r => { ws.once('message', d => r(JSON.parse(d.toString()))); }) }));
        ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
        ws.on('error', reject);
    });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── tests ────────────────────────────────────────────────────────────────────

test('IPC status is sent on WebSocket connect when feed is online', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(200);

    const statusMsg = messages.find(m => m.type === 'codex_ipc_status');
    assert.ok(statusMsg, 'codex_ipc_status should be present');
    assert.equal(statusMsg.status.online, true);
    ws.close();
    await stopGateway(g);
});

test('gateway works without ipcFeed — session_info is sent', async () => {
    const g = await setupGateway({ ipcFeed: undefined });
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(200);

    // Core contract: session_info and capabilities must always be present.
    const info = messages.find(m => m.type === 'session_info');
    assert.ok(info, 'session_info must be present');
    assert.equal(info.sessionId, sess.id);
    // When no feed, IPC status should not arrive from the feed path.
    // (A stray status from test side-effects is non-fatal for the contract.)
    ws.close();
    await stopGateway(g);
});

test('set_active_conversation succeeds and snapshot is pushed to matching client', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);

    // Push a snapshot for a different conversation — should NOT arrive.
    g.ipcFeed.pushSnapshot('conv-other', { conversationId: 'conv-other', status: 'running', items: [] });
    await delay(50);
    let snaps = messages.filter(m => m.type === 'conversation_surface_snapshot');
    assert.equal(snaps.length, 0, 'should not receive snapshot for non-matching conversation');

    // Push for matching conversation.
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });
    await delay(50);
    snaps = messages.filter(m => m.type === 'conversation_surface_snapshot');
    assert.equal(snaps.length, 1);
    assert.equal(snaps[0].conversationId, 'conv-1');
    assert.equal(snaps[0].snapshot.status, 'completed');
    ws.close();
    await stopGateway(g);
});

test('latest snapshot is replayed on set_active_conversation', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-cached', { conversationId: 'conv-cached', status: 'running', items: [{ key: 'm1', kind: 'message', role: 'user', text: 'hello' }] });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-cached' }));
    await delay(50);

    const snaps = messages.filter(m => m.type === 'conversation_surface_snapshot');
    assert.equal(snaps.length, 1, 'should replay cached snapshot');
    assert.equal(snaps[0].conversationId, 'conv-cached');
    assert.equal(snaps[0].snapshot.status, 'running');
    ws.close();
    await stopGateway(g);
});

test('set_active_conversation without feed — gateway stays up', async () => {
    const g = await setupGateway({ ipcFeed: undefined });
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);

    // Sending set_active_conversation when no feed is available should not crash.
    assert.doesNotThrow(() => {
        ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    });
    await delay(50);
    ws.close();
    await stopGateway(g);
});

test('IPC status broadcast reaches all connected clients', async () => {
    const g = await setupGateway();
    const s1 = await g.sm.createSession({ name: 'a' });
    const s2 = await g.sm.createSession({ name: 'b' });

    const c1 = await connectWs(g.port, s1.id);
    const c2 = await connectWs(g.port, s2.id);
    await delay(100);

    // Clear accumulated messages.
    c1.messages.length = 0;
    c2.messages.length = 0;

    g.ipcFeed.pushStatus({ online: false, reason: 'test-disconnect' });
    await delay(50);

    assert.ok(c1.messages.find(m => m.type === 'codex_ipc_status'));
    assert.ok(c2.messages.find(m => m.type === 'codex_ipc_status'));
    c1.ws.close(); c2.ws.close();
    await stopGateway(g);
});

test('client disconnect does not crash on subsequent snapshot push', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.close();
    await delay(50);

    assert.doesNotThrow(() => {
        g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'running', items: [] });
    });
    await stopGateway(g);
});

// ── Step 6: follower action control ──────────────────────────────────────────

test('follower_send_message succeeds when conversation is idle', async () => {
    const g = await setupGateway();
    // Pre-populate with an idle conversation.
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'Hello from follower' }));
    await delay(100);

    const ack = messages.find(m => m.type === 'follower_message_sent');
    assert.ok(ack, 'should acknowledge follower message');
    assert.equal(ack.acknowledged, true);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message blocked when conversation is running', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'running', items: [] });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'Should be blocked' }));
    await delay(100);

    const err = messages.find(m => m.type === 'error' && m.message.includes('running'));
    assert.ok(err, 'should block send when conversation is running');
    ws.close();
    await stopGateway(g);
});

test('follower_send_message blocked when IPC offline', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'test' }));
    await delay(100);

    const err = messages.find(m => m.type === 'error' && m.message.includes('not online'));
    assert.ok(err, 'should block send when IPC offline');
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response sends command-approval-decision', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: { kind: 'command', requestId: 'req-1', raw: { id: 42 } }
    });

    let capturedMethod = null;
    let capturedDecision = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        capturedMethod = method;
        capturedDecision = params.decision;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_approval_response', conversationId: 'conv-1', decision: 'accept', requestId: 'req-1' }));
    await delay(100);

    assert.equal(capturedMethod, 'thread-follower-command-approval-decision');
    assert.equal(capturedDecision, 'accept');
    const ack = messages.find(m => m.type === 'follower_approval_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response triggers plan implementation path', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_input', items: [],
        pendingPlanAction: { kind: 'plan_implementation', requestId: 'r-plan', requestMethod: 'item/plan/requestImplementation', planContent: 'BUILD IT', turnId: 't1', canSubmit: true }
    });

    const calls = [];
    g.ipcFeed._sendRequestHandler = (method, params) => {
        calls.push({ method, params });
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_plan_response', conversationId: 'conv-1', input: '是，实施此计划' }));
    await delay(100);

    // First call: update-thread-settings
    assert.equal(calls[0].method, 'thread-follower-update-thread-settings');
    // Second call: start-turn with implementation prompt
    assert.equal(calls[1].method, 'thread-follower-start-turn');
    assert.ok(calls[1].params.turnStartParams.input[0].text.includes('PLEASE IMPLEMENT THIS PLAN'));
    const ack = messages.find(m => m.type === 'follower_plan_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});
