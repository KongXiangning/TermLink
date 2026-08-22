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
    createAnalyzeRequest,
    createHello,
    validateMessage
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
const {
    CodexRolloutCollector,
    requestScope,
    ensureReplayLineageRecovery
} = require('../src/services/codexRolloutCollector');

function batch({ requestId = 'request-1', batchId = 'batch-1', completeness = 'partial', replacePrevious = false, text = 'one', sourceEpoch = 'epoch-1', itemKey = 'item-1', sourceId = 'rollout.jsonl', conversationId = 'conversation-1' } = {}) {
    const canonical = completeness === 'canonical';
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'batch',
        request_id: requestId,
        batch_id: batchId,
        conversation_id: conversationId,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        replace_previous: replacePrevious,
        source_range: { start: 0, end: 10 },
        history_items: [{
            event_type: 'UserMessage',
            item_key: itemKey,
            event_id: `event-${batchId}`,
            payload: { metadata: { item_key: itemKey, event_id: `event-${batchId}` }, text }
        }],
        diagnostics: [],
        parser_provenance: {
            parser_backend: 'test',
            wire_source_revision: 'test',
            compatibility_profile: 'current'
        },
        complete: canonical,
        completeness,
        projection: {
            schema: 'test-projection',
            schema_version: 1,
            conversation_id: conversationId,
            complete: canonical,
            provisional: !canonical,
            coverage: canonical ? 'complete' : (completeness === 'unknown' ? 'unknown' : 'partial'),
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
        source_fingerprint: {
            algorithm: 'sha256-v1',
            digest: `source-${batchId}`,
            covered_bytes: 10
        },
        source_prefix_anchor: {
            algorithm: 'sha256-v1',
            digest: `prefix-${batchId}`,
            end_offset: 10
        },
        reducer_state: { schema_version: 1, adapter: {}, reducer: {} },
        mutations: canonical
            ? [{ mutation: 'complete_range', source_range: { start: 0, end: 10 } }]
            : [{ mutation: 'mark_partial', source_range: { start: 0, end: 10 } }]
    };
}

function replacement({
    conversationId = 'conversation-1',
    parentRolloutId = 'parent-rollout',
    childRolloutId = 'child-rollout',
    replacedTurnId = 'old-turn',
    replacementTurnId = 'new-turn',
    terminalStatus = 'interrupted',
    cutOrdinal = 14,
    cutByte = 179138
} = {}) {
    return {
        replacement_key: [
            'replacement',
            conversationId,
            parentRolloutId,
            childRolloutId,
            replacedTurnId,
            replacementTurnId
        ].join(':'),
        conversation_id: conversationId,
        parent_rollout_id: parentRolloutId,
        child_rollout_id: childRolloutId,
        replaced_turn_id: replacedTurnId,
        replacement_turn_id: replacementTurnId,
        replaced_turn_terminal_status: terminalStatus,
        cut: {
            parent_rollout_id: parentRolloutId,
            end_ordinal_exclusive: cutOrdinal,
            end_byte_offset: cutByte
        },
        parent_turn_start_source_ref: {
            source_identity: parentRolloutId,
            byte_start: cutByte,
            byte_end: cutByte + 10,
            physical_line_ordinal: 14,
            rollout_ordinal: cutOrdinal
        },
        parent_turn_terminal_source_ref: {
            source_identity: parentRolloutId,
            byte_start: cutByte + 100,
            byte_end: cutByte + 110,
            physical_line_ordinal: 20,
            rollout_ordinal: cutOrdinal + 6
        },
        child_turn_start_source_ref: {
            source_identity: childRolloutId,
            byte_start: 200,
            byte_end: 210,
            physical_line_ordinal: 2,
            rollout_ordinal: cutOrdinal + 2
        }
    };
}

function shiftReplacementCut(fact, delta = 1) {
    fact.cut.end_byte_offset += delta;
    fact.parent_turn_start_source_ref.byte_start += delta;
}

function checkpoint(completeness = 'canonical', sourceEpoch = 'epoch-1', requestId = 'request-1') {
    return {
        schema_version: 1,
        request_id: requestId,
        conversation_id: 'conversation-1',
        source: {
            source_id: 'rollout.jsonl',
            source_epoch: sourceEpoch,
            fingerprint: { algorithm: 'sha256-v1', digest: 'checkpoint-source', covered_bytes: 10 },
            prefix_anchor: { algorithm: 'sha256-v1', digest: 'checkpoint-prefix', end_offset: 10 }
        },
        reader: { backend: 'test', version: '1', source_kind: 'rollout', compression: 'plain_jsonl' },
        wire_profile: {
            parser_backend: 'test',
            wire_source_revision: 'test',
            compatibility_profile: 'current'
        },
        cursor_kind: null,
        cursor: null,
        segment: { source_range: { start: 0, end: 10 } },
        reducer_state: { schema_version: 1, adapter: {}, reducer: {} },
        projection_watermark: 'checkpoint-batch',
        completeness
    };
}

