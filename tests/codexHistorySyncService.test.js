'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
    buildManifestDiff,
    buildPartialMergedDiff,
    buildDeltaPages,
    computeHistoryPageHash,
    buildHistoryFreshnessToken,
    CodexHistorySyncService
} = require('../src/services/codexHistorySyncService');

function item(itemKey, contentHash = itemKey) { return { itemKey, contentHash, payloadJson: JSON.stringify({ itemKey }) }; }

test('metadata freshness token is stable and ignores unavailable metadata', () => {
    const first = buildHistoryFreshnessToken({ updatedAt: '2026-08-08T01:00:00Z', latestTurnId: 'turn-1' });
    const equivalent = buildHistoryFreshnessToken({ updated_at: '2026-08-08T01:00:00Z', latest_turn_id: 'turn-1' });
    assert.equal(first, equivalent);
    assert.equal(buildHistoryFreshnessToken({ title: 'same title' }), null);
    assert.equal(buildHistoryFreshnessToken({ currentTurnId: 'transient-runtime-turn' }), null);
});

test('changed canonical metadata invalidates only a recovery baseline', () => {
    const service = new CodexHistorySyncService();
    service.observeCanonicalMetadata('conv', { updatedAt: 100, latestTurnId: 'turn-1' });
    const recovery = service.registerBaselineItems('conv', [item('cached')], {
        baselineSourceKind: 'history_recovery'
    });
    assert.equal(recovery.stale, false);
    assert.equal(recovery.freshnessToken, buildHistoryFreshnessToken({ updatedAt: 100, latestTurnId: 'turn-1' }));

    const unchanged = service.observeCanonicalMetadata('conv', { updatedAt: 100, latestTurnId: 'turn-1' });
    assert.equal(unchanged.changed, false);
    assert.equal(service.getBaseline('conv').stale, false);

    const changed = service.observeCanonicalMetadata('conv', { updatedAt: 101, latestTurnId: 'turn-2' });
    assert.equal(changed.changed, true);
    assert.equal(service.getBaseline('conv').stale, true);

    service.registerBaselineItems('surface-conv', [item('surface')], { baselineSourceKind: 'ipc_surface' });
    service.observeCanonicalMetadata('surface-conv', { updatedAt: 200, latestTurnId: 'turn-surface' });
    assert.equal(service.getBaseline('surface-conv').stale, false);
});

test('complete manifest diff produces upserts, deletes and order only when needed', () => {
    const diff = buildManifestDiff({ localItems: [item('a'), item('old')], canonicalItems: [item('a'), item('b')], baselineComplete: true });
    assert.deepEqual(diff.upserts.map((entry) => entry.itemKey), ['b']);
    assert.deepEqual(diff.deletes, ['old']);
    assert.deepEqual(diff.canonicalOrder, ['a', 'b']);
});

test('partial manifest diff never deletes or claims authoritative order', () => {
    const diff = buildPartialMergedDiff({ localItems: [item('a')], canonicalItems: [item('a', 'new'), item('b')], baseRoot: 'root-a' });
    assert.deepEqual(diff.deletes, []);
    assert.equal(diff.fullOrderIncluded, false);
    assert.deepEqual(diff.upserts.map((entry) => [entry.itemKey, entry.position]), [['a', 0], ['b', 1]]);
    assert.notEqual(diff.targetRoot, 'root-a');
});

test('partial manifest diff does not append an older or middle gap after a local tail', () => {
    const diff = buildPartialMergedDiff({
        localItems: [{ ...item('new'), position: 0 }],
        canonicalItems: [
            { ...item('old'), position: 0 },
            { ...item('new'), position: 1 }
        ],
        baseRoot: 'root-new'
    });
    assert.deepEqual(diff.upserts, []);
    assert.deepEqual(diff.deletes, []);
    assert.equal(diff.fullOrderIncluded, false);
});

test('partial manifest diff does not append when the local tail has no canonical overlap', () => {
    const diff = buildPartialMergedDiff({
        localItems: [item('known'), item('live-tail')],
        canonicalItems: [
            { ...item('old'), position: 0 },
            { ...item('known'), position: 1 }
        ]
    });
    assert.deepEqual(diff.upserts, []);
});

test('partial manifest diff uses the newest canonical overlap, not the local array tail', () => {
    const diff = buildPartialMergedDiff({
        localItems: [item('new'), item('old')],
        canonicalItems: [item('old'), item('middle'), item('new')]
    });
    assert.deepEqual(diff.upserts, []);
    assert.equal(diff.rangeComplete, false);
});

test('delta pages share sequence roots and have deterministic page hashes', () => {
    const pages = buildDeltaPages({ syncId: 'sync', sequence: 1, baseRoot: 'a', targetRoot: 'b', upserts: [item('a'), item('b')], maxItems: 1 });
    assert.equal(pages.length, 2);
    assert.ok(pages.every((page) => page.pageCount === 2 && page.baseRoot === 'a' && page.targetRoot === 'b'));
    assert.equal(pages[0].pageHash, computeHistoryPageHash(pages[0]));
});

