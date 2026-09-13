'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
    PROTOCOL_VERSION,
    AnalyzerProtocolError,
    parseLine,
    encodeMessage,
    createAnalyzeRequest,
    createHello,
    createAck,
    createCancel,
    createError,
    canonicalizeCapabilities,
    hasRequiredCapabilities,
    isCanonicalBatch,
    validateMessage
} = require('../src/services/codexRolloutCollector/analyzerProtocol');
const {
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore
} = require('../src/services/codexRolloutCollector/analysisBatchImporter');
const {
    FileCheckpointStore,
    MemoryCheckpointStore
} = require('../src/services/codexRolloutCollector/analysisCheckpointStore');
const {
    FileAnalysisRunStore,
    MemoryAnalysisRunStore
} = require('../src/services/codexRolloutCollector/analysisRunStore');
const {
    CodexRolloutCollector
} = require('../src/services/codexRolloutCollector');
const {
    AnalyzerProcessManager,
    AnalyzerStartupError,
    resolveSessionsRoot,
    buildStartupArgs
} = require('../src/services/codexRolloutCollector/analyzerProcessManager');
const { AnalyzerRequestTracker } = require('../src/services/codexRolloutCollector/analyzerRequestTracker');
const { resolveRustTargetBinary } = require('./fixtures/codex-rollout-collector/rust-target');

class ManualTimers {
    constructor() {
        this.nextId = 1;
        this.timers = new Map();
        this.history = [];
        this.cleared = [];
    }

    setTimeout(callback, delay) {
        const id = this.nextId++;
        this.timers.set(id, { callback, delay });
        this.history.push({ id, delay });
        return id;
    }

    clearTimeout(id) {
        this.cleared.push(id);
        this.timers.delete(id);
    }

    fire(id) {
        const timer = this.timers.get(id);
        assert.ok(timer, `timer ${id} should be active`);
        this.timers.delete(id);
        timer.callback();
    }

    get activeCount() {
        return this.timers.size;
    }
}

const waitMs = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class DelayedBeginRunStore {
    constructor(delegate, { beginError = null, failError = null } = {}) {
        this.delegate = delegate;
        this.beginError = beginError;
        this.failError = failError;
        this.failCalls = 0;
        this.beginStarted = new Promise((resolve) => {
            this.resolveBeginStarted = resolve;
        });
        this.beginGate = new Promise((resolve) => {
            this.releaseBegin = resolve;
        });
    }

    async init() {
        return this.delegate.init?.();
    }

    async begin(run) {
        this.resolveBeginStarted();
        await this.beginGate;
        if (this.beginError) throw this.beginError;
        return this.delegate.begin(run);
    }

    get(runId) {
        return this.delegate.get(runId);
    }

    update(runId, patch) {
        return this.delegate.update(runId, patch);
    }

    complete(runId, result, identity) {
        return this.delegate.complete(runId, result, identity);
    }

    fail(runId, error, identity) {
        this.failCalls += 1;
        if (this.failError) throw this.failError;
        return this.delegate.fail(runId, error, identity);
    }
}

const RUST_TARGET_CONVERSATION_ID = '019b2b40-beb6-7b23-bed0-37d570e76816';
const REPO_ROOT = path.resolve(__dirname, '..');
const RUST_TARGET_FIXTURE = path.join(
    REPO_ROOT,
    'native',
    'codex-rollout-collector',
    'tests',
    'fixtures',
    'target-session',
    '2026',
    '08',
    '26',
    `rollout-2026-08-26T00-00-00-${RUST_TARGET_CONVERSATION_ID}.jsonl`
);

async function stageRustTargetSession(codexHome) {
    assert.ok(fs.existsSync(RUST_TARGET_FIXTURE), 'Rust target session fixture must exist');
    const destination = path.join(
        codexHome,
        'sessions',
        '2026',
        '08',
        '26',
        path.basename(RUST_TARGET_FIXTURE)
    );
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.copyFile(RUST_TARGET_FIXTURE, destination);
    return path.dirname(path.dirname(path.dirname(path.dirname(destination))));
}

function createSyntheticAnalyzerChild({
    failAck = false,
    failKill = false,
    emitErrorOnKill = false,
    exitOnKill = false
} = {}) {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.exitCode = null;
    child.signalCode = null;
    child.killSignals = [];
    child.analyzeRequestId = null;
    child.batchReleased = false;
    child.releaseAnalyze = () => {
        if (!child.analyzeRequestId || child.batchReleased) return false;
        child.batchReleased = true;
        child.stdout.emit('data', `${JSON.stringify(targetBatch({
            requestId: child.analyzeRequestId,
            jobId: 'synthetic-job',
            conversationId: 'synthetic-conversation'
        }))}\n`);
        return true;
    };
    child.stdin = new EventEmitter();
    child.stdin.destroyed = false;
    child.stdin.writable = true;
    child.stdin.write = (line) => {
            const message = JSON.parse(String(line));
            if (message.message_type === 'hello') {
                setImmediate(() => child.stdout.emit('data', `${JSON.stringify({
                    protocol_version: PROTOCOL_VERSION,
                    message_type: 'hello',
                    request_id: message.request_id,
                    role: 'analyzer',
                    analyzer_version: 'synthetic',
                    parser_backend: 'synthetic',
                    compatibility_layer_version: 'synthetic',
                    capabilities: ['analyze_v1', 'cancel', 'checkpoint', 'ack']
                })}\n`));
            } else if (message.message_type === 'analyze') {
                child.analyzeRequestId = message.request_id;
            } else if (message.message_type === 'ack' && failAck) {
                const error = new Error('synthetic ACK pipe failure');
                error.code = 'EPIPE';
                throw error;
            }
            return true;
    };
    child.kill = (signal) => {
        child.killSignals.push(signal ?? null);
        if (emitErrorOnKill) {
            setImmediate(() => {
                const error = new Error('synthetic kill failure');
                error.code = 'EPERM';
                child.emit('error', error);
            });
        }
        if (exitOnKill) {
            setImmediate(() => {
                if (child.exitCode !== null || child.signalCode !== null) return;
                child.signalCode = signal || 'SIGTERM';
                child.emit('exit', null, child.signalCode);
            });
        }
        return !failKill;
    };
    return child;
}

function replacement({
    conversationId = 'conversation-1',
    parentRolloutId = 'parent-rollout',
    childRolloutId = 'child-rollout',
    replacedTurnId = 'old-turn',
    replacementTurnId = 'new-turn',
    terminalStatus = 'interrupted',
    cutOrdinal = 14,
    cutByte = 179138
} = {}) {
    return {
        replacement_key: [
            'replacement',
            conversationId,
            parentRolloutId,
            childRolloutId,
            replacedTurnId,
            replacementTurnId
        ].join(':'),
        conversation_id: conversationId,
        parent_rollout_id: parentRolloutId,
        child_rollout_id: childRolloutId,
        replaced_turn_id: replacedTurnId,
        replacement_turn_id: replacementTurnId,
        replaced_turn_terminal_status: terminalStatus,
        cut: {
            parent_rollout_id: parentRolloutId,
            end_ordinal_exclusive: cutOrdinal,
            end_byte_offset: cutByte
        },
        parent_turn_start_source_ref: {
            source_identity: parentRolloutId,
            byte_start: cutByte,
            byte_end: cutByte + 10,
            physical_line_ordinal: 14,
            rollout_ordinal: cutOrdinal
        },
        parent_turn_terminal_source_ref: {
            source_identity: parentRolloutId,
            byte_start: cutByte + 100,
            byte_end: cutByte + 110,
            physical_line_ordinal: 20,
            rollout_ordinal: cutOrdinal + 6
        },
        child_turn_start_source_ref: {
            source_identity: childRolloutId,
            byte_start: 200,
            byte_end: 210,
            physical_line_ordinal: 2,
            rollout_ordinal: cutOrdinal + 2
        }
    };
}

function shiftReplacementCut(fact, delta = 1) {
    fact.cut.end_byte_offset += delta;
    fact.parent_turn_start_source_ref.byte_start += delta;
}

function targetCursor({
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1',
    cursorKind = 'tail_preview',
    end = 10
} = {}) {
    return {
        schema_version: 1,
        reader_backend: 'test-reader',
        reader_version: '1',
        cursor_kind: cursorKind,
        conversation_id: conversationId,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        source_kind: 'rollout',
        compression: 'plain_jsonl',
        snapshot_boundary: { unit: 'physical_bytes', byte_length: end },
        complete_range: { start: 0, end },
        last_complete_line: {
            physical_line_ordinal: 1,
            byte_start: 0,
            byte_end: end
        },
        last_rollout_ordinal: null,
        capabilities: {
            forward_stream: true,
            tail_preview: true,
            backward_segments: true,
            append: true,
            random_seek: false
        }
    };
}

function targetHistoryEvent({
    eventType = 'UserMessage',
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    itemKey = 'item-1',
    eventId = 'event-1',
    text = 'hello'
} = {}) {
    return {
        event_type: eventType,
        payload: {
            metadata: {
                event_id: eventId,
                item_key: itemKey,
                correlation_id: null,
                related_item_key: null,
                conversation_id: conversationId,
                turn_id: null,
                timestamp: null,
                sequence: 1,
                availability: 'present',
                identity_origin: 'source_position',
                source_ref: {
                    source_identity: sourceId,
                    byte_start: 0,
                    byte_end: 10,
                    physical_line_ordinal: 1,
                    rollout_ordinal: null,
                    timestamp: null,
                    item_type: 'event_msg'
                }
            },
            text
        }
    };
}

function targetCheckpoint({
    jobId = 'job-1',
    requestId = 'request-1',
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1',
    completeness = 'canonical',
    cursor
} = {}) {
    const resolvedCursor = cursor === undefined
        ? (completeness === 'canonical' ? targetCursor({
            conversationId,
            sourceId,
            sourceEpoch
        }) : null)
        : cursor;
    const sourceRange = resolvedCursor ? resolvedCursor.complete_range : { start: 0, end: 10 };
    return {
        schema_version: 1,
        job_id: jobId,
        request_id: requestId,
        conversation_id: conversationId,
        source: {
            source_id: sourceId,
            source_epoch: sourceEpoch,
            source_range: sourceRange,
            snapshot_boundary: {
                unit: 'physical_bytes',
                byte_length: sourceRange.end
            }
        },
        reader: {
            backend: 'test-reader',
            version: '1',
            source_kind: 'rollout',
            compression: 'plain_jsonl'
        },
        wire_profile: {
            parser_backend: 'test-parser',
            wire_source_revision: 'test-wire',
            compatibility_profile: 'current'
        },
        cursor_kind: resolvedCursor ? resolvedCursor.cursor_kind : null,
        cursor: resolvedCursor,
        segment: {
            source_range: sourceRange,
            physical_line_start: 1,
            physical_line_end: 1,
            rollout_ordinal: null
        },
        reducer_state: {
            schema_version: 1,
            reducer_id: 'termlink.analysis_reducer',
            reducer_version: '1',
            payload: {}
        },
        projection_watermark: {
            schema_version: 1,
            segment_id: 'segment-1',
            batch_id: 'batch-1',
            source_id: sourceId,
            source_epoch: sourceEpoch,
            complete_source_end: completeness === 'canonical' ? sourceRange.end : null,
            logical_item_count: 0
        },
        completeness,
        lineage_checkpoint: null
    };
}

function resizeTargetCheckpoint(checkpointValue, end, { start = 0, itemCount = 0 } = {}) {
    const range = { start, end };
    checkpointValue.source.source_range = range;
    checkpointValue.source.snapshot_boundary.byte_length = end;
    checkpointValue.segment.source_range = range;
    checkpointValue.projection_watermark.complete_source_end = checkpointValue.completeness === 'canonical'
        ? end
        : null;
    checkpointValue.projection_watermark.logical_item_count = itemCount;
    if (checkpointValue.cursor) {
        checkpointValue.cursor.complete_range = range;
        checkpointValue.cursor.snapshot_boundary.byte_length = end;
        checkpointValue.cursor.last_complete_line.byte_start = start;
        checkpointValue.cursor.last_complete_line.byte_end = end;
    }
    return checkpointValue;
}

function targetPayload({
    jobId = 'job-1',
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1',
    completeness = 'canonical'
} = {}) {
    const canonical = completeness === 'canonical';
    const sourceRange = { start: 0, end: 10 };
    const cursor = canonical ? targetCursor({
        conversationId,
        sourceId,
        sourceEpoch
    }) : null;
    return {
        conversation_id: conversationId,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        source_range: sourceRange,
        history_items: [],
        diagnostics: [],
        parser_provenance: {
            parser_backend: 'test-parser',
            wire_source_revision: 'test-wire',
            compatibility_profile: 'current'
        },
        complete: canonical,
        completeness,
        projection: {
            schema: 'test-projection',
            schema_version: 1,
            conversation_id: conversationId,
            source: { source_id: sourceId, source_epoch: sourceEpoch },
            complete: canonical,
            provisional: !canonical,
            coverage: canonical ? 'complete' : 'partial',
            availability: 'present',
            turns: [],
            diagnostics: [],
            usage_total: null
        },
        tool_details: [],
        usage: null,
        task_outcomes: [],
        progress: {
            records_seen: 1,
            records_emitted: 0,
            bytes_scanned: 10,
            has_more: !canonical
        },
        next_cursor: cursor,
        mutations: canonical
            ? [{ mutation: 'complete_range', source_range: sourceRange }]
            : [{ mutation: 'mark_partial', source_range: sourceRange }],
        reducer_state: canonical
            ? {
                schema_version: 1,
                reducer_id: 'termlink.analysis_reducer',
                reducer_version: '1',
                payload: {}
            }
            : null
    };
}

function targetBatch({
    requestId = 'request-1',
    jobId = 'job-1',
    segmentId = 'segment-1',
    batchId = 'batch-1',
    completeness = 'canonical',
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1'
} = {}) {
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'batch',
        request_id: requestId,
        job_id: jobId,
        segment_id: segmentId,
        batch_id: batchId,
        payload: targetPayload({
            jobId,
            conversationId,
            sourceId,
            sourceEpoch,
            completeness
        })
    };
}

function targetItemMutation({
    itemKey = 'item-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1',
    completeness = 'canonical'
} = {}) {
    return {
        mutation: 'upsert_item',
        item: {
            item_key: itemKey,
            content_hash: `item-content-${itemKey}`,
            source_epoch: sourceEpoch,
            completeness,
            source_ref: {
                source_identity: sourceId,
                byte_start: 0,
                byte_end: 10,
                physical_line_ordinal: 1,
                rollout_ordinal: null
            }
        }
    };
}

function targetBatchWithItem({
    itemKey = 'item-1',
    text = 'one',
    eventId,
    ...options
} = {}) {
    const message = targetBatch(options);
    const resolvedEventId = eventId || `event-${message.batch_id}`;
    message.payload.history_items = [targetHistoryEvent({
        eventType: 'UserMessage',
        conversationId: options.conversationId || 'conversation-1',
        sourceId: options.sourceId || 'rollout.jsonl',
        itemKey,
        eventId: resolvedEventId,
        text
    })];
    message.payload.mutations = [
        targetItemMutation({
            itemKey,
            sourceId: options.sourceId || 'rollout.jsonl',
            sourceEpoch: options.sourceEpoch || 'epoch-1',
            completeness: options.completeness || 'canonical'
        }),
        ...(message.payload.completeness === 'canonical'
            ? [{ mutation: 'complete_range', source_range: { start: 0, end: 10 } }]
            : [{ mutation: 'mark_partial', source_range: { start: 0, end: 10 } }])
    ];
    return message;
}

function addTargetLineage(message, facts) {
    const transitions = facts.map((fact) => ({
        parent_rollout_id: fact.parent_rollout_id,
        child_rollout_id: fact.child_rollout_id,
        history_base: structuredClone(fact.cut),
        validation_state: 'validated'
    }));
    const chain = [facts[0].parent_rollout_id];
    for (const fact of facts) chain.push(fact.child_rollout_id);
    message.payload.history_base = structuredClone(facts.at(-1).cut);
    message.payload.lineage_transitions = transitions;
    message.payload.lineage_coverage = {
        root_rollout_id: chain[0],
        active_head_rollout_id: chain.at(-1),
        chain_rollout_ids: chain,
        covered_source_count: chain.length,
        complete: true
    };
    return message;
}

function addTargetReplacement(message, facts, { mutation = true } = {}) {
    addTargetLineage(message, facts);
    message.payload.replacements = facts.map((fact) => structuredClone(fact));
    if (mutation) {
        message.payload.mutations.push(...facts.map((fact) => ({
            mutation: 'replace_last_turn',
            replacement: structuredClone(fact)
        })));
    }
    return message;
}

function hasOwnKeyDeep(value, key) {
    if (Array.isArray(value)) return value.some((entry) => hasOwnKeyDeep(entry, key));
    if (!value || typeof value !== 'object') return false;
    return Object.entries(value).some(([entryKey, nestedValue]) => (
        entryKey === key || hasOwnKeyDeep(nestedValue, key)
    ));
}

function setTargetBatchRange(message, start, end) {
    const range = { start, end };
    message.payload.source_range = range;
    message.payload.progress.bytes_scanned = end;
    for (const mutation of message.payload.mutations) {
        if (mutation.source_range) mutation.source_range = { ...range };
    }
    const cursor = message.payload.next_cursor;
    if (cursor) {
        cursor.snapshot_boundary.byte_length = end;
        cursor.complete_range = { ...range };
        cursor.last_complete_line.byte_start = start;
        cursor.last_complete_line.byte_end = end;
    }
    for (const item of message.payload.history_items) {
        const sourceRef = item.payload?.metadata?.source_ref;
        if (!sourceRef) continue;
        sourceRef.byte_start = start;
        sourceRef.byte_end = end;
    }
    return message;
}

function targetComplete({
    requestId = 'complete-1',
    jobId = 'job-1',
    completeness = 'canonical',
    conversationId = 'conversation-1',
    sourceId = 'rollout.jsonl',
    sourceEpoch = 'epoch-1',
    segmentId = 'segment-1',
    batchId = 'batch-1'
} = {}) {
    const cursor = completeness === 'canonical' ? targetCursor({
        conversationId,
        sourceId,
        sourceEpoch
    }) : null;
    const checkpointValue = targetCheckpoint({
        jobId,
        requestId,
        conversationId,
        sourceId,
        sourceEpoch,
        completeness,
        cursor
    });
    checkpointValue.projection_watermark.segment_id = segmentId;
    checkpointValue.projection_watermark.batch_id = batchId;
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: requestId,
        job_id: jobId,
        status: completeness === 'canonical' ? 'completed' : 'partial',
        completeness,
        next_cursor: cursor,
        checkpoint: checkpointValue
    };
}

function targetCheckpointForBatch(message) {
    const payload = message.payload;
    const checkpointValue = targetCheckpoint({
        jobId: message.job_id,
        requestId: message.request_id,
        conversationId: payload.conversation_id,
        sourceId: payload.source_id,
        sourceEpoch: payload.source_epoch,
        completeness: payload.completeness,
        cursor: payload.next_cursor
    });
    checkpointValue.projection_watermark.segment_id = message.segment_id;
    checkpointValue.projection_watermark.batch_id = message.batch_id;
    return checkpointValue;
}

test('target protocol is JSONL and rejects legacy analyze fields', () => {
    const request = createAnalyzeRequest({
        requestId: 'request-1',
        jobId: 'job-1',
        conversationId: 'conversation-1',
        mode: 'preview',
        knownCompleteRange: null,
        future_field: { accepted: true }
    });
    const parsed = parseLine(encodeMessage(request));
    assert.equal(parsed.message_type, 'analyze');
    assert.equal(parsed.job_id, 'job-1');
    assert.equal(parsed.mode, 'preview');
    assert.equal('source_spec' in parsed, false);
    assert.equal('replay' in parsed, false);
    assert.deepEqual(parsed.future_field, { accepted: true });
    for (const mode of ['preview', 'backfill', 'append']) {
        assert.equal(
            createAnalyzeRequest({
                requestId: 'request-' + mode,
                jobId: 'job-' + mode,
                conversationId: 'conversation-1',
                mode
            }).mode,
            mode
        );
    }
    assert.throws(
        () => createAnalyzeRequest({
            requestId: 'legacy-request',
            jobId: 'job-1',
            conversationId: 'conversation-1',
            mode: 'replay'
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
    assert.throws(
        () => createAnalyzeRequest({
            requestId: 'legacy-request',
            jobId: 'job-1',
            conversationId: 'conversation-1',
            mode: 'preview',
            sourceSpec: { path: 'rollout.jsonl' }
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
    assert.throws(
        () => parseLine('{"protocol_version":1,"message_type":"batch"}'),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
    assert.throws(
        () => parseLine('{not-json'),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'malformed_protocol'
    );
    assert.equal(
        createCancel('cancel-1', 'test-cancel').message_type,
        'cancel'
    );
    assert.equal(
        createError({
            requestId: 'error-1',
            code: 'resource_timeout',
            message: 'bounded request timed out',
            retryable: true,
            fatal: false
        }).retryable,
        true
    );
});

test('target analyze recovery uses a complete opaque delivery pair', () => {
    const request = createAnalyzeRequest({
        requestId: 'retry-request',
        jobId: 'job-1',
        conversationId: 'conversation-1',
        mode: 'append',
        recovery: { segment_id: 'segment-1', batch_id: 'batch-1' }
    });
    assert.deepEqual(request.recovery, {
        segment_id: 'segment-1',
        batch_id: 'batch-1'
    });
    for (const recovery of [
        { segment_id: 'segment-1' },
        { batch_id: 'batch-1' }
    ]) {
        assert.throws(
            () => createAnalyzeRequest({
                requestId: 'retry-request',
                jobId: 'job-1',
                conversationId: 'conversation-1',
                mode: 'append',
                recovery
            }),
            (error) => error instanceof AnalyzerProtocolError
                && error.code === 'missing_field'
        );
    }
});

test('target hello advertises canonical capabilities and normalizes only the old analyze alias', () => {
    const hello = createHello('hello-target');
    assert.deepEqual(hello.capabilities, [
        'analyze_v1',
        'cancel',
        'checkpoint',
        'ack',
        'last_turn_replacement_v1'
    ]);
    assert.equal(hasRequiredCapabilities(hello.capabilities), true);
    assert.equal(hasRequiredCapabilities(['preview', 'backfill', 'append', 'cancel']), false);
    assert.deepEqual(
        canonicalizeCapabilities(['ack', 'analyze', 'cancel', 'analyze_v1']),
        ['ack', 'analyze_v1', 'cancel']
    );
    assert.throws(
        () => validateMessage({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'hello',
            request_id: 'hello-invalid',
            role: 'node',
            capabilities: ['analyze']
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
    assert.equal(
        validateMessage({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'hello',
            request_id: 'hello-analyzer',
            role: 'analyzer',
            analyzer_version: '4.5-test',
            capabilities: ['analyze', 'cancel'],
            parser_backend: 'test-parser',
            compatibility_layer_version: 'test-compat'
        }).role,
        'analyzer'
    );
});

test('target startup resolves CODEX_HOME and builds the fixed sessions-root args', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-startup-config-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const expectedSessionsRoot = path.normalize(path.resolve(codexHome, 'sessions'));

    assert.equal(
        resolveSessionsRoot({
            env: { CODEX_HOME: path.join(codexHome, '..', 'codex-home') },
            homedir: () => path.join(root, 'fallback-home')
        }),
        expectedSessionsRoot
    );
    assert.equal(
        resolveSessionsRoot({
            env: { CODEX_HOME: codexHome },
            homedir: () => {
                throw new Error('OS home is unavailable');
            }
        }),
        expectedSessionsRoot,
        'an explicit CODEX_HOME must not call the OS-home fallback'
    );
    assert.throws(
        () => resolveSessionsRoot({
            env: {},
            homedir: () => '   '
        }),
        (error) => error instanceof AnalyzerStartupError
            && error.code === 'ANALYZER_CODEX_HOME_INVALID'
    );
    assert.throws(
        () => resolveSessionsRoot({
            env: { CODEX_HOME: path.join(root, 'missing-home') },
            homedir: () => codexHome
        }),
        (error) => error instanceof AnalyzerStartupError
            && error.code === 'ANALYZER_CODEX_HOME_INVALID'
    );
    assert.deepEqual(
        buildStartupArgs(['fake-analyzer.js'], expectedSessionsRoot).slice(-4),
        ['--startup-config-version', '1', '--sessions-root', expectedSessionsRoot]
    );
    assert.throws(
        () => buildStartupArgs(['--sessions-root', 'override'], expectedSessionsRoot),
        (error) => error instanceof AnalyzerStartupError
            && error.code === 'ANALYZER_STARTUP_ARGS_CONFLICT'
    );
    assert.equal(fs.existsSync(expectedSessionsRoot), false);
});

test('target startup falls back to OS home/.codex/sessions without CODEX_HOME', async (t) => {
    const home = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-os-home-'));
    t.after(() => fs.promises.rm(home, { recursive: true, force: true }));
    await fs.promises.mkdir(path.join(home, '.codex'));
    const expected = path.join(home, '.codex', 'sessions');
    for (const env of [{}, { CODEX_HOME: '   ' }]) {
        assert.equal(resolveSessionsRoot({ env, homedir: () => home }), expected);
    }
    assert.equal(fs.existsSync(expected), false, 'resolving the path must not create sessions');
});

test('target process manager passes startup args and gates analyze behind echoed hello', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-process-'));
    let manager = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const argvFile = path.join(root, 'argv.json');
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        args: [fixture],
        cwd: root,
        env: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_ARGV_FILE: argvFile
        },
        helloTimeoutMs: 1000,
        requestTimeoutMs: 1000
    });
    const sent = [];
    const hellos = [];
    manager.on('sent', (message) => sent.push(message));
    manager.on('hello', (message) => hellos.push(message));

    await manager.start();

    assert.equal(manager.generation, 1);
    assert.equal(
        manager.sessionsRoot,
        path.normalize(path.resolve(codexHome, 'sessions'))
    );
    assert.equal(fs.existsSync(manager.sessionsRoot), false);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].message_type, 'hello');
    assert.equal(sent[0].role, 'node');
    assert.equal(hellos.length, 1);
    assert.equal(hellos[0].role, 'analyzer');
    assert.equal(hellos[0].request_id, sent[0].request_id);
    assert.deepEqual(
        JSON.parse(await fs.promises.readFile(argvFile, 'utf8')).slice(-4),
        [
            '--startup-config-version',
            '1',
            '--sessions-root',
            manager.sessionsRoot
        ]
    );
    assert.equal(sent.some((message) => message.message_type === 'analyze'), false);
});

test('target process manager rejects direct analyze sends until the current hello is ready', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-handshake-gate-'));
    let manager = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        args: [fixture],
        cwd: root,
        env: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_HELLO_DELAY_MS: '100'
        },
        helloTimeoutMs: 1000,
        requestTimeoutMs: 1000
    });
    const sent = [];
    let messagePhaseError = null;
    const request = createAnalyzeRequest({
        requestId: 'handshake-gate-request',
        jobId: 'handshake-gate-job',
        conversationId: 'handshake-gate-conversation',
        mode: 'preview'
    });
    manager.on('sent', (message) => sent.push(message));
    manager.on('message', (message) => {
        if (message.message_type !== 'hello') return;
        try {
            manager.send(request);
        } catch (error) {
            messagePhaseError = error;
        }
    });

    const startPromise = manager.start();
    assert.throws(
        () => manager.send(request),
        (error) => error instanceof AnalyzerStartupError
            && error.code === 'ANALYZER_HANDSHAKE_REQUIRED'
    );
    await startPromise;

    assert.ok(messagePhaseError instanceof AnalyzerStartupError);
    assert.equal(messagePhaseError.code, 'ANALYZER_HANDSHAKE_REQUIRED');
    assert.equal(manager.readyGeneration, manager.generation);
    assert.deepEqual(
        sent.map((message) => message.message_type),
        ['hello']
    );
});

