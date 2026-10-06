'use strict';

const { spawn } = require('node:child_process');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    REQUIRED_CAPABILITIES,
    ACK_REJECTION_CODES,
    AnalyzerProtocolError,
    canonicalizeCapabilities,
    encodeMessage,
    hasRequiredCapabilities,
    parseLine,
    createAck,
    createCancel,
    createHello
} = require('./analyzerProtocol');
const { AnalyzerRequestTracker } = require('./analyzerRequestTracker');

const STARTUP_CONFIG_VERSION = 1;
const STARTUP_CONFIG_FLAGS = Object.freeze([
    '--startup-config-version',
    '--sessions-root'
]);

function resolveAnalyzerExecutable(configuredPath, {
    cwd = process.cwd(),
    fsModule = fs
} = {}) {
    if (typeof configuredPath !== 'string' || !configuredPath.trim()) {
        const error = new Error('TERMLINK_CODEX_ROLLOUT_ANALYZER_PATH must identify a packaged analyzer executable.');
        error.code = 'ANALYZER_BINARY_NOT_CONFIGURED';
        throw error;
    }
    const resolved = path.isAbsolute(configuredPath)
        ? path.normalize(configuredPath)
        : path.resolve(cwd, configuredPath);
    let stat;
    try {
        stat = fsModule.statSync(resolved);
    } catch (cause) {
        const error = new Error(`Configured Rust analyzer executable is missing: ${resolved}`);
        error.code = 'ANALYZER_BINARY_MISSING';
        error.cause = cause;
        throw error;
    }
    if (!stat.isFile()) {
        const error = new Error(`Configured Rust analyzer path is not a file: ${resolved}`);
        error.code = 'ANALYZER_BINARY_INVALID';
        throw error;
    }
    if (process.platform !== 'win32') {
        try {
            fsModule.accessSync(resolved, fs.constants.X_OK);
        } catch (cause) {
            const error = new Error(`Configured Rust analyzer executable is not executable: ${resolved}`);
            error.code = 'ANALYZER_BINARY_NOT_EXECUTABLE';
            error.cause = cause;
            throw error;
        }
    }
    return resolved;
}

class AnalyzerStartupError extends Error {
    constructor(code, message, details = undefined) {
        super(message || code);
        this.name = 'AnalyzerStartupError';
        this.code = code;
        if (details !== undefined) this.details = details;
    }
}

function resolveSessionsRoot({ env = process.env, homedir = os.homedir } = {}) {
    const configuredHome = typeof env?.CODEX_HOME === 'string'
        && env.CODEX_HOME.trim().length > 0
        ? env.CODEX_HOME.trim()
        : null;
    // Resolve the OS home only when CODEX_HOME has not been configured.
    let codexHome = configuredHome;
    if (!codexHome) {
        const fallbackHome = typeof homedir === 'function' ? homedir() : homedir;
        if (typeof fallbackHome !== 'string' || fallbackHome.trim().length === 0) {
            throw new AnalyzerStartupError(
                'ANALYZER_CODEX_HOME_INVALID',
                'CODEX_HOME or the operating-system home directory is required'
            );
        }
        codexHome = path.join(fallbackHome.trim(), '.codex');
    }

    const normalizedHome = path.normalize(path.resolve(codexHome));
    let stats;
    try {
        stats = fs.statSync(normalizedHome);
    } catch (error) {
        throw new AnalyzerStartupError(
            'ANALYZER_CODEX_HOME_INVALID',
            'CODEX_HOME must exist and be a directory',
            { path: normalizedHome, cause: error?.code || error?.message }
        );
    }
    if (!stats.isDirectory()) {
        throw new AnalyzerStartupError(
            'ANALYZER_CODEX_HOME_INVALID',
            'CODEX_HOME must exist and be a directory',
            { path: normalizedHome }
        );
    }

    return path.normalize(path.resolve(normalizedHome, 'sessions'));
}

function buildStartupArgs(args, sessionsRoot) {
    const existingArgs = Array.isArray(args) ? [...args] : [];
    if (existingArgs.some((value) => {
        const text = String(value);
        return STARTUP_CONFIG_FLAGS.includes(text)
            || STARTUP_CONFIG_FLAGS.some((flag) => text.startsWith(flag + '='));
    })) {
        throw new AnalyzerStartupError(
            'ANALYZER_STARTUP_ARGS_CONFLICT',
            'analyzer args must not override the target startup configuration',
            { forbidden_flags: STARTUP_CONFIG_FLAGS }
        );
    }
    return [
        ...existingArgs,
        '--startup-config-version',
        String(STARTUP_CONFIG_VERSION),
        '--sessions-root',
        sessionsRoot
    ];
}

function createHelloFailure(code, message, details = undefined) {
    return new AnalyzerStartupError(code, message, details);
}

