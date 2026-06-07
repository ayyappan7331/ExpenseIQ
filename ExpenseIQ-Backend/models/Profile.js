const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  profileId: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '👤' },
  isDefault: { type: Boolean, default: false },
  /** userId links this profile to a User document (Phase 7 auth).
   *  Null/absent on pre-auth profiles — they get adopted on first login. */
  userId: { type: String, default: null },
}, { timestamps: true });

// Unique per (userId, profileId) — two different users can both have
// profileId='default'; uniqueness is scoped to the user, not global.
profileSchema.index({ userId: 1, profileId: 1 }, { unique: true });

module.exports = mongoose.model('Profile', profileSchema);
