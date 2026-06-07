const Debt = require('../models/Debt');
const httpError = require('../utils/httpError');

const findAll = ({ profileId = 'default' } = {}) =>
  Debt.find({ profileId }).sort({ createdAt: -1 });

const create = (data) => Debt.create(data);

const update = async (id, data) => {
  const existing = await Debt.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const profileId = data.profileId || existing.profileId;
  const debt = await Debt.findOneAndUpdate({ _id: id, profileId }, data, { new: true });
  if (!debt) throw httpError(404, 'Not found');
  return debt;
};

const remove = async (id, profileId) => {
  const filter = profileId ? { _id: id, profileId } : { _id: id };
  const debt = await Debt.findOneAndDelete(filter);
  if (!debt) throw httpError(404, 'Not found');
  return debt;
};

module.exports = { findAll, create, update, remove };
