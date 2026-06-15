'use strict';

const DEFAULTS = Object.freeze({
    ENABLED: false,
    ALLOW_ACTIVE: false,
    CONFIRM_SEND: false,
    RECONNECT_DELAY_MS: 1000,
    REQUEST_TIMEOUT_MS: 5000,
    PIPE_PATH: '\\\\.\\pipe\\codex-ipc'
});

/**
 * Parse a boolean env var.  Truthy values: "1", "true", "yes" (case-insensitive).
 * Everything else — including unset, empty, or "0" — is false.
 */
function parseBool(raw) {
    if (raw === undefined || raw === null) {
        return false;
    }
    const normalized = String(raw).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

/**
 * Parse a positive integer env var.  Returns the default when the value is
 * missing, non-numeric, zero, or negative.
 */
function parsePositiveInt(raw, defaultVal) {
    if (raw === undefined || raw === null) {
        return defaultVal;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) {
        return defaultVal;
    }
    return Math.floor(num);
}

/**
 * Read and normalise all TERMLINK_CODEX_IPC_* environment variables.
 *
 * @returns {object}
 */
function readIpcConfig() {
    const enabled = parseBool(process.env.TERMLINK_CODEX_IPC_ENABLED);
    const allowActive = enabled && parseBool(process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE);
    const confirmSend = allowActive && parseBool(process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND);
    const reconnectDelayMs = parsePositiveInt(
        process.env.TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS,
        DEFAULTS.RECONNECT_DELAY_MS
    );
    const requestTimeoutMs = parsePositiveInt(
        process.env.TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS,
        DEFAULTS.REQUEST_TIMEOUT_MS
    );
    const pipePath = process.env.TERMLINK_CODEX_IPC_PIPE_PATH || DEFAULTS.PIPE_PATH;

    return Object.freeze({
        enabled,
        allowActive,
        confirmSend,
        reconnectDelayMs,
        requestTimeoutMs,
        pipePath
    });
}

module.exports = { DEFAULTS, parseBool, parsePositiveInt, readIpcConfig };
