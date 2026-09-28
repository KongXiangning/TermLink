'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, '..');
const platformKey = process.platform === 'win32' ? 'win' : 'linux';

const {
    copyAllowedApplicationFiles
} = require('../scripts/release/windows-release');
const {
    getAnalyzerBinaryTarget,
    getAnalyzerBinaryName,
    resolveAnalyzerBinarySource
} = require('../scripts/release/release-layout');
const { resolveRustTargetBinary } = require('./fixtures/codex-rollout-collector/rust-target');

async function installPackagedDependencies(appRoot) {
    const npmArgs = [
        'ci',
        '--omit=dev',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund'
    ];
    const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
    const args = process.platform === 'win32'
        ? ['/d', '/s', '/c', `npm.cmd ${npmArgs.join(' ')}`]
        : npmArgs;
    await execFileAsync(command, args, {
        cwd: appRoot,
        windowsHide: true,
        timeout: 180000,
        maxBuffer: 8 * 1024 * 1024
    });
}

function waitForPackagedServer(child, { timeoutMs = 30000 } = {}) {
    return new Promise((resolve, reject) => {
        let output = '';
        let settled = false;
        const timer = setTimeout(() => {
            const error = new Error(`packaged server did not start within ${timeoutMs}ms`);
            error.output = output;
            finish(error);
        }, timeoutMs);
        const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) {
                if (!error.output) error.output = output;
                reject(error);
            } else {
                resolve(output);
            }
        };
        const capture = (chunk) => {
            output += chunk.toString();
            if (output.includes('Server started')) finish();
        };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);
        child.once('error', finish);
        child.once('exit', (code, signal) => {
            if (!settled) finish(new Error(`packaged server exited before startup (code=${code}, signal=${signal})`));
        });
    });
}

async function waitForPath(target, { timeoutMs = 15000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (!fs.existsSync(target)) {
        if (Date.now() >= deadline) throw new Error(`timed out waiting for packaged runtime path: ${target}`);
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
}

async function stopPackagedServer(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32') {
        try {
            await execFileAsync(process.env.ComSpec || 'cmd.exe', [
                '/d', '/s', '/c', `taskkill /PID ${child.pid} /T /F`
            ], { windowsHide: true, timeout: 15000 });
        } catch (_) {
            // The process may have exited between the status check and taskkill.
        }
    } else {
        child.kill('SIGTERM');
    }
    await new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once('exit', resolve);
        setTimeout(resolve, 5000).unref?.();
    });
}

