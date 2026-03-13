import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Inbox,
  Sparkles,
  Users,
  type LucideIcon,
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
  aiDocs: number;
  aiDocsLimit: number | null;
  plan: string | null;
  subscriptionStatus: string | null;
  expiresAt: string | null;
}

interface QuickLink {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string;
  color: string;
}

interface SubscriptionPayload {
  subscription: {
    plan: string;
    status: string;
    expiresAt: string | null;
  } | null;
  usage: {
    aiDocsCount: number;
  } | null;
  limits: {
    maxAiDocs: number | null;
  } | null;
}

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Trial - 14 днів безкоштовно',
  BASIC: 'Basic - 499 або 599 грн/міс',
  PRO: 'Pro - 999 грн/міс',
  BUREAU: 'Bureau / Business - 2499 грн/міс',
};

const QUICK_LINKS: QuickLink[] = [
  {
    icon: Inbox,
    title: 'Client Intake',
    description: 'Нові звернення, пріоритет і перший контакт.',
    path: '/lawyer/intake',
    color: 'text-accent-red',
  },
  {
    icon: FileText,
    title: 'AI Документи',
    description: 'Генерація шаблонів, договорів, заяв і процесуальних текстів.',
    path: '/lawyer/documents',
    color: 'text-accent-blue',
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
    title: 'Розклад',
    description: 'Слоти, консультації й календар робочого дня.',
    path: '/lawyer/schedule',
    color: 'text-accent-amber',
  },
  {
    icon: Users,
    title: 'Клієнти',
    description: 'Перегляд підключених клієнтів та їхнього стану.',
    path: '/lawyer/clients',
    color: 'text-accent-amber',
  },
  {
    icon: CreditCard,
    title: 'План і доступ',
    description: 'Тріал, ліміти, інвайти та тарифна сітка.',
    path: '/lawyer/settings',
    color: 'text-accent-blue',
  },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна',
  TRIAL: 'Тріал',
  EXPIRED: 'Протермінована',
  CANCELLED: 'Скасована',
};

