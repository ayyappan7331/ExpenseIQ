const service = require('../services/settingsService');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async (req, res) => {
  res.json(await service.get(req.query));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.body));
});

exports.dbStats = asyncHandler(async (req, res) => {
  res.json(await service.dbStats());
});
