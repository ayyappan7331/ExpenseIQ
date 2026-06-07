// Phase 7. Feature-flagged.
//
//   AUTH_ENABLED !== 'true' → middleware is a no-op. Existing frontend
//                             keeps working exactly like Phase 6.
//
//   AUTH_ENABLED === 'true' → require Authorization: Bearer <jwt>. Verified
//                             via authService.verifyToken (HS256, JWT_SECRET).
//                             Sets req.user = { userId, email, iat, exp }.
//
// /api/health and /api/auth/* are mounted BEFORE this middleware in
// server.js / tests/helpers/app.js so they bypass the gate even when on.

const authService = require('../services/authService');

const authMiddleware = (req, res, next) => {
  if (process.env.AUTH_ENABLED !== 'true') return next();

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = authService.verifyToken(token);
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
