import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface ClientItem {
  id: string;
  user: { name: string; email: string; phone?: string; city?: string };
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ClientItem[]>('/v1/users?role=CLIENT');
        setClients(res.data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = clients.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase()) ||
    c.user.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">\u041a\u043b\u0456\u0454\u043d\u0442\u0438</h1>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="\u041f\u043e\u0448\u0443\u043a..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border-default rounded-[14px] text-sm text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="\u041a\u043b\u0456\u0454\u043d\u0442\u0456\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e" />
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <Card key={c.id}>
                <p className="text-sm font-semibold text-text-primary">{c.user.name}</p>
                <p className="text-xs text-text-muted">{c.user.email}</p>
                {c.user.phone && <p className="text-xs text-text-muted">{c.user.phone}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
