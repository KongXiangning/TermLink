'use strict';

// ── helpers ──────────────────────────────────────────────────────────────────

function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return /** @type {Record<string, unknown>} */ (value);
}

function asString(value) {
    return typeof value === 'string' ? value : undefined;
}

function asNumber(value) {
    return typeof value === 'number' ? value : undefined;
}

function structuredClone(value) {
    // Simple deep clone sufficient for JSON-shaped conversation state.
    return JSON.parse(JSON.stringify(value));
}

// ── ThreadStreamTracker ──────────────────────────────────────────────────────

class ThreadStreamTracker {
    constructor() {
        /** @type {Map<string, {hostId?: string, revision?: number, state?: Record<string, unknown>, desynced?: boolean}>} */
        this._conversations = new Map();
    }

    /**
     * Apply a `thread-stream-state-changed` broadcast message.
     * @param {{method: string, params?: unknown}} message
     * @returns {object|undefined} projection summary, or undefined if not applicable
     */
    applyBroadcast(message) {
        if (message.method !== 'thread-stream-state-changed') return undefined;

        const params = asRecord(message.params);
        const conversationId = extractConversationId(params);
        const hostId = asString(params?.hostId);
        const change = asRecord(params?.change);
        const changeType = asString(change?.type);
        const revision = asNumber(change?.revision);

        if (!conversationId || !changeType) {
            return { kind: 'thread-stream-state-changed', conversationId, hostId, changeType, revision };
        }

        if (changeType === 'snapshot') {
            const snapshot = asRecord(change?.conversationState);
            const nextState = snapshot ? structuredClone(snapshot) : undefined;
            this._conversations.set(conversationId, { hostId, revision, state: nextState, desynced: false });
            return {
                kind: 'thread-stream-state-changed', conversationId, hostId, changeType, revision,
                ...summarizeConversationState(nextState), desynced: false
            };
        }

        if (changeType === 'patches') {
            const baseRevision = asNumber(change?.baseRevision);
            const patchList = asPatchList(change?.patches);
            const entry = this._conversations.get(conversationId);
            const revisionMismatch = entry?.revision !== undefined && baseRevision !== undefined && entry.revision !== baseRevision;
            let desynced = revisionMismatch || !entry?.state;
            let nextState = entry?.state;

            if (!desynced && nextState && patchList) {
                try { nextState = applyPatches(nextState, patchList); }
                catch (_) { desynced = true; }
            }

            this._conversations.set(conversationId, { hostId, revision, state: desynced ? entry?.state : nextState, desynced });
            return {
                kind: 'thread-stream-state-changed', conversationId, hostId, changeType, revision, baseRevision,
                patchCount: patchList?.length ?? 0,
                patchPaths: patchList?.map(p => formatPatchPath(p.path)),
                ...summarizeConversationState(desynced ? entry?.state : nextState), desynced
            };
        }

        return { kind: 'thread-stream-state-changed', conversationId, hostId, changeType, revision };
    }

    getConversationState(conversationId) {
        return this._conversations.get(conversationId)?.state;
    }
}

// ── conversation summary ─────────────────────────────────────────────────────

function summarizeConversationState(state) {
    const turns = Array.isArray(state?.turns) ? state.turns : [];
    const latestTurn = turns.length > 0 ? summarizeTurn(turns[turns.length - 1]) : undefined;
    const inProgressTurnIds = turns
        .filter(t => { const s = asString(asRecord(t)?.status); return s === 'inProgress' || s === 'in_progress'; })
        .map(t => getTurnId(t)).filter(Boolean);
    return { turnCount: turns.length, latestTurn, inProgressTurnIds };
}

function summarizeTurn(turn) {
    const r = asRecord(turn);
    if (!r) return undefined;
    const params = asRecord(r.params);
    const items = Array.isArray(r.items) ? r.items : [];
    return { turnId: getTurnId(r), status: asString(r.status), cwd: asString(params?.cwd), itemCount: items.length };
}

function getTurnId(turn) {
    return asString(asRecord(turn)?.turnId) ?? asString(asRecord(turn)?.id);
}

// ── JSON Patch ───────────────────────────────────────────────────────────────

function asPatchList(value) {
    if (!Array.isArray(value)) return undefined;
    const patches = [];
    for (const p of value) {
        const r = asRecord(p);
        const op = asString(r?.op);
        const path = r?.path;
        if (!r || (op !== 'add' && op !== 'remove' && op !== 'replace') || !Array.isArray(path)) continue;
        patches.push({ op, path: path.filter(s => typeof s === 'string' || typeof s === 'number'), value: r.value });
    }
    return patches.length > 0 ? patches : undefined;
}

