'use strict';

const DATA_IMAGE_URL = /^data:(image\/[a-z0-9.+-]+);base64,/i;
const EXACT_DATA_IMAGE_URL = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i;
const EMBEDDED_DATA_IMAGE_URL = /data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)/ig;
const EMBEDDED_DATA_IMAGE_URL_TEST = /data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)/i;
const IMAGE_DATA_URL_MARKER = /data:image\//i;
const REDACTABLE_IMAGE_DATA_URL = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]*/ig;
const MOBILE_REALTIME_SURFACE_MAX_BYTES = 192 * 1024;
const MOBILE_REALTIME_SURFACE_MAX_ITEMS = 256;
const MOBILE_REALTIME_SURFACE_KEYS = [
    'conversationId', 'ownerKind', 'revision', 'status', 'updatedAt', 'title', 'cwd',
    'latestTurnId', 'currentCodexConfig', 'pendingApproval', 'pendingPlanAction',
    'pendingUserInputAction', 'pendingGoalAction', 'activeGoal', 'desynced', 'sourceEpoch',
    'historyBaselineComplete', 'itemsTruncated'
];
const MOBILE_REALTIME_ITEM_STRING_BYTES = 16 * 1024;

/**
 * Clone an IPC/canonical surface for an Android client and replace image
 * data-URLs with content-addressed media descriptors. The source object is
 * never mutated: Owner/IPC keeps the original surface as its authority.
 */
async function projectMobileSurface(value, { mediaStore, maxNodes = 50_000 } = {}) {
    if (!mediaStore || typeof mediaStore.put !== 'function') return cloneValue(value);
    let nodes = 0;
    const walk = async (current) => {
        nodes += 1;
        if (nodes > maxNodes) throw codedError('HISTORY_MEDIA_PROJECTION_LIMIT', 'Media projection node limit exceeded.');
        if (typeof current === 'string') {
            const text = current.trim();
            const exactMatch = EXACT_DATA_IMAGE_URL.exec(text);
            if (!exactMatch) {
                // Arrays and scalar values do not have a parent object where
                // attachment descriptors can be collected, but they still
                // must not let an embedded data URL cross the gateway.
                if (!EMBEDDED_DATA_IMAGE_URL_TEST.test(current)) return current;
                return (await projectEmbeddedText(current, mediaStore)).text;
            }
            const stored = await storeImage(mediaStore, text, exactMatch[1]);
            return stored.metadata
                ? imageDescriptor(stored)
                : unavailableImageDescriptor(exactMatch[1]);
        }
        if (Array.isArray(current)) {
            const result = [];
            for (const item of current) result.push(await walk(item));
            return result;
        }
        if (!current || typeof current !== 'object') return current;
        const result = {};
        const embeddedAttachments = [];
        for (const [key, child] of Object.entries(current)) {
            // A visible message can contain Markdown or JSON text with an
            // embedded image data URL. Keep the正文 as text, replace only the
            // bytes with the server media URL, and attach the descriptor so
            // Android can render a thumbnail and retain the content hash.
            const isExactImage = typeof child === 'string' && EXACT_DATA_IMAGE_URL.test(child.trim());
            if (typeof child === 'string' && !isExactImage && EMBEDDED_DATA_IMAGE_URL_TEST.test(child)) {
                const projected = await projectEmbeddedText(child, mediaStore);
                result[key] = projected.text;
                embeddedAttachments.push(...projected.descriptors.map((descriptor) => ({
                    type: 'image',
                    media: descriptor
                })));
            } else {
                result[key] = await walk(child);
            }
        }
        if (embeddedAttachments.length > 0) {
            const existing = Array.isArray(result.attachments) ? result.attachments : [];
            result.attachments = [...existing, ...embeddedAttachments];
        }
        return result;
    };
    return walk(value);
}

/**
 * Project only the live tail of an IPC surface for Android.  The full
 * surface remains the server-side history baseline; sending all 1,000+
 * historical items on every IPC revision defeats the bounded history channel
 * and was the direct cause of the old Android JSONObject OOM.
 */
async function projectMobileRealtimeSurface(
    surface,
    {
        mediaStore = null,
        maxItems = MOBILE_REALTIME_SURFACE_MAX_ITEMS,
        maxBytes = MOBILE_REALTIME_SURFACE_MAX_BYTES,
        redactInlineMedia = false
    } = {}
) {
    if (!surface || typeof surface !== 'object' || Array.isArray(surface)) return {};
    const sourceItems = Array.isArray(surface.items) ? surface.items : [];
    if (!mediaStore && redactInlineMedia) {
        // The fast/deadline path must not first materialize a large redacted
        // copy and then repeatedly stringify it while trimming the oldest
        // items.  That turns a bounded live tail into quadratic work and can
        // block the Node event loop long enough to delay the very surface it
        // is supposed to make visible.
        return projectRedactedRealtimeSurface(surface, { maxItems, maxBytes });
    }
    const tailItems = sourceItems.slice(-Math.max(1, maxItems));
    const reduced = {};
    for (const key of MOBILE_REALTIME_SURFACE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(surface, key)) reduced[key] = surface[key];
    }
    reduced.items = tailItems;
    reduced.itemsTruncated = tailItems.length < sourceItems.length;
    let projected = mediaStore
        ? await projectMobileSurface(reduced, { mediaStore, maxNodes: Math.max(10_000, tailItems.length * 200) })
        : redactInlineMedia
            ? redactImageDataUrls(reduced, Math.max(10_000, tailItems.length * 200))
            : reduced;
    projected = sanitizeRealtimeSurface(projected);
    while (Array.isArray(projected.items) && projected.items.length > 1 &&
        safeJsonByteLength(projected) > maxBytes) {
        projected.items = projected.items.slice(1);
    }
    if (safeJsonByteLength(projected) > maxBytes) {
        projected.items = [];
    }
    return projected;
}

