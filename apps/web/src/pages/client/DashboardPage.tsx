import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Calendar } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CaseProgress } from '@/components/case/CaseProgress';
import { StatCard } from '@/components/case/StatCard';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ClientCase {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  nextAction?: string;
  nextDate?: string;
  courtDate?: string;
  _count?: { documents: number; messages: number };
}

export function ClientDashboardPage() {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<ClientCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ClientCase[]>('/v1/cases');
        const cases = res.data ?? [];
        setCaseData(cases[0] ?? null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner text="Завантаження..." />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">
          Вітаємо, {user?.name?.split(' ')[0]}!
        </h1>

        {caseData ? (
          <>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-navy-800 text-sm">{caseData.title}</p>
                <span className="text-xs font-mono text-navy-400">{caseData.caseNumber}</span>
              </div>
              <CaseProgress currentStatus={caseData.status} />
            </Card>

            {caseData.nextAction && (
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                <p className="text-xs text-gold-700 font-medium mb-1">Наступний крок</p>
                <p className="font-semibold text-navy-900 text-sm">{caseData.nextAction}</p>
                {caseData.nextDate && (
                  <p className="text-xs text-navy-500 mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(caseData.nextDate).toLocaleDateString('uk-UA')}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={FileText} label="Документів" value={caseData._count?.documents ?? 0} />
              <StatCard icon={MessageSquare} label="Повідомлень" value={caseData._count?.messages ?? 0} />
              <StatCard
                icon={Calendar}
                label={caseData.courtDate ? 'Дата суду' : 'Суд'}
                value={caseData.courtDate ? new Date(caseData.courtDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '---'}
              />
            </div>
          </>
        ) : (
          <Card>
            <p className="text-sm text-navy-500 text-center py-8">
              У вас поки немає активних справ. Зверніться до юриста для створення справи.
            </p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
