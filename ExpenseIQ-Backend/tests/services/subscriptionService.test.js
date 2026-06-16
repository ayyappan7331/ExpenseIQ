const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/subscriptionService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();

const sample = (over = {}) => ({
  userId: uid1,
  context: 'Personal',
  name: 'Netflix',
  amount: 499,
  cycle: 'monthly',
  due: '2026-05-15',
  ...over,
});

describe('subscriptionService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('findAll sorts by due asc', async () => {
    await service.create(sample({ name: 'C', due: '2026-05-25' }));
    await service.create(sample({ name: 'A', due: '2026-05-05' }));
    await service.create(sample({ name: 'B', due: '2026-05-15' }));
    const list = await service.findAll({ userId: uid1 });
    expect(list.map((s) => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('create persists and returns the document', async () => {
    const sub = await service.create(sample({ name: 'Spotify' }));
    expect(sub._id).toBeDefined();
    expect(sub.name).toBe('Spotify');
    expect(sub.active).toBe(true); // schema default
  });

  it('update merges fields into existing doc', async () => {
    const created = await service.create(sample());
    const updated = await service.update(created._id, { amount: 999, active: false });
    expect(updated.amount).toBe(999);
    expect(updated.active).toBe(false);
    expect(updated.name).toBe('Netflix'); // untouched
  });

  it('update throws httpError(404) for unknown id', async () => {
    await expect(
      service.update('507f1f77bcf86cd799439011', { amount: 1 })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Not found' });
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('remove deletes and returns the doc', async () => {
    const created = await service.create(sample());
    const removed = await service.remove(created._id);
    expect(removed._id.toString()).toBe(created._id.toString());
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });
});
