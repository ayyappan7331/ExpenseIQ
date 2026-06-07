const Joi = require('joi');

const update = Joi.object({
  profileId: Joi.string(),
  theme: Joi.string(),
  widgets: Joi.array().items(Joi.string()),
  widgetOrder: Joi.array().items(Joi.string()),
  navOrder: Joi.array().items(Joi.string()),
}).unknown(true);

module.exports = { update };
