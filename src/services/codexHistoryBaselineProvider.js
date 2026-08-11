'use strict';

const {
    canonicalize,
    hashPayload,
    projectCanonicalHistory,
    buildConversationRoot
} = require('./codexHistoryCanonicalizer');
const { projectMobileSurface, containsImageDataUrl } = require('./codexMobileSurfaceProjector');

const DEFAULT_MAX_BASELINE_BYTES = 70 * 1024 * 1024;
const DEFAULT_TAIL_ITEM_LIMIT = 200;
const DEFAULT_MAX_SCAN_PAGES = 10_000;
const RANGE_SCHEMA_VERSION = 1;

const HISTORY_MODES = Object.freeze({
    LEGACY: 'legacy',
    PAGINATED: 'paginated',
    EPHEMERAL: 'ephemeral',
    UNKNOWN: 'unknown'
});

/**
 * Builds the mobile history baseline behind the Gateway boundary.
 *
 * The provider deliberately separates capability/identity probing from the
 * payload read.  A missing or unknown mode is not treated as legacy: doing so
 * would make a paginated thread take the unsafe full thread/read path.
 * P0-A always returns `complete=false`; the existing v2 wire flag is also
 * used for delete/order eligibility, so coverage is never promoted through
 * this provider until the additive P0-B contract exists.
 */
class CodexHistoryBaselineProvider {
    constructor({
        readThread,
        readLegacyThread = null,
        readPaginatedTurns = null,
        probeThread = null,
        historyMode = null,
        now = Date.now,
        maxBaselineBytes = DEFAULT_MAX_BASELINE_BYTES,
        mediaStore = null,
        externalize = null
    } = {}) {
        if (
            typeof readThread !== 'function' &&
            typeof readLegacyThread !== 'function' &&
            typeof readPaginatedTurns !== 'function'
        ) {
            throw new TypeError('CodexHistoryBaselineProvider requires a history reader.');
        }
        this.readLegacyThread = typeof readLegacyThread === 'function' ? readLegacyThread : readThread;
        this.readPaginatedTurns = typeof readPaginatedTurns === 'function' ? readPaginatedTurns : null;
        this.probeThread = typeof probeThread === 'function' ? probeThread : null;
        this.configuredHistoryMode = normalizeHistoryMode(historyMode);
        this.now = now;
        this.maxBaselineBytes = Number.isSafeInteger(maxBaselineBytes) && maxBaselineBytes > 0
            ? maxBaselineBytes
            : DEFAULT_MAX_BASELINE_BYTES;
        this.externalize = typeof externalize === 'function'
            ? externalize
            : mediaStore
                ? (value) => projectMobileSurface(value, { mediaStore })
                : null;
    }

