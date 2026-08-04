'use strict';

const { randomUUID } = require('node:crypto');
const {
    canonicalize,
    hashPayload,
    buildConversationRoot,
    projectCanonicalHistory
} = require('./codexHistoryCanonicalizer');

const DEFAULTS = Object.freeze({
    manifestPageSize: 200,
    deltaMaxItems: 100,
    deltaMaxBytes: 256 * 1024,
    maxManifestItems: 10_000,
    maxManifestBytes: 4 * 1024 * 1024,
    syncInactivityTimeoutMs: 30_000,
    historyHighWaterBytes: 2 * 1024 * 1024,
    historyLowWaterBytes: 512 * 1024,
    historyHardLimitBytes: 8 * 1024 * 1024,
    historyHardLimitDurationMs: 15_000,
    historyPumpIntervalMs: 25,
    historyMaxEnvelopeBytes: 256 * 1024,
    historyInlinePayloadBytes: 128 * 1024,
    historyPayloadChunkBytes: 96 * 1024,
    historyPayloadChunkEnvelopeBytes: 128 * 1024
});
const INLINE_IMAGE_DATA_URL = /data:image\/[a-z0-9.+-]+;base64,/i;

function computeHistoryPageHash(page) {
    const input = {
        syncId: page.syncId,
        sequence: page.sequence,
        pageIndex: page.pageIndex,
        pageCount: page.pageCount,
        baseRoot: page.baseRoot,
        targetRoot: page.targetRoot,
        baselineComplete: Boolean(page.baselineComplete),
        fullOrderIncluded: Boolean(page.fullOrderIncluded),
        upserts: Array.isArray(page.upserts) ? page.upserts.map(toWireItem) : [],
        deletes: Array.isArray(page.deletes) ? page.deletes : [],
        canonicalOrder: Array.isArray(page.canonicalOrder) ? page.canonicalOrder : []
    };
    return hashPayload(canonicalize(input));
}

function buildManifestDiff({ localItems = [], canonicalItems = [], baselineComplete = true }) {
    const localMap = new Map(localItems.map((item) => [item.itemKey, item]));
    const canonicalMap = new Map(canonicalItems.map((item) => [item.itemKey, item]));
    const upserts = canonicalItems.filter((item) => {
        const local = localMap.get(item.itemKey);
        return !local || local.contentHash !== item.contentHash;
    });
    const deletes = baselineComplete
        ? localItems.filter((item) => !canonicalMap.has(item.itemKey)).map((item) => item.itemKey)
        : [];
    const localOrder = localItems.map((item) => item.itemKey);
    const canonicalOrder = canonicalItems.map((item) => item.itemKey);
    const orderChanged = baselineComplete && JSON.stringify(localOrder) !== JSON.stringify(canonicalOrder);
    return {
        upserts,
        deletes,
        canonicalOrder: orderChanged ? canonicalOrder : undefined,
        fullOrderIncluded: Boolean(orderChanged),
        baselineComplete: Boolean(baselineComplete)
    };
}

function buildPartialMergedDiff({ localItems = [], canonicalItems = [], baseRoot = null }) {
    const localMap = new Map(localItems.map((item) => [item.itemKey, item]));
    const mergedOrder = localItems.map((item) => item.itemKey);
    const upserts = [];
    for (const item of canonicalItems) {
        const local = localMap.get(item.itemKey);
        if (!local) mergedOrder.push(item.itemKey);
        if (!local || local.contentHash !== item.contentHash) {
            upserts.push({ ...item, position: mergedOrder.indexOf(item.itemKey) });
        }
    }
    const mergedItems = mergedOrder.map((key, position) => {
        const item = canonicalItems.find((candidate) => candidate.itemKey === key) || localMap.get(key);
        return item ? { ...item, position } : null;
    }).filter(Boolean);
    return {
        ...buildManifestDiff({ localItems: [], canonicalItems: [], baselineComplete: false }),
        upserts,
        deletes: [],
        canonicalOrder: undefined,
        fullOrderIncluded: false,
        baselineComplete: false,
        targetRoot: buildConversationRoot(mergedItems),
        baseRoot
    };
}

