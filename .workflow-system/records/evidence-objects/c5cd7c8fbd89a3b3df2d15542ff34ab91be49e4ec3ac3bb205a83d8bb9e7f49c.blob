'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { projectionCoverageOf, validateMessage } = require('./analyzerProtocol');
const { atomicWriteJson } = require('./analysisRunStore');
const { normalizeCheckpoint } = require('./analysisCheckpointStore');

const COMPLETENESS_RANK = Object.freeze({
    unknown: 0,
    partial: 1,
    provisional: 2,
    canonical: 3
});

const TARGET_BATCH_PAYLOAD_FIELDS = Object.freeze([
    'conversation_id',
    'source_id',
    'source_epoch',
    'source_range',
    'history_items',
    'diagnostics',
    'parser_provenance',
    'complete',
    'completeness',
    'projection',
    'tool_details',
    'usage',
    'task_outcomes',
    'progress',
    'next_cursor',
    'mutations',
    'history_base',
    'replacements',
    'reducer_state',
    'lineage_transitions',
    'lineage_coverage',
    'lineage_checkpoint'
]);

const OPAQUE_BATCH_PAYLOAD_FIELDS = Object.freeze([
    'source_fingerprint',
    'source_prefix_anchor'
]);

// These event types are analyzer evidence carriers, not product history
// facts.  All other validated AnalysisEvent types remain eligible for the
// product projection, including non-reduced business facts such as
// SessionContext and RateLimitUpdated.
const INTERNAL_ANALYSIS_EVENT_TYPES = new Set([
    'Diagnostic',
    'ParseGap',
    'UnknownEvent'
]);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripGenericRevision(value) {
    if (Array.isArray(value)) return value.map(stripGenericRevision);
    if (!isObject(value)) return value;

    const normalized = {};
    for (const [key, nestedValue] of Object.entries(value)) {
        if (key === 'revision') continue;
        normalized[key] = stripGenericRevision(nestedValue);
    }
    return normalized;
}

function normalizeTargetPayload(payload) {
    // The target validator accepts additive nested metadata, but generic item
    // or source `revision` is not a 4.5 Node business field. Normalize it at
    // the hash/storage boundary while leaving parser provenance's distinct
    // `wire_source_revision` untouched.
    const normalized = stripGenericRevision(payload);
    // This payload belongs to Rust, not the Node history schema. It must
    // round-trip unchanged even if its private state uses a name like revision.
    if (isObject(payload.reducer_state) && hasOwn(payload.reducer_state, 'payload')) {
        normalized.reducer_state.payload = clone(payload.reducer_state.payload);
    }
    return normalized;
}

// Receipt content must be independent of object insertion order. Node stores
// Rust delivery identity opaquely and only hashes the already validated
// payload to compare an exact redelivery.
function stableStringify(value) {
    if (value === undefined) return 'null';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(',') + '}';
}

function contentHash(value) {
    return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function sameJson(left, right) {
    return stableStringify(left) === stableStringify(right);
}

function firstPresent(...values) {
    return values.find((value) => value !== undefined && value !== null);
}

function checkpointConversationId(value) {
    return value?.checkpoint?.conversation_id;
}

function normalizeScope(batchOrScope) {
    const value = isObject(batchOrScope) ? batchOrScope : {};
    const payload = value.message_type === 'batch' && isObject(value.payload)
        ? value.payload
        : value;
    const source = isObject(value.source)
        ? value.source
        : (isObject(payload.source) ? payload.source : {});
    const conversationId = String(firstPresent(
        value.conversationId,
        value.conversation_id,
        payload.conversationId,
        payload.conversation_id,
        checkpointConversationId(value)
    ) || '').trim();
    const sourceId = String(firstPresent(
        value.sourceId,
        value.source_id,
        payload.sourceId,
        payload.source_id,
        source.sourceId,
        source.source_id
    ) || '').trim();
    const sourceEpoch = String(firstPresent(
        value.sourceEpoch,
        value.source_epoch,
        payload.sourceEpoch,
        payload.source_epoch,
        source.sourceEpoch,
        source.source_epoch
    ) || '').trim();
    if (!conversationId || !sourceId || !sourceEpoch) {
        const error = new Error('analysis batch scope is incomplete');
        error.code = 'ANALYSIS_BATCH_SCOPE_INVALID';
        throw error;
    }
    if (sourceEpoch === 'unbound') {
        const error = new Error('analysis batch source epoch must be bound');
        error.code = 'ANALYSIS_BATCH_SCOPE_INVALID';
        throw error;
    }
    return { conversationId, sourceId, sourceEpoch };
}

function scopeKey(scope) {
    const normalized = scope?.conversationId && scope?.sourceId && scope?.sourceEpoch
        ? scope
        : normalizeScope(scope);
    return [normalized.conversationId, normalized.sourceId, normalized.sourceEpoch].join('\u0000');
}

function sameScope(left, right) {
    return Boolean(left && right)
        && left.conversationId === right.conversationId
        && left.sourceId === right.sourceId
        && left.sourceEpoch === right.sourceEpoch;
}

function completenessOf(value) {
    return typeof value === 'string' && COMPLETENESS_RANK[value] !== undefined
        ? value
        : 'unknown';
}

function completenessRank(value) {
    return COMPLETENESS_RANK[completenessOf(value)];
}

function itemKeyOf(item) {
    return item?.item_key || item?.payload?.metadata?.item_key || item?.metadata?.item_key || null;
}

function eventIdOf(item) {
    return item?.event_id || item?.payload?.metadata?.event_id || item?.metadata?.event_id || null;
}

function deliveryKey(identity) {
    return [identity.job_id, identity.segment_id, identity.batch_id].join('\u0000');
}

function deliveryIdentityOf(batch) {
    return {
        request_id: batch.identity.request_id,
        job_id: batch.identity.job_id,
        segment_id: batch.identity.segment_id,
        batch_id: batch.identity.batch_id,
        scope: {
            conversation_id: batch.scope.conversationId,
            source_id: batch.scope.sourceId,
            source_epoch: batch.scope.sourceEpoch
        }
    };
}

function normalizeDeliveryIdentity(value, code = 'ANALYSIS_COMPLETE_DELIVERY_INVALID') {
    if (!isObject(value)) {
        throw importerError(
            code,
            'complete delivery identity must be an object'
        );
    }
    const fields = {
        request_id: value.request_id ?? value.requestId,
        job_id: value.job_id ?? value.jobId,
        segment_id: value.segment_id ?? value.segmentId,
        batch_id: value.batch_id ?? value.batchId
    };
    for (const [field, fieldValue] of Object.entries(fields)) {
        if (typeof fieldValue !== 'string' || !fieldValue.trim()) {
            throw importerError(
                code,
                `complete delivery ${field} is required`,
                { field }
            );
        }
    }
    let scope = null;
    const scopeValue = value.scope ?? value.source_scope ?? value.sourceScope;
    if (scopeValue !== undefined && scopeValue !== null) {
        try {
            scope = normalizeScope(scopeValue);
        } catch (_) {
            throw importerError(
                code,
                'complete delivery scope is incomplete'
            );
        }
    }
    return { ...fields, scope };
}

function sameDeliveryIdentity(left, right) {
    if (!left || !right) return false;
    for (const field of ['request_id', 'job_id', 'segment_id', 'batch_id']) {
        if (left[field] !== right[field]) return false;
    }
    if (left.scope && right.scope) {
        try {
            if (!sameScope(normalizeScope(left.scope), normalizeScope(right.scope))) {
                return false;
            }
        } catch (_) {
            return false;
        }
    }
    return true;
}

function deliveryIdentityFromReceipt(receipt) {
    if (!isObject(receipt)) return null;
    try {
        return normalizeDeliveryIdentity(receipt);
    } catch (_) {
        return null;
    }
}

function isTargetBatchMessage(value) {
    return isObject(value)
        && value.message_type === 'batch'
        && isObject(value.payload)
        && typeof value.job_id === 'string'
        && typeof value.segment_id === 'string'
        && typeof value.batch_id === 'string';
}

function selectPayloadFields(payload, fields) {
    const selected = {};
    for (const field of fields) {
        if (hasOwn(payload, field)) selected[field] = clone(payload[field]);
    }
    return selected;
}

function stagedPayloadOf(payload) {
    const staged = selectPayloadFields(payload, TARGET_BATCH_PAYLOAD_FIELDS);
    const opaque = selectPayloadFields(payload, OPAQUE_BATCH_PAYLOAD_FIELDS);
    if (Object.keys(opaque).length > 0) staged.opaque_metadata = opaque;
    return staged;
}

function semanticPayloadOf(payload) {
    // Opaque fingerprint/prefix metadata is retained separately for audit but
    // never decides whether a redelivery is the same target batch.
    return selectPayloadFields(payload, TARGET_BATCH_PAYLOAD_FIELDS);
}

function targetBatchProgress(payload) {
    const range = payload.source_range;
    const progress = payload.progress || {};
    return [
        completenessRank(payload.completeness),
        range ? range.end : -1,
        range ? -range.start : 0,
        Number.isSafeInteger(progress.records_emitted) ? progress.records_emitted : 0,
        Number.isSafeInteger(progress.bytes_scanned) ? progress.bytes_scanned : 0
    ];
}

function compareProgress(left, right) {
    for (let index = 0; index < Math.max(left?.length || 0, right?.length || 0); index += 1) {
        const leftValue = left?.[index] ?? 0;
        const rightValue = right?.[index] ?? 0;
        if (leftValue !== rightValue) return leftValue > rightValue ? 1 : -1;
    }
    return 0;
}

function rangeIndexSort(left, right) {
    const leftRange = left.source_range;
    const rightRange = right.source_range;
    const values = [
        leftRange ? leftRange.start : -1,
        rightRange ? rightRange.start : -1,
        leftRange ? leftRange.end : -1,
        rightRange ? rightRange.end : -1
    ];
    if (values[0] !== values[1]) return values[0] - values[1];
    if (values[2] !== values[3]) return values[2] - values[3];
    return left.delivery_key.localeCompare(right.delivery_key);
}

function reindexRanges(state) {
    state.rangeIndex.sort(rangeIndexSort);
    state.rangeIndex.forEach((entry, index) => {
        entry.index = index;
        const staging = state.staging.get(entry.delivery_key);
        if (staging) staging.range_index = index;
    });
}

function coverageKey(batch) {
    return stableStringify({
        source_range: batch.payload.source_range,
        completeness: batch.payload.completeness,
        next_cursor: batch.payload.next_cursor
    });
}

function importerError(code, message, details = undefined, rejectionCode = undefined) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) error.details = details;
    if (rejectionCode) error.rejection_code = rejectionCode;
    return error;
}

