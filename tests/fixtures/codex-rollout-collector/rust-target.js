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
            const targetDir = process.env.CARGO_TARGET_DIR
                ? path.resolve(nativeRoot, process.env.CARGO_TARGET_DIR)
                : path.join(nativeRoot, 'target');
            const binary = path.join(targetDir, 'debug',
                process.platform === 'win32' ? 'codex-rollout-collector.exe' : 'codex-rollout-collector');
            // A previous executable may be stale even when it exists. Build
            // against the current source once per Node test process.
            await execFileAsync('cargo', [
                'build', '--locked', '--manifest-path', path.join(nativeRoot, 'Cargo.toml'),
                '--bin', 'codex-rollout-collector'
            ], { cwd: nativeRoot, timeout: 120000, windowsHide: true });
            await fs.access(binary);
            return binary;
        })().catch((error) => {
            binaryPromise = undefined;
            throw error;
        });
    }
    return binaryPromise;
}

module.exports = { nativeRoot, resolveRustTargetBinary };
