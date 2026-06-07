const OTP = require('../models/OTP');
const logger = require('../utils/logger');

/**
 * Generate a 6-digit OTP, persist it, and log it to the console.
 * In production you would integrate Twilio / SendGrid here.
 */
const generateOtp = async (identifier, purpose = 'verify') => {
  // Delete any existing OTP for this identifier+purpose
  await OTP.deleteMany({ identifier, purpose });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await OTP.create({ identifier, code, purpose });

  // Log to console (replace with SMS/email provider in production)
  logger.info({ identifier, purpose, code }, '📩 OTP generated');
  return code;
};

/**
 * Verify a 6-digit OTP.  On success the OTP is consumed (deleted).
 */
const verifyOtp = async (identifier, code, purpose = 'verify') => {
  const record = await OTP.findOne({ identifier, code, purpose });
  if (!record) return false;
  await OTP.deleteOne({ _id: record._id });   // consume
  return true;
};

module.exports = { generateOtp, verifyOtp };
