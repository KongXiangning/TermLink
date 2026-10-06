'use strict';

const { isDeepStrictEqual } = require('node:util');

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

const ANALYZE_MODES = Object.freeze(['preview', 'backfill', 'append']);
const CURSOR_KINDS = Object.freeze(['tail_preview', 'backfill', 'forward_append']);
const CURSOR_REQUIRED_CAPABILITIES = Object.freeze({
    tail_preview: 'tail_preview',
    backfill: 'backward_segments',
    forward_append: 'append'
});
const SOURCE_KINDS = Object.freeze(['rollout', 'manifest', 'index']);
const SOURCE_COMPRESSIONS = Object.freeze(['plain_jsonl', 'zstd']);
const COMPLETENESS_VALUES = Object.freeze([
    'unknown',
    'partial',
    'provisional',
    'canonical'
]);
const PARSER_COMPATIBILITY_PROFILES = Object.freeze([
    'legacy',
    'current',
    'history-semantics-v2',
    'future-compatible'
]);
const ANALYSIS_EVENT_TYPES = Object.freeze([
    'SessionContext',
    'TurnStarted',
    'UserMessage',
    'AssistantMessage',
    'DelegatedInput',
    'ToolStarted',
    'ToolCompleted',
    'PlanUpdated',
    'PlanQuestion',
    'PlanAnswer',
    'PlanAction',
    'FileChanged',
    'WebSearchFound',
    'AttachmentFound',
    'ArtifactFound',
    'UsageUpdated',
    'RateLimitUpdated',
    'Compaction',
    'Diagnostic',
    'TurnCompleted',
    'ParseGap',
    'UnknownEvent'
]);
const EVENT_AVAILABILITY_VALUES = Object.freeze([
    'present',
    'partial_rollout',
    'unsupported_schema',
    'not_recoverable_from_rollout'
]);
const EVENT_IDENTITY_ORIGINS = Object.freeze(['native_stable_id', 'source_position']);
const EVENT_TERMINAL_EVIDENCE = Object.freeze(['explicit_abort']);
const TURN_STATUS_VALUES = Object.freeze(['completed', 'interrupted', 'partial']);
const PROJECTION_COVERAGES = new Set(['unknown', 'partial', 'complete']);
const REQUIRED_CAPABILITIES = Object.freeze([
    'analyze_v1',
    'cancel',
    'checkpoint',
    'ack'
]);
const HISTORY_SEMANTICS_CAPABILITY = 'history_semantics_v2';
const OPTIONAL_CAPABILITIES = Object.freeze(['last_turn_replacement_v1', HISTORY_SEMANTICS_CAPABILITY]);
const ACK_REJECTION_CODES = Object.freeze([
    'batch_validation_failed',
    'batch_scope_conflict',
    'staging_unavailable'
]);

const LEGACY_ANALYZE_FIELDS = new Set([
    'source_spec',
    'sourceSpec',
    'replay',
    'retention_profile',
    'retentionProfile',
    'replace_previous',
    'replacePrevious',
    'discovery',
    'catalog',
    'path',
    'source_id',
    'source_epoch',
    'sessions_root',
    'sessionsRoot',
    'active_hint',
    'activeHint',
    'date_range',
    'dateRange',
    'lineage',
    'revision'
]);

const ANALYZE_OPTION_KEYS = new Set([
    'requestId',
    'request_id',
    'jobId',
    'job_id',
    'conversationId',
    'conversation_id',
    'mode',
    'cursor',
    'persistedAnchor',
    'persisted_anchor',
    'recovery',
    'knownCompleteRange',
    'known_complete_range',
    'resourceLimits',
    'resource_limits'
]);

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

function hasOwn(value, field) {
    return Object.prototype.hasOwnProperty.call(value, field);
}

function missing(field, message) {
    throw new AnalyzerProtocolError(
        'missing_field',
        message || (field + ' is required'),
        { field }
    );
}

function invalid(field, message) {
    throw new AnalyzerProtocolError(
        'invalid_field',
        message || (field + ' is invalid'),
        { field }
    );
}

function requirePresent(message, field) {
    if (!hasOwn(message, field)) missing(field);
}

function requireString(message, field) {
    if (!hasOwn(message, field) || message[field] === undefined) {
        missing(field, field + ' must be a non-empty string');
    }
    if (!isNonEmptyString(message[field])) {
        invalid(field, field + ' must be a non-empty string');
    }
}

function requireBoolean(message, field) {
    if (!hasOwn(message, field)) missing(field);
    if (typeof message[field] !== 'boolean') {
        invalid(field, field + ' must be boolean');
    }
}

function requireObject(message, field) {
    if (!hasOwn(message, field) || message[field] === undefined) {
        missing(field, field + ' must be an object');
    }
    if (!isObject(message[field])) {
        invalid(field, field + ' must be an object');
    }
}

function requireArray(message, field) {
    if (!hasOwn(message, field)) missing(field, field + ' must be an array');
    if (!Array.isArray(message[field])) {
        invalid(field, field + ' must be an array');
    }
}

function validateOptionalString(value, field) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
        invalid(field, field + ' must be a string or null');
    }
}

function validateOptionalInteger(value, field) {
    if (value !== undefined && value !== null && !Number.isSafeInteger(value)) {
        invalid(field, field + ' must be an integer or null');
    }
}

function validateOptionalNumber(value, field) {
    if (value !== undefined && value !== null
        && (typeof value !== 'number' || !Number.isFinite(value))) {
        invalid(field, field + ' must be a finite number or null');
    }
}

function validateSafeInteger(value, field, minimum = 0) {
    if (!Number.isSafeInteger(value) || value < minimum) {
        invalid(field, field + ' must be a safe integer >= ' + minimum);
    }
}

function requireSafeInteger(message, field, minimum = 0) {
    requirePresent(message, field);
    validateSafeInteger(message[field], field, minimum);
}

function validateEnum(value, field, values) {
    if (!values.includes(value)) {
        invalid(field, field + ' has unsupported value ' + String(value));
    }
}

function validateSourceRange(value, field, { required = false } = {}) {
    if (value === undefined) {
        if (required) missing(field);
        return;
    }
    if (value === null) {
        if (required) invalid(field, field + ' must be a byte range');
        return;
    }
    if (!isObject(value)
        || !Number.isSafeInteger(value.start)
        || !Number.isSafeInteger(value.end)
        || value.start < 0
        || value.end < value.start) {
        invalid(field, field + ' must be an ordered non-negative byte range');
    }
}

function validateSnapshotBoundary(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of ['unit', 'byte_length']) requirePresent(value, key);
    if (value.unit !== 'physical_bytes') {
        invalid(field + '.unit', field + '.unit must be physical_bytes');
    }
    validateSafeInteger(value.byte_length, field + '.byte_length');
}

function validateCompleteLine(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object or null');
    for (const key of ['physical_line_ordinal', 'byte_start', 'byte_end']) {
        requirePresent(value, key);
    }
    validateSafeInteger(value.physical_line_ordinal, field + '.physical_line_ordinal', 1);
    validateSafeInteger(value.byte_start, field + '.byte_start');
    validateSafeInteger(value.byte_end, field + '.byte_end', 1);
    if (value.byte_start >= value.byte_end) {
        invalid(field + '.byte_end', field + '.byte_end must exceed byte_start');
    }
}

function validateCursorCapabilities(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of [
        'forward_stream',
        'tail_preview',
        'backward_segments',
        'append',
        'random_seek'
    ]) {
        requireBoolean(value, key);
    }
}

