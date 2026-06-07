const Joi = require('joi');

const create = Joi.object({
  profileId: Joi.string(),
  name: Joi.string().required(),
  billDate: Joi.number().integer().min(1).max(31).required(),
  dueDate: Joi.number().integer().min(1).max(31),   // legacy — accepted but not required
  duePeriod: Joi.number().integer().min(1).max(60), // days after statement
  limit: Joi.number().min(0),
  minimumPaymentPct: Joi.number().min(0).max(100),
  interestRateAnnual: Joi.number().min(0).max(120),
  openingBalance: Joi.number().min(0),
  color: Joi.string(),
  linkedPaymentMethod: Joi.string(),
});

const update = Joi.object({
  profileId: Joi.string(),
  name: Joi.string(),
  billDate: Joi.number().integer().min(1).max(31),
  dueDate: Joi.number().integer().min(1).max(31),   // legacy
  duePeriod: Joi.number().integer().min(1).max(60),
  limit: Joi.number().min(0),
  minimumPaymentPct: Joi.number().min(0).max(100),
  interestRateAnnual: Joi.number().min(0).max(120),
  openingBalance: Joi.number().min(0),
  color: Joi.string(),
  archived: Joi.boolean(),
  linkedPaymentMethod: Joi.string().allow(null, ''),
});

module.exports = { create, update };
