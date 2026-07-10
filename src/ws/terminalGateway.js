const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyWsUpgrade } = require('../auth/basicAuth');
const { isIpAllowed, normalizeIp } = require('../utils/ipCheck');
const { generateAuditTraceId } = require('../utils/auditTrace');
const { resolveConnectionSecurity } = require('../utils/connectionSecurity');
const { getAuditService } = require('../services/auditService');
const CodexAppServerService = require('../services/codexAppServerService');
const { CodexThreadHub } = require('../services/codexThreadHub');
const { CodexOwnerSurfaceTracker } = require('../services/codexOwnerSurfaceTracker');
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

function compactForLog(value, maxLength = 4000) {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}...<truncated>`;
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

async function isExistingDirectoryCwd(value) {
    const normalized = normalizeOptionalCwd(value);
    if (!normalized) {
        return false;
    }

    try {
        const stats = await fs.promises.stat(normalized);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

async function resolveRunnableCodexCwd(session, requestedCwd) {
    const candidates = [];
    const pushCandidate = (value) => {
        const normalized = normalizeOptionalCwd(value);
        if (!normalized || candidates.includes(normalized)) {
            return;
        }
        candidates.push(normalized);
    };

    pushCandidate(requestedCwd);
    pushCandidate(session && session.cwd);
    pushCandidate(session && session.workspaceRoot);
    pushCandidate(process.env.TERMLINK_CODEX_WORKSPACE_DIR);
    pushCandidate(process.cwd());

    for (const candidate of candidates) {
        if (await isExistingDirectoryCwd(candidate)) {
            return candidate;
        }
    }

    return String(process.env.TERMLINK_CODEX_WORKSPACE_DIR || process.cwd());
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

function buildActiveSkillCandidates(cwd, skillName) {
    const normalizedCwd = normalizeOptionalCwd(cwd);
    const normalizedSkill = isNonEmptyString(skillName) ? skillName.trim() : '';
    if (!normalizedCwd || !normalizedSkill) {
        return [];
    }
    return [
        path.join(normalizedCwd, '.codex', 'skills', normalizedSkill, 'SKILL.md'),
        path.join(normalizedCwd, 'skills', normalizedSkill, 'SKILL.md'),
        path.join(normalizedCwd, '.claude', 'skills', normalizedSkill, 'SKILL.md')
    ];
}

async function resolveSkillInputPath(cwd, skillName) {
    const candidates = buildActiveSkillCandidates(cwd, skillName);
    for (const candidate of candidates) {
        try {
            const stats = await fs.promises.stat(candidate);
            if (stats.isFile()) {
                return candidate;
            }
        } catch (_) {
            // Fall through to the next mirrored skill location.
        }
    }
    return candidates[0] || null;
}

async function buildTurnInput(text, attachments, interactionState, cwd) {
    const input = [];
    if (isNonEmptyString(text)) {
        input.push({
            type: 'text',
            text,
            text_elements: []
        });
    }
    if (interactionState && isNonEmptyString(interactionState.activeSkill)) {
        const skillName = interactionState.activeSkill.trim();
        const skillPath = await resolveSkillInputPath(cwd, skillName);
        input.push({
            type: 'skill',
            name: skillName,
            path: skillPath
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

function buildCodexRequestParams(method, params, session) {
    const normalizedMethod = isNonEmptyString(method) ? method.trim() : '';
    if (normalizedMethod !== 'skills/list' && normalizedMethod !== 'thread/list') {
        return params;
    }

    const source = params && typeof params === 'object' && !Array.isArray(params)
        ? params
        : {};
    const cwd = normalizeOptionalCwd(session && session.cwd);
    if (!cwd) {
        console.warn(`[gateway][codex_request][${normalizedMethod}] Missing session cwd; forwarding request without cwd scope.`, JSON.stringify({
            sessionId: session && session.id ? session.id : null
        }));
        return params;
    }

    if (normalizedMethod === 'skills/list') {
        if (Object.prototype.hasOwnProperty.call(source, 'cwds')) {
            return params;
        }
        return {
            ...source,
            cwds: [cwd]
        };
    }

    if (Object.prototype.hasOwnProperty.call(source, 'cwd')) {
        return params;
    }
    return {
        ...source,
        cwd
    };
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
            handledBy: 'client',
            requestKind: isNonEmptyString(entry.requestKind) ? entry.requestKind.trim() : resolveCodexServerRequestKind(entry.method),
            responseMode: isNonEmptyString(entry.responseMode) ? entry.responseMode.trim() : resolveCodexServerRequestResponseMode(entry.method),
            summary: isNonEmptyString(entry.summary) ? entry.summary.trim() : null,
            params: entry.params && typeof entry.params === 'object' ? entry.params : null
        }));
}

function registerTerminalGateway(wss, { sessionManager, heartbeatMs = 30000, privilegeConfig, tlsConfig = {}, ipcFeed }) {
    const isElevated = privilegeConfig && privilegeConfig.isElevated;
    const allowedIps = privilegeConfig ? privilegeConfig.allowedIps : [];
    const auditService = isElevated ? getAuditService() : null;
    const codexService = new CodexAppServerService();
    const threadHub = new CodexThreadHub();
    const ownerSurfaceTracker = new CodexOwnerSurfaceTracker();

    // ── IPC feed integration ──────────────────────────────────────────────
    /** @type {Map<import('ws').WebSocket, string>} */
    const _ipcActiveConversations = new Map();
    /** @type {Map<import('ws').WebSocket, boolean>} */
    const _ipcFollowerModes = new Map();
    /** @type {Map<string, string>} */
    const _ipcConversationLastStatus = new Map();

    const _isIpcOnline = () => {
        if (!ipcFeed) return false;
        if (typeof ipcFeed.isOnline === 'function') return ipcFeed.isOnline();
        return Boolean(ipcFeed.online);
    };

    const _getIpcStatus = () => {
        if (!ipcFeed) return { online: false };
        if (typeof ipcFeed.getStatus === 'function') return ipcFeed.getStatus();
        return { online: Boolean(ipcFeed.online), clientId: ipcFeed.clientId };
    };

    const _isIpcActiveSendAllowed = () => {
        if (!ipcFeed) return false;
        if (typeof ipcFeed.isActiveAllowed === 'function') return ipcFeed.isActiveAllowed();
        return Boolean(ipcFeed.allowActiveSend);
    };

    const _isFollowerModeEnabled = (ws) => _ipcFollowerModes.get(ws) === true;

    const _sendFollowerMode = (ws) => {
        sendWsEnvelope(ws, {
            type: 'follower_mode_changed',
            enabled: _isFollowerModeEnabled(ws),
            activeSendAllowed: _isIpcActiveSendAllowed()
        });
    };

    const _setFollowerMode = (ws, enabled) => {
        if (enabled && !_isIpcActiveSendAllowed()) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Active follower mode is not available',
                detail: 'Server IPC feed is not configured with active send enabled.'
            });
            return;
        }
        _ipcFollowerModes.set(ws, Boolean(enabled));
        _sendFollowerMode(ws);
    };

    const _getLatestIpcSnapshot = (conversationId) => {
        if (!ipcFeed || !isNonEmptyString(conversationId)) return null;
        if (typeof ipcFeed.getLatestSnapshot === 'function') {
            return ipcFeed.getLatestSnapshot(conversationId) || null;
        }
        return null;
    };

    const _getLatestOwnerSnapshot = (conversationId) => {
        if (!isNonEmptyString(conversationId)) return null;
        const event = ownerSurfaceTracker.peekSnapshot(conversationId);
        return event && event.surface ? event.surface : null;
    };

    const _getLatestConversationSnapshot = (conversationId) => {
        const ownerSurface = _getLatestOwnerSnapshot(conversationId);
        const ipcSurface = _getLatestIpcSnapshot(conversationId);
        if (ownerSurface && ipcSurface) {
            return chooseRicherConversationSurface(ownerSurface, ipcSurface);
        }
        return ownerSurface || ipcSurface || null;
    };

    const _emitConversationActionRequired = (ws, conversationId, surface) => {
        if (!surface || typeof surface !== 'object') return;
        if (surface.pendingApproval) {
            sendWsEnvelope(ws, {
                type: 'conversation_action_required',
                conversationId,
                actionType: 'approval',
                payload: surface.pendingApproval
            });
        }
        if (surface.pendingPlanAction) {
            sendWsEnvelope(ws, {
                type: 'conversation_action_required',
                conversationId,
                actionType: 'plan',
                payload: surface.pendingPlanAction
            });
        }
        if (surface.pendingUserInputAction) {
            sendWsEnvelope(ws, {
                type: 'conversation_action_required',
                conversationId,
                actionType: 'user_input',
                payload: surface.pendingUserInputAction
            });
        }
        if (surface.pendingGoalAction) {
            sendWsEnvelope(ws, {
                type: 'conversation_action_required',
                conversationId,
                actionType: 'goal',
                payload: surface.pendingGoalAction
            });
        }
    };

    const _pushConversationSurfaceSnapshot = (conversationId, surface) => {
        const status = isNonEmptyString(surface?.status) ? surface.status : 'unknown';
        const previousStatus = _ipcConversationLastStatus.get(conversationId);
        if (status) {
            _ipcConversationLastStatus.set(conversationId, status);
        }

        let sentCount = 0;
        for (const client of wss.clients) {
            if (client.readyState !== 1) continue;
            const activeConv = _ipcActiveConversations.get(client);
            if (activeConv !== conversationId) continue;

            sendWsEnvelope(client, { type: 'conversation_surface_snapshot', conversationId, snapshot: surface });
            sentCount++;
            if (previousStatus && previousStatus !== status) {
                sendWsEnvelope(client, {
                    type: 'conversation_status_changed',
                    conversationId,
                    status,
                    previousStatus
                });
            }
            _emitConversationActionRequired(client, conversationId, surface);
        }
        console.warn('[gateway][ipc][surface-snapshot-pushed]', JSON.stringify({
            conversationId,
            status,
            previousStatus: previousStatus || null,
            statusChanged: Boolean(previousStatus && previousStatus !== status),
            sentToSubscribers: sentCount
        }));
        if (sentCount === 0) {
            const subscribedIds = [];
            for (const client of wss.clients) {
                if (client.readyState !== 1) continue;
                const cid = _ipcActiveConversations.get(client);
                if (cid) subscribedIds.push(cid);
            }
            console.warn('[gateway][ipc][mismatch] snapshot has no subscriber', JSON.stringify({
                pushedConversationId: conversationId,
                currentlySubscribedIds: subscribedIds
            }));
        }
    };

    if (ipcFeed) {
        ipcFeed.on('status', (status) => {
            let sentCount = 0;
            for (const client of wss.clients) {
                if (client.readyState === 1) { // WebSocket.OPEN
                    sendWsEnvelope(client, { type: 'codex_ipc_status', status });
                    sentCount++;
                }
            }
            console.warn('[gateway][ipc][status-broadcast]', JSON.stringify({
                online: status.online,
                clientId: status.clientId || null,
                sentToClients: sentCount
            }));
            // When IPC comes online (new IPC-ID from desktop Codex), push fresh
            // conversation list so the app can re-evaluate which conversation to follow.
            if (status.online) {
                const conversations = _buildConversations();
                const convSent = _broadcastConversationsToAll(conversations);
                if (convSent > 0) {
                    console.warn('[gateway][ipc][status-online-conversations]', JSON.stringify({
                        conversationCount: conversations.length,
                        conversationIds: conversations.map(c => c.conversationId),
                        sentToClients: convSent
                    }));
                }
            }
        });

        ipcFeed.on('snapshot', ({ conversationId, surface }) => {
            console.warn('[gateway][ipc][snapshot-push]', JSON.stringify({
                conversationId,
                status: surface.status || 'unknown',
                itemCount: Array.isArray(surface.items) ? surface.items.length : 0,
                hasActiveGoal: Boolean(surface.activeGoal),
                hasPendingApproval: Boolean(surface.pendingApproval),
                hasPendingPlanAction: Boolean(surface.pendingPlanAction)
            }));
            _pushConversationSurfaceSnapshot(conversationId, surface);
        });

        ipcFeed.on('event', (event) => {
            let sentCount = 0;
            for (const client of wss.clients) {
                if (client.readyState === 1) {
                    sendWsEnvelope(client, { type: 'codex_ipc_sync_event', event });
                    sentCount++;
                }
            }
            console.warn('[gateway][ipc][sync-event-broadcast]', JSON.stringify({
                conversationId: event.threadId || event.conversationId || null,
                method: event.method || null,
                sequence: event.sequence,
                sentToClients: sentCount
            }));
        });

        ipcFeed.on('error', (error) => {
            const detail = error instanceof Error ? error.message : String(error);
            for (const client of wss.clients) {
                if (client.readyState === 1) {
                    sendWsEnvelope(client, { type: 'error', message: 'Codex IPC feed error', detail });
                }
            }
        });
    }

    ownerSurfaceTracker.on('broadcast', (event) => {
        if (!event || !isNonEmptyString(event.conversationId) || !event.surface) {
            return;
        }
        if (ipcFeed && typeof ipcFeed.hasRicherExternalSurface === 'function' && ipcFeed.hasRicherExternalSurface(event.conversationId, event.surface)) {
            return;
        }
        _pushConversationSurfaceSnapshot(event.conversationId, event.surface);
        if (ipcFeed && _isIpcOnline() && typeof ipcFeed.sendBroadcast === 'function') {
            try {
                ipcFeed.sendBroadcast('thread-stream-state-changed', event.payload);
            } catch (error) {
                console.warn('[gateway][codex][owner-surface-broadcast-failed]', error && error.message ? error.message : String(error));
            }
        }
    });

    const _buildConversations = () => {
        if (!ipcFeed) return [];
        const snapshotMap = new Map();
        for (const s of ipcFeed.getRecentSnapshots()) {
            snapshotMap.set(s.conversationId, s);
        }
        for (const s of ownerSurfaceTracker.getRecentSnapshots()) {
            const existing = snapshotMap.get(s.conversationId);
            snapshotMap.set(s.conversationId, existing
                ? { ...s, surface: chooseRicherConversationSurface(s.surface, existing.surface), timestamp: Math.max(s.timestamp || 0, existing.timestamp || 0) }
                : s);
        }
        return Array.from(snapshotMap.values()).map(s => ({
            conversationId: s.conversationId,
            status: s.surface?.status || 'unknown',
            updatedAt: s.timestamp,
            title: s.surface?.title || undefined,
            cwd: s.surface?.cwd || undefined,
            ownerKind: s.surface?.ownerKind || undefined,
            latestTurnId: s.surface?.latestTurnId || undefined,
            itemCount: Array.isArray(s.surface?.items) ? s.surface.items.length : 0,
            hasActiveGoal: Boolean(s.surface?.activeGoal),
            hasPendingApproval: Boolean(s.surface?.pendingApproval),
            hasPendingPlanAction: Boolean(s.surface?.pendingPlanAction),
            hasPendingUserInputAction: Boolean(s.surface?.pendingUserInputAction)
        }));
    };

    const _broadcastConversationsToAll = (conversations) => {
        if (!conversations || conversations.length === 0) return 0;
        let sent = 0;
        for (const client of wss.clients) {
            if (client.readyState === 1) {
                sendWsEnvelope(client, { type: 'codex_ipc_conversations', conversations });
                sent++;
            }
        }
        return sent;
    };

    const _broadcastIpcStatus = (ws) => {
        if (!ipcFeed) return;
        sendWsEnvelope(ws, {
            type: 'codex_ipc_status',
            status: _getIpcStatus()
        });
        if (typeof ipcFeed.getRecentEvents === 'function') {
            for (const event of ipcFeed.getRecentEvents()) {
                sendWsEnvelope(ws, { type: 'codex_ipc_sync_event', event });
            }
        }
        const conversations = _buildConversations();
        if (conversations.length > 0) {
            sendWsEnvelope(ws, { type: 'codex_ipc_conversations', conversations });
        }
        console.warn('[gateway][ipc][broadcast-ipc-status]', JSON.stringify({
            conversationCount: conversations.length,
            conversationIds: conversations.map(c => c.conversationId),
            ipcOnline: _getIpcStatus().online
        }));
        _sendFollowerMode(ws);
    };

    const _handleSetActiveConversation = (ws, session, conversationId) => {
        if (!ipcFeed) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC feed is not available', detail: 'codex-ipc is not configured on this server.' });
            return;
        }
        if (typeof conversationId !== 'string' || !conversationId.trim()) {
            sendWsEnvelope(ws, { type: 'error', message: 'Invalid conversationId', detail: 'conversationId must be a non-empty string.' });
            return;
        }
        const normalizedConversationId = conversationId.trim();
        _ipcActiveConversations.set(ws, normalizedConversationId);
        console.warn('[gateway][ipc][set-active-conversation]', JSON.stringify({
            conversationId: normalizedConversationId,
            sessionId: session?.id || null,
            sessionMode: session?.sessionMode || null,
            previousThreadId: session && isNonEmptyString(session.lastCodexThreadId) ? session.lastCodexThreadId.trim() : null
        }));

        if (session && session.sessionMode === 'codex') {
            const previousThreadId = isNonEmptyString(session.lastCodexThreadId)
                ? session.lastCodexThreadId.trim()
                : null;
            const boundThreadId = updateSessionLastCodexThreadId(session, normalizedConversationId);
            if (boundThreadId && boundThreadId !== previousThreadId) {
                sendWsEnvelope(ws, {
                    type: 'session_codex_thread_bound',
                    sessionId: session.id,
                    conversationId: boundThreadId,
                    lastCodexThreadId: boundThreadId
                });
            }
        }

        // Replay latest cached snapshot if available.
        const latest = _getLatestConversationSnapshot(normalizedConversationId);
        if (latest) {
            sendWsEnvelope(ws, { type: 'conversation_surface_snapshot', conversationId: normalizedConversationId, snapshot: latest });
            _emitConversationActionRequired(ws, normalizedConversationId, latest);
        }
        _sendFollowerMode(ws);
    };
    const _getActiveConversationId = (ws) => _ipcActiveConversations.get(ws) || null;

    const _shouldUseOwnerRuntime = (conversationId) => ownerSurfaceTracker.hasConversation(conversationId);

    const _ensureOwnerConversation = async (conversationId, seedSurface) => {
        if (!isNonEmptyString(conversationId)) {
            throw new Error('Owner conversation id is required.');
        }
        if (_shouldUseOwnerRuntime(conversationId)) {
            return conversationId;
        }
        const resumeResult = await codexService.request('thread/resume', { threadId: conversationId });
        const resumedThreadId = resumeResult && resumeResult.thread && isNonEmptyString(resumeResult.thread.id)
            ? resumeResult.thread.id.trim()
            : conversationId;
        ownerSurfaceTracker.registerThreadResume(resumedThreadId, {
            seedSurface: seedSurface || _getLatestIpcSnapshot(conversationId) || { conversationId }
        });
        return resumedThreadId;
    };

    const _startOwnerTurn = async (ws, conversationId, input, latestSnapshot, options = {}) => {
        try {
            const threadId = await _ensureOwnerConversation(conversationId, latestSnapshot);
            const turnStartParams = buildFollowerTurnStartParams(input.trim(), latestSnapshot || {});
            const result = await codexService.request('turn/start', {
                threadId,
                ...turnStartParams
            });
            ownerSurfaceTracker.adoptTurnStartResult(threadId, result, turnStartParams.clientUserMessageId);
            sendWsEnvelope(ws, { type: options.successType || 'follower_message_sent', conversationId: threadId, acknowledged: true });
        } catch (error) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: options.failureMessage || 'Failed to send owner message',
                detail: error && error.message ? error.message : String(error)
            });
        }
    };

    const _handleFollowerSendMessage = async (ws, conversationId, input, options = {}) => {
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            sendWsEnvelope(ws, { type: 'error', message: 'Active send is not allowed', detail: 'Enable TERMLINK_CODEX_IPC_ENABLED + ALLOW_ACTIVE + CONFIRM_SEND.' });
            return;
        }
        if (typeof conversationId !== 'string' || !conversationId.trim()) {
            sendWsEnvelope(ws, { type: 'error', message: 'No active conversation', detail: 'Set an active conversation before sending messages.' });
            return;
        }
        if (typeof input !== 'string' || !input.trim()) {
            sendWsEnvelope(ws, { type: 'error', message: 'Input cannot be empty', detail: 'Provide non-empty message text.' });
            return;
        }

        // Running gate: block start-turn when conversation is running.
        const latest = _getLatestConversationSnapshot(conversationId);
        if (!latest && !_shouldUseOwnerRuntime(conversationId) && ipcFeed && !_isIpcOnline()) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC is not online', detail: 'Cannot send message while IPC is disconnected.' });
            return;
        }
        if (!latest) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is not live',
                detail: 'Wait for a live IPC surface snapshot before starting a follower turn.'
            });
            return;
        }
        if (!canStartFollowerTurn(latest?.status)) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is still running',
                detail: 'Wait for the current turn to finish before starting a new follower turn.'
            });
            return;
        }

        if (_shouldUseOwnerRuntime(conversationId)) {
            await _startOwnerTurn(ws, conversationId, input, latest, options);
            return;
        }

        if (!ipcFeed) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC feed is not available', detail: options.unavailableDetail || 'Enable codex-ipc to send follower messages.' });
            return;
        }
        if (!_isIpcOnline()) {
            await _startOwnerTurn(ws, conversationId, input, latest, options);
            return;
        }

        try {
            const response = await ipcFeed.sendRequest('thread-follower-start-turn', {
                conversationId,
                turnStartParams: buildFollowerTurnStartParams(input.trim(), latest)
            });
            assertIpcSuccess(response);
            sendWsEnvelope(ws, { type: options.successType || 'follower_message_sent', conversationId, acknowledged: true });
        } catch (error) {
            if (isNoClientFoundError(error)) {
                await _startOwnerTurn(ws, conversationId, input, latest, options);
                return;
            }
            sendWsEnvelope(ws, { type: 'error', message: options.failureMessage || 'Failed to send follower message', detail: error.message });
        }
    };

    const _handleFollowerStartGoal = async (ws, conversationId, goal) => {
        if (typeof goal !== 'string' || !goal.trim()) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Goal objective is empty',
                detail: 'Enter a goal objective before starting a goal.'
            });
            return;
        }
        await _handleFollowerSendMessage(ws, conversationId, `/goal ${goal.trim()}`, {
            successType: 'follower_goal_sent',
            failureMessage: 'Failed to start follower goal',
            unavailableDetail: 'Enable codex-ipc to start follower goals.'
        });
    };

    const _handleFollowerInterruptTurn = async (ws, conversationId) => {
        if (!isNonEmptyString(conversationId)) {
            sendWsEnvelope(ws, { type: 'error', message: 'No active conversation', detail: 'Set an active conversation before interrupting a turn.' });
            return;
        }
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            sendWsEnvelope(ws, { type: 'error', message: 'Active send is not allowed', detail: 'Enable TERMLINK_CODEX_IPC_ENABLED + ALLOW_ACTIVE + CONFIRM_SEND.' });
            return;
        }

        const latest = _getLatestConversationSnapshot(conversationId);
        if (!latest || latest.status !== 'running') {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is not running',
                detail: 'Only a running turn can be interrupted.'
            });
            return;
        }

        if (_shouldUseOwnerRuntime(conversationId)) {
            try {
                await codexService.request('turn/interrupt', {
                    threadId: conversationId,
                    ...(isNonEmptyString(latest.latestTurnId) ? { turnId: latest.latestTurnId } : {})
                });
                sendWsEnvelope(ws, { type: 'follower_turn_interrupted', conversationId, acknowledged: true });
            } catch (error) {
                sendWsEnvelope(ws, { type: 'error', message: 'Failed to interrupt owner turn', detail: error.message });
            }
            return;
        }

        if (!ipcFeed) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC feed is not available', detail: 'Enable codex-ipc to interrupt follower turns.' });
            return;
        }
        if (!_isIpcOnline()) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC is not online', detail: 'Cannot interrupt the active turn while IPC is disconnected.' });
            return;
        }

        try {
            const response = await ipcFeed.sendRequest('thread-follower-interrupt-turn', {
                conversationId,
                ...(isNonEmptyString(latest.latestTurnId) ? { turnId: latest.latestTurnId } : {})
            });
            assertIpcSuccess(response);
            sendWsEnvelope(ws, { type: 'follower_turn_interrupted', conversationId, acknowledged: true });
        } catch (error) {
            sendWsEnvelope(ws, { type: 'error', message: 'Failed to interrupt follower turn', detail: error.message });
        }
    };

    const _handleFollowerApprovalResponse = async (ws, conversationId, decision, requestId, requestKind, execpolicyAmendment) => {
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC is not available for active send' });
            return;
        }

        const latest = _getLatestConversationSnapshot(conversationId);
        const approval = resolvePendingApprovalResponseTarget(latest, requestId, requestKind);
        if (!approval) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Failed to send approval response',
                detail: 'No matching pending approval request was found.'
            });
            return;
        }
        const decisionValue = buildApprovalDecisionValue(decision, execpolicyAmendment, approval);

        if (_shouldUseOwnerRuntime(conversationId)) {
            try {
                codexService.respondToServerRequest(approval.rawRequestId, {
                    result: { decision: decisionValue }
                });
                ownerSurfaceTracker.resolveRequest(approval.rawRequestId, conversationId);
                sendWsEnvelope(ws, { type: 'follower_approval_response_sent', conversationId, requestId, acknowledged: true });
            } catch (error) {
                sendWsEnvelope(ws, { type: 'error', message: 'Failed to send owner approval response', detail: error.message });
            }
            return;
        }

        if (!ipcFeed) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC feed is not available' });
            return;
        }
        if (!_isIpcOnline()) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC is not available for active send' });
            return;
        }

        try {
            const response = await ipcFeed.sendRequest(approval.method, {
                conversationId,
                requestId: approval.rawRequestId,
                decision: decisionValue
            });
            assertIpcSuccess(response);
            sendWsEnvelope(ws, { type: 'follower_approval_response_sent', conversationId, requestId, acknowledged: true });
        } catch (error) {
            sendWsEnvelope(ws, { type: 'error', message: 'Failed to send approval response', detail: error.message });
        }
    };

    const _handleFollowerPlanResponse = async (ws, conversationId, input, requestId, explicitResponse, questionId) => {
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            sendWsEnvelope(ws, { type: 'error', message: 'IPC is not available for active send' });
            return;
        }
        const hasExplicitResponse = explicitResponse && typeof explicitResponse === 'object';
        if (!conversationId || (!hasExplicitResponse && (!input || !input.trim()))) {
            sendWsEnvelope(ws, { type: 'error', message: 'Plan response is incomplete' });
            return;
        }

        try {
            const latest = _getLatestConversationSnapshot(conversationId);
            const planAction = latest?.pendingPlanAction;
            const trimmedInput = typeof input === 'string' ? input.trim() : '';
            const livePlanRequestId = requestId || planAction?.requestId || '';

            if (_shouldUseOwnerRuntime(conversationId)) {
                if (!hasExplicitResponse && planAction && planAction.requestMethod === 'item/plan/requestImplementation' && isPlanAcceptInput(trimmedInput)) {
                    const collaborationMode = resolvePlanStartCollaborationMode(latest);
                    if (collaborationMode) {
                        await codexService.request('thread/settings/update', {
                            threadId: conversationId,
                            collaborationMode
                        });
                        ownerSurfaceTracker.applyThreadSettingsUpdate(conversationId, { collaborationMode }, { broadcast: false });
                    }
                    await _startOwnerTurn(ws, conversationId, buildPlanImplementationPrompt(planAction.planContent || trimmedInput), latest, {
                        successType: 'follower_plan_response_sent',
                        failureMessage: 'Failed to send owner plan response'
                    });
                    return;
                }

                if (!livePlanRequestId) {
                    sendWsEnvelope(ws, {
                        type: 'error',
                        message: 'Plan response cannot be submitted',
                        detail: 'The current owner plan action does not include a live requestId.'
                    });
                    return;
                }
                const responsePayload = hasExplicitResponse
                    ? explicitResponse
                    : buildPlanInputResponse(trimmedInput, questionId || requestId || livePlanRequestId);
                codexService.respondToServerRequest(livePlanRequestId, { result: responsePayload });
                ownerSurfaceTracker.resolveRequest(livePlanRequestId, conversationId);
                sendWsEnvelope(ws, { type: 'follower_plan_response_sent', conversationId, acknowledged: true });
                return;
            }

            if (!ipcFeed) {
                sendWsEnvelope(ws, { type: 'error', message: 'IPC feed is not available' });
                return;
            }
            if (!_isIpcOnline()) {
                sendWsEnvelope(ws, { type: 'error', message: 'IPC is not available for active send' });
                return;
            }

            const hasExternalPlanAction = typeof ipcFeed.hasExternalPendingPlanAction === 'function'
                ? ipcFeed.hasExternalPendingPlanAction(conversationId, livePlanRequestId)
                : Boolean(planAction && livePlanRequestId);

            if (!hasExplicitResponse && planAction && planAction.requestMethod === 'item/plan/requestImplementation' && isPlanAcceptInput(trimmedInput)) {
                if (!hasExternalPlanAction) {
                    sendWsEnvelope(ws, {
                        type: 'error',
                        message: 'Plan response cannot be submitted',
                        detail: 'The current plan was reconstructed from session history or a local snapshot and does not include a live external request.'
                    });
                    return;
                }

                const collaborationMode = resolvePlanStartCollaborationMode(latest);
                if (collaborationMode) {
                    const updateRes = await ipcFeed.sendRequest('thread-follower-update-thread-settings', {
                        conversationId,
                        threadSettings: { collaborationMode }
                    });
                    assertIpcSuccess(updateRes);
                }
                const planContent = planAction.planContent || trimmedInput;
                const startRes = await ipcFeed.sendRequest('thread-follower-start-turn', {
                    conversationId,
                    turnStartParams: buildFollowerTurnStartParams(buildPlanImplementationPrompt(planContent), latest, { collaborationMode })
                });
                assertIpcSuccess(startRes);
            } else {
                // Regular text input for plan feedback.
                if (!livePlanRequestId) {
                    sendWsEnvelope(ws, {
                        type: 'error',
                        message: 'Plan response cannot be submitted',
                        detail: 'The current plan does not include the live requestId required by thread-follower-submit-user-input.'
                    });
                    return;
                }
                const responsePayload = hasExplicitResponse
                    ? explicitResponse
                    : buildPlanInputResponse(trimmedInput, questionId || requestId || livePlanRequestId);
                const res = await ipcFeed.sendRequest('thread-follower-submit-user-input', {
                    conversationId,
                    requestId: livePlanRequestId,
                    response: responsePayload
                });
                assertIpcSuccess(res);
            }
            sendWsEnvelope(ws, { type: 'follower_plan_response_sent', conversationId, acknowledged: true });
        } catch (error) {
            sendWsEnvelope(ws, { type: 'error', message: 'Failed to send plan response', detail: error.message });
        }
    };

    function resolvePendingApprovalResponseTarget(snapshot, requestId, requestKind) {
        if (!snapshot) return null;
        const requested = isNonEmptyString(requestId) ? requestId.trim() : '';
        const requestedKind = isNonEmptyString(requestKind) ? requestKind.trim() : '';
        const candidates = [];
        if (snapshot.pendingApproval && typeof snapshot.pendingApproval === 'object') {
            candidates.push(snapshot.pendingApproval);
        }
        const items = Array.isArray(snapshot.items) ? snapshot.items : [];
        for (const item of items) {
            if (!item || typeof item !== 'object' || item.kind !== 'approval_request') continue;
            candidates.push(item);
        }
        for (const candidate of candidates) {
            const resolved = normalizePendingApprovalCandidate(candidate, requested, requestedKind);
            if (resolved) return resolved;
        }
        return null;
    }

    function normalizePendingApprovalCandidate(candidate, requested, requestedKind) {
        const requestIds = [
            isNonEmptyString(candidate.requestId) ? candidate.requestId.trim() : '',
            isNonEmptyString(candidate.id) ? candidate.id.trim() : '',
            isNonEmptyString(candidate.rawRequestId) ? candidate.rawRequestId.trim() : ''
        ].filter(Boolean);
        const raw = candidate.raw && typeof candidate.raw === 'object' ? candidate.raw : null;
        if (raw && (typeof raw.id === 'string' || typeof raw.id === 'number')) {
            requestIds.push(String(raw.id));
        }
        if (requested && !requestIds.includes(requested)) return null;
        const kind = isNonEmptyString(candidate.requestKind)
            ? candidate.requestKind.trim()
            : (isNonEmptyString(candidate.kind)
                ? candidate.kind.trim()
                : (isNonEmptyString(candidate.approvalType) ? candidate.approvalType.trim() : ''));
        if (requestedKind && kind && requestedKind !== kind) return null;
        const rawRequestId = isNonEmptyString(candidate.rawRequestId)
            ? candidate.rawRequestId.trim()
            : (raw && (typeof raw.id === 'string' || typeof raw.id === 'number')
                ? raw.id
                : (requestIds[0] || requested));
        const method = resolveApprovalResponseMethod(kind);
        return method && rawRequestId !== undefined && rawRequestId !== ''
            ? { kind, rawRequestId, method, raw, params: candidate.params }
            : null;
    }

    function resolveApprovalResponseMethod(kind) {
        if (kind === 'permissions') return 'thread-follower-permissions-request-approval-response';
        if (kind === 'file') return 'thread-follower-file-approval-decision';
        if (kind === 'command') return 'thread-follower-command-approval-decision';
        return null;
    }

    function buildApprovalDecisionValue(decision, execpolicyAmendment, approval) {
        if (decision !== 'acceptWithExecpolicyAmendment') return decision;
        const amendment = normalizeExecpolicyAmendmentForRemember(
            nonEmptyExecpolicyAmendment(execpolicyAmendment) ||
            extractProposedExecpolicyAmendment(approval?.params) ||
            extractProposedExecpolicyAmendment(approval?.raw?.params) ||
            extractProposedExecpolicyAmendment(approval?.raw)
        ) || [];
        return {
            acceptWithExecpolicyAmendment: {
                execpolicy_amendment: amendment
            }
        };
    }

    function extractProposedExecpolicyAmendment(params) {
        if (!params || typeof params !== 'object' || Array.isArray(params)) return undefined;
        const value = params.proposedExecpolicyAmendment;
        if (!Array.isArray(value)) return undefined;
        const amendment = value.filter(part => typeof part === 'string');
        return amendment.length > 0 ? amendment : undefined;
    }

    function nonEmptyExecpolicyAmendment(value) {
        if (!Array.isArray(value)) return undefined;
        const amendment = value.filter(part => isNonEmptyString(part));
        return amendment.length > 0 ? amendment : undefined;
    }

    function normalizeExecpolicyAmendmentForRemember(value) {
        if (!Array.isArray(value)) return undefined;
        const lower = value.map(part => typeof part === 'string' ? part.toLowerCase() : '');
        const itemTypeIndex = lower.indexOf('-itemtype');
        const itemType = itemTypeIndex >= 0 ? lower[itemTypeIndex + 1] : '';
        const pathIndex = lower.indexOf('-path');
        if (
            lower[0] === 'new-item' &&
            pathIndex === 1 &&
            isNonEmptyString(value[2]) &&
            itemType === 'file'
        ) {
            return ['New-Item', '-Path'];
        }
        return value;
    }

    function isPlanAcceptInput(input) {
        const normalized = input.trim();
        return normalized === '是，实施此计划' || normalized === 'Implement plan';
    }

    function canStartFollowerTurn(status) {
        return !status ||
            status === 'unknown' ||
            status === 'completed' ||
            status === 'interrupted' ||
            status === 'failed';
    }

    function buildFollowerTurnStartParams(input, snapshot, options = {}) {
        const { randomUUID } = require('node:crypto');
        const collaborationMode = options.collaborationMode ||
            snapshot?.latestDefaultCollaborationMode ||
            snapshot?.latestCollaborationMode;
        return {
            clientUserMessageId: randomUUID(),
            input: buildTextInputSequence(input),
            attachments: [],
            commentAttachments: [],
            ...(isNonEmptyString(snapshot?.cwd) ? {
                cwd: snapshot.cwd,
                runtimeWorkspaceRoots: [snapshot.cwd]
            } : {}),
            ...(collaborationMode ? { collaborationMode } : {})
        };
    }

    function buildTextInputSequence(text) {
        return [{
            type: 'text',
            text,
            text_elements: []
        }];
    }

    function buildPlanImplementationPrompt(planContent) {
        return `PLEASE IMPLEMENT THIS PLAN:\n${String(planContent || '').trim()}`;
    }

    function buildPlanInputResponse(input, requestId) {
        if (!isNonEmptyString(requestId)) return { answers: {} };
        return {
            answers: {
                [requestId]: {
                    answers: [input]
                }
            }
        };
    }

    function resolvePlanStartCollaborationMode(snapshot) {
        if (isDefaultCollaborationMode(snapshot?.latestDefaultCollaborationMode)) {
            return snapshot.latestDefaultCollaborationMode;
        }
        const settings = snapshot?.latestCollaborationMode?.settings;
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
            return undefined;
        }
        return {
            mode: 'default',
            settings: {
                model: typeof settings.model === 'string' ? settings.model : 'gpt-5.5',
                reasoning_effort: typeof settings.reasoning_effort === 'string' ? settings.reasoning_effort : 'medium',
                developer_instructions: null
            }
        };
    }

    function isDefaultCollaborationMode(mode) {
        return Boolean(mode && typeof mode === 'object' && !Array.isArray(mode) && mode.mode === 'default');
    }

    function chooseRicherConversationSurface(left, right) {
        if (!left) return right || null;
        if (!right) return left;
        return surfaceContentScore(left) >= surfaceContentScore(right) ? left : right;
    }

    function surfaceContentScore(surface) {
        if (!surface || typeof surface !== 'object') return 0;
        const items = Array.isArray(surface.items) ? surface.items : [];
        let score = items.length * 10;
        for (const item of items) {
            if (item && typeof item === 'object' && typeof item.text === 'string') {
                score += Math.min(item.text.length, 200);
            }
        }
        if (surface.pendingApproval) score += 1000;
        if (surface.pendingPlanAction) score += 900;
        if (surface.pendingUserInputAction) score += 800;
        if (surface.activeGoal) score += 100;
        if (surface.status === 'running') score += 50;
        return score;
    }

    function isNoClientFoundError(error) {
        const message = error && error.message ? error.message : String(error || '');
        return /no[-_ ]client[-_ ]found/i.test(message) ||
            /client[^a-z0-9]+not[^a-z0-9]+found/i.test(message);
    }

    function assertIpcSuccess(response) {
        if (!response || typeof response !== 'object') return;
        if (response.type !== 'response' || response.resultType !== 'error') return;
        throw new Error(typeof response.error === 'string' ? response.error : JSON.stringify(response.error));
    }
    // ── end IPC feed integration ──────────────────────────────────────────

    const unbindSessionThreads = (sessionId, options = {}) => {
        threadHub.unbindSessionThreads(sessionId, options);
    };

    const bindThreadToSession = (threadId, sessionId) => {
        threadHub.bindThreadToSession(threadId, sessionId);
    };

    const addFollowerSessionToThread = (threadId, sessionId) => {
        threadHub.addFollowerSession(threadId, sessionId);
    };

    const getThreadRouting = (threadId) => {
        const subscribers = threadHub.getThreadSubscribers(threadId);
        if (!subscribers) {
            return {
                actorSessionId: null,
                actorSession: null,
                followerSessionIds: [],
                followerSessions: []
            };
        }
        const actorSessionId = isNonEmptyString(subscribers.actorSessionId)
            ? subscribers.actorSessionId
            : null;
        const actorSession = actorSessionId
            ? getSessionById(sessionManager, actorSessionId)
            : null;
        const followerSessionIds = Array.isArray(subscribers.followerSessionIds)
            ? subscribers.followerSessionIds.filter((sessionId) => sessionId !== actorSessionId)
            : [];
        const followerSessions = followerSessionIds
            .map((sessionId) => getSessionById(sessionManager, sessionId))
            .filter((session) => Boolean(session));
        return {
            actorSessionId,
            actorSession,
            followerSessionIds,
            followerSessions
        };
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
        const effectiveSandbox = stored && stored.sandboxMode
            ? stored.sandboxMode
            : getConfiguredCodexSandboxMode();
        let effectiveApproval;
        if (stored && stored.approvalPolicy) {
            effectiveApproval = stored.approvalPolicy;
        } else {
            const derived = derivePermissionOverrideFromSandboxMode(effectiveSandbox);
            effectiveApproval = derived
                ? derived.approvalPolicy
                : getConfiguredCodexApprovalPolicy();
        }
        return {
            defaultModel: stored ? stored.defaultModel : null,
            defaultReasoningEffort: stored ? stored.defaultReasoningEffort : null,
            defaultPersonality: stored ? stored.defaultPersonality : null,
            approvalPolicy: effectiveApproval,
            sandboxMode: effectiveSandbox
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

    const isThreadNotFoundError = (error) => {
        const message = error && error.message
            ? String(error.message)
            : String(error || '');
        return /thread not found/i.test(message);
    };

    const clearStaleSessionThreadBinding = (session, threadId) => {
        const state = resetSessionCodexRuntimeState(session, { clearThreadModel: true });
        const staleThreadId = isNonEmptyString(threadId) ? threadId.trim() : null;
        const currentThreadId = isNonEmptyString(state.threadId) ? state.threadId.trim() : null;
        const currentLastThreadId = isNonEmptyString(session.lastCodexThreadId)
            ? session.lastCodexThreadId.trim()
            : null;
        const shouldClearCurrentThread = !staleThreadId || currentThreadId === staleThreadId;
        unbindSessionThreads(session.id, {
            keepThreadId: shouldClearCurrentThread ? null : currentThreadId
        });
        if (shouldClearCurrentThread) {
            state.threadId = null;
        }
        if (!staleThreadId || currentLastThreadId === staleThreadId) {
            updateSessionLastCodexThreadId(session, null);
        }
        persistSessionMetadata(session);
        emitCodexState(session);
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

    const buildCodexStateEnvelope = (session) => {
        const state = ensureSessionCodexState(session);
        return {
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
    };

    const emitCodexState = (session, targetWs, sourceSession = session) => {
        const envelope = buildCodexStateEnvelope(sourceSession);
        if (targetWs) {
            sendWsEnvelope(targetWs, envelope);
            return;
        }
        sessionManager.broadcast(session, envelope);
    };

    const fanoutThreadState = (threadId, sourceSession) => {
        if (!isNonEmptyString(threadId) || !sourceSession) {
            return;
        }
        const { followerSessions } = getThreadRouting(threadId);
        followerSessions.forEach((session) => {
            emitCodexState(session, null, sourceSession);
        });
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
        const preferredThreadId = isNonEmptyString(options.threadId) ? options.threadId.trim() : null;
        const requestedCwd = await resolveRunnableCodexCwd(
            session,
            normalizeOptionalCwd(options.cwd)
        );
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
        const explicitThreadTargetMatches = preferredThreadId !== null
            && isNonEmptyString(state.threadId)
            && state.threadId.trim() === preferredThreadId;
        const shouldReuseExistingThread = !forceNewThread
            && isNonEmptyString(state.threadId)
            && (
                explicitThreadTargetMatches
                || executionContextMatches
                || (!requireExactExecutionContext && currentExecutionContextSignature === null)
            );

        console.info('[gateway][codex][thread-reuse-check]', JSON.stringify({
            sessionId: session.id,
            existingThreadId: isNonEmptyString(state.threadId) ? state.threadId : null,
            preferredThreadId,
            forceNewThread,
            requireExactExecutionContext,
            requestedCwd,
            effectiveCodexConfig,
            currentExecutionContextSignature,
            nextExecutionContextSignature: executionContextSignature,
            executionContextMatches,
            shouldReuseExistingThread
        }));

        if (!forceNewThread && preferredThreadId && !explicitThreadTargetMatches) {
            try {
                const resumeResult = await codexService.request('thread/resume', { threadId: preferredThreadId });
                const resumedThreadId = resumeResult && resumeResult.thread ? resumeResult.thread.id : null;
                if (!isNonEmptyString(resumedThreadId)) {
                    throw new Error('Codex thread/resume did not return thread id.');
                }
                resetSessionCodexRuntimeState(session, { clearThreadModel: true });
                state.threadId = resumedThreadId;
                state.threadModel = resolveThreadModelFromResponse(resumeResult) || state.threadModel || null;
                state.tokenUsage = extractTokenUsageSnapshot(resumeResult);
                state.threadExecutionContextSignature = executionContextSignature;
                bindThreadToSession(resumedThreadId, session.id);
                updateSessionLastCodexThreadId(session, resumedThreadId);
                persistSessionMetadata(session);
                console.info('[gateway][codex][preferred-thread-resumed]', JSON.stringify({
                    sessionId: session.id,
                    preferredThreadId,
                    resumedThreadId,
                    executionContextSignature
                }));
                return resumedThreadId;
            } catch (resumeError) {
                console.warn('[gateway][codex][preferred-thread-resume-failed]', JSON.stringify({
                    sessionId: session.id,
                    preferredThreadId,
                    error: resumeError && resumeError.message ? resumeError.message : String(resumeError),
                    code: resumeError && resumeError.code ? resumeError.code : null
                }));
                if (isThreadNotFoundError(resumeError)) {
                    clearStaleSessionThreadBinding(session, preferredThreadId);
                    console.warn('[gateway][codex][preferred-thread-stale-cleared]', JSON.stringify({
                        sessionId: session.id,
                        preferredThreadId
                    }));
                } else {
                    throw resumeError;
                }
            }
        }

        if (shouldReuseExistingThread) {
            if (explicitThreadTargetMatches) {
                state.threadExecutionContextSignature = executionContextSignature;
            }
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

    const summarizeCodexTraceNotification = (method, params) => ({
        method,
        threadId: CodexAppServerService.extractThreadId({ params }) || null,
        turnId: params && params.turn && params.turn.id
            ? params.turn.id
            : (isNonEmptyString(params && params.turnId) ? params.turnId : null),
        itemId: params && params.item && params.item.id
            ? params.item.id
            : (isNonEmptyString(params && params.itemId) ? params.itemId : null)
    });

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

        ownerSurfaceTracker.handleNotification(method, params);

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
            console.warn('[gateway][codex][notification-drop][no-thread]', JSON.stringify(
                summarizeCodexTraceNotification(method, params)
            ));
            return;
        }

        const {
            actorSessionId,
            actorSession,
            followerSessionIds,
            followerSessions
        } = getThreadRouting(threadId);
        if (!actorSession && followerSessions.length === 0) {
            if (ownerSurfaceTracker.hasConversation(threadId)) {
                return;
            }
            console.warn('[gateway][codex][notification-drop][no-session-binding]', JSON.stringify(
                summarizeCodexTraceNotification(method, params)
            ));
            return;
        }

        if (!actorSession && isNonEmptyString(actorSessionId)) {
            console.warn('[gateway][codex][notification-drop][session-missing]', JSON.stringify({
                ...summarizeCodexTraceNotification(method, params),
                sessionId: actorSessionId
            }));
        }

        const stateChanged = actorSession
            ? updateCodexStateFromNotification(actorSession, method, params)
            : false;
        console.info('[gateway][codex][notification-bridge]', JSON.stringify({
            ...summarizeCodexTraceNotification(method, params),
            actorSessionId,
            followerSessionIds,
            stateChanged
        }));
        if (actorSession) {
            sessionManager.broadcast(actorSession, {
                type: 'codex_notification',
                method,
                params
            });
        }
        followerSessions.forEach((session) => {
            sessionManager.broadcast(session, {
                type: 'codex_notification',
                method,
                params
            });
        });
        if (stateChanged && actorSession) {
            emitCodexState(actorSession);
            fanoutThreadState(threadId, actorSession);
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
        if (handledBy === 'client' && threadId) {
            ownerSurfaceTracker.handleRequest(requestId, method, message.params || null);
        }
        if (!threadId) {
            return;
        }
        const { actorSessionId, actorSession } = getThreadRouting(threadId);
        if (!actorSession) {
            return;
        }
        console.info('[gateway][codex][server-request]', compactForLog({
            sessionId: actorSessionId,
            requestId,
            method,
            handledBy,
            requestKind: resolveCodexServerRequestKind(method),
            responseMode: resolveCodexServerRequestResponseMode(method),
            questionCount: Array.isArray(message && message.params && message.params.questions)
                ? message.params.questions.length
                : 0,
            summary: extractCodexServerRequestSummary(method, message.params || null) || null,
            params: message && message.params && typeof message.params === 'object'
                ? message.params
                : null
        }));
        if (handledBy === 'client') {
            const requestKind = resolveCodexServerRequestKind(method);
            const responseMode = resolveCodexServerRequestResponseMode(method);
            const summary = extractCodexServerRequestSummary(method, message.params || null);
            updatePendingServerRequestState(actorSession, (current) => {
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
        sessionManager.broadcast(actorSession, buildCodexServerRequestEnvelope({
            requestId,
            message,
            handledBy,
            result
        }));
        emitCodexState(actorSession);
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

            // ── IPC feed: push current status on connect ──
            _broadcastIpcStatus(ws);

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

                    if (type === 'set_active_conversation') {
                        _handleSetActiveConversation(ws, session, envelope.conversationId);
                    } else if (type === 'set_active_follower_mode') {
                        _setFollowerMode(ws, envelope.enabled === true);
                    } else if (type === 'follower_send_message') {
                        _handleFollowerSendMessage(ws, envelope.conversationId, envelope.input).catch(err => console.error('[gateway][ipc][follower-send]', err));
                    } else if (type === 'follower_start_goal') {
                        _handleFollowerStartGoal(ws, envelope.conversationId, envelope.goal).catch(err => console.error('[gateway][ipc][follower-goal]', err));
                    } else if (type === 'follower_interrupt_turn') {
                        _handleFollowerInterruptTurn(ws, envelope.conversationId).catch(err => console.error('[gateway][ipc][follower-interrupt]', err));
                    } else if (type === 'follower_approval_response') {
                        _handleFollowerApprovalResponse(ws, envelope.conversationId, envelope.decision, envelope.requestId, envelope.requestKind, envelope.execpolicyAmendment).catch(err => console.error('[gateway][ipc][follower-approval]', err));
                    } else if (type === 'follower_plan_response') {
                        _handleFollowerPlanResponse(ws, envelope.conversationId, envelope.input, envelope.requestId, envelope.response, envelope.questionId).catch(err => console.error('[gateway][ipc][follower-plan]', err));
                    } else if (type === 'input') {
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
                        const turnInteractionState = envelope.interactionState
                            ? normalizeInteractionState(envelope.interactionState)
                            : normalizeInteractionState(codexState.interactionState);
                        if (!text && attachments.length === 0 && !isNonEmptyString(turnInteractionState.activeSkill)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_EMPTY_INPUT',
                                message: 'Codex input cannot be empty.'
                            });
                            return;
                        }
                        const turnOverrides = normalizeTurnOverrides(envelope);
                        const nextTurnEffectiveConfig = buildNextTurnEffectiveCodexConfig(session, turnOverrides);
                        console.info('[gateway][codex][turn-config]', JSON.stringify({
                            sessionId: session.id,
                            clientSandbox: turnOverrides.sandbox || null,
                            clientApprovalPolicy: turnOverrides.approvalPolicy || null,
                            effectiveApproval: nextTurnEffectiveConfig.approvalPolicy,
                            effectiveSandbox: nextTurnEffectiveConfig.sandboxMode
                        }));
                        await ensureCodexServiceForSession(session, nextTurnEffectiveConfig);

                        let initialThreadId = await ensureCodexThreadForSession(session, {
                            forceNewThread: envelope.forceNewThread === true,
                            threadId: envelope.threadId,
                            cwd: envelope.cwd,
                            codexConfig: nextTurnEffectiveConfig,
                            requireExactExecutionContext: !!turnOverrides.sandbox
                        });

                        const configuredModel = nextTurnEffectiveConfig.model || null;
                        let threadModelState = null;
                        if (!configuredModel) {
                            try {
                                threadModelState = await ensureThreadModelForSession(session, initialThreadId);
                            } catch (threadModelError) {
                                if (!isThreadNotFoundError(threadModelError)) {
                                    throw threadModelError;
                                }
                                clearStaleSessionThreadBinding(session, initialThreadId);
                                initialThreadId = await ensureCodexThreadForSession(session, {
                                    forceNewThread: true,
                                    cwd: envelope.cwd,
                                    codexConfig: nextTurnEffectiveConfig
                                });
                                console.warn('[gateway][codex][thread-model-stale-thread-retry]', JSON.stringify({
                                    sessionId: session.id,
                                    staleThreadId: envelope.threadId || null,
                                    freshThreadId: initialThreadId
                                }));
                                threadModelState = {
                                    threadId: initialThreadId,
                                    model: normalizeModelName(process.env.TERMLINK_CODEX_MODEL)
                                };
                            }
                        }
                        let threadId = threadModelState && isNonEmptyString(threadModelState.threadId)
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
                        const turnInput = await buildTurnInput(
                            text,
                            attachments,
                            turnInteractionState,
                            envelope.cwd || session.cwd
                        );
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
                            if (isThreadNotFoundError(turnStartError)) {
                                clearStaleSessionThreadBinding(session, threadId);
                                try {
                                    threadId = await ensureCodexThreadForSession(session, {
                                        forceNewThread: true,
                                        cwd: envelope.cwd,
                                        codexConfig: nextTurnEffectiveConfig
                                    });
                                } catch (threadStartError) {
                                    await cleanupAttachmentTempFiles(turnInput.tempFilePaths);
                                    throw threadStartError;
                                }
                                turnStartPayload.threadId = threadId;
                                console.warn('[gateway][codex][turn-stale-thread-retry]', JSON.stringify({
                                    sessionId: session.id,
                                    staleThreadId: initialThreadId,
                                    freshThreadId: threadId
                                }));
                                try {
                                    turnStartResponse = await codexService.request('turn/start', turnStartPayload);
                                } catch (retryError) {
                                    await cleanupAttachmentTempFiles(turnInput.tempFilePaths);
                                    throw retryError;
                                }
                            } else {
                                await cleanupAttachmentTempFiles(turnInput.tempFilePaths);
                                throw turnStartError;
                            }
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
                        console.info('[gateway][codex][turn-start]', JSON.stringify({
                            sessionId: session.id,
                            threadId,
                            turnId: turnStartResponse && turnStartResponse.turn
                                ? turnStartResponse.turn.id || null
                                : null,
                            cwd: effectiveCwd || null,
                            model: effectiveModel,
                            reasoningEffort: effectiveReasoningEffort,
                            sandboxMode: nextTurnEffectiveConfig.sandboxMode || null,
                            approvalPolicy: nextTurnEffectiveConfig.approvalPolicy || null,
                            collaborationMode: collaborationMode || null,
                            attachmentCount: attachments.length
                        }));
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
                        if (!await isExistingDirectoryCwd(nextCwd)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_INVALID_CWD_PATH',
                                message: 'Codex cwd must be an existing directory.'
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
                        const { actorSession } = getThreadRouting(codexState.threadId);
                        if (actorSession && actorSession.id !== session.id) {
                            addFollowerSessionToThread(codexState.threadId, session.id);
                            emitCodexState(session, null, actorSession);
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
                        const requestParams = buildCodexRequestParams(method, envelope.params, session);
                        const response = await codexService.request(method, requestParams);
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
                            const readThreadId = response
                                && response.thread
                                && isNonEmptyString(response.thread.id)
                                ? response.thread.id
                                : (requestParams && isNonEmptyString(requestParams.threadId)
                                    ? requestParams.threadId.trim()
                                    : null);
                            const nextTokenUsage = extractTokenUsageSnapshot(response);
                            console.info('[gateway][tokenUsage][thread/read]', JSON.stringify({
                                sessionId: session.id,
                                threadId: readThreadId || codexState.threadId || null,
                                nextTokenUsage
                            }));
                            if (nextTokenUsage !== null) {
                                codexState.tokenUsage = nextTokenUsage;
                                emitCodexState(session);
                            }
                            if (readThreadId) {
                                const { actorSession } = getThreadRouting(readThreadId);
                                if (actorSession && actorSession.id !== session.id) {
                                    addFollowerSessionToThread(readThreadId, session.id);
                                    emitCodexState(session, null, actorSession);
                                }
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
                _ipcActiveConversations.delete(ws);
                _ipcFollowerModes.delete(ws);
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
        if (ipcFeed) { ipcFeed.removeAllListeners(); }
        _ipcActiveConversations.clear();
        _ipcFollowerModes.clear();
        _ipcConversationLastStatus.clear();
        for (const session of sessionManager.sessions.values()) {
            void cleanupAllSessionAttachmentTempFiles(session);
        }
        codexService.stop();
    };
}

module.exports = registerTerminalGateway;
