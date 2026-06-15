/**
 * Phase 1 — Orphaned Document Repair Migration
 *
 * WHAT IT DOES:
 *   Finds all documents across every collection that are missing the `userId`
 *   field (written before AUTH_ENABLED=true was enforced) and assigns them to
 *   the canonical owner account (ayyappan7331@gmail.com).
 *
 * WHY:
 *   MongoDB queries like `{ userId: undefined }` match documents where userId
 *   is absent. This caused all pre-auth records to appear shared across every
 *   user account that logged in.
 *
 * SAFETY GUARDRAILS:
 *   1. Dry-run by default  — pass --apply to write changes.
 *   2. Prints a full audit table before making any changes.
 *   3. Verifies the target user exists before touching any data.
 *   4. Idempotent — safe to re-run; orphan count will be 0 on second run.
 *   5. Does NOT delete anything — only adds the missing userId field.
 *
 * USAGE:
 *   # Step 1 — audit only (safe, no writes):
 *   node scripts/repairOrphanedDocuments.js
 *
 *   # Step 2 — apply the fix after reviewing the audit:
 *   node scripts/repairOrphanedDocuments.js --apply
 */

require('dotenv').config({ path: process.env.NODE_ENV === 'qa' ? '.env.qa' : '.env' });

const mongoose = require('mongoose');
const connectDB = require('../config/db');

// ── Models ────────────────────────────────────────────────────────────────────
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Debt = require('../models/Debt');
const Goal = require('../models/Goal');
const CreditCard = require('../models/CreditCard');
const Settings = require('../models/Settings');
const Budget = require('../models/Budget');
const FinancialConfig = require('../models/FinancialConfig');

// ── Configuration ─────────────────────────────────────────────────────────────
const TARGET_EMAIL = 'ayyappan7331@gmail.com';
const DEFAULT_CONTEXT = 'Personal';