function buildDeltaPages({
    syncId,
    sequence = 1,
    baseRoot = null,
    targetRoot,
    upserts = [],
    deletes = [],
    canonicalOrder,
    baselineComplete = true,
    maxItems = DEFAULTS.deltaMaxItems,
    maxBytes = DEFAULTS.deltaMaxBytes,
    enablePayloadChunks = false,
    payloadInlineMaxBytes = DEFAULTS.historyInlinePayloadBytes,
    payloadChunkBytes = DEFAULTS.historyPayloadChunkBytes
}) {
    const order = Array.isArray(canonicalOrder) ? canonicalOrder : undefined;
    const pages = [];
    let pageUpserts = [];
    let pageDeletes = [];
    const appendCandidate = (kind, value) => {
        const nextUpserts = kind === 'upsert' ? [...pageUpserts, value] : pageUpserts;
        const nextDeletes = kind === 'delete' ? [...pageDeletes, value] : pageDeletes;
        const draft = {
            syncId, sequence, pageIndex: pages.length, pageCount: 0, baseRoot, targetRoot,
            baselineComplete, fullOrderIncluded: pages.length === 0 && Boolean(order),
            upserts: nextUpserts.map((item) => toWireItem(item, {
                enablePayloadChunks,
                payloadInlineMaxBytes,
                payloadChunkBytes
            })), deletes: nextDeletes,
            ...(pages.length === 0 && order ? { canonicalOrder: order } : {})
        };
        return Buffer.byteLength(JSON.stringify(draft), 'utf8') <= maxBytes && nextUpserts.length + nextDeletes.length <= maxItems;
    };
    for (const item of upserts) {
        if (!appendCandidate('upsert', item) && (pageUpserts.length || pageDeletes.length)) {
            pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes, enablePayloadChunks, payloadInlineMaxBytes, payloadChunkBytes }));
            pageUpserts = [];
            pageDeletes = [];
        }
        pageUpserts.push(item);
    }
    for (const item of deletes) {
        if (!appendCandidate('delete', item) && (pageUpserts.length || pageDeletes.length)) {
            pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes, enablePayloadChunks, payloadInlineMaxBytes, payloadChunkBytes }));
            pageUpserts = [];
            pageDeletes = [];
        }
        pageDeletes.push(item);
    }
    if (pageUpserts.length || pageDeletes.length || pages.length === 0) {
        pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes, enablePayloadChunks, payloadInlineMaxBytes, payloadChunkBytes }));
    }
    const pageCount = pages.length;
    return pages.map((page) => {
        const next = { ...page, pageCount };
        const finalPage = { ...next, pageHash: computeHistoryPageHash(next) };
        Object.defineProperty(finalPage, 'payloadChunks', { value: page.payloadChunks || [], enumerable: false });
        return finalPage;
    });
}

function makePage({ syncId, sequence, pageIndex, baseRoot, targetRoot, baselineComplete, order, upserts, deletes, enablePayloadChunks = false, payloadInlineMaxBytes = DEFAULTS.historyInlinePayloadBytes, payloadChunkBytes = DEFAULTS.historyPayloadChunkBytes }) {
    const fullOrderIncluded = pageIndex === 0 && Array.isArray(order);
    const payloadChunks = [];
    const page = {
        syncId,
        sequence,
        pageIndex,
        pageCount: 0,
        baseRoot,
        targetRoot,
        baselineComplete: Boolean(baselineComplete),
        fullOrderIncluded,
        upserts: upserts.map((item) => {
            const result = toWireItemWithChunks(item, { enablePayloadChunks, payloadInlineMaxBytes, payloadChunkBytes });
            payloadChunks.push(...result.chunks.map((chunk) => ({ ...chunk, pageIndex })));
            return result.wire;
        }),
        deletes,
        ...(fullOrderIncluded ? { canonicalOrder: order } : {})
    };
    // Chunks are a server-side delivery queue, not part of the delta page
    // wire/hash. Keep them non-enumerable so legacy page serialization stays
    // metadata-only and the 256 KiB page gate remains meaningful.
    Object.defineProperty(page, 'payloadChunks', { value: payloadChunks, enumerable: false });
    return page;
}

function toWireItem(item, options = {}) {
    return toWireItemWithChunks(item, options).wire;
}

