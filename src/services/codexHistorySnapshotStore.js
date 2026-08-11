'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SNAPSHOT_SCHEMA_VERSION = 1;
const DEFAULT_MAX_SNAPSHOT_BYTES = 512 * 1024 * 1024;

/**
 * Durable, current-only canonical history snapshot storage.
 *
 * This is deliberately not an event log and not a cache of raw Codex files:
 * each endpoint/profile + conversation key owns exactly one atomically
 * replaced canonical snapshot.  A corrupt/incomplete file is never returned
 * to the caller; the next explicit history request rebuilds it from Codex.
 */
class CodexHistorySnapshotStore {
    constructor({
        rootDir = path.resolve(process.cwd(), 'data', 'codex-history-snapshots'),
        maxSnapshotBytes = DEFAULT_MAX_SNAPSHOT_BYTES,
        now = Date.now
    } = {}) {
        this.rootDir = path.resolve(rootDir);
        this.maxSnapshotBytes = Number.isSafeInteger(maxSnapshotBytes) && maxSnapshotBytes > 0
            ? maxSnapshotBytes
            : DEFAULT_MAX_SNAPSHOT_BYTES;
        this.now = typeof now === 'function' ? now : Date.now;
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    /** Read a validated snapshot, or null when no usable current snapshot exists. */
    async read(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) return null;
        const filePath = this.pathFor(normalized);
        let bytes;
        try {
            bytes = await fs.promises.readFile(filePath);
        } catch (error) {
            if (error?.code === 'ENOENT') return null;
            throw error;
        }
        if (bytes.length === 0 || bytes.length > this.maxSnapshotBytes) {
            await safeQuarantine(filePath, this.now);
            return null;
        }
        let envelope;
        try {
            envelope = JSON.parse(bytes.toString('utf8'));
        } catch (_) {
            await safeQuarantine(filePath, this.now);
            return null;
        }
        if (!isValidEnvelope(envelope, normalized)) {
            await safeQuarantine(filePath, this.now);
            return null;
        }
        return {
            ...envelope.snapshot,
            snapshotMeta: {
                writtenAt: envelope.writtenAt,
                byteSize: bytes.length,
                schemaVersion: envelope.version
            }
        };
    }

    /** Atomically replace the one current snapshot for a scope. */
    async write(scope, snapshot) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw createStoreError('HISTORY_SNAPSHOT_SCOPE_INVALID');
        if (!isValidSnapshot(snapshot, normalized.conversationId)) {
            throw createStoreError('HISTORY_SNAPSHOT_INVALID');
        }
        const envelope = {
            version: SNAPSHOT_SCHEMA_VERSION,
            scopeHash: scopeHash(normalized),
            writtenAt: normalizeWrittenAt(this.now()),
            snapshot: sanitizeSnapshot(snapshot)
        };
        const bytes = Buffer.from(JSON.stringify(envelope), 'utf8');
        if (bytes.length === 0 || bytes.length > this.maxSnapshotBytes) {
            const error = createStoreError('HISTORY_SNAPSHOT_TOO_LARGE');
            error.byteSize = bytes.length;
            error.maxBytes = this.maxSnapshotBytes;
            throw error;
        }
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        const targetPath = this.pathFor(normalized);
        const temporaryPath = path.join(
            this.rootDir,
            `.${path.basename(targetPath)}.${process.pid}.${crypto.randomUUID()}.tmp`
        );
        const handle = await fs.promises.open(temporaryPath, 'wx');
        try {
            await handle.writeFile(bytes);
            await handle.sync();
        } finally {
            await handle.close();
        }
        try {
            await fs.promises.rename(temporaryPath, targetPath);
        } catch (error) {
            await safeUnlink(temporaryPath);
            throw error;
        }
        return {
            byteSize: bytes.length,
            writtenAt: envelope.writtenAt,
            fileKey: path.basename(targetPath, '.json')
        };
    }

    pathFor(scope) {
        const normalized = normalizeScope(scope);
        if (!normalized) throw createStoreError('HISTORY_SNAPSHOT_SCOPE_INVALID');
        return path.join(this.rootDir, `${scopeHash(normalized)}.json`);
    }
}

function normalizeScope(scope) {
    const source = scope && typeof scope === 'object' ? scope : {};
    const profileKey = typeof source.profileKey === 'string' ? source.profileKey.trim() : '';
    const conversationId = typeof source.conversationId === 'string' ? source.conversationId.trim() : '';
    if (!profileKey || !conversationId) return null;
    return { profileKey, conversationId };
}

function scopeHash(scope) {
    return crypto.createHash('sha256')
        .update(`${scope.profileKey}\u0000${scope.conversationId}`, 'utf8')
        .digest('hex');
}

function isValidEnvelope(envelope, scope) {
    return Boolean(
        envelope && typeof envelope === 'object' && !Array.isArray(envelope) &&
        envelope.version === SNAPSHOT_SCHEMA_VERSION &&
        envelope.scopeHash === scopeHash(scope) &&
        Number.isFinite(envelope.writtenAt) &&
        isValidSnapshot(envelope.snapshot, scope.conversationId)
    );
}

function isValidSnapshot(snapshot, expectedConversationId) {
    return Boolean(
        snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) &&
        snapshot.conversationId === expectedConversationId &&
        Array.isArray(snapshot.items) &&
        typeof snapshot.rootHash === 'string' && snapshot.rootHash.length > 0
    );
}

function sanitizeSnapshot(snapshot) {
    // Do not persist transient in-memory bookkeeping such as timers, waiter
    // references or a caller-provided snapshotMeta object. The canonical
    // payload itself is intentionally preserved byte-for-byte.
    const { snapshotMeta, ...safeSnapshot } = snapshot;
    void snapshotMeta;
    return safeSnapshot;
}

function normalizeWrittenAt(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : Date.now();
}

function createStoreError(code) {
    const error = new Error(code.toLowerCase());
    error.code = code;
    return error;
}

async function safeUnlink(filePath) {
    try {
        await fs.promises.unlink(filePath);
    } catch (_) {
        // Best effort after a failed replace; leaving the old current snapshot
        // is safer than surfacing an unrelated cleanup error.
    }
}

/**
 * A malformed current snapshot must never be reread as if it were a valid
 * cache. Keep it recoverable for local diagnosis rather than deleting it;
 * the next successful source build atomically recreates the current path.
 */
async function safeQuarantine(filePath, now = Date.now) {
    const directory = path.dirname(filePath);
    const stem = path.basename(filePath, '.json');
    const timestamp = normalizeWrittenAt(typeof now === 'function' ? now() : now);
    const quarantinePath = path.join(
        directory,
        `.${stem}.${timestamp}.${crypto.randomUUID()}.corrupt`
    );
    try {
        await fs.promises.rename(filePath, quarantinePath);
    } catch (_) {
        // Another concurrent read/rebuild may already have replaced or moved
        // this file. Failing closed is enough; never remove a valid current
        // snapshot as a recovery side effect.
    }
}

module.exports = {
    CodexHistorySnapshotStore,
    SNAPSHOT_SCHEMA_VERSION,
    DEFAULT_MAX_SNAPSHOT_BYTES,
    normalizeScope,
    scopeHash
};
