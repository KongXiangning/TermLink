'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ThreadStreamTracker, buildDesktopSurfaceSnapshot } = require('../src/services/codexIpcThreadStream');

// ── ThreadStreamTracker — snapshot ───────────────────────────────────────────

test('snapshot change replaces full conversation state', () => {
    const tracker = new ThreadStreamTracker();
    const msg = makeBroadcast('snapshot', {
        conversationId: 'conv-1',
        change: {
            type: 'snapshot',
            revision: 5,
            conversationState: { turns: [{ turnId: 't1', status: 'completed', items: [] }] }
        }
    });
    const proj = tracker.applyBroadcast(msg);
    assert.equal(proj.changeType, 'snapshot');
    assert.equal(proj.revision, 5);
    assert.equal(proj.turnCount, 1);
    assert.equal(proj.desynced, false);
    assert.deepEqual(tracker.getConversationState('conv-1'), { turns: [{ turnId: 't1', status: 'completed', items: [] }] });
});

test('snapshot keeps conversations isolated', () => {
    const tracker = new ThreadStreamTracker();
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-a', change: { type: 'snapshot', revision: 1, conversationState: { turns: [{ turnId: 'ta' }] } } }));
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-b', change: { type: 'snapshot', revision: 2, conversationState: { turns: [{ turnId: 'tb' }] } } }));
    const a = tracker.getConversationState('conv-a');
    const b = tracker.getConversationState('conv-b');
    assert.deepEqual(a?.turns?.[0]?.turnId, 'ta');
    assert.deepEqual(b?.turns?.[0]?.turnId, 'tb');
});

// ── ThreadStreamTracker — patches ────────────────────────────────────────────

test('patches incrementally update conversation state', () => {
    const tracker = new ThreadStreamTracker();
    // First deliver a snapshot to establish base state.
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-1', change: { type: 'snapshot', revision: 1, conversationState: { turns: [] } } }));
    // Now apply a patch that adds a turn.
    tracker.applyBroadcast(makeBroadcast('patches', {
        conversationId: 'conv-1',
        change: {
            type: 'patches',
            revision: 2,
            baseRevision: 1,
            patches: [{ op: 'add', path: ['turns', 0], value: { turnId: 't-new', status: 'inProgress', items: [] } }]
        }
    }));
    const state = tracker.getConversationState('conv-1');
    assert.equal(state?.turns?.length, 1);
    assert.equal(state?.turns?.[0]?.turnId, 't-new');
});

test('patches revision mismatch marks desynced', () => {
    const tracker = new ThreadStreamTracker();
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-1', change: { type: 'snapshot', revision: 5, conversationState: { turns: [] } } }));
    const proj = tracker.applyBroadcast(makeBroadcast('patches', {
        conversationId: 'conv-1',
        change: { type: 'patches', revision: 7, baseRevision: 6, patches: [{ op: 'add', path: ['turns', 0], value: { turnId: 'orphan' } }] }
    }));
    assert.equal(proj.desynced, true);
});

test('patches with no prior state marks desynced', () => {
    const tracker = new ThreadStreamTracker();
    const proj = tracker.applyBroadcast(makeBroadcast('patches', {
        conversationId: 'conv-new',
        change: { type: 'patches', revision: 1, baseRevision: 0, patches: [{ op: 'add', path: ['turns', 0], value: { turnId: 't1' } }] }
    }));
    assert.equal(proj.desynced, true);
});

test('invalid patch path does not crash', () => {
    const tracker = new ThreadStreamTracker();
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-1', change: { type: 'snapshot', revision: 1, conversationState: { turns: [] } } }));
    const proj = tracker.applyBroadcast(makeBroadcast('patches', {
        conversationId: 'conv-1',
        change: { type: 'patches', revision: 2, baseRevision: 1, patches: [{ op: 'replace', path: ['nonexistent', 'deep', 'path'], value: 'x' }] }
    }));
    assert.equal(proj.desynced, true);
});