function toWireItemWithChunks(item, { enablePayloadChunks = false, payloadInlineMaxBytes = DEFAULTS.historyInlinePayloadBytes, payloadChunkBytes = DEFAULTS.historyPayloadChunkBytes } = {}) {
    const payloadJson = typeof item.payloadJson === 'string' ? item.payloadJson : '';
    if (INLINE_IMAGE_DATA_URL.test(payloadJson)) {
        const error = new Error('History payload contains an image data URL.');
        error.code = 'history_media_not_externalized';
        throw error;
    }
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');
    const shouldChunk = enablePayloadChunks && payloadBytes > payloadInlineMaxBytes;
    const chunks = shouldChunk ? splitUtf8(payloadJson, payloadChunkBytes) : [];
    const wire = {
        itemKey: item.itemKey,
        turnId: item.turnId ?? null,
        position: item.position,
        itemType: item.itemType,
        role: item.role ?? null,
        clientRequestId: item.clientRequestId ?? null,
        payloadJson: shouldChunk ? '' : payloadJson,
        contentHash: item.contentHash
    };
    if (shouldChunk || Number(item.payloadChunkCount) > 0) {
        wire.payloadHash = shouldChunk ? hashPayload(payloadJson) : item.payloadHash;
        wire.payloadBytes = shouldChunk ? payloadBytes : item.payloadBytes;
        wire.payloadChunkCount = shouldChunk ? chunks.length : item.payloadChunkCount;
        if (!shouldChunk) wire.payloadJson = '';
    }
    return {
        wire,
        chunks: chunks.map((data, chunkIndex) => ({
            itemKey: item.itemKey,
            chunkIndex,
            chunkCount: chunks.length,
            payloadHash: wire.payloadHash,
            payloadBytes,
            data
        }))
    };
}

function splitUtf8(value, maxBytes) {
    const limit = Math.max(1, Number(maxBytes) || DEFAULTS.historyPayloadChunkBytes);
    const chunks = [];
    let current = '';
    let currentBytes = 0;
    for (const character of String(value)) {
        const bytes = Buffer.byteLength(character, 'utf8');
        if (current && currentBytes + bytes > limit) {
            chunks.push(current);
            current = '';
            currentBytes = 0;
        }
        current += character;
        currentBytes += bytes;
    }
    if (current || !chunks.length) chunks.push(current);
    return chunks;
}

class CodexHistorySyncService {
    constructor({ send, now = Date.now, options = {}, isStillActive } = {}) {
        this.send = typeof send === 'function' ? send : () => {};
        this.now = now;
        this.options = { ...DEFAULTS, ...options };
        this.isStillActive = typeof isStillActive === 'function' ? isStillActive : () => true;
        this._baselines = new Map();
        this._syncs = new WeakMap();
    }

    registerBaseline(conversationId, sourceKind, sourceData, options = {}) {
        const items = projectCanonicalHistory({ sourceKind, sourceData });
        const baseline = {
            conversationId,
            items,
            rootHash: buildConversationRoot(items),
            complete: Boolean(options.complete),
            sourceKind: options.baselineSourceKind || sourceKind || null,
            sourceEpoch: options.sourceEpoch || null,
            updatedAt: this.now()
        };
        this._baselines.set(conversationId, baseline);
        return baseline;
    }

    registerBaselineItems(conversationId, items, options = {}) {
        const normalizedItems = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
        const baseline = {
            conversationId,
            items: normalizedItems,
            rootHash: buildConversationRoot(normalizedItems),
            complete: Boolean(options.complete),
            sourceKind: options.baselineSourceKind || null,
            sourceEpoch: options.sourceEpoch || null,
            updatedAt: this.now()
        };
        this._baselines.set(conversationId, baseline);
        return baseline;
    }

    getBaseline(conversationId) { return this._baselines.get(conversationId); }

