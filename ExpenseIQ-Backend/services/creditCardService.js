const CreditCard = require('../models/CreditCard');
const httpError = require('../utils/httpError');

/**
 * Auto-migrates legacy dueDate (day-of-month) to duePeriod (days after statement).
 * Runs transparently on findAll — idempotent, only fires when duePeriod is absent.
 * Formula: duePeriod = days from billDate to dueDate, wrapping across month boundary.
 */
async function migrateDuePeriod(cards) {
  const toMigrate = cards.filter(c => !c.duePeriod && c.dueDate && c.billDate);
  if (toMigrate.length === 0) return cards;

  await Promise.all(toMigrate.map(c => {
    // Days from billDate to dueDate, always positive, wrapping month boundary
    let period = c.dueDate - c.billDate;
    if (period <= 0) period += 31; // wrap: e.g. bill=19, due=8 → 8-19+31 = 20
    return CreditCard.findByIdAndUpdate(c._id, { duePeriod: period });
  }));

  // Return cards with duePeriod populated
  return cards.map(c => {
    if (!c.duePeriod && c.dueDate && c.billDate) {
      let period = c.dueDate - c.billDate;
      if (period <= 0) period += 31;
      return { ...c.toObject ? c.toObject() : c, duePeriod: period };
    }
    return c;
  });
}

const findAll = async ({ profileId = 'default' } = {}) => {
  const cards = await CreditCard.find({ profileId, archived: { $ne: true } });
  return migrateDuePeriod(cards);
};

const findArchived = async ({ profileId = 'default' } = {}) => {
  const cards = await CreditCard.find({ profileId, archived: true });
  return migrateDuePeriod(cards);
};

const archive = async (id) => {
  const card = await CreditCard.findByIdAndUpdate(id, { archived: true }, { new: true });
  if (!card) throw httpError(404, 'Not found');
  return card;
};

const restore = async (id) => {
  const card = await CreditCard.findByIdAndUpdate(id, { archived: false }, { new: true });
  if (!card) throw httpError(404, 'Not found');
  return card;
};

/** Throws 400 if another card in the same profile already uses linkedPaymentMethod. */
async function assertUniqueLink(profileId, linkedPaymentMethod, excludeId) {
  if (!linkedPaymentMethod) return;
  const query = { profileId, linkedPaymentMethod };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await CreditCard.findOne(query).lean();
  if (existing) {
    throw httpError(400, `Payment method "${linkedPaymentMethod}" is already linked to another card`);
  }
}

const create = async (data) => {
  const payload = { ...data };
  // Strip falsy linkedPaymentMethod so the sparse index treats it as absent
  if (!payload.linkedPaymentMethod) delete payload.linkedPaymentMethod;
  await assertUniqueLink(payload.profileId || 'default', payload.linkedPaymentMethod);
  return CreditCard.create(payload);
};

const update = async (id, data) => {
  const card = await CreditCard.findById(id).lean();
  if (!card) throw httpError(404, 'Not found');
  const payload = { ...data };
  // Strip falsy linkedPaymentMethod so the sparse index treats it as absent
  if ('linkedPaymentMethod' in payload && !payload.linkedPaymentMethod) {
    delete payload.linkedPaymentMethod;
    payload.$unset = { linkedPaymentMethod: 1 };
  }
  await assertUniqueLink(card.profileId, payload.linkedPaymentMethod, id);
  const updated = await CreditCard.findByIdAndUpdate(id, payload, { new: true });
  if (!updated) throw httpError(404, 'Not found');
  return updated;
};

const remove = async (id) => {
  const card = await CreditCard.findByIdAndDelete(id);
  if (!card) throw httpError(404, 'Not found');
  return card;
};

module.exports = { findAll, findArchived, archive, restore, create, update, remove };