    async build(conversationId, options = {}, knownProbe = null) {
        const buildStartedAt = this.now();
        const normalizedConversationId = typeof conversationId === 'string'
            ? conversationId.trim()
            : '';
        if (!normalizedConversationId) {
            const error = new Error('History recovery requires conversationId.');
            error.code = 'HISTORY_RECOVERY_INVALID_CONVERSATION';
            throw error;
        }

        // `scanComplete` already performed the required metadata probe.  A
        // legacy full read must not add a second IPC round-trip before the
        // actual (potentially large) source response.  The optional value is
        // deliberately internal: normal callers retain the fail-closed probe.
        const probe = knownProbe && typeof knownProbe === 'object'
            ? knownProbe
            : await this._probe(normalizedConversationId, options);
        const probeDurationMs = elapsedMilliseconds(buildStartedAt, this.now());
        // Reject a contradictory metadata response before any payload read.
        // Apart from being safer, this avoids doing a full legacy replay for a
        // conversation that the probe already proved is not the requested one.
        assertExactThreadIdentity(normalizedConversationId, extractResponseIdentity(probe.thread), 'probe');
        const requestedMode = normalizeHistoryMode(options.historyMode);
        const mode = probe.probed
            ? probe.mode
            : requestedMode !== HISTORY_MODES.UNKNOWN
                ? requestedMode
                : this.configuredHistoryMode;

        if (mode === HISTORY_MODES.UNKNOWN) {
            throw createUnsupportedError('HISTORY_RECOVERY_HISTORY_MODE_UNKNOWN', 'History mode is missing or unsupported.');
        }
        if (mode === HISTORY_MODES.EPHEMERAL) {
            throw createUnsupportedError('HISTORY_RECOVERY_EPHEMERAL_UNSUPPORTED', 'Ephemeral threads do not support canonical history recovery.');
        }

        const readerOptions = mode === HISTORY_MODES.PAGINATED
            ? withDefaultPaginatedDirection(options)
            : options;
        // This boundary is deliberately just the upstream history read. It
        // excludes the metadata probe and all local projection/canonicalizing
        // work so diagnostics can tell whether the source or TermLink itself
        // dominates a cold recovery.
        const sourceReadStartedAt = this.now();
        let response;
        if (mode === HISTORY_MODES.PAGINATED) {
            if (typeof this.readPaginatedTurns !== 'function') {
                throw createUnsupportedError('HISTORY_RECOVERY_PAGINATED_UNSUPPORTED', 'Paginated history requires a turns/items list reader.');
            }
            response = await this.readPaginatedTurns(normalizedConversationId, readerOptions);
        } else {
            if (typeof this.readLegacyThread !== 'function') {
                throw createUnsupportedError('HISTORY_RECOVERY_LEGACY_UNSUPPORTED', 'Legacy history requires a full thread reader.');
            }
            response = await this.readLegacyThread(normalizedConversationId, options);
        }
        const sourceReadDurationMs = elapsedMilliseconds(sourceReadStartedAt, this.now());

        const thread = unwrapThread(response);
        assertExactThreadIdentity(normalizedConversationId, extractResponseIdentity(response), 'response');
        const responseMode = extractHistoryMode(response);
        if (responseMode !== HISTORY_MODES.UNKNOWN && responseMode !== mode) {
            throw createUnsupportedError('HISTORY_RECOVERY_HISTORY_MODE_MISMATCH', 'History response mode does not match the probed mode.');
        }

        const rawBytes = safeJsonByteLength(response);
        if (rawBytes > this.maxBaselineBytes) {
            const error = new Error('History baseline exceeds the configured recovery limit.');
            error.code = 'HISTORY_RECOVERY_BASELINE_TOO_LARGE';
            error.rawBytes = rawBytes;
            error.maxBytes = this.maxBaselineBytes;
            throw error;
        }

        const projectedSource = mode === HISTORY_MODES.PAGINATED ? response : thread;
        const projectedThread = this.externalize ? await this.externalize(projectedSource || {}) : projectedSource || {};
        if (containsImageDataUrl(projectedThread)) {
            const error = new Error('History baseline still contains an image data URL after projection.');
            error.code = 'HISTORY_RECOVERY_MEDIA_NOT_EXTERNALIZED';
            throw error;
        }
        const projectedItems = mode === HISTORY_MODES.PAGINATED
            ? projectPaginatedItems(projectedThread, readerOptions)
            : projectCanonicalHistory({
                sourceKind: 'app_server_thread',
                sourceData: projectedThread
            });
        // Range is an additive capability, not a loose boolean hint.  Keep
        // the provider fail-closed when a caller sends an unknown version or
        // a cache schema that cannot persist range metadata.
        const rangeCapabilityRequested = isRangeCapabilityEnabled(options?.rangeSegments);
        const rangeKind = normalizeRangeKind(options?.rangeKind);
        if (rangeCapabilityRequested && rangeKind === 'older' && mode !== HISTORY_MODES.PAGINATED) {
            throw createUnsupportedError(
                'HISTORY_RECOVERY_OLDER_UNSUPPORTED',
                'Older range pages require a paginated history provider.'
            );
        }
        // Capability negotiation is additive, but it must not change the
        // legacy provider contract. Legacy thread/read has no cursor-bearing
        // page boundary that Android can continue from, so a range-enabled
        // legacy request stays on the original full/v2 path. Only paginated
        // reads can safely produce tail/older metadata.
        const rangeRequested = rangeCapabilityRequested && mode === HISTORY_MODES.PAGINATED;
        const tailItemLimit = normalizeTailItemLimit(options?.tailItemLimit);
        const cursor = extractCursorState(response);
        if (rangeCapabilityRequested && rangeKind === 'older' && !isValidOlderCursorState(cursor)) {
            const error = new Error('Older history response must include an explicit null or non-empty next cursor.');
            error.code = 'HISTORY_RECOVERY_OLDER_CURSOR_INVALID';
            throw error;
        }
        const items = rangeRequested && rangeKind === 'tail'
            ? projectedItems.slice(Math.max(0, projectedItems.length - tailItemLimit))
            : projectedItems;
        const range = rangeRequested
            ? buildTailRangeMetadata({
                conversationId: normalizedConversationId,
                mode,
                rangeKind,
                items,
                sourceItemCount: projectedItems.length,
                nextOlderCursor: cursor.present ? cursor.value : null,
                cursorPresent: cursor.present,
                tailItemLimit,
                providerIdentityHash: options?.providerIdentityHash
            })
            : null;
        const providerDurationMs = elapsedMilliseconds(buildStartedAt, this.now());
        return {
            conversationId: normalizedConversationId,
            mode,
            items,
            rootHash: buildConversationRoot(items),
            // P0-A must never set the v2 baselineComplete bit.  The bit is
            // consumed by the existing sync service to authorize delete/order.
            complete: false,
            coverageComplete: false,
            nextCursor: cursor.value,
            resultKind: rangeRequested ? (rangeKind === 'older' ? 'segment' : 'tail') : 'full',
            ...(range ? { range } : {}),
            sourceEpoch: `recovery:${this.now()}`,
            rawBytes,
            // Internal-only measurement. The Gateway consumes this for a
            // sanitized diagnostic event; it is never put on the Android wire.
            measurement: {
                sourceMethod: mode === HISTORY_MODES.PAGINATED ? 'thread/turns/list' : 'thread/read',
                providerMode: mode,
                probeDurationMs,
                sourceReadDurationMs,
                providerDurationMs,
                sourceResponseBytes: rawBytes,
                sourceItemCount: projectedItems.length,
                returnedItemCount: items.length
            }
        };
    }

