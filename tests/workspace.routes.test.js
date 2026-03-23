const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const createWorkspaceRouter = require('../src/routes/workspace');

function getRouteHandler(router, pathName, method) {
    const layer = router.stack.find((entry) => (
        entry.route &&
        entry.route.path === pathName &&
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

function createTempWorkspace() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-workspace-'));
    return {
        root,
        cleanup() {
            fs.rmSync(root, { recursive: true, force: true });
        }
    };
}

function createSessionManager(session) {
    let persistCount = 0;
    return {
        getSession(id) {
            return id === session.id ? session : null;
        },
        schedulePersist() {
            persistCount += 1;
        },
        get persistCount() {
            return persistCount;
        }
    };
}

function initGitRepo(root) {
    execFileSync('git', ['-C', root, 'init'], { windowsHide: true });
    execFileSync('git', ['-C', root, 'config', 'user.name', 'TermLink Test'], { windowsHide: true });
    execFileSync('git', ['-C', root, 'config', 'user.email', 'termlink@example.com'], { windowsHide: true });
}

test('workspace meta lazily initializes workspaceRoot from legacy cwd', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.mkdirSync(path.join(temp.root, 'docs'));

    const session = {
        id: 'sess-1',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: null,
        workspaceRootSource: null
    };
    const sessionManager = createSessionManager(session);
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/meta', 'get');
    const res = createMockRes();

    await handler({ params: { id: 'sess-1' }, query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.workspaceRoot, temp.root);
    assert.equal(res.body.workspaceRootSource, 'session_cwd');
    assert.ok(res.body.defaultEntryPath === 'docs' || res.body.defaultEntryPath === 'DOCS');
    assert.equal(session.workspaceRoot, temp.root);
    assert.equal(sessionManager.persistCount, 1);
});

test('workspace non-meta endpoints do not lazily initialize workspaceRoot from legacy cwd', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'hello.txt'), 'hello\n');

    const session = {
        id: 'sess-legacy-non-meta',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: null,
        workspaceRootSource: null
    };
    const sessionManager = createSessionManager(session);
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/tree', 'get');
    const res = createMockRes();

    await handler({
        params: { id: 'sess-legacy-non-meta' },
        query: { path: '', showHidden: 'true' }
    }, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
        error: {
            code: 'WORKSPACE_ROOT_NOT_AVAILABLE',
            message: 'Workspace root is not available for this session.'
        }
    });
    assert.equal(session.workspaceRoot, null);
    assert.equal(session.workspaceRootSource, null);
    assert.equal(sessionManager.persistCount, 0);
});

test('workspace tree returns git status and respects hidden file toggle', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'before\n');
    execFileSync('git', ['-C', temp.root, 'add', 'tracked.txt'], { windowsHide: true });
    execFileSync('git', ['-C', temp.root, 'commit', '-m', 'init'], { windowsHide: true });
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'after\n');
    fs.writeFileSync(path.join(temp.root, '.hidden.txt'), 'secret\n');
    fs.writeFileSync(path.join(temp.root, 'untracked.txt'), 'new\n');

    const sessionManager = createSessionManager({
        id: 'sess-2',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    });
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/tree', 'get');

    const hiddenOff = createMockRes();
    await handler({
        params: { id: 'sess-2' },
        query: { path: '', showHidden: 'false' }
    }, hiddenOff);
    assert.equal(hiddenOff.statusCode, 200);
    assert.equal(hiddenOff.body.entries.some((entry) => entry.name === '.hidden.txt'), false);
    assert.equal(hiddenOff.body.entries.find((entry) => entry.name === 'tracked.txt').gitStatus, 'M');
    assert.equal(hiddenOff.body.entries.find((entry) => entry.name === 'untracked.txt').gitStatus, '?');

    const hiddenOn = createMockRes();
    await handler({
        params: { id: 'sess-2' },
        query: { path: '', showHidden: 'true' }
    }, hiddenOn);
    assert.equal(hiddenOn.body.entries.some((entry) => entry.name === '.hidden.txt'), true);
});

test('workspace file endpoint supports full, truncated, segmented, and limited view modes', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'small.txt'), 'hello workspace\n');
    fs.writeFileSync(path.join(temp.root, 'medium.txt'), 'm'.repeat(300 * 1024));
    fs.writeFileSync(path.join(temp.root, 'large.txt'), 'l'.repeat(2 * 1024 * 1024));
    fs.writeFileSync(path.join(temp.root, 'huge.txt'), 'h'.repeat(9 * 1024 * 1024));

    const sessionManager = createSessionManager({
        id: 'sess-3',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    });
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/file', 'get');

    for (const [fileName, expectedMode] of [
        ['small.txt', 'full'],
        ['medium.txt', 'truncated'],
        ['large.txt', 'segmented'],
        ['huge.txt', 'limited']
    ]) {
        const res = createMockRes();
        await handler({ params: { id: 'sess-3' }, query: { path: fileName } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.viewMode, expectedMode);
        assert.equal(res.body.previewable, true);
    }
});

