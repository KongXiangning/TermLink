// --- DOM Elements ---
const terminalContainer = document.getElementById('terminal-container');
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('btn-menu');
const inputOverlay = document.getElementById('input-overlay');
const inputBuffer = document.getElementById('input-buffer');
const btnToggleInput = document.getElementById('btn-toggle-input');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const btnSend = document.getElementById('btn-send');
const statusOverlay = document.getElementById('status-overlay');
const sessionList = document.getElementById('session-list');
const btnNewSession = document.getElementById('btn-new-session');
const btnCtrlC = document.getElementById('btn-ctrl-c');

// --- Terminal Setup ---
// --- Terminal Setup ---
let term, fitAddon;
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
    alert("CRITICAL ERROR: Failed to initialize Terminal.\n" + e.message);
    throw e; // Stop execution
}

fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(terminalContainer);
fitAddon.fit();

// Global Error Handler for Mobile Debugging
window.onerror = function (msg, source, lineno, colno, error) {
    console.error(msg, error);
};

// --- State & Server Manager ---
const isFileProtocol = window.location.protocol === 'file:';
const HISTORY_STORAGE_PREFIX = 'termLinkHistory:';
const HISTORY_TOGGLE_KEY = 'termLinkTerminalHistoryEnabled';
const HISTORY_MAX_LINES = 1000;
const CONFIG_SERVER_ID = 'injected-terminal-config';
const initialInjectedConfig = readInjectedConfig();

let runtimeConfig = initialInjectedConfig;
let historyEnabled = resolveHistoryEnabled(initialInjectedConfig);
let historyState = { lines: [], tail: '' };
let activeHistoryKey = '';

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

function resolveHistoryEnabled(config) {
    if (typeof config.historyEnabled === 'boolean') {
        return config.historyEnabled;
    }
    return localStorage.getItem(HISTORY_TOGGLE_KEY) !== 'false';
}

function normalizeServerUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let normalized = rawUrl.trim();
    if (!normalized) return null;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `http://${normalized}`;
    }
    while (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

function getInitialSessionId() {
    if (typeof initialInjectedConfig.sessionId === 'string' && initialInjectedConfig.sessionId.trim()) {
        return initialInjectedConfig.sessionId.trim();
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId') || localStorage.getItem('lastSessionId');
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
    if (!historyEnabled) {
        return;
    }
    try {
        const raw = sessionStorage.getItem(sessionKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.lines)) {
            historyState.lines = parsed.lines.slice(-HISTORY_MAX_LINES);
            historyState.tail = typeof parsed.tail === 'string' ? parsed.tail : '';
            if (replay) {
                const replayText = `${historyState.lines.join('')}${historyState.tail}`;
                if (replayText) {
                    term.write(replayText);
                }
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

// Default State Structure
const defaultServerState = {
    servers: [],
    activeServerId: null
};

// Load State
let serverState = defaultServerState;
try {
    const stored = localStorage.getItem('termLinkServerState');
    if (stored) {
        serverState = JSON.parse(stored);
    }
} catch (e) {
    console.error('Failed to parse server state', e);
    // serverState remains default
}

// Ensure servers is array (migration safety)
if (!Array.isArray(serverState.servers)) {
    serverState.servers = [];
}

// Migration: If we have old 'serverUrl' but no servers, add it
const oldServerUrl = localStorage.getItem('serverUrl');
if (serverState.servers.length === 0 && oldServerUrl) {
    const newId = Date.now().toString();
    serverState.servers.push({ id: newId, name: 'Default Server', url: oldServerUrl });
    serverState.activeServerId = newId;
    localStorage.removeItem('serverUrl'); // Cleanup
    saveServerState();
}
// Migration: If purely local dev (browser) and empty, add localhost
else if (serverState.servers.length === 0 && !isFileProtocol) {
    const newId = Date.now().toString();
    serverState.servers.push({ id: newId, name: 'Localhost', url: window.location.origin });
    serverState.activeServerId = newId;
    saveServerState();
}

function saveServerState() {
    localStorage.setItem('termLinkServerState', JSON.stringify(serverState));
}

function getActiveServer() {
    return serverState.servers.find(s => s.id === serverState.activeServerId);
}

function applyInjectedServerConfig(config) {
    const normalizedUrl = normalizeServerUrl(config.serverUrl);
    if (!normalizedUrl) {
        return false;
    }

    const existing = serverState.servers.find((server) => server.url === normalizedUrl);
    if (existing) {
        serverState.activeServerId = existing.id;
        saveServerState();
        return true;
    }

    const existingInjectedIndex = serverState.servers.findIndex((server) => server.id === CONFIG_SERVER_ID);
    if (existingInjectedIndex >= 0) {
        const profileName = (
            config.activeProfile &&
            typeof config.activeProfile === 'object' &&
            typeof config.activeProfile.name === 'string' &&
            config.activeProfile.name.trim()
        )
            ? config.activeProfile.name.trim()
            : 'Injected Server';
        serverState.servers[existingInjectedIndex].name = profileName;
        serverState.servers[existingInjectedIndex].url = normalizedUrl;
        serverState.activeServerId = CONFIG_SERVER_ID;
        saveServerState();
        return true;
    }

    const profileName = (
        config.activeProfile &&
        typeof config.activeProfile === 'object' &&
        typeof config.activeProfile.name === 'string' &&
        config.activeProfile.name.trim()
    )
        ? config.activeProfile.name.trim()
        : 'Injected Server';

    serverState.servers.push({
        id: CONFIG_SERVER_ID,
        name: profileName,
        url: normalizedUrl
    });
    serverState.activeServerId = CONFIG_SERVER_ID;
    saveServerState();
    return true;
}

function applyRuntimeConfig(config, forceReconnect) {
    if (!config || typeof config !== 'object') return;
    runtimeConfig = config;

    const previousSessionId = sessionId;
    const previousServerId = serverState.activeServerId;

    historyEnabled = resolveHistoryEnabled(config);

    const sessionFromConfig = (typeof config.sessionId === 'string' && config.sessionId.trim())
        ? config.sessionId.trim()
        : null;
    if (sessionFromConfig) {
        sessionId = sessionFromConfig;
        localStorage.setItem('lastSessionId', sessionId);
    }

    const serverChanged = applyInjectedServerConfig(config) && previousServerId !== serverState.activeServerId;
    const sessionChanged = sessionId !== previousSessionId;

    if (forceReconnect && (serverChanged || sessionChanged)) {
        clearTimeout(reconnectTimer);
        isConnecting = false;
        retryCount = 0;
        if (ws) {
            ws.onclose = null;
            ws.close();
            ws = null;
        }
        resetTerminalView();
        connect();
    } else if (sessionChanged) {
        loadHistoryState(getHistoryStorageKey(sessionId), true);
    }

    renderServerList();
}

// --- DOM Elements (Server Manager) ---
const btnServerManager = document.getElementById('btn-server-manager');
const serverManagerModal = document.getElementById('server-manager-modal');
const btnCloseServerManager = document.getElementById('btn-close-server-manager');
const serverListEl = document.getElementById('server-list');
const btnAddServer = document.getElementById('btn-add-server');
const inputNewServerName = document.getElementById('new-server-name');
const inputNewServerUrl = document.getElementById('new-server-url');

const sidebarServerListEl = document.getElementById('sidebar-server-list');

// --- Server Manager Logic ---
function renderServerList() {
    // 1. Render for Modal (Manager)
    serverListEl.innerHTML = '';
    serverState.servers.forEach(server => {
        const li = document.createElement('li');
        li.className = 'server-item';
        if (server.id === serverState.activeServerId) {
            li.classList.add('active-server');
        }

        li.innerHTML = `
            <div class="server-info">
                <span class="server-name">${server.name}</span>
                <span class="server-url">${server.url}</span>
            </div>
            <div class="server-actions">
                ${server.id !== serverState.activeServerId ? `<button class="btn-connect" data-id="${server.id}">Connect</button>` : '<span>Active</span>'}
                <button class="btn-delete" data-id="${server.id}">🗑️</button>
            </div>
        `;
        serverListEl.appendChild(li);
    });

    // 2. Render for Sidebar (Quick Switch)
    if (sidebarServerListEl) {
        sidebarServerListEl.innerHTML = '';
        serverState.servers.forEach(server => {
            const li = document.createElement('li');
            li.className = 'sidebar-server-item';
            if (server.id === serverState.activeServerId) {
                li.classList.add('active');
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = server.name;

            // Status indicator (simple dot if active)
            if (server.id === serverState.activeServerId) {
                const statusDot = document.createElement('span');
                statusDot.textContent = '●';
                statusDot.style.color = 'var(--primary-color)';
                statusDot.style.marginRight = '8px';
                li.prepend(statusDot);
            }

            li.appendChild(nameSpan);

            // Switch on click
            li.addEventListener('click', () => {
                if (server.id !== serverState.activeServerId) {
                    setActiveServer(server.id);
                    // Close sidebar on mobile after switch? Maybe keep open to see sessions load?
                    // Let's keep it open.
                }
            });

            sidebarServerListEl.appendChild(li);
        });
    }

    // Event Listeners for generated buttons (Modal)
    document.querySelectorAll('.btn-connect').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setActiveServer(e.target.dataset.id);
        });
    });

    document.querySelectorAll('.server-actions .btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteServer(e.target.dataset.id);
        });
    });
}

