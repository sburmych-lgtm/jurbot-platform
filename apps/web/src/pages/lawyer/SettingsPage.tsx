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
  TRIAL: 'Trial (14 \u0434\u043d\u0456\u0432)',
  BASIC: 'Basic (499\u20b4/\u043c\u0456\u0441)',
  PRO: 'Pro (1499\u20b4/\u043c\u0456\u0441)',
  BUREAU: 'Bureau (3999\u20b4/\u043c\u0456\u0441)',
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
    showToast('\u041f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f \u0441\u043a\u043e\u043f\u0456\u0439\u043e\u0432\u0430\u043d\u043e');
    setTimeout(() => setCopied(false), 2000);
  };

  const createToken = async () => {
    try {
      const res = await api.post<TokenItem>('/v1/tokens', { tokenType: 'PUBLIC_LAWYER' });
      if (res.data) setTokens(prev => [res.data!, ...prev]);
      showToast('\u0422\u043e\u043a\u0435\u043d \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e');
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
        <h1 className="text-xl font-bold text-text-primary">\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f</h1>

        {/* Subscription */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] bg-accent-blue/15 flex items-center justify-center">
              <CreditCard size={20} className="text-accent-blue" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">\u041f\u0456\u0434\u043f\u0438\u0441\u043a\u0430</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{planLabels[sub?.plan ?? ''] ?? sub?.plan ?? '\u041d\u0435\u043c\u0430\u0454'}</span>
                {sub && <Badge color={statusColors[sub.status] ?? 'gray'}>{sub.status}</Badge>}
              </div>
            </div>
          </div>

          {sub?.expiresAt && (
            <p className="text-xs text-text-muted mb-3">
              \u0414\u0456\u0454 \u0434\u043e: {new Date(sub.expiresAt).toLocaleDateString('uk-UA')}
            </p>
          )}

          {usage && limits && (
            <div className="space-y-3">
              <ProgressBar
                value={usagePercent(usage.clientsCount, limits.maxClients)}
                label={`\u041a\u043b\u0456\u0454\u043d\u0442\u0438: ${usage.clientsCount}${limits.maxClients ? ` / ${limits.maxClients}` : ' (\u043d\u0435\u043e\u0431\u043c\u0435\u0436\u0435\u043d\u043e)'}`}
                showPercent={limits.maxClients !== null}
              />
              <ProgressBar
                value={usagePercent(usage.casesCount, limits.maxCases)}
                label={`\u0421\u043f\u0440\u0430\u0432\u0438: ${usage.casesCount}${limits.maxCases ? ` / ${limits.maxCases}` : ' (\u043d\u0435\u043e\u0431\u043c\u0435\u0436\u0435\u043d\u043e)'}`}
                showPercent={limits.maxCases !== null}
              />
              <ProgressBar
                value={usagePercent(usage.aiDocsCount, limits.maxAiDocs)}
                label={`AI \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0438: ${usage.aiDocsCount}${limits.maxAiDocs ? ` / ${limits.maxAiDocs}` : ' (\u043d\u0435\u043e\u0431\u043c\u0435\u0436\u0435\u043d\u043e)'}`}
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
              <p className="text-sm font-semibold text-text-primary">\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u043d\u044f</p>
            </div>
            <Button size="sm" onClick={createToken}>+ \u041d\u043e\u0432\u0435</Button>
          </div>

          {tokens.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">\u041d\u0435\u043c\u0430\u0454 \u0430\u043a\u0442\u0438\u0432\u043d\u0438\u0445 \u0437\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u044c</p>
          ) : (
            <div className="space-y-2">
              {tokens.filter(t => t.isActive).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-bg-tertiary rounded-[10px] px-3 py-2">
                  <div>
                    <p className="text-xs text-text-muted font-mono">inv_{t.token.slice(0, 8)}...</p>
                    <p className="text-xs text-text-muted">{t.usageCount} \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u043d\u044c</p>
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
