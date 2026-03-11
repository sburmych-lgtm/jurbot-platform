import { type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
}

export function TextareaField({ label, error, onChange, className, ...props }: TextareaFieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-text-secondary mb-1 block">{label}</label>
      <textarea
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal transition min-h-[100px] resize-none',
          error && 'border-accent-red focus:border-accent-red',
        )}
        {...props}
      />
      {error && <p className="text-accent-red text-xs mt-1">{error}</p>}
    </div>
  );
}
