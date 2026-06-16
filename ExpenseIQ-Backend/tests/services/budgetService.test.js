const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/budgetService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();

describe('budgetService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('upsert creates a new budget', async () => {
    const b = await service.upsert({
      userId: uid1,
      month: '2026-05',
      category: 'Food',
      amount: 5000,
    });
    expect(b._id).toBeDefined();
    expect(b.amount).toBe(5000);
  });

  it('upsert updates existing on same (userId, month, category)', async () => {
    await service.upsert({ userId: uid1, month: '2026-05', category: 'Food', amount: 5000 });
    const u = await service.upsert({
      userId: uid1,
      month: '2026-05',
      category: 'Food',
      amount: 7000,
    });
    expect(u.amount).toBe(7000);
    expect(await service.findAll({ userId: uid1 })).toHaveLength(1);
  });

  it('upsert throws httpError(400) when month/category/amount missing', async () => {
    await expect(service.upsert({ userId: uid1 })).rejects.toMatchObject({
      statusCode: 400,
      message: 'userId, month, category, and amount are required',
    });
    await expect(
      service.upsert({ userId: uid1, month: '2026-05' })
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.upsert({ userId: uid1, month: '2026-05', category: 'Food' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('upsert accepts amount=0 (only null/undefined fail)', async () => {
    const b = await service.upsert({
      userId: uid1,
      month: '2026-05',
      category: 'Misc',
      amount: 0,
    });
    expect(b.amount).toBe(0);
  });

  it('findAll filters by month', async () => {
    await service.upsert({ userId: uid1, month: '2026-05', category: 'Food', amount: 1 });
    await service.upsert({ userId: uid1, month: '2026-06', category: 'Food', amount: 2 });
    const may = await service.findAll({ userId: uid1, month: '2026-05' });
    expect(may).toHaveLength(1);
    expect(may[0].month).toBe('2026-05');
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011', uid1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('remove deletes the budget', async () => {
    const b = await service.upsert({
      userId: uid1,
      month: '2026-05',
      category: 'Food',
      amount: 1,
    });
    await service.remove(b._id, uid1);
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });
});
