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
          {label && <span className="text-sm font-medium text-navy-600">{label}</span>}
          {showPercent && <span className="text-sm font-bold text-navy-800">{clamped}%</span>}
        </div>
      )}
      <div className="w-full bg-navy-100 rounded-full h-2">
        <div
          className={cn('bg-gold-500 h-2 rounded-full transition-all duration-500')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
