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
    historyPayloadChunkEnvelopeBytes: 128 * 1024,
    // Canonical baselines are process-local acceleration state.  They are
    // retained only while a sync/recovery subscriber is attached, then for a
    // bounded grace period so a second client can reuse the same result.
    historyBaselineTtlMs: 5 * 60 * 1000,
    historyBaselineByteBudget: 128 * 1024 * 1024
});
// A textual mention of a data-URL prefix (for example a code sample such as
// `data:image/png;base64,${...}`) is not an inline image payload.  Requiring
// at least one base64 character keeps the wire guard aligned with the
// projector's embedded-data matcher and avoids rejecting otherwise safe
// history text before it can reach the client.
const INLINE_IMAGE_DATA_URL = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/i;
const TERMINAL_SYNC_STATES = new Set(['synced', 'partial', 'cache_only', 'failed']);
const RECOVERY_PURPOSES = new Set(['full', 'tail']);

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
        baselineComplete: Boolean(baselineComplete),
        rangeComplete: true
    };
}

function buildPartialMergedDiff({ localItems = [], canonicalItems = [], baseRoot = null }) {
    const localMap = new Map(localItems.map((item) => [item.itemKey, item]));
    const mergedOrder = localItems.map((item) => item.itemKey);
    const upserts = [];
    const canonicalPositions = new Map(canonicalItems.map((item, index) => [item.itemKey, canonicalPosition(item, index)]));
    let localNewestCanonicalPosition = null;
    for (const localItem of localItems) {
        const position = canonicalPositions.get(localItem?.itemKey);
        if (Number.isInteger(position) &&
            (localNewestCanonicalPosition === null || position > localNewestCanonicalPosition)) {
            localNewestCanonicalPosition = position;
        }
    }
    let unresolvedRange = false;
    for (const [index, item] of canonicalItems.entries()) {
        const local = localMap.get(item.itemKey);
        if (!local) {
            // A partial baseline cannot authorize arbitrary insertion.  Only
            // append a missing item when the canonical position proves it is
            // newer than every local item that overlaps the canonical range.
            // Older/middle gaps stay partial until a range/order-capable
            // protocol is available.
            const position = canonicalPosition(item, index);
            const isNewTail = localItems.length === 0 || (
                localNewestCanonicalPosition !== null &&
                position > localNewestCanonicalPosition
            );
            if (!isNewTail) {
                unresolvedRange = true;
                continue;
            }
            mergedOrder.push(item.itemKey);
        }
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
        rangeComplete: !unresolvedRange,
        targetRoot: buildConversationRoot(mergedItems),
        baseRoot
    };
}

