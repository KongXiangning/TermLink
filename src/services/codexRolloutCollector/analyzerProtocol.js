'use strict';

const PROTOCOL_VERSION = 1;
const MESSAGE_TYPES = Object.freeze([
    'hello',
    'analyze',
    'cancel',
    'batch',
    'ack',
    'complete',
    'error'
]);
const MESSAGE_TYPE_SET = new Set(MESSAGE_TYPES);

class AnalyzerProtocolError extends Error {
    constructor(code, message, details = undefined) {
        super(message || code);
        this.name = 'AnalyzerProtocolError';
        this.code = code;
        if (details !== undefined) this.details = details;
    }
}

function isObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function requireString(message, field) {
    if (!isNonEmptyString(message[field])) {
        throw new AnalyzerProtocolError(
            'missing_field',
            `${field} must be a non-empty string`,
            { field }
        );
    }
}

function requireBoolean(message, field) {
    if (typeof message[field] !== 'boolean') {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field} must be boolean`,
            { field }
        );
    }
}

function validateMessage(message, { allowUnknownMessageType = false } = {}) {
    if (!isObject(message)) {
        throw new AnalyzerProtocolError('invalid_message', 'protocol message must be an object');
    }
    if (message.protocol_version !== PROTOCOL_VERSION) {
        throw new AnalyzerProtocolError(
            'unsupported_protocol_version',
            `expected protocol_version ${PROTOCOL_VERSION}`,
            { expected: PROTOCOL_VERSION, actual: message.protocol_version }
        );
    }
    requireString(message, 'message_type');
    if (!allowUnknownMessageType && !MESSAGE_TYPE_SET.has(message.message_type)) {
        throw new AnalyzerProtocolError(
            'unsupported_message_type',
            `unsupported message_type ${message.message_type}`,
            { messageType: message.message_type }
        );
    }
    requireString(message, 'request_id');

    switch (message.message_type) {
        case 'analyze':
            requireString(message, 'conversation_id');
            if (!isObject(message.source_spec)) {
                throw new AnalyzerProtocolError('missing_field', 'source_spec must be an object', {
                    field: 'source_spec'
                });
            }
            requireString(message.source_spec, 'path');
            requireString(message, 'mode');
            break;
        case 'cancel':
            break;
        case 'batch':
            requireString(message, 'batch_id');
            requireString(message, 'conversation_id');
            requireString(message, 'source_id');
            requireString(message, 'source_epoch');
            if (!Array.isArray(message.history_items)) {
                throw new AnalyzerProtocolError('invalid_field', 'history_items must be an array', {
                    field: 'history_items'
                });
            }
            if (typeof message.complete !== 'boolean') {
                throw new AnalyzerProtocolError('invalid_field', 'complete must be boolean', {
                    field: 'complete'
                });
            }
            break;
        case 'ack':
            requireString(message, 'batch_id');
            requireBoolean(message, 'accepted');
            requireBoolean(message, 'persisted');
            break;
        case 'complete':
            break;
        case 'error':
            requireString(message, 'code');
            requireString(message, 'message');
            break;
        case 'hello':
            break;
        default:
            // The branch is reachable only when a caller explicitly opts into
            // parsing an extension message. Unknown fields remain harmless;
            // unknown message types remain rejected by default.
            break;
    }
    return message;
}

function encodeMessage(message) {
    validateMessage(message);
    return `${JSON.stringify(message)}\n`;
}

function parseLine(line) {
    if (typeof line !== 'string') {
        throw new AnalyzerProtocolError('invalid_line', 'protocol line must be a string');
    }
    const trimmed = line.trim();
    if (!trimmed) return null;
    let message;
    try {
        message = JSON.parse(trimmed);
    } catch (error) {
        throw new AnalyzerProtocolError('malformed_protocol', 'protocol line is not valid JSON', {
            cause: error.message
        });
    }
    return validateMessage(message);
}

function header(messageType, requestId) {
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: messageType,
        request_id: requestId
    };
}

function createAnalyzeRequest({ requestId, conversationId, sourceSpec, mode = 'replay', ...rest }) {
    const message = {
        ...header('analyze', requestId),
        conversation_id: conversationId,
        source_spec: sourceSpec,
        mode,
        ...rest
    };
    return validateMessage(message);
}

function createAck({ requestId, batchId, accepted = true, persisted = true, error = null }) {
    return validateMessage({
        ...header('ack', requestId),
        batch_id: batchId,
        accepted: Boolean(accepted),
        persisted: Boolean(persisted),
        ...(error ? { error: String(error) } : {})
    });
}

function createCancel(requestId, reason = 'cancelled_by_caller') {
    return validateMessage({
        ...header('cancel', requestId),
        reason: String(reason)
    });
}

function createError({ requestId, code, message, details = undefined }) {
    return validateMessage({
        ...header('error', requestId),
        code,
        message,
        ...(details === undefined ? {} : { details })
    });
}

function isBatchMessage(message) {
    return Boolean(message && message.message_type === 'batch');
}

function isCompleteMessage(message) {
    return Boolean(message && message.message_type === 'complete');
}

function isCanonicalBatch(message) {
    return Boolean(
        isBatchMessage(message) &&
        (message.completeness === 'canonical' || message.complete === true)
    );
}

module.exports = {
    PROTOCOL_VERSION,
    MESSAGE_TYPES,
    AnalyzerProtocolError,
    validateMessage,
    encodeMessage,
    parseLine,
    header,
    createAnalyzeRequest,
    createAck,
    createCancel,
    createError,
    isBatchMessage,
    isCompleteMessage,
    isCanonicalBatch,
    isNonEmptyString
};
