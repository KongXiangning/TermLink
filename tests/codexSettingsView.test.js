const test = require('node:test');
const assert = require('node:assert/strict');
const { setupTestI18n } = require('./_i18n_helper');
setupTestI18n();

const settingsView = require('../public/lib/codex_settings_view');

test('normalizeStoredCodexConfig preserves nullable stored config', () => {
    assert.equal(settingsView.normalizeStoredCodexConfig(null), null);
    assert.equal(settingsView.normalizeStoredCodexConfig(undefined), null);
    assert.equal(settingsView.normalizeStoredCodexConfig({}), null);

    assert.deepEqual(settingsView.normalizeStoredCodexConfig({
        defaultPersonality: 'friendly',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    }), {
        defaultPersonality: 'friendly',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    });
});

test('areCodexConfigsEqual compares normalized stored configs', () => {
    assert.equal(settingsView.areCodexConfigsEqual(null, {}), true);
    assert.equal(settingsView.areCodexConfigsEqual({
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    }, {
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    }), true);
});

test('shouldShowSettingsPanel requires codex mode and config or limits capability', () => {
    assert.equal(settingsView.shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: true }
    }), true);

    assert.equal(settingsView.shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: false, rateLimitsRead: true }
    }), true);

    assert.equal(settingsView.shouldShowSettingsPanel({
        sessionMode: 'codex',
        capabilities: { modelConfig: false, rateLimitsRead: false }
    }), false);

    assert.equal(settingsView.shouldShowSettingsPanel({
        sessionMode: 'terminal',
        capabilities: { modelConfig: true }
    }), false);
});

test('buildCodexConfigPayload emits null for empty defaults and normalized object otherwise', () => {
    assert.equal(settingsView.buildCodexConfigPayload({
        defaultPersonality: '',
        approvalPolicy: '',
        sandboxMode: ''
    }), null);

    assert.deepEqual(settingsView.buildCodexConfigPayload({
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'danger-full-access'
    }), {
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'danger-full-access'
    });
});

test('derivePermissionPreset maps fixed default and full-access pairs', () => {
    assert.equal(settingsView.derivePermissionPreset({
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    }), 'default');

    assert.equal(settingsView.derivePermissionPreset({
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    }), 'full');

    assert.equal(settingsView.derivePermissionPreset({
        approvalPolicy: 'on-failure',
        sandboxMode: 'workspace-write'
    }), 'custom');
});

test('applyPermissionPreset updates only approval and sandbox values', () => {
    const next = settingsView.applyPermissionPreset('full', {
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'on-request',
        sandboxMode: 'workspace-write'
    });

    assert.deepEqual(next, {
        defaultPersonality: 'pragmatic',
        approvalPolicy: 'never',
        sandboxMode: 'danger-full-access'
    });
});
