import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="glass-panel rounded-[14px] p-2.5 sm:rounded-[18px] sm:p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/6 text-accent-teal sm:mb-3 sm:h-10 sm:w-10 sm:rounded-[12px]">
        <Icon size={16} />
      </div>
      <p className="font-display text-2xl leading-none text-text-primary sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-text-muted sm:mt-1 sm:text-xs">{label}</p>
    </div>
  );
}
