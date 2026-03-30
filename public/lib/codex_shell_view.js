(function shellViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexShellView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createShellViewApi() {
    const t = typeof globalThis !== 'undefined' && typeof globalThis.t === 'function' ? globalThis.t : (k) => k;
    function normalizeSessionMode(value) {
        return typeof value === 'string' ? value.trim().toLowerCase() : '';
    }

    function normalizeCapabilities(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function normalizeThreadId(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function normalizeCwd(value) {
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function normalizeTitle(value) {
        const normalized = typeof value === 'string' && value.trim() ? value.trim() : '';
        if (!normalized) {
            return '';
        }
        if (/[\u0000-\u001F\u007F\uFFFD]/.test(normalized)) {
            return '';
        }
        if (/[\u0E00-\u0E7F]/.test(normalized)) {
            return '';
        }
        if (/[?？]/.test(normalized) && normalized.length >= 12) {
            return '';
        }
        return normalized;
    }

    function normalizeStatus(value) {
        return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'idle';
    }

    function localizeStatus(status) {
        switch (normalizeStatus(status)) {
        case 'running':
            return t('codex.shell.status.running');
        case 'streaming':
            return t('codex.shell.status.streaming');
        case 'waiting_approval':
            return t('codex.shell.status.waitingApproval');
        case 'error':
            return t('codex.shell.status.error');
        default:
            return t('codex.shell.status.idle');
        }
    }

    function shortenThreadId(threadId) {
        if (threadId.length <= 24) {
            return threadId;
        }
        return `${threadId.slice(0, 8)}...${threadId.slice(-6)}`;
    }

    function getSecondaryEntryAvailability(input) {
        const state = input && typeof input === 'object' ? input : {};
        const sessionMode = normalizeSessionMode(state.sessionMode);
        const capabilities = normalizeCapabilities(state.capabilities);
        const isCodex = sessionMode === 'codex';
        return {
            threads: isCodex && capabilities.historyList === true,
            settings: false,
            runtime: isCodex && capabilities.diffPlanReasoning === true,
            notices: isCodex && state.hasNonBlockingNotice === true,
            tools: isCodex && (capabilities.skillsList === true || capabilities.compact === true)
        };
    }

    function shouldShowInterrupt(input) {
        const state = input && typeof input === 'object' ? input : {};
        const status = normalizeStatus(state.status);
        if (status === 'running' || status === 'streaming' || status === 'waiting_approval') {
            return true;
        }
        return !!normalizeThreadId(state.currentTurnId) || state.approvalPending === true;
    }

    function buildThreadSummary(input) {
        const state = input && typeof input === 'object' ? input : {};
        const threadId = normalizeThreadId(state.threadId);
        const threadTitle = normalizeTitle(state.threadTitle);
        const cwd = normalizeCwd(state.cwd);
        const statusLabel = localizeStatus(state.status);

        if (!threadId) {
            return {
                titleText: t('codex.shell.threadNotReady'),
                metaText: cwd
                    ? t('codex.shell.metaWithCwd', { cwd, status: statusLabel })
                    : t('codex.shell.metaAutoCreate', { status: statusLabel }),
                empty: true
            };
        }

        return {
            titleText: threadTitle || t('codex.shell.currentThread', { id: shortenThreadId(threadId) }),
            metaText: t('codex.shell.metaWithCwd', { cwd: cwd || t('codex.shell.workspaceDefault'), status: statusLabel }),
            empty: false
        };
    }

    return {
        buildThreadSummary,
        getSecondaryEntryAvailability,
        shouldShowInterrupt
    };
}));
