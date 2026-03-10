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
      <p className="text-sm font-medium text-navy-600 mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {slots.map(t => {
          const busy = busySlots.includes(t);
          const sel = selected === t;
          return (
            <button
              key={t}
              disabled={busy}
              onClick={() => onSelect(t)}
              className={`py-3 rounded-xl text-sm font-medium transition ${
                sel ? 'bg-gold-500 text-navy-900 shadow-md'
                : busy ? 'bg-navy-100 text-navy-300 line-through cursor-not-allowed'
                : 'bg-white border border-navy-100 text-navy-700 hover:border-gold-400'
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
        <h2 className="text-xl font-bold text-navy-900">Оберіть час</h2>
        <span className="text-sm text-navy-500">{formatDateUk(date)}</span>
      </div>
      {renderSlots(MORNING, 'Ранок')}
      {renderSlots(AFTERNOON, 'День')}
    </div>
  );
}
