const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestI18n } = require('./_i18n_helper');
setupTestI18n();

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
        settings: false,
        runtime: true,
        notices: true,
        tools: false
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
        notices: false,
        tools: false
    });
});

test('getSecondaryEntryAvailability keeps threads visible without settings capability', () => {
    assert.deepEqual(getSecondaryEntryAvailability({
        sessionMode: 'codex',
        capabilities: {
            historyList: true,
            modelConfig: false,
            rateLimitsRead: false,
            diffPlanReasoning: false
        },
        hasNonBlockingNotice: false
    }), {
        threads: true,
        settings: false,
        runtime: false,
        notices: false,
        tools: false
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
        titleText: 'Current thread not ready',
        metaText: 'Will auto-create new thread · Status: Idle',
        empty: true
    });

    assert.deepEqual(buildThreadSummary({
        threadId: 'thread-1234567890',
        threadTitle: 'Android 调试线程',
        cwd: 'E:\\coding\\TermLink',
        status: 'running'
    }), {
        titleText: 'Android 调试线程',
        metaText: 'Workspace: E:\\coding\\TermLink · Status: Running',
        empty: false
    });

    assert.deepEqual(buildThreadSummary({
        threadId: 'thread-abcdefghijklmnopqrstuvwxyz123456',
        cwd: '',
        status: 'waiting_approval'
    }), {
        titleText: 'Current thread thread-a...123456',
        metaText: 'Workspace: default directory · Status: Waiting Approval',
        empty: false
    });

    assert.deepEqual(buildThreadSummary({
        threadId: 'thread-bad-title',
        threadTitle: '恢复顶部状态栏额度显示吗? ไม่มี',
        cwd: 'E:\\coding\\TermLink',
        status: 'idle'
    }), {
        titleText: 'Current thread thread-bad-title',
        metaText: 'Workspace: E:\\coding\\TermLink · Status: Idle',
        empty: false
    });
});
