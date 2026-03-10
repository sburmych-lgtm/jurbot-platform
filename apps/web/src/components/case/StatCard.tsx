import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-navy-100 p-3 text-center">
      <Icon size={20} className="mx-auto text-navy-400 mb-1" />
      <p className="text-xl font-bold text-navy-900">{value}</p>
      <p className="text-xs text-navy-400">{label}</p>
    </div>
  );
}
