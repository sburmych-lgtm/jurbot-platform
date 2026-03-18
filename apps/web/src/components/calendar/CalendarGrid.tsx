import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS_UK } from '@jurbot/shared';
import { fmtDate } from '@/lib/utils';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

interface CalendarGridProps {
  selected: string;
  onSelect: (dateStr: string) => void;
  highlightedDates?: string[];
}

export function CalendarGrid({ selected, onSelect, highlightedDates = [] }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const highlightedSet = new Set(highlightedDates);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-bg-card rounded-[14px] border border-border-default p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded-[10px] hover:bg-bg-hover">
          <ChevronLeft size={20} className="text-text-secondary" />
        </button>
        <span className="font-semibold text-text-primary">{MONTHS_UK[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded-[10px] hover:bg-bg-hover">
          <ChevronRight size={20} className="text-text-secondary" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-xs font-medium text-text-muted py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          const dateStr = fmtDate(date);
          const isPast = date < today;
          const isToday = fmtDate(date) === fmtDate(today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isSel = selected === dateStr;
          const hasAppointments = highlightedSet.has(dateStr);

          return (
            <button
              key={i}
              disabled={isPast || isWeekend}
              onClick={() => onSelect(dateStr)}
              className={`relative w-10 h-10 rounded-[10px] text-sm font-medium mx-auto flex items-center justify-center transition ${
                isSel ? 'bg-accent-teal text-bg-primary font-bold'
                : isPast || isWeekend ? 'text-text-muted/30 cursor-not-allowed'
                : hasAppointments ? 'border border-accent-teal/60 text-text-primary bg-accent-teal/10 hover:border-accent-teal'
                : isToday ? 'bg-bg-elevated text-text-primary font-bold'
                : 'text-text-secondary hover:bg-bg-hover'
              }`}
              aria-label={hasAppointments ? `${day}, є записи` : String(day)}
            >
              {day}
              {hasAppointments && !isSel ? (
                <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent-teal" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