    /**
     * Read a complete static canonical snapshot.  This intentionally lives
     * behind the explicit history-recovery boundary: it never observes or
     * alters the IPC/live surface.  Paginated providers are scanned from the
     * native newest page towards older cursors, while `onPage` receives each
     * normalized page immediately so the transport may surface the newest
     * static history before the complete snapshot is persisted.
     */
    async scanComplete(conversationId, options = {}) {
        const buildStartedAt = this.now();
        const normalizedConversationId = typeof conversationId === 'string'
            ? conversationId.trim()
            : '';
        if (!normalizedConversationId) {
            const error = new Error('History recovery requires conversationId.');
            error.code = 'HISTORY_RECOVERY_INVALID_CONVERSATION';
            throw error;
        }
        const onPage = typeof options.onPage === 'function' ? options.onPage : null;
        const probe = await this._probe(normalizedConversationId, options);
        const probeDurationMs = elapsedMilliseconds(buildStartedAt, this.now());
        assertExactThreadIdentity(normalizedConversationId, extractResponseIdentity(probe.thread), 'probe');
        const requestedMode = normalizeHistoryMode(options.historyMode);
        const mode = probe.probed
            ? probe.mode
            : requestedMode !== HISTORY_MODES.UNKNOWN
                ? requestedMode
                : this.configuredHistoryMode;
        if (mode === HISTORY_MODES.UNKNOWN) {
            throw createUnsupportedError('HISTORY_RECOVERY_HISTORY_MODE_UNKNOWN', 'History mode is missing or unsupported.');
        }
        if (mode === HISTORY_MODES.EPHEMERAL) {
            throw createUnsupportedError('HISTORY_RECOVERY_EPHEMERAL_UNSUPPORTED', 'Ephemeral threads do not support canonical history recovery.');
        }

        // Legacy Codex exposes only one full thread/read response. Preserve
        // the existing reader/projection code and upgrade only its static
        // coverage result; no range cursor is invented for this source.
        if (mode === HISTORY_MODES.LEGACY) {
            const baseline = await this.build(normalizedConversationId, {
                ...options,
                historyMode: mode,
                rangeSegments: null
            }, probe);
            const snapshot = {
                ...baseline,
                complete: true,
                coverageComplete: true,
                resultKind: 'full',
                nextCursor: null,
                measurement: {
                    ...baseline.measurement,
                    scanPageCount: 1,
                    returnedItemCount: baseline.items.length
                }
            };
            if (onPage) {
                await onPage({
                    conversationId: normalizedConversationId,
                    mode,
                    items: snapshot.items,
                    pageIndex: 0,
                    isInitial: true,
                    isFinal: true,
                    sourceResponseBytes: snapshot.rawBytes
                });
            }
            return snapshot;
        }

        if (typeof this.readPaginatedTurns !== 'function') {
            throw createUnsupportedError('HISTORY_RECOVERY_PAGINATED_UNSUPPORTED', 'Paginated history requires a turns/items list reader.');
        }
        const maxPages = normalizeScanPageLimit(options.maxScanPages);
        const sourceReadStartedAt = this.now();
        let sourceReadDurationMs = 0;
        let rawBytes = 0;
        let cursor = null;
        let pageIndex = 0;
        let allItems = [];
        let reachedBeginning = false;
        const seenCursors = new Set();
        while (pageIndex < maxPages) {
            const readerOptions = withDefaultPaginatedDirection({
                ...options,
                ...(cursor !== null ? { cursor } : {})
            });
            const pageReadStartedAt = this.now();
            const response = await this.readPaginatedTurns(normalizedConversationId, readerOptions);
            sourceReadDurationMs += elapsedMilliseconds(pageReadStartedAt, this.now()) || 0;
            assertExactThreadIdentity(normalizedConversationId, extractResponseIdentity(response), 'response');
            const responseMode = extractHistoryMode(response);
            if (responseMode !== HISTORY_MODES.UNKNOWN && responseMode !== mode) {
                throw createUnsupportedError('HISTORY_RECOVERY_HISTORY_MODE_MISMATCH', 'History response mode does not match the probed mode.');
            }
            const pageBytes = safeJsonByteLength(response);
            rawBytes += pageBytes;
            if (rawBytes > this.maxBaselineBytes) {
                const error = new Error('History snapshot exceeds the configured recovery limit.');
                error.code = 'HISTORY_RECOVERY_BASELINE_TOO_LARGE';
                error.rawBytes = rawBytes;
                error.maxBytes = this.maxBaselineBytes;
                throw error;
            }
            const projected = this.externalize ? await this.externalize(response || {}) : response || {};
            if (containsImageDataUrl(projected)) {
                const error = new Error('History snapshot still contains an image data URL after projection.');
                error.code = 'HISTORY_RECOVERY_MEDIA_NOT_EXTERNALIZED';
                throw error;
            }
            const pageItems = projectPaginatedItems(projected, readerOptions)
                .map((item) => ({ ...item }));
            const cursorState = extractCursorState(response);
            if (!cursorState.present || !isValidOlderCursorState(cursorState)) {
                const error = new Error('Paginated history scan requires an explicit null or non-empty next cursor.');
                error.code = 'HISTORY_RECOVERY_PAGINATED_CURSOR_INVALID';
                throw error;
            }
            const nextCursor = cursorState.value;
            if (typeof nextCursor === 'string') {
                if (seenCursors.has(nextCursor) || nextCursor === cursor) {
                    const error = new Error('Paginated history scan cursor did not advance toward older history.');
                    error.code = 'HISTORY_RECOVERY_PAGINATED_CURSOR_REPEAT';
                    throw error;
                }
                seenCursors.add(nextCursor);
            }
            // Each native page is normalized ascending. Later native pages
            // are older, so prepend them to retain the canonical chronology.
            allItems = pageItems.concat(allItems);
            if (onPage) {
                await onPage({
                    conversationId: normalizedConversationId,
                    mode,
                    items: pageItems,
                    pageIndex,
                    isInitial: pageIndex === 0,
                    isFinal: nextCursor === null,
                    sourceResponseBytes: pageBytes,
                    nextOlderCursor: nextCursor
                });
            }
            pageIndex += 1;
            if (nextCursor === null) {
                reachedBeginning = true;
                break;
            }
            cursor = nextCursor;
        }
        if (!reachedBeginning) {
            const error = new Error('Paginated history scan exceeded the configured page limit.');
            error.code = 'HISTORY_RECOVERY_PAGINATED_PAGE_LIMIT';
            error.maxPages = maxPages;
            throw error;
        }
        const normalizedItems = allItems.map((item, position) => ({ ...item, position }));
        const providerDurationMs = elapsedMilliseconds(buildStartedAt, this.now());
        return {
            conversationId: normalizedConversationId,
            mode,
            items: normalizedItems,
            rootHash: buildConversationRoot(normalizedItems),
            complete: true,
            coverageComplete: true,
            nextCursor: null,
            resultKind: 'full',
            sourceEpoch: `recovery:${this.now()}`,
            rawBytes,
            measurement: {
                sourceMethod: 'thread/turns/list',
                providerMode: mode,
                probeDurationMs,
                // `sourceReadStartedAt` is retained to make the intended
                // measurement boundary explicit even when a deterministic
                // test clock is used per page.
                sourceReadDurationMs: sourceReadDurationMs || elapsedMilliseconds(sourceReadStartedAt, this.now()),
                providerDurationMs,
                sourceResponseBytes: rawBytes,
                sourceItemCount: normalizedItems.length,
                returnedItemCount: normalizedItems.length,
                scanPageCount: pageIndex
            }
        };
    }

