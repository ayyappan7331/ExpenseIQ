const Joi = require('joi');

const create = Joi.object({
  profileId: Joi.string().required(),
  name: Joi.string().required(),
  icon: Joi.string(),
  isDefault: Joi.boolean(),
}).unknown(true);

module.exports = { create };
