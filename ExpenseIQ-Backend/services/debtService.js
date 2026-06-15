const Debt = require('../models/Debt');
const httpError = require('../utils/httpError');

const findAll = ({ userId, context = 'Personal' } = {}) =>
  Debt.find({ userId, context }).sort({ createdAt: -1 });

const create = (data) => Debt.create(data);

const update = async (id, data) => {
  const existing = await Debt.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const userId = data.userId || existing.userId;
  const debt = await Debt.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  if (!debt) throw httpError(404, 'Not found');
  return debt;
};

const remove = async (id, userId) => {
  const filter = userId ? { _id: id, userId } : { _id: id };
  const debt = await Debt.findOneAndDelete(filter);
  if (!debt) throw httpError(404, 'Not found');
  return debt;
};

module.exports = { findAll, create, update, remove };
