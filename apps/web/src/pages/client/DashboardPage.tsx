import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  MessageSquareText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CaseProgress } from '@/components/case/CaseProgress';
import { Spinner } from '@/components/ui/Spinner';

interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  nextAction?: string;
  nextDate?: string;
  lawyer?: { user: { name: string } };
}

const ACTIONS = [
  {
    icon: MessageSquareText,
    title: 'Чат з адвокатом',
    subtitle: 'Швидкий перехід до повідомлень.',
    path: '/client/messages',
    color: 'text-accent-teal',
  },
  {
    icon: FileText,
    title: 'Файли та документи',
    subtitle: 'Ваші матеріали та нові завантаження.',
    path: '/client/documents',
    color: 'text-accent-blue',
  },
  {
    icon: Calendar,
    title: 'Запис на консультацію',
    subtitle: 'Оберіть слот без дзвінків і листування.',
    path: '/client/booking',
    color: 'text-accent-amber',
  },
  {
    icon: Bell,
    title: 'Сповіщення',
    subtitle: 'Оновлення по справі та від юриста.',
    path: '/client/notifications',
    color: 'text-accent-red',
  },
];

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CaseData[]>('/v1/cases');
        const items = res.data ?? [];
        if (items.length > 0) setCaseData(items[0] ?? null);
      } catch {
        // ignore and show empty state
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const firstName = user?.name?.split(' ')[0] ?? 'друже';

  return (
    <PageContainer>
      <div className="space-y-5">
        <section className="glass-panel hero-panel rounded-[28px] p-5">
          <p className="section-kicker mb-2">Клієнтський кабінет</p>
          <h2 className="font-display text-4xl leading-none text-text-primary">Вітаємо, {firstName}.</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Тут зібрано статус вашої справи, зв'язок з адвокатом і всі дії, які можна виконати безпосередньо з Telegram Mini App.
          </p>
          {caseData?.lawyer ? (
            <p className="mt-4 text-sm font-medium text-text-primary">
              Ваш адвокат: <span className="text-accent-teal">{caseData.lawyer.user.name}</span>
            </p>
          ) : null}
        </section>

        {caseData ? (
          <>
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-kicker mb-2">Поточна справа</p>
                  <h3 className="text-lg font-semibold text-text-primary">{caseData.title}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                    {caseData.caseNumber}
                  </p>
                </div>
                <Badge color="teal">{caseData.status}</Badge>
              </div>

              <CaseProgress currentStatus={caseData.status} />

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate('/client/messages')}>
                  Написати адвокату
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/client/case')}>
                  Відкрити справу
                </Button>
              </div>
            </Card>

            {caseData.nextAction ? (
              <Card className="border border-accent-amber/18">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-amber/12 text-accent-amber">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="section-kicker mb-2">Наступний крок</p>
                    <p className="text-sm font-semibold text-text-primary">{caseData.nextAction}</p>
                    {caseData.nextDate ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {new Date(caseData.nextDate).toLocaleDateString('uk-UA')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="text-center py-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/6 text-text-muted">
              <Briefcase size={24} />
            </div>
            <p className="mt-4 text-base font-semibold text-text-primary">Справу ще не створено</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Ваш адвокат зможе підключити справу трохи пізніше, але чат, файли та запис уже доступні з Mini App.
            </p>
          </Card>
        )}

        <section>
          <p className="section-kicker mb-3">Швидкі дії</p>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map(({ icon: Icon, title, subtitle, path, color }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="glass-panel rounded-[22px] p-4 text-left transition hover:border-white/16 hover:bg-white/6"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/6 ${color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{subtitle}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
