const Budget = require('../models/Budget');
const httpError = require('../utils/httpError');

const findAll = ({ profileId = 'default', month } = {}) => {
  const filter = { profileId };
  if (month) filter.month = month;
  return Budget.find(filter);
};

const upsert = async ({ profileId = 'default', month, category, amount } = {}) => {
  if (!month || !category || amount == null) {
    throw httpError(400, 'month, category, and amount are required');
  }
  return Budget.findOneAndUpdate(
    { profileId, month, category },
    { profileId, month, category, amount },
    { upsert: true, new: true }
  );
};

const remove = async (id, profileId) => {
  const filter = profileId ? { _id: id, profileId } : { _id: id };
  const budget = await Budget.findOneAndDelete(filter);
  if (!budget) throw httpError(404, 'Not found');
  return budget;
};

module.exports = { findAll, upsert, remove };
