import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, FileText, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  lawyer?: { user: { name: string } };
}

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<CaseData[]>('/v1/cases?limit=50');
        setCaseData(res.data?.[0] ?? null);
      } catch {
        setCaseData(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <Spinner text="Завантаження..." subtext="Готуємо ваш кабінет" />;
  }

  const firstName = user?.name?.split(' ')[0] ?? 'друже';

  return (
    <PageContainer className="space-y-2.5 sm:space-y-4">
      <Card>
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted sm:text-xs">ЮрБот</p>
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Вітаємо, {firstName}</h1>
          <p className="text-sm text-text-secondary">
            Запис доступний через miniapp. Оберіть потрібну дію нижче.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button size="md" onClick={() => navigate('/client/booking')}>
          <Calendar size={16} />
          Запис
        </Button>
        <Button size="md" onClick={() => navigate('/client/messages')}>
          <MessageSquareText size={16} />
          Повідомлення
        </Button>
        <Button size="md" onClick={() => navigate('/client/case')}>
          <Briefcase size={16} />
          Моя справа
        </Button>
        <Button size="md" onClick={() => navigate('/client/documents')}>
          <FileText size={16} />
          Документи
        </Button>
      </div>

      {caseData ? (
        <Card>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Поточна справа</p>
            <p className="text-sm font-semibold text-text-primary">{caseData.title}</p>
            <p className="text-xs text-text-secondary">
              {caseData.caseNumber} · {caseData.status}
            </p>
            {caseData.lawyer?.user?.name ? (
              <p className="text-xs text-text-secondary">Ваш адвокат: {caseData.lawyer.user.name}</p>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-text-secondary">
            Активних справ поки немає. Після підключення від адвоката вони зʼявляться тут.
          </p>
        </Card>
      )}
    </PageContainer>
  );
}
