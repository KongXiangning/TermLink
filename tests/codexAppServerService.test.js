const test = require('node:test');
const assert = require('node:assert/strict');

const CodexAppServerService = require('../src/services/codexAppServerService');

test('buildCodexAppServerArgs injects approval and sandbox overrides into app-server launch args', () => {
    const args = CodexAppServerService.buildCodexAppServerArgs({
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    });

    assert.deepEqual(args, [
        'app-server',
        '-c',
        'approval_policy="never"',
        '-c',
        'sandbox_mode="danger-full-access"',
        '--listen',
        'stdio://',
        '--analytics-default-enabled'
    ]);
});

test('buildCodexAppServerArgs omits invalid override values', () => {
    const args = CodexAppServerService.buildCodexAppServerArgs({
        approvalPolicy: 'bogus',
        sandboxMode: 'bogus'
    });

    assert.deepEqual(args, [
        'app-server',
        '--listen',
        'stdio://',
        '--analytics-default-enabled'
    ]);
});

test('managed owner defers permissions and plan implementation requests to the client', () => {
    const service = new CodexAppServerService();

    assert.equal(service.shouldDeferServerRequest('item/permissions/requestApproval'), true);
    assert.equal(service.shouldDeferServerRequest('item/plan/requestImplementation'), true);
    assert.equal(service.shouldDeferServerRequest('unknown/request'), false);
});
