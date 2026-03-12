import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="glass-panel rounded-[18px] p-3">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/6 text-accent-teal">
        <Icon size={18} />
      </div>
      <p className="font-display text-3xl leading-none text-text-primary">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">{label}</p>
    </div>
  );
}
