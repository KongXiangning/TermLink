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
    MAX_WS_ENVELOPE_BYTES,
    MAX_CONTROL_ENVELOPE_BYTES,
    projectConversationActionPayload
} = require('../services/codexWsSnapshotScheduler');
const { CodexHistorySyncService } = require('../services/codexHistorySyncService');
const { CodexHistoryBaselineProvider } = require('../services/codexHistoryBaselineProvider');
const {
    projectMobileSurface,
    projectMobileRealtimeSurface,
    containsImageDataUrl
} = require('../services/codexMobileSurfaceProjector');
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';
// History recovery is a bounded fallback, not a second long-lived request
// queue.  A stale/expired Desktop owner must produce an observable failure
// instead of holding the Android task in loading state for the app-server's
// generic 120s RPC timeout.
const HISTORY_RECOVERY_TIMEOUT_MS = 30_000;
const HISTORY_SELECTION_DEADLINE_MS = 35_000;
const HISTORY_SETTLEMENT_MARGIN_MS = 1_500;
const HISTORY_RECOVERY_PROVIDER_IDENTITY = 'codex-app-server';
const CODEX_SNAPSHOT_FLUSH_INTERVAL_MS = 25;
// Expensive media externalization must not make a continuously changing IPC
// surface invisible to Android. This deadline only bounds the derived mobile
// projection; the authoritative IPC surface and WebSocket backpressure rules
// remain unchanged.
const MOBILE_SURFACE_MAX_VISIBLE_LATENCY_MS = 500;

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

function withHistoryRecoveryTimeout(promise, timeoutMs = HISTORY_RECOVERY_TIMEOUT_MS) {
    let timer = null;
    return new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            const error = new Error('Codex history recovery timed out.');
            error.code = 'HISTORY_RECOVERY_TIMEOUT';
            reject(error);
        }, timeoutMs);
        if (typeof timer.unref === 'function') timer.unref();
        Promise.resolve(promise).then(
            (value) => {
                if (timer) clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                if (timer) clearTimeout(timer);
                reject(error);
            }
        );
    });
}

function createHistoryRecoveryTimeoutError(detailCode = 'history_recovery_timeout') {
    const error = new Error('Codex history recovery timed out.');
    error.code = 'HISTORY_RECOVERY_TIMEOUT';
    error.detailCode = detailCode;
    return error;
}

function normalizeHistoryRangeCapability(value, serverEnabled = false) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const version = Number.isSafeInteger(source.version) ? source.version : 0;
    const cacheSchemaVersion = Number.isSafeInteger(source.cacheSchemaVersion)
        ? Math.min(source.cacheSchemaVersion, 3)
        : 0;
    return {
        enabled: serverEnabled && source.enabled === true && version === 1 && cacheSchemaVersion >= 3,
        version,
        cacheSchemaVersion
    };
}

function recoveryBaselineMatchesRange(baseline, rangeEnabled) {
    if (!baseline || baseline.sourceKind !== 'history_recovery') return false;
    const range = baseline.range && typeof baseline.range === 'object' ? baseline.range : null;
    const isRangeBaseline = Boolean(range && typeof range.rangeId === 'string' && range.rangeId.trim());
    return rangeEnabled ? isRangeBaseline : !isRangeBaseline;
}

function normalizeGoalObjective(value) {
    if (!isNonEmptyString(value)) return null;
    return value.trim();
}

