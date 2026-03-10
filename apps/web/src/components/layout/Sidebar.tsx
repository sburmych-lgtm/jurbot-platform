import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Calendar, FileText, Users, Clock,
  Inbox, Home, MessageSquare, CheckSquare, CalendarPlus, Settings,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SidebarItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

const LAWYER_ITEMS: SidebarItem[] = [
  { path: '/lawyer', icon: LayoutDashboard, label: 'Панель' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Справи' },
  { path: '/lawyer/intake', icon: Inbox, label: 'Заявки' },
  { path: '/lawyer/schedule', icon: Calendar, label: 'Розклад' },
  { path: '/lawyer/documents', icon: FileText, label: 'Документи' },
  { path: '/lawyer/timelogs', icon: Clock, label: 'Час' },
  { path: '/lawyer/clients', icon: Users, label: 'Клієнти' },
  { path: '/lawyer/profile', icon: Settings, label: 'Профіль' },
];

const CLIENT_ITEMS: SidebarItem[] = [
  { path: '/client', icon: Home, label: 'Головна' },
  { path: '/client/case', icon: Briefcase, label: 'Моя справа' },
  { path: '/client/messages', icon: MessageSquare, label: 'Повідомлення' },
  { path: '/client/documents', icon: FileText, label: 'Документи' },
  { path: '/client/checklist', icon: CheckSquare, label: 'Чекліст' },
  { path: '/client/booking', icon: CalendarPlus, label: 'Запис' },
  { path: '/client/profile', icon: Settings, label: 'Профіль' },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === 'LAWYER' ? LAWYER_ITEMS : CLIENT_ITEMS;

  const isActive = (path: string) => {
    if (path === '/lawyer' || path === '/client') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex md:flex-col w-56 bg-white border-r border-navy-100 min-h-screen pt-4">
      <nav className="flex-1 px-3 space-y-1">
        {items.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                active
                  ? 'bg-gold-50 text-gold-700 border border-gold-200'
                  : 'text-navy-600 hover:bg-navy-50',
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
