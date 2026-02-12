const { spawn } = require('child_process');
const EventEmitter = require('events');
const ProtocolParser = require('./protocolParser');

class RealCodexService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.parser = new ProtocolParser();
        this._setupParserEvents();
    }

    _setupParserEvents() {
        // Relay parser events
        this.parser.on('assistant', (evt) => this.emit('assistant', evt));
        this.parser.on('proposal', (evt) => this.emit('proposal', evt));
        this.parser.on('status', (evt) => this.emit('status', evt));
        this.parser.on('done', (evt) => this.emit('done', evt));
        this.parser.on('raw', (data) => this.emit('raw', data));
        this.parser.on('error', (evt) => this.emit('error', evt.error));
    }

    start() {
        this._spawn();
    }

    _spawn() {
        console.log('[RealCodexService] Spawning codex session...');
        // Use 'stdbuf -i0 -o0 -e0' to force unbuffered output if available, else just spawn
        // But codex CLI might handle it.
        // Assuming 'codex session' is the command.
        this.process = spawn('codex', ['session'], {
            env: { ...process.env, FORCE_COLOR: '1' }, // Maybe color?
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (chunk) => {
            this.parser.feed(chunk.toString());
        });

        this.process.stderr.on('data', (chunk) => {
            this.emit('raw_error', chunk.toString());
        });

        this.process.on('close', (code) => {
            console.warn(`[RealCodexService] Process exited with code ${code}`);
            this.emit('exit', code);
            this.process = null;
        });
    }

    sendTurn(turn) {
        if (!this.process) {
            console.error('[RealCodexService] Process not running, restarting...');
            this._spawn();
        }

        const { systemPrompt, userMessage } = turn;

        // Construct Guardrailed Input
        // 1. System Prompt (Guardrail)
        // 2. User Message
        // Format depends on how 'codex session' expects input. 
        // Assuming standard chat format or just clear text if it's a simple session.
        // If 'codex session' accepts lines as user input:

        if (systemPrompt) {
            this.process.stdin.write(`SYSTEM:\n${systemPrompt}\n`);
        }

        this.process.stdin.write(`USER:\n${userMessage}\n`);
    }

    killAndRestart() {
        console.warn('[RealCodexService] Force killing process...');
        if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
        }
        setTimeout(() => this._spawn(), 500);
    }

    stop() {
        if (this.process) {
            this.process.kill();
        }
    }
}

module.exports = RealCodexService;
