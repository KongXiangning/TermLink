'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const initSqlJs = require('sql.js');

const CURRENT_SCHEMA_VERSION = 1;
const DATABASE_FILENAME = 'codex-history.sqlite';
const WRITE_QUEUES = new Map();
let sqlModulePromise;

const MIGRATION_1 = `
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE conversations (
    conversation_id TEXT PRIMARY KEY,
    coverage_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE history_items (
    conversation_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    event_id TEXT,
    turn_id TEXT,
    item_type TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (conversation_id, item_key),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);
CREATE INDEX history_items_order ON history_items(conversation_id, ordinal, item_key);

CREATE TABLE tool_details (
    conversation_id TEXT NOT NULL,
    detail_key TEXT NOT NULL,
    item_key TEXT,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (conversation_id, detail_key),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE TABLE usage_records (
    conversation_id TEXT NOT NULL,
    usage_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (conversation_id, usage_key),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE TABLE task_outcomes (
    conversation_id TEXT NOT NULL,
    outcome_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (conversation_id, outcome_key),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE TABLE analysis_checkpoints (
    conversation_id TEXT PRIMARY KEY,
    checkpoint_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE TABLE staging_batches (
    conversation_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    delivery_json TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    staged_at INTEGER NOT NULL,
    published_at INTEGER,
    PRIMARY KEY (conversation_id, batch_id)
);

CREATE TABLE publication_receipts (
    conversation_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    canonical_hash TEXT NOT NULL,
    committed_at INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, batch_id),
    FOREIGN KEY (conversation_id, batch_id)
        REFERENCES staging_batches(conversation_id, batch_id)
);
`;

class CodexHistoryProductStore {
    constructor({
        databasePath = path.resolve(process.cwd(), 'data', DATABASE_FILENAME),
        now = Date.now
    } = {}) {
        this.databasePath = path.resolve(databasePath);
        this.now = typeof now === 'function' ? now : Date.now;
    }

    async init() {
        await fs.promises.mkdir(path.dirname(this.databasePath), { recursive: true });
        return withWriteQueue(this.databasePath, async () => {
            const db = await this.openDatabase();
            try {
                if (this.applyMigrations(db)) await persistDatabase(db, this.databasePath);
            } finally {
                db.close();
            }
            return this;
        });
    }

    /** Persist the validated delivery envelope before a caller can ACK it. */
    async stageBatch({ conversationId, batchId, deliveryIdentity, payload } = {}) {
        const conversation = requiredString(conversationId, 'conversationId');
        const batch = requiredString(batchId, 'batchId');
        const deliveryJson = serializeJson(requireObject(deliveryIdentity, 'deliveryIdentity'));
        const payloadJson = serializeJson(payload);
        const payloadHash = sha256(payloadJson);
        const stagedAt = normalizeTimestamp(this.now());

        return this.writeTransaction((db) => {
            const existing = queryOne(
                db,
                'SELECT delivery_json, payload_json, payload_hash, staged_at FROM staging_batches WHERE conversation_id = ? AND batch_id = ?',
                [conversation, batch]
            );
            if (existing) {
                if (existing.payload_hash !== payloadHash
                    || existing.payload_json !== payloadJson
                    || existing.delivery_json !== deliveryJson) {
                    throw storeError('CODEX_HISTORY_PRODUCT_STAGING_CONFLICT', 'The batch identity was already staged with different content.');
                }
                return { status: 'already-staged', conversationId: conversation, batchId: batch };
            }

            db.run(
                'INSERT INTO staging_batches (conversation_id, batch_id, delivery_json, payload_json, payload_hash, staged_at, published_at) VALUES (?, ?, ?, ?, ?, ?, NULL)',
                [conversation, batch, deliveryJson, payloadJson, payloadHash, stagedAt]
            );
            return { status: 'staged', conversationId: conversation, batchId: batch };
        });
    }

