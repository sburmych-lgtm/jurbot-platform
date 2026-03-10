import { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

interface PortalLoginProps {
  onSuccess: () => void;
}

export function PortalLogin({ onSuccess }: PortalLoginProps) {
  const { portalLogin } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(false);
    try {
      await portalLogin(code);
      onSuccess();
    } catch {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Lock size={28} className="text-navy-900" />
        </div>
        <p className="text-sm text-navy-600">Введіть код доступу від юриста</p>
      </div>
      <input
        type="text"
        value={code}
        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(false); }}
        placeholder="------"
        maxLength={6}
        className={`w-full text-center text-3xl font-mono tracking-[0.5em] px-4 py-4 rounded-xl border-2 focus:outline-none transition ${
          error ? 'border-red-400 bg-red-50' : 'border-navy-100 focus:border-gold-400'
        }`}
        onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) submit(); }}
      />
      {error && (
        <p className="text-red-500 text-xs text-center mt-2 flex items-center justify-center gap-1">
          <AlertCircle size={14} /> Невірний код доступу
        </p>
      )}
      <Button
        onClick={submit}
        loading={loading}
        disabled={code.length < 6}
        className="w-full mt-4"
        size="lg"
      >
        Увійти за кодом
      </Button>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`}</style>
    </div>
  );
}
