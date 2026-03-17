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
