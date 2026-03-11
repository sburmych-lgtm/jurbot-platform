import { formatDateUk } from '@jurbot/shared';

const MORNING = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const AFTERNOON = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

interface TimeSlotsProps {
  date: string;
  selected: string;
  onSelect: (time: string) => void;
  busySlots?: string[];
}

export function TimeSlots({ date, selected, onSelect, busySlots = [] }: TimeSlotsProps) {
  const renderSlots = (slots: string[], label: string) => (
    <div>
      <p className="text-sm font-medium text-text-secondary mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {slots.map(t => {
          const busy = busySlots.includes(t);
          const sel = selected === t;
          return (
            <button
              key={t}
              disabled={busy}
              onClick={() => onSelect(t)}
              className={`py-3 rounded-[14px] text-sm font-medium transition ${
                sel ? 'bg-accent-teal text-bg-primary font-bold'
                : busy ? 'bg-bg-tertiary text-text-muted/40 line-through cursor-not-allowed'
                : 'bg-bg-card border border-border-default text-text-secondary hover:border-accent-teal'
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Оберіть час</h2>
        <span className="text-sm text-text-muted">{formatDateUk(date)}</span>
      </div>
      {renderSlots(MORNING, 'Ранок')}
      {renderSlots(AFTERNOON, 'День')}
    </div>
  );
}
