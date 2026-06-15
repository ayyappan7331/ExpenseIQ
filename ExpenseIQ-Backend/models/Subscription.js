const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  context: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  cycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  due: { type: String, required: true },
  category: { type: String, default: 'Other' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

subscriptionSchema.index({ userId: 1, context: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
