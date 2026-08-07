'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const { EventEmitter } = require('node:events');

test('metadata-only history projection strips turns and inline media from the mobile response', () => {
    const registerTerminalGateway = loadGateway();
    const response = registerTerminalGateway.projectMetadataOnlyThreadResponse({
        thread: {
            id: 'conversation',
            title: 'large history',
            historyMode: 'paginated',
            turns: [{ id: 'turn', items: [{ type: 'agentMessage', text: 'x'.repeat(1024) }] }],
            turnHistory: { entitiesByKey: { turn: { id: 'turn' } } },
            conversationState: { turns: [{ id: 'turn' }] },
            tokenUsage: { total: 3 }
        }
    });
    assert.equal(response.metadataOnly, true);
    assert.deepEqual(response.thread, {
        id: 'conversation',
        title: 'large history',
        historyMode: 'paginated',
        tokenUsage: { total: 3 }
    });
    assert.deepEqual(
        registerTerminalGateway.projectMetadataOnlyThreadResponse({ data: [{ turns: ['must not leak'] }] }),
        { thread: {}, metadataOnly: true }
    );
});

test('metadata-only Android thread list strips turns and attachments', () => {
    const registerTerminalGateway = loadGateway();
    const result = registerTerminalGateway.projectMetadataOnlyThreadListResponse({
        data: [{
            id: 'thread-1',
            title: 'History',
            cwd: 'E:\\workspace',
            turns: [{ items: [{ text: 'must not cross the list response' }] }],
            attachments: [{ bytes: 'x'.repeat(1024) }]
        }],
        total: 1
    });
    assert.deepEqual(result, {
        total: 1,
        data: [{ id: 'thread-1', title: 'History', cwd: 'E:\\workspace' }]
    });
});

test('Android WebSocket envelopes are rejected before an oversized response is sent', () => {
    const registerTerminalGateway = loadGateway();
    const sent = [];
    const closed = [];
    const ws = {
        readyState: 1,
        codexClientType: 'android',
        send(payload) { sent.push(JSON.parse(payload)); },
        close(code, reason) { closed.push({ code, reason }); }
    };
    const accepted = registerTerminalGateway.sendWsEnvelope(ws, {
        type: 'codex_response',
        requestId: 'large-read',
        method: 'thread/list',
        result: { data: [{ preview: 'x'.repeat(registerTerminalGateway.MAX_WS_ENVELOPE_BYTES) }] }
    });
    assert.equal(accepted, false);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].error?.code, 'CODEX_ENVELOPE_TOO_LARGE');
    assert.equal(closed.length, 0);
});

test('Gateway projection queue serializes work and keeps only the newest pending revision', async () => {
    const registerTerminalGateway = loadGateway();
    const started = [];
    let releaseFirst;
    const firstFinished = new Promise((resolve) => { releaseFirst = resolve; });
    const queue = registerTerminalGateway.createLatestOnlyAsyncQueue(async (value) => {
        started.push(value);
        if (value === 'first') await firstFinished;
    });

    const first = queue.enqueue('first');
    await new Promise((resolve) => setImmediate(resolve));
    const replaced = queue.enqueue('replaced');
    const newest = queue.enqueue('newest');
    releaseFirst();

    const results = await Promise.all([first, replaced, newest]);
    assert.deepEqual(started, ['first', 'newest']);
    assert.equal(results[1].skipped, true);
    assert.equal(results[2].skipped, false);
});

const activeGateways = new Set();
const fakeCodexServices = [];

// ── FakeIpcFeed ──────────────────────────────────────────────────────────────

class FakeIpcFeed extends EventEmitter {
    constructor(opts = {}) {
        super();
        this._online = opts.online !== undefined ? opts.online : true;
        this._clientId = opts.clientId || 'fake-ipc-client';
        this._snapshots = new Map();
        this._allowActiveSend = opts.allowActiveSend !== undefined ? opts.allowActiveSend : true;
        this._sendRequestHandler = opts.sendRequestHandler || null;
        this._replayOnFollow = opts.replayOnFollow !== undefined ? opts.replayOnFollow : true;
        this.followCalls = [];
        this.unfollowCalls = [];
        this.broadcastCalls = [];
        this.requestHandlers = new Map();
    }
    get online() { return this._online; }
    get clientId() { return this._clientId; }
    get allowActiveSend() { return this._allowActiveSend; }
    isOnline() { return this._online; }
    getStatus() { return { online: this._online, clientId: this._online ? this._clientId : undefined }; }
    getLatestSnapshot(conversationId) { return this._snapshots.get(conversationId); }
    getRecentSnapshots() {
        return Array.from(this._snapshots.entries()).map(([conversationId, surface]) => ({
            conversationId,
            surface,
            timestamp: surface.updatedAt || Date.now()
        }));
    }
    getRecentEvents() {
        return Array.from(this._snapshots.entries()).map(([conversationId, surface], index) => ({
            sequence: index + 1,
            receivedAt: surface.updatedAt || Date.now(),
            method: 'thread-stream-state-changed',
            threadId: conversationId,
            sourceClientId: 'external-owner',
            surface
        }));
    }
    hasExternalPendingPlanAction(conversationId, requestId) {
        const snapshot = this._snapshots.get(conversationId);
        return Boolean(requestId && snapshot?.pendingPlanAction?.requestId === requestId);
    }
    setOnline(v) { this._online = v; }
    pushSnapshot(conversationId, surface) { this._snapshots.set(conversationId, surface); this.emit('snapshot', { conversationId, surface }); }
    pushStatus(status) {
        if (typeof status?.online === 'boolean') this._online = status.online;
        this.emit('status', status);
    }
    pushBroadcast(message) { this.emit('broadcast', message); }
    followConversation(conversationId, hostId) {
        this.followCalls.push({ conversationId, hostId });
        const surface = this._snapshots.get(conversationId);
        if (this._online && this._replayOnFollow && surface) {
            queueMicrotask(() => this.emit('snapshot', { conversationId, surface }));
        }
        return true;
    }
    unfollowConversation(conversationId, hostId) { this.unfollowCalls.push({ conversationId, hostId }); return true; }
    sendBroadcast(method, params, options) {
        this.broadcastCalls.push({ method, params, ...(options === undefined ? {} : { options }) });
        return true;
    }
    addRequestHandler(method, canHandle, handle) {
        this.requestHandlers.set(method, { canHandle, handle });
        return () => this.requestHandlers.delete(method);
    }
    async dispatchIncomingRequest(method, params) {
        const registration = this.requestHandlers.get(method);
        if (!registration || !await registration.canHandle(params, { method, params })) {
            return { canHandle: false };
        }
        return {
            canHandle: true,
            result: await registration.handle({ method, params, requestId: `incoming-${method}` })
        };
    }
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

    class FakeCodexService extends EventEmitter {
        constructor() {
            super();
            this.requests = [];
            this.responses = [];
            this.requestHandler = null;
            fakeCodexServices.push(this);
        }
        start() { return Promise.resolve(); }
        ensureStarted() { return Promise.resolve(false); }
        stop() {}
        request(method, params) {
            this.requests.push({ method, params });
            if (this.requestHandler) return this.requestHandler(method, params);
            if (method === 'thread/resume') {
                return Promise.resolve({ thread: { id: params.threadId, cwd: 'E:\\coding\\TermLink' } });
            }
            if (method === 'thread/start') {
                return Promise.resolve({
                    thread: {
                        id: `thread-new-${this.requests.filter((entry) => entry.method === 'thread/start').length}`,
                        cwd: params?.cwd || 'E:\\coding\\TermLink'
                    }
                });
            }
            if (method === 'thread/read') {
                return Promise.resolve({
                    thread: {
                        id: params.threadId,
                        historyMode: 'legacy',
                        ...(params.includeTurns === true ? { turns: [] } : {})
                    }
                });
            }
            if (method === 'turn/start') {
                const text = Array.isArray(params.input)
                    ? params.input.map((part) => part && part.text).filter(Boolean).join('\n')
                    : '';
                return Promise.resolve({
                    turn: {
                        id: `turn-${this.requests.filter((entry) => entry.method === 'turn/start').length}`,
                        status: 'inProgress',
                        params,
                        items: [
                            { type: 'userMessage', id: params.clientUserMessageId || 'user-message', text }
                        ]
                    }
                });
            }
            if (method === 'thread/goal/set') {
                return Promise.resolve({ goal: { ...params } });
            }
            if (method === 'turn/interrupt' || method === 'thread/settings/update') {
                return Promise.resolve({ ok: true });
            }
            return Promise.resolve({ ok: true });
        }
        respondToServerRequest(requestId, response) {
            this.responses.push({ requestId, response });
        }
        static extractThreadId(message) {
            const params = message && message.params && typeof message.params === 'object' ? message.params : {};
            if (typeof params.threadId === 'string' && params.threadId.trim()) return params.threadId;
            if (typeof params.conversationId === 'string' && params.conversationId.trim()) return params.conversationId;
            if (params.thread && typeof params.thread === 'object' && typeof params.thread.id === 'string') return params.thread.id;
            return null;
        }
    }
    require.cache[codexPath] = { id: codexPath, filename: codexPath, loaded: true, exports: FakeCodexService };

    // Stub sessionManager without loading the real singleton; it starts
    // process-wide cleanup intervals and shutdown hooks that make this
    // gateway-focused test file hang under node --test.
    require.cache[sessionManagerPath] = {
        id: sessionManagerPath, filename: sessionManagerPath, loaded: true,
        exports: {
            broadcast: () => {},
            getSessionThreadIds: () => [],
            summarizeSessionConnections: () => ({
                activeConnectionCount: 0,
                allTls: false,
                allMtlsAuthorized: false
            })
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
        broadcast(session, envelope) {
            const list = connections.get(session.id) || [];
            for (const ws of list) {
                if (ws.readyState === 1) ws.send(JSON.stringify(envelope));
            }
        },
        schedulePersist() {},
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

    const teardown = registerTerminalGateway(wss, {
        sessionManager: sm,
        heartbeatMs: 99999,
        ipcFeed,
        ipcSurfaceWaitGraceMs: opts.ipcSurfaceWaitGraceMs ?? 40,
        historySelectionDeadlineMs: opts.historySelectionDeadlineMs,
        historySettlementMarginMs: opts.historySettlementMarginMs,
        mediaStore: opts.mediaStore ?? null,
        registrationManager: opts.registrationManager ?? null,
        mobileSurfaceProjector: opts.mobileSurfaceProjector,
        mobileSurfaceMaxVisibleLatencyMs: opts.mobileSurfaceMaxVisibleLatencyMs
    });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.on('upgrade', (req, socket, head) => {
                wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); });
            });
            const gateway = { server, wss, port, sm, ipcFeed, teardown, codexService: fakeCodexServices[fakeCodexServices.length - 1] };
            activeGateways.add(gateway);
            resolve(gateway);
        });
    });
}

async function stopGateway(g) {
    if (!g || !activeGateways.has(g)) return;
    activeGateways.delete(g);
    g.teardown();
    for (const client of g.wss.clients) {
        try {
            client.terminate();
        } catch {
            // Best-effort test cleanup.
        }
    }
    await new Promise((resolve) => g.wss.close(resolve));
    await new Promise((resolve) => g.server.close(resolve));
}

test.after(async () => {
    const gateways = Array.from(activeGateways);
    for (const gateway of gateways) {
        await stopGateway(gateway);
    }
});

