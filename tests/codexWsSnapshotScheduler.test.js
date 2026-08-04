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
