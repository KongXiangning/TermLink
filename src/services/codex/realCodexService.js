const pty = require('node-pty');
const EventEmitter = require('events');
const ProtocolParser = require('./protocolParser');

class RealCodexService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.parser = new ProtocolParser();
        this.sessionId = null;
        this.cwd = '/root/code/project/TermLink';

        // Internal State
        this.state = 'IDLE'; // IDLE, BOOTING, READY, BUSY
        this.pendingTurn = null; // Buffer for turn during boot
        this.rawAccumulator = '';
        this.hasEmittedDone = false;

        this._setupParserEvents();
    }

    _setupParserEvents() {
        this.parser.on('assistant', (evt) => this.emit('assistant', evt));
        this.parser.on('proposal', (evt) => this.emit('proposal', evt));
        this.parser.on('status', (evt) => this.emit('status', evt));

        this.parser.on('done', (evt) => {
            this._handleTurnComplete(evt);
        });

        this.parser.on('error', (evt) => {
            // Suppress
        });

        this.parser.on('raw', (data) => {
            if (this.state === 'BUSY') {
                // Forward raw data as debug or potential fallback accumulation
                // But don't emit 'assistant' unless parser says so?
                // Actually, persistent TUI is noisy. 
                // We might want to filter?
                // For now, emit raw for debug.
                this.emit('raw', data);
            }
        });
    }

    _spawn() {
        if (this.process) return;

        console.log('[RealCodexService] Spawning persistent process...');
        this.state = 'BOOTING';

        const args = ['-s', 'workspace-write', '--no-alt-screen'];

        this.process = pty.spawn('codex', args, {
            name: 'xterm-mono', // Avoid color codes
            cols: 80,
            rows: 30,
            cwd: this.cwd,
            env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } // Try to suppress colors
        });

        this.process.onData((data) => {
            const str = data.toString();
            // console.log('[RAW PTY]', JSON.stringify(str)); // Debug

            // Only feed logic if not purely echo
            // But implementing echo suppression is hard without knowing exactly what we sent.
            // Simplified: Just feed everything, but Parser needs to be robust.
            this.parser.feed(str);

            // 3. Prompt Detection (Boot Only)
            if (this.state === 'BOOTING' && this._detectPrompt(str)) {
                console.log('[RealCodexService] Boot Complete (Prompt Detected).');
                this.state = 'READY';

                // If we have a pending turn, execute it now
                if (this.pendingTurn) {
                    this._executeTurn(this.pendingTurn);
                    this.pendingTurn = null;
                }
            }
        });

        // ... exit handler ...
        this.process.onExit(({ exitCode, signal }) => {
            console.log(`[RealCodexService] Process exited: ${exitCode} (${signal})`);
            this.process = null;
            this.state = 'IDLE';
            if (this.state === 'BUSY') {
                this.emit('error', new Error('Codex crashed during turn'));
            }
        });
    }

    _executeTurn(turn) {
        this.state = 'BUSY';
        this.hasEmittedDone = false;

        const { systemPrompt, userMessage } = turn;
        // Minimal Protocol Instruction to avoid confusing the model or PTY
        const protocolInstruction = `(Output JSON wrapped in @@TERM_LINK/1 tags)`;

        // For "Interactive Mode", we usually just type the user message.
        // Injecting "SYSTEM:" might be confusing the CLI unless it supports it explicitly.
        // Let's try just sending the user message + instruction.
        // The system prompt is usually for the "session context", which CLI manages.

        const message = `${userMessage} ${protocolInstruction}`;

        console.log('[RealCodexService] Sending Turn...');
        // Send with newline, wait a bit?
        this.process.write(message + '\r');
    }

    killAndRestart() {
        console.warn('[RealCodexService] Killing... ');
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.state = 'IDLE';
        }
    }

    stop() {
        this.killAndRestart();
    }
}

module.exports = RealCodexService;
