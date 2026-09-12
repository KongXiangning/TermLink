'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { ANALYZE_MODES } = require('./analyzerProtocol');

const RUN_STATUSES = Object.freeze([
    'queued',
    'running',
    'ack_pending',
    'retry_wait',
    'cancel_requested',
    'completed',
    'failed'
]);

const LEGACY_RUN_FIELDS = Object.freeze([
    'source_spec',
    'sourceSpec',
    'replay',
    'retention_profile',
    'retentionProfile',
    'discovery',
    'revision'
]);

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function stripLegacyRunFields(value) {
    const sanitized = clone(value);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
        return sanitized;
    }
    for (const field of LEGACY_RUN_FIELDS) delete sanitized[field];
    return sanitized;
}

function sanitizeRunArtifact(value) {
    const sanitized = stripLegacyRunFields(value);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
        return sanitized;
    }

    if (sanitized.source && typeof sanitized.source === 'object'
        && !Array.isArray(sanitized.source)) {
        sanitized.source = stripLegacyRunFields(sanitized.source);
    }
    for (const field of ['checkpoint', 'canonical_checkpoint', 'partial_recovery_checkpoint']) {
        if (sanitized[field] && typeof sanitized[field] === 'object'
            && !Array.isArray(sanitized[field])) {
            sanitized[field] = sanitizeRunArtifact(sanitized[field]);
        }
    }
    return sanitized;
}

function sanitizeRunRecord(value) {
    const sanitized = sanitizeRunArtifact(value);
    if (sanitized && sanitized.result && typeof sanitized.result === 'object'
        && !Array.isArray(sanitized.result)) {
        sanitized.result = sanitizeRunArtifact(sanitized.result);
    }
    return sanitized;
}

function hasOwn(value, key) {
    return Boolean(value && typeof value === 'object'
        && Object.prototype.hasOwnProperty.call(value, key));
}

function firstPresent(value, keys) {
    for (const key of keys) {
        if (hasOwn(value, key) && value[key] !== undefined) return value[key];
    }
    return undefined;
}

function requiredString(value, field) {
    if (typeof value !== 'string' || !value.trim()) {
        throw runError('ANALYSIS_RUN_INVALID', `${field} must be a non-empty string`);
    }
    return value.trim();
}

function optionalString(value, field) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || !value.trim()) {
        throw runError('ANALYSIS_RUN_INVALID', `${field} must be a non-empty string or null`);
    }
    return value.trim();
}

function nonNegativeInteger(value, field, fallback = 0) {
    const resolved = value === undefined || value === null ? fallback : value;
    if (!Number.isSafeInteger(resolved) || resolved < 0) {
        throw runError('ANALYSIS_RUN_INVALID', `${field} must be a non-negative integer`);
    }
    return resolved;
}

function normalizeMode(value) {
    if (!ANALYZE_MODES.includes(value)) {
        throw runError('ANALYSIS_RUN_INVALID', `unsupported analysis mode: ${value}`);
    }
    return value;
}

function normalizeStatus(value) {
    const status = value === undefined || value === null ? 'running' : value;
    if (!RUN_STATUSES.includes(status)) {
        throw runError('ANALYSIS_RUN_INVALID', `unsupported analysis run status: ${status}`);
    }
    return status;
}

