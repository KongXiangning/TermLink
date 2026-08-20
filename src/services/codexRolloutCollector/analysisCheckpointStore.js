'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CHECKPOINT_SCHEMA_VERSION = 1;

function normalizeScope(scope) {
    const value = scope && typeof scope === 'object' ? scope : {};
    const conversationId = String(value.conversationId ?? value.conversation_id ?? '').trim();
    const sourceId = String(value.sourceId ?? value.source_id ?? value.source?.source_id ?? '').trim();
    const sourceEpoch = String(
        value.sourceEpoch ?? value.source_epoch ?? value.source?.source_epoch ?? ''
    ).trim();
    if (!conversationId || !sourceId || !sourceEpoch) return null;
    return { conversationId, sourceId, sourceEpoch };
}

function scopeHash(scope) {
    const normalized = normalizeScope(scope);
    if (!normalized) throw new Error('checkpoint scope is incomplete');
    return crypto.createHash('sha256')
        .update(`${normalized.conversationId}\u0000${normalized.sourceId}\u0000${normalized.sourceEpoch}`)
        .digest('hex');
}

function normalizeCheckpoint(checkpoint) {
    if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) {
        throw new Error('checkpoint must be an object');
    }
    const value = JSON.parse(JSON.stringify(checkpoint));
    if (value.schema_version !== undefined && value.schema_version !== CHECKPOINT_SCHEMA_VERSION) {
        throw new Error(`unsupported checkpoint schema: ${value.schema_version}`);
    }
    if (!value.source || typeof value.source !== 'object') {
        throw new Error('checkpoint.source is required');
    }
    const scope = normalizeScope(value);
    if (!scope) throw new Error('checkpoint identity is incomplete');
    if (!value.conversation_id) value.conversation_id = scope.conversationId;
    if (value.schema_version === undefined) value.schema_version = CHECKPOINT_SCHEMA_VERSION;
    return { checkpoint: value, scope };
}

class FileCheckpointStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-checkpoints') } = {}) {
        this.rootDir = path.resolve(rootDir);
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    pathFor(scope) {
        return path.join(this.rootDir, `${scopeHash(scope)}.json`);
    }

    async load(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return null;
        let bytes;
        try {
            bytes = await fs.promises.readFile(this.pathFor(normalized));
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
        let checkpoint;
        try {
            checkpoint = JSON.parse(bytes.toString('utf8'));
        } catch (_) {
            return null;
        }
        try {
            const normalizedCheckpoint = normalizeCheckpoint(checkpoint);
            if (scopeHash(normalizedCheckpoint.scope) !== scopeHash(normalized)) return null;
            return normalizedCheckpoint.checkpoint;
        } catch (_) {
            return null;
        }
    }

    async save(scope, checkpoint) {
        const normalized = normalizeScope(scope);
        const normalizedCheckpoint = normalizeCheckpoint(checkpoint);
        if (!normalized || scopeHash(normalized) !== scopeHash(normalizedCheckpoint.scope)) {
            throw new Error('checkpoint scope does not match payload');
        }
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        const target = this.pathFor(normalized);
        const temporary = path.join(
            this.rootDir,
            `.${path.basename(target)}.${process.pid}.${crypto.randomUUID()}.tmp`
        );
        const handle = await fs.promises.open(temporary, 'wx');
        try {
            await handle.writeFile(JSON.stringify(normalizedCheckpoint.checkpoint));
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
        return normalizedCheckpoint.checkpoint;
    }

    async remove(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return false;
        try {
            await fs.promises.unlink(this.pathFor(normalized));
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') return false;
            throw error;
        }
    }
}

class MemoryCheckpointStore {
    constructor() {
        this.values = new Map();
    }

    async init() {
        return this;
    }

    async load(scope) {
        const normalized = normalizeScope(scope);
        return normalized ? this.values.get(scopeHash(normalized)) || null : null;
    }

    async save(scope, checkpoint) {
        const normalized = normalizeScope(scope);
        const normalizedCheckpoint = normalizeCheckpoint(checkpoint);
        if (!normalized || scopeHash(normalized) !== scopeHash(normalizedCheckpoint.scope)) {
            throw new Error('checkpoint scope does not match payload');
        }
        this.values.set(scopeHash(normalized), normalizedCheckpoint.checkpoint);
        return normalizedCheckpoint.checkpoint;
    }

    async remove(scope) {
        const normalized = normalizeScope(scope);
        return normalized ? this.values.delete(scopeHash(normalized)) : false;
    }
}

module.exports = {
    CHECKPOINT_SCHEMA_VERSION,
    FileCheckpointStore,
    MemoryCheckpointStore,
    normalizeScope,
    scopeHash,
    normalizeCheckpoint
};
