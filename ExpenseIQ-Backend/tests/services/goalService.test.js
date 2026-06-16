const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/goalService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

describe('goalService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('upsert creates a new goal', async () => {
    const goal = await service.upsert({ userId: uid1, month: '2026-05', amount: 10000 });
    expect(goal._id).toBeDefined();
    expect(goal.amount).toBe(10000);
  });

  it('upsert updates an existing goal for same (userId, month)', async () => {
    await service.upsert({ userId: uid1, month: '2026-05', amount: 10000 });
    const updated = await service.upsert({
      userId: uid1,
      month: '2026-05',
      amount: 15000,
    });
    expect(updated.amount).toBe(15000);
    const list = await service.findAll({ userId: uid1 });
    expect(list).toHaveLength(1);
  });

  it('different userId or month creates separate goals', async () => {
    await service.upsert({ userId: uid1, month: '2026-05', amount: 1 });
    await service.upsert({ userId: uid1, month: '2026-06', amount: 2 });
    await service.upsert({ userId: uid2, month: '2026-05', amount: 3 });
    expect(await service.findAll({ userId: uid1 })).toHaveLength(2);
    expect(await service.findAll({ userId: uid2 })).toHaveLength(1);
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011', uid1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('remove deletes the goal', async () => {
    const goal = await service.upsert({ userId: uid1, month: '2026-05', amount: 1 });
    await service.remove(goal._id, uid1);
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });
});