function addServer(name, url) {
    if (!name || !url) {
        showNonBlockingNotice('Name and URL are required', 'error');
        return;
    }

    // Normalize URL
    if (!url.startsWith('http')) url = 'http://' + url;
    while (url.endsWith('/')) url = url.slice(0, -1);

    const newId = Date.now().toString();
    const newServer = { id: newId, name, url };

    serverState.servers.push(newServer);

    // If it's the first one, make it active
    if (serverState.servers.length === 1) {
        serverState.activeServerId = newId;
    }

    saveServerState();
    renderServerList();

    inputNewServerName.value = '';
    inputNewServerUrl.value = '';

    // If we just added the first/active server, try connecting
    if (serverState.servers.length === 1) {
        connect();
    }
}

function deleteServer(id) {
    if (!confirm('Delete this server configuration?')) return;

    serverState.servers = serverState.servers.filter(s => s.id !== id);
    if (serverState.activeServerId === id) {
        serverState.activeServerId = null;
        // If we have other servers, maybe switch to first?
        if (serverState.servers.length > 0) {
            serverState.activeServerId = serverState.servers[0].id;
        } else {
            // No servers left
            if (ws) ws.close();
            resetTerminalView();
            showConnectionSettings(); // Fallback
        }
    }
    saveServerState();
    renderServerList();

    // If active changed (or verified same), reconnection might be needed 
    if (serverState.activeServerId && id === serverState.activeServerId) {
        connect();
    }
}

function setActiveServer(id) {
    serverState.activeServerId = id;
    saveServerState();
    renderServerList(); // Update UI to show new active

    // Reconnect
    sessionId = null; // Clear session ID as it belongs to old server
    localStorage.removeItem('lastSessionId');

    // Reset Connection State (Fix for hanging)
    clearTimeout(reconnectTimer);
    isConnecting = false;
    retryCount = 0;

    if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    resetTerminalView();
    connect();
    serverManagerModal.classList.remove('open');
}

// --- UI Event Listeners ---
// DEBUG: DOM Check
if (!btnServerManager) console.error('Error: Sidebar Config Button NOT found');

const btnSettingsToolbar = document.getElementById('btn-settings-toolbar');
if (btnSettingsToolbar) {
    const openToolbarSettings = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            renderServerList();
            serverManagerModal.classList.add('open');
            serverManagerModal.style.display = ''; // Clear any inline style
        } catch (err) {
            showNonBlockingNotice("Error in toolbar settings: " + err.message, 'error');
        }
    };
    btnSettingsToolbar.addEventListener('click', openToolbarSettings);
    btnSettingsToolbar.addEventListener('touchstart', openToolbarSettings);
}

if (btnServerManager) {
    const openManager = (e) => {
        e.stopPropagation();
        try {
            renderServerList();
            serverManagerModal.classList.add('open');
            serverManagerModal.style.display = ''; // Clear any inline style
        } catch (err) {
            showNonBlockingNotice("Error opening manager: " + err.message, 'error');
        }
    };

    // Add both click and touchstart to ensure it captures
    btnServerManager.addEventListener('click', openManager);
    btnServerManager.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent double-fire on some devices if click follows
        openManager(e);
    });
}

if (btnCloseServerManager) {
    btnCloseServerManager.addEventListener('click', () => {
        serverManagerModal.classList.remove('open');
    });
}