    /**
     * Atomically replace one conversation's canonical projection after the
     * upstream owner has validated completeness and coverage. This local Store
     * primitive does not perform or claim that upstream validation itself.
     */
    async publishCanonical({
        conversationId,
        batchId,
        items,
        toolDetails = [],
        usage = [],
        taskOutcomes = [],
        coverage,
        checkpoint = null
    } = {}) {
        const conversation = requiredString(conversationId, 'conversationId');
        const batch = requiredString(batchId, 'batchId');
        const projection = normalizeProjection({ items, toolDetails, usage, taskOutcomes, coverage, checkpoint });
        const canonicalHash = sha256(stableStringify({
            items: projection.items,
            toolDetails: projection.toolDetails,
            usage: projection.usage,
            taskOutcomes: projection.taskOutcomes,
            coverage: projection.coverage,
            checkpoint: projection.checkpoint
        }));
        const committedAt = normalizeTimestamp(this.now());

        return this.writeTransaction((db) => {
            const staged = queryOne(
                db,
                'SELECT batch_id FROM staging_batches WHERE conversation_id = ? AND batch_id = ?',
                [conversation, batch]
            );
            if (!staged) {
                throw storeError('CODEX_HISTORY_PRODUCT_STAGING_REQUIRED', 'Canonical publication requires a durable staged batch.');
            }

            const receipt = queryOne(
                db,
                'SELECT canonical_hash FROM publication_receipts WHERE conversation_id = ? AND batch_id = ?',
                [conversation, batch]
            );
            if (receipt) {
                if (receipt.canonical_hash !== canonicalHash) {
                    throw storeError('CODEX_HISTORY_PRODUCT_PUBLICATION_CONFLICT', 'The batch was already published with different canonical content.');
                }
                return {
                    status: 'already-published',
                    conversationId: conversation,
                    batchId: batch,
                    itemCount: projection.items.length
                };
            }

            db.run(
                'INSERT INTO conversations (conversation_id, coverage_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(conversation_id) DO UPDATE SET coverage_json = excluded.coverage_json, updated_at = excluded.updated_at',
                [conversation, serializeJson(projection.coverage), committedAt]
            );
            for (const table of ['tool_details', 'usage_records', 'task_outcomes', 'history_items']) {
                db.run(`DELETE FROM ${table} WHERE conversation_id = ?`, [conversation]);
            }

            insertItems(db, conversation, projection.items);
            insertKeyedDetails(db, 'tool_details', 'detail_key', conversation, projection.toolDetails);
            insertKeyedDetails(db, 'usage_records', 'usage_key', conversation, projection.usage);
            insertKeyedDetails(db, 'task_outcomes', 'outcome_key', conversation, projection.taskOutcomes);
            writeCheckpoint(db, conversation, projection.checkpoint, committedAt);
            db.run(
                'INSERT INTO publication_receipts (conversation_id, batch_id, canonical_hash, committed_at) VALUES (?, ?, ?, ?)',
                [conversation, batch, canonicalHash, committedAt]
            );
            db.run(
                'UPDATE staging_batches SET published_at = ? WHERE conversation_id = ? AND batch_id = ?',
                [committedAt, conversation, batch]
            );

            return {
                status: 'published',
                conversationId: conversation,
                batchId: batch,
                itemCount: projection.items.length
            };
        });
    }

    /** Read only the product history projection; analyzer checkpoint is separate. */
    async readConversation(conversationId) {
        const conversation = requiredString(conversationId, 'conversationId');
        await this.init();
        const db = await this.openDatabase();
        try {
            const record = queryOne(
                db,
                'SELECT coverage_json FROM conversations WHERE conversation_id = ?',
                [conversation]
            );
            if (!record) return null;
            return {
                conversationId: conversation,
                items: queryAll(
                    db,
                    'SELECT item_key, event_id, turn_id, item_type, ordinal, payload_json FROM history_items WHERE conversation_id = ? ORDER BY ordinal, item_key',
                    [conversation]
                ).map((row) => ({
                    itemKey: row.item_key,
                    eventId: row.event_id,
                    turnId: row.turn_id,
                    itemType: row.item_type,
                    ordinal: row.ordinal,
                    payload: parseJson(row.payload_json)
                })),
                toolDetails: queryAll(
                    db,
                    'SELECT detail_key, item_key, payload_json FROM tool_details WHERE conversation_id = ? ORDER BY detail_key',
                    [conversation]
                ).map((row) => ({
                    detailKey: row.detail_key,
                    itemKey: row.item_key,
                    payload: parseJson(row.payload_json)
                })),
                usage: readKeyedDetails(db, 'usage_records', 'usage_key', conversation),
                taskOutcomes: readKeyedDetails(db, 'task_outcomes', 'outcome_key', conversation),
                coverage: parseJson(record.coverage_json)
            };
        } finally {
            db.close();
        }
    }