test('range capability carries tail metadata without enabling delete or order', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const tailItems = [item('old'), item('new')].map((entry, position) => ({ ...entry, position }));
    service.registerBaselineItems('conv', tailItems, {
        baselineSourceKind: 'history_recovery',
        resultKind: 'tail',
        rangeMetadata: {
            version: 1,
            segmentId: 'segment-tail',
            rangeId: 'segment-tail',
            rangeKind: 'tail',
            oldestAnchor: { key: 'old', hash: 'old' },
            newestAnchor: { key: 'new', hash: 'new' },
            nextOlderCursor: 'older-cursor',
            hasMoreBefore: true,
            coverageRoot: 'tail-root',
            coverageComplete: false
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174011';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        checkpoint: { rootHash: null, complete: false }
    });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: []
    });
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.deepEqual(delta.range, {
        version: 1,
        segmentId: 'segment-tail',
        rangeId: 'segment-tail',
        rangeKind: 'tail',
        newestAnchor: { key: 'new', hash: 'new' },
        oldestAnchor: { key: 'old', hash: 'old' },
        nextOlderCursor: 'older-cursor',
        hasMoreBefore: true,
        coverageRoot: 'tail-root',
        coverageComplete: false
    });
    assert.equal(delta.baselineComplete, false);
    assert.deepEqual(delta.deletes, []);
    assert.equal(delta.fullOrderIncluded, false);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    }).state, 'partial');
});

test('range tail no-op reconciliation emits an ACK-able metadata page', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const tailItems = [item('old'), item('new')].map((entry, position) => ({ ...entry, position }));
    service.registerBaselineItems('conv', tailItems, {
        baselineSourceKind: 'history_recovery',
        resultKind: 'tail',
        rangeMetadata: {
            version: 1,
            segmentId: 'segment-tail-noop',
            rangeId: 'segment-tail-noop',
            rangeKind: 'tail',
            oldestAnchor: { key: 'old', hash: 'old' },
            newestAnchor: { key: 'new', hash: 'new' },
            nextOlderCursor: 'older-cursor',
            hasMoreBefore: true,
            coverageRoot: 'tail-root',
            coverageComplete: false
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174013';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        checkpoint: { rootHash: 'local-root', itemCount: 2, complete: false }
    });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: tailItems.map(({ itemKey, contentHash }) => ({ itemKey, contentHash }))
    });

    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.equal(delta.upserts.length, 0);
    assert.equal(delta.pageCount, 1);
    assert.equal(delta.range.rangeKind, 'tail');
    const ack = service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    });
    assert.equal(ack.state, 'partial');
    assert.equal(messages.at(-1).type, 'conversation_history_sync_state');
});

test('range tail with the bounded 200-item baseline stays one atomic delta page', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const tailItems = Array.from({ length: 200 }, (_, position) => ({
        ...item(`tail-${position}`),
        position
    }));
    service.registerBaselineItems('conv', tailItems, {
        baselineSourceKind: 'history_recovery',
        resultKind: 'tail',
        rangeMetadata: {
            version: 1,
            segmentId: 'segment-tail-200',
            rangeId: 'segment-tail-200',
            rangeKind: 'tail',
            oldestAnchor: { key: tailItems[0].itemKey, hash: tailItems[0].contentHash },
            newestAnchor: { key: tailItems.at(-1).itemKey, hash: tailItems.at(-1).contentHash },
            nextOlderCursor: 'older-cursor',
            hasMoreBefore: true,
            coverageRoot: 'tail-root-200',
            coverageComplete: false
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174014';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        checkpoint: { rootHash: null, complete: false }
    });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: []
    });

    const deltas = messages.filter((message) => message.type === 'conversation_history_delta');
    assert.equal(deltas.length, 1);
    assert.equal(deltas[0].pageCount, 1);
    assert.equal(deltas[0].upserts.length, 200);
    assert.equal(deltas[0].range.rangeId, 'segment-tail-200');
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: deltas[0].targetRoot,
        clientSelectionGeneration: 0
    }).state, 'partial');
});