function createProcessNotRunningError() {
    const error = new Error('analyzer process is not running');
    error.code = 'ANALYZER_PROCESS_NOT_RUNNING';
    return error;
}

function isProcessUnavailableError(error) {
    return error?.code === 'ANALYZER_PROCESS_NOT_RUNNING'
        || error?.code === 'ERR_STREAM_DESTROYED'
        || error?.code === 'EPIPE';
}

function stableBatchRejectionCode(value) {
    const explicit = typeof value === 'string'
        ? value
        : (value?.rejection_code
            || value?.rejectionCode
            || value?.error?.rejection_code
            || value?.error?.rejectionCode
            || value?.error);
    if (typeof explicit === 'string' && ACK_REJECTION_CODES.includes(explicit)) {
        return explicit;
    }

    const code = typeof value === 'string'
        ? value
        : (value?.code || value?.error?.code || '');
    if (/scope/i.test(code) && /batch|checkpoint|source/i.test(code)) {
        return 'batch_scope_conflict';
    }
    if (value instanceof AnalyzerProtocolError
        || value?.error instanceof AnalyzerProtocolError
        || /^(?:invalid_|missing_|malformed_|unsupported_)/.test(code)
        || /^ANALYSIS_(?:BATCH|CHECKPOINT|COMPLETE)_/.test(code)) {
        return 'batch_validation_failed';
    }
    return 'staging_unavailable';
}

function batchRejectionMismatchError(requestId, expected, actual) {
    const error = new Error('analyzer batch rejection did not match the local ACK rejection');
    error.code = 'ANALYZER_BATCH_REJECTION_MISMATCH';
    error.retryable = false;
    error.fatal = true;
    error.details = {
        request_id: requestId,
        expected_rejection_code: expected,
        actual_rejection_code: actual
    };
    return error;
}

function normalizeProcessUnavailableError(error) {
    if (error?.code !== 'ERR_STREAM_DESTROYED' && error?.code !== 'EPIPE') {
        return error;
    }
    const unavailable = createProcessNotRunningError();
    unavailable.cause = error;
    return unavailable;
}

function childHasExited(child) {
    if (!child) return true;
    return (child.exitCode !== null && child.exitCode !== undefined)
        || (child.signalCode !== null && child.signalCode !== undefined);
}

function acceptedDeliveryOf(message) {
    return {
        request_id: message.request_id,
        job_id: message.job_id,
        segment_id: message.segment_id,
        batch_id: message.batch_id,
        scope: {
            conversation_id: message.payload?.conversation_id,
            source_id: message.payload?.source_id,
            source_epoch: message.payload?.source_epoch
        }
    };
}

function waitForChildExit(child, forceAfterMs) {
    if (childHasExited(child)) return Promise.resolve();
    return new Promise((resolve) => {
        let settled = false;
        let forceTimer = null;
        const onTerminationError = () => {
            // A kill/send error is not proof that the child has exited. Keep
            // an error listener attached while the termination fence is open
            // so a failed second kill cannot become an unhandled error.
        };
        const cleanup = () => {
            if (forceTimer !== null) clearTimeout(forceTimer);
            child.removeListener?.('exit', resolveOnce);
            child.removeListener?.('error', onTerminationError);
        };
        const resolveOnce = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
        };
        child.once('exit', resolveOnce);
        child.on?.('error', onTerminationError);
        forceTimer = setTimeout(() => {
            if (settled) return;
            if (childHasExited(child)) {
                resolveOnce();
                return;
            }
            try {
                child.kill('SIGKILL');
            } catch (_) {
                // The exit event remains the only termination proof.
            }
            if (childHasExited(child)) resolveOnce();
        }, Math.max(0, Number(forceAfterMs) || 0));
        if (typeof forceTimer?.unref === 'function') forceTimer.unref();
    });
}

function createRequestStartupTimeoutError({ generation, requestId, timeoutMs }) {
    const error = new AnalyzerStartupError(
        'ANALYZER_REQUEST_TIMEOUT',
        'analyzer startup exceeded the request deadline',
        {
            generation,
            request_id: requestId,
            phase: 'startup',
            timeout_ms: Math.ceil(timeoutMs)
        }
    );
    error.retryable = true;
    return error;
}

function createHelloTimeoutError({
    generation,
    requestId,
    requestedTimeoutMs,
    helloTimeoutMs,
    defaultHelloTimeoutMs
}) {
    const requestDeadlineWon = requestedTimeoutMs !== null
        && requestedTimeoutMs <= defaultHelloTimeoutMs;
    if (requestDeadlineWon) {
        const error = new AnalyzerStartupError(
            'ANALYZER_REQUEST_TIMEOUT',
            'analyzer startup exceeded the request deadline',
            {
                generation,
                request_id: requestId,
                phase: 'hello',
                timeout_ms: Math.ceil(helloTimeoutMs)
            }
        );
        error.retryable = true;
        return error;
    }
    return new AnalyzerStartupError(
        'ANALYZER_HELLO_TIMEOUT',
        'analyzer hello handshake timed out',
        { generation, request_id: requestId }
    );
}

