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
        },
        type(value) {
            this.contentType = value;
            return this;
        },
        attachment(value) {
            this.attachmentName = value;
            return this;
        },
        sendFile(value) {
            this.sentFile = value;
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
    fs.writeFileSync(path.join(temp.root, 'deleted.txt'), 'delete me\n');
    fs.writeFileSync(path.join(temp.root, '.deleted-hidden.txt'), 'delete me too\n');
    execFileSync('git', ['-C', temp.root, 'add', 'deleted.txt', '.deleted-hidden.txt'], { windowsHide: true });
    execFileSync('git', ['-C', temp.root, 'commit', '-m', 'add deleted fixture'], { windowsHide: true });
    fs.unlinkSync(path.join(temp.root, 'deleted.txt'));
    fs.unlinkSync(path.join(temp.root, '.deleted-hidden.txt'));
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
    assert.equal(hiddenOff.body.entries.find((entry) => entry.name === 'deleted.txt').gitStatus, 'D');
    assert.equal(hiddenOff.body.entries.find((entry) => entry.name === 'deleted.txt').exists, false);
    assert.equal(hiddenOff.body.entries.some((entry) => entry.name === '.deleted-hidden.txt'), false);

    const hiddenOn = createMockRes();
    await handler({
        params: { id: 'sess-2' },
        query: { path: '', showHidden: 'true' }
    }, hiddenOn);
    assert.equal(hiddenOn.body.entries.some((entry) => entry.name === '.hidden.txt'), true);
    assert.equal(hiddenOn.body.entries.find((entry) => entry.name === '.deleted-hidden.txt').gitStatus, 'D');
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

test('workspace file-content serves only workspace files and supports an explicit download disposition', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    const imagePath = path.join(temp.root, 'preview.png');
    fs.writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const sessionManager = createSessionManager({
        id: 'sess-content', sessionMode: 'codex', cwd: temp.root,
        workspaceRoot: temp.root, workspaceRootSource: 'session_cwd'
    });
    const router = createWorkspaceRouter(sessionManager);
    const handler = getRouteHandler(router, '/sessions/:id/workspace/file-content', 'get');
    const inline = createMockRes();
    await handler({ params: { id: 'sess-content' }, query: { path: 'preview.png' } }, inline);
    assert.equal(inline.statusCode, 200);
    assert.equal(inline.contentType, 'image/png');
    assert.equal(inline.sentFile, imagePath);
    assert.equal(inline.attachmentName, undefined);

    const download = createMockRes();
    await handler({ params: { id: 'sess-content' }, query: { path: 'preview.png', download: 'true' } }, download);
    assert.equal(download.attachmentName, 'preview.png');
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

test('workspace search and structured comparison routes are additive and path-safe', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    fs.mkdirSync(path.join(temp.root, 'docs'));
    fs.writeFileSync(path.join(temp.root, 'docs', 'guide.md'), 'before\n');
    fs.writeFileSync(path.join(temp.root, 'other.md'), 'other\n');
    execFileSync('git', ['-C', temp.root, 'add', '.'], { windowsHide: true });
    execFileSync('git', ['-C', temp.root, 'commit', '-m', 'init'], { windowsHide: true });
    fs.writeFileSync(path.join(temp.root, 'docs', 'guide.md'), 'after\n');

    const router = createWorkspaceRouter(createSessionManager({
        id: 'sess-structured', sessionMode: 'codex', cwd: temp.root,
        workspaceRoot: temp.root, workspaceRootSource: 'session_cwd'
    }));

    const search = createMockRes();
    await getRouteHandler(router, '/sessions/:id/workspace/search', 'get')({
        params: { id: 'sess-structured' }, query: { q: 'guide', limit: '999' }
    }, search);
    assert.equal(search.statusCode, 200);
    assert.deepEqual(search.body.entries.map((entry) => entry.path), ['docs/guide.md']);
    assert.equal(Object.hasOwn(search.body.entries[0], 'fsPath'), false);

    const headDiff = createMockRes();
    await getRouteHandler(router, '/sessions/:id/workspace/diff', 'get')({
        params: { id: 'sess-structured' },
        query: { path: 'docs/guide.md', baseline: 'head', format: 'structured' }
    }, headDiff);
    assert.equal(headDiff.statusCode, 200);
    assert.equal(headDiff.body.mode, 'git');
    assert.equal(headDiff.body.hunks[0].rows.some((row) => row.type === 'change'), true);

    const compare = createMockRes();
    await getRouteHandler(router, '/sessions/:id/workspace/compare', 'get')({
        params: { id: 'sess-structured' },
        query: { leftPath: 'docs/guide.md', rightPath: 'other.md' }
    }, compare);
    assert.equal(compare.statusCode, 200);
    assert.equal(compare.body.mode, 'files');
    assert.equal(compare.body.left.path, 'docs/guide.md');
    assert.equal(compare.body.right.path, 'other.md');
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
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = temp.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
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
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = temp.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
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
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = allowed.root;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
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

test('workspace picker tree lists multiple configured roots when path is omitted', async (t) => {
    const rootA = createTempWorkspace();
    const rootB = createTempWorkspace();
    t.after(() => rootA.cleanup());
    t.after(() => rootB.cleanup());
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = `${rootA.root}${path.delimiter}${rootB.root}`;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
        }
    });

    const router = createWorkspaceRouter(createSessionManager({
        id: 'picker-session-multi-root',
        sessionMode: 'codex',
        cwd: null,
        workspaceRoot: null,
        workspaceRootSource: null
    }));
    const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
    const res = createMockRes();

    await handler({ query: {} }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.path, '');
    assert.equal(res.body.parentPath, null);
    assert.equal(res.body.canGoUp, false);
    assert.deepEqual(
        res.body.entries.map((entry) => entry.path),
        [rootA.root, rootB.root].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
    );
});

