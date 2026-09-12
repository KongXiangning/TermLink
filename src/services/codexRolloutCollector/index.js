'use strict';

const { randomUUID } = require('node:crypto');
const { AnalyzerProcessManager } = require('./analyzerProcessManager');
const { AnalyzerProtocolError, validateMessage } = require('./analyzerProtocol');
const {
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore,
    normalizeScope
} = require('./analysisBatchImporter');
const { FileCheckpointStore, MemoryCheckpointStore } = require('./analysisCheckpointStore');
const { FileAnalysisRunStore, MemoryAnalysisRunStore } = require('./analysisRunStore');

class CodexRolloutCollector {
    constructor({
        analyzerPath,
        analyzerArgs = [],
        analyzerCwd = process.cwd(),
        analyzerEnv = {},
        processManager = null,
        importer = null,
        store = null,
        checkpointStore = null,
        runStore = null,
        requestTimeoutMs = 120000,
        processRestartRetries = 1,
        cancelGraceMs = 1000,
        recoveryScanLimit = 1000
    } = {}) {
        this.store = store || new FileAnalysisStore();
        this.checkpointStore = checkpointStore || new FileCheckpointStore();
        this.importer = importer || new AnalysisBatchImporter({
            store: this.store,
            checkpointStore: this.checkpointStore
        });
        this.runStore = runStore || new FileAnalysisRunStore();
        this.processManager = processManager || new AnalyzerProcessManager({
            analyzerPath,
            args: analyzerArgs,
            cwd: analyzerCwd,
            env: analyzerEnv,
            requestTimeoutMs,
            cancelGraceMs
        });
        this.processRestartRetries = Number.isSafeInteger(processRestartRetries)
            && processRestartRetries >= 0
            ? processRestartRetries
            : 1;
        this.initialized = false;
        this.initPromise = null;
        this.initContext = null;
        this.runningIntent = null;
        this.pendingIntents = new Map();
        this.intentsByRequestId = new Map();
        this.enqueueSequence = 0;
        this.stopping = false;
        this.lifecycleGeneration = 0;
        this.stopPromise = null;
        if (!Number.isSafeInteger(recoveryScanLimit) || recoveryScanLimit < 1) {
            throw coordinatorError('ANALYSIS_RECOVERY_LIMIT', 'recoveryScanLimit must be a positive integer');
        }
        this.recoveryScanLimit = recoveryScanLimit;
        this.recoveryLoaded = false;
        this.processGenerationOffset = 0;
        this.selectedConversationId = null;
    }

    async init({ intent = null, deadline = null } = {}) {
        if (this.initialized) return this;
        if (this.initPromise) {
            if (intent && Number.isFinite(deadline)) {
                this._bindInitializationToIntent(intent, deadline);
            }
            return this.initPromise;
        }
        if (this.stopping) return this;
        const lifecycleGeneration = this.lifecycleGeneration;
        const initContext = {
            lifecycleGeneration,
            intent,
            deadline: Number.isFinite(deadline) ? deadline : null,
            invalidated: false
        };
        this.initContext = initContext;
        const isCurrentInitialization = () => (
            !this.stopping
            && this.lifecycleGeneration === initContext.lifecycleGeneration
            && !initContext.invalidated
            && (!initContext.intent || (
                !initContext.intent.cancelRequested
                && (!Number.isFinite(initContext.deadline) || Date.now() < initContext.deadline)
            ))
        );
        this.initPromise = (async () => {
            await this.importer.init();
            await this.runStore.init?.();
            await this._restorePendingJobs();
            if (!isCurrentInitialization()) {
                return this;
            }
            if (initContext.intent && Number.isFinite(initContext.deadline)) {
                await this._startProcessForIntent(initContext.intent, initContext.deadline);
            } else {
                await this.processManager.start();
            }
            if (!isCurrentInitialization()) {
                await this.processManager.stop?.();
                return this;
            }
            this.initialized = true;
            this._dispatchNextIntent();
            return this;
        })();
        try {
            return await this.initPromise;
        } finally {
            this.initPromise = null;
            if (this.initContext === initContext) this.initContext = null;
        }
    }

    async analyze(request, {
        requestId = request?.request_id || randomUUID(),
        timeoutMs
    } = {}) {
        if (this.stopping) {
            throw coordinatorError(
                'ANALYZER_PROCESS_STOPPED',
                'analyzer collector is stopping'
            );
        }
        const normalizedRequestId = normalizeIntentRequestId(requestId);
        const conversationId = conversationIdOf(request);
        if (!conversationId) {
            throw new AnalyzerProtocolError('missing_field', 'conversation_id is required');
        }
        if (this.intentsByRequestId.has(normalizedRequestId)) {
            throw coordinatorError(
                'ANALYZER_REQUEST_DUPLICATE',
                `analyzer intent already exists: ${normalizedRequestId}`
            );
        }
        if (request?.priority === 'interactive') this.selectedConversationId = conversationId;

        return new Promise((resolve, reject) => {
            const intent = {
                request: request && typeof request === 'object' ? { ...request } : {},
                requestId: normalizedRequestId,
                conversationId,
                timeoutMs,
                deadline: Date.now() + (Number.isFinite(timeoutMs) && timeoutMs > 0
                    ? timeoutMs : (this.processManager.requestTimeoutMs || 120000)),
                runId: normalizedRequestId,
                retryCount: 0,
                retryBudget: this.processRestartRetries,
                lifecycleGeneration: this.lifecycleGeneration,
                enqueueSequence: ++this.enqueueSequence,
                status: 'queued',
                settled: false,
                cancelRequested: false,
                cancelReason: null,
                activeRequestId: null,
                attempt: 0,
                scope: null,
                pendingRecoveryDelivery: request?.recovery || null,
                resolve,
                reject,
                completionPromise: null,
                beginContext: null
            };
            intent.persistPromise = this._persistQueuedIntent(intent);
            intent.persistPromise.catch(() => {});
            this._armQueueDeadline(intent);
            this.intentsByRequestId.set(normalizedRequestId, intent);
            if (this.runningIntent) {
                this._enqueuePending(intent);
                this._preemptFor(intent);
            }
            else this._dispatchIntent(intent);
        });
    }

