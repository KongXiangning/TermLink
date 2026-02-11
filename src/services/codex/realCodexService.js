const BaseCodexService = require('./baseCodexService');
const { spawn } = require('child_process');

class RealCodexService extends BaseCodexService {
    constructor() {
        super();
        this.processes = new Map(); // sessionId -> process
    }

    startSession(session) {
        if (this.processes.has(session.id)) return;

        console.log(`[RealCodex] Starting process for session ${session.id}`);

        // Spawn Codex Process
        // Assuming 'codex session' starts an interactive session
        // Adjust arguments based on actual CLI
        const codex = spawn('codex', ['session'], {
            env: { ...process.env },
            cwd: process.env.HOME // or session cwd if tracked
        });

        const procData = {
            process: codex,
            buffer: ''
        };
        this.processes.set(session.id, procData);

        // Handle Output (Stdout) -> AI Response
        codex.stdout.on('data', (data) => {
            const str = data.toString();
            console.log(`[Codex-${session.id}] Stdout: ${str}`);
            // Simple Parsing: Emit everything as a message for now
            // Enhancement: Buffer and look for complete messages or streaming
            this.emit('message', {
                sessionId: session.id,
                role: 'assistant',
                content: str
            });

            // TODO: Extract Commands for Approval (7.4)
            this.parseCommands(session.id, str);
        });

        codex.stderr.on('data', (data) => {
            console.error(`[Codex-${session.id}] Stderr: ${data}`);
        });

        codex.on('close', (code) => {
            console.log(`[Codex-${session.id}] Exited with code ${code}`);
            this.processes.delete(session.id);
            this.emit('status', { sessionId: session.id, status: 'exited', code });
        });
    }

    send(session, message) {
        const proc = this.processes.get(session.id);
        if (!proc) {
            this.startSession(session);
            // Wait slightly or queue? For now just try again
            setTimeout(() => this.send(session, message), 100);
            return;
        }

        // Write to Stdin
        // Protocol: Assuming newline terminated text
        proc.process.stdin.write(message.content + '\n');
    }

    parseCommands(sessionId, text) {
        // 7.4 Logic: Parse Commands for Approval
        // Simple Regex for ```bash blocks
        const bashBlockRegex = /```bash\s+([\s\S]*?)\s+```/g;
        let match;

        while ((match = bashBlockRegex.exec(text)) !== null) {
            const command = match[1].trim();
            if (command) {
                console.log(`[RealCodex] Detected command: ${command}`);
                this.createApproval(
                    'main', // threadId (assuming main for now)
                    command,
                    'dangerous' // Assume all real codex commands are dangerous
                );
            }
        }
    }
}

module.exports = RealCodexService;
