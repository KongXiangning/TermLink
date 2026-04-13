const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const EventEmitter = require('node:events');

const DEFAULT_REQUEST_TIMEOUT_MS = 120000;

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function compactForLog(value, maxLength = 4000) {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}...<truncated>`;
}

function fileExists(targetPath) {
    if (!isNonEmptyString(targetPath)) return false;
    try {
        return fs.statSync(targetPath).isFile();
    } catch (_) {
        return false;
    }
}

function readUserHomeDirectory() {
    return os.homedir() || process.env.USERPROFILE || process.env.HOME || '';
}

function parseVersionFromExtensionName(name) {
    const prefix = 'openai.chatgpt-';
    if (!name || !name.startsWith(prefix)) return null;
    const rest = name.slice(prefix.length);
    const delimiterIndex = rest.indexOf('-');
    if (delimiterIndex < 0) return null;
    const rawVersion = rest.slice(0, delimiterIndex);
    const parts = rawVersion.split('.').map((part) => Number.parseInt(part, 10));
    if (parts.length < 2 || parts.some((part) => !Number.isFinite(part) || part < 0)) {
        return null;
    }
    return parts;
}

function compareVersionArrays(left, right) {
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
        const a = left[i] ?? 0;
        const b = right[i] ?? 0;
        if (a > b) return -1;
        if (a < b) return 1;
    }
    return 0;
}

function findBundledCodexExecutableFromVsCodeExtension() {
    const homeDir = readUserHomeDirectory();
    if (!homeDir) return null;

    const extensionsRoot = path.join(homeDir, '.vscode', 'extensions');
    if (!fs.existsSync(extensionsRoot)) return null;

    let candidates = [];
    try {
        const entries = fs.readdirSync(extensionsRoot, { withFileTypes: true });
        candidates = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((name) => name.startsWith('openai.chatgpt-'))
            .map((name) => {
                const fullPath = path.join(extensionsRoot, name);
                const version = parseVersionFromExtensionName(name) || [0, 0, 0];
                return { name, fullPath, version };
            })
            .sort((a, b) => compareVersionArrays(a.version, b.version));
    } catch (_) {
        return null;
    }

    const platformCandidates = process.platform === 'win32'
        ? ['bin/windows-x86_64/codex.exe']
        : process.platform === 'darwin'
            ? ['bin/darwin-arm64/codex', 'bin/darwin-x86_64/codex']
            : ['bin/linux-x86_64/codex'];

    for (const extensionEntry of candidates) {
        for (const executableRelativePath of platformCandidates) {
            const executablePath = path.join(extensionEntry.fullPath, executableRelativePath);
            if (fileExists(executablePath)) {
                return executablePath;
            }
        }
    }

    return null;
}

function resolveCodexExecutablePath() {
    const envCandidates = [
        process.env.TERMLINK_CODEX_EXECUTABLE,
        process.env.CODEX_EXECUTABLE,
        process.env.CHATGPT_CLI_EXECUTABLE
    ];

    for (const candidate of envCandidates) {
        if (fileExists(candidate)) {
            return candidate;
        }
    }

    const bundled = findBundledCodexExecutableFromVsCodeExtension();
    if (bundled) {
        return bundled;
    }

    return 'codex';
}

function normalizeApprovalPolicy(value) {
    const normalized = isNonEmptyString(value) ? value.trim() : '';
    const valid = new Set(['untrusted', 'on-failure', 'on-request', 'never']);
    return valid.has(normalized) ? normalized : null;
}

function normalizeSandboxMode(value) {
    const normalized = isNonEmptyString(value) ? value.trim() : '';
    const valid = new Set(['read-only', 'workspace-write', 'danger-full-access']);
    return valid.has(normalized) ? normalized : null;
}

function normalizeLaunchRuntimeConfig(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        approvalPolicy: normalizeApprovalPolicy(source.approvalPolicy),
        sandboxMode: normalizeSandboxMode(source.sandboxMode)
    };
}

function buildLaunchRuntimeConfigSignature(value) {
    return JSON.stringify(normalizeLaunchRuntimeConfig(value));
}

function buildCodexAppServerArgs(runtimeConfig) {
    const normalizedConfig = normalizeLaunchRuntimeConfig(runtimeConfig);
    const args = ['app-server'];
    if (normalizedConfig.approvalPolicy) {
        args.push('-c', `approval_policy="${normalizedConfig.approvalPolicy}"`);
    }
    if (normalizedConfig.sandboxMode) {
        args.push('-c', `sandbox_mode="${normalizedConfig.sandboxMode}"`);
    }
    args.push('--listen', 'stdio://', '--analytics-default-enabled');
    return args;
}

function extractThreadIdFromParams(params) {
    if (!params || typeof params !== 'object') {
        return null;
    }

    if (isNonEmptyString(params.threadId)) {
        return params.threadId;
    }
    if (isNonEmptyString(params.conversationId)) {
        return params.conversationId;
    }
    if (params.thread && typeof params.thread === 'object' && isNonEmptyString(params.thread.id)) {
        return params.thread.id;
    }

    return null;
}

function extractTurnIdFromParams(params) {
    if (!params || typeof params !== 'object') {
        return null;
    }

    if (isNonEmptyString(params.turnId)) {
        return params.turnId;
    }
    if (params.turn && typeof params.turn === 'object' && isNonEmptyString(params.turn.id)) {
        return params.turn.id;
    }

    return null;
}

function extractItemIdFromParams(params) {
    if (!params || typeof params !== 'object') {
        return null;
    }

    if (isNonEmptyString(params.itemId)) {
        return params.itemId;
    }
    if (params.item && typeof params.item === 'object' && isNonEmptyString(params.item.id)) {
        return params.item.id;
    }

    return null;
}

function describeServerRequestMethod(method) {
    const normalizedMethod = isNonEmptyString(method) ? method.trim() : '';
    if (normalizedMethod === 'item/commandExecution/requestApproval') {
        return {
            method: normalizedMethod,
            requestKind: 'command',
            responseMode: 'decision',
            handledByClient: true
        };
    }
    if (normalizedMethod === 'execCommandApproval') {
        return {
            method: normalizedMethod,
            requestKind: 'command',
            responseMode: 'decision',
            handledByClient: true
        };
    }
    if (normalizedMethod === 'item/fileChange/requestApproval') {
        return {
            method: normalizedMethod,
            requestKind: 'file',
            responseMode: 'decision',
            handledByClient: true
        };
    }
    if (normalizedMethod === 'applyPatchApproval') {
        return {
            method: normalizedMethod,
            requestKind: 'patch',
            responseMode: 'decision',
            handledByClient: true
        };
    }
    if (normalizedMethod === 'item/tool/requestUserInput') {
        return {
            method: normalizedMethod,
            requestKind: 'userInput',
            responseMode: 'answers',
            handledByClient: true
        };
    }
    return {
        method: normalizedMethod,
        requestKind: 'unknown',
        responseMode: 'unknown',
        handledByClient: false
    };
}

class CodexAppServerService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.stdoutReader = null;
        this.started = false;
        this.startingPromise = null;
        this.initializePromise = null;
        this.nextRequestId = 1;
        this.pendingRequests = new Map();
        this.pendingServerRequests = new Map();
        this.packageVersion = this.readPackageVersion();
        this.executablePath = resolveCodexExecutablePath();
        this.launchRuntimeConfigSignature = null;
        this.intentionalStopProcess = null;
    }

    readPackageVersion() {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return isNonEmptyString(parsed.version) ? parsed.version : '1.0.0';
        } catch (_) {
            return '1.0.0';
        }
    }

    async ensureStarted(runtimeConfig = null) {
        const hasExplicitRuntimeConfig = runtimeConfig && typeof runtimeConfig === 'object';
        const nextSignature = hasExplicitRuntimeConfig
            ? buildLaunchRuntimeConfigSignature(runtimeConfig)
            : this.launchRuntimeConfigSignature;
        if (this.started && this.process && !this.process.killed) {
            if (!hasExplicitRuntimeConfig || this.launchRuntimeConfigSignature === nextSignature) {
                return false;
            }
        }
        if (this.started && this.process && !this.process.killed && this.launchRuntimeConfigSignature === nextSignature) {
            return false;
        }
        if (this.startingPromise) {
            await this.startingPromise;
            return !hasExplicitRuntimeConfig || this.launchRuntimeConfigSignature === nextSignature ? false : true;
        }

        this.startingPromise = this.startInternal(hasExplicitRuntimeConfig ? runtimeConfig : null);
        try {
            await this.startingPromise;
            return true;
        } finally {
            this.startingPromise = null;
        }
    }

    async startInternal(runtimeConfig = null) {
        this.stop();

        const normalizedRuntimeConfig = normalizeLaunchRuntimeConfig(runtimeConfig);
        const args = buildCodexAppServerArgs(normalizedRuntimeConfig);
        const child = spawn(this.executablePath, args, {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process = child;
        this.intentionalStopProcess = null;
        this.started = true;
        this.nextRequestId = 1;
        this.pendingRequests.clear();
        this.pendingServerRequests.clear();
        this.launchRuntimeConfigSignature = buildLaunchRuntimeConfigSignature(normalizedRuntimeConfig);

        child.on('error', (error) => {
            if (this.process !== child) {
                return;
            }
            this.emit('fatal', {
                code: 'CODEX_PROCESS_ERROR',
                message: error.message || String(error)
            });
            this.rejectPendingRequests(error);
            this.started = false;
        });

        child.on('exit', (code, signal) => {
            const wasIntentionalStop = this.intentionalStopProcess === child;
            if (this.process === child) {
                this.process = null;
            }
            if (this.intentionalStopProcess === child) {
                this.intentionalStopProcess = null;
            }
            if (wasIntentionalStop) {
                this.started = false;
                this.launchRuntimeConfigSignature = null;
                return;
            }
            if (this.process !== child && this.process !== null) {
                return;
            }
            const details = { code, signal };
            this.started = false;
            this.launchRuntimeConfigSignature = null;
            this.rejectPendingRequests(new Error(`Codex app-server exited (${JSON.stringify(details)})`));
            this.emit('fatal', {
                code: 'CODEX_PROCESS_EXIT',
                message: `Codex app-server exited (${JSON.stringify(details)})`
            });
        });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
            const message = String(chunk || '').trim();
            if (message.length > 0) {
                this.emit('stderr', message);
            }
        });

        child.stdout.setEncoding('utf8');
        this.stdoutReader = readline.createInterface({
            input: child.stdout,
            crlfDelay: Infinity
        });
        this.stdoutReader.on('line', (line) => this.handleIncomingLine(line));

        this.initializePromise = this.bootstrapHandshake();
        await this.initializePromise;
        this.initializePromise = null;
    }

    stop() {
        if (this.stdoutReader) {
            this.stdoutReader.removeAllListeners();
            this.stdoutReader.close();
            this.stdoutReader = null;
        }

        if (this.process) {
            try {
                this.intentionalStopProcess = this.process;
                this.process.kill();
            } catch (_) {
                // ignore process kill error
            }
            this.process = null;
        }

        this.started = false;
        this.rejectPendingRequests(new Error('Codex service stopped'));
        this.pendingServerRequests.clear();
        this.launchRuntimeConfigSignature = null;
    }

    rejectPendingRequests(error) {
        const pending = Array.from(this.pendingRequests.values());
        this.pendingRequests.clear();
        for (const item of pending) {
            clearTimeout(item.timeoutId);
            item.reject(error);
        }
    }

    async bootstrapHandshake() {
        const initializeParams = {
            clientInfo: {
                name: 'termlink-mobile',
                version: this.packageVersion
            },
            capabilities: {
                experimentalApi: true,
                optOutNotificationMethods: []
            }
        };

        await this.request('initialize', initializeParams);
        this.sendNotification('initialized', undefined);
    }

    sendRaw(message) {
        if (!this.process || !this.process.stdin || this.process.killed) {
            throw new Error('Codex app-server is not running.');
        }
        this.process.stdin.write(`${JSON.stringify(message)}\n`);
    }

    sendNotification(method, params) {
        const payload = { method };
        if (params !== undefined) {
            payload.params = params;
        }
        this.sendRaw(payload);
    }

    async request(method, params, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, runtimeConfig = null) {
        await this.ensureStarted(runtimeConfig);

        const id = String(this.nextRequestId++);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Codex request timed out: ${method}`));
            }, timeoutMs);

            this.pendingRequests.set(id, {
                resolve,
                reject,
                timeoutId,
                method
            });

            try {
                this.sendRaw({
                    id,
                    method,
                    params
                });
            } catch (error) {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(id);
                reject(error);
            }
        });
    }

    handleIncomingLine(line) {
        const payload = String(line || '').trim();
        if (!payload) return;

        let message;
        try {
            message = JSON.parse(payload);
        } catch (error) {
            this.emit('stderr', `Failed to parse codex line: ${payload}`);
            return;
        }

        if (this.isRpcResponse(message)) {
            this.handleRpcResponse(message);
            return;
        }

        if (this.isServerRequest(message)) {
            this.handleServerRequest(message);
            return;
        }

        if (this.isNotification(message)) {
            console.info('[codex-app-server][notification]', JSON.stringify({
                method: message.method,
                threadId: extractThreadIdFromParams(message.params),
                turnId: extractTurnIdFromParams(message.params),
                itemId: extractItemIdFromParams(message.params)
            }));
            this.emit('notification', message);
            return;
        }

        this.emit('stderr', `Unhandled codex payload: ${payload}`);
    }

    isRpcResponse(message) {
        return message
            && Object.prototype.hasOwnProperty.call(message, 'id')
            && (Object.prototype.hasOwnProperty.call(message, 'result')
                || Object.prototype.hasOwnProperty.call(message, 'error'));
    }

    isServerRequest(message) {
        return message
            && Object.prototype.hasOwnProperty.call(message, 'id')
            && isNonEmptyString(message.method)
            && !Object.prototype.hasOwnProperty.call(message, 'result')
            && !Object.prototype.hasOwnProperty.call(message, 'error');
    }

    isNotification(message) {
        return message
            && !Object.prototype.hasOwnProperty.call(message, 'id')
            && isNonEmptyString(message.method);
    }

    handleRpcResponse(message) {
        const responseId = String(message.id);
        const pending = this.pendingRequests.get(responseId);
        if (!pending) {
            return;
        }
        this.pendingRequests.delete(responseId);
        clearTimeout(pending.timeoutId);

        if (pending.method === 'turn/start') {
            console.info('[codex-app-server][rpc][turn/start]', JSON.stringify({
                responseId,
                hasError: !!(Object.prototype.hasOwnProperty.call(message, 'error') && message.error),
                threadId: extractThreadIdFromParams(message.result),
                turnId: extractTurnIdFromParams(message.result)
            }));
        }

        if (Object.prototype.hasOwnProperty.call(message, 'error') && message.error) {
            const error = new Error(message.error.message || `Codex request failed: ${pending.method}`);
            error.code = message.error.code;
            error.data = message.error.data;
            pending.reject(error);
            return;
        }

        pending.resolve(message.result);
    }

    handleServerRequest(message) {
        const requestId = String(message.id);
        const descriptor = describeServerRequestMethod(message.method);
        const params = message && typeof message.params === 'object' ? message.params : null;
        const questionCount = Array.isArray(params && params.questions) ? params.questions.length : 0;
        console.info('[codex-app-server][server-request]', compactForLog({
            requestId,
            method: message && message.method ? message.method : 'unknown',
            requestKind: descriptor.requestKind,
            responseMode: descriptor.responseMode,
            handledByClient: descriptor.handledByClient,
            questionCount,
            params
        }));
        if (descriptor.handledByClient) {
            this.pendingServerRequests.set(requestId, {
                rawId: message.id,
                message
            });
            this.emit('server_request', {
                requestId,
                message,
                handledBy: 'client',
                requestKind: descriptor.requestKind,
                responseMode: descriptor.responseMode
            });
            return;
        }

        const defaultResponse = this.buildDefaultServerRequestResponse(message);

        if (defaultResponse.error) {
            this.sendRpcError(message.id, defaultResponse.error.code, defaultResponse.error.message, defaultResponse.error.data);
            this.emit('server_request', {
                requestId,
                message,
                handledBy: 'default-error',
                requestKind: descriptor.requestKind,
                responseMode: descriptor.responseMode
            });
            return;
        }

        this.sendRpcResult(message.id, defaultResponse.result);
        this.emit('server_request', {
            requestId,
            message,
            handledBy: 'default-result',
            result: defaultResponse.result,
            requestKind: descriptor.requestKind,
            responseMode: descriptor.responseMode
        });
    }

    shouldDeferServerRequest(method) {
        return describeServerRequestMethod(method).handledByClient;
    }

    buildDefaultServerRequestResponse(message) {
        const method = message.method;
        const params = message.params || {};

        if (method === 'item/commandExecution/requestApproval') {
            return { result: { decision: 'decline' } };
        }
        if (method === 'item/fileChange/requestApproval') {
            return { result: { decision: 'decline' } };
        }
        if (method === 'item/tool/requestUserInput') {
            const answers = {};
            const questions = Array.isArray(params.questions) ? params.questions : [];
            for (const question of questions) {
                if (!question || !isNonEmptyString(question.id)) {
                    continue;
                }
                const selectedOption = Array.isArray(question.options) && question.options.length > 0
                    ? question.options[0]
                    : null;
                const optionLabel = selectedOption && isNonEmptyString(selectedOption.label)
                    ? selectedOption.label
                    : '';
                answers[question.id] = { answers: [optionLabel] };
            }
            return { result: { answers } };
        }
        if (method === 'applyPatchApproval') {
            return { result: { decision: 'denied' } };
        }
        if (method === 'execCommandApproval') {
            return { result: { decision: 'denied' } };
        }
        if (method === 'account/chatgptAuthTokens/refresh') {
            return {
                error: {
                    code: -32002,
                    message: 'ChatGPT token refresh is not implemented by TermLink bridge.'
                }
            };
        }
        if (method === 'item/tool/call') {
            return {
                error: {
                    code: -32003,
                    message: 'Dynamic tool calls are not implemented by TermLink bridge.'
                }
            };
        }

        return {
            error: {
                code: -32601,
                message: `Unsupported server request method: ${method}`
            }
        };
    }

    sendRpcResult(id, result) {
        this.sendRaw({
            id,
            result
        });
    }

    sendRpcError(id, code, message, data) {
        const error = { code, message };
        if (data !== undefined) {
            error.data = data;
        }
        this.sendRaw({
            id,
            error
        });
    }

    respondToServerRequest(requestId, response = {}) {
        const key = String(requestId || '');
        const pending = this.pendingServerRequests.get(key);
        if (!pending) {
            throw new Error(`Unknown pending Codex server request: ${key}`);
        }
        this.pendingServerRequests.delete(key);
        const message = pending.message;
        const responseId = Object.prototype.hasOwnProperty.call(pending, 'rawId') ? pending.rawId : key;

        if (response && response.useDefault === true) {
            const defaultResponse = this.buildDefaultServerRequestResponse(message);
            if (defaultResponse.error) {
                this.sendRpcError(responseId, defaultResponse.error.code, defaultResponse.error.message, defaultResponse.error.data);
                return;
            }
            this.sendRpcResult(responseId, defaultResponse.result);
            return;
        }

        if (response && response.error) {
            const error = response.error || {};
            this.sendRpcError(
                responseId,
                error.code ?? -32000,
                error.message || 'Codex server request rejected.',
                error.data
            );
            return;
        }

        this.sendRpcResult(responseId, response ? response.result : null);
    }

    static extractThreadId(message) {
        if (!message || typeof message !== 'object') return null;
        return extractThreadIdFromParams(message.params);
    }
}

module.exports = CodexAppServerService;
module.exports.buildCodexAppServerArgs = buildCodexAppServerArgs;
module.exports.normalizeLaunchRuntimeConfig = normalizeLaunchRuntimeConfig;
module.exports.buildLaunchRuntimeConfigSignature = buildLaunchRuntimeConfigSignature;
