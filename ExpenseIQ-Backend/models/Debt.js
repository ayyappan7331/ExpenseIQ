const mongoose = require('mongoose');
const { dateFieldsToJSON } = require('../utils/dateField');

// Only `date` is converted to Date. `settledDate` stays as a string for now
// per Phase 6 scope (the migration roadmap explicitly limits this phase to
// Transaction.date and Debt.date).
const debtSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    type: { type: String, enum: ['lent', 'borrowed'], required: true },
    person: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    date: { type: Date, required: true },
    settled: { type: Boolean, default: false },
    settledDate: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: dateFieldsToJSON(['date']),
  }
);

debtSchema.index({ userId: 1, context: 1 });

module.exports = mongoose.model('Debt', debtSchema);
