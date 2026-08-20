'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateMessage } = require('./analyzerProtocol');
const { atomicWriteJson } = require('./analysisRunStore');

const COMPLETENESS_RANK = Object.freeze({
    unknown: 0,
    partial: 1,
    provisional: 2,
    canonical: 3
});

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function scopeKey(scope) {
    return [scope.conversationId, scope.sourceId, scope.sourceEpoch].join('\u0000');
}

function normalizeScope(batchOrScope) {
    const value = batchOrScope && typeof batchOrScope === 'object' ? batchOrScope : {};
    const source = value.source && typeof value.source === 'object' ? value.source : {};
    const conversationId = String(
        value.conversationId ?? value.conversation_id ?? value.conversation_id ?? ''
    ).trim();
    const sourceId = String(
        value.sourceId ?? value.source_id ?? source.source_id ?? ''
    ).trim();
    const sourceEpoch = String(
        value.sourceEpoch ?? value.source_epoch ?? source.source_epoch ?? ''
    ).trim();
    if (!conversationId || !sourceId || !sourceEpoch) {
        throw new Error('analysis batch scope is incomplete');
    }
    return { conversationId, sourceId, sourceEpoch };
}

function completenessOf(value) {
    if (typeof value === 'string' && COMPLETENESS_RANK[value] !== undefined) return value;
    return 'unknown';
}

function completenessRank(value) {
    return COMPLETENESS_RANK[completenessOf(value)];
}

function itemKeyOf(item) {
    return item?.item_key || item?.payload?.metadata?.item_key || item?.metadata?.item_key || null;
}

function eventIdOf(item) {
    return item?.event_id || item?.payload?.metadata?.event_id || item?.metadata?.event_id || null;
}

