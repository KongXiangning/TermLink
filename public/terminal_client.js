const terminalContainer = document.getElementById('terminal-container');
const statusOverlay = document.getElementById('status-overlay');
const btnPaste = document.getElementById('btn-paste');
const inputOverlay = document.getElementById('input-overlay');
const inputBuffer = document.getElementById('input-buffer');
const btnToggleInput = document.getElementById('btn-toggle-input');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const btnSend = document.getElementById('btn-send');
const codexPanel = document.getElementById('codex-panel');
const codexLog = document.getElementById('codex-log');
const codexLogStack = document.getElementById('codex-log-stack');
const codexStatusText = document.getElementById('codex-status-text');
const codexStatusCwd = document.getElementById('codex-status-cwd');
const codexMetaText = document.getElementById('codex-meta-text');
const codexNoticeText = document.getElementById('codex-notice-text');
const codexSecondaryNav = document.getElementById('codex-secondary-nav');
const codexAlerts = document.getElementById('codex-alerts');
const codexAlertConfig = document.getElementById('codex-alert-config');
const codexAlertConfigText = document.getElementById('codex-alert-config-text');
const codexAlertDeprecation = document.getElementById('codex-alert-deprecation');
const codexAlertDeprecationText = document.getElementById('codex-alert-deprecation-text');
const codexInput = document.getElementById('codex-input');
const codexImageInputs = document.getElementById('codex-image-inputs');
const btnCodexSend = document.getElementById('btn-codex-send');
const btnCodexToggle = document.getElementById('btn-codex-toggle');
const btnCodexNewThread = document.getElementById('btn-codex-new-thread');
const btnCodexInterrupt = document.getElementById('btn-codex-interrupt');
const btnCodexHistoryRefresh = document.getElementById('btn-codex-history-refresh');
const btnCodexSecondaryThreads = document.getElementById('btn-codex-secondary-threads');
const btnCodexSecondaryRuntime = document.getElementById('btn-codex-secondary-runtime');
const btnCodexSecondaryTools = document.getElementById('btn-codex-secondary-tools');
const btnCodexSecondaryNotices = document.getElementById('btn-codex-secondary-notices');
const codexHistoryPanel = document.getElementById('codex-history-panel');
const codexHistoryList = document.getElementById('codex-history-list');
const codexHistoryEmpty = document.getElementById('codex-history-empty');
const codexRuntimePanel = document.getElementById('codex-runtime-panel');
const codexRuntimeDiff = document.getElementById('codex-runtime-diff');
const codexRuntimePlan = document.getElementById('codex-runtime-plan');
const codexRuntimeReasoning = document.getElementById('codex-runtime-reasoning');
const codexRuntimeTerminal = document.getElementById('codex-runtime-terminal');
const codexRuntimeWarning = document.getElementById('codex-runtime-warning');
const codexToolsPanel = document.getElementById('codex-tools-panel');
const codexToolsSkillsCard = document.getElementById('codex-tools-skills-card');
const codexToolsSkillsMeta = document.getElementById('codex-tools-skills-meta');
const codexToolsSkillsEmpty = document.getElementById('codex-tools-skills-empty');
const codexToolsSkillsList = document.getElementById('codex-tools-skills-list');
const codexToolsCompactCard = document.getElementById('codex-tools-compact-card');
const codexToolsCompactMeta = document.getElementById('codex-tools-compact-meta');
const codexToolsCompactStatus = document.getElementById('codex-tools-compact-status');
const btnCodexCompactConfirm = document.getElementById('btn-codex-compact-confirm');
const codexComposerState = document.getElementById('codex-composer-state');
const codexPlanChip = document.getElementById('codex-plan-chip');
const codexOverrideSummary = document.getElementById('codex-override-summary');
const codexPlanWorkflow = document.getElementById('codex-plan-workflow');
const codexPlanWorkflowTitle = document.getElementById('codex-plan-workflow-title');
const codexPlanWorkflowSummary = document.getElementById('codex-plan-workflow-summary');
const codexPlanWorkflowBody = document.getElementById('codex-plan-workflow-body');
const btnCodexPlanExecute = document.getElementById('btn-codex-plan-execute');
const btnCodexPlanContinue = document.getElementById('btn-codex-plan-continue');
const btnCodexPlanCancel = document.getElementById('btn-codex-plan-cancel');
const btnCodexPlanExpand = document.getElementById('btn-codex-plan-expand');
const codexQuickModel = document.getElementById('codex-quick-model');
const codexQuickReasoning = document.getElementById('codex-quick-reasoning');
const codexQuickSandbox = document.getElementById('codex-quick-sandbox');
const btnCodexQuickClear = document.getElementById('btn-codex-quick-clear');
const btnCodexSlashTrigger = document.getElementById('btn-codex-slash-trigger');
const codexImageActions = document.getElementById('codex-image-actions');
const btnCodexImageUrl = document.getElementById('btn-codex-image-url');
const btnCodexImageLocal = document.getElementById('btn-codex-image-local');
const codexImagePrompt = document.getElementById('codex-image-prompt');
const codexImagePromptTitle = document.getElementById('codex-image-prompt-title');
const codexImagePromptInput = document.getElementById('codex-image-prompt-input');
const btnCodexImagePromptCancel = document.getElementById('btn-codex-image-prompt-cancel');
const btnCodexImagePromptConfirm = document.getElementById('btn-codex-image-prompt-confirm');
const codexContextWidget = document.getElementById('codex-context-widget');
const codexContextRing = document.getElementById('codex-context-ring');
const codexContextPercent = document.getElementById('codex-context-percent');
const codexContextDebugModal = document.getElementById('codex-context-debug-modal');
const codexContextDebugUsage = document.getElementById('codex-context-debug-usage');
const codexContextDebugTokens = document.getElementById('codex-context-debug-tokens');
const codexContextDebugNote = document.getElementById('codex-context-debug-note');
const codexSlashMenu = document.getElementById('codex-slash-menu');
const codexSlashMenuEmpty = document.getElementById('codex-slash-menu-empty');
const codexSlashMenuList = document.getElementById('codex-slash-menu-list');
const codexCommandApprovalModal = document.getElementById('codex-command-approval-modal');
const codexCommandApprovalStatus = document.getElementById('codex-command-approval-status');
const codexCommandApprovalSummary = document.getElementById('codex-command-approval-summary');
const codexCommandApprovalCommand = document.getElementById('codex-command-approval-command');
const codexCommandApprovalRememberWrap = document.getElementById('codex-command-approval-remember-wrap');
const codexCommandApprovalRemember = document.getElementById('codex-command-approval-remember');
const btnCodexCommandApprovalReject = document.getElementById('btn-codex-command-approval-reject');
const btnCodexCommandApprovalApprove = document.getElementById('btn-codex-command-approval-approve');
const isCodexOnlyPage = !!(document.body && document.body.classList.contains('codex-only'));

let term;
let fitAddon;
if (isCodexOnlyPage) {
    term = {
        textarea: null,
        write() {},
        reset() {},
        focus() {},
        blur() {},
        onData() {},
        scrollLines() {},
        scrollToTop() {},
        scrollToBottom() {}
    };
    fitAddon = {
        fit() {},
        proposeDimensions() {
            return null;
        }
    };
} else {
    try {
        if (typeof Terminal === 'undefined') {
            throw new Error('xterm.js library not loaded');
        }
        term = new Terminal({
            cursorBlink: true,
            macOptionIsMeta: true,
            scrollback: 1000,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: { background: '#000000', foreground: '#ffffff' }
        });
    } catch (e) {
        alert(t('codex.error.initFailed', { error: e.message }));
        throw e;
    }

    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    if (terminalContainer) {
        term.open(terminalContainer);
        fitAddon.fit();
    }
}

window.onerror = function (msg, source, lineno, colno, error) {
    console.error(msg, error);
};

const HISTORY_STORAGE_PREFIX = 'termLinkClientHistory:';
const HISTORY_MAX_LINES = 1000;

let runtimeConfig = readInjectedConfig();
let serverUrl = '';
let sessionId = '';
let authHeader = '';
let historyEnabled = true;
let historyState = { lines: [], tail: '' };
let activeHistoryKey = '';
let hasReceivedRuntimeConfig = false;

let ws = null;
let reconnectTimer = null;
let reconnectInterval = 1000;
const maxReconnectInterval = 30000;
let clientHeartbeatTimer = null;
const CLIENT_HEARTBEAT_INTERVAL_MS = 25000; // Send heartbeat every 25 seconds (before server's 30s timeout)
const CODEX_NEW_THREAD_TIMEOUT_MS = 10000;
let isConnecting = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const warmupDoneHosts = new Set();
let quickToolbarVisible = true;

const codexState = {
    sessionMode: '',
    panelCollapsed: false,
    secondaryPanel: 'none',
    threadId: '',
    currentThreadTitle: '',
    currentTurnId: '',
    lastSnapshotThreadId: '',
    unmaterializedThreadId: '',
    lastCodexThreadId: '',
    status: 'idle',
    statusDetail: '',
    cwd: '',
    approvalPending: false,
    pendingServerRequestCount: 0,
    pendingServerRequests: [],
    tokenUsageSummary: '',
    contextUsage: null,
    contextUsageDebug: null,
    contextUsageUpdatedAt: 0,
    rateLimitSummary: '',
    rateLimitTone: '',
    errorNotice: '',
    threadTitleById: new Map(),
    streamingItemId: '',
    messageByItemId: new Map(),
    requestStateById: new Map(),
    pendingBridgeRequests: new Map(),
    nextBridgeRequestId: 1,
    capabilities: {
        historyList: false,
        historyResume: false,
        modelConfig: false,
        rateLimitsRead: false,
        approvals: false,
        userInputRequest: false,
        diffPlanReasoning: false,
        slashCommands: false,
        slashModel: false,
        slashPlan: false,
        skillsList: false,
        compact: false,
        imageInput: false,
        fileMentions: false
    },
    pendingImageInputs: [],
    pendingImagePromptType: null,
    pendingFileMentions: [],
    fileMentionMenuOpen: false,
    fileMentionQuery: '',
    fileMentionResults: [],
    fileMentionLoading: false,
    activeFileMentionIndex: -1,
    slashRegistry: [],
    slashMenuOpen: false,
    slashMenuQuery: '',
    nextTurnOverrides: {
        model: null,
        reasoningEffort: null,
        sandbox: null
    },
    interactionState: {
        planMode: false,
        activeSkill: null
    },
    planWorkflow: {
        phase: 'idle',
        originalPrompt: '',
        latestPlanText: '',
        confirmedPlanText: '',
        lastUserInputRequestId: ''
    },
    serverNextTurnConfigBase: null,
    nextTurnEffectiveCodexConfig: null,
    pendingSubmittedTurnState: null,
    historyThreads: [],
    historyListLoading: false,
    historyActionThreadId: '',
    historyActionKind: '',
    historyRenameThreadId: '',
    historyRenameDraft: '',
    storedCodexConfig: null,
    modelCatalog: [],
    modelOptions: [],
    modelListRequested: false,
    modelListPromise: null,
    skillCatalog: [],
    skillListRequested: false,
    skillListPromise: null,
    skillsLoading: false,
    toolsPanelFocus: 'skills',
    compactSubmitting: false,
    compactStatusText: '',
    compactStatusTone: '',
    settingsLoadingModels: false,
    settingsRefreshingRateLimits: false,
    rateLimitBootstrapRequested: false,
    activeCommandApprovalRequestId: '',
    contextDebugModalOpen: false,
    runtimeDiff: '',
    runtimePlan: '',
    runtimeReasoning: '',
    runtimeTerminalOutput: '',
    runtimeWarning: '',
    runtimeWarningTone: '',
    configWarningText: '',
    deprecationNoticeText: '',
    historyListRequested: false,
    initialSessionInfoReceived: false,
    initialCapabilitiesReceived: false,
    initialCodexStateReceived: false,
    bootstrapCompleted: false,
    resumeAttemptedForThreadId: '',
    fallbackThreadRequested: false,
    pendingFreshThread: false,
    pendingFreshThreadUiSnapshot: null,
    pendingFreshThreadTimeoutId: 0,
    lastTokenUsageLog: '',
    lastRateLimitLog: ''
};

const viewportState = {
    baselineHeight: 0,
    compact: false
};

function getReasoningEffortLabels() {
    return {
        none: t('codex.effort.none'),
        minimal: t('codex.effort.minimal'),
        low: t('codex.effort.low'),
        medium: t('codex.effort.medium'),
        high: t('codex.effort.high'),
        xhigh: t('codex.effort.xhigh')
    };
}

function readInjectedConfig() {
    if (!window.__TERMLINK_CONFIG__ || typeof window.__TERMLINK_CONFIG__ !== 'object') {
        return {};
    }
    return window.__TERMLINK_CONFIG__;
}

function getConfiguredSessionMode() {
    if (!runtimeConfig || typeof runtimeConfig !== 'object') {
        return 'terminal';
    }
    const raw = typeof runtimeConfig.sessionMode === 'string' ? runtimeConfig.sessionMode.trim().toLowerCase() : '';
    return raw === 'codex' ? 'codex' : 'terminal';
}

function getActiveSessionMode() {
    const serverMode = typeof codexState.sessionMode === 'string' ? codexState.sessionMode.trim().toLowerCase() : '';
    if (serverMode === 'codex' || serverMode === 'terminal') {
        return serverMode;
    }
    return getConfiguredSessionMode();
}

function applySessionModeLayout() {
    if (!document.body) return;
    const mode = getActiveSessionMode();
    document.body.classList.toggle('terminal-only', mode !== 'codex');
    if (mode !== 'codex' && codexState.panelCollapsed) {
        codexState.panelCollapsed = false;
    }
    if (mode !== 'codex') {
        codexState.secondaryPanel = 'none';
    }
}

function getNativeBridge() {
    return window.TerminalEventBridge;
}

function getCodexBootstrapApi() {
    if (window.TermLinkCodexBootstrap && typeof window.TermLinkCodexBootstrap.planBootstrap === 'function') {
        return window.TermLinkCodexBootstrap;
    }
    return null;
}

function getCodexHistoryViewApi() {
    if (window.TermLinkCodexHistoryView && typeof window.TermLinkCodexHistoryView.buildHistoryEntries === 'function') {
        return window.TermLinkCodexHistoryView;
    }
    return null;
}

function getCodexSettingsViewApi() {
    if (window.TermLinkCodexSettingsView && typeof window.TermLinkCodexSettingsView.buildCodexConfigPayload === 'function') {
        return window.TermLinkCodexSettingsView;
    }
    return null;
}

function getCodexSlashCommandsApi() {
    if (window.TermLinkCodexSlashCommands && typeof window.TermLinkCodexSlashCommands.parseComposerInput === 'function') {
        return window.TermLinkCodexSlashCommands;
    }
    return null;
}

function getCodexShellViewApi() {
    if (
        window.TermLinkCodexShellView &&
        typeof window.TermLinkCodexShellView.getSecondaryEntryAvailability === 'function'
    ) {
        return window.TermLinkCodexShellView;
    }
    return null;
}

function getCodexRuntimeViewApi() {
    if (window.TermLinkCodexRuntimeView && typeof window.TermLinkCodexRuntimeView.buildRuntimeUpdate === 'function') {
        return window.TermLinkCodexRuntimeView;
    }
    return null;
}

function getCodexApprovalViewApi() {
    if (window.TermLinkCodexApprovalView && typeof window.TermLinkCodexApprovalView.normalizeApprovalRequest === 'function') {
        return window.TermLinkCodexApprovalView;
    }
    return null;
}

function isTransientCodexBridgeError(errorLike) {
    const bootstrapApi = getCodexBootstrapApi();
    if (bootstrapApi && typeof bootstrapApi.isTransientBridgeError === 'function') {
        return bootstrapApi.isTransientBridgeError(errorLike);
    }
    const code = errorLike && typeof errorLike.code === 'string'
        ? errorLike.code.trim().toUpperCase()
        : '';
    return code === 'CODEX_BRIDGE_RESTARTED'
        || code === 'CODEX_BRIDGE_CLOSED'
        || code === 'CODEX_BRIDGE_NOT_CONNECTED';
}

function callNativeBridge(method, args) {
    const bridge = getNativeBridge();
    if (!bridge || typeof bridge[method] !== 'function') return;
    try {
        bridge[method].apply(bridge, args);
    } catch (err) {
        console.error(`TerminalEventBridge.${method} failed`, err);
    }
}

function notifyNativeConnectionState(state, detail) {
    callNativeBridge('onConnectionState', [state, detail || '']);
}

function notifyNativeError(code, message) {
    callNativeBridge('onTerminalError', [code || 'UNKNOWN', message || '']);
}

function notifyNativeSessionInfo(id, name, privilegeLevel) {
    callNativeBridge('onSessionInfo', [id || '', name || '', privilegeLevel || '']);
}

function localizeCodexStatus(status) {
    switch ((status || 'idle').trim().toLowerCase()) {
    case 'running':
        return t('codex.status.running');
    case 'streaming':
        return t('codex.status.streaming');
    case 'waiting_approval':
        return t('codex.status.waitingApproval');
    case 'error':
        return t('codex.status.error');
    default:
        return t('codex.status.idle');
    }
}

function localizeCodexStatusDetail(detail) {
    const normalized = typeof detail === 'string' ? detail.trim().toLowerCase() : '';
    if (!normalized) {
        return '';
    }
    const localized = {
        'starting turn': t('codex.statusDetail.startingTurn'),
        'restoring thread': t('codex.statusDetail.restoringThread'),
        'creating fresh task': t('codex.statusDetail.creatingTask'),
        'thread ready': t('codex.statusDetail.threadReady'),
        'in progress': t('codex.statusDetail.inProgress'),
        'turn started': t('codex.statusDetail.turnStarted'),
        'bridge disconnected': t('codex.statusDetail.bridgeDisconnected'),
        'bridge transport error': t('codex.statusDetail.bridgeTransportError'),
        'event error': t('codex.statusDetail.eventError')
    };
    return localized[normalized] || detail;
}

function hasCodexNonBlockingNotice() {
    return !!(
        (typeof codexState.configWarningText === 'string' && codexState.configWarningText.trim())
        || (typeof codexState.deprecationNoticeText === 'string' && codexState.deprecationNoticeText.trim())
    );
}

function getCodexSecondaryEntryAvailability() {
    const shellApi = getCodexShellViewApi();
    if (shellApi && typeof shellApi.getSecondaryEntryAvailability === 'function') {
        return shellApi.getSecondaryEntryAvailability({
            sessionMode: getActiveSessionMode(),
            capabilities: codexState.capabilities,
            hasNonBlockingNotice: hasCodexNonBlockingNotice()
        });
    }
    const isCodex = getActiveSessionMode() === 'codex';
    return {
        threads: isCodex && codexState.capabilities.historyList === true,
        settings: isCodex && (codexState.capabilities.modelConfig === true || codexState.capabilities.rateLimitsRead === true),
        runtime: isCodex && codexState.capabilities.diffPlanReasoning === true,
        notices: isCodex && hasCodexNonBlockingNotice(),
        tools: isCodex && (codexState.capabilities.skillsList === true || codexState.capabilities.compact === true)
    };
}

function syncCodexSecondaryPanelState() {
    const availability = getCodexSecondaryEntryAvailability();
    const panel = typeof codexState.secondaryPanel === 'string' ? codexState.secondaryPanel : 'none';
    const normalized = (
        panel === 'threads'
        || panel === 'settings'
        || panel === 'runtime'
        || panel === 'tools'
        || panel === 'notices'
    ) ? panel : 'none';
    if (normalized !== 'none' && availability[normalized] !== true) {
        codexState.secondaryPanel = 'none';
    } else {
        codexState.secondaryPanel = normalized;
    }
    return codexState.secondaryPanel;
}

function renderCodexHeaderSummary() {
    const shellApi = getCodexShellViewApi();

    if (codexStatusCwd) {
        codexStatusCwd.textContent = codexState.cwd || '';
        codexStatusCwd.hidden = !codexState.cwd;
    }
    if (btnCodexInterrupt) {
        const showInterrupt = shellApi && typeof shellApi.shouldShowInterrupt === 'function'
            ? shellApi.shouldShowInterrupt({
                status: codexState.status,
                currentTurnId: codexState.currentTurnId,
                approvalPending: codexState.approvalPending
            })
            : (
                codexState.status === 'running'
                || codexState.status === 'streaming'
                || codexState.status === 'waiting_approval'
                || !!codexState.currentTurnId
                || codexState.approvalPending === true
            );
        btnCodexInterrupt.hidden = !showInterrupt;
    }
    renderCodexContextUsage();
}

function renderCodexSecondaryNav() {
    const availability = getCodexSecondaryEntryAvailability();
    const activePanel = syncCodexSecondaryPanelState();
    const buttons = [
        { element: btnCodexSecondaryThreads, key: 'threads' },
        { element: btnCodexSecondaryRuntime, key: 'runtime' },
        { element: btnCodexSecondaryTools, key: 'tools' },
        { element: btnCodexSecondaryNotices, key: 'notices' }
    ];
    let visibleCount = 0;
    buttons.forEach(({ element, key }) => {
        if (!element) return;
        const isVisible = availability[key] === true;
        element.hidden = !isVisible;
        element.disabled = !isVisible;
        element.classList.toggle('active', isVisible && activePanel === key);
        element.setAttribute('aria-pressed', isVisible && activePanel === key ? 'true' : 'false');
        if (isVisible) {
            visibleCount += 1;
        }
    });
    if (codexSecondaryNav) {
        codexSecondaryNav.hidden = visibleCount === 0;
    }
}

function renderCodexSecondaryPanels() {
    syncCodexSecondaryPanelState();
    renderCodexHistoryList();
    renderCodexAlerts();
    renderCodexRuntimePanel();
    renderCodexToolsPanel();
}

function setCodexSecondaryPanel(panelName) {
    const normalized = (
        panelName === 'threads'
        || panelName === 'runtime'
        || panelName === 'tools'
        || panelName === 'notices'
    ) ? panelName : 'none';
    const availability = getCodexSecondaryEntryAvailability();
    codexState.secondaryPanel = normalized !== 'none' && availability[normalized] === true ? normalized : 'none';
    renderCodexHeaderSummary();
    renderCodexSecondaryNav();
    renderCodexSecondaryPanels();
}

function toggleCodexSecondaryPanel(panelName) {
    const normalized = (
        panelName === 'threads'
        || panelName === 'runtime'
        || panelName === 'tools'
        || panelName === 'notices'
    ) ? panelName : 'none';
    if (codexState.secondaryPanel === normalized) {
        setCodexSecondaryPanel('none');
        return;
    }
    setCodexSecondaryPanel(normalized);
}

function setCodexStatus(status, detail) {
    codexState.status = status || 'idle';
    codexState.statusDetail = detail || '';
    if (codexPanel) {
        codexPanel.classList.remove('status-running', 'status-error');
        if (codexState.status === 'running') {
            codexPanel.classList.add('status-running');
        } else if (codexState.status === 'error') {
            codexPanel.classList.add('status-error');
        }
    }
    if (codexStatusText) {
        const suffix = codexState.statusDetail ? `：${localizeCodexStatusDetail(codexState.statusDetail)}` : '';
        codexStatusText.textContent = `Codex ${localizeCodexStatus(codexState.status)}${suffix}`;
    }
    renderCodexHeaderSummary();
    renderCodexSecondaryNav();
    renderCodexAuxStatus();
    renderCodexHistoryList();
    renderCodexContextUsage();
}

function updateCodexThreadLabel() {
    renderCodexHeaderSummary();
    renderCodexAuxStatus();
    renderCodexHistoryList();
    renderCodexContextUsage();
}

function renderCodexAuxStatus() {
    if (codexMetaText) {
        const parts = [];
        if (codexState.approvalPending) {
            const count = codexState.pendingServerRequestCount || 0;
            parts.push(count === 1 ? t('codex.status.approvalCount1') : t('codex.status.approvalCountN', { count }));
        }
        if (codexState.tokenUsageSummary) {
            parts.push(codexState.tokenUsageSummary);
        }
        if (codexState.rateLimitSummary && codexState.rateLimitTone !== 'warn' && codexState.rateLimitTone !== 'error') {
            parts.push(t('codex.notice.quota', { summary: codexState.rateLimitSummary }));
        }
        codexMetaText.textContent = parts.join(' | ');
    }

    if (codexNoticeText) {
        let notice = '';
        let tone = '';
        if (codexState.errorNotice) {
            notice = codexState.errorNotice;
            tone = 'error';
        } else if (codexState.rateLimitSummary && (codexState.rateLimitTone === 'warn' || codexState.rateLimitTone === 'error')) {
            notice = t('codex.notice.quota', { summary: codexState.rateLimitSummary });
            tone = codexState.rateLimitTone;
        }
        codexNoticeText.textContent = notice;
        codexNoticeText.classList.toggle('tone-error', tone === 'error');
        codexNoticeText.classList.toggle('tone-warn', tone === 'warn');
    }
    renderCodexContextUsage();
    renderCodexSecondaryNav();
}

function renderCodexAlerts() {
    const configWarningText = typeof codexState.configWarningText === 'string'
        ? codexState.configWarningText.trim()
        : '';
    const deprecationNoticeText = typeof codexState.deprecationNoticeText === 'string'
        ? codexState.deprecationNoticeText.trim()
        : '';
    const hasConfigWarning = !!configWarningText;
    const hasDeprecationNotice = !!deprecationNoticeText;
    const shouldShowPanel = syncCodexSecondaryPanelState() === 'notices' && hasCodexNonBlockingNotice();
    if (codexAlerts) {
        codexAlerts.hidden = !shouldShowPanel;
    }
    if (codexAlertConfig) {
        codexAlertConfig.hidden = !hasConfigWarning;
    }
    if (codexAlertConfigText) {
        codexAlertConfigText.textContent = configWarningText;
    }
    if (codexAlertDeprecation) {
        codexAlertDeprecation.hidden = !hasDeprecationNotice;
        codexAlertDeprecation.classList.add('deprecation');
    }
    if (codexAlertDeprecationText) {
        codexAlertDeprecationText.textContent = deprecationNoticeText;
    }
    renderCodexSecondaryNav();
}

function renderCodexHistoryList() {
    if (!codexHistoryPanel || !codexHistoryList || !codexHistoryEmpty) return;

    const historyApi = getCodexHistoryViewApi();
    const shouldShowPanel = historyApi && typeof historyApi.shouldShowHistoryPanel === 'function'
        ? historyApi.shouldShowHistoryPanel({
            sessionMode: getActiveSessionMode(),
            capabilities: codexState.capabilities
        })
        : (getActiveSessionMode() === 'codex' && codexState.capabilities.historyList === true);

    codexHistoryPanel.hidden = !(shouldShowPanel && syncCodexSecondaryPanelState() === 'threads');
    if (!shouldShowPanel) {
        codexHistoryList.innerHTML = '';
        codexHistoryEmpty.classList.add('hidden');
        return;
    }

    const entries = historyApi && typeof historyApi.buildHistoryEntries === 'function'
        ? historyApi.buildHistoryEntries({
            threads: codexState.historyThreads,
            currentThreadId: codexState.threadId,
            lastCodexThreadId: codexState.lastCodexThreadId,
            actionThreadId: codexState.historyActionThreadId,
            actionKind: codexState.historyActionKind,
            status: codexState.status
        })
        : [];

    codexHistoryList.innerHTML = '';

    let emptyText = '';
    if (codexState.historyListLoading) {
        emptyText = t('codex.thread.loadingSaved');
    } else if (entries.length === 0) {
        emptyText = codexState.capabilities.historyList === true
            ? t('codex.thread.noSaved')
            : t('codex.thread.historyUnsupported');
    }

    if (emptyText) {
        codexHistoryEmpty.textContent = emptyText;
        codexHistoryEmpty.classList.remove('hidden');
    } else {
        codexHistoryEmpty.classList.add('hidden');
    }

    entries.forEach((entry) => {
        const card = document.createElement('div');
        card.className = 'codex-history-item';
        if (entry.active) {
            card.classList.add('active');
        }
        const renameEditing = codexState.historyRenameThreadId === entry.id;

        const copy = document.createElement('div');
        copy.className = 'codex-history-copy';

        if (renameEditing) {
            const renameField = document.createElement('label');
            renameField.className = 'codex-history-rename-field';

            const renameLabel = document.createElement('span');
            renameLabel.className = 'codex-history-rename-label';
            renameLabel.textContent = t('codex.thread.renameLabel');

            const renameInput = document.createElement('input');
            renameInput.type = 'text';
            renameInput.className = 'codex-history-rename-input';
            renameInput.value = codexState.historyRenameDraft;
            renameInput.maxLength = 200;
            renameInput.placeholder = t('codex.thread.renamePlaceholder');
            renameInput.addEventListener('input', () => {
                codexState.historyRenameDraft = renameInput.value;
            });
            renameInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    void submitCodexThreadRename(entry.id, entry.title);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelCodexThreadRename();
                }
            });

            renameField.appendChild(renameLabel);
            renameField.appendChild(renameInput);
            copy.appendChild(renameField);

            setTimeout(() => {
                try {
                    renameInput.focus();
                    renameInput.select();
                } catch (_) {
                    // Ignore focus failures in non-browser test environments.
                }
            }, 0);
        } else {
            const name = document.createElement('div');
            name.className = 'codex-history-name';
            name.textContent = entry.title;
            copy.appendChild(name);
        }

        const meta = document.createElement('div');
        meta.className = 'codex-history-meta';
        meta.textContent = entry.metaText || entry.id;
        copy.appendChild(meta);

        if (Array.isArray(entry.badges) && entry.badges.length > 0) {
            const badges = document.createElement('div');
            badges.className = 'codex-history-badges';
            entry.badges.forEach((badgeLabel) => {
                const badge = document.createElement('span');
                badge.className = 'codex-history-badge';
                if (badgeLabel === 'Current') {
                    badge.classList.add('active');
                }
                badge.textContent = ({
                    Current: t('codex.thread.badgeMap.current'),
                    Saved: t('codex.thread.badgeMap.saved'),
                    Archived: t('codex.thread.badgeMap.archived'),
                    Opening: t('codex.thread.badgeMap.opening'),
                    Forking: t('codex.thread.badgeMap.forking'),
                    Renaming: t('codex.thread.badgeMap.renaming'),
                    Archiving: t('codex.thread.badgeMap.archiving'),
                    Restoring: t('codex.thread.badgeMap.restoring')
                })[badgeLabel] || badgeLabel;
                badges.appendChild(badge);
            });
            copy.appendChild(badges);
        }

        const footer = document.createElement('div');
        footer.className = 'codex-history-footer';

        const primaryAction = document.createElement('button');
        primaryAction.type = 'button';
        primaryAction.className = 'codex-history-primary-action';
        primaryAction.textContent = entry.active ? t('codex.thread.openAction.current') : (entry.pending ? t('codex.thread.openAction.pending') : t('codex.thread.openAction.open'));
        primaryAction.disabled = renameEditing || !!(entry.actions && entry.actions[0] && entry.actions[0].disabled);
        primaryAction.addEventListener('click', () => {
            if (entry.active) {
                refreshCodexThreadSnapshot({ threadId: entry.id, force: true });
                return;
            }
            requestCodexResume(entry.id).catch((error) => {
                if (isTransientCodexBridgeError(error)) {
                    return;
                }
                appendCodexLogEntry(
                    'error',
                    t('codex.thread.openFailed', { id: entry.id, error: error.message || t('codex.error.unknownError') }),
                    { meta: 'history' }
                );
            });
        });
        footer.appendChild(primaryAction);

        const secondaryActions = Array.isArray(entry.actions) ? entry.actions.filter((action) => action.kind !== 'open') : [];
        if (secondaryActions.length > 0) {
            const actionRow = document.createElement('div');
            actionRow.className = 'codex-history-actions-row';
            if (renameEditing) {
                const saveButton = document.createElement('button');
                saveButton.type = 'button';
                saveButton.className = 'codex-history-secondary-action primary';
                saveButton.textContent = t('codex.thread.saveBtn');
                saveButton.disabled = entry.pending === true;
                saveButton.addEventListener('click', () => {
                    void submitCodexThreadRename(entry.id, entry.title);
                });

                const cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.className = 'codex-history-secondary-action';
                cancelButton.textContent = t('codex.thread.cancelBtn');
                cancelButton.disabled = entry.pending === true;
                cancelButton.addEventListener('click', () => {
                    cancelCodexThreadRename();
                });

                actionRow.appendChild(saveButton);
                actionRow.appendChild(cancelButton);
            } else {
                secondaryActions.forEach((actionEntry) => {
                    const actionButton = document.createElement('button');
                    actionButton.type = 'button';
                    actionButton.className = 'codex-history-secondary-action';
                    actionButton.textContent = actionEntry.label;
                    actionButton.disabled = actionEntry.disabled === true;
                    actionButton.addEventListener('click', () => {
                        if (actionEntry.kind === 'rename') {
                            startCodexThreadRename(entry.id, entry.title);
                            return;
                        }
                        void requestCodexThreadMutation(actionEntry.kind, entry.id);
                    });
                    actionRow.appendChild(actionButton);
                });
            }
            footer.appendChild(actionRow);
        }

        card.appendChild(copy);
        card.appendChild(footer);
        codexHistoryList.appendChild(card);
    });
}

