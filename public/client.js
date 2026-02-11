// Initialize Terminal
const term = new Terminal({
    cursorBlink: true,
    macOptionIsMeta: true,
    scrollback: 1000,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
        background: '#000000',
    }
});

// Initialize Fit Addon
// Note: xterm-addon-fit UMD exports to window.FitAddon.FitAddon 
// or maybe just window.FitAddon?
// Usually it's window.FitAddon.FitAddon for the class.
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

const terminalContainer = document.getElementById('terminal-container');
term.open(terminalContainer);
fitAddon.fit();

// Connect to WebSocket
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
let ws;
let reconnectInterval = 1000;
let maxReconnectInterval = 30000;
let reconnectTimer;
let isConnecting = false;

const statusOverlay = document.getElementById('status-overlay');

function showStatus(msg) {
    statusOverlay.textContent = msg;
    statusOverlay.style.display = 'flex';
}

function hideStatus() {
    statusOverlay.style.display = 'none';
}

function connect() {
    if (isConnecting) return;
    isConnecting = true;

    ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = () => {
        isConnecting = false;
        term.write('\r\n\x1b[32m[TermLink] Connected to backend...\x1b[0m\r\n');
        hideStatus();
        fitAddon.fit();
        sendResize();
        reconnectInterval = 1000; // Reset backoff
    };

    ws.onmessage = event => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
                term.write(msg.data);
            }
        } catch (e) {
            console.error('Error parsing message', e);
        }
    };

    ws.onclose = () => {
        isConnecting = false;
        term.write('\r\n\x1b[31m[TermLink] Disconnected. Reconnecting...\x1b[0m\r\n');
        showStatus('Disconnected. Reconnecting...');

        // Exponential backoff
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            console.log(`Reconnecting in ${reconnectInterval}ms...`);
            connect();
            reconnectInterval = Math.min(reconnectInterval * 1.5, maxReconnectInterval);
        }, reconnectInterval);
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close(); // Ensure clean close to trigger reconnect logic
    };
}

// Initial connection
connect();

// Handle Input
term.onData(data => {
    if (ws.readyState === WebSocket.OPEN) {
        // If modifiers are active, we might need to transform this data
        // But xterm handles keyboard events -> term.onData
        // If we want visual modifiers to affect physical keyboard, we need to intercept
        // interactions OR rely on the virtual buttons.
        // For virtual buttons -> we send data directly.
        // For physical keyboard + virtual modifier -> tough without interception.
        // For Phase 1/2, let's assume modifiers mainly affect virtual keys or we send explicit sequences.
        // Actually, let's try to wrap data for physical keyboard if modifiers are active.

        let sendData = data;

        // Handle Ctrl modifier for single char inputs
        if (modifiers.Ctrl && data.length === 1) {
            const code = data.charCodeAt(0);
            // Convert to control char: 'a' (97) -> 1, 'c' (99) -> 3
            if (code >= 97 && code <= 122) {
                sendData = String.fromCharCode(code - 96);
                toggleModifier('Ctrl', false); // Auto-release
            } else if (code >= 65 && code <= 90) { // Uppercase
                sendData = String.fromCharCode(code - 64);
                toggleModifier('Ctrl', false);
            }
        }

        ws.send(JSON.stringify({ type: 'input', data: sendData }));
    }
});

// Toolbar Logic
const modifiers = {
    Ctrl: false,
    Alt: false
};

