'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { CodexIpcFeed } = require('../src/services/codexIpcFeed');
const { ThreadStreamTracker } = require('../src/services/codexIpcThreadStream');

// ── FakeClient ───────────────────────────────────────────────────────────────

class FakeClient extends EventEmitter {
    constructor(opts = {}) {
        super();
        this._clientId = opts.clientId || 'fake-client-1';
        this._connectFails = opts.connectFails || false;
        this.connectCount = 0;
    }
    get clientId() { return this._clientId; }
    async connect() {
        this.connectCount += 1;
        if (this._connectFails) throw new Error('pipe unavailable');
        this.emit('connect', { pipePath: '\\\\.\\pipe\\codex-ipc' });
    }
    close() { this.emit('close', { hadError: false }); }
    simulateBroadcast(message) { this.emit('broadcast', message); }
    simulateMessageIn(message) { this.emit('message_in', message); }
    simulateMessageOut(message) { this.emit('message_out', message); }
    simulateError(err) { this.emit('error', err); }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function enableIpc() {
    process.env.TERMLINK_CODEX_IPC_ENABLED = '1';
    process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '0';
    process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND = '0';
}

function disableIpc() {
    process.env.TERMLINK_CODEX_IPC_ENABLED = '0';
}

function snapshotBroadcast(conversationId, revision, turns, sourceClientId) {
    return { method: 'thread-stream-state-changed', sourceClientId, params: { conversationId, change: { type: 'snapshot', revision, conversationState: { turns: turns || [] } } } };
}

/** Start feed + wait for the initial online status event. */
async function startAndWaitOnline(feed) {
    const p = new Promise((resolve) => {
        const onStatus = (s) => {
            if (!s.online) return;
            feed.removeListener('status', onStatus);
            resolve(s);
        };
        feed.on('status', onStatus);
    });
    await feed.start();
    return p;
}

// ── tests ────────────────────────────────────────────────────────────────────

test('when IPC disabled, feed emits disabled status without connecting', async () => {
    disableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });

    const p = new Promise((resolve) => feed.once('status', resolve));
    await feed.start();
    const s = await p;
    assert.equal(s.online, false);
    assert.equal(s.reason, 'disabled');
    feed.stop();
});

test('feed emits online status on client connect', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);
    assert.equal(feed.online, true);
    assert.equal(feed.getStatus().clientId, 'fake-client-1');
    feed.stop();
});

test('feed emits offline status on client close', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const offlineP = new Promise((resolve) => feed.once('status', (s) => { if (!s.online) resolve(s); }));
    client.close();
    const s = await offlineP;
    assert.equal(s.online, false);
    assert.equal(s.reason, 'disconnected');
    assert.equal(s.clientId, undefined);
    assert.equal(feed.getStatus().clientId, undefined);
    feed.stop();
});

test('feed emits unavailable status when connect fails', async () => {
    enableIpc();
    const client = new FakeClient({ connectFails: true });
    const feed = new CodexIpcFeed({ client });

    const p = new Promise((resolve) => feed.on('status', (s) => { if (s.reason === 'unavailable') resolve(s); }));
    await feed.start();
    const s = await p;
    assert.equal(s.online, false);
    assert.equal(s.reason, 'unavailable');
    assert.equal(s.clientId, undefined);
    assert.equal(feed.getStatus().clientId, undefined);
    feed.stop();
});

test('feed retries after initial connect failure and returns online', async () => {
    enableIpc();
    const client = new FakeClient({ connectFails: true });
    const feed = new CodexIpcFeed({ client, reconnectDelayMs: 10 });

    const onlineP = new Promise((resolve) => feed.on('status', (s) => { if (s.online) resolve(s); }));
    await feed.start();
    assert.equal(feed.getStatus().online, false);
    assert.equal(feed.getStatus().reason, 'unavailable');

    client._connectFails = false;
    const s = await onlineP;
    assert.equal(s.online, true);
    assert.equal(feed.online, true);
    assert.ok(client.connectCount >= 2);
    feed.stop();
});

test('feed emits snapshot on thread-stream-state-changed broadcast', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const snapP = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-1', 1, [{ turnId: 't1', status: 'completed', items: [{ type: 'userMessage', content: 'hello' }] }]));
    const snap = await snapP;
    assert.equal(snap.conversationId, 'conv-1');
    assert.equal(snap.revision, 1);
    assert.equal(snap.surface.conversationId, 'conv-1');
    feed.stop();
});

test('feed emits and caches demo-style sync events with surface projection', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const eventP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-1', 7, [
        { turnId: 't1', status: 'completed', items: [{ type: 'agentMessage', phase: 'final_answer', text: 'done' }] }
    ], 'desktop-owner'));
    const event = await eventP;

    assert.equal(event.sequence, 1);
    assert.equal(event.method, 'thread-stream-state-changed');
    assert.equal(event.threadId, 'conv-1');
    assert.equal(event.sourceClientId, 'desktop-owner');
    assert.equal(event.surface.conversationId, 'conv-1');
    assert.equal(event.surface.revision, 7);
    assert.equal(feed.getRecentEvents().length, 1);
    assert.equal(feed.getRecentEvents()[0].surface.status, 'completed');
    feed.stop();
});

