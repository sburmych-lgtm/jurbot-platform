import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Calendar,
  Home, FolderOpen, Clock, Inbox, Users, MessageSquare,
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
  { path: '/lawyer/intake', icon: Inbox, label: 'Заявки' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Справи' },
  { path: '/lawyer/schedule', icon: Calendar, label: 'Розклад' },
  { path: '/lawyer/clients', icon: Users, label: 'Клієнти' },
];

const CLIENT_TABS: NavTab[] = [
  { path: '/client', icon: Home, label: 'Головна' },
  { path: '/client/case', icon: Briefcase, label: 'Справа' },
  { path: '/client/messages', icon: MessageSquare, label: 'Чат' },
  { path: '/client/booking', icon: Clock, label: 'Запис' },
  { path: '/client/documents', icon: FolderOpen, label: 'Файли' },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = user?.role === 'LAWYER' ? LAWYER_TABS : CLIENT_TABS;

  const isActive = (path: string) => {
    if (path === '/lawyer' || path === '/client') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="mx-auto max-w-lg px-4">
        <div className="glass-panel flex rounded-[24px] px-1 py-1.5">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 rounded-[18px] px-1 py-2.5 text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-white/8 text-text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <tab.icon size={18} strokeWidth={active ? 2.3 : 1.7} className="mx-auto" />
              <span className="mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
