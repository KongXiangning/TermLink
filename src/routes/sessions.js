const express = require('express');
const { searchWorkspaceFiles } = require('../services/workspaceFileSearch');
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';
const {
    normalizeSessionMode,
    normalizeSessionCwd,
    normalizeCodexConfig
} = require('../repositories/sessionStore');

function buildSessionResponse(session) {
    const sessionMode = normalizeSessionMode(session.sessionMode);
    return {
        id: session.id,
        name: session.name,
        sessionMode,
        cwd: normalizeSessionCwd(session.cwd),
        lastCodexThreadId: typeof session.lastCodexThreadId === 'string' && session.lastCodexThreadId.trim()
            ? session.lastCodexThreadId.trim()
            : null,
        codexConfig: normalizeCodexConfig(session.codexConfig, {
            requirePolicyAndSandbox: false
        })
    };
}

function parseCreateSessionPayload(body) {
    const payload = body || {};
    const parsed = {};

    if (payload.name !== undefined) {
        if (typeof payload.name !== 'string') {
            return { error: 'name must be a string' };
        }

        const name = payload.name.trim();
        if (name.length < 1 || name.length > 64) {
            return { error: 'name length must be between 1 and 64' };
        }
        parsed.name = name;
    }

    const sessionModeRaw = payload.sessionMode;
    if (sessionModeRaw !== undefined && typeof sessionModeRaw !== 'string') {
        return { error: 'sessionMode must be a string' };
    }
    const sessionMode = normalizeSessionMode(sessionModeRaw);
    if (
        typeof sessionModeRaw === 'string' &&
        sessionModeRaw.trim().length > 0 &&
        sessionMode !== sessionModeRaw.trim().toLowerCase()
    ) {
        return { error: 'sessionMode must be terminal or codex' };
    }

    if (payload.cwd !== undefined && typeof payload.cwd !== 'string') {
        return { error: 'cwd must be a string' };
    }
    const cwd = normalizeSessionCwd(payload.cwd);
    if (sessionMode === 'codex' && !cwd) {
        return { error: 'cwd is required when sessionMode is codex' };
    }

    if (
        payload.codexConfig !== undefined &&
        payload.codexConfig !== null &&
        (typeof payload.codexConfig !== 'object' || Array.isArray(payload.codexConfig))
    ) {
        return { error: 'codexConfig must be an object, null, or omitted' };
    }
    let codexConfig = null;
    if (sessionMode === 'codex') {
        if (payload.codexConfig === undefined || payload.codexConfig === null) {
            codexConfig = null;
        } else {
            codexConfig = normalizeCodexConfig(payload.codexConfig, { requirePolicyAndSandbox: true });
        }
        if (payload.codexConfig && !codexConfig) {
            return { error: 'codexConfig requires valid approvalPolicy and sandboxMode for codex sessions' };
        }
    } else if (payload.codexConfig !== undefined) {
        codexConfig = normalizeCodexConfig(payload.codexConfig, { requirePolicyAndSandbox: false });
        if (payload.codexConfig && !codexConfig) {
            return { error: 'codexConfig contains invalid fields' };
        }
    }

    parsed.sessionMode = sessionMode;
    parsed.cwd = cwd;
    parsed.codexConfig = codexConfig;
    return { value: parsed };
}

function parsePatchSessionPayload(body, session) {
    const payload = body || {};
    const parsed = {};

    if (!Object.prototype.hasOwnProperty.call(payload, 'name') && !Object.prototype.hasOwnProperty.call(payload, 'codexConfig')) {
        return { error: 'patch requires name or codexConfig' };
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
        if (typeof payload.name !== 'string') {
            return { error: 'name must be a string' };
        }

        const name = payload.name.trim();
        if (name.length < 1 || name.length > 64) {
            return { error: 'name length must be between 1 and 64' };
        }
        parsed.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'codexConfig')) {
        if (
            payload.codexConfig !== null &&
            (typeof payload.codexConfig !== 'object' || Array.isArray(payload.codexConfig))
        ) {
            return { error: 'codexConfig must be an object or null' };
        }

        if (payload.codexConfig === null) {
            parsed.codexConfig = null;
        } else {
            const requirePolicyAndSandbox = normalizeSessionMode(session.sessionMode) === 'codex';
            const codexConfig = normalizeCodexConfig(payload.codexConfig, { requirePolicyAndSandbox });
            if (!codexConfig) {
                return {
                    error: requirePolicyAndSandbox
                        ? 'codexConfig requires valid approvalPolicy and sandboxMode for codex sessions'
                        : 'codexConfig contains invalid fields'
                };
            }
            parsed.codexConfig = codexConfig;
        }
    }

    return { value: parsed };
}

function createSessionsRouter(sessionManager) {
    const router = express.Router();

    router.get('/sessions', (req, res) => {
        res.json(sessionManager.listSessions());
    });

    router.post('/sessions', async (req, res) => {
        const parsed = parseCreateSessionPayload(req.body);
        if (parsed.error) {
            return res.status(400).json({ error: parsed.error });
        }

        try {
            const session = await sessionManager.createSession(parsed.value);
            res.json(buildSessionResponse(session));
        } catch (e) {
            if (e && e.code === SESSION_CAPACITY_ERROR_CODE) {
                return res.status(409).json({
                    error: 'Session capacity exceeded',
                    code: SESSION_CAPACITY_ERROR_CODE,
                    maxSessionCount: e.maxSessionCount
                });
            }
            console.error('Failed to create session:', e);
            return res.status(500).json({ error: 'Failed to create session' });
        }
    });

    router.patch('/sessions/:id', (req, res) => {
        const { id } = req.params;
        const existingSession = sessionManager.getSession(id);
        if (!existingSession) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const parsed = parsePatchSessionPayload(req.body, existingSession);
        if (parsed.error) {
            return res.status(400).json({ error: parsed.error });
        }

        const session = typeof sessionManager.updateSession === 'function'
            ? sessionManager.updateSession(id, parsed.value)
            : sessionManager.renameSession(id, parsed.value.name);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json(buildSessionResponse(session));
    });

    router.delete('/sessions/:id', (req, res) => {
        const { id } = req.params;
        const success = sessionManager.deleteSession(id);
        if (success) {
            return res.json({ status: 'ok' });
        }
        return res.status(404).json({ error: 'Session not found' });
    });

    router.get('/sessions/:id/workspace/files', (req, res) => {
        const { id } = req.params;
        const session = sessionManager.getSession(id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { cwd } = session;
        if (!cwd || typeof cwd !== 'string') {
            return res.json({ files: [] });
        }

        const query = typeof req.query.q === 'string' ? req.query.q : '';
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

        const files = searchWorkspaceFiles(cwd, query, limit);
        return res.json({ files });
    });

    return router;
}

module.exports = createSessionsRouter;
module.exports.parseCreateSessionPayload = parseCreateSessionPayload;
module.exports.parsePatchSessionPayload = parsePatchSessionPayload;
