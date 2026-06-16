const service = require('../services/creditCardService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll({ ...req.query, userId: req.user.userId }));
});

exports.getArchived = asyncHandler(async (req, res) => {
  res.json(await service.findArchived({ ...req.query, userId: req.user.userId }));
});

exports.archive = asyncHandler(async (req, res) => {
  res.json(await service.archive(req.params.id, req.user.userId));
});

exports.restore = asyncHandler(async (req, res) => {
  res.json(await service.restore(req.params.id, req.user.userId));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create({ ...req.body, userId: req.user.userId }));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, { ...req.body, userId: req.user.userId }));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.userId);
  res.json({ message: 'Deleted' });
});
