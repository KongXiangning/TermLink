'use strict';

class AnalyzerRequestTracker {
    constructor({ defaultTimeoutMs = 120000, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
        this.defaultTimeoutMs = Number.isFinite(defaultTimeoutMs) && defaultTimeoutMs > 0
            ? defaultTimeoutMs
            : 120000;
        this.setTimeoutFn = setTimeoutFn;
        this.clearTimeoutFn = clearTimeoutFn;
        this.pending = new Map();
    }

    track(requestId, { timeoutMs = this.defaultTimeoutMs, onTimeout = null } = {}) {
        if (!requestId || this.pending.has(requestId)) {
            throw new Error(`duplicate or empty analyzer request id: ${requestId}`);
        }
        const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
            ? timeoutMs
            : this.defaultTimeoutMs;
        let resolvePromise;
        let rejectPromise;
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        const timer = this.setTimeoutFn(() => {
            const error = new Error(`analyzer request timed out: ${requestId}`);
            error.code = 'ANALYZER_REQUEST_TIMEOUT';
            if (typeof onTimeout === 'function') {
                try {
                    onTimeout(error);
                } catch (_) {
                    // Timeout rejection remains authoritative even if cleanup
                    // itself fails.
                }
            }
            this.reject(requestId, error);
        }, timeout);
        if (typeof timer?.unref === 'function') timer.unref();
        this.pending.set(requestId, {
            resolve: resolvePromise,
            reject: rejectPromise,
            timer
        });
        return promise;
    }

    resolve(requestId, value) {
        const entry = this.pending.get(requestId);
        if (!entry) return false;
        this.pending.delete(requestId);
        this.clearTimeoutFn(entry.timer);
        entry.resolve(value);
        return true;
    }

    reject(requestId, error) {
        const entry = this.pending.get(requestId);
        if (!entry) return false;
        this.pending.delete(requestId);
        this.clearTimeoutFn(entry.timer);
        entry.reject(error instanceof Error ? error : new Error(String(error)));
        return true;
    }

    cancel(requestId, reason = 'cancelled_by_caller') {
        const error = new Error(String(reason));
        error.code = 'ANALYZER_REQUEST_CANCELLED';
        return this.reject(requestId, error);
    }

    rejectAll(error = new Error('analyzer process stopped')) {
        const ids = [...this.pending.keys()];
        for (const requestId of ids) this.reject(requestId, error);
        return ids.length;
    }

    has(requestId) {
        return this.pending.has(requestId);
    }

    get size() {
        return this.pending.size;
    }
}

module.exports = { AnalyzerRequestTracker };