function connectWs(port, sessionId, registrationId = null) {
    const WebSocket = require('ws');
    return new Promise((resolve, reject) => {
        const suffix = registrationId ? `&registrationId=${encodeURIComponent(registrationId)}` : '';
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${sessionId}${suffix}`);
        const messages = [];
        ws.on('open', () => resolve({ ws, messages, nextMsg: () => new Promise(r => { ws.once('message', d => r(JSON.parse(d.toString()))); }) }));
        ws.on('message', (d) => messages.push(JSON.parse(d.toString())));
        ws.on('error', reject);
    });
}

async function enableFollowerMode(ws) {
    ws.send(JSON.stringify({ type: 'set_active_follower_mode', enabled: true }));
    await delay(50);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForMessage(messages, predicate, timeoutMs = 1_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const match = messages.find(predicate);
        if (match) return match;
        await delay(10);
    }
    return messages.find(predicate) || null;
}

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

test('Android legacy full thread/read is refused without touching the app-server response', async () => {
    const registrationId = 'android-registration';
    const g = await setupGateway({
        registrationManager: {
            isActive: (id) => id === registrationId,
            get: (id) => id === registrationId ? { clientType: 'android' } : null
        }
    });
    const sess = await g.sm.createSession({ name: 'android-bounded-history' });
    sess.codexState.threadId = 'thread-large';
    const { ws, messages } = await connectWs(g.port, sess.id, registrationId);
    await delay(100);
    const requestCount = g.codexService.requests.length;
    ws.send(JSON.stringify({
        type: 'codex_request',
        requestId: 'legacy-read',
        method: 'thread/read',
        params: { threadId: 'thread-large' }
    }));
    await delay(80);
    const error = messages.find((message) => message.type === 'codex_response' && message.requestId === 'legacy-read');
    assert.equal(error?.error?.code, 'CODEX_HISTORY_METADATA_REQUIRED');
    assert.equal(g.codexService.requests.length, requestCount);
    ws.close();
    await stopGateway(g);
});

test('Android metadata thread/resume is read-only upstream but keeps the legacy response method', async () => {
    const registrationId = 'android-metadata-resume-registration';
    const g = await setupGateway({
        registrationManager: {
            isActive: (id) => id === registrationId,
            get: (id) => id === registrationId ? { clientType: 'android' } : null
        }
    });
    const sess = await g.sm.createSession({ name: 'android-metadata-resume' });
    const { ws, messages } = await connectWs(g.port, sess.id, registrationId);
    await delay(80);

    ws.send(JSON.stringify({
        type: 'codex_request',
        requestId: 'metadata-resume',
        method: 'thread/resume',
        params: { threadId: 'thread-history-only', includeTurns: true },
        historyMode: 'metadata',
        selectionGeneration: 7
    }));

    const response = await waitForMessage(messages, (message) =>
        message.type === 'codex_response' && message.requestId === 'metadata-resume'
    );
    assert.equal(response?.method, 'thread/resume');
    assert.equal(response?.selectionGeneration, 7);
    assert.deepEqual(response?.result, {
        thread: {
            id: 'thread-history-only',
            historyMode: 'legacy'
        },
        metadataOnly: true
    });

    const upstreamRequests = g.codexService.requests.filter((entry) =>
        entry.params?.threadId === 'thread-history-only'
    );
    assert.deepEqual(upstreamRequests, [{
        method: 'thread/read',
        params: {
            threadId: 'thread-history-only',
            includeTurns: false
        }
    }]);
    assert.equal(sess.codexState.threadId, undefined, 'read-only metadata selection must not bind the session');
    assert.equal(sess.lastCodexThreadId, undefined, 'read-only metadata selection must not claim last thread ownership');

    ws.close();
    await stopGateway(g);
});

test('non-Android metadata thread/resume remains a real upstream resume', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'desktop-metadata-resume' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);

    ws.send(JSON.stringify({
        type: 'codex_request',
        requestId: 'desktop-metadata-resume',
        method: 'thread/resume',
        params: { threadId: 'thread-owner-resume' },
        historyMode: 'metadata'
    }));

    const response = await waitForMessage(messages, (message) =>
        message.type === 'codex_response' && message.requestId === 'desktop-metadata-resume'
    );
    assert.equal(response?.method, 'thread/resume');
    assert.equal(response?.result?.thread?.id, 'thread-owner-resume');
    assert.deepEqual(
        g.codexService.requests.filter((entry) => entry.params?.threadId === 'thread-owner-resume'),
        [{ method: 'thread/resume', params: { threadId: 'thread-owner-resume' } }]
    );
    assert.equal(sess.codexState.threadId, 'thread-owner-resume');
    assert.equal(sess.lastCodexThreadId, 'thread-owner-resume');

    ws.close();
    await stopGateway(g);
});

test('history recovery builds a canonical baseline inside the Gateway', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'history-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-recovery' }));
    await delay(50);
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174005',
        conversationId: 'conv-recovery',
        selectionGeneration: 1
    }));
    await delay(100);
    const recovery = messages.find((message) => message.type === 'conversation_history_recovery_state');
    assert.equal(recovery?.state, 'ready');
    assert.equal(recovery?.conversationId, 'conv-recovery');
    assert.equal(recovery?.clientSelectionGeneration, 1);
    const historyReads = g.codexService.requests.filter((entry) => entry.method === 'thread/read' && entry.params.threadId === 'conv-recovery');
    assert.ok(historyReads.some((entry) => entry.params.includeTurns === false), 'history mode probe should omit turns');
    assert.ok(historyReads.some((entry) => entry.params.includeTurns === true), 'legacy recovery should request full turns');
    ws.close();
    await stopGateway(g);
});

test('history sync waits for an in-flight media projection baseline', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const mediaStore = {
        async put() {
            await delay(35);
            return {
                contentHash: 'a'.repeat(64),
                mimeType: 'image/png',
                byteSize: 68,
                mediaPath: '/api/codex/media/' + 'a'.repeat(64)
            };
        },
        async ensureThumbnail() { return null; }
    };
    const g = await setupGateway({ mediaStore });
    const sess = await g.sm.createSession({ name: 'history-baseline-race' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-race' }));
    await delay(40);
    g.ipcFeed.pushSnapshot('conv-race', {
        conversationId: 'conv-race',
        latestTurnId: 'turn-race',
        status: 'completed',
        historyBaselineComplete: true,
        items: [{ key: 'item-race', kind: 'message', role: 'assistant', text: `image ${dataUrl}` }]
    });
    ws.send(JSON.stringify({
        type: 'conversation_history_sync_request',
        syncId: '123e4567-e89b-12d3-a456-426614174006',
        conversationId: 'conv-race',
        selectionGeneration: 1,
        cacheSchemaVersion: 2,
        checkpoint: { rootHash: null, itemCount: 0, complete: false }
    }));
    await delay(180);
    assert.equal(messages.some((message) => message.type === 'conversation_history_sync_state' && message.detailCode === 'history_unavailable'), false);
    assert.ok(messages.some((message) => message.type === 'conversation_history_manifest_required'));
    ws.close();
    await stopGateway(g);
});

test('Gateway gates one legacy full recovery behind the surface grace and uses one upstream read', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 25,
        historySelectionDeadlineMs: 300,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'bounded-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-bounded-recovery' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174010',
        conversationId: 'conv-bounded-recovery',
        selectionGeneration: 1
    }));
    await delay(120);

    const recovery = messages.find((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174010'
    );
    assert.equal(recovery?.state, 'ready');
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-bounded-recovery' && entry.params.includeTurns === true
        ).length,
        1,
        'one selection generation must not replay legacy history twice'
    );
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-bounded-recovery' && entry.params.includeTurns === false
        ).length,
        1,
        'full recovery must perform one capability probe'
    );
    ws.close();
    await stopGateway(g);
});

test('healthy surface arriving during grace skips canonical full recovery', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 80,
        historySelectionDeadlineMs: 300,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'surface-wins-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-surface-wins' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174011',
        conversationId: 'conv-surface-wins',
        selectionGeneration: 1
    }));
    await delay(15);
    g.ipcFeed.pushSnapshot('conv-surface-wins', {
        conversationId: 'conv-surface-wins',
        latestTurnId: 'turn-surface-wins',
        status: 'completed',
        items: [{ key: 'surface-item', kind: 'message', role: 'assistant', text: 'live' }]
    });
    await delay(120);

    const recovery = messages.find((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174011'
    );
    assert.equal(recovery?.state, 'ready');
    assert.equal(recovery?.detailCode, 'healthy_surface');
    assert.equal(
        g.codexService.requests.some((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-surface-wins' && entry.params.includeTurns === true
        ),
        false,
        'healthy IPC surface is the live authority and must prevent full canonical escalation'
    );
    ws.close();
    await stopGateway(g);
});

test('desynced surface invalidates the cycle and escalates to canonical recovery', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 120,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'desynced-surface-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-desynced-surface' }));
    await delay(25);
    g.ipcFeed.pushSnapshot('conv-desynced-surface', {
        conversationId: 'conv-desynced-surface',
        latestTurnId: 'turn-desynced-surface',
        status: 'completed',
        items: [{ key: 'live-before-desync', kind: 'message', role: 'assistant', text: 'before' }]
    });
    await delay(25);
    g.ipcFeed.pushSnapshot('conv-desynced-surface', {
        conversationId: 'conv-desynced-surface',
        status: 'desynced',
        desynced: true,
        items: []
    });
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174019',
        conversationId: 'conv-desynced-surface',
        selectionGeneration: 1
    }));

    const recovery = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174019', 1_000);
    assert.equal(recovery?.state, 'ready');
    assert.notEqual(recovery?.detailCode, 'healthy_surface');
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-desynced-surface' && entry.params.includeTurns === true
        ).length,
        1
    );
    ws.close();
    await stopGateway(g);
});

test('offline status invalidates a previously healthy surface before recovery', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 120,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'offline-surface-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-offline-surface' }));
    await delay(25);
    g.ipcFeed.pushSnapshot('conv-offline-surface', {
        conversationId: 'conv-offline-surface',
        latestTurnId: 'turn-offline-surface',
        status: 'completed',
        items: [{ key: 'live-before-offline', kind: 'message', role: 'assistant', text: 'before' }]
    });
    await delay(25);
    g.ipcFeed.pushStatus({ online: false, clientId: null });
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174020',
        conversationId: 'conv-offline-surface',
        selectionGeneration: 1
    }));

    const recovery = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174020', 1_000);
    assert.equal(recovery?.state, 'ready');
    assert.notEqual(recovery?.detailCode, 'healthy_surface');
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-offline-surface' && entry.params.includeTurns === true
        ).length,
        1
    );
    ws.close();
    await stopGateway(g);
});

test('a healthy surface winning grace does not consume the full recovery quota', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 100,
        historySelectionDeadlineMs: 600,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'surface-quota' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-surface-quota' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174021',
        conversationId: 'conv-surface-quota',
        selectionGeneration: 1
    }));
    await delay(20);
    g.ipcFeed.pushSnapshot('conv-surface-quota', {
        conversationId: 'conv-surface-quota',
        latestTurnId: 'turn-surface-quota',
        status: 'completed',
        items: [{ key: 'surface-quota-item', kind: 'message', role: 'assistant', text: 'live' }]
    });
    const first = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174021', 1_000);
    assert.equal(first?.state, 'ready');
    assert.equal(first?.detailCode, 'healthy_surface');

    g.ipcFeed.pushStatus({ online: false, clientId: null });
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174022',
        conversationId: 'conv-surface-quota',
        selectionGeneration: 1
    }));
    const second = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174022', 1_000);
    assert.equal(second?.state, 'ready');
    assert.notEqual(second?.detailCode, 'history_recovery_already_attempted');
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-surface-quota' && entry.params.includeTurns === true
        ).length,
        1
    );
    ws.close();
    await stopGateway(g);
});

test('stale history sync failure preserves the original client selection generation', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'stale-sync-generation' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-stale-sync' }));
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-other-selection' }));
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-stale-sync' }));
    await delay(20);
    ws.send(JSON.stringify({
        type: 'conversation_history_sync_request',
        syncId: '123e4567-e89b-12d3-a456-426614174023',
        conversationId: 'conv-stale-sync',
        selectionGeneration: 1,
        cacheSchemaVersion: 2,
        checkpoint: { rootHash: null, itemCount: 0, complete: false }
    }));
    const failure = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_sync_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174023', 1_000);
    assert.equal(failure?.state, 'failed');
    assert.equal(failure?.detailCode, 'stale_selection');
    assert.equal(failure?.selectionGeneration, 3);
    assert.equal(failure?.clientSelectionGeneration, 1);
    ws.close();
    await stopGateway(g);
});

test('client selection generation is re-established after a Gateway generation reset', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'reconnect-selection-generation' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);

    // The Android generation is connection-independent and may already be 7
    // when a freshly restarted Gateway starts its own counter at 0.  The
    // selection envelope is the existing fence used to bind that value to
    // this active conversation.
    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-reconnect-generation',
        selectionGeneration: 7
    }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174026',
        conversationId: 'conv-reconnect-generation',
        selectionGeneration: 7
    }));

    const state = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174026', 1_000);
    assert.equal(state?.state, 'ready');
    assert.equal(state?.clientSelectionGeneration, 7);
    assert.notEqual(state?.detailCode, 'stale_selection');
    ws.close();
    await stopGateway(g);
});

test('same-conversation reannounce refreshes the client selection generation', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'same-conversation-selection-refresh' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);

    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-same-selection',
        selectionGeneration: 7
    }));
    // The server conversation stays the same, but the Android local fence
    // advances after resume.  The re-announce must refresh that fence.
    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-same-selection',
        selectionGeneration: 8
    }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174029',
        conversationId: 'conv-same-selection',
        selectionGeneration: 8
    }));

    const state = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174029', 1_000);
    assert.equal(state?.state, 'ready');
    assert.equal(state?.clientSelectionGeneration, 8);
    assert.notEqual(state?.detailCode, 'stale_selection');
    ws.close();
    await stopGateway(g);
});

test('client selection generation still fences A→B→A requests', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'client-selection-isolation' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);

    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-client-a',
        selectionGeneration: 10
    }));
    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-client-b',
        selectionGeneration: 11
    }));
    ws.send(JSON.stringify({
        type: 'set_active_conversation',
        conversationId: 'conv-client-a',
        selectionGeneration: 12
    }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174027',
        conversationId: 'conv-client-a',
        selectionGeneration: 10
    }));
    const stale = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174027', 1_000);
    assert.equal(stale?.state, 'failed');
    assert.equal(stale?.detailCode, 'stale_selection');
    assert.equal(stale?.selectionGeneration, 3);
    assert.equal(stale?.clientSelectionGeneration, 10);

    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174028',
        conversationId: 'conv-client-a',
        selectionGeneration: 12
    }));
    const current = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174028', 1_000);
    assert.equal(current?.state, 'ready');
    assert.equal(current?.clientSelectionGeneration, 12);
    ws.close();
    await stopGateway(g);
});

test('verified recovery baseline is reused after switching away and back', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'recovery-baseline-reuse' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-reuse-a' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174024',
        conversationId: 'conv-reuse-a',
        selectionGeneration: 1
    }));
    const first = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174024', 1_000);
    assert.equal(first?.state, 'ready');

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-reuse-b' }));
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-reuse-a' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174025',
        conversationId: 'conv-reuse-a',
        selectionGeneration: 3
    }));
    const second = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174025', 1_000);
    assert.equal(second?.state, 'ready');
    assert.equal(second?.detailCode, 'reused_recovery_baseline');
    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-reuse-a' && entry.params.includeTurns === true
        ).length,
        1
    );
    ws.close();
    await stopGateway(g);
});

test('paginated recovery uses thread/turns/list after metadata mode probing', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 500,
        historySettlementMarginMs: 10
    });
    g.codexService.requestHandler = async (method, params) => {
        if (method === 'thread/read' && params.includeTurns === false) {
            return {
                thread: {
                    id: params.threadId,
                    historyMode: 'paginated'
                }
            };
        }
        if (method === 'thread/turns/list') {
            return {
                data: [{
                    id: 'turn-paginated',
                    status: 'completed',
                    items: [{ id: 'item-paginated', type: 'agentMessage', text: 'tail' }]
                }],
                nextCursor: null
            };
        }
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'paginated-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-paginated' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174026',
        conversationId: 'conv-paginated',
        selectionGeneration: 1
    }));
    const ready = await waitForMessage(messages, (message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174026', 1_000);
    assert.equal(ready?.state, 'ready');
    assert.equal(ready?.itemCount, 1);
    assert.ok(g.codexService.requests.some((entry) =>
        entry.method === 'thread/turns/list' &&
        entry.params.threadId === 'conv-paginated' &&
        entry.params.sortDirection === 'desc' &&
        entry.params.itemsView === 'full'
    ));
    assert.equal(g.codexService.requests.some((entry) =>
        entry.method === 'thread/read' && entry.params.includeTurns === true
    ), false);
    ws.close();
    await stopGateway(g);
});

test('healthy surface supersedes an in-flight full recovery and discards its late canonical result', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 300,
        historySettlementMarginMs: 10
    });
    let releaseFullRead;
    g.codexService.requestHandler = async (method, params) => {
        if (method === 'thread/read' && params.includeTurns === true) {
            return new Promise((resolve) => { releaseFullRead = () => resolve({
                thread: { id: params.threadId, historyMode: 'legacy', turns: [] }
            }); });
        }
        if (method === 'thread/read') {
            return { thread: { id: params.threadId, historyMode: 'legacy' } };
        }
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'surface-supersedes-recovery' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-surface-supersedes' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174017',
        conversationId: 'conv-surface-supersedes',
        selectionGeneration: 1
    }));
    await delay(30);
    assert.equal(typeof releaseFullRead, 'function', 'full recovery should be in flight before the surface arrives');
    g.ipcFeed.pushSnapshot('conv-surface-supersedes', {
        conversationId: 'conv-surface-supersedes',
        latestTurnId: 'turn-surface-supersedes',
        status: 'running',
        items: [{ key: 'live-item', kind: 'message', role: 'assistant', text: 'live wins' }]
    });
    releaseFullRead();
    await delay(120);

    const states = messages.filter((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174017'
    );
    assert.equal(states.length, 1);
    assert.equal(states[0].state, 'ready');
    assert.equal(states[0].detailCode, 'healthy_surface');
    ws.close();
    await stopGateway(g);
});

test('duplicate recovery requests in one selection generation do not start a second full read', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 20,
        historySelectionDeadlineMs: 300,
        historySettlementMarginMs: 10
    });
    const sess = await g.sm.createSession({ name: 'single-recovery-attempt' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-one-attempt' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174012',
        conversationId: 'conv-one-attempt',
        selectionGeneration: 1
    }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174013',
        conversationId: 'conv-one-attempt',
        selectionGeneration: 1
    }));
    await delay(120);

    assert.equal(
        g.codexService.requests.filter((entry) =>
            entry.method === 'thread/read' && entry.params.threadId === 'conv-one-attempt' && entry.params.includeTurns === true
        ).length,
        1
    );
    assert.ok(messages.some((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174013' &&
        message.state === 'failed' &&
        message.detailCode === 'history_recovery_already_attempted'
    ));
    assert.ok(messages.some((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174012' &&
        message.state === 'ready'
    ));
    ws.close();
    await stopGateway(g);
});

test('selection hard deadline closes a hanging recovery with an explicit timeout', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 5,
        historySelectionDeadlineMs: 70,
        historySettlementMarginMs: 10
    });
    g.codexService.requestHandler = async (method) => {
        if (method === 'thread/read') return new Promise(() => {});
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'recovery-deadline' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-recovery-deadline' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174014',
        conversationId: 'conv-recovery-deadline',
        selectionGeneration: 1
    }));
    await delay(110);

    const timeoutStates = messages.filter((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174014' &&
        message.state === 'failed'
    );
    assert.equal(timeoutStates.length, 1);
    assert.equal(timeoutStates[0].detailCode, 'history_recovery_timeout');
    ws.close();
    await stopGateway(g);
});

test('bounded projection budget closes a sync blocked behind a pending surface projection', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 5,
        historySelectionDeadlineMs: 70,
        historySettlementMarginMs: 10,
        mediaStore: {
            async put() {
                return new Promise(() => {});
            },
            async ensureThumbnail() { return null; }
        }
    });
    const sess = await g.sm.createSession({ name: 'sync-deadline' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-sync-deadline' }));
    g.ipcFeed.pushSnapshot('conv-sync-deadline', {
        conversationId: 'conv-sync-deadline',
        latestTurnId: 'turn-sync-deadline',
        status: 'completed',
        items: [{ key: 'pending-media', kind: 'message', role: 'assistant', text: dataUrl }]
    });
    ws.send(JSON.stringify({
        type: 'conversation_history_sync_request',
        syncId: '123e4567-e89b-12d3-a456-426614174018',
        conversationId: 'conv-sync-deadline',
        selectionGeneration: 1,
        cacheSchemaVersion: 2,
        checkpoint: { rootHash: null, itemCount: 0, complete: false }
    }));
    await delay(120);

    const failures = messages.filter((message) =>
        message.type === 'conversation_history_sync_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174018' &&
        message.state === 'failed'
    );
    assert.equal(failures.length, 1);
    assert.equal(failures[0].detailCode, 'history_baseline_timeout');
    assert.equal(messages.some((message) =>
        message.type === 'conversation_history_manifest_required' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174018'
    ), false);
    ws.close();
    await stopGateway(g);
});

test('A→B→A rejects the first recovery result and accepts only the new selection generation', async () => {
    const g = await setupGateway({
        ipcSurfaceWaitGraceMs: 1,
        historySelectionDeadlineMs: 300,
        historySettlementMarginMs: 10
    });
    let releaseFirstProbe;
    let firstProbe = true;
    g.codexService.requestHandler = async (method, params) => {
        if (method === 'thread/read' && firstProbe) {
            firstProbe = false;
            return new Promise((resolve) => { releaseFirstProbe = () => resolve({ thread: { id: params.threadId, historyMode: 'legacy', turns: [] } }); });
        }
        if (method === 'thread/read') {
            return {
                thread: {
                    id: params.threadId,
                    historyMode: 'legacy',
                    ...(params.includeTurns === true ? { turns: [] } : {})
                }
            };
        }
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'selection-isolation' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(60);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-a-isolation' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174015',
        conversationId: 'conv-a-isolation',
        selectionGeneration: 1
    }));
    await delay(20);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-b-isolation' }));
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-a-isolation' }));
    ws.send(JSON.stringify({
        type: 'conversation_history_recovery_request',
        syncId: '123e4567-e89b-12d3-a456-426614174016',
        conversationId: 'conv-a-isolation',
        selectionGeneration: 3
    }));
    await delay(60);
    releaseFirstProbe?.();
    await delay(100);

    assert.equal(messages.some((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174015' &&
        message.state === 'ready'
    ), false);
    assert.ok(messages.some((message) =>
        message.type === 'conversation_history_recovery_state' &&
        message.syncId === '123e4567-e89b-12d3-a456-426614174016' &&
        message.state === 'ready'
    ));
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

    assert.equal(sess.lastCodexThreadId, 'conv-1');
    const bound = messages.find(m => m.type === 'session_codex_thread_bound');
    assert.ok(bound, 'binding event must be emitted for a newly selected Codex conversation');
    assert.equal(bound.sessionId, sess.id);
    assert.equal(bound.conversationId, 'conv-1');
    assert.equal(bound.lastCodexThreadId, 'conv-1');
    assert.deepEqual(g.ipcFeed.followCalls, [{ conversationId: 'conv-1', hostId: 'local' }]);

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

test('Android IPC surface delivery sends only a bounded live tail', async () => {
    const registrationId = 'android-tail-registration';
    const g = await setupGateway({
        registrationManager: {
            isActive: (id) => id === registrationId,
            get: (id) => id === registrationId ? { clientType: 'android' } : null
        }
    });
    const sess = await g.sm.createSession({ name: 'android-tail' });
    const { ws, messages } = await connectWs(g.port, sess.id, registrationId);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-large-tail' }));
    await delay(40);
    messages.length = 0;

    g.ipcFeed.pushSnapshot('conv-large-tail', {
        conversationId: 'conv-large-tail',
        status: 'running',
        latestTurnId: 'turn-latest',
        historyBaselineComplete: true,
        items: Array.from({ length: 1_500 }, (_, index) => ({
            key: `item-${index}`,
            kind: 'message',
            role: index % 2 === 0 ? 'user' : 'assistant',
            turnId: index === 1_499 ? 'turn-latest' : `turn-${index}`,
            text: `message-${index}`
        }))
    });
    await delay(120);

    const snapshot = messages.filter((message) => message.type === 'conversation_surface_snapshot').at(-1);
    assert.ok(snapshot, 'Android should receive a live surface snapshot');
    assert.ok(
        Buffer.byteLength(JSON.stringify(snapshot), 'utf8') <= 256 * 1024,
        'live surface envelope must stay within the WebSocket budget'
    );
    assert.ok(snapshot.snapshot.items.length < 1_500);
    assert.equal(snapshot.snapshot.items.at(-1).key, 'item-1499');
    ws.close();
    await stopGateway(g);
});

test('Android projection publishes completed intermediate revisions monotonically while newer revisions are pending', async () => {
    const registrationId = 'android-monotonic-projection';
    let releaseFirst;
    let markFirstStarted;
    const firstStarted = new Promise((resolve) => { markFirstStarted = resolve; });
    const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
    const g = await setupGateway({
        registrationManager: {
            isActive: (id) => id === registrationId,
            get: (id) => id === registrationId ? { clientType: 'android' } : null
        },
        mobileSurfaceMaxVisibleLatencyMs: 5_000,
        mobileSurfaceProjector: async (surface) => {
            if (surface.revision === 1) {
                markFirstStarted();
                await firstBlocked;
            }
            return { ...surface, items: Array.isArray(surface.items) ? surface.items.slice() : [] };
        }
    });
    const sess = await g.sm.createSession({ name: 'android-monotonic-projection' });
    const { ws, messages } = await connectWs(g.port, sess.id, registrationId);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-monotonic' }));
    await delay(40);
    messages.length = 0;

    g.ipcFeed.pushSnapshot('conv-monotonic', {
        conversationId: 'conv-monotonic', revision: 1, status: 'running',
        items: [{ key: 'rev-1', kind: 'message', role: 'assistant', text: 'one' }]
    });
    await firstStarted;
    g.ipcFeed.pushSnapshot('conv-monotonic', {
        conversationId: 'conv-monotonic', revision: 2, status: 'running',
        items: [{ key: 'rev-2', kind: 'message', role: 'assistant', text: 'two' }]
    });
    g.ipcFeed.pushSnapshot('conv-monotonic', {
        conversationId: 'conv-monotonic', revision: 3, status: 'running',
        items: [{ key: 'rev-3', kind: 'message', role: 'assistant', text: 'three' }]
    });
    releaseFirst();
    await delay(140);

    const revisions = messages
        .filter((message) => message.type === 'conversation_surface_snapshot')
        .map((message) => message.snapshot.revision);
    assert.deepEqual(revisions, [1, 3]);
    assert.ok(revisions.every((revision, index) => index === 0 || revision >= revisions[index - 1]));
    ws.close();
    await stopGateway(g);
});

test('Android projection deadline publishes the latest redacted IPC surface while full projection is blocked', async () => {
    const registrationId = 'android-projection-deadline';
    const { projectMobileRealtimeSurface } = require('../src/services/codexMobileSurfaceProjector');
    const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    let releaseFull;
    const fullBlocked = new Promise((resolve) => { releaseFull = resolve; });
    const g = await setupGateway({
        registrationManager: {
            isActive: (id) => id === registrationId,
            get: (id) => id === registrationId ? { clientType: 'android' } : null
        },
        mobileSurfaceMaxVisibleLatencyMs: 40,
        mobileSurfaceProjector: async (surface, options) => {
            if (options?.redactInlineMedia === true) {
                return projectMobileRealtimeSurface(surface, options);
            }
            await fullBlocked;
            return projectMobileRealtimeSurface(surface, { mediaStore: null, redactInlineMedia: true });
        }
    });
    const sess = await g.sm.createSession({ name: 'android-projection-deadline' });
    const { ws, messages } = await connectWs(g.port, sess.id, registrationId);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-deadline' }));
    await delay(40);
    messages.length = 0;

    g.ipcFeed.pushSnapshot('conv-deadline', {
        conversationId: 'conv-deadline', revision: 10, status: 'running',
        items: [{ key: 'rev-10', kind: 'message', role: 'assistant', text: `visible ${imageDataUrl}` }]
    });
    await delay(10);
    g.ipcFeed.pushSnapshot('conv-deadline', {
        conversationId: 'conv-deadline', revision: 11, status: 'running',
        items: [{ key: 'rev-11', kind: 'message', role: 'assistant', text: `latest ${imageDataUrl}` }]
    });
    await delay(110);

    let snapshots = messages.filter((message) => message.type === 'conversation_surface_snapshot');
    assert.ok(snapshots.length >= 1, 'deadline fallback must keep the authoritative IPC surface visible');
    assert.equal(snapshots[0].snapshot.revision, 11);
    assert.doesNotMatch(JSON.stringify(snapshots[0]), /data:image/i);
    releaseFull();
    await delay(80);

    snapshots = messages.filter((message) => message.type === 'conversation_surface_snapshot');
    const revisions = snapshots.map((message) => message.snapshot.revision);
    assert.equal(revisions.includes(10), false, 'a delayed older full projection must not overwrite revision 11');
    assert.ok(revisions.every((revision, index) => index === 0 || revision >= revisions[index - 1]));
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
    assert.equal(snaps.length, 2, 'should replay cached display state and then the current-cycle surface');
    assert.equal(snaps[0].conversationId, 'conv-cached');
    assert.equal(snaps[0].snapshot.status, 'running');
    assert.equal(snaps[0].snapshot.desynced, true);
    assert.equal(snaps[1].snapshot.desynced, false);
    ws.close();
    await stopGateway(g);
});

test('IPC conversations list includes surface summary fields for Android bootstrap', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-summary', {
        conversationId: 'conv-summary',
        status: 'running',
        title: 'Summary title',
        cwd: 'E:\\coding\\TermLink',
        ownerKind: 'desktop',
        latestTurnId: 'turn-1',
        items: [{ key: 'm1', kind: 'message', role: 'user', text: 'hello' }],
        activeGoal: { objective: 'ship', status: 'active' },
        pendingApproval: { requestId: 'approval-1' },
        pendingPlanAction: { requestId: 'plan-1' },
        pendingUserInputAction: { requestId: 'input-1' }
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    const list = messages.find(m => m.type === 'codex_ipc_conversations');
    assert.ok(list, 'conversation list should be sent during IPC bootstrap');
    const summary = list.conversations.find(c => c.conversationId === 'conv-summary');
    assert.ok(summary, 'target conversation summary should be present');
    assert.equal(summary.status, 'running');
    assert.equal(summary.title, 'Summary title');
    assert.equal(summary.cwd, 'E:\\coding\\TermLink');
    assert.equal(summary.ownerKind, 'desktop');
    assert.equal(summary.latestTurnId, 'turn-1');
    assert.equal(summary.itemCount, 1);
    assert.equal(summary.hasActiveGoal, true);
    assert.equal(summary.hasPendingApproval, true);
    assert.equal(summary.hasPendingPlanAction, true);
    assert.equal(summary.hasPendingUserInputAction, true);
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

test('IPC recovery broadcasts the refreshed conversation list to connected clients', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });
    g.ipcFeed.pushSnapshot('conv-recovered', {
        conversationId: 'conv-recovered',
        status: 'running',
        title: 'Recovered conversation',
        items: [{ key: 'm1', kind: 'message', role: 'assistant', text: 'still running' }]
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    messages.length = 0;

    g.ipcFeed.setOnline(true);
    g.ipcFeed.pushStatus({ online: true, clientId: 'recovered-client' });
    await delay(50);

    const list = messages.find(message => message.type === 'codex_ipc_conversations');
    assert.ok(list, 'IPC recovery must broadcast the refreshed conversation list');
    assert.equal(list.conversations.length, 1);
    assert.equal(list.conversations[0].conversationId, 'conv-recovered');
    assert.equal(list.conversations[0].status, 'running');
    ws.close();
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
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'Hello from follower' }));
    await delay(100);

    const ack = messages.find(m => m.type === 'follower_message_sent');
    assert.ok(ack, 'should acknowledge follower message');
    assert.equal(ack.acknowledged, true);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message is blocked until follower mode is explicitly enabled', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });

    let capturedMethod = null;
    g.ipcFeed._sendRequestHandler = (method) => {
        capturedMethod = method;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'blocked before mode' }));
    await delay(100);

    assert.equal(capturedMethod, null);
    assert.ok(messages.find(m => m.type === 'follower_mode_changed' && m.enabled === false));
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Active send is not allowed'));
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
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'Should be blocked' }));
    await delay(100);

    const err = messages.find(m => m.type === 'error' && m.message.includes('running'));
    assert.ok(err, 'should block send when conversation is running');
    ws.close();
    await stopGateway(g);
});

test('follower_send_message falls back to owner when IPC is offline without a surface', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'test' }));
    await delay(150);

    assert.ok(g.codexService.requests.find((entry) => entry.method === 'thread/resume' && entry.params.threadId === 'conv-1'));
    assert.ok(g.codexService.requests.find((entry) => entry.method === 'turn/start' && entry.params.threadId === 'conv-1'));
    assert.ok(messages.find(m => m.type === 'follower_message_sent' && m.conversationId === 'conv-1'));
    assert.equal(messages.some(m => m.type === 'error' && m.message.includes('not online')), false);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message tries IPC after the current-cycle surface grace expires', async () => {
    const g = await setupGateway();

    let capturedMethod = null;
    g.ipcFeed._sendRequestHandler = (method) => {
        capturedMethod = method;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-missing' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-missing', input: 'Send after grace' }));
    await delay(100);

    assert.equal(capturedMethod, 'thread-follower-start-turn');
    assert.ok(messages.find(m => m.type === 'follower_message_sent' && m.conversationId === 'conv-missing'));
    assert.equal(messages.some(m => m.type === 'error' && m.message === 'Conversation is not live'), false);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message uses a surface that arrives inside the current-cycle grace', async () => {
    const g = await setupGateway({ ipcSurfaceWaitGraceMs: 250 });
    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-delayed' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-delayed',
        input: 'use delayed surface'
    }));
    setTimeout(() => {
        g.ipcFeed.pushSnapshot('conv-delayed', {
            conversationId: 'conv-delayed',
            status: 'completed',
            cwd: 'E:\\coding\\delayed',
            items: []
        });
    }, 15);
    await delay(120);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.turnStartParams.cwd, 'E:\\coding\\delayed');
    assert.equal(g.codexService.requests.length, 0);
    assert.ok(messages.find(m => m.type === 'follower_message_sent'));
    ws.close();
    await stopGateway(g);
});

test('desynced current-cycle surface stays display-only until a healthy surface arrives', async () => {
    const g = await setupGateway({ ipcSurfaceWaitGraceMs: 250 });
    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-desynced' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-desynced',
        input: 'wait for healthy authority'
    }));
    setTimeout(() => {
        g.ipcFeed.pushSnapshot('conv-desynced', {
            conversationId: 'conv-desynced',
            status: 'running',
            cwd: 'E:\\coding\\stale',
            desynced: true,
            pendingApproval: { requestId: 'stale-approval' },
            items: []
        });
    }, 15);
    setTimeout(() => {
        g.ipcFeed.pushSnapshot('conv-desynced', {
            conversationId: 'conv-desynced',
            status: 'completed',
            cwd: 'E:\\coding\\healthy',
            desynced: false,
            pendingApproval: { requestId: 'healthy-approval' },
            items: []
        });
    }, 45);
    await delay(140);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.turnStartParams.cwd, 'E:\\coding\\healthy');
    assert.equal(g.codexService.requests.length, 0);
    assert.equal(messages.some(m =>
        m.type === 'conversation_action_required' &&
        m.payload?.requestId === 'stale-approval'
    ), false);
    assert.ok(messages.find(m =>
        m.type === 'conversation_action_required' &&
        m.payload?.requestId === 'healthy-approval'
    ));
    assert.equal(messages.some(m => m.type === 'conversation_status_changed'), false);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message does not owner-fallback for an arbitrary IPC error', async () => {
    const g = await setupGateway();
    g.ipcFeed._sendRequestHandler = () => ({
        type: 'response',
        resultType: 'error',
        error: 'e is not iterable'
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-ipc-error' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-ipc-error',
        input: 'do not retry me'
    }));
    await delay(120);

    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/resume'), false);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    assert.ok(messages.find(m => m.type === 'error' && m.detail === 'e is not iterable'));
    assert.equal(messages.some(m => m.type === 'follower_message_sent'), false);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message serializes routing per conversation', async () => {
    const g = await setupGateway();
    let ipcSendCount = 0;
    g.ipcFeed._sendRequestHandler = async (method) => {
        ipcSendCount++;
        await delay(30);
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-serialized' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-serialized',
        input: 'first'
    }));
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-serialized',
        input: 'second'
    }));
    await delay(150);

    assert.equal(ipcSendCount, 1);
    assert.equal(messages.filter(m => m.type === 'follower_message_sent').length, 1);
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Message send is already being resolved'));
    ws.close();
    await stopGateway(g);
});

test('follower_send_message stops routing when WebSocket closes during surface grace', async () => {
    const g = await setupGateway({ ipcSurfaceWaitGraceMs: 200 });
    let ipcSendCount = 0;
    g.ipcFeed._sendRequestHandler = (method) => {
        ipcSendCount++;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-close-during-grace' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-close-during-grace',
        input: 'must not be sent'
    }));
    await new Promise((resolve) => {
        ws.once('close', resolve);
        ws.close();
    });
    await delay(230);

    assert.equal(ipcSendCount, 0);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/resume'), false);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    await stopGateway(g);
});

test('follower_send_message stops routing when active conversation changes during surface grace', async () => {
    const g = await setupGateway({ ipcSurfaceWaitGraceMs: 200 });
    let ipcSendCount = 0;
    g.ipcFeed._sendRequestHandler = (method) => {
        ipcSendCount++;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-a-during-grace' }));
    await delay(10);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-a-during-grace',
        input: 'must stay isolated'
    }));
    await delay(20);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-b-during-grace' }));
    await delay(230);

    assert.equal(ipcSendCount, 0);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/resume'), false);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    ws.close();
    await stopGateway(g);
});

test('follower_send_message falls back to owner runtime when IPC owner is gone', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-orphan', {
        conversationId: 'conv-orphan',
        status: 'completed',
        title: 'Orphaned owner',
        cwd: 'E:\\coding\\TermLink',
        currentCodexConfig: {
            reasoningEffort: 'medium',
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        },
        items: [
            { key: 'external:old', kind: 'message', role: 'assistant', phase: 'final_answer', text: 'old external answer' }
        ]
    });
    g.ipcFeed._sendRequestHandler = (method) => ({
        type: 'response',
        resultType: 'error',
        method,
        error: 'no-client-found'
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-orphan' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-orphan',
        input: 'take over locally',
        turnConfig: {
            reasoningEffort: 'high',
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        }
    }));
    await delay(150);

    assert.ok(messages.find(m => m.type === 'follower_message_sent' && m.conversationId === 'conv-orphan'));
    assert.ok(g.codexService.requests.find((entry) => entry.method === 'thread/resume' && entry.params.threadId === 'conv-orphan'));
    const fallbackTurn = g.codexService.requests.find((entry) => entry.method === 'turn/start' && entry.params.threadId === 'conv-orphan');
    assert.ok(fallbackTurn);
    assert.equal(fallbackTurn.params.reasoningEffort, 'high');
    assert.equal(fallbackTurn.params.askForApproval, 'on-request');
    assert.equal(fallbackTurn.params.sandbox, 'workspace-write');
    assert.equal(fallbackTurn.params.effort, undefined);
    assert.equal(fallbackTurn.params.approvalPolicy, undefined);
    assert.equal(fallbackTurn.params.sandboxPolicy, undefined);
    const ownerSnapshot = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(ownerSnapshot.snapshot.ownerKind, 'termlink');
    assert.ok(ownerSnapshot.snapshot.items.some((item) => item.text === 'old external answer'));
    assert.ok(ownerSnapshot.snapshot.items.some((item) => item.text === 'take over locally'));
    assert.equal(messages.some(m => m.type === 'error' && /no-client-found/i.test(String(m.detail || ''))), false);

    ws.send(JSON.stringify({
        type: 'follower_interrupt_turn',
        conversationId: 'conv-orphan'
    }));
    await delay(80);
    assert.ok(g.codexService.requests.find((entry) =>
        entry.method === 'turn/interrupt' &&
        entry.params.threadId === 'conv-orphan' &&
        entry.params.turnId === 'turn-1'
    ));
    assert.ok(messages.find((message) =>
        message.type === 'follower_turn_interrupted' &&
        message.conversationId === 'conv-orphan'
    ));

    ws.close();
    await stopGateway(g);
});

test('follower_send_message resumes owner runtime when IPC is offline but snapshot is cached', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });
    g.ipcFeed.pushSnapshot('conv-offline-cached', {
        conversationId: 'conv-offline-cached',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: [
            { key: 'external:cached', kind: 'message', role: 'assistant', phase: 'final_answer', text: 'cached external answer' }
        ]
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-offline-cached' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-offline-cached', input: 'resume while offline' }));
    await delay(150);

    assert.ok(g.codexService.requests.find((entry) => entry.method === 'thread/resume' && entry.params.threadId === 'conv-offline-cached'));
    assert.ok(g.codexService.requests.find((entry) => entry.method === 'turn/start' && entry.params.threadId === 'conv-offline-cached'));
    assert.ok(messages.find(m => m.type === 'follower_message_sent' && m.conversationId === 'conv-offline-cached'));
    assert.equal(messages.some(m => m.type === 'error' && m.message === 'IPC is not online'), false);
    ws.close();
    await stopGateway(g);
});

test('owner-owned conversation sends through app-server while IPC is offline', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-owner-offline', {
        conversationId: 'conv-owner-offline',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: []
    });
    g.ipcFeed._sendRequestHandler = (method) => ({
        type: 'response',
        resultType: 'error',
        method,
        error: 'no-client-found'
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-offline' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-owner-offline', input: 'first takeover' }));
    await delay(120);
    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'conv-owner-offline',
            turn: { id: 'turn-1', status: 'completed', items: [] }
        }
    });
    await delay(50);
    g.ipcFeed.setOnline(false);
    messages.length = 0;
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-owner-offline', input: 'second local turn' }));
    await delay(120);

    const turnStarts = g.codexService.requests.filter((entry) => entry.method === 'turn/start');
    assert.equal(turnStarts.length, 2);
    assert.ok(turnStarts[1].params.input.some((part) => part.text === 'second local turn'));
    assert.ok(messages.find(m => m.type === 'follower_message_sent'));
    assert.equal(messages.some(m => m.type === 'error' && m.message === 'IPC is not online'), false);
    ws.close();
    await stopGateway(g);
});

test('owner remains authoritative while running and is released only after terminal re-entry', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-owner-sticky', {
        conversationId: 'conv-owner-sticky',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: [{ key: 'external:seed', kind: 'message', role: 'assistant', text: 'external seed' }]
    });
    let ipcMode = 'no-client';
    let ipcSendCount = 0;
    g.ipcFeed._sendRequestHandler = (method) => {
        ipcSendCount++;
        if (ipcMode === 'no-client') {
            return { type: 'response', resultType: 'error', method, error: 'no-client-found' };
        }
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-sticky' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-owner-sticky',
        input: 'take owner'
    }));
    await delay(150);

    assert.equal(ipcSendCount, 1);
    assert.equal(g.codexService.requests.filter((entry) => entry.method === 'turn/start').length, 1);
    assert.equal(messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1).snapshot.ownerKind, 'termlink');
    assert.equal(messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1).snapshot.status, 'running');

    const ownerSnapshotCount = messages.filter(m => m.type === 'conversation_surface_snapshot').length;
    g.ipcFeed.pushSnapshot('conv-owner-sticky', {
        conversationId: 'conv-owner-sticky',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: Array.from({ length: 20 }, (_, index) => ({
            key: `external:${index}`,
            kind: 'message',
            role: 'assistant',
            text: `external ${index}`
        }))
    });
    await delay(50);
    assert.equal(
        messages.filter(m => m.type === 'conversation_surface_snapshot').length,
        ownerSnapshotCount,
        'external IPC surface must not overwrite a running owner surface'
    );

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-other-sticky' }));
    await delay(20);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-sticky' }));
    await delay(50);
    const runningReopen = messages.filter(m =>
        m.type === 'conversation_surface_snapshot' &&
        m.conversationId === 'conv-owner-sticky'
    ).at(-1);
    assert.equal(runningReopen.snapshot.ownerKind, 'termlink');
    assert.equal(runningReopen.snapshot.status, 'running');

    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'conv-owner-sticky',
            turn: { id: 'turn-1', status: 'completed', items: [] }
        }
    });
    await delay(50);
    ipcMode = 'success';
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-other-sticky' }));
    await delay(20);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-sticky' }));
    await delay(50);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-owner-sticky',
        input: 'back to IPC'
    }));
    await delay(100);

    assert.equal(ipcSendCount, 2);
    assert.equal(g.codexService.requests.filter((entry) => entry.method === 'turn/start').length, 1);
    const reopenedSnapshots = messages.filter(m =>
        m.type === 'conversation_surface_snapshot' &&
        m.conversationId === 'conv-owner-sticky'
    );
    assert.equal(reopenedSnapshots.at(-1).snapshot.ownerKind, undefined);
    assert.ok(messages.find(m => m.type === 'follower_message_sent' && m.conversationId === 'conv-owner-sticky'));
    ws.close();
    await stopGateway(g);
});

test('terminal owner remains available on re-entry when no external surface exists', async () => {
    const g = await setupGateway({ ipcSurfaceWaitGraceMs: 20 });
    g.ipcFeed._sendRequestHandler = () => ({
        type: 'response',
        resultType: 'error',
        error: 'no-client-found'
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-retained' }));
    await delay(20);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-owner-retained',
        input: 'retain this owner history'
    }));
    await delay(100);

    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'conv-owner-retained',
            turn: { id: 'turn-1', status: 'completed', items: [] }
        }
    });
    await delay(40);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-other-retained' }));
    await delay(20);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-retained' }));
    await delay(50);

    const reopened = messages.filter((message) =>
        message.type === 'conversation_surface_snapshot' &&
        message.conversationId === 'conv-owner-retained'
    ).at(-1);
    assert.equal(reopened.snapshot.ownerKind, 'termlink');
    assert.ok(reopened.snapshot.items.some((item) => item.text === 'retain this owner history'));

    ws.close();
    await stopGateway(g);
});

test('owner pending approval response is resolved through app-server instead of IPC', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-owner-approval', {
        conversationId: 'conv-owner-approval',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: []
    });
    g.ipcFeed._sendRequestHandler = (method) => ({
        type: 'response',
        resultType: 'error',
        method,
        error: 'no-client-found'
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-approval' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-owner-approval', input: 'takeover' }));
    await delay(120);

    g.codexService.emit('server_request', {
        requestId: 'owner-approval-1',
        handledBy: 'client',
        message: {
            method: 'item/commandExecution/requestApproval',
            params: {
                threadId: 'conv-owner-approval',
                reason: 'Need approval',
                command: 'echo owner',
                availableDecisions: ['accept', 'reject']
            }
        }
    });
    await delay(80);

    assert.ok(messages.find(m => m.type === 'conversation_action_required' && m.actionType === 'approval'));
    g.ipcFeed.setOnline(false);
    ws.send(JSON.stringify({
        type: 'follower_approval_response',
        conversationId: 'conv-owner-approval',
        requestId: 'owner-approval-1',
        requestKind: 'command',
        decision: 'accept'
    }));
    await delay(100);

    assert.deepEqual(g.codexService.responses.at(-1), {
        requestId: 'owner-approval-1',
        response: { result: { decision: 'accept' } }
    });
    assert.ok(messages.find(m => m.type === 'follower_approval_response_sent' && m.requestId === 'owner-approval-1'));
    const afterResponse = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(afterResponse.snapshot.pendingApproval.requestId, 'owner-approval-1');

    g.codexService.emit('notification', {
        method: 'turn/started',
        params: {
            threadId: 'conv-owner-approval',
            turn: { id: 'turn-owner-approval', status: 'inProgress', items: [] }
        }
    });
    await delay(50);
    const afterProgress = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(afterProgress.snapshot.pendingApproval, undefined);
    assert.equal(messages.some(m => m.type === 'error' && /IPC/i.test(m.message)), false);
    ws.close();
    await stopGateway(g);
});

test('owner permissions approval returns requested permissions and waits for owner progress', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-owner-permissions', {
        conversationId: 'conv-owner-permissions', status: 'completed', cwd: 'E:\\coding\\TermLink', items: []
    });
    g.ipcFeed._sendRequestHandler = () => ({ type: 'response', resultType: 'error', error: 'no-client-found' });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-permissions' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-owner-permissions', input: 'takeover' }));
    await delay(120);

    g.codexService.emit('server_request', {
        requestId: 'permissions-raw-1',
        handledBy: 'client',
        message: {
            method: 'item/permissions/requestApproval',
            params: {
                threadId: 'conv-owner-permissions',
                reason: 'Need network',
                permissions: { network: true }
            }
        }
    });
    await delay(50);
    ws.send(JSON.stringify({
        type: 'follower_approval_response',
        conversationId: 'conv-owner-permissions',
        requestId: 'permissions-raw-1',
        requestKind: 'permissions',
        decision: 'acceptForSession'
    }));
    await delay(80);

    assert.deepEqual(g.codexService.responses.at(-1), {
        requestId: 'permissions-raw-1',
        response: { result: { permissions: { network: true }, scope: 'session' } }
    });
    assert.equal(
        messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1).snapshot.pendingApproval.requestId,
        'permissions-raw-1'
    );
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response sends command-approval-decision', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: { kind: 'command', requestId: '42', rawRequestId: 42, raw: { id: 42 } }
    });

    let capturedMethod = null;
    let capturedRequestId = null;
    let capturedDecision = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        capturedMethod = method;
        capturedRequestId = params.requestId;
        capturedDecision = params.decision;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_approval_response', conversationId: 'conv-1', decision: 'accept', requestId: '42' }));
    await delay(100);

    assert.equal(capturedMethod, 'thread-follower-command-approval-decision');
    assert.equal(capturedRequestId, 42);
    assert.equal(capturedDecision, 'accept');
    const ack = messages.find(m => m.type === 'follower_approval_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response forwards execpolicy amendment decision shape', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: { kind: 'command', requestId: 'req-remember', rawRequestId: 'raw-remember' }
    });

    let capturedDecision = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        capturedDecision = params.decision;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_approval_response',
        conversationId: 'conv-1',
        decision: 'acceptWithExecpolicyAmendment',
        requestId: 'req-remember',
        requestKind: 'command',
        execpolicyAmendment: ['New-Item', '-Path']
    }));
    await delay(100);

    assert.deepEqual(capturedDecision, {
        acceptWithExecpolicyAmendment: {
            execpolicy_amendment: ['New-Item', '-Path']
        }
    });
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response derives remember amendment from pending approval params', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: {
            kind: 'command',
            requestId: 'req-derived',
            rawRequestId: 'raw-derived',
            params: {
                proposedExecpolicyAmendment: ['New-Item', '-Path', 'notes.txt', '-ItemType', 'File']
            }
        }
    });

    let capturedDecision = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        capturedDecision = params.decision;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_approval_response',
        conversationId: 'conv-1',
        decision: 'acceptWithExecpolicyAmendment',
        requestId: 'req-derived',
        requestKind: 'command'
    }));
    await delay(100);

    assert.deepEqual(capturedDecision, {
        acceptWithExecpolicyAmendment: {
            execpolicy_amendment: ['New-Item', '-Path']
        }
    });
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response sends permissions approval response for MCP tool approvals', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: { kind: 'permissions', requestId: 'req-perm', raw: { id: 77 } }
    });

    let capturedMethod = null;
    let capturedRequestId = null;
    let capturedDecision = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        capturedMethod = method;
        capturedRequestId = params.requestId;
        capturedDecision = params.decision;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_approval_response', conversationId: 'conv-1', decision: 'accept', requestId: 'req-perm', requestKind: 'permissions' }));
    await delay(100);

    assert.equal(capturedMethod, 'thread-follower-permissions-request-approval-response');
    assert.equal(capturedRequestId, 77);
    assert.equal(capturedDecision, 'accept');
    const ack = messages.find(m => m.type === 'follower_approval_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});

test('follower_approval_response rejects unmatched request ids without sending a command decision', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_approval', items: [],
        pendingApproval: { kind: 'command', requestId: 'req-command', rawRequestId: 'raw-command' }
    });

    let capturedMethod = null;
    g.ipcFeed._sendRequestHandler = (method) => {
        capturedMethod = method;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_approval_response', conversationId: 'conv-1', decision: 'accept', requestId: 'missing-request', requestKind: 'command' }));
    await delay(100);

    assert.equal(capturedMethod, null);
    const err = messages.find(m => m.type === 'error' && /No matching pending approval request/.test(m.detail || ''));
    assert.ok(err);
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response triggers plan implementation path without invented collaboration mode', async () => {
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
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_plan_response', conversationId: 'conv-1', input: '是，实施此计划' }));
    await delay(100);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'thread-follower-start-turn');
    assert.ok(calls[0].params.turnStartParams.input[0].text.includes('PLEASE IMPLEMENT THIS PLAN'));
    assert.equal(calls[0].params.turnStartParams.collaborationMode, undefined);
    const ack = messages.find(m => m.type === 'follower_plan_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});

test('owner plan implementation waits for owner snapshot before clearing pending action', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-owner-plan', {
        conversationId: 'conv-owner-plan', status: 'completed', cwd: 'E:\\coding\\TermLink', items: []
    });
    g.ipcFeed._sendRequestHandler = () => ({ type: 'response', resultType: 'error', error: 'no-client-found' });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-plan' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-owner-plan', input: 'takeover' }));
    await delay(120);

    g.codexService.emit('server_request', {
        requestId: 'owner-plan-raw-1',
        handledBy: 'client',
        message: {
            method: 'item/plan/requestImplementation',
            params: {
                threadId: 'conv-owner-plan',
                turnId: 'turn-plan-source',
                planContent: 'Implement the synchronized plan'
            }
        }
    });
    await delay(60);
    const pending = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(pending.snapshot.pendingPlanAction.requestId, 'owner-plan-raw-1');

    ws.send(JSON.stringify({
        type: 'follower_plan_response',
        conversationId: 'conv-owner-plan',
        requestId: 'owner-plan-raw-1',
        input: 'Implement plan'
    }));
    await delay(120);

    const turnStarts = g.codexService.requests.filter((entry) => entry.method === 'turn/start');
    assert.ok(turnStarts.at(-1).params.input.some((part) => part.text === 'PLEASE IMPLEMENT THIS PLAN:\nImplement the synchronized plan'));
    const ack = messages.find(m => m.type === 'follower_plan_response_sent');
    assert.ok(ack);
    const afterTurnStart = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(afterTurnStart.snapshot.pendingPlanAction.requestId, 'owner-plan-raw-1');

    g.codexService.emit('notification', {
        method: 'turn/started',
        params: {
            threadId: 'conv-owner-plan',
            turn: {
                id: 'turn-plan-implementation',
                status: 'inProgress',
                params: turnStarts.at(-1).params,
                items: []
            }
        }
    });
    await delay(60);

    const afterOwnerSnapshot = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(afterOwnerSnapshot.snapshot.pendingPlanAction, undefined);
    assert.equal(afterOwnerSnapshot.snapshot.status, 'running');
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response derives default collaboration mode from latest mode settings', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1',
        status: 'waiting_for_input',
        latestCollaborationMode: {
            mode: 'plan',
            settings: { model: 'gpt-5.5', reasoning_effort: 'high', developer_instructions: 'keep context' }
        },
        items: [],
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
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_plan_response', conversationId: 'conv-1', input: '是，实施此计划' }));
    await delay(100);

    assert.equal(calls[0].method, 'thread-follower-update-thread-settings');
    assert.deepEqual(calls[0].params.threadSettings.collaborationMode, {
        mode: 'default',
        settings: { model: 'gpt-5.5', reasoning_effort: 'high', developer_instructions: null }
    });
    assert.equal(calls[1].method, 'thread-follower-start-turn');
    assert.deepEqual(calls[1].params.turnStartParams.collaborationMode, {
        mode: 'default',
        settings: { model: 'gpt-5.5', reasoning_effort: 'high', developer_instructions: null }
    });
    const ack = messages.find(m => m.type === 'follower_plan_response_sent');
    assert.ok(ack);
    assert.equal(ack.requestId, 'r-plan');
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response forwards explicit user input response payload', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_input', items: [],
        pendingUserInputAction: { requestId: '73', rawRequestId: 73 }
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    const response = { answers: { confirm: { answers: ['Approve'] } } };
    ws.send(JSON.stringify({
        type: 'follower_plan_response',
        conversationId: 'conv-1',
        requestId: '73',
        response
    }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-submit-user-input');
    assert.equal(captured.params.requestId, 73);
    assert.deepEqual(captured.params.response, response);
    const ack = messages.find(m => m.type === 'follower_plan_response_sent');
    assert.ok(ack);
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response rejects explicit user input response without live request id', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1', status: 'waiting_for_input', items: []
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    await enableFollowerMode(ws);
    const response = { answers: { confirm: { answers: ['Approve'] } } };
    ws.send(JSON.stringify({
        type: 'follower_plan_response',
        conversationId: 'conv-1',
        response
    }));
    await delay(100);

    assert.equal(captured, null);
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Plan response cannot be submitted'));
    ws.close();
    await stopGateway(g);
});

test('follower_plan_response builds answers payload with question id', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1',
        status: 'waiting_for_input',
        items: []
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_plan_response',
        conversationId: 'conv-1',
        requestId: 'req-key',
        questionId: 'confirm',
        input: 'Approve'
    }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-submit-user-input');
    assert.equal(captured.params.requestId, 'req-key');
    assert.deepEqual(captured.params.response, { answers: { confirm: { answers: ['Approve'] } } });
    assert.ok(messages.find(m => m.type === 'follower_plan_response_sent'));
    ws.close();
    await stopGateway(g);
});

test('follower_send_message includes desktop-compatible turn context', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1',
        status: 'completed',
        cwd: 'E:\\coding\\project-a',
        latestDefaultCollaborationMode: {
            mode: 'default',
            settings: { model: 'gpt-5.5', reasoning_effort: 'high', developer_instructions: null }
        },
        currentCodexConfig: {
            model: 'gpt-5.5',
            reasoningEffort: 'high',
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        },
        items: []
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'Hello with context' }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.turnStartParams.input[0].text, 'Hello with context');
    assert.deepEqual(captured.params.turnStartParams.input[0].text_elements, []);
    assert.deepEqual(captured.params.turnStartParams.attachments, []);
    assert.deepEqual(captured.params.turnStartParams.commentAttachments, []);
    assert.equal(captured.params.turnStartParams.cwd, 'E:\\coding\\project-a');
    assert.deepEqual(captured.params.turnStartParams.runtimeWorkspaceRoots, ['E:\\coding\\project-a']);
    assert.deepEqual(captured.params.turnStartParams.collaborationMode, {
        mode: 'default',
        settings: { model: 'gpt-5.5', reasoning_effort: 'high', developer_instructions: null }
    });
    assert.equal(captured.params.turnStartParams.effort, 'high');
    assert.equal(captured.params.turnStartParams.approvalPolicy, 'never');
    assert.deepEqual(captured.params.turnStartParams.sandboxPolicy, { type: 'dangerFullAccess' });
    assert.equal(captured.params.turnStartParams.reasoningEffort, undefined);
    assert.equal(captured.params.turnStartParams.askForApproval, undefined);
    assert.equal(captured.params.turnStartParams.sandbox, undefined);
    assert.ok(messages.find(m => m.type === 'follower_message_sent'));
    ws.close();
    await stopGateway(g);
});

test('follower_send_message turnConfig overrides owner reasoning and permission for the next turn', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-override', {
        conversationId: 'conv-override',
        status: 'completed',
        latestDefaultCollaborationMode: {
            mode: 'default',
            settings: { model: 'gpt-5.5', reasoning_effort: 'medium', developer_instructions: null }
        },
        currentCodexConfig: {
            model: 'gpt-5.5',
            reasoningEffort: 'medium',
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        },
        items: []
    });
    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-override' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-override',
        input: 'Use selected config',
        turnConfig: {
            reasoningEffort: 'high',
            approvalPolicy: 'on-request',
            approvalsReviewer: 'auto_review',
            permissionProfile: ':workspace'
        }
    }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.turnStartParams.effort, 'high');
    assert.equal(captured.params.turnStartParams.approvalPolicy, 'on-request');
    assert.equal(captured.params.turnStartParams.approvalsReviewer, 'auto_review');
    assert.equal(captured.params.turnStartParams.permissions, ':workspace');
    assert.equal(captured.params.turnStartParams.sandboxPolicy, undefined);
    assert.equal(captured.params.turnStartParams.collaborationMode.settings.reasoning_effort, 'high');
    assert.ok(messages.find(m => m.type === 'follower_message_sent'));
    ws.close();
    await stopGateway(g);
});

test('active conversation lifecycle avoids duplicate follow and switches A to B atomically', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-a' }));
    await delay(30);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-a' }));
    await delay(30);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-b' }));
    await delay(30);

    assert.deepEqual(g.ipcFeed.followCalls, [
        { conversationId: 'conv-a', hostId: 'local' },
        { conversationId: 'conv-b', hostId: 'local' }
    ]);
    assert.deepEqual(g.ipcFeed.unfollowCalls, [
        { conversationId: 'conv-a', hostId: 'local' }
    ]);

    await new Promise((resolve) => { ws.once('close', resolve); ws.close(); });
    await delay(20);
    assert.deepEqual(g.ipcFeed.unfollowCalls, [
        { conversationId: 'conv-a', hostId: 'local' },
        { conversationId: 'conv-b', hostId: 'local' }
    ]);
    await stopGateway(g);
});

test('each WebSocket acquires and releases its own shared conversation reference', async () => {
    const g = await setupGateway();
    const s1 = await g.sm.createSession({ name: 'one' });
    const s2 = await g.sm.createSession({ name: 'two' });
    const c1 = await connectWs(g.port, s1.id);
    const c2 = await connectWs(g.port, s2.id);
    await delay(100);

    c1.ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-shared' }));
    c2.ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-shared' }));
    await delay(50);
    assert.equal(g.ipcFeed.followCalls.filter((entry) => entry.conversationId === 'conv-shared').length, 2);

    await new Promise((resolve) => { c1.ws.once('close', resolve); c1.ws.close(); });
    await delay(20);
    assert.equal(g.ipcFeed.unfollowCalls.filter((entry) => entry.conversationId === 'conv-shared').length, 1);
    await new Promise((resolve) => { c2.ws.once('close', resolve); c2.ws.close(); });
    await delay(20);
    assert.equal(g.ipcFeed.unfollowCalls.filter((entry) => entry.conversationId === 'conv-shared').length, 2);
    await stopGateway(g);
});

test('follower_send_message can reset sticky permission settings to config', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-config-permissions', {
        conversationId: 'conv-config-permissions',
        status: 'completed',
        currentCodexConfig: {
            approvalPolicy: 'never',
            approvalsReviewer: 'user',
            permissionProfile: ':danger-full-access'
        },
        items: []
    });
    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-config-permissions' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-config-permissions',
        input: 'Use config permissions',
        turnConfig: { useConfigPermissions: true }
    }));
    await delay(100);

    assert.equal(captured.params.turnStartParams.approvalPolicy, null);
    assert.equal(captured.params.turnStartParams.approvalsReviewer, null);
    assert.equal(captured.params.turnStartParams.permissions, null);
    assert.equal(captured.params.turnStartParams.sandboxPolicy, null);
    ws.close();
    await stopGateway(g);
});

test('semantic follower goal is rejected for a healthy external owner without starting a turn', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });

    const captured = [];
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured.push({ method, params });
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_start_goal', conversationId: 'conv-1', goal: '完成同步链路' }));
    await delay(100);

    assert.equal(captured.length, 0);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/goal/set'), false);
    const rejected = messages.find(m => m.type === 'error' && m.code === 'GOAL_EXTERNAL_OWNER_UNSUPPORTED');
    assert.equal(rejected.goalObjective, '完成同步链路');
    assert.match(rejected.message, /Desktop|VS Code/);
    assert.ok(messages.find(m =>
        m.type === 'follower_route_state' &&
        m.phase === 'failed' &&
        m.detailCode === 'GOAL_EXTERNAL_OWNER_UNSUPPORTED'
    ));
    ws.close();
    await stopGateway(g);
});

test('plain /goal text without goalObjective remains an ordinary follower message', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-plain-goal', {
        conversationId: 'conv-plain-goal', status: 'completed', items: []
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-plain-goal' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-plain-goal',
        input: '/goal 这只是普通文本'
    }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.turnStartParams.input[0].text, '/goal 这只是普通文本');
    assert.ok(messages.find(m => m.type === 'follower_message_sent'));
    assert.equal(messages.some(m => m.code === 'GOAL_EXTERNAL_OWNER_UNSUPPORTED'), false);
    ws.close();
    await stopGateway(g);
});

test('owner fallback goal waits for owner goal snapshots before updating Android surface', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });
    g.ipcFeed.pushSnapshot('conv-owner-goal', {
        conversationId: 'conv-owner-goal', status: 'completed', cwd: 'E:\\coding\\TermLink', items: []
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-goal' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_start_goal', conversationId: 'conv-owner-goal', goal: '完成 Goal 控制验收' }));
    await delay(150);

    const activeGoalRequest = g.codexService.requests.find((entry) =>
        entry.method === 'thread/goal/set' && entry.params.status === 'active'
    );
    assert.deepEqual(activeGoalRequest.params, {
        threadId: 'conv-owner-goal',
        objective: '完成 Goal 控制验收',
        status: 'active'
    });
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    const goalAccepted = messages.find((message) => message.type === 'follower_goal_sent');
    assert.equal(goalAccepted.acknowledged, true);
    assert.equal(goalAccepted.turnId, null);
    assert.equal(messages.some((message) => (
        message.type === 'follower_route_state' && message.phase === 'turn_started'
    )), false);
    assert.equal(messages.some(m => m.type === 'conversation_surface_snapshot' && m.snapshot.activeGoal?.objective === '完成 Goal 控制验收'), false);

    g.codexService.emit('notification', {
        method: 'thread/goal/updated',
        params: {
            threadId: 'conv-owner-goal',
            goal: { threadId: 'conv-owner-goal', objective: '完成 Goal 控制验收', status: 'active' }
        }
    });
    await delay(50);
    assert.ok(messages.some(m => m.type === 'conversation_surface_snapshot' && m.snapshot.activeGoal?.objective === '完成 Goal 控制验收'));
    assert.equal(messages.some((message) => (
        message.type === 'follower_route_state' && message.phase === 'turn_started'
    )), false);

    g.codexService.emit('notification', {
        method: 'turn/started',
        params: {
            threadId: 'conv-owner-goal',
            turn: { id: 'turn-goal-runtime', status: 'inProgress', items: [] }
        }
    });
    await delay(50);
    const goalTurnStartedRoutes = messages.filter((message) => (
        message.type === 'follower_route_state' && message.phase === 'turn_started'
    ));
    assert.equal(goalTurnStartedRoutes.length, 1);
    assert.equal(goalTurnStartedRoutes[0].turnId, 'turn-goal-runtime');
    assert.equal(
        messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1).snapshot.latestTurnId,
        'turn-goal-runtime'
    );
    g.codexService.emit('notification', {
        method: 'turn/started',
        params: {
            threadId: 'conv-owner-goal',
            turn: { id: 'turn-goal-runtime', status: 'inProgress', items: [] }
        }
    });
    await delay(25);
    assert.equal(messages.filter((message) => (
        message.type === 'follower_route_state' && message.phase === 'turn_started'
    )).length, 1);

    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: 'conv-owner-goal',
            turn: { id: 'turn-goal-runtime', status: 'completed', items: [] }
        }
    });
    await delay(100);

    const completedGoalRequest = g.codexService.requests.find((entry) =>
        entry.method === 'thread/goal/set' && entry.params.status === 'complete'
    );
    assert.equal(completedGoalRequest, undefined);
    assert.equal(messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1).snapshot.activeGoal?.objective, '完成 Goal 控制验收');

    g.codexService.emit('notification', {
        method: 'thread/goal/updated',
        params: {
            threadId: 'conv-owner-goal',
            goal: { threadId: 'conv-owner-goal', objective: '完成 Goal 控制验收', status: 'complete' }
        }
    });
    await delay(50);
    const completedSnapshot = messages.filter(m => m.type === 'conversation_surface_snapshot').at(-1);
    assert.equal(completedSnapshot.snapshot.activeGoal, undefined);
    ws.close();
    await stopGateway(g);
});

test('offline Goal fallback stops on writer conflict without starting or replacing a thread', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });
    g.ipcFeed.pushSnapshot('conv-writer-conflict', {
        conversationId: 'conv-writer-conflict', status: 'completed', cwd: 'E:\\coding\\TermLink', items: []
    });
    g.codexService.requestHandler = (method) => {
        if (method === 'thread/resume') {
            return Promise.reject(new Error('thread writer conflict: active writer exists'));
        }
        return Promise.resolve({ ok: true });
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-writer-conflict' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_start_goal',
        conversationId: 'conv-writer-conflict',
        goal: '不得抢占 writer'
    }));
    await delay(100);

    assert.equal(g.codexService.requests.filter((entry) => entry.method === 'thread/resume').length, 1);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/start'), false);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/goal/set'), false);
    assert.ok(messages.find(m =>
        m.type === 'error' && /writer conflict/i.test(String(m.detail))
    ));
    ws.close();
    await stopGateway(g);
});

test('TermLink owner Goal pause sets paused before interrupt and resume only sets active', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ online: false }) });
    g.ipcFeed.pushSnapshot('conv-owner-goal-control', {
        conversationId: 'conv-owner-goal-control', status: 'completed', cwd: 'E:\\coding\\TermLink', items: []
    });

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-owner-goal-control' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_start_goal',
        conversationId: 'conv-owner-goal-control',
        goal: '验证真实暂停恢复'
    }));
    await delay(150);

    assert.equal(g.codexService.requests.some((entry) => entry.method === 'turn/start'), false);
    g.codexService.emit('notification', {
        method: 'thread/goal/updated',
        params: {
            threadId: 'conv-owner-goal-control',
            goal: {
                threadId: 'conv-owner-goal-control',
                objective: '验证真实暂停恢复',
                status: 'active'
            }
        }
    });
    g.codexService.emit('notification', {
        method: 'turn/started',
        params: {
            threadId: 'conv-owner-goal-control',
            turn: { id: 'turn-goal-runtime', status: 'inProgress', items: [] }
        }
    });
    await delay(50);

    const beforePause = g.codexService.requests.length;
    ws.send(JSON.stringify({
        type: 'follower_goal_control',
        conversationId: 'conv-owner-goal-control',
        action: 'pause'
    }));
    await delay(100);

    assert.deepEqual(g.codexService.requests.slice(beforePause, beforePause + 2), [
        {
            method: 'thread/goal/set',
            params: { threadId: 'conv-owner-goal-control', status: 'paused' }
        },
        {
            method: 'turn/interrupt',
            params: { threadId: 'conv-owner-goal-control', turnId: 'turn-goal-runtime' }
        }
    ]);
    assert.ok(messages.find(m =>
        m.type === 'follower_goal_control_ack' &&
        m.action === 'pause' &&
        m.status === 'paused' &&
        m.turnInterrupted === true
    ));

    const turnStartCountBeforeResume = g.codexService.requests.filter((entry) => entry.method === 'turn/start').length;
    ws.send(JSON.stringify({
        type: 'follower_goal_control',
        conversationId: 'conv-owner-goal-control',
        action: 'resume'
    }));
    await delay(100);

    assert.deepEqual(g.codexService.requests.at(-1), {
        method: 'thread/goal/set',
        params: { threadId: 'conv-owner-goal-control', status: 'active' }
    });
    assert.equal(
        g.codexService.requests.filter((entry) => entry.method === 'turn/start').length,
        turnStartCountBeforeResume
    );
    assert.ok(messages.find(m =>
        m.type === 'follower_goal_control_ack' &&
        m.action === 'resume' &&
        m.status === 'active'
    ));
    ws.close();
    await stopGateway(g);
});

test('external owner Goal control is rejected without IPC or local Goal mutation', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-external-goal-control', {
        conversationId: 'conv-external-goal-control',
        status: 'completed',
        activeGoal: { objective: '外部 Goal', status: 'paused' },
        items: []
    });
    const captured = [];
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured.push({ method, params });
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-external-goal-control' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_goal_control',
        conversationId: 'conv-external-goal-control',
        action: 'resume'
    }));
    await delay(100);

    assert.equal(captured.length, 0);
    assert.equal(g.codexService.requests.some((entry) => entry.method === 'thread/goal/set'), false);
    assert.ok(messages.find(m =>
        m.type === 'error' && m.code === 'GOAL_EXTERNAL_OWNER_CONTROL_UNSUPPORTED'
    ));
    ws.close();
    await stopGateway(g);
});

test('follower_interrupt_turn sends thread-follower-interrupt-turn with latest turn id', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1',
        status: 'running',
        latestTurnId: 'turn-1',
        items: []
    });

    let captured = null;
    g.ipcFeed._sendRequestHandler = (method, params) => {
        captured = { method, params };
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({ type: 'follower_interrupt_turn', conversationId: 'conv-1' }));
    await delay(100);

    assert.equal(captured.method, 'thread-follower-interrupt-turn');
    assert.equal(captured.params.conversationId, 'conv-1');
    assert.equal(captured.params.turnId, 'turn-1');
    assert.ok(messages.find(m => m.type === 'follower_turn_interrupted'));
    ws.close();
    await stopGateway(g);
});

test('conversation snapshot emits action required for approval plan user input and goal', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-1' }));
    await delay(50);
    g.ipcFeed.pushSnapshot('conv-1', {
        conversationId: 'conv-1',
        status: 'waiting_for_input',
        items: [],
        pendingApproval: { kind: 'command', requestId: 'req-approval' },
        pendingPlanAction: { kind: 'plan_implementation', requestId: 'req-plan' },
        pendingUserInputAction: { requestId: 'req-input', method: 'item/tool/requestUserInput', requestKind: 'userInput', responseMode: 'answers', handledBy: 'ipc_follower', params: { questions: [{ id: 'q1', question: 'Continue?' }] } },
        pendingGoalAction: { kind: 'text_input' }
    });
    await delay(100);

    assert.ok(messages.find(m => m.type === 'conversation_action_required' && m.actionType === 'approval'));
    assert.ok(messages.find(m => m.type === 'conversation_action_required' && m.actionType === 'plan'));
    assert.ok(messages.find(m => m.type === 'conversation_action_required' && m.actionType === 'user_input'));
    assert.ok(messages.find(m => m.type === 'conversation_action_required' && m.actionType === 'goal'));
    ws.close();
    await stopGateway(g);
});

test('set_active_follower_mode false blocks active follower actions', async () => {
    const g = await setupGateway();
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });

    let capturedMethod = null;
    g.ipcFeed._sendRequestHandler = (method) => {
        capturedMethod = method;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_follower_mode', enabled: false }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'blocked' }));
    await delay(100);

    assert.equal(capturedMethod, null);
    assert.ok(messages.find(m => m.type === 'follower_mode_changed' && m.enabled === false));
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Active send is not allowed'));
    ws.close();
    await stopGateway(g);
});

test('set_active_follower_mode true is rejected when active send is not configured', async () => {
    const g = await setupGateway({ ipcFeed: new FakeIpcFeed({ allowActiveSend: false }) });
    g.ipcFeed.pushSnapshot('conv-1', { conversationId: 'conv-1', status: 'completed', items: [] });

    let capturedMethod = null;
    g.ipcFeed._sendRequestHandler = (method) => {
        capturedMethod = method;
        return { type: 'response', resultType: 'success', method };
    };

    const sess = await g.sm.createSession({ name: 'test' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(100);

    ws.send(JSON.stringify({ type: 'set_active_follower_mode', enabled: true }));
    await delay(50);
    ws.send(JSON.stringify({ type: 'follower_send_message', conversationId: 'conv-1', input: 'blocked by server config' }));
    await delay(100);

    assert.equal(capturedMethod, null);
    assert.ok(messages.find(m => m.type === 'follower_mode_changed' && m.enabled === false && m.activeSendAllowed === false));
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Active follower mode is not available'));
    assert.ok(messages.find(m => m.type === 'error' && m.message === 'Active send is not allowed'));
    ws.close();
    await stopGateway(g);
});

test('explicit new thread invalidates Desktop discovery at created, first-turn, and terminal lifecycle stages', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'new owner' });
    sess.cwd = 'E:\\coding\\TermLink';
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);

    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(120);

    const ready = messages.find((message) => message.type === 'codex_thread_ready');
    assert.ok(ready?.threadId);
    assert.ok(g.ipcFeed.broadcastCalls.find((call) =>
        call.method === 'thread-stream-following-status-requested' &&
        call.params?.conversationId === ready.threadId &&
        call.params?.hostId === 'local'
    ));
    assert.equal(g.ipcFeed.broadcastCalls.some((call) =>
        call.method === 'thread-stream-state-changed' &&
        call.params?.conversationId === ready.threadId
    ), false, 'owner snapshot waits for an explicitly registered follower');

    g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'desktop-follower',
        params: { conversationId: ready.threadId, hostId: 'local', following: true }
    });
    await delay(20);
    const initialFollowerSnapshot = g.ipcFeed.broadcastCalls.find((call) =>
        call.method === 'thread-stream-state-changed' &&
        call.params?.conversationId === ready.threadId
    );
    assert.deepEqual(initialFollowerSnapshot?.options, {
        targetClientIds: ['desktop-follower']
    });
    assert.ok(g.ipcFeed.broadcastCalls.find((call) =>
        call.method === 'thread-read-state-changed' &&
        call.params?.conversationId === ready.threadId &&
        call.params?.hostId === 'local'
    ));
    assert.ok(g.ipcFeed.broadcastCalls.find((call) =>
        call.method === 'query-cache-invalidate' &&
        call.params?.queryKey?.[0] === 'recent-conversations'
    ));
    const countBroadcasts = (method) => g.ipcFeed.broadcastCalls.filter((call) => call.method === method).length;
    assert.equal(countBroadcasts('thread-read-state-changed'), 1);
    assert.equal(countBroadcasts('query-cache-invalidate'), 2);

    const startedNotification = {
        method: 'turn/started',
        params: {
            threadId: ready.threadId,
            turn: { id: 'turn-discovery-1', status: 'inProgress', items: [] }
        }
    };
    g.codexService.emit('notification', startedNotification);
    await delay(40);
    assert.equal(countBroadcasts('thread-read-state-changed'), 1);
    assert.equal(countBroadcasts('query-cache-invalidate'), 4);
    const firstTurnSnapshot = g.ipcFeed.broadcastCalls.filter((call) =>
        call.method === 'thread-stream-state-changed' &&
        call.params?.conversationId === ready.threadId
    ).at(-1);
    assert.deepEqual(firstTurnSnapshot?.options, { targetClientIds: ['desktop-follower'] });

    g.codexService.emit('notification', startedNotification);
    await delay(40);
    assert.equal(countBroadcasts('thread-read-state-changed'), 1);
    assert.equal(countBroadcasts('query-cache-invalidate'), 4);

    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: {
            threadId: ready.threadId,
            turn: { id: 'turn-discovery-1', status: 'completed', items: [] }
        }
    });
    await delay(40);
    assert.equal(countBroadcasts('thread-read-state-changed'), 1);
    assert.equal(countBroadcasts('query-cache-invalidate'), 6);

    const ownerSummary = messages
        .filter((message) => message.type === 'codex_ipc_conversations')
        .flatMap((message) => message.conversations || [])
        .find((conversation) => conversation.conversationId === ready.threadId);
    assert.equal(ownerSummary?.ownerKind, 'termlink');

    ws.close();
    await stopGateway(g);
});

test('TermLink owner targets current followers and stops after unfollow or disconnect', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'owner followers' });
    sess.cwd = 'E:\\coding\\TermLink';
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(100);
    const threadId = messages.find((message) => message.type === 'codex_thread_ready')?.threadId;
    assert.ok(threadId);

    for (const sourceClientId of ['desktop-follower', 'vscode-follower']) {
        g.ipcFeed.pushBroadcast({
            type: 'broadcast',
            method: 'thread-stream-following-changed',
            sourceClientId,
            params: { conversationId: threadId, hostId: 'local', following: true }
        });
    }
    await delay(20);
    g.codexService.emit('notification', {
        method: 'turn/started',
        params: { threadId, turn: { id: 'turn-owner-followers', status: 'inProgress', items: [] } }
    });
    await delay(30);
    let latest = g.ipcFeed.broadcastCalls.filter((call) =>
        call.method === 'thread-stream-state-changed' && call.params?.conversationId === threadId
    ).at(-1);
    assert.deepEqual(latest?.options, {
        targetClientIds: ['desktop-follower', 'vscode-follower']
    });

    g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'desktop-follower',
        params: { conversationId: threadId, hostId: 'local', following: false }
    });
    g.codexService.emit('notification', {
        method: 'item/started',
        params: {
            threadId,
            turnId: 'turn-owner-followers',
            item: { id: 'item-owner-followers', type: 'agentMessage', text: '' }
        }
    });
    await delay(30);
    latest = g.ipcFeed.broadcastCalls.filter((call) =>
        call.method === 'thread-stream-state-changed' && call.params?.conversationId === threadId
    ).at(-1);
    assert.deepEqual(latest?.options, { targetClientIds: ['vscode-follower'] });

    const targetedCount = g.ipcFeed.broadcastCalls.filter((call) =>
        call.method === 'thread-stream-state-changed' && call.params?.conversationId === threadId
    ).length;
    g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'client-status-changed',
        sourceClientId: 'router',
        params: { clientId: 'vscode-follower', clientType: 'vscode', status: 'disconnected' }
    });
    g.codexService.emit('notification', {
        method: 'turn/completed',
        params: { threadId, turn: { id: 'turn-owner-followers', status: 'completed', items: [] } }
    });
    await delay(30);
    assert.equal(g.ipcFeed.broadcastCalls.filter((call) =>
        call.method === 'thread-stream-state-changed' && call.params?.conversationId === threadId
    ).length, targetedCount);

    const beforeUnknownFollow = g.ipcFeed.broadcastCalls.length;
    g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'desktop-follower',
        params: { conversationId: 'external-owner-thread', hostId: 'local', following: true }
    });
    await delay(20);
    assert.equal(g.ipcFeed.broadcastCalls.length, beforeUnknownFollow);

    ws.close();
    await stopGateway(g);
});

test('TermLink owner ignores malformed following state instead of registering a follower', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'owner malformed follower' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(100);
    const threadId = messages.find((message) => message.type === 'codex_thread_ready')?.threadId;
    assert.ok(threadId);

    g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'malformed-follower',
        params: { conversationId: threadId, hostId: 'local' }
    });
    g.codexService.emit('notification', {
        method: 'turn/started',
        params: { threadId, turn: { id: 'turn-malformed-follower', status: 'inProgress', items: [] } }
    });
    await delay(30);

    assert.equal(g.ipcFeed.broadcastCalls.some((call) => (
        call.method === 'thread-stream-state-changed' &&
        call.params?.conversationId === threadId
    )), false);
    ws.close();
    await stopGateway(g);
});

test('TermLink owner contains follower handshake send failures and remains usable', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'owner follower send failure' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(100);
    const threadId = messages.find((message) => message.type === 'codex_thread_ready')?.threadId;
    assert.ok(threadId);

    const originalSendBroadcast = g.ipcFeed.sendBroadcast.bind(g.ipcFeed);
    g.ipcFeed.sendBroadcast = (method, params, options) => {
        if (method === 'thread-stream-state-changed') throw new Error('simulated snapshot send failure');
        return originalSendBroadcast(method, params, options);
    };
    assert.doesNotThrow(() => g.ipcFeed.pushBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'desktop-follower',
        params: { conversationId: threadId, hostId: 'local', following: true }
    }));

    g.ipcFeed.sendBroadcast = originalSendBroadcast;
    g.codexService.emit('notification', {
        method: 'turn/started',
        params: { threadId, turn: { id: 'turn-after-send-failure', status: 'inProgress', items: [] } }
    });
    await delay(30);
    const recoveredSnapshot = g.ipcFeed.broadcastCalls.filter((call) => (
        call.method === 'thread-stream-state-changed' &&
        call.params?.conversationId === threadId
    )).at(-1);
    assert.deepEqual(recoveredSnapshot?.options, { targetClientIds: ['desktop-follower'] });

    g.ipcFeed.pushStatus({ online: false });
    g.ipcFeed.sendBroadcast = (method, params, options) => {
        if (method === 'thread-stream-following-status-requested') {
            throw new Error('simulated status request failure');
        }
        return originalSendBroadcast(method, params, options);
    };
    assert.doesNotThrow(() => g.ipcFeed.pushStatus({ online: true, clientId: 'termlink-ipc' }));
    g.ipcFeed.sendBroadcast = originalSendBroadcast;

    ws.close();
    await stopGateway(g);
});

test('new blank owner remains tracked through first selection and materializes its first turn', async () => {
    const g = await setupGateway();
    g.codexService.requestHandler = async (method, params) => {
        if (method === 'thread/start') {
            return {
                thread: {
                    id: 'thread-new-blank-owner',
                    cwd: params?.cwd || 'E:\\coding\\TermLink'
                }
            };
        }
        if (method === 'turn/start') {
            return {
                turn: {
                    id: 'turn-new-blank-owner',
                    status: 'inProgress',
                    items: []
                }
            };
        }
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'new blank owner' });
    sess.cwd = 'E:\\coding\\TermLink';
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);

    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(100);
    const threadId = messages.find((message) => message.type === 'codex_thread_ready')?.threadId;
    assert.equal(threadId, 'thread-new-blank-owner');

    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: threadId }));
    await enableFollowerMode(ws);
    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: threadId,
        clientRequestId: 'new-blank-first-turn',
        input: 'materialize the blank owner'
    }));
    await delay(140);

    const turnStart = g.codexService.requests.find((request) =>
        request.method === 'turn/start' &&
        request.params.threadId === threadId
    );
    assert.ok(turnStart);
    assert.ok(turnStart.params.input.some((part) => part.text === 'materialize the blank owner'));
    assert.ok(messages.find((message) =>
        message.type === 'follower_message_sent' &&
        message.conversationId === threadId
    ));
    const ownerSurface = messages.filter((message) =>
        message.type === 'conversation_surface_snapshot' &&
        message.conversationId === threadId
    ).at(-1);
    assert.equal(ownerSurface?.snapshot.ownerKind, 'termlink');
    assert.equal(ownerSurface?.snapshot.status, 'running');

    ws.close();
    await stopGateway(g);
});

test('owner request handlers keep Desktop controls on the TermLink app-server authority', async () => {
    const g = await setupGateway();
    const sess = await g.sm.createSession({ name: 'owner controls' });
    sess.cwd = 'E:\\coding\\TermLink';
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'codex_new_thread' }));
    await delay(100);
    const threadId = messages.find((message) => message.type === 'codex_thread_ready')?.threadId;
    assert.ok(threadId);

    const start = await g.ipcFeed.dispatchIncomingRequest('thread-follower-start-turn', {
        conversationId: threadId,
        turnStartParams: {
            clientUserMessageId: 'desktop-user-1',
            input: [{ type: 'text', text: 'continue from desktop', text_elements: [] }]
        }
    });
    assert.equal(start.canHandle, true);
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'turn/start' &&
        request.params.threadId === threadId
    ));

    const interrupt = await g.ipcFeed.dispatchIncomingRequest('thread-follower-interrupt-turn', {
        conversationId: threadId,
        turnId: start.result.turn.id
    });
    assert.equal(interrupt.canHandle, true);
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'turn/interrupt' &&
        request.params.threadId === threadId &&
        request.params.turnId === start.result.turn.id
    ));

    await g.ipcFeed.dispatchIncomingRequest('thread-follower-update-thread-settings', {
        conversationId: threadId,
        threadSettings: {
            collaborationMode: {
                mode: 'default',
                settings: { model: 'gpt-5.4', reasoning_effort: 'medium' }
            }
        }
    });
    await g.ipcFeed.dispatchIncomingRequest('thread-follower-compact-thread', {
        conversationId: threadId
    });
    await g.ipcFeed.dispatchIncomingRequest('thread-follower-steer-turn', {
        conversationId: threadId,
        expectedTurnId: start.result.turn.id,
        input: [{ type: 'text', text: 'steer from desktop', text_elements: [] }]
    });
    await g.ipcFeed.dispatchIncomingRequest('thread/read', {
        conversationId: threadId,
        includeTurns: true
    });
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'thread/settings/update' && request.params.threadId === threadId
    ));
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'thread/compact/start' && request.params.threadId === threadId
    ));
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'turn/steer' &&
        request.params.expectedTurnId === start.result.turn.id
    ));
    assert.ok(g.codexService.requests.find((request) =>
        request.method === 'thread/read' && request.params.threadId === threadId
    ));

    g.codexService.emit('server_request', {
        requestId: 'desktop-owner-approval',
        handledBy: 'client',
        message: {
            method: 'item/commandExecution/requestApproval',
            params: {
                threadId,
                command: 'echo desktop-owner'
            }
        }
    });
    await delay(30);
    const approval = await g.ipcFeed.dispatchIncomingRequest(
        'thread-follower-command-approval-decision',
        {
            conversationId: threadId,
            requestId: 'desktop-owner-approval',
            decision: 'accept'
        }
    );
    assert.equal(approval.canHandle, true);
    assert.deepEqual(g.codexService.responses.at(-1), {
        requestId: 'desktop-owner-approval',
        response: { result: { decision: 'accept' } }
    });

    g.codexService.emit('server_request', {
        requestId: 'desktop-owner-input',
        handledBy: 'client',
        message: {
            method: 'item/tool/requestUserInput',
            params: {
                threadId,
                questions: [{ id: 'question-1', question: 'Continue?' }]
            }
        }
    });
    await delay(30);
    const userInput = await g.ipcFeed.dispatchIncomingRequest(
        'thread-follower-submit-user-input',
        {
            conversationId: threadId,
            requestId: 'desktop-owner-input',
            response: {
                answers: {
                    'question-1': { answers: ['yes'] }
                }
            }
        }
    );
    assert.equal(userInput.canHandle, true);
    assert.equal(g.codexService.responses.at(-1).requestId, 'desktop-owner-input');
    assert.equal(g.ipcFeed.requestHandlers.has('thread-follower-edit-last-user-turn'), false);
    assert.equal(g.ipcFeed.requestHandlers.has('thread-follower-submit-mcp-server-elicitation-response'), false);
    assert.equal(g.ipcFeed.requestHandlers.has('thread-follower-set-queued-follow-ups-state'), false);

    ws.close();
    await stopGateway(g);
});

test('follower message carries plan, image and skill input through one authority route', async () => {
    let captured;
    let requestCount = 0;
    const ipcFeed = new FakeIpcFeed({
        sendRequestHandler: async (method, params) => {
            requestCount += 1;
            captured = { method, params };
            return {
                type: 'response',
                resultType: 'success',
                method,
                result: { turn: { id: 'turn-rich-input' } }
            };
        }
    });
    ipcFeed.pushSnapshot('conv-rich-input', {
        conversationId: 'conv-rich-input',
        status: 'completed',
        cwd: 'E:\\coding\\TermLink',
        items: []
    });
    const g = await setupGateway({ ipcFeed });
    const sess = await g.sm.createSession({ name: 'rich follower' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-rich-input' }));
    await enableFollowerMode(ws);

    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-rich-input',
        clientRequestId: 'android-rich-1',
        input: '@docs/plan.md\\nReview the attached screenshot',
        attachments: [{ type: 'image', url: 'https://example.com/screenshot.png' }],
        interactionState: { planMode: true, activeSkill: 'adb-real-device-debug' },
        collaborationMode: {
            mode: 'plan',
            settings: { model: 'gpt-5.4', reasoning_effort: 'high' }
        }
    }));
    await delay(160);

    assert.equal(captured.method, 'thread-follower-start-turn');
    assert.equal(captured.params.conversationId, 'conv-rich-input');
    assert.equal(captured.params.turnStartParams.collaborationMode.mode, 'plan');
    assert.ok(captured.params.turnStartParams.input.find((entry) =>
        entry.type === 'text' && entry.text.includes('@docs/plan.md')
    ));
    assert.ok(captured.params.turnStartParams.input.find((entry) =>
        entry.type === 'skill' && entry.name === 'adb-real-device-debug'
    ));
    assert.ok(captured.params.turnStartParams.input.find((entry) =>
        entry.type === 'image' && entry.url === 'https://example.com/screenshot.png'
    ));
    const routeStates = messages
        .filter((message) => message.type === 'follower_route_state')
        .map((message) => message.state);
    assert.deepEqual(routeStates.slice(-3), ['accepted', 'routed', 'turn_started']);
    assert.ok(messages
        .filter((message) => message.type === 'follower_route_state')
        .every((message) => message.phase === message.state));

    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-rich-input',
        clientRequestId: 'android-rich-1',
        input: 'duplicate must not start another turn'
    }));
    await delay(80);
    assert.equal(requestCount, 1);
    assert.ok(messages.find((message) =>
        message.type === 'follower_message_sent' &&
        message.clientRequestId === 'android-rich-1' &&
        message.replayed === true
    ));

    ws.close();
    await stopGateway(g);
});

test('missing owner thread requires confirmation and never silently starts a replacement', async () => {
    const ipcFeed = new FakeIpcFeed({ online: false });
    const g = await setupGateway({ ipcFeed });
    g.codexService.requestHandler = async (method, params) => {
        if (method === 'thread/resume') {
            const error = new Error(`thread not found: ${params.threadId}`);
            error.code = -32600;
            throw error;
        }
        return { ok: true };
    };
    const sess = await g.sm.createSession({ name: 'recovery required' });
    const { ws, messages } = await connectWs(g.port, sess.id);
    await delay(80);
    ws.send(JSON.stringify({ type: 'set_active_conversation', conversationId: 'conv-missing-owner' }));
    await enableFollowerMode(ws);

    ws.send(JSON.stringify({
        type: 'follower_send_message',
        conversationId: 'conv-missing-owner',
        clientRequestId: 'recover-request-1',
        input: 'do not lose this draft'
    }));
    await delay(160);

    const recovery = messages.find((message) =>
        message.type === 'codex_thread_recovery_required' &&
        message.conversationId === 'conv-missing-owner'
    );
    assert.ok(recovery?.recoveryId);
    assert.equal(recovery.forkAvailable, false);
    assert.deepEqual(recovery.actions, ['retry', 'new', 'cancel']);
    assert.equal(
        g.codexService.requests.filter((request) => request.method === 'thread/start').length,
        0
    );

    const secondClient = await connectWs(g.port, sess.id);
    secondClient.ws.send(JSON.stringify({
        type: 'codex_thread_recovery_action',
        recoveryId: recovery.recoveryId,
        action: 'cancel'
    }));
    await delay(80);
    assert.ok(secondClient.messages.find((message) =>
        message.type === 'codex_error' &&
        message.code === 'CODEX_THREAD_RECOVERY_EXPIRED'
    ));

    ws.send(JSON.stringify({
        type: 'codex_thread_recovery_action',
        recoveryId: recovery.recoveryId,
        action: 'cancel'
    }));
    await delay(80);
    const resolved = messages.find((message) =>
        message.type === 'codex_thread_recovery_resolved' &&
        message.recoveryId === recovery.recoveryId
    );
    assert.equal(resolved?.action, 'cancel');
    assert.equal(resolved?.draft?.input, 'do not lose this draft');

    secondClient.ws.close();
    ws.close();
    await stopGateway(g);
});