test('after desync, next snapshot recovers', () => {
    const tracker = new ThreadStreamTracker();
    tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-1', change: { type: 'snapshot', revision: 1, conversationState: { turns: [] } } }));
    // Cause desync.
    tracker.applyBroadcast(makeBroadcast('patches', { conversationId: 'conv-1', change: { type: 'patches', revision: 3, baseRevision: 2, patches: [] } }));
    // Next snapshot recovers.
    const proj = tracker.applyBroadcast(makeBroadcast('snapshot', { conversationId: 'conv-1', change: { type: 'snapshot', revision: 4, conversationState: { turns: [{ turnId: 'recovered' }] } } }));
    assert.equal(proj.desynced, false);
    assert.equal(tracker.getConversationState('conv-1')?.turns?.[0]?.turnId, 'recovered');
});

// ── ThreadStreamTracker — non-applicable messages ────────────────────────────

test('non thread-stream-state-changed broadcast returns undefined', () => {
    const tracker = new ThreadStreamTracker();
    assert.equal(tracker.applyBroadcast({ method: 'other', params: {} }), undefined);
});

// ── buildDesktopSurfaceSnapshot — messages ───────────────────────────────────

test('snapshot renders user and assistant messages', () => {
    const state = {
        turns: [{
            turnId: 't1', status: 'completed',
            items: [
                { type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'hello' }] },
                { type: 'agentMessage', id: 'a1', phase: 'final_answer', text: 'world' }
            ]
        }]
    };
    const snap = buildDesktopSurfaceSnapshot(state, { conversationId: 'c1' });
    assert.equal(snap.conversationId, 'c1');
    assert.equal(snap.status, 'completed');
    const messages = snap.items.filter(i => i.kind === 'message');
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].text, 'hello');
    assert.equal(messages[1].role, 'assistant');
    assert.equal(messages[1].text, 'world');
});

test('commentary phase is included as assistant message', () => {
    const state = { turns: [{ turnId: 't1', items: [{ type: 'agentMessage', phase: 'commentary', text: 'thinking...' }] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const msgs = snap.items.filter(i => i.kind === 'message');
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].phase, 'commentary');
});

// ── buildDesktopSurfaceSnapshot — status ─────────────────────────────────────

test('commandExecution items are collapsed into status', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'commandExecution', command: 'ls', status: 'completed' },
        { type: 'commandExecution', command: 'pwd', status: 'completed' }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const st = snap.items.filter(i => i.kind === 'status');
    assert.ok(st.some(s => s.text.includes('已运行 2 条命令')));
});

test('fileChange items are collapsed into file status', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'fileChange', changes: [{ path: 'a.js' }, { path: 'b.js' }] }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const st = snap.items.filter(i => i.kind === 'status');
    assert.ok(st.some(s => s.text.includes('已编辑 2 个文件')));
});

// ── buildDesktopSurfaceSnapshot — approval ───────────────────────────────────

test('pending command approval appears as approval_request', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'commandExecution', id: 'ce1', command: 'rm -rf', status: 'pending_approval', reason: 'dangerous' }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state, { conversationId: 'c1' });
    assert.equal(snap.status, 'waiting_for_approval');
    assert.ok(snap.pendingApproval);
    assert.equal(snap.pendingApproval.kind, 'command');
    const ar = snap.items.filter(i => i.kind === 'approval_request');
    assert.ok(ar.length >= 1);
});

test('request-based approval is detected from state.requests', () => {
    const state = {
        turns: [],
        requests: [{ id: 1, method: 'item/commandExecution/requestApproval', params: { command: 'rm', reason: 'remove file' } }]
    };
    const snap = buildDesktopSurfaceSnapshot(state);
    assert.ok(snap.pendingApproval);
    assert.equal(snap.pendingApproval.kind, 'command');
    assert.equal(snap.pendingApproval.rawRequestId, '1');
    assert.equal(snap.status, 'waiting_for_approval');
});

