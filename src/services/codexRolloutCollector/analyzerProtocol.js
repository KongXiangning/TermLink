'use strict';

const { normalizeCheckpoint } = require('./analysisCheckpointStore');

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
const PROJECTION_COVERAGES = new Set(['unknown', 'partial', 'complete']);

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

function validateSourceRef(value, field) {
    requireObject({ [field]: value }, field);
    requireString(value, 'source_identity');
    for (const name of ['byte_start', 'byte_end', 'physical_line_ordinal']) {
        if (!Number.isSafeInteger(value[name]) || value[name] < 0) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `${field}.${name} must be a non-negative integer`,
                { field: `${field}.${name}` }
            );
        }
    }
    if (value.byte_end < value.byte_start) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.byte_end must be greater than or equal to byte_start`,
            { field: `${field}.byte_end` }
        );
    }
    if (value.rollout_ordinal !== undefined && value.rollout_ordinal !== null
        && (!Number.isSafeInteger(value.rollout_ordinal) || value.rollout_ordinal < 0)) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.rollout_ordinal must be a non-negative integer or null`,
            { field: `${field}.rollout_ordinal` }
        );
    }
}

function validateHistoryBase(value, field) {
    requireObject({ [field]: value }, field);
    requireString(value, 'parent_rollout_id');
    for (const name of ['end_ordinal_exclusive', 'end_byte_offset']) {
        if (!Number.isSafeInteger(value[name]) || value[name] < 0) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `${field}.${name} must be a non-negative integer`,
                { field: `${field}.${name}` }
            );
        }
    }
}

/**
 * `projection.coverage` describes logical history coverage.  It is not the
 * same value as batch `completeness`, and it is not inferred from a source
 * byte range.  Older stage-4 messages did not carry the field, so their
 * complete/provisional pair remains a compatible fallback.
 */
function projectionCoverageOf(value, field = 'projection') {
    requireObject({ [field]: value }, field);
    if (value.coverage !== undefined && value.coverage !== null) {
        if (!PROJECTION_COVERAGES.has(value.coverage)) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `${field}.coverage is unsupported`,
                { field: `${field}.coverage` }
            );
        }
        return value.coverage;
    }
    if (value.complete === true && value.provisional !== true) return 'complete';
    if (value.provisional === true || value.complete === false) return 'partial';
    return 'unknown';
}

function validateProjectionCoverage(value, field = 'projection') {
    const coverage = projectionCoverageOf(value, field);
    if (coverage === 'complete' && value.provisional === true) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.complete coverage cannot be provisional`,
            { field: `${field}.coverage` }
        );
    }
    if (coverage === 'partial' && value.complete === true) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.partial coverage cannot claim complete projection content`,
            { field: `${field}.coverage` }
        );
    }
    return coverage;
}