function validateCursor(value, field = 'cursor') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of [
        'schema_version',
        'reader_backend',
        'reader_version',
        'cursor_kind',
        'conversation_id',
        'source_id',
        'source_epoch',
        'source_kind',
        'compression',
        'snapshot_boundary',
        'complete_range',
        'last_complete_line',
        'last_rollout_ordinal',
        'capabilities'
    ]) {
        requirePresent(value, key);
    }
    if (value.schema_version !== 1) {
        invalid(field + '.schema_version', field + '.schema_version must be 1');
    }
    requireString(value, 'reader_backend');
    requireString(value, 'reader_version');
    validateEnum(value.cursor_kind, field + '.cursor_kind', CURSOR_KINDS);
    requireString(value, 'conversation_id');
    requireString(value, 'source_id');
    requireString(value, 'source_epoch');
    if (value.source_epoch === 'unbound') {
        invalid(field + '.source_epoch', field + '.source_epoch must be bound');
    }
    validateEnum(value.source_kind, field + '.source_kind', SOURCE_KINDS);
    validateEnum(value.compression, field + '.compression', SOURCE_COMPRESSIONS);
    validateSnapshotBoundary(value.snapshot_boundary, field + '.snapshot_boundary');
    validateSourceRange(value.complete_range, field + '.complete_range', { required: true });
    if (value.complete_range.end > value.snapshot_boundary.byte_length) {
        invalid(
            field + '.complete_range',
            field + '.complete_range.end must not exceed snapshot boundary'
        );
    }
    if (value.last_complete_line !== null) {
        validateCompleteLine(value.last_complete_line, field + '.last_complete_line');
        if (value.last_complete_line.byte_end !== value.complete_range.end) {
            invalid(
                field + '.last_complete_line.byte_end',
                field + '.last_complete_line.byte_end must equal complete_range.end'
            );
        }
    }
    if (value.last_rollout_ordinal !== null) {
        validateSafeInteger(value.last_rollout_ordinal, field + '.last_rollout_ordinal');
    }
    validateCursorCapabilities(value.capabilities, field + '.capabilities');
    const requiredCapability = CURSOR_REQUIRED_CAPABILITIES[value.cursor_kind];
    if (!value.capabilities[requiredCapability]) {
        invalid(
            field + '.capabilities',
            requiredCapability + ' capability is required by cursor kind ' + value.cursor_kind
        );
    }
    if (value.compression !== 'plain_jsonl') {
        invalid(field + '.compression', 'only plain_jsonl cursors are resumable');
    }
}

function validateCompatibilityProfile(value, field) {
    if (isNonEmptyString(value)) return;
    if (!isObject(value)) {
        invalid(field, field + ' must be a non-empty string or profile object');
    }
    requireString(value, 'profile_id');
    requireString(value, 'profile_version');
    requireArray(value, 'features');
    value.features.forEach((feature, index) => {
        if (!isNonEmptyString(feature)) invalid(
            field + '.features[' + index + ']',
            field + '.features must contain non-empty strings'
        );
    });
}

function validateParserProvenance(value, field = 'parser_provenance') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'parser_backend');
    requireString(value, 'wire_source_revision');
    requireString(value, 'compatibility_profile');
    validateEnum(
        value.compatibility_profile,
        field + '.compatibility_profile',
        PARSER_COMPATIBILITY_PROFILES
    );
}

function validateSourceRef(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'source_identity');
    for (const key of ['byte_start', 'byte_end', 'physical_line_ordinal']) {
        requireSafeInteger(value, key);
    }
    if (value.physical_line_ordinal === 0) {
        invalid(
            field + '.physical_line_ordinal',
            field + '.physical_line_ordinal must be positive'
        );
    }
    if (value.byte_end < value.byte_start) {
        invalid(field + '.byte_end', field + '.byte_end must not precede byte_start');
    }
    if (hasOwn(value, 'rollout_ordinal') && value.rollout_ordinal !== null) {
        validateSafeInteger(value.rollout_ordinal, field + '.rollout_ordinal');
    }
    for (const key of ['timestamp', 'item_type']) {
        if (hasOwn(value, key) && value[key] !== null && !isNonEmptyString(value[key])) {
            invalid(field + '.' + key, field + '.' + key + ' must be a non-empty string or null');
        }
    }
}

function validateSourceRefScope(value, sourceId, sourceRange, field) {
    if (value.source_identity === sourceId
        && sourceRange
        && (value.byte_start < sourceRange.start || value.byte_end > sourceRange.end)) {
        invalid(field, field + ' exceeds the batch source scope');
    }
}

function validateHistoryBase(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'parent_rollout_id');
    requireSafeInteger(value, 'end_ordinal_exclusive');
    requireSafeInteger(value, 'end_byte_offset');
}

function validateLineageTransition(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'parent_rollout_id');
    requireString(value, 'child_rollout_id');
    if (value.parent_rollout_id === value.child_rollout_id) {
        invalid(field, field + ' parent and child must differ');
    }
    requireObject(value, 'history_base');
    validateHistoryBase(value.history_base, field + '.history_base');
    if (value.history_base.parent_rollout_id !== value.parent_rollout_id) {
        invalid(
            field + '.history_base.parent_rollout_id',
            field + '.history_base.parent_rollout_id must match parent_rollout_id'
        );
    }
    requireString(value, 'validation_state');
    validateEnum(
        value.validation_state,
        field + '.validation_state',
        ['validated', 'validation_unavailable']
    );
}

function validateLineageCoverage(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'root_rollout_id');
    requireString(value, 'active_head_rollout_id');
    requireArray(value, 'chain_rollout_ids');
    if (value.chain_rollout_ids.length === 0) {
        invalid(field + '.chain_rollout_ids', field + '.chain_rollout_ids must not be empty');
    }
    value.chain_rollout_ids.forEach((rolloutId, index) => {
        if (!isNonEmptyString(rolloutId)) invalid(
            field + '.chain_rollout_ids[' + index + ']',
            field + '.chain_rollout_ids must contain non-empty strings'
        );
    });
    requireSafeInteger(value, 'covered_source_count');
    if (value.covered_source_count === 0
        || !value.chain_rollout_ids.includes(value.root_rollout_id)
        || !value.chain_rollout_ids.includes(value.active_head_rollout_id)) {
        invalid(
            field,
            field + ' must cover at least one source and include root and active head'
        );
    }
    requireBoolean(value, 'complete');
}

function validateDateOrNull(value, field) {
    if (value === null) return;
    if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        invalid(field, field + ' must be YYYY-MM-DD or null');
    }
}

function validateLineageCheckpoint(value, field) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of [
        'schema_version',
        'conversation_id',
        'root_rollout_id',
        'active_head_rollout_id',
        'chain_rollout_ids',
        'start_date',
        'end_date',
        'coverage'
    ]) {
        requirePresent(value, key);
    }
    if (value.schema_version !== 1) invalid(field + '.schema_version', 'schema_version must be 1');
    requireString(value, 'conversation_id');
    requireString(value, 'root_rollout_id');
    requireString(value, 'active_head_rollout_id');
    requireArray(value, 'chain_rollout_ids');
    if (value.chain_rollout_ids.length === 0) {
        invalid(field + '.chain_rollout_ids', field + '.chain_rollout_ids must not be empty');
    }
    value.chain_rollout_ids.forEach((rolloutId, index) => {
        if (!isNonEmptyString(rolloutId)) invalid(
            field + '.chain_rollout_ids[' + index + ']',
            field + '.chain_rollout_ids must contain non-empty strings'
        );
    });
    validateDateOrNull(value.start_date, field + '.start_date');
    validateDateOrNull(value.end_date, field + '.end_date');
    validateLineageCoverage(value.coverage, field + '.coverage');
    if (value.coverage.root_rollout_id !== value.root_rollout_id
        || value.coverage.active_head_rollout_id !== value.active_head_rollout_id
        || !isDeepStrictEqual(value.coverage.chain_rollout_ids, value.chain_rollout_ids)) {
        invalid(field + '.coverage', field + '.coverage must match lineage checkpoint identity');
    }
}

function projectionCoverageOf(value, field = 'projection') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    if (value.coverage !== undefined && value.coverage !== null) {
        validateEnum(value.coverage, field + '.coverage', ['unknown', 'partial', 'complete']);
        return value.coverage;
    }
    if (value.complete === true && value.provisional !== true) return 'complete';
    if (value.provisional === true || value.complete === false) return 'partial';
    return 'unknown';
}

function validateProjection(value, completeness, field = 'projection') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requirePresent(value, 'coverage');
    const coverage = projectionCoverageOf(value, field);
    if (hasOwn(value, 'conversation_id')) requireString(value, 'conversation_id');
    if (hasOwn(value, 'complete')) requireBoolean(value, 'complete');
    if (hasOwn(value, 'provisional')) requireBoolean(value, 'provisional');
    for (const key of ['turns', 'diagnostics']) {
        if (hasOwn(value, key)) requireArray(value, key);
    }
    if (coverage === 'complete' && value.provisional === true) {
        invalid(field + '.coverage', field + '.complete coverage cannot be provisional');
    }
    if (coverage === 'partial' && value.complete === true) {
        invalid(field + '.coverage', field + '.partial coverage cannot claim complete content');
    }
    if (completeness === 'canonical' && coverage !== 'complete') {
        invalid(field + '.coverage', 'canonical batch requires complete projection coverage');
    }
    return coverage;
}