function applyPatches(state, patches) {
    let target = state;
    for (const patch of patches) target = applyOnePatch(target, patch);
    const result = asRecord(target);
    if (!result) throw new Error('patched conversation state is not an object');
    return result;
}

function applyOnePatch(target, patch) {
    if (patch.path.length === 0) {
        if (patch.op === 'remove') return {};
        return structuredClone(patch.value);
    }
    const parentPath = patch.path.slice(0, -1);
    const last = patch.path[patch.path.length - 1];
    const parent = getContainer(target, parentPath);
    const key = normalizeSegment(parent, last);

    if (Array.isArray(parent)) {
        const idx = toArrayIndex(key);
        if (patch.op === 'remove') { parent.splice(idx, 1); return target; }
        const v = structuredClone(patch.value);
        if (patch.op === 'add' && idx <= parent.length) parent.splice(idx, 0, v);
        else parent[idx] = v;
        return target;
    }
    if (!isMutableRecord(parent)) throw new Error('patch parent is not mutable');
    if (patch.op === 'remove') { delete parent[String(key)]; return target; }
    parent[String(key)] = structuredClone(patch.value);
    return target;
}

function getContainer(target, path) {
    let current = target;
    for (const seg of path) {
        const key = normalizeSegment(current, seg);
        if (Array.isArray(current)) { current = current[toArrayIndex(key)]; continue; }
        const r = asRecord(current);
        if (!r) throw new Error(`invalid patch path: ${formatPatchPath(path)}`);
        current = r[String(key)];
    }
    return current;
}

function normalizeSegment(container, seg) {
    if (Array.isArray(container) && typeof seg === 'string' && /^\d+$/.test(seg)) return Number(seg);
    return seg;
}

function toArrayIndex(seg) {
    if (typeof seg !== 'number' || !Number.isInteger(seg) || seg < 0) throw new Error(`invalid array index: ${String(seg)}`);
    return seg;
}

function formatPatchPath(path) {
    return path.map(s => String(s)).join('/');
}