if (btnAddServer) {
    btnAddServer.addEventListener('click', () => {
        addServer(inputNewServerName.value.trim(), inputNewServerUrl.value.trim());
    });
}

// Sidebar Add Server Button
const btnSidebarAddServer = document.getElementById('btn-sidebar-add-server');
if (btnSidebarAddServer) {
    btnSidebarAddServer.addEventListener('click', () => {
        // Open the manager modal directly
        renderServerList();
        serverManagerModal.classList.add('open');
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === serverManagerModal) {
        serverManagerModal.classList.remove('open');
    }
});

let ws;
let reconnectInterval = 1000;
let maxReconnectInterval = 30000;
let reconnectTimer;
let isConnecting = false;
let retryCount = 0;
const MAX_RETRIES = 3;

let sessionId = getInitialSessionId();

applyRuntimeConfig(initialInjectedConfig, false);

// --- Helper: Get API URL ---
function getBaseUrl() {
    const active = getActiveServer();
    return active ? active.url : null;
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

    if (targetSessionId && String(targetSessionId).trim()) {
        parsed.searchParams.set('sessionId', String(targetSessionId).trim());
    } else {
        parsed.searchParams.delete('sessionId');
    }

    return parsed.toString();
}

// --- Helpers ---
const connectionOverlay = document.getElementById('connection-overlay');
const serverUrlInput = document.getElementById('server-url-input');
const btnSaveConnection = document.getElementById('btn-save-connection');

function showConnectionSettings() {
    // ALWAYS open the manager if connection fails or is requested
    // The previous check (length === 0) prevented functionality when corrupted/wrong server was present
    try {
        renderServerList();
        serverManagerModal.classList.add('open');
    } catch (e) {
        showNonBlockingNotice("Error showing settings: " + e.message, 'error');
    }
}

// Legacy "Quick Connect" Support (mapped to adding a server)
if (btnSaveConnection) {
    btnSaveConnection.addEventListener('click', () => {
        let inputVal = serverUrlInput.value.trim();
        if (!inputVal) return;
        addServer('Quick Server', inputVal);
        connectionOverlay.style.display = 'none';
        serverManagerModal.classList.remove('open');
    });
}

function showStatus(msg) {
    statusOverlay.textContent = msg;
    statusOverlay.style.display = 'block';
}

function hideStatus() {
    statusOverlay.style.display = 'none';
}

let noticeTimer = null;
function showNonBlockingNotice(message, level = 'info') {
    if (!message) return;
    const normalizedLevel = String(level || 'info').toUpperCase();
    if (normalizedLevel === 'ERROR') {
        console.error(message);
    } else {
        console.warn(message);
    }
    showStatus(message);
    if (noticeTimer) {
        clearTimeout(noticeTimer);
    }
    noticeTimer = setTimeout(() => {
        hideStatus();
        noticeTimer = null;
    }, normalizedLevel === 'ERROR' ? 4500 : 2500);
}

