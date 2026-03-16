import { type InputHTMLAttributes } from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  icon?: LucideIcon;
  label: string;
  error?: string;
  onChange?: (value: string) => void;
}

export function InputField({ icon: Icon, label, error, onChange, className, ...props }: InputFieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} />}
        {label}
      </label>
      <input
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-base text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-teal transition',
          error && 'border-accent-red focus:border-accent-red',
        )}
        {...props}
      />
      {error && (
        <p className="text-accent-red text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
