#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const readline = require('readline/promises');

const INSTALL_ROOT = '/opt/termlink';
const CONFIG_ROOT = '/etc/termlink';
const DATA_ROOT = '/var/lib/termlink';

function randomSecret(bytes = 24) {
    return crypto.randomBytes(bytes).toString('base64url');
}

function invokingUser(env = process.env) {
    return env.TERMLINK_RUN_USER || env.SUDO_USER || env.USER || os.userInfo().username;
}

function createDefaults(env = process.env) {
    return {
        schemaVersion: 2,
        serviceName: 'termlink',
        autoStart: true,
        runUser: invokingUser(env),
        installDir: INSTALL_ROOT,
        configDir: CONFIG_ROOT,
        dataDir: DATA_ROOT,
        bindAddress: '127.0.0.1',
        port: 3010,
        publicHost: os.hostname() || 'localhost',
        auth: {
            enabled: true,
            user: 'admin',
            pass: ''
        },
        privilege: { mode: 'standard', elevatedEnable: false },
        tls: {
            mode: 'off',
            clientCertPolicy: 'none',
            certDir: `${CONFIG_ROOT}/certs`,
            serverCert: `${CONFIG_ROOT}/certs/server.crt`,
            serverKey: `${CONFIG_ROOT}/certs/server.key`,
            caCert: `${CONFIG_ROOT}/certs/client-ca.crt`,
            proxySecret: randomSecret(24),
            serverSource: 'generate',
            importCert: '',
            importKey: ''
        },
        mtls: {
            deployment: 'none',
            generateServerCertificates: false,
            generateDirectServerCertificates: false,
            opensslPath: 'openssl',
            serverOutputDir: `${CONFIG_ROOT}/certs`,
            clientOutputDir: `${CONFIG_ROOT}/certs/clients`,
            clientName: 'client',
            clientP12Password: ''
        },
        nginx: {
            listenPort: 443,
            configPath: '/etc/nginx/conf.d/termlink.conf'
        }
    };
}