function toggleModifier(key, forceState) {
    if (forceState !== undefined) {
        modifiers[key] = forceState;
    } else {
        modifiers[key] = !modifiers[key];
    }

    // Update UI
    const btn = document.querySelector(`.key[data-key="${key}"]`);
    if (btn) {
        if (modifiers[key]) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}

// Special Key mappings
const keyMap = {
    'Esc': '\x1b',
    'Tab': '\t',
    'Up': '\x1b[A',
    'Down': '\x1b[B',
    'Right': '\x1b[C',
    'Left': '\x1b[D',
    'Home': '\x1b[H',
    'End': '\x1b[F',
    'PgUp': '\x1b[5~',
    'PgDn': '\x1b[6~',
    '-': '-',
    '/': '/',
    '|': '|'
};

document.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent focus loss from terminal
        const key = btn.dataset.key;

        if (key === 'Ctrl' || key === 'Alt') {
            toggleModifier(key);
            return;
        }

        // Send key
        if (ws.readyState === WebSocket.OPEN) {
            let data = keyMap[key] || key;

            // Handle Control sequences for arrow keys if needed (e.g. Ctrl+Up)
            // xterm default: Ctrl+Up -> \x1b[1;5A
            if (modifiers.Ctrl) {
                if (key === 'Up') data = '\x1b[1;5A';
                else if (key === 'Down') data = '\x1b[1;5B';
                else if (key === 'Right') data = '\x1b[1;5C';
                else if (key === 'Left') data = '\x1b[1;5D';
                // For other keys, typical CLI implementation implies we might not support all combos yet
                // But let's handle the basics.

                toggleModifier('Ctrl', false); // Release after usage
            }

            ws.send(JSON.stringify({ type: 'input', data: data }));
        }

        // Visual feedback (optional since :active handles it, but touchstart needs help sometimes)
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 100);
    });

    // Fallback for mouse users
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        // TRIGGER modifiers logic same as touchstart...
        // For simplicity, let's call the same handler or just relying on touchstart for mobile
        // But for dev testing on desktop:
        const key = btn.dataset.key;
        if (key === 'Ctrl' || key === 'Alt') {
            toggleModifier(key);
            return;
        }
        if (ws.readyState === WebSocket.OPEN) {
            let data = keyMap[key] || key;
            if (modifiers.Ctrl) {
                if (key === 'Up') data = '\x1b[1;5A';
                else if (key === 'Down') data = '\x1b[1;5B';
                else if (key === 'Right') data = '\x1b[1;5C';
                else if (key === 'Left') data = '\x1b[1;5D';
                toggleModifier('Ctrl', false);
            }
            ws.send(JSON.stringify({ type: 'input', data: data }));
        }
    });
});


// Handle Resize
function sendResize() {
    fitAddon.fit();
    const dims = fitAddon.proposeDimensions();
    if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'resize',
            cols: dims.cols,
            rows: dims.rows
        }));
    }
}

window.addEventListener('resize', sendResize);

// Input Overlay Logic
const inputOverlay = document.getElementById('input-overlay');
const inputBuffer = document.getElementById('input-buffer');
const btnToggleInput = document.getElementById('btn-toggle-input');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const btnSend = document.getElementById('btn-send');

btnToggleInput.addEventListener('click', () => {
    inputOverlay.style.display = 'flex';
    inputBuffer.focus();
});

btnClose.addEventListener('click', () => {
    inputOverlay.style.display = 'none';
    term.focus();
});

btnClear.addEventListener('click', () => {
    inputBuffer.value = '';
    inputBuffer.focus();
});

btnSend.addEventListener('click', () => {
    const text = inputBuffer.value;
    if (text) {
        if (ws.readyState === WebSocket.OPEN) {
            // Send text followed by Enter
            ws.send(JSON.stringify({ type: 'input', data: text + '\r' }));
        }
        inputBuffer.value = ''; // Clear after send
        inputOverlay.style.display = 'none'; // Close logic
        term.focus();
    }
});

// Theme Logic
const btnTheme = document.getElementById('btn-theme');
btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');

    term.options.theme = isLight ? {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selectionBackground: 'rgba(0, 0, 0, 0.3)'
    } : {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)'
    };

    // Save preference? For now, just ephemeral.
});

// Clipboard Logic
const btnPaste = document.getElementById('btn-paste');
btnPaste.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data: text }));
            term.focus();
            showStatus('Pasted from clipboard');
            setTimeout(hideStatus, 1000);
        }
    } catch (err) {
        console.error('Clipboard error:', err);
        showStatus('Clipboard permission denied');
        setTimeout(hideStatus, 2000);
    }
});
