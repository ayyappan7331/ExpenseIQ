const service = require('../services/financialConfigService');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async (req, res) => {
  res.json(await service.get({ ...req.query, userId: req.user.userId }));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update({ ...req.body, userId: req.user.userId }));
});

exports.patch = asyncHandler(async (req, res) => {
  res.json(await service.patch({ ...req.body, userId: req.user.userId }));
});
