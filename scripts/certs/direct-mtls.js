const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawnSync } = require('child_process');

function normalizeBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeString(value, fallback = '') {
    if (value === undefined || value === null) {
        return fallback;
    }
    const normalized = String(value).trim();
    return normalized || fallback;
}

function loadInstallConfig(configPath) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function resolveInstallPath(installRoot, candidate, fallback) {
    const raw = normalizeString(candidate, fallback);
    if (!raw) {
        throw new Error('A required install path is empty.');
    }
    if (path.isAbsolute(raw)) {
        return path.normalize(raw);
    }
    return path.resolve(installRoot, raw);
}

function buildServerAltNames(publicHost = '') {
    const entries = new Set(['DNS:localhost', 'IP:127.0.0.1']);
    const hostname = normalizeString(os.hostname());
    if (hostname && hostname.toLowerCase() !== 'localhost') {
        entries.add(`DNS:${hostname}`);
    }
    const requestedHost = normalizeString(publicHost);
    if (requestedHost) {
        if (net.isIP(requestedHost)) {
            entries.add(`IP:${requestedHost}`);
        } else if (/^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(requestedHost)) {
            entries.add(`DNS:${requestedHost}`);
        } else {
            throw new Error(`publicHost is not a valid DNS name or IP address: ${requestedHost}`);
        }
    }

    const interfaces = os.networkInterfaces();
    for (const addresses of Object.values(interfaces)) {
        for (const addressInfo of addresses || []) {
            if (!addressInfo || addressInfo.internal || !addressInfo.address) {
                continue;
            }
            if (addressInfo.family === 'IPv4' || addressInfo.family === 4) {
                entries.add(`IP:${addressInfo.address}`);
            } else if ((addressInfo.family === 'IPv6' || addressInfo.family === 6) && !addressInfo.address.includes('%')) {
                entries.add(`IP:${addressInfo.address}`);
            }
        }
    }

    return Array.from(entries);
}

function createPassword() {
    return crypto.randomBytes(18).toString('base64url');
}

