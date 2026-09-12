'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
    FileCheckpointStore,
    MemoryCheckpointStore
} = require('../src/services/codexRolloutCollector/analysisCheckpointStore');

const scope = {
    conversationId: 'checkpoint-conversation',
    sourceId: 'checkpoint-source',
    sourceEpoch: 'checkpoint-epoch'
};

function checkpoint(jobId, { start = 0, end = 100, completeness = 'canonical' } = {}) {
    const cursor = {
        schema_version: 1,
        reader_backend: 'fixture',
        reader_version: '1',
        cursor_kind: completeness === 'canonical' ? 'forward_append' : 'tail_preview',
        conversation_id: scope.conversationId,
        source_id: scope.sourceId,
        source_epoch: scope.sourceEpoch,
        source_kind: 'rollout',
        compression: 'plain_jsonl',
        snapshot_boundary: { unit: 'physical_bytes', byte_length: end },
        complete_range: { start, end },
        last_complete_line: null,
        last_rollout_ordinal: null,
        capabilities: {
            forward_stream: true, tail_preview: true, backward_segments: true,
            append: true, random_seek: false
        }
    };
    return {
        schema_version: 1,
        job_id: jobId,
        request_id: `${jobId}-attempt`,
        conversation_id: scope.conversationId,
        source: {
            source_id: scope.sourceId,
            source_epoch: scope.sourceEpoch,
            source_range: { start, end },
            snapshot_boundary: { unit: 'physical_bytes', byte_length: end }
        },
        reader: { backend: 'fixture', version: '1', source_kind: 'rollout', compression: 'plain_jsonl' },
        wire_profile: { parser_backend: 'fixture', wire_source_revision: 'fixture', compatibility_profile: 'current' },
        cursor_kind: cursor.cursor_kind,
        cursor,
        segment: {
            source_range: { start, end },
            physical_line_start: null,
            physical_line_end: null,
            rollout_ordinal: null
        },
        reducer_state: {
            schema_version: 1,
            reducer_id: 'termlink.analysis_reducer',
            reducer_version: '1',
            payload: {}
        },
        projection_watermark: {
            schema_version: 1,
            segment_id: `${jobId}-segment`,
            batch_id: `${jobId}-batch`,
            source_id: scope.sourceId,
            source_epoch: scope.sourceEpoch,
            complete_source_end: completeness === 'canonical' ? end : null,
            logical_item_count: 0
        },
        completeness,
        lineage_checkpoint: null
    };
}

for (const kind of ['memory', 'file']) {
    async function createStore(t) {
        if (kind === 'memory') return new MemoryCheckpointStore().init();
        const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'collector-checkpoint-jobs-'));
        t.after(() => fs.rm(rootDir, { recursive: true, force: true }));
        return new FileCheckpointStore({ rootDir }).init();
    }

    test(`${kind}: new jobs advance the same source checkpoint; late jobs cannot roll it back`, async (t) => {
        const store = await createStore(t);
        const first = checkpoint('first');
        const second = checkpoint('second', { end: 200 });
        await store.save({ ...scope, job_id: first.job_id, request_id: first.request_id }, first);
        assert.deepEqual(await store.save({ ...scope, job_id: second.job_id, request_id: second.request_id }, second), second);
        assert.deepEqual(await store.save(scope, first), second);
        assert.deepEqual(await store.save(scope, checkpoint('late-partial', { end: 300, completeness: 'partial' })), second);
        const reopened = kind === 'file' ? await new FileCheckpointStore({ rootDir: store.rootDir }).init() : store;
        assert.deepEqual(await reopened.load(scope), second);
        assert.equal(await reopened.load({ ...scope, job_id: first.job_id }), null);
        assert.deepEqual(await reopened.load({ ...scope, job_id: second.job_id }), second);
    });

    test(`${kind}: a new backfill job promotes a tail checkpoint without losing progress`, async (t) => {
        const store = await createStore(t);
        const tail = checkpoint('preview', { start: 80, completeness: 'partial' });
        const complete = checkpoint('backfill');
        await store.save(scope, tail);
        assert.deepEqual(await store.save(scope, checkpoint('old-complete', { end: 50 })), tail);
        assert.deepEqual(await store.save(scope, complete), complete);
        assert.deepEqual(await store.save(scope, tail), complete);
    });

    test(`${kind}: job transitions do not weaken current identity and source validation`, async (t) => {
        const store = await createStore(t);
        const first = checkpoint('first');
        await store.save(scope, first);
        const incoming = checkpoint('second', { end: 200 });
        for (const invalidScope of [
            { ...scope, job_id: 'wrong' },
            { ...scope, request_id: 'wrong' },
            { ...scope, conversationId: 'wrong' },
            { ...scope, sourceId: 'wrong' },
            { ...scope, sourceEpoch: 'wrong' }
        ]) {
            await assert.rejects(store.save(invalidScope, incoming), { code: 'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH' });
        }
        assert.deepEqual(await store.load(scope), first);
    });

    test(`${kind}: canonical promotion at the same range is independent of optional reducer counts`, async (t) => {
        const store = await createStore(t);
        const partial = checkpoint('partial', { completeness: 'partial' });
        partial.projection_watermark.logical_item_count = 9;
        partial.segment.rollout_ordinal = 8;
        const canonical = checkpoint('canonical');
        await store.save(scope, partial);
        assert.deepEqual(await store.save(scope, canonical), canonical);
    });
}
