import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Calendar, FileText,
  Home, MessageSquare, MoreHorizontal, CheckSquare,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavTab {
  path: string;
  icon: LucideIcon;
  label: string;
}

const LAWYER_TABS: NavTab[] = [
  { path: '/lawyer', icon: LayoutDashboard, label: 'Панель' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Справи' },
  { path: '/lawyer/schedule', icon: Calendar, label: 'Розклад' },
  { path: '/lawyer/documents', icon: FileText, label: 'Документи' },
];

const CLIENT_TABS: NavTab[] = [
  { path: '/client', icon: Home, label: 'Головна' },
  { path: '/client/messages', icon: MessageSquare, label: 'Чат' },
  { path: '/client/documents', icon: FileText, label: 'Документи' },
  { path: '/client/checklist', icon: CheckSquare, label: 'Чеклісти' },
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 z-50 md:hidden">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition ${
                active ? 'text-gold-600' : 'text-navy-400'
              }`}
            >
              <tab.icon size={20} />
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
