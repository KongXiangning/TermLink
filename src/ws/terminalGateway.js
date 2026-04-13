const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyWsUpgrade } = require('../auth/basicAuth');
const { isIpAllowed, normalizeIp } = require('../utils/ipCheck');
const { generateAuditTraceId } = require('../utils/auditTrace');
const { resolveConnectionSecurity } = require('../utils/connectionSecurity');
const { getAuditService } = require('../services/auditService');
const CodexAppServerService = require('../services/codexAppServerService');
const { normalizeCodexConfig } = require('../repositories/sessionStore');
const { summarizeSessionConnections } = require('../services/sessionManager');
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
            turnAttachmentTempFiles: {},
            threadExecutionContextSignature: null,
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
    if (!Object.prototype.hasOwnProperty.call(session.codexState, 'threadExecutionContextSignature')) {
        session.codexState.threadExecutionContextSignature = null;
    }
    if (!session.codexState.turnAttachmentTempFiles || typeof session.codexState.turnAttachmentTempFiles !== 'object') {
        session.codexState.turnAttachmentTempFiles = {};
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

function normalizeCollaborationMode(value) {
    if (isNonEmptyString(value)) {
        return {
            mode: value.trim(),
            settings: {
                model: '',
                reasoning_effort: null,
                developer_instructions: null
            }
        };
    }
    const source = value && typeof value === 'object' ? value : null;
    if (!source || !isNonEmptyString(source.mode)) {
        return null;
    }
    const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
    return {
        mode: source.mode.trim(),
        settings: {
            model: typeof settings.model === 'string' ? settings.model.trim() : '',
            reasoning_effort: isNonEmptyString(settings.reasoning_effort)
                ? settings.reasoning_effort.trim().toLowerCase()
                : null,
            developer_instructions: isNonEmptyString(settings.developer_instructions)
                ? settings.developer_instructions
                : null
        }
    };
}

function normalizeTurnOverrides(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        model: isNonEmptyString(source.model) ? source.model.trim() : null,
        reasoningEffort: isNonEmptyString(source.reasoningEffort) ? source.reasoningEffort.trim() : null,
        sandbox: isNonEmptyString(source.sandbox) ? source.sandbox.trim() : null,
        collaborationMode: normalizeCollaborationMode(source.collaborationMode)
    };
}

function derivePermissionOverrideFromSandboxMode(value) {
    const normalized = isNonEmptyString(value) ? value.trim() : null;
    if (normalized === 'danger-full-access') {
        return {
            approvalPolicy: 'never',
            sandboxMode: 'danger-full-access'
        };
    }
    if (normalized === 'workspace-write') {
        return {
            approvalPolicy: 'on-request',
            sandboxMode: 'workspace-write'
        };
    }
    if (normalized === 'read-only') {
        return {
            approvalPolicy: 'on-request',
            sandboxMode: 'read-only'
        };
    }
    return null;
}

function normalizeModelName(value) {
    return isNonEmptyString(value) ? value.trim() : null;
}

