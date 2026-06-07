const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  profileId: { type: String, default: 'default' },
  name: { type: String, required: true },
  billDate: { type: Number, required: true },
  dueDate: { type: Number },          // legacy: day-of-month. Kept for migration only.
  duePeriod: { type: Number },        // days after statement generation (e.g. 20)
  limit: { type: Number },
  /** Minimum payment percentage (e.g. 5 means 5% of outstanding or ₹200, whichever is higher). */
  minimumPaymentPct: { type: Number },
  /** Annual interest rate % (e.g. 36 for 36% APR). Used to estimate monthly interest cost. */
  interestRateAnnual: { type: Number },
  /** Opening balance at the time the user started tracking this card.
   *  Added to lifetimeSpend so outstanding balance is correct even when
   *  the user's history predates the app. Defaults to 0 (no prior balance). */
  openingBalance: { type: Number, default: 0 },
  color: { type: String, default: '#7c6ff7' },
  /** Explicit link to the payment method name used in transactions.
   *  Unique per profile when present — prevents two cards sharing the same method. */
  linkedPaymentMethod: { type: String, default: undefined },
  /** Soft delete — archived cards are hidden from the main view but recoverable. */
  archived: { type: Boolean, default: false },
}, { timestamps: true });

// Fast lookup by profile (existing)
creditCardSchema.index({ profileId: 1 });

// Uniqueness: one card per (profileId, linkedPaymentMethod).
// partialFilterExpression ensures the index only applies when
// linkedPaymentMethod is present and non-null — legacy cards without
// the field are completely unaffected.
creditCardSchema.index(
  { profileId: 1, linkedPaymentMethod: 1 },
  { unique: true, partialFilterExpression: { linkedPaymentMethod: { $type: 'string' } } }
);

module.exports = mongoose.model('CreditCard', creditCardSchema);
