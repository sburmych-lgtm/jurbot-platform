import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0..100
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export function ProgressBar({ value, label, showPercent = true, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm font-medium text-text-secondary">{label}</span>}
          {showPercent && <span className="text-sm font-bold text-text-primary">{clamped}%</span>}
        </div>
      )}
      <div className="w-full bg-bg-elevated rounded-full h-2">
        <div
          className={cn('bg-accent-teal h-2 rounded-full transition-all duration-500')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
