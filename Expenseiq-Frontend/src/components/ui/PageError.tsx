import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface PageErrorProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export function PageError({
  message = 'Something went wrong',
  description,
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-10 h-10 text-expense mb-3" />
      <p className="text-sm font-medium text-text-2 mb-1">{message}</p>
      {description && (
        <p className="text-xs text-text-3 mb-4 max-w-sm">{description}</p>
      )}
      {!description && <div className="mb-4" />}
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