function normalizeCodexThreadTitle(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
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

function normalizeCodexHistoryTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }
    if (typeof value !== 'string') {
        return '';
    }
    const normalized = value.trim();
    if (!normalized) {
        return '';
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
}

function getCodexHistorySortTime(thread, fieldNames) {
    if (!thread || typeof thread !== 'object' || !Array.isArray(fieldNames)) {
        return Number.NEGATIVE_INFINITY;
    }
    for (const fieldName of fieldNames) {
        if (!fieldName || !Object.prototype.hasOwnProperty.call(thread, fieldName)) {
            continue;
        }
        const value = thread[fieldName];
        const normalized = normalizeCodexHistoryTimestamp(value);
        if (!normalized) {
            continue;
        }
        const time = Date.parse(normalized);
        if (!Number.isNaN(time)) {
            return time;
        }
    }
    return Number.NEGATIVE_INFINITY;
}

function buildCodexHistoryThreadEntry(entry, originalIndex) {
    const nextEntry = {
        id: typeof entry.id === 'string' ? entry.id : '',
        title: typeof entry.title === 'string'
            ? entry.title
            : (typeof entry.name === 'string' ? entry.name : ''),
        archived: entry.archived === true || entry.isArchived === true
    };
    nextEntry.lastActiveAt = normalizeCodexHistoryTimestamp(
        entry.lastActiveAt
        || entry.last_active_at
        || entry.updatedAt
        || entry.updated_at
        || entry.lastUpdatedAt
        || entry.last_updated_at
        || entry.lastMessageAt
        || entry.last_message_at
        || entry.modifiedAt
        || entry.modified_at
        || entry.mtime
    );
    nextEntry.createdAt = normalizeCodexHistoryTimestamp(
        entry.createdAt
        || entry.created_at
        || entry.created
    );
    nextEntry.__sortLastActiveAt = getCodexHistorySortTime(entry, [
        'lastActiveAt',
        'last_active_at',
        'updatedAt',
        'updated_at',
        'lastUpdatedAt',
        'last_updated_at',
        'lastMessageAt',
        'last_message_at',
        'modifiedAt',
        'modified_at',
        'mtime'
    ]);
    nextEntry.__sortCreatedAt = getCodexHistorySortTime(entry, [
        'createdAt',
        'created_at',
        'created'
    ]);
    nextEntry.__originalIndex = typeof originalIndex === 'number' ? originalIndex : Number.MAX_SAFE_INTEGER;
    if (nextEntry.id) {
        nextEntry.title = setKnownCodexThreadTitle(nextEntry.id, nextEntry.title);
    }
    return nextEntry;
}

function resolveCodexThreadListEntries(result) {
    if (!result || typeof result !== 'object') {
        return [];
    }
    if (Array.isArray(result.data)) {
        return result.data;
    }
    if (Array.isArray(result.threads)) {
        return result.threads;
    }
    return [];
}

function resolveCodexThreadTitle(source) {
    if (!source || typeof source !== 'object') {
        return '';
    }
    return normalizeCodexThreadTitle(source.title) || normalizeCodexThreadTitle(source.name);
}

function setKnownCodexThreadTitle(threadId, title) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return '';
    }
    const normalizedTitle = normalizeCodexThreadTitle(title);
    if (normalizedTitle) {
        codexState.threadTitleById.set(normalizedThreadId, normalizedTitle);
    } else {
        codexState.threadTitleById.delete(normalizedThreadId);
    }
    return normalizedTitle;
}

function getKnownCodexThreadTitle(threadId) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return '';
    }
    return normalizeCodexThreadTitle(codexState.threadTitleById.get(normalizedThreadId));
}

function setCurrentCodexThreadTitleForThread(threadId, title) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId || codexState.threadId !== normalizedThreadId) {
        return;
    }
    codexState.currentThreadTitle = normalizeCodexThreadTitle(title);
}

function updateCodexHistoryThreadTitle(threadId, title) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return false;
    }
    const normalizedTitle = setKnownCodexThreadTitle(normalizedThreadId, title);
    let found = false;
    codexState.historyThreads = codexState.historyThreads.map((entry) => {
        if (!entry || entry.id !== normalizedThreadId) {
            return entry;
        }
        found = true;
        return {
            id: entry.id,
            title: normalizedTitle,
            archived: entry.archived === true,
            lastActiveAt: entry.lastActiveAt || '',
            createdAt: entry.createdAt || '',
            __sortLastActiveAt: entry.__sortLastActiveAt,
            __sortCreatedAt: entry.__sortCreatedAt,
            __originalIndex: entry.__originalIndex
        };
    });
    setCurrentCodexThreadTitleForThread(normalizedThreadId, normalizedTitle);
    return found;
}

function startCodexThreadRename(threadId, currentTitle) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return;
    }
    codexState.historyRenameThreadId = normalizedThreadId;
    codexState.historyRenameDraft = typeof currentTitle === 'string' ? currentTitle : '';
    renderCodexHistoryList();
}

function cancelCodexThreadRename() {
    codexState.historyRenameThreadId = '';
    codexState.historyRenameDraft = '';
    renderCodexHistoryList();
}

function getStoredCodexConfig() {
    const settingsApi = getCodexSettingsViewApi();
    if (!settingsApi || typeof settingsApi.normalizeStoredCodexConfig !== 'function') {
        return null;
    }
    return settingsApi.normalizeStoredCodexConfig(codexState.storedCodexConfig);
}

function syncNextTurnEffectiveCodexConfig() {
    codexState.nextTurnEffectiveCodexConfig = buildLocalNextTurnEffectiveCodexConfig();
    renderCodexComposerState();
    renderCodexQuickControls();
}

function setCodexInteractionState(nextState, options) {
    const opts = options || {};
    codexState.interactionState = normalizeCodexInteractionState(nextState);
    renderCodexComposerState();
    if (opts.syncRemote !== false) {
        sendCodexEnvelope({
            type: 'codex_set_interaction_state',
            interactionState: codexState.interactionState
        });
    }
}

function setPlanMode(enabled, options) {
    setCodexInteractionState({
        planMode: enabled === true,
        activeSkill: codexState.interactionState.activeSkill
    }, options);
}

function normalizePlanWorkflowPhase(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (
        normalized === 'planning'
        || normalized === 'awaiting_user_input'
        || normalized === 'plan_ready_for_confirmation'
        || normalized === 'executing_confirmed_plan'
        || normalized === 'cancelled'
    ) {
        return normalized;
    }
    return 'idle';
}

function buildEmptyPlanWorkflowState(overrides) {
    return {
        phase: 'idle',
        originalPrompt: '',
        latestPlanText: '',
        confirmedPlanText: '',
        lastUserInputRequestId: '',
        ...(overrides && typeof overrides === 'object' ? overrides : {})
    };
}

function setPlanWorkflowState(nextState) {
    const source = nextState && typeof nextState === 'object' ? nextState : {};
    codexState.planWorkflow = {
        phase: normalizePlanWorkflowPhase(source.phase),
        originalPrompt: typeof source.originalPrompt === 'string' ? source.originalPrompt.trim() : '',
        latestPlanText: typeof source.latestPlanText === 'string' ? source.latestPlanText : '',
        confirmedPlanText: typeof source.confirmedPlanText === 'string' ? source.confirmedPlanText : '',
        lastUserInputRequestId: typeof source.lastUserInputRequestId === 'string' ? source.lastUserInputRequestId.trim() : ''
    };
    renderCodexPlanWorkflow();
}

function getPlanWorkflowDisplayText() {
    if (codexState.planWorkflow.confirmedPlanText) {
        return codexState.planWorkflow.confirmedPlanText;
    }
    if (codexState.planWorkflow.latestPlanText) {
        return codexState.planWorkflow.latestPlanText;
    }
    if (codexState.runtimePlan) {
        return codexState.runtimePlan;
    }
    return '';
}

function updatePlanWorkflowText(text, options) {
    const opts = options || {};
    const rawText = typeof text === 'string' ? text : '';
    const normalized = opts.preserveWhitespace === true ? rawText : rawText.trim();
    if (!normalized) {
        return;
    }
    setPlanWorkflowState({
        ...codexState.planWorkflow,
        latestPlanText: normalized,
        confirmedPlanText: opts.confirmed === true
            ? normalized
            : codexState.planWorkflow.confirmedPlanText
    });
}

function startPlanWorkflow(promptText) {
    const normalizedPrompt = typeof promptText === 'string' ? promptText.trim() : '';
    const preserveOriginalPrompt = codexState.planWorkflow.phase === 'planning'
        && !!codexState.planWorkflow.confirmedPlanText
        && !!codexState.planWorkflow.originalPrompt;
    setPlanWorkflowState({
        phase: 'planning',
        originalPrompt: preserveOriginalPrompt ? codexState.planWorkflow.originalPrompt : normalizedPrompt,
        latestPlanText: '',
        confirmedPlanText: '',
        lastUserInputRequestId: ''
    });
}

function finalizePlanWorkflowForConfirmation() {
    const planText = getPlanWorkflowDisplayText();
    if (!planText) {
        setPlanWorkflowState({
            ...codexState.planWorkflow,
            phase: 'idle'
        });
        return;
    }
    setPlanWorkflowState({
        ...codexState.planWorkflow,
        phase: 'plan_ready_for_confirmation',
        confirmedPlanText: planText,
        latestPlanText: planText,
        lastUserInputRequestId: ''
    });
}

function cancelPlanWorkflow() {
    setPlanMode(false);
    setPlanWorkflowState({
        ...buildEmptyPlanWorkflowState({
            phase: 'cancelled',
            originalPrompt: codexState.planWorkflow.originalPrompt
        })
    });
    setTimeout(() => {
        if (codexState.planWorkflow.phase === 'cancelled') {
            setPlanWorkflowState(buildEmptyPlanWorkflowState());
        }
    }, 0);
}

function buildConfirmedPlanExecutionPrompt() {
    const originalPrompt = codexState.planWorkflow.originalPrompt || 'Follow the confirmed plan below.';
    const confirmedPlan = codexState.planWorkflow.confirmedPlanText || getPlanWorkflowDisplayText();
    if (!confirmedPlan) {
        return '';
    }
    return [
        'Execute the confirmed plan below now.',
        '',
        'Original user goal:',
        originalPrompt,
        '',
        'Confirmed plan:',
        confirmedPlan
    ].join('\n');
}

function renderCodexPlanWorkflow() {
    if (!codexPlanWorkflow) {
        return;
    }
    const phase = normalizePlanWorkflowPhase(codexState.planWorkflow.phase);
    const visible = phase !== 'idle' && phase !== 'cancelled';
    codexPlanWorkflow.hidden = !visible;
    codexPlanWorkflow.dataset.phase = phase;
    if (!visible) {
        return;
    }

    let title = t('codex.plan.inProgress');
    let summary = t('codex.plan.summary');
    if (phase === 'awaiting_user_input') {
        title = t('codex.plan.awaitingTitle');
        summary = t('codex.plan.awaitingSummary');
    } else if (phase === 'plan_ready_for_confirmation') {
        title = t('codex.plan.readyTitle');
        summary = t('codex.plan.readySummary');
    } else if (phase === 'executing_confirmed_plan') {
        title = t('codex.plan.executingTitle');
        summary = t('codex.plan.executingSummary');
    }

    if (codexPlanWorkflowTitle) {
        codexPlanWorkflowTitle.textContent = title;
    }
    if (codexPlanWorkflowSummary) {
        codexPlanWorkflowSummary.textContent = summary;
    }
    const text = getPlanWorkflowDisplayText();
    if (codexPlanWorkflowBody) {
        if (!text) {
            codexPlanWorkflowBody.textContent = t('codex.plan.waitingText');
        } else if (typeof renderPlanMarkdown === 'function') {
            codexPlanWorkflowBody.innerHTML = renderPlanMarkdown(text);
        } else {
            codexPlanWorkflowBody.textContent = text;
        }
    }
    if (btnCodexPlanExpand) {
        const hasText = !!text;
        if (!hasText && codexPlanWorkflowBody) {
            codexPlanWorkflowBody.classList.remove('expanded');
        }
        btnCodexPlanExpand.hidden = !hasText;
        syncPlanExpandButton(codexPlanWorkflowBody && codexPlanWorkflowBody.classList.contains('expanded'));
    }
    if (btnCodexPlanExecute) {
        btnCodexPlanExecute.hidden = phase !== 'plan_ready_for_confirmation';
        btnCodexPlanExecute.disabled = phase !== 'plan_ready_for_confirmation';
    }
    if (btnCodexPlanContinue) {
        btnCodexPlanContinue.hidden = phase !== 'plan_ready_for_confirmation';
        btnCodexPlanContinue.disabled = phase !== 'plan_ready_for_confirmation';
    }
    if (btnCodexPlanCancel) {
        btnCodexPlanCancel.hidden = !(phase === 'planning' || phase === 'awaiting_user_input' || phase === 'plan_ready_for_confirmation');
        btnCodexPlanCancel.disabled = phase === 'executing_confirmed_plan';
    }
}

function syncPlanExpandButton(isExpanded) {
    if (!btnCodexPlanExpand) {
        return;
    }
    const expanded = !!isExpanded;
    btnCodexPlanExpand.classList.toggle('expanded', expanded);
    btnCodexPlanExpand.textContent = expanded ? '▲' : '▼';
    const label = expanded ? t('codex.plan.collapse') : t('codex.plan.expand');
    btnCodexPlanExpand.title = label;
    btnCodexPlanExpand.setAttribute('aria-label', label);
}

function setNextTurnOverrides(nextOverrides) {
    codexState.nextTurnOverrides = normalizeNextTurnOverrides(nextOverrides);
    syncNextTurnEffectiveCodexConfig();
}

function clearNextTurnOverrides() {
    setNextTurnOverrides({ model: null, reasoningEffort: null, sandbox: null });
}

function setNextTurnOverrideValue(key, value) {
    setNextTurnOverrides({
        model: key === 'model' ? value : codexState.nextTurnOverrides.model,
        reasoningEffort: key === 'reasoningEffort' ? value : codexState.nextTurnOverrides.reasoningEffort,
        sandbox: key === 'sandbox' ? value : codexState.nextTurnOverrides.sandbox
    });
}

function renderCodexComposerState() {
    if (!codexComposerState) {
        return;
    }
    const planMode = codexState.interactionState.planMode === true;
    const parts = [];
    if (codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnOverrides.model) {
        parts.push(t('codex.override.model', { model: codexState.nextTurnEffectiveCodexConfig.model }));
    }
    if (codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnOverrides.reasoningEffort) {
        parts.push(t('codex.override.reasoning', { effort: codexState.nextTurnEffectiveCodexConfig.reasoningEffort }));
    }
    if (codexState.interactionState.activeSkill) {
        parts.push(t('codex.override.skill', { skill: codexState.interactionState.activeSkill }));
    }
    codexComposerState.hidden = !planMode && parts.length === 0;
    if (codexPlanChip) {
        codexPlanChip.hidden = !planMode;
    }
    if (codexOverrideSummary) {
        codexOverrideSummary.hidden = parts.length === 0;
        codexOverrideSummary.textContent = parts.join(' | ');
    }
    if (codexInput) {
        codexInput.placeholder = codexState.interactionState.activeSkill
            ? t('codex.input.skillActive', { skill: codexState.interactionState.activeSkill })
            : t('codex.input.placeholder');
    }
}

function normalizeCodexImageInputs(payload) {
    const list = Array.isArray(payload) ? payload : [];
    return list
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const type = entry.type === 'localImage' ? 'localImage' : (entry.type === 'image' ? 'image' : '');
            // 本地图片使用 url 存储 data URL，远程图片也使用 url
            const url = typeof entry.url === 'string' ? entry.url.trim() : '';
            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            if (!type || !url) {
                return null;
            }
            // 统一使用 url 字段，本地图片保留 name
            const result = { type, url };
            if (name) {
                result.name = name;
            }
            return result;
        })
        .filter(Boolean);
}

function setPendingCodexImageInputs(nextInputs) {
    codexState.pendingImageInputs = normalizeCodexImageInputs(nextInputs);
    renderCodexImageInputs();
}

function clearPendingCodexImageInputs() {
    setPendingCodexImageInputs([]);
}

function removePendingCodexImageInput(index) {
    const next = codexState.pendingImageInputs.filter((_, itemIndex) => itemIndex !== index);
    setPendingCodexImageInputs(next);
}

function promptForCodexImageInput(type) {
    if (codexState.capabilities.imageInput !== true) {
        appendCodexLogEntry('error', t('codex.image.serverUnavailable'), { meta: 'image' });
        return;
    }
    const isLocal = type === 'localImage';

    // 隐藏操作按钮面板
    if (codexImageActions) {
        codexImageActions.hidden = true;
    }

    if (isLocal) {
        // 使用隐藏的 file input 元素触发系统文件选择器
        triggerLocalImagePicker();
        return;
    }

    // URL 输入：显示内联输入框
    codexState.pendingImagePromptType = type;

    if (codexImagePromptTitle) {
        codexImagePromptTitle.textContent = t('codex.image.promptTitle');
    }
    if (codexImagePromptInput) {
        codexImagePromptInput.placeholder = t('codex.image.inputPlaceholder');
        codexImagePromptInput.value = '';
    }

    if (codexImagePrompt) {
        codexImagePrompt.hidden = false;
    }

    if (codexImagePromptInput) {
        codexImagePromptInput.focus();
    }
}

let codexImageFileInput = null;

function getOrCreateCodexImageFileInput() {
    if (codexImageFileInput) {
        return codexImageFileInput;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.id = 'codex-image-file-input';
    document.body.appendChild(input);
    codexImageFileInput = input;

    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) {
            return;
        }
        // 读取文件并转换为 base64 data URL
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target && event.target.result;
            if (typeof dataUrl === 'string') {
                const next = codexState.pendingImageInputs.slice();
                next.push({ type: 'localImage', url: dataUrl, name: file.name });
                setPendingCodexImageInputs(next);
            }
        };
        reader.onerror = () => {
            appendCodexLogEntry('error', t('codex.image.readFailed'), { meta: 'image' });
        };
        reader.readAsDataURL(file);
        // 清理以便重复选择同一文件
        input.value = '';
    });

    return input;
}

function triggerLocalImagePicker() {
    const input = getOrCreateCodexImageFileInput();
    input.click();
}

function confirmCodexImagePrompt() {
    const type = codexState.pendingImagePromptType;
    if (!type) return;

    const rawValue = codexImagePromptInput ? codexImagePromptInput.value : '';
    const normalizedValue = typeof rawValue === 'string' ? rawValue.trim() : '';

    // 隐藏输入框
    if (codexImagePrompt) {
        codexImagePrompt.hidden = true;
    }
    codexState.pendingImagePromptType = null;

    if (!normalizedValue) {
        return;
    }

    // URL 输入（type 只会是 'image'）
    const next = codexState.pendingImageInputs.slice();
    next.push({ type: 'image', url: normalizedValue });
    setPendingCodexImageInputs(next);
}

function cancelCodexImagePrompt() {
    // 隐藏输入框
    if (codexImagePrompt) {
        codexImagePrompt.hidden = true;
    }
    codexState.pendingImagePromptType = null;
}

function renderCodexImageInputs() {
    if (!codexImageInputs) {
        return;
    }
    const enabled = codexState.capabilities.imageInput === true;
    // 注意: codexImageActions 由用户点击 "+" 按钮切换，不在此处自动显示
    // 如果 imageInput capability 被禁用，确保隐藏相关面板
    if (!enabled && codexImageActions) {
        codexImageActions.hidden = true;
    }
    if (!enabled && codexImagePrompt) {
        codexImagePrompt.hidden = true;
    }
    codexImageInputs.innerHTML = '';
    codexImageInputs.hidden = !enabled || codexState.pendingImageInputs.length === 0;
    if (!enabled) {
        return;
    }
    codexState.pendingImageInputs.forEach((entry, index) => {
        const chip = document.createElement('div');
        chip.className = 'codex-image-chip';

        const label = document.createElement('span');
        label.className = 'codex-image-chip-label';
        label.textContent = entry.type === 'localImage' ? t('codex.image.localLabel') : t('codex.image.urlLabel');

        const value = document.createElement('span');
        value.className = 'codex-image-chip-value';
        // 本地图片显示文件名，URL 显示完整 URL
        if (entry.type === 'localImage') {
            value.textContent = entry.name || t('codex.image.localLabel');
        } else {
            value.textContent = entry.url;
        }

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'codex-image-chip-remove';
        remove.textContent = 'x';
        remove.setAttribute('aria-label', t('codex.image.removeLabel'));
        remove.addEventListener('click', () => {
            removePendingCodexImageInput(index);
        });

        chip.appendChild(label);
        chip.appendChild(value);
        chip.appendChild(remove);
        codexImageInputs.appendChild(chip);
    });
}

function renderCodexQuickControls() {
    if (codexQuickModel) {
        populateCodexQuickModelSelect(codexState.nextTurnOverrides.model || '');
    }
    if (codexQuickReasoning) {
        populateCodexReasoningSelect(codexQuickReasoning, {
            defaultLabel: buildReasoningDefaultLabel(),
            forcedValue: codexState.nextTurnOverrides.reasoningEffort || '',
            modelId: resolveReasoningModelId()
        });
    }
    if (codexQuickSandbox) {
        codexQuickSandbox.value = codexState.nextTurnOverrides.sandbox || '';
    }
    if (btnCodexQuickClear) {
        btnCodexQuickClear.disabled = !codexState.nextTurnOverrides.model && !codexState.nextTurnOverrides.reasoningEffort && !codexState.nextTurnOverrides.sandbox;
    }
}

function populateCodexQuickModelSelect(forcedValue) {
    if (!codexQuickModel) return;
    const selectedValue = typeof forcedValue === 'string' ? forcedValue : (codexQuickModel.value || '');
    codexQuickModel.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = buildModelDefaultLabel();
    codexQuickModel.appendChild(defaultOption);
    const seen = new Set(['']);
    codexState.modelCatalog.forEach((model) => {
        if (!model || !model.id || seen.has(model.id)) return;
        seen.add(model.id);
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.label;
        codexQuickModel.appendChild(option);
    });
    if (selectedValue && !seen.has(selectedValue)) {
        const option = document.createElement('option');
        option.value = selectedValue;
        option.textContent = t('codex.model.customSuffix', { value: selectedValue });
        codexQuickModel.appendChild(option);
    }
    codexQuickModel.value = selectedValue;
}

function buildModelDefaultLabel() {
    if (codexState.settingsLoadingModels) {
        return t('codex.model.loading');
    }
    const effectiveModel = codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnEffectiveCodexConfig.model
        ? codexState.nextTurnEffectiveCodexConfig.model
        : '';
    if (effectiveModel) {
        return effectiveModel;
    }
    const defaultModelEntry = codexState.modelCatalog.find((entry) => entry && entry.isDefault === true)
        || codexState.modelCatalog.find((entry) => entry && entry.id)
        || null;
    return defaultModelEntry ? defaultModelEntry.label : t('codex.model.unresolved');
}

function buildReasoningDefaultLabel() {
    const effectiveReasoning = codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnEffectiveCodexConfig.reasoningEffort
        ? codexState.nextTurnEffectiveCodexConfig.reasoningEffort
        : '';
    if (effectiveReasoning && getReasoningEffortLabels()[effectiveReasoning]) {
        return getReasoningEffortLabels()[effectiveReasoning];
    }
    const fallbackModelId = resolveReasoningModelId();
    const fallbackModelEntry = findCodexModelEntry(fallbackModelId)
        || codexState.modelCatalog.find((entry) => entry && entry.isDefault === true)
        || codexState.modelCatalog.find((entry) => entry && entry.id)
        || null;
    const defaultReasoning = fallbackModelEntry && typeof fallbackModelEntry.defaultReasoningEffort === 'string'
        ? fallbackModelEntry.defaultReasoningEffort
        : '';
    return defaultReasoning && getReasoningEffortLabels()[defaultReasoning]
        ? getReasoningEffortLabels()[defaultReasoning]
        : t('codex.effort.unresolved');
}

function resolveReasoningModelId() {
    if (codexState.nextTurnOverrides.model) {
        return codexState.nextTurnOverrides.model;
    }
    if (codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnEffectiveCodexConfig.model) {
        return codexState.nextTurnEffectiveCodexConfig.model;
    }
    const stored = getStoredCodexConfig();
    if (stored && stored.defaultModel) {
        return stored.defaultModel;
    }
    const defaultModelEntry = codexState.modelCatalog.find((entry) => entry && entry.isDefault === true)
        || codexState.modelCatalog.find((entry) => entry && entry.id)
        || null;
    return defaultModelEntry ? defaultModelEntry.id : '';
}

function openSelectPicker(selectEl) {
    if (!selectEl) return;
    selectEl.focus();
    if (typeof selectEl.showPicker === 'function') {
        try {
            selectEl.showPicker();
            return;
        } catch (_) {
            // Fallback to click for browsers without programmatic picker support.
        }
    }
    selectEl.click();
}

function renderCodexSlashMenu() {
    if (!codexSlashMenu || !codexSlashMenuList || !codexSlashMenuEmpty) {
        return;
    }
    const isSkillQuery = canLoadCodexSkills() && codexState.slashMenuQuery.startsWith('/skill');
    const skillItems = getDiscoverableCodexSkills(codexState.slashMenuQuery);
    const slashApi = getCodexSlashCommandsApi();
    const items = isSkillQuery
        ? []
        : (slashApi && typeof slashApi.getDiscoverableSlashCommands === 'function'
        ? slashApi.getDiscoverableSlashCommands({
            registry: codexState.slashRegistry,
            capabilities: codexState.capabilities,
            query: codexState.slashMenuQuery
        })
        : []);
    const shouldShow = codexState.slashMenuOpen === true && getActiveSessionMode() === 'codex' && codexState.capabilities.slashCommands === true;
    codexSlashMenu.hidden = !shouldShow;
    codexSlashMenuList.innerHTML = '';
    if (isSkillQuery && codexState.skillsLoading) {
        codexSlashMenuEmpty.textContent = t('codex.slash.loadingSkills');
    } else if (isSkillQuery && codexState.skillListRequested && skillItems.length === 0) {
        codexSlashMenuEmpty.textContent = t('codex.slash.noMatchingSkills');
    } else {
        codexSlashMenuEmpty.textContent = t('codex.slash.noMatchingCommands');
    }
    codexSlashMenuEmpty.hidden = isSkillQuery ? skillItems.length > 0 : (items.length > 0 || skillItems.length > 0);
    if (!shouldShow) {
        return;
    }
    if (skillItems.length > 0) {
        skillItems.forEach((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'codex-slash-item';
            const copy = document.createElement('span');
            copy.className = 'codex-slash-item-copy';
            const command = document.createElement('span');
            command.className = 'codex-slash-item-command';
            command.textContent = '$';
            const title = document.createElement('span');
            title.className = 'codex-slash-item-title';
            title.textContent = entry.label;
            copy.appendChild(command);
            copy.appendChild(title);
            if (entry.description) {
                const meta = document.createElement('span');
                meta.className = 'codex-slash-item-title';
                meta.textContent = entry.description;
                copy.appendChild(meta);
            }
            button.appendChild(copy);
            button.addEventListener('click', () => {
                applyCodexSkillSelection(entry);
            });
            codexSlashMenuList.appendChild(button);
        });
        return;
    }
    items.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'codex-slash-item';
        if (entry.availability !== 'enabled') {
            button.classList.add('is-disabled');
        }
        const copy = document.createElement('span');
        copy.className = 'codex-slash-item-copy';
        const command = document.createElement('span');
        command.className = 'codex-slash-item-command';
        command.textContent = entry.command;
        const title = document.createElement('span');
        title.className = 'codex-slash-item-title';
        title.textContent = entry.title;
        copy.appendChild(command);
        copy.appendChild(title);
        button.appendChild(copy);
        if (entry.availability !== 'enabled') {
            const status = document.createElement('span');
            status.className = 'codex-slash-item-status';
            status.textContent = entry.availability === 'contract_frozen_not_enabled' ? t('codex.slash.contractFrozen') : t('codex.slash.reserved');
            button.appendChild(status);
        }
        button.addEventListener('click', () => {
            applySlashCommandSelection(entry.command);
        });
        codexSlashMenuList.appendChild(button);
    });
}

