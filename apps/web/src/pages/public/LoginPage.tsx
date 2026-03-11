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
        <h1 className="text-2xl font-bold text-text-primary font-display">\u042e\u0440\u0411\u043e\u0442</h1>
        <p className="text-text-muted text-sm mt-2 text-center">\u0412\u0445\u0456\u0434 \u0447\u0435\u0440\u0435\u0437 Telegram \u0431\u043e\u0442\u0430</p>
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
      setError(err.message || '\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0432\u0445\u043e\u0434\u0443');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Scale size={48} className="mx-auto text-accent-teal mb-3" />
          <h1 className="text-2xl font-bold text-text-primary font-display">\u042e\u0440\u0411\u043e\u0442</h1>
          <p className="text-text-muted text-sm mt-1">\u0412\u0445\u0456\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
          <InputField label="\u041f\u0430\u0440\u043e\u043b\u044c" type="password" value={password} onChange={setPassword} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
          {error && <p className="text-accent-red text-sm text-center">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>\u0423\u0432\u0456\u0439\u0442\u0438</Button>
        </form>
      </div>
    </div>
  );
}
