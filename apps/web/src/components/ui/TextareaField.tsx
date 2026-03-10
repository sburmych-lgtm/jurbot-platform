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
      <label className="text-sm font-medium text-navy-700 mb-1 block">{label}</label>
      <textarea
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 bg-white text-navy-900 placeholder-navy-300 focus:outline-none transition min-h-[100px] resize-none',
          error ? 'border-red-300 focus:border-red-400' : 'border-navy-100 focus:border-gold-400',
        )}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