test('range tail adapts inline payloads to existing chunks before rejecting the atomic page', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const tailItems = Array.from({ length: 200 }, (_, position) => ({
        ...item(`chunked-tail-${position}`),
        position,
        // The aggregate is over the 256 KiB envelope budget, while each
        // payload remains below the normal 128 KiB auto-chunk threshold.
        payloadJson: JSON.stringify({ text: 'x'.repeat(2_000) })
    }));
    service.registerBaselineItems('conv', tailItems, {
        baselineSourceKind: 'history_recovery',
        resultKind: 'tail',
        rangeMetadata: {
            version: 1,
            segmentId: 'segment-tail-chunks',
            rangeId: 'segment-tail-chunks',
            rangeKind: 'tail',
            oldestAnchor: { key: tailItems[0].itemKey, hash: tailItems[0].contentHash },
            newestAnchor: { key: tailItems.at(-1).itemKey, hash: tailItems.at(-1).contentHash },
            nextOlderCursor: 'older-cursor',
            hasMoreBefore: true,
            coverageRoot: 'tail-root-chunks',
            coverageComplete: false
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174015';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        checkpoint: { rootHash: null, complete: false }
    });

    try {
        const result = service.handleManifestPage(ws, {
            syncId,
            conversationId: 'conv',
            pageIndex: 0,
            lastPage: true,
            items: []
        });
        assert.equal(result.ok, true);
        const deltas = messages.filter((message) => message.type === 'conversation_history_delta');
        assert.equal(deltas.length, 1);
        assert.equal(deltas[0].pageCount, 1);
        assert.equal(deltas[0].upserts.length, 200);
        assert.ok(deltas[0].upserts.some((entry) => entry.payloadChunkCount > 0));
        assert.ok(Buffer.byteLength(JSON.stringify(deltas[0]), 'utf8') <= 256 * 1024);
        assert.ok(messages.some((message) => message.type === 'conversation_history_payload_chunk'));
    } finally {
        service.cancel(ws);
    }
});

test('one older page emits one upsert-only delta and settles PARTIAL without a follow-up request', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174099';
    const pageResult = {
        conversationId: 'conv',
        mode: 'paginated',
        resultKind: 'segment',
        complete: false,
        items: [item('older-0'), item('older-1')].map((entry, position) => ({ ...entry, position })),
        range: {
            version: 1,
            segmentId: 'segment-older',
            rangeId: 'segment-older',
            rangeKind: 'older',
            providerMode: 'paginated',
            providerIdentityHash: 'codex-app-server',
            oldestAnchor: { key: 'older-0', hash: 'older-0' },
            newestAnchor: { key: 'older-1', hash: 'older-1' },
            nextOlderCursor: 'older-again',
            hasMoreBefore: true,
            coverageRoot: 'older-root',
            coverageComplete: false
        }
    };
    const result = service.startOlderPage({
        ws,
        conversationId: 'conv',
        syncId,
        checkpoint: {
            rootHash: 'tail-root',
            coverageRoot: 'tail-root',
            rangeId: 'tail-segment',
            hasMoreBefore: true,
            nextOlderCursor: 'older-cursor'
        },
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        pageResult
    });
    assert.equal(result.ok, true);
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.equal(delta.range.rangeKind, 'older');
    assert.equal(delta.baselineComplete, false);
    assert.deepEqual(delta.deletes, []);
    assert.equal(delta.fullOrderIncluded, false);
    const ack = service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    });
    assert.equal(ack.state, 'partial');
    assert.equal(messages.filter((message) => message.type === 'conversation_history_delta').length, 1);
    assert.equal(messages.filter((message) => message.type === 'conversation_history_manifest_required').length, 0);
});

test('one older page rejects any coverage-complete authority claim', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const result = service.startOlderPage({
        ws,
        conversationId: 'conv',
        syncId: '123e4567-e89b-12d3-a456-426614174100',
        checkpoint: {
            rootHash: 'tail-root',
            coverageRoot: 'tail-root',
            rangeId: 'tail-segment',
            hasMoreBefore: true,
            nextOlderCursor: 'older-cursor'
        },
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        pageResult: {
            complete: false,
            coverageComplete: true,
            items: [item('older-item')],
            range: {
                version: 1,
                segmentId: 'segment-older-authority',
                rangeId: 'segment-older-authority',
                rangeKind: 'older',
                nextOlderCursor: null,
                hasMoreBefore: false,
                coverageRoot: 'older-root',
                coverageComplete: true
            }
        }
    });
    assert.equal(result.ok, false);
    assert.equal(result.detailCode, 'history_older_page_authority_invalid');
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);
});

test('schema v3 is capped to the legacy v2 path without a valid range capability', () => {
    const service = new CodexHistorySyncService({ send: () => {} });
    service.registerBaselineItems('conv', [item('one')], {
        baselineSourceKind: 'history_recovery'
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const result = service.startSync({
        ws,
        conversationId: 'conv',
        syncId: '123e4567-e89b-12d3-a456-426614174012',
        cacheSchemaVersion: 3,
        rangeSegments: { enabled: false, version: 1, cacheSchemaVersion: 3 },
        checkpoint: { rootHash: null, complete: false }
    });
    assert.equal(result.ok, true);
    assert.equal(result.sync.cacheSchemaVersion, 2);
    assert.equal(result.sync.rangeEnabled, false);
    service.cancel(ws);
});

test('snapshot segment lane fragments payloads, commits one atomic range, then settles only after segment ACK', () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: {
            historySnapshotInlinePayloadBytes: 1,
            historySnapshotFragmentBytes: 16 * 1024
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174201';
    const result = service.startSnapshotSegments({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        snapshotSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        initialItems: [{
            ...item('snapshot-item'),
            position: 0,
            payloadJson: JSON.stringify({ text: 'x'.repeat(20_000) })
        }],
        initialFinal: true
    });
    assert.equal(result.ok, true);
    for (let index = 0; index < 8; index += 1) {
        const state = service._syncs.get(ws);
        service._pumpPages(ws, state);
    }
    const start = messages.find((message) => message.type === 'conversation_history_segment_start');
    assert.ok(start);
    assert.equal(start.range.rangeKind, 'tail');
    assert.equal(start.range.coverageComplete, true);
    const fragments = messages.filter((message) => message.type === 'conversation_history_segment_fragment');
    assert.ok(fragments.length >= 2);
    assert.ok(fragments.every((message) => Buffer.byteLength(message.data, 'utf8') <= 16 * 1024));
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_commit'), true);
    const ack = service.handleSnapshotSegmentAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: start.sequence,
        pageIndex: start.pageIndex,
        segmentId: start.range.segmentId,
        pageHash: start.pageHash,
        targetRoot: start.targetRoot,
        clientSelectionGeneration: 0
    });
    assert.equal(ack.ok, true);
    assert.equal(messages.at(-1).type, 'conversation_history_sync_state');
    assert.equal(messages.at(-1).state, 'synced');
});

