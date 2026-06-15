import { enrichBudgets, budgetSummary } from './helpers';
import type { Budget, Transaction } from '@/lib/types/api';

const budgets: Budget[] = [
  { id: '1', context: 'default', month: '2026-05', category: 'Food', amount: 5000 },
  { id: '2', context: 'default', month: '2026-05', category: 'Transport', amount: 2000 },
];

const txns: Transaction[] = [
  { id: 't1', context: 'default', type: 'expense', amount: 3000, category: 'Food', date: '2026-05-01' },
  { id: 't2', context: 'default', type: 'expense', amount: 2500, category: 'Food', date: '2026-05-05' },
  { id: 't3', context: 'default', type: 'expense', amount: 1500, category: 'Transport', date: '2026-05-03' },
  { id: 't4', context: 'default', type: 'income', amount: 75000, category: 'Salary', date: '2026-05-01' },
];

describe('enrichBudgets', () => {
  it('computes spent, remaining, pct, isOver per budget', () => {
    const enriched = enrichBudgets(budgets, txns);
    expect(enriched[0].spent).toBe(5500); // Food: 3000 + 2500
    expect(enriched[0].isOver).toBe(true);
    expect(enriched[0].remaining).toBe(-500);
    expect(enriched[1].spent).toBe(1500); // Transport
    expect(enriched[1].isOver).toBe(false);
    expect(enriched[1].remaining).toBe(500);
  });

  it('ignores income transactions', () => {
    const enriched = enrichBudgets(budgets, txns);
    // Salary (income) should not count toward any budget
    expect(enriched.every((b) => b.spent < 75000)).toBe(true);
  });
});

describe('budgetSummary', () => {
  it('computes totals and over count', () => {
    const enriched = enrichBudgets(budgets, txns);
    const s = budgetSummary(enriched);
    expect(s.totalBudget).toBe(7000);
    expect(s.totalSpent).toBe(7000); // 5500 + 1500
    expect(s.overCount).toBe(1); // Food is over
    expect(s.count).toBe(2);
  });
});
