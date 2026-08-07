'use strict';

const {
    projectCanonicalHistory,
    buildConversationRoot
} = require('./codexHistoryCanonicalizer');
const { projectMobileSurface, containsImageDataUrl } = require('./codexMobileSurfaceProjector');

const DEFAULT_MAX_BASELINE_BYTES = 70 * 1024 * 1024;

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

    async build(conversationId, options = {}) {
        const normalizedConversationId = typeof conversationId === 'string'
            ? conversationId.trim()
            : '';
        if (!normalizedConversationId) {
            const error = new Error('History recovery requires conversationId.');
            error.code = 'HISTORY_RECOVERY_INVALID_CONVERSATION';
            throw error;
        }

        const probe = await this._probe(normalizedConversationId, options);
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
        const items = mode === HISTORY_MODES.PAGINATED
            ? projectPaginatedItems(projectedThread, readerOptions)
            : projectCanonicalHistory({
                sourceKind: 'app_server_thread',
                sourceData: projectedThread
            });
        return {
            conversationId: normalizedConversationId,
            mode,
            items,
            rootHash: buildConversationRoot(items),
            // P0-A must never set the v2 baselineComplete bit.  The bit is
            // consumed by the existing sync service to authorize delete/order.
            complete: false,
            coverageComplete: false,
            nextCursor: extractNextCursor(response),
            sourceEpoch: `recovery:${this.now()}`,
            rawBytes
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
    if (response && Object.prototype.hasOwnProperty.call(response, 'nextCursor')) return response.nextCursor ?? null;
    if (response && Object.prototype.hasOwnProperty.call(response, 'next_cursor')) return response.next_cursor ?? null;
    return null;
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
    safeJsonByteLength,
    isBaselineComplete,
    HISTORY_MODES,
    normalizeHistoryMode
};
