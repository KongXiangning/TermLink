'use strict';

const crypto = require('node:crypto');
const {
    canonicalize,
    hashPayload,
    buildConversationRoot
} = require('./codexHistoryCanonicalizer');

const DEFAULT_PAGE_ITEMS = 200;
const DEFAULT_RANGE_PAGE_BYTES = 192 * 1024;
const DEFAULT_DETAIL_CHUNK_BYTES = 48 * 1024;
const DEFAULT_DETAIL_ENVELOPE_BYTES = 128 * 1024;
const MAX_DETAIL_REFS_PER_ITEM = 64;
const PRODUCT_HISTORY_PROVIDER_IDENTITY = hashPayload('termlink:codex-history-product-provider:v1');

const INLINE_IMAGE_DATA_URL = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i;

class CodexHistoryProductProvider {
    constructor({
        store,
        pageItems = DEFAULT_PAGE_ITEMS,
        rangePageBytes = DEFAULT_RANGE_PAGE_BYTES,
        detailChunkBytes = DEFAULT_DETAIL_CHUNK_BYTES,
        detailEnvelopeBytes = DEFAULT_DETAIL_ENVELOPE_BYTES
    } = {}) {
        if (!store || typeof store.readConversation !== 'function') {
            throw new TypeError('CodexHistoryProductProvider requires a product history Store.');
        }
        this.store = store;
        this.pageItems = positiveInteger(pageItems, DEFAULT_PAGE_ITEMS, 2_000);
        this.rangePageBytes = positiveInteger(rangePageBytes, DEFAULT_RANGE_PAGE_BYTES, DEFAULT_RANGE_PAGE_BYTES);
        this.detailChunkBytes = positiveInteger(detailChunkBytes, DEFAULT_DETAIL_CHUNK_BYTES, DEFAULT_DETAIL_CHUNK_BYTES);
        this.detailEnvelopeBytes = positiveInteger(detailEnvelopeBytes, DEFAULT_DETAIL_ENVELOPE_BYTES, DEFAULT_DETAIL_ENVELOPE_BYTES);
    }

    async readInitial(conversationId, { rangeEnabled = false } = {}) {
        const history = await this.store.readConversation(conversationId);
        if (!history) return null;

        const items = projectItems(history);
        const complete = isCanonicalCoverage(history.coverage);
        if (!rangeEnabled) {
            return {
                conversationId: history.conversationId,
                items,
                complete,
                coverageComplete: complete,
                coverage: projectCoverage(history.coverage),
                resultKind: 'full'
            };
        }

        const snapshotHash = projectionSnapshotHash(history, items);
        const page = selectBoundedTail(items, this.pageItems, this.rangePageBytes);
        const pageItems = page.items;
        const hasMoreBefore = page.startIndex > 0;
        const range = buildRangeMetadata({
            conversationId: history.conversationId,
            items: pageItems,
            sourceItemCount: items.length,
            rangeKind: 'tail',
            hasMoreBefore,
            coverageComplete: !hasMoreBefore && complete,
            nextOlderCursor: null,
            coverage: history.coverage
        });
        if (hasMoreBefore && pageItems.length > 0) {
            range.nextOlderCursor = encodeCursor({
                kind: 'older',
                conversationId,
                rangeId: range.rangeId,
                snapshotHash,
                anchor: cursorAnchor(pageItems[0])
            });
        }
        return {
            conversationId: history.conversationId,
            items: pageItems,
            complete: range.coverageComplete,
            coverageComplete: range.coverageComplete,
            coverage: projectCoverage(history.coverage),
            resultKind: hasMoreBefore ? 'tail' : 'full',
            range
        };
    }

