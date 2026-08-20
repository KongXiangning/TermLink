'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function runFileKey(runId) {
    const value = String(runId || '').trim();
    if (!value) throw new Error('runId is required');
    return crypto.createHash('sha256').update(value).digest('hex');
}

async function atomicWriteJson(target, value) {
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temporary = path.join(
        path.dirname(target),
        `.${path.basename(target)}.${process.pid}.${crypto.randomUUID()}.tmp`
    );
    const handle = await fs.promises.open(temporary, 'wx');
    try {
        await handle.writeFile(JSON.stringify(value));
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await fs.promises.rename(temporary, target);
    } catch (error) {
        await fs.promises.unlink(temporary).catch(() => {});
        throw error;
    }
}

class FileAnalysisRunStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-runs'), now = Date.now } = {}) {
        this.rootDir = path.resolve(rootDir);
        this.now = typeof now === 'function' ? now : Date.now;
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    pathFor(runId) {
        return path.join(this.rootDir, `${runFileKey(runId)}.json`);
    }

    async begin(run) {
        const value = {
            run_id: run.run_id || run.runId,
            conversation_id: run.conversation_id || run.conversationId,
            source_id: run.source_id || run.sourceId,
            source_epoch: run.source_epoch || run.sourceEpoch,
            mode: run.mode || 'replay',
            status: 'running',
            started_at: this.now(),
            updated_at: this.now(),
            batches: 0,
            last_batch_id: null,
            error: null
        };
        if (!value.run_id || !value.conversation_id) throw new Error('run identity is incomplete');
        await atomicWriteJson(this.pathFor(value.run_id), value);
        return value;
    }

    async get(runId) {
        try {
            const bytes = await fs.promises.readFile(this.pathFor(runId));
            return JSON.parse(bytes.toString('utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async update(runId, patch) {
        const current = await this.get(runId);
        if (!current) throw new Error(`analysis run not found: ${runId}`);
        const next = { ...current, ...patch, updated_at: this.now() };
        await atomicWriteJson(this.pathFor(runId), next);
        return next;
    }

    async complete(runId, result = {}) {
        return this.update(runId, {
            status: 'completed',
            completed_at: this.now(),
            result
        });
    }

    async fail(runId, error) {
        return this.update(runId, {
            status: 'failed',
            completed_at: this.now(),
            error: {
                code: error?.code || 'ANALYZER_FAILED',
                message: error?.message || String(error)
            }
        });
    }
}

class MemoryAnalysisRunStore {
    constructor({ now = Date.now } = {}) {
        this.now = typeof now === 'function' ? now : Date.now;
        this.values = new Map();
    }

    async init() {
        return this;
    }

    async begin(run) {
        const value = {
            run_id: run.run_id || run.runId,
            conversation_id: run.conversation_id || run.conversationId,
            source_id: run.source_id || run.sourceId,
            source_epoch: run.source_epoch || run.sourceEpoch,
            mode: run.mode || 'replay',
            status: 'running',
            started_at: this.now(),
            updated_at: this.now(),
            batches: 0,
            last_batch_id: null,
            error: null
        };
        this.values.set(value.run_id, value);
        return value;
    }

    async get(runId) {
        return this.values.get(runId) || null;
    }

    async update(runId, patch) {
        const current = await this.get(runId);
        if (!current) throw new Error(`analysis run not found: ${runId}`);
        const next = { ...current, ...patch, updated_at: this.now() };
        this.values.set(runId, next);
        return next;
    }

    async complete(runId, result = {}) {
        return this.update(runId, { status: 'completed', completed_at: this.now(), result });
    }

    async fail(runId, error) {
        return this.update(runId, {
            status: 'failed',
            completed_at: this.now(),
            error: { code: error?.code || 'ANALYZER_FAILED', message: error?.message || String(error) }
        });
    }
}

module.exports = {
    FileAnalysisRunStore,
    MemoryAnalysisRunStore,
    atomicWriteJson,
    runFileKey
};
