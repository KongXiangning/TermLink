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
        this.initialized = false;
        this.broadcasts = [];
        this.requestHandlers = [];
        this._sendBroadcastResult = opts.sendBroadcastResult;
        this._sendBroadcastError = opts.sendBroadcastError || null;
    }
    get clientId() { return this._clientId; }
    async connect() {
        this.connectCount += 1;
        if (this._connectFails) throw new Error('pipe unavailable');
        this.emit('connect', { pipePath: '\\\\.\\pipe\\codex-ipc' });
        this.initialized = true;
    }
    close() { this.initialized = false; this.emit('close', { hadError: false }); }
    sendBroadcast(method, params, options) {
        if (this._sendBroadcastError) throw this._sendBroadcastError;
        this.broadcasts.push({ method, params, ...(options === undefined ? {} : { options }) });
        return this._sendBroadcastResult === undefined ? true : this._sendBroadcastResult;
    }
    addRequestHandler(method, canHandle, handle) {
        const registration = { method, canHandle, handle };
        this.requestHandlers.push(registration);
        return () => {
            this.requestHandlers = this.requestHandlers.filter((candidate) => candidate !== registration);
        };
    }
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

function stateSnapshotBroadcast(conversationId, revision, conversationState, sourceClientId) {
    return { method: 'thread-stream-state-changed', sourceClientId, params: { conversationId, change: { type: 'snapshot', revision, conversationState } } };
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

test('feed installs and disposes request handlers registered before start', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    const dispose = feed.addRequestHandler(
        'thread/read',
        (params) => params?.threadId === 'conv-owned',
        async () => ({ thread: { id: 'conv-owned' } })
    );

    assert.equal(client.requestHandlers.length, 1);
    await startAndWaitOnline(feed);
    assert.equal(client.requestHandlers.length, 1, 'start must not install the same handler twice');
    assert.equal(await client.requestHandlers[0].canHandle({ threadId: 'conv-owned' }), true);

    dispose();
    assert.equal(client.requestHandlers.length, 0);
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
    assert.equal(snap.surface.desynced, false);
    feed.stop();
});

test('feed sends following only on first acquire and unfollows on final release', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    assert.equal(feed.followConversation(' conv-follow '), true);
    assert.equal(feed.followConversation('conv-follow'), true);
    assert.deepEqual(client.broadcasts, [{
        method: 'thread-stream-following-changed',
        params: { conversationId: 'conv-follow', hostId: 'local', following: true }
    }]);

    assert.equal(feed.unfollowConversation('conv-follow'), true);
    assert.equal(client.broadcasts.length, 1, 'one remaining reference must keep IPC following active');
    assert.equal(feed.unfollowConversation('conv-follow'), true);
    assert.deepEqual(client.broadcasts[1], {
        method: 'thread-stream-following-changed',
        params: { conversationId: 'conv-follow', hostId: 'local', following: false }
    });
    feed.stop();
});

test('feed exposes initial and reconnect announcement generations without changing desired ref-count', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-client' });
    const feed = new CodexIpcFeed({ client, reconnectDelayMs: 10 });
    const announcements = [];
    feed.on('following_announcement', (event) => announcements.push(event));

    assert.equal(feed.followConversation('conv-observe', 'local'), true);
    const pending = feed.getFollowingState('conv-observe', 'local');
    assert.equal(pending?.desiredGeneration, 1);
    assert.equal(pending?.refCount, 1);
    assert.equal(pending?.announcement.lastResult, 'not_initialized');

    await startAndWaitOnline(feed);
    const initial = announcements.at(-1);
    assert.equal(initial?.source, 'initial');
    assert.equal(initial?.result, 'sent');
    assert.equal(initial?.connectionGeneration, 1);
    assert.equal(initial?.desiredGeneration, 1);
    assert.ok(initial?.sentAt);

    assert.equal(feed.followConversation('conv-observe', 'local'), true);
    assert.equal(feed.getFollowingState('conv-observe', 'local')?.refCount, 2);
    assert.equal(feed.getFollowingState('conv-observe', 'local')?.desiredGeneration, 1);

    client.close();
    await new Promise((resolve) => setTimeout(resolve, 40));
    const reconnect = announcements.at(-1);
    assert.equal(reconnect?.source, 'reconnect');
    assert.equal(reconnect?.result, 'sent');
    assert.equal(reconnect?.connectionGeneration, 2);
    assert.equal(reconnect?.desiredGeneration, 1);
    const state = feed.getFollowingState('conv-observe', 'local');
    assert.equal(state?.refCount, 2);
    assert.equal(state?.announcement.lastSource, 'reconnect');
    assert.equal(state?.announcement.lastResult, 'sent');
    assert.equal(state?.announcement.sendCount, 2);
    assert.equal(state?.announcement.attemptCount, 3);
    assert.ok(state?.announcement.firstSentAt <= state?.announcement.lastSentAt);
    feed.stop();
});

