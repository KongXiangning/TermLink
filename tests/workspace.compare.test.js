const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
    compareWorkspaceFiles,
    compareWorkspaceFileWithHead
} = require('../src/services/workspaceCompareService');
const { searchWorkspaceEntries, readWorkspaceFile } = require('../src/services/workspaceFileService');

function createTempWorkspace() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termlink-workspace-compare-'));
    return {
        root,
        cleanup() {
            fs.rmSync(root, { recursive: true, force: true });
        }
    };
}

function initGitRepo(root) {
    execFileSync('git', ['-C', root, 'init'], { windowsHide: true });
    execFileSync('git', ['-C', root, 'config', 'user.name', 'TermLink Test'], { windowsHide: true });
    execFileSync('git', ['-C', root, 'config', 'user.email', 'termlink@example.com'], { windowsHide: true });
}

function commitAll(root, message = 'init') {
    execFileSync('git', ['-C', root, 'add', '.'], { windowsHide: true });
    execFileSync('git', ['-C', root, 'commit', '-m', message], { windowsHide: true });
}

test('workspace file descriptors classify markdown, image, PDF, and binary files', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'README.md'), '# Hello\n');
    fs.writeFileSync(path.join(temp.root, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(path.join(temp.root, 'paper.pdf'), Buffer.from('%PDF-1.7\n'));
    fs.writeFileSync(path.join(temp.root, 'data.bin'), Buffer.from([0x00, 0x01, 0x02]));

    const markdown = await readWorkspaceFile(temp.root, 'README.md');
    const image = await readWorkspaceFile(temp.root, 'image.png');
    const pdf = await readWorkspaceFile(temp.root, 'paper.pdf');
    const binary = await readWorkspaceFile(temp.root, 'data.bin');

    assert.equal(markdown.kind, 'markdown');
    assert.equal(markdown.mimeType, 'text/markdown');
    assert.equal(image.kind, 'image');
    assert.equal(image.mimeType, 'image/png');
    assert.equal(image.encoding, null);
    assert.equal(image.viewMode, 'image');
    assert.equal(pdf.kind, 'pdf');
    assert.equal(pdf.mimeType, 'application/pdf');
    assert.equal(pdf.viewMode, 'pdf');
    assert.equal(binary.kind, 'binary');
    assert.equal(binary.viewMode, 'binary');
});

test('workspace search is recursive, bounded, excludes generated directories, and returns relative paths', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.mkdirSync(path.join(temp.root, 'docs', 'nested'), { recursive: true });
    fs.mkdirSync(path.join(temp.root, 'node_modules', 'hidden'), { recursive: true });
    fs.mkdirSync(path.join(temp.root, 'build'), { recursive: true });
    fs.writeFileSync(path.join(temp.root, 'docs', 'nested', 'guide.md'), 'guide\n');
    fs.writeFileSync(path.join(temp.root, 'docs', 'guide-extra.md'), 'guide\n');
    fs.writeFileSync(path.join(temp.root, 'node_modules', 'hidden', 'guide.md'), 'ignored\n');
    fs.writeFileSync(path.join(temp.root, 'build', 'guide.md'), 'ignored\n');

    const results = await searchWorkspaceEntries(temp.root, 'guide', 1000);

    assert.equal(results.length, 2);
    assert.deepEqual(results.map((entry) => entry.path), ['docs/guide-extra.md', 'docs/nested/guide.md']);
    assert.equal(results.every((entry) => !path.isAbsolute(entry.path)), true);
    assert.equal(results.every((entry) => !Object.hasOwn(entry, 'fsPath')), true);
});

test('two-file comparison returns paired structured rows and stable statistics', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'left.txt'), 'one\ntwo\nthree\n');
    fs.writeFileSync(path.join(temp.root, 'right.txt'), 'one\nchanged\nthree\nplus\n');

    const result = await compareWorkspaceFiles({
        workspaceRoot: temp.root,
        leftPath: 'left.txt',
        rightPath: 'right.txt'
    });

    assert.equal(result.mode, 'files');
    assert.equal(result.identical, false);
    assert.equal(result.stats.additions, 2);
    assert.equal(result.stats.deletions, 1);
    assert.equal(result.hunks.length, 1);
    assert.ok(result.hunks[0].rows.some((row) => row.type === 'change' && row.oldText === 'two' && row.newText === 'changed'));
    assert.ok(result.hunks[0].rows.some((row) => row.type === 'add' && row.newText === 'plus'));
});

