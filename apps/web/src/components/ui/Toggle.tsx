import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label className={cn('flex items-center justify-between cursor-pointer', className)}>
      {label && <span className="text-sm text-navy-600">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'w-11 h-6 rounded-full transition relative',
          checked ? 'bg-gold-500' : 'bg-navy-200',
        )}
      >
        <div
          className={cn(
            'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  );
}
