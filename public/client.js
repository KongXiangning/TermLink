// --- DOM Elements ---
const terminalContainer = document.getElementById('terminal-container');
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('btn-menu');
const terminalDrawer = document.getElementById('terminal-drawer');
const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
const drawerHandle = document.querySelector('.drawer-handle');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');
const chatHistory = document.getElementById('chat-history');
const statusOverlay = document.getElementById('status-overlay');
const btnTheme = document.getElementById('btn-theme');
const sessionList = document.getElementById('session-list');
const btnNewSession = document.getElementById('btn-new-session');
const sessionTitle = document.getElementById('session-title');

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

// --- Helper Functions ---
function showStatus(msg) {
    statusOverlay.textContent = msg;
    statusOverlay.style.display = 'flex';
}

function hideStatus() {
    statusOverlay.style.display = 'none';
}

function appendMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content; // Text content is safe

    msgDiv.appendChild(bubble);
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendApprovalCard(approval) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';

    // Check if card already exists? Idempotency on UI?
    // Not strictly needed if history is clean, but good practice.
    // For now, simple append.

    const card = document.createElement('div');
    card.className = `approval-card risk-${approval.risk}`;
    card.innerHTML = `
        <div style="font-weight:bold; margin-bottom:5px;">⚠️ Approval Required</div>
        <div style="font-family:monospace; background:rgba(0,0,0,0.3); padding:5px; border-radius:4px;">${approval.command}</div>
        <div style="font-size:0.8rem; margin-top:5px; color:#aaa;">Risk: ${approval.risk.toUpperCase()}</div>
        <div class="approval-actions">
            <button class="btn-reject">Reject</button>
            <button class="btn-approve">Run</button>
        </div>
    `;

    msgDiv.appendChild(card);
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const btnApprove = card.querySelector('.btn-approve');
    const btnReject = card.querySelector('.btn-reject');

    btnApprove.onclick = () => sendApproval(approval.id, 'approved', card);
    btnReject.onclick = () => sendApproval(approval.id, 'rejected', card);
}

function sendApproval(id, decision, cardElement) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'approval_response',
            payload: { approvalId: id, decision: decision }
        }));

        cardElement.style.opacity = '0.5';
        cardElement.style.pointerEvents = 'none';
        const status = document.createElement('div');
        status.textContent = `You ${decision} this request.`;
        status.style.textAlign = 'center';
        status.style.marginTop = '5px';
        cardElement.appendChild(status);
    }
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
        // term.write('\r\n\x1b[32m[TermLink] Connected...\x1b[0m\r\n');
        document.getElementById('connection-status').style.backgroundColor = '#28a745'; // Green
        hideStatus();
        fitAddon.fit();
        sendResize();
        reconnectInterval = 1000;

        // Refresh session list? If we had an API.
        loadSessions();
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

                sessionTitle.textContent = envelope.name || 'TermLink';

                // Restore History
                // Clear default Welcome?
                if (envelope.history && envelope.history.length > 0) {
                    chatHistory.innerHTML = '';
                    envelope.history.forEach(m => appendMessage(m.role, m.content));
                }
                if (envelope.pendingApprovals) {
                    envelope.pendingApprovals.forEach(a => appendApprovalCard(a));
                }
            } else if (type === 'chat_message') {
                const msg = envelope.payload || envelope;
                appendMessage(msg.role, msg.content);
            } else if (type === 'approval_request') {
                const approval = envelope.payload || envelope;
                appendApprovalCard(approval);
            }
        } catch (e) {
            console.error('Error parsing message', e);
        }
    };

    ws.onclose = () => {
        isConnecting = false;
        document.getElementById('connection-status').style.backgroundColor = '#dc3545'; // Red
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
    // Protocol v2: Input type
    // Handle Modifiers (Phase 2 Logic)
    let sendData = data;
    if (modifiers.Ctrl && data.length === 1) {
        const code = data.charCodeAt(0);
        if (code >= 97 && code <= 122) {
            sendData = String.fromCharCode(code - 96);
            toggleModifier('Ctrl', false);
        } else if (code >= 65 && code <= 90) {
            sendData = String.fromCharCode(code - 64);
            toggleModifier('Ctrl', false);
        }
    }

    sendMessage({ type: 'input', data: sendData });
});

window.addEventListener('resize', sendResize);

