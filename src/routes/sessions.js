const express = require('express');

function createSessionsRouter(sessionManager) {
    const router = express.Router();

    router.get('/sessions', (req, res) => {
        res.json(sessionManager.listSessions());
    });

    router.post('/sessions', async (req, res) => {
        const { name } = req.body || {};
        const session = await sessionManager.createSession({ name });
        res.json({ id: session.id, name: session.name });
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

        return res.json({ id: session.id, name: session.name });
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