function upsertItemMutation({
    itemKey = 'item-1',
    sourceEpoch = 'epoch-1',
    completeness = 'canonical',
    revision = 1,
    byteStart = 0,
    byteEnd = 10
} = {}) {
    return {
        mutation: 'upsert_item',
        item: {
            item_key: itemKey,
            content_hash: `item-content-${revision}`,
            source_epoch: sourceEpoch,
            completeness,
            revision,
            source_ref: {
                source_identity: 'rollout.jsonl',
                byte_start: byteStart,
                byte_end: byteEnd,
                physical_line_ordinal: 1,
                rollout_ordinal: null
            }
        }
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

test('replay requests opt into cold lineage recovery when the service has no checkpoint', () => {
    const request = createAnalyzeRequest({
        requestId: 'restart-lineage-request',
        conversationId: 'conversation-1',
        sourceSpec: {
            path: 'rollout-child.jsonl',
            source_id: 'rollout-child',
            source_epoch: 'restart-epoch-1'
        },
        mode: 'replay'
    });
    const recovered = ensureReplayLineageRecovery(request);
    assert.deepEqual(recovered.lineage, {});

    const explicit = ensureReplayLineageRecovery({
        ...request,
        lineage: {
            catalog_root: 'C:/codex/sessions/2026/08/22',
            max_depth: 4
        }
    });
    assert.deepEqual(explicit.lineage, {
        catalog_root: 'C:/codex/sessions/2026/08/22',
        max_depth: 4
    });
    assert.equal(
        ensureReplayLineageRecovery({ ...request, lineage: null }).lineage,
        null
    );
});

test('last-turn replacement is capability-advertised, validated, and idempotently imported', async () => {
    const childBatch = batch({
        batchId: 'replacement-batch',
        completeness: 'canonical',
        sourceId: 'child-rollout'
    });
    const fact = replacement();
    childBatch.history_base = fact.cut;
    childBatch.replacements = [fact];
    childBatch.mutations.push({ mutation: 'replace_last_turn', replacement: fact });

    const hello = createHello('hello-replacement');
    assert.ok(hello.capabilities.includes('last_turn_replacement_v1'));
    assert.equal(validateMessage(childBatch), childBatch);
    assert.equal(parseLine(encodeMessage(childBatch)).replacements[0].replacement_key, fact.replacement_key);

    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    await importer.importBatch(childBatch);
    await importer.importBatch(childBatch);
    let state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.replacements.length, 1);
    assert.equal(state.replacements[0].replacement_key, fact.replacement_key);

    const conflicting = structuredClone(childBatch);
    conflicting.batch_id = 'replacement-conflict';
    shiftReplacementCut(conflicting.replacements[0]);
    shiftReplacementCut(conflicting.mutations[conflicting.mutations.length - 1].replacement);
    await assert.rejects(
        () => importer.importBatch(conflicting),
        (error) => error.code === 'ANALYSIS_REPLACEMENT_CONFLICT'
    );
    state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.replacements.length, 1);
    assert.equal(state.replacements[0].cut.end_byte_offset, 179138);
});

test('replacement evidence binds source identities, cut positions, and child history base', () => {
    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const valid = batch({
        batchId: 'replacement-evidence-valid',
        completeness: 'canonical',
        sourceId: 'child-rollout'
    });
    valid.history_base = structuredClone(fact.cut);
    valid.replacements = [fact];
    valid.mutations.push({ mutation: 'replace_last_turn', replacement: structuredClone(fact) });
    assert.equal(validateMessage(valid), valid);

    const invalidCases = [
        {
            name: 'parent start source identity',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.source_identity = 'other-parent'; }
        },
        {
            name: 'parent terminal source identity',
            mutate: (_message, value) => { value.parent_turn_terminal_source_ref.source_identity = 'other-parent'; }
        },
        {
            name: 'child start source identity',
            mutate: (_message, value) => { value.child_turn_start_source_ref.source_identity = 'other-child'; }
        },
        {
            name: 'cut byte position',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.byte_start += 1; }
        },
        {
            name: 'cut ordinal position',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.rollout_ordinal += 1; }
        },
        {
            name: 'parent terminal ordering',
            mutate: (_message, value) => {
                value.parent_turn_terminal_source_ref.byte_start = value.cut.end_byte_offset - 1;
            }
        },
        {
            name: 'current child history base',
            mutate: (message) => { message.history_base.end_byte_offset += 1; }
        }
    ];

    for (const { name, mutate } of invalidCases) {
        for (const mutationOnly of [false, true]) {
            const invalid = structuredClone(valid);
            if (mutationOnly) invalid.replacements = [];
            const value = mutationOnly
                ? invalid.mutations[invalid.mutations.length - 1].replacement
                : invalid.replacements[0];
            mutate(invalid, value);
            assert.throws(
                () => validateMessage(invalid),
                (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field',
                `${name} must fail closed (${mutationOnly ? 'mutation' : 'top-level'})`
            );
        }
    }
});

