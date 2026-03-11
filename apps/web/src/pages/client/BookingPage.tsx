import { useState } from 'react';
import { ChevronLeft, Calendar, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { APPOINTMENT_TYPES } from '@jurbot/shared';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { TimeSlots } from '@/components/calendar/TimeSlots';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { ProgressSteps } from '@/components/ui/ProgressSteps';

export function BookingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [type, setType] = useState('FREE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  const handleBook = async () => {
    setLoading(true);
    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;
      const res = await api.post<{ refNumber: string }>('/v1/appointments', {
        date: dateTime,
        type,
        notes: notes || undefined,
      });
      setRefNumber(res.data?.refNumber ?? '');
      setStep(4);
    } catch {}
    setLoading(false);
  };

  if (step === 4) {
    return (
      <PageContainer>
        <div className="space-y-6 text-center py-8">
          <div className="w-16 h-16 bg-accent-green/15 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-accent-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Записано!</h1>
            <p className="text-text-muted text-sm mt-1">Ваш номер: <span className="font-mono text-accent-teal">{refNumber}</span></p>
          </div>
          <Card>
            <div className="space-y-2">
              <SummaryRow label="Дата" value={selectedDate} />
              <SummaryRow label="Час" value={selectedTime} />
              <SummaryRow label="Тип" value={APPOINTMENT_TYPES.find(t => t.id === type)?.label ?? type} />
            </div>
          </Card>
          <Button size="lg" className="w-full" onClick={() => { setStep(1); setSelectedDate(''); setSelectedTime(''); }}>
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
            <button onClick={() => setStep(step - 1)} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ChevronLeft size={20} className="text-text-secondary" />
            </button>
          )}
          <h1 className="text-xl font-bold text-text-primary">Запис на консультацію</h1>
        </div>

        <ProgressSteps total={3} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <CalendarGrid selected={selectedDate} onSelect={d => { setSelectedDate(d); setStep(2); }} />
          </div>
        )}

        {step === 2 && (
          <TimeSlots date={selectedDate} selected={selectedTime} onSelect={t => { setSelectedTime(t); setStep(3); }} />
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
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Тип зустрічі</label>
                  <div className="flex flex-wrap gap-2">
                    {APPOINTMENT_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`px-3 py-2 rounded-[10px] text-sm font-medium transition ${
                          type === t.id
                            ? 'bg-accent-teal text-bg-primary'
                            : 'bg-bg-tertiary border border-border-default text-text-secondary'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1 block">Нотатки</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.id)}
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
      </div>
    </PageContainer>
  );
}