    async readOlderPage(conversationId, { cursor, rangeId } = {}) {
        const decoded = decodeCursor(cursor);
        if (!decoded || decoded.kind !== 'older' || decoded.conversationHash !== sha256(conversationId)) {
            throw providerError('history_older_cursor_invalid', 'The product history cursor is invalid.');
        }
        if (typeof rangeId !== 'string' || rangeId !== decoded.rangeId) {
            throw providerError('history_older_cursor_stale', 'The product history cursor does not match this range.');
        }

        const history = await this.store.readConversation(conversationId);
        if (!history) throw providerError('history_product_not_found', 'The product history is not available.');
        const items = projectItems(history);
        if (decoded.snapshotHash !== projectionSnapshotHash(history, items)) {
            throw providerError('history_older_cursor_stale', 'The product history changed after this cursor was issued.');
        }
        const anchorIndex = items.findIndex((item) => (
            item.itemKey === decoded.anchor.itemKey &&
            item.contentHash === decoded.anchor.contentHash &&
            item.position === decoded.anchor.position
        ));
        if (anchorIndex < 0) {
            throw providerError('history_older_cursor_stale', 'The product history changed after this cursor was issued.');
        }

        const olderItems = items.slice(0, anchorIndex);
        if (olderItems.length === 0) {
            throw providerError('history_older_cursor_invalid', 'The product history cursor has no older items.');
        }
        const pageLimit = Math.max(1, this.pageItems - 1);
        const olderPage = selectBoundedTail(
            olderItems,
            pageLimit,
            Math.max(1, this.rangePageBytes - estimateRangeItemBytes(items[anchorIndex]))
        );
        const pageItems = olderPage.items.concat(items[anchorIndex]);
        const hasMoreBefore = olderPage.startIndex > 0;
        const range = buildRangeMetadata({
            conversationId: history.conversationId,
            items: pageItems,
            sourceItemCount: items.length,
            rangeKind: 'older',
            hasMoreBefore,
            // One older page never claims that the App has committed the full range.
            coverageComplete: false,
            nextOlderCursor: null,
            coverage: history.coverage
        });
        if (hasMoreBefore) {
            range.nextOlderCursor = encodeCursor({
                    kind: 'older',
                    conversationId,
                    rangeId: range.rangeId,
                    snapshotHash: decoded.snapshotHash,
                    anchor: cursorAnchor(pageItems[0])
                });
        }
        return {
            conversationId: history.conversationId,
            items: pageItems,
            complete: false,
            coverageComplete: false,
            resultKind: 'segment',
            range
        };
    }

    async readDetailPage(conversationId, { refId, cursor = null, maxBytes = this.detailChunkBytes } = {}) {
        const history = await this.store.readConversation(conversationId);
        if (!history) return null;

        const detail = (Array.isArray(history.toolDetails) ? history.toolDetails : [])
            .find((entry) => detailRefId(conversationId, entry.detailKey) === refId);
        if (!detail) return null;

        const projected = projectPayload(detail.payload);
        const detailJson = canonicalize(projected.value);
        const contentBytes = Buffer.from(detailJson, 'utf8');
        const contentHash = hashPayload(detailJson);
        let offset = 0;
        if (cursor !== null) {
            const decoded = decodeCursor(cursor);
            if (!decoded || decoded.kind !== 'detail' ||
                decoded.conversationHash !== sha256(conversationId) ||
                decoded.refId !== refId || decoded.contentHash !== contentHash ||
                !Number.isSafeInteger(decoded.offset) || decoded.offset < 0 || decoded.offset >= contentBytes.length) {
                throw providerError('history_detail_cursor_invalid', 'The product detail cursor is invalid.');
            }
            offset = decoded.offset;
        }

        const requestedBytes = positiveInteger(maxBytes, this.detailChunkBytes, this.detailChunkBytes);
        let chunkLimit = Math.min(requestedBytes, this.detailChunkBytes);
        let chunk = '';
        let nextOffset = offset;
        let response;
        while (chunkLimit > 0) {
            const slice = sliceUtf8(contentBytes, offset, chunkLimit);
            chunk = slice.data;
            nextOffset = slice.nextOffset;
            const nextCursor = nextOffset < contentBytes.length
                ? encodeCursor({
                    kind: 'detail',
                    conversationId,
                    refId,
                    contentHash,
                    offset: nextOffset
                })
                : null;
            response = {
                refId,
                contentHash,
                byteSize: contentBytes.length,
                byteOffset: offset,
                nextCursor,
                content: chunk
            };
            if (Buffer.byteLength(JSON.stringify({ type: 'conversation_history_detail_response', ...response }), 'utf8') <= this.detailEnvelopeBytes) break;
            chunkLimit = Math.floor(chunkLimit / 2);
        }
        if (chunkLimit <= 0 || nextOffset <= offset) {
            throw providerError('history_detail_page_too_large', 'The product detail cannot fit in the configured response limit.');
        }
        return response;
    }
}

