/**
 * E4.7 Migration Script — Populate FinancialConfig from Settings
 *
 * Reads all Settings documents and creates FinancialConfig documents for any
 * profile that does not have one yet. Idempotent — safe to rerun.
 *
 * Usage (standalone):
 *   node scripts/migrateFinancialConfig.js
 *
 * Usage (programmatic):
 *   const { run } = require('./scripts/migrateFinancialConfig');
 *   await run();
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Settings = require('../models/Settings');
const FinancialConfig = require('../models/FinancialConfig');
const logger = require('../utils/logger');

async function run() {
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  const allSettings = await Settings.find({}).lean();
  logger.info({ count: allSettings.length }, 'migrateFinancialConfig: found Settings documents');

  for (const settings of allSettings) {
    const profileId = settings.profileId || 'default';

    try {
      // Skip if FinancialConfig already exists for this profile
      const existing = await FinancialConfig.findOne({ profileId });
      if (existing) {
        skipped++;
        continue;
      }

      await FinancialConfig.create({
        profileId,
        customExpenseCategories: settings.customExpenseCategories || [],
        customIncomeCategories: settings.customIncomeCategories || [],
        customPaymentMethods: settings.customPaymentMethods || [],
        subcategoryMap: settings.subcategoryMap || {},
      });

      migrated++;
      logger.info({ profileId }, 'migrateFinancialConfig: migrated profile');
    } catch (err) {
      errors++;
      logger.error({ profileId, err }, 'migrateFinancialConfig: failed to migrate profile');
    }
  }

  logger.info({ migrated, skipped, errors }, 'migrateFinancialConfig: complete');
  return { migrated, skipped, errors };
}

// Run standalone when executed directly
if (require.main === module) {
  connectDB()
    .then(() => run())
    .then(({ migrated, skipped, errors }) => {
      console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
      process.exit(errors > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { run };