function validateProgress(value, field = 'progress') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of ['records_seen', 'records_emitted', 'bytes_scanned', 'has_more']) {
        requirePresent(value, key);
    }
    validateSafeInteger(value.records_seen, field + '.records_seen');
    validateSafeInteger(value.records_emitted, field + '.records_emitted');
    validateSafeInteger(value.bytes_scanned, field + '.bytes_scanned');
    requireBoolean(value, 'has_more');
    if (value.records_emitted > value.records_seen) {
        invalid(field + '.records_emitted', field + '.records_emitted must not exceed records_seen');
    }
}

function validateEventMetadata(value, field, batch) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'event_id');
    requireString(value, 'item_key');
    requireSafeInteger(value, 'sequence');
    requirePresent(value, 'availability');
    validateEnum(value.availability, field + '.availability', EVENT_AVAILABILITY_VALUES);
    requireObject(value, 'source_ref');
    validateSourceRef(value.source_ref, field + '.source_ref');
    validateSourceRefScope(
        value.source_ref,
        batch.source_id,
        batch.source_range,
        field + '.source_ref'
    );
    for (const key of [
        'correlation_id',
        'related_item_key',
        'conversation_id',
        'turn_id',
        'timestamp'
    ]) {
        validateOptionalString(value[key], field + '.' + key);
    }
    if (hasOwn(value, 'identity_origin')) {
        validateEnum(value.identity_origin, field + '.identity_origin', EVENT_IDENTITY_ORIGINS);
    }
    if (hasOwn(value, 'terminal_evidence') && value.terminal_evidence !== null) {
        validateEnum(
            value.terminal_evidence,
            field + '.terminal_evidence',
            EVENT_TERMINAL_EVIDENCE
        );
    }
    if (value.conversation_id !== undefined
        && value.conversation_id !== null
        && value.conversation_id !== batch.conversation_id) {
        invalid(
            field + '.conversation_id',
            field + '.conversation_id must match batch conversation_id'
        );
    }
}

function validatePlanStep(value, index, field) {
    if (!isObject(value)) invalid(field + '[' + index + ']', field + '[' + index + '] must be an object');
    requireString(value, 'step');
    requireString(value, 'status');
}

function validatePlanOption(value, index, field) {
    if (!isObject(value)) invalid(field + '[' + index + ']', field + '[' + index + '] must be an object');
    requireString(value, 'label');
    requireString(value, 'description');
}

function validateAnalysisEvent(value, index, batch) {
    const field = 'payload.history_items[' + index + ']';
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'event_type');
    validateEnum(value.event_type, field + '.event_type', ANALYSIS_EVENT_TYPES);
    requireObject(value, 'payload');
    requireObject(value.payload, 'metadata');
    validateEventMetadata(value.payload.metadata, field + '.payload.metadata', batch);

    const payload = value.payload;
    switch (value.event_type) {
        case 'SessionContext':
            for (const key of ['session_id', 'cwd', 'source', 'model_provider']) {
                validateOptionalString(payload[key], field + '.payload.' + key);
            }
            if (hasOwn(payload, 'history_base') && payload.history_base !== null) {
                validateHistoryBase(payload.history_base, field + '.payload.history_base');
            }
            break;
        case 'TurnStarted':
            validateOptionalInteger(payload.model_context_window, field + '.payload.model_context_window');
            validateOptionalString(
                payload.collaboration_mode_kind,
                field + '.payload.collaboration_mode_kind'
            );
            break;
        case 'UserMessage':
        case 'AssistantMessage':
            requireString(payload, 'text');
            break;
        case 'DelegatedInput': {
            for (const key of ['item_id', 'origin_tool', 'namespace', 'carrier', 'text']) requireString(payload, key);
            validateEnum(payload.origin_tool, field + '.payload.origin_tool', ['create_thread', 'send_message_to_thread']);
            validateEnum(payload.carrier, field + '.payload.carrier', ['response_item', 'item_completed']);
            const metadata = payload.metadata;
            if (payload.namespace !== 'codex_app'
                || metadata.item_key !== 'delegated-input:' + payload.item_id
                || metadata.correlation_id !== payload.item_id
                || metadata.related_item_key !== null
                || metadata.identity_origin !== 'native_stable_id'
                || metadata.availability !== 'present'
                || metadata.conversation_id !== batch.conversation_id
                || !isNonEmptyString(metadata.turn_id)
                || hasOwn(payload, 'call_id')
                || batch.reducer_state?.reducer_version !== 'target-v2'
                || batch.parser_provenance?.compatibility_profile !== 'history-semantics-v2') {
                invalid(field, 'delegated history requires verified identity, attribution and v2 profile');
            }
            break;
        }
        case 'ToolStarted':
            requireString(payload, 'tool_kind');
            validateOptionalString(payload.tool_name, field + '.payload.tool_name');
            requireString(payload, 'call_id');
            validateOptionalString(payload.input, field + '.payload.input');
            break;
        case 'ToolCompleted':
            requireString(payload, 'tool_kind');
            requireString(payload, 'call_id');
            validateOptionalString(payload.output, field + '.payload.output');
            break;
        case 'PlanUpdated':
            validateOptionalString(payload.explanation, field + '.payload.explanation');
            requireArray(payload, 'steps');
            payload.steps.forEach((step, stepIndex) => {
                validatePlanStep(step, stepIndex, field + '.payload.steps');
            });
            break;
        case 'PlanQuestion':
            for (const key of ['call_id', 'question_id', 'header', 'question']) {
                requireString(payload, key);
            }
            requireArray(payload, 'options');
            payload.options.forEach((option, optionIndex) => {
                validatePlanOption(option, optionIndex, field + '.payload.options');
            });
            break;
        case 'PlanAnswer':
            for (const key of ['call_id', 'question_id', 'answer']) requireString(payload, key);
            break;
        case 'PlanAction':
            requireString(payload, 'action');
            break;
        case 'FileChanged':
            validateOptionalString(payload.path, field + '.payload.path');
            validateOptionalString(payload.summary, field + '.payload.summary');
            break;
        case 'WebSearchFound':
            validateOptionalString(payload.query, field + '.payload.query');
            validateOptionalString(payload.result, field + '.payload.result');
            break;
        case 'AttachmentFound':
            validateOptionalString(payload.name, field + '.payload.name');
            validateOptionalString(payload.media_type, field + '.payload.media_type');
            break;
        case 'ArtifactFound':
            validateOptionalString(payload.artifact_id, field + '.payload.artifact_id');
            validateOptionalString(payload.name, field + '.payload.name');
            break;
        case 'UsageUpdated':
            for (const key of [
                'input_tokens',
                'cached_input_tokens',
                'output_tokens',
                'reasoning_output_tokens',
                'total_tokens',
                'last_input_tokens',
                'last_cached_input_tokens',
                'last_output_tokens',
                'last_reasoning_output_tokens',
                'last_total_tokens',
                'model_context_window'
            ]) {
                validateOptionalInteger(payload[key], field + '.payload.' + key);
            }
            break;
        case 'RateLimitUpdated':
            for (const key of ['primary_used_percent', 'secondary_used_percent']) {
                validateOptionalNumber(payload[key], field + '.payload.' + key);
            }
            for (const key of [
                'primary_window_minutes',
                'primary_resets_at',
                'secondary_window_minutes',
                'secondary_resets_at'
            ]) {
                validateOptionalInteger(payload[key], field + '.payload.' + key);
            }
            break;
        case 'Compaction':
            validateOptionalString(payload.summary, field + '.payload.summary');
            break;
        case 'Diagnostic':
            requireString(payload, 'code');
            validateOptionalString(payload.message, field + '.payload.message');
            break;
        case 'TurnCompleted':
            requireString(payload, 'status');
            validateEnum(payload.status, field + '.payload.status', TURN_STATUS_VALUES);
            validateOptionalString(payload.message, field + '.payload.message');
            validateOptionalInteger(payload.duration_ms, field + '.payload.duration_ms');
            break;
        case 'ParseGap':
            requireString(payload, 'reason');
            break;
        case 'UnknownEvent':
            validateOptionalString(payload.raw_type, field + '.payload.raw_type');
            requireString(payload, 'reason');
            break;
        default:
            invalid(field + '.event_type', field + '.event_type is unsupported');
    }
}

