import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CaseProgress } from '@/components/case/CaseProgress';
import { Card } from '@/components/ui/Card';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

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
        setCaseData(res.data?.[0] ?? null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner />;

  if (!caseData) {
    return (
      <PageContainer>
        <EmptyState icon={Briefcase} title="Справа не знайдена" description="Зверніться до вашого юриста" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Моя справа</h1>

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
            {caseData.nextDate && <p className="text-xs text-navy-500 mt-1">{new Date(caseData.nextDate).toLocaleDateString('uk-UA')}</p>}
          </div>
        )}

        <Card>
          <h3 className="font-semibold text-navy-800 mb-3">Деталі</h3>
          <div className="space-y-2">
            <SummaryRow label="Категорія" value={categoryLabels[caseData.category] ?? caseData.category} />
            {caseData.lawyer && <SummaryRow label="Юрист" value={caseData.lawyer.user.name} />}
            {caseData.courtName && <SummaryRow label="Суд" value={caseData.courtName} />}
            {caseData.courtDate && <SummaryRow label="Дата суду" value={new Date(caseData.courtDate).toLocaleDateString('uk-UA')} />}
            <SummaryRow label="Створено" value={new Date(caseData.createdAt).toLocaleDateString('uk-UA')} />
          </div>
        </Card>

        {caseData.description && (
          <Card>
            <h3 className="font-semibold text-navy-800 mb-2">Опис</h3>
            <p className="text-sm text-navy-600">{caseData.description}</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