function setSlashMenuState(open, query) {
    codexState.slashMenuOpen = open === true;
    codexState.slashMenuQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
    renderCodexSlashMenu();
}

let codexFileMentionMenu = null;
let codexFileMentionMenuList = null;
let codexFileMentionMenuEmpty = null;
let codexFileMentionMenuLoading = null;
let codexFileMentionChips = null;

function getOrCreateCodexFileMentionElements() {
    if (!codexFileMentionMenu) {
        codexFileMentionMenu = document.getElementById('codex-file-mention-menu');
    }
    if (!codexFileMentionMenuList) {
        codexFileMentionMenuList = codexFileMentionMenu ? codexFileMentionMenu.querySelector('.codex-file-mention-list') : null;
    }
    if (!codexFileMentionMenuEmpty) {
        codexFileMentionMenuEmpty = codexFileMentionMenu ? codexFileMentionMenu.querySelector('.codex-file-mention-empty') : null;
    }
    if (!codexFileMentionMenuLoading) {
        codexFileMentionMenuLoading = codexFileMentionMenu ? codexFileMentionMenu.querySelector('.codex-file-mention-loading') : null;
    }
    if (!codexFileMentionChips) {
        codexFileMentionChips = document.getElementById('codex-file-mention-chips');
    }
}

function setFileMentionMenuState(open, query, results, loading) {
    getOrCreateCodexFileMentionElements();
    codexState.fileMentionMenuOpen = open === true;
    codexState.fileMentionQuery = typeof query === 'string' ? query : '';
    if (Array.isArray(results)) {
        codexState.fileMentionResults = results;
    }
    codexState.fileMentionLoading = loading === true;
    codexState.activeFileMentionIndex = -1;
    renderCodexFileMentionMenu();
}

function renderCodexFileMentionMenu() {
    getOrCreateCodexFileMentionElements();
    if (!codexFileMentionMenu) return;

    const shouldShow = codexState.fileMentionMenuOpen === true && getActiveSessionMode() === 'codex' && codexState.capabilities.fileMentions === true;
    codexFileMentionMenu.hidden = !shouldShow;

    if (!shouldShow) return;

    if (codexState.fileMentionLoading) {
        if (codexFileMentionMenuLoading) codexFileMentionMenuLoading.style.display = 'block';
        if (codexFileMentionMenuEmpty) codexFileMentionMenuEmpty.style.display = 'none';
        if (codexFileMentionMenuList) codexFileMentionMenuList.style.display = 'none';
        return;
    }

    if (codexFileMentionMenuLoading) codexFileMentionMenuLoading.style.display = 'none';

    if (codexState.fileMentionResults.length === 0) {
        if (codexFileMentionMenuEmpty) {
            codexFileMentionMenuEmpty.style.display = 'block';
            codexFileMentionMenuEmpty.textContent = codexState.fileMentionQuery ? t('codex.fileMention.empty') : t('codex.fileMention.noFiles');
        }
        if (codexFileMentionMenuList) codexFileMentionMenuList.style.display = 'none';
        return;
    }

    if (codexFileMentionMenuEmpty) codexFileMentionMenuEmpty.style.display = 'none';
    if (codexFileMentionMenuList) {
        codexFileMentionMenuList.style.display = 'flex';
        codexFileMentionMenuList.innerHTML = '';
        codexState.fileMentionResults.forEach((file, idx) => {
            const item = document.createElement('div');
            item.className = 'codex-file-mention-item';
            if (idx === codexState.activeFileMentionIndex) {
                item.classList.add('active');
            }
            const label = document.createElement('span');
            label.className = 'item-label';
            label.textContent = file.label;
            const path = document.createElement('span');
            path.className = 'item-path';
            path.textContent = file.relativePathWithoutFileName || '';
            item.appendChild(label);
            item.appendChild(path);
            item.addEventListener('click', () => handleFileMentionSelect(file));
            codexFileMentionMenuList.appendChild(item);
        });
    }
}

function renderCodexFileMentionChips() {
    getOrCreateCodexFileMentionElements();
    if (!codexFileMentionChips) return;
    codexFileMentionChips.innerHTML = '';
    codexState.pendingFileMentions.forEach((file, idx) => {
        const chip = document.createElement('div');
        chip.className = 'codex-file-mention-chip';
        const label = document.createElement('span');
        label.className = 'chip-label';
        label.textContent = file.label;
        const remove = document.createElement('button');
        remove.className = 'chip-remove';
        remove.type = 'button';
        remove.textContent = '\u00D7';
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFileMentionChip(idx);
        });
        chip.appendChild(label);
        chip.appendChild(remove);
        codexFileMentionChips.appendChild(chip);
    });
    const hasChips = codexState.pendingFileMentions.length > 0;
    codexFileMentionChips.hidden = !hasChips;
}

function handleFileMentionSelect(file) {
    if (!file || !file.path) return;
    const normalizedFile = {
        label: String(file.label || ''),
        path: String(file.path || ''),
        relativePathWithoutFileName: String(file.relativePathWithoutFileName || ''),
        fsPath: String(file.fsPath || file.path || '')
    };
    codexState.pendingFileMentions.push(normalizedFile);
    const slashApi = getCodexSlashCommandsApi();
    if (slashApi && typeof slashApi.parseFileMentionInput === 'function' && codexInput) {
        const parsed = slashApi.parseFileMentionInput(codexInput.value);
        if (parsed && parsed.kind === 'file-mention') {
            const before = codexInput.value.slice(0, parsed.tokenStart);
            const after = codexInput.value.slice(parsed.tokenEnd);
            codexInput.value = before + after;
            codexInput.focus();
        }
    }
    setFileMentionMenuState(false);
    renderCodexFileMentionChips();
}

function removeFileMentionChip(index) {
    if (index < 0 || index >= codexState.pendingFileMentions.length) return;
    codexState.pendingFileMentions.splice(index, 1);
    renderCodexFileMentionChips();
}

async function searchWorkspaceFiles(query) {
    console.log('[FileMention] searchWorkspaceFiles called, query:', query, 'sessionId:', sessionId, 'serverUrl:', serverUrl, 'capabilities.fileMentions:', codexState.capabilities.fileMentions);
    if (!sessionId) {
        console.warn('[FileMention] No sessionId, aborting');
        return;
    }
    if (!codexState.capabilities.fileMentions) {
        console.warn('[FileMention] fileMentions capability disabled, aborting');
        return;
    }

    setFileMentionMenuState(true, query, [], true);
    try {
        // Use absolute URL for Android WebView (file:// scheme doesn't support fetch)
        const basePath = serverUrl ? serverUrl.replace(/\/+$/, '') : '';
        const url = `${basePath}/api/sessions/${encodeURIComponent(sessionId)}/workspace/files?q=${encodeURIComponent(query || '')}&limit=20`;
        console.log('[FileMention] Fetching:', url);
        const fetchOpts = {};
        if (authHeader) {
            fetchOpts.headers = { 'Authorization': authHeader };
        }
        const resp = await fetch(url, fetchOpts);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        console.log('[FileMention] Response:', JSON.stringify(data).slice(0, 500));
        if (codexState.fileMentionMenuOpen) {
            setFileMentionMenuState(true, query, Array.isArray(data.files) ? data.files : [], false);
        }
    } catch (err) {
        console.error('[FileMention] Workspace file search failed:', err);
        if (codexState.fileMentionMenuOpen) {
            setFileMentionMenuState(true, query, [], false);
        }
    }
}

function applySlashCommandSelection(command) {
    if (!codexInput) return;
    const registryEntry = resolveExecutableCodexSlashCommand(command);
    if (!registryEntry) {
        codexInput.value = '';
        setSlashMenuState(false, '');
        appendCodexLogEntry('error', buildUnsupportedSlashCommandMessage(), { meta: 'slash' });
        return;
    }
    codexInput.value = registryEntry.command;
    codexInput.focus();
    if (registryEntry.command === '/model' && codexQuickModel) {
        codexInput.value = '';
        setSlashMenuState(false, '');
        void openCodexModelPicker();
        return;
    }
    if (registryEntry.command === '/skill') {
        codexInput.value = '/skill ';
        void maybeLoadCodexSkills();
        setSlashMenuState(true, '/skill ');
        return;
    }
    if (registryEntry.command === '/skills') {
        codexInput.value = '';
        setSlashMenuState(false, '');
        openCodexToolsPanel('skills');
        return;
    }
    if (registryEntry.command === '/compact') {
        codexInput.value = '';
        setSlashMenuState(false, '');
        openCodexToolsPanel('compact');
        return;
    }
    setSlashMenuState(true, registryEntry.command);
}

function updateSlashMenuForInputValue() {
    if (!codexInput) return;
    const slashApi = getCodexSlashCommandsApi();

    // Check for @ file mention first
    if (slashApi && typeof slashApi.parseFileMentionInput === 'function') {
        const fileMention = slashApi.parseFileMentionInput(codexInput.value);
        if (fileMention && codexState.capabilities.fileMentions) {
            void searchWorkspaceFiles(fileMention.query);
            return;
        }
    }

    const parsed = slashApi && typeof slashApi.parseComposerInput === 'function'
        ? slashApi.parseComposerInput(codexInput.value)
        : { kind: 'text' };
    if (parsed.kind !== 'slash') {
        setSlashMenuState(false, '');
        setFileMentionMenuState(false);
        return;
    }
    if (parsed.command === '/skill') {
        void maybeLoadCodexSkills();
    }
    setSlashMenuState(true, parsed.text || parsed.command || '/');
}


function setCodexSettingsStatus(text, tone) {
    void text;
    void tone;
    renderCodexAuxStatus();
}

function clampPercent(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }
    if (value <= 0) return 0;
    if (value >= 100) return 100;
    return Math.floor(value);
}

function normalizeCodexContextUsage(payload) {
    const sources = [
        payload,
        payload && payload.latestTokenUsageInfo,
        payload && payload.tokenUsage,
        payload && payload.tokenUsage && payload.tokenUsage.latestTokenUsageInfo,
        payload && payload.usage,
        payload && payload.contextUsage,
        payload && payload.context_usage,
        payload && payload.thread,
        payload && payload.thread && payload.thread.latestTokenUsageInfo,
        payload && payload.thread && payload.thread.tokenUsage,
        payload && payload.thread && payload.thread.tokenUsage && payload.thread.tokenUsage.latestTokenUsageInfo
    ];
    const latestTokenUsageInfo = pickFirstObjectValue(sources, [
        ['latestTokenUsageInfo'],
        ['thread', 'latestTokenUsageInfo'],
        ['tokenUsage', 'latestTokenUsageInfo'],
        ['thread', 'tokenUsage', 'latestTokenUsageInfo']
    ]);
    const modelContextWindow = pickFirstNumber(sources, [
        ['modelContextWindow'],
        ['model_context_window']
    ]);
    const nestedTotalTokens = pickFirstNumber(sources, [
        ['last', 'totalTokens'],
        ['last', 'total_tokens']
    ]);
    const usedTokens = pickFirstNumber(sources, [
        ['usedTokens'],
        ['used_tokens'],
        ['last', 'totalTokens'],
        ['last', 'total_tokens'],
        ['totalTokens'],
        ['total_tokens'],
        ['inputTokens'],
        ['input_tokens'],
        ['promptTokens'],
        ['prompt_tokens']
    ]);
    const maxTokens = pickFirstNumber(sources, [
        ['maxTokens'],
        ['max_tokens'],
        ['contextWindowTokens'],
        ['context_window_tokens'],
        ['contextWindowMaxTokens'],
        ['context_window_max_tokens'],
        ['maxContextTokens'],
        ['max_context_tokens']
    ]);
    const explicitPercent = pickFirstNumber(sources, [
        ['usedPercent'],
        ['used_percent'],
        ['contextUsedPercent'],
        ['context_used_percent'],
        ['usagePercent'],
        ['usage_percent']
    ]);
    if (
        typeof modelContextWindow === 'number'
        && Number.isFinite(modelContextWindow)
        && modelContextWindow > 0
        && typeof nestedTotalTokens === 'number'
        && Number.isFinite(nestedTotalTokens)
        && nestedTotalTokens >= 0
    ) {
        const safeUsedTokens = Math.min(nestedTotalTokens, modelContextWindow);
        const usedPercent = clampPercent((safeUsedTokens / modelContextWindow) * 100);
        if (usedPercent === null) {
            return null;
        }
        return {
            usedTokens: safeUsedTokens,
            maxTokens: modelContextWindow,
            usedPercent,
            remainingPercent: Math.max(0, 100 - usedPercent),
            remainingTokens: Math.max(modelContextWindow - safeUsedTokens, 0),
            debug: {
                latestTokenUsageInfo: latestTokenUsageInfo || {
                    modelContextWindow,
                    last: {
                        totalTokens: nestedTotalTokens
                    }
                },
                modelContextWindow,
                lastTotalTokens: nestedTotalTokens,
                usedTokens: safeUsedTokens,
                contextWindow: modelContextWindow,
                remainingTokens: Math.max(modelContextWindow - safeUsedTokens, 0),
                percent: usedPercent
            }
        };
    }
    const usedPercent = clampPercent(
        typeof explicitPercent === 'number'
            ? explicitPercent
            : (typeof usedTokens === 'number' && typeof maxTokens === 'number' && maxTokens > 0)
                ? ((usedTokens / maxTokens) * 100)
                : null
    );
    if (usedPercent === null) {
        return null;
    }
    return {
        usedTokens: typeof usedTokens === 'number' && Number.isFinite(usedTokens) && usedTokens >= 0 ? usedTokens : null,
        maxTokens: typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : null,
        usedPercent,
        remainingPercent: Math.max(0, 100 - usedPercent),
        remainingTokens: typeof usedTokens === 'number' && typeof maxTokens === 'number' && maxTokens > 0
            ? Math.max(maxTokens - Math.min(usedTokens, maxTokens), 0)
            : null,
        debug: {
            latestTokenUsageInfo: latestTokenUsageInfo || null,
            modelContextWindow: typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : null,
            lastTotalTokens: typeof usedTokens === 'number' && Number.isFinite(usedTokens) && usedTokens >= 0 ? usedTokens : null,
            usedTokens: typeof usedTokens === 'number' && Number.isFinite(usedTokens) && usedTokens >= 0 ? usedTokens : null,
            contextWindow: typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : null,
            remainingTokens: typeof usedTokens === 'number' && typeof maxTokens === 'number' && maxTokens > 0
                ? Math.max(maxTokens - Math.min(usedTokens, maxTokens), 0)
                : null,
            percent: usedPercent
        }
    };
}

function renderCodexContextUsage() {
    const usage = codexState.contextUsage;
    const showWidget = getActiveSessionMode() === 'codex';
    if (codexContextWidget) {
        codexContextWidget.hidden = !showWidget;
    }
    if (codexContextRing) {
        const angle = usage ? Math.round((usage.usedPercent / 100) * 360) : 0;
        codexContextRing.style.setProperty('--context-usage-angle', `${angle}deg`);
    }
    if (codexContextPercent) {
        codexContextPercent.textContent = usage ? `${usage.usedPercent}%` : '--';
    }
}

function formatCodexContextSummaryLine(usage) {
    if (!usage) {
        return '--';
    }
    return t('codex.context.usedPercent', { used: usage.usedPercent, remaining: usage.remainingPercent });
}

function formatCodexContextTokensLine(usage) {
    const debug = usage && usage.debug && typeof usage.debug === 'object' ? usage.debug : null;
    const usedTokens = debug && typeof debug.usedTokens === 'number' ? debug.usedTokens : null;
    const contextWindow = debug && typeof debug.contextWindow === 'number' ? debug.contextWindow : null;
    if (usedTokens === null || contextWindow === null) {
        return '--';
    }
    return t('codex.context.tokenSummary', { usedTokens: formatCompactNumber(usedTokens), totalTokens: formatCompactNumber(contextWindow) });
}

function renderCodexContextDebugModal() {
    if (codexContextDebugModal) {
        codexContextDebugModal.hidden = !codexState.contextDebugModalOpen;
    }
    const usage = codexState.contextUsage;
    if (codexContextDebugUsage) {
        codexContextDebugUsage.textContent = formatCodexContextSummaryLine(usage);
    }
    if (codexContextDebugTokens) {
        codexContextDebugTokens.textContent = formatCodexContextTokensLine(usage);
    }
    if (codexContextDebugNote) {
        codexContextDebugNote.textContent = t('codex.context.autoCompact');
    }
}

function setCodexContextDebugModalOpen(open) {
    codexState.contextDebugModalOpen = open === true && getActiveSessionMode() === 'codex';
    renderCodexContextDebugModal();
}

function normalizeCodexModelOptions(result) {
    return normalizeCodexModelCatalog(result).map((entry) => entry.id);
}

function normalizeCodexSkillCatalog(result) {
    const source = result && typeof result === 'object' ? result : {};
    const groups = Array.isArray(source.data) ? source.data : [];
    const seen = new Set();
    const skills = [];
    groups.forEach((group) => {
        const entries = group && Array.isArray(group.skills) ? group.skills : [];
        entries.forEach((entry) => {
            if (!entry || typeof entry !== 'object' || entry.enabled !== true) {
                return;
            }
            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            if (!name || seen.has(name)) {
                return;
            }
            seen.add(name);
            const ui = entry.interface && typeof entry.interface === 'object' ? entry.interface : {};
            skills.push({
                name,
                label: typeof ui.displayName === 'string' && ui.displayName.trim() ? ui.displayName.trim() : name,
                description: typeof ui.shortDescription === 'string' && ui.shortDescription.trim()
                    ? ui.shortDescription.trim()
                    : (typeof entry.description === 'string' ? entry.description.trim() : ''),
                defaultPrompt: typeof ui.defaultPrompt === 'string' ? ui.defaultPrompt.trim() : '',
                scope: typeof entry.scope === 'string' ? entry.scope.trim() : ''
            });
        });
    });
    return skills;
}

function normalizeCodexModelCatalog(result) {
    const source = result && typeof result === 'object' ? result : {};
    const models = Array.isArray(source.data)
        ? source.data
        : (Array.isArray(source.models) ? source.models : []);
    return models
        .map((entry) => {
            if (typeof entry === 'string') {
                const id = entry.trim();
                return id ? {
                    id,
                    label: id,
                    defaultReasoningEffort: '',
                    supportedReasoningEfforts: []
                } : null;
            }
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            const id = typeof entry.id === 'string'
                ? entry.id.trim()
                : (typeof entry.model === 'string' ? entry.model.trim() : '');
            if (!id) {
                return null;
            }
            const label = typeof entry.displayName === 'string' && entry.displayName.trim()
                ? entry.displayName.trim()
                : id;
            const supportedReasoningEfforts = Array.isArray(entry.supportedReasoningEfforts)
                ? entry.supportedReasoningEfforts
                    .map((item) => {
                        if (typeof item === 'string') {
                            return item.trim().toLowerCase();
                        }
                        if (item && typeof item === 'object' && typeof item.reasoningEffort === 'string') {
                            return item.reasoningEffort.trim().toLowerCase();
                        }
                        return '';
                    })
                    .filter((value, index, arr) => value && arr.indexOf(value) === index)
                : [];
            return {
                id,
                label,
                description: typeof entry.description === 'string' ? entry.description.trim() : '',
                defaultReasoningEffort: typeof entry.defaultReasoningEffort === 'string'
                    ? entry.defaultReasoningEffort.trim().toLowerCase()
                    : '',
                supportedReasoningEfforts,
                isDefault: entry.isDefault === true,
                hidden: entry.hidden === true
            };
        })
        .filter((entry) => entry && entry.hidden !== true);
}

function findCodexModelEntry(modelId) {
    if (typeof modelId !== 'string' || !modelId.trim()) {
        return null;
    }
    return codexState.modelCatalog.find((entry) => entry.id === modelId.trim()) || null;
}

function canLoadCodexModels() {
    return getActiveSessionMode() === 'codex' && codexState.capabilities.modelConfig === true;
}

function getReasoningOptionsForModel(modelId) {
    const modelEntry = findCodexModelEntry(modelId);
    const options = modelEntry && Array.isArray(modelEntry.supportedReasoningEfforts)
        ? modelEntry.supportedReasoningEfforts
        : [];
    return options.filter((value, index, arr) => getReasoningEffortLabels()[value] && arr.indexOf(value) === index);
}

function canLoadCodexSkills() {
    return getActiveSessionMode() === 'codex' && codexState.capabilities.skillsList === true;
}

function maybeLoadCodexSkills() {
    if (!canLoadCodexSkills()) {
        return Promise.resolve([]);
    }
    if (codexState.skillCatalog.length > 0) {
        return Promise.resolve(codexState.skillCatalog);
    }
    if (codexState.skillListPromise) {
        return codexState.skillListPromise;
    }
    if (codexState.skillListRequested) {
        return Promise.resolve(codexState.skillCatalog);
    }
    codexState.skillListRequested = true;
    codexState.skillsLoading = true;
    renderCodexSlashMenu();
    renderCodexToolsPanel();
    codexState.skillListPromise = sendCodexBridgeRequest('skills/list', {})
        .then((result) => {
            codexState.skillCatalog = normalizeCodexSkillCatalog(result);
            renderCodexSlashMenu();
            renderCodexToolsPanel();
            return codexState.skillCatalog;
        })
        .catch(() => {
            codexState.skillListRequested = false;
            renderCodexSlashMenu();
            renderCodexToolsPanel();
            return [];
        })
        .finally(() => {
            codexState.skillListPromise = null;
            codexState.skillsLoading = false;
            renderCodexSlashMenu();
            renderCodexToolsPanel();
        });
    return codexState.skillListPromise;
}

function getDiscoverableCodexSkills(query) {
    if (!canLoadCodexSkills()) {
        return [];
    }
    const text = typeof query === 'string' ? query.trim().toLowerCase() : '';
    if (!text.startsWith('/skill')) {
        return [];
    }
    const keyword = '/skill';
    const search = text.startsWith('/skill ')
        ? text.slice(keyword.length).trim()
        : '';
    return codexState.skillCatalog.filter((entry) => {
        if (!search) {
            return true;
        }
        return entry.name.toLowerCase().includes(search)
            || entry.label.toLowerCase().includes(search)
            || entry.description.toLowerCase().includes(search);
    });
}

function findCodexSkillEntry(skillName) {
    if (typeof skillName !== 'string' || !skillName.trim()) {
        return null;
    }
    const normalized = skillName.trim().toLowerCase();
    return codexState.skillCatalog.find((entry) => (
        entry.name.toLowerCase() === normalized || entry.label.toLowerCase() === normalized
    )) || null;
}

function applyCodexSkillSelection(skillEntry) {
    if (!skillEntry) {
        return;
    }
    setCodexInteractionState({
        planMode: codexState.interactionState.planMode === true,
        activeSkill: skillEntry.name
    });
    if (codexInput) {
        codexInput.focus();
    }
    setSlashMenuState(false, '');
    if (codexState.secondaryPanel === 'tools') {
        setCodexSecondaryPanel('none');
    }
}

function populateCodexReasoningSelect(selectEl, options) {
    if (!selectEl) return;
    const opts = options || {};
    const selectedValue = typeof opts.forcedValue === 'string' ? opts.forcedValue : (selectEl.value || '');
    const optionValues = getReasoningOptionsForModel(opts.modelId);
    selectEl.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = opts.defaultLabel || t('common.default');
    selectEl.appendChild(defaultOption);

    optionValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = getReasoningEffortLabels()[value] || value;
        selectEl.appendChild(option);
    });
    selectEl.value = optionValues.includes(selectedValue) ? selectedValue : '';
}

function shouldShowCodexRuntimePanel() {
    const runtimeApi = getCodexRuntimeViewApi();
    if (runtimeApi && typeof runtimeApi.shouldShowRuntimePanel === 'function') {
        return runtimeApi.shouldShowRuntimePanel({
            sessionMode: getActiveSessionMode(),
            capabilities: codexState.capabilities
        });
    }
    return getActiveSessionMode() === 'codex' && codexState.capabilities.diffPlanReasoning === true;
}

function trimRuntimePanelText(value, maxLength) {
    const text = typeof value === 'string' ? value : '';
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.slice(text.length - maxLength);
}

function clearCodexRuntimePanels() {
    codexState.runtimeDiff = '';
    codexState.runtimePlan = '';
    codexState.runtimeReasoning = '';
    codexState.runtimeTerminalOutput = '';
    codexState.runtimeWarning = '';
    codexState.runtimeWarningTone = '';
    renderCodexRuntimePanel();
}

function clearCodexAlerts() {
    codexState.configWarningText = '';
    codexState.deprecationNoticeText = '';
    renderCodexAlerts();
    renderCodexAuxStatus();
}

function shouldShowCodexToolsPanel() {
    return getActiveSessionMode() === 'codex'
        && (codexState.capabilities.skillsList === true || codexState.capabilities.compact === true);
}

function getDefaultCodexToolsPanelFocus() {
    if (codexState.capabilities.skillsList === true) {
        return 'skills';
    }
    if (codexState.capabilities.compact === true) {
        return 'compact';
    }
    return 'skills';
}

function setCodexToolsPanelFocus(focus) {
    codexState.toolsPanelFocus = focus === 'compact' ? 'compact' : 'skills';
}

function setCodexCompactStatus(text, tone) {
    codexState.compactStatusText = typeof text === 'string' ? text.trim() : '';
    codexState.compactStatusTone = typeof tone === 'string' ? tone.trim() : '';
    renderCodexToolsPanel();
}

function openCodexToolsPanel(focus) {
    setCodexToolsPanelFocus(focus || getDefaultCodexToolsPanelFocus());
    if (codexState.compactSubmitting !== true) {
        codexState.compactStatusText = '';
        codexState.compactStatusTone = '';
    }
    if (codexState.toolsPanelFocus === 'skills') {
        void maybeLoadCodexSkills();
    }
    setCodexSecondaryPanel('tools');
}

function renderCodexToolsPanel() {
    if (!codexToolsPanel) {
        return;
    }
    const shouldShowPanel = shouldShowCodexToolsPanel();
    codexToolsPanel.hidden = !(shouldShowPanel && syncCodexSecondaryPanelState() === 'tools');
    if (!shouldShowPanel) {
        return;
    }

    const skillsEnabled = codexState.capabilities.skillsList === true;
    const compactEnabled = codexState.capabilities.compact === true;
    const focus = codexState.toolsPanelFocus === 'compact' ? 'compact' : 'skills';
    const hasThread = !!(typeof codexState.threadId === 'string' && codexState.threadId.trim());
    const compactStatusText = codexState.compactStatusText
        || (
            !compactEnabled ? t('codex.compact.serverUnavailable')
                : !hasThread ? t('codex.compact.noThread')
                    : t('codex.compact.readyDesc')
        );

    if (codexToolsSkillsCard) {
        codexToolsSkillsCard.hidden = !skillsEnabled;
        codexToolsSkillsCard.classList.toggle('is-focus', skillsEnabled && focus === 'skills');
    }
    if (codexToolsCompactCard) {
        codexToolsCompactCard.hidden = !compactEnabled;
        codexToolsCompactCard.classList.toggle('is-focus', compactEnabled && focus === 'compact');
    }
    if (codexToolsSkillsMeta) {
        if (skillsEnabled && codexState.skillsLoading) {
            codexToolsSkillsMeta.textContent = t('codex.skills.loading');
        } else if (skillsEnabled && codexState.skillCatalog.length > 0) {
            codexToolsSkillsMeta.textContent = t('codex.skills.count', { count: codexState.skillCatalog.length });
        } else {
            codexToolsSkillsMeta.textContent = skillsEnabled ? t('codex.skills.waiting') : '';
        }
    }
    if (codexToolsSkillsEmpty) {
        if (!skillsEnabled) {
            codexToolsSkillsEmpty.hidden = true;
        } else if (codexState.skillsLoading) {
            codexToolsSkillsEmpty.hidden = false;
            codexToolsSkillsEmpty.textContent = t('codex.skills.loadingList');
        } else if (codexState.skillListRequested && codexState.skillCatalog.length === 0) {
            codexToolsSkillsEmpty.hidden = false;
            codexToolsSkillsEmpty.textContent = t('codex.skills.noneAvailable');
        } else if (codexState.skillCatalog.length === 0) {
            codexToolsSkillsEmpty.hidden = false;
            codexToolsSkillsEmpty.innerHTML = t('codex.tools.skillsEmpty');
        } else {
            codexToolsSkillsEmpty.hidden = true;
        }
    }
    if (codexToolsSkillsList) {
        codexToolsSkillsList.innerHTML = '';
        if (skillsEnabled) {
            codexState.skillCatalog.forEach((entry) => {
                const item = document.createElement('div');
                item.className = 'codex-tools-skill-item';
                const copy = document.createElement('div');
                copy.className = 'codex-tools-skill-copy';
                const title = document.createElement('div');
                title.className = 'codex-tools-skill-name';
                title.textContent = entry.label;
                copy.appendChild(title);
                const desc = document.createElement('div');
                desc.className = 'codex-tools-skill-desc';
                desc.textContent = entry.description || t('codex.skills.noDescription');
                copy.appendChild(desc);
                const action = document.createElement('button');
                action.type = 'button';
                action.className = 'codex-btn subtle';
                action.textContent = t('codex.skills.selectBtn');
                action.addEventListener('click', () => {
                    applyCodexSkillSelection(entry);
                });
                item.appendChild(copy);
                item.appendChild(action);
                codexToolsSkillsList.appendChild(item);
            });
        }
    }
    if (codexToolsCompactMeta) {
        codexToolsCompactMeta.textContent = hasThread ? t('codex.skills.threadAvailable') : t('codex.skills.threadWaiting');
    }
    if (codexToolsCompactStatus) {
        codexToolsCompactStatus.textContent = compactStatusText;
        codexToolsCompactStatus.classList.toggle('tone-error', codexState.compactStatusTone === 'error');
        codexToolsCompactStatus.classList.toggle('tone-success', codexState.compactStatusTone === 'success');
    }
    if (btnCodexCompactConfirm) {
        btnCodexCompactConfirm.disabled = !compactEnabled || !hasThread || codexState.compactSubmitting === true;
        btnCodexCompactConfirm.textContent = codexState.compactSubmitting === true
            ? t('codex.compact.compressing')
            : t('codex.tools.compactConfirm');
    }
}