test('replacement evidence conflicts are rejected before Memory/File state mutation', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-replacement-conflict-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const original = batch({
        batchId: 'replacement-conflict-original',
        completeness: 'canonical',
        sourceId: 'child-rollout'
    });
    original.history_base = fact.cut;
    original.replacements = [fact];
    original.mutations.push({ mutation: 'replace_last_turn', replacement: fact });

    const conflicting = structuredClone(original);
    conflicting.batch_id = 'replacement-conflict-different-evidence';
    conflicting.history_items[0].payload.text = 'mutated item must not persist';
    conflicting.source_range.end = 20;
    conflicting.progress.bytes_scanned = 20;
    conflicting.mutations[0].source_range.end = 20;
    shiftReplacementCut(conflicting.replacements[0]);
    shiftReplacementCut(conflicting.mutations[conflicting.mutations.length - 1].replacement);

    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    for (const store of stores) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        await importer.importBatch(original);
        const scope = {
            conversationId: 'conversation-1',
            sourceId: 'child-rollout',
            sourceEpoch: 'epoch-1'
        };
        const before = await store.snapshot(scope);
        const operationsBefore = structuredClone(store.operations);

        await assert.rejects(
            () => importer.importBatch(conflicting),
            (error) => error.code === 'ANALYSIS_REPLACEMENT_CONFLICT'
        );

        assert.deepEqual(await store.snapshot(scope), before);
        assert.deepEqual(store.operations, operationsBefore);
    }

    const restartedStore = await new FileAnalysisStore({ rootDir: root }).init();
    assert.deepEqual(await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'epoch-1'
    }), await stores[1].snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'epoch-1'
    }));
});

test('partial and provisional top-level replacements fail closed before import', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-noncanonical-replacement-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    for (const completeness of ['partial', 'provisional']) {
        const fact = replacement({
            parentRolloutId: 'parent-rollout',
            childRolloutId: 'child-rollout'
        });
        const invalid = batch({
            batchId: `noncanonical-replacement-${completeness}`,
            completeness,
            sourceId: 'child-rollout'
        });
        invalid.history_base = fact.cut;
        invalid.replacements = [fact];

        const stores = [
            new MemoryAnalysisStore(),
            await new FileAnalysisStore({ rootDir: root }).init()
        ];
        for (const store of stores) {
            const importer = await new AnalysisBatchImporter({ store }).init();
            const scope = {
                conversationId: 'conversation-1',
                sourceId: 'child-rollout',
                sourceEpoch: 'epoch-1'
            };
            const before = await store.snapshot(scope);
            const operationsBefore = structuredClone(store.operations);

            assert.throws(
                () => validateMessage(invalid),
                (error) => error instanceof AnalyzerProtocolError
                    && error.code === 'invalid_field'
                    && error.details?.field === 'replacements'
            );
            await assert.rejects(
                () => importer.importBatch(invalid),
                (error) => error instanceof AnalyzerProtocolError
                    && error.code === 'invalid_field'
            );

            assert.deepEqual(await store.snapshot(scope), before);
            assert.deepEqual(store.operations, operationsBefore);
        }
    }
});

test('replacement evidence can be staged while projection coverage is partial', async () => {
    const importer = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout',
        replacedTurnId: 'old-turn',
        replacementTurnId: 'new-turn'
    });
    const parentBatch = batch({
        batchId: 'coverage-parent',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch',
        itemKey: 'old-item',
        completeness: 'canonical'
    });
    const stagedBatch = batch({
        requestId: 'coverage-child-request',
        batchId: 'coverage-child-staged',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch',
        itemKey: 'new-item',
        completeness: 'canonical',
        text: 'edited turn'
    });
    stagedBatch.history_base = structuredClone(fact.cut);
    stagedBatch.replacements = [fact];
    stagedBatch.projection.coverage = 'partial';
    stagedBatch.projection.complete = false;
    stagedBatch.projection.provisional = false;

    assert.equal(validateMessage(stagedBatch), stagedBatch);
    const invalidMutation = structuredClone(stagedBatch);
    invalidMutation.mutations.push({
        mutation: 'replace_last_turn',
        replacement: structuredClone(fact)
    });
    assert.throws(
        () => validateMessage(invalidMutation),
        (error) => error instanceof AnalyzerProtocolError
            && error.details?.field === 'mutations[1].mutation'
    );
    await importer.importBatch(parentBatch);
    const staged = await importer.importBatch(stagedBatch);
    assert.equal(staged.state.pending_replacement, true);
    assert.equal(staged.state.active_head, false);
    assert.equal(staged.state.canonical, false);
    assert.equal(staged.state.complete, false);
    assert.equal(staged.state.projection_coverage, 'partial');
    assert.equal(staged.state.replacements.length, 1);

    const parent = await importer.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch'
    });
    assert.equal(parent.active_head, true);

    const committedBatch = structuredClone(stagedBatch);
    committedBatch.batch_id = 'coverage-child-committed';
    committedBatch.projection.coverage = 'complete';
    committedBatch.projection.complete = true;
    committedBatch.mutations = [
        { mutation: 'complete_range', source_range: { start: 0, end: 10 } },
        { mutation: 'replace_last_turn', replacement: structuredClone(fact) }
    ];
    assert.equal(validateMessage(committedBatch), committedBatch);
    const committed = await importer.importBatch(committedBatch);
    assert.equal(committed.state.pending_replacement, false);
    assert.equal(committed.state.active_head, true);
    assert.equal(committed.state.canonical, true);
    assert.equal(committed.state.complete, true);
    assert.equal(committed.state.projection_coverage, 'complete');
    assert.equal(committed.state.replacements.length, 1);

    const committedParent = await importer.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch'
    });
    assert.equal(committedParent.active_head, false);
});