test('target process manager clears synchronous spawn failures before retrying startup', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-sync-spawn-retry-'));
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    let manager = null;
    let spawnCalls = 0;
    let retryChild = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        cwd: root,
        env: { CODEX_HOME: codexHome },
        helloTimeoutMs: 1000,
        requestTimeoutMs: 1000,
        spawnImpl: () => {
            spawnCalls += 1;
            if (spawnCalls === 1) throw new Error('synthetic synchronous spawn failure');
            retryChild = createSyntheticAnalyzerChild({ exitOnKill: true });
            setImmediate(() => retryChild.emit('spawn'));
            return retryChild;
        }
    });

    await assert.rejects(
        manager.start(),
        (error) => error instanceof Error
            && error.message === 'synthetic synchronous spawn failure'
    );
    assert.equal(manager.child, null);
    assert.equal(manager.startPromise, null);

    await manager.stop();
    await manager.start();
    assert.equal(spawnCalls, 2);
    assert.equal(manager.child, retryChild);
    assert.equal(manager.readyGeneration, manager.generation);

    await manager.stop();
    assert.equal(manager.child, null);
});

test('target process manager clears start promise when default spawn throws synchronously', async (t) => {
    const manager = new AnalyzerProcessManager({ analyzerPath: 123 });
    t.after(async () => manager.stop());

    await assert.rejects(
        manager.start(),
        (error) => error?.code === 'ERR_INVALID_ARG_TYPE'
    );
    assert.equal(manager.child, null);
    assert.equal(manager.startPromise, null);

    await manager.stop();
    await assert.rejects(
        manager.start(),
        (error) => error?.code === 'ERR_INVALID_ARG_TYPE'
    );
    assert.equal(manager.child, null);
    assert.equal(manager.startPromise, null);
});

for (const [helloMode, expectedCode] of [
    ['mismatch_request', 'ANALYZER_HELLO_REQUEST_MISMATCH'],
    ['wrong_role', 'ANALYZER_HELLO_ROLE_INVALID'],
    ['missing_capability', 'ANALYZER_HELLO_CAPABILITIES_UNSUPPORTED'],
    ['wrong_protocol', 'unsupported_protocol_version']
]) {
    test(`target process manager rejects hello ${helloMode}`, async (t) => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `termlink-target-hello-${helloMode}-`));
        let manager = null;
        t.after(async () => {
            await manager?.stop();
            await fs.promises.rm(root, { recursive: true, force: true });
        });
        const codexHome = path.join(root, 'codex-home');
        await fs.promises.mkdir(codexHome);
        const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
        manager = new AnalyzerProcessManager({
            analyzerPath: process.execPath,
            args: [fixture],
            cwd: root,
            env: { CODEX_HOME: codexHome, FAKE_ANALYZER_HELLO_MODE: helloMode },
            helloTimeoutMs: 500,
            requestTimeoutMs: 500
        });

        await assert.rejects(
            () => manager.start(),
            (error) => error.code === expectedCode
        );
        assert.equal(manager.handshake, null);
    });
}

test('target process manager rejects hello timeout without sending analyze', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-hello-timeout-'));
    let manager = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        args: [fixture],
        cwd: root,
        env: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_HELLO_DELAY_MS: '150'
        },
        helloTimeoutMs: 20,
        requestTimeoutMs: 500
    });
    const sent = [];
    manager.on('sent', (message) => sent.push(message));

    const request = createAnalyzeRequest({
        requestId: 'hello-timeout-request',
        jobId: 'hello-timeout-job',
        conversationId: 'hello-timeout-conversation',
        mode: 'preview'
    });
    await assert.rejects(
        () => manager.request(request),
        (error) => error instanceof AnalyzerStartupError && error.code === 'ANALYZER_HELLO_TIMEOUT'
    );
    assert.equal(sent.filter((message) => message.message_type === 'analyze').length, 0);
});

for (const [killMode, kill] of [
    ['returns false', () => false],
    ['throws', () => {
        throw new Error('synthetic kill failure');
    }]
]) {
    test(`target process manager fences startup failures until child exit is proven (${killMode})`, async (t) => {
        const root = await fs.promises.mkdtemp(path.join(
            os.tmpdir(),
            `termlink-startup-termination-fence-${killMode.replaceAll(' ', '-')}-`
        ));
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.stdin = new EventEmitter();
        child.stdin.destroyed = false;
        child.stdin.writable = true;
        child.stdin.write = () => true;
        child.exitCode = null;
        child.signalCode = null;
        child.killSignals = [];
        child.kill = (signal) => {
            child.killSignals.push(signal ?? null);
            return kill();
        };

        let manager = null;
        let spawnCount = 0;
        t.after(async () => {
            if (child.exitCode === null && child.signalCode === null) {
                child.signalCode = 'SIGKILL';
                child.emit('exit', null, child.signalCode);
            }
            await manager?.stop().catch(() => {});
            await fs.promises.rm(root, { recursive: true, force: true });
        });

        manager = new AnalyzerProcessManager({
            analyzerPath: 'synthetic-analyzer',
            env: { CODEX_HOME: root },
            spawnImpl: () => {
                spawnCount += 1;
                setImmediate(() => child.emit('spawn'));
                return child;
            },
            helloTimeoutMs: 500,
            requestTimeoutMs: 500,
            terminationGraceMs: 1000
        });
        manager.on('sent', (message) => {
            if (message.message_type !== 'hello') return;
            setImmediate(() => child.stdout.emit('data', `${JSON.stringify({
                protocol_version: PROTOCOL_VERSION,
                message_type: 'hello',
                request_id: message.request_id,
                role: 'node',
                capabilities: []
            })}\n`));
        });

        await assert.rejects(
            () => manager.start(),
            (error) => error instanceof AnalyzerStartupError
                && error.code === 'ANALYZER_HELLO_ROLE_INVALID'
        );
        assert.equal(spawnCount, 1);
        assert.equal(manager.child, child);
        assert.equal(manager.stopping, true);
        assert.equal(manager.startupFailure.code, 'ANALYZER_HELLO_ROLE_INVALID');
        assert.notEqual(manager.processInvalidationPromise, null);
        assert.deepEqual(child.killSignals, [null]);

        let idleSettled = false;
        const idle = manager.waitForIdle().then(() => {
            idleSettled = true;
        });
        await waitMs(20);
        assert.equal(idleSettled, false);

        let restartSettled = false;
        const restart = manager.start().then(
            () => {
                restartSettled = true;
            },
            (error) => {
                restartSettled = true;
                return error;
            }
        );
        await waitMs(20);
        assert.equal(restartSettled, false);
        assert.equal(spawnCount, 1);
        assert.equal(manager.generation, 1);

        child.signalCode = 'SIGTERM';
        child.emit('exit', null, child.signalCode);
        const [restartResult] = await Promise.all([restart, idle]);
        assert.equal(restartResult.code, 'ANALYZER_PROCESS_STOPPED');
        assert.equal(spawnCount, 1);
        assert.equal(manager.processInvalidationPromise, null);
    });
}

test('target process manager bounds a request while hello startup is already in flight', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-request-startup-deadline-'));
    let manager = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        args: [fixture],
        cwd: root,
        env: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_HELLO_DELAY_MS: '150'
        },
        helloTimeoutMs: 1000,
        requestTimeoutMs: 1000
    });
    const startPromise = manager.start();
    const observedStart = startPromise.catch((error) => error);
    await waitMs(10);

    await assert.rejects(
        manager.request(createAnalyzeRequest({
            requestId: 'request-startup-deadline',
            jobId: 'request-startup-deadline-job',
            conversationId: 'request-startup-deadline-conversation',
            mode: 'preview'
        }), { timeoutMs: 30 }),
        (error) => error instanceof AnalyzerStartupError
            && error.code === 'ANALYZER_REQUEST_TIMEOUT'
            && error.details.phase === 'startup'
    );
    const startError = await observedStart;
    assert.equal(startError.code, 'ANALYZER_PROCESS_STOPPED');
    assert.equal(manager.child, null);
    assert.equal(manager.activeRequest, null);
});

test('target request tracker binds attempt generation and phase deadlines', async () => {
    const timers = new ManualTimers();
    let now = 1000;
    const tracker = new AnalyzerRequestTracker({
        defaultTimeoutMs: 100,
        setTimeoutFn: timers.setTimeout.bind(timers),
        clearTimeoutFn: timers.clearTimeout.bind(timers),
        nowFn: () => now
    });
    const settled = [];
    const promise = tracker.track('tracker-phase', {
        generation: 3,
        attempt: 2,
        phase: 'hello',
        phaseTimeouts: { hello: 10, analyze: 20, complete: 30 },
        onSettled: (snapshot) => settled.push(snapshot)
    });

    assert.equal(tracker.matches('tracker-phase', { generation: 3, attempt: 2 }), true);
    assert.equal(tracker.matches('tracker-phase', { generation: 2, attempt: 2 }), false);
    assert.equal(tracker.get('tracker-phase').phase, 'hello');
    assert.equal(timers.history.at(-1).delay, 10);

    now = 1010;
    assert.equal(
        tracker.advancePhase('tracker-phase', 'analyze', { generation: 3, attempt: 2 }),
        true
    );
    now = 1020;
    assert.equal(
        tracker.setPhase('tracker-phase', 'complete', { generation: 3, attempt: 2 }),
        true
    );
    assert.deepEqual(timers.history.map(({ delay }) => delay), [10, 20, 30]);
    assert.equal(tracker.get('tracker-phase').phase, 'complete');

    assert.equal(
        tracker.resolve('tracker-phase', { ok: false }, { generation: 2, attempt: 2 }),
        false
    );
    assert.equal(
        tracker.resolve('tracker-phase', { ok: true }, { generation: 3, attempt: 2 }),
        true
    );
    assert.deepEqual(await promise, { ok: true });
    assert.equal(settled.length, 1);
    assert.equal(settled[0].settlement.kind, 'resolved');
    assert.equal(settled[0].phase, 'complete');
    assert.equal(tracker.get('tracker-phase'), null);
    assert.equal(tracker.size, 0);
    assert.equal(tracker.markTerminated('tracker-phase', { generation: 3, attempt: 1 }), false);
    assert.equal(timers.activeCount, 0);
});

test('target request tracker settles each normal terminal attempt once and releases it', async () => {
    const timers = new ManualTimers();
    const tracker = new AnalyzerRequestTracker({
        setTimeoutFn: timers.setTimeout.bind(timers),
        clearTimeoutFn: timers.clearTimeout.bind(timers)
    });
    let settledCount = 0;
    const promise = tracker.track('tracker-once', {
        generation: 1,
        attempt: 1,
        onSettled: () => { settledCount += 1; }
    });

    assert.throws(
        () => tracker.track('tracker-once', { generation: 1, attempt: 2 }),
        (error) => error.code === 'ANALYZER_REQUEST_DUPLICATE'
    );
    assert.equal(tracker.resolve('tracker-once', 'first', { generation: 1, attempt: 1 }), true);
    assert.equal(tracker.resolve('tracker-once', 'second', { generation: 1, attempt: 1 }), false);
    assert.equal(
        tracker.reject('tracker-once', new Error('late failure'), { generation: 1, attempt: 1 }),
        false
    );
    assert.equal(settledCount, 1);
    assert.equal(await promise, 'first');
    assert.equal(tracker.has('tracker-once'), false);
    assert.equal(tracker.size, 0);
    assert.equal(tracker.rejectAll(), 0);

    const failure = tracker.track('tracker-error', { generation: 1, attempt: 3 });
    const handledFailure = assert.rejects(
        failure,
        (error) => error.code === 'ANALYZER_TARGET_FAILURE'
    );
    const terminalError = new Error('terminal failure');
    terminalError.code = 'ANALYZER_TARGET_FAILURE';
    assert.equal(
        tracker.reject('tracker-error', terminalError, { generation: 1, attempt: 3 }),
        true
    );
    assert.equal(tracker.has('tracker-error'), false);
    assert.equal(tracker.size, 0);
    await handledFailure;
    assert.equal(tracker.size, 0);
    assert.equal(timers.activeCount, 0);
});

test('target request tracker keeps a cancelled attempt occupied until termination and rejects stale callbacks', async () => {
    const timers = new ManualTimers();
    const tracker = new AnalyzerRequestTracker({
        setTimeoutFn: timers.setTimeout.bind(timers),
        clearTimeoutFn: timers.clearTimeout.bind(timers)
    });
    let cancelCount = 0;
    const promise = tracker.track('tracker-cancel', {
        generation: 4,
        attempt: 7,
        onCancel: () => { cancelCount += 1; }
    });
    const rejected = assert.rejects(
        promise,
        (error) => error.code === 'ANALYZER_REQUEST_CANCELLED' && error.retryable === true
    );

    assert.equal(
        tracker.requestCancel('tracker-cancel', 'caller_cancelled', { generation: 4, attempt: 7 }),
        true
    );
    assert.equal(
        tracker.requestCancel('tracker-cancel', 'duplicate_cancel', { generation: 4, attempt: 7 }),
        false
    );
    assert.equal(
        tracker.resolve('tracker-cancel', 'stale-result', { generation: 4, attempt: 7 }),
        false
    );
    assert.equal(cancelCount, 1);
    assert.equal(tracker.get('tracker-cancel').cancel_requested, true);
    assert.equal(tracker.get('tracker-cancel').termination_waiting, true);
    assert.equal(tracker.size, 1);
    assert.equal(timers.activeCount, 0);
    await rejected;

    assert.equal(
        tracker.markTerminated('tracker-cancel', { generation: 5, attempt: 7 }),
        false
    );
    assert.equal(
        tracker.markTerminated('tracker-cancel', { generation: 4, attempt: 7 }),
        true
    );
    assert.equal(tracker.size, 0);

    const retry = tracker.track('tracker-cancel', { generation: 5, attempt: 8 });
    assert.equal(
        tracker.resolve('tracker-cancel', 'old-attempt', { generation: 4, attempt: 7 }),
        false
    );
    assert.equal(
        tracker.resolve('tracker-cancel', 'new-attempt', { generation: 5, attempt: 8 }),
        true
    );
    assert.equal(await retry, 'new-attempt');
    assert.equal(tracker.markTerminated('tracker-cancel', { generation: 5, attempt: 8 }), false);
    assert.equal(tracker.size, 0);
});

test('target request tracker reports hello/analyze/complete timeout and retains the active slot', async () => {
    const timers = new ManualTimers();
    const timeoutPhases = [];
    const tracker = new AnalyzerRequestTracker({
        setTimeoutFn: timers.setTimeout.bind(timers),
        clearTimeoutFn: timers.clearTimeout.bind(timers)
    });
    const promise = tracker.track('tracker-timeout', {
        generation: 8,
        attempt: 'attempt-1',
        phase: 'hello',
        phaseTimeouts: { hello: 5, analyze: 10, complete: 15 },
        onTimeout: (error) => timeoutPhases.push(error.details.phase)
    });
    const rejected = assert.rejects(
        promise,
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
            && error.retryable === true
            && error.details.phase === 'complete'
    );

    assert.equal(tracker.setPhase('tracker-timeout', 'analyze', {
        generation: 8,
        attempt: 'attempt-1'
    }), true);
    assert.equal(tracker.setPhase('tracker-timeout', 'complete', {
        generation: 8,
        attempt: 'attempt-1'
    }), true);
    const timeoutTimerId = timers.history.at(-1).id;
    timers.fire(timeoutTimerId);
    await rejected;

    assert.deepEqual(timeoutPhases, ['complete']);
    assert.equal(tracker.requestTimeout('tracker-timeout', {
        generation: 8,
        attempt: 'attempt-1'
    }), false);
    assert.equal(tracker.cancel('tracker-timeout', 'too-late', {
        generation: 8,
        attempt: 'attempt-1'
    }), false);
    assert.equal(tracker.resolve('tracker-timeout', 'late-result', {
        generation: 8,
        attempt: 'attempt-1'
    }), false);
    assert.equal(tracker.get('tracker-timeout').timeout_requested, true);
    assert.equal(tracker.get('tracker-timeout').termination_waiting, true);
    assert.equal(tracker.size, 1);
    assert.equal(tracker.markTerminated('tracker-timeout', {
        generation: 8,
        attempt: 'attempt-1'
    }), true);
    assert.equal(tracker.size, 0);
    assert.equal(timers.activeCount, 0);
});

test('target process manager enforces one active request and drops an old generation message', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-single-flight-'));
    let manager = null;
    t.after(async () => {
        await manager?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    manager = new AnalyzerProcessManager({
        analyzerPath: process.execPath,
        args: [fixture],
        cwd: root,
        env: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_DELAY_MS: '120'
        },
        requestTimeoutMs: 2000,
        helloTimeoutMs: 1000
    });
    await manager.start();
    const firstRequest = createAnalyzeRequest({
        requestId: 'single-flight-1',
        jobId: 'single-flight-job-1',
        conversationId: 'single-flight-conversation',
        mode: 'preview'
    });
    const secondRequest = createAnalyzeRequest({
        requestId: 'single-flight-2',
        jobId: 'single-flight-job-2',
        conversationId: 'single-flight-conversation-2',
        mode: 'preview'
    });
    assert.throws(
        () => manager.send(firstRequest),
        (error) => error.code === 'ANALYZER_REQUEST_NOT_REGISTERED'
    );
    const first = manager.request(firstRequest);
    await waitMs(20);
    await assert.rejects(
        () => manager.request(secondRequest),
        (error) => error.code === 'ANALYZER_REQUEST_ACTIVE'
    );
    const complete = await first;
    assert.equal(complete.message_type, 'complete');
    assert.equal(manager.activeRequest, null);

    const oldGeneration = manager.generation;
    const oldChild = manager.child;
    const staleMessages = [];
    manager.on('staleMessage', (entry) => staleMessages.push(entry));
    await manager.stop();
    await manager.start();
    manager._handleMessage(
        targetBatch({ requestId: 'stale-generation-request' }),
        { generation: oldGeneration, child: oldChild }
    );
    manager._handleMessage(
        targetComplete({ requestId: 'stale-generation-complete' }),
        { generation: oldGeneration, child: oldChild }
    );
    manager._handleMessage(
        createError({
            requestId: 'stale-generation-error',
            code: 'analysis_failed',
            message: 'stale error',
            retryable: false,
            fatal: false
        }),
        { generation: oldGeneration, child: oldChild }
    );
    assert.equal(manager.generation, oldGeneration + 1);
    assert.equal(staleMessages.length, 3);
    assert.equal(staleMessages[0].message.request_id, 'stale-generation-request');
    assert.equal(staleMessages[1].message.request_id, 'stale-generation-complete');
    assert.equal(staleMessages[2].message.request_id, 'stale-generation-error');
    assert.equal(manager.activeRequest, null);
});

test('process manager does not release a generation before worker exit', async () => {
    const createChild = ({ exitOnKill = false } = {}) => {
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.stdin = {
            destroyed: false,
            writable: true,
            write: (line) => {
                const message = JSON.parse(String(line));
                if (message.message_type !== 'hello') return true;
                setImmediate(() => child.stdout.emit('data', `${JSON.stringify({
                    protocol_version: PROTOCOL_VERSION,
                    message_type: 'hello',
                    request_id: message.request_id,
                    role: 'analyzer',
                    analyzer_version: 'synthetic',
                    parser_backend: 'synthetic',
                    compatibility_layer_version: 'synthetic',
                    capabilities: ['analyze_v1', 'cancel', 'checkpoint', 'ack']
                })}\n`));
                return true;
            }
        };
        child.exitCode = null;
        child.signalCode = null;
        child.killSignals = [];
        child.kill = (signal) => {
            child.killSignals.push(signal ?? null);
            if (exitOnKill) {
                setImmediate(() => {
                    if (child.exitCode !== null || child.signalCode !== null) return;
                    child.signalCode = signal || 'SIGTERM';
                    child.emit('exit', null, child.signalCode);
                });
            }
            return true;
        };
        return child;
    };
    const releaseChild = (child) => {
        if (!child || child.exitCode !== null || child.signalCode !== null) return;
        child.signalCode = 'SIGKILL';
        child.emit('exit', null, child.signalCode);
    };
    const createManager = (root, spawnImpl) => new AnalyzerProcessManager({
        analyzerPath: 'synthetic-analyzer',
        env: { CODEX_HOME: root },
        spawnImpl,
        terminationGraceMs: 10
    });

    const rootForStop = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-termination-fence-stop-'));
    const oldStopChild = createChild();
    let spawnedStopChild = null;
    let stopSpawnCount = 0;
    const stopManager = createManager(rootForStop, () => {
        stopSpawnCount += 1;
        spawnedStopChild = createChild({ exitOnKill: true });
        setImmediate(() => spawnedStopChild.emit('spawn'));
        return spawnedStopChild;
    });
    stopManager.child = oldStopChild;
    stopManager.generation = 1;
    stopManager.readyGeneration = 1;
    stopManager.activeRequest = {
        requestId: 'termination-fence-stop-active',
        generation: 1,
        attempt: 0,
        child: oldStopChild
    };
    let stopPromise = null;
    let startAfterStop = null;
    let idleAfterStop = null;
    try {
        let idleSettled = false;
        idleAfterStop = stopManager.waitForIdle().then(() => {
            idleSettled = true;
        });
        let stopSettled = false;
        stopPromise = stopManager.stop().then(() => {
            stopSettled = true;
        });
        let startSettled = false;
        let startError = null;
        startAfterStop = stopManager.start().then(() => {
            startSettled = true;
        }, (error) => {
            startSettled = true;
            startError = error;
        });

        await waitMs(30);
        assert.equal(stopSettled, false);
        assert.equal(startSettled, false);
        assert.equal(idleSettled, false);
        assert.equal(stopSpawnCount, 0);
        assert.equal(stopManager.child, null);
        assert.deepEqual(oldStopChild.killSignals, [null, 'SIGKILL']);

        releaseChild(oldStopChild);
        await Promise.all([stopPromise, startAfterStop, idleAfterStop]);
        assert.equal(startError, null);
        assert.equal(stopSpawnCount, 1);
        assert.equal(stopManager.generation, 2);
        assert.equal(stopManager.child, spawnedStopChild);
        await stopManager.stop();
    } finally {
        releaseChild(oldStopChild);
        await Promise.allSettled([stopPromise, startAfterStop, idleAfterStop].filter(Boolean));
        await stopManager.stop().catch(() => {});
        await fs.promises.rm(rootForStop, { recursive: true, force: true });
    }

    const rootForInvalidation = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-termination-fence-invalidation-'));
    const oldInvalidationChild = createChild();
    let spawnedInvalidationChild = null;
    let invalidationSpawnCount = 0;
    const invalidationManager = createManager(rootForInvalidation, () => {
        invalidationSpawnCount += 1;
        spawnedInvalidationChild = createChild({ exitOnKill: true });
        setImmediate(() => spawnedInvalidationChild.emit('spawn'));
        return spawnedInvalidationChild;
    });
    invalidationManager.child = oldInvalidationChild;
    invalidationManager.generation = 1;
    let invalidationPromise = null;
    let startAfterInvalidation = null;
    let idleAfterInvalidation = null;
    try {
    const state = {
            requestId: 'termination-fence-request',
            generation: 1,
            attempt: 0,
            child: oldInvalidationChild
        };
        invalidationManager.activeRequest = state;
        invalidationManager.requests.set(state.requestId, state);
        let idleSettled = false;
        idleAfterInvalidation = invalidationManager.waitForIdle().then(() => {
            idleSettled = true;
        });
        let invalidationSettled = false;
        invalidationPromise = invalidationManager._invalidateCurrentProcess(state).then(() => {
            invalidationSettled = true;
        });
        invalidationManager._finishRequest(state);
        let startSettled = false;
        let startError = null;
        startAfterInvalidation = invalidationManager.start().then(() => {
            startSettled = true;
        }, (error) => {
            startSettled = true;
            startError = error;
        });

        await waitMs(1050);
        assert.equal(invalidationSettled, false);
        assert.equal(startSettled, false);
        assert.equal(idleSettled, false);
        assert.equal(invalidationSpawnCount, 0);
        assert.equal(invalidationManager.child, null);
        assert.deepEqual(oldInvalidationChild.killSignals, [null, 'SIGKILL']);

        releaseChild(oldInvalidationChild);
        await Promise.all([invalidationPromise, startAfterInvalidation, idleAfterInvalidation]);
        assert.equal(startError, null);
        assert.equal(invalidationSpawnCount, 1);
        assert.equal(invalidationManager.generation, 2);
        assert.equal(invalidationManager.child, spawnedInvalidationChild);
        await invalidationManager.stop();
    } finally {
        releaseChild(oldInvalidationChild);
        await Promise.allSettled([
            invalidationPromise,
            startAfterInvalidation,
            idleAfterInvalidation
        ].filter(Boolean));
        await invalidationManager.stop().catch(() => {});
        await fs.promises.rm(rootForInvalidation, { recursive: true, force: true });
    }
});

