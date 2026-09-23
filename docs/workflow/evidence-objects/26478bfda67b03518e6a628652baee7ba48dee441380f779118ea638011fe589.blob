'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const nativeRoot = path.resolve(__dirname, '../../../native/codex-rollout-collector');
let binaryPromise;

function resolveRustTargetBinary() {
    if (!binaryPromise) {
        binaryPromise = (async () => {
            const binary = path.join(nativeRoot, 'target/debug',
                process.platform === 'win32' ? 'codex-rollout-collector.exe' : 'codex-rollout-collector');
            try {
                await fs.access(binary);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
                await execFileAsync('cargo', [
                    'build', '--locked', '--manifest-path', path.join(nativeRoot, 'Cargo.toml'),
                    '--bin', 'codex-rollout-collector'
                ], { cwd: nativeRoot, timeout: 120000, windowsHide: true });
                await fs.access(binary);
            }
            return binary;
        })();
    }
    return binaryPromise;
}

module.exports = { nativeRoot, resolveRustTargetBinary };
