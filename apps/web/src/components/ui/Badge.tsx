import { cn } from '@/lib/utils';

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple' | 'teal';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-accent-green/15 text-accent-green',
  yellow: 'bg-accent-amber/15 text-accent-amber',
  red: 'bg-accent-red/15 text-accent-red',
  blue: 'bg-accent-blue/15 text-accent-blue',
  gray: 'bg-bg-elevated text-text-muted',
  orange: 'bg-accent-amber/15 text-accent-amber',
  purple: 'bg-purple-500/15 text-purple-400',
  teal: 'bg-accent-teal/15 text-accent-teal',
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', colorClasses[color], className)}>
      {children}
    </span>
  );
}
