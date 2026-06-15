const mongoose = require('mongoose');
const { dateFieldsToJSON } = require('../utils/dateField');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    type: { type: String, enum: ['income', 'expense'], required: true },
    /** Optional classification within the type. Absent on pre-Phase-8 transactions. */
    subtype: { type: String, default: undefined },
    amount: { type: Number, required: true },
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    source: { type: String, default: '' },
    date: { type: Date, required: true },
    time: { type: String },
    paymentMethod: { type: String },
    paymentApp: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      ...dateFieldsToJSON(['date']),
      transform: (doc, ret) => {
        // Normalize _id → id so all responses (single + bulk) are consistent
        ret.id = String(ret._id);
        // Apply date transform
        const dateTransform = dateFieldsToJSON(['date']).transform;
        return dateTransform(doc, ret);
      },
    },
  }
);

transactionSchema.index({ userId: 1, context: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
