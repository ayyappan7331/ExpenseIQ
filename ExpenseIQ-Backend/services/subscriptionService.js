const Subscription = require('../models/Subscription');
const httpError = require('../utils/httpError');

const findAll = ({ userId, context = 'Personal' } = {}) =>
  Subscription.find({ userId, context }).sort({ due: 1 });

const create = (data) => Subscription.create(data);

const update = async (id, data) => {
  const existing = await Subscription.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const userId = data.userId || existing.userId;
  const sub = await Subscription.findOneAndUpdate({ _id: id, userId }, data, { new: true });
  if (!sub) throw httpError(404, 'Not found');
  return sub;
};

const remove = async (id, userId) => {
  const filter = userId ? { _id: id, userId } : { _id: id };
  const sub = await Subscription.findOneAndDelete(filter);
  if (!sub) throw httpError(404, 'Not found');
  return sub;
};

module.exports = { findAll, create, update, remove };
