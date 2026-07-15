const t = typeof globalThis.t === 'function' ? globalThis.t : (k) => k;

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
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const connectionStatus = document.getElementById('terminal-connection-status');
const connectionLabel = document.getElementById('terminal-connection-label');
const terminalSessionLabel = document.getElementById('terminal-session-label');
const btnFitTerminal = document.getElementById('btn-fit-terminal');
const btnReconnectTerminal = document.getElementById('btn-reconnect-terminal');
const btnFullscreenTerminal = document.getElementById('btn-fullscreen-terminal');

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
    alert(t('codex.error.initFailed', { error: e.message }));
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
const runtimeServerUrlOverrides = Object.create(null);

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

function setConnectionStatus(state, message) {
    if (!connectionStatus || !connectionLabel) return;
    connectionStatus.dataset.state = state || 'idle';
    connectionLabel.textContent = message || t('terminal.status.idle');
    connectionStatus.title = connectionLabel.textContent;
}

function setActiveSessionLabel(name) {
    if (!terminalSessionLabel) return;
    terminalSessionLabel.textContent = name || t('terminal.session.pending');
    terminalSessionLabel.title = terminalSessionLabel.textContent;
}

function setWorkspaceMode(mode) {
    document.body.classList.toggle('codex-workspace-active', mode === 'codex');
}

function focusTerminalIfAppropriate() {
    if (!term || typeof term.focus !== 'function') return;
    const active = document.activeElement;
    const blocksFocus = active && active !== document.body && active !== document.documentElement && (
        active.matches('input, textarea, select, button, [contenteditable="true"]') ||
        active.closest('.modal.open, #sidebar.open, #input-overlay')
    );
    if (!blocksFocus) term.focus();
}

function syncWorkspaceControlLabels() {
    const labels = [
        [btnMenu, 'terminal.btn.menu'],
        [btnCloseSidebar, 'terminal.sidebar.close'],
        [btnFitTerminal, 'terminal.btn.fit'],
        [btnReconnectTerminal, 'terminal.btn.reconnect'],
        [btnFullscreenTerminal, document.fullscreenElement ? 'terminal.btn.exitFullscreen' : 'terminal.btn.fullscreen'],
        [document.getElementById('btn-server-manager'), 'terminal.btn.manageServers'],
        [btnNewSession, 'terminal.btn.newSession'],
        [document.getElementById('btn-paste'), 'common.paste'],
        [btnToggleInput, 'common.inputMode']
    ];
    labels.forEach(([control, key]) => {
        if (!control) return;
        const label = t(key);
        control.title = label;
        control.setAttribute('aria-label', label);
    });
    document.querySelectorAll('.key[data-key]').forEach(control => {
        if (!control.hasAttribute('aria-label')) {
            control.setAttribute('aria-label', control.dataset.key);
        }
    });
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

function hasUrlCredentials(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return Boolean(parsed.username || parsed.password);
    } catch (err) {
        return false;
    }
}

