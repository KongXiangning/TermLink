'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    CodexMediaStore
} = require('../src/services/codexMediaStore');
const {
    projectMobileSurface,
    projectMobileRealtimeSurface,
    MOBILE_REALTIME_SURFACE_MAX_BYTES,
    containsImageDataUrl,
    redactImageDataUrls
} = require('../src/services/codexMobileSurfaceProjector');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('mobile surface projection externalizes image data without mutating IPC source', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-media-project-'));
    const store = await new CodexMediaStore({ rootDir: root }).init();
    const source = { items: [{ id: 'item', image: PNG_DATA_URL }], nested: [PNG_DATA_URL] };
    const projected = await projectMobileSurface(source, { mediaStore: store });
    assert.equal(source.items[0].image, PNG_DATA_URL);
    assert.equal(containsImageDataUrl(projected), false);
    assert.equal(projected.items[0].image.kind, 'image');
    assert.match(projected.items[0].image.originalPath, /\/api\/codex\/media\/[0-9a-f]{64}$/);
    assert.equal(projected.items[0].image.thumbnailUnavailable, false);
});

test('mobile projection failure redacts data instead of sending raw bytes', () => {
    const redacted = redactImageDataUrls({ image: PNG_DATA_URL });
    assert.equal(containsImageDataUrl(redacted), false);
    assert.deepEqual(redacted.image, {
        kind: 'image',
        mimeType: 'image/png',
        unavailable: true,
        thumbnailUnavailable: true
    });
});

test('mobile surface projection externalizes image data embedded in message text', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-media-text-'));
    const store = await new CodexMediaStore({ rootDir: root }).init();
    const source = {
        items: [{
            id: 'item',
            kind: 'message',
            text: `截图：![preview](${PNG_DATA_URL})`
        }]
    };
    const projected = await projectMobileSurface(source, { mediaStore: store });
    assert.equal(source.items[0].text.includes(PNG_DATA_URL), true);
    assert.equal(containsImageDataUrl(projected), false);
    assert.match(projected.items[0].text, /\/api\/codex\/media\/[0-9a-f]{64}/);
    assert.equal(projected.items[0].attachments.length, 1);
    assert.equal(projected.items[0].attachments[0].media.kind, 'image');
});

test('containsImageDataUrl detects embedded data without leaking it in redaction', () => {
    const source = `before ${PNG_DATA_URL} after`;
    assert.equal(containsImageDataUrl({ text: source }), true);
    const redacted = redactImageDataUrls({ text: source });
    assert.equal(containsImageDataUrl(redacted), false);
    assert.doesNotMatch(redacted.text, /data:image/i);
});

test('mobile realtime projection keeps a bounded live tail instead of full history', async () => {
    const source = {
        conversationId: 'conversation',
        status: 'running',
        latestTurnId: 'turn-latest',
        items: Array.from({ length: 1_500 }, (_, index) => ({
            key: `item-${index}`,
            kind: 'message',
            turnId: index === 1_499 ? 'turn-latest' : `turn-${index}`,
            text: `message-${index}`
        }))
    };
    const projected = await projectMobileRealtimeSurface(source);
    assert.ok(projected.items.length < source.items.length);
    assert.equal(projected.items.at(-1).key, 'item-1499');
    assert.ok(Buffer.byteLength(JSON.stringify(projected), 'utf8') <= MOBILE_REALTIME_SURFACE_MAX_BYTES);
    assert.equal(source.items.length, 1_500);
});