function projectItems(history) {
    const detailRefsByItemKey = new Map();
    for (const detail of Array.isArray(history.toolDetails) ? history.toolDetails : []) {
        if (!detail.itemKey) continue;
        const projected = projectPayload(detail.payload);
        const projectedPayload = projected.value;
        const payloadJson = canonicalize(projectedPayload);
        const ref = {
            kind: 'tool_detail',
            refId: detailRefId(history.conversationId, detail.detailKey),
            contentHash: hashPayload(payloadJson),
            byteSize: Buffer.byteLength(payloadJson, 'utf8'),
            mimeType: 'application/json',
            truncated: false,
            ...(projected.mediaOmitted ? { availability: 'partial' } : {})
        };
        const details = detailRefsByItemKey.get(detail.itemKey) || { refs: [], truncated: false };
        if (details.refs.length < MAX_DETAIL_REFS_PER_ITEM) details.refs.push(ref);
        else details.truncated = true;
        detailRefsByItemKey.set(detail.itemKey, details);
    }

    return (Array.isArray(history.items) ? history.items : []).map((item, index) => {
        const projected = projectPayload(item.payload);
        const projectedPayload = projected.value;
        const payloadJson = canonicalize(projectedPayload);
        return {
            itemKey: item.itemKey,
            turnId: item.turnId,
            position: item.ordinal ?? index,
            itemType: item.itemType,
            role: typeof projectedPayload?.role === 'string' ? projectedPayload.role : null,
            clientRequestId: typeof projectedPayload?.clientRequestId === 'string'
                ? projectedPayload.clientRequestId
                : null,
            payloadJson,
            contentHash: hashPayload(payloadJson),
            detailRefs: detailRefsByItemKey.get(item.itemKey)?.refs || [],
            ...(detailRefsByItemKey.get(item.itemKey)?.truncated ? { detailRefsTruncated: true, availability: 'partial' } : {}),
            ...(projected.mediaOmitted ? { availability: 'partial' } : {})
        };
    });
}

function selectBoundedTail(items, maxItems, maxBytes) {
    let startIndex = items.length;
    let selectedCount = 0;
    let selectedBytes = 2 * 1024;
    while (startIndex > 0 && selectedCount < maxItems) {
        const candidateBytes = estimateRangeItemBytes(items[startIndex - 1]);
        if (selectedCount > 0 && selectedBytes + candidateBytes > maxBytes) break;
        selectedBytes += candidateBytes;
        startIndex -= 1;
        selectedCount += 1;
        // Always make progress for one item. The sync service still applies
        // the hard WebSocket envelope guard if a single DTO cannot fit.
        if (selectedCount === 1 && selectedBytes > maxBytes) break;
    }
    return { items: items.slice(startIndex), startIndex };
}

function estimateRangeItemBytes(item) {
    const payloadJson = typeof item?.payloadJson === 'string' ? item.payloadJson : '';
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');
    const payloadChunked = payloadBytes > 128 * 1024;
    const wireCandidate = {
        itemKey: item?.itemKey,
        turnId: item?.turnId ?? null,
        position: item?.position,
        itemType: item?.itemType,
        role: item?.role ?? null,
        clientRequestId: item?.clientRequestId ?? null,
        payloadJson: payloadChunked ? '' : payloadJson,
        contentHash: item?.contentHash,
        ...(Array.isArray(item?.detailRefs) && item.detailRefs.length > 0 ? { detailRefs: item.detailRefs } : {}),
        ...(item?.detailRefsTruncated === true ? { detailRefsTruncated: true } : {}),
        ...(typeof item?.availability === 'string' && item.availability ? { availability: item.availability } : {}),
        ...(payloadChunked ? {
            payloadHash: item.contentHash,
            payloadBytes,
            payloadChunkCount: Math.ceil(payloadBytes / (96 * 1024))
        } : {})
    };
    return Buffer.byteLength(JSON.stringify(wireCandidate), 'utf8');
}

function projectCoverage(coverage) {
    const source = coverage && typeof coverage === 'object' && !Array.isArray(coverage) ? coverage : {};
    return {
        completeness: source.completeness === 'canonical' ? 'canonical' : 'partial',
        coverageComplete: source.coverageComplete === true && source.completeness === 'canonical'
    };
}

function isCanonicalCoverage(coverage) {
    return coverage?.completeness === 'canonical' && coverage?.coverageComplete === true;
}

