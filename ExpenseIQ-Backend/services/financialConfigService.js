const FinancialConfig = require('../models/FinancialConfig');

/**
 * Get FinancialConfig for a profile.
 * If no FinancialConfig document exists yet, seeds from the Settings document
 * (backward compatibility for existing users).
 */
const get = async ({ userId, context = 'Personal' } = {}) => {
  let config = await FinancialConfig.findOne({ userId, context });

  if (!config) {
    // No FinancialConfig exists yet — create with empty defaults.
    // Settings no longer stores financial fields (E4.10).
    config = await FinancialConfig.create({ userId, context });
  }

  return config;
};

/**
 * Update FinancialConfig for a profile.
 * Only updates the fields present in the payload — other fields are preserved.
 */
const update = async (data) => {
  const { userId, context = 'Personal', ...fields } = data || {};

  // Only allow known FinancialConfig fields
  const allowed = {};
  if (fields.customExpenseCategories !== undefined) allowed.customExpenseCategories = fields.customExpenseCategories;
  if (fields.customIncomeCategories !== undefined) allowed.customIncomeCategories = fields.customIncomeCategories;
  if (fields.customPaymentMethods !== undefined) allowed.customPaymentMethods = fields.customPaymentMethods;
  if (fields.customPaymentApps !== undefined) allowed.customPaymentApps = fields.customPaymentApps;
  if (fields.subcategoryMap !== undefined) allowed.subcategoryMap = fields.subcategoryMap;
  if (fields.transactionTemplates !== undefined) allowed.transactionTemplates = fields.transactionTemplates;
  if (fields.favoriteTransactions !== undefined) allowed.favoriteTransactions = fields.favoriteTransactions;
  if (fields.pinnedTransactionIds !== undefined) allowed.pinnedTransactionIds = fields.pinnedTransactionIds;

  return FinancialConfig.findOneAndUpdate(
    { userId, context },
    { $set: allowed },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = { get, update, patch: update };
