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
const codexStatusText = document.getElementById('codex-status-text');
const codexThreadIdText = document.getElementById('codex-thread-id');
const codexThreadSummary = document.getElementById('codex-thread-summary');
const codexThreadSummaryMeta = document.getElementById('codex-thread-summary-meta');
const codexThreadSummaryAction = document.getElementById('codex-thread-summary-action');
const codexMetaText = document.getElementById('codex-meta-text');
const codexNoticeText = document.getElementById('codex-notice-text');
const codexSecondaryNav = document.getElementById('codex-secondary-nav');
const codexAlerts = document.getElementById('codex-alerts');
const codexAlertConfig = document.getElementById('codex-alert-config');
const codexAlertConfigText = document.getElementById('codex-alert-config-text');
const codexAlertDeprecation = document.getElementById('codex-alert-deprecation');
const codexAlertDeprecationText = document.getElementById('codex-alert-deprecation-text');
const codexInput = document.getElementById('codex-input');
const btnCodexSend = document.getElementById('btn-codex-send');
const btnCodexToggle = document.getElementById('btn-codex-toggle');
const btnCodexNewThread = document.getElementById('btn-codex-new-thread');
const btnCodexInterrupt = document.getElementById('btn-codex-interrupt');
const btnCodexHistoryRefresh = document.getElementById('btn-codex-history-refresh');
const btnCodexSecondarySettings = document.getElementById('btn-codex-secondary-settings');
const btnCodexSecondaryRuntime = document.getElementById('btn-codex-secondary-runtime');
const btnCodexSecondaryNotices = document.getElementById('btn-codex-secondary-notices');
const codexHistoryPanel = document.getElementById('codex-history-panel');
const codexHistoryList = document.getElementById('codex-history-list');
const codexHistoryEmpty = document.getElementById('codex-history-empty');
const codexSettingsPanel = document.getElementById('codex-settings-panel');
const codexSettingsUseDefaults = document.getElementById('codex-settings-use-defaults');
const codexSettingsModel = document.getElementById('codex-settings-model');
const codexSettingsReasoning = document.getElementById('codex-settings-reasoning');
const codexSettingsPersonality = document.getElementById('codex-settings-personality');
const codexSettingsApproval = document.getElementById('codex-settings-approval');
const codexSettingsSandbox = document.getElementById('codex-settings-sandbox');
const codexSettingsStatus = document.getElementById('codex-settings-status');
const btnCodexModelsRefresh = document.getElementById('btn-codex-models-refresh');
const btnCodexRateLimitRefresh = document.getElementById('btn-codex-rate-limit-refresh');
const btnCodexSettingsReset = document.getElementById('btn-codex-settings-reset');
const btnCodexSettingsSave = document.getElementById('btn-codex-settings-save');
const codexRuntimePanel = document.getElementById('codex-runtime-panel');
const codexRuntimeDiff = document.getElementById('codex-runtime-diff');
const codexRuntimePlan = document.getElementById('codex-runtime-plan');
const codexRuntimeReasoning = document.getElementById('codex-runtime-reasoning');
const codexRuntimeTerminal = document.getElementById('codex-runtime-terminal');
const codexRuntimeWarning = document.getElementById('codex-runtime-warning');
const codexComposerState = document.getElementById('codex-composer-state');
const codexPlanChip = document.getElementById('codex-plan-chip');
const codexOverrideSummary = document.getElementById('codex-override-summary');
const codexQuickModel = document.getElementById('codex-quick-model');
const codexQuickReasoning = document.getElementById('codex-quick-reasoning');
const btnCodexQuickClear = document.getElementById('btn-codex-quick-clear');
const btnCodexSlashTrigger = document.getElementById('btn-codex-slash-trigger');
const codexSlashMenu = document.getElementById('codex-slash-menu');
const codexSlashMenuEmpty = document.getElementById('codex-slash-menu-empty');
const codexSlashMenuList = document.getElementById('codex-slash-menu-list');
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
        alert(`CRITICAL ERROR: Failed to initialize Terminal.\n${e.message}`);
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
    rateLimitSummary: '',
    rateLimitTone: '',
    errorNotice: '',
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
        imageInput: false
    },
    slashRegistry: [],
    slashMenuOpen: false,
    slashMenuQuery: '',
    nextTurnOverrides: {
        model: null,
        reasoningEffort: null
    },
    interactionState: {
        planMode: false,
        activeSkill: null
    },
    serverNextTurnConfigBase: null,
    nextTurnEffectiveCodexConfig: null,
    pendingSubmittedTurnState: null,
    historyThreads: [],
    historyListLoading: false,
    historyActionThreadId: '',
    storedCodexConfig: null,
    modelCatalog: [],
    modelOptions: [],
    modelListRequested: false,
    modelListPromise: null,
    skillCatalog: [],
    skillListRequested: false,
    skillListPromise: null,
    skillsLoading: false,
    settingsLoadingModels: false,
    settingsSaving: false,
    settingsRefreshingRateLimits: false,
    settingsStatusText: '',
    settingsStatusTone: '',
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
    lastTokenUsageLog: '',
    lastRateLimitLog: ''
};

const viewportState = {
    baselineHeight: 0,
    compact: false
};

const REASONING_EFFORT_LABELS = {
    none: '无',
    minimal: '极低',
    low: '低',
    medium: '中',
    high: '高',
    xhigh: '超高'
};

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

function localizeCodexStatusDetail(detail) {
    const normalized = typeof detail === 'string' ? detail.trim().toLowerCase() : '';
    if (!normalized) {
        return '';
    }
    const localized = {
        'starting turn': '开始发送',
        'restoring thread': '恢复线程中',
        'thread ready': '线程已就绪',
        'in progress': '处理中',
        'turn started': '已开始执行',
        'bridge disconnected': '连接已断开',
        'bridge transport error': '桥接传输异常',
        'event error': '事件异常'
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
        notices: isCodex && hasCodexNonBlockingNotice()
    };
}