function isMutableRecord(v) {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

// ── conversation id extraction ───────────────────────────────────────────────

function extractConversationId(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return undefined;
    seen.add(value);
    const r = /** @type {Record<string, unknown>} */ (value);
    for (const k of ['conversationId', 'conversation_id', 'threadId', 'thread_id']) {
        if (typeof r[k] === 'string' && r[k].trim()) return r[k];
    }
    for (const v of Object.values(r)) {
        const found = extractConversationId(v, seen);
        if (found) return found;
    }
    return undefined;
}

// ── DesktopSurfaceSnapshot ───────────────────────────────────────────────────

/**
 * Build a lightweight surface snapshot from raw conversation state.
 * Only includes fields Android needs for display — raw state stays server-side.
 *
 * @param {Record<string, unknown>|undefined} state
 * @param {{conversationId?: string, revision?: number, status?: string, ownerKind?: string, title?: string, cwd?: string}} [options]
 * @returns {object}
 */
function buildDesktopSurfaceSnapshot(state, options = {}) {
    const turns = Array.isArray(state?.turns) ? state.turns : [];
    const items = [];
    let statusBucket = createStatusBucket();
    let seq = 0;
    let latestTurnId;
    let pendingApproval;
    let pendingPlanAction;
    let pendingUserInputAction;
    let pendingGoalAction;
    const activeGoal = extractActiveGoal(state);

    for (const turn of turns) {
        const r = asRecord(turn);
        const turnId = getTurnId(r);
        if (turnId) latestTurnId = turnId;
        const turnStatus = asString(r?.status);
        const goalInputEntry = toGoalInputEntry(r, turnId);
        if (goalInputEntry) {
            items.push(...flushStatusBucket(statusBucket, ++seq, turnId));
            statusBucket = createStatusBucket();
            items.push(goalInputEntry);
            if (isRunningTurnStatus(turnStatus)) {
                pendingGoalAction = { kind: 'text_input', raw: r };
            }
        }
        const turnItems = Array.isArray(r?.items) ? r.items : [];

        for (const item of turnItems) {
            const ir = asRecord(item);
            if (!ir) continue;
            const itemType = asString(ir.type);
            if (!itemType) continue;

            // Approval
            const approvalEntry = toApprovalEntry(ir, turnId, itemType);
            if (approvalEntry) {
                items.push(...flushStatusBucket(statusBucket, ++seq, turnId));
                statusBucket = createStatusBucket();
                items.push(approvalEntry);
                if (!pendingApproval) pendingApproval = extractPendingApproval(ir);
                continue;
            }

            // Plan / goal
            const planEntry = toPlanGoalEntry(ir, turnId, itemType);
            if (planEntry) {
                items.push(...flushStatusBucket(statusBucket, ++seq, turnId));
                statusBucket = createStatusBucket();
                items.push(planEntry);
                continue;
            }

            // Visible messages
            const visible = toVisibleEntry(ir, turnId);
            if (visible) {
                items.push(...flushStatusBucket(statusBucket, ++seq, turnId));
                statusBucket = createStatusBucket();
                items.push(visible);
                continue;
            }

            // Collect into status bucket
            collectStatus(statusBucket, ir, itemType);
        }
    }
    items.push(...flushStatusBucket(statusBucket, ++seq));

    // Check requests[] for pending items
    const reqApproval = extractPendingApprovalFromRequests(state);
    if (reqApproval) {
        pendingApproval = pendingApproval ?? reqApproval;
        items.push(toApprovalRequestSurfaceItem(reqApproval, `req:approval:${reqApproval.requestId ?? items.length}`));
    }
    const reqUserInput = extractPendingUserInputRequestFromRequests(state);
    if (reqUserInput) {
        pendingUserInputAction = reqUserInput;
        items.push({
            key: `req:userInput:${reqUserInput.requestId ?? items.length}`,
            kind: 'approval_request',
            approvalType: reqUserInput.requestKind,
            text: formatUserInputText(reqUserInput),
            requestId: reqUserInput.requestId,
            method: reqUserInput.method,
            requestKind: reqUserInput.requestKind,
            responseMode: reqUserInput.responseMode,
            summary: formatUserInputText(reqUserInput),
            questionCount: reqUserInput.questionCount,
            params: reqUserInput.params,
            raw: reqUserInput.raw
        });
    }
    const reqPlan = extractPendingPlanActionFromRequests(state);
    if (reqPlan) pendingPlanAction = pendingPlanAction ? { ...pendingPlanAction, ...reqPlan } : reqPlan;

    const status = options.status ??
        (pendingApproval ? 'waiting_for_approval' :
         reqUserInput ? 'waiting_for_input' :
         inferTurnStatus(turns) === 'running' ? 'running' :
         (pendingPlanAction || pendingGoalAction) ? 'waiting_for_input' :
         inferTurnStatus(turns));

    return {
        conversationId: options.conversationId,
        revision: options.revision,
        ownerKind: options.ownerKind,
        status,
        updatedAt: Date.now(),
        title: options.title ?? asString(state?.title) ?? asString(state?.name),
        cwd: options.cwd ?? asString(state?.cwd),
        latestTurnId,
        latestCollaborationMode: extractLatestCollaborationMode(state),
        latestDefaultCollaborationMode: extractLatestDefaultCollaborationMode(state, turns),
        items,
        activeGoal,
        pendingApproval,
        pendingPlanAction,
        pendingUserInputAction,
        pendingGoalAction
    };
}

function extractActiveGoal(state) {
    const goal = asRecord(state?.threadGoal) ?? asRecord(state?.currentGoal);
    if (!goal) return undefined;
    const status = asString(goal.status);
    if (!status || status === 'complete' || status === 'completed') return undefined;
    return {
        threadId: asString(goal.threadId),
        objective: asString(goal.objective),
        status,
        tokenBudget: asNumber(goal.tokenBudget),
        tokensUsed: asNumber(goal.tokensUsed),
        timeUsedSeconds: asNumber(goal.timeUsedSeconds),
        createdAt: asNumber(goal.createdAt),
        updatedAt: asNumber(goal.updatedAt),
        raw: goal
    };
}

function extractLatestCollaborationMode(state) {
    const mode =
        asRecord(asRecord(state?.latestThreadSettings)?.collaborationMode) ??
        asRecord(state?.latestCollaborationMode);
    return mode ? structuredClone(mode) : undefined;
}

function extractLatestDefaultCollaborationMode(state, turns) {
    const stateCandidates = [
        asRecord(asRecord(state?.latestThreadSettings)?.collaborationMode),
        asRecord(state?.latestCollaborationMode)
    ];

    for (const candidate of stateCandidates) {
        if (isDefaultCollaborationMode(candidate)) return structuredClone(candidate);
    }

    for (let index = turns.length - 1; index >= 0; index--) {
        const turn = asRecord(turns[index]);
        const candidate = asRecord(asRecord(turn?.params)?.collaborationMode);
        if (isDefaultCollaborationMode(candidate)) return structuredClone(candidate);
    }
    return undefined;
}

function isDefaultCollaborationMode(value) {
    return asString(value?.mode) === 'default';
}

// ── surface items ────────────────────────────────────────────────────────────

function toApprovalEntry(item, turnId, itemType) {
    if (itemType === 'mcpToolCall') return toPermissionsApprovalEntry(item, turnId);
    if (itemType !== 'commandExecution') return undefined;
    const status = asString(item.status);
    if (status !== 'pending_approval' && status !== 'awaiting_approval') return undefined;
    const cmd = asString(item.command) ?? '';
    const reason = asString(item.reason) ?? '';
    const text = reason ? `${reason}\n$ ${cmd}` : `$ ${cmd}`;
    const requestId = asString(item.requestId) ?? asString(item.id);
    return {
        key: `${turnId ?? 'turn'}:approval:${item.id ?? cmd}`,
        kind: 'approval_request',
        approvalType: 'command',
        text,
        turnId,
        itemId: asString(item.id),
        requestId,
        rawRequestId: requestId,
        method: 'item/commandExecution/requestApproval',
        requestKind: 'command',
        responseMode: 'decision',
        raw: item
    };
}

function extractPendingApproval(item) {
    if (asString(item.type) === 'mcpToolCall') return extractPermissionsApprovalFromItem(item);
    const requestId = asString(item.requestId) ?? asString(item.id);
    return { kind: 'command', requestId, rawRequestId: requestId, method: 'item/commandExecution/requestApproval', requestKind: 'command', title: '等待命令审批', description: asString(item.reason), command: asString(item.command), availableDecisions: normalizeDecisions(item.availableDecisions), raw: item };
}

function extractPendingApprovalFromRequests(state) {
    const requests = Array.isArray(state?.requests) ? state.requests : [];
    for (const req of requests) {
        const normalized = normalizePendingApprovalRequest(req);
        if (normalized) return normalized;
    }
    return undefined;
}

function normalizePendingApprovalRequest(req) {
    const r = asRecord(req);
    const params = asRecord(r?.params);
    const method = asString(r?.method);
    if (!r || !params || !method) return undefined;
    const requestId = String(r.id);

    if (method === 'item/commandExecution/requestApproval') {
        const actions = Array.isArray(params.commandActions) ? params.commandActions : [];
        const first = asRecord(actions[0]);
        const cmd = asString(first?.command) ?? asString(params.command);
        return {
            kind: 'command',
            requestId,
            rawRequestId: requestId,
            method,
            requestKind: 'command',
            responseMode: 'decision',
            title: '等待命令审批',
            description: asString(params.reason),
            command: cmd,
            availableDecisions: normalizeDecisions(params.availableDecisions),
            params,
            raw: r
        };
    }

    if (method === 'item/fileChange/requestApproval') {
        return {
            kind: 'file',
            requestId,
            rawRequestId: requestId,
            method,
            requestKind: 'file',
            responseMode: 'decision',
            title: '等待文件变更审批',
            description: summarizeFileApproval(params),
            availableDecisions: normalizeDecisions(params.availableDecisions),
            params,
            raw: r
        };
    }

    if (isMcpToolApprovalRequest(method, params)) {
        const meta = extractToolMeta(params);
        return {
            kind: 'permissions',
            requestId,
            rawRequestId: requestId,
            method,
            requestKind: 'permissions',
            responseMode: 'decision',
            title: '等待工具权限审批',
            description: summarizePermissionsApproval(params),
            toolName: resolveToolName(params),
            serverName: resolveServerName(params),
            meta,
            availableDecisions: ['accept', 'reject'],
            params,
            raw: r
        };
    }

    return undefined;
}

function toApprovalRequestSurfaceItem(approval, key) {
    return {
        key,
        kind: 'approval_request',
        approvalType: approval.kind,
        text: formatApprovalText(approval),
        requestId: approval.requestId,
        rawRequestId: approval.rawRequestId ?? approval.requestId,
        method: approval.method ?? 'item/commandExecution/requestApproval',
        requestKind: approval.requestKind ?? approval.kind ?? 'command',
        responseMode: approval.responseMode ?? 'decision',
        summary: formatApprovalText(approval),
        toolName: approval.toolName,
        serverName: approval.serverName,
        meta: approval.meta,
        params: approval.params,
        raw: approval.raw
    };
}

function toPermissionsApprovalEntry(item, turnId) {
    const approval = extractPermissionsApprovalFromItem(item);
    if (!approval) return undefined;
    return {
        key: `${turnId ?? 'turn'}:permissions:${approval.requestId ?? approval.toolName ?? 'tool'}`,
        kind: 'approval_request',
        approvalType: 'permissions',
        text: formatPermissionsApprovalText(approval),
        turnId,
        itemId: asString(item.id),
        requestId: approval.requestId,
        rawRequestId: approval.rawRequestId ?? approval.requestId,
        method: approval.method,
        requestKind: 'permissions',
        responseMode: 'decision',
        summary: formatPermissionsApprovalText(approval),
        params: approval.params,
        raw: item
    };
}

function extractPermissionsApprovalFromItem(item) {
    const status = asString(item.status);
    if (status !== 'pending_approval' && status !== 'awaiting_approval') return undefined;
    const requestId = asString(item.requestId) ?? asString(item.id);
    if (!requestId) return undefined;
    return {
        kind: 'permissions',
        requestId,
        rawRequestId: requestId,
        method: 'item/tool/call',
        requestKind: 'permissions',
        responseMode: 'decision',
        title: '等待工具权限审批',
        description: summarizePermissionsApproval(item),
        toolName: resolveToolName(item),
        serverName: resolveServerName(item),
        meta: extractToolMeta(item),
        availableDecisions: ['accept', 'reject'],
        params: item,
        raw: item
    };
}

function isMcpToolApprovalRequest(method, params) {
    if (!method) return false;
    if (method === 'item/tool/call') return hasToolApprovalSignal(params);
    const normalized = method.toLowerCase();
    return normalized.includes('permission') && (normalized.includes('approval') || normalized.includes('request'));
}

function hasToolApprovalSignal(params) {
    const r = asRecord(params);
    if (!r) return false;
    const meta = extractToolMeta(r);
    const approvalKind = asString(meta?.codex_approval_kind) ?? asString(meta?.approvalKind);
    const requestType = asString(meta?.codex_request_type) ?? asString(meta?.requestType);
    if (approvalKind === 'mcp_tool_call' || requestType === 'approval_request') return true;
    return Boolean(resolveToolName(r) && (resolveServerName(r) || asString(meta?.connector_name) || asString(meta?.connector_id)));
}

function extractToolMeta(value) {
    const r = asRecord(value);
    if (!r) return undefined;
    return asRecord(r.meta) ?? asRecord(r.metadata) ?? asRecord(r._meta);
}

function resolveToolName(value) {
    const r = asRecord(value);
    if (!r) return undefined;
    const meta = extractToolMeta(r);
    return asString(r.toolName)
        ?? asString(r.tool)
        ?? asString(r.tool_name)
        ?? asString(r.name)
        ?? asString(meta?.tool_name)
        ?? asString(r.server)
        ?? asString(asRecord(r.toolCall)?.name)
        ?? asString(asRecord(r.mcpToolCall)?.name);
}

function resolveServerName(value) {
    const r = asRecord(value);
    if (!r) return undefined;
    const meta = extractToolMeta(r);
    return asString(r.server)
        ?? asString(r.serverName)
        ?? asString(r.mcpServer)
        ?? asString(r.connectorName)
        ?? asString(meta?.connector_name)
        ?? asString(meta?.connector_id)
        ?? asString(asRecord(r.toolCall)?.server)
        ?? asString(asRecord(r.mcpToolCall)?.server);
}

function summarizePermissionsApproval(value) {
    const r = asRecord(value);
    if (!r) return '等待工具权限审批';
    const server = resolveServerName(r);
    const toolName = resolveToolName(r);
    const toolParams = asRecord(r.tool_params) ?? asRecord(r.toolParams) ?? asRecord(r.arguments) ?? asRecord(r.args) ?? asRecord(r.input);
    const key = asString(r.key) ?? asString(toolParams?.key);
    const parts = [];
    if (server) parts.push(prettifyTool(server));
    if (toolName) parts.push(toolName);
    if (key) parts.push(key);
    return parts.length > 0 ? `等待允许 ${parts.join(' / ')}` : '等待工具权限审批';
}

function summarizeFileApproval(params) {
    const changes = Array.isArray(params?.changes) ? params.changes : [];
    if (changes.length > 0) return `等待审批 ${changes.length} 个文件变更`;
    return asString(params?.reason) ?? '等待文件变更审批';
}

function extractPendingUserInputRequestFromRequests(state) {
    const requests = Array.isArray(state?.requests) ? state.requests : [];
    for (const req of requests) {
        const r = asRecord(req);
        const params = asRecord(r?.params);
        if (!r || !params || r.method !== 'item/tool/requestUserInput') continue;
        const questions = Array.isArray(params.questions) ? params.questions : [];
        const summary = summarizeQuestions(questions);
        return {
            requestId: String(r.id),
            method: 'item/tool/requestUserInput',
            requestKind: 'userInput',
            responseMode: 'answers',
            handledBy: 'ipc_follower',
            title: '等待确认',
            summary,
            description: summary,
            questionCount: questions.length,
            params,
            raw: r
        };
    }
    return undefined;
}

function extractPendingPlanActionFromRequests(state) {
    const requests = Array.isArray(state?.requests) ? state.requests : [];
    for (const req of requests) {
        const r = asRecord(req);
        const params = asRecord(r?.params);
        if (!r || !params) continue;

        if (r.method === 'item/plan/requestImplementation') {
            return { kind: 'plan_implementation', requestId: String(r.id), requestMethod: r.method, turnId: asString(params.turnId), planContent: asString(params.planContent), canSubmit: Boolean(params.turnId && params.planContent), raw: r };
        }
    }
    return undefined;
}

function normalizeDecisions(value) {
    if (!Array.isArray(value)) return undefined;
    const out = [];
    for (const d of value) {
        if (typeof d === 'string') { out.push(d); continue; }
        const r = asRecord(d);
        if (r?.acceptWithExecpolicyAmendment) out.push('acceptWithExecpolicyAmendment');
    }
    return out.length > 0 ? out : undefined;
}

function formatApprovalText(approval) {
    if (approval?.kind === 'permissions') return formatPermissionsApprovalText(approval);
    const cmd = approval.command ? `\n$ ${approval.command}` : '';
    return `${approval.description ?? approval.reason ?? approval.title ?? '等待审批'}${cmd}`;
}

function formatPermissionsApprovalText(approval) {
    return approval.description ?? approval.title ?? '等待工具权限审批';
}

function summarizeQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) return '等待用户确认';
    const first = asRecord(questions[0]);
    const question = asString(first?.question) ?? asString(first?.id) ?? asString(first?.name);
    if (questions.length === 1) return question || '等待用户确认';
    return `${questions.length} questions pending`;
}