function validateDiagnostic(value, index, batch) {
    const field = 'payload.diagnostics[' + index + ']';
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'code');
    if (hasOwn(value, 'message') && value.message !== null && !isNonEmptyString(value.message)) {
        invalid(field + '.message', field + '.message must be a non-empty string or null');
    }
    requirePresent(value, 'source_ref');
    if (value.source_ref !== null) {
        validateSourceRef(value.source_ref, field + '.source_ref');
        validateSourceRefScope(
            value.source_ref,
            batch.source_id,
            batch.source_range,
            field + '.source_ref'
        );
    }
    requirePresent(value, 'availability');
    validateEnum(value.availability, field + '.availability', EVENT_AVAILABILITY_VALUES);
}

function validateToolDetail(value, index, batch) {
    const field = 'payload.tool_details[' + index + ']';
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of ['item_key', 'call_id', 'tool_kind']) requireString(value, key);
    for (const key of ['input', 'output']) {
        if (hasOwn(value, key) && value[key] !== null && typeof value[key] !== 'string') {
            invalid(field + '.' + key, field + '.' + key + ' must be a string or null');
        }
    }
    requireString(value, 'completeness');
    validateEnum(value.completeness, field + '.completeness', COMPLETENESS_VALUES);
    if (value.completeness !== batch.completeness) {
        invalid(field + '.completeness', field + '.completeness must match batch completeness');
    }
    requireString(value, 'source_epoch');
    if (value.source_epoch !== batch.source_epoch) {
        invalid(field + '.source_epoch', field + '.source_epoch must match batch source_epoch');
    }
}

function validateTaskOutcome(value, index, batch) {
    const field = 'payload.task_outcomes[' + index + ']';
    if (!isObject(value)) invalid(field, field + ' must be an object');
    requireString(value, 'item_key');
    requireString(value, 'status');
    requireString(value, 'source_epoch');
    requireString(value, 'completeness');
    validateEnum(value.completeness, field + '.completeness', COMPLETENESS_VALUES);
    if (value.completeness !== batch.completeness) {
        invalid(field + '.completeness', field + '.completeness must match batch completeness');
    }
    if (value.source_epoch !== batch.source_epoch) {
        invalid(field + '.source_epoch', field + '.source_epoch must match batch source_epoch');
    }
    if (hasOwn(value, 'message') && value.message !== null && !isNonEmptyString(value.message)) {
        invalid(field + '.message', field + '.message must be a non-empty string or null');
    }
}

function validateLastTurnReplacement(value, field, batch = undefined) {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of [
        'replacement_key',
        'conversation_id',
        'parent_rollout_id',
        'child_rollout_id',
        'replaced_turn_id',
        'replacement_turn_id',
        'replaced_turn_terminal_status',
        'cut',
        'parent_turn_start_source_ref',
        'parent_turn_terminal_source_ref',
        'child_turn_start_source_ref'
    ]) {
        requirePresent(value, key);
    }
    for (const key of [
        'replacement_key',
        'conversation_id',
        'parent_rollout_id',
        'child_rollout_id',
        'replaced_turn_id',
        'replacement_turn_id'
    ]) requireString(value, key);
    const expectedKey = [
        'replacement',
        value.conversation_id,
        value.parent_rollout_id,
        value.child_rollout_id,
        value.replaced_turn_id,
        value.replacement_turn_id
    ].join(':');
    if (value.replacement_key !== expectedKey) {
        invalid(
            field + '.replacement_key',
            field + '.replacement_key is not stable for the replacement identity'
        );
    }
    validateEnum(
        value.replaced_turn_terminal_status,
        field + '.replaced_turn_terminal_status',
        ['completed', 'interrupted']
    );
    if (value.parent_rollout_id === value.child_rollout_id
        || value.replaced_turn_id === value.replacement_turn_id) {
        invalid(field, field + ' must identify distinct parent/child and old/new turns');
    }
    if (batch && value.conversation_id !== batch.conversation_id) {
        invalid(field + '.conversation_id', field + '.conversation_id must match batch conversation_id');
    }
    if (batch && value.child_rollout_id !== batch.source_id) {
        invalid(field + '.child_rollout_id', field + '.child_rollout_id must match batch source_id');
    }
    validateHistoryBase(value.cut, field + '.cut');
    if (value.cut.parent_rollout_id !== value.parent_rollout_id) {
        invalid(field + '.cut.parent_rollout_id', field + '.cut.parent_rollout_id must match parent');
    }
    validateSourceRef(value.parent_turn_start_source_ref, field + '.parent_turn_start_source_ref');
    validateSourceRef(value.parent_turn_terminal_source_ref, field + '.parent_turn_terminal_source_ref');
    validateSourceRef(value.child_turn_start_source_ref, field + '.child_turn_start_source_ref');
    if (value.parent_turn_start_source_ref.source_identity !== value.parent_rollout_id
        || value.parent_turn_terminal_source_ref.source_identity !== value.parent_rollout_id
        || value.child_turn_start_source_ref.source_identity !== value.child_rollout_id) {
        invalid(field, field + ' source evidence identities must match parent and child');
    }
    if (value.parent_turn_start_source_ref.rollout_ordinal !== value.cut.end_ordinal_exclusive
        || value.parent_turn_start_source_ref.byte_start !== value.cut.end_byte_offset) {
        invalid(
            field + '.parent_turn_start_source_ref',
            field + '.parent_turn_start_source_ref must match history cut'
        );
    }
    const parentStart = [
        value.parent_turn_start_source_ref.rollout_ordinal
            ?? value.parent_turn_start_source_ref.physical_line_ordinal,
        value.parent_turn_start_source_ref.physical_line_ordinal,
        value.parent_turn_start_source_ref.byte_start
    ];
    const parentTerminal = [
        value.parent_turn_terminal_source_ref.rollout_ordinal
            ?? value.parent_turn_terminal_source_ref.physical_line_ordinal,
        value.parent_turn_terminal_source_ref.physical_line_ordinal,
        value.parent_turn_terminal_source_ref.byte_start
    ];
    if (parentTerminal.some((part, index) => part < parentStart[index])) {
        invalid(
            field + '.parent_turn_terminal_source_ref',
            field + '.parent_turn_terminal_source_ref must not precede start'
        );
    }
}

function validateMutation(mutation, index, batch) {
    const field = 'payload.mutations[' + index + ']';
    if (!isObject(mutation)) invalid(field, field + ' must be an object');
    requireString(mutation, 'mutation');
    const upsertKinds = ['upsert_item', 'upsert_detail', 'upsert_usage', 'upsert_outcome'];
    if (upsertKinds.includes(mutation.mutation)) {
        requireObject(mutation, 'item');
        for (const key of ['item_key', 'content_hash', 'source_epoch', 'completeness']) {
            requireString(mutation.item, key);
        }
        validateEnum(mutation.item.completeness, field + '.item.completeness', COMPLETENESS_VALUES);
        if (mutation.item.completeness !== batch.completeness) {
            invalid(
                field + '.item.completeness',
                field + '.item.completeness must match batch completeness'
            );
        }
        if (mutation.item.source_epoch !== batch.source_epoch) {
            invalid(
                field + '.item.source_epoch',
                field + '.item.source_epoch must match batch source_epoch'
            );
        }
        requireObject(mutation.item, 'source_ref');
        validateSourceRef(mutation.item.source_ref, field + '.item.source_ref');
        validateSourceRefScope(
            mutation.item.source_ref,
            batch.source_id,
            batch.source_range,
            field + '.item.source_ref'
        );
        return;
    }
    if (mutation.mutation === 'complete_range') {
        if (batch.completeness !== 'canonical') {
            invalid(field + '.mutation', 'complete_range requires canonical batch');
        }
        validateSourceRange(mutation.source_range, field + '.source_range', { required: true });
        if (!batch.source_range || !isDeepStrictEqual(mutation.source_range, batch.source_range)) {
            invalid(field + '.source_range', field + '.source_range must match batch source_range');
        }
        return;
    }
    if (mutation.mutation === 'mark_partial') {
        if (batch.completeness === 'canonical') {
            invalid(field + '.mutation', 'mark_partial is not allowed in canonical batch');
        }
        requirePresent(mutation, 'source_range');
        validateSourceRange(mutation.source_range, field + '.source_range');
        if (batch.source_range && mutation.source_range
            && (mutation.source_range.start < batch.source_range.start
                || mutation.source_range.end > batch.source_range.end)) {
            invalid(field + '.source_range', field + '.source_range exceeds batch source scope');
        }
        return;
    }
    if (mutation.mutation === 'replace_last_turn') {
        if (batch.completeness !== 'canonical') {
            invalid(field + '.mutation', 'replace_last_turn requires canonical batch');
        }
        if (projectionCoverageOf(batch.projection) !== 'complete') {
            invalid(field + '.mutation', 'replace_last_turn requires complete projection coverage');
        }
        requireObject(mutation, 'replacement');
        validateLastTurnReplacement(mutation.replacement, field + '.replacement', batch);
        return;
    }
    invalid(field + '.mutation', 'unsupported mutation ' + mutation.mutation);
}

