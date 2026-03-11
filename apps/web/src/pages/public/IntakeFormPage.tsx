import { useState } from 'react';
import { Scale, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';

const CATEGORIES = [
  { value: 'FAMILY', label: 'Сімейне' },
  { value: 'CIVIL', label: 'Цивільне' },
  { value: 'COMMERCIAL', label: 'Господарське' },
  { value: 'CRIMINAL', label: 'Кримінальне' },
  { value: 'LABOR', label: 'Трудове' },
  { value: 'OTHER', label: 'Інше' },
];

const URGENCY = [
  { value: 'LOW', label: 'Низька' },
  { value: 'MEDIUM', label: 'Середня' },
  { value: 'HIGH', label: 'Висока' },
];

export function IntakeFormPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post('/v1/intake', { name, email, phone, city, category, urgency, description });
      setDone(true);
    } catch {}
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-accent-green/15 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-accent-green" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Заявку надіслано!</h1>
        <p className="text-text-muted text-sm mt-2 text-center">Адвокат зв'яжеться з вами</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <Scale size={36} className="mx-auto text-accent-teal mb-2" />
          <h1 className="text-xl font-bold text-text-primary">Нова заявка</h1>
        </div>

        <ProgressSteps total={3} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <InputField label="Ім'я" value={name} onChange={setName} placeholder="Ваше ім'я" />
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
            <InputField label="Телефон" type="tel" value={phone} onChange={setPhone} placeholder="+380..." />
            <InputField label="Місто" value={city} onChange={setCity} placeholder="Київ" />
            <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!name || !email}>Далі</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Категорія</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-2 rounded-[10px] text-sm font-medium transition ${
                      category === c.value ? 'bg-accent-teal text-bg-primary' : 'bg-bg-card border border-border-default text-text-secondary'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">Терміновість</label>
              <div className="flex gap-2">
                {URGENCY.map(u => (
                  <button
                    key={u.value}
                    onClick={() => setUrgency(u.value)}
                    className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition ${
                      urgency === u.value ? 'bg-accent-teal text-bg-primary' : 'bg-bg-card border border-border-default text-text-secondary'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(3)} disabled={!category}>Далі</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <TextareaField label="Опишіть вашу ситуацію" value={description} onChange={setDescription} placeholder="Що сталося?" />
            <Button size="lg" className="w-full" loading={loading} onClick={submit} disabled={!description}>Надіслати</Button>
          </div>
        )}
      </div>
    </div>
  );
}