test('snapshot segment lane preserves newest-first delivery and prepends later older segments', () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: { historySnapshotSegmentBytes: 1_000, historySnapshotInlinePayloadBytes: 2_000 }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174202';
    const items = ['old', 'middle', 'new'].map((itemKey, position) => ({
        ...item(itemKey),
        position,
        payloadJson: JSON.stringify({ text: itemKey.repeat(120) })
    }));
    const result = service.startSnapshotSegments({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        snapshotSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        initialItems: items,
        initialFinal: true
    });
    assert.equal(result.ok, true);

    let acknowledged = 0;
    for (let guard = 0; guard < 80; guard += 1) {
        const state = service._syncs.get(ws);
        if (!state) break;
        service._pumpPages(ws, state);
        const commits = messages.filter((message) => message.type === 'conversation_history_segment_commit');
        const commit = commits[acknowledged];
        if (!commit) continue;
        const start = messages.find((message) => message.type === 'conversation_history_segment_start' && message.sequence === commit.sequence);
        service.handleSnapshotSegmentAck(ws, {
            syncId,
            conversationId: 'conv',
            sequence: commit.sequence,
            pageIndex: commit.pageIndex,
            segmentId: commit.segmentId,
            pageHash: commit.pageHash,
            targetRoot: commit.targetRoot,
            clientSelectionGeneration: 0
        });
        assert.ok(start);
        acknowledged += 1;
    }
    const starts = messages.filter((message) => message.type === 'conversation_history_segment_start');
    assert.ok(starts.length >= 2);
    assert.equal(starts[0].range.rangeKind, 'tail');
    assert.equal(starts.slice(1).every((message) => message.range.rangeKind === 'older'), true);
    assert.equal(messages.at(-1).state, 'synced');
});

test('snapshot segment lane yields before its first frame while live/control work is pending', () => {
    const messages = [];
    let historyAllowed = false;
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        canSendHistory: () => historyAllowed
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174211';
    const result = service.startSnapshotSegments({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 3,
        snapshotSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        initialItems: [{ ...item('live-yield'), position: 0 }],
        initialFinal: true
    });

    assert.equal(result.ok, true);
    assert.equal(messages.some((message) => message.type === 'conversation_history_snapshot_state'), true);
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_start'), false);

    historyAllowed = true;
    service._pumpPages(ws, service._syncs.get(ws));

    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_start'), true);
    service.cancel(ws);
});

test('snapshot segment lane pauses fragments and commit when live/control becomes pending mid-segment', () => {
    const messages = [];
    let historyAllowed = true;
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        canSendHistory: () => historyAllowed,
        options: {
            historySnapshotInlinePayloadBytes: 1,
            historySnapshotFragmentBytes: 16 * 1024,
            historyPumpIntervalMs: 1_000
        }
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const result = service.startSnapshotSegments({
        ws,
        conversationId: 'conv',
        syncId: '123e4567-e89b-12d3-a456-426614174212',
        cacheSchemaVersion: 3,
        snapshotSegments: { enabled: true, version: 1, cacheSchemaVersion: 3 },
        initialItems: [{
            ...item('mid-segment-yield'),
            position: 0,
            payloadJson: JSON.stringify({ text: 'x'.repeat(20_000) })
        }],
        initialFinal: true
    });
    assert.equal(result.ok, true);
    assert.equal(messages.filter((message) => message.type === 'conversation_history_segment_start').length, 1);

    historyAllowed = false;
    for (let index = 0; index < 4; index += 1) {
        service._pumpPages(ws, service._syncs.get(ws));
    }
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_fragment'), false);
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_commit'), false);

    historyAllowed = true;
    for (let index = 0; index < 12; index += 1) {
        service._pumpPages(ws, service._syncs.get(ws));
    }
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_fragment'), true);
    assert.equal(messages.some((message) => message.type === 'conversation_history_segment_commit'), true);
    service.cancel(ws);
});

