const express = require('express');

function createClientRegistrationsRouter({ registrationManager, sessionManager }) {
    const router = express.Router();

    router.post('/client-registrations', (req, res) => {
        const body = req.body || {};
        const clientType = typeof body.clientType === 'string' ? body.clientType.trim().toLowerCase() : '';
        if (!clientType || clientType.length > 32) {
            return res.status(400).json({ error: 'clientType is required' });
        }
        const registration = registrationManager.create(clientType);
        return res.status(201).json({
            registrationId: registration.id,
            clientType: registration.clientType,
            createdAt: registration.createdAt
        });
    });

    router.delete('/client-registrations/:registrationId', (req, res) => {
        const { registrationId } = req.params;
        const revoked = registrationManager.revoke(registrationId);
        if (revoked && sessionManager && typeof sessionManager.markRegistrationDeleted === 'function') {
            sessionManager.markRegistrationDeleted(registrationId);
        }
        return res.json({ status: 'ok', revoked });
    });

    return router;
}

module.exports = createClientRegistrationsRouter;
