'use strict';

const MAX_CONTROL_ENVELOPE_BYTES = 256 * 1024;

class CodexWsSnapshotScheduler {
    constructor({
        intervalMs = 250,
        highWaterBytes = 2 * 1024 * 1024,
        lowWaterBytes = 512 * 1024,
        hardLimitBytes = 8 * 1024 * 1024,
        hardLimitDurationMs = 15_000,
        now = Date.now,
        serialize = JSON.stringify,
        isStillActive
    } = {}) {
        this.intervalMs = intervalMs;
        this.highWaterBytes = highWaterBytes;
        this.lowWaterBytes = lowWaterBytes;
        this.hardLimitBytes = hardLimitBytes;
        this.hardLimitDurationMs = hardLimitDurationMs;
        this.now = now;
        this.serialize = serialize;
        this.isStillActive = typeof isStillActive === 'function' ? isStillActive : () => true;
        this._slots = new WeakMap();
        this._activeSockets = new Set();
        this._timers = new Set();
        this._backpressured = new WeakMap();
        this._closeListeners = new WeakMap();
        this._stats = { offered: 0, sent: 0, coalesced: 0, dropped: 0, controlSent: 0, closedForBackpressure: 0 };
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
        if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTROL_ENVELOPE_BYTES) return false;
        try {
            ws.send(serialized);
            this._stats.controlSent += 1;
            return true;
        } catch (_) {
            return false;
        }
    }

    dispose(ws) {
        const slots = this._slots.get(ws);
        if (slots) {
            for (const slot of slots.values()) this._clearSlotTimer(slot);
            slots.clear();
        }
        this._activeSockets.delete(ws);
        this._backpressured.delete(ws);
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
        slots.delete(conversationId);
        if (slots.size === 0) this._activeSockets.delete(ws);
        const sentAt = this.now();
        try {
            ws.send(serialized, () => {
                this._stats.sent += 1;
                const pending = this._slots.get(ws)?.get(conversationId);
                if (pending) {
                    const delay = Math.max(0, this.intervalMs - (this.now() - sentAt));
                    pending.timer = this._schedule(() => this.flush(ws), delay);
                }
            });
        } catch (_) {
            this._stats.dropped += 1;
        }
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
    MAX_CONTROL_ENVELOPE_BYTES,
    projectConversationActionPayload
};