test('online last-turn replacement retains the parent history and commits the child head', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-last-turn-transition-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const parentBatch = batch({
        requestId: 'parent-request',
        batchId: 'parent-batch',
        completeness: 'canonical',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch',
        itemKey: 'old-item',
        text: 'old turn'
    });
    const childBatch = batch({
        requestId: 'child-request',
        batchId: 'child-batch',
        completeness: 'canonical',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch',
        itemKey: 'new-item',
        text: 'edited turn'
    });
    childBatch.history_base = fact.cut;
    childBatch.replacements = [fact];
    childBatch.mutations.push({ mutation: 'replace_last_turn', replacement: fact });

    const complete = {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: 'child-request',
        status: 'completed',
        completeness: 'canonical',
        next_cursor: null,
        checkpoint: checkpoint('canonical', 'child-epoch', 'child-request')
    };
    complete.checkpoint.source.source_id = 'child-rollout';

    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    for (const store of stores) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        await importer.importBatch(parentBatch);
        await importer.importBatch(childBatch);
        const child = await importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'child-rollout',
                sourceEpoch: 'child-epoch'
            }
        });
        const parent = await store.snapshot({
            conversationId: 'conversation-1',
            sourceId: 'parent-rollout',
            sourceEpoch: 'parent-epoch'
        });

        assert.equal(parent.retired, false);
        assert.equal(parent.active_head, false);
        assert.deepEqual(parent.items.map((item) => item.item_key), ['old-item']);
        assert.equal(child.active_head, true);
        assert.equal(child.complete, true);
        assert.deepEqual(child.items.map((item) => item.item_key), ['new-item']);
        assert.equal(child.replacements.length, 1);
        assert.equal(child.replacements[0].replacement_key, fact.replacement_key);
    }

    const restartedStore = await new FileAnalysisStore({ rootDir: root }).init();
    const restartedImporter = await new AnalysisBatchImporter({ store: restartedStore }).init();
    const duplicate = await restartedImporter.importBatch(childBatch);
    assert.equal(duplicate.duplicate, true);
    const restartedParent = await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch'
    });
    const restartedChild = await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    assert.equal(restartedParent.active_head, false);
    assert.deepEqual(restartedParent.items.map((item) => item.item_key), ['old-item']);
    assert.deepEqual(restartedChild.items.map((item) => item.item_key), ['new-item']);
    assert.equal(restartedChild.replacements.length, 1);
});

