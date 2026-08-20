'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    PROTOCOL_VERSION,
    AnalyzerProtocolError,
    parseLine,
    encodeMessage,
    createAnalyzeRequest
} = require('../src/services/codexRolloutCollector/analyzerProtocol');
const {
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore
} = require('../src/services/codexRolloutCollector/analysisBatchImporter');
const {
    FileCheckpointStore,
    MemoryCheckpointStore
} = require('../src/services/codexRolloutCollector/analysisCheckpointStore');
const {
    FileAnalysisRunStore,
    MemoryAnalysisRunStore
} = require('../src/services/codexRolloutCollector/analysisRunStore');
const { CodexRolloutCollector } = require('../src/services/codexRolloutCollector');

function batch({ requestId = 'request-1', batchId = 'batch-1', completeness = 'partial', replacePrevious = false, text = 'one' } = {}) {
    const canonical = completeness === 'canonical';
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'batch',
        request_id: requestId,
        batch_id: batchId,
        conversation_id: 'conversation-1',
        source_id: 'rollout.jsonl',
        source_epoch: 'epoch-1',
        replace_previous: replacePrevious,
        source_range: { start: 0, end: 10 },
        history_items: [{
            event_type: 'UserMessage',
            item_key: 'item-1',
            event_id: `event-${batchId}`,
            payload: { metadata: { item_key: 'item-1', event_id: `event-${batchId}` }, text }
        }],
        diagnostics: [],
        parser_provenance: { parser_backend: 'test', compatibility_layer_version: 'test' },
        complete: canonical,
        completeness,
        projection: {
            schema: 'test-projection',
            schema_version: 1,
            conversation_id: 'conversation-1',
            complete: canonical,
            provisional: !canonical,
            availability: 'present',
            turns: [],
            diagnostics: [],
            usage_total: null
        },
        tool_details: [],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        task_outcomes: [],
        progress: { records_seen: 1, records_emitted: 1, bytes_scanned: 10, has_more: !canonical },
        next_cursor: null,
        mutations: canonical
            ? [{ mutation: 'complete_range', source_range: { start: 0, end: 10 } }]
            : [{ mutation: 'mark_partial', source_range: { start: 0, end: 10 } }]
    };
}

function checkpoint(completeness = 'canonical') {
    return {
        schema_version: 1,
        request_id: 'request-1',
        conversation_id: 'conversation-1',
        source: { source_id: 'rollout.jsonl', source_epoch: 'epoch-1' },
        reader: { backend: 'test', version: '1', source_kind: 'rollout', compression: 'plain_jsonl' },
        segment: {},
        completeness
    };
}