    cancel(requestId, reason) {
        const intent = this.intentsByRequestId.get(requestId);
        if (!intent || intent.settled) return false;
        const cancellationReason = reason || 'cancelled_by_caller';
        if (this.pendingIntents.get(intent.conversationId) === intent) {
            this.pendingIntents.delete(intent.conversationId);
            this._rejectIntent(intent, createCancellationError(
                intent.requestId,
                cancellationReason,
                'pending intent was cancelled'
            ), 'cancelled');
            return true;
        }
        if (this.runningIntent !== intent) return false;
        intent.cancelRequested = true;
        intent.cancelReason = String(cancellationReason);
        intent.preempted = false;
        intent.cancelPersistence = Promise.resolve(intent.persistPromise).then(async () => {
            const run = await this.runStore.get?.(intent.runId);
            if (run && !['completed', 'failed'].includes(run.status)) {
                await this.runStore.update(intent.runId, {
                    status: 'cancel_requested', cancel_policy: 'settle',
                    cancel_requested_at: Date.now()
                });
            }
        });
        intent.cancelPersistence.catch(() => {});
        const cancellationError = createCancellationError(
            intent.requestId,
            cancellationReason,
            'analyzer intent was cancelled'
        );
        if (!intent.activeRequestId) {
            this._invalidateRunBegin(intent.beginContext, cancellationError);
            return true;
        }
        return this.processManager.cancel(intent.activeRequestId, cancellationReason);
    }

    async stop() {
        if (this.stopPromise) return this.stopPromise;
        this.stopping = true;
        this.lifecycleGeneration += 1;
        const initPromise = this.initPromise;
        const stopPromise = (async () => {
            const stopError = coordinatorError(
                'ANALYZER_PROCESS_STOPPED',
                'analyzer collector stopped'
            );
            for (const intent of this.pendingIntents.values()) {
                this._rejectIntent(intent, stopError, 'cancelled');
            }
            this.pendingIntents.clear();
            if (this.runningIntent) {
                this.runningIntent.cancelRequested = true;
                this.runningIntent.cancelReason = 'collector_stopped';
                this._invalidateRunBegin(
                    this.runningIntent.beginContext,
                    createCancellationError(
                        this.runningIntent.requestId,
                        'collector_stopped',
                        'analyzer intent was cancelled'
                    )
                );
            }
            try {
                await this.processManager.stop();
                await initPromise?.catch(() => {});
                // The first stop may have observed no child while init was
                // still awaiting an importer/store.  A second stop closes a
                // process created by an init that crossed that boundary.
                await this.processManager.stop();
                await this.runningIntent?.completionPromise?.catch(() => {});
                await this.processManager.waitForIdle?.();
            } finally {
                this.initialized = false;
                this.stopping = false;
            }
        })();
        this.stopPromise = stopPromise;
        try {
            return await stopPromise;
        } finally {
            if (this.stopPromise === stopPromise) this.stopPromise = null;
        }
    }

    _enqueuePending(intent) {
        const previous = this.pendingIntents.get(intent.conversationId);
        if (previous) {
            this.pendingIntents.delete(intent.conversationId);
            this._rejectIntent(
                previous,
                coordinatorError(
                    'ANALYZER_PENDING_REPLACED',
                    'a newer analyzer intent replaced the pending intent',
                    {
                        conversation_id: intent.conversationId,
                        replaced_request_id: previous.requestId,
                        replacement_request_id: intent.requestId
                    },
                    true
                ),
                'superseded'
            );
        }
        this.pendingIntents.set(intent.conversationId, intent);
    }

    _persistQueuedIntent(intent) {
        if (typeof this.runStore.enqueue !== 'function') return Promise.resolve();
        return this.runStore.enqueue({
            run_id: intent.runId,
            job_id: intent.request.job_id,
            request_id: intent.requestId,
            conversation_id: intent.conversationId,
            mode: intent.request.mode || 'preview',
            read_intent: clone(intent.request),
            recovery_schema_version: 1,
            priority: intent.request.priority === 'interactive' ? 'interactive' : 'background',
            enqueue_sequence: intent.enqueueSequence,
            deadline: intent.deadline,
            retry_budget: intent.retryBudget,
            retry_count: intent.retryCount,
            attempt: intent.attempt,
            process_generation: 0,
            canonical_checkpoint: intent.request.persisted_anchor?.completeness === 'canonical'
                ? intent.request.persisted_anchor : null,
            partial_recovery_checkpoint: intent.request.persisted_anchor
                && intent.request.persisted_anchor.completeness !== 'canonical'
                ? intent.request.persisted_anchor : null,
            recovery_delivery: intent.request.recovery || null,
            pending_recovery_delivery: intent.pendingRecoveryDelivery || null
        });
    }

    _armQueueDeadline(intent) {
        clearTimeout(intent.queueTimer);
        intent.queueTimer = setTimeout(() => {
            if (this.pendingIntents.get(intent.conversationId) !== intent) return;
            this.pendingIntents.delete(intent.conversationId);
            this._rejectIntent(intent, requestTimeoutError(intent.requestId, 'queued', 0));
        }, Math.min(2147483647, Math.max(1, intent.deadline - Date.now())));
    }