test('delta packing reserves the final history envelope wrapper', () => {
    const upserts = Array.from({ length: 89 }, (_, index) => ({
        ...item(`near-limit-${index}`, `hash-${index}`),
        // This fixture fits the old page-body calculation but crosses the
        // 256 KiB limit once the final envelope fields are added by _emit().
        payloadJson: JSON.stringify({ text: 'x'.repeat(2_815) })
    }));
    const context = {
        conversationId: '019f9ab0-0000-7000-8000-000000000001',
        selectionGeneration: 3,
        clientSelectionGeneration: 4
    };
    const pages = buildDeltaPages({
        syncId: 'sync-near-envelope-limit',
        sequence: 1,
        baseRoot: null,
        targetRoot: 'target',
        upserts,
        envelopeContext: context
    });
    assert.ok(pages.length > 1);
    assert.ok(pages[0].upserts.length < upserts.length);
    for (const page of pages) {
        const envelope = {
            type: 'conversation_history_delta',
            conversationId: context.conversationId,
            ...page,
            selectionGeneration: context.selectionGeneration,
            clientSelectionGeneration: context.clientSelectionGeneration
        };
        assert.ok(Buffer.byteLength(JSON.stringify(envelope), 'utf8') <= 256 * 1024);
    }
});

test('sync service sends a near-limit history page without triggering envelope failure', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const items = Array.from({ length: 89 }, (_, index) => ({
        ...item(`service-near-limit-${index}`, `hash-${index}`),
        payloadJson: JSON.stringify({ text: 'x'.repeat(2_815) })
    }));
    service.registerBaselineItems('conv', items, { complete: false, syncOutcome: 'synced' });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174010';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        cacheSchemaVersion: 2,
        checkpoint: { rootHash: null, complete: false }
    });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: []
    });
    const deltaCount = () => messages.filter((message) => message.type === 'conversation_history_delta').length;
    const first = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(first);
    assert.ok(first.pageCount > 1);
    for (let pageIndex = 0; pageIndex < first.pageCount; pageIndex += 1) {
        const delta = messages.filter((message) => message.type === 'conversation_history_delta')[pageIndex];
        assert.ok(delta);
        assert.equal(delta.pageIndex, pageIndex);
        assert.ok(Buffer.byteLength(JSON.stringify(delta), 'utf8') <= 256 * 1024);
        if (pageIndex < first.pageCount - 1) {
            assert.equal(service.handleAck(ws, {
                syncId,
                conversationId: 'conv',
                sequence: 1,
                pageIndex,
                targetRoot: delta.targetRoot,
                clientSelectionGeneration: 0
            }).ok, true);
        } else {
            assert.equal(service.handleAck(ws, {
                syncId,
                conversationId: 'conv',
                sequence: 1,
                pageIndex,
                targetRoot: delta.targetRoot,
                clientSelectionGeneration: 0
            }).state, 'synced');
        }
    }
    assert.equal(deltaCount(), first.pageCount);
    assert.equal(messages.some((message) => message.detailCode === 'history_envelope_too_large'), false);
});

test('history text containing an incomplete data-url prefix is not rejected as inline media', () => {
    const pages = buildDeltaPages({
        syncId: 'sync-text-data-url',
        sequence: 1,
        baseRoot: null,
        targetRoot: 'target',
        upserts: [{
            ...item('code-sample'),
            payloadJson: JSON.stringify({ text: 'data:image/png;base64,${Buffer.from(bytes).toString("base64")}' })
        }]
    });
    assert.equal(pages.length, 1);
    assert.equal(pages[0].upserts[0].itemKey, 'code-sample');
});

test('Node page hash matches the shared golden fixture', () => {
    const fixturePath = path.join(__dirname, '..', 'android', 'app', 'src', 'test', 'resources', 'codex_history_page_hash_v1.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    for (const vector of fixture.vectors) {
        assert.equal(computeHistoryPageHash(vector.page), vector.expectedPageHash, vector.name);
    }
});

test('sync service asks for manifest and emits a delta after all pages arrive', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message), options: { deltaMaxItems: 1 } });
    service.registerBaseline('conv', 'app_server_thread', { turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }] }, { complete: true });
    const ws = {};
    const syncId = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(service.startSync({ ws, conversationId: 'conv', syncId, checkpoint: { rootHash: null, complete: false } }).ok, true);
    assert.equal(messages[0].type, 'conversation_history_manifest_required');
    const result = service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    assert.equal(result.ok, true);
    assert.ok(messages.some((message) => message.type === 'conversation_history_delta'));
});

test('history delta pump pauses above high water without closing the websocket', async () => {
    const messages = [];
    const ws = { readyState: 1, bufferedAmount: 3 * 1024 * 1024 };
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: { historyPumpIntervalMs: 5 }
    });
    service.registerBaseline('conv', 'app_server_thread', { turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }] }, { complete: true });
    const syncId = '123e4567-e89b-12d3-a456-426614174001';
    service.startSync({ ws, conversationId: 'conv', syncId, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);

    ws.bufferedAmount = 0;
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), true);
    assert.equal(ws.readyState, 1);
    service.cancel(ws);
});

