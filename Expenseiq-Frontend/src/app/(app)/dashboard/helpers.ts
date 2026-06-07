// Dashboard selectors — pure functions that derive display values from
// raw transaction/goal/subscription data. Matches legacy FINANCE HELPERS
// section (line 2090-2115) and RENDER STATS (line 2400+).

import type { Transaction, Goal, Subscription, Budget } from '@/lib/types/api';

export interface DashboardStats {
  income: number;
  expense: number;
  balance: number;
  txnCount: number;
  avgExpense: number;
  savingsRate: number;
}

export function computeStats(transactions: Transaction[]): DashboardStats {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') {
      // Exclude transfer_in — money moving between accounts is not real income
      // and must not inflate the savings rate or balance figures.
      if (t.subtype === 'transfer_in') continue;
      income += t.amount;
    } else {
      // Exclude transfer_out — outbound transfers are not real expenses
      if (t.subtype === 'transfer_out') continue;
      expense += t.amount;
    }
  }
  const balance = income - expense;
  const expenseTxns = transactions.filter(
    (t) => t.type === 'expense' && t.subtype !== 'transfer_out'
  );
  const avgExpense = expenseTxns.length > 0 ? expense / expenseTxns.length : 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  // txnCount excludes transfers so it matches what the user considers "real" activity
  const txnCount = transactions.filter(
    (t) => t.subtype !== 'transfer_in' && t.subtype !== 'transfer_out'
  ).length;
  return { income, expense, balance, txnCount, avgExpense, savingsRate };
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export function computeCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === 'expense' && t.subtype !== 'transfer_out') {
      // Use the actual category; blank categories are grouped as 'Uncategorised'
      // to match the visual treatment on the Transactions screen.
      const cat = t.category || 'Uncategorised';
      map.set(cat, (map.get(cat) || 0) + t.amount);
    }
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthTrend {
  month: string;
  income: number;
  expense: number;
}

export function computeMonthTrends(
  transactionsByMonth: Record<string, Transaction[]>,
  months: string[]
): MonthTrend[] {
  return months.map((month) => {
    const txns = transactionsByMonth[month] || [];
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.type === 'income' && t.subtype !== 'transfer_in') income += t.amount;
      else if (t.type === 'expense' && t.subtype !== 'transfer_out') expense += t.amount;
    }
    return { month, income, expense };
  });
}

export function getGoalForMonth(goals: Goal[], month: string): Goal | undefined {
  return goals.find((g) => g.month === month);
}

export function computeMonthlySubscriptionCost(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.active !== false)
    .reduce((sum, s) => {
      if (s.cycle === 'yearly') return sum + s.amount / 12;
      if (s.cycle === 'quarterly') return sum + s.amount / 3;
      return sum + s.amount;
    }, 0);
}

export function computeBudgetUsage(
  budgets: Budget[],
  transactions: Transaction[]
): { total: number; used: number; categories: number } {
  const total = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetCats = new Set(budgets.map((b) => b.category));
  const used = transactions
    .filter((t) => t.type === 'expense' && t.subtype !== 'transfer_out' && budgetCats.has(t.category || ''))
    .reduce((s, t) => s + t.amount, 0);
  return { total, used, categories: budgets.length };
}

export interface Insight {
  emoji: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

export function generateInsights(stats: DashboardStats, prevStats?: DashboardStats): Insight[] {
  const insights: Insight[] = [];

  if (stats.savingsRate >= 30) {
    insights.push({ emoji: '🎯', text: `Great savings rate: ${stats.savingsRate.toFixed(0)}%`, type: 'positive' });
  } else if (stats.savingsRate < 10 && stats.income > 0) {
    insights.push({ emoji: '⚠️', text: `Low savings rate: ${stats.savingsRate.toFixed(0)}%`, type: 'negative' });
  }

  if (prevStats && prevStats.expense > 0) {
    const change = ((stats.expense - prevStats.expense) / prevStats.expense) * 100;
    if (change > 20) {
      insights.push({ emoji: '📈', text: `Spending up ${change.toFixed(0)}% vs last month`, type: 'negative' });
    } else if (change < -10) {
      insights.push({ emoji: '📉', text: `Spending down ${Math.abs(change).toFixed(0)}% vs last month`, type: 'positive' });
    }
  }

  if (stats.txnCount === 0) {
    insights.push({ emoji: '📝', text: 'No transactions this month yet', type: 'neutral' });
  }

  return insights;
}