    async _restorePendingJobs() {
        if (this.recoveryLoaded || typeof this.runStore.listRecoverable !== 'function') return;
        const generation = this.lifecycleGeneration;
        const records = await this.runStore.listRecoverable({ limit: this.recoveryScanLimit });
        const liveRunIds = new Set([...this.intentsByRequestId.values()].map((value) => value.runId));
        for (const run of records) {
            this.processGenerationOffset = Math.max(this.processGenerationOffset, run.process_generation || 0);
            this.enqueueSequence = Math.max(this.enqueueSequence, run.enqueue_sequence || 0);
        }
        const jobs = new Set();
        for (const run of records.sort((a, b) => a.enqueue_sequence - b.enqueue_sequence)) {
            if (this.stopping || generation !== this.lifecycleGeneration) return;
            if (liveRunIds.has(run.run_id)) continue;
            try {
                const hasNewerLive = () => [this.runningIntent, this.pendingIntents.get(run.conversation_id)]
                    .some((value) => value && !value.restored && value.conversationId === run.conversation_id);
                if (hasNewerLive()) {
                    throw coordinatorError('ANALYZER_PENDING_REPLACED', 'new live intent superseded the persisted recovery job');
                }
                const pendingRecovery = normalizePendingRecoveryDelivery(
                    run.pending_recovery_delivery
                );
                const reservedAttempt = run.status === 'queued' || run.status === 'retry_wait'
                    || (run.status === 'cancel_requested' && run.cancel_policy === 'resume');
                if (run.recovery_schema_version !== 1 || !run.read_intent
                    || !run.job_id || run.read_intent.job_id !== run.job_id
                    || conversationIdOf(run.read_intent) !== run.conversation_id
                    || run.read_intent.mode !== run.mode
                    || !Number.isSafeInteger(run.enqueue_sequence)
                    || !['interactive', 'background'].includes(run.priority)
                    || !Number.isFinite(run.deadline) || run.deadline <= Date.now()
                    || (reservedAttempt ? run.retry_count > run.retry_budget : run.retry_count >= run.retry_budget)
                    || jobs.has(run.job_id)
                    || (run.status === 'cancel_requested' && run.cancel_policy !== 'resume')) {
                    throw coordinatorError('ANALYSIS_RECOVERY_UNAVAILABLE', 'job is expired, incompatible, cancelled or out of retry budget');
                }
                const requestId = `request-${randomUUID()}`;
                const request = { ...clone(run.read_intent), request_id: requestId, priority: run.priority };
                if (!request.persisted_anchor) {
                    const baseline = run.canonical_checkpoint || run.partial_recovery_checkpoint;
                    if (baseline) {
                        request.persisted_anchor = clone(baseline);
                        if (!request.cursor) request.cursor = clone(baseline.cursor);
                    }
                }
                const receipt = await this.store.getRecoveryDelivery?.({
                    job_id: run.job_id, conversation_id: run.conversation_id
                });
                // A receipt is the latest durable batch, but it is not
                // necessarily the batch that a failed retry must redeliver.
                // The explicit pending marker wins even when the run was
                // advanced to `running` before the retry response arrived.
                // Runs written before this marker existed retain the old
                // recovery_delivery fallback only when no marker is present.
                const legacyRecovery = Object.prototype.hasOwnProperty.call(
                    run,
                    'pending_recovery_delivery'
                ) ? null : run.recovery_delivery;
                const recovery = pendingRecovery || receipt || legacyRecovery;
                if (receipt && run.recovery_delivery
                    && (receipt.segment_id !== run.recovery_delivery.segment_id
                        || receipt.batch_id !== run.recovery_delivery.batch_id)
                    && run.status === 'ack_pending') {
                    // A later receipt may have committed before the run update.
                    // The store's durable latest-delivery evidence is authoritative.
                    if (!receipt.scope) throw coordinatorError('ANALYSIS_RECOVERY_CONFLICT', 'receipt lacks source scope');
                }
                if (recovery) request.recovery = {
                    segment_id: recovery.segment_id, batch_id: recovery.batch_id
                };
                const scope = pendingRecovery?.scope
                    || receipt?.scope
                    || (run.source_id ? normalizeScope(run) : null);
                if (scope && run.source_id && !sameScope(scope, normalizeScope(run))) {
                    throw coordinatorError('ANALYSIS_RECOVERY_CONFLICT', 'durable receipt source does not match job');
                }
                validateMessage({ ...request, protocol_version: 1, message_type: 'analyze' });
                const intent = {
                    request, requestId, runId: run.run_id, conversationId: run.conversation_id,
                    deadline: run.deadline, retryBudget: run.retry_budget,
                    retryCount: run.retry_count + (reservedAttempt ? 0 : 1),
                    attempt: run.attempt + 1, scope,
                    recoveryDelivery: receipt || null,
                    pendingRecoveryDelivery: pendingRecovery || null,
                    enqueueSequence: run.enqueue_sequence,
                    lifecycleGeneration: this.lifecycleGeneration,
                    status: 'queued', settled: false, cancelRequested: false,
                    cancelReason: null, activeRequestId: null, completionPromise: null,
                    beginContext: null, resolve: () => {}, reject: () => {},
                    persistPromise: Promise.resolve(), restored: true
                };
                if (this.stopping || generation !== this.lifecycleGeneration) return;
                if (hasNewerLive()) {
                    throw coordinatorError('ANALYZER_PENDING_REPLACED', 'new live intent superseded the persisted recovery job');
                }
                jobs.add(run.job_id);
                this._armQueueDeadline(intent);
                this.intentsByRequestId.set(requestId, intent);
                this._enqueuePending(intent);
            } catch (error) {
                await this.runStore.fail(run.run_id, error);
            }
        }
        this.recoveryLoaded = true;
    }

    _preemptFor(next) {
        const active = this.runningIntent;
        if (!active || active.settled || active.cancelRequested || active.finalizing
            || next.request.priority !== 'interactive') return;
        const sameConversation = active.conversationId === next.conversationId;
        // A different interactive conversation is an explicit selection switch.
        active.preempted = !sameConversation;
        active.cancelRequested = true;
        active.cancelReason = sameConversation ? 'superseded_by_interactive' : 'scheduler_preempted';
        const persist = async () => {
            await active.persistPromise;
            if (typeof this.runStore.update === 'function') {
                await this.runStore.update(active.runId, {
                    status: 'cancel_requested', cancel_policy: active.preempted ? 'resume' : 'settle',
                    cancel_requested_at: Date.now()
                });
            }
        };
        active.cancelPersistence = persist();
        active.cancelPersistence.catch(() => {});
        if (active.activeRequestId) this.processManager.cancel(active.activeRequestId, active.cancelReason);
    }