function batchConflict(message, details) {
    return importerError(
        'ANALYSIS_BATCH_SCOPE_CONFLICT',
        message,
        details,
        'batch_scope_conflict'
    );
}

function missingItemKeyError(kind) {
    return importerError(
        'ANALYSIS_BATCH_EVIDENCE_INVALID',
        `${kind} is missing stable item_key`,
        { kind },
        'batch_validation_failed'
    );
}

function normalizeTargetBatch(message) {
    validateMessage(message);
    if (!isTargetBatchMessage(message)) {
        throw importerError(
            'ANALYSIS_BATCH_ENVELOPE_INVALID',
            'batch must contain the target delivery envelope',
            undefined,
            'batch_validation_failed'
        );
    }
    const payload = normalizeTargetPayload(message.payload);
    const scope = normalizeScope(message);
    if (payload.projection?.conversation_id !== undefined
        && payload.projection.conversation_id !== scope.conversationId) {
        throw batchConflict(
            'projection conversation_id does not match batch scope',
            { field: 'payload.projection.conversation_id' }
        );
    }
    const identity = {
        job_id: message.job_id,
        segment_id: message.segment_id,
        batch_id: message.batch_id,
        request_id: message.request_id
    };
    return {
        message,
        payload,
        scope,
        identity,
        delivery_key: deliveryKey(identity),
        staged_payload: stagedPayloadOf(payload),
        content_hash: contentHash(semanticPayloadOf(payload)),
        progress: targetBatchProgress(payload),
        projection_coverage: projectionCoverageOf(payload.projection)
    };
}

function verifiedStagedBatch(staged, receipt, identity, scope) {
    const key = deliveryKey(identity);
    for (const record of [staged, receipt]) {
        if (!record || record.persisted !== true || record.delivery_key !== key
            || record.job_id !== identity.job_id
            || record.segment_id !== identity.segment_id
            || record.batch_id !== identity.batch_id
            || !record.request_ids?.includes(identity.request_id)
            || !sameScope(normalizeScope(record.scope), scope)) {
            throw batchConflict('durable receipt and staging identity do not match the accepted delivery');
        }
    }
    const batch = normalizeTargetBatch({
        protocol_version: 1,
        message_type: 'batch',
        request_id: identity.request_id,
        job_id: identity.job_id,
        segment_id: identity.segment_id,
        batch_id: identity.batch_id,
        payload: staged.payload
    });
    if (!sameScope(batch.scope, scope)
        || batch.content_hash !== receipt.content_hash
        || batch.content_hash !== staged.content_hash
        || !sameJson(receipt.source_range, batch.payload.source_range)
        || receipt.completeness !== batch.payload.completeness) {
        throw batchConflict('durable receipt does not match its batch payload');
    }
    return batch;
}

function expectedValue(sources, ...keys) {
    for (const source of sources) {
        if (!isObject(source)) continue;
        for (const key of keys) {
            if (hasOwn(source, key)) return source[key];
        }
    }
    return undefined;
}

function assertExpectedIdentity(batch, options = {}) {
    const expected = [options.expected, options.identity, options.request, options].filter(isObject);
    const values = {
        request_id: expectedValue(expected, 'request_id', 'requestId'),
        job_id: expectedValue(expected, 'job_id', 'jobId'),
        segment_id: expectedValue(expected, 'segment_id', 'segmentId'),
        batch_id: expectedValue(expected, 'batch_id', 'batchId')
    };
    for (const [field, value] of Object.entries(values)) {
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string' || !value.trim() || value !== batch.identity[field]) {
            throw importerError(
                'ANALYSIS_BATCH_IDENTITY_MISMATCH',
                `${field} does not match the current analyzer attempt`,
                { field, expected: value, actual: batch.identity[field] },
                'batch_validation_failed'
            );
        }
    }

    const expectedScope = expectedValue(expected, 'scope');
    if (expectedScope !== undefined) {
        let normalizedScope;
        try {
            normalizedScope = normalizeScope(expectedScope);
        } catch (_) {
            throw importerError(
                'ANALYSIS_BATCH_SCOPE_INVALID',
                'expected batch scope is incomplete',
                undefined,
                'batch_validation_failed'
            );
        }
        if (!sameScope(normalizedScope, batch.scope)) {
            throw batchConflict(
                'batch scope does not match the current analyzer attempt',
                { expected: normalizedScope, actual: batch.scope }
            );
        }
    }

    const recovery = options.recoveryDelivery
        ?? options.recovery_delivery
        ?? expectedValue(expected, 'recovery_delivery', 'recoveryDelivery', 'recovery');
    if (recovery !== undefined && recovery !== null) {
        if (!isObject(recovery)
            || typeof recovery.segment_id !== 'string'
            || typeof recovery.batch_id !== 'string') {
            throw importerError(
                'ANALYSIS_BATCH_RECOVERY_INVALID',
                'recovery delivery must contain segment_id and batch_id',
                undefined,
                'batch_validation_failed'
            );
        }
        if (recovery.segment_id !== batch.identity.segment_id
            || recovery.batch_id !== batch.identity.batch_id
            || (recovery.job_id !== undefined && recovery.job_id !== batch.identity.job_id)) {
            throw batchConflict(
                'returned delivery identity does not match recovery delivery',
                { recovery, actual: batch.identity }
            );
        }
    }
}

function emptyState(scope) {
    return {
        scope: { ...scope },
        retired: false,
        activeHead: true,
        staging: new Map(),
        receipts: new Map(),
        rangeIndex: [],
        items: new Map(),
        toolDetails: new Map(),
        taskOutcomes: new Map(),
        usage: null,
        usageHash: null,
        usageCoverageKey: null,
        usageProgress: null,
        projection: null,
        projectionHash: null,
        projectionCoverageKey: null,
        projectionProgress: null,
        diagnostics: [],
        batches: [],
        complete: false,
        provisional: true,
        canonical: false,
        pendingReplacement: false,
        replaceApplied: false,
        replacementBatchId: null,
        lastBatchId: null,
        lastDelivery: null,
        lastCursor: null,
        lastProgress: null,
        lastCompleteness: 'unknown',
        mutations: [],
        replacements: [],
        batchRequestIds: new Map()
    };
}

function retiredState(scope) {
    const state = emptyState(scope);
    state.retired = true;
    state.activeHead = false;
    return state;
}

function stateToJson(state) {
    return {
        scope: clone(state.scope),
        retired: state.retired,
        active_head: state.activeHead,
        staging: [...state.staging.values()].map(clone),
        receipts: [...state.receipts.values()].map(clone),
        range_index: clone(state.rangeIndex),
        items: [...state.items.values()].map(clone),
        tool_details: [...state.toolDetails.values()].map(clone),
        task_outcomes: [...state.taskOutcomes.values()].map(clone),
        usage: clone(state.usage),
        usage_hash: state.usageHash,
        usage_coverage_key: state.usageCoverageKey,
        usage_progress: clone(state.usageProgress),
        projection: clone(state.projection),
        projection_hash: state.projectionHash,
        projection_coverage_key: state.projectionCoverageKey,
        projection_progress: clone(state.projectionProgress),
        diagnostics: clone(state.diagnostics),
        batches: clone(state.batches),
        complete: state.complete,
        provisional: state.provisional,
        canonical: state.canonical,
        pending_replacement: state.pendingReplacement,
        replace_applied: state.replaceApplied,
        replacement_batch_id: state.replacementBatchId,
        last_batch_id: state.lastBatchId,
        last_delivery: clone(state.lastDelivery),
        last_cursor: clone(state.lastCursor),
        last_progress: clone(state.lastProgress),
        last_completeness: state.lastCompleteness,
        batch_request_ids: [...state.batchRequestIds.entries()],
        mutations: clone(state.mutations),
        replacements: clone(state.replacements)
    };
}

