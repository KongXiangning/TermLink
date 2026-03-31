const fs = require('fs');
const path = require('path');

const AUDIT_EVENTS = {
    CONNECTION_START: 'connection_start',
    CONNECTION_END: 'connection_end',
    IP_WHITELIST_DENIED: 'ip_whitelist_denied'
};

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MAX_ROTATED_FILES = 5;

class AuditService {
    constructor() {
        this.enabled = false;
        this.auditPath = null;
        this.maxFileSize = DEFAULT_MAX_FILE_SIZE;
        this.maxRotatedFiles = DEFAULT_MAX_ROTATED_FILES;
    }

    configure({ enabled, auditPath, maxFileSize, maxRotatedFiles } = {}) {
        if (typeof enabled === 'boolean') {
            this.enabled = enabled;
        }
        if (auditPath) {
            this.auditPath = auditPath;
        }
        if (typeof maxFileSize === 'number' && maxFileSize > 0) {
            this.maxFileSize = maxFileSize;
        }
        if (typeof maxRotatedFiles === 'number' && maxRotatedFiles >= 0) {
            this.maxRotatedFiles = Math.floor(maxRotatedFiles);
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

        this._rotateIfNeeded();
    }

    _rotateIfNeeded() {
        if (!this.auditPath) {
            return;
        }

        try {
            const stats = fs.statSync(this.auditPath);
            if (stats.size < this.maxFileSize) {
                return;
            }
        } catch {
            return;
        }

        // Shift existing rotated files: .4 → .5 (delete), .3 → .4, ...
        for (let i = this.maxRotatedFiles; i >= 1; i--) {
            const src = `${this.auditPath}.${i}`;
            const dst = `${this.auditPath}.${i + 1}`;
            try {
                if (i === this.maxRotatedFiles) {
                    fs.unlinkSync(src);
                } else {
                    fs.renameSync(src, dst);
                }
            } catch {
                // file may not exist
            }
        }

        // Rotate current → .1
        try {
            fs.renameSync(this.auditPath, `${this.auditPath}.1`);
            fs.writeFileSync(this.auditPath, '');
        } catch {
            // rotation failed, continue with current file
        }
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

        this._rotateIfNeeded();
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
