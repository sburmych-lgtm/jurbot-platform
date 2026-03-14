import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, FileText, Inbox, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/case/StatCard';

interface DashboardStats {
  intake: number;
  cases: number;
  appointments: number;
  docs: number;
}

export function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    intake: 0,
    cases: 0,
    appointments: 0,
    docs: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [intakeRes, casesRes, appointmentsRes, docsRes] = await Promise.all([
          api.get<unknown[]>('/v1/intake?limit=200'),
          api.get<unknown[]>('/v1/cases?limit=200'),
          api.get<unknown[]>('/v1/appointments?limit=200'),
          api.get<unknown[]>('/v1/documents?limit=200'),
        ]);

        setStats({
          intake: intakeRes.data?.length ?? 0,
          cases: casesRes.data?.length ?? 0,
          appointments: appointmentsRes.data?.length ?? 0,
          docs: docsRes.data?.length ?? 0,
        });
      } catch {
        // keep zero-state if API partially unavailable
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <Spinner text="Завантаження..." subtext="Підтягуємо ваші показники" />;
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Колего';

  return (
    <PageContainer className="space-y-4">
      <Card>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted">ЮрБот Pro</p>
          <h1 className="text-2xl font-semibold text-text-primary">Вітаю, {firstName}</h1>
          <p className="text-sm text-text-secondary">
            Ваш операційний кабінет адвоката. Усе основне нижче, без зайвих кроків.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Inbox} label="Заявки" value={stats.intake} />
        <StatCard icon={Briefcase} label="Справи" value={stats.cases} />
        <StatCard icon={Calendar} label="Розклад" value={stats.appointments} />
        <StatCard icon={FileText} label="Документи" value={stats.docs} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="md" onClick={() => navigate('/lawyer/intake')}>
          Заявки
        </Button>
        <Button size="md" onClick={() => navigate('/lawyer/cases')}>
          Справи
        </Button>
        <Button size="md" onClick={() => navigate('/lawyer/schedule')}>
          Розклад
        </Button>
        <Button size="md" onClick={() => navigate('/lawyer/documents')}>
          Генерація документа
        </Button>
      </div>

      <Button size="lg" variant="secondary" className="w-full" onClick={() => navigate('/lawyer/clients')}>
        <Users size={18} />
        Клієнти
      </Button>
    </PageContainer>
  );
}
