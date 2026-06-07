// Phase 5 unit tests — profileService cascade is the highest-risk path
// per the migration roadmap. Tested directly here, independent of Express.

const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/profileService');

const Transaction = require('../../models/Transaction');
const Subscription = require('../../models/Subscription');
const Debt = require('../../models/Debt');
const Goal = require('../../models/Goal');
const CreditCard = require('../../models/CreditCard');
const Settings = require('../../models/Settings');
const Budget = require('../../models/Budget');

setupTestDb();

describe('profileService', () => {
  it('findAll auto-creates default profile when none exist', async () => {
    const list = await service.findAll();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      profileId: 'default',
      name: 'Personal',
      isDefault: true,
    });
  });

  it('findAll sorts isDefault first', async () => {
    await service.findAll();
    await service.create({ profileId: 'work', name: 'Work' });
    const list = await service.findAll();
    expect(list[0].isDefault).toBe(true);
  });

  it('create persists a new profile', async () => {
    const p = await service.create({ profileId: 'work', name: 'Work', icon: '💼' });
    expect(p.profileId).toBe('work');
    expect(p.name).toBe('Work');
  });

  it('remove throws httpError(400) when deleting the default profile', async () => {
    await service.findAll(); // ensure default exists
    await expect(service.remove('default')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot delete default profile',
    });
  });

  it('remove throws httpError(404) for unknown profileId', async () => {
    await expect(service.remove('does-not-exist')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Not found',
    });
  });

  it('remove cascades across all 7 child collections', async () => {
    await service.create({ profileId: 'work', name: 'Work' });

    // Seed every collection with a 'work' document.
    await Transaction.create({
      profileId: 'work', type: 'expense', amount: 1, date: '2026-05-01',
    });
    await Subscription.create({
      profileId: 'work', name: 'X', amount: 1, due: '2026-05-01',
    });
    await Debt.create({
      profileId: 'work', type: 'lent', person: 'P', amount: 1, date: '2026-05-01',
    });
    await Goal.create({ profileId: 'work', month: '2026-05', amount: 100 });
    await CreditCard.create({
      profileId: 'work', name: 'Card', billDate: 1, dueDate: 15,
    });
    await Settings.create({ profileId: 'work', theme: 'dark' });
    await Budget.create({
      profileId: 'work', month: '2026-05', category: 'Food', amount: 500,
    });

    // Sanity: each collection has one 'work' doc.
    expect(await Transaction.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await Subscription.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await Debt.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await Goal.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await CreditCard.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await Settings.countDocuments({ profileId: 'work' })).toBe(1);
    expect(await Budget.countDocuments({ profileId: 'work' })).toBe(1);

    await service.remove('work');

    expect(await Transaction.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Subscription.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Debt.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Goal.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await CreditCard.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Settings.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Budget.countDocuments({ profileId: 'work' })).toBe(0);
  });

  it('cascade does NOT touch other profiles', async () => {
    await service.create({ profileId: 'work', name: 'Work' });
    await service.create({ profileId: 'personal', name: 'Personal Custom' });

    await Transaction.create({
      profileId: 'work', type: 'expense', amount: 1, date: '2026-05-01',
    });
    await Transaction.create({
      profileId: 'personal', type: 'expense', amount: 2, date: '2026-05-01',
    });

    await service.remove('work');

    expect(await Transaction.countDocuments({ profileId: 'work' })).toBe(0);
    expect(await Transaction.countDocuments({ profileId: 'personal' })).toBe(1);
  });
});