test('cold-start lineage replay restores the same child projection as warm parent replay', async () => {
    const factAB = replacement({
        parentRolloutId: 'rollout-a',
        childRolloutId: 'rollout-b',
        replacedTurnId: 'turn-a',
        replacementTurnId: 'turn-b',
        cutOrdinal: 2,
        cutByte: 20
    });
    const factBC = replacement({
        parentRolloutId: 'rollout-b',
        childRolloutId: 'rollout-c',
        replacedTurnId: 'turn-b',
        replacementTurnId: 'turn-c',
        cutOrdinal: 4,
        cutByte: 40
    });
    const parentBatch = batch({
        requestId: 'request-a',
        batchId: 'batch-a',
        completeness: 'canonical',
        sourceId: 'rollout-a',
        sourceEpoch: 'epoch-a',
        itemKey: 'item-a',
        text: 'turn a'
    });
    const middleBatch = batch({
        requestId: 'request-b',
        batchId: 'batch-b',
        completeness: 'canonical',
        sourceId: 'rollout-b',
        sourceEpoch: 'epoch-b',
        itemKey: 'item-b',
        text: 'turn b'
    });
    middleBatch.history_base = factAB.cut;
    middleBatch.replacements = [factAB];
    middleBatch.mutations.push({ mutation: 'replace_last_turn', replacement: factAB });

    const childBatch = batch({
        requestId: 'request-c',
        batchId: 'batch-c',
        completeness: 'canonical',
        sourceId: 'rollout-c',
        sourceEpoch: 'epoch-c',
        itemKey: 'item-c',
        text: 'turn c'
    });
    childBatch.history_base = factBC.cut;
    childBatch.history_items = [
        ...parentBatch.history_items,
        ...middleBatch.history_items,
        ...childBatch.history_items
    ];
    childBatch.replacements = [factAB, factBC];
    childBatch.mutations.push(
        { mutation: 'replace_last_turn', replacement: factAB },
        { mutation: 'replace_last_turn', replacement: factBC }
    );
    assert.equal(validateMessage(childBatch), childBatch);

    const coldImporter = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    await coldImporter.importBatch(childBatch);
    const coldState = await coldImporter.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout-c',
        sourceEpoch: 'epoch-c'
    });

    const warmImporter = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    await warmImporter.importBatch(parentBatch);
    await warmImporter.importBatch(middleBatch);
    await warmImporter.importBatch(childBatch);
    const warmState = await warmImporter.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout-c',
        sourceEpoch: 'epoch-c'
    });

    assert.deepEqual(coldState.items, warmState.items);
    assert.deepEqual(coldState.items.map((item) => item.item_key), [
        'item-a',
        'item-b',
        'item-c'
    ]);
    assert.deepEqual(coldState.replacements, warmState.replacements);
    assert.equal(coldState.replacements.length, 2);
});

test('malformed canonical batches fail closed before importer state changes', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();

    const missingProvenance = batch({ completeness: 'canonical' });
    delete missingProvenance.parser_provenance;
    await assert.rejects(
        () => importer.importBatch(missingProvenance),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingUsage = batch({ completeness: 'canonical' });
    delete missingUsage.usage;
    await assert.rejects(
        () => importer.importBatch(missingUsage),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingMutations = batch({ completeness: 'canonical' });
    delete missingMutations.mutations;
    await assert.rejects(
        () => importer.importBatch(missingMutations),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const emptyMutations = batch({ completeness: 'canonical' });
    emptyMutations.mutations = [];
    await assert.rejects(
        () => importer.importBatch(emptyMutations),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );

    const missingCursor = batch({ completeness: 'canonical' });
    delete missingCursor.next_cursor;
    await assert.rejects(
        () => importer.importBatch(missingCursor),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.batches.length, 0);
    assert.equal(state.canonical, false);
});

test('complete and checkpoint claims fail closed without recovery evidence', async () => {
    assert.throws(
        () => parseLine(JSON.stringify({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'complete',
            request_id: 'request-1'
        })),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const forgedComplete = {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: 'request-1',
        status: 'completed',
        completeness: 'canonical',
        next_cursor: null,
        checkpoint: {
            schema_version: 1,
            request_id: 'request-1',
            conversation_id: 'conversation-1',
            source: { source_id: 'rollout.jsonl', source_epoch: 'epoch-1' }
        }
    };
    assert.throws(
        () => parseLine(JSON.stringify(forgedComplete)),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );

    const checkpointStore = new MemoryCheckpointStore();
    await assert.rejects(
        () => checkpointStore.save(
            { conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1' },
            forgedComplete.checkpoint
        ),
        (error) => /checkpoint\.|source\.(fingerprint|prefix_anchor)/.test(error.message)
    );
});

test('complete cannot commit unless the same request imported a batch', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const complete = {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: 'empty-complete-request',
        status: 'completed',
        completeness: 'canonical',
        next_cursor: null,
        checkpoint: checkpoint('canonical', 'epoch-1', 'empty-complete-request')
    };

    await assert.rejects(
        () => importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'rollout.jsonl',
                sourceEpoch: 'epoch-1'
            }
        }),
        (error) => error.code === 'ANALYSIS_COMPLETE_WITHOUT_BATCH'
    );
    assert.deepEqual((await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    })).batches, []);

    await importer.importBatch(batch({
        requestId: 'prior-request',
        batchId: 'prior-request-batch',
        completeness: 'canonical'
    }));
    await assert.rejects(
        () => importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'rollout.jsonl',
                sourceEpoch: 'epoch-1'
            }
        }),
        (error) => error.code === 'ANALYSIS_COMPLETE_WITHOUT_BATCH'
    );

    await importer.importBatch(batch({
        requestId: 'empty-complete-request',
        batchId: 'empty-complete-batch',
        completeness: 'canonical'
    }));
    const state = await importer.commitComplete(complete, {
        scope: {
            conversationId: 'conversation-1',
            sourceId: 'rollout.jsonl',
            sourceEpoch: 'epoch-1'
        }
    });
    assert.deepEqual(state.batches, ['prior-request-batch', 'empty-complete-batch']);
    assert.equal(state.canonical, true);
});

