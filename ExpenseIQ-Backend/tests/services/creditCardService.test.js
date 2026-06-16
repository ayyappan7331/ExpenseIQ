// Phase 11 — updated service unit tests.
// Uses userId instead of the deprecated profileId.
// Adds archive/restore/remove userId isolation tests.

const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/creditCardService');
const mongoose = require('mongoose');

setupTestDb();

const uid1 = new mongoose.Types.ObjectId();
const uid2 = new mongoose.Types.ObjectId();

const sample = (over = {}) => ({
  userId: uid1,
  context: 'Personal',
  name: 'HDFC',
  billDate: 1,
  dueDate: 15,
  limit: 100000,
  ...over,
});

describe('creditCardService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll({ userId: uid1 })).toEqual([]);
  });

  it('create persists with schema default color', async () => {
    const card = await service.create(sample());
    expect(card.color).toBe('#7c6ff7');
  });

  it('findAll filters by userId (cross-user isolation)', async () => {
    await service.create(sample({ userId: uid1 }));
    await service.create(sample({ userId: uid2 }));
    expect(await service.findAll({ userId: uid1 })).toHaveLength(1);
    expect(await service.findAll({ userId: uid2 })).toHaveLength(1);
  });

  it('update merges fields', async () => {
    const card = await service.create(sample());
    const updated = await service.update(card._id, { limit: 200000, color: '#000000' });
    expect(updated.limit).toBe(200000);
    expect(updated.color).toBe('#000000');
    expect(updated.name).toBe('HDFC');
  });

  it('update throws httpError(404) for unknown id', async () => {
    await expect(
      service.update('507f1f77bcf86cd799439011', { limit: 1 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // ── archive / restore ───────────────────────────────────────────────────

  it('archive sets archived=true for card owner', async () => {
    const card = await service.create(sample());
    const archived = await service.archive(card._id, uid1);
    expect(archived.archived).toBe(true);
  });

  it('archive throws 404 when userId does NOT match (cross-user blocked)', async () => {
    const card = await service.create(sample({ userId: uid1 }));
    await expect(
      service.archive(card._id, uid2)
    ).rejects.toMatchObject({ statusCode: 404 });
    // Verify card was NOT archived
    const cards = await service.findAll({ userId: uid1 });
    expect(cards[0].archived).toBeFalsy();
  });

  it('restore sets archived=false for card owner', async () => {
    const card = await service.create(sample());
    await service.archive(card._id, uid1);
    const restored = await service.restore(card._id, uid1);
    expect(restored.archived).toBe(false);
  });

  it('restore throws 404 when userId does NOT match (cross-user blocked)', async () => {
    const card = await service.create(sample({ userId: uid1 }));
    await service.archive(card._id, uid1); // archive it first
    await expect(
      service.restore(card._id, uid2)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  it('remove deletes card for owner', async () => {
    const card = await service.create(sample());
    await service.remove(card._id, uid1);
    expect(await service.findAll({ userId: uid1 })).toHaveLength(0);
  });

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011', uid1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('remove throws 404 when userId does NOT match (cross-user blocked)', async () => {
    const card = await service.create(sample({ userId: uid1 }));
    await expect(
      service.remove(card._id, uid2)
    ).rejects.toMatchObject({ statusCode: 404 });
    // Verify still exists for owner
    expect(await service.findAll({ userId: uid1 })).toHaveLength(1);
  });

  // ── linkedPaymentMethod ─────────────────────────────────────────────────

  it('create persists linkedPaymentMethod', async () => {
    const card = await service.create(sample({ linkedPaymentMethod: 'HDFC Credit Card' }));
    expect(card.linkedPaymentMethod).toBe('HDFC Credit Card');
  });

  it('create rejects duplicate linkedPaymentMethod within same user', async () => {
    await service.create(sample({ name: 'Card A', linkedPaymentMethod: 'HDFC Credit Card' }));
    await expect(
      service.create(sample({ name: 'Card B', linkedPaymentMethod: 'HDFC Credit Card' }))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('create allows same linkedPaymentMethod across different users', async () => {
    await service.create(sample({ userId: uid1, linkedPaymentMethod: 'Axis Ace' }));
    const card = await service.create(sample({ userId: uid2, linkedPaymentMethod: 'Axis Ace' }));
    expect(card.linkedPaymentMethod).toBe('Axis Ace');
  });

  it('update rejects linking to a method already used by another card', async () => {
    await service.create(sample({ name: 'Card A', linkedPaymentMethod: 'HDFC Credit Card' }));
    const cardB = await service.create(sample({ name: 'Card B', linkedPaymentMethod: 'Axis Ace' }));
    await expect(
      service.update(cardB._id, { linkedPaymentMethod: 'HDFC Credit Card' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('update allows a card to keep its own linkedPaymentMethod', async () => {
    const card = await service.create(sample({ linkedPaymentMethod: 'HDFC Credit Card' }));
    const updated = await service.update(card._id, { linkedPaymentMethod: 'HDFC Credit Card', limit: 500000 });
    expect(updated.linkedPaymentMethod).toBe('HDFC Credit Card');
    expect(updated.limit).toBe(500000);
  });

  it('update allows changing linkedPaymentMethod to a new unused value', async () => {
    const card = await service.create(sample({ linkedPaymentMethod: 'HDFC Credit Card' }));
    const updated = await service.update(card._id, { linkedPaymentMethod: 'HDFC Millennia' });
    expect(updated.linkedPaymentMethod).toBe('HDFC Millennia');
  });

  it('create allows multiple cards without linkedPaymentMethod (sparse index)', async () => {
    const a = await service.create(sample({ name: 'Legacy A' }));
    const b = await service.create(sample({ name: 'Legacy B' }));
    expect(a.linkedPaymentMethod).toBeUndefined();
    expect(b.linkedPaymentMethod).toBeUndefined();
  });
});
