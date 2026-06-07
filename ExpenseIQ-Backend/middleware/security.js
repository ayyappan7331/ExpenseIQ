// Phase 4 security wiring. Kept as factories so server.js and the test app
// stay in sync, and so tests can override the rate-limit config without
// touching env vars.

const rateLimit = require('express-rate-limit');

// CORS allowlist. The origin function runs per-request, so changes to
// process.env.CORS_ORIGIN take effect without rebuilding the app.
const corsOptions = () => ({
  origin: (origin, callback) => {
    // No Origin header (curl, server-to-server, file://, same-origin) — allow
    if (!origin) return callback(null, true);

    const env = (process.env.CORS_ORIGIN || '').trim();
    if (env) {
      const allowed = env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return callback(null, allowed.includes(origin));
    }

    // Default: any localhost / 127.0.0.1 on any port, http or https.
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return callback(null, isLocal);
  },
});

const buildRateLimiter = (overrides = {}) =>
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
    // Silence the v7 trust-proxy warning on localhost-only deployments.
    validate: { trustProxy: false },
    ...overrides,
  });

module.exports = { corsOptions, buildRateLimiter };