function requestCodexCompactCurrentThread() {
    if (codexState.capabilities.compact !== true) {
        setCodexCompactStatus(t('codex.compact.serverUnavailable'), 'error');
        return Promise.resolve(null);
    }
    const threadId = typeof codexState.threadId === 'string' ? codexState.threadId.trim() : '';
    if (!threadId) {
        setCodexCompactStatus(t('codex.compact.noThread'), 'error');
        return Promise.resolve(null);
    }

    codexState.compactSubmitting = true;
    setCodexCompactStatus(t('codex.compact.requesting'), '');
    return sendCodexBridgeRequest('thread/compact/start', { threadId }, { suppressErrorUi: true })
        .then((result) => {
            appendCodexLogEntry('system', t('codex.compact.requested', { id: threadId }), { meta: 'compact' });
            setCodexCompactStatus(t('codex.compact.requestSubmitted'), '');
            setCodexSecondaryPanel('none');
            return result;
        })
        .catch((error) => {
            codexState.compactSubmitting = false;
            setCodexCompactStatus(error && error.message ? error.message : t('codex.compact.failed'), 'error');
            return null;
        })
        .finally(() => {
            renderCodexToolsPanel();
        });
}

function resolveCodexCompactThreadId(params) {
    if (params && typeof params.threadId === 'string' && params.threadId.trim()) {
        return params.threadId.trim();
    }
    if (params && params.thread && typeof params.thread.id === 'string' && params.thread.id.trim()) {
        return params.thread.id.trim();
    }
    return '';
}

function buildCodexCompactedMessage(params) {
    const compactedThreadId = resolveCodexCompactThreadId(params) || codexState.threadId || t('codex.compact.currentThread');
    const summary = formatTokenUsageSummary(params || {});
    return summary
        ? t('codex.compact.completedWithSummary', { id: compactedThreadId, summary })
        : t('codex.compact.completed', { id: compactedThreadId });
}

function renderCodexRuntimePanel() {
    if (!codexRuntimePanel) return;
    const shouldShowPanel = shouldShowCodexRuntimePanel();
    codexRuntimePanel.hidden = !(shouldShowPanel && syncCodexSecondaryPanelState() === 'runtime');
    if (!shouldShowPanel) {
        return;
    }

    if (codexRuntimeDiff) {
        codexRuntimeDiff.textContent = codexState.runtimeDiff || t('codex.runtime.waitingDiff');
    }
    if (codexRuntimePlan) {
        codexRuntimePlan.textContent = codexState.runtimePlan || t('codex.runtime.waitingPlan');
    }
    if (codexRuntimeReasoning) {
        codexRuntimeReasoning.textContent = codexState.runtimeReasoning || t('codex.runtime.waitingReasoning');
    }
    if (codexRuntimeTerminal) {
        codexRuntimeTerminal.textContent = codexState.runtimeTerminalOutput || t('codex.runtime.waitingTerminal');
    }
    if (codexRuntimeWarning) {
        codexRuntimeWarning.hidden = !codexState.runtimeWarning;
        codexRuntimeWarning.textContent = codexState.runtimeWarning || '';
        codexRuntimeWarning.classList.toggle('tone-error', codexState.runtimeWarningTone === 'error');
    }
}

function applyCodexRuntimeUpdate(method, params) {
    const runtimeApi = getCodexRuntimeViewApi();
    if (!runtimeApi || typeof runtimeApi.buildRuntimeUpdate !== 'function') {
        return false;
    }

    const update = runtimeApi.buildRuntimeUpdate(method, params);
    if (!update || !update.section || !update.text) {
        return false;
    }

    const text = String(update.text);
    if (update.section === 'warning') {
        codexState.runtimeWarning = text;
        codexState.runtimeWarningTone = update.warningKind === 'configWarning' ? 'warn' : 'warn';
        if (update.warningKind === 'configWarning') {
            codexState.configWarningText = text;
        } else if (update.warningKind === 'deprecationNotice') {
            codexState.deprecationNoticeText = text;
        }
        renderCodexAlerts();
        renderCodexAuxStatus();
        renderCodexRuntimePanel();
        return true;
    }

    const stateKey = update.section === 'diff'
        ? 'runtimeDiff'
        : update.section === 'plan'
            ? 'runtimePlan'
            : update.section === 'reasoning'
                ? 'runtimeReasoning'
                : update.section === 'terminal'
                    ? 'runtimeTerminalOutput'
                    : '';
    if (!stateKey) {
        return false;
    }

    if (update.mode === 'append') {
        const separator = codexState[stateKey] && !codexState[stateKey].endsWith('\n') ? '\n' : '';
        codexState[stateKey] = trimRuntimePanelText(`${codexState[stateKey]}${separator}${text}`, 12000);
    } else {
        codexState[stateKey] = trimRuntimePanelText(text, 12000);
    }
    renderCodexRuntimePanel();
    return true;
}

function applyCodexRuntimeSnapshotItem(item) {
    const runtimeApi = getCodexRuntimeViewApi();
    if (!runtimeApi || typeof runtimeApi.buildRuntimeUpdateFromThreadItem !== 'function') {
        return false;
    }

    const update = runtimeApi.buildRuntimeUpdateFromThreadItem(item);
    if (!update || !update.section || !update.text) {
        return false;
    }

    const text = String(update.text);
    if (update.section === 'warning') {
        codexState.runtimeWarning = text;
        renderCodexRuntimePanel();
        return true;
    }

    const stateKey = update.section === 'diff'
        ? 'runtimeDiff'
        : update.section === 'plan'
            ? 'runtimePlan'
            : update.section === 'reasoning'
                ? 'runtimeReasoning'
                : update.section === 'terminal'
                    ? 'runtimeTerminalOutput'
                    : '';
    if (!stateKey) {
        return false;
    }

    if (update.mode === 'append') {
        const separator = codexState[stateKey] && !codexState[stateKey].endsWith('\n') ? '\n' : '';
        codexState[stateKey] = trimRuntimePanelText(`${codexState[stateKey]}${separator}${text}`, 12000);
    } else {
        codexState[stateKey] = trimRuntimePanelText(text, 12000);
    }
    renderCodexRuntimePanel();
    return true;
}

function maybeLoadCodexModels() {
    if (!canLoadCodexModels()) {
        return Promise.resolve([]);
    }
    if (codexState.modelCatalog.length > 0) {
        return Promise.resolve(codexState.modelOptions);
    }
    if (codexState.modelListPromise) {
        return codexState.modelListPromise;
    }
    if (codexState.modelListRequested || codexState.settingsLoadingModels) {
        return Promise.resolve(codexState.modelOptions);
    }
    return refreshCodexModelList({ silent: true });
}

function refreshCodexModelList(options) {
    const opts = options || {};
    if (!canLoadCodexModels()) {
        return Promise.resolve([]);
    }

    codexState.modelListRequested = true;
    codexState.settingsLoadingModels = true;
    if (opts.silent !== true) {
        setCodexSettingsStatus(t('codex.model.refreshing'), '');
    }

    codexState.modelListPromise = sendCodexBridgeRequest('model/list', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            codexState.modelCatalog = normalizeCodexModelCatalog(result);
            codexState.modelOptions = normalizeCodexModelOptions(result);
            if (opts.silent !== true) {
                setCodexSettingsStatus(t('codex.model.refreshed'), 'success');
            }
            renderCodexQuickControls();
            return codexState.modelOptions;
        })
        .catch((error) => {
            codexState.modelListRequested = false;
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : t('codex.model.refreshFailed');
                setCodexSettingsStatus(message, 'error');
                appendCodexLogEntry('error', message, { meta: 'models' });
            }
            return [];
        })
        .finally(() => {
            codexState.settingsLoadingModels = false;
            codexState.modelListPromise = null;
            renderCodexQuickControls();
        });
    return codexState.modelListPromise;
}

function openCodexModelPicker() {
    if (!codexQuickModel) {
        return Promise.resolve([]);
    }
    console.info('[JS][model/list] opening quick model picker', {
        catalogCount: codexState.modelCatalog.length,
        loading: codexState.settingsLoadingModels,
        requested: codexState.modelListRequested
    });
    const request = codexState.modelCatalog.length > 0
        ? (codexState.modelListPromise || Promise.resolve(codexState.modelOptions))
        : maybeLoadCodexModels();
    return Promise.resolve(request).finally(() => {
        openSelectPicker(codexQuickModel);
    });
}

function refreshCodexRateLimits(options) {
    const opts = options || {};
    if (codexState.capabilities.rateLimitsRead !== true) {
        return Promise.resolve(null);
    }

    codexState.settingsRefreshingRateLimits = true;
    if (opts.silent !== true) {
        setCodexSettingsStatus(t('codex.model.refreshingQuota'), '');
    }

    return sendCodexBridgeRequest('account/rateLimits/read', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            console.info('[JS][rateLimits] Response:', JSON.stringify(result, null, 2));
            applyCodexRateLimit(result);
            if (opts.silent !== true) {
                const summary = codexState.rateLimitSummary;
                if (summary) {
                    setCodexSettingsStatus(t('codex.model.quotaSummary', { summary }), codexState.rateLimitTone || 'success');
                } else {
                    const keys = result ? Object.keys(result).join(', ') : 'null';
                    setCodexSettingsStatus(t('codex.model.quotaUnrecognized', { keys }), 'warn');
                }
            }
            return result;
        })
        .catch((error) => {
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : t('codex.model.quotaFailed');
                setCodexSettingsStatus(message, 'error');
                appendCodexLogEntry('error', message, { meta: 'limits' });
            }
            return null;
        })
        .finally(() => {
            codexState.settingsRefreshingRateLimits = false;
        });
}

function maybeAutoRefreshCodexRateLimits() {
    if (codexState.rateLimitBootstrapRequested) {
        return;
    }
    if (getActiveSessionMode() !== 'codex') {
        return;
    }
    if (!codexState.initialSessionInfoReceived || !codexState.initialCapabilitiesReceived || !codexState.initialCodexStateReceived) {
        return;
    }
    if (codexState.capabilities.rateLimitsRead !== true) {
        return;
    }
    if (codexState.rateLimitSummary || codexState.settingsRefreshingRateLimits) {
        return;
    }

    codexState.rateLimitBootstrapRequested = true;
    refreshCodexRateLimits({ silent: true }).finally(() => {
        codexState.rateLimitBootstrapRequested = false;
    });
}

function clearCodexErrorNotice() {
    if (!codexState.errorNotice) return;
    codexState.errorNotice = '';
    renderCodexAuxStatus();
}

function setCodexErrorNotice(text) {
    codexState.errorNotice = typeof text === 'string' ? text.trim() : '';
    renderCodexAuxStatus();
}

function getCodexLogContainer() {
    return codexLogStack || codexLog;
}

function appendCodexLogEntry(role, text, options) {
    if (!codexLog) return null;
    const logContainer = getCodexLogContainer();
    if (!logContainer) return null;
    const opts = options || {};
    const itemId = opts.itemId || '';
    const safeRole = role || 'system';

    const entry = document.createElement('div');
    entry.className = `codex-entry ${safeRole}`;
    if (itemId) {
        entry.dataset.itemId = itemId;
    }

    if (opts.meta) {
        const metaNode = document.createElement('span');
        metaNode.className = 'meta';
        metaNode.textContent = opts.meta;
        entry.appendChild(metaNode);
    }

    const contentNode = document.createElement('div');
    contentNode.className = 'content';
    contentNode.textContent = text || '';
    entry.appendChild(contentNode);

    logContainer.appendChild(entry);
    codexLog.scrollTop = codexLog.scrollHeight;

    if (itemId) {
        codexState.messageByItemId.set(itemId, entry);
    }

    return entry;
}

function setCodexLogEntryText(role, itemId, text, options) {
    if (!itemId) {
        return appendCodexLogEntry(role, text, options);
    }
    let entry = getCodexEntryByItemId(itemId);
    if (!entry) {
        return appendCodexLogEntry(role, text, { ...(options || {}), itemId });
    }
    const metaNode = entry.querySelector('.meta');
    if (metaNode && options && options.meta) {
        metaNode.textContent = options.meta;
    }
    const contentNode = entry.querySelector('.content');
    if (contentNode) {
        contentNode.textContent = text || '';
    }
    codexLog.scrollTop = codexLog.scrollHeight;
    return entry;
}

function getCodexEntryByItemId(itemId) {
    if (!itemId) return null;
    const cached = codexState.messageByItemId.get(itemId);
    if (cached && cached.isConnected) {
        return cached;
    }
    return null;
}

function upsertStreamingAssistantMessage(itemId, delta, meta) {
    if (!itemId) return;
    let entry = getCodexEntryByItemId(itemId);
    if (!entry) {
        entry = appendCodexLogEntry('assistant', '', { itemId, meta: meta || 'assistant' });
    }
    const contentNode = entry.querySelector('.content');
    if (!contentNode) return;
    contentNode.textContent = `${contentNode.textContent}${delta || ''}`;
    codexLog.scrollTop = codexLog.scrollHeight;
}

function setCodexPanelCollapsed(collapsed) {
    codexState.panelCollapsed = !!collapsed;
    if (!codexPanel) return;
    codexPanel.classList.toggle('collapsed', codexState.panelCollapsed);
    if (btnCodexToggle) {
        btnCodexToggle.textContent = codexState.panelCollapsed ? t('codex.panel.show') : t('codex.panel.hide');
    }
}

function sendCodexEnvelope(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        appendCodexLogEntry('error', t('codex.error.wsNotConnected'), { meta: 'bridge' });
        setCodexErrorNotice(t('codex.error.bridgeDisconnected'));
        setCodexStatus('error', 'bridge disconnected');
        return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
}

function resetCodexBootstrapState() {
    clearPendingCodexFreshThreadTimeout();
    if (!codexState.lastCodexThreadId && codexState.threadId) {
        codexState.lastCodexThreadId = codexState.threadId;
    }
    codexState.threadId = '';
    codexState.currentTurnId = '';
    codexState.lastSnapshotThreadId = '';
    codexState.unmaterializedThreadId = '';
    codexState.approvalPending = false;
    codexState.pendingServerRequestCount = 0;
    codexState.pendingServerRequests = [];
    codexState.activeCommandApprovalRequestId = '';
    codexState.streamingItemId = '';
    codexState.tokenUsageSummary = '';
    codexState.contextUsage = null;
    codexState.contextUsageUpdatedAt = 0;
    codexState.historyListLoading = false;
    codexState.historyActionThreadId = '';
    codexState.historyActionKind = '';
    codexState.historyRenameThreadId = '';
    codexState.historyRenameDraft = '';
    codexState.currentThreadTitle = '';
    codexState.threadTitleById.clear();
    codexState.storedCodexConfig = null;
    codexState.modelCatalog = [];
    codexState.modelOptions = [];
    codexState.modelListRequested = false;
    codexState.modelListPromise = null;
    codexState.skillCatalog = [];
    codexState.skillListRequested = false;
    codexState.skillListPromise = null;
    codexState.skillsLoading = false;
    codexState.toolsPanelFocus = 'skills';
    codexState.compactSubmitting = false;
    codexState.compactStatusText = '';
    codexState.compactStatusTone = '';
    codexState.slashRegistry = [];
    codexState.slashMenuOpen = false;
    codexState.slashMenuQuery = '';
    codexState.settingsLoadingModels = false;
    codexState.settingsRefreshingRateLimits = false;
    codexState.rateLimitBootstrapRequested = false;
    codexState.nextTurnOverrides = { model: null, reasoningEffort: null, sandbox: null };
    codexState.interactionState = { planMode: false, activeSkill: null };
    codexState.planWorkflow = buildEmptyPlanWorkflowState();
    codexState.serverNextTurnConfigBase = null;
    codexState.nextTurnEffectiveCodexConfig = null;
    codexState.pendingSubmittedTurnState = null;
    codexState.pendingImageInputs = [];
    codexState.runtimeDiff = '';
    codexState.runtimePlan = '';
    codexState.runtimeReasoning = '';
    codexState.runtimeTerminalOutput = '';
    codexState.runtimeWarning = '';
    codexState.configWarningText = '';
    codexState.deprecationNoticeText = '';
    codexState.secondaryPanel = 'none';
    codexState.initialSessionInfoReceived = false;
    codexState.initialCapabilitiesReceived = false;
    codexState.initialCodexStateReceived = false;
    codexState.bootstrapCompleted = false;
    codexState.historyListRequested = false;
    codexState.resumeAttemptedForThreadId = '';
    codexState.fallbackThreadRequested = false;
    codexState.pendingFreshThread = false;
    codexState.pendingFreshThreadUiSnapshot = null;
    codexState.pendingFreshThreadTimeoutId = 0;
    codexState.messageByItemId.clear();
    clearCodexRequestCards();
    codexState.capabilities = {
        historyList: false,
        historyResume: false,
        modelConfig: false,
        rateLimitsRead: false,
        approvals: false,
        userInputRequest: false,
        diffPlanReasoning: false,
        slashCommands: false,
        slashModel: false,
        slashPlan: false,
        skillsList: false,
        compact: false,
        imageInput: false,
        fileMentions: false
    };
    codexState.historyThreads = [];
    refreshCodexSlashRegistry();
    renderCodexHeaderSummary();
    renderCodexSecondaryNav();
    renderCodexHistoryList();
    renderCodexQuickControls();
    renderCodexComposerState();
    renderCodexPlanWorkflow();
    renderCodexImageInputs();
    renderCodexSlashMenu();
    renderCodexAlerts();
    renderCodexRuntimePanel();
    renderCodexToolsPanel();
    renderCodexCommandApprovalModal();
    renderCodexContextUsage();
}

function rejectPendingCodexBridgeRequests(message, code) {
    const error = new Error(message || 'Codex bridge request failed.');
    error.code = code || 'CODEX_BRIDGE_REQUEST_ABORTED';
    codexState.pendingBridgeRequests.forEach((handlers) => {
        if (handlers && typeof handlers.reject === 'function') {
            handlers.reject(error);
        }
    });
    codexState.pendingBridgeRequests.clear();
}

function normalizeCodexCapabilities(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        historyList: source.historyList === true,
        historyResume: source.historyResume === true,
        modelConfig: source.modelConfig === true,
        rateLimitsRead: source.rateLimitsRead === true,
        approvals: source.approvals === true,
        userInputRequest: source.userInputRequest === true,
        diffPlanReasoning: source.diffPlanReasoning === true,
        slashCommands: source.slashCommands === true,
        slashModel: source.slashModel === true,
        slashPlan: source.slashPlan === true,
        skillsList: source.skillsList === true,
        compact: source.compact === true,
        imageInput: source.imageInput === true,
        fileMentions: source.fileMentions === true
    };
}

function normalizeCodexInteractionState(payload) {
    const slashApi = getCodexSlashCommandsApi();
    if (slashApi && typeof slashApi.normalizeInteractionState === 'function') {
        return slashApi.normalizeInteractionState(payload);
    }
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        planMode: source.planMode === true,
        activeSkill: typeof source.activeSkill === 'string' && source.activeSkill.trim()
            ? source.activeSkill.trim()
            : null
    };
}

function normalizeNextTurnOverrides(payload) {
    const slashApi = getCodexSlashCommandsApi();
    if (slashApi && typeof slashApi.normalizeNextTurnOverrides === 'function') {
        return slashApi.normalizeNextTurnOverrides(payload);
    }
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        model: typeof source.model === 'string' && source.model.trim() ? source.model.trim() : null,
        reasoningEffort: typeof source.reasoningEffort === 'string' && source.reasoningEffort.trim()
            ? source.reasoningEffort.trim().toLowerCase()
            : null,
        sandbox: typeof source.sandbox === 'string' && source.sandbox.trim() ? source.sandbox.trim() : null
    };
}

function derivePermissionConfigFromSandboxOverride(sandboxOverride) {
    const normalized = typeof sandboxOverride === 'string' && sandboxOverride.trim()
        ? sandboxOverride.trim()
        : null;
    if (normalized === 'danger-full-access') {
        return {
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        };
    }
    if (normalized === 'workspace-write') {
        return {
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        };
    }
    if (normalized === 'read-only') {
        return {
            approvalPolicy: 'on-request',
            sandboxMode: 'read-only'
        };
    }
    return null;
}

function resolveCodexTurnSandboxOverride(nextTurnOverrides) {
    const normalizedOverrides = normalizeNextTurnOverrides(nextTurnOverrides);
    if (normalizedOverrides.sandbox) {
        return normalizedOverrides.sandbox;
    }
    if (codexQuickSandbox) {
        const selected = typeof codexQuickSandbox.value === 'string' ? codexQuickSandbox.value.trim() : '';
        return selected || 'workspace-write';
    }
    return null;
}

function normalizeEffectiveCodexConfig(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        model: typeof source.model === 'string' && source.model.trim() ? source.model.trim() : null,
        reasoningEffort: typeof source.reasoningEffort === 'string' && source.reasoningEffort.trim()
            ? source.reasoningEffort.trim().toLowerCase()
            : null,
        personality: typeof source.personality === 'string' && source.personality.trim()
            ? source.personality.trim()
            : null,
        approvalPolicy: typeof source.approvalPolicy === 'string' && source.approvalPolicy.trim()
            ? source.approvalPolicy.trim()
            : null,
        sandboxMode: typeof source.sandboxMode === 'string' && source.sandboxMode.trim()
            ? source.sandboxMode.trim()
            : null
    };
}

function buildLocalNextTurnEffectiveCodexConfig() {
    const baseConfig = codexState.serverNextTurnConfigBase
        ? normalizeEffectiveCodexConfig(codexState.serverNextTurnConfigBase)
        : null;
    const permissionOverride = derivePermissionConfigFromSandboxOverride(resolveCodexTurnSandboxOverride(codexState.nextTurnOverrides));
    if (baseConfig) {
        return {
            model: codexState.nextTurnOverrides.model || baseConfig.model || null,
            reasoningEffort: codexState.nextTurnOverrides.reasoningEffort || baseConfig.reasoningEffort || null,
            personality: baseConfig.personality || null,
            approvalPolicy: permissionOverride ? permissionOverride.approvalPolicy : (baseConfig.approvalPolicy || null),
            sandboxMode: permissionOverride ? permissionOverride.sandboxMode : (baseConfig.sandboxMode || null)
        };
    }
    const slashApi = getCodexSlashCommandsApi();
    if (slashApi && typeof slashApi.buildNextTurnEffectiveCodexConfig === 'function') {
        return slashApi.buildNextTurnEffectiveCodexConfig({
            storedCodexConfig: getStoredCodexConfig(),
            nextTurnOverrides: codexState.nextTurnOverrides
        });
    }
    const stored = getStoredCodexConfig();
    return {
        model: codexState.nextTurnOverrides.model || (stored ? stored.defaultModel : null),
        reasoningEffort: codexState.nextTurnOverrides.reasoningEffort || (stored ? stored.defaultReasoningEffort : null),
        personality: stored ? stored.defaultPersonality : null,
        approvalPolicy: permissionOverride ? permissionOverride.approvalPolicy : (stored ? stored.approvalPolicy : null),
        sandboxMode: permissionOverride ? permissionOverride.sandboxMode : (stored ? stored.sandboxMode : null)
    };
}

function normalizeCodexCollaborationMode(payload) {
    const source = payload && typeof payload === 'object' ? payload : null;
    if (!source || typeof source.mode !== 'string' || !source.mode.trim()) {
        return null;
    }
    const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
    return {
        mode: source.mode.trim(),
        settings: {
            model: typeof settings.model === 'string' ? settings.model.trim() : '',
            reasoning_effort: typeof settings.reasoning_effort === 'string' && settings.reasoning_effort.trim()
                ? settings.reasoning_effort.trim().toLowerCase()
                : null,
            developer_instructions: typeof settings.developer_instructions === 'string' && settings.developer_instructions.trim()
                ? settings.developer_instructions
                : null
        }
    };
}

function buildPlanCollaborationMode(config) {
    const effectiveConfig = normalizeEffectiveCodexConfig(config || buildLocalNextTurnEffectiveCodexConfig());
    return normalizeCodexCollaborationMode({
        mode: 'plan',
        settings: {
            model: effectiveConfig.model || '',
            reasoning_effort: effectiveConfig.reasoningEffort || null,
            developer_instructions: null
        }
    });
}

function refreshCodexSlashRegistry() {
    const slashApi = getCodexSlashCommandsApi();
    codexState.slashRegistry = slashApi && typeof slashApi.createSlashRegistry === 'function'
        ? slashApi.createSlashRegistry()
        : [];
}

function isExecutableCodexSlashCommand(entry) {
    if (!entry || entry.availability !== 'enabled') {
        return false;
    }
    if (entry.capabilityKey && codexState.capabilities[entry.capabilityKey] !== true) {
        return false;
    }
    return true;
}

function resolveExecutableCodexSlashCommand(command) {
    const slashApi = getCodexSlashCommandsApi();
    const registryEntry = slashApi && typeof slashApi.resolveSlashCommand === 'function'
        ? slashApi.resolveSlashCommand({ registry: codexState.slashRegistry, command })
        : null;
    if (!isExecutableCodexSlashCommand(registryEntry)) {
        return null;
    }
    return registryEntry;
}

function getEnabledCodexSlashCommands() {
    const slashApi = getCodexSlashCommandsApi();
    if (!slashApi || typeof slashApi.getDiscoverableSlashCommands !== 'function') {
        return ['/model', '/plan'];
    }
    const commands = slashApi.getDiscoverableSlashCommands({
        registry: codexState.slashRegistry,
        capabilities: codexState.capabilities,
        query: '/'
    }).map((entry) => entry.command);
    return commands.length > 0 ? commands : ['/model', '/plan'];
}

function buildUnsupportedSlashCommandMessage() {
    return t('codex.error.unrecognizedCommand', { commands: getEnabledCodexSlashCommands().join(t('codex.slash.separator')) });
}

function clearPendingCodexFreshThreadTimeout() {
    if (codexState.pendingFreshThreadTimeoutId) {
        clearTimeout(codexState.pendingFreshThreadTimeoutId);
        codexState.pendingFreshThreadTimeoutId = 0;
    }
}

function captureCodexLogNodes() {
    const logContainer = getCodexLogContainer();
    if (!logContainer) {
        return [];
    }
    const nodes = [];
    while (logContainer.firstChild) {
        nodes.push(logContainer.firstChild);
        logContainer.removeChild(logContainer.firstChild);
    }
    return nodes;
}

function restoreCodexLogNodes(nodes) {
    const logContainer = getCodexLogContainer();
    if (!logContainer) {
        return;
    }
    logContainer.innerHTML = '';
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
        if (node) {
            logContainer.appendChild(node);
        }
    });
    codexLog.scrollTop = codexLog.scrollHeight;
}

function beginFreshCodexThreadUiReset() {
    clearPendingCodexFreshThreadTimeout();
    codexState.pendingFreshThreadUiSnapshot = {
        threadId: codexState.threadId,
        currentThreadTitle: codexState.currentThreadTitle,
        currentTurnId: codexState.currentTurnId,
        lastSnapshotThreadId: codexState.lastSnapshotThreadId,
        unmaterializedThreadId: codexState.unmaterializedThreadId,
        status: codexState.status,
        statusDetail: codexState.statusDetail,
        approvalPending: codexState.approvalPending,
        pendingServerRequestCount: codexState.pendingServerRequestCount,
        pendingServerRequests: Array.isArray(codexState.pendingServerRequests)
            ? codexState.pendingServerRequests.slice()
            : [],
        tokenUsageSummary: codexState.tokenUsageSummary,
        contextUsage: codexState.contextUsage ? { ...codexState.contextUsage } : null,
        contextUsageUpdatedAt: codexState.contextUsageUpdatedAt,
        errorNotice: codexState.errorNotice,
        planWorkflow: { ...codexState.planWorkflow },
        runtimeDiff: codexState.runtimeDiff,
        runtimePlan: codexState.runtimePlan,
        runtimeReasoning: codexState.runtimeReasoning,
        runtimeTerminalOutput: codexState.runtimeTerminalOutput,
        runtimeWarning: codexState.runtimeWarning,
        runtimeWarningTone: codexState.runtimeWarningTone,
        configWarningText: codexState.configWarningText,
        deprecationNoticeText: codexState.deprecationNoticeText,
        secondaryPanel: codexState.secondaryPanel,
        messageByItemId: new Map(codexState.messageByItemId),
        requestStateById: new Map(codexState.requestStateById),
        logNodes: captureCodexLogNodes()
    };
    if (codexState.threadId) {
        codexState.lastCodexThreadId = codexState.threadId;
    }
    codexState.threadId = '';
    codexState.currentThreadTitle = '';
    codexState.currentTurnId = '';
    codexState.lastSnapshotThreadId = '';
    codexState.unmaterializedThreadId = '';
    codexState.approvalPending = false;
    codexState.pendingServerRequestCount = 0;
    codexState.pendingServerRequests = [];
    codexState.activeCommandApprovalRequestId = '';
    codexState.tokenUsageSummary = '';
    codexState.contextUsage = null;
    codexState.contextUsageUpdatedAt = 0;
    codexState.pendingFreshThread = true;
    codexState.messageByItemId = new Map();
    codexState.requestStateById = new Map();
    setPlanWorkflowState(buildEmptyPlanWorkflowState());
    clearCodexRuntimePanels();
    clearCodexAlerts();
    clearCodexErrorNotice();
    setCodexSecondaryPanel('none');
    setCodexStatus('idle', 'creating fresh task');
    renderCodexCommandApprovalModal();
    renderCodexContextUsage();
}

