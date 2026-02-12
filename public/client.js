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
    const lastMsg = chatHistory.lastElementChild;
    // If last message is same role, append to it (Streaming support)
    if (lastMsg && lastMsg.classList.contains(role) && lastMsg.classList.contains('message')) {
        const bubble = lastMsg.querySelector('.bubble');
        if (bubble) {
            bubble.textContent += content;
            chatHistory.scrollTop = chatHistory.scrollHeight;
            return;
        }
    }

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

                // Update Provider Status
                currentProvider = envelope.provider || 'codex';
                updateStatusDisplay();

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
// --- Viewport Height Handling (Mobile Keyboard Fix) ---
function setAppHeight() {
    // visualViewport.height handles virtual keyboard better than innerHeight
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);

    // Ensure active element (input) is visible
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        setTimeout(() => {
            document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);
    }
}

// Initial Set
setAppHeight();

// Listeners
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight); // On scroll too
}
window.addEventListener('resize', setAppHeight);

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
        const providerSelect = document.getElementById('select-provider');
        const provider = providerSelect ? providerSelect.value : 'codex';

        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'standard', provider })
        });
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
        const currentSessionId = sessionId;

        sessionList.innerHTML = '';
        sessions.forEach(s => {
            const li = document.createElement('li');
            li.className = 'session-item';
            if (s.id === currentSessionId) li.classList.add('active');

            // Provider icon
            const icon = s.provider === 'gemini' ? '✨ ' : '🤖 ';

            // Session name label
            const label = document.createElement('span');
            label.className = 'session-label';
            label.textContent = icon + s.name;
            label.style.flex = '1';
            label.style.cursor = 'pointer';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';
            label.addEventListener('click', function () {
                window.location.href = '/?sessionId=' + s.id;
            });

            // Delete button
            const del = document.createElement('button');
            del.textContent = '✕';
            del.className = 'btn-delete-session';
            del.style.pointerEvents = 'auto';
            del.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                // Delete without confirm - just do it
                fetch('/api/sessions/' + s.id, { method: 'DELETE' })
                    .then(function (resp) {
                        if (resp.ok) {
                            // Force full page reload
                            if (s.id === currentSessionId) {
                                window.location.href = '/';
                            } else {
                                loadSessions();
                            }
                        } else {
                            alert('Delete failed: ' + resp.status);
                        }
                    })
                    .catch(function (err) {
                        alert('Delete error: ' + err.message);
                    });
            });

            li.appendChild(label);
            li.appendChild(del);
            sessionList.appendChild(li);
        });
    } catch (e) {
        console.error('Failed to load sessions', e);
    }
}

async function deleteSession(id) {
    console.log('[Client] deleteSession called for:', id);
    try {
        const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
        console.log('[Client] Delete response:', res.status, res.statusText);

        if (res.ok) {
            // Reload list
            await loadSessions();
            // If current session, redirect
            if (id === sessionId) {
                window.location.href = '/';
            }
        } else {
            const errText = await res.text();
            alert('Failed to delete session: ' + (errText || res.statusText));
            console.error('[Client] Delete failed:', errText);
        }
    } catch (e) {
        console.error('[Client] Delete error:', e);
        alert('Network error deleting session: ' + e.message);
    }
}

// ... existing code ...

let currentProvider = 'codex'; // Default

// WS Message Handler Update (Requires modifying ws.onmessage elsewhere, 
// but here we can add the helper function)

function updateStatusDisplay() {
    const text = document.getElementById('codex-status-text');
    const btn = document.getElementById('btn-copy-login');
    const bar = document.getElementById('codex-status-bar');

    if (!bar) return;
    bar.classList.remove('hidden');

    if (currentProvider === 'gemini') {
        text.textContent = 'Gemini: Ready';
        text.style.color = '#00ff00'; // Green
        btn.classList.add('hidden');
    } else {
        // Fallback to Polling Codex Status if current session is Codex
        checkHealth();
    }
}

// Start
connect();
// Polling for health check
setInterval(() => {
    if (currentProvider === 'codex') checkHealth();
}, 5000);

// Initial Check
checkHealth();

// Health Check
async function checkHealth() {
    if (currentProvider !== 'codex') return;

    try {
        const res = await fetch('/health');
        const data = await res.json();
        updateCodexStatus(data.codex, data.mode);
    } catch (e) {
        console.error('Health Check Failed:', e);
    }
}

function updateCodexStatus(status, mode) {
    const bar = document.getElementById('codex-status-bar');
    const text = document.getElementById('codex-status-text');
    const btn = document.getElementById('btn-copy-login');

    if (!bar) return;
    bar.classList.remove('hidden');

    if (mode === 'mock') {
        text.textContent = 'Codex: Mock Mode (Simulated)';
        btn.classList.add('hidden');
        return;
    }

    // Real or Auto
    if (!status.installed) {
        text.textContent = 'Codex: Not Installed (Using Mock)';
        text.style.color = '#ffaa00';
        btn.classList.add('hidden');
    } else if (!status.loggedIn) {
        text.textContent = 'Codex: Not Logged In';
        text.style.color = '#ff4444';
        btn.classList.remove('hidden');
        btn.onclick = () => {
            navigator.clipboard.writeText('codex login --device-auth');
            alert('Command copied: codex login --device-auth');
        };
    } else {
        text.textContent = 'Codex: Ready';
        text.style.color = '#00ff00';
        btn.classList.add('hidden');
    }
}
