const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildThreadSummary,
    getSecondaryEntryAvailability,
    shouldShowInterrupt
} = require('../public/lib/codex_shell_view');

test('getSecondaryEntryAvailability derives secondary entries from codex capabilities and notices', () => {
    assert.deepEqual(getSecondaryEntryAvailability({
        sessionMode: 'codex',
        capabilities: {
            historyList: true,
            modelConfig: false,
            rateLimitsRead: true,
            diffPlanReasoning: true
        },
        hasNonBlockingNotice: true
    }), {
        threads: true,
        settings: true,
        runtime: true,
        notices: true
    });

    assert.deepEqual(getSecondaryEntryAvailability({
        sessionMode: 'terminal',
        capabilities: {
            historyList: true,
            modelConfig: true,
            rateLimitsRead: true,
            diffPlanReasoning: true
        },
        hasNonBlockingNotice: true
    }), {
        threads: false,
        settings: false,
        runtime: false,
        notices: false
    });
});

test('shouldShowInterrupt respects running states and current backend compatibility fields', () => {
    assert.equal(shouldShowInterrupt({
        status: 'running',
        currentTurnId: '',
        approvalPending: false
    }), true);

    assert.equal(shouldShowInterrupt({
        status: 'idle',
        currentTurnId: 'turn-1',
        approvalPending: false
    }), true);

    assert.equal(shouldShowInterrupt({
        status: 'idle',
        currentTurnId: '',
        approvalPending: true
    }), true);

    assert.equal(shouldShowInterrupt({
        status: 'idle',
        currentTurnId: '',
        approvalPending: false
    }), false);
});

test('buildThreadSummary returns localized empty and active thread summaries', () => {
    assert.deepEqual(buildThreadSummary({
        threadId: '',
        cwd: '',
        status: 'idle'
    }), {
        titleText: '当前线程未就绪',
        metaText: '即将自动创建新线程 · 状态：空闲',
        empty: true
    });

    assert.deepEqual(buildThreadSummary({
        threadId: 'thread-1234567890',
        cwd: 'E:\\coding\\TermLink',
        status: 'running'
    }), {
        titleText: '当前线程 thread-1234567890',
        metaText: '工作区：E:\\coding\\TermLink · 状态：执行中',
        empty: false
    });

    assert.deepEqual(buildThreadSummary({
        threadId: 'thread-abcdefghijklmnopqrstuvwxyz123456',
        cwd: '',
        status: 'waiting_approval'
    }), {
        titleText: '当前线程 thread-a...123456',
        metaText: '工作区：默认目录 · 状态：等待审批',
        empty: false
    });
});
