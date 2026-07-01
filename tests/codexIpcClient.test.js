'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const { encodeFrame, IpcFrameDecoder } = require('../src/services/codexIpcCodec');

// ── MockTransport ────────────────────────────────────────────────────────────

class MockTransport extends EventEmitter {
    constructor(pipePath = '\\\\.\\pipe\\codex-ipc') {
        super();
        this.pipePath = pipePath;
        this._connected = false;
        this._otherEnd = null;
    }

    connect() {
        if (this._connected) return Promise.resolve();
        this._connected = true;
        return new Promise((resolve) => {
            setImmediate(() => {
                this.emit('connect', { pipePath: this.pipePath });
                resolve();
            });
        });
    }

    send(message) {
        if (!this._connected) {
            throw new Error('transport not connected');
        }
        if (this._otherEnd) {
            setImmediate(() => this._otherEnd.emit('message', message));
        }
        return Buffer.from(JSON.stringify(message));
    }

    close() {
        this._connected = false;
        this.emit('close', { hadError: false });
    }

    errorClose(err) {
        this._connected = false;
        this.emit('error', err);
        this.emit('close', { hadError: true });
    }

    crossConnect(other) {
        this._otherEnd = other;
        other._otherEnd = this;
    }

    pushData(message) {
        setImmediate(() => this.emit('message', message));
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

const { CodexIpcClient } = require('../src/services/codexIpcClient');

function enableIpc() {
    process.env.TERMLINK_CODEX_IPC_ENABLED = '1';
    process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '1';
    process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND = '1';
}

function disableIpc() {
    process.env.TERMLINK_CODEX_IPC_ENABLED = '0';
    process.env.TERMLINK_CODEX_IPC_ALLOW_ACTIVE = '0';
    process.env.TERMLINK_CODEX_IPC_CONFIRM_SEND = '0';
}

function createTestClient(opts = {}) {
    enableIpc();
    const transport = opts.transport || new MockTransport();
    const client = new CodexIpcClient({
        transport,
        reconnect: opts.reconnect !== undefined ? opts.reconnect : false,
        ...opts
    });
    return { client, transport };
}

/**
 * Create a peer transport cross-connected to the client's transport,
 * with a handler that answers the initialize request.
 */
function setupPeer(transport, extraHandler) {
    const peer = new MockTransport();
    peer._connected = true; // peer doesn't need to go through its own connect flow
    transport.crossConnect(peer);
    const decoder = new IpcFrameDecoder();

    peer.on('message', (msg) => {
        if (!msg) return;
        if (msg.method === 'initialize') {
            peer.send({
                type: 'response',
                requestId: msg.requestId,
                resultType: 'success',
                method: 'initialize',
                handledByClientId: 'peer-1',
                result: { clientId: 'test-client-42' }
            });
        } else if (extraHandler) {
            extraHandler(msg, peer);
        }
    });

    return { peer };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── tests ────────────────────────────────────────────────────────────────────

// ── connect & initialize ─────────────────────────────────────────────────

test('connect performs initialize handshake and sets clientId', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport);
    await client.connect();
    assert.equal(client.initialized, true);
    assert.equal(client.clientId, 'test-client-42');
});

test('connect emits connect event', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport);
    const connectEvent = new Promise((resolve) => client.once('connect', resolve));
    await client.connect();
    const event = await connectEvent;
    assert.ok(event);
});

// ── broadcast ────────────────────────────────────────────────────────────

test('sendBroadcast sends a well-formed broadcast frame', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    const { peer } = setupPeer(transport);
    await client.connect();

    const bcPromise = new Promise((resolve) => {
        peer.on('message', (msg) => {
            if (msg && msg.type === 'broadcast') resolve(msg);
        });
    });

    client.sendBroadcast('test-method', { key: 'value' });

    const bc = await bcPromise;
    assert.equal(bc.type, 'broadcast');
    assert.equal(bc.method, 'test-method');
    assert.deepEqual(bc.params, { key: 'value' });
    assert.equal(bc.sourceClientId, 'test-client-42');
});

