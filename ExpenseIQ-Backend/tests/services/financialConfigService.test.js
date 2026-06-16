const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/financialConfigService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

describe('financialConfigService', () => {
  it('get auto-creates default config when none exists', async () => {
    const config = await service.get({ userId: uid1 });
    expect(config.userId.toString()).toBe(uid1.toString());
    expect(config.customExpenseCategories).toEqual([]);
    expect(config.customIncomeCategories).toEqual([]);
    expect(config.customPaymentMethods).toEqual([]);
    expect(config.subcategoryMap).toEqual({});
  });

  it('get returns the same document on repeated calls', async () => {
    const first = await service.get({ userId: uid1 });
    const again = await service.get({ userId: uid1 });
    expect(first._id.toString()).toBe(again._id.toString());
  });

  it('update upserts financial config', async () => {
    const out = await service.update({
      userId: uid1,
      customExpenseCategories: ['Food', 'Transport'],
      customPaymentMethods: ['Cash'],
    });
    expect(out.customExpenseCategories).toEqual(['Food', 'Transport']);
    expect(out.customPaymentMethods).toEqual(['Cash']);
  });

  it('update only touches provided fields', async () => {
    await service.update({ userId: uid1, customExpenseCategories: ['Food'] });
    const out = await service.update({ userId: uid1, customPaymentMethods: ['UPI'] });
    expect(out.customExpenseCategories).toEqual(['Food']);
    expect(out.customPaymentMethods).toEqual(['UPI']);
  });

  it('update is userId-scoped (cross-user isolation)', async () => {
    await service.update({ userId: uid1, customExpenseCategories: ['Office'] });
    await service.update({ userId: uid2, customExpenseCategories: ['Food'] });
    const c1 = await service.get({ userId: uid1 });
    const c2 = await service.get({ userId: uid2 });
    expect(c1.customExpenseCategories).toEqual(['Office']);
    expect(c2.customExpenseCategories).toEqual(['Food']);
  });

  it('update stores subcategoryMap correctly', async () => {
    const map = { Food: ['Groceries', 'Dining'], Transport: ['Fuel'] };
    const out = await service.update({ userId: uid1, subcategoryMap: map });
    expect(out.subcategoryMap).toMatchObject(map);
  });
});