function canonicalPosition(item, fallback) {
    return Number.isInteger(item?.position) ? item.position : fallback;
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
    payloadChunkBytes = DEFAULTS.historyPayloadChunkBytes,
    // The page-size budget is the budget for the final WebSocket envelope,
    // not just for the page body.  Keep this optional for callers that use
    // the pure page builder; the sync service supplies the wrapper fields
    // that _emit() adds at send time.
    envelopeContext = null
}) {
    const order = Array.isArray(canonicalOrder) ? canonicalOrder : undefined;
    const wireOptions = {
        enablePayloadChunks,
        payloadInlineMaxBytes,
        payloadChunkBytes
    };
    // Convert each canonical item exactly once.  The previous implementation
    // converted (and, for chunked payloads, split) every item once per packing
    // candidate and again when the page was finalized.  With many large
    // history items that made the synchronous manifest handler quadratic in
    // payload size and blocked all later WebSocket frames on the Node event
    // loop.  A prepared wire item keeps the existing envelope/hash semantics
    // while making packing proportional to the actual payload bytes.
    const preparedUpserts = upserts.map((item) => ({
        source: item,
        ...toWireItemWithChunks(item, wireOptions)
    }));
    const pages = [];
    let pageUpserts = [];
    let pageDeletes = [];
    // pageCount is only known after packing.  The number of entries is a
    // conservative upper bound for the eventual page count, so reserving
    // that many digits prevents the final pageCount field from invalidating
    // an otherwise-fitting page.  pageHash is always a SHA-256 hex digest.
    const pageCountUpperBound = Math.max(1, upserts.length + deletes.length);
    const pageHashPlaceholder = '0'.repeat(64);
    const appendCandidate = (kind, value) => {
        const nextUpserts = kind === 'upsert' ? [...pageUpserts, value] : pageUpserts;
        const nextDeletes = kind === 'delete' ? [...pageDeletes, value] : pageDeletes;
        const draft = {
            syncId, sequence, pageIndex: pages.length, pageCount: 0, baseRoot, targetRoot,
            baselineComplete, fullOrderIncluded: pages.length === 0 && Boolean(order),
            upserts: nextUpserts.map((item) => item.wire), deletes: nextDeletes,
            ...(pages.length === 0 && order ? { canonicalOrder: order } : {})
        };
        const sizeCandidate = envelopeContext
            ? {
                type: 'conversation_history_delta',
                conversationId: envelopeContext.conversationId,
                ...draft,
                pageCount: pageCountUpperBound,
                pageHash: pageHashPlaceholder,
                selectionGeneration: envelopeContext.selectionGeneration,
                clientSelectionGeneration: envelopeContext.clientSelectionGeneration
            }
            : draft;
        return Buffer.byteLength(JSON.stringify(sizeCandidate), 'utf8') <= maxBytes && nextUpserts.length + nextDeletes.length <= maxItems;
    };
    const flushPage = () => {
        if (!pageUpserts.length && !pageDeletes.length) return;
        pages.push(makePage({
            syncId,
            sequence,
            pageIndex: pages.length,
            baseRoot,
            targetRoot,
            baselineComplete,
            order,
            preparedUpserts: pageUpserts,
            deletes: pageDeletes
        }));
        pageUpserts = [];
        pageDeletes = [];
    };
    for (const item of preparedUpserts) {
        if (!appendCandidate('upsert', item) && (pageUpserts.length || pageDeletes.length)) {
            flushPage();
        }
        pageUpserts.push(item);
    }
    for (const item of deletes) {
        if (!appendCandidate('delete', item) && (pageUpserts.length || pageDeletes.length)) {
            flushPage();
        }
        pageDeletes.push(item);
    }
    if (pageUpserts.length || pageDeletes.length || pages.length === 0) {
        flushPage();
    }
    if (pages.length === 0) {
        // Preserve the existing empty-diff page.  The page carries the
        // target root and lets the client ACK a partial/no-op reconciliation
        // instead of waiting forever for a delta that cannot contain rows.
        pages.push(makePage({
            syncId,
            sequence,
            pageIndex: 0,
            baseRoot,
            targetRoot,
            baselineComplete,
            order,
            preparedUpserts: [],
            deletes: []
        }));
    }
    const pageCount = pages.length;
    return pages.map((page) => {
        const next = { ...page, pageCount };
        const finalPage = { ...next, pageHash: computeHistoryPageHash(next) };
        Object.defineProperty(finalPage, 'payloadChunks', { value: page.payloadChunks || [], enumerable: false });
        return finalPage;
    });
}

