// One-shot migration: convert Transaction.date and Debt.date from string
// (YYYY-MM-DD) to Date (UTC midnight). Idempotent — re-running on already-
// Date fields is a no-op.
//
// SAFETY:
//   - Defaults to DRY-RUN. Pass --apply to actually write.
//   - --reverse converts Date back to string (for rollback).
//   - Always take a `mongodump` of the target DB before running --apply
//     for the first time. The script connects to MONGO_URI in .env.
//
// Usage (CLI):
//   node utils/migrate-dates.js                              # dry-run forward
//   node utils/migrate-dates.js --apply                      # write forward
//   node utils/migrate-dates.js --reverse                    # dry-run reverse
//   node utils/migrate-dates.js --apply --reverse            # write reverse
//   node utils/migrate-dates.js --apply --collection=debts   # one collection
//
// Programmatic (used by tests):
//   const { migrate, migrateCollection } = require('./utils/migrate-dates');
//   await migrate({ apply: true });

const mongoose = require('mongoose');
const { toYMD, fromYMD } = require('./dateField');

const COLLECTIONS = ['transactions', 'debts'];

async function migrateCollection(collection, opts = {}) {
  const { reverse = false, apply = false } = opts;
  const docs = await collection.find({}).toArray();
  let changed = 0;

  for (const doc of docs) {
    const old = doc.date;
    let next;

    if (reverse) {
      if (!(old instanceof Date)) continue;
      next = toYMD(old);
      if (next === old) continue;
    } else {
      if (old instanceof Date) continue;
      if (typeof old !== 'string') continue;
      const parsed = fromYMD(old);
      if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) continue;
      next = parsed;
    }

    if (apply) {
      await collection.updateOne({ _id: doc._id }, { $set: { date: next } });
    }
    changed += 1;
  }

  return { total: docs.length, changed };
}

async function migrate(opts = {}) {
  const targets = opts.collection ? [opts.collection] : COLLECTIONS;
  const results = {};
  for (const name of targets) {
    const col = mongoose.connection.db.collection(name);
    // eslint-disable-next-line no-await-in-loop
    results[name] = await migrateCollection(col, opts);
  }
  return results;
}

module.exports = { migrate, migrateCollection };

// CLI entry point — only fires when invoked directly via `node`.
// Not exercised by jest (the migrate/migrateCollection functions are tested
// directly via tests/services/migrate-dates.test.js).
/* istanbul ignore next */
if (require.main === module) {
  // eslint-disable-next-line global-require
  require('dotenv').config();

  const args = process.argv.slice(2);
  const opts = {
    apply: args.includes('--apply'),
    reverse: args.includes('--reverse'),
  };
  const colArg = args.find((a) => a.startsWith('--collection='));
  if (colArg) opts.collection = colArg.split('=')[1];

  (async () => {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set. Refusing to run.');
      process.exit(1);
    }

    console.log(
      `Connecting to MongoDB (${opts.apply ? 'APPLY' : 'DRY-RUN'}, direction=${opts.reverse ? 'reverse' : 'forward'})…`
    );
    await mongoose.connect(process.env.MONGO_URI);

    try {
      const results = await migrate(opts);
      for (const [name, r] of Object.entries(results)) {
        const verb = opts.apply
          ? opts.reverse
            ? 'reverted to string'
            : 'converted to Date'
          : opts.reverse
            ? 'would revert to string'
            : 'would convert to Date';
        console.log(`${name}: ${r.changed} of ${r.total} documents ${verb}`);
      }
      if (!opts.apply) {
        console.log('\nDry-run only. Pass --apply to actually write.');
      }
    } finally {
      await mongoose.disconnect();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