// --- WebSocket Logic ---
function connect() {
    if (isConnecting) return;

    const activeServer = getActiveServer();
    if (!activeServer) {
        notifyNativeConnectionState('error', 'No active server configured');
        notifyNativeError('NO_ACTIVE_SERVER', 'No active server configured');
        showConnectionSettings();
        return;
    }

    const hostUrl = activeServer.url;
    let wsUrl;
    try {
        wsUrl = buildWsUrl(hostUrl, sessionId);
    } catch (error) {
        isConnecting = false;
        const detail = error && error.message ? error.message : 'Invalid websocket URL';
        notifyNativeConnectionState('error', detail);
        notifyNativeError('INVALID_WS_URL', `${hostUrl || ''} (${detail})`);
        showConnectionSettings();
        return;
    }
    const transportLabel = wsUrl.startsWith('wss://') ? 'wss' : 'ws';

    isConnecting = true;
    const connectingMessage = `Connecting to ${activeServer.name} (${transportLabel})...`;
    showStatus(connectingMessage);
    notifyNativeConnectionState('connecting', connectingMessage);

    try {
        ws = new WebSocket(wsUrl);
    } catch (e) {
        console.error("URL Error", e);
        isConnecting = false;
        notifyNativeConnectionState('error', 'WebSocket construction failed');
        notifyNativeError('WS_CONSTRUCTION_ERROR', e.message || 'unknown');
        showConnectionSettings();
        return;
    }

    ws.onopen = () => {
        isConnecting = false;
        retryCount = 0;
        hideStatus();
        fitAddon.fit();
        sendResize();
        reconnectInterval = 1000;
        notifyNativeConnectionState('connected', `Connected to ${activeServer.name} via ${transportLabel}`);
        loadSessions(); // Refresh list on connect
    };

    ws.onmessage = event => {
        try {
            const envelope = JSON.parse(event.data);
            const type = envelope.type;

            if (type === 'output') {
                const output = typeof envelope.data === 'string'
                    ? envelope.data
                    : String(envelope.data ?? '');
                term.write(output);
                appendHistoryChunk(output);
            } else if (type === 'session_info') {
                const previousSessionId = sessionId;
                sessionId = envelope.sessionId;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('sessionId', sessionId);
                if (!isFileProtocol) {
                    window.history.replaceState({}, '', newUrl);
                }
                localStorage.setItem('lastSessionId', sessionId);
                if (sessionId !== previousSessionId) {
                    activeHistoryKey = getHistoryStorageKey(sessionId);
                    persistHistoryState();
                }

                document.title = `TermLink - ${envelope.name}`;
                notifyNativeSessionInfo(envelope.sessionId, envelope.name || '');
                loadSessions(); // Highlight active
            }
        } catch (e) {
            console.error('Error parsing message', e);
            notifyNativeError('MESSAGE_PARSE_FAILED', e.message || 'Unknown message parsing error');
        }
    };

    ws.onclose = (event) => {
        isConnecting = false;
        if (retryCount >= MAX_RETRIES) {
            showStatus('Connection failed.');
            const closeDetail = `code=${event.code} reason=${event.reason || 'none'}`;
            notifyNativeConnectionState('error', `Connection closed (${closeDetail})`);
            notifyNativeError('WS_CLOSED', closeDetail);
            showConnectionSettings();
        } else {
            showStatus('Disconnected. Reconnecting...');
            notifyNativeConnectionState('reconnecting', `attempt=${retryCount + 1}`);
            retryCount++;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                connect();
                reconnectInterval = Math.min(reconnectInterval * 1.5, maxReconnectInterval);
            }, reconnectInterval);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        notifyNativeError('WS_ERROR', `WebSocket transport error to ${activeServer.name}`);
    };
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

// --- Interaction Logic ---
term.onData(data => {
    sendMessage({ type: 'input', data: data });
});

window.addEventListener('resize', sendResize);

// Mobile: single tap opens keyboard, double tap or long press closes it
const isTouchDevice = (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
);
if (terminalContainer && isTouchDevice) {
    let longPressTimer = null;
    let lastTapAt = 0;
    let suppressNextClickFocus = false;

    const closeSoftKeyboard = () => {
        const activeEl = document.activeElement;
        term.blur();
        if (activeEl && typeof activeEl.blur === 'function') {
            activeEl.blur();
        }
    };

    const clearLongPressTimer = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    terminalContainer.addEventListener('touchstart', () => {
        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
            closeSoftKeyboard();
            suppressNextClickFocus = true;
            longPressTimer = null;
        }, 550);
    }, { passive: true });

    terminalContainer.addEventListener('touchmove', clearLongPressTimer, { passive: true });
    terminalContainer.addEventListener('touchcancel', clearLongPressTimer, { passive: true });
    terminalContainer.addEventListener('touchend', () => {
        clearLongPressTimer();
        const now = Date.now();
        if (now - lastTapAt < 320) {
            closeSoftKeyboard();
            suppressNextClickFocus = true;
            lastTapAt = 0;
            return;
        }
        lastTapAt = now;
    }, { passive: true });

    terminalContainer.addEventListener('dblclick', () => {
        closeSoftKeyboard();
        suppressNextClickFocus = true;
    });

    terminalContainer.addEventListener('click', () => {
        const termTextarea = term && term.textarea;
        if (!termTextarea) return;

        if (suppressNextClickFocus) {
            suppressNextClickFocus = false;
            return;
        }

        term.focus();
    });
}

// Sidebar Toggle
if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
    });
}
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btnMenu) {
        sidebar.classList.remove('open');
    }
});