function syncCodexSecondaryPanelState() {
    const availability = getCodexSecondaryEntryAvailability();
    const panel = typeof codexState.secondaryPanel === 'string' ? codexState.secondaryPanel : 'none';
    const normalized = (
        panel === 'threads'
        || panel === 'settings'
        || panel === 'runtime'
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
    const availability = getCodexSecondaryEntryAvailability();
    const shellApi = getCodexShellViewApi();
    const summary = shellApi && typeof shellApi.buildThreadSummary === 'function'
        ? shellApi.buildThreadSummary({
            threadId: codexState.threadId,
            cwd: codexState.cwd,
            status: codexState.status
        })
        : {
            titleText: codexState.threadId || '当前线程未就绪',
            metaText: codexState.cwd || '即将自动创建新线程',
            empty: !codexState.threadId
        };

    if (codexThreadIdText) {
        codexThreadIdText.textContent = summary.titleText;
    }
    if (codexThreadSummaryMeta) {
        codexThreadSummaryMeta.textContent = summary.metaText;
    }
    if (codexThreadSummaryAction) {
        codexThreadSummaryAction.textContent = availability.threads ? '查看线程' : '线程不可用';
    }
    if (codexThreadSummary) {
        const expanded = syncCodexSecondaryPanelState() === 'threads' && availability.threads === true;
        codexThreadSummary.disabled = availability.threads !== true;
        codexThreadSummary.classList.toggle('empty', summary.empty === true);
        codexThreadSummary.classList.toggle('active', expanded);
        codexThreadSummary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
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
}

function renderCodexSecondaryNav() {
    const availability = getCodexSecondaryEntryAvailability();
    const activePanel = syncCodexSecondaryPanelState();
    const buttons = [
        { element: btnCodexSecondarySettings, key: 'settings' },
        { element: btnCodexSecondaryRuntime, key: 'runtime' },
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
    renderCodexSettingsPanel();
    renderCodexAlerts();
    renderCodexRuntimePanel();
}

function setCodexSecondaryPanel(panelName) {
    const normalized = (
        panelName === 'threads'
        || panelName === 'settings'
        || panelName === 'runtime'
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
        || panelName === 'settings'
        || panelName === 'runtime'
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
}

function updateCodexThreadLabel() {
    renderCodexHeaderSummary();
    renderCodexAuxStatus();
    renderCodexHistoryList();
}

function renderCodexAuxStatus() {
    if (codexMetaText) {
        const parts = [];
        if (codexState.cwd) {
            parts.push(`工作区：${codexState.cwd}`);
        } else if (isCodexOnlyPage) {
            parts.push('工作区：默认目录');
        }
        if (codexState.approvalPending) {
            const count = codexState.pendingServerRequestCount || 0;
            parts.push(count === 1 ? '有 1 个待审批请求' : `有 ${count} 个待审批请求`);
        }
        if (codexState.tokenUsageSummary) {
            parts.push(codexState.tokenUsageSummary);
        }
        if (codexState.rateLimitSummary && codexState.rateLimitTone !== 'warn' && codexState.rateLimitTone !== 'error') {
            parts.push(`额度：${codexState.rateLimitSummary}`);
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
            notice = `额度：${codexState.rateLimitSummary}`;
            tone = codexState.rateLimitTone;
        }
        codexNoticeText.textContent = notice;
        codexNoticeText.classList.toggle('tone-error', tone === 'error');
        codexNoticeText.classList.toggle('tone-warn', tone === 'warn');
    }
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
            status: codexState.status
        })
        : [];

    codexHistoryList.innerHTML = '';

    let emptyText = '';
    if (codexState.historyListLoading) {
        emptyText = '正在加载已保存线程...';
    } else if (entries.length === 0) {
        emptyText = codexState.capabilities.historyList === true
            ? '暂无已保存线程。'
            : '当前服务端不支持线程历史。';
    }

    if (emptyText) {
        codexHistoryEmpty.textContent = emptyText;
        codexHistoryEmpty.classList.remove('hidden');
    } else {
        codexHistoryEmpty.classList.add('hidden');
    }

    entries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'codex-history-item';
        if (entry.active) {
            button.classList.add('active');
        }
        button.disabled = entry.disabled;

        const copy = document.createElement('div');
        copy.className = 'codex-history-copy';

        const name = document.createElement('div');
        name.className = 'codex-history-name';
        name.textContent = entry.title;
        copy.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'codex-history-meta';
        meta.textContent = entry.id;
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
                    Current: '当前',
                    Saved: '上次',
                    Opening: '打开中'
                })[badgeLabel] || badgeLabel;
                badges.appendChild(badge);
            });
            copy.appendChild(badges);
        }

        const action = document.createElement('span');
        action.className = 'codex-history-action';
        action.textContent = entry.active ? '当前' : (entry.pending ? '打开中...' : '打开');

        button.appendChild(copy);
        button.appendChild(action);
        button.addEventListener('click', () => {
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
                    `打开 Codex 线程 ${entry.id} 失败：${error.message || '未知错误'}`,
                    { meta: 'history' }
                );
            });
        });
        codexHistoryList.appendChild(button);
    });
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

function setNextTurnOverrides(nextOverrides) {
    codexState.nextTurnOverrides = normalizeNextTurnOverrides(nextOverrides);
    syncNextTurnEffectiveCodexConfig();
}

function clearNextTurnOverrides() {
    setNextTurnOverrides({ model: null, reasoningEffort: null });
}

function setNextTurnOverrideValue(key, value) {
    setNextTurnOverrides({
        model: key === 'model' ? value : codexState.nextTurnOverrides.model,
        reasoningEffort: key === 'reasoningEffort' ? value : codexState.nextTurnOverrides.reasoningEffort
    });
}

function renderCodexComposerState() {
    if (!codexComposerState) {
        return;
    }
    const planMode = codexState.interactionState.planMode === true;
    const parts = [];
    if (codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnOverrides.model) {
        parts.push(`模型：${codexState.nextTurnEffectiveCodexConfig.model}`);
    }
    if (codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnOverrides.reasoningEffort) {
        parts.push(`推理：${codexState.nextTurnEffectiveCodexConfig.reasoningEffort}`);
    }
    if (codexState.interactionState.activeSkill) {
        parts.push(`技能：${codexState.interactionState.activeSkill}`);
    }
    codexComposerState.hidden = !planMode && parts.length === 0;
    if (codexPlanChip) {
        codexPlanChip.hidden = !planMode;
    }
    if (codexOverrideSummary) {
        codexOverrideSummary.hidden = parts.length === 0;
        codexOverrideSummary.textContent = parts.join(' | ');
    }
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
    if (btnCodexQuickClear) {
        btnCodexQuickClear.disabled = !codexState.nextTurnOverrides.model && !codexState.nextTurnOverrides.reasoningEffort;
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
        option.textContent = `${selectedValue}（自定义）`;
        codexQuickModel.appendChild(option);
    }
    codexQuickModel.value = selectedValue;
}