class AnalyzerProcessManager extends EventEmitter {
    constructor({
        analyzerPath,
        args = [],
        cwd = process.cwd(),
        env = {},
        spawnImpl = spawn,
        tracker = null,
        requestTimeoutMs = 120000,
        helloTimeoutMs = requestTimeoutMs,
        cancelGraceMs = 1000,
        terminationGraceMs = 1000,
        homedir = os.homedir
    } = {}) {
        super();
        if (!analyzerPath) throw new Error('analyzerPath is required');
        this.analyzerPath = analyzerPath;
        this.args = [...args];
        this.cwd = cwd;
        this.env = { ...env };
        this.spawnImpl = spawnImpl;
        this.tracker = tracker || new AnalyzerRequestTracker({ defaultTimeoutMs: requestTimeoutMs });
        this.requestTimeoutMs = requestTimeoutMs;
        this.helloTimeoutMs = Number.isFinite(helloTimeoutMs) && helloTimeoutMs > 0
            ? helloTimeoutMs
            : (Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 120000);
        this.cancelGraceMs = Number.isFinite(cancelGraceMs) && cancelGraceMs >= 0
            ? cancelGraceMs
            : 1000;
        this.terminationGraceMs = Number.isFinite(terminationGraceMs) && terminationGraceMs >= 0
            ? terminationGraceMs
            : 1000;
        this.homedir = homedir;
        this.child = null;
        this.stdoutBuffer = '';
        this.requests = new Map();
        this.startPromise = null;
        this.startupReject = null;
        this.handshake = null;
        this.stopping = false;
        this.startupFailure = null;
        this.generation = 0;
        this.readyGeneration = null;
        this.sessionsRoot = null;
        this.startupArgs = null;
        this.activeRequest = null;
        this.idleWaiters = new Set();
        this.processInvalidationPromise = null;
    }

