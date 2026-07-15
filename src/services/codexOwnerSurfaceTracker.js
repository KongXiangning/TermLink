'use strict';

const { EventEmitter } = require('node:events');
const { buildDesktopSurfaceSnapshot } = require('./codexIpcThreadStream');

const LOCAL_HOST_ID = 'termlink-local';

class CodexOwnerSurfaceTracker extends EventEmitter {
    constructor() {
        super();
        this._conversations = new Map();
    }

    hasConversation(threadId) {
        return this._conversations.has(normalizeId(threadId));
    }

    getRecentSnapshots() {
        return Array.from(this._conversations.values())
            .map((conversation) => {
                const event = this.buildEvent(conversation.threadId);
                return {
                    conversationId: conversation.threadId,
                    surface: event.surface,
                    timestamp: event.surface.updatedAt || Date.now()
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    registerExternalSurface(threadId, surface = {}, options = {}) {
        const id = normalizeId(threadId || surface.conversationId);
        if (!id) {
            throw new Error('Owner conversation id is required.');
        }

        let conversation = this._conversations.get(id);
        if (!conversation) {
            conversation = {
                threadId: id,
                hostId: LOCAL_HOST_ID,
                revision: 0,
                state: buildInitialState(id, surface),
                seedSurface: clone(surface),
                authoritativeTransientFields: new Set(),
                respondedRequestIds: new Set()
            };
            this._conversations.set(id, conversation);
        } else {
            conversation.seedSurface = mergeSurfaces(conversation.seedSurface, surface);
            applySurfaceMetadata(conversation.state, surface);
        }

        return options.broadcast === false ? undefined : this.broadcast(id);
    }

    registerThreadStart(threadStartResult, options = {}) {
        const result = asRecord(threadStartResult);
        const thread = asRecord(result?.thread);
        const threadId = normalizeId(thread?.id || result?.threadId || options.threadId);
        if (!threadId) {
            throw new Error('thread/start response did not include thread id.');
        }

        const surface = options.seedSurface && typeof options.seedSurface === 'object'
            ? options.seedSurface
            : {};
        const state = buildInitialState(threadId, {
            ...surface,
            title: asString(thread?.name) || asString(surface.title),
            cwd: asString(result?.cwd) || asString(thread?.cwd) || asString(surface.cwd)
        });

        const input = asString(options.input);
        const clientUserMessageId = asString(options.clientUserMessageId);
        if (input && clientUserMessageId) {
            state.turns.push(buildPendingTurn(clientUserMessageId, input, state.cwd));
            state.threadRuntimeStatus = { type: 'active', activeFlags: [] };
        }

        this._conversations.set(threadId, {
            threadId,
            hostId: LOCAL_HOST_ID,
            revision: 0,
            state,
            seedSurface: clone(surface),
            authoritativeTransientFields: new Set(),
            respondedRequestIds: new Set()
        });

        return this.broadcast(threadId);
    }

    registerThreadResume(threadId, options = {}) {
        const id = normalizeId(threadId);
        if (!id) {
            throw new Error('Owner conversation id is required.');
        }
        this.registerExternalSurface(id, options.seedSurface || options.surface || {}, { broadcast: false });
        const conversation = this._conversations.get(id);
        const resumeResult = asRecord(options.resumeResult);
        const thread = asRecord(options.thread) || asRecord(resumeResult?.thread);
        if (conversation && thread) {
            applyThreadMetadata(conversation.state, thread);
            const goal = extractThreadGoal(thread) || extractThreadGoal(resumeResult);
            if (goal) {
                applyGoalUpdate(conversation.state, goal);
                conversation.authoritativeTransientFields.add('activeGoal');
                conversation.authoritativeTransientFields.add('pendingGoalAction');
            }
            touch(conversation.state);
        }
        return this.broadcast(id);
    }

    adoptTurnStartResult(threadId, turnStartResult, clientUserMessageId) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) return undefined;

        const result = asRecord(turnStartResult);
        const turn = normalizeTurn(asRecord(result?.turn), 'inProgress');
        if (!turn) return undefined;

        const pendingTurnId = clientUserMessageId ? `pending:${clientUserMessageId}` : null;
        const turns = Array.isArray(conversation.state.turns) ? conversation.state.turns : [];
        conversation.state.turns = turns;
        const pendingIndex = pendingTurnId
            ? turns.findIndex((candidate) => asString(asRecord(candidate)?.turnId) === pendingTurnId)
            : -1;

        if (pendingIndex >= 0) {
            const pending = asRecord(turns[pendingIndex]) || {};
            turns[pendingIndex] = {
                ...pending,
                ...turn,
                turnId: asString(turn.turnId) || asString(turn.id),
                items: mergeTurnItems(pending.items, turn.items)
            };
        } else {
            upsertTurn(conversation.state, turn);
        }

        applyTurnParams(conversation.state, asRecord(turn.params));
        clearRespondedRequests(conversation);
        markOwnerPendingActionsAuthoritative(conversation);
        conversation.state.threadRuntimeStatus = { type: 'active', activeFlags: [] };
        touch(conversation.state);
        return this.broadcast(conversation.threadId);
    }

    applyThreadSettingsUpdate(threadId, settings, options = {}) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) return undefined;
        const record = asRecord(settings);
        if (record) {
            applySettingsUpdate(conversation.state, record);
            touch(conversation.state);
        }
        return options.broadcast === false ? undefined : this.broadcast(conversation.threadId);
    }