function buildModelDefaultLabel() {
    if (codexState.settingsLoadingModels) {
        return '正在加载模型...';
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
    return defaultModelEntry ? defaultModelEntry.label : '未解析模型';
}

function buildReasoningDefaultLabel() {
    const effectiveReasoning = codexState.nextTurnEffectiveCodexConfig && codexState.nextTurnEffectiveCodexConfig.reasoningEffort
        ? codexState.nextTurnEffectiveCodexConfig.reasoningEffort
        : '';
    if (effectiveReasoning && REASONING_EFFORT_LABELS[effectiveReasoning]) {
        return REASONING_EFFORT_LABELS[effectiveReasoning];
    }
    const fallbackModelId = resolveReasoningModelId();
    const fallbackModelEntry = findCodexModelEntry(fallbackModelId)
        || codexState.modelCatalog.find((entry) => entry && entry.isDefault === true)
        || codexState.modelCatalog.find((entry) => entry && entry.id)
        || null;
    const defaultReasoning = fallbackModelEntry && typeof fallbackModelEntry.defaultReasoningEffort === 'string'
        ? fallbackModelEntry.defaultReasoningEffort
        : '';
    return defaultReasoning && REASONING_EFFORT_LABELS[defaultReasoning]
        ? REASONING_EFFORT_LABELS[defaultReasoning]
        : '未解析强度';
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
    const items = skillItems.length > 0
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
        codexSlashMenuEmpty.textContent = '正在加载技能...';
    } else if (isSkillQuery && codexState.skillListRequested && skillItems.length === 0) {
        codexSlashMenuEmpty.textContent = '未找到匹配技能';
    } else {
        codexSlashMenuEmpty.textContent = 'No matching commands';
    }
    codexSlashMenuEmpty.hidden = items.length > 0 || skillItems.length > 0;
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
            status.textContent = entry.availability === 'contract_frozen_not_enabled' ? '未开放' : '预留';
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

function applySlashCommandSelection(command) {
    if (!codexInput) return;
    codexInput.value = command;
    codexInput.focus();
    if (command === '/model' && codexQuickModel) {
        codexInput.value = '';
        setSlashMenuState(false, '');
        void openCodexModelPicker();
        return;
    }
    if (command === '/skill') {
        codexInput.value = '/skill ';
        void maybeLoadCodexSkills();
        setSlashMenuState(true, '/skill ');
        return;
    }
    setSlashMenuState(true, command);
}

function updateSlashMenuForInputValue() {
    if (!codexInput) return;
    const slashApi = getCodexSlashCommandsApi();
    const parsed = slashApi && typeof slashApi.parseComposerInput === 'function'
        ? slashApi.parseComposerInput(codexInput.value)
        : { kind: 'text' };
    if (parsed.kind !== 'slash') {
        setSlashMenuState(false, '');
        return;
    }
    if (parsed.command === '/skill') {
        void maybeLoadCodexSkills();
    }
    setSlashMenuState(true, parsed.text || parsed.command || '/');
}

function setCodexSettingsStatus(text, tone) {
    codexState.settingsStatusText = typeof text === 'string' ? text.trim() : '';
    codexState.settingsStatusTone = typeof tone === 'string' ? tone.trim() : '';
    renderCodexSettingsPanel();
}

function getCodexSettingsStatusSummary() {
    if (codexState.settingsStatusText) {
        return {
            text: codexState.settingsStatusText,
            tone: codexState.settingsStatusTone
        };
    }
    if (codexState.rateLimitSummary && codexState.capabilities.rateLimitsRead === true) {
        return {
            text: `额度：${codexState.rateLimitSummary}`,
            tone: codexState.rateLimitTone || ''
        };
    }
    return { text: '', tone: '' };
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
    return options.filter((value, index, arr) => REASONING_EFFORT_LABELS[value] && arr.indexOf(value) === index);
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
    codexState.skillListPromise = sendCodexBridgeRequest('skills/list', {})
        .then((result) => {
            codexState.skillCatalog = normalizeCodexSkillCatalog(result);
            renderCodexSlashMenu();
            return codexState.skillCatalog;
        })
        .catch(() => {
            codexState.skillListRequested = false;
            renderCodexSlashMenu();
            return [];
        })
        .finally(() => {
            codexState.skillListPromise = null;
            codexState.skillsLoading = false;
            renderCodexSlashMenu();
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
        codexInput.value = skillEntry.defaultPrompt || `$${skillEntry.name}`;
        codexInput.focus();
    }
    setSlashMenuState(false, '');
}

function populateCodexReasoningSelect(selectEl, options) {
    if (!selectEl) return;
    const opts = options || {};
    const selectedValue = typeof opts.forcedValue === 'string' ? opts.forcedValue : (selectEl.value || '');
    const optionValues = getReasoningOptionsForModel(opts.modelId);
    selectEl.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = opts.defaultLabel || '默认';
    selectEl.appendChild(defaultOption);

    optionValues.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = REASONING_EFFORT_LABELS[value] || value;
        selectEl.appendChild(option);
    });
    selectEl.value = optionValues.includes(selectedValue) ? selectedValue : '';
}

function populateCodexModelSelect(forcedValue) {
    if (!codexSettingsModel) return;
    const selectedValue = typeof forcedValue === 'string'
        ? forcedValue
        : (typeof codexSettingsModel.value === 'string' ? codexSettingsModel.value : '');
    codexSettingsModel.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = codexState.settingsLoadingModels ? '正在加载模型...' : buildModelDefaultLabel();
    codexSettingsModel.appendChild(defaultOption);

    const seen = new Set(['']);
    codexState.modelCatalog.forEach((model) => {
        if (!model || !model.id || seen.has(model.id)) return;
        seen.add(model.id);
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.label;
        codexSettingsModel.appendChild(option);
    });

    if (selectedValue && !seen.has(selectedValue)) {
        const option = document.createElement('option');
        option.value = selectedValue;
        option.textContent = `${selectedValue}（自定义）`;
        codexSettingsModel.appendChild(option);
    }

    codexSettingsModel.value = selectedValue;
}

function syncCodexSettingsFormFromStoredConfig() {
    if (
        !codexSettingsUseDefaults ||
        !codexSettingsModel ||
        !codexSettingsReasoning ||
        !codexSettingsPersonality ||
        !codexSettingsApproval ||
        !codexSettingsSandbox
    ) {
        return;
    }

    const stored = getStoredCodexConfig();
    const useServerDefaults = !stored;
    codexSettingsUseDefaults.checked = useServerDefaults;
    populateCodexModelSelect(stored && stored.defaultModel ? stored.defaultModel : '');
    populateCodexReasoningSelect(codexSettingsReasoning, {
        defaultLabel: buildReasoningDefaultLabel(),
        forcedValue: stored && stored.defaultReasoningEffort ? stored.defaultReasoningEffort : '',
        modelId: stored && stored.defaultModel ? stored.defaultModel : resolveReasoningModelId()
    });
    codexSettingsPersonality.value = stored && stored.defaultPersonality ? stored.defaultPersonality : '';
    codexSettingsApproval.value = stored && stored.approvalPolicy ? stored.approvalPolicy : '';
    codexSettingsSandbox.value = stored && stored.sandboxMode ? stored.sandboxMode : '';
}

function collectCodexSettingsPayload() {
    const settingsApi = getCodexSettingsViewApi();
    if (!settingsApi || typeof settingsApi.buildCodexConfigPayload !== 'function') {
        return null;
    }
    return settingsApi.buildCodexConfigPayload({
        useServerDefaults: codexSettingsUseDefaults ? codexSettingsUseDefaults.checked : true,
        defaultModel: codexSettingsModel ? codexSettingsModel.value : '',
        defaultReasoningEffort: codexSettingsReasoning ? codexSettingsReasoning.value : '',
        defaultPersonality: codexSettingsPersonality ? codexSettingsPersonality.value : '',
        approvalPolicy: codexSettingsApproval ? codexSettingsApproval.value : '',
        sandboxMode: codexSettingsSandbox ? codexSettingsSandbox.value : ''
    });
}

function isCodexSettingsDirty() {
    const settingsApi = getCodexSettingsViewApi();
    if (!settingsApi || typeof settingsApi.areCodexConfigsEqual !== 'function') {
        return false;
    }
    return !settingsApi.areCodexConfigsEqual(getStoredCodexConfig(), collectCodexSettingsPayload());
}

function shouldShowCodexSettingsPanel() {
    const settingsApi = getCodexSettingsViewApi();
    if (settingsApi && typeof settingsApi.shouldShowSettingsPanel === 'function') {
        return settingsApi.shouldShowSettingsPanel({
            sessionMode: getActiveSessionMode(),
            capabilities: codexState.capabilities
        });
    }
    return getActiveSessionMode() === 'codex' && codexState.capabilities.modelConfig === true;
}

