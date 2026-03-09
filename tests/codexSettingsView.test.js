const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeStoredCodexConfig,
    areCodexConfigsEqual,
    shouldShowSettingsPanel,
    buildCodexConfigPayload
} = require('../public/lib/codex_settings_view');

test('normalizeStoredCodexConfig preserves nullable stored config', () => {
    assert.equal(normalizeStoredCodexConfig(null), null);
    assert.equal(normalizeStoredCodexConfig(undefined), null);
    assert.equal(normalizeStoredCodexConfig({}), null);

    assert.deepEqual(normalizeStoredCodexConfig({
        defaultModel: ' gpt-5-codex ',
        defaultReasoningEffort: 'high',
        defaultPersonality: 'friendly',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    }), {
        defaultModel: 'gpt-5-codex',
        defaultReasoningEffort: 'high',
        defaultPersonality: 'friendly',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    });
});

test('areCodexConfigsEqual compares normalized stored configs', () => {
    assert.equal(areCodexConfigsEqual(null, {}), true);
    assert.equal(areCodexConfigsEqual({
        defaultModel: 'gpt-5-codex',
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    }, {
        defaultModel: ' gpt-5-codex ',
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    }), true);
});

test('shouldShowSettingsPanel requires codex mode and modelConfig capability', () => {
    assert.equal(shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: true }
    }), true);

    assert.equal(shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: false, rateLimitsRead: true }
    }), true);

    assert.equal(shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: false, rateLimitsRead: false }
    }), false);

    assert.equal(shouldShowSettingsPanel({
        sessionMode: 'terminal',
        capabilities: { modelConfig: true }
    }), false);
});

test('buildCodexConfigPayload emits null for server defaults and normalized object otherwise', () => {
    assert.equal(buildCodexConfigPayload({
        useServerDefaults: true
    }), null);

    assert.deepEqual(buildCodexConfigPayload({
        useServerDefaults: false,
        defaultModel: ' gpt-5-codex ',
        defaultReasoningEffort: 'medium',
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'danger-full-access'
    }), {
        defaultModel: 'gpt-5-codex',
        defaultReasoningEffort: 'medium',
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'danger-full-access'
    });
});
