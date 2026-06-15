const mongoose = require('mongoose');

// FinancialConfig stores all financial configuration for a profile.
// E4.9: favoriteTransactions and pinnedTransactionIds added.

const transactionTemplateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    paymentMethod: { type: String },
    paymentApp: { type: String },
    notes: { type: String },
    amount: { type: Number },
    createdAt: { type: String },
  },
  { _id: false }
);

const favoriteTransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    paymentMethod: { type: String },
    paymentApp: { type: String },
    notes: { type: String },
    amount: { type: Number },
    createdAt: { type: String },
    usageCount: { type: Number, default: 1 },
    lastUsed: { type: String },
  },
  { _id: false }
);

const financialConfigSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    customExpenseCategories: { type: [String], default: [] },
    customIncomeCategories: { type: [String], default: [] },
    customPaymentMethods: { type: [String], default: [] },
    customPaymentApps: { type: [String], default: [] },
    subcategoryMap: { type: mongoose.Schema.Types.Mixed, default: {} },
    transactionTemplates: { type: [transactionTemplateSchema], default: [] },
    favoriteTransactions: { type: [favoriteTransactionSchema], default: [] },
    pinnedTransactionIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

financialConfigSchema.index({ userId: 1, context: 1 }, { unique: true });

module.exports = mongoose.model('FinancialConfig', financialConfigSchema);
