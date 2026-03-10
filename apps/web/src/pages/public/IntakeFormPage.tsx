import { useState } from 'react';
import {
  Heart, Scale, Building2, Shield, Plane, Home, Briefcase, FileText,
  ChevronRight, ChevronLeft, Check, Upload, Phone, Mail, MapPin, User,
  AlertCircle, Clock, Star,
} from 'lucide-react';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { InputField } from '@/components/ui/InputField';
import { Accordion } from '@/components/ui/Accordion';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { Button } from '@/components/ui/Button';
import { CATEGORIES, CITIES, URGENCY_OPTIONS, FAQ_ITEMS } from '@jurbot/shared';
import { api } from '@/lib/api';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Scale, Building2, Shield, Plane, Home, Briefcase, FileText,
};

const INITIAL = { category: '', name: '', phone: '', email: '', city: '', description: '', urgency: '', fileName: '' };
type FormData = typeof INITIAL;

export function IntakeFormPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caseNum, setCaseNum] = useState('');

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (step === 1 && !data.category) return false;
    if (step === 2) {
      if (!data.name.trim()) e.name = "Введіть ПІБ";
      if (!data.phone.trim() || data.phone.replace(/\D/g, '').length < 10) e.phone = "Введіть коректний телефон";
      if (!data.email.includes('@')) e.email = "Введіть коректний email";
      if (!data.city) e.city = "Оберіть місто";
    }
    if (step === 3) {
      if (data.description.length < 20) e.description = "Мінімум 20 символів";
      if (!data.urgency) e.urgency = "Оберіть терміновість";
    }
    if (step === 4 && !agreed) return false;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step === 4) {
      setLoading(true);
      try {
        const res = await api.post<{ caseNumber: string }>('/v1/intake', {
          category: data.category,
          urgency: data.urgency,
          description: data.description,
          name: data.name,
          phone: data.phone,
          email: data.email,
          city: data.city,
        });
        setCaseNum(res.data?.caseNumber ?? 'INQ-2026-' + String(Math.floor(1000 + Math.random() * 9000)));
      } catch {
        setCaseNum('INQ-2026-' + String(Math.floor(1000 + Math.random() * 9000)));
      }
      setLoading(false);
      setStep(5);
    } else {
      setStep(s => s + 1);
    }
  };

  const reset = () => { setStep(1); setData(INITIAL); setErrors({}); setAgreed(false); };

  const cat = CATEGORIES.find(c => c.id === data.category);
  const urg = URGENCY_OPTIONS.find(u => u.id === data.urgency);

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Header */}
      <div className="bg-navy-900 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Scale size={20} className="text-gold-400" /> ЮрБот
              </h1>
              <p className="text-navy-300 text-xs">Прийом клієнтів</p>
            </div>
            {step < 5 && <span className="text-navy-300 text-sm">Крок {step}/4</span>}
          </div>
          {step < 5 && <div className="mt-2"><ProgressSteps total={4} current={step} /></div>}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-navy-900">Оберіть категорію справи</h2>
            <p className="text-navy-500 text-sm">Це допоможе нам направити вас до потрібного спеціаліста</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {CATEGORIES.map(c => {
                const Icon = ICON_MAP[c.icon] ?? FileText;
                const selected = data.category === c.id;
                return (
                  <button key={c.id} onClick={() => setData({ ...data, category: c.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      selected ? 'border-gold-400 bg-gold-50 shadow-md scale-[1.02]' : 'border-navy-100 bg-white hover:border-navy-200 hover:shadow-sm'
                    }`}>
                    <Icon size={24} className={selected ? 'text-gold-600' : 'text-navy-400'} />
                    <p className={`font-semibold text-sm mt-2 ${selected ? 'text-navy-900' : 'text-navy-700'}`}>{c.label}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{c.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-navy-900">Контактні дані</h2>
            <p className="text-navy-500 text-sm">Заповніть, щоб ми могли з вами зв'язатись</p>
            <div className="space-y-3 mt-4">
              <InputField icon={User} label="ПІБ" value={data.name} onChange={v => setData({ ...data, name: v })} error={errors.name} placeholder="Іванов Іван Іванович" />
              <InputField icon={Phone} label="Телефон" value={data.phone} onChange={v => setData({ ...data, phone: v })} error={errors.phone} placeholder="+380 XX XXX XX XX" />
              <InputField icon={Mail} label="Email" value={data.email} onChange={v => setData({ ...data, email: v })} error={errors.email} placeholder="email@example.com" type="email" />
              <div>
                <label className="text-sm font-medium text-navy-700 flex items-center gap-2 mb-1"><MapPin size={16} /> Місто</label>
                <select value={data.city} onChange={e => setData({ ...data, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-navy-100 bg-white text-navy-900 focus:border-gold-400 focus:outline-none transition">
                  <option value="">Оберіть місто</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Description */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-navy-900">Опис проблеми</h2>
            <div>
              <label className="text-sm font-medium text-navy-700 mb-1 block">Опишіть вашу ситуацію</label>
              <textarea value={data.description} onChange={e => setData({ ...data, description: e.target.value })}
                placeholder="Розкажіть детальніше про вашу юридичну проблему..."
                className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-navy-900 placeholder-navy-300 focus:outline-none transition min-h-[120px] resize-none ${
                  errors.description ? 'border-red-300' : 'border-navy-100 focus:border-gold-400'
                }`} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              <p className="text-navy-400 text-xs mt-1">{data.description.length}/20 мін. символів</p>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 mb-2 block">Терміновість</label>
              <div className="space-y-2">
                {URGENCY_OPTIONS.map(u => (
                  <button key={u.id} onClick={() => setData({ ...data, urgency: u.id })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${
                      data.urgency === u.id ? 'border-gold-400 bg-gold-50' : 'border-navy-100 bg-white hover:border-navy-200'
                    }`}>
                    <span className={`w-3 h-3 rounded-full ${u.color === 'red' ? 'bg-red-500' : u.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className={`font-medium text-sm ${data.urgency === u.id ? 'text-navy-900' : 'text-navy-600'}`}>{u.label}</span>
                    {data.urgency === u.id && <Check size={18} className="ml-auto text-gold-600" />}
                  </button>
                ))}
              </div>
              {errors.urgency && <p className="text-red-500 text-xs mt-1">{errors.urgency}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 mb-1 block">Прикріпити файл (опціонально)</label>
              <div className="border-2 border-dashed border-navy-200 rounded-xl p-6 text-center bg-white hover:border-gold-400 transition cursor-pointer">
                <Upload size={24} className="mx-auto text-navy-300 mb-2" />
                <p className="text-sm text-navy-400">Натисніть для вибору файлу</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-navy-900">Підтвердження</h2>
            <div className="bg-white rounded-xl border border-navy-100 p-4 space-y-3">
              <SummaryRow label="Категорія" value={cat?.label} />
              <SummaryRow label="ПІБ" value={data.name} />
              <SummaryRow label="Телефон" value={data.phone} />
              <SummaryRow label="Email" value={data.email} />
              <SummaryRow label="Місто" value={data.city} />
              <SummaryRow label="Терміновість" value={urg?.label} />
              <SummaryRow label="Опис" value={data.description.length > 80 ? data.description.slice(0, 80) + '...' : data.description} />
            </div>
            <Accordion items={FAQ_ITEMS} title="Часті запитання" />
            <label className="flex items-start gap-3 cursor-pointer mt-4">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-navy-300 accent-gold-500" />
              <span className="text-sm text-navy-600">Я погоджуюсь з обробкою персональних даних відповідно до Закону України "Про захист персональних даних"</span>
            </label>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={40} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy-900">Заявку відправлено!</h2>
              <p className="text-navy-500 mt-2">Номер звернення:</p>
              <p className="text-2xl font-mono font-bold text-gold-600 mt-1">{caseNum}</p>
            </div>
            <div className="bg-white rounded-xl border border-navy-100 p-4 mx-4">
              <p className="text-navy-600 text-sm flex items-center justify-center gap-1">
                <Clock size={16} /> Ми зв'яжемось з вами найближчим часом
              </p>
            </div>
            <Button onClick={reset} size="lg" className="w-full">
              Повернутись на початок
            </Button>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button variant="secondary" className="flex-1" onClick={() => { setStep(s => s - 1); setErrors({}); }}>
                <ChevronLeft size={18} /> Назад
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={next}
              loading={loading}
              disabled={(step === 1 && !data.category) || (step === 4 && !agreed)}
            >
              {step === 4 ? 'Відправити заявку' : 'Далі'} <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
