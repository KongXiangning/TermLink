'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canonicalize,
    hashPayload,
    buildConversationRoot,
    projectCanonicalHistory
} = require('../src/services/codexHistoryCanonicalizer');

test('canonical JSON sorts object keys but preserves array order', () => {
    assert.equal(canonicalize({ b: 1, a: { z: 2, y: 1 }, list: [2, 1] }), '{"a":{"y":1,"z":2},"b":1,"list":[2,1]}');
    assert.equal(canonicalize({ revision: 4, updatedAt: 123, text: 'x' }), '{"text":"x"}');
});

test('canonical history chooses stable ids and maps client request id', () => {
    const items = projectCanonicalHistory({
        sourceKind: 'app_server_thread',
        sourceData: {
            turns: [{
                id: 'turn-1', status: 'completed', items: [
                    { type: 'userMessage', id: 'item-1', clientId: 'client-1', text: 'hello' },
                    { type: 'agentMessage', id: 'item-2', text: 'world', updatedAt: Date.now() }
                ]
            }]
        }
    });
    assert.deepEqual(items.map((item) => item.itemKey), ['item-1', 'item-2']);
    assert.equal(items[0].clientRequestId, 'client-1');
    assert.equal(items[1].payloadJson.includes('updatedAt'), false);
});

test('unstable running items are omitted and become stable on terminal baseline', () => {
    const running = projectCanonicalHistory({ sourceKind: 'app_server_thread', sourceData: { turns: [{ id: 't', status: 'inProgress', items: [{ type: 'agentMessage', text: 'stream' }] }] } });
    const completed = projectCanonicalHistory({ sourceKind: 'app_server_thread', sourceData: { turns: [{ id: 't', status: 'completed', items: [{ type: 'agentMessage', text: 'stream' }] }] } });
    assert.equal(running.length, 0);
    assert.equal(completed[0].identityStability, 'stable');
    assert.equal(completed[0].itemKey, 't:assistant_message:final:0');
});

test('conversation root is stable for equivalent item payloads', () => {
    const left = [{ itemKey: 'a', position: 0, contentHash: hashPayload('{"a":1}') }];
    const right = [{ itemKey: 'a', position: 0, contentHash: hashPayload('{"a":1}') }];
    assert.equal(buildConversationRoot(left), buildConversationRoot(right));
});
