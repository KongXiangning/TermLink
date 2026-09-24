'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { validateCheckpoint } = require('./analyzerProtocol');

const CHECKPOINT_SCHEMA_VERSION = 1;

const CHECKPOINT_COMPLETENESS_RANK = Object.freeze({
    unknown: 0,
    partial: 1,
    provisional: 2,
    canonical: 3
});

const LEGACY_CHECKPOINT_FIELDS = Object.freeze([
    'source_spec',
    'sourceSpec',
    'replay',
    'retention_profile',
    'retentionProfile',
    'discovery',
    'revision'
]);

function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function stripLegacyCheckpointFields(value) {
    const sanitized = clone(value);
    for (const field of LEGACY_CHECKPOINT_FIELDS) delete sanitized[field];

    // Only known checkpoint/source envelope fields are scrubbed.  Arbitrary
    // nested additive metadata is opaque and must not be recursively
    // reinterpreted as a public legacy protocol field.
    if (sanitized.source && typeof sanitized.source === 'object'
        && !Array.isArray(sanitized.source)) {
        for (const field of LEGACY_CHECKPOINT_FIELDS) delete sanitized.source[field];
    }
    return sanitized;
}

function readOptional(scope, camelCase, snakeCase) {
    if (!scope || typeof scope !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(scope, camelCase)) return scope[camelCase];
    if (Object.prototype.hasOwnProperty.call(scope, snakeCase)) return scope[snakeCase];
    return undefined;
}

function normalizeScope(scope) {
    const value = scope && typeof scope === 'object' ? scope : {};
    const source = value.source && typeof value.source === 'object' ? value.source : {};
    const conversationId = normalizeString(value.conversationId ?? value.conversation_id);
    const sourceId = normalizeString(
        value.sourceId ?? value.source_id ?? source.source_id
    );
    const sourceEpoch = normalizeString(
        value.sourceEpoch ?? value.source_epoch ?? source.source_epoch
    );
    if (!conversationId || !sourceId || !sourceEpoch || sourceEpoch === 'unbound') return null;
    return { conversationId, sourceId, sourceEpoch };
}

function scopeHash(scope) {
    const normalized = normalizeScope(scope);
    if (!normalized) throw checkpointError(
        'ANALYSIS_CHECKPOINT_SCOPE_INVALID',
        'checkpoint scope is incomplete'
    );
    return crypto.createHash('sha256')
        .update(`${normalized.conversationId}\u0000${normalized.sourceId}\u0000${normalized.sourceEpoch}`)
        .digest('hex');
}

function normalizeCheckpoint(checkpoint) {
    if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_INVALID',
            'checkpoint must be an object'
        );
    }

    let value;
    try {
        value = stripLegacyCheckpointFields(clone(checkpoint));
    } catch (error) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_INVALID',
            `checkpoint must be JSON serializable: ${error.message}`
        );
    }

    // Keep one validator as the wire/storage boundary.  The target schema
    // owns source_range/snapshot_boundary and object projection watermarks;
    // old fingerprint/prefix fields remain optional opaque metadata.
    validateCheckpoint(value);
    if (value.schema_version !== CHECKPOINT_SCHEMA_VERSION) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCHEMA_UNSUPPORTED',
            `unsupported checkpoint schema: ${value.schema_version}`
        );
    }

    const scope = normalizeScope(value);
    if (!scope) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_IDENTITY_INVALID',
            'checkpoint identity is incomplete'
        );
    }
    return { checkpoint: value, scope };
}

function assertScopeMatches(scope, normalizedCheckpoint) {
    const normalized = normalizeScope(scope);
    if (!normalized) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCOPE_INVALID',
            'checkpoint scope is incomplete'
        );
    }
    if (scopeHash(normalized) !== scopeHash(normalizedCheckpoint.scope)) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH',
            'checkpoint scope does not match payload'
        );
    }

    assertOptionalIdentity(scope, 'job_id', 'jobId', normalizedCheckpoint.checkpoint.job_id);
    assertOptionalIdentity(
        scope,
        'request_id',
        'requestId',
        normalizedCheckpoint.checkpoint.request_id
    );
    return normalized;
}

