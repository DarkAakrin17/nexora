const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const requestRoutes = require('./src/routes/requests');
const messageRoutes = require('./src/routes/messages');
const setupSocket = require('./src/socket/socketHandler');

const app = express();
const httpServer = http.createServer(app);

// Allow multiple origins (comma-separated in FRONTEND_URL)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim());

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'StudyConnect Global', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// Setup Socket.IO
setupSocket(io);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  })
  .then(() => {
    console.log('✅ MongoDB (Atlas) connected');
    httpServer.listen(PORT, () => {
      console.log(`🚀 StudyConnect Global API running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   → Make sure MONGODB_URI in .env is set to your Atlas connection string.');
    process.exit(1);
  });
