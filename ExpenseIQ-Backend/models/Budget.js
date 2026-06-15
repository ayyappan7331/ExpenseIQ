const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
  month:     { type: String, required: true },  // YYYY-MM
  category:  { type: String, required: true },
  amount:    { type: Number, required: true },
}, { timestamps: true });

budgetSchema.index({ userId: 1, context: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