test('request-based user input is projected as an interactive approval request', () => {
    const state = {
        turns: [],
        requests: [{
            id: 'req-key',
            method: 'item/tool/requestUserInput',
            params: {
                questions: [{
                    id: 'confirm',
                    question: 'Press key?',
                    options: [{ label: 'Approve' }, { label: 'Reject' }]
                }]
            }
        }]
    };
    const snap = buildDesktopSurfaceSnapshot(state);
    const request = snap.items.find(i => i.kind === 'approval_request' && i.requestId === 'req-key');

    assert.ok(request);
    assert.equal(request.requestKind, 'userInput');
    assert.equal(request.responseMode, 'answers');
    assert.equal(request.method, 'item/tool/requestUserInput');
    assert.equal(request.params.questions[0].question, 'Press key?');
    assert.ok(snap.pendingUserInputAction);
    assert.equal(snap.pendingUserInputAction.requestId, 'req-key');
    assert.equal(snap.pendingUserInputAction.method, 'item/tool/requestUserInput');
    assert.equal(snap.pendingUserInputAction.handledBy, 'ipc_follower');
    assert.equal(snap.pendingUserInputAction.params.questions[0].id, 'confirm');
    assert.equal(snap.status, 'waiting_for_input');
});

test('request-based item/tool/call MCP approval is projected as an interactive approval request', () => {
    const state = {
        turns: [{ turnId: 't1', items: [
            { type: 'mcpToolCall', server: 'chrome-devtools', name: 'press_key', status: 'in_progress' }
        ] }],
        requests: [{
            id: 'req-perm',
            method: 'item/tool/call',
            params: {
                meta: {
                    codex_approval_kind: 'mcp_tool_call',
                    codex_request_type: 'approval_request',
                    connector_name: 'chrome-devtools',
                    tool_name: 'press_key'
                },
                tool_params: { key: 'Control+R' }
            }
        }]
    };
    const snap = buildDesktopSurfaceSnapshot(state);
    const request = snap.items.find(i => i.kind === 'approval_request' && i.requestId === 'req-perm');

    assert.ok(request);
    assert.equal(request.requestKind, 'permissions');
    assert.equal(request.responseMode, 'decision');
    assert.equal(request.method, 'item/tool/call');
    assert.equal(request.rawRequestId, 'req-perm');
    assert.equal(request.toolName, 'press_key');
    assert.match(request.summary, /Control\+R/);
    assert.equal(snap.pendingApproval.kind, 'permissions');
    assert.equal(snap.pendingApproval.rawRequestId, 'req-perm');
    assert.equal(snap.status, 'waiting_for_approval');
});

// ── buildDesktopSurfaceSnapshot — plan ───────────────────────────────────────

test('plan item is rendered as plan_prompt', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'Plan', id: 'p1', text: '## Plan\n\n1. Do X\n2. Do Y' }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const plans = snap.items.filter(i => i.kind === 'plan_prompt');
    assert.ok(plans.length >= 1);
    assert.ok(plans[0].text.includes('Do X'));
});

test('plan text wrapped in proposed_plan tags is stripped', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'Plan', text: '<proposed_plan>\nMy Plan\n</proposed_plan>' }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const plan = snap.items.find(i => i.kind === 'plan_prompt');
    assert.equal(plan.text, 'My Plan');
});

test('item/plan/requestImplementation creates pendingPlanAction', () => {
    const state = {
        turns: [{ turnId: 't99', status: 'completed', items: [] }],
        requests: [{ id: 'req-1', method: 'item/plan/requestImplementation', params: { turnId: 't99', planContent: 'BUILD IT' } }]
    };
    const snap = buildDesktopSurfaceSnapshot(state);
    assert.ok(snap.pendingPlanAction);
    assert.equal(snap.pendingPlanAction.kind, 'plan_implementation');
    assert.equal(snap.pendingPlanAction.planContent, 'BUILD IT');
    assert.equal(snap.pendingPlanAction.canSubmit, true);
});

// ── buildDesktopSurfaceSnapshot — goal ───────────────────────────────────────

