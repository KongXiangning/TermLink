(function bootstrapModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexBootstrap = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createBootstrapApi() {
    function normalizeMode(value) {
        const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
        return raw === 'codex' ? 'codex' : 'terminal';
    }

    function normalizeThreadId(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function isTransientBridgeError(errorLike) {
        const code = errorLike && typeof errorLike.code === 'string'
            ? errorLike.code.trim().toUpperCase()
            : '';
        return code === 'CODEX_BRIDGE_RESTARTED'
            || code === 'CODEX_BRIDGE_CLOSED'
            || code === 'CODEX_BRIDGE_NOT_CONNECTED';
    }

    function shouldReadThreadSnapshot(input) {
        const state = input && typeof input === 'object' ? input : {};
        const threadId = normalizeThreadId(state.threadId);
        const lastSnapshotThreadId = normalizeThreadId(state.lastSnapshotThreadId);
        const force = state.force === true;
        const unmaterializedThreadId = normalizeThreadId(state.unmaterializedThreadId);
        const pendingFreshThread = state.pendingFreshThread === true;

        if (!threadId) {
            return false;
        }
        if (pendingFreshThread && !lastSnapshotThreadId) {
            return false;
        }
        if (unmaterializedThreadId && unmaterializedThreadId === threadId) {
            return false;
        }
        if (!force && threadId === lastSnapshotThreadId) {
            return false;
        }
        return true;
    }

    function planBootstrap(input) {
        const state = input && typeof input === 'object' ? input : {};
        const mode = normalizeMode(state.sessionMode);
        const threadId = normalizeThreadId(state.threadId);
        const lastCodexThreadId = normalizeThreadId(state.lastCodexThreadId);
        const capabilities = state.capabilities && typeof state.capabilities === 'object'
            ? state.capabilities
            : {};

        const shouldFetchHistoryList = mode === 'codex' && capabilities.historyList === true;
        if (mode !== 'codex') {
            return {
                shouldFetchHistoryList,
                action: null
            };
        }

        if (threadId) {
            return {
                shouldFetchHistoryList,
                action: null
            };
        }

        if (capabilities.historyResume === true && lastCodexThreadId) {
            return {
                shouldFetchHistoryList,
                action: {
                    type: 'resume',
                    threadId: lastCodexThreadId
                }
            };
        }

        return {
            shouldFetchHistoryList,
            action: {
                type: 'new_thread'
            }
        };
    }

    return {
        planBootstrap,
        isTransientBridgeError,
        shouldReadThreadSnapshot
    };
}));