function stripUrlCredentials(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (!parsed.username && !parsed.password) {
            return rawUrl;
        }
        parsed.username = '';
        parsed.password = '';
        return parsed.toString().replace(/\/$/, '');
    } catch (err) {
        return rawUrl;
    }
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
serverState.servers = serverState.servers.map((server) => {
    if (!server || server.id !== CONFIG_SERVER_ID || typeof server.url !== 'string') {
        return server;
    }
    return { ...server, url: stripUrlCredentials(server.url) };
});

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
    const normalizedInjectedUrl = normalizeServerUrl(config.serverUrl);
    if (!normalizedInjectedUrl) {
        return false;
    }
    const injectedHasCredentials = hasUrlCredentials(normalizedInjectedUrl);
    const persistedInjectedUrl = stripUrlCredentials(normalizedInjectedUrl);
    runtimeServerUrlOverrides[CONFIG_SERVER_ID] = normalizedInjectedUrl;

    const existing = injectedHasCredentials
        ? null
        : serverState.servers.find((server) => server.url === persistedInjectedUrl);
    if (existing && existing.id !== CONFIG_SERVER_ID) {
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
        serverState.servers[existingInjectedIndex].url = persistedInjectedUrl;
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
        url: persistedInjectedUrl
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
const addServerForm = document.getElementById('add-server-form');
const inputNewServerName = document.getElementById('new-server-name');
const inputNewServerUrl = document.getElementById('new-server-url');
const serverFormStatus = document.getElementById('server-form-status');
const serverCount = document.getElementById('server-count');
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalAccept = document.getElementById('confirm-modal-accept');

const sidebarServerListEl = document.getElementById('sidebar-server-list');

let activeDialogModal = null;
const dialogRestoreTargets = new WeakMap();
let confirmationResolver = null;

function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function openDialogModal(modal, initialFocus, restoreTarget) {
    if (!modal) return;
    if (activeDialogModal && activeDialogModal !== modal) {
        activeDialogModal.setAttribute('aria-hidden', 'true');
    }
    if (!modal.classList.contains('open')) {
        const resolvedRestoreTarget = restoreTarget || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        dialogRestoreTargets.set(modal, resolvedRestoreTarget);
    }
    activeDialogModal = modal;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const target = initialFocus || getFocusableElements(modal)[0] || modal.querySelector('[role="dialog"], [role="alertdialog"]');
    requestAnimationFrame(() => target && target.focus());
}

function closeDialogModal(modal, restoreFocus = true) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (activeDialogModal === modal) {
        const remaining = Array.from(document.querySelectorAll('.modal.open'));
        activeDialogModal = remaining.length ? remaining[remaining.length - 1] : null;
        if (activeDialogModal) activeDialogModal.setAttribute('aria-hidden', 'false');
    }
    const restoreTarget = dialogRestoreTargets.get(modal);
    if (restoreFocus && restoreTarget && document.contains(restoreTarget)) restoreTarget.focus();
    dialogRestoreTargets.delete(modal);
}

function resolveConfirmation(accepted) {
    const resolve = confirmationResolver;
    confirmationResolver = null;
    closeDialogModal(confirmModal);
    if (resolve) resolve(Boolean(accepted));
}

function requestConfirmation({ title, message, confirmLabel }) {
    if (!confirmModal) return Promise.resolve(false);
    if (confirmationResolver) resolveConfirmation(false);
    confirmModalTitle.textContent = title || t('terminal.confirm.title');
    confirmModalMessage.textContent = message || '';
    confirmModalAccept.textContent = confirmLabel || t('common.delete');
    openDialogModal(confirmModal, confirmModalCancel);
    return new Promise(resolve => { confirmationResolver = resolve; });
}

document.addEventListener('keydown', event => {
    if (!activeDialogModal) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        if (activeDialogModal === confirmModal) resolveConfirmation(false);
        else closeDialogModal(activeDialogModal);
        return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(activeDialogModal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

// --- Server Manager Logic ---
function renderServerList() {
    // 1. Render for Modal (Manager)
    serverListEl.innerHTML = '';
    if (serverCount) {
        serverCount.textContent = t('terminal.server.count', { count: serverState.servers.length });
    }
    if (serverState.servers.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'server-list-empty';
        empty.textContent = t('terminal.server.empty');
        serverListEl.appendChild(empty);
    }
    serverState.servers.forEach(server => {
        const li = document.createElement('li');
        li.className = 'server-item';
        if (server.id === serverState.activeServerId) {
            li.classList.add('active-server');
        }

        const info = document.createElement('div');
        info.className = 'server-info';
        const name = document.createElement('span');
        name.className = 'server-name';
        name.textContent = server.name;
        const url = document.createElement('span');
        url.className = 'server-url';
        url.textContent = server.url;
        info.append(name, url);

        const actions = document.createElement('div');
        actions.className = 'server-actions';
        if (server.id !== serverState.activeServerId) {
            const connectButton = document.createElement('button');
            connectButton.type = 'button';
            connectButton.className = 'btn-connect';
            connectButton.dataset.id = server.id;
            connectButton.textContent = t('terminal.server.connectBtn');
            connectButton.setAttribute('aria-label', t('terminal.server.connectNamed', { name: server.name }));
            actions.appendChild(connectButton);
        } else {
            const activeLabel = document.createElement('span');
            activeLabel.className = 'server-active-label';
            activeLabel.textContent = t('terminal.badge.activeSpan');
            actions.appendChild(activeLabel);
        }
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-delete';
        deleteButton.dataset.id = server.id;
        deleteButton.textContent = t('common.delete');
        deleteButton.setAttribute('aria-label', t('terminal.server.deleteNamed', { name: server.name }));
        actions.appendChild(deleteButton);
        li.append(info, actions);
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
                statusDot.className = 'sidebar-server-status';
                statusDot.setAttribute('aria-hidden', 'true');
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
    serverListEl.querySelectorAll('.btn-connect').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setActiveServer(e.target.dataset.id);
        });
    });

    serverListEl.querySelectorAll('.server-actions .btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteServer(e.target.dataset.id);
        });
    });
}

