const mongoose = require('mongoose');
const { dateFieldsToJSON } = require('../utils/dateField');

const transactionSchema = new mongoose.Schema(
  {
    profileId: { type: String, default: 'default' },
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

transactionSchema.index({ profileId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
