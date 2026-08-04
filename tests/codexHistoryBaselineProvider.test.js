'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    CodexHistoryBaselineProvider,
    DEFAULT_MAX_BASELINE_BYTES
} = require('../src/services/codexHistoryBaselineProvider');
const { CodexMediaStore } = require('../src/services/codexMediaStore');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('baseline provider canonicalizes upstream thread without exposing raw response', async () => {
    const provider = new CodexHistoryBaselineProvider({
        readThread: async () => ({
            thread: {
                id: 'conv',
                turns: [{ id: 'turn', status: 'completed', items: [{ id: 'item', type: 'agentMessage', text: 'hello' }] }]
            }
        }),
        now: () => 123
    });
    const baseline = await provider.build('conv');
    assert.equal(baseline.conversationId, 'conv');
    assert.equal(baseline.complete, true);
    assert.equal(baseline.items.length, 1);
    assert.equal(baseline.items[0].payloadJson.includes('turns'), false);
    assert.equal(baseline.sourceEpoch, 'recovery:123');
});

test('baseline provider blocks a fixture larger than the recovery guard', async () => {
    const provider = new CodexHistoryBaselineProvider({
        maxBaselineBytes: 16,
        readThread: async () => ({ thread: { turns: [{ id: 't', items: [{ id: 'i', text: 'too large' }] }] } })
    });
    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_BASELINE_TOO_LARGE');
        return true;
    });
    assert.equal(DEFAULT_MAX_BASELINE_BYTES, 70 * 1024 * 1024);
});

test('baseline provider externalizes embedded image data before canonical hashing', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-history-media-'));
    const mediaStore = await new CodexMediaStore({ rootDir: root }).init();
    const provider = new CodexHistoryBaselineProvider({
        mediaStore,
        readThread: async () => ({
            thread: {
                id: 'conv',
                turns: [{
                    id: 'turn',
                    status: 'completed',
                    items: [{ id: 'item', type: 'agentMessage', text: `![image](${PNG_DATA_URL})` }]
                }]
            }
        })
    });
    const baseline = await provider.build('conv');
    assert.equal(baseline.items.length, 1);
    assert.equal(baseline.items[0].payloadJson.includes('data:image'), false);
    assert.match(baseline.items[0].payloadJson, /\/api\/codex\/media\/[0-9a-f]{64}/);
});
