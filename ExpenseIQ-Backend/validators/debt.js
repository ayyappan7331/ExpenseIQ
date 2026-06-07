const Joi = require('joi');

const create = Joi.object({
  profileId: Joi.string(),
  type: Joi.string().valid('lent', 'borrowed').required(),
  person: Joi.string().required(),
  amount: Joi.number().required(),
  note: Joi.string().allow(''),
  date: Joi.string().required(),
  settled: Joi.boolean(),
  settledDate: Joi.string().allow(null, ''),
}).unknown(true);

const update = Joi.object({
  profileId: Joi.string(),
  type: Joi.string().valid('lent', 'borrowed'),
  person: Joi.string(),
  amount: Joi.number(),
  note: Joi.string().allow(''),
  date: Joi.string(),
  settled: Joi.boolean(),
  settledDate: Joi.string().allow(null, ''),
}).unknown(true);

module.exports = { create, update };
