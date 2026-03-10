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
      <label className="text-sm font-medium text-navy-700 flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} />}
        {label}
      </label>
      <input
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 bg-white text-navy-900 placeholder-navy-300 focus:outline-none transition',
          error ? 'border-red-300 focus:border-red-400' : 'border-navy-100 focus:border-gold-400',
        )}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
