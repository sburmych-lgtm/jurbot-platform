import { formatDateUk } from '@jurbot/shared';

const SLOT_GROUPS = [
  { label: 'Ранок', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  {
    label: 'День',
    slots: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
  },
] as const;

/** Check if a slot is in the past for today (client-side safety filter) */
function isSlotPastForToday(date: string, slot: string): boolean {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (date !== todayStr) return false;
  const slotDate = new Date(`${date}T${slot}:00.000Z`);
  return slotDate.getTime() <= now.getTime();
}

interface TimeSlotsProps {
  date: string;
  selected: string;
  onSelect: (time: string) => void;
  busySlots?: string[];
  availableSlots?: string[];
}

export function TimeSlots({
  date,
  selected,
  onSelect,
  busySlots = [],
  availableSlots,
}: TimeSlotsProps) {
  const availableSet = new Set(availableSlots ?? []);
  const busySet = new Set(busySlots);

  const renderSlots = (slots: readonly string[], label: string) => (
    <div>
      <p className="text-sm font-medium text-text-secondary mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const unavailableByConfig =
            availableSlots !== undefined && !availableSet.has(slot);
          const pastSlot = isSlotPastForToday(date, slot);
          const busy = busySet.has(slot) || unavailableByConfig || pastSlot;
          const active = selected === slot;

          return (
            <button
              key={slot}
              disabled={busy}
              onClick={() => onSelect(slot)}
              className={`py-3 rounded-[14px] text-sm font-medium transition ${
                active
                  ? 'bg-accent-teal text-bg-primary font-bold'
                  : busy
                    ? 'bg-bg-tertiary text-text-muted/40 line-through cursor-not-allowed'
                    : 'bg-bg-card border border-border-default text-text-secondary hover:border-accent-teal'
              }`}
            >
              {slot}
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
      {SLOT_GROUPS.map((group) => (
        <div key={group.label}>{renderSlots(group.slots, group.label)}</div>
      ))}
    </div>
  );
}
