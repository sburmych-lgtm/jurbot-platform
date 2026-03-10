import { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 disabled:bg-navy-200 disabled:text-navy-400',
  secondary: 'border-2 border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-50',
  ghost: 'text-navy-600 hover:bg-navy-50 disabled:opacity-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-semibold transition-all flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        loading && 'cursor-wait',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
