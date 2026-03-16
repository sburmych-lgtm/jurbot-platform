import { useLocation, useNavigate } from 'react-router-dom';
import { getBotSource } from '@/lib/telegram';
import {
  Briefcase,
  Calendar,
  FileText,
  Home,
  LayoutDashboard,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavTab {
  path: string;
  icon: LucideIcon;
  label: string;
}

const LAWYER_TABS: NavTab[] = [
  { path: '/lawyer', icon: LayoutDashboard, label: 'Огляд' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Справи' },
  { path: '/lawyer/schedule', icon: Calendar, label: 'Розклад' },
  { path: '/lawyer/documents', icon: FileText, label: 'Документи' },
];

const CLIENT_TABS: NavTab[] = [
  { path: '/client', icon: Home, label: 'Головна' },
  { path: '/client/booking', icon: Calendar, label: 'Запис' },
  { path: '/client/messages', icon: MessageSquare, label: 'Чат' },
  { path: '/client/documents', icon: FileText, label: 'Документи' },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const botSource = getBotSource();
  const isLawyer = botSource === 'client' ? false : (botSource === 'lawyer' || user?.role === 'LAWYER');
  const tabs = isLawyer ? LAWYER_TABS : CLIENT_TABS;

  const isActive = (path: string) => {
    if (path === '/lawyer' || path === '/client') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-2.5 pb-[env(safe-area-inset-bottom,4px)] sm:px-4 sm:pb-2">
      <div className="glass-panel mx-auto max-w-lg rounded-[20px] p-1.5 sm:rounded-[28px] sm:p-2.5">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            const Icon = tab.icon;

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`rounded-[14px] px-1.5 py-1.5 text-[10px] font-semibold transition-all sm:rounded-[18px] sm:px-2 sm:py-2.5 ${
                  active
                    ? 'bg-white/8 text-text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
