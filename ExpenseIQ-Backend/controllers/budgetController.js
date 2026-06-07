const service = require('../services/budgetService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll(req.query));
});

exports.upsert = asyncHandler(async (req, res) => {
  res.json(await service.upsert(req.body));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.query.profileId);
  res.json({ message: 'Deleted' });
});
