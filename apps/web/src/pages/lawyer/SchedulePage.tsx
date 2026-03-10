import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

interface AppointmentItem {
  id: string;
  refNumber: string;
  type: string;
  status: string;
  date: string;
  duration: number;
  client?: { user: { name: string } };
}

const statusColors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  PENDING: 'yellow', CONFIRMED: 'green', CANCELLED: 'red', COMPLETED: 'gray',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Очікує', CONFIRMED: 'Підтверджено', CANCELLED: 'Скасовано', COMPLETED: 'Завершено',
};

const typeLabels: Record<string, string> = {
  FREE: 'Безкоштовна', CONSULT: 'Консультація', ANALYSIS: 'Аналіз',
};

export function SchedulePage() {
  const [selDate, setSelDate] = useState(fmtDate(new Date()));
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AppointmentItem[]>('/v1/appointments');
        setAppointments(res.data ?? []);
      } catch { setAppointments([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const dayAppointments = appointments.filter(a => a.date.startsWith(selDate));

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Розклад</h1>

        <CalendarGrid selected={selDate} onSelect={setSelDate} />

        <h2 className="text-lg font-semibold text-navy-800">
          Записи на {new Date(selDate).toLocaleDateString('uk-UA')}
        </h2>

        {loading ? (
          <Spinner />
        ) : dayAppointments.length === 0 ? (
          <EmptyState icon={Calendar} title="Записів немає" description="На обрану дату немає запланованих зустрічей" />
        ) : (
          <div className="space-y-3">
            {dayAppointments.map(a => (
              <Card key={a.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-navy-800 text-sm">
                    {typeLabels[a.type] ?? a.type}
                  </span>
                  <Badge color={statusColors[a.status] ?? 'gray'}>
                    {statusLabels[a.status] ?? a.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-navy-500">
                  <span>{new Date(a.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{a.duration} хв</span>
                  {a.client && <span>{a.client.user.name}</span>}
                </div>
                <p className="text-xs text-navy-400 font-mono mt-1">{a.refNumber}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
