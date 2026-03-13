import { useEffect, useState } from 'react';
import { Check, Copy, CreditCard, Link, Shield, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface SubData {
  subscription: {
    plan: string;
    status: string;
    expiresAt: string | null;
    trialUsed: boolean;
  } | null;
  usage: {
    clientsCount: number;
    casesCount: number;
    aiDocsCount: number;
  } | null;
  limits: {
    maxClients: number | null;
    maxCases: number | null;
    maxAiDocs: number | null;
    maxLawyers?: number | null;
  } | null;
}

interface TokenItem {
  id: string;
  token: string;
  tokenType: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface PricingPlan {
  key: string;
  title: string;
  price: string;
  subtitle: string;
  bullets: string[];
}

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Trial - 14 днів безкоштовно',
  BASIC: 'Basic - 499 грн/міс або 599 грн/міс',
  PRO: 'Pro - 999 грн/міс',
  BUREAU: 'Bureau / Business - 2499 грн/міс',
};

const STATUS_COLORS: Record<string, 'green' | 'teal' | 'red' | 'blue'> = {
  ACTIVE: 'green',
  TRIAL: 'teal',
  EXPIRED: 'red',
  CANCELLED: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна',
  TRIAL: 'Тріал',
  EXPIRED: 'Протермінована',
  CANCELLED: 'Скасована',
};

const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'TRIAL',
    title: 'Trial',
    price: '14 днів безкоштовно',
    subtitle: 'Швидкий старт без оплати',
    bullets: [
      'Повний стартовий доступ до Mini App',
      "Invite flow і зв'язка lawyer-client",
      'Перевірка реального робочого процесу перед оплатою',
    ],
  },
  {
    key: 'BASIC',
    title: 'Basic',
    price: '499 грн/міс або 599 грн/міс',
    subtitle: 'Для solo-practice',
    bullets: [
      'До 20 клієнтів',
      'До 10 активних справ',
      'До 5 AI-документів на період',
    ],
  },
  {
    key: 'PRO',
    title: 'Pro',
    price: '999 грн/міс',
    subtitle: 'Для активної приватної практики',
    bullets: [
      'До 100 клієнтів',
      'До 50 справ',
      'До 30 AI-документів на період',
    ],
  },
  {
    key: 'BUREAU',
    title: 'Bureau / Business',
    price: '2499 грн/міс',
    subtitle: 'Для бюро та команд',
    bullets: [
      'Без ліміту на клієнтів',
      'Без ліміту на справи й AI-документи',
      'До 5 юристів у контурі організації',
    ],
  },
];

