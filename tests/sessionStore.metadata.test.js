const test = require('node:test');
const assert = require('node:assert/strict');
const SessionStore = require('../src/repositories/sessionStore');

test('SessionStore normalizes legacy records to terminal mode with null cwd', () => {
    const store = new SessionStore({ enabled: false });
    const [record] = store._normalizeRecords([{
        id: 'legacy-1',
        name: 'Legacy Session',
        createdAt: 1,
        lastActiveAt: 2,
        status: 'IDLE'
    }]);

    assert.deepEqual(record, {
        id: 'legacy-1',
        name: 'Legacy Session',
        createdAt: 1,
        lastActiveAt: 2,
        status: 'IDLE',
        sessionMode: 'terminal',
        cwd: null,
        lastCodexThreadId: null
    });
});

test('SessionStore preserves codex mode, trimmed cwd, and last codex thread id', () => {
    const store = new SessionStore({ enabled: false });
    const [record] = store._normalizeRecords([{
        id: 'codex-1',
        name: ' Codex Session ',
        createdAt: 10,
        lastActiveAt: 20,
        status: 'ACTIVE',
        sessionMode: 'codex',
        cwd: ' D:\\workspace\\demo ',
        lastCodexThreadId: ' thread-42 '
    }]);

    assert.deepEqual(record, {
        id: 'codex-1',
        name: 'Codex Session',
        createdAt: 10,
        lastActiveAt: 20,
        status: 'ACTIVE',
        sessionMode: 'codex',
        cwd: 'D:\\workspace\\demo',
        lastCodexThreadId: 'thread-42'
    });
});
