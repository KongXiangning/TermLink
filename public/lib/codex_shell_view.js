(function shellViewModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root && typeof root === 'object') {
        root.TermLinkCodexShellView = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createShellViewApi() {
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
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    }

    function normalizeStatus(value) {
        return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'idle';
    }

    function localizeStatus(status) {
        switch (normalizeStatus(status)) {
        case 'running':
            return '执行中';
        case 'streaming':
            return '输出中';
        case 'waiting_approval':
            return '等待审批';
        case 'error':
            return '错误';
        default:
            return '空闲';
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
            settings: isCodex && (capabilities.modelConfig === true || capabilities.rateLimitsRead === true),
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
                titleText: '当前线程未就绪',
                metaText: cwd
                    ? `工作区：${cwd} · 状态：${statusLabel}`
                    : `即将自动创建新线程 · 状态：${statusLabel}`,
                empty: true
            };
        }

        return {
            titleText: threadTitle || `当前线程 ${shortenThreadId(threadId)}`,
            metaText: `${cwd ? `工作区：${cwd}` : '工作区：默认目录'} · 状态：${statusLabel}`,
            empty: false
        };
    }

    return {
        buildThreadSummary,
        getSecondaryEntryAvailability,
        shouldShowInterrupt
    };
}));
