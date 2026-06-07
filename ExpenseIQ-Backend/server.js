require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { corsOptions, buildRateLimiter } = require('./middleware/security');
const authMiddleware = require('./middleware/auth');
const profileScope = require('./middleware/profileScope');
const healthCtrl = require('./controllers/healthController');
const logger = require('./utils/logger');

const app = express();

// Connect to MongoDB
connectDB();

// Security headers — first so they cover everything below.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — env-configurable allowlist, defaults to any localhost/127.0.0.1 port.
app.use(cors(corsOptions()));

// Rate limit scoped to /api/*. Mounted before route handlers so it short-circuits.
app.use('/api', buildRateLimiter());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '10mb' }));

// Health + version (always public, even when AUTH_ENABLED=true)
app.get('/api/health', healthCtrl.health);
app.get('/api/version', healthCtrl.version);

// Auth endpoints (always public — needed to bootstrap a session)
app.use('/api/auth', require('./routes/auth'));

// Auth gate for everything else under /api. No-op unless AUTH_ENABLED=true.
app.use('/api', authMiddleware);

// Profile scope gate — validates profileId belongs to req.user when AUTH_ENABLED.
// Runs after auth so req.user is always populated first.
app.use('/api', profileScope);

// Resource routes (gated by authMiddleware above when AUTH_ENABLED=true)
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/creditcards', require('./routes/creditcards'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/financial-config', require('./routes/financialConfig'));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'ExpenseIQ API running');
});
