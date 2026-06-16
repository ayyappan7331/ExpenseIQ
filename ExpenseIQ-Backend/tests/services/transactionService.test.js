// Phase 11 — updated service unit tests.
// Uses userId instead of the deprecated profileId.

const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/transactionService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

const sample = (over = {}) => ({
  userId: uid1,
  context: 'Personal',
  type: 'expense',
  amount: 100,
  date: new Date('2026-05-10'),
  ...over,
});

describe('transactionService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('create persists and returns the document', async () => {
    const txn = await service.create(sample({ amount: 250 }));
    expect(txn._id).toBeDefined();
    expect(txn.amount).toBe(250);
  });

  it('findAll filters by month (UTC date-range on YYYY-MM)', async () => {
    await service.create(sample({ date: new Date('2026-05-01') }));
    await service.create(sample({ date: new Date('2026-06-15') }));
    const may = await service.findAll({ userId: uid1, month: '2026-05' });
    expect(may).toHaveLength(1);
    expect(may[0].toJSON().date).toBe('2026-05-01');
  });

  it('findAll sorts by date desc', async () => {
    await service.create(sample({ date: new Date('2026-05-01'), amount: 1 }));
    await service.create(sample({ date: new Date('2026-05-10'), amount: 2 }));
    await service.create(sample({ date: new Date('2026-05-05'), amount: 3 }));
    const list = await service.findAll({ userId: uid1 });
    expect(list.map((t) => t.amount)).toEqual([2, 3, 1]);
  });

  // ── Update ──────────────────────────────────────────────────────────────

  it('update succeeds when userId matches owner', async () => {
    const txn = await service.create(sample({ amount: 50 }));
    const updated = await service.update(txn._id.toString(), uid1.toString(), { amount: 99 });
    expect(updated.amount).toBe(99);
  });

  it('update throws httpError(404) for unknown id', async () => {
    await expect(
      service.update('507f1f77bcf86cd799439011', uid1.toString(), { amount: 1 })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Not found' });
  });

  it('update throws httpError(404) when userId does NOT match owner (cross-user blocked)', async () => {
    const txn = await service.create(sample({ userId: uid1 }));
    await expect(
      service.update(txn._id.toString(), uid2.toString(), { amount: 9999 })
    ).rejects.toMatchObject({ statusCode: 404 });
    // Verify original record unchanged
    const unchanged = await service.findAll({ userId: uid1 });
    expect(unchanged[0].amount).toBe(100);
  });

  it('update throws httpError(401) when userId is missing', async () => {
    const txn = await service.create(sample());
    await expect(
      service.update(txn._id.toString(), null, { amount: 1 })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  // ── Remove ──────────────────────────────────────────────────────────────

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011', uid1.toString())).rejects.toMatchObject({
      statusCode: 404,
      message: 'Not found',
    });
  });

  it('remove throws httpError(404) when userId does NOT match (cross-user blocked)', async () => {
    const txn = await service.create(sample({ userId: uid1 }));
    await expect(
      service.remove(txn._id.toString(), uid2.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
    // Verify still exists for owner
    const still = await service.findAll({ userId: uid1 });
    expect(still).toHaveLength(1);
  });

  it('remove throws httpError(401) when userId is missing', async () => {
    const txn = await service.create(sample());
    await expect(
      service.remove(txn._id.toString(), null)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  // ── BulkCreate ──────────────────────────────────────────────────────────

  it('bulkCreate inserts many at once', async () => {
    const docs = await service.bulkCreate([sample({ amount: 1 }), sample({ amount: 2 })]);
    expect(docs).toHaveLength(2);
  });

  // ── BulkDelete ──────────────────────────────────────────────────────────

  it('bulkDelete returns the deleted count', async () => {
    const a = await service.create(sample({ amount: 1 }));
    const b = await service.create(sample({ amount: 2 }));
    const count = await service.bulkDelete([a._id.toString(), b._id.toString()], uid1.toString());
    expect(count).toBe(2);
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('bulkDelete does NOT delete records belonging to another user', async () => {
    const a = await service.create(sample({ userId: uid1, amount: 10 }));
    // uid2 tries to bulk-delete uid1's record
    const count = await service.bulkDelete([a._id.toString()], uid2.toString());
    expect(count).toBe(1); // reports count of IDs passed, but 0 actually deleted
    const stillThere = await service.findAll({ userId: uid1 });
    expect(stillThere).toHaveLength(1); // uid1's record untouched
  });

  it('bulkDelete throws httpError(400) when ids is empty', async () => {
    await expect(service.bulkDelete([], uid1.toString())).rejects.toMatchObject({
      statusCode: 400,
      message: 'No IDs provided',
    });
  });

  it('bulkDelete throws httpError(400) when ids is missing', async () => {
    await expect(service.bulkDelete(undefined, uid1.toString())).rejects.toMatchObject({
      statusCode: 400,
      message: 'No IDs provided',
    });
  });

  it('bulkDelete throws httpError(401) when userId is missing', async () => {
    const txn = await service.create(sample());
    await expect(service.bulkDelete([txn._id.toString()], null)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  // ── User Isolation ──────────────────────────────────────────────────────

  it('findAll does NOT return records from another user', async () => {
    await service.create(sample({ userId: uid1, amount: 111 }));
    await service.create(sample({ userId: uid2, amount: 222 }));
    const user1Data = await service.findAll({ userId: uid1 });
    const user2Data = await service.findAll({ userId: uid2 });
    expect(user1Data).toHaveLength(1);
    expect(user2Data).toHaveLength(1);
    expect(user1Data[0].amount).toBe(111);
    expect(user2Data[0].amount).toBe(222);
  });
});