test('process manager keeps a pre-registered idle waiter behind ACK invalidation', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-idle-waiter-fence-'));
    let manager = null;
    let oldChild = null;
    let pending = null;
    let observed = null;
    let idleAfterFailure = null;
    let startAfterFailure = null;
    try {
        let spawnCount = 0;
        const children = [];
        manager = new AnalyzerProcessManager({
            analyzerPath: 'synthetic-analyzer',
            env: { CODEX_HOME: root },
            spawnImpl: () => {
                const child = createSyntheticAnalyzerChild({
                    failAck: spawnCount === 0,
                    failKill: spawnCount === 0,
                    exitOnKill: spawnCount > 0
                });
                spawnCount += 1;
                children.push(child);
                setImmediate(() => child.emit('spawn'));
                return child;
            },
            requestTimeoutMs: 1000,
            terminationGraceMs: 10
        });
        await manager.start();
        oldChild = children[0];

        pending = manager.request(createAnalyzeRequest({
            requestId: 'idle-waiter-fence-request',
            jobId: 'idle-waiter-fence-job',
            conversationId: 'synthetic-conversation',
            mode: 'preview'
        }));
        while (!manager.activeRequest || !oldChild.analyzeRequestId) await Promise.resolve();

        let idleSettled = false;
        idleAfterFailure = manager.waitForIdle().then(() => {
            idleSettled = true;
        });
        observed = pending.catch((error) => error);
        assert.equal(oldChild.releaseAnalyze(), true);

        const error = await observed;
        assert.equal(error.code, 'ANALYZER_PROCESS_NOT_RUNNING');
        await waitMs(30);
        assert.equal(idleSettled, false);
        assert.equal(manager.processInvalidationPromise !== null, true);
        assert.equal(manager.child, null);
        assert.deepEqual(oldChild.killSignals, [null, 'SIGKILL']);

        let startSettled = false;
        let startError = null;
        startAfterFailure = manager.start().then(() => {
            startSettled = true;
        }, (startFailure) => {
            startSettled = true;
            startError = startFailure;
        });
        await waitMs(30);
        assert.equal(startSettled, false);
        assert.equal(spawnCount, 1);

        oldChild.signalCode = 'SIGKILL';
        oldChild.emit('exit', null, oldChild.signalCode);
        await Promise.all([idleAfterFailure, startAfterFailure]);
        assert.equal(startError, null);
        assert.equal(spawnCount, 2);
        assert.equal(manager.generation, 2);
        assert.equal(manager.child, children[1]);
    } finally {
        if (oldChild && oldChild.exitCode === null && oldChild.signalCode === null) {
            oldChild.signalCode = 'SIGKILL';
            oldChild.emit('exit', null, oldChild.signalCode);
        }
        await Promise.allSettled([pending, observed, idleAfterFailure, startAfterFailure].filter(Boolean));
        await manager?.stop().catch(() => {});
        await fs.promises.rm(root, { recursive: true, force: true });
    }
});

test('process manager fences child errors that do not prove worker exit', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-error-termination-fence-'));
    let manager = null;
    let oldChild = null;
    let pending = null;
    let observed = null;
    let idleAfterError = null;
    let startAfterError = null;
    try {
        let spawnCount = 0;
        const children = [];
        manager = new AnalyzerProcessManager({
            analyzerPath: 'synthetic-analyzer',
            env: { CODEX_HOME: root },
            spawnImpl: () => {
                const child = createSyntheticAnalyzerChild({
                    failKill: spawnCount === 0,
                    emitErrorOnKill: spawnCount === 0,
                    exitOnKill: spawnCount > 0
                });
                spawnCount += 1;
                children.push(child);
                setImmediate(() => child.emit('spawn'));
                return child;
            },
            requestTimeoutMs: 1000,
            cancelGraceMs: 10,
            terminationGraceMs: 10
        });
        await manager.start();
        oldChild = children[0];

        pending = manager.request(createAnalyzeRequest({
            requestId: 'error-termination-fence-request',
            jobId: 'error-termination-fence-job',
            conversationId: 'synthetic-conversation',
            mode: 'preview'
        }));
        while (!manager.activeRequest || !oldChild.analyzeRequestId) await Promise.resolve();

        let idleSettled = false;
        idleAfterError = manager.waitForIdle().then(() => {
            idleSettled = true;
        });
        observed = pending.catch((error) => error);
        assert.equal(manager.cancel('error-termination-fence-request', 'worker_kill_failed'), true);

        const error = await observed;
        assert.equal(error.code, 'ANALYZER_REQUEST_CANCELLED');
        await waitMs(30);
        assert.equal(idleSettled, false);
        assert.equal(manager.processInvalidationPromise !== null, true);
        assert.equal(manager.child, null);
        assert.ok(oldChild.killSignals.length >= 2);
        assert.ok(oldChild.killSignals.includes('SIGKILL'));
        assert.equal(spawnCount, 1);

        let startSettled = false;
        let startError = null;
        startAfterError = manager.start().then(() => {
            startSettled = true;
        }, (startFailure) => {
            startSettled = true;
            startError = startFailure;
        });
        await waitMs(30);
        assert.equal(startSettled, false);
        assert.equal(spawnCount, 1);

        oldChild.signalCode = 'SIGKILL';
        oldChild.emit('exit', null, oldChild.signalCode);
        await Promise.all([idleAfterError, startAfterError]);
        assert.equal(startError, null);
        assert.equal(spawnCount, 2);
        assert.equal(manager.generation, 2);
        assert.equal(manager.child, children[1]);
    } finally {
        if (oldChild && oldChild.exitCode === null && oldChild.signalCode === null) {
            oldChild.signalCode = 'SIGKILL';
            oldChild.emit('exit', null, oldChild.signalCode);
        }
        await Promise.allSettled([pending, observed, idleAfterError, startAfterError].filter(Boolean));
        await manager?.stop().catch(() => {});
        await fs.promises.rm(root, { recursive: true, force: true });
    }
});

test('process manager normalizes asynchronous stdin errors and fences the child until exit', async () => {
    for (const errorCode of ['EPIPE', 'ERR_STREAM_DESTROYED']) {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `termlink-stdin-error-${errorCode.toLowerCase()}-`));
        let manager = null;
        let oldChild = null;
        let pending = null;
        let idleAfterError = null;
        let startAfterError = null;
        try {
            let spawnCount = 0;
            const children = [];
            manager = new AnalyzerProcessManager({
                analyzerPath: 'synthetic-analyzer',
                env: { CODEX_HOME: root },
                spawnImpl: () => {
                    const child = createSyntheticAnalyzerChild({
                        failKill: spawnCount === 0,
                        exitOnKill: spawnCount > 0
                    });
                    spawnCount += 1;
                    children.push(child);
                    setImmediate(() => child.emit('spawn'));
                    return child;
                },
                requestTimeoutMs: 1000,
                terminationGraceMs: 10
            });
            await manager.start();
            oldChild = children[0];

            pending = manager.request(createAnalyzeRequest({
                requestId: `stdin-error-${errorCode}`,
                jobId: `stdin-error-job-${errorCode}`,
                conversationId: `stdin-error-conversation-${errorCode}`,
                mode: 'preview'
            }));
            while (!manager.activeRequest || !oldChild.analyzeRequestId) await Promise.resolve();

            let idleSettled = false;
            idleAfterError = manager.waitForIdle().then(() => {
                idleSettled = true;
            });
            const observed = pending.catch((error) => error);
            assert.doesNotThrow(() => {
                const error = new Error(`synthetic stdin ${errorCode}`);
                error.code = errorCode;
                oldChild.stdin.emit('error', error);
            });

            const failure = await observed;
            assert.equal(failure.code, 'ANALYZER_PROCESS_NOT_RUNNING');
            await waitMs(30);
            assert.equal(idleSettled, false);
            assert.equal(manager.processInvalidationPromise !== null, true);
            assert.equal(manager.child, null);
            assert.deepEqual(oldChild.killSignals, [null, 'SIGKILL']);

            let startSettled = false;
            startAfterError = manager.start().then(() => {
                startSettled = true;
            });
            await waitMs(30);
            assert.equal(startSettled, false);
            assert.equal(spawnCount, 1);

            oldChild.signalCode = 'SIGKILL';
            oldChild.emit('exit', null, oldChild.signalCode);
            await Promise.all([idleAfterError, startAfterError]);
            assert.equal(spawnCount, 2);
            assert.equal(manager.generation, 2);
            assert.equal(manager.child, children[1]);
            await manager.stop();
        } finally {
            if (oldChild && oldChild.exitCode === null && oldChild.signalCode === null) {
                oldChild.signalCode = 'SIGKILL';
                oldChild.emit('exit', null, oldChild.signalCode);
            }
            await Promise.allSettled([pending, idleAfterError, startAfterError].filter(Boolean));
            await manager?.stop().catch(() => {});
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }
});

test('collector keeps one running intent and replaces only the same conversation pending intent', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-pending-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_DELAY_MS: '120',
            FAKE_ANALYZER_COMPLETE_DELAY_MS: '100'
        },
        requestTimeoutMs: 2000,
        cancelGraceMs: 50,
        processRestartRetries: 0,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const running = collector.analyze(createAnalyzeRequest({
        requestId: 'pending-running',
        jobId: 'pending-job',
        conversationId: 'pending-conversation',
        mode: 'preview'
    }));
    await waitMs(30);
    const firstPending = collector.analyze(createAnalyzeRequest({
        requestId: 'pending-first',
        jobId: 'pending-job',
        conversationId: 'pending-conversation',
        mode: 'append'
    }));
    const replacementPending = collector.analyze(createAnalyzeRequest({
        requestId: 'pending-replacement',
        jobId: 'pending-job',
        conversationId: 'pending-conversation',
        mode: 'append'
    }));

    await assert.rejects(
        firstPending,
        (error) => error.code === 'ANALYZER_PENDING_REPLACED'
            && error.details.replaced_request_id === 'pending-first'
    );
    const runningResult = await running;
    const replacementResult = await replacementPending;
    assert.equal(runningResult.complete.message_type, 'complete');
    assert.equal(replacementResult.complete.message_type, 'complete');
    assert.equal(replacementResult.initialRequestId, 'pending-replacement');
    assert.equal(collector.runningIntent, null);
    assert.equal(collector.pendingIntents.size, 0);
});

test('collector closes a timed-out active slot before dispatching the next intent', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-timeout-race-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_DELAY_MS: '300'
        },
        requestTimeoutMs: 1000,
        cancelGraceMs: 40,
        processRestartRetries: 0,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const timedOut = collector.analyze(createAnalyzeRequest({
        requestId: 'timeout-race-1',
        jobId: 'timeout-race-job-1',
        conversationId: 'timeout-race-conversation',
        mode: 'preview'
    }), { timeoutMs: 30 });
    await assert.rejects(
        timedOut,
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
    );

    const next = await collector.analyze(createAnalyzeRequest({
        requestId: 'timeout-race-2',
        jobId: 'timeout-race-job-2',
        conversationId: 'timeout-race-conversation-2',
        mode: 'preview'
    }));
    assert.equal(next.initialRequestId, 'timeout-race-2');
    assert.equal(next.complete.message_type, 'complete');
    assert.equal(collector.runningIntent, null);
});

test('collector waits for explicit cancellation settlement before dispatching the next intent', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-cancel-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_DELAY_MS: '250'
        },
        requestTimeoutMs: 1000,
        cancelGraceMs: 40,
        processRestartRetries: 0,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const cancelled = collector.analyze(createAnalyzeRequest({
        requestId: 'cancel-request-1',
        jobId: 'cancel-job-1',
        conversationId: 'cancel-conversation',
        mode: 'preview'
    }));
    await waitMs(30);
    assert.equal(collector.cancel('cancel-request-1', 'user_changed_conversation'), true);
    await assert.rejects(
        cancelled,
        (error) => error.code === 'ANALYZER_REQUEST_CANCELLED'
            && error.details.reason === 'user_changed_conversation'
    );

    const next = await collector.analyze(createAnalyzeRequest({
        requestId: 'cancel-request-2',
        jobId: 'cancel-job-2',
        conversationId: 'cancel-conversation-2',
        mode: 'preview'
    }));
    assert.equal(next.complete.message_type, 'complete');
    assert.equal(collector.runningIntent, null);
});

test('collector settles cancel and timeout before a non-draining worker releases', async (t) => {
    for (const scenario of ['cancel', 'timeout']) {
        await t.test(scenario, async () => {
            let active = false;
            let requestCount = 0;
            let requestReject = null;
            let idleResolve = null;
            let released = false;
            let stopResolve = null;
            const stopPromise = new Promise((resolve) => {
                stopResolve = resolve;
            });
            const processManager = {
                requestTimeoutMs: 1000,
                startCount: 0,
                async start() {
                    this.startCount += 1;
                    return this;
                },
                request() {
                    requestCount += 1;
                    if (requestCount === 1) {
                        active = true;
                        return new Promise((resolve, reject) => {
                            requestReject = reject;
                        });
                    }
                    active = false;
                    return Promise.resolve({
                        status: 'completed',
                        completeness: 'canonical',
                        checkpoint: null
                    });
                },
                cancel(requestId, reason) {
                    if (!requestReject) return false;
                    const error = new Error('synthetic cancellation');
                    error.code = 'ANALYZER_REQUEST_CANCELLED';
                    error.retryable = true;
                    error.details = {
                        request_id: requestId,
                        reason
                    };
                    requestReject(error);
                    return true;
                },
                waitForIdle() {
                    if (!active) return Promise.resolve();
                    return new Promise((resolve) => {
                        idleResolve = resolve;
                    });
                },
                stop() {
                    return released ? Promise.resolve() : stopPromise;
                }
            };
            const releaseWorker = () => {
                if (released) return;
                released = true;
                active = false;
                idleResolve?.();
                idleResolve = null;
                stopResolve?.();
                stopResolve = null;
            };
            const collector = new CodexRolloutCollector({
                processManager,
                store: new MemoryAnalysisStore(),
                checkpointStore: new MemoryCheckpointStore(),
                runStore: new MemoryAnalysisRunStore()
            });
            const requestId = `non-draining-${scenario}`;
            const first = collector.analyze(createAnalyzeRequest({
                requestId,
                jobId: `non-draining-job-${scenario}`,
                conversationId: `non-draining-conversation-${scenario}`,
                mode: 'preview'
            }), { timeoutMs: scenario === 'timeout' ? 30 : 1000 });
            const observed = first.then(
                () => ({ kind: 'resolved' }),
                (error) => ({ kind: 'rejected', error })
            );
            while (!active) await Promise.resolve();

            if (scenario === 'cancel') {
                assert.equal(collector.cancel(requestId, 'worker_ignores_cancel'), true);
            }
            const result = await Promise.race([
                observed,
                waitMs(200).then(() => ({ kind: 'deadline' }))
            ]);
            assert.equal(result.kind, 'rejected');
            assert.equal(
                result.error.code,
                scenario === 'cancel'
                    ? 'ANALYZER_REQUEST_CANCELLED'
                    : 'ANALYZER_REQUEST_TIMEOUT'
            );
            assert.notEqual(collector.runningIntent, null);
            assert.equal(active, true);
            assert.equal(requestCount, 1);
            assert.equal(processManager.startCount, 1);

            const next = collector.analyze(createAnalyzeRequest({
                requestId: `non-draining-next-${scenario}`,
                jobId: `non-draining-next-job-${scenario}`,
                conversationId: `non-draining-next-conversation-${scenario}`,
                mode: 'preview'
            }));
            await waitMs(20);
            assert.equal(requestCount, 1);
            assert.equal(collector.pendingIntents.size, 1);

            releaseWorker();
            const nextResult = await next;
            assert.equal(nextResult.complete.status, 'completed');
            assert.equal(requestCount, 2);
            assert.equal(collector.runningIntent, null);
            await collector.stop();
        });
    }
});

test('collector retries a crashed process with a new request id within the fixed budget', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-restart-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_CRASH_ONCE: 'before_batch',
            FAKE_ANALYZER_CRASH_MARKER: path.join(root, 'crash.marker')
        },
        requestTimeoutMs: 2000,
        processRestartRetries: 1,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    const analyzeAttempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') {
            analyzeAttempts.push({ requestId: message.request_id, generation: collector.processManager.generation });
        }
    });

    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'restart-initial-request',
        jobId: 'restart-job',
        conversationId: 'restart-conversation',
        mode: 'preview'
    }));
    assert.equal(analyzeAttempts.length, 2);
    assert.notEqual(analyzeAttempts[0].requestId, analyzeAttempts[1].requestId);
    assert.equal(analyzeAttempts[0].generation, 1);
    assert.equal(analyzeAttempts[1].generation, 2);
    assert.equal(result.requestId, analyzeAttempts[1].requestId);
    assert.equal(result.initialRequestId, 'restart-initial-request');
});

test('collector stop fences delayed initialization without leaking an analyzer process', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-stop-init-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    let releaseInit;
    let markInitStarted;
    const initStarted = new Promise((resolve) => {
        markInitStarted = resolve;
    });
    const initGate = new Promise((resolve) => {
        releaseInit = resolve;
    });
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        requestTimeoutMs: 1000,
        processRestartRetries: 0,
        importer: {
            async init() {
                markInitStarted();
                await initGate;
            },
            async importBatch() {},
            async commitComplete() {}
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const pending = collector.analyze(createAnalyzeRequest({
        requestId: 'stop-init-request',
        jobId: 'stop-init-job',
        conversationId: 'stop-init-conversation',
        mode: 'preview'
    }));
    await initStarted;
    const stopping = collector.stop();
    const pendingRejection = assert.rejects(
        pending,
        (error) => error.code === 'ANALYZER_REQUEST_CANCELLED'
    );
    releaseInit();
    await pendingRejection;
    await stopping;

    assert.equal(collector.processManager.child, null);
    assert.equal(collector.processManager.activeRequest, null);
    assert.equal(collector.initialized, false);
    assert.equal(collector.stopping, false);
});

test('collector fences bounded analyze against an in-flight unbounded init', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-bounded-init-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    let releaseInit;
    let markInitStarted;
    const initStarted = new Promise((resolve) => {
        markInitStarted = resolve;
    });
    const initGate = new Promise((resolve) => {
        releaseInit = resolve;
    });
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        requestTimeoutMs: 1000,
        processRestartRetries: 0,
        importer: {
            async init() {
                markInitStarted();
                await initGate;
            },
            async importBatch() {},
            async commitComplete() {}
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const publicInit = collector.init();
    await initStarted;
    await assert.rejects(
        collector.analyze(createAnalyzeRequest({
            requestId: 'bounded-init-timeout',
            jobId: 'bounded-init-timeout-job',
            conversationId: 'bounded-init-timeout-conversation',
            mode: 'preview'
        }), { timeoutMs: 30 }),
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
            && error.details.phase === 'startup'
    );

    releaseInit();
    await publicInit;
    await waitMs(20);

    assert.equal(collector.processManager.child, null);
    assert.equal(collector.processManager.activeRequest, null);
    assert.equal(collector.processManager.generation, 0);
    assert.equal(collector.initialized, false);
    assert.equal(collector.initContext, null);
});

test('collector does not restart after stop begins during the restart idle wait', async (t) => {
    let releaseIdleWait;
    const idleGate = new Promise((resolve) => {
        releaseIdleWait = resolve;
    });
    let idleWaitCalls = 0;
    let starts = 0;
    let stops = 0;
    let child = null;
    const processManager = {
        requestTimeoutMs: 1000,
        async start() {
            starts += 1;
            child = { generation: starts };
        },
        async request() {
            const error = new Error('worker exited');
            error.code = 'ANALYZER_PROCESS_EXIT';
            throw error;
        },
        async waitForIdle() {
            idleWaitCalls += 1;
            if (idleWaitCalls === 1) await idleGate;
        },
        async stop() {
            stops += 1;
            child = null;
        }
    };
    const collector = new CodexRolloutCollector({
        processManager,
        processRestartRetries: 1,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    t.after(async () => {
        await collector.stop();
    });

    const pending = collector.analyze(createAnalyzeRequest({
        requestId: 'restart-stop-race',
        jobId: 'restart-stop-race-job',
        conversationId: 'restart-stop-race-conversation',
        mode: 'preview'
    }));
    while (idleWaitCalls < 1) await waitMs(1);
    const stopping = collector.stop();
    releaseIdleWait();

    await assert.rejects(
        pending,
        (error) => error.code === 'ANALYZER_REQUEST_CANCELLED'
    );
    await stopping;
    assert.equal(starts, 1);
    assert.ok(stops >= 1);
    assert.equal(child, null);
    assert.equal(collector.runningIntent, null);
    assert.equal(collector.processManager.activeRequest, undefined);
});

test('collector bounds initial hello startup by the intent deadline', { timeout: 3000 }, async (t) => {
    let collector = null;
    let releaseExit = null;
    t.after(async () => {
        releaseExit?.();
        await collector?.stop();
    });
    let resolveIdle = null;
    let drained = false;
    const idlePromise = new Promise((resolve) => {
        resolveIdle = resolve;
    });
    const processManager = {
        requestTimeoutMs: 1000,
        startCount: 0,
        requestCount: 0,
        child: {},
        async start() {
            this.startCount += 1;
            if (this.startCount === 1) {
                return new Promise((resolve, reject) => {
                    releaseExit = () => {
                        if (drained) return;
                        drained = true;
                        this.child = null;
                        resolveIdle();
                        const error = new Error('synthetic analyzer exited after startup timeout');
                        error.code = 'ANALYZER_PROCESS_EXIT';
                        reject(error);
                    };
                });
            }
            this.child = {};
            return this;
        },
        request() {
            this.requestCount += 1;
            return Promise.resolve({
                status: 'completed',
                completeness: 'canonical',
                checkpoint: null
            });
        },
        waitForIdle() {
            return drained ? Promise.resolve() : idlePromise;
        },
        stop() {
            return this.waitForIdle();
        }
    };
    collector = new CodexRolloutCollector({
        processManager,
        requestTimeoutMs: 1000,
        processRestartRetries: 0,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });

    const timedOut = collector.analyze(createAnalyzeRequest({
        requestId: 'startup-deadline-request',
        jobId: 'startup-deadline-job',
        conversationId: 'startup-deadline-conversation',
        mode: 'preview'
    }), { timeoutMs: 30 });
    await assert.rejects(
        timedOut,
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
            && error.details.phase === 'startup'
    );

    // The public timeout is settled immediately, but the old generation is
    // still fenced until the child exit/drain evidence arrives.
    assert.notEqual(collector.runningIntent, null);
    const next = collector.analyze(createAnalyzeRequest({
        requestId: 'startup-deadline-next-request',
        jobId: 'startup-deadline-next-job',
        conversationId: 'startup-deadline-next-conversation',
        mode: 'preview'
    }));
    await waitMs(10);
    assert.equal(processManager.startCount, 1);
    assert.equal(processManager.requestCount, 0);
    assert.equal(collector.pendingIntents.size, 1);
    assert.notEqual(collector.runningIntent, null);

    releaseExit();
    const nextResult = await next;
    assert.equal(nextResult.complete.status, 'completed');
    assert.equal(processManager.startCount, 2);
    assert.equal(processManager.requestCount, 1);
    assert.equal(collector.runningIntent, null);
    assert.equal(collector.pendingIntents.size, 0);
});

test('collector bounds a delayed restart start by the intent deadline', async (t) => {
    let releaseRestart;
    let restartGate = new Promise((resolve) => {
        releaseRestart = resolve;
    });
    let starts = 0;
    let stops = 0;
    let stopped = false;
    let child = null;
    const processManager = {
        requestTimeoutMs: 1000,
        async start() {
            starts += 1;
            if (starts === 2) await restartGate;
            if (!stopped) child = { generation: starts };
        },
        async request() {
            const error = new Error('worker exited');
            error.code = 'ANALYZER_PROCESS_EXIT';
            throw error;
        },
        async waitForIdle() {},
        async stop() {
            stops += 1;
            stopped = true;
            child = null;
            releaseRestart();
        }
    };
    const collector = new CodexRolloutCollector({
        processManager,
        processRestartRetries: 1,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    t.after(async () => {
        await collector.stop();
    });

    await assert.rejects(
        collector.analyze(createAnalyzeRequest({
            requestId: 'restart-deadline-request',
            jobId: 'restart-deadline-job',
            conversationId: 'restart-deadline-conversation',
            mode: 'preview'
        }), { timeoutMs: 30 }),
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
            && error.details.phase === 'startup'
    );
    assert.equal(starts, 2);
    assert.ok(stops >= 1);
    assert.equal(child, null);
    assert.equal(collector.runningIntent, null);
    await restartGate;
});

test('collector enforces one total deadline across batch and complete phases', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-total-deadline-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_DELAY_MS: '10',
            FAKE_ANALYZER_COMPLETE_DELAY_MS: '200'
        },
        requestTimeoutMs: 1000,
        processRestartRetries: 0,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    const completeMessages = [];
    collector.processManager.on('message', (message) => {
        if (message.message_type === 'complete') completeMessages.push(message);
    });

    await collector.init();
    const startedAt = Date.now();
    await assert.rejects(
        collector.analyze(createAnalyzeRequest({
            requestId: 'total-deadline-request',
            jobId: 'total-deadline-job',
            conversationId: 'total-deadline-conversation',
            mode: 'preview'
        }), { timeoutMs: 100 }),
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
    );
    const elapsedMs = Date.now() - startedAt;
    assert.ok(elapsedMs < 300, `total deadline should settle promptly, elapsed=${elapsedMs}ms`);
    await collector.processManager.waitForIdle();
    await waitMs(220);

    assert.equal(completeMessages.length, 0);
    assert.equal(collector.processManager.activeRequest, null);
    assert.equal(collector.processManager.child, null);
    assert.equal(collector.processManager.tracker.size, 0);
    assert.equal(collector.runningIntent, null);
});

test('collector replaces a ready child whose stdin becomes unavailable before exit', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-nonrunning-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        requestTimeoutMs: 2000,
        processRestartRetries: 1,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    const attempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') {
            attempts.push({
                requestId: message.request_id,
                generation: collector.processManager.generation
            });
        }
    });

    await collector.init();
    const oldChild = collector.processManager.child;
    oldChild.stdin.destroy();
    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'nonrunning-retry-request',
        jobId: 'nonrunning-retry-job',
        conversationId: 'nonrunning-retry-conversation',
        mode: 'preview'
    }));

    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].generation, 2);
    assert.notEqual(attempts[0].requestId, 'nonrunning-retry-request');
    assert.notEqual(collector.processManager.child, oldChild);
    assert.equal(result.requestId, attempts[0].requestId);
    assert.equal(result.complete.message_type, 'complete');
    assert.equal(collector.processManager.activeRequest, null);
});