    /** Internal recovery evidence. Checkpoints never enter readConversation(). */
    async readCheckpoint(conversationId) {
        const conversation = requiredString(conversationId, 'conversationId');
        await this.init();
        const db = await this.openDatabase();
        try {
            const row = queryOne(
                db,
                'SELECT checkpoint_json FROM analysis_checkpoints WHERE conversation_id = ?',
                [conversation]
            );
            return row ? parseJson(row.checkpoint_json) : null;
        } finally {
            db.close();
        }
    }

    /** Internal staging inspection for restart recovery; never an App DTO. */
    async readStagedBatch(conversationId, batchId) {
        const conversation = requiredString(conversationId, 'conversationId');
        const batch = requiredString(batchId, 'batchId');
        await this.init();
        const db = await this.openDatabase();
        try {
            const row = queryOne(
                db,
                'SELECT delivery_json, payload_json, payload_hash, staged_at, published_at FROM staging_batches WHERE conversation_id = ? AND batch_id = ?',
                [conversation, batch]
            );
            if (!row) return null;
            return {
                conversationId: conversation,
                batchId: batch,
                deliveryIdentity: parseJson(row.delivery_json),
                payload: parseJson(row.payload_json),
                payloadHash: row.payload_hash,
                stagedAt: row.staged_at,
                publishedAt: row.published_at
            };
        } finally {
            db.close();
        }
    }

    async writeTransaction(operation) {
        await this.init();
        return withWriteQueue(this.databasePath, async () => {
            const db = await this.openDatabase();
            let result;
            try {
                db.run('BEGIN IMMEDIATE');
                try {
                    result = operation(db);
                    db.run('COMMIT');
                } catch (error) {
                    try { db.run('ROLLBACK'); } catch (_) { /* preserve the original transaction error */ }
                    throw error;
                }
                await persistDatabase(db, this.databasePath);
                return result;
            } catch (error) {
                if (error?.code) throw error;
                throw storeError('CODEX_HISTORY_PRODUCT_TRANSACTION_FAILED', 'The SQLite Store transaction failed; the previous on-disk database remains authoritative.', error);
            } finally {
                db.close();
            }
        });
    }

    async openDatabase() {
        const SQL = await getSqlModule();
        let bytes;
        let db;
        try {
            bytes = await fs.promises.readFile(this.databasePath);
        } catch (error) {
            if (error?.code === 'ENOENT') {
                db = new SQL.Database();
            } else {
                throw storeError('CODEX_HISTORY_PRODUCT_DATABASE_READ_FAILED', 'Unable to read the product history database.', error);
            }
        }
        try {
            if (!db) db = new SQL.Database(bytes);
            db.run('PRAGMA foreign_keys = ON');
            return db;
        } catch (error) {
            try { db?.close(); } catch (_) { /* keep the open error */ }
            throw storeError('CODEX_HISTORY_PRODUCT_DATABASE_CORRUPT', 'The product history database cannot be opened; it was not replaced.', error);
        }
    }

    applyMigrations(db) {
        const row = queryOne(db, 'PRAGMA user_version');
        const version = Number(row?.user_version ?? 0);
        if (!Number.isSafeInteger(version) || version < 0) {
            throw storeError('CODEX_HISTORY_PRODUCT_SCHEMA_INVALID', 'SQLite user_version is invalid.');
        }
        if (version > CURRENT_SCHEMA_VERSION) {
            throw storeError('CODEX_HISTORY_PRODUCT_SCHEMA_NEWER', `Database schema ${version} is newer than supported schema ${CURRENT_SCHEMA_VERSION}.`);
        }
        if (version === CURRENT_SCHEMA_VERSION) return false;
        if (version === 0) {
            db.run('BEGIN IMMEDIATE');
            try {
                db.run(MIGRATION_1);
                db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [1, normalizeTimestamp(this.now())]);
                db.run('PRAGMA user_version = 1');
                db.run('COMMIT');
            } catch (error) {
                try { db.run('ROLLBACK'); } catch (_) { /* preserve the migration error */ }
                throw storeError('CODEX_HISTORY_PRODUCT_MIGRATION_FAILED', 'SQLite schema migration 1 failed.', error);
            }
            return true;
        }
        throw storeError('CODEX_HISTORY_PRODUCT_MIGRATION_MISSING', `No migration is registered from schema ${version}.`);
    }
}

