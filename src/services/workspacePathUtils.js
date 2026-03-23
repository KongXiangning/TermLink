const fs = require('fs/promises');
const path = require('path');
const { toPortableRelativePath } = require('./workspaceConstants');

class WorkspaceError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.name = 'WorkspaceError';
        this.code = code;
        this.status = status;
    }
}

function normalizeRelativeWorkspacePath(value) {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value !== 'string') {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a string.', 400);
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    if (path.isAbsolute(trimmed) || /^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\')) {
        throw new WorkspaceError('WORKSPACE_PATH_OUT_OF_RANGE', 'Requested path is outside workspace root.', 400);
    }

    const parts = trimmed.split(/[\\/]+/).filter(Boolean);
    const normalizedParts = [];
    for (const part of parts) {
        if (part === '.' || part === '') {
            continue;
        }
        if (part === '..') {
            throw new WorkspaceError('WORKSPACE_PATH_OUT_OF_RANGE', 'Requested path is outside workspace root.', 400);
        }
        if (part === '.git') {
            throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Direct .git access is not allowed.', 400);
        }
        normalizedParts.push(part);
    }

    return normalizedParts.join(path.sep);
}

function normalizePickerPath(value) {
    if (value === undefined || value === null) {
        return path.resolve(process.cwd());
    }
    if (typeof value !== 'string') {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Picker path must be a string.', 400);
    }
    const trimmed = value.trim();
    return trimmed ? path.resolve(trimmed) : path.resolve(process.cwd());
}

function normalizeBooleanFlag(value, defaultValue = true) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
    }
    return defaultValue;
}

function assertInsideRoot(rootRealPath, targetPath) {
    const relative = path.relative(rootRealPath, targetPath);
    if (relative === '') {
        return;
    }
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new WorkspaceError('WORKSPACE_PATH_OUT_OF_RANGE', 'Requested path is outside workspace root.', 400);
    }
}

async function ensureDirectoryExists(dirPath, errorCode = 'WORKSPACE_PATH_INVALID') {
    let stats;
    try {
        stats = await fs.stat(dirPath);
    } catch (error) {
        throw new WorkspaceError(errorCode, 'Directory does not exist.', 400);
    }
    if (!stats.isDirectory()) {
        throw new WorkspaceError(errorCode, 'Path must point to a directory.', 400);
    }
}

async function resolveWorkspaceTarget(workspaceRoot, requestedPath, options = {}) {
    const normalizedPath = normalizeRelativeWorkspacePath(requestedPath);
    let workspaceRootRealPath;
    try {
        workspaceRootRealPath = await fs.realpath(workspaceRoot);
    } catch (error) {
        throw new WorkspaceError('WORKSPACE_ROOT_NOT_AVAILABLE', 'Workspace root is not available.', 404);
    }

    const logicalTargetPath = normalizedPath
        ? path.resolve(workspaceRootRealPath, normalizedPath)
        : workspaceRootRealPath;
    assertInsideRoot(workspaceRootRealPath, logicalTargetPath);

    if (options.requireExists === false) {
        return {
            workspaceRootRealPath,
            normalizedPath,
            logicalTargetPath,
            portablePath: toPortableRelativePath(normalizedPath),
            realTargetPath: logicalTargetPath,
            stats: null
        };
    }

    let realTargetPath;
    try {
        realTargetPath = await fs.realpath(logicalTargetPath);
    } catch (error) {
        throw new WorkspaceError('WORKSPACE_FILE_NOT_FOUND', 'Requested path was not found.', 404);
    }
    assertInsideRoot(workspaceRootRealPath, realTargetPath);

    let stats;
    try {
        stats = await fs.stat(realTargetPath);
    } catch (error) {
        throw new WorkspaceError('WORKSPACE_FILE_NOT_FOUND', 'Requested path was not found.', 404);
    }

    return {
        workspaceRootRealPath,
        normalizedPath,
        logicalTargetPath,
        portablePath: toPortableRelativePath(normalizedPath),
        realTargetPath,
        stats
    };
}

function formatWorkspaceError(error) {
    if (error instanceof WorkspaceError) {
        return {
            status: error.status || 400,
            body: {
                error: {
                    code: error.code || 'WORKSPACE_INTERNAL_ERROR',
                    message: error.message || 'Workspace request failed.'
                }
            }
        };
    }
    return {
        status: 500,
        body: {
            error: {
                code: 'WORKSPACE_INTERNAL_ERROR',
                message: 'Workspace request failed.'
            }
        }
    };
}

module.exports = {
    WorkspaceError,
    normalizeRelativeWorkspacePath,
    normalizePickerPath,
    normalizeBooleanFlag,
    ensureDirectoryExists,
    resolveWorkspaceTarget,
    formatWorkspaceError,
    toPortableRelativePath
};
