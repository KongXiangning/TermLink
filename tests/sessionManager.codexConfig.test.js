const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager } = require('../src/services/sessionManager');

test('SessionManager updateSession marks existing codex thread execution context as stale after codexConfig change', () => {
    const manager = Object.create(SessionManager.prototype);
    let persistCount = 0;
    manager.sessions = new Map();
    manager.schedulePersist = () => {
        persistCount += 1;
    };

    const session = {
        id: 'codex-session',
        name: 'Codex Session',
        sessionMode: 'codex',
        lastActiveAt: 1,
        codexConfig: {
            defaultModel: null,
            defaultReasoningEffort: null,
            defaultPersonality: null,
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        },
        codexState: {
            threadId: 'thread-old',
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            threadExecutionContextSignature: '{"cwd":"E:\\\\coding\\\\TermLink","approvalPolicy":"on-request","sandboxMode":"workspace-write"}'
        }
    };
    manager.sessions.set(session.id, session);

    const result = manager.updateSession(session.id, {
        codexConfig: {
            defaultModel: null,
            defaultReasoningEffort: null,
            defaultPersonality: null,
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        }
    });

    assert.equal(result, session);
    assert.deepEqual(session.codexConfig, {
        defaultModel: null,
        defaultReasoningEffort: null,
        defaultPersonality: null,
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    });
    assert.equal(session.codexState.threadId, 'thread-old');
    assert.equal(session.codexState.threadExecutionContextSignature, '__stale__');
    assert.equal(persistCount, 1);
});
