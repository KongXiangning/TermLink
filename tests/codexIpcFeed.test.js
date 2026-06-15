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
    }
    get clientId() { return this._clientId; }
    async connect() {
        if (this._connectFails) throw new Error('pipe unavailable');
        this.emit('connect', { pipePath: '\\\\.\\pipe\\codex-ipc' });
    }
    close() { this.emit('close', { hadError: false }); }
    simulateBroadcast(message) { this.emit('broadcast', message); }
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

function snapshotBroadcast(conversationId, revision, turns) {
    return { method: 'thread-stream-state-changed', params: { conversationId, change: { type: 'snapshot', revision, conversationState: { turns: turns || [] } } } };
}

/** Start feed + wait for the initial online status event. */
async function startAndWaitOnline(feed, client) {
    const p = new Promise((resolve) => feed.once('status', (s) => { if (s.online) resolve(s); }));
    await feed.start();
    return client ? p : null; // status already emitted during start()
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
    feed.stop();
});

test('feed emits unavailable status when connect fails', async () => {
    enableIpc();
    const client = new FakeClient({ connectFails: true });
    const feed = new CodexIpcFeed({ client });

    const p = new Promise((resolve) => feed.once('status', resolve));
    await feed.start();
    const s = await p;
    assert.equal(s.online, false);
    assert.equal(s.reason, 'unavailable');
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
