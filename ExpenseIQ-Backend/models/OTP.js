const mongoose = require('mongoose');

// OTP model with 10-minute TTL. MongoDB automatically deletes expired docs.
const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true },    // email or mobile
  code: { type: String, required: true },
  purpose: { type: String, enum: ['verify', 'reset'], default: 'verify' },
  createdAt: { type: Date, default: Date.now, expires: 600 },   // 10 min TTL
});

// Compound index for fast lookup
otpSchema.index({ identifier: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