test('collector invalidates the current generation when batch ACK writing fails', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-collector-ack-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        requestTimeoutMs: 2000,
        processRestartRetries: 1,
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore()
    });
    const attempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') {
            attempts.push({
                requestId: message.request_id,
                generation: collector.processManager.generation,
                child: collector.processManager.child
            });
        }
    });

    await collector.init();
    const oldChild = collector.processManager.child;
    let patched = false;
    collector.processManager.on('message', (message) => {
        if (patched || message.message_type !== 'batch') return;
        patched = true;
        const originalWrite = oldChild.stdin.write.bind(oldChild.stdin);
        oldChild.stdin.write = (chunk, ...args) => {
            const outbound = JSON.parse(String(chunk));
            if (outbound.message_type === 'ack') {
                const error = new Error('simulated ACK pipe failure');
                error.code = 'EPIPE';
                throw error;
            }
            return originalWrite(chunk, ...args);
        };
    });

    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'ack-retry-request',
        jobId: 'ack-retry-job',
        conversationId: 'ack-retry-conversation',
        mode: 'preview'
    }));

    assert.equal(patched, true);
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].generation, 1);
    assert.equal(attempts[1].generation, 2);
    assert.notEqual(attempts[0].requestId, attempts[1].requestId);
    assert.equal(attempts[0].child, oldChild);
    assert.notEqual(attempts[1].child, oldChild);
    assert.equal(result.requestId, attempts[1].requestId);
    assert.equal(result.complete.message_type, 'complete');
    assert.equal(collector.processManager.activeRequest, null);
});

test('process manager force-terminates workers that ignore cancel or timeout', async (t) => {
    const scenarios = [
        {
            name: 'cancel',
            requestId: 'force-cancel-request',
            jobId: 'force-cancel-job',
            conversationId: 'force-cancel-conversation',
            expectedCode: 'ANALYZER_REQUEST_CANCELLED'
        },
        {
            name: 'timeout',
            requestId: 'force-timeout-request',
            jobId: 'force-timeout-job',
            conversationId: 'force-timeout-conversation',
            expectedCode: 'ANALYZER_REQUEST_TIMEOUT',
            timeoutMs: 30
        }
    ];

    for (const scenario of scenarios) {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `termlink-force-${scenario.name}-`));
        let manager = null;
        try {
            const codexHome = path.join(root, 'codex-home');
            await fs.promises.mkdir(codexHome);
            const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
            manager = new AnalyzerProcessManager({
                analyzerPath: process.execPath,
                args: [fixture],
                cwd: root,
                env: {
                    CODEX_HOME: codexHome,
                    FAKE_ANALYZER_IGNORE_CANCEL: '1',
                    FAKE_ANALYZER_BATCH_DELAY_MS: '300'
                },
                requestTimeoutMs: 1000,
                cancelGraceMs: 40
            });
            await manager.start();
            const request = createAnalyzeRequest({
                requestId: scenario.requestId,
                jobId: scenario.jobId,
                conversationId: scenario.conversationId,
                mode: 'preview'
            });
            const pending = manager.request(request, { timeoutMs: scenario.timeoutMs });
            const observed = pending.catch((error) => error);
            if (scenario.name === 'cancel') {
                await waitMs(20);
                assert.equal(manager.cancel(request.request_id, 'worker_ignores_cancel'), true);
            }
            const error = await observed;
            assert.equal(error.code, scenario.expectedCode);
            await Promise.race([
                manager.waitForIdle(),
                waitMs(1000).then(() => assert.fail(`${scenario.name} worker did not terminate`))
            ]);
            assert.equal(manager.activeRequest, null);
            assert.equal(manager.requests.size, 0);
            assert.equal(manager.tracker.size, 0);

            const next = await manager.request(createAnalyzeRequest({
                requestId: `${scenario.name}-after-termination`,
                jobId: `${scenario.name}-after-termination-job`,
                conversationId: `${scenario.name}-after-termination-conversation`,
                mode: 'preview'
            }));
            assert.equal(next.message_type, 'complete');
        } finally {
            await manager?.stop();
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }
});

test('process manager keeps a live worker fenced after nonfatal cancel or timeout error', async (t) => {
    const scenarios = [
        {
            name: 'cancel',
            requestId: 'nonfatal-cancel-request',
            jobId: 'nonfatal-cancel-job',
            conversationId: 'nonfatal-cancel-conversation',
            timeoutMs: 1000,
            expectedCode: 'ANALYZER_REQUEST_CANCELLED'
        },
        {
            name: 'timeout',
            requestId: 'nonfatal-timeout-request',
            jobId: 'nonfatal-timeout-job',
            conversationId: 'nonfatal-timeout-conversation',
            timeoutMs: 40,
            expectedCode: 'ANALYZER_REQUEST_TIMEOUT'
        }
    ];

    for (const scenario of scenarios) {
        const root = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), `termlink-nonfatal-${scenario.name}-`)
        );
        let manager = null;
        try {
            const codexHome = path.join(root, 'codex-home');
            await fs.promises.mkdir(codexHome);
            const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
            manager = new AnalyzerProcessManager({
                analyzerPath: process.execPath,
                args: [fixture],
                cwd: root,
                env: {
                    CODEX_HOME: codexHome,
                    FAKE_ANALYZER_BATCH_DELAY_MS: '300'
                },
                requestTimeoutMs: 1000,
                cancelGraceMs: 500
            });
            await manager.start();
            const request = createAnalyzeRequest({
                requestId: scenario.requestId,
                jobId: scenario.jobId,
                conversationId: scenario.conversationId,
                mode: 'preview'
            });
            const pending = manager.request(request, { timeoutMs: scenario.timeoutMs });
            const observed = pending.catch((error) => error);
            while (!manager.activeRequest) await waitMs(1);

            if (scenario.name === 'cancel') {
                assert.equal(manager.cancel(request.request_id, 'nonfatal-cancel'), true);
            }
            const error = await observed;
            assert.equal(error.code, scenario.expectedCode);
            await waitMs(20);

            assert.equal(manager.activeRequest.requestId, request.request_id);
            assert.equal(manager.requests.has(request.request_id), true);
            assert.equal(manager.tracker.get(request.request_id).termination_waiting, true);
            assert.equal(manager.child.exitCode, null);
            await assert.rejects(
                () => manager.request(createAnalyzeRequest({
                    requestId: `${scenario.name}-while-live`,
                    jobId: `${scenario.name}-while-live-job`,
                    conversationId: `${scenario.name}-while-live-conversation`,
                    mode: 'preview'
                })),
                (nextError) => nextError.code === 'ANALYZER_REQUEST_ACTIVE'
            );

            manager.child.kill();
            await Promise.race([
                manager.waitForIdle(),
                waitMs(1000).then(() => assert.fail(`${scenario.name} worker did not exit`))
            ]);
            assert.equal(manager.activeRequest, null);
            assert.equal(manager.tracker.size, 0);
        } finally {
            await manager?.stop();
            await fs.promises.rm(root, { recursive: true, force: true });
        }
    }
});

test('target batch keeps delivery identity outside the payload', () => {
    const message = targetBatch();
    assert.equal(validateMessage(message), message);
    assert.equal(isCanonicalBatch(message), true);
    const parsed = parseLine(encodeMessage(message));
    assert.deepEqual(parsed.payload, message.payload);
    assert.equal('job_id' in parsed.payload, false);
    assert.equal('segment_id' in parsed.payload, false);
    assert.equal('batch_id' in parsed.payload, false);
    const additive = structuredClone(message);
    additive.payload.source_fingerprint = { legacy: true };
    additive.payload.source_prefix_anchor = { legacy: true };
    additive.payload.nested_legacy = { replay: true };
    assert.equal(validateMessage(additive), additive);
    assert.throws(
        () => validateMessage({
            ...message,
            payload: {
                ...message.payload,
                job_id: 'wrong-place'
            }
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
});

test('target batch validates Rust event variants and batch evidence fields', () => {
    const valid = targetBatch();
    valid.payload.history_items = [targetHistoryEvent()];
    valid.payload.diagnostics = [{
        code: 'source_gap',
        message: null,
        source_ref: null,
        availability: 'partial_rollout'
    }];
    valid.payload.tool_details = [{
        item_key: 'tool-item-1',
        call_id: 'call-1',
        tool_kind: 'command',
        input: null,
        output: null,
        completeness: 'canonical',
        source_epoch: 'epoch-1'
    }];
    assert.equal(validateMessage(valid), valid);

    const invalidCases = [
        {
            name: 'unknown analysis event variant',
            mutate: (message) => { message.payload.history_items[0].event_type = 'FutureEvent'; }
        },
        {
            name: 'missing analysis event variant field',
            mutate: (message) => { delete message.payload.history_items[0].payload.text; }
        },
        {
            name: 'missing diagnostic source_ref key',
            mutate: (message) => { delete message.payload.diagnostics[0].source_ref; }
        },
        {
            name: 'invalid diagnostic availability',
            mutate: (message) => { message.payload.diagnostics[0].availability = 'unknown'; }
        },
        {
            name: 'missing tool completeness',
            mutate: (message) => { delete message.payload.tool_details[0].completeness; }
        },
        {
            name: 'missing tool source epoch',
            mutate: (message) => { delete message.payload.tool_details[0].source_epoch; }
        },
        {
            name: 'invalid batch parser profile',
            mutate: (message) => {
                message.payload.parser_provenance.compatibility_profile = {
                    profile_id: 'future',
                    profile_version: '1',
                    features: []
                };
            }
        }
    ];
    for (const { name, mutate } of invalidCases) {
        const invalid = structuredClone(valid);
        mutate(invalid);
        assert.throws(
            () => validateMessage(invalid),
            (error) => error instanceof AnalyzerProtocolError,
            name + ' must fail closed'
        );
    }
});

test('target batch requires complete lineage evidence when history_base is present', () => {
    const historyBase = {
        parent_rollout_id: 'parent-rollout',
        end_ordinal_exclusive: 1,
        end_byte_offset: 10
    };
    const incomplete = targetBatch();
    incomplete.payload.history_base = historyBase;
    assert.throws(
        () => validateMessage(incomplete),
        (error) => error instanceof AnalyzerProtocolError
            && error.code === 'invalid_field'
            && error.details.field === 'payload.lineage_transitions'
    );

    const complete = targetBatch();
    complete.payload.history_base = historyBase;
    complete.payload.lineage_transitions = [{
        parent_rollout_id: 'parent-rollout',
        child_rollout_id: 'rollout.jsonl',
        history_base: historyBase,
        validation_state: 'validated'
    }];
    complete.payload.lineage_coverage = {
        root_rollout_id: 'parent-rollout',
        active_head_rollout_id: 'rollout.jsonl',
        chain_rollout_ids: ['parent-rollout', 'rollout.jsonl'],
        covered_source_count: 2,
        complete: true
    };
    assert.equal(validateMessage(complete), complete);
});

test('target lineage accepts multiple transitions and binds coverage/checkpoint evidence', () => {
    const rootHistoryBase = {
        parent_rollout_id: 'root-rollout',
        end_ordinal_exclusive: 3,
        end_byte_offset: 30
    };
    const activeHistoryBase = {
        parent_rollout_id: 'middle-rollout',
        end_ordinal_exclusive: 7,
        end_byte_offset: 70
    };
    const coverage = {
        root_rollout_id: 'root-rollout',
        active_head_rollout_id: 'rollout.jsonl',
        chain_rollout_ids: ['root-rollout', 'middle-rollout', 'rollout.jsonl'],
        covered_source_count: 3,
        complete: true
    };
    const message = targetBatch();
    message.payload.history_base = activeHistoryBase;
    message.payload.lineage_transitions = [
        {
            parent_rollout_id: 'root-rollout',
            child_rollout_id: 'middle-rollout',
            history_base: rootHistoryBase,
            validation_state: 'validated'
        },
        {
            parent_rollout_id: 'middle-rollout',
            child_rollout_id: 'rollout.jsonl',
            history_base: activeHistoryBase,
            validation_state: 'validated'
        }
    ];
    message.payload.lineage_coverage = coverage;
    assert.equal(validateMessage(message), message);

    const checkpointed = structuredClone(message);
    checkpointed.payload.lineage_checkpoint = {
        schema_version: 1,
        conversation_id: 'conversation-1',
        root_rollout_id: coverage.root_rollout_id,
        active_head_rollout_id: coverage.active_head_rollout_id,
        chain_rollout_ids: [...coverage.chain_rollout_ids],
        start_date: null,
        end_date: null,
        coverage: structuredClone(coverage)
    };
    assert.equal(validateMessage(checkpointed), checkpointed);

    const invalidCases = [
        {
            name: 'batch history base is not represented by any transition',
            mutate: (candidate) => {
                candidate.payload.history_base = {
                    ...candidate.payload.history_base,
                    end_byte_offset: candidate.payload.history_base.end_byte_offset + 1
                };
            }
        },
        {
            name: 'transition history base parent mismatch',
            mutate: (candidate) => {
                candidate.payload.lineage_transitions[0].history_base.parent_rollout_id = 'wrong-parent';
            }
        },
        {
            name: 'coverage misses root',
            mutate: (candidate) => { candidate.payload.lineage_coverage.root_rollout_id = 'missing-root'; }
        },
        {
            name: 'coverage has no covered source',
            mutate: (candidate) => { candidate.payload.lineage_coverage.covered_source_count = 0; }
        },
        {
            name: 'checkpoint coverage differs from batch coverage',
            mutate: (candidate) => {
                candidate.payload.lineage_checkpoint.coverage.covered_source_count = 2;
            }
        }
    ];
    for (const { name, mutate } of invalidCases) {
        const invalid = structuredClone(checkpointed);
        mutate(invalid);
        assert.throws(
            () => validateMessage(invalid),
            (error) => error instanceof AnalyzerProtocolError,
            name + ' must fail closed'
        );
    }
});

test('target replacement evidence binds to exactly one matching lineage transition', () => {
    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const message = targetBatch({ sourceId: 'child-rollout' });
    message.payload.history_base = structuredClone(fact.cut);
    message.payload.lineage_transitions = [{
        parent_rollout_id: 'parent-rollout',
        child_rollout_id: 'child-rollout',
        history_base: structuredClone(fact.cut),
        validation_state: 'validated'
    }];
    message.payload.lineage_coverage = {
        root_rollout_id: 'parent-rollout',
        active_head_rollout_id: 'child-rollout',
        chain_rollout_ids: ['parent-rollout', 'child-rollout'],
        covered_source_count: 2,
        complete: true
    };
    message.payload.replacements = [structuredClone(fact)];
    message.payload.mutations.push({
        mutation: 'replace_last_turn',
        replacement: structuredClone(fact)
    });
    assert.equal(validateMessage(message), message);

    const invalid = structuredClone(message);
    shiftReplacementCut(invalid.payload.replacements[0]);
    assert.throws(
        () => validateMessage(invalid),
        (error) => error instanceof AnalyzerProtocolError
    );
    const duplicateMutation = structuredClone(message);
    duplicateMutation.payload.mutations.push({
        mutation: 'replace_last_turn',
        replacement: structuredClone(fact)
    });
    assert.throws(
        () => validateMessage(duplicateMutation),
        (error) => error instanceof AnalyzerProtocolError
    );
});

test('target cursor kind requires its declared capability', () => {
    const capabilityByKind = {
        tail_preview: 'tail_preview',
        backfill: 'backward_segments',
        forward_append: 'append'
    };
    for (const [cursorKind, capability] of Object.entries(capabilityByKind)) {
        const invalid = targetBatch();
        invalid.payload.next_cursor = targetCursor({ cursorKind });
        invalid.payload.next_cursor.capabilities[capability] = false;
        assert.throws(
            () => validateMessage(invalid),
            (error) => error instanceof AnalyzerProtocolError,
            cursorKind + ' without ' + capability + ' must fail closed'
        );
    }
    const valid = targetBatch();
    assert.equal(validateMessage(valid), valid);
});

test('target complete validates checkpoint and cursor consistency', () => {
    const complete = targetComplete();
    assert.equal(validateMessage(complete), complete);
    assert.equal(parseLine(encodeMessage(complete)).checkpoint.job_id, 'job-1');
    const inboundLegacy = structuredClone(complete);
    inboundLegacy.status = 'ok';
    assert.equal(validateMessage(inboundLegacy), inboundLegacy);
    assert.equal(parseLine(JSON.stringify(inboundLegacy)).status, 'ok');
    assert.throws(
        () => encodeMessage(inboundLegacy),
        (error) => error instanceof AnalyzerProtocolError
            && error.code === 'invalid_field'
            && error.details.field === 'status'
    );
    const mismatched = structuredClone(complete);
    mismatched.checkpoint.request_id = 'other-request';
    assert.throws(
        () => validateMessage(mismatched),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
    const invalidCombination = structuredClone(complete);
    invalidCombination.status = 'partial';
    assert.throws(
        () => validateMessage(invalidCombination),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
});

test('target ACK requires job, segment, batch and stable settlement pairs', () => {
    const ack = createAck({
        requestId: 'ack-1',
        jobId: 'job-1',
        segmentId: 'segment-1',
        batchId: 'batch-1'
    });
    assert.equal(validateMessage(ack), ack);
    assert.throws(
        () => createAck({
            requestId: 'ack-1',
            jobId: 'job-1',
            segmentId: 'segment-1',
            batchId: 'batch-1',
            accepted: false,
            persisted: false
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
    assert.throws(
        () => createAck({
            requestId: 'ack-1',
            jobId: 'job-1',
            segmentId: 'segment-1',
            batchId: 'batch-1',
            accepted: true,
            persisted: false
        }),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );
});

test('target batch importer validates and durably stages the outer delivery identity', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const message = targetBatch({
        requestId: 'request-stage',
        jobId: 'job-stage',
        segmentId: 'segment-stage',
        batchId: 'batch-stage'
    });
    message.payload.history_items = [targetHistoryEvent({
        sourceId: 'rollout.jsonl',
        itemKey: 'history-stage',
        eventId: 'event-stage'
    })];
    message.payload.tool_details = [{
        item_key: 'tool-stage',
        call_id: 'call-stage',
        tool_kind: 'command',
        input: 'input',
        output: 'output',
        completeness: 'canonical',
        source_epoch: 'epoch-1'
    }];
    message.payload.usage = {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15
    };
    message.payload.task_outcomes = [{
        item_key: 'history-stage',
        status: 'completed',
        message: null,
        source_epoch: 'epoch-1',
        completeness: 'canonical'
    }];
    message.payload.diagnostics = [{
        code: 'source_note',
        message: null,
        source_ref: null,
        availability: 'present'
    }];

    const result = await importer.importBatch(message);
    assert.equal(result.accepted, true);
    assert.equal(result.persisted, true);
    assert.equal(result.duplicate, false);
    assert.equal(result.delivery.job_id, 'job-stage');
    assert.equal(result.delivery.segment_id, 'segment-stage');
    assert.equal(result.delivery.batch_id, 'batch-stage');
    assert.equal(result.delivery.request_id, 'request-stage');
    assert.equal(result.receipt.persisted, true);
    assert.equal(result.receipt.status, 'staged');
    assert.equal(result.staging.persisted, true);
    assert.equal(result.state.receipts.length, 1);
    assert.equal(result.state.staging.length, 1);
    assert.equal(result.state.items[0].item_key, 'history-stage');
    assert.equal(result.state.tool_details[0].call_id, 'call-stage');
    assert.equal(result.state.task_outcomes[0].status, 'completed');
    assert.equal(result.state.usage.total_tokens, 15);
    assert.equal(result.state.diagnostics[0].diagnostic.code, 'source_note');
    assert.equal(result.state.mutations[0].mutation.mutation, 'complete_range');
    assert.equal('revision' in result.state.items[0], false);
    assert.equal('revision' in result.state.receipts[0], false);
    // The importer only returns the persisted staging result. ACK emission is
    // a coordinator responsibility and must not happen at this boundary.
    assert.equal('ack' in result, false);
});

test('target complete binds its checkpoint watermark to the latest accepted delivery', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-complete-watermark-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    const scope = {
        conversationId: 'conversation-watermark',
        sourceId: 'rollout-watermark.jsonl',
        sourceEpoch: 'epoch-watermark'
    };

    for (const store of stores) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        const first = targetBatch({
            requestId: 'request-watermark',
            jobId: 'job-watermark',
            segmentId: 'segment-watermark-1',
            batchId: 'batch-watermark-1',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch
        });
        const second = targetBatch({
            requestId: first.request_id,
            jobId: first.job_id,
            segmentId: 'segment-watermark-2',
            batchId: 'batch-watermark-2',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch
        });
        await importer.importBatch(first);
        await importer.importBatch(second);

        const completeFor = (message) => {
            const complete = targetComplete({
                requestId: message.request_id,
                jobId: message.job_id
            });
            complete.checkpoint.conversation_id = scope.conversationId;
            complete.checkpoint.source.source_id = scope.sourceId;
            complete.checkpoint.source.source_epoch = scope.sourceEpoch;
            complete.checkpoint.cursor.conversation_id = scope.conversationId;
            complete.checkpoint.cursor.source_id = scope.sourceId;
            complete.checkpoint.cursor.source_epoch = scope.sourceEpoch;
            complete.checkpoint.projection_watermark.segment_id = message.segment_id;
            complete.checkpoint.projection_watermark.batch_id = message.batch_id;
            complete.checkpoint.projection_watermark.source_id = scope.sourceId;
            complete.checkpoint.projection_watermark.source_epoch = scope.sourceEpoch;
            return complete;
        };

        await assert.rejects(
            () => importer.commitComplete(completeFor(first), { scope }),
            (error) => error.code === 'ANALYSIS_COMPLETE_DELIVERY_MISMATCH'
        );

        const state = await importer.commitComplete(completeFor(second), {
            scope,
            acceptedDelivery: {
                request_id: second.request_id,
                job_id: second.job_id,
                segment_id: second.segment_id,
                batch_id: second.batch_id,
                scope
            }
        });
        assert.equal(state.complete, true);
        assert.deepEqual(state.last_delivery, {
            request_id: second.request_id,
            job_id: second.job_id,
            segment_id: second.segment_id,
            batch_id: second.batch_id,
            scope: {
                conversation_id: scope.conversationId,
                source_id: scope.sourceId,
                source_epoch: scope.sourceEpoch
            }
        });
    }
});

test('complete checkpoint must match the durable ACKed batch evidence after restart', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-complete-evidence-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const cases = [
        ['range', (message) => {
            resizeTargetCheckpoint(message.checkpoint, 1000);
            message.next_cursor = message.checkpoint.cursor;
        }],
        ['completeness', () => {}],
        ['reducer', (message) => { message.checkpoint.reducer_state.payload = { forged: true }; }],
        ['provenance', (message) => { message.checkpoint.wire_profile.wire_source_revision = 'other-wire'; }]
    ];
    for (const storage of ['memory', 'file']) {
        for (const [name, tamper] of cases) {
            await t.test(`${storage}: rejects mismatched ${name}`, async () => {
                const dir = path.join(root, storage, name);
                let store = storage === 'file'
                    ? new FileAnalysisStore({ rootDir: path.join(dir, 'analysis') })
                    : new MemoryAnalysisStore();
                const checkpoints = storage === 'file'
                    ? new FileCheckpointStore({ rootDir: path.join(dir, 'checkpoints') })
                    : new MemoryCheckpointStore();
                let importer = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
                const batch = targetBatch({
                    requestId: 'request-evidence',
                    completeness: name === 'completeness' ? 'partial' : 'canonical'
                });
                const imported = await importer.importBatch(batch);
                if (storage === 'file') {
                    store = new FileAnalysisStore({ rootDir: path.join(dir, 'analysis') });
                    importer = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
                }
                const before = await store.snapshot(imported.scope);
                const forged = targetComplete({ requestId: batch.request_id });
                tamper(forged);
                await assert.rejects(() => importer.commitComplete(forged, {
                    scope: imported.scope, acceptedDelivery: imported.delivery
                }), (error) => error.code.startsWith('ANALYSIS_CHECKPOINT_'));
                assert.equal(await checkpoints.load(imported.scope), null);
                assert.deepEqual(await store.snapshot(imported.scope), before);
                const valid = targetComplete({
                    requestId: batch.request_id, completeness: batch.payload.completeness
                });
                await importer.commitComplete(valid, {
                    scope: imported.scope, acceptedDelivery: imported.delivery
                });
                assert.equal((await checkpoints.load(imported.scope)).completeness, batch.payload.completeness);
            });
        }
    }
});

test('recovery delivery comes from the latest verified durable batch, not request or file order', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-recovery-receipt-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    for (const storage of ['memory', 'file']) {
        let store = storage === 'file'
            ? new FileAnalysisStore({ rootDir: path.join(root, storage) })
            : new MemoryAnalysisStore();
        await store.init();
        const identity = { job_id: 'job-1', conversation_id: 'conversation-1' };
        assert.equal(await store.getRecoveryDelivery(identity), null);
        await store.applyBatch(targetBatch());
        const latest = targetBatch({ segmentId: 'opaque-segment', batchId: 'opaque-batch' });
        await store.applyBatch(latest);
        if (storage === 'file') store = await new FileAnalysisStore({ rootDir: path.join(root, storage) }).init();
        const recovered = await store.getRecoveryDelivery(identity);
        assert.equal(recovered.segment_id, 'opaque-segment');
        assert.equal(recovered.batch_id, 'opaque-batch');
        assert.equal(recovered.request_id, latest.request_id);
        assert.ok(recovered.scope_digest);
        await assert.rejects(() => store.getRecoveryDelivery({ ...identity, conversation_id: 'wrong' }));
        await store.applyBatch(targetBatch({ jobId: 'newer-job' }));
        await assert.rejects(() => store.getRecoveryDelivery(identity),
            (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT');
    }
});

test('file recovery fails closed on unreadable or corrupt durable analysis evidence', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-corrupt-recovery-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const identity = { job_id: 'job-1', conversation_id: 'conversation-1' };
    for (const corruption of [
        'invalid-json', 'invalid-scope', 'payload-conflict', 'receipt-identity',
        'staging-identity', 'receipt-scope', 'staging-scope', 'receipt-hash', 'receipt-not-persisted'
    ]) {
        const directory = path.join(root, corruption);
        const store = await new FileAnalysisStore({ rootDir: directory }).init();
        const batch = targetBatch();
        await store.applyBatch(batch);
        const file = store.pathFor(batch.payload);
        const persisted = JSON.parse(await fs.promises.readFile(file, 'utf8'));
        if (corruption === 'invalid-scope') persisted.scope = {};
        if (corruption === 'payload-conflict') persisted.staging[0].payload.progress.records_seen += 1;
        if (corruption === 'receipt-identity') persisted.receipts[0].segment_id = 'forged-segment';
        if (corruption === 'staging-identity') persisted.staging[0].segment_id = 'forged-segment';
        if (corruption === 'receipt-scope') persisted.receipts[0].scope.conversation_id = 'wrong';
        if (corruption === 'staging-scope') persisted.staging[0].scope.conversation_id = 'wrong';
        if (corruption === 'receipt-hash') persisted.receipts[0].content_hash = 'forged-hash';
        if (corruption === 'receipt-not-persisted') persisted.receipts[0].persisted = false;
        await fs.promises.writeFile(file, corruption === 'invalid-json' ? '{' : JSON.stringify(persisted));
        const reopened = await new FileAnalysisStore({ rootDir: directory }).init();
        await assert.rejects(() => reopened.getRecoveryDelivery(identity),
            (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT');
        const checkpoints = new MemoryCheckpointStore();
        const importer = new AnalysisBatchImporter({ store: reopened, checkpointStore: checkpoints });
        await assert.rejects(() => importer.commitComplete(targetComplete({ requestId: batch.request_id }), {
            scope: batch.payload
        }));
        assert.equal(await checkpoints.load(batch.payload), null);
    }
});

test('opaque Rust reducer payload round-trips unchanged through staging and complete', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-opaque-reducer-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    for (const storage of ['memory', 'file']) {
        let store = storage === 'file'
            ? new FileAnalysisStore({ rootDir: root }) : new MemoryAnalysisStore();
        const checkpoints = new MemoryCheckpointStore();
        let importer = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
        const batch = targetBatch();
        const opaque = { revision: 7, private_state: { replay: true, revision: 3 } };
        batch.payload.reducer_state.payload = opaque;
        const imported = await importer.importBatch(batch);
        if (storage === 'file') {
            store = new FileAnalysisStore({ rootDir: root });
            importer = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
        }
        const complete = targetComplete({ requestId: batch.request_id });
        complete.checkpoint.reducer_state.payload = structuredClone(opaque);
        await importer.commitComplete(complete, { scope: imported.scope, acceptedDelivery: imported.delivery });
        assert.deepEqual((await checkpoints.load(imported.scope)).reducer_state.payload, opaque);
        assert.deepEqual((await store.snapshot(imported.scope)).staging[0].payload.reducer_state.payload, opaque);
    }
});

test('target batch importer excludes nested generic revisions from semantic and durable payloads', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-revision-boundary-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    const createMessage = (revision, requestId) => {
        const message = targetBatch({
            requestId,
            jobId: 'job-nested-revision',
            segmentId: 'segment-nested-revision',
            batchId: 'batch-nested-revision'
        });
        message.payload.history_items = [targetHistoryEvent({
            itemKey: 'nested-revision-item',
            eventId: 'nested-revision-event'
        })];
        message.payload.history_items[0].payload.metadata.revision = revision;
        message.payload.tool_details = [{
            item_key: 'nested-revision-tool',
            call_id: 'nested-revision-call',
            tool_kind: 'command',
            input: 'input',
            output: 'output',
            revision,
            completeness: 'canonical',
            source_epoch: 'epoch-1'
        }];
        message.payload.task_outcomes = [{
            item_key: 'nested-revision-item',
            status: 'completed',
            message: null,
            revision,
            source_epoch: 'epoch-1',
            completeness: 'canonical'
        }];
        message.payload.projection.revision = revision;
        message.payload.projection.metadata = { revision };
        const itemMutation = targetItemMutation({
            itemKey: 'nested-revision-item',
            sourceId: 'rollout.jsonl',
            sourceEpoch: 'epoch-1',
            completeness: 'canonical'
        });
        itemMutation.item.content_hash = 'stable-nested-revision-content';
        itemMutation.item.revision = revision;
        itemMutation.item.source_ref.revision = revision;
        message.payload.mutations = [
            itemMutation,
            { mutation: 'complete_range', source_range: { start: 0, end: 10 } }
        ];
        return message;
    };

    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    for (const initialStore of stores) {
        const firstImporter = await new AnalysisBatchImporter({ store: initialStore }).init();
        const original = createMessage(1, 'request-nested-revision-1');
        assert.equal(validateMessage(original), original);
        const first = await firstImporter.importBatch(original);

        const activeStore = initialStore instanceof FileAnalysisStore
            ? await new FileAnalysisStore({ rootDir: root }).init()
            : initialStore;
        const retryImporter = await new AnalysisBatchImporter({ store: activeStore }).init();
        const duplicate = await retryImporter.importBatch(
            createMessage(2, 'request-nested-revision-2')
        );
        assert.equal(duplicate.duplicate, true);
        assert.equal(duplicate.receipt.content_hash, first.receipt.content_hash);
        assert.deepEqual(duplicate.receipt.request_ids, [
            'request-nested-revision-1',
            'request-nested-revision-2'
        ]);

        const state = await activeStore.snapshot({
            conversationId: 'conversation-1',
            sourceId: 'rollout.jsonl',
            sourceEpoch: 'epoch-1'
        });
        assert.equal(hasOwnKeyDeep(state, 'revision'), false);
        assert.equal(
            state.staging[0].payload.parser_provenance.wire_source_revision,
            'test-wire'
        );
        assert.equal(state.staging[0].payload.parser_provenance.revision, undefined);
    }
});

test('target batch importer recovers File staging receipts without replaying the batch', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-import-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const message = targetBatch({
        requestId: 'request-file-stage',
        jobId: 'job-file-stage',
        segmentId: 'segment-file-stage',
        batchId: 'batch-file-stage'
    });
    const firstStore = await new FileAnalysisStore({ rootDir: root }).init();
    const firstImporter = await new AnalysisBatchImporter({ store: firstStore }).init();
    const first = await firstImporter.importBatch(message);
    assert.equal(first.duplicate, false);
    assert.equal(first.state.receipts.length, 1);

    const restartedStore = await new FileAnalysisStore({ rootDir: root }).init();
    const restartedImporter = await new AnalysisBatchImporter({ store: restartedStore }).init();
    const duplicate = await restartedImporter.importBatch(structuredClone(message));
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.state.receipts.length, 1);
    assert.equal(duplicate.state.staging.length, 1);
    assert.equal(duplicate.state.range_index[0].index, 0);

    const conflict = structuredClone(message);
    conflict.payload.progress.bytes_scanned = 9;
    await assert.rejects(
        () => restartedImporter.importBatch(conflict),
        (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
    );
    assert.equal((await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    })).receipts.length, 1);
});

test('target File importer serializes concurrent receipts and reindexes staging ranges', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-import-concurrent-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const store = await new FileAnalysisStore({ rootDir: root }).init();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const later = targetBatch({
        requestId: 'request-concurrent-later',
        jobId: 'job-concurrent',
        segmentId: 'segment-concurrent',
        batchId: 'batch-concurrent-later'
    });
    setTargetBatchRange(later, 10, 20);
    const earlier = targetBatch({
        requestId: 'request-concurrent-earlier',
        jobId: 'job-concurrent',
        segmentId: 'segment-concurrent',
        batchId: 'batch-concurrent-earlier'
    });
    const results = await Promise.all([
        importer.importBatch(later),
        importer.importBatch(earlier)
    ]);

    assert.deepEqual(results.map((result) => result.duplicate), [false, false]);
    const state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.receipts.length, 2);
    assert.equal(state.staging.length, 2);
    assert.deepEqual(
        state.range_index.map((entry) => [entry.index, entry.batch_id, entry.source_range]),
        [
            [0, 'batch-concurrent-earlier', { start: 0, end: 10 }],
            [1, 'batch-concurrent-later', { start: 10, end: 20 }]
        ]
    );
    assert.deepEqual(
        state.staging
            .map((entry) => [entry.batch_id, entry.range_index])
            .sort((left, right) => left[0].localeCompare(right[0])),
        [
            ['batch-concurrent-earlier', 0],
            ['batch-concurrent-later', 1]
        ]
    );

    const restarted = await new FileAnalysisStore({ rootDir: root }).init();
    const restartedState = await restarted.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(restartedState.receipts.length, 2);
    assert.deepEqual(
        restartedState.staging
            .map((entry) => [entry.batch_id, entry.range_index])
            .sort((left, right) => left[0].localeCompare(right[0])),
        [
            ['batch-concurrent-earlier', 0],
            ['batch-concurrent-later', 1]
        ]
    );
});

