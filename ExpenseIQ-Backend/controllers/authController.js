const service = require('../services/authService');
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
  res.json({ id: user._id.toString(), email: user.email, name: user.name || '', dob: user.dob || '', purpose: user.purpose || '' });
});

exports.updateMe = asyncHandler(async (req, res) => {
  // PUT /api/auth/me — update name, dob, purpose
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const updated = await service.update(req.user.userId, req.body);
  res.json(updated);
});
