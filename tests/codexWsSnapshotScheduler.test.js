'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
    CodexWsSnapshotScheduler,
    MAX_WS_ENVELOPE_BYTES,
    projectConversationActionPayload
} = require('../src/services/codexWsSnapshotScheduler');

class FakeWs extends EventEmitter {
    constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.sent = []; this.closed = null; }
    send(payload, callback) { this.sent.push(JSON.parse(payload)); callback?.(); }
    close(code, reason) { this.closed = { code, reason }; this.readyState = 3; this.emit('close'); }
}

class DeferredWs extends FakeWs {
    constructor() { super(); this.pendingCallbacks = []; }
    send(payload, callback) {
        this.sent.push(JSON.parse(payload));
        if (callback) this.pendingCallbacks.push(callback);
    }
    completeNextSend() { this.pendingCallbacks.shift()?.(); }
}

test('scheduler keeps only the latest snapshot for a websocket/conversation', () => {
    const ws = new FakeWs();
    const scheduler = new CodexWsSnapshotScheduler({ intervalMs: 1, isStillActive: () => true });
    scheduler.offer(ws, 'conv-a', { revision: 1 });
    scheduler.offer(ws, 'conv-a', { revision: 2 });
    scheduler.flush(ws);
    assert.deepEqual(ws.sent, [{ revision: 2 }]);
    assert.equal(scheduler.getStats().pendingSnapshots, 0);
});

test('scheduler drops a stale selection generation before serializing', () => {
    const ws = new FakeWs();
    let active = false;
    const scheduler = new CodexWsSnapshotScheduler({ isStillActive: () => active });
    scheduler.offer(ws, 'conv-a', { huge: 'payload' }, { selectionGeneration: 3 });
    scheduler.flush(ws);
    assert.equal(ws.sent.length, 0);
    assert.equal(scheduler.getStats().dropped, 1);
});

test('scheduler waits at high water and closes only after hard-limit timeout', () => {
    const ws = new FakeWs();
    let now = 1000;
    const scheduler = new CodexWsSnapshotScheduler({
        now: () => now,
        hardLimitBytes: 10,
        hardLimitDurationMs: 100,
        highWaterBytes: 5,
        lowWaterBytes: 2,
        isStillActive: () => true
    });
    ws.bufferedAmount = 11;
    scheduler.offer(ws, 'conv-a', { revision: 1 }, { priority: 'terminal' });
    assert.equal(ws.sent.length, 0);
    now += 101;
    scheduler.flush(ws);
    assert.equal(ws.closed?.code, 1013);
});

test('history gate yields while a live snapshot is queued or in flight', () => {
    const ws = new DeferredWs();
    const scheduler = new CodexWsSnapshotScheduler({ intervalMs: 1, isStillActive: () => true });
    scheduler.offer(ws, 'conv-a', { revision: 1 }, { priority: 'terminal' });
    assert.equal(scheduler.canSendHistory(ws), false);
    ws.completeNextSend();
    assert.equal(scheduler.canSendHistory(ws), true);

    scheduler.offer(ws, 'conv-a', { revision: 2 });
    assert.equal(scheduler.canSendHistory(ws), false);
    scheduler.flush(ws);
    assert.equal(scheduler.canSendHistory(ws), false);
    ws.completeNextSend();
    assert.equal(scheduler.canSendHistory(ws), true);
});

test('history gate yields while a control frame is awaiting websocket hand-off', () => {
    const ws = new DeferredWs();
    const scheduler = new CodexWsSnapshotScheduler({ isStillActive: () => true });
    assert.equal(scheduler.sendControl(ws, { type: 'conversation_action_required' }), true);
    assert.equal(scheduler.canSendHistory(ws), false);
    ws.completeNextSend();
    assert.equal(scheduler.canSendHistory(ws), true);
});

