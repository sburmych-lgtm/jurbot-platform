import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchRegister: () => void;
}

export function LoginForm({ onSuccess, onSwitchRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        icon={Mail}
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="email@example.com"
      />
      <InputField
        icon={Lock}
        label="Пароль"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Ваш пароль"
      />
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Увійти
      </Button>
      <p className="text-center text-sm text-navy-500">
        Немає акаунту?{' '}
        <button type="button" onClick={onSwitchRegister} className="text-gold-600 font-semibold hover:underline">
          Зареєструватись
        </button>
      </p>
    </form>
  );
}
