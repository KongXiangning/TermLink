'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { resolveRustTargetBinary } = require('./fixtures/codex-rollout-collector/rust-target');

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, '..');

test('real Rust startup resolves an unset CODEX_HOME from the Node operating-system home', async (t) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'termlink-default-home-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const home = path.join(root, 'user-home');
    const sessionsRoot = path.join(home, '.codex', 'sessions');
    await fs.mkdir(path.dirname(sessionsRoot), { recursive: true });
    await fs.cp(
        path.join(repoRoot, 'native/codex-rollout-collector/tests/fixtures/target-session'),
        sessionsRoot,
        { recursive: true }
    );

    const binary = await resolveRustTargetBinary();
    // A separate Node process exercises the actual os.homedir default without
    // modifying this test runner's environment or reading the user's sessions.
    const env = { ...process.env, HOME: home, USERPROFILE: home };
    for (const key of Object.keys(env)) {
        if (key.toUpperCase() === 'CODEX_HOME') delete env[key];
    }
    const { stdout } = await execFileAsync(process.execPath, [
        path.join(__dirname, 'fixtures/codex-rollout-collector/default-home-probe.js'),
        binary,
        root
    ], { cwd: repoRoot, env, timeout: 20000, windowsHide: true });
    const result = JSON.parse(stdout);
    assert.equal(result.codexHomePresent, false);
    assert.equal(result.home, home);
    assert.equal(result.sessionsRoot, sessionsRoot);
    assert.deepEqual(result.sent, ['hello', 'analyze', 'ack']);
    assert.deepEqual(result.received, ['hello', 'batch', 'complete']);
    assert.equal(result.items, 2);
    assert.equal(result.receipts, 1);
    assert.equal(result.checkpointSaved, true);
    assert.equal(result.processStopped, true);
    assert.equal(result.wrongRootCreated, false);
});