    async _probe(conversationId, options) {
        if (this.probeThread) {
            const response = await this.probeThread(conversationId, options);
            const thread = unwrapThread(response);
            return {
                mode: extractHistoryMode(response),
                thread,
                probed: true
            };
        }
        const requestedMode = normalizeHistoryMode(options.historyMode);
        if (requestedMode !== HISTORY_MODES.UNKNOWN) {
            return {
                mode: requestedMode,
                thread: options.threadMetadata || null,
                probed: false
            };
        }
        return { mode: this.configuredHistoryMode, thread: null, probed: false };
    }
}

function isBaselineComplete(thread) {
    // Kept as a compatibility export for callers/tests from the original
    // adapter.  Terminal turn status is not a completeness proof, and P0-A
    // has no wire field that can safely carry coverage-only completeness.
    void thread;
    return false;
}

function safeJsonByteLength(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
    } catch (_) {
        return Number.POSITIVE_INFINITY;
    }
}

function elapsedMilliseconds(startedAt, finishedAt) {
    const start = Number(startedAt);
    const finish = Number(finishedAt);
    if (!Number.isFinite(start) || !Number.isFinite(finish)) return null;
    return Math.max(0, Math.round(finish - start));
}

function normalizeHistoryMode(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === HISTORY_MODES.LEGACY) return HISTORY_MODES.LEGACY;
    if (normalized === HISTORY_MODES.PAGINATED) return HISTORY_MODES.PAGINATED;
    if (normalized === HISTORY_MODES.EPHEMERAL) return HISTORY_MODES.EPHEMERAL;
    return HISTORY_MODES.UNKNOWN;
}

