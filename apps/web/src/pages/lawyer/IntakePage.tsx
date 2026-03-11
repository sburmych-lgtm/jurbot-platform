import { useState, useEffect } from 'react';
import { Inbox, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface IntakeItem {
  id: string;
  category: string;
  urgency: string;
  description: string;
  leadScore: number;
  createdAt: string;
  client: { user: { name: string; email: string; phone?: string; city?: string } };
}

const leadColors: Record<string, 'green' | 'yellow' | 'red'> = {
  HOT: 'red', WARM: 'yellow', COLD: 'green',
};

export function IntakePage() {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: IntakeItem[] }>('/v1/intake');
        setItems(res.data?.items ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Заявки</h1>

        {items.length === 0 ? (
          <EmptyState icon={Inbox} title="Нових заявок немає" description="Заявки від клієнтів з'являться тут" />
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const lead = item.leadScore >= 7 ? 'HOT' : item.leadScore >= 4 ? 'WARM' : 'COLD';
              return (
                <Card key={item.id} className="active:scale-[0.98] transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary text-sm">{item.client.user.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{item.client.user.email}</p>
                    </div>
                    <Badge color={leadColors[lead]}>{lead}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <Badge color="blue">{item.category}</Badge>
                      <Badge color={item.urgency === 'HIGH' ? 'red' : item.urgency === 'MEDIUM' ? 'yellow' : 'gray'}>{item.urgency}</Badge>
                    </div>
                    <span className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleDateString('uk-UA')}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
