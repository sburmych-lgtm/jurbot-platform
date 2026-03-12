import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  Inbox,
  MessageSquareText,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/case/StatCard';

interface DashStats {
  cases: number;
  appointments: number;
  intake: number;
}

const QUICK_LINKS = [
  {
    icon: Inbox,
    title: 'Client Intake',
    description: 'Нові звернення, пріоритет і перший контакт.',
    path: '/lawyer/intake',
    color: 'text-accent-red',
  },
  {
    icon: Briefcase,
    title: 'Справи',
    description: 'Статуси, матеріали та робота по клієнтах.',
    path: '/lawyer/cases',
    color: 'text-accent-teal',
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Слоти, консультації й календар робочого дня.',
    path: '/lawyer/schedule',
    color: 'text-accent-blue',
  },
  {
    icon: Users,
    title: 'Клієнтський контур',
    description: 'Перегляд підключених клієнтів та їхнього стану.',
    path: '/lawyer/clients',
    color: 'text-accent-amber',
  },
];

export function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats>({ cases: 0, appointments: 0, intake: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.get<{ items: unknown[] }>('/v1/cases?limit=0'),
          api.get<{ items: unknown[] }>('/v1/appointments?limit=0'),
          api.get<{ items: unknown[] }>('/v1/intake?limit=0'),
        ]);

        setStats({
          cases: results[0].status === 'fulfilled' ? (results[0].value.data?.items?.length ?? 0) : 0,
          appointments: results[1].status === 'fulfilled' ? (results[1].value.data?.items?.length ?? 0) : 0,
          intake: results[2].status === 'fulfilled' ? (results[2].value.data?.items?.length ?? 0) : 0,
        });
      } catch {
        // ignore and show zero state
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const firstName = user?.name?.split(' ')[0] ?? 'Колего';

  return (
    <PageContainer>
      <div className="space-y-5">
        <section className="glass-panel hero-panel rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker mb-2">Операційний центр</p>
              <h2 className="font-display text-4xl leading-none text-text-primary">Доброго дня, {firstName}.</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                Заявки, справи, клієнти та розклад зібрані в одному Mini App, який відкривається прямо з Telegram.
              </p>
            </div>
            <Badge color={stats.intake > 0 ? 'yellow' : 'teal'}>
              {stats.intake > 0 ? `${stats.intake} нових` : 'Все під контролем'}
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate('/lawyer/intake')}>
              Нові заявки
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/lawyer/cases')}>
              Справи
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/lawyer/clients')}>
              Клієнти
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Briefcase} label="Справи" value={stats.cases} />
          <StatCard icon={Calendar} label="Зустрічі" value={stats.appointments} />
          <StatCard icon={Inbox} label="Intake" value={stats.intake} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.15fr,0.85fr]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker mb-2">Пріоритет зараз</p>
                <h3 className="text-lg font-semibold text-text-primary">Фокус на вхідному потоці</h3>
              </div>
              {stats.intake > 0 ? <AlertTriangle size={18} className="text-accent-amber" /> : null}
            </div>

            <div className="space-y-3">
              <div className="rounded-[18px] border border-accent-red/12 bg-accent-red/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {stats.intake > 0 ? `${stats.intake} заявок очікують на відповідь` : 'Нових заявок зараз немає'}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Якщо є нові звернення, відкрийте intake та закрийте їх у першу чергу.
                    </p>
                  </div>
                  <Badge color={stats.intake > 0 ? 'red' : 'teal'}>{stats.intake > 0 ? 'Терміново' : 'Чисто'}</Badge>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-text-primary">Зв'язок з клієнтами вже працює</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Клієнтський бот прив’язує нових клієнтів та передає повідомлення адвокату в Telegram.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="section-kicker mb-2">Сьогодні</p>
              <h3 className="text-lg font-semibold text-text-primary">Короткий зріз</h3>
            </div>

            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-text-primary">{stats.appointments} подій у календарі</p>
                <p className="mt-1 text-sm text-text-secondary">Розклад відкривається окремим розділом без виходу з Mini App.</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-text-primary">{stats.cases} справ в активній роботі</p>
                <p className="mt-1 text-sm text-text-secondary">Статуси, файли та структура вже доступні у web shell.</p>
              </div>
            </div>
          </Card>
        </div>

        <section>
          <p className="section-kicker mb-3">Єдиний контур</p>
          <div className="grid gap-3">
            {QUICK_LINKS.map(({ icon: Icon, title, description, path, color }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="glass-panel flex items-center gap-4 rounded-[22px] p-4 text-left transition hover:border-white/16 hover:bg-white/6"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/6 ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{description}</p>
                </div>
                <ArrowRight size={18} className="text-text-muted" />
              </button>
            ))}
          </div>
        </section>

        <Card className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-blue/15 text-accent-blue">
            <MessageSquareText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Запрошення й боти вже з'єднані</p>
            <p className="mt-1 text-sm text-text-secondary">
              Клієнт отримує invite link з lawyer bot, реєструється у client bot і після цього потрапляє в цей Mini App.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate('/lawyer/clients')}>
            Перевірити
          </Button>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent-amber/15 text-accent-amber">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Документи та календар лишаються в одному shell</p>
            <p className="mt-1 text-sm text-text-secondary">
              Перший зрілий slice уже зібраний, без окремих адмінок і без розриву між ботом та вебчастиною.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
