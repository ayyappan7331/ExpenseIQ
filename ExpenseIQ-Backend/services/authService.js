const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpError = require('../utils/httpError');

const SALT_ROUNDS = 10;

const requireSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw httpError(500, 'JWT_SECRET is not configured');
  return s;
};

/** Detect whether a string looks like a mobile number */
const isMobile = (val) => /^(\+91|91)?[6-9]\d{9}$/.test((val || '').replace(/[\s-]/g, ''));

/**
 * Register — requires at least email or mobile.
 */
const register = async ({ email, mobile, password, name, dob, purpose } = {}) => {
  if (!email && !mobile) throw httpError(400, 'Email or mobile number is required');
  if (!password) throw httpError(400, 'Password is required');

  // Normalise
  const normEmail = email ? String(email).toLowerCase().trim() : undefined;
  const normMobile = mobile ? String(mobile).replace(/[\s-]/g, '').trim() : undefined;

  // Check duplicates
  if (normEmail) {
    const existingEmail = await User.findOne({ email: normEmail });
    if (existingEmail) throw httpError(400, 'Email already registered');
  }
  if (normMobile) {
    const existingMobile = await User.findOne({ mobile: normMobile });
    if (existingMobile) throw httpError(400, 'Mobile number already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: normEmail || undefined,
    mobile: normMobile || undefined,
    passwordHash,
    name: name || '',
    dob: dob || '',
    purpose: purpose || '',
  });

  return { id: user._id.toString(), email: user.email, mobile: user.mobile, name: user.name };
};

/**
 * Login — identifier can be email or mobile.
 */
const login = async ({ identifier, password } = {}) => {
  if (!identifier || !password) throw httpError(400, 'Identifier and password are required');

  const norm = String(identifier).toLowerCase().trim();
  const query = isMobile(norm)
    ? { mobile: norm.replace(/[\s-]/g, '') }
    : { email: norm };

  const user = await User.findOne(query);
  if (!user) throw httpError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw httpError(401, 'Invalid credentials');

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email || '' },
    requireSecret(),
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email || '',
      mobile: user.mobile || '',
      name: user.name,
      dob: user.dob,
      purpose: user.purpose,
    },
  };
};

const verifyToken = (token) => jwt.verify(token, requireSecret());

const update = async (userId, { name, dob, purpose } = {}) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { name: name ?? '', dob: dob ?? '', purpose: purpose ?? '' } },
    { new: true }
  );
  if (!user) throw httpError(404, 'User not found');
  return { id: user._id.toString(), email: user.email, mobile: user.mobile, name: user.name, dob: user.dob, purpose: user.purpose };
};

/**
 * Find user by identifier (email or mobile). Used by OTP flows.
 */
const findByIdentifier = async (identifier) => {
  const norm = String(identifier).toLowerCase().trim();
  const query = isMobile(norm)
    ? { mobile: norm.replace(/[\s-]/g, '') }
    : { email: norm };
  return User.findOne(query);
};

/**
 * Reset password (called after OTP verification).
 */
const resetPassword = async (userId, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const user = await User.findByIdAndUpdate(userId, { passwordHash }, { new: true });
  if (!user) throw httpError(404, 'User not found');
  return { id: user._id.toString(), email: user.email, mobile: user.mobile, name: user.name };
};

module.exports = { register, login, verifyToken, update, findByIdentifier, resetPassword };