function finalizeFreshCodexThreadUiReset() {
    clearPendingCodexFreshThreadTimeout();
    codexState.pendingFreshThreadUiSnapshot = null;
}

function rollbackFreshCodexThreadUiReset(message) {
    const snapshot = codexState.pendingFreshThreadUiSnapshot;
    clearPendingCodexFreshThreadTimeout();
    if (!snapshot) {
        if (message) {
            appendCodexLogEntry('error', message, { meta: 'bridge' });
            setCodexErrorNotice(message);
            setCodexStatus('error', 'event error');
        }
        return;
    }

    codexState.threadId = snapshot.threadId || '';
    codexState.currentThreadTitle = snapshot.currentThreadTitle || '';
    codexState.currentTurnId = snapshot.currentTurnId || '';
    codexState.lastSnapshotThreadId = snapshot.lastSnapshotThreadId || '';
    codexState.unmaterializedThreadId = snapshot.unmaterializedThreadId || '';
    codexState.approvalPending = snapshot.approvalPending === true;
    codexState.pendingServerRequestCount = Number.isFinite(snapshot.pendingServerRequestCount)
        ? snapshot.pendingServerRequestCount
        : 0;
    codexState.pendingServerRequests = Array.isArray(snapshot.pendingServerRequests)
        ? snapshot.pendingServerRequests.slice()
        : [];
    codexState.tokenUsageSummary = snapshot.tokenUsageSummary || '';
    codexState.contextUsage = snapshot.contextUsage && typeof snapshot.contextUsage === 'object'
        ? { ...snapshot.contextUsage }
        : null;
    codexState.contextUsageUpdatedAt = Number.isFinite(snapshot.contextUsageUpdatedAt)
        ? snapshot.contextUsageUpdatedAt
        : 0;
    codexState.planWorkflow = snapshot.planWorkflow || buildEmptyPlanWorkflowState();
    codexState.runtimeDiff = snapshot.runtimeDiff || '';
    codexState.runtimePlan = snapshot.runtimePlan || '';
    codexState.runtimeReasoning = snapshot.runtimeReasoning || '';
    codexState.runtimeTerminalOutput = snapshot.runtimeTerminalOutput || '';
    codexState.runtimeWarning = snapshot.runtimeWarning || '';
    codexState.runtimeWarningTone = snapshot.runtimeWarningTone || '';
    codexState.configWarningText = snapshot.configWarningText || '';
    codexState.deprecationNoticeText = snapshot.deprecationNoticeText || '';
    codexState.pendingFreshThread = false;
    codexState.messageByItemId = snapshot.messageByItemId instanceof Map
        ? new Map(snapshot.messageByItemId)
        : new Map();
    codexState.requestStateById = snapshot.requestStateById instanceof Map
        ? new Map(snapshot.requestStateById)
        : new Map();
    codexState.pendingFreshThreadUiSnapshot = null;
    restoreCodexLogNodes(snapshot.logNodes);
    setCodexSecondaryPanel(snapshot.secondaryPanel || 'none');
    codexState.errorNotice = snapshot.errorNotice || '';
    setCodexStatus(snapshot.status || 'idle', snapshot.statusDetail || '');
    renderCodexPlanWorkflow();
    renderCodexRuntimePanel();
    renderCodexAlerts();
    renderCodexContextUsage();
    if (message) {
        appendCodexLogEntry('error', message, { meta: 'bridge' });
        setCodexErrorNotice(message);
    }
}

function sendCodexBridgeRequest(method, params, options) {
    const opts = options || {};
    const normalizedMethod = typeof method === 'string' ? method.trim() : '';
    if (!normalizedMethod) {
        return Promise.reject(new Error('Codex bridge request requires a method.'));
    }
    const normalizedParams = params && typeof params === 'object' ? params : {};
    const requestId = `bridge-${Date.now()}-${codexState.nextBridgeRequestId++}`;
    return new Promise((resolve, reject) => {
        codexState.pendingBridgeRequests.set(requestId, {
            resolve,
            reject,
            method: normalizedMethod,
            suppressErrorUi: opts.suppressErrorUi === true
        });
        const sent = sendCodexEnvelope({
            type: 'codex_request',
            requestId,
            method: normalizedMethod,
            params: normalizedParams
        });
        if (!sent) {
            codexState.pendingBridgeRequests.delete(requestId);
            const error = new Error('Codex bridge websocket is not connected.');
            error.code = 'CODEX_BRIDGE_NOT_CONNECTED';
            reject(error);
        }
    });
}

function storeCodexThreadList(result) {
    const threads = resolveCodexThreadListEntries(result);
    codexState.historyThreads = threads
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry, index) => buildCodexHistoryThreadEntry(entry, index))
        .sort((left, right) => {
            if (left.__sortLastActiveAt !== right.__sortLastActiveAt) {
                return right.__sortLastActiveAt - left.__sortLastActiveAt;
            }
            if (left.__sortCreatedAt !== right.__sortCreatedAt) {
                return right.__sortCreatedAt - left.__sortCreatedAt;
            }
            return left.__originalIndex - right.__originalIndex;
        })
        .filter((entry) => entry.id);
    const currentEntry = codexState.historyThreads.find((entry) => entry.id === codexState.threadId);
    if (currentEntry) {
        codexState.currentThreadTitle = normalizeCodexThreadTitle(currentEntry.title);
    } else if (!codexState.threadId) {
        codexState.currentThreadTitle = '';
    } else {
        codexState.currentThreadTitle = getKnownCodexThreadTitle(codexState.threadId);
    }
    renderCodexHistoryList();
    renderCodexHeaderSummary();
    return codexState.historyThreads;
}

function refreshCodexThreadList(options) {
    const opts = options || {};
    if (getActiveSessionMode() !== 'codex' || codexState.capabilities.historyList !== true) {
        return Promise.resolve([]);
    }
    if (!opts.force && codexState.historyListRequested) {
        return Promise.resolve(codexState.historyThreads);
    }
    codexState.historyListRequested = true;
    codexState.historyListLoading = true;
    renderCodexHistoryList();
    return sendCodexBridgeRequest('thread/list', { limit: 50 }, { suppressErrorUi: opts.silent === true })
        .then((result) => storeCodexThreadList(result))
        .catch((error) => {
            codexState.historyListRequested = false;
            if (opts.silent !== true) {
                appendCodexLogEntry('error', error.message || t('codex.thread.loadHistoryFailed'), { meta: 'history' });
            }
            return [];
        })
        .finally(() => {
            codexState.historyListLoading = false;
            renderCodexHistoryList();
        });
}

function requestCodexResume(threadId) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return Promise.reject(new Error('Missing Codex thread id to resume.'));
    }
    codexState.historyActionThreadId = normalizedThreadId;
    codexState.historyActionKind = 'open';
    renderCodexHistoryList();
    codexState.resumeAttemptedForThreadId = normalizedThreadId;
    appendCodexLogEntry('system', t('codex.thread.restoring', { id: normalizedThreadId }), { meta: 'history' });
    setCodexStatus('running', 'restoring thread');
    return sendCodexBridgeRequest(
        'thread/resume',
        { threadId: normalizedThreadId },
        { suppressErrorUi: true }
    )
        .then((result) => {
            const resumedThreadId = result && result.thread && typeof result.thread.id === 'string'
                ? result.thread.id.trim()
                : normalizedThreadId;
            codexState.lastCodexThreadId = resumedThreadId;
            codexState.pendingFreshThread = false;
            codexState.unmaterializedThreadId = '';
            clearCodexErrorNotice();
            appendCodexLogEntry('system', t('codex.thread.restored', { id: resumedThreadId }), { meta: 'history' });
            setCodexSecondaryPanel('none');
            return refreshCodexThreadList({ force: true, silent: true }).then(() => result);
        })
        .finally(() => {
            codexState.historyActionThreadId = '';
            codexState.historyActionKind = '';
            renderCodexHistoryList();
        });
}

function requestCodexThreadMutation(actionKind, threadId) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    const normalizedAction = typeof actionKind === 'string' ? actionKind.trim() : '';
    const actionMap = {
        fork: {
            method: 'thread/fork',
            startText: t('codex.thread.forking', { id: normalizedThreadId }),
            successText: (result) => {
                const forkedThreadId = result && result.thread && typeof result.thread.id === 'string'
                    ? result.thread.id.trim()
                    : '';
                return forkedThreadId
                    ? t('codex.thread.forkSuccessWithId', { id: normalizedThreadId, newId: forkedThreadId })
                    : t('codex.thread.forkSuccessNoId', { id: normalizedThreadId });
            }
        },
        archive: {
            method: 'thread/archive',
            startText: t('codex.thread.archiving', { id: normalizedThreadId }),
            successText: () => t('codex.thread.archived', { id: normalizedThreadId })
        },
        unarchive: {
            method: 'thread/unarchive',
            startText: t('codex.thread.unarchiving', { id: normalizedThreadId }),
            successText: () => t('codex.thread.unarchived', { id: normalizedThreadId })
        }
    };
    const definition = actionMap[normalizedAction];
    if (!normalizedThreadId || !definition) {
        return Promise.reject(new Error('Invalid Codex thread action request.'));
    }

    codexState.historyActionThreadId = normalizedThreadId;
    codexState.historyActionKind = normalizedAction;
    renderCodexHistoryList();
    appendCodexLogEntry('system', definition.startText, { meta: 'history' });

    return sendCodexBridgeRequest(
        definition.method,
        { threadId: normalizedThreadId },
        { suppressErrorUi: true }
    )
        .then((result) => {
            clearCodexErrorNotice();
            appendCodexLogEntry('system', definition.successText(result), { meta: 'history' });
            return refreshCodexThreadList({ force: true, silent: true }).then(() => result);
        })
        .catch((error) => {
            if (!isTransientCodexBridgeError(error)) {
                appendCodexLogEntry(
                    'error',
                    t('codex.thread.operationFailed', { error: error.message || t('codex.error.unknownError') }),
                    { meta: 'history' }
                );
            }
            throw error;
        })
        .finally(() => {
            codexState.historyActionThreadId = '';
            codexState.historyActionKind = '';
            renderCodexHistoryList();
        });
}

function requestCodexThreadRename(threadId, nextName) {
    const normalizedThreadId = typeof threadId === 'string' ? threadId.trim() : '';
    if (!normalizedThreadId) {
        return Promise.reject(new Error('Missing Codex thread id to rename.'));
    }
    const normalizedNextName = typeof nextName === 'string' ? nextName.trim() : '';
    if (!normalizedNextName) {
        return Promise.resolve(null);
    }

    codexState.historyActionThreadId = normalizedThreadId;
    codexState.historyActionKind = 'rename';
    renderCodexHistoryList();
    appendCodexLogEntry('system', t('codex.thread.renaming', { id: normalizedThreadId, name: normalizedNextName }), { meta: 'history' });

    return sendCodexBridgeRequest(
        'thread/name/set',
        {
            threadId: normalizedThreadId,
            name: normalizedNextName,
            title: normalizedNextName
        },
        { suppressErrorUi: true }
    )
        .then((result) => {
            updateCodexHistoryThreadTitle(normalizedThreadId, normalizedNextName);
            clearCodexErrorNotice();
            appendCodexLogEntry('system', t('codex.thread.renamed', { id: normalizedThreadId, name: normalizedNextName }), { meta: 'history' });
            renderCodexHistoryList();
            renderCodexHeaderSummary();
            return sendCodexBridgeRequest(
                'thread/read',
                { threadId: normalizedThreadId, includeTurns: false },
                { suppressErrorUi: true }
            )
                .then((readResult) => {
                    const readThread = readResult && readResult.thread && typeof readResult.thread === 'object'
                        ? readResult.thread
                        : null;
                    const resolvedTitle = resolveCodexThreadTitle(readThread) || normalizedNextName;
                    updateCodexHistoryThreadTitle(normalizedThreadId, resolvedTitle);
                })
                .catch(() => {
                    updateCodexHistoryThreadTitle(normalizedThreadId, normalizedNextName);
                })
                .then(() => refreshCodexThreadList({ force: true, silent: true }))
                .then(() => result);
        })
        .catch((error) => {
            if (!isTransientCodexBridgeError(error)) {
                appendCodexLogEntry(
                    'error',
                    t('codex.thread.renameFailed', { error: error.message || t('codex.error.unknownError') }),
                    { meta: 'history' }
                );
            }
            throw error;
        })
        .finally(() => {
            codexState.historyActionThreadId = '';
            codexState.historyActionKind = '';
            renderCodexHistoryList();
        });
}

function submitCodexThreadRename(threadId, currentTitle) {
    const normalizedCurrentTitle = typeof currentTitle === 'string' ? currentTitle.trim() : '';
    const draft = typeof codexState.historyRenameDraft === 'string' ? codexState.historyRenameDraft.trim() : '';
    if (!draft) {
        return Promise.resolve(null);
    }
    if (draft === normalizedCurrentTitle) {
        cancelCodexThreadRename();
        return Promise.resolve(null);
    }
    return requestCodexThreadRename(threadId, draft)
        .then((result) => {
            cancelCodexThreadRename();
            return result;
        })
        .catch((error) => {
            if (!isTransientCodexBridgeError(error)) {
                renderCodexHistoryList();
            }
            throw error;
        });
}

function requestFallbackCodexThread() {
    if (codexState.fallbackThreadRequested) {
        return;
    }
    codexState.fallbackThreadRequested = true;
    appendCodexLogEntry('system', t('codex.thread.noRestorable'), { meta: 'history' });
    requestCodexNewThread({ silent: true });
}

function maybeBootstrapCodexSession() {
    if (codexState.bootstrapCompleted) return;
    if (getActiveSessionMode() !== 'codex') return;
    if (!codexState.initialSessionInfoReceived || !codexState.initialCapabilitiesReceived || !codexState.initialCodexStateReceived) {
        return;
    }

    codexState.bootstrapCompleted = true;
    const bootstrapApi = getCodexBootstrapApi();
    const plan = bootstrapApi && typeof bootstrapApi.planBootstrap === 'function'
        ? bootstrapApi.planBootstrap({
            sessionMode: getActiveSessionMode(),
            threadId: codexState.threadId,
            lastCodexThreadId: codexState.lastCodexThreadId,
            capabilities: codexState.capabilities
        })
        : {
            shouldFetchHistoryList: codexState.capabilities.historyList === true,
            action: codexState.threadId
                ? null
                : (
                    codexState.capabilities.historyResume === true && codexState.lastCodexThreadId
                        ? { type: 'resume', threadId: codexState.lastCodexThreadId }
                        : { type: 'new_thread' }
                )
        };

    if (plan.shouldFetchHistoryList) {
        refreshCodexThreadList({ silent: true });
    }

    if (!plan.action) {
        return;
    }

    if (plan.action.type === 'resume' && plan.action.threadId) {
        requestCodexResume(plan.action.threadId).catch((error) => {
            if (isTransientCodexBridgeError(error)) {
                return;
            }
            appendCodexLogEntry(
                'error',
                `Failed to restore saved Codex thread ${codexState.lastCodexThreadId}: ${error.message || 'unknown error'}`,
                { meta: 'history' }
            );
            codexState.resumeAttemptedForThreadId = '';
            requestFallbackCodexThread();
        });
        return;
    }

    requestFallbackCodexThread();
}

function getConfiguredCodexCwd() {
    if (!runtimeConfig || typeof runtimeConfig !== 'object') {
        return '';
    }
    return typeof runtimeConfig.cwd === 'string' ? runtimeConfig.cwd.trim() : '';
}

function readPathValue(source, path) {
    let current = source;
    for (let i = 0; i < path.length; i += 1) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[path[i]];
    }
    return current;
}

function pickFirstNumber(sources, paths) {
    for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        if (!source || typeof source !== 'object') continue;
        for (let j = 0; j < paths.length; j += 1) {
            const value = readPathValue(source, paths[j]);
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
    }
    return null;
}

function pickFirstString(sources, paths) {
    for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        if (!source || typeof source !== 'object') continue;
        for (let j = 0; j < paths.length; j += 1) {
            const value = readPathValue(source, paths[j]);
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
    }
    return '';
}

function pickFirstObjectValue(sources, paths) {
    for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        if (!source || typeof source !== 'object') continue;
        for (let j = 0; j < paths.length; j += 1) {
            const value = readPathValue(source, paths[j]);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value;
            }
        }
    }
    return null;
}

function pickFirstBoolean(sources, paths) {
    for (let i = 0; i < sources.length; i += 1) {
        const source = sources[i];
        if (!source || typeof source !== 'object') continue;
        for (let j = 0; j < paths.length; j += 1) {
            const value = readPathValue(source, paths[j]);
            if (typeof value === 'boolean') {
                return value;
            }
        }
    }
    return null;
}

function formatCompactNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '';
    }
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
    }
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    }
    return String(Math.round(value));
}

function formatDurationShort(totalSeconds) {
    if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        return '';
    }
    const seconds = Math.round(totalSeconds);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    return `${hours}h`;
}

function formatResetHint(value) {
    const formatAbsoluteResetTime = (timestampMs) => {
        const date = new Date(timestampMs);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        const deltaMs = timestampMs - Date.now();
        if (deltaMs >= 86400000) {
            return date.toLocaleString([], {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value > 0 && value < 1e7) {
            return formatAbsoluteResetTime(Date.now() + (value * 1000));
        }
        if (value >= 1e9 && value < 1e12) {
            return formatAbsoluteResetTime(value * 1000);
        }
        if (value >= 1e12) {
            return formatAbsoluteResetTime(value);
        }
    }
    if (typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        if (/^\d+$/.test(trimmed)) {
            return formatResetHint(Number(trimmed));
        }
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
            return formatAbsoluteResetTime(parsed);
        }
        return trimmed;
    }
    return '';
}

function formatRateLimitWindowLabel(windowMins) {
    if (typeof windowMins !== 'number' || !Number.isFinite(windowMins) || windowMins <= 0) {
        return '';
    }
    if (windowMins === 300) {
        return t('codex.rateLimit.fiveHours');
    }
    if (windowMins === 10080) {
        return t('codex.rateLimit.oneWeek');
    }
    if (windowMins < 60) {
        return t('codex.rateLimit.minutes', { mins: Math.round(windowMins) });
    }
    if (windowMins % 60 === 0) {
        return t('codex.rateLimit.hours', { hours: Math.round(windowMins / 60) });
    }
    return formatDurationShort(windowMins * 60);
}

function formatTokenUsageSummary(payload) {
    const sources = [
        payload,
        payload && payload.tokenUsage,
        payload && payload.tokenUsage && payload.tokenUsage.last,
        payload && payload.tokenUsage && payload.tokenUsage.total,
        payload && payload.usage,
        payload && payload.thread,
        payload && payload.thread && payload.thread.tokenUsage,
        payload && payload.thread && payload.thread.tokenUsage && payload.thread.tokenUsage.last,
        payload && payload.thread && payload.thread.tokenUsage && payload.thread.tokenUsage.total,
        payload && payload.thread && payload.thread.usage
    ];
    const input = pickFirstNumber(sources, [
        ['inputTokens'],
        ['input_tokens'],
        ['input'],
        ['promptTokens'],
        ['prompt_tokens']
    ]);
    const output = pickFirstNumber(sources, [
        ['outputTokens'],
        ['output_tokens'],
        ['output'],
        ['completionTokens'],
        ['completion_tokens']
    ]);
    const total = pickFirstNumber(sources, [
        ['totalTokens'],
        ['total_tokens'],
        ['total']
    ]) || (
        typeof input === 'number' || typeof output === 'number'
            ? (input || 0) + (output || 0)
            : null
    );
    const cached = pickFirstNumber(sources, [
        ['cachedInputTokens'],
        ['cached_input_tokens'],
        ['cacheTokens'],
        ['cache_tokens']
    ]);
    const reasoning = pickFirstNumber(sources, [
        ['reasoningOutputTokens'],
        ['reasoning_output_tokens'],
        ['reasoningTokens'],
        ['reasoning_tokens']
    ]);

    const parts = [];
    if (typeof input === 'number') parts.push(`${formatCompactNumber(input)} in`);
    if (typeof output === 'number') parts.push(`${formatCompactNumber(output)} out`);
    if (typeof total === 'number') parts.push(`${formatCompactNumber(total)} total`);
    if (typeof cached === 'number' && cached > 0) parts.push(`${formatCompactNumber(cached)} cached`);
    if (typeof reasoning === 'number' && reasoning > 0) parts.push(`${formatCompactNumber(reasoning)} reasoning`);
    return parts.length > 0 ? `tokens ${parts.join(' / ')}` : '';
}

function extractRateLimitEntry(payload) {
    // Support both camelCase and snake_case keys from Codex API
    // Also handle wrapped response: { result: { rateLimits: ... } }
    const resultWrapper = payload && payload.result;
    const containers = [
        payload,
        payload && payload.rateLimit,
        payload && payload.rateLimits,
        payload && payload.ratelimits,         // snake_case
        payload && payload.rate_limits,        // snake_case alternative
        payload && payload.account,
        // Also check result wrapper
        resultWrapper,
        resultWrapper && resultWrapper.rateLimit,
        resultWrapper && resultWrapper.rateLimits,
        resultWrapper && resultWrapper.ratelimits,
        resultWrapper && resultWrapper.rate_limits
    ];
    for (let i = 0; i < containers.length; i += 1) {
        const current = containers[i];
        if (Array.isArray(current) && current.length > 0 && current[0] && typeof current[0] === 'object') {
            return { entry: current[0], extraCount: current.length - 1 };
        }
        if (current && Array.isArray(current.limits) && current.limits.length > 0) {
            return { entry: current.limits[0], extraCount: current.limits.length - 1 };
        }
        if (current && Array.isArray(current.items) && current.items.length > 0) {
            return { entry: current.items[0], extraCount: current.items.length - 1 };
        }
    }
    // Also check rateLimitsByLimitId and ratelimitsbylimitid (object with limitId keys)
    const limitIdObj = payload && (payload.rateLimitsByLimitId || payload.ratelimitsbylimitid);
    const resultLimitIdObj = resultWrapper && (resultWrapper.rateLimitsByLimitId || resultWrapper.ratelimitsbylimitid);
    if (limitIdObj && typeof limitIdObj === 'object') {
        const entries = Object.values(limitIdObj);
        if (entries.length > 0) {
            return { entry: entries[0], extraCount: entries.length - 1 };
        }
    }
    if (resultLimitIdObj && typeof resultLimitIdObj === 'object') {
        const entries = Object.values(resultLimitIdObj);
        if (entries.length > 0) {
            return { entry: entries[0], extraCount: entries.length - 1 };
        }
    }
    return { entry: null, extraCount: 0 };
}

function formatRateLimitSummary(payload) {
    const extracted = extractRateLimitEntry(payload);
    const entry = extracted.entry;
    // Support both camelCase and snake_case keys from Codex API
    // Also handle wrapped response: { result: { rateLimits: ... } }
    const resultWrapper = payload && payload.result;
    const sources = [
        payload,
        payload && payload.rateLimit,
        payload && payload.rateLimits,
        payload && payload.ratelimits,         // snake_case
        payload && payload.rate_limits,        // snake_case
        resultWrapper,
        resultWrapper && resultWrapper.rateLimit,
        resultWrapper && resultWrapper.rateLimits,
        resultWrapper && resultWrapper.ratelimits,
        resultWrapper && resultWrapper.rate_limits,
        entry
    ];
    const message = pickFirstString(sources, [
        ['message'],
        ['detail'],
        ['error', 'message']
    ]);
    const scope = pickFirstString(sources, [
        ['scope'],
        ['name'],
        ['type'],
        ['resource']
    ]);
    const remaining = pickFirstNumber(sources, [
        ['remaining'],
        ['remaining_requests'],    // snake_case
        ['remainingRequests'],
        ['limitRemaining'],
        ['rate_limit_remaining'],  // snake_case
        ['rateLimitRemaining']
    ]);
    const limit = pickFirstNumber(sources, [
        ['limit'],
        ['max'],
        ['rate_limit'],           // snake_case
        ['rateLimit']
    ]);
    const retryAfter = pickFirstNumber(sources, [
        ['retryAfterSeconds'],
        ['retry_after_seconds'],  // snake_case
        ['retryAfter'],
        ['retry_after']
    ]);
    const resetHint = formatResetHint(
        pickFirstString(sources, [['resetAt'], ['resetsAt'], ['reset_at'], ['resets_at']])
        || pickFirstNumber(sources, [['resetAtEpochMs'], ['resetsInSeconds'], ['reset_at_epoch_ms'], ['resets_in_seconds']])
    );
    const rawStatus = pickFirstString(sources, [['status'], ['state'], ['result']]).toLowerCase();
    const primaryUsedPercent = pickFirstNumber(sources, [
        ['primary', 'usedPercent'],
        ['primary', 'used_percent']
    ]);
    const secondaryUsedPercent = pickFirstNumber(sources, [
        ['secondary', 'usedPercent'],
        ['secondary', 'used_percent']
    ]);
    const primaryWindowMins = pickFirstNumber(sources, [
        ['primary', 'windowDurationMins'],
        ['primary', 'window_duration_mins']
    ]);
    const secondaryWindowMins = pickFirstNumber(sources, [
        ['secondary', 'windowDurationMins'],
        ['secondary', 'window_duration_mins']
    ]);
    const primaryResetHint = formatResetHint(
        pickFirstString(sources, [
            ['primary', 'resetAt'],
            ['primary', 'resetsAt'],
            ['primary', 'reset_at'],
            ['primary', 'resets_at']
        ])
        || pickFirstNumber(sources, [
            ['primary', 'resetAtEpochMs'],
            ['primary', 'resetsAtEpochMs'],
            ['primary', 'resetsAt'],
            ['primary', 'resets_at'],
            ['primary', 'resetsInSeconds'],
            ['primary', 'resets_in_seconds']
        ])
    );
    const secondaryResetHint = formatResetHint(
        pickFirstString(sources, [
            ['secondary', 'resetAt'],
            ['secondary', 'resetsAt'],
            ['secondary', 'reset_at'],
            ['secondary', 'resets_at']
        ])
        || pickFirstNumber(sources, [
            ['secondary', 'resetAtEpochMs'],
            ['secondary', 'resetsAtEpochMs'],
            ['secondary', 'resetsAt'],
            ['secondary', 'resets_at'],
            ['secondary', 'resetsInSeconds'],
            ['secondary', 'resets_in_seconds']
        ])
    );
    const parts = [];
    if (typeof remaining === 'number' && typeof limit === 'number') {
        if (scope) parts.push(scope);
        parts.push(`${Math.max(0, Math.round(remaining))}/${Math.max(0, Math.round(limit))} left`);
    } else if (typeof remaining === 'number') {
        if (scope) parts.push(scope);
        parts.push(`${Math.max(0, Math.round(remaining))} left`);
    } else {
        if (typeof primaryUsedPercent === 'number') {
            const primaryParts = [formatRateLimitWindowLabel(primaryWindowMins) || t('codex.rateLimit.primary')];
            primaryParts.push(`${Math.max(0, Math.round(primaryUsedPercent))}%`);
            if (primaryResetHint) {
                primaryParts.push(primaryResetHint);
            }
            parts.push(primaryParts.join(' '));
        }
        if (typeof secondaryUsedPercent === 'number') {
            const secondaryParts = [formatRateLimitWindowLabel(secondaryWindowMins) || t('codex.rateLimit.secondary')];
            secondaryParts.push(`${Math.max(0, Math.round(secondaryUsedPercent))}%`);
            if (secondaryResetHint) {
                secondaryParts.push(secondaryResetHint);
            }
            parts.push(secondaryParts.join(' '));
        }
    }
    if (retryAfter && retryAfter > 0) {
        parts.push(`retry in ${formatDurationShort(retryAfter)}`);
    } else if (resetHint) {
        parts.push(`resets ${resetHint}`);
    }
    if (extracted.extraCount > 0) {
        parts.push(`+${extracted.extraCount} scopes`);
    }
    const summary = parts.length > 0 ? parts.join(' | ') : message;

    let tone = '';
    if (
        (typeof remaining === 'number' && remaining <= 1) ||
        (typeof primaryUsedPercent === 'number' && primaryUsedPercent >= 90) ||
        (typeof secondaryUsedPercent === 'number' && secondaryUsedPercent >= 90) ||
        (typeof retryAfter === 'number' && retryAfter > 0) ||
        rawStatus.includes('exhaust') ||
        rawStatus.includes('limit') ||
        rawStatus.includes('denied')
    ) {
        tone = rawStatus.includes('denied') ? 'error' : 'warn';
    }

    return { summary, tone };
}

function logCodexTelemetryChange(kind, summary, meta) {
    if (!summary) return;
    const stateKey = kind === 'rateLimit' ? 'lastRateLimitLog' : 'lastTokenUsageLog';
    if (codexState[stateKey] === summary) return;
    codexState[stateKey] = summary;
    appendCodexLogEntry('system', summary, { meta });
}

function applyCodexTokenUsage(payload) {
    const summary = formatTokenUsageSummary(payload);
    codexState.tokenUsageSummary = summary;
    codexState.contextUsage = normalizeCodexContextUsage(payload);
    console.info('[JS][tokenUsage][apply]', JSON.stringify({
        payload: payload || null,
        summary,
        contextUsage: codexState.contextUsage
    }));
    if (!codexState.contextUsage) {
        codexState.contextDebugModalOpen = false;
    }
    codexState.contextUsageUpdatedAt = codexState.contextUsage ? Date.now() : 0;
    renderCodexAuxStatus();
    renderCodexContextUsage();
    renderCodexContextDebugModal();
    if (summary) {
        logCodexTelemetryChange('tokenUsage', `Token usage updated: ${summary}`, 'usage');
    }
}

function applyCodexRateLimit(payload) {
    const next = formatRateLimitSummary(payload || {});
    // 只有当新的 summary 非空时才更新状态
    // 避免空 payload 覆盖已有的额度信息
    if (next.summary) {
        codexState.rateLimitSummary = next.summary;
        codexState.rateLimitTone = next.tone;
    }
    renderCodexAuxStatus();
    if (next.summary) {
        logCodexTelemetryChange('rateLimit', `Rate limit updated: ${next.summary}`, 'limits');
    }
}

function resolveCodexErrorMessage(code, message) {
    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    let trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (trimmedMessage.startsWith('{') && trimmedMessage.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmedMessage);
            if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
                trimmedMessage = parsed.detail.trim();
            }
        } catch (_) {
            // Keep the original message if it is not valid JSON.
        }
    }
    if (normalizedCode.includes('TOKEN') && normalizedCode.includes('LIMIT')) {
        return trimmedMessage || 'Token limit exceeded. Reduce the prompt or start a new thread.';
    }
    if (normalizedCode.includes('RATE') && normalizedCode.includes('LIMIT')) {
        return trimmedMessage || 'Rate limit reached. Wait and retry.';
    }
    if (normalizedCode.includes('AUTH') || normalizedCode.includes('UNAUTHORIZED')) {
        return trimmedMessage || 'Codex authentication failed.';
    }
    if (normalizedCode.includes('BILLING') || normalizedCode.includes('CREDIT') || normalizedCode.includes('FUNDS')) {
        return trimmedMessage || 'Codex account billing or credit issue.';
    }
    if (normalizedCode.includes('MODEL') || normalizedCode.includes('PROVIDER')) {
        return trimmedMessage || 'Codex model provider is unavailable.';
    }
    return trimmedMessage || 'Codex emitted an error event.';
}

