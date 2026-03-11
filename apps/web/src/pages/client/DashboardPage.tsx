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
          <p className="text-text-muted text-sm">\u0412\u0456\u0442\u0430\u044e,</p>
          <h1 className="text-2xl font-bold text-text-primary font-display mt-1">{firstName}</h1>
          {caseData?.lawyer && (
            <p className="text-text-secondary text-sm mt-2">\u0412\u0430\u0448 \u0430\u0434\u0432\u043e\u043a\u0430\u0442: {caseData.lawyer.user.name}</p>
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
                <p className="text-sm font-medium text-text-primary">\u0424\u0430\u0439\u043b\u0438</p>
              </Card>
              <Card className="text-center cursor-pointer active:scale-[0.98]">
                <Calendar size={24} className="mx-auto text-accent-teal mb-2" />
                <p className="text-sm font-medium text-text-primary">\u0417\u0430\u043f\u0438\u0441</p>
              </Card>
            </div>
          </>
        ) : (
          <Card className="text-center py-8">
            <Briefcase size={48} className="mx-auto text-text-muted/50 mb-3" />
            <p className="text-text-secondary font-medium">\u0421\u043f\u0440\u0430\u0432\u0443 \u0449\u0435 \u043d\u0435 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e</p>
            <p className="text-text-muted text-sm mt-1">\u0412\u0430\u0448 \u0430\u0434\u0432\u043e\u043a\u0430\u0442 \u0441\u043a\u043e\u0440\u043e \u0437\u0432'\u044f\u0436\u0435\u0442\u044c\u0441\u044f</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