    applyThreadGoalUpdate(threadId, goal, options = {}) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) return undefined;
        const record = asRecord(goal);
        if (record) {
            applyGoalUpdate(conversation.state, record);
            conversation.authoritativeTransientFields.add('activeGoal');
            conversation.authoritativeTransientFields.add('pendingGoalAction');
            touch(conversation.state);
        }
        return options.broadcast === false ? undefined : this.broadcast(conversation.threadId);
    }

    handleNotification(method, params) {
        const normalizedMethod = asString(method);
        if (!normalizedMethod) return undefined;

        if (normalizedMethod === 'thread/started') {
            const threadId = extractThreadId(params);
            if (!threadId || !this._conversations.has(threadId)) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                applyThreadMetadata(conversation.state, asRecord(asRecord(params)?.thread));
            });
        }

        if (normalizedMethod === 'thread/status/changed') {
            const threadId = extractThreadId(params);
            if (!threadId) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                clearRespondedRequests(conversation);
                conversation.state.threadRuntimeStatus = normalizeThreadRuntimeStatus(asRecord(params)?.status);
            });
        }

        if (normalizedMethod === 'thread/settings/updated') {
            const threadId = extractThreadId(params);
            const settings = asRecord(asRecord(params)?.threadSettings);
            return threadId && settings
                ? this.applyThreadSettingsUpdate(threadId, settings)
                : undefined;
        }

        if (normalizedMethod === 'thread/goal/updated') {
            const threadId = extractThreadId(params);
            const goal = asRecord(asRecord(params)?.goal);
            return threadId && goal ? this.applyThreadGoalUpdate(threadId, goal) : undefined;
        }

        if (normalizedMethod === 'thread/goal/cleared') {
            const threadId = extractThreadId(params);
            if (!threadId) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                delete conversation.state.currentGoal;
                delete conversation.state.threadGoal;
                conversation.authoritativeTransientFields.add('activeGoal');
                conversation.authoritativeTransientFields.add('pendingGoalAction');
            });
        }

        if (normalizedMethod === 'serverRequest/resolved') {
            const requestId = asString(asRecord(params)?.requestId) || asString(asRecord(params)?.request_id);
            return requestId ? this.resolveRequest(requestId, extractThreadId(params)) : undefined;
        }

        if (normalizedMethod === 'turn/started' || normalizedMethod === 'turn/completed') {
            const threadId = extractThreadId(params);
            const fallback = normalizedMethod === 'turn/started' ? 'inProgress' : 'completed';
            const turn = normalizeTurn(asRecord(asRecord(params)?.turn), fallback);
            if (!threadId || !turn) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                clearRespondedRequests(conversation);
                upsertTurn(conversation.state, turn);
                applyTurnParams(conversation.state, asRecord(turn.params));
                conversation.state.threadRuntimeStatus = normalizedMethod === 'turn/started'
                    ? { type: 'active', activeFlags: [] }
                    : { type: 'idle' };
            });
        }

        if (normalizedMethod === 'item/started' || normalizedMethod === 'item/completed') {
            const threadId = extractThreadId(params);
            const turnId = asString(asRecord(params)?.turnId);
            const item = asRecord(asRecord(params)?.item);
            if (!threadId || !turnId || !item) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                clearRespondedRequests(conversation);
                const turn = ensureTurn(conversation.state, turnId);
                upsertItem(turn, clone(item));
            });
        }

        if (normalizedMethod === 'item/agentMessage/delta') {
            const threadId = extractThreadId(params);
            if (!threadId) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                clearRespondedRequests(conversation);
                appendDelta(conversation.state, params, 'agentMessage');
            });
        }

        if (normalizedMethod === 'item/plan/delta') {
            const threadId = extractThreadId(params);
            if (!threadId) return undefined;
            return this.updateConversation(threadId, (conversation) => {
                clearRespondedRequests(conversation);
                appendDelta(conversation.state, params, 'plan');
            });
        }

        return undefined;
    }

    handleRequest(id, method, params) {
        const threadId = extractThreadId(params);
        if (!threadId || !this._conversations.has(threadId)) return undefined;

        return this.updateConversation(threadId, (conversation) => {
            const requests = Array.isArray(conversation.state.requests) ? conversation.state.requests : [];
            conversation.state.requests = [
                ...requests.filter((request) => String(asRecord(request)?.id) !== String(id)),
                { id, method, params: clone(params) }
            ];
            markRequestTransientAuthority(conversation, method);
        });
    }

    markRequestResponseSent(id, threadId) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) return false;
        const requests = Array.isArray(conversation.state.requests) ? conversation.state.requests : [];
        if (!requests.some((request) => String(asRecord(request)?.id) === String(id))) {
            return false;
        }
        conversation.respondedRequestIds.add(String(id));
        return true;
    }

    resolveRequest(id, threadId) {
        const conversations = threadId
            ? [this._conversations.get(normalizeId(threadId))].filter(Boolean)
            : Array.from(this._conversations.values());

        for (const conversation of conversations) {
            const requests = Array.isArray(conversation.state.requests) ? conversation.state.requests : [];
            const request = requests.find((candidate) => String(asRecord(candidate)?.id) === String(id));
            const next = requests.filter((request) => String(asRecord(request)?.id) !== String(id));
            if (next.length === requests.length) continue;
            conversation.state.requests = next;
            conversation.respondedRequestIds.delete(String(id));
            markRequestTransientAuthority(conversation, asString(asRecord(request)?.method));
            touch(conversation.state);
            return this.broadcast(conversation.threadId);
        }
        return undefined;
    }

    getSnapshot(threadId) {
        const id = normalizeId(threadId);
        if (!id || !this._conversations.has(id)) return undefined;
        return this.broadcast(id, { incrementRevision: false });
    }

    peekSnapshot(threadId) {
        const id = normalizeId(threadId);
        if (!id || !this._conversations.has(id)) return undefined;
        return this.buildEvent(id);
    }

    updateConversation(threadId, update) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) return undefined;
        update(conversation);
        touch(conversation.state);
        return this.broadcast(conversation.threadId);
    }

    broadcast(threadId, options = {}) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) {
            throw new Error(`Unknown owner conversation: ${threadId}`);
        }
        if (options.incrementRevision !== false) {
            conversation.revision += 1;
        }
        const event = this.buildEvent(conversation.threadId);
        this.emit('broadcast', event);
        return event;
    }

    buildEvent(threadId) {
        const conversation = this._conversations.get(normalizeId(threadId));
        if (!conversation) {
            throw new Error(`Unknown owner conversation: ${threadId}`);
        }

        const state = clone(conversation.state);
        const surface = buildDesktopSurfaceSnapshot(state, {
            conversationId: conversation.threadId,
            revision: conversation.revision,
            ownerKind: 'termlink',
            title: asString(state.title),
            cwd: asString(state.cwd)
        });
        const mergedSurface = mergeSurfaces(conversation.seedSurface, surface, {
            ownerKind: 'termlink',
            revision: conversation.revision,
            authoritativeTransientFields: conversation.authoritativeTransientFields
        });
        const payload = {
            conversationId: conversation.threadId,
            hostId: conversation.hostId,
            change: {
                type: 'snapshot',
                revision: conversation.revision,
                conversationState: state
            }
        };

        return {
            conversationId: conversation.threadId,
            payload,
            surface: mergedSurface
        };
    }
}

