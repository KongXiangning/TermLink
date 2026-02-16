const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const STORE_VERSION = 1;

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

            normalized.push({
                id: record.id,
                name,
                createdAt,
                lastActiveAt,
                status
            });
        }

        return normalized;
    }
}

module.exports = SessionStore;