test('todo-list without planned items is rendered as goal_prompt', () => {
    const state = { turns: [{ turnId: 't1', items: [
        { type: 'todo-list', title: 'Goals', items: [{ label: 'Learn X', status: 'pending' }] }
    ] }] };
    const snap = buildDesktopSurfaceSnapshot(state);
    const goals = snap.items.filter(i => i.kind === 'goal_prompt');
    assert.ok(goals.length >= 1);
});

test('goal input turn is rendered and exposes pendingGoalAction while running', () => {
    const state = {
        turns: [{
            turnId: 'goal-turn',
            status: 'inProgress',
            params: { input: '/goal Build server Android sync' },
            items: []
        }]
    };
    const snap = buildDesktopSurfaceSnapshot(state);
    const goal = snap.items.find(i => i.kind === 'goal_prompt' && i.turnId === 'goal-turn');
    assert.ok(goal);
    assert.equal(goal.text, 'Build server Android sync');
    assert.ok(snap.pendingGoalAction);
    assert.equal(snap.pendingGoalAction.kind, 'text_input');
    assert.equal(snap.status, 'running');
});

test('snapshot includes active goal and collaboration metadata without leaking raw turns', () => {
    const state = {
        title: 'Desktop conversation',
        cwd: 'E:\\coding\\TermLink',
        latestThreadSettings: { collaborationMode: { mode: 'default', effort: 'medium' } },
        currentGoal: {
            threadId: 'thread-1',
            objective: 'Synchronize Codex surfaces',
            status: 'active',
            tokenBudget: 1000,
            tokensUsed: 250
        },
        turns: [{ turnId: 't1', status: 'completed', items: [] }]
    };
    const snap = buildDesktopSurfaceSnapshot(state, { ownerKind: 'ipc' });
    assert.equal(snap.ownerKind, 'ipc');
    assert.equal(snap.title, 'Desktop conversation');
    assert.equal(snap.cwd, 'E:\\coding\\TermLink');
    assert.equal(snap.activeGoal.objective, 'Synchronize Codex surfaces');
    assert.deepEqual(snap.latestCollaborationMode, { mode: 'default', effort: 'medium' });
    assert.deepEqual(snap.latestDefaultCollaborationMode, { mode: 'default', effort: 'medium' });
    assert.equal(snap.turns, undefined);
});

// ── buildDesktopSurfaceSnapshot — status inference ───────────────────────────

test('inProgress turn status maps to running', () => {
    const state = { turns: [{ turnId: 't1', status: 'inProgress', items: [] }] };
    assert.equal(buildDesktopSurfaceSnapshot(state).status, 'running');
});

test('completed turn status maps to completed', () => {
    const state = { turns: [{ turnId: 't1', status: 'completed', items: [] }] };
    assert.equal(buildDesktopSurfaceSnapshot(state).status, 'completed');
});

test('failed turn status maps to failed', () => {
    const state = { turns: [{ turnId: 't1', status: 'failed', items: [] }] };
    assert.equal(buildDesktopSurfaceSnapshot(state).status, 'failed');
});

test('empty turns is unknown', () => {
    assert.equal(buildDesktopSurfaceSnapshot({}).status, 'unknown');
});

test('explicit status option overrides inferred status', () => {
    const state = { turns: [{ turnId: 't1', status: 'inProgress', items: [] }] };
    assert.equal(buildDesktopSurfaceSnapshot(state, { status: 'waiting_for_input' }).status, 'waiting_for_input');
});

// ── buildDesktopSurfaceSnapshot — raw state not leaked ───────────────────────

test('surface snapshot does not include raw conversation state', () => {
    const state = { turns: [{ turnId: 't1', items: [{ type: 'userMessage', content: 'hi' }] }], _internal: 'secret' };
    const snap = buildDesktopSurfaceSnapshot(state);
    assert.equal(snap._internal, undefined);
    assert.ok(!snap.turns); // snapshot does not expose raw turns
});

// ── helpers ──────────────────────────────────────────────────────────────────

function makeBroadcast(changeType, params) {
    return {
        method: 'thread-stream-state-changed',
        params: { hostId: 'host-1', ...params }
    };
}