function formatUserInputText(request) {
    return request.description ?? request.title ?? '等待用户确认';
}

// ── plan / goal detection ────────────────────────────────────────────────────

function toPlanGoalEntry(item, turnId, itemType) {
    if (itemType === 'Plan' || itemType === 'plan') {
        const text = extractPlanText(item);
        if (!text) return undefined;
        return { key: asString(item.id) ?? `${turnId ?? 'turn'}:plan`, kind: 'plan_prompt', text, turnId, itemId: asString(item.id), raw: item };
    }
    if (itemType !== 'todo-list') return undefined;
    const text = extractTodoSummary(item);
    if (!text) return undefined;
    const todoItems = Array.isArray(item.items) ? item.items : [];
    const hasPlan = todoItems.some(t => { const s = asString(asRecord(t)?.status); return s === 'planned' || s === 'in_progress'; });
    return { key: `${turnId ?? 'turn'}:todo:${item.id ?? 'list'}`, kind: hasPlan ? 'plan_prompt' : 'goal_prompt', text, turnId, itemId: asString(item.id), raw: item };
}

function toGoalInputEntry(turn, turnId) {
    const params = asRecord(turn?.params);
    const inputText = extractText(params?.input);
    const goalText = extractGoalObjective(inputText);
    if (!goalText) return undefined;
    return {
        key: `${turnId ?? 'pending'}:goal-input:${hashText(goalText)}`,
        kind: 'goal_prompt',
        text: goalText,
        turnId,
        raw: {
            input: inputText,
            status: asString(turn?.status)
        }
    };
}