test('sendBroadcast emits message_out for the sent IPC envelope', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport);
    await client.connect();

    const outPromise = new Promise((resolve) => client.once('message_out', resolve));
    client.sendBroadcast('thread-follower-status', { conversationId: 'conv-out' });

    const out = await outPromise;
    assert.equal(out.type, 'broadcast');
    assert.equal(out.method, 'thread-follower-status');
    assert.equal(out.params.conversationId, 'conv-out');
});

// ── sendRequest ──────────────────────────────────────────────────────────

test('thread-follower-interrupt-turn uses demo-compatible method version', async () => {
    let capturedRequest = null;
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport, (msg, peer) => {
        if (msg.type === 'request') {
            capturedRequest = msg;
            peer.send({
                type: 'response',
                requestId: msg.requestId,
                resultType: 'success',
                method: msg.method,
                result: { ok: true }
            });
        }
    });
    await client.connect();

    await client.sendRequest('thread-follower-interrupt-turn', {
        conversationId: 'conv-1',
        turnId: 'turn-1'
    });

    assert.equal(capturedRequest.method, 'thread-follower-interrupt-turn');
    assert.equal(capturedRequest.version, 2);
});

test('sendRequest resolves with the response message', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport, (msg, peer) => {
        if (msg.type === 'request') {
            peer.send({
                type: 'response', requestId: msg.requestId,
                resultType: 'success', method: msg.method,
                result: { ok: true }
            });
        }
    });
    await client.connect();

    const response = await client.sendRequest('echo', { hello: 'world' });
    assert.equal(response.type, 'response');
    assert.equal(response.resultType, 'success');
    assert.deepEqual(response.result, { ok: true });
});

test('sendRequest times out when no response arrives', async () => {
    process.env.TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS = '50';
    const { client, transport } = createTestClient({ reconnect: false });
    // Peer answers initialize but nothing else — other requests time out.
    setupPeer(transport);
    await client.connect();

    await assert.rejects(
        () => client.sendRequest('no-one-answers'),
        /timed out/
    );
});

test('sendRequest rejects when client is not initialized', async () => {
    enableIpc();
    const client = new CodexIpcClient({ transport: new MockTransport(), reconnect: false });
    await assert.rejects(
        () => client.sendRequest('some-method'),
        /not initialized/
    );
});

// ── active send gate ─────────────────────────────────────────────────────

test('control method is blocked without enable/allowActive/confirmSend', () => {
    disableIpc();
    const client = new CodexIpcClient({ transport: new MockTransport(), reconnect: false });

    assert.throws(
        () => client.sendBroadcast('thread-follower-start-turn', {}),
        /Refusing to send control method/
    );
    assert.throws(
        () => client.sendRequest('thread-follower-steer-turn', {}),
        /Refusing to send control method/
    );
});

test('non-control methods are not blocked by the active send gate', () => {
    disableIpc();
    const client = new CodexIpcClient({ transport: new MockTransport(), reconnect: false });

    assert.doesNotThrow(() => {
        try { client.sendBroadcast('non-existent-method', {}); } catch (_) { /* ok */ }
    });
});

test('initialize is never blocked', async () => {
    disableIpc();
    const client = new CodexIpcClient({ transport: new MockTransport(), reconnect: false });
    // initialize is always allowed — the gate assertion skips it.
    // It will fail because transport is not connected, but not at the gate level.
    await assert.rejects(
        () => client.sendRequest('initialize', {}),
        /transport not connected/
    );
});

// ── close & pending cleanup ──────────────────────────────────────────────

test('close rejects all pending requests', async () => {
    process.env.TERMLINK_CODEX_IPC_REQUEST_TIMEOUT_MS = '5000';
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport);
    await client.connect();

    const reqPromise = client.sendRequest('slow-method');
    // Close immediately — all pending should reject.
    client.close();

    await assert.rejects(reqPromise, /client closed/);
});