function extractHistoryMode(response) {
    const thread = unwrapThread(response);
    return normalizeHistoryMode(
        response?.historyMode || response?.history_mode || thread?.historyMode || thread?.history_mode
    );
}

function unwrapThread(response) {
    return response && response.thread && typeof response.thread === 'object'
        ? response.thread
        : response && typeof response === 'object' && !Array.isArray(response)
            ? response
            : {};
}

function extractResponseIdentity(response) {
    const thread = unwrapThread(response);
    const candidates = [
        thread?.id,
        thread?.threadId,
        response?.threadId,
        response?.conversationId,
        response?.conversation_id
    ];
    return candidates.find((value) => typeof value === 'string' && value.trim()) || null;
}

function assertExactThreadIdentity(expectedId, actualId, source) {
    if (actualId === null || actualId === undefined || actualId === '') {
        if (source === 'probe') return;
        const error = new Error('History recovery response is missing the canonical thread identity.');
        error.code = 'HISTORY_RECOVERY_THREAD_ID_MISSING';
        throw error;
    }
    if (String(actualId).trim() !== expectedId) {
        const error = new Error('History recovery response thread identity does not match the requested conversation.');
        error.code = 'HISTORY_RECOVERY_THREAD_ID_MISMATCH';
        error.expectedConversationId = expectedId;
        throw error;
    }
}

