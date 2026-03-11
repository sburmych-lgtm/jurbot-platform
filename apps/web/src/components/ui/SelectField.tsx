import { type SelectHTMLAttributes } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  icon?: LucideIcon;
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function SelectField({ icon: Icon, label, error, options, placeholder, onChange, className, value, ...props }: SelectFieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} />}
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-accent-teal transition',
          error && 'border-accent-red focus:border-accent-red',
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-accent-red text-xs mt-1">{error}</p>}
    </div>
  );
}
