'use strict';

const { EventEmitter } = require('node:events');
const { createConnection } = require('node:net');
const { join } = require('node:path');
const { encodeFrame, IpcFrameDecoder } = require('./codexIpcCodec');

const DEFAULT_PIPE_PATH = process.platform === 'win32'
    ? '\\\\.\\pipe\\codex-ipc'
    : join('/tmp', 'codex-ipc', 'ipc.sock');

function normalizePipePath(value) {
    const trimmed = String(value).trim();
    if (process.platform === 'win32' && /^[a-z0-9_-]+$/i.test(trimmed)) {
        return `\\\\.\\pipe\\${trimmed}`;
    }
    return trimmed;
}

class CodexIpcTransport extends EventEmitter {
    constructor(pipePath) {
        super();
        this.pipePath = pipePath ? normalizePipePath(pipePath) : DEFAULT_PIPE_PATH;
        this._socket = null;
        this._decoder = new IpcFrameDecoder();
    }

    connect() {
        if (this._socket && !this._socket.destroyed) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const socket = createConnection(this.pipePath);
            let settled = false;

            const onConnect = () => {
                if (settled) return;
                settled = true;
                this._socket = socket;
                this.emit('connect', { pipePath: this.pipePath });
                resolve();
            };

            const onError = (error) => {
                if (!settled) {
                    settled = true;
                    reject(error);
                    return;
                }
                this.emit('error', error);
            };

            socket.on('connect', onConnect);
            socket.on('data', (chunk) => this._handleData(chunk));
            socket.on('error', onError);
            socket.on('close', (hadError) => {
                this._decoder.reset();
                this._socket = null;
                this.emit('close', { hadError });
            });
        });
    }

    send(message) {
        if (!this._socket || this._socket.destroyed || !this._socket.writable) {
            throw new Error('codex-ipc transport is not connected');
        }
        const frame = encodeFrame(message);
        this._socket.write(frame);
        return frame;
    }

    close() {
        if (this._socket) {
            this._socket.destroy();
            this._socket = null;
        }
        this._decoder.reset();
    }

    getPipePath() {
        return this.pipePath;
    }

    _handleData(chunk) {
        let frames;
        try {
            frames = this._decoder.push(chunk);
        } catch (error) {
            this.emit('error', error);
            this.close();
            return;
        }
        for (const frame of frames) {
            this.emit('frame', frame);
            if (frame.parseError) {
                this.emit('parse_error', frame);
            } else {
                this.emit('message', frame.parsed, frame);
            }
        }
    }
}

module.exports = { CodexIpcTransport, DEFAULT_PIPE_PATH, normalizePipePath };