test('target batch importer keeps range index deterministic and deduplicates overlap', async () => {
    const importer = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    const first = targetBatch({
        requestId: 'request-range',
        jobId: 'job-range',
        segmentId: 'segment-range',
        batchId: 'batch-range-a'
    });
    first.payload.history_items = [targetHistoryEvent({
        sourceId: 'rollout.jsonl',
        itemKey: 'overlap-item',
        eventId: 'overlap-event'
    })];
    const second = targetBatch({
        requestId: 'request-range',
        jobId: 'job-range',
        segmentId: 'segment-range',
        batchId: 'batch-range-b'
    });
    setTargetBatchRange(second, 10, 20);

    await importer.importBatch(first);
    const secondResult = await importer.importBatch(second);
    const duplicate = await importer.importBatch(structuredClone(first));
    const state = await importer.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });

    assert.equal(secondResult.duplicate, false);
    assert.equal(duplicate.duplicate, true);
    assert.equal(state.receipts.length, 2);
    assert.equal(state.staging.length, 2);
    assert.equal(state.range_index.length, 2);
    assert.deepEqual(
        state.range_index.map((entry) => [entry.index, entry.batch_id, entry.source_range]),
        [
            [0, 'batch-range-a', { start: 0, end: 10 }],
            [1, 'batch-range-b', { start: 10, end: 20 }]
        ]
    );
    assert.equal(state.items.length, 1);
    assert.equal(state.mutations.length, 2);
    assert.equal(state.receipts[0].request_ids.length, 1);
});

test('target batch importer treats retry request changes as idempotent but keeps job scope strict', async () => {
    const importer = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    const original = targetBatch({
        requestId: 'request-original',
        jobId: 'job-identity',
        segmentId: 'segment-identity',
        batchId: 'batch-identity'
    });
    await importer.importBatch(original);

    const retry = structuredClone(original);
    retry.request_id = 'request-retry';
    const retryResult = await importer.importBatch(retry);
    assert.equal(retryResult.duplicate, true);
    assert.deepEqual(retryResult.receipt.request_ids, [
        'request-original',
        'request-retry'
    ]);
    assert.equal(retryResult.state.receipts.length, 1);
    assert.equal(retryResult.state.staging.length, 1);

    const otherJob = structuredClone(original);
    otherJob.job_id = 'job-other';
    const otherJobResult = await importer.importBatch(otherJob);
    assert.equal(otherJobResult.duplicate, false);
    assert.equal(otherJobResult.state.receipts.length, 2);

    const expectedMismatch = structuredClone(original);
    expectedMismatch.request_id = 'request-invalid';
    await assert.rejects(
        () => importer.importBatch(expectedMismatch, {
            expected: { request_id: 'request-not-current' }
        }),
        (error) => error.code === 'ANALYSIS_BATCH_IDENTITY_MISMATCH'
    );
});

test('target batch importer rejects delivery content and scope conflicts before staging', async () => {
    const importer = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    const original = targetBatch({
        requestId: 'request-conflict',
        jobId: 'job-conflict',
        segmentId: 'segment-conflict',
        batchId: 'batch-conflict'
    });
    await importer.importBatch(original);
    const before = await importer.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });

    const differentContent = structuredClone(original);
    differentContent.payload.progress.bytes_scanned = 9;
    await assert.rejects(
        () => importer.importBatch(differentContent),
        (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
            && error.rejection_code === 'batch_scope_conflict'
    );
    assert.deepEqual(await importer.store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    }), before);

    const differentScope = structuredClone(original);
    differentScope.payload.conversation_id = 'conversation-other';
    differentScope.payload.projection.conversation_id = 'conversation-other';
    differentScope.payload.next_cursor.conversation_id = 'conversation-other';
    await assert.rejects(
        () => importer.importBatch(differentScope),
        (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
    );
    assert.equal((await importer.store.snapshot({
        conversationId: 'conversation-other',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    })).receipts.length, 0);
});

test('target batch importer promotes partial to canonical without a late downgrade', async () => {
    const importer = await new AnalysisBatchImporter({
        store: new MemoryAnalysisStore()
    }).init();
    const partial = targetBatch({
        requestId: 'request-partial',
        jobId: 'job-partial',
        segmentId: 'segment-partial',
        batchId: 'batch-partial',
        completeness: 'partial'
    });
    partial.payload.history_items = [targetHistoryEvent({
        sourceId: 'rollout.jsonl',
        itemKey: 'partial-item',
        eventId: 'partial-event'
    })];
    await importer.importBatch(partial);

    const canonical = targetBatch({
        requestId: 'request-canonical',
        jobId: 'job-partial',
        segmentId: 'segment-partial',
        batchId: 'batch-canonical',
        completeness: 'canonical'
    });
    canonical.payload.history_items = [targetHistoryEvent({
        sourceId: 'rollout.jsonl',
        itemKey: 'partial-item',
        eventId: 'partial-event'
    })];
    await importer.importBatch(canonical);

    const latePartial = targetBatch({
        requestId: 'request-late',
        jobId: 'job-partial',
        segmentId: 'segment-partial',
        batchId: 'batch-late',
        completeness: 'partial'
    });
    latePartial.payload.history_items = [targetHistoryEvent({
        sourceId: 'rollout.jsonl',
        itemKey: 'partial-item',
        eventId: 'partial-event'
    })];
    const result = await importer.importBatch(latePartial);

    assert.equal(result.state.canonical, true);
    assert.equal(result.state.complete, true);
    assert.equal(result.state.provisional, false);
    assert.equal(result.state.items.length, 1);
    assert.equal(result.state.items[0].completeness, 'canonical');
    assert.equal(result.state.receipts.length, 3);
});

test('target batch importer validates checkpoint evidence before any receipt is written', async () => {
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const importer = await new AnalysisBatchImporter({ store, checkpointStore }).init();
    const message = targetBatch({
        requestId: 'request-checkpoint',
        jobId: 'job-checkpoint',
        segmentId: 'segment-1',
        batchId: 'batch-1'
    });
    const validCheckpoint = targetCheckpoint({
        jobId: 'job-checkpoint',
        requestId: 'request-checkpoint'
    });
    const result = await importer.importBatch(message, { checkpoint: validCheckpoint });
    assert.equal(result.persisted, true);
    assert.equal((await checkpointStore.load({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1',
        job_id: 'job-checkpoint',
        request_id: 'request-checkpoint'
    })).request_id, 'request-checkpoint');

    const invalid = targetBatch({
        requestId: 'request-invalid-checkpoint',
        jobId: 'job-invalid-checkpoint',
        segmentId: 'segment-1',
        batchId: 'batch-invalid-checkpoint'
    });
    const invalidCheckpoint = targetCheckpoint({
        jobId: 'job-invalid-checkpoint',
        requestId: 'request-invalid-checkpoint'
    });
    invalidCheckpoint.projection_watermark.batch_id = 'wrong-batch';
    await assert.rejects(
        () => importer.importBatch(invalid, { checkpoint: invalidCheckpoint }),
        (error) => error.code === 'ANALYSIS_CHECKPOINT_DELIVERY_MISMATCH'
    );
    assert.equal((await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    })).receipts.length, 1);
});

test('target batch importer rejects malformed payload before the ACK precondition can be met', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const malformed = targetBatch({
        requestId: 'request-malformed',
        jobId: 'job-malformed',
        segmentId: 'segment-malformed',
        batchId: 'batch-malformed'
    });
    delete malformed.payload.parser_provenance;
    await assert.rejects(
        () => importer.importBatch(malformed),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
    const state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.receipts.length, 0);
    assert.equal(state.staging.length, 0);
});

test('last-turn replacement is capability-advertised, validated, and idempotently imported', async () => {
    const childBatch = targetBatchWithItem({
        requestId: 'replacement-request',
        jobId: 'replacement-job',
        batchId: 'replacement-batch',
        completeness: 'canonical',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    const fact = replacement();
    addTargetReplacement(childBatch, [fact]);

    const hello = createHello('hello-replacement');
    assert.ok(hello.capabilities.includes('last_turn_replacement_v1'));
    assert.equal(validateMessage(childBatch), childBatch);
    assert.equal(
        parseLine(encodeMessage(childBatch)).payload.replacements[0].replacement_key,
        fact.replacement_key
    );

    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    await importer.importBatch(childBatch);
    await importer.importBatch(childBatch);
    let state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    assert.equal(state.replacements.length, 1);
    assert.equal(state.replacements[0].replacement_key, fact.replacement_key);

    const conflictingFact = replacement({ cutByte: 179139 });
    const conflicting = structuredClone(childBatch);
    conflicting.batch_id = 'replacement-conflict';
    conflicting.payload.history_base = structuredClone(conflictingFact.cut);
    conflicting.payload.lineage_transitions[0].history_base = structuredClone(conflictingFact.cut);
    conflicting.payload.replacements[0] = structuredClone(conflictingFact);
    conflicting.payload.mutations.at(-1).replacement = structuredClone(conflictingFact);
    assert.equal(validateMessage(conflicting), conflicting);
    await assert.rejects(
        () => importer.importBatch(conflicting),
        (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
            && /evidence conflicts/i.test(error.message)
    );
    state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    assert.equal(state.replacements.length, 1);
    assert.equal(state.replacements[0].cut.end_byte_offset, 179138);
});

test('replacement evidence binds source identities, cut positions, and child history base', () => {
    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const valid = targetBatch({
        requestId: 'replacement-evidence-request',
        jobId: 'replacement-evidence-job',
        batchId: 'replacement-evidence-valid',
        completeness: 'canonical',
        sourceId: 'child-rollout'
    });
    addTargetReplacement(valid, [fact]);
    assert.equal(validateMessage(valid), valid);

    const invalidCases = [
        {
            name: 'parent start source identity',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.source_identity = 'other-parent'; }
        },
        {
            name: 'parent terminal source identity',
            mutate: (_message, value) => { value.parent_turn_terminal_source_ref.source_identity = 'other-parent'; }
        },
        {
            name: 'child start source identity',
            mutate: (_message, value) => { value.child_turn_start_source_ref.source_identity = 'other-child'; }
        },
        {
            name: 'cut byte position',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.byte_start += 1; }
        },
        {
            name: 'cut ordinal position',
            mutate: (_message, value) => { value.parent_turn_start_source_ref.rollout_ordinal += 1; }
        },
        {
            name: 'parent terminal ordering',
            mutate: (_message, value) => {
                value.parent_turn_terminal_source_ref.byte_start = value.cut.end_byte_offset - 1;
            }
        },
        {
            name: 'current child history base',
            mutate: (message) => { message.payload.history_base.end_byte_offset += 1; }
        }
    ];

    for (const { name, mutate } of invalidCases) {
        for (const mutationOnly of [false, true]) {
            const invalid = structuredClone(valid);
            if (mutationOnly) invalid.payload.replacements = [];
            const value = mutationOnly
                ? invalid.payload.mutations.at(-1).replacement
                : invalid.payload.replacements[0];
            mutate(invalid, value);
            assert.throws(
                () => validateMessage(invalid),
                (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field',
                `${name} must fail closed (${mutationOnly ? 'mutation' : 'top-level'})`
            );
        }
    }
});

test('replacement evidence conflicts are rejected before Memory/File state mutation', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-replacement-conflict-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const original = targetBatchWithItem({
        requestId: 'replacement-conflict-request',
        jobId: 'replacement-conflict-job',
        batchId: 'replacement-conflict-original',
        completeness: 'canonical',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    addTargetReplacement(original, [fact]);

    const conflictingFact = replacement({ cutByte: 179139 });
    const conflicting = structuredClone(original);
    conflicting.batch_id = 'replacement-conflict-different-evidence';
    conflicting.payload.history_base = structuredClone(conflictingFact.cut);
    conflicting.payload.lineage_transitions[0].history_base = structuredClone(conflictingFact.cut);
    conflicting.payload.replacements[0] = structuredClone(conflictingFact);
    conflicting.payload.mutations.at(-1).replacement = structuredClone(conflictingFact);
    assert.equal(validateMessage(conflicting), conflicting);

    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    for (const store of stores) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        await importer.importBatch(original);
        const scope = {
            conversationId: 'conversation-1',
            sourceId: 'child-rollout',
            sourceEpoch: 'child-epoch'
        };
        const before = await store.snapshot(scope);
        const operationsBefore = structuredClone(store.operations);

        await assert.rejects(
            () => importer.importBatch(conflicting),
            (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
                && /evidence conflicts/i.test(error.message)
        );

        const after = await store.snapshot(scope);
        for (const key of ['batches', 'items', 'replacements', 'mutations', 'receipts', 'staging']) {
            assert.deepEqual(after[key], before[key], `${key} must remain unchanged after rejection`);
        }
        assert.deepEqual(store.operations, operationsBefore);
    }

    const restartedStore = await new FileAnalysisStore({ rootDir: root }).init();
    assert.deepEqual(await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    }), await stores[1].snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    }));
});

test('partial and provisional top-level replacements fail closed before import', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-noncanonical-replacement-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    for (const completeness of ['partial', 'provisional']) {
        const fact = replacement({
            parentRolloutId: 'parent-rollout',
            childRolloutId: 'child-rollout'
        });
        const invalid = targetBatch({
            requestId: `noncanonical-replacement-request-${completeness}`,
            jobId: `noncanonical-replacement-job-${completeness}`,
            batchId: `noncanonical-replacement-${completeness}`,
            completeness,
            sourceId: 'child-rollout',
            sourceEpoch: 'child-epoch'
        });
        addTargetReplacement(invalid, [fact], { mutation: false });

        const stores = [
            new MemoryAnalysisStore(),
            await new FileAnalysisStore({ rootDir: root }).init()
        ];
        for (const store of stores) {
            const importer = await new AnalysisBatchImporter({ store }).init();
            const scope = {
                conversationId: 'conversation-1',
                sourceId: 'child-rollout',
                sourceEpoch: 'child-epoch'
            };
            const before = await store.snapshot(scope);
            const operationsBefore = structuredClone(store.operations);

            assert.throws(
                () => validateMessage(invalid),
                (error) => error instanceof AnalyzerProtocolError
                    && error.code === 'invalid_field'
                    && error.details?.field === 'payload.replacements'
                    && /replacement evidence requires matching mutation/i.test(error.message)
            );
            await assert.rejects(
                () => importer.importBatch(invalid),
                (error) => error instanceof AnalyzerProtocolError
                    && error.code === 'invalid_field'
                    && error.details?.field === 'payload.replacements'
                    && /replacement evidence requires matching mutation/i.test(error.message)
            );

            assert.deepEqual(await store.snapshot(scope), before);
            assert.deepEqual(store.operations, operationsBefore);
        }
    }
});

