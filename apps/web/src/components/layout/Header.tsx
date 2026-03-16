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
    <header className="sticky top-0 z-40 pt-2">
      <div className="glass-panel rounded-[24px] px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] shadow-[0_18px_36px_rgba(0,0,0,0.24)] ${accentClass}`}>
              <RoleIcon size={20} className="text-[#050810]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-text-muted">ЮрБот</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                  {roleLabel}
                </span>
              </div>
              <h1 className="font-display text-[1.4rem] leading-none text-text-primary sm:text-[1.7rem]">{title}</h1>
              <p className="mt-0.5 text-sm text-text-secondary sm:mt-1">
                {user ? user.name : 'Єдиний цифровий контур для юриста та клієнта'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`${basePath}/notifications`)}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-text-secondary transition hover:border-white/20 hover:text-text-primary"
              aria-label="Сповіщення"
            >
              <Bell size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-text-secondary transition hover:border-white/20 hover:text-text-primary"
              aria-label="Вийти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