function parseRunInput(run) {
    if (!run || typeof run !== 'object' || Array.isArray(run)) {
        throw runError('ANALYSIS_RUN_INVALID', 'run must be an object');
    }
    const source = run.source && typeof run.source === 'object' ? run.source : {};
    const runId = requiredString(firstPresent(run, ['run_id', 'runId']), 'run_id');
    const conversationId = requiredString(
        firstPresent(run, ['conversation_id', 'conversationId']),
        'conversation_id'
    );
    const rawJobId = firstPresent(run, ['job_id', 'jobId']);
    const rawRequestId = firstPresent(run, ['request_id', 'requestId']);
    const rawSourceId = firstPresent(run, ['source_id', 'sourceId']);
    const rawSourceEpoch = firstPresent(run, ['source_epoch', 'sourceEpoch']);
    const sourceId = optionalString(
        rawSourceId === undefined ? source.source_id : rawSourceId,
        'source_id'
    );
    const sourceEpoch = optionalString(
        rawSourceEpoch === undefined ? source.source_epoch : rawSourceEpoch,
        'source_epoch'
    );
    if ((sourceId === null) !== (sourceEpoch === null)) {
        throw runError(
            'ANALYSIS_RUN_SCOPE_INVALID',
            'source_id and source_epoch must be provided together'
        );
    }
    if (sourceEpoch === 'unbound') {
        throw runError('ANALYSIS_RUN_SCOPE_INVALID', 'source_epoch must be bound');
    }

    const rawMode = firstPresent(run, ['mode']);
    const modeProvided = rawMode !== undefined && rawMode !== null;
    const mode = modeProvided ? normalizeMode(rawMode) : 'preview';
    const rawJob = rawJobId === undefined ? null : rawJobId;
    const jobId = optionalString(rawJob, 'job_id');
    const requestId = optionalString(
        rawRequestId === undefined || rawRequestId === null ? runId : rawRequestId,
        'request_id'
    );

    return {
        runId,
        jobId,
        conversationId,
        sourceId,
        sourceEpoch,
        requestId,
        requestProvided: rawRequestId !== undefined && rawRequestId !== null,
        mode,
        modeProvided,
        jobProvided: rawJobId !== undefined && rawJobId !== null,
        sourceProvided: rawSourceId !== undefined
            || rawSourceEpoch !== undefined
            || source.source_id !== undefined
            || source.source_epoch !== undefined,
        attempt: nonNegativeInteger(
            firstPresent(run, ['attempt']),
            'attempt'
        ),
        retryBudget: nonNegativeInteger(
            firstPresent(run, ['retry_budget', 'retryBudget']),
            'retry_budget'
        ),
        retryCount: nonNegativeInteger(
            firstPresent(run, ['retry_count', 'retryCount']),
            'retry_count'
        ),
        processGeneration: nonNegativeInteger(
            firstPresent(run, ['process_generation', 'processGeneration', 'generation']),
            'process_generation'
        )
    };
}

function normalizeRunRecord(value, now = Date.now) {
    const sanitized = sanitizeRunRecord(value);
    const input = parseRunInput(sanitized);
    const status = normalizeStatus(sanitized.status);
    return {
        ...clone(sanitized),
        run_id: input.runId,
        job_id: input.jobId,
        conversation_id: input.conversationId,
        source_id: input.sourceId,
        source_epoch: input.sourceEpoch,
        request_id: input.requestId,
        mode: input.mode,
        status,
        attempt: input.attempt,
        retry_budget: input.retryBudget,
        retry_count: input.retryCount,
        process_generation: input.processGeneration,
        started_at: sanitized.started_at ?? now(),
        updated_at: sanitized.updated_at ?? now(),
        completed_at: sanitized.completed_at ?? null,
        batches: nonNegativeInteger(sanitized.batches, 'batches'),
        receipt_count: nonNegativeInteger(sanitized.receipt_count, 'receipt_count'),
        last_batch_id: optionalString(sanitized.last_batch_id, 'last_batch_id'),
        last_segment_id: optionalString(sanitized.last_segment_id, 'last_segment_id'),
        checkpoint: sanitized.checkpoint === undefined ? null : clone(sanitized.checkpoint),
        canonical_checkpoint: sanitized.canonical_checkpoint === undefined
            ? null
            : clone(sanitized.canonical_checkpoint),
        partial_recovery_checkpoint: sanitized.partial_recovery_checkpoint === undefined
            ? null
            : clone(sanitized.partial_recovery_checkpoint),
        recovery_delivery: sanitized.recovery_delivery === undefined
            ? null
            : clone(sanitized.recovery_delivery),
        receipt: sanitized.receipt === undefined ? null : clone(sanitized.receipt),
        last_error: sanitized.last_error === undefined ? null : clone(sanitized.last_error),
        error: sanitized.error === undefined ? null : clone(sanitized.error),
        retryable: sanitized.retryable === true,
        result: sanitized.result === undefined ? null : clone(sanitized.result),
        deadline: sanitized.deadline === undefined ? null : clone(sanitized.deadline),
        cancel_requested_at: sanitized.cancel_requested_at === undefined
            ? null
            : clone(sanitized.cancel_requested_at)
    };
}

