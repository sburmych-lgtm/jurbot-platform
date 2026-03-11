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
          <p className="text-text-muted text-sm">\u0412\u0456\u0442\u0430\u044e,</p>
          <h1 className="text-2xl font-bold text-text-primary font-display mt-1">{firstName}</h1>
          <p className="text-text-secondary text-sm mt-2">\u0412\u0430\u0448\u0430 \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430 \u043d\u0430 \u043e\u0434\u043d\u043e\u043c\u0443 \u0435\u043a\u0440\u0430\u043d\u0456</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Briefcase} label="\u0421\u043f\u0440\u0430\u0432\u0438" value={stats.cases} />
          <StatCard icon={Calendar} label="\u0417\u0443\u0441\u0442\u0440\u0456\u0447\u0456" value={stats.appointments} />
          <StatCard icon={Inbox} label="\u0417\u0430\u044f\u0432\u043a\u0438" value={stats.intake} />
        </div>

        {/* Priority section */}
        {stats.intake > 0 && (
          <Card className="border-accent-amber/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-accent-amber/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-accent-amber" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{stats.intake} \u043d\u043e\u0432\u0438\u0445 \u0437\u0430\u044f\u0432\u043e\u043a</p>
                <p className="text-xs text-text-muted">\u041f\u043e\u0442\u0440\u0435\u0431\u0443\u044e\u0442\u044c \u0432\u0430\u0448\u043e\u0457 \u0443\u0432\u0430\u0433\u0438</p>
              </div>
              <Badge color="yellow">\u041d\u043e\u0432\u0456</Badge>
            </div>
          </Card>
        )}

        {/* Quick tools */}
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">\u0406\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0438</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex items-center gap-3 cursor-pointer active:scale-[0.98]">
              <div className="w-10 h-10 rounded-[10px] bg-accent-blue/15 flex items-center justify-center">
                <FileText size={20} className="text-accent-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">AI \u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0438</p>
                <p className="text-xs text-text-muted">\u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0456\u044f</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 cursor-pointer active:scale-[0.98]">
              <div className="w-10 h-10 rounded-[10px] bg-accent-teal/15 flex items-center justify-center">
                <TrendingUp size={20} className="text-accent-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430</p>
                <p className="text-xs text-text-muted">\u0410\u043d\u0430\u043b\u0456\u0442\u0438\u043a\u0430</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