function makePage({
    syncId,
    sequence,
    pageIndex,
    baseRoot,
    targetRoot,
    baselineComplete,
    order,
    upserts = [],
    preparedUpserts,
    deletes,
    enablePayloadChunks = false,
    payloadInlineMaxBytes = DEFAULTS.historyInlinePayloadBytes,
    payloadChunkBytes = DEFAULTS.historyPayloadChunkBytes
}) {
    const fullOrderIncluded = pageIndex === 0 && Array.isArray(order);
    const payloadChunks = [];
    const prepared = Array.isArray(preparedUpserts)
        ? preparedUpserts
        : upserts.map((item) => toWireItemWithChunks(item, {
            enablePayloadChunks,
            payloadInlineMaxBytes,
            payloadChunkBytes
        }));
    const page = {
        syncId,
        sequence,
        pageIndex,
        pageCount: 0,
        baseRoot,
        targetRoot,
        baselineComplete: Boolean(baselineComplete),
        fullOrderIncluded,
        upserts: prepared.map((result) => {
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

function normalizeNonNegativeDuration(value, fallback) {
    return Number.isFinite(Number(value)) && Number(value) >= 0
        ? Number(value)
        : fallback;
}

function normalizePositiveBudget(value, fallback) {
    return Number.isFinite(Number(value)) && Number(value) > 0
        ? Number(value)
        : fallback;
}

function normalizeSyncOutcome(value, fallback = 'partial') {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'live') return 'synced';
    if (normalized === 'offline' || normalized === 'unsupported') return 'cache_only';
    return TERMINAL_SYNC_STATES.has(normalized) ? normalized : fallback;
}

function resolveSyncOutcome(options = {}) {
    const explicit = options.syncOutcome ?? options.resultState ?? options.networkSyncState;
    const explicitOutcome = explicit !== undefined && explicit !== null
        ? normalizeSyncOutcome(explicit, options.complete ? 'synced' : 'partial')
        : null;
    const hasIncompleteRange = options.hasMoreBefore === true ||
        options.coverageComplete === false ||
        options.resultKind === 'tail' ||
        options.resultKind === 'segment' ||
        options.resultKind === 'partial';
    if (hasIncompleteRange) {
        // Negative coverage evidence is fail-closed.  Explicit transport
        // failures/cache-only classification remain terminal as-is, but an
        // optimistic SYNCED/LIVE result cannot hide an unserved range.
        return explicitOutcome === 'failed' || explicitOutcome === 'cache_only'
            ? explicitOutcome
            : 'partial';
    }
    if (explicitOutcome) return explicitOutcome;
    if (options.coverageComplete === true) return 'synced';
    return options.complete === true ? 'synced' : 'partial';
}

function resolveSyncOutcomeDetail(options = {}) {
    if (typeof options.syncOutcomeDetail === 'string' && options.syncOutcomeDetail.trim()) {
        return options.syncOutcomeDetail.trim();
    }
    if (options.resultKind === 'tail' || options.resultKind === 'segment') return 'history_range_partial';
    return null;
}

function estimateBaselineBytes({ conversationId, items, rootHash, sourceKind, sourceEpoch }) {
    try {
        return Buffer.byteLength(JSON.stringify({ conversationId, items, rootHash, sourceKind, sourceEpoch }), 'utf8');
    } catch {
        // A malformed/cyclic provider result must not evade the process byte
        // budget.  It will be evicted before it can be used for a sync.
        return Number.MAX_SAFE_INTEGER;
    }
}

function normalizeRecoveryPart(value, fallback) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || fallback;
}

function normalizeFreshnessValue(value) {
    if (typeof value === 'string') {
        const normalized = value.trim();
        return normalized || null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
}

/**
 * Build an internal, metadata-only freshness token for a canonical thread.
 * This is deliberately not a wire field: it only decides whether the
 * process-local recovery baseline may be reused.  Missing metadata is
 * unknown, not evidence that the baseline is current.
 */
function buildHistoryFreshnessToken(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const timestampAliases = [
        ['updatedAt', 'updated_at'],
        ['lastActiveAt', 'last_active_at'],
        ['lastUpdatedAt', 'last_updated_at'],
        ['lastMessageAt', 'last_message_at'],
        ['modifiedAt', 'modified_at'],
        ['mtime']
    ];
    // Prefer one canonical timestamp instead of concatenating every field:
    // thread/list and thread/read may expose different subsets of the same
    // metadata, and subset differences must not cause a false refresh.
    const timestamp = timestampAliases
        .map((aliases) => aliases.map((key) => normalizeFreshnessValue(metadata[key])).find(Boolean) || null)
        .find(Boolean) || null;
    const turnId = [
        'latestTurnId', 'latest_turn_id', 'lastTurnId', 'last_turn_id'
    ].map((key) => normalizeFreshnessValue(metadata[key])).find(Boolean) || null;
    if (timestamp === null && !turnId) return null;
    return JSON.stringify({ timestamp, turnId });
}

function buildRecoveryKey({ conversationId, providerIdentity = 'default', purpose = 'full' } = {}) {
    const conversation = normalizeRecoveryPart(conversationId, '');
    const provider = normalizeRecoveryPart(providerIdentity, 'default');
    const recoveryPurpose = RECOVERY_PURPOSES.has(purpose) ? purpose : 'full';
    return `${conversation}\u0000${provider}\u0000${recoveryPurpose}`;
}

function createRecoveryDetachedError() {
    const error = new Error('History recovery waiter detached.');
    error.code = 'history_recovery_waiter_detached';
    return error;
}

function createRecoveryIdentityError(expected, actual) {
    const error = new Error(`History recovery identity mismatch: expected ${expected}, received ${actual}.`);
    error.code = 'history_recovery_identity_mismatch';
    return error;
}

function recoveryResultOutcome(result) {
    const explicit = result?.syncOutcome ?? result?.resultState ?? result?.networkSyncState;
    const explicitOutcome = explicit !== undefined && explicit !== null
        ? normalizeSyncOutcome(explicit, 'partial')
        : null;
    const hasIncompleteRange = result?.hasMoreBefore === true ||
        result?.coverageComplete === false ||
        result?.resultKind === 'tail' ||
        result?.resultKind === 'segment' ||
        result?.resultKind === 'partial';
    if (hasIncompleteRange) {
        return explicitOutcome === 'failed' || explicitOutcome === 'cache_only'
            ? explicitOutcome
            : 'partial';
    }
    if (explicitOutcome) return explicitOutcome;
    return result?.resultKind === 'full' ? 'synced' : 'partial';
}

class CodexHistorySyncService {
    constructor({ send, now = Date.now, options = {}, isStillActive } = {}) {
        this.send = typeof send === 'function' ? send : () => {};
        this.now = now;
        const optionObject = options && typeof options === 'object' ? options : {};
        this.options = { ...DEFAULTS, ...optionObject };
        const requestedBaselineTtl = Object.hasOwn(optionObject, 'historyBaselineTtlMs')
            ? optionObject.historyBaselineTtlMs
            : optionObject.baselineTtlMs;
        const requestedBaselineBudget = Object.hasOwn(optionObject, 'historyBaselineByteBudget')
            ? optionObject.historyBaselineByteBudget
            : optionObject.baselineByteBudget;
        this._baselineTtlMs = normalizeNonNegativeDuration(
            requestedBaselineTtl ?? this.options.historyBaselineTtlMs,
            DEFAULTS.historyBaselineTtlMs
        );
        this._baselineByteBudget = normalizePositiveBudget(
            requestedBaselineBudget ?? this.options.historyBaselineByteBudget,
            DEFAULTS.historyBaselineByteBudget
        );
        this.isStillActive = typeof isStillActive === 'function' ? isStillActive : () => true;
        this._baselines = new Map();
        this._retiredBaselines = new Set();
        this._baselineBytes = 0;
        this._baselineCleanupTimer = null;
        this._recoveryFlights = new Map();
        this._syncs = new WeakMap();
        this._metadataFreshness = new Map();
    }

    registerBaseline(conversationId, sourceKind, sourceData, options = {}) {
        const items = projectCanonicalHistory({ sourceKind, sourceData });
        return this._storeBaseline(this._createBaseline(conversationId, items, {
            ...options,
            baselineSourceKind: options.baselineSourceKind || sourceKind || null
        }));
    }

    registerBaselineItems(conversationId, items, options = {}) {
        const normalizedItems = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
        return this._storeBaseline(this._createBaseline(conversationId, normalizedItems, options));
    }

    getBaseline(conversationId) {
        this._pruneBaselines();
        return this._baselines.get(conversationId);
    }

    /**
     * Observe a metadata-only canonical response.  A changed token marks an
     * old recovery baseline stale; it does not alter IPC/live authority and
     * does not start a recovery by itself.
     */
    observeCanonicalMetadata(conversationId, metadata) {
        const normalizedConversationId = normalizeRecoveryPart(conversationId, '');
        const token = buildHistoryFreshnessToken(metadata);
        if (!normalizedConversationId || !token) {
            return { observed: false, changed: false, token: null };
        }
        const now = this.now();
        const previous = this._metadataFreshness.get(normalizedConversationId);
        this._metadataFreshness.set(normalizedConversationId, { token, observedAt: now });
        const baseline = this._baselines.get(normalizedConversationId);
        let changed = false;
        if (baseline && baseline.sourceKind === 'history_recovery' && baseline.freshnessToken !== token) {
            baseline.stale = true;
            baseline.staleReason = 'canonical_metadata_changed';
            changed = previous?.token !== token || baseline.freshnessToken !== token;
        }
        return {
            observed: true,
            changed,
            token,
            previousToken: previous?.token || null
        };
    }

    retainBaseline(conversationId) {
        const baseline = this.getBaseline(conversationId);
        if (!baseline || !this._retainBaseline(baseline)) return null;
        return baseline;
    }

    releaseBaseline(conversationId, baseline = null) {
        const candidate = baseline || this._baselines.get(conversationId);
        if (!candidate || candidate.conversationId !== conversationId) return false;
        const released = this._releaseBaseline(candidate);
        this._pruneBaselines();
        return released;
    }

    getBaselineStats() {
        this._pruneBaselines();
        return {
            totalBytes: this._baselineBytes,
            byteBudget: this._baselineByteBudget,
            ttlMs: this._baselineTtlMs,
            entries: this._allBaselines().map((baseline) => ({
                conversationId: baseline.conversationId,
                sourceKind: baseline.sourceKind,
                itemCount: baseline.items.length,
                byteSize: baseline.byteSize,
                subscriberCount: baseline.subscriberCount,
                updatedAt: baseline.updatedAt,
                lastSubscriberLeftAt: baseline.lastSubscriberLeftAt,
                retainedUntil: baseline.retainedUntil,
                stale: baseline.stale === true
            }))
        };
    }

    /**
     * Share one provider read among clients that ask for the same
     * conversation/provider/purpose.  A returned waiter can detach without
     * cancelling other clients; only the last waiter aborts the producer.
     * This is an internal service API.  It does not add a WebSocket field.
     */
    startRecovery({
        conversationId,
        providerIdentity = 'default',
        purpose = 'full',
        producer,
        waiterId = randomUUID(),
        signal
    } = {}) {
        if (typeof conversationId !== 'string' || !conversationId.trim() || typeof producer !== 'function') {
            return { ok: false, detailCode: 'invalid_recovery_request' };
        }
        const normalizedConversationId = conversationId.trim();
        const normalizedPurpose = RECOVERY_PURPOSES.has(purpose) ? purpose : 'full';
        const key = buildRecoveryKey({ conversationId: normalizedConversationId, providerIdentity, purpose: normalizedPurpose });
        let flight = this._recoveryFlights.get(key);
        const shared = Boolean(flight);
        if (!flight) {
            const controller = new AbortController();
            flight = {
                key,
                conversationId: normalizedConversationId,
                providerIdentity: normalizeRecoveryPart(providerIdentity, 'default'),
                purpose: normalizedPurpose,
                producer,
                controller,
                waiters: new Map(),
                startedAt: this.now(),
                settled: false,
                acceptResult: true
            };
            this._recoveryFlights.set(key, flight);
            flight.promise = this._runRecoveryProducer(flight);
            // Waiters receive the producer result through their own promises;
            // keep the internal driver promise from becoming an unhandled
            // rejection when a caller detaches or does not inspect it.
            void flight.promise.catch(() => {});
        }

        let normalizedWaiterId = normalizeRecoveryPart(waiterId, randomUUID());
        if (flight.waiters.has(normalizedWaiterId)) normalizedWaiterId = randomUUID();
        let detached = false;
        let resolveWaiter;
        let rejectWaiter;
        const promise = new Promise((resolve, reject) => {
            resolveWaiter = resolve;
            rejectWaiter = reject;
        });
        const waiter = {
            resolve: resolveWaiter,
            reject: rejectWaiter,
            detach: () => {
                if (detached) return false;
                detached = true;
                return this._detachRecoveryWaiter(flight, normalizedWaiterId);
            }
        };
        flight.waiters.set(normalizedWaiterId, waiter);
        if (signal && typeof signal.addEventListener === 'function') {
            if (signal.aborted) waiter.detach();
            else signal.addEventListener('abort', waiter.detach, { once: true });
        }
        return {
            ok: true,
            key,
            waiterId: normalizedWaiterId,
            shared,
            promise,
            detach: waiter.detach
        };
    }

    getRecoveryFlight({ conversationId, providerIdentity = 'default', purpose = 'full' } = {}) {
        const key = buildRecoveryKey({ conversationId, providerIdentity, purpose });
        const flight = this._recoveryFlights.get(key);
        if (!flight) return null;
        return {
            key,
            conversationId: flight.conversationId,
            providerIdentity: flight.providerIdentity,
            purpose: flight.purpose,
            waiterCount: flight.waiters.size,
            startedAt: flight.startedAt,
            settled: flight.settled
        };
    }

    _createBaseline(conversationId, items, options = {}) {
        const normalizedItems = Array.isArray(items) ? items : [];
        const rootHash = buildConversationRoot(normalizedItems);
        const updatedAt = this.now();
        const baseline = {
            conversationId,
            items: normalizedItems,
            rootHash,
            // P0-A provider/recovery call sites pass false here.  This field
            // remains the existing wire gate for delete/order and is
            // independent from syncOutcome below.
            complete: Boolean(options.complete),
            sourceKind: options.baselineSourceKind || null,
            sourceEpoch: options.sourceEpoch || null,
            syncOutcome: resolveSyncOutcome(options),
            syncOutcomeDetail: resolveSyncOutcomeDetail(options),
            freshnessToken: options.freshnessToken || (
                (options.baselineSourceKind || null) === 'history_recovery'
                    ? this._metadataFreshness.get(conversationId)?.token || null
                    : null
            ),
            stale: false,
            updatedAt,
            subscriberCount: 0,
            lastSubscriberLeftAt: updatedAt,
            retainedUntil: updatedAt + this._baselineTtlMs,
            byteSize: estimateBaselineBytes({
                conversationId,
                items: normalizedItems,
                rootHash,
                sourceKind: options.baselineSourceKind || null,
                sourceEpoch: options.sourceEpoch || null
            })
        };
        return baseline;
    }

    _storeBaseline(baseline) {
        this._pruneBaselines();
        const previous = this._baselines.get(baseline.conversationId);
        if (previous) {
            if (previous.subscriberCount > 0) this._retiredBaselines.add(previous);
            else this._removeBaselineRecord(previous);
        }
        this._baselines.set(baseline.conversationId, baseline);
        this._baselineBytes += baseline.byteSize;
        this._pruneBaselines();
        this._enforceBaselineBudget();
        return baseline;
    }

    _allBaselines() {
        const records = new Set(this._retiredBaselines);
        for (const baseline of this._baselines.values()) records.add(baseline);
        return Array.from(records);
    }

    _removeBaselineRecord(baseline) {
        if (!baseline || baseline.removed) return false;
        if (this._baselines.get(baseline.conversationId) === baseline) {
            this._baselines.delete(baseline.conversationId);
        }
        this._retiredBaselines.delete(baseline);
        baseline.removed = true;
        this._baselineBytes = Math.max(0, this._baselineBytes - baseline.byteSize);
        return true;
    }

    _pruneBaselines() {
        const now = this.now();
        for (const [conversationId, freshness] of this._metadataFreshness.entries()) {
            if (!freshness || now - freshness.observedAt >= this._baselineTtlMs) {
                this._metadataFreshness.delete(conversationId);
            }
        }
        for (const baseline of this._allBaselines()) {
            if (baseline.subscriberCount === 0 &&
                baseline.retainedUntil !== null &&
                now >= baseline.retainedUntil) {
                this._removeBaselineRecord(baseline);
            }
        }
        this._enforceBaselineBudget();
        this._scheduleBaselineCleanup();
    }

    _scheduleBaselineCleanup() {
        if (this._baselineCleanupTimer) clearTimeout(this._baselineCleanupTimer);
        let nextExpiry = null;
        for (const baseline of this._allBaselines()) {
            if (baseline.subscriberCount !== 0 || baseline.retainedUntil === null) continue;
            nextExpiry = nextExpiry === null
                ? baseline.retainedUntil
                : Math.min(nextExpiry, baseline.retainedUntil);
        }
        if (nextExpiry === null) {
            this._baselineCleanupTimer = null;
            return;
        }
        const delay = Math.min(2_147_483_647, Math.max(0, nextExpiry - this.now()));
        this._baselineCleanupTimer = setTimeout(() => {
            this._baselineCleanupTimer = null;
            this._pruneBaselines();
        }, delay);
        if (typeof this._baselineCleanupTimer.unref === 'function') this._baselineCleanupTimer.unref();
    }

    _enforceBaselineBudget() {
        if (this._baselineBytes <= this._baselineByteBudget) return;
        const candidates = this._allBaselines()
            .filter((baseline) => baseline.subscriberCount === 0)
            .sort((left, right) => {
                const leftTime = left.lastSubscriberLeftAt ?? left.updatedAt;
                const rightTime = right.lastSubscriberLeftAt ?? right.updatedAt;
                return leftTime - rightTime;
            });
        for (const baseline of candidates) {
            if (this._baselineBytes <= this._baselineByteBudget) break;
            this._removeBaselineRecord(baseline);
        }
    }

    _retainBaseline(baseline) {
        if (!baseline || baseline.removed) return false;
        baseline.subscriberCount += 1;
        baseline.lastSubscriberLeftAt = null;
        baseline.retainedUntil = null;
        return true;
    }

    _releaseBaseline(baseline) {
        if (!baseline || baseline.removed || baseline.subscriberCount <= 0) return false;
        baseline.subscriberCount -= 1;
        if (baseline.subscriberCount === 0) {
            baseline.lastSubscriberLeftAt = this.now();
            baseline.retainedUntil = baseline.lastSubscriberLeftAt + this._baselineTtlMs;
        }
        return true;
    }

    async _runRecoveryProducer(flight) {
        let result;
        try {
            result = await flight.producer({
                signal: flight.controller.signal,
                conversationId: flight.conversationId,
                providerIdentity: flight.providerIdentity,
                purpose: flight.purpose
            });
            if (flight.acceptResult && flight.waiters.size > 0) {
                const resultConversationId = result?.conversationId || result?.threadId || null;
                if (resultConversationId && resultConversationId !== flight.conversationId) {
                    throw createRecoveryIdentityError(flight.conversationId, resultConversationId);
                }
                const resultItems = Array.isArray(result?.items) ? result.items : null;
                if (resultItems) {
                    this.registerBaselineItems(flight.conversationId, resultItems, {
                        complete: false,
                        baselineSourceKind: result.sourceKind || result.providerMode || 'history_recovery',
                        sourceEpoch: result.sourceEpoch,
                        resultKind: result.resultKind,
                        syncOutcome: recoveryResultOutcome(result),
                        syncOutcomeDetail: result.detailCode || null,
                        freshnessToken: this._metadataFreshness.get(flight.conversationId)?.token || null
                    });
                }
            }
            this._settleRecoveryFlight(flight, null, result);
            return result;
        } catch (error) {
            this._settleRecoveryFlight(flight, error);
            throw error;
        }
    }

    _settleRecoveryFlight(flight, error, result) {
        if (!flight || flight.settled) return;
        flight.settled = true;
        if (this._recoveryFlights.get(flight.key) === flight) this._recoveryFlights.delete(flight.key);
        const waiters = Array.from(flight.waiters.values());
        flight.waiters.clear();
        for (const waiter of waiters) {
            if (error) waiter.reject(error);
            else waiter.resolve(result);
        }
    }

    _detachRecoveryWaiter(flight, waiterId) {
        if (!flight || !flight.waiters.has(waiterId)) return false;
        const waiter = flight.waiters.get(waiterId);
        flight.waiters.delete(waiterId);
        waiter.reject(createRecoveryDetachedError());
        if (flight.waiters.size === 0 && !flight.settled) {
            flight.acceptResult = false;
            if (this._recoveryFlights.get(flight.key) === flight) this._recoveryFlights.delete(flight.key);
            try {
                flight.controller.abort();
            } catch {
                // AbortController.abort() is expected to be idempotent; a
                // custom runtime should not break waiter detachment.
            }
        }
        return true;
    }

    startSync({ ws, conversationId, syncId = randomUUID(), checkpoint = {}, selectionGeneration = 0, clientSelectionGeneration = 0, cacheSchemaVersion = 1 } = {}) {
        if (!ws || !conversationId || !isUuid(syncId)) return { ok: false, detailCode: 'invalid_sync_id' };
        if (!this.isStillActive(ws, conversationId, selectionGeneration)) return { ok: false, detailCode: 'stale_selection' };
        this._pruneBaselines();
        if (this._syncs.get(ws)) this.cancel(ws);
        const baseline = this._baselines.get(conversationId);
        if (!baseline) return { ok: false, detailCode: 'history_unavailable' };
        const normalizedCacheSchemaVersion = normalizeCacheSchemaVersion(cacheSchemaVersion);
        const state = {
            ws, conversationId, syncId, sequence: 1, selectionGeneration,
            clientSelectionGeneration: normalizeClientSelectionGeneration(clientSelectionGeneration),
            checkpoint: normalizeCheckpoint(checkpoint), baseline,
            syncOutcome: normalizeSyncOutcome(baseline.syncOutcome, baseline.complete ? 'synced' : 'partial'),
            syncOutcomeDetail: baseline.syncOutcomeDetail || null,
            rangeIncomplete: false,
            settled: false,
            cacheSchemaVersion: normalizedCacheSchemaVersion,
            supportsPayloadChunks: normalizedCacheSchemaVersion >= 2,
            perPageAck: normalizedCacheSchemaVersion >= 2,
            createdAt: this.now(), lastActivityAt: this.now(), awaitingManifest: false,
            lastAckedRoot: checkpoint.rootHash || null,
            awaitingAckPageIndex: null,
            activePageChunks: [],
            nextChunkIndex: 0
        };
        if (!this._retainBaseline(baseline)) return { ok: false, detailCode: 'history_unavailable' };
        this._syncs.set(ws, state);
        this._armInactivityTimer(ws, state);
        if (baseline.complete && state.checkpoint.complete && baseline.rootHash === state.checkpoint.rootHash && baseline.items.length === state.checkpoint.itemCount) {
            this._settle(ws, state, 'synced');
            return { ok: true, state: 'synced', sync: state };
        }
        if (state.syncOutcome === 'cache_only' || state.syncOutcome === 'failed') {
            const detailCode = state.syncOutcomeDetail || (state.syncOutcome === 'failed' ? 'history_recovery_failed' : 'cache_only');
            this._settle(ws, state, state.syncOutcome, detailCode);
            return { ok: true, state: state.syncOutcome, sync: state };
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
        // `baselineComplete` controls only delete/order authority.  A safe
        // upsert-only diff can still be a complete result for the requested
        // range; an older/middle gap, however, must force PARTIAL even when a
        // caller supplied an optimistic sync outcome.
        state.rangeIncomplete = diff.rangeComplete === false;
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
                // deltaMaxBytes is the page budget; _emit() applies the
                // actual envelope budget.  Use the stricter of the two so a
                // custom configuration cannot reintroduce an oversized
                // final envelope.
                maxBytes: Math.min(this.options.deltaMaxBytes, this.options.historyMaxEnvelopeBytes),
                enablePayloadChunks: state.supportsPayloadChunks,
                payloadInlineMaxBytes: this.options.historyInlinePayloadBytes,
                payloadChunkBytes: this.options.historyPayloadChunkBytes,
                envelopeContext: {
                    conversationId: state.conversationId,
                    selectionGeneration: state.selectionGeneration,
                    clientSelectionGeneration: state.clientSelectionGeneration
                }
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
        const finalPage = !state.perPageAck || ack.pageIndex === state.pages.length - 1;
        if (finalPage) {
            const terminalState = this._terminalState(state);
            const detailCode = terminalState === 'partial'
                ? (state.rangeIncomplete
                    ? 'history_range_partial'
                    : state.syncOutcomeDetail || (!state.baseline.complete ? 'baseline_partial' : 'history_partial'))
                : undefined;
            this._settle(ws, state, terminalState, detailCode);
            return { ok: true, state: terminalState };
        }
        this._armInactivityTimer(ws, state);
        if (state.perPageAck && !finalPage) this._pumpPages(ws, state);
        return { ok: true, state: 'syncing' };
    }

    cancel(ws) {
        const state = this._syncs.get(ws);
        if (state) this._teardownSync(ws, state);
    }

    _terminalState(state) {
        if (state.rangeIncomplete) return 'partial';
        return normalizeSyncOutcome(
            state.syncOutcome,
            state.baseline.complete ? 'synced' : 'partial'
        );
    }

    _settle(ws, state, terminalState, detailCode) {
        if (!state || this._syncs.get(ws) !== state) return false;
        const normalizedState = normalizeSyncOutcome(terminalState, 'failed');
        state.settled = true;
        state.terminalState = normalizedState;
        this._clearSyncTimers(state);
        try {
            return this._emit(ws, state, {
                type: 'conversation_history_sync_state',
                syncId: state.syncId,
                conversationId: state.conversationId,
                state: normalizedState,
                ...(detailCode ? { detailCode } : {})
            });
        } finally {
            this._teardownSync(ws, state);
        }
    }

    _clearSyncTimers(state) {
        if (state?.pageTimer) clearTimeout(state.pageTimer);
        if (state?.inactivityTimer) clearTimeout(state.inactivityTimer);
        if (state) {
            state.pageTimer = null;
            state.inactivityTimer = null;
        }
    }

    _teardownSync(ws, state) {
        if (!state || state.released) return;
        this._clearSyncTimers(state);
        if (this._syncs.get(ws) === state) this._syncs.delete(ws);
        state.released = true;
        this._releaseBaseline(state.baseline);
        this._pruneBaselines();
    }

    _armInactivityTimer(ws, state) {
        if (!state || state.settled || this._syncs.get(ws) !== state) return;
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        state.inactivityTimer = setTimeout(() => {
            if (this._syncs.get(ws) !== state) return;
            if (state.settled) return;
            if (this.now() - state.lastActivityAt >= this.options.syncInactivityTimeoutMs) {
                this._fail(ws, state, 'sync_timeout');
            } else {
                this._armInactivityTimer(ws, state);
            }
        }, this.options.syncInactivityTimeoutMs);
        if (typeof state.inactivityTimer.unref === 'function') state.inactivityTimer.unref();
    }

    _pumpPages(ws, state) {
        if (this._syncs.get(ws) !== state || state.settled || state.awaitingManifest || !this._isCurrent(state)) return;
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
        if (!state.perPageAck || state.settled || this._syncs.get(ws) !== state || !this._isCurrent(state)) return;
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
        if (state.settled || this._syncs.get(ws) !== state) return;
        if (state.pageTimer) clearTimeout(state.pageTimer);
        state.pageTimer = setTimeout(() => {
            state.pageTimer = null;
            this._pumpPages(ws, state);
        }, delay);
        if (typeof state.pageTimer.unref === 'function') state.pageTimer.unref();
    }

    _fail(ws, state, detailCode) {
        if (!state || state.settled) return { ok: false, detailCode };
        state.settled = true;
        state.terminalState = 'failed';
        this._clearSyncTimers(state);
        try {
            if (this._isCurrent(state)) {
                this._emit(ws, state, {
                    type: 'conversation_history_sync_state',
                    syncId: state.syncId,
                    conversationId: state.conversationId,
                    state: 'failed',
                    detailCode
                });
            }
        } finally {
            this._teardownSync(ws, state);
        }
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
    buildRecoveryKey,
    buildHistoryFreshnessToken,
    normalizeClientSelectionGeneration,
    normalizeCacheSchemaVersion,
    normalizeSyncOutcome,
    splitUtf8,
    toWireItem
};
