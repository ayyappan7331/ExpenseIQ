import type { Budget, Transaction } from '@/lib/types/api';

export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  pct: number;
  isOver: boolean;
}

export function enrichBudgets(budgets: Budget[], transactions: Transaction[]): BudgetWithSpent[] {
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === 'expense' && t.subtype !== 'transfer_out' && t.category) {
      spentByCategory.set(t.category, (spentByCategory.get(t.category) || 0) + t.amount);
    }
  }
  return budgets.map((b) => {
    const spent = spentByCategory.get(b.category) || 0;
    const remaining = b.amount - spent;
    const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
    return { ...b, spent, remaining, pct, isOver: spent > b.amount };
  });
}

export function budgetSummary(enriched: BudgetWithSpent[]) {
  const totalBudget = enriched.reduce((s, b) => s + b.amount, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spent, 0);
  const overCount = enriched.filter((b) => b.isOver).length;
  return { totalBudget, totalSpent, overCount, count: enriched.length };
}