function renderCodexSettingsPanel() {
    if (!codexSettingsPanel) return;
    const shouldShowPanel = shouldShowCodexSettingsPanel();
    codexSettingsPanel.hidden = !(shouldShowPanel && syncCodexSecondaryPanelState() === 'settings');
    if (!shouldShowPanel) {
        return;
    }

    const canEditModelConfig = codexState.capabilities.modelConfig === true;
    const canReadRateLimits = codexState.capabilities.rateLimitsRead === true;
    const settingsHeaderTitle = document.getElementById('codex-settings-title');
    const settingsFields = document.getElementById('codex-settings-fields');
    const settingsFooter = document.getElementById('codex-settings-footer');

    populateCodexModelSelect();
    populateCodexReasoningSelect(codexSettingsReasoning, {
        defaultLabel: buildReasoningDefaultLabel(),
        forcedValue: codexSettingsReasoning ? codexSettingsReasoning.value : '',
        modelId: codexSettingsModel ? codexSettingsModel.value : resolveReasoningModelId()
    });

    const useServerDefaults = codexSettingsUseDefaults ? codexSettingsUseDefaults.checked : true;
    const disableFields = !canEditModelConfig || useServerDefaults || codexState.settingsSaving;
    codexSettingsPanel.classList.toggle('is-defaults', useServerDefaults);

    if (settingsHeaderTitle) {
        settingsHeaderTitle.textContent = canEditModelConfig ? '会话默认配置' : '会话状态';
    }
    if (codexSettingsUseDefaults) {
        const toggleRow = codexSettingsUseDefaults.closest('.codex-settings-toggle');
        if (toggleRow) {
            toggleRow.hidden = !canEditModelConfig;
        }
    }
    if (settingsFields) {
        settingsFields.hidden = !canEditModelConfig;
    }
    if (settingsFooter) {
        settingsFooter.classList.toggle('limits-only', !canEditModelConfig);
    }

    [codexSettingsModel, codexSettingsReasoning, codexSettingsPersonality, codexSettingsApproval, codexSettingsSandbox]
        .forEach((field) => {
            if (field) {
                field.disabled = disableFields;
            }
        });

    if (codexSettingsUseDefaults) {
        codexSettingsUseDefaults.disabled = codexState.settingsSaving || !canEditModelConfig;
    }
    if (btnCodexModelsRefresh) {
        btnCodexModelsRefresh.hidden = !canEditModelConfig;
        btnCodexModelsRefresh.disabled = !canEditModelConfig || codexState.settingsLoadingModels || codexState.settingsSaving;
    }
    if (btnCodexRateLimitRefresh) {
        btnCodexRateLimitRefresh.hidden = !canReadRateLimits;
        btnCodexRateLimitRefresh.disabled = !canReadRateLimits || codexState.settingsRefreshingRateLimits || codexState.settingsSaving;
    }
    if (btnCodexSettingsReset) {
        btnCodexSettingsReset.hidden = !canEditModelConfig;
        btnCodexSettingsReset.disabled = codexState.settingsSaving || !isCodexSettingsDirty();
    }
    if (btnCodexSettingsSave) {
        btnCodexSettingsSave.hidden = !canEditModelConfig;
        btnCodexSettingsSave.disabled = codexState.settingsSaving || !isCodexSettingsDirty();
        btnCodexSettingsSave.textContent = codexState.settingsSaving ? '保存中...' : '保存';
    }

    const status = getCodexSettingsStatusSummary();
    if (codexSettingsStatus) {
        codexSettingsStatus.textContent = status.text;
        codexSettingsStatus.classList.toggle('tone-error', status.tone === 'error');
        codexSettingsStatus.classList.toggle('tone-warn', status.tone === 'warn');
        codexSettingsStatus.classList.toggle('tone-success', status.tone === 'success');
    }
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

function renderCodexRuntimePanel() {
    if (!codexRuntimePanel) return;
    const shouldShowPanel = shouldShowCodexRuntimePanel();
    codexRuntimePanel.hidden = !(shouldShowPanel && syncCodexSecondaryPanelState() === 'runtime');
    if (!shouldShowPanel) {
        return;
    }

    if (codexRuntimeDiff) {
        codexRuntimeDiff.textContent = codexState.runtimeDiff || '等待变更更新...';
    }
    if (codexRuntimePlan) {
        codexRuntimePlan.textContent = codexState.runtimePlan || '等待计划更新...';
    }
    if (codexRuntimeReasoning) {
        codexRuntimeReasoning.textContent = codexState.runtimeReasoning || '等待推理更新...';
    }
    if (codexRuntimeTerminal) {
        codexRuntimeTerminal.textContent = codexState.runtimeTerminalOutput || '等待终端输出...';
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
        setCodexSettingsStatus('正在刷新模型列表...', '');
    } else {
        renderCodexSettingsPanel();
    }

    codexState.modelListPromise = sendCodexBridgeRequest('model/list', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            codexState.modelCatalog = normalizeCodexModelCatalog(result);
            codexState.modelOptions = normalizeCodexModelOptions(result);
            if (opts.silent !== true) {
                setCodexSettingsStatus('模型列表已刷新。', 'success');
            }
            renderCodexSettingsPanel();
            renderCodexQuickControls();
            return codexState.modelOptions;
        })
        .catch((error) => {
            codexState.modelListRequested = false;
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : '加载模型失败。';
                setCodexSettingsStatus(message, 'error');
                appendCodexLogEntry('error', message, { meta: 'models' });
            }
            return [];
        })
        .finally(() => {
            codexState.settingsLoadingModels = false;
            codexState.modelListPromise = null;
            renderCodexSettingsPanel();
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
        setCodexSettingsStatus('正在刷新额度信息...', '');
    } else {
        renderCodexSettingsPanel();
    }

    return sendCodexBridgeRequest('account/rateLimits/read', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            applyCodexRateLimit(result);
            if (opts.silent !== true) {
                setCodexSettingsStatus('额度快照已刷新。', 'success');
            }
            renderCodexSettingsPanel();
            return result;
        })
        .catch((error) => {
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : '读取额度信息失败。';
                setCodexSettingsStatus(message, 'error');
                appendCodexLogEntry('error', message, { meta: 'limits' });
            }
            return null;
        })
        .finally(() => {
            codexState.settingsRefreshingRateLimits = false;
            renderCodexSettingsPanel();
        });
}