test('history wire hand-off is serialized while live can overtake the next history frame', () => {
    const ws = new DeferredWs();
    const scheduler = new CodexWsSnapshotScheduler({ isStillActive: () => true });

    assert.equal(scheduler.sendHistory(ws, { type: 'conversation_history_delta', pageIndex: 0 }), true);
    assert.equal(scheduler.canSendHistory(ws), false);
    assert.equal(scheduler.sendHistory(ws, { type: 'conversation_history_delta', pageIndex: 1 }), false);

    scheduler.offer(ws, 'conv-a', { type: 'conversation_surface_snapshot', revision: 1 }, { priority: 'terminal' });
    assert.deepEqual(ws.sent.map((envelope) => envelope.type), [
        'conversation_history_delta',
        'conversation_surface_snapshot'
    ]);

    ws.completeNextSend();
    assert.equal(scheduler.canSendHistory(ws), false);
    ws.completeNextSend();
    assert.equal(scheduler.canSendHistory(ws), true);
    assert.equal(scheduler.sendHistory(ws, { type: 'conversation_history_delta', pageIndex: 1 }), true);
});

test('history gate yields while an Android surface projection is pending', () => {
    const ws = new FakeWs();
    const scheduler = new CodexWsSnapshotScheduler({ isStillActive: () => true });
    assert.equal(scheduler.markLiveProjectionPending(ws, 'conv-a'), true);
    assert.equal(scheduler.canSendHistory(ws), false);
    assert.equal(scheduler.clearLiveProjectionPending(ws, 'conv-a'), true);
    assert.equal(scheduler.canSendHistory(ws), true);
});

test('history ACK EWMA reduces future lower-priority fragment credit to a 100ms safe window', () => {
    let now = 1_000;
    const ws = new FakeWs();
    const scheduler = new CodexWsSnapshotScheduler({
        now: () => now,
        historyMaxBlockingMs: 100,
        historyBurstMaxBytes: 16 * 1024,
        historyMinBurstBytes: 1024,
        historyEwmaAlpha: 0.25
    });
    // 4 KiB in 100ms = 40 bytes/ms; 70% of the following 100ms budget is 2.8 KiB.
    scheduler.recordHistoryAck(ws, { bytes: 4_000, elapsedMs: 100 });
    assert.equal(scheduler.getHistoryByteCredit(ws, 16 * 1024), 2_800);
    now += 1;
    scheduler.recordHistoryAck(ws, { bytes: 8_000, elapsedMs: 100 });
    // EWMA=(40*0.75)+(80*0.25)=50; safe budget=3.5 KiB.
    assert.equal(scheduler.getHistoryByteCredit(ws, 16 * 1024), 3_500);
});

test('scheduler never sends an oversized snapshot and reports it through the bounded channel', () => {
    const ws = new FakeWs();
    const oversized = { type: 'conversation_surface_snapshot', data: 'x'.repeat(MAX_WS_ENVELOPE_BYTES) };
    const rejected = [];
    const scheduler = new CodexWsSnapshotScheduler({
        isStillActive: () => true,
        onOversize: (_ws, envelope) => rejected.push(envelope.type)
    });
    scheduler.offer(ws, 'conv-a', oversized, { priority: 'terminal' });
    assert.deepEqual(ws.sent, []);
    assert.deepEqual(rejected, ['conversation_surface_snapshot']);
    assert.equal(scheduler.getStats().oversizedDropped, 1);
});

test('action projection omits raw protocol payload and preserves numeric raw request id', () => {
    const payload = projectConversationActionPayload('approval', {
        requestId: '42', rawRequestId: 42, method: 'item/commandExecution/requestApproval',
        params: { secret: 'must not leak' }, command: 'echo ok', availableDecisions: ['accept'] // sensitive-scan:allow intentional redaction fixture
    });
    assert.equal(payload.rawRequestId, 42);
    assert.equal(payload.params, undefined);
    assert.equal(payload.command, 'echo ok');
});
