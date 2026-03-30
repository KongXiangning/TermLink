(function historyViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexHistoryView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createHistoryViewApi() {
    const t = typeof globalThis !== 'undefined' && typeof globalThis.t === 'function' ? globalThis.t : (k) => k;
    function normalizeThreadId(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function normalizeBoolean(value) {
        return value === true;
    }

    function normalizeTitle(value, fallbackId) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (
            /[\u0000-\u001F\u007F\uFFFD]/.test(normalized)
            || /[\u0E00-\u0E7F]/.test(normalized)
            || (/[?？]/.test(normalized) && normalized.length >= 12)
        ) {
            return t('codex.history.threadFallback', { id: fallbackId });
        }
        return normalized || t('codex.history.threadFallback', { id: fallbackId });
    }

    function normalizeTimestamp(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const normalized = value.trim();
        if (!normalized) {
            return '';
        }
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
    }

    function formatTimestamp(value) {
        const normalized = normalizeTimestamp(value);
        if (!normalized) {
            return '';
        }
        return normalized.slice(0, 16).replace('T', ' ');
    }

    function buildPendingBadge(actionKind) {
        return ({
            open: t('codex.history.badge.opening'),
            fork: t('codex.history.badge.forking'),
            rename: t('codex.history.badge.renaming'),
            archive: t('codex.history.badge.archiving'),
            unarchive: t('codex.history.badge.restoring')
        })[actionKind] || t('codex.history.pendingBadge.working');
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
                if (active) badges.push(t('codex.history.badge.current'));
                if (saved && !active) badges.push(t('codex.history.badge.saved'));
                if (archived) badges.push(t('codex.history.badge.archived'));
                if (pending) badges.push(buildPendingBadge(actionKind));
                const openDisabled = pending || (disabledBecauseRunning && !active);
                const mutationDisabled = pending || disabledBecauseRunning || active;
                const renameDisabled = pending || disabledBecauseRunning;
                return {
                    id,
                    title: normalizeTitle(thread.title, id),
                    metaText: thread.lastActiveAt
                        ? t('codex.history.lastActive', { time: formatTimestamp(thread.lastActiveAt) })
                        : (thread.createdAt ? t('codex.history.createdAt', { time: formatTimestamp(thread.createdAt) }) : id),
                    badges,
                    active,
                    archived,
                    saved,
                    pending,
                    actions: [
                        {
                            kind: 'open',
                            label: active ? t('codex.history.action.current') : (pending && actionKind === 'open' ? t('codex.history.action.opening') : t('codex.history.action.open')),
                            disabled: openDisabled,
                            primary: true
                        },
                        {
                            kind: 'fork',
                            label: pending && actionKind === 'fork' ? t('codex.history.action.forking') : t('codex.history.action.fork'),
                            disabled: mutationDisabled,
                            primary: false
                        },
                        {
                            kind: 'rename',
                            label: pending && actionKind === 'rename' ? t('codex.history.action.renaming') : t('codex.history.action.rename'),
                            disabled: renameDisabled,
                            primary: false
                        },
                        archived
                            ? {
                                kind: 'unarchive',
                                label: pending && actionKind === 'unarchive' ? t('codex.history.action.restoring') : t('codex.history.action.unarchive'),
                                disabled: mutationDisabled,
                                primary: false
                            }
                            : {
                                kind: 'archive',
                                label: pending && actionKind === 'archive' ? t('codex.history.action.archiving') : t('codex.history.action.archive'),
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