    _dispatchIntent(intent) {
        if (this.stopping || intent.settled || this.runningIntent) return;
        if (this.pendingIntents.get(intent.conversationId) === intent) {
            this.pendingIntents.delete(intent.conversationId);
        }
        this.runningIntent = intent;
        intent.status = 'running';
        intent.beginContext = null;
        intent.runBeginStarted = false;
        intent.completionPromise = (async () => {
            let result;
            let failure = null;
            try {
                result = await this._executeIntent(intent);
            } catch (error) {
                failure = error;
            }
            if (failure && intent.preempted && !this.stopping && Date.now() < intent.deadline) {
                await this.processManager.waitForIdle?.();
                try {
                    await this._awaitWithDeadline(() => intent.cancelPersistence, { intent, deadline: intent.deadline, phase: 'cancel' });
                    await this._awaitWithDeadline(() => this.runStore.update(intent.runId, {
                        status: 'queued', cancel_policy: null
                    }), { intent, deadline: intent.deadline, phase: 'cancel' });
                } catch (error) {
                    intent.preempted = false;
                    this._rejectIntent(intent, error);
                    await this.runStore.fail(intent.runId, error).catch(() => {});
                    this.runningIntent = null;
                    this._dispatchNextIntent();
                    return;
                }
                if (this.stopping || intent.lifecycleGeneration !== this.lifecycleGeneration) {
                    intent.preempted = false;
                    this._rejectIntent(intent, createCancellationError(intent.requestId, 'collector_stopped'));
                    this.runningIntent = null;
                    return;
                }
                intent.cancelRequested = false;
                intent.cancelReason = null;
                intent.preempted = false;
                intent.attempt += 1;
                intent.needsNewRequest = true;
                intent.status = 'queued';
                this._armQueueDeadline(intent);
                this.runningIntent = null;
                if (this.pendingIntents.has(intent.conversationId)) {
                    this._rejectIntent(intent, createCancellationError(intent.requestId, 'superseded', 'new intent replaced suspended job'));
                } else {
                    this.pendingIntents.set(intent.conversationId, intent);
                }
                this._dispatchNextIntent();
                return;
            }
            // Settle the caller as soon as the request reaches its logical
            // terminal state. A worker that ignores cancel/timeout may still
            // hold the internal process fence; that fence must block the next
            // intent, but must not keep the caller's promise pending forever.
            const idlePromise = Promise.resolve(this.processManager.waitForIdle?.());
            if (this.runningIntent === intent) {
                if (failure) this._rejectIntent(intent, failure);
            }
            // Preserve the existing success ordering: a successful caller
            // resolves after the manager is idle. Failures are different: the
            // caller is settled before waiting for a potentially non-draining
            // worker, while the internal slot still waits on the same fence.
            if (!failure) await idlePromise;
            if (!failure && this.runningIntent === intent) {
                this._resolveIntent(intent, result);
            }
            if (failure) await idlePromise;
            if (this.runningIntent === intent) {
                this.runningIntent = null;
                this._removeIntentMappings(intent);
                this._dispatchNextIntent();
            }
            if (failure) throw failure;
            return result;
        })();
        // The promise returned to callers is intent.resolve/intent.reject;
        // keep this internal chain observed so rejected work cannot become an
        // unhandled rejection when a caller intentionally does not await it.
        intent.completionPromise.catch(() => {});
    }

    _dispatchNextIntent() {
        if (this.stopping || this.runningIntent || this.pendingIntents.size === 0) return;
        const next = [...this.pendingIntents.values()]
            .sort((left, right) => {
                const priority = (value) => value.request?.priority === 'interactive'
                    ? (value.conversationId === this.selectedConversationId ? 0 : 1) : 2;
                return priority(left) - priority(right)
                    || left.enqueueSequence - right.enqueueSequence;
            })[0];
        this._dispatchIntent(next);
    }

