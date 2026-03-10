import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-navy-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
