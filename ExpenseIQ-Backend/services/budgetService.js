const Budget = require('../models/Budget');
const httpError = require('../utils/httpError');

const findAll = ({ userId, context = 'Personal', month } = {}) => {
  const filter = { userId, context };
  if (month) filter.month = month;
  return Budget.find(filter);
};

const upsert = async ({ userId, context = 'Personal', month, category, amount } = {}) => {
  if (!userId || !month || !category || amount == null) {
    throw httpError(400, 'userId, month, category, and amount are required');
  }
  return Budget.findOneAndUpdate(
    { userId, context, month, category },
    { userId, context, month, category, amount },
    { upsert: true, new: true }
  );
};

const remove = async (id, userId) => {
  const filter = userId ? { _id: id, userId } : { _id: id };
  const budget = await Budget.findOneAndDelete(filter);
  if (!budget) throw httpError(404, 'Not found');
  return budget;
};

module.exports = { findAll, upsert, remove };
