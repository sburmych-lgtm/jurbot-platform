import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface ClientItem {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  city?: string | null;
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ClientItem[]>('/v1/users?role=CLIENT');
        setClients(res.data ?? []);
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.name ?? '').toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term)
    );
  });

  if (loading) return <Spinner />;

  if (error) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-text-primary">Клієнти</h1>
          <EmptyState icon={Users} title="Не вдалося завантажити клієнтів" description="Спробуйте оновити сторінку" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Клієнти</h1>

        {clients.length > 0 && (
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук..."
              className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border-default rounded-[14px] text-sm text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none"
            />
          </div>
        )}

        {clients.length === 0 ? (
          <EmptyState icon={Users} title="Клієнтів поки немає" description="Надішліть посилання-запрошення клієнту через Telegram" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="Нікого не знайдено" description="Спробуйте інший пошуковий запит" />
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <Card key={c.id}>
                <p className="text-sm font-semibold text-text-primary">{c.name ?? '—'}</p>
                {c.email && <p className="text-xs text-text-muted">{c.email}</p>}
                {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