function isCodexThreadNotMaterializedError(code, message) {
    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const normalizedMessage = typeof message === 'string' ? message.trim().toLowerCase() : '';
    if (normalizedCode === '-32600' || normalizedCode.includes('INVALID')) {
        return normalizedMessage.includes('not materialized yet')
            || normalizedMessage.includes('includeTurns is unavailable before first user message'.toLowerCase());
    }
    return normalizedMessage.includes('not materialized yet')
        || normalizedMessage.includes('includeTurns is unavailable before first user message'.toLowerCase());
}

function getViewportHeight() {
    if (window.visualViewport && typeof window.visualViewport.height === 'number') {
        return Math.round(window.visualViewport.height);
    }
    if (typeof window.innerHeight === 'number' && window.innerHeight > 0) {
        return Math.round(window.innerHeight);
    }
    if (document.documentElement && document.documentElement.clientHeight > 0) {
        return Math.round(document.documentElement.clientHeight);
    }
    return 0;
}

function updateViewportLayoutState() {
    const height = getViewportHeight();
    if (!height) return;
    if (!viewportState.baselineHeight || height > viewportState.baselineHeight) {
        viewportState.baselineHeight = height;
    }
    const lostHeight = viewportState.baselineHeight - height;
    const compact = lostHeight >= 100 || height <= 800;
    viewportState.compact = compact;
    if (document.body) {
        document.body.classList.toggle('viewport-compact', compact);
    }
}

function rememberPendingTurnState(snapshot) {
    codexState.pendingSubmittedTurnState = snapshot || null;
}

function clearPendingTurnState() {
    codexState.pendingSubmittedTurnState = null;
}

function finalizePendingTurnStateOnSuccess() {
    const pending = codexState.pendingSubmittedTurnState;
    if (!pending) {
        return;
    }
    if (pending.clearOverrides === true) {
        clearNextTurnOverrides();
    }
    if (pending.clearPlanMode === true || pending.clearActiveSkill === true) {
        setCodexInteractionState({
            planMode: pending.clearPlanMode === true ? false : codexState.interactionState.planMode === true,
            activeSkill: pending.clearActiveSkill === true ? null : codexState.interactionState.activeSkill
        });
    }
    if (pending.clearImageInputs === true) {
        clearPendingCodexImageInputs();
    }
    if (pending.clearFileMentions === true) {
        codexState.pendingFileMentions = [];
        renderCodexFileMentionChips();
    }
    clearPendingTurnState();
}

function restorePendingTurnStateOnFailure() {
    const pending = codexState.pendingSubmittedTurnState;
    if (!pending) {
        return;
    }
    setNextTurnOverrides(pending.nextTurnOverrides || { model: null, reasoningEffort: null, sandbox: null });
    setCodexInteractionState(pending.interactionState || { planMode: false, activeSkill: null });
    setPendingCodexImageInputs(pending.imageInputs || []);
    if (Array.isArray(pending.fileMentions)) {
        codexState.pendingFileMentions = pending.fileMentions.slice();
        renderCodexFileMentionChips();
    }
    clearPendingTurnState();
}

function sendCodexTurn(text, options) {
    const cleaned = typeof text === 'string' ? text.trim() : '';
    const opts = options || {};
    const nextTurnOverrides = normalizeNextTurnOverrides(opts.nextTurnOverrides || codexState.nextTurnOverrides);
    const interactionState = normalizeCodexInteractionState(opts.interactionState || codexState.interactionState);
    const imageInputs = normalizeCodexImageInputs(opts.imageInputs || codexState.pendingImageInputs);
    const fileMentions = Array.isArray(opts.fileMentions) ? opts.fileMentions : codexState.pendingFileMentions;
    const collaborationMode = normalizeCodexCollaborationMode(opts.collaborationMode);
    if (!cleaned && imageInputs.length === 0 && fileMentions.length === 0) return false;
    if (!collaborationMode && codexState.planWorkflow.phase === 'plan_ready_for_confirmation') {
        setPlanWorkflowState(buildEmptyPlanWorkflowState());
    }
    let finalText = cleaned;
    if (fileMentions.length > 0) {
        const fileRefs = fileMentions.map((f) => `@${f.path}`).join('\n');
        finalText = fileRefs + '\n\n' + cleaned;
    }
    const payload = {
        type: 'codex_turn',
        text: finalText,
        forceNewThread: !!opts.forceNewThread,
        cwd: getConfiguredCodexCwd() || undefined,
        model: nextTurnOverrides.model || undefined,
        reasoningEffort: nextTurnOverrides.reasoningEffort || undefined,
        sandbox: resolveCodexTurnSandboxOverride(nextTurnOverrides) || undefined,
        collaborationMode: collaborationMode || undefined,
        attachments: imageInputs.length > 0 ? imageInputs : undefined
    };

    const imageSummary = imageInputs.map((entry) => {
        if (entry.type === 'localImage') {
            return t('codex.image.localImageLog', { name: entry.name || t('codex.image.defaultName') });
        }
        return t('codex.image.urlLog', { url: entry.url });
    });
    const fileSummary = fileMentions.length > 0
        ? fileMentions.map((f) => t('codex.image.fileLog', { label: f.label })).join('\n')
        : '';
    appendCodexLogEntry('user', [fileSummary, cleaned, ...imageSummary].filter(Boolean).join('\n'), { meta: 'you' });
    if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
        codexState.unmaterializedThreadId = '';
    }
    codexState.pendingFreshThread = false;
    setCodexStatus('running', 'starting turn');
    rememberPendingTurnState({
        nextTurnOverrides,
        interactionState,
        imageInputs,
        fileMentions,
        clearOverrides: opts.clearOverrides !== false
            && (!!nextTurnOverrides.model || !!nextTurnOverrides.reasoningEffort || !!nextTurnOverrides.sandbox),
        clearPlanMode: opts.clearPlanMode === true,
        clearActiveSkill: !!interactionState.activeSkill,
        clearImageInputs: imageInputs.length > 0,
        clearFileMentions: fileMentions.length > 0
    });
    if (collaborationMode && collaborationMode.mode === 'plan') {
        startPlanWorkflow(finalText);
    }
    if (!sendCodexEnvelope(payload)) {
        if (collaborationMode && collaborationMode.mode === 'plan') {
            setPlanWorkflowState(buildEmptyPlanWorkflowState());
        }
        restorePendingTurnStateOnFailure();
        return false;
    }
    return true;
}

function handleCodexComposerSubmit(rawText) {
    const slashApi = getCodexSlashCommandsApi();
    const parsed = slashApi && typeof slashApi.parseComposerInput === 'function'
        ? slashApi.parseComposerInput(rawText)
        : { kind: 'text', text: rawText };

    if (parsed.kind === 'empty') {
        if (codexState.pendingImageInputs.length > 0) {
            sendCodexTurn('', {
                clearPlanMode: codexState.interactionState.planMode === true,
                collaborationMode: codexState.interactionState.planMode === true
                    ? buildPlanCollaborationMode(codexState.nextTurnEffectiveCodexConfig)
                    : null
            });
            return true;
        }
        return false;
    }

    if (parsed.kind !== 'slash') {
        const collaborationMode = codexState.interactionState.planMode === true
            ? buildPlanCollaborationMode(codexState.nextTurnEffectiveCodexConfig)
            : null;
        sendCodexTurn(parsed.text, {
            clearPlanMode: codexState.interactionState.planMode === true,
            collaborationMode
        });
        return true;
    }

    const registryEntry = resolveExecutableCodexSlashCommand(parsed.command);

    if (!registryEntry) {
        appendCodexLogEntry('error', buildUnsupportedSlashCommandMessage(), { meta: 'slash' });
        return false;
    }

    if (registryEntry.command === '/plan') {
        if (!parsed.argumentText) {
            setPlanMode(true);
            return true;
        }
        sendCodexTurn(parsed.argumentText, {
            collaborationMode: buildPlanCollaborationMode(codexState.nextTurnEffectiveCodexConfig),
            clearPlanMode: true
        });
        return true;
    }

    if (registryEntry.command === '/model') {
        if (codexInput) {
            codexInput.value = '';
        }
        if (codexQuickModel) {
            void openCodexModelPicker();
        }
        setSlashMenuState(false, '');
        return false;
    }

    if (registryEntry.command === '/skill') {
        if (!parsed.argumentText) {
            if (codexInput) {
                codexInput.value = '/skill ';
                codexInput.focus();
            }
            void maybeLoadCodexSkills();
            setSlashMenuState(true, '/skill ');
            return false;
        }
        const skillEntry = findCodexSkillEntry(parsed.argumentText);
        if (!skillEntry) {
            appendCodexLogEntry('system', t('codex.slash.skillNotFound', { name: parsed.argumentText }), { meta: 'slash' });
            setSlashMenuState(true, `/skill ${parsed.argumentText}`);
            return false;
        }
        applyCodexSkillSelection(skillEntry);
        setSlashMenuState(false, '');
        return false;
    }

    if (registryEntry.command === '/skills') {
        if (codexInput) {
            codexInput.value = '';
        }
        setSlashMenuState(false, '');
        openCodexToolsPanel('skills');
        return false;
    }

    if (registryEntry.command === '/compact') {
        if (codexInput) {
            codexInput.value = '';
        }
        setSlashMenuState(false, '');
        openCodexToolsPanel('compact');
        return false;
    }

    appendCodexLogEntry('system', registryEntry.statusText || t('codex.slash.commandReserved'), { meta: 'slash' });
    return false;
}

function requestCodexNewThread(options) {
    const opts = options || {};
    beginFreshCodexThreadUiReset();
    setPlanWorkflowState({
        ...buildEmptyPlanWorkflowState()
    });
    setPlanMode(false);
    const sent = sendCodexEnvelope({
        type: 'codex_new_thread',
        cwd: getConfiguredCodexCwd() || undefined
    });
    if (!sent) {
        rollbackFreshCodexThreadUiReset(t('codex.thread.newTaskFailed'));
        return;
    }
    codexState.pendingFreshThreadTimeoutId = setTimeout(() => {
        if (codexState.pendingFreshThread === true && codexState.pendingFreshThreadUiSnapshot) {
            rollbackFreshCodexThreadUiReset(t('codex.thread.newTaskTimeout'));
        }
    }, CODEX_NEW_THREAD_TIMEOUT_MS);
}

function requestCodexInterrupt() {
    sendCodexEnvelope({ type: 'codex_interrupt' });
}

function requestCodexThreadSnapshot() {
    sendCodexEnvelope({ type: 'codex_thread_read' });
}

function refreshCodexThreadSnapshot(options) {
    const opts = options || {};
    const targetThreadId = typeof opts.threadId === 'string' && opts.threadId.trim()
        ? opts.threadId.trim()
        : codexState.threadId;
    const bootstrapApi = getCodexBootstrapApi();
    const shouldRead = bootstrapApi && typeof bootstrapApi.shouldReadThreadSnapshot === 'function'
        ? bootstrapApi.shouldReadThreadSnapshot({
            threadId: targetThreadId,
            lastSnapshotThreadId: codexState.lastSnapshotThreadId,
            unmaterializedThreadId: codexState.unmaterializedThreadId,
            pendingFreshThread: codexState.pendingFreshThread === true && targetThreadId === codexState.threadId,
            force: opts.force === true
        })
        : (
            !!targetThreadId
            && !(codexState.pendingFreshThread === true && targetThreadId === codexState.threadId && !codexState.lastSnapshotThreadId)
            && codexState.unmaterializedThreadId !== targetThreadId
            && (opts.force === true || codexState.lastSnapshotThreadId !== targetThreadId)
        );
    if (!shouldRead) {
        return;
    }
    requestCodexThreadSnapshot();
}

function buildApprovalDecisionResult(method, approved) {
    const approvalApi = getCodexApprovalViewApi();
    if (approvalApi && typeof approvalApi.buildApprovalDecisionResult === 'function') {
        const result = approvalApi.buildApprovalDecisionResult({ method, responseMode: 'decision' }, approved);
        if (result) {
            return result;
        }
    }
    if (method === 'item/commandExecution/requestApproval') {
        return { decision: approved ? 'accept' : 'decline' };
    }
    if (method === 'item/fileChange/requestApproval') {
        return { decision: approved ? 'approve' : 'decline' };
    }
    if (method === 'applyPatchApproval' || method === 'execCommandApproval') {
        return { decision: approved ? 'approved' : 'denied' };
    }
    return null;
}

function resolveApprovalSummary(method, params) {
    if (method === 'item/commandExecution/requestApproval') {
        const command = params && typeof params.command === 'string' ? params.command : '';
        return command ? `Command approval requested:\n${command}` : 'Command approval requested.';
    }
    if (method === 'execCommandApproval') {
        const command = params && typeof params.command === 'string' ? params.command : '';
        return command ? `Exec approval requested:\n${command}` : 'Exec approval requested.';
    }
    if (method === 'item/fileChange/requestApproval' || method === 'applyPatchApproval') {
        const reason = params && typeof params.reason === 'string' ? params.reason : '';
        return reason ? `File change approval requested:\n${reason}` : 'File change approval requested.';
    }
    return `Approval requested: ${method || 'unknown'}`;
}

function getCodexRequestState(requestId) {
    if (!requestId) return null;
    return codexState.requestStateById.get(requestId) || null;
}

function setCodexRequestState(nextState) {
    if (!nextState || !nextState.requestId) return;
    codexState.requestStateById.set(nextState.requestId, nextState);
}

function clearCodexRequestCards() {
    codexState.requestStateById.forEach((requestState) => {
        if (requestState && requestState.entry && requestState.entry.isConnected) {
            requestState.entry.remove();
        }
    });
    codexState.requestStateById.clear();
}

function getBlockingCodexCommandRequestState() {
    const requestId = typeof codexState.activeCommandApprovalRequestId === 'string'
        ? codexState.activeCommandApprovalRequestId.trim()
        : '';
    if (requestId) {
        const active = getCodexRequestState(requestId);
        if (active && active.requestKind === 'command') {
            return active;
        }
    }
    const pendingRequest = Array.from(codexState.requestStateById.values()).find((entry) => (
        entry
        && entry.requestKind === 'command'
        && (entry.status === 'pending' || entry.status === 'submitted')
    ));
    codexState.activeCommandApprovalRequestId = pendingRequest && pendingRequest.requestId
        ? pendingRequest.requestId
        : '';
    return pendingRequest || null;
}

function renderCodexCommandApprovalModal() {
    if (!codexCommandApprovalModal) {
        return;
    }
    const approvalApi = getCodexApprovalViewApi();
    const requestState = getBlockingCodexCommandRequestState();
    const isVisible = !!requestState;
    codexCommandApprovalModal.hidden = !isVisible;
    if (!isVisible) {
        if (codexCommandApprovalRemember) {
            codexCommandApprovalRemember.checked = false;
        }
        return;
    }
    const statusText = approvalApi && typeof approvalApi.resolveApprovalStatusText === 'function'
        ? approvalApi.resolveApprovalStatusText(requestState)
        : (requestState.status || t('codex.approval.status.pending'));
    const summaryText = approvalApi && typeof approvalApi.resolveApprovalSummaryText === 'function'
        ? approvalApi.resolveApprovalSummaryText(requestState)
        : t('codex.approval.summary.command');
    const commandText = approvalApi && typeof approvalApi.extractCommandText === 'function'
        ? approvalApi.extractCommandText(requestState)
        : '';
    if (codexCommandApprovalStatus) {
        codexCommandApprovalStatus.textContent = statusText;
    }
    if (codexCommandApprovalSummary) {
        codexCommandApprovalSummary.textContent = summaryText;
    }
    if (codexCommandApprovalCommand) {
        codexCommandApprovalCommand.textContent = commandText || t('codex.approval.noCommandReturned');
    }
    const isLocked = requestState.status !== 'pending';
    if (btnCodexCommandApprovalApprove) {
        btnCodexCommandApprovalApprove.disabled = isLocked;
    }
    if (btnCodexCommandApprovalReject) {
        btnCodexCommandApprovalReject.disabled = isLocked;
    }
    if (codexCommandApprovalRememberWrap) {
        codexCommandApprovalRememberWrap.hidden = requestState.status !== 'pending';
    }
}

function resolveCodexRequestActionLabel(requestState) {
    if (!requestState || typeof requestState !== 'object') {
        return 'approval';
    }
    if (requestState.requestKind === 'patch') return 'patch';
    if (requestState.requestKind === 'file') return 'file';
    if (requestState.requestKind === 'command') return 'command';
    if (requestState.requestKind === 'userInput') return 'input';
    return 'approval';
}

function updateCodexRequestCard(requestState) {
    if (!requestState) {
        return;
    }
    const approvalApi = getCodexApprovalViewApi();
    const entry = requestState.entry;
    if (entry && entry.isConnected) {
        entry.classList.toggle('codex-request-pending', requestState.status === 'pending');
        entry.classList.toggle('codex-request-submitted', requestState.status === 'submitted');
        entry.classList.toggle('codex-request-resolved', requestState.status === 'resolved');

        const statusNode = entry.querySelector('.codex-request-status');
        if (statusNode) {
            statusNode.textContent = approvalApi && typeof approvalApi.resolveApprovalStatusText === 'function'
                ? approvalApi.resolveApprovalStatusText(requestState)
                : (requestState.status || 'pending');
        }
        const metaNode = entry.querySelector('.meta');
        if (metaNode) {
            const actionLabel = resolveCodexRequestActionLabel(requestState);
            if (requestState.status === 'resolved') {
                metaNode.textContent = `${actionLabel}: ${requestState.resolution || t('codex.approval.resolved')}`;
            } else if (requestState.status === 'submitted') {
                metaNode.textContent = `${actionLabel}: ${t('codex.approval.submitted')}`;
            } else {
                metaNode.textContent = `${actionLabel}: ${t('codex.approval.pending')}`;
            }
        }
        const approveBtn = entry.querySelector('[data-request-action="approve"]');
        const rejectBtn = entry.querySelector('[data-request-action="reject"]');
        const isLocked = requestState.status !== 'pending';
        if (approveBtn) approveBtn.disabled = isLocked;
        if (rejectBtn) rejectBtn.disabled = isLocked;
    }
    if (requestState.requestKind === 'command') {
        if (requestState.status === 'resolved') {
            codexState.activeCommandApprovalRequestId = '';
        }
        renderCodexCommandApprovalModal();
    }
}

function markCodexRequestState(requestId, status, resolution) {
    const requestState = getCodexRequestState(requestId);
    if (!requestState) return;
    requestState.status = status;
    if (resolution) {
        requestState.resolution = resolution;
    }
    updateCodexRequestCard(requestState);
}

function reconcileCodexRequestStatesWithServerState(pendingRequests) {
    const approvalApi = getCodexApprovalViewApi();
    codexState.pendingServerRequests = Array.isArray(pendingRequests) ? pendingRequests.slice() : [];
    if (!approvalApi || typeof approvalApi.pickResolvedRequestIds !== 'function') {
        return;
    }
    const activeRequestIds = codexState.pendingServerRequests
        .filter((entry) => entry && typeof entry.requestId === 'string')
        .map((entry) => entry.requestId);
    const resolvedIds = approvalApi.pickResolvedRequestIds(
        activeRequestIds,
        Array.from(codexState.requestStateById.values())
    );
    resolvedIds.forEach((requestId) => {
        markCodexRequestState(requestId, 'resolved');
    });
    codexState.pendingServerRequests.forEach((request) => {
        if (!request || !request.requestId) return;
        const existing = getCodexRequestState(request.requestId);
        if (existing) {
            existing.method = request.method || existing.method;
            existing.requestKind = request.requestKind || existing.requestKind;
            existing.responseMode = request.responseMode || existing.responseMode;
            existing.summary = request.summary || existing.summary;
            existing.params = request.params && typeof request.params === 'object'
                ? request.params
                : null;
            existing.questions = Array.isArray(request.params && request.params.questions)
                ? request.params.questions
                : (Array.isArray(existing.questions) ? existing.questions : []);
            if (existing.status === 'submitted') {
                existing.status = 'pending';
                existing.resolution = '';
            }
            updateCodexRequestCard(existing);
        }
        if (!existing || !existing.entry || !existing.entry.isConnected) {
            renderCodexServerRequest({
                ...request,
                handledBy: 'client'
            });
        }
    });
    renderCodexCommandApprovalModal();
}

function renderCodexServerRequest(envelope) {
    const approvalApi = getCodexApprovalViewApi();
    const request = approvalApi && typeof approvalApi.normalizeApprovalRequest === 'function'
        ? approvalApi.normalizeApprovalRequest(envelope)
        : null;
    const requestId = request ? request.requestId : '';
    const method = request ? request.method : (envelope && typeof envelope.method === 'string' ? envelope.method : 'unknown');
    if (!requestId || !request) {
        appendCodexLogEntry('system', t('codex.log.requestReceived', { method }), { meta: 'approval' });
        return;
    }
    if (request.handledBy !== 'client') {
        const autoSummary = approvalApi && typeof approvalApi.resolveApprovalSummaryText === 'function'
            ? approvalApi.resolveApprovalSummaryText(request)
            : resolveApprovalSummary(method, envelope && envelope.params ? envelope.params : {});
        appendCodexLogEntry('system', t('codex.log.requestAutoHandled', { summary: autoSummary }), { meta: request.requestKind || 'approval' });
        return;
    }

    const existing = getCodexRequestState(requestId);
    if (existing && ((existing.entry && existing.entry.isConnected) || existing.requestKind === 'command')) {
        return;
    }

    const useBlockingModal = approvalApi && typeof approvalApi.shouldUseBlockingModal === 'function'
        ? approvalApi.shouldUseBlockingModal(request)
        : request.requestKind === 'command';

    if (useBlockingModal) {
        appendCodexLogEntry(
            'system',
            t('codex.approval.logPending', { summary: approvalApi && typeof approvalApi.resolveApprovalSummaryText === 'function'
                ? approvalApi.resolveApprovalSummaryText(request)
                : (request.summary || request.method) }),
            { meta: 'approval', itemId: `request:${requestId}` }
        );
        const requestState = {
            ...request,
            entry: null,
            status: 'pending',
            resolution: ''
        };
        setCodexRequestState(requestState);
        codexState.activeCommandApprovalRequestId = requestId;
        renderCodexCommandApprovalModal();
        return;
    }

    const summary = approvalApi && typeof approvalApi.resolveApprovalSummaryText === 'function'
        ? approvalApi.resolveApprovalSummaryText(request)
        : resolveApprovalSummary(method, envelope.params || {});
    const entry = appendCodexLogEntry(
        'system',
        summary,
        { meta: 'approval', itemId: `request:${requestId}` }
    );
    if (!entry) return;
    entry.classList.add('codex-request-card', `kind-${request.requestKind || 'unknown'}`);

    const titleNode = document.createElement('div');
    titleNode.className = 'codex-request-title';
    titleNode.textContent = request.title || t('codex.approval.defaultTitle');
    entry.insertBefore(titleNode, entry.querySelector('.content'));

    const statusNode = document.createElement('div');
    statusNode.className = 'codex-request-status';
    entry.appendChild(statusNode);

    const actions = document.createElement('div');
    actions.className = 'codex-request-actions';
    const questionSelections = {};
    const supportsOptionAnswers = request.responseMode === 'answers'
        && Array.isArray(request.questions)
        && request.questions.length > 0
        && request.questions.every((question) => (
            question
            && typeof question === 'object'
            && Array.isArray(question.options)
            && question.options.some((option) => option && typeof option.label === 'string' && option.label.trim())
        ));
    let approveBtn = null;
    let rejectBtn = null;
    if (supportsOptionAnswers) {
        request.questions.forEach((question) => {
            const questionWrap = document.createElement('div');
            questionWrap.className = 'codex-request-question';

            const questionLabel = document.createElement('div');
            questionLabel.className = 'codex-request-question-label';
            questionLabel.textContent = typeof question.question === 'string' && question.question.trim()
                ? question.question.trim()
                : (question.id || 'Question');
            questionWrap.appendChild(questionLabel);

            const optionsWrap = document.createElement('div');
            optionsWrap.className = 'codex-request-question-options';
            const options = Array.isArray(question.options) ? question.options : [];
            options.forEach((option) => {
                const optionLabel = typeof option.label === 'string' ? option.label.trim() : '';
                if (!optionLabel) return;
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = optionLabel;
                button.dataset.questionId = question.id || '';
                button.dataset.answerLabel = optionLabel;
                button.addEventListener('click', () => {
                    questionSelections[question.id] = optionLabel;
                    Array.from(optionsWrap.querySelectorAll('button')).forEach((node) => {
                        node.classList.toggle('selected', node.dataset.answerLabel === optionLabel);
                    });
                    submitBtn.disabled = Array.isArray(request.questions)
                        ? request.questions.some((entry) => !questionSelections[entry.id])
                        : false;
                });
                optionsWrap.appendChild(button);
            });
            questionWrap.appendChild(optionsWrap);
            actions.appendChild(questionWrap);
        });
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'primary';
        submitBtn.dataset.requestAction = 'approve';
        submitBtn.textContent = t('common.submit');
        submitBtn.disabled = true;
        const rejectUserInputBtn = document.createElement('button');
        rejectUserInputBtn.type = 'button';
        rejectUserInputBtn.dataset.requestAction = 'reject';
        rejectUserInputBtn.textContent = t('common.cancel');
        actions.appendChild(submitBtn);
        actions.appendChild(rejectUserInputBtn);
        approveBtn = submitBtn;
        rejectBtn = rejectUserInputBtn;
    } else if (request.responseMode === 'answers') {
        const unsupported = document.createElement('div');
        unsupported.className = 'codex-request-question-label';
        unsupported.textContent = t('codex.approval.clientOnlyOptions');
        actions.appendChild(unsupported);
        rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.dataset.requestAction = 'reject';
        rejectBtn.textContent = t('common.cancel');
        actions.appendChild(rejectBtn);
    } else {
        approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'primary';
        approveBtn.dataset.requestAction = 'approve';
        approveBtn.textContent = t('common.approve');
        rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.dataset.requestAction = 'reject';
        rejectBtn.textContent = t('common.reject');
        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
    }
    entry.appendChild(actions);

    const requestState = {
        ...request,
        entry,
        status: 'pending',
        resolution: ''
    };
    setCodexRequestState(requestState);
    updateCodexRequestCard(requestState);
    if (request.requestKind === 'userInput' && codexState.planWorkflow.phase === 'planning') {
        setPlanWorkflowState({
            ...codexState.planWorkflow,
            phase: 'awaiting_user_input',
            lastUserInputRequestId: requestId
        });
    }

    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            const result = requestState.responseMode === 'answers'
                ? (approvalApi && typeof approvalApi.buildUserInputResult === 'function'
                    ? approvalApi.buildUserInputResult(requestState, questionSelections)
                    : null)
                : (approvalApi && typeof approvalApi.buildApprovalDecisionResult === 'function'
                    ? approvalApi.buildApprovalDecisionResult(requestState, true)
                    : buildApprovalDecisionResult(method, true));
            if (!result) return;
            if (sendCodexEnvelope({ type: 'codex_server_request_response', requestId, result })) {
                if (requestState.requestKind === 'userInput') {
                    setPlanWorkflowState({
                        ...codexState.planWorkflow,
                        phase: 'planning',
                        lastUserInputRequestId: requestId
                    });
                }
                markCodexRequestState(requestId, 'submitted', requestState.responseMode === 'answers' ? 'submitted' : 'approved');
            }
        });
    }

    rejectBtn.addEventListener('click', () => {
        if (requestState.responseMode === 'answers') {
            if (sendCodexEnvelope({
                type: 'codex_server_request_response',
                requestId,
                error: { message: 'User input request cancelled by user.' }
            })) {
                if (requestState.requestKind === 'userInput') {
                    cancelPlanWorkflow();
                }
                markCodexRequestState(requestId, 'submitted', 'rejected');
            }
            return;
        }
        const result = approvalApi && typeof approvalApi.buildApprovalDecisionResult === 'function'
            ? approvalApi.buildApprovalDecisionResult(requestState, false)
            : buildApprovalDecisionResult(method, false);
        if (!result) return;
        if (sendCodexEnvelope({ type: 'codex_server_request_response', requestId, result })) {
            markCodexRequestState(requestId, 'submitted', 'rejected');
        }
    });
}