test('online last-turn replacement retains the parent history and commits the child head', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-last-turn-transition-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));

    const fact = replacement({
        parentRolloutId: 'parent-rollout',
        childRolloutId: 'child-rollout'
    });
    const parentBatch = targetBatchWithItem({
        requestId: 'parent-request',
        jobId: 'parent-job',
        batchId: 'parent-batch',
        completeness: 'canonical',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch',
        itemKey: 'old-item',
        text: 'old turn'
    });
    const childBatch = targetBatchWithItem({
        requestId: 'child-request',
        jobId: 'child-job',
        batchId: 'child-batch',
        completeness: 'canonical',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch',
        itemKey: 'new-item',
        text: 'edited turn'
    });
    addTargetReplacement(childBatch, [fact]);

    const complete = targetComplete({
        requestId: 'child-request',
        jobId: 'child-job',
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch',
        segmentId: childBatch.segment_id,
        batchId: childBatch.batch_id
    });

    const stores = [
        new MemoryAnalysisStore(),
        await new FileAnalysisStore({ rootDir: root }).init()
    ];
    for (const store of stores) {
        const importer = await new AnalysisBatchImporter({ store }).init();
        await importer.importBatch(parentBatch);
        await importer.importBatch(childBatch);
        const child = await importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'child-rollout',
                sourceEpoch: 'child-epoch'
            }
        });
        const parent = await store.snapshot({
            conversationId: 'conversation-1',
            sourceId: 'parent-rollout',
            sourceEpoch: 'parent-epoch'
        });

        assert.equal(parent.retired, false);
        assert.equal(parent.active_head, true);
        assert.deepEqual(parent.items.map((item) => item.item_key), ['old-item']);
        assert.equal(child.active_head, true);
        assert.equal(child.complete, true);
        assert.deepEqual(child.items.map((item) => item.item_key), ['new-item']);
        assert.equal(child.replacements.length, 1);
        assert.equal(child.replacements[0].replacement_key, fact.replacement_key);
    }

    const restartedStore = await new FileAnalysisStore({ rootDir: root }).init();
    const restartedImporter = await new AnalysisBatchImporter({ store: restartedStore }).init();
    const duplicate = await restartedImporter.importBatch(childBatch);
    assert.equal(duplicate.duplicate, true);
    const restartedParent = await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'parent-rollout',
        sourceEpoch: 'parent-epoch'
    });
    const restartedChild = await restartedStore.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'child-rollout',
        sourceEpoch: 'child-epoch'
    });
    assert.equal(restartedParent.active_head, true);
    assert.deepEqual(restartedParent.items.map((item) => item.item_key), ['old-item']);
    assert.deepEqual(restartedChild.items.map((item) => item.item_key), ['new-item']);
    assert.equal(restartedChild.replacements.length, 1);
});

test('malformed canonical batches fail closed before importer state changes', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();

    const missingProvenance = targetBatch({
        requestId: 'malformed-provenance-request',
        jobId: 'malformed-provenance-job',
        batchId: 'malformed-provenance-batch'
    });
    delete missingProvenance.payload.parser_provenance;
    await assert.rejects(
        () => importer.importBatch(missingProvenance),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingUsage = targetBatch({
        requestId: 'malformed-usage-request',
        jobId: 'malformed-usage-job',
        batchId: 'malformed-usage-batch'
    });
    delete missingUsage.payload.usage;
    await assert.rejects(
        () => importer.importBatch(missingUsage),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingMutations = targetBatch({
        requestId: 'malformed-mutations-request',
        jobId: 'malformed-mutations-job',
        batchId: 'malformed-mutations-batch'
    });
    delete missingMutations.payload.mutations;
    await assert.rejects(
        () => importer.importBatch(missingMutations),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const emptyMutations = targetBatch({
        requestId: 'empty-mutations-request',
        jobId: 'empty-mutations-job',
        batchId: 'empty-mutations-batch'
    });
    emptyMutations.payload.mutations = [];
    await assert.rejects(
        () => importer.importBatch(emptyMutations),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'invalid_field'
    );

    const missingCursor = targetBatch({
        requestId: 'missing-cursor-request',
        jobId: 'missing-cursor-job',
        batchId: 'missing-cursor-batch'
    });
    delete missingCursor.payload.next_cursor;
    await assert.rejects(
        () => importer.importBatch(missingCursor),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const state = await store.snapshot({
        conversationId: 'conversation-1',
        sourceId: 'rollout.jsonl',
        sourceEpoch: 'epoch-1'
    });
    assert.equal(state.batches.length, 0);
    assert.equal(state.canonical, false);
});

test('complete and checkpoint claims fail closed without recovery evidence', async () => {
    assert.throws(
        () => parseLine(JSON.stringify({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'complete',
            request_id: 'request-1'
        })),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const forgedComplete = {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: 'request-1',
        job_id: 'job-1',
        status: 'completed',
        completeness: 'canonical',
        next_cursor: null,
        checkpoint: {
            schema_version: 1,
            request_id: 'request-1',
            conversation_id: 'conversation-1',
            source: { source_id: 'rollout.jsonl', source_epoch: 'epoch-1' }
        }
    };
    assert.throws(
        () => parseLine(JSON.stringify(forgedComplete)),
        (error) => error instanceof AnalyzerProtocolError
    );

    const checkpointStore = new MemoryCheckpointStore();
    await assert.rejects(
        () => checkpointStore.save(
            { conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1' },
            forgedComplete.checkpoint
        ),
        (error) => error instanceof AnalyzerProtocolError
    );
});

test('complete cannot commit unless the same request imported a batch', async () => {
    const store = new MemoryAnalysisStore();
    const importer = await new AnalysisBatchImporter({ store }).init();
    const complete = targetComplete({
        requestId: 'empty-complete-request',
        jobId: 'empty-complete-job',
        segmentId: 'segment-1',
        batchId: 'empty-complete-batch'
    });

    await assert.rejects(
        () => importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'rollout.jsonl',
                sourceEpoch: 'epoch-1'
            }
        }),
        (error) => [
            'ANALYSIS_COMPLETE_WITHOUT_BATCH',
            'ANALYSIS_COMPLETE_DELIVERY_MISMATCH'
        ].includes(error.code)
    );
    assert.deepEqual((await store.snapshot({
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    })).batches, []);

    await importer.importBatch(targetBatch({
        requestId: 'prior-request',
        jobId: 'prior-job',
        batchId: 'prior-request-batch',
        completeness: 'canonical'
    }));
    await assert.rejects(
        () => importer.commitComplete(complete, {
            scope: {
                conversationId: 'conversation-1',
                sourceId: 'rollout.jsonl',
                sourceEpoch: 'epoch-1'
            }
        }),
        (error) => [
            'ANALYSIS_COMPLETE_WITHOUT_BATCH',
            'ANALYSIS_COMPLETE_DELIVERY_MISMATCH'
        ].includes(error.code)
    );

    await importer.importBatch(targetBatch({
        requestId: 'empty-complete-request',
        jobId: 'empty-complete-job',
        batchId: 'empty-complete-batch',
        completeness: 'canonical'
    }));
    const state = await importer.commitComplete(complete, {
        scope: {
            conversationId: 'conversation-1',
            sourceId: 'rollout.jsonl',
            sourceEpoch: 'epoch-1'
        }
    });
    assert.deepEqual(state.batches, ['prior-request-batch', 'empty-complete-batch']);
    assert.equal(state.canonical, true);
});

test('collector binds the first batch to the requested conversation before staging', async (t) => {
    const makeManager = (batchConversationId) => ({
        requestTimeoutMs: 1000,
        generation: 1,
        requests: [],
        async start() {},
        async request(request, { onBatch }) {
            this.requests.push(request);
            await onBatch(targetBatch({
                requestId: request.request_id,
                jobId: request.job_id,
                conversationId: batchConversationId,
                sourceId: 'first-batch-rollout',
                sourceEpoch: 'first-batch-epoch'
            }));
            return { status: 'completed', completeness: 'canonical' };
        },
        waitForIdle() { return Promise.resolve(); },
        async stop() {}
    });

    const makeCollector = async (batchConversationId, importCalls) => {
        const store = new MemoryAnalysisStore();
        const realImporter = await new AnalysisBatchImporter({ store }).init();
        const importer = {
            init: async () => realImporter,
            importBatch: async (...args) => {
                importCalls.count += 1;
                return realImporter.importBatch(...args);
            },
            commitComplete: (...args) => realImporter.commitComplete(...args)
        };
        const manager = makeManager(batchConversationId);
        const collector = new CodexRolloutCollector({
            processManager: manager,
            importer,
            store,
            checkpointStore: new MemoryCheckpointStore(),
            runStore: new MemoryAnalysisRunStore(),
            processRestartRetries: 0
        });
        return { collector, manager, store };
    };

    const wrongCalls = { count: 0 };
    const wrong = await makeCollector('conversation-B', wrongCalls);
    t.after(() => wrong.collector.stop());
    await assert.rejects(
        wrong.collector.analyze(createAnalyzeRequest({
            requestId: 'first-wrong-request',
            jobId: 'first-wrong-job',
            conversationId: 'conversation-A',
            mode: 'preview'
        })),
        (error) => error.code === 'ANALYSIS_BATCH_SCOPE_CONFLICT'
            && error.details.expected_conversation_id === 'conversation-A'
    );
    assert.equal(wrongCalls.count, 0);
    assert.equal(wrong.store.states.size, 0, 'wrong-conversation batch must not enter staging');

    const correctCalls = { count: 0 };
    const correct = await makeCollector('conversation-A', correctCalls);
    t.after(() => correct.collector.stop());
    const result = await correct.collector.analyze(createAnalyzeRequest({
        requestId: 'first-correct-request',
        jobId: 'first-correct-job',
        conversationId: 'conversation-A',
        mode: 'preview'
    }));
    assert.equal(correctCalls.count, 1);
    assert.equal(result.scope.conversationId, 'conversation-A');
    assert.equal(result.state.receipts.length, 1);
});

test('collector retries the failed later batch and does not reuse the prior durable batch identity', async (t) => {
    const store = new MemoryAnalysisStore();
    const checkpoints = new MemoryCheckpointStore();
    const runs = new MemoryAnalysisRunStore();
    const realImporter = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
    let failSecondBatch = true;
    const importerRecovery = [];
    const importer = {
        init: async () => realImporter,
        importBatch: async (batch, options) => {
            importerRecovery.push({
                batchId: batch.batch_id,
                recovery: options.recoveryDelivery ? { ...options.recoveryDelivery } : null
            });
            if (batch.batch_id === 'batch-B2' && failSecondBatch) {
                failSecondBatch = false;
                const error = new Error('synthetic staging unavailable');
                error.code = 'STAGING_UNAVAILABLE';
                throw error;
            }
            return realImporter.importBatch(batch, options);
        },
        commitComplete: (...args) => realImporter.commitComplete(...args)
    };
    const requests = [];
    const manager = {
        requestTimeoutMs: 5000,
        generation: 1,
        async start() {},
        async request(request, { onBatch }) {
            requests.push({ ...request });
            const makeBatch = (segmentId, batchId) => targetBatch({
                requestId: request.request_id,
                jobId: request.job_id,
                segmentId,
                batchId,
                conversationId: 'multi-batch-conversation',
                sourceId: 'multi-batch-rollout',
                sourceEpoch: 'multi-batch-epoch'
            });
            const first = makeBatch('segment-B1', 'batch-B1');
            const second = makeBatch('segment-B2', 'batch-B2');
            try {
                if (requests.length === 1) {
                    await onBatch(first);
                    await onBatch(second);
                } else {
                    await onBatch(second);
                    await onBatch(makeBatch('segment-B3', 'batch-B3'));
                }
            } catch (error) {
                if (requests.length === 1 && error.code === 'STAGING_UNAVAILABLE') {
                    const rejected = new Error('batch rejected');
                    rejected.code = 'batch_rejected';
                    rejected.retryable = true;
                    rejected.details = {
                        rejection_code: 'staging_unavailable',
                        job_id: second.job_id,
                        segment_id: second.segment_id,
                        batch_id: second.batch_id
                    };
                    throw rejected;
                }
                throw error;
            }
            return { status: 'completed', completeness: 'canonical' };
        },
        waitForIdle() { return Promise.resolve(); },
        async stop() {}
    };
    const collector = new CodexRolloutCollector({
        processManager: manager,
        importer,
        store,
        checkpointStore: checkpoints,
        runStore: runs,
        processRestartRetries: 1
    });
    t.after(() => collector.stop());

    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'multi-batch-request',
        jobId: 'multi-batch-job',
        conversationId: 'multi-batch-conversation',
        mode: 'backfill'
    }));
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].recovery, {
        segment_id: 'segment-B2',
        batch_id: 'batch-B2'
    });
    assert.deepEqual(importerRecovery, [
        { batchId: 'batch-B1', recovery: null },
        { batchId: 'batch-B2', recovery: null },
        { batchId: 'batch-B2', recovery: {
            job_id: 'multi-batch-job',
            segment_id: 'segment-B2',
            batch_id: 'batch-B2',
            request_id: 'multi-batch-request',
            scope: {
                conversationId: 'multi-batch-conversation',
                sourceId: 'multi-batch-rollout',
                sourceEpoch: 'multi-batch-epoch'
            }
        } },
        { batchId: 'batch-B3', recovery: null }
    ]);
    const state = await store.snapshot({
        conversationId: 'multi-batch-conversation',
        sourceId: 'multi-batch-rollout',
        sourceEpoch: 'multi-batch-epoch'
    });
    assert.equal(state.receipts.length, 3);
    const run = await runs.get('multi-batch-request');
    assert.equal(run.status, 'completed');
    assert.equal(run.pending_recovery_delivery, null);
    assert.equal(run.recovery_delivery.batch_id, 'batch-B3');
    assert.equal(result.state.receipts.length, 3);
});

test('restart prefers an explicit pending later batch over an older durable receipt', async (t) => {
    const store = new MemoryAnalysisStore();
    const checkpoints = new MemoryCheckpointStore();
    const runs = new MemoryAnalysisRunStore();
    const realImporter = await new AnalysisBatchImporter({ store, checkpointStore: checkpoints }).init();
    const scope = {
        conversationId: 'restart-multi-conversation',
        sourceId: 'restart-multi-rollout',
        sourceEpoch: 'restart-multi-epoch'
    };
    const oldBatch = targetBatch({
        requestId: 'old-attempt',
        jobId: 'restart-multi-job',
        segmentId: 'segment-B1',
        batchId: 'batch-B1',
        ...scope
    });
    await realImporter.importBatch(oldBatch);
    const readIntent = createAnalyzeRequest({
        requestId: 'old-attempt',
        jobId: 'restart-multi-job',
        conversationId: scope.conversationId,
        mode: 'backfill'
    });
    await runs.enqueue({
        run_id: 'restart-multi-run',
        job_id: 'restart-multi-job',
        request_id: 'old-attempt',
        conversation_id: scope.conversationId,
        source_id: scope.sourceId,
        source_epoch: scope.sourceEpoch,
        mode: 'backfill',
        read_intent: readIntent,
        recovery_schema_version: 1,
        priority: 'background',
        enqueue_sequence: 1,
        deadline: Date.now() + 5000,
        retry_budget: 2,
        retry_count: 0,
        attempt: 0,
        process_generation: 0
    });
    const pending = {
        job_id: 'restart-multi-job',
        segment_id: 'segment-B2',
        batch_id: 'batch-B2',
        request_id: 'old-attempt'
    };
    await runs.update('restart-multi-run', {
        status: 'retry_wait',
        retry_count: 1,
        recovery_delivery: pending,
        pending_recovery_delivery: pending
    });

    const requests = [];
    const manager = {
        requestTimeoutMs: 5000,
        generation: 1,
        async start() {},
        async request(request, { onBatch }) {
            requests.push({ ...request });
            assert.deepEqual(request.recovery, {
                segment_id: 'segment-B2',
                batch_id: 'batch-B2'
            });
            await onBatch(targetBatch({
                requestId: request.request_id,
                jobId: request.job_id,
                segmentId: 'segment-B2',
                batchId: 'batch-B2',
                ...scope
            }));
            await onBatch(targetBatch({
                requestId: request.request_id,
                jobId: request.job_id,
                segmentId: 'segment-B3',
                batchId: 'batch-B3',
                ...scope
            }));
            return { status: 'completed', completeness: 'canonical' };
        },
        waitForIdle() { return Promise.resolve(); },
        async stop() {}
    };
    const collector = new CodexRolloutCollector({
        processManager: manager,
        importer: realImporter,
        store,
        checkpointStore: checkpoints,
        runStore: runs,
        processRestartRetries: 2
    });
    t.after(() => collector.stop());
    await collector.init();
    const waitDeadline = Date.now() + 1000;
    while (true) {
        const run = await runs.get('restart-multi-run');
        if (run.status === 'completed') break;
        if (run.status === 'failed' || run.status === 'cancelled') {
            assert.fail(`restart recovery run ended in ${run.status}: ${run.last_error?.message || 'unknown error'}`);
        }
        if (Date.now() >= waitDeadline) {
            assert.fail(`restart recovery run did not complete: ${run.status}`);
        }
        await waitMs(1);
    }
    assert.equal(requests.length, 1);
    assert.notEqual(requests[0].request_id, 'old-attempt');
    const state = await store.snapshot(scope);
    assert.deepEqual(state.receipts.map((entry) => entry.batch_id), [
        'batch-B1', 'batch-B2', 'batch-B3'
    ]);
    const run = await runs.get('restart-multi-run');
    assert.equal(run.pending_recovery_delivery, null);
    assert.equal(run.recovery_delivery.batch_id, 'batch-B3');
});

test('mutation evidence is complete before importer state can be touched', async () => {
    const importer = await new AnalysisBatchImporter({ store: new MemoryAnalysisStore() }).init();
    const missingMetadata = targetBatch({
        requestId: 'missing-metadata-request',
        jobId: 'missing-metadata-job',
        batchId: 'missing-metadata-batch'
    });
    missingMetadata.payload.mutations = [{
        mutation: 'upsert_item',
        item: {
            item_key: 'item-1',
            content_hash: 'hash-1',
            source_epoch: 'epoch-1'
        }
    }];
    await assert.rejects(
        () => importer.importBatch(missingMetadata),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );

    const missingRange = targetBatch({
        requestId: 'missing-range-request',
        jobId: 'missing-range-job',
        batchId: 'missing-range-batch'
    });
    missingRange.payload.mutations = [{ mutation: 'complete_range' }];
    await assert.rejects(
        () => importer.importBatch(missingRange),
        (error) => error instanceof AnalyzerProtocolError && error.code === 'missing_field'
    );
});

test('importer deduplicates overlap and promotes provisional data before checkpoint commit', async () => {
    const store = new MemoryAnalysisStore();
    const order = [];
    const checkpointStore = {
        async save(scope, value) {
            assert.ok(['apply', 'duplicate'].includes(store.operations.at(-1)?.[0]));
            order.push(['checkpoint', scope, value.completeness]);
        }
    };
    const importer = await new AnalysisBatchImporter({ store, checkpointStore }).init();

    const partialBatch = targetBatchWithItem({
        requestId: 'target-overlap-request',
        jobId: 'target-overlap-job',
        batchId: 'tail-1',
        completeness: 'provisional',
        eventId: 'event-overlap-1'
    });
    const partial = await importer.importBatch(partialBatch, {
        checkpoint: targetCheckpointForBatch(partialBatch)
    });
    await importer.importBatch(partialBatch, {
        checkpoint: targetCheckpointForBatch(partialBatch)
    });
    const canonicalBatch = targetBatchWithItem({
        requestId: 'target-overlap-canonical-request',
        jobId: 'target-overlap-canonical-job',
        batchId: 'backfill-1',
        completeness: 'canonical',
        eventId: 'event-overlap-1',
        text: 'one'
    });
    canonicalBatch.payload.mutations = [
        { mutation: 'complete_range', source_range: { start: 0, end: 10 } }
    ];
    const canonical = await importer.importBatch(canonicalBatch, {
        checkpoint: targetCheckpointForBatch(canonicalBatch)
    });

    assert.equal(partial.state.provisional, true);
    assert.equal(canonical.state.canonical, true);
    assert.equal(canonical.state.complete, true);
    assert.equal(canonical.state.provisional, false);
    assert.equal(canonical.state.batches.length, 2);
    assert.equal(canonical.state.items.length, 1);
    assert.equal(canonical.state.items[0].completeness, 'canonical');
    assert.equal(canonical.state.items[0].event.payload.text, 'one');
    assert.equal(order.filter((entry) => entry[0] === 'checkpoint').length, 3);
});

test('importer never downgrades a canonical projection on a late incomplete overlap', async () => {
    const importer = await new AnalysisBatchImporter({ store: new MemoryAnalysisStore() }).init();
    const canonicalBatch = targetBatchWithItem({
        requestId: 'canonical-request',
        jobId: 'canonical-job',
        batchId: 'canonical-1',
        completeness: 'canonical',
        eventId: 'event-overlap-1'
    });
    const staleBatch = targetBatchWithItem({
        requestId: 'stale-request',
        jobId: 'stale-job',
        batchId: 'late-tail-1',
        completeness: 'partial',
        eventId: 'event-overlap-1',
        text: 'one'
    });
    staleBatch.payload.mutations = [
        { mutation: 'mark_partial', source_range: { start: 0, end: 10 } }
    ];
    staleBatch.payload.progress.records_emitted = 0;
    staleBatch.payload.progress.bytes_scanned = 5;
    const canonical = await importer.importBatch(canonicalBatch);
    const stale = await importer.importBatch(staleBatch);
    assert.equal(canonical.state.canonical, true);
    assert.equal(stale.state.canonical, true);
    assert.equal(stale.state.complete, true);
    assert.equal(stale.state.provisional, false);
    assert.equal(stale.state.projection.complete, true);
    assert.equal(stale.state.projection.provisional, false);
    assert.equal(stale.state.items[0].event.payload.text, 'one');
});

test('file checkpoint store replaces one validated scope atomically', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-checkpoint-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const store = await new FileCheckpointStore({ rootDir: root }).init();
    const scope = { conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1' };
    await store.save(scope, targetCheckpoint({ completeness: 'provisional' }));
    await store.save(scope, targetCheckpoint({ completeness: 'canonical' }));
    assert.equal((await store.load(scope)).completeness, 'canonical');
    assert.equal((await fs.promises.readdir(root)).filter((name) => name.endsWith('.json')).length, 1);
});

test('memory and file checkpoint stores only advance monotonically', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-checkpoint-monotonic-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryCheckpointStore(),
        await new FileCheckpointStore({ rootDir: root }).init()
    ];
    const scope = {
        conversationId: 'conversation-1', sourceId: 'rollout.jsonl', sourceEpoch: 'epoch-1'
    };

    for (const store of stores) {
        const canonical = resizeTargetCheckpoint(targetCheckpoint(), 100);
        canonical.source.fingerprint = {
            algorithm: 'sha256-v1', digest: 'opaque-canonical', covered_bytes: 100
        };
        canonical.source.prefix_anchor = {
            algorithm: 'sha256-v1', digest: 'opaque-prefix', end_offset: 100
        };
        await store.save(scope, canonical);

        const latePartial = resizeTargetCheckpoint(targetCheckpoint({ completeness: 'partial' }), 200);
        latePartial.source.fingerprint = {
            algorithm: 'sha256-v1', digest: 'opaque-late', covered_bytes: 200
        };
        latePartial.source.prefix_anchor = {
            algorithm: 'sha256-v1', digest: 'opaque-late-prefix', end_offset: 200
        };
        await store.save(scope, latePartial);

        const lowerCanonical = resizeTargetCheckpoint(targetCheckpoint(), 50);
        lowerCanonical.source.fingerprint = {
            algorithm: 'sha256-v1', digest: 'opaque-lower', covered_bytes: 50
        };
        lowerCanonical.source.prefix_anchor = {
            algorithm: 'sha256-v1', digest: 'opaque-lower-prefix', end_offset: 50
        };
        await store.save(scope, lowerCanonical);

        const saved = await store.load(scope);
        assert.equal(saved.completeness, 'canonical');
        assert.equal(saved.segment.source_range.end, 100);
        assert.equal(saved.source.fingerprint.covered_bytes, 100);
    }
});

test('target checkpoint stores validate scope, preserve opaque metadata, and recover across attempts', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-checkpoint-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryCheckpointStore(),
        await new FileCheckpointStore({ rootDir: root }).init()
    ];
    const scope = {
        conversationId: 'conversation-target',
        sourceId: 'rollout-target.jsonl',
        sourceEpoch: 'epoch-target'
    };

    for (const store of stores) {
        const partial = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-a',
            requestId: 'request-a',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'partial'
        }), 20);
        partial.source.fingerprint = {
            algorithm: 'sha256-v1', digest: 'opaque-only', covered_bytes: 999999
        };
        partial.source.prefix_anchor = {
            algorithm: 'sha256-v1', digest: 'opaque-only-prefix', end_offset: 999999
        };
        partial.source_spec = { path: 'legacy-rollout.jsonl' };
        partial.sourceSpec = { path: 'legacy-rollout.jsonl' };
        partial.replay = true;
        partial.retention_profile = 'legacy';
        partial.retentionProfile = 'legacy-camel';
        partial.discovery = { candidates: ['legacy-rollout.jsonl'] };
        partial.revision = 99;
        partial.source.revision = 99;
        partial.source.replay = true;
        await store.save(scope, partial);
        const restartedStore = store instanceof FileCheckpointStore
            ? await new FileCheckpointStore({ rootDir: root }).init()
            : store;
        const recovered = await restartedStore.load(scope);
        assert.equal(recovered.job_id, 'job-a');
        assert.equal(recovered.source.fingerprint.covered_bytes, 999999);
        for (const field of [
            'source_spec',
            'sourceSpec',
            'replay',
            'retention_profile',
            'retentionProfile',
            'discovery',
            'revision'
        ]) {
            assert.equal(recovered[field], undefined, `legacy checkpoint field persisted: ${field}`);
        }
        assert.equal(recovered.source.revision, undefined);
        assert.equal(recovered.source.replay, undefined);
        if (store instanceof FileCheckpointStore) {
            const persisted = JSON.parse(
                (await fs.promises.readFile(store.pathFor(scope))).toString('utf8')
            );
            for (const field of [
                'source_spec',
                'sourceSpec',
                'replay',
                'retention_profile',
                'retentionProfile',
                'discovery',
                'revision'
            ]) {
                assert.equal(persisted[field], undefined, `legacy checkpoint file field persisted: ${field}`);
            }
            assert.equal(persisted.source.revision, undefined);
            assert.equal(persisted.source.replay, undefined);
        }

        const lowerOtherJob = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-other',
            requestId: 'request-other',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'partial'
        }), 10);
        const unchanged = await restartedStore.save({ ...scope, jobId: 'job-other' }, lowerOtherJob);
        assert.equal(unchanged.job_id, 'job-a');
        assert.equal(unchanged.source.source_range.end, 20);

        const canonical = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-a',
            requestId: 'request-b',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'canonical'
        }), 40);
        await restartedStore.save(scope, canonical);
        assert.equal((await restartedStore.load(scope)).completeness, 'canonical');
        assert.equal((await restartedStore.load(scope)).job_id, 'job-a');

        const higherOtherJob = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-other',
            requestId: 'request-other-2',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'canonical'
        }), 80);
        await restartedStore.save({ ...scope, jobId: 'job-other' }, higherOtherJob);
        assert.equal((await restartedStore.load(scope)).job_id, 'job-other');
        assert.equal((await restartedStore.load(scope)).source.source_range.end, 80);

        await assert.rejects(
            () => restartedStore.save({ ...scope, sourceId: 'other.jsonl' }, canonical),
            (error) => error.code === 'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => restartedStore.save({ ...scope, jobId: 'job-other' }, canonical),
            (error) => error.code === 'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => restartedStore.save({ ...scope, requestId: 'request-other' }, canonical),
            (error) => error.code === 'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH'
        );

        const forgedCursor = resizeTargetCheckpoint(targetCheckpoint({
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch
        }), 50);
        forgedCursor.cursor.complete_range.end = 49;
        await assert.rejects(
            () => restartedStore.save(scope, forgedCursor),
            (error) => error.code === 'invalid_checkpoint'
                || error.code === 'invalid_field'
                || /cursor scope|complete_range/.test(error.message)
        );
    }
});