test('mutation evidence is complete before importer state can be touched', async () => {
    const importer = await new AnalysisBatchImporter({ store: new MemoryAnalysisStore() }).init();
    const missingMetadata = batch({ completeness: 'canonical' });
    missingMetadata.mutations = [{
        mutation: 'upsert_item',
        item: {
            item_key: 'item-1',
            content_hash: 'hash-1',
            source_epoch: 'epoch-1'
        }
    }];
    await assert.rejects(
        () => importer.importBatch(missingMetadata),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingRange = batch({ completeness: 'canonical' });
    missingRange.mutations = [{ mutation: 'complete_range' }];
    await assert.rejects(
        () => importer.importBatch(missingRange),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
});

test('invalid replacement is preflighted before old epoch data is retired', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    await importer.importBatch(batch({
        batchId: 'replacement-preflight-old',
        completeness: 'canonical',
        itemKey: 'old-item'
    }));

    const invalidReplacement = batch({
        batchId: 'replacement-preflight-invalid',
        completeness: 'canonical',
        replacePrevious: true,
        sourceEpoch: 'epoch-2',
        itemKey: 'new-item'
    });
    invalidReplacement.history_items = [{ event_type: 'UserMessage', payload: { text: 'missing key' } }];
    await assert.rejects(
        () => importer.importBatch(invalidReplacement),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );

    const oldState = await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    });
    assert.equal(oldState.retired, false);
    assert.deepEqual(oldState.items.map((item) => item.item_key), ['old-item']);
    assert.equal((await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-2'
    })).batches.length, 0);
});

test('same-completeness lower revision cannot overwrite canonical data or cursor', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const newest = batch({ batchId: 'revision-100', completeness: 'canonical', text: 'newest' });
    newest.source_range.end = 100;
    newest.progress.bytes_scanned = 100;
    await importer.importBatch(newest);

    const stale = batch({ batchId: 'revision-50', completeness: 'canonical', text: 'older' });
    stale.source_range.end = 50;
    stale.progress.bytes_scanned = 50;
    await importer.importBatch(stale);

    const state = await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    });
    assert.equal(state.items[0].event.payload.text, 'newest');
    assert.equal(state.last_batch_id, 'revision-100');
    assert.equal(state.last_cursor, null);
    assert.deepEqual(state.batches, ['revision-100', 'revision-50']);
});

test('history item revision follows its matching mutation, not batch coverage', async () => {
    const importer = await new AnalysisBatchImporter({ store: new MemoryAnalysisStore() }).init();
    const oldBatch = batch({
        batchId: 'item-revision-old',
        completeness: 'canonical',
        text: 'old item'
    });
    oldBatch.source_range.end = 10000;
    oldBatch.progress.bytes_scanned = 10000;
    oldBatch.mutations = [
        upsertItemMutation({ revision: 5, byteEnd: 10000 }),
        { mutation: 'complete_range', source_range: { start: 0, end: 10000 } }
    ];
    await importer.importBatch(oldBatch);

    const overlapBatch = batch({
        batchId: 'item-revision-overlap',
        completeness: 'canonical',
        text: 'new item'
    });
    overlapBatch.source_range.end = 100;
    overlapBatch.progress.bytes_scanned = 100;
    overlapBatch.mutations = [
        upsertItemMutation({ revision: 6, byteEnd: 100 }),
        { mutation: 'complete_range', source_range: { start: 0, end: 100 } }
    ];
    await importer.importBatch(overlapBatch);

    const state = await importer.store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    });
    assert.equal(state.items[0].event.payload.text, 'new item');
    assert.equal(state.items[0].revision, 6);
});