function submitBlockingCommandApprovalDecision(approved) {
    const requestState = getBlockingCodexCommandRequestState();
    if (!requestState) {
        return false;
    }
    const approvalApi = getCodexApprovalViewApi();
    const result = approvalApi && typeof approvalApi.buildApprovalDecisionResult === 'function'
        ? approvalApi.buildApprovalDecisionResult(requestState, approved)
        : buildApprovalDecisionResult(requestState.method, approved);
    if (!result) {
        return false;
    }
    if (!sendCodexEnvelope({ type: 'codex_server_request_response', requestId: requestState.requestId, result })) {
        return false;
    }
    markCodexRequestState(requestState.requestId, 'submitted', approved ? 'approved' : 'rejected');
    return true;
}

function handleCodexThreadSnapshot(thread) {
    if (!thread) return;
    const turns = Array.isArray(thread.turns) ? thread.turns : [];
    const snapshotTitle = resolveCodexThreadTitle(thread);
    if (Object.prototype.hasOwnProperty.call(thread, 'latestTokenUsageInfo')) {
        applyCodexTokenUsage({
            latestTokenUsageInfo: thread.latestTokenUsageInfo
        });
    } else if (Object.prototype.hasOwnProperty.call(thread, 'tokenUsage')) {
        applyCodexTokenUsage(thread.tokenUsage || null);
    }
    if (thread && typeof thread.id === 'string') {
        setKnownCodexThreadTitle(thread.id, snapshotTitle);
    }
    codexState.lastSnapshotThreadId = thread && typeof thread.id === 'string'
        ? thread.id
        : codexState.threadId;
    if (codexState.unmaterializedThreadId && codexState.lastSnapshotThreadId === codexState.unmaterializedThreadId) {
        codexState.unmaterializedThreadId = '';
    }
    if (codexState.threadId && codexState.lastSnapshotThreadId === codexState.threadId) {
        codexState.pendingFreshThread = false;
        codexState.currentThreadTitle = snapshotTitle;
    }
    if (thread && typeof thread.id === 'string') {
        updateCodexHistoryThreadTitle(thread.id, snapshotTitle);
    }
    const logContainer = getCodexLogContainer();
    if (logContainer) {
        logContainer.innerHTML = '';
    }
    codexState.messageByItemId.clear();
    clearCodexRequestCards();
    clearCodexRuntimePanels();
    clearCodexAlerts();

    turns.forEach((turn) => {
        if (!turn || !Array.isArray(turn.items)) return;
        turn.items.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            if (item.type === 'userMessage') {
                const firstText = Array.isArray(item.content)
                    ? item.content.find((part) => part && part.type === 'text' && typeof part.text === 'string')
                    : null;
                if (firstText && firstText.text) {
                    appendCodexLogEntry('user', firstText.text, { meta: 'you', itemId: item.id || '' });
                }
                return;
            }
            if (item.type === 'agentMessage') {
                appendCodexLogEntry('assistant', item.text || '', {
                    meta: item.phase || 'assistant',
                    itemId: item.id || ''
                });
            }
            applyCodexRuntimeSnapshotItem(item);
        });
    });
    codexLog.scrollTop = codexLog.scrollHeight;
    updateCodexThreadLabel();
}

function handleCodexNotification(method, params) {
    if (method === 'thread/started') {
        const threadId = params && params.thread ? params.thread.id : '';
        if (threadId) {
            finalizeFreshCodexThreadUiReset();
            codexState.threadId = threadId;
            codexState.unmaterializedThreadId = threadId;
            codexState.pendingFreshThread = false;
            codexState.lastCodexThreadId = threadId;
            updateCodexThreadLabel();
            refreshCodexThreadList({ force: true, silent: true });
        }
        clearCodexRuntimePanels();
        clearCodexAlerts();
        clearCodexErrorNotice();
        setCodexStatus('idle', 'thread ready');
        return;
    }

    if (method === 'thread/status/changed') {
        const statusType = params && params.status ? params.status.type : '';
        if (statusType === 'active') {
            clearCodexErrorNotice();
            setCodexStatus('running');
        } else if (statusType === 'idle') {
            setCodexStatus('idle');
        }
        return;
    }

    if (method === 'thread/name/updated') {
        const threadId = params && typeof params.threadId === 'string'
            ? params.threadId.trim()
            : (params && params.thread && typeof params.thread.id === 'string' ? params.thread.id.trim() : '');
        const title = resolveCodexThreadTitle(params) || (params && params.thread ? resolveCodexThreadTitle(params.thread) : '');
        if (threadId) {
            updateCodexHistoryThreadTitle(threadId, title);
            updateCodexThreadLabel();
        }
        return;
    }

    if (method === 'thread/compacted') {
        codexState.compactSubmitting = false;
        clearCodexErrorNotice();
        setCodexCompactStatus(t('codex.compact.alreadyDone'), 'success');
        appendCodexLogEntry('system', buildCodexCompactedMessage(params), { meta: 'compact' });
        refreshCodexThreadSnapshot({ force: true });
        refreshCodexThreadList({ force: true, silent: true });
        return;
    }

    if (method === 'turn/started') {
        const turn = params && params.turn ? params.turn : null;
        finalizeFreshCodexThreadUiReset();
        codexState.currentTurnId = turn && turn.id ? turn.id : '';
        if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
            codexState.unmaterializedThreadId = '';
        }
        codexState.pendingFreshThread = false;
        clearCodexRuntimePanels();
        clearCodexAlerts();
        clearCodexErrorNotice();
        setCodexStatus('running', 'in progress');
        renderCodexPlanWorkflow();
        return;
    }

    if (method === 'turn/completed') {
        codexState.currentTurnId = '';
        if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
            codexState.unmaterializedThreadId = '';
        }
        codexState.pendingFreshThread = false;
        setCodexStatus('idle');
        if (codexState.planWorkflow.phase === 'planning' || codexState.planWorkflow.phase === 'awaiting_user_input') {
            finalizePlanWorkflowForConfirmation();
        } else if (codexState.planWorkflow.phase === 'executing_confirmed_plan') {
            setPlanWorkflowState(buildEmptyPlanWorkflowState());
        }
        refreshCodexThreadSnapshot({ force: true });
        return;
    }

    if (method === 'item/started') {
        const item = params && params.item ? params.item : null;
        if (!item || item.type !== 'agentMessage') return;
        codexState.streamingItemId = item.id || '';
        appendCodexLogEntry('assistant', item.text || '', {
            itemId: item.id || '',
            meta: item.phase || 'assistant'
        });
        return;
    }

    if (method === 'item/agentMessage/delta') {
        const itemId = params ? params.itemId : '';
        const delta = params ? params.delta : '';
        if ((codexState.planWorkflow.phase === 'planning' || codexState.planWorkflow.phase === 'awaiting_user_input') && delta) {
            updatePlanWorkflowText(`${getPlanWorkflowDisplayText()}${delta}`, { preserveWhitespace: true });
        }
        upsertStreamingAssistantMessage(itemId || codexState.streamingItemId, delta || '', 'assistant');
        return;
    }

    if (method === 'item/completed') {
        const item = params && params.item ? params.item : null;
        if (!item || item.type !== 'agentMessage') return;
        let entry = getCodexEntryByItemId(item.id || '');
        if (!entry) {
            entry = appendCodexLogEntry('assistant', item.text || '', {
                itemId: item.id || '',
                meta: item.phase || 'assistant'
            });
            return;
        }
        const contentNode = entry.querySelector('.content');
        if (contentNode && typeof item.text === 'string') {
            contentNode.textContent = item.text;
        }
        if (codexState.planWorkflow.phase === 'planning' || codexState.planWorkflow.phase === 'awaiting_user_input') {
            updatePlanWorkflowText(item.text || '');
        }
        return;
    }

    if (method === 'thread/tokenUsage/updated') {
        console.info('[JS][tokenUsage][notification]', JSON.stringify(params || null));
        applyCodexTokenUsage(params || {});
        return;
    }

    if (method === 'turn/plan/updated') {
        const planText = params && params.plan ? params.plan.text || '' : '';
        if (planText) {
            updatePlanWorkflowText(planText);
            setCodexLogEntryText('assistant', params && params.plan ? params.plan.id || '' : '', planText, {
                meta: 'plan'
            });
        }
        return;
    }

    if (method === 'item/plan/delta') {
        const itemId = params ? params.itemId || params.planId : '';
        const delta = params ? params.delta || '' : '';
        if (delta) {
            updatePlanWorkflowText(`${getPlanWorkflowDisplayText()}${delta}`, { preserveWhitespace: true });
            upsertStreamingAssistantMessage(itemId || codexState.streamingItemId, delta, 'plan');
        }
        return;
    }

    if (method === 'account/rateLimits/updated') {
        applyCodexRateLimit(params || {});
        return;
    }

    if (method === 'configWarning' || method === 'deprecationNotice') {
        applyCodexRuntimeUpdate(method, params || {});
        appendCodexLogEntry('system', codexState.runtimeWarning || t('codex.log.warningReceived'), {
            meta: method === 'configWarning' ? 'config' : 'deprecation'
        });
        return;
    }

    if (method === 'error') {
        const errorPayload = params && params.error && typeof params.error === 'object'
            ? params.error
            : {};
        const resolved = resolveCodexErrorMessage(
            errorPayload.code || (params && params.code),
            errorPayload.message || (params && params.message)
        );
        if (codexState.pendingFreshThread === true && codexState.pendingFreshThreadUiSnapshot) {
            rollbackFreshCodexThreadUiReset(resolved);
            return;
        }
        appendCodexLogEntry('error', resolved, { meta: (params && params.code) || 'event' });
        setCodexErrorNotice(resolved);
        setCodexStatus('error', 'event error');
        if (codexState.planWorkflow.phase !== 'idle') {
            setPlanWorkflowState(buildEmptyPlanWorkflowState());
        }
        codexState.runtimeWarning = resolved;
        codexState.runtimeWarningTone = 'error';
        renderCodexRuntimePanel();
        return;
    }

    if (applyCodexRuntimeUpdate(method, params || {})) {
        return;
    }
}

function showStatus(message) {
    if (!message) return;
    statusOverlay.textContent = message;
    statusOverlay.style.display = 'block';
}

function hideStatus() {
    statusOverlay.style.display = 'none';
}

function normalizeServerUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let normalized = rawUrl.trim();
    if (!normalized) return '';
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `http://${normalized}`;
    }
    while (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

function buildWsUrl(baseUrl, targetSessionId) {
    const normalizedBaseUrl = normalizeServerUrl(baseUrl);
    if (!normalizedBaseUrl) {
        throw new Error('Missing base URL');
    }

    let parsed;
    try {
        parsed = new URL(normalizedBaseUrl);
    } catch (error) {
        throw new Error('Invalid base URL');
    }

    if (parsed.protocol === 'http:') {
        parsed.protocol = 'ws:';
    } else if (parsed.protocol === 'https:') {
        parsed.protocol = 'wss:';
    } else {
        throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
    }

    // For reverse-proxy prefix routes like /wsl or /win, avoid websocket 301 redirects.
    if (parsed.pathname && parsed.pathname !== '/' && !parsed.pathname.endsWith('/')) {
        parsed.pathname = `${parsed.pathname}/`;
    }

    if (targetSessionId && String(targetSessionId).trim()) {
        parsed.searchParams.set('sessionId', String(targetSessionId).trim());
    } else {
        parsed.searchParams.delete('sessionId');
    }
    return parsed.toString();
}

function buildApiUrl(baseUrl, apiPath) {
    const normalizedBaseUrl = normalizeServerUrl(baseUrl);
    if (!normalizedBaseUrl) {
        throw new Error('Missing base URL');
    }

    const parsed = new URL(normalizedBaseUrl);
    const pathname = parsed.pathname && parsed.pathname !== '/'
        ? (parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`)
        : '/';
    const relativePath = typeof apiPath === 'string' ? apiPath.replace(/^\/+/, '') : '';
    return new URL(`${pathname}${relativePath}`, `${parsed.protocol}//${parsed.host}`).toString();
}

function buildJsonFetchOptions(method, body) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (authHeader) {
        headers.Authorization = authHeader;
    }
    return {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    };
}

function resolveHistoryEnabled(config) {
    if (typeof config.historyEnabled === 'boolean') {
        return config.historyEnabled;
    }
    return true;
}

function getHistoryStorageKey(id) {
    const keySuffix = (id && typeof id === 'string' && id.trim()) ? id.trim() : 'default';
    return `${HISTORY_STORAGE_PREFIX}${keySuffix}`;
}

function persistHistoryState() {
    if (!historyEnabled || !activeHistoryKey) return;
    try {
        sessionStorage.setItem(activeHistoryKey, JSON.stringify(historyState));
    } catch (err) {
        console.warn('Failed to persist terminal history', err);
    }
}

function loadHistoryState(sessionKey, replay) {
    activeHistoryKey = sessionKey;
    historyState = { lines: [], tail: '' };
    if (!historyEnabled) return;
    try {
        const raw = sessionStorage.getItem(sessionKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.lines)) return;
        historyState.lines = parsed.lines.slice(-HISTORY_MAX_LINES);
        historyState.tail = typeof parsed.tail === 'string' ? parsed.tail : '';
        if (replay) {
            const replayText = `${historyState.lines.join('')}${historyState.tail}`;
            if (replayText) {
                term.write(replayText);
            }
        }
    } catch (err) {
        console.warn('Failed to load terminal history', err);
    }
}

function appendHistoryChunk(chunk) {
    if (!historyEnabled || typeof chunk !== 'string' || !chunk) return;
    const merged = `${historyState.tail}${chunk}`;
    const parts = merged.split('\n');
    historyState.tail = parts.pop() || '';
    parts.forEach((line) => {
        historyState.lines.push(`${line}\n`);
    });
    if (historyState.lines.length > HISTORY_MAX_LINES) {
        historyState.lines = historyState.lines.slice(-HISTORY_MAX_LINES);
    }
    persistHistoryState();
}

function resetTerminalView() {
    term.reset();
    loadHistoryState(getHistoryStorageKey(sessionId), true);
}

function startClientHeartbeat() {
    stopClientHeartbeat();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    clientHeartbeatTimer = setInterval(function () {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'client_heartbeat' }));
        }
    }, CLIENT_HEARTBEAT_INTERVAL_MS);
}

function stopClientHeartbeat() {
    if (clientHeartbeatTimer) {
        clearInterval(clientHeartbeatTimer);
        clientHeartbeatTimer = null;
    }
}

function closeSocketSilently() {
    stopClientHeartbeat();
    if (!ws) return;
    ws.onclose = null;
    ws.close();
    ws = null;
}

function clearPersistedSessionBinding() {
    sessionId = '';
    if (runtimeConfig && typeof runtimeConfig === 'object') {
        runtimeConfig = Object.assign({}, runtimeConfig, { sessionId: '' });
    }
    if (typeof window !== 'undefined' && window.__TERMLINK_CONFIG__ && typeof window.__TERMLINK_CONFIG__ === 'object') {
        window.__TERMLINK_CONFIG__ = Object.assign({}, window.__TERMLINK_CONFIG__, { sessionId: '' });
    }
    loadHistoryState(getHistoryStorageKey(sessionId), true);
}

function recoverFromMissingSession(event) {
    if (!event || event.code !== 4404 || !sessionId) {
        return false;
    }
    clearTimeout(reconnectTimer);
    retryCount = 0;
    reconnectInterval = 1000;
    clearPersistedSessionBinding();
    showStatus(t('codex.status.sessionExpired'));
    notifyNativeConnectionState('reconnecting', 'stale session; requesting fresh session');
    reconnectTimer = setTimeout(function () {
        connect();
    }, 0);
    return true;
}

function applyRuntimeConfig(config, forceReconnect) {
    if (!config || typeof config !== 'object') return;
    hasReceivedRuntimeConfig = true;
    runtimeConfig = config;
    applySessionModeLayout();

    const previousServerUrl = serverUrl;
    const previousSessionId = sessionId;
    const previousHistoryEnabled = historyEnabled;
    const previousCwd = getConfiguredCodexCwd();

    serverUrl = normalizeServerUrl(config.serverUrl || '');
    sessionId = typeof config.sessionId === 'string' ? config.sessionId.trim() : '';
    authHeader = typeof config.authHeader === 'string' ? config.authHeader : '';
    historyEnabled = resolveHistoryEnabled(config);

    if (previousHistoryEnabled !== historyEnabled || previousSessionId !== sessionId) {
        loadHistoryState(getHistoryStorageKey(sessionId), true);
    }

    const serverChanged = serverUrl !== previousServerUrl;
    const sessionChanged = sessionId !== previousSessionId;
    const cwdChanged = getConfiguredCodexCwd() !== previousCwd;
    if (ws && ws.readyState === WebSocket.OPEN && cwdChanged) {
        const nextCwd = getConfiguredCodexCwd();
        if (nextCwd) {
            sendCodexEnvelope({ type: 'codex_set_cwd', cwd: nextCwd });
        }
    }
    if (forceReconnect && (serverChanged || sessionChanged)) {
        clearTimeout(reconnectTimer);
        isConnecting = false;
        retryCount = 0;
        closeSocketSilently();
        resetTerminalView();
        connect();
    }
}

function sendMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function sendResize() {
    fitAddon.fit();
    const dims = fitAddon.proposeDimensions();
    if (dims) {
        sendMessage({ type: 'resize', cols: dims.cols, rows: dims.rows });
    }
}

function focusTerminal() {
    term.focus();
    setTimeout(() => term.focus(), 20);
}

const shortcutInput = (window.TerminalShortcutInput && typeof window.TerminalShortcutInput.createModifierState === 'function')
    ? window.TerminalShortcutInput
    : null;
if (!shortcutInput) {
    console.warn('TerminalShortcutInput is not available; Ctrl/Alt modifier mode disabled.');
}
const modifierState = shortcutInput ? shortcutInput.createModifierState() : null;
let modifierButtons = { Ctrl: [], Alt: [] };

function mapVirtualKeyFallback(key) {
    switch (key) {
        case 'Enter': return '\r';
        case 'Newline': return '\n';
        case 'Tab': return '\t';
        case 'Esc': return '\x1b';
        case 'Home': return '\x1b[H';
        case 'End': return '\x1b[F';
        case 'PgUp': return '\x1b[5~';
        case 'PgDn': return '\x1b[6~';
        case 'Up': return '\x1b[A';
        case 'Down': return '\x1b[B';
        case 'Right': return '\x1b[C';
        case 'Left': return '\x1b[D';
        case 'Ctrl-C': return '\x03';
        default: return key || '';
    }
}

function refreshModifierButtons() {
    modifierButtons = {
        Ctrl: Array.from(document.querySelectorAll('.key[data-key="Ctrl"]')),
        Alt: Array.from(document.querySelectorAll('.key[data-key="Alt"]'))
    };
}

function hasActiveModifier() {
    if (!shortcutInput || !modifierState) return false;
    return ['Ctrl', 'Alt'].some((modifier) => (
        shortcutInput.getModifierMode(modifierState, modifier) !== 'off'
    ));
}

function renderModifierButtonState() {
    if (!shortcutInput || !modifierState) return;
    ['Ctrl', 'Alt'].forEach((modifier) => {
        const mode = shortcutInput.getModifierMode(modifierState, modifier);
        const buttons = modifierButtons[modifier] || [];
        buttons.forEach((button) => {
            button.classList.toggle('mod-armed', mode === 'armed');
            button.classList.toggle('mod-locked', mode === 'locked');
        });
    });
}

function consumeOneShotModifiers(usedModifiers) {
    if (!shortcutInput || !modifierState) return;
    const changed = shortcutInput.consumeOneShot(modifierState, usedModifiers);
    if (changed) {
        renderModifierButtonState();
    }
}

function resolveInputWithModifiers(key) {
    if (!shortcutInput || !modifierState) {
        return mapVirtualKeyFallback(key);
    }
    const resolved = shortcutInput.resolveVirtualInput(modifierState, key);
    consumeOneShotModifiers(resolved.usedModifiers);
    return resolved.payload || '';
}

function resolveTypedInputWithModifiers(data) {
    if (!data) return '';
    if (!shortcutInput || !modifierState || !hasActiveModifier()) {
        return data;
    }
    const resolved = shortcutInput.resolveVirtualInput(modifierState, data[0]);
    consumeOneShotModifiers(resolved.usedModifiers);
    return `${resolved.payload || ''}${data.slice(1)}`;
}

function handleLocalViewportScrollKey(key) {
    if (!term || typeof key !== 'string') return false;

    if (key === 'PgUp') {
        if (typeof term.scrollLines === 'function') {
            term.scrollLines(-15);
        }
        return true;
    }
    if (key === 'PgDn') {
        if (typeof term.scrollLines === 'function') {
            term.scrollLines(15);
        }
        return true;
    }
    if (key === 'Home') {
        if (typeof term.scrollToTop === 'function') {
            term.scrollToTop();
        } else if (typeof term.scrollLines === 'function') {
            term.scrollLines(-100000);
        }
        return true;
    }
    if (key === 'End') {
        if (typeof term.scrollToBottom === 'function') {
            term.scrollToBottom();
        } else if (typeof term.scrollLines === 'function') {
            term.scrollLines(100000);
        }
        return true;
    }

    return false;
}

