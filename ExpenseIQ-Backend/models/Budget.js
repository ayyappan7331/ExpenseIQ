const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  profileId: { type: String, default: 'default' },
  month:     { type: String, required: true },  // YYYY-MM
  category:  { type: String, required: true },
  amount:    { type: Number, required: true },
}, { timestamps: true });

budgetSchema.index({ profileId: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
