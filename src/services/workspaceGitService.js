const { execFile } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const { GIT_STATUS_CACHE_TTL_MS, VIEW_MODE_THRESHOLDS, toPortableRelativePath } = require('./workspaceConstants');
const { WorkspaceError, resolveWorkspaceTarget } = require('./workspacePathUtils');

const execFileAsync = promisify(execFile);
const statusCache = new Map();

function mapGitStatus(code) {
    if (!code) return null;
    if (code.includes('?')) return '?';
    if (code.includes('R')) return 'R';
    if (code.includes('A')) return 'A';
    if (code.includes('D')) return 'D';
    if (code.includes('M')) return 'M';
    return null;
}

async function detectGitRepo(workspaceRoot) {
    try {
        const { stdout } = await execFileAsync('git', ['-C', workspaceRoot, 'rev-parse', '--show-toplevel'], {
            windowsHide: true
        });
        const gitRoot = stdout.trim();
        if (!gitRoot) {
            return { isGitRepo: false, gitRoot: null };
        }
        return { isGitRepo: true, gitRoot };
    } catch (error) {
        return { isGitRepo: false, gitRoot: null };
    }
}

function parsePorcelainZ(stdout) {
    const tokens = stdout.split('\0').filter(Boolean);
    const items = [];
    for (let index = 0; index < tokens.length; index += 1) {
        const entry = tokens[index];
        if (!entry || entry.length < 3) {
            continue;
        }
        const code = entry.slice(0, 2);
        const firstPath = entry.slice(3);
        const status = mapGitStatus(code);
        if (!status) {
            continue;
        }
        if (status === 'R') {
            const nextPath = tokens[index + 1] || '';
            index += 1;
            items.push({
                path: nextPath || firstPath,
                gitStatus: status,
                previousPath: firstPath
            });
            continue;
        }
        items.push({
            path: firstPath,
            gitStatus: status
        });
    }
    return items;
}

async function getGitStatusEntries(sessionId, gitRoot) {
    const cacheKey = `${sessionId}|${gitRoot}`;
    const cached = statusCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < GIT_STATUS_CACHE_TTL_MS) {
        return cached.items;
    }

    const { stdout } = await execFileAsync('git', ['-C', gitRoot, 'status', '--porcelain=v1', '-z'], {
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024
    });
    const items = parsePorcelainZ(stdout);
    statusCache.set(cacheKey, {
        timestamp: now,
        items
    });
    return items;
}

function invalidateGitStatusCache(sessionId, gitRoot) {
    if (!sessionId || !gitRoot) {
        return;
    }
    statusCache.delete(`${sessionId}|${gitRoot}`);
}

async function getDirectoryStatusMap(options) {
    const {
        sessionId,
        workspaceRoot,
        gitRoot,
        relativePath,
        entryNames,
        refresh
    } = options;

    if (!gitRoot) {
        return { isGitRepo: false, items: [], map: new Map() };
    }
    if (refresh) {
        invalidateGitStatusCache(sessionId, gitRoot);
    }

    const rootTarget = await resolveWorkspaceTarget(workspaceRoot, relativePath || '');
    const relativeDirFromGitRoot = path.relative(gitRoot, rootTarget.realTargetPath);
    const normalizedDirPrefix = relativeDirFromGitRoot === '' ? '' : toPortableRelativePath(relativeDirFromGitRoot);
    const map = new Map();

    const statusEntries = await getGitStatusEntries(sessionId, gitRoot);
    for (const item of statusEntries) {
        const portablePath = toPortableRelativePath(item.path);
        if (normalizedDirPrefix && portablePath !== normalizedDirPrefix && !portablePath.startsWith(`${normalizedDirPrefix}/`)) {
            continue;
        }
        const relativeInsideDir = normalizedDirPrefix
            ? portablePath.slice(normalizedDirPrefix.length).replace(/^\/+/, '')
            : portablePath;
        const firstSegment = relativeInsideDir.split('/')[0];
        if (!firstSegment || (entryNames && !entryNames.has(firstSegment))) {
            continue;
        }
        if (!map.has(firstSegment)) {
            map.set(firstSegment, item.gitStatus);
        }
    }

    const items = Array.from(map.entries()).map(([name, gitStatus]) => ({
        path: normalizedDirPrefix ? `${normalizedDirPrefix}/${name}` : name,
        gitStatus
    }));

    return { isGitRepo: true, items, map };
}

async function getFileDiff(options) {
    const { workspaceRoot, gitRoot, requestedPath } = options;
    if (!gitRoot) {
        return {
            path: requestedPath,
            isGitRepo: false,
            hasChanges: false,
            reason: 'not_git_repo'
        };
    }

    const target = await resolveWorkspaceTarget(workspaceRoot, requestedPath);
    if (!target.stats.isFile()) {
        throw new WorkspaceError('WORKSPACE_PATH_INVALID', 'Requested path must be a file.', 400);
    }

    const relativePathFromGitRoot = path.relative(gitRoot, target.realTargetPath);
    try {
        await execFileAsync('git', ['-C', gitRoot, 'ls-files', '--error-unmatch', '--', relativePathFromGitRoot], {
            windowsHide: true
        });
    } catch (error) {
        return {
            path: target.portablePath,
            isGitRepo: true,
            hasChanges: false,
            reason: 'untracked_file'
        };
    }

    const { stdout } = await execFileAsync(
        'git',
        ['-C', gitRoot, 'diff', '--no-ext-diff', '--', relativePathFromGitRoot],
        {
            windowsHide: true,
            maxBuffer: 4 * 1024 * 1024
        }
    );

    if (!stdout) {
        return {
            path: target.portablePath,
            isGitRepo: true,
            hasChanges: false
        };
    }

    const truncated = Buffer.byteLength(stdout, 'utf8') > VIEW_MODE_THRESHOLDS.diffMaxBytes;
    const diffText = truncated
        ? stdout.slice(0, VIEW_MODE_THRESHOLDS.diffMaxBytes)
        : stdout;

    return {
        path: target.portablePath,
        isGitRepo: true,
        hasChanges: true,
        truncated,
        reason: truncated ? 'diff_too_large' : null,
        diffText
    };
}

module.exports = {
    detectGitRepo,
    getDirectoryStatusMap,
    getFileDiff,
    invalidateGitStatusCache
};