function projectPaginatedItems(response, options = {}) {
    const rawEntries = extractPaginatedEntries(response);
    const sortDirection = normalizeSortDirection(response, options);
    const entries = sortDirection === 'desc' ? [...rawEntries].reverse() : rawEntries;
    const positionOffset = Number.isSafeInteger(options.positionOffset) && options.positionOffset >= 0
        ? options.positionOffset
        : 0;

    if (entries.length === 0) return [];

    // An internal reader may already return canonical items.  Preserve only
    // the canonical fields and rebuild page-local positions after descending
    // normalization; never treat raw app-server items as canonical by shape.
    if (entries.every(isCanonicalItem)) {
        return entries.map((item, index) => ({
            ...item,
            position: positionOffset + index
        }));
    }

    const isTurnPage = entries.some(isPaginatedTurnEntry);
    const turns = isTurnPage
        ? entries.map((entry) => normalizePaginatedTurn(entry)).filter(Boolean)
        : entries.filter(isRawPaginatedItem).map((entry, index) => wrapPaginatedItemAsTurn(entry, index, positionOffset));
    return projectCanonicalHistory({
        sourceKind: 'app_server_turns_page',
        sourceData: { data: turns },
        positionOffset
    });
}

function extractNextCursor(response) {
    return extractCursorState(response).value;
}

function extractCursorState(response) {
    if (response && Object.prototype.hasOwnProperty.call(response, 'nextCursor')) {
        return { present: true, value: response.nextCursor };
    }
    if (response && Object.prototype.hasOwnProperty.call(response, 'next_cursor')) {
        return { present: true, value: response.next_cursor };
    }
    return { present: false, value: null };
}

function isValidOlderCursorState(cursor) {
    return Boolean(
        cursor?.present === true &&
        (cursor.value === null || (
            typeof cursor.value === 'string' &&
            cursor.value.trim().length > 0
        ))
    );
}

function normalizeTailItemLimit(value) {
    return Number.isSafeInteger(value) && value > 0
        ? Math.min(value, DEFAULT_TAIL_ITEM_LIMIT)
        : DEFAULT_TAIL_ITEM_LIMIT;
}

function normalizeScanPageLimit(value) {
    return Number.isSafeInteger(value) && value > 0
        ? Math.min(value, DEFAULT_MAX_SCAN_PAGES)
        : DEFAULT_MAX_SCAN_PAGES;
}

function normalizeRangeKind(value) {
    return typeof value === 'string' && value.trim().toLowerCase() === 'older'
        ? 'older'
        : 'tail';
}

function isRangeCapabilityEnabled(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value.enabled === true &&
        value.version === RANGE_SCHEMA_VERSION &&
        Number.isSafeInteger(value.cacheSchemaVersion) &&
        value.cacheSchemaVersion >= 3
    );
}