test('target run stores persist attempts, retry state, receipt progress, and terminal result', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-run-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisRunStore({ now: () => 100 }),
        await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init()
    ];

    for (const store of stores) {
        let activeStore = store;
        const started = await activeStore.begin({
            run_id: 'run-target-1',
            job_id: 'job-target-1',
            request_id: 'request-target-1',
            conversation_id: 'conversation-target',
            source_id: 'rollout-target.jsonl',
            source_epoch: 'epoch-target',
            mode: 'append',
            attempt: 0,
            process_generation: 3,
            retry_budget: 2,
            source_spec: { path: 'legacy-rollout.jsonl' },
            sourceSpec: { path: 'legacy-rollout.jsonl' },
            replay: true,
            retention_profile: 'legacy',
            retentionProfile: 'legacy-camel',
            discovery: { candidates: ['legacy-rollout.jsonl'] },
            revision: 99,
            source: {
                source_id: 'rollout-target.jsonl',
                source_epoch: 'epoch-target',
                source_spec: { path: 'legacy-rollout.jsonl' },
                replay: true,
                revision: 99
            }
        });
        assert.equal(started.status, 'running');
        assert.equal(started.mode, 'append');
        assert.equal(started.process_generation, 3);
        assert.equal(started.retry_budget, 2);
        for (const field of [
            'source_spec',
            'sourceSpec',
            'replay',
            'retention_profile',
            'retentionProfile',
            'discovery',
            'revision'
        ]) {
            assert.equal(started[field], undefined, `legacy run field persisted: ${field}`);
        }
        assert.equal(started.source.source_spec, undefined);
        assert.equal(started.source.replay, undefined);
        assert.equal(started.source.revision, undefined);

        await activeStore.update('run-target-1', {
            request_id: 'request-target-2',
            attempt: 1,
            process_generation: 4,
            status: 'retry_wait',
            retry_count: 1,
            batches: 2,
            receipt_count: 2,
            last_segment_id: 'segment-target-1',
            last_batch_id: 'batch-target-1',
            recovery_delivery: {
                segment_id: 'segment-target-1',
                batch_id: 'batch-target-1'
            },
            receipt: { accepted: true, duplicate: false }
        });
        if (store instanceof FileAnalysisRunStore) {
            activeStore = await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init();
        }
        const resumed = await activeStore.begin({
            run_id: 'run-target-1',
            job_id: 'job-target-1',
            request_id: 'request-target-3',
            conversation_id: 'conversation-target',
            mode: 'append',
            attempt: 2,
            process_generation: 5,
            retry_budget: 2
        });
        assert.equal(resumed.status, 'running');
        assert.equal(resumed.request_id, 'request-target-3');
        assert.equal(resumed.batches, 2);
        assert.equal(resumed.last_batch_id, 'batch-target-1');
        assert.equal(resumed.recovery_delivery.batch_id, 'batch-target-1');

        const completed = await activeStore.complete('run-target-1', {
            status: 'ok',
            completeness: 'partial',
            source_spec: { path: 'legacy-rollout.jsonl' },
            sourceSpec: { path: 'legacy-rollout.jsonl' },
            replay: true,
            retention_profile: 'legacy',
            discovery: { candidates: ['legacy-rollout.jsonl'] },
            revision: 99,
            checkpoint: {
                schema_version: 1,
                completeness: 'partial',
                source_spec: { path: 'legacy-rollout.jsonl' },
                replay: true,
                revision: 99
            }
        });
        assert.equal(completed.status, 'completed');
        assert.equal(completed.partial_recovery_checkpoint.completeness, 'partial');
        assert.equal(completed.source_spec, undefined);
        assert.equal(completed.result.source_spec, undefined);
        assert.equal(completed.result.replay, undefined);
        assert.equal(completed.result.checkpoint.source_spec, undefined);
        assert.equal(completed.result.checkpoint.replay, undefined);
        assert.equal(completed.checkpoint.source_spec, undefined);
        assert.equal(completed.checkpoint.replay, undefined);
        assert.equal(completed.revision, undefined);
        if (store instanceof FileAnalysisRunStore) {
            const persisted = JSON.parse(
                (await fs.promises.readFile(activeStore.pathFor('run-target-1'))).toString('utf8')
            );
            for (const field of [
                'source_spec',
                'sourceSpec',
                'replay',
                'retention_profile',
                'retentionProfile',
                'discovery',
                'revision'
            ]) {
                assert.equal(persisted[field], undefined, `legacy run file field persisted: ${field}`);
            }
            assert.equal(persisted.result.source_spec, undefined);
            assert.equal(persisted.result.replay, undefined);
            assert.equal(persisted.checkpoint.source_spec, undefined);
            assert.equal(persisted.checkpoint.replay, undefined);
        }
        assert.equal((await activeStore.get('run-target-1')).status, 'completed');

        const lateFailure = await activeStore.fail('run-target-1', {
            code: 'late_failure',
            message: 'must not downgrade completed run',
            retryable: true
        });
        assert.equal(lateFailure.status, 'completed');
        await assert.rejects(
            () => activeStore.begin({
                run_id: 'run-target-1',
                job_id: 'other-job',
                conversation_id: 'conversation-target',
                mode: 'append'
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => activeStore.begin({
                run_id: 'run-target-1',
                job_id: 'job-target-1',
                conversation_id: 'other-conversation',
                mode: 'append'
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => activeStore.begin({
                run_id: 'run-target-replay',
                job_id: 'job-target-1',
                conversation_id: 'conversation-target',
                mode: 'replay'
            }),
            (error) => error.code === 'ANALYSIS_RUN_INVALID'
        );
    }
});

test('target run stores bind request identity to attempt and preserve monotonic batch IDs', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-run-identity-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisRunStore({ now: () => 100 }),
        await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init()
    ];

    for (const store of stores) {
        await store.begin({
            run_id: 'run-identity-guard',
            job_id: 'job-identity-guard',
            request_id: 'request-new',
            conversation_id: 'conversation-identity-guard',
            mode: 'append',
            attempt: 2,
            process_generation: 2
        });

        await assert.rejects(
            () => store.update('run-identity-guard', {
                request_id: 'request-old',
                attempt: 1,
                process_generation: 1
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => store.begin({
                run_id: 'run-identity-guard',
                job_id: 'job-identity-guard',
                request_id: 'request-old',
                conversation_id: 'conversation-identity-guard',
                mode: 'append',
                attempt: 1,
                process_generation: 1
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => store.update('run-identity-guard', {
                request_id: 'request-same-generation',
                attempt: 2,
                process_generation: 2
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => store.update('run-identity-guard', {
                request_id: 'request-new',
                attempt: 3,
                process_generation: 2
            }),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );

        const retried = await store.begin({
            run_id: 'run-identity-guard',
            job_id: 'job-identity-guard',
            request_id: 'request-next',
            conversation_id: 'conversation-identity-guard',
            mode: 'append',
            attempt: 3,
            process_generation: 2
        });
        assert.equal(retried.request_id, 'request-next');
        assert.equal(retried.attempt, 3);
        assert.equal(retried.process_generation, 2);

        await store.update('run-identity-guard', {
            batches: 2,
            receipt_count: 2,
            last_segment_id: 'segment-current',
            last_batch_id: 'batch-current'
        });
        await store.update('run-identity-guard', {
            last_segment_id: 'segment-stale',
            last_batch_id: 'batch-stale'
        });
        const preserved = await store.get('run-identity-guard');
        assert.equal(preserved.batches, 2);
        assert.equal(preserved.receipt_count, 2);
        assert.equal(preserved.last_segment_id, 'segment-current');
        assert.equal(preserved.last_batch_id, 'batch-current');
    }
});

test('target run stores keep completed and failed terminal states immutable', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-run-terminal-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisRunStore({ now: () => 100 }),
        await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init()
    ];

    for (const store of stores) {
        await store.begin({
            run_id: 'run-terminal-immutable',
            job_id: 'job-terminal-immutable',
            request_id: 'request-terminal-immutable',
            conversation_id: 'conversation-terminal-immutable',
            mode: 'append'
        });
        const completed = await store.complete('run-terminal-immutable', {
            status: 'ok',
            marker: 'canonical'
        });
        await assert.rejects(
            () => store.update('run-terminal-immutable', {
                status: 'completed',
                result: { marker: 'stale' },
                batches: 0,
                last_batch_id: 'stale-batch'
            }),
            (error) => error.code === 'ANALYSIS_RUN_TERMINAL'
        );
        const lateComplete = await store.complete('run-terminal-immutable', {
            status: 'ok',
            marker: 'late-complete'
        });
        const lateFailure = await store.fail('run-terminal-immutable', {
            code: 'late_failure',
            message: 'must not mutate completed run'
        });
        assert.equal(lateComplete.status, 'completed');
        assert.deepEqual(lateComplete.result, completed.result);
        assert.equal(lateFailure.status, 'completed');
        assert.deepEqual(lateFailure.result, completed.result);

        await store.begin({
            run_id: 'run-failed-terminal',
            job_id: 'job-terminal-immutable',
            request_id: 'request-failed-terminal',
            conversation_id: 'conversation-terminal-immutable',
            mode: 'append'
        });
        const failed = await store.fail('run-failed-terminal', {
            code: 'request_timeout',
            message: 'request timed out',
            retryable: true
        });
        const lateFailedComplete = await store.complete('run-failed-terminal', {
            marker: 'must-not-complete'
        });
        assert.equal(failed.status, 'failed');
        assert.equal(lateFailedComplete.status, 'failed');
        assert.deepEqual(lateFailedComplete.error, failed.error);
        await assert.rejects(
            () => store.update('run-failed-terminal', { status: 'running' }),
            (error) => error.code === 'ANALYSIS_RUN_TERMINAL'
        );
        await assert.rejects(
            () => store.begin({
                run_id: 'run-failed-terminal',
                job_id: 'job-terminal-immutable',
                request_id: 'request-failed-terminal',
                conversation_id: 'conversation-terminal-immutable',
                mode: 'append'
            }),
            (error) => error.code === 'ANALYSIS_RUN_TERMINAL'
        );

        const retry = await store.begin({
            run_id: 'run-failed-terminal',
            job_id: 'job-terminal-immutable',
            request_id: 'request-failed-retry',
            conversation_id: 'conversation-terminal-immutable',
            mode: 'append',
            attempt: 1,
            process_generation: 1
        });
        assert.equal(retry.status, 'running');
        assert.equal(retry.request_id, 'request-failed-retry');
        assert.equal((await store.complete('run-failed-terminal', { marker: 'retry-ok' })).status, 'completed');
    }
});

test('target run stores reject late terminal callbacks after a retry changes identity', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-run-late-terminal-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisRunStore({ now: () => 100 }),
        await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init()
    ];

    for (const store of stores) {
        await store.begin({
            run_id: 'run-late-terminal',
            job_id: 'job-late-terminal',
            request_id: 'request-old',
            conversation_id: 'conversation-late-terminal',
            mode: 'append'
        });
        await store.fail('run-late-terminal', {
            code: 'old_failure',
            message: 'old attempt failed'
        });
        await store.begin({
            run_id: 'run-late-terminal',
            job_id: 'job-late-terminal',
            request_id: 'request-new',
            conversation_id: 'conversation-late-terminal',
            mode: 'append',
            attempt: 1,
            process_generation: 1
        });

        const oldIdentity = {
            request_id: 'request-old',
            attempt: 0,
            process_generation: 0
        };
        await assert.rejects(
            () => store.complete(
                'run-late-terminal',
                { marker: 'stale-complete' },
                oldIdentity
            ),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        await assert.rejects(
            () => store.fail(
                'run-late-terminal',
                { code: 'stale_failure', message: 'stale callback' },
                oldIdentity
            ),
            (error) => error.code === 'ANALYSIS_RUN_SCOPE_MISMATCH'
        );
        const running = await store.get('run-late-terminal');
        assert.equal(running.status, 'running');
        assert.equal(running.request_id, 'request-new');
        assert.equal(running.result, null);

        const completed = await store.complete(
            'run-late-terminal',
            { marker: 'current-complete' },
            {
                request_id: 'request-new',
                attempt: 1,
                process_generation: 1
            }
        );
        assert.equal(completed.status, 'completed');
        assert.deepEqual(completed.result, { marker: 'current-complete' });
    }
});

test('target checkpoint stores serialize concurrent progress without rollback', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-checkpoint-concurrent-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryCheckpointStore(),
        await new FileCheckpointStore({ rootDir: root }).init()
    ];
    const scope = {
        conversationId: 'conversation-concurrent-checkpoint',
        sourceId: 'rollout-concurrent.jsonl',
        sourceEpoch: 'epoch-concurrent',
        jobId: 'job-concurrent'
    };

    for (const store of stores) {
        const high = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-concurrent',
            requestId: 'request-high',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'canonical'
        }), 20, { itemCount: 2 });
        const low = resizeTargetCheckpoint(targetCheckpoint({
            jobId: 'job-concurrent',
            requestId: 'request-low',
            conversationId: scope.conversationId,
            sourceId: scope.sourceId,
            sourceEpoch: scope.sourceEpoch,
            completeness: 'partial',
            cursor: null
        }), 10, { itemCount: 1 });

        const results = await Promise.allSettled([
            store.save(scope, high),
            store.save(scope, low)
        ]);
        assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'fulfilled']);
        const recovered = await store.load(scope);
        assert.equal(recovered.completeness, 'canonical');
        assert.equal(recovered.source.source_range.end, 20);
        assert.equal(recovered.projection_watermark.logical_item_count, 2);
    }
});

test('target run stores serialize concurrent progress and late failure updates', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-run-concurrent-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const stores = [
        new MemoryAnalysisRunStore({ now: () => 100 }),
        await new FileAnalysisRunStore({ rootDir: root, now: () => 100 }).init()
    ];

    for (const store of stores) {
        await store.begin({
            run_id: 'run-concurrent-progress',
            job_id: 'job-concurrent',
            request_id: 'request-concurrent',
            conversation_id: 'conversation-concurrent-run',
            mode: 'append'
        });
        const progressResults = await Promise.allSettled([
            store.update('run-concurrent-progress', {
                batches: 2,
                receipt_count: 2,
                last_segment_id: 'segment-2',
                last_batch_id: 'batch-2'
            }),
            store.update('run-concurrent-progress', {
                batches: 1,
                receipt_count: 1,
                last_segment_id: 'segment-1',
                last_batch_id: 'batch-1'
            })
        ]);
        assert.deepEqual(
            progressResults.map((result) => result.status),
            ['fulfilled', 'fulfilled']
        );
        const progress = await store.get('run-concurrent-progress');
        assert.equal(progress.batches, 2);
        assert.equal(progress.receipt_count, 2);
        assert.equal(progress.last_segment_id, 'segment-2');
        assert.equal(progress.last_batch_id, 'batch-2');

        await store.begin({
            run_id: 'run-concurrent-terminal',
            job_id: 'job-concurrent',
            request_id: 'request-terminal',
            conversation_id: 'conversation-concurrent-run',
            mode: 'append'
        });
        const terminalResults = await Promise.allSettled([
            store.update('run-concurrent-terminal', {
                batches: 1,
                last_batch_id: 'late-batch'
            }),
            store.fail('run-concurrent-terminal', {
                code: 'request_timeout',
                message: 'request timed out',
                retryable: true
            })
        ]);
        assert.deepEqual(
            terminalResults.map((result) => result.status),
            ['fulfilled', 'fulfilled']
        );
        const terminal = await store.get('run-concurrent-terminal');
        assert.equal(terminal.status, 'failed');
        assert.equal(terminal.retry_count, 1);
    }
});

test('collector starts an isolated analyzer process, ACKs imported batches, and persists completion checkpoint', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-collector-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const runStore = new MemoryAnalysisRunStore({ now: () => 123 });
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        store,
        checkpointStore,
        runStore,
        requestTimeoutMs: 5000
    });
    const request = createAnalyzeRequest({
        requestId: 'request-1',
        jobId: 'job-1',
        conversationId: 'conversation-1',
        mode: 'preview'
    });
    const result = await collector.analyze(request);
    assert.equal(result.complete.status, 'completed');
    assert.equal(result.complete.completeness, 'canonical');
    assert.equal(result.scope.sourceId, 'fake-source');
    assert.equal(result.scope.sourceEpoch, 'fake-epoch-1');
    assert.equal(result.state.canonical, true);
    assert.equal(result.state.items.length, 0);
    assert.equal((await checkpointStore.load({
        conversationId: 'conversation-1', sourceId: 'fake-source', sourceEpoch: 'fake-epoch-1'
    })).completeness, 'canonical');
    const run = await runStore.get('request-1');
    assert.equal(run.status, 'completed');
    assert.equal(run.job_id, 'job-1');
    assert.equal(run.batches, 1);
    assert.equal(run.receipt_count, 1);
});

test('collector holds the single-flight slot until Rust confirms a negative batch ACK', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-negative-ack-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const runStore = new MemoryAnalysisRunStore();
    const delegate = new AnalysisBatchImporter({ store, checkpointStore });
    let rejectFirstBatch = true;
    const operations = [];
    const importer = {
        async init() {
            await delegate.init();
        },
        async importBatch(batchMessage, options) {
            operations.push(`import:${batchMessage.request_id}`);
            if (rejectFirstBatch) {
                rejectFirstBatch = false;
                const error = new Error('synthetic batch validation failure');
                error.rejection_code = 'batch_validation_failed';
                throw error;
            }
            const result = await delegate.importBatch(batchMessage, options);
            operations.push(`staged:${batchMessage.request_id}`);
            return result;
        },
        async commitComplete(message, options) {
            operations.push(`complete:${message.request_id}`);
            return delegate.commitComplete(message, options);
        }
    };
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_REJECTION_DELAY_MS: '100'
        },
        importer,
        store,
        checkpointStore,
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 0
    });
    const sent = [];
    collector.processManager.on('sent', (message) => {
        sent.push(message);
        if (message.message_type === 'ack') {
            operations.push(`ack:${message.request_id}:${message.error || 'accepted'}`);
        }
    });

    const first = collector.analyze(createAnalyzeRequest({
        requestId: 'negative-ack-request-1',
        jobId: 'negative-ack-job-1',
        conversationId: 'negative-ack-conversation-1',
        mode: 'preview'
    }));
    while (!sent.some((message) => (
        message.message_type === 'ack'
        && message.request_id === 'negative-ack-request-1'
        && message.accepted === false
    ))) {
        await waitMs(1);
    }

    let secondSettled = false;
    const second = collector.analyze(createAnalyzeRequest({
        requestId: 'negative-ack-request-2',
        jobId: 'negative-ack-job-2',
        conversationId: 'negative-ack-conversation-2',
        mode: 'preview'
    })).finally(() => {
        secondSettled = true;
    });
    await waitMs(20);
    assert.equal(secondSettled, false);

    await assert.rejects(
        first,
        (error) => error.code === 'batch_rejected'
            && error.details.rejection_code === 'batch_validation_failed'
            && error.retryable === false
    );
    const secondResult = await second;
    assert.equal(secondResult.complete.message_type, 'complete');

    const firstAckIndex = operations.indexOf(
        'ack:negative-ack-request-1:batch_validation_failed'
    );
    const firstImportIndex = operations.indexOf('import:negative-ack-request-1');
    const secondAnalyzeIndex = sent.findIndex((message) => (
        message.message_type === 'analyze'
        && message.request_id === 'negative-ack-request-2'
    ));
    assert.ok(firstImportIndex >= 0);
    assert.ok(firstAckIndex > firstImportIndex);
    assert.ok(secondAnalyzeIndex >= 0);

    const firstRun = await runStore.get('negative-ack-request-1');
    assert.equal(firstRun.status, 'failed');
    assert.equal(firstRun.error.code, 'batch_rejected');
    assert.equal(firstRun.error.details.rejection_code, 'batch_validation_failed');
    const secondRun = await runStore.get('negative-ack-request-2');
    assert.equal(secondRun.status, 'completed');
});

test('collector retries a staging rejection with the same job and recovery delivery', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-staging-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const runStore = new MemoryAnalysisRunStore();
    const delegate = new AnalysisBatchImporter({ store, checkpointStore });
    let rejectFirstBatch = true;
    const importer = {
        async init() {
            await delegate.init();
        },
        async importBatch(batchMessage, options) {
            if (rejectFirstBatch) {
                rejectFirstBatch = false;
                throw new Error('temporary staging failure');
            }
            return delegate.importBatch(batchMessage, options);
        },
        async commitComplete(message, options) {
            return delegate.commitComplete(message, options);
        }
    };
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_BATCH_REJECTION_DELAY_MS: '50'
        },
        importer,
        store,
        checkpointStore,
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 1
    });
    const attempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') attempts.push(message);
    });

    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'staging-retry-request',
        jobId: 'staging-retry-job',
        conversationId: 'staging-retry-conversation',
        mode: 'preview'
    }));
    assert.equal(result.complete.message_type, 'complete');
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].job_id, attempts[1].job_id);
    assert.notEqual(attempts[0].request_id, attempts[1].request_id);
    assert.equal(collector.processManager.generation, 1);
    assert.deepEqual(attempts[1].recovery, {
        segment_id: 'segment-staging-retry-job',
        batch_id: 'batch-staging-retry-job'
    });

    const run = await runStore.get('staging-retry-request');
    assert.equal(run.status, 'completed');
    assert.equal(run.attempt, 1);
    assert.equal(run.retry_count, 1);
    assert.equal(run.recovery_delivery.segment_id, 'segment-staging-retry-job');
    assert.equal((await store.snapshot({
        conversationId: 'staging-retry-conversation',
        sourceId: 'fake-source',
        sourceEpoch: 'fake-epoch-1'
    })).receipts.length, 1);
});

test('collector retries retryable fatal errors only after a new analyzer generation is ready', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-fatal-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const runStore = new MemoryAnalysisRunStore();
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_FATAL_MODE: 'retryable',
            FAKE_ANALYZER_FATAL_MARKER: path.join(root, 'fatal.marker')
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 1
    });
    const attempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') {
            attempts.push({
                requestId: message.request_id,
                jobId: message.job_id,
                generation: collector.processManager.generation
            });
        }
    });

    const result = await collector.analyze(createAnalyzeRequest({
        requestId: 'fatal-retry-request',
        jobId: 'fatal-retry-job',
        conversationId: 'fatal-retry-conversation',
        mode: 'preview'
    }));
    assert.equal(result.complete.message_type, 'complete');
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].generation, 1);
    assert.equal(attempts[1].generation, 2);
    assert.notEqual(attempts[0].requestId, attempts[1].requestId);
    assert.equal(attempts[0].jobId, attempts[1].jobId);
    assert.equal(result.requestId, attempts[1].requestId);
    const run = await runStore.get('fatal-retry-request');
    assert.equal(run.status, 'completed');
    assert.equal(run.attempt, 1);
    assert.equal(run.process_generation, 2);
    assert.equal(run.retry_count, 1);
});

test('collector does not retry a nonretryable fatal error but recycles before the next intent', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-fatal-no-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const runStore = new MemoryAnalysisRunStore();
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_FATAL_MODE: 'nonretryable',
            FAKE_ANALYZER_FATAL_MARKER: path.join(root, 'fatal.marker')
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 2
    });
    const attempts = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') {
            attempts.push({
                requestId: message.request_id,
                generation: collector.processManager.generation
            });
        }
    });

    await assert.rejects(
        () => collector.analyze(createAnalyzeRequest({
            requestId: 'fatal-no-retry-request',
            jobId: 'fatal-no-retry-job',
            conversationId: 'fatal-no-retry-conversation',
            mode: 'preview'
        })),
        (error) => error.code === 'fake_fatal'
            && error.fatal === true
            && error.retryable === false
    );
    assert.equal(attempts.length, 1);
    assert.equal(collector.processManager.generation, 1);
    assert.equal(collector.processManager.child, null);
    const failedRun = await runStore.get('fatal-no-retry-request');
    assert.equal(failedRun.error.code, 'fake_fatal');

    const recovered = await collector.analyze(createAnalyzeRequest({
        requestId: 'fatal-no-retry-request-2',
        jobId: 'fatal-no-retry-job-2',
        conversationId: 'fatal-no-retry-conversation-2',
        mode: 'preview'
    }));
    assert.equal(recovered.complete.message_type, 'complete');
    assert.equal(attempts.length, 2);
    assert.equal(attempts[1].generation, 2);
});

