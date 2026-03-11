const { verifyWsUpgrade } = require('../auth/basicAuth');
const { isIpAllowed, normalizeIp } = require('../utils/ipCheck');
const { generateAuditTraceId } = require('../utils/auditTrace');
const { getAuditService } = require('../services/auditService');
const CodexAppServerService = require('../services/codexAppServerService');
const { normalizeCodexConfig } = require('../repositories/sessionStore');
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';

function closeSocket(ws, code, reason) {
    try {
        ws.close(code, reason);
    } catch (e) {
        ws.terminate();
    }
}

function getClientIp(req) {
    // Directly use socket remote address - do NOT trust X-Forwarded-For
    return normalizeIp(req.socket.remoteAddress);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function areJsonLikeValuesEqual(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function sendWsEnvelope(ws, envelope) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(envelope));
}

function getSessionById(sessionManager, sessionId) {
    if (!sessionManager || !sessionManager.sessions || typeof sessionManager.sessions.get !== 'function') {
        return null;
    }
    return sessionManager.sessions.get(sessionId) || null;
}

function ensureSessionCodexState(session) {
    if (!session.codexState || typeof session.codexState !== 'object') {
        session.codexState = {
            threadId: null,
            currentTurnId: null,
            status: 'idle',
            pendingServerRequests: [],
            tokenUsage: null,
            rateLimitState: null,
            interactionState: {
                planMode: false,
                activeSkill: null
            }
        };
    } else if (!Array.isArray(session.codexState.pendingServerRequests)) {
        session.codexState.pendingServerRequests = [];
    }
    if (!Object.prototype.hasOwnProperty.call(session.codexState, 'tokenUsage')) {
        session.codexState.tokenUsage = null;
    }
    if (!Object.prototype.hasOwnProperty.call(session.codexState, 'rateLimitState')) {
        session.codexState.rateLimitState = null;
    }
    if (!session.codexState.interactionState || typeof session.codexState.interactionState !== 'object') {
        session.codexState.interactionState = {
            planMode: false,
            activeSkill: null
        };
    }
    return session.codexState;
}

function normalizeInteractionState(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        planMode: source.planMode === true,
        activeSkill: isNonEmptyString(source.activeSkill) ? source.activeSkill.trim() : null
    };
}

function normalizeTurnOverrides(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        model: isNonEmptyString(source.model) ? source.model.trim() : null,
        reasoningEffort: isNonEmptyString(source.reasoningEffort) ? source.reasoningEffort.trim() : null,
        collaborationMode: isNonEmptyString(source.collaborationMode) ? source.collaborationMode.trim() : null
    };
}

