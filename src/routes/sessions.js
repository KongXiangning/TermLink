const express = require('express');
const SESSION_CAPACITY_ERROR_CODE = 'SESSION_CAPACITY_EXCEEDED';
const { normalizeSessionMode, normalizeSessionCwd } = require('../repositories/sessionStore');

function buildSessionResponse(session) {
    return {
        id: session.id,
        name: session.name,
        sessionMode: normalizeSessionMode(session.sessionMode),
        cwd: normalizeSessionCwd(session.cwd),
        lastCodexThreadId: typeof session.lastCodexThreadId === 'string' && session.lastCodexThreadId.trim()
            ? session.lastCodexThreadId.trim()
            : null
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

    parsed.sessionMode = sessionMode;
    parsed.cwd = cwd;
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
        const rawName = req.body ? req.body.name : undefined;

        if (typeof rawName !== 'string') {
            return res.status(400).json({ error: 'name must be a string' });
        }

        const name = rawName.trim();
        if (name.length < 1 || name.length > 64) {
            return res.status(400).json({ error: 'name length must be between 1 and 64' });
        }

        const session = sessionManager.renameSession(id, name);
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

    return router;
}

module.exports = createSessionsRouter;
module.exports.parseCreateSessionPayload = parseCreateSessionPayload;
