const service = require('../services/settingsService');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async (req, res) => {
  res.json(await service.get({ ...req.query, userId: req.user.userId }));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update({ ...req.body, userId: req.user.userId }));
});

exports.dbStats = asyncHandler(async (req, res) => {
  res.json(await service.dbStats());
});