function validateBatchLineage(payload) {
    const hasHistoryBase = payload.history_base !== undefined
        && payload.history_base !== null;
    const hasTransitions = Array.isArray(payload.lineage_transitions)
        && payload.lineage_transitions.length > 0;
    const hasCoverage = payload.lineage_coverage !== undefined
        && payload.lineage_coverage !== null;
    const hasCheckpoint = payload.lineage_checkpoint !== undefined
        && payload.lineage_checkpoint !== null;
    const hasReplacements = Array.isArray(payload.replacements)
        && payload.replacements.length > 0;
    const hasReplacementMutation = payload.mutations.some(
        (mutation) => mutation.mutation === 'replace_last_turn'
    );
    if (!hasHistoryBase
        && !hasTransitions
        && !hasCoverage
        && !hasCheckpoint
        && !hasReplacements
        && !hasReplacementMutation) {
        return;
    }
    if (!payload.history_base) {
        invalid('payload.history_base', 'lineage evidence requires history_base');
    }
    if (!hasTransitions) {
        invalid('payload.lineage_transitions', 'lineage evidence requires transitions');
    }
    if (!hasCoverage) {
        invalid('payload.lineage_coverage', 'lineage evidence requires lineage coverage');
    }
    if (hasReplacements && !hasReplacementMutation) {
        invalid('payload.replacements', 'replacement evidence requires matching mutation');
    }
    if (hasReplacementMutation && !hasReplacements) {
        invalid('payload.replacements', 'replace_last_turn requires matching evidence');
    }
    if (payload.completeness === 'canonical' && payload.lineage_coverage.complete !== true) {
        invalid(
            'payload.lineage_coverage.complete',
            'canonical transition batch requires complete lineage coverage'
        );
    }
    const requiresValidatedTransitions = payload.completeness === 'canonical'
        || hasReplacementMutation
        || hasCheckpoint;
    if (requiresValidatedTransitions
        && payload.lineage_transitions.some(
            (transition) => transition.validation_state !== 'validated'
        )) {
        invalid(
            'payload.lineage_transitions.validation_state',
            'canonical, replacement, and checkpoint lineage evidence requires validated transitions'
        );
    }
    if (!payload.lineage_transitions.some(
        (transition) => isDeepStrictEqual(transition.history_base, payload.history_base)
    )) {
        invalid(
            'payload.lineage_transitions',
            'lineage transitions must include the batch history_base transition'
        );
    }
    for (const transition of payload.lineage_transitions) {
        if (!payload.lineage_coverage.chain_rollout_ids.includes(transition.parent_rollout_id)
            || !payload.lineage_coverage.chain_rollout_ids.includes(transition.child_rollout_id)) {
            invalid(
                'payload.lineage_coverage.chain_rollout_ids',
                'lineage coverage must include transition endpoints'
            );
        }
    }
    const replacementByKey = new Map();
    for (const replacement of payload.replacements || []) {
        if (replacementByKey.has(replacement.replacement_key)) {
            invalid('payload.replacements', 'replacement keys must be unique');
        }
        replacementByKey.set(replacement.replacement_key, replacement);
    }
    const replacementMutationCounts = new Map();
    for (const mutation of payload.mutations) {
        if (mutation.mutation !== 'replace_last_turn') continue;
        const key = mutation.replacement.replacement_key;
        replacementMutationCounts.set(
            key,
            (replacementMutationCounts.get(key) || 0) + 1
        );
        if (!replacementByKey.has(key)) {
            invalid('payload.replacements', 'replacement mutation must match evidence');
        }
    }
    for (const replacement of payload.replacements || []) {
        const matchingTransition = payload.lineage_transitions.find(
            (transition) => transition.parent_rollout_id === replacement.parent_rollout_id
                && transition.child_rollout_id === replacement.child_rollout_id
        );
        if (!matchingTransition) {
            invalid(
                'payload.replacements',
                'replacement evidence requires a matching lineage transition'
            );
        }
        if (!isDeepStrictEqual(replacement.cut, matchingTransition.history_base)) {
            invalid(
                'payload.replacements',
                'replacement cut must match the corresponding lineage transition history_base'
            );
        }
        if (replacementMutationCounts.get(replacement.replacement_key) !== 1) {
            invalid(
                'payload.replacements',
                'each replacement evidence entry must match exactly one mutation'
            );
        }
    }
    for (const [key, count] of replacementMutationCounts) {
        if (count !== 1) {
            invalid(
                'payload.mutations',
                'each replace_last_turn mutation must match exactly one replacement entry'
            );
        }
        if (!replacementByKey.has(key)) {
            invalid('payload.replacements', 'replacement mutation must match evidence');
        }
    }
    if (payload.lineage_checkpoint) {
        validateLineageCheckpoint(payload.lineage_checkpoint, 'payload.lineage_checkpoint');
        if (payload.lineage_checkpoint.conversation_id !== payload.conversation_id) {
            invalid(
                'payload.lineage_checkpoint.conversation_id',
                'lineage checkpoint conversation_id must match payload'
            );
        }
        if (!isDeepStrictEqual(payload.lineage_checkpoint.coverage, payload.lineage_coverage)) {
            invalid(
                'payload.lineage_checkpoint.coverage',
                'lineage checkpoint coverage must match batch coverage'
            );
        }
    }
}

