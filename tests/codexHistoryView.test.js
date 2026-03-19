const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildHistoryEntries,
    shouldShowHistoryPanel
} = require('../public/lib/codex_history_view');

test('shouldShowHistoryPanel only enables history in codex mode with capability', () => {
    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'codex',
        capabilities: { historyList: true }
    }), true);
    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'terminal',
        capabilities: { historyList: true }
    }), false);
    assert.equal(shouldShowHistoryPanel({
        sessionMode: 'codex',
        capabilities: { historyList: false }
    }), false);
});

test('buildHistoryEntries adds badges and thread actions for active, archived, and pending rows', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-a', title: 'Thread A' },
            { id: 'thread-b', title: 'Thread B', archived: true }
        ],
        currentThreadId: 'thread-a',
        lastCodexThreadId: 'thread-b',
        actionThreadId: 'thread-b',
        actionKind: 'rename',
        status: 'idle'
    });

    assert.equal(entries.length, 2);
    assert.deepEqual(entries[0].badges, ['Current']);
    assert.equal(entries[0].actions[0].kind, 'open');
    assert.equal(entries[0].actions[0].disabled, false);
    assert.equal(entries[0].actions[1].kind, 'fork');
    assert.equal(entries[0].actions[1].disabled, true, 'active thread should not allow fork from the list');
    assert.equal(entries[0].actions[2].kind, 'rename');
    assert.equal(entries[0].actions[2].disabled, false, 'active thread rename should stay available while idle');
    assert.equal(entries[0].actions[3].kind, 'archive');

    assert.deepEqual(entries[1].badges, ['Saved', 'Archived', 'Renaming']);
    assert.equal(entries[1].actions[1].kind, 'fork');
    assert.equal(entries[1].actions[1].disabled, true, 'pending archived thread should disable mutation buttons');
    assert.equal(entries[1].actions[2].kind, 'rename');
    assert.equal(entries[1].actions[2].disabled, true, 'pending thread should disable rename');
    assert.equal(entries[1].actions[3].kind, 'unarchive');
});

test('buildHistoryEntries disables non-active open actions while running', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-a', title: 'Thread A' },
            { id: 'thread-b', title: 'Thread B' }
        ],
        currentThreadId: 'thread-a',
        status: 'running'
    });

    assert.equal(entries[0].actions[0].disabled, false);
    assert.equal(entries[1].actions[0].disabled, true);
    assert.equal(entries[1].actions[1].disabled, true);
    assert.equal(entries[1].actions[2].disabled, true);
    assert.equal(entries[1].actions[3].disabled, true);
});

test('buildHistoryEntries exposes timestamp metadata for recent activity and creation fallback', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-a', title: 'Thread A', lastActiveAt: '2026-03-17T10:20:00.000Z' },
            { id: 'thread-b', title: 'Thread B', createdAt: '2026-03-16T08:00:00.000Z' }
        ],
        status: 'idle'
    });

    assert.equal(entries[0].metaText, '最近活跃：2026-03-17 10:20');
    assert.equal(entries[1].metaText, '创建时间：2026-03-16 08:00');
});

test('buildHistoryEntries falls back to thread id when title looks malformed', () => {
    const entries = buildHistoryEntries({
        threads: [
            { id: 'thread-bad', title: '恢复顶部状态栏额度显示吗? ไม่มี' }
        ],
        status: 'idle'
    });

    assert.equal(entries[0].title, 'Thread thread-bad');
});