export function SettingsPage() {
  const { showToast } = useToast();
  const [subData, setSubData] = useState<SubData | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [subRes, tokRes] = await Promise.all([
          api.get<SubData>('/v1/subscription'),
          api.get<{ items: TokenItem[] }>('/v1/tokens'),
        ]);

        setSubData(subRes.data ?? null);
        setTokens(tokRes.data?.items ?? []);
      } catch {
        // Keep the shell responsive even if one of the endpoints is unavailable.
      }

      setLoading(false);
    })();
  }, []);

  const copyInviteLink = async (token: string) => {
    const link = `https://t.me/YurBotClientBot?start=inv_${token}`;

    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    showToast('Посилання скопійовано');
    window.setTimeout(() => setCopiedToken(null), 1800);
  };

  const createToken = async () => {
    try {
      const res = await api.post<TokenItem>('/v1/tokens', { tokenType: 'PUBLIC_LAWYER' });

      if (res.data) {
        const created = res.data;
        setTokens((prev) => [created, ...prev]);
      }

      showToast('Токен створено');
    } catch {
      showToast('Не вдалося створити токен');
    }
  };

  if (loading) {
    return (
      <Spinner
        text="Завантажуємо налаштування..."
        subtext="Підтягуємо підписку, usage та invite tokens."
      />
    );
  }

  const sub = subData?.subscription;
  const usage = subData?.usage;
  const limits = subData?.limits;
  const currentPlanLabel = sub?.plan ? PLAN_LABELS[sub.plan] ?? sub.plan : PLAN_LABELS.TRIAL;
  const currentStatusLabel = sub?.status ? STATUS_LABELS[sub.status] ?? sub.status : 'Тріал';
  const currentStatusColor = sub?.status ? STATUS_COLORS[sub.status] ?? 'teal' : 'teal';
  const activeTokens = tokens.filter((token) => token.isActive);

  const usagePercent = (current: number, max: number | null) => {
    if (max === null) {
      return 0;
    }

    return Math.min(100, Math.round((current / max) * 100));
  };

  const expiresInDays = sub?.expiresAt
    ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <PageContainer className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-text-muted">Налаштування</p>
        <h1 className="text-3xl font-semibold text-text-primary">План, trial і доступ</h1>
        <p className="max-w-2xl text-sm leading-6 text-text-secondary">
          Тут винесено все, що стосується тарифів, лімітів, AI-документів і
          запрошень клієнтів.
        </p>
      </div>

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(0,200,180,0.2),transparent_45%),linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="blue">{currentPlanLabel}</Badge>
              <Badge color={currentStatusColor}>{currentStatusLabel}</Badge>
              {expiresInDays !== null && sub?.status === 'TRIAL' ? (
                <Badge color="teal">Ще {expiresInDays} дн.</Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-text-primary">
                Комерційна модель YurBot
              </h2>
              <p className="text-sm leading-6 text-text-secondary">
                Trial - 14 днів безкоштовно. Basic - 499 грн/міс або 599 грн/міс.
                Pro - 999 грн/міс. Bureau / Business - 2499 грн/міс.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <CreditCard className="h-4 w-4 text-accent-blue" />
                  <span className="text-sm font-medium">Поточний план</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{currentPlanLabel}</p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Sparkles className="h-4 w-4 text-accent-teal" />
                  <span className="text-sm font-medium">AI-документи</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {usage && limits
                    ? limits.maxAiDocs === null
                      ? `${usage.aiDocsCount} використано, ліміт відсутній`
                      : `${usage.aiDocsCount} з ${limits.maxAiDocs} використано`
                    : 'Дані usage тимчасово недоступні'}
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Shield className="h-4 w-4 text-accent-amber" />
                  <span className="text-sm font-medium">Invite-контур</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  Активних посилань: {activeTokens.length}. Новий клієнт одразу
                  прив'язується до твого профілю.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Поточне використання
            </p>

            <div className="mt-4 space-y-4">
              <SummaryRow
                label="Клієнти"
                value={
                  usage
                    ? limits?.maxClients === null
                      ? `${usage.clientsCount} / без ліміту`
                      : `${usage.clientsCount} / ${limits?.maxClients ?? 0}`
                    : '—'
                }
              />
              {usage && limits?.maxClients !== null ? (
                <ProgressBar value={usagePercent(usage.clientsCount, limits!.maxClients)} />
              ) : null}

              <SummaryRow
                label="Справи"
                value={
                  usage
                    ? limits?.maxCases === null
                      ? `${usage.casesCount} / без ліміту`
                      : `${usage.casesCount} / ${limits?.maxCases ?? 0}`
                    : '—'
                }
              />
              {usage && limits?.maxCases !== null ? (
                <ProgressBar value={usagePercent(usage.casesCount, limits!.maxCases)} />
              ) : null}

              <SummaryRow
                label="AI-документи"
                value={
                  usage
                    ? limits?.maxAiDocs === null
                      ? `${usage.aiDocsCount} / без ліміту`
                      : `${usage.aiDocsCount} / ${limits?.maxAiDocs ?? 0}`
                    : '—'
                }
              />
              {usage && limits?.maxAiDocs !== null ? (
                <ProgressBar value={usagePercent(usage.aiDocsCount, limits!.maxAiDocs)} />
              ) : null}

              {sub?.expiresAt ? (
                <SummaryRow
                  label="Діє до"
                  value={new Date(sub.expiresAt).toLocaleDateString('uk-UA')}
                />
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
            Тарифна сітка
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">
            Видимі плани замість прихованих налаштувань
          </h2>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.key || (!sub?.plan && plan.key === 'TRIAL');

            return (
              <Card
                key={plan.key}
                className={`space-y-4 ${
                  isCurrent ? 'border-accent-blue/30 bg-accent-blue/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">{plan.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{plan.subtitle}</p>
                  </div>
                  {isCurrent ? <Badge color="blue">Поточний</Badge> : null}
                </div>

                <div>
                  <p className="text-lg font-semibold text-text-primary">{plan.price}</p>
                </div>

                <div className="space-y-2">
                  {plan.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Запрошення
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              Invite links для клієнтів
            </h2>
          </div>

          <Button onClick={createToken}>+ Нове запрошення</Button>
        </div>

        <Card className="space-y-4">
          <p className="text-sm leading-6 text-text-secondary">
            Надішли клієнту invite link, і він автоматично потрапить до твого
            lawyer-контуру в Telegram та Mini App.
          </p>

          {activeTokens.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/5 p-5 text-sm text-text-muted">
              Немає активних запрошень.
            </div>
          ) : (
            <div className="space-y-3">
              {activeTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-text-primary">
                      <Link className="h-4 w-4 text-accent-blue" />
                      <span className="text-sm font-medium">inv_{token.token.slice(0, 8)}...</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Використань: {token.usageCount} · створено{' '}
                      {new Date(token.createdAt).toLocaleDateString('uk-UA')}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      void copyInviteLink(token.token);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {copiedToken === token.token ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>{copiedToken === token.token ? 'Скопійовано' : 'Копіювати'}</span>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </PageContainer>
  );
}
