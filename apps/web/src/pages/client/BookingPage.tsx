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
            <h1 className="text-xl font-bold text-text-primary">\u0417\u0430\u043f\u0438\u0441\u0430\u043d\u043e!</h1>
            <p className="text-text-muted text-sm mt-1">\u0412\u0430\u0448 \u043d\u043e\u043c\u0435\u0440: <span className="font-mono text-accent-teal">{refNumber}</span></p>
          </div>
          <Card>
            <div className="space-y-2">
              <SummaryRow label="\u0414\u0430\u0442\u0430" value={selectedDate} />
              <SummaryRow label="\u0427\u0430\u0441" value={selectedTime} />
              <SummaryRow label="\u0422\u0438\u043f" value={APPOINTMENT_TYPES.find(t => t.id === type)?.label ?? type} />
            </div>
          </Card>
          <Button size="lg" className="w-full" onClick={() => { setStep(1); setSelectedDate(''); setSelectedTime(''); }}>
            \u041d\u043e\u0432\u0438\u0439 \u0437\u0430\u043f\u0438\u0441
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
          <h1 className="text-xl font-bold text-text-primary">\u0417\u0430\u043f\u0438\u0441 \u043d\u0430 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0456\u044e</h1>
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
                <SummaryRow label="\u0414\u0430\u0442\u0430" value={selectedDate} />
                <SummaryRow label="\u0427\u0430\u0441" value={selectedTime} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">\u0422\u0438\u043f \u0437\u0443\u0441\u0442\u0440\u0456\u0447\u0456</label>
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
                  <label className="text-sm font-medium text-text-secondary mb-1 block">\u041d\u043e\u0442\u0430\u0442\u043a\u0438</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.id)}
                    placeholder="\u041e\u043f\u0438\u0448\u0456\u0442\u044c \u0432\u0430\u0448\u0435 \u043f\u0438\u0442\u0430\u043d\u043d\u044f..."
                    className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-sm resize-none min-h-[80px]"
                  />
                </div>
              </div>
            </Card>
            <Button size="lg" className="w-full" loading={loading} onClick={handleBook}>
              \u041f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0438 \u0437\u0430\u043f\u0438\u0441
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
