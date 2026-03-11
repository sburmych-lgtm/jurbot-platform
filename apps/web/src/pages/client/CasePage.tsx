import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { CaseProgress } from '@/components/case/CaseProgress';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  description?: string;
  courtName?: string;
  courtDate?: string;
  nextAction?: string;
  nextDate?: string;
  createdAt: string;
  lawyer?: { user: { name: string } };
}

const categoryLabels: Record<string, string> = {
  FAMILY: '\u0421\u0456\u043c\u0435\u0439\u043d\u0435', CIVIL: '\u0426\u0438\u0432\u0456\u043b\u044c\u043d\u0435', COMMERCIAL: '\u0413\u043e\u0441\u043f\u043e\u0434\u0430\u0440\u0441\u044c\u043a\u0435',
  CRIMINAL: '\u041a\u0440\u0438\u043c\u0456\u043d\u0430\u043b\u044c\u043d\u0435', MIGRATION: '\u041c\u0456\u0433\u0440\u0430\u0446\u0456\u0439\u043d\u0435', REALESTATE: '\u041d\u0435\u0440\u0443\u0445\u043e\u043c\u0456\u0441\u0442\u044c',
  LABOR: '\u0422\u0440\u0443\u0434\u043e\u0432\u0435', OTHER: '\u0406\u043d\u0448\u0435',
};

export function ClientCasePage() {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CaseDetail[]>('/v1/cases');
        const items = res.data ?? [];
        if (items.length > 0) setCaseData(items[0] ?? null);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!caseData) return <EmptyState icon={Briefcase} title="\u0421\u043f\u0440\u0430\u0432\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e" />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{caseData.title}</h1>
          <p className="text-sm text-text-muted font-mono">{caseData.caseNumber}</p>
        </div>

        <Card>
          <CaseProgress currentStatus={caseData.status} />
        </Card>

        {caseData.nextAction && (
          <Card className="border-accent-amber/30 bg-accent-amber/5">
            <p className="text-sm font-medium text-text-primary">{caseData.nextAction}</p>
            {caseData.nextDate && (
              <p className="text-xs text-text-muted mt-1">{new Date(caseData.nextDate).toLocaleDateString('uk-UA')}</p>
            )}
          </Card>
        )}

        <Card>
          <div className="space-y-3">
            <SummaryRow label="\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f" value={categoryLabels[caseData.category] ?? caseData.category} />
            <SummaryRow label="\u0410\u0434\u0432\u043e\u043a\u0430\u0442" value={caseData.lawyer?.user?.name} />
            {caseData.courtName && <SummaryRow label="\u0421\u0443\u0434" value={caseData.courtName} />}
            {caseData.courtDate && <SummaryRow label="\u0414\u0430\u0442\u0430 \u0441\u0443\u0434\u0443" value={new Date(caseData.courtDate).toLocaleDateString('uk-UA')} />}
            <SummaryRow label="\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e" value={new Date(caseData.createdAt).toLocaleDateString('uk-UA')} />
          </div>
        </Card>

        {caseData.description && (
          <Card>
            <h3 className="text-sm font-semibold text-text-secondary mb-2">\u041e\u043f\u0438\u0441</h3>
            <p className="text-sm text-text-primary leading-relaxed">{caseData.description}</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
