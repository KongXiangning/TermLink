'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULTS, parseBool, parsePositiveInt, readIpcConfig } = require('../src/services/codexIpcConfig');

// ── parseBool ────────────────────────────────────────────────────────────────

test('parseBool returns false for undefined / null', () => {
    assert.equal(parseBool(undefined), false);
    assert.equal(parseBool(null), false);
});

test('parseBool returns false for "0", empty, or arbitrary strings', () => {
    assert.equal(parseBool('0'), false);
    assert.equal(parseBool(''), false);
    assert.equal(parseBool('no'), false);
    assert.equal(parseBool('off'), false);
    assert.equal(parseBool('false'), false);
});

test('parseBool returns true for "1", "true", "yes" (case-insensitive)', () => {
    assert.equal(parseBool('1'), true);
    assert.equal(parseBool('true'), true);
    assert.equal(parseBool('TRUE'), true);
    assert.equal(parseBool('True'), true);
    assert.equal(parseBool('yes'), true);
    assert.equal(parseBool('YES'), true);
});

// ── parsePositiveInt ─────────────────────────────────────────────────────────

test('parsePositiveInt returns default when undefined / null', () => {
    assert.equal(parsePositiveInt(undefined, 1000), 1000);
    assert.equal(parsePositiveInt(null, 1000), 1000);
});

test('parsePositiveInt returns default for non-numeric, zero, or negative', () => {
    assert.equal(parsePositiveInt('abc', 99), 99);
    assert.equal(parsePositiveInt('0', 99), 99);
    assert.equal(parsePositiveInt('-5', 99), 99);
    assert.equal(parsePositiveInt('NaN', 99), 99);
});

test('parsePositiveInt floors and returns positive integers', () => {
    assert.equal(parsePositiveInt('42', 100), 42);
    assert.equal(parsePositiveInt('3.7', 100), 3);
    assert.equal(parsePositiveInt(100, 200), 100);
});

// ── readIpcConfig ────────────────────────────────────────────────────────────

test('readIpcConfig returns safe defaults when no env vars are set', (t) => {
    // Ensure test isolation: unset every TERMLINK_CODEX_IPC_* variable.
    const saved = snapshotIpcEnv();
    clearIpcEnv();

    t.after(() => restoreIpcEnv(saved));

    const config = readIpcConfig();

    assert.equal(config.enabled, false);
    assert.equal(config.allowActive, false);
    assert.equal(config.confirmSend, false);
    assert.equal(config.reconnectDelayMs, DEFAULTS.RECONNECT_DELAY_MS);
    assert.equal(config.requestTimeoutMs, DEFAULTS.REQUEST_TIMEOUT_MS);
    assert.equal(config.pipePath, DEFAULTS.PIPE_PATH);
    assert.ok(Object.isFrozen(config));
});

test('readIpcConfig allows active only when enabled', (t) => {
    const saved = snapshotIpcEnv();
    clearIpcEnv();
    t.after(() => restoreIpcEnv(saved));

    process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '1';
    // enabled stays false → allowActive must be false
    const config = readIpcConfig();

    assert.equal(config.enabled, false);
    assert.equal(config.allowActive, false);
});

test('readIpcConfig allows confirmSend only when allowActive and enabled', (t) => {
    const saved = snapshotIpcEnv();
    clearIpcEnv();
    t.after(() => restoreIpcEnv(saved));

    process.env.TERMLINK_CODEX_IPC_ENABLED = '1';
    process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '1';
    process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND = '1';

    const config = readIpcConfig();

    assert.equal(config.enabled, true);
    assert.equal(config.allowActive, true);
    assert.equal(config.confirmSend, true);
});

test('readIpcConfig honours custom numeric env vars', (t) => {
    const saved = snapshotIpcEnv();
    clearIpcEnv();
    t.after(() => restoreIpcEnv(saved));

    process.env.TERMLINK_CODEX_IPC_ENABLED = 'yes';
    process.env.TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS = '2000';
    process.env.TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS = '8000';

    const config = readIpcConfig();

    assert.equal(config.reconnectDelayMs, 2000);
    assert.equal(config.requestTimeoutMs, 8000);
});

test('readIpcConfig honours custom pipe path', (t) => {
    const saved = snapshotIpcEnv();
    clearIpcEnv();
    t.after(() => restoreIpcEnv(saved));

    process.env.TERMLINK_CODEX_IPC_ENABLED = '1';
    process.env.TERMLINK_CODEX_IPC_PIPE_PATH = '\\\\.\\pipe\\custom-ipc';

    const config = readIpcConfig();
    assert.equal(config.pipePath, '\\\\.\\pipe\\custom-ipc');
});

// ── helpers ──────────────────────────────────────────────────────────────────

function snapshotIpcEnv() {
    const keys = Object.keys(process.env).filter(k => k.startsWith('TERMLINK_CODEX_IPC_'));
    const saved = {};
    for (const k of keys) {
        saved[k] = process.env[k];
    }
    return saved;
}

function clearIpcEnv() {
    for (const k of Object.keys(process.env)) {
        if (k.startsWith('TERMLINK_CODEX_IPC_')) {
            delete process.env[k];
        }
    }
}

function restoreIpcEnv(saved) {
    // Remove any IPC vars that may have been set during the test.
    for (const k of Object.keys(process.env)) {
        if (k.startsWith('TERMLINK_CODEX_IPC_')) {
            delete process.env[k];
        }
    }
    // Restore original values.
    for (const [k, v] of Object.entries(saved)) {
        process.env[k] = v;
    }
}