function canonicalizePatch(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw runError('ANALYSIS_RUN_INVALID', 'run patch must be an object');
    }
    const value = clone(patch);
    const aliases = {
        runId: 'run_id',
        jobId: 'job_id',
        conversationId: 'conversation_id',
        sourceId: 'source_id',
        sourceEpoch: 'source_epoch',
        requestId: 'request_id',
        retryBudget: 'retry_budget',
        retryCount: 'retry_count',
        processGeneration: 'process_generation',
        generation: 'process_generation',
        lastBatchId: 'last_batch_id',
        lastSegmentId: 'last_segment_id',
        receiptCount: 'receipt_count',
        canonicalCheckpoint: 'canonical_checkpoint',
        partialRecoveryCheckpoint: 'partial_recovery_checkpoint',
        recoveryDelivery: 'recovery_delivery',
        cancelRequestedAt: 'cancel_requested_at'
    };
    for (const [alias, canonical] of Object.entries(aliases)) {
        if (hasOwn(value, alias) && !hasOwn(value, canonical)) value[canonical] = value[alias];
        delete value[alias];
    }
    return value;
}

function assertPatchIdentity(current, patch) {
    const candidate = canonicalizePatch(patch);
    if (hasOwn(candidate, 'run_id')
        && candidate.run_id !== undefined
        && requiredString(candidate.run_id, 'run_id') !== current.run_id) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'run_id cannot change');
    }
    assertImmutableField(current, candidate, 'conversation_id');
    assertImmutableField(current, candidate, 'mode');
    assertOptionalImmutableField(current, candidate, 'job_id');
    assertOptionalImmutableField(current, candidate, 'source_id');
    assertOptionalImmutableField(current, candidate, 'source_epoch');
    const requestId = hasOwn(candidate, 'request_id') && candidate.request_id !== undefined
        ? requiredString(candidate.request_id, 'request_id')
        : current.request_id;
    const attempt = hasOwn(candidate, 'attempt')
        ? nonNegativeInteger(candidate.attempt, 'attempt', current.attempt)
        : current.attempt;
    const processGeneration = hasOwn(candidate, 'process_generation')
        ? nonNegativeInteger(
            candidate.process_generation,
            'process_generation',
            current.process_generation
        )
        : current.process_generation;
    assertRequestIdentityProgression(current, requestId, attempt, processGeneration);
    if (hasOwn(candidate, 'request_id')) candidate.request_id = requestId;
    return candidate;
}

function assertImmutableField(current, patch, field) {
    if (!hasOwn(patch, field) || patch[field] === undefined) return;
    if (requiredString(patch[field], field) !== current[field]) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', `${field} cannot change`);
    }
}

function assertOptionalImmutableField(current, patch, field) {
    if (!hasOwn(patch, field) || patch[field] === undefined) return;
    const candidate = optionalString(patch[field], field);
    if (candidate === null) {
        if (current[field] !== null) {
            throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', `${field} cannot be cleared`);
        }
        return;
    }
    if (current[field] !== null && candidate !== current[field]) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', `${field} cannot change`);
    }
}

function assertRequestIdentityProgression(current, requestId, attempt, processGeneration) {
    const advancesAttempt = attempt > current.attempt;
    const advancesGeneration = processGeneration > current.process_generation;
    if (requestId === current.request_id) {
        if (advancesAttempt || advancesGeneration) {
            throw runError(
                'ANALYSIS_RUN_SCOPE_MISMATCH',
                'attempt/process_generation advance requires a new request_id'
            );
        }
        return;
    }

    if (attempt < current.attempt
        || processGeneration < current.process_generation
        || (!advancesAttempt && !advancesGeneration)) {
        throw runError(
            'ANALYSIS_RUN_SCOPE_MISMATCH',
            'request_id does not match the current attempt/process_generation'
        );
    }
}

function assertTerminalIdentity(current, identity) {
    if (identity === undefined || identity === null) return;
    if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
        throw runError('ANALYSIS_RUN_INVALID', 'terminal identity must be an object');
    }
    const candidate = canonicalizePatch(identity);
    for (const field of ['request_id', 'attempt', 'process_generation']) {
        if (!hasOwn(candidate, field) || candidate[field] === undefined) {
            throw runError(
                'ANALYSIS_RUN_INVALID',
                `terminal identity requires ${field}`
            );
        }
    }
    const requestId = requiredString(candidate.request_id, 'request_id');
    const attempt = nonNegativeInteger(candidate.attempt, 'attempt');
    const processGeneration = nonNegativeInteger(
        candidate.process_generation,
        'process_generation'
    );
    assertRequestIdentityProgression(current, requestId, attempt, processGeneration);
}

