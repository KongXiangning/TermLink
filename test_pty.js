const pty = require('node-pty');
const os = require('os');

const shell = 'gemini';
const args = ['--output-format', 'stream-json'];

if (process.env.GEMINI_MODEL) {
    args.push('--model', process.env.GEMINI_MODEL);
}

const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
});

ptyProcess.on('data', (data) => {
    // Process output
    console.log(`[PTY DATA] ${JSON.stringify(data)}`);
});

setTimeout(() => {
    console.log('Sending "Hello"');
    ptyProcess.write('Hello\r');
}, 2000);

setTimeout(() => {
    console.log('Sending "Bye"');
    // ptyProcess.write('Bye\r');
    // ptyProcess.kill();
}, 10000);
