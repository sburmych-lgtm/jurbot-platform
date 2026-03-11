import { Check } from 'lucide-react';
import { CASE_STAGES } from '@jurbot/shared';

interface CaseProgressProps {
  currentStatus: string;
}

export function CaseProgress({ currentStatus }: CaseProgressProps) {
  const currentIdx = CASE_STAGES.findIndex(s => s.id === currentStatus);

  return (
    <div className="space-y-2">
      {CASE_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={stage.id} className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                done ? 'bg-accent-green text-white'
                : current ? 'bg-accent-teal text-bg-primary'
                : 'bg-bg-elevated text-text-muted'
              }`}
            >
              {done ? <Check size={16} /> : i + 1}
            </div>
            <div className={`flex-1 text-sm ${current ? 'font-bold text-text-primary' : done ? 'text-accent-green' : 'text-text-muted'}`}>
              {stage.label}
            </div>
            {current && (
              <span className="text-xs bg-accent-teal/15 text-accent-teal px-2 py-0.5 rounded-full font-medium">
                Поточний
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
