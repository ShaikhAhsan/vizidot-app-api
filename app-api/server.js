const path = require('path');
const fs = require('fs');

// Load .env; if missing, use env.example so app works without copying the file
require('dotenv').config();
if (!fs.existsSync(path.join(__dirname, '.env')) && fs.existsSync(path.join(__dirname, 'env.example'))) {
  require('dotenv').config({ path: path.join(__dirname, 'env.example') });
  console.log('📄 Loaded env.example (no .env found)');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./config/database');
const { initializeFirebase } = require('./config/firebase');
const errorHandler = require('./middleware/errorHandler');

// App API routes (Admin Panel uses a separate API)
const authRoutes = require('./routes/auth');
const musicRoutes = require('./routes/music');
const settingsRoutes = require('./routes/settings');

const app = express();
// Port: default 8000, override with PORT env (e.g. PORT=8001 when 8000 is in use)
const PORT = parseInt(process.env.PORT || '8000', 10);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting (disabled by default in development)
const enableRateLimit = (process.env.RATE_LIMIT_ENABLED ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';
if (enableRateLimit) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // default 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // higher default for local testing
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
}

// CORS configuration (supports multiple origins via CORS_ORIGINS or fallback to CORS_ORIGIN)
const rawCorsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000';
const allowedOrigins = rawCorsOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

// Ensure preflight requests are handled globally
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      return res.status(403).json({ error: 'CORS Error: origin not allowed', origin: req.headers.origin });
    }
    return next();
  });
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Increase header size limit for Firebase tokens
// This needs to be set before creating the Express app
const http = require('http');
const server = http.createServer(app);
server.maxHeadersCount = 2000; // Increase max headers
server.headersTimeout = 60000; // Increase timeout

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint (and /health.php for hosts that probe that path)
const healthPayload = (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
};
app.get('/health', healthPayload);
app.get('/health.php', healthPayload);

// Root and favicon to avoid 404 noise in logs
app.get('/', (req, res) => {
  res.redirect(302, '/health');
});
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// App API routes – add new endpoints in routes/auth.js and new route files as needed
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/music', musicRoutes);
app.use('/api/v1/settings', settingsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and Firebase
const initializeApp = async () => {
  try {
    // Initialize Firebase (optional in development when FIREBASE_SERVICE_ACCOUNT_JSON is empty)
    const hasFirebaseCreds = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim().length > 0;
    if (hasFirebaseCreds) {
      await initializeFirebase();
      console.log('🔥 Firebase initialized successfully');
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON is required in production.');
        process.exit(1);
      }
      console.warn('🟡 Firebase skipped (no FIREBASE_SERVICE_ACCOUNT_JSON). Auth/Firestore routes will fail.');
    }

    // Test database connection (in development, allow server to start even if DB fails)
    let dbOk = false;
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      dbOk = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Database models synchronized (disabled due to key limit)');
      }
    } catch (dbError) {
      console.error('⚠️ Database connection failed:', dbError.message);
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Exiting in production when DB is unavailable.');
        process.exit(1);
      }
      console.warn('🟡 Starting server anyway (development). Set DB_HOST etc. in .env for full API.');
    }

    // Start server with custom configuration
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Vizidot App API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      if (!dbOk) console.warn('🟡 DB not connected – set .env for DB-backed routes.');
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception thrown:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  sequelize.close().then(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

initializeApp();

