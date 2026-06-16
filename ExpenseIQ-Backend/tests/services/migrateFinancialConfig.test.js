// migrateFinancialConfig.test.js
// The migration script reads Settings documents and creates FinancialConfig for any
// userId that doesn't have one yet. Settings now requires userId (not profileId).

const { setupTestDb } = require('../helpers/setup');
const Settings = require('../../models/Settings');
const FinancialConfig = require('../../models/FinancialConfig');
const { run } = require('../../scripts/migrateFinancialConfig');
const mongoose = require('mongoose');

setupTestDb();

describe('migrateFinancialConfig script', () => {
  it('creates FinancialConfig with empty defaults for users without one', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Settings.create({ userId });

    const result = await run();
    expect(result.migrated).toBeGreaterThanOrEqual(1);
    expect(result.errors).toBe(0);

    const config = await FinancialConfig.findOne({ userId });
    expect(config).not.toBeNull();
    expect(config.customExpenseCategories).toEqual([]);
    expect(config.customPaymentMethods).toEqual([]);
  });

  it('skips users that already have FinancialConfig', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Settings.create({ userId });
    await FinancialConfig.create({ userId, customExpenseCategories: ['Existing'] });

    const result = await run();
    expect(result.skipped).toBeGreaterThanOrEqual(1);

    // Existing FinancialConfig must not be overwritten
    const config = await FinancialConfig.findOne({ userId });
    expect(config.customExpenseCategories).toEqual(['Existing']);
  });

  it('is idempotent — running twice produces same result', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Settings.create({ userId });

    await run();
    const result2 = await run();
    expect(result2.migrated).toBe(0);
    expect(result2.errors).toBe(0);

    const configs = await FinancialConfig.find({ userId });
    expect(configs).toHaveLength(1);
  });
});
