const { v4: uuidv4 } = require('uuid');
const ClientRegistrationStore = require('../repositories/clientRegistrationStore');
const { diagnosticLog } = require('./diagnosticLog');

class ClientRegistrationManager {
    constructor(options = {}) {
        this.store = new ClientRegistrationStore(options);
        this.registrations = new Map();
        for (const record of this.store.loadSync()) {
            this.registrations.set(record.id, record);
        }
        this.persistTimer = null;
        this.registerShutdownHooks();
    }

    create(clientType = 'android') {
        const now = Date.now();
        const registration = {
            id: uuidv4(),
            clientType: String(clientType || 'android').trim().toLowerCase() || 'android',
            createdAt: now,
            revokedAt: null
        };
        this.registrations.set(registration.id, registration);
        this.flushPersistSync();
        diagnosticLog.event('server', 'server.client_registration.created', {
            clientType: registration.clientType,
            registrationIdPresent: true
        }, 'info');
        return registration;
    }

    isActive(id) {
        if (typeof id !== 'string' || id.trim().length === 0) return false;
        const registration = this.registrations.get(id.trim());
        return Boolean(registration) && registration.revokedAt == null;
    }

    get(id) {
        return typeof id === 'string' ? this.registrations.get(id.trim()) || null : null;
    }

    revoke(id) {
        const registration = this.get(id);
        if (!registration || registration.revokedAt) return false;
        registration.revokedAt = Date.now();
        this.flushPersistSync();
        diagnosticLog.event('server', 'server.client_registration.revoked', {
            registrationIdPresent: true
        }, 'info');
        return true;
    }

    schedulePersist() {
        if (!this.store.enabled) return;
        if (this.persistTimer) clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            this.store.save(this.registrations).catch((error) => {
                console.error('[ClientRegistrationManager] Persist failed', error);
            });
        }, 100);
    }

    flushPersistSync() {
        if (!this.store.enabled) return;
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }
        try {
            this.store.saveSync(this.registrations);
        } catch (error) {
            console.error('[ClientRegistrationManager] Persist sync failed', error);
        }
    }

    registerShutdownHooks() {
        process.once('beforeExit', () => this.flushPersistSync());
        ['SIGINT', 'SIGTERM'].forEach((signal) => {
            const handler = () => {
                this.flushPersistSync();
                process.removeListener(signal, handler);
            };
            process.on(signal, handler);
        });
    }
}

const clientRegistrationManager = new ClientRegistrationManager();
module.exports = clientRegistrationManager;
module.exports.ClientRegistrationManager = ClientRegistrationManager;
