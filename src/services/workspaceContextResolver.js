const fs = require('fs/promises');
const path = require('path');
const {
    WORKSPACE_FEATURES,
    WORKSPACE_ROOT_SOURCE,
    DEFAULT_ENTRY_CANDIDATES,
    toPortableRelativePath
} = require('./workspaceConstants');
const { WorkspaceError } = require('./workspacePathUtils');
const { detectGitRepo } = require('./workspaceGitService');

async function detectDefaultEntryPath(workspaceRoot) {
    for (const candidate of DEFAULT_ENTRY_CANDIDATES) {
        const targetPath = path.join(workspaceRoot, candidate);
        try {
            const stats = await fs.stat(targetPath);
            if (stats.isDirectory()) {
                return candidate;
            }
        } catch (error) {
            // ignore
        }
    }
    return '';
}

function ensureSessionExists(sessionManager, sessionId) {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        throw new WorkspaceError('WORKSPACE_SESSION_NOT_FOUND', 'Session not found.', 404);
    }
    return session;
}

function ensureCodexSession(session) {
    if (String(session.sessionMode || '').trim().toLowerCase() !== 'codex') {
        throw new WorkspaceError('WORKSPACE_NOT_CODEX_SESSION', 'Workspace is only available for Codex sessions.', 400);
    }
}

function persistSession(sessionManager) {
    if (sessionManager && typeof sessionManager.schedulePersist === 'function') {
        sessionManager.schedulePersist();
    }
}

function ensureWorkspaceRoot(sessionManager, session) {
    if (typeof session.workspaceRoot === 'string' && session.workspaceRoot.trim()) {
        return session.workspaceRoot.trim();
    }
    if (typeof session.cwd === 'string' && session.cwd.trim()) {
        session.workspaceRoot = session.cwd.trim();
        session.workspaceRootSource = WORKSPACE_ROOT_SOURCE;
        persistSession(sessionManager);
        return session.workspaceRoot;
    }
    return null;
}

async function resolveWorkspaceMeta(sessionManager, sessionId) {
    const session = ensureSessionExists(sessionManager, sessionId);
    ensureCodexSession(session);

    const workspaceRoot = ensureWorkspaceRoot(sessionManager, session);
    if (!workspaceRoot) {
        return {
            sessionId,
            workspaceRoot: null,
            workspaceRootSource: null,
            defaultEntryPath: '',
            isGitRepo: false,
            gitRoot: null,
            features: {
                contentPreview: false,
                diffPreview: false,
                segmentedView: false,
                limitedView: false
            },
            disabledReason: 'workspace_root_unavailable'
        };
    }

    const defaultEntryPath = await detectDefaultEntryPath(workspaceRoot);
    const gitInfo = await detectGitRepo(workspaceRoot);
    return {
        sessionId,
        workspaceRoot,
        workspaceRootSource: session.workspaceRootSource || WORKSPACE_ROOT_SOURCE,
        defaultEntryPath: toPortableRelativePath(defaultEntryPath),
        isGitRepo: gitInfo.isGitRepo,
        gitRoot: gitInfo.gitRoot,
        features: { ...WORKSPACE_FEATURES },
        disabledReason: null
    };
}

async function resolveWorkspaceAccess(sessionManager, sessionId) {
    const session = ensureSessionExists(sessionManager, sessionId);
    ensureCodexSession(session);

    const workspaceRoot = ensureWorkspaceRoot(sessionManager, session);
    if (!workspaceRoot) {
        throw new WorkspaceError('WORKSPACE_ROOT_NOT_AVAILABLE', 'Workspace root is not available for this session.', 404);
    }

    const gitInfo = await detectGitRepo(workspaceRoot);
    return {
        session,
        sessionId,
        workspaceRoot,
        workspaceRootSource: session.workspaceRootSource || WORKSPACE_ROOT_SOURCE,
        gitRoot: gitInfo.gitRoot,
        isGitRepo: gitInfo.isGitRepo
    };
}

module.exports = {
    resolveWorkspaceMeta,
    resolveWorkspaceAccess,
    ensureWorkspaceRoot
};