function validateReplacementSourceEvidence(value, field) {
    const parentStartField = `${field}.parent_turn_start_source_ref`;
    const parentTerminalField = `${field}.parent_turn_terminal_source_ref`;
    const childStartField = `${field}.child_turn_start_source_ref`;
    const parentStart = value.parent_turn_start_source_ref;
    const parentTerminal = value.parent_turn_terminal_source_ref;
    const childStart = value.child_turn_start_source_ref;

    for (const [sourceRef, sourceRefField, expectedIdentity] of [
        [parentStart, parentStartField, value.parent_rollout_id],
        [parentTerminal, parentTerminalField, value.parent_rollout_id],
        [childStart, childStartField, value.child_rollout_id]
    ]) {
        if (sourceRef.source_identity !== expectedIdentity) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `${sourceRefField}.source_identity must match its rollout identity`,
                { field: `${sourceRefField}.source_identity` }
            );
        }
    }

    if (!Number.isSafeInteger(parentStart.rollout_ordinal) || parentStart.rollout_ordinal < 0) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${parentStartField}.rollout_ordinal is required for cut validation`,
            { field: `${parentStartField}.rollout_ordinal` }
        );
    }
    if (parentStart.rollout_ordinal !== value.cut.end_ordinal_exclusive) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${parentStartField}.rollout_ordinal must equal cut.end_ordinal_exclusive`,
            { field: `${parentStartField}.rollout_ordinal` }
        );
    }
    if (parentStart.byte_start !== value.cut.end_byte_offset) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${parentStartField}.byte_start must equal cut.end_byte_offset`,
            { field: `${parentStartField}.byte_start` }
        );
    }
    if (parentTerminal.byte_start < parentStart.byte_start) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${parentTerminalField} cannot precede parent turn start`,
            { field: `${parentTerminalField}.byte_start` }
        );
    }
    if (Number.isSafeInteger(parentTerminal.rollout_ordinal)
        && parentTerminal.rollout_ordinal < parentStart.rollout_ordinal) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${parentTerminalField}.rollout_ordinal cannot precede parent turn start`,
            { field: `${parentTerminalField}.rollout_ordinal` }
        );
    }
}

function validateReplacementBatchCut(value, field, batch) {
    if (!batch || value.child_rollout_id !== batch.source_id) return;
    const historyBase = batch.history_base;
    if (!isObject(historyBase)
        || historyBase.parent_rollout_id !== value.cut.parent_rollout_id
        || historyBase.end_ordinal_exclusive !== value.cut.end_ordinal_exclusive
        || historyBase.end_byte_offset !== value.cut.end_byte_offset) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.cut must match batch history_base for the current child rollout`,
            { field: `${field}.cut` }
        );
    }
}