    startSync({ ws, conversationId, syncId = randomUUID(), checkpoint = {}, selectionGeneration = 0, clientSelectionGeneration = 0, cacheSchemaVersion = 1 } = {}) {
        if (!ws || !conversationId || !isUuid(syncId)) return { ok: false, detailCode: 'invalid_sync_id' };
        if (!this.isStillActive(ws, conversationId, selectionGeneration)) return { ok: false, detailCode: 'stale_selection' };
        const baseline = this._baselines.get(conversationId);
        if (!baseline) return { ok: false, detailCode: 'history_unavailable' };
        const normalizedCacheSchemaVersion = normalizeCacheSchemaVersion(cacheSchemaVersion);
        const state = {
            ws, conversationId, syncId, sequence: 1, selectionGeneration,
            clientSelectionGeneration: normalizeClientSelectionGeneration(clientSelectionGeneration),
            checkpoint: normalizeCheckpoint(checkpoint), baseline,
            cacheSchemaVersion: normalizedCacheSchemaVersion,
            supportsPayloadChunks: normalizedCacheSchemaVersion >= 2,
            perPageAck: normalizedCacheSchemaVersion >= 2,
            createdAt: this.now(), lastActivityAt: this.now(), awaitingManifest: false,
            lastAckedRoot: checkpoint.rootHash || null,
            awaitingAckPageIndex: null,
            activePageChunks: [],
            nextChunkIndex: 0
        };
        this._syncs.set(ws, state);
        this._armInactivityTimer(ws, state);
        if (baseline.complete && state.checkpoint.complete && baseline.rootHash === state.checkpoint.rootHash && baseline.items.length === state.checkpoint.itemCount) {
            clearTimeout(state.inactivityTimer);
            state.inactivityTimer = null;
            this._emit(ws, state, { type: 'conversation_history_sync_state', syncId, conversationId, state: 'live' });
            this.cancel(ws);
            return { ok: true, state: 'live', sync: state };
        }
        state.awaitingManifest = true;
        this._emit(ws, state, { type: 'conversation_history_manifest_required', syncId, conversationId, reason: 'root_mismatch', pageSize: this.options.manifestPageSize });
        return { ok: true, state: 'awaiting_manifest', sync: state };
    }

    handleManifestPage(ws, page) {
        const state = this._syncs.get(ws);
        if (!state || state.syncId !== page?.syncId || state.conversationId !== page?.conversationId) return { ok: false, detailCode: 'stale_sync' };
        if (!this._isCurrent(state) || !sameClientSelectionGeneration(state, page?.clientSelectionGeneration)) return { ok: false, detailCode: 'stale_selection' };
        if (!Number.isInteger(page.pageIndex) || page.pageIndex < 0 || !Array.isArray(page.items) || page.items.length > this.options.manifestPageSize) return this._fail(ws, state, 'manifest_invalid');
        state.lastActivityAt = this.now();
        this._armInactivityTimer(ws, state);
        state.manifestPages ||= new Map();
        state.manifestPages.set(page.pageIndex, page.items.map((item) => ({ itemKey: item.itemKey, contentHash: item.contentHash })));
        if (!page.lastPage) return { ok: true, pending: true };
        const pages = Array.from(state.manifestPages.keys()).sort((a, b) => a - b);
        if (pages.some((value, index) => value !== index)) return this._fail(ws, state, 'manifest_incomplete');
        const localItems = pages.flatMap((index) => state.manifestPages.get(index));
        if (localItems.length > this.options.maxManifestItems || Buffer.byteLength(JSON.stringify(localItems), 'utf8') > this.options.maxManifestBytes) return this._fail(ws, state, 'manifest_limit_exceeded');
        const diff = state.baseline.complete
            ? buildManifestDiff({ localItems, canonicalItems: state.baseline.items, baselineComplete: true })
            : buildPartialMergedDiff({ localItems, canonicalItems: state.baseline.items, baseRoot: state.checkpoint.rootHash || null });
        const targetRoot = diff.targetRoot || buildConversationRoot(state.baseline.items);
        let pagesOut;
        try {
            pagesOut = buildDeltaPages({
                syncId: state.syncId,
                sequence: state.sequence,
                baseRoot: state.checkpoint.rootHash || null,
                targetRoot,
                ...diff,
                maxItems: this.options.deltaMaxItems,
                maxBytes: this.options.deltaMaxBytes,
                enablePayloadChunks: state.supportsPayloadChunks,
                payloadInlineMaxBytes: this.options.historyInlinePayloadBytes,
                payloadChunkBytes: this.options.historyPayloadChunkBytes
            });
        } catch (error) {
            return this._fail(ws, state, error?.code || 'history_media_not_externalized');
        }
        state.pages = pagesOut;
        state.nextPageIndex = 0;
        state.backpressureSince = null;
        state.awaitingManifest = false;
        state.lastActivityAt = this.now();
        state.awaitingAckPageIndex = null;
        state.activePageChunks = [];
        state.nextChunkIndex = 0;
        this._armInactivityTimer(ws, state);
        this._pumpPages(ws, state);
        return { ok: true, pages: pagesOut };
    }

