export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'xl' | '2xl';
}

const roundedMap = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({ className = '', width, height, rounded = '2xl' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-bg-3 ${roundedMap[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-card-border rounded-2xl p-5 space-y-3 ${className}`}>
      <Skeleton height="12px" width="40%" rounded="md" />
      <Skeleton height="24px" width="60%" rounded="md" />
      <Skeleton height="8px" width="80%" rounded="full" />
    </div>
  );
}