    async start({ timeoutMs = null } = {}) {
        const requestedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
            ? timeoutMs
            : null;
        if (this.processInvalidationPromise) {
            const invalidation = this.processInvalidationPromise;
            await invalidation.catch(() => {});
            if (this.processInvalidationPromise === invalidation) {
                this.processInvalidationPromise = null;
            }
            return this.start({ timeoutMs });
        }
        if (this.child && this.startupFailure) throw this.startupFailure;
        if (this.stopping) {
            throw new AnalyzerStartupError(
                'ANALYZER_PROCESS_STOPPED',
                'analyzer process is stopping'
            );
        }
        if (this.child && this.startPromise) {
            return this._awaitStartPromise(this.startPromise, requestedTimeoutMs);
        }
        if (this.child) return this;
        if (this.startPromise) {
            return this._awaitStartPromise(this.startPromise, requestedTimeoutMs);
        }

        const helloTimeoutMs = requestedTimeoutMs === null
            ? this.helloTimeoutMs
            : Math.min(this.helloTimeoutMs, requestedTimeoutMs);

        const childEnv = { ...process.env, ...this.env };
        const sessionsRoot = resolveSessionsRoot({
            env: childEnv,
            homedir: this.homedir
        });
        const startupArgs = buildStartupArgs(this.args, sessionsRoot);
        this.sessionsRoot = sessionsRoot;
        this.startupArgs = startupArgs;
        this.stopping = false;
        this.startupFailure = null;
        const generation = this.generation + 1;
        this.generation = generation;
        this.readyGeneration = null;
        this.stdoutBuffer = '';
        let synchronousSpawnFailure = false;
        const startPromise = new Promise((resolve, reject) => {
            let settled = false;
            let child;
            try {
                child = this.spawnImpl(this.analyzerPath, startupArgs, {
                    cwd: this.cwd,
                    env: childEnv,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    windowsHide: true
                });
            } catch (error) {
                synchronousSpawnFailure = true;
                reject(error);
                return;
            }
            this.child = child;
            const resolveOnce = () => {
                if (settled) return;
                settled = true;
                if (this.startupReject === rejectOnce) this.startupReject = null;
                resolve(this);
            };
            const rejectOnce = (error) => {
                if (settled) return;
                settled = true;
                if (this.startupReject === rejectOnce) this.startupReject = null;
                this.startPromise = null;
                reject(error);
            };
            this.startupReject = rejectOnce;
            const isCurrentProcess = () => (
                this.generation === generation && this.child === child
            );
            let spawned = false;
            const failCurrentProcess = (error, source) => {
                if (!isCurrentProcess()) {
                    this.emit('staleProcessError', { generation, error, source });
                    return;
                }
                const processError = normalizeProcessUnavailableError(error);
                // A process/stdio error is not proof that the child has exited.
                // Keep the same termination fence for both error surfaces.
                if ((spawned || source === 'stdin') && !childHasExited(child)) {
                    this._trackProcessTermination(child);
                }
                this._handleProcessFailure(processError, { generation, child });
                if (this.child === child) {
                    // Mark the failed child unavailable immediately. The exit
                    // event may arrive later; its generation/child guard then
                    // prevents it from clearing a replacement process.
                    this._detachCurrentProcess(child);
                }
                try {
                    if (child.exitCode === null && child.signalCode === null) child.kill();
                } catch (_) {
                    // The termination fence remains until exit/status proof.
                }
                rejectOnce(processError);
            };
            child.once('spawn', () => {
                if (!isCurrentProcess()) return;
                spawned = true;
                const requestId = `node-hello-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                const timer = setTimeout(() => {
                    this._failStartup(createHelloTimeoutError({
                        generation,
                        requestId,
                        requestedTimeoutMs,
                        helloTimeoutMs,
                        defaultHelloTimeoutMs: this.helloTimeoutMs
                    }), { generation, child });
                }, helloTimeoutMs);
                if (typeof timer?.unref === 'function') timer.unref();
                this.handshake = {
                    requestId,
                    generation,
                    resolve: resolveOnce,
                    reject: rejectOnce,
                    timer
                };
                try {
                    this.send(createHello(requestId));
                } catch (error) {
                    this._failStartup(error, { generation, child });
                }
            });
            child.on('error', (error) => failCurrentProcess(error, 'child'));
            child.stdin?.on?.('error', (error) => failCurrentProcess(error, 'stdin'));
            child.stdout?.on('data', (chunk) => this._consumeStdout(chunk, { generation, child }));
            child.stderr?.on('data', (chunk) => {
                if (!isCurrentProcess()) return;
                const text = String(chunk);
                this.emit('diagnostic', text);
            });
            child.once('exit', (code, signal) => {
                if (!isCurrentProcess()) {
                    this.emit('staleExit', { code, signal, generation });
                    return;
                }
                const error = this.stopping
                    ? null
                    : Object.assign(new Error(`analyzer exited before completion (${code ?? 'null'}/${signal ?? 'none'})`), {
                        code: 'ANALYZER_PROCESS_EXIT'
                });
                const expected = this.stopping;
                if (this.handshake) {
                    const handshake = this.handshake;
                    this._clearHandshake(handshake);
                    handshake.reject(error || Object.assign(new Error('analyzer exited during hello handshake'), {
                        code: 'ANALYZER_HELLO_FAILED'
                    }));
                }
                if (error) this._handleProcessFailure(error, { generation, child });
                else this._releaseActiveRequest({ generation, child });
                this.child = null;
                this.startPromise = null;
                this.startupFailure = null;
                this.readyGeneration = null;
                this.emit('exit', { code, signal, expected, generation });
                if (error) rejectOnce(error);
            });
        });
        this.startPromise = synchronousSpawnFailure ? null : startPromise;
        return this._awaitStartPromise(startPromise, requestedTimeoutMs);
    }

    async _awaitStartPromise(startPromise, timeoutMs) {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return startPromise;
        let timeoutId = null;
        let timedOut = false;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                timedOut = true;
                reject(createRequestStartupTimeoutError({
                    generation: this.generation,
                    requestId: this.handshake?.requestId || null,
                    timeoutMs
                }));
            }, timeoutMs);
        });
        try {
            return await Promise.race([startPromise, timeoutPromise]);
        } catch (error) {
            if (timedOut) {
                try {
                    await this.stop();
                } catch (_) {
                    // The request deadline remains authoritative.
                }
            }
            throw error;
        } finally {
            if (timeoutId !== null) clearTimeout(timeoutId);
        }
    }

    send(message) {
        if (message?.message_type === 'analyze'
            && this.readyGeneration !== this.generation) {
            throw new AnalyzerStartupError(
                'ANALYZER_HANDSHAKE_REQUIRED',
                'analyzer hello handshake must complete before analyze messages are sent',
                { generation: this.generation }
            );
        }
        if (message?.message_type === 'analyze'
            && (!this.activeRequest || this.activeRequest.requestId !== message.request_id)) {
            throw new AnalyzerStartupError(
                'ANALYZER_REQUEST_NOT_REGISTERED',
                'analyze messages must be sent through an active tracked request',
                { request_id: message.request_id, generation: this.generation }
            );
        }
        if (!this.child
            || !this.child.stdin
            || this.child.stdin.destroyed
            || this.child.stdin.writable === false) {
            throw createProcessNotRunningError();
        }
        const line = encodeMessage(message);
        try {
            this.child.stdin.write(line);
        } catch (error) {
            throw normalizeProcessUnavailableError(error);
        }
        this.emit('sent', message);
        return message;
    }

    async request(request, {
        onBatch = null,
        onComplete = null,
        timeoutMs = this.requestTimeoutMs,
        attempt = 0
    } = {}) {
        await this.start({ timeoutMs });
        const requestId = request?.request_id;
        if (!requestId) throw new AnalyzerProtocolError('missing_field', 'request_id is required');
        if (this.requests.has(requestId)) {
            const error = new Error(`analyzer request already active: ${requestId}`);
            error.code = 'ANALYZER_REQUEST_DUPLICATE';
            throw error;
        }
        if (this.activeRequest) {
            const error = new Error('analyzer process already has an active request');
            error.code = 'ANALYZER_REQUEST_ACTIVE';
            error.details = {
                request_id: this.activeRequest.requestId,
                generation: this.activeRequest.generation,
                attempt: this.activeRequest.attempt
            };
            throw error;
        }
        const state = {
            requestId,
            generation: this.generation,
            attempt,
            child: this.child,
            onBatch,
            onComplete,
            cancelTimer: null,
            batchRejection: null,
            lastAcceptedDelivery: null,
            // Rust may emit more than one observation of the same delivery
            // before the first ACK round trip produces complete. Keep the
            // callbacks in wire order so complete cannot release the request
            // while an already received batch is still awaiting its ACK.
            batchDrain: Promise.resolve()
        };
        this.requests.set(requestId, state);
        this.activeRequest = state;
        let promise;
        try {
            promise = this.tracker.track(requestId, {
                timeoutMs,
                generation: state.generation,
                attempt: state.attempt,
                onTimeout: () => this._beginCancellation(state, 'request_timeout')
            });
            promise.catch(() => {});
        } catch (error) {
            this._finishRequest(state);
            throw error;
        }
        try {
            this.send(request);
        } catch (error) {
            const invalidation = isProcessUnavailableError(error)
                ? this._invalidateCurrentProcess(state)
                : null;
            this.tracker.reject(requestId, error, this._scopeOf(state));
            this._finishRequest(state);
            invalidation?.catch(() => {});
        }
        return promise;
    }

    cancel(requestId, reason = 'cancelled_by_caller') {
        const state = this.requests.get(requestId);
        if (!state || !this.tracker.has(requestId)) return false;
        const scope = this._scopeOf(state);
        const cancelled = this.tracker.cancel(requestId, reason, scope);
        if (!cancelled) return false;
        this._beginCancellation(state, reason);
        return true;
    }

    waitForIdle() {
        const active = this.activeRequest
            ? new Promise((resolve) => this.idleWaiters.add(resolve))
            : Promise.resolve();
        const invalidation = this.processInvalidationPromise || Promise.resolve();
        return Promise.all([active, invalidation]).then(() => undefined);
    }

    async stop() {
        this.stopping = true;
        this.readyGeneration = null;
        const child = this.child;
        const termination = child
            ? this._beginProcessInvalidation(child)
            : this.processInvalidationPromise;
        const error = new Error('analyzer process stopped');
        error.code = 'ANALYZER_PROCESS_STOPPED';
        this.tracker.rejectAll(error);
        for (const state of this.requests.values()) this._clearCancellationTimer(state);
        this.requests.clear();
        this.activeRequest = null;
        this._resolveIdleWaiters();
        if (this.handshake) {
            const handshake = this.handshake;
            this._clearHandshake(handshake);
            handshake.reject(error);
        } else if (this.startupReject) {
            this.startupReject(error);
        }
        if (!child) {
            await this.waitForIdle();
            this.stopping = false;
            return;
        }
        try {
            if (!childHasExited(child)) child.kill();
        } catch (_) {
            // Best effort; the child may already have exited.
        }
        await termination;
        this.stopping = false;
        await this.waitForIdle();
    }

    async _invalidateCurrentProcess(state) {
        if (!state || !this._isCurrentProcess(state.generation, state.child)) return;
        const child = state.child;
        const termination = this._beginProcessInvalidation(child, {
            clearStartupFailure: true
        });
        try {
            if (!childHasExited(child)) child.kill();
        } catch (_) {
            // The child is already detached from the active generation.
        }
        await termination;
    }

    _trackProcessTermination(child) {
        if (!child) return Promise.resolve();
        if (this.processInvalidationPromise) return this.processInvalidationPromise;
        const termination = waitForChildExit(child, this.terminationGraceMs);
        const trackedTermination = termination.finally(() => {
            if (this.processInvalidationPromise === trackedTermination) {
                this.processInvalidationPromise = null;
                this._resolveIdleWaiters();
            }
        });
        this.processInvalidationPromise = trackedTermination;
        return trackedTermination;
    }

    _detachCurrentProcess(child, { clearStartupFailure = false } = {}) {
        if (this.child !== child) return false;
        this.child = null;
        this.startPromise = null;
        this.readyGeneration = null;
        if (clearStartupFailure) this.startupFailure = null;
        this.stdoutBuffer = '';
        return true;
    }

    _beginProcessInvalidation(child, options = {}) {
        if (!child) return this.processInvalidationPromise || Promise.resolve();
        const termination = this._trackProcessTermination(child);
        this._detachCurrentProcess(child, options);
        return termination;
    }

    _consumeStdout(chunk, processScope = {}) {
        if (processScope.generation !== undefined
            && !this._isCurrentProcess(processScope.generation, processScope.child)) {
            return;
        }
        this.stdoutBuffer += String(chunk);
        let newlineIndex = this.stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
            const line = this.stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
            this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
            newlineIndex = this.stdoutBuffer.indexOf('\n');
            if (!line.trim()) continue;
            try {
                const message = parseLine(line);
                if (message) this._handleMessage(message, processScope);
            } catch (error) {
                const protocolError = error instanceof AnalyzerProtocolError
                    ? error
                    : new AnalyzerProtocolError('malformed_protocol', error.message);
                this.emit('protocolError', protocolError);
                this._failStartup(protocolError, processScope);
            }
        }
    }

    _handleMessage(message, processScope = {}) {
        if (processScope.generation !== undefined
            && !this._isCurrentProcess(processScope.generation, processScope.child)) {
            this.emit('staleMessage', { message, generation: processScope.generation });
            return;
        }
        this.emit('message', message);
        if (message.message_type === 'hello') {
            if (!this.handshake) {
                this.emit('unexpectedMessage', message);
                return;
            }
            if (this.handshake) {
                if (message.request_id !== this.handshake.requestId) {
                    const expected = this.handshake.requestId;
                    this._failStartup(createHelloFailure(
                        'ANALYZER_HELLO_REQUEST_MISMATCH',
                        'analyzer hello request_id does not match the Node hello',
                        { expected_request_id: expected, actual_request_id: message.request_id }
                    ), processScope);
                    return;
                }
                if (message.role !== 'analyzer') {
                    this._failStartup(createHelloFailure(
                        'ANALYZER_HELLO_ROLE_INVALID',
                        'analyzer hello must use role=analyzer',
                        { actual_role: message.role }
                    ), processScope);
                    return;
                }
                let capabilities = [];
                try {
                    capabilities = canonicalizeCapabilities(message.capabilities);
                } catch (error) {
                    this._failStartup(error, processScope);
                    return;
                }
                if (!hasRequiredCapabilities(capabilities)) {
                    this._failStartup(createHelloFailure(
                        'ANALYZER_HELLO_CAPABILITIES_UNSUPPORTED',
                        'analyzer hello does not advertise the required target capabilities',
                        {
                            required_capabilities: [...REQUIRED_CAPABILITIES],
                            actual_capabilities: capabilities
                        }
                    ), processScope);
                    return;
                }
                const handshake = this.handshake;
                this.readyGeneration = handshake.generation;
                this._clearHandshake(handshake);
                handshake.resolve();
            }
            this.emit('hello', message);
            return;
        }
        const requestId = message.request_id;
        const state = this.requests.get(requestId);
        const allowTerminalMessage = message.message_type === 'error';
        if (!state || !this._isCurrentRequest(state, { allowSettled: allowTerminalMessage })) {
            this.emit('unexpectedMessage', message);
            return;
        }
        if (message.message_type === 'batch') {
            state.batchDrain = (state.batchDrain || Promise.resolve())
                .catch(() => {})
                .then(() => (typeof state.onBatch === 'function' ? state.onBatch(message) : null))
                .then((result) => {
                    if (!this._isCurrentRequest(state)) return;
                    const accepted = result?.accepted !== false;
                    const persisted = result?.persisted !== false;
                    if (!accepted || !persisted) {
                        const rejectionCode = stableBatchRejectionCode(result);
                        state.batchRejection = {
                            code: rejectionCode,
                            jobId: message.job_id,
                            segmentId: message.segment_id,
                            batchId: message.batch_id
                        };
                        try {
                            this.send(createAck({
                                requestId,
                                jobId: message.job_id,
                                segmentId: message.segment_id,
                                batchId: message.batch_id,
                                accepted: false,
                                persisted: false,
                                error: rejectionCode
                            }));
                        } catch (sendError) {
                            state.batchRejection = null;
                            const requestError = sendError;
                            const invalidation = isProcessUnavailableError(requestError)
                                ? this._invalidateCurrentProcess(state)
                                : null;
                            this.tracker.reject(requestId, requestError, this._scopeOf(state));
                            this._finishRequest(state, {
                                markTerminated: isProcessUnavailableError(requestError)
                            });
                            invalidation?.catch(() => {});
                        }
                        // A negative ACK is not a caller-visible terminal
                        // event.  Keep the request and its single-flight slot
                        // until Rust confirms it with batch_rejected.
                        return;
                    }
                    this.send(createAck({
                        requestId,
                        jobId: message.job_id,
                        segmentId: message.segment_id,
                        batchId: message.batch_id,
                        accepted: true,
                        persisted: true
                    }));
                    state.lastAcceptedDelivery = acceptedDeliveryOf(message);
                    this.tracker.advancePhase(requestId, 'complete', this._scopeOf(state));
                })
                .catch((error) => {
                    if (!this._isCurrentRequest(state)) return;
                    const rejectionCode = stableBatchRejectionCode(error);
                    state.batchRejection = {
                        code: rejectionCode,
                        jobId: message.job_id,
                        segmentId: message.segment_id,
                        batchId: message.batch_id
                    };
                    let ackError = null;
                    try {
                        this.send(createAck({
                            requestId,
                            jobId: message.job_id,
                            segmentId: message.segment_id,
                            batchId: message.batch_id,
                            accepted: false,
                            persisted: false,
                            error: rejectionCode
                        }));
                    } catch (sendError) {
                        ackError = sendError;
                    }
                    if (!ackError) {
                        // The analyzer owns the terminal error after it has
                        // observed this stable negative ACK.  Do not reject
                        // or release the request from the local callback.
                        return;
                    }
                    state.batchRejection = null;
                    const requestError = isProcessUnavailableError(ackError)
                        ? ackError
                        : error;
                    const invalidation = isProcessUnavailableError(requestError)
                        ? this._invalidateCurrentProcess(state)
                        : null;
                    this.tracker.reject(requestId, requestError, this._scopeOf(state));
                    this._finishRequest(state, {
                        markTerminated: isProcessUnavailableError(requestError)
                    });
                    invalidation?.catch(() => {});
                });
            return;
        }
        if (message.message_type === 'complete') {
            state.batchDrain = (state.batchDrain || Promise.resolve())
                .catch(() => {})
                .then(() => {
                    if (state.batchRejection) {
                        this.emit('unexpectedMessage', {
                            reason: 'complete_before_batch_rejected',
                            message,
                            expected_rejection_code: state.batchRejection.code
                        });
                        return;
                    }
                    return Promise.resolve()
                        .then(() => (typeof state.onComplete === 'function'
                            ? state.onComplete(message, {
                                acceptedDelivery: state.lastAcceptedDelivery
                                    ? { ...state.lastAcceptedDelivery, scope: state.lastAcceptedDelivery.scope
                                        ? { ...state.lastAcceptedDelivery.scope }
                                        : null }
                                    : null
                            })
                            : null))
                        .then(() => {
                            if (!this._isCurrentRequest(state)) return;
                            this.tracker.resolve(requestId, message, this._scopeOf(state));
                            this._finishRequest(state);
                        })
                        .catch((error) => {
                            if (!this._isCurrentRequest(state)) return;
                            this.tracker.reject(requestId, error, this._scopeOf(state));
                            this._finishRequest(state);
                        });
                });
            return;
        }
        if (message.message_type === 'error') {
            let error = new Error(message.message);
            error.code = message.code || 'ANALYZER_ERROR';
            error.details = message.details;
            error.retryable = message.retryable;
            error.fatal = message.fatal;
            if (state.batchRejection) {
                const actualRejectionCode = message.code === 'batch_rejected'
                    ? message.details?.rejection_code
                    : null;
                if (actualRejectionCode !== state.batchRejection.code) {
                    error = batchRejectionMismatchError(
                        requestId,
                        state.batchRejection.code,
                        actualRejectionCode || message.code
                    );
                } else {
                    error.details = {
                        ...(message.details || {}),
                        job_id: state.batchRejection.jobId,
                        segment_id: state.batchRejection.segmentId,
                        batch_id: state.batchRejection.batchId
                    };
                }
            }
            const invalidation = error.fatal === true
                ? this._invalidateCurrentProcess(state)
                : null;
            const trackerState = this.tracker.get(requestId);
            const terminationPending = error.fatal !== true
                && Boolean(trackerState?.cancel_requested || trackerState?.timeout_requested);
            this.tracker.reject(requestId, error, this._scopeOf(state));
            if (terminationPending) {
                // A cancelled/timed-out request may already have settled its
                // public promise.  The worker is still live, however, so its
                // active slot and cancellation grace timer must remain until
                // the child exit event proves that it can emit no more data.
                invalidation?.catch(() => {});
                return;
            }
            this._finishRequest(state, { markTerminated: error.fatal === true });
            invalidation?.catch(() => {});
        }
    }

    _handleProcessFailure(error, processScope = {}) {
        if (processScope.generation !== undefined
            && !this._isCurrentProcess(processScope.generation, processScope.child)) {
            return false;
        }
        this.readyGeneration = null;
        for (const state of this.requests.values()) this._clearCancellationTimer(state);
        this.requests.clear();
        if (this.handshake) {
            const handshake = this.handshake;
            this._clearHandshake(handshake);
            handshake.reject(error);
        }
        this.tracker.rejectAll(error);
        this.activeRequest = null;
        this._resolveIdleWaiters();
        this.emit('failure', error);
        return true;
    }

    _failStartup(error, processScope = {}) {
        if (processScope.generation !== undefined
            && !this._isCurrentProcess(processScope.generation, processScope.child)) {
            return;
        }
        const child = this.child;
        if (child && !childHasExited(child)) {
            // A startup/protocol failure is not proof that the child has exited.
            // Establish the termination fence before releasing logical state.
            this._trackProcessTermination(child);
        }
        this.startupFailure = error;
        this._handleProcessFailure(error, processScope);
        if (!child) return;
        this.stopping = true;
        try {
            if (!childHasExited(child)) child.kill();
        } catch (_) {
            // Best effort; the startup failure is already authoritative.
        }
    }

    _clearHandshake(handshake) {
        if (!handshake) return;
        if (handshake.timer) clearTimeout(handshake.timer);
        if (this.handshake === handshake) this.handshake = null;
    }

    _isCurrentProcess(generation, child) {
        return this.generation === generation && this.child === child;
    }

    _isCurrentRequest(state, { allowSettled = false } = {}) {
        const trackerState = this.tracker.get(state?.requestId);
        return this.activeRequest === state
            && this.requests.get(state.requestId) === state
            && this._isCurrentProcess(state.generation, state.child)
            && (allowSettled || Boolean(
                trackerState
                && !trackerState.settled
                && !trackerState.cancel_requested
                && !trackerState.timeout_requested
            ));
    }

    _scopeOf(state) {
        return { generation: state.generation, attempt: state.attempt };
    }

    _beginCancellation(state, reason) {
        if (!this._isCurrentRequest(state, { allowSettled: true })) return false;
        try {
            this.send(createCancel(state.requestId, reason));
        } catch (_) {
            // A process failure/exit will release the request slot below.
        }
        this._clearCancellationTimer(state);
        if (this.cancelGraceMs === 0) {
            this._forceTerminate(state);
        } else {
            state.cancelTimer = setTimeout(() => this._forceTerminate(state), this.cancelGraceMs);
            if (typeof state.cancelTimer?.unref === 'function') state.cancelTimer.unref();
        }
        return true;
    }

    _forceTerminate(state) {
        if (!this._isCurrentRequest(state, { allowSettled: true })) return;
        const child = state.child;
        if (!child || child.exitCode !== null || child.signalCode !== null) {
            this._finishRequest(state, { markTerminated: true });
            return;
        }
        try {
            child.kill();
        } catch (_) {
            // Keep the active slot occupied until an exit event or stop()
            // proves that the worker is no longer able to emit messages.
        }
    }

    _clearCancellationTimer(state) {
        if (!state?.cancelTimer) return;
        clearTimeout(state.cancelTimer);
        state.cancelTimer = null;
    }

    _finishRequest(state, { markTerminated = false } = {}) {
        if (!state) return false;
        this._clearCancellationTimer(state);
        if (markTerminated) {
            this.tracker.markTerminated(state.requestId, this._scopeOf(state));
        }
        if (this.requests.get(state.requestId) === state) this.requests.delete(state.requestId);
        if (this.activeRequest !== state) return false;
        this.activeRequest = null;
        this._resolveIdleWaiters();
        return true;
    }

    _releaseActiveRequest(processScope = {}) {
        const state = this.activeRequest;
        if (!state) return;
        if (processScope.generation !== undefined
            && (state.generation !== processScope.generation || state.child !== processScope.child)) {
            return;
        }
        this._finishRequest(state, { markTerminated: true });
    }

    _resolveIdleWaiters() {
        if (this.activeRequest || this.processInvalidationPromise) return;
        const waiters = [...this.idleWaiters];
        this.idleWaiters.clear();
        for (const resolve of waiters) resolve();
    }
}

module.exports = {
    AnalyzerProcessManager,
    AnalyzerStartupError,
    STARTUP_CONFIG_VERSION,
    resolveSessionsRoot,
    buildStartupArgs,
    resolveAnalyzerExecutable
};