function addServer(name, url) {
    [inputNewServerName, inputNewServerUrl].forEach(input => input && input.removeAttribute('aria-invalid'));
    if (serverFormStatus) {
        serverFormStatus.textContent = '';
        serverFormStatus.className = 'settings-form-status';
    }
    if (!name || !url) {
        if (!name && inputNewServerName) inputNewServerName.setAttribute('aria-invalid', 'true');
        if (!url && inputNewServerUrl) inputNewServerUrl.setAttribute('aria-invalid', 'true');
        if (serverFormStatus) {
            serverFormStatus.textContent = t('terminal.error.nameUrlRequired');
            serverFormStatus.classList.add('is-error');
        }
        (!name ? inputNewServerName : inputNewServerUrl)?.focus();
        return false;
    }

    // Normalize URL
    if (!url.startsWith('http')) url = 'http://' + url;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('unsupported URL');
        if (parsed.username || parsed.password) {
            inputNewServerUrl?.setAttribute('aria-invalid', 'true');
            if (serverFormStatus) {
                serverFormStatus.textContent = t('terminal.error.serverUrlCredentials');
                serverFormStatus.classList.add('is-error');
            }
            inputNewServerUrl?.focus();
            return false;
        }
        url = parsed.toString().replace(/\/$/, '');
    } catch (_error) {
        inputNewServerUrl?.setAttribute('aria-invalid', 'true');
        if (serverFormStatus) {
            serverFormStatus.textContent = t('terminal.error.invalidServerUrl');
            serverFormStatus.classList.add('is-error');
        }
        inputNewServerUrl?.focus();
        return false;
    }

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
    if (serverFormStatus) {
        serverFormStatus.textContent = t('terminal.server.added', { name });
        serverFormStatus.classList.add('is-success');
    }

    // If we just added the first/active server, try connecting
    if (serverState.servers.length === 1) {
        connect();
    }
    return true;
}

async function deleteServer(id) {
    const server = serverState.servers.find(item => item.id === id);
    if (!server) return;
    const accepted = await requestConfirmation({
        title: t('terminal.confirm.deleteServerTitle'),
        message: t('terminal.confirm.deleteServerNamed', { name: server.name }),
        confirmLabel: t('terminal.server.deleteAction')
    });
    if (!accepted) return;

    const wasActive = serverState.activeServerId === id;
    serverState.servers = serverState.servers.filter(s => s.id !== id);
    if (wasActive) {
        serverState.activeServerId = null;
        if (serverState.servers.length > 0) {
            serverState.activeServerId = serverState.servers[0].id;
        } else {
            showConnectionSettings(); // Fallback
        }
        resetConnectionForServerChange();
    }
    saveServerState();
    renderServerList();

    // If active changed (or verified same), reconnection might be needed 
    if (serverState.activeServerId && wasActive) {
        connect();
    }
    showNonBlockingNotice(t('terminal.server.deleted', { name: server.name }), 'info');
}

function resetConnectionForServerChange() {
    sessionId = null;
    localStorage.removeItem('lastSessionId');
    clearTimeout(reconnectTimer);
    isConnecting = false;
    retryCount = 0;
    if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    resetTerminalView();
}

