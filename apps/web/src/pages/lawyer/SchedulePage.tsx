import { useEffect, useMemo, useState } from 'react';
import { Calendar, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { buildHighlightedBookingDates } from '@/lib/appointments';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface AppointmentItem {
  id: string;
  refNumber: string;
  type: string;
  status: string;
  date: string;
  duration: number;
  client?: { user: { name: string } };
}

interface AvailabilityPayload {
  date: string;
  lawyerId: string;
  configuredSlots: string[];
  bookedSlots: string[];
  availableSlots: string[];
}

const SLOT_GROUPS = [
  { label: 'Ранок', slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'] },
  {
    label: 'День',
    slots: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
  },
] as const;

const statusColors: Record<string, 'yellow' | 'green' | 'red' | 'gray'> = {
  PENDING: 'yellow',
  CONFIRMED: 'green',
  CANCELLED: 'red',
  COMPLETED: 'gray',
};

export function SchedulePage() {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [configuredSlots, setConfiguredSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AppointmentItem[]>('/v1/appointments');
        if (!cancelled) {
          setAppointments(res.data ?? []);
        }
      } catch {
        if (!cancelled) {
          showToast('Не вдалося завантажити записи');
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAvailabilityLoading(true);
      try {
        const res = await api.get<AvailabilityPayload>(
          `/v1/appointments/availability?date=${encodeURIComponent(selectedDate)}`,
        );
        if (!cancelled) {
          setConfiguredSlots(res.data?.configuredSlots ?? []);
          setBookedSlots(res.data?.bookedSlots ?? []);
        }
      } catch {
        if (!cancelled) {
          setConfiguredSlots([]);
          setBookedSlots([]);
          showToast('Не вдалося завантажити доступні години');
        }
      }
      if (!cancelled) {
        setAvailabilityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, showToast]);

  const dayAppointments = useMemo(
    () => appointments.filter((item) => item.date.startsWith(selectedDate)),
    [appointments, selectedDate],
  );

  const highlightedDates = useMemo(
    () => buildHighlightedBookingDates(appointments),
    [appointments],
  );

  const configuredSet = useMemo(() => new Set(configuredSlots), [configuredSlots]);
  const bookedSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);

  const toggleSlot = (slot: string) => {
    if (bookedSet.has(slot)) {
      return;
    }

    setConfiguredSlots((prev) =>
      prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot].sort(),
    );
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const res = await api.put<AvailabilityPayload>('/v1/appointments/availability', {
        date: selectedDate,
        slots: configuredSlots,
      });
      setConfiguredSlots(res.data?.configuredSlots ?? []);
      setBookedSlots(res.data?.bookedSlots ?? []);
      showToast('Розклад збережено');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося зберегти розклад';
      showToast(message);
    }
    setSaving(false);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Розклад</h1>

        <CalendarGrid
          selected={selectedDate}
          onSelect={setSelectedDate}
          highlightedDates={highlightedDates}
        />

        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Вільні години на {selectedDate}</p>
                <p className="text-xs text-text-muted">
                  Натисніть на час, щоб увімкнути або вимкнути доступність для клієнта.
                </p>
              </div>
              <Button size="sm" onClick={saveAvailability} loading={saving}>
                <Save size={16} />
                Зберегти
              </Button>
            </div>

            {availabilityLoading ? (
              <p className="text-sm text-text-muted">Оновлюємо доступні години...</p>
            ) : (
              SLOT_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-sm font-medium text-text-secondary mb-2">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.slots.map((slot) => {
                      const isBooked = bookedSet.has(slot);
                      const isEnabled = configuredSet.has(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => toggleSlot(slot)}
                          className={`py-3 rounded-[14px] text-sm font-medium transition ${
                            isBooked
                              ? 'bg-bg-tertiary text-text-muted/40 line-through cursor-not-allowed'
                              : isEnabled
                                ? 'bg-accent-teal text-bg-primary'
                                : 'bg-bg-card border border-border-default text-text-secondary hover:border-accent-teal'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {dayAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Немає зустрічей"
            description="На цей день зустрічі не заплановані"
          />
        ) : (
          <div className="space-y-3">
            {dayAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-text-primary">
                    {new Date(appointment.date).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge color={statusColors[appointment.status] ?? 'gray'}>
                    {appointment.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  {appointment.client?.user?.name ?? 'Клієнт'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color="blue">{appointment.type}</Badge>
                  <span className="text-xs text-text-muted">{appointment.duration} хв</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
