const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const createSessionsRouter = require('../src/routes/sessions');

const VALID_CWD = path.resolve(__dirname, '..');

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
                cwd: VALID_CWD,
                codexConfig: {
                    defaultModel: 'gpt-5-codex',
                    defaultReasoningEffort: 'medium',
                    defaultPersonality: 'pragmatic',
                    approvalPolicy: 'on-request',
                    sandboxMode: 'workspace-write'
                }
            });
            return {
                id: 'session-1',
                name: options.name,
                sessionMode: options.sessionMode,
                cwd: options.cwd,
                workspaceRoot: options.cwd,
                workspaceRootSource: 'session_cwd',
                lastCodexThreadId: 'thread-42',
                codexConfig: options.codexConfig
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
            cwd: ` ${VALID_CWD} `,
            codexConfig: {
                defaultModel: 'gpt-5-codex',
                defaultReasoningEffort: 'medium',
                defaultPersonality: 'pragmatic',
                approvalPolicy: 'on-request',
                sandboxMode: 'workspace-write'
            }
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        id: 'session-1',
        name: 'Codex Task',
        sessionMode: 'codex',
        cwd: VALID_CWD,
        workspaceRoot: VALID_CWD,
        workspaceRootSource: 'session_cwd',
        lastCodexThreadId: 'thread-42',
        codexConfig: {
            defaultModel: 'gpt-5-codex',
            defaultReasoningEffort: 'medium',
            defaultPersonality: 'pragmatic',
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        }
    });
});

test('POST /sessions defaults codexConfig when creating codex session', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession(options) {
            assert.equal(options.codexConfig, null);
            return {
                id: 'session-2',
                name: options.name,
                sessionMode: options.sessionMode,
                cwd: options.cwd,
                workspaceRoot: options.cwd,
                workspaceRootSource: 'session_cwd',
                lastCodexThreadId: null,
                codexConfig: options.codexConfig
            };
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    const req = {
        body: {
            name: 'Codex default config',
            sessionMode: 'codex',
            cwd: VALID_CWD
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.sessionMode, 'codex');
    assert.equal(res.body.codexConfig, null);
});

test('POST /sessions allows explicit null codexConfig for codex session', async () => {
    const sessionManager = {
        listSessions: () => [],
        async createSession(options) {
            assert.equal(options.codexConfig, null);
            return {
                id: 'session-null',
                name: options.name,
                sessionMode: options.sessionMode,
                cwd: options.cwd,
                workspaceRoot: options.cwd,
                workspaceRootSource: 'session_cwd',
                lastCodexThreadId: null,
                codexConfig: options.codexConfig
            };
        },
        getSession: () => null,
        updateSession: () => null,
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions', 'post');
    const req = {
        body: {
            name: 'Codex explicit null',
            sessionMode: 'codex',
            cwd: VALID_CWD,
            codexConfig: null
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.codexConfig, null);
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

test('POST /sessions rejects invalid codexConfig for codex mode', async () => {
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
    const req = {
        body: {
            name: 'Invalid config',
            sessionMode: 'codex',
            cwd: VALID_CWD,
            codexConfig: {
                approvalPolicy: 'invalid-policy',
                sandboxMode: 'workspace-write'
            }
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'codexConfig requires valid approvalPolicy and sandboxMode for codex sessions' });
});

test('PATCH /sessions/:id updates name and codexConfig', async () => {
    const existingSession = {
        id: 'session-1',
        name: 'Before',
        sessionMode: 'codex',
        cwd: VALID_CWD,
        workspaceRoot: VALID_CWD,
        workspaceRootSource: 'session_cwd',
        lastCodexThreadId: 'thread-1',
        codexConfig: null
    };
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            throw new Error('should not be called');
        },
        getSession(id) {
            return id === 'session-1' ? existingSession : null;
        },
        updateSession(id, updates) {
            assert.equal(id, 'session-1');
            assert.deepEqual(updates, {
                name: 'After',
                codexConfig: {
                    defaultModel: 'gpt-5-codex',
                    defaultReasoningEffort: null,
                    defaultPersonality: null,
                    approvalPolicy: 'on-request',
                    sandboxMode: 'workspace-write'
                }
            });
            return {
                ...existingSession,
                ...updates
            };
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id', 'patch');
    const req = {
        params: { id: 'session-1' },
        body: {
            name: ' After ',
            codexConfig: {
                defaultModel: ' gpt-5-codex ',
                approvalPolicy: 'on-request',
                sandboxMode: 'workspace-write'
            }
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
        id: 'session-1',
        name: 'After',
        sessionMode: 'codex',
        cwd: VALID_CWD,
        workspaceRoot: VALID_CWD,
        workspaceRootSource: 'session_cwd',
        lastCodexThreadId: 'thread-1',
        codexConfig: {
            defaultModel: 'gpt-5-codex',
            defaultReasoningEffort: null,
            defaultPersonality: null,
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        }
    });
});

test('PATCH /sessions/:id allows clearing codexConfig with null', async () => {
    const existingSession = {
        id: 'session-2',
        name: 'Configurable',
        sessionMode: 'codex',
        cwd: VALID_CWD,
        workspaceRoot: VALID_CWD,
        workspaceRootSource: 'session_cwd',
        lastCodexThreadId: null,
        codexConfig: {
            defaultModel: 'gpt-5-codex',
            defaultReasoningEffort: null,
            defaultPersonality: null,
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        }
    };
    const sessionManager = {
        listSessions: () => [],
        async createSession() {
            throw new Error('should not be called');
        },
        getSession(id) {
            return id === 'session-2' ? existingSession : null;
        },
        updateSession(id, updates) {
            assert.equal(id, 'session-2');
            assert.deepEqual(updates, { codexConfig: null });
            return {
                ...existingSession,
                codexConfig: null
            };
        },
        renameSession: () => null,
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id', 'patch');
    const req = {
        params: { id: 'session-2' },
        body: {
            codexConfig: null
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.codexConfig, null);
});

test('POST /sessions rejects missing cwd directories', async () => {
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
    const req = {
        body: {
            name: 'Invalid cwd',
            sessionMode: 'codex',
            cwd: path.join(VALID_CWD, '__missing_workspace_dir__')
        }
    };
    const res = createMockRes();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'cwd does not exist' });
});
