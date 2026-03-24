const express = require('express');
const {
    normalizeBooleanFlag,
    formatWorkspaceError
} = require('../services/workspacePathUtils');
const {
    listWorkspaceDirectory,
    readWorkspaceFile,
    readWorkspaceFileSegment,
    readWorkspaceLimitedSegment,
    listPickerDirectories
} = require('../services/workspaceFileService');
const {
    resolveWorkspaceMeta,
    resolveWorkspaceAccess
} = require('../services/workspaceContextResolver');
const {
    getDirectoryStatusMap,
    getFileDiff
} = require('../services/workspaceGitService');

function sendWorkspaceError(res, error) {
    const formatted = formatWorkspaceError(error);
    return res.status(formatted.status).json(formatted.body);
}

function mergeGitStatuses(entries, statusMap) {
    if (!statusMap || !(statusMap instanceof Map)) {
        return entries;
    }
    return entries.map((entry) => ({
        ...entry,
        gitStatus: statusMap.get(entry.name) || null
    }));
}

function createWorkspaceRouter(sessionManager) {
    const router = express.Router();

    router.get('/sessions/:id/workspace/meta', async (req, res) => {
        try {
            const payload = await resolveWorkspaceMeta(sessionManager, req.params.id);
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/tree', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const showHidden = normalizeBooleanFlag(req.query.showHidden, true);
            const tree = await listWorkspaceDirectory(access.workspaceRoot, req.query.path, { showHidden });
            const statusResult = await getDirectoryStatusMap({
                sessionId: access.sessionId,
                workspaceRoot: access.workspaceRoot,
                gitRoot: access.gitRoot,
                relativePath: req.query.path || '',
                entryNames: new Set(tree.entries.map((entry) => entry.name)),
                refresh: normalizeBooleanFlag(req.query.refresh, false)
            });
            return res.json({
                path: tree.path,
                entries: mergeGitStatuses(tree.entries, statusResult.map)
            });
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/file', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const payload = await readWorkspaceFile(access.workspaceRoot, req.query.path);
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/file-segment', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const payload = await readWorkspaceFileSegment(
                access.workspaceRoot,
                req.query.path,
                req.query.offset,
                req.query.length
            );
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/file-limited', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const payload = await readWorkspaceLimitedSegment(
                access.workspaceRoot,
                req.query.path,
                req.query.mode
            );
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/status', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const showHidden = normalizeBooleanFlag(req.query.showHidden, true);
            const tree = await listWorkspaceDirectory(access.workspaceRoot, req.query.path, { showHidden });
            const statusResult = await getDirectoryStatusMap({
                sessionId: access.sessionId,
                workspaceRoot: access.workspaceRoot,
                gitRoot: access.gitRoot,
                relativePath: req.query.path || '',
                entryNames: new Set(tree.entries.map((entry) => entry.name)),
                refresh: normalizeBooleanFlag(req.query.refresh, false)
            });
            return res.json({
                path: tree.path,
                isGitRepo: statusResult.isGitRepo,
                items: statusResult.items
            });
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/sessions/:id/workspace/diff', async (req, res) => {
        try {
            const access = await resolveWorkspaceAccess(sessionManager, req.params.id);
            const payload = await getFileDiff({
                workspaceRoot: access.workspaceRoot,
                gitRoot: access.gitRoot,
                requestedPath: req.query.path
            });
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    router.get('/workspace/picker/tree', async (req, res) => {
        try {
            const payload = await listPickerDirectories(req.query.path);
            return res.json(payload);
        } catch (error) {
            return sendWorkspaceError(res, error);
        }
    });

    return router;
}

module.exports = createWorkspaceRouter;
