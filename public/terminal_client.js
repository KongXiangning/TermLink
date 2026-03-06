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
const codexInput = document.getElementById('codex-input');
const btnCodexSend = document.getElementById('btn-codex-send');
const btnCodexToggle = document.getElementById('btn-codex-toggle');
const btnCodexNewThread = document.getElementById('btn-codex-new-thread');
const btnCodexInterrupt = document.getElementById('btn-codex-interrupt');
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
    panelCollapsed: false,
    threadId: '',
    currentTurnId: '',
    lastSnapshotThreadId: '',
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

function applySessionModeLayout() {
    if (!document.body) return;
    const mode = getConfiguredSessionMode();
    document.body.classList.toggle('terminal-only', mode !== 'codex');
    if (mode !== 'codex' && codexState.panelCollapsed) {
        codexState.panelCollapsed = false;
    }
}

function getNativeBridge() {
    return window.TerminalEventBridge;
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
}

function updateCodexThreadLabel() {
    if (!codexThreadIdText) return;
    if (!codexState.threadId) {
        codexThreadIdText.textContent = '';
        renderCodexAuxStatus();
        return;
    }
    codexThreadIdText.textContent = `thread ${codexState.threadId}`;
    renderCodexAuxStatus();
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
        }
        codexNoticeText.textContent = notice;
        codexNoticeText.classList.toggle('tone-error', tone === 'error');
        codexNoticeText.classList.toggle('tone-warn', tone === 'warn');
    }
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
    setCodexStatus('running', 'starting turn');

    sendCodexEnvelope({
        type: 'codex_turn',
        text: cleaned,
        forceNewThread: !!(options && options.forceNewThread),
        cwd: getConfiguredCodexCwd() || undefined
    });
}

function requestCodexNewThread() {
    appendCodexLogEntry('system', 'Requesting new Codex thread...', { meta: 'bridge' });
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
    if (!targetThreadId) return;
    if (!opts.force && codexState.lastSnapshotThreadId === targetThreadId) {
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
    codexLog.innerHTML = '';
    codexState.messageByItemId.clear();
    codexState.requestEntryById.clear();

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
        });
    });
    codexLog.scrollTop = codexLog.scrollHeight;
}

function handleCodexNotification(method, params) {
    if (method === 'thread/started') {
        const threadId = params && params.thread ? params.thread.id : '';
        if (threadId) {
            codexState.threadId = threadId;
            updateCodexThreadLabel();
        }
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
        clearCodexErrorNotice();
        setCodexStatus('running', 'in progress');
        return;
    }

    if (method === 'turn/completed') {
        codexState.currentTurnId = '';
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

    if (method === 'error') {
        const resolved = resolveCodexErrorMessage(params && params.code, params && params.message);
        appendCodexLogEntry('error', resolved, { meta: (params && params.code) || 'event' });
        setCodexErrorNotice(resolved);
        setCodexStatus('error', 'event error');
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
            if (codexState.threadId) {
                refreshCodexThreadSnapshot({ force: true });
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
                    notifyNativeSessionInfo(nextSessionId, envelope.name || '', envelope.privilegeLevel || '');
                    return;
                }
                if (envelope.type === 'codex_state') {
                    const previousThreadId = codexState.threadId;
                    codexState.threadId = envelope.threadId || '';
                    if (!codexState.threadId) {
                        codexState.lastSnapshotThreadId = '';
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
                    updateCodexThreadLabel();
                    setCodexStatus(envelope.status || 'idle');
                    if (codexState.threadId && codexState.threadId !== previousThreadId) {
                        refreshCodexThreadSnapshot({ threadId: codexState.threadId, force: true });
                    }
                    return;
                }
                if (envelope.type === 'codex_thread') {
                    codexState.threadId = envelope.threadId || '';
                    codexState.currentTurnId = '';
                    codexState.lastSnapshotThreadId = '';
                    clearCodexErrorNotice();
                    updateCodexThreadLabel();
                    appendCodexLogEntry('system', `Attached to thread ${codexState.threadId}`, { meta: 'bridge' });
                    setCodexStatus('idle');
                    refreshCodexThreadSnapshot({ force: true });
                    return;
                }
                if (envelope.type === 'codex_thread_ready') {
                    codexState.threadId = envelope.threadId || codexState.threadId;
                    codexState.lastSnapshotThreadId = '';
                    clearCodexErrorNotice();
                    updateCodexThreadLabel();
                    setCodexStatus('idle', 'thread ready');
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
                    const message = resolveCodexErrorMessage(envelope.code, envelope.message || 'Unknown Codex error');
                    appendCodexLogEntry('error', message, { meta: envelope.code || 'codex' });
                    setCodexErrorNotice(message);
                    setCodexStatus('error', message);
                    return;
                }
                if (envelope.type === 'codex_response') {
                    if (envelope.error && envelope.error.message) {
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

applyRuntimeConfig(runtimeConfig, false);
loadHistoryState(getHistoryStorageKey(sessionId), true);
if (serverUrl) {
    connect();
} else {
    showStatus('Waiting for server config...');
}