// --- DOM Elements (New Session) ---
const newSessionModal = document.getElementById('new-session-modal');
const btnCloseNewSession = document.getElementById('btn-close-new-session');
const btnCreateSession = document.getElementById('btn-create-session');
const sessionNameInput = document.getElementById('session-name-input');
const serverSelectInput = document.getElementById('server-select-input');

// --- Session & Server Logic ---

// Open New Session Modal
if (btnNewSession) {
    btnNewSession.addEventListener('click', () => {
        // Populate server select
        serverSelectInput.innerHTML = '';
        if (serverState.servers.length === 0) {
            showNonBlockingNotice("No servers configured. Please add a server first.", 'error');
            renderServerList();
            serverManagerModal.classList.add('open');
            return;
        }

        serverState.servers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name + (s.id === serverState.activeServerId ? ' (Active)' : '');
            if (s.id === serverState.activeServerId) opt.selected = true;
            serverSelectInput.appendChild(opt);
        });

        sessionNameInput.value = `Terminal ${new Date().toLocaleTimeString()}`;
        newSessionModal.classList.add('open');
        sessionNameInput.focus();
    });
}

// Close Modal
if (btnCloseNewSession) {
    btnCloseNewSession.addEventListener('click', () => {
        newSessionModal.classList.remove('open');
    });
}

// Create Session Action
if (btnCreateSession) {
    btnCreateSession.addEventListener('click', async () => {
        const name = sessionNameInput.value.trim() || 'Untitled Session';
        const targetServerId = serverSelectInput.value;
        const targetServer = serverState.servers.find(s => s.id === targetServerId);

        if (!targetServer) {
            showNonBlockingNotice('Invalid server selection', 'error');
            return;
        }

        // If target is different from active, switch first
        if (targetServerId !== serverState.activeServerId) {
            // We switch active server physically in state
            serverState.activeServerId = targetServerId;
            saveServerState();
            renderServerList(); // Update manager UI if open (it's not)

            // Disconnect current
            if (ws) {
                ws.onclose = null;
                ws.close();
                ws = null;
            }
            resetTerminalView();
            term.write(`\r\n\x1b[33mSwitching to server: ${targetServer.name}...\x1b[0m\r\n`);
        }

        // Now creating session on (potentially new) active server
        newSessionModal.classList.remove('open');
        await createSessionOnActive(name);
    });
}

// Helper: Create Session on (assumed) active server
async function createSessionOnActive(name) {
    try {
        const baseUrl = getBaseUrl();
        if (!baseUrl) {
            showConnectionSettings();
            return;
        }

        // If not connected yet, connect() will happen in switchSession or manual connect
        // But to create a session we need HTTP access to the server.
        // We assume HTTP is reachable if we are trying to create a session.

        const res = await fetch(`${baseUrl}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        // Switch to new session (triggers connect if needed)
        switchSession(data.id);

    } catch (e) {
        console.error(e);
        showNonBlockingNotice(`Failed to create session: ${e.message}. Check server connection.`, 'error');
        // If failed, maybe we are not connected?
        connect();
    }
}

function switchSession(id) {
    if (sessionId === id && ws && ws.readyState === WebSocket.OPEN) return;

    sessionId = id;
    localStorage.setItem('lastSessionId', id);

    // Reset Connection State
    clearTimeout(reconnectTimer);
    isConnecting = false;
    retryCount = 0;

    // Close old connection if open
    if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
    }

    resetTerminalView();
    connect(); // This will use activeServer + new sessionId

    // URL Update
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('sessionId', id);
    if (!isFileProtocol) window.history.replaceState({}, '', newUrl);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
    }
}

// Load Sessions
async function loadSessions() {
    try {
        const baseUrl = getBaseUrl();
        if (!baseUrl) {
            sessionList.innerHTML = '<li style="padding:15px; color:#666">No Server Selected</li>';
            return;
        }

        const res = await fetch(`${baseUrl}/api/sessions`);
        if (!res.ok) throw new Error('Network response was not ok');

        const sessions = await res.json();

        sessionList.innerHTML = '';
        if (sessions.length === 0) {
            sessionList.innerHTML = '<li style="padding:15px; color:#666">No Active Sessions</li>';
            // Don't auto-create here to avoid loops if server is empty
            return;
        }

        sessions.forEach(s => {
            const li = document.createElement('li');
            li.className = 'session-item';
            if (s.id === sessionId) li.classList.add('active');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'session-name';
            nameSpan.textContent = s.name;

            li.addEventListener('click', () => switchSession(s.id));

            // Delete button
            const del = document.createElement('button');
            del.textContent = '×';
            del.className = 'btn-delete-session';
            del.title = 'Delete Session';
            del.dataset.id = s.id;
            del.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteSession(s.id);
            });

            li.appendChild(nameSpan);
            li.appendChild(del);
            sessionList.appendChild(li);
        });

        // Auto-switch safety
        if (sessionId && !sessions.find(s => s.id === sessionId)) {
            // Current session gone?
            if (sessions.length > 0) switchSession(sessions[0].id);
            else sessionId = null;
        }

    } catch (e) {
        console.error('Failed to load sessions', e);
        sessionList.innerHTML = '<li style="padding:15px; color:#f55">Connection Failed</li>';
        // Do NOT block UI or throw
    }
}

async function deleteSession(id) {
    try {
        const baseUrl = getBaseUrl();
        if (!baseUrl) return;

        const res = await fetch(`${baseUrl}/api/sessions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            if (id === sessionId) {
                sessionId = null; // Forces switch to another or pull new
            }
            loadSessions();
        } else {
            showNonBlockingNotice('Failed to delete session', 'error');
        }
    } catch (e) {
        console.error('Delete error:', e);
    }
}

