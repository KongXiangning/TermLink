require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const PtyService = require('./services/ptyService');
const basicAuth = require('./auth/basicAuth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Security: Basic Auth
app.use(basicAuth);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Spawn PTY on connection (or reuse/attach logic could go here)
    // For now, spawn a new attached tmux session per connection logic in ptyService
    // In a real multi-user scenario, we might want to manage sessions differently,
    // but for a single-user personal server, one shared session is the goal.
    // Note: ptyService is currently a singleton.

    // If ptyProcess doesn't exist, spawn it.
    // If it exists, we just attach listeners.
    // BUT ptyService provided is simple. Let's make sure we handle multiple WS 
    // attached to the SAME pty process if possible, or spawn new per connection?
    // PRD says: "Mobile Browser ... -> Backend -> PTY -> tmux"
    // If we want to support persistent session, tmux handles the persistence.
    // We can spawn a `tmux attach` for every websocket connection.
    // Each WS connection gets its own PTY process, which runs `tmux attach`.
    // This allows multiple browser tabs to see the same tmux session.

    // Let's modify usage of PtyService to be instantiated per connection
    // OR keep it singleton if we only expect strictly one connection.
    // PRD says "Suitable for long-term expansion (multi-machine, multi-session)".
    // For "Phase 1", let's spawn a PTY for this connection.

    // Re-instantiate service logic or change service to export class?
    // Let's stick to the current plan: instantiate pty for this connection.
    // The ptyService I wrote exports a 'new PtyService()'. 
    // Let's fix ptyService to export the class instead to allow multiple instances.
    // I will update ptyService in the next step.
    // For now, I will write the server assuming ptyService exports a class or factory.

    // Wait, I already wrote ptyService exporting a singleton instance. 
    // If I use a singleton PTY, then multiple browser tabs will fight over the same PTY process.
    // But `tmux` allows multiple clients.
    // The correct architectural pattern for tmux integration is:
    // Browser 1 connects -> Node spawns PTY 1 running `tmux attach -t main`
    // Browser 2 connects -> Node spawns PTY 2 running `tmux attach -t main`
    // Tmux syncs the state.

    // So I should modify ptyService to export the Class, not an instance.
    // And `server.js` should instantiate it per connection.

    const pty = new PtyService();

    // Default size
    pty.spawn(80, 30);

    // Handle incoming messages from client
    ws.on('message', (message) => {
        try {
            // Expecting JSON or string? Phase 1 says "Dual data flow". 
            // Plan: "Protocol: WebSocket (JSON or raw text)".
            // Let's support simple JSON for resize, string for input?
            // Or just text for input if it doesn't start with specific marker?
            // Let's start with JSON for everything to be safe and extensible.

            const msg = JSON.parse(message);
            if (msg.type === 'input') {
                pty.write(msg.data);
            } else if (msg.type === 'resize') {
                pty.resize(msg.cols, msg.rows);
            }
        } catch (e) {
            // Fallback: if not JSON, treat as raw input (or ignore)
            console.error('Failed to parse message:', e.message);
        }
    });

    // Handle PTY output
    pty.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'output', data: data }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        pty.kill();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
});
