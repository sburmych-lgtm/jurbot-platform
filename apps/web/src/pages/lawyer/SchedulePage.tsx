import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
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

const statusColors: Record<string, 'yellow' | 'green' | 'red' | 'gray'> = {
  PENDING: 'yellow', CONFIRMED: 'green', CANCELLED: 'red', COMPLETED: 'gray',
};

export function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: AppointmentItem[] }>('/v1/appointments');
        setAppointments(res.data?.items ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const dayAppts = appointments.filter(a =>
    a.date.startsWith(selectedDate)
  );

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Розклад</h1>
        <CalendarGrid selected={selectedDate} onSelect={setSelectedDate} />

        {dayAppts.length === 0 ? (
          <EmptyState icon={Calendar} title="Немає зустрічей" description="На цей день зустрічі не заплановані" />
        ) : (
          <div className="space-y-3">
            {dayAppts.map(a => (
              <Card key={a.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-text-primary">
                    {new Date(a.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge color={statusColors[a.status] ?? 'gray'}>{a.status}</Badge>
                </div>
                <p className="text-sm text-text-secondary">{a.client?.user?.name ?? 'Клієнт'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color="blue">{a.type}</Badge>
                  <span className="text-xs text-text-muted">{a.duration} хв</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
