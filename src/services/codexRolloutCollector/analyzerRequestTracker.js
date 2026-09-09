'use strict';

const TRACKED_PHASES = Object.freeze(['hello', 'analyze', 'complete']);
const TRACKED_PHASE_SET = new Set(TRACKED_PHASES);

function createTrackerError(code, message, { retryable = undefined, details = undefined } = {}) {
    const error = new Error(message || code);
    error.code = code;
    if (retryable !== undefined) error.retryable = retryable;
    if (details !== undefined) error.details = details;
    return error;
}

function normalizeRequestId(requestId) {
    if (typeof requestId !== 'string' || requestId.trim().length === 0) {
        throw createTrackerError(
            'ANALYZER_REQUEST_ID_INVALID',
            `analyzer request id must be a non-empty string: ${requestId}`
        );
    }
    return requestId;
}

function normalizeGeneration(generation) {
    if (generation === undefined || generation === null) return null;
    if (!Number.isSafeInteger(generation) || generation < 0) {
        throw createTrackerError(
            'ANALYZER_GENERATION_INVALID',
            `analyzer generation must be a non-negative safe integer: ${generation}`
        );
    }
    return generation;
}

function normalizeAttempt(attempt) {
    if (attempt === undefined || attempt === null) return null;
    if (Number.isSafeInteger(attempt) && attempt >= 0) return attempt;
    if (typeof attempt === 'string' && attempt.trim().length > 0) return attempt;
    throw createTrackerError(
        'ANALYZER_ATTEMPT_INVALID',
        `analyzer attempt must be a non-negative safe integer or non-empty string: ${attempt}`
    );
}

function normalizeScope(options = {}) {
    if (options === null || typeof options !== 'object') {
        throw createTrackerError(
            'ANALYZER_SCOPE_INVALID',
            'analyzer request scope must be an object'
        );
    }
    const attempt = options.attempt !== undefined
        ? options.attempt
        : (options.attempt_id !== undefined ? options.attempt_id : options.attemptId);
    return {
        generation: normalizeGeneration(options.generation),
        attempt: normalizeAttempt(attempt)
    };
}

function normalizeTimeout(timeoutMs, fallback) {
    return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : fallback;
}

function normalizePhase(phase) {
    if (!TRACKED_PHASE_SET.has(phase)) {
        throw createTrackerError(
            'ANALYZER_PHASE_INVALID',
            `analyzer request phase must be one of ${TRACKED_PHASES.join(', ')}: ${phase}`
        );
    }
    return phase;
}

function normalizeError(error, fallbackCode = 'ANALYZER_REQUEST_FAILED') {
    if (error instanceof Error) return error;
    return createTrackerError(fallbackCode, String(error));
}

class AnalyzerRequestTracker {
    constructor({
        defaultTimeoutMs = 120000,
        setTimeoutFn = setTimeout,
        clearTimeoutFn = clearTimeout,
        nowFn = Date.now
    } = {}) {
        this.defaultTimeoutMs = normalizeTimeout(defaultTimeoutMs, 120000);
        this.setTimeoutFn = setTimeoutFn;
        this.clearTimeoutFn = clearTimeoutFn;
        this.nowFn = typeof nowFn === 'function' ? nowFn : Date.now;
        this.pending = new Map();
    }