function parseGoalObjective(input) {
    if (typeof input !== 'string') return null;
    const match = input.trim().match(/^\/goal(?:\s+([\s\S]*))?$/i);
    return match ? normalizeGoalObjective(match[1]) : null;
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

/**
 * Run at most one asynchronous projection for a key and retain only the
 * newest pending value.  IPC remains the source of truth; this queue only
 * bounds Gateway-side derived work when a host emits a burst of revisions.
 * Replaced values resolve as skipped so callers can safely attach cleanup
 * handlers without creating unhandled promise rejections.
 */
function createLatestOnlyAsyncQueue(run) {
    if (typeof run !== 'function') throw new TypeError('run must be a function');
    let active = false;
    let closed = false;
    let pending = null;

    const drain = async () => {
        while (!closed && pending) {
            const current = pending;
            pending = null;
            try {
                const result = await run(current.value);
                current.resolve({ skipped: false, result });
            } catch (error) {
                current.reject(error);
            }
        }
        active = false;
    };

    return {
        enqueue(value) {
            if (closed) return Promise.resolve({ skipped: true });
            if (pending) {
                pending.resolve({ skipped: true });
            }
            const promise = new Promise((resolve, reject) => {
                pending = { value, resolve, reject };
            });
            if (!active) {
                active = true;
                void drain().catch((error) => {
                    // `run` errors belong to the individual value. This is a
                    // final guard for an unexpected queue implementation error.
                    const current = pending;
                    pending = null;
                    active = false;
                    current?.reject(error);
                });
            }
            return promise;
        },
        close() {
            closed = true;
            if (pending) {
                pending.resolve({ skipped: true });
                pending = null;
            }
        },
        get active() {
            return active;
        },
        get pending() {
            return Boolean(pending);
        }
    };
}

const BOUNDED_WS_ENVELOPE_TYPES = new Set([
    'conversation_surface_snapshot',
    'codex_thread_snapshot',
    'codex_response',
    'conversation_history_manifest_required',
    'conversation_history_recovery_state',
    'conversation_history_sync_state',
    'conversation_history_delta',
    'conversation_history_payload_chunk',
    'conversation_history_progress'
]);

function isAndroidCodexClient(ws) {
    return String(ws?.codexClientType || '').trim().toLowerCase() === 'android';
}

function isBoundedWsEnvelope(envelope) {
    const type = typeof envelope?.type === 'string' ? envelope.type : '';
    return BOUNDED_WS_ENVELOPE_TYPES.has(type) || type.startsWith('conversation_history_');
}

function buildOversizeEnvelopeError(envelope) {
    if (envelope?.type === 'codex_response') {
        return {
            type: 'codex_response',
            requestId: envelope.requestId || null,
            method: envelope.method || null,
            selectionGeneration: Number.isSafeInteger(envelope.selectionGeneration)
                ? envelope.selectionGeneration
                : undefined,
            error: {
                code: 'CODEX_ENVELOPE_TOO_LARGE',
                message: 'Codex response exceeded the mobile WebSocket envelope limit; history will be recovered in bounded pages.'
            }
        };
    }
    if (typeof envelope?.type === 'string' && envelope.type.startsWith('conversation_history_')) {
        return {
            type: 'conversation_history_sync_state',
            syncId: envelope.syncId || null,
            conversationId: envelope.conversationId || null,
            state: 'failed',
            detailCode: 'envelope_too_large',
            selectionGeneration: Number.isSafeInteger(envelope.selectionGeneration)
                ? envelope.selectionGeneration
                : 0,
            clientSelectionGeneration: Number.isSafeInteger(envelope.clientSelectionGeneration)
                ? envelope.clientSelectionGeneration
                : 0
        };
    }
    return {
        type: 'codex_error',
        code: 'CODEX_ENVELOPE_TOO_LARGE',
        message: 'Codex response exceeded the mobile WebSocket envelope limit; history will be recovered in bounded pages.',
        detailCode: 'envelope_too_large',
        originalType: typeof envelope?.type === 'string' ? envelope.type : null
    };
}

function sendWsEnvelope(ws, envelope) {
    if (!ws || ws.readyState !== 1) return;
    let serialized;
    try {
        serialized = JSON.stringify(envelope);
    } catch (_) {
        return false;
    }
    const byteLength = Buffer.byteLength(serialized, 'utf8');
    // The bounded history/snapshot protocol is shared by all clients.  An
    // Android client additionally applies the same cap to codex responses so
    // a legacy fallback can never recreate the old full-thread OOM path.
    const bounded = isBoundedWsEnvelope(envelope) || isAndroidCodexClient(ws);
    if (bounded && byteLength > MAX_WS_ENVELOPE_BYTES) {
        const fallback = buildOversizeEnvelopeError(envelope);
        const fallbackSerialized = JSON.stringify(fallback);
        try {
            if (Buffer.byteLength(fallbackSerialized, 'utf8') <= MAX_WS_ENVELOPE_BYTES && ws.readyState === 1) {
                ws.send(fallbackSerialized);
            }
            if (isAndroidCodexClient(ws) && envelope?.type !== 'codex_response') {
                closeSocket(ws, 1009, 'Codex WebSocket message too large');
            }
        } catch (_) {
            // Best effort: the connection may already be closing.
        }
        return false;
    }
    try {
        ws.send(serialized);
        return true;
    } catch (_) {
        return false;
    }
}

function projectMetadataOnlyThreadResponse(response) {
    if (!response || typeof response !== 'object' || !response.thread || typeof response.thread !== 'object') {
        return { thread: {}, metadataOnly: true };
    }
    const scalarKeys = new Set([
        'id', 'threadId', 'title', 'name', 'cwd', 'status', 'state', 'archived',
        'createdAt', 'updatedAt', 'latestTurnId', 'currentTurnId', 'model',
        'reasoningEffort', 'approvalPolicy', 'sandboxMode',
        // historyMode is metadata, not conversation正文.  The bounded
        // recovery provider needs it to choose legacy vs paginated without
        // attempting the unsafe includeTurns=true path for paginated threads.
        'historyMode', 'history_mode'
    ]);
    const thread = {};
    for (const key of scalarKeys) {
        const value = response.thread[key];
        if (value !== undefined && value !== null &&
            ['string', 'number', 'boolean'].includes(typeof value)) {
            thread[key] = value;
        }
    }
    if (response.thread.tokenUsage && typeof response.thread.tokenUsage === 'object') {
        const tokenUsageJson = JSON.stringify(response.thread.tokenUsage);
        if (Buffer.byteLength(tokenUsageJson, 'utf8') <= 16 * 1024) {
            thread.tokenUsage = response.thread.tokenUsage;
        }
    }
    return { thread, metadataOnly: true };
}

const THREAD_LIST_METADATA_KEYS = new Set([
    'id', 'threadId', 'title', 'name', 'cwd', 'archived', 'isArchived',
    'createdAt', 'created_at', 'created', 'updatedAt', 'updated_at',
    'lastActiveAt', 'last_active_at', 'lastUpdatedAt', 'last_updated_at',
    'lastMessageAt', 'last_message_at', 'modifiedAt', 'modified_at', 'mtime',
    'preview', 'summary', 'status', 'state'
]);

function projectMetadataOnlyThreadListItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const result = {};
    for (const key of THREAD_LIST_METADATA_KEYS) {
        const value = item[key];
        if (value === undefined || value === null) continue;
        if (typeof value === 'string') {
            result[key] = value.length <= 4096 ? value : `${value.slice(0, 4096)}…`;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Thread-list responses are metadata only for Android.  In particular, do
 * not forward turns/items/attachments hidden inside each list entry: those
 * fields were the second legacy path capable of producing a multi-megabyte
 * WebSocket frame before the cache/history channel was introduced.
 */
function projectMetadataOnlyThreadListResponse(response) {
    if (Array.isArray(response)) return response.map(projectMetadataOnlyThreadListItem).filter(Boolean);
    if (!response || typeof response !== 'object') return { data: [] };
    const output = {};
    for (const [key, value] of Object.entries(response)) {
        if (key === 'data' || key === 'threads') continue;
        if (value === null || typeof value === 'number' || typeof value === 'boolean') {
            output[key] = value;
        } else if (typeof value === 'string') {
            output[key] = value.length <= 4096 ? value : `${value.slice(0, 4096)}…`;
        }
    }
    const listKey = Array.isArray(response.data)
        ? 'data'
        : Array.isArray(response.threads)
            ? 'threads'
            : null;
    output[listKey || 'data'] = (listKey ? response[listKey] : [])
        .map(projectMetadataOnlyThreadListItem)
        .filter(Boolean);
    return output;
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
    historySelectionDeadlineMs = HISTORY_SELECTION_DEADLINE_MS,
    historySettlementMarginMs = HISTORY_SETTLEMENT_MARGIN_MS,
    mediaStore = null,
    registrationManager = null,
    mobileSurfaceProjector = projectMobileRealtimeSurface,
    mobileSurfaceMaxVisibleLatencyMs = MOBILE_SURFACE_MAX_VISIBLE_LATENCY_MS,
    // B.2 ships the additive range path behind a deployment gate.  Keep it
    // disabled until the later B.6 rollback/smoke gate explicitly enables it.
    historyRangeSegmentsEnabled = false
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
    // Android keeps a monotonic selection generation for local A/B
    // isolation.  It is intentionally independent from the Gateway's own
    // per-connection generation (which starts over after a reconnect or a
    // server restart).  When the client advertises its generation on
    // set_active_conversation, retain it as the request fence without
    // forcing the server cycle counter to use the same number.
    const _ipcClientSelectionGenerations = new WeakMap();
    /** @type {Map<import('ws').WebSocket, boolean>} */
    const _ipcFollowerModes = new Map();
    /** @type {Map<string, string>} */
    const _ipcConversationLastStatus = new Map();
    /** @type {Map<string, { generation: number, startedAt: number, surface: object | null, receivedAt: number | null, surfaceInvalidatedReason: string | null, reason: string }>} */
    const _ipcConversationSubscriptionCycles = new Map();
    /** @type {Map<string, Set<{ finish: (surface: object | null) => void }>>} */
    const _ipcSurfaceWaiters = new Map();
    /** @type {WeakMap<import('ws').WebSocket, { conversationId: string, selectionGeneration: number, startedAt: number, deadlineAt: number, deadlineTimer: NodeJS.Timeout | null, subscriptionGeneration: number | null, surfaceReceivedAt: number | null, recoveryInFlight: boolean, fullRecoveryAttempted: boolean, recoveryState: string, activeRecoverySyncId: string | null, deadlineReached: boolean }>} */
    const _ipcHistorySelectionCycles = new WeakMap();
    /** @type {WeakMap<import('ws').WebSocket, { syncId: string | null, conversationId: string, selectionGeneration: number, clientSelectionGeneration: number }>} */
    const _ipcHistorySyncContexts = new WeakMap();
    /** @type {WeakMap<import('ws').WebSocket, { waiter: { promise: Promise<unknown>, detach: () => boolean }, conversationId: string, selectionGeneration: number, syncId: string | null }>} */
    const _ipcHistoryRecoveryWaiters = new WeakMap();
    /** @type {Set<string>} */
    const _followerSendInFlight = new Set();
    /** @type {Map<string, { conversationId: string, status: 'resolving'|'started', authority?: string, turnId?: string | null, successType?: string }>} */
    const _followerRequestLedger = new Map();
    /** @type {Set<string>} */
    /** @type {Map<string, { conversationId: string, turnId: string | null, authority: 'ipc' | 'owner', status: string, cycleGeneration: number | null }>} */
    const _authorityLedger = new Map();
    /** @type {Set<string>} */
    const _ownerReadStateBroadcasted = new Set();
    /** @type {Map<string, Set<'created'|'first-turn'|'terminal'>>} */
    const _ownerDiscoveryInvalidationStages = new Map();
    /** @type {Set<string>} */
    const _ownerFollowerStatusRequested = new Set();
    /** @type {Map<string, string[]>} */
    const _followerAttachmentTempFiles = new Map();
    /** @type {Map<string, { sessionId: string, conversationId: string | null, reason: string, draft: object, forkAvailable: boolean }>} */
    const _pendingThreadRecoveries = new Map();
    /** @type {Map<string, { ws: import('ws').WebSocket, clientRequestId: string | null }>} */
    const _pendingOwnerGoalStarts = new Map();
    /** @type {Array<() => void>} */
    const _ipcRequestHandlerDisposers = [];
    const _conversationCatalogFingerprints = new Map();
    // Derived mobile projections can be expensive for a large surface. Keep
    // one in-flight projection per client/conversation and replace only the
    // pending value when the IPC host emits another revision. A lightweight
    // deadline projection keeps live IPC progress visible while the expensive
    // media projection remains bounded.
    const _mobileSurfaceProjectionQueues = new WeakMap();
    const mobileProjectionDeadlineMs = Number.isFinite(Number(mobileSurfaceMaxVisibleLatencyMs))
        ? Math.max(1, Number(mobileSurfaceMaxVisibleLatencyMs))
        : MOBILE_SURFACE_MAX_VISIBLE_LATENCY_MS;
    const snapshotScheduler = new CodexWsSnapshotScheduler({
        intervalMs: CODEX_SNAPSHOT_FLUSH_INTERVAL_MS,
        isStillActive: (ws, conversationId, selectionGeneration) => (
            _ipcActiveConversations.get(ws) === conversationId &&
            (_ipcSelectionGenerations.get(ws) || 0) === selectionGeneration
        ),
        onOversize: (ws, envelope) => {
            diagnosticLog.event('server', 'server.codex.ws.envelope_rejected', {
                clientType: ws?.codexClientType || null,
                type: envelope?.type || null,
                limitBytes: MAX_WS_ENVELOPE_BYTES
            }, 'warn');
            snapshotScheduler.sendControl(ws, buildOversizeEnvelopeError(envelope));
        }
    });
    const _surfaceBaselineRevisions = new Map();
    const _surfaceBaselinePromises = new Map();
    const _surfaceBaselineQueues = new Map();
    const normalizedHistorySelectionDeadlineMs = Number.isFinite(Number(historySelectionDeadlineMs))
        ? Math.max(1, Number(historySelectionDeadlineMs))
        : HISTORY_SELECTION_DEADLINE_MS;
    const normalizedHistorySettlementMarginMs = Number.isFinite(Number(historySettlementMarginMs))
        ? Math.max(0, Number(historySettlementMarginMs))
        : HISTORY_SETTLEMENT_MARGIN_MS;

    const _offerSurfaceSnapshot = (client, conversationId, surface, options = {}) => {
        if (client?.codexClientType !== 'android') {
            snapshotScheduler.offer(
                client,
                conversationId,
                { type: 'conversation_surface_snapshot', conversationId, snapshot: surface },
                options
            );
            return;
        }
        let queues = _mobileSurfaceProjectionQueues.get(client);
        if (!queues) {
            queues = new Map();
            _mobileSurfaceProjectionQueues.set(client, queues);
        }
        let projectionState = queues.get(conversationId);
        if (!projectionState) {
            let closed = false;
            let latestEntry = null;
            let nextRevision = 0;
            let lastPublishedRevision = 0;
            let lastPublishedQuality = 0;
            let unpublishedSince = null;
            let deadlineTimer = null;
            let deadlineProjectionActive = false;

            const clearDeadlineTimer = () => {
                if (!deadlineTimer) return;
                clearTimeout(deadlineTimer);
                deadlineTimer = null;
            };

            const publishProjected = (entry, projected, quality) => {
                if (closed || !entry) return false;
                const qualityRank = quality === 'full' ? 2 : 1;
                if (entry.revision < lastPublishedRevision) return false;
                if (entry.revision === lastPublishedRevision && qualityRank <= lastPublishedQuality) return false;

                const isIntermediate = entry.revision < (latestEntry?.revision || entry.revision);
                const deadlineImminent = unpublishedSince !== null &&
                    Date.now() + CODEX_SNAPSHOT_FLUSH_INTERVAL_MS >=
                        unpublishedSince + mobileProjectionDeadlineMs;
                const accepted = snapshotScheduler.offer(
                    client,
                    conversationId,
                    { type: 'conversation_surface_snapshot', conversationId, snapshot: projected },
                    {
                        ...entry.options,
                        // A completed intermediate result and a deadline
                        // fallback must cross the downstream coalescer now;
                        // otherwise the scheduler could recreate starvation.
                        priority: quality === 'deadline' || isIntermediate || deadlineImminent
                            ? 'terminal'
                            : entry.options?.priority
                    }
                );
                if (!accepted) return false;

                if (entry.revision > lastPublishedRevision) {
                    lastPublishedRevision = entry.revision;
                    lastPublishedQuality = qualityRank;
                } else {
                    // A full projection may enrich a deadline fallback for the
                    // same IPC revision, but no lower revision may ever return.
                    lastPublishedQuality = qualityRank;
                }
                if (!latestEntry || lastPublishedRevision >= latestEntry.revision) {
                    unpublishedSince = null;
                    clearDeadlineTimer();
                }
                return true;
            };

            const scheduleVisibleDeadline = () => {
                if (closed || deadlineTimer || deadlineProjectionActive) return;
                if (!latestEntry || latestEntry.revision <= lastPublishedRevision) return;
                unpublishedSince ??= latestEntry.receivedAt;
                const delayMs = Math.max(0, unpublishedSince + mobileProjectionDeadlineMs - Date.now());
                deadlineTimer = setTimeout(() => {
                    deadlineTimer = null;
                    const candidate = latestEntry;
                    if (closed || !candidate || candidate.revision <= lastPublishedRevision) return;
                    deadlineProjectionActive = true;
                    void mobileSurfaceProjector(candidate.surface, {
                        mediaStore: null,
                        redactInlineMedia: true
                    }).then((projected) => {
                        const published = publishProjected(candidate, projected, 'deadline');
                        if (published) {
                            diagnosticLog.event('server', 'server.codex.media.projection_deadline_fallback', {
                                conversationKey: diagnosticKey(conversationId),
                                clientType: client.codexClientType,
                                projectionRevision: candidate.revision,
                                maxVisibleLatencyMs: mobileProjectionDeadlineMs
                            }, 'warn');
                        }
                    }).catch((error) => {
                        diagnosticLog.error('server', 'server.codex.media.project_failed', error, {
                            conversationKey: diagnosticKey(conversationId),
                            clientType: client.codexClientType,
                            projectionKind: 'deadline'
                        });
                    }).finally(() => {
                        deadlineProjectionActive = false;
                        scheduleVisibleDeadline();
                    });
                }, delayMs);
                if (typeof deadlineTimer.unref === 'function') deadlineTimer.unref();
            };

            const queue = createLatestOnlyAsyncQueue(async (entry) => {
                let projected;
                let quality = 'full';
                try {
                    projected = await mobileSurfaceProjector(entry.surface, { mediaStore });
                } catch (error) {
                    diagnosticLog.error('server', 'server.codex.media.project_failed', error, {
                        conversationKey: diagnosticKey(conversationId),
                        clientType: client.codexClientType
                    });
                    quality = 'deadline';
                    projected = await mobileSurfaceProjector(entry.surface, {
                        mediaStore: null,
                        redactInlineMedia: true
                    });
                }
                publishProjected(entry, projected, quality);
                scheduleVisibleDeadline();
            });

            projectionState = {
                offer(nextSurface, nextOptions) {
                    if (closed) return;
                    const entry = {
                        surface: nextSurface,
                        options: nextOptions,
                        revision: ++nextRevision,
                        receivedAt: Date.now()
                    };
                    latestEntry = entry;
                    unpublishedSince ??= entry.receivedAt;
                    scheduleVisibleDeadline();
                    void queue.enqueue(entry).catch((error) => {
                        diagnosticLog.error('server', 'server.codex.media.project_failed', error, {
                            conversationKey: diagnosticKey(conversationId),
                            clientType: client.codexClientType
                        });
                    });
                },
                close() {
                    closed = true;
                    clearDeadlineTimer();
                    queue.close();
                }
            };
            queues.set(conversationId, projectionState);
        }
        projectionState.offer(surface, options);
    };

    const _shouldPreserveRecoveryBaseline = (baseline, incomingSurface) => {
        if (!baseline || baseline.sourceKind !== 'history_recovery') return false;
        // An owner/IPC surface is a bounded live tail. It is never allowed to
        // replace a full recovery baseline; the live tail is delivered through
        // conversation_surface_snapshot separately. A later explicit recovery
        // request can refresh this static baseline when needed.
        return incomingSurface?.historyBaselineComplete !== true;
    };

    const _registerSurfaceBaseline = (conversationId, surface, sourceKind = 'ipc_surface') => {
        if (surface?.desynced === true) {
            return Promise.resolve({ skipped: true, reason: 'desynced_surface' });
        }
        const existingBaseline = historySyncService?.getBaseline(conversationId);
        if (_shouldPreserveRecoveryBaseline(existingBaseline, surface)) {
            diagnosticLog.event('server', 'server.codex.history.baseline_preserved', {
                conversationKey: diagnosticKey(conversationId),
                existingSourceKind: existingBaseline.sourceKind,
                existingItemCount: Array.isArray(existingBaseline.items) ? existingBaseline.items.length : 0,
                incomingSourceKind: sourceKind,
                incomingItemCount: Array.isArray(surface?.items) ? surface.items.length : 0,
                reason: 'realtime_surface_cannot_replace_recovery_baseline'
            }, 'info');
            return Promise.resolve({ skipped: true, preserved: true });
        }
        const revision = (_surfaceBaselineRevisions.get(conversationId) || 0) + 1;
        _surfaceBaselineRevisions.set(conversationId, revision);
        let queue = _surfaceBaselineQueues.get(conversationId);
        if (!queue) {
            queue = createLatestOnlyAsyncQueue(async ({ surface: pendingSurface, sourceKind: pendingSourceKind, revision: pendingRevision }) => {
                const sourceData = {
                    turns: [{
                        id: pendingSurface?.latestTurnId || 'surface',
                        status: pendingSurface?.status,
                        items: Array.isArray(pendingSurface?.items) ? pendingSurface.items : []
                    }]
                };
                const projected = mediaStore
                    ? await projectMobileSurface(sourceData, { mediaStore })
                    : sourceData;
                if (_surfaceBaselineRevisions.get(conversationId) !== pendingRevision) return;
                if (mediaStore && containsImageDataUrl(projected)) {
                    const error = new Error('IPC surface still contains an image data URL after projection.');
                    error.code = 'HISTORY_MEDIA_NOT_EXTERNALIZED';
                    throw error;
                }
                const currentBaseline = historySyncService.getBaseline(conversationId);
                if (_shouldPreserveRecoveryBaseline(currentBaseline, pendingSurface)) {
                    diagnosticLog.event('server', 'server.codex.history.baseline_preserved', {
                        conversationKey: diagnosticKey(conversationId),
                        existingSourceKind: currentBaseline.sourceKind,
                        existingItemCount: Array.isArray(currentBaseline.items) ? currentBaseline.items.length : 0,
                        incomingSourceKind: pendingSourceKind,
                        incomingItemCount: Array.isArray(pendingSurface?.items) ? pendingSurface.items.length : 0,
                        reason: 'realtime_projection_completed_after_recovery'
                    }, 'info');
                    return;
                }
                historySyncService.registerBaseline(conversationId, pendingSourceKind, projected, {
                    complete: pendingSurface?.historyBaselineComplete === true,
                    sourceEpoch: pendingSurface?.sourceEpoch
                });
                diagnosticLog.event('server', 'server.codex.history.baseline_registered', {
                    conversationKey: diagnosticKey(conversationId),
                    sourceKind: pendingSourceKind,
                    itemCount: Array.isArray(projected?.turns)
                        ? projected.turns.reduce((count, turn) => count + (Array.isArray(turn?.items) ? turn.items.length : 0), 0)
                        : 0,
                    complete: pendingSurface?.historyBaselineComplete === true
                }, 'info');
            });
            _surfaceBaselineQueues.set(conversationId, queue);
        }
        const promise = queue.enqueue({ surface, sourceKind, revision });
        _surfaceBaselinePromises.set(conversationId, { revision, promise });
        void promise.catch((error) => diagnosticLog.error('server', 'server.codex.history.baseline_projection_failed', error, {
            conversationKey: diagnosticKey(conversationId),
            sourceKind
        })).finally(() => {
            const pending = _surfaceBaselinePromises.get(conversationId);
            if (pending?.revision === revision) _surfaceBaselinePromises.delete(conversationId);
        });
        return promise;
    };
    const _awaitSurfaceBaseline = async (conversationId) => {
        const existing = historySyncService.getBaseline(conversationId);
        if (existing) return existing;
        const pending = _surfaceBaselinePromises.get(conversationId);
        if (!pending) return historySyncService.getBaseline(conversationId);
        try {
            await pending.promise;
        } catch (_) {
            // The caller will receive the bounded recovery code below. The
            // projection error is already recorded without exposing payloads.
        }
        return historySyncService.getBaseline(conversationId);
    };
    const historySyncService = new CodexHistorySyncService({
        isStillActive: (ws, conversationId, selectionGeneration) => (
            _ipcActiveConversations.get(ws) === conversationId &&
            (_ipcSelectionGenerations.get(ws) || 0) === selectionGeneration
        ),
        send: (ws, envelope) => {
            if (envelope?.type === 'conversation_history_sync_state') {
                const syncState = typeof envelope.state === 'string' ? envelope.state.trim().toLowerCase() : '';
                if (['synced', 'live', 'partial', 'cache_only', 'failed', 'offline', 'unsupported'].includes(syncState)) {
                    const context = _ipcHistorySyncContexts.get(ws);
                    if (context && context.syncId === (envelope.syncId || null)) {
                        _ipcHistorySyncContexts.delete(ws);
                    }
                }
            }
            diagnosticLog.event('server', 'server.codex.history.outbound', {
                conversationKey: diagnosticKey(envelope?.conversationId),
                type: envelope?.type || null,
                syncId: envelope?.syncId || null,
                pageIndex: Number.isInteger(envelope?.pageIndex) ? envelope.pageIndex : null,
                pageCount: Number.isInteger(envelope?.pageCount) ? envelope.pageCount : null,
                pageHash: typeof envelope?.pageHash === 'string' ? envelope.pageHash.slice(0, 16) : null,
                targetRoot: typeof envelope?.targetRoot === 'string' ? envelope.targetRoot.slice(0, 16) : null,
                baseRoot: typeof envelope?.baseRoot === 'string' ? envelope.baseRoot.slice(0, 16) : null,
                baselineComplete: envelope?.baselineComplete === true,
                fullOrderIncluded: envelope?.fullOrderIncluded === true,
                canonicalOrderCount: Array.isArray(envelope?.canonicalOrder) ? envelope.canonicalOrder.length : 0,
                upsertCount: Array.isArray(envelope?.upserts) ? envelope.upserts.length : 0,
                chunkBytes: typeof envelope?.data === 'string' ? Buffer.byteLength(envelope.data, 'utf8') : 0
            }, 'info');
            if (envelope.type === 'conversation_history_delta' || envelope.type === 'conversation_history_payload_chunk') {
                sendWsEnvelope(ws, envelope);
            } else {
                snapshotScheduler.sendControl(ws, envelope);
            }
        }
    });
    const requestHistoryThread = (conversationId, includeTurns, options = {}) => {
        const requestedTimeout = Number(options?.timeoutMs);
        const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
            ? Math.max(1, requestedTimeout)
            : HISTORY_RECOVERY_TIMEOUT_MS + 1_000;
        return codexService.request('thread/read', {
            threadId: conversationId,
            includeTurns
        }, timeoutMs);
    };
    const requestHistoryTurns = async (conversationId, options = {}) => {
        const requestedTimeout = Number(options?.timeoutMs);
        const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
            ? Math.max(1, requestedTimeout)
            : HISTORY_RECOVERY_TIMEOUT_MS + 1_000;
        const requestedLimit = Number(options?.limit);
        const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : 100;
        const params = {
            threadId: conversationId,
            limit,
            sortDirection: options?.sortDirection === 'asc' ? 'asc' : 'desc',
            itemsView: options?.itemsView === 'summary' || options?.itemsView === 'notLoaded'
                ? options.itemsView
                : 'full'
        };
        if (Object.prototype.hasOwnProperty.call(options, 'cursor') && options.cursor !== null && options.cursor !== undefined) {
            params.cursor = options.cursor;
        }
        const response = await codexService.request('thread/turns/list', params, timeoutMs);
        // The app-server turns-list response is commonly just {data,nextCursor}
        // and therefore has no identity field.  The request itself is scoped
        // to this exact thread; add that identity only when the upstream did
        // not provide one, while preserving a contradictory upstream identity
        // so the provider can fail closed.
        if (response && typeof response === 'object' && !Array.isArray(response)) {
            const hasIdentity = [
                response.threadId,
                response.thread_id,
                response.conversationId,
                response.conversation_id,
                response.thread?.id,
                response.thread?.threadId
            ].some((value) => typeof value === 'string' && value.trim());
            if (!hasIdentity) return { ...response, threadId: conversationId };
        }
        return response;
    };
    const historyBaselineProvider = new CodexHistoryBaselineProvider({
        probeThread: (conversationId, options) => requestHistoryThread(conversationId, false, options),
        readLegacyThread: (conversationId, options) => requestHistoryThread(conversationId, true, options),
        readPaginatedTurns: (conversationId, options) => requestHistoryTurns(conversationId, options),
        mediaStore
    });

    const _getHistorySelectionCycle = (ws) => _ipcHistorySelectionCycles.get(ws) || null;

    const _isCurrentHistorySelectionCycle = (ws, conversationId, selectionGeneration) => {
        const cycle = _getHistorySelectionCycle(ws);
        return Boolean(
            cycle &&
            cycle.conversationId === conversationId &&
            cycle.selectionGeneration === selectionGeneration &&
            _ipcActiveConversations.get(ws) === conversationId &&
            (_ipcSelectionGenerations.get(ws) || 0) === selectionGeneration
        );
    };

    const _clientSelectionGenerationMatches = (
        ws,
        hasClientSelectionGeneration,
        clientSelectionGeneration,
        currentSelectionGeneration
    ) => {
        if (!hasClientSelectionGeneration) return true;
        const expectedClientSelectionGeneration = _ipcClientSelectionGenerations.get(ws);
        // Older clients do not announce their local generation when they
        // select a conversation.  Keep the existing server-generation check
        // for those clients; upgraded Android clients are checked against the
        // generation announced with set_active_conversation so reconnects
        // remain valid even though the server counter starts over.
        const expected = Number.isSafeInteger(expectedClientSelectionGeneration)
            ? expectedClientSelectionGeneration
            : currentSelectionGeneration;
        return clientSelectionGeneration === expected;
    };

    const _clearHistorySelectionDeadlineTimer = (cycle) => {
        if (!cycle?.deadlineTimer) return;
        clearTimeout(cycle.deadlineTimer);
        cycle.deadlineTimer = null;
    };

    const _detachHistoryRecoveryWaiter = (ws) => {
        const pending = _ipcHistoryRecoveryWaiters.get(ws);
        if (!pending) return false;
        _ipcHistoryRecoveryWaiters.delete(ws);
        try {
            pending.waiter?.detach?.();
        } catch (_) {
            // A detached waiter is already selection-quarantined.  The
            // service owns the shared producer and decides whether it can
            // still be aborted after other clients detach.
        }
        return true;
    };

    const _cancelHistorySelectionCycle = (ws, reason = 'selection-changed') => {
        const cycle = _getHistorySelectionCycle(ws);
        if (!cycle) {
            _detachHistoryRecoveryWaiter(ws);
            _ipcHistorySyncContexts.delete(ws);
            historySyncService.cancel(ws);
            return;
        }
        cycle.cancelled = true;
        _clearHistorySelectionDeadlineTimer(cycle);
        _detachHistoryRecoveryWaiter(ws);
        _ipcHistorySyncContexts.delete(ws);
        historySyncService.cancel(ws);
        _ipcHistorySelectionCycles.delete(ws);
        diagnosticLog.event('server', 'server.codex.history.selection_cycle.cancelled', {
            conversationKey: diagnosticKey(cycle.conversationId),
            selectionGeneration: cycle.selectionGeneration,
            reason
        }, 'info');
    };

    const _remainingHistorySelectionBudget = (cycle) => {
        if (!cycle) return 0;
        return Math.max(0, cycle.deadlineAt - Date.now());
    };

    const _sendHistoryRecoveryState = (ws, {
        syncId = null,
        conversationId,
        state,
        detailCode,
        selectionGeneration,
        clientSelectionGeneration = selectionGeneration,
        rootHash,
        itemCount,
        complete
    }) => {
        sendWsEnvelope(ws, {
            type: 'conversation_history_recovery_state',
            syncId: syncId || null,
            conversationId,
            state,
            ...(detailCode ? { detailCode } : {}),
            ...(rootHash ? { rootHash } : {}),
            ...(Number.isSafeInteger(itemCount) ? { itemCount } : {}),
            ...(typeof complete === 'boolean' ? { complete } : {}),
            selectionGeneration,
            clientSelectionGeneration
        });
    };

    const _sendHistorySyncFailure = (ws, context, detailCode) => {
        if (!context) return;
        const clientSelectionGeneration = Number.isSafeInteger(context.clientSelectionGeneration)
            ? context.clientSelectionGeneration
            : context.selectionGeneration;
        sendWsEnvelope(ws, {
            type: 'conversation_history_sync_state',
            syncId: context.syncId || null,
            conversationId: context.conversationId,
            state: 'failed',
            detailCode,
            selectionGeneration: context.selectionGeneration,
            clientSelectionGeneration
        });
    };

    const _handleHistorySelectionDeadline = (ws, cycle) => {
        if (_getHistorySelectionCycle(ws) !== cycle || cycle.cancelled || cycle.deadlineReached) return;
        cycle.deadlineReached = true;
        cycle.recoveryState = 'failed';
        _clearHistorySelectionDeadlineTimer(cycle);

        const pendingRecovery = _ipcHistoryRecoveryWaiters.get(ws);
        if (
            pendingRecovery &&
            pendingRecovery.conversationId === cycle.conversationId &&
            pendingRecovery.selectionGeneration === cycle.selectionGeneration
        ) {
            _detachHistoryRecoveryWaiter(ws);
            _sendHistoryRecoveryState(ws, {
                syncId: pendingRecovery.syncId,
                conversationId: cycle.conversationId,
                state: 'failed',
                detailCode: 'history_recovery_timeout',
                selectionGeneration: cycle.selectionGeneration
            });
        }

        const syncContext = _ipcHistorySyncContexts.get(ws);
        if (
            syncContext &&
            syncContext.conversationId === cycle.conversationId &&
            syncContext.selectionGeneration === cycle.selectionGeneration
        ) {
            historySyncService.cancel(ws);
            _ipcHistorySyncContexts.delete(ws);
            _sendHistorySyncFailure(ws, syncContext, 'history_selection_deadline');
        }

        diagnosticLog.event('server', 'server.codex.history.selection_cycle.deadline', {
            conversationKey: diagnosticKey(cycle.conversationId),
            selectionGeneration: cycle.selectionGeneration,
            deadlineMs: normalizedHistorySelectionDeadlineMs,
            hadPendingRecovery: Boolean(pendingRecovery),
            hadPendingSync: Boolean(syncContext)
        }, 'warn');
    };

    const _beginHistorySelectionCycle = (ws, conversationId, selectionGeneration) => {
        _cancelHistorySelectionCycle(ws, 'new-selection');
        const subscriptionCycle = _ipcConversationSubscriptionCycles.get(conversationId);
        const startedAt = Date.now();
        const cycle = {
            conversationId,
            selectionGeneration,
            startedAt,
            deadlineAt: startedAt + normalizedHistorySelectionDeadlineMs,
            deadlineTimer: null,
            subscriptionGeneration: subscriptionCycle?.generation ?? null,
            surfaceReceivedAt: subscriptionCycle?.surface ? Date.now() : null,
            recoveryInFlight: false,
            fullRecoveryAttempted: false,
            recoveryState: subscriptionCycle?.surface ? 'healthy' : 'awaiting_surface',
            activeRecoverySyncId: null,
            recoverySupersededBySurface: false,
            deadlineReached: false,
            cancelled: false
        };
        cycle.deadlineTimer = setTimeout(() => _handleHistorySelectionDeadline(ws, cycle), normalizedHistorySelectionDeadlineMs);
        if (typeof cycle.deadlineTimer.unref === 'function') cycle.deadlineTimer.unref();
        _ipcHistorySelectionCycles.set(ws, cycle);
        diagnosticLog.event('server', 'server.codex.history.selection_cycle.started', {
            conversationKey: diagnosticKey(conversationId),
            selectionGeneration,
            subscriptionGeneration: cycle.subscriptionGeneration,
            graceMs: ipcSurfaceWaitGraceMs,
            deadlineMs: normalizedHistorySelectionDeadlineMs,
            ipcOnline: _isIpcOnline()
        }, 'info');
        return cycle;
    };

    const _markHistorySelectionSurface = (conversationId, receivedAt = Date.now()) => {
        for (const [ws, activeConversationId] of _ipcActiveConversations.entries()) {
            if (activeConversationId !== conversationId) continue;
            const cycle = _getHistorySelectionCycle(ws);
            if (!cycle || cycle.conversationId !== conversationId || cycle.deadlineReached) continue;
            cycle.surfaceReceivedAt = receivedAt;
            if (cycle.recoveryState === 'awaiting_surface' || cycle.recoveryState === 'waiting_grace') {
                cycle.recoveryState = 'healthy';
            } else if (cycle.recoveryState === 'recovering') {
                // A healthy surface supersedes an in-flight canonical waiter.
                // Detaching this selection prevents the shared producer from
                // registering its late result when no other client needs it;
                // another selection may still keep the shared producer alive.
                cycle.recoveryState = 'healthy';
                cycle.recoverySupersededBySurface = true;
                const pending = _ipcHistoryRecoveryWaiters.get(ws);
                if (
                    pending?.conversationId === conversationId &&
                    pending.selectionGeneration === cycle.selectionGeneration
                ) {
                    _detachHistoryRecoveryWaiter(ws);
                }
            }
        }
    };

    const _awaitHistoryRecoveryResult = (waiter, timeoutMs) => new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            try {
                waiter.detach();
            } catch (_) {
                // The waiter may already be settled; the timeout still
                // quarantines this selection from accepting its result.
            }
            reject(createHistoryRecoveryTimeoutError());
        }, Math.max(1, timeoutMs));
        if (typeof timer.unref === 'function') timer.unref();
        waiter.promise.then(
            (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result);
            },
            (error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(error);
            }
        );
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
                    syncInactivityTimeoutMs: 30_000,
                    recovery: true,
                    selectionGeneration: true,
                    perPageAck: true,
                    payloadChunks: true,
                    payloadChunkMaxBytes: 128 * 1024,
                    maxEnvelopeBytes: 256 * 1024,
                    rangeSegments: {
                        enabled: historyRangeSegmentsEnabled === true,
                        version: 1,
                        cacheSchemaVersion: 3
                    }
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
            surfaceInvalidatedReason: null,
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

    /**
     * Stop derived baseline work once the last Android follower leaves a
     * conversation. The registered history baseline remains available for
     * bounded recovery; only queued/in-flight projection work is retired.
     * Keep the revision counter monotonic so a late promise from the retired
     * queue cannot match the first revision of a newly-created A→B→A queue.
     */
    const _disposeSurfaceBaselineQueue = (conversationId) => {
        if (!isNonEmptyString(conversationId)) return;
        const normalizedConversationId = conversationId.trim();
        const queue = _surfaceBaselineQueues.get(normalizedConversationId);
        if (queue) {
            queue.close();
            _surfaceBaselineQueues.delete(normalizedConversationId);
        }
        _surfaceBaselinePromises.delete(normalizedConversationId);
    };

    const _releaseActiveIpcConversation = (ws) => {
        const conversationId = _ipcActiveConversations.get(ws);
        snapshotScheduler.dispose(ws);
        _ipcSelectionGenerations.delete(ws);
        _cancelHistorySelectionCycle(ws, 'active-conversation-released');
        const projectionQueues = _mobileSurfaceProjectionQueues.get(ws);
        if (conversationId && projectionQueues) {
            projectionQueues.get(conversationId)?.close();
            projectionQueues.delete(conversationId);
        }
        if (!conversationId) return;
        _ipcActiveConversations.delete(ws);
        _unfollowIpcConversation(conversationId);
        if (_activeIpcSubscriberCount(conversationId) === 0) {
            _disposeSurfaceBaselineQueue(conversationId);
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
        const cycle = _ipcConversationSubscriptionCycles.get(conversationId.trim());
        return cycle?.surfaceInvalidatedReason ? null : cycle?.surface || null;
    };

    const _recordCurrentCycleIpcSnapshot = (conversationId, surface) => {
        if (!isNonEmptyString(conversationId) || !surface || typeof surface !== 'object') return false;
        const normalizedConversationId = conversationId.trim();
        const cycle = _ipcConversationSubscriptionCycles.get(normalizedConversationId);
        if (!cycle || _activeIpcSubscriberCount(normalizedConversationId) === 0) return false;
        if (surface.desynced === true) {
            cycle.surface = null;
            cycle.receivedAt = null;
            cycle.surfaceInvalidatedReason = 'desynced';
            for (const [ws, activeConversationId] of _ipcActiveConversations.entries()) {
                if (activeConversationId !== normalizedConversationId) continue;
                const selectionCycle = _getHistorySelectionCycle(ws);
                if (!selectionCycle || selectionCycle.conversationId !== normalizedConversationId) continue;
                selectionCycle.surfaceReceivedAt = null;
                if (!selectionCycle.deadlineReached && selectionCycle.recoveryState !== 'recovering') {
                    selectionCycle.recoveryState = 'desynced';
                }
            }
            diagnosticLog.event('server', 'server.ipc.subscription_cycle.desynced_surface_ignored', {
                conversationKey: diagnosticKey(normalizedConversationId),
                generation: cycle.generation,
                status: isNonEmptyString(surface.status) ? surface.status.trim() : 'unknown'
            }, 'warn');
            return false;
        }
        cycle.surface = { ...surface, desynced: false };
        cycle.receivedAt = Date.now();
        cycle.surfaceInvalidatedReason = null;
        _markHistorySelectionSurface(normalizedConversationId, cycle.receivedAt);
        _finishIpcSurfaceWaiters(normalizedConversationId, cycle.surface);
        diagnosticLog.event('server', 'server.ipc.subscription_cycle.surface_received', {
            conversationKey: diagnosticKey(normalizedConversationId),
            generation: cycle.generation,
            waitMs: Math.max(0, cycle.receivedAt - cycle.startedAt),
            status: isNonEmptyString(surface.status) ? surface.status.trim() : 'unknown'
        }, 'info');
        return true;
    };

    const _waitForCurrentCycleIpcSnapshot = (ws, conversationId, graceStartedAt = null) => {
        const normalizedConversationId = isNonEmptyString(conversationId) ? conversationId.trim() : '';
        const cycle = normalizedConversationId
            ? _ipcConversationSubscriptionCycles.get(normalizedConversationId)
            : null;
        if (!cycle) return Promise.resolve(null);
        if (cycle.surface) return Promise.resolve(cycle.surface);
        const waitStartedAt = graceStartedAt !== null && graceStartedAt !== undefined && Number.isFinite(Number(graceStartedAt))
            ? Number(graceStartedAt)
            : cycle.startedAt;
        const remainingMs = Math.max(0, ipcSurfaceWaitGraceMs - (Date.now() - waitStartedAt));
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

    const _hasHealthyExternalIpcSurface = (conversationId) => {
        const surface = _getLatestIpcSnapshot(conversationId);
        if (!surface || typeof surface !== 'object' || surface.desynced === true) return false;
        return String(surface.ownerKind || '').trim().toLowerCase() !== 'termlink';
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
            _offerSurfaceSnapshot(client, conversationId, surface, {
                priority: isTerminalSurface(surface) ? 'terminal' : 'normal',
                selectionGeneration: _ipcSelectionGenerations.get(client) || 0
            });
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

    const _requestOwnerFollowerStatus = (conversationId) => {
        if (
            !ipcFeed ||
            !_isIpcOnline() ||
            !ownerSurfaceTracker.hasConversation(conversationId) ||
            _ownerFollowerStatusRequested.has(conversationId)
        ) {
            return false;
        }
        try {
            const sent = ipcFeed.sendBroadcast('thread-stream-following-status-requested', {
                conversationId,
                hostId: 'local'
            });
            if (sent !== false) _ownerFollowerStatusRequested.add(conversationId);
            return sent !== false;
        } catch (error) {
            diagnosticLog.error('server', 'server.codex.owner.follower_status_request_failed', error, {
                conversationKey: diagnosticKey(conversationId)
            });
            return false;
        }
    };

    const _handleIpcBroadcast = (message) => {
        if (!message || typeof message !== 'object') return;
        if (message.method === 'thread-stream-following-changed') {
            const params = message.params && typeof message.params === 'object' ? message.params : {};
            const conversationId = isNonEmptyString(params.conversationId)
                ? params.conversationId.trim()
                : null;
            const sourceClientId = isNonEmptyString(message.sourceClientId)
                ? message.sourceClientId.trim()
                : null;
            if (
                params.hostId !== 'local' ||
                typeof params.following !== 'boolean' ||
                !conversationId ||
                !sourceClientId ||
                sourceClientId === ipcFeed?.clientId ||
                !ownerSurfaceTracker.hasConversation(conversationId)
            ) {
                return;
            }
            ownerSurfaceTracker.setFollower(conversationId, sourceClientId, params.following);
            if (params.following === false) return;
            const event = ownerSurfaceTracker.peekSnapshot(conversationId);
            if (!event?.payload) return;
            try {
                ipcFeed.sendBroadcast('thread-stream-state-changed', event.payload, {
                    targetClientIds: [sourceClientId]
                });
                diagnosticLog.event('server', 'server.codex.owner.follower_snapshot', {
                    conversationKey: diagnosticKey(conversationId),
                    followerClientIdPresent: true,
                    revision: event.payload.change?.revision
                });
            } catch (error) {
                diagnosticLog.error('server', 'server.codex.owner.follower_snapshot_failed', error, {
                    conversationKey: diagnosticKey(conversationId),
                    followerClientIdPresent: true
                });
            }
            return;
        }
        if (message.method === 'client-status-changed') {
            const params = message.params && typeof message.params === 'object' ? message.params : {};
            if (params.status === 'disconnected' && isNonEmptyString(params.clientId)) {
                ownerSurfaceTracker.removeFollowerClient(params.clientId);
            }
            return;
        }
        if (message.method === 'ipc-connection-reset') {
            ownerSurfaceTracker.clearFollowers();
            _ownerFollowerStatusRequested.clear();
        }
    };

    if (ipcFeed) {
        ipcFeed.on('broadcast', _handleIpcBroadcast);
        ipcFeed.on('status', (status) => {
            const isOnline = status?.online === true;
            if (!isOnline) {
                ownerSurfaceTracker.clearFollowers();
                _ownerFollowerStatusRequested.clear();
                for (const [ws, conversationId] of _ipcActiveConversations.entries()) {
                    const subscriptionCycle = _ipcConversationSubscriptionCycles.get(conversationId);
                    if (subscriptionCycle) {
                        subscriptionCycle.surface = null;
                        subscriptionCycle.receivedAt = null;
                        subscriptionCycle.surfaceInvalidatedReason = 'offline';
                    }
                    const cycle = _getHistorySelectionCycle(ws);
                    if (cycle?.conversationId === conversationId && !cycle.deadlineReached) {
                        cycle.surfaceReceivedAt = null;
                        cycle.recoveryState = 'offline';
                    }
                    _finishIpcSurfaceWaiters(conversationId, null);
                }
            }
            if (isOnline && !_lastIpcOnline) {
                const activeConversationIds = new Set(_ipcActiveConversations.values());
                for (const conversationId of activeConversationIds) {
                    _beginIpcSubscriptionCycle(conversationId, 'ipc-reconnected');
                }
                for (const { conversationId } of ownerSurfaceTracker.getRecentSnapshots()) {
                    _requestOwnerFollowerStatus(conversationId);
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
            _registerSurfaceBaseline(conversationId, surface, 'ipc_surface');
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
        _registerSurfaceBaseline(event.conversationId, event.surface, 'ipc_surface');
        if (ipcFeed && _isIpcOnline() && typeof ipcFeed.sendBroadcast === 'function') {
            try {
                const followerClientIds = ownerSurfaceTracker.getFollowerClientIds(event.conversationId);
                if (followerClientIds.length > 0) {
                    ipcFeed.sendBroadcast('thread-stream-state-changed', event.payload, {
                        targetClientIds: followerClientIds
                    });
                } else {
                    _requestOwnerFollowerStatus(event.conversationId);
                }
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

    const _handleSetActiveConversation = (ws, session, conversationId, clientSelectionGeneration = null) => {
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
        const hasValidClientSelectionGeneration = Number.isSafeInteger(clientSelectionGeneration) &&
            clientSelectionGeneration >= 0;
        // A client may re-announce the same conversation after a local
        // selection generation advances (for example after resume).  Keep
        // the client fence current even when the server-side conversation
        // does not change; otherwise the next request would be compared to
        // the old generation and rejected as stale.
        if (hasValidClientSelectionGeneration) {
            _ipcClientSelectionGenerations.set(ws, clientSelectionGeneration);
        }
        if (previousActiveConversationId !== normalizedConversationId) {
            _cancelHistorySelectionCycle(ws, 'conversation-changed');
            const nextSelectionGeneration = (_ipcSelectionGenerations.get(ws) || 0) + 1;
            _ipcSelectionGenerations.set(ws, nextSelectionGeneration);
            if (!hasValidClientSelectionGeneration) {
                _ipcClientSelectionGenerations.delete(ws);
            }
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
            // A terminal Owner is only releasable when an external healthy
            // surface is already available. Without it, deleting the Owner
            // state would make A->B->A reopen with an empty history and force
            // the next fallback to rebuild an incomplete conversation state.
            if (
                !isFreshlyCreatedOwner &&
                _isOwnerSurfaceSafelyReleasable(ownerSurface) &&
                _hasHealthyExternalIpcSurface(normalizedConversationId)
            ) {
                ownerSurfaceTracker.releaseConversation(normalizedConversationId);
                _ownerFollowerStatusRequested.delete(normalizedConversationId);
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
            _beginHistorySelectionCycle(ws, normalizedConversationId, nextSelectionGeneration);
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
            _offerSurfaceSnapshot(
                ws,
                normalizedConversationId,
                latest,
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
                            turnConfig: options.turnConfig,
                            goalObjective: options.goalObjective
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
        let ownerGoalThreadId = conversationId;
        let pendingGoalStart = null;
        try {
            const threadId = await _ensureOwnerConversation(conversationId, latestSnapshot);
            ownerGoalThreadId = threadId;
            if (threadId !== conversationId) {
                const session = getSessionById(sessionManager, ws.sessionId);
                if (session) {
                    _handleSetActiveConversation(ws, session, threadId);
                }
            }
            diagnosticLog.event('server', 'server.codex.goal.set.requested', {
                conversationKey: diagnosticKey(threadId),
                clientRequestKey: diagnosticKey(options.clientRequestId),
                goalKey: diagnosticKey(objective),
                objectiveLength: objective.trim().length,
                authority: 'owner'
            });
            pendingGoalStart = {
                ws,
                clientRequestId: isNonEmptyString(options.clientRequestId)
                    ? options.clientRequestId.trim()
                    : null
            };
            _pendingOwnerGoalStarts.set(threadId, pendingGoalStart);
            while (_pendingOwnerGoalStarts.size > 128) {
                const oldestThreadId = _pendingOwnerGoalStarts.keys().next().value;
                if (!oldestThreadId) break;
                _pendingOwnerGoalStarts.delete(oldestThreadId);
            }
            await codexService.request('thread/goal/set', {
                threadId,
                objective: objective.trim(),
                status: 'active'
            });

            diagnosticLog.event('server', 'server.codex.goal.set.acknowledged', {
                conversationKey: diagnosticKey(threadId),
                clientRequestKey: diagnosticKey(options.clientRequestId),
                goalKey: diagnosticKey(objective),
                objectiveLength: objective.trim().length,
                authority: 'owner'
            });

            // Setting an active Goal schedules the first Goal turn itself. A second
            // explicit turn/start races that runtime and creates a parallel turn.
            // Keep the RPC acknowledgement separate from the authoritative turn
            // identity, which arrives through turn/started notification/surface.
            const turnId = null;
            _recordFollowerRequestStarted(
                options.requestKey,
                threadId,
                'owner',
                turnId,
                options.successType || 'follower_goal_sent'
            );
            sendWsEnvelope(ws, {
                type: options.successType || 'follower_goal_sent',
                conversationId: threadId,
                clientRequestId: options.clientRequestId,
                turnId,
                acknowledged: true
            });
        } catch (error) {
            if (_pendingOwnerGoalStarts.get(ownerGoalThreadId) === pendingGoalStart) {
                _pendingOwnerGoalStarts.delete(ownerGoalThreadId);
            }
            if (isThreadNotFoundError(error)) {
                diagnosticLog.error('server', 'server.codex.goal.set.failed', error, {
                    conversationKey: diagnosticKey(conversationId),
                    clientRequestKey: diagnosticKey(options.clientRequestId),
                    goalKey: diagnosticKey(objective),
                    objectiveLength: objective.trim().length,
                    authority: 'owner',
                    routeStage: 'owner-goal-recovery'
                });
                _sendThreadRecoveryRequired(ws, {
                    conversationId,
                    reason: 'thread_not_found',
                    clientRequestId: options.clientRequestId,
                    forkAvailable: false,
                    draft: {
                        transport: 'follower',
                        clientRequestId: options.clientRequestId,
                        input: `/goal ${objective.trim()}`,
                        options: {
                            attachments: options.attachments,
                            interactionState: options.interactionState,
                            collaborationMode: options.collaborationMode,
                            turnConfig: options.turnConfig,
                            goalObjective: objective.trim()
                        }
                    }
                });
                return;
            }
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
        if (isNonEmptyString(options.goalObjective)) {
            await _startOwnerGoal(ws, conversationId, options.goalObjective, latestSnapshot, options);
            return;
        }
        await _startOwnerTurn(ws, conversationId, input, latestSnapshot, options);
    };

    const _handleFollowerSendMessage = async (ws, conversationId, input, options = {}) => {
        const clientRequestId = isNonEmptyString(options.clientRequestId)
            ? options.clientRequestId.trim()
            : randomUUID();
        const normalizedInput = typeof input === 'string' ? input.trim() : '';
        const hasExplicitGoalIntent = options.goalObjective !== undefined || options.ownerGoalObjective !== undefined;
        const explicitGoalObjective = options.goalObjective !== undefined
            ? normalizeGoalObjective(options.goalObjective)
            : normalizeGoalObjective(options.ownerGoalObjective);
        const parsedGoalObjective = parseGoalObjective(normalizedInput);
        if (hasExplicitGoalIntent && !explicitGoalObjective) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Goal objective is empty',
                detail: 'Enter a goal objective before starting a goal.'
            });
            return;
        }
        if (explicitGoalObjective && parsedGoalObjective && explicitGoalObjective !== parsedGoalObjective) {
            diagnosticLog.event('server', 'server.codex.goal.intent.rejected', {
                conversationKey: diagnosticKey(conversationId),
                clientRequestKey: diagnosticKey(clientRequestId),
                reason: 'goal_intent_mismatch',
                explicitGoalKey: diagnosticKey(explicitGoalObjective),
                parsedGoalKey: diagnosticKey(parsedGoalObjective)
            }, 'warn');
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Goal objective does not match input',
                detail: 'The explicit goal objective must match the /goal input.'
            });
            return;
        }
        const goalObjective = hasExplicitGoalIntent ? explicitGoalObjective : null;
        options = {
            ...options,
            clientRequestId,
            goalObjective,
            ownerGoalObjective: goalObjective
        };
        const normalizedAttachments = normalizeTurnAttachments(options.attachments);
        const normalizedInteractionState = normalizeInteractionState(options.interactionState);
        diagnosticLog.event('server', 'server.ipc.follower_send.requested', {
            conversationKey: diagnosticKey(conversationId),
            inputLength: normalizedInput.length,
            clientRequestKey: diagnosticKey(clientRequestId),
            intentKind: goalObjective ? 'goal' : 'message',
            goalKey: diagnosticKey(goalObjective),
            objectiveLength: goalObjective ? goalObjective.length : 0,
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

            if (goalObjective) {
                const detailCode = 'GOAL_EXTERNAL_OWNER_UNSUPPORTED';
                diagnosticLog.event('server', 'server.codex.goal.intent.rejected', {
                    conversationKey: diagnosticKey(normalizedConversationId),
                    clientRequestKey: diagnosticKey(clientRequestId),
                    goalKey: diagnosticKey(goalObjective),
                    objectiveLength: goalObjective.length,
                    authority: 'ipc',
                    reason: 'external_owner_goal_unsupported'
                }, 'warn');
                _emitFollowerRouteState(ws, clientRequestId, normalizedConversationId, 'failed', {
                    authority: 'ipc',
                    detailCode
                });
                sendWsEnvelope(ws, {
                    type: 'error',
                    code: detailCode,
                    message: '该任务当前由 Desktop 或 VS Code 执行，现有协议不支持从 App 开启 Goal。',
                    detail: '请在原宿主开启，或在 App 中新建 Goal 任务。',
                    conversationId: normalizedConversationId,
                    clientRequestId,
                    goalObjective
                });
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
            goalObjective: goal.trim()
        });
    };

    const _handleFollowerGoalControl = async (ws, conversationId, action) => {
        const normalizedConversationId = isNonEmptyString(conversationId) ? conversationId.trim() : '';
        const normalizedAction = isNonEmptyString(action) ? action.trim().toLowerCase() : '';
        if (!normalizedConversationId) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'No active conversation',
                detail: 'Set an active conversation before controlling a goal.'
            });
            return;
        }
        if (normalizedAction !== 'pause' && normalizedAction !== 'resume') {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Unsupported Goal action',
                detail: 'Only pause and resume are supported.'
            });
            return;
        }
        if (!_isIpcActiveSendAllowed() || !_isFollowerModeEnabled(ws)) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Active send is not allowed',
                detail: 'Enable TERMLINK_CODEX_IPC_ENABLED + ALLOW_ACTIVE + CONFIRM_SEND.'
            });
            return;
        }
        if (_getActiveConversationId(ws) !== normalizedConversationId) {
            sendWsEnvelope(ws, {
                type: 'error',
                message: 'Conversation is not active',
                detail: 'Select this conversation before controlling its Goal.'
            });
            return;
        }
        if (!_shouldUseOwnerRuntime(normalizedConversationId)) {
            sendWsEnvelope(ws, {
                type: 'error',
                code: 'GOAL_EXTERNAL_OWNER_CONTROL_UNSUPPORTED',
                message: '该 Goal 当前由 Desktop 或 VS Code 执行，现有协议不支持从 App 暂停或恢复。',
                detail: '请在启动 Goal 的原宿主中控制。',
                conversationId: normalizedConversationId
            });
            return;
        }

        const targetStatus = normalizedAction === 'pause' ? 'paused' : 'active';
        try {
            await codexService.request('thread/goal/set', {
                threadId: normalizedConversationId,
                status: targetStatus
            });

            let turnInterrupted = false;
            let interruptWarning = null;
            if (normalizedAction === 'pause') {
                const latest = _getLatestOwnerSnapshot(normalizedConversationId);
                const ledger = _authorityLedger.get(normalizedConversationId);
                const isRunning = latest?.status === 'running' || ledger?.status === 'running';
                const turnId = ledger?.turnId || latest?.latestTurnId || null;
                if (isRunning) {
                    try {
                        await codexService.request('turn/interrupt', {
                            threadId: normalizedConversationId,
                            ...(isNonEmptyString(turnId) ? { turnId } : {})
                        });
                        _recordAuthority(normalizedConversationId, 'owner', 'interrupting', turnId);
                        turnInterrupted = true;
                    } catch (error) {
                        interruptWarning = error && error.message ? error.message : String(error);
                        diagnosticLog.error('server', 'server.codex.goal.pause_interrupt.failed', error, {
                            conversationKey: diagnosticKey(normalizedConversationId),
                            authority: 'owner',
                            turnKey: diagnosticKey(turnId)
                        });
                    }
                }
            }

            sendWsEnvelope(ws, {
                type: 'follower_goal_control_ack',
                conversationId: normalizedConversationId,
                action: normalizedAction,
                status: targetStatus,
                acknowledged: true,
                ...(normalizedAction === 'pause' ? { turnInterrupted } : {}),
                ...(interruptWarning ? { warning: interruptWarning } : {})
            });
        } catch (error) {
            diagnosticLog.error('server', 'server.codex.goal.control.failed', error, {
                conversationKey: diagnosticKey(normalizedConversationId),
                authority: 'owner',
                action: normalizedAction
            });
            sendWsEnvelope(ws, {
                type: 'error',
                message: `Failed to ${normalizedAction} owner Goal`,
                detail: error && error.message ? error.message : String(error)
            });
        }
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
        if (method === 'thread/goal/updated' || method === 'thread/goal/cleared') {
            const goal = params && typeof params.goal === 'object' ? params.goal : null;
            const goalObjective = normalizeGoalObjective(goal?.objective);
            const goalStatus = isNonEmptyString(goal?.status) ? goal.status.trim() : null;
            const ownerSurface = ownerNotificationThreadId
                ? _getLatestOwnerSnapshot(ownerNotificationThreadId)
                : null;
            diagnosticLog.event('server', 'server.codex.goal.notification.received', {
                conversationKey: diagnosticKey(ownerNotificationThreadId),
                goalKey: diagnosticKey(goalObjective),
                objectiveLength: goalObjective ? goalObjective.length : 0,
                status: goalStatus || (method === 'thread/goal/cleared' ? 'cleared' : null),
                hasActiveGoal: Boolean(ownerSurface?.activeGoal),
                ownerKind: ownerSurface?.ownerKind || null
            });
            if (ownerNotificationThreadId && (
                method === 'thread/goal/cleared' ||
                (goalStatus && goalStatus !== 'active')
            )) {
                const pendingGoalStart = _pendingOwnerGoalStarts.get(ownerNotificationThreadId);
                if (pendingGoalStart) {
                    _pendingOwnerGoalStarts.delete(ownerNotificationThreadId);
                    _emitFollowerRouteState(
                        pendingGoalStart.ws,
                        pendingGoalStart.clientRequestId,
                        ownerNotificationThreadId,
                        'failed',
                        {
                            authority: 'owner',
                            detailCode: 'GOAL_START_ENDED_BEFORE_TURN'
                        }
                    );
                }
            }
        }
        if (ownerNotificationThreadId && ownerSurfaceTracker.hasConversation(ownerNotificationThreadId)) {
            if (method === 'turn/started') {
                const pendingGoalStart = _pendingOwnerGoalStarts.get(ownerNotificationThreadId);
                if (pendingGoalStart) {
                    _pendingOwnerGoalStarts.delete(ownerNotificationThreadId);
                    _emitFollowerRouteState(
                        pendingGoalStart.ws,
                        pendingGoalStart.clientRequestId,
                        ownerNotificationThreadId,
                        'turn_started',
                        {
                            authority: 'owner',
                            turnId: params?.turn?.id || params?.turn?.turnId || null
                        }
                    );
                }
                _recordAuthority(
                    ownerNotificationThreadId,
                    'owner',
                    'running',
                    params?.turn?.id || params?.turn?.turnId || null
                );
            } else if (method === 'turn/completed') {
                _pendingOwnerGoalStarts.delete(ownerNotificationThreadId);
                _recordAuthority(
                    ownerNotificationThreadId,
                    'owner',
                    'terminal',
                    params?.turn?.id || params?.turn?.turnId || null
                );
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
            // Resolve the registration type before any initial replay is
            // written.  Android must receive the bounded protocol from the
            // first frame, not only after the message listener is installed.
            ws.codexClientType = registrationManager?.get(registrationId)?.clientType || null;
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

            sendWsEnvelope(ws, {
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
            });

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
                        const clientSelectionGeneration = Number.isSafeInteger(envelope.selectionGeneration) && envelope.selectionGeneration >= 0
                            ? envelope.selectionGeneration
                            : null;
                        _handleSetActiveConversation(ws, session, envelope.conversationId, clientSelectionGeneration);
                    } else if (type === 'conversation_history_recovery_request') {
                        const conversationId = isNonEmptyString(envelope.conversationId) ? envelope.conversationId.trim() : '';
                        const currentSelectionGeneration = _ipcSelectionGenerations.get(ws) || 0;
                        const hasClientSelectionGeneration = Object.prototype.hasOwnProperty.call(envelope, 'selectionGeneration');
                        const clientSelectionGeneration = Number.isSafeInteger(envelope.selectionGeneration) && envelope.selectionGeneration >= 0
                            ? envelope.selectionGeneration
                            : currentSelectionGeneration;
                        const syncId = isNonEmptyString(envelope.syncId) ? envelope.syncId.trim() : null;
                        const rangeSegments = normalizeHistoryRangeCapability(
                            envelope.rangeSegments,
                            historyRangeSegmentsEnabled === true
                        );
                        if (!conversationId || _getActiveConversationId(ws) !== conversationId) {
                            _sendHistoryRecoveryState(ws, {
                                syncId,
                                conversationId,
                                state: 'failed',
                                detailCode: 'conversation_not_active',
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            });
                        } else if (!_clientSelectionGenerationMatches(
                            ws,
                            hasClientSelectionGeneration,
                            clientSelectionGeneration,
                            currentSelectionGeneration
                        )) {
                            _sendHistoryRecoveryState(ws, {
                                syncId,
                                conversationId,
                                state: 'failed',
                                detailCode: 'stale_selection',
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            });
                        } else {
                            const cycle = _getHistorySelectionCycle(ws);
                            if (!cycle || !_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) {
                                _sendHistoryRecoveryState(ws, {
                                    syncId,
                                    conversationId,
                                    state: 'failed',
                                    detailCode: 'stale_selection',
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                });
                                return;
                            }
                            if (cycle.deadlineReached || Date.now() >= cycle.deadlineAt) {
                                _handleHistorySelectionDeadline(ws, cycle);
                                if (!cycle.deadlineReached) cycle.deadlineReached = true;
                                _sendHistoryRecoveryState(ws, {
                                    syncId,
                                    conversationId,
                                    state: 'failed',
                                    detailCode: 'history_recovery_timeout',
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                });
                                return;
                            }
                            if (cycle.recoveryInFlight || cycle.fullRecoveryAttempted) {
                                _sendHistoryRecoveryState(ws, {
                                    syncId,
                                    conversationId,
                                    state: 'failed',
                                    detailCode: 'history_recovery_already_attempted',
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                });
                                return;
                            }

                            // Deduplicate overlapping requests while the
                            // surface grace or canonical recovery is active.
                            // The one full-recovery quota is reserved only
                            // immediately before startRecovery(): a healthy
                            // surface winning the grace window must not spend
                            // the generation's canonical attempt.
                            cycle.recoveryInFlight = true;
                            cycle.activeRecoverySyncId = syncId;
                            cycle.recoveryState = 'waiting_grace';
                            diagnosticLog.event('server', 'server.codex.history.recovery.requested', {
                                conversationKey: diagnosticKey(conversationId),
                                syncId,
                                selectionGeneration: currentSelectionGeneration,
                                subscriptionGeneration: cycle.subscriptionGeneration,
                                ipcOnline: _isIpcOnline()
                            }, 'info');

                            try {
                                let currentSurface = _getCurrentCycleIpcSnapshot(conversationId);
                                const subscriptionCycle = _ipcConversationSubscriptionCycles.get(conversationId);
                                const surfaceInvalidated = subscriptionCycle?.surfaceInvalidatedReason === 'desynced';
                                if (!currentSurface && _isIpcOnline() && !surfaceInvalidated) {
                                    currentSurface = await _waitForCurrentCycleIpcSnapshot(
                                        ws,
                                        conversationId,
                                        cycle.startedAt
                                    );
                                }
                                if (!_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) {
                                    return;
                                }
                                if (cycle.deadlineReached) return;

                                if (currentSurface) {
                                    const surfaceBudget = Math.max(1, Math.min(
                                        HISTORY_RECOVERY_TIMEOUT_MS,
                                        _remainingHistorySelectionBudget(cycle) - normalizedHistorySettlementMarginMs
                                    ));
                                    const baseline = await withHistoryRecoveryTimeout(
                                        _awaitSurfaceBaseline(conversationId),
                                        surfaceBudget
                                    );
                                    if (!_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) return;
                                    if (!baseline) {
                                        throw Object.assign(new Error('Current IPC surface has no projected history baseline.'), {
                                            code: 'HISTORY_SURFACE_BASELINE_UNAVAILABLE'
                                        });
                                    }
                                    cycle.recoveryState = 'healthy';
                                    _sendHistoryRecoveryState(ws, {
                                        syncId,
                                        conversationId,
                                        state: 'ready',
                                        detailCode: 'healthy_surface',
                                        rootHash: baseline.rootHash,
                                        itemCount: baseline.items.length,
                                        complete: baseline.complete,
                                        selectionGeneration: currentSelectionGeneration,
                                        clientSelectionGeneration
                                    });
                                    return;
                                }

                                const reusableBaseline = historySyncService.getBaseline(conversationId);
                                if (
                                    reusableBaseline &&
                                    recoveryBaselineMatchesRange(reusableBaseline, rangeSegments.enabled) &&
                                    Array.isArray(reusableBaseline.items) &&
                                    reusableBaseline.stale !== true
                                ) {
                                    cycle.recoveryState = 'ready';
                                    _sendHistoryRecoveryState(ws, {
                                        syncId,
                                        conversationId,
                                        state: 'ready',
                                        detailCode: 'reused_recovery_baseline',
                                        rootHash: reusableBaseline.rootHash,
                                        itemCount: reusableBaseline.items.length,
                                        complete: reusableBaseline.complete,
                                        selectionGeneration: currentSelectionGeneration,
                                        clientSelectionGeneration
                                    });
                                    diagnosticLog.event('server', 'server.codex.history.recovery.baseline_reused', {
                                        conversationKey: diagnosticKey(conversationId),
                                        syncId,
                                        selectionGeneration: currentSelectionGeneration,
                                        itemCount: reusableBaseline.items.length,
                                        sourceKind: reusableBaseline.sourceKind
                                    }, 'info');
                                    return;
                                }

                                const providerTimeout = Math.min(
                                    HISTORY_RECOVERY_TIMEOUT_MS,
                                    _remainingHistorySelectionBudget(cycle) - normalizedHistorySettlementMarginMs
                                );
                                if (providerTimeout <= 0) {
                                    throw createHistoryRecoveryTimeoutError();
                                }
                                cycle.recoveryState = 'recovering';
                                cycle.fullRecoveryAttempted = true;
                                const waiter = historySyncService.startRecovery({
                                    conversationId,
                                    providerIdentity: HISTORY_RECOVERY_PROVIDER_IDENTITY,
                                    purpose: rangeSegments.enabled ? 'tail' : 'full',
                                    waiterId: `${ws.sessionId || 'anonymous'}:${currentSelectionGeneration}:${syncId || randomUUID()}`,
                                    producer: ({ signal }) => historyBaselineProvider.build(conversationId, {
                                        signal,
                                        timeoutMs: providerTimeout,
                                        rangeSegments
                                    })
                                });
                                if (!waiter.ok) {
                                    const error = new Error(waiter.detailCode || 'History recovery is unavailable.');
                                    error.code = waiter.detailCode || 'HISTORY_RECOVERY_FAILED';
                                    throw error;
                                }
                                _ipcHistoryRecoveryWaiters.set(ws, {
                                    waiter,
                                    conversationId,
                                    selectionGeneration: currentSelectionGeneration,
                                    syncId
                                });
                                const result = await _awaitHistoryRecoveryResult(waiter, providerTimeout);
                                if (!_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) return;
                                if (cycle.activeRecoverySyncId !== syncId) return;
                                const baseline = historySyncService.getBaseline(conversationId);
                                if (!baseline) {
                                    throw Object.assign(new Error('History recovery completed without a registered baseline.'), {
                                        code: 'HISTORY_RECOVERY_BASELINE_MISSING'
                                    });
                                }
                                cycle.recoveryState = 'ready';
                                _sendHistoryRecoveryState(ws, {
                                    syncId,
                                    conversationId,
                                    state: 'ready',
                                    rootHash: baseline.rootHash || result?.rootHash,
                                    itemCount: baseline.items.length,
                                    complete: baseline.complete,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                });
                                diagnosticLog.event('server', 'server.codex.history.recovery.ready', {
                                    conversationKey: diagnosticKey(conversationId),
                                    syncId,
                                    selectionGeneration: currentSelectionGeneration,
                                    resultKind: result?.resultKind || null,
                                    itemCount: baseline.items.length
                                }, 'info');
                            } catch (error) {
                                if (!_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) return;
                                if (cycle.deadlineReached) return;
                                if (
                                    error?.code === 'history_recovery_waiter_detached' &&
                                    cycle.recoverySupersededBySurface &&
                                    _getCurrentCycleIpcSnapshot(conversationId)
                                ) {
                                    try {
                                        const surfaceBudget = Math.max(1, Math.min(
                                            HISTORY_RECOVERY_TIMEOUT_MS,
                                            _remainingHistorySelectionBudget(cycle) - normalizedHistorySettlementMarginMs
                                        ));
                                        const surfaceBaseline = await withHistoryRecoveryTimeout(
                                            _awaitSurfaceBaseline(conversationId),
                                            surfaceBudget
                                        );
                                        if (!_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) return;
                                        if (!surfaceBaseline) {
                                            throw Object.assign(new Error('Current IPC surface has no projected history baseline.'), {
                                                code: 'HISTORY_SURFACE_BASELINE_UNAVAILABLE'
                                            });
                                        }
                                        cycle.recoveryState = 'healthy';
                                        _sendHistoryRecoveryState(ws, {
                                            syncId,
                                            conversationId,
                                            state: 'ready',
                                            detailCode: 'healthy_surface',
                                            rootHash: surfaceBaseline.rootHash,
                                            itemCount: surfaceBaseline.items.length,
                                            complete: surfaceBaseline.complete,
                                            selectionGeneration: currentSelectionGeneration,
                                            clientSelectionGeneration
                                        });
                                        return;
                                    } catch (surfaceError) {
                                        error = surfaceError;
                                    }
                                }
                                const timedOut = error && (
                                    error.code === 'HISTORY_RECOVERY_TIMEOUT' ||
                                    /timed out/i.test(String(error.message || ''))
                                );
                                const detailCode = error?.code === 'HISTORY_RECOVERY_BASELINE_TOO_LARGE'
                                    ? 'history_recovery_too_large'
                                    : error?.code === 'HISTORY_SURFACE_BASELINE_UNAVAILABLE'
                                        ? 'history_surface_baseline_unavailable'
                                        : timedOut
                                            ? 'history_recovery_timeout'
                                            : error?.code === 'history_recovery_waiter_detached'
                                                ? 'history_recovery_cancelled'
                                                : 'history_recovery_failed';
                                cycle.recoveryState = detailCode === 'history_recovery_cancelled'
                                    ? 'cancelled'
                                    : 'failed';
                                _sendHistoryRecoveryState(ws, {
                                    syncId,
                                    conversationId,
                                    state: 'failed',
                                    detailCode,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                });
                                diagnosticLog.error('server', 'server.codex.history.recovery.failed', error, {
                                    conversationKey: diagnosticKey(conversationId),
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration,
                                    syncId,
                                    providerTimeoutMs: Math.min(
                                        HISTORY_RECOVERY_TIMEOUT_MS,
                                        Math.max(0, _remainingHistorySelectionBudget(cycle) - normalizedHistorySettlementMarginMs)
                                    )
                                });
                            } finally {
                                const pending = _ipcHistoryRecoveryWaiters.get(ws);
                                if (pending?.conversationId === conversationId && pending.selectionGeneration === currentSelectionGeneration) {
                                    _ipcHistoryRecoveryWaiters.delete(ws);
                                }
                                if (_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) {
                                    cycle.activeRecoverySyncId = null;
                                    cycle.recoveryInFlight = false;
                                }
                            }
                        }
                    } else if (type === 'conversation_history_sync_request') {
                        const conversationId = isNonEmptyString(envelope.conversationId) ? envelope.conversationId.trim() : '';
                        const currentSelectionGeneration = _ipcSelectionGenerations.get(ws) || 0;
                        const hasClientSelectionGeneration = Object.prototype.hasOwnProperty.call(envelope, 'selectionGeneration');
                        const clientSelectionGeneration = Number.isSafeInteger(envelope.selectionGeneration) && envelope.selectionGeneration >= 0
                            ? envelope.selectionGeneration
                            : currentSelectionGeneration;
                        const syncId = isNonEmptyString(envelope.syncId) ? envelope.syncId.trim() : null;
                        const rangeSegments = normalizeHistoryRangeCapability(
                            envelope.rangeSegments,
                            historyRangeSegmentsEnabled === true
                        );
                        diagnosticLog.event('server', 'server.codex.history.sync.request_received', {
                            conversationKey: diagnosticKey(conversationId),
                            syncId,
                            active: Boolean(conversationId && _getActiveConversationId(ws) === conversationId),
                            selectionGeneration: currentSelectionGeneration,
                            clientSelectionGeneration,
                            cacheSchemaVersion: envelope.cacheSchemaVersion || 1,
                            rangeSegments: rangeSegments.enabled
                        }, 'info');
                        if (!conversationId || _getActiveConversationId(ws) !== conversationId) {
                            _sendHistorySyncFailure(ws, {
                                syncId,
                                conversationId,
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            }, 'conversation_not_active');
                        } else if (!_clientSelectionGenerationMatches(
                            ws,
                            hasClientSelectionGeneration,
                            clientSelectionGeneration,
                            currentSelectionGeneration
                        )) {
                            _sendHistorySyncFailure(ws, {
                                syncId,
                                conversationId,
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            }, 'stale_selection');
                        } else {
                            const cycle = _getHistorySelectionCycle(ws);
                            if (!cycle || !_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration)) {
                                _sendHistorySyncFailure(ws, {
                                    syncId,
                                    conversationId,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                }, 'stale_selection');
                                return;
                            }
                            if (cycle.deadlineReached || Date.now() >= cycle.deadlineAt) {
                                _handleHistorySelectionDeadline(ws, cycle);
                                _sendHistorySyncFailure(ws, {
                                    syncId,
                                    conversationId,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                }, 'history_selection_deadline');
                                return;
                            }
                            _ipcHistorySyncContexts.set(ws, {
                                syncId,
                                conversationId,
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            });
                            // Snapshot projection is asynchronous when media
                            // bytes must be externalized. Wait for that one
                            // bounded baseline job so an immediate Android
                            // sync request cannot race it and report a false
                            // history_unavailable result. A stuck projection
                            // must still terminate the request with a visible
                            // recovery state instead of leaving Android in
                            // loading_baseline forever.
                            try {
                                const projectionBudget = Math.min(
                                    HISTORY_RECOVERY_TIMEOUT_MS,
                                    _remainingHistorySelectionBudget(cycle) - normalizedHistorySettlementMarginMs
                                );
                                if (projectionBudget <= 0) {
                                    throw createHistoryRecoveryTimeoutError('history_selection_deadline');
                                }
                                await withHistoryRecoveryTimeout(
                                    _awaitSurfaceBaseline(conversationId),
                                    projectionBudget
                                );
                            } catch (error) {
                                if (cycle.deadlineReached) return;
                                const detailCode = error?.detailCode === 'history_selection_deadline'
                                    ? 'history_selection_deadline'
                                    : error?.code === 'HISTORY_RECOVERY_TIMEOUT'
                                        ? 'history_baseline_timeout'
                                        : 'history_baseline_failed';
                                const context = _ipcHistorySyncContexts.get(ws);
                                _ipcHistorySyncContexts.delete(ws);
                                _sendHistorySyncFailure(ws, context || {
                                    syncId,
                                    conversationId,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                }, detailCode);
                                diagnosticLog.error('server', 'server.codex.history.baseline_wait_failed', error, {
                                    conversationKey: diagnosticKey(conversationId),
                                    syncId,
                                    detailCode
                                });
                                return;
                            }
                            if (
                                !_isCurrentHistorySelectionCycle(ws, conversationId, currentSelectionGeneration) ||
                                cycle.deadlineReached
                            ) return;
                            const result = historySyncService.startSync({
                                ws,
                                conversationId,
                                syncId,
                                checkpoint: envelope.checkpoint || {},
                                cacheSchemaVersion: envelope.cacheSchemaVersion,
                                rangeSegments,
                                selectionGeneration: currentSelectionGeneration,
                                clientSelectionGeneration
                            });
                            diagnosticLog.event('server', 'server.codex.history.sync.started', {
                                conversationKey: diagnosticKey(conversationId),
                                syncId,
                                ok: result.ok,
                                state: result.state || null,
                                detailCode: result.detailCode || null
                            }, 'info');
                            if (!result.ok) {
                                const context = _ipcHistorySyncContexts.get(ws);
                                _ipcHistorySyncContexts.delete(ws);
                                _sendHistorySyncFailure(ws, context || {
                                    syncId,
                                    conversationId,
                                    selectionGeneration: currentSelectionGeneration,
                                    clientSelectionGeneration
                                }, result.detailCode || 'history_unavailable');
                            }
                        }
                    } else if (type === 'conversation_history_manifest_page') {
                        const result = historySyncService.handleManifestPage(ws, envelope);
                        diagnosticLog.event('server', 'server.codex.history.manifest_page_received', {
                            conversationKey: diagnosticKey(envelope.conversationId),
                            syncId: envelope.syncId || null,
                            pageIndex: envelope.pageIndex,
                            lastPage: envelope.lastPage === true,
                            itemCount: Array.isArray(envelope.items) ? envelope.items.length : 0,
                            ok: result.ok,
                            pending: result.pending === true,
                            detailCode: result.detailCode || null
                        }, 'info');
                    } else if (type === 'conversation_history_sync_ack') {
                        const result = historySyncService.handleAck(ws, envelope);
                        diagnosticLog.event('server', 'server.codex.history.ack_received', {
                            conversationKey: diagnosticKey(envelope.conversationId),
                            syncId: envelope.syncId || null,
                            pageIndex: envelope.pageIndex,
                            ok: result.ok,
                            state: result.state || null,
                            detailCode: result.detailCode || null
                        }, 'info');
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
                            turnConfig: envelope.turnConfig,
                            goalObjective: envelope.goalObjective
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
                    } else if (type === 'follower_goal_control') {
                        _handleFollowerGoalControl(ws, envelope.conversationId, envelope.action).catch(err => console.error('[gateway][ipc][follower-goal-control]', err));
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
                        // This legacy command used to forward the complete
                        // app-server thread in one frame.  Android history is
                        // now cache/sync driven, so refuse that path rather
                        // than allowing an unbounded snapshot to reach the
                        // generic JSON parser.  Desktop/legacy clients keep
                        // the existing command semantics for compatibility.
                        if (isAndroidCodexClient(ws)) {
                            sendWsEnvelope(ws, {
                                type: 'codex_error',
                                code: 'CODEX_HISTORY_METADATA_REQUIRED',
                                message: 'Android history recovery uses bounded cache synchronization.'
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
                        const metadataOnlyHistoryRequest = (
                            method === 'thread/resume' || method === 'thread/read' || method === 'thread/list'
                        ) && (
                            envelope.historyMode === 'metadata' ||
                            (isAndroidCodexClient(ws) && method === 'thread/list')
                        );
                        // Android history selection still uses the legacy
                        // logical method name for wire compatibility, but it
                        // must never claim the app-server writer/runtime.
                        // Translate only that explicitly marked Android
                        // metadata request; real owner resume paths (including
                        // owner fallback) continue to use thread/resume.
                        const metadataHistoryResumeRead = isAndroidCodexClient(ws) &&
                            method === 'thread/resume' &&
                            envelope.historyMode === 'metadata';
                        const upstreamMethod = metadataHistoryResumeRead ? 'thread/read' : method;
                        if (isAndroidCodexClient(ws) &&
                            (method === 'thread/resume' || method === 'thread/read') &&
                            !metadataOnlyHistoryRequest) {
                            sendWsEnvelope(ws, {
                                type: 'codex_response',
                                requestId: envelope.requestId || null,
                                method,
                                error: {
                                    code: 'CODEX_HISTORY_METADATA_REQUIRED',
                                    message: 'Android history recovery requires historyMode=metadata.'
                                }
                            });
                            return;
                        }
                        const metadataRequestParams = metadataOnlyHistoryRequest && requestParams && typeof requestParams === 'object'
                            ? (() => {
                                const next = { ...requestParams };
                                delete next.historyMode;
                                return next;
                            })()
                            : requestParams;
                        const upstreamRequestParams = metadataHistoryResumeRead
                            ? {
                                ...(metadataRequestParams && typeof metadataRequestParams === 'object'
                                    ? metadataRequestParams
                                    : {}),
                                includeTurns: false
                            }
                            : metadataRequestParams;
                        const requestStartedAt = Date.now();
                        try {
                            const response = await codexService.request(upstreamMethod, upstreamRequestParams);
                            if (metadataOnlyHistoryRequest) {
                                const metadataEntries = method === 'thread/list'
                                    ? (Array.isArray(response)
                                        ? response
                                        : Array.isArray(response?.data)
                                            ? response.data
                                            : Array.isArray(response?.threads)
                                                ? response.threads
                                                : [])
                                    : response?.thread
                                        ? [response.thread]
                                        : [];
                                for (const entry of metadataEntries) {
                                    const metadata = entry?.thread && typeof entry.thread === 'object'
                                        ? entry.thread
                                        : entry;
                                    const metadataConversationId = metadata?.id || metadata?.threadId || null;
                                    if (!isNonEmptyString(metadataConversationId)) continue;
                                    const observation = historySyncService.observeCanonicalMetadata(
                                        metadataConversationId,
                                        metadata
                                    );
                                    if (observation.observed && observation.changed) {
                                        diagnosticLog.event('server', 'server.codex.history.recovery.baseline_invalidated', {
                                            conversationKey: diagnosticKey(metadataConversationId),
                                            method,
                                            reason: 'canonical_metadata_changed'
                                        }, 'info');
                                    }
                                }
                            }
                            diagnosticLog.event('server', 'server.codex.request.completed', {
                                method,
                                upstreamMethod,
                                metadataHistoryResumeRead,
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
                        if (upstreamMethod === 'account/rateLimits/read') {
                            console.info('[CODEX][account/rateLimits/read] Response:', JSON.stringify(response, null, 2));
                        }
                        const codexState = ensureSessionCodexState(session);
                        if (upstreamMethod === 'account/rateLimits/read') {
                            codexState.rateLimitState = response || null;
                            emitCodexState(session);
                        }
                        if (
                            upstreamMethod === 'thread/resume' &&
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
                        if (upstreamMethod === 'thread/read') {
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
                        const clientResponse = metadataOnlyHistoryRequest
                            ? method === 'thread/list'
                                ? projectMetadataOnlyThreadListResponse(response)
                                : projectMetadataOnlyThreadResponse(response)
                            : response;
                        const responseEnvelope = {
                            type: 'codex_response',
                            requestId: envelope.requestId || null,
                            method,
                            result: clientResponse
                        };
                        if (Number.isSafeInteger(envelope.selectionGeneration) && envelope.selectionGeneration >= 0) {
                            responseEnvelope.selectionGeneration = envelope.selectionGeneration;
                        }
                        sendWsEnvelope(ws, responseEnvelope);
                        } catch (error) {
                            diagnosticLog.error('server', 'server.codex.request.failed', error, {
                                method,
                                upstreamMethod,
                                metadataHistoryResumeRead,
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
                        const errorEnvelope = {
                            type: 'codex_response',
                            requestId: envelope.requestId || null,
                            method: envelope.method || null,
                            error: {
                                code: e && e.code ? e.code : 'CODEX_REQUEST_FAILED',
                                message: e && e.message ? e.message : 'Codex request failed.',
                                data: e.data || null
                            }
                        };
                        if (Number.isSafeInteger(envelope.selectionGeneration) && envelope.selectionGeneration >= 0) {
                            errorEnvelope.selectionGeneration = envelope.selectionGeneration;
                        }
                        sendWsEnvelope(ws, errorEnvelope);
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
                for (const [conversationId, pendingGoalStart] of _pendingOwnerGoalStarts.entries()) {
                    if (pendingGoalStart.ws === ws) {
                        _pendingOwnerGoalStarts.delete(conversationId);
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
        _ownerFollowerStatusRequested.clear();
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
module.exports.projectMetadataOnlyThreadResponse = projectMetadataOnlyThreadResponse;
module.exports.projectMetadataOnlyThreadListResponse = projectMetadataOnlyThreadListResponse;
module.exports.sendWsEnvelope = sendWsEnvelope;
module.exports.MAX_WS_ENVELOPE_BYTES = MAX_WS_ENVELOPE_BYTES;
module.exports.MOBILE_SURFACE_MAX_VISIBLE_LATENCY_MS = MOBILE_SURFACE_MAX_VISIBLE_LATENCY_MS;
module.exports.createLatestOnlyAsyncQueue = createLatestOnlyAsyncQueue;
module.exports.normalizeHistoryRangeCapability = normalizeHistoryRangeCapability;
