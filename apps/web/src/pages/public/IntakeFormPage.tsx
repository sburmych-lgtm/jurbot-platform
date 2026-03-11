import { useState } from 'react';
import { Scale, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { InputField } from '@/components/ui/InputField';
import { TextareaField } from '@/components/ui/TextareaField';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';

const CATEGORIES = [
  { value: 'FAMILY', label: '\u0421\u0456\u043c\u0435\u0439\u043d\u0435' },
  { value: 'CIVIL', label: '\u0426\u0438\u0432\u0456\u043b\u044c\u043d\u0435' },
  { value: 'COMMERCIAL', label: '\u0413\u043e\u0441\u043f\u043e\u0434\u0430\u0440\u0441\u044c\u043a\u0435' },
  { value: 'CRIMINAL', label: '\u041a\u0440\u0438\u043c\u0456\u043d\u0430\u043b\u044c\u043d\u0435' },
  { value: 'LABOR', label: '\u0422\u0440\u0443\u0434\u043e\u0432\u0435' },
  { value: 'OTHER', label: '\u0406\u043d\u0448\u0435' },
];

const URGENCY = [
  { value: 'LOW', label: '\u041d\u0438\u0437\u044c\u043a\u0430' },
  { value: 'MEDIUM', label: '\u0421\u0435\u0440\u0435\u0434\u043d\u044f' },
  { value: 'HIGH', label: '\u0412\u0438\u0441\u043e\u043a\u0430' },
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
        <h1 className="text-xl font-bold text-text-primary">\u0417\u0430\u044f\u0432\u043a\u0443 \u043d\u0430\u0434\u0456\u0441\u043b\u0430\u043d\u043e!</h1>
        <p className="text-text-muted text-sm mt-2 text-center">\u0410\u0434\u0432\u043e\u043a\u0430\u0442 \u0437\u0432'\u044f\u0436\u0435\u0442\u044c\u0441\u044f \u0437 \u0432\u0430\u043c\u0438</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <Scale size={36} className="mx-auto text-accent-teal mb-2" />
          <h1 className="text-xl font-bold text-text-primary">\u041d\u043e\u0432\u0430 \u0437\u0430\u044f\u0432\u043a\u0430</h1>
        </div>

        <ProgressSteps total={3} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <InputField label="\u0406\u043c'\u044f" value={name} onChange={setName} placeholder="\u0412\u0430\u0448\u0435 \u0456\u043c'\u044f" />
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
            <InputField label="\u0422\u0435\u043b\u0435\u0444\u043e\u043d" type="tel" value={phone} onChange={setPhone} placeholder="+380..." />
            <InputField label="\u041c\u0456\u0441\u0442\u043e" value={city} onChange={setCity} placeholder="\u041a\u0438\u0457\u0432" />
            <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!name || !email}>\u0414\u0430\u043b\u0456</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f</label>
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
              <label className="text-sm font-medium text-text-secondary mb-2 block">\u0422\u0435\u0440\u043c\u0456\u043d\u043e\u0432\u0456\u0441\u0442\u044c</label>
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
            <Button size="lg" className="w-full" onClick={() => setStep(3)} disabled={!category}>\u0414\u0430\u043b\u0456</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <TextareaField label="\u041e\u043f\u0438\u0448\u0456\u0442\u044c \u0432\u0430\u0448\u0443 \u0441\u0438\u0442\u0443\u0430\u0446\u0456\u044e" value={description} onChange={setDescription} placeholder="\u0429\u043e \u0441\u0442\u0430\u043b\u043e\u0441\u044f?" />
            <Button size="lg" className="w-full" loading={loading} onClick={submit} disabled={!description}>\u041d\u0430\u0434\u0456\u0441\u043b\u0430\u0442\u0438</Button>
          </div>
        )}
      </div>
    </div>
  );
}
