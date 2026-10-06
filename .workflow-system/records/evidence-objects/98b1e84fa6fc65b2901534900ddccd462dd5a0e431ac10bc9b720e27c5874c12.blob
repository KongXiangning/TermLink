'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { CodexRolloutCollector, FileAnalysisStore, FileCheckpointStore, FileAnalysisRunStore,
    MemoryAnalysisStore, MemoryCheckpointStore, MemoryAnalysisRunStore } = require('../src/services/codexRolloutCollector');

const execute = promisify(execFile);
const fixtures = path.join(__dirname, 'fixtures', 'codex-rollout-collector');
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function until(predicate) {
    const end = Date.now() + 3000;
    while (!await predicate()) {
        if (Date.now() > end) throw new Error('condition did not settle');
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

class ControlledManager {
    constructor() {
        this.requestTimeoutMs = 5000;
        this.generation = 0;
        this.requests = [];
        this.cancels = [];
        this.active = null;
        this.idle = Promise.resolve();
    }
    async start() { if (!this.generation) this.generation = 1; }
    request(request) {
        assert.equal(this.active, null, 'analyze must remain single-flight');
        this.requests.push(request);
        this.idle = new Promise((resolve) => { this.releaseIdle = resolve; });
        return new Promise((resolve, reject) => { this.active = { request, resolve, reject }; });
    }
    cancel(requestId, reason) { this.cancels.push({ requestId, reason }); return true; }
    settleCancel() {
        const active = this.active;
        this.active = null;
        const error = new Error('cancelled'); error.code = 'cancelled';
        active.reject(error);
    }
    finish() {
        const active = this.active; this.active = null;
        active.resolve({ status: 'completed', completeness: 'canonical' });
        this.releaseIdle();
    }
    waitForIdle() { return this.idle; }
    async stop() {
        if (this.active) this.settleCancel();
        this.releaseIdle?.();
    }
}

function memoryCollector(manager, runStore = new MemoryAnalysisRunStore()) {
    return new CodexRolloutCollector({ processManager: manager, runStore,
        store: new MemoryAnalysisStore(), checkpointStore: new MemoryCheckpointStore() });
}
const request = (job, conversation, priority = 'background') => ({
    job_id: job, conversation_id: conversation, mode: priority === 'interactive' ? 'preview' : 'backfill', priority
});

test('interactive preemption waits for termination fence and resumes the same background job', { timeout: 6000 }, async (t) => {
    const manager = new ControlledManager();
    const collector = memoryCollector(manager);
    t.after(() => collector.stop());
    const background = collector.analyze(request('job-A', 'A'), { requestId: 'first-A' });
    await until(() => manager.requests.length === 1);
    const interactive = collector.analyze(request('job-B', 'B', 'interactive'));
    await until(() => manager.cancels.length === 1);
    assert.equal(manager.cancels[0].requestId, 'first-A');
    manager.settleCancel();
    await tick();
    assert.equal(manager.requests.length, 1, 'cancel terminal without idle evidence must not release the slot');
    manager.releaseIdle();
    await until(() => manager.requests.length === 2);
    assert.equal(manager.requests[1].job_id, 'job-B');
    manager.finish(); await interactive;
    await until(() => manager.requests.length === 3);
    assert.equal(manager.requests[2].job_id, 'job-A');
    assert.notEqual(manager.requests[2].request_id, 'first-A');
    manager.finish(); await background;
    assert.equal((await collector.runStore.get('first-A')).status, 'completed');
});

test('new interactive selection preempts the old selection and a same-conversation intent supersedes it', { timeout: 6000 }, async (t) => {
    const manager = new ControlledManager();
    const collector = memoryCollector(manager); t.after(() => collector.stop());
    const old = collector.analyze(request('old-A', 'A', 'interactive'), { requestId: 'old-A-request' });
    const rejected = assert.rejects(old, /cancelled/);
    await until(() => manager.requests.length === 1);
    const next = collector.analyze(request('new-A', 'A', 'interactive'));
    await until(() => manager.cancels.length === 1);
    manager.settleCancel(); manager.releaseIdle(); await rejected;
    await until(() => manager.requests.length === 2);
    manager.finish(); await next;
    await tick(); assert.equal(manager.requests.length, 2);
    assert.equal((await collector.runStore.get('old-A-request')).status, 'failed');
});

test('Node restart recovers durable staging even when run ACK-pending update never happened', { timeout: 10000 }, async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'collector-node-recovery-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    await assert.rejects(execute(process.execPath, [path.join(fixtures, 'node-crash-recovery-probe.js'), root],
        { timeout: 5000, windowsHide: true }), (error) => error.code === 83);
    const runStore = new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') });
    const before = await runStore.get('before-node-crash');
    assert.equal(before.status, 'running');
    assert.equal(before.recovery_delivery, null);
    const store = new FileAnalysisStore({ rootDir: path.join(root, 'staging') });
    const collector = new CodexRolloutCollector({ analyzerPath: process.execPath,
        analyzerArgs: [path.join(fixtures, 'fake-analyzer.js')], analyzerEnv: { CODEX_HOME: root },
        store, runStore, checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }) });
    t.after(() => collector.stop());
    const sent = [];
    collector.processManager.on('sent', (message) => sent.push(message));
    await collector.init();
    await until(async () => (await runStore.get('before-node-crash')).status === 'completed');
    const after = await runStore.get('before-node-crash');
    assert.equal(after.job_id, before.job_id);
    assert.notEqual(after.request_id, before.request_id);
    assert.ok(after.process_generation > before.process_generation);
    assert.equal(after.deadline, before.deadline);
    assert.deepEqual(after.read_intent.resource_limits, before.read_intent.resource_limits);
    const analyze = sent.find((message) => message.message_type === 'analyze');
    assert.deepEqual(analyze.recovery, { segment_id: 'segment-crash-job', batch_id: 'batch-crash-job' });
    const state = await store.snapshot({ conversationId: 'crash-conversation', sourceId: 'fake-source', sourceEpoch: 'fake-epoch-1' });
    assert.equal(state.receipts.length, 1);
    await collector.stop();
    const restarted = new CodexRolloutCollector({ processManager: new ControlledManager(), runStore, store,
        checkpointStore: new MemoryCheckpointStore() });
    await restarted.init();
    assert.equal(restarted.processManager.requests.length, 0, 'completed jobs never restart');
    await restarted.stop();
});

