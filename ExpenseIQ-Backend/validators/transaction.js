const Joi = require('joi');

const INCOME_SUBTYPES = new Set([
  'payment', 'refund', 'cashback', 'reimbursement', 'transfer_in', 'other',
]);

const EXPENSE_SUBTYPES = new Set([
  'purchase', 'fee', 'interest', 'transfer_out', 'emi', 'other',
]);

const ALL_SUBTYPES = new Set([...INCOME_SUBTYPES, ...EXPENSE_SUBTYPES]);

/**
 * Joi custom validator for subtype on CREATE.
 * type is always present (required), so we can always cross-check.
 */
function validateSubtypeCreate(value, helpers) {
  if (!value) return value; // absent or empty — always valid
  if (!ALL_SUBTYPES.has(value)) {
    return helpers.error('any.invalid');
  }
  const type = helpers.state.ancestors[0]?.type;
  if (type === 'income' && !INCOME_SUBTYPES.has(value)) {
    return helpers.message(`subtype "${value}" is not valid for income transactions`);
  }
  if (type === 'expense' && !EXPENSE_SUBTYPES.has(value)) {
    return helpers.message(`subtype "${value}" is not valid for expense transactions`);
  }
  return value;
}

/**
 * Joi custom validator for subtype on UPDATE.
 * type may be absent (partial update), so cross-check only when type is present.
 */
function validateSubtypeUpdate(value, helpers) {
  if (!value) return value; // absent, empty, or null — always valid
  if (!ALL_SUBTYPES.has(value)) {
    return helpers.error('any.invalid');
  }
  const type = helpers.state.ancestors[0]?.type;
  if (!type) return value; // type not being updated — skip cross-check
  if (type === 'income' && !INCOME_SUBTYPES.has(value)) {
    return helpers.message(`subtype "${value}" is not valid for income transactions`);
  }
  if (type === 'expense' && !EXPENSE_SUBTYPES.has(value)) {
    return helpers.message(`subtype "${value}" is not valid for expense transactions`);
  }
  return value;
}

const create = Joi.object({
  profileId: Joi.string(),
  type: Joi.string().valid('income', 'expense').required(),
  subtype: Joi.string().allow('').custom(validateSubtypeCreate),
  amount: Joi.number().min(0.01).required(),
  category: Joi.string().allow(''),
  subcategory: Joi.string().allow(''),
  source: Joi.string().allow(''),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  time: Joi.string().allow(''),
  paymentMethod: Joi.string().allow(''),
  paymentApp: Joi.string().allow(''),
  notes: Joi.string().allow(''),
}).unknown(true);

const update = Joi.object({
  profileId: Joi.string(),
  type: Joi.string().valid('income', 'expense'),
  subtype: Joi.string().allow('', null).custom(validateSubtypeUpdate),
  amount: Joi.number().min(0.01),
  category: Joi.string().allow(''),
  subcategory: Joi.string().allow(''),
  source: Joi.string().allow(''),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  time: Joi.string().allow(''),
  paymentMethod: Joi.string().allow(''),
  paymentApp: Joi.string().allow(''),
  notes: Joi.string().allow(''),
}).unknown(true);

const bulkCreate = Joi.array().items(create);

const bulkDelete = Joi.object({
  ids: Joi.array().items(Joi.string()),
}).unknown(true);

module.exports = { create, update, bulkCreate, bulkDelete };
