import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface ToastData {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="bg-bg-elevated text-text-primary px-4 py-2 rounded-[14px] text-sm shadow-lg border border-border-default animate-fade-up">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
