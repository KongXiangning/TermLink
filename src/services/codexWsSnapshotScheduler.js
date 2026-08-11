'use strict';

// Keep every history/control WebSocket envelope below the Android parser
// budget.  This is deliberately shared by the scheduler and the gateway
// send helper so a snapshot cannot bypass the control-envelope limit.
const MAX_WS_ENVELOPE_BYTES = 256 * 1024;
const MAX_CONTROL_ENVELOPE_BYTES = MAX_WS_ENVELOPE_BYTES;

class CodexWsSnapshotScheduler {
    constructor({
        intervalMs = 250,
        highWaterBytes = 2 * 1024 * 1024,
        lowWaterBytes = 512 * 1024,
        hardLimitBytes = 8 * 1024 * 1024,
        hardLimitDurationMs = 15_000,
        now = Date.now,
        serialize = JSON.stringify,
        isStillActive,
        onOversize,
        historyMaxBlockingMs = 100,
        historyBurstMaxBytes = 16 * 1024,
        historyMinBurstBytes = 1024,
        historyEwmaAlpha = 0.25
    } = {}) {
        this.intervalMs = intervalMs;
        this.highWaterBytes = highWaterBytes;
        this.lowWaterBytes = lowWaterBytes;
        this.hardLimitBytes = hardLimitBytes;
        this.hardLimitDurationMs = hardLimitDurationMs;
        this.now = now;
        this.serialize = serialize;
        this.isStillActive = typeof isStillActive === 'function' ? isStillActive : () => true;
        this.onOversize = typeof onOversize === 'function' ? onOversize : null;
        this.historyMaxBlockingMs = normalizePositiveNumber(historyMaxBlockingMs, 100);
        this.historyBurstMaxBytes = normalizePositiveNumber(historyBurstMaxBytes, 16 * 1024);
        this.historyMinBurstBytes = Math.min(
            this.historyBurstMaxBytes,
            normalizePositiveNumber(historyMinBurstBytes, 1024)
        );
        this.historyEwmaAlpha = Math.min(1, Math.max(0.01, normalizePositiveNumber(historyEwmaAlpha, 0.25)));
        this._slots = new WeakMap();
        this._activeSockets = new Set();
        this._timers = new Set();
        this._backpressured = new WeakMap();
        // History pages are a lower-priority producer than both live surface
        // snapshots and control/action envelopes.  Keep a small amount of
        // send-state here so the history pump can make that decision before
        // it creates the next frame.  This is intentionally internal; it
        // does not add a wire field or change IPC authority.
        this._controlPending = new WeakMap();
        this._liveInFlight = new WeakMap();
        this._historyInFlight = new WeakMap();
        // ACK observations come from the static-history service. They never
        // influence live/control scheduling; they only select the size of a
        // future lower-priority history fragment.
        this._historyGoodput = new WeakMap();
        // Android surface projection is derived work that may still be
        // running before a snapshot can enter the normal coalescing slot.
        // Keep an internal per-conversation marker so history cannot pass
        // through that gap. This is scheduler-local state only.
        this._liveProjectionPending = new WeakMap();
        this._closeListeners = new WeakMap();
        this._stats = {
            offered: 0,
            sent: 0,
            coalesced: 0,
            dropped: 0,
            oversizedDropped: 0,
            controlSent: 0,
            historySent: 0,
            closedForBackpressure: 0
        };
    }

    offer(ws, conversationId, envelope, options = {}) {
        if (!ws || typeof conversationId !== 'string' || !conversationId) return false;
        if (ws.readyState !== 1) {
            this.dispose(ws);
            return false;
        }
        const slots = this._ensureSocket(ws);
        const previous = slots.get(conversationId);
        if (previous) {
            this._clearSlotTimer(previous);
            this._stats.coalesced += 1;
        }
        const slot = {
            envelope,
            priority: options.priority === 'terminal' ? 'terminal' : 'normal',
            offeredAt: this.now(),
            timer: null,
            hardLimitSince: previous?.hardLimitSince || null,
            selectionGeneration: options.selectionGeneration ?? 0
        };
        slots.set(conversationId, slot);
        this._stats.offered += 1;
        if (slot.priority === 'terminal') {
            this.flush(ws);
        } else {
            slot.timer = this._schedule(() => this.flush(ws), this.intervalMs);
        }
        return true;
    }

    cancel(ws, conversationId) {
        const slots = this._slots.get(ws);
        const slot = slots?.get(conversationId);
        if (!slot) return false;
        this._clearSlotTimer(slot);
        slots.delete(conversationId);
        if (slots.size === 0) this._activeSockets.delete(ws);
        this._stats.dropped += 1;
        return true;
    }

