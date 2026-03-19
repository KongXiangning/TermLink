const test = require('node:test');
const assert = require('node:assert/strict');
const createSessionsRouter = require('../src/routes/sessions');

function getRouteHandler(router, path, method) {
    const layer = router.stack.find((entry) => (
        entry.route &&
        entry.route.path === path &&
        entry.route.methods &&
        entry.route.methods[method]
    ));
    return layer && layer.route && layer.route.stack[0] && layer.route.stack[0].handle;
}

function createMockRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

test('POST /sessions returns 409 with explicit capacity error code', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            const error = new Error('Session capacity exceeded');
            error.code = 'SESSION_CAPACITY_EXCEEDED';
            error.maxSessionCount = 50;
            throw error;
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    assert.ok(handler, 'POST /sessions handler should exist');

    const req = { body: { name: 'A' } };
    const res = createMockRes();
    await handler(req, res);

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
        error: 'Session capacity exceeded',
        code: 'SESSION_CAPACITY_EXCEEDED',
        maxSessionCount: 50
    });
});

test('POST /sessions returns 500 for unexpected errors', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            throw new Error('unexpected');
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    assert.ok(handler, 'POST /sessions handler should exist');

    const req = { body: { name: 'A' } };
    const res = createMockRes();
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
        await handler(req, res);
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'Failed to create session' });
});