function validateBatchPayload(payload) {
    if (!isObject(payload)) invalid('payload', 'payload must be an object');
    for (const key of [
        'conversation_id',
        'source_id',
        'source_epoch',
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
        'mutations'
    ]) requirePresent(payload, key);
    for (const key of ['job_id', 'segment_id', 'batch_id']) {
        if (hasOwn(payload, key)) {
            invalid('payload.' + key, key + ' belongs to the batch wire envelope');
        }
    }
    requireString(payload, 'conversation_id');
    requireString(payload, 'source_id');
    requireString(payload, 'source_epoch');
    if (payload.source_epoch === 'unbound') {
        invalid('payload.source_epoch', 'source_epoch must be bound');
    }
    validateSourceRange(payload.source_range, 'payload.source_range');
    validateEnum(payload.completeness, 'payload.completeness', COMPLETENESS_VALUES);
    requireBoolean(payload, 'complete');
    const projectionCoverage = validateProjection(payload.projection, payload.completeness);
    requireArray(payload, 'history_items');
    requireArray(payload, 'diagnostics');
    requireArray(payload, 'tool_details');
    requirePresent(payload, 'usage');
    if (payload.usage !== null && !isObject(payload.usage)) {
        invalid('payload.usage', 'payload.usage must be an object or null');
    }
    requireArray(payload, 'task_outcomes');
    validateProgress(payload.progress);
    requireArray(payload, 'mutations');

    payload.history_items.forEach((item, index) => validateAnalysisEvent(item, index, payload));
    payload.diagnostics.forEach((diagnostic, index) => {
        validateDiagnostic(diagnostic, index, payload);
    });
    payload.tool_details.forEach((detail, index) => validateToolDetail(detail, index, payload));
    payload.task_outcomes.forEach((outcome, index) => validateTaskOutcome(outcome, index, payload));
    validateParserProvenance(payload.parser_provenance);

    if (payload.next_cursor !== null) {
        validateCursor(payload.next_cursor, 'payload.next_cursor');
        if (payload.next_cursor.conversation_id !== payload.conversation_id
            || payload.next_cursor.source_id !== payload.source_id
            || payload.next_cursor.source_epoch !== payload.source_epoch) {
            invalid('payload.next_cursor', 'cursor source scope must match batch');
        }
        if (!payload.source_range
            || !isDeepStrictEqual(payload.source_range, payload.next_cursor.complete_range)) {
            invalid('payload.next_cursor', 'cursor complete range must match batch source_range');
        }
    }

    if (hasOwn(payload, 'history_base') && payload.history_base !== null) {
        validateHistoryBase(payload.history_base, 'payload.history_base');
    }
    if (hasOwn(payload, 'replacements')) {
        requireArray(payload, 'replacements');
        payload.replacements.forEach((replacement, index) => {
            validateLastTurnReplacement(
                replacement,
                'payload.replacements[' + index + ']',
                payload
            );
        });
    }
    if (hasOwn(payload, 'reducer_state') && payload.reducer_state !== null) {
        requireObject(payload, 'reducer_state');
        for (const key of ['schema_version', 'reducer_id', 'reducer_version', 'payload']) {
            requirePresent(payload.reducer_state, key);
        }
        if (payload.reducer_state.schema_version !== 1) {
            invalid(
                'payload.reducer_state.schema_version',
                'reducer_state schema_version must be 1'
            );
        }
        requireString(payload.reducer_state, 'reducer_id');
        requireString(payload.reducer_state, 'reducer_version');
        requireObject(payload.reducer_state, 'payload');
    }
    if (hasOwn(payload, 'lineage_transitions')) {
        requireArray(payload, 'lineage_transitions');
        payload.lineage_transitions.forEach((transition, index) => {
            validateLineageTransition(
                transition,
                'payload.lineage_transitions[' + index + ']'
            );
        });
    }

    if (payload.reducer_state?.reducer_version === 'target-v2'
        || payload.parser_provenance.compatibility_profile === 'history-semantics-v2') {
        assertHistoryProfile({ message_type: 'batch', payload }, 'target-v2');
    }
    if (hasOwn(payload, 'lineage_coverage') && payload.lineage_coverage !== null) {
        validateLineageCoverage(payload.lineage_coverage, 'payload.lineage_coverage');
    }
    if (hasOwn(payload, 'lineage_checkpoint') && payload.lineage_checkpoint !== null) {
        validateLineageCheckpoint(payload.lineage_checkpoint, 'payload.lineage_checkpoint');
    }

    payload.mutations.forEach((mutation, index) => validateMutation(mutation, index, payload));
    validateBatchLineage(payload);

    const canonical = payload.completeness === 'canonical';
    if (payload.complete !== canonical) {
        invalid('payload.complete', 'complete must equal completeness == canonical');
    }
    const hasCompleteRange = payload.mutations.some(
        (mutation) => mutation.mutation === 'complete_range'
    );
    const hasPartialMarker = payload.mutations.some(
        (mutation) => mutation.mutation === 'mark_partial'
    );
    if (canonical) {
        if (!payload.source_range
            || payload.next_cursor === null
            || !isObject(payload.reducer_state)
            || projectionCoverage !== 'complete'
            || !hasCompleteRange) {
            invalid(
                'payload.completeness',
                'canonical batch requires source range, cursor, reducer_state, complete_range, and complete projection'
            );
        }
    } else if (!hasPartialMarker) {
        invalid(
            'payload.mutations',
            'non-canonical batch must include mark_partial mutation'
        );
    }
}

function validateRecovery(value, field = 'recovery') {
    if (value === null) return;
    if (!isObject(value)) invalid(field, field + ' must be an object or null');
    requireString(value, 'segment_id');
    requireString(value, 'batch_id');
}

function validateResourceLimits(value) {
    if (!isObject(value)) invalid('resource_limits', 'resource_limits must be an object');
    const fields = [
        'max_decoded_bytes',
        'max_line_bytes',
        'max_segment_bytes',
        'tail_bytes',
        'timeout_ms'
    ];
    for (const field of fields) {
        if (hasOwn(value, field)) validateSafeInteger(value[field], 'resource_limits.' + field);
    }
    if (value.max_line_bytes !== undefined
        && value.max_segment_bytes !== undefined
        && value.max_line_bytes > value.max_segment_bytes) {
        invalid(
            'resource_limits.max_line_bytes',
            'resource_limits.max_line_bytes must not exceed max_segment_bytes'
        );
    }
}

function canonicalizeCapabilities(capabilities) {
    if (!Array.isArray(capabilities)) {
        invalid('capabilities', 'capabilities must be an array');
    }
    const values = new Set();
    capabilities.forEach((capability, index) => {
        if (!isNonEmptyString(capability) || capability.trim() !== capability) {
            invalid(
                'capabilities[' + index + ']',
                'capability names must be non-empty strings without surrounding whitespace'
            );
        }
        values.add(capability === 'analyze' ? 'analyze_v1' : capability);
    });
    return [...values].sort();
}

function hasRequiredCapabilities(capabilities) {
    try {
        const canonical = new Set(canonicalizeCapabilities(capabilities));
        return REQUIRED_CAPABILITIES.every((capability) => canonical.has(capability));
    } catch (error) {
        if (error instanceof AnalyzerProtocolError) return false;
        throw error;
    }
}

function validateHelloMessage(message) {
    requireString(message, 'role');
    validateEnum(message.role, 'role', ['node', 'analyzer']);
    requireArray(message, 'capabilities');
    canonicalizeCapabilities(message.capabilities);
    if (message.role === 'node' && message.capabilities.includes('analyze')) {
        invalid('capabilities', 'Node hello must advertise canonical analyze_v1');
    }
    if (message.role === 'analyzer') {
        requireString(message, 'analyzer_version');
        requireString(message, 'parser_backend');
        requireString(message, 'compatibility_layer_version');
    }
}

function rejectLegacyAnalyzeFields(message) {
    for (const field of LEGACY_ANALYZE_FIELDS) {
        if (hasOwn(message, field)) {
            invalid(field, field + ' is not part of the target analyze request');
        }
    }
}

function validateAnalyzeMessage(message) {
    rejectLegacyAnalyzeFields(message);
    requireString(message, 'job_id');
    requireString(message, 'conversation_id');
    requireString(message, 'mode');
    validateEnum(message.mode, 'mode', ANALYZE_MODES);

    if (hasOwn(message, 'cursor') && message.cursor !== null) {
        validateCursor(message.cursor, 'cursor');
    }
    if (hasOwn(message, 'persisted_anchor') && message.persisted_anchor !== null) {
        validateCheckpoint(message.persisted_anchor, 'persisted_anchor');
    }
    if (hasOwn(message, 'recovery')) validateRecovery(message.recovery);
    if (hasOwn(message, 'known_complete_range') && message.known_complete_range !== null) {
        validateSourceRange(message.known_complete_range, 'known_complete_range');
    }
    if (hasOwn(message, 'resource_limits')) validateResourceLimits(message.resource_limits);

    if (message.persisted_anchor
        && message.persisted_anchor.conversation_id !== message.conversation_id) {
        invalid(
            'persisted_anchor.conversation_id',
            'persisted_anchor conversation_id must match analyze conversation_id'
        );
    }
    if (message.persisted_anchor
        && !isDeepStrictEqual(message.persisted_anchor.cursor, message.cursor ?? null)) {
        invalid(
            'cursor',
            'cursor must match persisted_anchor.cursor when persisted_anchor is supplied'
        );
    }
}

function validateAckMessage(message) {
    for (const field of ['job_id', 'segment_id', 'batch_id']) requireString(message, field);
    requireBoolean(message, 'accepted');
    requireBoolean(message, 'persisted');
    const error = hasOwn(message, 'error') ? message.error : null;
    if (error !== null && !isNonEmptyString(error)) {
        invalid('error', 'error must be a non-empty string or null');
    }
    if (message.accepted === true && message.persisted === true) {
        if (error !== null) invalid('error', 'positive ACK must not carry an error');
        return;
    }
    if (message.accepted === false && message.persisted === false) {
        if (!ACK_REJECTION_CODES.includes(error)) {
            invalid('error', 'negative ACK must use a stable rejection code');
        }
        return;
    }
    invalid('accepted/persisted', 'ACK must be both true or both false');
}