    flush(ws) {
        if (!ws) return;
        if (ws.readyState !== 1) {
            this.dispose(ws);
            return;
        }
        const slots = this._slots.get(ws);
        if (!slots) return;
        for (const [conversationId, slot] of Array.from(slots.entries())) {
            this._clearSlotTimer(slot);
            this._flushSlot(ws, conversationId, slot);
        }
    }

    sendControl(ws, envelope) {
        if (!ws || ws.readyState !== 1) return false;
        const serialized = this.serialize(envelope);
        if (Buffer.byteLength(serialized, 'utf8') > MAX_WS_ENVELOPE_BYTES) return false;
        this._incrementPending(this._controlPending, ws);
        const clearPending = () => this._decrementPending(this._controlPending, ws);
        try {
            // The callback is the ws library's hand-off boundary.  Until it
            // fires, history must yield to this control frame.  Fake/test
            // sockets may invoke it synchronously, which is also safe.
            ws.send(serialized, clearPending);
            this._stats.controlSent += 1;
            return true;
        } catch (_) {
            clearPending();
            return false;
        }
    }

    sendHistory(ws, envelope) {
        if (!ws || ws.readyState !== 1 || !this.canSendHistory(ws)) return false;
        let serialized;
        try {
            serialized = this.serialize(envelope);
        } catch (_) {
            return false;
        }
        if (Buffer.byteLength(serialized, 'utf8') > MAX_WS_ENVELOPE_BYTES) {
            this._stats.oversizedDropped += 1;
            try {
                this.onOversize?.(ws, envelope);
            } catch (_) {
                // A bounded history diagnostic must never break the scheduler.
            }
            return false;
        }
        this._incrementPending(this._historyInFlight, ws);
        const clearInFlight = () => this._decrementPending(this._historyInFlight, ws);
        try {
            // History is intentionally a lower-priority wire hand-off.  One
            // frame may be in the ws queue, but the next frame must wait for
            // its callback and for any live/control work to settle.
            ws.send(serialized, () => {
                clearInFlight();
                this._stats.historySent += 1;
            });
            return true;
        } catch (_) {
            clearInFlight();
            return false;
        }
    }

    markLiveProjectionPending(ws, conversationId) {
        if (!ws || ws.readyState !== 1 || typeof conversationId !== 'string' || !conversationId) {
            return false;
        }
        let pending = this._liveProjectionPending.get(ws);
        if (!pending) {
            pending = new Set();
            this._liveProjectionPending.set(ws, pending);
        }
        pending.add(conversationId);
        return true;
    }

    clearLiveProjectionPending(ws, conversationId) {
        if (!ws || typeof conversationId !== 'string' || !conversationId) return false;
        const pending = this._liveProjectionPending.get(ws);
        if (!pending || !pending.delete(conversationId)) return false;
        if (pending.size === 0) this._liveProjectionPending.delete(ws);
        return true;
    }

    /**
     * Return whether a live/control frame is pending for this socket.
     * History callers use this as a generation-local scheduling gate; it is
     * not a second transport authority and never queues history itself.
     */
    hasPendingHigherPriority(ws) {
        if (!ws || ws.readyState !== 1) return false;
        if ((this._controlPending.get(ws) || 0) > 0 || (this._liveInFlight.get(ws) || 0) > 0) {
            return true;
        }
        if ((this._liveProjectionPending.get(ws)?.size || 0) > 0) return true;
        const slots = this._slots.get(ws);
        return Boolean(slots && slots.size > 0);
    }

    canSendHistory(ws) {
        return Boolean(
            ws &&
            ws.readyState === 1 &&
            (this._historyInFlight.get(ws) || 0) === 0 &&
            !this.hasPendingHigherPriority(ws)
        );
    }

    /**
     * Feed back one logical history segment ACK. `elapsedMs` is deliberately
     * end-to-end from segment-start handoff to Android's atomic ACK, so the
     * EWMA includes receiver/SQLite work as well as WebSocket delivery.
     */
    recordHistoryAck(ws, { bytes, elapsedMs } = {}) {
        const byteCount = Number(bytes);
        const elapsed = Number(elapsedMs);
        if (!ws || !Number.isFinite(byteCount) || byteCount <= 0 || !Number.isFinite(elapsed) || elapsed <= 0) {
            return null;
        }
        const sampleBytesPerMs = byteCount / elapsed;
        const previous = this._historyGoodput.get(ws);
        const ewmaBytesPerMs = previous
            ? previous.ewmaBytesPerMs * (1 - this.historyEwmaAlpha) + sampleBytesPerMs * this.historyEwmaAlpha
            : sampleBytesPerMs;
        const observation = {
            ewmaBytesPerMs,
            observedAt: this.now(),
            sampleBytes: byteCount,
            sampleElapsedMs: elapsed
        };
        this._historyGoodput.set(ws, observation);
        return { ...observation };
    }

