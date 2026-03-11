import { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-accent-teal text-bg-primary font-bold hover:bg-accent-teal/90 disabled:bg-bg-elevated disabled:text-text-muted',
  secondary: 'border border-border-light text-text-primary hover:bg-bg-hover disabled:opacity-50',
  danger: 'bg-accent-red text-white hover:bg-accent-red/90 disabled:opacity-50',
  ghost: 'text-text-secondary hover:bg-bg-hover disabled:opacity-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-[10px]',
  md: 'px-4 py-2.5 text-sm rounded-[14px]',
  lg: 'px-6 py-3 text-base rounded-[14px]',
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
