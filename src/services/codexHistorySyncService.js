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
    historyPumpIntervalMs: 25
});

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
    maxBytes = DEFAULTS.deltaMaxBytes
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
            upserts: nextUpserts, deletes: nextDeletes,
            ...(pages.length === 0 && order ? { canonicalOrder: order } : {})
        };
        return Buffer.byteLength(JSON.stringify(draft), 'utf8') <= maxBytes && nextUpserts.length + nextDeletes.length <= maxItems;
    };
    for (const item of upserts) {
        if (!appendCandidate('upsert', item) && (pageUpserts.length || pageDeletes.length)) {
            pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes }));
            pageUpserts = [];
            pageDeletes = [];
        }
        pageUpserts.push(item);
    }
    for (const item of deletes) {
        if (!appendCandidate('delete', item) && (pageUpserts.length || pageDeletes.length)) {
            pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes }));
            pageUpserts = [];
            pageDeletes = [];
        }
        pageDeletes.push(item);
    }
    if (pageUpserts.length || pageDeletes.length || pages.length === 0) {
        pages.push(makePage({ syncId, sequence, pageIndex: pages.length, baseRoot, targetRoot, baselineComplete, order, upserts: pageUpserts, deletes: pageDeletes }));
    }
    const pageCount = pages.length;
    return pages.map((page) => {
        const next = { ...page, pageCount };
        return { ...next, pageHash: computeHistoryPageHash(next) };
    });
}

function makePage({ syncId, sequence, pageIndex, baseRoot, targetRoot, baselineComplete, order, upserts, deletes }) {
    const fullOrderIncluded = pageIndex === 0 && Array.isArray(order);
    return {
        syncId,
        sequence,
        pageIndex,
        pageCount: 0,
        baseRoot,
        targetRoot,
        baselineComplete: Boolean(baselineComplete),
        fullOrderIncluded,
        upserts: upserts.map(toWireItem),
        deletes,
        ...(fullOrderIncluded ? { canonicalOrder: order } : {})
    };
}

function toWireItem(item) {
    return {
        itemKey: item.itemKey,
        turnId: item.turnId ?? null,
        position: item.position,
        itemType: item.itemType,
        role: item.role ?? null,
        clientRequestId: item.clientRequestId ?? null,
        payloadJson: item.payloadJson,
        contentHash: item.contentHash
    };
}

class CodexHistorySyncService {
    constructor({ send, now = Date.now, options = {} } = {}) {
        this.send = typeof send === 'function' ? send : () => {};
        this.now = now;
        this.options = { ...DEFAULTS, ...options };
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
            sourceEpoch: options.sourceEpoch || null,
            updatedAt: this.now()
        };
        this._baselines.set(conversationId, baseline);
        return baseline;
    }

    getBaseline(conversationId) { return this._baselines.get(conversationId); }

    startSync({ ws, conversationId, syncId = randomUUID(), checkpoint = {}, selectionGeneration = 0 } = {}) {
        if (!ws || !conversationId || !isUuid(syncId)) return { ok: false, detailCode: 'invalid_sync_id' };
        const baseline = this._baselines.get(conversationId);
        if (!baseline) return { ok: false, detailCode: 'history_unavailable' };
        const state = {
            ws, conversationId, syncId, sequence: 1, selectionGeneration,
            checkpoint: normalizeCheckpoint(checkpoint), baseline,
            createdAt: this.now(), lastActivityAt: this.now(), awaitingManifest: false,
            lastAckedRoot: checkpoint.rootHash || null
        };
        this._syncs.set(ws, state);
        this._armInactivityTimer(ws, state);
        if (baseline.complete && state.checkpoint.complete && baseline.rootHash === state.checkpoint.rootHash && baseline.items.length === state.checkpoint.itemCount) {
            clearTimeout(state.inactivityTimer);
            state.inactivityTimer = null;
            this.send(ws, { type: 'conversation_history_sync_state', syncId, conversationId, state: 'live' });
            return { ok: true, state: 'live', sync: state };
        }
        state.awaitingManifest = true;
        this.send(ws, { type: 'conversation_history_manifest_required', syncId, conversationId, reason: 'root_mismatch', pageSize: this.options.manifestPageSize });
        return { ok: true, state: 'awaiting_manifest', sync: state };
    }

    handleManifestPage(ws, page) {
        const state = this._syncs.get(ws);
        if (!state || state.syncId !== page?.syncId || state.conversationId !== page?.conversationId) return { ok: false, detailCode: 'stale_sync' };
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
        const pagesOut = buildDeltaPages({ syncId: state.syncId, sequence: state.sequence, baseRoot: state.checkpoint.rootHash || null, targetRoot, ...diff });
        state.pages = pagesOut;
        state.nextPageIndex = 0;
        state.backpressureSince = null;
        state.awaitingManifest = false;
        state.lastActivityAt = this.now();
        this._armInactivityTimer(ws, state);
        this._pumpPages(ws, state);
        return { ok: true, pages: pagesOut };
    }

    handleAck(ws, ack) {
        const state = this._syncs.get(ws);
        if (!state || ack?.syncId !== state.syncId || ack?.conversationId !== state.conversationId) return { ok: false, detailCode: 'stale_sync' };
        if (ack.sequence < state.sequence) return { ok: true, ignored: true };
        if (ack.sequence !== state.sequence || ack.targetRoot !== state.pages?.at(-1)?.targetRoot) return this._fail(ws, state, 'ack_mismatch');
        state.lastAckedRoot = ack.targetRoot;
        state.lastActivityAt = this.now();
        this._armInactivityTimer(ws, state);
        this.send(ws, { type: 'conversation_history_sync_state', syncId: state.syncId, conversationId: state.conversationId, state: state.baseline.complete ? 'live' : 'partial', ...(state.baseline.complete ? {} : { detailCode: 'baseline_partial' }) });
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
        if (this._syncs.get(ws) !== state || state.awaitingManifest) return;
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
        state.lastActivityAt = now;
        this.send(ws, { type: 'conversation_history_delta', conversationId: state.conversationId, ...delta });
        this._schedulePump(ws, state, this.options.historyPumpIntervalMs);
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
        this.send(ws, { type: 'conversation_history_sync_state', syncId: state.syncId, conversationId: state.conversationId, state: 'failed', detailCode });
        this._syncs.delete(ws);
        return { ok: false, detailCode };
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

module.exports = {
    CodexHistorySyncService,
    DEFAULTS,
    computeHistoryPageHash,
    buildManifestDiff,
    buildPartialMergedDiff,
    buildDeltaPages
};