test('feed records incoming and outgoing raw IPC events', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client, maxEvents: 3 });
    await startAndWaitOnline(feed);

    client.simulateMessageIn({ type: 'broadcast', method: 'thread-stream-state-changed', sourceClientId: 'desktop-owner', params: { conversationId: 'conv-raw' } });
    client.simulateMessageOut({ type: 'request', method: 'thread-follower-start-turn', requestId: 'req-1', targetClientId: 'desktop-owner', params: { conversationId: 'conv-raw' } });

    const raw = feed.getRawEvents();
    assert.equal(raw.length, 2);
    assert.equal(raw[0].direction, 'incoming');
    assert.equal(raw[0].conversationId, 'conv-raw');
    assert.equal(raw[1].direction, 'outgoing');
    assert.equal(raw[1].requestId, 'req-1');
    feed.stop();
});

test('snapshot is cached and retrievable via getLatestSnapshot', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const snapP = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-1', 1, [{ turnId: 't1', items: [{ type: 'userMessage', content: 'hi' }] }]));
    await snapP;

    const cached = feed.getLatestSnapshot('conv-1');
    assert.ok(cached);
    assert.equal(cached.conversationId, 'conv-1');
    feed.stop();
});

test('getRecentSnapshots returns latest per conversation sorted by timestamp', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const p1 = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-a', 1, [{ turnId: 'ta' }]));
    await p1;
    const p2 = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-b', 1, [{ turnId: 'tb' }]));
    await p2;

    const recent = feed.getRecentSnapshots();
    assert.equal(recent.length, 2);
    const ids = recent.map(r => r.conversationId).sort();
    assert.deepEqual(ids, ['conv-a', 'conv-b']);
    feed.stop();
});

test('feed detects richer external surfaces for a conversation', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-client' });
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const ownP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-rich', 1, [{ turnId: 't0', items: [] }], 'termlink-client'));
    await ownP;
    assert.equal(feed.hasRicherExternalSurface('conv-rich', { items: [] }), false);

    const externalP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-rich', 2, [{
        turnId: 't1',
        status: 'completed',
        items: [{ type: 'agentMessage', phase: 'final_answer', text: 'final answer' }]
    }], 'desktop-owner'));
    await externalP;

    assert.equal(feed.hasRicherExternalSurface('conv-rich', { items: [] }), true);
    feed.stop();
});

test('feed detects pending plan action from external live surface only', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-client' });
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const ownP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-plan', 1, [], 'termlink-client'));
    await ownP;

    const ownState = feed.getLatestSnapshot('conv-plan');
    assert.equal(feed.hasExternalPendingPlanAction('conv-plan', ownState?.pendingPlanAction?.requestId), false);

    const externalP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast({
        method: 'thread-stream-state-changed',
        sourceClientId: 'desktop-owner',
        params: {
            conversationId: 'conv-plan',
            change: {
                type: 'snapshot',
                revision: 2,
                conversationState: {
                    turns: [{ turnId: 't99', status: 'completed', items: [] }],
                    requests: [{ id: 'plan-req-1', method: 'item/plan/requestImplementation', params: { turnId: 't99', planContent: 'BUILD IT' } }]
                }
            }
        }
    });
    await externalP;

    assert.equal(feed.hasExternalPendingPlanAction('conv-plan', 'plan-req-1'), true);
    assert.equal(feed.hasExternalPendingPlanAction('conv-plan', 'missing'), false);
    feed.stop();
});

test('snapshot cache is pruned when exceeding maxSnapshots', async () => {
    enableIpc();
    const client = new FakeClient();
    const tracker = new ThreadStreamTracker();
    const feed = new CodexIpcFeed({ client, tracker, maxSnapshots: 3 });
    await startAndWaitOnline(feed);

    for (let i = 1; i <= 5; i++) {
        const p = new Promise((resolve) => feed.once('snapshot', resolve));
        client.simulateBroadcast(snapshotBroadcast('conv-1', i, [{ turnId: `t${i}` }]));
        await p;
    }
    assert.equal(feed.getLatestSnapshot('conv-1').revision, 5);
    assert.equal(feed.getRecentSnapshots().length, 1);
    feed.stop();
});

test('snapshots from different conversations do not interfere', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const p1 = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-x', 1, [{ turnId: 'tx', items: [{ type: 'userMessage', content: 'x' }] }]));
    await p1;
    const p2 = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-y', 1, [{ turnId: 'ty', items: [{ type: 'userMessage', content: 'y' }] }]));
    await p2;

    assert.equal(feed.getLatestSnapshot('conv-x').conversationId, 'conv-x');
    assert.equal(feed.getLatestSnapshot('conv-y').conversationId, 'conv-y');
    feed.stop();
});

test('broadcasts other than thread-stream-state-changed do not emit snapshot', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    let emitted = false;
    feed.on('snapshot', () => { emitted = true; });
    client.simulateBroadcast({ method: 'thread-read-state-changed', params: {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(emitted, false);
    feed.stop();
});

test('client errors are forwarded', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const errP = new Promise((resolve) => feed.once('error', resolve));
    client.simulateError(new Error('boom'));
    assert.equal((await errP).message, 'boom');
    feed.stop();
});

test('stop emits offline status and cleans up', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const stopP = new Promise((resolve) => feed.once('status', (s) => { if (!s.online) resolve(s); }));
    feed.stop();
    const s = await stopP;
    assert.equal(s.reason, 'stopped');
    assert.equal(s.clientId, undefined);
    assert.equal(feed.getStatus().clientId, undefined);
    assert.equal(feed.online, false);
    assert.equal(feed.started, false);
});

test('double start is a no-op', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    let connects = 0;
    client.on('connect', () => connects++);

    await startAndWaitOnline(feed);
    await feed.start();
    assert.equal(connects, 1);
    feed.stop();
});