function validateCompleteMessage(message, { forOutput = false } = {}) {
    requireString(message, 'job_id');
    requireString(message, 'status');
    validateEnum(message.status, 'status', ['ok', 'completed', 'partial']);
    requireString(message, 'completeness');
    validateEnum(message.completeness, 'completeness', COMPLETENESS_VALUES);
    const validCombination = (
        (message.status === 'completed' && message.completeness === 'canonical')
        || (message.status === 'partial'
            && ['partial', 'provisional'].includes(message.completeness))
        || (message.status === 'ok' && message.completeness === 'canonical')
    );
    if (!validCombination) {
        invalid('status/completeness', 'invalid 4.5 complete status combination');
    }
    if (forOutput && message.status === 'ok') {
        invalid('status', 'legacy status ok is accepted only for inbound compatibility');
    }
    requirePresent(message, 'next_cursor');
    if (message.next_cursor !== null) validateCursor(message.next_cursor, 'next_cursor');
    requireObject(message, 'checkpoint');
    validateCheckpoint(message.checkpoint);
    if (message.checkpoint.job_id !== message.job_id) {
        invalid('checkpoint.job_id', 'checkpoint.job_id must match complete job_id');
    }
    if (message.checkpoint.request_id !== message.request_id) {
        invalid('checkpoint.request_id', 'checkpoint.request_id must match complete request_id');
    }
    if (message.checkpoint.completeness !== message.completeness) {
        invalid('checkpoint.completeness', 'checkpoint completeness must match complete');
    }
    if (!isDeepStrictEqual(message.checkpoint.cursor, message.next_cursor)) {
        invalid('checkpoint.cursor', 'checkpoint.cursor must match next_cursor');
    }
}

function validateErrorMessage(message) {
    requireString(message, 'code');
    requireString(message, 'message');
    requireBoolean(message, 'retryable');
    requireBoolean(message, 'fatal');
    if (hasOwn(message, 'details') && message.details !== null && !isObject(message.details)) {
        invalid('details', 'details must be an object or null');
    }
    if (message.code === 'batch_rejected') {
        requireObject(message, 'details');
        requireString(message.details, 'rejection_code');
        if (!ACK_REJECTION_CODES.includes(message.details.rejection_code)) {
            invalid('details.rejection_code', 'unknown ACK rejection code');
        }
    }
}

function validateCheckpoint(value, field = 'checkpoint') {
    if (!isObject(value)) invalid(field, field + ' must be an object');
    for (const key of [
        'schema_version',
        'job_id',
        'request_id',
        'conversation_id',
        'source',
        'reader',
        'wire_profile',
        'cursor_kind',
        'cursor',
        'segment',
        'reducer_state',
        'projection_watermark',
        'completeness',
        'lineage_checkpoint'
    ]) requirePresent(value, key);
    if (value.schema_version !== 1) invalid(field + '.schema_version', 'schema_version must be 1');
    requireString(value, 'job_id');
    requireString(value, 'request_id');
    requireString(value, 'conversation_id');

    requireObject(value, 'source');
    for (const key of ['source_id', 'source_epoch', 'source_range', 'snapshot_boundary']) {
        requirePresent(value.source, key);
    }
    requireString(value.source, 'source_id');
    requireString(value.source, 'source_epoch');
    if (value.source.source_epoch === 'unbound') {
        invalid(field + '.source.source_epoch', 'source_epoch must be bound');
    }
    validateSourceRange(value.source.source_range, field + '.source.source_range');
    validateSnapshotBoundary(
        value.source.snapshot_boundary,
        field + '.source.snapshot_boundary'
    );
    if (value.source.source_range
        && value.source.source_range.end > value.source.snapshot_boundary.byte_length) {
        invalid(field + '.source.source_range', 'source range must not exceed snapshot boundary');
    }

    requireObject(value, 'reader');
    for (const key of ['backend', 'version', 'source_kind', 'compression']) {
        requirePresent(value.reader, key);
    }
    requireString(value.reader, 'backend');
    requireString(value.reader, 'version');
    validateEnum(value.reader.source_kind, field + '.reader.source_kind', SOURCE_KINDS);
    validateEnum(value.reader.compression, field + '.reader.compression', SOURCE_COMPRESSIONS);
    requireObject(value, 'wire_profile');
    for (const key of ['parser_backend', 'wire_source_revision', 'compatibility_profile']) {
        requirePresent(value.wire_profile, key);
    }
    requireString(value.wire_profile, 'parser_backend');
    requireString(value.wire_profile, 'wire_source_revision');
    validateCompatibilityProfile(
        value.wire_profile.compatibility_profile,
        field + '.wire_profile.compatibility_profile'
    );

    if (value.cursor_kind !== null) {
        validateEnum(value.cursor_kind, field + '.cursor_kind', CURSOR_KINDS);
    }
    if (value.cursor !== null) validateCursor(value.cursor, field + '.cursor');
    if ((value.cursor_kind === null) !== (value.cursor === null)) {
        invalid(field + '.cursor', 'cursor_kind and cursor must be both null or both present');
    }
    if (value.cursor) {
        if (value.cursor.cursor_kind !== value.cursor_kind
            || value.cursor.conversation_id !== value.conversation_id
            || value.cursor.source_id !== value.source.source_id
            || value.cursor.source_epoch !== value.source.source_epoch
            || !isDeepStrictEqual(value.cursor.snapshot_boundary, value.source.snapshot_boundary)
            || !value.source.source_range
            || !isDeepStrictEqual(value.cursor.complete_range, value.source.source_range)
            || value.cursor.reader_backend !== value.reader.backend
            || value.cursor.reader_version !== value.reader.version
            || value.cursor.source_kind !== value.reader.source_kind
            || value.cursor.compression !== value.reader.compression) {
            invalid(field + '.cursor', 'cursor scope does not match checkpoint');
        }
    }

    requireObject(value, 'segment');
    for (const key of [
        'source_range',
        'physical_line_start',
        'physical_line_end',
        'rollout_ordinal'
    ]) requirePresent(value.segment, key);
    validateSourceRange(value.segment.source_range, field + '.segment.source_range');
    if (!isDeepStrictEqual(value.segment.source_range, value.source.source_range)) {
        invalid(field + '.segment.source_range', 'segment source range must match source range');
    }
    const lineStart = value.segment.physical_line_start;
    const lineEnd = value.segment.physical_line_end;
    if (lineStart === null || lineEnd === null) {
        if (lineStart !== null || lineEnd !== null) {
            invalid(
                field + '.segment.physical_line_start',
                'physical line start/end must be both null or both present'
            );
        }
    } else {
        validateSafeInteger(lineStart, field + '.segment.physical_line_start', 1);
        validateSafeInteger(lineEnd, field + '.segment.physical_line_end', 1);
        if (lineStart > lineEnd) {
            invalid(field + '.segment.physical_line_end', 'physical line range must be ordered');
        }
    }
    if (value.segment.rollout_ordinal !== null) {
        validateSafeInteger(value.segment.rollout_ordinal, field + '.segment.rollout_ordinal');
    }

    requireObject(value, 'reducer_state');
    for (const key of ['schema_version', 'reducer_id', 'reducer_version', 'payload']) {
        requirePresent(value.reducer_state, key);
    }
    if (value.reducer_state.schema_version !== 1) {
        invalid(field + '.reducer_state.schema_version', 'reducer_state schema_version must be 1');
    }
    requireString(value.reducer_state, 'reducer_id');
    requireString(value.reducer_state, 'reducer_version');
    requireObject(value.reducer_state, 'payload');

    requireObject(value, 'projection_watermark');
    for (const key of [
        'schema_version',
        'segment_id',
        'batch_id',
        'source_id',
        'source_epoch',
        'complete_source_end',
        'logical_item_count'
    ]) requirePresent(value.projection_watermark, key);
    if (value.projection_watermark.schema_version !== 1) {
        invalid(
            field + '.projection_watermark.schema_version',
            'projection watermark schema_version must be 1'
        );
    }
    requireString(value.projection_watermark, 'segment_id');
    requireString(value.projection_watermark, 'batch_id');
    if (value.projection_watermark.source_id !== null) {
        requireString(value.projection_watermark, 'source_id');
    }
    requireString(value.projection_watermark, 'source_epoch');
    if (value.projection_watermark.source_epoch !== value.source.source_epoch) {
        invalid(
            field + '.projection_watermark.source_epoch',
            'projection watermark source_epoch must match source'
        );
    }
    if (value.projection_watermark.source_id !== null
        && value.projection_watermark.source_id !== value.source.source_id) {
        invalid(
            field + '.projection_watermark.source_id',
            'projection watermark source_id must match source'
        );
    }
    if (value.projection_watermark.complete_source_end !== null) {
        validateSafeInteger(
            value.projection_watermark.complete_source_end,
            field + '.projection_watermark.complete_source_end'
        );
        if (!value.source.source_range
            || value.projection_watermark.complete_source_end !== value.source.source_range.end) {
            invalid(
                field + '.projection_watermark.complete_source_end',
                'complete_source_end must match source range end'
            );
        }
    }
    validateSafeInteger(
        value.projection_watermark.logical_item_count,
        field + '.projection_watermark.logical_item_count'
    );

    validateEnum(value.completeness, field + '.completeness', COMPLETENESS_VALUES);
    if (value.completeness === 'canonical') {
        if (!value.source.source_range
            || value.cursor === null
            || value.cursor_kind === null
            || value.projection_watermark.complete_source_end !== value.source.source_range.end) {
            invalid(
                field + '.completeness',
                'canonical checkpoint requires source range, cursor, and complete source end'
            );
        }
    }
    if (value.lineage_checkpoint !== null) {
        validateLineageCheckpoint(value.lineage_checkpoint, field + '.lineage_checkpoint');
        if (value.lineage_checkpoint.conversation_id !== value.conversation_id) {
            invalid(
                field + '.lineage_checkpoint.conversation_id',
                'lineage checkpoint conversation_id must match checkpoint'
            );
        }
    }
}

