import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const typeColors: Record<string, 'blue' | 'green' | 'yellow' | 'orange' | 'gray'> = {
  CASE_UPDATE: 'blue',
  APPOINTMENT_REMINDER: 'yellow',
  DOCUMENT_READY: 'green',
  MESSAGE: 'orange',
  SYSTEM: 'gray',
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<NotificationItem[]>('/v1/notifications');
        setNotifications(res.data ?? []);
      } catch { setNotifications([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/v1/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/v1/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">Сповіщення</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check size={14} /> Прочитати всі
            </Button>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Сповіщень немає" description="Тут з'являтимуться оновлення по справах та записах" />
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <Card
                key={n.id}
                className={n.isRead ? 'opacity-70' : 'border-l-4 border-l-gold-400'}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-navy-800">{n.title}</p>
                      <Badge color={typeColors[n.type] ?? 'gray'}>{n.type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-navy-600">{n.body}</p>
                    <p className="text-xs text-navy-400 mt-1">
                      {new Date(n.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 bg-gold-500 rounded-full mt-2 shrink-0" />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