test('source identity is explicit and never inferred from path', () => {
    assert.throws(
        () => createAnalyzeRequest({
            requestId: 'path-only',
            conversationId: 'conversation-1',
            sourceSpec: { path: 'rollout.jsonl' },
            mode: 'replay'
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
    assert.throws(
        () => requestScope({
            conversation_id: 'conversation-1',
            source_spec: { path: 'rollout.jsonl' }
        }),
        /scope is incomplete/
    );
});

test('retired source epochs cannot resurrect after replacement or restart', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-epoch-fence-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const createImporter = async () => new AnalysisBatchImporter({
        store: await new FileAnalysisStore({ rootDir: root }).init()
    }).init();
    let importer = await createImporter();
    await importer.importBatch(batch({
        batchId: 'fence-epoch-1', completeness: 'canonical', itemKey: 'old-item'
    }));
    await importer.importBatch(batch({
        batchId: 'fence-epoch-2', completeness: 'canonical', replacePrevious: true,
        sourceEpoch: 'epoch-2', itemKey: 'new-item', text: 'replacement'
    }));

    importer = await createImporter();
    await assert.rejects(
        () => importer.importBatch(batch({
            batchId: 'fence-late-old', completeness: 'canonical', itemKey: 'late-old'
        })),
        (error) => error.code === 'ANALYSIS_SOURCE_EPOCH_RETIRED'
    );
    await assert.rejects(
        () => importer.importBatch(batch({
            batchId: 'fence-late-replace', completeness: 'canonical', replacePrevious: true,
            itemKey: 'late-replacement'
        })),
        (error) => error.code === 'ANALYSIS_SOURCE_EPOCH_RETIRED'
    );
    await assert.rejects(
        () => importer.commitComplete({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'complete',
            request_id: 'request-1',
            status: 'completed',
            completeness: 'canonical',
            next_cursor: null,
            checkpoint: checkpoint('canonical', 'epoch-1')
        }, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'rollout.jsonl',
                sourceEpoch: 'epoch-1'
            }
        }),
        (error) => error.code === 'ANALYSIS_SOURCE_EPOCH_RETIRED'
    );
    const current = await importer.store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-2'
    });
    assert.equal(current.retired, false);
    assert.deepEqual(current.items.map((item) => item.item_key), ['new-item']);
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

test('replace_previous removes prior source epoch state for the same conversation', async () => {
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const importer = await new AnalysisBatchImporter({ store, checkpointStore }).init();
    await importer.importBatch(batch({
        batchId: 'epoch-1-batch',
        completeness: 'canonical',
        sourceEpoch: 'epoch-1',
        itemKey: 'old-item'
    }), { checkpoint: checkpoint('canonical') });
    await importer.importBatch(batch({
        batchId: 'epoch-2-batch',
        completeness: 'canonical',
        replacePrevious: true,
        sourceEpoch: 'epoch-2',
        itemKey: 'new-item',
        text: 'replacement'
    }), { checkpoint: checkpoint('canonical', 'epoch-2') });

    const current = await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-2'
    });
    assert.deepEqual(current.items.map((item) => item.item_key), ['new-item']);
    assert.equal(await checkpointStore.load({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    }), null);

    await assert.rejects(
        () => importer.importBatch(batch({
            batchId: 'epoch-2-second-batch',
            completeness: 'canonical',
            replacePrevious: true,
            sourceEpoch: 'epoch-2',
            itemKey: 'another-item'
        })),
        (error) => error.code === 'ANALYSIS_SOURCE_EPOCH_REQUIRED'
    );
    const duplicate = await importer.importBatch(batch({
        batchId: 'epoch-2-batch',
        completeness: 'canonical',
        replacePrevious: true,
        sourceEpoch: 'epoch-2',
        itemKey: 'new-item',
        text: 'replacement'
    }));
    assert.equal(duplicate.duplicate, true);
});

test('formal Rust analyzer derives fields and Node persists them', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-formal-analyzer-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const binary = process.env.CODEX_ROLLOUT_COLLECTOR_BIN
        || path.resolve(__dirname, '../native/codex-rollout-collector/target/debug/codex-rollout-collector.exe');
    assert.ok(fs.existsSync(binary), `formal analyzer binary is required: ${binary}`);
    const fixtureRoot = path.resolve(__dirname, '../native/codex-rollout-collector/tests/fixtures/current');
    const fixtureNames = ['minimal.jsonl', 'tool-output-content.jsonl', 'usage-rate-limit.jsonl', 'alias-fields.jsonl'];
    const sourcePath = path.join(root, 'formal-derived-fields.jsonl');
    const contents = fixtureNames
        .map((name) => fs.readFileSync(path.join(fixtureRoot, name), 'utf8').trim())
        .join('\n') + '\n';
    await fs.promises.writeFile(sourcePath, contents, 'utf8');

    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    collector = new CodexRolloutCollector({
        analyzerPath: binary,
        analyzerCwd: root,
        store,
        checkpointStore,
        runStore: new MemoryAnalysisRunStore(),
        requestTimeoutMs: 10000
    });
    const formalRequest = createAnalyzeRequest({
        requestId: 'formal-derived-fields',
        conversationId: 'conversation-formal',
        sourceSpec: {
            path: sourcePath,
            source_id: 'formal-derived-fields.jsonl',
            source_epoch: 'formal-epoch-1'
        },
        mode: 'replay'
    });
    const result = await collector.analyze(formalRequest);

    assert.equal(result.complete.status, 'ok');
    assert.ok(result.state.tool_details.length > 0, 'formal Rust tool details must be persisted');
    assert.ok(result.state.usage, 'formal Rust usage must be persisted');
    assert.equal(result.state.usage.total_tokens, 120);
    assert.ok(result.state.task_outcomes.length > 0, 'formal Rust task outcomes must be persisted');
    const mutationKinds = result.state.mutations.map((entry) => entry.mutation?.mutation);
    assert.ok(mutationKinds.includes('upsert_item'));
    assert.ok(mutationKinds.includes('upsert_detail'));
    assert.ok(mutationKinds.includes('upsert_usage'));
    assert.ok(mutationKinds.includes('upsert_outcome'));
    assert.ok(mutationKinds.includes('complete_range'));
    const persisted = await checkpointStore.load({
        conversationId: 'conversation-formal',
        sourceId: 'formal-derived-fields.jsonl',
        sourceEpoch: 'formal-epoch-1'
    });
    assert.ok(persisted.source.fingerprint, 'checkpoint must retain source fingerprint');
    assert.ok(persisted.source.prefix_anchor, 'checkpoint must retain prefix anchor');
    assert.ok(persisted.reducer_state, 'checkpoint must retain reducer state');

    const replaced = (contents[0] === '{' ? '[' : '{') + contents.slice(1);
    await fs.promises.writeFile(sourcePath, replaced, 'utf8');
    await assert.rejects(
        () => collector.analyze({
            ...formalRequest,
            request_id: 'formal-replay-after-replacement'
        }),
        (error) => error.message.includes('fingerprint') || error.message.includes('prefix anchor')
    );
});

