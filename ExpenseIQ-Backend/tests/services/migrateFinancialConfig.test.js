const { setupTestDb } = require('../helpers/setup');
const Settings = require('../../models/Settings');
const FinancialConfig = require('../../models/FinancialConfig');
const { run } = require('../../scripts/migrateFinancialConfig');

setupTestDb();

describe('migrateFinancialConfig script', () => {
  it('creates FinancialConfig with empty defaults for profiles without one', async () => {
    // Settings no longer stores financial fields (E4.10)
    await Settings.create({ profileId: 'migrate-test' });

    const result = await run();
    expect(result.migrated).toBeGreaterThanOrEqual(1);
    expect(result.errors).toBe(0);

    const config = await FinancialConfig.findOne({ profileId: 'migrate-test' });
    expect(config).not.toBeNull();
    expect(config.customExpenseCategories).toEqual([]);
    expect(config.customPaymentMethods).toEqual([]);
  });

  it('skips profiles that already have FinancialConfig', async () => {
    await Settings.create({ profileId: 'already-migrated' });
    await FinancialConfig.create({ profileId: 'already-migrated', customExpenseCategories: ['Existing'] });

    const result = await run();
    expect(result.skipped).toBeGreaterThanOrEqual(1);

    // Existing FinancialConfig must not be overwritten
    const config = await FinancialConfig.findOne({ profileId: 'already-migrated' });
    expect(config.customExpenseCategories).toEqual(['Existing']);
  });

  it('is idempotent — running twice produces same result', async () => {
    await Settings.create({ profileId: 'idempotent-test' });

    await run();
    const result2 = await run();
    expect(result2.migrated).toBe(0);
    expect(result2.errors).toBe(0);

    const configs = await FinancialConfig.find({ profileId: 'idempotent-test' });
    expect(configs).toHaveLength(1);
  });
});
