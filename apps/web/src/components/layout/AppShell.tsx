import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getBotSource } from '@/lib/telegram';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const { user } = useAuth();
  const botSource = getBotSource();
  const role = botSource === 'lawyer' || user?.role === 'LAWYER' ? 'lawyer' : 'client';

  return (
    <div className={`miniapp-shell miniapp-shell--${role}`}>
      <div className="miniapp-backdrop" aria-hidden="true">
        <div className="miniapp-orb miniapp-orb--primary" />
        <div className="miniapp-orb miniapp-orb--secondary" />
        <div className="miniapp-grid" />
      </div>

      <div className="relative min-h-screen">
        <div className="mx-auto max-w-lg px-4 pb-28">
          <Header />
          <main className="pt-4">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
