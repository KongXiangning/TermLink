# TermLink - AI-Powered Mobile Terminal Controller

TermLink is a modern, mobile-first web terminal that turns your browser into a powerful command center. It features a hybrid UI with chat-based AI assistance, a collapsible terminal drawer, and robust session management.

![TermLink AI Chat & Terminal](https://github.com/user-attachments/assets/placeholder-image.png)

## Features

- **Hybrid Interface**: 
  - **Chat View**: Interact with AI (Codex Mock) using natural language.
  - **Terminal Drawer**: Collapsible, full-featured xterm.js terminal for raw output and interaction.
  - **Session Sidebar**: Manage multiple persistent terminal sessions.
  
- **Mobile-First Design**:
  - Touch-optimized Toolbar with modifier keys (Ctrl, Alt, Esc, Tab, Arrows).
  - Responsive layout that adapts to phone and tablet screens.
  - Input Overlay for comfortable multi-line command editing.

- **AI Command Approval Workflow**:
  - **Risk Analysis**: Commands are classified as `safe` or `dangerous`.
  - **Approval Cards**: Dangerous commands require explicit user approval before execution.
  - **Execution**: Approved commands run directly in the PTY session.

- **Safety & Control**:
  - **Stop Button (🛑)**: 
    - Click: Sends `Ctrl+C` (Interrupt).
    - Double-Click: Sends `SIGKILL` (Force Kill).
  - **Graceful Reconnection**: Auto-reconnects to existing sessions via `tmux` (or fallback).

- **Security**:
  - Basic Authentication.
  - WebSocket Protocol v2 with structured envelopes.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/KongXiangning/TermLink.git
    cd TermLink
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory:
    ```ini
    PORT=3000
    AUTH_USER=admin
    AUTH_PASS=password123
    ```

4.  **Run the application**:
    ```bash
    # Development (with nodemon)
    npm run dev
    
    # Production
    npm start
    ```

5.  **Access**:
    Open `http://localhost:3000` in your browser.
    Log in with the credentials defined in `.env`.

## Docker Deployment

Build and run using Docker:

```bash
docker build -t termlink .
docker run -p 3000:3000 termlink
```

## Architecture

- **Backend**: Node.js, Express, `node-pty`, WebSocket (`ws`).
- **Frontend**: Vanilla JS, `xterm.js`, `xterm-addon-fit`.
- **Protocol**: Custom JSON-based WebSocket protocol (v2).
- **Session Management**: In-memory session tracking with `tmux` persistence.

## Project Structure

```
TermLink/
├── public/             # Static frontend assets
│   ├── index.html      # Hybrid UI structure
│   ├── style.css       # Mobile-first styles
│   └── client.js       # Frontend logic (Protocol v2, UI)
├── src/
│   ├── services/
│   │   ├── ptyService.js      # Node-PTY wrapper
│   │   ├── sessionManager.js  # Session & Connection lifecycle
│   │   └── codexService.js    # AI Simulation & Approval Logic
│   └── server.js       # Express & WebSocket entry point
├── Dockerfile          # Container config
└── package.json        # Dependencies
```

## License

MIT