function stateFromJson(value, scope) {
    const state = emptyState(scope);
    state.retired = Boolean(value?.retired);
    state.activeHead = value?.active_head !== false;

    const stagingValues = Array.isArray(value?.staging) ? value.staging : [];
    for (const entry of stagingValues) {
        if (entry?.delivery_key) state.staging.set(entry.delivery_key, entry);
    }
    const receiptValues = Array.isArray(value?.receipts)
        ? value.receipts
        : (Array.isArray(value?.batch_receipts) ? value.batch_receipts : []);
    for (const entry of receiptValues) {
        if (entry?.delivery_key) state.receipts.set(entry.delivery_key, entry);
    }
    state.rangeIndex = Array.isArray(value?.range_index) ? value.range_index : [];

    for (const item of Array.isArray(value?.items) ? value.items : []) {
        const itemKey = item?.item_key || itemKeyOf(item?.event);
        if (!itemKey) continue;
        const record = {
            ...item,
            item_key: itemKey,
            content_hash: item.content_hash || contentHash(item.event || item)
        };
        state.items.set(eventRecordKey(record), record);
    }
    for (const item of Array.isArray(value?.tool_details) ? value.tool_details : []) {
        const key = item?.item_key || item?.call_id;
        if (key) state.toolDetails.set(key, item);
    }
    for (const item of Array.isArray(value?.task_outcomes) ? value.task_outcomes : []) {
        if (item?.item_key) state.taskOutcomes.set(item.item_key, item);
    }

    state.usage = value?.usage || null;
    state.usageHash = value?.usage_hash
        || (state.usage ? contentHash(state.usage) : null);
    state.usageCoverageKey = value?.usage_coverage_key || null;
    state.usageProgress = Array.isArray(value?.usage_progress)
        ? value.usage_progress
        : null;
    state.projection = value?.projection || null;
    state.projectionHash = value?.projection_hash
        || (state.projection ? contentHash(state.projection) : null);
    state.projectionCoverageKey = value?.projection_coverage_key || null;
    state.projectionProgress = Array.isArray(value?.projection_progress)
        ? value.projection_progress
        : null;
    state.diagnostics = Array.isArray(value?.diagnostics) ? value.diagnostics : [];
    state.batches = Array.isArray(value?.batches) ? value.batches : [];
    state.complete = Boolean(value?.complete);
    state.provisional = value?.provisional !== false;
    state.canonical = Boolean(value?.canonical);
    state.pendingReplacement = Boolean(value?.pending_replacement);
    state.replaceApplied = Boolean(value?.replace_applied);
    state.replacementBatchId = value?.replacement_batch_id || null;
    state.lastBatchId = value?.last_batch_id || null;
    state.lastDelivery = deliveryIdentityFromReceipt(value?.last_delivery);
    state.lastCursor = value?.last_cursor || null;
    state.lastProgress = Array.isArray(value?.last_progress) ? value.last_progress : null;
    state.lastCompleteness = completenessOf(value?.last_completeness);
    state.mutations = Array.isArray(value?.mutations) ? value.mutations : [];
    state.replacements = Array.isArray(value?.replacements) ? value.replacements : [];

    const requestEntries = Array.isArray(value?.batch_request_ids)
        ? value.batch_request_ids
        : Object.entries(value?.batch_request_ids || {});
    for (const entry of requestEntries) {
        if (Array.isArray(entry)
            && typeof entry[0] === 'string'
            && entry[0]
            && typeof entry[1] === 'string'
            && entry[1]) {
            state.batchRequestIds.set(entry[0], entry[1]);
        }
    }

    // Older artifacts only had batch ids. They remain readable as audit
    // history, but are not used as target receipt identity or revision gates.
    for (const receipt of state.receipts.values()) {
        if (!state.batches.includes(receipt.batch_id)) state.batches.push(receipt.batch_id);
        if (!state.batchRequestIds.has(receipt.delivery_key)
            && receipt.last_request_id) {
            state.batchRequestIds.set(receipt.delivery_key, receipt.last_request_id);
        }
    }
    if (!state.lastDelivery) {
        const receipts = [...state.receipts.values()];
        const latestReceipt = state.lastBatchId
            ? [...receipts].reverse().find((receipt) => receipt.batch_id === state.lastBatchId)
            : receipts.at(-1);
        state.lastDelivery = deliveryIdentityFromReceipt(latestReceipt);
    }
    reindexRanges(state);

    if (state.retired) {
        state.activeHead = false;
        state.staging.clear();
        state.receipts.clear();
        state.rangeIndex = [];
        state.items.clear();
        state.toolDetails.clear();
        state.taskOutcomes.clear();
        state.usage = null;
        state.usageHash = null;
        state.usageProgress = null;
        state.projection = null;
        state.projectionHash = null;
        state.diagnostics = [];
        state.batches = [];
        state.complete = false;
        state.provisional = true;
        state.canonical = false;
        state.pendingReplacement = false;
        state.replaceApplied = false;
        state.replacementBatchId = null;
        state.lastBatchId = null;
        state.lastDelivery = null;
        state.lastCursor = null;
        state.lastProgress = null;
        state.lastCompleteness = 'unknown';
        state.mutations = [];
        state.replacements = [];
        state.batchRequestIds.clear();
    }
    return state;
}

function cloneState(state) {
    return stateFromJson(stateToJson(state), state.scope);
}

function requireWritableState(state, { allowPendingReplacement = false } = {}) {
    if (state?.retired) {
        throw importerError('ANALYSIS_SOURCE_EPOCH_RETIRED', 'source epoch is retired');
    }
    if (state?.activeHead === false
        && !(allowPendingReplacement && state.pendingReplacement)) {
        throw importerError(
            'ANALYSIS_SOURCE_EPOCH_INACTIVE',
            'source epoch is no longer the active conversation head'
        );
    }
}

// history_items contains AnalysisEvent occurrences, not reduced product items.
// ToolStarted and ToolCompleted share an item_key but have distinct event_id values.
// Retain both facts; projection/mutations carry the Rust-reduced logical object.
function eventRecordKey(record) {
    const eventId = record.event_id || eventIdOf(record.event);
    return stableStringify(eventId
        ? ['event', eventId]
        : ['legacy-item', record.item_key]);
}

function itemRecordOf(item, payload) {
    const itemKey = itemKeyOf(item);
    if (!itemKey) throw missingItemKeyError('history item');
    const metadata = item?.payload?.metadata || item?.metadata || {};
    return {
        item_key: itemKey,
        event_id: eventIdOf(item),
        event: clone(item),
        content_hash: contentHash(item),
        completeness: payload.completeness,
        source_epoch: payload.source_epoch,
        source_ref: clone(metadata.source_ref || null)
    };
}

function keyedRecordOf(value, payload, kind) {
    const key = value?.item_key || value?.call_id;
    if (!key) throw missingItemKeyError(kind);
    const semanticValue = clone(value);
    delete semanticValue.completeness;
    delete semanticValue.source_epoch;
    return {
        ...clone(value),
        completeness: value.completeness || payload.completeness,
        source_epoch: value.source_epoch || payload.source_epoch,
        content_hash: contentHash(semanticValue)
    };
}

function outcomeRecordOf(value, payload) {
    if (!value?.item_key) throw missingItemKeyError('task outcome');
    const semanticValue = clone(value);
    delete semanticValue.completeness;
    delete semanticValue.source_epoch;
    return {
        ...clone(value),
        completeness: value.completeness || payload.completeness,
        source_epoch: value.source_epoch || payload.source_epoch,
        content_hash: contentHash(semanticValue)
    };
}

function assertCollectionHasNoConflict(values, keyOf, kind) {
    const seen = new Map();
    for (const value of values) {
        const key = keyOf(value);
        if (!key) throw missingItemKeyError(kind);
        const hash = value.content_hash || contentHash(value);
        const existing = seen.get(key);
        if (existing && existing !== hash) {
            throw batchConflict(
                `${kind} content conflicts within one batch`,
                { kind, key }
            );
        }
        seen.set(key, hash);
    }
}

function isTurnAttributionPromotion(existing, incoming) {
    if (completenessRank(incoming.completeness) <= completenessRank(existing.completeness)
        || existing.event_id !== incoming.event_id
        || existing.item_key !== incoming.item_key) return false;
    const previous = clone(existing.event);
    const oldTurnId = previous?.payload?.metadata?.turn_id;
    const newTurnId = incoming.event?.payload?.metadata?.turn_id;
    if (oldTurnId != null || typeof newTurnId !== 'string' || !newTurnId.trim()) return false;
    previous.payload.metadata.turn_id = newTurnId;
    return sameJson(previous, incoming.event);
}

function assertExistingContent(existing, incoming, kind, key) {
    if (!existing) return;
    const existingHash = existing.content_hash || contentHash(existing.event || existing);
    if (existingHash !== incoming.content_hash
        && !(kind === 'history event' && isTurnAttributionPromotion(existing, incoming))) {
        throw batchConflict(
            `${kind} content conflicts with an existing staged item`,
            { kind, key }
        );
    }
}

function mutationIdentityOf(mutation) {
    return [
        mutation?.mutation || '',
        mutation?.item?.item_key || '',
        mutation?.item?.call_id || '',
        mutation?.replacement?.replacement_key || '',
        stableStringify(mutation?.source_range || null)
    ].join('\u0000');
}

function isUpsertMutationPromotion(existing, incoming) {
    if (!['upsert_item', 'upsert_detail', 'upsert_usage', 'upsert_outcome'].includes(existing?.mutation)
        || existing.mutation !== incoming?.mutation
        || completenessRank(incoming.item?.completeness)
            <= completenessRank(existing.item?.completeness)) return false;
    const previous = clone(existing);
    previous.item.completeness = incoming.item.completeness;
    previous.item.content_hash = incoming.item.content_hash;
    return sameJson(previous, incoming);
}

function replacementValuesOf(payload) {
    return [
        ...(Array.isArray(payload.replacements) ? payload.replacements : []),
        ...(Array.isArray(payload.mutations)
            ? payload.mutations
                .filter((mutation) => mutation?.mutation === 'replace_last_turn')
                .map((mutation) => mutation.replacement)
                .filter(Boolean)
            : [])
    ];
}

