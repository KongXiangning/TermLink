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
const codexMetaText = document.getElementById('codex-meta-text');
const codexNoticeText = document.getElementById('codex-notice-text');
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
    tokenUsageSummary: '',
    rateLimitSummary: '',
    rateLimitTone: '',
    errorNotice: '',
    streamingItemId: '',
    messageByItemId: new Map(),
    requestEntryById: new Map(),
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
        skillsList: false,
        compact: false,
        imageInput: false
    },
    historyThreads: [],
    historyListLoading: false,
    historyActionThreadId: '',
    storedCodexConfig: null,
    modelOptions: [],
    modelListRequested: false,
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

function getCodexRuntimeViewApi() {
    if (window.TermLinkCodexRuntimeView && typeof window.TermLinkCodexRuntimeView.buildRuntimeUpdate === 'function') {
        return window.TermLinkCodexRuntimeView;
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
        const suffix = codexState.statusDetail ? `: ${codexState.statusDetail}` : '';
        codexStatusText.textContent = `Codex ${codexState.status}${suffix}`;
    }
    renderCodexAuxStatus();
    renderCodexHistoryList();
}

function updateCodexThreadLabel() {
    if (!codexThreadIdText) return;
    if (!codexState.threadId) {
        codexThreadIdText.textContent = '';
        renderCodexAuxStatus();
        renderCodexHistoryList();
        return;
    }
    codexThreadIdText.textContent = `thread ${codexState.threadId}`;
    renderCodexAuxStatus();
    renderCodexHistoryList();
}

function renderCodexAuxStatus() {
    if (codexMetaText) {
        const parts = [];
        if (codexState.cwd) {
            parts.push(`cwd: ${codexState.cwd}`);
        } else if (isCodexOnlyPage) {
            parts.push('cwd: default workspace');
        }
        if (codexState.approvalPending) {
            const count = codexState.pendingServerRequestCount || 0;
            parts.push(count === 1 ? 'approval pending' : `${count} approvals pending`);
        }
        if (codexState.tokenUsageSummary) {
            parts.push(codexState.tokenUsageSummary);
        }
        if (codexState.rateLimitSummary && codexState.rateLimitTone !== 'warn' && codexState.rateLimitTone !== 'error') {
            parts.push(`limit: ${codexState.rateLimitSummary}`);
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
            notice = `Rate limit: ${codexState.rateLimitSummary}`;
            tone = codexState.rateLimitTone;
        } else if (codexState.configWarningText) {
            notice = 'Config warning';
            tone = 'warn';
        } else if (codexState.deprecationNoticeText) {
            notice = 'Deprecation notice';
            tone = 'warn';
        }
        codexNoticeText.textContent = notice;
        codexNoticeText.classList.toggle('tone-error', tone === 'error');
        codexNoticeText.classList.toggle('tone-warn', tone === 'warn');
    }
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
    if (codexAlerts) {
        codexAlerts.hidden = !hasConfigWarning && !hasDeprecationNotice;
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

    codexHistoryPanel.hidden = !shouldShowPanel;
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
        emptyText = 'Loading saved threads...';
    } else if (entries.length === 0) {
        emptyText = codexState.capabilities.historyList === true
            ? 'No saved threads yet.'
            : 'Thread history is not available on this server.';
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
                badge.textContent = badgeLabel;
                badges.appendChild(badge);
            });
            copy.appendChild(badges);
        }

        const action = document.createElement('span');
        action.className = 'codex-history-action';
        action.textContent = entry.active ? 'Active' : (entry.pending ? 'Opening...' : 'Open');

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
                    `Failed to open Codex thread ${entry.id}: ${error.message || 'unknown error'}`,
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
            text: `Rate limit: ${codexState.rateLimitSummary}`,
            tone: codexState.rateLimitTone || ''
        };
    }
    return { text: '', tone: '' };
}

function normalizeCodexModelOptions(result) {
    const models = result && Array.isArray(result.models) ? result.models : [];
    return models
        .map((entry) => {
            if (typeof entry === 'string') {
                return entry.trim();
            }
            if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
                return entry.id.trim();
            }
            return '';
        })
        .filter(Boolean);
}

