const Goal = require('../models/Goal');
const httpError = require('../utils/httpError');

const findAll = ({ userId, context = 'Personal' } = {}) => Goal.find({ userId, context });

const upsert = ({ userId, context = 'Personal', month, amount } = {}) =>
  Goal.findOneAndUpdate(
    { userId, context, month },
    { userId, context, month, amount },
    { upsert: true, new: true }
  );

const remove = async (id, userId) => {
  const filter = userId ? { _id: id, userId } : { _id: id };
  const goal = await Goal.findOneAndDelete(filter);
  if (!goal) throw httpError(404, 'Not found');
  return goal;
};

module.exports = { findAll, upsert, remove };
