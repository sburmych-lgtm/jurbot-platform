import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface TimeLog {
  id: string;
  description: string;
  duration: number;
  date: string;
  case?: { title: string; caseNumber: string };
}

export function TimeLogsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<TimeLog[]>('/v1/timelogs');
        setLogs(res.data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">\u0427\u0430\u0441</h1>
        {logs.length === 0 ? (
          <EmptyState icon={Clock} title="\u0417\u0430\u043f\u0438\u0441\u0456\u0432 \u043d\u0435\u043c\u0430\u0454" />
        ) : (
          <div className="space-y-3">
            {logs.map(l => (
              <Card key={l.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{l.description}</span>
                  <span className="text-sm font-bold text-accent-teal">{l.duration}\u0445\u0432</span>
                </div>
                {l.case && <p className="text-xs text-text-muted">{l.case.title} ({l.case.caseNumber})</p>}
                <p className="text-xs text-text-muted mt-1">{new Date(l.date).toLocaleDateString('uk-UA')}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
