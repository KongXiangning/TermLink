'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { resolveRustTargetBinary } = require('./fixtures/codex-rollout-collector/rust-target');

const execFileAsync = promisify(execFile);
const conversationId = '019b2b40-beb6-7b23-bed0-37d570e76816';
const fileName = `rollout-2026-08-26T00-00-00-${conversationId}.jsonl`;

function line(ordinal, type, payload) {
    return JSON.stringify({ timestamp: `2026-08-26T00:00:${String(ordinal).padStart(2, '0')}.000Z`, ordinal, type, payload }) + '\n';
}

function fixture() {
    const events = [
        ['session_meta', {
            id: conversationId, timestamp: '2026-08-26T00:00:00.000Z',
            cwd: 'file:///synthetic/private/workspace', originator: 'codex_cli',
            cli_version: '0.70.0', source: 'cli', model_provider: 'openai', git: {}
        }],
        ['event_msg', { type: 'task_started', turn_id: 'turn-1', model_context_window: 258400, collaboration_mode_kind: 'default' }],
        ['event_msg', { type: 'user_message', client_id: 'client-1', message: '独立生命周期验证', images: [] }],
        ['event_msg', { type: 'agent_message', message: '精确回复一', phase: 'commentary' }],
        ['event_msg', { type: 'item_completed', thread_id: conversationId, turn_id: 'turn-1', item: {
            type: 'FileChange', id: 'file-1', status: 'completed', changes: {
                'src/app.rs': { type: 'update', unified_diff: '@@ -1 +1 @@\n-old\n+new\n', move_path: null },
                'src/new.rs': { type: 'add', content: 'new file\n' }
            }
        } }],
        ['event_msg', { type: 'item_completed', thread_id: conversationId, turn_id: 'turn-1', item: {
            type: 'CommandExecution', id: 'command-1', command: ['cargo', 'test'],
            cwd: 'file:///synthetic/private/workspace', parsed_cmd: [], source: 'agent',
            status: 'completed', stdout: 'stdout-only', stderr: 'stderr-only',
            aggregated_output: 'ok 3 passed\n', exit_code: 0,
            duration: { secs: 1, nanos: 500000000 }
        } }],
        ['event_msg', { type: 'task_complete', turn_id: 'turn-1', last_agent_message: '精确回复一', duration_ms: 1500 }]
    ];
    // Force bounded backfill to cross physical windows without changing the
    // independent expected file and tool facts above.
    for (let i = 0; i < 12; i++) {
        events.splice(events.length - 1, 0, ['event_msg', {
            type: 'agent_message', message: `补齐窗口 ${i}: ${'x'.repeat(90)}`, phase: 'commentary'
        }]);
    }
    return events.map(([type, payload], ordinal) => line(ordinal, type, payload)).join('');
}