function contentHash(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function emptyState(scope) {
    return {
        scope: { ...scope },
        items: new Map(),
        toolDetails: new Map(),
        taskOutcomes: new Map(),
        usage: null,
        projection: null,
        diagnostics: [],
        batches: [],
        complete: false,
        provisional: true,
        canonical: false,
        replaceApplied: false,
        lastBatchId: null,
        lastCursor: null,
        mutations: []
    };
}

function stateToJson(state) {
    return {
        scope: clone(state.scope),
        items: [...state.items.values()].map(clone),
        tool_details: [...state.toolDetails.values()].map(clone),
        task_outcomes: [...state.taskOutcomes.values()].map(clone),
        usage: clone(state.usage),
        projection: clone(state.projection),
        diagnostics: clone(state.diagnostics),
        batches: clone(state.batches),
        complete: state.complete,
        provisional: state.provisional,
        canonical: state.canonical,
        replace_applied: state.replaceApplied,
        last_batch_id: state.lastBatchId,
        last_cursor: clone(state.lastCursor),
        mutations: clone(state.mutations)
    };
}

function stateFromJson(value, scope) {
    const state = emptyState(scope);
    for (const item of Array.isArray(value?.items) ? value.items : []) {
        if (item?.item_key) state.items.set(item.item_key, item);
    }
    for (const item of Array.isArray(value?.tool_details) ? value.tool_details : []) {
        const key = item?.item_key || item?.call_id;
        if (key) state.toolDetails.set(key, item);
    }
    for (const item of Array.isArray(value?.task_outcomes) ? value.task_outcomes : []) {
        if (item?.item_key) state.taskOutcomes.set(item.item_key, item);
    }
    state.usage = value?.usage || null;
    state.projection = value?.projection || null;
    state.diagnostics = Array.isArray(value?.diagnostics) ? value.diagnostics : [];
    state.batches = Array.isArray(value?.batches) ? value.batches : [];
    state.complete = Boolean(value?.complete);
    state.provisional = value?.provisional !== false;
    state.canonical = Boolean(value?.canonical);
    state.replaceApplied = Boolean(value?.replace_applied);
    state.lastBatchId = value?.last_batch_id || null;
    state.lastCursor = value?.last_cursor || null;
    state.mutations = Array.isArray(value?.mutations) ? value.mutations : [];
    return state;
}

class MemoryAnalysisStore {
    constructor() {
        this.states = new Map();
        this.operations = [];
    }

    async init() {
        return this;
    }

    async _state(scope) {
        const key = scopeKey(scope);
        if (!this.states.has(key)) this.states.set(key, emptyState(scope));
        return this.states.get(key);
    }

    async replaceScope(scope) {
        const state = emptyState(scope);
        state.replaceApplied = true;
        this.states.set(scopeKey(scope), state);
        this.operations.push(['replace', scopeKey(scope)]);
        return state;
    }

    async replaceConversation(conversationId, scope) {
        const normalizedConversationId = String(conversationId || '').trim();
        const newKey = scopeKey(scope);
        for (const [key, state] of this.states) {
            if (key !== newKey && state.scope.conversationId === normalizedConversationId) {
                this.states.delete(key);
            }
        }
        this.operations.push(['replace_conversation', normalizedConversationId, newKey]);
        return this.replaceScope(scope);
    }

    async applyBatch(batch) {
        const scope = normalizeScope(batch);
        let state = await this._state(scope);
        // A retry of the exact same batch after a process crash is idempotent,
        // including when that batch was the first replacement batch.  Check
        // the durable batch id before the source-epoch replacement guard so
        // the retry path does not turn into a false same-epoch replacement.
        if (state.batches.includes(batch.batch_id)) {
            return { state, duplicate: true };
        }
        if (batch.replace_previous && (state.replaceApplied || state.batches.length > 0)) {
            const error = new Error('replace_previous requires a new source epoch scope');
            error.code = 'ANALYSIS_SOURCE_EPOCH_REQUIRED';
            throw error;
        }
        if (batch.replace_previous && !state.replaceApplied) {
            if (typeof this.replaceConversation === 'function') {
                state = await this.replaceConversation(scope.conversationId, scope);
            } else {
                state = await this.replaceScope(scope);
            }
        }
        const batchCompleteness = completenessOf(batch.completeness || (batch.complete ? 'canonical' : 'partial'));
        const batchRank = completenessRank(batchCompleteness);
        const revision = Number.isSafeInteger(batch?.source_range?.end)
            ? batch.source_range.end
            : (Number.isSafeInteger(batch?.progress?.bytes_scanned) ? batch.progress.bytes_scanned : 0);

        for (const item of batch.history_items) {
            const itemKey = itemKeyOf(item);
            if (!itemKey) {
                const error = new Error('history item is missing stable item_key');
                error.code = 'ANALYSIS_ITEM_KEY_MISSING';
                throw error;
            }
            const incoming = {
                item_key: itemKey,
                event_id: eventIdOf(item),
                event: clone(item),
                content_hash: contentHash(item),
                completeness: batchCompleteness,
                source_epoch: batch.source_epoch,
                revision
            };
            const existing = state.items.get(itemKey);
            const existingIsCanonical = existing && completenessRank(existing.completeness) >= 3;
            if (!existing ||
                batchRank >= 3 ||
                (!existingIsCanonical && (
                    completenessRank(incoming.completeness) >= completenessRank(existing.completeness) ||
                    incoming.revision > (existing.revision || 0)
                ))) {
                state.items.set(itemKey, incoming);
            }
        }

        for (const detail of Array.isArray(batch.tool_details) ? batch.tool_details : []) {
            const key = detail.item_key || detail.call_id;
            if (!key) continue;
            const existing = state.toolDetails.get(key);
            if (!existing || completenessRank(detail.completeness) >= completenessRank(existing.completeness)) {
                state.toolDetails.set(key, clone(detail));
            }
        }
        for (const outcome of Array.isArray(batch.task_outcomes) ? batch.task_outcomes : []) {
            if (!outcome.item_key) continue;
            const existing = state.taskOutcomes.get(outcome.item_key);
            if (!existing || completenessRank(outcome.completeness) >= completenessRank(existing.completeness)) {
                state.taskOutcomes.set(outcome.item_key, clone(outcome));
            }
        }
        if (batch.usage && (!state.usage || !state.canonical || batchRank >= 3)) {
            state.usage = clone(batch.usage);
        }
        if (batch.projection && (!state.projection || !state.canonical || batchRank >= 3)) {
            state.projection = clone(batch.projection);
        }
        for (const diagnostic of Array.isArray(batch.diagnostics) ? batch.diagnostics : []) {
            const marker = JSON.stringify(diagnostic);
            if (!state.diagnostics.some((entry) => JSON.stringify(entry) === marker)) {
                state.diagnostics.push(clone(diagnostic));
            }
        }
        for (const mutation of Array.isArray(batch.mutations) ? batch.mutations : []) {
            const marker = contentHash(mutation);
            if (!state.mutations.some((entry) => entry.content_hash === marker)) {
                state.mutations.push({ content_hash: marker, mutation: clone(mutation) });
            }
        }

        const completeRange = Array.isArray(batch.mutations) && batch.mutations.some(
            (mutation) => mutation?.mutation === 'complete_range'
        );
        const staleIncompleteOverlap = state.canonical && batchRank < 3 && !completeRange;
        if (batchCompleteness === 'canonical' || completeRange) {
            state.canonical = true;
            state.complete = true;
            state.provisional = false;
            if (state.projection && typeof state.projection === 'object') {
                state.projection.complete = true;
                state.projection.provisional = false;
            }
        } else if (!staleIncompleteOverlap) {
            state.provisional = true;
            if (state.projection && typeof state.projection === 'object') {
                state.projection.complete = false;
                state.projection.provisional = true;
            }
        }
        state.batches.push(batch.batch_id);
        state.lastBatchId = batch.batch_id;
        state.lastCursor = clone(batch.next_cursor);
        this.operations.push(['apply', batch.batch_id]);
        return { state, duplicate: false };
    }

    async snapshot(scope) {
        return stateToJson(await this._state(normalizeScope(scope)));
    }
}

class FileAnalysisStore extends MemoryAnalysisStore {
    constructor({ rootDir = path.resolve(process.cwd(), 'data', 'codex-rollout-analysis') } = {}) {
        super();
        this.rootDir = path.resolve(rootDir);
    }

    pathFor(scope) {
        const digest = crypto.createHash('sha256').update(scopeKey(scope)).digest('hex');
        return path.join(this.rootDir, `${digest}.json`);
    }

    async init() {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
        return this;
    }

    async _state(scope) {
        const key = scopeKey(scope);
        if (!this.states.has(key)) {
            let value = null;
            try {
                value = JSON.parse((await fs.promises.readFile(this.pathFor(scope))).toString('utf8'));
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
            this.states.set(key, value ? stateFromJson(value, scope) : emptyState(scope));
        }
        return this.states.get(key);
    }

    async _persist(state) {
        await atomicWriteJson(this.pathFor(state.scope), stateToJson(state));
    }

    async replaceScope(scope) {
        const state = await super.replaceScope(scope);
        await this._persist(state);
        return state;
    }

    async replaceConversation(conversationId, scope) {
        const normalizedConversationId = String(conversationId || '').trim();
        const newKey = scopeKey(scope);
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
            const fileScope = value?.scope;
            if (fileScope?.conversationId === normalizedConversationId
                && scopeKey(fileScope) !== newKey) {
                await fs.promises.unlink(filePath);
                this.states.delete(scopeKey(fileScope));
            }
        }
        return super.replaceConversation(normalizedConversationId, scope);
    }

    async applyBatch(batch) {
        const result = await super.applyBatch(batch);
        if (!result.duplicate) await this._persist(result.state);
        return result;
    }
}

class AnalysisBatchImporter {
    constructor({ store = new MemoryAnalysisStore(), checkpointStore = null } = {}) {
        this.store = store;
        this.checkpointStore = checkpointStore;
    }

    async init() {
        await this.store?.init?.();
        await this.checkpointStore?.init?.();
        return this;
    }

    async importBatch(batch, { checkpoint = null } = {}) {
        validateMessage(batch);
        const scope = normalizeScope(batch);
        const result = await this.store.applyBatch(batch);
        if (batch.replace_previous && !result.duplicate && this.checkpointStore?.replaceConversation) {
            await this.checkpointStore.replaceConversation(batch.conversation_id, scope);
        }
        if (checkpoint && this.checkpointStore) {
            await this.checkpointStore.save(scope, checkpoint);
        }
        return {
            accepted: true,
            persisted: true,
            duplicate: result.duplicate,
            scope,
            state: await this.store.snapshot(scope)
        };
    }

    async commitComplete(complete, { scope, checkpoint = complete?.checkpoint || null } = {}) {
        if (!complete || complete.message_type !== 'complete') {
            throw new Error('complete message is required');
        }
        const normalizedScope = normalizeScope(scope || checkpoint);
        if (checkpoint && this.checkpointStore) {
            await this.checkpointStore.save(normalizedScope, checkpoint);
        }
        return this.store.snapshot(normalizedScope);
    }
}

module.exports = {
    COMPLETENESS_RANK,
    MemoryAnalysisStore,
    FileAnalysisStore,
    AnalysisBatchImporter,
    normalizeScope,
    scopeKey,
    completenessOf,
    itemKeyOf
};
