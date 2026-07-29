'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CodexMediaStore } = require('../src/services/codexMediaStore');

test('media store content-addresses image data and deduplicates it', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-media-'));
    const store = await new CodexMediaStore({ rootDir: root }).init();
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const first = await store.put({ bytes, mimeType: 'image/png' });
    const second = await store.put({ bytes, mimeType: 'image/png' });
    assert.equal(first.contentHash, second.contentHash);
    assert.equal((await fs.promises.readdir(root)).length, 1);
});

test('media store rejects paths outside trusted roots', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-media-'));
    const store = await new CodexMediaStore({ rootDir: root }).init();
    await assert.rejects(() => store.put({ path: path.join(os.tmpdir(), 'missing-image.png') }), /media_path_not_allowed/);
});
