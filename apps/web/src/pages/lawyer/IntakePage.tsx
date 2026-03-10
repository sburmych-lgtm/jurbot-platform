import { useState, useEffect } from 'react';
import { Inbox, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface IntakeItem {
  id: string;
  category: string;
  urgency: string;
  description: string;
  leadScore?: string;
  createdAt: string;
  client?: { user: { name: string; email: string; phone?: string } };
}

const categoryLabels: Record<string, string> = {
  FAMILY: 'Сімейне', CIVIL: 'Цивільне', COMMERCIAL: 'Господарське',
  CRIMINAL: 'Кримінальне', MIGRATION: 'Міграційне', REALESTATE: 'Нерухомість',
  LABOR: 'Трудове', OTHER: 'Інше',
};

const leadColors: Record<string, 'red' | 'orange' | 'blue'> = {
  HOT: 'red', WARM: 'orange', COLD: 'blue',
};

const leadLabels: Record<string, string> = {
  HOT: 'Гарячий', WARM: 'Теплий', COLD: 'Холодний',
};

export function IntakePage() {
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<IntakeItem[]>('/v1/intake');
        setItems(res.data ?? []);
      } catch { setItems([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleConvert = async (id: string) => {
    try {
      await api.post(`/v1/intake/${id}/convert`, {});
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { /* TODO: show toast */ }
  };

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Заявки</h1>

        {items.length === 0 ? (
          <EmptyState icon={Inbox} title="Нових заявок немає" description="Заявки з'являться тут після заповнення форми прийому" />
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Card key={item.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-navy-800 text-sm">{item.client?.user.name ?? 'Невідомий клієнт'}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{categoryLabels[item.category] ?? item.category}</p>
                  </div>
                  <div className="flex gap-1">
                    {item.leadScore && (
                      <Badge color={leadColors[item.leadScore] ?? 'gray'}>
                        {leadLabels[item.leadScore] ?? item.leadScore}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-navy-600 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-navy-400">
                    {new Date(item.createdAt).toLocaleDateString('uk-UA')}
                  </span>
                  <Button size="sm" onClick={() => handleConvert(item.id)}>
                    Створити справу <ArrowRight size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
