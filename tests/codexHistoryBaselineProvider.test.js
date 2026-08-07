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
        historyMode: 'legacy',
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
    assert.equal(baseline.mode, 'legacy');
    assert.equal(baseline.complete, false);
    assert.equal(baseline.coverageComplete, false);
    assert.equal(baseline.items.length, 1);
    assert.equal(baseline.items[0].payloadJson.includes('turns'), false);
    assert.equal(baseline.sourceEpoch, 'recovery:123');
});

test('baseline provider fails closed when history mode is unknown without calling full read', async () => {
    let reads = 0;
    const provider = new CodexHistoryBaselineProvider({
        historyMode: 'legacy',
        readThread: async () => {
            reads += 1;
            return { thread: { id: 'conv', turns: [] } };
        },
        probeThread: async () => ({ thread: { id: 'conv' } })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_HISTORY_MODE_UNKNOWN');
        return true;
    });
    assert.equal(reads, 0);
});

test('paginated mode never falls back to thread/read', async () => {
    let fullReads = 0;
    const provider = new CodexHistoryBaselineProvider({
        readThread: async () => {
            fullReads += 1;
            return { thread: { id: 'conv', turns: [] } };
        },
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'paginated' } })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_PAGINATED_UNSUPPORTED');
        return true;
    });
    assert.equal(fullReads, 0);
});

test('paginated reader returns a partial upsert-only page with exact identity', async () => {
    let fullReads = 0;
    const provider = new CodexHistoryBaselineProvider({
        readThread: async () => {
            fullReads += 1;
            throw new Error('full thread/read must not be called');
        },
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'paginated' } }),
        readPaginatedTurns: async () => ({
            threadId: 'conv',
            data: [{ id: 'turn', status: 'completed', items: [{ id: 'item', type: 'agentMessage', text: 'tail' }] }],
            nextCursor: 'older-cursor'
        })
    });

    const baseline = await provider.build('conv');
    assert.equal(fullReads, 0);
    assert.equal(baseline.mode, 'paginated');
    assert.equal(baseline.complete, false);
    assert.equal(baseline.items.length, 1);
    assert.equal(baseline.nextCursor, 'older-cursor');
});

test('paginated item pages normalize desc order and preserve an explicit older-cursor null', async () => {
    let requestedOptions = null;
    const provider = new CodexHistoryBaselineProvider({
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'paginated' } }),
        readPaginatedTurns: async (_conversationId, options) => {
            requestedOptions = options;
            return {
                threadId: 'conv',
                data: [
                    { id: 'new-item', type: 'agentMessage', text: 'new' },
                    { id: 'old-item', type: 'userMessage', text: 'old' }
                ],
                nextCursor: null,
                backwardsCursor: 'newer-cursor'
            };
        }
    });

    const baseline = await provider.build('conv', { positionOffset: 10 });
    assert.equal(requestedOptions.sortDirection, 'desc');
    assert.deepEqual(baseline.items.map((item) => item.itemKey), ['old-item', 'new-item']);
    assert.deepEqual(baseline.items.map((item) => item.position), [10, 11]);
    assert.equal(baseline.nextCursor, null);
});

test('paginated turn pages reverse only turn order, not item order inside a turn', async () => {
    const provider = new CodexHistoryBaselineProvider({
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'paginated' } }),
        readPaginatedTurns: async () => ({
            threadId: 'conv',
            data: [
                { id: 'new-turn', status: 'completed', items: [{ id: 'new-item', type: 'agentMessage', text: 'new' }] },
                {
                    id: 'old-turn',
                    status: 'completed',
                    items: [
                        { id: 'old-user', type: 'userMessage', text: 'old user' },
                        { id: 'old-agent', type: 'agentMessage', text: 'old agent' }
                    ]
                },
                { id: 'summary-turn', status: 'completed' }
            ],
            sortDirection: 'desc',
            nextCursor: 'older-cursor'
        })
    });

    const baseline = await provider.build('conv');
    assert.deepEqual(baseline.items.map((item) => item.itemKey), ['old-user', 'old-agent', 'new-item']);
});

test('ephemeral history is explicitly unsupported', async () => {
    let reads = 0;
    const provider = new CodexHistoryBaselineProvider({
        readThread: async () => {
            reads += 1;
            return { thread: { id: 'conv', turns: [] } };
        },
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'ephemeral' } })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_EPHEMERAL_UNSUPPORTED');
        return true;
    });
    assert.equal(reads, 0);
});

test('baseline provider rejects a response whose canonical thread id differs', async () => {
    const provider = new CodexHistoryBaselineProvider({
        historyMode: 'legacy',
        readThread: async () => ({
            thread: {
                id: 'other-conversation',
                turns: []
            }
        })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_THREAD_ID_MISMATCH');
        return true;
    });
});

test('baseline provider rejects a mismatching probe identity before the full read', async () => {
    let reads = 0;
    const provider = new CodexHistoryBaselineProvider({
        readThread: async () => {
            reads += 1;
            return { thread: { id: 'conv', turns: [] } };
        },
        probeThread: async () => ({ thread: { id: 'other-conversation', historyMode: 'legacy' } })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_THREAD_ID_MISMATCH');
        return true;
    });
    assert.equal(reads, 0);
});

test('baseline provider rejects a payload mode that contradicts the probe', async () => {
    const provider = new CodexHistoryBaselineProvider({
        probeThread: async () => ({ thread: { id: 'conv', historyMode: 'legacy' } }),
        readLegacyThread: async () => ({ thread: { id: 'conv', historyMode: 'paginated', turns: [] } })
    });

    await assert.rejects(() => provider.build('conv'), (error) => {
        assert.equal(error.code, 'HISTORY_RECOVERY_HISTORY_MODE_MISMATCH');
        return true;
    });
});

test('baseline provider blocks a fixture larger than the recovery guard', async () => {
    const provider = new CodexHistoryBaselineProvider({
        historyMode: 'legacy',
        maxBaselineBytes: 16,
        readThread: async () => ({ thread: { id: 'conv', turns: [{ id: 't', items: [{ id: 'i', text: 'too large' }] }] } })
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
        historyMode: 'legacy',
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
