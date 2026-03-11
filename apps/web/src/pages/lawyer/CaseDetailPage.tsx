import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CaseProgress } from '@/components/case/CaseProgress';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { Spinner } from '@/components/ui/Spinner';

interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  description?: string;
  courtName?: string;
  courtDate?: string;
  nextAction?: string;
  nextDate?: string;
  createdAt: string;
  client?: { user: { name: string; email: string; phone?: string } };
  lawyer?: { user: { name: string } };
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CaseDetail>(`/v1/cases/${id}`);
        setData(res.data ?? null);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center py-8 text-text-muted">\u0421\u043f\u0440\u0430\u0432\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text-primary truncate">{data.title}</h1>
            <p className="text-sm text-text-muted font-mono">{data.caseNumber}</p>
          </div>
        </div>

        <Card>
          <CaseProgress currentStatus={data.status} />
        </Card>

        <Card>
          <div className="space-y-3">
            <SummaryRow label="\u041a\u043b\u0456\u0454\u043d\u0442" value={data.client?.user?.name} />
            <SummaryRow label="Email" value={data.client?.user?.email} />
            <SummaryRow label="\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f" value={data.category} />
            <SummaryRow label="\u0422\u0435\u0440\u043c\u0456\u043d\u043e\u0432\u0456\u0441\u0442\u044c" value={data.urgency} />
            {data.courtName && <SummaryRow label="\u0421\u0443\u0434" value={data.courtName} />}
            {data.courtDate && <SummaryRow label="\u0414\u0430\u0442\u0430 \u0441\u0443\u0434\u0443" value={new Date(data.courtDate).toLocaleDateString('uk-UA')} />}
            <SummaryRow label="\u0421\u0442\u0432\u043e\u0440\u0435\u043d\u043e" value={new Date(data.createdAt).toLocaleDateString('uk-UA')} />
          </div>
        </Card>

        {data.description && (
          <Card>
            <h3 className="text-sm font-semibold text-text-secondary mb-2">\u041e\u043f\u0438\u0441</h3>
            <p className="text-sm text-text-primary leading-relaxed">{data.description}</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