test('workspace diff returns unified diff for tracked changes and explicit feedback for untracked files', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'before\n');
    execFileSync('git', ['-C', temp.root, 'add', 'tracked.txt'], { windowsHide: true });
    execFileSync('git', ['-C', temp.root, 'commit', '-m', 'init'], { windowsHide: true });
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'after\n');
    fs.writeFileSync(path.join(temp.root, 'untracked.txt'), 'new\n');

    const sessionManager = createSessionManager({
        id: 'sess-4',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    });
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/diff', 'get');

    const trackedRes = createMockRes();
    await handler({ params: { id: 'sess-4' }, query: { path: 'tracked.txt' } }, trackedRes);
    assert.equal(trackedRes.statusCode, 200);
    assert.equal(trackedRes.body.hasChanges, true);
    assert.match(trackedRes.body.diffText, /@@/);

    const untrackedRes = createMockRes();
    await handler({ params: { id: 'sess-4' }, query: { path: 'untracked.txt' } }, untrackedRes);
    assert.equal(untrackedRes.statusCode, 200);
    assert.equal(untrackedRes.body.reason, 'untracked_file');
});

test('workspace blocks path escape attempts outside workspace root', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'small.txt'), 'hello\n');

    const sessionManager = createSessionManager({
        id: 'sess-5',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    });
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/file', 'get');
    const res = createMockRes();

    await handler({ params: { id: 'sess-5' }, query: { path: '../outside.txt' } }, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        error: {
            code: 'WORKSPACE_PATH_OUT_OF_RANGE',
            message: 'Requested path is outside workspace root.'
        }
    });
});

test('workspace picker tree lists directories and parent path', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.mkdirSync(path.join(temp.root, 'alpha'));
    fs.mkdirSync(path.join(temp.root, 'beta'));
    fs.writeFileSync(path.join(temp.root, 'note.txt'), 'file\n');
    const previousPickerRoot = process.env.TERMLINK_CODEX_WORKSPACE_DIR;
    process.env.TERMLINK_CODEX_WORKSPACE_DIR = temp.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_CODEX_WORKSPACE_DIR;
        } else {
            process.env.TERMLINK_CODEX_WORKSPACE_DIR = previousPickerRoot;
        }
    });

    const router = createWorkspaceRouter(createSessionManager({
        id: 'picker-session',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    }));
    const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
    const res = createMockRes();

    await handler({ query: { path: temp.root } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.path, temp.root);
    assert.equal(res.body.parentPath, null);
    assert.equal(res.body.canGoUp, false);
    assert.deepEqual(
        res.body.entries.map((entry) => entry.name),
        ['alpha', 'beta']
    );
});

test('workspace picker tree defaults to allowed host root when path is omitted', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.mkdirSync(path.join(temp.root, 'alpha'));
    const previousPickerRoot = process.env.TERMLINK_CODEX_WORKSPACE_DIR;
    process.env.TERMLINK_CODEX_WORKSPACE_DIR = temp.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_CODEX_WORKSPACE_DIR;
        } else {
            process.env.TERMLINK_CODEX_WORKSPACE_DIR = previousPickerRoot;
        }
    });

    const router = createWorkspaceRouter(createSessionManager({
        id: 'picker-session-default-root',
        sessionMode: 'codex',
        cwd: temp.root,
        workspaceRoot: temp.root,
        workspaceRootSource: 'session_cwd'
    }));
    const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
    const res = createMockRes();

    await handler({ query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.path, temp.root);
    assert.equal(res.body.parentPath, null);
    assert.equal(res.body.canGoUp, false);
    assert.deepEqual(
        res.body.entries.map((entry) => entry.name),
        ['alpha']
    );
});

test('workspace picker tree rejects paths outside allowed host root', async (t) => {
    const allowed = createTempWorkspace();
    const outside = createTempWorkspace();
    t.after(() => allowed.cleanup());
    t.after(() => outside.cleanup());
    const previousPickerRoot = process.env.TERMLINK_CODEX_WORKSPACE_DIR;
    process.env.TERMLINK_CODEX_WORKSPACE_DIR = allowed.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_CODEX_WORKSPACE_DIR;
        } else {
            process.env.TERMLINK_CODEX_WORKSPACE_DIR = previousPickerRoot;
        }
    });

    const router = createWorkspaceRouter(createSessionManager({
        id: 'picker-session-2',
        sessionMode: 'codex',
        cwd: allowed.root,
        workspaceRoot: allowed.root,
        workspaceRootSource: 'session_cwd'
    }));
    const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
    const res = createMockRes();

    await handler({ query: { path: outside.root } }, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        error: {
            code: 'WORKSPACE_PATH_OUT_OF_RANGE',
            message: 'Requested path is outside workspace root.'
        }
    });
});
