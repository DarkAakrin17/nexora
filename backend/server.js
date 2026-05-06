const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes    = require('./src/routes/auth');
const userRoutes    = require('./src/routes/users');
const requestRoutes = require('./src/routes/requests');
const messageRoutes = require('./src/routes/messages');
const setupSocket   = require('./src/socket/socketHandler');
const { verifyEmailConfig } = require('./src/utils/email');

const app        = express();
const httpServer = http.createServer(app);

// ── Allowed origins (comma-separated in FRONTEND_URL) ──────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim());

const corsOptions = {
  origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
  credentials: true,
};

// ── Socket.IO ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Security middleware ────────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust Render's reverse proxy

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
// Lightweight NoSQL injection guard — strips keys containing $ or .
const sanitizeBody = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        if (/[$.]/g.test(key)) delete obj[key];
        else sanitize(obj[key]);
      });
    }
  };
  sanitize(req.body);
  next();
};
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeBody);

// ── Rate limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,  // strict on auth routes
  message: { message: 'Too many login attempts. Try again later.' },
});

// Very strict limiter for forgot-password — prevents email enumeration & spam
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests. Please wait 15 minutes and try again.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Nexora', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────
setupSocket(io);

// ── MongoDB + Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    console.log('✅ MongoDB (Atlas) connected');
    // Verify email config immediately so startup logs show if email is broken
    await verifyEmailConfig();
    httpServer.listen(PORT, () => {
      console.log(`🚀 Nexora API running on port ${PORT}`);
      console.log(`📡 Socket.IO ready`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
