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

test('POST /sessions passes sessionMode and cwd through to sessionManager', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession(options) {
            assert.deepEqual(options, {
                name: 'Codex Task',
                sessionMode: 'codex',
                cwd: 'E:\\coding\\TermLink'
            });
            return {
                id: 'session-1',
                name: options.name,
                sessionMode: options.sessionMode,
                cwd: options.cwd
            };
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    const req = {
        body: {
            name: ' Codex Task ',
            sessionMode: 'codex',
            cwd: ' E:\\coding\\TermLink '
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        id: 'session-1',
        name: 'Codex Task',
        sessionMode: 'codex',
        cwd: 'E:\\coding\\TermLink'
    });
});

test('POST /sessions rejects invalid sessionMode', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            throw new Error('should not be called');
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    const req = { body: { name: 'A', sessionMode: 'other' } };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'sessionMode must be terminal or codex' });
});

test('POST /sessions requires cwd for codex mode', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            throw new Error('should not be called');
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    const req = { body: { name: 'A', sessionMode: 'codex' } };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'cwd is required when sessionMode is codex' });
});
