const service = require('../services/transactionService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll({ ...req.query, userId: req.user.userId }));
});

exports.create = asyncHandler(async (req, res) => {
  const txnsToCreate = Array.isArray(req.body) ? req.body.map(t => ({ ...t, userId: req.user.userId })) : { ...req.body, userId: req.user.userId };
  res.status(201).json(await service.create(txnsToCreate));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, { ...req.body, userId: req.user.userId }));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.userId);
  res.json({ message: 'Deleted' });
});

exports.bulkDelete = asyncHandler(async (req, res) => {
  const count = await service.bulkDelete(
    req.body && req.body.ids,
    req.user.userId
  );
  res.json({ message: `${count} deleted` });
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  const txnsToCreate = Array.isArray(req.body) ? req.body.map(t => ({ ...t, userId: req.user.userId })) : req.body;
  res.status(201).json(await service.bulkCreate(txnsToCreate));
});