function extractGoalObjective(inputText) {
    const text = inputText?.trim();
    if (!text) return undefined;

    const slashMatch = text.match(/^\/goal(?:\s+|$)([\s\S]*)$/i);
    if (slashMatch) return slashMatch[1]?.trim() || text;

    const chineseMatch = text.match(/^goal追求目标[:：\s]*([\s\S]*)$/i);
    if (chineseMatch) return chineseMatch[1]?.trim() || text;

    const internalGoalMatch = text.match(
        /<codex_internal_context\s+source=["']goal["'][^>]*>[\s\S]*?<objective>\s*([\s\S]*?)\s*<\/objective>/i
    );
    if (internalGoalMatch) return internalGoalMatch[1]?.trim() || undefined;

    return undefined;
}

function hashText(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index++) {
        hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash.toString(36);
}

function extractPlanText(item) {
    const text = asString(item.text) ?? extractText(item.content) ?? extractText(item.message);
    if (!text) return undefined;
    const stripped = text.replace(/^\s*<proposed_plan>\s*/i, '').replace(/\s*<\/proposed_plan>\s*$/i, '').trim();
    return stripped || undefined;
}

function extractTodoSummary(item) {
    const title = asString(item.title) ?? asString(item.name);
    const items = Array.isArray(item.items) ? item.items : [];
    if (items.length === 0 && !title) return undefined;
    const lines = [];
    if (title) lines.push(title);
    for (const t of items) {
        const r = asRecord(t);
        if (!r) continue;
        const label = asString(r.label) ?? asString(r.title) ?? asString(r.text) ?? asString(r.name);
        const status = asString(r.status) ?? '';
        if (label) lines.push(`  ${status === 'completed' ? '✓' : status === 'in_progress' ? '⟳' : '○'} ${label}`);
    }
    return lines.length > 0 ? lines.join('\n') : undefined;
}

// ── visible entries ──────────────────────────────────────────────────────────

/**
 * Strip IDE context wrapper from user messages.
 * VS Code / Desktop owner wraps user input with:
 *   # Context from my IDE setup:
 *   ... (open tabs, active file, etc.)
 *   ## My request for Codex:
 *   <actual query>
 * Returns only the <actual query> portion.
 */
function extractUserQuery(raw) {
    const marker = '## My request for Codex:';
    const idx = raw.indexOf(marker);
    if (idx !== -1) {
        const query = raw.slice(idx + marker.length).trim();
        if (query) return query;
    }
    // Also handle the older "# Context from my IDE setup:" prefix without the request marker.
    const ctxMarker = '# Context from my IDE setup:';
    const ctxIdx = raw.indexOf(ctxMarker);
    if (ctxIdx !== -1) {
        // Try to find any line that looks like the actual request after the context block.
        const afterCtx = raw.slice(ctxIdx + ctxMarker.length);
        const requestMatch = afterCtx.match(/##\s*(?:My\s+)?[Rr]equest\s*(?:for\s+Codex)?[:\n]/);
        if (requestMatch) {
            const query = afterCtx.slice(requestMatch.index + requestMatch[0].length).trim();
            if (query) return query;
        }
    }
    return raw;
}

function toVisibleEntry(item, turnId) {
    const itemType = asString(item.type);
    const itemId = asString(item.id);
    if (itemType === 'userMessage') {
        const raw = extractText(item.content) ?? extractText(item.text);
        if (!raw) return undefined;
        // Strip IDE context wrapper: "# Context from my IDE setup:\n...\n## My request for Codex:\n<query>"
        const text = extractUserQuery(raw);
        return { key: itemId ?? `${turnId ?? 'turn'}:user:${text.slice(0, 32)}`, kind: 'message', role: 'user', text, turnId, itemId };
    }
    if (itemType === 'agentMessage') {
        const phase = asString(item.phase);
        if (phase !== 'commentary' && phase !== 'final_answer') return undefined;
        const raw = asString(item.text);
        const stripped = raw ? raw.replace(/^\s*<proposed_plan>\s*/i, '').replace(/\s*<\/proposed_plan>\s*$/i, '').trim() : '';
        if (!stripped) return undefined;
        if (raw?.trim().startsWith('<proposed_plan>')) {
            return { key: itemId ?? `${turnId ?? 'turn'}:proposed-plan`, kind: 'plan_prompt', text: stripped, turnId, itemId, raw: item };
        }
        return { key: itemId ?? `${turnId ?? 'turn'}:assistant:${stripped.slice(0, 32)}`, kind: 'message', role: 'assistant', phase, text: stripped, turnId, itemId };
    }
    return undefined;
}

// ── status bucket ────────────────────────────────────────────────────────────

function createStatusBucket() {
    return { commands: 0, files: new Set(), tools: new Map(), contexts: 0, images: 0, todos: 0, errors: 0 };
}

function collectStatus(bucket, item, itemType) {
    switch (itemType) {
        case 'commandExecution': bucket.commands++; break;
        case 'fileChange': {
            const changes = Array.isArray(item.changes) ? item.changes : [];
            for (const c of changes) { const p = asString(asRecord(c)?.path); if (p) bucket.files.add(p); }
            break;
        }
        case 'mcpToolCall': { const s = prettifyTool(asString(item.server)); bucket.tools.set(s, (bucket.tools.get(s) ?? 0) + 1); break; }
        case 'contextCompaction': bucket.contexts++; break;
        case 'imageView': bucket.images++; break;
        case 'todo-list': bucket.todos++; break;
        case 'error': bucket.errors++; break;
    }
}

function flushStatusBucket(bucket, seq, turnId) {
    const entries = [];
    if (bucket.commands > 0) entries.push({ key: `${turnId ?? 'turn'}:status:cmd:${seq}`, kind: 'status', statusType: 'commands', text: `已运行 ${bucket.commands} 条命令`, turnId });
    if (bucket.files.size > 0) entries.push({ key: `${turnId ?? 'turn'}:status:files:${seq}`, kind: 'status', statusType: 'files', text: `已编辑 ${bucket.files.size} 个文件`, turnId });
    for (const [server] of bucket.tools) entries.push({ key: `${turnId ?? 'turn'}:status:tool:${server}:${seq}`, kind: 'status', statusType: 'tool', text: `已使用 ${server}`, turnId });
    if (bucket.contexts > 0) entries.push({ key: `${turnId ?? 'turn'}:status:ctx:${seq}`, kind: 'status', statusType: 'context', text: '上下文已自动压缩', turnId });
    if (bucket.images > 0) entries.push({ key: `${turnId ?? 'turn'}:status:img:${seq}`, kind: 'status', statusType: 'image', text: `已查看 ${bucket.images} 张图片`, turnId });
    if (bucket.todos > 0) entries.push({ key: `${turnId ?? 'turn'}:status:todo:${seq}`, kind: 'status', statusType: 'todo', text: '已更新任务清单', turnId });
    if (bucket.errors > 0) entries.push({ key: `${turnId ?? 'turn'}:status:err:${seq}`, kind: 'status', statusType: 'error', text: `出现 ${bucket.errors} 个错误`, turnId });
    return entries;
}

// ── status inference ─────────────────────────────────────────────────────────

function inferTurnStatus(turns) {
    if (turns.length === 0) return 'unknown';
    const last = asRecord(turns[turns.length - 1]);
    const status = asString(last?.status);
    if (status === 'inProgress' || status === 'in_progress') return 'running';
    if (status === 'completed' || status === 'done' || status === 'finished') return 'completed';
    if (status === 'failed' || status === 'error' || status === 'cancelled') return 'failed';
    if (status === 'interrupted') return 'interrupted';
    // Check items in last turn for pending approval
    const items = Array.isArray(last?.items) ? last.items : [];
    for (const item of items) {
        const ir = asRecord(item);
        if (asString(ir?.type) === 'commandExecution') {
            const s = asString(ir?.status);
            if (s === 'pending_approval' || s === 'awaiting_approval') return 'waiting_for_approval';
        }
    }
    if (items.length > 0 && !status) return 'running';
    return 'unknown';
}

function isRunningTurnStatus(status) {
    return status === 'inProgress' || status === 'in_progress';
}

// ── text extraction ──────────────────────────────────────────────────────────

function extractText(value) {
    if (typeof value === 'string') { const t = value.trim(); return t || undefined; }
    if (Array.isArray(value)) { const parts = value.map(v => extractText(v)).filter(Boolean); const j = parts.join('\n').trim(); return j || undefined; }
    const r = asRecord(value);
    if (!r) return undefined;
    return extractText(r.text) ?? extractText(r.content) ?? extractText(r.input);
}

function prettifyTool(server) {
    if (!server) return '工具';
    if (server === 'chrome-devtools') return 'Chrome Devtools';
    if (server === 'github') return 'GitHub';
    return server.split(/[-_]/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = { ThreadStreamTracker, buildDesktopSurfaceSnapshot };