function assertOptionalIdentity(scope, snakeCase, camelCase, actual) {
    const supplied = readOptional(scope, camelCase, snakeCase);
    if (supplied === undefined || supplied === null) return;
    if (typeof supplied !== 'string' || !supplied.trim() || supplied.trim() !== actual) {
        throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH',
            `checkpoint ${snakeCase} does not match requested scope`
        );
    }
}

function scopeIdentityMatches(scope, checkpoint) {
    try {
        assertOptionalIdentity(scope, 'job_id', 'jobId', checkpoint.job_id);
        assertOptionalIdentity(scope, 'request_id', 'requestId', checkpoint.request_id);
        return true;
    } catch (_) {
        return false;
    }
}

function checkpointProgress(checkpoint) {
    // Only target progress fields participate in monotonicity.  A legacy
    // fingerprint, prefix anchor, or revision may be retained for diagnosis,
    // but it must never make a checkpoint appear newer or older.
    const range = checkpoint?.source?.source_range || checkpoint?.segment?.source_range;
    const end = Number.isSafeInteger(range?.end) ? range.end : 0;
    const start = Number.isSafeInteger(range?.start) ? range.start : 0;
    const lineEnd = Number.isSafeInteger(checkpoint?.segment?.physical_line_end)
        ? checkpoint.segment.physical_line_end
        : 0;
    const ordinal = Number.isSafeInteger(checkpoint?.segment?.rollout_ordinal)
        ? checkpoint.segment.rollout_ordinal
        : 0;
    const itemCount = Number.isSafeInteger(checkpoint?.projection_watermark?.logical_item_count)
        ? checkpoint.projection_watermark.logical_item_count
        : 0;

    // A lower range start covers more of a backward segment when the end is
    // equal, hence the negated start in this lexicographic progress tuple.
    return [end, -start, lineEnd, ordinal, itemCount];
}

function compareCheckpointProgress(existing, incoming, fieldCount = 5) {
    const existingProgress = checkpointProgress(existing);
    const incomingProgress = checkpointProgress(incoming);
    for (let index = 0; index < fieldCount; index += 1) {
        if (incomingProgress[index] !== existingProgress[index]) {
            return incomingProgress[index] > existingProgress[index] ? 1 : -1;
        }
    }
    return 0;
}

function checkpointAdvances(existing, incoming) {
    const existingRank = CHECKPOINT_COMPLETENESS_RANK[existing?.completeness] ?? 0;
    const incomingRank = CHECKPOINT_COMPLETENESS_RANK[incoming?.completeness] ?? 0;
    // Promotion can change reducer counts and omit optional line/ordinal
    // metadata; only the physical source range establishes non-regression.
    const progress = compareCheckpointProgress(existing, incoming,
        incomingRank > existingRank ? 2 : 5);
    // Each new read intent owns a new job. Stored job/request IDs describe
    // provenance, not ownership of this conversation/source recovery slot.
    // Promotion must not trade a newer safe position for an older one, and
    // greater progress must not downgrade a canonical checkpoint.
    return incomingRank >= existingRank && progress >= 0
        && (incomingRank > existingRank || progress > 0);
}

function checkpointError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

