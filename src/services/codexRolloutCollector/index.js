'use strict';

const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { AnalyzerProcessManager } = require('./analyzerProcessManager');
const {
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore,
    normalizeScope
} = require('./analysisBatchImporter');
const { FileCheckpointStore, MemoryCheckpointStore } = require('./analysisCheckpointStore');
const { FileAnalysisRunStore, MemoryAnalysisRunStore } = require('./analysisRunStore');

class CodexRolloutCollector {
    constructor({
        analyzerPath,
        analyzerArgs = [],
        analyzerCwd = process.cwd(),
        analyzerEnv = {},
        processManager = null,
        importer = null,
        store = null,
        checkpointStore = null,
        runStore = null,
        requestTimeoutMs = 120000
    } = {}) {
        this.store = store || new FileAnalysisStore();
        this.checkpointStore = checkpointStore || new FileCheckpointStore();
        this.importer = importer || new AnalysisBatchImporter({
            store: this.store,
            checkpointStore: this.checkpointStore
        });
        this.runStore = runStore || new FileAnalysisRunStore();
        this.processManager = processManager || new AnalyzerProcessManager({
            analyzerPath,
            args: analyzerArgs,
            cwd: analyzerCwd,
            env: analyzerEnv,
            requestTimeoutMs
        });
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return this;
        await this.importer.init();
        await this.runStore.init?.();
        await this.processManager.start();
        this.initialized = true;
        return this;
    }

    async analyze(request, { requestId = request?.request_id || randomUUID(), timeoutMs } = {}) {
        await this.init();
        const normalizedRequest = {
            ...request,
            request_id: requestId,
            protocol_version: request?.protocol_version || 1,
            message_type: 'analyze'
        };
        const scope = requestScope(normalizedRequest);
        await this.runStore.begin({
            run_id: requestId,
            conversation_id: scope.conversationId,
            source_id: scope.sourceId,
            source_epoch: scope.sourceEpoch,
            mode: normalizedRequest.mode
        });
        try {
            const complete = await this.processManager.request(normalizedRequest, {
                timeoutMs,
                onBatch: async (batch) => {
                    const imported = await this.importer.importBatch(batch);
                    await this.runStore.update(requestId, {
                        batches: (await this.runStore.get(requestId)).batches + (imported.duplicate ? 0 : 1),
                        last_batch_id: batch.batch_id,
                        source_id: batch.source_id,
                        source_epoch: batch.source_epoch
                    });
                    return imported;
                },
                onComplete: async (message) => {
                    await this.importer.commitComplete(message, {
                        scope,
                        checkpoint: message.checkpoint || null
                    });
                }
            });
            const state = await this.store.snapshot(scope);
            await this.runStore.complete(requestId, {
                status: complete.status,
                completeness: complete.completeness,
                checkpoint: complete.checkpoint || null
            });
            return { requestId, complete, state };
        } catch (error) {
            await this.runStore.fail(requestId, error).catch(() => {});
            throw error;
        }
    }

    cancel(requestId, reason) {
        return this.processManager.cancel(requestId, reason);
    }

    async stop() {
        await this.processManager.stop();
        this.initialized = false;
    }
}

function requestScope(request) {
    const source = request?.source_spec || {};
    return normalizeScope({
        conversation_id: request?.conversation_id,
        source_id: source.source_id || path.basename(source.path || 'rollout-source'),
        source_epoch: source.source_epoch || 'unbound'
    });
}

module.exports = {
    CodexRolloutCollector,
    AnalyzerProcessManager,
    AnalysisBatchImporter,
    FileAnalysisStore,
    MemoryAnalysisStore,
    FileCheckpointStore,
    MemoryCheckpointStore,
    FileAnalysisRunStore,
    MemoryAnalysisRunStore,
    requestScope
};