function finalizeCollaborationMode(collaborationMode, defaults) {
    if (!collaborationMode) {
        return null;
    }
    const fallback = defaults && typeof defaults === 'object' ? defaults : {};
    return {
        mode: collaborationMode.mode,
        settings: {
            model: collaborationMode.settings.model || (isNonEmptyString(fallback.model) ? fallback.model.trim() : ''),
            reasoning_effort: collaborationMode.settings.reasoning_effort
                || (isNonEmptyString(fallback.reasoningEffort) ? fallback.reasoningEffort.trim().toLowerCase() : null),
            developer_instructions: collaborationMode.settings.developer_instructions || null
        }
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
        askForApproval: approvalPolicy,
        sandbox: sandboxMode,
        sandboxMode,
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

function buildThreadExecutionContextSignature({ cwd, codexConfig }) {
    const normalizedConfig = normalizeCodexConfig(codexConfig, { requirePolicyAndSandbox: false });
    const approvalPolicy = normalizedConfig && normalizedConfig.approvalPolicy
        ? normalizedConfig.approvalPolicy
        : getConfiguredCodexApprovalPolicy();
    const sandboxMode = normalizedConfig && normalizedConfig.sandboxMode
        ? normalizedConfig.sandboxMode
        : getConfiguredCodexSandboxMode();
    return JSON.stringify({
        cwd: normalizeOptionalCwd(cwd),
        approvalPolicy,
        sandboxMode
    });
}

function buildCodexProcessRuntimeConfig(codexConfig) {
    const normalizedConfig = normalizeCodexConfig(codexConfig, { requirePolicyAndSandbox: false });
    return {
        approvalPolicy: normalizedConfig && normalizedConfig.approvalPolicy
            ? normalizedConfig.approvalPolicy
            : getConfiguredCodexApprovalPolicy(),
        sandboxMode: normalizedConfig && normalizedConfig.sandboxMode
            ? normalizedConfig.sandboxMode
            : getConfiguredCodexSandboxMode()
    };
}

function normalizeTurnAttachments(value) {
    const attachments = Array.isArray(value) ? value : [];
    return attachments
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }
            if (entry.type === 'image' && isNonEmptyString(entry.url)) {
                return {
                    type: 'image',
                    url: entry.url.trim()
                };
            }
            if (entry.type === 'localImage') {
                // Accept either path (server-side file) or url (data URL from client)
                if (isNonEmptyString(entry.path)) {
                    return {
                        type: 'localImage',
                        path: entry.path.trim()
                    };
                }
                if (isNonEmptyString(entry.url)) {
                    return {
                        type: 'localImage',
                        url: entry.url.trim()
                    };
                }
            }
            return null;
        })
        .filter(Boolean);
}

const IMAGE_MIME_EXTENSION_MAP = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/svg+xml': '.svg'
};

function parseBase64DataUrl(value) {
    const normalized = isNonEmptyString(value) ? value.trim() : '';
    if (!normalized.startsWith('data:')) {
        return null;
    }
    const commaIndex = normalized.indexOf(',');
    if (commaIndex < 0) {
        return null;
    }
    const header = normalized.slice(5, commaIndex);
    const payload = normalized.slice(commaIndex + 1);
    if (!header || !payload) {
        return null;
    }
    const segments = header.split(';').map((segment) => segment.trim()).filter(Boolean);
    const mimeType = segments[0] || 'application/octet-stream';
    if (!segments.some((segment) => segment.toLowerCase() === 'base64')) {
        return null;
    }
    try {
        const bytes = Buffer.from(payload, 'base64');
        if (bytes.length === 0) {
            return null;
        }
        return { mimeType, bytes };
    } catch (_) {
        return null;
    }
}

function getTempImageExtension(mimeType) {
    const normalizedMimeType = isNonEmptyString(mimeType) ? mimeType.trim().toLowerCase() : '';
    return IMAGE_MIME_EXTENSION_MAP[normalizedMimeType] || '.img';
}

async function materializeLocalImageAttachment(url) {
    const parsed = parseBase64DataUrl(url);
    if (!parsed) {
        return null;
    }
    if (!parsed.mimeType.toLowerCase().startsWith('image/')) {
        return null;
    }
    const tempRoot = path.join(os.tmpdir(), 'termlink-codex-images');
    await fs.promises.mkdir(tempRoot, { recursive: true });
    const tempPath = path.join(
        tempRoot,
        `local-image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${getTempImageExtension(parsed.mimeType)}`
    );
    await fs.promises.writeFile(tempPath, parsed.bytes);
    return tempPath;
}

async function resolveTurnInputAttachments(attachments) {
    const resolved = [];
    const tempFilePaths = [];
    for (const entry of normalizeTurnAttachments(attachments)) {
        if (entry.type === 'localImage' && isNonEmptyString(entry.url)) {
            const tempPath = await materializeLocalImageAttachment(entry.url);
            if (tempPath) {
                resolved.push({
                    type: 'localImage',
                    path: tempPath
                });
                tempFilePaths.push(tempPath);
                continue;
            }
        }
        resolved.push(entry);
    }
    return { attachments: resolved, tempFilePaths };
}

async function buildTurnInput(text, attachments) {
    const input = [];
    if (isNonEmptyString(text)) {
        input.push({
            type: 'text',
            text,
            text_elements: []
        });
    }
    const resolvedAttachments = await resolveTurnInputAttachments(attachments);
    resolvedAttachments.attachments.forEach((entry) => {
        input.push(entry);
    });
    return {
        input,
        tempFilePaths: resolvedAttachments.tempFilePaths
    };
}

