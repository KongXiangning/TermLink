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
const term = new Terminal({
    cursorBlink: true,
    macOptionIsMeta: true,
    scrollback: 1000,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: { background: '#000000', foreground: '#ffffff' }
});

const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(terminalContainer);
fitAddon.fit();

// --- State ---
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
let ws;
let reconnectInterval = 1000;
let maxReconnectInterval = 30000;
let reconnectTimer;
let isConnecting = false;

const urlParams = new URLSearchParams(window.location.search);
let sessionId = urlParams.get('sessionId') || localStorage.getItem('lastSessionId');

// --- Helpers ---
function showStatus(msg) {
    statusOverlay.textContent = msg;
    statusOverlay.style.display = 'block';
}

function hideStatus() {
    statusOverlay.style.display = 'none';
}

// --- WebSocket Logic ---
function connect() {
    if (isConnecting) return;
    isConnecting = true;

    let wsUrl = `${protocol}//${host}`;
    if (sessionId) {
        wsUrl += `?sessionId=${sessionId}`;
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        isConnecting = false;
        hideStatus();
        fitAddon.fit();
        sendResize();
        reconnectInterval = 1000;
        loadSessions(); // Refresh list on connect
    };

    ws.onmessage = event => {
        try {
            const envelope = JSON.parse(event.data);
            const type = envelope.type;

            if (type === 'output') {
                term.write(envelope.data);
            } else if (type === 'session_info') {
                sessionId = envelope.sessionId;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('sessionId', sessionId);
                window.history.replaceState({}, '', newUrl);
                localStorage.setItem('lastSessionId', sessionId);

                document.title = `TermLink - ${envelope.name}`;
                loadSessions(); // Highlight active
            }
        } catch (e) {
            console.error('Error parsing message', e);
        }
    };

    ws.onclose = () => {
        isConnecting = false;
        showStatus('Disconnected. Reconnecting...');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            connect();
            reconnectInterval = Math.min(reconnectInterval * 1.5, maxReconnectInterval);
        }, reconnectInterval);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
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

// Sidebar Toggle
if (btnMenu) {
    btnMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
}
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btnMenu) {
        sidebar.classList.remove('open');
    }
});

// New Session
if (btnNewSession) {
    btnNewSession.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `Terminal ${new Date().toLocaleTimeString()}` })
            });
            const data = await res.json();
            // Switch to new session
            switchSession(data.id);
        } catch (e) {
            console.error(e);
        }
    });
}

function switchSession(id) {
    if (sessionId === id) return;
    sessionId = id;

    // Close old connection
    if (ws) {
        ws.onclose = null; // Prevent reconnect loop logic from firing
        ws.close();
        ws = null;
    }

    term.reset();
    connect();

    // URL Update
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('sessionId', id);
    window.history.replaceState({}, '', newUrl);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
    }
}

// Load Sessions
async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const sessions = await res.json();

        sessionList.innerHTML = '';
        if (sessions.length === 0 && !sessionId) {
            // No sessions? Create one.
            btnNewSession.click();
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
            del.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this session?')) {
                    await deleteSession(s.id);
                }
            });

            li.appendChild(nameSpan);
            li.appendChild(del);
            sessionList.appendChild(li);
        });

        // If current sessionId invalid (deleted), switch to first available?
        if (sessionId && !sessions.find(s => s.id === sessionId)) {
            if (sessions.length > 0) switchSession(sessions[0].id);
            else {
                sessionId = null;
                btnNewSession.click();
            }
        }

    } catch (e) {
        console.error('Failed to load sessions', e);
    }
}

async function deleteSession(id) {
    try {
        const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            if (id === sessionId) {
                sessionId = null; // Forces switch to another or pull new
            }
            loadSessions();
        } else {
            alert('Failed to delete session');
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

        let sent = false;
        if (key && ws && ws.readyState === WebSocket.OPEN) {
            let data = key;
            // Key mapping (basic)
            if (key === 'Enter') data = '\r';
            if (key === 'Tab') data = '\t';
            if (key === 'Esc') data = '\x1b';
            if (key === 'Up') data = '\x1b[A';
            if (key === 'Down') data = '\x1b[B';
            if (key === 'Ctrl-C') data = '\x03';

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

// Start
connect();
