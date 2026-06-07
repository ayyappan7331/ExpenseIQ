const Joi = require('joi');

const create = Joi.object({
  profileId: Joi.string(),
  name: Joi.string().required(),
  amount: Joi.number().required(),
  cycle: Joi.string().valid('monthly', 'quarterly', 'yearly'),
  due: Joi.string().required(),
  category: Joi.string(),
  active: Joi.boolean(),
}).unknown(true);

const update = Joi.object({
  profileId: Joi.string(),
  name: Joi.string(),
  amount: Joi.number(),
  cycle: Joi.string().valid('monthly', 'quarterly', 'yearly'),
  due: Joi.string(),
  category: Joi.string(),
  active: Joi.boolean(),
}).unknown(true);

module.exports = { create, update };