test('restart rejects expired, incompatible and exhausted jobs without analyze', async (t) => {
    for (const mutation of [ { deadline: Date.now() - 1 }, { recovery_schema_version: 9 },
        { retry_count: 2, retry_budget: 1 } ]) {
        const runStore = new MemoryAnalysisRunStore();
        await runStore.enqueue({ run_id: 'bad-run', job_id: 'bad-job', request_id: 'old-request',
            conversation_id: 'C', mode: 'backfill', read_intent: request('bad-job', 'C'),
            recovery_schema_version: 1, priority: 'background', enqueue_sequence: 1,
            deadline: Date.now() + 5000, retry_budget: 1, ...mutation });
        const manager = new ControlledManager(); const collector = memoryCollector(manager, runStore);
        t.after(() => collector.stop()); await collector.init();
        assert.equal(manager.requests.length, 0);
        assert.equal((await runStore.get('bad-run')).status, 'failed');
    }
});

test('latest interactive selection wins while cancellation is still draining', { timeout: 6000 }, async (t) => {
    const manager = new ControlledManager();
    const collector = memoryCollector(manager); t.after(() => collector.stop());
    const a = collector.analyze(request('A', 'A', 'interactive'));
    await until(() => manager.requests.length === 1);
    const b = collector.analyze(request('B', 'B', 'interactive'));
    const c = collector.analyze(request('C', 'C', 'interactive'));
    await until(() => manager.cancels.length === 1);
    manager.settleCancel(); manager.releaseIdle();
    await until(() => manager.requests.length === 2);
    assert.equal(manager.requests[1].conversation_id, 'C');
    manager.finish(); await c;
    await until(() => manager.requests.length === 3);
    manager.finish();
    await until(() => manager.requests.length === 4);
    manager.finish(); await Promise.all([a, b]);
});

