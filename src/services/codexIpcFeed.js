'use strict';

const { EventEmitter } = require('node:events');
const { ThreadStreamTracker, buildDesktopSurfaceSnapshot } = require('./codexIpcThreadStream');
const { readIpcConfig } = require('./codexIpcConfig');
const { diagnosticLog, stableKey } = require('./diagnosticLog');

const MAX_METADATA_BYTES = 256 * 1024;
const DIAGNOSTIC_INTERVAL_MS = 30_000;

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
        this._maxEvents = options.maxEvents || 200;
        this._reconnectDelayMs = options.reconnectDelayMs || config.reconnectDelayMs || 1500;

        /** @type {Map<string, object>} */
        this._snapshotCache = new Map();
        this._latestExternalSurfaceByConversation = new Map();
        this._syncEvents = [];
        this._rawEvents = [];
        this._metadataBytes = { sync: 0, raw: 0 };
        this._cacheStats = {
            conversationCount: 0,
            latestSurfaceCount: 0,
            estimatedSurfaceBytes: 0,
            syncMetadataCount: 0,
            rawMetadataCount: 0
        };
        this._diagnosticSurfaceSignatures = new Map();
        this._sequence = 0;
        this._rawSequence = 0;
        /** @type {Map<string, {conversationId: string, hostId: string, refCount: number}>} */
        this._desiredFollowing = new Map();
        /** @type {Set<{method: string, canHandle: Function, handle: Function, disposeClient: Function|null}>} */
        this._requestHandlerRegistrations = new Set();

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
        this._diagnosticTimer = null;
        this._ipcConnectionGeneration = 0;
        this._lastStatusFingerprint = null;

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
        return {
            ...this._status,
            supported: process.platform === 'win32' && this._config.enabled === true,
            online: this._online,
            activeSendAllowed: this.allowActiveSend,
            clientId: this._online ? this.clientId : this._status.clientId
        };
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
        diagnosticLog.event('server', 'server.ipc_feed.start', { enabled: this._config.enabled });

        if (!this._config.enabled) {
            this._emitStatus({ online: false, reason: 'disabled' });
            return;
        }

        if (!this._client) {
            const { CodexIpcClient } = require('./codexIpcClient');
            this._client = new CodexIpcClient({ reconnect: false });
        }
        this._startDiagnostics();
        this._installRequestHandlers();

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
        if (this._diagnosticTimer) {
            clearInterval(this._diagnosticTimer);
            this._diagnosticTimer = null;
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
        return this._snapshotCache.get(conversationId)?.surface;
    }

    /**
     * Get all recent cached snapshots (latest per conversation).
     * @returns {Array<{conversationId: string, surface: object, timestamp: number}>}
     */
    getRecentSnapshots() {
        const result = [];
        for (const [conversationId, latest] of this._snapshotCache.entries()) {
            if (latest) result.push({ conversationId, surface: latest.surface, timestamp: latest.timestamp });
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
        const externalSurface = this._latestExternalSurfaceByConversation.get(conversationId)?.surface;

        return Boolean(
            externalSurface &&
            surfaceContentScore(externalSurface) > surfaceContentScore(candidate)
        );
    }

    hasExternalPendingPlanAction(conversationId, requestId) {
        if (!requestId) return false;
        return this._latestExternalSurfaceByConversation.get(conversationId)
            ?.surface?.pendingPlanAction?.requestId === requestId;
    }

    clearRecentEvents() {
        this._syncEvents.length = 0;
        this._rawEvents.length = 0;
        this._metadataBytes.sync = 0;
        this._metadataBytes.raw = 0;
        this._sequence = 0;
        this._rawSequence = 0;
        this._status = {
            ...this._status,
            eventCount: 0,
            lastEventAt: undefined
        };
        this._emitStatus({});
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

    addRequestHandler(method, canHandle, handle) {
        const registration = {
            method,
            canHandle,
            handle,
            disposeClient: null
        };
        this._requestHandlerRegistrations.add(registration);
        this._installRequestHandler(registration);
        return () => {
            this._requestHandlerRegistrations.delete(registration);
            if (typeof registration.disposeClient === 'function') {
                registration.disposeClient();
                registration.disposeClient = null;
            }
        };
    }

    followConversation(conversationId, hostId = 'local') {
        const subscription = normalizeFollowingSubscription(conversationId, hostId);
        if (!subscription) return false;
        const current = this._desiredFollowing.get(subscription.key);
        if (current) {
            current.refCount += 1;
            return true;
        }
        this._desiredFollowing.set(subscription.key, {
            conversationId: subscription.conversationId,
            hostId: subscription.hostId,
            refCount: 1
        });
        diagnosticLog.event('server', 'server.ipc_feed.follow', {
            conversationIdPresent: true,
            hostId: subscription.hostId,
            desiredCount: this._desiredFollowing.size
        });
        this._sendFollowingChanged(subscription, true);
        return true;
    }

    unfollowConversation(conversationId, hostId = 'local') {
        const subscription = normalizeFollowingSubscription(conversationId, hostId);
        if (!subscription) return false;
        const current = this._desiredFollowing.get(subscription.key);
        if (!current) return false;
        if (current.refCount > 1) {
            current.refCount -= 1;
            return true;
        }
        this._desiredFollowing.delete(subscription.key);
        diagnosticLog.event('server', 'server.ipc_feed.unfollow', {
            conversationIdPresent: true,
            hostId: subscription.hostId,
            desiredCount: this._desiredFollowing.size
        });
        this._sendFollowingChanged(subscription, false);
        return true;
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
        this._ipcConnectionGeneration += 1;
        this._online = true;
        this._emitStatus({
            online: true,
            reconnecting: false,
            clientId: this.clientId,
            connectedAt: Date.now(),
            lastError: undefined
        });
        diagnosticLog.event('server', 'server.ipc_feed.connected', {
            clientIdPresent: Boolean(this.clientId),
            desiredCount: this._desiredFollowing.size,
            connectAttempts: this._connectAttempts
        }, 'info');
    }

    _onClientMessageIn(message) {
        this._recordRawEvent('incoming', message);
    }

    _onClientMessageOut(message) {
        this._recordRawEvent('outgoing', message);
    }

    _onClientBroadcast(message) {
        if (message.method !== 'thread-stream-state-changed') return;

        const sourceClientId = typeof message.sourceClientId === 'string' && message.sourceClientId.trim()
            ? message.sourceClientId.trim()
            : null;
        const hostId = extractHostId(message.params);
        const projection = this._tracker.applyBroadcast(message, {
            connectionGeneration: this._ipcConnectionGeneration,
            sourceClientId,
            hostId
        });
        if (!projection || !projection.conversationId) return;

        const conversationId = projection.conversationId;
        if (projection.ignored) return;

        const receivedAt = Date.now();
        const event = createSyncEvent({
            sequence: ++this._sequence,
            receivedAt,
            message,
            projection,
            conversationId
        });
        const previous = this._snapshotCache.get(conversationId);

        if (projection.desynced && !projection.stateChanged) {
            diagnosticLog.event('server', 'server.ipc.surface.projection_desynced', {
                conversationKey: stableKey(conversationId),
                changeType: projection.changeType || null,
                revision: projection.revision,
                baseRevision: projection.baseRevision,
                previousRevision: previous?.revision,
                sourceEpoch: projection.sourceEpoch || null,
                sourceClientIdPresent: Boolean(projection.sourceClientId || sourceClientId),
                hostIdPresent: Boolean(projection.hostId || hostId),
                connectionGeneration: projection.connectionGeneration,
                desyncReason: projection.desyncReason || 'unknown'
            }, 'warn');
            this._appendMetadata(this._syncEvents, event, 'sync');
            this._status = { ...this._status, eventCount: this._sequence, lastEventAt: receivedAt };
            this.emit('event', event);
            const cachedSurface = this._snapshotCache.get(conversationId)?.surface;
            if (cachedSurface) {
                this.emit('snapshot', {
                    conversationId,
                    surface: { ...cachedSurface, desynced: true },
                    revision: cachedSurface.revision,
                    sourceEpoch: cachedSurface.sourceEpoch,
                    desynced: true
                });
            }
            return;
        }

        if (!projection.stateChanged) return;
        const state = this._tracker.getConversationState(conversationId);
        const surface = buildDesktopSurfaceSnapshot(state, {
            conversationId,
            revision: projection.revision,
            sourceEpoch: projection.sourceEpoch,
            status: inferStatusFromProjection(projection),
            desynced: false
        });
        surface.sourceEpoch = projection.sourceEpoch;
        event.itemCount = Array.isArray(surface.items) ? surface.items.length : 0;
        event.hasActiveGoal = Boolean(surface.activeGoal);
        event.hasPendingApproval = Boolean(surface.pendingApproval);
        event.hasPendingPlanAction = Boolean(surface.pendingPlanAction);
        event.hasPendingUserInputAction = Boolean(surface.pendingUserInputAction);
        event.status = surface.status;

        const timestamp = receivedAt;
        const record = {
            surface,
            timestamp,
            revision: projection.revision,
            sourceEpoch: projection.sourceEpoch,
            connectionGeneration: projection.connectionGeneration ?? this._ipcConnectionGeneration,
            sourceClientId: projection.sourceClientId ?? sourceClientId,
            hostId: projection.hostId ?? hostId,
            historyBaselineComplete: surface.historyBaselineComplete,
            itemCount: Array.isArray(surface.items) ? surface.items.length : 0,
            status: surface.status
        };
        this._snapshotCache.set(conversationId, record);
        this._cacheStats.conversationCount = this._snapshotCache.size;
        this._cacheStats.latestSurfaceCount = this._snapshotCache.size;
        this._cacheStats.estimatedSurfaceBytes += estimateBytes(surface) - estimateBytes(previous?.surface);

        if (record.sourceClientId !== this.clientId) {
            this._latestExternalSurfaceByConversation.set(conversationId, {
                surface,
                sourceEpoch: record.sourceEpoch,
                connectionGeneration: record.connectionGeneration,
                sourceClientId: record.sourceClientId,
                hostId: record.hostId,
                timestamp
            });
        }

        this._appendMetadata(this._syncEvents, event, 'sync');
        this._status = { ...this._status, eventCount: this._sequence, lastEventAt: receivedAt };
        this._recordSurfaceDiagnostics(conversationId, surface, projection);
        if (previous?.status !== surface.status || isTerminalSurfaceStatus(surface.status)) {
            diagnosticLog.event('server', 'server.ipc.surface.status_transition', {
                conversationKey: stableKey(conversationId),
                previousStatus: previous?.status || null,
                status: surface.status || 'unknown',
                latestTurnIdPresent: Boolean(surface.latestTurnId),
                revision: projection.revision,
                sourceEpoch: projection.sourceEpoch || null,
                connectionGeneration: projection.connectionGeneration,
                desynced: false
            });
        }
        this.emit('event', event);
        this.emit('snapshot', { conversationId, surface, revision: projection.revision });
    }

    _onClientClose() {
        if (this._closed) return;
        console.warn('[codex-ipc][feed][disconnect] IPC connection closed, scheduling reconnect', JSON.stringify({
            clientId: this.clientId,
            eventCount: this._sequence
        }));
        this._online = false;
        diagnosticLog.event('server', 'server.ipc_feed.disconnected', {
            eventCount: this._sequence,
            desiredCount: this._desiredFollowing.size
        }, 'warn');
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
        diagnosticLog.error('server', 'server.ipc_feed.error', error, {
            eventCount: this._sequence,
            desiredCount: this._desiredFollowing.size
        });
        this._emitStatus({
            online: false,
            reconnecting: true,
            lastError: detail,
            clientId: undefined
        });
        this.emit('error', error);
        this._scheduleReconnect();
    }

    // ── internal ─────────────────────────────────────────────────────────

    _emitStatus(status) {
        this._online = Object.prototype.hasOwnProperty.call(status, 'online')
            ? Boolean(status.online)
            : this._online;
        this._status = { ...this._status, ...status, online: this._online };
        const current = this.getStatus();
        const fingerprint = JSON.stringify([
            current.supported,
            current.online,
            current.activeSendAllowed,
            current.clientId ?? null,
            current.reason ?? null,
            current.reconnecting ?? false
        ]);
        if (fingerprint === this._lastStatusFingerprint) return;
        this._lastStatusFingerprint = fingerprint;
        this.emit('status', current);
    }

    async _connect() {
        if (this._closed || this._connecting || !this._client) return;
        this._connecting = true;
        this._connectAttempts += 1;
        this._emitStatus({
            reconnecting: true,
            connectAttempts: this._connectAttempts,
            pipePath: this._client.getPipePath ? this._client.getPipePath() : this._config.pipePath
        });

        try {
            await this._client.connect();
            this._replayDesiredFollowing();
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

    _replayDesiredFollowing() {
        for (const subscription of this._desiredFollowing.values()) {
            this._sendFollowingChanged(subscription, true);
        }
    }

    _installRequestHandlers() {
        for (const registration of this._requestHandlerRegistrations) {
            this._installRequestHandler(registration);
        }
    }

    _installRequestHandler(registration) {
        if (
            !registration ||
            typeof registration.disposeClient === 'function' ||
            !this._client ||
            typeof this._client.addRequestHandler !== 'function'
        ) {
            return;
        }
        registration.disposeClient = this._client.addRequestHandler(
            registration.method,
            registration.canHandle,
            registration.handle
        );
    }

    _sendFollowingChanged(subscription, following) {
        if (!this._client?.initialized) return false;
        try {
            this._client.sendBroadcast('thread-stream-following-changed', {
                conversationId: subscription.conversationId,
                hostId: subscription.hostId,
                following
            });
            console.warn('[codex-ipc][feed][following]', JSON.stringify({
                conversationId: subscription.conversationId,
                hostId: subscription.hostId,
                following,
                clientId: this.clientId
            }));
            return true;
        } catch (error) {
            console.warn('[codex-ipc][feed][following-failed]', JSON.stringify({
                conversationId: subscription.conversationId,
                hostId: subscription.hostId,
                following,
                error: error instanceof Error ? error.message : String(error)
            }));
            return false;
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
        };
        this._appendMetadata(this._rawEvents, event, 'raw');
    }

    _appendMetadata(cache, event, kind) {
        const bytes = estimateBytes(event);
        cache.push(event);
        this._metadataBytes[kind] += bytes;
        while (cache.length > this._maxEvents || this._metadataBytes[kind] > MAX_METADATA_BYTES) {
            const removed = cache.shift();
            this._metadataBytes[kind] -= estimateBytes(removed);
        }
        this._cacheStats[`${kind}MetadataCount`] = cache.length;
    }

    _recordSurfaceDiagnostics(conversationId, surface, projection) {
        const diagnosticSignature = JSON.stringify({
            status: surface.status || 'unknown',
            hasActiveGoal: Boolean(surface.activeGoal),
            hasPendingApproval: Boolean(surface.pendingApproval),
            hasPendingPlanAction: Boolean(surface.pendingPlanAction),
            desynced: Boolean(projection.desynced),
            itemCount: Array.isArray(surface.items) ? surface.items.length : 0
        });
        if (this._diagnosticSurfaceSignatures.get(conversationId) === diagnosticSignature) return;
        this._diagnosticSurfaceSignatures.set(conversationId, diagnosticSignature);
        diagnosticLog.event('server', 'server.ipc.surface.changed', {
            conversationKey: stableKey(conversationId),
            status: surface.status || 'unknown',
            revision: projection.revision,
            sourceEpoch: projection.sourceEpoch,
            itemCount: Array.isArray(surface.items) ? surface.items.length : 0,
            hasActiveGoal: Boolean(surface.activeGoal),
            hasPendingApproval: Boolean(surface.pendingApproval),
            hasPendingPlanAction: Boolean(surface.pendingPlanAction),
            desynced: Boolean(projection.desynced)
        });
    }

    _startDiagnostics() {
        if (this._diagnosticTimer) return;
        this._diagnosticTimer = setInterval(() => {
            const usage = process.memoryUsage();
            diagnosticLog.event('server', 'server.ipc_feed.memory', {
                rss: usage.rss,
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external,
                arrayBuffers: usage.arrayBuffers,
                conversationCount: this._snapshotCache.size,
                latestSurfaceCount: this._snapshotCache.size,
                syncMetadataCount: this._syncEvents.length,
                rawMetadataCount: this._rawEvents.length,
                desiredFollowingCount: this._desiredFollowing.size
            });
        }, DIAGNOSTIC_INTERVAL_MS);
        if (typeof this._diagnosticTimer.unref === 'function') this._diagnosticTimer.unref();
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function createSyncEvent({ sequence, receivedAt, message, projection, conversationId }) {
    return {
        sequence,
        receivedAt,
        method: message.method,
        threadId: conversationId,
        sourceClientId: projection.sourceClientId ?? null,
        sourceEpoch: projection.sourceEpoch,
        revision: projection.revision,
        status: inferStatusFromProjection(projection),
        itemCount: Array.isArray(projection.latestTurn?.items) ? projection.latestTurn.items.length : undefined,
        desynced: Boolean(projection.desynced),
        hasActiveGoal: Boolean(projection.activeGoal),
        hasPendingApproval: Boolean(projection.hasPendingApproval),
        hasPendingPlanAction: Boolean(projection.hasPendingPlanAction),
        hasPendingUserInputAction: Boolean(projection.hasPendingUserInputAction)
    };
}

function extractHostId(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    if (typeof value.hostId === 'string' && value.hostId.trim()) return value.hostId.trim();
    for (const nested of Object.values(value)) {
        const found = extractHostId(nested, seen);
        if (found) return found;
    }
    return null;
}

function estimateBytes(value) {
    if (value === undefined) return 0;
    try {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch (_) {
        return 0;
    }
}

function isTerminalSurfaceStatus(status) {
    return ['completed', 'failed', 'interrupted', 'cancelled', 'canceled']
        .includes(typeof status === 'string' ? status.trim().toLowerCase() : '');
}

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

function normalizeFollowingSubscription(conversationId, hostId) {
    if (typeof conversationId !== 'string' || !conversationId.trim()) return null;
    if (typeof hostId !== 'string' || !hostId.trim()) return null;
    const normalizedConversationId = conversationId.trim();
    const normalizedHostId = hostId.trim();
    return {
        key: `${normalizedHostId}\u0000${normalizedConversationId}`,
        conversationId: normalizedConversationId,
        hostId: normalizedHostId
    };
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
