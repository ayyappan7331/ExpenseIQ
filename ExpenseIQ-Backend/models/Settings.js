const mongoose = require('mongoose');

// Settings stores UI preferences only.
// Financial configuration (categories, payment methods, subcategories,
// templates, favorites, pins) has moved to FinancialConfig (E4.6–E4.9).

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  theme: { type: String, default: 'light' },
  widgets: { type: [String], default: ['chart', 'recent', 'goals'] },
  widgetOrder: { type: [String], default: [] },
  /** Persisted sidebar nav item order — array of NavItem hrefs. */
  navOrder: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
