'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    CodexHistorySnapshotStore,
    scopeHash
} = require('../src/services/codexHistorySnapshotStore');

function snapshot(conversationId, itemKey = 'item') {
    return {
        conversationId,
        mode: 'legacy',
        items: [{ itemKey, contentHash: itemKey, payloadJson: '{"ok":true}' }],
        rootHash: `root-${itemKey}`,
        complete: true,
        coverageComplete: true,
        resultKind: 'full'
    };
}

test('current snapshot store replaces one scope atomically and isolates profile scopes', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-history-snapshot-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const store = await new CodexHistorySnapshotStore({ rootDir: root, now: () => 123 }).init();
    const first = { profileKey: 'profile-a', conversationId: 'conv' };
    const second = { profileKey: 'profile-b', conversationId: 'conv' };

    await store.write(first, snapshot('conv', 'old'));
    await store.write(first, snapshot('conv', 'new'));
    await store.write(second, snapshot('conv', 'other'));

    assert.equal((await store.read(first)).rootHash, 'root-new');
    assert.equal((await store.read(second)).rootHash, 'root-other');
    assert.notEqual(store.pathFor(first), store.pathFor(second));
    assert.equal(path.basename(store.pathFor(first)), `${scopeHash(first)}.json`);
});

test('current snapshot store fails closed for corrupted or mismatched data', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-history-snapshot-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const store = await new CodexHistorySnapshotStore({ rootDir: root }).init();
    const scope = { profileKey: 'profile', conversationId: 'conv' };
    await store.write(scope, snapshot('conv'));
    await fs.promises.writeFile(store.pathFor(scope), '{not-json', 'utf8');
    assert.equal(await store.read(scope), null);
    assert.equal(fs.existsSync(store.pathFor(scope)), false);
    assert.equal((await fs.promises.readdir(root)).some((name) => name.endsWith('.corrupt')), true);
    await assert.rejects(
        () => store.write(scope, snapshot('other-conversation')),
        (error) => error.code === 'HISTORY_SNAPSHOT_INVALID'
    );
});
