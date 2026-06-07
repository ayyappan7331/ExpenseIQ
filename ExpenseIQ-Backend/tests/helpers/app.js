// Test-only Express app factory.
// Mirrors server.js wiring EXACTLY, except it does NOT call connectDB().
// Accepts optional overrides so tests can configure rate-limit/CORS without
// touching env vars or rebuilding shared state.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('../../middleware/errorHandler');
const { corsOptions, buildRateLimiter } = require('../../middleware/security');
const authMiddleware = require('../../middleware/auth');
const healthCtrl = require('../../controllers/healthController');

function buildApp(opts = {}) {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cors(corsOptions()));

  app.use('/api', buildRateLimiter(opts.rateLimit));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(express.json({ limit: '10mb' }));

  // Health + version (always public)
  app.get('/api/health', healthCtrl.health);
  app.get('/api/version', healthCtrl.version);

  // Auth endpoints (always public)
  app.use('/api/auth', require('../../routes/auth'));

  // Auth gate (no-op unless AUTH_ENABLED=true)
  app.use('/api', authMiddleware);

  app.use('/api/transactions', require('../../routes/transactions'));
  app.use('/api/subscriptions', require('../../routes/subscriptions'));
  app.use('/api/debts', require('../../routes/debts'));
  app.use('/api/goals', require('../../routes/goals'));
  app.use('/api/profiles', require('../../routes/profiles'));
  app.use('/api/creditcards', require('../../routes/creditcards'));
  app.use('/api/settings', require('../../routes/settings'));
  app.use('/api/budgets', require('../../routes/budgets'));
  app.use('/api/financial-config', require('../../routes/financialConfig'));

  app.use(errorHandler);
  return app;
}

module.exports = buildApp;
