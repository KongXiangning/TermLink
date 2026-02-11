const os = require('os');
const pty = require('node-pty');

class PtyService {
    constructor() {
        this.shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        this.ptyProcess = null;
    }

    spawn(cols, rows) {
        if (this.ptyProcess) {
            this.kill();
        }

        // Force tmux session named 'main' by default, or attach if exists
        // -A: attach to existing session if it exists
        // -s: session name
        // FALLBACK: tmux is not available in this environment. Using default shell.
        const args = [];
        const file = this.shell;

        this.ptyProcess = pty.spawn(file, args, {
            name: 'xterm-color',
            cols: cols || 80,
            rows: rows || 30,
            cwd: process.env.HOME,
            env: process.env
        });

        return this.ptyProcess;
    }

    onData(callback) {
        if (this.ptyProcess) {
            this.ptyProcess.on('data', callback);
        }
    }

    write(data) {
        if (this.ptyProcess) {
            this.ptyProcess.write(data);
        }
    }

    resize(cols, rows) {
        if (this.ptyProcess) {
            this.ptyProcess.resize(cols, rows);
        }
    }

    kill(signal) {
        if (this.ptyProcess) {
            this.ptyProcess.kill(signal);
            if (signal === 'SIGKILL') {
                this.ptyProcess = null;
            }
        }
    }
}

module.exports = PtyService;