async function getSqlModule() {
    if (!sqlModulePromise) {
        const moduleDirectory = path.dirname(require.resolve('sql.js'));
        const wasmPath = path.join(moduleDirectory, 'sql-wasm.wasm');
        sqlModulePromise = initSqlJs({ locateFile: () => wasmPath }).catch((error) => {
            sqlModulePromise = null;
            throw storeError('CODEX_HISTORY_PRODUCT_SQLITE_INIT_FAILED', 'Unable to initialize the bundled SQLite WebAssembly module.', error);
        });
    }
    return sqlModulePromise;
}

function normalizeProjection({ items, toolDetails, usage, taskOutcomes, coverage, checkpoint }) {
    return {
        items: requireArray(items, 'items').map((item, index) => normalizeItem(item, index)),
        toolDetails: normalizeDetails(toolDetails, 'toolDetails', 'detailKey', true),
        usage: normalizeDetails(usage, 'usage', 'usageKey', false),
        taskOutcomes: normalizeDetails(taskOutcomes, 'taskOutcomes', 'outcomeKey', false),
        coverage: normalizeJsonObject(coverage, 'coverage'),
        checkpoint: checkpoint === null ? null : normalizeJsonObject(checkpoint, 'checkpoint')
    };
}

function normalizeItem(value, index) {
    const item = requireObject(value, `items[${index}]`);
    const ordinal = item.ordinal === undefined || item.ordinal === null ? index : item.ordinal;
    if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
        throw storeError('CODEX_HISTORY_PRODUCT_ITEM_INVALID', `items[${index}].ordinal must be a non-negative safe integer.`);
    }
    return {
        itemKey: requiredString(item.itemKey, `items[${index}].itemKey`),
        eventId: optionalString(item.eventId, `items[${index}].eventId`),
        turnId: optionalString(item.turnId, `items[${index}].turnId`),
        itemType: requiredString(item.itemType, `items[${index}].itemType`),
        ordinal,
        payload: normalizeJsonValue(item.payload ?? {})
    };
}

function normalizeDetails(values, field, keyField, withItemKey) {
    return requireArray(values, field).map((value, index) => {
        const item = requireObject(value, `${field}[${index}]`);
        return {
            key: requiredString(item[keyField], `${field}[${index}].${keyField}`),
            ...(withItemKey ? { itemKey: optionalString(item.itemKey, `${field}[${index}].itemKey`) } : {}),
            payload: normalizeJsonValue(item.payload ?? {})
        };
    });
}

