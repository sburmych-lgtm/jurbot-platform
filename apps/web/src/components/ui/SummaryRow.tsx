interface SummaryRowProps {
  label: string;
  value: string | number | undefined;
}

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-navy-400">{label}</span>
      <span className="text-navy-800 font-medium text-right max-w-[60%]">{value ?? '—'}</span>
    </div>
  );
}