function buildInitialState(threadId, surface = {}) {
    const now = Date.now();
    const state = {
        id: threadId,
        sessionId: threadId,
        hostId: LOCAL_HOST_ID,
        turns: [],
        requests: [],
        title: asString(surface.title) || `TermLink owner ${shortId(threadId)}`,
        cwd: asString(surface.cwd),
        createdAt: now,
        updatedAt: now,
        recencyAt: now,
        threadRuntimeStatus: normalizeStatus(surface.status),
        latestThreadSettings: {},
        latestCollaborationMode: clone(surface.latestCollaborationMode),
        hasUnreadTurn: false,
        resumeState: 'resumed'
    };
    if (surface.latestDefaultCollaborationMode) {
        state.latestThreadSettings.collaborationMode = clone(surface.latestDefaultCollaborationMode);
        state.latestCollaborationMode = clone(surface.latestDefaultCollaborationMode);
    } else if (surface.latestCollaborationMode) {
        state.latestThreadSettings.collaborationMode = clone(surface.latestCollaborationMode);
    }
    return state;
}

function applySurfaceMetadata(state, surface = {}) {
    if (asString(surface.title)) state.title = asString(surface.title);
    if (asString(surface.cwd)) state.cwd = asString(surface.cwd);
    if (surface.latestDefaultCollaborationMode || surface.latestCollaborationMode) {
        applySettingsUpdate(state, {
            collaborationMode: clone(surface.latestDefaultCollaborationMode || surface.latestCollaborationMode)
        });
    }
    state.threadRuntimeStatus = normalizeStatus(surface.status);
    touch(state);
}