test('product-history-package stages the real Rust analyzer and reopens SQLite after an ignore-scripts install', async (t) => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'termlink-product-history-package-'));
    t.after(() => fsp.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

    const analyzerBinary = await resolveRustTargetBinary();
    const stageRoot = path.join(root, 'TermLink');
    const appRoot = path.join(stageRoot, 'app');
    const application = copyAllowedApplicationFiles(stageRoot, {
        projectRoot: repositoryRoot,
        platformKey,
        analyzerSourcePath: analyzerBinary
    });

    assert.equal(application.analyzerTarget, getAnalyzerBinaryTarget(platformKey));
    assert.equal(path.basename(application.analyzer.source), getAnalyzerBinaryName(platformKey));
    await installPackagedDependencies(appRoot);

    const packagedAnalyzer = path.join(appRoot, ...getAnalyzerBinaryTarget(platformKey).split('/'));
    const persistentRoot = path.join(stageRoot, 'persistent');
    const persistentDataRoot = path.join(persistentRoot, 'data');
    const codexHome = path.join(persistentRoot, 'codex-home');
    await fsp.mkdir(path.join(codexHome, 'sessions'), { recursive: true });

    const serverEnv = {
        ...process.env,
        PORT: '0',
        TERMLINK_BIND_HOST: '127.0.0.1',
        AUTH_ENABLED: 'false',
        TERMLINK_CODEX_IPC_ENABLED: '0',
        TERMLINK_CODEX_IPC_ALLOW_ACTIVE: '0',
        TERMLINK_CODEX_IPC_CONFIRM_SEND: '0',
        TERMLINK_DIAGNOSTICS_ENABLED: 'false',
        TERMLINK_TLS_ENABLED: 'false',
        CODEX_HOME: codexHome
    };
    delete serverEnv.TERMLINK_CODEX_ROLLOUT_ANALYZER_PATH;
    delete serverEnv.TERMLINK_PERSISTENT_ROOT;

    const packagedServer = spawn(process.execPath, [path.join(appRoot, 'src', 'server.js')], {
        cwd: appRoot,
        env: serverEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    try {
        const serverOutput = await waitForPackagedServer(packagedServer);
        assert.doesNotMatch(serverOutput, /Codex rollout history collection is disabled/);
        for (const directory of [
            'codex-rollout-analysis',
            'codex-rollout-checkpoints',
            'codex-rollout-runs'
        ]) {
            await waitForPath(path.join(persistentDataRoot, directory));
        }
        await waitForPath(path.join(persistentDataRoot, 'codex-history.sqlite'));
    } finally {
        await stopPackagedServer(packagedServer);
    }

    const packagedManager = require(path.join(appRoot, 'src/services/codexRolloutCollector/analyzerProcessManager.js'));
    const relativeAnalyzerPath = path.relative(appRoot, packagedAnalyzer);
    const resolvedAnalyzer = packagedManager.resolveAnalyzerExecutable(relativeAnalyzerPath, { cwd: appRoot });
    assert.equal(resolvedAnalyzer, packagedAnalyzer);

    const manager = new packagedManager.AnalyzerProcessManager({
        analyzerPath: resolvedAnalyzer,
        cwd: appRoot,
        env: { CODEX_HOME: codexHome },
        requestTimeoutMs: 15000
    });
    try {
        await manager.start();
        assert.ok(manager.readyGeneration > 0, 'the analyzer must complete its package-relative hello handshake');
    } finally {
        await manager.stop();
    }

    const packagedStore = require(path.join(appRoot, 'src/services/codexHistoryProductStore.js'));
    const databasePath = path.join(persistentDataRoot, 'codex-history.sqlite');
    const conversationId = 'package-history-conversation';
    const first = new packagedStore.CodexHistoryProductStore({ databasePath });
    await first.stageBatch({
        conversationId,
        batchId: 'package-batch-1',
        deliveryIdentity: { request_id: 'package-request-1', job_id: 'package-job-1', segment_id: 'package-segment-1' },
        payload: { history_items: [{ item_key: 'package-item-1' }] }
    });
    await first.publishCanonical({
        conversationId,
        batchId: 'package-batch-1',
        items: [{
            itemKey: 'package-item-1',
            eventId: 'package-event-1',
            turnId: 'package-turn-1',
            itemType: 'message',
            ordinal: 0,
            payload: { text: 'packaged sqlite write' }
        }],
        coverage: { state: 'canonical', complete: true },
        checkpoint: { cursor: 'package-cursor-1' }
    });

    const reopened = new packagedStore.CodexHistoryProductStore({ databasePath });
    const history = await reopened.readConversation(conversationId);
    assert.equal(history.items[0].payload.text, 'packaged sqlite write');
    assert.deepEqual(history.coverage, { state: 'canonical', complete: true });

    const missingPath = path.join(root, 'missing', getAnalyzerBinaryName(platformKey));
    assert.throws(
        () => resolveAnalyzerBinarySource(platformKey, { projectRoot: root, overridePath: missingPath }),
        (error) => error.code === 'RELEASE_ANALYZER_BINARY_MISSING'
    );
    const mismatchedName = platformKey === 'win' ? 'codex-rollout-collector' : 'codex-rollout-collector.exe';
    assert.throws(
        () => resolveAnalyzerBinarySource(platformKey, { projectRoot: root, overridePath: path.join(root, mismatchedName) }),
        (error) => error.code === 'RELEASE_ANALYZER_BINARY_PLATFORM_MISMATCH'
    );

    assert.ok(fs.existsSync(databasePath), 'the packaged SQLite file must be durable in persistent data');
});