function connect() {
    if (isConnecting) return;

    if (!serverUrl) {
        // During startup, native config injection may not have arrived yet.
        // Avoid surfacing a false error before first config delivery.
        if (!hasReceivedRuntimeConfig) {
            showStatus(t('codex.status.waitingConfig'));
            return;
        }
        notifyNativeConnectionState('error', 'No injected server URL');
        notifyNativeError('NO_ACTIVE_SERVER', 'No injected server URL');
        showStatus(t('codex.status.missingServerUrl'));
        return;
    }

    let wsUrl = '';
    let normalizedBaseUrl = '';
    try {
        normalizedBaseUrl = normalizeServerUrl(serverUrl);
        wsUrl = buildWsUrl(serverUrl, sessionId);
    } catch (error) {
        const detail = error && error.message ? error.message : 'Invalid websocket URL';
        notifyNativeConnectionState('error', detail);
        notifyNativeError('INVALID_WS_URL', `${serverUrl} (${detail})`);
        showStatus(detail);
        return;
    }

    isConnecting = true;
    const transportLabel = wsUrl.startsWith('wss://') ? 'wss' : 'ws';
    showStatus(t('codex.status.connecting', { transport: transportLabel }));
    notifyNativeConnectionState('connecting', `Connecting via ${transportLabel}`);

    // define websocket setup logic
    const beginWebSocket = function (finalWsUrl) {
        try {
            console.log('[JS] Opening WebSocket to:', finalWsUrl);
            ws = new WebSocket(finalWsUrl);
        } catch (error) {
            isConnecting = false;
            notifyNativeConnectionState('error', 'WebSocket construction failed');
            notifyNativeError('WS_CONSTRUCTION_ERROR', error.message || 'unknown');
            showStatus(t('codex.status.wsCreateFailed'));
            return;
        }

        ws.onopen = function () {
            console.log('[JS] WebSocket OPEN');
            isConnecting = false;
            retryCount = 0;
            reconnectInterval = 1000;
            rejectPendingCodexBridgeRequests(
                'Codex bridge restarted before request completion.',
                'CODEX_BRIDGE_RESTARTED'
            );
            resetCodexBootstrapState();
            hideStatus();
            sendResize();
            startClientHeartbeat();
            notifyNativeConnectionState('connected', `Connected via ${transportLabel}`);
            if (codexState.status !== 'running') {
                setCodexStatus('idle');
            }
            const configuredCwd = getConfiguredCodexCwd();
            if (configuredCwd) {
                sendCodexEnvelope({ type: 'codex_set_cwd', cwd: configuredCwd });
            }
        };

        ws.onmessage = function (event) {
            try {
                const envelope = JSON.parse(event.data);
                if (envelope.type === 'output') {
                    const output = typeof envelope.data === 'string'
                        ? envelope.data
                        : String(envelope.data ?? '');
                    term.write(output);
                    appendHistoryChunk(output);
                    return;
                }
                if (envelope.type === 'session_info') {
                    const nextSessionId = typeof envelope.sessionId === 'string'
                        ? envelope.sessionId.trim()
                        : '';
                    if (nextSessionId && nextSessionId !== sessionId) {
                        sessionId = nextSessionId;
                        loadHistoryState(getHistoryStorageKey(sessionId), true);
                    }
                    codexState.sessionMode = typeof envelope.sessionMode === 'string' ? envelope.sessionMode.trim() : '';
                    codexState.lastCodexThreadId = typeof envelope.lastCodexThreadId === 'string'
                        ? envelope.lastCodexThreadId.trim()
                        : '';
                    const settingsApi = getCodexSettingsViewApi();
                    codexState.storedCodexConfig = settingsApi && typeof settingsApi.normalizeStoredCodexConfig === 'function'
                        ? settingsApi.normalizeStoredCodexConfig(envelope.codexConfig)
                        : null;
                    codexState.serverNextTurnConfigBase = null;
                    codexState.toolsPanelFocus = getDefaultCodexToolsPanelFocus();
                    codexState.compactSubmitting = false;
                    codexState.compactStatusText = '';
                    codexState.compactStatusTone = '';
                    codexState.secondaryPanel = 'none';
                    codexState.currentThreadTitle = '';
                    codexState.initialSessionInfoReceived = true;
                    syncNextTurnEffectiveCodexConfig();
                    applySessionModeLayout();
                    renderCodexHeaderSummary();
                    renderCodexSecondaryNav();
                    renderCodexQuickControls();
                    renderCodexComposerState();
                    renderCodexImageInputs();
                    renderCodexSecondaryPanels();
                    notifyNativeSessionInfo(nextSessionId, envelope.name || '', envelope.privilegeLevel || '');
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
                    maybeLoadCodexSkills();
                    maybeAutoRefreshCodexRateLimits();
                    return;
                }
                if (envelope.type === 'codex_capabilities') {
                    codexState.capabilities = normalizeCodexCapabilities(envelope.capabilities);
                    console.log('[JS][capabilities] Received:', JSON.stringify(codexState.capabilities));
                    refreshCodexSlashRegistry();
                    codexState.toolsPanelFocus = getDefaultCodexToolsPanelFocus();
                    codexState.compactSubmitting = false;
                    codexState.compactStatusText = '';
                    codexState.compactStatusTone = '';
                    codexState.secondaryPanel = 'none';
                    codexState.initialCapabilitiesReceived = true;
                    renderCodexHeaderSummary();
                    renderCodexSecondaryNav();
                    renderCodexImageInputs();
                    renderCodexSlashMenu();
                    renderCodexSecondaryPanels();
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
                    maybeLoadCodexSkills();
                    maybeAutoRefreshCodexRateLimits();
                    return;
                }
                if (envelope.type === 'codex_state') {
                    if (Object.prototype.hasOwnProperty.call(envelope, 'tokenUsage')) {
                        console.info('[JS][tokenUsage][codex_state]', JSON.stringify(envelope.tokenUsage || null));
                    }
                    const previousThreadId = codexState.threadId;
                    codexState.threadId = envelope.threadId || '';
                    if (!codexState.threadId) {
                        codexState.currentThreadTitle = '';
                        codexState.lastSnapshotThreadId = '';
                        codexState.unmaterializedThreadId = '';
                        codexState.pendingFreshThread = false;
                    } else {
                        const currentEntry = codexState.historyThreads.find((entry) => entry.id === codexState.threadId);
                        if (currentEntry && currentEntry.title) {
                            codexState.currentThreadTitle = currentEntry.title;
                        } else if (codexState.threadId !== previousThreadId) {
                            codexState.currentThreadTitle = getKnownCodexThreadTitle(codexState.threadId);
                        }
                    }
                    codexState.currentTurnId = envelope.currentTurnId || '';
                    codexState.cwd = typeof envelope.cwd === 'string' ? envelope.cwd : '';
                    codexState.approvalPending = envelope.approvalPending === true;
                    codexState.pendingServerRequestCount = Number.isFinite(envelope.pendingServerRequestCount)
                        ? envelope.pendingServerRequestCount
                        : 0;
                    reconcileCodexRequestStatesWithServerState(
                        Array.isArray(envelope.pendingServerRequests) ? envelope.pendingServerRequests : []
                    );
                    if (Object.prototype.hasOwnProperty.call(envelope, 'tokenUsage')) {
                        applyCodexTokenUsage(envelope.tokenUsage);
                    }
                    if (Object.prototype.hasOwnProperty.call(envelope, 'rateLimitState')) {
                        applyCodexRateLimit(envelope.rateLimitState);
                    }
                    if (Object.prototype.hasOwnProperty.call(envelope, 'interactionState')) {
                        codexState.interactionState = normalizeCodexInteractionState(envelope.interactionState);
                    }
                    if (Object.prototype.hasOwnProperty.call(envelope, 'nextTurnEffectiveCodexConfig')) {
                        codexState.serverNextTurnConfigBase = normalizeEffectiveCodexConfig(envelope.nextTurnEffectiveCodexConfig);
                    } else {
                        codexState.serverNextTurnConfigBase = null;
                    }
                    codexState.nextTurnEffectiveCodexConfig = buildLocalNextTurnEffectiveCodexConfig();
                    if (codexState.threadId) {
                        codexState.lastCodexThreadId = codexState.threadId;
                    }
                    if (codexState.currentTurnId && codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
                        codexState.unmaterializedThreadId = '';
                    }
                    if (codexState.currentTurnId) {
                        codexState.pendingFreshThread = false;
                    }
                    codexState.initialCodexStateReceived = true;
                    updateCodexThreadLabel();
                    setCodexStatus(envelope.status || 'idle');
                    if (codexState.threadId && codexState.threadId !== previousThreadId) {
                        clearCodexRuntimePanels();
                        refreshCodexThreadList({ force: true, silent: true });
                        refreshCodexThreadSnapshot({ threadId: codexState.threadId, force: true });
                    }
                    renderCodexComposerState();
                    renderCodexQuickControls();
                    maybeBootstrapCodexSession();
                    maybeAutoRefreshCodexRateLimits();
                    return;
                }
                if (envelope.type === 'codex_thread') {
                    finalizeFreshCodexThreadUiReset();
                    codexState.threadId = envelope.threadId || '';
                    codexState.currentThreadTitle = getKnownCodexThreadTitle(codexState.threadId);
                    codexState.currentTurnId = '';
                    codexState.lastSnapshotThreadId = '';
                    codexState.unmaterializedThreadId = codexState.threadId || '';
                    codexState.pendingFreshThread = true;
                    codexState.lastCodexThreadId = codexState.threadId;
                    codexState.fallbackThreadRequested = false;
                    clearCodexErrorNotice();
                    updateCodexThreadLabel();
                    setCodexStatus('idle');
                    refreshCodexThreadList({ force: true, silent: true });
                    refreshCodexThreadSnapshot({ force: true });
                    return;
                }
                if (envelope.type === 'codex_thread_ready') {
                    finalizeFreshCodexThreadUiReset();
                    codexState.threadId = envelope.threadId || codexState.threadId;
                    if (!codexState.currentThreadTitle || codexState.threadId !== codexState.lastSnapshotThreadId) {
                        const currentEntry = codexState.historyThreads.find((entry) => entry.id === codexState.threadId);
                        codexState.currentThreadTitle = currentEntry && currentEntry.title
                            ? currentEntry.title
                            : getKnownCodexThreadTitle(codexState.threadId);
                    }
                    codexState.lastSnapshotThreadId = '';
                    codexState.unmaterializedThreadId = codexState.threadId || '';
                    codexState.pendingFreshThread = true;
                    codexState.lastCodexThreadId = codexState.threadId;
                    codexState.fallbackThreadRequested = false;
                    clearCodexErrorNotice();
                    updateCodexThreadLabel();
                    setCodexStatus('idle', 'thread ready');
                    refreshCodexThreadList({ force: true, silent: true });
                    refreshCodexThreadSnapshot({ force: true });
                    return;
                }
                if (envelope.type === 'codex_turn_ack') {
                    finalizeFreshCodexThreadUiReset();
                    const turn = envelope.turn || null;
                    codexState.currentTurnId = turn && turn.id ? turn.id : codexState.currentTurnId;
                    finalizePendingTurnStateOnSuccess();
                    clearCodexErrorNotice();
                    setCodexStatus('running', 'turn started');
                    return;
                }
                if (envelope.type === 'codex_interrupt_ack') {
                    appendCodexLogEntry('system', t('codex.codex.interruptSent'), { meta: 'bridge' });
                    return;
                }
                if (envelope.type === 'codex_thread_snapshot') {
                    handleCodexThreadSnapshot(envelope.thread || null);
                    return;
                }
                if (envelope.type === 'codex_notification') {
                    handleCodexNotification(envelope.method, envelope.params || {});
                    return;
                }
                if (envelope.type === 'codex_server_request') {
                    if (envelope.handledBy === 'client') {
                        renderCodexServerRequest(envelope);
                    } else {
                        appendCodexLogEntry(
                            'system',
                            t('codex.codex.autoHandled', { method: envelope.method || 'unknown' }),
                            { meta: 'approval' }
                        );
                    }
                    return;
                }
                if (envelope.type === 'codex_error') {
                    restorePendingTurnStateOnFailure();
                    if (isCodexThreadNotMaterializedError(envelope.code, envelope.message)) {
                        if (codexState.threadId) {
                            codexState.unmaterializedThreadId = codexState.threadId;
                            codexState.pendingFreshThread = true;
                        }
                        clearCodexErrorNotice();
                        setCodexStatus('idle', 'thread ready');
                        return;
                    }
                    const message = resolveCodexErrorMessage(envelope.code, envelope.message || 'Unknown Codex error');
                    if (codexState.pendingFreshThread === true && codexState.pendingFreshThreadUiSnapshot) {
                        rollbackFreshCodexThreadUiReset(message);
                        return;
                    }
                    appendCodexLogEntry('error', message, { meta: envelope.code || 'codex' });
                    setCodexErrorNotice(message);
                    setCodexStatus('error', message);
                    if (codexState.planWorkflow.phase !== 'idle') {
                        setPlanWorkflowState(buildEmptyPlanWorkflowState());
                    }
                    return;
                }
                if (envelope.type === 'codex_response') {
                    let suppressErrorUi = false;
                    if (envelope.requestId) {
                        const pending = codexState.pendingBridgeRequests.get(envelope.requestId);
                        if (pending) {
                            codexState.pendingBridgeRequests.delete(envelope.requestId);
                            suppressErrorUi = pending.suppressErrorUi === true;
                            if (envelope.error) {
                                pending.reject(new Error(envelope.error.message || 'Codex request failed.'));
                            } else {
                                pending.resolve(envelope.result);
                            }
                        }
                    }
                    if (envelope.error && envelope.error.message && suppressErrorUi !== true) {
                        if (isCodexThreadNotMaterializedError(envelope.error.code || envelope.method, envelope.error.message)) {
                            if (codexState.threadId) {
                                codexState.unmaterializedThreadId = codexState.threadId;
                                codexState.pendingFreshThread = true;
                            }
                            clearCodexErrorNotice();
                            setCodexStatus('idle', 'thread ready');
                            return;
                        }
                        const message = resolveCodexErrorMessage(
                            envelope.error.code || envelope.method,
                            envelope.error.message
                        );
                        appendCodexLogEntry('error', message, { meta: envelope.method || 'request' });
                        setCodexErrorNotice(message);
                        setCodexStatus('error', message);
                    }
                }
            } catch (error) {
                notifyNativeError('MESSAGE_PARSE_FAILED', error.message || 'Unknown parsing error');
                console.error('Failed to parse websocket message', error);
            }
        };

        ws.onclose = function (event) {
            console.log('[JS] WebSocket CLOSED:', event.code, event.reason);
            isConnecting = false;
            stopClientHeartbeat();
            rejectPendingCodexBridgeRequests(
                `Codex bridge closed (${event.code}).`,
                'CODEX_BRIDGE_CLOSED'
            );
            resetCodexBootstrapState();
            setCodexStatus('error', 'bridge disconnected');
            if (recoverFromMissingSession(event)) {
                return;
            }
            if (retryCount >= MAX_RETRIES) {
                const detail = `code=${event.code} reason=${event.reason || 'none'}`;
                showStatus(t('codex.status.connectionFailed'));
                notifyNativeConnectionState('error', `Connection closed (${detail})`);
                notifyNativeError('WS_CLOSED', detail);
                return;
            }
            showStatus(t('codex.status.reconnecting'));
            notifyNativeConnectionState('reconnecting', `attempt=${retryCount + 1}`);
            retryCount += 1;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(function () {
                connect();
                reconnectInterval = Math.min(reconnectInterval * 1.5, maxReconnectInterval);
            }, reconnectInterval);
        };

        ws.onerror = function () {
            console.error('[JS] WebSocket ERROR');
            notifyNativeError('WS_ERROR', 'WebSocket transport error');
            setCodexStatus('error', 'bridge transport error');
        };
    };

    // 1. Warmup HTTPS
    // 2. Fetch Ticket (if authHeader exists)
    // 3. Connect Protocol
    warmupHttpsForWs(normalizedBaseUrl)
        .then(function (result) {
            if (result && result.handshakeOk === false) {
                const detail = result.detail || `status=${result.status || 'unknown'}`;
                notifyNativeError('HTTPS_WARMUP_FAILED', detail);
                console.warn('HTTPS warmup failed before websocket connect', detail);
            }

            // Ticket Fetching Logic
            const ticketUrl = normalizedBaseUrl.replace(/\/+$/, '') + '/api/ws-ticket';
            const fetchOpts = {};
            if (authHeader) {
                fetchOpts.headers = { 'Authorization': authHeader };
            }

            console.log('[JS] Fetching WS ticket from:', ticketUrl);
            return fetch(ticketUrl, fetchOpts)
                .then(function (resp) {
                    if (resp.ok) {
                        return resp.json().then(function (json) {
                            if (json && json.ticket) {
                                console.log('[JS] Ticket received');
                                const parsed = new URL(wsUrl);
                                parsed.searchParams.set('ticket', json.ticket);
                                return parsed.toString();
                            }
                            return wsUrl;
                        });
                    }
                    console.warn('[JS] Ticket fetch failed status:', resp.status);
                    return wsUrl;
                })
                .catch(function (err) {
                    console.warn('[JS] Ticket fetch error:', err.message);
                    return wsUrl;
                });
        })
        .then(function (finalUrl) {
            beginWebSocket(finalUrl);
        })
        .catch(function (error) {
            // Fallback if anything in chain fails (though catches above should handle it)
            console.error('[JS] Connect chain error:', error);
            beginWebSocket(wsUrl);
        });
}

function warmupHttpsForWs(normalizedBaseUrl) {
    if (!normalizedBaseUrl) {
        return Promise.resolve({ handshakeOk: true, skipped: true });
    }
    let baseUrl;
    try {
        baseUrl = new URL(normalizedBaseUrl);
    } catch (_) {
        return Promise.resolve({ handshakeOk: true, skipped: true });
    }
    if (baseUrl.protocol !== 'https:') {
        return Promise.resolve({ handshakeOk: true, skipped: true });
    }

    const hostKey = `${baseUrl.protocol}//${baseUrl.host}`;
    if (warmupDoneHosts.has(hostKey)) {
        return Promise.resolve();
    }

    const normalizedPath = baseUrl.pathname && baseUrl.pathname !== '/'
        ? (baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`)
        : '/';
    const probeUrl = `${baseUrl.protocol}//${baseUrl.host}${normalizedPath}api/health`;
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    let timeoutId = null;
    if (controller) {
        timeoutId = setTimeout(() => {
            try {
                controller.abort();
            } catch (_) {
                // ignore
            }
        }, 1500);
    }

    return fetch(probeUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
    }).then((response) => {
        // Any HTTP response means HTTPS/TLS handshake reached the server.
        warmupDoneHosts.add(hostKey);
        return {
            handshakeOk: true,
            status: response.status,
            detail: `GET ${probeUrl} -> ${response.status}`
        };
    }).catch((error) => {
        if (error && error.name === 'AbortError') {
            return {
                handshakeOk: true,
                status: 0,
                detail: `GET ${probeUrl} timed out; continue websocket`
            };
        }
        return {
            handshakeOk: false,
            status: 0,
            detail: `GET ${probeUrl} failed: ${error && error.message ? error.message : 'unknown'}`
        };
    }).finally(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });
}

term.onData((data) => {
    const payload = resolveTypedInputWithModifiers(data);
    if (!payload) return;
    sendMessage({ type: 'input', data: payload });
});

// ── Keyboard / viewport resize handling ─────────────────
window.addEventListener('resize', () => {
    updateViewportLayoutState();
    sendResize();
});

if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', updateViewportLayoutState);
}

window.__onNativeViewportChanged = function () {
    updateViewportLayoutState();
    sendResize();
};

function setQuickToolbarVisible(visible) {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;
    quickToolbarVisible = visible;
    if (visible) {
        toolbar.classList.remove('hidden');
    } else {
        toolbar.classList.add('hidden');
    }
    sendResize();
}

window.__setQuickToolbarVisible = function(visible) {
    setQuickToolbarVisible(!!visible);
};

setQuickToolbarVisible(true);
sendResize();
refreshModifierButtons();
renderModifierButtonState();

document.querySelectorAll('.key').forEach((btn) => {
    const handler = async (event) => {
        if (event.type === 'touchstart') {
            event.preventDefault();
        }

        const key = btn.dataset.key;
        if (!key && btn.id === 'btn-toggle-input') {
            inputOverlay.style.display = 'flex';
            inputBuffer.focus();
            return;
        }

        if (!key && btn.id === 'btn-paste') {
            try {
                const text = await navigator.clipboard.readText();
                if (text && ws && ws.readyState === WebSocket.OPEN) {
                    sendMessage({ type: 'input', data: text });
                }
            } catch (err) {
                notifyNativeError('CLIPBOARD_READ_FAILED', err && err.message ? err.message : 'Clipboard access failed');
            }
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 90);
            focusTerminal();
            return;
        }

        if (key === 'Ctrl' || key === 'Alt') {
            if (shortcutInput && modifierState) {
                shortcutInput.handleModifierTap(modifierState, key, Date.now());
                renderModifierButtonState();
            }
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 90);
            focusTerminal();
            return;
        }

        if (handleLocalViewportScrollKey(key)) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 90);
            focusTerminal();
            return;
        }

        const mapped = resolveInputWithModifiers(key);
        if (mapped && ws && ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'input', data: mapped });
        }

        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 90);
        focusTerminal();
    };

    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('click', handler);
});

if (btnClose) {
    btnClose.addEventListener('click', () => {
        inputOverlay.style.display = 'none';
        focusTerminal();
    });
}
if (btnClear) {
    btnClear.addEventListener('click', () => {
        inputBuffer.value = '';
        inputBuffer.focus();
    });
}
if (btnSend) {
    btnSend.addEventListener('click', () => {
        const text = inputBuffer.value;
        if (text && ws && ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'input', data: `${text}\r` });
        }
        inputBuffer.value = '';
        inputOverlay.style.display = 'none';
        focusTerminal();
    });
}

if (btnCodexToggle) {
    btnCodexToggle.addEventListener('click', () => {
        setCodexPanelCollapsed(!codexState.panelCollapsed);
        sendResize();
    });
}

if (btnCodexSecondaryThreads) {
    btnCodexSecondaryThreads.addEventListener('click', () => {
        toggleCodexSecondaryPanel('threads');
    });
}

if (btnCodexNewThread) {
    btnCodexNewThread.addEventListener('click', () => {
        requestCodexNewThread();
    });
}

if (btnCodexInterrupt) {
    btnCodexInterrupt.addEventListener('click', () => {
        requestCodexInterrupt();
    });
}

if (btnCodexHistoryRefresh) {
    btnCodexHistoryRefresh.addEventListener('click', () => {
        refreshCodexThreadList({ force: true });
    });
}

if (btnCodexSecondaryRuntime) {
    btnCodexSecondaryRuntime.addEventListener('click', () => {
        toggleCodexSecondaryPanel('runtime');
    });
}

if (btnCodexSecondaryTools) {
    btnCodexSecondaryTools.addEventListener('click', () => {
        if (codexState.secondaryPanel === 'tools') {
            toggleCodexSecondaryPanel('tools');
            return;
        }
        openCodexToolsPanel(codexState.toolsPanelFocus || getDefaultCodexToolsPanelFocus());
    });
}

if (btnCodexSecondaryNotices) {
    btnCodexSecondaryNotices.addEventListener('click', () => {
        toggleCodexSecondaryPanel('notices');
    });
}

if (btnCodexCompactConfirm) {
    btnCodexCompactConfirm.addEventListener('click', () => {
        void requestCodexCompactCurrentThread();
    });
}

if (btnCodexImageUrl) {
    btnCodexImageUrl.addEventListener('click', () => {
        promptForCodexImageInput('image');
    });
}

if (btnCodexImageLocal) {
    btnCodexImageLocal.addEventListener('click', () => {
        promptForCodexImageInput('localImage');
    });
}

if (btnCodexImagePromptCancel) {
    btnCodexImagePromptCancel.addEventListener('click', () => {
        cancelCodexImagePrompt();
    });
}

if (btnCodexImagePromptConfirm) {
    btnCodexImagePromptConfirm.addEventListener('click', () => {
        confirmCodexImagePrompt();
    });
}

if (codexImagePromptInput) {
    codexImagePromptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmCodexImagePrompt();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelCodexImagePrompt();
        }
    });
}

if (btnCodexCommandApprovalApprove) {
    btnCodexCommandApprovalApprove.addEventListener('click', () => {
        submitBlockingCommandApprovalDecision(true);
    });
}

if (btnCodexCommandApprovalReject) {
    btnCodexCommandApprovalReject.addEventListener('click', () => {
        submitBlockingCommandApprovalDecision(false);
    });
}

if (codexContextWidget) {
    const blockContextDebugGesture = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const openContextDebugModal = (event) => {
        blockContextDebugGesture(event);
        setCodexContextDebugModalOpen(true);
    };
    codexContextWidget.addEventListener('pointerdown', blockContextDebugGesture);
    codexContextWidget.addEventListener('touchstart', blockContextDebugGesture, { passive: false });
    codexContextWidget.addEventListener('click', openContextDebugModal);
    codexContextWidget.addEventListener('touchend', openContextDebugModal, { passive: false });
    codexContextWidget.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setCodexContextDebugModalOpen(true);
        }
    });
}

document.querySelectorAll('[data-modal-dismiss]').forEach((node) => {
    node.addEventListener('click', () => {
        const target = node.getAttribute('data-modal-dismiss');
        if (target === 'context-debug') {
            setCodexContextDebugModalOpen(false);
        }
    });
});

if (btnCodexSend) {
    btnCodexSend.addEventListener('click', () => {
        if (!codexInput) return;
        const text = codexInput.value;
        if (handleCodexComposerSubmit(text)) {
            codexInput.value = '';
            setSlashMenuState(false, '');
        }
        codexInput.focus();
    });
}

if (codexInput) {
    codexInput.addEventListener('keydown', (event) => {
        if (codexState.fileMentionMenuOpen) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                codexState.activeFileMentionIndex = Math.min(
                    codexState.activeFileMentionIndex + 1,
                    codexState.fileMentionResults.length - 1
                );
                renderCodexFileMentionMenu();
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                codexState.activeFileMentionIndex = Math.max(codexState.activeFileMentionIndex - 1, -1);
                renderCodexFileMentionMenu();
                return;
            }
            if (event.key === 'Enter' && codexState.activeFileMentionIndex >= 0) {
                event.preventDefault();
                const file = codexState.fileMentionResults[codexState.activeFileMentionIndex];
                if (file) handleFileMentionSelect(file);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setFileMentionMenuState(false);
                return;
            }
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const text = codexInput.value;
            if (handleCodexComposerSubmit(text)) {
                codexInput.value = '';
                setSlashMenuState(false, '');
                setFileMentionMenuState(false);
            }
        }
    });
    codexInput.addEventListener('input', () => {
        updateSlashMenuForInputValue();
    });
}

if (codexPlanChip) {
    codexPlanChip.addEventListener('click', () => {
        setPlanMode(false);
    });
}

if (btnCodexPlanExecute) {
    btnCodexPlanExecute.addEventListener('click', () => {
        const executionPrompt = buildConfirmedPlanExecutionPrompt();
        if (!executionPrompt) {
            appendCodexLogEntry('error', t('codex.plan.noExecutable'), { meta: 'plan' });
            return;
        }
        setPlanMode(false);
        setPlanWorkflowState({
            ...codexState.planWorkflow,
            phase: 'executing_confirmed_plan'
        });
        const sent = sendCodexTurn(executionPrompt, {
            clearPlanMode: false,
            collaborationMode: null
        });
        if (!sent) {
            setPlanWorkflowState({
                ...codexState.planWorkflow,
                phase: 'plan_ready_for_confirmation'
            });
        }
    });
}

if (btnCodexPlanContinue) {
    btnCodexPlanContinue.addEventListener('click', () => {
        setPlanMode(true);
        setPlanWorkflowState({
            ...codexState.planWorkflow,
            phase: 'planning',
            latestPlanText: codexState.planWorkflow.confirmedPlanText || codexState.planWorkflow.latestPlanText
        });
        if (codexInput) {
            codexInput.focus();
        }
    });
}

if (btnCodexPlanCancel) {
    btnCodexPlanCancel.addEventListener('click', () => {
        cancelPlanWorkflow();
    });
}

if (btnCodexPlanExpand) {
    btnCodexPlanExpand.addEventListener('click', () => {
        if (!codexPlanWorkflowBody) return;
        const isExpanded = codexPlanWorkflowBody.classList.toggle('expanded');
        syncPlanExpandButton(isExpanded);
    });
}

if (codexQuickModel) {
    codexQuickModel.addEventListener('focus', () => {
        void maybeLoadCodexModels();
    });
    codexQuickModel.addEventListener('change', () => {
        setNextTurnOverrideValue('model', codexQuickModel.value || null);
        populateCodexReasoningSelect(codexQuickReasoning, {
            defaultLabel: buildReasoningDefaultLabel(),
            forcedValue: '',
            modelId: codexQuickModel.value || resolveReasoningModelId()
        });
        if (codexQuickReasoning && codexQuickReasoning.value) {
            setNextTurnOverrideValue('reasoningEffort', codexQuickReasoning.value);
        } else {
            setNextTurnOverrideValue('reasoningEffort', null);
        }
    });
    codexQuickModel.addEventListener('pointerdown', () => {
        if (codexState.modelCatalog.length === 0) {
            void maybeLoadCodexModels();
        }
    });
}

if (codexQuickReasoning) {
    codexQuickReasoning.addEventListener('change', () => {
        setNextTurnOverrideValue('reasoningEffort', codexQuickReasoning.value || null);
    });
}

if (codexQuickSandbox) {
    codexQuickSandbox.addEventListener('change', () => {
        setNextTurnOverrideValue('sandbox', codexQuickSandbox.value || null);
    });
}

if (btnCodexQuickClear) {
    btnCodexQuickClear.addEventListener('click', () => {
        clearNextTurnOverrides();
    });
}

if (btnCodexSlashTrigger) {
    btnCodexSlashTrigger.addEventListener('click', () => {
        // 如果 imageInput capability 启用，直接选择本地图片
        if (codexState.capabilities.imageInput === true) {
            promptForCodexImageInput('localImage');
            return;
        }
        // 否则打开 slash 菜单（输入 "/"）
        if (!codexInput) return;
        if (!codexInput.value.trim()) {
            codexInput.value = '/';
        }
        codexInput.focus();
        updateSlashMenuForInputValue();
    });
}

const isTouchDevice = (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
);
if (terminalContainer && isTouchDevice) {
    let lastTapAt = 0;
    let suppressNextClickFocus = false;
    let suppressFocusUntil = 0;
    let activeTouchId = null;
    let touchStartY = 0;
    let lastTouchY = 0;
    let draggedSinceTouchStart = false;
    const DRAG_THRESHOLD_PX = 6;

    const closeSoftKeyboard = () => {
        const activeEl = document.activeElement;
        const termTextarea = term && term.textarea;

        if (termTextarea) {
            try {
                termTextarea.blur();
                const prevReadOnly = termTextarea.readOnly;
                termTextarea.readOnly = true;
                setTimeout(() => {
                    termTextarea.readOnly = prevReadOnly;
                }, 120);
            } catch (_) {
                // no-op
            }
        }

        term.blur();
        if (activeEl && typeof activeEl.blur === 'function') {
            activeEl.blur();
        }

        const currentActiveEl = document.activeElement;
        if (currentActiveEl && typeof currentActiveEl.blur === 'function') {
            currentActiveEl.blur();
        }

        callNativeBridge('requestHideKeyboard', []);
    };

    const getViewport = () => terminalContainer.querySelector('.xterm-viewport');
    const touchListenerCapture = { capture: true };
    const passiveTouchStartOptions = { passive: true, capture: true };
    const activeTouchOptions = { passive: false, capture: true };

    const resolveTrackedTouch = (touchList) => {
        if (!touchList || activeTouchId === null) return null;
        for (let i = 0; i < touchList.length; i += 1) {
            if (touchList[i].identifier === activeTouchId) {
                return touchList[i];
            }
        }
        return null;
    };

    const isViewportScrollable = (viewport) => (
        !!viewport && viewport.scrollHeight > viewport.clientHeight + 1
    );

    terminalContainer.addEventListener('touchstart', (e) => {
        const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
        if (!touch) return;
        activeTouchId = touch.identifier;
        touchStartY = touch.clientY;
        lastTouchY = touch.clientY;
        draggedSinceTouchStart = false;
    }, passiveTouchStartOptions);

    terminalContainer.addEventListener('touchmove', (e) => {
        if (activeTouchId === null) return;
        const touch = resolveTrackedTouch(e.touches) || resolveTrackedTouch(e.changedTouches);
        if (!touch) return;

        const viewport = getViewport();
        if (!isViewportScrollable(viewport)) return;

        const deltaYFromStart = touch.clientY - touchStartY;
        if (!draggedSinceTouchStart && Math.abs(deltaYFromStart) >= DRAG_THRESHOLD_PX) {
            draggedSinceTouchStart = true;
        }
        if (!draggedSinceTouchStart) return;

        const deltaY = touch.clientY - lastTouchY;
        if (deltaY === 0) return;

        e.preventDefault();
        e.stopPropagation();
        viewport.scrollTop -= deltaY;
        lastTouchY = touch.clientY;
        suppressNextClickFocus = true;
        suppressFocusUntil = Date.now() + 280;
    }, activeTouchOptions);

    terminalContainer.addEventListener('touchend', (e) => {
        activeTouchId = null;
        if (draggedSinceTouchStart) {
            e.preventDefault();
            e.stopPropagation();
            draggedSinceTouchStart = false;
            suppressNextClickFocus = true;
            suppressFocusUntil = Date.now() + 280;
            return;
        }

        const now = Date.now();
        if (now - lastTapAt < 450) {
            e.preventDefault();
            e.stopPropagation();
            closeSoftKeyboard();
            suppressNextClickFocus = true;
            suppressFocusUntil = now + 420;
            lastTapAt = 0;
            return;
        }
        lastTapAt = now;
    }, activeTouchOptions);

    terminalContainer.addEventListener('touchcancel', () => {
        activeTouchId = null;
        draggedSinceTouchStart = false;
    }, passiveTouchStartOptions);

    terminalContainer.addEventListener('dblclick', () => {
        const now = Date.now();
        closeSoftKeyboard();
        suppressNextClickFocus = true;
        suppressFocusUntil = now + 420;
    }, touchListenerCapture);

    terminalContainer.addEventListener('click', () => {
        const now = Date.now();
        const termTextarea = term && term.textarea;
        if (!termTextarea) return;
        if (suppressNextClickFocus) {
            suppressNextClickFocus = false;
            return;
        }
        if (now < suppressFocusUntil) {
            return;
        }
        term.focus();
    }, touchListenerCapture);
} else if (terminalContainer) {
    terminalContainer.addEventListener('click', () => term.focus());
}

window.__applyTerminalConfig = function (config) {
    if (!config || typeof config !== 'object') return;
    window.__TERMLINK_CONFIG__ = config;
    applyRuntimeConfig(config, true);
};

(async () => {
    await i18n.init();
    i18n.translatePage();

    setCodexStatus('idle');
    updateCodexThreadLabel();
    setCodexPanelCollapsed(false);
    updateViewportLayoutState();
    applySessionModeLayout();
    appendCodexLogEntry('system', t('codex.panel.ready'), { meta: 'bridge' });
    renderCodexSecondaryNav();
    renderCodexSecondaryPanels();
    renderCodexImageInputs();

    applyRuntimeConfig(runtimeConfig, false);
    loadHistoryState(getHistoryStorageKey(sessionId), true);
    if (serverUrl) {
        connect();
    } else {
        showStatus(t('codex.status.waitingConfig'));
    }
})();

// Test hooks - only exposed when explicit test mode is enabled
// Production runtime (browser, Android WebView) will NOT have these hooks
// Integration tests must set window.__TERMLINK_TEST_MODE__ = true before loading this script
const shouldExposeCodexTestHooks = !!(
    typeof window !== 'undefined'
    && window.__TERMLINK_TEST_MODE__ === true
);

if (shouldExposeCodexTestHooks) {
    window.__CODEX_TEST_HOOKS__ = {
        // State
        codexState,
        // Render functions
        renderCodexAlerts,
        renderCodexHeaderSummary,
        renderCodexHistoryList,
        renderCodexImageInputs,
        renderCodexSlashMenu,
        renderCodexRuntimePanel,
        renderCodexSecondaryPanels,
        renderCodexToolsPanel,
        renderCodexContextUsage,
        renderCodexContextDebugModal,
        renderCodexCommandApprovalModal,
        // Helper functions
        handleCodexComposerSubmit,
        handleCodexNotification,
        handleCodexThreadSnapshot,
        renderCodexServerRequest,
        requestCodexNewThread,
        startPlanWorkflow,
        applyCodexRateLimit,
        formatRateLimitSummary,
        storeCodexThreadList,
        applyRuntimeConfig,
        connect,
        setSlashMenuState,
        syncCodexSecondaryPanelState,
        hasCodexNonBlockingNotice,
        getCodexSecondaryEntryAvailability,
        maybeAutoRefreshCodexRateLimits,
        setCodexContextDebugModalOpen,
        submitBlockingCommandApprovalDecision,
        getSessionId: () => sessionId,
        getServerUrl: () => serverUrl,
        getRetryCount: () => retryCount,
        getWebSocket: () => ws,
        // Image input functions
        promptForCodexImageInput,
        confirmCodexImagePrompt,
        setPendingCodexImageInputs,
        // DOM element references
        getCodexAlerts: () => codexAlerts,
        getCodexHistoryPanel: () => codexHistoryPanel,
        getCodexImageInputs: () => codexImageInputs,
        getCodexInput: () => codexInput,
        getCodexLog: () => codexLog,
        getCodexSlashMenu: () => codexSlashMenu,
        getCodexSlashMenuEmpty: () => codexSlashMenuEmpty,
        getCodexSlashMenuList: () => codexSlashMenuList,
        getCodexRuntimePanel: () => codexRuntimePanel,
        getCodexToolsPanel: () => codexToolsPanel,
        getCodexAlertConfig: () => codexAlertConfig,
        getCodexAlertDeprecation: () => codexAlertDeprecation,
        getCodexImagePromptInput: () => codexImagePromptInput,
        getCodexPlanWorkflow: () => codexPlanWorkflow,
        getCodexPlanWorkflowBody: () => codexPlanWorkflowBody,
        getCodexContextWidget: () => codexContextWidget,
        getCodexContextDebugModal: () => codexContextDebugModal,
        getCodexCommandApprovalModal: () => codexCommandApprovalModal,
        renderCodexPlanWorkflow
    };
}
