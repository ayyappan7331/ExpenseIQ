'use client';

import { SectionCard, EmptyState } from '@/components/ui';
import type { Insight } from '../helpers';

interface Props {
  insights: Insight[];
}

const typeColors = {
  positive: 'text-income',
  negative: 'text-expense',
  neutral: 'text-text-2',
};

export function InsightsWidget({ insights }: Props) {
  return (
    <SectionCard title="Insights">
      {insights.length === 0 ? (
        <EmptyState emoji="💡" message="Add more transactions to see insights" />
      ) : (
        <div className="space-y-2.5">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1">
              <span className="text-base shrink-0">{ins.emoji}</span>
              <p className={`text-sm ${typeColors[ins.type]}`}>{ins.text}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