async function projectRedactedRealtimeSurface(
    surface,
    {
        maxItems = MOBILE_REALTIME_SURFACE_MAX_ITEMS,
        maxBytes = MOBILE_REALTIME_SURFACE_MAX_BYTES
    } = {}
) {
    if (!surface || typeof surface !== 'object' || Array.isArray(surface)) return {};
    const sourceItems = Array.isArray(surface.items) ? surface.items : [];
    const normalizedMaxItems = Math.max(1, Number.isSafeInteger(maxItems) ? maxItems : MOBILE_REALTIME_SURFACE_MAX_ITEMS);
    const normalizedMaxBytes = Math.max(1024, Number.isSafeInteger(maxBytes) ? maxBytes : MOBILE_REALTIME_SURFACE_MAX_BYTES);
    const state = { nodes: 0 };
    const reduced = {};
    for (const key of MOBILE_REALTIME_SURFACE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(surface, key)) {
            reduced[key] = boundRealtimeValue(surface[key], state);
        }
    }
    // Reserve the same object shape used by the final result so the item
    // budget below is exact up to commas between item JSON values.
    reduced.items = [];
    reduced.itemsTruncated = Boolean(surface.itemsTruncated) || sourceItems.length > normalizedMaxItems;
    const baseBytes = safeJsonByteLength(reduced);
    const selected = [];
    let selectedItemBytes = 0;
    const firstIndex = Math.max(0, sourceItems.length - normalizedMaxItems);
    for (let index = sourceItems.length - 1; index >= firstIndex; index -= 1) {
        const item = boundRealtimeValue(sourceItems[index], state);
        const itemBytes = safeJsonByteLength(item);
        const separatorBytes = selected.length > 0 ? 1 : 0;
        if (baseBytes + selectedItemBytes + separatorBytes + itemBytes > normalizedMaxBytes) {
            break;
        }
        selected.push({ item, itemBytes });
        selectedItemBytes += itemBytes + separatorBytes;
    }
    reduced.items = selected.reverse().map(({ item }) => item);
    reduced.itemsTruncated = Boolean(surface.itemsTruncated) || reduced.items.length < sourceItems.length;

    // The incremental estimate above accounts for the JSON representation of
    // `items: []`.  Keep one defensive exact check for unusual serializers or
    // values whose JSON representation changed during sanitization; this is
    // linear in the number of retained items and never rebuilds candidates.
    while (reduced.items.length > 0 && safeJsonByteLength(reduced) > normalizedMaxBytes) {
        reduced.items.shift();
        reduced.itemsTruncated = true;
    }
    return reduced;
}

function boundRealtimeValue(value, state, depth = 0) {
    state.nodes += 1;
    if (state.nodes > 50_000 || depth >= 4) return null;
    if (typeof value === 'string') return redactAndClipString(value, MOBILE_REALTIME_ITEM_STRING_BYTES);
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        const start = Math.max(0, value.length - 64);
        const result = [];
        for (let index = start; index < value.length; index += 1) {
            result.push(boundRealtimeValue(value[index], state, depth + 1));
        }
        return result;
    }
    const result = {};
    let keyCount = 0;
    for (const key of Object.keys(value)) {
        if (keyCount >= 32) break;
        result[key] = boundRealtimeValue(value[key], state, depth + 1);
        keyCount += 1;
    }
    return result;
}

function redactAndClipString(value, maxBytes) {
    let text = String(value);
    if (IMAGE_DATA_URL_MARKER.test(text)) {
        text = text.replace(REDACTABLE_IMAGE_DATA_URL, '[图片数据不可用]');
    }
    const limit = Math.max(64, maxBytes);
    if (Buffer.byteLength(text, 'utf8') <= limit) return text;
    let clipped = text.slice(0, Math.max(0, limit - 3));
    while (Buffer.byteLength(clipped, 'utf8') > limit - 3) {
        clipped = clipped.slice(0, Math.max(0, clipped.length - 256));
    }
    return `${clipped}…`;
}

