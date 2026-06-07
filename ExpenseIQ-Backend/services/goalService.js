const Goal = require('../models/Goal');
const httpError = require('../utils/httpError');

const findAll = ({ profileId = 'default' } = {}) => Goal.find({ profileId });

const upsert = ({ profileId = 'default', month, amount } = {}) =>
  Goal.findOneAndUpdate(
    { profileId, month },
    { profileId, month, amount },
    { upsert: true, new: true }
  );

const remove = async (id, profileId) => {
  const filter = profileId ? { _id: id, profileId } : { _id: id };
  const goal = await Goal.findOneAndDelete(filter);
  if (!goal) throw httpError(404, 'Not found');
  return goal;
};

module.exports = { findAll, upsert, remove };
