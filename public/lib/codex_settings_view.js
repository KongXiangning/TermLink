(function settingsViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexSettingsView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsViewApi() {
    const t = typeof globalThis !== 'undefined' && typeof globalThis.t === 'function' ? globalThis.t : (k) => k;
    const VALID_PERSONALITIES = new Set(['none', 'friendly', 'pragmatic']);
    const VALID_APPROVAL_POLICIES = new Set(['untrusted', 'on-failure', 'on-request', 'never']);
    const VALID_SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access']);

    function normalizeOptionalString(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    function normalizeOptionalEnum(value, validValues) {
        const normalized = normalizeOptionalString(value);
        if (!normalized) {
            return null;
        }
        const lowered = normalized.toLowerCase();
        return validValues.has(lowered) ? lowered : null;
    }

    function normalizeStoredCodexConfig(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        const defaultPersonality = normalizeOptionalEnum(value.defaultPersonality, VALID_PERSONALITIES);
        const approvalPolicy = normalizeOptionalEnum(value.approvalPolicy, VALID_APPROVAL_POLICIES);
        const sandboxMode = normalizeOptionalEnum(value.sandboxMode, VALID_SANDBOX_MODES);

        if (!defaultPersonality && !approvalPolicy && !sandboxMode) {
            return null;
        }

        return {
            defaultPersonality,
            approvalPolicy,
            sandboxMode
        };
    }

    function areCodexConfigsEqual(left, right) {
        return JSON.stringify(normalizeStoredCodexConfig(left)) === JSON.stringify(normalizeStoredCodexConfig(right));
    }

    function shouldShowSettingsPanel(input) {
        const state = input && typeof input === 'object' ? input : {};
        const sessionMode = typeof state.sessionMode === 'string' ? state.sessionMode.trim().toLowerCase() : '';
        const capabilities = state.capabilities && typeof state.capabilities === 'object'
            ? state.capabilities
            : {};
        return sessionMode === 'codex'
            && (capabilities.modelConfig === true || capabilities.rateLimitsRead === true);
    }

    function buildCodexConfigPayload(input) {
        const state = input && typeof input === 'object' ? input : {};
        const payload = {
            defaultPersonality: normalizeOptionalEnum(state.defaultPersonality, VALID_PERSONALITIES),
            approvalPolicy: normalizeOptionalEnum(state.approvalPolicy, VALID_APPROVAL_POLICIES),
            sandboxMode: normalizeOptionalEnum(state.sandboxMode, VALID_SANDBOX_MODES)
        };
        return payload.defaultPersonality || payload.approvalPolicy || payload.sandboxMode
            ? payload
            : null;
    }

    function derivePermissionPreset(input) {
        const config = input && typeof input === 'object' ? input : {};
        const approvalPolicy = normalizeOptionalEnum(config.approvalPolicy, VALID_APPROVAL_POLICIES);
        const sandboxMode = normalizeOptionalEnum(config.sandboxMode, VALID_SANDBOX_MODES);

        if (approvalPolicy === 'on-request' && sandboxMode === 'workspace-write') {
            return 'default';
        }
        if (approvalPolicy === 'never' && sandboxMode === 'danger-full-access') {
            return 'full';
        }
        return 'custom';
    }

    function resolvePermissionPresetMeta(input) {
        const preset = derivePermissionPreset(input);
        if (preset === 'default') {
            return {
                key: preset,
                label: t('codex.settings.permission.default'),
                hint: t('codex.settings.hint.default')
            };
        }
        if (preset === 'full') {
            return {
                key: preset,
                label: t('codex.settings.permission.full'),
                hint: t('codex.settings.hint.full')
            };
        }
        return {
            key: 'custom',
            label: t('codex.settings.permission.custom'),
            hint: t('codex.settings.hint.custom')
        };
    }

    function applyPermissionPreset(preset, input) {
        const next = normalizeStoredCodexConfig(input) || {
            defaultPersonality: null,
            approvalPolicy: null,
            sandboxMode: null
        };
        if (preset === 'default') {
            return {
                ...next,
                approvalPolicy: 'on-request',
                sandboxMode: 'workspace-write'
            };
        }
        if (preset === 'full') {
            return {
                ...next,
                approvalPolicy: 'never',
                sandboxMode: 'danger-full-access'
            };
        }
        return next;
    }

    return {
        normalizeStoredCodexConfig,
        areCodexConfigsEqual,
        shouldShowSettingsPanel,
        buildCodexConfigPayload,
        derivePermissionPreset,
        resolvePermissionPresetMeta,
        applyPermissionPreset
    };
}));
