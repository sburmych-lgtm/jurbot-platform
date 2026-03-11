import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<NotifItem[]>('/v1/notifications');
        setItems(res.data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/v1/notifications/${id}/read`, {});
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">\u0421\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f</h1>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="\u041d\u0435\u043c\u0430\u0454 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u044c" />
        ) : (
          <div className="space-y-3">
            {items.map(n => (
              <Card
                key={n.id}
                className={`cursor-pointer ${!n.isRead ? 'border-accent-teal/30' : ''}`}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-accent-teal mt-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{n.title}</p>
                    <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(n.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
