const fs = require('fs');
const path = require('path');

const AUDIT_EVENTS = {
    CONNECTION_START: 'connection_start',
    CONNECTION_END: 'connection_end',
    IP_WHITELIST_DENIED: 'ip_whitelist_denied'
};

class AuditService {
    constructor() {
        this.enabled = false;
        this.auditPath = null;
    }

    configure({ enabled, auditPath } = {}) {
        if (typeof enabled === 'boolean') {
            this.enabled = enabled;
        }
        if (auditPath) {
            this.auditPath = auditPath;
        }
    }

    init() {
        if (!this.enabled) {
            return;
        }

        if (!this.auditPath) {
            throw new Error('Audit path is required when audit is enabled.');
        }

        const resolvedPath = path.resolve(this.auditPath);
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
        fs.appendFileSync(resolvedPath, '');
        this.auditPath = resolvedPath;
    }

    log(event, payload = {}) {
        if (!this.enabled || !this.auditPath) {
            return;
        }

        const entry = {
            ts: new Date().toISOString(),
            event,
            ...payload
        };
        fs.appendFileSync(this.auditPath, `${JSON.stringify(entry)}\n`);
    }

    logConnectionStart(payload = {}) {
        this.log(AUDIT_EVENTS.CONNECTION_START, payload);
    }

    logConnectionEnd(payload = {}) {
        this.log(AUDIT_EVENTS.CONNECTION_END, payload);
    }

    logIpWhitelistDenied(payload = {}) {
        this.log(AUDIT_EVENTS.IP_WHITELIST_DENIED, payload);
    }
}

let auditServiceInstance = null;

function getAuditService(options) {
    if (!auditServiceInstance) {
        auditServiceInstance = new AuditService();
    }
    if (options) {
        auditServiceInstance.configure(options);
    }
    return auditServiceInstance;
}

module.exports = {
    getAuditService,
    AUDIT_EVENTS
};
