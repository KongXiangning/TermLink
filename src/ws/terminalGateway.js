const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { verifyWsUpgrade } = require('../auth/basicAuth');
const { isIpAllowed, normalizeIp } = require('../utils/ipCheck');
const { generateAuditTraceId } = require('../utils/auditTrace');
const { resolveConnectionSecurity } = require('../utils/connectionSecurity');
const { getAuditService } = require('../services/auditService');
const { diagnosticLog } = require('../services/diagnosticLog');
const CodexAppServerService = require('../services/codexAppServerService');
const { CodexThreadHub } = require('../services/codexThreadHub');
const { CodexOwnerSurfaceTracker } = require('../services/codexOwnerSurfaceTracker');
const { normalizeCodexConfig } = require('../repositories/sessionStore');
const { summarizeSessionConnections } = require('../services/sessionManager');
const {
    CodexWsSnapshotScheduler,
    MAX_CONTROL_ENVELOPE_BYTES,
    projectConversationActionPayload
} = require('../services/codexWsSnapshotScheduler');
const { CodexHistorySyncService } = require('../services/codexHistorySyncService');
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

function diagnosticKey(value) {
    if (!isNonEmptyString(value)) return null;
    return createHash('sha256').update(value.trim()).digest('hex').slice(0, 16);
}

function diagnosticAttachmentSummary(attachments) {
    const list = Array.isArray(attachments) ? attachments : [];
    return {
        attachmentCount: list.length,
        attachmentTypes: [...new Set(list.map((item) => item && item.type).filter(isNonEmptyString))]
    };
}