test('history pump yields to live/control priority before generating the next page', async () => {
    const messages = [];
    let higherPriorityPending = true;
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        canSendHistory: () => !higherPriorityPending,
        options: { historyPumpIntervalMs: 5 }
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-42661417400b';
    service.startSync({ ws, conversationId: 'conv', syncId, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);

    higherPriorityPending = false;
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(messages.filter((message) => message.type === 'conversation_history_delta').length, 1);
    service.cancel(ws);
});

test('history page is not consumed when the scheduler rejects the wire hand-off', async () => {
    const messages = [];
    let deltaAttempts = 0;
    const service = new CodexHistorySyncService({
        send: (_ws, message) => {
            if (message.type === 'conversation_history_delta' && deltaAttempts++ === 0) return false;
            messages.push(message);
            return true;
        },
        options: { historyPumpIntervalMs: 5 }
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-42661417400d';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });

    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(deltaAttempts, 2);
    assert.equal(messages.filter((message) => message.type === 'conversation_history_delta').length, 1);
    service.cancel(ws);
});

test('history pump drops a stale selection before a deferred page is emitted', async () => {
    const messages = [];
    let active = true;
    let historyAllowed = false;
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        isStillActive: () => active,
        canSendHistory: () => historyAllowed,
        options: { historyPumpIntervalMs: 5 }
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-42661417400c';
    service.startSync({ ws, conversationId: 'conv', syncId, selectionGeneration: 4, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: []
    });
    active = false;
    historyAllowed = true;
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);
    service.cancel(ws);
});

test('history sync echoes client selection generation and rejects stale pages', () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        isStillActive: () => true
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'hi' }] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174002';
    service.startSync({
        ws,
        conversationId: 'conv',
        syncId,
        clientSelectionGeneration: 7,
        checkpoint: { rootHash: null, complete: false }
    });
    assert.equal(messages[0].clientSelectionGeneration, 7);
    assert.equal(service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        clientSelectionGeneration: 6,
        items: []
    }).detailCode, 'stale_selection');
});

test('history sync fails closed before sending an oversized envelope', () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: { historyMaxEnvelopeBytes: 512 }
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [{ id: 'i', type: 'agentMessage', text: 'x'.repeat(2_000) }] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174003';
    service.startSync({ ws, conversationId: 'conv', syncId, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    const failure = messages.find((message) => message.state === 'failed');
    assert.equal(failure.detailCode, 'history_envelope_too_large');
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);
});

test('70 MiB history fixture never crosses the 256 KiB WebSocket envelope gate', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{
            id: 'large-turn',
            status: 'completed',
            items: [{ id: 'large-item', type: 'agentMessage', text: 'x'.repeat(70 * 1024 * 1024) }]
        }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174004';
    service.startSync({ ws, conversationId: 'conv', syncId, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    assert.equal(messages.some((message) => message.type === 'conversation_history_delta'), false);
    assert.equal(messages.at(-1).detailCode, 'history_envelope_too_large');
});

test('v2 payload chunks keep a large item below page and chunk envelope limits', () => {
    const payloadJson = JSON.stringify({ text: '界'.repeat(180_000) });
    const pages = buildDeltaPages({
        syncId: 'sync',
        sequence: 1,
        baseRoot: 'a',
        targetRoot: 'b',
        upserts: [{ ...item('large', 'hash'), payloadJson }],
        enablePayloadChunks: true,
        payloadInlineMaxBytes: 32 * 1024,
        payloadChunkBytes: 16 * 1024
    });
    const page = pages[0];
    const chunks = page.payloadChunks;
    assert.ok(chunks.length > 1);
    assert.ok(Buffer.byteLength(JSON.stringify(page), 'utf8') <= 256 * 1024);
    assert.ok(chunks.every((chunk) => Buffer.byteLength(JSON.stringify({
        type: 'conversation_history_payload_chunk',
        conversationId: 'conv',
        syncId: 'sync',
        sequence: 1,
        pageIndex: 0,
        targetRoot: 'b',
        baselineComplete: true,
        ...chunk,
        selectionGeneration: 1,
        clientSelectionGeneration: 1
    }), 'utf8') <= 128 * 1024));
    assert.equal(Buffer.byteLength(chunks.map((chunk) => chunk.data).join(''), 'utf8'), Buffer.byteLength(payloadJson, 'utf8'));
});

test('delta packing prepares many large payloads once and keeps every item/chunk', () => {
    const payloadJson = JSON.stringify({ text: '界'.repeat(24_000) });
    const upserts = Array.from({ length: 100 }, (_, index) => ({
        ...item(`large-${index}`, `hash-${index}`),
        payloadJson
    }));
    const pages = buildDeltaPages({
        syncId: 'sync-many-large',
        sequence: 1,
        baseRoot: 'a',
        targetRoot: 'b',
        upserts,
        enablePayloadChunks: true,
        payloadInlineMaxBytes: 16 * 1024,
        payloadChunkBytes: 8 * 1024
    });
    assert.equal(
        pages.reduce((count, page) => count + page.upserts.length, 0),
        upserts.length
    );
    assert.equal(
        pages.reduce((count, page) => count + page.payloadChunks.length, 0),
        upserts.length * Math.ceil(Buffer.byteLength(payloadJson, 'utf8') / (8 * 1024))
    );
    assert.ok(pages.every((page) => Buffer.byteLength(JSON.stringify(page), 'utf8') <= 256 * 1024));
});

test('v2 sync waits for per-page ack before sending the next page', async () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message), options: { deltaMaxItems: 1 } });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 't', status: 'completed', items: [
            { id: 'i1', type: 'agentMessage', text: 'one' },
            { id: 'i2', type: 'agentMessage', text: 'two' }
        ] }]
    }, { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174005';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const first = messages.filter((message) => message.type === 'conversation_history_delta');
    assert.equal(first.length, 1);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: first[0].targetRoot,
        clientSelectionGeneration: 0
    }).ok, true);
    assert.equal(messages.filter((message) => message.type === 'conversation_history_sync_state').length, 0);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(messages.filter((message) => message.type === 'conversation_history_delta').length, 2);
    service.cancel(ws);
});

