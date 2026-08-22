'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateMessage } = require('./analyzerProtocol');
const { atomicWriteJson } = require('./analysisRunStore');
const { normalizeCheckpoint } = require('./analysisCheckpointStore');

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
    if (sourceEpoch === 'unbound') {
        throw new Error('analysis batch source epoch must be bound');
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
        retired: false,
        activeHead: true,
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
        replacementBatchId: null,
        lastBatchId: null,
        lastCursor: null,
        lastRevision: 0,
        lastCompleteness: 'unknown',
        usageRevision: 0,
        usageCompleteness: 'unknown',
        usageSourceEpoch: null,
        projectionRevision: 0,
        projectionCompleteness: 'unknown',
        projectionSourceEpoch: null,
        mutations: [],
        replacements: [],
        batchRequestIds: new Map()
    };
}

function retiredState(scope) {
    const state = emptyState(scope);
    state.retired = true;
    state.activeHead = false;
    return state;
}

function stateToJson(state) {
    return {
        scope: clone(state.scope),
        retired: state.retired,
        active_head: state.activeHead,
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
        replacement_batch_id: state.replacementBatchId,
        last_batch_id: state.lastBatchId,
        last_cursor: clone(state.lastCursor),
        last_revision: state.lastRevision,
        last_completeness: state.lastCompleteness,
        batch_request_ids: [...state.batchRequestIds.entries()],
        usage_revision: state.usageRevision,
        usage_completeness: state.usageCompleteness,
        usage_source_epoch: state.usageSourceEpoch,
        projection_revision: state.projectionRevision,
        projection_completeness: state.projectionCompleteness,
        projection_source_epoch: state.projectionSourceEpoch,
        mutations: clone(state.mutations),
        replacements: clone(state.replacements)
    };
}

function stateFromJson(value, scope) {
    const state = emptyState(scope);
    state.retired = Boolean(value?.retired);
    // Old state files predate the active-head marker and represent the
    // current source epoch, so they remain active by default.
    state.activeHead = value?.active_head !== false;
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
    const requestEntries = Array.isArray(value?.batch_request_ids)
        ? value.batch_request_ids
        : Object.entries(value?.batch_request_ids || {});
    for (const entry of requestEntries) {
        if (Array.isArray(entry)
            && typeof entry[0] === 'string'
            && entry[0]
            && typeof entry[1] === 'string'
            && entry[1]) {
            state.batchRequestIds.set(entry[0], entry[1]);
        }
    }
    state.complete = Boolean(value?.complete);
    state.provisional = value?.provisional !== false;
    state.canonical = Boolean(value?.canonical);
    state.replaceApplied = Boolean(value?.replace_applied);
    state.replacementBatchId = value?.replacement_batch_id || null;
    state.lastBatchId = value?.last_batch_id || null;
    state.lastCursor = value?.last_cursor || null;
    state.lastRevision = Number.isSafeInteger(value?.last_revision) ? value.last_revision : 0;
    state.lastCompleteness = value?.last_completeness
        ? completenessOf(value.last_completeness)
        : (state.canonical ? 'canonical' : 'unknown');
    state.usageRevision = Number.isSafeInteger(value?.usage_revision) ? value.usage_revision : 0;
    state.usageCompleteness = completenessOf(value?.usage_completeness);
    state.usageSourceEpoch = value?.usage_source_epoch || null;
    state.projectionRevision = Number.isSafeInteger(value?.projection_revision)
        ? value.projection_revision
        : 0;
    state.projectionCompleteness = completenessOf(value?.projection_completeness);
    state.projectionSourceEpoch = value?.projection_source_epoch || null;
    state.mutations = Array.isArray(value?.mutations) ? value.mutations : [];
    state.replacements = Array.isArray(value?.replacements) ? value.replacements : [];
    if (state.retired) {
        state.activeHead = false;
        state.items.clear();
        state.toolDetails.clear();
        state.taskOutcomes.clear();
        state.usage = null;
        state.projection = null;
        state.diagnostics = [];
        state.batches = [];
        state.complete = false;
        state.provisional = true;
        state.canonical = false;
        state.replaceApplied = false;
        state.replacementBatchId = null;
        state.lastBatchId = null;
        state.lastCursor = null;
        state.lastRevision = 0;
        state.lastCompleteness = 'unknown';
        state.usageRevision = 0;
        state.usageCompleteness = 'unknown';
        state.usageSourceEpoch = null;
        state.projectionRevision = 0;
        state.projectionCompleteness = 'unknown';
        state.projectionSourceEpoch = null;
        state.mutations = [];
        state.replacements = [];
        state.batchRequestIds.clear();
    }
    return state;
}

