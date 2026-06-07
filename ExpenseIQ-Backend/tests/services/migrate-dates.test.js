// Phase 6 unit tests — migration script behavior.
// We bypass Mongoose models and write raw documents directly to the
// underlying MongoDB collection. That lets us simulate the pre-migration
// state (string dates) and verify the script handles forward + reverse.

const mongoose = require('mongoose');
const { setupTestDb } = require('../helpers/setup');
const { migrate, migrateCollection } = require('../../utils/migrate-dates');

// Register Transaction and Debt models so that setupTestDb's afterEach
// clear() iterates these collections. Without this, the model side never
// initializes and state leaks between tests in this file.
require('../../models/Transaction');
require('../../models/Debt');

setupTestDb();

const txnCol = () => mongoose.connection.db.collection('transactions');
const debtCol = () => mongoose.connection.db.collection('debts');

describe('migrate-dates: forward (string -> Date)', () => {
  it('converts string-typed dates to Date when --apply', async () => {
    await txnCol().insertMany([
      { profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10' },
      { profileId: 'default', type: 'expense', amount: 2, date: '2026-06-20' },
    ]);

    const r = await migrateCollection(txnCol(), { apply: true });
    expect(r.total).toBe(2);
    expect(r.changed).toBe(2);

    const after = await txnCol().find({}).toArray();
    expect(after[0].date).toBeInstanceOf(Date);
    expect(after[0].date.toISOString()).toBe('2026-05-10T00:00:00.000Z');
    expect(after[1].date).toBeInstanceOf(Date);
    expect(after[1].date.toISOString()).toBe('2026-06-20T00:00:00.000Z');
  });

  it('is idempotent — second run reports zero changes', async () => {
    await txnCol().insertOne({
      profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10',
    });

    const r1 = await migrateCollection(txnCol(), { apply: true });
    expect(r1.changed).toBe(1);
    const r2 = await migrateCollection(txnCol(), { apply: true });
    expect(r2.changed).toBe(0);
  });

  it('default mode is dry-run (no writes)', async () => {
    await txnCol().insertOne({
      profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10',
    });

    const r = await migrateCollection(txnCol()); // no apply
    expect(r.changed).toBe(1);

    const doc = await txnCol().findOne();
    expect(typeof doc.date).toBe('string');
    expect(doc.date).toBe('2026-05-10');
  });

  it('leaves non-string, non-Date values alone', async () => {
    await txnCol().insertMany([
      { profileId: 'default', type: 'expense', amount: 1, date: null },
      { profileId: 'default', type: 'expense', amount: 2 }, // no date field at all
    ]);
    const r = await migrateCollection(txnCol(), { apply: true });
    expect(r.changed).toBe(0);
  });
});

describe('migrate-dates: reverse (Date -> string)', () => {
  it('reverts Date back to YYYY-MM-DD when --reverse --apply', async () => {
    await txnCol().insertOne({
      profileId: 'default',
      type: 'expense',
      amount: 1,
      date: new Date(Date.UTC(2026, 4, 10)), // 2026-05-10
    });

    const r = await migrateCollection(txnCol(), { reverse: true, apply: true });
    expect(r.changed).toBe(1);

    const doc = await txnCol().findOne();
    expect(typeof doc.date).toBe('string');
    expect(doc.date).toBe('2026-05-10');
  });

  it('reverse is idempotent', async () => {
    await txnCol().insertOne({
      profileId: 'default',
      type: 'expense',
      amount: 1,
      date: new Date(Date.UTC(2026, 4, 10)),
    });
    await migrateCollection(txnCol(), { reverse: true, apply: true });
    const r2 = await migrateCollection(txnCol(), { reverse: true, apply: true });
    expect(r2.changed).toBe(0);
  });

  it('round-trip: forward then reverse restores original string', async () => {
    await txnCol().insertOne({
      profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10',
    });
    await migrateCollection(txnCol(), { apply: true });
    await migrateCollection(txnCol(), { reverse: true, apply: true });
    const doc = await txnCol().findOne();
    expect(doc.date).toBe('2026-05-10');
  });
});

describe('migrate-dates: multi-collection migrate()', () => {
  it('processes both transactions and debts by default', async () => {
    await txnCol().insertOne({
      profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10',
    });
    await debtCol().insertOne({
      profileId: 'default', type: 'lent', person: 'A', amount: 1, date: '2026-05-15',
    });

    const result = await migrate({ apply: true });
    expect(result.transactions.changed).toBe(1);
    expect(result.debts.changed).toBe(1);
  });

  it('--collection scopes to one', async () => {
    await txnCol().insertOne({
      profileId: 'default', type: 'expense', amount: 1, date: '2026-05-10',
    });
    await debtCol().insertOne({
      profileId: 'default', type: 'lent', person: 'A', amount: 1, date: '2026-05-15',
    });

    const result = await migrate({ apply: true, collection: 'transactions' });
    expect(result.transactions.changed).toBe(1);
    expect(result.debts).toBeUndefined();

    // Debts untouched
    const debt = await debtCol().findOne();
    expect(typeof debt.date).toBe('string');
  });
});
