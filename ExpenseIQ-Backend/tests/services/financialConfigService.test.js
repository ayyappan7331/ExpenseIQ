const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/financialConfigService');

setupTestDb();

describe('financialConfigService', () => {
  it('get auto-creates default config when none exists', async () => {
    const config = await service.get();
    expect(config.profileId).toBe('default');
    expect(config.customExpenseCategories).toEqual([]);
    expect(config.customIncomeCategories).toEqual([]);
    expect(config.customPaymentMethods).toEqual([]);
    expect(config.subcategoryMap).toEqual({});
  });

  it('get returns the same document on repeated calls', async () => {
    const first = await service.get();
    const again = await service.get();
    expect(first._id.toString()).toBe(again._id.toString());
  });

  it('update upserts financial config', async () => {
    const out = await service.update({
      profileId: 'default',
      customExpenseCategories: ['Food', 'Transport'],
      customPaymentMethods: ['Cash'],
    });
    expect(out.customExpenseCategories).toEqual(['Food', 'Transport']);
    expect(out.customPaymentMethods).toEqual(['Cash']);
  });

  it('update only touches provided fields', async () => {
    await service.update({ profileId: 'default', customExpenseCategories: ['Food'] });
    const out = await service.update({ profileId: 'default', customPaymentMethods: ['UPI'] });
    expect(out.customExpenseCategories).toEqual(['Food']);
    expect(out.customPaymentMethods).toEqual(['UPI']);
  });

  it('update is profile-scoped', async () => {
    await service.update({ profileId: 'work', customExpenseCategories: ['Office'] });
    await service.update({ profileId: 'default', customExpenseCategories: ['Food'] });
    const work = await service.get({ profileId: 'work' });
    const def = await service.get({ profileId: 'default' });
    expect(work.customExpenseCategories).toEqual(['Office']);
    expect(def.customExpenseCategories).toEqual(['Food']);
  });

  it('update stores subcategoryMap correctly', async () => {
    const map = { Food: ['Groceries', 'Dining'], Transport: ['Fuel'] };
    const out = await service.update({ profileId: 'default', subcategoryMap: map });
    expect(out.subcategoryMap).toMatchObject(map);
  });
});
