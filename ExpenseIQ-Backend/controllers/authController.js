const service = require('../services/authService');
const otpService = require('../services/otpService');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  res.status(201).json(user);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
  // GET /api/auth/me — returns current user from JWT
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const User = require('../models/User');
  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user._id.toString(),
    email: user.email || '',
    mobile: user.mobile || '',
    name: user.name || '',
    dob: user.dob || '',
    purpose: user.purpose || '',
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  // PUT /api/auth/me — update name, dob, purpose
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const updated = await service.update(req.user.userId, req.body);
  res.json(updated);
});

// ── OTP / Forgot-password ────────────────────────────────────────────────────

exports.sendOtp = asyncHandler(async (req, res) => {
  const { identifier, purpose } = req.body;
  const user = await service.findByIdentifier(identifier);
  if (!user) return res.status(404).json({ error: 'No account found with that identifier' });
  const code = await otpService.generateOtp(identifier.toLowerCase().trim(), purpose);
  // In production, send via SMS/email. For now it's logged to the console.
  res.json({ message: `OTP sent to ${identifier}`, code });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, code, purpose } = req.body;
  const valid = await otpService.verifyOtp(identifier.toLowerCase().trim(), code, purpose);
  if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

  if (purpose === 'reset') {
    // Issue a short-lived reset token
    const user = await service.findByIdentifier(identifier);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const resetToken = jwt.sign(
      { userId: user._id.toString(), purpose: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    return res.json({ message: 'OTP verified', resetToken });
  }

  res.json({ message: 'OTP verified' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Invalid token purpose' });
  await service.resetPassword(payload.userId, newPassword);
  res.json({ message: 'Password reset successfully' });
});

// ── OTP Login (passwordless) ─────────────────────────────────────────────────

/**
 * POST /api/auth/login-otp
 * Step 2 of OTP login: verify the code and issue a full session JWT.
 * Step 1 is handled by POST /send-otp with purpose='login'.
 */
exports.loginWithOtp = asyncHandler(async (req, res) => {
  const { identifier, code } = req.body;

  // Verify the OTP (consumes it on success)
  const valid = await otpService.verifyOtp(identifier.toLowerCase().trim(), code, 'login');
  if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

  // Look up the user
  const user = await service.findByIdentifier(identifier);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Issue a full-duration session token (same shape as password login)
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email || '' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );

  res.json({
    token,
    user: {
      id: user._id.toString(),
      email: user.email || '',
      mobile: user.mobile || '',
      name: user.name,
      dob: user.dob,
      purpose: user.purpose,
    },
  });
});