test('collector preserves typed nonfatal analyzer errors without flattening or restarting', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-typed-error-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const runStore = new MemoryAnalysisRunStore();
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_ERROR_CODE: 'resource_limit_exceeded',
            FAKE_ANALYZER_ERROR_RETRYABLE: 'false',
            FAKE_ANALYZER_ERROR_FATAL: 'false',
            FAKE_ANALYZER_ERROR_MARKER: path.join(root, 'typed-error.marker')
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 1
    });
    const firstChildPromise = collector.init().then(() => collector.processManager.child);
    const firstChild = await firstChildPromise;
    const first = collector.analyze(createAnalyzeRequest({
        requestId: 'typed-error-request',
        jobId: 'typed-error-job',
        conversationId: 'typed-error-conversation',
        mode: 'preview'
    }));
    await assert.rejects(
        first,
        (error) => error.code === 'resource_limit_exceeded'
            && error.retryable === false
            && error.fatal === false
    );
    const failedRun = await runStore.get('typed-error-request');
    assert.equal(failedRun.error.code, 'resource_limit_exceeded');
    assert.equal(collector.processManager.generation, 1);
    assert.equal(collector.processManager.child, firstChild);

    const recovered = await collector.analyze(createAnalyzeRequest({
        requestId: 'typed-error-request-2',
        jobId: 'typed-error-job-2',
        conversationId: 'typed-error-conversation-2',
        mode: 'preview'
    }));
    assert.equal(recovered.complete.message_type, 'complete');
    assert.equal(collector.processManager.generation, 1);
    assert.equal(collector.processManager.child, firstChild);
});

test('collector timeout sends cancel and rejects the request without hanging the process', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-timeout-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_STALL: '1'
        },
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore(),
        runStore: new MemoryAnalysisRunStore(),
        requestTimeoutMs: 100
    });
    const request = createAnalyzeRequest({
        requestId: 'request-timeout',
        jobId: 'request-timeout-job',
        conversationId: 'conversation-1',
        mode: 'preview'
    });
    await assert.rejects(
        () => collector.analyze(request, { timeoutMs: 100 }),
        (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
    );
});

for (const crashMode of ['before_batch', 'after_batch']) {
    test(`collector restarts the analyzer after a ${crashMode} exit and retries the same job`, async (t) => {
        const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), `termlink-rollout-crash-${crashMode}-`));
        let collector = null;
        t.after(async () => {
            await collector?.stop();
            await fs.promises.rm(root, { recursive: true, force: true });
        });
        const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
        const codexHome = path.join(root, 'codex-home');
        await fs.promises.mkdir(codexHome);
        collector = new CodexRolloutCollector({
            analyzerPath: process.execPath,
            analyzerArgs: [fixture],
            analyzerCwd: root,
            analyzerEnv: {
                CODEX_HOME: codexHome,
                FAKE_ANALYZER_CRASH_ONCE: crashMode,
                FAKE_ANALYZER_CRASH_MARKER: path.join(root, 'crash.marker')
            },
            store: new MemoryAnalysisStore(),
            checkpointStore: new MemoryCheckpointStore(),
            runStore: new MemoryAnalysisRunStore(),
            requestTimeoutMs: 5000
        });
        const attempts = [];
        collector.processManager.on('sent', (message) => {
            if (message.message_type === 'analyze') attempts.push(message);
        });
        const result = await collector.analyze(createAnalyzeRequest({
            requestId: `request-crash-${crashMode}`,
            jobId: `job-crash-${crashMode}`,
            conversationId: 'conversation-crash',
            mode: 'preview'
        }));
        assert.equal(result.complete.status, 'completed');
        assert.equal(result.state.batches.length, 1);
        assert.equal(result.state.items.length, 0);
        assert.equal(attempts.length, 2);
        assert.notEqual(attempts[0].request_id, attempts[1].request_id);
        assert.equal(attempts[0].job_id, attempts[1].job_id);
    });
}

test('collector can restart against file stores without duplicating the persisted batch', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-rollout-restart-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const createCollector = () => new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        store: new FileAnalysisStore({ rootDir: path.join(root, 'analysis') }),
        checkpointStore: new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') }),
        runStore: new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') }),
        requestTimeoutMs: 5000
    });
    const request = createAnalyzeRequest({
        requestId: 'request-restart',
        jobId: 'job-restart',
        conversationId: 'conversation-1',
        mode: 'preview'
    });
    const retryRequest = createAnalyzeRequest({
        requestId: 'request-restart-retry',
        jobId: 'job-restart',
        conversationId: 'conversation-1',
        mode: 'preview'
    });

    collector = createCollector();
    await collector.analyze(request);
    await collector.stop();
    collector = createCollector();
    const resumed = await collector.analyze(retryRequest);
    assert.equal(resumed.state.batches.length, 1);
    assert.equal(resumed.state.items.length, 0);
    assert.equal(resumed.state.canonical, true);
    assert.equal((await collector.runStore.get('request-restart')).status, 'completed');
    assert.equal((await collector.runStore.get('request-restart-retry')).status, 'completed');
});

test('fake analyzer quarantines stale output and deduplicates a repeated opaque delivery', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-fault-matrix-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const store = new MemoryAnalysisStore();
    const checkpointStore = new MemoryCheckpointStore();
    const runStore = new MemoryAnalysisRunStore();
    const delegate = new AnalysisBatchImporter({ store, checkpointStore });
    let acceptedImportCount = 0;
    let secondImportSettled = false;
    let completeCommitAckCount = null;
    const sent = [];
    const importer = {
        async init() {
            await delegate.init();
        },
        async importBatch(batch, options) {
            const result = await delegate.importBatch(batch, options);
            if (result?.accepted !== false && result?.persisted !== false) {
                acceptedImportCount += 1;
                if (acceptedImportCount === 2) {
                    await waitMs(25);
                    secondImportSettled = true;
                }
            }
            return result;
        },
        async commitComplete(message, options) {
            completeCommitAckCount = sent.filter((entry) => entry.message_type === 'ack').length;
            return delegate.commitComplete(message, options);
        }
    };
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_STALE_BATCH: '1',
            FAKE_ANALYZER_DUPLICATE_BATCH: '1',
            FAKE_ANALYZER_SEGMENT_ID: 'seg-rust-opaque-45',
            FAKE_ANALYZER_BATCH_ID: 'batch-rust-opaque-45'
        },
        importer,
        store,
        checkpointStore,
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 0
    });
    const inbound = [];
    const unexpected = [];
    collector.processManager.on('message', (message) => inbound.push(message));
    collector.processManager.on('sent', (message) => sent.push(message));
    collector.processManager.on('unexpectedMessage', (entry) => unexpected.push(entry));

    const request = createAnalyzeRequest({
        requestId: 'fault-matrix-request',
        jobId: 'fault-matrix-job',
        conversationId: 'fault-matrix-conversation',
        mode: 'preview'
    });
    const result = await collector.analyze(request);

    const batches = inbound.filter((message) => message.message_type === 'batch');
    const acks = sent.filter((message) => message.message_type === 'ack');
    const completes = inbound.filter((message) => message.message_type === 'complete');
    assert.equal(unexpected.length, 1);
    assert.equal(unexpected[0].request_id, 'fault-matrix-request-stale');
    assert.equal(batches.length, 3, 'stale + original + duplicate must be observable');
    assert.equal(acks.length, 2, 'both valid delivery observations must be ACKed');
    assert.ok(acks.every((ack) => (
        ack.request_id === request.request_id
        && ack.job_id === 'fault-matrix-job'
        && ack.segment_id === 'seg-rust-opaque-45'
        && ack.batch_id === 'batch-rust-opaque-45'
        && ack.accepted === true
        && ack.persisted === true
    )));
    assert.equal(acceptedImportCount, 2, 'both valid deliveries must reach the importer');
    assert.equal(secondImportSettled, true, 'the delayed duplicate callback must settle');
    assert.equal(
        completeCommitAckCount,
        2,
        'complete settlement must observe every valid batch ACK after the batch drain'
    );
    assert.equal(completes.length, 1);
    assert.equal(result.scope.sourceId, 'fake-source');
    assert.equal(result.scope.sourceEpoch, 'fake-epoch-1');
    assert.equal(result.state.receipts.length, 1);
    assert.equal(result.state.staging.length, 1);
    assert.equal(result.state.range_index.length, 1);
    assert.equal(result.state.range_index[0].index, 0);
    assert.equal((await runStore.get(request.request_id)).receipt_count, 1);
});

test('collector records a durable terminal run when late-begin compensation fail writer rejects', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-late-begin-failure-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const stores = [
        ['memory', new MemoryAnalysisRunStore()],
        ['file', await new FileAnalysisRunStore({
            rootDir: path.join(root, 'runs')
        }).init()]
    ];

    for (const [name, delegate] of stores) {
        await t.test(name, async () => {
            const codexHome = path.join(root, `codex-home-${name}`);
            await fs.promises.mkdir(codexHome);
            const failError = new Error('synthetic terminal compensation failure');
            failError.code = 'ANALYSIS_RUN_STORE_UNAVAILABLE';
            const runStore = new DelayedBeginRunStore(delegate, { failError });
            const collector = new CodexRolloutCollector({
                analyzerPath: process.execPath,
                analyzerArgs: [fixture],
                analyzerCwd: root,
                analyzerEnv: { CODEX_HOME: codexHome },
                store: new MemoryAnalysisStore(),
                checkpointStore: new MemoryCheckpointStore(),
                runStore,
                requestTimeoutMs: 1000,
                processRestartRetries: 0
            });

            const requestId = `late-begin-failure-${name}`;
            await collector.init();
            const pending = collector.analyze(createAnalyzeRequest({
                requestId,
                jobId: `late-begin-failure-job-${name}`,
                conversationId: `late-begin-failure-conversation-${name}`,
                mode: 'preview'
            }), { timeoutMs: 40 });
            await runStore.beginStarted;
            await assert.rejects(
                pending,
                (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
                    && error.details.phase === 'startup'
            );
            await collector.processManager.waitForIdle();

            runStore.releaseBegin();
            let run = null;
            for (let attempt = 0; attempt < 100; attempt += 1) {
                run = await delegate.get(requestId);
                if (run && run.status !== 'running') break;
                await waitMs(2);
            }
            assert.ok(run, 'late begin should still be persisted before compensation');
            assert.equal(runStore.failCalls, 1);
            assert.equal(run.status, 'failed');
            assert.equal(run.error.code, 'ANALYZER_RUN_COMPENSATION_FAILED');
            assert.equal(run.error.details.original_error.code, 'ANALYZER_REQUEST_TIMEOUT');
            assert.equal(
                run.error.details.compensation_error.code,
                'ANALYSIS_RUN_STORE_UNAVAILABLE'
            );
            const recoveredStore = name === 'file'
                ? await new FileAnalysisRunStore({
                    rootDir: path.join(root, 'runs')
                }).init()
                : delegate;
            assert.equal((await recoveredStore.get(requestId)).status, 'failed');
            await collector.stop();
        });
    }
});

test('collector compensates a delayed run begin after a deadline for memory and file stores', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-late-begin-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const stores = [
        ['memory', new MemoryAnalysisRunStore()],
        ['file', await new FileAnalysisRunStore({
            rootDir: path.join(root, 'runs')
        }).init()]
    ];

    for (const [name, delegate] of stores) {
        await t.test(name, async () => {
            const codexHome = path.join(root, `codex-home-${name}`);
            await fs.promises.mkdir(codexHome);
            const runStore = new DelayedBeginRunStore(delegate);
            const collector = new CodexRolloutCollector({
                analyzerPath: process.execPath,
                analyzerArgs: [fixture],
                analyzerCwd: root,
                analyzerEnv: { CODEX_HOME: codexHome },
                store: new MemoryAnalysisStore(),
                checkpointStore: new MemoryCheckpointStore(),
                runStore,
                requestTimeoutMs: 1000,
                processRestartRetries: 0
            });

            const requestId = `late-begin-${name}`;
            await collector.init();
            const pending = collector.analyze(createAnalyzeRequest({
                requestId,
                jobId: `late-begin-job-${name}`,
                conversationId: `late-begin-conversation-${name}`,
                mode: 'preview'
            }), { timeoutMs: 40 });
            await runStore.beginStarted;
            await assert.rejects(
                pending,
                (error) => error.code === 'ANALYZER_REQUEST_TIMEOUT'
                    && error.details.phase === 'startup'
            );
            await collector.processManager.waitForIdle();
            assert.equal(collector.processManager.child, null);

            runStore.releaseBegin();
            let run = null;
            for (let attempt = 0; attempt < 100; attempt += 1) {
                run = await delegate.get(requestId);
                if (run && run.status !== 'running') break;
                await waitMs(2);
            }
            assert.ok(run, 'late begin should be observable after the delayed write');
            assert.equal(run.status, 'failed');
            assert.equal(run.error.code, 'ANALYZER_REQUEST_TIMEOUT');
            assert.notEqual(run.status, 'running');
            const recoveredStore = name === 'file'
                ? await new FileAnalysisRunStore({
                    rootDir: path.join(root, 'runs')
                }).init()
                : delegate;
            assert.equal((await recoveredStore.get(requestId)).status, 'failed');
            await collector.stop();
        });
    }
});

test('collector compensates a delayed run begin when cancellation wins for memory and file stores', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-cancelled-begin-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const stores = [
        ['memory', new MemoryAnalysisRunStore()],
        ['file', await new FileAnalysisRunStore({
            rootDir: path.join(root, 'runs')
        }).init()]
    ];

    for (const [name, delegate] of stores) {
        await t.test(name, async () => {
            const codexHome = path.join(root, `codex-home-${name}`);
            await fs.promises.mkdir(codexHome);
            const runStore = new DelayedBeginRunStore(delegate);
            const collector = new CodexRolloutCollector({
                analyzerPath: process.execPath,
                analyzerArgs: [fixture],
                analyzerCwd: root,
                analyzerEnv: { CODEX_HOME: codexHome },
                store: new MemoryAnalysisStore(),
                checkpointStore: new MemoryCheckpointStore(),
                runStore,
                requestTimeoutMs: 1000,
                processRestartRetries: 0
            });

            const requestId = `cancelled-begin-${name}`;
            await collector.init();
            const pending = collector.analyze(createAnalyzeRequest({
                requestId,
                jobId: `cancelled-begin-job-${name}`,
                conversationId: `cancelled-begin-conversation-${name}`,
                mode: 'preview'
            }), { timeoutMs: 1000 });
            await runStore.beginStarted;
            assert.equal(collector.cancel(requestId, 'user_cancelled'), true);
            runStore.releaseBegin();
            await assert.rejects(
                pending,
                (error) => error.code === 'ANALYZER_REQUEST_CANCELLED'
                    && error.details.reason === 'user_cancelled'
            );

            let run = null;
            for (let attempt = 0; attempt < 100; attempt += 1) {
                run = await delegate.get(requestId);
                if (run && run.status !== 'running') break;
                await waitMs(2);
            }
            assert.ok(run, 'cancelled delayed begin should be observable after the delayed write');
            assert.equal(run.status, 'failed');
            assert.equal(run.error.code, 'ANALYZER_REQUEST_CANCELLED');
            await collector.stop();
        });
    }
});

test('collector preserves delayed run-store begin failures without a running artifact', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-begin-failure-'));
    t.after(() => fs.promises.rm(root, { recursive: true, force: true }));
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const stores = [
        ['memory', new MemoryAnalysisRunStore()],
        ['file', await new FileAnalysisRunStore({
            rootDir: path.join(root, 'runs')
        }).init()]
    ];

    for (const [name, delegate] of stores) {
        await t.test(name, async () => {
            const beginError = new Error('synthetic run-store failure');
            beginError.code = 'ANALYSIS_RUN_STORE_UNAVAILABLE';
            const codexHome = path.join(root, `codex-home-${name}`);
            await fs.promises.mkdir(codexHome);
            const runStore = new DelayedBeginRunStore(delegate, { beginError });
            const collector = new CodexRolloutCollector({
                analyzerPath: process.execPath,
                analyzerArgs: [fixture],
                analyzerCwd: root,
                analyzerEnv: { CODEX_HOME: codexHome },
                store: new MemoryAnalysisStore(),
                checkpointStore: new MemoryCheckpointStore(),
                runStore,
                requestTimeoutMs: 1000,
                processRestartRetries: 0
            });

            const requestId = `begin-failure-${name}`;
            await collector.init();
            const pending = collector.analyze(createAnalyzeRequest({
                requestId,
                jobId: `begin-failure-job-${name}`,
                conversationId: `begin-failure-conversation-${name}`,
                mode: 'preview'
            }), { timeoutMs: 1000 });
            await runStore.beginStarted;
            runStore.releaseBegin();
            await assert.rejects(
                pending,
                (error) => error.code === 'ANALYSIS_RUN_STORE_UNAVAILABLE'
            );
            assert.equal(await delegate.get(requestId), null);
            await collector.stop();
        });
    }
});

test('collector retries a failed staging attempt with the same opaque identity and only a new request id', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-opaque-retry-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const fixture = path.resolve(__dirname, 'fixtures/codex-rollout-collector/fake-analyzer.js');
    const delegate = new AnalysisBatchImporter({
        store: new MemoryAnalysisStore(),
        checkpointStore: new MemoryCheckpointStore()
    });
    await delegate.init();
    let rejectFirstBatch = true;
    const importer = {
        async init() {
            await delegate.init();
        },
        async importBatch(message, options) {
            if (rejectFirstBatch) {
                rejectFirstBatch = false;
                throw new Error('synthetic staging unavailable');
            }
            return delegate.importBatch(message, options);
        },
        async commitComplete(message, options) {
            return delegate.commitComplete(message, options);
        }
    };
    const runStore = new MemoryAnalysisRunStore();
    collector = new CodexRolloutCollector({
        analyzerPath: process.execPath,
        analyzerArgs: [fixture],
        analyzerCwd: root,
        analyzerEnv: {
            CODEX_HOME: codexHome,
            FAKE_ANALYZER_SEGMENT_ID: 'seg-rust-opaque-retry',
            FAKE_ANALYZER_BATCH_ID: 'batch-rust-opaque-retry'
        },
        importer,
        store: delegate.store,
        checkpointStore: delegate.checkpointStore,
        runStore,
        requestTimeoutMs: 3000,
        processRestartRetries: 1
    });
    const attempts = [];
    const batches = [];
    collector.processManager.on('sent', (message) => {
        if (message.message_type === 'analyze') attempts.push(message);
    });
    collector.processManager.on('message', (message) => {
        if (message.message_type === 'batch') batches.push(message);
    });

    const request = createAnalyzeRequest({
        requestId: 'opaque-retry-request',
        jobId: 'opaque-retry-job',
        conversationId: 'opaque-retry-conversation',
        mode: 'preview'
    });
    const result = await collector.analyze(request);

    assert.equal(attempts.length, 2);
    assert.equal(batches.length, 2);
    assert.notEqual(attempts[0].request_id, attempts[1].request_id);
    assert.equal(attempts[0].job_id, attempts[1].job_id);
    assert.equal(attempts[0].conversation_id, attempts[1].conversation_id);
    assert.equal(attempts[0].mode, attempts[1].mode);
    assert.equal(Object.hasOwn(attempts[0], 'source_spec'), false);
    assert.equal(Object.hasOwn(attempts[1], 'source_spec'), false);
    assert.equal(Object.hasOwn(attempts[0], 'replay'), false);
    assert.deepEqual(attempts[1].recovery, {
        segment_id: 'seg-rust-opaque-retry',
        batch_id: 'batch-rust-opaque-retry'
    });
    assert.equal(batches[0].segment_id, 'seg-rust-opaque-retry');
    assert.equal(batches[1].segment_id, batches[0].segment_id);
    assert.equal(batches[0].batch_id, 'batch-rust-opaque-retry');
    assert.equal(batches[1].batch_id, batches[0].batch_id);
    assert.notEqual(batches[0].segment_id, `segment-${request.job_id}`);
    assert.notEqual(batches[0].batch_id, `batch-${request.job_id}`);
    assert.equal(result.requestId, attempts[1].request_id);
    const run = await runStore.get(request.request_id);
    assert.equal(run.status, 'completed');
    assert.equal(run.retry_count, 1);
    assert.deepEqual(run.recovery_delivery, {
        job_id: request.job_id,
        segment_id: 'seg-rust-opaque-retry',
        batch_id: 'batch-rust-opaque-retry',
        request_id: attempts[1].request_id
    });
});

test('collector completes and restarts against the real Rust target with checkpoint identity reuse', async (t) => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'termlink-target-real-rust-'));
    let collector = null;
    t.after(async () => {
        await collector?.stop();
        await fs.promises.rm(root, { recursive: true, force: true });
    });
    const codexHome = path.join(root, 'codex-home');
    await fs.promises.mkdir(codexHome);
    const sessionsRoot = await stageRustTargetSession(codexHome);
    const analyzerPath = await resolveRustTargetBinary();
    const stateRoot = path.join(root, 'state');
    const createCollector = () => new CodexRolloutCollector({
        analyzerPath,
        analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: codexHome },
        store: new FileAnalysisStore({ rootDir: path.join(stateRoot, 'analysis') }),
        checkpointStore: new FileCheckpointStore({ rootDir: path.join(stateRoot, 'checkpoints') }),
        runStore: new FileAnalysisRunStore({ rootDir: path.join(stateRoot, 'runs') }),
        requestTimeoutMs: 10000,
        processRestartRetries: 0
    });
    const request = createAnalyzeRequest({
        requestId: 'real-rust-request-1',
        jobId: 'real-rust-job-1',
        conversationId: RUST_TARGET_CONVERSATION_ID,
        mode: 'preview'
    });
    const fixtureBytes = (await fs.promises.stat(RUST_TARGET_FIXTURE)).size;

    collector = createCollector();
    const firstSent = [];
    const firstInbound = [];
    collector.processManager.on('sent', (message) => firstSent.push(message));
    collector.processManager.on('message', (message) => firstInbound.push(message));
    const first = await collector.analyze(request);
    const firstBatch = firstInbound.find((message) => message.message_type === 'batch');
    const firstComplete = firstInbound.find((message) => message.message_type === 'complete');
    assert.ok(firstBatch);
    assert.ok(firstComplete);
    assert.deepEqual(collector.processManager.startupArgs, [
        '--startup-config-version',
        '1',
        '--sessions-root',
        path.normalize(path.resolve(sessionsRoot))
    ]);
    assert.deepEqual(firstSent.map((message) => message.message_type), [
        'hello',
        'analyze',
        'ack'
    ]);
    assert.deepEqual(firstInbound.map((message) => message.message_type), [
        'hello',
        'batch',
        'complete'
    ]);
    assert.equal(firstBatch.request_id, request.request_id);
    assert.equal(firstBatch.job_id, request.job_id);
    assert.match(firstBatch.segment_id, /^seg-[0-9a-f]{32}$/);
    assert.match(firstBatch.batch_id, /^batch-[0-9a-f]{32}$/);
    assert.deepEqual(firstBatch.payload.source_range, { start: 0, end: fixtureBytes });
    assert.equal(firstBatch.payload.next_cursor.snapshot_boundary.byte_length, fixtureBytes);
    assert.equal(firstBatch.payload.next_cursor.last_complete_line.byte_end, fixtureBytes);
    assert.equal(firstBatch.payload.next_cursor.last_complete_line.physical_line_ordinal, 2);
    assert.equal(firstComplete.request_id, request.request_id);
    assert.equal(firstComplete.status, 'partial');
    assert.equal(firstComplete.completeness, 'provisional');
    assert.equal(firstComplete.checkpoint.projection_watermark.segment_id, firstBatch.segment_id);
    assert.equal(firstComplete.checkpoint.projection_watermark.batch_id, firstBatch.batch_id);
    assert.equal(first.scope.conversationId, RUST_TARGET_CONVERSATION_ID);
    assert.equal(first.scope.sourceId, RUST_TARGET_CONVERSATION_ID);
    assert.match(first.scope.sourceEpoch, /^lineage:/);
    assert.equal(first.state.items.length, 2);
    assert.equal(first.state.receipts.length, 1);
    assert.equal(first.state.range_index[0].index, 0);

    const persistedCheckpoint = await collector.checkpointStore.load(first.scope);
    assert.ok(persistedCheckpoint);
    assert.equal(persistedCheckpoint.job_id, request.job_id);
    assert.equal(persistedCheckpoint.request_id, request.request_id);
    assert.equal(
        persistedCheckpoint.projection_watermark.segment_id,
        firstBatch.segment_id
    );
    assert.equal(
        persistedCheckpoint.projection_watermark.batch_id,
        firstBatch.batch_id
    );
    await collector.stop();

    collector = createCollector();
    const restartSent = [];
    const restartInbound = [];
    collector.processManager.on('sent', (message) => restartSent.push(message));
    collector.processManager.on('message', (message) => restartInbound.push(message));
    const restarted = await collector.analyze(createAnalyzeRequest({
        requestId: 'real-rust-request-2',
        jobId: request.job_id,
        conversationId: request.conversation_id,
        mode: request.mode,
        cursor: persistedCheckpoint.cursor,
        persistedAnchor: persistedCheckpoint,
        recovery: {
            segment_id: firstBatch.segment_id,
            batch_id: firstBatch.batch_id
        }
    }));
    const restartedBatch = restartInbound.find((message) => message.message_type === 'batch');
    assert.ok(restartedBatch);
    assert.deepEqual(restartSent.map((message) => message.message_type), [
        'hello',
        'analyze',
        'ack'
    ]);
    const restartAnalyze = restartSent.find((message) => message.message_type === 'analyze');
    assert.equal(restartAnalyze.request_id, 'real-rust-request-2');
    assert.equal(restartAnalyze.job_id, request.job_id);
    assert.deepEqual(restartAnalyze.recovery, {
        segment_id: firstBatch.segment_id,
        batch_id: firstBatch.batch_id
    });
    assert.equal(restartedBatch.request_id, 'real-rust-request-2');
    assert.equal(restartedBatch.segment_id, firstBatch.segment_id);
    assert.equal(restartedBatch.batch_id, firstBatch.batch_id);
    assert.equal(restarted.state.receipts.length, 1);
    assert.equal(restarted.state.range_index[0].index, 0);
    assert.equal((await collector.runStore.get('real-rust-request-2')).status, 'completed');
});
