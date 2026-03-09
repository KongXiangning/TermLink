const test = require('node:test');
const assert = require('node:assert/strict');

const { planBootstrap, isTransientBridgeError, shouldReadThreadSnapshot } = require('../public/lib/codex_bootstrap');

test('planBootstrap keeps the current thread when session already has an active thread', () => {
    const plan = planBootstrap({
        sessionMode: 'codex',
        threadId: 'thread-live',
        lastCodexThreadId: 'thread-saved',
        capabilities: {
            historyList: true,
            historyResume: true
        }
    });

    assert.deepEqual(plan, {
        shouldFetchHistoryList: true,
        action: null
    });
});

test('planBootstrap restores the saved thread when resume capability is available', () => {
    const plan = planBootstrap({
        sessionMode: 'codex',
        threadId: '',
        lastCodexThreadId: 'thread-saved',
        capabilities: {
            historyList: true,
            historyResume: true
        }
    });

    assert.deepEqual(plan, {
        shouldFetchHistoryList: true,
        action: {
            type: 'resume',
            threadId: 'thread-saved'
        }
    });
});

test('planBootstrap falls back to a new thread when there is no saved thread', () => {
    const plan = planBootstrap({
        sessionMode: 'codex',
        threadId: '',
        lastCodexThreadId: '',
        capabilities: {
            historyList: false,
            historyResume: true
        }
    });

    assert.deepEqual(plan, {
        shouldFetchHistoryList: false,
        action: {
            type: 'new_thread'
        }
    });
});

test('planBootstrap stays idle for terminal sessions', () => {
    const plan = planBootstrap({
        sessionMode: 'terminal',
        threadId: '',
        lastCodexThreadId: 'thread-saved',
        capabilities: {
            historyList: true,
            historyResume: true
        }
    });

    assert.deepEqual(plan, {
        shouldFetchHistoryList: false,
        action: null
    });
});

test('isTransientBridgeError treats reconnect-related bridge errors as transient', () => {
    assert.equal(isTransientBridgeError({ code: 'CODEX_BRIDGE_RESTARTED' }), true);
    assert.equal(isTransientBridgeError({ code: 'CODEX_BRIDGE_CLOSED' }), true);
    assert.equal(isTransientBridgeError({ code: 'CODEX_BRIDGE_NOT_CONNECTED' }), true);
});

test('isTransientBridgeError does not hide real bridge or protocol failures', () => {
    assert.equal(isTransientBridgeError({ code: 'CODEX_METHOD_NOT_ALLOWED' }), false);
    assert.equal(isTransientBridgeError(new Error('plain failure')), false);
});

test('shouldReadThreadSnapshot skips unmaterialized threads', () => {
    assert.equal(shouldReadThreadSnapshot({
        threadId: 'thread-new',
        lastSnapshotThreadId: '',
        unmaterializedThreadId: 'thread-new',
        force: true
    }), false);
});

test('shouldReadThreadSnapshot skips freshly created threads before first materialization', () => {
    assert.equal(shouldReadThreadSnapshot({
        threadId: 'thread-new',
        lastSnapshotThreadId: '',
        unmaterializedThreadId: '',
        pendingFreshThread: true,
        force: true
    }), false);
});

test('shouldReadThreadSnapshot skips duplicate reads unless forced', () => {
    assert.equal(shouldReadThreadSnapshot({
        threadId: 'thread-live',
        lastSnapshotThreadId: 'thread-live',
        threadMaterialized: true,
        force: false
    }), false);
});

test('shouldReadThreadSnapshot allows materialized threads to be read', () => {
    assert.equal(shouldReadThreadSnapshot({
        threadId: 'thread-live',
        lastSnapshotThreadId: '',
        unmaterializedThreadId: '',
        force: true
    }), true);
});