test('final ACK closes a partial sync without a later sync timeout', async () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: { syncInactivityTimeoutMs: 40 }
    });
    service.registerBaseline('conv', 'app_server_thread', {
        turns: [{ id: 'running-turn', status: 'running', items: [{ id: 'i', type: 'agentMessage', text: 'working' }] }]
    }, { complete: false });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174006';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, { syncId, conversationId: 'conv', pageIndex: 0, lastPage: true, items: [] });
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    }).state, 'partial');
    assert.equal(messages.at(-1).state, 'partial');
    await new Promise((resolve) => setTimeout(resolve, 70));
    assert.equal(messages.some((message) => message.detailCode === 'sync_timeout'), false);
});

test('baselineComplete=false does not force PARTIAL when the requested range is fully synced', async () => {
    const messages = [];
    const service = new CodexHistorySyncService({
        send: (_ws, message) => messages.push(message),
        options: { syncInactivityTimeoutMs: 30 }
    });
    service.registerBaselineItems('conv', [item('tail')], {
        complete: false,
        syncOutcome: 'synced'
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174007';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: []
    });
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.equal(delta.baselineComplete, false);
    assert.deepEqual(delta.deletes, []);
    assert.equal(Object.hasOwn(delta, 'canonicalOrder'), false);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    }).state, 'synced');
    assert.equal(messages.at(-1).state, 'synced');
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(messages.some((message) => message.detailCode === 'sync_timeout'), false);
});

test('a root/checkpoint hit settles directly as SYNCED and releases the baseline subscriber', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    const baseline = service.registerBaselineItems('conv', [item('a')], { complete: true });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const result = service.startSync({
        ws,
        conversationId: 'conv',
        syncId: '123e4567-e89b-12d3-a456-42661417400a',
        checkpoint: { rootHash: baseline.rootHash, itemCount: 1, complete: true }
    });
    assert.equal(result.state, 'synced');
    assert.equal(messages.at(-1).state, 'synced');
    assert.equal(service.getBaselineStats().entries[0].subscriberCount, 0);
});

test('an already classified cache-only result is terminal and does not arm a manifest watchdog', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    service.registerBaselineItems('conv', [item('cached')], {
        complete: false,
        syncOutcome: 'cache_only',
        syncOutcomeDetail: 'history_unavailable'
    });
    const result = service.startSync({
        ws: {},
        conversationId: 'conv',
        syncId: '123e4567-e89b-12d3-a456-42661417400b',
        checkpoint: { rootHash: null, complete: false }
    });
    assert.equal(result.state, 'cache_only');
    assert.equal(messages.at(-1).state, 'cache_only');
    assert.equal(messages.at(-1).detailCode, 'history_unavailable');
    assert.equal(messages.some((message) => message.type === 'conversation_history_manifest_required'), false);
});

test('an unresolved older or middle range forces PARTIAL even with an optimistic sync outcome', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    service.registerBaselineItems('conv', [
        { ...item('old'), position: 0 },
        { ...item('new'), position: 1 }
    ], { complete: false, syncOutcome: 'synced' });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174008';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: [{ itemKey: 'new', contentHash: 'new' }]
    });
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.deepEqual(delta.upserts, []);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    }).state, 'partial');
    assert.equal(messages.at(-1).detailCode, 'history_range_partial');
});