// These fields are the public TermLink event schema, in producer serialization
// order. Extra additive fields participate too: they cannot be hidden by a hash.
function historyEventMarker(event) {
    const ordered = (value, fields) => Object.fromEntries([
        ...fields.filter((key) => hasOwn(value, key)).map((key) => [key, value[key]]),
        ...Object.keys(value).filter((key) => !fields.includes(key)).sort().map((key) => [key, value[key]])
    ]);
    const fields = {
        TurnStarted: ['metadata', 'model_context_window', 'collaboration_mode_kind'],
        TurnCompleted: ['metadata', 'status', 'message', 'duration_ms'],
        DelegatedInput: ['metadata', 'item_id', 'origin_tool', 'namespace', 'carrier', 'text']
    }[event?.event_type];
    if (!fields) return null;
    const payload = ordered(event.payload, fields);
    payload.metadata = ordered(payload.metadata, ['event_id', 'item_key', 'correlation_id', 'related_item_key',
        'conversation_id', 'turn_id', 'timestamp', 'sequence', 'availability', 'terminal_evidence', 'identity_origin', 'source_ref']);
    payload.metadata.source_ref = ordered(payload.metadata.source_ref, ['source_identity', 'byte_start', 'byte_end',
        'physical_line_ordinal', 'rollout_ordinal', 'timestamp', 'item_type']);
    const value = ordered({ ...event, payload }, ['event_type', 'payload']);
    let hash = 0xcbf29ce484222325n;
    for (const byte of Buffer.from(JSON.stringify(value))) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
    return 'fnv1a64:' + hash.toString(16).padStart(16, '0');
}

function eventForMutation(events, mutation, conversationId) {
    return events.find((event) => event.payload?.metadata?.conversation_id === conversationId
        && event.payload.metadata.item_key === mutation.item.item_key
        && sameJson(event.payload.metadata.source_ref, mutation.item.source_ref)
        && historyEventMarker(event) === mutation.item.content_hash);
}

function delegatedEquivalent(a, b) {
    return a?.event_type === 'DelegatedInput' && b?.event_type === 'DelegatedInput'
        && ['item_id', 'origin_tool', 'namespace', 'text'].every((key) => a.payload[key] === b.payload[key])
        && ['conversation_id', 'turn_id', 'item_key'].every((key) => a.payload.metadata[key] === b.payload.metadata[key])
        && a.payload.metadata.source_ref.source_identity === b.payload.metadata.source_ref.source_identity;
}

function durableMutationProof(state, mutation) {
    for (const staged of state.staging.values()) {
        if (!staged.payload.mutations.some((value) => {
            const observation = clone(value);
            if (observation.item) observation.item.completeness = mutation.item.completeness;
            return sameJson(observation, mutation);
        })) continue;
        const proof = verifiedStagedBatch(staged, state.receipts.get(staged.delivery_key), {
            request_id: staged.request_id, job_id: staged.job_id, segment_id: staged.segment_id, batch_id: staged.batch_id
        }, state.scope);
        const event = eventForMutation(proof.payload.history_items, mutation, state.scope.conversationId);
        if (event) return { event, batch: proof };
    }
    return null;
}

function rangeContains(range, ref) {
    return range && range.start <= ref.byte_start && range.end >= ref.byte_end;
}

function isUnchangedHistoryObservation(state, batch, previous, incoming) {
    const old = durableMutationProof(state, previous);
    const event = eventForMutation(batch.payload.history_items, incoming, batch.scope.conversationId);
    return Boolean(old && event && sameJson(old.event, event));
}

function isHistoryObservationUpdate(state, batch, previous, incoming) {
    if (incoming.mutation !== 'upsert_item' || previous.mutation !== 'upsert_item'
        || batch.payload.reducer_state?.reducer_version !== 'target-v2'
        || batch.payload.parser_provenance.compatibility_profile !== 'history-semantics-v2'
        || incoming.item.source_epoch !== previous.item.source_epoch
        || incoming.item.item_key !== previous.item.item_key
        || completenessRank(incoming.item.completeness) < completenessRank(previous.item.completeness)) return false;
    const old = durableMutationProof(state, previous);
    const event = eventForMutation(batch.payload.history_items, incoming, batch.scope.conversationId);
    if (!old || !event) return false;
    if (delegatedEquivalent(old.event, event)) return true;
    const a = old.event.payload.metadata, b = event.payload.metadata;
    if (old.event.event_type !== 'TurnStarted' || event.event_type !== 'TurnCompleted'
        || event.payload.status !== 'completed' || a.availability !== 'present' || b.availability !== 'present'
        || !a.turn_id || a.turn_id !== b.turn_id || incoming.item.item_key !== 'turn:' + a.turn_id
        || a.source_ref.source_identity !== b.source_ref.source_identity
        || a.source_ref.byte_end > b.source_ref.byte_start
        || a.source_ref.physical_line_ordinal >= b.source_ref.physical_line_ordinal) return false;
    const ref = b.source_ref;
    const span = { byte_start: a.source_ref.byte_start, byte_end: ref.byte_end };
    if (!rangeContains(batch.payload.source_range, ref)) return false;
    const reobserved = batch.payload.history_items.some((value) => sameJson(value, old.event));
    if (reobserved) {
        if (!rangeContains(batch.payload.source_range, a.source_ref)) return false;
    } else {
        const priorRange = old.batch.payload.source_range;
        const currentRefs = batch.payload.history_items.map((value) => value.payload.metadata.source_ref)
            .filter((value) => value.source_identity === ref.source_identity);
        const first = Math.min(...currentRefs.map((value) => value.byte_start));
        if (!rangeContains(priorRange, a.source_ref) || first > priorRange.end
            || !rangeContains(batch.payload.source_range, a.source_ref)) return false;
    }
    const evidence = reobserved ? [batch.payload] : [old.batch.payload, batch.payload];
    return !evidence.flatMap((value) => value.history_items).some((value) => {
        const metadata = value.payload.metadata;
        return metadata.source_ref.source_identity === ref.source_identity
            && metadata.source_ref.byte_start < span.byte_end && metadata.source_ref.byte_end > span.byte_start
            && (['ParseGap', 'UnknownEvent'].includes(value.event_type) || metadata.availability !== 'present');
    }) && !evidence.flatMap((value) => value.diagnostics).some((value) => value.availability !== 'present'
        && (!value.source_ref || (value.source_ref.source_identity === ref.source_identity
            && value.source_ref.byte_start < span.byte_end && value.source_ref.byte_end > span.byte_start)));
}

function preflightTargetState(state, batch) {
    const payload = batch.payload;
    const itemRecords = payload.history_items.map((item) => itemRecordOf(item, payload));
    const detailRecords = payload.tool_details.map(
        (detail) => keyedRecordOf(detail, payload, 'tool detail')
    );
    const outcomeRecords = payload.task_outcomes.map(
        (outcome) => outcomeRecordOf(outcome, payload)
    );

    assertCollectionHasNoConflict(itemRecords, eventRecordKey, 'history event');
    assertCollectionHasNoConflict(
        detailRecords,
        (value) => value.item_key || value.call_id,
        'tool detail'
    );
    assertCollectionHasNoConflict(outcomeRecords, (value) => value.item_key, 'task outcome');

    for (const incoming of itemRecords) {
        const key = eventRecordKey(incoming);
        assertExistingContent(state.items.get(key), incoming, 'history event', key);
    }
    const delegated = [...state.items.values(), ...itemRecords].filter((record) => record.event.event_type === 'DelegatedInput');
    const delegationByKey = new Map();
    const delegationFacts = new Map();
    for (const record of delegated) {
        const old = delegationByKey.get(record.item_key);
        if (old && !delegatedEquivalent(old, record.event)) throw batchConflict('delegated body or attribution conflicts', { key: record.item_key });
        delegationByKey.set(record.item_key, record.event);
        const facts = delegationFacts.get(record.item_key) || [];
        facts.push(record);
        delegationFacts.set(record.item_key, facts);
    }
    for (const turn of payload.projection.turns || []) {
        for (const item of turn.items || []) {
            if (item.kind !== 'delegated_input' && !item.item_key?.startsWith('delegated-input:')) continue;
            const facts = delegationFacts.get(item.item_key) || [];
            const representative = facts.find((record) => record.event.payload.carrier === 'response_item') || facts[0];
            const event = representative?.event;
            if (!event || item.kind !== 'delegated_input' || item.presentation_kind !== 'delegated_input'
                || item.visible !== true || item.tool !== null || item.content !== event.payload.text
                || item.turn_id !== event.payload.metadata.turn_id || turn.turn_id !== item.turn_id
                || !sameJson(item.source_ref, event.payload.metadata.source_ref)) {
                throw batchConflict('delegated projection is not justified by its actual carrier facts', { key: item.item_key });
            }
        }
    }
    for (const incoming of detailRecords) {
        const key = incoming.item_key || incoming.call_id;
        assertExistingContent(state.toolDetails.get(key), incoming, 'tool detail', key);
    }
    for (const incoming of outcomeRecords) {
        assertExistingContent(
            state.taskOutcomes.get(incoming.item_key),
            incoming,
            'task outcome',
            incoming.item_key
        );
    }

    const mutationByIdentity = new Map();
    const mutationRecords = [];
    for (const entry of state.mutations) {
        mutationByIdentity.set(mutationIdentityOf(entry.mutation), entry);
    }
    for (const mutation of payload.mutations) {
        const protectedItem = payload.reducer_state?.reducer_version === 'target-v2'
            && mutation.mutation === 'upsert_item' && /^(turn:|delegated-input:)/.test(mutation.item.item_key);
        if (protectedItem && !eventForMutation(payload.history_items, mutation, batch.scope.conversationId)) {
            throw batchConflict('history mutation does not match its actual event', { key: mutation.item.item_key });
        }
        const identity = mutationIdentityOf(mutation);
        const hash = contentHash(mutation);
        const existing = mutationByIdentity.get(identity);
        if (existing && existing.content_hash !== hash
            // Completeness alone cannot authorize a changed protected event.
            && !(isUpsertMutationPromotion(existing.mutation, mutation)
                && (!protectedItem || isUnchangedHistoryObservation(state, batch, existing.mutation, mutation)))
            && !isHistoryObservationUpdate(state, batch, existing.mutation, mutation)) {
            throw batchConflict(
                'mutation evidence conflicts with an existing staged mutation',
                { mutation: mutation.mutation, identity }
            );
        }
        let acceptedMutation = mutation;
        if (protectedItem && existing && mutation.item.item_key.startsWith('delegated-input:')) {
            const old = durableMutationProof(state, existing.mutation);
            const event = eventForMutation(payload.history_items, mutation, batch.scope.conversationId);
            if (!old || !delegatedEquivalent(old.event, event)) throw batchConflict('delegated mutation lacks durable paired evidence');
            if (old.event.payload.carrier === 'response_item' && event.payload.carrier === 'item_completed') {
                acceptedMutation = clone(existing.mutation);
                acceptedMutation.item.completeness = mutation.item.completeness;
            }
        }
        mutationRecords.push(acceptedMutation);
        mutationByIdentity.set(identity, { content_hash: contentHash(acceptedMutation), mutation: acceptedMutation });
    }

    const replacements = replacementValuesOf(payload);
    const replacementByKey = new Map(
        state.replacements.map((value) => [value.replacement_key, value])
    );
    for (const replacement of replacements) {
        const existing = replacementByKey.get(replacement.replacement_key);
        if (existing && !sameJson(existing, replacement)) {
            throw batchConflict(
                'replacement evidence conflicts with an existing staged replacement',
                { replacement_key: replacement.replacement_key }
            );
        }
        replacementByKey.set(replacement.replacement_key, replacement);
    }

    const incomingProjection = payload.projection;
    const incomingProjectionHash = contentHash(incomingProjection);
    if (state.projection
        && state.projectionProgress
        && compareProgress(batch.progress, state.projectionProgress) === 0
        && state.projectionHash !== incomingProjectionHash) {
        throw batchConflict(
            'projection content conflicts at the same target coverage',
            { field: 'payload.projection' }
        );
    }
    if (payload.usage !== null
        && state.usage
        && state.usageCoverageKey === coverageKey(batch)
        && state.usageHash !== contentHash(payload.usage)) {
        throw batchConflict(
            'usage content conflicts at the same target coverage',
            { field: 'payload.usage' }
        );
    }

    return {
        itemRecords,
        detailRecords,
        outcomeRecords,
        replacements,
        mutationRecords,
        projectionHash: incomingProjectionHash,
        usageHash: payload.usage === null ? null : contentHash(payload.usage)
    };
}