function resolveDirectMtlsOptions({ installRoot, config }) {
    const tls = config && typeof config === 'object' ? (config.tls || {}) : {};
    const mtls = config && typeof config === 'object' ? (config.mtls || {}) : {};
    const tlsMode = normalizeString(tls.mode, 'off').toLowerCase();
    const clientCertPolicy = normalizeString(tls.clientCertPolicy, 'none').toLowerCase();
    const deployment = normalizeString(mtls.deployment, 'none').toLowerCase();
    const generateFlag = normalizeBoolean(mtls.generateDirectServerCertificates, false)
        || normalizeBoolean(mtls.generateServerCertificates, false);

    if (!['none', 'direct-server', 'nginx'].includes(deployment)) {
        throw new Error('mtls.deployment must be one of: none, direct-server, nginx.');
    }
    if (normalizeBoolean(mtls.generateDirectServerCertificates, false) && deployment !== 'direct-server') {
        throw new Error('mtls.generateDirectServerCertificates can only be true when mtls.deployment is "direct-server".');
    }

    const generationRequested = deployment === 'direct-server' || generateFlag;
    const serverOutputBase = normalizeString(mtls.serverOutputDir, normalizeString(tls.certDir, './certs'));
    const clientOutputBase = normalizeString(mtls.clientOutputDir, path.join(serverOutputBase, 'clients'));
    const serviceName = normalizeString(config.serviceName, 'termlink');
    const clientP12Password = normalizeString(mtls.clientP12Password) || createPassword();
    const options = {
        enabled: generationRequested,
        installRoot: path.resolve(installRoot),
        opensslPath: normalizeString(mtls.opensslPath, 'openssl'),
        serviceName,
        deployment,
        tlsMode,
        clientCertPolicy,
        serverOutputDir: resolveInstallPath(installRoot, serverOutputBase, './certs'),
        clientOutputDir: resolveInstallPath(installRoot, clientOutputBase, path.join('./certs', 'clients')),
        serverCertPath: resolveInstallPath(installRoot, tls.serverCert, path.join(serverOutputBase, 'server.crt')),
        serverKeyPath: resolveInstallPath(installRoot, tls.serverKey, path.join(serverOutputBase, 'server.key')),
        caCertPath: resolveInstallPath(installRoot, tls.caCert, path.join(serverOutputBase, 'client-ca.crt')),
        caKeyPath: resolveInstallPath(installRoot, path.join(serverOutputBase, 'local-ca.key'), path.join('./certs', 'local-ca.key')),
        clientKeyPath: resolveInstallPath(installRoot, path.join(clientOutputBase, 'client.key'), path.join('./certs', 'clients', 'client.key')),
        clientCertPath: resolveInstallPath(installRoot, path.join(clientOutputBase, 'client.crt'), path.join('./certs', 'clients', 'client.crt')),
        clientP12Path: resolveInstallPath(installRoot, path.join(clientOutputBase, 'client.p12'), path.join('./certs', 'clients', 'client.p12')),
        clientPasswordPath: resolveInstallPath(installRoot, path.join(clientOutputBase, 'client-password.txt'), path.join('./certs', 'clients', 'client-password.txt')),
        clientP12Password,
        serverSubject: '/CN=localhost',
        clientSubject: `/CN=${serviceName}-client`,
        serverAltNames: buildServerAltNames(config.publicHost)
    };

    if (!generationRequested) {
        return options;
    }
    if (!['direct', 'nginx'].includes(tlsMode)) {
        throw new Error('Server certificate generation requires tls.mode="direct" or tls.mode="nginx".');
    }
    if (deployment !== 'none' && !['request', 'require'].includes(clientCertPolicy)) {
        throw new Error('mTLS certificate generation requires tls.clientCertPolicy to be "request" or "require".');
    }

    return options;
}

function ensureDirectoryFor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeTextFile(filePath, contents, mode) {
    ensureDirectoryFor(filePath);
    fs.writeFileSync(filePath, contents, 'utf8');
    if (mode) {
        try {
            fs.chmodSync(filePath, mode);
        } catch {
            // chmod can be unsupported on some Windows filesystems.
        }
    }
}

function removeFile(filePath) {
    try {
        fs.rmSync(filePath, { force: true });
    } catch {
        // Best-effort cleanup only.
    }
}

function defaultRunCommand({ command, args }) {
    const result = spawnSync(command, args, {
        encoding: 'utf8'
    });
    if (result.error) {
        if (result.error.code === 'ENOENT') {
            throw new Error(`OpenSSL not found at "${command}". Install OpenSSL or set mtls.opensslPath to the correct executable.`);
        }
        throw result.error;
    }
    if (result.status !== 0) {
        const stderr = normalizeString(result.stderr);
        const stdout = normalizeString(result.stdout);
        const detail = stderr || stdout || `exit code ${result.status}`;
        throw new Error(`OpenSSL command failed: ${command} ${args.join(' ')} :: ${detail}`);
    }
    return result;
}

