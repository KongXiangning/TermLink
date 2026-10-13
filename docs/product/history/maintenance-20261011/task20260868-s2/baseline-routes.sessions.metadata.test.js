const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const createSessionsRouter = require('../src/routes/sessions');
const { ClientRegistrationManager } = require('../src/services/clientRegistrationManager');

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

const registrationManager = new ClientRegistrationManager({ enabled: false });
const activeRegistration = registrationManager.create('android');
const revokedRegistration = registrationManager.create('android');
registrationManager.revoke(revokedRegistration.id);

function registrationSessionFixture() {
    const calls = { list: [], create: [], lookup: [], update: [], delete: [] };
    const session = { id: 'owned-session', name: 'Owned', sessionMode: 'terminal', registrationId: activeRegistration.id };
    const sessionManager = {
        listSessions(id) { calls.list.push(id); return [session]; },
        async createSession(options) { calls.create.push(options); return { ...session, registrationId: options.registrationId }; },
        getSessionForRegistration(id, registrationId) {
            calls.lookup.push([id, registrationId]);
            return id === session.id && (!registrationId || registrationId === session.registrationId) ? session : null;
        },
        updateSession(id, updates) { calls.update.push([id, updates]); return { ...session, ...updates }; },
        deleteSession(id) { calls.delete.push(id); return true; }
    };
    return { calls, router: createSessionsRouter(sessionManager, registrationManager) };
}

const registrationRoutes = [
    ['/sessions', 'get'], ['/sessions', 'post'], ['/sessions/:id', 'patch'],
    ['/sessions/:id', 'delete'], ['/sessions/:id/workspace/files', 'get']
];

for (const [kind, registrationId] of [['unknown', 'missing-registration'], ['revoked', revokedRegistration.id]]) {
    for (const [route, method] of registrationRoutes) {
        test(`${method.toUpperCase()} ${route} rejects ${kind} registration before session access`, async () => {
            const { router, calls } = registrationSessionFixture();
            const res = createMockRes();
            await getRouteHandler(router, route, method)({
                headers: { 'x-termlink-registration-id': registrationId },
                params: { id: 'owned-session' }, query: {}, body: { name: 'Updated' }
            }, res);
            assert.equal(res.statusCode, 403);
            assert.deepEqual(res.body, { error: 'Client registration is invalid or revoked.', code: 'REGISTRATION_INVALID' });
            assert.deepEqual(calls, { list: [], create: [], lookup: [], update: [], delete: [] });
        });
    }
}

for (const [kind, registrationId] of [['active', activeRegistration.id], ['legacy', null]]) {
    test(`session routes preserve ${kind} registration list/create/update/delete paths`, async () => {
        const { router, calls } = registrationSessionFixture();
        const headers = registrationId ? { 'x-termlink-registration-id': `  ${registrationId}  ` } : {};
        for (const [route, method] of registrationRoutes) {
            const res = createMockRes();
            await getRouteHandler(router, route, method)({ headers, params: { id: 'owned-session' }, query: {}, body: { name: 'Updated' } }, res);
            assert.equal(res.statusCode, 200);
            assert.notEqual(res.body, undefined);
        }
        assert.deepEqual(calls.list, [registrationId]);
        assert.equal(calls.create.length, 1);
        assert.equal(calls.create[0].registrationId, registrationId || undefined);
        assert.deepEqual(calls.lookup, Array(3).fill(['owned-session', registrationId]));
        assert.equal(calls.update.length, 1);
        assert.deepEqual(calls.delete, ['owned-session']);
    });
}

test('active registration cannot access or mutate another registration session over HTTP', async () => {
    const otherRegistration = registrationManager.create('android');
    const { router, calls } = registrationSessionFixture();
    for (const [route, method] of registrationRoutes.slice(2)) {
        const res = createMockRes();
        await getRouteHandler(router, route, method)({
            headers: { 'x-termlink-registration-id': otherRegistration.id },
            params: { id: 'owned-session' }, query: {}, body: { name: 'Updated' }
        }, res);
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Session not found' });
    }
    assert.equal(calls.lookup.length, 3);
    assert.deepEqual(calls.update, []);
    assert.deepEqual(calls.delete, []);
});

test('GET /sessions exposes aggregate TLS summary fields from sessionManager', () => {
    const router = createSessionsRouter({
        listSessions() {
            return [{
                id: 'session-1',
                name: 'Session 1',
                status: 'ACTIVE',
                activeConnections: 2,
                activeConnectionCount: 2,
                allTls: false,
                allMtlsAuthorized: false,
                createdAt: 1,
                lastActiveAt: 2,
                sessionMode: 'terminal',
                cwd: null,
                workspaceRoot: null,
                workspaceRootSource: null,
                lastCodexThreadId: null,
                codexConfig: null,
                codexThreadId: null
            }];
        }
    });
    const handler = getRouteHandler(router, '/sessions', 'get');
    const req = {};
    const res = createMockRes();

    handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, [{
        id: 'session-1',
        name: 'Session 1',
        status: 'ACTIVE',
        activeConnections: 2,
        activeConnectionCount: 2,
        allTls: false,
        allMtlsAuthorized: false,
        createdAt: 1,
        lastActiveAt: 2,
        sessionMode: 'terminal',
        cwd: null,
        workspaceRoot: null,
        workspaceRootSource: null,
        lastCodexThreadId: null,
        codexConfig: null,
        codexThreadId: null
    }]);
});

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

test('GET /sessions/:id/workspace/files returns empty list for terminal sessions', async () => {
    const sessionManager = {
        listSessions: () => [],
        getSession(id) {
            if (id !== 'terminal-1') {
                return null;
            }
            return {
                id,
                sessionMode: 'terminal',
                cwd: VALID_CWD,
                workspaceRoot: VALID_CWD,
                workspaceRootSource: 'session_cwd'
            };
        },
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/files', 'get');
    const res = createMockRes();

    await handler({
        params: { id: 'terminal-1' },
        query: { q: 'session', limit: '10' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { files: [] });
});

test('GET /sessions/:id/workspace/files returns empty list for legacy codex sessions without workspaceRoot', async () => {
    const sessionManager = {
        listSessions: () => [],
        getSession(id) {
            if (id !== 'codex-legacy') {
                return null;
            }
            return {
                id,
                sessionMode: 'codex',
                cwd: VALID_CWD,
                workspaceRoot: null,
                workspaceRootSource: null
            };
        },
        schedulePersist() {
            throw new Error('should not lazily persist workspaceRoot from legacy search endpoint');
        },
        deleteSession: () => false
    };

    const router = createSessionsRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/files', 'get');
    const res = createMockRes();

    await handler({
        params: { id: 'codex-legacy' },
        query: { q: 'session', limit: '10' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { files: [] });
});