function saveCodexSessionSettings() {
    if (!sessionId || !serverUrl) {
        setCodexSettingsStatus('会话尚未连接，无法保存设置。', 'error');
        return Promise.resolve(null);
    }
    if (!isCodexSettingsDirty()) {
        setCodexSettingsStatus('当前没有需要保存的更改。', '');
        return Promise.resolve(null);
    }

    codexState.settingsSaving = true;
    setCodexSettingsStatus('正在保存会话默认配置...', '');
    const payload = { codexConfig: collectCodexSettingsPayload() };
    const requestUrl = buildApiUrl(serverUrl, `/api/sessions/${encodeURIComponent(sessionId)}`);

    return fetch(requestUrl, buildJsonFetchOptions('PATCH', payload))
        .then(async (response) => {
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body && body.error ? body.error : `Failed to save session defaults (${response.status})`);
            }
            return body;
        })
        .then((body) => {
            const settingsApi = getCodexSettingsViewApi();
            codexState.storedCodexConfig = settingsApi && typeof settingsApi.normalizeStoredCodexConfig === 'function'
                ? settingsApi.normalizeStoredCodexConfig(body.codexConfig)
                : null;
            codexState.serverNextTurnConfigBase = null;
            syncCodexSettingsFormFromStoredConfig();
            syncNextTurnEffectiveCodexConfig();
            setCodexSettingsStatus('会话默认配置已保存。', 'success');
            appendCodexLogEntry('system', '已更新会话级 Codex 默认配置。', { meta: 'settings' });
            return body;
        })
        .catch((error) => {
            const message = error && error.message ? error.message : '保存会话默认配置失败。';
            setCodexSettingsStatus(message, 'error');
            appendCodexLogEntry('error', message, { meta: 'settings' });
            return null;
        })
        .finally(() => {
            codexState.settingsSaving = false;
            renderCodexSettingsPanel();
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

function appendCodexLogEntry(role, text, options) {
    if (!codexLog) return null;
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

    codexLog.appendChild(entry);
    codexLog.scrollTop = codexLog.scrollHeight;

    if (itemId) {
        codexState.messageByItemId.set(itemId, entry);
    }

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
        btnCodexToggle.textContent = codexState.panelCollapsed ? 'Show' : 'Hide';
    }
}

function sendCodexEnvelope(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        appendCodexLogEntry('error', 'Codex request failed: websocket is not connected.', { meta: 'bridge' });
        setCodexErrorNotice('Bridge disconnected. Reconnect before sending another Codex request.');
        setCodexStatus('error', 'bridge disconnected');
        return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
}

function resetCodexBootstrapState() {
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
    codexState.streamingItemId = '';
    codexState.tokenUsageSummary = '';
    codexState.historyListLoading = false;
    codexState.historyActionThreadId = '';
    codexState.storedCodexConfig = null;
    codexState.modelCatalog = [];
    codexState.modelOptions = [];
    codexState.modelListRequested = false;
    codexState.modelListPromise = null;
    codexState.skillCatalog = [];
    codexState.skillListRequested = false;
    codexState.skillListPromise = null;
    codexState.skillsLoading = false;
    codexState.slashRegistry = [];
    codexState.slashMenuOpen = false;
    codexState.slashMenuQuery = '';
    codexState.settingsLoadingModels = false;
    codexState.settingsSaving = false;
    codexState.settingsRefreshingRateLimits = false;
    codexState.settingsStatusText = '';
    codexState.settingsStatusTone = '';
    codexState.nextTurnOverrides = { model: null, reasoningEffort: null };
    codexState.interactionState = { planMode: false, activeSkill: null };
    codexState.serverNextTurnConfigBase = null;
    codexState.nextTurnEffectiveCodexConfig = null;
    codexState.pendingSubmittedTurnState = null;
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
        imageInput: false
    };
    codexState.historyThreads = [];
    refreshCodexSlashRegistry();
    renderCodexHeaderSummary();
    renderCodexSecondaryNav();
    renderCodexHistoryList();
    syncCodexSettingsFormFromStoredConfig();
    renderCodexQuickControls();
    renderCodexComposerState();
    renderCodexSlashMenu();
    renderCodexSettingsPanel();
    renderCodexAlerts();
    renderCodexRuntimePanel();
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
        imageInput: source.imageInput === true
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
            : null
    };
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
    if (baseConfig) {
        return {
            model: codexState.nextTurnOverrides.model || baseConfig.model || null,
            reasoningEffort: codexState.nextTurnOverrides.reasoningEffort || baseConfig.reasoningEffort || null,
            personality: baseConfig.personality || null,
            approvalPolicy: baseConfig.approvalPolicy || null,
            sandboxMode: baseConfig.sandboxMode || null
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
        approvalPolicy: stored ? stored.approvalPolicy : null,
        sandboxMode: stored ? stored.sandboxMode : null
    };
}

function refreshCodexSlashRegistry() {
    const slashApi = getCodexSlashCommandsApi();
    codexState.slashRegistry = slashApi && typeof slashApi.createSlashRegistry === 'function'
        ? slashApi.createSlashRegistry()
        : [];
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
    const threads = result && Array.isArray(result.threads) ? result.threads : [];
    codexState.historyThreads = threads
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            id: typeof entry.id === 'string' ? entry.id : '',
            title: typeof entry.title === 'string' ? entry.title : ''
        }))
        .filter((entry) => entry.id);
    renderCodexHistoryList();
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
                appendCodexLogEntry('error', error.message || '加载 Codex 线程历史失败。', { meta: 'history' });
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
    renderCodexHistoryList();
    codexState.resumeAttemptedForThreadId = normalizedThreadId;
    appendCodexLogEntry('system', `正在恢复 Codex 线程 ${normalizedThreadId}...`, { meta: 'history' });
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
            appendCodexLogEntry('system', `已恢复 Codex 线程 ${resumedThreadId}。`, { meta: 'history' });
            refreshCodexThreadList({ force: true, silent: true });
            return result;
        })
        .finally(() => {
            codexState.historyActionThreadId = '';
            renderCodexHistoryList();
        });
}

function requestFallbackCodexThread() {
    if (codexState.fallbackThreadRequested) {
        return;
    }
    codexState.fallbackThreadRequested = true;
    appendCodexLogEntry('system', '没有可恢复的线程，正在创建新的 Codex 线程...', { meta: 'history' });
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
    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value > 0 && value < 86400) {
            return `in ${formatDurationShort(value)}`;
        }
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return value.trim();
    }
    return '';
}