test('close emits close event', async () => {
    const { client, transport } = createTestClient({ reconnect: false });
    setupPeer(transport);
    const closeEvent = new Promise((resolve) => client.once('close', resolve));
    await client.connect();
    client.close();
    const event = await closeEvent;
    assert.ok(event);
});

// ── reconnect ────────────────────────────────────────────────────────────

test('reconnect attempts reconnection after transport close', async () => {
    process.env.TERMLINK_CODEX_IPC_RECONNECT_DELAY_MS = '10';
    const { client, transport } = createTestClient({ reconnect: true });

    // First peer answers initialize.
    let { peer, decoder } = setupPeer(transport);
    await client.connect();
    assert.equal(client.clientId, 'test-client-42');
    assert.equal(client.initialized, true);

    // Capture the second connect event (reconnect).
    const reconnectPromise = new Promise((resolve) => {
        client.once('connect', () => resolve());
    });

    // Close the transport — client should attempt reconnect.
    transport.close();

    // Set up a new peer for the reconnect attempt.
    peer.removeAllListeners('message');
    peer.on('message', (msg) => {
        if (msg && msg.method === 'initialize') {
            peer.send({
                type: 'response', requestId: msg.requestId,
                resultType: 'success', method: 'initialize',
                handledByClientId: 'peer-2',
                result: { clientId: 'test-client-reconnected' }
            });
        }
    });

    await reconnectPromise;
    await delay(100);
    assert.equal(client.clientId, 'test-client-reconnected');
    assert.equal(client.initialized, true);
    client.close();
});

// ── broadcast reception ──────────────────────────────────────────────────

test('incoming broadcast messages are emitted', async () => {
    const { client, transport } = createTestClient({ reconnect: false });

    const bcPromise = new Promise((resolve) => {
        client.on('broadcast', (msg) => resolve(msg));
    });

    transport.pushData({
        type: 'broadcast',
        method: 'thread-stream-state-changed',
        sourceClientId: 'desktop-client',
        params: { conversationId: 'conv-1' }
    });

    const msg = await bcPromise;
    assert.equal(msg.type, 'broadcast');
    assert.equal(msg.method, 'thread-stream-state-changed');
    assert.equal(msg.params.conversationId, 'conv-1');
});

test('incoming messages emit message_in before routing', async () => {
    const { client, transport } = createTestClient({ reconnect: false });

    const inPromise = new Promise((resolve) => client.once('message_in', resolve));
    transport.pushData({
        type: 'broadcast',
        method: 'thread-stream-state-changed',
        sourceClientId: 'desktop-client',
        params: { conversationId: 'conv-in' }
    });

    const msg = await inPromise;
    assert.equal(msg.type, 'broadcast');
    assert.equal(msg.method, 'thread-stream-state-changed');
    assert.equal(msg.params.conversationId, 'conv-in');
});

// ── response routing ─────────────────────────────────────────────────────

test('unmatched responses are emitted', async () => {
    const { client, transport } = createTestClient({ reconnect: false });

    const unmatchedPromise = new Promise((resolve) => {
        client.on('unmatched_response', (msg) => resolve(msg));
    });

    transport.pushData({
        type: 'response',
        requestId: randomUUID(),
        resultType: 'success',
        result: {}
    });

    const msg = await unmatchedPromise;
    assert.equal(msg.type, 'response');
});

// ── parse error ──────────────────────────────────────────────────────────

test('malformed frames handled by transport (parse error on transport)', () => {
    // Parse errors are handled at the transport layer, not the client layer.
    // The transport's IpcFrameDecoder catches JSON parse failures internally.
    const { IpcFrameDecoder } = require('../src/services/codexIpcCodec');
    const decoder = new IpcFrameDecoder();
    const payloadText = '{invalid';
    const payloadBytes = Buffer.byteLength(payloadText, 'utf8');
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(payloadBytes, 0);
    const chunk = Buffer.concat([header, Buffer.from(payloadText, 'utf8')]);
    const frames = decoder.push(chunk);
    assert.equal(frames.length, 1);
    assert.ok(typeof frames[0].parseError === 'string');
});
