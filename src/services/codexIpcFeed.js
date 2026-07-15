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
     * @param {number} [options.maxEvents]    — max cached IPC sync/raw events (default 200)
     */
    constructor(options = {}) {
        super();

        const config = readIpcConfig();

        this._config = config;
        this._client = options.client || null;
        this._tracker = options.tracker || new ThreadStreamTracker();
        this._maxSnapshots = options.maxSnapshots || 20;
        this._maxEvents = options.maxEvents || 200;
        this._reconnectDelayMs = options.reconnectDelayMs || config.reconnectDelayMs || 1500;

        /** @type {Map<string, Array<{surface: object, timestamp: number}>>} */
        this._snapshotCache = new Map();
        this._syncEvents = [];
        this._rawEvents = [];
        this._sequence = 0;
        this._rawSequence = 0;

        this._started = false;
        this._closed = false;
        this._connecting = false;
        this._online = false;
        this._status = {
            online: false,
            pipePath: config.pipePath,
            eventCount: 0,
            connectAttempts: 0
        };
        this._connectAttempts = 0;
        this._reconnectTimer = null;

        // bound handlers for client events
        this._onClientConnect = this._onClientConnect.bind(this);
        this._onClientBroadcast = this._onClientBroadcast.bind(this);
        this._onClientMessageIn = this._onClientMessageIn.bind(this);
        this._onClientMessageOut = this._onClientMessageOut.bind(this);
        this._onClientClose = this._onClientClose.bind(this);
        this._onClientError = this._onClientError.bind(this);
    }

    // ── public API ───────────────────────────────────────────────────────

    get online() { return this._online; }
    get started() { return this._started; }
    get clientId() { return this._client ? this._client.clientId : null; }

    isOnline() {
        return this._online;
    }

    getStatus() {
        return { ...this._status, online: this._online, clientId: this._online ? this.clientId : this._status.clientId };
    }

    /**
     * Start the feed: connect to IPC and begin processing events.
     * If IPC is disabled, emit a disabled status and return without connecting.
     * @returns {Promise<void>}
     */
    async start() {
        if (this._started) return;
        this._started = true;
        this._closed = false;

        if (!this._config.enabled) {
            this._emitStatus({ online: false, reason: 'disabled' });
            return;
        }

        if (!this._client) {
            const { CodexIpcClient } = require('./codexIpcClient');
            this._client = new CodexIpcClient({ reconnect: false });
        }

        this._client.on('message_in', this._onClientMessageIn);
        this._client.on('message_out', this._onClientMessageOut);
        this._client.on('connect', this._onClientConnect);
        this._client.on('broadcast', this._onClientBroadcast);
        this._client.on('close', this._onClientClose);
        this._client.on('error', this._onClientError);

        await this._connect();
    }

    /**
     * Stop the feed: close the client and clean up listeners.
     */
    stop() {
        this._started = false;
        this._closed = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this._client) {
            this._client.removeListener('message_in', this._onClientMessageIn);
            this._client.removeListener('message_out', this._onClientMessageOut);
            this._client.removeListener('connect', this._onClientConnect);
            this._client.removeListener('broadcast', this._onClientBroadcast);
            this._client.removeListener('close', this._onClientClose);
            this._client.removeListener('error', this._onClientError);
            this._client.close();
        }
        this._online = false;
        this._emitStatus({ online: false, reconnecting: false, reason: 'stopped', clientId: undefined });
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

    getRecentEvents() {
        return this._syncEvents.slice();
    }

    getRawEvents() {
        return this._rawEvents.slice();
    }

    hasRicherExternalSurface(conversationId, candidate) {
        const ownClientId = this.clientId;
        const externalSurface = this._syncEvents
            .filter((event) =>
                event.threadId === conversationId &&
                event.surface &&
                event.sourceClientId &&
                event.sourceClientId !== ownClientId)
            .at(-1)
            ?.surface;

        return Boolean(
            externalSurface &&
            surfaceContentScore(externalSurface) > surfaceContentScore(candidate)
        );
    }

    hasExternalPendingPlanAction(conversationId, requestId) {
        if (!requestId) return false;
        const ownClientId = this.clientId;
        return this._syncEvents.some((event) =>
            event.threadId === conversationId &&
            event.sourceClientId &&
            event.sourceClientId !== ownClientId &&
            event.surface?.pendingPlanAction?.requestId === requestId);
    }

    clearRecentEvents() {
        this._syncEvents.length = 0;
        this._rawEvents.length = 0;
        this._sequence = 0;
        this._rawSequence = 0;
        this._status = {
            ...this._status,
            eventCount: 0,
            lastEventAt: undefined
        };
        this.emit('status', this.getStatus());
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

    sendBroadcast(method, params) {
        if (!this._client) throw new Error('IPC client is not available');
        return this._client.sendBroadcast(method, params);
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
        this._emitStatus({
            online: true,
            reconnecting: false,
            clientId: this.clientId,
            connectedAt: Date.now(),
            lastError: undefined
        });
    }

    _onClientMessageIn(message) {
        this._recordRawEvent('incoming', message);
    }

    _onClientMessageOut(message) {
        this._recordRawEvent('outgoing', message);
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

        console.warn('[codex-ipc][feed][broadcast] received thread-stream-state-changed', JSON.stringify({
            conversationId,
            revision: projection.revision,
            status: surface.status || 'unknown',
            itemCount: Array.isArray(surface.items) ? surface.items.length : 0,
            sourceClientId: message.sourceClientId || undefined,
            hasActiveGoal: Boolean(surface.activeGoal),
            hasPendingApproval: Boolean(surface.pendingApproval),
            hasPendingPlanAction: Boolean(surface.pendingPlanAction),
            desynced: Boolean(projection.desynced)
        }));

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

        const event = {
            sequence: ++this._sequence,
            receivedAt: Date.now(),
            method: message.method,
            threadId: conversationId,
            sourceClientId: message.sourceClientId,
            projection,
            surface
        };
        this._syncEvents.push(event);
        this._pruneEventCache(this._syncEvents);

        this._status = {
            ...this._status,
            eventCount: this._sequence,
            lastEventAt: event.receivedAt
        };

        this.emit('event', event);
        this.emit('snapshot', { conversationId, surface, revision: projection.revision });
        this.emit('status', this.getStatus());
    }

    _onClientClose() {
        if (this._closed) return;
        console.warn('[codex-ipc][feed][disconnect] IPC connection closed, scheduling reconnect', JSON.stringify({
            clientId: this.clientId,
            eventCount: this._sequence
        }));
        this._online = false;
        this._emitStatus({ online: false, reconnecting: true, reason: 'disconnected', clientId: undefined });
        this._scheduleReconnect();
    }

    _onClientError(error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.warn('[codex-ipc][feed][error] IPC client error', JSON.stringify({
            error: detail,
            clientId: this.clientId,
            eventCount: this._sequence
        }));
        this._online = false;
        this._status = {
            ...this._status,
            online: false,
            reconnecting: true,
            lastError: detail,
            clientId: undefined
        };
        this.emit('status', this.getStatus());
        this.emit('error', error);
        this._scheduleReconnect();
    }

    // ── internal ─────────────────────────────────────────────────────────

    _emitStatus(status) {
        this._online = Boolean(status.online);
        this._status = { ...this._status, ...status, online: this._online };
        this.emit('status', this.getStatus());
    }

    async _connect() {
        if (this._closed || this._connecting || !this._client) return;
        this._connecting = true;
        this._connectAttempts += 1;
        this._status = {
            ...this._status,
            reconnecting: true,
            connectAttempts: this._connectAttempts,
            pipePath: this._client.getPipePath ? this._client.getPipePath() : this._config.pipePath
        };
        this.emit('status', this.getStatus());

        try {
            await this._client.connect();
            console.warn('[codex-ipc][feed][connect] IPC connection established', JSON.stringify({
                clientId: this.clientId,
                pipePath: this._config.pipePath,
                connectAttempts: this._connectAttempts
            }));
            this._emitStatus({
                online: true,
                reconnecting: false,
                reason: undefined,
                detail: undefined,
                clientId: this.clientId,
                connectedAt: Date.now(),
                lastError: undefined
            });
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            console.warn('[codex-ipc][feed][connect] IPC connection failed', JSON.stringify({
                error: detail,
                pipePath: this._config.pipePath,
                connectAttempts: this._connectAttempts
            }));
            this._emitStatus({ online: false, reconnecting: true, reason: 'unavailable', detail, lastError: detail, clientId: undefined });
            this._scheduleReconnect();
        } finally {
            this._connecting = false;
        }
    }

    _scheduleReconnect() {
        if (this._closed || this._reconnectTimer) return;
        console.warn('[codex-ipc][feed][reconnect] scheduling reconnect', JSON.stringify({
            delayMs: this._reconnectDelayMs,
            attempt: this._connectAttempts + 1
        }));
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this._connect().catch((error) => this._onClientError(error));
        }, this._reconnectDelayMs);
        if (typeof this._reconnectTimer.unref === 'function') {
            this._reconnectTimer.unref();
        }
    }

    _recordRawEvent(direction, message) {
        const params = message && typeof message === 'object' ? message.params : undefined;
        const paramRecord = params && typeof params === 'object' && !Array.isArray(params) ? params : undefined;
        const event = {
            sequence: ++this._rawSequence,
            receivedAt: Date.now(),
            direction,
            type: message?.type,
            method: message?.method,
            requestId: message?.requestId,
            sourceClientId: message?.sourceClientId,
            targetClientId: message?.targetClientId,
            conversationId: extractConversationId(message),
            clientType: typeof paramRecord?.clientType === 'string' ? paramRecord.clientType : undefined,
            status: typeof paramRecord?.status === 'string' ? paramRecord.status : undefined,
            message
        };
        this._rawEvents.push(event);
        this._pruneEventCache(this._rawEvents);
    }

    _pruneEventCache(cache) {
        if (cache.length > this._maxEvents) {
            cache.splice(0, cache.length - this._maxEvents);
        }
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function inferStatusFromProjection(projection) {
    if (projection.desynced) return undefined;
    const runtimeStatus = projection.threadRuntimeStatus;
    if (runtimeStatus === 'active' || runtimeStatus === 'running' || runtimeStatus === 'inProgress' || runtimeStatus === 'in_progress') {
        return 'running';
    }
    if (runtimeStatus === 'failed' || runtimeStatus === 'error' || runtimeStatus === 'cancelled') return 'failed';
    if (runtimeStatus === 'interrupted') return 'interrupted';
    if (runtimeStatus === 'idle' || runtimeStatus === 'completed' || runtimeStatus === 'done' || runtimeStatus === 'finished') {
        return 'completed';
    }
    const inProgress = Array.isArray(projection.inProgressTurnIds) && projection.inProgressTurnIds.length > 0;
    if (inProgress) return 'running';
    const latestStatus = projection.latestTurn?.status;
    if (latestStatus === 'completed' || latestStatus === 'done' || latestStatus === 'finished') return 'completed';
    if (latestStatus === 'failed' || latestStatus === 'error' || latestStatus === 'cancelled') return 'failed';
    if (latestStatus === 'interrupted') return 'interrupted';
    return undefined;
}

function extractConversationId(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return undefined;
    seen.add(value);
    for (const key of ['conversationId', 'conversation_id', 'threadId', 'thread_id']) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    for (const nested of Object.values(value)) {
        const found = extractConversationId(nested, seen);
        if (found) return found;
    }
    return undefined;
}

function surfaceContentScore(surface) {
    const items = Array.isArray(surface?.items) ? surface.items : [];
    const hasPlan = items.some((item) => item?.kind === 'plan_prompt');
    const hasPendingPlan = Boolean(surface?.pendingPlanAction);
    const hasPendingApproval = Boolean(surface?.pendingApproval);
    const hasFinal = items.some((item) => item?.kind === 'message' && item?.phase === 'final_answer');

    return (
        items.length +
        (hasPlan ? 1000 : 0) +
        (hasPendingPlan ? 2000 : 0) +
        (hasPendingApproval ? 500 : 0) +
        (hasFinal ? 50 : 0)
    );
}

module.exports = { CodexIpcFeed };
