import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { resolveUiRole } from '@/lib/telegram';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const { user } = useAuth();
  const role = user ? resolveUiRole(user.role).role.toLowerCase() as 'lawyer' | 'client' : 'client';

  return (
    <div className={`miniapp-shell miniapp-shell--${role}`}>
      <div className="miniapp-backdrop" aria-hidden="true">
        <div className="miniapp-orb miniapp-orb--primary" />
        <div className="miniapp-orb miniapp-orb--secondary" />
        <div className="miniapp-grid" />
      </div>

      <div className="relative min-h-screen pb-[72px] sm:pb-[88px]">
        <div className="mx-auto max-w-lg px-2.5 sm:px-4">
          <Header />
          <main className="pt-2 sm:pt-4">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