function setActiveServer(id) {
    serverState.activeServerId = id;
    saveServerState();
    renderServerList(); // Update UI to show new active

    resetConnectionForServerChange();
    connect();
    closeDialogModal(serverManagerModal);
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
            openDialogModal(serverManagerModal, inputNewServerName, e.currentTarget);
        } catch (err) {
            showNonBlockingNotice(t('terminal.error.toolbarSettings', { error: err.message }), 'error');
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
            openDialogModal(serverManagerModal, inputNewServerName, e.currentTarget);
        } catch (err) {
            showNonBlockingNotice(t('terminal.error.openManager', { error: err.message }), 'error');
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
        closeDialogModal(serverManagerModal);
    });
}

if (addServerForm) {
    addServerForm.addEventListener('submit', event => {
        event.preventDefault();
        addServer(inputNewServerName.value.trim(), inputNewServerUrl.value.trim());
    });
}

// Sidebar Add Server Button
const btnSidebarAddServer = document.getElementById('btn-sidebar-add-server');
if (btnSidebarAddServer) {
    btnSidebarAddServer.addEventListener('click', event => {
        // Open the manager modal directly
        renderServerList();
        openDialogModal(serverManagerModal, inputNewServerName, event.currentTarget);
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === serverManagerModal) {
        closeDialogModal(serverManagerModal);
    } else if (e.target === confirmModal) {
        resolveConfirmation(false);
    }
});

if (confirmModalCancel) confirmModalCancel.addEventListener('click', () => resolveConfirmation(false));
if (confirmModalAccept) confirmModalAccept.addEventListener('click', () => resolveConfirmation(true));

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
    if (!active) return null;
    if (active.id === CONFIG_SERVER_ID && runtimeServerUrlOverrides[CONFIG_SERVER_ID]) {
        return runtimeServerUrlOverrides[CONFIG_SERVER_ID];
    }
    return active.url;
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

// --- Helpers ---
const connectionOverlay = document.getElementById('connection-overlay');
const serverUrlInput = document.getElementById('server-url-input');
const btnSaveConnection = document.getElementById('btn-save-connection');

function showConnectionSettings() {
    // ALWAYS open the manager if connection fails or is requested
    // The previous check (length === 0) prevented functionality when corrupted/wrong server was present
    try {
        renderServerList();
        openDialogModal(serverManagerModal, inputNewServerName);
    } catch (e) {
        showNonBlockingNotice(t('terminal.error.showSettings', { error: e.message }), 'error');
    }
}

// Legacy "Quick Connect" Support (mapped to adding a server)
if (btnSaveConnection) {
    btnSaveConnection.addEventListener('click', () => {
        let inputVal = serverUrlInput.value.trim();
        if (!inputVal) return;
        addServer('Quick Server', inputVal);
        connectionOverlay.style.display = 'none';
        closeDialogModal(serverManagerModal);
    });
}

function showStatus(msg) {
    statusOverlay.textContent = msg;
    statusOverlay.hidden = false;
}

