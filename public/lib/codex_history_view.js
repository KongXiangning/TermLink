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

    function normalizeBoolean(value) {
        return value === true;
    }

    function normalizeTitle(value, fallbackId) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return normalized || `Thread ${fallbackId}`;
    }

    function buildPendingBadge(actionKind) {
        return ({
            open: 'Opening',
            fork: 'Forking',
            rename: 'Renaming',
            archive: 'Archiving',
            unarchive: 'Restoring'
        })[actionKind] || 'Working';
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
        const actionKind = typeof state.actionKind === 'string' ? state.actionKind.trim() : '';
        const disabledBecauseRunning = state.status === 'running';
        const threads = Array.isArray(state.threads) ? state.threads : [];

        return threads
            .filter((thread) => thread && typeof thread === 'object')
            .map((thread) => {
                const id = normalizeThreadId(thread.id);
                if (!id) return null;
                const active = id === currentThreadId;
                const saved = id === lastCodexThreadId;
                const archived = normalizeBoolean(thread.archived) || normalizeBoolean(thread.isArchived);
                const pending = id === actionThreadId;
                const badges = [];
                if (active) badges.push('Current');
                if (saved && !active) badges.push('Saved');
                if (archived) badges.push('Archived');
                if (pending) badges.push(buildPendingBadge(actionKind));
                const openDisabled = pending || (disabledBecauseRunning && !active);
                const mutationDisabled = pending || disabledBecauseRunning || active;
                const renameDisabled = pending || disabledBecauseRunning;
                return {
                    id,
                    title: normalizeTitle(thread.title, id),
                    badges,
                    active,
                    archived,
                    saved,
                    pending,
                    actions: [
                        {
                            kind: 'open',
                            label: active ? '当前' : (pending && actionKind === 'open' ? '打开中...' : '打开'),
                            disabled: openDisabled,
                            primary: true
                        },
                        {
                            kind: 'fork',
                            label: pending && actionKind === 'fork' ? '分支中...' : '创建分支',
                            disabled: mutationDisabled,
                            primary: false
                        },
                        {
                            kind: 'rename',
                            label: pending && actionKind === 'rename' ? '重命名中...' : '重命名',
                            disabled: renameDisabled,
                            primary: false
                        },
                        archived
                            ? {
                                kind: 'unarchive',
                                label: pending && actionKind === 'unarchive' ? '恢复中...' : '取消归档',
                                disabled: mutationDisabled,
                                primary: false
                            }
                            : {
                                kind: 'archive',
                                label: pending && actionKind === 'archive' ? '归档中...' : '归档',
                                disabled: mutationDisabled,
                                primary: false
                            }
                    ]
                };
            })
            .filter(Boolean);
    }

    return {
        buildHistoryEntries,
        shouldShowHistoryPanel
    };
}));