function mergeConfig(base, override) {
    if (!override || typeof override !== 'object' || Array.isArray(override)) return base;
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === 'object' && !Array.isArray(value)
            && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = mergeConfig(result[key], value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

function validateConfig(config, { requireImportFiles = false } = {}) {
    const errors = [];
    const port = Number(config.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('port must be between 1 and 65535');
    if (!/^[A-Za-z0-9_.@-]+$/.test(String(config.serviceName || '')) || String(config.serviceName).includes('..')) {
        errors.push('serviceName contains unsupported characters');
    }
    if (!/^[A-Za-z_][A-Za-z0-9_-]*[$]?$/.test(String(config.runUser || ''))) errors.push('runUser must be a safe local user name');
    if (String(config.runUser || '').trim() === 'root') errors.push('runUser must not be root');
    const publicHost = String(config.publicHost || '').trim();
    if (!net.isIP(publicHost) && !/^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(publicHost)) {
        errors.push('publicHost must be a DNS name or IP address');
    }
    const bindAddress = String(config.bindAddress || '').trim();
    if (!net.isIP(bindAddress) && bindAddress !== 'localhost') errors.push('bindAddress must be an IP address or localhost');
    if (!['off', 'direct', 'nginx'].includes(config.tls?.mode)) errors.push('tls.mode must be off, direct, or nginx');
    if (!['none', 'request', 'require'].includes(config.tls?.clientCertPolicy)) {
        errors.push('tls.clientCertPolicy must be none, request, or require');
    }
    if (config.tls?.mode === 'off' && config.mtls?.deployment !== 'none') errors.push('mTLS requires direct or nginx TLS mode');
    if (config.tls?.mode === 'direct' && config.mtls?.deployment !== 'none' && config.mtls?.deployment !== 'direct-server') {
        errors.push('direct TLS requires mtls.deployment=direct-server');
    }
    if (config.tls?.mode === 'nginx' && config.mtls?.deployment !== 'none' && config.mtls?.deployment !== 'nginx') {
        errors.push('nginx TLS requires mtls.deployment=nginx');
    }
    if (config.mtls?.deployment !== 'none' && !['request', 'require'].includes(config.tls?.clientCertPolicy)) {
        errors.push('mTLS requires tls.clientCertPolicy=request or require');
    }
    if (config.auth?.enabled !== true && config.mtls?.deployment === 'none') errors.push('BasicAuth is mandatory when mTLS is disabled');
    if (config.auth?.enabled && (!String(config.auth.user || '').trim() || !String(config.auth.pass || '').trim())) {
        errors.push('auth.user and auth.pass are required when BasicAuth is enabled');
    }
    if (!['generate', 'import'].includes(config.tls?.serverSource)) errors.push('tls.serverSource must be generate or import');
    if (config.tls?.mode !== 'off' && config.tls?.serverSource === 'import') {
        for (const [field, value] of [['tls.importCert', config.tls.importCert], ['tls.importKey', config.tls.importKey]]) {
            if (!String(value || '').trim()) errors.push(`${field} is required for imported server certificates`);
            else if (requireImportFiles && !fs.existsSync(path.resolve(value))) errors.push(`${field} does not exist: ${value}`);
        }
    }
    for (const field of ['installDir', 'configDir', 'dataDir']) {
        if (!path.isAbsolute(String(config[field] || ''))) errors.push(`${field} must be an absolute path`);
        if (/\s/.test(String(config[field] || ''))) errors.push(`${field} must not contain whitespace`);
    }
    const nginxPort = Number(config.nginx?.listenPort);
    if (!Number.isInteger(nginxPort) || nginxPort < 1 || nginxPort > 65535) errors.push('nginx.listenPort must be between 1 and 65535');
    if (!path.isAbsolute(String(config.nginx?.configPath || '')) || /[\r\n]/.test(String(config.nginx?.configPath || ''))) {
        errors.push('nginx.configPath must be a safe absolute path');
    }
    if (errors.length) throw new Error(errors.join('\n'));
    return config;
}

function parseYes(value, fallback) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return fallback;
    return ['y', 'yes', 'true', '1', 'on'].includes(normalized);
}

async function promptValue(rl, label, fallback, { required = false, secret = false } = {}) {
    for (;;) {
        const suffix = fallback && !secret ? ` [${fallback}]` : '';
        const value = (await rl.question(`${label}${suffix}: `)).trim();
        const resolved = value || fallback;
        if (!required || String(resolved || '').trim()) return resolved;
        process.stderr.write(`${label} is required.\n`);
    }
}

async function promptChoice(rl, label, choices, fallback) {
    for (;;) {
        const value = String(await promptValue(rl, `${label} (${choices.join('/')})`, fallback)).toLowerCase();
        if (choices.includes(value)) return value;
        process.stderr.write(`Choose one of: ${choices.join(', ')}.\n`);
    }
}

async function runWizard(initial, input = process.stdin, output = process.stdout) {
    const config = mergeConfig(createDefaults(), initial);
    const rl = readline.createInterface({ input, output });
    try {
        output.write('\nTermLink Linux 安装配置 / installer configuration\n');
        config.runUser = await promptValue(rl, '服务运行用户 / Service run user', config.runUser, { required: true });
        config.port = Number(await promptValue(rl, '应用端口 / Application port', String(config.port), { required: true }));
        config.publicHost = await promptValue(rl, '公开域名或 IP / Public hostname or IP', config.publicHost, { required: true });
        config.tls.mode = await promptChoice(rl, '传输模式 / Transport mode', ['off', 'direct', 'nginx'], config.tls.mode);
        config.bindAddress = config.tls.mode === 'nginx' ? '127.0.0.1' : await promptValue(rl, '监听地址 / Bind address', '0.0.0.0', { required: true });

        if (config.tls.mode !== 'off') {
            config.tls.serverSource = await promptChoice(rl, '服务端证书来源 / Server certificate source', ['generate', 'import'], config.tls.serverSource);
            if (config.tls.serverSource === 'import') {
                config.tls.importCert = await promptValue(rl, '服务端证书 PEM 路径 / Server certificate PEM path', config.tls.importCert, { required: true });
                config.tls.importKey = await promptValue(rl, '服务端私钥 PEM 路径 / Server private key PEM path', config.tls.importKey, { required: true });
            }
            const enableMtls = parseYes(await promptValue(rl, '启用 mTLS？/ Enable mTLS? (yes/no)', config.mtls.deployment === 'none' ? 'no' : 'yes'), false);
            config.mtls.deployment = enableMtls ? (config.tls.mode === 'nginx' ? 'nginx' : 'direct-server') : 'none';
            config.tls.clientCertPolicy = enableMtls ? 'require' : 'none';
            config.mtls.generateServerCertificates = config.tls.serverSource === 'generate';
            config.mtls.generateDirectServerCertificates = config.tls.mode === 'direct' && config.tls.serverSource === 'generate';
        } else {
            config.mtls.deployment = 'none';
            config.tls.clientCertPolicy = 'none';
        }

        let authEnabled = true;
        if (config.mtls.deployment !== 'none') {
            authEnabled = parseYes(await promptValue(rl, '在 mTLS 外保留 BasicAuth？/ Keep BasicAuth? (yes/no)', 'yes'), true);
            if (!authEnabled) {
                const confirm = await promptValue(rl, '输入 DISABLE 确认关闭 BasicAuth / Type DISABLE to confirm', '', { required: true });
                authEnabled = confirm !== 'DISABLE';
            }
        }
        config.auth.enabled = authEnabled;
        if (authEnabled) {
            config.auth.user = await promptValue(rl, 'BasicAuth 用户 / user', config.auth.user, { required: true });
            config.auth.pass = await promptValue(rl, 'BasicAuth 密码 / password', '', { required: true, secret: true });
        }
        if (config.tls.mode === 'nginx') {
            config.nginx.listenPort = Number(await promptValue(rl, 'Nginx HTTPS 端口 / port', String(config.nginx.listenPort), { required: true }));
        }
        return validateConfig(config, { requireImportFiles: true });
    } finally {
        rl.close();
    }
}

function parseArgs(argv) {
    const options = { config: '', output: '', nonInteractive: false, print: false };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--config') options.config = argv[++i] || '';
        else if (token === '--output') options.output = argv[++i] || '';
        else if (token === '--non-interactive') options.nonInteractive = true;
        else if (token === '--print') options.print = true;
        else throw new Error(`Unknown argument: ${token}`);
    }
    if (!options.output && !options.print) throw new Error('--output or --print is required');
    if (options.nonInteractive && !options.config) throw new Error('--non-interactive requires --config');
    return options;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const supplied = options.config ? JSON.parse(fs.readFileSync(path.resolve(options.config), 'utf8')) : {};
    const config = options.nonInteractive
        ? validateConfig(mergeConfig(createDefaults(), supplied), { requireImportFiles: true })
        : await runWizard(supplied);
    const serialized = `${JSON.stringify(config, null, 2)}\n`;
    if (options.output) {
        fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
        fs.writeFileSync(path.resolve(options.output), serialized, { mode: 0o600 });
    }
    if (options.print) process.stdout.write(serialized);
}

if (require.main === module) {
    main().catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    });
}

module.exports = { CONFIG_ROOT, DATA_ROOT, INSTALL_ROOT, createDefaults, mergeConfig, validateConfig };