test('analyzer protocol is flat JSONL and ignores additive fields', () => {
    const request = createAnalyzeRequest({
        requestId: 'request-1',
        conversationId: 'conversation-1',
        sourceSpec: { path: 'rollout.jsonl', source_id: 'rollout.jsonl', source_epoch: 'epoch-1' },
        mode: 'replay',
        future_field: { accepted: true }
    });
    const parsed = parseLine(encodeMessage(request));
    assert.equal(parsed.message_type, 'analyze');
    assert.deepEqual(parsed.future_field, { accepted: true });
    assert.throws(
        () => parseLine('{"protocol_version":1,"message_type":"batch"}'),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
    assert.throws(
        () => parseLine('{not-json'),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'malformed_protocol'
    );
});

test('importer deduplicates overlap and promotes provisional data before checkpoint commit', async () => {
    const store = new MemoryAnalysisStore();
    const order = [];
    const checkpointStore = {
        async save(scope, value) {
            assert.equal(store.operations.at(-1)?.[0], 'apply');
            order.push(['checkpoint', scope, value.completeness]);
        }
    };
    const importer = await new AnalysisBatchImporter({ store, checkpointStore }).init();

    const partial = await importer.importBatch(batch({ batchId: 'tail-1', completeness: 'provisional' }), {
        checkpoint: checkpoint('provisional')
    });
    await importer.importBatch(batch({ batchId: 'tail-1', completeness: 'provisional' }), {
        checkpoint: checkpoint('provisional')
    });
    const canonical = await importer.importBatch(batch({
        batchId: 'backfill-1',
        completeness: 'canonical',
        text: 'canonical'
    }), { checkpoint: checkpoint('canonical') });

    assert.equal(partial.state.provisional, true);
    assert.equal(canonical.state.canonical, true);
    assert.equal(canonical.state.complete, true);
    assert.equal(canonical.state.provisional, false);
    assert.equal(canonical.state.batches.length, 2);
    assert.equal(canonical.state.items.length, 1);
    assert.equal(canonical.state.items[0].completeness, 'canonical');
    assert.equal(canonical.state.items[0].event.payload.text, 'canonical');
    assert.equal(order.filter((entry) => entry[0] === 'checkpoint').length, 3);
});

test('importer never downgrades a canonical projection on a late incomplete overlap', async () => {
    const importer = await new AnalysisBatchImporter({ store: new MemoryAnalysisStore() }).init();
    const canonical = await importer.importBatch(batch({ batchId: 'canonical-1', completeness: 'canonical' }));
    const stale = await importer.importBatch(batch({ batchId: 'late-tail-1', completeness: 'partial', text: 'stale' }));
    assert.equal(canonical.state.canonical, true);
    assert.equal(stale.state.canonical, true);
    assert.equal(stale.state.complete, true);
    assert.equal(stale.state.provisional, false);
    assert.equal(stale.state.projection.complete, true);
    assert.equal(stale.state.projection.provisional, false);
    assert.equal(stale.state.items[0].event.payload.text, 'one');
});

test('file checkpoint store replaces one validated scope atomically', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-checkpoint-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const store = await new FileCheckpointStore({ rootDir: root }).init();
    const scope = { conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1' };
    await store.save(scope, checkpoint('provisional'));
    await store.save(scope, checkpoint('canonical'));
    assert.equal((await store.load(scope)).completeness, 'canonical');
    assert.equal((await fs.promises.readdir(root)).filter((name) => name.endsWith('.json')).length, 1);
});

test('collector starts an isolated analyzer process, ACKs imported batches, and persists completion checkpoint', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-collector-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const runStore = new MemoryAnalysisRunStore({ now: () => 123 });
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        store,
        checkpointStore,
        runStore,
        requestTimeoutMs: 5000
    });
    const request = createAnalyzeRequest({
        requestId: 'request-1',
        conversationId: 'conversation-1',
        sourceSpec: { path: 'rollout.jsonl', source_id: 'rollout.jsonl', source_epoch: 'epoch-1' },
        mode: 'replay'
    });
    const result = await collector.analyze(request);
    assert.equal(result.complete.status, 'completed');
    assert.equal(result.complete.completeness, 'canonical');
    assert.equal(result.state.canonical, true);
    assert.equal(result.state.items.length, 1);
    assert.equal((await checkpointStore.load({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    })).completeness, 'canonical');
    assert.equal((await runStore.get('request-1')).status, 'completed');
});

test('collector timeout sends cancel and rejects the request without hanging the process', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-timeout-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore(),
        requestTimeoutMs: 100
    });
    const request = createAnalyzeRequest({
        requestId: 'request-timeout',
        conversationId: 'conversation-1',
        sourceSpec: { path: 'rollout.jsonl', source_id: 'rollout.jsonl', source_epoch: 'epoch-1' },
        mode: 'stall'
    });
    await assert.rejects(
        () => collector.analyze(request, { timeoutMs: 100 }),
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
    );
});

test('collector can restart against file stores without duplicating the persisted batch', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-restart-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const createCollector = () => new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        store: new FileAnalysisStore({ rootDir: path.join(root, 'analysis') }),
        checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }),
        runStore: new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') }),
        requestTimeoutMs: 5000
    });
    const request = createAnalyzeRequest({
        requestId: 'request-restart',
        conversationId: 'conversation-1',
        sourceSpec: { path: 'rollout.jsonl', source_id: 'rollout.jsonl', source_epoch: 'epoch-1' },
        mode: 'replay'
    });

    collector = createCollector();
    await collector.analyze(request);
    await collector.stop();
    collector = createCollector();
    const resumed = await collector.analyze(request);
    assert.equal(resumed.state.batches.length, 1);
    assert.equal(resumed.state.items.length, 1);
    assert.equal(resumed.state.canonical, true);
    assert.equal((await collector.runStore.get('request-restart')).status, 'completed');
});
