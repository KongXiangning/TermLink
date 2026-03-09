(function historyViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexHistoryView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createHistoryViewApi() {
    function normalizeThreadId(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function normalizeTitle(value, fallbackId) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return normalized || `Thread ${fallbackId}`;
    }

    function shouldShowHistoryPanel(input) {
        const state = input && typeof input === 'object' ? input : {};
        const sessionMode = typeof state.sessionMode === 'string' ? state.sessionMode.trim().toLowerCase() : '';
        const capabilities = state.capabilities && typeof state.capabilities === 'object'
            ? state.capabilities
            : {};
        return sessionMode === 'codex' && capabilities.historyList === true;
    }

    function buildHistoryEntries(input) {
        const state = input && typeof input === 'object' ? input : {};
        const currentThreadId = normalizeThreadId(state.currentThreadId);
        const lastCodexThreadId = normalizeThreadId(state.lastCodexThreadId);
        const actionThreadId = normalizeThreadId(state.actionThreadId);
        const disabledBecauseRunning = state.status === 'running';
        const threads = Array.isArray(state.threads) ? state.threads : [];

        return threads
            .filter((thread) => thread && typeof thread === 'object')
            .map((thread) => {
                const id = normalizeThreadId(thread.id);
                if (!id) return null;
                const active = id === currentThreadId;
                const saved = id === lastCodexThreadId;
                const pending = id === actionThreadId;
                const badges = [];
                if (active) badges.push('Current');
                if (saved && !active) badges.push('Saved');
                if (pending) badges.push('Opening');
                return {
                    id,
                    title: normalizeTitle(thread.title, id),
                    badges,
                    active,
                    saved,
                    pending,
                    disabled: pending || (disabledBecauseRunning && !active)
                };
            })
            .filter(Boolean);
    }

    return {
        buildHistoryEntries,
        shouldShowHistoryPanel
    };
}));
