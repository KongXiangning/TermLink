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
    CodexHistorySyncService
} = require('../src/services/codexHistorySyncService');

function item(itemKey, contentHash = itemKey) { return { itemKey, contentHash, payloadJson: JSON.stringify({ itemKey }) }; }

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

test('delta pages share sequence roots and have deterministic page hashes', () => {
    const pages = buildDeltaPages({ syncId: 'sync', sequence: 1, baseRoot: 'a', targetRoot: 'b', upserts: [item('a'), item('b')], maxItems: 1 });
    assert.equal(pages.length, 2);
    assert.ok(pages.every((page) => page.pageCount === 2 && page.baseRoot === 'a' && page.targetRoot === 'b'));
    assert.equal(pages[0].pageHash, computeHistoryPageHash(pages[0]));
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