function buildRangeMetadata({ conversationId, items, sourceItemCount, rangeKind, hasMoreBefore, coverageComplete, nextOlderCursor, coverage }) {
    const first = items[0] || null;
    const last = items.at(-1) || null;
    const coverageRoot = buildConversationRoot(items);
    const rangeId = hashPayload(canonicalize({
        conversationId,
        rangeKind,
        firstItemKey: first?.itemKey || null,
        firstItemHash: first?.contentHash || null,
        lastItemKey: last?.itemKey || null,
        lastItemHash: last?.contentHash || null,
        coverageRoot,
        coverage: projectCoverage(coverage)
    }));
    return {
        version: 1,
        segmentId: rangeId,
        rangeId,
        rangeKind,
        providerMode: 'product_db',
        providerIdentityHash: PRODUCT_HISTORY_PROVIDER_IDENTITY,
        newestAnchor: last ? { key: last.itemKey, hash: last.contentHash } : null,
        oldestAnchor: first ? { key: first.itemKey, hash: first.contentHash } : null,
        nextOlderCursor,
        hasMoreBefore,
        coverageRoot,
        coverageComplete,
        sourceItemCount
    };
}

function projectPayload(value) {
    const projected = projectValue(value);
    if (projected.mediaOmitted && projected.value && typeof projected.value === 'object' && !Array.isArray(projected.value)) {
        return {
            value: { ...projected.value, mediaAvailability: 'unsupported' },
            mediaOmitted: true
        };
    }
    return projected;
}

function projectValue(value) {
    if (typeof value === 'string') {
        return INLINE_IMAGE_DATA_URL.test(value)
            ? { value: null, mediaOmitted: true }
            : { value, mediaOmitted: false };
    }
    if (Array.isArray(value)) {
        let mediaOmitted = false;
        const projected = value.map((entry) => {
            const child = projectValue(entry);
            mediaOmitted ||= child.mediaOmitted;
            return child.value;
        });
        return { value: projected, mediaOmitted };
    }
    if (!value || typeof value !== 'object') return { value, mediaOmitted: false };

    const result = {};
    let mediaOmitted = false;
    for (const [key, entry] of Object.entries(value)) {
        const child = projectValue(entry);
        result[key] = child.value;
        mediaOmitted ||= child.mediaOmitted;
    }
    return { value: result, mediaOmitted };
}

function detailRefId(conversationId, detailKey) {
    return sha256(`${conversationId}\u0000${detailKey}`);
}

function cursorAnchor(item) {
    return {
        itemKey: item.itemKey,
        contentHash: item.contentHash,
        position: item.position
    };
}

function projectionSnapshotHash(history, items) {
    return hashPayload(canonicalize({
        conversationId: history.conversationId,
        coverage: projectCoverage(history.coverage),
        items: items.map((item) => ({
            itemKey: item.itemKey,
            turnId: item.turnId,
            position: item.position,
            itemType: item.itemType,
            contentHash: item.contentHash,
            detailRefs: item.detailRefs,
            ...(item.detailRefsTruncated ? { detailRefsTruncated: true } : {}),
            ...(item.availability ? { availability: item.availability } : {})
        }))
    }));
}

function encodeCursor(payload) {
    const value = {
        v: 1,
        ...payload,
        conversationHash: payload.conversationHash || sha256(payload.conversationId)
    };
    delete value.conversationId;
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(value) {
    if (typeof value !== 'string' || value.length > 4_096) return null;
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        return decoded?.v === 1 ? decoded : null;
    } catch (_) {
        return null;
    }
}

function sliceUtf8(buffer, offset, maxBytes) {
    let end = Math.min(buffer.length, offset + maxBytes);
    while (end > offset && end < buffer.length && (buffer[end] & 0xc0) === 0x80) end -= 1;
    if (end === offset && offset < buffer.length) {
        end = Math.min(buffer.length, offset + 4);
        while (end < buffer.length && (buffer[end] & 0xc0) === 0x80) end += 1;
    }
    return {
        data: buffer.subarray(offset, end).toString('utf8'),
        nextOffset: end
    };
}

function positiveInteger(value, fallback, maximum) {
    return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

function sha256(value) {
    return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function providerError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    CodexHistoryProductProvider,
    PRODUCT_HISTORY_PROVIDER_IDENTITY,
    DEFAULT_PAGE_ITEMS,
    DEFAULT_RANGE_PAGE_BYTES,
    DEFAULT_DETAIL_CHUNK_BYTES,
    DEFAULT_DETAIL_ENVELOPE_BYTES,
    MAX_DETAIL_REFS_PER_ITEM
};
