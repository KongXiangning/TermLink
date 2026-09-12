'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
    CodexRolloutCollector,
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore,
    FileCheckpointStore,
    FileAnalysisRunStore
} = require('../src/services/codexRolloutCollector');
const { createAnalyzeRequest } = require('../src/services/codexRolloutCollector/analyzerProtocol');
const { normalizeScope } = require('../src/services/codexRolloutCollector/analysisBatchImporter');
const { nativeRoot, resolveRustTargetBinary } = require('./fixtures/codex-rollout-collector/rust-target');

const conversationId = '019b2b40-beb6-7b23-bed0-37d570e76816';

async function normalizedSnapshot(store, scope) {
    const snapshot = await store.snapshot(scope);
    // File-store rollback normalizes the accepted camel/snake scope aliases.
    if (snapshot.last_delivery?.scope) {
        snapshot.last_delivery.scope = normalizeScope(snapshot.last_delivery.scope);
    }
    return snapshot;
}

async function createRustCollector(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'termlink-rich-target-'));
    let collector;
    t.after(async () => {
        await collector?.stop();
        await fs.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    const sessionDirectory = path.join(codexHome, 'sessions', '2026', '08', '18');
    await fs.mkdir(sessionDirectory, { recursive: true });
    await fs.copyFile(
        path.join(nativeRoot, 'tests/fixtures/current/minimal-rollout.jsonl'),
        path.join(sessionDirectory, `rollout-2026-08-18T10-00-00-${conversationId}.jsonl`)
    );
    const storeRoot = path.join(root, 'analysis');
    collector = new CodexRolloutCollector({
        analyzerPath: await resolveRustTargetBinary(),
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        store: new FileAnalysisStore({ rootDir: storeRoot }),
        checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }),
        runStore: new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') }),
        requestTimeoutMs: 10000,
        processRestartRetries: 0
    });
    return { collector, storeRoot };
}