function putHigherCompleteness(map, key, incoming) {
    const existing = map.get(key);
    if (!existing || completenessRank(incoming.completeness) > completenessRank(existing.completeness)) {
        map.set(key, incoming);
    }
}

function applyTargetState(state, batch, preflight) {
    const payload = batch.payload;
    for (const incoming of preflight.itemRecords) {
        putHigherCompleteness(state.items, eventRecordKey(incoming), incoming);
    }
    for (const incoming of preflight.detailRecords) {
        putHigherCompleteness(state.toolDetails, incoming.item_key || incoming.call_id, incoming);
    }
    for (const incoming of preflight.outcomeRecords) {
        putHigherCompleteness(state.taskOutcomes, incoming.item_key, incoming);
    }

    if (payload.usage !== null) {
        const incomingProgress = batch.progress;
        if (!state.usage || compareProgress(incomingProgress, state.usageProgress || []) >= 0) {
            state.usage = {
                ...clone(payload.usage),
                completeness: payload.completeness,
                source_epoch: payload.source_epoch
            };
            state.usageHash = preflight.usageHash;
            state.usageCoverageKey = coverageKey(batch);
            state.usageProgress = clone(incomingProgress);
        }
    }

    const projectionProgress = batch.progress;
    if (!state.projection
        || compareProgress(projectionProgress, state.projectionProgress || []) >= 0) {
        state.projection = {
            ...clone(payload.projection),
            coverage: batch.projection_coverage,
            completeness: payload.completeness,
            source_epoch: payload.source_epoch
        };
        state.projectionHash = preflight.projectionHash;
        state.projectionCoverageKey = coverageKey(batch);
        state.projectionProgress = clone(projectionProgress);
    }

    for (const diagnostic of payload.diagnostics) {
        const hash = contentHash(diagnostic);
        if (!state.diagnostics.some((entry) => entry.content_hash === hash)) {
            state.diagnostics.push({ content_hash: hash, diagnostic: clone(diagnostic) });
        }
    }
    for (const mutation of preflight.mutationRecords) {
        const hash = contentHash(mutation);
        const identity = mutationIdentityOf(mutation);
        const priorIndex = state.mutations.findIndex(
            (entry) => mutationIdentityOf(entry.mutation) === identity
        );
        if (priorIndex >= 0 && state.mutations[priorIndex].content_hash !== hash) {
            state.mutations[priorIndex] = { content_hash: hash, mutation: clone(mutation) };
        } else if (priorIndex < 0) {
            state.mutations.push({ content_hash: hash, mutation: clone(mutation) });
        }
    }
    for (const replacement of preflight.replacements) {
        if (!state.replacements.some(
            (entry) => entry.replacement_key === replacement.replacement_key
        )) {
            state.replacements.push(clone(replacement));
        }
    }

    const canonical = payload.completeness === 'canonical'
        && batch.projection_coverage === 'complete';
    if (canonical) {
        state.canonical = true;
        state.complete = true;
        state.provisional = false;
        if (state.projection && typeof state.projection === 'object') {
            state.projection.complete = true;
            state.projection.provisional = false;
        }
    } else if (!state.canonical) {
        state.complete = false;
        state.provisional = true;
        if (state.projection && typeof state.projection === 'object') {
            state.projection.complete = false;
            state.projection.provisional = true;
        }
    }

    const incomingProgress = batch.progress;
    if (!state.lastProgress || compareProgress(incomingProgress, state.lastProgress) > 0) {
        state.lastBatchId = batch.identity.batch_id;
        state.lastCursor = clone(payload.next_cursor);
        state.lastProgress = clone(incomingProgress);
        state.lastCompleteness = payload.completeness;
    }
}

function createReceipt(batch) {
    return {
        delivery_key: batch.delivery_key,
        job_id: batch.identity.job_id,
        segment_id: batch.identity.segment_id,
        batch_id: batch.identity.batch_id,
        first_request_id: batch.identity.request_id,
        last_request_id: batch.identity.request_id,
        request_ids: [batch.identity.request_id],
        scope: {
            conversation_id: batch.scope.conversationId,
            source_id: batch.scope.sourceId,
            source_epoch: batch.scope.sourceEpoch
        },
        content_hash: batch.content_hash,
        source_range: clone(batch.payload.source_range),
        completeness: batch.payload.completeness,
        persisted: true,
        status: 'staged'
    };
}

function createStaging(batch, receipt) {
    return {
        delivery_key: batch.delivery_key,
        job_id: batch.identity.job_id,
        segment_id: batch.identity.segment_id,
        batch_id: batch.identity.batch_id,
        request_id: batch.identity.request_id,
        request_ids: [...receipt.request_ids],
        scope: clone(receipt.scope),
        content_hash: batch.content_hash,
        source_range: clone(batch.payload.source_range),
        range_index: null,
        completeness: batch.payload.completeness,
        complete: batch.payload.complete,
        persisted: true,
        payload: clone(batch.staged_payload)
    };
}

class KeyedMutationQueue {
    constructor() {
        this.tails = new Map();
    }

    async wait(key) {
        await (this.tails.get(key) || Promise.resolve());
    }

    run(key, operation) {
        const previous = this.tails.get(key) || Promise.resolve();
        const current = previous.then(operation, operation);
        const tail = current.catch(() => undefined);
        this.tails.set(key, tail);
        return current.finally(() => {
            if (this.tails.get(key) === tail) this.tails.delete(key);
        });
    }
}

class MemoryAnalysisStore {
    constructor() {
        this.states = new Map();
        this.operations = [];
    }

    async init() {
        return this;
    }

    async _state(scope) {
        const normalized = normalizeScope(scope);
        const key = scopeKey(normalized);
        if (!this.states.has(key)) this.states.set(key, emptyState(normalized));
        return this.states.get(key);
    }

    _findReceipt(delivery) {
        for (const [key, state] of this.states) {
            const receipt = state.receipts.get(delivery);
            if (receipt) return { key, state, receipt };
        }
        return null;
    }

    async replaceScope(scope, replacementBatchId = null) {
        const normalized = normalizeScope(scope);
        const state = emptyState(normalized);
        state.replaceApplied = true;
        state.replacementBatchId = replacementBatchId;
        this.states.set(scopeKey(normalized), state);
        this.operations.push(['replace', scopeKey(normalized)]);
        return state;
    }

    async replaceConversation(conversationId, scope, replacementBatchId = null) {
        const normalizedConversationId = String(conversationId || '').trim();
        const normalized = normalizeScope(scope);
        const newKey = scopeKey(normalized);
        for (const [key, state] of this.states) {
            if (key !== newKey && state.scope.conversationId === normalizedConversationId) {
                this.states.set(key, retiredState(state.scope));
            }
        }
        this.operations.push(['replace_conversation', normalizedConversationId, newKey]);
        return this.replaceScope(normalized, replacementBatchId);
    }

