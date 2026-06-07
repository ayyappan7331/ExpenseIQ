const Joi = require('joi');

const transactionTemplate = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().valid('income', 'expense').required(),
  category: Joi.string().required(),
  subcategory: Joi.string().allow('', null),
  paymentMethod: Joi.string().allow('', null),
  paymentApp: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  amount: Joi.number(),
  createdAt: Joi.string(),
});

const favoriteTransaction = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().valid('income', 'expense').required(),
  category: Joi.string().required(),
  subcategory: Joi.string().allow('', null),
  paymentMethod: Joi.string().allow('', null),
  paymentApp: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  amount: Joi.number(),
  createdAt: Joi.string(),
  usageCount: Joi.number(),
  lastUsed: Joi.string(),
});

const update = Joi.object({
  profileId: Joi.string(),
  customExpenseCategories: Joi.array().items(Joi.string()),
  customIncomeCategories: Joi.array().items(Joi.string()),
  customPaymentMethods: Joi.array().items(Joi.string()),
  customPaymentApps: Joi.array().items(Joi.string()),
  subcategoryMap: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string())),
  transactionTemplates: Joi.array().items(transactionTemplate),
  favoriteTransactions: Joi.array().items(favoriteTransaction),
  pinnedTransactionIds: Joi.array().items(Joi.string()),
});

module.exports = { update };
