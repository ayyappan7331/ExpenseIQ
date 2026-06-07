// Input-validation middleware factory.
//
// Modes (selected at request time via process.env.VALIDATION_MODE):
//   shadow  (default) — log mismatches, ALWAYS call next(). Preserves legacy behavior.
//   enforce           — respond 400 { error } on mismatch. Controller never runs.
//
// Never mutates req.body — Joi's coercion/defaults are intentionally NOT written back,
// because that would silently change the data the controller sees. Defaults already
// live on the Mongoose schemas.

const logger = require('../utils/logger');

const validate = (schema, { source = 'body' } = {}) => (req, res, next) => {
  if (!schema) return next();

  const { error } = schema.validate(req[source], {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
    convert: false,
  });

  if (!error) return next();

  const message = error.details.map((d) => d.message).join(', ');

  // In production enforce validation — bad data must never reach the DB.
  // In development/test use shadow mode so exploratory requests still work.
  const mode = process.env.VALIDATION_MODE
    || (process.env.NODE_ENV === 'production' ? 'enforce' : 'shadow');

  if (mode === 'enforce') {
    return res.status(400).json({ error: message });
  }

  logger.warn({ method: req.method, url: req.originalUrl, message }, 'validation:shadow');
  return next();
};

module.exports = validate;