    async _applyTargetBatch(message) {
        const batch = normalizeTargetBatch(message);
        const key = scopeKey(batch.scope);
        const existingReceipt = this._findReceipt(batch.delivery_key);
        if (existingReceipt) {
            if (!sameScope(existingReceipt.state.scope, batch.scope)) {
                throw batchConflict(
                    'delivery identity was reused for a different source scope',
                    { delivery_key: batch.delivery_key }
                );
            }
            if (existingReceipt.receipt.content_hash !== batch.content_hash) {
                throw batchConflict(
                    'delivery identity was reused with different batch content',
                    { delivery_key: batch.delivery_key }
                );
            }

            const candidate = cloneState(existingReceipt.state);
            const receipt = candidate.receipts.get(batch.delivery_key);
            const staging = candidate.staging.get(batch.delivery_key);
            let mutated = false;
            if (!receipt.request_ids.includes(batch.identity.request_id)) {
                receipt.request_ids.push(batch.identity.request_id);
                receipt.last_request_id = batch.identity.request_id;
                staging.request_ids = [...receipt.request_ids];
                staging.request_id = batch.identity.request_id;
                candidate.batchRequestIds.set(batch.delivery_key, batch.identity.request_id);
                mutated = true;
            }
            const latestDelivery = deliveryIdentityOf(batch);
            if (!sameDeliveryIdentity(candidate.lastDelivery, latestDelivery)) {
                candidate.lastDelivery = latestDelivery;
                mutated = true;
            }
            if (mutated) this.states.set(existingReceipt.key, candidate);
            this.operations.push(['duplicate', batch.delivery_key]);
            return {
                state: candidate,
                duplicate: true,
                mutated,
                receipt: clone(receipt),
                staging: clone(staging)
            };
        }

        const current = this.states.get(key) || emptyState(batch.scope);
        requireWritableState(current, { allowPendingReplacement: true });
        const candidate = cloneState(current);
        const preflight = preflightTargetState(candidate, batch);
        const receipt = createReceipt(batch);
        const staging = createStaging(batch, receipt);
        candidate.receipts.set(batch.delivery_key, receipt);
        candidate.staging.set(batch.delivery_key, staging);
        candidate.rangeIndex.push({
            index: null,
            delivery_key: batch.delivery_key,
            job_id: batch.identity.job_id,
            segment_id: batch.identity.segment_id,
            batch_id: batch.identity.batch_id,
            source_range: clone(batch.payload.source_range),
            completeness: batch.payload.completeness
        });
        reindexRanges(candidate);
        const indexed = candidate.rangeIndex.find(
            (entry) => entry.delivery_key === batch.delivery_key
        );
        staging.range_index = indexed?.index ?? null;
        if (!candidate.batches.includes(batch.identity.batch_id)) {
            candidate.batches.push(batch.identity.batch_id);
        }
        candidate.batchRequestIds.set(batch.delivery_key, batch.identity.request_id);
        candidate.lastDelivery = deliveryIdentityOf(batch);
        applyTargetState(candidate, batch, preflight);
        this.states.set(key, candidate);
        this.operations.push(['apply', batch.delivery_key]);
        return {
            state: candidate,
            duplicate: false,
            mutated: true,
            receipt: clone(receipt),
            staging: clone(staging)
        };
    }

    async applyBatch(batch) {
        if (isTargetBatchMessage(batch)) return this._applyTargetBatch(batch);
        // The old flat batch has no target delivery envelope. Let the single
        // protocol validator produce the migration/fail-closed error instead
        // of silently restoring legacy import semantics.
        validateMessage(batch);
        throw importerError(
            'ANALYSIS_BATCH_ENVELOPE_INVALID',
            'batch must contain the target delivery envelope',
            undefined,
            'batch_validation_failed'
        );
    }

    async assertScopeWritable(scope) {
        const normalized = normalizeScope(scope);
        const state = await this._state(normalized);
        requireWritableState(state, { allowPendingReplacement: true });
        return state;
    }

    async assertCompleteCommit(scope, requestId, identity = {}) {
        const normalized = normalizeScope(scope);
        const state = await this.assertScopeWritable(normalized);
        const suppliedDelivery = identity.expected_delivery ?? identity.expectedDelivery;
        const expectedDelivery = suppliedDelivery !== undefined && suppliedDelivery !== null
            ? normalizeDeliveryIdentity(suppliedDelivery)
            : normalizeDeliveryIdentity({
                request_id: requestId,
                job_id: identity.job_id,
                segment_id: identity.segment_id,
                batch_id: identity.batch_id,
                scope: normalized
            });
        if (!requestId || expectedDelivery.request_id !== requestId) {
            throw importerError(
                'ANALYSIS_COMPLETE_WITHOUT_BATCH',
                'complete requires at least one imported batch from the same request'
            );
        }
        if (expectedDelivery.scope
            && !sameScope(expectedDelivery.scope, normalized)) {
            throw importerError(
                'ANALYSIS_COMPLETE_DELIVERY_MISMATCH',
                'complete delivery scope does not match the current source scope',
                { expected: expectedDelivery.scope, actual: normalized }
            );
        }
        if (!state.lastDelivery || !sameDeliveryIdentity(state.lastDelivery, expectedDelivery)) {
            throw importerError(
                'ANALYSIS_COMPLETE_DELIVERY_MISMATCH',
                'complete checkpoint watermark must match the latest accepted batch delivery',
                {
                    expected: expectedDelivery,
                    actual: state.lastDelivery
                }
            );
        }
        const matching = [...state.receipts.values()].filter(
            (receipt) => receipt.delivery_key === deliveryKey(state.lastDelivery)
                && receipt.request_ids?.includes(requestId)
                && sameScope(normalizeScope(receipt.scope), normalized)
        );
        if (matching.length === 0) {
            throw importerError(
                'ANALYSIS_COMPLETE_WITHOUT_BATCH',
                'complete requires at least one imported batch from the same request'
            );
        }
        return state;
    }

    async snapshot(scope) {
        return stateToJson(await this._state(normalizeScope(scope)));
    }

    async getRecoveryDelivery({ job_id: jobId, conversation_id: conversationId } = {}) {
        if (typeof jobId !== 'string' || !jobId.trim()
            || typeof conversationId !== 'string' || !conversationId.trim()) {
            throw batchConflict('recovery lookup requires job and conversation identity');
        }
        const candidates = [...this.states.values()].filter((state) => (
            state.lastDelivery?.job_id === jobId
            || [...state.receipts.values()].some((receipt) => receipt.job_id === jobId)
            || [...state.staging.values()].some((staged) => staged.job_id === jobId)
        ));
        if (candidates.length === 0) return null;
        if (candidates.length !== 1 || candidates[0].scope.conversationId !== conversationId) {
            throw batchConflict('recovery job has ambiguous or mismatched source scope');
        }
        const state = candidates[0];
        const last = state.lastDelivery;
        if (state.retired || !last || last.job_id !== jobId) {
            throw batchConflict('recovery job is not the latest durable delivery for its source');
        }
        const key = deliveryKey(last);
        const receipt = state.receipts.get(key);
        const staged = state.staging.get(key);
        const batch = verifiedStagedBatch(staged, receipt, last, state.scope);
        return {
            ...clone(last),
            scope: clone(state.scope),
            content_hash: batch.content_hash,
            scope_digest: contentHash({
                scope: state.scope,
                source_range: batch.payload.source_range ?? null,
                next_cursor: batch.payload.next_cursor
            })
        };
    }
}