    async _executeIntent(intent) {
        const totalTimeoutMs = Number.isFinite(intent.timeoutMs) && intent.timeoutMs > 0
            ? intent.timeoutMs
            : (this.processManager.requestTimeoutMs || 120000);
        const deadline = intent.deadline;
        await this._awaitWithDeadline(() => intent.persistPromise, { intent, deadline, phase: 'startup' });
        await this._awaitWithDeadline(
            () => this.init({ intent, deadline }),
            { intent, deadline, phase: 'startup' }
        );
        await this._requireRemainingTimeout(intent, deadline, 'startup');
        this._assertIntentLive(intent);
        // `init()` is intentionally idempotent, so a fatal analyzer error can
        // leave the collector initialized while the manager has already
        // detached the invalid generation.  Re-establish a ready child before
        // binding the run identity for a new intent.
        if (processGenerationOf(this.processManager) > 0
            && this.processManager.child === null) {
            await this._startProcessForIntent(intent, deadline);
            this._assertIntentLive(intent);
        }

        if (intent.needsNewRequest) {
            const pendingRecovery = intent.pendingRecoveryDelivery || null;
            const recovery = pendingRecovery || (
                typeof this.store.getRecoveryDelivery === 'function'
                    ? await this._awaitWithDeadline(() => this.store.getRecoveryDelivery({
                        job_id: intent.request.job_id, conversation_id: intent.conversationId
                    }), { intent, deadline, phase: 'recovery' })
                    : null
            );
            this._assertIntentLive(intent);
            if (recovery) {
                if (intent.scope && recovery.scope && !sameScope(intent.scope, recovery.scope)) {
                    throw coordinatorError('ANALYSIS_RECOVERY_CONFLICT', 'suspended job source does not match receipt');
                }
                if (recovery.scope) intent.scope = recovery.scope;
                if (!pendingRecovery) intent.recoveryDelivery = recovery;
                intent.request = { ...intent.request,
                    recovery: { segment_id: recovery.segment_id, batch_id: recovery.batch_id } };
            }
        }
        const normalizedRequest = {
            ...intent.request,
            request_id: intent.requestId,
            protocol_version: intent.request?.protocol_version || 1,
            message_type: 'analyze'
        };
        // Target requests carry their own recovery anchor.  Node must not
        // reconstruct a source spec or discover a Rust source on behalf of the
        // analyzer; the source scope becomes durable only after the first
        // validated target batch is received.
        let scope = intent.scope || null;
        let resumedRequest = normalizedRequest;
        let currentRequestId = intent.needsNewRequest ? `request-${randomUUID()}` : intent.requestId;
        let currentAttempt = intent.attempt;
        let currentProcessGeneration = this.processGenerationOffset + processGenerationOf(this.processManager);
        await this._beginRunWithDeadline(intent, {
            run_id: intent.runId,
            job_id: normalizedRequest.job_id,
            request_id: currentRequestId,
            conversation_id: intent.conversationId,
            source_id: scope?.sourceId,
            source_epoch: scope?.sourceEpoch,
            mode: resumedRequest.mode,
            attempt: currentAttempt,
            retry_budget: intent.retryBudget,
            retry_count: intent.retryCount,
            process_generation: currentProcessGeneration,
            recovery_delivery: resumedRequest.recovery || null
        }, deadline);

        try {
            const startingRetryCount = intent.retryCount;
            let restartAttempts = startingRetryCount;
            const startingAttempt = intent.attempt;
            let complete;
            while (true) {
                this._assertIntentLive(intent);
                const attempt = startingAttempt + restartAttempts - startingRetryCount;
                if (attempt > startingAttempt) currentRequestId = `request-${randomUUID()}`;
                intent.activeRequestId = currentRequestId;
                intent.attempt = attempt;
                currentAttempt = attempt;
                currentProcessGeneration = this.processGenerationOffset + processGenerationOf(this.processManager);
                if (attempt > startingAttempt) {
                    await this._awaitWithDeadline(
                        () => this.runStore.update(intent.runId, {
                            request_id: currentRequestId,
                            attempt,
                            process_generation: currentProcessGeneration,
                            status: 'running',
                            retry_count: restartAttempts,
                            last_error: null
                        }),
                        { intent, deadline, phase: 'restart' }
                    );
                }
                this.intentsByRequestId.set(currentRequestId, intent);
                const attemptRequest = {
                    ...resumedRequest,
                    request_id: currentRequestId
                };
                // `recoveryDelivery` records the latest durable delivery for
                // diagnostics/result bookkeeping.  It is not necessarily the
                // logical delivery that this attempt must redeliver.  Only an
                // explicit pending marker (or the request's initial recovery
                // pair) constrains the first batch of this attempt.
                let pendingRecovery = intent.pendingRecoveryDelivery
                    || attemptRequest.recovery
                    || null;
                const remainingTimeoutMs = await this._requireRemainingTimeout(
                    intent,
                    deadline,
                    'analyze'
                );
                try {
                    complete = await this._awaitWithDeadline(
                        () => this.processManager.request(attemptRequest, {
                            timeoutMs: remainingTimeoutMs,
                            attempt,
                            onBatch: async (batch) => {
                                this._assertCurrentAttempt(intent, currentRequestId);
                                assertBatchConversation(batch, intent.conversationId);
                                const imported = await this.importer.importBatch(batch, {
                                    expected: {
                                        request_id: currentRequestId,
                                        job_id: attemptRequest.job_id
                                    },
                                    scope: scope || undefined,
                                    recoveryDelivery: pendingRecovery || undefined
                                });
                                this._assertCurrentAttempt(intent, currentRequestId);
                                if (imported?.accepted === false || imported?.persisted === false) {
                                    // A negative importer result means no
                                    // durable receipt was produced.  Let the
                                    // process manager send the rejection ACK
                                    // without advancing run progress.
                                    return imported;
                                }
                                // Recovery constrains the re-delivered batch,
                                // not all later batches in the same stream.
                                pendingRecovery = null;
                                intent.pendingRecoveryDelivery = null;
                                const batchScope = imported?.scope || normalizeScope(batch);
                                if (scope && !sameScope(scope, batchScope)) {
                                    throw coordinatorError(
                                        'ANALYSIS_BATCH_SCOPE_CONFLICT',
                                        'analyzer batch scope changed during one request',
                                        {
                                            expected_scope: scope,
                                            actual_scope: batchScope
                                        },
                                        false
                                    );
                                }
                                scope = scope || batchScope;
                                intent.scope = scope;
                                resumedRequest = {
                                    ...resumedRequest,
                                    recovery: {
                                        segment_id: batch.segment_id,
                                        batch_id: batch.batch_id
                                    }
                                };
                                intent.request = resumedRequest;
                                intent.recoveryDelivery = imported?.delivery || resumedRequest.recovery;
                                const currentRun = await this.runStore.get(intent.runId);
                                await this.runStore.update(intent.runId, {
                                    request_id: currentRequestId,
                                    attempt,
                                    process_generation: currentProcessGeneration,
                                    status: 'ack_pending',
                                    batches: (currentRun?.batches || 0)
                                        + (imported?.duplicate ? 0 : 1),
                                    receipt_count: (currentRun?.receipt_count || 0)
                                        + (imported?.duplicate ? 0 : 1),
                                    last_batch_id: batch.batch_id,
                                    last_segment_id: batch.segment_id,
                                    source_id: batchScope.sourceId,
                                    source_epoch: batchScope.sourceEpoch,
                                    pending_recovery_delivery: null,
                                    recovery_delivery: imported?.delivery || {
                                        job_id: batch.job_id,
                                        segment_id: batch.segment_id,
                                        batch_id: batch.batch_id,
                                        request_id: currentRequestId
                                    }
                                });
                                return imported || {
                                    accepted: true,
                                    persisted: true,
                                    scope: batchScope
                                };
                            },
                            onComplete: async (message, context = {}) => {
                                this._assertCurrentAttempt(intent, currentRequestId);
                                // Rust has released its active request. Do not
                                // scheduler-cancel while the accepted complete
                                // crosses the asynchronous checkpoint boundary.
                                intent.finalizing = true;
                                // The real target protocol always carries a
                                // checkpoint.  Keep the no-checkpoint branch
                                // for injected process-manager tests that
                                // exercise only lifecycle behavior.
                                if (!scope && !message.checkpoint) return;
                                const acceptedDelivery = context?.acceptedDelivery || null;
                                if (message.checkpoint && !acceptedDelivery) {
                                    throw coordinatorError(
                                        'ANALYSIS_COMPLETE_WITHOUT_ACK',
                                        'analyzer complete requires the latest accepted batch delivery',
                                        {
                                            request_id: message.request_id
                                        },
                                        false
                                    );
                                }
                                const completeScope = scope || normalizeScope(message.checkpoint);
                                if (scope && !sameScope(scope, completeScope)) {
                                    throw coordinatorError(
                                        'ANALYSIS_COMPLETE_SCOPE_MISMATCH',
                                        'analyzer complete scope does not match the accepted batch',
                                        {
                                            expected_scope: scope,
                                            actual_scope: completeScope
                                        },
                                        false
                                    );
                                }
                                scope = scope || completeScope;
                                intent.scope = scope;
                                await this.importer.commitComplete(message, {
                                    scope,
                                    checkpoint: message.checkpoint || null,
                                    acceptedDelivery
                                });
                            }
                        }),
                        { intent, deadline, phase: 'analyze' }
                    );
                    await this._requireRemainingTimeout(intent, deadline, 'complete');
                    this._assertIntentLive(intent);
                    break;
                } catch (error) {
                    const processFailure = isRestartableProcessError(error);
                    const fatalRetry = error?.fatal === true && error?.retryable === true;
                    const stagingRetry = isRetryableStagingRejection(error);
                    const canRestart = (processFailure || fatalRetry || stagingRetry)
                        && restartAttempts < intent.retryBudget
                        && Date.now() < deadline
                        && !intent.cancelRequested;
                    if (!canRestart) {
                        if (!intent.cancelRequested
                        && Date.now() >= deadline
                        && isRestartableProcessError(error)) {
                        intent.cancelRequested = true;
                        intent.cancelReason = 'request_timeout';
                        this._stopProcessAfterDeadline();
                        throw requestTimeoutError(intent.requestId, 'restart', totalTimeoutMs);
                        }
                        throw error;
                    }
                    const delivery = stagingRetry ? (error.details || {}) : null;
                    if (delivery?.segment_id && delivery?.batch_id) {
                        intent.pendingRecoveryDelivery = {
                            job_id: delivery.job_id || normalizedRequest.job_id,
                            segment_id: delivery.segment_id,
                            batch_id: delivery.batch_id,
                            request_id: delivery.request_id || currentRequestId,
                            ...(intent.scope ? { scope: clone(intent.scope) } : {})
                        };
                        resumedRequest = {
                            ...resumedRequest,
                            recovery: {
                                segment_id: delivery.segment_id,
                                batch_id: delivery.batch_id
                            }
                        };
                    }
                    const retryPatch = {
                        request_id: currentRequestId,
                        attempt: currentAttempt,
                        process_generation: currentProcessGeneration,
                        status: 'retry_wait',
                        retry_count: restartAttempts + 1,
                        last_error: serializeError(error),
                        pending_recovery_delivery: intent.pendingRecoveryDelivery || null
                    };
                    if (delivery?.segment_id && delivery?.batch_id) {
                        retryPatch.recovery_delivery = {
                            job_id: delivery.job_id || normalizedRequest.job_id,
                            segment_id: delivery.segment_id,
                            batch_id: delivery.batch_id,
                            request_id: currentRequestId
                        };
                    }
                    await this._awaitWithDeadline(
                        () => this.runStore.update(intent.runId, retryPatch),
                        { intent, deadline, phase: 'restart' }
                    );
                    restartAttempts += 1;
                    intent.retryCount = restartAttempts;
                    await this._awaitWithDeadline(
                        () => this.processManager.waitForIdle?.(),
                        { intent, deadline, phase: 'restart' }
                    );
                    this._assertIntentLive(intent);
                    if (processFailure || fatalRetry) {
                        await this._startProcessForIntent(intent, deadline);
                        this._assertIntentLive(intent);
                    }
                }
            }
            this._assertIntentLive(intent);
            await this._requireRemainingTimeout(intent, deadline, 'complete');
            const state = scope
                ? await this._awaitWithDeadline(
                    () => this.store.snapshot(scope),
                    { intent, deadline, phase: 'complete' }
                )
                : null;
            await this._awaitWithDeadline(
                () => this.runStore.complete(intent.runId, {
                    status: complete.status,
                    completeness: complete.completeness,
                    checkpoint: complete.checkpoint || null
                }, {
                    request_id: currentRequestId,
                    attempt: currentAttempt,
                    process_generation: currentProcessGeneration
                }),
                { intent, deadline, phase: 'complete' }
            );
            await this._requireRemainingTimeout(intent, deadline, 'complete');
            this._assertIntentLive(intent);
            intent.activeRequestId = null;
            return {
                requestId: currentRequestId,
                initialRequestId: intent.requestId,
                complete,
                state,
                scope
            };
        } catch (error) {
            intent.activeRequestId = null;
            if (intent.preempted && !this.stopping && Date.now() < deadline) throw error;
            await this.runStore.fail(intent.runId, error, {
                request_id: currentRequestId,
                attempt: currentAttempt,
                process_generation: currentProcessGeneration
            }).catch(() => {});
            throw error;
        }
    }

