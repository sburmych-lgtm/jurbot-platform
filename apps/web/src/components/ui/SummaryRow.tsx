interface SummaryRowProps {
  label: string;
  value: string | number | undefined;
}

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium text-right max-w-[60%]">{value ?? '—'}</span>
    </div>
  );
}