function generateDirectMtlsArtifacts({ installRoot, config, runCommand = defaultRunCommand }) {
    const options = resolveDirectMtlsOptions({ installRoot, config });
    if (!options.enabled) {
        return {
            ...options,
            generated: false
        };
    }

    [
        options.serverOutputDir,
        options.clientOutputDir,
        path.dirname(options.serverCertPath),
        path.dirname(options.serverKeyPath),
        path.dirname(options.caCertPath),
        path.dirname(options.caKeyPath),
        path.dirname(options.clientKeyPath),
        path.dirname(options.clientCertPath),
        path.dirname(options.clientP12Path),
        path.dirname(options.clientPasswordPath)
    ].forEach((dirPath) => fs.mkdirSync(dirPath, { recursive: true }));

    const serverCsrPath = path.join(options.serverOutputDir, 'server.csr');
    const clientCsrPath = path.join(options.clientOutputDir, 'client.csr');
    const serverExtPath = path.join(options.serverOutputDir, 'server.ext');
    const clientExtPath = path.join(options.clientOutputDir, 'client.ext');
    const serialPath = path.join(options.serverOutputDir, 'local-ca.srl');

    writeTextFile(serverExtPath, [
        'authorityKeyIdentifier=keyid,issuer',
        'basicConstraints=CA:FALSE',
        'keyUsage=digitalSignature,keyEncipherment',
        'extendedKeyUsage=serverAuth',
        `subjectAltName=${options.serverAltNames.join(',')}`
    ].join('\n'));
    writeTextFile(clientExtPath, [
        'authorityKeyIdentifier=keyid,issuer',
        'basicConstraints=CA:FALSE',
        'keyUsage=digitalSignature,keyEncipherment',
        'extendedKeyUsage=clientAuth'
    ].join('\n'));

    runCommand({ command: options.opensslPath, args: ['version'] });
    runCommand({ command: options.opensslPath, args: ['genrsa', '-out', options.caKeyPath, '4096'] });
    runCommand({
        command: options.opensslPath,
        args: ['req', '-x509', '-new', '-nodes', '-key', options.caKeyPath, '-sha256', '-days', '3650', '-out', options.caCertPath, '-subj', '/CN=TermLink Local CA']
    });
    runCommand({ command: options.opensslPath, args: ['genrsa', '-out', options.serverKeyPath, '2048'] });
    runCommand({
        command: options.opensslPath,
        args: ['req', '-new', '-key', options.serverKeyPath, '-out', serverCsrPath, '-subj', options.serverSubject]
    });
    runCommand({
        command: options.opensslPath,
        args: ['x509', '-req', '-in', serverCsrPath, '-CA', options.caCertPath, '-CAkey', options.caKeyPath, '-CAcreateserial', '-CAserial', serialPath, '-out', options.serverCertPath, '-days', '825', '-sha256', '-extfile', serverExtPath]
    });
    runCommand({ command: options.opensslPath, args: ['genrsa', '-out', options.clientKeyPath, '2048'] });
    runCommand({
        command: options.opensslPath,
        args: ['req', '-new', '-key', options.clientKeyPath, '-out', clientCsrPath, '-subj', options.clientSubject]
    });
    runCommand({
        command: options.opensslPath,
        args: ['x509', '-req', '-in', clientCsrPath, '-CA', options.caCertPath, '-CAkey', options.caKeyPath, '-CAserial', serialPath, '-out', options.clientCertPath, '-days', '825', '-sha256', '-extfile', clientExtPath]
    });
    runCommand({
        command: options.opensslPath,
        args: ['pkcs12', '-export', '-out', options.clientP12Path, '-inkey', options.clientKeyPath, '-in', options.clientCertPath, '-certfile', options.caCertPath, '-passout', `pass:${options.clientP12Password}`]
    });

    writeTextFile(options.clientPasswordPath, `${options.clientP12Password}\n`, 0o600);

    try {
        fs.chmodSync(options.caKeyPath, 0o600);
        fs.chmodSync(options.serverKeyPath, 0o600);
        fs.chmodSync(options.clientKeyPath, 0o600);
    } catch {
        // chmod can be unsupported on some Windows filesystems.
    }

    [serverCsrPath, clientCsrPath, serverExtPath, clientExtPath, serialPath].forEach(removeFile);

    return {
        ...options,
        generated: true
    };
}

module.exports = {
    createPassword,
    defaultRunCommand,
    loadInstallConfig,
    normalizeBoolean,
    normalizeString,
    removeFile,
    resolveInstallPath,
    resolveDirectMtlsOptions,
    generateDirectMtlsArtifacts,
    writeTextFile
};