    /**
     * The safe history credit is 70% of observed goodput for a 100ms window,
     * bounded by the configured logical fragment cap. With no sample, retain
     * the protocol's conservative configured cap rather than delaying first
     * history indefinitely.
     */
    getHistoryByteCredit(ws, preferredBytes = this.historyBurstMaxBytes) {
        const preferred = Math.max(1, Math.min(this.historyBurstMaxBytes, Number(preferredBytes) || this.historyBurstMaxBytes));
        const observation = this._historyGoodput.get(ws);
        if (!observation || !Number.isFinite(observation.ewmaBytesPerMs) || observation.ewmaBytesPerMs <= 0) {
            return preferred;
        }
        const safeBytes = Math.floor(observation.ewmaBytesPerMs * this.historyMaxBlockingMs * 0.7);
        return Math.max(this.historyMinBurstBytes, Math.min(preferred, safeBytes));
    }

    dispose(ws) {
        const slots = this._slots.get(ws);
        if (slots) {
            for (const slot of slots.values()) this._clearSlotTimer(slot);
            slots.clear();
        }
        this._activeSockets.delete(ws);
        this._backpressured.delete(ws);
        this._controlPending.delete(ws);
        this._liveInFlight.delete(ws);
        this._historyInFlight.delete(ws);
        this._historyGoodput.delete(ws);
        this._liveProjectionPending.delete(ws);
        const listener = this._closeListeners.get(ws);
        if (listener && typeof ws.removeListener === 'function') ws.removeListener('close', listener);
        this._closeListeners.delete(ws);
    }

    getStats() {
        let pendingSnapshots = 0;
        let bufferedAmount = 0;
        let maxBufferedAmount = 0;
        for (const ws of this._activeSockets) {
            const slots = this._slots.get(ws);
            pendingSnapshots += slots?.size || 0;
            const buffered = Number(ws.bufferedAmount) || 0;
            bufferedAmount += buffered;
            maxBufferedAmount = Math.max(maxBufferedAmount, buffered);
        }
        return {
            ...this._stats,
            activeSockets: this._activeSockets.size,
            pendingSnapshots,
            activeTimers: this._timers.size,
            bufferedAmount,
            maxBufferedAmount
        };
    }

    _ensureSocket(ws) {
        let slots = this._slots.get(ws);
        if (!slots) {
            slots = new Map();
            this._slots.set(ws, slots);
            this._activeSockets.add(ws);
            if (typeof ws.once === 'function') {
                const closeListener = () => this.dispose(ws);
                this._closeListeners.set(ws, closeListener);
                ws.once('close', closeListener);
            }
        }
        return slots;
    }

    _flushSlot(ws, conversationId, slot) {
        const slots = this._slots.get(ws);
        if (!slots || slots.get(conversationId) !== slot) return;
        if (!this.isStillActive(ws, conversationId, slot.selectionGeneration)) {
            this.cancel(ws, conversationId);
            return;
        }
        const bufferedAmount = Number(ws.bufferedAmount) || 0;
        const now = this.now();
        if (bufferedAmount > this.hardLimitBytes) {
            slot.hardLimitSince ||= now;
            if (now - slot.hardLimitSince > this.hardLimitDurationMs) {
                this._stats.closedForBackpressure += 1;
                this.dispose(ws);
                try { ws.close(1013, 'Codex snapshot backpressure'); } catch (_) { /* best effort */ }
                return;
            }
            slot.timer = this._schedule(() => this.flush(ws), 50);
            return;
        }
        if (bufferedAmount > this.highWaterBytes) {
            this._backpressured.set(ws, true);
            slot.timer = this._schedule(() => this.flush(ws), 50);
            return;
        }
        if (this._backpressured.get(ws)) {
            if (bufferedAmount > this.lowWaterBytes) {
                slot.timer = this._schedule(() => this.flush(ws), 50);
                return;
            }
            this._backpressured.set(ws, false);
        }
        slot.hardLimitSince = null;
        let serialized;
        try {
            serialized = this.serialize(slot.envelope);
        } catch (_) {
            this.cancel(ws, conversationId);
            return;
        }
        if (Buffer.byteLength(serialized, 'utf8') > MAX_WS_ENVELOPE_BYTES) {
            slots.delete(conversationId);
            if (slots.size === 0) this._activeSockets.delete(ws);
            this._stats.oversizedDropped += 1;
            try {
                this.onOversize?.(ws, slot.envelope);
            } catch (_) {
                // An oversize diagnostic must never take down the scheduler.
            }
            return;
        }
        slots.delete(conversationId);
        if (slots.size === 0) this._activeSockets.delete(ws);
        const sentAt = this.now();
        this._incrementPending(this._liveInFlight, ws);
        const clearInFlight = () => this._decrementPending(this._liveInFlight, ws);
        try {
            ws.send(serialized, () => {
                clearInFlight();
                this._stats.sent += 1;
                const pending = this._slots.get(ws)?.get(conversationId);
                if (pending) {
                    const delay = Math.max(0, this.intervalMs - (this.now() - sentAt));
                    pending.timer = this._schedule(() => this.flush(ws), delay);
                }
            });
        } catch (_) {
            clearInFlight();
            this._stats.dropped += 1;
        }
    }

