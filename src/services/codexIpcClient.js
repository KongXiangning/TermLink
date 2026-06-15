'use strict';

const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const { IpcFrameDecoder, encodeFrame } = require('./codexIpcCodec');
const { readIpcConfig } = require('./codexIpcConfig');

// ── IPC message helpers ──────────────────────────────────────────────────────

const CONTROL_METHODS = [
    'thread-follower-submit-user-input',
    'thread-follower-command-approval-decision',
    'thread-follower-file-approval-decision',
    'thread-follower-permissions-request-approval-response',
    'thread-follower-interrupt-turn',
    'thread-follower-steer-turn',
    'thread-follower-start-turn',
    'thread-follower-compact-thread',
    'thread-follower-update-thread-settings',
    'thread-follower-edit-last-user-turn',
    'thread-follower-submit-mcp-server-elicitation-response',
    'thread-follower-set-queued-follow-ups-state'
];

const KNOWN_METHOD_VERSIONS = {
    'thread-stream-state-changed': 7,
    'thread-read-state-changed': 1,
    'thread-archived': 2,
    'thread-unarchived': 1,
    'thread-follower-start-turn': 1,
    'thread-follower-compact-thread': 1,
    'thread-follower-steer-turn': 1,
    'thread-follower-interrupt-turn': 1,
    'thread-follower-update-thread-settings': 1,
    'thread-follower-edit-last-user-turn': 1,
    'thread-follower-command-approval-decision': 1,
    'thread-follower-file-approval-decision': 1,
    'thread-follower-permissions-request-approval-response': 1,
    'thread-follower-submit-user-input': 1,
    'thread-follower-submit-mcp-server-elicitation-response': 1,
    'thread-follower-set-queued-follow-ups-state': 1,
    'thread-queued-followups-changed': 1
};

function isControlMethod(method) {
    return CONTROL_METHODS.includes(method);
}

function getMethodVersion(method) {
    return KNOWN_METHOD_VERSIONS[method] ?? 0;
}

function isIpcMessage(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const t = value.type;
    return t === 'broadcast' || t === 'request' || t === 'response' ||
        t === 'client-discovery-request' || t === 'client-discovery-response';
}

// ── CodexIpcClient ───────────────────────────────────────────────────────────

class CodexIpcClient extends EventEmitter {
    /**
     * @param {object} options
     * @param {object} options.transport        — injectable transport (for testing)
     * @param {string} [options.clientType]     — overrides config-derived type
     * @param {string} [options.clientIdLabel]  — label sent during initialize
     * @param {boolean} [options.reconnect]     — enable auto-reconnect on close (default true)
     */
    constructor(options = {}) {
        super();

        const config = readIpcConfig();

        this._config = config;
        this._transport = options.transport || null;
        this._clientType = options.clientType ||
            (config.allowActive && config.confirmSend
                ? 'termlink-app-active-follower'
                : 'termlink-app-observer');
        this._clientIdLabel = options.clientIdLabel ||
            `termlink-app-${process.pid}-${Date.now()}`;
        this._reconnect = options.reconnect !== false;
        this._requestTimeoutMs = config.requestTimeoutMs;
        this._reconnectDelayMs = config.reconnectDelayMs;

        this._clientId = 'initializing-client';
        this._initialized = false;
        this._decoder = new IpcFrameDecoder();
        this._pendingRequests = new Map();
        this._reconnectTimer = null;
        this._disposed = false;

        this._transportListenersAttached = false;

        this._boundOnTransportConnect = this._onTransportConnect.bind(this);
        this._boundOnTransportData = this._onTransportData.bind(this);
        this._boundOnTransportClose = this._onTransportClose.bind(this);
        this._boundOnTransportError = this._onTransportError.bind(this);

        // If a transport was injected, attach listeners immediately so the
        // client can receive messages before connect() is called (useful for
        // testing and for push-based transports).
        if (this._transport) {
            this._attachTransport();
        }
    }

    // ── public API ───────────────────────────────────────────────────────

    get enabled() {
        return this._config.enabled;
    }

    get allowActive() {
        return this._config.allowActive;
    }

    get confirmSend() {
        return this._config.confirmSend;
    }

    get clientId() {
        return this._clientId;
    }

    get initialized() {
        return this._initialized;
    }

    get pipePath() {
        return this._transport ? this._transport.pipePath : this._config.pipePath;
    }

    /**
     * Connect the underlying transport and perform the initialize handshake.
     * @returns {Promise<void>}
     */
    async connect() {
        this._disposed = false;

        if (!this._transport) {
            const { CodexIpcTransport } = require('./codexIpcTransport');
            this._transport = new CodexIpcTransport(this._config.pipePath);
        }

        this._attachTransport();
        await this._transport.connect();
        await this._initialize();
    }

    /**
     * Close the transport and reject all pending requests.
     */
    close() {
        this._disposed = true;

        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        this._rejectAllPending(new Error('codex-ipc client closed'));

        if (this._transport) {
            this._transport.close();
        }
    }

    /**
     * Send a broadcast message.  Control methods are blocked unless the active
     * send gate (enabled && allowActive && confirmSend) is satisfied.
     *
     * @param {string} method
     * @param {unknown} [params]
     */
    sendBroadcast(method, params) {
        this._assertActiveSendAllowed(method);
        this._sendMessage({
            type: 'broadcast',
            method,
            sourceClientId: this._clientId,
            version: getMethodVersion(method),
            params
        });
    }