function buildTailRangeMetadata({
    conversationId,
    mode,
    rangeKind = 'tail',
    items,
    sourceItemCount,
    nextOlderCursor,
    cursorPresent,
    tailItemLimit,
    providerIdentityHash = null
}) {
    const first = items[0] || null;
    const last = items.at(-1) || null;
    const hasMoreBefore = rangeKind === 'older'
        ? mode === HISTORY_MODES.PAGINATED && nextOlderCursor !== null
        : sourceItemCount > items.length ||
            (mode === HISTORY_MODES.PAGINATED && (!cursorPresent || nextOlderCursor !== null));
    const coverageRoot = buildConversationRoot(items);
    const rangeId = hashPayload(canonicalize({
        conversationId,
        mode,
        direction: rangeKind,
        firstItemKey: first?.itemKey || null,
        firstItemHash: first?.contentHash || null,
        lastItemKey: last?.itemKey || null,
        lastItemHash: last?.contentHash || null,
        coverageRoot,
        schemaVersion: RANGE_SCHEMA_VERSION
    }));
    return {
        version: RANGE_SCHEMA_VERSION,
        segmentId: rangeId,
        rangeId,
        rangeKind,
        ...(providerIdentityHash ? {
            providerMode: mode,
            providerIdentityHash: String(providerIdentityHash)
        } : {}),
        newestAnchor: last
            ? { key: last.itemKey, hash: last.contentHash }
            : null,
        oldestAnchor: first
            ? { key: first.itemKey, hash: first.contentHash }
            : null,
        nextOlderCursor,
        hasMoreBefore,
        coverageRoot,
        coverageComplete: false,
        sourceItemCount,
        ...(rangeKind === 'tail' ? { itemLimit: tailItemLimit } : {})
    };
}

function extractPaginatedEntries(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.items)) return response.items;
    return [];
}

function normalizeSortDirection(response, options) {
    const value = response?.sortDirection
        ?? response?.sort_direction
        ?? options?.sortDirection
        ?? options?.sort_direction;
    return String(value || '').trim().toLowerCase() === 'desc' ? 'desc' : 'asc';
}

function withDefaultPaginatedDirection(options) {
    if (options?.sortDirection !== undefined || options?.sort_direction !== undefined) return options;
    return { ...options, sortDirection: 'desc' };
}

function isCanonicalItem(item) {
    return Boolean(
        item &&
        typeof item === 'object' &&
        typeof item.itemKey === 'string' &&
        typeof item.contentHash === 'string' &&
        typeof item.payloadJson === 'string'
    );
}

function isPaginatedTurnEntry(entry) {
    const turn = entry && typeof entry.turn === 'object' && !Array.isArray(entry.turn)
        ? entry.turn
        : entry;
    return Array.isArray(turn?.items) || (
        !isRawPaginatedItem(entry) &&
        (turn?.status !== undefined || turn?.state !== undefined || turn?.turnId !== undefined || turn?.turn_id !== undefined)
    );
}

function isRawPaginatedItem(entry) {
    const item = entry && typeof entry.item === 'object' && !Array.isArray(entry.item)
        ? entry.item
        : entry;
    return Boolean(
        item &&
        typeof item === 'object' &&
        (item.type !== undefined || item.itemType !== undefined || item.kind !== undefined ||
            item.role !== undefined || item.text !== undefined || item.content !== undefined ||
            entry?.item !== undefined)
    );
}

function normalizePaginatedTurn(entry) {
    const turn = entry && typeof entry.turn === 'object' && !Array.isArray(entry.turn)
        ? entry.turn
        : entry;
    return Array.isArray(turn?.items) ? turn : null;
}

function wrapPaginatedItemAsTurn(entry, index, positionOffset) {
    const item = entry && typeof entry.item === 'object' && !Array.isArray(entry.item)
        ? entry.item
        : entry || {};
    const turnId = item.turnId
        ?? item.turn_id
        ?? entry?.turnId
        ?? entry?.turn_id
        ?? `paginated-item-${positionOffset + index}`;
    const status = item.turnStatus
        ?? item.turn_status
        ?? entry?.turnStatus
        ?? entry?.turn_status
        ?? entry?.status
        ?? 'completed';
    return {
        id: String(turnId),
        status,
        items: [item]
    };
}

function createUnsupportedError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.recoverable = false;
    return error;
}

module.exports = {
    CodexHistoryBaselineProvider,
    DEFAULT_MAX_BASELINE_BYTES,
    DEFAULT_TAIL_ITEM_LIMIT,
    safeJsonByteLength,
    isBaselineComplete,
    HISTORY_MODES,
    normalizeHistoryMode,
    extractNextCursor,
    buildTailRangeMetadata,
    isRangeCapabilityEnabled
};
