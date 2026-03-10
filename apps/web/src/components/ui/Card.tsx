import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
}

export function Card({ children, padding = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl shadow-sm border border-navy-100', padding && 'p-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