function hash(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

async function child(configPath, outputPath) {
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    const {
        CodexRolloutCollector, FileAnalysisStore, FileCheckpointStore, FileAnalysisRunStore
    } = require('../src/services/codexRolloutCollector');
    const { createAnalyzeRequest } = require('../src/services/codexRolloutCollector/analyzerProtocol');
    const root = config.root;
    const store = new FileAnalysisStore({ rootDir: path.join(root, 'analysis') });
    const checkpointStore = new FileCheckpointStore({ rootDir: path.join(root, 'checkpoints') });
    const runStore = new FileAnalysisRunStore({ rootDir: path.join(root, 'runs') });
    if (config.inspectOnly) {
        await fs.writeFile(outputPath, JSON.stringify({
            state: await store.snapshot(config.scope),
            checkpoint: await checkpointStore.load(config.scope),
            run: await runStore.get(config.inspectRunId)
        }));
        return;
    }
    const collector = new CodexRolloutCollector({
        analyzerPath: await resolveRustTargetBinary(), analyzerCwd: root,
        analyzerEnv: { CODEX_HOME: path.join(root, 'codex-home') },
        store, checkpointStore, runStore,
        requestTimeoutMs: 15000, processRestartRetries: 0
    });
    const messages = [];
    const sent = [];
    collector.processManager.on('message', (message) => messages.push(message));
    collector.processManager.on('sent', (message) => sent.push(message));
    let result;
    try {
        try {
            const analyzed = await collector.analyze(createAnalyzeRequest(config.request));
            const batch = messages.find((message) => message.message_type === 'batch');
            const beforeDuplicate = analyzed.state.items.length;
            if (config.duplicateDelivery) {
                assert.ok(batch, 'duplicate delivery must come from real Rust');
                const duplicate = await collector.importer.importBatch(batch);
                assert.equal(duplicate.duplicate, true);
            }
            const state = await collector.store.snapshot(analyzed.scope);
            assert.equal(state.items.length, beforeDuplicate);
            result = {
                complete: analyzed.complete, scope: analyzed.scope, state,
                checkpoint: await collector.checkpointStore.load(analyzed.scope),
                run: await collector.runStore.get(config.request.requestId),
                batchCount: messages.filter((message) => message.message_type === 'batch').length,
                batchIdentity: batch && { requestId: batch.request_id, jobId: batch.job_id,
                    segmentId: batch.segment_id, batchId: batch.batch_id },
                sentAnalyze: sent.find((message) => message.message_type === 'analyze'),
                rustGeneration: collector.processManager.generation
            };
        } catch (error) {
            result = { error: { code: error.code, message: error.message },
                batchCount: messages.filter((message) => message.message_type === 'batch').length };
        }
        await fs.writeFile(outputPath, JSON.stringify(result));
    } finally {
        await collector.stop();
    }
}

async function runNode(root, request, options = {}) {
    const id = request.requestId;
    const configPath = path.join(root, `${id}.input.json`);
    const outputPath = path.join(root, `${id}.output.json`);
    await fs.writeFile(configPath, JSON.stringify({ root, request, ...options }));
    await execFileAsync(process.execPath, [__filename, '--isolated-child', configPath, outputPath], {
        cwd: path.resolve(__dirname, '..'), timeout: 30000, windowsHide: true,
        env: { ...process.env, CODEX_HOME: path.join(root, 'codex-home') }
    });
    return JSON.parse(await fs.readFile(outputPath, 'utf8'));
}

if (process.argv[2] === '--isolated-child') {
    child(process.argv[3], process.argv[4]).catch((error) => {
        process.stderr.write(`${error.stack || error}\n`);
        process.exitCode = 1;
    });
} else {
    const test = require('node:test');
    test('real Node and Rust processes preserve bounded history and rich facts across File store reopen', async (t) => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'termlink-isolated-lifecycle-'));
        t.after(() => fs.rm(root, { recursive: true, force: true }));
        const sessionDir = path.join(root, 'codex-home', 'sessions', '2026', '08', '26');
        await fs.mkdir(sessionDir, { recursive: true });
        const source = path.join(sessionDir, fileName);
        const original = fixture();
        await fs.writeFile(source, original);
        assert.ok(Buffer.byteLength(original) > 1000);
        const binary = await resolveRustTargetBinary();
        assert.ok(hash(await fs.readFile(binary)));
        const base = { conversationId, resourceLimits: {
            max_line_bytes: 1000, max_segment_bytes: 1000, max_decoded_bytes: 50000
        } };
        const preview = await runNode(root, { ...base, requestId: 'lifecycle-preview',
            jobId: 'lifecycle-preview-job', mode: 'preview',
            resourceLimits: { ...base.resourceLimits, tail_bytes: 600 } });
        assert.equal(preview.error, undefined, JSON.stringify(preview.error));
        assert.notEqual(preview.complete.completeness, 'canonical');
        const previewRetry = await runNode(root, { ...base, requestId: 'lifecycle-preview-retry',
            jobId: 'lifecycle-preview-job', mode: 'preview',
            resourceLimits: { ...base.resourceLimits, tail_bytes: 600 },
            cursor: preview.checkpoint.cursor, persistedAnchor: preview.checkpoint,
            recovery: { segment_id: preview.batchIdentity.segmentId,
                batch_id: preview.batchIdentity.batchId } });
        assert.equal(previewRetry.error, undefined, JSON.stringify(previewRetry.error));
        assert.notEqual(previewRetry.batchIdentity.requestId, preview.batchIdentity.requestId);
        assert.equal(previewRetry.batchIdentity.jobId, preview.batchIdentity.jobId);
        assert.equal(previewRetry.batchIdentity.segmentId, preview.batchIdentity.segmentId);
        assert.equal(previewRetry.batchIdentity.batchId, preview.batchIdentity.batchId);
        assert.deepEqual(previewRetry.sentAnalyze.recovery, {
            segment_id: preview.batchIdentity.segmentId, batch_id: preview.batchIdentity.batchId
        });
        assert.deepEqual(previewRetry.scope, preview.scope);
        assert.deepEqual(previewRetry.state.items, preview.state.items);
        assert.equal(previewRetry.state.receipts.length, preview.state.receipts.length);
        assert.equal(previewRetry.checkpoint.job_id, preview.checkpoint.job_id);
        assert.equal(previewRetry.sentAnalyze.request_id, 'lifecycle-preview-retry');
        assert.equal(previewRetry.checkpoint.request_id, 'lifecycle-preview');
        assert.equal(previewRetry.checkpoint.projection_watermark.segment_id, preview.batchIdentity.segmentId);
        assert.equal(previewRetry.checkpoint.projection_watermark.batch_id, preview.batchIdentity.batchId);
        assert.equal(previewRetry.run.status, 'completed');
        const backfill = await runNode(root, { ...base, requestId: 'lifecycle-backfill',
            jobId: 'lifecycle-backfill-job', mode: 'backfill' }, { duplicateDelivery: true });
        assert.equal(backfill.error, undefined, JSON.stringify(backfill.error));
        assert.equal(backfill.complete.completeness, 'canonical');
        assert.equal(backfill.complete.next_cursor.cursor_kind, 'forward_append');
        assert.equal(backfill.checkpoint.completeness, 'canonical');
        assert.equal(backfill.state.items.filter((item) => item.event.event_type === 'FileChanged').length, 2);
        const files = backfill.state.items.filter((item) => item.event.event_type === 'FileChanged');
        assert.deepEqual(files.map((item) => [item.event.payload.path, item.event.payload.diff]).sort(), [
            ['src/app.rs', '@@ -1 +1 @@\n-old\n+new\n'], ['src/new.rs', 'new file\n']
        ]);
        const tool = backfill.state.tool_details.find((detail) => detail.call_id === 'command-1');
        assert.equal(tool.output, 'status=completed; exit_code=0; duration_ms=1500; output=ok 3 passed\n');
        assert.equal(tool.item_key, 'tool:command-1');
        assert.ok(backfill.state.items.every((item) => item.event.payload.metadata.conversation_id === conversationId));
        assert.ok(backfill.state.items.filter((item) => item.event.payload.metadata.turn_id === 'turn-1').length > 0);
        const originalCount = backfill.state.items.length;

        // Inspect the durable files in a fresh Node process before any full-source replay
        // could recreate missing detail or associations.
        const reopened = await runNode(root, { requestId: 'lifecycle-inspect' }, {
            inspectOnly: true, scope: backfill.scope, inspectRunId: 'lifecycle-backfill'
        });
        const reopenedFiles = reopened.state.items.filter((item) => item.event.event_type === 'FileChanged');
        assert.deepEqual(reopened.state.items.map((item) => item.item_key), backfill.state.items.map((item) => item.item_key));
        assert.deepEqual(reopenedFiles.map((item) => [item.event.payload.path, item.event.payload.diff]).sort(), [
            ['src/app.rs', '@@ -1 +1 @@\n-old\n+new\n'], ['src/new.rs', 'new file\n']
        ]);
        assert.ok(reopenedFiles.every((item) => item.event.payload.metadata.conversation_id === conversationId));
        assert.ok(reopenedFiles.every((item) => item.event.payload.metadata.turn_id === 'turn-1'));
        assert.ok(reopenedFiles.every((item) => item.event.payload.metadata.source_ref?.source_identity === conversationId));
        const reopenedTool = reopened.state.tool_details.find((detail) => detail.call_id === 'command-1');
        assert.equal(reopenedTool.item_key, 'tool:command-1');
        assert.equal(reopenedTool.tool_kind, 'local_shell');
        assert.equal(reopenedTool.input, '{"command":["cargo","test"],"cwd":"<local-path-redacted>"}');
        assert.equal(reopenedTool.output, 'status=completed; exit_code=0; duration_ms=1500; output=ok 3 passed\n');
        const reopenedToolEvents = reopened.state.items.filter((item) =>
            item.event.payload.call_id === 'command-1');
        assert.deepEqual(reopenedToolEvents.map((item) => item.event.event_type).sort(),
            ['ToolCompleted', 'ToolStarted']);
        for (const item of reopenedToolEvents) {
            assert.equal(item.item_key, 'tool:command-1');
            assert.equal(item.event.payload.metadata.conversation_id, conversationId);
            assert.equal(item.event.payload.metadata.turn_id, 'turn-1');
            assert.equal(item.event.payload.metadata.source_ref?.source_identity, conversationId);
        }
        assert.equal(reopenedToolEvents.find((item) => item.event.event_type === 'ToolStarted')
            .event.payload.input, reopenedTool.input);
        assert.equal(reopenedToolEvents.find((item) => item.event.event_type === 'ToolCompleted')
            .event.payload.output, reopenedTool.output);
        assert.deepEqual(reopened.checkpoint, backfill.checkpoint);
        assert.equal(reopened.run.status, 'completed');

        const repeat = await runNode(root, { ...base, requestId: 'lifecycle-repeat',
            jobId: 'lifecycle-repeat-job', mode: 'backfill' });
        assert.equal(repeat.error, undefined, JSON.stringify(repeat.error));
        assert.equal(repeat.state.items.length, originalCount);
        assert.deepEqual(repeat.state.items.map((item) => item.item_key), backfill.state.items.map((item) => item.item_key));

        const extra = line(original.trimEnd().split('\n').length, 'event_msg', {
            type: 'agent_message', message: '追加后精确回复', phase: 'commentary'
        });
        await fs.appendFile(source, extra);
        const append = await runNode(root, { ...base, requestId: 'lifecycle-append',
            jobId: 'lifecycle-append-job', mode: 'append',
            cursor: backfill.complete.next_cursor, persistedAnchor: backfill.checkpoint });
        assert.equal(append.error, undefined, JSON.stringify(append.error));
        assert.equal(append.complete.completeness, 'canonical');
        assert.equal(append.state.items.length, originalCount + 1);
        assert.equal(append.state.items.at(-1).event.payload.text, '追加后精确回复');
        assert.equal(append.checkpoint.cursor.complete_range.end, Buffer.byteLength(original + extra));

        const noGrowth = await runNode(root, { ...base, requestId: 'lifecycle-no-growth',
            jobId: 'lifecycle-no-growth-job', mode: 'append',
            cursor: append.complete.next_cursor, persistedAnchor: append.checkpoint });
        assert.equal(noGrowth.error, undefined, JSON.stringify(noGrowth.error));
        assert.equal(noGrowth.state.items.length, append.state.items.length);
        assert.deepEqual(noGrowth.state.items.map((item) => item.item_key), append.state.items.map((item) => item.item_key));
        assert.deepEqual(noGrowth.checkpoint, append.checkpoint);

        const timeout = await runNode(root, { ...base, requestId: 'lifecycle-timeout',
            jobId: 'lifecycle-timeout-job', mode: 'backfill',
            resourceLimits: { ...base.resourceLimits, timeout_ms: 0 } });
        assert.equal(timeout.error.code, 'resource_timeout');
        const pending = line(original.trimEnd().split('\n').length + 1, 'event_msg', {
            type: 'agent_message', message: '补齐后可见', phase: 'commentary'
        });
        await fs.appendFile(source, pending.slice(0, -1));
        const partial = await runNode(root, { ...base, requestId: 'lifecycle-pending',
            jobId: 'lifecycle-pending-job', mode: 'append',
            cursor: append.complete.next_cursor, persistedAnchor: append.checkpoint });
        assert.equal(partial.error, undefined, JSON.stringify(partial.error));
        assert.notEqual(partial.complete.completeness, 'canonical');
        assert.equal(partial.state.items.length, append.state.items.length);
        assert.deepEqual(partial.checkpoint, append.checkpoint);
        await fs.appendFile(source, '\n');
        const resumed = await runNode(root, { ...base, requestId: 'lifecycle-resumed',
            jobId: 'lifecycle-resumed-job', mode: 'append',
            cursor: append.complete.next_cursor, persistedAnchor: append.checkpoint });
        assert.equal(resumed.error, undefined, JSON.stringify(resumed.error));
        assert.equal(resumed.state.items.length, append.state.items.length + 1);
        assert.equal(resumed.state.items.at(-1).event.payload.text, '补齐后可见');
        assert.equal(resumed.checkpoint.completeness, 'canonical');
        assert.ok(hash(Buffer.from(original + extra + pending)));

        const invalidCursor = await runNode(root, { ...base, requestId: 'lifecycle-invalid-cursor',
            jobId: 'lifecycle-invalid-cursor-job', mode: 'append',
            cursor: { ...resumed.complete.next_cursor, cursor_kind: 'tail_preview' },
            persistedAnchor: resumed.checkpoint });
        assert.ok(invalidCursor.error, 'append must reject a preview cursor');

        const completeSource = original + extra + pending;
        await fs.writeFile(source, completeSource.replace('"ordinal":0', '"ordinal":9'));
        let mutated;
        try {
            mutated = await runNode(root, { ...base, requestId: 'lifecycle-mutated-source',
                jobId: 'lifecycle-mutated-source-job', mode: 'append',
                cursor: resumed.complete.next_cursor, persistedAnchor: resumed.checkpoint });
        } finally {
            await fs.writeFile(source, completeSource);
        }
        assert.ok(mutated.error || mutated.complete.completeness !== 'canonical');

        const protectedState = await runNode(root, { ...base, requestId: 'lifecycle-protected-state',
            jobId: 'lifecycle-protected-state-job', mode: 'append',
            cursor: resumed.complete.next_cursor, persistedAnchor: resumed.checkpoint });
        assert.equal(protectedState.error, undefined, JSON.stringify(protectedState.error));
        assert.deepEqual(protectedState.state.items, resumed.state.items);
        assert.deepEqual(protectedState.checkpoint, resumed.checkpoint);
    });
}
