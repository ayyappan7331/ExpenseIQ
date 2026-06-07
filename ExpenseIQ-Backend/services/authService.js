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

const register = async ({ email, password, name, dob, purpose } = {}) => {
  if (!email || !password) throw httpError(400, 'email and password are required');
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw httpError(400, 'Email already registered');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, passwordHash, name: name || '', dob: dob || '', purpose: purpose || '' });
  return { id: user._id.toString(), email: user.email, name: user.name };
};

const login = async ({ email, password } = {}) => {
  if (!email || !password) throw httpError(400, 'email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) throw httpError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw httpError(401, 'Invalid credentials');
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    requireSecret(),
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
  return {
    token,
    user: { id: user._id.toString(), email: user.email, name: user.name, dob: user.dob, purpose: user.purpose },
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
  return { id: user._id.toString(), email: user.email, name: user.name, dob: user.dob, purpose: user.purpose };
};

module.exports = { register, login, verifyToken, update };
