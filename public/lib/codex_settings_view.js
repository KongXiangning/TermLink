(function settingsViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexSettingsView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsViewApi() {
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

    return {
        normalizeStoredCodexConfig,
        areCodexConfigsEqual,
        shouldShowSettingsPanel,
        buildCodexConfigPayload
    };
}));
