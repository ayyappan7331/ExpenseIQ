'use client';

import { SectionCard, EmptyState, Badge } from '@/components/ui';
import { formatCurrency } from '@/components/charts';
import { dateLabel } from '@/lib/utils/dates';
import type { Transaction } from '@/lib/types/api';

interface Props {
  transactions: Transaction[];
}

export function RecentWidget({ transactions }: Props) {
  // Sort by date DESC, then time DESC (matching the Transactions screen default sort)
  // so the most recently-added transaction always appears first.
  const recent = [...transactions]
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.time || '00:00').localeCompare(a.time || '00:00');
    })
    .slice(0, 5);

  return (
    <SectionCard title="Recent Transactions">
      {recent.length === 0 ? (
        <EmptyState emoji="📝" message="No transactions this month" />
      ) : (
        <div className="space-y-2.5">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text truncate">
                  {t.category || t.source || 'Transaction'}
                </p>
                <p className="text-[11px] text-text-3">{dateLabel(t.date)}</p>
              </div>
              <Badge variant={t.type === 'income' ? 'income' : 'expense'}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