test('formal Rust analyzer enforces request resource timeout', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-formal-timeout-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const binary = process.env.CODEX_ROLLOUT_COLLECTOR_BIN
        || path.resolve(__dirname, '../native/codex-rollout-collector/target/debug/codex-rollout-collector.exe');
    collector = new CodexRolloutCollector({
        analyzerPath: binary,
        analyzerCwd: root,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore(),
        requestTimeoutMs: 5000
    });
    await assert.rejects(
        () => collector.analyze(createAnalyzeRequest({
            requestId: 'formal-resource-timeout',
            conversationId: 'conversation-timeout',
            sourceSpec: {
                path: path.resolve(__dirname, '../native/codex-rollout-collector/tests/fixtures/current/minimal.jsonl'),
                source_id: 'minimal.jsonl',
                source_epoch: 'timeout-epoch-1'
            },
            mode: 'replay',
            resource_limits: { timeout_ms: 0 }
        })),
        (error) => error.code === 'resource_timeout'
    );
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

test('memory and file checkpoint stores only advance monotonically', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-checkpoint-monotonic-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryCheckpointStore(),
        await new FileCheckpointStore({ rootDir: root }).init()
    ];
    const scope = {
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    };

    for (const store of stores) {
        const canonical = checkpoint('canonical');
        canonical.segment.source_range.end = 100;
        canonical.source.fingerprint.covered_bytes = 100;
        canonical.source.prefix_anchor.end_offset = 100;
        await store.save(scope, canonical);

        const latePartial = checkpoint('partial');
        latePartial.segment.source_range.end = 200;
        latePartial.source.fingerprint.covered_bytes = 200;
        latePartial.source.prefix_anchor.end_offset = 200;
        await store.save(scope, latePartial);

        const lowerCanonical = checkpoint('canonical');
        lowerCanonical.segment.source_range.end = 50;
        lowerCanonical.source.fingerprint.covered_bytes = 50;
        lowerCanonical.source.prefix_anchor.end_offset = 50;
        await store.save(scope, lowerCanonical);

        const saved = await store.load(scope);
        assert.equal(saved.completeness, 'canonical');
        assert.equal(saved.segment.source_range.end, 100);
        assert.equal(saved.source.fingerprint.covered_bytes, 100);
    }
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

for (const crashMode of ['before_batch', 'after_batch']) {
    test(`collector restarts the analyzer after a ${crashMode} exit and replays from the same request`, async (t) => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `termlink-rollout-crash-${crashMode}-`));
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
            analyzerEnv: {
                FAKE_ANALYZER_CRASH_ONCE: crashMode,
                FAKE_ANALYZER_CRASH_MARKER: path.join(root, 'crash.marker')
            },
            store: new MemoryAnalysisStore(),
            checkpointStore: new MemoryCheckpointStore(),
            runStore: new MemoryAnalysisRunStore(),
            requestTimeoutMs: 5000
        });
        const result = await collector.analyze(createAnalyzeRequest({
            requestId: `request-crash-${crashMode}`,
            conversationId: 'conversation-crash',
            sourceSpec: {
                path: 'rollout.jsonl',
                source_id: 'rollout.jsonl',
                source_epoch: 'crash-epoch-1'
            },
            mode: 'replay'
        }));
        assert.equal(result.complete.status, 'completed');
        assert.equal(result.state.batches.length, 1);
        assert.equal(result.state.items.length, 1);
    });
}

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