function formatTokenUsageSummary(payload) {
    const sources = [
        payload,
        payload && payload.tokenUsage,
        payload && payload.usage,
        payload && payload.thread,
        payload && payload.thread && payload.thread.tokenUsage,
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
    const containers = [
        payload,
        payload && payload.rateLimit,
        payload && payload.rateLimits,
        payload && payload.account
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
    return { entry: null, extraCount: 0 };
}

function formatRateLimitSummary(payload) {
    const extracted = extractRateLimitEntry(payload);
    const entry = extracted.entry;
    const sources = [payload, payload && payload.rateLimit, payload && payload.rateLimits, entry];
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
        ['remainingRequests'],
        ['limitRemaining'],
        ['rateLimitRemaining']
    ]);
    const limit = pickFirstNumber(sources, [
        ['limit'],
        ['max'],
        ['rateLimit']
    ]);
    const retryAfter = pickFirstNumber(sources, [
        ['retryAfterSeconds'],
        ['retryAfter'],
        ['retry_after_seconds']
    ]);
    const resetHint = formatResetHint(
        pickFirstString(sources, [['resetAt'], ['resetsAt']])
        || pickFirstNumber(sources, [['resetAtEpochMs'], ['resetsInSeconds']])
    );
    const rawStatus = pickFirstString(sources, [['status'], ['state'], ['result']]).toLowerCase();

    const parts = [];
    if (scope) parts.push(scope);
    if (typeof remaining === 'number' && typeof limit === 'number') {
        parts.push(`${Math.max(0, Math.round(remaining))}/${Math.max(0, Math.round(limit))} left`);
    } else if (typeof remaining === 'number') {
        parts.push(`${Math.max(0, Math.round(remaining))} left`);
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
    renderCodexAuxStatus();
    if (summary) {
        logCodexTelemetryChange('tokenUsage', `Token usage updated: ${summary}`, 'usage');
    }
}

function applyCodexRateLimit(payload) {
    const next = formatRateLimitSummary(payload || {});
    codexState.rateLimitSummary = next.summary;
    codexState.rateLimitTone = next.tone;
    renderCodexAuxStatus();
    renderCodexSettingsPanel();
    if (next.summary) {
        logCodexTelemetryChange('rateLimit', `Rate limit updated: ${next.summary}`, 'limits');
    }
}

function resolveCodexErrorMessage(code, message) {
    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
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
    const compact = lostHeight >= 120 || height <= 540;
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
    clearPendingTurnState();
}

function restorePendingTurnStateOnFailure() {
    const pending = codexState.pendingSubmittedTurnState;
    if (!pending) {
        return;
    }
    setNextTurnOverrides(pending.nextTurnOverrides || { model: null, reasoningEffort: null });
    setCodexInteractionState(pending.interactionState || { planMode: false, activeSkill: null });
    clearPendingTurnState();
}

function sendCodexTurn(text, options) {
    const cleaned = typeof text === 'string' ? text.trim() : '';
    if (!cleaned) return;
    const opts = options || {};
    const nextTurnOverrides = normalizeNextTurnOverrides(opts.nextTurnOverrides || codexState.nextTurnOverrides);
    const interactionState = normalizeCodexInteractionState(opts.interactionState || codexState.interactionState);
    const collaborationMode = typeof opts.collaborationMode === 'string' && opts.collaborationMode.trim()
        ? opts.collaborationMode.trim()
        : null;
    const payload = {
        type: 'codex_turn',
        text: cleaned,
        forceNewThread: !!opts.forceNewThread,
        cwd: getConfiguredCodexCwd() || undefined,
        model: nextTurnOverrides.model || undefined,
        reasoningEffort: nextTurnOverrides.reasoningEffort || undefined,
        collaborationMode: collaborationMode || undefined
    };

    appendCodexLogEntry('user', cleaned, { meta: 'you' });
    if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
        codexState.unmaterializedThreadId = '';
    }
    codexState.pendingFreshThread = false;
    setCodexStatus('running', 'starting turn');
    rememberPendingTurnState({
        nextTurnOverrides,
        interactionState,
        clearOverrides: opts.clearOverrides !== false && (!!nextTurnOverrides.model || !!nextTurnOverrides.reasoningEffort),
        clearPlanMode: opts.clearPlanMode === true,
        clearActiveSkill: !!interactionState.activeSkill
    });
    if (!sendCodexEnvelope(payload)) {
        restorePendingTurnStateOnFailure();
    }
}

function handleCodexComposerSubmit(rawText) {
    const slashApi = getCodexSlashCommandsApi();
    const parsed = slashApi && typeof slashApi.parseComposerInput === 'function'
        ? slashApi.parseComposerInput(rawText)
        : { kind: 'text', text: rawText };

    if (parsed.kind === 'empty') {
        return false;
    }

    if (parsed.kind !== 'slash') {
        sendCodexTurn(parsed.text, {
            clearPlanMode: codexState.interactionState.planMode === true,
            collaborationMode: codexState.interactionState.planMode === true ? 'plan' : null
        });
        return true;
    }

    const registryEntry = slashApi && typeof slashApi.resolveSlashCommand === 'function'
        ? slashApi.resolveSlashCommand({ registry: codexState.slashRegistry, command: parsed.command })
        : null;

    if (!registryEntry) {
        appendCodexLogEntry('error', '未识别命令。当前支持：/model、/plan。', { meta: 'slash' });
        return false;
    }

    if (registryEntry.command === '/plan') {
        if (!parsed.argumentText) {
            setPlanMode(true);
            return true;
        }
        sendCodexTurn(parsed.argumentText, {
            collaborationMode: 'plan',
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
            appendCodexLogEntry('system', `未找到技能：${parsed.argumentText}`, { meta: 'slash' });
            setSlashMenuState(true, `/skill ${parsed.argumentText}`);
            return false;
        }
        applyCodexSkillSelection(skillEntry);
        setSlashMenuState(false, '');
        return false;
    }

    appendCodexLogEntry('system', registryEntry.statusText || '命令已预留，当前阶段不可用。', { meta: 'slash' });
    return false;
}

function requestCodexNewThread(options) {
    const opts = options || {};
    if (opts.silent !== true) {
        appendCodexLogEntry('system', '正在请求新的 Codex 线程...', { meta: 'bridge' });
    }
    codexState.pendingFreshThread = true;
    codexState.unmaterializedThreadId = '';
    sendCodexEnvelope({
        type: 'codex_new_thread',
        cwd: getConfiguredCodexCwd() || undefined
    });
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
    if (method === 'item/commandExecution/requestApproval' || method === 'item/fileChange/requestApproval') {
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
    if (!requestState || !requestState.entry || !requestState.entry.isConnected) {
        return;
    }
    const approvalApi = getCodexApprovalViewApi();
    const entry = requestState.entry;
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
            metaNode.textContent = `${actionLabel}: ${requestState.resolution || 'resolved'}`;
        } else if (requestState.status === 'submitted') {
            metaNode.textContent = `${actionLabel}: submitted`;
        } else {
            metaNode.textContent = `${actionLabel}: pending`;
        }
    }
    const approveBtn = entry.querySelector('[data-request-action="approve"]');
    const rejectBtn = entry.querySelector('[data-request-action="reject"]');
    const isLocked = requestState.status !== 'pending';
    if (approveBtn) approveBtn.disabled = isLocked;
    if (rejectBtn) rejectBtn.disabled = isLocked;
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
        if (!existing || !existing.entry || !existing.entry.isConnected) {
            renderCodexServerRequest({
                ...request,
                handledBy: 'client'
            });
        }
    });
}

