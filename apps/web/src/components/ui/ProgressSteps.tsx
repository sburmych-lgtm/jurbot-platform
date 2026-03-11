interface ProgressStepsProps {
  total: number;
  current: number;
}

export function ProgressSteps({ total, current }: ProgressStepsProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < current ? 'bg-accent-teal' : 'bg-bg-elevated'
          }`}
        />
      ))}
    </div>
  );
}
