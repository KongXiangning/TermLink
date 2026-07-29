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
    const service = new CodexHistorySyncService({ send: (_ws, message) => messages.push(message) });
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