function validateMessage(message, { allowUnknownMessageType = false, forOutput = false } = {}) {
    if (!isObject(message)) {
        throw new AnalyzerProtocolError('invalid_message', 'protocol message must be an object');
    }
    if (message.protocol_version !== PROTOCOL_VERSION) {
        throw new AnalyzerProtocolError(
            'unsupported_protocol_version',
            'expected protocol_version ' + PROTOCOL_VERSION,
            { expected: PROTOCOL_VERSION, actual: message.protocol_version }
        );
    }
    requireString(message, 'message_type');
    if (!allowUnknownMessageType && !MESSAGE_TYPE_SET.has(message.message_type)) {
        throw new AnalyzerProtocolError(
            'unsupported_message_type',
            'unsupported message_type ' + message.message_type,
            { messageType: message.message_type }
        );
    }
    requireString(message, 'request_id');

    switch (message.message_type) {
        case 'hello':
            validateHelloMessage(message);
            break;
        case 'analyze':
            validateAnalyzeMessage(message);
            break;
        case 'cancel':
            requireString(message, 'reason');
            break;
        case 'batch':
            requireString(message, 'job_id');
            requireString(message, 'segment_id');
            requireString(message, 'batch_id');
            requireObject(message, 'payload');
            validateBatchPayload(message.payload);
            break;
        case 'ack':
            validateAckMessage(message);
            break;
        case 'complete':
            validateCompleteMessage(message, { forOutput });
            break;
        case 'error':
            validateErrorMessage(message);
            break;
        default:
            break;
    }
    return message;
}

function encodeMessage(message) {
    validateMessage(message, { forOutput: true });
    try {
        return JSON.stringify(message) + '\n';
    } catch (error) {
        throw new AnalyzerProtocolError('invalid_message', 'protocol message cannot be serialized', {
            cause: error.message
        });
    }
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

function rejectLegacyAnalyzeOptions(options) {
    for (const field of LEGACY_ANALYZE_FIELDS) {
        if (hasOwn(options, field)) {
            invalid(field, field + ' is not part of the target analyze request');
        }
    }
}

function createAnalyzeRequest(options = {}) {
    if (!isObject(options)) invalid('options', 'analyze request options must be an object');
    rejectLegacyAnalyzeOptions(options);
    const requestId = options.requestId ?? options.request_id;
    const jobId = options.jobId ?? options.job_id;
    const conversationId = options.conversationId ?? options.conversation_id;
    const persistedAnchor = options.persistedAnchor ?? options.persisted_anchor;
    const knownCompleteRange = options.knownCompleteRange ?? options.known_complete_range;
    const resourceLimits = options.resourceLimits ?? options.resource_limits;
    const message = {
        ...header('analyze', requestId),
        job_id: jobId,
        conversation_id: conversationId,
        mode: options.mode
    };
    const optionalFields = [
        ['cursor', options.cursor],
        ['persisted_anchor', persistedAnchor],
        ['recovery', options.recovery],
        ['known_complete_range', knownCompleteRange],
        ['resource_limits', resourceLimits]
    ];
    for (const [field, value] of optionalFields) {
        if (value !== undefined) message[field] = value;
    }
    for (const [field, value] of Object.entries(options)) {
        if (!ANALYZE_OPTION_KEYS.has(field) && value !== undefined) {
            message[field] = value;
        }
    }
    return validateMessage(message);
}

function createHello(requestId = 'node-hello-' + Date.now(), { historyProfile = 'target-v2' } = {}) {
    return validateMessage({
        ...header('hello', requestId),
        role: 'node',
        capabilities: [
            'analyze_v1',
            'cancel',
            'checkpoint',
            'ack',
            'last_turn_replacement_v1',
            ...(historyProfile === 'target-v1' ? [] : [HISTORY_SEMANTICS_CAPABILITY])
        ]
    });
}

function createAck(options = {}) {
    const requestId = options.requestId ?? options.request_id;
    const jobId = options.jobId ?? options.job_id;
    const segmentId = options.segmentId ?? options.segment_id;
    const batchId = options.batchId ?? options.batch_id;
    const message = {
        ...header('ack', requestId),
        job_id: jobId,
        segment_id: segmentId,
        batch_id: batchId,
        accepted: options.accepted === undefined ? true : options.accepted,
        persisted: options.persisted === undefined ? true : options.persisted
    };
    if (options.error !== undefined && options.error !== null) message.error = options.error;
    return validateMessage(message);
}

// Node checks only the public envelope; reducer payload remains opaque Rust state.
function assertHistoryProfile(message, historyProfile) {
    const envelope = message.message_type === 'batch' ? message.payload : message.checkpoint;
    const wire = envelope?.parser_provenance || envelope?.wire_profile;
    const version = envelope?.reducer_state?.reducer_version;
    const v2 = wire?.compatibility_profile === 'history-semantics-v2' || version === 'target-v2';
    if ((historyProfile === 'target-v2' && (version !== 'target-v2'
        || wire?.compatibility_profile !== 'history-semantics-v2'
        || envelope.reducer_state.reducer_id !== 'termlink.analysis_reducer'))
        || (historyProfile === 'target-v1' && v2)) {
        throw new AnalyzerProtocolError('checkpoint_incompatible', 'history profile does not match the negotiated request');
    }
}

function createCancel(requestId, reason = 'cancelled_by_caller') {
    return validateMessage({
        ...header('cancel', requestId),
        reason
    });
}

function createError(options = {}) {
    const requestId = options.requestId ?? options.request_id;
    const message = {
        ...header('error', requestId),
        code: options.code,
        message: options.message,
        retryable: options.retryable === undefined ? false : options.retryable,
        fatal: options.fatal === undefined ? false : options.fatal
    };
    if (options.details !== undefined) message.details = options.details;
    return validateMessage(message);
}

function isBatchMessage(message) {
    return Boolean(message && message.message_type === 'batch');
}

function isCompleteMessage(message) {
    return Boolean(message && message.message_type === 'complete');
}

function isCanonicalBatch(message) {
    return Boolean(
        isBatchMessage(message)
        && message.payload
        && message.payload.completeness === 'canonical'
    );
}

module.exports = {
    HISTORY_SEMANTICS_CAPABILITY,
    assertHistoryProfile,
    PROTOCOL_VERSION,
    MESSAGE_TYPES,
    ANALYZE_MODES,
    CURSOR_KINDS,
    SOURCE_KINDS,
    SOURCE_COMPRESSIONS,
    COMPLETENESS_VALUES,
    REQUIRED_CAPABILITIES,
    OPTIONAL_CAPABILITIES,
    ACK_REJECTION_CODES,
    AnalyzerProtocolError,
    validateMessage,
    validateBatchPayload,
    validateCursor,
    validateCheckpoint,
    encodeMessage,
    parseLine,
    header,
    createHello,
    createAnalyzeRequest,
    createAck,
    createCancel,
    createError,
    canonicalizeCapabilities,
    hasRequiredCapabilities,
    isBatchMessage,
    isCompleteMessage,
    isCanonicalBatch,
    projectionCoverageOf,
    isNonEmptyString
};
