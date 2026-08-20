'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CHECKPOINT_SCHEMA_VERSION = 1;

const CHECKPOINT_COMPLETENESS_RANK = Object.freeze({
    unknown: 0,
    partial: 1,
    provisional: 2,
    canonical: 3
});

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
    if (value.schema_version !== CHECKPOINT_SCHEMA_VERSION) {
        throw new Error(`unsupported checkpoint schema: ${value.schema_version}`);
    }
    requireCheckpointObject(value, 'source');
    const scope = normalizeScope(value);
    if (!scope) throw new Error('checkpoint identity is incomplete');
    requireCheckpointString(value, 'request_id');
    requireCheckpointString(value, 'conversation_id');
    requireCheckpointString(value.source, 'source_id', 'source.source_id');
    requireCheckpointString(value.source, 'source_epoch', 'source.source_epoch');
    if (value.source.source_epoch.trim() === 'unbound') {
        throw new Error('checkpoint.source.source_epoch must be bound');
    }
    validateDigest(value.source.fingerprint, 'source.fingerprint', 'covered_bytes');
    validateDigest(value.source.prefix_anchor, 'source.prefix_anchor', 'end_offset');

    requireCheckpointObject(value, 'reader');
    for (const field of ['backend', 'version', 'source_kind', 'compression']) {
        requireCheckpointString(value.reader, field, `reader.${field}`);
    }
    requireCheckpointObject(value, 'wire_profile');
    for (const field of ['parser_backend', 'wire_source_revision', 'compatibility_profile']) {
        requireCheckpointString(value.wire_profile, field, `wire_profile.${field}`);
    }
    requireCheckpointObject(value, 'segment');
    if (value.segment.source_range !== undefined && value.segment.source_range !== null) {
        validateRange(value.segment.source_range, 'segment.source_range');
    }
    for (const field of ['physical_line_start', 'physical_line_end', 'rollout_ordinal']) {
        if (value.segment[field] !== undefined && value.segment[field] !== null
            && (!Number.isSafeInteger(value.segment[field]) || value.segment[field] < 0)) {
            throw new Error(`checkpoint.segment.${field} must be a non-negative integer`);
        }
    }
    requireCheckpointObject(value, 'reducer_state');
    requireCheckpointString(value, 'projection_watermark');
    requireCheckpointString(value, 'completeness');
    if (!['unknown', 'partial', 'provisional', 'canonical'].includes(value.completeness)) {
        throw new Error(`unsupported checkpoint completeness: ${value.completeness}`);
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'cursor_kind')) {
        throw new Error('checkpoint.cursor_kind is required');
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'cursor')) {
        throw new Error('checkpoint.cursor is required');
    }
    if (value.cursor_kind !== undefined && value.cursor_kind !== null
        && !['tail_preview', 'backfill', 'forward_append'].includes(value.cursor_kind)) {
        throw new Error(`unsupported checkpoint cursor kind: ${value.cursor_kind}`);
    }
    if (value.cursor_kind !== undefined && value.cursor_kind !== null && value.cursor === null) {
        throw new Error('checkpoint.cursor_kind requires cursor');
    }
    if (value.cursor !== undefined && value.cursor !== null
        && (typeof value.cursor !== 'object' || Array.isArray(value.cursor))) {
        throw new Error('checkpoint.cursor must be an object or null');
    }
    if (value.cursor !== undefined && value.cursor !== null) {
        if (typeof value.cursor.cursor_kind !== 'string'
            || value.cursor.cursor_kind !== value.cursor_kind) {
            throw new Error('checkpoint.cursor_kind does not match cursor payload');
        }
    }
    if ((value.cursor === undefined || value.cursor === null)
        && value.cursor_kind !== undefined && value.cursor_kind !== null) {
        throw new Error('checkpoint.cursor_kind requires cursor');
    }
    return { checkpoint: value, scope };
}

function requireCheckpointObject(parent, field) {
    if (!parent[field] || typeof parent[field] !== 'object' || Array.isArray(parent[field])) {
        throw new Error(`checkpoint.${field} must be an object`);
    }
}

function requireCheckpointString(parent, field, label = `checkpoint.${field}`) {
    if (typeof parent[field] !== 'string' || !parent[field].trim()) {
        throw new Error(`${label} must be a non-empty string`);
    }
}

