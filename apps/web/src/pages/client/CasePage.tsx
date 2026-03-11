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
  FAMILY: 'Сімейне', CIVIL: 'Цивільне', COMMERCIAL: 'Господарське',
  CRIMINAL: 'Кримінальне', MIGRATION: 'Міграційне', REALESTATE: 'Нерухомість',
  LABOR: 'Трудове', OTHER: 'Інше',
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
  if (!caseData) return <EmptyState icon={Briefcase} title="Справу не знайдено" />;

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
            <SummaryRow label="Категорія" value={categoryLabels[caseData.category] ?? caseData.category} />
            <SummaryRow label="Адвокат" value={caseData.lawyer?.user?.name} />
            {caseData.courtName && <SummaryRow label="Суд" value={caseData.courtName} />}
            {caseData.courtDate && <SummaryRow label="Дата суду" value={new Date(caseData.courtDate).toLocaleDateString('uk-UA')} />}
            <SummaryRow label="Створено" value={new Date(caseData.createdAt).toLocaleDateString('uk-UA')} />
          </div>
        </Card>

        {caseData.description && (
          <Card>
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Опис</h3>
            <p className="text-sm text-text-primary leading-relaxed">{caseData.description}</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
