const Transaction = require('../models/Transaction');
const httpError = require('../utils/httpError');

const findAll = async ({ userId, context = 'Personal', month } = {}) => {
  const filter = { userId, context };
  if (month) {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) {
      // Malformed month — emulate the old `^<garbage>` regex behavior
      // (matched no documents) instead of silently returning all docs.
      return [];
    }
    const start = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    const end = new Date(Date.UTC(+m[1], +m[2], 1));
    filter.date = { $gte: start, $lt: end };
  }
  return Transaction.find(filter).sort({ date: -1, time: -1 });
};

const create = (data) => Transaction.create(data);

const update = async (id, data) => {
  // Scope by userId to prevent cross-user mutations.
  // userId comes from the stored document, not the update payload.
  const existing = await Transaction.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const userId = data.userId || existing.userId;
  const txn = await Transaction.findOneAndUpdate(
    { _id: id, userId },
    data,
    { new: true }
  );
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const remove = async (id, userId) => {
  // Scope by userId when provided to prevent cross-user deletion.
  const filter = userId ? { _id: id, userId } : { _id: id };
  const txn = await Transaction.findOneAndDelete(filter);
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const bulkCreate = (txns) => Transaction.insertMany(txns);

const bulkDelete = async (ids, userId) => {
  if (!ids || !ids.length) throw httpError(400, 'No IDs provided');
  const filter = { _id: { $in: ids } };
  if (userId) filter.userId = userId;
  await Transaction.deleteMany(filter);
  return ids.length;
};

module.exports = { findAll, create, update, remove, bulkCreate, bulkDelete };
