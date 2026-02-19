const terminalContainer = document.getElementById('terminal-container');
const statusOverlay = document.getElementById('status-overlay');
const btnPaste = document.getElementById('btn-paste');
const inputOverlay = document.getElementById('input-overlay');
const inputBuffer = document.getElementById('input-buffer');
const btnToggleInput = document.getElementById('btn-toggle-input');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const btnSend = document.getElementById('btn-send');

let term;
let fitAddon;
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
term.open(terminalContainer);
fitAddon.fit();

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

function readInjectedConfig() {
    if (!window.__TERMLINK_CONFIG__ || typeof window.__TERMLINK_CONFIG__ !== 'object') {
        return {};
    }
    return window.__TERMLINK_CONFIG__;
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

function notifyNativeSessionInfo(id, name) {
    callNativeBridge('onSessionInfo', [id || '', name || '']);
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

    const previousServerUrl = serverUrl;
    const previousSessionId = sessionId;
    const previousHistoryEnabled = historyEnabled;

    serverUrl = normalizeServerUrl(config.serverUrl || '');
    sessionId = typeof config.sessionId === 'string' ? config.sessionId.trim() : '';
    authHeader = typeof config.authHeader === 'string' ? config.authHeader : '';
    historyEnabled = resolveHistoryEnabled(config);

    if (previousHistoryEnabled !== historyEnabled || previousSessionId !== sessionId) {
        loadHistoryState(getHistoryStorageKey(sessionId), true);
    }

    const serverChanged = serverUrl !== previousServerUrl;
    const sessionChanged = sessionId !== previousSessionId;
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

function mapVirtualKey(key) {
    switch (key) {
        case 'Enter': return '\r';
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
                    notifyNativeSessionInfo(nextSessionId, envelope.name || '');
                }
            } catch (error) {
                notifyNativeError('MESSAGE_PARSE_FAILED', error.message || 'Unknown parsing error');
                console.error('Failed to parse websocket message', error);
            }
        };

        ws.onclose = function (event) {
            console.log('[JS] WebSocket CLOSED:', event.code, event.reason);
            isConnecting = false;
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
    sendMessage({ type: 'input', data: data });
});

// ── Keyboard / viewport resize handling ─────────────────
window.addEventListener('resize', sendResize);

window.__onNativeViewportChanged = function () {
    sendResize();
};

sendResize();

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

        const mapped = mapVirtualKey(key);
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

const isTouchDevice = (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
);
if (terminalContainer && isTouchDevice) {
    let lastTapAt = 0;
    let suppressNextClickFocus = false;
    const closeKeyboard = () => {
        term.blur();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    };

    terminalContainer.addEventListener('touchend', () => {
        const now = Date.now();
        if (now - lastTapAt < 320) {
            closeKeyboard();
            suppressNextClickFocus = true;
            lastTapAt = 0;
            return;
        }
        lastTapAt = now;
        focusTerminal();
    }, { passive: true });

    terminalContainer.addEventListener('click', () => {
        if (suppressNextClickFocus) {
            suppressNextClickFocus = false;
            return;
        }
        focusTerminal();
    });

    terminalContainer.addEventListener('dblclick', () => {
        closeKeyboard();
        suppressNextClickFocus = true;
    });
} else if (terminalContainer) {
    terminalContainer.addEventListener('click', () => term.focus());
}

window.__applyTerminalConfig = function (config) {
    if (!config || typeof config !== 'object') return;
    window.__TERMLINK_CONFIG__ = config;
    applyRuntimeConfig(config, true);
};

applyRuntimeConfig(runtimeConfig, false);
loadHistoryState(getHistoryStorageKey(sessionId), true);
if (serverUrl) {
    connect();
} else {
    showStatus('Waiting for server config...');
}
