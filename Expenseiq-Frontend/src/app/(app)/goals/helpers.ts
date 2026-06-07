import type { Goal, Transaction } from '@/lib/types/api';

export interface GoalWithProgress extends Goal {
  saved: number;
  pct: number;
  isAchieved: boolean;
}

export function enrichGoal(goal: Goal, transactions: Transaction[]): GoalWithProgress {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const saved = Math.max(income - expense, 0);
  const pct = goal.amount > 0 ? Math.min((saved / goal.amount) * 100, 100) : 0;
  return { ...goal, saved, pct, isAchieved: saved >= goal.amount };
}

export function enrichGoals(
  goals: Goal[],
  transactionsByMonth: Record<string, Transaction[]>
): GoalWithProgress[] {
  return goals.map((g) => enrichGoal(g, transactionsByMonth[g.month] || []));
}
