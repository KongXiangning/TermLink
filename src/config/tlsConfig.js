const fs = require('fs');
const path = require('path');

/**
 * Parse TLS/mTLS configuration from environment variables.
 *
 * Environment variables:
 *   TERMLINK_TLS_ENABLED          – 'true' to enable HTTPS listener (default: false)
 *   TERMLINK_TLS_CERT             – path to server certificate (PEM)
 *   TERMLINK_TLS_KEY              – path to server private key (PEM)
 *   TERMLINK_TLS_CA               – path to trusted client CA bundle (PEM), enables mTLS verification
 *   TERMLINK_TLS_CLIENT_CERT      – client-cert policy: 'require' | 'request' | 'none' (default: 'none')
 *   TERMLINK_TLS_PASSPHRASE       – optional passphrase for the server private key
 */

const CLIENT_CERT_POLICIES = ['require', 'request', 'none'];
const TLS_PROXY_MODES = ['off', 'nginx'];

function parseBoolean(raw, defaultValue = false) {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return defaultValue;
    }
    return String(raw).toLowerCase() === 'true';
}

function resolveFilePath(raw) {
    if (!raw || String(raw).trim() === '') {
        return null;
    }
    return path.resolve(String(raw).trim());
}

function normalizeClientCertPolicy(raw) {
    if (!raw || String(raw).trim() === '') {
        return { value: 'none', error: null };
    }
    const normalized = String(raw).trim().toLowerCase();
    if (CLIENT_CERT_POLICIES.includes(normalized)) {
        return { value: normalized, error: null };
    }
    return {
        value: normalized,
        error: `TERMLINK_TLS_CLIENT_CERT must be one of: ${CLIENT_CERT_POLICIES.join(', ')}. Received: ${raw}`
    };
}

function normalizeTlsProxyMode(raw) {
    if (!raw || String(raw).trim() === '') {
        return { value: 'off', error: null };
    }
    const normalized = String(raw).trim().toLowerCase();
    if (TLS_PROXY_MODES.includes(normalized)) {
        return { value: normalized, error: null };
    }
    return {
        value: normalized,
        error: `TERMLINK_TLS_PROXY_MODE must be one of: ${TLS_PROXY_MODES.join(', ')}. Received: ${raw}`
    };
}

function parseTlsConfig() {
    const enabled = parseBoolean(process.env.TERMLINK_TLS_ENABLED, false);
    const certPath = resolveFilePath(process.env.TERMLINK_TLS_CERT);
    const keyPath = resolveFilePath(process.env.TERMLINK_TLS_KEY);
    const caPath = resolveFilePath(process.env.TERMLINK_TLS_CA);
    const clientCertPolicy = normalizeClientCertPolicy(process.env.TERMLINK_TLS_CLIENT_CERT);
    const proxyMode = normalizeTlsProxyMode(process.env.TERMLINK_TLS_PROXY_MODE);
    const proxySecret = process.env.TERMLINK_TLS_PROXY_SECRET || null;
    const passphrase = process.env.TERMLINK_TLS_PASSPHRASE || null;

    const mtlsEnabled = enabled && caPath !== null && clientCertPolicy.value !== 'none' && !clientCertPolicy.error;

    return {
        enabled,
        certPath,
        keyPath,
        caPath,
        clientCertPolicy: clientCertPolicy.value,
        clientCertPolicyError: clientCertPolicy.error,
        proxyMode: proxyMode.value,
        proxyModeError: proxyMode.error,
        proxySecret,
        passphrase,
        mtlsEnabled
    };
}

function checkFileReadable(filePath, label) {
    if (!filePath) {
        return { ok: false, message: `${label} path is not configured.` };
    }
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
        return { ok: true };
    } catch (err) {
        return { ok: false, message: `${label} is not readable: ${filePath} (${err.message})` };
    }
}

/**
 * Validate TLS configuration at startup.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */
function validateTlsConfig(config) {
    const errors = [];
    const proxyMode = typeof config.proxyMode === 'string' && config.proxyMode.trim()
        ? config.proxyMode.trim().toLowerCase()
        : 'off';

    if (config.clientCertPolicyError) {
        errors.push(config.clientCertPolicyError);
    }
    if (config.proxyModeError) {
        errors.push(config.proxyModeError);
    }
    if (proxyMode !== 'off' && !config.proxySecret) {
        errors.push('TERMLINK_TLS_PROXY_SECRET is required when TERMLINK_TLS_PROXY_MODE is enabled.');
    }

    if (!config.enabled) {
        return { valid: errors.length === 0, errors };
    }

    // Server cert and key are mandatory when TLS is enabled
    const certCheck = checkFileReadable(config.certPath, 'TERMLINK_TLS_CERT');
    if (!certCheck.ok) errors.push(certCheck.message);

    const keyCheck = checkFileReadable(config.keyPath, 'TERMLINK_TLS_KEY');
    if (!keyCheck.ok) errors.push(keyCheck.message);

    // CA is mandatory when client cert policy is 'require' or 'request'
    if (config.clientCertPolicy !== 'none') {
        const caCheck = checkFileReadable(config.caPath, 'TERMLINK_TLS_CA');
        if (!caCheck.ok) errors.push(caCheck.message);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Build Node.js https.createServer() options from validated TLS config.
 * Caller must ensure config has passed validateTlsConfig() first.
 */
function buildHttpsOptions(config) {
    const opts = {
        cert: fs.readFileSync(config.certPath),
        key: fs.readFileSync(config.keyPath)
    };

    if (config.passphrase) {
        opts.passphrase = config.passphrase;
    }

    if (config.caPath) {
        opts.ca = fs.readFileSync(config.caPath);
    }

    if (config.clientCertPolicy === 'require') {
        opts.requestCert = true;
        opts.rejectUnauthorized = true;
    } else if (config.clientCertPolicy === 'request') {
        opts.requestCert = true;
        opts.rejectUnauthorized = false;
    }

    return opts;
}

module.exports = {
    parseTlsConfig,
    validateTlsConfig,
    buildHttpsOptions,
    CLIENT_CERT_POLICIES,
    TLS_PROXY_MODES
};
