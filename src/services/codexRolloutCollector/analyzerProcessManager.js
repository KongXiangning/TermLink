'use strict';

const { spawn } = require('node:child_process');
const EventEmitter = require('node:events');
const {
    AnalyzerProtocolError,
    encodeMessage,
    parseLine,
    createAck,
    createCancel,
    createHello
} = require('./analyzerProtocol');
const { AnalyzerRequestTracker } = require('./analyzerRequestTracker');

class AnalyzerProcessManager extends EventEmitter {
    constructor({
        analyzerPath,
        args = [],
        cwd = process.cwd(),
        env = {},
        spawnImpl = spawn,
        tracker = null,
        requestTimeoutMs = 120000
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
        this.child = null;
        this.stdoutBuffer = '';
        this.requests = new Map();
        this.startPromise = null;
        this.handshake = null;
        this.stopping = false;
    }

    async start() {
        if (this.child && this.startPromise) return this.startPromise;
        if (this.child) return this;
        if (this.startPromise) return this.startPromise;

        this.stopping = false;
        this.startPromise = new Promise((resolve, reject) => {
            let settled = false;
            let child;
            try {
                child = this.spawnImpl(this.analyzerPath, this.args, {
                    cwd: this.cwd,
                    env: { ...process.env, ...this.env },
                    stdio: ['pipe', 'pipe', 'pipe'],
                    windowsHide: true
                });
            } catch (error) {
                this.startPromise = null;
                reject(error);
                return;
            }
            this.child = child;
            const resolveOnce = () => {
                if (settled) return;
                settled = true;
                resolve(this);
            };
            const rejectOnce = (error) => {
                if (settled) return;
                settled = true;
                this.startPromise = null;
                reject(error);
            };
            child.once('spawn', () => {
                const requestId = `node-hello-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                this.handshake = {
                    requestId,
                    resolve: resolveOnce,
                    reject: rejectOnce
                };
                try {
                    this.send(createHello(requestId));
                } catch (error) {
                    rejectOnce(error);
                }
            });
            child.once('error', (error) => {
                this._handleProcessFailure(error);
                rejectOnce(error);
            });
            child.stdout?.on('data', (chunk) => this._consumeStdout(chunk));
            child.stderr?.on('data', (chunk) => {
                const text = String(chunk);
                this.emit('diagnostic', text);
            });
            child.once('exit', (code, signal) => {
                const error = this.stopping
                    ? null
                    : Object.assign(new Error(`analyzer exited before completion (${code ?? 'null'}/${signal ?? 'none'})`), {
                        code: 'ANALYZER_PROCESS_EXIT'
                    });
                this.child = null;
                this.startPromise = null;
                if (this.handshake) {
                    this.handshake.reject(error || Object.assign(new Error('analyzer exited during hello handshake'), {
                        code: 'ANALYZER_HELLO_FAILED'
                    }));
                    this.handshake = null;
                }
                if (error) this._handleProcessFailure(error);
                this.emit('exit', { code, signal, expected: this.stopping });
                if (error) rejectOnce(error);
            });
        });
        return this.startPromise;
    }

    send(message) {
        if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
            const error = new Error('analyzer process is not running');
            error.code = 'ANALYZER_PROCESS_NOT_RUNNING';
            throw error;
        }
        const line = encodeMessage(message);
        this.child.stdin.write(line);
        this.emit('sent', message);
        return message;
    }

    async request(request, { onBatch = null, onComplete = null, timeoutMs = this.requestTimeoutMs } = {}) {
        await this.start();
        const requestId = request?.request_id;
        if (!requestId) throw new AnalyzerProtocolError('missing_field', 'request_id is required');
        if (this.requests.has(requestId)) {
            throw new Error(`analyzer request already active: ${requestId}`);
        }
        const promise = this.tracker.track(requestId, {
            timeoutMs,
            onTimeout: () => {
                this._forgetRequest(requestId);
                try {
                    this.send(createCancel(requestId, 'request_timeout'));
                } catch (_) {
                    // The process may already have exited; timeout remains the
                    // caller-visible failure.
                }
            }
        });
        this.requests.set(requestId, { onBatch, onComplete });
        try {
            this.send(request);
        } catch (error) {
            this._forgetRequest(requestId);
            this.tracker.reject(requestId, error);
        }
        return promise;
    }

    cancel(requestId, reason = 'cancelled_by_caller') {
        if (!this.tracker.has(requestId)) return false;
        try {
            this.send(createCancel(requestId, reason));
        } catch (_) {
            // The request is still rejected below even if the process is gone.
        }
        this._forgetRequest(requestId);
        return this.tracker.cancel(requestId, reason);
    }

    async stop() {
        this.stopping = true;
        const error = new Error('analyzer process stopped');
        error.code = 'ANALYZER_PROCESS_STOPPED';
        this.tracker.rejectAll(error);
        this.requests.clear();
        const child = this.child;
        if (!child) return;
        this.child = null;
        const exited = child.exitCode !== null || child.signalCode !== null
            ? Promise.resolve()
            : new Promise((resolve) => child.once('exit', resolve));
        try {
            child.kill();
        } catch (_) {
            // Best effort; the child may already have exited.
        }
        await Promise.race([
            exited,
            new Promise((resolve) => setTimeout(resolve, 1000))
        ]);
    }

    _consumeStdout(chunk) {
        this.stdoutBuffer += String(chunk);
        let newlineIndex = this.stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
            const line = this.stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
            this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
            newlineIndex = this.stdoutBuffer.indexOf('\n');
            if (!line.trim()) continue;
            try {
                const message = parseLine(line);
                if (message) this._handleMessage(message);
            } catch (error) {
                const protocolError = error instanceof AnalyzerProtocolError
                    ? error
                    : new AnalyzerProtocolError('malformed_protocol', error.message);
                this.emit('protocolError', protocolError);
                this._handleProcessFailure(protocolError);
            }
        }
    }

    _handleMessage(message) {
        this.emit('message', message);
        if (message.message_type === 'hello') {
            if (this.handshake && message.request_id === this.handshake.requestId) {
                const handshake = this.handshake;
                this.handshake = null;
                handshake.resolve();
            }
            this.emit('hello', message);
            return;
        }
        const requestId = message.request_id;
        const state = this.requests.get(requestId);
        if (!state) {
            this.emit('unexpectedMessage', message);
            return;
        }
        if (message.message_type === 'batch') {
            Promise.resolve()
                .then(() => (typeof state.onBatch === 'function' ? state.onBatch(message) : null))
                .then((result) => {
                    if (!this.requests.has(requestId)) return;
                    const accepted = result?.accepted !== false;
                    const persisted = result?.persisted !== false;
                    this.send(createAck({
                        requestId,
                        batchId: message.batch_id,
                        accepted,
                        persisted,
                        error: result?.error || null
                    }));
                })
                .catch((error) => {
                    try {
                        this.send(createAck({
                            requestId,
                            batchId: message.batch_id,
                            accepted: false,
                            persisted: false,
                            error: error.message
                        }));
                    } catch (_) {
                        // Process failure is handled by the request rejection.
                    }
                    this._forgetRequest(requestId);
                    this.tracker.reject(requestId, error);
                });
            return;
        }
        if (message.message_type === 'complete') {
            Promise.resolve()
                .then(() => (typeof state.onComplete === 'function' ? state.onComplete(message) : null))
                .then(() => {
                    this._forgetRequest(requestId);
                    this.tracker.resolve(requestId, message);
                })
                .catch((error) => {
                    this._forgetRequest(requestId);
                    this.tracker.reject(requestId, error);
                });
            return;
        }
        if (message.message_type === 'error') {
            const error = new Error(message.message);
            error.code = message.code || 'ANALYZER_ERROR';
            error.details = message.details;
            this._forgetRequest(requestId);
            this.tracker.reject(requestId, error);
        }
    }

    _handleProcessFailure(error) {
        this.requests.clear();
        if (this.handshake) {
            this.handshake.reject(error);
            this.handshake = null;
        }
        this.tracker.rejectAll(error);
        this.emit('failure', error);
    }

    _forgetRequest(requestId) {
        this.requests.delete(requestId);
    }
}

module.exports = { AnalyzerProcessManager };
