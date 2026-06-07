import type { ReactNode } from 'react';

export interface EmptyStateProps {
  emoji?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ emoji = '📭', message, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <span className="text-4xl mb-3" role="img" aria-hidden="true">
        {emoji}
      </span>
      <p className="text-sm text-text-3 max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
