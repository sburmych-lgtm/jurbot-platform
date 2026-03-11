import { useState, useEffect } from 'react';
import { Copy, Link, Settings, CreditCard, Shield, Check } from 'lucide-react';
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

const planLabels: Record<string, string> = {
  TRIAL: 'Trial (14 днів)',
  BASIC: 'Basic (499₴/міс)',
  PRO: 'Pro (1499₴/міс)',
  BUREAU: 'Bureau (3999₴/міс)',
};

const statusColors: Record<string, 'green' | 'yellow' | 'red' | 'teal'> = {
  ACTIVE: 'green',
  TRIAL: 'teal',
  EXPIRED: 'red',
  CANCELLED: 'red',
};

export function SettingsPage() {
  const { showToast } = useToast();
  const [subData, setSubData] = useState<SubData | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, tokRes] = await Promise.all([
          api.get<SubData>('/v1/subscription'),
          api.get<{ items: TokenItem[] }>('/v1/tokens'),
        ]);
        setSubData(subRes.data ?? null);
        setTokens(tokRes.data?.items ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const copyInviteLink = (token: string) => {
    const link = `https://t.me/YurBotClientBot?start=inv_${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Посилання скопійовано');
    setTimeout(() => setCopied(false), 2000);
  };

  const createToken = async () => {
    try {
      const res = await api.post<TokenItem>('/v1/tokens', { tokenType: 'PUBLIC_LAWYER' });
      if (res.data) setTokens(prev => [res.data!, ...prev]);
      showToast('Токен створено');
    } catch {}
  };

  if (loading) return <Spinner />;

  const sub = subData?.subscription;
  const usage = subData?.usage;
  const limits = subData?.limits;

  const usagePercent = (current: number, max: number | null) => {
    if (max === null) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-text-primary">Налаштування</h1>

        {/* Subscription */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] bg-accent-blue/15 flex items-center justify-center">
              <CreditCard size={20} className="text-accent-blue" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">Підписка</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{planLabels[sub?.plan ?? ''] ?? sub?.plan ?? 'Немає'}</span>
                {sub && <Badge color={statusColors[sub.status] ?? 'gray'}>{sub.status}</Badge>}
              </div>
            </div>
          </div>

          {sub?.expiresAt && (
            <p className="text-xs text-text-muted mb-3">
              Діє до: {new Date(sub.expiresAt).toLocaleDateString('uk-UA')}
            </p>
          )}

          {usage && limits && (
            <div className="space-y-3">
              <ProgressBar
                value={usagePercent(usage.clientsCount, limits.maxClients)}
                label={`Клієнти: ${usage.clientsCount}${limits.maxClients ? ` / ${limits.maxClients}` : ' (необмежено)'}`}
                showPercent={limits.maxClients !== null}
              />
              <ProgressBar
                value={usagePercent(usage.casesCount, limits.maxCases)}
                label={`Справи: ${usage.casesCount}${limits.maxCases ? ` / ${limits.maxCases}` : ' (необмежено)'}`}
                showPercent={limits.maxCases !== null}
              />
              <ProgressBar
                value={usagePercent(usage.aiDocsCount, limits.maxAiDocs)}
                label={`AI документи: ${usage.aiDocsCount}${limits.maxAiDocs ? ` / ${limits.maxAiDocs}` : ' (необмежено)'}`}
                showPercent={limits.maxAiDocs !== null}
              />
            </div>
          )}
        </Card>

        {/* Invite Links */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-accent-teal/15 flex items-center justify-center">
                <Link size={20} className="text-accent-teal" />
              </div>
              <p className="text-sm font-semibold text-text-primary">Запрошення</p>
            </div>
            <Button size="sm" onClick={createToken}>+ Нове</Button>
          </div>

          {tokens.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">Немає активних запрошень</p>
          ) : (
            <div className="space-y-2">
              {tokens.filter(t => t.isActive).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-bg-tertiary rounded-[10px] px-3 py-2">
                  <div>
                    <p className="text-xs text-text-muted font-mono">inv_{t.token.slice(0, 8)}...</p>
                    <p className="text-xs text-text-muted">{t.usageCount} використань</p>
                  </div>
                  <button
                    onClick={() => copyInviteLink(t.token)}
                    className="p-2 rounded-[8px] hover:bg-bg-hover transition"
                  >
                    {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} className="text-text-muted" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