    _assertIntentLive(intent) {
        if (this.runningIntent !== intent || intent.settled) {
            throw staleIntentError(intent);
        }
        if (this.stopping
            || intent.cancelRequested
            || this.lifecycleGeneration !== intent.lifecycleGeneration) {
            throw createCancellationError(
                intent.requestId,
                intent.cancelReason || 'collector_lifecycle_changed',
                'analyzer intent was cancelled'
            );
        }
    }

    _bindInitializationToIntent(intent, deadline) {
        const context = this.initContext;
        if (!context
            || context.lifecycleGeneration !== intent.lifecycleGeneration
            || !Number.isFinite(deadline)) {
            return;
        }
        context.intent = intent;
        context.deadline = deadline;
        if (intent.cancelRequested || Date.now() >= deadline) {
            context.invalidated = true;
        }
    }

    async _beginRunWithDeadline(intent, run, deadline) {
        intent.runBeginStarted = true;
        const context = {
            runId: run.run_id,
            identity: {
                request_id: run.request_id,
                attempt: run.attempt,
                process_generation: run.process_generation
            },
            invalidated: Boolean(intent.cancelRequested),
            invalidationError: intent.cancelRequested
                ? createCancellationError(
                    intent.requestId,
                    intent.cancelReason || 'cancelled_by_caller',
                    'analyzer intent was cancelled'
                )
                : null,
            settled: false,
            value: null,
            error: null,
            compensationPromise: null
        };
        intent.beginContext = context;

        // The deadline wrapper cannot cancel a storage operation. Observe
        // the original promise separately so a late successful write can be
        // converted to a terminal failed run instead of remaining running.
        const beginPromise = Promise.resolve().then(() => this.runStore.begin(run));
        beginPromise.then(
            (value) => {
                context.settled = true;
                context.value = value;
                if (context.invalidated) return this._compensateRunBegin(context, value);
                return undefined;
            },
            (error) => {
                context.settled = true;
                context.error = error;
                if (context.invalidated) return this._compensateRunBegin(context);
                return undefined;
            }
        ).catch((error) => {
            context.compensationError = error;
        });

        try {
            const value = await this._awaitWithDeadline(
                () => beginPromise,
                { intent, deadline, phase: 'startup' }
            );
            if (context.invalidated) {
                await this._compensateRunBegin(context, value);
                throw context.invalidationError || createCancellationError(
                    intent.requestId,
                    intent.cancelReason || 'collector_lifecycle_changed',
                    'analyzer intent was cancelled'
                );
            }
            return value;
        } catch (error) {
            if (context.invalidated) {
                if (!context.invalidationError) context.invalidationError = error;
                if (context.settled) {
                    await context.compensationPromise?.catch((compensationError) => {
                        context.compensationError = compensationError;
                    });
                }
                throw context.invalidationError;
            }
            throw error;
        } finally {
            if (intent.beginContext === context) intent.beginContext = null;
        }
    }

