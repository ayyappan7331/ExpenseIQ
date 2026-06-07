const Profile = require('../models/Profile');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Debt = require('../models/Debt');
const Goal = require('../models/Goal');
const CreditCard = require('../models/CreditCard');
const Settings = require('../models/Settings');
const Budget = require('../models/Budget');
const FinancialConfig = require('../models/FinancialConfig');
const httpError = require('../utils/httpError');

const AUTH_ENABLED = () => process.env.AUTH_ENABLED === 'true';

/**
 * Adopt orphaned profiles on first login.
 *
 * When AUTH_ENABLED is turned on for the first time, existing profiles
 * (profileId='default', userId=null) have no owner. The first user to log in
 * claims them by having their userId stamped onto every ownerless profile.
 *
 * Idempotent — if the profiles already have a userId, this is a no-op.
 */
const adoptOrphanedProfiles = async (userId) => {
  await Profile.updateMany(
    { userId: null },
    { $set: { userId } }
  );
};

/**
 * Get all profiles for the current user.
 * When auth is enabled, scopes to req.user.userId and auto-adopts orphans.
 * When auth is disabled, returns all profiles (legacy behaviour).
 */
const findAll = async ({ userId } = {}) => {
  if (AUTH_ENABLED() && userId) {
    // Adopt any ownerless profiles before listing — idempotent
    await adoptOrphanedProfiles(userId);
    let profiles = await Profile.find({ userId }).sort({ isDefault: -1, name: 1 });
    if (!profiles.length) {
      // Brand-new user with no profiles at all — create their default.
      // Use 'default' as the profileId (same as legacy) — profileScope
      // ensures each user only accesses their own profiles, so two users
      // can both have profileId='default' without conflict.
      await Profile.create({
        profileId: 'default',
        name: 'Personal',
        icon: '👤',
        isDefault: true,
        userId,
      });
      profiles = await Profile.find({ userId }).sort({ isDefault: -1, name: 1 });
    }
    return profiles;
  }

  // Auth disabled — legacy: return all profiles, create default if none
  let profiles = await Profile.find().sort({ isDefault: -1, name: 1 });
  if (!profiles.length) {
    await Profile.create({ profileId: 'default', name: 'Personal', icon: '👤', isDefault: true });
    profiles = await Profile.find().sort({ isDefault: -1, name: 1 });
  }
  return profiles;
};

/**
 * Create a new profile.
 * When auth is enabled, stamps the userId on the new profile.
 */
const create = (data) => {
  const payload = { ...data };
  return Profile.create(payload);
};

/**
 * Delete a profile and cascade-delete all dependent data.
 * Default profile is protected.
 */
const remove = async (profileId) => {
  if (profileId === 'default') {
    throw httpError(400, 'Cannot delete default profile');
  }
  const profile = await Profile.findOneAndDelete({ profileId });
  if (!profile) throw httpError(404, 'Not found');
  await Promise.all([
    Transaction.deleteMany({ profileId }),
    Subscription.deleteMany({ profileId }),
    Debt.deleteMany({ profileId }),
    Goal.deleteMany({ profileId }),
    CreditCard.deleteMany({ profileId }),
    Settings.deleteMany({ profileId }),
    Budget.deleteMany({ profileId }),
    FinancialConfig.deleteMany({ profileId }),
  ]);
  return profile;
};

/**
 * Returns the list of profileIds the given userId is allowed to access.
 * Used by the profileScope middleware to validate client-sent profileId.
 * When auth is disabled, returns null (no restriction).
 */
const getAllowedProfileIds = async (userId) => {
  if (!AUTH_ENABLED() || !userId) return null;
  await adoptOrphanedProfiles(userId);
  const profiles = await Profile.find({ userId }, 'profileId').lean();
  return new Set(profiles.map((p) => p.profileId));
};

module.exports = { findAll, create, remove, getAllowedProfileIds, adoptOrphanedProfiles };