test('HEAD comparison combines staged and unstaged changes', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'base\nsecond\n');
    commitAll(temp.root);
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'staged\nsecond\n');
    execFileSync('git', ['-C', temp.root, 'add', 'tracked.txt'], { windowsHide: true });
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'staged\nunstaged\n');

    const result = await compareWorkspaceFileWithHead({
        workspaceRoot: temp.root,
        gitRoot: temp.root,
        requestedPath: 'tracked.txt'
    });

    assert.equal(result.mode, 'git');
    assert.equal(result.hasChanges, true);
    const rows = result.hunks.flatMap((hunk) => hunk.rows);
    assert.ok(rows.some((row) => row.oldText === 'base' && row.newText === 'staged'));
    assert.ok(rows.some((row) => row.oldText === 'second' && row.newText === 'unstaged'));
});

test('HEAD comparison resolves paths when workspace root is a Git subdirectory', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    const workspaceRoot = path.join(temp.root, 'packages', 'docs');
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'guide.md'), 'before\n');
    commitAll(temp.root);
    fs.writeFileSync(path.join(workspaceRoot, 'guide.md'), 'after\n');

    const result = await compareWorkspaceFileWithHead({
        workspaceRoot,
        gitRoot: temp.root,
        requestedPath: 'guide.md'
    });

    assert.equal(result.left.exists, true);
    assert.ok(result.hunks.flatMap((hunk) => hunk.rows).some((row) => row.oldText === 'before' && row.newText === 'after'));
});

test('HEAD comparison handles untracked, deleted, and repositories without HEAD', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    initGitRepo(temp.root);
    fs.writeFileSync(path.join(temp.root, 'tracked.txt'), 'tracked\n');
    commitAll(temp.root);
    fs.writeFileSync(path.join(temp.root, 'untracked.txt'), 'new\n');
    fs.unlinkSync(path.join(temp.root, 'tracked.txt'));

    const untracked = await compareWorkspaceFileWithHead({
        workspaceRoot: temp.root,
        gitRoot: temp.root,
        requestedPath: 'untracked.txt'
    });
    const deleted = await compareWorkspaceFileWithHead({
        workspaceRoot: temp.root,
        gitRoot: temp.root,
        requestedPath: 'tracked.txt'
    });

    assert.equal(untracked.left.exists, false);
    assert.equal(untracked.right.exists, true);
    assert.equal(untracked.stats.additions, 1);
    assert.equal(deleted.left.exists, true);
    assert.equal(deleted.right.exists, false);
    assert.equal(deleted.stats.deletions, 1);

    const noHead = createTempWorkspace();
    t.after(() => noHead.cleanup());
    initGitRepo(noHead.root);
    fs.writeFileSync(path.join(noHead.root, 'new.txt'), 'first\n');
    const unborn = await compareWorkspaceFileWithHead({
        workspaceRoot: noHead.root,
        gitRoot: noHead.root,
        requestedPath: 'new.txt'
    });
    assert.equal(unborn.left.exists, false);
    assert.equal(unborn.stats.additions, 1);
});

test('comparison rejects binary, oversized, and out-of-range files', async (t) => {
    const temp = createTempWorkspace();
    t.after(() => temp.cleanup());
    fs.writeFileSync(path.join(temp.root, 'text.txt'), 'ok\n');
    fs.writeFileSync(path.join(temp.root, 'binary.bin'), Buffer.from([0x00, 0x01]));
    fs.writeFileSync(path.join(temp.root, 'large.txt'), 'x'.repeat(1024 * 1024 + 1));

    await assert.rejects(
        compareWorkspaceFiles({ workspaceRoot: temp.root, leftPath: 'binary.bin', rightPath: 'text.txt' }),
        (error) => error.code === 'WORKSPACE_COMPARE_BINARY' && error.status === 415
    );
    await assert.rejects(
        compareWorkspaceFiles({ workspaceRoot: temp.root, leftPath: 'large.txt', rightPath: 'text.txt' }),
        (error) => error.code === 'WORKSPACE_COMPARE_TOO_LARGE' && error.status === 413
    );
    await assert.rejects(
        compareWorkspaceFiles({ workspaceRoot: temp.root, leftPath: '../outside.txt', rightPath: 'text.txt' }),
        (error) => error.code === 'WORKSPACE_PATH_OUT_OF_RANGE'
    );

    const gitTemp = createTempWorkspace();
    t.after(() => gitTemp.cleanup());
    initGitRepo(gitTemp.root);
    fs.writeFileSync(path.join(gitTemp.root, 'large-head.txt'), 'x'.repeat(1024 * 1024 + 1));
    commitAll(gitTemp.root);
    fs.writeFileSync(path.join(gitTemp.root, 'large-head.txt'), 'small now\n');
    await assert.rejects(
        compareWorkspaceFileWithHead({
            workspaceRoot: gitTemp.root,
            gitRoot: gitTemp.root,
            requestedPath: 'large-head.txt'
        }),
        (error) => error.code === 'WORKSPACE_COMPARE_TOO_LARGE' && error.status === 413
    );
});
