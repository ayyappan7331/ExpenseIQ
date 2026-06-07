// profileScope middleware.
//
// When AUTH_ENABLED=true, every resource request must supply a profileId
// (in query, body, or params) that belongs to req.user.userId.
//
// Flow:
//   1. Extract profileId from req.query.profileId || req.body.profileId
//   2. Load the set of allowed profileIds for req.user.userId
//      (adoptOrphanedProfiles runs here on first login — idempotent)
//   3. If client profileId is not in the allowed set → 403
//   4. Stamp req.resolvedProfileId so controllers can use it if needed
//
// When AUTH_ENABLED=false: no-op, passes through.

const { getAllowedProfileIds } = require('../services/profileService');

const profileScope = async (req, res, next) => {
  if (process.env.AUTH_ENABLED !== 'true') return next();
  if (!req.user) return next(); // auth middleware already rejected if missing

  try {
    const clientProfileId =
      req.query.profileId ||
      (req.body && req.body.profileId) ||
      'default';

    const allowed = await getAllowedProfileIds(req.user.userId);

    if (allowed && !allowed.has(clientProfileId)) {
      return res.status(403).json({
        error: `Profile "${clientProfileId}" does not belong to your account`,
      });
    }

    req.resolvedProfileId = clientProfileId;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = profileScope;
