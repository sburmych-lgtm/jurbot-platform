import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS_UK } from '@jurbot/shared';
import { fmtDate } from '@/lib/utils';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

interface CalendarGridProps {
  selected: string;
  onSelect: (dateStr: string) => void;
}

export function CalendarGrid({ selected, onSelect }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-xl border border-navy-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-navy-50">
          <ChevronLeft size={20} className="text-navy-600" />
        </button>
        <span className="font-semibold text-navy-800">{MONTHS_UK[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-navy-50">
          <ChevronRight size={20} className="text-navy-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-xs font-medium text-navy-400 py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          const dateStr = fmtDate(date);
          const isPast = date < today;
          const isToday = fmtDate(date) === fmtDate(today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isSel = selected === dateStr;

          return (
            <button
              key={i}
              disabled={isPast || isWeekend}
              onClick={() => onSelect(dateStr)}
              className={`w-10 h-10 rounded-lg text-sm font-medium mx-auto flex items-center justify-center transition ${
                isSel ? 'bg-gold-500 text-navy-900 font-bold shadow-md'
                : isPast || isWeekend ? 'text-navy-200 cursor-not-allowed'
                : isToday ? 'bg-navy-100 text-navy-900 font-bold'
                : 'text-navy-700 hover:bg-navy-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