function validateLastTurnReplacement(value, field, batch, { requireCurrentChild = true } = {}) {
    requireObject({ [field]: value }, field);
    for (const name of [
        'replacement_key',
        'conversation_id',
        'parent_rollout_id',
        'child_rollout_id',
        'replaced_turn_id',
        'replacement_turn_id'
    ]) {
        requireString(value, name);
    }
    if (value.replacement_key !== [
        'replacement',
        value.conversation_id,
        value.parent_rollout_id,
        value.child_rollout_id,
        value.replaced_turn_id,
        value.replacement_turn_id
    ].join(':')) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.replacement_key is not stable for the replacement identity`,
            { field: `${field}.replacement_key` }
        );
    }
    if (!['completed', 'interrupted', 'partial'].includes(value.replaced_turn_terminal_status)) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.replaced_turn_terminal_status is unsupported`,
            { field: `${field}.replaced_turn_terminal_status` }
        );
    }
    if (value.parent_rollout_id === value.child_rollout_id
        || value.replaced_turn_id === value.replacement_turn_id) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field} must identify distinct parent/child and old/new turns`,
            { field }
        );
    }
    if (batch && value.conversation_id !== batch.conversation_id) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.conversation_id must match batch conversation_id`,
            { field: `${field}.conversation_id` }
        );
    }
    if (batch && requireCurrentChild && value.child_rollout_id !== batch.source_id) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.child_rollout_id must match batch source_id`,
            { field: `${field}.child_rollout_id` }
        );
    }
    validateHistoryBase(value.cut, `${field}.cut`);
    if (value.cut.parent_rollout_id !== value.parent_rollout_id) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `${field}.cut.parent_rollout_id must match parent_rollout_id`,
            { field: `${field}.cut.parent_rollout_id` }
        );
    }
    validateSourceRef(value.parent_turn_start_source_ref, `${field}.parent_turn_start_source_ref`);
    validateSourceRef(value.parent_turn_terminal_source_ref, `${field}.parent_turn_terminal_source_ref`);
    validateSourceRef(value.child_turn_start_source_ref, `${field}.child_turn_start_source_ref`);
    validateReplacementSourceEvidence(value, field);
    validateReplacementBatchCut(value, field, batch);
}

function validateReplacementChain(message) {
    const candidates = [
        ...(Array.isArray(message.replacements) ? message.replacements : []),
        ...(Array.isArray(message.mutations)
            ? message.mutations
                .filter((mutation) => mutation?.mutation === 'replace_last_turn')
                .map((mutation) => mutation.replacement)
            : [])
    ];
    const unique = new Map();
    for (const replacement of candidates) {
        if (replacement?.replacement_key && !unique.has(replacement.replacement_key)) {
            unique.set(replacement.replacement_key, replacement);
        }
    }
    if (!unique.size) return;

    const byChildRollout = new Map();
    for (const replacement of unique.values()) {
        const existing = byChildRollout.get(replacement.child_rollout_id);
        if (existing && existing.replacement_key !== replacement.replacement_key) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'replacement facts must contain at most one parent transition per child rollout',
                { field: 'replacements' }
            );
        }
        byChildRollout.set(replacement.child_rollout_id, replacement);
    }

    const usedChildren = new Set();
    let expectedChildRollout = message.source_id;
    while (byChildRollout.has(expectedChildRollout)) {
        if (usedChildren.has(expectedChildRollout)) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'replacement facts contain a parent-chain cycle',
                { field: 'replacements' }
            );
        }
        usedChildren.add(expectedChildRollout);
        expectedChildRollout = byChildRollout.get(expectedChildRollout).parent_rollout_id;
    }
    if (usedChildren.size !== unique.size) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'replacement facts must form a contiguous parent chain ending at batch source_id',
            { field: 'replacements' }
        );
    }
}

function validateMutation(mutation, index, batch) {
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
        requireString(mutation.item, 'completeness');
        if (!['unknown', 'partial', 'provisional', 'canonical'].includes(mutation.item.completeness)) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].item.completeness is unsupported`,
                { field: `mutations[${index}].item.completeness` }
            );
        }
        if (batch && mutation.item.completeness !== batch.completeness) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].item.completeness must match batch completeness`,
                { field: `mutations[${index}].item.completeness` }
            );
        }
        if (batch && mutation.item.source_epoch !== batch.source_epoch) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].item.source_epoch must match batch source_epoch`,
                { field: `mutations[${index}].item.source_epoch` }
            );
        }
        if (!Number.isSafeInteger(mutation.item.revision) || mutation.item.revision < 0) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].item.revision must be a non-negative integer`,
                { field: `mutations[${index}].item.revision` }
            );
        }
        validateSourceRef(mutation.item.source_ref, `mutations[${index}].item.source_ref`);
        return;
    }
    if (mutation.mutation === 'complete_range') {
        if (batch && batch.completeness !== 'canonical') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].complete_range requires canonical batch`,
                { field: `mutations[${index}].mutation` }
            );
        }
        if (mutation.source_range === undefined || mutation.source_range === null) {
            throw new AnalyzerProtocolError(
                'missing_field',
                `mutations[${index}].source_range is required`,
                { field: `mutations[${index}].source_range` }
            );
        }
        validateSourceRange(mutation.source_range, `mutations[${index}].source_range`);
        return;
    }
    if (mutation.mutation === 'mark_partial') {
        if (batch && batch.completeness === 'canonical') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].mark_partial cannot appear in canonical batch`,
                { field: `mutations[${index}].mutation` }
            );
        }
        validateSourceRange(mutation.source_range, `mutations[${index}].source_range`);
        return;
    }
    if (mutation.mutation === 'replace_last_turn') {
        if (batch && batch.completeness !== 'canonical') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].replace_last_turn requires canonical batch`,
                { field: `mutations[${index}].mutation` }
            );
        }
        if (batch && projectionCoverageOf(batch.projection) !== 'complete') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `mutations[${index}].replace_last_turn requires complete projection coverage`,
                { field: `mutations[${index}].mutation` }
            );
        }
        validateLastTurnReplacement(
            mutation.replacement,
            `mutations[${index}].replacement`,
            batch,
            { requireCurrentChild: false }
        );
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
    if (message.source_epoch.trim() === 'unbound') {
        throw new AnalyzerProtocolError('invalid_field', 'source_epoch must be bound', {
            field: 'source_epoch'
        });
    }
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
    const projectionCoverage = validateProjectionCoverage(message.projection);
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
    if (message.history_base !== undefined && message.history_base !== null) {
        validateHistoryBase(message.history_base, 'history_base');
    }
    if (message.replacements !== undefined && message.replacements !== null) {
        requireArray(message, 'replacements');
        // These are validated replacement facts.  They are independent from
        // the logical projection coverage below, but a source batch must still
        // be canonical before the facts can cross this isolated boundary.
        if (message.replacements.length > 0 && message.completeness !== 'canonical') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'top-level replacements require canonical batch',
                { field: 'replacements' }
            );
        }
        message.replacements.forEach((replacement, index) => {
            validateLastTurnReplacement(
                replacement,
                `replacements[${index}]`,
                message,
                { requireCurrentChild: false }
            );
        });
    }
    for (const [index, item] of message.history_items.entries()) {
        if (!isNonEmptyString(item?.item_key)
            && !isNonEmptyString(item?.metadata?.item_key)
            && !isNonEmptyString(item?.payload?.metadata?.item_key)) {
            throw new AnalyzerProtocolError(
                'invalid_field',
                `history_items[${index}] is missing stable item_key`,
                { field: `history_items[${index}].item_key` }
            );
        }
    }
    message.mutations.forEach((mutation, index) => validateMutation(mutation, index, message));
    validateReplacementChain(message);
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
        if (projectionCoverage === 'unknown') {
            throw new AnalyzerProtocolError(
                'invalid_field',
                'canonical batch must declare projection coverage',
                { field: 'projection.coverage' }
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
            requireString(message.source_spec, 'source_id');
            requireString(message.source_spec, 'source_epoch');
            if (message.source_spec.source_epoch.trim() === 'unbound') {
                throw new AnalyzerProtocolError(
                    'invalid_field',
                    'source_spec.source_epoch must be bound',
                    { field: 'source_spec.source_epoch' }
                );
            }
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
            validateCompleteMessage(message);
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

function validateCompleteMessage(message) {
    requireString(message, 'status');
    if (!['ok', 'completed', 'partial'].includes(message.status)) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            `unsupported complete status ${message.status}`,
            { field: 'status' }
        );
    }
    requireString(message, 'completeness');
    if (!['unknown', 'partial', 'provisional', 'canonical'].includes(message.completeness)) {
        throw new AnalyzerProtocolError('invalid_field', 'unsupported complete completeness', {
            field: 'completeness'
        });
    }
    if (message.status === 'partial' && message.completeness === 'canonical') {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'partial complete status cannot claim canonical completeness',
            { field: 'completeness' }
        );
    }
    requirePresent(message, 'next_cursor');
    if (message.next_cursor !== null) {
        requireObject(message, 'next_cursor');
        requireString(message.next_cursor, 'cursor_kind');
        if (!['tail_preview', 'backfill', 'forward_append'].includes(message.next_cursor.cursor_kind)) {
            throw new AnalyzerProtocolError('invalid_field', 'unsupported complete cursor kind', {
                field: 'next_cursor.cursor_kind'
            });
        }
    }
    requireObject(message, 'checkpoint');
    let normalized;
    try {
        normalized = normalizeCheckpoint(message.checkpoint);
    } catch (error) {
        throw new AnalyzerProtocolError('invalid_field', error.message, {
            field: 'checkpoint'
        });
    }
    if (normalized.checkpoint.completeness !== message.completeness) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'complete and checkpoint completeness disagree',
            { field: 'checkpoint.completeness' }
        );
    }
    if (normalized.checkpoint.request_id !== message.request_id) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'complete and checkpoint request_id disagree',
            { field: 'checkpoint.request_id' }
        );
    }
    if (JSON.stringify(normalized.checkpoint.cursor) !== JSON.stringify(message.next_cursor)) {
        throw new AnalyzerProtocolError(
            'invalid_field',
            'complete and checkpoint cursor disagree',
            { field: 'checkpoint.cursor' }
        );
    }
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
        capabilities: [
            'analyze',
            'preview',
            'backfill',
            'append',
            'cancel',
            'checkpoint',
            'ack',
            'last_turn_replacement_v1'
        ]
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
    projectionCoverageOf,
    isNonEmptyString
};
