import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, pageTitleFor } from './nav';

describe('NAV_ITEMS', () => {
  it('lists the 9 legacy nav entries in order', () => {
    expect(NAV_ITEMS.map((n) => n.label)).toEqual([
      'Dashboard',
      'Transaction',
      'Analytics',
      'Goals',
      'Subscriptions',
      'Debts',
      'Credit Cards',
      'Budgets',
      'Compare',
    ]);
  });

  it('every entry has a matching href', () => {
    for (const item of NAV_ITEMS) {
      expect(item.href).toMatch(/^\/[a-z]+$/);
      expect(typeof item.Icon).toBe('object'); // ForwardRef
    }
  });
});

describe('pageTitleFor', () => {
  it('returns the matching label for a known top-level path', () => {
    expect(pageTitleFor('/dashboard')).toBe('Dashboard');
    expect(pageTitleFor('/transactions')).toBe('Transaction');
    expect(pageTitleFor('/creditcards')).toBe('Credit Cards');
  });

  it('matches nested paths too (e.g. /transactions/abc)', () => {
    expect(pageTitleFor('/transactions/abc')).toBe('Transaction');
  });

  it('falls back to "ExpenseIQ" for unknown paths and falsy input', () => {
    expect(pageTitleFor('/something-else')).toBe('ExpenseIQ');
    expect(pageTitleFor('')).toBe('ExpenseIQ');
    expect(pageTitleFor(null)).toBe('ExpenseIQ');
  });
});
