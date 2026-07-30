const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const STORE_VERSION = 1;

class ClientRegistrationStore {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.filePath = path.resolve(process.cwd(), options.filePath || './data/client-registrations.json');
        this.logger = options.logger || console;
    }

    loadSync() {
        if (!this.enabled || !fs.existsSync(this.filePath)) return [];
        try {
            const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            return Array.isArray(parsed.registrations)
                ? parsed.registrations.filter((item) => item && typeof item.id === 'string')
                : [];
        } catch (error) {
            this.logger.warn(`[ClientRegistrationStore] Failed to load ${this.filePath}: ${error.message}`);
            return [];
        }
    }

    async save(registrations) {
        if (!this.enabled) return;
        const payload = JSON.stringify({
            version: STORE_VERSION,
            savedAt: new Date().toISOString(),
            registrations: Array.from(registrations.values())
        }, null, 2);
        const tmpPath = `${this.filePath}.tmp`;
        await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
        await fsp.writeFile(tmpPath, payload, 'utf8');
        await fsp.rename(tmpPath, this.filePath).catch(async (error) => {
            if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
                await fsp.rm(this.filePath, { force: true });
                await fsp.rename(tmpPath, this.filePath);
                return;
            }
            throw error;
        });
    }

    saveSync(registrations) {
        if (!this.enabled) return;
        const payload = JSON.stringify({
            version: STORE_VERSION,
            savedAt: new Date().toISOString(),
            registrations: Array.from(registrations.values())
        }, null, 2);
        const tmpPath = `${this.filePath}.tmp`;
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(tmpPath, payload, 'utf8');
        try {
            fs.renameSync(tmpPath, this.filePath);
        } catch (error) {
            if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
                fs.rmSync(this.filePath, { force: true });
                fs.renameSync(tmpPath, this.filePath);
                return;
            }
            throw error;
        }
    }
}

module.exports = ClientRegistrationStore;
