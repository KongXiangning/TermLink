'use strict';

const MAX_IPC_FRAME_BYTES = 256 * 1024 * 1024; // 256 MiB
const MAX_IPC_BUFFER_BYTES = 512 * 1024 * 1024; // 512 MiB

/**
 * Encode a message into an IPC frame: 4-byte little-endian payload length
 * followed by the JSON-encoded payload.
 *
 * @param {unknown} message
 * @returns {Buffer}
 */
function encodeFrame(message) {
    const payloadText = typeof message === 'string' ? message : JSON.stringify(message);
    const payloadBytes = Buffer.byteLength(payloadText, 'utf8');
    const frame = Buffer.allocUnsafe(4 + payloadBytes);

    frame.writeUInt32LE(payloadBytes, 0);
    frame.write(payloadText, 4, 'utf8');

    return frame;
}

class IpcFrameDecoder {
    constructor() {
        this._buffer = Buffer.alloc(0);
        this._expectedPayloadBytes = undefined;
    }

    /**
     * Feed a raw chunk from the pipe into the decoder.
     *
     * @param {Buffer} chunk
     * @returns {Array<{frameBytes: number, payloadBytes: number, rawFrame: Buffer, payload: Buffer, parsed?: unknown, parseError?: string}>}
     */
    push(chunk) {
        if (chunk.length === 0) {
            return [];
        }

        if (this._buffer.length + chunk.length > MAX_IPC_BUFFER_BYTES) {
            this.reset();
            throw new Error(
                `[IPC] Buffer exceeded limit (${MAX_IPC_BUFFER_BYTES} bytes)`
            );
        }

        this._buffer = Buffer.concat([this._buffer, chunk]);
        const frames = [];

        while (true) {
            // Need at least 4 bytes for the length prefix.
            if (this._expectedPayloadBytes === undefined) {
                if (this._buffer.length < 4) {
                    break;
                }

                this._expectedPayloadBytes = this._buffer.readUInt32LE(0);
                this._buffer = this._buffer.subarray(4);

                if (this._expectedPayloadBytes > MAX_IPC_FRAME_BYTES) {
                    const size = this._expectedPayloadBytes;
                    this.reset();
                    throw new Error(
                        `[IPC] Frame exceeded limit (${size} > ${MAX_IPC_FRAME_BYTES} bytes)`
                    );
                }
            }

            if (this._buffer.length < this._expectedPayloadBytes) {
                break;
            }

            const payload = this._buffer.subarray(0, this._expectedPayloadBytes);
            this._buffer = this._buffer.subarray(this._expectedPayloadBytes);

            const header = Buffer.allocUnsafe(4);
            header.writeUInt32LE(this._expectedPayloadBytes, 0);
            const rawFrame = Buffer.concat([header, payload]);

            const frame = {
                frameBytes: rawFrame.length,
                payloadBytes: payload.length,
                rawFrame,
                payload
            };

            try {
                frame.parsed = JSON.parse(payload.toString('utf8'));
            } catch (error) {
                frame.parseError = error instanceof Error ? error.message : String(error);
            }

            frames.push(frame);
            this._expectedPayloadBytes = undefined;
        }

        return frames;
    }

    reset() {
        this._buffer = Buffer.alloc(0);
        this._expectedPayloadBytes = undefined;
    }
}

/**
 * Return the UTF-8 text of a decoded frame's payload.
 *
 * @param {{payload: Buffer}} frame
 * @returns {string}
 */
function framePayloadText(frame) {
    return frame.payload.toString('utf8');
}

module.exports = {
    MAX_IPC_FRAME_BYTES,
    MAX_IPC_BUFFER_BYTES,
    encodeFrame,
    IpcFrameDecoder,
    framePayloadText
};
