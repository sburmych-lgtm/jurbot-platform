import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export function Card({ children, padding = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('glass-panel rounded-[14px] sm:rounded-[18px]', padding && 'p-3 sm:p-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
