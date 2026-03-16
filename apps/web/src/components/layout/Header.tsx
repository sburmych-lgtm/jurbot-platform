import { Bell, LogOut, Scale, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getBotSource } from '@/lib/telegram';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const LAWYER_TITLES: Array<[string, string]> = [
  ['/lawyer/intake', 'Нові заявки'],
  ['/lawyer/cases', 'Справи'],
  ['/lawyer/schedule', 'Розклад'],
  ['/lawyer/clients', 'Клієнти'],
  ['/lawyer/documents', 'Документи'],
  ['/lawyer/notifications', 'Сповіщення'],
  ['/lawyer/settings', 'Налаштування'],
  ['/lawyer/profile', 'Профіль'],
  ['/lawyer', 'Операційний зріз'],
];

const CLIENT_TITLES: Array<[string, string]> = [
  ['/client/messages', 'Звʼязок з адвокатом'],
  ['/client/documents', 'Файли та документи'],
  ['/client/booking', 'Запис на консультацію'],
  ['/client/case', 'Моя справа'],
  ['/client/notifications', 'Сповіщення'],
  ['/client/profile', 'Профіль'],
  ['/client', 'Клієнтський кабінет'],
];

function resolveTitle(pathname: string, role: 'LAWYER' | 'CLIENT'): string {
  const titles = role === 'LAWYER' ? LAWYER_TITLES : CLIENT_TITLES;
  return titles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'ЮрБот';
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const botSource = getBotSource();

  const role = botSource === 'lawyer' || user?.role === 'LAWYER' ? 'LAWYER' : 'CLIENT';
  const basePath = role === 'LAWYER' ? '/lawyer' : '/client';
  const title = resolveTitle(location.pathname, role);
  const roleLabel = role === 'LAWYER' ? 'PRO' : 'CLIENT';
  const roleIcon = role === 'LAWYER' ? Scale : ShieldCheck;
  const RoleIcon = roleIcon;
  const accentClass =
    role === 'LAWYER'
      ? 'bg-[linear-gradient(135deg,rgba(91,124,250,0.92),rgba(0,200,180,0.78))]'
      : 'bg-[linear-gradient(135deg,rgba(0,200,180,0.92),rgba(91,124,250,0.78))]';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 pt-1 sm:pt-2">
      <div className="glass-panel rounded-[16px] px-3 py-1.5 sm:rounded-[24px] sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] shadow-[0_12px_24px_rgba(0,0,0,0.24)] sm:h-11 sm:w-11 sm:rounded-[14px] ${accentClass}`}>
              <RoleIcon size={16} className="text-[#050810]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted sm:text-[11px]">ЮрБот</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary sm:px-2.5 sm:py-1 sm:text-[10px]">
                  {roleLabel}
                </span>
              </div>
              <h1 className="font-display text-[1.1rem] leading-tight text-text-primary sm:text-[1.7rem] sm:leading-none truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate(`${basePath}/notifications`)}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-text-secondary transition hover:border-white/20 hover:text-text-primary sm:h-11 sm:w-11 sm:rounded-[14px]"
              aria-label="Сповіщення"
            >
              <Bell size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-text-secondary transition hover:border-white/20 hover:text-text-primary sm:h-11 sm:w-11 sm:rounded-[14px]"
              aria-label="Вийти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