function populateCodexModelSelect(forcedValue) {
    if (!codexSettingsModel) return;
    const selectedValue = typeof forcedValue === 'string'
        ? forcedValue
        : (typeof codexSettingsModel.value === 'string' ? codexSettingsModel.value : '');
    codexSettingsModel.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = codexState.settingsLoadingModels ? 'Loading models...' : 'Server default';
    codexSettingsModel.appendChild(defaultOption);

    const seen = new Set(['']);
    codexState.modelOptions.forEach((modelId) => {
        if (!modelId || seen.has(modelId)) return;
        seen.add(modelId);
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = modelId;
        codexSettingsModel.appendChild(option);
    });

    if (selectedValue && !seen.has(selectedValue)) {
        const option = document.createElement('option');
        option.value = selectedValue;
        option.textContent = `${selectedValue} (custom)`;
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
    codexSettingsReasoning.value = stored && stored.defaultReasoningEffort ? stored.defaultReasoningEffort : '';
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
    codexSettingsPanel.hidden = !shouldShowPanel;
    if (!shouldShowPanel) {
        return;
    }

    const canEditModelConfig = codexState.capabilities.modelConfig === true;
    const canReadRateLimits = codexState.capabilities.rateLimitsRead === true;
    const settingsHeaderTitle = document.getElementById('codex-settings-title');
    const settingsFields = document.getElementById('codex-settings-fields');
    const settingsFooter = document.getElementById('codex-settings-footer');

    populateCodexModelSelect();

    const useServerDefaults = codexSettingsUseDefaults ? codexSettingsUseDefaults.checked : true;
    const disableFields = !canEditModelConfig || useServerDefaults || codexState.settingsSaving;
    codexSettingsPanel.classList.toggle('is-defaults', useServerDefaults);

    if (settingsHeaderTitle) {
        settingsHeaderTitle.textContent = canEditModelConfig ? 'Session Defaults' : 'Session Status';
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
        btnCodexSettingsSave.textContent = codexState.settingsSaving ? 'Saving...' : 'Save';
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
    codexRuntimePanel.hidden = !shouldShowPanel;
    if (!shouldShowPanel) {
        return;
    }

    if (codexRuntimeDiff) {
        codexRuntimeDiff.textContent = codexState.runtimeDiff || 'Waiting for diff updates...';
    }
    if (codexRuntimePlan) {
        codexRuntimePlan.textContent = codexState.runtimePlan || 'Waiting for plan updates...';
    }
    if (codexRuntimeReasoning) {
        codexRuntimeReasoning.textContent = codexState.runtimeReasoning || 'Waiting for reasoning updates...';
    }
    if (codexRuntimeTerminal) {
        codexRuntimeTerminal.textContent = codexState.runtimeTerminalOutput || 'Waiting for command output...';
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
    if (!shouldShowCodexSettingsPanel()) {
        return;
    }
    if (codexState.capabilities.modelConfig !== true) {
        return;
    }
    if (codexState.modelListRequested || codexState.settingsLoadingModels) {
        return;
    }
    refreshCodexModelList({ silent: true });
}

function refreshCodexModelList(options) {
    const opts = options || {};
    if (codexState.capabilities.modelConfig !== true) {
        return Promise.resolve([]);
    }

    codexState.modelListRequested = true;
    codexState.settingsLoadingModels = true;
    if (opts.silent !== true) {
        setCodexSettingsStatus('Refreshing model list...', '');
    } else {
        renderCodexSettingsPanel();
    }

    return sendCodexBridgeRequest('model/list', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            codexState.modelOptions = normalizeCodexModelOptions(result);
            if (opts.silent !== true) {
                setCodexSettingsStatus('Model list refreshed.', 'success');
            }
            renderCodexSettingsPanel();
            return codexState.modelOptions;
        })
        .catch((error) => {
            codexState.modelListRequested = false;
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : 'Failed to load models.';
                setCodexSettingsStatus(message, 'error');
                appendCodexLogEntry('error', message, { meta: 'models' });
            }
            return [];
        })
        .finally(() => {
            codexState.settingsLoadingModels = false;
            renderCodexSettingsPanel();
        });
}

function refreshCodexRateLimits(options) {
    const opts = options || {};
    if (codexState.capabilities.rateLimitsRead !== true) {
        return Promise.resolve(null);
    }

    codexState.settingsRefreshingRateLimits = true;
    if (opts.silent !== true) {
        setCodexSettingsStatus('Refreshing rate limits...', '');
    } else {
        renderCodexSettingsPanel();
    }

    return sendCodexBridgeRequest('account/rateLimits/read', undefined, { suppressErrorUi: opts.silent === true })
        .then((result) => {
            applyCodexRateLimit(result);
            if (opts.silent !== true) {
                setCodexSettingsStatus('Rate limit snapshot refreshed.', 'success');
            }
            renderCodexSettingsPanel();
            return result;
        })
        .catch((error) => {
            if (opts.silent !== true) {
                const message = error && error.message ? error.message : 'Failed to read rate limits.';
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
        setCodexSettingsStatus('Cannot save settings before the session is connected.', 'error');
        return Promise.resolve(null);
    }
    if (!isCodexSettingsDirty()) {
        setCodexSettingsStatus('No setting changes to save.', '');
        return Promise.resolve(null);
    }

    codexState.settingsSaving = true;
    setCodexSettingsStatus('Saving session defaults...', '');
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
            syncCodexSettingsFormFromStoredConfig();
            setCodexSettingsStatus('Session defaults saved.', 'success');
            appendCodexLogEntry('system', 'Session-level Codex defaults updated.', { meta: 'settings' });
            return body;
        })
        .catch((error) => {
            const message = error && error.message ? error.message : 'Failed to save session defaults.';
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
    codexState.streamingItemId = '';
    codexState.tokenUsageSummary = '';
    codexState.historyListLoading = false;
    codexState.historyActionThreadId = '';
    codexState.storedCodexConfig = null;
    codexState.modelOptions = [];
    codexState.modelListRequested = false;
    codexState.settingsLoadingModels = false;
    codexState.settingsSaving = false;
    codexState.settingsRefreshingRateLimits = false;
    codexState.settingsStatusText = '';
    codexState.settingsStatusTone = '';
    codexState.runtimeDiff = '';
    codexState.runtimePlan = '';
    codexState.runtimeReasoning = '';
    codexState.runtimeTerminalOutput = '';
    codexState.runtimeWarning = '';
    codexState.configWarningText = '';
    codexState.deprecationNoticeText = '';
    codexState.initialSessionInfoReceived = false;
    codexState.initialCapabilitiesReceived = false;
    codexState.initialCodexStateReceived = false;
    codexState.bootstrapCompleted = false;
    codexState.historyListRequested = false;
    codexState.resumeAttemptedForThreadId = '';
    codexState.fallbackThreadRequested = false;
    codexState.pendingFreshThread = false;
    codexState.capabilities = {
        historyList: false,
        historyResume: false,
        modelConfig: false,
        rateLimitsRead: false,
        approvals: false,
        userInputRequest: false,
        diffPlanReasoning: false,
        skillsList: false,
        compact: false,
        imageInput: false
    };
    codexState.historyThreads = [];
    renderCodexHistoryList();
    syncCodexSettingsFormFromStoredConfig();
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
        skillsList: source.skillsList === true,
        compact: source.compact === true,
        imageInput: source.imageInput === true
    };
}

function sendCodexBridgeRequest(method, params, options) {
    const opts = options || {};
    const normalizedMethod = typeof method === 'string' ? method.trim() : '';
    if (!normalizedMethod) {
        return Promise.reject(new Error('Codex bridge request requires a method.'));
    }
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
            params: params && typeof params === 'object' ? params : undefined
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
                appendCodexLogEntry('error', error.message || 'Failed to load Codex thread history.', { meta: 'history' });
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
    appendCodexLogEntry('system', `Restoring previous Codex thread ${normalizedThreadId}...`, { meta: 'history' });
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
            appendCodexLogEntry('system', `Restored Codex thread ${resumedThreadId}.`, { meta: 'history' });
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
    appendCodexLogEntry('system', 'No restorable thread available. Creating a new Codex thread...', { meta: 'history' });
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

function sendCodexTurn(text, options) {
    const cleaned = typeof text === 'string' ? text.trim() : '';
    if (!cleaned) return;

    appendCodexLogEntry('user', cleaned, { meta: 'you' });
    if (codexState.threadId && codexState.unmaterializedThreadId === codexState.threadId) {
        codexState.unmaterializedThreadId = '';
    }
    codexState.pendingFreshThread = false;
    setCodexStatus('running', 'starting turn');

    sendCodexEnvelope({
        type: 'codex_turn',
        text: cleaned,
        forceNewThread: !!(options && options.forceNewThread),
        cwd: getConfiguredCodexCwd() || undefined
    });
}

function requestCodexNewThread(options) {
    const opts = options || {};
    if (opts.silent !== true) {
        appendCodexLogEntry('system', 'Requesting new Codex thread...', { meta: 'bridge' });
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

function renderCodexServerRequest(envelope) {
    const requestId = envelope && typeof envelope.requestId === 'string'
        ? envelope.requestId
        : '';
    const method = envelope && typeof envelope.method === 'string'
        ? envelope.method
        : 'unknown';
    if (!requestId) {
        appendCodexLogEntry('system', `Codex server request received: ${method}`, { meta: 'approval' });
        return;
    }

    const existing = codexState.requestEntryById.get(requestId);
    if (existing && existing.isConnected) {
        return;
    }

    const entry = appendCodexLogEntry(
        'system',
        resolveApprovalSummary(method, envelope.params || {}),
        { meta: 'approval', itemId: `request:${requestId}` }
    );
    if (!entry) return;

    const actions = document.createElement('div');
    actions.className = 'actions';
    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'primary';
    approveBtn.textContent = 'Approve';
    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.textContent = 'Reject';
    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    entry.appendChild(actions);
    codexState.requestEntryById.set(requestId, entry);

    const setResolved = (label) => {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        const metaNode = entry.querySelector('.meta');
        if (metaNode) {
            metaNode.textContent = `approval: ${label}`;
        }
    };

    approveBtn.addEventListener('click', () => {
        const result = buildApprovalDecisionResult(method, true);
        if (!result) return;
        if (sendCodexEnvelope({ type: 'codex_server_request_response', requestId, result })) {
            setResolved('approved');
        }
    });

    rejectBtn.addEventListener('click', () => {
        const result = buildApprovalDecisionResult(method, false);
        if (!result) return;
        if (sendCodexEnvelope({ type: 'codex_server_request_response', requestId, result })) {
            setResolved('rejected');
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
    codexState.requestEntryById.clear();
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
                    codexState.initialSessionInfoReceived = true;
                    applySessionModeLayout();
                    syncCodexSettingsFormFromStoredConfig();
                    renderCodexSettingsPanel();
                    renderCodexRuntimePanel();
                    notifyNativeSessionInfo(nextSessionId, envelope.name || '', envelope.privilegeLevel || '');
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
                    return;
                }
                if (envelope.type === 'codex_capabilities') {
                    codexState.capabilities = normalizeCodexCapabilities(envelope.capabilities);
                    codexState.initialCapabilitiesReceived = true;
                    renderCodexHistoryList();
                    renderCodexSettingsPanel();
                    renderCodexRuntimePanel();
                    maybeBootstrapCodexSession();
                    maybeLoadCodexModels();
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
                    if (Object.prototype.hasOwnProperty.call(envelope, 'tokenUsage')) {
                        applyCodexTokenUsage(envelope.tokenUsage);
                    }
                    if (Object.prototype.hasOwnProperty.call(envelope, 'rateLimitState')) {
                        applyCodexRateLimit(envelope.rateLimitState);
                    }
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
                    appendCodexLogEntry('system', `Attached to thread ${codexState.threadId}`, { meta: 'bridge' });
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
                    clearCodexErrorNotice();
                    setCodexStatus('running', 'turn started');
                    return;
                }
                if (envelope.type === 'codex_interrupt_ack') {
                    appendCodexLogEntry('system', 'Interrupt signal sent to Codex.', { meta: 'bridge' });
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
                            `Codex server request auto-handled: ${envelope.method || 'unknown'}`,
                            { meta: 'approval' }
                        );
                    }
                    return;
                }
                if (envelope.type === 'codex_error') {
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

[
    codexSettingsUseDefaults,
    codexSettingsModel,
    codexSettingsReasoning,
    codexSettingsPersonality,
    codexSettingsApproval,
    codexSettingsSandbox
].filter(Boolean).forEach((field) => {
    field.addEventListener('change', () => {
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
        sendCodexTurn(text);
        codexInput.value = '';
        codexInput.focus();
    });
}

if (codexInput) {
    codexInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const text = codexInput.value;
            sendCodexTurn(text);
            codexInput.value = '';
        }
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
appendCodexLogEntry('system', 'Codex panel ready. Start a new thread or send a prompt.', { meta: 'bridge' });
renderCodexHistoryList();
syncCodexSettingsFormFromStoredConfig();
renderCodexSettingsPanel();
renderCodexRuntimePanel();

applyRuntimeConfig(runtimeConfig, false);
loadHistoryState(getHistoryStorageKey(sessionId), true);
if (serverUrl) {
    connect();
} else {
    showStatus('Waiting for server config...');
}