// Drawer Toggle
function toggleDrawer(force) {
    const isOpen = terminalDrawer.classList.contains('open');
    const shouldOpen = force !== undefined ? force : !isOpen;
    if (shouldOpen) {
        terminalDrawer.classList.add('open');
        fitAddon.fit();
        term.focus();
    } else {
        terminalDrawer.classList.remove('open');
    }
}
btnToggleDrawer.addEventListener('click', () => toggleDrawer());
drawerHandle.addEventListener('click', () => toggleDrawer(false));

// Sidebar Toggle
btnMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btnMenu) {
        sidebar.classList.remove('open');
    }
});

// Chat Send
function sendChat() {
    const text = chatInput.value.trim();
    if (text) {
        appendMessage('user', text); // Optimistic UI
        sendMessage({ type: 'chat', content: text, threadId: 'main' });
        chatInput.value = '';
    }
}
btnSendChat.addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
});
// Stop Button Logic
const btnStop = document.getElementById('btn-stop');

if (btnStop) {
    btnStop.addEventListener('click', () => {
        // Single Click: SIGINT (Ctrl+C) via Input
        sendMessage({
            type: 'input',
            data: '\x03'
        });
        appendMessage('system', 'Sent Interrupt (Ctrl+C)');
    });

    btnStop.addEventListener('dblclick', () => {
        // Double Click: SIGKILL (Force Kill)
        if (confirm('Force Kill Process?')) {
            sendMessage({
                type: 'signal',
                payload: { signal: 'SIGKILL' }
            });
            appendMessage('system', 'Sent SIGKILL');
        }
    });

    // Touch Long Press for Mobile?
    let pressTimer;
    btnStop.addEventListener('touchstart', (e) => {
        // e.preventDefault(); // Prevent click? No, we want click for SIGINT
        pressTimer = setTimeout(() => {
            if (confirm('Force Kill Process?')) {
                sendMessage({
                    type: 'signal',
                    payload: { signal: 'SIGKILL' }
                });
                appendMessage('system', 'Sent SIGKILL');
            }
        }, 800);
    });
    btnStop.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });
}

// New Session
btnNewSession.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/sessions', { method: 'POST' });
        const data = await res.json();
        // Redirect to new session
        window.location.href = `/?sessionId=${data.id}`;
    } catch (e) {
        console.error(e);
    }
});

// Load Sessions
async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const sessions = await res.json();
        sessionList.innerHTML = '';
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.className = 'session-item';
            if (s.id === sessionId) li.classList.add('active');
            li.textContent = `${s.name} (${new Date(s.lastActiveAt).toLocaleTimeString()})`;
            li.onclick = () => {
                window.location.href = `/?sessionId=${s.id}`;
            };
            sessionList.appendChild(li);
        });
    } catch (e) {
        console.error(e);
    }
}

// Theme Toggle
btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    term.options.theme = isLight ? { background: '#ffffff', foreground: '#000000', cursor: '#000000', selectionBackground: 'rgba(0,0,0,0.3)' }
        : { background: '#000000', foreground: '#ffffff', cursor: '#ffffff', selectionBackground: 'rgba(255,255,255,0.3)' };
});

// Toolbar Logic (Phase 2)
const modifiers = { Ctrl: false, Alt: false };

function toggleModifier(key, forceState) {
    if (forceState !== undefined) modifiers[key] = forceState;
    else modifiers[key] = !modifiers[key];
    const btn = document.querySelector(`.key[data-key="${key}"]`);
    if (btn) btn.classList.toggle('active', modifiers[key]);
}

const keyMap = { 'Esc': '\x1b', 'Tab': '\t', 'Up': '\x1b[A', 'Down': '\x1b[B', 'Right': '\x1b[C', 'Left': '\x1b[D' };

document.querySelectorAll('.key').forEach(btn => {
    const handler = (e) => {
        e.preventDefault();
        const key = btn.dataset.key;
        if (['Ctrl', 'Alt'].includes(key)) {
            toggleModifier(key);
            return;
        }
        let data = keyMap[key] || key;

        if (modifiers.Ctrl) {
            if (key === 'Up') data = '\x1b[1;5A';
            else if (key === 'Down') data = '\x1b[1;5B';
            else if (key === 'Right') data = '\x1b[1;5C';
            else if (key === 'Left') data = '\x1b[1;5D';
            toggleModifier('Ctrl', false);
        }
        sendMessage({ type: 'input', data });
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 100);
    };
    btn.addEventListener('touchstart', handler);
    btn.addEventListener('mousedown', handler);
});

// Start
connect();