function canReplace(existing, incoming) {
    if (!existing) return true;
    const incomingRank = completenessRank(incoming?.completeness);
    const existingRank = completenessRank(existing?.completeness);
    if (incomingRank !== existingRank) return incomingRank > existingRank;
    if (existing.source_epoch && incoming.source_epoch
        && existing.source_epoch !== incoming.source_epoch) return false;
    return Number.isSafeInteger(incoming?.revision)
        && incoming.revision > (Number.isSafeInteger(existing?.revision) ? existing.revision : 0);
}

function batchRevision(batch) {
    const candidates = [];
    if (Number.isSafeInteger(batch?.revision) && batch.revision >= 0) {
        candidates.push(batch.revision);
    }
    if (Number.isSafeInteger(batch?.source_range?.end) && batch.source_range.end >= 0) {
        candidates.push(batch.source_range.end);
    }
    if (Number.isSafeInteger(batch?.progress?.bytes_scanned) && batch.progress.bytes_scanned >= 0) {
        candidates.push(batch.progress.bytes_scanned);
    }
    return candidates.length ? Math.max(...candidates) : 0;
}

function explicitRevision(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function mutationRevisionFor(batch, itemKey, mutationKinds) {
    const candidates = [];
    for (const mutation of Array.isArray(batch?.mutations) ? batch.mutations : []) {
        if (!mutationKinds.includes(mutation?.mutation)) continue;
        if (itemKey !== null && itemKeyOf(mutation.item) !== itemKey) continue;
        const revision = explicitRevision(mutation?.item?.revision);
        if (revision !== null) candidates.push(revision);
    }
    return candidates.length ? Math.max(...candidates) : null;
}

function historyItemRevision(batch, item) {
    const itemKey = itemKeyOf(item);
    return mutationRevisionFor(batch, itemKey, ['upsert_item'])
        ?? explicitRevision(item?.revision)
        ?? explicitRevision(item?.metadata?.revision)
        ?? explicitRevision(item?.payload?.metadata?.revision)
        ?? batchRevision(batch);
}

function sameScope(left, right) {
    return Boolean(left && right)
        && left.conversationId === right.conversationId
        && left.sourceId === right.sourceId
        && left.sourceEpoch === right.sourceEpoch;
}

function replacementFactsOf(batch) {
    const candidates = [
        ...(Array.isArray(batch?.replacements) ? batch.replacements : []),
        ...(Array.isArray(batch?.mutations)
            ? batch.mutations
                .filter((mutation) => mutation?.mutation === 'replace_last_turn')
                .map((mutation) => mutation.replacement)
            : [])
    ];
    const unique = new Map();
    for (const replacement of candidates) {
        if (!replacement?.replacement_key) continue;
        const existing = unique.get(replacement.replacement_key);
        if (existing) {
            if (JSON.stringify(existing) !== JSON.stringify(replacement)) {
                const error = new Error('replacement key was reused with different evidence');
                error.code = 'ANALYSIS_REPLACEMENT_CONFLICT';
                throw error;
            }
            continue;
        }
        unique.set(replacement.replacement_key, replacement);
    }
    return [...unique.values()];
}

function assertReplacementFactsCompatible(state, replacementFacts) {
    for (const replacement of replacementFacts) {
        const existing = state.replacements.find(
            (candidate) => candidate.replacement_key === replacement.replacement_key
        );
        if (existing && JSON.stringify(existing) !== JSON.stringify(replacement)) {
            const error = new Error('replacement key was reused with different evidence');
            error.code = 'ANALYSIS_REPLACEMENT_CONFLICT';
            throw error;
        }
    }
}

function assertCanonicalReplacementBatch(batch, replacementFacts) {
    if (replacementFacts.length > 0 && batch.completeness !== 'canonical') {
        const error = new Error('replacement evidence requires canonical batch');
        error.code = 'ANALYSIS_REPLACEMENT_REQUIRES_CANONICAL';
        throw error;
    }
}

function lastTurnReplacementFactOf(batch) {
    if (batch?.replace_previous || batch?.completeness !== 'canonical') return null;
    const facts = replacementFactsOf(batch);
    if (!facts.length) return null;

    const byChildRollout = new Map();
    for (const replacement of facts) {
        if (replacement.conversation_id !== batch.conversation_id) return null;
        const existing = byChildRollout.get(replacement.child_rollout_id);
        if (existing && existing.replacement_key !== replacement.replacement_key) {
            return null;
        }
        byChildRollout.set(replacement.child_rollout_id, replacement);
    }

    const visited = new Set();
    let expectedChildRollout = batch.source_id;
    let immediateReplacement = null;
    while (byChildRollout.has(expectedChildRollout)) {
        if (visited.has(expectedChildRollout)) return null;
        visited.add(expectedChildRollout);
        const replacement = byChildRollout.get(expectedChildRollout);
        immediateReplacement ||= replacement;
        expectedChildRollout = replacement.parent_rollout_id;
    }
    if (visited.size !== facts.length) return null;
    return immediateReplacement;
}

function sourceEpochError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function requireWritableState(state) {
    if (state?.retired) {
        const error = new Error('source epoch is retired');
        error.code = 'ANALYSIS_SOURCE_EPOCH_RETIRED';
        throw error;
    }
    if (state?.activeHead === false) {
        const error = new Error('source epoch is no longer the active conversation head');
        error.code = 'ANALYSIS_SOURCE_EPOCH_INACTIVE';
        throw error;
    }
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

    async replaceScope(scope, replacementBatchId = null) {
        const state = emptyState(scope);
        state.replaceApplied = true;
        state.replacementBatchId = replacementBatchId;
        this.states.set(scopeKey(scope), state);
        this.operations.push(['replace', scopeKey(scope)]);
        return state;
    }

    async replaceConversation(conversationId, scope, replacementBatchId = null) {
        const normalizedConversationId = String(conversationId || '').trim();
        const newKey = scopeKey(scope);
        for (const [key, state] of this.states) {
            if (key !== newKey && state.scope.conversationId === normalizedConversationId) {
                this.states.set(key, retiredState(state.scope));
            }
        }
        this.operations.push(['replace_conversation', normalizedConversationId, newKey]);
        return this.replaceScope(scope, replacementBatchId);
    }

    async applyBatch(batch) {
        validateMessage(batch);
        const scope = normalizeScope(batch);
        const key = scopeKey(scope);
        const existing = this.states.get(key) || null;
        if (existing?.retired) requireWritableState(existing);
        const retiredEpoch = [...this.states.values()].find(
            (candidate) => candidate.scope.conversationId === scope.conversationId
                && candidate.retired
                && candidate.scope.sourceEpoch === scope.sourceEpoch
        );
        if (retiredEpoch) requireWritableState(retiredEpoch);

        const replacementFacts = replacementFactsOf(batch);
        if (batch.replace_previous && replacementFacts.length > 0) {
            throw sourceEpochError(
                'ANALYSIS_REPLACEMENT_REQUIRES_SEPARATE_SOURCE_TRANSITION',
                'last-turn replacement must not use replace_previous'
            );
        }
        const transitionReplacement = lastTurnReplacementFactOf(batch);
        assertCanonicalReplacementBatch(batch, replacementFacts);

        // A retry of the exact same batch after a process crash is idempotent.
        // Check the durable batch id before source-head arbitration so a
        // duplicate child batch is not mistaken for a second active epoch.
        if (existing?.batches.includes(batch.batch_id)) {
            return { state: existing, duplicate: true };
        }

        const activeStates = [...this.states.values()].filter(
            (candidate) => candidate.scope.conversationId === scope.conversationId
                && !candidate.retired
                && candidate.activeHead !== false
        );
        if (activeStates.length > 1) {
            throw sourceEpochError(
                'ANALYSIS_SOURCE_EPOCH_AMBIGUOUS',
                'multiple active source epochs exist for conversation'
            );
        }
        const active = activeStates[0] || null;
        const sameActiveScope = active ? sameScope(active.scope, scope) : false;
        const transitionParent = transitionReplacement
            && active
            && !sameActiveScope
            && active.scope.sourceId === transitionReplacement.parent_rollout_id
            ? active
            : null;
        if (active && active.scope.sourceEpoch === scope.sourceEpoch && !sameActiveScope) {
            if (!transitionParent) {
                throw sourceEpochError(
                    'ANALYSIS_SOURCE_EPOCH_REQUIRED',
                    'source epoch is already bound to another source identity'
                );
            }
        }
        if (active && !sameActiveScope && !batch.replace_previous && !transitionParent) {
            throw sourceEpochError(
                'ANALYSIS_SOURCE_EPOCH_REQUIRED',
                'a new source epoch requires replace_previous'
            );
        }

        let state = existing;
        const pendingReplacementRetry = Boolean(
            batch.replace_previous
            && state?.replaceApplied
            && state.batches.length === 0
            && state.replacementBatchId === batch.batch_id
        );
        if (batch.replace_previous && state
            && (state.replaceApplied || state.batches.length > 0)
            && !pendingReplacementRetry) {
            throw sourceEpochError(
                'ANALYSIS_SOURCE_EPOCH_REQUIRED',
                'replace_previous is only valid for the first batch of a new source epoch'
            );
        }
        if (state?.replaceApplied && state.batches.length === 0
            && !batch.replace_previous && !pendingReplacementRetry) {
            throw sourceEpochError(
                'ANALYSIS_SOURCE_EPOCH_REQUIRED',
                'the first batch of a replacement epoch must carry replace_previous'
            );
        }
        if (!state) {
            state = await this._state(scope);
        }
        if (batch.replace_previous && !pendingReplacementRetry) {
            if (typeof this.replaceConversation === 'function') {
                state = await this.replaceConversation(scope.conversationId, scope, batch.batch_id);
            } else {
                state = await this.replaceScope(scope, batch.batch_id);
            }
        } else {
            requireWritableState(state);
        }
        // Replacement evidence is the conflict-sensitive part of the batch.
        // Preflight it before any item, projection, mutation, or head state is
        // changed so Memory and File stores fail atomically for this error.
        assertReplacementFactsCompatible(state, replacementFacts);
        const batchCompleteness = completenessOf(batch.completeness || (batch.complete ? 'canonical' : 'partial'));
        const batchRank = completenessRank(batchCompleteness);
        const revision = batchRevision(batch);

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
                revision: historyItemRevision(batch, item)
            };
            const existing = state.items.get(itemKey);
            if (canReplace(existing, incoming)) {
                state.items.set(itemKey, incoming);
            }
        }

        for (const detail of Array.isArray(batch.tool_details) ? batch.tool_details : []) {
            const key = detail.item_key || detail.call_id;
            if (!key) continue;
            const detailRevision = explicitRevision(detail.revision)
                ?? mutationRevisionFor(batch, key, ['upsert_detail'])
                ?? revision;
            const incoming = {
                ...clone(detail),
                completeness: completenessOf(detail.completeness || batchCompleteness),
                source_epoch: detail.source_epoch || batch.source_epoch,
                revision: detailRevision
            };
            const existing = state.toolDetails.get(key);
            if (canReplace(existing, incoming)) {
                state.toolDetails.set(key, incoming);
            }
        }
        for (const outcome of Array.isArray(batch.task_outcomes) ? batch.task_outcomes : []) {
            if (!outcome.item_key) continue;
            const outcomeRevision = explicitRevision(outcome.revision)
                ?? mutationRevisionFor(batch, outcome.item_key, ['upsert_outcome'])
                ?? revision;
            const incoming = {
                ...clone(outcome),
                completeness: completenessOf(outcome.completeness || batchCompleteness),
                source_epoch: outcome.source_epoch || batch.source_epoch,
                revision: outcomeRevision
            };
            const existing = state.taskOutcomes.get(outcome.item_key);
            if (canReplace(existing, incoming)) {
                state.taskOutcomes.set(outcome.item_key, incoming);
            }
        }
        const usageIncoming = batch.usage
            ? {
                ...clone(batch.usage),
                completeness: batchCompleteness,
                source_epoch: batch.source_epoch,
                revision: mutationRevisionFor(batch, null, ['upsert_usage']) ?? revision
            }
            : null;
        if (usageIncoming && canReplace(
            state.usage && {
                completeness: state.usageCompleteness,
                source_epoch: state.usageSourceEpoch,
                revision: state.usageRevision
            },
            usageIncoming
        )) {
            state.usage = usageIncoming;
            state.usageRevision = usageIncoming.revision;
            state.usageCompleteness = batchCompleteness;
            state.usageSourceEpoch = batch.source_epoch;
        }
        const projectionIncoming = batch.projection
            ? {
                ...clone(batch.projection),
                completeness: batchCompleteness,
                source_epoch: batch.source_epoch,
                revision
            }
            : null;
        if (projectionIncoming && canReplace(
            state.projection && {
                completeness: state.projectionCompleteness,
                source_epoch: state.projectionSourceEpoch,
                revision: state.projectionRevision
            },
            projectionIncoming
        )) {
            state.projection = projectionIncoming;
            state.projectionRevision = revision;
            state.projectionCompleteness = batchCompleteness;
            state.projectionSourceEpoch = batch.source_epoch;
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
        for (const replacement of replacementFacts) {
            if (!replacement?.replacement_key) continue;
            const existing = state.replacements.find(
                (candidate) => candidate.replacement_key === replacement.replacement_key
            );
            if (existing) {
                continue;
            }
            state.replacements.push(clone(replacement));
        }

        let transitionParentKey = null;
        if (transitionParent) {
            transitionParent.activeHead = false;
            transitionParentKey = scopeKey(transitionParent.scope);
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
        state.batchRequestIds.set(batch.batch_id, batch.request_id);
        const lastRank = completenessRank(state.lastCompleteness);
        if (batchRank > lastRank || (batchRank === lastRank && revision > state.lastRevision)) {
            state.lastBatchId = batch.batch_id;
            state.lastCursor = clone(batch.next_cursor);
            state.lastRevision = revision;
            state.lastCompleteness = batchCompleteness;
        }
        this.operations.push(['apply', batch.batch_id]);
        return { state, duplicate: false, transitionParentKey };
    }

    async assertScopeWritable(scope) {
        const normalized = normalizeScope(scope);
        const state = await this._state(normalized);
        requireWritableState(state);
        const activeStates = [...this.states.values()].filter(
            (candidate) => candidate.scope.conversationId === normalized.conversationId
                && !candidate.retired
                && candidate.activeHead !== false
        );
        if (activeStates.some((candidate) => !sameScope(candidate.scope, normalized))) {
            throw sourceEpochError(
                'ANALYSIS_SOURCE_EPOCH_REQUIRED',
                'complete belongs to a retired source epoch'
            );
        }
        return state;
    }

    async assertCompleteCommit(scope, requestId) {
        const normalized = normalizeScope(scope);
        const state = await this.assertScopeWritable(normalized);
        const normalizedRequestId = String(requestId || '').trim();
        const importedForRequest = state.batches.length > 0
            && [...state.batchRequestIds.values()].some((value) => value === normalizedRequestId);
        if (!normalizedRequestId || !importedForRequest) {
            const error = new Error('complete requires at least one imported batch from the same request');
            error.code = 'ANALYSIS_COMPLETE_WITHOUT_BATCH';
            throw error;
        }
        return state;
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

    async replaceScope(scope, replacementBatchId = null) {
        const state = await super.replaceScope(scope, replacementBatchId);
        await this._persist(state);
        return state;
    }

    async _loadConversation(conversationId) {
        const normalizedConversationId = String(conversationId || '').trim();
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
            const fileScope = normalizeScope(value?.scope || value);
            if (!fileScope || fileScope.conversationId !== normalizedConversationId) continue;
            const key = scopeKey(fileScope);
            if (!this.states.has(key)) this.states.set(key, stateFromJson(value, fileScope));
        }
    }

    async replaceConversation(conversationId, scope, replacementBatchId = null) {
        const normalizedConversationId = String(conversationId || '').trim();
        await this._loadConversation(normalizedConversationId);
        const newKey = scopeKey(scope);
        const retiredStates = [];
        for (const [key, candidate] of this.states) {
            if (key !== newKey
                && candidate.scope.conversationId === normalizedConversationId
                && !candidate.retired) {
                const retired = retiredState(candidate.scope);
                this.states.set(key, retired);
                retiredStates.push(retired);
            }
        }
        this.operations.push(['replace_conversation', normalizedConversationId, newKey]);
        for (const retired of retiredStates) await this._persist(retired);
        const state = emptyState(scope);
        state.replaceApplied = true;
        state.replacementBatchId = replacementBatchId;
        this.states.set(newKey, state);
        await this._persist(state);
        return state;
    }

    async applyBatch(batch) {
        await this._loadConversation(batch.conversation_id);
        const result = await super.applyBatch(batch);
        if (!result.duplicate) {
            // Persist the parent head first.  If the process stops between
            // these writes, retrying the child is still safe: the parent is
            // retained but no longer writable, and the child can be rebuilt.
            if (result.transitionParentKey) {
                const transitionParent = this.states.get(result.transitionParentKey);
                if (transitionParent) await this._persist(transitionParent);
            }
            await this._persist(result.state);
        }
        return result;
    }

    async assertScopeWritable(scope) {
        const normalized = normalizeScope(scope);
        await this._loadConversation(normalized.conversationId);
        return super.assertScopeWritable(normalized);
    }

    async assertCompleteCommit(scope, requestId) {
        const normalized = normalizeScope(scope);
        await this._loadConversation(normalized.conversationId);
        return super.assertCompleteCommit(normalized, requestId);
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
        let normalizedCheckpoint = null;
        if (checkpoint) {
            normalizedCheckpoint = this._validateCheckpointForScope(
                checkpoint,
                scope,
                batch.completeness,
                batch.request_id
            );
        }
        const result = await this.store.applyBatch(batch);
        if (batch.replace_previous && !result.duplicate && this.checkpointStore?.replaceConversation) {
            await this.checkpointStore.replaceConversation(batch.conversation_id, scope);
        }
        if (normalizedCheckpoint && this.checkpointStore) {
            await this.checkpointStore.save(scope, normalizedCheckpoint);
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
        validateMessage(complete);
        const normalizedScope = normalizeScope(scope || checkpoint);
        const normalizedCheckpoint = this._validateCheckpointForScope(
            checkpoint,
            normalizedScope,
            complete.completeness,
            complete.request_id
        );
        if (typeof this.store.assertCompleteCommit === 'function') {
            await this.store.assertCompleteCommit(normalizedScope, complete.request_id);
        } else if (typeof this.store.assertScopeWritable === 'function') {
            const state = await this.store.assertScopeWritable(normalizedScope);
            const requestIds = state?.batchRequestIds instanceof Map
                ? [...state.batchRequestIds.values()]
                : [];
            if (!state?.batches?.length || !requestIds.includes(complete.request_id)) {
                const error = new Error(
                    'complete requires at least one imported batch from the same request'
                );
                error.code = 'ANALYSIS_COMPLETE_WITHOUT_BATCH';
                throw error;
            }
        }
        if (this.checkpointStore) {
            await this.checkpointStore.save(normalizedScope, normalizedCheckpoint);
        }
        return this.store.snapshot(normalizedScope);
    }

    _validateCheckpointForScope(checkpoint, scope, completeness, requestId = null) {
        let normalized;
        try {
            normalized = normalizeCheckpoint(checkpoint);
        } catch (error) {
            const wrapped = new Error(`invalid analyzer checkpoint: ${error.message}`);
            wrapped.code = 'ANALYSIS_CHECKPOINT_INVALID';
            throw wrapped;
        }
        if (!sameScope(normalized.scope, scope)) {
            const error = new Error('checkpoint scope does not match batch scope');
            error.code = 'ANALYSIS_CHECKPOINT_SCOPE_MISMATCH';
            throw error;
        }
        if (requestId && normalized.checkpoint.request_id !== requestId) {
            const error = new Error('checkpoint request_id does not match message');
            error.code = 'ANALYSIS_CHECKPOINT_REQUEST_MISMATCH';
            throw error;
        }
        if (completeness && normalized.checkpoint.completeness !== completeness) {
            const error = new Error('checkpoint completeness does not match message');
            error.code = 'ANALYSIS_CHECKPOINT_COMPLETENESS_MISMATCH';
            throw error;
        }
        return normalized.checkpoint;
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