async function cleanupAttachmentTempFiles(filePaths) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return;
    }
    await Promise.all(filePaths.map(async (filePath) => {
        if (!isNonEmptyString(filePath)) {
            return;
        }
        try {
            await fs.promises.unlink(filePath);
        } catch (error) {
            if (!error || error.code !== 'ENOENT') {
                console.warn('Failed to clean temporary Codex image file:', filePath, error && error.message ? error.message : error);
            }
        }
    }));
}

function rememberTurnAttachmentTempFiles(session, turnId, filePaths) {
    if (!isNonEmptyString(turnId) || !Array.isArray(filePaths) || filePaths.length === 0) {
        return;
    }
    const state = ensureSessionCodexState(session);
    if (!state.turnAttachmentTempFiles || typeof state.turnAttachmentTempFiles !== 'object') {
        state.turnAttachmentTempFiles = {};
    }
    state.turnAttachmentTempFiles[turnId] = [
        ...(Array.isArray(state.turnAttachmentTempFiles[turnId]) ? state.turnAttachmentTempFiles[turnId] : []),
        ...filePaths
    ];
}

async function cleanupTurnAttachmentTempFiles(session, turnId) {
    if (!isNonEmptyString(turnId)) {
        return;
    }
    const state = ensureSessionCodexState(session);
    const turnAttachmentTempFiles = state.turnAttachmentTempFiles;
    const filePaths = turnAttachmentTempFiles && Array.isArray(turnAttachmentTempFiles[turnId])
        ? turnAttachmentTempFiles[turnId].slice()
        : [];
    if (turnAttachmentTempFiles && Object.prototype.hasOwnProperty.call(turnAttachmentTempFiles, turnId)) {
        delete turnAttachmentTempFiles[turnId];
    }
    await cleanupAttachmentTempFiles(filePaths);
}

async function cleanupAllSessionAttachmentTempFiles(session) {
    const state = ensureSessionCodexState(session);
    const turnAttachmentTempFiles = state.turnAttachmentTempFiles && typeof state.turnAttachmentTempFiles === 'object'
        ? state.turnAttachmentTempFiles
        : {};
    const filePaths = Object.values(turnAttachmentTempFiles).flatMap((entry) => Array.isArray(entry) ? entry : []);
    state.turnAttachmentTempFiles = {};
    await cleanupAttachmentTempFiles(filePaths);
}

const CODEX_REQUEST_METHOD_WHITELIST = new Set([
    'thread/list',
    'thread/read',
    'thread/resume',
    'thread/fork',
    'thread/name/set',
    'thread/archive',
    'thread/unarchive',
    'thread/compact/start',
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
        compact: true,
        imageInput: true,
        fileMentions: true
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
            summary: isNonEmptyString(entry.summary) ? entry.summary.trim() : null,
            params: entry.params && typeof entry.params === 'object' ? entry.params : null
        }));
}

