'use strict';

const fs = require('node:fs');
const readline = require('node:readline');

const PROTOCOL_VERSION = 1;
const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const pendingBatches = new Map();

if (process.env.FAKE_ANALYZER_ARGV_FILE) {
    fs.writeFileSync(
        process.env.FAKE_ANALYZER_ARGV_FILE,
        JSON.stringify(process.argv.slice(2)),
        'utf8'
    );
}

function helloResponse(message) {
    const mode = process.env.FAKE_ANALYZER_HELLO_MODE || 'valid';
    const role = mode === 'wrong_role' ? 'node' : 'analyzer';
    const capabilities = mode === 'missing_capability'
        ? ['analyze_v1', 'cancel', 'checkpoint']
        : ['analyze_v1', 'cancel', 'checkpoint', 'ack'];
    const response = {
        protocol_version: mode === 'wrong_protocol' ? PROTOCOL_VERSION + 1 : PROTOCOL_VERSION,
        message_type: 'hello',
        request_id: mode === 'mismatch_request'
            ? `${message.request_id}-mismatch`
            : message.request_id,
        role,
        capabilities,
        analyzer_version: 'fake-stage4',
        parser_backend: 'fake',
        compatibility_layer_version: 'fake'
    };
    const delayMs = Number(process.env.FAKE_ANALYZER_HELLO_DELAY_MS || 0);
    if (Number.isFinite(delayMs) && delayMs > 0) {
        setTimeout(() => write(response), delayMs);
    } else {
        write(response);
    }
}

function crashOnce(mode) {
    if (process.env.FAKE_ANALYZER_CRASH_ONCE !== mode) return false;
    const marker = process.env.FAKE_ANALYZER_CRASH_MARKER;
    if (!marker || fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, 'crashed\n', 'utf8');
    return true;
}

function booleanEnv(value) {
    return value === '1' || value === 'true';
}

function injectedAnalyzerErrorOnce() {
    const fatalMode = process.env.FAKE_ANALYZER_FATAL_MODE;
    const code = fatalMode
        ? (process.env.FAKE_ANALYZER_FATAL_CODE || 'fake_fatal')
        : process.env.FAKE_ANALYZER_ERROR_CODE;
    if (!code) return null;
    const marker = fatalMode
        ? process.env.FAKE_ANALYZER_FATAL_MARKER
        : process.env.FAKE_ANALYZER_ERROR_MARKER;
    if (marker && fs.existsSync(marker)) return null;
    if (marker) fs.writeFileSync(marker, 'injected\n', 'utf8');
    return {
        code,
        message: process.env.FAKE_ANALYZER_ERROR_MESSAGE || code,
        retryable: fatalMode
            ? fatalMode === 'retryable'
            : booleanEnv(process.env.FAKE_ANALYZER_ERROR_RETRYABLE),
        fatal: fatalMode
            ? true
            : booleanEnv(process.env.FAKE_ANALYZER_ERROR_FATAL)
    };
}

function writeAndExit(message, code) {
    process.stdout.write(`${JSON.stringify(message)}\n`, () => process.exit(code));
}

function targetCursor({ conversationId, sourceId, sourceEpoch }) {
    return {
        schema_version: 1,
        reader_backend: 'fake',
        reader_version: '1',
        cursor_kind: 'backfill',
        conversation_id: conversationId,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        source_kind: 'rollout',
        compression: 'plain_jsonl',
        snapshot_boundary: { unit: 'physical_bytes', byte_length: 10 },
        complete_range: { start: 0, end: 10 },
        last_complete_line: {
            physical_line_ordinal: 1,
            byte_start: 0,
            byte_end: 10
        },
        last_rollout_ordinal: null,
        capabilities: {
            forward_stream: true,
            tail_preview: false,
            backward_segments: true,
            append: false,
            random_seek: false
        }
    };
}

function targetBatchFor(message) {
    const sourceId = process.env.FAKE_ANALYZER_SOURCE_ID || 'fake-source';
    const sourceEpoch = process.env.FAKE_ANALYZER_SOURCE_EPOCH || 'fake-epoch-1';
    // These values model Rust-owned opaque delivery identities.  The default
    // keeps older fixture scenarios readable, while the overrides let a
    // retry test prove that Node carries arbitrary Rust identities forward
    // instead of deriving them from job/request text.
    const segmentId = process.env.FAKE_ANALYZER_SEGMENT_ID
        || `segment-${message.job_id}`;
    const batchId = process.env.FAKE_ANALYZER_BATCH_ID
        || `batch-${message.job_id}`;
    const cursor = targetCursor({
        conversationId: message.conversation_id,
        sourceId,
        sourceEpoch
    });
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'batch',
        request_id: message.request_id,
        job_id: message.job_id,
        segment_id: segmentId,
        batch_id: batchId,
        payload: {
            conversation_id: message.conversation_id,
            source_id: sourceId,
            source_epoch: sourceEpoch,
            source_range: { start: 0, end: 10 },
            history_items: [],
            diagnostics: [],
            parser_provenance: {
                parser_backend: 'fake',
                wire_source_revision: 'fake-wire',
                compatibility_profile: 'current'
            },
            complete: true,
            completeness: 'canonical',
            projection: {
                schema: 'fake-target-projection',
                schema_version: 1,
                conversation_id: message.conversation_id,
                complete: true,
                provisional: false,
                coverage: 'complete',
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
                has_more: false
            },
            next_cursor: cursor,
            reducer_state: {
                schema_version: 1,
                reducer_id: 'fake.reducer',
                reducer_version: '1',
                payload: {}
            },
            mutations: [{ mutation: 'complete_range', source_range: { start: 0, end: 10 } }]
        }
    };
}