test('workspace picker tree can go back to multi-root listing from a configured root', async (t) => {
    const rootA = createTempWorkspace();
    const rootB = createTempWorkspace();
    t.after(() => rootA.cleanup());
    t.after(() => rootB.cleanup());
    fs.mkdirSync(path.join(rootA.root, 'alpha'));
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = `${rootA.root}${path.delimiter}${rootB.root}`;
    t.after(() => {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
        }
    });

    const router = createWorkspaceRouter(createSessionManager({
        id: 'picker-session-multi-root-parent',
        sessionMode: 'codex',
        cwd: null,
        workspaceRoot: null,
        workspaceRootSource: null
    }));
    const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
    const res = createMockRes();

    await handler({ query: { path: rootA.root } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.path, rootA.root);
    assert.equal(res.body.parentPath, '');
    assert.equal(res.body.canGoUp, true);
    assert.deepEqual(
        res.body.entries.map((entry) => entry.name),
        ['alpha']
    );
});

test('workspace picker tree fails when picker root is not configured', async () => {
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;

    try {
        const router = createWorkspaceRouter(createSessionManager({
            id: 'picker-session-missing-root',
            sessionMode: 'codex',
            cwd: null,
            workspaceRoot: null,
            workspaceRootSource: null
        }));
        const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
        const res = createMockRes();

        await handler({ query: {} }, res);

        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, {
            error: {
                code: 'WORKSPACE_PICKER_ROOT_NOT_CONFIGURED',
                message: 'Workspace picker root is not configured on the server.'
            }
        });
    } finally {
        if (previousPickerRoot !== undefined) {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
        }
    }
});

test('workspace picker tree fails when picker root is invalid', async () => {
    const previousPickerRoot = process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
    process.env.TERMLINK_WORKSPACE_PICKER_ROOT = path.join(os.tmpdir(), 'termlink-missing-picker-root');

    try {
        const router = createWorkspaceRouter(createSessionManager({
            id: 'picker-session-invalid-root',
            sessionMode: 'codex',
            cwd: null,
            workspaceRoot: null,
            workspaceRootSource: null
        }));
        const handler = getRouteHandler(router, '/workspace/picker/tree', 'get');
        const res = createMockRes();

        await handler({ query: {} }, res);

        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, {
            error: {
                code: 'WORKSPACE_PICKER_ROOT_INVALID',
                message: 'Workspace picker root is not available on the server.'
            }
        });
    } finally {
        if (previousPickerRoot === undefined) {
            delete process.env.TERMLINK_WORKSPACE_PICKER_ROOT;
        } else {
            process.env.TERMLINK_WORKSPACE_PICKER_ROOT = previousPickerRoot;
        }
    }
});