function hideStatus() {
    statusOverlay.hidden = true;
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
async function connect() {
    if (isConnecting) return;

    const activeServer = getActiveServer();
    if (!activeServer) {
        notifyNativeConnectionState('error', 'No active server configured');
        notifyNativeError('NO_ACTIVE_SERVER', 'No active server configured');
        showStatus(t('terminal.status.noActiveServer'));
        setConnectionStatus('error', t('terminal.status.noActiveServer'));
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
        setConnectionStatus('error', t('terminal.status.wsConstructionFailed'));
        showConnectionSettings();
        return;
    }

    // Fetch a one-time WebSocket auth ticket (HTTP request carries Basic Auth)
    try {
        const normalizedBase = normalizeServerUrl(hostUrl);
        const ticketUrl = normalizedBase.replace(/\/+$/, '') + '/api/ws-ticket';
        const resp = await fetch(ticketUrl);
        if (resp.ok) {
            const { ticket } = await resp.json();
            if (ticket) {
                const parsed = new URL(wsUrl);
                parsed.searchParams.set('ticket', ticket);
                wsUrl = parsed.toString();
            }
        }
    } catch (ticketErr) {
        console.warn('Failed to fetch ws-ticket, connecting without ticket:', ticketErr.message);
    }

    const transportLabel = wsUrl.startsWith('wss://') ? 'wss' : 'ws';

    isConnecting = true;
    const connectingMessage = t('terminal.status.connecting', { name: activeServer.name, transport: transportLabel });
    showStatus(connectingMessage);
    setConnectionStatus('connecting', connectingMessage);
    notifyNativeConnectionState('connecting', connectingMessage);

    try {
        ws = new WebSocket(wsUrl);
    } catch (e) {
        console.error("URL Error", e);
        isConnecting = false;
        notifyNativeConnectionState('error', 'WebSocket construction failed');
        showStatus(t('terminal.status.wsConstructionFailed'));
        setConnectionStatus('error', t('terminal.status.wsConstructionFailed'));
        notifyNativeError('WS_CONSTRUCTION_ERROR', e.message || 'unknown');
        showConnectionSettings();
        return;
    }

    ws.onopen = () => {
        isConnecting = false;
        retryCount = 0;
        hideStatus();
        scheduleTerminalResize();
        reconnectInterval = 1000;
        const connectedMessage = t('terminal.status.connected', { name: activeServer.name, transport: transportLabel });
        setConnectionStatus('connected', connectedMessage);
        notifyNativeConnectionState('connected', `Connected to ${activeServer.name} via ${transportLabel}`);
        loadSessions(); // Refresh list on connect
        focusTerminalIfAppropriate();
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
                setActiveSessionLabel(envelope.name || envelope.sessionId);
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
            showStatus(t('terminal.status.failed'));
            setConnectionStatus('error', t('terminal.status.failed'));
            const closeDetail = `code=${event.code} reason=${event.reason || 'none'}`;
            notifyNativeConnectionState('error', `Connection closed (${closeDetail})`);
            notifyNativeError('WS_CLOSED', closeDetail);
            showConnectionSettings();
        } else {
            showStatus(t('terminal.status.reconnecting'));
            setConnectionStatus('reconnecting', t('terminal.status.reconnecting'));
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
        setConnectionStatus('error', t('terminal.status.wsTransportError', { name: activeServer.name }));
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

let resizeScheduled = false;
function scheduleTerminalResize() {
    if (resizeScheduled) return;
    resizeScheduled = true;
    const requestFrame = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(callback, 16);
    requestFrame(() => {
        resizeScheduled = false;
        sendResize();
    });
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

// --- Interaction Logic ---
term.onData(data => {
    const payload = resolveTypedInputWithModifiers(data);
    if (!payload) return;
    sendMessage({ type: 'input', data: payload });
});

window.addEventListener('resize', scheduleTerminalResize);
if (typeof ResizeObserver === 'function' && terminalContainer) {
    const terminalResizeObserver = new ResizeObserver(() => scheduleTerminalResize());
    terminalResizeObserver.observe(terminalContainer);
}
refreshModifierButtons();
renderModifierButtonState();

// Mobile: single tap opens keyboard, double tap closes it
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
}

// Workspace controls and navigation drawer
function getSidebarFocusable() {
    if (!sidebar) return [];
    return Array.from(sidebar.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
}

function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('open');
    sidebar.removeAttribute('inert');
    sidebar.setAttribute('aria-hidden', 'false');
    if (sidebarBackdrop) sidebarBackdrop.hidden = false;
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'true');
    const activeSession = sidebar.querySelector('.session-item.active .session-item-main');
    const focusTarget = activeSession || getSidebarFocusable()[0];
    if (focusTarget) requestAnimationFrame(() => focusTarget.focus());
}

function closeSidebar(restoreFocus = true) {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebar.setAttribute('inert', '');
    sidebar.setAttribute('aria-hidden', 'true');
    if (sidebarBackdrop) sidebarBackdrop.hidden = true;
    if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    if (restoreFocus && btnMenu) btnMenu.focus();
}

if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    });
}
if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', () => closeSidebar());
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => closeSidebar());