// All collections that need checking. Order matters: independent collections first.
const COLLECTIONS = [
  { model: Transaction,    name: 'Transaction' },
  { model: Subscription,   name: 'Subscription' },
  { model: Debt,           name: 'Debt' },
  { model: Goal,           name: 'Goal' },
  { model: CreditCard,     name: 'CreditCard' },
  { model: Budget,         name: 'Budget' },
  { model: FinancialConfig, name: 'FinancialConfig' },
  { model: Settings,       name: 'Settings' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ORPHAN_FILTER = { userId: { $exists: false } };

/**
 * Count orphaned documents in a collection.
 */
async function countOrphans(model) {
  return model.countDocuments(ORPHAN_FILTER);
}

/**
 * Fetch a sample of orphaned documents for the audit log (max 3 per collection).
 */
async function sampleOrphans(model) {
  return model.find(ORPHAN_FILTER).limit(3).lean();
}

/**
 * Assign all orphaned documents in a collection to the target user.
 * Sets userId and (if the field exists in the schema) context.
 */
async function repairCollection(model, userId, modelName) {
  const schemaFields = Object.keys(model.schema.paths);
  const hasContext = schemaFields.includes('context');

  const update = { $set: { userId } };
  if (hasContext) {
    // Only set context on documents that also lack it, to avoid overwriting valid context values
    update.$set.context = DEFAULT_CONTEXT;
  }

  const result = await model.collection.updateMany(
    ORPHAN_FILTER,
    update
  );

  return result.modifiedCount;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const applyChanges = process.argv.includes('--apply');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ExpenseIQ — Orphaned Document Repair Migration');
  console.log(`  Mode: ${applyChanges ? '⚠️  APPLY (writes to DB)' : '✅ DRY RUN (read-only)'}`);
  console.log(`  Target: ${TARGET_EMAIL}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // ── Step 1: Find the target user ──────────────────────────────────────────
  const user = await User.findOne({ email: TARGET_EMAIL }).lean();
  if (!user) {
    console.error(`❌ ERROR: User "${TARGET_EMAIL}" not found in the database.`);
    console.error('   Register this account first, then re-run this script.');
    process.exit(1);
  }
  const userId = user._id;
  console.log(`✅ Target user found: ${user.email} (ID: ${userId})\n`);

  // ── Step 2: Audit all collections ─────────────────────────────────────────
  console.log('📊 Audit — Orphaned Documents (userId missing):');
  console.log('────────────────────────────────────────────────');

  let totalOrphans = 0;
  const auditResults = [];

  for (const { model, name } of COLLECTIONS) {
    const count = await countOrphans(model);
    const samples = count > 0 ? await sampleOrphans(model) : [];
    auditResults.push({ name, count, samples });
    totalOrphans += count;

    const indicator = count > 0 ? '⚠️ ' : '✅';
    console.log(`  ${indicator} ${name.padEnd(16)} ${count} orphaned record(s)`);

    if (count > 0 && samples.length > 0) {
      console.log('    Sample IDs:');
      samples.forEach(doc => {
        const preview = doc.type
          ? ` [${doc.type}] ₹${doc.amount ?? '-'} on ${doc.date ? doc.date.toISOString().slice(0, 10) : '-'}`
          : doc.name
          ? ` "${doc.name}"`
          : '';
        console.log(`      • _id: ${doc._id}${preview}`);
      });
    }
  }

  console.log('────────────────────────────────────────────────');
  console.log(`  Total orphaned records: ${totalOrphans}`);
  console.log('');

  // ── Step 3: Exit early if nothing to fix ──────────────────────────────────
  if (totalOrphans === 0) {
    console.log('🎉 No orphaned documents found. Database is clean.');
    console.log('   All records already have a userId. No action needed.\n');
    process.exit(0);
  }

  // ── Step 4: Dry-run exit ──────────────────────────────────────────────────
  if (!applyChanges) {
    console.log('ℹ️  DRY RUN complete — no changes were made.');
    console.log(`   To apply the fix, run:\n`);
    console.log(`   node scripts/repairOrphanedDocuments.js --apply\n`);
    console.log('   This will assign all orphaned records to:');
    console.log(`     ${TARGET_EMAIL} (${userId})`);
    console.log(`     context: "${DEFAULT_CONTEXT}"\n`);
    process.exit(0);
  }

  // ── Step 5: Apply changes ─────────────────────────────────────────────────
  console.log('🔧 Applying fixes...');
  console.log('────────────────────────────────────────────────');

  let totalFixed = 0;
  let totalErrors = 0;

  for (const { model, name } of COLLECTIONS) {
    const expectedCount = auditResults.find(r => r.name === name)?.count ?? 0;
    if (expectedCount === 0) {
      console.log(`  ✅ ${name.padEnd(16)} — skipped (0 orphans)`);
      continue;
    }

    try {
      const fixed = await repairCollection(model, userId, name);
      totalFixed += fixed;
      console.log(`  ✅ ${name.padEnd(16)} — ${fixed} records assigned to ${TARGET_EMAIL}`);
    } catch (err) {
      totalErrors++;
      console.error(`  ❌ ${name.padEnd(16)} — FAILED: ${err.message}`);
    }
  }

  console.log('────────────────────────────────────────────────');
  console.log(`  Records fixed:  ${totalFixed}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log('');

  // ── Step 6: Verify — run audit again to confirm ───────────────────────────
  console.log('🔍 Post-fix verification...');
  let remainingOrphans = 0;
  for (const { model, name } of COLLECTIONS) {
    const count = await countOrphans(model);
    remainingOrphans += count;
    if (count > 0) {
      console.log(`  ⚠️  ${name}: ${count} orphans STILL remaining — investigate manually`);
    }
  }

  if (remainingOrphans === 0) {
    console.log('  ✅ Verification passed — zero orphaned documents remain.\n');
    console.log('🎉 Migration complete!\n');
    console.log('   NEXT STEPS:');
    console.log('   1. Restart the backend server: npm run dev');
    console.log('   2. Log in as ayyappan7331@gmail.com and verify your data is visible');
    console.log('   3. Log in as another account and confirm you see NO transactions');
    console.log('   4. Proceed to Phase 2 (code fixes for credit card scoping)\n');
  } else {
    console.error(`  ❌ ${remainingOrphans} orphaned records STILL remain after fix.`);
    console.error('   Please investigate manually in MongoDB Atlas.\n');
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

// ── Entry Point ───────────────────────────────────────────────────────────────
connectDB()
  .then(() => run())
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
