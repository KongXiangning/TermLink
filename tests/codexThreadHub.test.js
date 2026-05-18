const test = require('node:test');
const assert = require('node:assert/strict');

const { CodexThreadHub } = require('../src/services/codexThreadHub');

test('CodexThreadHub binds a thread to the current actor session', () => {
    const hub = new CodexThreadHub();

    hub.bindThreadToSession('thread-1', 'session-1');

    assert.equal(hub.getSessionIdForThread('thread-1'), 'session-1');
});

test('CodexThreadHub keeps one actor thread per session', () => {
    const hub = new CodexThreadHub();

    hub.bindThreadToSession('thread-old', 'session-1');
    hub.bindThreadToSession('thread-new', 'session-1');

    assert.equal(hub.getSessionIdForThread('thread-old'), null);
    assert.equal(hub.getSessionIdForThread('thread-new'), 'session-1');
});

test('CodexThreadHub unbindSessionThreads can preserve the requested thread', () => {
    const hub = new CodexThreadHub();

    hub.bindThreadToSession('thread-1', 'session-1');
    hub.unbindSessionThreads('session-1', { keepThreadId: 'thread-1' });

    assert.equal(hub.getSessionIdForThread('thread-1'), 'session-1');

    hub.unbindSessionThreads('session-1');

    assert.equal(hub.getSessionIdForThread('thread-1'), null);
});

test('CodexThreadHub unbindThread clears only the requested thread', () => {
    const hub = new CodexThreadHub();

    hub.bindThreadToSession('thread-1', 'session-1');
    hub.bindThreadToSession('thread-2', 'session-2');
    hub.unbindThread('thread-1');

    assert.equal(hub.getSessionIdForThread('thread-1'), null);
    assert.equal(hub.getSessionIdForThread('thread-2'), 'session-2');
});

test('CodexThreadHub ignores empty ids', () => {
    const hub = new CodexThreadHub();

    hub.bindThreadToSession('', 'session-1');
    hub.bindThreadToSession('thread-1', '   ');
    hub.unbindSessionThreads('');
    hub.unbindThread(' ');

    assert.equal(hub.getSessionIdForThread('thread-1'), null);
    assert.equal(hub.getSessionIdForThread(''), null);
});
