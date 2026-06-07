const Subscription = require('../models/Subscription');
const httpError = require('../utils/httpError');

const findAll = ({ profileId = 'default' } = {}) =>
  Subscription.find({ profileId }).sort({ due: 1 });

const create = (data) => Subscription.create(data);

const update = async (id, data) => {
  const existing = await Subscription.findById(id).lean();
  if (!existing) throw httpError(404, 'Not found');
  const profileId = data.profileId || existing.profileId;
  const sub = await Subscription.findOneAndUpdate({ _id: id, profileId }, data, { new: true });
  if (!sub) throw httpError(404, 'Not found');
  return sub;
};

const remove = async (id, profileId) => {
  const filter = profileId ? { _id: id, profileId } : { _id: id };
  const sub = await Subscription.findOneAndDelete(filter);
  if (!sub) throw httpError(404, 'Not found');
  return sub;
};

module.exports = { findAll, create, update, remove };