    track(requestId, {
        timeoutMs = this.defaultTimeoutMs,
        phase = 'analyze',
        phaseTimeouts = {},
        generation = null,
        attempt = null,
        attempt_id: attemptId = undefined,
        onTimeout = null,
        onCancel = null,
        onSettled = null
    } = {}) {
        const normalizedRequestId = normalizeRequestId(requestId);
        if (this.pending.has(normalizedRequestId)) {
            throw createTrackerError(
                'ANALYZER_REQUEST_DUPLICATE',
                `analyzer request already active: ${normalizedRequestId}`
            );
        }

        const normalizedPhase = normalizePhase(phase);
        const fallbackTimeout = normalizeTimeout(timeoutMs, this.defaultTimeoutMs);
        const normalizedPhaseTimeouts = {};
        for (const trackedPhase of TRACKED_PHASES) {
            normalizedPhaseTimeouts[trackedPhase] = normalizeTimeout(
                phaseTimeouts?.[trackedPhase],
                fallbackTimeout
            );
        }
        const scope = normalizeScope({
            generation,
            attempt: attempt !== null && attempt !== undefined ? attempt : attemptId
        });

        let resolvePromise;
        let rejectPromise;
        const promise = new Promise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });
        const entry = {
            requestId: normalizedRequestId,
            generation: scope.generation,
            attempt: scope.attempt,
            phase: normalizedPhase,
            phaseTimeouts: normalizedPhaseTimeouts,
            phaseStartedAt: this.nowFn(),
            resolve: resolvePromise,
            reject: rejectPromise,
            timer: null,
            settled: false,
            settlement: null,
            cancelRequested: false,
            cancelReason: null,
            timeoutRequested: false,
            timeoutNotified: false,
            cancelNotified: false,
            settledNotified: false,
            terminated: false,
            onTimeout: typeof onTimeout === 'function' ? onTimeout : null,
            onCancel: typeof onCancel === 'function' ? onCancel : null,
            onSettled: typeof onSettled === 'function' ? onSettled : null
        };

        // Install the entry before arming the timer.  This keeps injected
        // synchronous timers from observing a request that is not trackable.
        this.pending.set(normalizedRequestId, entry);
        try {
            this._armPhaseTimer(entry);
        } catch (error) {
            this.pending.delete(normalizedRequestId);
            rejectPromise(error);
            throw error;
        }
        return promise;
    }

    resolve(requestId, value, scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry || entry.settled || entry.cancelRequested || entry.timeoutRequested) return false;
        return this._settleAndReleaseEntry(entry, 'resolved', value);
    }

    reject(requestId, error, scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry || entry.settled) return false;
        return this._settleAndReleaseEntry(entry, 'rejected', normalizeError(error));
    }

    requestCancel(requestId, reason = 'cancelled_by_caller', scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry || entry.settled || entry.cancelRequested || entry.timeoutRequested) return false;
        const error = createTrackerError(
            'ANALYZER_REQUEST_CANCELLED',
            String(reason),
            {
                retryable: true,
                details: {
                    request_id: entry.requestId,
                    generation: entry.generation,
                    attempt: entry.attempt,
                    phase: entry.phase,
                    reason: String(reason)
                }
            }
        );
        entry.cancelRequested = true;
        entry.cancelReason = String(reason);
        this._settleEntry(entry, 'rejected', error);
        if (!entry.cancelNotified) {
            entry.cancelNotified = true;
            this._invokeCallback(entry.onCancel, error, entry);
        }
        return true;
    }

    cancel(requestId, reason = 'cancelled_by_caller', scope = {}) {
        return this.requestCancel(requestId, reason, scope);
    }

    requestTimeout(requestId, scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry || entry.settled || entry.cancelRequested || entry.timeoutRequested) return false;
        return this._expireEntry(entry);
    }

    expire(requestId, scope = {}) {
        return this.requestTimeout(requestId, scope);
    }

    setPhase(requestId, phase, {
        timeoutMs = undefined,
        generation = null,
        attempt = null,
        attempt_id: attemptId = undefined
    } = {}) {
        const entry = this._entryForScope(requestId, { generation, attempt: attempt ?? attemptId });
        if (!entry || entry.settled || entry.cancelRequested || entry.timeoutRequested) return false;
        const normalizedPhase = normalizePhase(phase);
        entry.phase = normalizedPhase;
        entry.phaseStartedAt = this.nowFn();
        if (timeoutMs !== undefined) {
            entry.phaseTimeouts[normalizedPhase] = normalizeTimeout(
                timeoutMs,
                entry.phaseTimeouts[normalizedPhase]
            );
        }
        this._armPhaseTimer(entry);
        return true;
    }

    advancePhase(requestId, phase, options = {}) {
        return this.setPhase(requestId, phase, options);
    }

    matches(requestId, scope = {}) {
        return Boolean(this._entryForScope(requestId, scope));
    }

    get(requestId) {
        const entry = this.pending.get(requestId);
        return entry ? this._snapshot(entry) : null;
    }

    markTerminated(requestId, scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry) return false;
        if (!entry.settled) {
            this._settleEntry(
                entry,
                'rejected',
                createTrackerError(
                    'ANALYZER_WORKER_TERMINATED',
                    'analyzer worker terminated before request settlement',
                    { retryable: true, details: this._scopeDetails(entry) }
                )
            );
        }
        this._removeEntry(entry);
        return true;
    }

    terminate(requestId, reason = null, scope = {}) {
        const entry = this._entryForScope(requestId, scope);
        if (!entry) return false;
        if (!entry.settled) {
            this._settleEntry(
                entry,
                'rejected',
                normalizeError(
                    reason || createTrackerError(
                        'ANALYZER_WORKER_TERMINATED',
                        'analyzer worker terminated before request settlement',
                        { retryable: true, details: this._scopeDetails(entry) }
                    )
                )
            );
        }
        this._removeEntry(entry);
        return true;
    }

    rejectAll(error = createTrackerError('ANALYZER_PROCESS_STOPPED', 'analyzer process stopped')) {
        const entries = [...this.pending.values()];
        const normalizedError = normalizeError(error);
        for (const entry of entries) {
            if (!entry.settled) this._settleEntry(entry, 'rejected', normalizedError);
            this._removeEntry(entry);
        }
        return entries.length;
    }

    has(requestId) {
        return this.pending.has(requestId);
    }

    get size() {
        // Settled requests that still await worker termination intentionally
        // remain counted: they continue to occupy the single-flight slot.
        return this.pending.size;
    }

    _entryForScope(requestId, scope) {
        const entry = this.pending.get(requestId);
        if (!entry) return null;
        const normalizedScope = normalizeScope(scope);
        if (entry.generation !== normalizedScope.generation
            || entry.attempt !== normalizedScope.attempt) {
            return null;
        }
        return entry;
    }

    _armPhaseTimer(entry) {
        this._clearTimer(entry);
        const timeoutMs = entry.phaseTimeouts[entry.phase];
        entry.timer = this.setTimeoutFn(() => this._expireEntry(entry), timeoutMs);
        if (typeof entry.timer?.unref === 'function') entry.timer.unref();
    }

    _clearTimer(entry) {
        if (entry.timer === null || entry.timer === undefined) return;
        this.clearTimeoutFn(entry.timer);
        entry.timer = null;
    }

    _expireEntry(entry) {
        if (this.pending.get(entry.requestId) !== entry
            || entry.settled
            || entry.cancelRequested
            || entry.timeoutRequested) {
            return false;
        }
        entry.timeoutRequested = true;
        const error = createTrackerError(
            'ANALYZER_REQUEST_TIMEOUT',
            `analyzer ${entry.phase} phase timed out: ${entry.requestId}`,
            {
                retryable: true,
                details: {
                    request_id: entry.requestId,
                    generation: entry.generation,
                    attempt: entry.attempt,
                    phase: entry.phase,
                    timeout_ms: entry.phaseTimeouts[entry.phase]
                }
            }
        );
        this._settleEntry(entry, 'rejected', error);
        if (!entry.timeoutNotified) {
            entry.timeoutNotified = true;
            this._invokeCallback(entry.onTimeout, error, entry);
        }
        return true;
    }

    _settleEntry(entry, kind, value) {
        if (entry.settled || this.pending.get(entry.requestId) !== entry) return false;
        entry.settled = true;
        entry.settlement = {
            kind,
            phase: entry.phase,
            at: this.nowFn()
        };
        this._clearTimer(entry);
        if (kind === 'resolved') entry.resolve(value);
        else entry.reject(value);
        if (!entry.settledNotified) {
            entry.settledNotified = true;
            this._invokeCallback(entry.onSettled, this._snapshot(entry), entry);
        }
        return true;
    }

    _settleAndReleaseEntry(entry, kind, value) {
        const settled = this._settleEntry(entry, kind, value);
        if (settled) this._removeEntry(entry);
        return settled;
    }

    _removeEntry(entry) {
        this._clearTimer(entry);
        entry.terminated = true;
        if (this.pending.get(entry.requestId) === entry) this.pending.delete(entry.requestId);
    }

    _scopeDetails(entry) {
        return {
            request_id: entry.requestId,
            generation: entry.generation,
            attempt: entry.attempt,
            phase: entry.phase
        };
    }

    _snapshot(entry) {
        return {
            request_id: entry.requestId,
            generation: entry.generation,
            attempt: entry.attempt,
            phase: entry.phase,
            phase_started_at: entry.phaseStartedAt,
            settled: entry.settled,
            settlement: entry.settlement ? { ...entry.settlement } : null,
            cancel_requested: entry.cancelRequested,
            cancel_reason: entry.cancelReason,
            timeout_requested: entry.timeoutRequested,
            termination_waiting: !entry.terminated,
            timer_active: entry.timer !== null && entry.timer !== undefined
        };
    }

    _invokeCallback(callback, value, entry) {
        if (typeof callback !== 'function') return;
        try {
            callback(value, this._snapshot(entry));
        } catch (_) {
            // Callback failures must not change the authoritative request
            // settlement or release the active slot early.
        }
    }
}

module.exports = {
    AnalyzerRequestTracker,
    TRACKED_PHASES
};