    _incrementPending(map, ws) {
        map.set(ws, (map.get(ws) || 0) + 1);
    }

    _decrementPending(map, ws) {
        const next = (map.get(ws) || 0) - 1;
        if (next > 0) map.set(ws, next);
        else map.delete(ws);
    }

    _schedule(callback, delay) {
        const timer = setTimeout(() => {
            this._timers.delete(timer);
            callback();
        }, delay);
        this._timers.add(timer);
        if (typeof timer.unref === 'function') timer.unref();
        return timer;
    }

    _clearSlotTimer(slot) {
        if (!slot?.timer) return;
        clearTimeout(slot.timer);
        this._timers.delete(slot.timer);
        slot.timer = null;
    }
}

function normalizePositiveNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function projectConversationActionPayload(actionType, pendingAction) {
    const action = pendingAction && typeof pendingAction === 'object' ? pendingAction : {};
    const output = pickFields(action, [
        'kind', 'requestId', 'rawRequestId', 'requestMethod', 'method', 'requestKind', 'turnId',
        'title', 'summary', 'description', 'canSubmit', 'handledBy'
    ]);
    if (actionType === 'plan') {
        copyIfPresent(output, action, 'planContent');
    } else if (actionType === 'user_input') {
        copyIfPresent(output, action, 'responseMode');
        copyIfPresent(output, action, 'questionCount');
        output.questions = normalizeQuestions(action.params?.questions || action.questions);
    } else if (actionType === 'approval') {
        for (const key of ['approvalType', 'command', 'cwd', 'reason', 'paths', 'changes', 'availableDecisions', 'proposedExecpolicyAmendment']) {
            if (key === 'changes') {
                output.changes = normalizeVisibleList(action.changes || action.params?.changes, ['path', 'summary']);
            } else if (key === 'proposedExecpolicyAmendment') {
                const amendment = action.proposedExecpolicyAmendment || action.params?.proposedExecpolicyAmendment;
                if (amendment) output.proposedExecpolicyAmendment = pickFields(amendment, ['mode', 'summary', 'description']);
            } else if (key === 'availableDecisions') {
                if (Array.isArray(action.availableDecisions)) output.availableDecisions = action.availableDecisions.slice();
            } else if (key === 'paths') {
                if (Array.isArray(action.paths)) output.paths = action.paths.map((value) => clipVisibleText(value));
            } else copyIfPresent(output, action, key);
        }
    } else if (actionType === 'goal') {
        for (const key of ['objective', 'status', 'allowedActions']) copyIfPresent(output, action, key);
    }
    return output;
}

function normalizeQuestions(value) {
    if (!Array.isArray(value)) return [];
    return value.map((question) => {
        const item = question && typeof question === 'object' ? question : {};
        return pickFields(item, ['id', 'header', 'question', 'isOther', 'isSecret', 'options'], {
            options: normalizeVisibleList(item.options, ['label', 'description', 'value'])
        });
    });
}

function normalizeVisibleList(value, fields) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => {
        if (typeof entry === 'string') return clipVisibleText(entry);
        return pickFields(entry && typeof entry === 'object' ? entry : {}, fields);
    });
}

function pickFields(source, fields, overrides = {}) {
    const output = { ...overrides };
    for (const field of fields) {
        if (source[field] !== undefined) output[field] = field === 'requestId' || field === 'rawRequestId'
            ? source[field]
            : clipValue(source[field]);
    }
    return output;
}

function copyIfPresent(target, source, key) {
    if (source[key] !== undefined) target[key] = clipValue(source[key]);
}

function clipValue(value) {
    if (typeof value === 'string') return clipVisibleText(value);
    if (Array.isArray(value)) return value.slice();
    return value;
}

function clipVisibleText(value, maxLength = 12_000) {
    const text = String(value ?? '');
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

module.exports = {
    CodexWsSnapshotScheduler,
    MAX_WS_ENVELOPE_BYTES,
    MAX_CONTROL_ENVELOPE_BYTES,
    projectConversationActionPayload
};
