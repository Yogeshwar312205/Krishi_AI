const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { connectDB, getIsConnected } = require('./config/db');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { initSockets } = require('./sockets/trackingSocket');
const { checkAiEngineHealth } = require('./services/aiEngineService');

const app = express();
const server = http.createServer(app);

// Security & Middleware Stack
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Connect Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Microservices Health & Status Route
app.get('/health', async (req, res) => {
  const pythonStatus = await checkAiEngineHealth();

  res.json({
    status: 'online',
    service: 'KrishiFlow Backend Orchestrator Core',
    timestamp: new Date().toISOString(),
    dbConnected: getIsConnected(),
    aiEngineStatus: pythonStatus.status || 'offline',
    pythonDetails: pythonStatus
  });
});

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
initSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 KrishiFlow Production Backend Core running on http://localhost:${PORT}`);
});
