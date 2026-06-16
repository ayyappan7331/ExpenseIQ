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

const update = async (id, userId, data) => {
  // userId MUST come from the controller (JWT) — never infer it from the document or body.
  if (!userId) throw httpError(401, 'Unauthenticated');
  const txn = await Transaction.findOneAndUpdate(
    { _id: id, userId },
    { ...data, userId },   // enforce userId in update payload too — prevents body injection
    { new: true }
  );
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const remove = async (id, userId) => {
  // userId is REQUIRED — always provided from the controller (JWT).
  if (!userId) throw httpError(401, 'Unauthenticated');
  const txn = await Transaction.findOneAndDelete({ _id: id, userId });
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const bulkCreate = (txns) => Transaction.insertMany(txns);

const bulkDelete = async (ids, userId) => {
  if (!ids || !ids.length) throw httpError(400, 'No IDs provided');
  if (!userId) throw httpError(401, 'Unauthenticated');
  await Transaction.deleteMany({ _id: { $in: ids }, userId });
  return ids.length;
};

module.exports = { findAll, create, update, remove, bulkCreate, bulkDelete };
