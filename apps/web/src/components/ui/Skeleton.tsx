import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-bg-elevated rounded animate-pulse',
              i === lines - 1 ? 'w-3/4' : 'w-full',
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('bg-bg-elevated rounded animate-pulse', className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card rounded-[14px] border border-border-default p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-up">
      <Skeleton className="h-8 w-1/2 mb-6" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
