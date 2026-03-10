import { cn } from '@/lib/utils';

type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-navy-100 text-navy-500',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colorClasses[color], className)}>
      {children}
    </span>
  );
}
