require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const basicAuth = require('./auth/basicAuth');
const createHealthRouter = require('./routes/health');
const createSessionsRouter = require('./routes/sessions');
const sessionManager = require('./services/sessionManager');
const registerTerminalGateway = require('./ws/terminalGateway');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

app.use(express.json());

// Enable CORS for Mobile App Access (file:// origin)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// app.use(basicAuth); // Disabled for mobile app testing without login UI
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', createSessionsRouter(sessionManager));
app.use('/api', createHealthRouter());
registerTerminalGateway(wss, { sessionManager, heartbeatMs: 30000 });

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
