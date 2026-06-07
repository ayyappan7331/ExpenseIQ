// Centralized error handler. Maps known Mongoose error classes to the same
// status codes the per-controller try/catch blocks used to return, so the
// JSON response shape `{ error: <message> }` stays byte-compatible.

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error({ err: { message: err.message, stack: err.stack }, method: req.method, url: req.originalUrl });

  // Mongoose: invalid document data (missing required, enum mismatch, etc.)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Mongoose: malformed ObjectId or other cast failure
  if (err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }

  // MongoDB duplicate key (unique index violation)
  if (err.code === 11000) {
    return res.status(400).json({ error: err.message });
  }

  // Explicit upstream status hint (err.statusCode or err.status)
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};

module.exports = errorHandler;
