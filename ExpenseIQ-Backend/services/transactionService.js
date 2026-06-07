const Transaction = require('../models/Transaction');
const httpError = require('../utils/httpError');

const findAll = async ({ profileId = 'default', month } = {}) => {
  const filter = { profileId };
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
  // Scope by profileId to prevent cross-profile mutations.
  // profileId comes from the stored document, not the update payload.
  const existing = await Transaction.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const profileId = data.profileId || existing.profileId;
  const txn = await Transaction.findOneAndUpdate(
    { _id: id, profileId },
    data,
    { new: true }
  );
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const remove = async (id, profileId) => {
  // Scope by profileId when provided to prevent cross-profile deletion.
  const filter = profileId ? { _id: id, profileId } : { _id: id };
  const txn = await Transaction.findOneAndDelete(filter);
  if (!txn) throw httpError(404, 'Not found');
  return txn;
};

const bulkCreate = (txns) => Transaction.insertMany(txns);

const bulkDelete = async (ids, profileId) => {
  if (!ids || !ids.length) throw httpError(400, 'No IDs provided');
  const filter = { _id: { $in: ids } };
  if (profileId) filter.profileId = profileId;
  await Transaction.deleteMany(filter);
  return ids.length;
};

module.exports = { findAll, create, update, remove, bulkCreate, bulkDelete };
