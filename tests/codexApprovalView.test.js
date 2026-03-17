const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadApprovalViewApi() {
    const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'lib', 'codex_approval_view.js'), 'utf8');
    const context = {
        window: {},
        globalThis: {}
    };
    vm.createContext(context);
    vm.runInContext(script, context);
    return context.window.TermLinkCodexApprovalView || context.globalThis.TermLinkCodexApprovalView;
}

test('normalizeApprovalRequest resolves command request metadata', () => {
    const api = loadApprovalViewApi();
    const request = api.normalizeApprovalRequest({
        requestId: 'req-1',
        method: 'execCommandApproval',
        requestKind: 'command',
        responseMode: 'decision',
        handledBy: 'client',
        summary: 'dir'
    });

    assert.equal(request.requestId, 'req-1');
    assert.equal(request.requestKind, 'command');
    assert.equal(request.responseMode, 'decision');
    assert.equal(request.title, '命令确认');
    assert.equal(api.resolveApprovalSummaryText(request), 'dir');
});

test('buildApprovalDecisionResult preserves method-specific decision shape', () => {
    const api = loadApprovalViewApi();

    assert.equal(
        JSON.stringify(api.buildApprovalDecisionResult({
            method: 'item/commandExecution/requestApproval',
            responseMode: 'decision'
        }, true)),
        JSON.stringify({ decision: 'accept' })
    );
    assert.equal(
        JSON.stringify(api.buildApprovalDecisionResult({
            method: 'item/fileChange/requestApproval',
            responseMode: 'decision'
        }, true)),
        JSON.stringify({ decision: 'approve' })
    );
    assert.equal(
        JSON.stringify(api.buildApprovalDecisionResult({
            method: 'applyPatchApproval',
            responseMode: 'decision'
        }, false)),
        JSON.stringify({ decision: 'denied' })
    );
});

test('buildUserInputResult returns answers payload for all selected questions', () => {
    const api = loadApprovalViewApi();
    const result = api.buildUserInputResult({
        responseMode: 'answers',
        questions: [
            { id: 'choice', question: 'Proceed?', options: [{ label: 'Approve' }, { label: 'Reject' }] },
            { id: 'scope', question: 'Scope?', options: [{ label: 'All' }, { label: 'Current only' }] }
        ]
    }, {
        choice: 'Approve',
        scope: 'All'
    });

    assert.equal(JSON.stringify(result), JSON.stringify({
        answers: {
            choice: { answers: ['Approve'] },
            scope: { answers: ['All'] }
        }
    }));
});

test('pickResolvedRequestIds resolves submitted cards absent from the active request id list', () => {
    const api = loadApprovalViewApi();
    const ids = api.pickResolvedRequestIds(['req-1', 'req-4'], [
        { requestId: 'req-1', status: 'pending' },
        { requestId: 'req-2', status: 'submitted' },
        { requestId: 'req-3', status: 'submitted' },
        { requestId: 'req-4', status: 'resolved' }
    ]);

    assert.equal(ids.length, 2);
    assert.equal(ids[0], 'req-2');
    assert.equal(ids[1], 'req-3');
});

test('blocking command approvals expose modal hints and command extraction helpers', () => {
    const api = loadApprovalViewApi();
    const request = api.normalizeApprovalRequest({
        requestId: 'req-command',
        method: 'item/commandExecution/requestApproval',
        requestKind: 'command',
        responseMode: 'decision',
        handledBy: 'client',
        params: {
            command: 'npm test'
        }
    });

    assert.equal(api.shouldUseBlockingModal(request), true);
    assert.equal(api.extractCommandText(request), 'npm test');
    assert.equal(api.resolveApprovalStatusText({ status: 'pending' }), '等待处理');
});