    /**
     * Send a request message and return a Promise that resolves with the
     * response message or rejects on timeout / transport error.
     *
     * @param {string} method
     * @param {unknown} [params]
     * @param {{targetClientId?: string}} [options]
     * @returns {Promise<object>}
     */
    sendRequest(method, params, options = {}) {
        this._assertActiveSendAllowed(method);

        if (!this._initialized && method !== 'initialize') {
            return Promise.reject(new Error('codex-ipc client is not initialized'));
        }

        const requestId = randomUUID();
        const message = {
            type: 'request',
            requestId,
            sourceClientId: this._clientId,
            targetClientId: options.targetClientId,
            version: getMethodVersion(method),
            method,
            params
        };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._pendingRequests.delete(requestId);
                reject(new Error(`codex-ipc request timed out: ${method}`));
            }, this._requestTimeoutMs);

            this._pendingRequests.set(requestId, { method, resolve, reject, timer });

            try {
                this._sendMessage(message);
            } catch (error) {
                clearTimeout(timer);
                this._pendingRequests.delete(requestId);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    // ── transport lifecycle ──────────────────────────────────────────────

    _attachTransport() {
        if (this._transportListenersAttached) return;
        const t = this._transport;
        if (!t) return;

        this._transportListenersAttached = true;
        t.on('connect', this._boundOnTransportConnect);
        t.on('data', this._boundOnTransportData);
        t.on('close', this._boundOnTransportClose);
        t.on('error', this._boundOnTransportError);
    }

    _onTransportConnect(event) {
        this.emit('connect', event);
    }

    _onTransportData(chunk) {
        let frames;
        try {
            frames = this._decoder.push(chunk);
        } catch (error) {
            this.emit('error', error);
            return;
        }

        for (const frame of frames) {
            if (frame.parseError) {
                this.emit('parse_error', frame);
            } else {
                this._handleMessage(frame.parsed);
            }
        }
    }

    _onTransportClose(event) {
        this._clientId = 'initializing-client';
        this._initialized = false;
        this._rejectAllPending(new Error('codex-ipc connection closed'));
        this.emit('close', event);

        if (!this._disposed && this._reconnect) {
            this._reconnectTimer = setTimeout(() => {
                this._reconnectTimer = null;
                this.connect().catch((error) => this.emit('error', error));
            }, this._reconnectDelayMs);
        }
    }

    _onTransportError(error) {
        this.emit('error', error);
    }

    // ── initialize handshake ─────────────────────────────────────────────

    async _initialize() {
        const response = await this.sendRequest('initialize', {
            clientType: this._clientType,
            label: this._clientIdLabel
        });

        if (
            response.type === 'response' &&
            response.resultType === 'success' &&
            response.method === 'initialize' &&
            response.result &&
            typeof response.result === 'object'
        ) {
            const clientId = response.result.clientId;
            if (typeof clientId === 'string') {
                this._clientId = clientId;
                this._initialized = true;
            }
        }

        return response;
    }

    // ── message routing ──────────────────────────────────────────────────

    _handleMessage(message) {
        if (!isIpcMessage(message)) {
            this.emit('unknown_message', message);
            return;
        }

        switch (message.type) {
            case 'broadcast':
                this.emit('broadcast', message);
                return;

            case 'response':
                this._handleResponse(message);
                return;

            case 'request':
                this.emit('request', message);
                return;

            case 'client-discovery-request':
                this.emit('client_discovery_request', message);
                return;

            case 'client-discovery-response':
                this.emit('client_discovery_response', message);
                return;
        }
    }

    _handleResponse(message) {
        const requestId = message.requestId;
        if (!requestId) {
            this.emit('unmatched_response', message);
            return;
        }

        const pending = this._pendingRequests.get(requestId);
        if (!pending) {
            this.emit('unmatched_response', message);
            return;
        }

        clearTimeout(pending.timer);
        this._pendingRequests.delete(requestId);
        pending.resolve(message);
        this.emit('response', message);
    }

    // ── internal helpers ─────────────────────────────────────────────────

    _sendMessage(message) {
        if (!this._transport) {
            throw new Error('codex-ipc transport is not available');
        }
        this._transport.send(message);
    }

    _assertActiveSendAllowed(method) {
        if (method !== 'initialize' && isControlMethod(method)) {
            if (!(this._config.enabled && this._config.allowActive && this._config.confirmSend)) {
                throw new Error(
                    `Refusing to send control method without ` +
                    `TERMLINK_CODEX_IPC_ENABLED + ALLOW_ACTIVE + CONFIRM_SEND: ${method}`
                );
            }
        }
    }

    _rejectAllPending(error) {
        for (const [requestId, pending] of this._pendingRequests.entries()) {
            clearTimeout(pending.timer);
            pending.reject(error);
            this._pendingRequests.delete(requestId);
        }
    }
}

module.exports = {
    CodexIpcClient,
    CONTROL_METHODS,
    KNOWN_METHOD_VERSIONS,
    isControlMethod,
    getMethodVersion,
    isIpcMessage
};
