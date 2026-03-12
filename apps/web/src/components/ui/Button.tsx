import { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-[linear-gradient(135deg,#00c8b4_0%,#5b7cfa_100%)] text-bg-primary font-bold shadow-[0_18px_40px_rgba(0,200,180,0.18)] hover:brightness-110 disabled:bg-bg-elevated disabled:text-text-muted disabled:shadow-none',
  secondary: 'border border-white/10 bg-white/5 text-text-primary backdrop-blur-md hover:border-white/20 hover:bg-white/8 disabled:opacity-50',
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
        'flex items-center justify-center gap-2 font-semibold transition-all',
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
