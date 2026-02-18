const os = require('os');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

function resolveShellArgs() {
    const rawArgs = (process.env.PTY_SHELL_ARGS || '').trim();
    if (!rawArgs) return [];
    return rawArgs.split(/\s+/).filter(Boolean);
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
        this.shellArgs = resolveShellArgs();
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
        const args = this.shellArgs;
        const file = this.shell;

        this.ptyProcess = pty.spawn(file, args, {
            name: 'xterm-color',
            cols: cols || 80,
            rows: rows || 30,
            cwd: process.env.HOME || process.env.USERPROFILE || os.homedir(),
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

    kill() {
        if (this.ptyProcess) {
            this.ptyProcess.kill();
            this.ptyProcess = null;
        }
    }
}

module.exports = PtyService;