test('real Rust target durably imports tools, usage, outcomes and unknown diagnostics', async (t) => {
    const { collector, storeRoot } = await createRustCollector(t);
    const messages = [];
    collector.processManager.on('message', (message) => messages.push(message));
    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'rich-target-request',
        jobId: 'rich-target-job',
        conversationId,
        mode: 'backfill'
    }));
    assert.equal(result.complete.status, 'partial');
    assert.equal(result.complete.completeness, 'partial');
    assert.ok(result.state.tool_details.length > 0);
    assert.ok(result.state.usage);
    assert.equal(result.state.usage.total_tokens, 120);
    assert.equal(result.state.usage.last_total_tokens, 70);
    assert.ok(result.state.task_outcomes.length > 0);
    const batch = messages.find((message) => message.message_type === 'batch');
    const payload = batch.payload;
    const toolEvents = result.state.items.filter((entry) => entry.item_key === 'tool:call-1');
    assert.deepEqual(toolEvents.map((entry) => entry.event.event_type), ['ToolStarted', 'ToolCompleted']);
    assert.notEqual(toolEvents[0].event_id, toolEvents[1].event_id);
    assert.ok(payload.diagnostics.some((entry) => entry.code === 'unknown_event'));
    const kinds = new Set(payload.mutations.map((entry) => entry.mutation));
    for (const kind of ['upsert_item', 'upsert_detail', 'upsert_usage', 'upsert_outcome', 'mark_partial']) {
        assert.ok(kinds.has(kind), `Rust must derive ${kind}`);
    }
    assert.equal(kinds.has('complete_range'), false);
    const checkpoint = await collector.checkpointStore.load(result.scope);
    assert.equal(checkpoint.request_id, 'rich-target-request');
    assert.equal(checkpoint.job_id, 'rich-target-job');
    assert.equal(checkpoint.completeness, 'partial');
    assert.equal(checkpoint.reducer_state.reducer_id, 'termlink.analysis_reducer');

    await collector.stop();
    const reopened = new FileAnalysisStore({ rootDir: storeRoot });
    await reopened.init();
    const durable = await reopened.snapshot(result.scope);
    assert.deepEqual(durable.items, result.state.items);
    assert.deepEqual(durable.tool_details, result.state.tool_details);
    assert.deepEqual(durable.usage, result.state.usage);
    assert.deepEqual(durable.task_outcomes, result.state.task_outcomes);
    assert.equal(durable.receipts.length, result.state.receipts.length);

    // The same physical event is idempotent; a changed event under that identity
    // remains a conflict, even though distinct events may share a logical key.
    for (const store of [new MemoryAnalysisStore(), reopened]) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        await importer.importBatch(batch);
        const overlap = structuredClone(batch);
        overlap.job_id = 'rich-overlap-job';
        overlap.request_id = 'rich-overlap-request';
        overlap.payload.history_items.push(structuredClone(payload.history_items[0]));
        await importer.importBatch(overlap);
        const before = await normalizedSnapshot(store, result.scope);
        assert.equal(before.items.length, result.state.items.length);

        const conflict = structuredClone(batch);
        conflict.job_id = 'rich-conflict-job';
        conflict.request_id = 'rich-conflict-request';
        const toolStarted = conflict.payload.history_items.find((event) => event.event_type === 'ToolStarted');
        toolStarted.payload.input = 'conflicting input';
        await assert.rejects(() => importer.importBatch(conflict),
            (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT');
        assert.deepEqual(await normalizedSnapshot(store, result.scope), before);

        const withinBatch = structuredClone(batch);
        withinBatch.job_id = 'rich-internal-conflict-job';
        withinBatch.request_id = 'rich-internal-conflict-request';
        withinBatch.payload.history_items.push(toolStarted);
        await assert.rejects(() => importer.importBatch(withinBatch),
            (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT');
        assert.deepEqual(await normalizedSnapshot(store, result.scope), before);
    }
});

test('real Rust target enforces a zero resource timeout and remains usable for the next job', async (t) => {
    const { collector } = await createRustCollector(t);
    const messages = [];
    collector.processManager.on('message', (message) => messages.push(message));
    await assert.rejects(
        collector.analyze(createAnalyzeRequest({
            requestId: 'zero-budget-request',
            jobId: 'zero-budget-job',
            conversationId,
            mode: 'backfill',
            resourceLimits: { timeout_ms: 0 }
        })),
        (error) => error.code === 'resource_timeout'
    );
    assert.equal(messages.some((message) => ['batch', 'complete'].includes(message.message_type)), false);
    const failure = messages.find((message) => message.message_type === 'error');
    assert.equal(failure.request_id, 'zero-budget-request');
    assert.equal(failure.fatal, false);
    const generation = collector.processManager.generation;
    const next = await collector.analyze(createAnalyzeRequest({
        requestId: 'after-zero-budget-request',
        jobId: 'after-zero-budget-job',
        conversationId,
        mode: 'backfill'
    }));
    assert.equal(next.complete.status, 'partial');
    assert.equal(collector.processManager.generation, generation);
});

test('real Rust accepts consecutive new jobs for the same conversation and persisted source', async (t) => {
    const { collector } = await createRustCollector(t);
    const first = await collector.analyze(createAnalyzeRequest({
        requestId: 'first-read-attempt', jobId: 'first-read-job', conversationId, mode: 'backfill'
    }));
    const anchor = await collector.checkpointStore.load(first.scope);
    const second = await collector.analyze(createAnalyzeRequest({
        requestId: 'next-read-attempt', jobId: 'next-read-job', conversationId, mode: 'backfill',
        cursor: anchor.cursor, persistedAnchor: anchor
    }));
    assert.equal(second.complete.job_id, 'next-read-job');
    assert.deepEqual(second.scope, first.scope);
    assert.equal(second.state.items.length, first.state.items.length);
    assert.equal(second.state.receipts.length, first.state.receipts.length + 1);
    assert.equal((await collector.runStore.get('next-read-attempt')).status, 'completed');
});