function assertBeginIdentity(current, input) {
    if (input.conversationId !== current.conversation_id) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'conversation_id does not match run');
    }
    if (input.modeProvided && input.mode !== current.mode) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'mode does not match run');
    }
    if (input.jobProvided && input.jobId !== current.job_id
        && current.job_id !== null) {
        throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'job_id does not match run');
    }
    if (input.sourceProvided) {
        if (current.source_id !== null
            && (input.sourceId !== current.source_id || input.sourceEpoch !== current.source_epoch)) {
            throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'source scope does not match run');
        }
    }
    if (input.requestProvided) {
        if (current.status === 'queued' && current.process_generation === 0
            && input.requestId === current.request_id && input.attempt === current.attempt) return;
        assertRequestIdentityProgression(
            current,
            input.requestId,
            input.attempt,
            input.processGeneration
        );
    }
}

function assertStatusTransition(current) {
    if (current.status === 'completed') {
        throw runError(
            'ANALYSIS_RUN_TERMINAL',
            'completed analysis run cannot be updated'
        );
    }
    if (current.status === 'failed') {
        throw runError(
            'ANALYSIS_RUN_TERMINAL',
            'failed analysis run requires a new request attempt'
        );
    }
}

function serializeError(error) {
    const value = {
        code: error?.code || 'ANALYZER_FAILED',
        message: error?.message || String(error)
    };
    if (typeof error?.retryable === 'boolean') value.retryable = error.retryable;
    if (typeof error?.fatal === 'boolean') value.fatal = error.fatal;
    if (error?.details !== undefined) value.details = clone(error.details);
    return value;
}

function runError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

async function atomicWriteJson(target, value) {
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temporary = path.join(
        path.dirname(target),
        `.${path.basename(target)}.${process.pid}.${crypto.randomUUID()}.tmp`
    );
    const handle = await fs.promises.open(temporary, 'wx');
    try {
        await handle.writeFile(JSON.stringify(value));
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await fs.promises.rename(temporary, target);
    } catch (error) {
        await fs.promises.unlink(temporary).catch(() => {});
        throw error;
    }
}

function runFileKey(runId) {
    const value = String(runId || '').trim();
    if (!value) throw runError('ANALYSIS_RUN_INVALID', 'runId is required');
    return crypto.createHash('sha256').update(value).digest('hex');
}

class KeyedMutationQueue {
    constructor() {
        this.tails = new Map();
    }

    async wait(key) {
        const tail = this.tails.get(key);
        if (tail) await tail;
    }

    run(key, operation) {
        const previous = this.tails.get(key) || Promise.resolve();
        const result = previous.then(
            () => operation(),
            () => operation()
        );
        const tail = result.catch(() => {});
        this.tails.set(key, tail);
        return result.finally(() => {
            if (this.tails.get(key) === tail) this.tails.delete(key);
        });
    }
}

function runMutationKey(runId) {
    return `run:${String(runId || '').trim()}`;
}

const MONOTONIC_RUN_FIELDS = Object.freeze([
    'attempt',
    'retry_budget',
    'retry_count',
    'process_generation',
    'batches',
    'receipt_count'
]);

function preserveMonotonicRunProgress(current, value, patch) {
    for (const field of MONOTONIC_RUN_FIELDS) {
        if (hasOwn(patch, field) && value[field] < current[field]) {
            value[field] = current[field];
        }
    }

    // Batch identifiers describe the counter progress.  Do not let a stale
    // callback replace the latest IDs after its absolute counter is rejected.
    if (!hasOwn(patch, 'batches') || value.batches <= current.batches) {
        if (hasOwn(patch, 'last_batch_id')) value.last_batch_id = current.last_batch_id;
        if (hasOwn(patch, 'last_segment_id')) value.last_segment_id = current.last_segment_id;
    }
}

class BaseAnalysisRunStore {
    constructor(now) {
        this.now = typeof now === 'function' ? now : Date.now;
        this.mutations = new KeyedMutationQueue();
    }

    async _readUnlocked(runId) {
        return this._getUnlocked(runId);
    }

