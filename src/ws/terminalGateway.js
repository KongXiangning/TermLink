const { verifyWsUpgrade } = require('../auth/basicAuth');

function registerTerminalGateway(wss, { sessionManager, heartbeatMs = 30000 }) {
    const handleConnection = async (ws, req) => {
        // ── Auth gate: reject unauthenticated WebSocket connections ──
        if (!verifyWsUpgrade(req)) {
            ws.close(4401, 'Unauthorized');
            return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionIdProvided = url.searchParams.has('sessionId');
        const sessionId = sessionIdProvided ? url.searchParams.get('sessionId') : null;

        let session;
        if (sessionIdProvided) {
            session = sessionManager.getSession(sessionId);
        }

        if (!session) {
            if (sessionIdProvided) {
                // sessionId was provided but session not found - return error
                ws.close(4404, 'Session not found');
                return;
            }
            // No sessionId provided - create new session
            try {
                session = await sessionManager.createSession({ name: 'Default Session' });
            } catch (e) {
                if (e.code === 'SESSION_CAPACITY_FULL') {
                    ws.close(4503, 'Session capacity reached');
                    return;
                }
                throw e;
            }
        }

        sessionManager.addConnection(session, ws);
        const pty = session.ptyService;

        ws.send(JSON.stringify({
            type: 'session_info',
            sessionId: session.id,
            name: session.name
        }));

        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', (message) => {
            try {
                const envelope = JSON.parse(message);
                const type = envelope.type;

                if (type === 'input') {
                    pty.write(envelope.data);
                } else if (type === 'resize') {
                    pty.resize(envelope.cols, envelope.rows);
                }
            } catch (e) {
                console.error('Failed to parse message:', e.message);
            }
        });

        ws.on('close', () => {
            sessionManager.removeConnection(session, ws);
        });
    };

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, heartbeatMs);

    const handleWssClose = () => {
        clearInterval(heartbeatInterval);
    };

    wss.on('connection', handleConnection);
    wss.on('close', handleWssClose);

    return () => {
        clearInterval(heartbeatInterval);
        wss.removeListener('connection', handleConnection);
        wss.removeListener('close', handleWssClose);
    };
}

module.exports = registerTerminalGateway;
