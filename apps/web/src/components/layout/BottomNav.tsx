import { useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Users,
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
  { path: '/lawyer/documents', icon: FileText, label: 'AI Доки' },
  { path: '/lawyer/schedule', icon: Calendar, label: 'Розклад' },
  { path: '/lawyer/clients', icon: Users, label: 'Клієнти' },
  { path: '/lawyer/settings', icon: CreditCard, label: 'План' },
];

const CLIENT_TABS: NavTab[] = [
  { path: '/client', icon: Home, label: 'Головна' },
  { path: '/client/case', icon: Briefcase, label: 'Справа' },
  { path: '/client/messages', icon: MessageSquare, label: 'Чат' },
  { path: '/client/booking', icon: Clock, label: 'Запис' },
  { path: '/client/documents', icon: FileText, label: 'Файли' },
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
    <nav className="glass-panel mt-6 rounded-[28px] p-2.5">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`min-w-[78px] flex-1 rounded-[18px] px-2 py-2.5 text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-white/8 text-text-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
