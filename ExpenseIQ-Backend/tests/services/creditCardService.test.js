const { setupTestDb } = require('../helpers/setup');
const service = require('../../services/creditCardService');

setupTestDb();

const sample = (over = {}) => ({
  profileId: 'default',
  name: 'HDFC',
  billDate: 1,
  dueDate: 15,
  limit: 100000,
  ...over,
});

describe('creditCardService', () => {
  it('findAll returns [] when empty', async () => {
    expect(await service.findAll()).toEqual([]);
  });

  it('create persists with schema default color', async () => {
    const card = await service.create(sample());
    expect(card.color).toBe('#7c6ff7');
  });

  it('findAll filters by profileId', async () => {
    await service.create(sample({ profileId: 'default' }));
    await service.create(sample({ profileId: 'work' }));
    expect(await service.findAll({ profileId: 'default' })).toHaveLength(1);
    expect(await service.findAll({ profileId: 'work' })).toHaveLength(1);
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

  it('remove throws httpError(404) for unknown id', async () => {
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  // ── linkedPaymentMethod ──────────────────────────────────────────────────

  it('create persists linkedPaymentMethod', async () => {
    const card = await service.create(sample({ linkedPaymentMethod: 'HDFC Credit Card' }));
    expect(card.linkedPaymentMethod).toBe('HDFC Credit Card');
  });

  it('create rejects duplicate linkedPaymentMethod within same profile', async () => {
    await service.create(sample({ name: 'Card A', linkedPaymentMethod: 'HDFC Credit Card' }));
    await expect(
      service.create(sample({ name: 'Card B', linkedPaymentMethod: 'HDFC Credit Card' }))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('create allows same linkedPaymentMethod across different profiles', async () => {
    await service.create(sample({ profileId: 'default', linkedPaymentMethod: 'Axis Ace' }));
    const card = await service.create(sample({ profileId: 'work', linkedPaymentMethod: 'Axis Ace' }));
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
