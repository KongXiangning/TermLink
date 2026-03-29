const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const WORKSPACE_HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'workspace.html'), 'utf8');
const WORKSPACE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'workspace.js'), 'utf8');

function createResponse(ok, payload, status = ok ? 200 : 500) {
    return {
        ok,
        status,
        async json() {
            return payload;
        }
    };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function flushUi(turns = 4) {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

function createWorkspaceApp(options = {}) {
    const dom = new JSDOM(WORKSPACE_HTML, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: options.url || 'https://example.test/workspace.html'
    });
    const { window } = dom;
    const calls = [];
    const fetchImpl = options.fetchImpl || (async (url) => createResponse(true, {}));
    window.__TERMLINK_CONFIG__ = options.config || {
        sessionId: 'session-1',
        serverUrl: 'https://example.test',
        authHeader: 'Bearer token'
    };
    window.fetch = async (url, init = {}) => {
        const record = {
            url: String(url),
            headers: init.headers || {}
        };
        calls.push(record);
        return fetchImpl(record, window);
    };
    window.console = console;

    // Provide i18n stub so workspace.js can call i18n.init() / t() safely
    window.i18n = {
        init: async () => {},
        t: (key) => key,
        translatePage: () => {},
        locale: 'en',
        ready: true
    };
    window.t = window.i18n.t;

    window.eval(WORKSPACE_JS);
    return {
        window,
        document: window.document,
        calls,
        cleanup() {
            window.close();
        }
    };
}

test('workspace page boots with meta then tree and keeps viewer in empty state', async (t) => {
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: 'docs',
                    isGitRepo: true,
                    gitRoot: '/repo',
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                assert.equal(url.searchParams.get('path'), 'docs');
                assert.equal(url.searchParams.get('showHidden'), 'true');
                return createResponse(true, {
                    path: 'docs',
                    entries: [
                        { name: 'guide.md', path: 'docs/guide.md', type: 'file', gitStatus: 'M' }
                    ]
                });
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();

    assert.equal(app.calls.length, 2);
    assert.match(app.calls[0].url, /\/workspace\/meta$/);
    assert.match(app.calls[1].url, /\/workspace\/tree\?/);
    assert.equal(app.document.getElementById('current-dir-label').textContent, 'docs');
    assert.equal(app.document.getElementById('viewer-title').textContent, 'workspace.viewer.noFile');
    assert.equal(app.document.getElementById('viewer-empty').textContent, 'workspace.viewer.selectFile');
});

test('workspace page drops stale file responses when user selects another file', async (t) => {
    const firstFile = deferred();
    const secondFile = deferred();
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: '',
                    isGitRepo: true,
                    gitRoot: '/repo',
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                return createResponse(true, {
                    path: '',
                    entries: [
                        { name: 'alpha.txt', path: 'alpha.txt', type: 'file', gitStatus: null },
                        { name: 'beta.txt', path: 'beta.txt', type: 'file', gitStatus: null }
                    ]
                });
            }
            if (url.pathname.endsWith('/workspace/file')) {
                const requestedPath = url.searchParams.get('path');
                if (requestedPath === 'alpha.txt') {
                    return firstFile.promise;
                }
                if (requestedPath === 'beta.txt') {
                    return secondFile.promise;
                }
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();

    const buttons = app.document.querySelectorAll('.browser-item');
    buttons[0].click();
    buttons[1].click();

    secondFile.resolve(createResponse(true, {
        path: 'beta.txt',
        name: 'beta.txt',
        previewable: true,
        viewMode: 'full',
        content: 'beta body'
    }));
    await flushUi();

    firstFile.resolve(createResponse(true, {
        path: 'alpha.txt',
        name: 'alpha.txt',
        previewable: true,
        viewMode: 'full',
        content: 'alpha body'
    }));
    await flushUi();

    assert.equal(app.document.getElementById('viewer-title').textContent, 'beta.txt');
    assert.equal(app.document.getElementById('viewer-body').textContent, 'beta body');
    assert.equal(app.document.getElementById('viewer-meta').textContent, 'beta.txt');
});

test('workspace page keeps loaded content when diff request fails', async (t) => {
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: '',
                    isGitRepo: true,
                    gitRoot: '/repo',
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                return createResponse(true, {
                    path: '',
                    entries: [
                        { name: 'tracked.txt', path: 'tracked.txt', type: 'file', gitStatus: 'M' }
                    ]
                });
            }
            if (url.pathname.endsWith('/workspace/file')) {
                return createResponse(true, {
                    path: 'tracked.txt',
                    name: 'tracked.txt',
                    previewable: true,
                    viewMode: 'full',
                    content: 'stable content'
                });
            }
            if (url.pathname.endsWith('/workspace/diff')) {
                return createResponse(false, {
                    error: {
                        message: 'Diff service unavailable'
                    }
                }, 503);
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();
    app.document.querySelector('.browser-item').click();
    await flushUi();
    app.document.getElementById('btn-view-diff').click();
    await flushUi();

    assert.equal(app.document.getElementById('viewer-status').textContent, 'Diff service unavailable');
    assert.equal(app.document.getElementById('viewer-empty').textContent, 'workspace.viewer.diffLoadFailed');

    app.document.getElementById('btn-view-content').click();
    await flushUi();

    assert.equal(app.document.getElementById('viewer-body').textContent, 'stable content');
    assert.equal(app.document.getElementById('viewer-mode-note').textContent, 'workspace.viewer.fullPreview');
});

test('workspace page appends truncated content when loading more', async (t) => {
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: '',
                    isGitRepo: false,
                    gitRoot: null,
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                return createResponse(true, {
                    path: '',
                    entries: [
                        { name: 'large.log', path: 'large.log', type: 'file', gitStatus: null }
                    ]
                });
            }
            if (url.pathname.endsWith('/workspace/file')) {
                return createResponse(true, {
                    path: 'large.log',
                    name: 'large.log',
                    previewable: true,
                    viewMode: 'truncated',
                    content: 'head-',
                    returnedBytes: 5,
                    nextOffset: 5,
                    hasMore: true
                });
            }
            if (url.pathname.endsWith('/workspace/file-segment')) {
                assert.equal(url.searchParams.get('offset'), '5');
                return createResponse(true, {
                    path: 'large.log',
                    viewMode: 'truncated',
                    content: 'tail',
                    offset: 5,
                    returnedBytes: 4,
                    nextOffset: 9,
                    hasMore: false
                });
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();
    app.document.querySelector('.browser-item').click();
    await flushUi();
    app.document.getElementById('btn-load-more').click();
    await flushUi();

    assert.equal(app.document.getElementById('viewer-body').textContent, 'head-tail');
    assert.match(app.document.getElementById('viewer-mode-note').textContent, /truncatedPreview/);
    assert.equal(app.document.getElementById('btn-load-more').hidden, true);
});

test('workspace page clears stale diff loading when switching to another file', async (t) => {
    const staleDiff = deferred();
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: '',
                    isGitRepo: true,
                    gitRoot: '/repo',
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                return createResponse(true, {
                    path: '',
                    entries: [
                        { name: 'alpha.txt', path: 'alpha.txt', type: 'file', gitStatus: 'M' },
                        { name: 'beta.txt', path: 'beta.txt', type: 'file', gitStatus: 'M' }
                    ]
                });
            }
            if (url.pathname.endsWith('/workspace/file')) {
                return createResponse(true, {
                    path: url.searchParams.get('path'),
                    name: url.searchParams.get('path'),
                    previewable: true,
                    viewMode: 'full',
                    content: `${url.searchParams.get('path')}-content`
                });
            }
            if (url.pathname.endsWith('/workspace/diff')) {
                if (url.searchParams.get('path') === 'alpha.txt') {
                    return staleDiff.promise;
                }
                return createResponse(true, {
                    path: url.searchParams.get('path'),
                    hasChanges: true,
                    diffText: 'fresh diff'
                });
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();

    const buttons = app.document.querySelectorAll('.browser-item');
    buttons[0].click();
    await flushUi();
    app.document.getElementById('btn-view-diff').click();
    await flushUi(1);

    buttons[1].click();
    await flushUi();

    assert.equal(app.document.getElementById('btn-view-diff').disabled, false);
    assert.equal(app.document.getElementById('btn-reload-file').disabled, false);

    staleDiff.resolve(createResponse(true, {
        path: 'alpha.txt',
        hasChanges: true,
        diffText: 'stale diff'
    }));
    await flushUi();

    assert.equal(app.document.getElementById('viewer-title').textContent, 'beta.txt');
    assert.equal(app.document.getElementById('btn-view-diff').disabled, false);
    assert.equal(app.document.getElementById('btn-reload-file').disabled, false);
});

test('workspace page clears stale more loading when switching to another file', async (t) => {
    const staleMore = deferred();
    const app = createWorkspaceApp({
        fetchImpl: async (record) => {
            const url = new URL(record.url);
            if (url.pathname.endsWith('/workspace/meta')) {
                return createResponse(true, {
                    workspaceRoot: '/repo',
                    defaultEntryPath: '',
                    isGitRepo: false,
                    gitRoot: null,
                    disabledReason: null
                });
            }
            if (url.pathname.endsWith('/workspace/tree')) {
                return createResponse(true, {
                    path: '',
                    entries: [
                        { name: 'alpha.log', path: 'alpha.log', type: 'file', gitStatus: null },
                        { name: 'beta.log', path: 'beta.log', type: 'file', gitStatus: null }
                    ]
                });
            }
            if (url.pathname.endsWith('/workspace/file')) {
                const requestedPath = url.searchParams.get('path');
                if (requestedPath === 'alpha.log') {
                    return createResponse(true, {
                        path: 'alpha.log',
                        name: 'alpha.log',
                        previewable: true,
                        viewMode: 'truncated',
                        content: 'alpha-',
                        returnedBytes: 6,
                        nextOffset: 6,
                        hasMore: true
                    });
                }
                return createResponse(true, {
                    path: 'beta.log',
                    name: 'beta.log',
                    previewable: true,
                    viewMode: 'full',
                    content: 'beta-content'
                });
            }
            if (url.pathname.endsWith('/workspace/file-segment')) {
                assert.equal(url.searchParams.get('path'), 'alpha.log');
                return staleMore.promise;
            }
            throw new Error(`Unexpected request ${record.url}`);
        }
    });
    t.after(() => app.cleanup());

    await flushUi();

    const buttons = app.document.querySelectorAll('.browser-item');
    buttons[0].click();
    await flushUi();
    app.document.getElementById('btn-load-more').click();
    await flushUi(1);

    buttons[1].click();
    await flushUi();

    assert.equal(app.document.getElementById('viewer-title').textContent, 'beta.log');
    assert.equal(app.document.getElementById('btn-view-content').disabled, false);
    assert.equal(app.document.getElementById('btn-reload-file').disabled, false);

    staleMore.resolve(createResponse(true, {
        path: 'alpha.log',
        viewMode: 'truncated',
        content: 'tail',
        offset: 6,
        returnedBytes: 4,
        nextOffset: 10,
        hasMore: false
    }));
    await flushUi();

    assert.equal(app.document.getElementById('viewer-title').textContent, 'beta.log');
    assert.equal(app.document.getElementById('viewer-body').textContent, 'beta-content');
    assert.equal(app.document.getElementById('btn-view-content').disabled, false);
    assert.equal(app.document.getElementById('btn-reload-file').disabled, false);
});
