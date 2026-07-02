'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CodexOwnerSurfaceTracker } = require('../src/services/codexOwnerSurfaceTracker');

test('owner tracker keeps seeded external surface and appends owner turn surface', () => {
    const tracker = new CodexOwnerSurfaceTracker();
    tracker.registerExternalSurface('thread-1', {
        conversationId: 'thread-1',
        status: 'completed',
        title: 'External title',
        cwd: 'E:\\coding\\TermLink',
        latestDefaultCollaborationMode: {
            mode: 'default',
            settings: { model: 'gpt-5.5', reasoning_effort: 'medium', developer_instructions: null }
        },
        items: [
            { key: 'external:assistant', kind: 'message', role: 'assistant', phase: 'final_answer', text: 'existing answer' }
        ]
    });

    const event = tracker.adoptTurnStartResult('thread-1', {
        turn: {
            id: 'turn-2',
            status: 'inProgress',
            params: {
                cwd: 'E:\\coding\\TermLink',
                input: [{ type: 'text', text: 'new owner input' }]
            },
            items: [
                { type: 'userMessage', id: 'user-2', text: 'new owner input' }
            ]
        }
    }, 'client-msg-2');

    assert.equal(event.surface.ownerKind, 'termlink');
    assert.equal(event.surface.conversationId, 'thread-1');
    assert.equal(event.surface.cwd, 'E:\\coding\\TermLink');
    assert.equal(event.surface.latestDefaultCollaborationMode.mode, 'default');
    assert.ok(event.surface.items.some((item) => item.key === 'external:assistant' && item.text === 'existing answer'));
    assert.ok(event.surface.items.some((item) => item.role === 'user' && item.text === 'new owner input'));
});

test('owner tracker projects pending approval request and resolves it', () => {
    const tracker = new CodexOwnerSurfaceTracker();
    tracker.registerExternalSurface('thread-approval', {
        conversationId: 'thread-approval',
        status: 'completed',
        items: []
    });

    const pending = tracker.handleRequest('approval-1', 'item/commandExecution/requestApproval', {
        threadId: 'thread-approval',
        reason: 'Need permission',
        command: 'echo hello',
        availableDecisions: ['accept', 'reject']
    });

    assert.equal(pending.surface.status, 'waiting_for_approval');
    assert.equal(pending.surface.pendingApproval.requestId, 'approval-1');
    assert.equal(pending.surface.pendingApproval.command, 'echo hello');
    assert.ok(pending.surface.items.some((item) => item.kind === 'approval_request' && item.requestId === 'approval-1'));

    const resolved = tracker.resolveRequest('approval-1', 'thread-approval');
    assert.equal(resolved.surface.pendingApproval, undefined);
    assert.equal(resolved.surface.items.some((item) => item.requestId === 'approval-1'), false);
});

test('owner tracker consumes app-server turn notifications and message deltas', () => {
    const tracker = new CodexOwnerSurfaceTracker();
    tracker.registerExternalSurface('thread-delta', {
        conversationId: 'thread-delta',
        status: 'completed',
        items: []
    });

    tracker.handleNotification('turn/started', {
        threadId: 'thread-delta',
        turn: { id: 'turn-delta', status: 'inProgress', items: [] }
    });
    const event = tracker.handleNotification('item/agentMessage/delta', {
        threadId: 'thread-delta',
        turnId: 'turn-delta',
        itemId: 'assistant-1',
        delta: 'hello from owner'
    });

    assert.equal(event.surface.status, 'running');
    assert.ok(event.surface.items.some((item) => item.role === 'assistant' && item.text === 'hello from owner'));
});
