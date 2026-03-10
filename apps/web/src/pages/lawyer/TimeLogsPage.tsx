import { useState, useEffect } from 'react';
import { Clock, Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface TimeLogItem {
  id: string;
  description: string;
  minutes: number;
  billable: boolean;
  date: string;
  case?: { caseNumber: string; title: string };
}

export function TimeLogsPage() {
  const [logs, setLogs] = useState<TimeLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<TimeLogItem[]>('/v1/timelogs');
        setLogs(res.data ?? []);
      } catch { setLogs([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalMinutes = logs.reduce((s, l) => s + l.minutes, 0);
  const billableMinutes = logs.filter(l => l.billable).reduce((s, l) => s + l.minutes, 0);

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">Облік часу</h1>
          <Button size="sm"><Plus size={16} /> Додати</Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-navy-400">Загальний час</p>
            <p className="text-xl font-bold text-navy-900">{Math.floor(totalMinutes / 60)}г {totalMinutes % 60}хв</p>
          </Card>
          <Card>
            <p className="text-xs text-navy-400">Оплачуваний</p>
            <p className="text-xl font-bold text-gold-600">{Math.floor(billableMinutes / 60)}г {billableMinutes % 60}хв</p>
          </Card>
        </div>

        {loading ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <EmptyState icon={Clock} title="Записів немає" description="Додайте запис про витрачений час" />
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <Card key={log.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{log.description}</p>
                    {log.case && (
                      <p className="text-xs text-navy-400 mt-0.5">{log.case.caseNumber} - {log.case.title}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy-900 text-sm">{log.minutes} хв</p>
                    <p className="text-xs text-navy-400">
                      {new Date(log.date).toLocaleDateString('uk-UA')}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