test('queued intent is durable before dispatch, and queue timeout does not kill another conversation', { timeout: 6000 }, async (t) => {
    const manager = new ControlledManager();
    const runs = new MemoryAnalysisRunStore();
    const enqueue = runs.enqueue.bind(runs);
    let release;
    runs.enqueue = async (run) => {
        if (run.job_id === 'slow') await new Promise((resolve) => { release = resolve; });
        return enqueue(run);
    };
    const collector = memoryCollector(manager, runs); t.after(() => collector.stop());
    const first = collector.analyze(request('slow', 'A'), { requestId: 'slow-request' });
    await tick(); assert.equal(manager.requests.length, 0);
    release(); await until(() => manager.requests.length === 1);
    assert.ok((await runs.get('slow-request')).read_intent);
    const queued = collector.analyze(request('short', 'B'), { requestId: 'short-request', timeoutMs: 25 });
    await assert.rejects(queued, (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT');
    assert.equal(manager.requests.length, 1); assert.equal(manager.cancels.length, 0);
    manager.finish(); await first;
    await until(async () => (await runs.get('short-request')).status === 'failed');
});

test('queued never-attempted job with zero retry budget resumes once and preserves queue policy', async (t) => {
    const runs = new MemoryAnalysisRunStore();
    await runs.enqueue({ run_id: 'queued-run', job_id: 'queued-job', request_id: 'old-queued',
        conversation_id: 'Q', mode: 'backfill', read_intent: request('queued-job', 'Q'),
        recovery_schema_version: 1, priority: 'background', enqueue_sequence: 4,
        deadline: Date.now() + 5000, retry_budget: 0 });
    const manager = new ControlledManager(); const collector = memoryCollector(manager, runs);
    t.after(() => collector.stop()); await collector.init();
    await until(() => manager.requests.length === 1);
    assert.notEqual(manager.requests[0].request_id, 'old-queued');
    manager.finish(); await until(async () => (await runs.get('queued-run')).status === 'completed');
    assert.equal((await runs.get('queued-run')).retry_count, 0);
});

test('run recovery scan limit fails closed before dispatch and preserves every record', async () => {
    const runs = new MemoryAnalysisRunStore();
    for (const id of ['one', 'two']) await runs.enqueue({ run_id: id, conversation_id: id, mode: 'preview' });
    const collector = new CodexRolloutCollector({ processManager: new ControlledManager(), runStore: runs,
        store: new MemoryAnalysisStore(), checkpointStore: new MemoryCheckpointStore(), recoveryScanLimit: 1 });
    await assert.rejects(collector.init(), (error) => error.code === 'ANALYSIS_RECOVERY_LIMIT');
    assert.equal(collector.processManager.requests.length, 0);
    assert.equal((await runs.get('one')).status, 'queued');
    assert.equal((await runs.get('two')).status, 'queued'); await collector.stop();
});

test('restart executes the already reserved last retry without charging its budget twice', async (t) => {
    const runs = new MemoryAnalysisRunStore();
    await runs.begin({ run_id: 'reserved-run', job_id: 'reserved-job', request_id: 'old-attempt',
        conversation_id: 'R', mode: 'backfill', read_intent: request('reserved-job', 'R'),
        recovery_schema_version: 1, priority: 'background', enqueue_sequence: 2,
        deadline: Date.now() + 5000, retry_budget: 1 });
    await runs.update('reserved-run', { status: 'retry_wait', retry_count: 1 });
    const manager = new ControlledManager(); const collector = memoryCollector(manager, runs);
    t.after(() => collector.stop()); await collector.init();
    await until(() => manager.requests.length === 1);
    assert.equal((await runs.get('reserved-run')).retry_count, 1);
    assert.notEqual(manager.requests[0].request_id, 'old-attempt');
    manager.finish(); await until(async () => (await runs.get('reserved-run')).status === 'completed');
});

test('interactive intent does not preempt an accepted complete during checkpoint persistence', async (t) => {
    const manager = new ControlledManager();
    let releaseCommit;
    let committing = false;
    const scope = { conversationId: 'A', sourceId: 'source', sourceEpoch: 'epoch' };
    const importer = { init: async () => {}, importBatch: async () => ({ scope, accepted: true, persisted: true }),
        commitComplete: async () => {
            committing = true;
            await new Promise((resolve) => { releaseCommit = resolve; });
        } };
    const ordinaryRequest = manager.request.bind(manager);
    manager.request = async (value, options) => {
        if (value.conversation_id !== 'A') return ordinaryRequest(value, options);
        manager.requests.push(value);
        const batch = { job_id: value.job_id, request_id: value.request_id, segment_id: 'S', batch_id: 'B',
            payload: { conversation_id: value.conversation_id } };
        await options.onBatch(batch);
        await options.onComplete({ checkpoint: {}, status: 'completed', completeness: 'canonical' }, { acceptedDelivery: batch });
        return { status: 'completed', completeness: 'canonical' };
    };
    const collector = new CodexRolloutCollector({ processManager: manager, importer,
        store: new MemoryAnalysisStore(), checkpointStore: new MemoryCheckpointStore(), runStore: new MemoryAnalysisRunStore() });
    t.after(() => collector.stop());
    const first = collector.analyze(request('A', 'A'));
    await until(() => committing);
    const next = collector.analyze(request('B', 'B', 'interactive'));
    await tick(); assert.equal(manager.cancels.length, 0); assert.equal(manager.requests.length, 1);
    releaseCommit(); await first;
    await until(() => manager.requests.length === 2); manager.finish(); await next;
});

test('one attempt accepts multiple batches and clears only its recovered delivery expectation', async (t) => {
    for (const recovery of [null, { segment_id: 'S1', batch_id: 'B1' }]) {
        const manager = new ControlledManager();
        const expected = [];
        const scope = { conversationId: 'A', sourceId: 'source', sourceEpoch: 'epoch' };
        const importer = { init: async () => {}, importBatch: async (batch, options) => {
            expected.push(options.recoveryDelivery || null);
            return { accepted: true, persisted: true, scope,
                delivery: { job_id: batch.job_id, segment_id: batch.segment_id, batch_id: batch.batch_id } };
        } };
        manager.request = async (value, options) => {
            for (let count = 1; count <= 2; count += 1) await options.onBatch({
                request_id: value.request_id, job_id: value.job_id, segment_id: `S${count}`, batch_id: `B${count}`,
                payload: { conversation_id: value.conversation_id }
            });
            return { status: 'completed', completeness: 'canonical' };
        };
        const collector = new CodexRolloutCollector({ processManager: manager, importer,
            store: new MemoryAnalysisStore(), checkpointStore: new MemoryCheckpointStore(), runStore: new MemoryAnalysisRunStore() });
        t.after(() => collector.stop());
        await collector.analyze({ ...request('A', 'A'), recovery });
        assert.deepEqual(expected, [recovery, null]);
    }
});

test('a recovered queue snapshot never replaces a newer live intent arriving during init', async (t) => {
    const runs = new MemoryAnalysisRunStore();
    await runs.enqueue({ run_id: 'old-B', job_id: 'old-B', request_id: 'old-B', conversation_id: 'B', mode: 'backfill',
        read_intent: request('old-B', 'B'), recovery_schema_version: 1, priority: 'background',
        enqueue_sequence: 7, deadline: Date.now() + 5000, retry_budget: 1 });
    const list = runs.listRecoverable.bind(runs);
    let release;
    runs.listRecoverable = async (options) => {
        const snapshot = await list(options);
        await new Promise((resolve) => { release = resolve; });
        return snapshot;
    };
    const manager = new ControlledManager(); const collector = memoryCollector(manager, runs);
    t.after(() => collector.stop());
    const a = collector.analyze(request('A', 'A'));
    await until(() => Boolean(release));
    const b = collector.analyze(request('new-B', 'B'));
    release(); await until(() => manager.requests.length === 1);
    manager.finish(); await a;
    await until(() => manager.requests.length === 2);
    assert.equal(manager.requests[1].job_id, 'new-B'); manager.finish(); await b;
    assert.equal((await runs.get('old-B')).status, 'failed');
});

test('terminal run history does not exhaust the bounded pending recovery capacity', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'collector-recovery-history-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    for (const runs of [new MemoryAnalysisRunStore(), new FileAnalysisRunStore({ rootDir: root })]) {
        await runs.init?.();
        const count = runs instanceof MemoryAnalysisRunStore ? 1002 : 5;
        for (let index = 0; index < count; index += 1) {
            const id = `terminal-${index}`;
            await runs.begin({ run_id: id, conversation_id: id, mode: 'preview' });
            await runs.complete(id);
        }
        await runs.enqueue({ run_id: 'pending', conversation_id: 'pending', mode: 'preview' });
        const recoverable = await runs.listRecoverable({ limit: 1 });
        assert.equal(recoverable.length, 1);
        assert.equal(recoverable[0].run_id, 'pending');
        assert.equal((await runs.get('terminal-0')).status, 'completed');
    }
});