function buildPendingTurn(clientUserMessageId, input, cwd) {
    const turnId = `pending:${clientUserMessageId}`;
    return {
        turnId,
        status: 'inProgress',
        params: {
            cwd,
            input: buildTextInputSequence(input),
            attachments: [],
            commentAttachments: [],
            runtimeWorkspaceRoots: cwd ? [cwd] : []
        },
        items: [{
            type: 'userMessage',
            id: clientUserMessageId,
            text: input
        }]
    };
}

function normalizeTurn(turn, fallbackStatus) {
    if (!turn) return undefined;
    const turnId = asString(turn.id) || asString(turn.turnId);
    if (!turnId) return undefined;
    return {
        ...clone(turn),
        turnId,
        status: asString(turn.status) || fallbackStatus,
        items: Array.isArray(turn.items) ? clone(turn.items) : []
    };
}

function ensureTurn(state, turnId) {
    const turns = Array.isArray(state.turns) ? state.turns : [];
    state.turns = turns;
    let turn = turns.find((candidate) => asString(asRecord(candidate)?.turnId) === turnId);
    if (!turn) {
        turn = { turnId, status: 'inProgress', items: [] };
        turns.push(turn);
    }
    return turn;
}

function upsertTurn(state, turn) {
    const turns = Array.isArray(state.turns) ? state.turns : [];
    state.turns = turns;
    const turnId = asString(turn.turnId) || asString(turn.id);
    const index = turns.findIndex((candidate) => {
        const candidateId = asString(asRecord(candidate)?.turnId) || asString(asRecord(candidate)?.id);
        return candidateId === turnId;
    });
    if (index >= 0) {
        const previous = asRecord(turns[index]) || {};
        turns[index] = {
            ...previous,
            ...clone(turn),
            turnId,
            items: mergeTurnItems(previous.items, turn.items)
        };
    } else {
        turns.push(clone(turn));
    }
}

function upsertItem(turn, item) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    turn.items = items;
    const itemId = asString(item.id);
    if (!itemId) {
        items.push(item);
        return;
    }
    const index = items.findIndex((candidate) => asString(asRecord(candidate)?.id) === itemId);
    if (index >= 0) {
        items[index] = { ...(asRecord(items[index]) || {}), ...item };
    } else {
        items.push(item);
    }
}