document.addEventListener('keydown', event => {
    if (!sidebar || !sidebar.classList.contains('open')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getSidebarFocusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

if (btnFitTerminal) {
    btnFitTerminal.addEventListener('click', () => {
        scheduleTerminalResize();
        if (term && typeof term.focus === 'function') term.focus();
    });
}

if (btnReconnectTerminal) {
    btnReconnectTerminal.addEventListener('click', () => {
        clearTimeout(reconnectTimer);
        isConnecting = false;
        retryCount = 0;
        if (ws) {
            ws.onclose = null;
            ws.close();
            ws = null;
        }
        setConnectionStatus('reconnecting', t('terminal.status.reconnecting'));
        connect();
    });
}

if (btnFullscreenTerminal) {
    btnFullscreenTerminal.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            else throw new Error('Fullscreen API unavailable');
        } catch (error) {
            showNonBlockingNotice(t('terminal.error.fullscreen'), 'error');
        }
    });
    document.addEventListener('fullscreenchange', () => {
        const active = Boolean(document.fullscreenElement);
        btnFullscreenTerminal.setAttribute('aria-pressed', String(active));
        const label = t(active ? 'terminal.btn.exitFullscreen' : 'terminal.btn.fullscreen');
        btnFullscreenTerminal.title = label;
        btnFullscreenTerminal.setAttribute('aria-label', label);
        scheduleTerminalResize();
    });
}

// Close sidebar when iframe (codex page) reports a click
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'close-sidebar') {
        closeSidebar(false);
    }
});

function switchSession(id) {
    // Only skip if it's the same session AND already connected (not initial load)
    var isFirstCall = !sessionId;

    if (sessionId === id && ws && ws.readyState === WebSocket.OPEN) return;

    var termView = document.getElementById('terminal-view');
    var codexView = document.getElementById('codex-view');

    // Fetch session info to check mode before deciding path
    fetch(getBaseUrl() + '/api/sessions').then(function (r) { return r.ok ? r.json() : []; }).then(function (sessions) {
        var s = sessions.find(function (sess) { return sess.id === id; });
        if (s && s.sessionMode === 'codex') {
            // Codex session: show redesigned page in iframe
            if (termView) termView.style.display = 'none';
            if (codexView) {
                codexView.style.display = '';
                var iframe = codexView.querySelector('iframe');
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.style.cssText = 'width:100%;height:100%;border:none;';
                    codexView.innerHTML = '';
                    codexView.appendChild(iframe);
                }
                iframe.src = '/codex_client.html?sessionId=' + encodeURIComponent(id);
            }
            sessionId = id;
            setWorkspaceMode('codex');
            setActiveSessionLabel(s.name || id);
            localStorage.setItem('lastSessionId', id);
            // Close sidebar
            closeSidebar(false);
            return;
        }
        // Terminal session flow
        terminalSwitchSession(id, s);
    }).catch(function () {
        // Fallback: treat as terminal
        terminalSwitchSession(id, null);
    });

    function terminalSwitchSession(id, session) {
        sessionId = id;
        setWorkspaceMode('terminal');
        setActiveSessionLabel((session && session.name) || id);
        localStorage.setItem('lastSessionId', id);
        if (codexView) codexView.style.display = 'none';
        if (termView) termView.style.display = '';

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

        const newUrl = new URL(window.location);
        newUrl.searchParams.set('sessionId', id);
        if (!isFileProtocol) window.history.replaceState({}, '', newUrl);

        // Close sidebar
        closeSidebar(false);
    }
}