function containsImageDataUrl(value, maxNodes = 50_000) {
    let nodes = 0;
    const visit = (current) => {
        nodes += 1;
        if (nodes > maxNodes) return true;
        if (typeof current === 'string') return EMBEDDED_DATA_IMAGE_URL_TEST.test(current);
        if (Array.isArray(current)) return current.some(visit);
        if (current && typeof current === 'object') return Object.values(current).some(visit);
        return false;
    };
    return visit(value);
}

/** Replace an image data URL with a non-sensitive placeholder after a media
 * store failure. This is intentionally lossy: leaking the original bytes is
 * worse than showing a retryable placeholder to the mobile client. */
function redactImageDataUrls(value, maxNodes = 50_000) {
    let nodes = 0;
    const walk = (current) => {
        nodes += 1;
        if (nodes > maxNodes) return null;
        if (typeof current === 'string') {
            const match = DATA_IMAGE_URL.exec(current.trim());
            if (match) return {
                kind: 'image',
                mimeType: match[1],
                unavailable: true,
                thumbnailUnavailable: true
            };
            return current.replace(EMBEDDED_DATA_IMAGE_URL, '[图片数据不可用]');
        }
        if (Array.isArray(current)) return current.map(walk);
        if (!current || typeof current !== 'object') return current;
        return Object.fromEntries(Object.entries(current).map(([key, child]) => [key, walk(child)]));
    };
    return walk(value);
}

async function projectEmbeddedText(text, mediaStore) {
    const matches = [...String(text).matchAll(EMBEDDED_DATA_IMAGE_URL)];
    if (matches.length === 0) return { text, descriptors: [] };
    const descriptors = [];
    let cursor = 0;
    let projectedText = '';
    for (const match of matches) {
        const dataUrl = match[0];
        const stored = await storeImage(mediaStore, dataUrl, match[1]);
        const descriptor = stored.metadata ? imageDescriptor(stored) : null;
        projectedText += String(text).slice(cursor, match.index) + (descriptor?.originalPath || '[图片不可用]');
        cursor = (match.index || 0) + dataUrl.length;
        if (descriptor) descriptors.push(descriptor);
    }
    return {
        text: projectedText + String(text).slice(cursor),
        descriptors
    };
}

async function storeImage(mediaStore, dataUrl, mimeType) {
    try {
        const metadata = await mediaStore.put({ dataUrl, mimeType });
        let thumbnail = null;
        if (typeof mediaStore.ensureThumbnail === 'function') {
            try {
                thumbnail = await mediaStore.ensureThumbnail(metadata.contentHash);
            } catch (_) {
                metadata.thumbnailUnavailable = true;
            }
        }
        return { metadata, thumbnail };
    } catch (error) {
        // A malformed/unsupported data URL must never make the whole history
        // unavailable, and its bytes must never cross the Gateway boundary.
        return { metadata: null, thumbnail: null, error };
    }
}

function imageDescriptor({ metadata, thumbnail }) {
    return {
        kind: 'image',
        contentHash: metadata.contentHash,
        mimeType: metadata.mimeType,
        byteSize: metadata.byteSize,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        originalPath: metadata.mediaPath,
        thumbnailHash: thumbnail?.thumbnailHash || metadata.thumbnailHash || null,
        thumbnailPath: thumbnail?.mediaPath || metadata.thumbnailMediaPath || null,
        thumbnailByteSize: thumbnail?.byteSize || metadata.thumbnailByteSize || null,
        thumbnailUnavailable: Boolean(metadata.thumbnailUnavailable && !thumbnail)
    };
}

function unavailableImageDescriptor(mimeType) {
    return {
        kind: 'image',
        mimeType,
        unavailable: true,
        thumbnailUnavailable: true
    };
}

function cloneValue(value) {
    if (value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
}

function sanitizeRealtimeSurface(value, depth = 0) {
    if (typeof value === 'string') {
        const bytes = Buffer.byteLength(value, 'utf8');
        if (bytes <= MOBILE_REALTIME_ITEM_STRING_BYTES) return value;
        let clipped = value.slice(0, MOBILE_REALTIME_ITEM_STRING_BYTES);
        while (Buffer.byteLength(clipped, 'utf8') > MOBILE_REALTIME_ITEM_STRING_BYTES) {
            clipped = clipped.slice(0, Math.max(0, clipped.length - 256));
        }
        return `${clipped}…`;
    }
    if (value === null || typeof value !== 'object') return value;
    if (depth >= 4) return null;
    if (Array.isArray(value)) return value.slice(-256).map((item) => sanitizeRealtimeSurface(item, depth + 1));
    const result = {};
    for (const [key, child] of Object.entries(value)) {
        result[key] = sanitizeRealtimeSurface(child, depth + 1);
    }
    return result;
}

function safeJsonByteLength(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
    } catch (_) {
        return Number.POSITIVE_INFINITY;
    }
}

function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    projectMobileSurface,
    projectMobileRealtimeSurface,
    containsImageDataUrl,
    redactImageDataUrls,
    DATA_IMAGE_URL,
    EMBEDDED_DATA_IMAGE_URL,
    MOBILE_REALTIME_SURFACE_MAX_BYTES,
    MOBILE_REALTIME_SURFACE_MAX_ITEMS
};
