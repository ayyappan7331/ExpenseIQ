import { describe, it, expect, vi } from 'vitest';
import { useRecentValues, useRecentValuesForCategory } from '@/lib/hooks/useRecentValues';
import { duplicateTransaction } from '@/app/(app)/transactions/mutations';
import { renderHook } from '@/test/utils/render';

// Mock the useTransactions hook to avoid QueryClient dependency
vi.mock('@/lib/hooks/queries', () => ({
  useTransactions: () => ({ data: [] })
}));

describe('E3.3 Enhancements', () => {
  describe('useRecentValues', () => {
    it('returns empty arrays when no transactions', () => {
      const { result } = renderHook(() => useRecentValues());
      
      expect(result.current.categories).toEqual([]);
      expect(result.current.subcategories).toEqual([]);
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.notes).toEqual([]);
    });
  });

  describe('useRecentValuesForCategory', () => {
    it('returns empty arrays when no category provided', () => {
      const { result } = renderHook(() => useRecentValuesForCategory(''));
      
      expect(result.current.subcategories).toEqual([]);
      expect(result.current.paymentMethods).toEqual([]);
    });
  });

  describe('duplicateTransaction', () => {
    it('creates a new transaction with today\'s date', () => {
      const originalTransaction = {
        id: '123',
        type: 'expense' as const,
        amount: 100,
        category: 'Food',
        subcategory: 'Groceries',
        date: '2024-01-01',
        time: '14:30',
        paymentMethod: 'Credit Card',
        paymentApp: 'GPay',
        notes: 'Weekly shopping',
        profileId: 'default'
      };

      const duplicated = duplicateTransaction(originalTransaction);
      const today = new Date().toISOString().slice(0, 10);

      expect(duplicated.profileId).toBe('default');
      expect(duplicated.type).toBe('expense');
      expect(duplicated.amount).toBe(100);
      expect(duplicated.category).toBe('Food');
      expect(duplicated.subcategory).toBe('Groceries');
      expect(duplicated.paymentMethod).toBe('Credit Card');
      expect(duplicated.paymentApp).toBe('GPay');
      expect(duplicated.time).toBe('14:30');
      expect(duplicated.notes).toBe('Weekly shopping');
      expect(duplicated.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Math.abs(new Date(duplicated.date).getTime() - new Date(today).getTime())).toBeLessThanOrEqual(86400000);
    });

    it('handles missing optional fields', () => {
      const originalTransaction = {
        id: '123',
        type: 'income' as const,
        amount: 500,
        category: 'Salary',
        date: '2024-01-01',
        profileId: 'default'
      };

      const duplicated = duplicateTransaction(originalTransaction);

      expect(duplicated.profileId).toBe('default');
      expect(duplicated.type).toBe('income');
      expect(duplicated.amount).toBe(500);
      expect(duplicated.category).toBe('Salary');
      expect(duplicated.subcategory).toBe('');
      expect(duplicated.paymentMethod).toBe('');
      expect(duplicated.paymentApp).toBe('');
      expect(duplicated.time).toBe('');
      expect(duplicated.notes).toBe('');
      expect(duplicated.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});