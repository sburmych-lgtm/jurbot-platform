import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PortalLogin } from '@/components/auth/PortalLogin';
import { useAuth } from '@/lib/auth';

type Mode = 'login' | 'register' | 'portal';

export function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // If already authenticated, redirect
  if (user) {
    const path = user.role === 'LAWYER' ? '/lawyer' : '/client';
    navigate(path, { replace: true });
    return null;
  }

  const handleSuccess = () => {
    // Will re-render and redirect via the check above
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scale size={32} className="text-navy-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">ЮрБот</h1>
          <p className="text-navy-300 mt-2 text-sm">Юридична платформа</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-navy-800 rounded-xl p-1 mb-6">
          {([['login', 'Вхід'], ['register', 'Реєстрація'], ['portal', 'Код']] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === m ? 'bg-gold-500 text-navy-900' : 'text-navy-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Forms */}
        <div className="bg-white rounded-2xl p-6">
          {mode === 'login' && (
            <LoginForm onSuccess={handleSuccess} onSwitchRegister={() => setMode('register')} />
          )}
          {mode === 'register' && (
            <RegisterForm onSuccess={handleSuccess} onSwitchLogin={() => setMode('login')} />
          )}
          {mode === 'portal' && (
            <PortalLogin onSuccess={handleSuccess} />
          )}
        </div>

        {/* Intake link */}
        <p className="text-center text-sm text-navy-400 mt-6">
          Потрібна юридична допомога?{' '}
          <button onClick={() => navigate('/intake')} className="text-gold-400 font-semibold hover:underline">
            Залишити заявку
          </button>
        </p>
      </div>
    </div>
  );
}
