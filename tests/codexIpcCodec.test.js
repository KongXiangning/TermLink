'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    MAX_IPC_FRAME_BYTES,
    MAX_IPC_BUFFER_BYTES,
    encodeFrame,
    IpcFrameDecoder,
    framePayloadText
} = require('../src/services/codexIpcCodec');

// ── encodeFrame ──────────────────────────────────────────────────────────────

test('encodeFrame produces a 4-byte LE length prefix + JSON payload', () => {
    const msg = { type: 'broadcast', method: 'test' };
    const frame = encodeFrame(msg);

    const lengthPrefix = frame.readUInt32LE(0);
    const payload = frame.subarray(4).toString('utf8');

    assert.equal(lengthPrefix, Buffer.byteLength(payload, 'utf8'));
    assert.deepEqual(JSON.parse(payload), msg);
});

test('encodeFrame accepts a plain string', () => {
    const frame = encodeFrame('hello');
    const lengthPrefix = frame.readUInt32LE(0);
    const payload = frame.subarray(4).toString('utf8');

    assert.equal(lengthPrefix, 5);
    assert.equal(payload, 'hello');
});

test('encodeFrame handles empty object', () => {
    const frame = encodeFrame({});
    const lengthPrefix = frame.readUInt32LE(0);
    const payload = frame.subarray(4).toString('utf8');

    assert.equal(lengthPrefix, 2); // "{}"
    assert.equal(payload, '{}');
});

// ── IpcFrameDecoder ──────────────────────────────────────────────────────────

test('IpcFrameDecoder decodes a single complete frame', () => {
    const decoder = new IpcFrameDecoder();
    const frame = encodeFrame({ type: 'broadcast', method: 'hello' });
    const results = decoder.push(frame);

    assert.equal(results.length, 1);
    assert.equal(results[0].frameBytes, frame.length);
    assert.equal(results[0].payloadBytes, frame.length - 4);
    assert.ok(results[0].rawFrame instanceof Buffer);
    assert.ok(results[0].payload instanceof Buffer);
    assert.deepEqual(results[0].parsed, { type: 'broadcast', method: 'hello' });
    assert.equal(results[0].parseError, undefined);
});

test('IpcFrameDecoder decodes multiple complete frames in one chunk', () => {
    const decoder = new IpcFrameDecoder();
    const f1 = encodeFrame({ n: 1 });
    const f2 = encodeFrame({ n: 2 });
    const f3 = encodeFrame({ n: 3 });

    const chunk = Buffer.concat([f1, f2, f3]);
    const results = decoder.push(chunk);

    assert.equal(results.length, 3);
    assert.deepEqual(results[0].parsed, { n: 1 });
    assert.deepEqual(results[1].parsed, { n: 2 });
    assert.deepEqual(results[2].parsed, { n: 3 });
});

test('IpcFrameDecoder handles split frames across multiple push calls', () => {
    const decoder = new IpcFrameDecoder();
    const frame = encodeFrame({ type: 'broadcast', method: 'split' });

    // Push first half (including part of payload).
    const splitPoint = 6; // 4-byte header + 2 bytes of payload
    const part1 = frame.subarray(0, splitPoint);
    const part2 = frame.subarray(splitPoint);

    const r1 = decoder.push(part1);
    assert.equal(r1.length, 0, 'should not emit until frame is complete');

    const r2 = decoder.push(part2);
    assert.equal(r2.length, 1);
    assert.deepEqual(r2[0].parsed, { type: 'broadcast', method: 'split' });
});

test('IpcFrameDecoder handles split length prefix across push calls', () => {
    const decoder = new IpcFrameDecoder();
    const frame = encodeFrame({ ok: true });

    // Push only the first 2 bytes of the 4-byte header.
    const r1 = decoder.push(frame.subarray(0, 2));
    assert.equal(r1.length, 0);

    // Push the rest.
    const r2 = decoder.push(frame.subarray(2));
    assert.equal(r2.length, 1);
    assert.deepEqual(r2[0].parsed, { ok: true });
});

test('IpcFrameDecoder treats malformed JSON as parseError without throwing', () => {
    const decoder = new IpcFrameDecoder();
    const payloadText = '{not valid json';
    const payloadBytes = Buffer.byteLength(payloadText, 'utf8');
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(payloadBytes, 0);
    const chunk = Buffer.concat([header, Buffer.from(payloadText, 'utf8')]);

    const results = decoder.push(chunk);

    assert.equal(results.length, 1);
    assert.equal(results[0].parsed, undefined);
    assert.ok(typeof results[0].parseError === 'string');
    assert.ok(results[0].parseError.length > 0);
});

test('IpcFrameDecoder throws when a single frame exceeds MAX_IPC_FRAME_BYTES', () => {
    const decoder = new IpcFrameDecoder();
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(MAX_IPC_FRAME_BYTES + 1, 0);

    assert.throws(
        () => decoder.push(header),
        /Frame exceeded limit/
    );
});

test('IpcFrameDecoder resets and continues after a frame-too-large error', () => {
    const decoder = new IpcFrameDecoder();
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(MAX_IPC_FRAME_BYTES + 1, 0);

    assert.throws(() => decoder.push(header));

    // Decoder should be usable again after reset.
    const frame = encodeFrame({ ok: true });
    const results = decoder.push(frame);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].parsed, { ok: true });
});

test('IpcFrameDecoder throws when total buffer exceeds MAX_IPC_BUFFER_BYTES', () => {
    // Use a payload length that is well within MAX_IPC_FRAME_BYTES so the
    // frame-size check passes, then push chunks that never deliver the full
    // payload and instead accumulate past MAX_IPC_BUFFER_BYTES.
    const decoder = new IpcFrameDecoder();
    const payloadLen = 10; // tiny payload claim — way under the frame limit
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(payloadLen, 0);

    // Push the header — this sets expectedPayloadBytes = 10 but the payload
    // does not arrive yet.
    const r1 = decoder.push(header);
    assert.equal(r1.length, 0);

    // Push a chunk that pushes total buffered bytes over MAX_IPC_BUFFER_BYTES.
    const bigChunk = Buffer.alloc(MAX_IPC_BUFFER_BYTES + 1, 0x41);
    assert.throws(
        () => decoder.push(bigChunk),
        /Buffer exceeded limit/
    );
});

test('IpcFrameDecoder reset clears internal state', () => {
    const decoder = new IpcFrameDecoder();
    const frame = encodeFrame({ a: 1 });
    // Push only the header.
    decoder.push(frame.subarray(0, 4));
    // The decoder now has expectedPayloadBytes set.

    decoder.reset();

    // After reset, a fresh push of a complete frame should work.
    const results = decoder.push(encodeFrame({ b: 2 }));
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].parsed, { b: 2 });
});

// ── framePayloadText ─────────────────────────────────────────────────────────

test('framePayloadText returns UTF-8 text of payload', () => {
    const message = { text: 'hello 世界' };
    const frame = encodeFrame(message);
    const decoder = new IpcFrameDecoder();
    const results = decoder.push(frame);

    const text = framePayloadText(results[0]);
    assert.equal(text, JSON.stringify(message));
});

// ── max constants ────────────────────────────────────────────────────────────

test('MAX_IPC_FRAME_BYTES is 256 MiB', () => {
    assert.equal(MAX_IPC_FRAME_BYTES, 256 * 1024 * 1024);
});

test('MAX_IPC_BUFFER_BYTES is 512 MiB', () => {
    assert.equal(MAX_IPC_BUFFER_BYTES, 512 * 1024 * 1024);
});