function isTerminalSurface(surface) {
    const status = typeof surface?.status === 'string' ? surface.status.toLowerCase() : '';
    return ['completed', 'failed', 'interrupted', 'cancelled', 'canceled'].includes(status);
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

async function resolveTurnInputAttachments(attachments, mediaStore = null) {
    const resolved = [];
    const tempFilePaths = [];
    const normalized = normalizeTurnAttachments(attachments);
    let mediaStoreCount = 0;
    let mediaStoreFailureCount = 0;
    let tempMaterializedCount = 0;
    for (const entry of normalized) {
        if (entry.type === 'localImage' && isNonEmptyString(entry.url)) {
            if (mediaStore && typeof mediaStore.put === 'function') {
                try {
                    const stored = await mediaStore.put({ dataUrl: entry.url });
                    resolved.push({ type: 'localImage', path: stored.filePath });
                    mediaStoreCount++;
                    continue;
                } catch (error) {
                    mediaStoreFailureCount++;
                    diagnosticLog.error('server', 'server.codex.attachment.media_store_failed', error, {
                        type: entry.type
                    });
                    // Fall back to the existing temporary path behavior.
                }
            }
            const tempPath = await materializeLocalImageAttachment(entry.url);
            if (tempPath) {
                resolved.push({
                    type: 'localImage',
                    path: tempPath
                });
                tempFilePaths.push(tempPath);
                tempMaterializedCount++;
                continue;
            }
        }
        resolved.push(entry);
    }
    if (normalized.length > 0 || mediaStoreFailureCount > 0) {
        diagnosticLog.event('server', 'server.codex.attachment.resolved', {
            attachmentCount: normalized.length,
            attachmentTypes: [...new Set(normalized.map((entry) => entry.type).filter(isNonEmptyString))],
            resolvedCount: resolved.length,
            mediaStoreCount,
            mediaStoreFailureCount,
            tempMaterializedCount
        }, mediaStoreFailureCount > 0 ? 'warn' : 'info');
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

async function buildTurnInput(text, attachments, interactionState, cwd, mediaStore = null) {
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
    const resolvedAttachments = await resolveTurnInputAttachments(attachments, mediaStore);
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
    let deletedCount = 0;
    let missingCount = 0;
    let failedCount = 0;
    await Promise.all(filePaths.map(async (filePath) => {
        if (!isNonEmptyString(filePath)) {
            return;
        }
        try {
            await fs.promises.unlink(filePath);
            deletedCount++;
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                missingCount++;
            } else {
                failedCount++;
                console.warn('Failed to clean temporary Codex image file:', filePath, error && error.message ? error.message : error);
            }
        }
    }));
    diagnosticLog.event('server', 'server.codex.attachment.cleanup', {
        requestedCount: filePaths.length,
        deletedCount,
        missingCount,
        failedCount
    }, failedCount > 0 ? 'warn' : 'info');
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
    'permissionProfile/list',
    'skills/list',
    'account/rateLimits/read'
]);

function buildCodexCapabilities() {
    return {
        historyList: true,
        historyResume: true,
        modelConfig: true,
        permissionProfiles: true,
        approvalsReviewer: true,
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
    if (normalizedMethod !== 'skills/list' &&
        normalizedMethod !== 'thread/list' &&
        normalizedMethod !== 'permissionProfile/list') {
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
    if (normalizedMethod === 'item/permissions/requestApproval') {
        return 'permissions';
    }
    if (normalizedMethod === 'item/plan/requestImplementation') {
        return 'plan';
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
    const requestKind = resolveCodexServerRequestKind(method);
    if (requestKind === 'userInput') return 'answers';
    if (requestKind === 'plan') return 'plan';
    return 'decision';
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
    if (requestKind === 'permissions') {
        const reason = isNonEmptyString(params && params.reason) ? params.reason.trim() : '';
        return reason || '';
    }
    if (requestKind === 'plan') {
        const planContent = isNonEmptyString(params && params.planContent) ? params.planContent.trim() : '';
        return planContent || '';
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

function registerTerminalGateway(wss, {
    sessionManager,
    heartbeatMs = 30000,
    privilegeConfig,
    tlsConfig = {},
    ipcFeed,
    ipcSurfaceWaitGraceMs = 5000,
    mediaStore = null,
    registrationManager = null
}) {
    const isElevated = privilegeConfig && privilegeConfig.isElevated;
    const allowedIps = privilegeConfig ? privilegeConfig.allowedIps : [];
    const auditService = isElevated ? getAuditService() : null;
    const codexService = new CodexAppServerService();
    const threadHub = new CodexThreadHub();
    const ownerSurfaceTracker = new CodexOwnerSurfaceTracker();

    // ── IPC feed integration ──────────────────────────────────────────────
    /** @type {Map<import('ws').WebSocket, string>} */
    const _ipcActiveConversations = new Map();
    const _ipcSelectionGenerations = new WeakMap();
    /** @type {Map<import('ws').WebSocket, boolean>} */
    const _ipcFollowerModes = new Map();
    /** @type {Map<string, string>} */
    const _ipcConversationLastStatus = new Map();
    /** @type {Map<string, { generation: number, startedAt: number, surface: object | null, receivedAt: number | null, reason: string }>} */
    const _ipcConversationSubscriptionCycles = new Map();
    /** @type {Map<string, Set<{ finish: (surface: object | null) => void }>>} */
    const _ipcSurfaceWaiters = new Map();
    /** @type {Set<string>} */
    const _followerSendInFlight = new Set();
    /** @type {Map<string, { conversationId: string, status: 'resolving'|'started', authority?: string, turnId?: string | null, successType?: string }>} */
    const _followerRequestLedger = new Map();
    /** @type {Set<string>} */
    const _ownerGoalCompletionInFlight = new Set();
    /** @type {Map<string, { conversationId: string, turnId: string | null, authority: 'ipc' | 'owner', status: string, cycleGeneration: number | null }>} */
    const _authorityLedger = new Map();
    /** @type {Set<string>} */
    const _ownerReadStateBroadcasted = new Set();
    /** @type {Map<string, Set<'created'|'first-turn'|'terminal'>>} */
    const _ownerDiscoveryInvalidationStages = new Map();
    /** @type {Map<string, string[]>} */
    const _followerAttachmentTempFiles = new Map();
    /** @type {Map<string, { sessionId: string, conversationId: string | null, reason: string, draft: object, forkAvailable: boolean }>} */
    const _pendingThreadRecoveries = new Map();
    /** @type {Array<() => void>} */
    const _ipcRequestHandlerDisposers = [];
    const _conversationCatalogFingerprints = new Map();
    const snapshotScheduler = new CodexWsSnapshotScheduler({
        intervalMs: 25,
        isStillActive: (ws, conversationId, selectionGeneration) => (
            _ipcActiveConversations.get(ws) === conversationId &&
            (_ipcSelectionGenerations.get(ws) || 0) === selectionGeneration
        )
    });
    const historySyncService = new CodexHistorySyncService({
        send: (ws, envelope) => {
            if (envelope.type === 'conversation_history_delta') {
                sendWsEnvelope(ws, envelope);
            } else {
                snapshotScheduler.sendControl(ws, envelope);
            }
        }
    });
    let _lastIpcOnline = Boolean(ipcFeed && (
        typeof ipcFeed.isOnline === 'function' ? ipcFeed.isOnline() : ipcFeed.online
    ));

    const _isIpcOnline = () => {
        if (!ipcFeed) return false;
        if (typeof ipcFeed.isOnline === 'function') return ipcFeed.isOnline();
        return Boolean(ipcFeed.online);
    };

    const _getIpcStatus = () => {
        const status = !ipcFeed
            ? {}
            : (typeof ipcFeed.getStatus === 'function'
                ? ipcFeed.getStatus()
                : { online: Boolean(ipcFeed.online), clientId: ipcFeed.clientId });
        return {
            ...status,
            supported: typeof status.supported === 'boolean' ? status.supported : Boolean(ipcFeed),
            online: Boolean(status.online),
            activeSendAllowed: _isIpcActiveSendAllowed(),
            capabilities: {
                ...(status.capabilities || {}),
                historySync: {
                    version: 1,
                    manifestPageSize: 200,
                    deltaMaxItems: 100,
                    deltaMaxBytes: 256 * 1024,
                    syncInactivityTimeoutMs: 30_000
                },
                codexMedia: { version: 1, maxBytes: 25 * 1024 * 1024 }
            }
        };
    };

    const _isIpcActiveSendAllowed = () => {
        if (!ipcFeed) return false;
        if (typeof ipcFeed.isActiveAllowed === 'function') return ipcFeed.isActiveAllowed();
        return Boolean(ipcFeed.allowActiveSend);
    };

    const _isFollowerModeEnabled = (ws) => _ipcFollowerModes.get(ws) === true;

    const _followIpcConversation = (conversationId) => {
        if (typeof ipcFeed?.followConversation !== 'function') return;
        ipcFeed.followConversation(conversationId, 'local');
    };

    const _unfollowIpcConversation = (conversationId) => {
        if (typeof ipcFeed?.unfollowConversation !== 'function') return;
        ipcFeed.unfollowConversation(conversationId, 'local');
    };

    const _activeIpcSubscriberCount = (conversationId) => {
        let count = 0;
        for (const activeConversationId of _ipcActiveConversations.values()) {
            if (activeConversationId === conversationId) count++;
        }
        return count;
    };

    const _finishIpcSurfaceWaiters = (conversationId, surface = null) => {
        const waiters = _ipcSurfaceWaiters.get(conversationId);
        if (!waiters) return;
        _ipcSurfaceWaiters.delete(conversationId);
        for (const waiter of waiters) {
            waiter.finish(surface);
        }
    };

    const _beginIpcSubscriptionCycle = (conversationId, reason) => {
        if (!isNonEmptyString(conversationId)) return null;
        const normalizedConversationId = conversationId.trim();
        const previous = _ipcConversationSubscriptionCycles.get(normalizedConversationId);
        _finishIpcSurfaceWaiters(normalizedConversationId, null);
        const cycle = {
            generation: (previous?.generation || 0) + 1,
            startedAt: Date.now(),
            surface: null,
            receivedAt: null,
            reason: isNonEmptyString(reason) ? reason.trim() : 'unknown'
        };
        _ipcConversationSubscriptionCycles.set(normalizedConversationId, cycle);
        diagnosticLog.event('server', 'server.ipc.subscription_cycle.started', {
            conversationKey: diagnosticKey(normalizedConversationId),
            generation: cycle.generation,
            reason: cycle.reason,
            ipcOnline: _isIpcOnline()
        }, 'info');
        return cycle;
    };

    const _closeIpcSubscriptionCycle = (conversationId, reason) => {
        if (!isNonEmptyString(conversationId)) return;
        const normalizedConversationId = conversationId.trim();
        const cycle = _ipcConversationSubscriptionCycles.get(normalizedConversationId);
        _ipcConversationSubscriptionCycles.delete(normalizedConversationId);
        _finishIpcSurfaceWaiters(normalizedConversationId, null);
        if (cycle) {
            diagnosticLog.event('server', 'server.ipc.subscription_cycle.closed', {
                conversationKey: diagnosticKey(normalizedConversationId),
                generation: cycle.generation,
                reason: isNonEmptyString(reason) ? reason.trim() : 'unknown',
                hadCurrentSurface: Boolean(cycle.surface)
            }, 'info');
        }
    };

    const _releaseActiveIpcConversation = (ws) => {
        const conversationId = _ipcActiveConversations.get(ws);
        snapshotScheduler.dispose(ws);
        _ipcSelectionGenerations.delete(ws);
        if (!conversationId) return;
        _ipcActiveConversations.delete(ws);
        _unfollowIpcConversation(conversationId);
        if (_activeIpcSubscriberCount(conversationId) === 0) {
            _closeIpcSubscriptionCycle(conversationId, 'last-subscriber-left');
        }
    };

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

    const _getCurrentCycleIpcSnapshot = (conversationId) => {
        if (!isNonEmptyString(conversationId)) return null;
        return _ipcConversationSubscriptionCycles.get(conversationId.trim())?.surface || null;
    };

    const _recordCurrentCycleIpcSnapshot = (conversationId, surface) => {
        if (!isNonEmptyString(conversationId) || !surface || typeof surface !== 'object') return false;
        const normalizedConversationId = conversationId.trim();
        const cycle = _ipcConversationSubscriptionCycles.get(normalizedConversationId);
        if (!cycle || _activeIpcSubscriberCount(normalizedConversationId) === 0) return false;
        if (surface.desynced === true) {
            diagnosticLog.event('server', 'server.ipc.subscription_cycle.desynced_surface_ignored', {
                conversationKey: diagnosticKey(normalizedConversationId),
                generation: cycle.generation,
                status: isNonEmptyString(surface.status) ? surface.status.trim() : 'unknown'
            }, 'warn');
            return false;
        }
        cycle.surface = { ...surface, desynced: false };
        cycle.receivedAt = Date.now();
        _finishIpcSurfaceWaiters(normalizedConversationId, cycle.surface);
        diagnosticLog.event('server', 'server.ipc.subscription_cycle.surface_received', {
            conversationKey: diagnosticKey(normalizedConversationId),
            generation: cycle.generation,
            waitMs: Math.max(0, cycle.receivedAt - cycle.startedAt),
            status: isNonEmptyString(surface.status) ? surface.status.trim() : 'unknown'
        }, 'info');
        return true;
    };

    const _waitForCurrentCycleIpcSnapshot = (ws, conversationId) => {
        const normalizedConversationId = isNonEmptyString(conversationId) ? conversationId.trim() : '';
        const cycle = normalizedConversationId
            ? _ipcConversationSubscriptionCycles.get(normalizedConversationId)
            : null;
        if (!cycle) return Promise.resolve(null);
        if (cycle.surface) return Promise.resolve(cycle.surface);
        const remainingMs = Math.max(0, ipcSurfaceWaitGraceMs - (Date.now() - cycle.startedAt));
        if (remainingMs === 0 || !_isIpcOnline()) return Promise.resolve(null);

        return new Promise((resolve) => {
            let finished = false;
            const waiter = {
                finish(surface) {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timer);
                    if (ws && typeof ws.removeListener === 'function') {
                        ws.removeListener('close', handleClose);
                    }
                    const currentWaiters = _ipcSurfaceWaiters.get(normalizedConversationId);
                    if (currentWaiters) {
                        currentWaiters.delete(waiter);
                        if (currentWaiters.size === 0) {
                            _ipcSurfaceWaiters.delete(normalizedConversationId);
                        }
                    }
                    resolve(surface || null);
                }
            };
            const handleClose = () => waiter.finish(null);
            const timer = setTimeout(() => waiter.finish(null), remainingMs);
            let waiters = _ipcSurfaceWaiters.get(normalizedConversationId);
            if (!waiters) {
                waiters = new Set();
                _ipcSurfaceWaiters.set(normalizedConversationId, waiters);
            }
            waiters.add(waiter);
            if (ws && typeof ws.once === 'function') {
                ws.once('close', handleClose);
            }
        });
    };

    const _getLatestOwnerSnapshot = (conversationId) => {
        if (!isNonEmptyString(conversationId)) return null;
        const event = ownerSurfaceTracker.peekSnapshot(conversationId);
        return event && event.surface ? event.surface : null;
    };

    const _getLatestConversationSnapshot = (conversationId) => {
        const ownerSurface = _getLatestOwnerSnapshot(conversationId);
        if (ownerSurface) return ownerSurface;
        return _getCurrentCycleIpcSnapshot(conversationId);
    };

    const _isOwnerSurfaceSafelyReleasable = (surface) => {
        if (!surface || typeof surface !== 'object') return false;
        const status = isNonEmptyString(surface.status) ? surface.status.trim().toLowerCase() : '';
        const terminal = status === 'completed' ||
            status === 'failed' ||
            status === 'interrupted' ||
            status === 'cancelled' ||
            status === 'canceled';
        return terminal &&
            isNonEmptyString(surface.latestTurnId) &&
            !surface.pendingApproval &&
            !surface.pendingPlanAction &&
            !surface.pendingUserInputAction &&
            !surface.pendingGoalAction &&
            !surface.activeGoal;
    };

    const _emitConversationActionRequired = (ws, conversationId, surface) => {
        if (!surface || typeof surface !== 'object') return;
        const sendAction = (actionType, pendingAction) => {
            const payload = projectConversationActionPayload(actionType, pendingAction);
            const envelope = {
                type: 'conversation_action_required',
                conversationId,
                actionType,
                payload
            };
            if (Buffer.byteLength(JSON.stringify(envelope), 'utf8') <= MAX_CONTROL_ENVELOPE_BYTES) {
                snapshotScheduler.sendControl(ws, envelope);
                return;
            }
            snapshotScheduler.sendControl(ws, {
                type: 'conversation_action_required',
                conversationId,
                actionType,
                payload: {
                    requestId: payload.requestId,
                    rawRequestId: payload.rawRequestId,
                    requestMethod: payload.requestMethod || payload.method,
                    requestKind: payload.requestKind,
                    payloadState: 'oversize',
                    canSubmit: false,
                    errorCode: 'action_payload_too_large'
                }
            });
        };
        if (surface.pendingApproval) {
            sendAction('approval', surface.pendingApproval);
        }
        if (surface.pendingPlanAction) {
            sendAction('plan', surface.pendingPlanAction);
        }
        if (surface.pendingUserInputAction) {
            sendAction('user_input', surface.pendingUserInputAction);
        }
        if (surface.pendingGoalAction) {
            sendAction('goal', surface.pendingGoalAction);
        }
    };

    const _pushConversationSurfaceSnapshot = (conversationId, surface) => {
        const authoritativeSurface = surface?.desynced !== true;
        const status = isNonEmptyString(surface?.status) ? surface.status : 'unknown';
        const previousStatus = _ipcConversationLastStatus.get(conversationId);
        if (authoritativeSurface && status) {
            _ipcConversationLastStatus.set(conversationId, status);
            const ledger = _authorityLedger.get(conversationId);
            if (ledger && (status === 'completed' || status === 'interrupted' || status === 'failed')) {
                _recordAuthority(conversationId, ledger.authority, 'terminal', surface?.latestTurnId || ledger.turnId);
                const tempFilePaths = _followerAttachmentTempFiles.get(conversationId);
                if (tempFilePaths) {
                    _followerAttachmentTempFiles.delete(conversationId);
                    void cleanupAttachmentTempFiles(tempFilePaths);
                }
            }
        }

        let sentCount = 0;
        for (const client of wss.clients) {
            if (client.readyState !== 1) continue;
            const activeConv = _ipcActiveConversations.get(client);
            if (activeConv !== conversationId) continue;

            if (authoritativeSurface && previousStatus && previousStatus !== status) {
                snapshotScheduler.sendControl(client, {
                    type: 'conversation_status_changed',
                    conversationId,
                    status,
                    previousStatus
                });
            }
            if (authoritativeSurface) {
                _emitConversationActionRequired(client, conversationId, surface);
            }
            snapshotScheduler.offer(
                client,
                conversationId,
                { type: 'conversation_surface_snapshot', conversationId, snapshot: surface },
                {
                    priority: isTerminalSurface(surface) ? 'terminal' : 'normal',
                    selectionGeneration: _ipcSelectionGenerations.get(client) || 0
                }
            );
            sentCount++;
        }
        console.warn('[gateway][ipc][surface-snapshot-pushed]', JSON.stringify({
            conversationId,
            status,
            previousStatus: previousStatus || null,
            statusChanged: Boolean(authoritativeSurface && previousStatus && previousStatus !== status),
            authoritativeSurface,
            sentToSubscribers: sentCount
        }));
        diagnosticLog.event('server', 'server.ipc.surface.delivery', {
            conversationKey: diagnosticKey(conversationId),
            status,
            previousStatus: previousStatus || null,
            authoritativeSurface,
            subscriberCount: sentCount,
            itemCount: Array.isArray(surface?.items) ? surface.items.length : 0,
            revision: surface?.revision,
            sourceEpoch: surface?.sourceEpoch,
            ownerKind: surface?.ownerKind || null
        }, sentCount === 0 ? 'warn' : 'info');
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
            const isOnline = status?.online === true;
            if (isOnline && !_lastIpcOnline) {
                const activeConversationIds = new Set(_ipcActiveConversations.values());
                for (const conversationId of activeConversationIds) {
                    _beginIpcSubscriptionCycle(conversationId, 'ipc-reconnected');
                }
            }
            _lastIpcOnline = isOnline;
            let sentCount = 0;
            for (const client of wss.clients) {
                if (client.readyState === 1) { // WebSocket.OPEN
                    sendWsEnvelope(client, { type: 'codex_ipc_status', status: _getIpcStatus() });
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
            historySyncService.registerBaseline(
                conversationId,
                'ipc_surface',
                { turns: [{ id: surface.latestTurnId || 'surface', status: surface.status, items: Array.isArray(surface.items) ? surface.items : [] }] },
                { complete: surface.historyBaselineComplete === true, sourceEpoch: surface.sourceEpoch }
            );
            const currentCycleSurface = _recordCurrentCycleIpcSnapshot(conversationId, surface);
            console.warn('[gateway][ipc][snapshot-push]', JSON.stringify({
                conversationId,
                status: surface.status || 'unknown',
                itemCount: Array.isArray(surface.items) ? surface.items.length : 0,
                hasActiveGoal: Boolean(surface.activeGoal),
                hasPendingApproval: Boolean(surface.pendingApproval),
                hasPendingPlanAction: Boolean(surface.pendingPlanAction),
                currentCycleSurface,
                ignoredForAndroidByOwner: ownerSurfaceTracker.hasConversation(conversationId)
            }));
            if (!ownerSurfaceTracker.hasConversation(conversationId)) {
                _pushConversationSurfaceSnapshot(
                    conversationId,
                    currentCycleSurface ? _getCurrentCycleIpcSnapshot(conversationId) : { ...surface, desynced: true }
                );
            }
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
        _pushConversationSurfaceSnapshot(event.conversationId, event.surface);
        diagnosticLog.event('server', 'server.codex.owner.surface_broadcast', {
            conversationKey: diagnosticKey(event.conversationId),
            status: event.surface.status || 'unknown',
            turnKey: diagnosticKey(event.surface.latestTurnId),
            itemCount: Array.isArray(event.surface.items) ? event.surface.items.length : 0,
            ipcOnline: _isIpcOnline()
        });
        historySyncService.registerBaseline(
            event.conversationId,
            'ipc_surface',
            { turns: [{ id: event.surface.latestTurnId || 'owner-surface', status: event.surface.status, items: Array.isArray(event.surface.items) ? event.surface.items : [] }] },
            { complete: event.surface.historyBaselineComplete === true, sourceEpoch: event.surface.sourceEpoch }
        );
        if (ipcFeed && _isIpcOnline() && typeof ipcFeed.sendBroadcast === 'function') {
            try {
                ipcFeed.sendBroadcast('thread-stream-state-changed', event.payload);
                if (!_ownerReadStateBroadcasted.has(event.conversationId)) {
                    ipcFeed.sendBroadcast('thread-read-state-changed', {
                        conversationId: event.conversationId,
                        hostId: event.payload.hostId,
                        hasUnreadTurn: true
                    });
                    _ownerReadStateBroadcasted.add(event.conversationId);
                }

                const hasTurn = isNonEmptyString(event.surface.latestTurnId);
                const invalidationStage = !hasTurn
                    ? 'created'
                    : (isTerminalSurface(event.surface) ? 'terminal' : 'first-turn');
                const invalidatedStages = _ownerDiscoveryInvalidationStages.get(event.conversationId) || new Set();
                if (!invalidatedStages.has(invalidationStage)) {
                    ipcFeed.sendBroadcast('query-cache-invalidate', {
                        queryKey: ['recent-conversations']
                    });
                    ipcFeed.sendBroadcast('query-cache-invalidate', {
                        queryKey: ['recent-conversations-meta']
                    });
                    invalidatedStages.add(invalidationStage);
                    _ownerDiscoveryInvalidationStages.set(event.conversationId, invalidatedStages);
                    diagnosticLog.event('server', 'server.codex.owner.discovery_invalidation', {
                        conversationKey: diagnosticKey(event.conversationId),
                        stage: invalidationStage,
                        status: event.surface.status || 'unknown',
                        turnKey: diagnosticKey(event.surface.latestTurnId)
                    });
                }
            } catch (error) {
                console.warn('[gateway][codex][owner-surface-broadcast-failed]', error && error.message ? error.message : String(error));
                diagnosticLog.error('server', 'server.codex.owner.surface_broadcast_failed', error, {
                    conversationKey: diagnosticKey(event.conversationId),
                    status: event.surface.status || 'unknown'
                });
            }
        }
        _broadcastConversationsToAll(_buildConversations());
    });

    const _buildConversations = () => {
        const snapshotMap = new Map();
        if (typeof ipcFeed?.getRecentSnapshots === 'function') {
            for (const s of ipcFeed.getRecentSnapshots()) {
                snapshotMap.set(s.conversationId, s);
            }
        }
        for (const s of ownerSurfaceTracker.getRecentSnapshots()) {
            snapshotMap.set(s.conversationId, s);
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
        const nextFingerprints = new Map(conversations.map((conversation) => [
            conversation.conversationId,
            JSON.stringify({
                conversationId: conversation.conversationId,
                status: conversation.status,
                title: conversation.title,
                cwd: conversation.cwd,
                ownerKind: conversation.ownerKind,
                hasActiveGoal: conversation.hasActiveGoal,
                hasPendingApproval: conversation.hasPendingApproval,
                hasPendingPlanAction: conversation.hasPendingPlanAction,
                hasPendingUserInputAction: conversation.hasPendingUserInputAction
            })
        ]));
        const changed = nextFingerprints.size !== _conversationCatalogFingerprints.size ||
            Array.from(nextFingerprints.entries()).some(([id, fingerprint]) => _conversationCatalogFingerprints.get(id) !== fingerprint);
        if (!changed) return 0;
        _conversationCatalogFingerprints.clear();
        for (const [id, fingerprint] of nextFingerprints) _conversationCatalogFingerprints.set(id, fingerprint);
        let sent = 0;
        for (const client of wss.clients) {
            if (client.readyState === 1) {
                sendWsEnvelope(client, { type: 'codex_ipc_conversations', conversations });
                sent++;
            }
        }
        diagnosticLog.event('server', 'server.ipc.catalog.broadcast', {
            conversationCount: conversations.length,
            conversationKeys: conversations.slice(0, 20).map((item) => diagnosticKey(item.conversationId)),
            sentClientCount: sent,
            runningCount: conversations.filter((item) => item.status === 'running').length,
            ownerCount: conversations.filter((item) => item.ownerKind).length
        }, sent === 0 ? 'warn' : 'info');
        return sent;
    };

    const _broadcastIpcStatus = (ws) => {
        sendWsEnvelope(ws, {
            type: 'codex_ipc_status',
            status: _getIpcStatus()
        });
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
        const previousActiveConversationId = _ipcActiveConversations.get(ws) || null;
        if (previousActiveConversationId !== normalizedConversationId) {
            historySyncService.cancel(ws);
            const nextSelectionGeneration = (_ipcSelectionGenerations.get(ws) || 0) + 1;
            _ipcSelectionGenerations.set(ws, nextSelectionGeneration);
            if (previousActiveConversationId) {
                _ipcActiveConversations.delete(ws);
                snapshotScheduler.cancel(ws, previousActiveConversationId);
                _unfollowIpcConversation(previousActiveConversationId);
                if (_activeIpcSubscriberCount(previousActiveConversationId) === 0) {
                    _closeIpcSubscriptionCycle(previousActiveConversationId, 'conversation-changed');
                }
            }
            const enteringExistingSharedCycle = _activeIpcSubscriberCount(normalizedConversationId) > 0;
            const ownerSurface = _getLatestOwnerSnapshot(normalizedConversationId);
            const ownerAuthority = _authorityLedger.get(normalizedConversationId);
            const isFreshlyCreatedOwner = ownerAuthority?.authority === 'owner' &&
                ownerAuthority.status === 'created';
            if (!isFreshlyCreatedOwner && _isOwnerSurfaceSafelyReleasable(ownerSurface)) {
                ownerSurfaceTracker.releaseConversation(normalizedConversationId);
                _authorityLedger.delete(normalizedConversationId);
                diagnosticLog.event('server', 'server.codex.owner.released', {
                    conversationIdPresent: true,
                    reason: previousActiveConversationId ? 'conversation-reentered' : 'websocket-first-open',
                    status: ownerSurface.status
                }, 'info');
            }
            _ipcActiveConversations.set(ws, normalizedConversationId);
            if (isFreshlyCreatedOwner) {
                _recordAuthority(normalizedConversationId, 'owner', 'idle');
            }
            if (!enteringExistingSharedCycle) {
                _beginIpcSubscriptionCycle(
                    normalizedConversationId,
                    previousActiveConversationId ? 'conversation-changed' : 'websocket-first-open'
                );
            }
            _followIpcConversation(normalizedConversationId);
            if (codexService && typeof codexService.ensureStarted === 'function') {
                void codexService.ensureStarted().catch((error) => {
                    diagnosticLog.error('server', 'server.codex.runtime.prewarm_failed', error, {
                        conversationIdPresent: true,
                        sessionIdPresent: Boolean(session?.id)
                    });
                });
            }
        }
        console.warn('[gateway][ipc][set-active-conversation]', JSON.stringify({
            conversationId: normalizedConversationId,
            previousActiveConversationId,
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

        // Owner/current-cycle snapshots are authoritative. Older IPC cache is
        // display-only until this subscription cycle receives a fresh surface.
        const authoritative = _getLatestConversationSnapshot(normalizedConversationId);
        const cached = authoritative || _getLatestIpcSnapshot(normalizedConversationId);
        const latest = authoritative || (cached ? { ...cached, desynced: true } : null);
        if (latest) {
            snapshotScheduler.offer(
                ws,
                normalizedConversationId,
                { type: 'conversation_surface_snapshot', conversationId: normalizedConversationId, snapshot: latest },
                { priority: 'terminal', selectionGeneration: _ipcSelectionGenerations.get(ws) || 0 }
            );
            if (latest.desynced !== true) {
                _emitConversationActionRequired(ws, normalizedConversationId, latest);
            }
        }
        _sendFollowerMode(ws);
    };
    const _getActiveConversationId = (ws) => _ipcActiveConversations.get(ws) || null;

    const _shouldUseOwnerRuntime = (conversationId) => ownerSurfaceTracker.hasConversation(conversationId);

    const _emitFollowerRouteState = (ws, clientRequestId, conversationId, state, details = {}) => {
        if (!isNonEmptyString(clientRequestId)) return;
        sendWsEnvelope(ws, {
            type: 'follower_route_state',
            clientRequestId: clientRequestId.trim(),
            conversationId,
            state,
            phase: state,
            ...details
        });
    };

    const _followerRequestKey = (ws, clientRequestId) => (
        `${isNonEmptyString(ws?.sessionId) ? ws.sessionId.trim() : 'anonymous'}:${clientRequestId}`
    );

    const _recordFollowerRequestStarted = (
        requestKey,
        conversationId,
        authority,
        turnId,
        successType
    ) => {
        if (!isNonEmptyString(requestKey)) return;
        _followerRequestLedger.set(requestKey, {
            conversationId,
            status: 'started',
            authority,
            turnId: isNonEmptyString(turnId) ? turnId.trim() : null,
            successType
        });
        while (_followerRequestLedger.size > 512) {
            const oldestKey = _followerRequestLedger.keys().next().value;
            if (!oldestKey) break;
            _followerRequestLedger.delete(oldestKey);
        }
    };

    const _sendThreadRecoveryRequired = (ws, {
        conversationId,
        reason,
        draft,
        forkAvailable = false,
        clientRequestId = null
    }) => {
        const recoveryId = randomUUID();
        const normalizedConversationId = isNonEmptyString(conversationId)
            ? conversationId.trim()
            : null;
        _pendingThreadRecoveries.set(recoveryId, {
            ws,
            sessionId: ws.sessionId,
            conversationId: normalizedConversationId,
            reason,
            draft: draft && typeof draft === 'object' ? structuredClone(draft) : {},
            forkAvailable: Boolean(forkAvailable),
            resolving: false
        });
        _emitFollowerRouteState(
            ws,
            clientRequestId,
            normalizedConversationId,
            'recovery_required',
            { recoveryId, reason }
        );
        sendWsEnvelope(ws, {
            type: 'codex_thread_recovery_required',
            recoveryId,
            conversationId: normalizedConversationId,
            reason,
            forkAvailable: Boolean(forkAvailable),
            actions: [
                'retry',
                ...(forkAvailable ? ['fork'] : []),
                'new',
                'cancel'
            ],
            draft
        });
        return recoveryId;
    };

    const _recordAuthority = (conversationId, authority, status, turnId = null) => {
        const cycle = _ipcConversationSubscriptionCycles.get(conversationId);
        const record = {
            conversationId,
            turnId: isNonEmptyString(turnId) ? turnId.trim() : null,
            authority,
            status,
            cycleGeneration: cycle ? cycle.generation : null
        };
        _authorityLedger.set(conversationId, record);
        return record;
    };

    const _getAuthority = (conversationId) => {
        const record = _authorityLedger.get(conversationId);
        if (record && (record.status === 'running' || record.status === 'waiting')) {
            return record.authority;
        }
        return _shouldUseOwnerRuntime(conversationId) ? 'owner' : 'ipc';
    };

    const _extractIpcConversationId = (params) => {
        if (!params || typeof params !== 'object') return null;
        if (isNonEmptyString(params.conversationId)) return params.conversationId.trim();
        if (isNonEmptyString(params.threadId)) return params.threadId.trim();
        if (params.thread && typeof params.thread === 'object' && isNonEmptyString(params.thread.id)) {
            return params.thread.id.trim();
        }
        return null;
    };

    const _buildOwnerTurnParamsFromFollower = (params) => {
        const source = params && typeof params === 'object' ? params : {};
        const sandboxPolicyType = source.sandboxPolicy && typeof source.sandboxPolicy === 'object'
            ? source.sandboxPolicy.type
            : null;
        return {
            ...source,
            ...(isNonEmptyString(source.effort) && !isNonEmptyString(source.reasoningEffort)
                ? { reasoningEffort: source.effort }
                : {}),
            ...(isNonEmptyString(source.approvalPolicy) && !isNonEmptyString(source.askForApproval)
                ? { askForApproval: source.approvalPolicy }
                : {}),
            ...(isNonEmptyString(sandboxPolicyType) && !isNonEmptyString(source.sandbox)
                ? { sandbox: sandboxPolicyType }
                : {})
        };
    };

    const _handleOwnerIpcRequest = async (method, request) => {
        const params = request && request.params && typeof request.params === 'object'
            ? request.params
            : {};
        const conversationId = _extractIpcConversationId(params);
        if (!conversationId || !_shouldUseOwnerRuntime(conversationId)) {
            throw new Error('no-owner-conversation');
        }

        if (method === 'thread/read') {
            return codexService.request('thread/read', {
                threadId: conversationId,
                includeTurns: params.includeTurns !== false
            });
        }

        if (method === 'thread-follower-start-turn') {
            const turnStartParams = _buildOwnerTurnParamsFromFollower(params.turnStartParams);
            diagnosticLog.event('server', 'server.ipc.owner_turn.config_resolved', {
                conversationKey: diagnosticKey(conversationId),
                authority: 'owner',
                ...diagnosticTurnStartParamFields(turnStartParams)
            });
            const result = await codexService.request('turn/start', {
                threadId: conversationId,
                ...turnStartParams
            });
            ownerSurfaceTracker.adoptTurnStartResult(
                conversationId,
                result,
                turnStartParams.clientUserMessageId,
                turnStartParams
            );
            const turnId = result?.turn?.id || result?.turn?.turnId || null;
            _recordAuthority(conversationId, 'owner', 'running', turnId);
            return result;
        }

        if (method === 'thread-follower-interrupt-turn') {
            const ledger = _authorityLedger.get(conversationId);
            const snapshot = _getLatestOwnerSnapshot(conversationId);
            const turnId = isNonEmptyString(params.turnId)
                ? params.turnId.trim()
                : (ledger?.turnId || snapshot?.latestTurnId || null);
            if (!isNonEmptyString(turnId)) {
                throw new Error('Owner conversation has no active turn.');
            }
            const result = await codexService.request('turn/interrupt', {
                threadId: conversationId,
                turnId
            });
            _recordAuthority(conversationId, 'owner', 'interrupting', turnId);
            return result;
        }

        if (
            method === 'thread-follower-command-approval-decision' ||
            method === 'thread-follower-file-approval-decision' ||
            method === 'thread-follower-permissions-request-approval-response'
        ) {
            const snapshot = _getLatestOwnerSnapshot(conversationId);
            const requestKind = method.includes('permissions')
                ? 'permissions'
                : (method.includes('file-approval') ? 'file' : 'command');
            const approval = resolvePendingApprovalResponseTarget(
                snapshot,
                params.requestId,
                requestKind
            );
            if (!approval) {
                throw new Error('No matching owner approval request was found.');
            }
            codexService.respondToServerRequest(approval.rawRequestId, {
                result: buildOwnerApprovalResult(
                    approval,
                    params.decision,
                    params.execpolicyAmendment
                )
            });
            ownerSurfaceTracker.markRequestResponseSent(approval.rawRequestId, conversationId);
            return { acknowledged: true };
        }

        if (method === 'thread-follower-submit-user-input') {
            if (!isRawRequestId(params.requestId)) {
                throw new Error('Owner user-input request id is required.');
            }
            codexService.respondToServerRequest(params.requestId, {
                result: params.response && typeof params.response === 'object'
                    ? params.response
                    : {}
            });
            ownerSurfaceTracker.markRequestResponseSent(params.requestId, conversationId);
            return { acknowledged: true };
        }

        if (method === 'thread-follower-update-thread-settings') {
            const threadSettings = params.threadSettings && typeof params.threadSettings === 'object'
                ? params.threadSettings
                : {};
            const result = await codexService.request('thread/settings/update', {
                threadId: conversationId,
                ...threadSettings
            });
            ownerSurfaceTracker.applyThreadSettingsUpdate(conversationId, threadSettings);
            return result;
        }

        if (method === 'thread-follower-compact-thread') {
            return codexService.request('thread/compact/start', {
                threadId: conversationId
            });
        }

        if (method === 'thread-follower-steer-turn') {
            const ledger = _authorityLedger.get(conversationId);
            const expectedTurnId = isNonEmptyString(params.expectedTurnId)
                ? params.expectedTurnId.trim()
                : (isNonEmptyString(params.turnId) ? params.turnId.trim() : ledger?.turnId);
            if (!isNonEmptyString(expectedTurnId)) {
                throw new Error('Owner steer requires the active turn id.');
            }
            return codexService.request('turn/steer', {
                threadId: conversationId,
                expectedTurnId,
                input: Array.isArray(params.input) ? params.input : []
            });
        }

        throw new Error(`Unsupported owner IPC method: ${method}`);
    };

    if (typeof ipcFeed?.addRequestHandler === 'function') {
        const ownerRequestMethods = [
            'thread/read',
            'thread-follower-start-turn',
            'thread-follower-interrupt-turn',
            'thread-follower-command-approval-decision',
            'thread-follower-file-approval-decision',
            'thread-follower-permissions-request-approval-response',
            'thread-follower-submit-user-input',
            'thread-follower-update-thread-settings',
            'thread-follower-compact-thread',
            'thread-follower-steer-turn'
        ];
        for (const method of ownerRequestMethods) {
            _ipcRequestHandlerDisposers.push(ipcFeed.addRequestHandler(
                method,
                (params) => {
                    const conversationId = _extractIpcConversationId(params);
                    return Boolean(
                        _isIpcActiveSendAllowed() &&
                        conversationId &&
                        _shouldUseOwnerRuntime(conversationId)
                    );
                },
                (request) => _handleOwnerIpcRequest(method, request)
            ));
        }
    }

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
            seedSurface: seedSurface || _getLatestIpcSnapshot(conversationId) || { conversationId },
            resumeResult
        });
        return resumedThreadId;
    };

    const _startOwnerTurn = async (ws, conversationId, input, latestSnapshot, options = {}) => {
        try {
            const threadId = await _ensureOwnerConversation(conversationId, latestSnapshot);
            if (threadId !== conversationId) {
                const session = getSessionById(sessionManager, ws.sessionId);
                if (session) {
                    _handleSetActiveConversation(ws, session, threadId);
                }
            }
            const turnStartParams = buildFollowerTurnStartParams(input.trim(), latestSnapshot || {}, {
                ...options,
                transport: 'app-server'
            });
            diagnosticLog.event('server', 'server.ipc.owner_turn.config_resolved', {
                conversationKey: diagnosticKey(threadId),
                clientRequestKey: diagnosticKey(options.clientRequestId),
                authority: 'owner',
                ...diagnosticTurnStartParamFields(turnStartParams)
            });
            const result = await codexService.request('turn/start', {
                threadId,
                ...turnStartParams
            });
            if (isNonEmptyString(options.responseRequestId)) {
                ownerSurfaceTracker.markRequestResponseSent(options.responseRequestId, threadId);
            }
            if (options.awaitOwnerSnapshot !== true) {
                ownerSurfaceTracker.adoptTurnStartResult(
                    threadId,
                    result,
                    turnStartParams.clientUserMessageId,
                    turnStartParams
                );
            }
            const turnId = result?.turn?.id || result?.turn?.turnId || null;
            _recordAuthority(threadId, 'owner', 'running', turnId);
            diagnosticLog.event('server', 'server.ipc.follower_send.acknowledged', {
                conversationKey: diagnosticKey(threadId),
                clientRequestKey: diagnosticKey(options.clientRequestId),
                turnKey: diagnosticKey(turnId),
                authority: 'owner',
                routeStage: _shouldUseOwnerRuntime(conversationId) ? 'sticky-owner' : 'owner-resume',
                ...diagnosticAttachmentSummary(options.attachments)
            });
            _recordFollowerRequestStarted(
                options.requestKey,
                threadId,
                'owner',
                turnId,
                options.successType || 'follower_message_sent'
            );
            _emitFollowerRouteState(ws, options.clientRequestId, threadId, 'turn_started', {
                authority: 'owner',
                turnId
            });
            sendWsEnvelope(ws, {
                type: options.successType || 'follower_message_sent',
                conversationId: threadId,
                clientRequestId: options.clientRequestId,
                turnId,
                acknowledged: true
            });
            return { threadId, turnId, result };
        } catch (error) {
            if (isThreadNotFoundError(error)) {
                diagnosticLog.error('server', 'server.ipc.follower_send.failed', error, {
                    conversationKey: diagnosticKey(conversationId),
                    clientRequestKey: diagnosticKey(options.clientRequestId),
                    authority: 'owner',
                    routeStage: 'owner-thread-recovery',
                    ...diagnosticAttachmentSummary(options.attachments)
                });
                _sendThreadRecoveryRequired(ws, {
                    conversationId,
                    reason: 'thread_not_found',
                    clientRequestId: options.clientRequestId,
                    forkAvailable: false,
                    draft: {
                        transport: 'follower',
                        clientRequestId: options.clientRequestId,
                        input,
                        options: {
                            attachments: options.attachments,
                            interactionState: options.interactionState,
                            collaborationMode: options.collaborationMode,
                            turnConfig: options.turnConfig
                        }
                    }
                });
                return null;
            }
            diagnosticLog.error('server', 'server.ipc.follower_send.failed', error, {
                conversationKey: diagnosticKey(conversationId),
                clientRequestKey: diagnosticKey(options.clientRequestId),
                authority: 'owner',
                routeStage: 'owner-turn-start',
                ...diagnosticAttachmentSummary(options.attachments)
            });
            _emitFollowerRouteState(ws, options.clientRequestId, conversationId, 'failed', {
                authority: 'owner',
                detail: error && error.message ? error.message : String(error)
            });
            sendWsEnvelope(ws, {
                type: 'error',
                message: options.failureMessage || 'Failed to send owner message',
                detail: error && error.message ? error.message : String(error)
            });
            return null;
        }
    };

    const _startOwnerGoal = async (ws, conversationId, objective, latestSnapshot, options = {}) => {
        try {
            const threadId = await _ensureOwnerConversation(conversationId, latestSnapshot);
            if (threadId !== conversationId) {
                const session = getSessionById(sessionManager, ws.sessionId);
                if (session) {
                    _handleSetActiveConversation(ws, session, threadId);
                }
            }
            await codexService.request('thread/goal/set', {
                threadId,
                objective: objective.trim(),
                status: 'active'
            });

            const turnStartParams = buildFollowerTurnStartParams(objective.trim(), latestSnapshot || {}, {
                transport: 'app-server'
            });
            const result = await codexService.request('turn/start', {
                threadId,
                ...turnStartParams
            });
            ownerSurfaceTracker.adoptTurnStartResult(
                threadId,
                result,
                turnStartParams.clientUserMessageId,
                turnStartParams
            );
            const turnId = result?.turn?.id || result?.turn?.turnId || null;
            _recordAuthority(threadId, 'owner', 'running', turnId);
            _recordFollowerRequestStarted(
                options.requestKey,
                threadId,
                'owner',
                turnId,
                options.successType || 'follower_goal_sent'
            );
            _emitFollowerRouteState(ws, options.clientRequestId, threadId, 'turn_started', {
                authority: 'owner',
                turnId
            });
            sendWsEnvelope(ws, {
                type: options.successType || 'follower_goal_sent',
                conversationId: threadId,
                clientRequestId: options.clientRequestId,
                turnId,
                acknowledged: true
            });
        } catch (error) {
            _emitFollowerRouteState(ws, options.clientRequestId, conversationId, 'failed', {
                authority: 'owner',
                detail: error && error.message ? error.message : String(error)
            });
            sendWsEnvelope(ws, {
                type: 'error',
                message: options.failureMessage || 'Failed to start owner goal',
                detail: error && error.message ? error.message : String(error)
            });
        }
    };

    const _startOwnerMessageOrGoal = async (ws, conversationId, input, latestSnapshot, options) => {
        if (isNonEmptyString(options.ownerGoalObjective)) {
            await _startOwnerGoal(ws, conversationId, options.ownerGoalObjective, latestSnapshot, options);
            return;
        }
        await _startOwnerTurn(ws, conversationId, input, latestSnapshot, options);
    };

    const _completeOwnerGoalAfterTurn = async (threadId, turn) => {
        if (!isNonEmptyString(threadId) || _ownerGoalCompletionInFlight.has(threadId)) return;
        const turnStatus = isNonEmptyString(turn && turn.status) ? turn.status.trim().toLowerCase() : '';
        if (turnStatus === 'failed' || turnStatus === 'interrupted' || turnStatus === 'cancelled' || turnStatus === 'canceled') {
            return;
        }
        const snapshot = _getLatestOwnerSnapshot(threadId);
        const activeGoal = snapshot && snapshot.activeGoal;
        if (!activeGoal || !isNonEmptyString(activeGoal.objective)) return;

        _ownerGoalCompletionInFlight.add(threadId);
        try {
            const completedGoal = {
                ...(activeGoal.raw && typeof activeGoal.raw === 'object' ? activeGoal.raw : {}),
                threadId,
                objective: activeGoal.objective.trim(),
                status: 'complete',
                updatedAt: Math.floor(Date.now() / 1000)
            };
            await codexService.request('thread/goal/set', completedGoal);
        } catch (error) {
            console.warn('[gateway][codex][owner-goal-complete-failed]', error && error.message ? error.message : String(error));
        } finally {
            _ownerGoalCompletionInFlight.delete(threadId);
        }
    };

    const _handleFollowerSendMessage = async (ws, conversationId, input, options = {}) => {
        const clientRequestId = isNonEmptyString(options.clientRequestId)
            ? options.clientRequestId.trim()
            : randomUUID();
        options = { ...options, clientRequestId };
        const normalizedInput = typeof input === 'string' ? input.trim() : '';
        const goalMatch = normalizedInput.match(/^\/goal\s+([\s\S]+)$/i);
        if (!isNonEmptyString(options.ownerGoalObjective) && goalMatch) {
            options.ownerGoalObjective = goalMatch[1].trim();
        }
        const normalizedAttachments = normalizeTurnAttachments(options.attachments);
        const normalizedInteractionState = normalizeInteractionState(options.interactionState);
        diagnosticLog.event('server', 'server.ipc.follower_send.requested', {
            conversationKey: diagnosticKey(conversationId),
            inputLength: normalizedInput.length,
            clientRequestKey: diagnosticKey(clientRequestId),
            followerMode: _isFollowerModeEnabled(ws),
            ipcOnline: _isIpcOnline(),
            ...diagnosticAttachmentSummary(normalizedAttachments),
            fileMentionCount: Array.isArray(normalizedInteractionState.fileMentions)
                ? normalizedInteractionState.fileMentions.length
                : 0,
            ...diagnosticFollowerConfigFields(options.turnConfig, 'requested')
        }, 'info');
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                conversationKey: diagnosticKey(conversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'active_send_unavailable'
            }, 'warn');
            sendWsEnvelope(ws, { type: 'error', message: 'Active send is not allowed', detail: 'Enable TERMLINK_CODEX_IPC_ENABLED + ALLOW_ACTIVE + CONFIRM_SEND.' });
            return;
        }
        if (typeof conversationId !== 'string' || !conversationId.trim()) {
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'missing_conversation'
            }, 'warn');
            sendWsEnvelope(ws, { type: 'error', message: 'No active conversation', detail: 'Set an active conversation before sending messages.' });
            return;
        }
        if (
            !normalizedInput &&
            normalizedAttachments.length === 0 &&
            !isNonEmptyString(normalizedInteractionState.activeSkill)
        ) {
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                conversationKey: diagnosticKey(conversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'empty_input',
                ...diagnosticAttachmentSummary(normalizedAttachments)
            }, 'warn');
            sendWsEnvelope(ws, { type: 'error', message: 'Input cannot be empty', detail: 'Provide non-empty message text.' });
            return;
        }
        const normalizedConversationId = conversationId.trim();
        _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'accepted');
        if (_getActiveConversationId(ws) !== normalizedConversationId) {
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                conversationKey: diagnosticKey(normalizedConversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'conversation_not_active'
            }, 'warn');
            _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'failed', {
                detail: 'Conversation is not active'
            });
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is not active',
                detail: 'Select this conversation before sending a follower message.'
            });
            return;
        }
        const requestKey = _followerRequestKey(ws, clientRequestId);
        const priorRequest = _followerRequestLedger.get(requestKey);
        if (priorRequest?.conversationId !== undefined) {
            if (
                priorRequest.conversationId === normalizedConversationId
                && priorRequest.status === 'started'
            ) {
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'turn_started', {
                    authority: priorRequest.authority,
                    turnId: priorRequest.turnId,
                    replayed: true
                });
                sendWsEnvelope(ws, {
                    type: priorRequest.successType || options.successType || 'follower_message_sent',
                    conversationId: normalizedConversationId,
                    clientRequestId,
                    turnId: priorRequest.turnId,
                    acknowledged: true,
                    replayed: true
                });
                return;
            }
            _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'failed', {
                detail: 'Client request is already being resolved'
            });
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                conversationKey: diagnosticKey(normalizedConversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'duplicate_client_request'
            }, 'warn');
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Client request is already being resolved',
                detail: 'Reuse of a pending clientRequestId is not allowed.'
            });
            return;
        }
        if (_followerSendInFlight.has(normalizedConversationId)) {
            _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'failed', {
                detail: 'Message send is already being resolved'
            });
            diagnosticLog.event('server', 'server.ipc.follower_send.rejected', {
                conversationKey: diagnosticKey(normalizedConversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'conversation_send_in_flight'
            }, 'warn');
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Message send is already being resolved',
                detail: 'Wait for the current send routing decision to finish.'
            });
            return;
        }
        _followerRequestLedger.set(requestKey, {
            conversationId: normalizedConversationId,
            status: 'resolving'
        });
        options = { ...options, requestKey };
        _followerSendInFlight.add(normalizedConversationId);
        try {
            let authority = _shouldUseOwnerRuntime(normalizedConversationId) ? 'owner' : 'ipc';
            let latest = _getLatestConversationSnapshot(normalizedConversationId);

            if (authority === 'ipc' && !latest && _isIpcOnline()) {
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'waiting_for_surface', {
                    authority: 'ipc'
                });
                diagnosticLog.event('server', 'server.ipc.follower_send.waiting_for_surface', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    routeStage: 'surface-grace',
                    timeoutMs: ipcSurfaceWaitGraceMs
                }, 'info');
                latest = await _waitForCurrentCycleIpcSnapshot(ws, normalizedConversationId);
                if (_shouldUseOwnerRuntime(normalizedConversationId)) {
                    authority = 'owner';
                    latest = _getLatestOwnerSnapshot(normalizedConversationId);
                }
            }
            if (ws.readyState !== 1 || _getActiveConversationId(ws) !== normalizedConversationId) {
                diagnosticLog.event('server', 'server.ipc.follower_send.cancelled', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    routeStage: ws.readyState !== 1 ? 'websocket-closed' : 'active-conversation-changed'
                }, 'info');
                return;
            }

            if (latest && !canStartFollowerTurn(latest.status)) {
                sendWsEnvelope(ws, {
                    type: 'error',
                    message: 'Conversation is still running',
                    detail: 'Wait for the current turn to finish before starting a new follower turn.'
                });
                return;
            }
            const preparedTurnInput = await buildTurnInput(
                normalizedInput,
                normalizedAttachments,
                normalizedInteractionState,
                latest?.cwd || getSessionById(sessionManager, ws.sessionId)?.cwd,
                mediaStore
            );
            options = {
                ...options,
                preparedInput: preparedTurnInput.input,
                collaborationMode: options.collaborationMode
            };
            if (preparedTurnInput.tempFilePaths.length > 0) {
                _followerAttachmentTempFiles.set(normalizedConversationId, [
                    ...(_followerAttachmentTempFiles.get(normalizedConversationId) || []),
                    ...preparedTurnInput.tempFilePaths
                ]);
            }

            if (authority === 'owner') {
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'routed', {
                    authority: 'owner'
                });
                diagnosticLog.event('server', 'server.ipc.follower_send.routed', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    authority: 'owner',
                    routeStage: 'sticky-owner'
                }, 'info');
                await _startOwnerMessageOrGoal(ws, normalizedConversationId, normalizedInput, latest, options);
                return;
            }

            if (!ipcFeed) {
                sendWsEnvelope(ws, {
                    type: 'error',
                    message: 'IPC feed is not available',
                    detail: options.unavailableDetail || 'Enable codex-ipc to send follower messages.'
                });
                return;
            }

            const fallbackSeed = _getLatestIpcSnapshot(normalizedConversationId) || {
                conversationId: normalizedConversationId
            };
            if (!_isIpcOnline()) {
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'routed', {
                    authority: 'owner'
                });
                diagnosticLog.event('server', 'server.ipc.follower_send.routed', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    authority: 'owner',
                    routeStage: 'ipc-offline-fallback',
                    currentCycleSurface: Boolean(latest)
                }, 'warn');
                await _startOwnerMessageOrGoal(ws, normalizedConversationId, normalizedInput, fallbackSeed, options);
                return;
            }

            try {
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'routed', {
                    authority: 'ipc'
                });
                const turnStartParams = buildFollowerTurnStartParams(normalizedInput, latest || {}, options);
                diagnosticLog.event('server', 'server.ipc.follower_send.config_resolved', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    authority: 'ipc',
                    ...diagnosticTurnStartParamFields(turnStartParams)
                });
                const response = await ipcFeed.sendRequest('thread-follower-start-turn', {
                    conversationId: normalizedConversationId,
                    turnStartParams
                });
                assertIpcSuccess(response);
                const turnId = response?.result?.turn?.id ||
                    response?.result?.turn?.turnId ||
                    response?.result?.turnId ||
                    null;
                _recordAuthority(normalizedConversationId, 'ipc', 'running', turnId);
                _recordFollowerRequestStarted(
                    requestKey,
                    normalizedConversationId,
                    'ipc',
                    turnId,
                    options.successType || 'follower_message_sent'
                );
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'turn_started', {
                    authority: 'ipc',
                    turnId
                });
                diagnosticLog.event('server', 'server.ipc.follower_send.acknowledged', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    turnKey: diagnosticKey(turnId),
                    authority: 'ipc',
                    routeStage: latest ? 'current-cycle-surface' : 'surface-timeout',
                    ...diagnosticAttachmentSummary(normalizedAttachments),
                    responseType: response && response.type,
                    resultType: response && response.resultType
                });
                sendWsEnvelope(ws, {
                    type: options.successType || 'follower_message_sent',
                    conversationId: normalizedConversationId,
                    clientRequestId,
                    turnId,
                    acknowledged: true
                });
            } catch (error) {
                const noClientFallback = isNoClientFoundError(error);
                diagnosticLog.error('server', 'server.ipc.follower_send.failed', error, {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    authority: 'ipc',
                    routeStage: latest ? 'current-cycle-surface' : 'surface-timeout',
                    noClientFallback,
                    ...diagnosticAttachmentSummary(normalizedAttachments),
                    errorType: error?.constructor?.name || typeof error
                });
                if (noClientFallback) {
                    _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'routed', {
                        authority: 'owner'
                    });
                    diagnosticLog.event('server', 'server.ipc.follower_send.routed', {
                        conversationKey: diagnosticKey(normalizedConversationId),
                        clientRequestKey: diagnosticKey(clientRequestId),
                        authority: 'owner',
                        routeStage: 'no-client-found-fallback'
                    }, 'warn');
                    await _startOwnerMessageOrGoal(ws, normalizedConversationId, normalizedInput, fallbackSeed, options);
                    return;
                }
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'failed', {
                    authority: 'ipc',
                    detail: error && error.message ? error.message : String(error)
                });
                sendWsEnvelope(ws, {
                    type: 'error',
                    message: options.failureMessage || 'Failed to send follower message',
                    detail: error && error.message ? error.message : String(error)
                });
            }
        } finally {
            if (_followerRequestLedger.get(requestKey)?.status === 'resolving') {
                _followerRequestLedger.delete(requestKey);
            }
            _followerSendInFlight.delete(normalizedConversationId);
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
            unavailableDetail: 'Enable codex-ipc to start follower goals.',
            ownerGoalObjective: goal.trim()
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
        const ledger = _authorityLedger.get(conversationId);
        const authority = _getAuthority(conversationId);
        diagnosticLog.event('server', 'server.ipc.interrupt.requested', {
            conversationKey: diagnosticKey(conversationId),
            authority,
            ledgerStatus: ledger?.status || null,
            ledgerTurnIdPresent: Boolean(ledger?.turnId),
            latestStatus: latest?.status || null,
            latestTurnIdPresent: Boolean(latest?.latestTurnId),
            latestDesynced: latest?.desynced === true,
            ipcOnline: _isIpcOnline(),
            followerMode: _isFollowerModeEnabled(ws)
        });
        const isRunning = latest?.status === 'running' || ledger?.status === 'running';
        if (!isRunning) {
            diagnosticLog.event('server', 'server.ipc.interrupt.rejected_not_running', {
                conversationKey: diagnosticKey(conversationId),
                authority,
                ledgerStatus: ledger?.status || null,
                latestStatus: latest?.status || null,
                latestDesynced: latest?.desynced === true
            }, 'warn');
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is not running',
                detail: 'Only a running turn can be interrupted.'
            });
            return;
        }

        const activeTurnId = ledger?.turnId || latest?.latestTurnId || null;
        if (authority === 'owner') {
            try {
                diagnosticLog.event('server', 'server.ipc.interrupt.routed', {
                    conversationKey: diagnosticKey(conversationId),
                    authority: 'owner',
                    turnKey: diagnosticKey(activeTurnId)
                });
                await codexService.request('turn/interrupt', {
                    threadId: conversationId,
                    ...(isNonEmptyString(activeTurnId) ? { turnId: activeTurnId } : {})
                });
                _recordAuthority(conversationId, 'owner', 'interrupting', activeTurnId);
                diagnosticLog.event('server', 'server.ipc.interrupt.acknowledged', {
                    conversationKey: diagnosticKey(conversationId),
                    authority: 'owner',
                    turnKey: diagnosticKey(activeTurnId)
                });
                sendWsEnvelope(ws, { type: 'follower_turn_interrupted', conversationId, acknowledged: true });
            } catch (error) {
                diagnosticLog.error('server', 'server.ipc.interrupt.failed', error, {
                    conversationKey: diagnosticKey(conversationId),
                    authority: 'owner',
                    turnKey: diagnosticKey(activeTurnId)
                });
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
            diagnosticLog.event('server', 'server.ipc.interrupt.routed', {
                conversationKey: diagnosticKey(conversationId),
                authority: 'ipc',
                turnKey: diagnosticKey(activeTurnId),
                ipcOnline: true
            });
            const response = await ipcFeed.sendRequest('thread-follower-interrupt-turn', {
                conversationId,
                ...(isNonEmptyString(activeTurnId) ? { turnId: activeTurnId } : {})
            });
            assertIpcSuccess(response);
            _recordAuthority(conversationId, 'ipc', 'interrupting', activeTurnId);
            diagnosticLog.event('server', 'server.ipc.interrupt.acknowledged', {
                conversationKey: diagnosticKey(conversationId),
                authority: 'ipc',
                turnKey: diagnosticKey(activeTurnId),
                responseType: response?.type || null,
                resultType: response?.resultType || null
            });
            sendWsEnvelope(ws, { type: 'follower_turn_interrupted', conversationId, acknowledged: true });
        } catch (error) {
            diagnosticLog.error('server', 'server.ipc.interrupt.failed', error, {
                conversationKey: diagnosticKey(conversationId),
                authority: 'ipc',
                turnKey: diagnosticKey(activeTurnId),
                ipcOnline: _isIpcOnline()
            });
            sendWsEnvelope(ws, { type: 'error', message: 'Failed to interrupt follower turn', detail: error.message });
        }
    };

    const _handleFollowerApprovalResponse = async (ws, conversationId, decision, requestId, requestKind, execpolicyAmendment) => {
        diagnosticLog.event('server', 'server.ipc.approval.requested', {
            conversationKey: diagnosticKey(conversationId),
            requestKey: diagnosticKey(requestId),
            requestKind: isNonEmptyString(requestKind) ? requestKind : 'unknown',
            followerMode: _isFollowerModeEnabled(ws),
            ipcOnline: _isIpcOnline()
        }, 'info');
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
                const ownerResult = buildOwnerApprovalResult(approval, decision, execpolicyAmendment);
                codexService.respondToServerRequest(approval.rawRequestId, {
                    result: ownerResult
                });
                ownerSurfaceTracker.markRequestResponseSent(approval.rawRequestId, conversationId);
                diagnosticLog.event('server', 'server.ipc.approval.acknowledged', {
                    transport: 'owner',
                    conversationKey: diagnosticKey(conversationId),
                    requestKey: diagnosticKey(requestId)
                }, 'info');
                sendWsEnvelope(ws, { type: 'follower_approval_response_sent', conversationId, requestId, acknowledged: true });
            } catch (error) {
                diagnosticLog.error('server', 'server.ipc.approval.failed', error, {
                    transport: 'owner',
                    conversationKey: diagnosticKey(conversationId),
                    requestKey: diagnosticKey(requestId)
                });
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
            console.warn('[gateway][ipc][approval-response-send]', JSON.stringify({
                conversationId,
                requestId,
                rawRequestId: approval.rawRequestId,
                requestKind: approval.kind,
                method: approval.method,
                decision: typeof decisionValue === 'string' ? decisionValue : 'structured'
            }));
            const response = await ipcFeed.sendRequest(approval.method, {
                conversationId,
                requestId: approval.rawRequestId,
                decision: decisionValue
            });
            assertIpcSuccess(response);
            diagnosticLog.event('server', 'server.ipc.approval.acknowledged', {
                transport: 'ipc',
                conversationKey: diagnosticKey(conversationId),
                requestKey: diagnosticKey(requestId),
                responseType: response?.type
            }, 'info');
            console.warn('[gateway][ipc][approval-response-result]', JSON.stringify({
                conversationId,
                requestId,
                rawRequestId: approval.rawRequestId,
                method: approval.method,
                responseType: response?.type,
                resultType: response?.resultType
            }));
            sendWsEnvelope(ws, { type: 'follower_approval_response_sent', conversationId, requestId, acknowledged: true });
        } catch (error) {
            diagnosticLog.error('server', 'server.ipc.approval.failed', error, {
                transport: 'ipc',
                conversationKey: diagnosticKey(conversationId),
                requestKey: diagnosticKey(requestId)
            });
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
            const rawPlanRequestId = resolveRawPendingRequestId(
                latest?.pendingUserInputAction || planAction,
                livePlanRequestId
            );
            console.info('[gateway][ipc][plan-response-send]', JSON.stringify({
                conversationId,
                requestId: livePlanRequestId || null,
                rawRequestId: rawPlanRequestId ?? null,
                requestMethod: planAction?.requestMethod || null,
                action: hasExplicitResponse ? 'submit-user-input' : (isPlanAcceptInput(trimmedInput) ? 'implement' : 'feedback')
            }));

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
                        failureMessage: 'Failed to send owner plan response',
                        responseRequestId: livePlanRequestId,
                        awaitOwnerSnapshot: true
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
                ownerSurfaceTracker.markRequestResponseSent(livePlanRequestId, conversationId);
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
                console.info('[gateway][ipc][plan-response-result]', JSON.stringify({
                    conversationId,
                    requestId: livePlanRequestId || null,
                    action: 'implement',
                    resultType: startRes?.resultType || startRes?.type || null
                }));
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
                    requestId: rawPlanRequestId,
                    response: responsePayload
                });
                assertIpcSuccess(res);
                console.info('[gateway][ipc][plan-response-result]', JSON.stringify({
                    conversationId,
                    requestId: livePlanRequestId || null,
                    rawRequestId: rawPlanRequestId ?? null,
                    action: 'submit-user-input',
                    resultType: res?.resultType || res?.type || null
                }));
            }
            sendWsEnvelope(ws, {
                type: 'follower_plan_response_sent',
                conversationId,
                requestId: livePlanRequestId || undefined,
                acknowledged: true
            });
        } catch (error) {
            console.error('[gateway][ipc][plan-response-error]', JSON.stringify({
                conversationId,
                requestId: requestId || null,
                message: error.message
            }));
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
        const rawRequestId = isRawRequestId(candidate.rawRequestId)
            ? candidate.rawRequestId
            : (raw && (typeof raw.id === 'string' || typeof raw.id === 'number')
                ? raw.id
                : (requestIds[0] || requested));
        const requestMethod = isNonEmptyString(candidate.requestMethod)
            ? candidate.requestMethod.trim()
            : (isNonEmptyString(candidate.method)
                ? candidate.method.trim()
                : (raw && isNonEmptyString(raw.method) ? raw.method.trim() : ''));
        const params = candidate.params && typeof candidate.params === 'object'
            ? candidate.params
            : (raw && raw.params && typeof raw.params === 'object' ? raw.params : undefined);
        const method = resolveApprovalResponseMethod(kind);
        return method && rawRequestId !== undefined && rawRequestId !== ''
            ? { kind, rawRequestId, method, requestMethod, raw, params }
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

    function isRawRequestId(value) {
        return (typeof value === 'string' && value.trim() !== '') ||
            (typeof value === 'number' && Number.isFinite(value));
    }

    function resolveRawPendingRequestId(candidate, requested) {
        if (!candidate || typeof candidate !== 'object') return requested;
        if (isRawRequestId(candidate.rawRequestId)) return candidate.rawRequestId;
        const raw = candidate.raw && typeof candidate.raw === 'object' ? candidate.raw : null;
        if (raw && isRawRequestId(raw.id)) return raw.id;
        return requested;
    }

    function buildOwnerApprovalResult(approval, decision, execpolicyAmendment) {
        if (approval.requestMethod === 'item/permissions/requestApproval') {
            if (decision === 'accept' || decision === 'acceptForSession') {
                return {
                    permissions: extractRequestedPermissions(approval.params),
                    scope: decision === 'acceptForSession' ? 'session' : 'turn'
                };
            }
            return { permissions: {}, scope: 'turn' };
        }
        return {
            decision: buildApprovalDecisionValue(decision, execpolicyAmendment, approval)
        };
    }

    function extractRequestedPermissions(params) {
        if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
        const permissions = params.permissions;
        return permissions && typeof permissions === 'object' && !Array.isArray(permissions)
            ? structuredClone(permissions)
            : {};
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
        const requestedConfig = normalizeFollowerTurnConfig(options.turnConfig);
        const currentConfig = normalizeFollowerTurnConfig(snapshot?.currentCodexConfig);
        const useConfigPermissions = requestedConfig.useConfigPermissions;
        const effectiveConfig = {
            model: requestedConfig.model || currentConfig.model,
            reasoningEffort: requestedConfig.reasoningEffort || currentConfig.reasoningEffort,
            approvalPolicy: useConfigPermissions
                ? null
                : (requestedConfig.approvalPolicy || currentConfig.approvalPolicy),
            sandboxMode: useConfigPermissions
                ? null
                : (requestedConfig.sandboxMode || currentConfig.sandboxMode),
            approvalsReviewer: useConfigPermissions
                ? null
                : (requestedConfig.approvalsReviewer || currentConfig.approvalsReviewer),
            permissionProfile: useConfigPermissions
                ? null
                : (requestedConfig.permissionProfile ||
                    (requestedConfig.sandboxMode ? null : currentConfig.permissionProfile))
        };
        const baseCollaborationMode = options.collaborationMode ||
            snapshot?.latestDefaultCollaborationMode ||
            snapshot?.latestCollaborationMode;
        const collaborationMode = mergeFollowerCollaborationMode(baseCollaborationMode, effectiveConfig);
        const permissionOverride = requestedConfig.sandboxMode
            ? derivePermissionOverrideFromSandboxMode(requestedConfig.sandboxMode)
            : null;
        const approvalPolicy = requestedConfig.approvalPolicy ||
            permissionOverride?.approvalPolicy ||
            effectiveConfig.approvalPolicy;
        const approvalsReviewer = effectiveConfig.approvalsReviewer;
        const permissionProfile = effectiveConfig.permissionProfile;
        const sandboxMode = permissionProfile
            ? null
            : (permissionOverride?.sandboxMode || effectiveConfig.sandboxMode);
        const baseParams = {
            clientUserMessageId: isNonEmptyString(options.clientRequestId) ? options.clientRequestId.trim() : randomUUID(),
            input: Array.isArray(options.preparedInput)
                ? structuredClone(options.preparedInput)
                : buildTextInputSequence(input),
            attachments: [],
            commentAttachments: [],
            ...(isNonEmptyString(snapshot?.cwd) ? {
                cwd: snapshot.cwd,
                runtimeWorkspaceRoots: [snapshot.cwd]
            } : {}),
            ...(effectiveConfig.model ? { model: effectiveConfig.model } : {}),
            ...(collaborationMode ? { collaborationMode } : {})
        };
        if (options.transport === 'app-server') {
            return {
                ...baseParams,
                ...(effectiveConfig.reasoningEffort ? { reasoningEffort: effectiveConfig.reasoningEffort } : {}),
                ...(useConfigPermissions ? {
                    askForApproval: null,
                    approvalsReviewer: null,
                    permissions: null,
                    sandbox: null
                } : {}),
                ...(approvalPolicy ? { askForApproval: approvalPolicy } : {}),
                ...(approvalsReviewer ? { approvalsReviewer } : {}),
                ...(permissionProfile ? { permissions: permissionProfile } : {}),
                ...(sandboxMode ? { sandbox: sandboxMode } : {})
            };
        }
        return {
            ...baseParams,
            ...(effectiveConfig.reasoningEffort ? { effort: effectiveConfig.reasoningEffort } : {}),
            ...(useConfigPermissions ? {
                approvalPolicy: null,
                approvalsReviewer: null,
                permissions: null,
                sandboxPolicy: null
            } : {}),
            ...(approvalPolicy ? { approvalPolicy } : {}),
            ...(approvalsReviewer ? { approvalsReviewer } : {}),
            ...(permissionProfile ? { permissions: permissionProfile } : {}),
            ...(sandboxMode ? { sandboxPolicy: { type: sandboxModeToOwnerPolicyType(sandboxMode) } } : {})
        };
    }

    function diagnosticFollowerConfigFields(config, prefix = 'config') {
        const normalized = normalizeFollowerTurnConfig(config);
        return {
            [`${prefix}Model`]: normalized.model,
            [`${prefix}ReasoningEffort`]: normalized.reasoningEffort,
            [`${prefix}ApprovalPolicy`]: normalized.approvalPolicy,
            [`${prefix}ApprovalsReviewer`]: normalized.approvalsReviewer,
            [`${prefix}PermissionProfile`]: normalized.permissionProfile,
            [`${prefix}SandboxMode`]: normalized.sandboxMode,
            [`${prefix}UsesConfigPermissions`]: normalized.useConfigPermissions
        };
    }

    function diagnosticTurnStartParamFields(params, prefix = 'resolved') {
        const source = params && typeof params === 'object' ? params : {};
        return diagnosticFollowerConfigFields({
            model: source.model,
            reasoningEffort: source.reasoningEffort || source.effort,
            approvalPolicy: source.approvalPolicy || source.askForApproval,
            approvalsReviewer: source.approvalsReviewer,
            permissionProfile: source.permissions,
            sandboxMode: source.sandbox || source.sandboxMode ||
                (source.sandboxPolicy && typeof source.sandboxPolicy === 'object'
                    ? source.sandboxPolicy.type
                    : null),
            useConfigPermissions: source.approvalPolicy === null ||
                source.askForApproval === null ||
                source.permissions === null ||
                source.sandboxPolicy === null
        }, prefix);
    }

    function normalizeFollowerTurnConfig(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return {
            model: isNonEmptyString(source.model) ? source.model.trim() : null,
            reasoningEffort: isNonEmptyString(source.reasoningEffort)
                ? source.reasoningEffort.trim().toLowerCase()
                : null,
            approvalPolicy: isNonEmptyString(source.approvalPolicy)
                ? source.approvalPolicy.trim()
                : null,
            approvalsReviewer: isNonEmptyString(source.approvalsReviewer)
                ? source.approvalsReviewer.trim()
                : null,
            permissionProfile: isNonEmptyString(source.permissionProfile)
                ? source.permissionProfile.trim()
                : null,
            useConfigPermissions: source.useConfigPermissions === true,
            sandboxMode: isNonEmptyString(source.sandboxMode)
                ? source.sandboxMode.trim()
                : (isNonEmptyString(source.sandbox) ? source.sandbox.trim() : null)
        };
    }

    function mergeFollowerCollaborationMode(value, effectiveConfig) {
        const normalized = normalizeCollaborationMode(value);
        if (!normalized) return null;
        return {
            mode: normalized.mode,
            settings: {
                ...normalized.settings,
                model: effectiveConfig.model || normalized.settings.model,
                reasoning_effort: effectiveConfig.reasoningEffort || normalized.settings.reasoning_effort
            }
        };
    }

    function sandboxModeToOwnerPolicyType(value) {
        return String(value || '').trim().replace(/-([a-z0-9])/g, (_, part) => part.toUpperCase());
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
        return /thread not found|no rollout found for thread id/i.test(message);
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
                    const recoveryError = new Error('The selected Codex thread could not be resumed.');
                    recoveryError.code = 'CODEX_THREAD_RECOVERY_REQUIRED';
                    recoveryError.reason = 'thread_not_found';
                    recoveryError.threadId = preferredThreadId;
                    recoveryError.forkAvailable = false;
                    throw recoveryError;
                }
                throw resumeError;
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
                if (isThreadNotFoundError(resumeError)) {
                    const recoveryError = new Error('The bound Codex thread is no longer available.');
                    recoveryError.code = 'CODEX_THREAD_RECOVERY_REQUIRED';
                    recoveryError.reason = 'thread_not_found';
                    recoveryError.threadId = state.threadId;
                    recoveryError.forkAvailable = false;
                    throw recoveryError;
                }
                throw resumeError;
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
        ownerSurfaceTracker.registerThreadStart(threadStartResult, {
            seedSurface: {
                conversationId: threadId,
                cwd: requestedCwd,
                status: 'completed'
            }
        });
        _recordAuthority(threadId, 'owner', 'created');

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
        const ownerNotificationThreadId = CodexAppServerService.extractThreadId(notification);
        if (ownerNotificationThreadId && ownerSurfaceTracker.hasConversation(ownerNotificationThreadId)) {
            if (method === 'turn/started') {
                _recordAuthority(
                    ownerNotificationThreadId,
                    'owner',
                    'running',
                    params?.turn?.id || params?.turn?.turnId || null
                );
            } else if (method === 'turn/completed') {
                _recordAuthority(
                    ownerNotificationThreadId,
                    'owner',
                    'terminal',
                    params?.turn?.id || params?.turn?.turnId || null
                );
            }
        }
        if (method === 'turn/completed') {
            const ownerThreadId = ownerNotificationThreadId;
            if (ownerThreadId && ownerSurfaceTracker.hasConversation(ownerThreadId)) {
                void _completeOwnerGoalAfterTurn(ownerThreadId, params && params.turn);
            }
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
            const registrationId = url.searchParams.get('registrationId') || null;
            if (registrationId && registrationManager && !registrationManager.isActive(registrationId)) {
                closeSocket(ws, 4403, 'Client registration is invalid or revoked');
                return;
            }

            let session;
            if (sessionIdProvided) {
                session = typeof sessionManager.getSessionForRegistration === 'function'
                    ? sessionManager.getSessionForRegistration(sessionId, registrationId)
                    : sessionManager.getSession(sessionId);
                if (!session) {
                    closeSocket(ws, registrationId ? 4403 : 4404, registrationId
                        ? 'Session is not owned by this client registration'
                        : 'Session not found or expired');
                    return;
                }
            } else {
                // Create session with privilege metadata
                session = await sessionManager.createSession({
                    name: 'Default Session',
                    registrationId,
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
            // PTY startup output can arrive while the connection handshake is
            // still being sent. Keep it in the PTY snapshot until session_info
            // and terminal_snapshot have reached the client, then resume the
            // live broadcast stream. This prevents a pre-session output event
            // from being written under the temporary `default` history key.
            session.suppressPtyOutput = true;
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

            // A PTY can already be alive when Android attaches (for example
            // after returning to the terminal from another screen). Replaying
            // its bounded output tail lets the client paint the prompt and
            // current screen immediately, without injecting an Enter key.
            if ((session.sessionMode || 'terminal') !== 'codex') {
                const terminalSnapshot = typeof sessionManager.getTerminalOutputSnapshot === 'function'
                    ? sessionManager.getTerminalOutputSnapshot(session)
                    : '';
                diagnosticLog.event('terminal', 'server.terminal.attach.snapshot', {
                    sessionIdPresent: Boolean(session.id),
                    sessionMode: session.sessionMode || 'terminal',
                    snapshotLength: terminalSnapshot.length
                });
                if (terminalSnapshot) {
                    sendWsEnvelope(ws, {
                        type: 'terminal_snapshot',
                        data: terminalSnapshot
                    });
                }
            }
            session.suppressPtyOutput = false;
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
                    } else if (type === 'conversation_history_sync_request') {
                        const conversationId = isNonEmptyString(envelope.conversationId) ? envelope.conversationId.trim() : '';
                        if (!conversationId || _getActiveConversationId(ws) !== conversationId) {
                            sendWsEnvelope(ws, { type: 'conversation_history_sync_state', syncId: envelope.syncId || null, conversationId, state: 'failed', detailCode: 'conversation_not_active' });
                        } else {
                            historySyncService.startSync({
                                ws,
                                conversationId,
                                syncId: envelope.syncId,
                                checkpoint: envelope.checkpoint || {},
                                selectionGeneration: _ipcSelectionGenerations.get(ws) || 0
                            });
                        }
                    } else if (type === 'conversation_history_manifest_page') {
                        historySyncService.handleManifestPage(ws, envelope);
                    } else if (type === 'conversation_history_sync_ack') {
                        historySyncService.handleAck(ws, envelope);
                    } else if (type === 'set_active_follower_mode') {
                        _setFollowerMode(ws, envelope.enabled === true);
                    } else if (type === 'codex_thread_recovery_action') {
                        const recoveryId = isNonEmptyString(envelope.recoveryId)
                            ? envelope.recoveryId.trim()
                            : '';
                        const action = isNonEmptyString(envelope.action)
                            ? envelope.action.trim().toLowerCase()
                            : '';
                        const recovery = _pendingThreadRecoveries.get(recoveryId);
                        if (!recovery || recovery.ws !== ws || recovery.sessionId !== session.id) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_THREAD_RECOVERY_EXPIRED',
                                message: 'The thread recovery request is no longer available.'
                            });
                            return;
                        }
                        if (
                            recovery.draft?.transport === 'follower'
                            && recovery.conversationId
                            && _getActiveConversationId(ws) !== recovery.conversationId
                        ) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_THREAD_RECOVERY_CONVERSATION_CHANGED',
                                message: 'The active conversation changed before recovery was confirmed.'
                            });
                            return;
                        }
                        if (recovery.resolving) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_THREAD_RECOVERY_IN_PROGRESS',
                                message: 'The thread recovery action is already in progress.'
                            });
                            return;
                        }
                        if (!['retry', 'fork', 'new', 'cancel'].includes(action)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_THREAD_RECOVERY_ACTION_INVALID',
                                message: 'Unsupported thread recovery action.'
                            });
                            return;
                        }
                        if (action === 'fork' && !recovery.forkAvailable) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_THREAD_RECOVERY_FORK_UNAVAILABLE',
                                message: 'The source thread cannot be forked.'
                            });
                            return;
                        }
                        if (action === 'cancel') {
                            _pendingThreadRecoveries.delete(recoveryId);
                            sendWsEnvelope(ws, {
                                type: 'codex_thread_recovery_resolved',
                                recoveryId,
                                action,
                                draft: recovery.draft
                            });
                            return;
                        }

                        recovery.resolving = true;
                        try {
                            let targetConversationId = recovery.conversationId;
                            if (action === 'fork') {
                                const forkResult = await codexService.request('thread/fork', {
                                    threadId: recovery.conversationId
                                });
                                targetConversationId = forkResult?.thread?.id || null;
                                if (!isNonEmptyString(targetConversationId)) {
                                    throw new Error('Codex thread/fork did not return thread id.');
                                }
                                ownerSurfaceTracker.registerThreadStart(forkResult, {
                                    seedSurface: {
                                        conversationId: targetConversationId,
                                        cwd: session.cwd,
                                        status: 'completed'
                                    }
                                });
                                _recordAuthority(targetConversationId, 'owner', 'created');
                            } else if (action === 'new') {
                                targetConversationId = await ensureCodexThreadForSession(session, {
                                    forceNewThread: true,
                                    cwd: session.cwd
                                });
                            }
                            if (!isNonEmptyString(targetConversationId)) {
                                throw new Error('Thread recovery did not produce a canonical conversation id.');
                            }

                            _pendingThreadRecoveries.delete(recoveryId);
                            _handleSetActiveConversation(ws, session, targetConversationId);
                            sendWsEnvelope(ws, {
                                type: 'codex_thread_recovery_resolved',
                                recoveryId,
                                action,
                                conversationId: targetConversationId
                            });
                            if (recovery.draft?.transport === 'follower') {
                                await _handleFollowerSendMessage(
                                    ws,
                                    targetConversationId,
                                    recovery.draft.input,
                                    {
                                        ...recovery.draft.options,
                                        clientRequestId: recovery.draft.clientRequestId || randomUUID()
                                    }
                                );
                            }
                        } catch (recoveryError) {
                            recovery.resolving = false;
                            throw recoveryError;
                        }
                    } else if (type === 'follower_send_message') {
                        _handleFollowerSendMessage(ws, envelope.conversationId, envelope.input, {
                            clientRequestId: envelope.clientRequestId,
                            attachments: envelope.attachments,
                            interactionState: envelope.interactionState,
                            collaborationMode: envelope.collaborationMode,
                            turnConfig: envelope.turnConfig
                        }).catch(err => {
                            console.error('[gateway][ipc][follower-send]', err);
                            diagnosticLog.error('server', 'server.ipc.follower_send.unhandled', err, {
                                conversationKey: diagnosticKey(envelope.conversationId),
                                clientRequestKey: diagnosticKey(envelope.clientRequestId),
                                ...diagnosticAttachmentSummary(envelope.attachments)
                            });
                        });
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
                        diagnosticLog.event('server', 'server.codex.new_thread.requested', {
                            sessionKey: diagnosticKey(session && session.id),
                            hasCwd: isNonEmptyString(envelope.cwd)
                        }, 'info');
                        await ensureCodexServiceForSession(session);
                        const threadId = await ensureCodexThreadForSession(session, {
                            forceNewThread: true,
                            cwd: envelope.cwd
                        });
                        sendWsEnvelope(ws, {
                            type: 'codex_thread_ready',
                            threadId
                        });
                        diagnosticLog.event('server', 'server.codex.new_thread.ready', {
                            sessionKey: diagnosticKey(session && session.id),
                            threadKey: diagnosticKey(threadId)
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
                                const recoveryError = new Error('The selected thread model cannot be loaded because the thread is missing.');
                                recoveryError.code = 'CODEX_THREAD_RECOVERY_REQUIRED';
                                recoveryError.reason = 'thread_model_not_found';
                                recoveryError.threadId = initialThreadId;
                                recoveryError.forkAvailable = false;
                                throw recoveryError;
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
                            envelope.cwd || session.cwd,
                            mediaStore
                        );
                        const turnStartPayload = {
                            threadId,
                            clientUserMessageId: isNonEmptyString(envelope.clientRequestId) ? envelope.clientRequestId.trim() : randomUUID(),
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
                            if (isThreadNotFoundError(turnStartError)) {
                                const recoveryError = new Error('The selected Codex thread disappeared before the turn could start.');
                                recoveryError.code = 'CODEX_THREAD_RECOVERY_REQUIRED';
                                recoveryError.reason = 'turn_start_thread_not_found';
                                recoveryError.threadId = threadId;
                                recoveryError.forkAvailable = false;
                                throw recoveryError;
                            }
                            throw turnStartError;
                        }

                        if (ownerSurfaceTracker.hasConversation(threadId)) {
                            ownerSurfaceTracker.adoptTurnStartResult(
                                threadId,
                                turnStartResponse,
                                turnStartPayload.clientUserMessageId,
                                turnStartPayload
                            );
                            _recordAuthority(
                                threadId,
                                'owner',
                                'running',
                                turnStartResponse?.turn?.id || turnStartResponse?.turn?.turnId || null
                            );
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
                        diagnosticLog.event('server', 'server.codex.request.received', {
                            method: method || 'missing',
                            requestKey: diagnosticKey(envelope.requestId),
                            sessionKey: diagnosticKey(session && session.id),
                            threadKey: diagnosticKey(envelope?.params?.threadId)
                        });
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
                        const requestStartedAt = Date.now();
                        try {
                            const response = await codexService.request(method, requestParams);
                            diagnosticLog.event('server', 'server.codex.request.completed', {
                                method,
                                durationMs: Date.now() - requestStartedAt,
                                responsePresent: response !== null && response !== undefined,
                                requestKey: diagnosticKey(envelope.requestId),
                                sessionKey: diagnosticKey(session && session.id),
                                threadKey: diagnosticKey(
                                    response?.thread?.id || requestParams?.threadId || ensureSessionCodexState(session).threadId
                                ),
                                turnKey: diagnosticKey(response?.turn?.id),
                                turnCount: Array.isArray(response?.thread?.turns) ? response.thread.turns.length : null
                            });
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
                        } catch (error) {
                            diagnosticLog.error('server', 'server.codex.request.failed', error, {
                                method,
                                durationMs: Date.now() - requestStartedAt,
                                requestKey: diagnosticKey(envelope.requestId),
                                sessionKey: diagnosticKey(session && session.id),
                                threadKey: diagnosticKey(requestParams?.threadId)
                            });
                            throw error;
                        }
                    }
                } catch (e) {
                    if (e && e.code === 'CODEX_THREAD_RECOVERY_REQUIRED') {
                        _sendThreadRecoveryRequired(ws, {
                            conversationId: e.threadId || envelope?.threadId || ensureSessionCodexState(session).threadId,
                            reason: e.reason || 'thread_recovery_required',
                            forkAvailable: e.forkAvailable === true,
                            draft: {
                                transport: 'legacy',
                                input: envelope?.text || '',
                                attachments: envelope?.attachments || [],
                                interactionState: envelope?.interactionState || null,
                                collaborationMode: envelope?.collaborationMode || null,
                                turnConfig: {
                                    model: envelope?.model || null,
                                    reasoningEffort: envelope?.reasoningEffort || null,
                                    sandbox: envelope?.sandbox || null
                                }
                            }
                        });
                        return;
                    }
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
                _releaseActiveIpcConversation(ws);
                historySyncService.cancel(ws);
                _ipcFollowerModes.delete(ws);
                for (const [recoveryId, recovery] of _pendingThreadRecoveries.entries()) {
                    if (recovery.ws === ws) {
                        _pendingThreadRecoveries.delete(recoveryId);
                    }
                }
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
        for (const ws of Array.from(_ipcActiveConversations.keys())) {
            _releaseActiveIpcConversation(ws);
        }
        for (const conversationId of Array.from(_ipcConversationSubscriptionCycles.keys())) {
            _closeIpcSubscriptionCycle(conversationId, 'gateway-teardown');
        }
        for (const dispose of _ipcRequestHandlerDisposers.splice(0)) {
            try {
                dispose();
            } catch (_) {
                // Best-effort IPC request-handler cleanup during shutdown.
            }
        }
        if (ipcFeed) { ipcFeed.removeAllListeners(); }
        _ipcFollowerModes.clear();
        _ipcConversationLastStatus.clear();
        _followerSendInFlight.clear();
        _authorityLedger.clear();
        _ownerReadStateBroadcasted.clear();
        _ownerDiscoveryInvalidationStages.clear();
        _pendingThreadRecoveries.clear();
        for (const tempFilePaths of _followerAttachmentTempFiles.values()) {
            void cleanupAttachmentTempFiles(tempFilePaths);
        }
        _followerAttachmentTempFiles.clear();
        for (const session of sessionManager.sessions.values()) {
            void cleanupAllSessionAttachmentTempFiles(session);
        }
        codexService.stop();
    };
}

module.exports = registerTerminalGateway;