test('feed exposes a targeted status-request reannouncement without changing desired generation', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-follower' });
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);
    feed.followConversation('conv-status-observe', 'local');
    const initial = feed.getFollowingState('conv-status-observe', 'local');
    const announcements = [];
    feed.on('following_announcement', (event) => announcements.push(event));

    client.simulateBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-status-requested',
        sourceClientId: 'desktop-owner',
        params: { conversationId: 'conv-status-observe', hostId: 'local' }
    });
    await new Promise((resolve) => setImmediate(resolve));

    const statusRequest = announcements.at(-1);
    assert.equal(statusRequest?.source, 'status-request');
    assert.equal(statusRequest?.result, 'sent');
    assert.equal(statusRequest?.connectionGeneration, 1);
    assert.equal(statusRequest?.desiredGeneration, initial?.desiredGeneration);
    assert.equal(statusRequest?.targetClientCount, 1);
    assert.equal(feed.getFollowingState('conv-status-observe', 'local')?.desiredGeneration, initial?.desiredGeneration);
    assert.equal(feed.getFollowingState('conv-status-observe', 'local')?.announcement.sendCount, 2);
    feed.stop();
});

test('feed records failed announcements while retaining desired intent', async () => {
    enableIpc();
    const client = new FakeClient({ sendBroadcastResult: false });
    const feed = new CodexIpcFeed({ client });
    const announcementP = new Promise((resolve) => feed.once('following_announcement', resolve));
    await startAndWaitOnline(feed);
    assert.equal(feed.followConversation('conv-send-failure', 'local'), true);

    const announcement = await announcementP;
    assert.equal(announcement.result, 'rejected');
    assert.equal(announcement.source, 'initial');
    assert.equal(announcement.connectionGeneration, 1);
    const state = feed.getFollowingState('conv-send-failure', 'local');
    assert.equal(state?.refCount, 1);
    assert.equal(state?.announcement.lastResult, 'rejected');
    assert.equal(state?.announcement.sendCount, 0);
    assert.equal(state?.announcement.attemptCount, 1);
    feed.stop();
});

test('feed replays desired following after IPC reconnect initializes a new client session', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client, reconnectDelayMs: 10 });
    await startAndWaitOnline(feed);
    feed.followConversation('conv-reconnect', 'local');
    assert.equal(client.broadcasts.length, 1);

    client.close();
    await new Promise((resolve) => setTimeout(resolve, 40));

    assert.ok(client.connectCount >= 2);
    assert.deepEqual(client.broadcasts[1], {
        method: 'thread-stream-following-changed',
        params: { conversationId: 'conv-reconnect', hostId: 'local', following: true }
    });
    feed.stop();
});

test('feed stores following requested before initialization and sends it once connect completes', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    assert.equal(feed.followConversation('conv-before-start'), true);
    assert.equal(client.broadcasts.length, 0);

    await startAndWaitOnline(feed);
    assert.deepEqual(client.broadcasts, [{
        method: 'thread-stream-following-changed',
        params: { conversationId: 'conv-before-start', hostId: 'local', following: true }
    }]);
    feed.stop();
});

