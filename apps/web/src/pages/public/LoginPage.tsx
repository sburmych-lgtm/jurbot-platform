import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
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
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
        <Scale size={48} className="text-accent-teal mb-4" />
        <h1 className="text-2xl font-bold text-text-primary font-display">ЮрБот</h1>
        <p className="text-text-muted text-sm mt-2 text-center">Вхід через Telegram бота</p>
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
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Scale size={48} className="mx-auto text-accent-teal mb-3" />
          <h1 className="text-2xl font-bold text-text-primary font-display">ЮрБот</h1>
          <p className="text-text-muted text-sm mt-1">Вхід в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
          <InputField label="Пароль" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          {error && <p className="text-accent-red text-sm text-center">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>Увійти</Button>
        </form>
      </div>
    </div>
  );
}
