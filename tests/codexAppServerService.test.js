const test = require('node:test');
const assert = require('node:assert/strict');
const CodexAppServerService = require('../src/services/codexAppServerService');

test('respondToServerRequest preserves the original numeric RPC id', () => {
    const service = new CodexAppServerService();
    const sent = [];
    service.sendRaw = (message) => {
        sent.push(message);
    };

    service.handleServerRequest({
        id: 7,
        method: 'item/tool/requestUserInput',
        params: {
            questions: [
                {
                    id: 'choice',
                    options: [{ label: 'Alpha' }]
                }
            ]
        }
    });

    service.respondToServerRequest('7', {
        result: {
            answers: {
                choice: { answers: ['Alpha'] }
            }
        }
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].id, 7);
    assert.deepEqual(sent[0].result, {
        answers: {
            choice: { answers: ['Alpha'] }
        }
    });
});