    _newRun(run) {
        const input = parseRunInput(run);
        return normalizeRunRecord({
            ...clone(run),
            run_id: input.runId,
            job_id: input.jobId,
            conversation_id: input.conversationId,
            source_id: input.sourceId,
            source_epoch: input.sourceEpoch,
            request_id: input.requestId,
            mode: input.mode,
            status: run.status === 'queued' ? 'queued' : 'running',
            attempt: input.attempt,
            retry_budget: input.retryBudget,
            retry_count: input.retryCount,
            process_generation: input.processGeneration,
            started_at: run.started_at ?? this.now(),
            updated_at: this.now(),
            completed_at: null,
            batches: run.batches ?? 0,
            receipt_count: run.receipt_count ?? 0,
            last_batch_id: run.last_batch_id ?? null,
            last_segment_id: run.last_segment_id ?? null,
            checkpoint: run.checkpoint ?? null,
            canonical_checkpoint: run.canonical_checkpoint ?? null,
            partial_recovery_checkpoint: run.partial_recovery_checkpoint ?? null,
            recovery_delivery: run.recovery_delivery ?? null,
            receipt: run.receipt ?? null,
            last_error: null,
            error: null,
            retryable: false,
            result: null,
            deadline: run.deadline ?? null,
            cancel_requested_at: run.cancel_requested_at ?? null
        }, this.now);
    }

    async enqueue(run) {
        const input = parseRunInput(run);
        return this.mutations.run(runMutationKey(input.runId), async () => {
            const existing = await this._readUnlocked(input.runId);
            if (existing) {
                assertBeginIdentity(existing, input);
                return clone(existing);
            }
            const value = this._newRun({ ...run, status: 'queued' });
            await this._write(value);
            return clone(value);
        });
    }

    async begin(run) {
        const input = parseRunInput(run);
        return this.mutations.run(runMutationKey(input.runId), async () => {
            const existing = await this._readUnlocked(input.runId);
            if (!existing) {
                const value = this._newRun(run);
                await this._write(value);
                return clone(value);
            }

            assertBeginIdentity(existing, input);
            if (existing.status === 'completed') return clone(existing);
            if (existing.status === 'failed' && (!input.requestProvided
                || input.requestId === existing.request_id)) {
                throw runError(
                    'ANALYSIS_RUN_TERMINAL',
                    'failed analysis run requires a new request attempt'
                );
            }

            const now = this.now();
            const value = normalizeRunRecord({
                ...existing,
                job_id: existing.job_id ?? input.jobId,
                source_id: existing.source_id ?? input.sourceId,
                source_epoch: existing.source_epoch ?? input.sourceEpoch,
                request_id: input.requestProvided ? input.requestId : existing.request_id,
                mode: existing.mode,
                status: 'running',
                attempt: Math.max(existing.attempt, input.attempt),
                retry_budget: Math.max(existing.retry_budget, input.retryBudget),
                retry_count: Math.max(existing.retry_count, input.retryCount),
                process_generation: Math.max(existing.process_generation, input.processGeneration),
                completed_at: null,
                updated_at: now,
                last_error: null,
                error: null,
                retryable: false
            }, this.now);
            await this._write(value);
            return clone(value);
        });
    }

    async update(runId, patch) {
        return this.mutations.run(runMutationKey(runId), () => (
            this._updateUnlocked(runId, patch)
        ));
    }

    async _updateUnlocked(runId, patch) {
        const current = await this._readUnlocked(runId);
        if (!current) throw runError('ANALYSIS_RUN_NOT_FOUND', `analysis run not found: ${runId}`);
        const candidatePatch = assertPatchIdentity(current, patch);
        const requestedStatus = hasOwn(candidatePatch, 'status')
            ? normalizeStatus(candidatePatch.status)
            : current.status;
        assertStatusTransition(current, requestedStatus);
        const now = this.now();
        const value = normalizeRunRecord({
            ...current,
            ...candidatePatch,
            status: requestedStatus,
            updated_at: now
        }, this.now);
        preserveMonotonicRunProgress(current, value, candidatePatch);
        await this._write(value);
        return clone(value);
    }

    async complete(runId, result = {}, identity) {
        return this.mutations.run(runMutationKey(runId), async () => {
            const current = await this._readUnlocked(runId);
            if (!current) throw runError('ANALYSIS_RUN_NOT_FOUND', `analysis run not found: ${runId}`);
            assertTerminalIdentity(current, identity);
            if (current.status === 'completed' || current.status === 'failed') return clone(current);
            const resultValue = clone(result);
            const patch = {
                status: 'completed',
                completed_at: this.now(),
                result: resultValue
            };
            if (resultValue && typeof resultValue === 'object'
                && Object.prototype.hasOwnProperty.call(resultValue, 'checkpoint')) {
                patch.checkpoint = clone(resultValue.checkpoint);
                if (resultValue.completeness === 'canonical') {
                    patch.canonical_checkpoint = clone(resultValue.checkpoint);
                } else {
                    patch.partial_recovery_checkpoint = clone(resultValue.checkpoint);
                }
            }
            return this._updateFromCurrent(current, patch);
        });
    }