    handleAck(ws, ack) {
        const state = this._syncs.get(ws);
        if (!state || ack?.syncId !== state.syncId || ack?.conversationId !== state.conversationId) return { ok: false, detailCode: 'stale_sync' };
        if (!this._isCurrent(state) || !sameClientSelectionGeneration(state, ack?.clientSelectionGeneration)) return { ok: false, detailCode: 'stale_selection' };
        if (ack.sequence < state.sequence) return { ok: true, ignored: true };
        if (ack.sequence !== state.sequence || ack.targetRoot !== state.pages?.at(-1)?.targetRoot) return this._fail(ws, state, 'ack_mismatch');
        if (state.perPageAck) {
            if (!Number.isInteger(ack.pageIndex) ||
                ack.pageIndex !== state.awaitingAckPageIndex ||
                state.nextChunkIndex < (state.activePageChunks || []).length) {
                return this._fail(ws, state, 'ack_mismatch');
            }
            state.awaitingAckPageIndex = null;
            state.activePageChunks = [];
            state.nextChunkIndex = 0;
        }
        state.lastAckedRoot = ack.targetRoot;
        state.lastActivityAt = this.now();
        this._armInactivityTimer(ws, state);
        const finalPage = !state.perPageAck || ack.pageIndex === state.pages.length - 1;
        if (finalPage) {
            this._emit(ws, state, { type: 'conversation_history_sync_state', syncId: state.syncId, conversationId: state.conversationId, state: state.baseline.complete ? 'live' : 'partial', ...(state.baseline.complete ? {} : { detailCode: 'baseline_partial' }) });
            // The final page ACK completes this sync even when the baseline is
            // intentionally partial (for example, while a turn is running).
            // Do not leave the inactivity timer armed or emit a misleading
            // sync_timeout after the client has already committed the page.
            this.cancel(ws);
        }
        if (state.perPageAck && !finalPage) this._pumpPages(ws, state);
        return { ok: true, state: state.baseline.complete ? 'live' : 'partial' };
    }

    cancel(ws) {
        const state = this._syncs.get(ws);
        if (state?.pageTimer) clearTimeout(state.pageTimer);
        if (state?.inactivityTimer) clearTimeout(state.inactivityTimer);
        this._syncs.delete(ws);
    }

    _armInactivityTimer(ws, state) {
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        state.inactivityTimer = setTimeout(() => {
            if (this._syncs.get(ws) !== state) return;
            if (this.now() - state.lastActivityAt >= this.options.syncInactivityTimeoutMs) {
                this._fail(ws, state, 'sync_timeout');
            } else {
                this._armInactivityTimer(ws, state);
            }
        }, this.options.syncInactivityTimeoutMs);
        if (typeof state.inactivityTimer.unref === 'function') state.inactivityTimer.unref();
    }

    _pumpPages(ws, state) {
        if (this._syncs.get(ws) !== state || state.awaitingManifest || !this._isCurrent(state)) return;
        if (state.perPageAck && state.awaitingAckPageIndex !== null) {
            this._pumpPayloadChunks(ws, state);
            return;
        }
        if (state.nextPageIndex >= state.pages.length) return;

        const bufferedAmount = Number(ws?.bufferedAmount) || 0;
        const now = this.now();
        if (bufferedAmount > this.options.historyHardLimitBytes) {
            state.backpressureSince ||= now;
            if (now - state.backpressureSince > this.options.historyHardLimitDurationMs) {
                this._fail(ws, state, 'history_backpressure_timeout');
                return;
            }
            this._schedulePump(ws, state, 50);
            return;
        }
        if (bufferedAmount > this.options.historyHighWaterBytes ||
            (state.backpressureSince && bufferedAmount > this.options.historyLowWaterBytes)) {
            this._schedulePump(ws, state, 50);
            return;
        }
        state.backpressureSince = null;
        const delta = state.pages[state.nextPageIndex];
        state.nextPageIndex += 1;
        if (state.perPageAck) {
            state.awaitingAckPageIndex = delta.pageIndex;
            state.activePageChunks = Array.isArray(delta.payloadChunks) ? delta.payloadChunks : [];
            state.nextChunkIndex = 0;
        }
        state.lastActivityAt = now;
        if (!this._emit(ws, state, { type: 'conversation_history_delta', conversationId: state.conversationId, ...delta })) return;
        if (state.perPageAck) {
            this._pumpPayloadChunks(ws, state);
        } else {
            this._schedulePump(ws, state, this.options.historyPumpIntervalMs);
        }
    }

