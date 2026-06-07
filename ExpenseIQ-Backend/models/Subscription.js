const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  profileId: { type: String, default: 'default' },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  cycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  due: { type: String, required: true },
  category: { type: String, default: 'Other' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

subscriptionSchema.index({ profileId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
