const { spawn } = require('child_process');

const child = spawn('gemini', ['--output-format', 'stream-json'], {
    shell: true, // Use shell to ensure environment loaded
    env: process.env
});

child.stdout.on('data', (data) => {
    console.log(`[STDOUT] ${data}`);
});

child.stderr.on('data', (data) => {
    console.log(`[STDERR] ${data}`);
});

child.on('close', (code) => {
    console.log(`Child exited with code ${code}`);
});

// Wait for prompt? Assuming prompt ends with space or '> '
setTimeout(() => {
    console.log('Sending "Hello"');
    child.stdin.write('Hello\n');
}, 2000);

setTimeout(() => {
    console.log('Sending "Bye"');
    child.stdin.write('Bye\n');
    child.stdin.end();
}, 5000);
