import { useState } from 'react';
import { ChevronLeft, Calendar, Check } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { TimeSlots } from '@/components/calendar/TimeSlots';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatDateUk, APPOINTMENT_TYPES } from '@jurbot/shared';

export function BookingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('');
  const [type, setType] = useState('FREE');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refNumber, setRefNumber] = useState('');

  const selectedType = APPOINTMENT_TYPES.find(t => t.id === type);

  const handleDateSelect = (d: string) => { setSelDate(d); setSelTime(''); setStep(2); };
  const handleTimeSelect = (t: string) => { setSelTime(t); setStep(3); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ refNumber: string }>('/v1/appointments', {
        type,
        date: `${selDate}T${selTime}:00`,
        notes,
      });
      setRefNumber(res.data?.refNumber ?? 'BK-XXXX');
      setStep(4);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const reset = () => { setStep(1); setSelDate(''); setSelTime(''); setType('FREE'); setNotes(''); };

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Запис на консультацію</h1>

        {step === 1 && (
          <CalendarGrid selected={selDate} onSelect={handleDateSelect} />
        )}

        {step === 2 && (
          <>
            <button onClick={() => setStep(1)} className="text-sm text-navy-500 flex items-center gap-1 hover:text-navy-700">
              <ChevronLeft size={16} /> Обрати іншу дату
            </button>
            <TimeSlots date={selDate} selected={selTime} onSelect={handleTimeSelect} />
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-navy-500 flex items-center gap-1 hover:text-navy-700">
              <ChevronLeft size={16} /> Обрати інший час
            </button>

            <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 flex items-center gap-3">
              <Calendar size={20} className="text-gold-600" />
              <span className="font-medium text-navy-800 text-sm">{formatDateUk(selDate)}, {selTime}</span>
            </div>

            <div>
              <p className="text-sm font-medium text-navy-700 mb-2">Тип консультації</p>
              <div className="space-y-2">
                {APPOINTMENT_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition ${
                      type === t.id ? 'border-gold-400 bg-gold-50' : 'border-navy-100 bg-white'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-navy-800">{t.label}</p>
                      <p className="text-xs text-navy-400">{t.duration} хв</p>
                    </div>
                    <span className={`text-sm font-bold ${t.price === 0 ? 'text-green-600' : 'text-navy-800'}`}>
                      {t.price === 0 ? 'Безкоштовно' : `${t.price / 100} грн`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="Примітки (опціонально)"
              value={notes}
              onChange={setNotes}
              placeholder="Додаткова інформація..."
            />

            <Card>
              <div className="space-y-2">
                <SummaryRow label="Дата" value={formatDateUk(selDate)} />
                <SummaryRow label="Час" value={selTime} />
                <SummaryRow label="Тип" value={selectedType?.label ?? ''} />
                <div className="border-t border-navy-50 pt-2 mt-2">
                  <SummaryRow label="Вартість" value={selectedType?.price === 0 ? 'Безкоштовно' : `${(selectedType?.price ?? 0) / 100} грн`} />
                </div>
              </div>
            </Card>

            <Button onClick={handleSubmit} loading={loading} className="w-full" size="lg">
              Підтвердити запис
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-5 py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy-900">Запис підтверджено!</h2>
              <p className="text-navy-500 text-sm mt-1">
                Референс: <span className="font-mono font-bold text-gold-600">{refNumber}</span>
              </p>
            </div>
            <Card>
              <div className="space-y-2">
                <SummaryRow label="Дата" value={formatDateUk(selDate)} />
                <SummaryRow label="Час" value={selTime} />
                <SummaryRow label="Тип" value={selectedType?.label ?? ''} />
                <SummaryRow label="Тривалість" value={`${selectedType?.duration ?? 0} хв`} />
              </div>
            </Card>
            <Button onClick={reset} className="w-full" size="lg">
              Новий запис
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
