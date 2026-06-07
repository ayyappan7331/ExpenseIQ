const service = require('../services/profileService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  // Pass userId when available — profileService scopes and adopts orphans
  const userId = req.user?.userId;
  res.json(await service.findAll({ userId }));
});

exports.create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  // Stamp userId on new profiles when auth is enabled
  if (req.user?.userId) payload.userId = req.user.userId;
  res.status(201).json(await service.create(payload));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.json({ message: 'Deleted with cascade' });
});
