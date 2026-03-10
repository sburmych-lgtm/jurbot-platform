import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CaseCard } from '@/components/case/CaseCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string;
  client?: { user: { name: string } };
}

export function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        const res = await api.get<CaseItem[]>(`/v1/cases?${params.toString()}`);
        setCases(res.data ?? []);
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter]);

  const filtered = cases.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.caseNumber.includes(search),
  );

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">Справи</h1>
          <Button size="sm" onClick={() => {/* TODO: open create modal */}}>
            <Plus size={16} /> Нова
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук за назвою або номером..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-navy-100 bg-white text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-2 border-navy-100 bg-white text-sm focus:border-gold-400 focus:outline-none"
          >
            <option value="">Всі статуси</option>
            <option value="INTAKE">Прийом</option>
            <option value="ANALYSIS">Аналіз</option>
            <option value="PREPARATION">Підготовка</option>
            <option value="FILED">Подано</option>
            <option value="AWAITING">Очікування</option>
            <option value="COMPLETED">Завершено</option>
          </select>
        </div>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="Справ не знайдено" description="Створіть нову справу або змініть фільтри" />
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <CaseCard
                key={c.id}
                caseNumber={c.caseNumber}
                title={c.title}
                category={c.category}
                status={c.status}
                clientName={c.client?.user.name}
                updatedAt={c.updatedAt}
                onClick={() => navigate(`/lawyer/cases/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