    async fail(runId, error, identity) {
        return this.mutations.run(runMutationKey(runId), async () => {
            const current = await this._readUnlocked(runId);
            if (!current) throw runError('ANALYSIS_RUN_NOT_FOUND', `analysis run not found: ${runId}`);
            assertTerminalIdentity(current, identity);
            if (current.status === 'completed' || current.status === 'failed') return clone(current);
            const serialized = serializeError(error);
            return this._updateFromCurrent(current, {
                status: 'failed',
                completed_at: this.now(),
                error: serialized,
                last_error: serialized,
                retryable: serialized.retryable === true,
                retry_count: current.retry_count + 1
            });
        });
    }

    async _updateFromCurrent(current, patch) {
        const candidatePatch = assertPatchIdentity(current, patch);
        const requestedStatus = hasOwn(candidatePatch, 'status')
            ? normalizeStatus(candidatePatch.status)
            : current.status;
        assertStatusTransition(current, requestedStatus);
        const value = normalizeRunRecord({
            ...current,
            ...candidatePatch,
            status: requestedStatus,
            updated_at: this.now()
        }, this.now);
        preserveMonotonicRunProgress(current, value, candidatePatch);
        await this._write(value);
        return clone(value);
    }
}

class FileAnalysisRunStore extends BaseAnalysisRunStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-runs'), now = Date.now } = {}) {
        super(now);
        this.rootDir = path.resolve(rootDir);
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    pathFor(runId) {
        return path.join(this.rootDir, `${runFileKey(runId)}.json`);
    }

    async _write(value) {
        await atomicWriteJson(this.pathFor(value.run_id), value);
    }

    async get(runId) {
        await this.mutations.wait(runMutationKey(runId));
        return this._getUnlocked(runId);
    }

    async _getUnlocked(runId) {
        try {
            const bytes = await fs.promises.readFile(this.pathFor(runId));
            return clone(normalizeRunRecord(JSON.parse(bytes.toString('utf8')), this.now));
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async listRecoverable({ limit = 1000 } = {}) {
        const records = [];
        const directory = await fs.promises.opendir(this.rootDir);
        let scanned = 0;
        for await (const entry of directory) {
            if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/.test(entry.name)) continue;
            // Stream old terminal records instead of loading the entire run
            // history; only recoverable jobs consume the recovery capacity.
            if (++scanned % 64 === 0) await new Promise((resolve) => setImmediate(resolve));
            const raw = JSON.parse(await fs.promises.readFile(path.join(this.rootDir, entry.name), 'utf8'));
            const record = normalizeRunRecord(raw, this.now);
            if (entry.name !== `${runFileKey(record.run_id)}.json`) {
                throw runError('ANALYSIS_RUN_SCOPE_MISMATCH', 'run file identity does not match its filename');
            }
            if (!['completed', 'failed'].includes(record.status)) {
                if (records.length >= limit) {
                    throw runError('ANALYSIS_RECOVERY_LIMIT', 'recoverable job limit exceeded');
                }
                records.push(record);
            }
        }
        return records;
    }
}

class MemoryAnalysisRunStore extends BaseAnalysisRunStore {
    constructor({ now = Date.now } = {}) {
        super(now);
        this.values = new Map();
    }

    async _write(value) {
        this.values.set(value.run_id, clone(value));
    }

    async get(runId) {
        await this.mutations.wait(runMutationKey(runId));
        return this._getUnlocked(runId);
    }

    _getUnlocked(runId) {
        const value = this.values.get(String(runId || '').trim());
        return value ? clone(normalizeRunRecord(value, this.now)) : null;
    }

    async listRecoverable({ limit = 1000 } = {}) {
        await Promise.all([...this.mutations.tails.values()]);
        const records = [];
        let scanned = 0;
        for (const record of this.values.values()) {
            if (++scanned % 64 === 0) await new Promise((resolve) => setImmediate(resolve));
            if (['completed', 'failed'].includes(record.status)) continue;
            if (records.length >= limit) {
                throw runError('ANALYSIS_RECOVERY_LIMIT', 'recoverable job limit exceeded');
            }
            records.push(clone(normalizeRunRecord(record, this.now)));
        }
        return records;
    }
}

module.exports = {
    RUN_STATUSES,
    FileAnalysisRunStore,
    MemoryAnalysisRunStore,
    atomicWriteJson,
    runFileKey,
    normalizeRunRecord
};
