'use strict';

const fs = require('node:fs');
const readline = require('node:readline');

const PROTOCOL_VERSION = 1;
const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const pendingBatches = new Map();

function crashOnce(mode) {
    if (process.env.FAKE_ANALYZER_CRASH_ONCE !== mode) return false;
    const marker = process.env.FAKE_ANALYZER_CRASH_MARKER;
    if (!marker || fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, 'crashed\n', 'utf8');
    return true;
}

function writeAndExit(message, code) {
    process.stdout.write(`${JSON.stringify(message)}\n`, () => process.exit(code));
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
    if (!line.trim()) return;
    const message = JSON.parse(line);
    if (message.message_type === 'hello') {
        write({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'hello',
            request_id: message.request_id,
            role: 'analyzer',
            analyzer_version: 'fake-stage4',
            capabilities: ['analyze', 'ack', 'checkpoint'],
            parser_backend: 'fake',
            compatibility_layer_version: 'fake'
        });
        return;
    }
    if (message.message_type === 'cancel') {
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
            write({
                protocol_version: PROTOCOL_VERSION,
                message_type: 'error',
                request_id: message.request_id,
                code: 'batch_not_accepted',
                message: 'batch was not accepted',
                retryable: false,
                fatal: false
            });
            return;
        }
        write({
            protocol_version: PROTOCOL_VERSION,
            message_type: 'complete',
            request_id: message.request_id,
            status: 'completed',
            completeness: pending.completeness,
            next_cursor: null,
            checkpoint: {
                schema_version: 1,
                request_id: message.request_id,
                conversation_id: pending.conversation_id,
                reader: { backend: 'fake', version: '1', source_kind: 'rollout', compression: 'plain_jsonl' },
                wire_profile: {
                    parser_backend: 'fake',
                    wire_source_revision: 'fake',
                    compatibility_profile: 'current'
                },
                cursor_kind: null,
                cursor: null,
                segment: { source_range: pending.source_range },
                reducer_state: pending.reducer_state,
                projection_watermark: pending.batch_id,
                source: {
                    source_id: pending.source_id,
                    source_epoch: pending.source_epoch,
                    fingerprint: pending.source_fingerprint,
                    prefix_anchor: pending.source_prefix_anchor
                },
                completeness: pending.completeness
            }
        });
        return;
    }
    if (message.message_type !== 'analyze') return;
    if (message.mode === 'stall') return;

    if (crashOnce('before_batch')) {
        process.exit(71);
    }

    const sourceId = message.source_spec.source_id;
    const sourceEpoch = message.source_spec.source_epoch;
    const canonical = message.mode !== 'preview';
    const batchId = `${message.request_id}:batch-0`;
    const itemKey = 'event:1';
    const batch = {
        protocol_version: PROTOCOL_VERSION,
        message_type: 'batch',
        request_id: message.request_id,
        batch_id: batchId,
        conversation_id: message.conversation_id,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        replace_previous: Boolean(message.replace_previous),
        source_range: { start: 0, end: 10 },
        history_items: [{
            event_type: 'UserMessage',
            item_key: itemKey,
            event_id: 'physical:1',
            payload: { metadata: { item_key: itemKey, event_id: 'physical:1' }, text: 'hello' }
        }],
        diagnostics: [],
        parser_provenance: {
            parser_backend: 'fake',
            wire_source_revision: 'fake',
            compatibility_profile: 'current'
        },
        complete: canonical,
        completeness: canonical ? 'canonical' : 'provisional',
        projection: {
            schema: 'fake-projection',
            schema_version: 1,
            conversation_id: message.conversation_id,
            complete: canonical,
            provisional: !canonical,
            availability: 'present',
            turns: [],
            diagnostics: [],
            usage_total: null
        },
        tool_details: [],
        usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
        task_outcomes: [],
        progress: { records_seen: 1, records_emitted: 1, bytes_scanned: 10, has_more: !canonical },
        next_cursor: null,
        source_fingerprint: {
            algorithm: 'sha256-v1',
            digest: `source-${batchId}`,
            covered_bytes: 10
        },
        source_prefix_anchor: {
            algorithm: 'sha256-v1',
            digest: `prefix-${batchId}`,
            end_offset: 10
        },
        reducer_state: { schema_version: 1, adapter: {}, reducer: {} },
        mutations: canonical
            ? [{ mutation: 'complete_range', source_range: { start: 0, end: 10 } }]
            : [{ mutation: 'mark_partial', source_range: { start: 0, end: 10 } }]
    };
    pendingBatches.set(message.request_id, {
        conversation_id: message.conversation_id,
        source_id: sourceId,
        source_epoch: sourceEpoch,
        completeness: batch.completeness,
        batch_id: batch.batch_id,
        source_range: batch.source_range,
        source_fingerprint: batch.source_fingerprint,
        source_prefix_anchor: batch.source_prefix_anchor,
        reducer_state: batch.reducer_state
    });
    if (crashOnce('after_batch')) {
        writeAndExit(batch, 72);
        return;
    }
    write(batch);
});

input.on('close', () => {
    // Keep the process alive until the parent explicitly stops it. This makes
    // the ACK/complete handshake observable in integration tests.
});