function normalizeOptionalCwd(value) {
    if (!isNonEmptyString(value)) {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function getConfiguredCodexApprovalPolicy() {
    const value = String(process.env.TERMLINK_CODEX_APPROVAL_POLICY || 'never').trim();
    const valid = new Set(['untrusted', 'on-failure', 'on-request', 'never']);
    return valid.has(value) ? value : 'never';
}

function getConfiguredCodexSandboxMode() {
    const value = String(process.env.TERMLINK_CODEX_SANDBOX_MODE || 'workspace-write').trim();
    const valid = new Set(['read-only', 'workspace-write', 'danger-full-access']);
    return valid.has(value) ? value : 'workspace-write';
}

function buildThreadStartParamsWithConfig({ cwd, codexConfig }) {
    const normalizedConfig = normalizeCodexConfig(codexConfig, { requirePolicyAndSandbox: false });
    const approvalPolicy = normalizedConfig && normalizedConfig.approvalPolicy
        ? normalizedConfig.approvalPolicy
        : getConfiguredCodexApprovalPolicy();
    const sandboxMode = normalizedConfig && normalizedConfig.sandboxMode
        ? normalizedConfig.sandboxMode
        : getConfiguredCodexSandboxMode();
    const params = {
        cwd,
        approvalPolicy,
        sandbox: sandboxMode,
        experimentalRawEvents: false,
        persistExtendedHistory: true
    };

    if (normalizedConfig && isNonEmptyString(normalizedConfig.defaultModel)) {
        params.model = normalizedConfig.defaultModel.trim();
    } else if (isNonEmptyString(process.env.TERMLINK_CODEX_MODEL)) {
        params.model = process.env.TERMLINK_CODEX_MODEL.trim();
    }
    if (normalizedConfig && isNonEmptyString(normalizedConfig.defaultReasoningEffort)) {
        params.reasoningEffort = normalizedConfig.defaultReasoningEffort.trim();
    }
    if (normalizedConfig && isNonEmptyString(normalizedConfig.defaultPersonality)) {
        params.personality = normalizedConfig.defaultPersonality.trim();
    }

    return params;
}

function buildTurnInput(text) {
    return [{
        type: 'text',
        text,
        text_elements: []
    }];
}

const CODEX_REQUEST_METHOD_WHITELIST = new Set([
    'thread/list',
    'thread/read',
    'thread/resume',
    'model/list',
    'skills/list',
    'account/rateLimits/read'
]);

function buildCodexCapabilities() {
    return {
        historyList: true,
        historyResume: true,
        modelConfig: true,
        rateLimitsRead: true,
        approvals: true,
        userInputRequest: true,
        diffPlanReasoning: true,
        slashCommands: true,
        slashModel: true,
        slashPlan: true,
        skillsList: true,
        compact: false,
        imageInput: false
    };
}

function isAllowedCodexRequestMethod(method) {
    return isNonEmptyString(method) && CODEX_REQUEST_METHOD_WHITELIST.has(method.trim());
}

function resolveCodexServerRequestKind(method) {
    const normalizedMethod = isNonEmptyString(method) ? method.trim() : '';
    if (normalizedMethod === 'item/commandExecution/requestApproval' || normalizedMethod === 'execCommandApproval') {
        return 'command';
    }
    if (normalizedMethod === 'item/fileChange/requestApproval') {
        return 'file';
    }
    if (normalizedMethod === 'applyPatchApproval') {
        return 'patch';
    }
    if (normalizedMethod === 'item/tool/requestUserInput') {
        return 'userInput';
    }
    return 'unknown';
}

function resolveCodexServerRequestResponseMode(method) {
    return resolveCodexServerRequestKind(method) === 'userInput' ? 'answers' : 'decision';
}

function extractCodexServerRequestSummary(method, params) {
    const requestKind = resolveCodexServerRequestKind(method);
    if (requestKind === 'command') {
        const command = isNonEmptyString(params && params.command) ? params.command.trim() : '';
        return command || '';
    }
    if (requestKind === 'file') {
        const reason = isNonEmptyString(params && params.reason) ? params.reason.trim() : '';
        return reason || '';
    }
    if (requestKind === 'patch') {
        const reason = isNonEmptyString(params && params.reason) ? params.reason.trim() : '';
        return reason || '';
    }
    if (requestKind === 'userInput') {
        const questions = Array.isArray(params && params.questions) ? params.questions : [];
        if (questions.length === 1 && isNonEmptyString(questions[0].question)) {
            return questions[0].question.trim();
        }
        if (questions.length > 1) {
            return `${questions.length} questions pending`;
        }
    }
    return '';
}

function buildCodexServerRequestEnvelope({ requestId, message, handledBy, result }) {
    const method = message && isNonEmptyString(message.method) ? message.method.trim() : 'unknown';
    const params = message && typeof message.params === 'object' ? message.params : null;
    const requestKind = resolveCodexServerRequestKind(method);
    const summary = extractCodexServerRequestSummary(method, params);
    const questions = Array.isArray(params && params.questions) ? params.questions : [];
    return {
        type: 'codex_server_request',
        requestId,
        method,
        requestKind,
        responseMode: resolveCodexServerRequestResponseMode(method),
        handledBy,
        params,
        summary: summary || null,
        questionCount: requestKind === 'userInput' ? questions.length : 0,
        defaultResult: result || null
    };
}

function buildPendingServerRequestSnapshot(state) {
    const requests = Array.isArray(state && state.pendingServerRequests) ? state.pendingServerRequests : [];
    return requests
        .filter((entry) => entry && isNonEmptyString(entry.requestId))
        .map((entry) => ({
            requestId: entry.requestId,
            method: isNonEmptyString(entry.method) ? entry.method.trim() : 'unknown',
            requestKind: isNonEmptyString(entry.requestKind) ? entry.requestKind.trim() : resolveCodexServerRequestKind(entry.method),
            responseMode: isNonEmptyString(entry.responseMode) ? entry.responseMode.trim() : resolveCodexServerRequestResponseMode(entry.method),
            summary: isNonEmptyString(entry.summary) ? entry.summary.trim() : null
        }));
}

function registerTerminalGateway(wss, { sessionManager, heartbeatMs = 30000, privilegeConfig }) {
    const isElevated = privilegeConfig && privilegeConfig.isElevated;
    const allowedIps = privilegeConfig ? privilegeConfig.allowedIps : [];
    const auditService = isElevated ? getAuditService() : null;
    const codexService = new CodexAppServerService();
    const threadToSessionId = new Map();

    const unbindSessionThreads = (sessionId, options = {}) => {
        if (!isNonEmptyString(sessionId)) {
            return;
        }
        const keepThreadId = isNonEmptyString(options.keepThreadId) ? options.keepThreadId.trim() : null;
        for (const [threadId, mappedSessionId] of threadToSessionId.entries()) {
            if (mappedSessionId === sessionId && threadId !== keepThreadId) {
                threadToSessionId.delete(threadId);
            }
        }
    };

    const bindThreadToSession = (threadId, sessionId) => {
        if (!isNonEmptyString(threadId) || !isNonEmptyString(sessionId)) {
            return;
        }
        unbindSessionThreads(sessionId, { keepThreadId: threadId });
        threadToSessionId.set(threadId, sessionId);
    };

    const syncSessionThreadBinding = (session) => {
        const state = ensureSessionCodexState(session);
        if (isNonEmptyString(state.threadId)) {
            bindThreadToSession(state.threadId, session.id);
        }
    };

    const persistSessionMetadata = (session) => {
        if (!sessionManager || typeof sessionManager.schedulePersist !== 'function') {
            return;
        }
        sessionManager.schedulePersist();
    };

    const updateSessionLastCodexThreadId = (session, threadId) => {
        if (!session) return null;
        const normalized = isNonEmptyString(threadId) ? threadId.trim() : null;
        if (sessionManager && typeof sessionManager.updateLastCodexThreadId === 'function') {
            sessionManager.updateLastCodexThreadId(session.id, normalized);
            return normalized;
        }
        if (session.lastCodexThreadId === normalized) {
            return normalized;
        }
        session.lastCodexThreadId = normalized;
        persistSessionMetadata(session);
        return normalized;
    };

    const updateSessionCwd = (session, cwd) => {
        const normalized = normalizeOptionalCwd(cwd);
        if (normalized === session.cwd) {
            return normalized;
        }
        session.cwd = normalized;
        persistSessionMetadata(session);
        return normalized;
    };

    const getStoredSessionCodexConfig = (session) => {
        return normalizeCodexConfig(session && session.codexConfig, {
            requirePolicyAndSandbox: false
        });
    };

    const getEffectiveSessionCodexConfig = (session) => {
        const stored = getStoredSessionCodexConfig(session);
        return {
            defaultModel: stored ? stored.defaultModel : null,
            defaultReasoningEffort: stored ? stored.defaultReasoningEffort : null,
            defaultPersonality: stored ? stored.defaultPersonality : null,
            approvalPolicy: stored && stored.approvalPolicy
                ? stored.approvalPolicy
                : getConfiguredCodexApprovalPolicy(),
            sandboxMode: stored && stored.sandboxMode
                ? stored.sandboxMode
                : getConfiguredCodexSandboxMode()
        };
    };

    const buildNextTurnEffectiveCodexConfig = (session, overrides = null) => {
        const effective = getEffectiveSessionCodexConfig(session);
        const normalizedOverrides = normalizeTurnOverrides(overrides);
        return {
            model: normalizedOverrides.model || effective.defaultModel || null,
            reasoningEffort: normalizedOverrides.reasoningEffort || effective.defaultReasoningEffort || null,
            personality: effective.defaultPersonality || null,
            approvalPolicy: effective.approvalPolicy || null,
            sandboxMode: effective.sandboxMode || null
        };
    };

    const updatePendingServerRequestState = (session, updater) => {
        const state = ensureSessionCodexState(session);
        const current = Array.isArray(state.pendingServerRequests) ? state.pendingServerRequests.slice() : [];
        state.pendingServerRequests = updater(current);
        return state;
    };

    const resetSessionCodexRuntimeState = (session, options = {}) => {
        const state = ensureSessionCodexState(session);
        state.currentTurnId = null;
        state.status = 'idle';
        state.pendingServerRequests = [];
        state.tokenUsage = null;
        if (options.clearRateLimitState === true) {
            state.rateLimitState = null;
        }
        return state;
    };

    const emitCodexState = (session, targetWs) => {
        const state = ensureSessionCodexState(session);
        const envelope = {
            type: 'codex_state',
            threadId: state.threadId,
            currentTurnId: state.currentTurnId || null,
            status: state.status || 'idle',
            cwd: normalizeOptionalCwd(session.cwd),
            approvalPending: state.pendingServerRequests.length > 0,
            pendingServerRequestCount: state.pendingServerRequests.length,
            pendingServerRequests: buildPendingServerRequestSnapshot(state),
            tokenUsage: state.tokenUsage || null,
            rateLimitState: state.rateLimitState || null,
            interactionState: normalizeInteractionState(state.interactionState),
            nextTurnEffectiveCodexConfig: buildNextTurnEffectiveCodexConfig(session)
        };
        if (targetWs) {
            sendWsEnvelope(targetWs, envelope);
            return;
        }
        sessionManager.broadcast(session, envelope);
    };

    const shouldSendCodexState = (session) => {
        const state = ensureSessionCodexState(session);
        return session.sessionMode === 'codex'
            || isNonEmptyString(state.threadId)
            || state.pendingServerRequests.length > 0
            || state.tokenUsage !== null
            || state.rateLimitState !== null;
    };

    const getConnectedCodexSessions = () => {
        if (!sessionManager || !sessionManager.sessions || typeof sessionManager.sessions.values !== 'function') {
            return [];
        }
        return Array.from(sessionManager.sessions.values()).filter((session) => (
            session &&
            session.sessionMode === 'codex' &&
            Array.isArray(session.connections) &&
            session.connections.length > 0
        ));
    };

    const ensureCodexThreadForSession = async (session, options = {}) => {
        const state = ensureSessionCodexState(session);
        const forceNewThread = options.forceNewThread === true;
        const requestedCwd = normalizeOptionalCwd(options.cwd)
            || normalizeOptionalCwd(session.cwd)
            || String(process.env.TERMLINK_CODEX_WORKSPACE_DIR || process.cwd());
        updateSessionCwd(session, requestedCwd);

        if (!forceNewThread && isNonEmptyString(state.threadId)) {
            bindThreadToSession(state.threadId, session.id);
            return state.threadId;
        }

        const threadStartParams = buildThreadStartParamsWithConfig({
            cwd: requestedCwd,
            codexConfig: getEffectiveSessionCodexConfig(session)
        });
        const threadStartResult = await codexService.request('thread/start', threadStartParams);
        const threadId = threadStartResult && threadStartResult.thread ? threadStartResult.thread.id : null;
        if (!isNonEmptyString(threadId)) {
            throw new Error('Codex thread/start did not return thread id.');
        }

        resetSessionCodexRuntimeState(session);
        state.threadId = threadId;
        bindThreadToSession(threadId, session.id);
        updateSessionLastCodexThreadId(session, threadId);
        persistSessionMetadata(session);

        sessionManager.broadcast(session, {
            type: 'codex_thread',
            threadId,
            model: threadStartResult.model || null,
            modelProvider: threadStartResult.modelProvider || null
        });
        emitCodexState(session);

        return threadId;
    };

    const updateCodexStateFromNotification = (session, method, params) => {
        const state = ensureSessionCodexState(session);
        if (method === 'turn/started') {
            const nextTurnId = params && params.turn ? params.turn.id || null : state.currentTurnId;
            const changed = state.currentTurnId !== nextTurnId || state.status !== 'running';
            state.currentTurnId = nextTurnId;
            state.status = 'running';
            return changed;
        }
        if (method === 'turn/completed') {
            const completedTurnId = params && params.turn ? params.turn.id || null : null;
            let changed = false;
            if (!completedTurnId || state.currentTurnId === completedTurnId) {
                changed = changed || state.currentTurnId !== null;
                state.currentTurnId = null;
            }
            changed = changed || state.status !== 'idle';
            state.status = 'idle';
            return changed;
        }
        if (method === 'thread/status/changed') {
            const statusType = params && params.status ? params.status.type : null;
            if (statusType === 'active') {
                const changed = state.status !== 'running';
                state.status = 'running';
                return changed;
            } else if (statusType === 'idle') {
                const changed = state.status !== 'idle' || state.currentTurnId !== null;
                state.status = 'idle';
                state.currentTurnId = null;
                return changed;
            }
            return false;
        }
        if (method === 'thread/tokenUsage/updated') {
            const nextTokenUsage = params || null;
            const changed = !areJsonLikeValuesEqual(state.tokenUsage, nextTokenUsage);
            state.tokenUsage = nextTokenUsage;
            return changed;
        }
        if (method === 'account/rateLimits/updated') {
            const nextRateLimitState = params || null;
            const changed = !areJsonLikeValuesEqual(state.rateLimitState, nextRateLimitState);
            state.rateLimitState = nextRateLimitState;
            return changed;
        }
        return false;
    };

    const handleCodexNotification = (notification) => {
        const method = notification && notification.method;
        const params = notification && notification.params;
        if (!isNonEmptyString(method)) {
            return;
        }
        // `codex/event/*` payloads are raw-event duplicates of high-level notifications.
        if (method.startsWith('codex/event/')) {
            return;
        }

        if (method === 'account/rateLimits/updated') {
            getConnectedCodexSessions().forEach((session) => {
                const stateChanged = updateCodexStateFromNotification(session, method, params);
                sessionManager.broadcast(session, {
                    type: 'codex_notification',
                    method,
                    params
                });
                if (stateChanged) {
                    emitCodexState(session);
                }
            });
            return;
        }

        const threadId = CodexAppServerService.extractThreadId(notification);
        if (!threadId) {
            return;
        }

        const sessionId = threadToSessionId.get(threadId);
        if (!isNonEmptyString(sessionId)) {
            return;
        }

        const session = getSessionById(sessionManager, sessionId);
        if (!session) {
            threadToSessionId.delete(threadId);
            return;
        }

        const stateChanged = updateCodexStateFromNotification(session, method, params);
        sessionManager.broadcast(session, {
            type: 'codex_notification',
            method,
            params
        });
        if (stateChanged) {
            emitCodexState(session);
        }
    };

    const handleCodexFatal = (payload) => {
        const message = payload && payload.message ? payload.message : 'Codex app-server failed.';
        for (const session of sessionManager.sessions.values()) {
            sessionManager.broadcast(session, {
                type: 'codex_error',
                code: payload && payload.code ? payload.code : 'CODEX_FATAL',
                message
            });
        }
    };

    const handleCodexStderr = (line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed) return;
        console.warn(`[Codex] ${trimmed}`);
    };

    const handleCodexServerRequest = ({ requestId, message, handledBy, result }) => {
        const method = message && message.method ? message.method : 'unknown';
        const threadId = CodexAppServerService.extractThreadId(message);
        if (!threadId) {
            return;
        }
        const sessionId = threadToSessionId.get(threadId);
        const session = sessionId ? getSessionById(sessionManager, sessionId) : null;
        if (!session) {
            return;
        }
        if (handledBy === 'client') {
            const requestKind = resolveCodexServerRequestKind(method);
            const responseMode = resolveCodexServerRequestResponseMode(method);
            const summary = extractCodexServerRequestSummary(method, message.params || null);
            updatePendingServerRequestState(session, (current) => {
                if (current.some((entry) => entry && entry.requestId === requestId)) {
                    return current;
                }
                current.push({
                    requestId,
                    method,
                    requestKind,
                    responseMode,
                    summary: summary || null
                });
                return current;
            });
        }
        sessionManager.broadcast(session, buildCodexServerRequestEnvelope({
            requestId,
            message,
            handledBy,
            result
        }));
        emitCodexState(session);
    };

    codexService.on('notification', handleCodexNotification);
    codexService.on('fatal', handleCodexFatal);
    codexService.on('stderr', handleCodexStderr);
    codexService.on('server_request', handleCodexServerRequest);

    const handleConnection = async (ws, req) => {
        // ── Auth gate: reject unauthenticated WebSocket connections ──
        if (!verifyWsUpgrade(req)) {
            closeSocket(ws, 4401, 'Unauthorized');
            return;
        }

        const clientIp = getClientIp(req);

        // ── IP whitelist check for elevated mode ──
        if (isElevated && allowedIps.length > 0 && !isIpAllowed(clientIp, allowedIps)) {
            if (auditService) {
                auditService.logIpWhitelistDenied({ clientIp });
            }
            closeSocket(ws, 4403, 'IP not allowed');
            return;
        }

        // Generate audit trace ID for elevated sessions
        const auditTraceId = isElevated ? generateAuditTraceId() : null;
        const privilegeLevel = isElevated ? 'ELEVATED' : 'STANDARD';
        let sessionId = null;

        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const sessionIdProvided = url.searchParams.has('sessionId');
            sessionId = sessionIdProvided ? url.searchParams.get('sessionId') : null;

            let session;
            if (sessionIdProvided) {
                session = sessionManager.getSession(sessionId);
                if (!session) {
                    closeSocket(ws, 4404, 'Session not found or expired');
                    return;
                }
            } else {
                // Create session with privilege metadata
                session = await sessionManager.createSession({
                    name: 'Default Session',
                    privilegeMetadata: {
                        privilegeLevel,
                        connectedBy: req.user || 'unknown',
                        auditTraceId,
                        clientIp
                    }
                });
            }

            sessionId = session.id;
            sessionManager.addConnection(session, ws);
            const pty = session.ptyService;
            syncSessionThreadBinding(session);

            // Log connection start for elevated mode
            if (isElevated && auditService) {
                auditService.logConnectionStart({
                    auditTraceId,
                    sessionId,
                    privilegeLevel,
                    clientIp,
                    connectedBy: req.user || 'unknown'
                });
            }

            ws.send(JSON.stringify({
                type: 'session_info',
                sessionId: session.id,
                name: session.name,
                privilegeLevel,
                sessionMode: session.sessionMode || 'terminal',
                cwd: session.cwd || null,
                lastCodexThreadId: isNonEmptyString(session.lastCodexThreadId)
                    ? session.lastCodexThreadId
                    : null,
                codexConfig: getStoredSessionCodexConfig(session)
            }));
            sendWsEnvelope(ws, {
                type: 'codex_capabilities',
                capabilities: buildCodexCapabilities()
            });

            const codexState = ensureSessionCodexState(session);
            if (shouldSendCodexState(session)) {
                sendWsEnvelope(ws, {
                    type: 'codex_state',
                    threadId: codexState.threadId,
                    currentTurnId: codexState.currentTurnId || null,
                    status: codexState.status || 'idle',
                    cwd: normalizeOptionalCwd(session.cwd),
                    approvalPending: codexState.pendingServerRequests.length > 0,
                    pendingServerRequestCount: codexState.pendingServerRequests.length,
                    pendingServerRequests: buildPendingServerRequestSnapshot(codexState),
                    tokenUsage: codexState.tokenUsage || null,
                    rateLimitState: codexState.rateLimitState || null,
                    interactionState: normalizeInteractionState(codexState.interactionState),
                    nextTurnEffectiveCodexConfig: buildNextTurnEffectiveCodexConfig(session)
                });
            }

            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.on('message', async (message) => {
                let envelope = null;
                try {
                    envelope = JSON.parse(message);
                    const type = envelope.type;

                    if (type === 'input') {
                        pty.write(envelope.data);
                    } else if (type === 'resize') {
                        pty.resize(envelope.cols, envelope.rows);
                    } else if (type === 'codex_new_thread') {
                        const threadId = await ensureCodexThreadForSession(session, {
                            forceNewThread: true,
                            cwd: envelope.cwd
                        });
                        sendWsEnvelope(ws, {
                            type: 'codex_thread_ready',
                            threadId
                        });
                    } else if (type === 'codex_turn') {
                        const text = isNonEmptyString(envelope.text) ? envelope.text.trim() : '';
                        if (!text) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_EMPTY_INPUT',
                                message: 'Codex input text cannot be empty.'
                            });
                            return;
                        }
                        const turnOverrides = normalizeTurnOverrides(envelope);

                        const threadId = await ensureCodexThreadForSession(session, {
                            forceNewThread: envelope.forceNewThread === true,
                            cwd: envelope.cwd
                        });

                        const sessionCodexConfig = getEffectiveSessionCodexConfig(session);
                        const turnStartResponse = await codexService.request('turn/start', {
                            threadId,
                            input: buildTurnInput(text),
                            model: turnOverrides.model || sessionCodexConfig.defaultModel || undefined,
                            reasoningEffort: turnOverrides.reasoningEffort || sessionCodexConfig.defaultReasoningEffort || undefined,
                            personality: sessionCodexConfig.defaultPersonality || undefined,
                            collaborationMode: turnOverrides.collaborationMode || undefined
                        });

                        const codexState = ensureSessionCodexState(session);
                        codexState.threadId = threadId;
                        codexState.currentTurnId = turnStartResponse && turnStartResponse.turn
                            ? turnStartResponse.turn.id || null
                            : null;
                        codexState.status = 'running';
                        codexState.interactionState = {
                            planMode: false,
                            activeSkill: null
                        };
                        bindThreadToSession(threadId, session.id);
                        updateSessionCwd(session, envelope.cwd || session.cwd);
                        emitCodexState(session);

                        sendWsEnvelope(ws, {
                            type: 'codex_turn_ack',
                            threadId,
                            turn: turnStartResponse ? turnStartResponse.turn || null : null
                        });
                    } else if (type === 'codex_set_interaction_state') {
                        const codexState = ensureSessionCodexState(session);
                        codexState.interactionState = normalizeInteractionState(envelope.interactionState);
                        emitCodexState(session);
                    } else if (type === 'codex_interrupt') {
                        const codexState = ensureSessionCodexState(session);
                        if (!isNonEmptyString(codexState.threadId) || !isNonEmptyString(codexState.currentTurnId)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_NO_ACTIVE_TURN',
                                message: 'No active Codex turn to interrupt.'
                            });
                            return;
                        }
                        await codexService.request('turn/interrupt', {
                            threadId: codexState.threadId,
                            turnId: codexState.currentTurnId
                        });
                        sendWsEnvelope(ws, {
                            type: 'codex_interrupt_ack',
                            threadId: codexState.threadId,
                            turnId: codexState.currentTurnId
                        });
                    } else if (type === 'codex_set_cwd') {
                        const nextCwd = normalizeOptionalCwd(envelope.cwd);
                        if (!nextCwd) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_INVALID_CWD',
                                message: 'Codex cwd must be a non-empty string.'
                            });
                            return;
                        }
                        updateSessionCwd(session, nextCwd);
                        emitCodexState(session);
                    } else if (type === 'codex_server_request_response') {
                        const requestId = isNonEmptyString(envelope.requestId)
                            ? envelope.requestId.trim()
                            : '';
                        if (!requestId) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_SERVER_REQUEST_RESPONSE_INVALID',
                                message: 'Codex server request response requires requestId.'
                            });
                            return;
                        }

                        codexService.respondToServerRequest(requestId, {
                            result: envelope.result,
                            error: envelope.error,
                            useDefault: envelope.useDefault === true
                        });

                        updatePendingServerRequestState(session, (current) => (
                            current.filter((entry) => !entry || entry.requestId !== requestId)
                        ));
                        emitCodexState(session);
                    } else if (type === 'codex_thread_read') {
                        const codexState = ensureSessionCodexState(session);
                        if (!isNonEmptyString(codexState.threadId)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_NO_THREAD',
                                message: 'No Codex thread bound to this session.'
                            });
                            return;
                        }
                        const response = await codexService.request('thread/read', {
                            threadId: codexState.threadId,
                            includeTurns: true
                        });
                        sendWsEnvelope(ws, {
                            type: 'codex_thread_snapshot',
                            thread: response ? response.thread || null : null
                        });
                    } else if (type === 'codex_request') {
                        const method = isNonEmptyString(envelope.method) ? envelope.method : null;
                        if (!method) {
                            sendWsEnvelope(ws, {
                                type: 'codex_response',
                                requestId: envelope.requestId || null,
                                error: {
                                    message: 'codex_request requires a method field.'
                                }
                            });
                            return;
                        }
                        if (!isAllowedCodexRequestMethod(method)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_response',
                                requestId: envelope.requestId || null,
                                method,
                                error: {
                                    code: 'CODEX_METHOD_NOT_ALLOWED',
                                    message: `codex_request method is not allowed: ${method}`
                                }
                            });
                            return;
                        }
                        const response = await codexService.request(method, envelope.params);
                        const codexState = ensureSessionCodexState(session);
                        if (
                            method === 'thread/resume' &&
                            response &&
                            response.thread &&
                            isNonEmptyString(response.thread.id)
                        ) {
                            resetSessionCodexRuntimeState(session);
                            codexState.threadId = response.thread.id;
                            bindThreadToSession(response.thread.id, session.id);
                            updateSessionLastCodexThreadId(session, response.thread.id);
                            emitCodexState(session);
                        }
                        if (response && response.turn && isNonEmptyString(response.turn.id)) {
                            codexState.currentTurnId = response.turn.id;
                            codexState.status = 'running';
                        }
                        sendWsEnvelope(ws, {
                            type: 'codex_response',
                            requestId: envelope.requestId || null,
                            method,
                            result: response
                        });
                    }
                } catch (e) {
                    if (envelope && envelope.type === 'codex_request') {
                        sendWsEnvelope(ws, {
                            type: 'codex_response',
                            requestId: envelope.requestId || null,
                            method: envelope.method || null,
                            error: {
                                code: e && e.code ? e.code : 'CODEX_REQUEST_FAILED',
                                message: e && e.message ? e.message : 'Codex request failed.',
                                data: e.data || null
                            }
                        });
                        return;
                    }
                    if (envelope && typeof envelope.type === 'string' && envelope.type.startsWith('codex_')) {
                        sendWsEnvelope(ws, {
                            type: 'codex_error',
                            code: e && e.code ? e.code : 'CODEX_REQUEST_FAILED',
                            message: e && e.message ? e.message : 'Codex request failed.',
                            data: e && e.data ? e.data : null
                        });
                        return;
                    }
                    console.error('Failed to parse message:', e && e.message ? e.message : e);
                }
            });

            ws.on('close', () => {
                sessionManager.removeConnection(session, ws);
                // Log connection end for elevated mode
                if (isElevated && auditService) {
                    auditService.logConnectionEnd({
                        auditTraceId,
                        sessionId,
                        clientIp
                    });
                }
            });
        } catch (e) {
            if (e && e.code === SESSION_CAPACITY_ERROR_CODE) {
                closeSocket(ws, 4429, 'Session capacity exceeded');
                return;
            }
            console.error('Failed to establish websocket session:', e);
            closeSocket(ws, 1011, 'Internal server error');
        }
    };

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, heartbeatMs);

    const handleWssClose = () => {
        clearInterval(heartbeatInterval);
    };

    wss.on('connection', handleConnection);
    wss.on('close', handleWssClose);

    return () => {
        clearInterval(heartbeatInterval);
        wss.removeListener('connection', handleConnection);
        wss.removeListener('close', handleWssClose);
        codexService.removeListener('notification', handleCodexNotification);
        codexService.removeListener('fatal', handleCodexFatal);
        codexService.removeListener('stderr', handleCodexStderr);
        codexService.removeListener('server_request', handleCodexServerRequest);
        codexService.stop();
    };
}

module.exports = registerTerminalGateway;
