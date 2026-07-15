'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');

function parseArgs(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 2) result[argv[index].replace(/^--/, '')] = argv[index + 1];
    return result;
}

try {
    const args = parseArgs(process.argv.slice(2));
    for (const required of ['server', 'cwd', 'stdout', 'stderr']) if (!args[required]) throw new Error(`--${required} is required.`);
    const stdout = fs.openSync(args.stdout, 'a');
    const stderr = fs.openSync(args.stderr, 'a');
    const child = spawn(process.execPath, [args.server], {
        cwd: args.cwd,
        detached: true,
        windowsHide: true,
        stdio: ['ignore', stdout, stderr],
        env: process.env
    });
    child.once('error', (error) => {
        process.stderr.write(`TermLink service launch failed: ${error.message}\n`);
        process.exitCode = 1;
    });
    child.once('spawn', () => {
        child.unref();
        fs.closeSync(stdout);
        fs.closeSync(stderr);
        process.stdout.write(JSON.stringify({ pid: child.pid }));
    });
} catch (error) {
    process.stderr.write(`TermLink service launch failed: ${error.message}\n`);
    process.exitCode = 1;
}
