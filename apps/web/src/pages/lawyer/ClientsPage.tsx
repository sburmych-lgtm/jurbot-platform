import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface ClientItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  createdAt: string;
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ClientItem[]>('/v1/users?role=CLIENT');
        setClients(res.data ?? []);
      } catch { setClients([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.includes(search),
  );

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Клієнти</h1>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук за ім'ям або email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-navy-100 bg-white text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Клієнтів не знайдено" />
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <Card key={c.id}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center text-navy-600 font-bold text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-800">{c.name}</p>
                    <p className="text-xs text-navy-400 truncate">{c.email}</p>
                    {c.phone && <p className="text-xs text-navy-400">{c.phone}</p>}
                  </div>
                  {c.city && <span className="text-xs text-navy-300">{c.city}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