export function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats>({
    cases: 0,
    appointments: 0,
    intake: 0,
    aiDocs: 0,
    aiDocsLimit: null,
    plan: null,
    subscriptionStatus: null,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const results = await Promise.allSettled([
          api.get<{ items?: unknown[] }>('/v1/cases?limit=0'),
          api.get<{ items?: unknown[] }>('/v1/appointments?limit=0'),
          api.get<{ items?: unknown[] }>('/v1/intake?limit=0'),
          api.get<SubscriptionPayload>('/v1/subscription'),
        ]);

        const subscriptionResult =
          results[3].status === 'fulfilled' ? results[3].value.data : null;

        setStats({
          cases:
            results[0].status === 'fulfilled'
              ? (results[0].value.data?.items?.length ?? 0)
              : 0,
          appointments:
            results[1].status === 'fulfilled'
              ? (results[1].value.data?.items?.length ?? 0)
              : 0,
          intake:
            results[2].status === 'fulfilled'
              ? (results[2].value.data?.items?.length ?? 0)
              : 0,
          aiDocs: subscriptionResult?.usage?.aiDocsCount ?? 0,
          aiDocsLimit: subscriptionResult?.limits?.maxAiDocs ?? null,
          plan: subscriptionResult?.subscription?.plan ?? null,
          subscriptionStatus: subscriptionResult?.subscription?.status ?? null,
          expiresAt: subscriptionResult?.subscription?.expiresAt ?? null,
        });
      } catch {
        // Ignore and keep zero state to avoid blocking the Mini App shell.
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Spinner
        text="Завантажуємо dashboard юриста..."
        subtext="Підтягуємо справи, intake, AI-документи та стан підписки."
      />
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Колего';
  const planLabel = stats.plan ? PLAN_LABELS[stats.plan] ?? stats.plan : 'Trial - 14 днів безкоштовно';
  const statusLabel = stats.subscriptionStatus
    ? STATUS_LABELS[stats.subscriptionStatus] ?? stats.subscriptionStatus
    : 'Тріал';
  const priorityBadgeColor = stats.intake > 0 ? 'yellow' : 'teal';
  const aiDocsMeta =
    stats.aiDocsLimit === null ? 'Без ліміту' : `${stats.aiDocs} / ${stats.aiDocsLimit}`;
  const daysLeft = stats.expiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(stats.expiresAt).getTime() - Date.now()) / 86400000),
      )
    : null;

  return (
    <PageContainer className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(91,124,250,0.28),transparent_45%),linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-text-muted">
                Операційний центр
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold text-text-primary">
                  Доброго дня, {firstName}.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-text-secondary">
                  Заявки, справи, AI-документи, клієнти та доступ до тарифів тепер
                  зібрані на одному екрані Mini App.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge color="blue">{planLabel}</Badge>
              <Badge color={priorityBadgeColor}>{statusLabel}</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/lawyer/documents')}
              className="glass-panel rounded-[24px] p-4 text-left transition hover:border-white/10 hover:bg-white/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-accent-blue/15 text-accent-blue">
                  <Sparkles className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted" />
              </div>

              <h3 className="text-lg font-semibold text-text-primary">AI Документи</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Генерація процесуальних шаблонів і документів без виходу з Telegram.
              </p>
              <p className="mt-3 text-sm font-medium text-text-primary">{aiDocsMeta}</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/lawyer/settings')}
              className="glass-panel rounded-[24px] p-4 text-left transition hover:border-white/10 hover:bg-white/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-accent-teal/15 text-accent-teal">
                  <CreditCard className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted" />
              </div>

              <h3 className="text-lg font-semibold text-text-primary">Тріал і тарифи</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Контроль лімітів, invite token-ів і актуальної комерційної сітки.
              </p>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {daysLeft !== null && stats.subscriptionStatus === 'TRIAL'
                  ? `Залишилось ${daysLeft} дн.`
                  : planLabel}
              </p>
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/lawyer/documents')}>Відкрити AI Документи</Button>
            <Button variant="secondary" onClick={() => navigate('/lawyer/settings')}>
              Переглянути тарифи
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} label="Нові заявки" value={stats.intake} />
        <StatCard icon={Briefcase} label="Справи" value={stats.cases} />
        <StatCard icon={Calendar} label="Події в розкладі" value={stats.appointments} />
        <StatCard icon={FileText} label="AI-документи" value={stats.aiDocs} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                Пріоритет зараз
              </p>
              <h3 className="mt-2 text-xl font-semibold text-text-primary">
                {stats.intake > 0 ? 'Фокус на intake' : 'Операційний контур стабільний'}
              </h3>
            </div>
            <Badge color={stats.intake > 0 ? 'yellow' : 'teal'}>
              {stats.intake > 0 ? 'Потрібна реакція' : 'Все під контролем'}
            </Badge>
          </div>

          <p className="text-sm leading-6 text-text-secondary">
            {stats.intake > 0
              ? `Зараз ${stats.intake} заявок очікують на відповідь. Почни з вхідного потоку, а далі переходь до кейсів і документів.`
              : 'Нових заявок зараз немає. Можна спокійно працювати зі справами, AI-документами та календарем.'}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-text-primary">
                <AlertTriangle className="h-4 w-4 text-accent-amber" />
                <span className="text-sm font-medium">Intake не губиться</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Клієнтський бот уже прив’язує клієнтів через invite link і одразу
                шле юристу сповіщення в Telegram.
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-text-primary">
                <Sparkles className="h-4 w-4 text-accent-blue" />
                <span className="text-sm font-medium">AI-блок винесено в центр</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Документи більше не заховані в другорядних розділах: вони мають
                окремий акцент у dashboard і навігації.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              План і доступ
            </p>
            <h3 className="mt-2 text-xl font-semibold text-text-primary">{planLabel}</h3>
          </div>

          <p className="text-sm leading-6 text-text-secondary">
            Trial на 14 днів, Basic 499 або 599 грн/міс, Pro 999 грн/міс, Bureau /
            Business 2499 грн/міс.
          </p>

          <div className="space-y-2 rounded-[20px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">Поточний статус</span>
              <Badge color="blue">{statusLabel}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">AI-документи</span>
              <span className="text-sm font-medium text-text-primary">{aiDocsMeta}</span>
            </div>
            {stats.expiresAt ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-secondary">Діє до</span>
                <span className="text-sm font-medium text-text-primary">
                  {new Date(stats.expiresAt).toLocaleDateString('uk-UA')}
                </span>
              </div>
            ) : null}
          </div>

          <Button variant="secondary" onClick={() => navigate('/lawyer/settings')}>
            Відкрити розділ підписок
          </Button>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Єдиний контур
            </p>
            <h3 className="mt-2 text-xl font-semibold text-text-primary">
              Усі ключові інструменти юриста
            </h3>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {QUICK_LINKS.map(({ icon: Icon, title, description, path, color }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="glass-panel flex items-center gap-4 rounded-[22px] p-4 text-left transition hover:border-white/10 hover:bg-white/5"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
              </div>

              <ArrowRight className="h-4 w-4 text-text-muted" />
            </button>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
