const Joi = require('joi');

const upsert = Joi.object({
  profileId: Joi.string(),
  month: Joi.string().required(),
  amount: Joi.number().required(),
}).unknown(true);

module.exports = { upsert };