function renderCodexServerRequest(envelope) {
    const approvalApi = getCodexApprovalViewApi();
    const request = approvalApi && typeof approvalApi.normalizeApprovalRequest === 'function'
        ? approvalApi.normalizeApprovalRequest(envelope)
        : null;
    const requestId = request ? request.requestId : '';
    const method = request ? request.method : (envelope && typeof envelope.method === 'string' ? envelope.method : 'unknown');
    if (!requestId || !request) {
        appendCodexLogEntry('system', `Codex server request received: ${method}`, { meta: 'approval' });
        return;
    }
    if (request.handledBy !== 'client') {
        const autoSummary = approvalApi && typeof approvalApi.resolveApprovalSummaryText === 'function'
            ? approvalApi.resolveApprovalSummaryText(request)
            : resolveApprovalSummary(method, envelope && envelope.params ? envelope.params : {});
        appendCodexLogEntry('system', `Codex server request auto-handled: ${autoSummary}`, { meta: request.requestKind || 'approval' });
        return;
    }

    const existing = getCodexRequestState(requestId);
    if (existing && existing.entry && existing.entry.isConnected) {
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
    titleNode.textContent = request.title || 'Codex Approval';
    entry.insertBefore(titleNode, entry.querySelector('.content'));

    const statusNode = document.createElement('div');
    statusNode.className = 'codex-request-status';
    entry.appendChild(statusNode);

    const actions = document.createElement('div');
    actions.className = 'codex-request-actions';
    const questionSelections = {};
    let approveBtn = null;
    let rejectBtn = null;
    if (request.responseMode === 'answers' && Array.isArray(request.questions) && request.questions.length > 0) {
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
        submitBtn.textContent = 'Submit';
        submitBtn.disabled = true;
        const rejectUserInputBtn = document.createElement('button');
        rejectUserInputBtn.type = 'button';
        rejectUserInputBtn.dataset.requestAction = 'reject';
        rejectUserInputBtn.textContent = 'Cancel';
        actions.appendChild(submitBtn);
        actions.appendChild(rejectUserInputBtn);
        approveBtn = submitBtn;
        rejectBtn = rejectUserInputBtn;
    } else {
        approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'primary';
        approveBtn.dataset.requestAction = 'approve';
        approveBtn.textContent = 'Approve';
        rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.dataset.requestAction = 'reject';
        rejectBtn.textContent = 'Reject';
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
            markCodexRequestState(requestId, 'submitted', requestState.responseMode === 'answers' ? 'submitted' : 'approved');
        }
    });

    rejectBtn.addEventListener('click', () => {
        if (requestState.responseMode === 'answers') {
            if (sendCodexEnvelope({
                type: 'codex_server_request_response',
                requestId,
                error: { message: 'User input request cancelled by user.' }
            })) {
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

function handleCodexThreadSnapshot(thread) {
    if (!thread || !Array.isArray(thread.turns)) return;
    codexState.lastSnapshotThreadId = thread && typeof thread.id === 'string'
        ? thread.id
        : codexState.threadId;
    if (codexState.unmaterializedThreadId && codexState.lastSnapshotThreadId === codexState.unmaterializedThreadId) {
        codexState.unmaterializedThreadId = '';
    }
    if (codexState.threadId && codexState.lastSnapshotThreadId === codexState.threadId) {
        codexState.pendingFreshThread = false;
    }
    codexLog.innerHTML = '';
    codexState.messageByItemId.clear();
    clearCodexRequestCards();
    clearCodexRuntimePanels();
    clearCodexAlerts();

    thread.turns.forEach((turn) => {
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
}

function handleCodexNotification(method, params) {
    if (method === 'thread/started') {
        const threadId = params && params.thread ? params.thread.id : '';
        if (threadId) {
            codexState.threadId = threadId;
            codexState.unmaterializedThreadId = threadId;
            codexState.pendingFreshThread = false;
            updateCodexThreadLabel();
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

    if (method === 'turn/started') {
        const turn = params && params.turn ? params.turn : null;
        codexState.currentTurnId = turn && turn.id ? turn.id : '';
        if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
            codexState.unmaterializedThreadId = '';
        }
        codexState.pendingFreshThread = false;
        clearCodexRuntimePanels();
        clearCodexAlerts();
        clearCodexErrorNotice();
        setCodexStatus('running', 'in progress');
        return;
    }

    if (method === 'turn/completed') {
        codexState.currentTurnId = '';
        if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
            codexState.unmaterializedThreadId = '';
        }
        codexState.pendingFreshThread = false;
        setCodexStatus('idle');
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
        return;
    }

    if (method === 'thread/tokenUsage/updated') {
        applyCodexTokenUsage(params || {});
        return;
    }

    if (method === 'account/rateLimits/updated') {
        applyCodexRateLimit(params || {});
        return;
    }

    if (method === 'configWarning' || method === 'deprecationNotice') {
        applyCodexRuntimeUpdate(method, params || {});
        appendCodexLogEntry('system', codexState.runtimeWarning || 'Codex warning received.', {
            meta: method === 'configWarning' ? 'config' : 'deprecation'
        });
        return;
    }

    if (method === 'error') {
        const resolved = resolveCodexErrorMessage(params && params.code, params && params.message);
        appendCodexLogEntry('error', resolved, { meta: (params && params.code) || 'event' });
        setCodexErrorNotice(resolved);
        setCodexStatus('error', 'event error');
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

function closeSocketSilently() {
    if (!ws) return;
    ws.onclose = null;
    ws.close();
    ws = null;
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
            showStatus('Waiting for server config...');
            return;
        }
        notifyNativeConnectionState('error', 'No injected server URL');
        notifyNativeError('NO_ACTIVE_SERVER', 'No injected server URL');
        showStatus('Missing server URL.');
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
    showStatus(`Connecting (${transportLabel})...`);
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
            showStatus('Failed to create websocket.');
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
                    codexState.secondaryPanel = 'none';
                    codexState.initialSessionInfoReceived = true;
                    syncNextTurnEffectiveCodexConfig();
                    applySessionModeLayout();
                    renderCodexHeaderSummary();
                    renderCodexSecondaryNav();
                    syncCodexSettingsFormFromStoredConfig();
                    renderCodexQuickControls();
                    renderCodexComposerState();
                    renderCodexSecondaryPanels();
                    notifyNativeSessionInfo(nextSessionId, envelope.name || '', envelope.privilegeLevel || '');
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
                    maybeLoadCodexSkills();
                    return;
                }
                if (envelope.type === 'codex_capabilities') {
                    codexState.capabilities = normalizeCodexCapabilities(envelope.capabilities);
                    refreshCodexSlashRegistry();
                    codexState.secondaryPanel = 'none';
                    codexState.initialCapabilitiesReceived = true;
                    renderCodexHeaderSummary();
                    renderCodexSecondaryNav();
                    renderCodexSlashMenu();
                    renderCodexSecondaryPanels();
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
                    maybeLoadCodexSkills();
                    return;
                }
                if (envelope.type === 'codex_state') {
                    const previousThreadId = codexState.threadId;
                    codexState.threadId = envelope.threadId || '';
                    if (!codexState.threadId) {
                        codexState.lastSnapshotThreadId = '';
                        codexState.unmaterializedThreadId = '';
                        codexState.pendingFreshThread = false;
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
                    return;
                }
                if (envelope.type === 'codex_thread') {
                    codexState.threadId = envelope.threadId || '';
                    codexState.currentTurnId = '';
                    codexState.lastSnapshotThreadId = '';
                    codexState.unmaterializedThreadId = codexState.threadId || '';
                    codexState.pendingFreshThread = true;
                    codexState.lastCodexThreadId = codexState.threadId;
                    codexState.fallbackThreadRequested = false;
                    clearCodexErrorNotice();
                    updateCodexThreadLabel();
                    appendCodexLogEntry('system', `已连接到线程 ${codexState.threadId}`, { meta: 'bridge' });
                    setCodexStatus('idle');
                    refreshCodexThreadList({ force: true, silent: true });
                    refreshCodexThreadSnapshot({ force: true });
                    return;
                }
                if (envelope.type === 'codex_thread_ready') {
                    codexState.threadId = envelope.threadId || codexState.threadId;
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
                    const turn = envelope.turn || null;
                    codexState.currentTurnId = turn && turn.id ? turn.id : codexState.currentTurnId;
                    finalizePendingTurnStateOnSuccess();
                    clearCodexErrorNotice();
                    setCodexStatus('running', 'turn started');
                    return;
                }
                if (envelope.type === 'codex_interrupt_ack') {
                    appendCodexLogEntry('system', '已向 Codex 发送中断信号。', { meta: 'bridge' });
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
                            `Codex 服务端请求已自动处理：${envelope.method || 'unknown'}`,
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
                    appendCodexLogEntry('error', message, { meta: envelope.code || 'codex' });
                    setCodexErrorNotice(message);
                    setCodexStatus('error', message);
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
            rejectPendingCodexBridgeRequests(
                `Codex bridge closed (${event.code}).`,
                'CODEX_BRIDGE_CLOSED'
            );
            resetCodexBootstrapState();
            setCodexStatus('error', 'bridge disconnected');
            if (retryCount >= MAX_RETRIES) {
                const detail = `code=${event.code} reason=${event.reason || 'none'}`;
                showStatus('Connection failed.');
                notifyNativeConnectionState('error', `Connection closed (${detail})`);
                notifyNativeError('WS_CLOSED', detail);
                return;
            }
            showStatus('Disconnected. Reconnecting...');
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

if (codexThreadSummary) {
    codexThreadSummary.addEventListener('click', () => {
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

if (btnCodexSecondarySettings) {
    btnCodexSecondarySettings.addEventListener('click', () => {
        toggleCodexSecondaryPanel('settings');
    });
}

if (btnCodexSecondaryRuntime) {
    btnCodexSecondaryRuntime.addEventListener('click', () => {
        toggleCodexSecondaryPanel('runtime');
    });
}

if (btnCodexSecondaryNotices) {
    btnCodexSecondaryNotices.addEventListener('click', () => {
        toggleCodexSecondaryPanel('notices');
    });
}

[
    codexSettingsUseDefaults,
    codexSettingsModel,
    codexSettingsReasoning,
    codexSettingsPersonality,
    codexSettingsApproval,
    codexSettingsSandbox
].filter(Boolean).forEach((field) => {
    field.addEventListener('change', () => {
        if (field === codexSettingsModel) {
            populateCodexReasoningSelect(codexSettingsReasoning, {
                defaultLabel: buildReasoningDefaultLabel(),
                forcedValue: codexSettingsReasoning ? codexSettingsReasoning.value : '',
                modelId: codexSettingsModel ? codexSettingsModel.value : resolveReasoningModelId()
            });
        }
        renderCodexSettingsPanel();
    });
});

if (btnCodexModelsRefresh) {
    btnCodexModelsRefresh.addEventListener('click', () => {
        refreshCodexModelList();
    });
}

if (btnCodexRateLimitRefresh) {
    btnCodexRateLimitRefresh.addEventListener('click', () => {
        refreshCodexRateLimits();
    });
}

if (btnCodexSettingsReset) {
    btnCodexSettingsReset.addEventListener('click', () => {
        syncCodexSettingsFormFromStoredConfig();
        setCodexSettingsStatus('Restored saved session defaults.', '');
        renderCodexSettingsPanel();
    });
}

if (btnCodexSettingsSave) {
    btnCodexSettingsSave.addEventListener('click', () => {
        saveCodexSessionSettings();
    });
}

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
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const text = codexInput.value;
            if (handleCodexComposerSubmit(text)) {
                codexInput.value = '';
                setSlashMenuState(false, '');
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

if (btnCodexQuickClear) {
    btnCodexQuickClear.addEventListener('click', () => {
        clearNextTurnOverrides();
    });
}

if (btnCodexSlashTrigger) {
    btnCodexSlashTrigger.addEventListener('click', () => {
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

    terminalContainer.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;
        activeTouchId = touch.identifier;
        touchStartY = touch.clientY;
        lastTouchY = touch.clientY;
        draggedSinceTouchStart = false;
    }, { passive: true });

    terminalContainer.addEventListener('touchmove', (e) => {
        if (activeTouchId === null) return;
        const changedTouches = e.changedTouches || [];
        let touch = null;
        for (let i = 0; i < changedTouches.length; i += 1) {
            if (changedTouches[i].identifier === activeTouchId) {
                touch = changedTouches[i];
                break;
            }
        }
        if (!touch) return;

        const deltaYFromStart = touch.clientY - touchStartY;
        if (!draggedSinceTouchStart && Math.abs(deltaYFromStart) >= DRAG_THRESHOLD_PX) {
            draggedSinceTouchStart = true;
        }
        if (!draggedSinceTouchStart) return;

        const viewport = getViewport();
        if (!viewport) return;

        const deltaY = touch.clientY - lastTouchY;
        if (deltaY === 0) return;

        e.preventDefault();
        viewport.scrollTop -= deltaY;
        lastTouchY = touch.clientY;
        suppressNextClickFocus = true;
        suppressFocusUntil = Date.now() + 280;
    }, { passive: false });

    terminalContainer.addEventListener('touchend', (e) => {
        activeTouchId = null;
        if (draggedSinceTouchStart) {
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
    }, { passive: false });

    terminalContainer.addEventListener('touchcancel', () => {
        activeTouchId = null;
        draggedSinceTouchStart = false;
    }, { passive: true });

    terminalContainer.addEventListener('dblclick', () => {
        const now = Date.now();
        closeSoftKeyboard();
        suppressNextClickFocus = true;
        suppressFocusUntil = now + 420;
    });

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
    });
} else if (terminalContainer) {
    terminalContainer.addEventListener('click', () => term.focus());
}

window.__applyTerminalConfig = function (config) {
    if (!config || typeof config !== 'object') return;
    window.__TERMLINK_CONFIG__ = config;
    applyRuntimeConfig(config, true);
};

setCodexStatus('idle');
updateCodexThreadLabel();
setCodexPanelCollapsed(false);
updateViewportLayoutState();
applySessionModeLayout();
appendCodexLogEntry('system', 'Codex 面板已就绪，可以直接发送请求。', { meta: 'bridge' });
renderCodexSecondaryNav();
renderCodexSecondaryPanels();
syncCodexSettingsFormFromStoredConfig();

applyRuntimeConfig(runtimeConfig, false);
loadHistoryState(getHistoryStorageKey(sessionId), true);
if (serverUrl) {
    connect();
} else {
    showStatus('Waiting for server config...');
}

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
        renderCodexHistoryList,
        renderCodexSettingsPanel,
        renderCodexRuntimePanel,
        renderCodexSecondaryPanels,
        // Helper functions
        syncCodexSecondaryPanelState,
        hasCodexNonBlockingNotice,
        getCodexSecondaryEntryAvailability,
        // DOM element references
        getCodexAlerts: () => codexAlerts,
        getCodexHistoryPanel: () => codexHistoryPanel,
        getCodexSettingsPanel: () => codexSettingsPanel,
        getCodexRuntimePanel: () => codexRuntimePanel,
        getCodexAlertConfig: () => codexAlertConfig,
        getCodexAlertDeprecation: () => codexAlertDeprecation
    };
}