async function readCheckpointFile(filePath) {
    let bytes;
    try {
        bytes = await fs.promises.readFile(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
    try {
        return JSON.parse(bytes.toString('utf8'));
    } catch (_) {
        return null;
    }
}

class KeyedMutationQueue {
    constructor() {
        this.tails = new Map();
    }

    async wait(key) {
        const tail = this.tails.get(key);
        if (tail) await tail;
    }

    run(key, operation) {
        const previous = this.tails.get(key) || Promise.resolve();
        const result = previous.then(
            () => operation(),
            () => operation()
        );
        const tail = result.catch(() => {});
        this.tails.set(key, tail);
        return result.finally(() => {
            if (this.tails.get(key) === tail) this.tails.delete(key);
        });
    }
}

function checkpointMutationKey(scope) {
    return `conversation:${scope.conversationId}`;
}

class FileCheckpointStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-checkpoints') } = {}) {
        this.rootDir = path.resolve(rootDir);
        this.mutations = new KeyedMutationQueue();
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
        await this.mutations.wait(checkpointMutationKey(normalized));
        return this._loadUnlocked(normalized, scope);
    }

    async _loadUnlocked(normalized, identityScope = normalized) {
        const value = await readCheckpointFile(this.pathFor(normalized));
        if (!value) return null;
        try {
            const normalizedCheckpoint = normalizeCheckpoint(value);
            if (scopeHash(normalizedCheckpoint.scope) !== scopeHash(normalized)) return null;
            if (!scopeIdentityMatches(identityScope, normalizedCheckpoint.checkpoint)) return null;
            return clone(normalizedCheckpoint.checkpoint);
        } catch (_) {
            // A malformed or stale file is not usable recovery evidence.
            return null;
        }
    }

    async save(scope, checkpoint) {
        const normalizedCheckpoint = normalizeCheckpoint(checkpoint);
        const normalized = assertScopeMatches(scope, normalizedCheckpoint);
        return this.mutations.run(checkpointMutationKey(normalized), async () => {
            const existing = await this._loadUnlocked(normalized);
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
            return clone(normalizedCheckpoint.checkpoint);
        });
    }

    async remove(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return false;
        return this.mutations.run(checkpointMutationKey(normalized), async () => {
            try {
                await fs.promises.unlink(this.pathFor(normalized));
                return true;
            } catch (error) {
                if (error.code === 'ENOENT') return false;
                throw error;
            }
        });
    }

    async replaceConversation(conversationId, scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCOPE_INVALID',
            'checkpoint scope is incomplete'
        );
        return this.mutations.run(checkpointMutationKey(normalized), async () => {
            const keepHash = scopeHash(normalized);
            await fs.promises.mkdir(this.rootDir, { recursive: true });
            for (const name of await fs.promises.readdir(this.rootDir)) {
                if (!name.endsWith('.json')) continue;
                const filePath = path.join(this.rootDir, name);
                const value = await readCheckpointFile(filePath);
                if (!value) continue;
                let candidate;
                try {
                    candidate = normalizeScope(value);
                } catch (_) {
                    candidate = null;
                }
                if (candidate
                    && candidate.conversationId === String(conversationId || '').trim()
                    && scopeHash(candidate) !== keepHash) {
                    await fs.promises.unlink(filePath);
                }
            }
        });
    }
}

class MemoryCheckpointStore {
    constructor() {
        this.values = new Map();
        this.mutations = new KeyedMutationQueue();
    }

    async init() {
        return this;
    }

    async load(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return null;
        await this.mutations.wait(checkpointMutationKey(normalized));
        return this._loadUnlocked(normalized, scope);
    }

    _loadUnlocked(normalized, identityScope = normalized) {
        const value = this.values.get(scopeHash(normalized));
        if (!value || !scopeIdentityMatches(identityScope, value)) return null;
        return clone(value);
    }

    async save(scope, checkpoint) {
        const normalizedCheckpoint = normalizeCheckpoint(checkpoint);
        const normalized = assertScopeMatches(scope, normalizedCheckpoint);
        return this.mutations.run(checkpointMutationKey(normalized), async () => {
            const key = scopeHash(normalized);
            const existing = this._loadUnlocked(normalized) || null;
            if (existing && !checkpointAdvances(existing, normalizedCheckpoint.checkpoint)) {
                return clone(existing);
            }
            this.values.set(key, clone(normalizedCheckpoint.checkpoint));
            return clone(normalizedCheckpoint.checkpoint);
        });
    }

    async remove(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return false;
        return this.mutations.run(checkpointMutationKey(normalized), () => (
            this.values.delete(scopeHash(normalized))
        ));
    }

    async replaceConversation(conversationId, scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw checkpointError(
            'ANALYSIS_CHECKPOINT_SCOPE_INVALID',
            'checkpoint scope is incomplete'
        );
        return this.mutations.run(checkpointMutationKey(normalized), () => {
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
        });
    }
}

module.exports = {
    CHECKPOINT_SCHEMA_VERSION,
    FileCheckpointStore,
    MemoryCheckpointStore,
    normalizeScope,
    scopeHash,
    normalizeCheckpoint,
    checkpointAdvances,
    checkpointProgress
};