// Load Sessions
async function loadSessions() {
    try {
        const baseUrl = getBaseUrl();
        if (!baseUrl) {
            renderSessionListState(t('terminal.status.noServerSelected'));
            return;
        }

        const res = await fetch(`${baseUrl}/api/sessions`);
        if (!res.ok) throw new Error('Network response was not ok');

        const sessions = await res.json();

        sessionList.innerHTML = '';
        if (sessions.length === 0) {
            renderSessionListState(t('terminal.status.noActiveSessions'));
            // Don't auto-create here to avoid loops if server is empty
            return;
        }

        sessions.forEach(s => {
            const li = document.createElement('li');
            li.className = 'session-item';
            li.dataset.sessionId = s.id;
            if (s.id === sessionId) li.classList.add('active');

            const main = document.createElement('button');
            main.type = 'button';
            main.className = 'session-item-main';
            main.setAttribute('aria-label', t('terminal.session.openNamed', { name: s.name }));
            const badge = document.createElement('span');
            const mode = s.sessionMode || 'terminal';
            badge.className = `sessions-mode-badge ${mode}`;
            badge.textContent = mode;
            badge.setAttribute('aria-label', t('terminal.session.modeLabel', { mode }));
            const nameSpan = document.createElement('span');
            nameSpan.className = 'session-name';
            nameSpan.textContent = s.name;
            main.append(badge, nameSpan);

            const openSession = function () {
                if (s.sessionMode === 'codex') {
                    // Codex session: show redesigned page in iframe
                    var termView = document.getElementById('terminal-view');
                    var codexView = document.getElementById('codex-view');
                    if (termView) termView.style.display = 'none';
                    if (codexView) {
                        codexView.style.display = '';
                        var iframe = codexView.querySelector('iframe');
                        if (!iframe) {
                            iframe = document.createElement('iframe');
                            iframe.style.cssText = 'width:100%;height:100%;border:none;';
                            codexView.innerHTML = '';
                            codexView.appendChild(iframe);
                        }
                        iframe.src = '/codex_client.html?sessionId=' + encodeURIComponent(s.id);
                    }
                    sessionId = s.id;
                    setWorkspaceMode('codex');
                    setActiveSessionLabel(s.name || s.id);
                    localStorage.setItem('lastSessionId', s.id);
                    closeSidebar(false);
                    return;
                }
                switchSession(s.id);
            };
            main.addEventListener('click', openSession);

            // Delete button
            const del = document.createElement('button');
            del.textContent = '×';
            del.className = 'btn-delete-session';
            del.title = t('terminal.session.deleteTitle');
            del.setAttribute('aria-label', t('terminal.session.deleteNamed', { name: s.name }));
            del.dataset.id = s.id;
            del.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteSession(s.id, s.name);
            });

            li.appendChild(main);
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
        renderSessionListState(t('terminal.status.connectionFailed'), 'error');
        // Do NOT block UI or throw
    }
}

function renderSessionListState(message, tone = 'muted') {
    sessionList.innerHTML = '';
    const item = document.createElement('li');
    item.className = `session-list-state is-${tone}`;
    item.textContent = message;
    sessionList.appendChild(item);
}

async function deleteSession(id, name) {
    const accepted = await requestConfirmation({
        title: t('terminal.confirm.deleteSessionTitle'),
        message: t('terminal.confirm.deleteSessionNamed', { name: name || id }),
        confirmLabel: t('terminal.session.deleteAction')
    });
    if (!accepted) return;
    try {
        const baseUrl = getBaseUrl();
        if (!baseUrl) return;

        const res = await fetch(`${baseUrl}/api/sessions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            if (id === sessionId) {
                sessionId = null; // Forces switch to another or pull new
            }
            await loadSessions();
            showNonBlockingNotice(t('terminal.session.deleted', { name: name || id }), 'info');
        } else {
            showNonBlockingNotice(t('terminal.error.deleteSession'), 'error');
        }
    } catch (e) {
        console.error('Delete error:', e);
        showNonBlockingNotice(t('terminal.error.deleteSession'), 'error');
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
                showNonBlockingNotice(t('terminal.error.clipboard'), 'error');
            });
            return;
        }

        if (key === 'Ctrl' || key === 'Alt') {
            if (shortcutInput && modifierState) {
                shortcutInput.handleModifierTap(modifierState, key, Date.now());
                renderModifierButtonState();
            }
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
            term.focus();
            return;
        }

        if (handleLocalViewportScrollKey(key)) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
            term.focus();
            return;
        }

        let sent = false;
        const data = resolveInputWithModifiers(key);
        if (data.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'input', data: data });
            sent = true;
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
(async () => {
    if (typeof i18n !== 'undefined') {
        try {
            const i18nReady = window.__TERMLINK_I18N_READY__ || i18n.init();
            window.__TERMLINK_I18N_READY__ = i18nReady;
            await i18nReady;
        } catch (e) { console.warn('i18n init failed:', e); }
        i18n.translatePage();
    }
    syncWorkspaceControlLabels();
    setActiveSessionLabel('');
    setConnectionStatus('idle', t('terminal.status.idle'));
    loadHistoryState(getHistoryStorageKey(sessionId), true);
    connect();
})();
