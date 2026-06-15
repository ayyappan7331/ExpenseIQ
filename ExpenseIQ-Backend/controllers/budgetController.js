const service = require('../services/budgetService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll({ ...req.query, userId: req.user.userId }));
});

exports.upsert = asyncHandler(async (req, res) => {
  res.json(await service.upsert({ ...req.body, userId: req.user.userId }));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.userId);
  res.json({ message: 'Deleted' });
});