    _invalidateRunBegin(context, error) {
        if (!context) return;
        context.invalidated = true;
        if (!context.invalidationError) context.invalidationError = error;
        if (context.settled) {
            this._compensateRunBegin(context, context.value).catch((compensationError) => {
                context.compensationError = compensationError;
            });
        }
    }

    _compensateRunBegin(context, value = null) {
        if (!context) return Promise.resolve();
        if (context.compensationPromise) return context.compensationPromise;
        context.compensationPromise = (async () => {
            let run = value;
            if (!run && typeof this.runStore.get === 'function') {
                run = await this.runStore.get(context.runId);
            }
            if (!run || run.status === 'completed' || run.status === 'failed') return;

            const identity = {
                request_id: run.request_id || context.identity.request_id,
                attempt: Number.isSafeInteger(run.attempt)
                    ? run.attempt
                    : context.identity.attempt,
                process_generation: Number.isSafeInteger(run.process_generation)
                    ? run.process_generation
                    : context.identity.process_generation
            };
            const error = context.invalidationError || context.error || coordinatorError(
                'ANALYZER_REQUEST_CANCELLED',
                'analyzer intent was cancelled',
                { request_id: context.identity.request_id },
                true
            );
            let primaryFailure = null;
            if (typeof this.runStore.fail === 'function') {
                try {
                    return await this.runStore.fail(context.runId, error, identity);
                } catch (failure) {
                    primaryFailure = failure;
                }
            } else {
                primaryFailure = coordinatorError(
                    'ANALYZER_RUN_COMPENSATION_FAILED',
                    'run store does not provide a terminal failure writer',
                    { request_id: context.identity.request_id },
                    true
                );
            }

            const fallbackError = coordinatorError(
                'ANALYZER_RUN_COMPENSATION_FAILED',
                'primary analyzer run compensation failed; fallback terminal update required',
                {
                    run_id: context.runId,
                    request_id: identity.request_id,
                    original_error: serializeError(error),
                    compensation_error: serializeError(primaryFailure)
                },
                true
            );
            if (typeof this.runStore.update !== 'function') {
                throw fallbackError;
            }

            let current = run;
            if (typeof this.runStore.get === 'function') {
                try {
                    current = await this.runStore.get(context.runId) || current;
                } catch (readFailure) {
                    fallbackError.details.compensation_read_error = serializeError(readFailure);
                }
            }
            if (!current || current.status === 'completed' || current.status === 'failed') {
                return current;
            }

            const fallbackIdentity = {
                request_id: current.request_id || identity.request_id,
                attempt: Number.isSafeInteger(current.attempt)
                    ? current.attempt
                    : identity.attempt,
                process_generation: Number.isSafeInteger(current.process_generation)
                    ? current.process_generation
                    : identity.process_generation
            };
            const fallbackRecord = serializeError(fallbackError);
            try {
                return await this.runStore.update(context.runId, {
                    ...fallbackIdentity,
                    status: 'failed',
                    completed_at: Date.now(),
                    error: fallbackRecord,
                    last_error: fallbackRecord,
                    retryable: true,
                    retry_count: (Number.isSafeInteger(current.retry_count)
                        ? current.retry_count
                        : 0) + 1
                });
            } catch (fallbackFailure) {
                fallbackError.details.fallback_error = serializeError(fallbackFailure);
                throw fallbackError;
            }
        })().catch((error) => {
            context.compensationError = error;
            throw error;
        });
        return context.compensationPromise;
    }

    async _startProcessForIntent(intent, deadline) {
        this._assertIntentLive(intent);
        if (!Number.isFinite(deadline)) {
            await this.processManager.start();
            return;
        }
        const remainingTimeoutMs = await this._requireRemainingTimeout(
            intent,
            deadline,
            'startup'
        );
        await this._awaitWithDeadline(
            () => this.processManager.start({ timeoutMs: remainingTimeoutMs }),
            { intent, deadline, phase: 'startup' }
        );
        if (this.stopping
            || intent.cancelRequested
            || this.lifecycleGeneration !== intent.lifecycleGeneration) {
            await this.processManager.stop?.();
            this._assertIntentLive(intent);
        }
    }

    async _requireRemainingTimeout(intent, deadline, phase) {
        const remainingTimeoutMs = deadline - Date.now();
        if (remainingTimeoutMs > 0) return remainingTimeoutMs;
        const error = this._markDeadlineExceeded(intent, phase, 0);
        this._stopProcessAfterDeadline();
        throw error;
    }

