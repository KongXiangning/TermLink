const test = require('node:test');
const assert = require('node:assert/strict');

const { buildHistoryEntries, shouldShowHistoryPanel } = require('../public/lib/codex_history_view');

test('buildHistoryEntries marks current thread as active', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-a', title: 'Alpha' },
            { id: 'thread-b', title: 'Beta' }
        ],
        currentThreadId: 'thread-b',
        lastCodexThreadId: 'thread-b',
        status: 'idle'
    });

    assert.equal(entries.length, 2);
    assert.deepEqual(entries[1], {
        id: 'thread-b',
        title: 'Beta',
        badges: ['Current'],
        active: true,
        saved: true,
        pending: false,
        disabled: false
    });
});

test('buildHistoryEntries marks saved thread when it is not current', () => {
    const entries = buildHistoryEntries({
        threads: [{ id: 'thread-a', title: '' }],
        currentThreadId: '',
        lastCodexThreadId: 'thread-a',
        status: 'idle'
    });

    assert.deepEqual(entries[0], {
        id: 'thread-a',
        title: 'Thread thread-a',
        badges: ['Saved'],
        active: false,
        saved: true,
        pending: false,
        disabled: false
    });
});

test('buildHistoryEntries disables non-current threads while a turn is running', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-a', title: 'Alpha' },
            { id: 'thread-b', title: 'Beta' }
        ],
        currentThreadId: 'thread-a',
        lastCodexThreadId: 'thread-b',
        status: 'running'
    });

    assert.equal(entries[0].disabled, false);
    assert.equal(entries[1].disabled, true);
});

test('buildHistoryEntries marks a pending history action', () => {
    const entries = buildHistoryEntries({
        threads: [{ id: 'thread-a', title: 'Alpha' }],
        currentThreadId: '',
        lastCodexThreadId: '',
        actionThreadId: 'thread-a',
        status: 'idle'
    });

    assert.deepEqual(entries[0], {
        id: 'thread-a',
        title: 'Alpha',
        badges: ['Opening'],
        active: false,
        saved: false,
        pending: true,
        disabled: true
    });
});

test('shouldShowHistoryPanel requires codex mode and historyList capability', () => {
    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'codex',
        capabilities: { historyList: true }
    }), true);

    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'codex',
        capabilities: { historyList: false }
    }), false);

    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'terminal',
        capabilities: { historyList: true }
    }), false);
});
