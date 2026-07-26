const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_ROTATED_FILES = 4;
const DEFAULT_PATH = './logs/diagnostics/termlink-diagnostics.jsonl';
const MAX_TEXT_LENGTH = 1200;
const MAX_STACK_LENGTH = 8000;
const SENSITIVE_KEY = /(prompt|command|output|password|passwd|secret|authorization|ticket|access.?token|private.?key|certificate|attachment|raw|payload|body|content)/i;
const SENSITIVE_TEXT = /(authorization|password|passwd|secret|ticket|access[_-]?token|private[_-]?key|certificate)\s*[:=]\s*[^\s,;]+/gi;

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    return String(value).trim().toLowerCase() === 'true';
}

function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
    let text = String(value ?? '')
        .replace(SENSITIVE_TEXT, '$1=<redacted>')
        .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?<redacted>');
    if (text.length > maxLength) text = `${text.slice(0, maxLength)}…<truncated>`;
    return text;
}

function sanitizeValue(key, value) {
    if (SENSITIVE_KEY.test(String(key))) return '<redacted>';
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') return sanitizeText(value);
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(key, item));
    if (typeof value === 'object') {
        const result = {};
        for (const [childKey, childValue] of Object.entries(value).slice(0, 40)) {
            result[childKey] = sanitizeValue(childKey, childValue);
        }
        return result;
    }
    return sanitizeText(value);
}

function safeFields(fields = {}) {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
    const result = {};
    for (const [key, value] of Object.entries(fields).slice(0, 60)) {
        const sanitized = sanitizeValue(key, value);
        if (sanitized !== null && sanitized !== undefined) result[key] = sanitized;
    }
    return result;
}

class DiagnosticLog {
    constructor() {
        this.enabled = false;
        this.filePath = null;
        this.maxFileSize = DEFAULT_MAX_FILE_SIZE;
        this.maxRotatedFiles = DEFAULT_MAX_ROTATED_FILES;
        this.runId = crypto.randomUUID();
        this.sequence = 0;
        this.bytesWritten = 0;
        this.initialized = false;
    }

    configure(options = {}) {
        const explicitEnabled = Object.prototype.hasOwnProperty.call(options, 'enabled');
        this.enabled = explicitEnabled
            ? Boolean(options.enabled)
            : parseBoolean(process.env.TERMLINK_DIAGNOSTICS_ENABLED, process.env.NODE_ENV !== 'production');
        this.filePath = path.resolve(
            options.filePath || process.env.TERMLINK_DIAGNOSTICS_PATH || DEFAULT_PATH
        );
        if (Number.isFinite(options.maxFileSize) && options.maxFileSize > 0) {
            this.maxFileSize = Math.floor(options.maxFileSize);
        }
        if (Number.isFinite(options.maxRotatedFiles) && options.maxRotatedFiles >= 0) {
            this.maxRotatedFiles = Math.floor(options.maxRotatedFiles);
        }
        return this;
    }

    init() {
        if (!this.enabled || !this.filePath) return this;
        try {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
            if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '');
            this.bytesWritten = fs.statSync(this.filePath).size;
            this.rotateIfNeeded();
            this.initialized = true;
        } catch (error) {
            this.initialized = false;
            console.warn('[diagnostic-log] initialization failed:', error && error.message ? error.message : error);
        }
        return this;
    }

    rotateIfNeeded() {
        if (!this.filePath || !this.initialized && !fs.existsSync(this.filePath)) return;
        try {
            const size = fs.statSync(this.filePath).size;
            if (size < this.maxFileSize) {
                this.bytesWritten = size;
                return;
            }
            for (let index = this.maxRotatedFiles; index >= 1; index -= 1) {
                const source = `${this.filePath}.${index}`;
                const target = `${this.filePath}.${index + 1}`;
                try {
                    if (index === this.maxRotatedFiles) fs.unlinkSync(source);
                    else fs.renameSync(source, target);
                } catch (_) {
                    // Missing rotated files are expected.
                }
            }
            fs.renameSync(this.filePath, `${this.filePath}.1`);
            fs.writeFileSync(this.filePath, '');
            this.bytesWritten = 0;
        } catch (error) {
            console.warn('[diagnostic-log] rotation failed:', error && error.message ? error.message : error);
        }
    }

    event(component, event, fields = {}, level = 'info') {
        this.write({ component, event, fields, level });
    }

    error(component, event, error, fields = {}) {
        this.write({
            component,
            event,
            level: 'error',
            fields: {
                ...fields,
                errorType: error && error.name ? error.name : 'Error',
                errorMessage: error && error.message ? error.message : String(error),
                stack: error && error.stack ? error.stack.slice(0, MAX_STACK_LENGTH) : undefined
            }
        });
    }

    write({ component, event, fields, level }) {
        if (!this.enabled || !this.initialized || !this.filePath) return;
        const entry = {
            ts: new Date().toISOString(),
            pid: process.pid,
            runId: this.runId,
            seq: ++this.sequence,
            level: level || 'info',
            component: sanitizeText(component, 80),
            event: sanitizeText(event, 120),
            fields: safeFields(fields)
        };
        try {
            const line = `${JSON.stringify(entry)}\n`;
            fs.appendFileSync(this.filePath, line, 'utf8');
            this.bytesWritten += Buffer.byteLength(line, 'utf8');
            if (this.bytesWritten >= this.maxFileSize) this.rotateIfNeeded();
        } catch (error) {
            console.warn('[diagnostic-log] write failed:', error && error.message ? error.message : error);
        }
    }
}

const diagnosticLog = new DiagnosticLog().configure().init();

module.exports = {
    DiagnosticLog,
    diagnosticLog,
    sanitizeText,
    safeFields
};
