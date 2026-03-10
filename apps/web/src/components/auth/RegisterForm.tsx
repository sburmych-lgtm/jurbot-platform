import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchLogin: () => void;
}

export function RegisterForm({ onSuccess, onSwitchLogin }: RegisterFormProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'LAWYER' | 'CLIENT'>('CLIENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, role);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField icon={User} label="ПІБ" value={name} onChange={setName} placeholder="Іванов Іван Іванович" />
      <InputField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
      <InputField icon={Lock} label="Пароль" type="password" value={password} onChange={setPassword} placeholder="Мінімум 6 символів" />
      <div>
        <label className="text-sm font-medium text-navy-700 mb-2 block">Роль</label>
        <div className="grid grid-cols-2 gap-3">
          {(['CLIENT', 'LAWYER'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                role === r ? 'border-gold-400 bg-gold-50 text-navy-900' : 'border-navy-100 bg-white text-navy-600 hover:border-navy-200'
              }`}
            >
              {r === 'CLIENT' ? 'Клієнт' : 'Юрист'}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Зареєструватись
      </Button>
      <p className="text-center text-sm text-navy-500">
        Вже є акаунт?{' '}
        <button type="button" onClick={onSwitchLogin} className="text-gold-600 font-semibold hover:underline">
          Увійти
        </button>
      </p>
    </form>
  );
}
