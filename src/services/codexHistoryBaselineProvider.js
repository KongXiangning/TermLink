'use strict';

const {
    projectCanonicalHistory,
    buildConversationRoot
} = require('./codexHistoryCanonicalizer');
const { projectMobileSurface, containsImageDataUrl } = require('./codexMobileSurfaceProjector');

const DEFAULT_MAX_BASELINE_BYTES = 70 * 1024 * 1024;

/**
 * Builds the mobile history baseline behind the Gateway boundary.
 *
 * The upstream thread/read response is intentionally kept inside this
 * adapter. Callers receive only canonical items and a checkpoint; the raw
 * response must never be forwarded to an Android WebSocket client.
 */
class CodexHistoryBaselineProvider {
    constructor({ readThread, now = Date.now, maxBaselineBytes = DEFAULT_MAX_BASELINE_BYTES, mediaStore = null, externalize = null } = {}) {
        if (typeof readThread !== 'function') {
            throw new TypeError('CodexHistoryBaselineProvider requires readThread.');
        }
        this.readThread = readThread;
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

    async build(conversationId) {
        const normalizedConversationId = typeof conversationId === 'string'
            ? conversationId.trim()
            : '';
        if (!normalizedConversationId) {
            const error = new Error('History recovery requires conversationId.');
            error.code = 'HISTORY_RECOVERY_INVALID_CONVERSATION';
            throw error;
        }

        const response = await this.readThread(normalizedConversationId);
        const thread = response && response.thread && typeof response.thread === 'object'
            ? response.thread
            : response;
        const rawBytes = safeJsonByteLength(thread);
        if (rawBytes > this.maxBaselineBytes) {
            const error = new Error('History baseline exceeds the configured recovery limit.');
            error.code = 'HISTORY_RECOVERY_BASELINE_TOO_LARGE';
            error.rawBytes = rawBytes;
            error.maxBytes = this.maxBaselineBytes;
            throw error;
        }

        const projectedThread = this.externalize ? await this.externalize(thread || {}) : thread || {};
        if (containsImageDataUrl(projectedThread)) {
            const error = new Error('History baseline still contains an image data URL after projection.');
            error.code = 'HISTORY_RECOVERY_MEDIA_NOT_EXTERNALIZED';
            throw error;
        }
        const items = projectCanonicalHistory({
            sourceKind: 'app_server_thread',
            sourceData: projectedThread
        });
        const complete = isBaselineComplete(thread);
        return {
            conversationId: normalizedConversationId,
            items,
            rootHash: buildConversationRoot(items),
            complete,
            sourceEpoch: `recovery:${this.now()}`,
            rawBytes
        };
    }
}

function isBaselineComplete(thread) {
    const turns = Array.isArray(thread?.turns) ? thread.turns : [];
    if (turns.length === 0) return true;
    return turns.every((turn) => {
        const status = String(turn?.status || turn?.state || '').toLowerCase();
        return ['completed', 'complete', 'done', 'finished', 'failed', 'error', 'cancelled', 'canceled', 'interrupted'].includes(status);
    });
}

function safeJsonByteLength(value) {
    try {
        return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
    } catch (_) {
        return Number.POSITIVE_INFINITY;
    }
}

module.exports = {
    CodexHistoryBaselineProvider,
    DEFAULT_MAX_BASELINE_BYTES,
    safeJsonByteLength,
    isBaselineComplete
};
