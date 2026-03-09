const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const STORE_VERSION = 2;

const VALID_SESSION_MODES = new Set(['terminal', 'codex']);
const VALID_REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
const VALID_PERSONALITIES = new Set(['none', 'friendly', 'pragmatic']);
const VALID_APPROVAL_POLICIES = new Set(['untrusted', 'on-failure', 'on-request', 'never']);
const VALID_SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access']);

function normalizeSessionMode(value) {
    if (typeof value !== 'string') {
        return 'terminal';
    }

    const normalized = value.trim().toLowerCase();
    return VALID_SESSION_MODES.has(normalized) ? normalized : 'terminal';
}

function normalizeSessionCwd(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeLastCodexThreadId(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalEnum(value, validSet) {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
        return null;
    }
    const lowered = normalized.toLowerCase();
    return validSet.has(lowered) ? lowered : null;
}

function createDefaultCodexConfig() {
    return {
        defaultModel: null,
        defaultReasoningEffort: null,
        defaultPersonality: null,
        approvalPolicy: 'never',
        sandboxMode: 'workspace-write'
    };
}

function normalizeCodexConfig(value, options = {}) {
    const required = options.requirePolicyAndSandbox === true;
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const defaultModel = normalizeOptionalString(value.defaultModel);
    const defaultReasoningEffort = normalizeOptionalEnum(value.defaultReasoningEffort, VALID_REASONING_EFFORTS);
    const defaultPersonality = normalizeOptionalEnum(value.defaultPersonality, VALID_PERSONALITIES);
    const approvalPolicy = normalizeOptionalEnum(value.approvalPolicy, VALID_APPROVAL_POLICIES);
    const sandboxMode = normalizeOptionalEnum(value.sandboxMode, VALID_SANDBOX_MODES);

    if (required && (!approvalPolicy || !sandboxMode)) {
        return null;
    }

    if (!approvalPolicy && !sandboxMode && !defaultModel && !defaultReasoningEffort && !defaultPersonality) {
        return null;
    }

    return {
        defaultModel,
        defaultReasoningEffort,
        defaultPersonality,
        approvalPolicy: approvalPolicy || null,
        sandboxMode: sandboxMode || null
    };
}

class SessionStore {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.filePath = path.resolve(process.cwd(), options.filePath || './data/sessions.json');
        this.logger = options.logger || console;
    }

    loadSync() {
        if (!this.enabled) return [];
        if (!fs.existsSync(this.filePath)) return [];

        try {
            const raw = fs.readFileSync(this.filePath, 'utf8');
            const parsed = JSON.parse(raw);
            const records = Array.isArray(parsed.sessions) ? parsed.sessions : [];
            return this._normalizeRecords(records);
        } catch (e) {
            this.logger.warn(`[SessionStore] Failed to load store ${this.filePath}: ${e.message}`);
            return [];
        }
    }

    async save(records) {
        if (!this.enabled) return;
        const payload = this._serialize(records);
        const tmpPath = `${this.filePath}.tmp`;

        await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
        await fsp.writeFile(tmpPath, payload, 'utf8');
        try {
            await fsp.rename(tmpPath, this.filePath);
        } catch (e) {
            if (e && (e.code === 'EEXIST' || e.code === 'EPERM')) {
                await fsp.rm(this.filePath, { force: true });
                await fsp.rename(tmpPath, this.filePath);
                return;
            }
            throw e;
        }
    }

    saveSync(records) {
        if (!this.enabled) return;
        const payload = this._serialize(records);
        const tmpPath = `${this.filePath}.tmp`;

        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(tmpPath, payload, 'utf8');
        try {
            fs.renameSync(tmpPath, this.filePath);
        } catch (e) {
            if (e && (e.code === 'EEXIST' || e.code === 'EPERM')) {
                fs.rmSync(this.filePath, { force: true });
                fs.renameSync(tmpPath, this.filePath);
                return;
            }
            throw e;
        }
    }

    _serialize(records) {
        return JSON.stringify({
            version: STORE_VERSION,
            savedAt: new Date().toISOString(),
            sessions: this._normalizeRecords(records)
        }, null, 2);
    }

    _normalizeRecords(records) {
        const now = Date.now();
        const normalized = [];

        for (const record of records || []) {
            if (!record || typeof record !== 'object') continue;
            if (typeof record.id !== 'string' || record.id.trim().length === 0) continue;

            const name = typeof record.name === 'string' && record.name.trim().length > 0
                ? record.name.trim()
                : 'New Session';

            const createdAt = Number.isFinite(record.createdAt) ? Number(record.createdAt) : now;
            const lastActiveAt = Number.isFinite(record.lastActiveAt) ? Number(record.lastActiveAt) : createdAt;
            const status = record.status === 'ACTIVE' ? 'ACTIVE' : 'IDLE';
            const sessionMode = normalizeSessionMode(record.sessionMode);
            const cwd = normalizeSessionCwd(record.cwd);
            const lastCodexThreadId = normalizeLastCodexThreadId(record.lastCodexThreadId);
            const codexConfig = normalizeCodexConfig(record.codexConfig, {
                requirePolicyAndSandbox: sessionMode === 'codex'
            });

            normalized.push({
                id: record.id,
                name,
                createdAt,
                lastActiveAt,
                status,
                sessionMode,
                cwd,
                lastCodexThreadId,
                codexConfig
            });
        }

        return normalized;
    }
}

module.exports = SessionStore;
module.exports.normalizeSessionMode = normalizeSessionMode;
module.exports.normalizeSessionCwd = normalizeSessionCwd;
module.exports.normalizeLastCodexThreadId = normalizeLastCodexThreadId;
module.exports.normalizeCodexConfig = normalizeCodexConfig;
module.exports.createDefaultCodexConfig = createDefaultCodexConfig;