function targetCompleteFor(pending) {
    const cursor = pending.batch.payload.next_cursor;
    const source = pending.batch.payload;
    return {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'complete',
        request_id: pending.request_id,
        job_id: pending.batch.job_id,
        status: 'completed',
        completeness: 'canonical',
        next_cursor: cursor,
        checkpoint: {
            schema_version: 1,
            job_id: pending.batch.job_id,
            request_id: pending.request_id,
            conversation_id: source.conversation_id,
            source: {
                source_id: source.source_id,
                source_epoch: source.source_epoch,
                source_range: source.source_range,
                snapshot_boundary: {
                    unit: 'physical_bytes',
                    byte_length: 10
                }
            },
            reader: {
                backend: 'fake',
                version: '1',
                source_kind: 'rollout',
                compression: 'plain_jsonl'
            },
            wire_profile: {
                parser_backend: 'fake',
                wire_source_revision: 'fake-wire',
                compatibility_profile: 'current'
            },
            cursor_kind: cursor.cursor_kind,
            cursor,
            segment: {
                source_range: source.source_range,
                physical_line_start: 1,
                physical_line_end: 1,
                rollout_ordinal: null
            },
            reducer_state: source.reducer_state,
            projection_watermark: {
                schema_version: 1,
                segment_id: pending.batch.segment_id,
                batch_id: pending.batch.batch_id,
                source_id: source.source_id,
                source_epoch: source.source_epoch,
                complete_source_end: 10,
                logical_item_count: 0
            },
            completeness: 'canonical',
            lineage_checkpoint: null
        }
    };
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
    if (!line.trim()) return;
    const message = JSON.parse(line);
    if (message.message_type === 'hello') {
        helloResponse(message);
        return;
    }
    if (message.message_type === 'cancel') {
        if (process.env.FAKE_ANALYZER_IGNORE_CANCEL === '1') return;
        write({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'error',
            request_id: message.request_id,
            code: 'cancelled',
            message: 'cancelled',
            retryable: true,
            fatal: false
        });
        return;
    }
    if (message.message_type === 'ack') {
        const pending = pendingBatches.get(message.request_id);
        if (!pending) return;
        pendingBatches.delete(message.request_id);
        if (!message.accepted || !message.persisted) {
            const rejectionCode = [
                'batch_validation_failed',
                'batch_scope_conflict',
                'staging_unavailable'
            ].includes(message.error)
                ? message.error
                : 'batch_validation_failed';
            const rejection = {
                protocol_version: PROTOCOL_VERSION,
                message_type: 'error',
                request_id: message.request_id,
                code: 'batch_rejected',
                message: 'batch was not accepted',
                details: { rejection_code: rejectionCode },
                retryable: rejectionCode === 'staging_unavailable',
                fatal: false
            };
            const delayMs = Number(process.env.FAKE_ANALYZER_BATCH_REJECTION_DELAY_MS || 0);
            if (Number.isFinite(delayMs) && delayMs > 0) {
                setTimeout(() => write(rejection), delayMs);
            } else {
                write(rejection);
            }
            return;
        }
        const complete = targetCompleteFor(pending);
        const delayMs = Number(process.env.FAKE_ANALYZER_COMPLETE_DELAY_MS || 0);
        if (Number.isFinite(delayMs) && delayMs > 0) {
            setTimeout(() => write(complete), delayMs);
        } else {
            write(complete);
        }
        return;
    }
    if (message.message_type !== 'analyze') return;
    if (process.env.FAKE_ANALYZER_STALL === '1') return;

    const injectedError = injectedAnalyzerErrorOnce();
    if (injectedError) {
        write({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'error',
            request_id: message.request_id,
            ...injectedError
        });
        return;
    }

    if (!message.source_spec && message.job_id && message.conversation_id) {
        if (crashOnce('before_batch')) process.exit(71);
        const batch = targetBatchFor(message);
        pendingBatches.set(message.request_id, {
            request_id: message.request_id,
            batch
        });
        const emitBatch = () => {
            if (crashOnce('after_batch')) {
                writeAndExit(batch, 72);
                return;
            }
            if (booleanEnv(process.env.FAKE_ANALYZER_STALE_BATCH)) {
                // This is a stale correlation example: it is valid target
                // data, but belongs to no active request_id.  The process
                // manager must quarantine it without touching staging.
                write({
                    ...structuredClone(batch),
                    request_id: `${message.request_id}-stale`
                });
            }
            write(batch);
            if (booleanEnv(process.env.FAKE_ANALYZER_DUPLICATE_BATCH)) {
                // Emit the same delivery twice before the ACK round trip so
                // the importer/receipt path must prove idempotence.
                write(structuredClone(batch));
            }
        };
        const delayMs = Number(process.env.FAKE_ANALYZER_BATCH_DELAY_MS || 0);
        if (Number.isFinite(delayMs) && delayMs > 0) setTimeout(emitBatch, delayMs);
        else emitBatch();
        return;
    }

    throw new Error('fake analyzer requires target analyze identity');
});

input.on('close', () => {
    // Keep the process alive until the parent explicitly stops it. This makes
    // the ACK/complete handshake observable in integration tests.
});