test('explicit SYNCED cannot override a known older range', () => {
    const messages = [];
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
    service.registerBaselineItems('conv', [item('tail')], {
        complete: false,
        syncOutcome: 'synced',
        hasMoreBefore: true
    });
    const ws = { readyState: 1, bufferedAmount: 0 };
    const syncId = '123e4567-e89b-12d3-a456-426614174009';
    service.startSync({ ws, conversationId: 'conv', syncId, cacheSchemaVersion: 2, checkpoint: { rootHash: null, complete: false } });
    service.handleManifestPage(ws, {
        syncId,
        conversationId: 'conv',
        pageIndex: 0,
        lastPage: true,
        items: [{ itemKey: 'tail', contentHash: 'tail' }]
    });
    const delta = messages.find((message) => message.type === 'conversation_history_delta');
    assert.ok(delta);
    assert.equal(service.handleAck(ws, {
        syncId,
        conversationId: 'conv',
        sequence: 1,
        pageIndex: 0,
        targetRoot: delta.targetRoot,
        clientSelectionGeneration: 0
    }).state, 'partial');
});

test('recovery result coverage evidence forces PARTIAL over optimistic SYNCED', async () => {
    const service = new CodexHistorySyncService();
    const recovery = service.startRecovery({
        conversationId: 'conv',
        providerIdentity: 'codex',
        purpose: 'tail',
        producer: async () => ({
            conversationId: 'conv',
            syncOutcome: 'synced',
            coverageComplete: false,
            items: [item('tail')]
        })
    });
    await recovery.promise;
    assert.equal(service.getBaseline('conv').syncOutcome, 'partial');
});

test('baseline TTL starts after the last subscriber leaves', () => {
    let now = 1_000;
    const service = new CodexHistorySyncService({
        now: () => now,
        options: { historyBaselineTtlMs: 100 }
    });
    service.registerBaselineItems('conv', [item('a')]);
    const retained = service.retainBaseline('conv');
    assert.ok(retained);
    now += 1_000;
    assert.ok(service.getBaseline('conv'));
    assert.equal(service.releaseBaseline('conv', retained), true);
    assert.ok(service.getBaseline('conv'));
    now += 101;
    assert.equal(service.getBaseline('conv'), undefined);
});

test('baseline byte budget evicts the oldest unsubscribed baseline but never an active subscriber', () => {
    const service = new CodexHistorySyncService({
        options: { historyBaselineByteBudget: 300 }
    });
    service.registerBaselineItems('a', [item('a')]);
    const active = service.retainBaseline('a');
    assert.ok(active);
    service.registerBaselineItems('b', [item('b')]);
    const stats = service.getBaselineStats();
    assert.ok(stats.entries.some((entry) => entry.conversationId === 'a'));
    assert.equal(service.getBaseline('b'), undefined);
    service.releaseBaseline('a', active);
});

test('same recovery lane shares one producer and detaching one waiter keeps the producer alive', async () => {
    const service = new CodexHistorySyncService();
    let calls = 0;
    let resolveProducer;
    let producerContext;
    const result = {
        conversationId: 'conv',
        providerMode: 'legacy',
        resultKind: 'full',
        items: [item('a')]
    };
    const gate = new Promise((resolve) => { resolveProducer = resolve; });
    const producer = async (context) => {
        calls += 1;
        producerContext = context;
        await gate;
        return result;
    };
    const first = service.startRecovery({ conversationId: 'conv', providerIdentity: 'codex', purpose: 'full', producer, waiterId: 'first' });
    const second = service.startRecovery({ conversationId: 'conv', providerIdentity: 'codex', purpose: 'full', producer, waiterId: 'second' });
    assert.equal(first.shared, false);
    assert.equal(second.shared, true);
    assert.equal(calls, 1);
    assert.equal(service.getRecoveryFlight({ conversationId: 'conv', providerIdentity: 'codex', purpose: 'full' }).waiterCount, 2);
    assert.equal(first.detach(), true);
    await assert.rejects(first.promise, (error) => error.code === 'history_recovery_waiter_detached');
    assert.equal(producerContext.signal.aborted, false);
    resolveProducer();
    assert.deepEqual(await second.promise, result);
    assert.equal(service.getRecoveryFlight({ conversationId: 'conv', providerIdentity: 'codex', purpose: 'full' }), null);
    assert.deepEqual(service.getBaseline('conv').items.map((entry) => entry.itemKey), ['a']);
    assert.equal(service.getBaseline('conv').complete, false);
    assert.equal(service.getBaseline('conv').syncOutcome, 'synced');
});

test('last recovery waiter aborts the producer and discards a late result', async () => {
    const service = new CodexHistorySyncService();
    let resolveProducer;
    let producerContext;
    const gate = new Promise((resolve) => { resolveProducer = resolve; });
    const waiter = service.startRecovery({
        conversationId: 'conv',
        providerIdentity: 'codex',
        purpose: 'tail',
        producer: async (context) => {
            producerContext = context;
            await gate;
            return { conversationId: 'conv', resultKind: 'tail', items: [item('late')] };
        }
    });
    assert.equal(waiter.detach(), true);
    await assert.rejects(waiter.promise, (error) => error.code === 'history_recovery_waiter_detached');
    assert.equal(producerContext.signal.aborted, true);
    resolveProducer();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(service.getBaseline('conv'), undefined);
});
