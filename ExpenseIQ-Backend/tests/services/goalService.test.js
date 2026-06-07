const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/goalService');

setupTestDb();

describe('goalService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll()).toEqual([]);
  });

  it('upsert creates a new goal', async () => {
    const goal = await service.upsert({ profileId: 'default', month: '2026-05', amount: 10000 });
    expect(goal._id).toBeDefined();
    expect(goal.amount).toBe(10000);
  });

  it('upsert updates an existing goal for same (profileId, month)', async () => {
    await service.upsert({ profileId: 'default', month: '2026-05', amount: 10000 });
    const updated = await service.upsert({
      profileId: 'default',
      month: '2026-05',
      amount: 15000,
    });
    expect(updated.amount).toBe(15000);
    const list = await service.findAll();
    expect(list).toHaveLength(1);
  });

  it('different profileId or month creates separate goals', async () => {
    await service.upsert({ profileId: 'default', month: '2026-05', amount: 1 });
    await service.upsert({ profileId: 'default', month: '2026-06', amount: 2 });
    await service.upsert({ profileId: 'work', month: '2026-05', amount: 3 });
    expect(await service.findAll({ profileId: 'default' })).toHaveLength(2);
    expect(await service.findAll({ profileId: 'work' })).toHaveLength(1);
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('remove deletes the goal', async () => {
    const goal = await service.upsert({ profileId: 'default', month: '2026-05', amount: 1 });
    await service.remove(goal._id);
    expect(await service.findAll()).toEqual([]);
  });
});
