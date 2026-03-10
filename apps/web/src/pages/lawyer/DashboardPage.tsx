import { useState, useEffect } from 'react';
import { Briefcase, Calendar, FileText, Inbox, Clock } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/case/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  todayAppointments: number;
  pendingIntake: number;
  totalDocuments: number;
}

export function LawyerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Try to load real stats, fallback to defaults
        const [casesRes, appointmentsRes, intakeRes] = await Promise.allSettled([
          api.get<{ total: number }>('/v1/cases?limit=0'),
          api.get<{ total: number }>('/v1/appointments?limit=0'),
          api.get<{ total: number }>('/v1/intake?limit=0'),
        ]);
        setStats({
          totalCases: casesRes.status === 'fulfilled' ? (casesRes.value.meta?.total ?? 0) : 0,
          activeCases: 0,
          todayAppointments: appointmentsRes.status === 'fulfilled' ? (appointmentsRes.value.meta?.total ?? 0) : 0,
          pendingIntake: intakeRes.status === 'fulfilled' ? (intakeRes.value.meta?.total ?? 0) : 0,
          totalDocuments: 0,
        });
      } catch {
        setStats({ totalCases: 0, activeCases: 0, todayAppointments: 0, pendingIntake: 0, totalDocuments: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner text="Завантаження панелі..." />;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            Вітаємо, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-navy-500 text-sm mt-1">Ваша панель управління</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Briefcase} label="Справи" value={stats?.totalCases ?? 0} />
          <StatCard icon={Calendar} label="Записи" value={stats?.todayAppointments ?? 0} />
          <StatCard icon={Inbox} label="Заявки" value={stats?.pendingIntake ?? 0} />
          <StatCard icon={FileText} label="Документи" value={stats?.totalDocuments ?? 0} />
        </div>

        <Card>
          <h2 className="font-semibold text-navy-800 mb-3">Сьогоднішні завдання</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gold-50 rounded-lg border border-gold-200">
              <Clock size={18} className="text-gold-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-800">Перевірити нові заявки</p>
                <p className="text-xs text-navy-500">Є нові звернення від клієнтів</p>
              </div>
              <Badge color="yellow">Очікує</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-lg">
              <Calendar size={18} className="text-navy-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-800">Консультації на сьогодні</p>
                <p className="text-xs text-navy-500">Перевірте розклад</p>
              </div>
              <Badge color="blue">{stats?.todayAppointments ?? 0}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
