const service = require('../services/transactionService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.findAll(req.query));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body));
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.query.profileId);
  res.json({ message: 'Deleted' });
});

exports.bulkDelete = asyncHandler(async (req, res) => {
  const count = await service.bulkDelete(
    req.body && req.body.ids,
    req.query.profileId
  );
  res.json({ message: `${count} deleted` });
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  res.status(201).json(await service.bulkCreate(req.body));
});