test('feed exposes desync on revision mismatch and clears it on the next full snapshot', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    let snapshotP = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-desync', 3, []));
    await snapshotP;

    snapshotP = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast({
        method: 'thread-stream-state-changed',
        params: {
            conversationId: 'conv-desync',
            change: { type: 'patches', revision: 5, baseRevision: 4, patches: [] }
        }
    });
    const desynced = await snapshotP;
    assert.equal(desynced.surface.desynced, true);

    snapshotP = new Promise((resolve) => feed.once('snapshot', resolve));
    client.simulateBroadcast(snapshotBroadcast('conv-desync', 6, []));
    const recovered = await snapshotP;
    assert.equal(recovered.surface.desynced, false);
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
    assert.equal(event.sourceEpoch.startsWith('ipc:'), true);
    assert.equal(event.itemCount, 1);
    assert.equal(event.surface, undefined);
    assert.equal(event.projection, undefined);
    assert.equal(feed.getLatestSnapshot('conv-1').conversationId, 'conv-1');
    assert.equal(feed.getLatestSnapshot('conv-1').revision, 7);
    assert.equal(feed.getRecentEvents().length, 1);
    assert.equal(feed.getRecentEvents()[0].surface, undefined);
    feed.stop();
});

test('feed maps canonical runtime state and history to a running surface', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    const eventP = new Promise((resolve) => feed.once('event', resolve));
    client.simulateBroadcast(stateSnapshotBroadcast('conv-canonical', 11, {
        turns: [],
        threadRuntimeStatus: { type: 'active', activeFlags: [] },
        turnHistory: {
            kind: 'canonical',
            history: {
                entitiesByKey: {
                    'tail:local:1': {
                        turnId: 'turn-live',
                        status: 'inProgress',
                        items: [{ type: 'agentMessage', phase: 'commentary', text: 'live update' }]
                    }
                },
                islands: [{
                    id: 'tail:1',
                    entries: [{ key: 'tail:local:1', value: 'tail:local:1' }]
                }]
            }
        }
    }, 'desktop-owner'));
    const event = await eventP;

    const latest = feed.getLatestSnapshot('conv-canonical');
    assert.equal(latest.status, 'running');
    assert.equal(latest.latestTurnId, 'turn-live');
    assert.ok(latest.items.some((item) => item.text === 'live update'));
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

test('feed exposes incoming lifecycle broadcasts without projecting a snapshot', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    let snapshotEmitted = false;
    feed.on('snapshot', () => { snapshotEmitted = true; });
    const incoming = {
        type: 'broadcast',
        method: 'thread-stream-following-changed',
        sourceClientId: 'desktop-follower',
        params: { conversationId: 'conv-owned', hostId: 'local', following: true }
    };
    const broadcastP = new Promise((resolve) => feed.once('broadcast', resolve));
    client.simulateBroadcast(incoming);

    assert.equal(await broadcastP, incoming);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(snapshotEmitted, false);
    feed.stop();
});

test('feed forwards targeted broadcast options to the IPC client', async () => {
    enableIpc();
    const client = new FakeClient();
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    assert.equal(feed.sendBroadcast(
        'thread-stream-state-changed',
        { conversationId: 'conv-owned' },
        { targetClientIds: ['desktop-follower'] }
    ), true);
    assert.deepEqual(client.broadcasts.at(-1), {
        method: 'thread-stream-state-changed',
        params: { conversationId: 'conv-owned' },
        options: { targetClientIds: ['desktop-follower'] }
    });
    feed.stop();
});

test('feed re-announces an existing desired subscription to a requesting owner', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-follower' });
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);
    feed.followConversation('conv-follow-status', 'local');

    client.simulateBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-status-requested',
        sourceClientId: 'desktop-owner',
        params: { conversationId: 'conv-follow-status', hostId: 'local' }
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(client.broadcasts.at(-1), {
        method: 'thread-stream-following-changed',
        params: { conversationId: 'conv-follow-status', hostId: 'local', following: true },
        options: { targetClientIds: ['desktop-owner'] }
    });
    feed.stop();
});

test('feed does not claim following status for an untracked conversation', async () => {
    enableIpc();
    const client = new FakeClient({ clientId: 'termlink-follower' });
    const feed = new CodexIpcFeed({ client });
    await startAndWaitOnline(feed);

    client.simulateBroadcast({
        type: 'broadcast',
        method: 'thread-stream-following-status-requested',
        sourceClientId: 'desktop-owner',
        params: { conversationId: 'conv-not-followed', hostId: 'local' }
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(client.broadcasts, []);
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