    _pumpPayloadChunks(ws, state) {
        if (!state.perPageAck || this._syncs.get(ws) !== state || !this._isCurrent(state)) return;
        const chunks = state.activePageChunks || [];
        if (state.nextChunkIndex >= chunks.length) return;
        const bufferedAmount = Number(ws?.bufferedAmount) || 0;
        const now = this.now();
        if (bufferedAmount > this.options.historyHardLimitBytes) {
            state.backpressureSince ||= now;
            if (now - state.backpressureSince > this.options.historyHardLimitDurationMs) {
                this._fail(ws, state, 'history_backpressure_timeout');
                return;
            }
            this._schedulePump(ws, state, 50);
            return;
        }
        if (bufferedAmount > this.options.historyHighWaterBytes ||
            (state.backpressureSince && bufferedAmount > this.options.historyLowWaterBytes)) {
            this._schedulePump(ws, state, 50);
            return;
        }
        state.backpressureSince = null;
        const chunk = chunks[state.nextChunkIndex];
        state.nextChunkIndex += 1;
        state.lastActivityAt = now;
        if (!this._emit(ws, state, {
            type: 'conversation_history_payload_chunk',
            conversationId: state.conversationId,
            syncId: state.syncId,
            sequence: state.sequence,
            pageIndex: state.awaitingAckPageIndex,
            targetRoot: state.pages?.[state.awaitingAckPageIndex]?.targetRoot || null,
            baselineComplete: Boolean(state.pages?.[state.awaitingAckPageIndex]?.baselineComplete),
            itemKey: chunk.itemKey,
            chunkIndex: chunk.chunkIndex,
            chunkCount: chunk.chunkCount,
            payloadHash: chunk.payloadHash,
            payloadBytes: chunk.payloadBytes,
            data: chunk.data
        }, Math.min(this.options.historyMaxEnvelopeBytes, this.options.historyPayloadChunkEnvelopeBytes))) return;
        if (state.nextChunkIndex < chunks.length) this._schedulePump(ws, state, this.options.historyPumpIntervalMs);
    }

    _schedulePump(ws, state, delay) {
        if (state.pageTimer) clearTimeout(state.pageTimer);
        state.pageTimer = setTimeout(() => {
            state.pageTimer = null;
            this._pumpPages(ws, state);
        }, delay);
        if (typeof state.pageTimer.unref === 'function') state.pageTimer.unref();
    }

    _fail(ws, state, detailCode) {
        if (state.pageTimer) clearTimeout(state.pageTimer);
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        if (this._isCurrent(state)) {
            this._emit(ws, state, { type: 'conversation_history_sync_state', syncId: state.syncId, conversationId: state.conversationId, state: 'failed', detailCode });
        }
        this._syncs.delete(ws);
        return { ok: false, detailCode };
    }

    _isCurrent(state) {
        return Boolean(state) && this._syncs.get(state.ws) === state &&
            this.isStillActive(state.ws, state.conversationId, state.selectionGeneration);
    }

    _emit(ws, state, envelope, maxBytes = this.options.historyMaxEnvelopeBytes) {
        if (!this._isCurrent(state)) {
            this.cancel(ws);
            return false;
        }
        const next = {
            ...envelope,
            selectionGeneration: state.selectionGeneration,
            clientSelectionGeneration: state.clientSelectionGeneration
        };
        const bytes = Buffer.byteLength(JSON.stringify(next), 'utf8');
        if (bytes > maxBytes) {
            if (next.type !== 'conversation_history_sync_state' || next.detailCode !== 'history_envelope_too_large') {
                this._fail(ws, state, 'history_envelope_too_large');
            }
            return false;
        }
        this.send(ws, next);
        return true;
    }
}

function normalizeCheckpoint(checkpoint) {
    return {
        rootHash: typeof checkpoint.rootHash === 'string' ? checkpoint.rootHash : null,
        itemCount: Number.isInteger(checkpoint.itemCount) ? checkpoint.itemCount : 0,
        complete: checkpoint.complete === true
    };
}

function isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) && value.length <= 64;
}

function normalizeClientSelectionGeneration(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function normalizeCacheSchemaVersion(value) {
    return Number.isSafeInteger(value) && value >= 1 ? Math.min(value, 2) : 1;
}

function sameClientSelectionGeneration(state, value) {
    return normalizeClientSelectionGeneration(value) === state.clientSelectionGeneration;
}

module.exports = {
    CodexHistorySyncService,
    DEFAULTS,
    computeHistoryPageHash,
    buildManifestDiff,
    buildPartialMergedDiff,
    buildDeltaPages,
    normalizeClientSelectionGeneration,
    normalizeCacheSchemaVersion,
    splitUtf8,
    toWireItem
};