function appendDelta(state, params, itemType) {
    const record = asRecord(params);
    const turnId = asString(record?.turnId);
    const itemId = asString(record?.itemId) || asString(record?.id);
    const delta = asString(record?.delta) || asString(record?.text) || '';
    if (!turnId || !itemId || !delta) return;
    const turn = ensureTurn(state, turnId);
    const items = Array.isArray(turn.items) ? turn.items : [];
    turn.items = items;
    let item = items.find((candidate) => asString(asRecord(candidate)?.id) === itemId);
    if (!item) {
        item = {
            type: itemType,
            id: itemId,
            text: ''
        };
        if (itemType === 'agentMessage') item.phase = 'commentary';
        items.push(item);
    }
    item.text = `${asString(item.text) || ''}${delta}`;
}

function applyTurnParams(state, params) {
    if (!params) return;
    if (asString(params.cwd)) state.cwd = asString(params.cwd);
    if (asRecord(params.collaborationMode)) {
        applySettingsUpdate(state, { collaborationMode: clone(params.collaborationMode) });
    }
}

function applySettingsUpdate(state, settings) {
    state.latestThreadSettings = {
        ...(asRecord(state.latestThreadSettings) || {}),
        ...clone(settings)
    };
    if (settings.collaborationMode) {
        state.latestCollaborationMode = clone(settings.collaborationMode);
    }
}

function applyThreadMetadata(state, thread) {
    if (!thread) return;
    if (asString(thread.name)) state.title = asString(thread.name);
    if (asString(thread.cwd)) state.cwd = asString(thread.cwd);
    if (thread.status) state.threadRuntimeStatus = normalizeThreadRuntimeStatus(thread.status);
}

function extractThreadGoal(thread) {
    if (!thread) return undefined;
    return asRecord(thread.goal) || asRecord(thread.threadGoal) || asRecord(thread.currentGoal);
}

function applyGoalUpdate(state, goal) {
    state.currentGoal = clone(goal);
    state.threadGoal = clone(goal);
    const status = asString(goal.status);
    if (status === 'complete' || status === 'completed') {
        state.completedThreadGoal = clone(goal);
    }
}

function requestTransientFields(method) {
    if (method === 'item/plan/requestImplementation') return ['pendingPlanAction'];
    if (method === 'item/tool/requestUserInput') return ['pendingUserInputAction'];
    if (
        method === 'item/commandExecution/requestApproval' ||
        method === 'execCommandApproval' ||
        method === 'item/fileChange/requestApproval' ||
        method === 'applyPatchApproval' ||
        method === 'item/permissions/requestApproval'
    ) {
        return ['pendingApproval'];
    }
    return [];
}

function markRequestTransientAuthority(conversation, method) {
    for (const field of requestTransientFields(method)) {
        conversation.authoritativeTransientFields.add(field);
    }
}

function markOwnerPendingActionsAuthoritative(conversation) {
    conversation.authoritativeTransientFields.add('pendingApproval');
    conversation.authoritativeTransientFields.add('pendingPlanAction');
    conversation.authoritativeTransientFields.add('pendingUserInputAction');
}

function clearRespondedRequests(conversation) {
    if (!conversation.respondedRequestIds || conversation.respondedRequestIds.size === 0) return false;
    const requests = Array.isArray(conversation.state.requests) ? conversation.state.requests : [];
    const responded = conversation.respondedRequestIds;
    for (const request of requests) {
        if (responded.has(String(asRecord(request)?.id))) {
            markRequestTransientAuthority(conversation, asString(asRecord(request)?.method));
        }
    }
    conversation.state.requests = requests.filter((request) => !responded.has(String(asRecord(request)?.id)));
    responded.clear();
    return true;
}

function normalizeThreadRuntimeStatus(status) {
    const record = asRecord(status);
    const type = asString(record?.type) || asString(status);
    if (type === 'active' || type === 'running') return { type: 'active', activeFlags: [] };
    if (type === 'idle' || type === 'completed') return { type: 'idle' };
    if (type === 'failed') return { type: 'failed' };
    return { type: 'idle' };
}