function registerTerminalGateway(wss, { sessionManager, heartbeatMs = 30000, privilegeConfig, tlsConfig = {} }) {
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

    const getSessionThreadModel = (session) => {
        const state = ensureSessionCodexState(session);
        return normalizeModelName(state.threadModel);
    };

    const setSessionThreadModel = (session, model) => {
        const state = ensureSessionCodexState(session);
        const normalized = normalizeModelName(model);
        if (state.threadModel === normalized) {
            return normalized;
        }
        state.threadModel = normalized;
        persistSessionMetadata(session);
        return normalized;
    };

    const resolveThreadModelFromResponse = (response) => (
        normalizeModelName(response && response.model)
        || normalizeModelName(response && response.thread && response.thread.model)
        || null
    );

    const buildNextTurnEffectiveCodexConfig = (session, overrides = null) => {
        const effective = getEffectiveSessionCodexConfig(session);
        const normalizedOverrides = normalizeTurnOverrides(overrides);
        const permissionOverride = derivePermissionOverrideFromSandboxMode(normalizedOverrides.sandbox);
        return {
            model: normalizedOverrides.model || effective.defaultModel || getSessionThreadModel(session) || null,
            reasoningEffort: normalizedOverrides.reasoningEffort || effective.defaultReasoningEffort || null,
            personality: effective.defaultPersonality || null,
            approvalPolicy: permissionOverride ? permissionOverride.approvalPolicy : (effective.approvalPolicy || null),
            sandboxMode: permissionOverride ? permissionOverride.sandboxMode : (effective.sandboxMode || null)
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
        state.threadExecutionContextSignature = null;
        if (options.clearThreadModel === true) {
            state.threadModel = null;
        }
        if (options.clearRateLimitState === true) {
            state.rateLimitState = null;
        }
        return state;
    };

    const extractTokenUsageSnapshot = (payload) => {
        const source = payload && typeof payload === 'object' ? payload : null;
        if (!source) {
            return null;
        }
        if (source.latestTokenUsageInfo && typeof source.latestTokenUsageInfo === 'object') {
            return { latestTokenUsageInfo: source.latestTokenUsageInfo };
        }
        if (source.tokenUsage && typeof source.tokenUsage === 'object') {
            return source.tokenUsage;
        }
        if (source.thread && typeof source.thread === 'object') {
            if (source.thread.latestTokenUsageInfo && typeof source.thread.latestTokenUsageInfo === 'object') {
                return { latestTokenUsageInfo: source.thread.latestTokenUsageInfo };
            }
            if (source.thread.tokenUsage && typeof source.thread.tokenUsage === 'object') {
                return source.thread.tokenUsage;
            }
        }
        return null;
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

    const ensureCodexServiceForSession = async (session, runtimeConfig = null) => {
        const state = ensureSessionCodexState(session);
        if (!codexService || typeof codexService.ensureStarted !== 'function') {
            return false;
        }
        const effectiveRuntimeConfig = runtimeConfig && typeof runtimeConfig === 'object'
            ? runtimeConfig
            : getEffectiveSessionCodexConfig(session);
        const runtimeConfigSignature = buildCodexProcessRuntimeConfig(effectiveRuntimeConfig);
        const didRestart = await codexService.ensureStarted(
            runtimeConfigSignature
        );
        if (!didRestart) {
            return false;
        }
        console.info('[gateway][codex][runtime-restart]', JSON.stringify({
            sessionId: session.id,
            threadId: state.threadId || null,
            runtimeConfig: runtimeConfigSignature
        }));
        state.currentTurnId = null;
        state.status = 'idle';
        state.pendingServerRequests = [];
        state.tokenUsage = null;
        state.rateLimitState = null;
        state.threadExecutionContextSignature = '__stale__';
        unbindSessionThreads(session.id);
        emitCodexState(session);
        return true;
    };

    const ensureCodexThreadForSession = async (session, options = {}) => {
        const state = ensureSessionCodexState(session);
        const forceNewThread = options.forceNewThread === true;
        const requireExactExecutionContext = options.requireExactExecutionContext === true;
        const requestedCwd = normalizeOptionalCwd(options.cwd)
            || normalizeOptionalCwd(session.cwd)
            || String(process.env.TERMLINK_CODEX_WORKSPACE_DIR || process.cwd());
        const effectiveCodexConfig = normalizeCodexConfig(options.codexConfig, {
            requirePolicyAndSandbox: false
        }) || getEffectiveSessionCodexConfig(session);
        const executionContextSignature = buildThreadExecutionContextSignature({
            cwd: requestedCwd,
            codexConfig: effectiveCodexConfig
        });
        updateSessionCwd(session, requestedCwd);

        const currentExecutionContextSignature = isNonEmptyString(state.threadExecutionContextSignature)
            ? state.threadExecutionContextSignature.trim()
            : null;
        const executionContextMatches = currentExecutionContextSignature === executionContextSignature;
        const shouldReuseExistingThread = !forceNewThread
            && isNonEmptyString(state.threadId)
            && (
                executionContextMatches
                || (!requireExactExecutionContext && currentExecutionContextSignature === null)
            );

        console.info('[gateway][codex][thread-reuse-check]', JSON.stringify({
            sessionId: session.id,
            existingThreadId: isNonEmptyString(state.threadId) ? state.threadId : null,
            forceNewThread,
            requireExactExecutionContext,
            requestedCwd,
            effectiveCodexConfig,
            currentExecutionContextSignature,
            nextExecutionContextSignature: executionContextSignature,
            executionContextMatches,
            shouldReuseExistingThread
        }));

        if (shouldReuseExistingThread) {
            bindThreadToSession(state.threadId, session.id);
            return state.threadId;
        }

        if (
            !forceNewThread
            && isNonEmptyString(state.threadId)
            && currentExecutionContextSignature === '__stale__'
        ) {
            try {
                const resumeResult = await codexService.request('thread/resume', { threadId: state.threadId });
                const resumedThreadId = resumeResult && resumeResult.thread ? resumeResult.thread.id : null;
                if (isNonEmptyString(resumedThreadId)) {
                    state.threadId = resumedThreadId;
                    state.threadModel = resolveThreadModelFromResponse(resumeResult) || state.threadModel || null;
                    state.tokenUsage = extractTokenUsageSnapshot(resumeResult);
                    state.threadExecutionContextSignature = executionContextSignature;
                    bindThreadToSession(resumedThreadId, session.id);
                    updateSessionLastCodexThreadId(session, resumedThreadId);
                    persistSessionMetadata(session);
                    console.info('[gateway][codex][thread-rebind-after-restart]', JSON.stringify({
                        sessionId: session.id,
                        threadId: resumedThreadId,
                        executionContextSignature
                    }));
                    return resumedThreadId;
                }
            } catch (resumeError) {
                console.warn('[gateway][codex][thread-resume-failed]', JSON.stringify({
                    sessionId: session.id,
                    staleThreadId: state.threadId,
                    error: resumeError && resumeError.message ? resumeError.message : String(resumeError),
                    code: resumeError && resumeError.code ? resumeError.code : null
                }));
            }
        }

        if (!forceNewThread && isNonEmptyString(state.threadId)) {
            unbindSessionThreads(session.id);
            resetSessionCodexRuntimeState(session, { clearThreadModel: true });
            state.threadId = null;
        }

        const threadStartParams = buildThreadStartParamsWithConfig({
            cwd: requestedCwd,
            codexConfig: effectiveCodexConfig
        });
        const threadStartResult = await codexService.request('thread/start', threadStartParams);
        const threadId = threadStartResult && threadStartResult.thread ? threadStartResult.thread.id : null;
        if (!isNonEmptyString(threadId)) {
            throw new Error('Codex thread/start did not return thread id.');
        }

        resetSessionCodexRuntimeState(session, { clearThreadModel: true });
        state.threadId = threadId;
        state.threadModel = resolveThreadModelFromResponse(threadStartResult);
        state.tokenUsage = extractTokenUsageSnapshot(threadStartResult);
        console.info('[gateway][tokenUsage][thread/start]', JSON.stringify({
            sessionId: session.id,
            threadId,
            tokenUsage: state.tokenUsage || null
        }));
        state.threadExecutionContextSignature = executionContextSignature;
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

    const ensureThreadModelForSession = async (session, threadId) => {
        const effective = getEffectiveSessionCodexConfig(session);
        if (normalizeModelName(effective.defaultModel)) {
            return {
                threadId,
                model: effective.defaultModel
            };
        }

        const currentModel = getSessionThreadModel(session);
        if (currentModel) {
            return {
                threadId,
                model: currentModel
            };
        }

        if (!isNonEmptyString(threadId)) {
            return {
                threadId: null,
                model: normalizeModelName(process.env.TERMLINK_CODEX_MODEL)
            };
        }

        const resumeResult = await codexService.request('thread/resume', { threadId });
        const resumedThreadId = resumeResult && resumeResult.thread ? resumeResult.thread.id : null;
        const resumedModel = resolveThreadModelFromResponse(resumeResult);
        return {
            threadId: isNonEmptyString(resumedThreadId) ? resumedThreadId : threadId,
            model: resumedModel
                ? setSessionThreadModel(session, resumedModel)
                : normalizeModelName(process.env.TERMLINK_CODEX_MODEL)
        };
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
            const tempFileTurnId = completedTurnId || state.currentTurnId || null;
            if (tempFileTurnId) {
                void cleanupTurnAttachmentTempFiles(session, tempFileTurnId);
            }
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
                if (state.currentTurnId) {
                    void cleanupTurnAttachmentTempFiles(session, state.currentTurnId);
                }
                const changed = state.status !== 'idle' || state.currentTurnId !== null;
                state.status = 'idle';
                state.currentTurnId = null;
                return changed;
            }
            return false;
        }
        if (method === 'thread/tokenUsage/updated') {
            const nextTokenUsage = extractTokenUsageSnapshot(params) || params || null;
            console.info('[gateway][tokenUsage][notification]', JSON.stringify({
                sessionId: session.id,
                threadId: state.threadId || null,
                params: params || null,
                nextTokenUsage
            }));
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
            void cleanupAllSessionAttachmentTempFiles(session);
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
                    summary: summary || null,
                    params: message && message.params && typeof message.params === 'object'
                        ? message.params
                        : null
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
        const connectionSecurity = resolveConnectionSecurity(req, tlsConfig);
        req.connectionSecurity = connectionSecurity;

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

            session.privilegeMetadata = {
                ...(session.privilegeMetadata && typeof session.privilegeMetadata === 'object'
                    ? session.privilegeMetadata
                    : {}),
                privilegeLevel,
                connectedBy: req.user || 'unknown',
                auditTraceId,
                clientIp
            };

            sessionId = session.id;
            sessionManager.addConnection(session, ws);
            const pty = session.ptyService;
            syncSessionThreadBinding(session);
            ws.connectionSecurity = connectionSecurity;
            const sessionSecurity = summarizeSessionConnections(session);

            // Log connection start for elevated mode
            const connectionStartTime = Date.now();
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
                connectionSecurity,
                activeConnectionCount: sessionSecurity.activeConnectionCount,
                allTls: sessionSecurity.allTls,
                allMtlsAuthorized: sessionSecurity.allMtlsAuthorized,
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
            ws.sessionId = sessionId;
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
                    } else if (type === 'client_heartbeat') {
                        // Client-initiated heartbeat - mark connection as alive
                        ws.isAlive = true;
                    } else if (type === 'codex_new_thread') {
                        await ensureCodexServiceForSession(session);
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
                        const attachments = normalizeTurnAttachments(envelope.attachments);
                        if (!text && attachments.length === 0) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_EMPTY_INPUT',
                                message: 'Codex input cannot be empty.'
                            });
                            return;
                        }
                        const turnOverrides = normalizeTurnOverrides(envelope);
                        const nextTurnEffectiveConfig = buildNextTurnEffectiveCodexConfig(session, turnOverrides);
                        await ensureCodexServiceForSession(session, nextTurnEffectiveConfig);

                        const initialThreadId = await ensureCodexThreadForSession(session, {
                            forceNewThread: envelope.forceNewThread === true,
                            cwd: envelope.cwd,
                            codexConfig: nextTurnEffectiveConfig,
                            requireExactExecutionContext: !!turnOverrides.sandbox
                        });

                        const configuredModel = nextTurnEffectiveConfig.model || null;
                        const threadModelState = configuredModel
                            ? null
                            : await ensureThreadModelForSession(session, initialThreadId);
                        const threadId = threadModelState && isNonEmptyString(threadModelState.threadId)
                            ? threadModelState.threadId
                            : initialThreadId;
                        const fallbackThreadModel = threadModelState ? threadModelState.model : null;
                        const effectiveModel = configuredModel
                            || fallbackThreadModel
                            || null;
                        const effectiveReasoningEffort = nextTurnEffectiveConfig.reasoningEffort || null;
                        const collaborationMode = finalizeCollaborationMode(turnOverrides.collaborationMode, {
                            model: effectiveModel,
                            reasoningEffort: effectiveReasoningEffort
                        });
                        const turnInput = await buildTurnInput(text, attachments);
                        const turnStartPayload = {
                            threadId,
                            input: turnInput.input,
                            model: collaborationMode ? undefined : effectiveModel || undefined,
                            reasoningEffort: collaborationMode ? undefined : effectiveReasoningEffort || undefined,
                            effort: collaborationMode ? undefined : effectiveReasoningEffort || undefined,
                            personality: nextTurnEffectiveConfig.personality || undefined,
                            approvalPolicy: nextTurnEffectiveConfig.approvalPolicy || undefined,
                            askForApproval: nextTurnEffectiveConfig.approvalPolicy || undefined,
                            sandbox: nextTurnEffectiveConfig.sandboxMode || undefined,
                            sandboxMode: nextTurnEffectiveConfig.sandboxMode || undefined,
                            collaborationMode: collaborationMode || undefined
                        };
                        let turnStartResponse;
                        try {
                            turnStartResponse = await codexService.request('turn/start', turnStartPayload);
                        } catch (turnStartError) {
                            await cleanupAttachmentTempFiles(turnInput.tempFilePaths);
                            throw turnStartError;
                        }

                        codexState.threadId = threadId;
                        codexState.currentTurnId = turnStartResponse && turnStartResponse.turn
                            ? turnStartResponse.turn.id || null
                            : null;
                        if (isNonEmptyString(codexState.currentTurnId)) {
                            rememberTurnAttachmentTempFiles(session, codexState.currentTurnId, turnInput.tempFilePaths);
                        } else {
                            await cleanupAttachmentTempFiles(turnInput.tempFilePaths);
                        }
                        codexState.status = 'running';
                        codexState.interactionState = {
                            planMode: false,
                            activeSkill: null
                        };
                        bindThreadToSession(threadId, session.id);
                        updateSessionLastCodexThreadId(session, threadId);
                        const effectiveCwd = updateSessionCwd(session, envelope.cwd || session.cwd);
                        codexState.threadExecutionContextSignature = buildThreadExecutionContextSignature({
                            cwd: effectiveCwd,
                            codexConfig: nextTurnEffectiveConfig
                        });
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
                        const nextTokenUsage = extractTokenUsageSnapshot(response);
                        console.info('[gateway][tokenUsage][codex_thread_read]', JSON.stringify({
                            sessionId: session.id,
                            threadId: codexState.threadId,
                            nextTokenUsage
                        }));
                        if (nextTokenUsage !== null) {
                            codexState.tokenUsage = nextTokenUsage;
                            emitCodexState(session);
                        }
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
                        if (method === 'account/rateLimits/read') {
                            console.info('[CODEX][account/rateLimits/read] Response:', JSON.stringify(response, null, 2));
                        }
                        const codexState = ensureSessionCodexState(session);
                        if (method === 'account/rateLimits/read') {
                            codexState.rateLimitState = response || null;
                            emitCodexState(session);
                        }
                        if (
                            method === 'thread/resume' &&
                            response &&
                            response.thread &&
                            isNonEmptyString(response.thread.id)
                        ) {
                            resetSessionCodexRuntimeState(session);
                            codexState.threadId = response.thread.id;
                            codexState.threadModel = resolveThreadModelFromResponse(response);
                            codexState.tokenUsage = extractTokenUsageSnapshot(response);
                            console.info('[gateway][tokenUsage][thread/resume]', JSON.stringify({
                                sessionId: session.id,
                                threadId: response.thread.id,
                                tokenUsage: codexState.tokenUsage || null
                            }));
                            bindThreadToSession(response.thread.id, session.id);
                            updateSessionLastCodexThreadId(session, response.thread.id);
                            codexState.threadExecutionContextSignature = buildThreadExecutionContextSignature({
                                cwd: session.cwd,
                                codexConfig: getEffectiveSessionCodexConfig(session)
                            });
                            emitCodexState(session);
                        }
                        if (method === 'thread/read') {
                            const nextTokenUsage = extractTokenUsageSnapshot(response);
                            console.info('[gateway][tokenUsage][thread/read]', JSON.stringify({
                                sessionId: session.id,
                                threadId: codexState.threadId || null,
                                nextTokenUsage
                            }));
                            if (nextTokenUsage !== null) {
                                codexState.tokenUsage = nextTokenUsage;
                                emitCodexState(session);
                            }
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

            ws.on('close', (code, reason) => {
                sessionManager.removeConnection(session, ws);
                // Log connection end for elevated mode
                if (isElevated && auditService) {
                    const durationMs = Date.now() - connectionStartTime;
                    auditService.logConnectionEnd({
                        auditTraceId,
                        sessionId,
                        privilegeLevel,
                        clientIp,
                        closeCode: code || 1005,
                        closeReason: reason ? String(reason) : '',
                        durationMs
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
        for (const session of sessionManager.sessions.values()) {
            void cleanupAllSessionAttachmentTempFiles(session);
        }
        codexService.stop();
    };
}

module.exports = registerTerminalGateway;
