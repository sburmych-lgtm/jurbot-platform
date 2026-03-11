import { useState, useEffect } from 'react';
import { Briefcase, FileText, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

export function ClientDashboardPage() {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CaseData[]>('/v1/cases');
        const items = res.data ?? [];
        if (items.length > 0) setCaseData(items[0] ?? null);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <PageContainer>
      <div className="space-y-5">
        {/* Hero */}
        <div className="bg-gradient-to-br from-bg-elevated to-bg-card rounded-[18px] border border-border-default p-5">
          <p className="text-text-muted text-sm">Вітаю,</p>
          <h1 className="text-2xl font-bold text-text-primary font-display mt-1">{firstName}</h1>
          {caseData?.lawyer && (
            <p className="text-text-secondary text-sm mt-2">Ваш адвокат: {caseData.lawyer.user.name}</p>
          )}
        </div>

        {caseData ? (
          <>
            {/* Case snapshot */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{caseData.title}</p>
                  <p className="text-xs text-text-muted font-mono">{caseData.caseNumber}</p>
                </div>
                <Badge color="teal">{caseData.status}</Badge>
              </div>
              <CaseProgress currentStatus={caseData.status} />
            </Card>

            {/* Next action */}
            {caseData.nextAction && (
              <Card className="border-accent-amber/30">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-accent-amber shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{caseData.nextAction}</p>
                    {caseData.nextDate && (
                      <p className="text-xs text-text-muted">{new Date(caseData.nextDate).toLocaleDateString('uk-UA')}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Action grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center cursor-pointer active:scale-[0.98]">
                <FileText size={24} className="mx-auto text-accent-blue mb-2" />
                <p className="text-sm font-medium text-text-primary">Файли</p>
              </Card>
              <Card className="text-center cursor-pointer active:scale-[0.98]">
                <Calendar size={24} className="mx-auto text-accent-teal mb-2" />
                <p className="text-sm font-medium text-text-primary">Запис</p>
              </Card>
            </div>
          </>
        ) : (
          <Card className="text-center py-8">
            <Briefcase size={48} className="mx-auto text-text-muted/50 mb-3" />
            <p className="text-text-secondary font-medium">Справу ще не створено</p>
            <p className="text-text-muted text-sm mt-1">Ваш адвокат скоро зв'яжеться</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
