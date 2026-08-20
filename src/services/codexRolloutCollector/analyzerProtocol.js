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

function requireObject(message, field) {
    if (!isObject(message[field])) {
        throw new AnalyzerProtocolError(
            'missing_field',
            `${field} must be an object`,
            { field }
        );
    }
}

function requireArray(message, field) {
    if (!Array.isArray(message[field])) {
        throw new AnalyzerProtocolError(
            'missing_field',
            `${field} must be an array`,
            { field }
        );
    }
}

function requirePresent(message, field) {
    if (!Object.prototype.hasOwnProperty.call(message, field)) {
        throw new AnalyzerProtocolError(
            'missing_field',
            `${field} is required`,
            { field }
        );
    }
}

function validateSourceRange(value, field) {
    if (value === null || value === undefined) return;
    if (!isObject(value)
        || !Number.isSafeInteger(value.start)
        || !Number.isSafeInteger(value.end)
        || value.start < 0
        || value.end < value.start) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field} must be an ordered non-negative byte range`,
            { field }
        );
    }
}

function validateDigestAnchor(value, field, offsetField) {
    requireObject({ [field]: value }, field);
    requireString(value, 'algorithm');
    requireString(value, 'digest');
    if (!Number.isSafeInteger(value[offsetField]) || value[offsetField] < 0) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.${offsetField} must be a non-negative integer`,
            { field: `${field}.${offsetField}` }
        );
    }
}

function validateMutation(mutation, index) {
    if (!isObject(mutation) || !isNonEmptyString(mutation.mutation)) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `mutations[${index}] must identify a mutation`,
            { field: `mutations[${index}]` }
        );
    }
    if (['upsert_item', 'upsert_detail', 'upsert_usage', 'upsert_outcome'].includes(mutation.mutation)) {
        requireObject(mutation, 'item');
        requireString(mutation.item, 'item_key');
        requireString(mutation.item, 'content_hash');
        requireString(mutation.item, 'source_epoch');
        return;
    }
    if (mutation.mutation === 'complete_range' || mutation.mutation === 'mark_partial') {
        validateSourceRange(mutation.source_range, `mutations[${index}].source_range`);
        return;
    }
    throw new AnalyzerProtocolError(
        'invalid_field',
        `unsupported mutation ${mutation.mutation}`,
        { field: `mutations[${index}].mutation` }
    );
}

function validateBatchMessage(message) {
    requireString(message, 'batch_id');
    requireString(message, 'conversation_id');
    requireString(message, 'source_id');
    requireString(message, 'source_epoch');
    requireBoolean(message, 'replace_previous');
    requireArray(message, 'history_items');
    requireArray(message, 'diagnostics');
    requireObject(message, 'parser_provenance');
    requireString(message.parser_provenance, 'parser_backend');
    requireString(message.parser_provenance, 'wire_source_revision');
    requireString(message.parser_provenance, 'compatibility_profile');
    requireBoolean(message, 'complete');
    requireString(message, 'completeness');
    if (!['unknown', 'partial', 'provisional', 'canonical'].includes(message.completeness)) {
        throw new AnalyzerProtocolError('invalid_field', 'unsupported batch completeness', {
            field: 'completeness'
        });
    }
    requireObject(message, 'projection');
    requireArray(message, 'tool_details');
    requirePresent(message, 'usage');
    if (message.usage !== null) requireObject(message, 'usage');
    requireArray(message, 'task_outcomes');
    requireObject(message, 'progress');
    requirePresent(message, 'next_cursor');
    if (message.next_cursor !== null) {
        requireObject(message, 'next_cursor');
        requireString(message.next_cursor, 'cursor_kind');
    }
    requireArray(message, 'mutations');
    message.mutations.forEach(validateMutation);
    validateSourceRange(message.source_range, 'source_range');

    const hasCompleteRange = message.mutations.some(
        (mutation) => mutation.mutation === 'complete_range'
    );
    const hasPartialMarker = message.mutations.some(
        (mutation) => mutation.mutation === 'mark_partial'
    );
    if (message.complete !== (message.completeness === 'canonical')) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'complete and completeness disagree',
            { field: 'completeness' }
        );
    }
    if (message.completeness === 'canonical') {
        if (!hasCompleteRange) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'canonical batch must include complete_range mutation',
                { field: 'mutations' }
            );
        }
        requireObject(message, 'source_fingerprint');
        validateDigestAnchor(message.source_fingerprint, 'source_fingerprint', 'covered_bytes');
        requireObject(message, 'source_prefix_anchor');
        validateDigestAnchor(message.source_prefix_anchor, 'source_prefix_anchor', 'end_offset');
        requireObject(message, 'reducer_state');
        if (message.projection.complete !== true || message.projection.provisional === true) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'canonical projection must be complete and non-provisional',
                { field: 'projection' }
            );
        }
    } else if (!hasPartialMarker) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'non-canonical batch must include mark_partial mutation',
            { field: 'mutations' }
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
            if (message.resource_limits !== undefined) {
                requireObject(message, 'resource_limits');
                if (message.resource_limits.timeout_ms !== undefined
                    && (!Number.isSafeInteger(message.resource_limits.timeout_ms)
                        || message.resource_limits.timeout_ms < 0)) {
                    throw new AnalyzerProtocolError(
                        'invalid_field',
                        'resource_limits.timeout_ms must be a non-negative integer',
                        { field: 'resource_limits.timeout_ms' }
                    );
                }
            }
            break;
        case 'cancel':
            break;
        case 'batch':
            validateBatchMessage(message);
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

function createHello(requestId = `node-hello-${Date.now()}`) {
    return validateMessage({
        ...header('hello', requestId),
        role: 'node',
        capabilities: ['analyze', 'preview', 'backfill', 'append', 'cancel', 'checkpoint', 'ack']
    });
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
        message.completeness === 'canonical'
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
    createHello,
    createAnalyzeRequest,
    createAck,
    createCancel,
    createError,
    isBatchMessage,
    isCompleteMessage,
    isCanonicalBatch,
    isNonEmptyString
};
