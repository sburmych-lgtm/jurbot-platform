import { useEffect, useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { APPOINTMENT_TYPES } from '@jurbot/shared';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { TimeSlots } from '@/components/calendar/TimeSlots';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { useToast } from '@/components/ui/Toast';

interface AvailabilityPayload {
  date: string;
  lawyerId: string;
  configuredSlots: string[];
  bookedSlots: string[];
  availableSlots: string[];
}

interface CreatedAppointment {
  refNumber: string;
}

interface AppointmentItem {
  id: string;
  refNumber: string;
  date: string;
  status: string;
}


function toMinutes(slot: string): number {
  const [hoursRaw, minutesRaw] = slot.split(':');
  const hours = Number(hoursRaw ?? NaN);
  const minutes = Number(minutesRaw ?? NaN);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return -1;
  }
  return hours * 60 + minutes;
}

function filterPastSlots(date: string, slots: string[]): string[] {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date !== today) {
    return slots;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => toMinutes(slot) > nowMinutes);
}

export function BookingPage() {
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [type, setType] = useState('FREE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingLawyerId, setBookingLawyerId] = useState('');
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get<AppointmentItem[]>('/v1/appointments');
      setAppointments((res.data ?? []).filter((item) => item.status !== 'CANCELLED'));
    } catch (error) {
      console.error('[BookingPage] Failed to fetch appointments', error);
    }
  };

  useEffect(() => {
    void fetchAppointments();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setBookingLawyerId('');
      return;
    }

    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get<AvailabilityPayload>(
          `/v1/appointments/availability?date=${encodeURIComponent(selectedDate)}`,
        );
        if (cancelled) return;

        setAvailableSlots(filterPastSlots(selectedDate, res.data?.availableSlots ?? []));
        setBookingLawyerId(res.data?.lawyerId ?? '');
      } catch {
        if (!cancelled) {
          setAvailableSlots([]);
          setBookingLawyerId('');
          showToast('Не вдалося завантажити вільні слоти');
        }
      }
      if (!cancelled) {
        setSlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, showToast]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !bookingLawyerId) {
      showToast('Оберіть дату та час');
      return;
    }

    setLoading(true);
    try {
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate);
      const isValidTime = /^([01]\d|2[0-3]):(00|30)$/.test(selectedTime);
      if (!isValidDate || !isValidTime) {
        showToast('Некоректні дата або час. Перевірте вибраний слот.');
        setLoading(false);
        return;
      }

      const dateTime = `${selectedDate}T${selectedTime}:00.000Z`;
      const res = await api.post<CreatedAppointment>('/v1/appointments', {
        date: dateTime,
        type,
        lawyerId: bookingLawyerId,
        notes: notes || undefined,
      });

      setRefNumber(res.data?.refNumber ?? '');
      setStep(4);
      await fetchAppointments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося створити запис';
      showToast(message);
    }
    setLoading(false);
  };

  const restartBooking = () => {
    setStep(1);
    setSelectedDate('');
    setSelectedTime('');
    setType('FREE');
    setNotes('');
    setRefNumber('');
    setAvailableSlots([]);
    setBookingLawyerId('');
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      await api.delete(`/v1/appointments/${appointmentId}`);
      showToast('Запис скасовано');
      await fetchAppointments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося скасувати запис';
      showToast(message);
      console.error('[BookingPage] Failed to cancel appointment', err);
    }
  };

  if (step === 4) {
    return (
      <PageContainer>
        <div className="space-y-6 text-center py-8">
          <div className="w-16 h-16 bg-accent-green/15 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-accent-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Запис підтверджено!</h1>
            <p className="text-text-muted text-sm mt-1">
              Ваш номер: <span className="font-mono text-accent-teal">{refNumber}</span>
            </p>
          </div>
          <Card>
            <div className="space-y-2">
              <SummaryRow label="Дата" value={selectedDate} />
              <SummaryRow label="Час" value={selectedTime} />
              <SummaryRow
                label="Тип"
                value={APPOINTMENT_TYPES.find((item) => item.id === type)?.label ?? type}
              />
            </div>
          </Card>
          <Button size="lg" className="w-full" onClick={restartBooking}>
            Новий запис
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-[10px] hover:bg-bg-hover"
            >
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>
          )}
          <h1 className="text-xl font-bold text-text-primary">Запис на консультацію</h1>
        </div>

        <ProgressSteps total={3} current={step} />

        {step === 1 && (
          <CalendarGrid
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime('');
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            {slotsLoading ? (
              <Card>Завантажуємо вільні години...</Card>
            ) : availableSlots.length === 0 ? (
              <Card>
                <p className="text-sm text-text-secondary">
                  На обрану дату немає доступних годин. Оберіть інший день.
                </p>
              </Card>
            ) : (
              <TimeSlots
                date={selectedDate}
                selected={selectedTime}
                availableSlots={availableSlots}
                onSelect={(time) => {
                  setSelectedTime(time);
                  setStep(3);
                }}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <div className="space-y-2 mb-4">
                <SummaryRow label="Дата" value={selectedDate} />
                <SummaryRow label="Час" value={selectedTime} />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Тип зустрічі
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {APPOINTMENT_TYPES.map((appointmentType) => (
                      <button
                        key={appointmentType.id}
                        onClick={() => setType(appointmentType.id)}
                        className={`px-3 py-2 rounded-[10px] text-sm font-medium transition ${
                          type === appointmentType.id
                            ? 'bg-accent-teal text-bg-primary'
                            : 'bg-bg-tertiary border border-border-default text-text-secondary'
                        }`}
                      >
                        {appointmentType.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1 block">
                    Нотатки
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Опишіть ваше питання..."
                    className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-sm resize-none min-h-[80px]"
                  />
                </div>
              </div>
            </Card>

            <Button size="lg" className="w-full" loading={loading} onClick={handleBook}>
              Підтвердити запис
            </Button>
          </div>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Мої найближчі записи</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-text-secondary">Наразі немає активних записів.</p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-[12px] border border-border-default p-3">
                  <p className="text-sm text-text-primary font-medium">#{item.refNumber}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(item.date).toLocaleString('uk-UA')}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => { void cancelAppointment(item.id); }}
                  >
                    Скасувати
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