class FileAnalysisStore extends MemoryAnalysisStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-analysis') } = {}) {
        super();
        this.rootDir = path.resolve(rootDir);
        this.mutationQueue = new KeyedMutationQueue();
    }

    pathFor(scope) {
        const normalized = normalizeScope(scope);
        const digest = crypto.createHash('sha256').update(scopeKey(normalized)).digest('hex');
        return path.join(this.rootDir, `${digest}.json`);
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    async _loadAll({ strict = false } = {}) {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        for (const name of await fs.promises.readdir(this.rootDir)) {
            if (!name.endsWith('.json')) continue;
            const filePath = path.join(this.rootDir, name);
            let value;
            try {
                value = JSON.parse((await fs.promises.readFile(filePath)).toString('utf8'));
            } catch (error) {
                if (strict) throw batchConflict('durable analysis evidence cannot be read', { file: name });
                continue;
            }
            let fileScope;
            try {
                fileScope = normalizeScope(value?.scope || value);
            } catch (error) {
                if (strict) throw batchConflict('durable analysis evidence has an invalid scope', { file: name });
                continue;
            }
            const key = scopeKey(fileScope);
            if (!this.states.has(key)) this.states.set(key, stateFromJson(value, fileScope));
        }
    }

    async _state(scope) {
        const normalized = normalizeScope(scope);
        const key = scopeKey(normalized);
        if (!this.states.has(key)) {
            let value = null;
            try {
                value = JSON.parse((await fs.promises.readFile(this.pathFor(normalized))).toString('utf8'));
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
            if (value && !sameScope(normalizeScope(value.scope || value), normalized)) {
                throw batchConflict('durable analysis scope does not match its requested source');
            }
            this.states.set(key, value ? stateFromJson(value, normalized) : emptyState(normalized));
        }
        return this.states.get(key);
    }

    async _persist(state) {
        await atomicWriteJson(this.pathFor(state.scope), stateToJson(state));
    }

    async replaceScope(scope, replacementBatchId = null) {
        const state = await super.replaceScope(scope, replacementBatchId);
        await this._persist(state);
        return state;
    }

    async replaceConversation(conversationId, scope, replacementBatchId = null) {
        const normalizedConversationId = String(conversationId || '').trim();
        const normalized = normalizeScope(scope);
        await this._loadAll();
        const newKey = scopeKey(normalized);
        const retiredStates = [];
        for (const [key, candidate] of this.states) {
            if (key !== newKey
                && candidate.scope.conversationId === normalizedConversationId
                && !candidate.retired) {
                const retired = retiredState(candidate.scope);
                this.states.set(key, retired);
                retiredStates.push(retired);
            }
        }
        this.operations.push(['replace_conversation', normalizedConversationId, newKey]);
        for (const retired of retiredStates) await this._persist(retired);
        const state = emptyState(normalized);
        state.replaceApplied = true;
        state.replacementBatchId = replacementBatchId;
        this.states.set(newKey, state);
        await this._persist(state);
        return state;
    }

    async applyBatch(batch) {
        if (!isTargetBatchMessage(batch)) return super.applyBatch(batch);
        return this.mutationQueue.run('all', async () => {
            const normalized = normalizeTargetBatch(batch);
            await this._loadAll();
            const key = scopeKey(normalized.scope);
            const hadState = this.states.has(key);
            const before = hadState ? stateToJson(this.states.get(key)) : null;
            const operationsBefore = this.operations.length;
            try {
                const result = await super.applyBatch(batch);
                if (result.mutated) await this._persist(result.state);
                return result;
            } catch (error) {
                if (hadState) this.states.set(key, stateFromJson(before, normalized.scope));
                else this.states.delete(key);
                this.operations.length = operationsBefore;
                throw error;
            }
        });
    }

    async assertScopeWritable(scope) {
        await this.mutationQueue.wait('all');
        await this._loadAll();
        return super.assertScopeWritable(scope);
    }

    async assertCompleteCommit(scope, requestId, identity = {}) {
        await this.mutationQueue.wait('all');
        await this._loadAll();
        return super.assertCompleteCommit(scope, requestId, identity);
    }

    async snapshot(scope) {
        await this.mutationQueue.wait('all');
        await this._loadAll();
        return super.snapshot(scope);
    }

    async getRecoveryDelivery(identity) {
        await this.mutationQueue.wait('all');
        await this._loadAll({ strict: true });
        return super.getRecoveryDelivery(identity);
    }
}

function sourceOrderOf(record) {
    const event = record?.event || {};
    const metadata = event.payload?.metadata || {};
    const sourceRef = record?.source_ref || metadata.source_ref || {};
    return [
        Number.isSafeInteger(sourceRef.rollout_ordinal) ? sourceRef.rollout_ordinal : -1,
        Number.isSafeInteger(sourceRef.physical_line_ordinal)
            ? sourceRef.physical_line_ordinal
            : (Number.isSafeInteger(metadata.sequence) ? metadata.sequence : 0),
        Number.isSafeInteger(sourceRef.byte_start) ? sourceRef.byte_start : 0
    ];
}

function compareSourceOrder(left, right) {
    const a = left.order;
    const b = right.order;
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
        || left.itemKey.localeCompare(right.itemKey);
}

function productEventFact(record) {
    const event = record?.event || {};
    const eventPayload = isObject(event.payload) ? clone(event.payload) : {};
    const metadata = isObject(eventPayload.metadata) ? eventPayload.metadata : {};
    delete eventPayload.metadata;

    // SessionContext.history_base is lineage/source-cut evidence used by the
    // Rust collector to resolve a child rollout. It is not session business
    // context and must stay in staging/checkpoint evidence. Keep this
    // schema-specific removal local to SessionContext; business payloads with
    // a field named history_base are not recursively filtered.
    if (event.event_type === 'SessionContext') delete eventPayload.history_base;

    return {
        ...(typeof event.event_type === 'string' ? { event_type: event.event_type } : {}),
        ...(typeof metadata.timestamp === 'string' ? { timestamp: metadata.timestamp } : {}),
        ...(typeof metadata.correlation_id === 'string' ? { correlation_id: metadata.correlation_id } : {}),
        ...(typeof metadata.related_item_key === 'string' ? { related_item_key: metadata.related_item_key } : {}),
        payload: eventPayload
    };
}

function isProductHistoryEvent(record) {
    const eventType = record?.event?.event_type;
    return typeof eventType === 'string' && !INTERNAL_ANALYSIS_EVENT_TYPES.has(eventType);
}

function productRowsFromSnapshot(snapshot) {
    const projection = snapshot?.projection;
    if (!projection || !Array.isArray(projection.turns)) return null;

    const projectedByKey = new Map();
    for (const turn of projection.turns) {
        for (const item of Array.isArray(turn.items) ? turn.items : []) {
            if (typeof item?.item_key === 'string' && item.item_key) {
                projectedByKey.set(item.item_key, item);
            }
        }
    }

    const eventGroups = new Map();
    for (const record of Array.isArray(snapshot.items) ? snapshot.items : []) {
        const event = record?.event || {};
        const metadata = event.payload?.metadata || {};
        const itemKey = record?.item_key || metadata.item_key;
        if (typeof itemKey !== 'string' || !itemKey) continue;
        const group = eventGroups.get(itemKey) || [];
        group.push(record);
        eventGroups.set(itemKey, group);
    }

    // `snapshot.items` contains every adapted AnalysisEvent, including the
    // Diagnostic/ParseGap/UnknownEvent carriers that the reducer keeps only
    // as internal evidence.  Product rows are justified by reduced items or
    // schema-validated business events.  Do not use a field-name heuristic:
    // non-reduced SessionContext/RateLimitUpdated facts and business fields
    // named diagnostic/code/sourcePath/requestId must remain visible.
    const businessEventKeys = [...eventGroups.entries()]
        .filter(([, records]) => records.some(isProductHistoryEvent))
        .map(([itemKey]) => itemKey);
    const keys = new Set([...projectedByKey.keys(), ...businessEventKeys]);
    const ordered = [...keys].map((itemKey) => {
        const rawRecords = eventGroups.get(itemKey) || [];
        const records = rawRecords.filter(isProductHistoryEvent);
        const projected = projectedByKey.get(itemKey) || null;
        const first = records[0] || rawRecords[0] || null;
        const metadata = first?.event?.payload?.metadata || {};
        return {
            itemKey,
            records,
            projected,
            order: first ? sourceOrderOf(first) : [
                -1,
                Number.isSafeInteger(projected?.sequence) ? projected.sequence : 0,
                0
            ],
            turnId: projected?.turn_id || metadata.turn_id || null
        };
    }).sort(compareSourceOrder);

    return ordered.map((entry, ordinal) => {
        const first = entry.records[0];
        const projectedPayload = entry.projected ? clone(entry.projected) : {};
        // SourceRef is Rust's internal locator/cursor provenance. Preserve the
        // event's business path fields while keeping this internal field out
        // of the product DTO.
        delete projectedPayload.source_ref;
        const eventFacts = entry.records.map(productEventFact);
        const eventIds = entry.records.map((record) => (
            record?.event_id || record?.event?.payload?.metadata?.event_id || null
        )).filter(Boolean);
        const itemType = entry.projected?.kind
            || first?.event?.event_type
            || 'event';

        return {
            itemKey: entry.itemKey,
            eventId: entry.records.length === 1 && eventIds.length === 1 ? eventIds[0] : null,
            turnId: entry.turnId,
            itemType,
            ordinal,
            payload: {
                ...projectedPayload,
                ...(itemType === 'delegated_input' || first?.event?.event_type === 'DelegatedInput' ? { role: 'system' } : {}),
                eventFacts
            }
        };
    });
}

function productDetailsFromSnapshot(snapshot) {
    return (Array.isArray(snapshot?.tool_details) ? snapshot.tool_details : []).map((detail) => {
        const payload = clone(detail);
        delete payload.item_key;
        delete payload.completeness;
        delete payload.source_epoch;
        delete payload.revision;
        delete payload.source_ref;
        return {
            detailKey: detail.item_key || detail.call_id,
            itemKey: detail.item_key || null,
            payload
        };
    });
}

function productUsageFromSnapshot(snapshot) {
    if (!snapshot?.usage || !isObject(snapshot.usage)) return [];
    const payload = clone(snapshot.usage);
    delete payload.completeness;
    delete payload.source_epoch;
    delete payload.revision;
    return [{ usageKey: 'conversation', payload }];
}

function productOutcomesFromSnapshot(snapshot) {
    return (Array.isArray(snapshot?.task_outcomes) ? snapshot.task_outcomes : []).map((outcome) => {
        const payload = clone(outcome);
        delete payload.item_key;
        delete payload.completeness;
        delete payload.source_epoch;
        delete payload.revision;
        return { outcomeKey: outcome.item_key, payload };
    });
}

function productProjectionFromSnapshot(snapshot, checkpoint) {
    const projection = snapshot?.projection;
    if (!snapshot?.canonical || !snapshot?.complete || snapshot?.provisional !== false
        || !projection || projection.complete !== true || projection.provisional === true
        || projection.coverage !== 'complete') {
        return null;
    }
    const items = productRowsFromSnapshot(snapshot);
    if (!items) return null;
    return {
        items,
        toolDetails: productDetailsFromSnapshot(snapshot),
        usage: productUsageFromSnapshot(snapshot),
        taskOutcomes: productOutcomesFromSnapshot(snapshot),
        coverage: {
            completeness: 'canonical',
            coverageComplete: true,
            itemCount: items.length,
            turnCount: projection.turns.length
        },
        checkpoint: clone(checkpoint)
    };
}

class AnalysisBatchImporter {
    constructor({ store = new MemoryAnalysisStore(), checkpointStore = null, productStore = null } = {}) {
        this.store = store;
        this.checkpointStore = checkpointStore;
        this.productStore = productStore;
    }

    async init() {
        await this.store?.init?.();
        await this.checkpointStore?.init?.();
        return this;
    }

    async importBatch(batch, options = {}) {
        const normalized = normalizeTargetBatch(batch);
        assertExpectedIdentity(normalized, options);
        let normalizedCheckpoint = null;
        if (options.checkpoint !== undefined && options.checkpoint !== null) {
            normalizedCheckpoint = this._validateCheckpointForBatch(
                options.checkpoint,
                normalized
            );
        }

        const result = await this.store.applyBatch(batch);
        if (normalizedCheckpoint && this.checkpointStore) {
            await this.checkpointStore.save(
                {
                    ...normalized.scope,
                    job_id: normalized.identity.job_id,
                    request_id: normalized.identity.request_id
                },
                normalizedCheckpoint
            );
        }
        const imported = {
            accepted: true,
            persisted: true,
            duplicate: result.duplicate,
            scope: normalized.scope,
            delivery: {
                job_id: normalized.identity.job_id,
                segment_id: normalized.identity.segment_id,
                batch_id: normalized.identity.batch_id,
                request_id: normalized.identity.request_id
            },
            receipt: result.receipt,
            staging: result.staging,
            state: await this.store.snapshot(normalized.scope)
        };
        if (this.productStore) {
            await this.productStore.stageBatch({
                conversationId: normalized.scope.conversationId,
                batchId: normalized.identity.batch_id,
                deliveryIdentity: {
                    job_id: normalized.identity.job_id,
                    segment_id: normalized.identity.segment_id,
                    batch_id: normalized.identity.batch_id,
                    source_scope: {
                        conversation_id: normalized.scope.conversationId,
                        source_id: normalized.scope.sourceId,
                        source_epoch: normalized.scope.sourceEpoch
                    }
                },
                payload: normalized.staged_payload
            });
        }
        return imported;
    }

    async commitComplete(complete, {
        scope,
        checkpoint = complete?.checkpoint || null,
        acceptedDelivery = undefined,
        accepted_delivery: acceptedDeliverySnake = undefined
    } = {}) {
        validateMessage(complete);
        const normalizedScope = normalizeScope(scope || checkpoint);
        const normalizedCheckpoint = this._validateCheckpointForComplete(
            checkpoint,
            normalizedScope,
            complete
        );
        const delivery = acceptedDelivery ?? acceptedDeliverySnake ?? null;
        const normalizedDelivery = delivery === null
            ? null
            : normalizeDeliveryIdentity(delivery);
        if (normalizedDelivery) {
            if (normalizedDelivery.request_id !== complete.request_id
                || normalizedDelivery.job_id !== complete.job_id
                || normalizedDelivery.segment_id !== normalizedCheckpoint.projection_watermark.segment_id
                || normalizedDelivery.batch_id !== normalizedCheckpoint.projection_watermark.batch_id) {
                throw importerError(
                    'ANALYSIS_COMPLETE_DELIVERY_MISMATCH',
                    'complete checkpoint watermark does not match the accepted batch delivery',
                    {
                        accepted_delivery: normalizedDelivery,
                        checkpoint_watermark: normalizedCheckpoint.projection_watermark
                    }
                );
            }
            if (normalizedDelivery.scope
                && !sameScope(normalizedDelivery.scope, normalizedScope)) {
                throw importerError(
                    'ANALYSIS_COMPLETE_DELIVERY_MISMATCH',
                    'complete delivery scope does not match the checkpoint scope',
                    { accepted_scope: normalizedDelivery.scope, checkpoint_scope: normalizedScope }
                );
            }
        }
        if (typeof this.store.assertCompleteCommit === 'function') {
            await this.store.assertCompleteCommit(normalizedScope, complete.request_id, {
                job_id: complete.job_id,
                segment_id: normalizedCheckpoint.projection_watermark.segment_id,
                batch_id: normalizedCheckpoint.projection_watermark.batch_id,
                expected_delivery: normalizedDelivery,
                scope: normalizedScope
            });
        }
        // A self-consistent complete is not evidence that its range/state was
        // delivered. Bind it to the durable payload of the last ACKed batch.
        const snapshot = await this.store.snapshot(normalizedScope);
        const staged = snapshot.staging?.find((entry) => (
            entry.job_id === complete.job_id
            && entry.segment_id === normalizedCheckpoint.projection_watermark.segment_id
            && entry.batch_id === normalizedCheckpoint.projection_watermark.batch_id
            && entry.persisted === true
            && entry.request_ids?.includes(complete.request_id)
        ));
        if (!staged) {
            throw importerError(
                'ANALYSIS_COMPLETE_WITHOUT_BATCH',
                'complete requires durable payload evidence from the current attempt'
            );
        }
        const identity = {
            request_id: complete.request_id,
            job_id: staged.job_id,
            segment_id: staged.segment_id,
            batch_id: staged.batch_id
        };
        const receipt = snapshot.receipts?.find((entry) => entry.delivery_key === deliveryKey(identity));
        const batch = verifiedStagedBatch(staged, receipt, identity, normalizedScope);
        this._validateCheckpointForBatch(normalizedCheckpoint, batch);
        if (this.checkpointStore) {
            await this.checkpointStore.save(
                {
                    ...normalizedScope,
                    job_id: complete.job_id,
                    request_id: complete.request_id
                },
                normalizedCheckpoint
            );
        }
        const finalSnapshot = await this.store.snapshot(normalizedScope);
        if (this.productStore && complete.completeness === 'canonical') {
            const projection = productProjectionFromSnapshot(finalSnapshot, normalizedCheckpoint);
            if (!projection) {
                throw importerError(
                    'ANALYSIS_PRODUCT_PROJECTION_INCOMPLETE',
                    'canonical complete did not produce a complete product projection'
                );
            }
            const batchId = normalizedDelivery?.batch_id
                || normalizedCheckpoint.projection_watermark?.batch_id;
            if (!batchId) {
                throw importerError(
                    'ANALYSIS_PRODUCT_DELIVERY_MISSING',
                    'canonical product publication requires its accepted batch identity'
                );
            }
            const stagedProductBatch = await this.productStore.readStagedBatch(
                normalizedScope.conversationId,
                batchId
            );
            if (!stagedProductBatch) {
                throw importerError(
                    'ANALYSIS_PRODUCT_STAGING_MISSING',
                    'canonical product publication requires durable product staging'
                );
            }
            // A process may stop after the product transaction commits but
            // before the run receipt is marked complete. The repeated Rust
            // complete can carry a fresh request_id for the same durable
            // batch; the already-published product projection remains valid.
            if (!stagedProductBatch.publishedAt) {
                await this.productStore.publishCanonical({
                    conversationId: normalizedScope.conversationId,
                    batchId,
                    ...projection
                });
            }
        }
        return finalSnapshot;
    }

    _normalizeCheckpoint(checkpoint) {
        try {
            return normalizeCheckpoint(checkpoint);
        } catch (error) {
            const wrapped = new Error(`invalid analyzer checkpoint: ${error.message}`);
            wrapped.code = 'ANALYSIS_CHECKPOINT_INVALID';
            wrapped.cause = error;
            throw wrapped;
        }
    }

    _validateCheckpointForBatch(checkpoint, batch) {
        const normalized = this._normalizeCheckpoint(checkpoint);
        if (!sameScope(normalized.scope, batch.scope)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH',
                'checkpoint scope does not match batch scope'
            );
        }
        const value = normalized.checkpoint;
        if (value.job_id !== batch.identity.job_id) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_JOB_MISMATCH',
                'checkpoint job_id does not match batch envelope'
            );
        }
        if (value.request_id !== batch.identity.request_id) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_REQUEST_MISMATCH',
                'checkpoint request_id does not match batch envelope'
            );
        }
        if (value.completeness !== batch.payload.completeness) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_COMPLETENESS_MISMATCH',
                'checkpoint completeness does not match batch'
            );
        }
        if (!sameJson(value.source.source_range, batch.payload.source_range)
            || !sameJson(value.segment.source_range, batch.payload.source_range)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_RANGE_MISMATCH',
                'checkpoint source range does not match batch'
            );
        }
        if (!sameJson(value.cursor, batch.payload.next_cursor)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_CURSOR_MISMATCH',
                'checkpoint cursor does not match batch next_cursor'
            );
        }
        const provenance = batch.payload.parser_provenance;
        if (['parser_backend', 'wire_source_revision', 'compatibility_profile'].some(
            (field) => !sameJson(value.wire_profile[field], provenance[field])
        )) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_PROVENANCE_MISMATCH',
                'checkpoint parser provenance does not match the accepted batch'
            );
        }
        if (value.projection_watermark.segment_id !== batch.identity.segment_id
            || value.projection_watermark.batch_id !== batch.identity.batch_id
            || value.projection_watermark.source_epoch !== batch.scope.sourceEpoch
            || (value.projection_watermark.source_id !== null
                && value.projection_watermark.source_id !== batch.scope.sourceId)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_DELIVERY_MISMATCH',
                'checkpoint projection watermark does not match batch delivery'
            );
        }
        if (batch.payload.reducer_state
            && !sameJson(value.reducer_state, batch.payload.reducer_state)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_REDUCER_MISMATCH',
                'checkpoint reducer state does not match batch'
            );
        }
        if (!sameJson(value.lineage_checkpoint, batch.payload.lineage_checkpoint ?? null)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_LINEAGE_MISMATCH',
                'checkpoint lineage evidence does not match batch'
            );
        }
        return normalized.checkpoint;
    }

    _validateCheckpointForComplete(checkpoint, scope, complete) {
        const normalized = this._normalizeCheckpoint(checkpoint);
        if (!sameScope(normalized.scope, scope)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH',
                'checkpoint scope does not match complete scope'
            );
        }
        const value = normalized.checkpoint;
        if (value.job_id !== complete.job_id) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_JOB_MISMATCH',
                'checkpoint job_id does not match complete'
            );
        }
        if (value.request_id !== complete.request_id) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_REQUEST_MISMATCH',
                'checkpoint request_id does not match complete'
            );
        }
        if (value.completeness !== complete.completeness
            || !sameJson(value.cursor, complete.next_cursor)) {
            throw importerError(
                'ANALYSIS_CHECKPOINT_COMPLETENESS_MISMATCH',
                'checkpoint completeness/cursor does not match complete'
            );
        }
        return value;
    }
}

module.exports = {
    COMPLETENESS_RANK,
    MemoryAnalysisStore,
    FileAnalysisStore,
    AnalysisBatchImporter,
    normalizeScope,
    scopeKey,
    completenessOf,
    itemKeyOf,
    deliveryKey,
    normalizeTargetBatch
};
