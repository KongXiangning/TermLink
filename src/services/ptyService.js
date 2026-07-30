const os = require('os');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { withWindowsPtyOptions } = require('./ptySpawnOptions');

// Keep a bounded in-memory tail so a client attaching to an already-running
// shell can reconstruct the initial screen without sending a synthetic Enter.
// The buffer is intentionally session-local and is never persisted to disk.
const MAX_OUTPUT_BUFFER_LENGTH = 256 * 1024;

function hasCommand(command) {
    const checker = os.platform() === 'win32' ? 'where' : 'which';
    try {
        const result = spawnSync(checker, [command], { stdio: 'ignore' });
        return result.status === 0;
    } catch (_) {
        return false;
    }
}

function getUnixLoginShellFromPasswd() {
    try {
        const user = os.userInfo().username;
        const lines = fs.readFileSync('/etc/passwd', 'utf8').split('\n');
        const entry = lines.find((line) => line.startsWith(`${user}:`));
        if (!entry) return '';
        const fields = entry.split(':');
        return (fields[6] || '').trim();
    } catch (_) {
        return '';
    }
}

function resolveShell() {
    const customShell = (process.env.PTY_SHELL || '').trim();
    if (customShell) return customShell;

    if (os.platform() === 'win32') {
        const customWinShell = (process.env.PTY_WINDOWS_SHELL || '').trim();
        if (customWinShell) return customWinShell;
        const knownPwsh = findKnownWindowsPwshPath();
        if (knownPwsh) return knownPwsh;
        if (hasCommand('pwsh.exe')) return 'pwsh.exe';
        if (hasCommand('pwsh')) return 'pwsh';
        return 'powershell.exe';
    }

    const customUnixShell = (process.env.PTY_UNIX_SHELL || '').trim();
    if (customUnixShell) return customUnixShell;

    const loginShell = getUnixLoginShellFromPasswd();
    if (loginShell) return loginShell;

    const envShell = (process.env.SHELL || '').trim();
    if (envShell) return envShell;

    return 'bash';
}

function resolveShellArgs(shell = '') {
    const rawArgs = (process.env.PTY_SHELL_ARGS || '').trim();
    if (rawArgs) return rawArgs.split(/\s+/).filter(Boolean);

    // PowerShell's default logo/update check can block the first prompt for
    // several seconds on a mobile WebView. Keep the normal profile and
    // commands, but suppress only the startup logo so the prompt is painted
    // immediately. Explicit PTY_SHELL_ARGS still has full control.
    if (os.platform() === 'win32' && /(?:^|[\\/])(pwsh|powershell)(?:\.exe)?$/i.test(shell)) {
        return ['-NoLogo'];
    }

    return [];
}

function findKnownWindowsPwshPath() {
    const candidates = [];
    const programFiles = process.env.ProgramFiles;
    const programW6432 = process.env.ProgramW6432;
    const programFilesX86 = process.env['ProgramFiles(x86)'];

    if (programFiles) {
        candidates.push(path.join(programFiles, 'PowerShell', '7', 'pwsh.exe'));
        candidates.push(path.join(programFiles, 'PowerShell', '7-preview', 'pwsh.exe'));
    }
    if (programW6432) {
        candidates.push(path.join(programW6432, 'PowerShell', '7', 'pwsh.exe'));
        candidates.push(path.join(programW6432, 'PowerShell', '7-preview', 'pwsh.exe'));
    }
    if (programFilesX86) {
        candidates.push(path.join(programFilesX86, 'PowerShell', '7', 'pwsh.exe'));
        candidates.push(path.join(programFilesX86, 'PowerShell', '7-preview', 'pwsh.exe'));
    }
    candidates.push('C:\\Program Files\\PowerShell\\7\\pwsh.exe');
    candidates.push('C:\\Program Files\\PowerShell\\7-preview\\pwsh.exe');
    candidates.push('C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe');
    candidates.push('C:\\Program Files (x86)\\PowerShell\\7-preview\\pwsh.exe');

    for (const candidate of candidates) {
        try {
            if (candidate && fs.existsSync(candidate)) {
                return candidate;
            }
        } catch (_) {
            // ignore fs check errors
        }
    }
    return '';
}

class PtyService {
    constructor() {
        this.shell = resolveShell();
        this.shellArgs = resolveShellArgs(this.shell);
        this.ptyProcess = null;
        this.outputBuffer = '';
        this.dataListeners = [];
    }

    spawn(cols, rows) {
        if (this.ptyProcess) {
            this.kill();
        }

        // A new PTY has a new screen; do not replay output from a prior shell.
        this.outputBuffer = '';

        // Force tmux session named 'main' by default, or attach if exists
        // -A: attach to existing session if it exists
        // -s: session name
        // FALLBACK: tmux is not available in this environment. Using default shell.
        const args = this.shellArgs;
        const file = this.shell;

        this.ptyProcess = pty.spawn(file, args, withWindowsPtyOptions({
            name: 'xterm-color',
            cols: cols || 80,
            rows: rows || 30,
            cwd: process.env.HOME || process.env.USERPROFILE || os.homedir(),
            env: process.env
        }));

        // Attach listeners immediately after spawn. Keeping the listener
        // registrations separately also lets SessionManager register before
        // spawning, eliminating the startup-output race.
        this.dataListeners.forEach((listener) => {
            this.ptyProcess.on('data', listener);
        });

        return this.ptyProcess;
    }

    onData(callback) {
        if (typeof callback !== 'function') return;
        const listener = (data) => {
            const chunk = typeof data === 'string' ? data : String(data ?? '');
            if (chunk) {
                this.outputBuffer = `${this.outputBuffer}${chunk}`.slice(-MAX_OUTPUT_BUFFER_LENGTH);
            }
            callback(data);
        };
        this.dataListeners.push(listener);
        if (this.ptyProcess) {
            this.ptyProcess.on('data', listener);
        }
    }

    getOutputSnapshot() {
        return this.outputBuffer;
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
