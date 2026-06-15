'use strict';

const { EventEmitter } = require('node:events');
const { ThreadStreamTracker, buildDesktopSurfaceSnapshot } = require('./codexIpcThreadStream');
const { readIpcConfig } = require('./codexIpcConfig');

class CodexIpcFeed extends EventEmitter {
    /**
     * @param {object} [options]
     * @param {object} [options.client]      — injectable CodexIpcClient (for testing)
     * @param {object} [options.tracker]     — injectable ThreadStreamTracker (for testing)
     * @param {number} [options.maxSnapshots] — max cached snapshots per conversation (default 20)
     */
    constructor(options = {}) {
        super();

        const config = readIpcConfig();

        this._config = config;
        this._client = options.client || null;
        this._tracker = options.tracker || new ThreadStreamTracker();
        this._maxSnapshots = options.maxSnapshots || 20;

        /** @type {Map<string, Array<{surface: object, timestamp: number}>>} */
        this._snapshotCache = new Map();

        this._started = false;
        this._online = false;

        // bound handlers for client events
        this._onClientConnect = this._onClientConnect.bind(this);
        this._onClientBroadcast = this._onClientBroadcast.bind(this);
        this._onClientClose = this._onClientClose.bind(this);
        this._onClientError = this._onClientError.bind(this);
    }

    // ── public API ───────────────────────────────────────────────────────

    get online() { return this._online; }
    get started() { return this._started; }
    get clientId() { return this._client ? this._client.clientId : null; }

    /**
     * Start the feed: connect to IPC and begin processing events.
     * If IPC is disabled, emit a disabled status and return without connecting.
     * @returns {Promise<void>}
     */
    async start() {
        if (this._started) return;
        this._started = true;

        if (!this._config.enabled) {
            this._emitStatus({ online: false, reason: 'disabled' });
            return;
        }

        if (!this._client) {
            const { CodexIpcClient } = require('./codexIpcClient');
            this._client = new CodexIpcClient();
        }

        this._client.on('connect', this._onClientConnect);
        this._client.on('broadcast', this._onClientBroadcast);
        this._client.on('close', this._onClientClose);
        this._client.on('error', this._onClientError);

        try {
            await this._client.connect();
        } catch (error) {
            // Pipe unavailable or connection refused — not an error, just offline.
            this._emitStatus({ online: false, reason: 'unavailable', detail: error.message });
        }
    }

    /**
     * Stop the feed: close the client and clean up listeners.
     */
    stop() {
        this._started = false;
        if (this._client) {
            this._client.removeListener('connect', this._onClientConnect);
            this._client.removeListener('broadcast', this._onClientBroadcast);
            this._client.removeListener('close', this._onClientClose);
            this._client.removeListener('error', this._onClientError);
            this._client.close();
        }
        this._online = false;
        this._emitStatus({ online: false, reason: 'stopped' });
    }

    /**
     * Get the latest cached surface snapshot for a conversation.
     * @param {string} conversationId
     * @returns {object|undefined}
     */
    getLatestSnapshot(conversationId) {
        const cache = this._snapshotCache.get(conversationId);
        if (!cache || cache.length === 0) return undefined;
        return cache[cache.length - 1].surface;
    }

    /**
     * Get all recent cached snapshots (latest per conversation).
     * @returns {Array<{conversationId: string, surface: object, timestamp: number}>}
     */
    getRecentSnapshots() {
        const result = [];
        for (const [conversationId, cache] of this._snapshotCache.entries()) {
            if (cache.length > 0) {
                const latest = cache[cache.length - 1];
                result.push({ conversationId, surface: latest.surface, timestamp: latest.timestamp });
            }
        }
        result.sort((a, b) => b.timestamp - a.timestamp);
        return result;
    }

    /**
     * Passthrough: send a request through the IPC client.
     * @param {string} method
     * @param {unknown} [params]
     * @returns {Promise<object>}
     */
    sendRequest(method, params) {
        if (!this._client) return Promise.reject(new Error('IPC client is not available'));
        return this._client.sendRequest(method, params);
    }

    /**
     * Check whether the active send gate is satisfied.
     */
    get allowActiveSend() {
        if (!this._client) return false;
        return this._client.enabled && this._client.allowActive && this._client.confirmSend;
    }

    // ── client event handlers ────────────────────────────────────────────

    _onClientConnect() {
        this._online = true;
        this._emitStatus({ online: true, clientId: this._client ? this._client.clientId : null });
    }

    _onClientBroadcast(message) {
        if (message.method !== 'thread-stream-state-changed') return;

        const projection = this._tracker.applyBroadcast(message);
        if (!projection || !projection.conversationId) return;

        const conversationId = projection.conversationId;
        const state = this._tracker.getConversationState(conversationId);
        const surface = buildDesktopSurfaceSnapshot(state, {
            conversationId,
            revision: projection.revision,
            status: inferStatusFromProjection(projection)
        });

        // Cache the snapshot.
        let cache = this._snapshotCache.get(conversationId);
        if (!cache) {
            cache = [];
            this._snapshotCache.set(conversationId, cache);
        }
        cache.push({ surface, timestamp: Date.now() });
        if (cache.length > this._maxSnapshots) {
            cache.splice(0, cache.length - this._maxSnapshots);
        }

        this.emit('snapshot', { conversationId, surface, revision: projection.revision });
    }

    _onClientClose() {
        this._online = false;
        this._emitStatus({ online: false, reason: 'disconnected' });
    }

    _onClientError(error) {
        this.emit('error', error);
    }

    // ── internal ─────────────────────────────────────────────────────────

    _emitStatus(status) {
        this.emit('status', status);
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function inferStatusFromProjection(projection) {
    if (projection.desynced) return undefined;
    const inProgress = Array.isArray(projection.inProgressTurnIds) && projection.inProgressTurnIds.length > 0;
    if (inProgress) return 'running';
    const latestStatus = projection.latestTurn?.status;
    if (latestStatus === 'completed' || latestStatus === 'done' || latestStatus === 'finished') return 'completed';
    if (latestStatus === 'failed' || latestStatus === 'error' || latestStatus === 'cancelled') return 'failed';
    if (latestStatus === 'interrupted') return 'interrupted';
    return undefined;
}

module.exports = { CodexIpcFeed };
