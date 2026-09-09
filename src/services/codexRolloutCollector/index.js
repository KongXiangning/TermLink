'use strict';

const { randomUUID } = require('node:crypto');
const { AnalyzerProcessManager } = require('./analyzerProcessManager');
const { AnalyzerProtocolError } = require('./analyzerProtocol');
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
        cancelGraceMs = 1000
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

        return new Promise((resolve, reject) => {
            const intent = {
                request: request && typeof request === 'object' ? { ...request } : {},
                requestId: normalizedRequestId,
                conversationId,
                timeoutMs,
                lifecycleGeneration: this.lifecycleGeneration,
                enqueueSequence: ++this.enqueueSequence,
                status: 'queued',
                settled: false,
                cancelRequested: false,
                cancelReason: null,
                activeRequestId: null,
                attempt: 0,
                scope: null,
                resolve,
                reject,
                completionPromise: null,
                beginContext: null
            };
            this.intentsByRequestId.set(normalizedRequestId, intent);
            if (this.runningIntent) this._enqueuePending(intent);
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

    _dispatchIntent(intent) {
        if (this.stopping || intent.settled || this.runningIntent) return;
        if (this.pendingIntents.get(intent.conversationId) === intent) {
            this.pendingIntents.delete(intent.conversationId);
        }
        this.runningIntent = intent;
        intent.status = 'running';
        intent.completionPromise = (async () => {
            let result;
            let failure = null;
            try {
                result = await this._executeIntent(intent);
            } catch (error) {
                failure = error;
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
                const priority = (value) => value.request?.priority === 'interactive' ? 0 : 1;
                return priority(left) - priority(right)
                    || left.enqueueSequence - right.enqueueSequence;
            })[0];
        this._dispatchIntent(next);
    }

    async _executeIntent(intent) {
        const totalTimeoutMs = Number.isFinite(intent.timeoutMs) && intent.timeoutMs > 0
            ? intent.timeoutMs
            : (this.processManager.requestTimeoutMs || 120000);
        const deadline = Date.now() + totalTimeoutMs;
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
        let currentRequestId = intent.requestId;
        let currentAttempt = 0;
        let currentProcessGeneration = processGenerationOf(this.processManager);
        await this._beginRunWithDeadline(intent, {
            run_id: intent.requestId,
            job_id: normalizedRequest.job_id,
            request_id: intent.requestId,
            conversation_id: intent.conversationId,
            source_id: scope?.sourceId,
            source_epoch: scope?.sourceEpoch,
            mode: resumedRequest.mode,
            attempt: 0,
            process_generation: currentProcessGeneration,
            recovery_delivery: resumedRequest.recovery || null
        }, deadline);

        try {
            let restartAttempts = 0;
            let complete;
            while (true) {
                this._assertIntentLive(intent);
                const attempt = restartAttempts;
                currentRequestId = attempt === 0
                    ? intent.requestId
                    : `request-${randomUUID()}`;
                intent.activeRequestId = currentRequestId;
                intent.attempt = attempt;
                currentAttempt = attempt;
                currentProcessGeneration = processGenerationOf(this.processManager);
                if (attempt > 0) {
                    await this._awaitWithDeadline(
                        () => this.runStore.update(intent.requestId, {
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
                                const imported = await this.importer.importBatch(batch, {
                                    expected: {
                                        request_id: currentRequestId,
                                        job_id: attemptRequest.job_id
                                    },
                                    scope: scope || undefined,
                                    recoveryDelivery: attemptRequest.recovery || undefined
                                });
                                this._assertCurrentAttempt(intent, currentRequestId);
                                if (imported?.accepted === false || imported?.persisted === false) {
                                    // A negative importer result means no
                                    // durable receipt was produced.  Let the
                                    // process manager send the rejection ACK
                                    // without advancing run progress.
                                    return imported;
                                }
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
                                const currentRun = await this.runStore.get(intent.requestId);
                                await this.runStore.update(intent.requestId, {
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
                        && restartAttempts < this.processRestartRetries
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
                        last_error: serializeError(error)
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
                        () => this.runStore.update(intent.requestId, retryPatch),
                        { intent, deadline, phase: 'restart' }
                    );
                    restartAttempts += 1;
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
                () => this.runStore.complete(intent.requestId, {
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
            await this.runStore.fail(intent.requestId, error, {
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
        intent.settled = true;
        intent.status = 'completed';
        this._removeIntentMappings(intent);
        intent.resolve(result);
    }

    _rejectIntent(intent, error, status = 'failed') {
        if (intent.settled) return;
        intent.settled = true;
        intent.status = status;
        this._removeIntentMappings(intent);
        intent.reject(error);
    }

    _removeIntentMappings(intent) {
        for (const [requestId, candidate] of this.intentsByRequestId) {
            if (candidate === intent) this.intentsByRequestId.delete(requestId);
        }
    }
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
