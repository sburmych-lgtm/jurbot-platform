import { useState, useEffect } from 'react';
import { Briefcase, Calendar, Inbox, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/case/StatCard';

interface DashStats {
  cases: number;
  appointments: number;
  intake: number;
}

export function LawyerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats>({ cases: 0, appointments: 0, intake: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.get<{ items: unknown[] }>('/v1/cases?limit=0'),
          api.get<{ items: unknown[] }>('/v1/appointments?limit=0'),
          api.get<{ items: unknown[] }>('/v1/intake?limit=0'),
        ]);
        setStats({
          cases: results[0].status === 'fulfilled' ? (results[0].value.data?.items?.length ?? 0) : 0,
          appointments: results[1].status === 'fulfilled' ? (results[1].value.data?.items?.length ?? 0) : 0,
          intake: results[2].status === 'fulfilled' ? (results[2].value.data?.items?.length ?? 0) : 0,
        });
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
          <p className="text-text-secondary text-sm mt-2">Ваша практика на одному екрані</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Briefcase} label="Справи" value={stats.cases} />
          <StatCard icon={Calendar} label="Зустрічі" value={stats.appointments} />
          <StatCard icon={Inbox} label="Заявки" value={stats.intake} />
        </div>

        {/* Priority section */}
        {stats.intake > 0 && (
          <Card className="border-accent-amber/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-accent-amber/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-accent-amber" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{stats.intake} нових заявок</p>
                <p className="text-xs text-text-muted">Потребують вашої уваги</p>
              </div>
              <Badge color="yellow">Нові</Badge>
            </div>
          </Card>
        )}

        {/* Quick tools */}
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Інструменти</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex items-center gap-3 cursor-pointer active:scale-[0.98]">
              <div className="w-10 h-10 rounded-[10px] bg-accent-blue/15 flex items-center justify-center">
                <FileText size={20} className="text-accent-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">AI Документи</p>
                <p className="text-xs text-text-muted">Генерація</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 cursor-pointer active:scale-[0.98]">
              <div className="w-10 h-10 rounded-[10px] bg-accent-teal/15 flex items-center justify-center">
                <TrendingUp size={20} className="text-accent-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Статистика</p>
                <p className="text-xs text-text-muted">Аналітика</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