// --- Virtual Keys ---
document.querySelectorAll('.key').forEach(btn => {
    const handler = (e) => {
        if (e.type === 'touchstart') e.preventDefault();

        const key = btn.dataset.key;
        if (!key && btn.id === 'btn-toggle-input') {
            inputOverlay.style.display = 'flex';
            inputBuffer.focus();
            return;
        }
        if (!key && btn.id === 'btn-paste') {
            navigator.clipboard.readText().then(text => {
                if (text && ws && ws.readyState === WebSocket.OPEN) {
                    sendMessage({ type: 'input', data: text });
                }
            }).catch(err => {
                console.error('Failed to read clipboard', err);
                showNonBlockingNotice('Clipboard access denied or not supported.', 'error');
            });
            return;
        }

        let sent = false;
        if (key && ws && ws.readyState === WebSocket.OPEN) {
            let data = key;
            // Key mapping (basic)
            if (key === 'Enter') data = '\r';
            else if (key === 'Tab') data = '\t';
            else if (key === 'Esc') data = '\x1b';
            else if (key === 'Home') data = '\x1b[H';
            else if (key === 'End') data = '\x1b[F';
            else if (key === 'PgUp') data = '\x1b[5~';
            else if (key === 'PgDn') data = '\x1b[6~';
            else if (key === 'Up') data = '\x1b[A';
            else if (key === 'Down') data = '\x1b[B';
            else if (key === 'Right') data = '\x1b[C';
            else if (key === 'Left') data = '\x1b[D';
            else if (key === 'Ctrl-C') data = '\x03';

            if (data.length > 0) {
                sendMessage({ type: 'input', data: data });
                sent = true;
            }
        }

        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 100);

        // Prevent focus loss from terminal if applicable, 
        // though typically buttons steal focus. 
        // We can refocus terminal after.
        if (sent) term.focus();
    };

    btn.addEventListener('touchstart', handler);
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        handler(e);
    });
});

// Input Overlay Logic
if (btnClose) btnClose.addEventListener('click', () => { inputOverlay.style.display = 'none'; term.focus(); });
if (btnClear) btnClear.addEventListener('click', () => { inputBuffer.value = ''; inputBuffer.focus(); });
if (btnSend) btnSend.addEventListener('click', () => {
    const text = inputBuffer.value;
    if (text) {
        sendMessage({ type: 'input', data: text + '\r' });
        inputBuffer.value = '';
        inputOverlay.style.display = 'none';
        term.focus();
    }
});

window.__applyTerminalConfig = function (config) {
    if (!config || typeof config !== 'object') return;
    window.__TERMLINK_CONFIG__ = config;
    applyRuntimeConfig(config, true);
};

// Start
loadHistoryState(getHistoryStorageKey(sessionId), true);
connect();