function normalizeStatus(status) {
    const normalized = asString(status);
    if (normalized === 'running' || normalized === 'waiting_for_input' || normalized === 'waiting_for_approval') {
        return { type: 'active', activeFlags: [] };
    }
    if (normalized === 'failed') return { type: 'failed' };
    return { type: 'idle' };
}

function mergeTurnItems(left, right) {
    const result = Array.isArray(left) ? clone(left) : [];
    const incoming = Array.isArray(right) ? right : [];
    for (const item of incoming) {
        upsertItem({ items: result }, clone(item));
    }
    return result;
}

function mergeSurfaces(seed, owner, overrides = {}) {
    const base = seed && typeof seed === 'object' ? clone(seed) : {};
    const next = owner && typeof owner === 'object' ? clone(owner) : {};
    const authority = overrides.authoritativeTransientFields instanceof Set
        ? overrides.authoritativeTransientFields
        : new Set();
    const { authoritativeTransientFields, ...surfaceOverrides } = overrides;
    const items = mergeSurfaceItems(base.items, next.items, authority);
    const chooseTransient = (field) => authority.has(field) ? next[field] : (next[field] || base[field]);
    return {
        ...base,
        ...next,
        ...surfaceOverrides,
        items,
        ownerKind: surfaceOverrides.ownerKind || next.ownerKind || base.ownerKind,
        status: next.status || base.status || 'unknown',
        updatedAt: next.updatedAt || Date.now(),
        pendingApproval: chooseTransient('pendingApproval'),
        pendingPlanAction: chooseTransient('pendingPlanAction'),
        pendingUserInputAction: chooseTransient('pendingUserInputAction'),
        pendingGoalAction: chooseTransient('pendingGoalAction'),
        activeGoal: chooseTransient('activeGoal')
    };
}

function mergeSurfaceItems(seedItems, ownerItems, authority = new Set()) {
    const result = [];
    const seen = new Set();
    for (const item of Array.isArray(seedItems) ? seedItems : []) {
        if (isAuthoritativeTransientItem(item, authority)) continue;
        const key = asString(asRecord(item)?.key) || JSON.stringify(item);
        seen.add(key);
        result.push(clone(item));
    }
    for (const item of Array.isArray(ownerItems) ? ownerItems : []) {
        const key = asString(asRecord(item)?.key) || JSON.stringify(item);
        const index = result.findIndex((candidate) => {
            const candidateKey = asString(asRecord(candidate)?.key) || JSON.stringify(candidate);
            return candidateKey === key;
        });
        if (index >= 0) {
            result[index] = { ...(asRecord(result[index]) || {}), ...clone(item) };
        } else if (!seen.has(key)) {
            result.push(clone(item));
            seen.add(key);
        }
    }
    return result;
}

function isAuthoritativeTransientItem(item, authority) {
    const record = asRecord(item);
    if (!record || record.kind !== 'approval_request') return false;
    const method = asString(record.method);
    const requestKind = asString(record.requestKind) || asString(record.approvalType);
    const isUserInput = method === 'item/tool/requestUserInput' || requestKind === 'userInput';
    if (isUserInput) return authority.has('pendingUserInputAction');
    return authority.has('pendingApproval');
}

function extractThreadId(value) {
    const record = asRecord(value);
    if (!record) return null;
    if (asString(record.threadId)) return asString(record.threadId);
    if (asString(record.conversationId)) return asString(record.conversationId);
    const thread = asRecord(record.thread);
    if (asString(thread?.id)) return asString(thread.id);
    const turn = asRecord(record.turn);
    if (asString(turn?.threadId)) return asString(turn.threadId);
    const item = asRecord(record.item);
    if (asString(item?.threadId)) return asString(item.threadId);
    return null;
}

function buildTextInputSequence(text) {
    return [{ type: 'text', text, text_elements: [] }];
}

function touch(state) {
    const now = Date.now();
    state.updatedAt = now;
    state.recencyAt = now;
}

function shortId(value) {
    const text = String(value || '');
    return text.length <= 8 ? text : text.slice(0, 8);
}

function normalizeId(value) {
    const text = asString(value);
    return text || null;
}

function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function asString(value) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function clone(value) {
    if (value === undefined) return undefined;
    return structuredClone(value);
}

module.exports = { CodexOwnerSurfaceTracker };
