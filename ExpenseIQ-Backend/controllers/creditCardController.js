const service = require('../services/creditCardService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll(req.query));
});

exports.getArchived = asyncHandler(async (req, res) => {
  res.json(await service.findArchived(req.query));
});

exports.archive = asyncHandler(async (req, res) => {
  res.json(await service.archive(req.params.id));
});

exports.restore = asyncHandler(async (req, res) => {
  res.json(await service.restore(req.params.id));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.json({ message: 'Deleted' });
});