function insertItems(db, conversationId, items) {
    const statement = db.prepare('INSERT INTO history_items (conversation_id, item_key, event_id, turn_id, item_type, ordinal, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
    try {
        for (const item of items) {
            statement.run([
                conversationId,
                item.itemKey,
                item.eventId,
                item.turnId,
                item.itemType,
                item.ordinal,
                serializeJson(item.payload)
            ]);
        }
    } finally {
        statement.free();
    }
}

function insertKeyedDetails(db, table, keyColumn, conversationId, values) {
    const itemKeyColumn = table === 'tool_details' ? ', item_key' : '';
    const itemKeyValue = table === 'tool_details' ? ', ?' : '';
    const statement = db.prepare(`INSERT INTO ${table} (conversation_id, ${keyColumn}${itemKeyColumn}, payload_json) VALUES (?, ?${itemKeyValue}, ?)`);
    try {
        for (const item of values) {
            const params = [conversationId, item.key];
            if (table === 'tool_details') params.push(item.itemKey);
            params.push(serializeJson(item.payload));
            statement.run(params);
        }
    } finally {
        statement.free();
    }
}

function writeCheckpoint(db, conversationId, checkpoint, timestamp) {
    if (checkpoint === null) {
        db.run('DELETE FROM analysis_checkpoints WHERE conversation_id = ?', [conversationId]);
        return;
    }
    db.run(
        'INSERT INTO analysis_checkpoints (conversation_id, checkpoint_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(conversation_id) DO UPDATE SET checkpoint_json = excluded.checkpoint_json, updated_at = excluded.updated_at',
        [conversationId, serializeJson(checkpoint), timestamp]
    );
}

function readKeyedDetails(db, table, keyColumn, conversationId) {
    return queryAll(
        db,
        `SELECT ${keyColumn}, payload_json FROM ${table} WHERE conversation_id = ? ORDER BY ${keyColumn}`,
        [conversationId]
    ).map((row) => ({
        [keyColumn === 'usage_key' ? 'usageKey' : 'outcomeKey']: row[keyColumn],
        payload: parseJson(row.payload_json)
    }));
}

function queryOne(db, sql, parameters = []) {
    const statement = db.prepare(sql);
    try {
        statement.bind(parameters);
        return statement.step() ? statement.getAsObject() : null;
    } finally {
        statement.free();
    }
}

function queryAll(db, sql, parameters = []) {
    const statement = db.prepare(sql);
    const rows = [];
    try {
        statement.bind(parameters);
        while (statement.step()) rows.push(statement.getAsObject());
        return rows;
    } finally {
        statement.free();
    }
}

async function persistDatabase(db, databasePath) {
    const directory = path.dirname(databasePath);
    const temporaryPath = path.join(directory, `.${path.basename(databasePath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
    const bytes = Buffer.from(db.export());
    let handle;
    try {
        handle = await fs.promises.open(temporaryPath, 'wx', 0o600);
        await handle.writeFile(bytes);
        await handle.sync();
    } catch (error) {
        await safeUnlink(temporaryPath);
        throw storeError('CODEX_HISTORY_PRODUCT_PERSIST_FAILED', 'Unable to flush the temporary SQLite database snapshot.', error);
    } finally {
        if (handle) await handle.close();
    }

    try {
        await fs.promises.rename(temporaryPath, databasePath);
    } catch (error) {
        await safeUnlink(temporaryPath);
        throw storeError('CODEX_HISTORY_PRODUCT_PERSIST_FAILED', 'Unable to atomically replace the SQLite database snapshot.', error);
    }
}

function withWriteQueue(databasePath, operation) {
    const key = path.resolve(databasePath);
    const previous = WRITE_QUEUES.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    WRITE_QUEUES.set(key, current);
    return current.finally(() => {
        if (WRITE_QUEUES.get(key) === current) WRITE_QUEUES.delete(key);
    });
}

function storeError(code, message, cause = undefined) {
    const error = new Error(message, cause === undefined ? undefined : { cause });
    error.code = code;
    return error;
}

function requiredString(value, field) {
    if (typeof value !== 'string' || !value.trim()) {
        throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', `${field} must be a non-empty string.`);
    }
    return value.trim();
}

function optionalString(value, field) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
        throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', `${field} must be a string or null.`);
    }
    return value;
}

function requireObject(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', `${field} must be an object.`);
    }
    return value;
}

function requireArray(value, field) {
    if (!Array.isArray(value)) {
        throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', `${field} must be an array.`);
    }
    return value;
}

function normalizeJsonObject(value, field) {
    return normalizeJsonValue(requireObject(value, field));
}

function normalizeJsonValue(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', 'JSON numbers must be finite.');
        return value;
    }
    if (Array.isArray(value)) return value.map((item) => normalizeJsonValue(item));
    if (value && typeof value === 'object') {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            if (value[key] !== undefined) {
                Object.defineProperty(result, key, {
                    value: normalizeJsonValue(value[key]),
                    enumerable: true,
                    writable: true,
                    configurable: true
                });
            }
        }
        return result;
    }
    throw storeError('CODEX_HISTORY_PRODUCT_INPUT_INVALID', 'Values must be JSON-compatible.');
}

function stableStringify(value) {
    return JSON.stringify(normalizeJsonValue(value));
}

function serializeJson(value) {
    return stableStringify(value);
}

function parseJson(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw storeError('CODEX_HISTORY_PRODUCT_DATABASE_CORRUPT', 'A stored JSON value is invalid.', error);
    }
}

function sha256(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeTimestamp(value) {
    const timestamp = Number(value);
    return Number.isSafeInteger(timestamp) && timestamp >= 0 ? timestamp : Date.now();
}

async function safeUnlink(filePath) {
    try { await fs.promises.unlink(filePath); } catch (_) { /* best effort cleanup */ }
}

module.exports = {
    CodexHistoryProductStore,
    CURRENT_SCHEMA_VERSION,
    DATABASE_FILENAME
};