function validateRange(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || !Number.isSafeInteger(value.start)
        || !Number.isSafeInteger(value.end)
        || value.start < 0
        || value.end < value.start) {
        throw new Error(`${field} must be an ordered non-negative byte range`);
    }
}

function validateDigest(value, field, offsetField) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${field} is required`);
    }
    requireCheckpointString(value, 'algorithm', `${field}.algorithm`);
    requireCheckpointString(value, 'digest', `${field}.digest`);
    if (!Number.isSafeInteger(value[offsetField]) || value[offsetField] < 0) {
        throw new Error(`${field}.${offsetField} must be a non-negative integer`);
    }
}

function checkpointProgress(checkpoint) {
    const segmentEnd = checkpoint?.segment?.source_range?.end;
    const coveredBytes = checkpoint?.source?.fingerprint?.covered_bytes;
    const prefixEnd = checkpoint?.source?.prefix_anchor?.end_offset;
    const primary = Number.isSafeInteger(segmentEnd)
        ? segmentEnd
        : (Number.isSafeInteger(coveredBytes) ? coveredBytes : (Number.isSafeInteger(prefixEnd) ? prefixEnd : 0));
    return [
        primary,
        Number.isSafeInteger(coveredBytes) ? coveredBytes : 0,
        Number.isSafeInteger(prefixEnd) ? prefixEnd : 0,
        Number.isSafeInteger(checkpoint?.segment?.physical_line_end)
            ? checkpoint.segment.physical_line_end
            : 0,
        Number.isSafeInteger(checkpoint?.segment?.rollout_ordinal)
            ? checkpoint.segment.rollout_ordinal
            : 0
    ];
}

function compareCheckpointProgress(existing, incoming) {
    const existingProgress = checkpointProgress(existing);
    const incomingProgress = checkpointProgress(incoming);
    for (let index = 0; index < incomingProgress.length; index += 1) {
        if (incomingProgress[index] !== existingProgress[index]) {
            return incomingProgress[index] > existingProgress[index] ? 1 : -1;
        }
    }
    return 0;
}

function checkpointAdvances(existing, incoming) {
    const existingRank = CHECKPOINT_COMPLETENESS_RANK[existing?.completeness] ?? 0;
    const incomingRank = CHECKPOINT_COMPLETENESS_RANK[incoming?.completeness] ?? 0;
    if (incomingRank !== existingRank) return incomingRank > existingRank;
    return compareCheckpointProgress(existing, incoming) > 0;
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
        const existing = await this.load(normalized);
        if (existing && !checkpointAdvances(existing, normalizedCheckpoint.checkpoint)) {
            return existing;
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

    async replaceConversation(conversationId, scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw new Error('checkpoint scope is incomplete');
        const keepHash = scopeHash(normalized);
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        for (const name of await fs.promises.readdir(this.rootDir)) {
            if (!name.endsWith('.json')) continue;
            const filePath = path.join(this.rootDir, name);
            let value;
            try {
                value = JSON.parse((await fs.promises.readFile(filePath)).toString('utf8'));
            } catch (_) {
                continue;
            }
            const candidate = normalizeScope(value);
            if (candidate
                && candidate.conversationId === String(conversationId || '').trim()
                && scopeHash(candidate) !== keepHash) {
                await fs.promises.unlink(filePath);
            }
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
        const existing = this.values.get(scopeHash(normalized)) || null;
        if (existing && !checkpointAdvances(existing, normalizedCheckpoint.checkpoint)) {
            return existing;
        }
        this.values.set(scopeHash(normalized), normalizedCheckpoint.checkpoint);
        return normalizedCheckpoint.checkpoint;
    }

    async remove(scope) {
        const normalized = normalizeScope(scope);
        return normalized ? this.values.delete(scopeHash(normalized)) : false;
    }

    async replaceConversation(conversationId, scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw new Error('checkpoint scope is incomplete');
        const keepHash = scopeHash(normalized);
        const conversation = String(conversationId || '').trim();
        for (const [key, value] of this.values) {
            const candidate = normalizeScope(value);
            if (candidate
                && candidate.conversationId === conversation
                && key !== keepHash) {
                this.values.delete(key);
            }
        }
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
