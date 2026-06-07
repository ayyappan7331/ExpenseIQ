import { SkeletonCard, Skeleton } from '@/components/ui';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
          <Skeleton height="14px" width="30%" rounded="md" />
          <Skeleton height="220px" width="100%" rounded="xl" />
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
          <Skeleton height="14px" width="30%" rounded="md" />
          <Skeleton height="220px" width="100%" rounded="xl" />
        </div>
      </div>
      {/* Bottom widgets skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