    async _awaitWithDeadline(operation, { intent = null, deadline = null, phase = 'analyze' } = {}) {
        if (!Number.isFinite(deadline)) return operation();
        const remainingTimeoutMs = deadline - Date.now();
        if (remainingTimeoutMs <= 0) {
            const error = this._markDeadlineExceeded(intent, phase, 0);
            this._stopProcessAfterDeadline();
            throw error;
        }

        let timeoutId = null;
        let timedOut = false;
        const operationPromise = Promise.resolve().then(operation);
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                timedOut = true;
                reject(requestTimeoutError(
                    intent?.requestId,
                    phase,
                    remainingTimeoutMs
                ));
            }, remainingTimeoutMs);
        });
        try {
            return await Promise.race([operationPromise, timeoutPromise]);
        } catch (error) {
            if (timedOut) {
                this._markDeadlineExceeded(intent, phase, remainingTimeoutMs);
                this._stopProcessAfterDeadline();
            }
            throw error;
        } finally {
            if (timeoutId !== null) clearTimeout(timeoutId);
            operationPromise.catch(() => {});
        }
    }

    _markDeadlineExceeded(intent, phase, timeoutMs) {
        if (intent) {
            intent.cancelRequested = true;
            intent.cancelReason = 'request_timeout';
            this._invalidateRunBegin(
                intent.beginContext,
                requestTimeoutError(intent.requestId, phase, timeoutMs)
            );
            if (this.initContext?.intent === intent) {
                this.initContext.invalidated = true;
            }
        }
        return requestTimeoutError(intent?.requestId, phase, timeoutMs);
    }

    _stopProcessAfterDeadline() {
        if (this.stopping) return;
        let stopResult;
        try {
            stopResult = this.processManager.stop?.();
        } catch (_) {
            return;
        }
        stopResult?.catch?.(() => {});
        return stopResult;
    }

    _assertCurrentAttempt(intent, requestId) {
        this._assertIntentLive(intent);
        if (intent.activeRequestId !== requestId) throw staleIntentError(intent);
    }

    _resolveIntent(intent, result) {
        if (intent.settled) return;
        clearTimeout(intent.queueTimer);
        intent.settled = true;
        intent.status = 'completed';
        this._removeIntentMappings(intent);
        intent.resolve(result);
    }

    _rejectIntent(intent, error, status = 'failed') {
        if (intent.settled) return;
        clearTimeout(intent.queueTimer);
        const wasQueued = intent.status === 'queued';
        intent.settled = true;
        intent.status = status;
        this._removeIntentMappings(intent);
        intent.reject(error);
        if ((wasQueued || !intent.runBeginStarted) && !intent.preempted) {
            Promise.resolve(intent.persistPromise)
                .then(() => this.runStore.fail(intent.runId, error))
                .catch(() => {});
        }
    }

    _removeIntentMappings(intent) {
        for (const [requestId, candidate] of this.intentsByRequestId) {
            if (candidate === intent) this.intentsByRequestId.delete(requestId);
        }
    }
}

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeIntentRequestId(requestId) {
    if (typeof requestId !== 'string' || requestId.trim().length === 0) {
        throw new AnalyzerProtocolError('invalid_field', 'request_id must be a non-empty string');
    }
    return requestId;
}

function conversationIdOf(request) {
    return String(
        request?.conversation_id
        ?? request?.conversationId
        ?? ''
    ).trim();
}

function assertBatchConversation(batch, expectedConversationId) {
    const expected = String(expectedConversationId || '').trim();
    const actual = batch?.payload?.conversation_id;
    if (!expected || typeof actual !== 'string' || actual !== expected) {
        throw coordinatorError(
            'ANALYSIS_BATCH_SCOPE_CONFLICT',
            'analyzer batch conversation_id does not match the requested conversation',
            {
                expected_conversation_id: expected,
                actual_conversation_id: actual
            },
            false
        );
    }
}

function normalizePendingRecoveryDelivery(value) {
    if (value === undefined || value === null) return null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw coordinatorError(
            'ANALYSIS_RECOVERY_CONFLICT',
            'pending recovery delivery must be an object'
        );
    }
    const normalized = { ...clone(value) };
    for (const field of ['segment_id', 'batch_id']) {
        if (typeof normalized[field] !== 'string' || !normalized[field].trim()) {
            throw coordinatorError(
                'ANALYSIS_RECOVERY_CONFLICT',
                `pending recovery delivery ${field} is required`
            );
        }
    }
    for (const field of ['job_id', 'request_id']) {
        if (normalized[field] !== undefined && normalized[field] !== null
            && (typeof normalized[field] !== 'string' || !normalized[field].trim())) {
            throw coordinatorError(
                'ANALYSIS_RECOVERY_CONFLICT',
                `pending recovery delivery ${field} must be a non-empty string`
            );
        }
    }
    if (normalized.scope !== undefined && normalized.scope !== null) {
        try {
            normalized.scope = normalizeScope(normalized.scope);
        } catch (_) {
            throw coordinatorError(
                'ANALYSIS_RECOVERY_CONFLICT',
                'pending recovery delivery scope is incomplete'
            );
        }
    }
    return normalized;
}

function coordinatorError(code, message, details = undefined, retryable = undefined) {
    const error = new Error(message || code);
    error.code = code;
    if (details !== undefined) error.details = details;
    if (retryable !== undefined) error.retryable = retryable;
    return error;
}

function requestTimeoutError(requestId, phase, timeoutMs) {
    return coordinatorError(
        'ANALYZER_REQUEST_TIMEOUT',
        `analyzer ${phase} phase exceeded its deadline`,
        {
            request_id: requestId,
            phase,
            timeout_ms: Math.max(0, Math.ceil(Number(timeoutMs) || 0))
        },
        true
    );
}

function isRestartableProcessError(error) {
    return error?.code === 'ANALYZER_PROCESS_EXIT'
        || error?.code === 'ANALYZER_PROCESS_NOT_RUNNING';
}

function isRetryableStagingRejection(error) {
    return error?.code === 'batch_rejected'
        && error?.retryable === true
        && error?.details?.rejection_code === 'staging_unavailable';
}

function processGenerationOf(processManager) {
    return Number.isSafeInteger(processManager?.generation)
        && processManager.generation >= 0
        ? processManager.generation
        : 0;
}

function sameScope(left, right) {
    return Boolean(left && right)
        && left.conversationId === right.conversationId
        && left.sourceId === right.sourceId
        && left.sourceEpoch === right.sourceEpoch;
}

function serializeError(error) {
    const value = {
        code: error?.code || 'ANALYZER_FAILED',
        message: error?.message || String(error)
    };
    if (typeof error?.retryable === 'boolean') value.retryable = error.retryable;
    if (typeof error?.fatal === 'boolean') value.fatal = error.fatal;
    if (error?.details !== undefined) {
        try {
            value.details = JSON.parse(JSON.stringify(error.details));
        } catch (_) {
            value.details = String(error.details);
        }
    }
    return value;
}

function createCancellationError(requestId, reason, message) {
    return coordinatorError(
        'ANALYZER_REQUEST_CANCELLED',
        message || String(reason),
        { request_id: requestId, reason: String(reason) },
        true
    );
}

function staleIntentError(intent) {
    return coordinatorError(
        'ANALYZER_STALE_ATTEMPT',
        'analyzer callback belongs to a stale intent or attempt',
        {
            request_id: intent.requestId,
            active_request_id: intent.activeRequestId,
            conversation_id: intent.conversationId
        },
        false
    );
}

module.exports = {
    CodexRolloutCollector,
    AnalyzerProcessManager,
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore,
    FileCheckpointStore,
    MemoryCheckpointStore,
    FileAnalysisRunStore,
    MemoryAnalysisRunStore
};
