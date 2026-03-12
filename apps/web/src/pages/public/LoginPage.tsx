import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scale, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { isTelegramWebApp } from '@/lib/telegram';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isTelegramWebApp()) {
    return (
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
          <div className="glass-panel hero-panel rounded-[30px] p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(0,200,180,0.92),rgba(91,124,250,0.82))] text-[#050810] shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
              <ShieldCheck size={28} />
            </div>
            <p className="section-kicker mb-3">Telegram Entry</p>
            <h1 className="font-display text-4xl text-text-primary">ЮрБот</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              У Mini App вхід відбувається автоматично через Telegram. Якщо зараз ви бачите цей екран,
              завершіть реєстрацію в боті та відкрийте Mini App повторно.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Помилка входу');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr,0.95fr]">
        <section className="space-y-5">
          <p className="section-kicker">ЮрБот Ultimate</p>
          <h1 className="font-display text-5xl leading-none text-text-primary sm:text-6xl">
            Мініап для юриста
            <br />
            і клієнта
          </h1>
          <p className="max-w-xl text-base leading-7 text-text-secondary">
            Один контур для intake, розкладу, справ, файлів та комунікації. Темний shell нижче
            відкриває той самий продукт, який запускається з Telegram-ботів.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-panel rounded-[22px] p-4">
              <p className="section-kicker mb-2">01 · Intake</p>
              <p className="text-sm font-semibold text-text-primary">Кваліфікація заявок</p>
              <p className="mt-2 text-sm text-text-secondary">Швидкий відбір нових звернень і пріоритетів.</p>
            </div>
            <div className="glass-panel rounded-[22px] p-4">
              <p className="section-kicker mb-2">02 · Portal</p>
              <p className="text-sm font-semibold text-text-primary">Справи та документи</p>
              <p className="mt-2 text-sm text-text-secondary">Прозорий статус для юриста та клієнта в одному місці.</p>
            </div>
            <div className="glass-panel rounded-[22px] p-4">
              <p className="section-kicker mb-2">03 · Communication</p>
              <p className="text-sm font-semibold text-text-primary">Telegram + Mini App</p>
              <p className="mt-2 text-sm text-text-secondary">Живі сповіщення, bot flow і швидкий перехід у web shell.</p>
            </div>
          </div>
        </section>

        <section className="glass-panel hero-panel rounded-[30px] p-6 sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(91,124,250,0.92),rgba(0,200,180,0.82))] text-[#050810] shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
              <Scale size={22} />
            </div>
            <div>
              <p className="section-kicker">Secure Portal</p>
              <h2 className="font-display text-3xl text-text-primary">Вхід у систему</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
            <InputField label="Пароль" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            {error && <p className="rounded-[16px] border border-accent-red/20 bg-accent-red/8 px-4 py-3 text-sm text-accent-red">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Увійти
              <ArrowRight size={18} />
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
